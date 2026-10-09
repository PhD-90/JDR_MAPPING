"""Exercise prepared encounters in an isolated Edge profile (no personal saves).

Windows: py scripts/check_encounters.py
"""
import json
import time
from generate_readme_media import WORK, run_browser

CHECKS = r"""
(async()=>{
 const assert=(ok,msg)=>{if(!ok)throw Error(msg);},checks=[];
 soundOn=false;autoMonsters=false;autoHeroes=false;aiPaused=true;clearTimeout(aiTimer);loadStats(DEFAULT_STATS_TXT,'test');
 notebook=normalizeNotebook(null);sheets=[];const a=newSheet(),b=newSheet(),dead=newSheet();a.level=1;b.level=5;dead.dead=true;sheets.push(a,b,dead);saveSheets();
 newWorld(73912,'continent');ensurePositions();map=newMap(16,12);addUnit('sheet:'+a.id,1,4);addUnit('sheet:'+b.id,1,7);map.floor[3*16+12]='water';map.objects.push({...makeObj('wall',13,6),id:map.nextId++});invalidateZones();
 openNotebook('encounters');$('nbNew').click();const r=notebook.encounters[0],first=r.waves[0];
 const set=(id,value,event='input')=>{const el=$(id);el.value=value;el.dispatchEvent(new Event(event,{bubbles:true}));};
 set('nb_title','Les guetteurs <du pont>');set('nb_notes','Un signal appelle les renforts.');
 document.querySelector('[data-enc-monster=goblin]').click();document.querySelector('[data-enc-monster=goblin]').click();document.querySelector('[data-enc-monster=troll]').click();
 assert(first.counts.goblin===2&&first.counts.troll===1,'Composition via catalogue');
 assert(!$('encRoster').textContent.includes('undefined'),'Statistiques affichées');
 const budget=encounterBudget(r,first.counts);assert(budget.thresholds[0]===275&&budget.levels.join(',')==='1,5','Budget tient compte des niveaux réels et exclut les morts');
 set('nb_partyMode','manual','change');set('nb_partyCount','99');set('nb_partyLevel','99');assert(r.partyCount===10&&r.partyLevel===20&&JSON.parse(localStorage.getItem('jdr-notebook')).encounters[0].partyCount===10,'Bornes manuelles sauvegardées');
 set('nb_partyMode','sheets','change');set('encSearch','MINOTAURE');assert($('encCatalog').children.length===1,'Recherche bestiaire sans casse');set('encSize','small','change');assert($('encCatalog').textContent.includes('Aucun'),'Filtre taille');set('encSearch','');set('encSize','','change');
 $('encAddWave').click();const second=r.waves[1];set('encWaveName','Les renforts');document.querySelector('[data-enc-monster=wolf]').click();document.querySelector('[data-enc-monster=wolf]').click();
 assert(second.counts.wolf===2,'Deuxième vague');$('encAddWave').click();assert(r.waves.length===3,'Nouvelle vague vide');$('encRemoveWave').click();assert(r.waves.length===2,'Suppression vague vide');
 const session=createNotebookRecord('sessions',{title:'Le passage du pont'});r.sessionId=session.id;r.locId=world.locations[0].id;saveNotebook();openNotebook('sessions',session.id);assert($('nbDetail').textContent.includes(r.title),'Rencontre liée à la séance');
 notebookShowLocation(r.locId);assert($('worldSel').textContent.includes(r.title),'Rencontre liée au lieu');openNotebook('encounters',r.id);
 checks.push('Catalogue, tailles, composition, vagues, niveaux mixtes, limites et liens séance/lieu');
 encounterWaveId=first.id;renderNotebookDetail();const planned=planEncounterWave(r,first),before=JSON.stringify(map);assert(planned.ok&&JSON.stringify(map)===before,'Aperçu sans mutation');
 const boxes=[...map.units,...planned.positions];for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const x=boxes[i],y=boxes[j];assert(x.x+x.size<=y.x||y.x+y.size<=x.x||x.y+x.size<=y.y||y.y+y.size<=x.y,'Pas de chevauchement');}
 for(const p of planned.positions)for(let y=p.y;y<p.y+p.size;y++)for(let x=p.x;x<p.x+p.size;x++)assert(map.floor[y*map.cols+x]!=='water'&&isFinite(terrainGrids().objCost[y*map.cols+x]),'Obstacle ou eau évité');
 map=newMap(2,2);map.floor.fill('water');invalidateZones();const blocked=JSON.stringify(map),history=undoStack.length;assert(!deployEncounterWave(r,first)&&JSON.stringify(map)===blocked&&undoStack.length===history,'Manque de place : aucune pose partielle ni historique');
 map=JSON.parse(before);invalidateZones();openNotebook('encounters',r.id);encounterWaveId=first.id;renderNotebookDetail();$('encPreparedHidden').click();
 const originalCount=map.units.length;assert(deployEncounterWave(r,first)&&map.units.length===originalCount+3,'Vague placée');assert(map.units.slice(-3).every(u=>u.hidden),'Embuscade cachée');
 const once=JSON.stringify(map);assert(!deployEncounterWave(r,first)&&JSON.stringify(map)===once,'Double clic ne duplique pas');
 undo();assert(map.units.length===originalCount&&!map.encounterPlans?.length,'Annulation de la pose entière');redo();assert(map.units.length===originalCount+3&&map.encounterPlans[0].deployed.length===1,'Rétablissement de la pose');
 // La copie de combat reste stable même après modification du modèle dans la bibliothèque.
 second.counts.wolf=9;saveNotebook();startCombat();const active=activeUnit()?.id;
 document.querySelector('#encounterTray button:not(:disabled)').click();assert(map.units.filter(u=>u.sprite==='wolf').length===2,'Renfort utilise la copie préparée');
 assert(activeUnit()?.id===active&&map.units.slice(-2).every(u=>map.order.includes(u.id)),'Renforts rejoignent initiative sans changer acteur');
 assert(map.encounterPlans[0].deployed.length===2,'Suivi des deux vagues');undo();assert(map.units.filter(u=>u.sprite==='wolf').length===0&&map.encounterPlans[0].deployed.length===1,'Annulation renfort en combat');redo();
 checks.push('Placement de grandes figurines, obstacles, manque de place, embuscade, anti-doublon et Ctrl+Z');
 checks.push('Vagues figées sur la carte, renforts dans initiative et acteur actif conservé');
 openNotebook('encounters',r.id);$('encDuplicate').click();const copy=notebook.encounters[0];assert(copy.id!==r.id&&copy.waves[0].id!==first.id&&copy.waves[1].counts.wolf===9,'Duplication indépendante');
 const rawMap=JSON.stringify(map),rawSheets=JSON.stringify(sheets),rawNotebook=JSON.stringify(notebook),rawHistory=undoStack.length;
 const base=encounterSimulationMap(r,first);assert(base.units.filter(u=>unitKind(u)==='monster').length===3&&base.units.filter(u=>unitKind(u)==='hero').length===2,'Simulation contient seulement cette vague et les héros');
 assert(JSON.stringify(map)===rawMap&&JSON.stringify(sheets)===rawSheets&&JSON.stringify(notebook)===rawNotebook&&undoStack.length===rawHistory,'Préparation simulation isolée');
 const stats=await simulate(base,{n:3,maxRounds:5,seed:193});assert(stats.n===3&&JSON.stringify(map)===rawMap&&JSON.stringify(sheets)===rawSheets,'Trois combats simulés sans modification réelle');
 const emptyHeroes=map;map=newMap(2,2);map.floor.fill('lava');invalidateZones();let rejected=false;try{encounterSimulationMap(r,first);}catch(e){rejected=true;}assert(rejected&&map.cols===2,'Simulation refuse un groupe incomplet');map=emptyHeroes;invalidateZones();
 const bad=normalizeNotebook({encounters:[{id:'same',waves:[{id:'w',counts:{dragon:999,warrior:4,bogus:3}},{id:'w',counts:{goblin:3}}]},{id:'same',waves:[null]}]});
 assert(bad.encounters[0].id!==bad.encounters[1].id&&encounterTotal(bad.encounters[0])===30&&bad.encounters[0].waves[0].counts.warrior===undefined&&bad.encounters[0].waves[0].id!==bad.encounters[0].waves[1].id,'Normalisation sûre des modèles');
 assert(normalizeEncounterPlans([{id:'same',counts:{goblin:2}},{id:'same',counts:{goblin:1}}]).length===1,'Plans dupliqués éliminés à l’import');
 checks.push('Duplication, validation, préparation isolée et 3 simulations de combat');
 const downloadOriginal=download,confirmOriginal=confirm;let downloaded;download=(name,url)=>{downloaded=fetch(url).then(r=>r.json());};$('wExport').click();const data=await downloaded;download=downloadOriginal;
 notebook=normalizeNotebook(null);map=newMap(5,5);confirm=()=>true;
 await $('campIn').onchange({target:{files:[new File([JSON.stringify(data)],'campaign.json')],value:'campaign.json'}});confirm=confirmOriginal;
 assert(notebook.encounters.length===2&&map.encounterPlans[0].deployed.length===2,'Export/import conserve bibliothèque et vagues placées');
 openNotebook('encounters',r.id);$('nbArchive').click();assert(notebook.encounters.find(e=>e.id===r.id).archived&&[...document.querySelectorAll('#nbList strong')].every(e=>e.textContent!==r.title),'Archivage');$('nbArchives').click();
 showGmSection('generators');$('encGen').click();$('encRemember').click();assert(notebook.encounters.length===3&&$('encRemember').disabled,'Conservation du générateur');
 assert(notebookText().includes('RENCONTRES')&&notebookText().includes('Les renforts'),'Export carnet texte');
 assert(mediaErrors.length===0,mediaErrors.join('\n'));saveNotebook();saveWorld(true);saveSheets();changed();
 checks.push('Sauvegarde campagne, archivage, générateur et export texte');return {checks};
})()
"""

