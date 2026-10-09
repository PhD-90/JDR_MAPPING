// Documentation-only scene driver, injected by generate_readme_media.py.
// Uses the app's generators, combat rules and renderers in a disposable profile.
// A controlled animation clock makes frame-by-frame capture independent of CPU speed.
var mediaClock = 50000, mediaQueue = [], mediaCurrent = '', mediaUnits = {}, mediaStart = 50000;
var mediaOriginalNow = performance.now.bind(performance);
performance.now = () => mediaClock;
later = (fn, ms) => { if (SIM) fn(); else mediaQueue.push({ at:mediaClock + ms, fn }); };
var mediaScenes = [
  { name:'monde', title:'Un monde à explorer', subtitle:'Royaumes, villes et donjons sur une carte de campagne.' },
  { name:'monde-lieu', title:'Chaque lieu raconte une histoire', subtitle:'Notes, habitants et carte de combat liée au lieu.' },
  { name:'voyage-evenements', title:'L’aventure entre deux rencontres', subtitle:'Voyages, vivres, calendrier et journal des événements.' },
  { name:'monde-parchemin', title:'', subtitle:'' },
  { name:'editeur', title:'L’atelier du cartographe', subtitle:'Sols naturels, décors et relief sur la table de jeu.' },
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
  mediaQueue = []; mediaClock = 50000; mediaStart = mediaClock;
  soundOn = false; syncSoundBtn(); autoMonsters = false; autoHeroes = false; aiPaused = true; rulesMode = false;
  clearTimeout(aiTimer); anims = []; pops = []; areaList = [];
  cancelAnimationFrame(animRaf); animRaf = 0;
  $('simModal').classList.add('hidden'); previewPlayers = false;
  $('monsterSearch').value=''; $('monsterSize').value=''; filterMonsters();
  hover = null; drag = null; zoneMode = 'sel';
  sheets = exampleSheets(); sheets.forEach(s => { s.level = 3; s.gold = 45; s.items = { potion:2, ration:20, torche:3 }; });
  saveSheets(); curSheet = null;
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

function mediaWorld() {
  newWorld(73912,'continent'); setMode('world'); fitWorld();
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
  if(mediaAttackGroups[name]) {
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
