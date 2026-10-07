// Personnages et monstres en pixel art (16x16).
// `half` : moitié gauche (8 colonnes) recopiée en miroir ; `rows` : sprite complet.
// `patches` : pixels ajoutés par-dessus (armes...), '.' = transparent.

const BASE_PAL = { k:'#1b1b22', s:'#f1c27d', e:'#1b1b22', M:'#d8dde6', T:'#7a4a24', Y:'#e8b830', F:'#3a2414', w:'#f4f4f4' };

const SPRITES = {
  // ----- Personnages -----
  warrior: { name:'Guerrier', kind:'hero', size:1,
    pal:{ H:'#aab0bb', h:'#e4e7ec', B:'#2f5fb8', b:'#22468a', L:'#5a3a20', R:'#b83a2f' },
    half:['......kk','.....kHH','....kHhH','....kHHH','....kkss','....kses','....ksss','...kkBBB',
          '..kBBBbB','..kBkBBB','..kskYYY','...kkBBB','....kBBb','....kLLk','....kLLk','...kFFFk'],
    patches:[{ x:11, y:1, rows:['.M.','.M.','.M.','.M.','.M.','.M.','.M.','YYY','.T.'] },
             { x:0, y:7, rows:['.kk.','kRRk','kRYk','kRRk','.kk.'] }] },
  mage: { name:'Mage', kind:'hero', size:1,
    pal:{ P:'#6a3fb0', p:'#4e2d86', W:'#e8e8e8', O:'#4fd8ff', o:'#c8f6ff' },
    half:['.......k','......kP','.....kPP','....kPPP','.kkPPPPP','....ksss','....kses','....kWWW',
          '...kPWWW','..kPPPWW','..ksPPPY','...kPPPP','...kPPPp','..kPPPPp','..kPPPPP','...kkkkk'],
    patches:[{ x:13, y:1, rows:['kOk','OoO','kOk','.T.','.T.','.T.','.T.','.T.','.T.','.T.','.T.','.T.','.T.','.T.'] }] },
  ranger: { name:'Rôdeuse', kind:'hero', size:1,
    pal:{ G:'#2f7a3a', g:'#4fa35a', L:'#8a5a30', D:'#4a3a2a' },
    half:['......kk','.....kGG','....kGgG','...kGGGG','...kGGss','...kGses','...kGsss','...kGGLL',
          '..kGGLLL','..kGkLLL','..kskYYY','...kkLLL','....kLLL','....kDDk','....kDDk','...kFFFk'],
    patches:[{ x:0, y:3, rows:['..T','.T.','T..','T..','T..','T..','T..','.T.','..T'] }] },
  cleric: { name:'Clerc', kind:'hero', size:1,
    pal:{ R:'#7a4a2a', W:'#ece6d6' },
    half:['......kk','.....kRR','....kRRR','....kRRR','....kRss','....kses','....ksss','...kkWWW',
          '..kWWWWY','..kWkWWY','..kskYYY','...kkWWW','...kWWWY','...kWWWY','...kWWWW','...kkkkk'],
    patches:[{ x:12, y:5, rows:['kMk','MMM','kMk','.T.','.T.','.T.'] }] },

  // ----- Monstres -----
  goblin: { name:'Gobelin', kind:'monster', size:1,
    pal:{ g:'#5aa040', r:'#ff3030', L:'#7a5a30' },
    half:['........','........','........','.k...kkk','.kgk.kgg','..kgkggg','...kgrgg','...kgggg',
          '....kwkw','....kgLL','...kgkLL','...kg.kL','....kLLL','....kgkk','....kgk.','...kkk..'],
    patches:[{ x:12, y:7, rows:['M','M','T'] }] },
  skeleton: { name:'Squelette', kind:'monster', size:1,
    pal:{ W:'#e8e4d4' },
    half:['......kk','.....kWW','....kWWW','....kWWW','....kWkW','....kWWW','.....kWk','.....kWW',
          '...kkWkW','..kW.kWW','..kW.WkW','..kW.kWW','....kWWk','....kW..','....kW..','...kWW..'],
    patches:[{ x:1, y:5, rows:['M','M','M','M','T'] }] },
  slime: { name:'Slime', kind:'monster', size:1,
    pal:{ g:'#62d26a', G:'#3a9a44', w:'#d8ffd8' },
    half:['........','........','........','........','........','........','........','........',
          '......kk','....kkgg','...kgggg','..kgwggg','..kggegg','.kgggggg','.kGggggg','..kkkkkk'] },
  orc: { name:'Orc', kind:'monster', size:1,
    pal:{ G:'#6f8f4a', r:'#ff3030', A:'#7a5030', D:'#4a3020' },
    half:['........','.....kkk','....kGGG','...kGGGG','...kGrGG','...kGGGG','...kGwkk','..kkkGGG',
          '.kGGkAAA','.kGGkAAA','.kGkkAAA','.kGk.AAA','...kDDDD','...kGGkk','...kGGk.','..kkkkk.'],
    patches:[{ x:13, y:2, rows:['kMM','MMM','kMM','.T.','.T.','.T.','.T.','.T.','.T.'] }] },
  wolf: { name:'Loup', kind:'monster', size:1,
    pal:{ G:'#8a8f99', g:'#6a6f78', r:'#ffcc30' },
    rows:['................','................','................','................','................',
          '..k.k...........','.kGkGk..........','kGGrGGkkkkkkk..k','kGGGGGGGGGGGGkGk','.kwkGGGGGGGGGGk.',
          '..kkGgGGGGGGgGk.','....kGGGGGGGGk..','....kGk.kGk.kGk.','....kGk..kGk.kGk','....kGk..kGk.kGk',
          '....kkk..kkk.kkk'] },
  dragon: { name:'Dragon', kind:'monster', size:2,
    pal:{ R:'#c0392b', D:'#7a1f1a', y:'#ffd84a', Y:'#e8a860' },
    half:['.....k..','.....kk.','......kk','k....kRR','Dk...kyR','DDk..kRR','DDDk.kwR','DDDDkkRR',
          'kDDDkRRR','.kDDkRYY','..kkRRYY','...kRRYY','...kRRRR','...kRkkR','..kRRk.k','..kkkk..'] },
};

