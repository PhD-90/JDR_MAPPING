// Onglet « Monde » : carte du monde générée, royaumes et lieux, position des personnages,
// voyages (distance et durée selon le terrain), calendrier, journal de voyage,
// carte de combat liée à chaque lieu et sauvegarde complète de la campagne.

const WCELL = 4;                 // taille d'une case du monde en pixels (zoom 1)
const KM_PER_DAY_SEA = 120;      // traversée en bateau

let world = null, WT = null;     // données sauvegardées / terrain recalculé (cache)
let wcam = { x: 0, y: 0, z: 1 }, wsel = { loc: null, ids: new Set() }, whover = null, wdrag = null, wanim = null;
let wAddType = null;
const wcv = $('wcv'), wctx = wcv.getContext('2d');

// ---------- Création / chargement ----------
function newWorld(seed = (Math.random() * 1e6) | 0, style = 'nemai') {
  if(style==='nemai'){world=nemaiWorld();WT=null;buildWorldCache();return world;}
  const w = { v: 1, seed, style, W: 360, H: 240, scale: 8, day: 1, name: '', locations: [], regions: [], pos: {}, journal: [],
              opts: { regions: true, rivers: true, symbols: true, labels: true, parchment: true } };
  const t = genTerrain(w), p = genPlaces(w, t);
  Object.assign(w, { name: p.name, locations: p.locations, regions: p.regions });
  WT = null; world = w; buildWorldCache(t);
  return w;
}
// Au démarrage on lit seulement les données ; le terrain est calculé à la première ouverture de l'onglet
function loadWorld() {
  try { const raw = localStorage.getItem('jdr-world'); if (raw) { world = JSON.parse(raw); world.opts ||= {}; world.quests=normalizeQuests(world.quests); } } catch (e) {}
}
let worldSaveTimer = 0, quotaWarned = false;
function saveWorld(now = false) {
  clearTimeout(worldSaveTimer);
  const go = () => {
    try { localStorage.setItem('jdr-world', JSON.stringify(world)); }
    catch (e) { if (!quotaWarned) { quotaWarned = true; alert('Stockage du navigateur plein : exporte la campagne (onglet Monde) pour ne rien perdre.'); } }
  };
  if (now) go(); else worldSaveTimer = setTimeout(go, 300);
}

// Recalcule terrain, images et éléments de décor
function buildWorldCache(t = null) {
  if(isNemai()){world.W=NEMAI.W;world.H=NEMAI.H;}
  t ||= isNemai()?nemaiTerrain():genTerrain(world);
  const { W, H } = t, N = W * H;
  const region = assignRegions(t, world.regions);
  // image du terrain avec ombrage du relief
  const img = document.createElement('canvas'); img.width = W; img.height = H;
  const g = img.getContext('2d'), id = g.createImageData(W, H), px = id.data;
  const rgb = BIOMES.map(b => [1, 3, 5].map(k => parseInt(b.c.slice(k, k + 2), 16)));
  const paper = [222, 205, 165], sea = [170, 190, 190];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, b = t.biome[i];
    let [r, gg, bb] = rgb[b], f = 1;
    if (t.water[i]) {
      if (t.water[i] === 1) {   // dégradé de profondeur
        const d = clamp(-t.h[i], 0, 1), sh = rgb[BI.shallow], dp = rgb[BI.deep];
        [r, gg, bb] = sh.map((v, k) => v + (dp[k] - v) * Math.pow(d, 0.7));
      }
      const nearLand = [i - 1, i + 1, i - W, i + W].some(j => j >= 0 && j < N && !t.water[j]);
      if (nearLand) f = 1.18;
    } else {
      const x0 = Math.max(0, x - 1), y0 = Math.max(0, y - 1), x1 = Math.min(W - 1, x + 1), y1 = Math.min(H - 1, y + 1);
      f = clamp(1 + (t.e[y0 * W + x0] - t.e[y1 * W + x1]) * 9, 0.72, 1.3) * (1 + t.h[i] * 0.1);
      if ([i - 1, i + 1, i - W, i + W].some(j => j >= 0 && j < N && t.water[j] === 1)) f *= 0.78;   // trait de côte
    }
    if (world.opts.parchment) {
      const base = t.water[i] ? sea : paper, k = t.water[i] ? 0.75 : 0.6;
      r = r + (base[0] - r) * k; gg = gg + (base[1] - gg) * k; bb = bb + (base[2] - bb) * k;
    }
    px[i * 4] = clamp(r * f, 0, 255); px[i * 4 + 1] = clamp(gg * f, 0, 255); px[i * 4 + 2] = clamp(bb * f, 0, 255); px[i * 4 + 3] = 255;
  }
  g.putImageData(id, 0, 0);

  // teinte et frontières des royaumes
  const tint = document.createElement('canvas'); tint.width = W; tint.height = H;
  const tg = tint.getContext('2d'), td = tg.createImageData(W, H);
  const hsl = world.regions.map(r => hslToRgb(r.hue / 360, 0.65, 0.5));
  const borders = new Path2D(), counts = world.regions.map(() => ({ n: 0, x: 0, y: 0 }));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, r = region[i]; if (r < 0) continue;
    const c = hsl[r]; td.data.set([c[0], c[1], c[2], 60], i * 4);
    counts[r].n++; counts[r].x += x; counts[r].y += y;
    if (x < W - 1 && region[i + 1] >= 0 && region[i + 1] !== r) { borders.moveTo((x + 1) * WCELL, y * WCELL); borders.lineTo((x + 1) * WCELL, (y + 1) * WCELL); }
    if (y < H - 1 && region[i + W] >= 0 && region[i + W] !== r) { borders.moveTo(x * WCELL, (y + 1) * WCELL); borders.lineTo((x + 1) * WCELL, (y + 1) * WCELL); }
  }
  tg.putImageData(td, 0, 0);
  const labels = counts.map((c, r) => c.n ? { r, x: c.x / c.n + 0.5, y: c.y / c.n + 0.5, n: c.n } : null).filter(Boolean);

  // symboles : montagnes, collines, arbres (grille irrégulière)
  const symbols = [];
  const jit = (a, b, k) => (hash(a * 7 + k, b * 13 + world.seed % 9973) - 0.5);
  for (let gy = 2; gy < H - 2; gy += 4) for (let gx = 2; gx < W - 2; gx += 4) {
    const x = gx + jit(gx, gy, 1) * 3, y = gy + jit(gx, gy, 2) * 3, i = Math.floor(y) * W + Math.floor(x), b = t.biome[i];
    if ((b === BI.mountain || b === BI.peak) && hash(gx + 1, gy + 2) < 0.8) symbols.push({ t: b === BI.peak ? 'P' : 'M', x, y, s: 2.6 + t.h[i] * 3 });
    else if (b === BI.hills && hash(gx, gy) < 0.55) symbols.push({ t: 'H', x, y, s: 2.4 });
  }
  for (let gy = 1; gy < H - 1; gy += 3) for (let gx = 1; gx < W - 1; gx += 3) {
    const x = gx + jit(gx, gy, 3) * 2.4, y = gy + jit(gx, gy, 4) * 2.4, i = Math.floor(y) * W + Math.floor(x), b = t.biome[i];
    if ([BI.forest, BI.rainforest, BI.jungle].includes(b) && hash(gx + 5, gy) < 0.75) symbols.push({ t: 'T', x, y, s: b === BI.forest ? 1.5 : 1.8, dark: b !== BI.forest });
    else if (b === BI.taiga && hash(gx + 3, gy) < 0.7) symbols.push({ t: 'C', x, y, s: 1.6 });
    else if (b === BI.swamp && hash(gx, gy + 3) < 0.4) symbols.push({ t: 'S', x, y, s: 1.4 });
  }
  symbols.sort((a, b) => a.y - b.y);

  // tracés des rivières (avec un léger tremblé naturel)
  const rivers = t.rivers.map(path => path.map(i => {
    const x = i % W, y = (i - x) / W;
    return { x: (x + 0.5 + (hash(x, y) - 0.5) * 0.6) * WCELL, y: (y + 0.5 + (hash(y, x) - 0.5) * 0.6) * WCELL, f: t.flow[i] };
  }));
  WT = { t, region, img, tint, borders, labels, symbols, rivers };
}
function hslToRgb(h, s, l) {
  const f = n => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))); };
  return [f(0), f(8), f(4)];
}

