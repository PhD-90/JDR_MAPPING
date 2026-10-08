// Capacités et sorts des figurines (selon la classe), ciblage sur la carte, et tour automatique des monstres.
//   type : 'self_heal' | 'self_buff' (sur soi) · 'heal' (un allié) · 'attack' (attaque spéciale) · 'missile' (touche toujours)
//          'area' (zone, jet de sauvegarde de DEX : moitié des dégâts si réussi) · 'buff' (alliés dans une zone)
//   uses : utilisations par combat

const ACTIONS = {
  second_souffle: { name: 'Second souffle', icon: '💪', type: 'self_heal', dice: u => `1d10+${u.lvl || 1}`, uses: 1, sound: 'heal',
                    desc: 'Récupère 1d10 + niveau PV.' },
  rage:           { name: 'Rage', icon: '😡', type: 'self_buff', cond: 'rage', uses: 2, sound: 'crit',
                    desc: '+2 aux dégâts jusqu\'à la fin du combat.' },
  imposition:     { name: 'Imposition des mains', icon: '🙌', type: 'heal', range: 1, dice: u => String(5 * (u.lvl || 1)), uses: 1, sound: 'heal',
                    desc: 'Soigne 5 × niveau PV à un allié au contact.' },
  volee:          { name: 'Volée de flèches', icon: '🏹', type: 'area', range: 8, radius: 1, dice: u => `1d8+${u.mod ?? 3}`, uses: 1,
                    fx: 'arrows', color: '#ffe9a8', sound: 'arrows', desc: 'Pluie de flèches sur une zone de 3×3 cases (sauvegarde de DEX pour moitié).' },
  sournoise:      { name: 'Attaque sournoise', icon: '🗡', type: 'attack', bonus: u => `${Math.ceil((u.lvl || 1) / 2)}d6`, uses: 1,
                    desc: 'Attaque avec des dés de dégâts en plus.' },
  projectile:     { name: 'Projectile magique', icon: '✨', type: 'missile', range: 8, darts: 3, dice: () => '1d4+1', uses: 3, sound: 'magic',
                    desc: '3 traits qui touchent toujours (1d4+1 chacun).' },
  boule_feu:      { name: 'Boule de feu', icon: '🔥', type: 'area', range: 8, radius: 2, dice: u => `${2 + Math.ceil((u.lvl || 1) / 2)}d6`, uses: 2,
                    fx: 'blast', color: '#ff8a2a', sound: 'fire', desc: 'Explosion de 2 cases de rayon (sauvegarde de DEX pour moitié). Attention aux alliés !' },
  soins:          { name: 'Soins', icon: '💚', type: 'heal', range: 1, dice: u => `1d8+${u.mod ?? 3}`, uses: 2, sound: 'heal',
                    desc: 'Soigne un allié au contact.' },
  mot_guerison:   { name: 'Mot de guérison', icon: '🗣', type: 'heal', range: 6, dice: u => `1d4+${u.mod ?? 3}`, uses: 2, sound: 'heal',
                    desc: 'Soigne un allié à distance (6 cases).' },
  benediction:    { name: 'Bénédiction', icon: '🌟', type: 'buff', range: 6, radius: 2, cond: 'beni', uses: 1, fx: 'holy', color: '#ffd84a', sound: 'bless',
                    desc: 'Les alliés dans la zone gagnent +1d4 aux jets d\'attaque.' },
  souffle:        { name: 'Souffle de feu', icon: '🐉', type: 'area', range: 4, radius: 2, dice: () => '6d6', dd: 14, uses: 1,
                    fx: 'blast', color: '#ff6a1f', sound: 'fire', desc: 'Cône de flammes (sauvegarde de DEX DD 14 pour moitié).' },
};
const CLASS_ACTIONS = { guerrier: ['second_souffle'], barbare: ['rage'], paladin: ['imposition', 'benediction'], rodeur: ['volee'],
                        voleur: ['sournoise'], mage: ['projectile', 'boule_feu'], clerc: ['soins', 'mot_guerison', 'benediction'] };
