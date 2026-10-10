// Génération procédurale du monde (méthode inspirée de Red Blob Games et d'Azgaar Fantasy Map Generator) :
// 1. relief : bruit fractal (fBm) + crêtes pour les chaînes de montagnes, océan sur les bords
// 2. eau : niveau de la mer fixé pour obtenir la part de terres voulue, lacs dans les cuvettes
// 3. rivières : descente selon la plus forte pente depuis les hauteurs jusqu'à la mer
// 4. climat : humidité (distance à l'eau + bruit) et température (latitude + altitude)
// 5. biomes : selon température et humidité (à la manière du diagramme de Whittaker)
// 6. royaumes autour des capitales, puis villes, villages, donjons, ruines...
// Le terrain se recalcule à l'identique depuis la graine ; seuls les lieux (modifiables) sont sauvegardés.

const BIOMES = [
  { k:'deep',     name:'Océan profond',   c:'#1d3a66' },
  { k:'ocean',    name:'Océan',           c:'#2b5689' },
  { k:'shallow',  name:'Hauts-fonds',     c:'#4479ad' },
  { k:'lake',     name:'Lac',             c:'#4a82ba' },
  { k:'beach',    name:'Côte sableuse',   c:'#d8c99a', cost:1 },
  { k:'desert',   name:'Désert',          c:'#d9c27a', cost:1.4 },
  { k:'savanna',  name:'Savane',          c:'#b9b35a', cost:1.1 },
  { k:'steppe',   name:'Steppe',          c:'#a7ad6c', cost:1 },
  { k:'grass',    name:'Prairie',         c:'#7cab55', cost:1 },
  { k:'forest',   name:'Forêt',           c:'#4c8443', cost:1.5 },
  { k:'rainforest', name:'Forêt profonde', c:'#3a713f', cost:1.7 },
  { k:'jungle',   name:'Jungle',          c:'#2e7a3c', cost:2 },
  { k:'swamp',    name:'Marais',          c:'#5d7b55', cost:2 },
  { k:'taiga',    name:'Taïga',           c:'#4e6f5f', cost:1.5 },
  { k:'tundra',   name:'Toundra',         c:'#9aa79b', cost:1.4 },
  { k:'snow',     name:'Neiges éternelles', c:'#eef2f5', cost:2.5 },
  { k:'hills',    name:'Collines',        c:'#93995f', cost:1.4 },
  { k:'mountain', name:'Montagnes',       c:'#8a7f72', cost:2.5 },
  { k:'peak',     name:'Hauts sommets',   c:'#e6e6ea', cost:3 },
];
const BI = Object.fromEntries(BIOMES.map((b, i) => [b.k, i]));
const isWaterBiome = b => b <= BI.lake;
const HABITABLE = [BI.grass, BI.forest, BI.steppe, BI.savanna, BI.hills, BI.beach, BI.taiga];

const LOC_TYPES = {
  capitale: { name:'Capitale', icon:'🏰', size:22 },
  ville:    { name:'Ville',    icon:'🏘️', size:18 },
  port:     { name:'Port',     icon:'⚓', size:18 },
  village:  { name:'Village',  icon:'🏠', size:14 },
  donjon:   { name:'Donjon',   icon:'💀', size:17 },
  ruines:   { name:'Ruines',   icon:'🏛️', size:15 },
  grotte:   { name:'Grotte',   icon:'🕳️', size:15 },
  tour:     { name:'Tour',     icon:'🗼', size:16 },
  temple:   { name:'Temple',   icon:'⛩️', size:16 },
  camp:     { name:'Campement', icon:'⛺', size:15 },
  lieu:     { name:'Lieu',     icon:'📍', size:16 },
};

const WORLD_STYLES = {
  nemai:     { name:'Nemaï · carte de référence' },
  continent: { name:'Continent',      fall:0.55, land:0.36, freq:1 },
  archipel:  { name:'Archipel',       fall:0.22, land:0.24, freq:1.9 },
  pangee:    { name:'Grand continent', fall:0.8,  land:0.5,  freq:0.75 },
};

// ---------- Noms ----------
const SYL_A = ['Al','Bel','Cor','Dra','El','Fal','Gal','Hel','Ith','Kar','Lor','Mor','Nor','Or','Pel','Quel','Ra','Sel','Thal','Ul',
               'Val','Wyr','Ys','Zan','Bru','Cal','Dun','Est','Fen','Gor','Hav','Lun','Mar','Ost','Ril','Sar','Tor','Vel','Ard','Ber','Aer','Kel'];
const SYL_B = ['a','e','i','o','an','en','ar','or','el','il','ur','ae','is'];
const SYL_C = ['dor','heim','mont','val','gard','ford','bourg','rive','lune','fort','mère','wyn','ath','or','elle','grad','mar','nor',
               'thas','ris','dell','bruck','haven','court','ac','is','ia','ombre','brume','roc','ville','combe'];
