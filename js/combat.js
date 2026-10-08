// Suivi du combat : initiative, tour actif, points de vie, états, jets d'attaque automatiques,
// statistiques par figurine, journal et lanceur de dés.

let autoRoll = true;   // jets d'attaque et de dégâts automatiques
try { autoRoll = localStorage.getItem('jdr-autoroll') !== '0'; } catch (e) {}

const NEW_TRACK = () => ({ dealt: 0, taken: 0, healed: 0, hits: 0, misses: 0, kos: 0 });

// Complète une figurine avec ses statistiques de combat (fichier de caractéristiques par défaut)
function ensureCombat(u) {
  if (u.hpMax === undefined) Object.assign(u, spriteCombat(u.sprite));
  if (u.hp === undefined) u.hp = u.hpMax;
  if (u.xp === undefined) u.xp = unitKind(u) === 'monster' ? spriteCombat(u.sprite).xp : 0;
  if (!u.conds) u.conds = [];
  if (!u.track) u.track = NEW_TRACK();
  return u;
}

const unitById = id => map.units.find(u => u.id === id);
const activeUnit = () => map.turn > 0 ? unitById(map.order[map.active]) || null : null;

function addLog(text, type = '') {
  map.log.unshift({ text, type, round: map.turn });
  if (map.log.length > 400) map.log.length = 400;
}

// ---------- Initiative et tours ----------
function rollInitiative(u) {
  const d = rollDie(20);
  u.initRoll = d + (u.init || 0);
  addLog(`🎲 ${u.name} : initiative ${d} ${fmtMod(u.init || 0)} = ${u.initRoll}`, 'roll');
}
function sortOrder() {
  const activeId = map.order[map.active];
  map.order = map.units.filter(u => u.initRoll !== undefined)
    .sort((a, b) => b.initRoll - a.initRoll || (b.init || 0) - (a.init || 0)).map(u => u.id);
  if (activeId !== undefined && map.order.includes(activeId)) map.active = map.order.indexOf(activeId);
}

