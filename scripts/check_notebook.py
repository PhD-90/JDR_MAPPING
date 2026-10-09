"""Exercise campaign notebook through the real UI in an isolated Edge profile.

Windows: py scripts/check_notebook.py
Requires the same Edge/Pillow setup as generate_readme_media.py.
"""
import json
import time
from generate_readme_media import run_browser, WORK

CHECKS = r"""
(async()=>{
 const assert=(v,m)=>{if(!v)throw Error(m);},checks=[];
 const input=(key,value)=>{const e=$('nb_'+key);assert(e,'Champ absent : '+key);e.value=value;e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));};
 notebook=normalizeNotebook(null);sheets=[];world=null;gmHistory=[];saveSheets();saveGmHistory();setMode('gm');
 document.querySelector('[data-gm-section=notebook]').click();$('nbNew').click();
 const session=notebook.sessions[0];input('title','La porte des Brumes');input('prep','Prévoir le <dragon> et trois indices.');input('next','Retrouver la cartographe');
 input('status','live');input('day','12');$('nbAddObjective').click();$('nbAddObjective').click();
 const boxes=document.querySelectorAll('.nb-check input[type=checkbox]');boxes[0].click();
 assert(session.goals.length===2&&session.goals[0].done&&!session.goals[1].done,'Objectifs de préparation');
 $('nbNextSession').click();const next=notebook.sessions[0];assert(next.id!==session.id&&next.prep===session.next&&next.goals.length===1&&!next.goals[0].done&&next.goals[0].id!==session.goals[1].id,'Report objectifs non accomplis');
 openNotebook('sessions',session.id);$('nbArchive').click();assert(session.archived&&!$('nbList').textContent.includes(session.title),'Archivage');
 $('nbArchives').click();document.querySelectorAll('.nb-entry')[1].click();$('nbArchive').click();assert(!session.archived,'Restauration');
 $('nbSearch').value='brumes';$('nbSearch').dispatchEvent(new Event('input'));assert($('nbList').children.length===1,'Recherche sans casse');
 assert(!$('gmNotebook').querySelector('dragon'),'Contenu traité comme texte');
 checks.push('Séances : saisie automatique, objectifs, report, recherche et archivage réversible');
 showGmSection('generators');$('npcGen').click();$('npcRemember').click();const npc=notebook.npcs[0];
 assert(npc.secret&&!npc.description.includes('Secret :'),'Secret séparé du portrait');assert($('npcRemember').disabled,'PNJ généré mémorisé une fois');
 input('name','Éléonore des Brumes');input('faction','Guilde des cartographes');input('attitude','ally');
 $('nbNpcSheet').click();assert(getSheet(npc.sheetId)?.name===npc.name,'Fiche du PNJ');const n=sheets.length;openNotebook('npcs',npc.id);$('nbNpcSheet').click();assert(sheets.length===n,'Réouverture sans doublon');
 const a=newSheet(),b=newSheet(),dead=newSheet();a.name='A';b.name='B';dead.dead=true;sheets.push(a,b,dead);saveSheets();
 openNotebook('quests');$('nbNew').click();const quest=world.quests[0],loc=world.locations[0];
 assert(world&&quest,'Quête crée le monde si nécessaire');input('title','Les sceaux du vieux pont');input('text','Retrouver les deux sceaux.');input('locId',loc.id);input('npcId',npc.id);input('rewardGold','101');input('rewardXP','75');input('dueDay','2');
 $('nbAddObjective').click();assert($('nbQuestFinish').disabled&&!finishQuest(quest,true),'Objectif incomplet bloque réussite');
 document.querySelector('.nb-check input[type=checkbox]').click();assert(!$('nbQuestFinish').disabled,'Objectif accompli débloque réussite');
 undoStack=[];redoStack=[];pushUndo();map.floor[0]='sand';changed();
 const gold=[a.gold||0,b.gold||0,dead.gold||0],xp=[a.xp||0,b.xp||0],chest=equipmentState.chest.gold;const rep=regionAt(loc.x,loc.y)?.rep||0;
 $('nbQuestFinish').click();assert(quest.status==='done'&&quest.settlement&&quest.completedDay===world.day,'Quête clôturée avec reçu');
 assert(a.gold===gold[0]+50&&b.gold===gold[1]+50&&(dead.gold||0)===gold[2]&&a.xp===xp[0]+75&&b.xp===xp[1]+75,'Récompenses aux héros vivants');
 assert(equipmentState.chest.gold===chest+1,'Reste au coffre');const settled=JSON.stringify({sheets,chest:equipmentState.chest,quest});
 assert(!finishQuest(quest,true)&&!finishQuest(quest,false)&&JSON.stringify({sheets,chest:equipmentState.chest,quest})===settled,'Récompense non répétable');
 assert((regionAt(loc.x,loc.y)?.rep||0)===Math.min(5,rep+1),'Réputation attribuée une fois');
 undo();assert(a.gold===gold[0]+50&&a.xp===xp[0]+75&&equipmentState.chest.gold===chest+1&&quest.status==='done','Annuler un geste conserve les récompenses de quête');redo();
 const failed=addQuest({title:'Échec',rewardGold:200});assert(finishQuest(failed,false)&&equipmentState.chest.gold===chest+1,'Échec sans récompense');
 const legacy=addQuest({title:'Ancienne accroche',reward:'83 pièces d\'or'});assert(legacy.rewardGold===83,'Récompense ancienne reconnue');
 const noHeroes=sheets;sheets=[];assert(finishQuest(legacy,true)&&equipmentState.chest.gold===chest+84,'Or au coffre sans groupe');sheets=noHeroes;
 const overdue=addQuest({title:'Livraison',dueDay:1});world.day=3;assert(questDeadline(overdue).includes('retard'),'Échéance du monde');
 checks.push('Quêtes : objectifs, récompenses uniques, reste au coffre, XP, échec et compatibilité des accroches');
 openNotebook('npcs',npc.id);input('locId',loc.id);notebookShowLocation(loc.id);assert($('worldSel').textContent.includes(npc.name)&&$('worldSel').textContent.includes(quest.title),'Carnet lié au lieu');
 const oldLoc=world.locations.shift();openNotebook('npcs',npc.id);assert($('nb_locId').selectedOptions[0].textContent.includes('supprimée')&&npc.secret,'Référence absente conserve les notes');world.locations.unshift(oldLoc);
 const normalized=normalizeNotebook({npcs:[{id:'duplicate',name:'A'},{id:'duplicate',name:'B'}],sessions:[{status:'invalid',day:-5,goals:[{id:'x',text:'A'},{id:'x',text:'B'}]}]});
 assert(normalized.npcs[0].id!==normalized.npcs[1].id&&normalized.sessions[0].day===0&&normalized.sessions[0].status==='planned'&&normalized.sessions[0].goals[0].id!==normalized.sessions[0].goals[1].id,'Import normalise identifiants et valeurs');
 checks.push('PNJ : générateur, faction, fiche unique, lien au monde et références supprimées');
 setMode('gm');$('gmNotes').value='Secrets de la campagne <script>test</script>';saveNotes();addHistory('Indice','Un sceau porte la marque du roi.');
 const downloadOriginal=download,confirmOriginal=confirm;let filePromise;
 download=(name,url)=>{filePromise=fetch(url).then(r=>r.text());};$('wExport').click();const exported=JSON.parse(await filePromise);download=downloadOriginal;
 assert(exported.version===4&&exported.gm.notes.includes('Secrets')&&exported.gm.history.length&&exported.gm.notebook.npcs[0].secret,'Export inclut notes, historique et carnet');
 const expected=JSON.stringify({gm:campaignGmData(),quests:world.quests});
 notebook=normalizeNotebook(null);gmHistory=[];world.quests=[];$('gmNotes').value='À remplacer';confirm=()=>true;
 const event=data=>({target:{files:[new File([JSON.stringify(data)],'campaign.json',{type:'application/json'})],value:'campaign.json'}});
 await $('campIn').onchange(event(exported));assert(JSON.stringify({gm:campaignGmData(),quests:world.quests})===expected,'Import restitue le carnet et les notes');
 const oldVersion={...exported,version:3};delete oldVersion.gm;await $('campIn').onchange(event(oldVersion));
 assert(!notebook.sessions.length&&!notebook.npcs.length&&!gmHistory.length&&$('gmNotes').value==='','Ancienne campagne démarre avec carnet vide');
 await $('campIn').onchange(event(exported));confirm=confirmOriginal;
 assert(notebookText().includes(npc.name)&&notebookText().includes(quest.title),'Export texte contient PNJ et quêtes');
 assert(mediaErrors.length===0,mediaErrors.join('\n'));saveNotebook();saveGmHistory();saveWorld(true);saveSheets();saveEquipment();
 checks.push('Export/import réel v4, import v3 sans mélange de notes, export texte');return {checks};
})()
"""

