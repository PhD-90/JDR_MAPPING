// Onglet « Outils MJ » : générateurs (rencontres équilibrées, PNJ, trésors, quêtes, rumeurs, tavernes, météo),
// notes de session et aide-mémoire des règles.

const pickR = a => a[Math.floor(Math.random() * a.length)];
const cap1 = s => s[0].toUpperCase() + s.slice(1);
let gmHistory = [];

// ---------- Rencontres ----------
// Seuils d'XP par personnage (facile, moyenne, difficile, mortelle) selon le niveau — Guide du maître D&D 5e
const XP_THRESH = { 1:[25,50,75,100], 2:[50,100,150,200], 3:[75,150,225,400], 4:[125,250,375,500], 5:[250,500,750,1100],
  6:[300,600,900,1400], 7:[350,750,1100,1700], 8:[450,900,1400,2100], 9:[550,1100,1600,2400], 10:[600,1200,1900,2800],
  11:[800,1600,2400,3600], 12:[1000,2000,3000,4500], 13:[1100,2200,3400,5100], 14:[1250,2500,3800,5700], 15:[1400,2800,4300,6400],
  16:[1600,3200,4800,7200], 17:[2000,3900,5900,8800], 18:[2100,4200,6300,9500], 19:[2400,4900,7300,10900], 20:[2800,5700,8500,12700] };
const DIFFS = ['Facile', 'Moyenne', 'Difficile', 'Mortelle'];
const groupMult = n => n <= 1 ? 1 : n === 2 ? 1.5 : n <= 6 ? 2 : n <= 10 ? 2.5 : n <= 14 ? 3 : 4;
const ENV = {
  forest:  { name: 'Forêt',     w: { wolf:3, goblin:3, orc:2, slime:1, kobold:2, rat:1, bandit:2, gnoll:2, ogre:0.7, troll:0.5 } },
  dungeon: { name: 'Donjon',    w: { skeleton:3, goblin:2, slime:2, orc:1, dragon:0.3, rat:2, zombie:2, ghoul:1.5, imp:1, minotaur:0.6, stone_golem:0.4 } },
  cave:    { name: 'Grotte',    w: { slime:3, goblin:2, orc:2, skeleton:1, dragon:0.3, kobold:3, bat:3, fire_beetle:2, ogre:1, troll:0.5 } },
  city:    { name: 'Ville',     w: { goblin:2, orc:1, skeleton:1, rat:3, bandit:4, zombie:1, imp:0.5, stone_golem:0.2 } },
  plain:   { name: 'Plaine',    w: { wolf:2, orc:2, goblin:2, bandit:2, gnoll:3, ogre:1, minotaur:0.5, hill_giant:0.4 } },
  desert:  { name: 'Désert',    w: { skeleton:2, slime:1, orc:1, kobold:2, fire_beetle:2, gnoll:3, minotaur:0.5, stone_golem:0.3 } },
  snow:    { name: 'Neige',     w: { wolf:3, orc:1, skeleton:1, bandit:1, zombie:1, ogre:1, troll:0.6, hill_giant:0.5 } },
  swamp:   { name: 'Marais',    w: { slime:3, skeleton:2, goblin:1, rat:2, zombie:2, ghoul:2, lizardfolk:4, troll:1 } },
  volcano: { name: 'Volcan',    w: { dragon:0.6, orc:2, slime:1, skeleton:1, fire_beetle:3, imp:3, kobold:2, stone_golem:0.5, hill_giant:0.3 } },
};
function partyInfo() {
  const heroes = sheets.filter(s => s.camp !== 'monster');
  const lvl = heroes.length ? Math.round(heroes.reduce((a, s) => a + s.level, 0) / heroes.length) : 1;
  return { n: Math.max(1, heroes.length), lvl };
}
function currentEnv() {
  const l = map.locId && world ? world.locations.find(x => x.id === map.locId) : null;
  if (l && typeof presetForLoc === 'function') { const p = presetForLoc(l); return p === 'tavern' ? 'city' : p; }
  return 'forest';
}
function genEncounter(env, diff, n, lvl) {
  const th = XP_THRESH[clamp(lvl, 1, 20)], target = th[diff] * n, maxT = (th[diff + 1] || th[3] * 1.5) * n;
  const pool = Object.entries(ENV[env].w).map(([k, w]) => ({ k, w, xp: spriteCombat(k).xp || 50 })).filter(m => m.xp <= maxT);
  if (!pool.length) pool.push({ k: 'goblin', w: 1, xp: 50 });
  const tw = pool.reduce((s, m) => s + m.w, 0), pickM = () => { let r = Math.random() * tw; for (const m of pool) if ((r -= m.w) <= 0) return m; return pool[0]; };
  let best = null;
  for (let t = 0; t < 300; t++) {
    const group = [];
    while (group.length < 12) {
      group.push(pickM());
      const adj = group.reduce((s, m) => s + m.xp, 0) * groupMult(group.length);
      if (adj >= target) break;
    }
    const raw = group.reduce((s, m) => s + m.xp, 0), adj = raw * groupMult(group.length);
    const score = Math.abs(adj - target) + (adj > maxT ? 1e6 : 0);
    if (!best || score < best.score) best = { group, raw, adj, score };
  }
  const counts = {};
  best.group.forEach(m => { counts[m.k] = (counts[m.k] || 0) + 1; });
  return { env, diff, n, lvl, counts, raw: best.raw, adj: Math.round(best.adj), target };
}