// Début du combat : positions de départ mémorisées, jets d'initiative, premier tour
function startCombat(noUndo = false) {
  if (!map.units.length) { alert('Place des figurines sur la carte avant de commencer le combat.'); return; }
  if (!noUndo) pushUndo();
  anims = []; map.log = []; map.order = []; map.active = 0; map.turn = 1;
  addLog('⚔ Début du combat : jets d\'initiative', 'round');
  map.units.forEach(u => { u.ox = u.sx = u.x; u.oy = u.sy = u.y; resetUses(u); rollInitiative(u); });
  sortOrder(); map.active = 0;
  addLog('— Round 1 —', 'round');
  beginTurn();
}
// Passe à la figurine suivante (nouveau round après la dernière)
function advance() {
  map.active++;
  if (map.active >= map.order.length) { map.active = 0; map.turn++; addLog(`— Round ${map.turn} —`, 'round'); }
}
// Début du tour de la figurine active : on saute les figurines hors de combat
// (personnage inconscient : jet contre la mort automatique ; étourdi : passe son tour)
function beginTurn() {
  for (let guard = map.order.length * 2 + 2; guard > 0; guard--) {
    const u = activeUnit();
    if (!u) { advance(); continue; }
    if (isKO(u)) {
      if (unitKind(u) === 'hero' && !u.dead && !u.stable && autoRoll) { deathSave(u); if (u.hp > 0) break; }
      advance(); continue;
    }
    if ((u.conds || []).includes('etourdi')) {
      u.conds = u.conds.filter(k => k !== 'etourdi');
      addLog(`💫 ${u.name} est étourdi et passe son tour (l'état disparaît).`, 'cond'); popText(u, '💫 passe son tour', '#e6d8ff', 14);
      advance(); continue;
    }
    break;
  }
  const u = activeUnit();
  if (u && !isKO(u)) {
    u.sx = u.x; u.sy = u.y;   // déplacement complet pour ce tour
    addLog(`▶ Tour de ${u.name}`, 'turn');
    playSel = u; sfx('turn');
    if ((u.conds || []).includes('feu')) {   // en feu : 1d6 dégâts au début du tour
      const r = rollDice('1d6'); addLog(`🔥 ${u.name} brûle : ${r.total} dégâts`, 'hit'); applyDamage(u, r.total);
    }
  }
  changed(); syncPlayUI();
  maybeAutoMonster();
}
function endTurn() {
  if (map.turn <= 0) return;
  pushUndo(); advance(); beginTurn();
}
// Remet tout à zéro : positions de départ, PV pleins, états et statistiques effacés
function resetCombat(restart) {
  pushUndo();
  anims = []; pops = [];
  map.units.forEach(u => {
    u.x = u.sx = u.ox ?? u.x; u.y = u.sy = u.oy ?? u.y;
    u.hp = u.hpMax; u.conds = []; u.track = NEW_TRACK(); delete u.initRoll;
    u.ds = null; u.dead = false; u.stable = false; resetUses(u);
  });
  map.turn = 0; map.order = []; map.active = 0; map.log = [];
  if (restart) startCombat(true);
  else { addLog('Préparation d\'un nouveau combat', 'round'); changed(); syncPlayUI(); }
}
// Fin du combat : XP des ennemis vaincus partagée entre les personnages, PV enregistrés sur les fiches
function endCombat() {
  if (map.turn <= 0) return;
  pushUndo();
  const heroes = map.units.filter(u => unitKind(u) === 'hero');
  const beaten = map.units.filter(u => unitKind(u) === 'monster' && isKO(u));
  const total = beaten.reduce((s, u) => s + (u.xp || 0), 0), share = heroes.length ? Math.floor(total / heroes.length) : 0;
  addLog(`🏁 Fin du combat après ${map.turn} round${map.turn > 1 ? 's' : ''} : ${beaten.length} ennemi${beaten.length > 1 ? 's' : ''} vaincu${beaten.length > 1 ? 's' : ''}, ${total} XP` +
         (heroes.length ? `, soit ${share} XP par personnage.` : '.'), 'win');
  heroes.forEach(u => {
    if (share) popText(u, `+${share} XP`, '#ffd23a', 16);
    const s = u.sheetId && getSheet(u.sheetId); if (!s) return;
    s.hpCur = u.hp; s.xp = (s.xp || 0) + share;
    if (u.dead) { s.dead = true; addLog(`⚰ La fiche de ${s.name} est marquée comme morte.`, 'ko'); }
    if (canLevelUp(s)) { addLog(`⬆ ${s.name} peut passer au niveau ${s.level + 1} (onglet Personnages) !`, 'win'); setTimeout(() => sfx('levelup'), 900); }
  });
  if (heroes.some(u => u.sheetId)) { saveSheets(); addLog('💾 PV et XP enregistrés sur les fiches des personnages.', 'info'); }
  map.turn = 0; map.order = []; map.active = 0; map.units.forEach(u => delete u.initRoll);
  changed(); syncPlayUI();
}

// Figurine ajoutée en cours de combat : elle lance son initiative et prend sa place dans l'ordre
function joinCombat(u) {
  resetUses(u);
  rollInitiative(u);
  sortOrder();
}
function leaveCombat(u) {
  const activeId = map.order[map.active];
  map.order = map.order.filter(id => id !== u.id);
  map.active = activeId === u.id ? Math.min(map.active, Math.max(0, map.order.length - 1))
                                 : Math.max(0, map.order.indexOf(activeId));
}

