// IA des figurines (héros et monstres), utilisée en jeu (bouton, options) et par le simulateur.
// Chaque figurine est contrôlée par le MJ (par défaut) ou par l'IA : option globale par camp, ou réglage par figurine.
// Rôles : tank (protège, va au contact), soin (soigne puis attaque), lanceur (sorts de zone, projectiles),
//         tireur (garde ses distances, cherche la hauteur), escarmoucheur (attaque sournoise), brute (cible la plus faible).

let autoMonsters = false, autoHeroes = false, aiPaused = false, aiSpeed = 1;
try {
  autoMonsters = localStorage.getItem('jdr-automonsters') === '1';
  autoHeroes = localStorage.getItem('jdr-autoheroes') === '1';
  aiSpeed = +localStorage.getItem('jdr-aispeed') || 1;
} catch (e) {}

// u.ctrl : 'mj' (toujours le MJ), 'ia' (toujours l'IA), sinon l'option du camp
const isAI = u => u.ctrl === 'ia' || (u.ctrl !== 'mj' && (unitKind(u) === 'monster' ? autoMonsters : autoHeroes));
const ROLES = { guerrier: 'tank', barbare: 'tank', paladin: 'tank', clerc: 'soin', mage: 'lanceur', rodeur: 'tireur', voleur: 'escarmoucheur' };
const ROLE_NAME = { tank: 'Tank', soin: 'Soigneur', lanceur: 'Lanceur de sorts', tireur: 'Tireur', escarmoucheur: 'Escarmoucheur', brute: 'Brute' };
function roleOf(u) {
  if (u.role) return u.role;
  const c = u.cls || SPRITE_CLASS[u.sprite];
  if (ROLES[c]) return ROLES[c];
  return (unitStats(u).attaque || 1) > 1 ? 'tireur' : 'brute';
}

// Délai entre deux gestes de l'IA (0 en simulation)
const aiDelay = ms => SIM ? 0 : ms / aiSpeed;

