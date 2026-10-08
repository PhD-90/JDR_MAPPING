// Règles de jeu (inspirées de D&D 5e) : caractéristiques, races, classes, états, jets de dés.

const ABILITIES = [
  { k:'for', name:'Force',        short:'FOR' },
  { k:'dex', name:'Dextérité',    short:'DEX' },
  { k:'con', name:'Constitution', short:'CON' },
  { k:'int', name:'Intelligence', short:'INT' },
  { k:'sag', name:'Sagesse',      short:'SAG' },
  { k:'cha', name:'Charisme',     short:'CHA' },
];
const POINT_COST = { 8:0, 9:1, 10:2, 11:3, 12:4, 13:5, 14:7, 15:9 };   // répartition de 27 points
const POINT_BUDGET = 27;
const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

// depl = déplacement en cases (1 case = 1,5 m)
const RACES = {
  humain:    { name:'Humain',    bonus:{ for:1, dex:1, con:1, int:1, sag:1, cha:1 }, depl:6, desc:'Polyvalent : +1 à toutes les caractéristiques.' },
  elfe:      { name:'Elfe',      bonus:{ dex:2, sag:1 }, depl:7, desc:'Agile et perceptif, se déplace vite.' },
  nain:      { name:'Nain',      bonus:{ con:2, for:1 }, depl:5, desc:'Robuste et tenace.' },
  halfelin:  { name:'Halfelin',  bonus:{ dex:2, cha:1 }, depl:5, desc:'Petit, discret et chanceux.' },
  demiorc:   { name:'Demi-orc',  bonus:{ for:2, con:1 }, depl:6, desc:'Puissant et endurant.' },
  gnome:     { name:'Gnome',     bonus:{ int:2, con:1 }, depl:5, desc:'Inventif et rusé.' },
  tieffelin: { name:'Tieffelin', bonus:{ cha:2, int:1 }, depl:6, desc:'Héritage infernal, charismatique.' },
  drakeide:  { name:'Drakéide',  bonus:{ for:2, cha:1 }, depl:6, desc:'Descendant des dragons, imposant.' },
};

// de = dé de vie ; atk = caractéristique d'attaque ; prio = ordre de répartition des valeurs
// ca(m) = classe d'armure selon les modificateurs ; spell = dégâts sans modificateur (sort)
const CLASSES = {
  guerrier: { name:'Guerrier', de:10, sprite:'warrior', atk:'for', dmgType:'tranchant', prio:['for','con','dex','sag','cha','int'],
              arme:'Épée longue', degats:'1d8', portee:1, ca: m => 18, armure:'Cotte de mailles + bouclier',
              desc:'Maître des armes, solide en première ligne.' },
  barbare:  { name:'Barbare', de:12, sprite:'warrior', atk:'for', dmgType:'tranchant', prio:['for','con','dex','sag','cha','int'],
              arme:'Hache à deux mains', degats:'1d12', portee:1, ca: m => 10 + m.dex + m.con, armure:'Sans armure (10 + DEX + CON)',
              desc:'Rage au combat, énormément de points de vie.' },
  paladin:  { name:'Paladin', de:10, sprite:'cleric', atk:'for', dmgType:'contondant', prio:['for','cha','con','sag','dex','int'],
              arme:'Marteau de guerre', degats:'1d8', portee:1, ca: m => 18, armure:'Cotte de mailles + bouclier',
              desc:'Guerrier sacré, protège ses alliés.' },
  rodeur:   { name:'Rôdeur', de:10, sprite:'ranger', atk:'dex', dmgType:'perforant', prio:['dex','sag','con','for','int','cha'],
              arme:'Arc long', degats:'1d8', portee:8, saut:2, nage:true, ca: m => 12 + m.dex, armure:'Cuir clouté (12 + DEX)',
              desc:'Archer et pisteur, à l\'aise en pleine nature.' },
  voleur:   { name:'Voleur', de:8, sprite:'ranger', atk:'dex', dmgType:'perforant', prio:['dex','con','int','cha','sag','for'],
              arme:'Rapière', degats:'1d8', portee:1, saut:2, ca: m => 11 + m.dex, armure:'Armure de cuir (11 + DEX)',
              desc:'Discret et précis, frappe là où ça fait mal.' },
  mage:     { name:'Mage', de:6, sprite:'mage', atk:'int', dmgType:'feu', prio:['int','con','dex','sag','cha','for'], spell:true,
              arme:'Trait de feu', degats:'1d10', portee:6, ca: m => 10 + m.dex, armure:'Robe (10 + DEX)',
              desc:'Lanceur de sorts puissant mais fragile.' },
  clerc:    { name:'Clerc', de:8, sprite:'cleric', atk:'for', dmgType:'contondant', prio:['sag','con','for','dex','cha','int'],
              arme:"Masse d'armes", degats:'1d6', portee:1, ca: m => 18, armure:'Cotte de mailles + bouclier',
              desc:'Soigneur et soutien, porte une armure lourde.' },
};