// ---------- Attaques, dégâts, soins ----------
// Avantage / désavantage selon les états de l'attaquant et de la cible (ils s'annulent)
function attackMods(a, t, melee) {
  let adv = 0; const why = [], has = (u, k) => (u.conds || []).includes(k);
  if (has(a, 'aveugle')) { adv--; why.push('aveuglé'); }
  if (has(a, 'poison')) { adv--; why.push('empoisonné'); }
  if (has(a, 'effraye')) { adv--; why.push('effrayé'); }
  if (has(a, 'aterre')) { adv--; why.push('à terre'); }
  if (has(a, 'invisible')) { adv++; why.push('invisible'); }
  if (has(t, 'invisible')) { adv--; why.push('cible invisible'); }
  if (has(t, 'aveugle') || has(t, 'etourdi') || has(t, 'entrave')) { adv++; why.push('cible vulnérable'); }
  if (has(t, 'aterre')) { if (melee) { adv++; why.push('cible à terre'); } else { adv--; why.push('cible à terre, de loin'); } }
  if (isKO(t)) { adv++; why.push('cible inconsciente'); }
  return { adv: Math.sign(adv), why };
}
// Jet d'attaque : d20 (+ avantage/désavantage) + toucher (+1d4 si béni) contre la CA, puis dégâts
// (doublés sur un 20 naturel ou contre une cible inconsciente au corps à corps ; +2 en rage)
function attack(a, t, opt = {}) {
  if (!opt.noUndo) pushUndo();
  const st = attackOf(a), name = opt.name || st.name;
  const melee = (unitStats(a).attaque || 1) <= 1, reach = canHitNow(a, t);
  const where = reach ? '' : melee ? ' (hors de portée)' : ' (hors de portée ou sans ligne de vue)';
  if (a.hidden) { a.hidden = false; addLog(`🙈 ${a.name} sort de sa cachette !`, 'cond'); }
  sfx('swing');
  if (!autoRoll) {
    startAttack(a, t, null); broadcast({ type: 'attack', a: a.id, t: t.id, res: null });
    addLog(`⚔ ${a.name} → ${t.name} : ${name}${where}`, 'atk');
    changed(); syncPlayUI(); return;
  }
  const m = attackMods(a, t, melee), r1 = rollDie(20), r2 = rollDie(20);
  const d20 = m.adv > 0 ? Math.max(r1, r2) : m.adv < 0 ? Math.min(r1, r2) : r1;
  const bless = (a.conds || []).includes('beni') ? rollDie(4) : 0, tot = d20 + (a.toucher || 0) + bless;
  const hit = d20 === 20 || (d20 !== 1 && tot >= (t.ca ?? 10)), crit = hit && (d20 === 20 || (melee && isKO(t)));
  const res = { hit, crit, dmg: 0 };
  let txt = `⚔ ${a.name} → ${t.name} (${name})${where} : 🎲 ${d20}` +
    (m.adv ? ` (${m.adv > 0 ? 'avantage' : 'désavantage'} [${r1},${r2}] : ${m.why.join(', ')})` : '') +
    ` ${fmtMod(a.toucher || 0)}${bless ? ` +${bless} béni` : ''} = ${tot} contre CA ${t.ca}`;
  if (hit) {
    const formula = a.degats + (opt.bonusDice ? '+' + opt.bonusDice : '') + ((a.conds || []).includes('rage') ? '+2' : '');
    const r = rollDice(formula, crit);
    res.dmg = isNaN(r.total) ? 0 : r.total;
    txt += crit ? ` → CRITIQUE ! ${res.dmg} dégâts ${r.detail}` : ` → touché : ${res.dmg} dégâts ${r.detail}`;
    a.track.hits++;
  } else {
    txt += d20 === 1 ? ' → échec critique' : ' → raté';
    a.track.misses++;
  }
  addLog(txt, hit ? (crit ? 'crit' : 'hit') : 'miss');
  startAttack(a, t, res); broadcast({ type: 'attack', a: a.id, t: t.id, res });
  // les dégâts s'appliquent au moment de l'impact de l'animation
  setTimeout(() => {
    if (hit) { sfx(crit ? 'crit' : 'hit'); applyDamage(t, res.dmg, a, crit); }
    else { sfx('miss'); popText(t, d20 === 1 ? 'Échec critique !' : 'Raté !', '#c8ccd4'); }
  }, st.dur * hitTime({ st }));
  changed(); syncPlayUI();
}

