// Opérations sur la carte : ajout, suppression, pinceau, annulation.

function makeObj(type, cx, cy) {
  const d = OBJECTS[type];
  return { id: 0, type, x: clamp(cx, 0, map.cols - d.w), y: clamp(cy, 0, map.rows - d.h),
           w: d.w, h: d.h, e: d.e, color: d.c, label: d.label || '' };
}

function addObj(type, cx, cy) {
  const o = makeObj(type, cx, cy);
  o.id = map.nextId++;
  map.objects.push(o);
  return o;
}
function hitObj(wx, wy) {
  const objs = sortedObjects().reverse();
  return objs.find(o => {
    const E = objE(o), lift = objLift(o);
    return wx >= o.x*T && wx <= (o.x + o.w)*T && wy >= o.y*T - E - lift && wy <= (o.y + o.h)*T - lift;
  }) || null;
}
function brushCells(cx, cy) {
  const out = [], off = Math.floor((brush - 1) / 2);
  for (let dy = 0; dy < brush; dy++) for (let dx = 0; dx < brush; dx++) {
    if (brushShape === 'circle' && Math.hypot(dx - (brush - 1) / 2, dy - (brush - 1) / 2) > brush / 2) continue;
    const x = cx - off + dx, y = cy - off + dy;
    if (x >= 0 && y >= 0 && x < map.cols && y < map.rows) out.push([x, y]);
  }
  return out;
}
function paintFloor(cx, cy) { brushCells(cx, cy).forEach(([x, y]) => map.floor[y*map.cols + x] = curFloor); }
function paintLevel(cx, cy, level) { brushCells(cx, cy).forEach(([x, y]) => setLevel(x, y, level)); }

// Relie les événements souris pour ne pas laisser de trous dans les traits rapides.
function strokeCells(x0, y0, x1, y1, paint) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (true) {
    if (inMap(x0, y0)) paint(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e = 2 * err;
    if (e > -dy) { err -= dy; x0 += sx; }
    if (e < dx) { err += dx; y0 += sy; }
  }
}

function rectBounds(x0, y0, x1, y1) {
  return { x0: clamp(Math.min(x0, x1), 0, map.cols - 1), y0: clamp(Math.min(y0, y1), 0, map.rows - 1),
           x1: clamp(Math.max(x0, x1), 0, map.cols - 1), y1: clamp(Math.max(y0, y1), 0, map.rows - 1) };
}
function paintRect(x0, y0, x1, y1) {
  const b = rectBounds(x0, y0, x1, y1);
  for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) map.floor[y * map.cols + x] = curFloor;
}

// Remplissage contigu (quatre voisins), sans récursion, y compris sur une carte 150 × 150.
function fillFloor(cx, cy) {
  if (!inMap(cx, cy)) return false;
  const old = map.floor[cy * map.cols + cx];
  if (old === curFloor) return false;
  pushUndo();
  const pending = [[cx, cy]];
  map.floor[cy * map.cols + cx] = curFloor;
  while (pending.length) {
    const [x, y] = pending.pop();
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (inMap(nx, ny) && map.floor[ny * map.cols + nx] === old) {
        map.floor[ny * map.cols + nx] = curFloor; pending.push([nx, ny]);
      }
    }
  }
  return true;
}
function removeObj(o) { map.objects = map.objects.filter(x => x !== o); if (sel === o) select(null); }

function pushUndo() {
  if (SIM) return;
  redoStack.length = 0;
  undoStack.push(JSON.stringify(map));
  if (undoStack.length > 80) undoStack.shift();
  syncHistoryUI();
}
function undo() {
  restoreHistory(undoStack, redoStack);
}
function redo() { restoreHistory(redoStack, undoStack); }
let restoringHistory = false;
function restoreHistory(from, to) {
  if (!from.length || SIM) return;
  to.push(JSON.stringify(map));
  map = JSON.parse(from.pop());
  drag = null; attackMode = false; actionMode = null;
  $('attackHint').classList.add('hidden');
  restoringHistory = true;
  try { select(null); playSel = null; syncMapUI(); syncPlayUI(); changed(); }
  finally { restoringHistory = false; syncHistoryUI(); syncMapModuleUI(); }
}
function syncHistoryUI() {
  $('btnUndo').disabled = !undoStack.length;
  $('btnRedo').disabled = !redoStack.length;
}
function changed() {
  invalidateZones();
  if (SIM) return;
  if (!restoringHistory && redoStack.length) { redoStack.length = 0; syncHistoryUI(); }
  if (PLAYER_VIEW) { redraw(); return; }
  if (map.fogOn && map.fogAuto !== false) revealAroundHeroes();
  redraw(); onMapChanged(); try { localStorage.setItem('jdr-map', JSON.stringify(map)); } catch (e) {} }
