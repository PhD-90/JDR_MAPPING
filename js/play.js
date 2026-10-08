// Mode « Jouer » : le MJ place et déplace les personnages et monstres sur la carte.
// La hauteur de chaque figurine (relief + élément sur lequel elle se tient) est affichée,
// ainsi que ses PV, ses états et le tour en cours (voir combat.js).

let playSel = null;       // figurine sélectionnée
let pending = null;       // figurine en attente de placement : clé de sprite ou « sheet:<id> » (fiche de personnage)
let attackMode = false;   // en attente du choix d'une cible

function setMode(m) {
  mode = m;
  ['play', 'edit', 'chars', 'world', 'gm'].forEach(k => document.body.classList.toggle('mode-' + k, m === k));
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
  drag = null; select(null); playSel = null; setPending(null); attackMode = false; actionMode = null; $('attackHint').classList.add('hidden');
  updateMapLocTag();
  if (m === 'chars') { renderChars(); return; }
  if (m === 'world') { enterWorld(); return; }
  if (m === 'gm') { enterGm(); return; }
  syncMapUI(); syncPlayUI(); resize();
}
document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => setMode(b.dataset.mode));

// ---------- Figurines ----------
const pendingSprite = k => k && k.startsWith('sheet:') ? (getSheet(k.slice(6)) || {}).sprite || 'warrior' : k;

function addUnit(key, cx, cy) {
  const sheet = key.startsWith('sheet:') ? getSheet(key.slice(6)) : null;
  const spKey = sheet ? sheet.sprite : key, sp = SPRITES[spKey], s = sp.size;
  const baseName = sheet ? sheet.name : sp.name;
  const n = map.units.filter(u => (u.baseName || SPRITES[u.sprite].name) === baseName).length;
  const u = { id: map.nextId++, sprite: spKey, baseName, name: baseName + (n ? ' ' + (n + 1) : ''), size: s,
              x: clamp(cx, 0, map.cols - s), y: clamp(cy, 0, map.rows - s) };
  u.sx = u.x; u.sy = u.y;   // position en début de tour : origine de la zone de déplacement
  u.ox = u.x; u.oy = u.y;   // position au début du combat (pour « Recommencer »)
  if (sheet) applySheet(u, sheet);
  ensureCombat(u);
  map.units.push(u);
  if (map.turn > 0) joinCombat(u);
  return u;
}
// Copie les valeurs d'une fiche de personnage dans une figurine
function applySheet(u, sheet) {
  const v = sheetDerived(sheet).val;
  const dd = sheetDerived(sheet);
  Object.assign(u, { cls: sheet.cls, lvl: sheet.level, mod: dd.mod[dd.cls.prio[0]] });
  Object.assign(u, { sheetId: sheet.id, camp: sheet.camp, sprite: sheet.sprite,
    hpMax: Math.max(1, +v.pv), ca: +v.ca, toucher: +v.toucher, degats: String(v.degats), init: +v.init,
    mov: +v.deplacement, atk: +v.portee, saut: +v.saut, nage: !!v.nage, vol: !!v.vol });
  u.xp = sheet.camp === 'monster' ? (sheet.xp || 50 * sheet.level) : 0;
  if (u.hp === undefined) u.hp = clamp(sheet.hpCur ?? u.hpMax, 0, u.hpMax);
  if (u.hp > u.hpMax) u.hp = u.hpMax;
}
function removeUnit(u) {
  if (map.turn > 0) leaveCombat(u);
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
  if (k) { fogTool = null; markTool = null; if (typeof syncGmTools === 'function') syncGmTools(); }
  document.querySelectorAll('[data-sprite]').forEach(b => b.classList.toggle('on', b.dataset.sprite === k));
  redraw();
}

