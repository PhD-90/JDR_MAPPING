// Panneaux de l'interface : sélection, palettes, réglages de carte.

// ---------- Sélection ----------
function select(o) { sel = o; syncSelUI(); redraw(); }
function syncSelUI() {
  $('selPanel').classList.toggle('hidden', !sel);
  if (!sel) return;
  $('selType').textContent = OBJECTS[sel.type].name;
  $('selLabel').value = sel.label; $('selW').value = sel.w; $('selH').value = sel.h;
  $('selE').value = sel.e; $('selColor').value = sel.color;
}
function rotate() {
  if (!sel) return; pushUndo();
  [sel.w, sel.h] = [sel.h, sel.w];
  sel.x = clamp(sel.x, 0, map.cols - sel.w); sel.y = clamp(sel.y, 0, map.rows - sel.h);
  changed(); syncSelUI();
}
function duplicate() {
  if (!sel) return; pushUndo();
  const o = { ...sel, id: map.nextId++ };
  o.x = clamp(o.x + 1, 0, map.cols - o.w); o.y = clamp(o.y + 1, 0, map.rows - o.h);
  map.objects.push(o); select(o); changed();
}
['selLabel','selW','selH','selE','selColor'].forEach(id => {
  $(id).addEventListener('focus', pushUndo);
  $(id).addEventListener('input', () => {
    if (!sel) return;
    sel.label = $('selLabel').value;
    sel.w = clamp(+$('selW').value || 1, 1, map.cols - sel.x);
    sel.h = clamp(+$('selH').value || 1, 1, map.rows - sel.y);
    sel.e = +$('selE').value;
    sel.color = $('selColor').value;
    changed();
  });
});
$('btnRot').onclick = rotate;
$('btnDup').onclick = duplicate;
$('btnDel').onclick = () => { if (sel) { pushUndo(); removeObj(sel); changed(); } };

// ---------- Palettes ----------
function setTool(t) {
  tool = t;
  document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  redraw();
}
document.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => setTool(b.dataset.tool));
$('brush').oninput = e => brush = +e.target.value;

function buildPalettes() {
  const fp = $('floorPal');
  Object.entries(FLOORS).forEach(([k, f]) => {
    const b = document.createElement('button'); b.className = 'item'; b.dataset.floor = k;
    b.innerHTML = `<div class="sw" style="background:${f.c}"></div>${f.name}`;
    b.onclick = () => { curFloor = k; setTool('floor'); markPal(); };
    fp.appendChild(b);
  });
  const op = $('objPal');
  Object.entries(OBJECTS).forEach(([k, d]) => {
    const b = document.createElement('button'); b.className = 'item'; b.dataset.obj = k;
    const ic = document.createElement('canvas'); ic.width = 88; ic.height = 88;
    const c = ic.getContext('2d');
    const o = { id: 1, type: k, x: 0, y: 0, w: d.w, h: d.h, e: d.e, color: d.c, label: d.label || '' };
    const span = Math.max(d.w, d.h), s = 88 / ((span + 1.2) * T);
    c.scale(s, s); c.translate((span*T - d.w*T)/2 + 0.6*T, (span*T - d.h*T)/2 + 1.0*T);
    drawObj(c, o);
    b.appendChild(ic); b.append(d.name);
    b.onclick = () => { curObj = k; setTool('object'); markPal(); };
    op.appendChild(b);
  });
  markPal();
}
function markPal() {
  document.querySelectorAll('[data-floor]').forEach(b => b.classList.toggle('on', b.dataset.floor === curFloor));
  document.querySelectorAll('[data-obj]').forEach(b => b.classList.toggle('on', b.dataset.obj === curObj));
}

// ---------- Carte ----------
function syncMapUI() {
  $('mapCols').value = map.cols; $('mapRows').value = map.rows;
  $('depth').value = $('depthPlay').value = map.depth;
  $('showGrid').checked = $('gridPlay').checked = map.grid;
}
$('btnResize').onclick = () => {
  const c = clamp(+$('mapCols').value || 2, 2, 150), r = clamp(+$('mapRows').value || 2, 2, 150);
  pushUndo();
  const nf = Array(c*r).fill(curFloor);
  for (let y = 0; y < Math.min(r, map.rows); y++)
    for (let x = 0; x < Math.min(c, map.cols); x++) nf[y*c + x] = map.floor[y*map.cols + x];
  const nh = Array(c*r).fill(0);
  for (let y = 0; y < Math.min(r, map.rows); y++)
    for (let x = 0; x < Math.min(c, map.cols); x++) nh[y*c + x] = map.height[y*map.cols + x];
  map.cols = c; map.rows = r; map.floor = nf; map.height = nh;
  map.objects = map.objects.filter(o => o.x + o.w <= c && o.y + o.h <= r);
  map.units = map.units.filter(u => u.x + u.size <= c && u.y + u.size <= r);
  if (sel && !map.objects.includes(sel)) select(null);
  syncMapUI(); fit(); changed();
};
$('depth').oninput = e => { map.depth = +e.target.value; changed(); };
$('showGrid').onchange = e => { map.grid = e.target.checked; changed(); };
$('btnFlat').onclick = () => { pushUndo(); map.height.fill(0); changed(); };
$('btnFill').onclick = () => { pushUndo(); map.floor.fill(curFloor); changed(); };
$('btnFit').onclick = () => fit();

function fit() {
  const W = cv.clientWidth, H = cv.clientHeight, mw = map.cols*T, mh = map.rows*T + T;
  cam.z = clamp(Math.min((W - 40) / mw, (H - 60) / mh), 0.2, 2);
  cam.x = (W - mw*cam.z) / 2; cam.y = (H - mh*cam.z) / 2 + T*cam.z;
  redraw();
}

// ---------- Boutons des presets ----------
Object.entries(PRESETS).forEach(([k, p]) => {
  const b = document.createElement('button'); b.className = 'item';
  b.innerHTML = `<span style="font-size:22px">${p.icon}</span>${p.name}`;
  b.onclick = () => applyPreset(k);
  $('presetPal').appendChild(b);
});