function applyDamage(t, n, src = null, crit = false) {
  if (!map.units.includes(t) || !(n > 0)) return;
  // personnage déjà à terre : chaque coup est un échec au jet contre la mort (2 sur un critique)
  if (t.hp === 0 && unitKind(t) === 'hero' && !t.dead) {
    t.ds ||= { s: 0, f: 0 }; t.stable = false; t.ds.f += crit ? 2 : 1;
    addLog(`💀 ${t.name} est frappé à terre : ${crit ? 2 : 1} échec${crit ? 's' : ''} au jet contre la mort (✖ ${t.ds.f}/3)`, 'ko');
    popText(t, '✖ jet contre la mort', '#ff8a8a', 14);
    if (t.ds.f >= 3) killUnit(t);
    changed(); syncPlayUI(); return;
  }
  const was = t.hp;
  t.hp = Math.max(0, t.hp - n);
  t.track.taken += was - t.hp;
  if (src && map.units.includes(src)) src.track.dealt += was - t.hp;
  popText(t, (crit ? 'CRITIQUE  −' : '−') + n, crit ? '#ffcf3a' : '#ff5a4a', crit ? 22 : 18);
  if (was > 0 && t.hp === 0) {
    if (unitKind(t) === 'hero') { t.ds = { s: 0, f: 0 }; t.stable = false; addLog(`💀 ${t.name} tombe inconscient ! Jets contre la mort à chaque tour.`, 'ko'); }
    else addLog(`💀 ${t.name} est hors de combat !`, 'ko');
    if (src) src.track.kos++;
    sfx('ko');
    setTimeout(() => popText(t, '💀 KO', '#ffffff', 18), 350);
    checkVictory();
  }
  changed(); syncPlayUI();
}
function killUnit(u) {
  u.dead = true; u.hp = 0;
  addLog(`⚰ ${u.name} est mort.`, 'ko'); popText(u, '⚰ Mort', '#ffffff', 18); sfx('death');
  checkVictory();
}
// Jet contre la mort : 10+ réussite, 20 = se relève avec 1 PV, 1 = deux échecs ; 3 réussites = stabilisé, 3 échecs = mort
function deathSave(u) {
  u.ds ||= { s: 0, f: 0 };
  const d = rollDie(20);
  if (d === 20) {
    u.hp = 1; u.ds = null; u.stable = false;
    addLog(`✨ ${u.name} : 20 au jet contre la mort, se relève avec 1 PV !`, 'heal'); popText(u, '✨ Debout !', '#5be37a', 18); sfx('heal');
    return;
  }
  if (d === 1) u.ds.f += 2; else if (d >= 10) u.ds.s++; else u.ds.f++;
  addLog(`💀 ${u.name} : jet contre la mort 🎲 ${d} → ${d >= 10 ? 'réussite' : d === 1 ? 'deux échecs' : 'échec'} (✔ ${u.ds.s}/3 · ✖ ${u.ds.f}/3)`, d >= 10 ? 'roll' : 'ko');
  popText(u, d >= 10 ? `✔ ${d}` : `✖ ${d}`, d >= 10 ? '#9ae0a0' : '#ff8a8a', 15);
  if (u.ds.f >= 3) killUnit(u);
  else if (u.ds.s >= 3) { u.stable = true; addLog(`🩹 ${u.name} est stabilisé (inconscient mais hors de danger).`, 'heal'); }
}
function heal(t, n) {
  if (!(n > 0)) return;
  if (t.dead) { addLog(`⚰ ${t.name} est mort : les soins ne suffisent plus.`, 'ko'); return; }
  const was = t.hp;
  t.hp = Math.min(t.hpMax, t.hp + n);
  t.track.healed += t.hp - was;
  addLog(`💚 ${t.name} récupère ${t.hp - was} PV (${t.hp}/${t.hpMax})`, 'heal');
  if (was === 0 && t.hp > 0) { t.ds = null; t.stable = false; addLog(`✨ ${t.name} reprend le combat`, 'heal'); }
  popText(t, '+' + (t.hp - was), '#5be37a', 18);
  changed(); syncPlayUI();
}
function checkVictory() {
  if (map.turn <= 0) return;
  const alive = k => map.units.some(u => unitKind(u) === k && !isKO(u));
  const has = k => map.units.some(u => unitKind(u) === k);
  if (has('monster') && !alive('monster') && alive('hero')) { addLog('🏆 Victoire ! Tous les ennemis sont hors de combat.', 'win'); setTimeout(() => sfx('victory'), 600); }
  else if (has('hero') && !alive('hero') && alive('monster')) addLog('☠ Défaite... tous les personnages sont hors de combat.', 'ko');
}
function toggleCond(u, k) {
  pushUndo();
  const c = condOf(k), on = !u.conds.includes(k);
  u.conds = on ? [...u.conds, k] : u.conds.filter(x => x !== k);
  addLog(`${c.icon} ${u.name} : ${c.name} ${on ? 'ajouté' : 'retiré'}`, 'cond');
  if (on) popText(u, c.icon + ' ' + c.name, '#e6d8ff', 14);
  changed(); syncPlayUI();
}

