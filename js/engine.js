// Moteur de règles, partagé par le jeu et le simulateur.
// - Deux façons de jouer : mode MJ (par défaut : le MJ contrôle tout, les règles sont comptées mais jamais bloquantes)
//   et règles strictes (économie d'actions, déplacement limité au tour de la figurine, attaques d'opportunité automatiques).
// - SIM : mode sans affichage du simulateur (pas d'animation, de son ni de sauvegarde ; effets appliqués immédiatement).
// - Hasard à graine (combats reproductibles), caractéristiques et sauvegardes, types de dégâts, abri,
//   durée des états, concentration, attaques d'opportunité.

let SIM = false;
let rulesMode = false;
try { rulesMode = localStorage.getItem('jdr-rules') === '1'; } catch (e) {}
const enforce = () => rulesMode || SIM;

// ---------- Hasard ----------
let rngNext = Math.random;
function seedRng(seed) { rngNext = seed === null || seed === undefined ? Math.random : mulberry32(seed >>> 0); }
// Effet différé (calé sur une animation) ; immédiat en simulation
function later(fn, ms) { if (SIM) fn(); else setTimeout(fn, ms); }

// ---------- Caractéristiques et sauvegardes ----------
const AB_KEYS = ['for', 'dex', 'con', 'int', 'sag', 'cha'];
const AB_NAME = { for: 'FOR', dex: 'DEX', con: 'CON', int: 'INT', sag: 'SAG', cha: 'CHA' };
const SAVE_PROF = { guerrier: ['for', 'con'], barbare: ['for', 'con'], paladin: ['sag', 'cha'], rodeur: ['for', 'dex'],
                    voleur: ['dex', 'int'], mage: ['int', 'sag'], clerc: ['sag', 'cha'] };
const abMod = (u, k) => abilityMod((u.ab || {})[k] ?? 10);
const saveBonus = (u, k) => abMod(u, k) + ((u.saveProf || []).includes(k) ? (u.prof || 2) : 0);
// Jet de sauvegarde ; étourdi ou inconscient : échec automatique en FOR et DEX
function rollSave(u, k, dd, adv = 0) {
  const a = rollDie(20), b = rollDie(20), d = adv > 0 ? Math.max(a, b) : adv < 0 ? Math.min(a, b) : a;
  const auto = (k === 'for' || k === 'dex') && ((u.conds || []).includes('etourdi') || isKO(u));
  const tot = d + saveBonus(u, k);
  return { d, tot, ok: !auto && tot >= dd, auto, txt: `${AB_NAME[k]} ${d} ${fmtMod(saveBonus(u, k))} = ${tot}${auto ? ' (échec automatique)' : ''}` };
}

// ---------- Types de dégâts ----------
const DMG_TYPES = ['tranchant', 'perforant', 'contondant', 'feu', 'froid', 'acide', 'poison', 'foudre', 'force', 'necrotique', 'radiant'];
const DMG_NAME = { necrotique: 'nécrotique' };
const dmgName = t => DMG_NAME[t] || t;
function dmgFactor(t, type) {
  if (!type) return 1;
  if ((t.immun || []).includes(type)) return 0;
  return ((t.resist || []).includes(type) ? 0.5 : 1) * ((t.vuln || []).includes(type) ? 2 : 1);
}

// ---------- Économie d'actions ----------
const MARTIAL = ['guerrier', 'paladin', 'rodeur', 'barbare'];
const attacksPerAction = u => Math.max(u.multi || 1, MARTIAL.includes(u.cls) && (u.lvl || 1) >= 5 ? 2 : 1);
function newBudget(u) { u.act = { action: 1, bonus: 1, reaction: 1, attacks: 0, dash: false, disengage: false, standUp: false, over: false }; }
// Dépense une action, une action bonus ou une réaction.
// Règles strictes / simulation : refusée s'il n'en reste plus. Mode MJ : toujours permise, seulement comptée.
function spend(u, kind) {
  if (!u.act) newBudget(u);
  if (u.act[kind] > 0) { u.act[kind]--; return true; }
  if (!enforce()) { u.act.over = true; return true; }
  popText(u, kind === 'bonus' ? 'plus d\'action bonus' : kind === 'reaction' ? 'plus de réaction' : 'plus d\'action', '#ff9a8a', 13);
  return false;
}
// Attaque d'arme : la première utilise l'action, les suivantes viennent de l'attaque supplémentaire / multiattaque
function useAttack(u) {
  if (!u.act) newBudget(u);
  if (u.act.attacks > 0) { u.act.attacks--; return true; }
  if (!spend(u, 'action')) return false;
  u.act.attacks = attacksPerAction(u) - 1;
  return true;
}

// ---------- États avec durée ----------
function addCond(u, k, dur = null) {
  if (!u.conds.includes(k)) u.conds.push(k);
  u.condDur ||= {};
  if (dur) u.condDur[k] = dur; else delete u.condDur[k];
}
function removeCond(u, k) { u.conds = u.conds.filter(x => x !== k); if (u.condDur) delete u.condDur[k]; }
// Début du tour : l'esquive s'arrête, les durées diminuent
function tickConds(u) {
  removeCond(u, 'esquive');
  for (const k of Object.keys(u.condDur || {})) {
    if (--u.condDur[k] <= 0) { removeCond(u, k); addLog(`⌛ ${u.name} : ${condOf(k)?.name || k} prend fin`, 'cond'); }
  }
}

