// Outils du MJ sur la carte de combat :
// - brouillard de guerre (pinceau, révélation automatique autour des personnages avec ligne de vue)
// - marqueurs secrets (pièges, trésors, passages...) visibles uniquement par le MJ
// - figurines cachées aux joueurs (embuscades)
// - écran des joueurs : seconde fenêtre (index.html?joueurs) synchronisée en direct, sans les informations du MJ

const PLAYER_VIEW = new URLSearchParams(location.search).has('joueurs');
let previewPlayers = false;            // le MJ regarde la carte comme les joueurs
const playerSight = () => PLAYER_VIEW || previewPlayers;

let fogTool = null;                    // 'reveal' | 'hide' | null
let markTool = null;                   // type de marqueur à poser
const MARKS = {
  piege:  { name: 'Piège',           icon: '⚠️' },
  tresor: { name: 'Trésor',          icon: '💰' },
  secret: { name: 'Passage secret',  icon: '🚪' },
  indice: { name: 'Indice',          icon: '🔍' },
  danger: { name: 'Danger',          icon: '☠️' },
  note:   { name: 'Note',            icon: '📝' },
};

// ---------- Brouillard ----------
const fogged = i => map.fogOn && !map.fog[i];
function ensureFog() { if (!map.fog || map.fog.length !== map.cols * map.rows) map.fog = Array(map.cols * map.rows).fill(0); }
function paintFog(cx, cy, val) {
  ensureFog();
  const r = Math.floor((+$('fogBrush').value - 1) / 2) + 0;
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (inMap(x, y)) map.fog[y * map.cols + x] = val;
}
// Ligne de vue : rien d'infranchissable (mur, maison, arbre...) entre les deux cases
function lineOfSight(x0, y0, x1, y1, block) {
  let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy, x = x0, y = y0;
  while (!(x === x1 && y === y1)) {
    if (!(x === x0 && y === y0) && block[y * map.cols + x]) return false;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return true;
}
// Révèle ce que voient les personnages (rayon de vision, ligne de vue)
function revealAroundHeroes() {
  if (!map.fogOn) return;
  ensureFog();
  const { block } = terrainGrids();
  const R = clamp(+map.fogRadius || 6, 1, 30);
  map.units.filter(u => unitKind(u) === 'hero' && !isKO(u)).forEach(u => {
    const ox = u.x + Math.floor(u.size / 2), oy = u.y + Math.floor(u.size / 2);
    for (let y = oy - R; y <= oy + R; y++) for (let x = ox - R; x <= ox + R; x++) {
      if (!inMap(x, y) || Math.hypot(x - ox, y - oy) > R + 0.3) continue;
      if (lineOfSight(ox, oy, x, y, block)) map.fog[y * map.cols + x] = 1;
    }
  });
}

// Brouillard dessiné par-dessus la carte (opaque pour les joueurs, voilé pour le MJ)
function drawFog(c) {
  if (!map.fogOn) return;
  ensureFog();
  const lh = LH(), opaque = playerSight();
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) {
    const i = y * map.cols + x; if (map.fog[i]) continue;
    const L = map.height[i], top = y * T - L * lh, below = y + 1 < map.rows ? levelAt(x, y + 1) : 0;
    const hgt = T + Math.max(0, L - below) * lh;
    if (opaque) { c.fillStyle = '#07080b'; c.fillRect(x * T - 0.5, top - 0.5, T + 1, hgt + 1); }
    else {
      c.fillStyle = 'rgba(8,10,20,.55)'; c.fillRect(x * T, top, T, hgt);
      c.strokeStyle = 'rgba(160,170,220,.18)'; c.lineWidth = 1; c.beginPath();
      for (let k = -T; k < T; k += 12) { c.moveTo(x * T + Math.max(0, k), top + Math.max(0, -k)); c.lineTo(x * T + Math.min(T, k + T), top + Math.min(T, T - k)); }
      c.stroke();
    }
  }
}

