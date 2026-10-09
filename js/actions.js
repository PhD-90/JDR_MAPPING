// Capacités et sorts des figurines (selon la classe et le niveau), actions standard, ciblage sur la carte.
//   type : 'self_heal' | 'self_buff' (sur soi) · 'heal' (un allié) · 'attack' (attaque spéciale) · 'missile' (touche toujours)
//          'area' (zone, jet de sauvegarde : moitié des dégâts si réussi) · 'buff' (alliés dans une zone)
//   cost : 'action' | 'bonus'      rest : 'long' | 'court' (repos) · 'tour' (1 fois par tour) · 'recharge' (5-6 sur 1d6)
//   uses(u) : utilisations maximum · minLvl : niveau requis · conc : concentration (dur en rounds)
// Les fiches de personnage gardent leurs utilisations restantes entre les combats (récupérées au repos) ;
// les figurines de base et les monstres les récupèrent à chaque combat.

const ACTIONS = {
  second_souffle: { name: 'Second souffle', icon: '💪', type: 'self_heal', cost: 'bonus', rest: 'court', uses: () => 1, sound: 'heal',
                    dice: u => `1d10+${u.lvl || 1}`, desc: 'Récupère 1d10 + niveau PV (action bonus, repos court).' },
  rage:           { name: 'Rage', icon: '😡', type: 'self_buff', cost: 'bonus', rest: 'long', uses: u => (u.lvl || 1) >= 3 ? 3 : 2, cond: 'rage', dur: 10, sound: 'crit',
                    desc: '+2 aux dégâts et résistance aux dégâts physiques pendant 10 rounds (action bonus).' },
  imposition:     { name: 'Imposition des mains', icon: '🙌', type: 'heal', cost: 'action', rest: 'long', uses: () => 1, range: 1, sound: 'heal',
                    dice: u => String(5 * (u.lvl || 1)), desc: 'Soigne 5 × niveau PV à un allié au contact.' },
  volee:          { name: 'Volée de flèches', icon: '🏹', type: 'area', cost: 'action', rest: 'court', uses: () => 1, minLvl: 2, range: 8, radius: 1, save: 'dex',
                    dice: u => `1d8+${u.mod ?? 3}`, dmgType: 'perforant', fx: 'arrows', color: '#ffe9a8', sound: 'arrows',
                    desc: 'Zone de 3×3 cases (sauvegarde de DEX pour moitié), repos court.' },
  sournoise:      { name: 'Attaque sournoise', icon: '🗡', type: 'attack', cost: 'action', rest: 'tour', uses: () => 1,
                    bonus: u => `${Math.ceil((u.lvl || 1) / 2)}d6`, desc: 'Attaque avec des d6 en plus, une fois par tour, si un allié est au contact de la cible ou avec avantage.' },
  projectile:     { name: 'Projectile magique', icon: '✨', type: 'missile', cost: 'action', rest: 'long', uses: u => 2 + Math.floor((u.lvl || 1) / 2), range: 8, darts: 3,
                    dice: () => '1d4+1', dmgType: 'force', sound: 'magic', desc: '3 traits qui touchent toujours (1d4+1 de force chacun).' },
  boule_feu:      { name: 'Boule de feu', icon: '🔥', type: 'area', cost: 'action', rest: 'long', uses: u => (u.lvl || 1) >= 5 ? 2 : 1, minLvl: 3, range: 8, radius: 2, save: 'dex',
                    dice: u => `${2 + Math.ceil((u.lvl || 1) / 2)}d6`, dmgType: 'feu', fx: 'blast', color: '#ff8a2a', sound: 'fire',
                    desc: 'Explosion de 2 cases de rayon (sauvegarde de DEX pour moitié). Attention aux alliés !' },
  soins:          { name: 'Soins', icon: '💚', type: 'heal', cost: 'action', rest: 'long', uses: u => 1 + Math.ceil((u.lvl || 1) / 2), range: 1, sound: 'heal',
                    dice: u => `1d8+${u.mod ?? 3}`, desc: 'Soigne 1d8 + mod. à un allié au contact.' },
  mot_guerison:   { name: 'Mot de guérison', icon: '🗣', type: 'heal', cost: 'bonus', rest: 'long', uses: u => 1 + Math.floor((u.lvl || 1) / 2), range: 6, sound: 'heal',
                    dice: u => `1d4+${u.mod ?? 3}`, desc: 'Soigne 1d4 + mod. à un allié à 6 cases (action bonus).' },
  benediction:    { name: 'Bénédiction', icon: '🌟', type: 'buff', cost: 'action', rest: 'long', uses: () => 1, range: 6, radius: 2, cond: 'beni', conc: true, dur: 10,
                    fx: 'holy', color: '#ffd84a', sound: 'bless', desc: '+1d4 aux attaques des alliés dans la zone (concentration, 10 rounds).' },
  souffle:        { name: 'Souffle de feu', icon: '🐉', type: 'area', cost: 'action', rest: 'recharge', uses: () => 1, range: 4, radius: 2, save: 'dex', dd: 14,
                    dice: () => '6d6', dmgType: 'feu', fx: 'blast', color: '#ff6a1f', sound: 'fire', desc: 'Flammes (DEX DD 14 pour moitié), se recharge sur 5-6.' },
};
const CLASS_ACTIONS = { guerrier: ['second_souffle'], barbare: ['rage'], paladin: ['imposition', 'benediction'], rodeur: ['volee'],
                        voleur: ['sournoise'], mage: ['projectile', 'boule_feu'], clerc: ['soins', 'mot_guerison', 'benediction'] };
