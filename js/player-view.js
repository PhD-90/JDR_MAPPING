// Projection passive. Ce document ne lit et ne modifie aucune sauvegarde.
const screenCanvas=document.getElementById('projection'),screenContext=screenCanvas.getContext('2d');
const curtain=document.getElementById('curtain'),title=document.getElementById('sceneTitle'),connection=document.getElementById('connection');
let picture=null,background=null,lastMessage=0,sceneId=null,zoom=1,pan={x:0,y:0},pointer=null,frameVersion=0,lastImage='';
const referenceMap=new Image();referenceMap.src='assets/maps/nemai.webp';
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
  frameVersion++;picture=null;background=null;lastImage='';curtain.hidden=false;message.textContent=text;paintProjection();
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
  if(frame.image===lastImage&&sceneId===frame.scene+':'+frame.sceneId)return;
  const version=++frameVersion,next=new Image();next.src=frame.image;
  try{await next.decode();if(frame.background?.kind==='nemai')await referenceMap.decode();}catch{if(version===frameVersion)hideProjection('Image indisponible · en attente du MJ');return;}
  if(version!==frameVersion)return;
  picture=next;background=frame.background?.kind==='nemai'?frame.background:null;lastImage=frame.image;curtain.hidden=true;
  const key=frame.scene+':'+frame.sceneId;
  if(sceneId!==key){sceneId=key;fitProjection();}else paintProjection();
});
setInterval(()=>{
  if(opener&&!opener.closed)opener.postMessage({type:'jdr-player-request'},location.protocol==='file:'?'*':location.origin);
  if(lastMessage&&Date.now()-lastMessage>8000&&connection.textContent!=='Connexion interrompue'){hideProjection('Connexion interrompue · retourne au grimoire du MJ puis rouvre cet écran.');connection.textContent='Connexion interrompue';}
},120);
screenCanvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.5,Math.min(5,zoom*Math.exp(-e.deltaY*.001)));paintProjection();},{passive:false});
screenCanvas.addEventListener('pointerdown',e=>{pointer={id:e.pointerId,x:e.clientX,y:e.clientY};screenCanvas.setPointerCapture(e.pointerId);});
screenCanvas.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;pan.x+=e.clientX-pointer.x;pan.y+=e.clientY-pointer.y;pointer.x=e.clientX;pointer.y=e.clientY;paintProjection();});
for(const event of ['pointerup','pointercancel','lostpointercapture'])screenCanvas.addEventListener(event,()=>pointer=null);
document.getElementById('fit').onclick=fitProjection;
document.getElementById('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{connection.textContent='Plein écran indisponible : utilise F11.';}};
addEventListener('keydown',e=>{if(e.key.toLowerCase()==='f')fitProjection();});
addEventListener('resize',paintProjection);paintProjection();