// États affichés sur les figurines ; move0 = ne peut plus se déplacer
const CONDITIONS = [
  { k:'poison',   icon:'🤢', name:'Empoisonné', desc:'désavantage à ses attaques' },
  { k:'etourdi',  icon:'💫', name:'Étourdi', move0:true, desc:'passe son prochain tour ; on l\'attaque avec avantage' },
  { k:'entrave',  icon:'⛓️', name:'Entravé', move0:true, desc:'ne bouge plus ; on l\'attaque avec avantage' },
  { k:'aterre',   icon:'⤵️', name:'À terre', desc:'désavantage à ses attaques ; avantage au contact contre lui' },
  { k:'aveugle',  icon:'🙈', name:'Aveuglé', desc:'désavantage à ses attaques ; on l\'attaque avec avantage' },
  { k:'effraye',  icon:'😱', name:'Effrayé', desc:'désavantage à ses attaques' },
  { k:'feu',      icon:'🔥', name:'En feu', desc:'1d6 dégâts au début de son tour' },
  { k:'invisible',icon:'👻', name:'Invisible', desc:'avantage à ses attaques ; désavantage contre lui' },
  { k:'concentre',icon:'🧠', name:'Concentration' },
  { k:'beni',     icon:'🌟', name:'Béni', desc:'+1d4 aux jets d\'attaque' },
  { k:'rage',     icon:'😡', name:'Rage', desc:'+2 aux dégâts, résistance aux dégâts tranchants, perforants et contondants' },
  { k:'esquive',  icon:'🛡', name:'Esquive', desc:'désavantage aux attaques contre lui jusqu\'à son prochain tour' },
];
const condOf = k => CONDITIONS.find(c => c.k === k);

// XP nécessaire pour atteindre chaque niveau (1 à 20)
const XP_LEVELS = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
const canLevelUp = s => s.camp !== 'monster' && s.level < 20 && (s.xp || 0) >= XP_LEVELS[s.level];

const abilityMod = v => Math.floor((v - 10) / 2);
const fmtMod = m => (m >= 0 ? '+' : '') + m;
const proficiency = lvl => 2 + Math.floor((lvl - 1) / 4);

// ---------- Dés ----------
const rollDie = n => 1 + Math.floor(rngNext() * n);   // rngNext : hasard à graine (engine.js)

// Lance une formule « 2d6+3 », « d20 », « 1d8+1d6-1 » ; crit = dés doublés
function rollDice(formula, crit = false) {
  const f = String(formula || '0').replace(/\s+/g, '').toLowerCase();
  const terms = f.match(/[+-]?[^+-]+/g) || ['0'];
  let total = 0; const parts = [];
  for (const t of terms) {
    const sign = t[0] === '-' ? -1 : 1, body = t.replace(/^[+-]/, '');
    const m = body.match(/^(\d*)d(\d+)$/);
    if (m) {
      const n = (+m[1] || 1) * (crit ? 2 : 1), faces = +m[2], rolls = [];
      for (let i = 0; i < Math.min(n, 100); i++) rolls.push(rollDie(faces));
      const s = rolls.reduce((a, b) => a + b, 0);
      total += sign * s; parts.push((sign < 0 ? '-' : '') + '[' + rolls.join(',') + ']');
    } else if (/^\d+$/.test(body)) {
      total += sign * +body; parts.push((sign < 0 ? '-' : '+') + body);
    } else return { total: NaN, detail: 'formule invalide' };
  }
  return { total: Math.max(0, total), detail: parts.join(' ').replace(/^\+/, '') };
}
const validDice = f => !isNaN(rollDice(f).total);

// Lance 4d6 et garde les 3 meilleurs
function roll4d6() {
  const r = [rollDie(6), rollDie(6), rollDie(6), rollDie(6)].sort((a, b) => b - a);
  return { value: r[0] + r[1] + r[2], rolls: r };
}

// ---------- Fiche de personnage ----------
function newSheet() {
  return { id: 's' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), name: 'Nouveau héros', camp: 'hero',
           sprite: 'warrior', level: 1, race: 'humain', cls: 'guerrier', method: 'points',
           base: { for: 15, dex: 13, con: 14, int: 8, sag: 12, cha: 10 }, weapon: '', notes: '', over: {},
           xp: 0, gold: 10, hpCur: null, inventory: '', items: { potion: 1, ration: 5, torche: 2 }, skills: null, uses: null, hd: null };
}

// Valeurs calculées d'une fiche ; « over » contient les valeurs modifiées à la main
function sheetDerived(s) {
  const race = RACES[s.race] || RACES.humain, cls = CLASSES[s.cls] || CLASSES.guerrier, lvl = clamp(s.level || 1, 1, 20);
  const score = {}, mod = {};
  ABILITIES.forEach(({ k }) => { score[k] = (s.base[k] || 10) + (race.bonus[k] || 0); mod[k] = abilityMod(score[k]); });
  const prof = proficiency(lvl), am = mod[cls.atk];
  const hpMax = Math.max(1, cls.de + mod.con + (lvl - 1) * (Math.floor(cls.de / 2) + 1 + mod.con));
  const calc = {
    pv: hpMax, ca: cls.ca(mod), init: mod.dex, toucher: prof + am,
    degats: cls.degats + (cls.spell || am === 0 ? '' : fmtMod(am)),
    deplacement: race.depl, portee: cls.portee, saut: cls.saut ?? 1, nage: !!cls.nage, vol: false,
  };
  const val = { ...calc };
  for (const [k, v] of Object.entries(s.over || {})) if (v !== '' && v !== undefined && v !== null) val[k] = v;
  return { race, cls, lvl, score, mod, prof, calc, val };
}

// Coût en points de la répartition (null si une valeur sort de 8..15)
function pointCost(base) {
  let t = 0;
  for (const { k } of ABILITIES) { const c = POINT_COST[base[k]]; if (c === undefined) return null; t += c; }
  return t;
}
