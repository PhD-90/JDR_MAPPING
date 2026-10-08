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
    const x = cx - off + dx, y = cy - off + dy;
    if (x >= 0 && y >= 0 && x < map.cols && y < map.rows) out.push([x, y]);
  }
  return out;
}
function paintFloor(cx, cy) { brushCells(cx, cy).forEach(([x, y]) => map.floor[y*map.cols + x] = curFloor); }
function paintLevel(cx, cy, level) { brushCells(cx, cy).forEach(([x, y]) => setLevel(x, y, level)); }
function removeObj(o) { map.objects = map.objects.filter(x => x !== o); if (sel === o) select(null); }

function pushUndo() {
  if (SIM) return;
  undoStack.push(JSON.stringify(map));
  if (undoStack.length > 80) undoStack.shift();
}
function undo() {
  if (!undoStack.length) return;
  map = JSON.parse(undoStack.pop());
  select(null); playSel = null; syncMapUI(); syncPlayUI(); changed();
}
function changed() {
  invalidateZones();
  if (SIM) return;
  if (PLAYER_VIEW) { redraw(); return; }
  if (map.fogOn && map.fogAuto !== false) revealAroundHeroes();
  redraw(); onMapChanged(); try { localStorage.setItem('jdr-map', JSON.stringify(map)); } catch (e) {} }