// ---------- Requêtes sur le terrain ----------
const wIdx = (x, y) => clamp(Math.floor(y), 0, WT.t.H - 1) * WT.t.W + clamp(Math.floor(x), 0, WT.t.W - 1);
const biomeAt = (x, y) => BIOMES[WT.t.biome[wIdx(x, y)]];
const regionAt = (x, y) => world.regions[WT.region[wIdx(x, y)]] || null;
function nearestLoc(x, y) {
  let best = null, bd = 1e9;
  for (const l of world.locations) { const d = Math.hypot(l.x - x, l.y - y); if (d < bd) { bd = d; best = l; } }
  return best ? { loc: best, d: bd } : null;
}
function placeName(x, y) {
  const n = nearestLoc(x, y);
  if (n && n.d < 2.5) return n.loc.name;
  return n ? `près de ${n.loc.name} (${Math.round(n.d * world.scale)} km)` : 'en pleine nature';
}
function tempLabel(t) { return t < 0.2 ? 'glacial' : t < 0.4 ? 'froid' : t < 0.62 ? 'tempéré' : t < 0.8 ? 'chaud' : 'torride'; }

// Voyage en ligne droite : distance, durée selon le terrain traversé, traversée en mer
function travelInfo(a, b) {
  const cells = Math.hypot(b.x - a.x, b.y - a.y), steps = Math.max(1, Math.ceil(cells));
  let land = 0, sea = 0, mult = 0; const seen = {};
  for (let k = 0; k < steps; k++) {
    const x = a.x + (b.x - a.x) * (k + 0.5) / steps, y = a.y + (b.y - a.y) * (k + 0.5) / steps, i = wIdx(x, y);
    if (WT.t.water[i]) sea++;
    else { land++; const bi = BIOMES[WT.t.biome[i]]; mult += bi.cost || 1; seen[bi.name] = (seen[bi.name] || 0) + 1; }
  }
  const km = cells * world.scale, kmLand = km * land / steps, kmSea = km * sea / steps;
  const avg = land ? mult / land : 1;
  const days = kmLand / (EXPEDITION_PACES[expeditionOptions().pace].km / avg) + kmSea / KM_PER_DAY_SEA;
  const terrain = Object.entries(seen).sort((p, q) => q[1] - p[1]).slice(0, 2).map(e => e[0].toLowerCase());
  return { km: Math.round(km), days: Math.max(0.5, Math.round(days * 2) / 2), sea: kmSea > 1, terrain };
}

// ---------- Personnages sur la carte du monde ----------
function ensurePositions() {
  const cap = world.locations.find(l => l.type === 'capitale') || world.locations[0] || { x: world.W / 2, y: world.H / 2 };
  const lairs = world.locations.filter(l => ['donjon', 'grotte', 'ruines'].includes(l.type));
  let k = 0;
  sheets.forEach((s, i) => {
    if (world.pos[s.id]) return;
    const base = s.camp === 'monster' && lairs.length ? lairs[i % lairs.length] : cap;
    const a = (k++) * 2.4;
    world.pos[s.id] = { x: base.x + Math.cos(a) * 1.4, y: base.y + Math.sin(a) * 1.4 };
  });
  for (const id of Object.keys(world.pos)) if (!getSheet(id)) delete world.pos[id];
}
function selectedSheets() { return [...wsel.ids].map(getSheet).filter(Boolean); }

function travelTo(target, targetLoc = null) {
  if(expeditionBlocked()){atlasNotice(expeditionBlocked());return false;}
  target={x:clamp(target.x,0,world.W-1),y:clamp(target.y,0,world.H-1)};
  const list = selectedSheets().filter(s=>!s.dead); if (!list.length) return false;
  const from = { x: list.reduce((s, c) => s + world.pos[c.id].x, 0) / list.length, y: list.reduce((s, c) => s + world.pos[c.id].y, 0) / list.length };
  const info = travelInfo(from, target), fromName = placeName(from.x, from.y), toName = targetLoc ? targetLoc.name : placeName(target.x, target.y);
  if(info.km===0)return false;
  const days = Math.ceil(info.days);
  world.journal.unshift({ day: world.day, text: `${list.map(s => s.name).join(', ')} : ${fromName} → ${toName}, ${info.km} km en ${fmtLevel(info.days)} jour${info.days > 1 ? 's' : ''}` +
    (info.terrain.length ? ` (${info.terrain.join(', ')}${info.sea ? ', traversée en bateau' : ''})` : info.sea ? ' (en bateau)' : '') });
  // vivres et événements du voyage (rencontre, découverte, voyageur, météo)
  const ev = travelEvents(list, from, target, days);
  if (ev.stop) target = ev.stop;   // une rencontre arrête le groupe en chemin
  else if(targetLoc)targetLoc.visited=true;
  ev.out.forEach(t => world.journal.unshift({ day: world.day + ev.days, text: t }));
  world.day += ev.days;
  if (world.pending) setTimeout(() => { wsel = { loc: null, ids: new Set() }; renderWorldPanels(); }, 50);
  const starts = {}, ends = {};
  list.forEach((s, i) => {
    starts[s.id] = { ...world.pos[s.id] };
    const a = i * (Math.PI * 2 / list.length), r = list.length > 1 ? 1.2 : 0;
    ends[s.id] = { x: clamp(target.x + Math.cos(a) * r,0,world.W-1), y: clamp(target.y + Math.sin(a) * r,0,world.H-1) };
  });
  // Save the completed destination immediately; animation only changes the visual positions.
  Object.assign(world.pos,ends);
  wanim = { starts, ends, positions:{...starts}, start: performance.now(), dur: clamp(600 + info.km * 2, 700, 2200) };
  requestAnimationFrame(worldAnimTick);
  saveExpedition();return true;
}
function worldVisualPosition(id) {return wanim?.positions?.[id]||world.pos[id];}
function worldAnimTick() {
  if (!wanim) return;
  const q = clamp((performance.now() - wanim.start) / wanim.dur, 0, 1), k = easeInOut(q);
  for (const id in wanim.starts) {
    const a = wanim.starts[id], b = wanim.ends[id];
    wanim.positions[id] = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  }
  if(atlasFollow){const points=Object.values(wanim.positions),p={x:points.reduce((n,p)=>n+p.x,0)/points.length,y:points.reduce((n,p)=>n+p.y,0)/points.length};wcam.x=wcv.clientWidth/2-p.x*WCELL*wcam.z;wcam.y=wcv.clientHeight/2-p.y*WCELL*wcam.z;}
  drawWorld();
  if (q < 1) requestAnimationFrame(worldAnimTick); else { wanim = null; saveWorld(); renderWorldPanels(); }
}

