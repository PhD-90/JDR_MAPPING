// Portées des figurines : déplacement (vert) et attaque (rouge), selon les règles de data/caracteristiques.txt.
// Le déplacement part de la position en début de tour (u.sx, u.sy).

let zoneMode = 'sel';                  // 'sel' = figurine sélectionnée/survolée, 'all' = toutes, 'none'
let zoneCache = new Map(), gridCache = null;

function invalidateZones() { zoneCache.clear(); gridCache = null; }

// Hauteur de surface de chaque case, et coût imposé par les éléments posés dessus
// (section [terrain] du fichier : « arbre = x », « mur = x »...) ; recalculés après chaque changement
function terrainGrids() {
  if (gridCache) return gridCache;
  const { cols } = map, surf = Float32Array.from(map.height), objCost = new Float32Array(map.cols * map.rows).fill(1);
  for (const o of map.objects) {
    const shape = OBJECTS[o.type].shape, top = maxLevelUnder(o.x, o.y, o.w, o.h) + o.e;
    const cost = STATS.terrain[norm(OBJECTS[o.type].name)] ?? 1;
    for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) {
      if (!inMap(x, y)) continue;
      const k = y*cols + x;
      objCost[k] = Math.max(objCost[k], cost);
      if (!NOT_STANDABLE.includes(shape)) surf[k] = Math.max(surf[k], top);
    }
  }
  const block = Uint8Array.from(objCost, c => isFinite(c) ? 0 : 1);   // cases qui bloquent la vue
  return gridCache = { surf, objCost, block };
}

// Peut-on attaquer la case (tx, ty) depuis (x, y), à la hauteur L ? Portée (bonus en hauteur), hauteur au corps à corps,
// ligne de vue pour les attaques à distance (murs, maisons, arbres, colonnes la bloquent)
function hitContext(u) {
  const R = STATS.rules, { surf, block } = terrainGrids();
  return { R, s: u.size, atk: unitStats(u).attaque, surf, block: R.ligne_de_vue !== false ? block : null };
}
function canHitCell(g, x, y, L, tx, ty) {
  const { R, s, atk, surf, block } = g, ranged = atk > 1;
  const ddx = Math.max(0, x - tx, tx - (x + s - 1)), ddy = Math.max(0, y - ty, ty - (y + s - 1));
  const d = R.attaque_diagonale ? Math.max(ddx, ddy) : ddx + ddy;
  if (d === 0) return false;
  const dl = L - surf[ty * map.cols + tx];
  let range = atk;
  if (ranged) range += Math.max(0, Math.floor(dl * (R.bonus_portee_hauteur || 0) + 1e-6));
  else if (Math.abs(dl) > R.melee_hauteur_max + 1e-6) return false;
  if (d > range) return false;
  if (ranged && block && !lineOfSight(x + (s >> 1), y + (s >> 1), tx, ty, block)) return false;
  return true;
}
// La cible est-elle attaquable depuis la position actuelle ?
function canHitNow(a, t) {
  const g = hitContext(a), L = unitLevel(a);
  for (let y = t.y; y < t.y + t.size; y++) for (let x = t.x; x < t.x + t.size; x++)
    if (inMap(x, y) && canHitCell(g, a.x, a.y, L, x, y)) return true;
  return false;
}

const DIRS4 = [[1,0],[-1,0],[0,1],[0,-1]];
const DIRS8 = [...DIRS4, [1,1],[1,-1],[-1,1],[-1,-1]];

// Zone de déplacement seule (plus rapide : IA, simulation)
const computeMove = u => computeZones(u, true);

