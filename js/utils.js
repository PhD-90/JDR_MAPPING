// Fonctions utilitaires : couleurs, bruit, aléatoire.

function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (f <= 1) { r *= f; g *= f; b *= f; }
  else { const t = f - 1; r += (255 - r) * t; g += (255 - g) * t; b += (255 - b) * t; }
  return '#' + [r, g, b].map(v => (v | 0).toString(16).padStart(2, '0')).join('');
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function vnoise(x, y, s, seed) {
  const fx = x / s, fy = y / s, ix = Math.floor(fx), iy = Math.floor(fy);
  const tx = fx - ix, ty = fy - iy, sx = tx*tx*(3 - 2*tx), sy = ty*ty*(3 - 2*ty);
  const h = (a, b) => hash(a + seed*7919, b + seed*3571);
  const a = h(ix, iy), b = h(ix + 1, iy), c = h(ix, iy + 1), d = h(ix + 1, iy + 1);
  return a + (b - a)*sx + (c - a)*sy + (a - b - c + d)*sx*sy;
}

// Minuscules sans accents, pour comparer des noms (« Rôdeuse » == « rodeuse »)
const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
