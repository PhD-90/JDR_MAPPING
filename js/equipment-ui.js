// Fiche, armurerie, coffre et commerce. Tous les noms d'objets restent du texte.
let gearSelection=null,gearSearch='',gearCategory='',gearNotice='';
const gearButton=(text,click,extra={})=>h('button',{type:'button',textContent:text,on:{click},...extra});
const gearOption=(value,text,selected=false)=>h('option',{value,textContent:text,selected});
function gearMessage(message) {gearNotice=message||'Équipement mis à jour.';const box=$('gearStatus');if(box)box.textContent=gearNotice;}
function gearDo(fn) { const error=fn();gearMessage(error||'Modification enregistrée.');if(!error&&mode==='chars'){renderSheetList();fillSheetForm();} }
function gearDescription(d) {
  return [d.dice&&`${d.dice}${d.bonus?fmtMod(d.bonus):''} ${d.type} · portée ${d.range||1}`,
    d.ac&&`CA ${d.ac}${d.category==='heavy'?'':d.dex===2?' + DEX (max. 2)':' + DEX'}`,d.acBonus&&`CA +${d.acBonus}`,
    d.two&&'Deux mains',d.finesse&&'Finesse',d.light&&'Légère',d.versatile&&`Polyvalente (${d.versatile})`,d.thrown&&`Lancer : ${d.thrown} cases`,
    d.ammo&&`Munition : ${ITEMS[d.ammo].name}`,d.move&&`Déplacement +${d.move}`,d.climb&&`Escalade +${d.climb}`,
    d.saveBonus&&`Sauvegardes +${d.saveBonus}`,...Object.entries(d.skills||{}).map(([k,v])=>`${skillOf(k)?.name||k} +${v}`),
    d.resist?.length&&`Résistance : ${d.resist.join(', ')}`,d.power&&`${ACTIONS[d.power]?.name} · ${d.charges} charges / repos long`,d.attune&&'Harmonisation requise',d.desc].filter(Boolean).join(' · ');
}
function selectGearAttack(s,value) {
  return equipmentChange(s,x=>{if(!['main','off','spell','unarmed'].includes(value))return 'Attaque inconnue.';x.gearAttack=value;x.gearThrown=false;},{cost:false});
}
function attackChoices(s) {
  const out=[];
  for(const slot of ['main','off']) {const d=gearDef(gearSlotItem(s,slot));if(d?.kind==='weapon')out.push([slot,d.name+(slot==='off'?' · attaque bonus':'')]);}
  if(s.cls==='mage')out.push(['spell','Trait de feu']);out.push(['unarmed','Mains nues']);return out;
}
function renderEquipment(s) {
  const root=$('equipmentPanel');if(!root||!s)return;ensureEquipment(s);const d=sheetDerived(s);
  const oldFocus=document.activeElement?.id,caret=document.activeElement?.selectionStart;
  root.replaceChildren();root.append(h('div',{className:'gear-heading'},h('div',{},h('span',{className:'page-eyebrow',textContent:'Arsenal de l’aventurier'}),h('h3',{textContent:'Équipement & inventaire'})),h('span',{className:'gear-weight',textContent:`${d.equipment.weight.toFixed(1)} / ${d.equipment.capacity} kg`})),
    h('p',{id:'gearStatus',className:'gear-status',role:'status','aria-live':'polite',textContent:gearNotice||'Choisis un objet pour comparer ses effets avant de l’équiper.'}));
  const board=h('div',{className:'gear-board'}),silhouette=h('div',{className:'gear-avatar','aria-hidden':'true'},spriteIcon(s.sprite,112),h('b',{textContent:s.name}),h('span',{textContent:`CA ${d.val.ca} · ${d.val.degats}`}));
  board.append(silhouette);
  for(const [slot,label] of Object.entries(GEAR_SLOTS)) {
    const g=gearSlotItem(s,slot),def=gearDef(g),locked=slot==='off'&&(gearDef(gearSlotItem(s,'main'))?.two||s.gearTwoHanded);
    const cell=h('div',{className:'gear-slot slot-'+slot},h('small',{textContent:label}),gearButton(locked?'Deux mains occupées':def?`${def.icon} ${def.name}`:'＋ Choisir',()=>{gearCategory=slot==='armor'?'armor':slot==='main'?'weapon':'';gearSelection=g?.id||null;renderEquipment(s);$('gearInventory')?.scrollIntoView({block:'nearest'});},{disabled:!!locked,title:def?gearDescription(def):label}));
    if(g)cell.append(gearButton('Retirer',()=>gearDo(()=>unequipGear(s,slot)),{className:'mini'}));
    cell.addEventListener('dragover',e=>{e.preventDefault();});cell.addEventListener('drop',e=>{e.preventDefault();gearDo(()=>equipGear(s,e.dataTransfer.getData('text/plain'),slot));});board.append(cell);
  }
  root.append(board);
  const attack=h('select',{id:'gearAttackChoice',on:{change:e=>gearDo(()=>selectGearAttack(s,e.target.value))}},attackChoices(s).map(([k,n])=>gearOption(k,n,k===s.gearAttack)));
  root.append(h('label',{},'Attaque utilisée',attack),h('p',{className:'muted',textContent:d.equipment.explanation}));
  const weapon=gearDef(gearSlotItem(s,'main'));
  if(weapon?.versatile)root.append(h('label',{},'Tenir à deux mains',h('input',{type:'checkbox',checked:!!s.gearTwoHanded,on:{change:e=>gearDo(()=>equipmentChange(s,x=>{if(e.target.checked&&x.equipment.off)return 'Retire d’abord l’objet de la main secondaire.';x.gearTwoHanded=e.target.checked;}))}})));
  const used=gearDef(gearSlotItem(s,s.gearAttack==='off'?'off':'main'));
  if(used?.thrown)root.append(h('label',{},'Lancer cette arme (récupérable sur la carte)',h('input',{type:'checkbox',checked:!!s.gearThrown,on:{change:e=>gearDo(()=>equipmentChange(s,x=>{x.gearThrown=e.target.checked;},{cost:false}))}})));
  if(d.equipment.warnings.length)root.append(h('ul',{className:'gear-warnings'},d.equipment.warnings.map(t=>h('li',{textContent:t}))));
  if(Object.keys(s.over).some(k=>['ca','degats','toucher','portee','deplacement'].includes(k)))root.append(h('p',{className:'gear-warnings',textContent:'Certaines valeurs de combat sont personnalisées. Elles restent prioritaires ; « Recalculer » réactive les calculs automatiques.'}));
  const toolbar=h('div',{className:'gear-toolbar'},h('input',{id:'gearSearch',type:'search',placeholder:'Rechercher dans le sac…',value:gearSearch,'aria-label':'Rechercher dans l’inventaire',on:{input:e=>{gearSearch=e.target.value;renderEquipment(s);}}}),h('select',{id:'gearCategory','aria-label':'Catégorie d’objet',on:{change:e=>{gearCategory=e.target.value;renderEquipment(s);}}},[['','Tout'],['weapon','Armes'],['armor','Armures'],['shield','Boucliers'],['accessory','Accessoires'],['focus','Focaliseurs'],['treasure','Trésors'],['item','Consommables et fournitures']].map(([k,n])=>gearOption(k,n,k===gearCategory))));
  const list=h('div',{id:'gearInventory',className:'gear-inventory'});
  const matches=(name,kind)=>(!gearCategory||gearCategory===kind)&&norm(name).includes(norm(gearSearch));
  s.gear.filter(g=>matches(gearDef(g).name,gearDef(g).kind)).forEach(g=>{
    const def=gearDef(g),slot=gearSlotOf(s,g.id),btn=gearButton('',()=>{gearSelection=g.id;renderEquipment(s);},{className:'gear-card rarity-'+def.rarity+(gearSelection===g.id?' on':''),draggable:true,'aria-pressed':String(gearSelection===g.id)});
    btn.append(h('span',{className:'gear-icon',textContent:def.icon}),h('b',{textContent:def.name}),h('small',{textContent:`${slot?'Équipé · '+GEAR_SLOTS[slot]:'Dans le sac'}${g.attuned?' · Harmonisé':''}`}),h('small',{textContent:`${GEAR_RARITY[def.rarity]||'Personnalisé'} · ${def.weight||0} kg`}));
    btn.addEventListener('dragstart',e=>e.dataTransfer.setData('text/plain',g.id));list.append(btn);
  });
  Object.entries(s.items).filter(([k,n])=>n>0&&ITEMS[k]&&matches(ITEMS[k].name,'item')).forEach(([k,n])=>list.append(gearButton(`${ITEMS[k].icon} ${ITEMS[k].name} ×${n}`,()=>{gearSelection='item:'+k;renderEquipment(s);},{className:'gear-card'+(gearSelection==='item:'+k?' on':'')})));
  if(!list.childElementCount)list.append(h('p',{className:'muted',textContent:'Aucun objet dans cette catégorie.'}));root.append(toolbar,h('div',{className:'gear-inventory-layout'},list,gearDetail(s)));
  root.append(gearArmory(s),gearCustomForm(s),gearChestPanel(s),gearOptionsPanel());
  if(map.droppedGear?.length)root.append(gearGroundPanel(s));
  if(oldFocus==='gearSearch'){$('gearSearch').focus();if(caret!==null)try{$('gearSearch').setSelectionRange(caret,caret);}catch(e){}}
}
function gearRecipientSelect(s) {return h('select',{'aria-label':'Destinataire'},gearOption('chest','Coffre commun'),sheets.filter(x=>x!==s).map(x=>gearOption(x.id,x.name)));}
function gearDetail(s) {
  const panel=h('section',{className:'gear-detail','aria-label':'Détails de l’objet'});
  if(gearSelection?.startsWith('item:')) {
    const key=gearSelection.slice(5),def=ITEMS[key];if(!def)return panel;
    const recipient=gearRecipientSelect(s),qty=h('input',{type:'number',min:1,max:itemCount(s,key),value:1,'aria-label':'Quantité à transférer'});
    panel.append(h('h4',{textContent:def.name}),h('p',{textContent:def.desc}),h('p',{textContent:`${itemCount(s,key)} en stock · ${ITEM_WEIGHT[key]} kg / unité`}),h('label',{},'Quantité',qty),recipient,gearButton('Donner / déposer',()=>gearDo(()=>transferItem(s,recipient.value==='chest'?equipmentState.chest:getSheet(recipient.value),key,qty.value))));
    if(def.heal||def.cure)panel.append(gearButton('Utiliser',()=>gearDo(()=>useSheetItem(s,key))));
    return panel;
  }
  const g=gearFind(s,gearSelection),def=gearDef(g);
  if(!g){panel.append(h('p',{className:'muted',textContent:'Sélectionne un objet du sac pour voir ses propriétés et comparer son équipement.'}));return panel;}
  panel.append(h('h4',{textContent:`${def.icon} ${def.name}`}),h('p',{className:'muted',textContent:GEAR_RARITY[def.rarity]}),h('p',{textContent:gearDescription(def)}),h('p',{textContent:`${def.weight||0} kg · valeur ${def.price||0} po`}));
  if(equipmentState.options.wear&&['weapon','armor','shield'].includes(def.kind))panel.append(h('p',{className:gearBroken(g)?'gear-warnings':'muted',textContent:`État : ${g.condition??100} / 100${gearBroken(g)?' · brisé':''}. Réparation disponible au marché.`}));
  const slots=Object.keys(GEAR_SLOTS).filter(k=>gearFits(def,k));
  if(slots.length) {
    const sel=h('select',{'aria-label':'Emplacement'},slots.map(k=>gearOption(k,GEAR_SLOTS[k]))),compare=h('p',{className:'gear-compare'});
    const refresh=()=>{const copy=JSON.parse(JSON.stringify(s)),old=sheetDerived(s).val,previous=gearSlotOf(copy,g.id);if(previous)delete copy.equipment[previous];copy.equipment[sel.value]=g.id;if(sel.value==='main'){copy.gearAttack='main';copy.gearTwoHanded=false;copy.gearThrown=false;if(def.two)delete copy.equipment.off;}const next=sheetDerived(copy).val;compare.textContent=`CA ${old.ca} → ${next.ca} · toucher ${fmtMod(old.toucher)} → ${fmtMod(next.toucher)} · dégâts ${old.degats} → ${next.degats} · portée ${old.portee} → ${next.portee}${def.two&&s.equipment.off?' · la main secondaire sera rangée':''}`;};
    sel.onchange=refresh;refresh();panel.append(sel,compare,gearButton('Équiper',()=>gearDo(()=>equipGear(s,g.id,sel.value)),{className:'primary'}));
  }
  if(def.attune)panel.append(gearButton(g.attuned?'Rompre l’harmonisation':'Harmoniser',()=>gearDo(()=>equipmentChange(s,x=>{const item=gearFind(x,g.id);if(!item.attuned&&x.gear.filter(y=>y.attuned).length>=3)return 'Trois objets sont déjà harmonisés.';item.attuned=!item.attuned;},{outside:true,cost:false}))),h('small',{textContent:`${s.gear.filter(x=>x.attuned).length}/3 objets harmonisés · hors combat`}));
  if(def.power)panel.append(h('p',{textContent:`Charges : ${g.charges}/${def.charges} · récupérées au repos long`}),gearButton('Activer le pouvoir',()=>gearDo(()=>useSheetGearPower(s,g.id))));
  const recipient=gearRecipientSelect(s);panel.append(h('hr'),recipient,gearButton('Donner / déposer',()=>gearDo(()=>transferGear(s,recipient.value==='chest'?equipmentState.chest:getSheet(recipient.value),g.id))));
  if(map.units.some(u=>u.sheetId===s.id))panel.append(gearButton('Déposer sur la carte',()=>gearDo(()=>dropSheetGear(s,g.id))));
  return panel;
}
function useSheetItem(s,k) {
  const u=map.units.find(u=>u.sheetId===s.id);if(u){if(map.turn>0&&enforce()&&activeUnit()!==u)return 'Attends le tour du personnage.';if(!useItem(u,k))return 'Objet inutilisable.';s.hpCur=u.hp;saveSheets();return '';}
  const d=ITEMS[k];if(itemCount(s,k)<=0)return 'Stock épuisé.';
  if(!d.heal)return 'Cet objet s’utilise sur une figurine en combat.';
  pushUndo();s.items[k]--;s.hpCur=Math.min(sheetDerived(s).val.pv,(s.hpCur??sheetDerived(s).val.pv)+rollDice(d.heal).total);equipmentChanged(s);return '';
}
function useSheetGearPower(s,id) {
  const u=map.units.find(u=>u.sheetId===s.id),g=gearFind(s,id),d=gearDef(g);
  if(!gearSlotOf(s,id)||d.attune&&!g.attuned)return 'Équipe et harmonise cet objet avant de l’activer.';
  if(!g.charges)return 'Cet objet n’a plus de charges.';
  if(!u)return 'Place le personnage sur la carte pour choisir la cible du pouvoir.';
  if(map.turn>0&&enforce()&&activeUnit()!==u)return 'Attends le tour du personnage.';
  setMode('play');selectUnit(u);useAction(u,d.power,'gear:'+id);return '';
}
function gearArmory(s) {
  const details=h('details',{className:'gear-armory'},h('summary',{textContent:'Armurerie du MJ · ajouter un objet'}));
  const search=h('input',{type:'search',placeholder:'Chercher une arme, une armure, une potion…','aria-label':'Chercher dans le catalogue'}),results=h('div',{className:'gear-catalog'});
  const render=()=>{results.replaceChildren();for(const [key,def] of Object.entries(GEAR).filter(([,d])=>norm(d.name).includes(norm(search.value))))results.append(gearButton(`${def.icon} ${def.name}`,()=>gearDo(()=>equipmentChange(s,x=>{const g=makeGear(key);x.gear.push(g);gearSelection=g.id;},{outside:true,cost:false})),{title:gearDescription(def)}));
    for(const [k,d]of Object.entries(ITEMS).filter(([,d])=>norm(d.name).includes(norm(search.value))))results.append(gearButton(`${d.icon} ${d.name} +1`,()=>gearDo(()=>equipmentChange(s,x=>{x.items[k]=(x.items[k]||0)+1;},{outside:true,cost:false})),{title:d.desc}));if(!results.childElementCount)results.append('Aucun objet trouvé.');};
  search.oninput=render;render();details.append(h('p',{className:'muted',textContent:'Attribution gratuite par le MJ. Pour acheter et vendre, utilise le marché d’un lieu.'}),search,results);return details;
}
function gearCustomForm(s) {
  const details=h('details',{className:'gear-custom'},h('summary',{textContent:'Créer un objet personnalisé'})),form=h('form',{className:'gear-form'});
  const fields={},add=(key,label,type,value,extra={})=>{const input=type==='select'?h('select',{id:'custom_'+key,...extra}):h('input',{id:'custom_'+key,type,value,...extra});fields[key]=input;form.append(h('label',{},label,input));return input;};
  add('base','Modèle','select').append(...Object.entries(GEAR).map(([k,d])=>gearOption(k,d.name)));
  add('name','Nom','text','',{required:true,maxLength:80});add('desc','Description','text','',{maxLength:500});
  add('rarity','Rareté','select').append(...Object.entries(GEAR_RARITY).map(([k,n])=>gearOption(k,n)));
  add('weight','Poids (kg)','number',1,{min:0,max:500,step:.05});add('price','Valeur (po)','number',10,{min:0,max:1000000});
  add('dice','Dégâts (arme)','text','1d4');add('range','Portée (arme)','number',1,{min:1,max:30});
  add('type','Type de dégâts','select').append(...DMG_TYPES.map(k=>gearOption(k,dmgName(k))));
  add('bonus','Bonus d’arme','number',0,{min:0,max:3});add('acBonus','Bonus de CA','number',0,{min:0,max:3});add('move','Bonus de déplacement','number',0,{min:0,max:6});
  add('resist','Résistance','select').append(gearOption('','Aucune'),...DMG_TYPES.map(k=>gearOption(k,dmgName(k))));
  add('power','Pouvoir','select').append(gearOption('','Aucun'),...['second_souffle','projectile','boule_feu','soins','benediction'].map(k=>gearOption(k,ACTIONS[k].name)));
  add('charges','Charges / repos long','number',3,{min:1,max:10});add('attune','Harmonisation','checkbox','');
  const baseChange=()=>{const d=GEAR[fields.base.value];for(const k of ['name','weight','price','rarity','dice','range','bonus','acBonus','move','power','charges','type'])fields[k].value=d[k]??({dice:'1d4',range:1,charges:3,power:'',bonus:0,acBonus:0,move:0,type:'contondant'}[k]??'');fields.attune.checked=!!d.attune;fields.resist.value=d.resist?.[0]||'';fields.dice.disabled=fields.range.disabled=fields.bonus.disabled=d.kind!=='weapon';};
  fields.base.onchange=baseChange;baseChange();form.append(h('button',{type:'submit',className:'primary',textContent:'Créer et ajouter au sac'}));
  form.onsubmit=e=>{e.preventDefault();const d={...GEAR[fields.base.value],name:fields.name.value.trim(),desc:fields.desc.value.trim(),rarity:fields.rarity.value,weight:+fields.weight.value,price:+fields.price.value,acBonus:+fields.acBonus.value,move:+fields.move.value,attune:fields.attune.checked,resist:fields.resist.value?[fields.resist.value]:[]};
    if(!d.name)return;
    if(d.kind==='weapon'){if(!/^([1-9]|[1-9][0-9])d(4|6|8|10|12|20)$/.test(fields.dice.value))return gearMessage('Dégâts attendus : 1d8 ou 2d6, sans bonus.');Object.assign(d,{dice:fields.dice.value,range:+fields.range.value,bonus:+fields.bonus.value,type:fields.type.value});}
    d.power=fields.power.value;d.charges=d.power?+fields.charges.value:0;
    gearDo(()=>equipmentChange(s,x=>{const g=makeGear('custom',d);x.gear.push(g);gearSelection=g.id;},{outside:true,cost:false}));};
  details.append(form);return details;
}
function gearChestPanel(s) {
  const c=equipmentState.chest,details=h('details',{className:'gear-chest'},h('summary',{textContent:`Coffre commun · ${c.gear.length} objets · ${c.gold} po`}));
  details.append(h('p',{className:'muted',textContent:'Les objets retirés du coffre rejoignent le personnage affiché. Un transfert conserve l’exemplaire et ses charges.'}));
  const amount=h('input',{type:'number',min:1,value:10,'aria-label':'Montant en pièces d’or'}),moveGold=dir=>{const n=Math.floor(+amount.value),from=dir>0?s:c,to=dir>0?c:s;if(!Number.isFinite(n)||n<1||n>(from.gold||0))return 'Montant indisponible.';const err=gearCanAct(s,true);if(err)return err;pushUndo();from.gold-=n;to.gold=(to.gold||0)+n;equipmentChanged(s);return '';};
  details.append(h('div',{className:'gear-toolbar'},amount,gearButton('Déposer l’or',()=>gearDo(()=>moveGold(1))),gearButton('Retirer l’or',()=>gearDo(()=>moveGold(-1)))));
  c.gear.forEach(g=>details.append(h('div',{className:'gear-chest-row'},h('span',{textContent:gearDef(g)?.name||'Objet'}),gearButton('Prendre',()=>gearDo(()=>transferGear(c,s,g.id)),{className:'mini'}))));
  for(const [k,n]of Object.entries(c.items))if(n>0&&ITEMS[k])details.append(h('div',{className:'gear-chest-row'},h('span',{textContent:`${ITEMS[k].name} ×${n}`}),gearButton('Prendre 1',()=>gearDo(()=>transferItem(c,s,k,1)),{className:'mini'})));
  return details;
}
function gearOptionsPanel() {
  return h('details',{className:'gear-options'},h('summary',{textContent:'Règles d’équipement de la campagne'}),h('p',{className:'muted',textContent:'Règles adaptées à cette table : changement en combat = action bonus ; armures, harmonisations et échanges hors combat en mode strict. Les accessoires ordinaires n’ajoutent pas de CA.'}),
    ...[['weight','Appliquer la surcharge (FOR × 7,5 kg ; −2 cases)'],['ammo','Décompter les flèches et les carreaux'],['wear','Activer l’usure et les réparations']].map(([k,n])=>h('label',{},n,h('input',{type:'checkbox',checked:equipmentState.options[k],on:{change:e=>{pushUndo();equipmentState.options[k]=e.target.checked;equipmentChanged();}}}))));
}
function dropSheetGear(s,id) {
  const err=gearCanAct(s,true);if(err)return err;const u=map.units.find(u=>u.sheetId===s.id),g=gearFind(s,id);if(!u||!g)return 'Place le personnage sur la carte.';
  pushUndo();map.droppedGear||=[];map.droppedGear.push({item:g,x:u.x,y:u.y});s.gear=s.gear.filter(x=>x!==g);for(const slot in s.equipment)if(s.equipment[slot]===id)delete s.equipment[slot];g.attuned=false;equipmentChanged(s);return '';
}
function gearGroundPanel(s) {
  const box=h('details',{},h('summary',{textContent:'Objets déposés sur cette carte'}));
  map.droppedGear.forEach(entry=>box.append(h('div',{className:'gear-chest-row'},h('span',{textContent:`${gearDef(entry.item).name} · case ${entry.x+1}, ${entry.y+1}`}),gearButton('Récupérer',()=>gearDo(()=>{const err=gearCanAct(s,true);if(err)return err;pushUndo();map.droppedGear=map.droppedGear.filter(x=>x!==entry);s.gear.push(entry.item);equipmentChanged(s);return '';}),{className:'mini'}))));return box;
}
function renderCombatEquipment(u) {
  let box=$('combatEquipment');if(!box){box=h('div',{id:'combatEquipment',className:'combat-equipment'});$('btnAttack').before(box);}box.replaceChildren();
  const s=getSheet(u.sheetId);if(!s)return;
  const sel=h('select',{'aria-label':'Arme ou attaque',on:{change:e=>gearDo(()=>selectGearAttack(s,e.target.value))}},attackChoices(s).map(([k,n])=>gearOption(k,n,k===s.gearAttack)));
  box.append(h('label',{},'Attaque',sel));
  if(u.gearCombat?.ammo&&equipmentState.options.ammo)box.append(h('small',{textContent:`${ITEMS[u.gearCombat.ammo].name} : ${itemCount(u,u.gearCombat.ammo)}`}));
  if(gearAttackReady(u))box.append(h('p',{className:'gear-warnings',textContent:gearAttackReady(u)}));
  for(const g of u.gear||[]){const def=gearDef(g);if(def.power&&gearSlotOf(u,g.id))box.append(gearButton(`✦ ${def.name} (${g.charges}/${def.charges})`,()=>useAction(u,def.power,'gear:'+g.id),{className:'wide-btn',disabled:isKO(u)||!gearPowerAvailable(u,'gear:'+g.id)}));}
}
window.addEventListener('keydown',e=>{if(!['chars','gm'].includes(mode)||!(e.ctrlKey||e.metaKey)||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
  if(e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}else if(e.key.toLowerCase()==='y'){e.preventDefault();redo();}
});
function equipmentPrice(d,loc) {const reg=loc&&WT?regionAt(loc.x,loc.y):null;return Math.max(1,Math.round((d.price||0)*(1-.05*(reg?.rep||0))));}
function renderCombatLoot() {
  let box=$('combatLoot');if(!box){box=h('div',{id:'combatLoot',className:'combat-equipment'});$('combatSummary').after(box);}
  box.replaceChildren();const loot=map.combatLoot;if(!loot)return;
  box.append(h('b',{textContent:'Butin de la rencontre'}),h('p',{textContent:loot.text}),gearButton(loot.stored?'✔ Butin au coffre':'Récupérer le butin au coffre',()=>{if(loot.stored)return;pushUndo();storeLoot(loot);equipmentState.chest.gold+=loot.gold+Math.floor((loot.silver||0)/10);saveEquipment();changed();renderCombatLoot();},{disabled:!!loot.stored}));
}
function buyEquipment(s,key,loc,item=false) {
  const err=gearCanAct(s,true);if(err)return err;const d=(item?ITEMS:GEAR)[key];if(!d)return 'Objet inconnu.';const price=equipmentPrice(d,loc);if((s.gold||0)<price)return 'Pas assez d’or.';
  pushUndo();s.gold-=price;if(item)s.items[key]=(s.items[key]||0)+1;else s.gear.push(makeGear(key));equipmentChanged(s);return '';
}
function sellEquipment(s,id,loc,item=false) {
  const err=gearCanAct(s,true);if(err)return err;const g=item?null:gearFind(s,id),d=item?ITEMS[id]:gearDef(g);
  if(!d||item&&itemCount(s,id)<1)return 'Objet indisponible.';if(g&&gearSlotOf(s,id))return 'Retire cet objet avant de le vendre.';
  pushUndo();if(item)s.items[id]--;else s.gear=s.gear.filter(x=>x!==g);s.gold=(s.gold||0)+Math.max(1,Math.floor(equipmentPrice(d,loc)/2));equipmentChanged(s);return '';
}
function equipmentShop(loc) {
  if(!SHOP[loc.type])return null;
  const root=h('section',{className:'equipment-shop'},h('h2',{textContent:'Marché & équipement'}));
  const buyers=sheets.filter(s=>s.camp!=='monster');if(!buyers.length){root.append(h('p',{textContent:'Crée un personnage pour commercer.'}));return root;}
  const buyer=h('select',{'aria-label':'Acheteur'},buyers.map(s=>gearOption(s.id,`${s.name} · ${s.gold||0} po`))),search=h('input',{type:'search',placeholder:'Rechercher au marché…','aria-label':'Rechercher au marché'}),sale=h('input',{type:'checkbox'}),results=h('div',{className:'market-results'}),status=h('p',{role:'status',className:'muted'});
  const transact=fn=>{const error=fn();status.textContent=error||'Transaction enregistrée.';const s=getSheet(buyer.value);[...buyer.options].forEach(o=>{const b=getSheet(o.value);o.textContent=`${b.name} · ${b.gold||0} po`;});render();};
  const render=()=>{const s=ensureEquipment(getSheet(buyer.value));results.replaceChildren();const q=norm(search.value);let rows=[];
    if(sale.checked){rows=s.gear.filter(g=>!gearSlotOf(s,g.id)).map(g=>({id:g.id,d:gearDef(g),item:false}));rows.push(...Object.keys(s.items).filter(k=>s.items[k]>0&&ITEMS[k]).map(k=>({id:k,d:ITEMS[k],item:true})));}
    else {rows=Object.entries(GEAR).filter(([,d])=>loc.type==='capitale'?true:d.rarity==='common'&&(loc.type!=='village'||d.price<=50)).map(([id,d])=>({id,d,item:false}));rows.push(...Object.keys(ITEMS).filter(k=>loc.type!=='village'||['potion','antidote','ration','torche','corde','arrow','bolt'].includes(k)).map(id=>({id,d:ITEMS[id],item:true})));}
    rows.filter(r=>norm(r.d.name).includes(q)).forEach(r=>{const price=sale.checked?Math.max(1,Math.floor(equipmentPrice(r.d,loc)/2)):equipmentPrice(r.d,loc);results.append(gearButton(`${r.d.icon||'◈'} ${r.d.name} · ${price} po`,()=>transact(()=>sale.checked?sellEquipment(s,r.id,loc,r.item):buyEquipment(s,r.id,loc,r.item)),{title:r.item?r.d.desc:gearDescription(r.d),disabled:!sale.checked&&(s.gold||0)<price}));});
    if(!results.childElementCount)results.append(h('p',{className:'muted',textContent:'Aucun objet disponible. Les objets équipés doivent être retirés avant la vente.'}));
    if(equipmentState.options.wear){const damaged=s.gear.filter(g=>(g.condition??100)<100);if(damaged.length)results.append(h('h3',{textContent:'Réparations'}));damaged.forEach(g=>results.append(gearButton(`Réparer ${gearDef(g).name} · ${repairPrice(g,loc)} po`,()=>transact(()=>repairEquipment(s,g.id,loc)),{disabled:(s.gold||0)<repairPrice(g,loc)})));}};
  buyer.onchange=search.oninput=sale.onchange=render;root.append(buyer,search,h('label',{},'Vendre (moitié du prix local)',sale),status,results);render();return root;
}