// Joue le tour d'une figurine ; renvoie la durée (ms) des animations lancées
function aiTurn(u) {
  if (!u || isKO(u) || map.turn <= 0) return 0;
  if (!u.act) newBudget(u);
  const foes = () => map.units.filter(o => unitKind(o) !== unitKind(u) && !isKO(o) && !o.hidden);
  const friends = () => map.units.filter(o => unitKind(o) === unitKind(u));
  if (!foes().length) { addLog(`🤖 ${u.name} n'a personne à affronter.`, 'info'); return 0; }
  pushUndo();
  invalidateZones();
  const role = roleOf(u), acts = unitActions(u).filter(k => usesLeft(u, k) > 0);
  let t = 0;   // horloge des gestes (ms)
  const step = (fn, ms = 650) => { const at = t; later(fn, aiDelay(at)); t += ms; };

  // 1. Potion si gravement blessé
  if (u.hp / u.hpMax < 0.35 && u.act.bonus > 0) {
    const p = ['potion_sup', 'potion'].find(k => itemCount(u, k) > 0);
    if (p) useItem(u, p);
  }
  // 2. Moral : un monstre très blessé dont le camp est en déroute s'enfuit
  if (unitKind(u) === 'monster' && u.hp / u.hpMax < 0.25 && !(u.traits || []).includes('sans_peur')) {
    const mine = friends().filter(o => !isKO(o)).length, theirs = foes().length;
    if (mine < theirs) {
      useStd(u, 'desengager');
      moveTo(u, farthestEnd(u, foes()));
      addLog(`🏳 ${u.name} prend la fuite !`, 'turn');
      return 0;
    }
  }
  // 3. Soigner un allié inconscient ou très blessé (soin à distance en action bonus, ou au contact)
  const hurt = friends().filter(o => !o.dead && (isKO(o) || o.hp / o.hpMax < 0.5)).sort((a, b) => (isKO(b) - isKO(a)) || a.hp / a.hpMax - b.hp / b.hpMax);
  for (const k of acts.filter(k => ACTIONS[k].type === 'heal')) {
    const target = hurt.find(o => actionTarget({ unit: o }, u, k).ok);
    if (target && (u.act[ACTIONS[k].cost] > 0)) { resolveAction(u, k, { unit: target }); break; }
  }
  // 4. Soutien : bénédiction / rage au début du combat
  for (const k of acts.filter(k => ACTIONS[k].type === 'self_buff')) if (!u.conds.includes(ACTIONS[k].cond) && u.act[ACTIONS[k].cost] > 0) resolveAction(u, k, { unit: u });
  if (u.act.action > 0 && !u.conc) {
    for (const k of acts.filter(k => ACTIONS[k].type === 'buff')) {
      const c = unitCenter(u), tg = actionTarget({ cx: Math.round(c.x), cy: Math.round(c.y) }, u, k);
      if (tg.ok && tg.targets.length >= 3) { resolveAction(u, k, tg); break; }
    }
  }
  // 5. Sort de zone si au moins 2 ennemis touchés et aucun allié
  if (u.act.action > 0) {
    for (const k of acts.filter(k => ACTIONS[k].type === 'area')) {
      let best = null;
      foes().forEach(f => {
        const fc = unitCenter(f), tg = actionTarget({ cx: Math.round(fc.x), cy: Math.round(fc.y) }, u, k);
        const n = tg.targets.filter(o => unitKind(o) !== unitKind(u)).length;
        if (!tg.ok || n < 2 || tg.targets.some(o => unitKind(o) === unitKind(u))) return;
        if (!best || n > best.n) best = { n, tg };
      });
      if (best) { addLog(`🤖 ${u.name} utilise ${ACTIONS[k].name} !`, 'turn'); resolveAction(u, k, best.tg); break; }
    }
  }
  // 6. Projectile magique sur l'ennemi le plus faible à portée
  if (u.act.action > 0 && acts.includes('projectile')) {
    const target = foes().filter(o => actionTarget({ unit: o }, u, 'projectile').ok).sort((a, b) => a.hp - b.hp)[0];
    if (target && (role === 'lanceur' || target.hp <= 9)) { resolveAction(u, 'projectile', { unit: target }); return t + aiDelay(2000); }
  }
  // 7. Se placer et attaquer
  if (u.act.action > 0 || u.act.attacks > 0) {
    if ((u.traits || []).includes('agressif') && u.act.bonus > 0 && !foes().some(f => canHitNow(u, f))) { u.act.bonus--; u.act.dash = true; invalidateZones(); }
    let plan = bestAttackSpot(u, foes(), role);
    if (!plan && u.act.action > 0) {   // personne à portée : foncer vers l'ennemi le plus proche
      useStd(u, 'foncer');
      const near = nearest(u, foes());
      moveTo(u, closestEnd(u, near));
      addLog(`🤖 ${u.name} fonce vers ${near.name}`, 'turn');
      return t;
    }
    if (plan) {
      if (plan.x !== u.x || plan.y !== u.y) { moveTo(u, plan); addLog(`🤖 ${u.name} se place pour attaquer ${plan.f.name}`, 'turn'); }
      const target = plan.f;
      // attaques (attaque supplémentaire, multiattaque) ; attaque sournoise si possible
      const n = u.act.attacks > 0 ? u.act.attacks : attacksPerAction(u);
      for (let i = 0; i < n; i++) step(() => {
        if (isKO(u) || map.turn <= 0) return;
        let f = !isKO(target) ? target : foes().find(o => canHitNow(u, o));
        if (!f || !canHitNow(u, f)) return;
        if (acts.includes('sournoise') && usesLeft(u, 'sournoise') > 0 && actionTarget({ unit: f }, u, 'sournoise').ok) {
          resolveAction(u, 'sournoise', { unit: f });
        } else attack(u, f, { noUndo: true });
      }, 900);
      // un gobelin qui a frappé recule (fuite agile)
      if ((u.traits || []).includes('fuite_agile') && u.act.bonus > 0) step(() => {
        if (isKO(u) || !foes().some(f => footDist(u, u.x, u.y, f) <= 1)) return;
        useStd(u, 'desengager');
      }, 300);
      return t;
    }
  }
  // 8. Rien à faire : se rapprocher
  const near = nearest(u, foes());
  if (near) { moveTo(u, closestEnd(u, near)); addLog(`🤖 ${u.name} avance vers ${near.name}`, 'turn'); }
  return t;
}

