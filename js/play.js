// Mode « Jouer » : le MJ place et déplace les personnages et monstres sur la carte.
// La hauteur de chaque unité (relief + élément sur lequel elle se tient) est affichée.

let playSel = null;   // unité sélectionnée
let pending = null;   // sprite en attente de placement
let attackMode = false;   // en attente du choix d'une cible
let combatLog = [];       // dernières attaques (affichées dans le panneau)

function setMode(m) {
  mode = m;
  document.body.classList.toggle('mode-play', m === 'play');
  document.body.classList.toggle('mode-edit', m === 'edit');
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
  drag = null; select(null); playSel = null; setPending(null); attackMode = false; $('attackHint').classList.add('hidden');
  syncMapUI(); syncPlayUI(); resize();
}
document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => setMode(b.dataset.mode));

// ---------- Unités ----------
function addUnit(key, cx, cy) {
  const sp = SPRITES[key], s = sp.size;
  const n = map.units.filter(u => u.sprite === key).length;
  const u = { id: map.nextId++, sprite: key, name: sp.name + (n ? ' ' + (n + 1) : ''), size: s,
              x: clamp(cx, 0, map.cols - s), y: clamp(cy, 0, map.rows - s) };
  u.sx = u.x; u.sy = u.y;   // position en début de tour : origine de la zone de déplacement
  u.ox = u.x; u.oy = u.y;   // position au début du combat (pour « Recommencer »)
  map.units.push(u);
  return u;
}
function removeUnit(u) {
  map.units = map.units.filter(x => x !== u);
  if (playSel === u) playSel = null;
  syncPlayUI();
}
function selectUnit(u) {
  playSel = u;
  if (!u && attackMode) { attackMode = false; $('attackHint').classList.add('hidden'); }
  syncPlayUI(); redraw();
}
function setPending(k) {
  pending = k;
  document.querySelectorAll('[data-sprite]').forEach(b => b.classList.toggle('on', b.dataset.sprite === k));
  redraw();
}

// Position à l'écran : pieds de l'unité (relief compris) et taille du sprite
function unitBox(u) {
  const sw = T * 0.95 * u.size;
  return { cx: (u.x + u.size/2) * T, fy: (u.y + u.size*0.78) * T - unitLevel(u) * LH(), sw };
}
function hitUnit(wx, wy) {
  const front = [...map.units].sort((a, b) => (b.y + b.size) - (a.y + a.size));
  return front.find(u => {
    const { cx, fy, sw } = unitBox(u);
    return wx >= cx - sw*0.45 && wx <= cx + sw*0.45 && wy >= fy - sw && wy <= fy + sw*0.2;
  }) || null;
}

