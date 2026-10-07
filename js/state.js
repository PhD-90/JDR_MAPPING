// État global de l'application (carte, caméra, mode, outil courant, sélection).

let map = newMap(20, 14);
let cam = { x:0, y:0, z:1 };
let mode = 'edit';                 // 'edit' = éditeur, 'play' = partie
let tool = 'object', curFloor = 'stone', curObj = 'wall', brush = 1;
let sel = null, hover = null;
let undoStack = [];
let drag = null, spaceDown = false;

function newMap(cols, rows) {
  return { cols, rows, floor:Array(cols*rows).fill('stone'), height:Array(cols*rows).fill(0),
           objects:[], units:[], turn:0, depth:0.5, grid:true, nextId:1 };
}
// Complète une carte enregistrée par une version précédente
function normalizeMap(m) {
  if (!m.height || m.height.length !== m.cols*m.rows) m.height = Array(m.cols*m.rows).fill(0);
  if (!m.units) m.units = [];
  if (m.turn === undefined) m.turn = 0;   // 0 = préparation, 1+ = tour de combat
  m.units.forEach(u => {
    if (u.sx === undefined) { u.sx = u.x; u.sy = u.y; }
    if (u.ox === undefined) { u.ox = u.sx; u.oy = u.sy; }   // position au début du combat
  });
  return m;
}

const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
let dpr = 1;

const objE = o => o.e * T * map.depth;
