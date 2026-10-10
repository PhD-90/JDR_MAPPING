// Documentation-only scene driver, injected by generate_readme_media.py.
// Uses the app's generators, combat rules and renderers in a disposable profile.
// A controlled animation clock makes frame-by-frame capture independent of CPU speed.
var mediaClock = 50000, mediaQueue = [], mediaCurrent = '', mediaUnits = {}, mediaStart = 50000;
var mediaOriginalNow = performance.now.bind(performance);
performance.now = () => mediaClock;
later = (fn, ms) => { if (SIM) fn(); else mediaQueue.push({ at:mediaClock + ms, fn }); };
var mediaScenes = [
  { name:'nemai', title:'Bienvenue à Nemaï', subtitle:'Le parchemin de référence : 35 lieux interactifs pour ta campagne.' },
  { name:'ecran-monde', title:'Partager le voyage', subtitle:'Le monde et les héros sur un écran joueur dédié, sans les préparatifs du MJ.' },
  { name:'monde', title:'Un monde à explorer', subtitle:'Royaumes, villes et donjons sur une carte de campagne.' },
  { name:'monde-lieu', title:'Chaque lieu raconte une histoire', subtitle:'Notes, habitants et carte de combat liée au lieu.' },
  { name:'voyage-evenements', title:'L’aventure entre deux rencontres', subtitle:'Voyages, vivres, calendrier et journal des événements.' },
  { name:'monde-parchemin', title:'', subtitle:'' },
  { name:'atlas', title:'Préparer la route', subtitle:'Itinéraires à étapes, favoris et suivi du groupe.' },
  { name:'expedition', title:'Le camp des aventuriers', subtitle:'Provisions, allures de voyage et repos du groupe.' },
  { name:'equipement', title:'Équiper les aventuriers', subtitle:'Armes, armures, objets magiques et effets réels en combat.' },
  { name:'inventaire', title:'', subtitle:'' },
  { name:'carnet', title:'Le carnet de campagne', subtitle:'Préparer les séances et conserver leurs objectifs et récits.' },
  ...['carnet-pnj','carnet-quetes'].map(name=>({name,title:'',subtitle:''})),
  { name:'rencontres-preparees', title:'Préparer les rencontres', subtitle:'Bibliothèque d’adversaires, difficulté et vagues de renforts.' },
  { name:'renforts', title:'Faire entrer les renforts', subtitle:'Déployer chaque vague au moment choisi pendant le combat.' },
  { name:'editeur', title:'L’atelier du cartographe', subtitle:'Sols naturels, décors et relief sur la table de jeu.' },
  { name:'petits-decors', title:'Donner vie aux lieux', subtitle:'24 petits accessoires : nature, campement, taverne et donjon.' },
  { name:'modules', title:'Construire une salle en un geste', subtitle:'Aperçu des murs et de l’entrée avant de relâcher.', animated:true },
  { name:'riviere', title:'Dessiner une rivière', subtitle:'Un tracé continu, de l’eau et des berges de sable.', animated:true },
  { name:'presets', title:'Changer de décor', subtitle:'Forêt, taverne, donjon… dix presets et leurs variantes.' },
  { name:'relief', title:'Donner de la hauteur au terrain', subtitle:'Plateaux, falaises et niveaux visibles avec l’outil Relief.' },
  { name:'personnages', title:'Le livre des personnages', subtitle:'Race, classe, caractéristiques et valeurs de combat.' },
  { name:'progression', title:'Des héros qui progressent', subtitle:'Expérience, niveaux, repos et capacités disponibles.' },
  { name:'fiche-competences', title:'Compétences et équipement', subtitle:'Maîtrises, perception passive, objets et inventaire.' },
  { name:'bestiaire', title:'Quinze nouveaux adversaires', subtitle:'Petits, moyens et gros monstres : silhouettes, statistiques et tailles variées.' },
  { name:'jouer', title:'Préparer l’affrontement', subtitle:'Placer les aventuriers et les monstres sur la carte.' },
  { name:'portees', title:'Lire le terrain avant d’agir', subtitle:'Vert : déplacement. Rouge : portée d’attaque.' },
  { name:'suivi', title:'À chaque héros son tour', subtitle:'Initiative, acteur actif et actions restantes en un coup d’œil.', animated:true },
  { name:'attaques', title:'L’acier et la magie', subtitle:'Attaques animées, jets de dés et points de vie en direct.', animated:true },
  { name:'attaques-petits', title:'Les petits monstres à l’attaque', subtitle:'Kobold, rat géant, chauve-souris, diablotin et scarabée de feu.', animated:true, seconds:9, gif:true },
  { name:'attaques-moyens', title:'Les monstres moyens à l’attaque', subtitle:'Bandit, zombie, goule, gnoll et homme-lézard.', animated:true, seconds:9, gif:true },
  { name:'attaques-gros', title:'Les colosses entrent en scène', subtitle:'Ogre, troll, minotaure, golem de pierre et géant des collines.', animated:true, seconds:9, gif:true },
  { name:'sorts-visee', title:'Viser avant de lancer', subtitle:'Le gabarit de zone montre les figurines touchées.' },
  { name:'sorts-explosion', title:'Boule de feu !', subtitle:'Explosion, sauvegardes et dégâts résolus par le combat.', animated:true },
  { name:'ia-monstres', title:'Des adversaires autonomes', subtitle:'L’IA se déplace et choisit ses attaques selon son rôle.', animated:true },
  { name:'spectateur', title:'Laisser jouer les deux camps', subtitle:'Héros et monstres peuvent être confiés à l’IA.', animated:true },
  { name:'simulation', title:'Évaluer la rencontre', subtitle:'100 combats simulés : victoires, pertes et difficulté.' },
  { name:'simulation-rencontre', title:'', subtitle:'' },
  { name:'brouillard-mj', title:'Garder les secrets du maître', subtitle:'Brouillard, pièges et figurines cachées dans la vue MJ.' },
  { name:'ecran-joueurs', title:'La vue des aventuriers', subtitle:'Un écran dédié, sans les secrets ni les PV des monstres.' },
  { name:'outils-mj', title:'Le cabinet du maître', subtitle:'Rencontres, PNJ, trésors et notes de session.' },
  { name:'rencontre', title:'De la rencontre à la bataille', subtitle:'Générer les adversaires, puis les placer sur la carte.' },
  ...['figurines','panneau-regles','panneau-actions','panneau-suivi','panneau-figurine','panneau-des-journal','journal-ia'].map(name=>({ name, title:'', subtitle:'' }))
];
var mediaAttackGroups = {
  'attaques-petits':['kobold','rat','bat','imp','fire_beetle'],
  'attaques-moyens':['bandit','zombie','ghoul','gnoll','lizardfolk'],
  'attaques-gros':['ogre','troll','minotaur','stone_golem','hill_giant']
};