// ---------- Rendu ----------
function tag(c, x, y, txt, bg) {
  c.font = 'bold 11px system-ui'; c.textAlign = 'center'; c.textBaseline = 'bottom';
  const w = c.measureText(txt).width + 8;
  c.fillStyle = bg; c.fillRect(x - w/2, y - 14, w, 14);
  c.fillStyle = '#fff'; c.fillText(txt, x, y - 2);
}
function drawUnit(c, u, ui, ghost = false) {
  const sp = SPRITES[u.sprite]; if (!sp) return;
  let { cx, fy, sw } = unitBox(u);
  const lvl = unitLevel(u), an = ghost ? null : unitAnim(u);
  if (an) { cx += an.dx; fy += an.dy; }
  c.save();
  if (ghost) c.globalAlpha = 0.55;
  // ombre et socle coloré (bleu = personnage, rouge = monstre)
  c.fillStyle = 'rgba(0,0,0,.35)';
  c.beginPath(); c.ellipse(cx, fy, sw*0.36, sw*0.13, 0, 0, Math.PI*2); c.fill();
  c.strokeStyle = sp.kind === 'hero' ? '#4da3ff' : '#ff4d4d'; c.lineWidth = 2.5;
  c.beginPath(); c.ellipse(cx, fy, sw*0.42, sw*0.16, 0, 0, Math.PI*2); c.stroke();
  if (ui && u === playSel) {
    c.strokeStyle = '#e0a52b'; c.lineWidth = 3; c.setLineDash([5, 3]);
    c.beginPath(); c.ellipse(cx, fy, sw*0.52, sw*0.21, 0, 0, Math.PI*2); c.stroke();
    c.setLineDash([]);
  }
  // ennemi à portée d'attaque de la figurine dont on affiche les zones
  const threat = !ghost && ui && curZones.some(t => t.strong && t.u !== u &&
                 SPRITES[t.u.sprite].kind !== sp.kind && unitInZone(u, t.z));
  if (threat) {
    c.strokeStyle = '#ff3b3b'; c.lineWidth = 4;
    c.beginPath(); c.ellipse(cx, fy, sw*0.5, sw*0.2, 0, 0, Math.PI*2); c.stroke();
  }
  c.imageSmoothingEnabled = false;
  const paint = img => {
    if (an && an.flip) { c.save(); c.translate(cx, 0); c.scale(-1, 1); c.drawImage(img, -sw/2, fy - sw*0.97, sw, sw); c.restore(); }
    else c.drawImage(img, cx - sw/2, fy - sw*0.97, sw, sw);
  };
  paint(spriteCanvas(u.sprite));
  if (an && an.flash > 0) {   // éclair blanc quand la figurine est touchée
    c.save(); c.globalAlpha = an.flash; paint(spriteTint(u.sprite, '#ffffff')); c.restore();
  }
  if (!ghost) {
    const name = (threat ? '⚔ ' : '') + u.name + (lvl > 0 ? `  ▲${fmtLevel(lvl)}` : '');
    tag(c, cx, fy - sw - 2, name, threat ? '#c0392b' : sp.kind === 'hero' ? 'rgba(29,58,102,.9)' : 'rgba(90,26,26,.9)');
    // hauteur par rapport à l'unité sélectionnée
    if (ui && mode === 'play' && playSel && playSel !== u) {
      const d = lvl - unitLevel(playSel);
      if (Math.abs(d) >= 0.25)
        tag(c, cx, fy - sw - 18, (d > 0 ? '▲ +' : '▼ −') + fmtLevel(Math.abs(d)), d > 0 ? '#b5651d' : '#2a6f7f');
    }
  }
  c.restore();
}
function drawPlayOverlay(c) {
  // position de début de tour des figurines déplacées
  curZones.filter(t => t.strong).forEach(({ u, z }) => {
    if (u.x === z.sx && u.y === z.sy) return;
    const top = z.sy*T - maxLevelUnder(z.sx, z.sy, u.size, u.size) * LH();
    c.setLineDash([6, 4]); c.strokeStyle = '#fff'; c.lineWidth = 2;
    c.strokeRect(z.sx*T + 3, top + 3, u.size*T - 6, u.size*T - 6); c.setLineDash([]);
    c.globalAlpha = 0.35; c.imageSmoothingEnabled = false;
    c.drawImage(spriteCanvas(u.sprite), z.sx*T + u.size*T*0.2, top + u.size*T*0.1, u.size*T*0.6, u.size*T*0.6);
    c.globalAlpha = 1;
  });
  // mode attaque : viseur sur la cible survolée
  if (attackMode && playSel && hover) {
    const t = hitUnit(hover.wx, hover.wy);
    if (t && t !== playSel) {
      const a = unitBox(playSel), b = unitBox(t), r = b.sw * 0.5, ty = b.fy - b.sw * 0.45;
      const inRange = unitInZone(t, computeZones(playSel));
      const col = inRange ? '#ffd23a' : '#ff8a8a';
      c.save();
      c.setLineDash([8, 6]); c.strokeStyle = col; c.lineWidth = 2;
      c.beginPath(); c.moveTo(a.cx, a.fy - a.sw * 0.45); c.lineTo(b.cx, ty); c.stroke(); c.setLineDash([]);
      c.lineWidth = 3; c.beginPath(); c.arc(b.cx, ty, r, 0, Math.PI * 2); c.stroke();
      c.beginPath();
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx, dy]) => { c.moveTo(b.cx + dx*r*0.6, ty + dy*r*0.6); c.lineTo(b.cx + dx*r*1.3, ty + dy*r*1.3); });
      c.stroke();
      if (!inRange) tag(c, b.cx, ty + r + 18, 'hors de portée', '#8a2a2a');
      c.restore();
    }
  }
  if (!pending || !hover || drag) return;
  const s = SPRITES[pending].size;
  drawUnit(c, { sprite: pending, name: '', size: s,
                x: clamp(hover.cx, 0, map.cols - s), y: clamp(hover.cy, 0, map.rows - s) }, true, true);
}