function makeNamer(R) {
  const pick = a => a[Math.floor(R() * a.length)];
  const used = new Set();
  return () => {
    for (let i = 0; i < 20; i++) {
      let n = pick(SYL_A) + (R() < 0.4 ? pick(SYL_B) : '') + pick(SYL_C);
      n = n[0].toUpperCase() + n.slice(1).toLowerCase();
      if (!used.has(n)) { used.add(n); return n; }
    }
    return pick(SYL_A) + pick(SYL_C) + Math.floor(R() * 99);
  };
}
const deName = n => (/^[aeiouyéèêh]/i.test(n) ? "d'" : 'de ') + n;

// ---------- Terrain ----------
function genTerrain(w) {
  const { W, H, seed } = w, N = W * H, S = WORLD_STYLES[w.style] || WORLD_STYLES.continent;
  const fbm = (x, y, oct, k) => {
    let a = 1, f = 1, s = 0, n = 0;
    for (let o = 0; o < oct; o++) { s += a * vnoise(x * f, y * f, 1, seed + k + o * 31); n += a; a *= 0.5; f *= 2.03; }
    return s / n;
  };
  const sc = 1 / 85 * S.freq;
  const e = new Float32Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const nx = x / W * 2 - 1, ny = y / H * 2 - 1, d = 1 - (1 - nx * nx) * (1 - ny * ny);
    let v = fbm(x * sc, y * sc, 6, 0);
    v = v * (1 - S.fall) + (1 - d) * S.fall;
    const ridge = 1 - Math.abs(fbm(x * sc * 1.7, y * sc * 1.7, 4, 77) * 2 - 1);
    v += Math.pow(ridge, 3) * 0.2;
    v -= Math.max(0, d - 0.82) * 2.5;   // bords de la carte = océan
    e[y * W + x] = v;
  }
  // niveau de la mer : quantile qui donne la part de terres voulue
  const sorted = Float32Array.from(e).sort();
  const sea = sorted[Math.floor(N * (1 - S.land))], maxE = sorted[N - 1], minE = sorted[0];
  const h = new Float32Array(N);   // > 0 : altitude des terres (0..1) ; < 0 : profondeur
  for (let i = 0; i < N; i++) h[i] = e[i] >= sea ? (e[i] - sea) / (maxE - sea) : (e[i] - sea) / (sea - minE);

  // océan (relié au bord) / lacs
  const water = new Uint8Array(N);   // 0 terre, 1 océan, 2 lac
  const stack = [];
  for (let x = 0; x < W; x++) { stack.push(x, (H - 1) * W + x); }
  for (let y = 0; y < H; y++) { stack.push(y * W, y * W + W - 1); }
  while (stack.length) {
    const i = stack.pop();
    if (water[i] || h[i] >= 0) continue;
    water[i] = 1;
    const x = i % W, y = (i - x) / W;
    if (x > 0) stack.push(i - 1); if (x < W - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - W); if (y < H - 1) stack.push(i + W);
  }
  for (let i = 0; i < N; i++) if (!water[i] && h[i] < 0) water[i] = 2;

  // rivières : plus forte pente depuis des sources en altitude
  const R = mulberry32(seed + 5), flow = new Uint16Array(N), rivers = [];
  const land = []; for (let i = 0; i < N; i++) if (!water[i]) land.push(i);
  const nSrc = clamp(Math.round(land.length / 1400), 10, 70);
  const cand = land.filter(i => h[i] > 0.32).sort(() => R() - 0.5);
  const srcs = [];
  for (const i of cand) {
    if (srcs.length >= nSrc) break;
    const x = i % W, y = (i - x) / W;
    if (srcs.every(j => Math.hypot(j % W - x, Math.floor(j / W) - y) > 9)) srcs.push(i);
  }
  const N8 = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  for (const s of srcs) {
    const path = [s]; let cur = s;
    for (let step = 0; step < 3000; step++) {
      const x = cur % W, y = (cur - x) / W;
      let best = -1, bv = e[cur];
      for (const [dx, dy] of N8) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx; if (e[j] < bv) { bv = e[j]; best = j; }
      }
      if (best < 0) { water[cur] = 2; break; }       // cuvette : petit lac
      path.push(best); cur = best;
      if (water[best]) break;                         // arrivée à la mer ou dans un lac
    }
    if (path.length >= 6) { path.forEach(i => flow[i]++); rivers.push(path); }
  }

  // humidité : distance à l'eau (océan, lacs, rivières) + bruit
  const dist = new Uint16Array(N).fill(65535), q = [];
  for (let i = 0; i < N; i++) if (water[i] || flow[i]) { dist[i] = 0; q.push(i); }
  for (let k = 0; k < q.length; k++) {
    const i = q[k], x = i % W, y = (i - x) / W, d = dist[i] + 1;
    if (d > 60) continue;
    for (const [dx, dy] of N8.slice(0, 4)) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx; if (dist[j] > d) { dist[j] = d; q.push(j); }
    }
  }
  const biome = new Uint8Array(N), temp = new Float32Array(N), moist = new Float32Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, lat = Math.abs(y / H - 0.5) * 2;
    const hh = Math.max(0, h[i]);
    const t = 1 - lat * 0.95 - hh * 0.55 + (fbm(x * sc * 2, y * sc * 2, 3, 200) - 0.5) * 0.25;
    const m = clamp(0.55 * fbm(x * sc * 1.5, y * sc * 1.5, 4, 300) + 0.5 * Math.exp(-Math.min(dist[i], 60) / 14) - 0.05, 0, 1);
    temp[i] = t; moist[i] = m;
    let b;
    if (water[i] === 2) b = BI.lake;
    else if (water[i] === 1) b = h[i] < -0.35 ? BI.deep : h[i] < -0.08 ? BI.ocean : BI.shallow;
    else if (hh > 0.8) b = BI.peak;
    else if (hh > 0.6) b = t < 0.25 ? BI.peak : BI.mountain;
    else if (t < 0.12) b = BI.snow;
    else if (t < 0.25) b = BI.tundra;
    else if (t < 0.38) b = m > 0.42 ? BI.taiga : BI.tundra;
    else if (hh > 0.44) b = BI.hills;
    else if (t > 0.72) b = m < 0.24 ? BI.desert : m < 0.42 ? BI.savanna : m < 0.68 ? BI.rainforest : BI.jungle;
    else b = m < 0.13 ? BI.desert : m < 0.24 ? BI.steppe : m < 0.5 ? BI.grass : m < 0.76 ? BI.forest : (hh < 0.12 ? BI.swamp : BI.rainforest);
    biome[i] = b;
  }
  // côtes sableuses
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (water[i] || h[i] > 0.04 || temp[i] < 0.3 || biome[i] >= BI.hills) continue;
    if (water[i - 1] === 1 || water[i + 1] === 1 || water[i - W] === 1 || water[i + W] === 1) biome[i] = BI.beach;
  }
  return { W, H, e, h, water, biome, flow, rivers, temp, moist, landCount: land.length };
}

