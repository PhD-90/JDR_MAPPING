// L'écran reçoit le rendu et un résumé public du combat, jamais la campagne ou les fiches.
let playerWindow=null, playerCurtain=false, playerLastSeen=0, playerLastFrame=null;
let playerScene='world', playerSceneSerial=0, playerFrameError='';
const playerCanvas=document.createElement('canvas');
playerCanvas.width=1440;playerCanvas.height=900;

function playerSceneModeChanged(m){
  if(m==='world'||m==='play'){
    if(playerScene!==m){playerScene=m;playerSceneSerial++;playerLastFrame=null;}
  }
}
function openPlayerScreen(){
  const url=new URL('players.html',location.href);
  if(!playerWindow||playerWindow.closed)playerWindow=window.open(url.href,'jdr-joueurs','width=1280,height=800');
  else playerWindow.focus();
  if(!playerWindow){alert('Autorise les fenêtres pop-up pour ouvrir l’écran des joueurs.');return false;}
  playerLastSeen=0;updatePlayerScreenStatus();
  return true;
}
function startCombatWithPlayers(){
  if(!map.units.length){alert('Place des figurines sur la carte avant de commencer le combat.');return;}
  // L'ouverture reste dans le clic utilisateur, sans déclencher de fenêtre depuis l'IA ou une simulation.
  if(!openPlayerScreen())return;
  if(mode!=='play')setMode('play');
  if(map.turn<=0)startCombat();
  sendPlayerFrame();
}
function updatePlayerScreenStatus(){
  const connected=playerWindow&&!playerWindow.closed;
  const text=!connected?'Écran fermé · ouvre-le sur le deuxième écran.':playerFrameError?playerFrameError:
    playerCurtain?'Écran masqué · préparation du MJ.':Date.now()-playerLastSeen>8000?'Connexion à l’écran joueur…':
    !['world','play'].includes(mode)?'Image suspendue pendant la préparation.':`${playerScene==='world'?'Monde':'Combat'} · écran joueur en direct`;
  document.querySelectorAll('[data-player-status]').forEach(el=>{if(el.textContent!==text)el.textContent=text;});
  document.querySelectorAll('[data-player-curtain]').forEach(el=>el.checked=playerCurtain);
}
const playerUnitVisible=u=>!!u&&!u.hidden&&!(map.fogOn&&fullyFogged(u.x,u.y,u.size,u.size));
const playerPortraits=new Map();
function publicCombatInfo(){
  const fighting=map.turn>0,active=activeUnit(),next=fighting?nextCombatUnit():null;
  const ordered=fighting?map.order.map(unitById).filter(Boolean):map.units;
  const units=ordered.filter(playerUnitVisible).map(u=>{
    if(!playerPortraits.has(u.sprite))playerPortraits.set(u.sprite,spriteCanvas(u.sprite).toDataURL('image/png'));
    const hero=unitKind(u)==='hero';
    const item={name:u.name,hero,portrait:playerPortraits.get(u.sprite),active:fighting&&u===active,
      state:u.dead?'Mort':isKO(u)?(u.stable?'Stabilisé':'Hors de combat'):'',
      conditions:(u.conds||[]).map(condOf).filter(Boolean).map(c=>c.name)};
    // Liste blanche : aucun identifiant interne, initiative chiffrée, PV ennemi ou ressource secrète.
    if(hero){item.hp=u.hp;item.hpMax=u.hpMax;}
    return item;
  });
  return {round:fighting?map.turn:0,turn:!fighting?'Le MJ prépare le combat':
    playerUnitVisible(active)&&!isKO(active)?`Au tour de ${active.name}`:'Le MJ résout le tour',
    next:fighting&&playerUnitVisible(next)?`Ensuite : ${next.name}`:'',units};
}
function playerBattleTitle(){
  const locationName=world?.locations.find(l=>l.id===map.locId)?.name;
  const u=activeUnit(), visible=playerUnitVisible(u);
  return [locationName,map.turn>0?`Round ${map.turn}`:'Préparation du combat',visible?`Tour de ${u.name}`:''].filter(Boolean).join(' · ');
}
function renderPlayerFrame(){
  const c=playerCanvas.getContext('2d'),w=playerCanvas.width,h=playerCanvas.height;
  let background=null;
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,w,h);
  if(playerScene==='world'){
    if(!world||!WT)return null;
    const saved=wcam;
    try{
      const z=Math.min((w-50)/(world.W*WCELL),(h-80)/(world.H*WCELL));
      wcam={z,x:(w-world.W*WCELL*z)/2,y:(h-world.H*WCELL*z)/2};
      // Local-file images taint an exported canvas. Let the viewer draw the unchanged
      // reference locally, under the public overlay, instead of exporting its pixels.
      const reference=isNemai()&&nemaiImageState==='ready';
      drawWorld(playerCanvas,true,!reference);
      if(reference)background={kind:'nemai',x:wcam.x,y:wcam.y,w:world.W*WCELL*z,h:world.H*WCELL*z};
    }finally{wcam=saved;}
  }else{
    // Restore every temporary render setting even if drawing fails.
    const saved={previewPlayers,mode,cam,curZones};
    try{
      previewPlayers=true;mode='play';
      let top=map.height.reduce((n,level,i)=>Math.min(n,Math.floor(i/map.cols)*T-level*LH()),0);
      for(const o of map.objects)if(!map.fogOn||!fullyFogged(o.x,o.y,o.w,o.h))top=Math.min(top,o.y*T-objLift(o)-objE(o)-(o.label?20:0));
      for(const u of map.units)if(!unseen(u)){const b=unitBox(u);top=Math.min(top,b.fy-b.sw-65);}
      const pad=Math.max(0,-top)+16;
      const mw=map.cols*T,mh=map.rows*T+pad,z=Math.min((w-40)/mw,(h-40)/mh);
      cam={z,x:(w-mw*z)/2,y:(h-mh*z)/2+pad*z};
      c.setTransform(z,0,0,z,cam.x,cam.y);drawMapFrame(c);renderMap(c,true);
    }finally{previewPlayers=saved.previewPlayers;mode=saved.mode;cam=saved.cam;curZones=saved.curZones;}
  }
  return {type:'jdr-player-frame',scene:playerScene,sceneId:playerSceneSerial,background,
    title:playerScene==='world'?`${world.name} · Jour ${world.day}`:playerBattleTitle(),
    combat:playerScene==='play'?publicCombatInfo():null,
    image:playerCanvas.toDataURL('image/webp',.9)};
}
function sendPlayerFrame(){
  if(!playerWindow||playerWindow.closed)return;
  let frame;
  try{
    if(playerCurtain)frame={type:'jdr-player-frame',curtain:true,title:'La suite de l’aventure se prépare…'};
    else if(SIM||!['world','play'].includes(mode))frame=playerLastFrame?{...playerLastFrame,paused:true}:{type:'jdr-player-frame',curtain:true,title:'En attente du monde ou du combat'};
    else {frame=renderPlayerFrame();if(frame)playerLastFrame=frame;}
    playerFrameError='';
  }catch(e){
    playerFrameError='Affichage indisponible · recharge la page MJ.';
    frame={type:'jdr-player-frame',curtain:true,title:'Le MJ rétablit la projection…'};
    console.error('Projection des joueurs',e);
  }
  if(frame)playerWindow.postMessage(frame,location.protocol==='file:'?'*':location.origin);
}
window.addEventListener('message',e=>{
  if(!playerWindow||e.source!==playerWindow||e.data?.type!=='jdr-player-request')return;
  if(location.protocol!=='file:'&&e.origin!==location.origin)return;
  playerLastSeen=Date.now();sendPlayerFrame();updatePlayerScreenStatus();
});
$('btnWorldPlayers').onclick=openPlayerScreen;
$('btnStartPlayers').onclick=startCombatWithPlayers;
$('previewWorldPlayers').onchange=e=>{previewWorldPlayers=e.target.checked;wredraw();};
document.querySelectorAll('[data-player-curtain]').forEach(el=>el.onchange=()=>{
  playerCurtain=el.checked;sendPlayerFrame();updatePlayerScreenStatus();
});
setInterval(updatePlayerScreenStatus,2000);