const SPRITE_CLASS = { warrior: 'guerrier', mage: 'mage', ranger: 'rodeur', cleric: 'clerc' };
const SPRITE_ACTIONS = { dragon: ['souffle'] };

// Actions standard, ouvertes à tous
const STD_ACTIONS = {
  foncer:     { name: 'Foncer', icon: '🏃', cost: 'action', desc: 'Déplacement doublé pour ce tour.' },
  desengager: { name: 'Se désengager', icon: '🚪', cost: 'action', desc: 'Pas d\'attaque d\'opportunité ce tour.' },
  esquiver:   { name: 'Esquiver', icon: '🛡', cost: 'action', desc: 'Désavantage aux attaques contre soi jusqu\'à son prochain tour.' },
};

const allActions = u => [...(CLASS_ACTIONS[u.cls || SPRITE_CLASS[u.sprite]] || []), ...(SPRITE_ACTIONS[u.sprite] || [])];
const unitActions = u => allActions(u).filter(k => (ACTIONS[k].minLvl || 1) <= (u.lvl || 1));
const usesMax = (u, k) => ACTIONS[k].uses(u);
// Récupère les utilisations : 'all' (nouveau combat d'un monstre), 'long', 'court', 'tour'
function resetUses(u, rest = 'all') {
  u.uses ||= {};
  unitActions(u).forEach(k => {
    const r = ACTIONS[k].rest;
    if (rest === 'all' || rest === r || (rest === 'long' && r !== 'tour') || u.uses[k] === undefined) u.uses[k] = usesMax(u, k);
  });
}
const usesLeft = (u, k) => { if (!u.uses || u.uses[k] === undefined) resetUses(u, 'missing'); return u.uses[k]; };

let actionMode = null;   // capacité en attente d'une cible
const cellDist = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
const unitCenter = u => ({ x: u.x + (u.size - 1) / 2, y: u.y + (u.size - 1) / 2 });
const saveDC = (a, act) => act.dd ?? 8 + (a.spellToucher ?? a.toucher ?? 5);
// Figurines touchées par une zone centrée sur (cx, cy)
const inArea = (cx, cy, r) => map.units.filter(o => !isKO(o) && (() => {
  for (let y = o.y; y < o.y + o.size; y++) for (let x = o.x; x < o.x + o.size; x++) if (Math.hypot(x - cx, y - cy) <= r + 0.5) return true;
  return false;
})());
// Un allié (non KO) au contact de la cible
const allyNear = (u, t) => map.units.some(o => o !== u && unitKind(o) === unitKind(u) && !isKO(o) && footDist(o, o.x, o.y, t) <= 1);

// ---------- Actions standard ----------
function useStd(u, k) {
  const a = STD_ACTIONS[k];
  const cost = k === 'desengager' && (u.traits || []).includes('fuite_agile') ? 'bonus' : a.cost;
  if (isKO(u) || !spend(u, cost)) return false;
  pushUndo();
  if (k === 'foncer') u.act.dash = true;
  if (k === 'desengager') u.act.disengage = true;
  if (k === 'esquiver') addCond(u, 'esquive');
  addLog(`${a.icon} ${u.name} : ${a.name}${cost === 'bonus' ? ' (action bonus)' : ''}`, 'turn');
  popText(u, `${a.icon} ${a.name}`, '#cfe0ff', 14);
  changed(); syncPlayUI();
  return true;
}