// ---------- Souris / clavier ----------
function playMouseDown(e, p) {
  if (e.button === 2) {
    const u = hitUnit(p.wx, p.wy);
    if (u) { pushUndo(); removeUnit(u); changed(); }
    return;
  }
  if (e.button !== 0) return;
  const u = hitUnit(p.wx, p.wy);
  if (attackMode) {
    if (u && u !== playSel) attack(playSel, u);
    setAttackMode(false);
    return;
  }
  if (u) {
    pushUndo(); selectUnit(u);
    drag = { mode: 'unit', ox: p.cx - u.x, oy: p.cy - u.y };
    return;
  }
  if (pending && inMap(p.cx, p.cy)) {
    pushUndo();
    selectUnit(addUnit(pending, p.cx, p.cy));
    if (!e.shiftKey) setPending(null);
    changed(); return;
  }
  selectUnit(null);
}
function playMouseMove(p) {
  if (drag.mode !== 'unit' || !playSel) return;
  const u = playSel;
  u.x = clamp(p.cx - drag.ox, 0, map.cols - u.size);
  u.y = clamp(p.cy - drag.oy, 0, map.rows - u.size);
  followSetup(u); changed(); syncPlayUI();
}
// En préparation, la position de départ suit la figurine (on peut la placer librement)
function followSetup(u) { if (!map.turn) { u.sx = u.ox = u.x; u.sy = u.oy = u.y; } }
function playKey(e) {
  if ((e.key === 'Delete' || e.key === 'Backspace') && playSel) { pushUndo(); removeUnit(playSel); changed(); }
  else if (e.key === 'Escape') { if (attackMode) setAttackMode(false); else { setPending(null); selectUnit(null); } }
  else if (e.key.toLowerCase() === 'a' && playSel) setAttackMode(!attackMode);
  else if (playSel && e.key.startsWith('Arrow')) {
    e.preventDefault(); pushUndo();
    const d = { ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1] }[e.key];
    playSel.x = clamp(playSel.x + d[0], 0, map.cols - playSel.size);
    playSel.y = clamp(playSel.y + d[1], 0, map.rows - playSel.size);
    followSetup(playSel); changed(); syncPlayUI();
  }
}

// ---------- Panneaux ----------
function buildPlayPalettes() {
  Object.entries(SPRITES).forEach(([k, sp]) => {
    const b = document.createElement('button'); b.className = 'item'; b.dataset.sprite = k;
    b.appendChild(spriteIcon(k, 44)); b.append(sp.name);
    b.onclick = () => setPending(pending === k ? null : k);
    $(sp.kind === 'hero' ? 'heroPal' : 'monsterPal').appendChild(b);
  });
}

