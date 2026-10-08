// Rendu de la carte : sols, éléments en semi-3D, sélection.

// ---------- Rendu du sol ----------
function drawFloor(c, x, y, f, lift = 0, L = 0) {
  const F = FLOORS[f] || FLOORS.void, r = hash(x, y), px = x*T, py = y*T - lift;
  c.fillStyle = shade(F.c, 0.92 + r*0.16 + L*0.04);
  c.fillRect(px, py, T + 0.5, T + 0.5);
  switch (F.deco) {
    case 'tiles':
      c.strokeStyle = 'rgba(0,0,0,.28)'; c.lineWidth = 2;
      c.strokeRect(px+3, py+3, T-6, T-6); break;
    case 'stone':
      c.fillStyle = 'rgba(0,0,0,.15)';
      for (let i = 0; i < 3; i++) c.fillRect(px + hash(x+i*7, y)*T*0.85, py + hash(x, y+i*5)*T*0.85, 4, 3);
      break;
    case 'grass':
      c.fillStyle = shade(F.c, 1.18);
      for (let i = 0; i < 5; i++) c.fillRect(px + hash(x+i*3, y+1)*T*0.9, py + hash(x+2, y+i*9)*T*0.85, 2, 5);
      break;
    case 'planks':
      c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 1;
      for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(px, py + i*T/4); c.lineTo(px+T, py + i*T/4); c.stroke(); }
      c.beginPath(); const o = (y % 2) * T/2 + T/4; c.moveTo(px+o, py); c.lineTo(px+o, py+T/4); c.stroke();
      break;
    case 'cobble':
      c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 2;
      c.beginPath();
      c.moveTo(px, py + T/2); c.lineTo(px + T, py + T/2);
      c.moveTo(px + T/2, py); c.lineTo(px + T/2, py + T/2);
      c.moveTo(px + T/4, py + T/2); c.lineTo(px + T/4, py + T);
      c.moveTo(px + 3*T/4, py + T/2); c.lineTo(px + 3*T/4, py + T);
      c.stroke(); break;
    case 'water':
      c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1.5;
      c.beginPath(); const wx = px + r*T*0.5 + 6, wy = py + hash(y, x)*T*0.6 + 10;
      c.arc(wx, wy, 6, Math.PI*1.1, Math.PI*1.9); c.stroke();
      break;
  }
}

// Falaise visible sous une case surélevée (face avant) et arêtes du plateau
function drawCliff(c, x, y, f, L) {
  if (L <= 0) return;
  const F = FLOORS[f] || FLOORS.void, lh = LH(), px = x*T, py = y*T - L*lh;
  const below = y + 1 < map.rows ? levelAt(x, y + 1) : 0;
  if (L > below) {
    const top = (y + 1)*T - L*lh;
    c.fillStyle = shade(F.c, 0.55); c.fillRect(px, top, T + 0.5, (L - below)*lh);
    c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 1;
    c.beginPath();
    for (let k = 1; k < L - below; k++) { c.moveTo(px, top + k*lh); c.lineTo(px + T, top + k*lh); }
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(px, top, T, 2);
  }
  c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 2;
  c.beginPath();
  if (levelAt(x - 1, y) < L) { c.moveTo(px + 1, py); c.lineTo(px + 1, py + T); }
  if (levelAt(x + 1, y) < L) { c.moveTo(px + T - 1, py); c.lineTo(px + T - 1, py + T); }
  if (levelAt(x, y - 1) < L) { c.moveTo(px, py + 1); c.lineTo(px + T, py + 1); }
  c.stroke();
}

// ---------- Rendu des éléments (semi-3D) ----------
// Projection "vue 3/4" : la face du dessus est décalée vers le haut de E, la face avant est visible.
function box(c, x, y, w, h, E, col) {
  c.fillStyle = shade(col, 0.6); c.fillRect(x, y + h - E, w, E);       // face avant
  c.fillStyle = col;             c.fillRect(x, y - E, w, h);           // dessus
  c.strokeStyle = shade(col, 0.4); c.lineWidth = 1;
  c.strokeRect(x + .5, y - E + .5, w - 1, h - 1);
  c.strokeRect(x + .5, y + h - E + .5, w - 1, E - 1);
}
function cylinder(c, cx, cy, r, E, col) {
  const ry = r * 0.6;
  const g = c.createLinearGradient(cx - r, 0, cx + r, 0);
  g.addColorStop(0, shade(col, .5)); g.addColorStop(.35, shade(col, .95)); g.addColorStop(1, shade(col, .45));
  c.fillStyle = g;
  c.beginPath(); c.moveTo(cx - r, cy - E); c.lineTo(cx - r, cy);
  c.ellipse(cx, cy, r, ry, 0, Math.PI, 0, true);
  c.lineTo(cx + r, cy - E); c.closePath(); c.fill();
  c.fillStyle = shade(col, 1.12);
  c.beginPath(); c.ellipse(cx, cy - E, r, ry, 0, 0, Math.PI*2); c.fill();
  c.strokeStyle = shade(col, .45); c.lineWidth = 1; c.stroke();
}
function shadowEllipse(c, cx, cy, rx, ry) {
  c.fillStyle = 'rgba(0,0,0,.3)';
  c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2); c.fill();
}