function mediaReset() {
  previewWorldPlayers=false;playerCurtain=false;playerLastFrame=null;
  $('expeditionDialog')?.close();
  document.body.classList.remove('world-map-focus');
  if($('atlasExpand')){$('atlasExpand').textContent='⛶ Carte seule';$('atlasExpand').setAttribute('aria-pressed','false');}
  mediaQueue = []; mediaClock = 50000; mediaStart = mediaClock;
  soundOn = false; syncSoundBtn(); autoMonsters = false; autoHeroes = false; aiPaused = true; rulesMode = false;
  clearTimeout(aiTimer); anims = []; pops = []; areaList = [];
  cancelAnimationFrame(animRaf); animRaf = 0;
  $('simModal').classList.add('hidden'); previewPlayers = false;
  $('monsterSearch').value=''; $('monsterSize').value=''; filterMonsters();
  hover = null; drag = null; zoneMode = 'sel';
  sheets = exampleSheets(); sheets.forEach(s => { s.level = 3; s.gold = 45; s.items = { potion:2, ration:20, torche:3 }; });
  saveSheets(); curSheet = null;
  gmSection='generators';notebook=normalizeNotebook(null);nbSelected={};nbQuery='';nbArchives=false;
  encounterWaveId='';encounterMonsterQuery='';encounterSize='';encounterMessage='';
  document.querySelectorAll('aside, #sheetMain, #gmMain').forEach(el => el.scrollTop = 0);
  Math.random = mulberry32(76133); seedRng(13579);
}

function mediaFreeze() {
  cancelAnimationFrame(animRaf); animRaf = 0;
  cancelAnimationFrame(raf); raf = 0;
  if (mode === 'world') drawWorld();
  else if (mode === 'play' || mode === 'edit') draw();
}