// ---------- Marqueurs du MJ ----------
function hitMark(cx, cy) { return (map.marks || []).find(m => m.x === cx && m.y === cy) || null; }
function drawMarks(c) {
  if (playerSight() || !map.marks) return;
  const lh = LH();
  map.marks.forEach(m => {
    const top = m.y * T - levelAt(m.x, m.y) * lh, cx = m.x * T + T / 2;
    c.fillStyle = 'rgba(120,60,200,.28)'; c.strokeStyle = 'rgba(190,140,255,.9)'; c.lineWidth = 2; c.setLineDash([4, 3]);
    c.fillRect(m.x * T + 3, top + 3, T - 6, T - 6); c.strokeRect(m.x * T + 3, top + 3, T - 6, T - 6); c.setLineDash([]);
    c.font = '22px "Segoe UI Emoji", system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText((MARKS[m.type] || MARKS.note).icon, cx, top + T / 2);
    if (m.text) {
      const near = hover && hover.cx === m.x && hover.cy === m.y;
      const txt = near ? m.text : (m.text.length > 16 ? m.text.slice(0, 15) + '…' : m.text);
      c.font = 'bold 11px system-ui'; c.textBaseline = 'top';
      const w = c.measureText(txt).width + 8;
      c.fillStyle = 'rgba(60,20,110,.92)'; c.fillRect(cx - w / 2, top + T - 4, w, 15);
      c.fillStyle = '#fff'; c.fillText(txt, cx, top + T - 2);
    }
  });
}
function renderMarkList() {
  const el = $('markList'); el.replaceChildren();
  (map.marks || []).forEach(m => {
    const row = document.createElement('div'); row.className = 'mark-row';
    const sel = document.createElement('select');
    Object.entries(MARKS).forEach(([k, v]) => sel.append(Object.assign(document.createElement('option'), { value: k, textContent: v.icon, selected: k === m.type, title: v.name })));
    sel.onchange = () => { pushUndo(); m.type = sel.value; changed(); };
    const inp = Object.assign(document.createElement('input'), { type: 'text', value: m.text || '', placeholder: (MARKS[m.type] || MARKS.note).name });
    inp.addEventListener('focus', pushUndo);
    inp.addEventListener('input', () => { m.text = inp.value; changed(); });
    const del = Object.assign(document.createElement('button'), { className: 'mini', textContent: '✖', title: 'Supprimer' });
    del.onclick = () => { pushUndo(); map.marks = map.marks.filter(x => x !== m); changed(); renderMarkList(); };
    row.append(sel, inp, del); el.appendChild(row);
  });
  if (!map.marks || !map.marks.length) el.innerHTML = '<p class="muted">Aucun marqueur. Choisis un type puis clique sur la carte.</p>';
}

// ---------- Outils (souris en mode Jouer) ----------
function setFogTool(t) {
  fogTool = t; if (t) { markTool = null; setPending(null); }
  syncGmTools(); redraw();
}
function setMarkTool(t) {
  markTool = t; if (t) { fogTool = null; setPending(null); }
  syncGmTools(); redraw();
}
// Clic sur la carte quand un outil du MJ est actif ; renvoie true si le clic est utilisé
function gmMouseDown(e, p) {
  if (fogTool && (e.button === 0 || e.button === 2) && inMap(p.cx, p.cy)) {
    pushUndo(); const val = (fogTool === 'reveal') === (e.button === 0) ? 1 : 0;
    paintFog(p.cx, p.cy, val); drag = { mode: 'fog', val }; changed(); return true;
  }
  if (markTool && inMap(p.cx, p.cy)) {
    const m = hitMark(p.cx, p.cy);
    if (e.button === 2) { if (m) { pushUndo(); map.marks = map.marks.filter(x => x !== m); changed(); renderMarkList(); } return true; }
    if (e.button !== 0) return true;
    if (!m) { pushUndo(); (map.marks ||= []).push({ id: map.nextId++, type: markTool, x: p.cx, y: p.cy, text: '' }); changed(); renderMarkList(); }
    setTimeout(() => { const inputs = $('markList').querySelectorAll('input'); const idx = map.marks.indexOf(m || map.marks[map.marks.length - 1]); inputs[idx]?.focus(); }, 0);
    return true;
  }
  return false;
}
function gmMouseMove(p) {
  if (drag && drag.mode === 'fog' && inMap(p.cx, p.cy)) { paintFog(p.cx, p.cy, drag.val); changed(); return true; }
  return false;
}

function syncGmTools() {
  if (PLAYER_VIEW) return;
  $('fogOn').checked = !!map.fogOn; $('fogAuto').checked = map.fogAuto !== false;
  $('fogRadius').value = map.fogRadius || 6; $('previewPlayers').checked = previewPlayers;
  $('fogTools').classList.toggle('hidden', !map.fogOn);
  document.querySelectorAll('[data-fog]').forEach(b => b.classList.toggle('on', b.dataset.fog === fogTool));
  document.querySelectorAll('[data-mark]').forEach(b => b.classList.toggle('on', b.dataset.mark === markTool));
  if (playSel) $('uHidden').checked = !!playSel.hidden;
  renderMarkList();
}