def check(cdp, base):
    result = cdp.js(CHECKS)
    state = 'JSON.stringify({gm:campaignGmData(),quests:world.quests})'
    before = cdp.js(state)
    cdp.call('Page.reload')
    for _ in range(100):
        if cdp.js("document.readyState==='complete' && typeof world!=='undefined' && world!==null"):
            break
        time.sleep(.05)
    assert cdp.js(state) == before, 'Notebook or quest data changed after reload'
    assert cdp.js('mediaErrors') == [], 'JavaScript error after reload'
    result['checks'].append('Rechargement réel : carnet, objectifs, clôture, notes et historique conservés')
    cdp.js("openNotebook('sessions',notebook.sessions[1].id)")
    for width in (1440, 1024, 760):
        cdp.call('Emulation.setDeviceMetricsOverride', width=width, height=900, deviceScaleFactor=1, mobile=False)
        time.sleep(.2)
        assert cdp.js("$('gmMain').scrollWidth <= $('gmMain').clientWidth+1"), f'Notebook overflow at {width}px'
        cdp.screenshot().save(WORK / f'notebook-{width}.png')
    result['checks'].append('Interface sans débordement à 1440, 1024 et 760 px')
    print(json.dumps(result, ensure_ascii=False, indent=2), flush=True)
    (WORK / 'notebook-checks.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')

if __name__ == '__main__':
    run_browser(check)