function mediaAdvance(ms) {
  const target = mediaStart + ms;
  let guard = 0;
  while (mediaQueue.some(t => t.at <= target) && guard++ < 1000) {
    mediaQueue.sort((a,b)=>a.at-b.at);
    const next = mediaQueue.shift(); mediaClock = next.at; next.fn();
  }
  mediaClock = target;
  anims = anims.filter(a=>mediaClock-a.start<a.dur);
  pops = pops.filter(a=>mediaClock-a.start<a.dur);
  areaList = areaList.filter(a=>mediaClock-a.start<a.dur);
  mediaFreeze();
}

function mediaTerrain(preset='forest', cols=22, rows=15) {
  map = newMap(cols, rows); setMode('edit'); $('presetDeco').checked = true;
  applyPreset(preset); setTool('select'); fit();
}

function mediaBattle(start=false) {
  mediaTerrain('forest',20,14);
  // A clearing for the staged encounter, using normal map data.
  map.objects = map.objects.filter(o=>o.x<2 || o.x+o.w>18 || o.y<2 || o.y+o.h>12);
  for(let y=2;y<12;y++) for(let x=2;x<18;x++) {
    const i=y*map.cols+x; map.height[i]=0; map.floor[i]=(y===7 || y===8)?'dirt':'grass';
  }
  mediaUnits = {};
  [[0,5,6],[1,4,9],[2,5,9],[3,4,4]].forEach(([i,x,y])=>mediaUnits[sheets[i].sprite]=addUnit('sheet:'+sheets[i].id,x,y));
  [['orc',6,6],['goblin',11,5],['goblin',12,7],['wolf',13,6]].forEach(([s,x,y],i)=>mediaUnits['enemy'+i]=addUnit(s,x,y));
  invalidateZones(); setMode('play'); fit();
  if(start) { startCombat(); mediaActive(mediaUnits.warrior); }
  else selectUnit(null);
  syncPlayUI(); draw();
}

function mediaActive(u) {
  map.active=map.order.indexOf(u.id); beginTurn(); selectUnit(u);
}

function mediaWorld(style='continent') {
  newWorld(73912,style); setMode('world'); fitWorld();
  const origin={...world.pos[sheets[0].id]};
  sheets.forEach((s,i)=>world.pos[s.id]={x:origin.x+(i%2)*5-2,y:origin.y+Math.floor(i/2)*7-3});
  drawWorld();
}

async function mediaSimulate() {
  performance.now=mediaOriginalNow;
  try { await $('simRun').onclick(); }
  finally { performance.now=()=>mediaClock; }
}

function mediaScroll(selector, panel='playRight', offset=10) {
  const el=document.querySelector(selector), box=$(panel);
  if(!el) throw new Error('Missing media target '+selector);
  box.scrollTop += el.getBoundingClientRect().top-box.getBoundingClientRect().top-offset;
}

function mediaGm() {
  setMode('gm'); $('encEnv').value='forest'; $('encDiff').value='2'; $('encN').value='4'; $('encLvl').value='3';
  ['encGen','npcGen','lootGen','questGen'].forEach(id=>$(id).click());
  $('gmNotes').value='La route des Brumes\n\nLe groupe quitte la capitale au lever du jour.\n\n• Retrouver la caravane disparue.\n• Interroger les voyageurs à l’auberge.\n• Explorer les ruines au nord de la forêt.\n\nProchaine séance : les portes du vieux donjon.';
}