// ---------- Lancer une capacité ----------
// scroll : objet (parchemin) utilisé à la place d'une utilisation
function useAction(u, k, scroll = null) {
  if(enforce()&&map.turn>0&&activeUnit()!==u){popText(u,'Attends ton tour.','#ff9a8a',13);return;}
  const act = ACTIONS[k]; if (!act || isKO(u) || (!scroll && usesLeft(u, k) <= 0)) return;
  if (act.type === 'self_heal' || act.type === 'self_buff') return resolveAction(u, k, { unit: u }, scroll);
  actionMode = { u, k, scroll }; attackMode = false;
  $('attackHint').textContent = `${act.icon} ${u.name} : ${act.name} — ` +
    (act.type === 'area' || act.type === 'buff' ? 'clique sur le centre de la zone' : act.type === 'heal' ? 'clique sur l\'allié à soigner' : 'clique sur la cible') + ' (Échap pour annuler)';
  $('attackHint').classList.remove('hidden');
  syncPlayUI(); redraw();
}
function cancelAction() { actionMode = null; $('attackHint').classList.add('hidden'); syncPlayUI(); redraw(); }

// Validité d'une cible ; renvoie { ok, reason, unit, cx, cy, targets }. p = case { cx, cy } et/ou figurine (p.unit)
function actionTarget(p, u = actionMode.u, k = actionMode.k) {
  const act = ACTIONS[k], c = unitCenter(u);
  if (act.type === 'area' || act.type === 'buff') {
    const d = cellDist(c.x, c.y, p.cx, p.cy);
    const los = d <= 1 || lineOfSight(Math.round(c.x), Math.round(c.y), p.cx, p.cy, terrainGrids().block);
    let targets = inArea(p.cx, p.cy, act.radius);
    if (act.type === 'buff') targets = targets.filter(o => unitKind(o) === unitKind(u));
    return { ok: inMap(p.cx, p.cy) && d <= act.range && los, reason: d > act.range ? 'hors de portée' : !los ? 'pas de ligne de vue' : '',
             cx: p.cx, cy: p.cy, targets };
  }
  const t = p.unit || hitUnit(p.wx, p.wy); if (!t) return { ok: false };
  const d = footDist(u, u.x, u.y, t);
  if (act.type === 'heal') {
    const ok = unitKind(t) === unitKind(u) && !t.dead && d <= act.range;
    return { ok, unit: t, reason: unitKind(t) !== unitKind(u) ? 'pas un allié' : t.dead ? 'mort' : d > act.range ? 'hors de portée' : '' };
  }
  if (t === u || unitKind(t) === unitKind(u) || isKO(t)) return { ok: false, unit: t, reason: 'cible invalide' };
  if (act.type === 'missile') return { ok: d <= act.range, unit: t, reason: d > act.range ? 'hors de portée' : '' };
  if (!canHitNow(u, t)) return { ok: false, unit: t, reason: 'hors de portée' };
  if (k === 'sournoise' && enforce() && !allyNear(u, t) && attackMods(u, t, (unitStats(u).attaque || 1) <= 1).adv <= 0)
    return { ok: false, unit: t, reason: 'il faut un allié au contact ou l\'avantage' };
  return { ok: true, unit: t };
}

