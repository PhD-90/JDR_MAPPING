// Presets de carte générés procéduralement (forêt, grotte, donjon...).

function genCtx() {
  const W = map.cols, H = map.rows, seed = (Math.random() * 1e6) | 0, R = mulberry32(seed);
  const occ = new Uint8Array(W * H);
  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const g = {
    W, H, R, inside,
    ri: (a, b) => a + Math.floor(R() * (b - a + 1)),
    n: (x, y, s, k = 0) => (vnoise(x, y, s, seed + k) + 0.5 * vnoise(x, y, s / 2, seed + k + 99)) / 1.5,
    vary: (hex, amt = 0.25) => shade(hex, 1 + (R() - 0.5) * amt),
    set: (x, y, f) => { if (inside(x, y)) map.floor[y*W + x] = f; },
    get: (x, y) => inside(x, y) ? map.floor[y*W + x] : null,
    setH: (x, y, l) => { if (inside(x, y)) map.height[y*W + x] = l; },
    fill: f => map.floor.fill(f),
    each: fn => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) fn(x, y); },
    reserve: (x, y) => { if (inside(x, y)) occ[y*W + x] = 1; },
    free(x, y, w = 1, h = 1) {
      if (x < 0 || y < 0 || x + w > W || y + h > H) return false;
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (occ[j*W + i]) return false;
      return true;
    },
    add(type, x, y, o = {}) {
      const d = OBJECTS[type], w = o.w || d.w, h = o.h || d.h;
      if (!g.free(x, y, w, h)) return null;
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) occ[j*W + i] = 1;
      const ob = { id: map.nextId++, type, x, y, w, h, e: o.e ?? d.e, color: o.color || d.c, label: o.label ?? (d.label || '') };
      map.objects.push(ob); return ob;
    },
    // tache organique de sol
    blob(cx, cy, r, f, k = 5) {
      for (let y = Math.floor(cy - r*1.5); y <= cy + r*1.5; y++)
        for (let x = Math.floor(cx - r*1.5); x <= cx + r*1.5; x++)
          if (Math.hypot(x - cx, y - cy) < r * (0.7 + 0.6 * g.n(x, y, 3, k))) g.set(x, y, f);
    },
    // chemin sinueux d'un bord à l'autre ; renvoie les cases
    path(f, width = 2, horizontal = R() < 0.5) {
      const cells = [], len = horizontal ? W : H, span = horizontal ? H : W;
      let p = g.ri(Math.floor(span/3), Math.floor(span*2/3));
      for (let i = 0; i < len; i++) {
        if (R() < 0.35) p = clamp(p + (R() < 0.5 ? -1 : 1), 1, span - width - 1);
        for (let k = 0; k < width; k++) {
          const [x, y] = horizontal ? [i, p + k] : [p + k, i];
          g.set(x, y, f); g.reserve(x, y); cells.push([x, y]);
        }
      }
      return cells;
    },
    neighbors8(x, y, test) {
      let c = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
        if ((dx || dy) && test(x + dx, y + dy)) c++;
      return c;
    },
  };
  return g;
}

// Ajoute des arbres là où le bruit est fort, sur les sols autorisés
function scatterTrees(g, floors, color, density = 0.5, thresh = 0.55) {
  g.each((x, y) => {
    if (!floors.includes(g.get(x, y)) || g.n(x, y, 5, 3) < thresh || g.R() > density) return;
    if (g.R() < 0.1 && floors.includes(g.get(x + 1, y + 1)))
      g.add('tree', x, y, { w: 2, h: 2, e: 3 + g.R(), color: g.vary(color) });
    else g.add('tree', x, y, { e: 1.8 + g.R() * 0.9, color: g.vary(color) });
  });
}
// Collines : relève les cases libres là où le bruit est fort (1 ou 2 niveaux)
function hills(g, floors, k = 11, thresh = 0.62) {
  g.each((x, y) => {
    if (!floors.includes(g.get(x, y)) || !g.free(x, y)) return;
    const n = g.n(x, y, 7, k);
    if (n > thresh) g.setH(x, y, n > thresh + 0.12 ? 2 : 1);
  });
}
function scatter(g, type, floors, prob, opts = () => ({})) {
  g.each((x, y) => { if (floors.includes(g.get(x, y)) && g.R() < prob) g.add(type, x, y, opts()); });
}