function drawShadow(c, o) {
  const x = o.x*T, y = o.y*T, w = o.w*T, h = o.h*T, E = objE(o), s = E * 0.35;
  const shape = OBJECTS[o.type].shape;
  if (['wall','house','crate','chest','table','stairs'].includes(shape)) {
    c.fillStyle = 'rgba(0,0,0,.25)';
    c.beginPath(); c.moveTo(x, y + h); c.lineTo(x + w, y + h); c.lineTo(x + w + s, y + h - s*0.3);
    c.lineTo(x + w + s, y - s*0.3); c.lineTo(x + w, y); c.closePath(); c.fill();
  } else {
    const cx = x + w/2, cy = y + h/2 + h*0.15;
    shadowEllipse(c, cx + s*0.5, cy, Math.min(w,h)*0.42 + s*0.3, Math.min(w,h)*0.25);
  }
}

function drawObj(c, o) {
  const d = OBJECTS[o.type], col = o.color;
  const x = o.x*T, y = o.y*T, w = o.w*T, h = o.h*T, E = objE(o);
  const cx = x + w/2, cy = y + h/2, m = Math.min(w, h);
  switch (d.shape) {
    case 'wall': {
      box(c, x, y, w, h, E, col);
      // briques sur la face avant
      c.strokeStyle = shade(col, 0.42); c.lineWidth = 1;
      const bh = T * 0.2;
      for (let yy = y + h - bh, i = 0; yy > y + h - E + 1; yy -= bh, i++) {
        c.beginPath(); c.moveTo(x, yy); c.lineTo(x + w, yy); c.stroke();
        for (let xx = x + (i % 2 ? T/4 : T/2); xx < x + w; xx += T/2) {
          c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx, Math.min(yy + bh, y + h)); c.stroke();
        }
      }
      break;
    }
    case 'house': {
      // façade crépie avec fenêtres et porte, toit de tuiles
      const fy = y + h - E;
      c.fillStyle = '#b9a684'; c.fillRect(x, fy, w, E);
      c.fillStyle = '#3a3f4a';
      if (E > T*0.5)
        for (let xx = x + T*0.3; xx + T*0.4 <= x + w; xx += T) c.fillRect(xx, fy + E*0.18, T*0.4, Math.min(E*0.28, T*0.35));
      const dh = Math.min(E*0.5, T*0.8);
      c.fillStyle = '#5a3a20'; c.fillRect(cx - T*0.2, y + h - dh, T*0.4, dh);
      c.fillStyle = col; c.fillRect(x, y - E, w, h);
      c.strokeStyle = shade(col, 0.72); c.lineWidth = 1;
      c.beginPath();
      for (let yy = y - E + T*0.25; yy < y + h - E; yy += T*0.25) { c.moveTo(x, yy); c.lineTo(x + w, yy); }
      c.stroke();
      c.strokeStyle = shade(col, 1.25); c.lineWidth = 3;
      c.beginPath();
      if (w >= h) { c.moveTo(x + 4, y - E + h/2); c.lineTo(x + w - 4, y - E + h/2); }
      else { c.moveTo(cx, y - E + 4); c.lineTo(cx, y - E + h - 4); }
      c.stroke();
      c.strokeStyle = shade(col, 0.4); c.lineWidth = 1;
      c.strokeRect(x + .5, y - E + .5, w - 1, h - 1); c.strokeRect(x + .5, fy + .5, w - 1, E - 1);
      break;
    }
    case 'crate': {
      const p = T*0.08;
      box(c, x + p, y + p, w - 2*p, h - 2*p, E, col);
      c.strokeStyle = shade(col, 0.45); c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x + p, y + p - E); c.lineTo(x + w - p, y + h - p - E);
      c.moveTo(x + w - p, y + p - E); c.lineTo(x + p, y + h - p - E);
      c.stroke();
      break;
    }
    case 'chest': {
      const px = w*0.12, py = h*0.2, bw = w - 2*px, bh = h*0.62;
      box(c, x + px, y + py, bw, bh, E, col);
      c.fillStyle = shade(col, 0.4);
      c.fillRect(x + px, y + py + bh - E, bw, 3);
      c.fillStyle = '#e8c547';
      c.fillRect(cx - 4, y + py + bh - E + 4, 8, 9);
      c.fillRect(x + px, y + py - E + bh*0.45, bw, 3);
      break;
    }
    case 'table': {
      const th = T*0.12, lw = 5;
      c.fillStyle = shade(col, 0.45);
      [x + 4, x + w - 4 - lw].forEach(lx => {
        c.fillRect(lx, y + 6 - E + th, lw, E - th);      // pieds arrière
        c.fillRect(lx, y + h - E + th, lw, E - th - 2);  // pieds avant
      });
      c.fillStyle = shade(col, 0.6); c.fillRect(x, y + h - E, w, th);
      c.fillStyle = col; c.fillRect(x, y - E, w, h);
      c.strokeStyle = shade(col, 0.4); c.strokeRect(x + .5, y - E + .5, w - 1, h - 1);
      break;
    }
    case 'stairs': {
      const n = Math.max(2, Math.round(o.h * 3));
      const sh = h / n;
      for (let i = 0; i < n; i++) {
        const se = E * (n - i) / n;  // marches hautes à l'arrière
        box(c, x, y + i*sh, w, sh, se, col);
      }
      break;
    }
    case 'rock': {
      const r = m * 0.42, seed = o.id * 13;
      const blob = (oy, scale, fill) => {
        c.fillStyle = fill; c.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * Math.PI * 2, rr = r * scale * (0.8 + hash(seed, i) * 0.35);
          const px = cx + Math.cos(a) * rr * (o.w / Math.min(o.w, o.h)), py = cy + oy + Math.sin(a) * rr * 0.75 * (o.h / Math.min(o.w, o.h));
          i ? c.lineTo(px, py) : c.moveTo(px, py);
        }
        c.closePath(); c.fill(); c.strokeStyle = shade(col, 0.4); c.stroke();
      };
      blob(-E * 0.35, 1, shade(col, 0.6));
      blob(-E * 0.75, 0.85, col);
      blob(-E, 0.5, shade(col, 1.15));
      break;
    }
    case 'tree': {
      cylinder(c, cx, cy + h*0.1, m*0.09, E*0.55, '#6b4a2b');
      const top = cy - E*0.75, r = m*0.36;
      const lobes = [[-.45,.25,.75],[.45,.25,.75],[0,.35,.8],[-.3,-.25,.75],[.3,-.25,.75],[0,-.05,.95]];
      lobes.forEach(([dx, dy, s], i) => {
        c.fillStyle = shade(col, 0.75 + i*0.07);
        c.beginPath(); c.arc(cx + dx*r, top + dy*r, r*s, 0, Math.PI*2); c.fill();
      });
      c.fillStyle = shade(col, 1.25);
      c.beginPath(); c.arc(cx - r*0.25, top - r*0.3, r*0.3, 0, Math.PI*2); c.fill();
      break;
    }
    case 'pillar': {
      const r = m*0.3;
      box(c, cx - r*1.3, cy - r*1.0, r*2.6, r*2.0, E*0.08, shade(col, 0.9));
      cylinder(c, cx, cy, r, E, col);
      c.fillStyle = shade(col, 1.05);
      c.beginPath(); c.ellipse(cx, cy - E, r*1.25, r*0.75, 0, 0, Math.PI*2); c.fill();
      c.strokeStyle = shade(col, 0.5); c.stroke();
      break;
    }
    case 'barrel': {
      const r = m*0.36;
      cylinder(c, cx, cy + h*0.05, r, E, col);
      c.strokeStyle = shade(col, 0.35); c.lineWidth = 2;
      [0.25, 0.75].forEach(t => {
        c.beginPath(); c.ellipse(cx, cy + h*0.05 - E*t, r, r*0.6, 0, 0, Math.PI); c.stroke();
      });
      c.beginPath(); c.ellipse(cx, cy + h*0.05 - E, r*0.75, r*0.45, 0, 0, Math.PI*2); c.stroke();
      break;
    }
    case 'token': {
      const r = m*0.4;
      cylinder(c, cx, cy, r, E, shade(col, 0.55));
      c.fillStyle = col;
      c.beginPath(); c.ellipse(cx, cy - E, r, r*0.6, 0, 0, Math.PI*2); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.stroke();
      const txt = (o.label || '').slice(0, 3);
      if (txt) {
        c.fillStyle = '#fff'; c.font = `bold ${Math.round(r*0.7)}px system-ui`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(txt, cx, cy - E + 1);
      }
      break;
    }
  }
  // nom au-dessus (hors pions)
  if (o.label && d.shape !== 'token') {
    c.font = 'bold 11px system-ui'; c.textAlign = 'center'; c.textBaseline = 'bottom';
    const tw = c.measureText(o.label).width + 8;
    c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(cx - tw/2, y - E - 18, tw, 15);
    c.fillStyle = '#fff'; c.fillText(o.label, cx, y - E - 4);
  }
}

