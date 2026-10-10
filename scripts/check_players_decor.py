"""Exercise decor and the real two-window projection in an isolated Edge profile."""
import json
import time
import urllib.request
from generate_readme_media import CDP, run_browser, WORK, ROOT


def wait(cdp, expression):
    for _ in range(100):
        if cdp.js(expression):
            return
        time.sleep(.1)
    raise AssertionError(expression)


CHECKS = r"""
(async()=>{
 const assert=(ok,text)=>{if(!ok)throw Error(text);};
 const keys=Object.keys(SMALL_DECOR);assert(keys.length===24,'24 petits décors');
 map=newMap(14,12);setMode('edit');
 const samples=new Set();
 for(const key of keys){
   const c=document.createElement('canvas');c.width=c.height=80;const ctx=c.getContext('2d');ctx.translate(16,16);
   drawObj(ctx,makeObj(key,0,0));assert(ctx.getImageData(0,0,80,80).data.some((v,i)=>i%4===3&&v>0),'Décor dessiné : '+key);samples.add(c.toDataURL());
   const o=addObj(key,2,2);o.e=6;invalidateZones();
   assert(surfaceLevel(2,2)===0&&terrainGrids().surf[30]===0&&terrainGrids().objCost[30]===1,'Accessoire franchissable : '+key);
   map.objects=[];
 }
 assert(samples.size===24,'24 silhouettes distinctes');
 const table=addObj('table',2,2),plate=addObj('plates',2,2);assert(objLift(plate)===table.e*LH(),'Accessoire posé sur la table');map.objects=[];
 document.querySelector('[data-obj="candles"]').click();assert(curObj==='candles'&&tool==='object','Palette fonctionne');
 $('objSearch').value='boug';$('objSearch').dispatchEvent(new Event('input'));
 assert(!document.querySelector('[data-obj="candles"]').classList.contains('hidden'),'Recherche de décor');
 $('objSearch').value='';$('objCategory').value='camp';filterObjects();
 assert([...document.querySelectorAll('[data-obj]:not(.hidden)')].length===4,'Filtre campement');
 $('objCategory').value='';filterObjects();
 select(addObj('rug',4,4));rotate();assert(sel.rotation===1,'Rotation');undo();assert(!map.objects[0].rotation,'Annulation');redo();assert(map.objects[0].rotation===1,'Rétablissement');
 const capture=download;let saved;download=(name,url)=>{saved=fetch(url).then(r=>r.json());};$('btnSave').click();const exported=await saved;download=capture;
 map=newMap(2,2);await $('fileIn').onchange({target:{files:[new File([JSON.stringify(exported)],'decor.json')],value:''}});
 assert(map.objects[0].type==='rug'&&map.objects[0].rotation===1,'Export et rechargement des accessoires');
 for(const theme of ['undergrowth','camp','dungeon']){
   map=newMap(20,14);$('moduleScatterTheme').value=theme;mapModule='scatter';setTool('module');startMapModule({cx:1,cy:1});updateMapModule({cx:18,cy:12});
   assert(drag.plan.objects.length>0&&drag.plan.objects.every(o=>SMALL_DECOR[o.type]),'Dispersion '+theme);commitMapModule(drag);drag=null;
 }
 setMode('world');await nemaiImage.decode();playerScene='world';
 const monster=newSheet();monster.sprite='dragon';monster.camp='monster';monster.name='SECRET adversaire mondial';sheets.push(monster);ensurePositions();
 const before=renderPlayerFrame().image,loc=world.locations[0];
 const state=JSON.stringify({world,map,sheets});renderPlayerFrame();assert(state===JSON.stringify({world,map,sheets}),'Projection sans mutation');
 loc.notes='SECRET notes';loc.favorite=true;loc.battle=newMap(8,8);wsel.loc=loc;world.pos[monster.id]={x:80,y:80};
 assert(renderPlayerFrame().image===before,'Aucun marqueur de bataille, favori, sélection ou monstre mondial projeté');
 const originalQuest=drawQuestMarks,originalRoutes=drawWorldRoutes;
 drawQuestMarks=()=>{throw Error('Quêtes projetées');};drawWorldRoutes=()=>{throw Error('Itinéraire MJ projeté');};renderPlayerFrame();drawQuestMarks=originalQuest;drawWorldRoutes=originalRoutes;
 map=newMap(12,10);setMode('play');
 const hero=addUnit('warrior',1,2),mob=addUnit('goblin',5,2),hidden=addUnit('dragon',8,6);
 hidden.hidden=true;hidden.name='SECRET figurine';map.marks=[{id:100,x:2,y:2,type:'piege',text:'SECRET piège'}];
 map.fogOn=true;map.fogAuto=false;map.fog=Array(120).fill(1);for(let y=6;y<10;y++)for(let x=0;x<12;x++)map.fog[y*12+x]=0;
 const fogUnit=addUnit('goblin',1,8);fogUnit.name='SECRET brouillard';
 playSel=mob;attackMode=true;hover={wx:hero.x*T,wy:hero.y*T};
 const first=renderPlayerFrame().image;mob.hp=1;mob.hpMax=999;hidden.name='SECRET autre';hidden.hp=1;fogUnit.name='SECRET modifié';map.marks[0].text='SECRET modifié';
 assert(first===renderPlayerFrame().image,'PV monstres, figurines cachées, brouillard et marqueurs protégés');
 const effect=drawAreaFx;let effects=0;drawAreaFx=c=>{effects++;c.fillStyle='#ff0000';c.fillRect(-10000,-10000,20000,20000);};
 areaList=[{source:hidden.id,start:performance.now(),dur:1000}];renderPlayerFrame();assert(effects===0,'Sort caché non projeté');
 areaList[0].source=hero.id;renderPlayerFrame();assert(effects===1,'Sort visible projeté');
 const pc=playerCanvas.getContext('2d'),matrix=pc.getTransform(),pixel=pc.getImageData(Math.round(matrix.a*9.5*T+matrix.e),Math.round(matrix.d*8.5*T+matrix.f),1,1).data;
 assert(pixel[0]===7&&pixel[1]===8&&pixel[2]===11,'Animation coupée par le brouillard opaque');drawAreaFx=effect;areaList=[];
 const dimensions={cam:{...cam},mode,previewPlayers,curZones};renderPlayerFrame();assert(cam.x===dimensions.cam.x&&cam.z===dimensions.cam.z&&mode===dimensions.mode&&previewPlayers===dimensions.previewPlayers&&curZones===dimensions.curZones,'État MJ restauré');
 map.turn=1;map.order=[hidden.id];map.active=0;assert(!playerBattleTitle().includes('SECRET'),'Tour caché sans nom');map.turn=0;map.order=[];
 let publicInfo=publicCombatInfo();
 assert(publicInfo.units.length===2&&!JSON.stringify(publicInfo).includes('SECRET'),'Résumé limité aux figurines visibles');
 const enemy=publicInfo.units.find(u=>!u.hero);
 assert(!('hp' in enemy)&&!('hpMax' in enemy)&&!('id' in enemy)&&!('initRoll' in enemy),'Aucune statistique ennemie ni identifiant privé');
 const safe=JSON.stringify(publicInfo);mob.hp=2;mob.ca=999;mob.initRoll=99;hidden.x=9;
 assert(JSON.stringify(publicCombatInfo())===safe,'Statistiques ennemies et figurines cachées sans effet sur le résumé');
 map.turn=1;map.order=[hero.id,hidden.id,mob.id,fogUnit.id];map.active=0;
 publicInfo=publicCombatInfo();assert(publicInfo.next===''&&publicInfo.units[0].active,'Prochain tour secret non annoncé');
 map.active=1;assert(!JSON.stringify(publicCombatInfo()).includes('SECRET'),'Tour actif secret sans nom ni portrait');
 map.turn=0;map.order=[];
 setMode('world');saveWorld(true);saveSheets();changed();
 assert(!mediaErrors.length,mediaErrors.join('\n'));
 return ['24 décors distincts, franchissables, rotation, recherche, filtres, export/import','Trois dispersions de petits décors','Monde et combat : informations privées absentes du rendu, état MJ inchangé'];
})()
"""