function resolveAction(u, k, tg, scroll = null) {
  if(enforce()&&map.turn>0&&activeUnit()!==u)return false;
  const act = ACTIONS[k];
  if (scroll && !(scroll.startsWith('gear:') ? gearPowerAvailable(u,scroll) : itemCount(u,scroll)>0)) return false;
  if (act.type === 'attack' && gearAttackReady(u)) return false;
  if (!scroll && usesLeft(u, k) <= 0) return false;
  pushUndo();
  if (map.turn>0 && (act.type === 'attack' ? !(u.gearCombat?.off?spend(u,'bonus'):useAttack(u)) : !spend(u, act.cost))) return false;
  if (scroll) consumeActionResource(u,scroll); else u.uses[k]--;
  if (u.hidden) { u.hidden = false; addLog(`🙈 ${u.name} sort de sa cachette !`, 'cond'); }
  const tag = `${act.icon} ${u.name} : ${act.name}${scroll ? (scroll.startsWith('gear:')?' (objet magique)':' (parchemin)') : ''}`;
  if (act.sound) sfx(act.sound);
  if (act.type === 'self_heal') {
    const r = rollDice(act.dice(u)); addLog(`${tag} ${r.detail}`, 'heal'); areaFx(u, unitCenter(u), 0.6, 'heal', '#5be37a'); heal(u, r.total);
  } else if (act.type === 'self_buff') {
    addCond(u, act.cond, act.dur);
    addLog(`${tag} — ${act.desc}`, 'cond'); popText(u, `${act.icon} ${act.name} !`, '#ff9a6a', 16);
  } else if (act.type === 'heal') {
    const r = rollDice(act.dice(u)); addLog(`${tag} → ${tg.unit.name} ${r.detail}`, 'heal');
    areaFx(u, unitCenter(tg.unit), 0.6, 'heal', '#5be37a'); later(() => heal(tg.unit, r.total), 250);
  } else if (act.type === 'attack') {
    attack(u, tg.unit, { name: act.name, bonusDice: act.bonus(u), noUndo: true, free: true });
  } else if (act.type === 'missile') {
    addLog(`${tag} → ${tg.unit.name} (${act.darts} traits qui touchent toujours)`, 'hit');
    for (let i = 0; i < act.darts; i++) later(() => {
      if (!map.units.includes(tg.unit) || (isKO(tg.unit) && unitKind(tg.unit) !== 'hero')) return;
      const st = { ...attackOf(u), fx: 'orb', color: '#b9a4ff', name: act.name, dur: 800 };
      startAttack(u, tg.unit, { hit: true }, st); broadcast({ type: 'attack', a: u.id, t: tg.unit.id, res: { hit: true }, st });
      const r = rollDice(act.dice(u));
      later(() => applyDamage(tg.unit, r.total, u, false, act.dmgType), st.dur * 0.62);
    }, i * 260);
  } else if (act.type === 'area') {
    const dc = saveDC(u, act), r = rollDice(act.dice(u));
    addLog(`${tag} — ${r.total} dégâts ${dmgName(act.dmgType)} ${r.detail}, sauvegarde de ${AB_NAME[act.save]} DD ${dc} pour moitié`, 'crit');
    areaFx(u, { x: tg.cx, y: tg.cy }, act.radius, act.fx, act.color);
    tg.targets.forEach(o => {
      const s = rollSave(o, act.save, dc), dmg = s.ok ? Math.floor(r.total / 2) : r.total;
      addLog(`   ${o.name} : ${s.txt} → ${s.ok ? 'réussi, moitié' : 'raté'} : ${dmg} dégâts`, s.ok ? 'miss' : 'hit');
      later(() => applyDamage(o, dmg, u, false, act.dmgType), 700);
    });
    if (!tg.targets.length) addLog('   Personne dans la zone.', 'miss');
  } else if (act.type === 'buff') {
    areaFx(u, { x: tg.cx, y: tg.cy }, act.radius, act.fx, act.color);
    tg.targets.forEach(o => { addCond(o, act.cond, act.dur); later(() => popText(o, '🌟 Béni', '#ffd84a', 15), 500); });
    if (act.conc) startConcentration(u, k, tg.targets.map(o => o.id), act.cond);
    addLog(`${tag} → ${tg.targets.map(o => o.name).join(', ') || 'personne'} (+1d4 aux attaques${act.conc ? ', concentration' : ''})`, 'cond');
  }
  changed(); syncPlayUI();
  return true;
}
// Effet visuel de zone (aussi envoyé à l'écran des joueurs)
function areaFx(u, center, r, kind, color) {
  if (SIM) return;
  const from = unitBox(u), to = { x: (center.x + 0.5) * T, y: (center.y + 0.5) * T - levelAt(Math.round(center.x), Math.round(center.y)) * LH() };
  const fx = { from: { x: from.cx, y: from.fy - from.sw * 0.6 }, to, r: (r + 0.5) * T, kind, color };
  startAreaFx(fx); broadcast({ type: 'area', fx });
}

function actionClick(e, p) {
  if (e.button === 2) { cancelAction(); return; }
  const tg = actionTarget(p);
  if (!tg.ok) { if (tg.reason) popText(actionMode.u, tg.reason, '#ff9a8a', 13); return; }
  const { u, k, scroll } = actionMode; actionMode = null; $('attackHint').classList.add('hidden');
  resolveAction(u, k, tg, scroll);
}

// Gabarit de ciblage : portée, zone, figurines touchées
function drawActionTarget(c) {
  if (!actionMode || !hover) return;
  const { u, k } = actionMode, act = ACTIONS[k], tg = actionTarget(hover), uc = unitCenter(u);
  c.save();
  if (act.range) {
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