// ---------- Rendu ----------
let wraf = 0;
function wredraw() { if (!wraf) wraf = requestAnimationFrame(() => { wraf = 0; drawWorld(); }); }

function drawWorld(output=null, publicView=previewWorldPlayers, background=true) {
  if ((!output && mode !== 'world') || !WT) return;
  const c = output ? output.getContext('2d') : wctx, z = wcam.z, o = world.opts, { W, H } = WT.t;
  const dpr = output ? 1 : window.devicePixelRatio || 1, canvas = output || wcv;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.setTransform(z * dpr, 0, 0, z * dpr, wcam.x * dpr, wcam.y * dpr);
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  c.save(); c.shadowColor = '#0008'; c.shadowBlur = 18; c.shadowOffsetY = 6;
  c.fillStyle = '#b99b68'; c.fillRect(-6, -6, W * WCELL + 12, H * WCELL + 12); c.restore();
  if(background)c.drawImage(worldBackground(), 0, 0, W * WCELL, H * WCELL);
  else c.clearRect(0, 0, W * WCELL, H * WCELL);
  if (o.regions) { c.drawImage(WT.tint, 0, 0, W * WCELL, H * WCELL); }

  // rivières
  if (o.rivers && !isNemai()) {
    c.strokeStyle = o.parchment ? '#6f8f9a' : '#4a82ba'; c.lineCap = 'round'; c.lineJoin = 'round';
    for (const r of WT.rivers) for (let k = 0; k < r.length - 1; k++) {
      c.lineWidth = (0.35 + Math.sqrt(r[k].f) * 0.32) * WCELL;
      c.beginPath(); c.moveTo(r[k].x, r[k].y); c.lineTo(r[k + 1].x, r[k + 1].y); c.stroke();
    }
  }
  if (o.symbols && !isNemai()) drawWorldSymbols(c, o.parchment);
  if (o.regions) {
    c.strokeStyle = o.parchment ? 'rgba(110,40,30,.65)' : 'rgba(60,20,20,.55)'; c.lineWidth = Math.max(1.2, 2 / z);
    c.stroke(WT.borders);
  }
  // noms des royaumes
  if (o.labels && o.regions && !isNemai()) {
    c.textAlign = 'center'; c.textBaseline = 'middle';
    WT.labels.forEach(l => {
      const reg = world.regions[l.r]; if (!reg) return;
      const size = clamp(Math.sqrt(l.n) * 0.42, 11, 30);
      c.font = `italic 700 ${size}px Georgia, serif`;
      if ('letterSpacing' in c) c.letterSpacing = size * 0.12 + 'px';
      c.lineWidth = size * 0.12; c.strokeStyle = 'rgba(255,248,230,.55)'; c.fillStyle = o.parchment ? 'rgba(90,40,25,.75)' : 'rgba(40,20,20,.62)';
      c.strokeText(reg.name.toUpperCase(), l.x * WCELL, l.y * WCELL); c.fillText(reg.name.toUpperCase(), l.x * WCELL, l.y * WCELL);
      if ('letterSpacing' in c) c.letterSpacing = '0px';
    });
  }

  // trajet en cours de préparation (personnages sélectionnés -> curseur)
  const sel = selectedSheets();
  if (!publicView && sel.length && whover && !wdrag && !wanim && !world.route?.points.length) {
    const p = world.pos[sel[0].id];
    c.setLineDash([8 / z, 6 / z]); c.strokeStyle = 'rgba(255,230,120,.9)'; c.lineWidth = 2.5 / z;
    c.beginPath(); c.moveTo(p.x * WCELL, p.y * WCELL); c.lineTo(whover.x * WCELL, whover.y * WCELL); c.stroke(); c.setLineDash([]);
  }

  if(!publicView)drawWorldRoutes(c);
  // lieux
  const showAll = z > 1.1;
  c.textAlign = 'center';
  world.locations.forEach(l => {
    if(isNemai()){drawNemaiLocation(c,l,publicView);return;}
    const T = LOC_TYPES[l.type] || LOC_TYPES.lieu, x = l.x * WCELL, y = l.y * WCELL, s = T.size / z;
    const isSel = !publicView && wsel.loc === l;
    if (isSel) { c.fillStyle = 'rgba(255,210,60,.35)'; c.beginPath(); c.arc(x, y, s * 0.95, 0, Math.PI * 2); c.fill(); }
    c.font = `${s}px "Segoe UI Emoji", "Apple Color Emoji", system-ui`; c.textBaseline = 'middle';
    c.fillText(T.icon, x, y);
    if (!publicView && l.battle) { c.font = `${s * 0.55}px system-ui`; c.fillText('⚔', x + s * 0.55, y - s * 0.45); }
    if(!publicView&&(l.favorite||l.visited)){c.font=`bold ${10/z}px system-ui`;c.fillStyle=l.favorite?'#a44a1d':'#326b40';c.fillText(l.favorite?'★':'✓',x-s*.65,y);}
    const major = ['capitale', 'ville', 'port'].includes(l.type);
    if (o.labels && (major || showAll || isSel)) {
      const fs = (l.type === 'capitale' ? 14 : major ? 12 : 11) / z;
      c.font = `${l.type === 'capitale' ? 'bold ' : ''}${fs}px Georgia, serif`; c.textBaseline = 'top';
      c.lineWidth = 3 / z; c.strokeStyle = o.parchment ? 'rgba(240,228,200,.95)' : 'rgba(0,0,0,.8)';
      c.fillStyle = o.parchment ? '#3a2416' : '#fff';
      c.strokeText(l.name, x, y + s * 0.55); c.fillText(l.name, x, y + s * 0.55);
    }
  });

  if(!publicView)drawQuestMarks(c);

  // personnages
  if(!publicView)ensurePositions();
  const visibleSheets=publicView?sheets.filter(s=>s.camp!=='monster'):sheets;
  const tokenPositions=worldTokenPositions(visibleSheets);
  visibleSheets.forEach(s => {
    const p = worldVisualPosition(s.id); if (!p) return;
    const {x,y}=tokenPositions.get(s.id), sz = 30 / z, on = !publicView && wsel.ids.has(s.id);
    if(Math.hypot(x-p.x*WCELL,y-p.y*WCELL)>5/z){c.strokeStyle='#644c3680';c.lineWidth=1/z;c.beginPath();c.moveTo(p.x*WCELL,p.y*WCELL);c.lineTo(x,y);c.stroke();}
    c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(x, y + sz * 0.05, sz * 0.38, sz * 0.14, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = on ? '#ffd23c' : s.camp === 'monster' ? '#ff4d4d' : '#4da3ff'; c.lineWidth = (on ? 3.5 : 2.2) / z;
    c.beginPath(); c.ellipse(x, y + sz * 0.05, sz * 0.42, sz * 0.16, 0, 0, Math.PI * 2); c.stroke();
    c.imageSmoothingEnabled = false; c.drawImage(spriteCanvas(s.sprite), x - sz / 2, y - sz * 0.92, sz, sz); c.imageSmoothingEnabled = true;
    if (o.labels || on) {
      c.font = `bold ${10 / z}px system-ui`; c.textBaseline = 'bottom';
      c.lineWidth = 3 / z; c.strokeStyle = 'rgba(0,0,0,.85)'; c.fillStyle = on ? '#ffd23c' : '#fff';
      c.strokeText(s.name, x, y - sz * 0.92); c.fillText(s.name, x, y - sz * 0.92);
    }
  });

  // boussole et échelle (repère écran)
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const vw = output ? output.width : wcv.clientWidth, vh = output ? output.height : wcv.clientHeight;
  const kmPx = WCELL * z / world.scale, nice = [50, 100, 200, 250, 500, 1000].find(k => k * kmPx > 80) || 1000;
  c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(12, vh - 40, nice * kmPx + 20, 28);
  c.fillStyle = '#fff'; c.fillRect(22, vh - 22, nice * kmPx, 4);
  c.font = '11px system-ui'; c.textAlign = 'left'; c.textBaseline = 'bottom'; c.fillText(`${nice} km`, 22, vh - 24);
  if(!isNemai()){
    c.save(); c.translate(vw - 40, 44);
    c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.arc(0, 0, 24, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e8d8a8'; c.beginPath(); c.moveTo(0, -20); c.lineTo(6, 0); c.lineTo(-6, 0); c.closePath(); c.fill();
    c.fillStyle = '#8a7a5a'; c.beginPath(); c.moveTo(0, 20); c.lineTo(6, 0); c.lineTo(-6, 0); c.closePath(); c.fill();
    c.fillStyle = '#fff'; c.font = 'bold 10px system-ui'; c.textAlign = 'center'; c.fillText('N', 0, -22);
    c.restore();
  }
  if(!output)drawAtlasMini();
}

function drawWorldSymbols(c, parch) {
  const S = WCELL;
  for (const m of WT.symbols) {
    const x = m.x * S, y = m.y * S, s = m.s * S;
    if (m.t === 'M' || m.t === 'P') {
      c.fillStyle = parch ? '#c9b48a' : '#b3a693';
      c.beginPath(); c.moveTo(x - s * 0.6, y); c.lineTo(x, y - s); c.lineTo(x, y); c.closePath(); c.fill();
      c.fillStyle = parch ? '#9a835c' : '#7a6e60';
      c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 0.6, y); c.lineTo(x, y); c.closePath(); c.fill();
      if (m.t === 'P') {
        c.fillStyle = '#f4f6f8';
        c.beginPath(); c.moveTo(x - s * 0.21, y - s * 0.65); c.lineTo(x, y - s); c.lineTo(x + s * 0.21, y - s * 0.65); c.closePath(); c.fill();
      }
      c.strokeStyle = parch ? '#5a4630' : '#4a4036'; c.lineWidth = 0.7;
      c.beginPath(); c.moveTo(x - s * 0.6, y); c.lineTo(x, y - s); c.lineTo(x + s * 0.6, y); c.stroke();
    } else if (m.t === 'H') {
      c.strokeStyle = parch ? '#7a6040' : '#5d6a3a'; c.lineWidth = 0.9;
      c.beginPath(); c.arc(x, y, s * 0.5, Math.PI, 0); c.stroke();
    } else if (m.t === 'T') {
      c.fillStyle = '#4a3420'; c.fillRect(x - 0.4, y - s * 0.3, 0.8, s * 0.4);
      c.fillStyle = parch ? '#6f7a48' : m.dark ? '#24582c' : '#2f6a33';
      c.beginPath(); c.arc(x, y - s * 0.55, s * 0.45, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 0.5; c.stroke();
    } else if (m.t === 'C') {
      c.fillStyle = parch ? '#5f6a48' : '#2d5545';
      c.beginPath(); c.moveTo(x - s * 0.4, y); c.lineTo(x, y - s * 1.1); c.lineTo(x + s * 0.4, y); c.closePath(); c.fill();
    } else if (m.t === 'S') {
      c.strokeStyle = parch ? '#6a6a40' : '#3a5a3a'; c.lineWidth = 0.6;
      c.beginPath(); c.moveTo(x - s * 0.5, y); c.lineTo(x + s * 0.5, y); c.moveTo(x - s * 0.2, y); c.lineTo(x - s * 0.3, y - s * 0.6);
      c.moveTo(x + s * 0.1, y); c.lineTo(x + s * 0.2, y - s * 0.7); c.stroke();
    }
  }
}

// ---------- Caméra et souris ----------
function resizeWorld() {
  wcv.width = wcv.clientWidth * dpr; wcv.height = wcv.clientHeight * dpr; drawWorld();
}
function fitWorld() {
  const vw = wcv.clientWidth, vh = wcv.clientHeight, mw = world.W * WCELL, mh = world.H * WCELL;
  wcam.z = Math.min(vw / mw, vh / mh) * 0.98;
  wcam.x = (vw - mw * wcam.z) / 2; wcam.y = (vh - mh * wcam.z) / 2;
  wredraw();
}
function centerOn(x, y, z = Math.max(wcam.z, 1.8)) {
  wcam.z = z; wcam.x = wcv.clientWidth / 2 - x * WCELL * z; wcam.y = wcv.clientHeight / 2 - y * WCELL * z; wredraw();
}
const wToCell = e => ({ x: (e.offsetX - wcam.x) / wcam.z / WCELL, y: (e.offsetY - wcam.y) / wcam.z / WCELL });
function hitToken(p) {
  const r = 16 / wcam.z / WCELL;
  const points=worldTokenPositions();
  return [...sheets].reverse().find(s => { const q = points.get(s.id); return q && Math.abs(q.x/WCELL - p.x) < r && p.y > q.y/WCELL - r * 1.9 && p.y < q.y/WCELL + r * 0.4; }) || null;
}
function hitLoc(p) {
  const r = 12 / wcam.z / WCELL;
  if(isNemai())return hitNemaiLocation(p);
  return world.locations.find(l => Math.hypot(l.x - p.x, l.y - p.y) < r) || null;
}

wcv.addEventListener('contextmenu', e => e.preventDefault());
wcv.addEventListener('mousedown', e => {
  const p = wToCell(e);
  if (e.button === 2) {   // clic droit : voyage du groupe sélectionné
    const l=hitLoc(p);planWorldStop(l||p,l,!!e.shiftKey);
    return;
  }
  if (e.button === 1) { wdrag = { mode: 'pan', sx: e.clientX, sy: e.clientY, cx: wcam.x, cy: wcam.y }; e.preventDefault(); return; }
  if (e.button !== 0 || wanim) return;
  if (wAddType) {
    const l = { id: 'u' + Date.now().toString(36), type: wAddType, x: p.x, y: p.y, name: `Nouveau lieu (${LOC_TYPES[wAddType].name.toLowerCase()})`,
                desc: '', notes: '', battle: null, pop: 0 };
    world.locations.push(l); wsel = { loc: l, ids: new Set() }; setAddType(null); saveWorld(); renderWorldPanels(); wredraw();
    setTimeout(() => { $('wlName')?.focus(); $('wlName')?.select(); }, 0);
    return;
  }
  const tok = hitToken(p);
  if (tok) {
    if (e.shiftKey) { wsel.ids.has(tok.id) ? wsel.ids.delete(tok.id) : wsel.ids.add(tok.id); }
    else if (!wsel.ids.has(tok.id)) wsel.ids = new Set([tok.id]);
    wsel.loc = null;
    wdrag = { mode: 'tokens', start: p, moved: false, orig: Object.fromEntries([...wsel.ids].map(id => [id, { ...world.pos[id] }])) };
    renderWorldPanels(); wredraw(); return;
  }
  const loc = hitLoc(p);
  if (loc) { wsel.loc = loc; wdrag = isNemai()&&loc.reference?null:{ mode: 'loc', loc, start: p, ox: loc.x, oy: loc.y, moved: false }; renderWorldPanels(); wredraw(); return; }
  wdrag = { mode: 'pan', sx: e.clientX, sy: e.clientY, cx: wcam.x, cy: wcam.y, click: true };
});
window.addEventListener('mousemove', e => {
  if (mode !== 'world') return;
  if (e.target === wcv) { whover = wToCell(e); updateWorldTip(e); }
  if (!wdrag) { if (e.target === wcv) wredraw(); return; }
  if (wdrag.mode === 'pan') {
    if (Math.abs(e.clientX - wdrag.sx) + Math.abs(e.clientY - wdrag.sy) > 3) wdrag.click = false;
    wcam.x = wdrag.cx + e.clientX - wdrag.sx; wcam.y = wdrag.cy + e.clientY - wdrag.sy; wredraw(); return;
  }
  if (e.target !== wcv) return;
  const p = wToCell(e), dx = p.x - wdrag.start.x, dy = p.y - wdrag.start.y;
  if (Math.hypot(dx, dy) * WCELL * wcam.z > 3) wdrag.moved = true;
  if (!wdrag.moved) return;
  if (wdrag.mode === 'tokens') for (const id in wdrag.orig) world.pos[id] = { x: clamp(wdrag.orig[id].x + dx,0,world.W-1), y: clamp(wdrag.orig[id].y + dy,0,world.H-1) };
  if (wdrag.mode === 'loc') { wdrag.loc.x = clamp(wdrag.ox + dx,0,world.W-1); wdrag.loc.y = clamp(wdrag.oy + dy,0,world.H-1); }
  wredraw();
});
window.addEventListener('mouseup', () => {
  if (!wdrag) return;
  if (wdrag.mode === 'pan' && wdrag.click) { wsel = { loc: null, ids: new Set() }; renderWorldPanels(); }
  if ((wdrag.mode === 'tokens' || wdrag.mode === 'loc') && wdrag.moved) { saveWorld(); renderWorldPanels(); }
  wdrag = null; wredraw();
});
wcv.addEventListener('mouseleave', () => { whover = null; $('worldTip').classList.add('hidden'); wredraw(); });
wcv.addEventListener('wheel', e => {
  e.preventDefault();
  const f = Math.exp(-e.deltaY * 0.0015), nz = clamp(wcam.z * f, 0.15, 8);
  wcam.x = e.offsetX - (e.offsetX - wcam.x) * nz / wcam.z; wcam.y = e.offsetY - (e.offsetY - wcam.y) * nz / wcam.z;
  wcam.z = nz; wredraw();
}, { passive: false });
window.addEventListener('keydown', e => {
  if (mode !== 'world' || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
  if (e.key === 'Escape') { setAddType(null); wsel = { loc: null, ids: new Set() }; renderWorldPanels(); wredraw(); }
  if (e.key === 'Delete' && wsel.loc && confirm(`Supprimer « ${wsel.loc.name} » ?`)) deleteLoc(wsel.loc);
});

// Infobulle : terrain, royaume, altitude, climat, distance depuis le groupe sélectionné
function updateWorldTip(e) {
  const tip = $('worldTip'), p = wToCell(e);
  if (p.x < 0 || p.y < 0 || p.x >= world.W || p.y >= world.H) { tip.classList.add('hidden'); return; }
  const i = wIdx(p.x, p.y), b = BIOMES[WT.t.biome[i]], reg = regionAt(p.x, p.y), h = WT.t.h[i];
  const place=hitLoc(p);
  let html = (place?`<b>${escapeHtml(place.name)}</b><br>`:'')+`<b>${b.name}</b>` + (reg && !WT.t.water[i] ? ` · ${escapeHtml(reg.name)}` : '') +
    (WT.t.water[i] ? '' : `<br><span class="muted">Altitude ≈ ${Math.round(Math.max(0, h) * 4200)} m · climat ${tempLabel(WT.t.temp[i])}</span>`);
  const sel = selectedSheets();
  if (sel.length && !wdrag) {
    const q = world.pos[sel[0].id], info = travelInfo(q, p);
    html += `<br>🚶 ${info.km} km · <b>${Math.ceil(info.days)} jour(s)</b>${info.sea ? ' (en bateau)' : ''}<br><span class="muted">clic droit : préparer · Maj : ajouter une étape</span>`;
  }
  tip.innerHTML = html; tip.classList.remove('hidden');
  tip.style.left = Math.min(e.offsetX + 16, wcv.clientWidth - 240) + 'px'; tip.style.top = (e.offsetY + 16) + 'px';
}
const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

// ---------- Cartes de combat liées aux lieux ----------
const LOC_PRESET = { capitale: 'city', ville: 'city', port: 'city', village: 'tavern', donjon: 'dungeon', ruines: 'dungeon',
                     grotte: 'cave', tour: 'dungeon', temple: 'dungeon' };
function presetForLoc(l) {
  if (LOC_PRESET[l.type]) return LOC_PRESET[l.type];
  const b = biomeAt(l.x, l.y).k;
  return { forest: 'forest', rainforest: 'forest', jungle: 'forest', taiga: 'snow', tundra: 'snow', snow: 'snow', peak: 'snow',
           desert: 'desert', savanna: 'desert', beach: 'desert', swamp: 'swamp', mountain: 'cave', hills: 'plain' }[b] || 'plain';
}
function genBattle(l) {
  const preset = presetForLoc(l);
  pushUndo();
  map = newMap(24, 16); map.locId = l.id; syncMapUI();
  applyPreset(preset);
  l.battle = JSON.parse(JSON.stringify(map)); saveWorld();
  setMode('edit'); fit();
}
function openBattle(l, m) {
  pushUndo();
  map = normalizeMap(JSON.parse(JSON.stringify(l.battle))); map.locId = l.id;
  reconcileEquipmentMap();
  syncMapUI(); setMode(m); fit(); changed();
}
// Appelé à chaque modification de la carte de combat : la copie du lieu lié est mise à jour
let battleSaveTimer = 0;
function onMapChanged() {
  updateMapLocTag();
  if (!map.locId || !world) return;
  clearTimeout(battleSaveTimer);
  battleSaveTimer = setTimeout(() => {
    const l = world.locations.find(x => x.id === map.locId);
    if (l) { l.battle = JSON.parse(JSON.stringify(map)); saveWorld(true); }
  }, 500);
}
function updateMapLocTag() {
  const l = map.locId && world ? world.locations.find(x => x.id === map.locId) : null, tag = $('mapLocTag');
  tag.classList.toggle('hidden', !l || mode === 'world' || mode === 'chars');
  if (l) tag.textContent = `📍 ${l.name}`;
}
$('mapLocTag').onclick = () => {
  const l = world.locations.find(x => x.id === map.locId); if (!l) return;
  setMode('world'); wsel = { loc: l, ids: new Set() }; centerOn(l.x, l.y); renderWorldPanels();
};
function deleteLoc(l) {
  world.locations = world.locations.filter(x => x !== l);
  if (map.locId === l.id) delete map.locId;
  wsel.loc = null; saveWorld(); renderWorldPanels(); wredraw();
}

// ---------- Panneaux ----------
function setAddType(t) {
  wAddType = t;
  $('wAddLoc').classList.toggle('on', !!t);
  wcv.style.cursor = t ? 'copy' : 'grab';
  $('worldHint').classList.toggle('hidden', !t);
  if (t) $('worldHint').textContent = `📍 Clique sur la carte pour placer : ${LOC_TYPES[t].name} (Échap pour annuler)`;
}
function enterWorld() {
  if (!world) { world = newWorld(); saveWorld(true); }
  if (!WT) buildWorldCache();
  ensurePositions(); renderWorldPanels(); resizeWorld();
  if (!wcam.init) { wcam.init = true; fitWorld(); }
  updateMapLocTag();
}

function renderWorldPanels() {
  if (!world) return;
  renderAtlas();
  const o = world.opts;
  $('wName').value = world.name; $('wDay').textContent = world.day;
  $('wSeed').value = world.seed; $('wStyle').value = world.style;
  updateNemaiControls();
  ['regions', 'rivers', 'symbols', 'labels', 'parchment'].forEach(k => { $('wo_' + k).checked = !!o[k]; });
  renderLocList();
  // panneau de droite
  const el = $('worldSel'); el.replaceChildren();
  if (wsel.loc) el.appendChild(locPanel(wsel.loc));
  else if (wsel.ids.size) el.appendChild(charPanel(selectedSheets()));
  else el.appendChild(worldInfoPanel());
}

function renderLocList() {
  const q = norm($('wSearch').value || ''), ft = $('wFilter').value, el = $('wLocList'); el.replaceChildren();
  const found=world.locations.filter(l => atlasLocationMatches(l) && (!ft || l.type === ft) && (!q || norm(l.name).includes(q)));
  if($('atlasLocCount'))$('atlasLocCount').textContent=`${found.length} / ${world.locations.length} lieux`;
  found.sort(atlasSortLocations)
    .forEach(l => {
      const b = document.createElement('button'); b.className = 'loc-row' + (wsel.loc === l ? ' on' : '');
      b.textContent = `${l.favorite?'★ ':''}${(LOC_TYPES[l.type] || LOC_TYPES.lieu).icon} ${l.name}${l.visited?' ✓':''}${l.battle ? ' ⚔' : ''}`;
      b.onclick = () => { wsel.loc=l; centerOn(l.x, l.y); renderWorldPanels(); };
      el.appendChild(b);
    });
  if(!found.length)el.appendChild(h('p',{className:'muted',textContent:'Aucun lieu ne correspond aux filtres.'}));
}

function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'on') for (const [ev, fn] of Object.entries(v)) e.addEventListener(ev, fn);
    else if (k in e) e[k] = v; else e.setAttribute(k, v);
  }
  e.append(...kids.flat().filter(x => x !== null && x !== undefined && x !== false));
  return e;
}

