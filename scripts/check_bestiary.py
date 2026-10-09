"""Exercise bestiary data, placement, filters and combat in an isolated browser.

Run on Windows: py scripts/check_bestiary.py
Uses the same Edge/Pillow setup as generate_readme_media.py.
"""
import json
from generate_readme_media import ROOT, WORK, run_browser

CHECKS = r"""
(async () => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const added = ['kobold','rat','bat','imp','fire_beetle','bandit','zombie','ghoul','gnoll','lizardfolk',
                 'ogre','troll','minotaur','stone_golem','hill_giant'];
  soundOn=false; aiPaused=true; autoMonsters=false; autoHeroes=false; rulesMode=true;
  loadStats(DEFAULT_STATS_TXT, 'test');
  const checks=[];
  assert(Object.values(SPRITES).filter(s=>s.kind==='monster').length===21, '21 monstres attendus');
  for(const category of ['small','medium','large']) {
    assert(added.filter(k=>spriteSizeCategory(k)===category).length===5, '5 ajouts par taille : '+category);
  }
  const disk=await (await fetch('data/caracteristiques.txt')).text();
  assert(DEFAULT_STATS_TXT.replace(/\r/g,'').trim()===disk.replace(/\r/g,'').trim(), 'Copie hors ligne désynchronisée');
  const declared=parseStats(disk).units;
  for(const k of added) {
    const sp=SPRITES[k], pal={...BASE_PAL,...sp.pal};
    const rows=sp.half || sp.rows;
    assert(rows.length===16 && rows.every(r=>r.length===(sp.half?8:16)), k+' : dimensions du sprite');
    for(const ch of rows.join('')+(sp.patches||[]).map(p=>p.rows.join('')).join('')) {
      assert(ch==='.' || pal[ch], k+' : couleur absente '+ch);
    }
    for(const p of sp.patches||[]) assert(p.y>=0 && p.y+p.rows.length<=16 && p.x>=0 && p.rows.every(r=>p.x+r.length<=16), k+' : patch hors cadre');
    assert(spriteCanvas(k).getContext('2d').getImageData(0,0,16,16).data.some(v=>v!==0), k+' : sprite vide');
    assert(declared[k]?.pv>0 && declared[k]?.xp>0 && declared[k]?.carac, k+' : bloc incomplet');
    assert(ATTACKS[k] && FX[ATTACKS[k].fx], k+' : animation absente');
    assert(Object.values(ENV).some(e=>e.w[k]>0), k+' : absent des rencontres');
    assert(Number.isFinite(rollDice(spriteCombat(k).degats).total), k+' : dés invalides');
  }
  checks.push('15 sprites, statistiques hors ligne, dés, animations et habitats');

  loadStats('[Gobelin]\npv=19\ndegats=2d6+4', 'ancien fichier');
  assert(spriteCombat('goblin').hpMax===19 && spriteCombat('goblin').degats==='2d6+4', 'Valeurs personnalisées écrasées');
  for(const k of added) assert(spriteCombat(k).hpMax===declared[k].pv, k+' : défaut absent avec un ancien fichier');
  assert(unitStats({sprite:'bat'}).vol && unitStats({sprite:'lizardfolk'}).nage, 'Mobilités perdues');
  loadStats(DEFAULT_STATS_TXT,'test'); checks.push('Compatibilité des anciens fichiers personnalisés');

  setMode('play'); buildPlayPalettes();
  const visible=()=>[...document.querySelectorAll('#monsterPal button:not(.hidden)')];
  assert(visible().length===21, 'Palette incomplète');
  $('monsterSize').value='large'; $('monsterSize').dispatchEvent(new Event('change'));
  assert(visible().length===6, 'Filtre gros');
  $('monsterSearch').value='geant'; $('monsterSearch').dispatchEvent(new Event('input'));
  assert(visible().length===1 && visible()[0].dataset.sprite==='hill_giant', 'Recherche sans accents');
  visible()[0].click(); assert(pending==='hill_giant', 'Sélection dans la palette');
  $('monsterSize').value='medium'; filterMonsters();
  assert(!pending && !$('monsterEmpty').classList.contains('hidden'), 'Filtre vide et annulation de pose');
  $('monsterSize').value=''; $('monsterSearch').value=''; filterMonsters();
  checks.push('Recherche, tailles et pose depuis la palette');

  map=newMap(2,2); invalidateZones();
  assert(addUnit('hill_giant',0,0)===null && map.units.length===0, 'Géant sur une carte trop petite');
  setPending('hill_giant'); hover={cx:0,cy:0,wx:T/2,wy:T/2};
  draw(); const undoBefore=undoStack.length;
  playMouseDown({button:0,shiftKey:false},hover);
  assert(map.units.length===0 && undoStack.length===undoBefore && !$('attackHint').classList.contains('hidden'), 'Pose impossible non signalée');
  setPending(null); hover=null;
  map=newMap(10,10); const giant=addUnit('hill_giant',9,9);
  assert(giant.x===7 && giant.y===7 && giant.size===3, 'Empreinte aux bords');
  map=normalizeMap(JSON.parse(JSON.stringify(map)));
  assert(map.units[0].size===3, 'Empreinte perdue à la sauvegarde');
  map=newMap(10,8);
  for(let y=0;y<8;y++) if(y!==3 && y!==4) map.objects.push({...makeObj('wall',5,y),id:map.nextId++});
  const big=addUnit('hill_giant',0,2); invalidateZones();
  assert(!computeMove(big).ends.some(([x])=>x>=6), 'Géant dans un passage trop étroit');
  map.units=[]; const medium=addUnit('gnoll',0,3); invalidateZones();
  assert(computeMove(medium).ends.some(([x])=>x>=6), 'Passage bloqué pour un monstre moyen');
  checks.push('Empreintes, limites de carte, sauvegarde et passages étroits');

  const summary=[];
  for(const k of added) {
    map=newMap(14,12); invalidateZones();
    const foe=addUnit(k,7,4);
    ['warrior','ranger','cleric','mage'].forEach((h,i)=>addUnit(h,2+(i%2),3+2*Math.floor(i/2)));
    map.units.forEach(u=>newBudget(u));
    const s=unitStats(foe);
    assert(Number.isFinite(s.deplacement) && computeMove(foe).ends.length>1,k+' : mouvement');
    const report=await simulate(simBase(),{n:5,maxRounds:12,seed:341});
    assert(report.wins+report.losses+report.draws===5, k+' : simulation incomplète');
    assert(report.units[foe.id].dealt>0, k+' : aucune attaque infligée');
    summary.push({key:k,damage:report.units[foe.id].dealt,wins:report.wins});
    const hero=map.units.find(u=>unitKind(u)==='hero');
    startAttack(foe,hero,{hit:true,dmg:1});
    anims[anims.length-1].start=performance.now()-ATTACKS[k].dur*.5;
    draw(); anims=[]; pops=[]; areaList=[]; cancelAnimationFrame(animRaf); animRaf=0;
  }
  checks.push('75 combats simulés et rendu des 15 animations');
  for(const [env, value] of Object.entries(ENV)) {
    assert(Object.keys(value.w).every(k=>SPRITES[k]?.kind==='monster'), env+' : référence inconnue');
    const enc=genEncounter(env,2,4,5);
    map=newMap(24,18); invalidateZones();
    const placed=spawnEncounter(enc,false);
    assert(placed.length===Object.values(enc.counts).reduce((s,n)=>s+n,0),env+' : placement incomplet');
    for(const u of placed) assert(u.x>=0 && u.y>=0 && u.x+u.size<=map.cols && u.y+u.size<=map.rows,env+' : hors carte');
  }
  checks.push('Génération et placement dans les 9 environnements');
  assert(mediaErrors.length===0,mediaErrors.join('\n'));
  return {checks,summary};
})()
"""


def check(cdp, base):
    result=cdp.js(CHECKS)
    print(json.dumps(result, ensure_ascii=False, indent=2), flush=True)
    (WORK/'bestiary-checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')


if __name__=='__main__':
    run_browser(check)
