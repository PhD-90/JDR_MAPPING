// Rencontres préparées : composition, budget d'XP et placement sans chevauchement.
const ENCOUNTER_LIMIT = 30;
const ENCOUNTER_WAVES = 4;
const ENCOUNTER_SIDES = { east:'Est', west:'Ouest', north:'Nord', south:'Sud', away:'À l’opposé des héros' };
let encounterWaveId = '', encounterMonsterQuery = '', encounterSize = '', encounterMessage = '';

function encounterCounts(raw, limit = ENCOUNTER_LIMIT) {
  const counts = {};
  for (const [key,value] of Object.entries(raw && typeof raw==='object' ? raw : {})) {
    if (!Object.hasOwn(SPRITES,key) || SPRITES[key].kind!=='monster') continue;
    const n=Math.min(limit,nbInt(value,ENCOUNTER_LIMIT));
    if(n) { counts[key]=n;limit-=n; }
  }
  return counts;
}
function normalizeEncounterFields(raw) {
  let left=ENCOUNTER_LIMIT;const ids=new Set();
  const waves=(Array.isArray(raw.waves)&&raw.waves.length?raw.waves:[{name:'Première vague',counts:raw.counts}]).slice(0,ENCOUNTER_WAVES)
    .filter(w=>w&&typeof w==='object').map((w,i)=>{
      let id=nbText(w.id,100);if(!id||ids.has(id))id=nbId();ids.add(id);
      const counts=encounterCounts(w.counts,left);left-=Object.values(counts).reduce((a,n)=>a+n,0);
      return {id,name:nbText(w.name,120)||`Vague ${i+1}`,counts};
    });
  if(!waves.length)waves.push({id:nbId(),name:'Première vague',counts:{}});
  return {title:nbText(raw.title,180)||'Nouvelle rencontre',env:Object.hasOwn(ENV,raw.env)?raw.env:'forest',
    sessionId:nbText(raw.sessionId,100),notes:nbText(raw.notes),side:Object.hasOwn(ENCOUNTER_SIDES,raw.side)?raw.side:'away',
    hidden:!!raw.hidden,partyMode:raw.partyMode==='manual'?'manual':'sheets',
    partyCount:Math.max(1,nbInt(raw.partyCount??raw.n??4,10)),partyLevel:Math.max(1,nbInt(raw.partyLevel??raw.lvl??1,20)),waves};
}
const encounterTotal = r => r.waves.reduce((n,w)=>n+Object.values(w.counts).reduce((a,b)=>a+b,0),0);
function encounterParty(r) {
  return r.partyMode==='manual'?Array.from({length:clamp(nbInt(r.partyCount),1,10)},()=>clamp(nbInt(r.partyLevel),1,20))
    :sheets.filter(s=>s.camp!=='monster'&&!s.dead).map(s=>clamp(Math.floor(+s.level)||1,1,20));
}
function encounterBudget(r,counts) {
  const levels=encounterParty(r),thresholds=[0,0,0,0];
  levels.forEach(l=>XP_THRESH[l].forEach((v,i)=>thresholds[i]+=v));
  const n=Object.values(counts).reduce((a,b)=>a+b,0),raw=Object.entries(counts).reduce((a,[k,count])=>a+Math.max(0,spriteCombat(k).xp||0)*count,0),adjusted=Math.round(raw*groupMult(n));
  let tier=-1;thresholds.forEach((t,i)=>{if(adjusted>=t)tier=i;});
  return {n,raw,adjusted,thresholds,levels,label:!n?'Composition vide':!levels.length?'Groupe à définir':tier<0?'Sous le seuil facile':DIFFS[tier],tier};
}
function encounterNotice(message) {
  encounterMessage=message;
  for(const id of ['encounterFeedback','encounterPlayFeedback'])if($(id))$(id).textContent=message;
}
function rememberEncounter(enc,hidden=false) {
  const r=createNotebookRecord('encounters',{title:`Rencontre en ${ENV[enc.env]?.name.toLowerCase()||'forêt'}`,env:enc.env,
    partyCount:enc.n,partyLevel:enc.lvl,partyMode:'manual',hidden,counts:enc.counts,locId:map.locId||''});
  openNotebook('encounters',r.id);return r;
}
function encounterChosenWave(r) {return r.waves.find(w=>w.id===encounterWaveId)||r.waves[0];}
function encounterWavePlaced(r,w) {return map.encounterPlans?.some(p=>p.id===r.id&&p.deployed?.includes(w.id));}
function normalizeEncounterPlans(value) {
  const used=new Set(),plans=[];
  for(const p of Array.isArray(value)?value:[]){
    if(!p||typeof p!=='object')continue;const id=nbText(p.id,100);if(!id||used.has(id))continue;
    used.add(id);const r=normalizeEncounterFields(p);
    plans.push({id,title:r.title,side:r.side,hidden:r.hidden,waves:r.waves,
      deployed:[...new Set((Array.isArray(p.deployed)?p.deployed:[]).filter(id=>r.waves.some(w=>w.id===id)))]});
  }return plans;
}