function locPanel(l) {
  const T = LOC_TYPES[l.type] || LOC_TYPES.lieu, b = biomeAt(l.x, l.y), reg = regionAt(l.x, l.y);
  const here = sheets.filter(s => world.pos[s.id] && Math.hypot(world.pos[s.id].x - l.x, world.pos[s.id].y - l.y) < 3);
  const upd = (k, v) => { l[k] = v; saveWorld(); renderLocList(); wredraw(); updateMapLocTag(); };
  const typeSel = h('select', { on: { change: e => { upd('type', e.target.value); renderWorldPanels(); } } },
    Object.entries(LOC_TYPES).map(([k, t]) => h('option', { value: k, selected: k === l.type, textContent: `${t.icon} ${t.name}` })));
  const nSel = selectedSheets().length;
  const battle = l.battle
    ? [h('p', { className: 'muted', textContent: `Carte ${l.battle.cols}×${l.battle.rows} · ${l.battle.objects.length} éléments · ${l.battle.units.length} figurines` }),
       h('div', { className: 'row' },
         h('button', { textContent: '✏ Éditer', on: { click: () => openBattle(l, 'edit') } }),
         h('button', { className: 'primary', textContent: '🎲 Jouer', on: { click: () => openBattle(l, 'play') } })),
       h('div', { className: 'row', style: 'margin-top:5px' },
         h('button', { className: 'mini', textContent: '⟳ Regénérer', on: { click: () => { if (confirm('Remplacer la carte de combat de ce lieu par une nouvelle ?')) genBattle(l); } } }),
         h('button', { className: 'mini', textContent: '✖ Délier', on: { click: () => { if (confirm('Retirer la carte de combat de ce lieu ?')) { l.battle = null; if (map.locId === l.id) delete map.locId; saveWorld(); renderWorldPanels(); wredraw(); } } } }))]
    : [h('p', { className: 'muted', textContent: `Aucune carte. Le générateur utilisera le preset « ${PRESETS[presetForLoc(l)].name} ».` }),
       h('button', { className: 'primary wide-btn', textContent: '⚔ Générer la carte de combat', on: { click: () => genBattle(l) } }),
       h('button', { className: 'wide-btn', textContent: '📌 Lier la carte de combat actuelle', on: { click: () => {
         map.locId = l.id; l.battle = JSON.parse(JSON.stringify(map)); saveWorld(); renderWorldPanels(); wredraw(); } } })];
  return h('div', {},
    h('div', { className: 'wl-head' }, h('span', { className: 'wl-icon', textContent: T.icon }),
      h('input', { id: 'wlName', type: 'text', value: l.name, on: { input: e => upd('name', e.target.value) } })),
    h('label', {}, 'Type', typeSel),atlasLocationControls(l),
    h('div', { className: 'wl-facts' },
      reg ? h('div', {}, '👑 ', h('b', { textContent: reg.name })) : null,
      h('div', { textContent: `🌿 ${b.name} · climat ${tempLabel(WT.t.temp[wIdx(l.x, l.y)])}` }),
      l.pop ? h('div', { textContent: `👥 ${l.pop.toLocaleString('fr-FR')} habitants` }) : null),
    h('div', { className: 'muted', textContent: 'Description' }),
    h('textarea', { rows: 4, value: l.desc || '', on: { input: e => upd('desc', e.target.value) } }),
    h('div', { className: 'muted', textContent: 'Notes du MJ (secrets, quêtes, PNJ...)' }),
    h('textarea', { rows: 3, value: l.notes || '', on: { input: e => upd('notes', e.target.value) } }),
    notebookLocationPanel(l),
    h('h2', { textContent: `Ici (${here.length})` }),
    here.length ? h('div', { className: 'here' }, here.map(s => h('button', { className: 'here-tok', title: s.name,
      on: { click: () => { wsel = { loc: null, ids: new Set([s.id]) }; renderWorldPanels(); wredraw(); } } }, spriteIcon(s.sprite, 28), s.name)))
      : h('p', { className: 'muted', textContent: 'Personne pour l\'instant.' }),
    h('button', { className: 'wide-btn', disabled: !nSel, textContent: nSel ? `🚶 Envoyer la sélection ici (${nSel})` : '🚶 Sélectionne des personnages pour les envoyer ici',
      on: { click: () => planWorldStop(l,l,false) } }),
    h('h2', { textContent: '⚔ Carte de combat' }), battle,
    shopSection(l),
    h('button', { className: 'wide-btn danger', style: 'margin-top:14px', textContent: '🗑 Supprimer ce lieu',
      on: { click: () => { if (confirm(`Supprimer « ${l.name} » ?`)) deleteLoc(l); } } }));
}