const spriteCache = {};
function spriteCanvas(key) {
  if (spriteCache[key]) return spriteCache[key];
  const d = SPRITES[key], pal = { ...BASE_PAL, ...d.pal };
  const rows = d.half ? d.half.map(h => h + [...h].reverse().join('')) : d.rows;
  const grid = rows.map(r => r.padEnd(16, '.').split(''));
  (d.patches || []).forEach(p => p.rows.forEach((r, j) => [...r].forEach((ch, i) => {
    if (ch !== '.' && grid[p.y + j]) grid[p.y + j][p.x + i] = ch;
  })));
  const c = document.createElement('canvas'); c.width = 16; c.height = 16;
  const g = c.getContext('2d');
  grid.forEach((r, y) => r.forEach((ch, x) => {
    if (ch === '.' || !pal[ch]) return;
    g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1);
  }));
  return spriteCache[key] = c;
}
// Silhouette colorée du sprite (éclair quand une figurine est touchée)
function spriteTint(key, color) {
  const id = key + color;
  if (spriteCache[id]) return spriteCache[id];
  const c = document.createElement('canvas'); c.width = 16; c.height = 16;
  const g = c.getContext('2d');
  g.drawImage(spriteCanvas(key), 0, 0);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, 16, 16);
  return spriteCache[id] = c;
}
// Petite icône <canvas> pour les palettes et listes
function spriteIcon(key, px) {
  const c = document.createElement('canvas'); c.width = 16; c.height = 16;
  c.className = 'px'; c.style.width = c.style.height = px + 'px';
  c.getContext('2d').drawImage(spriteCanvas(key), 0, 0);
  return c;
}