// ---------- Boutons ----------
if (!PLAYER_VIEW) {
  $('fogOn').onchange = e => { pushUndo(); map.fogOn = e.target.checked; ensureFog(); if (map.fogOn && map.fogAuto !== false) revealAroundHeroes(); if (!map.fogOn) setFogTool(null); changed(); syncGmTools(); };
  $('fogAuto').onchange = e => { map.fogAuto = e.target.checked; changed(); };
  $('fogRadius').addEventListener('input', e => { map.fogRadius = clamp(+e.target.value || 6, 1, 30); changed(); });
  document.querySelectorAll('[data-fog]').forEach(b => b.onclick = () => setFogTool(fogTool === b.dataset.fog ? null : b.dataset.fog));
  $('fogAll').onclick = () => { pushUndo(); ensureFog(); map.fog.fill(1); changed(); };
  $('fogNone').onclick = () => { pushUndo(); ensureFog(); map.fog.fill(0); changed(); };
  $('fogHeroes').onclick = () => { pushUndo(); revealAroundHeroes(); changed(); };
  $('previewPlayers').onchange = e => { previewPlayers = e.target.checked; redraw(); };
  const markPal = $('markPal');
  Object.entries(MARKS).forEach(([k, v]) => {
    const b = Object.assign(document.createElement('button'), { textContent: v.icon, title: v.name });
    b.dataset.mark = k; b.onclick = () => setMarkTool(markTool === k ? null : k);
    markPal.appendChild(b);
  });
  $('uHidden').onchange = e => { if (!playSel) return; pushUndo(); playSel.hidden = e.target.checked; changed(); syncPlayUI(); };
  $('btnPlayers').onclick = () => {
    const w = window.open(location.pathname + '?joueurs', 'jdr-joueurs', 'width=1280,height=800');
    if (!w) alert('La fenêtre a été bloquée par le navigateur : autorise les fenêtres pop-up pour cette page.');
  };
}

// ---------- Synchronisation avec l'écran des joueurs ----------
// La fenêtre du MJ publie la carte (sauvegarde automatique) et les événements (attaques, dégâts) via le stockage local
function broadcast(ev) {
  if (PLAYER_VIEW) return;
  try { localStorage.setItem('jdr-event', JSON.stringify({ ...ev, at: Date.now() + Math.random() })); } catch (e) {}
}
function initPlayerView() {
  document.body.classList.add('player-view');
  document.title = 'Écran des joueurs — Map JDR';
  const byId = id => map.units.find(u => u.id === id);
  window.addEventListener('storage', e => {
    if (e.key === 'jdr-map' && e.newValue) {
      const ids = anims.map(a => [a.a.id, a.t.id]), popIds = pops.map(p => p.u.id);
      map = normalizeMap(JSON.parse(e.newValue));
      anims.forEach((a, k) => { a.a = byId(ids[k][0]) || a.a; a.t = byId(ids[k][1]) || a.t; });
      pops.forEach((p, k) => { p.u = byId(popIds[k]) || p.u; });
      invalidateZones(); syncPlayUI(); redraw();
    }
    if (e.key === 'jdr-event' && e.newValue) {
      const ev = JSON.parse(e.newValue);
      if (ev.type === 'attack') { const a = byId(ev.a), t = byId(ev.t); if (a && t && !t.hidden) startAttack(a, t, ev.res, ev.st || null); }
      if (ev.type === 'area') startAreaFx(ev.fx);
      if (ev.type === 'sfx') playSfx(ev.kind);
      if (ev.type === 'pop') { const u = byId(ev.u); if (u && !u.hidden) popText(u, ev.text, ev.color, ev.size); }
      if (ev.type === 'fit') fit();
    }
  });
  window.addEventListener('keydown', e => { if (e.key.toLowerCase() === 'f') fit(); });
}
// Bandeau de l'écran des joueurs : lieu, round, figurine dont c'est le tour
function updatePlayerBanner() {
  const el = $('playerBanner'); if (!el) return;
  const loc = map.locId && world ? (world.locations.find(l => l.id === map.locId) || {}).name : '';
  const act = activeUnit();
  el.textContent = [loc, map.turn > 0 ? `Round ${map.turn}` : 'Préparation', act && !act.hidden && !(map.fogOn && fullyFogged(act.x, act.y, act.size, act.size)) ? `Tour de ${act.name}` : ''].filter(Boolean).join('  ·  ');
}