function mediaNotebook(name) {
  mediaWorld();world.day=12;
  const loc=world.locations.find(l=>l.type==='ruines')||world.locations[0];loc.name='Les ruines de Valbrume';
  const npc=createNotebookRecord('npcs',{name:'Éléonore de Valbrume',role:'Cartographe et exploratrice',faction:'Guilde de la Boussole',attitude:'friendly',locId:loc.id,
    description:'Une cape couleur mousse, des doigts tachés d’encre et un étui rempli de cartes.\nElle cherche à retrouver la route oubliée du col des Trois Rois.',
    secret:'Sa dernière carte indique un passage sous les ruines. Elle tait le nom de son commanditaire.'});
  createNotebookRecord('npcs',{name:'Borin Main-de-Fer',role:'Forgeron',faction:'Compagnie du Pont',attitude:'ally'});
  const quest=createNotebookRecord('quests',{title:'Les sceaux du vieux pont',text:'La cartographe a retrouvé la trace de deux sceaux anciens. Réunissez-les pour ouvrir le passage sous Valbrume.',locId:loc.id,npcId:npc.id,dueDay:15,rewardGold:250,rewardXP:100,reward:'Un accès aux archives de la Guilde',
    objectives:[{text:'Interroger Éléonore à l’auberge',done:true},{text:'Retrouver le sceau dans la tour effondrée',done:false},{text:'Ouvrir le passage sous le pont',done:false}]});
  const session=createNotebookRecord('sessions',{title:'La route des Brumes',date:'2026-10-16',day:12,status:'planned',locId:loc.id,
    prep:'Ouverture : le groupe arrive à Valbrume sous la pluie.\nÉléonore attend à l’auberge avec une carte incomplète.\nRencontre possible : deux sentinelles gardent le vieux pont.',
    goals:[{text:'Préparer la battlemap des ruines',done:true},{text:'Présenter la cartographe et sa carte',done:false},{text:'Donner un indice sur le deuxième sceau',done:false}],
    next:'L’entrée des catacombes et le secret de la Guilde.'});
  createNotebookRecord('sessions',{title:'Le marché aux lanternes',date:'2026-10-09',day:9,status:'done',recap:'Le groupe a reçu une mission de la Guilde et s’est équipé avant le départ.'});
  openNotebook(name==='carnet-pnj'?'npcs':name==='carnet-quetes'?'quests':'sessions',name==='carnet-pnj'?npc.id:name==='carnet-quetes'?quest.id:session.id);
  $('gmNotes').value='À garder sous la main\n\nJour 12 · Arrivée à Valbrume\n\n• Le pont porte le symbole des Trois Rois.\n• Éléonore reconnaît le médaillon du groupe.\n• La tempête arrive au jour 15.\n\nAprès la séance : compléter le récapitulatif du carnet.';
  mediaScroll('#gmNotebook','gmMain',16);
}

function mediaFog() {
  mediaBattle(false); map.fogOn=true; map.fogRadius=5; map.fogAuto=true; ensureFog();
  mediaUnits.enemy3.hidden=true;
  map.marks=[{id:1,type:'piege',x:11,y:8,text:'Fosse dissimulée'},{id:2,type:'tresor',x:16,y:3,text:'Coffre ancien'}];
  revealAroundHeroes(); syncPlayUI(); draw();
}

function mediaMonsterDuel(key) {
  mediaQueue=[]; anims=[]; pops=[]; areaList=[];
  map=newMap(14,10); map.floor.fill('grass');
  for(let y=2;y<9;y++) for(let x=2;x<12;x++) map.floor[y*map.cols+x]='tiles';
  [['tree',0,1],['tree',12,2],['rock',1,8],['rock',12,8]].forEach(([type,x,y])=>map.objects.push({...makeObj(type,x,y),id:map.nextId++}));
  const attacker=addUnit(key,5,5), s=SPRITES[key].size;
  const defender=addUnit('warrior',5+s+(unitStats(attacker).attaque>1?2:0),5+s);
  invalidateZones(); setMode('play'); startCombat(); mediaActive(attacker); zoneMode='none';
  $('monsterSize').value=spriteSizeCategory(key); filterMonsters(); mediaScroll('#monsterSearch','playLeft');
  fit();
  // Reproducible real attack rolls; each staged duel starts with fresh combatants.
  mediaQueue.push({at:mediaClock+150,fn:()=>{seedRng(30); attack(attacker,defender);}});
}