// Case libre (sol praticable, sans obstacle ni figurine) la plus proche
function freeSpot(x0, y0, size = 1) {
  const { objCost } = terrainGrids(), bad = ['water', 'lava', 'void'];
  for (let r = 0; r < Math.max(map.cols, map.rows); r++)
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = x0 + dx, y = y0 + dy;
      if (x < 0 || y < 0 || x + size > map.cols || y + size > map.rows) continue;
      let ok = true;
      for (let j = y; j < y + size && ok; j++) for (let i = x; i < x + size && ok; i++) {
        const k = j * map.cols + i;
        if (bad.includes(map.floor[k]) || !isFinite(objCost[k])) ok = false;
        if (map.units.some(u => i >= u.x && i < u.x + u.size && j >= u.y && j < u.y + u.size)) ok = false;
      }
      if (ok) return [x, y];
    }
  return null;
}
// Pose les monstres de la rencontre sur la carte (celle du MJ ou une copie de test), loin des personnages
function spawnEncounter(enc, hidden) {
  invalidateZones();
  const heroes = map.units.filter(u => unitKind(u) === 'hero');
  const hx = heroes.length ? heroes.reduce((s, u) => s + u.x, 0) / heroes.length : 0;
  const hy = heroes.length ? heroes.reduce((s, u) => s + u.y, 0) / heroes.length : map.rows / 2;
  let anchor = [map.cols - 3, Math.floor(map.rows / 2)], bd = -1;
  for (let k = 0; k < 60; k++) {
    const s = freeSpot(Math.floor(Math.random() * map.cols), Math.floor(Math.random() * map.rows));
    if (s) { const d = Math.hypot(s[0] - hx, s[1] - hy); if (d > bd) { bd = d; anchor = s; } }
  }
  const placed = [];
  Object.entries(enc.counts).forEach(([k, n]) => {
    for (let i = 0; i < n; i++) {
      const s = freeSpot(anchor[0], anchor[1], SPRITES[k].size); if (!s) continue;
      const u = addUnit(k, s[0], s[1]); u.hidden = !!hidden; placed.push(u);
      invalidateZones();
    }
  });
  return placed;
}
function placeEncounter(enc, hidden) {
  pushUndo();
  const placed = spawnEncounter(enc, hidden);
  addLog(`🎲 Rencontre (${DIFFS[enc.diff].toLowerCase()}) : ${encText(enc)}${hidden ? ' — cachée aux joueurs' : ''}`, 'round');
  changed();
  setMode('play'); fit();
  return placed;
}
// Copie de la carte en cours (ou carte vide) avec le groupe et la rencontre, pour la simuler
function encounterTestMap(enc) {
  const saved = map;
  map = simBase(saved.units.length || saved.objects.length ? saved : newMap(22, 14));
  map.units = map.units.filter(u => unitKind(u) === 'hero');
  if (!map.units.length) sheets.filter(s => s.camp !== 'monster' && !s.dead).forEach((s, i) => {
    invalidateZones(); const sp = freeSpot(2 + (i % 2) * 2, 3 + (i >> 1) * 2, SPRITES[s.sprite].size); if (sp) addUnit('sheet:' + s.id, sp[0], sp[1]);
  });
  spawnEncounter(enc, false);
  const test = map; map = saved; invalidateZones();
  return test;
}
const encText = enc => Object.entries(enc.counts).map(([k, n]) => `${n} × ${SPRITES[k].name}`).join(', ');