function charPanel(list) {
  const rows = list.map(s => {
    const d = sheetDerived(s), p = world.pos[s.id], hp = s.hpCur ?? d.val.pv;
    return h('div', { className: 'wc-card' },
      h('div', { className: 'wc-top' }, spriteIcon(s.sprite, 40),
        h('div', {}, h('b', { textContent: s.name }), h('div', { className: 'muted', textContent: `${d.race.name} ${d.cls.name} · niv. ${d.lvl}` }))),
      h('div', { className: 'hpbar' }, h('i', { style: `width:${Math.round(hp / d.val.pv * 100)}%;background:${hpColor(hp / d.val.pv)}` }),
        h('span', { textContent: `${hp} / ${d.val.pv} PV` })),
      h('div', { className: 'muted', textContent: `📍 ${placeName(p.x, p.y)} · ${biomeAt(p.x, p.y).name}` + (regionAt(p.x, p.y) ? ` · ${regionAt(p.x, p.y).name}` : '') }),
      h('div', { className: 'muted', textContent: `⭐ ${s.xp || 0} XP · 💰 ${s.gold || 0} PO` }),
      h('button', { className: 'mini', textContent: '📜 Fiche', on: { click: () => { setMode('chars'); openSheet(s.id); } } }));
  });
  return h('div', {},
    h('h2', { textContent: list.length > 1 ? `Groupe sélectionné (${list.length})` : 'Personnage' }),
    rows,
    h('p', { className: 'muted', textContent: 'Clic droit pour préparer un trajet, puis « Partir » dans le carnet de route. Maj+clic droit ajoute une étape. Glisser déplace librement les figurines.' }));
}