// ---------- Lanceur de dés ----------
function rollFree(formula) {
  const f = String(formula).trim(); if (!f) return;
  let r, label = f;
  if (/^d20(avantage|desavantage)$/.test(norm(f).replace(/\s/g, ''))) {
    const adv = norm(f).includes('desav') ? false : true, a = rollDie(20), b = rollDie(20);
    r = { total: adv ? Math.max(a, b) : Math.min(a, b), detail: `[${a},${b}]` };
    label = 'd20 ' + (adv ? 'avec avantage' : 'avec désavantage');
  } else r = rollDice(f);
  if (isNaN(r.total)) { $('diceOut').innerHTML = '<span class="warn">Formule invalide (ex. 2d6+3)</span>'; return; }
  $('diceOut').innerHTML = `<b>${r.total}</b> <span class="muted">${label} ${r.detail}</span>`;
  addLog(`🎲 ${label} = ${r.total} ${r.detail}`, 'roll'); sfx('dice');
  changed(); syncPlayUI();
}

// ---------- Panneaux ----------
function hpColor(f) { return f > 0.5 ? '#3cc86a' : f > 0.25 ? '#e0b030' : '#e04a3a'; }

function renderTracker() {
  const list = $('unitList'); list.replaceChildren();
  const fighting = map.turn > 0;
  const units = fighting
    ? [...map.order.map(unitById).filter(Boolean), ...map.units.filter(u => !map.order.includes(u.id))]
    : [...map.units].sort((a, b) => (unitKind(a) === 'hero' ? 0 : 1) - (unitKind(b) === 'hero' ? 0 : 1));
  if (!units.length) { list.innerHTML = '<p class="muted">Aucune figurine. Choisis un personnage ou un monstre à gauche.</p>'; return; }
  const act = activeUnit();
  units.forEach(u => {
    const row = document.createElement('button');
    row.className = 'trow ' + unitKind(u) + (u === playSel ? ' on' : '') + (u === act ? ' active' : '') + (isKO(u) ? ' ko' : '');
    const ini = document.createElement('span'); ini.className = 'ini';
    ini.textContent = fighting ? (u.initRoll ?? '–') : '';
    const info = document.createElement('div'); info.className = 'tinfo';
    const nm = document.createElement('div'); nm.className = 'tname';
    const dsTxt = u.dead ? ' ⚰' : isKO(u) && unitKind(u) === 'hero' ? (u.stable ? ' 🩹' : ` ${'✔'.repeat(u.ds?.s || 0)}${'✖'.repeat(u.ds?.f || 0)}`) : '';
    nm.textContent = (u === act ? '▶ ' : '') + u.name + dsTxt + ' ' + u.conds.map(k => condOf(k)?.icon || '').join('');
    const bar = document.createElement('div'); bar.className = 'hpbar';
    const f = u.hpMax ? u.hp / u.hpMax : 0;
    bar.innerHTML = `<i style="width:${Math.round(f * 100)}%;background:${hpColor(f)}"></i><span>${u.hp} / ${u.hpMax}</span>`;
    info.append(nm, bar);
    const ca = document.createElement('span'); ca.className = 'tca'; ca.textContent = '🛡' + u.ca;
    if (fighting) row.append(ini);
    row.append(spriteIcon(u.sprite, 26), info, ca);
    row.title = `Infligés ${u.track.dealt} · subis ${u.track.taken} · soins ${u.track.healed} · touches ${u.track.hits}/${u.track.hits + u.track.misses} · KO ${u.track.kos}`;
    row.onclick = () => selectUnit(u);
    list.appendChild(row);
  });
}