// ---------- Concentration ----------
function startConcentration(u, k, targetIds, cond) {
  if (u.conc) endConcentration(u, 'nouveau sort');
  u.conc = { k, targets: targetIds, cond };
  addCond(u, 'concentre');
}
function endConcentration(u, why) {
  if (!u.conc) return;
  const { targets, cond } = u.conc; u.conc = null; removeCond(u, 'concentre');
  targets.forEach(id => { const t = unitById(id); if (t) removeCond(t, cond); });
  addLog(`🧠 ${u.name} perd sa concentration (${why})`, 'cond');
}
// Blessé en se concentrant : sauvegarde de CON contre DD max(10, moitié des dégâts)
function concentrationCheck(u, dmg) {
  if (!u.conc) return;
  if (isKO(u)) { endConcentration(u, 'inconscient'); return; }
  const dd = Math.max(10, Math.floor(dmg / 2)), r = rollSave(u, 'con', dd);
  addLog(`🧠 ${u.name} : concentration, ${r.txt} contre DD ${dd} → ${r.ok ? 'maintenue' : 'perdue'}`, r.ok ? 'roll' : 'cond');
  if (!r.ok) endConcentration(u, 'blessé');
}

// ---------- Abri ----------
// Attaque à distance : un obstacle ou une autre créature juste devant la cible lui donne un demi-abri (+2 CA)
function coverBonus(a, t) {
  const { block } = terrainGrids(), ac = unitCenter(a), tc = unitCenter(t);
  let x = Math.round(ac.x), y = Math.round(ac.y); const x1 = Math.round(tc.x), y1 = Math.round(tc.y);
  const dx = Math.abs(x1 - x), dy = -Math.abs(y1 - y), sx = x < x1 ? 1 : -1, sy = y < y1 ? 1 : -1, cells = [];
  let err = dx + dy;
  while (!(x === x1 && y === y1)) { const e2 = 2 * err; if (e2 >= dy) { err += dy; x += sx; } if (e2 <= dx) { err += dx; y += sy; } cells.push([x, y]); }
  const before = cells.slice(-3, -1).filter(([cx, cy]) => !(cx >= t.x && cx < t.x + t.size && cy >= t.y && cy < t.y + t.size));
  for (const [cx, cy] of before) {
    if (!inMap(cx, cy)) continue;
    if (block[cy * map.cols + cx]) return { bonus: 2, why: 'obstacle' };
    const o = map.units.find(o => o !== a && o !== t && !isKO(o) && cx >= o.x && cx < o.x + o.size && cy >= o.y && cy < o.y + o.size);
    if (o) return { bonus: 2, why: o.name };
  }
  return { bonus: 0 };
}

// ---------- Attaques d'opportunité ----------
const footDist = (a, ax, ay, b) => Math.max(0, Math.max(ax - (b.x + b.size - 1), b.x - (ax + a.size - 1)), Math.max(ay - (b.y + b.size - 1), b.y - (ay + a.size - 1)));
// Quitter le contact d'un ennemi provoque son attaque d'opportunité (sauf après « se désengager »).
// Règles strictes / IA / simulation : résolue automatiquement ; mode MJ : signalée dans le journal.
function opportunityAttacks(u, from) {
  if (map.turn <= 0 || isKO(u) || (u.act && u.act.disengage) || (from.x === u.x && from.y === u.y)) return;
  map.units.filter(o => unitKind(o) !== unitKind(u) && !isKO(o) && !o.hidden && !(o.conds || []).includes('etourdi'))
    .forEach(o => {
      if (footDist(u, from.x, from.y, o) > 1 || footDist(u, u.x, u.y, o) <= 1) return;
      if (enforce() || isAI(o)) {
        if (!o.act) newBudget(o);
        if (o.act.reaction <= 0) return;
        o.act.reaction--;
        addLog(`⚡ ${u.name} quitte le contact de ${o.name} : attaque d'opportunité !`, 'turn');
        attack(o, u, { noUndo: true, reaction: true, name: 'Attaque d\'opportunité', force: true });
      } else addLog(`⚡ ${o.name} peut faire une attaque d'opportunité sur ${u.name} (mode MJ : à toi de décider)`, 'info');
    });
}
// Après un déplacement (souris, flèches, IA) : attaques d'opportunité, pièges et secrets
function afterMove(u, from) {
  if (!from || (from.x === u.x && from.y === u.y)) return;
  opportunityAttacks(u, from);
  if (typeof checkTraps === 'function') checkTraps(u);
}

// ---------- Règles strictes : déplacement ----------
// Renvoie une raison de refus, ou '' si le déplacement est permis
function moveRefusal(u) {
  if (!rulesMode || map.turn <= 0) return '';
  if (u !== activeUnit()) return 'ce n\'est pas son tour';
  if (!isFinite(movementUsed(u))) return 'trop loin pour ce tour';
  return '';
}