// ---------- PNJ ----------
const NPC = {
  pre: ['Al','Ber','Ca','Dor','El','Fi','Ga','Hil','Is','Jo','Ka','Lé','Ma','Ni','O','Pé','Ro','Sa','Ti','Ul','Va','Wil','Ys','Zé','Bri','Cé','Gwen','Mé','Tho','Ar'],
  mid: ['', '', 'ra', 'li', 'no', 'de', 'mi', 'ri', 'go', 'la'],
  end: ['n','a','ric','lle','th','s','ne','o','mir','bert','wen','dor','ia','las','line','mund','ard','elle','win'],
  job: ['aubergiste','forgeron','garde','marchande','prêtre','voleuse','mendiant','noble','alchimiste','chasseuse','barde','scribe',
        'capitaine de la garde','contrebandier','herboriste','mercenaire','fermière','pêcheur','bibliothécaire','diseuse de bonne aventure','cartographe','tavernière'],
  look: ['une cicatrice sur la joue','des yeux vairons','des tatouages runiques','un crâne chauve et une longue barbe','de longs cheveux tressés',
         'une légère claudication','une pipe toujours à la bouche','des vêtements bien trop élégants','une voix rauque','un sourire édenté',
         'des bijoux clinquants','un regard fuyant','les mains couvertes d\'encre','une odeur de soufre','un bandeau sur l\'œil','des taches de rousseur'],
  trait: ['jovial','méfiant','avare','généreux','nerveux','arrogant','timide','bavard','colérique','mélancolique','curieux','superstitieux','loyal','opportuniste'],
  goal: ['rembourser une dette','venger un proche','protéger sa famille','devenir riche','retrouver un objet perdu','quitter la ville au plus vite',
         'gagner le respect des siens','servir son dieu','percer un secret ancien','obtenir le pardon'],
  secret: ['travaille pour la guilde des voleurs','est recherché dans un autre royaume','cache un enfant illégitime','a vu le meurtre de la semaine dernière',
           'appartient à un culte interdit','est en réalité de sang noble','doit une faveur à un dragon','est un métamorphe',
           'connaît un passage secret sous la ville','n\'a rien à cacher... vraiment'],
};
const npcName = () => cap1((pickR(NPC.pre) + pickR(NPC.mid) + pickR(NPC.end)).toLowerCase());
function genNPC() {
  const race = pickR(Object.keys(RACES));
  const n = { name: `${npcName()} ${typeof makeNamer === 'function' ? makeNamer(Math.random)() : npcName()}`, race,
    job: pickR(NPC.job), look: pickR(NPC.look), trait: pickR(NPC.trait), trait2: pickR(NPC.trait), goal: pickR(NPC.goal), secret: pickR(NPC.secret) };
  n.text = `${n.name} — ${RACES[race].name.toLowerCase()}, ${n.job}.\nSigne distinctif : ${n.look}.\nCaractère : ${n.trait}${n.trait2 !== n.trait ? ', ' + n.trait2 : ''}.\n` +
           `Veut : ${n.goal}.\nSecret : ${n.secret}.`;
  return n;
}

// ---------- Trésors ----------
const LOOT = [
  { t: 0, items: ['une potion de soins (2d4+2 PV)', 'une corde en soie de 15 m', 'une gemme bleue (10 po)', 'un parchemin de *Sommeil*', 'une dague ouvragée (25 po)',
                  'une fiole d\'huile de feu', 'une carte au trésor déchirée', 'un anneau en argent (15 po)', 'une bourse de dés truqués'] },
  { t: 1, items: ['une potion de soins majeure (4d4+4 PV)', 'une épée +1', 'une cape de protection (+1 CA)', 'un sac sans fond', 'une baguette de projectiles magiques',
                  'des bottes elfiques', 'une statuette de jade (250 po)', 'un parchemin de *Boule de feu*', 'un bouclier +1'] },
  { t: 2, items: ['une potion de soins supérieure (8d4+8 PV)', 'une arme +2', 'un anneau de résistance', 'une baguette de foudre', 'une couronne sertie (2 500 po)',
                  'un manteau de déplacement', 'un tapis volant', 'une armure +1'] },
  { t: 3, items: ['une arme +3', 'une potion de soins suprême (10d4+20 PV)', 'un bâton de pouvoir', 'une ceinture de force de géant', 'un sceptre royal (7 500 po)', 'un anneau de régénération'] },
];
function genTreasure(lvl) {
  const tier = lvl <= 4 ? 0 : lvl <= 10 ? 1 : lvl <= 16 ? 2 : 3;
  const gold = rollDice(['4d6', '2d6x10', '4d6x10', '6d6x100'][tier].replace(/x(\d+)/, '')).total * [1, 10, 10, 100][tier];
  const silver = rollDice('3d6').total * [10, 10, 0, 0][tier];
  const n = rollDie(3) - (Math.random() < 0.3 ? 1 : 0);
  const items = [], pool = [...LOOT[tier].items, ...(tier ? LOOT[tier - 1].items : [])];
  for (let i = 0; i < n; i++) { const it = pickR(pool); if (!items.includes(it)) items.push(it); }
  return { gold, silver, items, tier, text: `💰 ${gold} po${silver ? ` et ${silver} pa` : ''}` + (items.length ? `\n🎁 ${items.join('\n🎁 ')}` : '') };
}