function renderLog() {
  const el = $('combatLog'); el.replaceChildren();
  if (!map.log.length) { el.innerHTML = '<p class="muted">Rien pour l\'instant.</p>'; return; }
  map.log.slice(0, 60).forEach(e => {
    const d = document.createElement('div'); d.className = 'log-' + (e.type || 'info'); d.textContent = e.text;
    el.appendChild(d);
  });
}

// Bilan : tableau des statistiques de chaque figurine
function renderSummary() {
  const el = $('combatSummary');
  const units = map.units.filter(u => u.track.dealt || u.track.taken || u.track.hits || u.track.misses || u.track.healed);
  if (!units.length) { el.innerHTML = '<p class="muted">Les statistiques apparaissent après les premières attaques.</p>'; return; }
  const t = document.createElement('table'); t.className = 'summary';
  t.innerHTML = '<tr><th></th><th title="Dégâts infligés">⚔</th><th title="Dégâts subis">🩸</th><th title="Touches / attaques">🎯</th><th title="Ennemis mis KO">💀</th></tr>';
  units.sort((a, b) => b.track.dealt - a.track.dealt).forEach(u => {
    const tr = document.createElement('tr');
    const n = document.createElement('td'); n.textContent = u.name;
    tr.appendChild(n);
    [u.track.dealt, u.track.taken, `${u.track.hits}/${u.track.hits + u.track.misses}`, u.track.kos].forEach(v => {
      const td = document.createElement('td'); td.textContent = v; tr.appendChild(td);
    });
    t.appendChild(tr);
  });
  el.replaceChildren(t);
}

// Partie « combat » du panneau de la figurine sélectionnée
function syncCombatPanel(u) {
  const f = u.hpMax ? u.hp / u.hpMax : 0;
  $('uHpBar').style.width = Math.round(f * 100) + '%'; $('uHpBar').style.background = hpColor(f);
  $('uHpTxt').textContent = isKO(u) ? 'Hors de combat' : `${u.hp} / ${u.hpMax} PV`;
  [['uHp', 'hp'], ['uHpMax', 'hpMax'], ['uCa', 'ca'], ['uToucher', 'toucher'], ['uDegats', 'degats'], ['uInit', 'init']]
    .forEach(([id, k]) => { if (document.activeElement !== $(id)) $(id).value = u[k]; });
  $('uDegats').classList.toggle('invalid', !validDice(u.degats));
  const conds = $('uConds'); conds.replaceChildren();
  CONDITIONS.forEach(c => {
    const b = document.createElement('button'); b.className = 'cond' + (u.conds.includes(c.k) ? ' on' : '');
    b.textContent = c.icon; b.title = c.name + (c.desc ? ' : ' + c.desc : '') + (c.move0 ? ' (ne peut pas se déplacer)' : '');
    b.onclick = () => toggleCond(u, c.k);
    conds.appendChild(b);
  });
  const tr = u.track;
  $('uTrack').textContent = `Infligés ${tr.dealt} · subis ${tr.taken} · soignés ${tr.healed} · touches ${tr.hits}/${tr.hits + tr.misses} · KO ${tr.kos}`;
  $('uSheet').classList.toggle('hidden', !u.sheetId || !getSheet(u.sheetId));
}