function worldInfoPanel() {
  const heroes = sheets.filter(s => s.camp !== 'monster'), pe = world.pending;
  return h('div', {},
    pe ? h('div', { className: 'pending' },
      h('b', { textContent: `⚔ Rencontre en chemin (jour ${pe.day})` }),
      h('div', { textContent: encText(pe.enc) }),
      h('div', { className: 'row' },
        h('button', { className: 'primary', textContent: '⚔ Préparer le combat', on: { click: fightPending } }),
        h('button', { textContent: '🧪 Simuler', on: { click: () => {
          const saved = map; map = newMap(22, 14); applyPreset(BIOME_PRESET[pe.biome] || 'plain'); map.turn = 0;
          pe.ids.map(getSheet).filter(Boolean).forEach((s, i) => { invalidateZones(); const sp = freeSpot(2 + (i % 2) * 2, 4 + (i >> 1) * 2); if (sp) addUnit('sheet:' + s.id, sp[0], sp[1]); });
          invalidateZones(); spawnEncounter(pe.enc, false); const test = map; map = saved; invalidateZones();
          openSim(test, `Simuler la rencontre : ${encText(pe.enc)}`); } } }),
        h('button', { className: 'mini', textContent: '✖ Éviter', on: { click: () => { world.journal.unshift({ day: world.day, text: '🏃 Le groupe évite la rencontre.' }); world.pending = null; saveWorld(); renderWorldPanels(); wredraw(); } } }))) : null,
    h('h2', { textContent: 'Le groupe' }),
    h('div', { className: 'here' }, heroes.map(s => h('button', { className: 'here-tok', title: s.name, on: { click: () => {
      wsel = { loc: null, ids: new Set([s.id]) }; const p = world.pos[s.id]; centerOn(p.x, p.y); renderWorldPanels(); } } }, spriteIcon(s.sprite, 28), s.name))),
    h('button', { className: 'wide-btn', textContent: '👥 Sélectionner tout le groupe', on: { click: () => {
      wsel = { loc: null, ids: new Set(heroes.map(s => s.id)) }; renderWorldPanels(); wredraw(); } } }),
    h('h2', { textContent: isNemai()?'Territoires de Nemaï':'Royaumes' }),
    h('div', {}, world.regions.map((r, i) => h('div', { className: 'loc-row reg-row', on: { click: () => centerOn(r.x, r.y, 1.4) } },
      h('span', { className: 'swatch', style: `background:hsl(${r.hue},55%,45%)` }), h('span', { className: 'ellip', textContent: r.name }), repControls(r)))),
    questPanel(),
    h('h2', { textContent: 'Journal de voyage' }),
    world.journal.length ? h('div', { className: 'wjournal' }, world.journal.slice(0, 40).map(j =>
      h('div', {}, h('b', { textContent: `Jour ${j.day} · ` }), j.text)))
      : h('p', { className: 'muted', textContent: 'Sélectionne un personnage puis fais un clic droit sur la carte pour voyager.' }));
}

