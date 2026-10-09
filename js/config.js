// Définitions des sols et des éléments posables.

const T = 48; // taille d'une case en unités monde

const FLOORS = {
  stone: { name:'Pierre',  c:'#817b6e', deco:'stone' },
  tiles: { name:'Dalles',  c:'#aa987b', deco:'tiles' },
  grass: { name:'Herbe',   c:'#697e4f', deco:'grass' },
  dirt:  { name:'Terre',   c:'#94704a', deco:'earth' },
  sand:  { name:'Sable',   c:'#d2bb87', deco:'earth' },
  wood:  { name:'Parquet', c:'#a07849', deco:'planks' },
  water: { name:'Eau',     c:'#487e8b', deco:'water' },
  lava:  { name:'Lave',    c:'#d4501e', deco:'water' },
  snow:  { name:'Neige',   c:'#e7e6dc', deco:'stone' },
  cobble:{ name:'Pavés',   c:'#918672', deco:'cobble' },
  cave:  { name:'Roche',   c:'#5e594e', deco:'stone' },
  mud:   { name:'Boue',    c:'#65523a', deco:'earth' },
  ice:   { name:'Glace',   c:'#a9d3e6', deco:'water' },
  void:  { name:'Vide',    c:'#0d0e11', deco:null },
};

const OBJECTS = {
  wall:    { name:'Mur',      shape:'wall',   c:'#8b8b93', e:2,   w:1, h:1 },
  house:   { name:'Maison',   shape:'house',  c:'#8e3b2f', e:2.4, w:3, h:2 },
  crate:   { name:'Caisse',   shape:'crate',  c:'#a87a45', e:0.9, w:1, h:1 },
  rock:    { name:'Rocher',   shape:'rock',   c:'#7a766f', e:1,   w:1, h:1 },
  tree:    { name:'Arbre',    shape:'tree',   c:'#3f7a35', e:2.2, w:1, h:1 },
  pillar:  { name:'Colonne',  shape:'pillar', c:'#c9c3b5', e:2.6, w:1, h:1 },
  barrel:  { name:'Tonneau',  shape:'barrel', c:'#8a5a2b', e:1,   w:1, h:1 },
  table:   { name:'Table',    shape:'table',  c:'#8a5a30', e:0.8, w:2, h:1 },
  chest:   { name:'Coffre',   shape:'chest',  c:'#b0742f', e:0.7, w:1, h:1 },
  stairs:  { name:'Escalier', shape:'stairs', c:'#9c958a', e:1,   w:1, h:2 },
  hero:    { name:'Héros',    shape:'token',  c:'#2f6fd6', e:0.3, w:1, h:1, label:'H' },
  monster: { name:'Monstre',  shape:'token',  c:'#c0392b', e:0.3, w:1, h:1, label:'M' },
  npc:     { name:'PNJ',      shape:'token',  c:'#d4a017', e:0.3, w:1, h:1, label:'P' },
  boss:    { name:'Boss',     shape:'token',  c:'#7d3c98', e:0.4, w:2, h:2, label:'B' },
};