const SPRITE_CLASS = { warrior: 'guerrier', mage: 'mage', ranger: 'rodeur', cleric: 'clerc' };
const SPRITE_ACTIONS = { dragon: ['souffle'] };

function unitActions(u) {
  return [...(CLASS_ACTIONS[u.cls || SPRITE_CLASS[u.sprite]] || []), ...(SPRITE_ACTIONS[u.sprite] || [])];
}
function resetUses(u) { u.uses = Object.fromEntries(unitActions(u).map(k => [k, ACTIONS[k].uses])); }
const usesLeft = (u, k) => { if (!u.uses || u.uses[k] === undefined) resetUses(u); return u.uses[k]; };

let actionMode = null;   // capacité en attente d'une cible
const cellDist = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
const unitCenter = u => ({ x: u.x + (u.size - 1) / 2, y: u.y + (u.size - 1) / 2 });
const saveDC = (a, act) => act.dd ?? 8 + (a.toucher || 5);
// Figurines touchées par une zone centrée sur (cx, cy)
const inArea = (cx, cy, r) => map.units.filter(o => !isKO(o) && (() => {
  for (let y = o.y; y < o.y + o.size; y++) for (let x = o.x; x < o.x + o.size; x++) if (Math.hypot(x - cx, y - cy) <= r + 0.5) return true;
  return false;
})());

// ---------- Lancer une capacité ----------
function useAction(u, k) {
  const act = ACTIONS[k]; if (!act || isKO(u) || usesLeft(u, k) <= 0) return;
  if (act.type === 'self_heal' || act.type === 'self_buff') return resolveAction(u, k, { unit: u });
  actionMode = { u, k }; attackMode = false;
  $('attackHint').textContent = `${act.icon} ${u.name} : ${act.name} — ` +
    (act.type === 'area' || act.type === 'buff' ? 'clique sur le centre de la zone' : act.type === 'heal' ? 'clique sur l\'allié à soigner' : 'clique sur la cible') + ' (Échap pour annuler)';
  $('attackHint').classList.remove('hidden');
  syncPlayUI(); redraw();
}
function cancelAction() { actionMode = null; $('attackHint').classList.add('hidden'); syncPlayUI(); redraw(); }

// Validité de la cible survolée/cliquée ; renvoie { ok, reason, unit, cx, cy, targets }
function actionTarget(p) {
  const { u, k } = actionMode, act = ACTIONS[k], c = unitCenter(u);
  if (act.type === 'area' || act.type === 'buff') {
    const d = cellDist(c.x, c.y, p.cx, p.cy);
    const los = d <= 1 || lineOfSight(Math.round(c.x), Math.round(c.y), p.cx, p.cy, terrainGrids().block);
    let targets = inArea(p.cx, p.cy, act.radius);
    if (act.type === 'buff') targets = targets.filter(o => unitKind(o) === unitKind(u));
    return { ok: inMap(p.cx, p.cy) && d <= act.range && los, reason: d > act.range ? 'hors de portée' : !los ? 'pas de ligne de vue' : '',
             cx: p.cx, cy: p.cy, targets };
  }
  const t = hitUnit(p.wx, p.wy); if (!t) return { ok: false };
  const tc = unitCenter(t), d = Math.max(0, cellDist(c.x, c.y, tc.x, tc.y) - (t.size - 1) / 2 - (u.size - 1) / 2);
  if (act.type === 'heal') {
    const ok = unitKind(t) === unitKind(u) && !t.dead && d <= act.range;
    return { ok, unit: t, reason: unitKind(t) !== unitKind(u) ? 'pas un allié' : t.dead ? 'mort' : d > act.range ? 'hors de portée' : '' };
  }
  const range = act.type === 'missile' ? act.range : unitStats(u).attaque;
  const ok = t !== u && unitKind(t) !== unitKind(u) && !isKO(t) && (act.type === 'missile' ? d <= range : canHitNow(u, t));
  return { ok, unit: t, reason: ok ? '' : 'hors de portée' };
}