def popup(cdp, expression='openPlayerScreen()'):
    evaluation=cdp.call('Runtime.evaluate', expression=expression, userGesture=True)
    assert not evaluation.get('exceptionDetails'),evaluation
    port=cdp.sock.getpeername()[1]
    for _ in range(60):
        pages=json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json/list'))
        screen=next((p for p in pages if 'players.html' in p['url']), None)
        if screen:
            viewer=CDP(screen['webSocketDebuggerUrl']);viewer.call('Page.enable')
            wait(viewer,"typeof picture!=='undefined' && !!picture")
            return viewer
        time.sleep(.1)
    raise AssertionError('Player popup did not open: '+json.dumps(cdp.js("({mode,turn:map.turn,closed:playerWindow?.closed,errors:mediaErrors})")))


def check(cdp, base):
    checks=cdp.js(CHECKS)
    time.sleep(.8)
    store='JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])))'
    before=cdp.js(store)
    viewer=popup(cdp)
    assert before==cdp.js(store),'Viewer changed campaign saves'
    assert viewer.js("title.textContent.includes('Nemaï') && curtain.hidden && !document.querySelector('aside')")
    # A genuine loaded window consumes the messages, not a mocked storage handler.
    cdp.js("world.day=12;saveWorld(true)")
    wait(viewer,"title.textContent.includes('Jour 12')")
    viewer.screenshot().save(WORK/'players-world.png')
    cdp.js("setMode('play');autoMonsters=false;autoHeroes=false")
    cdp.call('Runtime.evaluate',expression="$('btnStartPlayers').click()",userGesture=True)
    wait(viewer,"title.textContent.includes('Round 1')")
    assert cdp.js("mode==='play' && map.turn===1 && !document.body.classList.contains('player-view')"),'MJ remains in control'
    cdp.js("map.order=map.units.map(u=>u.id);map.active=0;beginTurn()")
    wait(viewer,"!combatHud.hidden && document.getElementById('combatTurn').textContent.includes('Guerrier')")
    assert viewer.js("initiative.children.length===2 && !combatHud.textContent.includes('SECRET') && !initiative.querySelector('.monster meter')"),'Public initiative and hero-only HP'
    cdp.js("const hero=map.units[0];hero.hp=7;hero.hpMax=20;hero.conds=['poison'];changed()")
    wait(viewer,"combatHud.textContent.includes('7 / 20 PV') && combatHud.textContent.includes('Empoisonné')")
    cdp.js("$('btnNextTurn').click()")
    wait(viewer,"document.getElementById('combatTurn').textContent.includes('Gobelin')")
    viewer.screenshot().save(WORK/'players-combat.png')
    for width,height in [(1440,900),(760,800),(390,844)]:
        viewer.call('Emulation.setDeviceMetricsOverride',width=width,height=height,deviceScaleFactor=1,mobile=False)
        time.sleep(.1)
        assert viewer.js("document.documentElement.scrollWidth<=innerWidth && screenCanvas.clientHeight>200"),'Combat screen usable at '+str(width)
    viewer.call('Emulation.setDeviceMetricsOverride',width=1440,height=900,deviceScaleFactor=1,mobile=False)
    cdp.js("setMode('edit')")
    wait(viewer,"connection.textContent.includes('suspendue')")
    frozen_hud=viewer.js('combatHud.textContent')
    frozen=viewer.js('lastImage');cdp.js("map.floor.fill('lava');changed()")
    time.sleep(.4);assert viewer.js('lastImage')==frozen,'Editor leaked into public frame'
    assert viewer.js('combatHud.textContent')==frozen_hud,'Editor changed projected combat summary'
    cdp.js("document.querySelector('[data-player-curtain]').click()")
    wait(viewer,"!curtain.hidden && picture===null && combatHud.hidden && !initiative.children.length")
    cdp.js("setMode('world');document.querySelector('[data-player-curtain]').click()")
    wait(viewer,"curtain.hidden && title.textContent.includes('Nemaï')")
    assert viewer.js('combatHud.hidden'),'World removes combat HUD'
    viewer.call('Page.reload');wait(viewer,"typeof picture!=='undefined' && !!picture")
    snapshot=cdp.js(store)
    viewer.js("document.getElementById('fit').click();dispatchEvent(new KeyboardEvent('keydown',{key:'Delete'}));dispatchEvent(new KeyboardEvent('keydown',{key:'Enter'}))")
    assert cdp.js(store)==snapshot,'Player keys changed saves'
    viewer.call('Page.close');viewer.sock.close()
    wait(cdp,'playerWindow.closed')
    checks.append('Deux fenêtres réelles : synchronisation, transition monde/combat, préparation suspendue, rideau, rechargement et lecture seule')
    cdp.js("setMode('play');resetCombat(false)")
    viewer=popup(cdp,"$('btnStartPlayers').click()")
    wait(viewer,"!combatHud.hidden && document.getElementById('combatRound').textContent==='Round 1'")
    assert cdp.js("map.turn===1 && $('btnStartPlayers').classList.contains('hidden')"),'Start with players opens and starts combat once'
    cdp.js("endCombat()")
    wait(viewer,"document.getElementById('combatRound').textContent==='Préparation'")
    viewer.call('Page.reload');wait(viewer,"typeof picture!=='undefined' && !!picture && !combatHud.hidden")
    viewer.call('Page.close');viewer.sock.close()
    wait(cdp,'playerWindow.closed')
    # A blocked popup must not silently start the combat.
    cdp.js("const originalOpen=window.open,originalAlert=window.alert;window.open=()=>null;window.alert=()=>{};startCombatWithPlayers();window.open=originalOpen;window.alert=originalAlert;if(map.turn)throw Error('Combat started with blocked popup');")
    checks.append('Combat joueur : lancement en un clic, initiative publique, tours, PV, états, fin de combat et affichage de 390 à 1440 px')
    # Verify the supported direct-file workflow (including canvas serialization of Nemaï).
    cdp.call('Page.navigate',url=(ROOT/'index.html').as_uri())
    wait(cdp,"document.readyState==='complete' && typeof openPlayerScreen==='function'")
    cdp.js("(async()=>{setMode('world');await nemaiImage.decode();return renderPlayerFrame().image.startsWith('data:image/');})()")
    viewer=popup(cdp)
    assert viewer.js("picture && title.textContent.includes('Nemaï')"),'Local-file world projection'
    cdp.js("setMode('play')");wait(viewer,"title.textContent.includes('combat')")
    viewer.call('Page.close');viewer.sock.close()
    checks.append('Ouverture directe file:// : monde illustré et combat projetés')
    errors=cdp.js('mediaErrors')
    assert not [e for e in errors if 'caracteristiques.txt' not in e],errors
    print(json.dumps(checks,ensure_ascii=False,indent=2),flush=True)
    (WORK/'players-decor-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')


if __name__=='__main__':
    run_browser(check)