function syncPlayUI() {
  const u = playSel;
  $('unitPanel').classList.toggle('hidden', !u);
  if (u) {
    $('unitHead').replaceChildren(spriteIcon(u.sprite, 56));
    if (document.activeElement !== $('unitName')) $('unitName').value = u.name;
    const lvl = unitLevel(u);
    $('unitLvl').textContent = lvl > 0
      ? `${fmtLevel(lvl)} niveau${lvl > 1 ? 'x' : ''} (≈ ${fmtLevel(lvl * METERS_PER_LEVEL)} m)` : 'Au sol';
    // portées
    const st = unitStats(u), used = movementUsed(u), z = computeZones(u);
    $('unitMoveTxt').textContent = isFinite(used) ? `${used} / ${st.deplacement} cases utilisées`
                                                 : `⚠ hors de portée (${st.deplacement} cases)`;
    $('unitMoveTxt').classList.toggle('warn', !isFinite(used));
    const bonus = STATS.rules.bonus_portee_hauteur;
    $('unitAtkTxt').textContent = st.attaque <= 1 ? 'corps à corps (1 case)'
      : `${st.attaque} cases` + (bonus ? ` (+${fmtLevel(bonus)} par niveau au-dessus)` : '');
    $('unitAbil').textContent = [st.vol && 'Vol', st.nage && 'Nage', `Escalade ${fmtLevel(st.saut)} niv.`].filter(Boolean).join(' · ');
    if (document.activeElement !== $('unitMov')) $('unitMov').value = st.deplacement;
    if (document.activeElement !== $('unitAtk')) $('unitAtk').value = st.attaque;
    // comparaison avec le camp adverse
    const kind = SPRITES[u.sprite].kind;
    const foes = map.units.filter(o => SPRITES[o.sprite].kind !== kind);
    const rel = $('unitRel'); rel.replaceChildren();
    if (!foes.length) rel.innerHTML = '<p class="muted">Aucun adversaire sur la carte.</p>';
    foes.forEach(o => {
      const d = lvl - unitLevel(o), div = document.createElement('div');
      div.className = 'rel ' + (d >= 0.5 ? 'up' : d <= -0.5 ? 'down' : 'eq');
      div.textContent = (d >= 0.5 ? `▲ Domine ${o.name} (+${fmtLevel(d)})`
                      : d <= -0.5 ? `▼ Plus bas que ${o.name} (−${fmtLevel(-d)})`
                      : `= Même niveau que ${o.name}`) + (unitInZone(o, z) ? '  ⚔ à portée' : '');
      rel.appendChild(div);
    });
  }
  const fighting = map.turn > 0;
  $('turnLabel').innerHTML = fighting ? `Tour <b>${map.turn}</b>` : '<b>Préparation</b>';
  $('btnStartCombat').classList.toggle('hidden', fighting);
  $('btnNextTurn').classList.toggle('hidden', !fighting);
  $('combatCtl').classList.toggle('hidden', !fighting);
  $('btnAttack').classList.toggle('on', attackMode);
  $('combatLog').replaceChildren(...combatLog.map(t => Object.assign(document.createElement('div'), { textContent: t })));
  if (!combatLog.length) $('combatLog').innerHTML = '<p class="muted">Aucune attaque pour l\'instant.</p>';
  $('statsSrc').textContent = statsSource;
  document.querySelectorAll('[data-zone]').forEach(b => b.classList.toggle('on', b.dataset.zone === zoneMode));
  // liste des unités : personnages puis monstres
  const list = $('unitList'); list.replaceChildren();
  const units = [...map.units].sort((a, b) => (SPRITES[a.sprite].kind === 'hero' ? 0 : 1) - (SPRITES[b.sprite].kind === 'hero' ? 0 : 1));
  if (!units.length) list.innerHTML = '<p class="muted">Aucune unité. Choisis un personnage ou un monstre à gauche.</p>';
  units.forEach(un => {
    const b = document.createElement('button'); b.className = 'unit-row' + (un === playSel ? ' on' : '');
    const name = document.createElement('span'); name.textContent = un.name;
    const lvl = document.createElement('span'); lvl.className = 'lvl'; lvl.textContent = '▲ ' + fmtLevel(unitLevel(un));
    b.append(spriteIcon(un.sprite, 24), name, lvl);
    b.onclick = () => selectUnit(un);
    list.appendChild(b);
  });
}

