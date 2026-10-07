// Relief du terrain : niveau de hauteur de chaque case, altitude des éléments et des unités.
// 1 niveau de terrain = 1 unité de hauteur d'élément (un mur fait 2, une caisse ~1).

const MAX_LEVEL = 8;
const METERS_PER_LEVEL = 1.5;
const LH = () => T * map.depth;   // hauteur d'un niveau à l'écran (unités monde)

const inMap = (cx, cy) => cx >= 0 && cy >= 0 && cx < map.cols && cy < map.rows;

function levelAt(x, y) { return inMap(x, y) ? map.height[y*map.cols + x] : 0; }
function setLevel(x, y, l) { if (inMap(x, y)) map.height[y*map.cols + x] = clamp(l, 0, MAX_LEVEL); }

function maxLevelUnder(x, y, w, h) {
  let m = 0;
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) m = Math.max(m, levelAt(i, j));
  return m;
}
const objLift = o => maxLevelUnder(o.x, o.y, o.w, o.h) * LH();

// Hauteur de la surface sur laquelle on se tient : terrain ou dessus d'un élément (caisse, mur, table...)
const NOT_STANDABLE = ['tree', 'token'];
function surfaceLevel(x, y) {
  let top = levelAt(x, y);
  for (const o of map.objects) {
    if (x < o.x || x >= o.x + o.w || y < o.y || y >= o.y + o.h) continue;
    if (NOT_STANDABLE.includes(OBJECTS[o.type].shape)) continue;
    top = Math.max(top, maxLevelUnder(o.x, o.y, o.w, o.h) + o.e);
  }
  return top;
}
function unitLevel(u) {
  let m = 0;
  for (let j = u.y; j < u.y + u.size; j++) for (let i = u.x; i < u.x + u.size; i++) m = Math.max(m, surfaceLevel(i, j));
  return m;
}
const fmtLevel = l => String(Math.round(l * 2) / 2).replace('.', ',');

// Case sous un point écran, en tenant compte des cases surélevées (la plus en avant gagne)
function cellAt(wx, wy) {
  const x = Math.floor(wx / T), lh = LH();
  if (x >= 0 && x < map.cols) {
    for (let y = map.rows - 1; y >= 0; y--) {
      const L = levelAt(x, y), below = y + 1 < map.rows ? levelAt(x, y + 1) : 0;
      const top = y*T - L*lh, bottom = (y + 1)*T - Math.min(L, below)*lh;  // dessus + falaise
      if (wy >= top && wy < bottom) return { cx: x, cy: y };
    }
  }
  return { cx: x, cy: Math.floor(wy / T) };
}
function toWorld(e) {
  const wx = (e.offsetX - cam.x) / cam.z, wy = (e.offsetY - cam.y) / cam.z;
  return { wx, wy, ...cellAt(wx, wy) };
}