function resolveAction(u, k, tg) {
  const act = ACTIONS[k];
  if (usesLeft(u, k) <= 0) return;
  pushUndo();
  u.uses[k]--;
  if (u.hidden) { u.hidden = false; addLog(`🙈 ${u.name} sort de sa cachette !`, 'cond'); }
  const tag = `${act.icon} ${u.name} : ${act.name}`;
  if (act.sound) sfx(act.sound);
  if (act.type === 'self_heal') {
    const r = rollDice(act.dice(u)); addLog(`${tag} ${r.detail}`, 'heal'); areaFx(u, unitCenter(u), 0.6, 'heal', '#5be37a'); heal(u, r.total);
  } else if (act.type === 'self_buff') {
    if (!u.conds.includes(act.cond)) u.conds.push(act.cond);
    addLog(`${tag} — ${act.desc}`, 'cond'); popText(u, `${act.icon} ${act.name} !`, '#ff9a6a', 16);
  } else if (act.type === 'heal') {
    const r = rollDice(act.dice(u)); addLog(`${tag} → ${tg.unit.name} ${r.detail}`, 'heal');
    areaFx(u, unitCenter(tg.unit), 0.6, 'heal', '#5be37a'); setTimeout(() => heal(tg.unit, r.total), 250);
  } else if (act.type === 'attack') {
    attack(u, tg.unit, { name: act.name, bonusDice: act.bonus(u), noUndo: true });
  } else if (act.type === 'missile') {
    addLog(`${tag} → ${tg.unit.name} (${act.darts} traits qui touchent toujours)`, 'hit');
    for (let i = 0; i < act.darts; i++) setTimeout(() => {
      if (!map.units.includes(tg.unit) || isKO(tg.unit) && unitKind(tg.unit) !== 'hero') return;
      const st = { ...attackOf(u), fx: 'orb', color: '#b9a4ff', name: act.name, dur: 800 };
      startAttack(u, tg.unit, { hit: true }, st); broadcast({ type: 'attack', a: u.id, t: tg.unit.id, res: { hit: true }, st });
      const r = rollDice(act.dice(u));
      setTimeout(() => applyDamage(tg.unit, r.total, u), st.dur * 0.62);
    }, i * 260);
  } else if (act.type === 'area') {
    const dc = saveDC(u, act), dice = act.dice(u), r = rollDice(dice);
    addLog(`${tag} — ${r.total} dégâts ${r.detail}, sauvegarde de DEX DD ${dc} pour moitié`, 'crit');
    areaFx(u, { x: tg.cx, y: tg.cy }, act.radius, act.fx, act.color);
    tg.targets.forEach(o => {
      const d = rollDie(20), tot = d + (o.init || 0), ok = tot >= dc, dmg = ok ? Math.floor(r.total / 2) : r.total;
      addLog(`   ${o.name} : 🎲 ${d} ${fmtMod(o.init || 0)} = ${tot} → ${ok ? 'réussi, moitié' : 'raté'} : ${dmg} dégâts`, ok ? 'miss' : 'hit');
      setTimeout(() => applyDamage(o, dmg, u), 700);
    });
    if (!tg.targets.length) addLog('   Personne dans la zone.', 'miss');
  } else if (act.type === 'buff') {
    areaFx(u, { x: tg.cx, y: tg.cy }, act.radius, act.fx, act.color);
    tg.targets.forEach(o => { if (!o.conds.includes(act.cond)) o.conds.push(act.cond); setTimeout(() => popText(o, '🌟 Béni', '#ffd84a', 15), 500); });
    addLog(`${tag} → ${tg.targets.map(o => o.name).join(', ') || 'personne'} (+1d4 aux attaques)`, 'cond');
  }
  changed(); syncPlayUI();
}
// Effet visuel de zone (aussi envoyé à l'écran des joueurs)
function areaFx(u, center, r, kind, color) {
  const from = unitBox(u), to = { x: (center.x + 0.5) * T, y: (center.y + 0.5) * T - levelAt(Math.round(center.x), Math.round(center.y)) * LH() };
  const fx = { from: { x: from.cx, y: from.fy - from.sw * 0.6 }, to, r: (r + 0.5) * T, kind, color };
  startAreaFx(fx); broadcast({ type: 'area', fx });
}

