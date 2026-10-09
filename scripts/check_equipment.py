"""Integration checks for equipment and world atlas in an isolated Edge profile."""
import json
import time
from generate_readme_media import ROOT, WORK, run_browser

CHECKS = r"""
(async()=>{
 const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
 assert(mediaErrors.length===0,mediaErrors.join('\n'));
 soundOn=false;aiPaused=true;autoMonsters=false;autoHeroes=false;
 const checks=[],s=newSheet();s.name='Test équipement';s.base={for:16,dex:14,con:14,int:12,sag:10,cha:10};
 s.items={potion:2,arrow:3,ration:10};s.inventory='Ancienne corde narrative';s.over={};sheets=[s];ensureEquipment(s);curSheet=s;
 const before=JSON.stringify(s.gear);ensureEquipment(s);assert(before===JSON.stringify(s.gear),'Migration répétée');
 assert(s.inventory==='Ancienne corde narrative','Notes perdues');assert(sheetDerived(s).val.ca===18,'CA initiale');
 assert(s.gear.length===3,'Équipement initial guerrier');checks.push('Migration idempotente et équipement de départ');
 map=newMap(16,12);setMode('chars');openSheet(s.id);assert($('equipmentPanel').querySelectorAll('.gear-slot').length===10,'Emplacements visibles');
 const bow=makeGear('longbow');s.gear.push(bow);assert(!equipGear(s,bow.id,'main'),'Équiper arc');
 assert(!s.equipment.off&&sheetDerived(s).val.ca===16,'Arc et bouclier incompatibles');assert(sheetDerived(s).val.portee===8,'Portée arc');
 const shield=s.gear.find(g=>g.key==='shield');assert(!!equipGear(s,shield.id,'off'),'Bouclier avec arc bloqué');
 const u=addUnit('sheet:'+s.id,3,3),foe=addUnit('ogre',7,3);assert(attackOf(u).fx==='arrow','Animation arc du guerrier');
 u.hp=8;s.hpCur=8;equipmentState.options.ammo=true;equipmentChanged(s);assert(u.hp===8,'Équiper soigne le personnage');
 checks.push('Deux mains, CA, portée, animation et PV conservés');
 const prevLater=later;later=fn=>fn();rulesMode=false;autoRoll=true;newBudget(u);newBudget(foe);seedRng(30);
 attack(u,foe);assert(u.items.arrow===2&&s.items.arrow===2,'Munition synchronisée');
 undo();assert(s.items.arrow===3&&map.units.find(x=>x.sheetId===s.id).items.arrow===3,'Annulation munition');
 redo();assert(s.items.arrow===2,'Rétablissement munition');
 let hero=map.units.find(x=>x.sheetId===s.id);useItem(hero,'potion');assert(s.items.potion===1,'Potion consommée sur fiche');
 applySheet(hero,s);assert(hero.items.potion===1,'Synchronisation restitue une potion');
 undo();assert(s.items.potion===2,'Annulation potion');redo();hero=map.units.find(x=>x.sheetId===s.id);assert(s.items.potion===1,'Rétablissement potion');
 checks.push('Munitions, consommables et annuler/rétablir sans duplication');
 map.turn=0;const mageItem=makeGear('healing_amulet');s.gear.push(mageItem);equipGear(s,mageItem.id,'neck');
 equipmentChange(s,x=>{gearFind(x,mageItem.id).attuned=true;},{outside:true,cost:false});
 hero=map.units.find(x=>x.sheetId===s.id);const resource='gear:'+mageItem.id;assert(gearPowerAvailable(hero,resource),'Objet magique disponible');newBudget(hero);
 assert(resolveAction(hero,'second_souffle',{unit:hero},resource)!==false,'Pouvoir exécuté');assert(gearFind(s,mageItem.id).charges===2,'Charge consommée');
 longRest(s);assert(gearFind(s,mageItem.id).charges===3,'Charges au repos');
 const cloak=makeGear('protection_cloak');s.gear.push(cloak);equipGear(s,cloak.id,'cape');const ca0=sheetDerived(s).val.ca;
 equipmentChange(s,x=>{gearFind(x,cloak.id).attuned=true;},{outside:true,cost:false});assert(sheetDerived(s).val.ca===ca0+1,'Harmonisation applique bonus');
 checks.push('Harmonisation, bonus, pouvoir ciblé et charges au repos');
 const s2=newSheet();s2.name='Destinataire';sheets.push(s2);ensureEquipment(s2);const count=s.gear.length;
 assert(!transferGear(s,s2,cloak.id),'Transfert');assert(s.gear.length===count-1&&gearFind(s2,cloak.id)&&!gearFind(s2,cloak.id).attuned,'Exemplaire transféré');
 assert(!transferItem(s,s2,'potion',1)&&s.items.potion===0&&s2.items.potion===2,'Transfert quantité');
 assert(transferItem(s,s2,'potion',1),'Stock négatif refusé');
 s.gold=100;assert(!buyEquipment(s,'dagger',null),'Achat');assert(s.gold===98,'Prix achat');const bought=s.gear.at(-1);assert(!sellEquipment(s,bought.id,null)&&s.gold===99,'Vente');
 checks.push('Transferts, quantités, achat et vente');
 const custom=makeGear('custom',{...GEAR.longbow,name:'Arc du test',bonus:2});s.gear.push(custom);equipGear(s,custom.id,'main');
 const loaded=JSON.parse(JSON.stringify(s));ensureEquipment(loaded);assert(sheetDerived(loaded).val.degats===sheetDerived(s).val.degats,'Objet personnalisé exporté');
 const empty=JSON.parse(JSON.stringify(s));empty.gear=[];empty.equipment={};ensureEquipment(empty);assert(empty.gear.length===0,'Sac vide recréé au chargement');
 s.over.ca=23;assert(sheetDerived(s).val.ca===23,'Valeur MJ conservée');delete s.over.ca;
 const loot=genTreasure(8),initial=equipmentState.chest.gear.length;storeLoot(loot);storeLoot(loot);assert(equipmentState.chest.gear.length===initial+loot.gearKeys.length,'Butin dupliqué');
 const copied=JSON.parse(JSON.stringify(s));rekeyEquipment(copied);assert(!copied.gear.some(g=>s.gear.some(old=>old.id===g.id))&&gearSlotItem(copied,'main'),'Exemplaires uniques sur fiche copiée');
 map.units.find(x=>x.sheetId===s.id).items.potion=99;map.droppedGear=[{item:JSON.parse(JSON.stringify(s.gear[0])),x:0,y:0}];reconcileEquipmentMap();
 assert(map.units.find(x=>x.sheetId===s.id).items.potion===s.items.potion&&map.droppedGear.length===0,'Ancienne carte restaure des objets');
 checks.push('Objets personnalisés, valeurs MJ, butin récupérable une seule fois');
 // Strict turn rules, encumbrance, thrown weapons, spell DC and simulator isolation.
 equipmentChanged(s);hero=map.units.find(x=>x.sheetId===s.id);startCombat();map.order=[hero.id,...map.units.filter(x=>x!==hero).map(x=>x.id)];map.active=0;newBudget(hero);rulesMode=true;
 const dagger=makeGear('dagger');s.gear.push(dagger);assert(!equipGear(s,dagger.id,'main')&&hero.act.bonus===0,'Changement coûte un bonus');
 assert(equipGear(s,custom.id,'main'),'Deuxième changement bloqué');assert(!selectGearAttack(s,'unarmed'),'Choisir attaque gratuite');
 assert(transferGear(s,s2,dagger.id),'Transfert strict en combat bloqué');
 map.turn=0;rulesMode=false;equipGear(s,custom.id,'main');hero=map.units.find(x=>x.sheetId===s.id);hero.items.arrow=0;syncUnitResources(hero);newBudget(hero);
 assert(attack(hero,map.units.find(x=>x!==hero))===false&&hero.act.action===1,'Sans munition : pas de dépense');
 const sourceState=JSON.stringify(sheets),chestState=JSON.stringify(equipmentState);
 const sim=await simulate(simBase(),{n:3,maxRounds:5,seed:144});assert(sim.n===3,'Simulations équipement');
 assert(JSON.stringify(sheets)===sourceState&&JSON.stringify(equipmentState)===chestState,'Simulation modifie ressources réelles');
 s.items.corde=50;equipmentState.options.weight=true;const slowed=sheetDerived(s);assert(slowed.val.deplacement===RACES[s.race].depl-2,'Surcharge');equipmentState.options.weight=false;s.items.corde=0;
 const spear=makeGear('spear');s.gear.push(spear);equipGear(s,spear.id,'main');equipmentChange(s,x=>{x.gearThrown=true;},{cost:false});hero=map.units.find(x=>x.sheetId===s.id);newBudget(hero);
 attack(hero,map.units.find(x=>x!==hero));assert(!gearFind(s,spear.id)&&map.droppedGear.some(e=>e.item.id===spear.id),'Arme lancée au sol');assert(hero.atk===1,'Retour mains nues');
 undo();assert(gearFind(s,spear.id)&&!map.droppedGear?.some(e=>e.item.id===spear.id),'Annulation lancer');
 const mage=newSheet();mage.cls='mage';ensureEquipment(mage);sheets.push(mage);const m=addUnit('sheet:'+mage.id,0,0),dc=saveDC(m,ACTIONS.boule_feu);selectGearAttack(mage,'main');assert(saveDC(m,ACTIONS.boule_feu)===dc,'Arme change DD des sorts');
 checks.push('Mode strict, munitions épuisées, surcharge, lancer, DD des sorts et 3 simulations isolées');
 equipmentState.options.wear=true;hero=map.units.find(x=>x.sheetId===s.id);const worn=gearSlotItem(s,'main');worn.condition=1;s.gearThrown=false;equipmentChanged(s);hero=map.units.find(x=>x.sheetId===s.id);
 attack(hero,map.units.find(x=>x!==hero));assert(gearFind(s,worn.id).condition===0&&gearAttackReady(hero).includes('brisée'),'Arme usée puis inutilisable');
 s.gold=100;const repair=repairPrice(gearFind(s,worn.id),null);assert(!repairEquipment(s,worn.id,null)&&s.gold===100-repair&&gearFind(s,worn.id).condition===100,'Réparation payée');
 const armor=gearSlotItem(s,'armor');armor.condition=0;const bare=sheetDerived(s).val.ca;armor.condition=100;assert(sheetDerived(s).val.ca>bare,'Protection brisée ne protège plus');equipmentState.options.wear=false;equipmentChanged(s);
 checks.push('Usure optionnelle, arme brisée, CA et réparation au marché');
 setMode('chars');openSheet(s.id);const countCustom=s.gear.length;
 $('custom_name').value='Objet <test> personnel';$('custom_name').closest('form').requestSubmit();assert(s.gear.length===countCustom+1,'Création via formulaire');
 assert(s.gear.at(-1).custom.name==='Objet <test> personnel'&&!$('equipmentPanel').querySelector('test'),'Nom personnalisé affiché comme texte');
 $('gearSearch').value='introuvable';$('gearSearch').dispatchEvent(new Event('input'));assert($('gearInventory').textContent.includes('Aucun objet'),'Recherche inventaire');gearSearch='';
 checks.push('Formulaire personnalisé et recherche via les contrôles de la fiche');
 const fresh=newSheet();sheets.push(fresh);openSheet(fresh.id);$('shCls').value='mage';$('shCls').dispatchEvent(new Event('change'));
 assert(fresh.gear.some(g=>g.key==='staff')&&!fresh.gear.some(g=>g.key==='chain'),'Paquet de départ suit la création');
 later=prevLater;seedRng(null);map.turn=0;setMode('world');world=newWorld(331,'continent');ensurePositions();renderWorldPanels();fitWorld();drawWorld();
 wsel.ids=new Set([s.id]);const a=world.locations[0],b=world.locations[1];planWorldStop(a,a,false);planWorldStop(b,b,true);
 assert(world.route.points.length===2&&atlasRouteInfo().legs.length===2,'Itinéraire à étapes');
 const saved=JSON.parse(JSON.stringify(world));assert(saved.route.points[1].locId===b.id,'Itinéraire sauvegardé');
 a.favorite=true;$('atlasFilter').value='favorite';renderLocList();assert($('wLocList').children.length===1,'Filtre favoris');
 $('wSearch').value='LieuIntrouvable';renderLocList();assert($('wLocList').textContent.includes('Aucun lieu'),'Liste vide expliquée');$('wSearch').value='';$('atlasFilter').value='';
 const routeBefore=JSON.stringify(world.route);world.pending={enc:{counts:{}},ids:[s.id],x:0,y:0};planWorldStop(b,b);assert(routeBefore===JSON.stringify(world.route),'Rencontre bloque nouvel itinéraire');world.pending=null;
 const oldTravel=travelTo;travelTo=()=>{world.pending={};};travelNextStop();assert(world.route.points.length===2,'Étape conservée si rencontre');world.pending=null;travelTo=()=>{};travelNextStop();assert(world.route.points.length===1,'Étape retirée si arrivée');travelTo=oldTravel;
 drawWorld();assert($('atlasMini').width===220,'Mini-carte');checks.push('Atlas, itinéraire persistant, filtres, rencontre et mini-carte');
 assert(mediaErrors.length===0,mediaErrors.join('\n'));
 return {checks,catalog:Object.keys(GEAR).length};
})()
"""

def check(cdp, base):
    result=cdp.js(CHECKS)
    state="JSON.stringify({sheets:sheets.map(s=>({id:s.id,gear:s.gear,equipment:s.equipment,items:s.items})),equipment:equipmentState,route:world.route})"
    cdp.js('saveSheets();saveEquipment();saveWorld(true);changed();')
    before=cdp.js(state)
    cdp.call('Page.reload')
    for _ in range(100):
        if cdp.js("document.readyState==='complete' && typeof sheets!=='undefined' && sheets.length>0"):
            break
        time.sleep(.05)
    assert cdp.js(state)==before, 'Reload changed equipment, resources or itinerary'
    assert cdp.js('mediaErrors')==[], 'JavaScript error on reload'
    result['checks'].append('Rechargement réel : équipement, ressources, coffre et itinéraire conservés')
    print(json.dumps(result,ensure_ascii=False,indent=2),flush=True)
    (WORK/'equipment-checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')

if __name__=='__main__':
    run_browser(check)