// Planifier d'abord toutes les figurines. Aucune mutation si la carte manque de place.
function planEncounterWave(r,w) {
  const {cols,rows}=map,{objCost,surf}=terrainGrids(),blocked=new Uint8Array(cols*rows),positions=[];
  map.units.forEach(u=>{for(let y=u.y;y<u.y+u.size;y++)for(let x=u.x;x<u.x+u.size;x++)if(inMap(x,y))blocked[y*cols+x]=1;});
  const heroes=map.units.filter(u=>unitKind(u)==='hero');
  let side=r.side;
  if(side==='away') {
    const center=heroes.length?heroes.reduce((p,u)=>({x:p.x+(u.x+u.size/2)/heroes.length,y:p.y+(u.y+u.size/2)/heroes.length}),{x:0,y:0}):{x:0,y:rows/2};
    side=Object.entries({east:(cols-center.x)/cols,west:center.x/cols,north:center.y/rows,south:(rows-center.y)/rows}).sort((a,b)=>b[1]-a[1])[0][0];
  }
  const anchor={east:[cols-1,rows/2],west:[0,rows/2],north:[cols/2,0],south:[cols/2,rows-1]}[side]||[cols-1,rows/2];
  const candidates=new Map();
  const monsters=Object.entries(encounterCounts(w.counts)).flatMap(([key,n])=>Array(n).fill(key)).sort((a,b)=>SPRITES[b].size-SPRITES[a].size);
  for(const key of monsters) {
    const size=SPRITES[key].size;
    if(!candidates.has(size)) {
      const cells=[];
      for(let y=0;y<=rows-size;y++)for(let x=0;x<=cols-size;x++) {
        let ok=true;
        for(let j=y;j<y+size&&ok;j++)for(let i=x;i<x+size&&ok;i++) {
          const index=j*cols+i;
          if(['water','lava','void'].includes(map.floor[index])||!isFinite(floorCost(map.floor[index],{nage:false}))||!isFinite(objCost[index])||surf[index]!==surf[y*cols+x])ok=false;
        }
        if(ok)cells.push({x,y,score:Math.hypot(x+(size-1)/2-anchor[0],y+(size-1)/2-anchor[1])});
      }
      cells.sort((a,b)=>a.score-b.score||a.y-b.y||a.x-b.x);candidates.set(size,cells);
    }
    const cell=candidates.get(size).find(({x,y})=>{
      for(let j=y;j<y+size;j++)for(let i=x;i<x+size;i++)if(blocked[j*cols+i])return false;return true;
    });
    if(!cell)return {ok:false,positions:[],message:`Pas assez de place pour toute la vague (${monsters.length} figurines). Agrandis la carte, libère des cases ou réduis la composition.`};
    const {x,y}=cell;positions.push({key,x,y,size});
    for(let j=y;j<y+size;j++)for(let i=x;i<x+size;i++)blocked[j*cols+i]=1;
  }
  return {ok:!!positions.length,positions,message:positions.length?`${positions.length} figurine${positions.length>1?'s':''} · arrivée ${ENCOUNTER_SIDES[side].toLowerCase()}`:'Ajoute au moins un monstre à cette vague.'};
}
function deployEncounterWave(r,w,goToMap=true) {
  if(SIM||simRunning||PLAYER_VIEW)return false;
  // Une première pose fige les vagues pour cette carte ; modifier le modèle ne change pas un combat préparé.
  const stored=map.encounterPlans?.find(p=>p.id===r.id);
  if(stored){r=stored;w=r.waves.find(x=>x.id===w.id);if(!w)return false;}
  if(encounterWavePlaced(r,w)){encounterNotice('Cette vague est déjà placée sur cette carte. Ctrl+Z permet d’annuler sa pose.');return false;}
  const plan=planEncounterWave(r,w);if(!plan.ok){encounterNotice(plan.message);return false;}
  pushUndo();
  if(!stored){map.encounterPlans||=[];map.encounterPlans.push({id:r.id,title:r.title,side:r.side,hidden:r.hidden,waves:JSON.parse(JSON.stringify(r.waves)),deployed:[]});}
  map.encounterPlans.find(p=>p.id===r.id).deployed.push(w.id);
  const added=plan.positions.map(p=>{const u=addUnit(p.key,p.x,p.y);u.hidden=r.hidden;return u;});
  addLog(`⚔ ${r.title} — ${w.name} : ${encText(w)}${r.hidden?' (cachée aux joueurs)':''}`,'round');changed();
  if(goToMap){setMode('play');fit();}else syncPlayUI();
  encounterNotice(`${w.name} : ${added.length} figurines placées. Les autres vagues sont disponibles dans « Renforts préparés ».`);return true;
}
function encounterSimulationMap(r,w) {
  const original=map,originalSheets=sheets;
  try {
    sheets=JSON.parse(JSON.stringify(sheets));
    map=simBase();map.units=map.units.filter(u=>unitKind(u)==='hero');invalidateZones();
    if(!map.units.length)for(const s of sheets.filter(s=>s.camp!=='monster'&&!s.dead)){
      const point=freeSpot(1,map.rows/2|0,SPRITES[s.sprite].size);
      if(!point)throw new Error('La carte est trop petite pour placer tout le groupe.');addUnit('sheet:'+s.id,...point);invalidateZones();
    }
    if(!map.units.length)throw new Error('Ajoute des fiches de personnages ou des héros sur la carte pour simuler la rencontre.');
    const plan=planEncounterWave(r,w);if(!plan.ok)throw new Error(plan.message);
    for(const p of plan.positions)addUnit(p.key,p.x,p.y);
    delete map.encounterPlans;return map;
  }finally{map=original;sheets=originalSheets;invalidateZones();}
}
function simulatePreparedEncounter(r,w) {
  try{openSim(encounterSimulationMap(r,w),`${r.title} — ${w.name}`);}catch(e){encounterNotice(e.message);}
}
function encounterField(r,key,label,opts={}) {
  const field=nbField(r,key,label,opts);
  const input=field.querySelector('input,select,textarea');
  if(key==='partyCount'||key==='partyLevel'){
    input.min=1;input.max=key==='partyCount'?10:20;
    input.addEventListener('input',()=>{input.value=clamp(nbInt(input.value),1,+input.max);},true);
  }
  input.addEventListener(opts.choices?'change':'input',()=>{updateEncounterBudget(r);renderEncounterPreview(r);});
  return field;
}
function renderEncounterDetail(r,el) {
  const wave=encounterChosenWave(r);encounterWaveId=wave.id;
  el.append(h('div',{className:'enc-toolbar'},
    nbButton('⧉ Dupliquer',()=>{const copy=createNotebookRecord('encounters',{...r,title:r.title+' — copie',archived:false,waves:r.waves.map(w=>({...w,id:nbId()}))});encounterWaveId=copy.waves[0].id;renderNotebook();},{id:'encDuplicate',className:'mini'}),
    h('span',{className:'muted',textContent:`${encounterTotal(r)} / ${ENCOUNTER_LIMIT} figurines · ${r.waves.length} / ${ENCOUNTER_WAVES} vagues`})),
    h('details',{className:'enc-party'},h('summary',{textContent:'Lieu, séance et mise en scène'}),
      h('div',{className:'nb-columns'},nbReference(r,'locId','Lieu associé',world?.locations||[],x=>x.name),nbReference(r,'sessionId','Séance associée',notebook.sessions,x=>x.title)),
      nbField(r,'env','Ambiance',{choices:Object.fromEntries(Object.entries(ENV).map(([k,v])=>[k,v.name]))}),
      nbField(r,'notes','Mise en scène et tactiques du MJ',{type:'textarea'})),
    h('details',{className:'enc-party'},h('summary',{textContent:'Groupe de référence et placement'}),
      encounterField(r,'partyMode','Estimation pour',{choices:{sheets:'Fiches vivantes du groupe',manual:'Groupe théorique'}}),
      h('div',{className:'nb-columns'},encounterField(r,'partyCount','Personnages (groupe théorique)',{type:'number'}),encounterField(r,'partyLevel','Niveau (groupe théorique)',{type:'number'})),
      encounterField(r,'side','Arrivée des monstres',{choices:ENCOUNTER_SIDES}),
      h('label',{className:'inline'},h('input',{id:'encPreparedHidden',type:'checkbox',checked:r.hidden,on:{change:e=>{r.hidden=e.target.checked;nbSaveRecord();}}}),'Figurines cachées aux joueurs à la pose')),
    h('div',{className:'enc-wave-tabs'},r.waves.map(w=>nbButton(w.name,()=>{encounterWaveId=w.id;renderNotebookDetail();},{className:w.id===wave.id?'on':'','data-enc-wave':w.id,'aria-pressed':w.id===wave.id})),
      nbButton('+ Vague',()=>{r.waves.push({id:nbId(),name:`Renforts ${r.waves.length}`,counts:{}});encounterWaveId=r.waves.at(-1).id;nbSaveRecord();renderNotebookDetail();},{id:'encAddWave',disabled:r.waves.length>=ENCOUNTER_WAVES})),
    h('label',{className:'nb-field'},'Nom de cette vague',h('input',{id:'encWaveName',type:'text',value:wave.name,maxLength:120,on:{input:e=>{wave.name=e.target.value;nbSaveRecord();const b=[...document.querySelectorAll('[data-enc-wave]')].find(el=>el.dataset.encWave===wave.id);if(b)b.textContent=wave.name||'Sans nom';}}})),
    h('div',{className:'row'},...[-1,1].map(direction=>nbButton(direction<0?'← Avancer la vague':'Reculer la vague →',()=>{
      const i=r.waves.indexOf(wave),j=i+direction;[r.waves[i],r.waves[j]]=[r.waves[j],r.waves[i]];nbSaveRecord();renderNotebookDetail();
    },{className:'mini',disabled:r.waves.indexOf(wave)+direction<0||r.waves.indexOf(wave)+direction>=r.waves.length})),
      nbButton('Retirer la vague vide',()=>{r.waves=r.waves.filter(w=>w!==wave);encounterWaveId=r.waves[0].id;nbSaveRecord();renderNotebookDetail();},{className:'mini',id:'encRemoveWave',disabled:r.waves.length===1||!!Object.keys(wave.counts).length})),
    h('div',{id:'encBudget',className:'enc-budget','aria-live':'polite'}),h('div',{id:'encRoster',className:'enc-roster'}),
    h('details',{className:'enc-catalog',open:!Object.keys(wave.counts).length},h('summary',{textContent:'Ajouter des monstres'}),
      h('div',{className:'enc-toolbar'},h('input',{id:'encSearch',type:'search',value:encounterMonsterQuery,placeholder:'Rechercher dans le bestiaire…','aria-label':'Rechercher un monstre',on:{input:e=>{encounterMonsterQuery=e.target.value;renderEncounterCatalog(r);}}}),
        h('select',{id:'encSize','aria-label':'Taille des monstres',on:{change:e=>{encounterSize=e.target.value;renderEncounterCatalog(r);}}},Object.entries({'':'Toutes tailles',small:'Petits',medium:'Moyens',large:'Gros'}).map(([value,textContent])=>h('option',{value,textContent,selected:value===encounterSize})))),
      h('div',{id:'encCatalog'})),
    h('details',{className:'enc-placement',open:true},h('summary',{textContent:'Aperçu sur la carte actuelle'}),h('div',{id:'encPreview'})),
    h('p',{id:'encounterFeedback',className:'enc-feedback',role:'status',textContent:encounterMessage}),
    h('div',{className:'row'},nbButton('⚔ Poser cette vague',()=>deployEncounterWave(r,encounterChosenWave(r)),{id:'encDeploy',className:'primary'}),
      nbButton('🧪 Simuler cette vague',()=>simulatePreparedEncounter(r,encounterChosenWave(r)),{id:'encSim'})),
    h('p',{className:'muted',textContent:'La pose ajoute les monstres à la carte actuelle. Les autres figurines et les décors restent en place. En combat, les renforts rejoignent l’initiative. Ctrl+Z annule la pose.'}));
  renderEncounterRoster(r);renderEncounterCatalog(r);updateEncounterBudget(r);renderEncounterPreview(r);
}
function changeEncounterCount(r,key,value) {
  const wave=encounterChosenWave(r),remaining=ENCOUNTER_LIMIT-encounterTotal(r)+(wave.counts[key]||0);
  const count=Math.min(remaining,nbInt(value,ENCOUNTER_LIMIT));if(count)wave.counts[key]=count;else delete wave.counts[key];
  if(Number(value)>remaining)encounterNotice(`Maximum ${ENCOUNTER_LIMIT} figurines par rencontre, toutes vagues comprises.`);
  nbSaveRecord();renderEncounterRoster(r);updateEncounterBudget(r);renderEncounterPreview(r);
}
function renderEncounterRoster(r) {
  const el=$('encRoster');if(!el)return;const wave=encounterChosenWave(r);
  el.replaceChildren(...Object.entries(wave.counts).map(([k,n])=>{
    const st=spriteCombat(k);
    return h('div',{className:'enc-monster-row'},spriteIcon(k,38),h('div',{className:'enc-monster-name'},h('strong',{textContent:SPRITES[k].name}),h('small',{textContent:`${st.hpMax} PV · CA ${st.ca} · ${st.xp||0} XP · ${SPRITES[k].size}×${SPRITES[k].size} cases`})),
      h('input',{type:'number',min:1,max:ENCOUNTER_LIMIT,value:n,'aria-label':'Quantité : '+SPRITES[k].name,'data-enc-count':k,on:{change:e=>changeEncounterCount(r,k,e.target.value)}}),
      nbButton('×',()=>changeEncounterCount(r,k,0),{className:'mini','aria-label':'Retirer '+SPRITES[k].name}));
  }));
  if(!Object.keys(wave.counts).length)el.append(h('p',{className:'muted',textContent:'Cette vague est vide. Choisis ses monstres dans le bestiaire.'}));
  if($('encRemoveWave'))$('encRemoveWave').disabled=r.waves.length===1||!!Object.keys(wave.counts).length;
}
function renderEncounterCatalog(r) {
  const el=$('encCatalog');if(!el)return;
  const keys=Object.keys(SPRITES).filter(k=>SPRITES[k].kind==='monster'&&(!encounterSize||spriteSizeCategory(k)===encounterSize)&&norm(SPRITES[k].name).includes(norm(encounterMonsterQuery)));
  el.replaceChildren(...keys.map(k=>{
    const b=nbButton('',()=>{const wave=encounterChosenWave(r);changeEncounterCount(r,k,(wave.counts[k]||0)+1);},{className:'enc-catalog-item','data-enc-monster':k,'aria-label':'Ajouter '+SPRITES[k].name});
    b.append(spriteIcon(k,30),h('span',{textContent:SPRITES[k].name}),h('small',{textContent:`${spriteCombat(k).xp||0} XP`}));return b;
  }));
  if(!keys.length)el.append(h('p',{className:'muted',textContent:'Aucun monstre ne correspond à ces filtres.'}));
}
function updateEncounterBudget(r) {
  const el=$('encBudget');if(!el)return;
  const w=encounterChosenWave(r),b=encounterBudget(r,w.counts);
  el.replaceChildren(h('div',{className:'enc-budget-head'},h('strong',{textContent:b.label}),h('span',{textContent:`${b.n} figurine${b.n>1?'s':''} · ${b.raw} XP à gagner`})),
    h('p',{textContent:b.levels.length?`${b.adjusted} XP ajustée · ${b.levels.length} personnages de niveau ${b.levels.join(', ')}`:'Crée des fiches de personnages ou choisis un groupe théorique pour estimer la difficulté.'}),
    h('div',{className:'enc-thresholds'},b.thresholds.map((t,i)=>h('span',{className:b.n&&b.levels.length&&i===b.tier?'on':'',textContent:`${DIFFS[i]} : ${t}`}))),
    h('p',{className:'muted',textContent:'Estimation par vague avec le barème du générateur. Les ressources restantes et l’arrivée des renforts peuvent changer la difficulté réelle. La simulation utilise les héros de la carte, ou les fiches du groupe.'}));
  const counter=document.querySelector('.enc-toolbar>.muted');if(counter)counter.textContent=`${encounterTotal(r)} / ${ENCOUNTER_LIMIT} figurines · ${r.waves.length} / ${ENCOUNTER_WAVES} vagues`;
}
function renderEncounterPreview(r) {
  const el=$('encPreview');if(!el)return;const w=encounterChosenWave(r),stored=map.encounterPlans?.find(p=>p.id===r.id),effectiveWave=stored?stored.waves.find(x=>x.id===w.id):w;
  const plan=effectiveWave?planEncounterWave(stored||r,effectiveWave):{ok:false,positions:[],message:'Cette nouvelle vague ne fait pas partie du plan déjà posé. Duplique la rencontre pour l’utiliser sur cette carte.'},already=encounterWavePlaced(r,w);
  const canvas=h('canvas',{width:520,height:250,role:'img','aria-label':'Aperçu du placement : figurines actuelles en bleu, monstres à ajouter en rouge'}),c=canvas.getContext('2d');
  const z=Math.min(500/map.cols,230/map.rows),ox=(520-map.cols*z)/2,oy=(250-map.rows*z)/2;
  c.fillStyle='#282319';c.fillRect(0,0,520,250);
  map.floor.forEach((f,i)=>{c.fillStyle=FLOORS[f]?.c||'#111';c.fillRect(ox+i%map.cols*z,oy+(i/map.cols|0)*z,z+.2,z+.2);});
  map.objects.forEach(o=>{c.fillStyle='#302c27';c.fillRect(ox+o.x*z,oy+o.y*z,o.w*z,o.h*z);});
  for(const [units,color] of [[map.units,'#458dd0'],[already?[]:plan.positions,'#9b3029']])units.forEach(u=>{
    c.fillStyle=color;c.fillRect(ox+u.x*z+1,oy+u.y*z+1,u.size*z-2,u.size*z-2);c.strokeStyle='#fff3d7';c.strokeRect(ox+u.x*z+1,oy+u.y*z+1,u.size*z-2,u.size*z-2);
  });
  const currentLocation=world?.locations.find(l=>l.id===map.locId),linkedLocation=world?.locations.find(l=>l.id===r.locId);
  el.replaceChildren(h('p',{className:'muted',textContent:`${currentLocation?.name||'Carte sans lieu associé'} · ${map.cols} × ${map.rows} cases`}),canvas,h('p',{className:'muted',textContent:already?'Vague déjà placée sur cette carte.':plan.message}),
    stored?h('p',{className:'muted',textContent:'Plan figé à la première pose : l’aperçu et les renforts utilisent cette composition. Duplique le modèle pour utiliser tes modifications sur cette carte.'}):null,
    h('small',{textContent:'Bleu : figurines présentes · Rouge : nouvelle vague · Vue de dessus'}),
    linkedLocation?.battle&&map.locId!==linkedLocation.id?nbButton(`Ouvrir la carte de ${linkedLocation.name}`,()=>{openBattle(linkedLocation,'play');openNotebook('encounters',r.id);},{className:'wide-btn'}):null);
  if($('encDeploy')){$('encDeploy').disabled=already||!plan.ok;$('encDeploy').textContent=already?'✔ Vague déjà placée':'⚔ Poser cette vague';}
  if($('encSim'))$('encSim').disabled=!Object.keys(w.counts).length;
}
function renderEncounterTray() {
  const el=$('encounterTray');if(!el)return;
  const plans=map.encounterPlans||[];el.classList.toggle('hidden',!plans.length||PLAYER_VIEW);if(!plans.length||PLAYER_VIEW)return;
  el.replaceChildren(h('h2',{textContent:'Renforts préparés'}),...plans.map(r=>h('div',{className:'enc-tray-plan'},h('strong',{textContent:r.title}),
    ...r.waves.map(w=>nbButton((r.deployed.includes(w.id)?'✔ ':'+ ')+w.name,()=>deployEncounterWave(r,w,false),{className:'wide-btn mini',disabled:r.deployed.includes(w.id)||!Object.keys(w.counts).length})))),
    h('p',{id:'encounterPlayFeedback',className:'muted',role:'status',textContent:encounterMessage}));
}