async function prepareMediaScene(name) {
  mediaCurrent=name; mediaReset();
  if(name==='nemai') {
    mediaWorld('nemai');await nemaiImage.decode();wsel={loc:null,ids:new Set()};$('atlasExpand').click();drawWorld();
  } else if(name==='rencontres-preparees'||name==='renforts') {
    mediaBattle(false);map.units=map.units.filter(u=>unitKind(u)==='hero');invalidateZones();
    const r=createNotebookRecord('encounters',{title:'Embuscade au vieux pont',notes:'Les guetteurs appellent leur chef au son du cor. Faire entrer les renforts au deuxième round.',side:'east',
      waves:[{name:'Les guetteurs',counts:{goblin:2,kobold:2}},{name:'Le chef et ses loups',counts:{ogre:1,wolf:2}}]});
    createNotebookRecord('encounters',{title:'La crypte oubliée',env:'dungeon',counts:{skeleton:3,ghoul:1}});
    openNotebook('encounters',r.id);
    $('gmNotes').value='L’embuscade du vieux pont\n\nVague 1 : les guetteurs tentent d’arrêter le groupe.\n\nVague 2 : le chef arrive avec ses loups quand le cor retentit.\n\nUne négociation reste possible si les héros offrent des provisions.';
    if(name==='rencontres-preparees')mediaScroll('.enc-wave-tabs','gmMain',55);
    else {deployEncounterWave(r,r.waves[0]);startCombat();aiPaused=true;syncPlayUI();fit();draw();}
  } else if(name.startsWith('carnet')) {
    mediaNotebook(name);
  } else if(name==='equipement'||name==='inventaire') {
    const s=sheets[0];ensureEquipment(s);s.gold=750;
    ['sword_1','protection_cloak','healing_amulet','swift_boots','dagger','longbow'].forEach(k=>s.gear.push(makeGear(k)));
    const cloak=s.gear.find(g=>g.key==='protection_cloak');cloak.attuned=true;s.equipment.cape=cloak.id;
    gearSelection=s.gear.find(g=>g.key==='sword_1').id;setMode('chars');openSheet(s.id);
    $(name==='equipement'?'equipmentPanel':'gearInventory').scrollIntoView({block:'start'});
  } else if(name==='expedition') {
    mediaWorld();atlasGroup();equipmentState.chest.items.ration=18;
    sheets.filter(s=>s.camp!=='monster').forEach((s,i)=>{s.items.ration=i*2;s.hpCur=Math.max(1,+sheetDerived(s).val.pv-i*5);s.hd=Math.max(0,s.level-i);});
    openExpedition();expeditionDays=5;renderExpedition();
  } else if(name==='atlas') {
    mediaWorld();atlasGroup();const p=atlasCenter(),locs=[...world.locations].sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));
    locs[1].favorite=true;locs[0].visited=true;planWorldStop(locs[1],locs[1],false);planWorldStop(locs[3],locs[3]);wsel.loc=locs[1];renderWorldPanels();fitWorld();drawWorld();
  } else if(mediaAttackGroups[name]) {
    mediaMonsterDuel(mediaAttackGroups[name][0]); mediaAdvance(800);
  } else if(name.startsWith('monde') || name==='voyage-evenements') {
    mediaWorld();
    if(name==='monde-lieu') {
      const l=world.locations.find(l=>l.type==='capitale'); l.notes='Une cité fortifiée, carrefour des routes marchandes. Les voyageurs parlent de lueurs dans les ruines au nord.';
      wsel.loc=l; centerOn(l.x,l.y,1.4); renderWorldPanels();
    }
    if(name==='voyage-evenements') {
      wsel.ids=new Set(sheets.map(s=>s.id));
      travelTo(world.locations.find(l=>l.type==='donjon'),world.locations.find(l=>l.type==='donjon'));
      // Finish the actual generated journey before capturing its journal.
      if(wanim) { Object.assign(world.pos,wanim.ends); wanim=null; }
      wsel={loc:null,ids:new Set()}; renderWorldPanels();
      const journal=document.querySelector('.wjournal'); if(journal) mediaScroll('.wjournal','worldRight',300);
    }
    drawWorld();
  } else if(name==='ecran-monde') {
    mediaWorld('nemai');await nemaiImage.decode();wsel={loc:null,ids:new Set()};drawWorld();
  } else if(name==='petits-decors') {
    map=newMap(18,12);map.floor.fill('grass');map.grid=false;setMode('edit');
    for(let y=1;y<7;y++)for(let x=1;x<10;x++)map.floor[y*18+x]='wood';
    for(let x=1;x<10;x++)addObj('wall',x,0);
    for(let y=1;y<7;y++)addObj('wall',0,y);
    addObj('table',3,3);addObj('table',6,3);addObj('chest',8,1);addObj('barrel',8,5);
    const props=[['bottles',3,3],['plates',4,3],['books',6,3],['candles',7,3],['chair',3,4],['chair',6,4],['bench',4,2],['rug',4,5],['urn',1,2],['sacks',1,5],['scrolls',7,1],
      ['tent',12,3],['bedroll',12,5],['bedroll',14,5],['campfire',13,7],['lantern',11,7],['logs',15,7],['stump',15,9],['bones',8,9],['chains',9,9],['pebbles',6,9],
      ['flowers',3,9],['grassTuft',2,8],['fern',4,8],['mushrooms',1,10],['bush',16,2],['bush',15,1],['tree',16,0],['tree',0,9]];
    props.forEach(([type,x,y])=>addObj(type,x,y));setTool('select');select(null);fit();syncMapUI();
    mediaScroll('[data-obj="grassTuft"]','left',110);
  } else if(name==='editeur' || name==='presets' || name==='relief') {
    mediaTerrain(name==='presets'?'tavern':'forest');
    document.querySelector('.editor-presets').open=name==='presets';
    if(name==='presets') mediaScroll('.editor-presets','left');
    if(name==='relief') { setTool('relief'); brush=3; syncEditorTool(); }
  } else if(name==='modules' || name==='riviere') {
    mediaTerrain('plain',22,15); map.objects=[]; map.height.fill(0); map.floor.fill('grass');
    mapModule=name==='modules'?'room':'river'; setTool('module');
    if(name==='modules') {
      $('moduleDoorWidth').value='2'; startMapModule({cx:5,cy:3}); updateMapModule({cx:15,cy:11});
    } else {
      startMapModule({cx:3,cy:0}); [[4,3],[7,5],[10,6],[12,9],[17,12],[20,14]].forEach(([cx,cy])=>updateMapModule({cx,cy}));
    }
    fit();
  } else if(['personnages','progression','fiche-competences'].includes(name)) {
    sheets[0].xp=2800; sheets[0].gold=135; sheets[0].hpCur=22;
    setMode('chars'); openSheet(sheets[0].id);
    if(name==='progression') mediaScroll('#shXp','sheetMain',75);
    if(name==='fiche-competences') mediaScroll('#shSkills','sheetMain',80);
  } else if(name==='outils-mj' || name==='rencontre' || name==='simulation-rencontre') {
    mediaTerrain(); mediaGm();
    if(name==='rencontre') { $('encPlace').click(); fit(); }
    if(name==='simulation-rencontre') { $('encTest').click(); $('simN').value='100'; await mediaSimulate(); }
  } else if(name==='bestiaire') {
    map=newMap(24,17); map.floor.fill('tiles'); setMode('play');
    const ranks=[['kobold','rat','bat','imp','fire_beetle'],['bandit','zombie','ghoul','gnoll','lizardfolk'],
      ['ogre','troll','minotaur','stone_golem','hill_giant']];
    ranks.forEach((rank,row)=>rank.forEach((k,col)=>addUnit(k,2+col*4,3+row*5)));
    zoneMode='none'; selectUnit(null); fit(); syncPlayUI();
    mediaScroll('#monsterSearch','playLeft');
  } else if(name==='brouillard-mj' || name==='ecran-joueurs') {
    mediaFog();
    if(name==='brouillard-mj') mediaScroll('#fogOn','playRight',60);
    fit();
  } else {
    mediaBattle(!['jouer','figurines'].includes(name));
    if(name==='figurines') { $('monsterSize').value='large'; filterMonsters(); mediaScroll('#heroPal','playLeft',35); }
    if(name==='portees') selectUnit(mediaUnits.ranger);
    if(name==='simulation') { openSim(); $('simN').value='100'; await mediaSimulate(); }
    if(name==='sorts-visee' || name==='sorts-explosion') {
      mediaActive(mediaUnits.mage); useAction(mediaUnits.mage,'boule_feu'); hover={cx:12,cy:6};
      if(name==='sorts-explosion') { actionClick({button:0},hover); mediaAdvance(820); }
    }
    if(name==='attaques') { attack(mediaUnits.warrior,mediaUnits.enemy0); mediaAdvance(360); }
    if(['spectateur','ia-monstres','journal-ia'].includes(name)) {
      autoMonsters=true; autoHeroes=name==='spectateur';
      mediaActive(name==='spectateur'?mediaUnits.mage:mediaUnits.enemy1);
      aiTurn(activeUnit()); mediaAdvance(1800); syncPlayUI();
    }
    if(name==='panneau-actions') mediaScroll('#uActions');
    if(name==='panneau-figurine') mediaScroll('#unitPanel');
    if(name==='panneau-regles') { rulesMode=true; autoMonsters=true; syncPlayUI(); mediaScroll('.mode-box'); }
    if(name==='panneau-suivi') mediaScroll('#unitList', 'playRight',40);
    if(name==='panneau-des-journal' || name==='journal-ia') {
      if(name==='panneau-des-journal') { attack(mediaUnits.warrior,mediaUnits.enemy0); mediaAdvance(1500); $('diceIn').value='2d6+3'; $('btnDice').click(); }
      syncPlayUI(); mediaScroll(name==='journal-ia'?'#combatLog':'.dice-row');
    }
  }
  mediaFreeze(); return {name,mode};
}