// ---------- Quêtes, rumeurs, tavernes, météo ----------
const worldPlace = types => {
  const list = world ? world.locations.filter(l => !types || types.includes(l.type)) : [];
  return list.length ? pickR(list).name : pickR(['les ruines au nord', 'la vieille mine', 'la forêt des Murmures', 'le marais aux Pendus', 'la tour effondrée']);
};
function genQuest() {
  const who = pickR(['Un marchand ruiné', 'La capitaine de la garde', 'Un vieux mage', 'Une prêtresse inquiète', 'Le bourgmestre', 'Un enfant en pleurs',
                     'Un noble masqué', 'La guilde des aventuriers', 'Une aubergiste', 'Un nain endetté']);
  const what = pickR(['de retrouver un artefact volé', 'd\'escorter une caravane', 'd\'éliminer une bande de gobelins', 'd\'enquêter sur des disparitions',
                      'de récupérer une dette', 'd\'explorer', 'de délivrer un otage', 'de détruire un nid de monstres', 'de livrer un message secret', 'de protéger un village']);
  const places = world ? world.locations.filter(l => ['donjon', 'ruines', 'grotte', 'tour', 'village', 'temple'].includes(l.type)) : [];
  const loc = places.length ? pickR(places) : null, where = loc ? loc.name : worldPlace(null);
  const twist = pickR(['le commanditaire ment sur ses intentions', 'un groupe rival est déjà sur le coup', 'l\'objet est maudit', 'les « monstres » étaient pacifiques',
                       'un traître se cache parmi les alliés', 'le temps presse : 3 jours seulement', 'une tempête approche', 'la cible est un ancien allié du groupe']);
  const reward = pickR([`${(rollDie(10) + 5) * 20} pièces d'or`, 'une carte au trésor', 'la faveur d\'un noble', 'un objet magique', 'un titre de chevalier', 'des terres']);
  return { text: `${who} demande au groupe ${what} (${where}).\nMais ${twist}.\nRécompense : ${reward}.`,
           title: `${cap1(what.replace(/^d'|^de /, ''))} — ${where}`, locId: loc ? loc.id : null, reward };
}
function genRumor() {
  return { text: '« ' + pickR([
    `On dit qu'un dragon a été vu au-dessus de ${worldPlace(['grotte', 'donjon', 'ruines'])}.`,
    `Les gardes de ${worldPlace(['capitale', 'ville', 'port'])} acceptent les pots-de-vin.`,
    `Un trésor serait caché sous l'autel de ${worldPlace(['temple', 'ruines'])}.`,
    `Le forgeron du village fabrique des armes pour des orcs.`,
    `Des lumières étranges brillent la nuit près de ${worldPlace(['tour', 'ruines'])}.`,
    `Un marchand vend des cartes menant à ${worldPlace(['donjon'])}, mais elles sont fausses.`,
    `Le roi est malade et ses héritiers se préparent à la guerre.`,
    `Les loups sont de plus en plus nombreux sur les routes.`,
    `Une sorcière soigne gratuitement... en échange d'un souvenir.`,
    `Le pont de l'ouest s'est effondré : il faut un passeur.`,
  ]) + ' »', true: Math.random() < 0.6 };
}
function genTavern() {
  const m = Math.random() < 0.5;
  const name = m ? `Le ${pickR(['Dragon', 'Sanglier', 'Griffon', 'Corbeau', 'Tonneau', 'Chaudron', 'Gobelin', 'Poney', 'Chevalier', 'Troll'])} ${pickR(['Ivre', 'Doré', 'Borgne', 'Hurlant', 'Rieur', 'Endormi', 'Fringant', 'Rouillé', 'Joyeux', 'Affamé'])}`
                 : `La ${pickR(['Chope', 'Licorne', 'Sirène', 'Lanterne', 'Marmite', 'Hache', 'Truie', 'Couronne', 'Chouette', 'Bourse'])} ${pickR(['Ivre', 'Dorée', 'Borgne', 'Hurlante', 'Rieuse', 'Endormie', 'Fringante', 'Rouillée', 'Joyeuse', 'Affamée'])}`;
  const dish = pickR(['ragoût de sanglier', 'tourte aux champignons', 'soupe à l\'oignon', 'poisson grillé aux herbes', 'fromage de chèvre et pain noir', 'saucisses épicées']);
  const drink = pickR(['bière brune', 'hydromel', 'vin chaud', 'cidre', 'liqueur naine (attention !)', 'tisane elfique']);
  const host = genNPC();
  return { text: `🍺 ${name}\nTenue par ${host.name.split(' ')[0]}, ${host.trait}.\nSpécialité : ${dish} (${rollDie(4) + 1} pa), arrosé de ${drink}.\nChambre : ${rollDie(6) + 2} pa la nuit.\nOn y entend : ${genRumor().text}` };
}
const WEATHER = {
  tempere: { name: 'Tempéré', w: [['Grand soleil', ''], ['Ciel nuageux', ''], ['Pluie fine', 'routes boueuses : voyage ralenti'], ['Averses violentes', 'désavantage aux tests de Perception (ouïe et vue)'],
             ['Brouillard épais', 'visibilité réduite à 6 cases'], ['Vent fort', 'désavantage aux attaques à distance'], ['Orage', 'risque de foudre ; feux impossibles à l\'extérieur']] },
  chaud:   { name: 'Chaud / désert', w: [['Chaleur écrasante', 'jet de CON DD 10 par heure de marche ou 1 niveau d\'épuisement'], ['Tempête de sable', 'visibilité 2 cases, voyage impossible'],
             ['Ciel limpide', ''], ['Nuit glaciale', 'besoin d\'un feu ou de couvertures'], ['Vent brûlant', 'désavantage aux attaques à distance']] },
  froid:   { name: 'Froid / montagne', w: [['Neige légère', 'voyage ralenti'], ['Blizzard', 'visibilité 3 cases ; jet de CON DD 10 par heure'], ['Ciel gelé et clair', ''],
             ['Verglas', 'jet de DEX DD 10 pour courir sans tomber'], ['Vent glacial', 'désavantage aux attaques à distance']] },
  humide:  { name: 'Marais / jungle', w: [['Moiteur étouffante', ''], ['Pluie tropicale', 'routes impraticables'], ['Nuées de moustiques', 'repos court impossible sans protection'],
             ['Brume stagnante', 'visibilité 4 cases'], ['Orage tropical', 'feux impossibles à l\'extérieur']] },
};
function genWeather(clim, season) {
  let [w, eff] = pickR(WEATHER[clim].w);
  if (season === 'hiver' && clim === 'tempere' && Math.random() < 0.5) [w, eff] = ['Neige', 'voyage ralenti, traces faciles à suivre'];
  const t = { tempere: { printemps: 14, ete: 24, automne: 12, hiver: 2 }, chaud: { printemps: 30, ete: 40, automne: 32, hiver: 24 },
              froid: { printemps: -2, ete: 8, automne: -4, hiver: -18 }, humide: { printemps: 26, ete: 31, automne: 27, hiver: 22 } }[clim][season] + rollDie(9) - 5;
  return { text: `🌦 ${w}, ${t} °C${eff ? `\nEffet : ${eff}` : ''}` };
}