function actionClick(e, p) {
  if (e.button === 2) { cancelAction(); return; }
  const tg = actionTarget(p);
  if (!tg.ok) { if (tg.reason) popText(actionMode.u, tg.reason, '#ff9a8a', 13); return; }
  const { u, k } = actionMode; actionMode = null; $('attackHint').classList.add('hidden');
  resolveAction(u, k, tg);
}

// Gabarit de ciblage : zone, portée, figurines touchées
function drawActionTarget(c) {
  if (!actionMode || !hover) return;
  const { u, k } = actionMode, act = ACTIONS[k], tg = actionTarget(hover), uc = unitCenter(u);
  c.save();
  if (act.range) {   // portée autour du lanceur
    c.strokeStyle = 'rgba(160,200,255,.5)'; c.setLineDash([6, 6]); c.lineWidth = 2;
    const R = (act.range + 0.5 + (u.size - 1) / 2) * T;
    c.strokeRect((uc.x + 0.5) * T - R, (uc.y + 0.5) * T - R - unitLevel(u) * LH(), R * 2, R * 2); c.setLineDash([]);
  }
  if (act.type === 'area' || act.type === 'buff') {
    const col = !tg.ok ? '255,120,120' : act.type === 'buff' ? '255,215,80' : '255,120,40';
    const cy = (hover.cy + 0.5) * T - levelAt(hover.cx, hover.cy) * LH();
    c.fillStyle = `rgba(${col},.22)`; c.strokeStyle = `rgba(${col},.95)`; c.lineWidth = 3;
    c.beginPath(); c.arc((hover.cx + 0.5) * T, cy, (act.radius + 0.5) * T, 0, Math.PI * 2); c.fill(); c.stroke();
    tg.targets.forEach(o => { const b = unitBox(o); c.strokeStyle = unitKind(o) === unitKind(u) ? '#ffd23a' : '#ff4a2a'; c.lineWidth = 3;
      c.beginPath(); c.ellipse(b.cx, b.fy, b.sw * 0.5, b.sw * 0.2, 0, 0, Math.PI * 2); c.stroke(); });
    const allies = tg.targets.filter(o => unitKind(o) === unitKind(u) && o !== u).length;
    tag(c, (hover.cx + 0.5) * T, cy - (act.radius + 0.5) * T - 4, tg.ok ? `${act.name} : ${tg.targets.length} cible(s)` +
        (act.type === 'area' && allies ? ` ⚠ ${allies} allié(s)` : '') : tg.reason, tg.ok ? '#5a3010' : '#8a2a2a');
  } else if (tg.unit) {
    const b = unitBox(tg.unit);
    c.strokeStyle = tg.ok ? (act.type === 'heal' ? '#5be37a' : '#ffd23a') : '#ff8a8a'; c.lineWidth = 3;
    c.beginPath(); c.arc(b.cx, b.fy - b.sw * 0.45, b.sw * 0.55, 0, Math.PI * 2); c.stroke();
    if (!tg.ok && tg.reason) tag(c, b.cx, b.fy + 18, tg.reason, '#8a2a2a');
  }
  c.restore();
}

// ---------- Tour automatique des monstres ----------
let autoMonsters = false;
try { autoMonsters = localStorage.getItem('jdr-automonsters') === '1'; } catch (e) {}

