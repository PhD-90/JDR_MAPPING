"""Verify the reference atlas, hotspots, terrain, travel, storage and local-file loading."""
import json
import time
from pathlib import Path
from generate_readme_media import run_browser, WORK, ROOT

CHECKS=r"""
(async()=>{
 const assert=(v,m)=>{if(!v)throw Error(m);},checks=[];
 localStorage.removeItem('jdr-world');world=null;WT=null;setMode('world');await nemaiImage.decode();
 assert(isNemai()&&world.name==='Nemaï'&&world.locations.length===35,'Nemaï par défaut et 35 lieux');
 assert(nemaiImage.naturalWidth===1231&&nemaiImage.naturalHeight===864,'Dimensions de la référence');
 assert(worldBackground()===nemaiImage,'Fond original conservé');
 const pick=id=>world.locations.find(l=>l.id==='nemai-'+id);
 for(const l of world.locations)assert(hitLoc(l)===l,'Lieu cliquable : '+l.name);
 for(const l of world.locations){const b=l.reference.label;assert(hitLoc(nemaiPoint((b[0]+b[2])/2,(b[1]+b[3])/2))===l,'Nom imprimé cliquable : '+l.name);}
 for(const l of world.locations.filter(l=>l.type!=='lieu'))assert(!WT.t.water[wIdx(l.x,l.y)],'Ville sur terre : '+l.name);
 assert(biomeAt(...Object.values(nemaiPoint(1052,472))).k==='forest','Forêt de Tarora');
 assert(biomeAt(...Object.values(nemaiPoint(576,191))).k==='swamp','Marais de Dornas');
 assert(biomeAt(...Object.values(nemaiPoint(856,47))).k==='mountain','Monts Orins');
 assert(biomeAt(...Object.values(nemaiPoint(151,300))).k==='ocean','Océan d’Hirel');
 assert(biomeAt(...Object.values(nemaiPoint(204,87))).k==='lake','Lac Lénore');
 const a=nemaiPoint(982,815),b=nemaiPoint(1157,815);assert(travelInfo(a,b).km===100,'Échelle graphique : 175 pixels = 100 km');
 assert($('wo_parchment').disabled&&$('wo_rivers').disabled&&$('wRegen').disabled,'Contrôles adaptés au fond illustré');
 $('atlasExpand').click();assert(document.body.classList.contains('world-map-focus')&&getComputedStyle($('worldLeft')).display==='none','Vue agrandie');$('atlasExpand').click();assert(getComputedStyle($('worldLeft')).display!=='none','Panneaux restaurés');
 checks.push('Image originale, 35 lieux cliquables, biomes tracés et échelle de 100 km');
 const loc=pick('tamsol');wsel.loc=loc;renderWorldPanels();const old={x:loc.x,y:loc.y};
 const pos={x:wcam.x+loc.x*WCELL*wcam.z,y:wcam.y+loc.y*WCELL*wcam.z},rect=wcv.getBoundingClientRect();
 wcv.dispatchEvent(new MouseEvent('mousedown',{button:0,clientX:rect.left+pos.x,clientY:rect.top+pos.y,bubbles:true}));
 assert(wsel.loc===loc&&!wdrag,'Lieu dessiné sélectionné sans déplacement accidentel');
 window.dispatchEvent(new MouseEvent('mouseup'));assert(loc.x===old.x&&loc.y===old.y,'Coordonnées fixes');
 $('wlName').value='Tamsol du test';$('wlName').dispatchEvent(new Event('input'));assert(loc.name==='Tamsol du test','Nom éditable');
 loc.notes='Garder le passage secret';genBattle(loc);assert(map.locId===loc.id&&loc.battle,'Carte de combat liée');setMode('world');
 world.expedition={events:false,pace:'normal',chestRations:false};atlasGroup();const party=atlasParty();
 party.forEach(s=>{s.items.ration=30;world.pos[s.id]={...nemaiPoint(489,592)};});
 planWorldStop(pick('carrefour-vert'),pick('carrefour-vert'),false);travelNextStop();
 await new Promise(r=>setTimeout(r,2400));assert(!world.route.points.length&&world.day>1,'Voyage fonctionne sur la référence');
 checks.push('Sélection, noms et notes modifiables, battlemap liée et voyage');
 const nemai=JSON.stringify(world);world=newWorld(331,'continent');world.name='Ancien monde conservé';world.journal.push({day:2,text:'Souvenir'});ensurePositions();renderWorldPanels();
 const oldWorld=JSON.stringify(world);$('btnNemai').click();assert(isNemai()&&JSON.stringify(JSON.parse(localStorage.getItem('jdr-world-before-nemai')))===oldWorld,'Ancien monde conservé avant remplacement');
 $('btnPreviousWorld').click();assert(world.name==='Ancien monde conservé'&&world.journal.at(-1).text==='Souvenir','Retour au monde précédent');
 $('btnPreviousWorld').click();assert(isNemai(),'Retour à Nemaï');
 world=JSON.parse(nemai);buildWorldCache();renderWorldPanels();fitWorld();
 let output;const dl=download;download=(name,url)=>{output=fetch(url).then(r=>r.json());};$('wExport').click();const exported=await output;download=dl;
 assert(exported.world.style==='nemai'&&exported.world.locations.find(l=>l.id===loc.id).notes===loc.notes,'Export du monde de référence et des notes');
 const confirmOriginal=confirm;confirm=()=>true;await $('campIn').onchange({target:{files:[new File([JSON.stringify(exported)],'nemai.json')],value:'nemai.json'}});confirm=confirmOriginal;
 assert(isNemai()&&world.locations.find(l=>l.id===loc.id).battle&&world.locations.length===35,'Import conserve référence, lieux et battlemap');
 saveWorld(true);saveSheets();changed();assert(!mediaErrors.length,mediaErrors.join('\n'));checks.push('Conservation du monde précédent, restauration, export et import');return {checks};
})()
"""

def ready(cdp):
    for _ in range(100):
        if cdp.js("document.readyState==='complete' && typeof world!=='undefined' && typeof enterWorld==='function'"):
            return
        time.sleep(.05)
    raise TimeoutError('App did not load')

def check(cdp, base):
    result=cdp.js(CHECKS)
    state='JSON.stringify({world,sheets:sheets.map(s=>({id:s.id,items:s.items}))})'
    before=cdp.js(state);cdp.call('Page.reload');ready(cdp)
    assert cdp.js(state)==before,'State changed after reload'
    cdp.js("(async()=>{setMode('world');await nemaiImage.decode();wsel={loc:null,ids:new Set()};drawWorld();})()")
    cdp.screenshot().save(WORK/'nemai-world.png')
    result['checks'].append('Rechargement conserve le monde, les notes, les cartes liées et les ressources')
    # This app also promises opening index.html directly, without an HTTP server.
    cdp.call('Page.navigate',url=(ROOT/'index.html').as_uri());ready(cdp)
    cdp.js("(async()=>{setMode('world');await nemaiImage.decode();drawWorld();})()")
    assert cdp.js("isNemai() && nemaiImageState==='ready' && hitLoc(world.locations[0])===world.locations[0]")
    errors=cdp.js('mediaErrors')
    assert not [e for e in errors if 'caracteristiques.txt' not in e],errors
    result['checks'].append('Ouverture directe de index.html : image locale et interactions disponibles')
    print(json.dumps(result,ensure_ascii=False,indent=2),flush=True)
    (WORK/'nemai-checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')

if __name__=='__main__':
    run_browser(check)