const PRESETS = {
  forest: { name:'Forêt', icon:'🌲', gen(g, deco) {
    g.fill('grass');
    g.each((x, y) => { if (g.n(x, y, 6, 1) < 0.28) g.set(x, y, 'dirt'); });
    if (g.R() < 0.7) g.blob(g.ri(3, g.W - 4), g.ri(3, g.H - 4), g.ri(2, 3), 'water');
    g.path('dirt', 2);
    g.each((x, y) => { if (g.get(x, y) === 'water') g.reserve(x, y); });
    hills(g, ['grass', 'dirt']);
    if (!deco) return;
    scatterTrees(g, ['grass'], '#3f7a35', 0.6, 0.5);
    scatter(g, 'rock', ['grass', 'dirt'], 0.025, () => ({ color: g.vary('#7a766f'), e: 0.6 + g.R() * 0.6 }));
  }},
  cave: { name:'Grotte', icon:'🕳️', gen(g, deco) {
    caveLayout(g, 'cave', '#55504a');
    g.each((x, y) => {
      if (g.get(x, y) !== 'cave') return;
      if (g.n(x, y, 5, 2) > 0.7) g.set(x, y, 'water');
      else if (g.n(x, y, 4, 4) < 0.3) g.set(x, y, 'dirt');
    });
    g.each((x, y) => { if (g.get(x, y) === 'water') g.reserve(x, y); });
    hills(g, ['cave', 'dirt'], 13, 0.6);
    if (!deco) return;
    scatter(g, 'rock', ['cave', 'dirt'], 0.04, () => ({ color: g.vary('#66605a'), e: 0.5 + g.R() * 0.7 }));
    scatter(g, 'chest', ['cave'], 0.006);
  }},
  dungeon: { name:'Donjon', icon:'🏰', gen(g, deco) {
    g.fill('void');
    const rooms = [];
    for (let t = 0; t < 80; t++) {
      const w = g.ri(4, 8), h = g.ri(4, 7);
      if (w > g.W - 2 || h > g.H - 2) continue;
      const r = { x: g.ri(1, g.W - w - 1), y: g.ri(1, g.H - h - 1), w, h };
      if (rooms.some(o => r.x < o.x + o.w + 2 && r.x + r.w + 2 > o.x && r.y < o.y + o.h + 2 && r.y + r.h + 2 > o.y)) continue;
      rooms.push(r);
    }
    if (!rooms.length) rooms.push({ x: 1, y: 1, w: g.W - 2, h: g.H - 2 });
    rooms.forEach(r => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) g.set(x, y, 'tiles'); });
    rooms.sort((a, b) => a.x - b.x);
    const ctr = r => [Math.floor(r.x + r.w/2), Math.floor(r.y + r.h/2)];
    const carve = (x, y) => { if (g.get(x, y) === 'void') g.set(x, y, 'stone'); };
    for (let i = 1; i < rooms.length; i++) {
      const [x1, y1] = ctr(rooms[i - 1]), [x2, y2] = ctr(rooms[i]);
      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) carve(x, y1);
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) carve(x2, y);
    }
    // murs autour de tout ce qui est creusé
    g.each((x, y) => {
      if (g.get(x, y) === 'void' && g.neighbors8(x, y, (a, b) => { const f = g.get(a, b); return f && f !== 'void'; }))
        g.add('wall', x, y, { color: g.vary('#6e6a72', 0.12) });
    });
    // estrade surélevée au fond d'une grande salle
    const big = rooms.find(r => r.w >= 6 && r.h >= 5);
    if (big) for (let y = big.y; y < big.y + 2; y++) for (let x = big.x + 1; x < big.x + big.w - 1; x++) g.setH(x, y, 1);
    if (!deco) return;
    rooms.forEach(r => {
      if (r.w >= 6 && r.h >= 5 && g.R() < 0.6)
        [[r.x + 1, r.y + 1], [r.x + r.w - 2, r.y + 1], [r.x + 1, r.y + r.h - 2], [r.x + r.w - 2, r.y + r.h - 2]]
          .forEach(([x, y]) => g.add('pillar', x, y, { color: '#a9a49a' }));
      if (g.R() < 0.4) g.add('chest', g.ri(r.x, r.x + r.w - 1), r.y);
      for (let k = g.ri(0, 3); k > 0; k--) g.add(g.R() < 0.5 ? 'barrel' : 'crate', g.R() < 0.5 ? r.x : r.x + r.w - 1, g.ri(r.y, r.y + r.h - 1));
    });
  }},
  city: { name:'Ville', icon:'🏘️', gen(g, deco) {
    g.fill('cobble');
    const roofs = ['#8e3b2f', '#7a4a32', '#5f6a7a', '#9a6a3a', '#6d4a5a', '#4f6a4a'];
    const bw = g.ri(5, 7), bh = g.ri(4, 6);
    for (let by = 1; by < g.H - 2; by += bh + 2) for (let bx = 1; bx < g.W - 2; bx += bw + 2) {
      const w = Math.min(bw, g.W - 1 - bx), h = Math.min(bh, g.H - 1 - by);
      if (w < 2 || h < 2) continue;
      if (g.R() < 0.18) {
        // place avec fontaine
        for (let y = by; y < by + h; y++) for (let x = bx; x < bx + w; x++) g.set(x, y, 'grass');
        const fx = bx + Math.floor(w/2) - 1, fy = by + Math.floor(h/2) - 1;
        for (let y = fy; y < fy + 2; y++) for (let x = fx; x < fx + 2; x++) { g.set(x, y, 'water'); g.reserve(x, y); }
        if (deco) [[bx, by], [bx + w - 1, by], [bx, by + h - 1], [bx + w - 1, by + h - 1]]
          .forEach(([x, y]) => g.add('tree', x, y, { color: g.vary('#3f7a35'), e: 2 }));
        continue;
      }
      // 1 ou 2 maisons par pâté
      const split = w >= 5 && g.R() < 0.6 ? g.ri(2, w - 2) : w;
      [[bx, split], [bx + split, w - split]].forEach(([x, ww]) => {
        if (ww < 2) return;
        for (let y = by; y < by + h; y++) for (let i = x; i < x + ww; i++) g.set(i, y, 'tiles');
        g.add('house', x, by, { w: ww, h, e: 2 + g.R() * 1.2, color: roofs[g.ri(0, roofs.length - 1)] });
      });
    }
    if (!deco) return;
    g.each((x, y) => {
      if (g.get(x, y) !== 'cobble' || g.R() > 0.05) return;
      if (g.neighbors8(x, y, (a, b) => g.get(a, b) === 'tiles'))
        g.add(['barrel', 'crate', 'barrel'][g.ri(0, 2)], x, y);
    });
  }},
  tavern: { name:'Taverne', icon:'🍺', gen(g, deco) {
    g.fill('wood');
    const { W, H } = g, door = Math.floor(W/2) - 1, wc = '#7a6a5a';
    g.add('wall', 0, 0, { w: W, h: 1, color: wc });
    g.add('wall', 0, 1, { w: 1, h: H - 2, color: wc });
    g.add('wall', W - 1, 1, { w: 1, h: H - 2, color: wc });
    g.add('wall', 0, H - 1, { w: door, h: 1, color: wc });
    g.add('wall', door + 2, H - 1, { w: W - door - 2, h: 1, color: wc });
    g.set(door, H - 1, 'tiles'); g.set(door + 1, H - 1, 'tiles');
    // cheminée
    g.set(W - 4, 1, 'lava'); g.set(W - 3, 1, 'lava'); g.reserve(W - 4, 1); g.reserve(W - 3, 1);
    if (!deco) return;
    const barLen = Math.min(6, W - 8);
    if (barLen >= 2) g.add('table', 2, 3, { w: barLen, h: 1, e: 1.1, color: '#5e3a1e', label: 'Comptoir' });
    for (let x = 1; x < Math.min(1 + barLen + 1, W - 5); x++) g.add('barrel', x, 1);
    for (let y = 6; y < H - 2; y += 3) for (let x = 2; x < W - 3; x += 4)
      if (g.R() < 0.8) g.add('table', x, y, { w: 2, h: 1 });
    g.add('crate', W - 2, H - 2); g.add('crate', W - 2, H - 3);
  }},
  plain: { name:'Plaine', icon:'🌾', gen(g, deco) {
    g.fill('grass');
    g.each((x, y) => { if (g.n(x, y, 7, 1) < 0.22) g.set(x, y, 'dirt'); });
    g.path('dirt', 2);
    hills(g, ['grass', 'dirt'], 11, 0.58);
    if (!deco) return;
    scatterTrees(g, ['grass'], '#4a8a3a', 0.25, 0.7);
    scatter(g, 'rock', ['grass'], 0.02, () => ({ color: g.vary('#7a766f'), e: 0.5 + g.R() * 0.6 }));
  }},
  desert: { name:'Désert', icon:'🏜️', gen(g, deco) {
    g.fill('sand');
    g.each((x, y) => { if (g.n(x, y, 6, 1) < 0.25) g.set(x, y, 'dirt'); });
    const oasis = g.R() < 0.8 ? [g.ri(3, g.W - 4), g.ri(3, g.H - 4)] : null;
    if (oasis) { g.blob(oasis[0], oasis[1], 3.5, 'grass', 7); g.blob(oasis[0], oasis[1], 2, 'water'); }
    g.each((x, y) => { if (g.get(x, y) === 'water') g.reserve(x, y); });
    hills(g, ['sand', 'dirt']);
    if (!deco) return;
    if (oasis) scatterTrees(g, ['grass'], '#6a9a2f', 0.7, 0);
    scatter(g, 'rock', ['sand', 'dirt'], 0.03, () => ({ color: g.vary('#a07a50'), e: 0.5 + g.R() * 1.2 }));
  }},
  snow: { name:'Neige', icon:'❄️', gen(g, deco) {
    g.fill('snow');
    g.each((x, y) => { if (g.n(x, y, 6, 1) < 0.25) g.set(x, y, 'stone'); });
    if (g.R() < 0.7) g.blob(g.ri(3, g.W - 4), g.ri(3, g.H - 4), g.ri(2, 4), 'ice');
    g.each((x, y) => { if (g.get(x, y) === 'ice') g.reserve(x, y); });
    hills(g, ['snow', 'stone']);
    if (!deco) return;
    scatterTrees(g, ['snow'], '#2f5a3a', 0.5, 0.55);
    scatter(g, 'rock', ['snow', 'stone'], 0.03, () => ({ color: g.vary('#8a8f96'), e: 0.6 + g.R() * 0.8 }));
  }},
  swamp: { name:'Marais', icon:'🐸', gen(g, deco) {
    g.fill('mud');
    g.each((x, y) => {
      const n = g.n(x, y, 4, 1);
      if (n > 0.6) { g.set(x, y, 'water'); g.reserve(x, y); }
      else if (n < 0.4) g.set(x, y, 'grass');
    });
    if (!deco) return;
    scatterTrees(g, ['grass', 'mud'], '#4a5a2a', 0.35, 0.45);
    scatter(g, 'rock', ['mud'], 0.02, () => ({ color: g.vary('#5a5548'), e: 0.4 + g.R() * 0.4 }));
  }},
  volcano: { name:'Volcan', icon:'🌋', gen(g, deco) {
    g.fill('cave');
    g.path('lava', g.ri(2, 3));
    g.each((x, y) => { if (g.n(x, y, 5, 2) > 0.72) { g.set(x, y, 'lava'); g.reserve(x, y); } });
    hills(g, ['cave'], 11, 0.55);
    if (!deco) return;
    scatter(g, 'rock', ['cave'], 0.07, () => ({ color: g.vary('#3e3632'), e: 0.6 + g.R() * 1.4 }));
  }},
};

