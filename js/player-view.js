// Projection passive. Ce document ne lit et ne modifie aucune sauvegarde.
const screenCanvas=document.getElementById('projection'),screenContext=screenCanvas.getContext('2d');
const curtain=document.getElementById('curtain'),title=document.getElementById('sceneTitle'),connection=document.getElementById('connection');
const combatHud=document.getElementById('combatHud'),initiative=document.getElementById('combatInitiative');
let picture=null,background=null,lastMessage=0,sceneId=null,zoom=1,pan={x:0,y:0},pointer=null,frameVersion=0,lastImage='';
let lastCombat='',lastActive='';
const referenceMap=new Image();referenceMap.src='assets/maps/nemai.webp';
function showCombat(summary,paused=false){
  const signature=JSON.stringify([summary,paused]);
  if(signature===lastCombat)return;
  lastCombat=signature;
  combatHud.hidden=!summary;
  if(!summary){initiative.replaceChildren();lastActive='';return;}
  document.getElementById('combatRound').textContent=summary.round?`Round ${summary.round}`:'Préparation';
  document.getElementById('combatTurn').textContent=summary.turn;
  document.getElementById('combatNext').textContent=summary.next;
  document.getElementById('combatPhase').textContent=paused?'Image suspendue':summary.round?'Combat en cours':'En attente du départ';
  document.getElementById('initiativeLabel').textContent=summary.round?'Ordre d’initiative · figurines visibles':'Figurines visibles · initiative au début du combat';
  const fragment=document.createDocumentFragment();
  for(const unit of summary.units){
    const card=document.createElement('li');card.className='combatant '+(unit.hero?'hero':'monster');
    card.classList.toggle('active',unit.active);card.classList.toggle('out',!!unit.state);
    if(unit.active)card.setAttribute('aria-current','true');
    const portrait=document.createElement('img');portrait.src=unit.portrait;portrait.alt='';portrait.width=40;portrait.height=40;
    const info=document.createElement('div');info.className='combatant-info';
    const name=document.createElement('strong');name.textContent=unit.name;
    const side=document.createElement('small');side.textContent=unit.active?'▶ Tour actuel':unit.hero?'Aventurier':'Adversaire';
    info.append(name,side);
    if(unit.hero){
      const hp=document.createElement('span');hp.className='hero-hp';hp.textContent=`${unit.hp} / ${unit.hpMax} PV`;
      const bar=document.createElement('meter');bar.min=0;bar.max=Math.max(1,unit.hpMax);bar.value=Math.max(0,unit.hp);
      bar.setAttribute('aria-label',`Points de vie de ${unit.name}`);info.append(hp,bar);
    }
    const state=[unit.state,...unit.conditions].filter(Boolean).join(' · ');
    if(state){const text=document.createElement('span');text.className='combatant-state';text.textContent=state;info.append(text);}
    card.append(portrait,info);fragment.append(card);
  }
  if(!summary.units.length){const empty=document.createElement('li');empty.className='initiative-empty';empty.textContent='Le MJ révèle les figurines sur la carte.';fragment.append(empty);}
  const scroll=initiative.scrollLeft;initiative.replaceChildren(fragment);initiative.scrollLeft=scroll;
  const active=initiative.querySelector('[aria-current]'),activeKey=summary.round+':'+summary.turn;
  if(active&&activeKey!==lastActive){
    const box=active.getBoundingClientRect(),list=initiative.getBoundingClientRect();
    if(box.left<list.left||box.right>list.right)initiative.scrollLeft+=box.left-list.left-(list.width-box.width)/2;
  }
  lastActive=activeKey;
}
function paintProjection(){
  const ratio=devicePixelRatio||1,w=screenCanvas.clientWidth,h=screenCanvas.clientHeight;
  screenCanvas.width=Math.round(w*ratio);screenCanvas.height=Math.round(h*ratio);
  screenContext.setTransform(ratio,0,0,ratio,0,0);
  if(!picture)return;
  const scale=Math.min(w/picture.width,h/picture.height)*zoom;
  const x=(w-picture.width*scale)/2+pan.x,y=(h-picture.height*scale)/2+pan.y;
  if(background&&referenceMap.complete&&referenceMap.naturalWidth)screenContext.drawImage(referenceMap,x+background.x*scale,y+background.y*scale,background.w*scale,background.h*scale);
  screenContext.drawImage(picture,x,y,picture.width*scale,picture.height*scale);
}
function fitProjection(){zoom=1;pan={x:0,y:0};paintProjection();}
function hideProjection(text){
  const message=document.getElementById('curtainText');
  if(!curtain.hidden&&!picture&&message.textContent===text)return;
  frameVersion++;picture=null;background=null;lastImage='';showCombat(null);curtain.hidden=false;message.textContent=text;paintProjection();
}
addEventListener('message',async e=>{
  if(!opener||e.source!==opener||e.data?.type!=='jdr-player-frame')return;
  if(location.protocol!=='file:'&&e.origin!==location.origin)return;
  const frame=e.data;lastMessage=Date.now();
  const heading=frame.title||'Carte des aventuriers',status=frame.curtain?'Écran masqué par le MJ':frame.paused?'Image suspendue · préparation du MJ':'En direct · molette : zoom · glisser : déplacer la vue';
  if(title.textContent!==heading)title.textContent=heading;
  if(connection.textContent!==status)connection.textContent=status;
  if(frame.curtain){hideProjection(frame.title);return;}
  if(typeof frame.image!=='string'||!frame.image.startsWith('data:image/'))return;
  if(frame.image===lastImage&&sceneId===frame.scene+':'+frame.sceneId){showCombat(frame.scene==='play'?frame.combat:null,frame.paused);return;}
  const version=++frameVersion,next=new Image();next.src=frame.image;
  try{await next.decode();if(frame.background?.kind==='nemai')await referenceMap.decode();}catch{if(version===frameVersion)hideProjection('Image indisponible · en attente du MJ');return;}
  if(version!==frameVersion)return;
  picture=next;background=frame.background?.kind==='nemai'?frame.background:null;lastImage=frame.image;curtain.hidden=true;
  showCombat(frame.scene==='play'?frame.combat:null,frame.paused);
  const key=frame.scene+':'+frame.sceneId;
  if(sceneId!==key){sceneId=key;fitProjection();}else paintProjection();
});
setInterval(()=>{
  if(opener&&!opener.closed)opener.postMessage({type:'jdr-player-request'},location.protocol==='file:'?'*':location.origin);
  if(lastMessage&&Date.now()-lastMessage>8000&&connection.textContent!=='Connexion interrompue'){hideProjection('Connexion interrompue · retourne au grimoire du MJ puis rouvre cet écran.');title.textContent='En attente du maître du jeu';connection.textContent='Connexion interrompue';}
},120);
screenCanvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.5,Math.min(5,zoom*Math.exp(-e.deltaY*.001)));paintProjection();},{passive:false});
screenCanvas.addEventListener('pointerdown',e=>{pointer={id:e.pointerId,x:e.clientX,y:e.clientY};screenCanvas.setPointerCapture(e.pointerId);});
screenCanvas.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;pan.x+=e.clientX-pointer.x;pan.y+=e.clientY-pointer.y;pointer.x=e.clientX;pointer.y=e.clientY;paintProjection();});
for(const event of ['pointerup','pointercancel','lostpointercapture'])screenCanvas.addEventListener(event,()=>pointer=null);
document.getElementById('fit').onclick=fitProjection;
document.getElementById('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{connection.textContent='Plein écran indisponible : utilise F11.';}};
addEventListener('keydown',e=>{if(e.key.toLowerCase()==='f')fitProjection();});
new ResizeObserver(paintProjection).observe(screenCanvas);
addEventListener('resize',paintProjection);paintProjection();