function computeZones(u, moveOnly = false) {
  if (!moveOnly && zoneCache.has(u.id)) return zoneCache.get(u.id);
  const { cols, rows } = map, N = cols * rows, s = u.size, st = unitStats(u), R = STATS.rules;
  const { surf, objCost } = terrainGrids();

  // cases occupées par les autres figurines : 1 = allié (traversable), 2 = ennemi (bloquant)
  const kind = unitKind(u), occ = new Uint8Array(N);
  map.units.forEach(o => {
    if (o === u || isKO(o)) return;   // une figurine KO ne bloque pas le passage
    const v = unitKind(o) === kind ? 1 : 2;
    for (let y = o.y; y < o.y + o.size; y++) for (let x = o.x; x < o.x + o.size; x++)
      if (inMap(x, y)) occ[y*cols + x] = Math.max(occ[y*cols + x], v);
  });

  // la figurine peut-elle se trouver en (x, y) ? renvoie coût d'entrée, hauteur, présence d'un allié
  const node = (x, y) => {
    if (x < 0 || y < 0 || x + s > cols || y + s > rows) return null;
    let cost = 1, lvl = 0, ally = false;
    for (let j = y; j < y + s; j++) for (let i = x; i < x + s; i++) {
      const k = j*cols + i;
      if (occ[k] === 2) return null;
      if (occ[k] === 1) ally = true;
      lvl = Math.max(lvl, surf[k]);
      if (!st.vol) cost = Math.max(cost, floorCost(map.floor[k], st), objCost[k]);
    }
    return isFinite(cost) ? { cost, lvl, ally } : null;
  };

  // plus courts chemins (coûts entiers -> file par paliers)
  const sx = clamp(u.sx ?? u.x, 0, cols - s), sy = clamp(u.sy ?? u.y, 0, rows - s);
  const dist = new Float32Array(N).fill(Infinity), lvlOf = new Float32Array(N);
  let startLvl = 0;
  for (let j = sy; j < sy + s; j++) for (let i = sx; i < sx + s; i++) startLvl = Math.max(startLvl, surf[j*cols + i]);
  dist[sy*cols + sx] = 0; lvlOf[sy*cols + sx] = startLvl;
  const buckets = [[[sx, sy]]], dirs = R.deplacement_diagonal ? DIRS8 : DIRS4;
  for (let d = 0; d < buckets.length; d++) {
    for (const [x, y] of buckets[d] || []) {
      const i = y*cols + x;
      if (dist[i] !== d) continue;
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy, n = node(nx, ny);
        if (!n) continue;
        if (dx && dy && !node(x + dx, y) && !node(x, y + dy)) continue;   // pas de passage entre deux obstacles
        const up = n.lvl - lvlOf[i];
        if (!st.vol && up > st.saut + 1e-6) continue;                       // trop haut à escalader
        // coût de la case + changement de hauteur (monter et descendre coûtent chacun par niveau)
        const step = st.vol ? 1 : n.cost + Math.ceil(Math.max(0, up) - 1e-6) * R.cout_montee
                                        + Math.ceil(Math.max(0, -up) - 1e-6) * R.cout_descente;
        const nd = d + step, j = ny*cols + nx;
        if (nd > st.deplacement || nd >= dist[j]) continue;
        dist[j] = nd; lvlOf[j] = n.lvl;
        (buckets[nd] ||= []).push([nx, ny]);
      }
    }
  }

  // cases d'arrivée possibles (pas sur un allié) -> zone verte
  const move = new Uint8Array(N), attack = new Uint8Array(N), ends = [];
  for (let y = 0; y <= rows - s; y++) for (let x = 0; x <= cols - s; x++) {
    const i = y*cols + x;
    if (!isFinite(dist[i])) continue;
    if (!(x === sx && y === sy)) { const n = node(x, y); if (!n || n.ally) continue; }
    ends.push([x, y, lvlOf[i]]);
    for (let j = y; j < y + s; j++) for (let k = x; k < x + s; k++) move[j*cols + k] = 1;
  }

  if (moveOnly) return { dist, move, attack: null, sx, sy, ends };

  // zone d'attaque depuis chaque case d'arrivée (portée, hauteur, ligne de vue)
  const atk = st.attaque, ranged = atk > 1, bonus = ranged ? (R.bonus_portee_hauteur || 0) : 0;
  const reach = atk + Math.ceil(MAX_LEVEL * 2 * bonus), hg = hitContext(u);
  for (const [x, y, L] of ends) {
    for (let ty = Math.max(0, y - reach); ty <= Math.min(rows - 1, y + s - 1 + reach); ty++)
      for (let tx = Math.max(0, x - reach); tx <= Math.min(cols - 1, x + s - 1 + reach); tx++) {
        const k = ty*cols + tx;
        if (!attack[k] && canHitCell(hg, x, y, L, tx, ty)) attack[k] = 1;
      }
  }

  const z = { dist, move, attack, sx, sy, ends };
  zoneCache.set(u.id, z);
  return z;
}

// Cases dépensées pour arriver à la position actuelle (Infinity = hors de portée)
function movementUsed(u) { return computeZones(u).dist[u.y*map.cols + u.x]; }

function unitInZone(target, z) {
  for (let y = target.y; y < target.y + target.size; y++)
    for (let x = target.x; x < target.x + target.size; x++)
      if (inMap(x, y) && z.attack[y*map.cols + x]) return true;
  return false;
}

// Zones à afficher pour ce rendu : [{ u, z, strong }]
function zonesToDraw() {
  if (mode !== 'play' || zoneMode === 'none' || !STATS || playerSight()) return [];
  if (zoneMode === 'all')
    return map.units.map(u => ({ u, z: computeZones(u), strong: u === playSel }));
  const u = playSel || (hover && !drag ? hitUnit(hover.wx, hover.wy) : null);
  return u ? [{ u, z: computeZones(u), strong: true }] : [];
}

// Couleur d'une case (dessinée sur la face du dessus, relief compris)
function drawZoneCell(c, zones, i, x, top) {
  for (const { z, strong } of zones) {
    if (z.move[i]) c.fillStyle = strong ? 'rgba(60,220,100,.34)' : 'rgba(60,220,100,.13)';
    else if (z.attack[i]) c.fillStyle = strong ? 'rgba(255,70,70,.30)' : 'rgba(255,70,70,.11)';
    else continue;
    c.fillRect(x*T, top, T, T);
    if (!strong) continue;
    // contour de la zone
    const set = z.move[i] ? z.move : z.attack, cols = map.cols, y = (i - x) / cols;
    const same = (nx, ny) => nx >= 0 && ny >= 0 && nx < cols && ny < map.rows &&
                            (z.move[i] ? set[ny*cols + nx] : set[ny*cols + nx] && !z.move[ny*cols + nx]);
    c.strokeStyle = z.move[i] ? 'rgba(80,255,120,.9)' : 'rgba(255,90,90,.9)'; c.lineWidth = 2;
    c.beginPath();
    if (!same(x - 1, y)) { c.moveTo(x*T + 1, top); c.lineTo(x*T + 1, top + T); }
    if (!same(x + 1, y)) { c.moveTo(x*T + T - 1, top); c.lineTo(x*T + T - 1, top + T); }
    if (!same(x, y - 1)) { c.moveTo(x*T, top + 1); c.lineTo(x*T + T, top + 1); }
    if (!same(x, y + 1)) { c.moveTo(x*T, top + T - 1); c.lineTo(x*T + T, top + T - 1); }
    c.stroke();
  }
}