// ---------- Déplacements ----------
function moveTo(u, end) {
  if (!end) return;
  const from = { x: u.x, y: u.y };
  u.x = end[0] ?? end.x; u.y = end[1] ?? end.y;
  invalidateZones();
  afterMove(u, from);
  changed(); syncPlayUI();
}
const nearest = (u, list) => list.reduce((a, b) => !a || footDist(u, u.x, u.y, b) < footDist(u, u.x, u.y, a) ? b : a, null);
function closestEnd(u, f) {
  const z = computeMove(u);
  return z.ends.reduce((a, b) => Math.hypot(b[0] - f.x, b[1] - f.y) < Math.hypot(a[0] - f.x, a[1] - f.y) ? b : a, [u.x, u.y]);
}
function farthestEnd(u, foes) {
  const z = computeMove(u), score = e => Math.min(...foes.map(f => Math.hypot(e[0] - f.x, e[1] - f.y)));
  return z.ends.reduce((a, b) => score(b) > score(a) ? b : a, [u.x, u.y]);
}
// Meilleure case d'où attaquer, selon le rôle
function bestAttackSpot(u, foes, role) {
  const z = computeMove(u), g = hitContext(u), ranged = (unitStats(u).attaque || 1) > 1;
  let best = null;
  for (const [x, y, L] of z.ends) {
    const d = z.dist[y * map.cols + x];
    const minFoe = Math.min(...foes.map(f => Math.max(0, footDist(u, x, y, f))));
    for (const f of foes) {
      let ok = false;
      for (let fy = f.y; fy < f.y + f.size && !ok; fy++) for (let fx = f.x; fx < f.x + f.size && !ok; fx++) ok = canHitCell(g, x, y, L, fx, fy);
      if (!ok) continue;
      let s = 30 - d * 0.3 - f.hp * 0.4 + (f.hp / f.hpMax < 0.5 ? 6 : 0);
      if (ranged) s += Math.min(minFoe, 5) * 1.5 + L * 1.2 - (minFoe <= 1 ? 8 : 0);   // tireur : distance et hauteur
      if (role === 'tank') s += (friendsOf(u).some(a => footDist(a, a.x, a.y, f) <= 2) ? 6 : 0) - f.hp * 0.2;   // protège ses alliés
      if (role === 'escarmoucheur' || (u.traits || []).includes('meute')) s += allyNearCell(u, f) ? 8 : 0;      // attaque à plusieurs
      if (roleOf(f) === 'soin' || roleOf(f) === 'lanceur') s += 4;                                               // cibles fragiles et dangereuses
      if (!best || s > best.s) best = { x, y, f, s };
    }
  }
  return best;
}
const friendsOf = u => map.units.filter(o => o !== u && unitKind(o) === unitKind(u) && !isKO(o));
const allyNearCell = (u, f) => friendsOf(u).some(o => footDist(o, o.x, o.y, f) <= 1);

// ---------- En jeu : tours automatiques, mode spectateur ----------
let aiTimer = 0;
function runAiTurn(thenEnd) {
  const u = activeUnit(); if (!u) return;
  const ms = aiTurn(u);
  if (thenEnd) { clearTimeout(aiTimer); aiTimer = setTimeout(() => { if (activeUnit() === u && map.turn > 0 && !aiPaused) endTurn(); }, ms + aiDelay(1000)); }
}
// Début d'un tour : si la figurine est contrôlée par l'IA, elle joue seule
function maybeAuto() {
  const u = activeUnit();
  if (SIM || PLAYER_VIEW || aiPaused || !u || isKO(u) || !isAI(u) || combatOver()) return;
  clearTimeout(aiTimer);
  aiTimer = setTimeout(() => { if (activeUnit() === u && map.turn > 0 && !aiPaused) runAiTurn(true); }, aiDelay(700));
}
const maybeAutoMonster = maybeAuto;   // ancien nom
// Combat terminé : un camp n'a plus personne debout
function combatOver() {
  const up = k => map.units.some(u => unitKind(u) === k && !isKO(u));
  return map.units.length > 0 && (!up('hero') || !up('monster'));
}