$('unitName').addEventListener('focus', pushUndo);
$('unitName').addEventListener('input', e => { if (playSel) { playSel.name = e.target.value; changed(); syncPlayUI(); } });
$('btnUnitDel').onclick = () => { if (playSel) { pushUndo(); removeUnit(playSel); changed(); } };
$('btnClearUnits').onclick = () => {
  if (!map.units.length || !confirm('Retirer toutes les unités de la carte ?')) return;
  pushUndo(); map.units = []; playSel = null; syncPlayUI(); changed();
};
// ---------- Attaques ----------
function setAttackMode(on) {
  attackMode = on && !!playSel;
  $('attackHint').classList.toggle('hidden', !attackMode);
  if (attackMode) $('attackHint').textContent = `⚔ ${playSel.name} : clique sur la cible à attaquer (Échap pour annuler)`;
  syncPlayUI(); redraw();
}
function attack(a, t) {
  startAttack(a, t);
  const inRange = unitInZone(t, computeZones(a));
  combatLog.unshift(`${map.turn ? 'Tour ' + map.turn : 'Préparation'} · ${a.name} → ${t.name} : ${attackOf(a).name}${inRange ? '' : ' (hors de portée)'}`);
  combatLog = combatLog.slice(0, 8);
  syncPlayUI();
}
$('btnAttack').onclick = () => setAttackMode(!attackMode);

// ---------- Tours ----------
function nextTurn() {
  pushUndo();
  map.turn = (map.turn || 0) + 1;
  map.units.forEach(u => { u.sx = u.x; u.sy = u.y; });
  changed(); syncPlayUI();
}
// Début du combat : les positions actuelles deviennent les positions de départ
function startCombat() {
  pushUndo();
  map.turn = 1; combatLog = []; anims = [];
  map.units.forEach(u => { u.ox = u.sx = u.x; u.oy = u.sy = u.y; });
  changed(); syncPlayUI();
}
// Remet les figurines à leur position de départ ; turn = 1 (recommencer) ou 0 (retour en préparation)
function resetCombat(turn) {
  pushUndo();
  map.turn = turn; combatLog = []; anims = [];
  map.units.forEach(u => { u.x = u.sx = u.ox ?? u.x; u.y = u.sy = u.oy ?? u.y; });
  changed(); syncPlayUI();
}
$('btnNextTurn').onclick = nextTurn;
$('btnStartCombat').onclick = startCombat;
$('btnRestart').onclick = () => { if (confirm('Recommencer le combat ? Les figurines retournent à leur position de départ (tour 1).')) resetCombat(1); };
$('btnNewCombat').onclick = () => { if (confirm('Nouveau combat ? Les figurines retournent à leur position de départ et on repasse en préparation.')) resetCombat(0); };
$('btnUnitBack').onclick = () => {
  const u = playSel; if (!u) return;
  pushUndo(); u.x = u.sx ?? u.x; u.y = u.sy ?? u.y; changed(); syncPlayUI();
};

// Déplacement / portée propres à cette figurine (sinon valeurs du fichier de caractéristiques)
[['unitMov', 'mov', 'deplacement'], ['unitAtk', 'atk', 'attaque']].forEach(([id, prop, statKey]) => {
  $(id).addEventListener('focus', pushUndo);
  $(id).addEventListener('input', e => {
    const u = playSel; if (!u || e.target.value === '') return;
    const v = Math.max(0, +e.target.value), base = (STATS.units[u.sprite] || {})[statKey];
    if (v === base) delete u[prop]; else u[prop] = v;
    changed(); syncPlayUI();
  });
});

// ---------- Affichage des portées ----------
document.querySelectorAll('[data-zone]').forEach(b => b.onclick = () => { zoneMode = b.dataset.zone; syncPlayUI(); redraw(); });

// ---------- Fichier de caractéristiques ----------
$('btnStatsLoad').onclick = () => $('statsIn').click();
$('statsIn').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  const txt = await f.text();
  if (!Object.keys(parseStats(txt).units).length) alert('Aucune figurine reconnue dans ce fichier : vérifie les noms entre [crochets].');
  else {
    loadStats(txt, f.name);
    try { localStorage.setItem('jdr-stats', txt); } catch (err) {}
    syncPlayUI(); redraw();
  }
  e.target.value = '';
};
$('btnStatsReset').onclick = () => {
  try { localStorage.removeItem('jdr-stats'); } catch (err) {}
  loadStats(DEFAULT_STATS_TXT, 'valeurs par défaut'); syncPlayUI(); redraw();
};

$('depthPlay').oninput = e => { map.depth = +e.target.value; syncMapUI(); changed(); };
$('gridPlay').onchange = e => { map.grid = e.target.checked; syncMapUI(); changed(); };
$('btnFitPlay').onclick = () => fit();
