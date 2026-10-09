"""Check expedition resources, rests, travel and persistence in isolated Edge."""
import json
import time
from generate_readme_media import run_browser, WORK

CHECKS = r"""
(async()=>{
 const assert=(v,m)=>{if(!v)throw Error(m);},checks=[];
 world=newWorld(1234,'continent');map=newMap(22,14);sheets=[];
 const a=newSheet(),b=newSheet(),dead=newSheet();a.name='Ariane';b.name='Borin';dead.name='Disparu';dead.dead=true;
 a.level=4;b.level=4;a.hpCur=2;b.hpCur=0;a.hd=3;b.hd=2;
 sheets=[a,b,dead];sheets.forEach(ensureEquipment);a.items={ration:0};b.items={ration:2};dead.items={ration:9};
 equipmentState.chest.items={ration:5};ensurePositions();wsel.ids=new Set([a.id,b.id]);setMode('world');
 addUnit('sheet:'+a.id,2,2);addUnit('sheet:'+b.id,5,2);let u=map.units[0],v=map.units[1];
 $('btnExpedition').click();assert($('expeditionDialog').open,'Camp ouvert depuis atlas');
 assert(document.querySelectorAll('.expedition-member').length===2,'Exclut les défunts');
 expeditionDays=4;renderExpedition();const preview=expeditionRations(sheets,4);
 assert(preview.used===5&&preview.missing===1&&a.items.ration===0&&b.items.ration===2,'Aperçu pur et équitable');
 assert(preview.entries[0].added===4&&preview.entries[1].added===1,'Sacs les moins fournis prioritaires');
 pushUndo();$('expeditionDistribute').click();assert(a.items.ration+b.items.ration===7&&equipmentState.chest.items.ration===0,'Conservation des rations');
 assert(u.items.ration===a.items.ration&&v.items.ration===b.items.ration&&dead.items.ration===9,'Sacs synchronisés, morts exclus');
 assert(!undoStack.length&&!redoStack.length,'Ancien historique ne restaure pas les vivres');
 checks.push('Camp, aperçu de ravitaillement équitable, conservation et synchronisation des stocks');
 expeditionDice[a.id]=1;expeditionDice[b.id]=0;const hp=a.hpCur,day=world.day;restExpedition('short');
 assert(a.hd===2&&a.hpCur>hp&&u.hp===(a.hpCur??u.hpMax),'Repos court dépense un dé et synchronise les PV');
 assert(b.hd===2&&b.hpCur===0&&world.day===day,'Zéro dé préserve les PV et le calendrier');
 expeditionIds=[a.id];restExpedition('long');assert(a.hpCur===null&&u.hp===u.hpMax&&a.hd===4&&b.hpCur===0&&world.day===day+1,'Repos long seulement pour la sélection');
 const before=JSON.stringify({sheets,equipmentState,day:world.day});map.turn=1;
 assert(!restExpedition('long')&&!distributeExpeditionRations()&&JSON.stringify({sheets,equipmentState,day:world.day})===before,'Ressources bloquées pendant combat');map.turn=0;
 checks.push('Repos choisi, dés limités, PV synchronisés, jours et blocage en combat');
 $('expeditionDialog').close();v.ds={s:2,f:1};v.stable=true;setMode('chars');openSheet(b.id);$('shRest').click();assert(b.hpCur===null&&v.hp===v.hpMax&&!v.ds&&!v.stable,'Repos individuel met à jour figurine et jets de mort');
 undo();assert(b.hpCur===0&&map.units.find(x=>x.sheetId===b.id).hp===0,'Repos individuel annulable');redo();
 setMode('world');u=map.units.find(x=>x.sheetId===a.id);v=map.units.find(x=>x.sheetId===b.id);
 world.expedition={events:false,pace:'normal',chestRations:false};a.items.ration=0;b.items.ration=0;a.hpCur=2;b.hpCur=0;
 const p=world.pos[a.id];travelEvents([a,b,dead],p,p,2);
 assert(a.hpCur===1&&b.hpCur===0&&v.hp===0&&dead.items.ration===9&&!world.pending,'Faim ne ressuscite pas, morts et événements désactivés respectés');
 equipmentState.chest.items.ration=4;world.expedition.chestRations=true;
 const hunger=travelEvents([a,b],p,p,2);assert(equipmentState.chest.items.ration===0&&a.items.ration===0&&b.items.ration===0&&hunger.out.some(t=>t.includes('coffre')),'Coffre consommé pour jours réellement parcourus');
 checks.push('Pénurie sans résurrection et ravitaillement automatique depuis le coffre');
 equipmentState.chest.items.ration=10;a.items.ration=0;b.items.ration=0;world.expedition.events=true;
 const random=Math.random;Math.random=()=>.1;const land=world.locations.find(l=>!WT.t.water[wIdx(l.x,l.y)]);
 let interrupted;try{interrupted=travelEvents([a,b],land,land,5);}finally{Math.random=random;}
 assert(interrupted.days===1&&interrupted.stop&&world.pending&&equipmentState.chest.items.ration===8,'Rencontre consomme un seul jour de vivres');
 world.pending=null;world.expedition.events=false;
 const terrain=WT;WT={t:{W:10,H:10,water:new Uint8Array(100),biome:new Uint8Array(100).fill(BI.grass)}};
 const start={x:1,y:1},end={x:8,y:1};world.scale=20;
 const normal=travelInfo(start,end).days;world.expedition.pace='slow';const slow=travelInfo(start,end).days;world.expedition.pace='fast';const fast=travelInfo(start,end).days;
 assert(slow>normal&&normal>fast,'Allure terrestre modifie durée');WT.t.water.fill(1);const sea=travelInfo(start,end).days;world.expedition.pace='slow';assert(travelInfo(start,end).days===sea,'Vitesse en mer indépendante');WT=terrain;
 world.scale=8;world.expedition.pace='normal';wsel.ids=new Set([a.id,b.id]);$('expeditionDialog').close();
 const target={x:0,y:0};assert(travelTo(target),'Départ');const ends=JSON.stringify(wanim.ends);
 assert(Object.entries(wanim.ends).every(([id,p])=>JSON.stringify(world.pos[id])===JSON.stringify(p)&&p.x>=0&&p.y>=0),'Destination définitive sauvegardée avant animation et bornée');
 worldAnimTick();assert(JSON.stringify(wanim.ends)===ends&&Object.entries(wanim.ends).every(([id,p])=>JSON.stringify(world.pos[id])===JSON.stringify(p)),'Animation ne modifie pas les coordonnées sauvegardées');
 await new Promise(r=>setTimeout(r,2400));
 const dayAfter=world.day;wsel.ids=new Set([a.id]);assert(travelTo(world.pos[a.id])===false&&world.day===dayAfter,'Déplacement nul ne consomme pas une journée');
 checks.push('Allures, mer, sauvegarde immédiate du trajet, limites de carte et trajet nul');
 let file;const dl=download;download=(name,url)=>{file=fetch(url).then(r=>r.json());};$('wExport').click();const exported=await file;download=dl;
 assert(exported.world.expedition.pace==='normal'&&exported.world.expedition.chestRations&&exported.world.expedition.events===false,'Options incluses dans export');
 saveSheets();saveEquipment();saveWorld(true);changed();assert(!mediaErrors.length,mediaErrors.join('\n'));return {checks};
})()
"""