function syncCombatUI() {
  const fighting = map.turn > 0, act = activeUnit();
  $('turnLabel').innerHTML = fighting ? `Round <b>${map.turn}</b>` : '<b>Préparation</b>';
  $('turnWho').textContent = fighting && act ? `Tour de ${act.name}` : fighting ? '' : 'Place les figurines puis lance le combat';
  $('btnStartCombat').classList.toggle('hidden', fighting);
  $('btnNextTurn').classList.toggle('hidden', !fighting);
  $('combatCtl').classList.toggle('hidden', !fighting);
  $('autoRoll').checked = autoRoll;
  $('autoMonsters').checked = autoMonsters;
  $('btnAi').classList.toggle('hidden', !(fighting && act && !isKO(act) && unitKind(act) === 'monster'));
  renderTracker(); renderLog(); renderSummary();
}

// ---------- Boutons ----------
$('btnNextTurn').onclick = endTurn;
$('btnStartCombat').onclick = () => startCombat();
$('btnRestart').onclick = () => { if (confirm('Recommencer le combat ? Positions de départ, PV pleins, nouvelle initiative.')) resetCombat(true); };
$('btnEndCombat').onclick = () => { if (confirm('Terminer le combat ? L\'XP des ennemis vaincus est partagée et les PV sont enregistrés sur les fiches.')) endCombat(); };
$('btnNewCombat').onclick = () => { if (confirm('Nouveau combat ? Positions de départ, PV pleins, retour en préparation.')) resetCombat(false); };
$('autoMonsters').onchange = e => {
  autoMonsters = e.target.checked; try { localStorage.setItem('jdr-automonsters', autoMonsters ? '1' : '0'); } catch (err) {}
  if (autoMonsters) maybeAutoMonster();
};
$('btnAi').onclick = () => runAiTurn(false);
$('autoRoll').onchange = e => { autoRoll = e.target.checked; try { localStorage.setItem('jdr-autoroll', autoRoll ? '1' : '0'); } catch (err) {} };

const amount = () => Math.max(0, Math.floor(+$('uAmount').value || 0));
$('btnDmg').onclick = () => { const u = playSel; if (!u || !amount()) return;
  pushUndo(); addLog(`💥 ${u.name} subit ${amount()} dégâts`, 'hit'); applyDamage(u, amount()); };
$('btnHeal').onclick = () => { const u = playSel; if (!u || !amount()) return; pushUndo(); heal(u, amount()); };
$('btnFullHeal').onclick = () => { const u = playSel; if (!u) return; pushUndo(); heal(u, u.hpMax - u.hp); };

[['uHp', 'hp'], ['uHpMax', 'hpMax'], ['uCa', 'ca'], ['uToucher', 'toucher'], ['uInit', 'init'], ['uDegats', 'degats']].forEach(([id, k]) => {
  $(id).addEventListener('focus', pushUndo);
  $(id).addEventListener('input', e => {
    const u = playSel; if (!u) return;
    if (k === 'degats') u[k] = e.target.value;
    else if (e.target.value !== '') u[k] = Math.floor(+e.target.value);
    if (k === 'hpMax') u.hpMax = Math.max(1, u.hpMax);
    if (k === 'hp' || k === 'hpMax') u.hp = clamp(u.hp, 0, u.hpMax);
    changed(); syncPlayUI();
  });
});

$('diceIn').addEventListener('keydown', e => { if (e.key === 'Enter') rollFree(e.target.value); });
$('btnDice').onclick = () => rollFree($('diceIn').value);
document.querySelectorAll('[data-die]').forEach(b => b.onclick = () => { $('diceIn').value = b.dataset.die; rollFree(b.dataset.die); });

$('btnLogExport').onclick = () => {
  const txt = [...map.log].reverse().map(e => e.text).join('\n');
  const url = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }));
  download('journal-combat.txt', url); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('btnLogClear').onclick = () => { if (map.log.length && confirm('Vider le journal ?')) { pushUndo(); map.log = []; changed(); syncPlayUI(); } };
