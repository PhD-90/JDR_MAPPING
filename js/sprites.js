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
  goblin: { name:'Gobelin', kind:'monster', size:1, category:'small',
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

  // ----- Petits : un socle d'une case, une silhouette plus compacte -----
  kobold: { name:'Kobold', kind:'monster', size:1, category:'small', drawScale:0.8, role:'escarmoucheur',
    pal:{ O:'#c77838', o:'#e4a557', r:'#f7df57', B:'#654832' },
    half:['........','..k...kk','..kOkkOO','...kOOOO','...kOrOO','....kOOo','...kOOOO','....kwkk',
          '....kOBB','...kOOBB','..kOkBBB','..kO.kBB','.....kBB','....kOO.','....kOk.','...kkk..'],
    patches:[{x:13,y:3,rows:['M','M','T','T','T','T','T','T','T','T','T']}] },
  rat: { name:'Rat géant', kind:'monster', size:1, category:'small', drawScale:0.85,
    pal:{ G:'#8c7765', g:'#b29b80', P:'#d79b9a', r:'#ec5949' },
    rows:['................','................','................','................','....kk..........',
          '...kPPk.........','...kPGGkkkk.....','..kGGgGGGGGk....','.kGrGGGGGGGGk...',
          'kGGGGGGGGGGGGk..','kPkkGGGGGGGGGk..','.k..kGGGGGGGGk..','.....kGGGGGGkPk.',
          '.....kGk.kGk..kP','....kPPk.kPPk.kP','.....kk...kk..k.'] },
  bat: { name:'Chauve-souris', kind:'monster', size:1, category:'small', drawScale:0.85, role:'escarmoucheur',
    pal:{ P:'#796287', p:'#4b3c61', r:'#f2b554' },
    half:['........','.....k.k','k....kPk','kk...kPr','kPk..kPP','kPPkkPPP','kPpPPPPP','kPPpPPPP',
          'kPpPpPPP','.kPpPPPP','..kPkkPP','...k.kPP','.....kPk','......k.','........','........'] },
  imp: { name:'Diablotin', kind:'monster', size:1, category:'small', drawScale:0.8, role:'tireur',
    pal:{ R:'#b84b49', D:'#6e3039', y:'#f9cd64' },
    half:['....k...','....kRkk','.....kRR','....kRyR','....kRRR','k...kwRR','Dk...kRR','DDk.kRRR',
          'DDDDkRRR','kDDDkRRR','.kDDkRRR','..kkkRRR','....kRRR','....kRk.','...kRRk.','...kkkk.'],
    patches:[{x:13,y:6,rows:['Y.Y','YYY','.T.','.T.','.T.','.T.','.T.']}] },
  fire_beetle: { name:'Scarabée de feu', kind:'monster', size:1, category:'small', drawScale:0.8,
    pal:{ B:'#993f28', O:'#e98227', y:'#ffdc64', D:'#512e27' },
    half:['........','...k....','...k...k','....k.kO','.....kOy','...kkOOO','..k..kBB','.k..kBOO',
          '...kkOOy','..k.kBOO','.k..kBOO','...kkBBB','..k..kBB','.k....kk','........','........'] },

  // ----- Moyens : une case -----
  bandit: { name:'Bandit', kind:'monster', size:1,
    pal:{ H:'#696375', h:'#908599', B:'#5f4c3c', b:'#423729', L:'#3d3546' },
    half:['......kk','.....kHH','....kHhH','....kHHH','....kkss','....kses','....kHHH','...kkBBB',
          '..kBBBbB','..kBkBBB','..kskYYY','...kkBBB','....kBBb','....kLLk','....kLLk','...kFFFk'],
    patches:[{x:1,y:6,rows:['..T','.T.','T..','T..','T..','.T.','..T']}] },
  zombie: { name:'Zombie', kind:'monster', size:1,
    pal:{ G:'#8a9a6a', g:'#b3bd89', E:'#eee0a3', B:'#76567a', D:'#4d3f51' },
    half:['......kk','.....kGG','....kGgG','....kGGG','....kGEG','....kGGG','.....kwG','...kkBBB',
          '..kBBBBB','.kGGkBBB','.kG.kBDB','..k.kBBB','....kDBD','....kBDk','....kGGk','...kGGGk'] },
  ghoul: { name:'Goule', kind:'monster', size:1, role:'escarmoucheur',
    pal:{ G:'#91aeb4', g:'#c4d0c5', r:'#ca4259', D:'#383f60' },
    half:['......kk','.....kGG','....kGgG','....kGGG','....kGrG','....kGGG','....kwww','.....kGG',
          '..kkGGGG','.kGGkGGG','.kG.kDDD','kwk.kDDD','w.w.kDDD','....kGk.','....kGk.','...kwww.'] },
  gnoll: { name:'Gnoll', kind:'monster', size:1,
    pal:{ B:'#b39659', b:'#79653d', r:'#e2b33c', A:'#684438', D:'#453326' },
    half:['...k....','...kBkkk','....kBbB','....kBBB','...kBrBB','..kBBBBB','...kwwBB','....kBBB',
          '..kkBAAA','.kBBkAAA','.kBkAAAA','.kwk.AAA','....kDDD','....kBBk','...kBBk.','...kwww.'],
    patches:[{x:13,y:3,rows:['kMM','MMM','kMM','.T.','.T.','.T.','.T.','.T.']}] },
  lizardfolk: { name:'Homme-lézard', kind:'monster', size:1,
    pal:{ G:'#448575', g:'#73b796', y:'#eacd5e', B:'#907448' },
    half:['.......y','......kG','.....kGg','....kGGG','....kGyG','...kGGGG','....kwww','....kGGB',
          '..kkGGGB','.kGGkGGB','.kG.kBBB','.kw.kGGB','....kGGG','....kGkk','...kGGk.','...kwww.'],
    patches:[{x:13,y:1,rows:['.M.','MMM','.T.','.T.','.T.','.T.','.T.','.T.','.T.','.T.','.T.','.T.','.T.']}] },

  // ----- Gros : 2 × 2 cases, ou 3 × 3 pour le géant -----
  ogre: { name:'Ogre', kind:'monster', size:2,
    pal:{ S:'#bd946a', s:'#d6b183', r:'#5b3828', B:'#715744', D:'#4a382d' },
    half:['......kk','.....kSS','....kSSS','....kSrS','....kSSS','....kwSS','...kkSSS','..kSSSSS',
          '.kSSkSSS','.kSSkSSS','.kSSkSSS','..kkBBBB','...kBDBB','...kSSkk','...kSSk.','..kkkkk.'],
    patches:[{x:13,y:2,rows:['TTT','TFT','TTT','TTT','.T.','.T.','.T.','.T.','.T.']}] },
  troll: { name:'Troll', kind:'monster', size:2,
    pal:{ G:'#60957a', g:'#8bbb88', r:'#efd866', D:'#425147' },
    half:['......kk','.....kGG','...kkGgG','..kGGGrG','..kGGGGG','..kGGkwG','..kGGGGG','.kGGGGGG',
          '.kGGkGGG','.kGGkGGG','.kGGkGGG','.kGGkDDD','.kwk.kDD','w.w..kGG','.....kGk','....kwww'] },
  minotaur: { name:'Minotaure', kind:'monster', size:2,
    pal:{ B:'#9c694b', b:'#c08c5b', r:'#d74c36', D:'#46383b', W:'#e0d0a3', H:'#a2a9ad' },
    half:['..k.....','..kWk.kk','...kWkBB','....kBBB','...kBrBB','...kBBBB','....kbbb','...kkBBB',
          '..kBBBDD','.kBBkDDD','.kBBkDDD','..kkDYYY','...kDDDD','...kBBkk','...kBBk.','..kDDDD.'],
    patches:[{x:13,y:4,rows:['MMM','MHM','MMM','.T.','.T.','.T.','.T.','.T.']}] },
  stone_golem: { name:'Golem de pierre', kind:'monster', size:2,
    pal:{ G:'#8d9294', g:'#b7b9b0', D:'#596269', E:'#71dcdb', Y:'#bfa673' },
    half:['.....kkk','....kGgG','....kGGG','....kGEG','....kGGG','.....kGG','..kkkGGG','.kGGGGGY',
          '.kGgkGGY','.kGGkYYY','.kGGkGGY','..kkkGGG','....kGDG','....kGGk','....kGGk','...kGGGk'] },
  hill_giant: { name:'Géant des collines', kind:'monster', size:3,
    pal:{ S:'#bb8f73', s:'#d1aa83', H:'#635041', B:'#777356', D:'#4c493b', r:'#684a34' },
    half:['.....kkk','....kHHH','....kSSS','....kSrS','....kSSS','....kHHH','...kkSHH','..kSSBBB',
          '.kSSkBBB','.kSSkBBB','.kSSkBBB','..kkBBBB','...kBDBB','...kSSkk','...kSSk.','..kDDDD.'],
    patches:[{x:12,y:1,rows:['.TTT','TTFT','TTTT','.TT.','.TT.','.TT.','.TT.','.TT.','.TT.','.TT.']}] },
};

const SPRITE_SIZES = { small:'Petit', medium:'Moyen', large:'Gros' };
const spriteSizeCategory = key => SPRITES[key].category || (SPRITES[key].size > 1 ? 'large' : 'medium');
const spriteSizeLabel = key => `${SPRITE_SIZES[spriteSizeCategory(key)]} · ${SPRITES[key].size} × ${SPRITES[key].size} case${SPRITES[key].size > 1 ? 's' : ''}`;

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