def check(cdp, base):
    result = cdp.js(CHECKS)
    state = 'JSON.stringify({options:world.expedition,positions:world.pos,day:world.day,sheets:sheets.map(s=>({id:s.id,hp:s.hpCur,hd:s.hd,items:s.items})),chest:equipmentState.chest.items})'
    before = cdp.js(state)
    cdp.call('Page.reload')
    for _ in range(100):
        if cdp.js("document.readyState==='complete' && typeof world!=='undefined' && world!==null"):
            break
        time.sleep(.05)
    assert cdp.js(state) == before, 'Expedition state changed after reload'
    cdp.js("setMode('world');openExpedition()")
    for width in (1440, 760, 390):
        cdp.call('Emulation.setDeviceMetricsOverride', width=width, height=900, deviceScaleFactor=1, mobile=False)
        time.sleep(.1)
        assert cdp.js("$('expeditionDialog').scrollWidth<=$('expeditionDialog').clientWidth+1"), f'Camp overflow at {width}'
    assert cdp.js('mediaErrors') == []
    result['checks'].append('Export, rechargement réel et panneau sans débordement à 1440, 760 et 390 px')
    print(json.dumps(result, ensure_ascii=False, indent=2), flush=True)
    (WORK / 'expedition-checks.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')

if __name__ == '__main__':
    run_browser(check)
