// Équipement de campagne : exemplaires individuels, emplacements et ressources partagées.
const GEAR_SLOTS = { main:'Main principale', off:'Main secondaire', armor:'Armure', head:'Tête', cape:'Cape', hands:'Gants', feet:'Bottes', neck:'Amulette', ring1:'Anneau gauche', ring2:'Anneau droit' };
const GEAR_RARITY = { common:'Commun', uncommon:'Peu commun', rare:'Rare', epic:'Très rare', legendary:'Légendaire' };
const GEAR = {};
function gearWeapon(key, name, dice, type, price, weight, extra = {}) {
  GEAR[key] = { name, kind:'weapon', icon:'⚔', dice, type, price, weight, range:1, group:'simple', fx:'slash', rarity:'common', ...extra };
}
gearWeapon('dagger','Dague','1d4','perforant',2,.5,{finesse:true,light:true,thrown:4,fx:'stab'});
gearWeapon('club','Gourdin','1d4','contondant',1,1,{light:true,fx:'smash'});
gearWeapon('mace','Masse d’armes','1d6','contondant',5,2,{fx:'smash'});
gearWeapon('staff','Bâton','1d6','contondant',2,2,{versatile:'1d8',fx:'smash'});
gearWeapon('spear','Lance','1d6','perforant',2,1.5,{versatile:'1d8',thrown:4,fx:'stab'});
gearWeapon('handaxe','Hachette','1d6','tranchant',5,1,{light:true,thrown:4,fx:'chop'});
gearWeapon('shortsword','Épée courte','1d6','perforant',10,1,{group:'martial',finesse:true,light:true,fx:'stab'});
gearWeapon('longsword','Épée longue','1d8','tranchant',15,1.5,{group:'martial',versatile:'1d10'});
gearWeapon('rapier','Rapière','1d8','perforant',25,1,{group:'martial',finesse:true,fx:'stab'});
gearWeapon('warhammer','Marteau de guerre','1d8','contondant',15,1,{group:'martial',versatile:'1d10',fx:'smash'});
gearWeapon('greataxe','Hache à deux mains','1d12','tranchant',30,3.5,{group:'martial',two:true,fx:'chop'});
gearWeapon('greatsword','Épée à deux mains','2d6','tranchant',50,3,{group:'martial',two:true});
gearWeapon('shortbow','Arc court','1d6','perforant',25,1,{two:true,range:6,ammo:'arrow',fx:'arrow',icon:'🏹'});
gearWeapon('longbow','Arc long','1d8','perforant',50,1,{group:'martial',two:true,range:8,ammo:'arrow',fx:'arrow',icon:'🏹'});
gearWeapon('crossbow','Arbalète légère','1d8','perforant',25,2.5,{two:true,range:6,ammo:'bolt',fx:'arrow',icon:'🏹'});
Object.assign(GEAR, {
  leather:{name:'Armure de cuir',kind:'armor',category:'light',ac:11,dex:99,price:10,weight:5},
  studded:{name:'Cuir clouté',kind:'armor',category:'light',ac:12,dex:99,price:45,weight:6},
  hide:{name:'Armure de peaux',kind:'armor',category:'medium',ac:12,dex:2,price:10,weight:6},
  scale:{name:'Armure d’écailles',kind:'armor',category:'medium',ac:14,dex:2,stealth:true,price:50,weight:22},
  breastplate:{name:'Cuirasse',kind:'armor',category:'medium',ac:14,dex:2,price:400,weight:10},
  chain:{name:'Cotte de mailles',kind:'armor',category:'heavy',ac:16,dex:0,str:13,stealth:true,price:75,weight:27},
  plate:{name:'Armure de plates',kind:'armor',category:'heavy',ac:18,dex:0,str:15,stealth:true,price:1500,weight:30},
  shield:{name:'Bouclier',kind:'shield',slot:'off',acBonus:2,price:10,weight:3},
  helm:{name:'Casque de voyage',kind:'accessory',slot:'head',price:5,weight:1},
  cloak:{name:'Cape de voyage',kind:'accessory',slot:'cape',price:2,weight:1},
  gloves:{name:'Gants de cuir',kind:'accessory',slot:'hands',price:1,weight:.2},
  boots:{name:'Bottes de marche',kind:'accessory',slot:'feet',price:2,weight:1},
  symbol:{name:'Symbole sacré',kind:'focus',slot:'neck',price:5,weight:.1},
  focus:{name:'Cristal arcanique',kind:'focus',slot:'off',price:10,weight:.5},
  silver_ring:{name:'Anneau d’argent',kind:'accessory',slot:'ring',price:15,weight:.05},
  gem:{name:'Gemme taillée',kind:'treasure',price:50,weight:.05},
  pearl:{name:'Perle de lune',kind:'treasure',price:250,weight:.05},
  crown:{name:'Couronne sertie',kind:'treasure',price:2500,weight:1},
  protection_cloak:{name:'Cape de protection',kind:'accessory',slot:'cape',rarity:'uncommon',attune:true,acBonus:1,saveBonus:1,price:500,weight:1},
  fire_ring:{name:'Anneau de résistance au feu',kind:'accessory',slot:'ring',rarity:'rare',attune:true,resist:['feu'],price:1500,weight:.05},
  frost_ring:{name:'Anneau de résistance au froid',kind:'accessory',slot:'ring',rarity:'rare',attune:true,resist:['froid'],price:1500,weight:.05},
  swift_boots:{name:'Bottes de célérité',kind:'accessory',slot:'feet',rarity:'rare',attune:true,move:2,price:1200,weight:1},
  elven_boots:{name:'Bottes elfiques',kind:'accessory',slot:'feet',rarity:'uncommon',skills:{discretion:2},price:350,weight:1},
  climbing_gloves:{name:'Gants d’escalade',kind:'accessory',slot:'hands',rarity:'uncommon',climb:1,price:300,weight:.2},
  insight_helm:{name:'Diadème de vigilance',kind:'accessory',slot:'head',rarity:'uncommon',skills:{perception:2},price:400,weight:.3},
  healing_amulet:{name:'Amulette de guérison',kind:'accessory',slot:'neck',rarity:'rare',attune:true,power:'second_souffle',charges:3,price:1200,weight:.1},
  missile_wand:{name:'Baguette de projectiles',kind:'focus',slot:'off',rarity:'uncommon',attune:true,power:'projectile',charges:3,price:600,weight:.5},
  fire_wand:{name:'Baguette de feu',kind:'focus',slot:'off',rarity:'rare',attune:true,power:'boule_feu',charges:2,price:2000,weight:.5},
});
for (const [key,base] of [['sword','longsword'],['bow','longbow'],['shield','shield'],['armor','chain']]) for(let bonus=1;bonus<=3;bonus++) {
  GEAR[key+'_'+bonus] = {...GEAR[base],name:GEAR[base].name+' +'+bonus,rarity:['uncommon','rare','epic'][bonus-1],price:GEAR[base].price+[500,2000,7000][bonus-1],...(GEAR[base].kind==='weapon'?{bonus}:{acBonus:(GEAR[base].acBonus||0)+bonus})};
}
Object.values(GEAR).forEach(g=>{ g.rarity ||= 'common'; g.icon ||= g.kind==='armor'||g.kind==='shield'?'🛡':g.kind==='treasure'?'💎':g.kind==='focus'?'✦':'◈'; });
Object.assign(ITEMS, {
  arrow:{name:'Flèche',icon:'➶',price:1,weight:.05,desc:'Une flèche pour un arc.'},
  bolt:{name:'Carreau',icon:'➶',price:1,weight:.08,desc:'Un carreau pour une arbalète.'},
});
const ITEM_WEIGHT = {potion:.25,potion_sup:.25,antidote:.1,parchemin_feu:.1,ration:1,torche:.5,corde:5,arrow:.05,bolt:.08};
const GEAR_START = { guerrier:['longsword','shield','chain'], barbare:['greataxe','handaxe'], paladin:['warhammer','shield','chain','symbol'], rodeur:['longbow','shortsword','studded'], voleur:['rapier','dagger','leather'], mage:['staff','focus'], clerc:['mace','shield','chain','symbol'] };
const GEAR_TRAINING = {guerrier:['simple','martial','light','medium','heavy','shield'],barbare:['simple','martial','light','medium','shield'],paladin:['simple','martial','light','medium','heavy','shield'],rodeur:['simple','martial','light','medium','shield'],voleur:['simple','light','rapier','shortsword'],mage:['dagger','staff'],clerc:['simple','light','medium','heavy','shield']};
let equipmentState = { options:{weight:false,ammo:false,wear:false}, chest:{gear:[],items:{},gold:0} };
try { const raw=JSON.parse(localStorage.getItem('jdr-equipment')||'null'); if(raw) equipmentState=normalizeEquipmentState(raw); } catch(e) {}
function normalizeEquipmentState(raw={}) {
  return {options:{weight:!!raw.options?.weight,ammo:!!raw.options?.ammo,wear:!!raw.options?.wear},chest:{gear:Array.isArray(raw.chest?.gear)?raw.chest.gear:[],items:raw.chest?.items||{},gold:Math.max(0,+raw.chest?.gold||0)}};
}
function saveEquipment() { if(SIM||PLAYER_VIEW)return; try{localStorage.setItem('jdr-equipment',JSON.stringify(equipmentState));}catch(e){} }
const gearId = () => 'g'+Date.now().toString(36)+Math.random().toString(36).slice(2,10);
const gearDef = g => g && (g.custom || GEAR[g.key]) || null;
const gearFind = (s,id) => (s.gear||[]).find(g=>g.id===id);
const gearSlotItem = (s,slot) => gearFind(s,s.equipment?.[slot]);
const gearSlotOf = (s,id) => Object.keys(s.equipment||{}).find(k=>s.equipment[k]===id);
function makeGear(key,custom=null) { const g={id:gearId(),key,condition:100,...(custom?{custom}: {})}, d=gearDef(g); if(d?.charges)g.charges=d.charges; return g; }
const gearBroken = g => !!(g&&equipmentState.options.wear&&['weapon','armor','shield'].includes(gearDef(g)?.kind)&&g.condition===0);
function ensureEquipment(s) {
  s.items ||= {}; s.over ||= {};
  if(!Array.isArray(s.gear)) {
    s.gear=[]; s.equipment={};
    for(const key of GEAR_START[s.cls]||GEAR_START.guerrier) {
      const g=makeGear(key),d=gearDef(g); s.gear.push(g);
      const slot=d.kind==='weapon'?(!s.equipment.main?'main':null):d.kind==='armor'?'armor':d.slot;
      if(slot&&!s.equipment[slot])s.equipment[slot]=g.id;
    }
    if(s.cls==='rodeur') s.items.arrow ??=20;
    s.gearAttack=s.cls==='mage'?'spell':'main';
  }
  s.equipment ||= {}; s.gearAttack ||= 'main';s.gearTwoHanded=!!s.gearTwoHanded;s.gearThrown=!!s.gearThrown;
  // Normalize references without inventing new equipment on every reload.
  const ids=new Set(); s.gear=s.gear.filter(g=>g&&gearDef(g)&&g.id&&!ids.has(g.id)&&ids.add(g.id));
  const used=new Set();
  for(const slot of Object.keys(s.equipment)) {
    const g=gearSlotItem(s,slot);
    if(!GEAR_SLOTS[slot]||!g||used.has(g.id)||!gearFits(gearDef(g),slot))delete s.equipment[slot]; else used.add(g.id);
  }
  if(gearDef(gearSlotItem(s,'main'))?.two||s.gearTwoHanded)delete s.equipment.off;
  if(!attackSlotValid(s))s.gearAttack=gearDef(gearSlotItem(s,'main'))?.kind==='weapon'?'main':s.cls==='mage'?'spell':'unarmed';
  let attuned=0;
  s.gear.forEach(g=>{const d=gearDef(g);g.condition=clamp(Number.isFinite(+g.condition)?+g.condition:100,0,100);if(d.charges)g.charges=clamp(Number.isFinite(+g.charges)?+g.charges:d.charges,0,d.charges);if(g.attuned&&++attuned>3)g.attuned=false;});
  return s;
}
function attackSlotValid(s){return s.gearAttack==='unarmed'||s.gearAttack==='spell'&&s.cls==='mage'||['main','off'].includes(s.gearAttack)&&gearDef(gearSlotItem(s,s.gearAttack))?.kind==='weapon';}
function gearFits(d,slot) { return d && (d.kind==='weapon'?slot==='main'||(slot==='off'&&!d.two):d.kind==='armor'?slot==='armor':d.slot==='ring'?slot==='ring1'||slot==='ring2':d.slot===slot); }
function gearWeight(s) { return (s.gear||[]).reduce((n,g)=>n+(+gearDef(g)?.weight||0),0)+Object.entries(s.items||{}).reduce((n,[k,v])=>n+Math.max(0,+v||0)*(ITEM_WEIGHT[k]||0),0); }
function equipmentDerived(s,mod,score,prof,cls) {
  ensureEquipment(s);
  const equipped=Object.values(s.equipment).map(id=>gearFind(s,id)).filter(Boolean);
  const active=equipped.filter(g=>!gearBroken(g)&&(!gearDef(g).attune||g.attuned)).map(gearDef);
  const armor=gearBroken(gearSlotItem(s,'armor'))?null:gearDef(gearSlotItem(s,'armor')), shield=gearBroken(gearSlotItem(s,'off'))?null:gearDef(gearSlotItem(s,'off'));
  let ca=armor?armor.ac+(armor.category==='heavy'?0:Math.min(mod.dex,armor.dex??99)):10+mod.dex+(s.cls==='barbare'?mod.con:0);
  const armorText=armor?`${armor.name} ${armor.ac}${armor.category==='heavy'?'':` + DEX ${fmtMod(Math.min(mod.dex,armor.dex??99))}`}`:`10 + DEX ${fmtMod(mod.dex)}${s.cls==='barbare'?` + CON ${fmtMod(mod.con)}`:''}`;
  const defenseText=active.filter(d=>d.acBonus).map(d=>`${d.name} +${d.acBonus}`).join(' + ');
  ca+=active.reduce((n,d)=>n+(d.acBonus||0),0);
  const skills={}; active.forEach(d=>Object.entries(d.skills||{}).forEach(([k,v])=>skills[k]=(skills[k]||0)+v));
  const training=GEAR_TRAINING[s.cls]||GEAR_TRAINING.guerrier, warnings=[];
  equipped.filter(gearBroken).forEach(g=>warnings.push(`${gearDef(g).name} est brisé : réparation nécessaire.`));
  if(armor&&!training.includes(armor.category))warnings.push('Armure non maîtrisée : désavantage aux attaques.');
  if(shield?.kind==='shield'&&!training.includes('shield'))warnings.push('Bouclier non maîtrisé : désavantage aux attaques.');
  if(armor?.str&&score.for<armor.str)warnings.push(`Force ${armor.str} requise : déplacement réduit de 2 cases.`);
  if(armor?.stealth)warnings.push('Armure bruyante : désavantage en discrétion.');
  const held=gearSlotItem(s,s.gearAttack==='off'?'off':'main'),weapon=gearDef(held);
  const spell=s.gearAttack==='spell'&&s.cls==='mage';
  const unarmed=s.gearAttack==='unarmed'||!weapon||weapon.kind!=='weapon';
  const d=spell?{name:'Trait de feu',dice:'1d10',type:'feu',range:6,fx:'fire',spell:true}:unarmed?{name:'Combat à mains nues',dice:'1',type:'contondant',range:1,fx:'smash'}:weapon;
  const ability=spell?'int':d.range>1?'dex':d.finesse&&mod.dex>mod.for?'dex':'for';
  const trained=spell||unarmed||training.includes(d.group)||training.includes(held?.key);
  if(!trained)warnings.push('Arme non maîtrisée : bonus de maîtrise non ajouté.');
  const off=s.gearAttack==='off'&&!unarmed&&!spell;
  const damageMod=spell?0:off?Math.min(0,mod[ability]):mod[ability];
  const bonus=d.bonus||0, dice=d.versatile&&s.gearTwoHanded?d.versatile:d.dice;
  const damage=dice+(damageMod+bonus?fmtMod(damageMod+bonus):'');
  const weight=gearWeight(s),capacity=score.for*7.5,loaded=equipmentState.options.weight&&weight>capacity;
  if(loaded)warnings.push(`Surcharge : ${weight.toFixed(1)} / ${capacity} kg, déplacement réduit de 2 cases.`);
  const move=active.reduce((n,d)=>n+(d.move||0),0)-(loaded?2:0)-(armor?.str&&score.for<armor.str?2:0);
  const thrown=!spell&&!unarmed&&!!s.gearThrown&&!!d.thrown;
  const range=thrown?d.thrown:d.range;
  return {ca,toucher:(trained?prof:0)+mod[ability]+bonus,degats:damage,portee:range,dmgType:d.type,move,
    climb:active.reduce((n,d)=>n+(d.climb||0),0),resist:[...new Set(active.flatMap(d=>d.resist||[]))],skills,
    saveBonus:active.reduce((n,d)=>n+(d.saveBonus||0),0),weight,capacity,warnings,stealth:!!armor?.stealth,
    attackDisadvantage:!!(armor&&!training.includes(armor.category)||shield?.kind==='shield'&&!training.includes('shield')),
    attack:{name:d.name,kind:range>1?'ranged':'melee',fx:thrown?'arrow':d.fx,dur:range>1?850:750,color:bonus?'#d9acff':'#ead8a1'},
    ammo:d.ammo,thrownId:thrown?held.id:null,off,ability,
    explanation:`CA ${ca} = ${armorText}${defenseText?' + '+defenseText:''}. Attaque ${ability.toUpperCase()} ${fmtMod(mod[ability])}${trained?' + maîtrise '+prof:''}${bonus?' + magie '+bonus:''}. Dégâts : ${damage}.`,
  };
}
function gearCanAct(s,outside=false,needsBonus=true) {
  if(simRunning)return 'Une simulation est en cours.';
  const units=map.units.filter(u=>u.sheetId===s.id),u=units.find(x=>activeUnit()===x)||units[0];
  if(map.turn>0&&u&&enforce()) {
    if(outside)return 'Cette opération se fait hors combat.';
    if(activeUnit()!==u||isKO(u))return 'Attends le tour de ce personnage.';
    if(needsBonus&&(u.act?.bonus??1)<=0)return 'Changer d’équipement coûte une action bonus.';
  }
  return '';
}
function equipmentChange(s,fn,{outside=false,cost=true}={}) {
  ensureEquipment(s);
  const copy=JSON.parse(JSON.stringify(s)),reason=fn(copy);
  if(typeof reason==='string'&&reason)return reason;
  const blocked=gearCanAct(s,outside,cost); if(blocked)return blocked;
  pushUndo();
  const u=map.units.find(u=>u.sheetId===s.id&&u===activeUnit())||map.units.find(u=>u.sheetId===s.id);
  if(cost&&map.turn>0&&u&&!spend(u,'bonus'))return 'Plus d’action bonus.';
  copy.gearAuto=false;Object.assign(s,copy); equipmentChanged(s); return '';
}
function equipGear(s,id,slot) {
  return equipmentChange(s,x=>{
    const g=gearFind(x,id),d=gearDef(g); if(!gearFits(d,slot))return 'Cet objet ne va pas dans cet emplacement.';
    if(slot==='off'&&(gearDef(gearSlotItem(x,'main'))?.two||x.gearTwoHanded))return 'Les deux mains sont occupées : retire l’arme principale ou repasse à une main.';
    const prev=gearSlotOf(x,id);if(prev)delete x.equipment[prev];
    x.equipment[slot]=id;
    if(slot==='main') {x.gearTwoHanded=false;x.gearThrown=false;x.gearAttack='main';if(d.two)delete x.equipment.off;}
  },{outside:!['main','off'].includes(slot)});
}
function unequipGear(s,slot) {return equipmentChange(s,x=>{delete x.equipment[slot];if(slot==='main'){x.gearTwoHanded=false;x.gearThrown=false;}},{outside:!['main','off'].includes(slot)});}
function equipmentChanged(s=null) {
  if(SIM)return;
  if(s)ensureEquipment(s);
  for(const u of map.units) {const owner=getSheet(u.sheetId);if(owner&&(!s||owner===s))syncEquipmentUnit(u,owner);}
  actionMode=null;attackMode=false; $('attackHint').classList.add('hidden');
  saveSheets();saveEquipment();changed();syncPlayUI();
  if(mode==='chars'&&curSheet)fillSheetForm();
}
function syncEquipmentUnit(u,s) {
  const hp=u.hp,uses=u.uses;
  applySheet(u,s);u.hp=hp;if(uses)u.uses=uses;
}
function rekeyEquipment(s) {
  ensureEquipment(s);const ids=new Map();for(const g of s.gear){const id=gearId();ids.set(g.id,id);g.id=id;}
  for(const slot in s.equipment)s.equipment[slot]=ids.get(s.equipment[slot]);
}
function reconcileEquipmentMap() {
  for(const u of map.units){const s=getSheet(u.sheetId);if(s)syncEquipmentUnit(u,s);}
  const owned=new Set([...sheets.flatMap(s=>(s.gear||[]).map(g=>g.id)),...equipmentState.chest.gear.map(g=>g.id)]);
  map.droppedGear=(map.droppedGear||[]).filter(e=>e?.item&&gearDef(e.item)&&!owned.has(e.item.id)&&!!owned.add(e.item.id));
}
function applyEquipmentToUnit(u,s,d) {
  u.equipmentVersion=1; u.gear=JSON.parse(JSON.stringify(s.gear));u.equipment={...s.equipment};
  u.gearAttack=s.gearAttack;u.gearThrown=!!s.gearThrown;u.gearTwoHanded=!!s.gearTwoHanded;
  u.gearCombat=JSON.parse(JSON.stringify(d.equipment));
  u.dmgType=d.equipment.dmgType;u.resist=d.equipment.resist;u.saveGear=d.equipment.saveBonus;u.skillGear=d.equipment.skills;
  u.stealthGear=d.equipment.stealth;
}
function syncUnitResources(u) {
  if(SIM||!u.sheetId)return;
  const s=getSheet(u.sheetId);if(!s)return;
  s.items={...u.items};
  if(u.gear) { s.gear=JSON.parse(JSON.stringify(u.gear));s.equipment={...u.equipment}; }
  for(const other of map.units)if(other!==u&&other.sheetId===s.id){other.items={...s.items};other.gear=JSON.parse(JSON.stringify(s.gear));other.equipment={...s.equipment};}
  saveSheets();
}
function consumeUnitItem(u,key,count=1) {
  if(itemCount(u,key)<count)return false;
  u.items[key]-=count;syncUnitResources(u);
  if(!SIM&&u.sheetId){const s=getSheet(u.sheetId);if(s){const d=sheetDerived(s);for(const other of map.units)if(other.sheetId===s.id){other.mov=d.val.deplacement;if(other.gearCombat)other.gearCombat.weight=d.equipment.weight;}}}
  return true;
}
function gearAttackReady(u) {
  const g=u.gearCombat;if(!g)return '';
  if(['main','off'].includes(u.gearAttack)&&gearBroken(gearSlotItem(u,u.gearAttack)))return 'Arme brisée : fais-la réparer au marché.';
  if(g.off) {
    const main=gearDef(gearFind(u,u.equipment?.main)),off=gearDef(gearFind(u,u.equipment?.off));
    if(!main?.light||!off?.light)return 'Deux armes légères sont nécessaires pour l’attaque secondaire.';
  }
  if(equipmentState.options.ammo&&g.ammo&&itemCount(u,g.ammo)<=0)return 'Plus de '+ITEMS[g.ammo].name.toLowerCase()+'.';
  if(g.thrownId&&!gearFind(u,g.thrownId))return 'Cette arme a déjà été lancée.';
  return '';
}
function consumeAttackResource(u) {
  const g=u.gearCombat;if(!g)return;
  if(['main','off'].includes(u.gearAttack))wearEquipment(u,[u.gearAttack]);
  if(equipmentState.options.ammo&&g.ammo)consumeUnitItem(u,g.ammo);
  if(g.thrownId) {
    const item=gearFind(u,g.thrownId);
    if(item) {map.droppedGear ||= [];map.droppedGear.push({item:JSON.parse(JSON.stringify(item)),x:u.x,y:u.y});u.gear=u.gear.filter(x=>x!==item);for(const k in u.equipment)if(u.equipment[k]===item.id)delete u.equipment[k];syncUnitResources(u);}
  }
}
function wearEquipment(u,slots) {
  if(!equipmentState.options.wear||!u.gear)return;
  let touched=false;
  for(const slot of slots){const item=gearSlotItem(u,slot);if(item&&['weapon','armor','shield'].includes(gearDef(item)?.kind)){item.condition=Math.max(0,(item.condition??100)-1);touched=true;}}
  if(!touched)return;syncUnitResources(u);
  const mods=Object.fromEntries(AB_KEYS.map(k=>[k,abMod(u,k)])),d=equipmentDerived(u,mods,u.ab,u.prof,CLASSES[u.cls]);
  const owner=!SIM&&getSheet(u.sheetId);u.ca=owner?sheetDerived(owner).val.ca:d.ca;
  if(u.gearCombat){u.gearCombat.warnings=d.warnings;u.gearCombat.attackDisadvantage=d.attackDisadvantage;}
  u.resist=d.resist;u.saveGear=d.saveBonus;u.skillGear=d.skills;
  if(owner){const derived=sheetDerived(owner);for(const other of map.units)if(other.sheetId===owner.id){other.ca=derived.val.ca;other.mov=derived.val.deplacement;}}
}
function repairPrice(g,loc){return Math.max(1,Math.ceil(equipmentPrice(gearDef(g),loc)*.25*(100-(g.condition??100))/100));}
function repairEquipment(s,id,loc) {
  const blocked=gearCanAct(s,true);if(blocked)return blocked;const g=gearFind(s,id);if(!g||(g.condition??100)>=100)return 'Cet objet est en bon état.';
  const price=repairPrice(g,loc);if((s.gold||0)<price)return 'Pas assez d’or pour la réparation.';
  pushUndo();s.gold-=price;g.condition=100;equipmentChanged(s);return '';
}
function finishThrownAttack(u) {
  if(!u.gearCombat?.thrownId)return;
  const s=!SIM&&getSheet(u.sheetId);
  if(s)map.units.filter(other=>other.sheetId===s.id).forEach(other=>syncEquipmentUnit(other,s));
  else switchUnitWeapon(u,'unarmed');
  invalidateZones();
}
function switchUnitWeapon(u,choice) {
  if(!u.gearCombat)return;
  u.gearAttack=choice;u.gearThrown=false;
  const mods=Object.fromEntries(AB_KEYS.map(k=>[k,abMod(u,k)])),d=equipmentDerived(u,mods,u.ab,u.prof,CLASSES[u.cls]);
  Object.assign(u,{gearCombat:d,ca:d.ca,toucher:d.toucher,degats:d.degats,atk:d.portee,dmgType:d.dmgType});
  if(!SIM){const s=getSheet(u.sheetId);if(s){s.gearAttack=choice;s.gearThrown=false;saveSheets();}}
  invalidateZones();
}
function prepareAiEquipment(u) {
  if(!u.gearCombat||!gearAttackReady(u))return;
  const original=u.gearAttack;
  for(const choice of ['main','off',...(u.cls==='mage'?['spell']:[]),'unarmed']) {
    if(choice===original)continue;
    if(['main','off'].includes(choice)&&gearDef(gearSlotItem(u,choice))?.kind!=='weapon')continue;
    switchUnitWeapon(u,choice);if(!gearAttackReady(u)){addLog(`🤖 ${u.name} utilise ${attackOf(u).name.toLowerCase()}.`,'turn');return;}
  }
}
function gearPowerAvailable(u,resource) {
  const g=gearFind(u,resource.slice(5)),d=gearDef(g);
  return !!(g&&d?.power&&g.charges>0&&gearSlotOf(u,g.id)&&(!d.attune||g.attuned));
}
function consumeActionResource(u,key) {
  if(key.startsWith('gear:')) {if(!gearPowerAvailable(u,key))return false;gearFind(u,key.slice(5)).charges--;syncUnitResources(u);return true;}
  return consumeUnitItem(u,key);
}
function rechargeGear(s) {ensureEquipment(s);s.gear.forEach(g=>{const d=gearDef(g);if(d.charges)g.charges=d.charges;});}
function storeLoot(loot) {
  if(!loot||loot.stored)return false;
  for(const k of loot.gearKeys||[])if(GEAR[k])equipmentState.chest.gear.push(makeGear(k));
  loot.stored=true;saveEquipment();return true;
}
function transferGear(source,target,id) {
  if(source===target)return 'Choisis un autre destinataire.';
  if(source.base){ensureEquipment(source);const err=gearCanAct(source,true);if(err)return err;}
  if(target.base){ensureEquipment(target);const err=gearCanAct(target,true);if(err)return err;}
  const item=gearFind(source,id);if(!item)return 'Objet introuvable.';
  pushUndo();source.gear=source.gear.filter(g=>g!==item);for(const slot in source.equipment||{})if(source.equipment[slot]===id)delete source.equipment[slot];
  item.attuned=false;source.gearAuto=false;target.gearAuto=false;target.gear.push(item);equipmentChanged();return '';
}
function transferItem(source,target,key,count) {
  count=Math.floor(+count);if(source===target||count<1||!Number.isFinite(count)||itemCount(source,key)<count)return 'Quantité ou destinataire invalide.';
  for(const s of [source,target])if(s.base){const err=gearCanAct(s,true);if(err)return err;}
  pushUndo();source.items[key]-=count;target.items||={};target.items[key]=(target.items[key]||0)+count;equipmentChanged();return '';
}
function equipmentHistory() {return {state:equipmentState,loot:lastLoot,sheets:sheets.map(s=>({id:s.id,gear:s.gear,equipment:s.equipment,gearAttack:s.gearAttack,gearTwoHanded:!!s.gearTwoHanded,gearThrown:!!s.gearThrown,gearAuto:!!s.gearAuto,items:s.items,gold:s.gold||0,hpCur:s.hpCur??null,xp:s.xp||0,uses:s.uses||null,hd:s.hd??null,dead:!!s.dead}))};}
function restoreEquipmentHistory(data) {if(!data)return;equipmentState=normalizeEquipmentState(data.state);lastLoot=data.loot||null;for(const r of data.sheets||[]){const s=getSheet(r.id);if(s)Object.assign(s,r);}saveSheets();saveEquipment();if(mode==='chars')renderChars();if($('lootStore'))$('lootStore').disabled=!lastLoot||!!lastLoot.stored;if($('lootShare'))$('lootShare').disabled=!lastLoot||!!lastLoot.shared;}
