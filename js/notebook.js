// Carnet du MJ : séances, PNJ et édition du journal de quêtes du monde.
// Les références sont des identifiants ; supprimer un lieu ne supprime pas ses notes.
const NB_KINDS = { sessions: 'Séances', npcs: 'PNJ', quests: 'Quêtes', encounters:'Rencontres' };
const NB_SESSION_STATES = { planned: 'À préparer', live: 'En cours', done: 'Terminée' };
const NB_ATTITUDES = { ally: 'Allié', friendly: 'Amical', neutral: 'Neutre', hostile: 'Hostile', unknown: 'Inconnu' };
const NB_QUEST_STATES = { active: 'En cours', done: 'Réussie', failed: 'Échouée' };
const nbText = (v, max = 20000) => typeof v === 'string' ? v.slice(0, max) : '';
const nbInt = (v, max = 1000000) => Math.min(max, Math.max(0, Math.floor(Number(v) || 0)));
const nbId = () => 'nb-' + crypto.randomUUID();
const nbDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
function nbChecklist(value) {
  const used=new Set();
  return (Array.isArray(value) ? value : []).filter(x => x && typeof x === 'object')
    .map(x => { let id=nbText(x.id,100);if(!id||used.has(id))id=nbId();used.add(id);return { id, text: nbText(x.text, 500), done: !!x.done }; });
}
function normalizeNotebook(value) {
  const data = value && typeof value === 'object' ? value : {}, used = new Set();
  const records = (list, make) => (Array.isArray(list) ? list : []).filter(x => x && typeof x === 'object').map(x => {
    let id = nbText(x.id, 100); if (!id || used.has(id)) id = nbId(); used.add(id);
    return { id, archived: !!x.archived, locId: nbText(x.locId, 100), ...make(x) };
  });
  return { version: 2,
    sessions: records(data.sessions, x => ({ title: nbText(x.title, 180), date: /^\d{4}-\d{2}-\d{2}$/.test(x.date) ? x.date : '',
      day: nbInt(x.day), status: Object.hasOwn(NB_SESSION_STATES,x.status) ? x.status : 'planned',
      prep: nbText(x.prep), recap: nbText(x.recap), next: nbText(x.next), goals: nbChecklist(x.goals) })),
    npcs: records(data.npcs, x => ({ name: nbText(x.name, 180), role: nbText(x.role, 180), faction: nbText(x.faction, 180),
      attitude: Object.hasOwn(NB_ATTITUDES,x.attitude) ? x.attitude : 'neutral', sheetId: nbText(x.sheetId, 100),
      description: nbText(x.description), secret: nbText(x.secret), race: Object.hasOwn(RACES,x.race) ? x.race : '' })),
    encounters:records(data.encounters,normalizeEncounterFields) };
}
function normalizeGmHistory(value) {
  return (Array.isArray(value) ? value : []).filter(x => x && typeof x === 'object').slice(0,30)
    .map(x => ({ title: nbText(x.title, 180), text: nbText(x.text), at: nbText(x.at, 80) }));
}
function normalizeQuest(q) {
  return { id: nbText(q.id,100) || nbId(), title: nbText(q.title,180) || 'Nouvelle quête', text: nbText(q.text),
    status: Object.hasOwn(NB_QUEST_STATES,q.status) ? q.status : 'active', day: nbInt(q.day), locId: nbText(q.locId,100),
    npcId: nbText(q.npcId,100), reward: nbText(q.reward,500), rewardGold: nbInt(q.rewardGold ?? legacyQuestGold(q)),
    rewardXP: nbInt(q.rewardXP), dueDay: nbInt(q.dueDay), objectives: nbChecklist(q.objectives), archived: !!q.archived,
    completedDay: nbInt(q.completedDay), settlement: nbText(q.settlement,2000) };
}
function legacyQuestGold(q) { return +(nbText(q.reward).match(/(\d+)\s*(?:pi[eè]ces d'or|po\b)/i) || [])[1] || 0; }
function normalizeQuests(value) {
  const used=new Set();
  return (Array.isArray(value)?value:[]).filter(q=>q&&typeof q==='object').map(q=>{
    const entry=normalizeQuest(q);if(used.has(entry.id))entry.id=nbId();used.add(entry.id);return entry;
  });
}
// Les récompenses de campagne sont définitives. Annuler un geste sur la battlemap
// doit restaurer l'équipement de ce geste, tout en conservant l'or et l'XP gagnés depuis.
function preserveQuestRewardsInHistory(party, gold, xp, chestGold) {
  const ids=new Set(party.map(s=>s.id));
  for(const stack of [undoStack,redoStack])for(let i=0;i<stack.length;i++){
    const snapshot=JSON.parse(stack[i]),equipment=snapshot.__equipment;if(!equipment)continue;
    for(const s of equipment.sheets||[])if(ids.has(s.id)){s.gold=(s.gold||0)+gold;s.xp=(s.xp||0)+xp;}
    if(equipment.state?.chest)equipment.state.chest.gold=(equipment.state.chest.gold||0)+chestGold;
    stack[i]=JSON.stringify(snapshot);
  }
}
let notebook = { version:2, sessions:[], npcs:[], encounters:[] }, nbKind = 'sessions', nbSelected = {}, nbQuery = '', nbArchives = false;
let gmSection = 'generators';
try { notebook = normalizeNotebook(JSON.parse(localStorage.getItem('jdr-notebook'))); } catch (e) {}
try { gmHistory = normalizeGmHistory(JSON.parse(localStorage.getItem('jdr-gm-history'))); } catch (e) {}

function nbStatus(text, error = false) {
  const el = $('nbStatus'); if (el) { el.textContent = text; el.classList.toggle('error', error); }
}
function saveNotebook() {
  try { localStorage.setItem('jdr-notebook',JSON.stringify(notebook)); nbStatus('Enregistré dans ce navigateur'); return true; }
  catch (e) { nbStatus('Stockage plein : exporte la campagne pour conserver le carnet.',true); return false; }
}
function saveGmHistory() { try { localStorage.setItem('jdr-gm-history',JSON.stringify(gmHistory)); } catch (e) { nbStatus('Historique non enregistré : stockage plein.',true); } }
function nbRecords() { return nbKind === 'quests' ? world?.quests || [] : notebook[nbKind]; }
function nbName(r) { return r.name ?? r.title; }
function nbSaveRecord() {
  if (nbKind === 'quests') { saveWorld(true); nbStatus('Quête enregistrée dans le monde'); }
  else saveNotebook();
  renderNotebookList();
}
const nbButton = (text, click, props = {}) => h('button', { type:'button', textContent:text, on:{click}, ...props });
function nbEnsureWorld() { if (!world) { newWorld(); ensurePositions(); saveWorld(true); } return world; }
function createNotebookRecord(kind, data = {}) {
  let r;
  if (kind === 'quests') { nbEnsureWorld(); r = addQuest(data); }
  else {
    const defaults = kind === 'sessions' ? { title:`Séance ${notebook.sessions.length+1}`, date:nbDate(), day:world?.day || 1, status:'planned' }
      : kind==='encounters'?{title:'Nouvelle rencontre'}:{ name:'Nouveau PNJ', attitude:'neutral' };
    r = normalizeNotebook({[kind]:[{...defaults,...data,id:nbId()}]})[kind][0]; notebook[kind].unshift(r); saveNotebook();
  }
  nbKind = kind; nbSelected[kind] = r.id; nbQuery = ''; nbArchives = false;
  return r;
}
function rememberNpc(n) {
  const r = createNotebookRecord('npcs', { name:n.name, race:n.race, role:n.job, description:n.text.replace(/\nSecret :[^]*$/, ''), secret:n.secret, locId:wsel.loc?.id || '' });
  openNotebook('npcs',r.id); return r;
}
function openNotebook(kind = 'sessions', id = null) {
  nbKind = kind; if (id) { nbSelected[kind] = id; nbArchives = !!nbRecords().find(r=>r.id===id)?.archived; }
  nbQuery = ''; gmSection = 'notebook'; setMode('gm'); renderNotebook(); $('gmMain').scrollTop = 0;
}
function showGmSection(section) {
  gmSection = section;
  $('gmGenerators').classList.toggle('hidden',section !== 'generators');
  $('gmNotebook').classList.toggle('hidden',section !== 'notebook');
  document.querySelectorAll('[data-gm-section]').forEach(b => { b.classList.toggle('on',b.dataset.gmSection===section); b.setAttribute('aria-pressed',b.dataset.gmSection===section); });
  if (section === 'notebook') renderNotebook();
}
function renderNotebook() {
  const root = $('gmNotebook'); if (!root) return;
  const search = h('input',{id:'nbSearch',type:'search',placeholder:'Nom, lieu, faction, contenu…',value:nbQuery,'aria-label':'Rechercher dans le carnet',
    on:{input:e=>{nbQuery=e.target.value;renderNotebookList();}}});
  root.replaceChildren(
    h('div',{className:'nb-intro'},h('div',{},h('h2',{textContent:'Le carnet de campagne'}),h('p',{className:'muted',textContent:'Prépare la prochaine aventure et garde la mémoire du groupe. Les champs sont enregistrés automatiquement.'})),
      h('div',{className:'row'},nbButton('↓ Carnet (.txt)',exportNotebookText,{className:'mini'}),nbButton('💾 Campagne (.json)',()=>{nbEnsureWorld();$('wExport').click();},{id:'nbExportCampaign',className:'mini'}))),
    h('div',{className:'nb-tabs',role:'group','aria-label':'Rubriques du carnet'},Object.entries(NB_KINDS).map(([k,v])=>nbButton(v,()=>{nbKind=k;nbQuery='';renderNotebook();},{className:k===nbKind?'on':'','aria-pressed':k===nbKind,'data-nb-kind':k}))),
    h('div',{className:'nb-toolbar'},search,h('label',{className:'inline'},h('input',{id:'nbArchives',type:'checkbox',checked:nbArchives,on:{change:e=>{nbArchives=e.target.checked;renderNotebookList();renderNotebookDetail();}}}),'Afficher les archives'),
      nbButton({sessions:'+ Séance',npcs:'+ PNJ',quests:'+ Quête',encounters:'+ Rencontre'}[nbKind],()=>{createNotebookRecord(nbKind);renderNotebook();},{id:'nbNew',className:'primary'})),
    h('p',{id:'nbStatus',className:'nb-status',role:'status','aria-live':'polite',textContent:'Enregistrement automatique · Inclus dans l’export de campagne'}),
    h('div',{className:'nb-workspace'},h('div',{id:'nbList',className:'nb-list','aria-label':NB_KINDS[nbKind]}),h('section',{id:'nbDetail',className:'nb-detail','aria-label':'Détail de la sélection'})));
  renderNotebookList(); renderNotebookDetail();
}
function renderNotebookList() {
  const el = $('nbList'); if (!el) return;
  const rows = nbRecords().filter(r => (nbArchives || !r.archived) && (!nbQuery || norm([nbName(r),r.text,r.role,r.faction,r.description,r.secret,r.prep,r.recap,r.next,r.notes,
    r.waves?.map(w=>Object.keys(w.counts).map(k=>SPRITES[k].name).join(' ')).join(' '),notebook.sessions.find(s=>s.id===r.sessionId)?.title,
    world?.locations.find(l=>l.id===r.locId)?.name].filter(Boolean).join(' ')).includes(norm(nbQuery))));
  if (!rows.length) { el.replaceChildren(h('p',{className:'muted',textContent:nbQuery?'Aucun résultat pour cette recherche.':'Aucune entrée. Utilise le bouton + pour commencer.'})); return; }
  el.replaceChildren(...rows.map(r => {
    const button=nbButton('',()=>{nbSelected[nbKind]=r.id;renderNotebookList();renderNotebookDetail();},{className:'nb-entry'+(nbSelected[nbKind]===r.id?' on':''),'aria-pressed':nbSelected[nbKind]===r.id}),list=r.goals||r.objectives||[];
    button.append(h('strong',{textContent:nbName(r)||'Sans titre'}),h('span',{textContent:[r.archived?'Archivé':nbKind==='encounters'?`${encounterTotal(r)} figurines · ${r.waves.length} vague${r.waves.length>1?'s':''}`:nbKind==='npcs'?NB_ATTITUDES[r.attitude]:nbKind==='sessions'?NB_SESSION_STATES[r.status]:NB_QUEST_STATES[r.status],
      nbKind==='sessions'?r.date:nbKind==='npcs'?r.role:nbKind==='encounters'?ENV[r.env].name:questDeadline(r),list.length?`${list.filter(x=>x.done).length}/${list.length} objectifs`:null].filter(Boolean).join(' · ')}));return button;
  }));
}
function nbField(record, key, label, opts = {}) {
  const {type='text', choices, maxLength=20000, ...props} = opts;
  const change = e => { record[key] = type==='number'?nbInt(e.target.value):e.target.value; nbSaveRecord(); };
  const common = {id:'nb_'+key,'data-nb-field':key,...props,on:{[choices?'change':'input']:change}};
  const input = choices ? h('select',common,Object.entries(choices).map(([value,text])=>h('option',{value,textContent:text,selected:record[key]===value})))
    : type==='textarea'?h('textarea',{...common,rows:4,maxLength,value:record[key]||''}):h('input',{...common,type,maxLength,value:record[key]??'',...(type==='number'?{min:0,max:1000000,step:1}:{})});
  return h('label',{className:'nb-field'},h('span',{textContent:label}),input);
}
function nbReference(record,key,label,records,title) {
  const options = Object.fromEntries([['','Aucun'],...records.map(x=>[x.id,title(x)])]);
  if(record[key]&&!Object.hasOwn(options,record[key]))options[record[key]]='Référence supprimée (notes conservées)';
  const field=nbField(record,key,label,{choices:options});
  field.querySelector('select').addEventListener('change',()=>{renderNotebookDetail();$('nb_'+key)?.focus();});
  return field;
}
function notebookShowLocation(id) {
  const loc=world?.locations.find(l=>l.id===id);if(!loc)return;
  setMode('world');wsel={loc,ids:new Set()};centerOn(loc.x,loc.y,1.6);renderWorldPanels();wredraw();
}
function nbChecklistEditor(record,key,locked=false) {
  record[key] ||= [];
  const box=h('div',{className:'nb-checklist'}),refresh=()=>{
    box.replaceChildren(...record[key].map(item=>h('div',{className:'nb-check'},
      h('input',{type:'checkbox',checked:item.done,disabled:locked,'aria-label':'Accompli : '+item.text,on:{change:e=>{item.done=e.target.checked;nbSaveRecord();updateQuestFinishButton(record);}}}),
      h('input',{type:'text',value:item.text,maxLength:500,disabled:locked,'aria-label':'Objectif',on:{input:e=>{item.text=e.target.value;nbSaveRecord();}}}),
      nbButton('×',()=>{record[key]=record[key].filter(x=>x!==item);nbSaveRecord();refresh();updateQuestFinishButton(record);},{className:'mini',disabled:locked,'aria-label':'Retirer cet objectif'}))));
    if(!locked)box.append(nbButton('+ Objectif',()=>{record[key].push({id:nbId(),text:'Nouvel objectif',done:false});nbSaveRecord();refresh();updateQuestFinishButton(record);box.querySelectorAll('input[type=text]').item(record[key].length-1).focus();},{id:'nbAddObjective',className:'mini'}));
  };refresh();return box;
}
function updateQuestFinishButton(q) { if($('nbQuestFinish'))$('nbQuestFinish').disabled=(q.objectives||[]).some(x=>!x.done); }
function questDeadline(q) {
  if(!q.dueDay||q.status!=='active')return '';
  const remaining=q.dueDay-(world?.day||1);
  return remaining<0?`En retard de ${-remaining} j`:remaining===0?'Échéance aujourd’hui':`Échéance jour ${q.dueDay} (${remaining} j)`;
}
function renderNotebookDetail() {
  const el=$('nbDetail');if(!el)return;
  const r=nbRecords().find(x=>x.id===nbSelected[nbKind]&&(nbArchives||!x.archived));
  if(!r){el.replaceChildren(h('div',{className:'nb-empty'},h('span',{'aria-hidden':'true',textContent:'✧'}),h('h3',{textContent:'Chaque aventure mérite son récit'}),h('p',{textContent:'Sélectionne une entrée ou crée la première.'})));return;}
  el.replaceChildren(h('div',{className:'nb-detail-head'},h('span',{className:'page-eyebrow',textContent:NB_KINDS[nbKind]}),nbButton(r.archived?'↶ Restaurer':'Archiver',()=>{r.archived=!r.archived;nbSaveRecord();renderNotebook();},{id:'nbArchive',className:'mini'})),
    nbField(r,nbKind==='npcs'?'name':'title',nbKind==='npcs'?'Nom':'Titre',{maxLength:180}));
  if(nbKind==='sessions'){
    el.append(h('div',{className:'nb-columns'},nbField(r,'date','Date de la séance',{type:'date'}),nbField(r,'day','Jour du monde',{type:'number'}),nbField(r,'status','Avancement',{choices:NB_SESSION_STATES})),
      nbReference(r,'locId','Lieu principal',world?.locations||[],x=>x.name),nbField(r,'prep','Préparation · scènes, indices et rencontres',{type:'textarea'}),
      h('h3',{textContent:'À préparer / à jouer'}),nbChecklistEditor(r,'goals'),nbField(r,'recap','Ce qui s’est passé',{type:'textarea'}),nbField(r,'next','Pistes pour la prochaine séance',{type:'textarea'}),
      nbButton('→ Préparer la séance suivante',()=>{createNotebookRecord('sessions',{date:'',locId:r.locId,prep:r.next,goals:r.goals.filter(x=>!x.done).map(x=>({...x,id:nbId(),done:false}))});renderNotebook();},{id:'nbNextSession'}));
  }else if(nbKind==='npcs'){
    el.append(h('div',{className:'nb-columns'},nbField(r,'role','Métier / rôle',{maxLength:180}),nbField(r,'faction','Faction / organisation',{maxLength:180}),nbField(r,'attitude','Attitude envers le groupe',{choices:NB_ATTITUDES})),
      nbReference(r,'locId','Lieu de rencontre',world?.locations||[],x=>x.name),nbField(r,'description','Portrait, liens et motivations',{type:'textarea'}),
      nbField(r,'secret','Secrets du MJ',{type:'textarea'}),nbReference(r,'sheetId','Fiche de personnage liée',sheets,x=>x.name),
      nbButton(getSheet(r.sheetId)?'📜 Ouvrir la fiche':'📜 Créer une fiche de personnage',()=>{
        let s=getSheet(r.sheetId);if(!s){s=newSheet();Object.assign(s,{name:r.name,camp:'monster',notes:[r.description,r.secret&&'Secret : '+r.secret].filter(Boolean).join('\n'),...(r.race?{race:r.race}:{})});sheets.push(s);saveSheets();r.sheetId=s.id;saveNotebook();}
        setMode('chars');openSheet(s.id);
      },{id:'nbNpcSheet'}));
    const linked=(world?.quests||[]).filter(q=>q.npcId===r.id&&!q.archived);
    if(linked.length)el.append(h('h3',{textContent:'Quêtes liées'}),...linked.map(q=>nbButton(q.title,()=>openNotebook('quests',q.id),{className:'mini'})));
  }else if(nbKind==='encounters'){
    renderEncounterDetail(r,el);
  }else{
    r.objectives ||= [];
    el.append(h('p',{className:'nb-quest-state',textContent:[NB_QUEST_STATES[r.status],questDeadline(r)].filter(Boolean).join(' · ')}),
      nbField(r,'text','Description et indices',{type:'textarea'}),nbReference(r,'locId','Lieu de la quête',world?.locations||[],x=>x.name),
      nbReference(r,'npcId','Commanditaire',notebook.npcs,x=>x.name+(x.archived?' (archivé)':'')),
      h('h3',{textContent:'Objectifs'}),nbChecklistEditor(r,'objectives',r.status!=='active'),
      nbField(r,'dueDay','Échéance · jour du monde (0 = aucune)',{type:'number',disabled:r.status!=='active'}),
      nbField(r,'reward','Récompense narrative',{maxLength:500,disabled:r.status!=='active'}),
      h('div',{className:'nb-columns'},nbField(r,'rewardGold','Or total à partager (po)',{type:'number',disabled:r.status!=='active'}),nbField(r,'rewardXP','XP par personnage',{type:'number',disabled:r.status!=='active'})),
      h('p',{className:'muted',textContent:'La réussite distribue une seule fois l’or et l’XP aux personnages vivants du groupe. L’or restant va au coffre commun. Les objets et faveurs se donnent manuellement.'}));
    if(r.status==='active')el.append(h('div',{className:'row'},nbButton('✔ Réussie · attribuer les récompenses',()=>finishQuest(r,true),{id:'nbQuestFinish',className:'primary',disabled:r.objectives.some(x=>!x.done)}),nbButton('✖ Échouée',()=>finishQuest(r,false),{id:'nbQuestFail'})),h('p',{className:'muted',textContent:'Coche tous les objectifs avant de valider la réussite.'}));
    else el.append(h('p',{className:'nb-receipt',textContent:`Jour ${r.completedDay||r.day} · ${r.settlement||'Quête clôturée.'}`}));
  }
  if(world?.locations.some(l=>l.id===r.locId))el.append(nbButton('📍 Voir ce lieu sur la carte',()=>notebookShowLocation(r.locId),{className:'wide-btn'}));
  if(nbKind==='sessions'){
    const encounters=notebook.encounters.filter(e=>e.sessionId===r.id&&!e.archived);
    el.append(h('h3',{textContent:'Rencontres préparées'}),...encounters.map(e=>nbButton(`⚔ ${e.title}`,()=>openNotebook('encounters',e.id),{className:'wide-btn'})),
      nbButton('+ Préparer une rencontre',()=>{const entry=createNotebookRecord('encounters',{sessionId:r.id,locId:r.locId});openNotebook('encounters',entry.id);},{className:'wide-btn'}));
  }
}

function notebookLocationPanel(loc) {
  const npcs=notebook.npcs.filter(n=>n.locId===loc.id&&!n.archived),quests=(world.quests||[]).filter(q=>q.locId===loc.id&&!q.archived),encounters=notebook.encounters.filter(r=>r.locId===loc.id&&!r.archived);
  return h('section',{className:'nb-location'},h('h2',{textContent:'📖 Carnet de ce lieu'}),
    ...npcs.map(n=>nbButton(`🧑 ${n.name} · ${NB_ATTITUDES[n.attitude]}`,()=>openNotebook('npcs',n.id),{className:'wide-btn'})),
    ...quests.map(q=>nbButton(`📜 ${q.title} · ${NB_QUEST_STATES[q.status]}`,()=>openNotebook('quests',q.id),{className:'wide-btn'})),
    ...encounters.map(r=>nbButton(`⚔ ${r.title}`,()=>openNotebook('encounters',r.id),{className:'wide-btn'})),
    !npcs.length&&!quests.length&&!encounters.length?h('p',{className:'muted',textContent:'Lie les visages et les intrigues à ce lieu.'}):null,
    h('div',{className:'row'},nbButton('+ PNJ',()=>{const n=createNotebookRecord('npcs',{locId:loc.id});openNotebook('npcs',n.id);}),nbButton('+ Quête',()=>{const q=createNotebookRecord('quests',{locId:loc.id});openNotebook('quests',q.id);}),nbButton('+ Rencontre',()=>{const r=createNotebookRecord('encounters',{locId:loc.id});openNotebook('encounters',r.id);})));
}
function notebookText() {
  const location=r=>world?.locations.find(l=>l.id===r.locId)?.name||'',lines=['CARNET DE CAMPAGNE',world?.name||'', ''];
  for(const [kind,rows] of [['SÉANCES',notebook.sessions],['PNJ',notebook.npcs],['QUÊTES',world?.quests||[]],['RENCONTRES',notebook.encounters]]){
    lines.push('=== '+kind+' ===');for(const r of rows){lines.push('',(r.archived?'[ARCHIVE] ':'')+nbName(r),location(r));
      if(kind==='SÉANCES')lines.push(`${r.date} · Jour ${r.day} · ${NB_SESSION_STATES[r.status]}`,'Préparation : '+r.prep,...r.goals.map(x=>`[${x.done?'x':' '}] ${x.text}`),'Récapitulatif : '+r.recap,'Prochaine séance : '+r.next);
      else if(kind==='PNJ')lines.push(`${r.role} · ${r.faction} · ${NB_ATTITUDES[r.attitude]}`,r.description,'Secret du MJ : '+r.secret);
      else if(kind==='RENCONTRES')lines.push(r.notes,...r.waves.map(w=>`${w.name} : ${encText(w)}`),`Arrivée : ${ENCOUNTER_SIDES[r.side]}${r.hidden?' · cachée aux joueurs':''}`);
      else lines.push(NB_QUEST_STATES[r.status],r.text,...(r.objectives||[]).map(x=>`[${x.done?'x':' '}] ${x.text}`),questDeadline(r),`Récompense : ${r.reward||''} · ${r.rewardGold??legacyQuestGold(r)} po · ${r.rewardXP||0} XP/personnage`,r.settlement||'');
    }
  }return lines.join('\n');
}
function exportNotebookText() {
  const url=URL.createObjectURL(new Blob([notebookText()],{type:'text/plain;charset=utf-8'}));download('carnet-de-campagne.txt',url);setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function campaignGmData() {
  let notes=$('gmNotes')?.value; if(notes==null)try{notes=localStorage.getItem('jdr-notes')||'';}catch(e){notes='';}
  return { notebook, notes, history:gmHistory };
}
function restoreCampaignGm(value) {
  notebook=normalizeNotebook(value?.notebook);gmHistory=normalizeGmHistory(value?.history);
  const notes=nbText(value?.notes,1000000);nbSelected={};nbQuery='';nbArchives=false;
  saveNotebook();saveGmHistory();try{localStorage.setItem('jdr-notes',notes);}catch(e){nbStatus('Notes non enregistrées : stockage plein.',true);}
  // Rebuild generators to discard their previous campaign's pending NPC, quest and loot.
  lastLoot=null;encounterWaveId='';encounterMessage='';if($('encGen'))buildGmTab();renderNotebook();renderHistory();
}