def check(cdp, base):
    result = cdp.js(CHECKS)
    state = 'JSON.stringify({encounters:notebook.encounters,plans:map.encounterPlans,units:map.units})'
    before = cdp.js(state)
    cdp.call('Page.reload')
    for _ in range(100):
        if cdp.js("document.readyState==='complete' && typeof notebook!=='undefined' && notebook.encounters.length===3"):
            break
        time.sleep(.05)
    assert cdp.js(state) == before, 'Reload changed encounter library or waves'
    cdp.js("openNotebook('encounters',notebook.encounters[0].id)")
    for width in (1440, 1024, 760):
        cdp.call('Emulation.setDeviceMetricsOverride', width=width, height=900, deviceScaleFactor=1, mobile=False)
        time.sleep(.15)
        assert cdp.js("$('gmMain').scrollWidth <= $('gmMain').clientWidth+1"), f'Overflow at {width}px'
        cdp.screenshot().save(WORK / f'encounter-{width}.png')
    assert cdp.js('mediaErrors') == [], 'JavaScript errors after reload'
    result['checks'].append('Rechargement réel et affichage à 1440, 1024 et 760 px')
    print(json.dumps(result, ensure_ascii=False, indent=2), flush=True)
    (WORK / 'encounter-checks.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')

if __name__ == '__main__':
    run_browser(check)