function mediaCrops() {
  const targets={figurines:['#heroPal','#monsterPal'], 'panneau-regles':['.mode-box'],
    'panneau-actions':['#uActions','#uStd','#uItemsBox'], 'panneau-suivi':['#unitList'],
    'panneau-figurine':['#unitPanel'], 'panneau-des-journal':['.dice-row','#combatLog'], 'journal-ia':['#combatLog']};
  if(!targets[mediaCurrent]) return [];
  const rects=targets[mediaCurrent].map(s=>document.querySelector(s).getBoundingClientRect());
  return [{name:mediaCurrent,left:Math.max(0,Math.min(...rects.map(r=>r.left))-8),top:Math.max(76,Math.min(...rects.map(r=>r.top))-8),
    right:Math.min(innerWidth,Math.max(...rects.map(r=>r.right))+8),bottom:Math.min(innerHeight,Math.max(...rects.map(r=>r.bottom))+8)}];
}

var mediaStep=-1;
function mediaFrame(t) {
  if(mediaAttackGroups[mediaCurrent]) {
    const group=mediaAttackGroups[mediaCurrent], step=Math.min(4,Math.floor(t/1.8+1e-6)), key=group[step];
    if(t===0) mediaStep=-1;
    if(step!==mediaStep) {
      mediaClock=mediaStart+step*1800; mediaMonsterDuel(key); mediaStep=step;
    }
    mediaAdvance(t*1000);
    return {subtitle:`${SPRITES[key].name} · ${ATTACKS[key].name} · ${spriteSizeLabel(key)}`};
  }
  if(t===0) {
    mediaStep=-1;
    if(['attaques','sorts-explosion','ia-monstres','spectateur'].includes(mediaCurrent)) {
      mediaReset(); mediaBattle(true);
      if(mediaCurrent==='attaques') {
        attack(mediaUnits.warrior,mediaUnits.enemy0);
        mediaQueue.push({at:mediaStart+1350,fn:()=>{mediaActive(mediaUnits.ranger); attack(mediaUnits.ranger,mediaUnits.enemy2);}});
      } else if(mediaCurrent==='sorts-explosion') {
        mediaActive(mediaUnits.mage); useAction(mediaUnits.mage,'boule_feu'); hover={cx:12,cy:6};
        mediaQueue.push({at:mediaStart+500,fn:()=>actionClick({button:0},hover)});
      } else {
        autoMonsters=true; autoHeroes=mediaCurrent==='spectateur';
        mediaActive(autoHeroes?mediaUnits.mage:mediaUnits.enemy1); aiTurn(activeUnit()); syncPlayUI();
      }
    }
    if(['modules','riviere'].includes(mediaCurrent)) { drag=null; }
  }
  if(mediaCurrent==='modules') {
    if(t===0) startMapModule({cx:5,cy:3});
    if(t<1.8) updateMapModule({cx:5+Math.floor(Math.min(1,t/1.5)*10),cy:3+Math.floor(Math.min(1,t/1.5)*8)});
    else if(drag) { commitMapModule(drag); drag=null; }
  } else if(mediaCurrent==='riviere') {
    if(t===0) startMapModule({cx:3,cy:0});
    if(t<2) {
      const y=Math.floor(t/2*14), x=Math.round(3+y*1.2+Math.sin(y/2)); updateMapModule({cx:x,cy:y});
    } else if(drag) { commitMapModule(drag); drag=null; }
  } else if(mediaCurrent==='suivi') {
    const step=Math.floor(t);
    if(step!==mediaStep && step>0) endTurn();
    mediaStep=step;
  }
  mediaAdvance(t*1000);
}