// Position à l'écran : pieds de la figurine (relief compris) et taille du sprite
function unitBox(u) {
  const sw = T * 0.95 * u.size;
  return { cx: (u.x + u.size/2) * T, fy: (u.y + u.size*0.78) * T - unitLevel(u) * LH(), sw };
}
function hitUnit(wx, wy) {
  const front = [...map.units].sort((a, b) => (b.y + b.size) - (a.y + a.size));
  return front.find(u => {
    const { cx, fy, sw } = unitBox(u), ko = isKO(u);
    return wx >= cx - sw*0.45 && wx <= cx + sw*0.45 && wy >= fy - (ko ? sw*0.5 : sw) && wy <= fy + sw*0.2;
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
  const lvl = unitLevel(u), an = ghost ? null : unitAnim(u), kind = unitKind(u), ko = !ghost && isKO(u);
  const play = ui && mode === 'play', active = play && !ghost && u === activeUnit();
  if (an) { cx += an.dx; fy += an.dy; }
  c.save();
  if (ghost || (u.hidden && !playerSight())) c.globalAlpha = 0.5;   // le MJ voit les figurines cachées en transparence
  // ombre et socle coloré (bleu = personnage, rouge = monstre)
  c.fillStyle = 'rgba(0,0,0,.35)';
  c.beginPath(); c.ellipse(cx, fy, sw*0.36, sw*0.13, 0, 0, Math.PI*2); c.fill();
  c.strokeStyle = ko ? '#666' : kind === 'hero' ? '#4da3ff' : '#ff4d4d'; c.lineWidth = 2.5;
  c.beginPath(); c.ellipse(cx, fy, sw*0.42, sw*0.16, 0, 0, Math.PI*2); c.stroke();
  if (active) {   // c'est son tour : anneau doré qui pulse
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 250);
    c.strokeStyle = `rgba(255,210,60,${0.6 + 0.4 * pulse})`; c.lineWidth = 4;
    c.beginPath(); c.ellipse(cx, fy, sw*0.56, sw*0.23, 0, 0, Math.PI*2); c.stroke();
  }
  if (ui && u === playSel) {
    c.strokeStyle = '#e0a52b'; c.lineWidth = 3; c.setLineDash([5, 3]);
    c.beginPath(); c.ellipse(cx, fy, sw*0.5, sw*0.2, 0, 0, Math.PI*2); c.stroke();
    c.setLineDash([]);
  }
  // ennemi à portée d'attaque de la figurine dont on affiche les zones
  const threat = !ghost && !ko && ui && curZones.some(t => t.strong && t.u !== u &&
                 unitKind(t.u) !== kind && unitInZone(u, t.z));
  if (threat) {
    c.strokeStyle = '#ff3b3b'; c.lineWidth = 4;
    c.beginPath(); c.ellipse(cx, fy, sw*0.5, sw*0.2, 0, 0, Math.PI*2); c.stroke();
  }
  c.imageSmoothingEnabled = false;
  if (ko) {   // hors de combat : couché et grisé
    c.save(); c.translate(cx, fy - sw*0.18); c.rotate(-Math.PI / 2);
    c.globalAlpha *= 0.75; c.drawImage(spriteCanvas(u.sprite), -sw*0.4, -sw*0.5, sw*0.8, sw*0.8);
    c.globalAlpha = 0.45; c.drawImage(spriteTint(u.sprite, '#2a2a2a'), -sw*0.4, -sw*0.5, sw*0.8, sw*0.8);
    c.restore();
  } else {
    const paint = img => {
      if (an && an.flip) { c.save(); c.translate(cx, 0); c.scale(-1, 1); c.drawImage(img, -sw/2, fy - sw*0.97, sw, sw); c.restore(); }
      else c.drawImage(img, cx - sw/2, fy - sw*0.97, sw, sw);
    };
    paint(spriteCanvas(u.sprite));
    if (an && an.flash > 0) {   // éclair blanc quand la figurine est touchée
      c.save(); c.globalAlpha = an.flash; paint(spriteTint(u.sprite, '#ffffff')); c.restore();
    }
  }
  if (!ghost) {
    // pile au-dessus de la tête : barre de PV, nom, états, hauteur relative
    let y = ko ? fy - sw*0.45 : fy - sw - 2;
    if (u.hpMax && !(playerSight() && kind === 'monster')) {   // PV des monstres invisibles pour les joueurs
      const f = clamp(u.hp / u.hpMax, 0, 1), bw = Math.max(sw * 0.8, 30);
      c.fillStyle = 'rgba(0,0,0,.7)'; c.fillRect(cx - bw/2 - 1, y - 6, bw + 2, 6);
      c.fillStyle = hpColor(f); c.fillRect(cx - bw/2, y - 5, bw * f, 4);
      y -= 8;
    }
    const name = (u.hidden && !playerSight() ? '🙈 ' : '') + (u.dead ? '⚰ ' : ko ? '💀 ' : threat ? '⚔ ' : '') + u.name + (lvl > 0 && !ko ? `  ▲${fmtLevel(lvl)}` : '');
    tag(c, cx, y, name, ko ? 'rgba(40,40,40,.9)' : threat ? '#c0392b' : kind === 'hero' ? 'rgba(29,58,102,.9)' : 'rgba(90,26,26,.9)');
    y -= 15;
    if (u.conds && u.conds.length) {
      c.font = '12px system-ui'; c.textAlign = 'center'; c.textBaseline = 'bottom';
      c.fillText(u.conds.map(k => condOf(k)?.icon || '').join(''), cx, y);
      y -= 15;
    }
    if (play && playSel && playSel !== u && !playerSight()) {   // hauteur par rapport à la figurine sélectionnée
      const d = lvl - unitLevel(playSel);
      if (Math.abs(d) >= 0.25)
        tag(c, cx, y, (d > 0 ? '▲ +' : '▼ −') + fmtLevel(Math.abs(d)), d > 0 ? '#b5651d' : '#2a6f7f');
    }
    if (active) {   // flèche du tour en cours
      const bob = Math.sin(performance.now() / 200) * 3;
      c.fillStyle = '#ffd23c'; c.strokeStyle = '#000'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(cx - 8, y - 22 + bob); c.lineTo(cx + 8, y - 22 + bob); c.lineTo(cx, y - 10 + bob); c.closePath();
      c.fill(); c.stroke();
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
  // mode attaque : viseur sur la cible survolée, avec la chance de toucher
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
      const need = clamp((t.ca ?? 10) - (playSel.toucher || 0), 2, 20), pct = Math.round((21 - need) / 20 * 100);
      tag(c, b.cx, ty + r + 18, (inRange ? '' : 'hors de portée · ') + `CA ${t.ca} · ${pct}% de toucher`, inRange ? '#5a4a10' : '#8a2a2a');
      c.restore();
    }
  }
  drawActionTarget(c);
  if (!pending || !hover || drag) return;
  const spk = pendingSprite(pending), s = SPRITES[spk].size;
  drawUnit(c, { sprite: spk, name: '', size: s, x: clamp(hover.cx, 0, map.cols - s), y: clamp(hover.cy, 0, map.rows - s) }, true, true);
}
// La flèche et l'anneau du tour en cours sont animés : on redessine en continu en mode Jouer
(function pulse() {
  if (mode === 'play' && map.turn > 0 && !animRaf) draw();
  setTimeout(() => requestAnimationFrame(pulse), 60);
})();

// ---------- Souris / clavier ----------
function playMouseDown(e, p) {
  if (actionMode) { actionClick(e, p); return; }
  if (gmMouseDown(e, p)) return;
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
  if (gmMouseMove(p)) return;
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
  else if (e.key === 'Escape') { if (actionMode) cancelAction(); else if (attackMode) setAttackMode(false); else if (fogTool || markTool) { setFogTool(null); setMarkTool(null); } else { setPending(null); selectUnit(null); } }
  else if (e.key.toLowerCase() === 'a' && playSel) setAttackMode(!attackMode);
  else if ((e.key === 'Enter' || e.key.toLowerCase() === 'n') && map.turn > 0 && e.target.tagName !== 'BUTTON') { e.preventDefault(); endTurn(); }
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
// Fiches de l'onglet « Personnages », à poser sur la carte
function renderSheetPal() {
  const pal = $('sheetPal'); pal.replaceChildren();
  $('sheetPalBox').classList.toggle('hidden', !sheets.length);
  sheets.forEach(s => {
    const b = document.createElement('button'); b.className = 'item'; b.dataset.sprite = 'sheet:' + s.id;
    const name = document.createElement('span'); name.className = 'ellip'; name.textContent = s.name;
    b.append(spriteIcon(s.sprite, 44), name);
    b.title = `${s.name} : ${(RACES[s.race] || {}).name} ${(CLASSES[s.cls] || {}).name} niv. ${s.level}`;
    b.onclick = () => setPending(pending === b.dataset.sprite ? null : b.dataset.sprite);
    pal.appendChild(b);
  });
}

function syncPlayUI() {
  const u = playSel;
  $('unitPanel').classList.toggle('hidden', !u);
  if (u) {
    $('unitHead').replaceChildren(spriteIcon(u.sprite, 56));
    if (document.activeElement !== $('unitName')) $('unitName').value = u.name;
    syncCombatPanel(u);
    const lvl = unitLevel(u);
    $('unitLvl').textContent = lvl > 0
      ? `${fmtLevel(lvl)} niveau${lvl > 1 ? 'x' : ''} (≈ ${fmtLevel(lvl * METERS_PER_LEVEL)} m)` : 'Au sol';
    // portées
    const st = unitStats(u), used = movementUsed(u), z = computeZones(u);
    const blocked = (u.conds || []).map(condOf).find(c => c && c.move0);
    $('unitMoveTxt').textContent = isKO(u) ? 'hors de combat' : blocked ? `bloqué (${blocked.name})`
      : isFinite(used) ? `${used} / ${st.deplacement} cases utilisées` : `⚠ hors de portée (${st.deplacement} cases)`;
    $('unitMoveTxt').classList.toggle('warn', !isFinite(used) || !!blocked || isKO(u));
    const bonus = STATS.rules.bonus_portee_hauteur;
    $('unitAtkTxt').textContent = (st.attaque <= 1 ? 'corps à corps (1 case)'
      : `${st.attaque} cases` + (bonus ? ` (+${fmtLevel(bonus)} par niveau au-dessus)` : '')) + ` · ${attackOf(u).name}`;
    $('unitAbil').textContent = [st.vol && 'Vol', st.nage && 'Nage', `Escalade ${fmtLevel(st.saut)} niv.`].filter(Boolean).join(' · ');
    if (document.activeElement !== $('unitMov')) $('unitMov').value = u.mov ?? st.deplacement;
    if (document.activeElement !== $('unitAtk')) $('unitAtk').value = st.attaque;
    $('btnAttack').disabled = isKO(u);
    // capacités et sorts
    const acts = $('uActions'); acts.replaceChildren();
    unitActions(u).forEach(k => {
      const A = ACTIONS[k], left = usesLeft(u, k);
      const b = document.createElement('button'); b.className = 'act-btn' + (actionMode && actionMode.k === k && actionMode.u === u ? ' on' : '');
      b.textContent = `${A.icon} ${A.name} (${left}/${A.uses})`; b.title = A.desc + ' — utilisations par combat';
      b.disabled = isKO(u) || left <= 0;
      b.onclick = () => actionMode && actionMode.k === k ? cancelAction() : useAction(u, k);
      acts.appendChild(b);
    });
    // comparaison avec le camp adverse
    const foes = map.units.filter(o => unitKind(o) !== unitKind(u));
    const rel = $('unitRel'); rel.replaceChildren();
    if (!foes.length) rel.innerHTML = '<p class="muted">Aucun adversaire sur la carte.</p>';
    foes.forEach(o => {
      const d = lvl - unitLevel(o), div = document.createElement('div');
      div.className = 'rel ' + (isKO(o) ? 'eq' : d >= 0.5 ? 'up' : d <= -0.5 ? 'down' : 'eq');
      div.textContent = isKO(o) ? `💀 ${o.name} (hors de combat)`
                      : (d >= 0.5 ? `▲ Domine ${o.name} (+${fmtLevel(d)})`
                      : d <= -0.5 ? `▼ Plus bas que ${o.name} (−${fmtLevel(-d)})`
                      : `= Même niveau que ${o.name}`) + (unitInZone(o, z) ? '  ⚔ à portée' : '');
      rel.appendChild(div);
    });
  }
  $('btnAttack').classList.toggle('on', attackMode);
  $('statsSrc').textContent = statsSource;
  syncGmTools(); updatePlayerBanner();
  document.querySelectorAll('[data-zone]').forEach(b => b.classList.toggle('on', b.dataset.zone === zoneMode));
  syncCombatUI();
}

$('unitName').addEventListener('focus', pushUndo);
$('unitName').addEventListener('input', e => { if (playSel) { playSel.name = e.target.value; changed(); syncPlayUI(); } });
$('btnUnitDel').onclick = () => { if (playSel) { pushUndo(); removeUnit(playSel); changed(); } };
$('btnClearUnits').onclick = () => {
  if (!map.units.length || !confirm('Retirer toutes les figurines de la carte ?')) return;
  pushUndo(); map.units = []; map.order = []; map.active = 0; map.turn = 0; playSel = null; syncPlayUI(); changed();
};
$('uSheet').onclick = () => { const u = playSel; if (u && u.sheetId) { setMode('chars'); openSheet(u.sheetId); } };

// ---------- Attaques ----------
function setAttackMode(on) {
  attackMode = on && !!playSel && !isKO(playSel);
  $('attackHint').classList.toggle('hidden', !attackMode);
  if (attackMode) $('attackHint').textContent = `⚔ ${playSel.name} : clique sur la cible à attaquer (Échap pour annuler)`;
  syncPlayUI(); redraw();
}
$('btnAttack').onclick = () => setAttackMode(!attackMode);
$('btnUnitBack').onclick = () => {
  const u = playSel; if (!u) return;
  pushUndo(); u.x = u.sx ?? u.x; u.y = u.sy ?? u.y; changed(); syncPlayUI();
};

// Déplacement / portée propres à cette figurine
[['unitMov', 'mov'], ['unitAtk', 'atk']].forEach(([id, prop]) => {
  $(id).addEventListener('focus', pushUndo);
  $(id).addEventListener('input', e => {
    const u = playSel; if (!u || e.target.value === '') return;
    u[prop] = Math.max(0, +e.target.value);
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