function sortedObjects() {
  return [...map.objects].sort((a, b) => (a.y + a.h) - (b.y + b.h) || a.x - b.x);
}

function fullyFogged(x0, y0, w, h) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (inMap(x, y) && map.fog[y * map.cols + x]) return false;
  return true;
}

// Dessine dans un repère décalé vers le haut (élément posé sur du relief)
function lifted(c, lift, fn) {
  if (!lift) return fn();
  c.save(); c.translate(0, -lift); fn(); c.restore();
}

let curZones = [];   // zones de portée affichées pendant ce rendu (lues par drawUnit)

function renderMap(c, ui) {
  const { cols, rows } = map, lh = LH(), edit = ui && mode === 'edit';
  // éléments et unités rangés par ligne du bas : on dessine rangée par rangée, de l'arrière vers l'avant
  const rowObjs = Array.from({ length: rows }, () => []);
  const rowUnits = Array.from({ length: rows }, () => []);
  sortedObjects().forEach(o => rowObjs[clamp(o.y + o.h - 1, 0, rows - 1)].push(o));
  map.units.forEach(u => rowUnits[clamp(u.y + u.size - 1, 0, rows - 1)].push(u));
  const zones = ui ? zonesToDraw() : [];
  curZones = zones;
  const brushSet = edit && hover && (tool === 'floor' || tool === 'relief')
    ? new Set(brushCells(hover.cx, hover.cy).map(([x, y]) => y*cols + x)) : null;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y*cols + x, L = map.height[i], top = y*T - L*lh;
      drawFloor(c, x, y, map.floor[i], L*lh, L);
      if (map.grid) { c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = ui ? 1 / cam.z : 1; c.strokeRect(x*T, top, T, T); }
      drawCliff(c, x, y, map.floor[i], L);
      if (zones.length) drawZoneCell(c, zones, i, x, top);
      if (brushSet && brushSet.has(i)) { c.fillStyle = 'rgba(224,165,43,.3)'; c.fillRect(x*T, top, T, T); }
      if (edit && tool === 'relief' && L > 0) {
        c.fillStyle = 'rgba(0,0,0,.6)'; c.font = 'bold 14px system-ui';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(L, x*T + T/2, top + T/2);
      }
    }
    // vue des joueurs : rien de ce qui est dans le brouillard ou caché n'est dessiné
    const hideFog = ui && playerSight() && map.fogOn;
    rowObjs[y].forEach(o => {
      if (hideFog && fullyFogged(o.x, o.y, o.w, o.h)) return;
      lifted(c, objLift(o), () => { drawShadow(c, o); drawObj(c, o); });
    });
    rowUnits[y].sort((a, b) => a.x - b.x).forEach(u => {
      if (ui && playerSight() && (u.hidden || (map.fogOn && fullyFogged(u.x, u.y, u.size, u.size)))) return;
      drawUnit(c, u, ui);
    });
  }

  if (!ui) return;
  if (mode === 'play') { drawFog(c); drawMarks(c); drawAnimEffects(c); if (!PLAYER_VIEW) drawPlayOverlay(c); return; }

  // fantôme de placement
  if (hover && tool === 'object' && !drag) {
    const g = makeObj(curObj, hover.cx, hover.cy);
    c.globalAlpha = 0.5; lifted(c, objLift(g), () => drawObj(c, g)); c.globalAlpha = 1;
  }

  // sélection
  if (sel) {
    const E = objE(sel), x = sel.x*T, y = sel.y*T - objLift(sel), w = sel.w*T, h = sel.h*T;
    c.setLineDash([6/cam.z, 4/cam.z]); c.strokeStyle = '#e0a52b'; c.lineWidth = 2/cam.z;
    c.strokeRect(x, y, w, h);
    if (E > 0) c.strokeRect(x, y - E, w, h);
    c.setLineDash([]);
    const hs = 10 / cam.z;
    c.fillStyle = '#e0a52b'; c.fillRect(x + w - hs/2, y + h - hs/2, hs, hs);
  }
}

function draw() {
  if (SIM) return;   // pendant une simulation, la carte affichée n'est pas celle du MJ
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#16181d'; ctx.fillRect(0, 0, cv.width, cv.height);
  const sh = screenShake();   // tremblement lors des attaques puissantes
  ctx.setTransform(cam.z*dpr, 0, 0, cam.z*dpr, (cam.x + sh.x)*dpr, (cam.y + sh.y)*dpr);
  ctx.imageSmoothingEnabled = false;
  renderMap(ctx, true);
}
let raf = 0;
function redraw() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); }