// ---------- Boutons du panneau gauche ----------
$('wName').addEventListener('input', e => { world.name = e.target.value; saveWorld(); });
$('wNext').onclick = () => { world.day++; world.journal.unshift({ day: world.day, text: 'Une journée passe.' }); saveWorld(); renderWorldPanels(); };
$('wRest').onclick = () => {openExpedition();$('expeditionLong').focus();};
$('wShort').onclick = () => {openExpedition();$('expeditionShort').focus();};
$('wGen').onclick = () => {
  if($('wStyle').value==='nemai'){switchNemaiWorld();return;}
  if (!confirm('Générer un nouveau monde ? Les lieux, les cartes de combat liées et le journal de voyage seront remplacés (les fiches sont conservées).')) return;
  const keepScale = isNemai()?8:world.scale;
  world = newWorld((Math.random() * 1e6) | 0, $('wStyle').value); world.scale = keepScale;
  wsel = { loc: null, ids: new Set() }; ensurePositions(); saveWorld(true); renderWorldPanels(); fitWorld();
};
$('wRegen').onclick = () => {
  if($('wStyle').value==='nemai')return;
  const seed = Math.floor(+$('wSeed').value) || 1;
  if (!confirm(`Regénérer le monde avec la graine ${seed} et le style choisi ? Les lieux seront remplacés.`)) return;
  world = newWorld(seed, $('wStyle').value);
  wsel = { loc: null, ids: new Set() }; ensurePositions(); saveWorld(true); renderWorldPanels(); fitWorld();
};
['regions', 'rivers', 'symbols', 'labels', 'parchment'].forEach(k => $('wo_' + k).onchange = e => {
  world.opts[k] = e.target.checked; if (k === 'parchment') buildWorldCache(WT.t); saveWorld(); wredraw();
});
$('wAddLoc').onclick = () => setAddType(wAddType ? null : $('wAddKind').value);
$('wAddKind').onchange = () => { if (wAddType) setAddType($('wAddKind').value); };
$('wSearch').addEventListener('input', renderLocList);
$('wFilter').onchange = renderLocList;
$('wFit').onclick = fitWorld;
$('btnNemai').onclick=()=>switchNemaiWorld();
$('btnPreviousWorld').onclick=()=>switchNemaiWorld(true);
$('wStyle').onchange=()=>{
  const fixed=$('wStyle').value==='nemai';$('wSeed').disabled=fixed;$('wRegen').disabled=fixed;$('wGen').disabled=fixed&&isNemai();
};