// ---------- Royaumes et lieux (générés une fois, puis modifiables) ----------
function genPlaces(w, t) {
  const { W, H } = t, R = mulberry32(w.seed + 11), name = makeNamer(R), N = W * H;
  const pick = a => a[Math.floor(R() * a.length)];
  const locs = [], at = (x, y) => y * W + x;
  const coastal = (x, y, r = 2) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && t.water[at(nx, ny)] === 1) return true; } return false; };
  const nearRiver = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && t.flow[at(nx, ny)] > 0) return true; } return false; };
  const landCells = []; for (let i = 0; i < N; i++) if (!t.water[i]) landCells.push(i);
  const minDist = (x, y, list) => list.reduce((m, l) => Math.min(m, Math.hypot(l.x - x, l.y - y)), 1e9);

  // place n lieux : meilleur de 40 candidats (score + éloignement des autres lieux)
  function place(type, n, ok, spacing, score = () => 0) {
    const out = [];
    for (let k = 0; k < n; k++) {
      let best = null, bs = -1e9;
      for (let c = 0; c < 40; c++) {
        const i = landCells[Math.floor(R() * landCells.length)], x = i % W, y = (i - x) / W;
        if (!ok(i, x, y)) continue;
        const md = minDist(x, y, locs);
        if (md < spacing) continue;
        const s = score(i, x, y) + Math.min(md, spacing * 3) / spacing + R() * 0.5;
        if (s > bs) { bs = s; best = { x, y, i }; }
      }
      if (!best) continue;
      const loc = { id: 'l' + (locs.length + 1) + '_' + w.seed, type, x: best.x + 0.5, y: best.y + 0.5, name: '', desc: '', notes: '', battle: null };
      locs.push(loc); out.push(loc);
    }
    return out;
  }
  const hab = i => HABITABLE.includes(t.biome[i]);
  const K = clamp(Math.round(t.landCount / 6500), 3, 7);
  const capitals = place('capitale', K, hab, 30, (i, x, y) => (coastal(x, y, 3) ? 1 : 0) + (nearRiver(x, y) ? 1 : 0));

  const region = assignRegions(t, capitals);
  const titles = ['Royaume', 'Duché', 'Marches', 'Principauté', 'Empire', 'Terres', 'Comté', 'Baronnie'];
  const hues = [8, 45, 120, 200, 275, 330, 165, 90];
  const regions = capitals.map((c, r) => ({ name: `${titles[r % titles.length]} ${deName(name())}`, hue: hues[r % hues.length], x: c.x, y: c.y }));

  // villes (côtes et rivières), villages, puis lieux d'aventure
  place('ville', K * 2, hab, 14, (i, x, y) => (coastal(x, y) ? 2 : 0) + (nearRiver(x, y) ? 1.5 : 0));
  place('village', K * 4, hab, 8, (i, x, y) => (nearRiver(x, y) ? 1 : 0));
  const wild = i => [BI.mountain, BI.hills, BI.forest, BI.rainforest, BI.swamp, BI.jungle, BI.taiga, BI.desert].includes(t.biome[i]);
  place('donjon', K + 2, wild, 12);
  place('ruines', K, i => !t.water[i] && t.biome[i] !== BI.peak, 12);
  place('grotte', K, i => [BI.mountain, BI.hills, BI.peak].includes(t.biome[i]), 10);
  place('tour', Math.ceil(K / 2), wild, 14);
  place('temple', Math.ceil(K / 2), i => !t.water[i] && t.biome[i] !== BI.peak, 14);

  locs.forEach(l => {
    const i = at(Math.floor(l.x), Math.floor(l.y)), n = name(), reg = regions[region[i]];
    if (l.type === 'ville' && coastal(Math.floor(l.x), Math.floor(l.y))) l.type = 'port';
    l.name = { capitale: n, ville: n, port: n, village: n,
      donjon: `${pick(['Crypte', 'Antre', 'Donjon', 'Forteresse', 'Catacombes'])} ${deName(n)}`,
      ruines: `Ruines ${deName(n)}`, grotte: `${pick(['Grotte', 'Gouffre', 'Caverne'])} ${deName(n)}`,
      tour: `Tour ${deName(n)}`, temple: `${pick(['Temple', 'Sanctuaire', 'Monastère'])} ${deName(n)}` }[l.type] || n;
    l.pop = { capitale: 20000 + Math.floor(R() * 40000), ville: 3000 + Math.floor(R() * 12000), port: 4000 + Math.floor(R() * 14000),
              village: 120 + Math.floor(R() * 800) }[l.type] || 0;
    const b = BIOMES[t.biome[i]].name.toLowerCase();
    l.desc = {
      capitale: `Capitale ${deName(reg.name)}, siège du pouvoir. ${l.pop.toLocaleString('fr-FR')} habitants. Région : ${b}.`,
      ville: `Ville marchande de ${l.pop.toLocaleString('fr-FR')} habitants, au cœur d'une région de ${b}.`,
      port: `Port de ${l.pop.toLocaleString('fr-FR')} habitants ; navires et marchands de tout le continent.`,
      village: `Petit village de ${l.pop} âmes. Une auberge, quelques fermes, des rumeurs.`,
      donjon: `Lieu maudit au milieu de la ${b}. On dit que des créatures y gardent un trésor.`,
      ruines: `Vestiges d'une cité oubliée. Pierres couvertes de runes.`,
      grotte: `Réseau de cavernes dans la ${b}. Des bruits étranges en sortent la nuit.`,
      tour: `Tour isolée, demeure d'un mage disparu.`,
      temple: `Lieu saint où les voyageurs viennent prier et se soigner.`,
    }[l.type] || '';
  });
  return { locations: locs, regions, name: `Terres ${deName(name())}` };
}