// ---------- Interface ----------
function addHistory(title, text) {
  gmHistory.unshift({ title, text, at: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) });
  gmHistory = gmHistory.slice(0, 30);
  renderHistory();
}
function renderHistory() {
  const el = $('gmHistory'); if (!el) return;   // onglet Outils MJ pas encore ouvert
  el.replaceChildren();
  if (!gmHistory.length) { el.innerHTML = '<p class="muted">Les résultats des générateurs s\'affichent ici.</p>'; return; }
  gmHistory.forEach(hh => {
    const card = h('div', { className: 'gm-res' },
      h('div', { className: 'gm-res-top' }, h('b', { textContent: hh.title }), h('span', { className: 'muted', textContent: hh.at }),
        h('button', { className: 'mini', textContent: '📋', title: 'Copier', on: { click: () => navigator.clipboard?.writeText(hh.text) } }),
        h('button', { className: 'mini', textContent: '📝', title: 'Ajouter aux notes de session', on: { click: () => appendNotes(`${hh.title}\n${hh.text}`) } })),
      h('pre', { textContent: hh.text }));
    el.appendChild(card);
  });
}
function appendNotes(txt) {
  const ta = $('gmNotes'); ta.value = (ta.value ? ta.value.trimEnd() + '\n\n' : '') + txt; saveNotes();
}
function saveNotes() { try { localStorage.setItem('jdr-notes', $('gmNotes').value); } catch (e) {} }