// Légende des biomes et types de lieux
(function buildLegend() {
  $('wLegend').append(...BIOMES.filter(b => b.k !== 'shallow').map(b => h('div', { className: 'lg' }, h('span', { className: 'swatch', style: `background:${b.c}` }), b.name)));
  $('wFilter').append(...Object.entries(LOC_TYPES).map(([k, t]) => h('option', { value: k, textContent: `${t.icon} ${t.name}` })));
  $('wAddKind').append(...Object.entries(LOC_TYPES).map(([k, t]) => h('option', { value: k, textContent: `${t.icon} ${t.name}` })));
  $('wStyle').append(...Object.entries(WORLD_STYLES).map(([k, s]) => h('option', { value: k, textContent: s.name })));
})();

// ---------- Campagne complète (monde + fiches + carte de combat + caractéristiques) ----------
$('wExport').onclick = () => {
  let stats = null; try { stats = localStorage.getItem('jdr-stats'); } catch (e) {}
  const data = { app: 'jdr-mapping', version: 4, date: new Date().toISOString(), world, sheets, map, stats, equipment:equipmentState, gm:campaignGmData() };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
  download(`campagne-${norm(world.name).replace(/[^a-z0-9]+/g, '-')}.json`, url); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('wImport').onclick = () => $('campIn').click();
$('campIn').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (d.app !== 'jdr-mapping' || !d.world || !Array.isArray(d.world.locations) || !Array.isArray(d.world.regions) || (d.sheets!=null&&!Array.isArray(d.sheets))) throw 0;
    const quests=normalizeQuests(d.world.quests);
    const gm={notebook:normalizeNotebook(d.gm?.notebook),history:normalizeGmHistory(d.gm?.history),notes:nbText(d.gm?.notes,1000000)};
    if (!confirm(`Charger la campagne « ${d.world.name} » ? Le monde, les fiches, la carte et le carnet du MJ actuels seront remplacés.`)) return;
    world = d.world; world.opts ||= {}; sheets = d.sheets || []; sheets.forEach(ensureEquipment);
    world.quests=quests;
    restoreCampaignGm(gm);
    equipmentState=normalizeEquipmentState(d.equipment);saveEquipment();saveSheets(); saveWorld(true);
    if (d.map) { map = normalizeMap(d.map); syncMapUI(); changed(); }
    if (d.stats) { try { localStorage.setItem('jdr-stats', d.stats); } catch (err) {} loadStats(d.stats, 'campagne'); }
    reconcileEquipmentMap();
    undoStack.length=0;redoStack.length=0;syncHistoryUI();
    buildWorldCache(); wsel = { loc: null, ids: new Set() }; curSheet = null;
    ensurePositions(); renderWorldPanels(); fitWorld();
  } catch { alert('Fichier de campagne invalide'); }
  e.target.value = '';
};

window.addEventListener('resize', () => { if (mode === 'world') resizeWorld(); });
