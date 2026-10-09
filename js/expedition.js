// Préparation du groupe : vivres, allure et repos hors combat.
const EXPEDITION_PACES={slow:{name:'Prudente',km:20},normal:{name:'Normale',km:30},fast:{name:'Rapide',km:40}};
let expeditionIds=[],expeditionDice={},expeditionDays=3,expeditionMessage='';
function expeditionOptions() {
  const raw=world?.expedition||{};
  return {pace:Object.hasOwn(EXPEDITION_PACES,raw.pace)?raw.pace:'normal',events:raw.events!==false,chestRations:raw.chestRations===true};
}
function expeditionCount(value) {return Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,Math.floor(Number(value)||0)));}
function expeditionHeroes(list) {return [...new Set(list)].filter(s=>s&&s.camp!=='monster'&&!s.dead);}
function expeditionParty() {return expeditionHeroes(expeditionIds.map(getSheet));}
function expeditionBlocked() {
  return !world?'Ouvre d’abord le monde.':wanim?'Attends la fin du voyage.':world.pending?'Résous ou évite la rencontre en chemin.':map.turn>0?'Termine le combat avant de gérer les provisions ou les repos.':'';
}
// Pure preview: fill the least supplied backpacks first, preserving personal surpluses.
function expeditionRations(list,days) {
  const target=expeditionCount(Math.ceil(Number(days)||0)),party=expeditionHeroes(list);
  let stock=expeditionCount(equipmentState.chest.items.ration),used=0;
  const entries=party.map(s=>({s,before:expeditionCount(s.items?.ration),added:0}));
  let lo=0,hi=target;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2),cost=entries.reduce((n,e)=>n+Math.max(0,mid-e.before),0);if(cost<=stock)lo=mid;else hi=mid-1;}
  for(const e of entries){e.added=Math.max(0,lo-e.before);stock-=e.added;used+=e.added;}
  for(const e of entries)if(stock&&e.before+e.added===lo&&lo<target){e.added++;stock--;used++;}
  return {entries,used,remaining:stock,missing:entries.reduce((n,e)=>n+Math.max(0,target-e.before-e.added),0)};
}
function applyExpeditionRations(plan) {
  equipmentState.chest.items.ration=plan.remaining;
  plan.entries.forEach(e=>{e.s.items||={};e.s.items.ration=e.before+e.added;});
}
function syncExpeditionSheet(s) {
  if(SIM)return;
  for(const u of map.units)if(u.sheetId===s.id){
    const was=u.hp;
    syncEquipmentUnit(u,s);u.hp=clamp(s.hpCur??u.hpMax,0,u.hpMax);u.uses={...(s.uses||{})};
    if(was===0&&u.hp>0){u.ds=null;u.stable=false;}
  }
}
function saveExpedition() {
  // Map-only undo cannot roll back the calendar, so start a new history after campaign resource changes.
  undoStack.length=0;redoStack.length=0;syncHistoryUI();
  saveSheets();saveEquipment();changed();saveWorld(true);syncPlayUI();renderWorldPanels();
}
function distributeExpeditionRations() {
  const blocked=expeditionBlocked();if(blocked){expeditionMessage=blocked;renderExpedition();return false;}
  const plan=expeditionRations(expeditionParty(),expeditionDays);if(!plan.used)return false;
  applyExpeditionRations(plan);
  for(const {s} of plan.entries)for(const u of map.units)if(u.sheetId===s.id)syncEquipmentUnit(u,s);
  expeditionMessage=`${plan.used} ration(s) distribuée(s) depuis le coffre. ${plan.remaining} au coffre.`;
  world.journal.unshift({day:world.day,text:'🍞 '+expeditionMessage});saveExpedition();renderExpedition();return true;
}
function restExpedition(kind) {
  const blocked=expeditionBlocked(),party=expeditionParty();
  if(blocked||!party.length||!['short','long'].includes(kind)){expeditionMessage=blocked||'Sélectionne au moins un aventurier.';renderExpedition();return false;}
  const reports=party.map(s=>{
    if(kind==='long'){longRest(s);return s.name;}
    return shortRest(s,expeditionDice[s.id]??0);
  });
  party.forEach(syncExpeditionSheet);
  if(kind==='long')world.day++;
  expeditionMessage=kind==='long'?`Repos long : ${reports.join(', ')} récupèrent leurs PV et leurs ressources. Jour ${world.day}.`:`Repos court : ${reports.join(' · ')}`;
  world.journal.unshift({day:world.day,text:expeditionMessage});saveExpedition();renderExpedition();return true;
}
function openExpedition() {
  if(!world)return;
  expeditionIds=expeditionHeroes(atlasRouteInfo()?.party||atlasParty()).map(s=>s.id);
  expeditionDays=clamp(atlasRouteInfo()?.days||3,1,365);expeditionDice={};expeditionMessage='';
  let dialog=$('expeditionDialog');
  if(!dialog){
    dialog=h('dialog',{id:'expeditionDialog','aria-labelledby':'expeditionTitle'});
    dialog.addEventListener('keydown',e=>e.stopPropagation());
    dialog.append(h('div',{className:'modal-head'},h('h2',{id:'expeditionTitle',textContent:'Le camp des aventuriers'}),gearButton('Fermer',()=>dialog.close(),{id:'expeditionClose'})),h('div',{id:'expeditionBody'}));
    document.body.append(dialog);
  }
  renderExpedition();if(!dialog.open)dialog.showModal();
}
function renderExpedition() {
  const box=$('expeditionBody');if(!box||!world)return;
  const focused=box.contains(document.activeElement)?{id:document.activeElement.id,label:document.activeElement.getAttribute('aria-label')}:null;
  box.replaceChildren();
  const all=expeditionHeroes(sheets),party=expeditionParty(),blocked=expeditionBlocked(),opts=expeditionOptions();
  const setting=(key,value)=>{world.expedition={...expeditionOptions(),[key]:value};saveWorld();renderAtlas();wredraw();renderExpedition();};
  const pace=h('select',{id:'expeditionPace',disabled:!!blocked,on:{change:e=>setting('pace',e.target.value)}},Object.entries(EXPEDITION_PACES).map(([k,p])=>gearOption(k,`${p.name} · ${p.km} km/j`,opts.pace===k)));
  pace.value=opts.pace;
  box.append(h('p',{className:'muted',textContent:'Choisis les participants au repos et au ravitaillement. L’itinéraire garde son propre groupe.'}),
    h('div',{className:'expedition-settings'},h('label',{},'Allure terrestre',pace),
      h('label',{},'Événements de voyage',h('input',{type:'checkbox',id:'expeditionEvents',checked:opts.events,disabled:!!blocked,on:{change:e=>setting('events',e.target.checked)}})),
      h('label',{},'Compléter les vivres depuis le coffre pendant les voyages',h('input',{type:'checkbox',id:'expeditionChest',checked:opts.chestRations,disabled:!!blocked,on:{change:e=>setting('chestRations',e.target.checked)}}))),
    h('p',{className:'muted',textContent:'L’allure modifie uniquement la durée terrestre, selon le terrain. La vitesse en mer reste identique.'}));
  if(!all.length)box.append(h('p',{textContent:'Crée un aventurier dans Personnages pour préparer une expédition.'}));
  const roster=h('div',{className:'expedition-roster'});
  all.forEach(s=>{
    const d=sheetDerived(s),max=+d.val.pv,hp=s.hpCur??max,hd=Math.min(s.level,expeditionCount(s.hd??s.level)),selected=expeditionIds.includes(s.id);
    expeditionDice[s.id]=clamp(expeditionDice[s.id]??Math.min(1,hd),0,hd);
    const dice=h('input',{type:'number',min:0,max:hd,value:expeditionDice[s.id],disabled:!selected||!!blocked,'aria-label':`Dés de vie à dépenser pour ${s.name}`,on:{change:e=>{expeditionDice[s.id]=clamp(expeditionCount(e.target.value),0,hd);e.target.value=expeditionDice[s.id];}}});
    roster.append(h('article',{className:'expedition-member'},h('label',{},h('input',{type:'checkbox',checked:selected,disabled:!!blocked,'aria-label':`Inclure ${s.name}`,on:{change:e=>{expeditionIds=expeditionIds.filter(id=>id!==s.id);if(e.target.checked)expeditionIds.push(s.id);renderExpedition();}}}),h('strong',{textContent:s.name})),
      h('div',{className:'expedition-health'},h('progress',{max,value:hp,'aria-label':`PV de ${s.name}`}),h('span',{textContent:`${hp}/${max} PV`})),
      h('p',{className:'muted',textContent:`${expeditionCount(s.items?.ration)} rations · ${hd}/${s.level} dés de vie (d${d.cls.de})`}),h('label',{},'Dés à dépenser',dice)));
  });
  box.append(roster);
  const plan=expeditionRations(party,expeditionDays);
  box.append(h('section',{className:'expedition-supply'},h('h3',{textContent:'Préparer les provisions'}),h('label',{},'Objectif par aventurier (jours)',h('input',{id:'expeditionDays',type:'number',min:1,max:365,value:expeditionDays,disabled:!!blocked,on:{change:e=>{expeditionDays=clamp(expeditionCount(e.target.value)||1,1,365);renderExpedition();}}})),
    h('p',{id:'expeditionPreview',textContent:`Coffre : ${expeditionCount(equipmentState.chest.items.ration)} rations · à distribuer : ${plan.used} · manque après distribution : ${plan.missing}.`}),
    h('p',{className:'muted',textContent:plan.entries.map(e=>`${e.s.name} : ${e.before} → ${e.before+e.added}`).join(' · ')}),gearButton('Distribuer les rations',distributeExpeditionRations,{id:'expeditionDistribute',disabled:!!blocked||!plan.used})),
    h('section',{className:'expedition-rest'},h('h3',{textContent:'Prendre un repos'}),h('p',{className:'muted',textContent:'Court : dépense jusqu’au nombre de dés choisi, en arrêtant aux PV maximum. Long : restaure PV et capacités, recharge les objets, récupère des dés de vie et avance d’un jour.'}),
      h('div',{className:'row'},gearButton('☕ Repos court · 1 h',()=>restExpedition('short'),{id:'expeditionShort',disabled:!!blocked||!party.length}),gearButton('🛏 Repos long · +1 jour',()=>restExpedition('long'),{id:'expeditionLong',disabled:!!blocked||!party.length}))),
    h('p',{className:'muted',textContent:'Les voyages, distributions et repos du camp sont enregistrés dans le journal. Ils démarrent un nouvel historique d’annulation de la carte.'}),
    h('p',{id:'expeditionStatus',role:'status','aria-live':'polite',textContent:blocked||expeditionMessage}));
  if(focused){const next=focused.id?$(focused.id):focused.label?box.querySelector(`[aria-label="${CSS.escape(focused.label)}"]`):null;next?.focus({preventScroll:true});}
}