function out(id, txt) { $(id).textContent = txt; }

function buildGmTab() {
  const opts = obj => Object.entries(obj).map(([k, v]) => `<option value="${k}">${v.name ?? v}</option>`).join('');
  $('gmMain').innerHTML = `
    <div class="page-heading">
      <span class="page-eyebrow">Derrière l’écran</span>
      <h1>Le cabinet du maître</h1>
      <p>Rencontres, trésors et secrets pour donner vie à l’aventure.</p>
    </div>
    <div class="gm-grid">
      <section class="gm-card wide">
        <h3>⚔ Rencontre aléatoire</h3>
        <p class="muted">Équilibrée selon le groupe (seuils d'XP du Guide du maître) et le terrain.</p>
        <div class="gm-form">
          <label>Terrain <select id="encEnv">${opts(ENV)}</select></label>
          <label>Difficulté <select id="encDiff">${DIFFS.map((d, i) => `<option value="${i}">${d}</option>`).join('')}</select></label>
          <label>Personnages <input id="encN" type="number" min="1" max="10"></label>
          <label>Niveau moyen <input id="encLvl" type="number" min="1" max="20"></label>
        </div>
        <div class="row"><button id="encGen" class="primary">🎲 Générer</button>
          <button id="encPlace" disabled>➕ Poser sur la carte de combat</button>
          <button id="encTest" disabled title="Joue la rencontre 100 fois sans affichage">🧪 Tester (simulation)</button>
          <label class="inline">🙈 Cachée (embuscade) <input id="encHidden" type="checkbox"></label></div>
        <div id="encOut" class="gm-out"></div>
      </section>
      <section class="gm-card"><h3>🧑 PNJ</h3>
        <div class="row"><button id="npcGen" class="primary">🎲 Générer un PNJ</button><button id="npcSheet" disabled>📜 Créer sa fiche</button></div>
        <pre id="npcOut" class="gm-out"></pre></section>
      <section class="gm-card"><h3>💰 Trésor</h3>
        <label>Niveau du groupe <input id="lootLvl" type="number" min="1" max="20"></label>
        <div class="row"><button id="lootGen" class="primary">🎲 Générer</button><button id="lootShare" disabled>➗ Partager l'or entre les personnages</button></div>
        <pre id="lootOut" class="gm-out"></pre></section>
      <section class="gm-card"><h3>📜 Accroche de quête</h3>
        <div class="row"><button id="questGen" class="primary">🎲 Générer</button><button id="questAdd" disabled>📌 Ajouter aux quêtes</button></div>
        <pre id="questOut" class="gm-out"></pre></section>
      <section class="gm-card wide"><h3>🎯 Test de compétence</h3>
        <div class="gm-form">
          <label>Compétence <select id="chkSkill">${SKILLS.map(s => `<option value="${s.k}">${s.name} (${AB_NAME[s.ab]})</option>`).join('')}</select></label>
          <label>DD <input id="chkDD" type="number" min="1" max="35" value="12"></label>
          <label>Jet <select id="chkAdv"><option value="0">Normal</option><option value="1">Avantage</option><option value="-1">Désavantage</option></select></label>
        </div>
        <div id="chkWho" class="chk-who"></div>
        <button id="chkRoll" class="primary">🎲 Lancer pour le groupe</button>
        <pre id="chkOut" class="gm-out"></pre></section>
      <section class="gm-card"><h3>🗣 Rumeur</h3>
        <button id="rumorGen" class="primary">🎲 Générer</button><pre id="rumorOut" class="gm-out"></pre></section>
      <section class="gm-card"><h3>🍺 Taverne</h3>
        <button id="tavGen" class="primary">🎲 Générer</button><pre id="tavOut" class="gm-out"></pre></section>
      <section class="gm-card"><h3>🌦 Météo du jour</h3>
        <div class="gm-form"><label>Climat <select id="wxClim">${opts(WEATHER)}</select></label>
          <label>Saison <select id="wxSeason"><option value="printemps">Printemps</option><option value="ete">Été</option><option value="automne">Automne</option><option value="hiver">Hiver</option></select></label></div>
        <button id="wxGen" class="primary">🎲 Générer</button><pre id="wxOut" class="gm-out"></pre></section>
    </div>
    <h3 class="gm-h">Historique</h3>
    <div id="gmHistory"></div>`;

  let lastEnc = null, lastNpc = null, lastLoot = null;
  $('encGen').onclick = () => {
    lastEnc = genEncounter($('encEnv').value, +$('encDiff').value, clamp(+$('encN').value || 4, 1, 10), clamp(+$('encLvl').value || 1, 1, 20));
    const txt = `${encText(lastEnc)}\nXP : ${lastEnc.raw} (ajustée ${lastEnc.adj} pour un objectif de ${lastEnc.target})\n${ENV[lastEnc.env].name} · difficulté ${DIFFS[lastEnc.diff].toLowerCase()} · ${lastEnc.n} personnage(s) niv. ${lastEnc.lvl}`;
    out('encOut', txt); $('encPlace').disabled = false; $('encTest').disabled = false; addHistory('⚔ Rencontre', txt);
  };
  $('encPlace').onclick = () => { if (lastEnc) placeEncounter(lastEnc, $('encHidden').checked); };
  $('encTest').onclick = () => { if (lastEnc) openSim(encounterTestMap(lastEnc), `Tester la rencontre : ${encText(lastEnc)}`); };
  let lastQuest = null;
  $('questAdd').onclick = () => { if (!lastQuest) return; addQuest(lastQuest); $('questAdd').disabled = true; out('questOut', lastQuest.text + '\n✔ Ajoutée au journal de quêtes (onglet Monde).'); };
  $('chkRoll').onclick = () => {
    const who = [...document.querySelectorAll('#chkWho input:checked')].map(i => getSheet(i.value)).filter(Boolean);
    if (!who.length) return;
    const k = $('chkSkill').value, dd = +$('chkDD').value || 10, g = groupCheck(who, k, dd, +$('chkAdv').value);
    const txt = g.res.map(r => `${r.ok ? '✔' : '✖'} ${r.who.name} : ${r.d}${+$('chkAdv').value ? ` [${r.a},${r.b}]` : ''} ${fmtMod(r.bonus)} = ${r.tot}`).join('\n') +
      `\n→ ${g.ok ? 'Réussite' : 'Échec'} du groupe (${g.res.filter(r => r.ok).length}/${g.res.length}) — ${skillOf(k).name} DD ${dd}`;
    out('chkOut', txt); addHistory(`🎯 ${skillOf(k).name} DD ${dd}`, txt); sfx('dice');
  };
  $('npcGen').onclick = () => { lastNpc = genNPC(); out('npcOut', lastNpc.text); $('npcSheet').disabled = false; addHistory('🧑 PNJ', lastNpc.text); };
  $('npcSheet').onclick = () => {
    if (!lastNpc) return;
    const s = newSheet(); Object.assign(s, { name: lastNpc.name, race: lastNpc.race, camp: 'monster', cls: pickR(Object.keys(CLASSES)), notes: lastNpc.text, method: 'standard' });
    s.sprite = CLASSES[s.cls].sprite; s.weapon = CLASSES[s.cls].arme; assignByPriority(s, STANDARD_ARRAY);
    sheets.push(s); saveSheets(); setMode('chars'); openSheet(s.id);
  };
  $('lootGen').onclick = () => { lastLoot = genTreasure(clamp(+$('lootLvl').value || 1, 1, 20)); out('lootOut', lastLoot.text); $('lootShare').disabled = false; addHistory('💰 Trésor', lastLoot.text); };
  $('lootShare').onclick = () => {
    const heroes = sheets.filter(s => s.camp !== 'monster'); if (!lastLoot || !heroes.length) return;
    const share = Math.floor(lastLoot.gold / heroes.length);
    heroes.forEach(s => { s.gold = (s.gold || 0) + share; }); saveSheets();
    $('lootShare').disabled = true; out('lootOut', lastLoot.text + `\n✔ ${share} po ajoutées à chaque personnage (${heroes.map(s => s.name).join(', ')}).`);
  };
  $('questGen').onclick = () => { const q = genQuest(); lastQuest = q; $('questAdd').disabled = false; out('questOut', q.text); addHistory('📜 Quête', q.text); };
  $('rumorGen').onclick = () => { const r = genRumor(); const t = `${r.text}\n(${r.true ? 'vraie' : 'fausse'} — à garder pour le MJ)`; out('rumorOut', t); addHistory('🗣 Rumeur', t); };
  $('tavGen').onclick = () => { const t = genTavern(); out('tavOut', t.text); addHistory('🍺 Taverne', t.text); };
  $('wxGen').onclick = () => { const w = genWeather($('wxClim').value, $('wxSeason').value); out('wxOut', w.text); addHistory('🌦 Météo', w.text); };

  // panneau latéral : notes de session et aide-mémoire
  $('gmSide').innerHTML = `
    <h2>Notes de session</h2>
    <textarea id="gmNotes" rows="14" placeholder="Ce qui s'est passé, PNJ rencontrés, indices donnés..."></textarea>
    <div class="row"><button id="gmStamp" class="mini">🕒 Horodater</button><button id="gmNotesExport" class="mini">💾 Exporter (.txt)</button></div>
    <h2>Aide-mémoire</h2>
    <details open><summary>Degrés de difficulté (DD)</summary>
      <table class="ref"><tr><td>Très facile</td><td>5</td></tr><tr><td>Facile</td><td>10</td></tr><tr><td>Moyenne</td><td>15</td></tr>
      <tr><td>Difficile</td><td>20</td></tr><tr><td>Très difficile</td><td>25</td></tr><tr><td>Presque impossible</td><td>30</td></tr></table></details>
    <details><summary>Actions en combat</summary><ul class="ref">
      <li><b>Attaquer</b> · <b>Lancer un sort</b> · <b>Foncer</b> (déplacement doublé)</li><li><b>Se désengager</b> (pas d'attaque d'opportunité)</li>
      <li><b>Esquiver</b> (désavantage aux attaques contre soi)</li><li><b>Aider</b> (avantage à un allié)</li><li><b>Se cacher</b> · <b>Se tenir prêt</b> · <b>Chercher</b> · <b>Utiliser un objet</b></li>
      <li>+ un déplacement et parfois une action bonus ; une réaction par round</li></ul></details>
    <details><summary>Abri</summary><table class="ref"><tr><td>Abri partiel (½)</td><td>+2 CA</td></tr><tr><td>Abri important (¾)</td><td>+5 CA</td></tr><tr><td>Abri total</td><td>pas de ciblage</td></tr></table></details>
    <details><summary>Avantage / désavantage</summary><p class="muted">Lancer 2d20 et garder le meilleur (avantage) ou le pire (désavantage). Ils s'annulent.</p></details>
    <details><summary>États</summary><ul class="ref">${CONDITIONS.map(c => `<li>${c.icon} <b>${c.name}</b>${c.move0 ? ' — ne peut pas se déplacer' : ''}</li>`).join('')}</ul></details>
    <details><summary>Voyage</summary><table class="ref"><tr><td>Rapide</td><td>40 km/jour, −5 Perception passive</td></tr><tr><td>Normal</td><td>30 km/jour</td></tr><tr><td>Lent</td><td>20 km/jour, discrétion possible</td></tr></table></details>
    <details><summary>Repos</summary><p class="muted">Court : 1 h, dépense de dés de vie. Long : 8 h, tous les PV et la moitié des dés de vie.</p></details>`;
  try { $('gmNotes').value = localStorage.getItem('jdr-notes') || ''; } catch (e) {}
  $('gmNotes').addEventListener('input', saveNotes);
  $('gmStamp').onclick = () => appendNotes(`--- ${world ? `Jour ${world.day} · ` : ''}${new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })} ---`);
  $('gmNotesExport').onclick = () => {
    const url = URL.createObjectURL(new Blob([$('gmNotes').value], { type: 'text/plain' }));
    download('notes-de-session.txt', url); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  renderHistory();
}

// À l'ouverture de l'onglet : valeurs par défaut tirées du groupe et du lieu
function enterGm() {
  if (!$('encGen')) buildGmTab();
  const p = partyInfo();
  if (!$('encN').value) $('encN').value = p.n;
  if (!$('encLvl').value) $('encLvl').value = p.lvl;
  if (!$('lootLvl').value) $('lootLvl').value = p.lvl;
  $('encEnv').value = currentEnv();
  // personnages pour le test de compétence (cochés par défaut), avec leur perception passive
  const who = $('chkWho'); who.replaceChildren();
  sheets.filter(s => s.camp !== 'monster').forEach(s => {
    const l = document.createElement('label'); l.className = 'chk-item';
    l.innerHTML = `<input type="checkbox" value="${s.id}" checked> `; l.append(spriteIcon(s.sprite, 20), ` ${s.name} `);
    const pp = document.createElement('span'); pp.className = 'muted'; pp.textContent = `👁 ${passivePerception(s)}`; pp.title = 'Perception passive'; l.append(pp);
    who.appendChild(l);
  });
}