// Royaumes : chaque terre est rattachée à la capitale la plus proche ; montagnes et grands fleuves font frontière
function assignRegions(t, seeds) {
  const { W, H } = t, N = W * H, at = (x, y) => y * W + x;
  const region = new Int16Array(N).fill(-1), cost = new Float32Array(N).fill(Infinity), buckets = [];
  seeds.forEach((c, r) => { const i = at(Math.floor(c.x), Math.floor(c.y)); cost[i] = 0; region[i] = r; (buckets[0] ||= []).push(i); });
  const stepCost = i => 1 + (t.biome[i] === BI.mountain || t.biome[i] === BI.peak ? 9 : t.biome[i] === BI.hills ? 2 : 0) + (t.flow[i] > 2 ? 2 : 0);
  for (let d = 0; d < buckets.length; d++) for (const i of buckets[d] || []) {
    if (cost[i] !== d) continue;
    const x = i % W, y = (i - x) / W;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = at(nx, ny); if (t.water[j]) continue;
      const nd = d + stepCost(j);
      if (nd < cost[j]) { cost[j] = nd; region[j] = region[i]; (buckets[nd] ||= []).push(j); }
    }
  }
  for (let i = 0; i < N; i++) if (!t.water[i] && region[i] < 0) {   // îles isolées : capitale la plus proche
    const x = i % W, y = (i - x) / W; let br = 0, bd = 1e9;
    seeds.forEach((c, r) => { const d = Math.hypot(c.x - x, c.y - y); if (d < bd) { bd = d; br = r; } });
    region[i] = br;
  }
  return region;
}