// Grotte par automate cellulaire : garde la plus grande zone ouverte, entoure de rochers
function caveLayout(g, floor, rockColor) {
  const { W, H } = g;
  let s = new Uint8Array(W * H);
  g.each((x, y) => { s[y*W + x] = (x === 0 || y === 0 || x === W - 1 || y === H - 1 || g.R() < 0.45) ? 1 : 0; });
  const wallAt = (a, x, y) => !g.inside(x, y) || a[y*W + x] === 1;
  for (let it = 0; it < 4; it++) {
    const n = new Uint8Array(W * H);
    g.each((x, y) => {
      const c = g.neighbors8(x, y, (a, b) => wallAt(s, a, b));
      n[y*W + x] = c > 4 ? 1 : c < 4 ? 0 : s[y*W + x];
    });
    s = n;
  }
  // plus grande région connexe
  const lab = new Int32Array(W * H).fill(-1); let best = -1, bestSize = 0, id = 0;
  g.each((x, y) => {
    if (s[y*W + x] || lab[y*W + x] >= 0) return;
    const st = [[x, y]]; lab[y*W + x] = id; let size = 0;
    while (st.length) {
      const [a, b] = st.pop(); size++;
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx, dy]) => {
        const nx = a + dx, ny = b + dy;
        if (g.inside(nx, ny) && !s[ny*W + nx] && lab[ny*W + nx] < 0) { lab[ny*W + nx] = id; st.push([nx, ny]); }
      });
    }
    if (size > bestSize) { bestSize = size; best = id; }
    id++;
  });
  g.each((x, y) => {
    const open = !s[y*W + x] && lab[y*W + x] === best;
    g.set(x, y, open ? floor : 'void');
  });
  g.each((x, y) => {
    if (g.get(x, y) === 'void' && g.neighbors8(x, y, (a, b) => g.get(a, b) === floor))
      g.add('rock', x, y, { color: g.vary(rockColor, 0.2), e: 1.4 + g.R() * 0.9 });
  });
}

function applyPreset(key) {
  pushUndo();
  map.objects = [];
  map.height.fill(0);
  const g = genCtx();
  PRESETS[key].gen(g, $('presetDeco').checked);
  select(null); changed();
}