// Choisit où aller et qui attaquer : priorité aux cibles affaiblies, à distance on garde ses distances
function aiTurn(u) {
  if (!u || isKO(u) || map.turn <= 0) return;
  const foes = map.units.filter(o => unitKind(o) !== unitKind(u) && !isKO(o) && !o.hidden);
  if (!foes.length) { addLog(`🤖 ${u.name} n'a personne à attaquer.`, 'info'); return; }
  invalidateZones();
  // souffle / zone si au moins 2 ennemis touchés sans allié
  for (const k of unitActions(u).filter(k => ACTIONS[k].type === 'area' && usesLeft(u, k) > 0)) {
    const act = ACTIONS[k], c = unitCenter(u);
    let best = null;
    foes.forEach(f => {
      const fc = unitCenter(f), tx = Math.round(fc.x), ty = Math.round(fc.y);
      if (cellDist(c.x, c.y, tx, ty) > act.range) return;
      const hit = inArea(tx, ty, act.radius), n = hit.filter(o => unitKind(o) !== unitKind(u)).length;
      if (hit.some(o => unitKind(o) === unitKind(u)) || n < 2) return;
      if (!best || n > best.n) best = { n, cx: tx, cy: ty, targets: hit };
    });
    if (best) { addLog(`🤖 ${u.name} utilise ${act.name} !`, 'turn'); resolveAction(u, k, best); return; }
  }
  const z = computeZones(u), g = hitContext(u), st = unitStats(u);
  let best = null;
  for (const [x, y, L] of z.ends) {
    const d = z.dist[y * map.cols + x];
    for (const f of foes) {
      let ok = false;
      for (let fy = f.y; fy < f.y + f.size && !ok; fy++) for (let fx = f.x; fx < f.x + f.size && !ok; fx++) ok = canHitCell(g, x, y, L, fx, fy);
      if (!ok) continue;
      const keep = st.attaque > 1 ? cellDist(x, y, f.x, f.y) * 0.6 : 0;
      const score = 40 - f.hp + (f.hp / f.hpMax < 0.5 ? 8 : 0) - d * 0.4 + keep + (unitLevel(u) - (f ? unitLevel(f) : 0)) * 0.5;
      if (!best || score > best.score) best = { x, y, f, score };
    }
  }
  pushUndo();
  if (best) {
    if (best.x !== u.x || best.y !== u.y) { u.x = best.x; u.y = best.y; addLog(`🤖 ${u.name} se déplace pour attaquer ${best.f.name}`, 'turn'); }
    changed(); syncPlayUI();
    setTimeout(() => { if (map.units.includes(u) && !isKO(u)) attack(u, best.f, { noUndo: true }); }, 450);
    return;
  }
  // personne à portée : se rapprocher de l'ennemi le plus proche
  const near = foes.reduce((a, b) => Math.hypot(b.x - u.x, b.y - u.y) < Math.hypot(a.x - u.x, a.y - u.y) ? b : a);
  const end = z.ends.reduce((a, b) => Math.hypot(b[0] - near.x, b[1] - near.y) < Math.hypot(a[0] - near.x, a[1] - near.y) ? b : a, [u.x, u.y]);
  u.x = end[0]; u.y = end[1];
  addLog(`🤖 ${u.name} avance vers ${near.name}`, 'turn');
  changed(); syncPlayUI();
}
// Joue le tour du monstre actif puis passe au suivant
let aiTimer = 0;
function runAiTurn(thenEnd) {
  const u = activeUnit(); if (!u) return;
  aiTurn(u);
  if (thenEnd) { clearTimeout(aiTimer); aiTimer = setTimeout(() => { if (activeUnit() === u) endTurn(); }, 2100); }
}
function maybeAutoMonster() {
  const u = activeUnit();
  if (!autoMonsters || !u || unitKind(u) !== 'monster' || isKO(u) || PLAYER_VIEW) return;
  clearTimeout(aiTimer);
  aiTimer = setTimeout(() => { if (activeUnit() === u && map.turn > 0) runAiTurn(true); }, 700);
}
