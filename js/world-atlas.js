// Atlas : itinéraire persistant, favoris, suivi du groupe et navigation à la mini-carte.
let atlasSort='type',atlasStatus='',atlasFollow=false;
function toggleWorldPanels(){const expanded=document.body.classList.toggle('world-map-focus');$('atlasExpand').textContent=expanded?'☷ Panneaux':'⛶ Carte seule';$('atlasExpand').setAttribute('aria-pressed',String(expanded));resizeWorld();fitWorld();}
function atlasParty() {const selected=selectedSheets().filter(s=>!s.dead);return selected.length?selected:sheets.filter(s=>s.camp!=='monster'&&!s.dead);}
function atlasCenter(list=atlasParty()) {
  const points=list.map(s=>world.pos[s.id]).filter(Boolean);if(!points.length)return {x:world.W/2,y:world.H/2};
  return {x:points.reduce((n,p)=>n+p.x,0)/points.length,y:points.reduce((n,p)=>n+p.y,0)/points.length};
}
function atlasGroup() {
  if(!world)return;ensurePositions();wsel.ids=new Set(sheets.filter(s=>s.camp!=='monster'&&!s.dead).map(s=>s.id));wsel.loc=null;
  const p=atlasCenter();centerOn(p.x,p.y);renderWorldPanels();
}
function atlasZoom(factor) {
  const x=wcv.clientWidth/2,y=wcv.clientHeight/2,z=clamp(wcam.z*factor,.15,8);
  wcam.x=x-(x-wcam.x)*z/wcam.z;wcam.y=y-(y-wcam.y)*z/wcam.z;wcam.z=z;wredraw();
}
function atlasNotice(text) {atlasStatus=text;const box=$('atlasStatus');if(box)box.textContent=text;}
function planWorldStop(point,loc=null,append=true) {
  if(!world||wanim)return;
  if(world.pending){atlasNotice('Résous ou évite la rencontre en cours avant de préparer un autre voyage.');return;}
  const party=atlasParty();if(!party.length){atlasNotice('Crée un personnage pour préparer un voyage.');return;}
  const ids=party.map(s=>s.id),same=world.route&&world.route.ids.join(',')===ids.join(',');
  if(!append||!same)world.route={ids,points:[]};
  if(world.route.points.length>=12){atlasNotice('L’itinéraire peut contenir 12 étapes.');return;}
  const p={x:clamp(point.x,0,world.W-1),y:clamp(point.y,0,world.H-1),locId:loc?.id||null,name:loc?.name||placeName(point.x,point.y)};
  const prev=world.route.points.at(-1);if(prev&&Math.hypot(prev.x-p.x,prev.y-p.y)<.1)return;
  world.route.points.push(p);wsel.ids=new Set(ids);saveWorld();renderWorldPanels();wredraw();atlasNotice('Itinéraire prêt. Vérifie les vivres et lance la prochaine étape.');
}
function atlasRouteInfo() {
  const route=world?.route;if(!route)return null;
  const party=route.ids.map(getSheet).filter(s=>s&&!s.dead&&world.pos[s.id]);if(!party.length)return null;
  let from=atlasCenter(party),km=0,days=0,sea=false;
  const legs=route.points.map(p=>{const loc=world.locations.find(l=>l.id===p.locId);if(loc){p.x=loc.x;p.y=loc.y;p.name=loc.name;}
    const info=travelInfo(from,p);from=p;const elapsed=info.km===0?0:Math.ceil(info.days);km+=info.km;days+=elapsed;sea||=info.sea;return {...info,days:elapsed,p};});
  const shortage=party.filter(s=>s.camp!=='monster'&&itemCount(s,'ration')<days).map(s=>`${s.name} : manque ${Math.max(0,days-itemCount(s,'ration'))}`);
  return {party,legs,km,days,sea,shortage};
}
function travelNextStop() {
  if(wanim||world.pending)return;
  const route=world.route,info=atlasRouteInfo();if(!info||!route.points.length)return;
  wsel.ids=new Set(info.party.map(s=>s.id));wsel.loc=null;
  const point=route.points[0],loc=world.locations.find(l=>l.id===point.locId);
  if(info.legs[0].km===0){route.points.shift();saveWorld();renderWorldPanels();wredraw();return;}
  if(travelTo({x:point.x,y:point.y},loc||null)===false)return;
  // A random encounter keeps the unfinished destination available for resumption.
  if(!world.pending)route.points.shift();saveWorld(true);renderWorldPanels();wredraw();
}
function buildWorldAtlas() {
  if($('atlasToolbar'))return;
  $('worldMain').append(h('div',{id:'atlasToolbar',className:'atlas-toolbar','aria-label':'Navigation de l’atlas'},
    gearButton('−',()=>atlasZoom(1/1.3),{title:'Dézoomer','aria-label':'Dézoomer'}),gearButton('+',()=>atlasZoom(1.3),{title:'Zoomer','aria-label':'Zoomer'}),
    gearButton('⌖ Groupe',atlasGroup,{title:'Sélectionner et centrer les aventuriers (P)'}),gearButton('◫ Monde',fitWorld,{title:'Voir tout le monde (F)'}),gearButton('⛶ Carte seule',toggleWorldPanels,{id:'atlasExpand','aria-pressed':'false',title:'Agrandir la carte en masquant les panneaux latéraux'}),h('span',{id:'atlasZoom'})),
    h('canvas',{id:'atlasMini',width:220,height:147,tabIndex:0,role:'img','aria-label':'Mini-carte interactive : clic pour centrer, flèches pour déplacer la vue'}));
  const nav=h('section',{id:'atlasPanel',className:'atlas-panel'});$('wLocList').before(nav);
  const controls=h('div',{className:'atlas-filters'},h('select',{id:'atlasSort','aria-label':'Trier les lieux',on:{change:e=>{atlasSort=e.target.value;renderLocList();}}},gearOption('type','Par type'),gearOption('name','Par nom'),gearOption('distance','Les plus proches')),
    h('select',{id:'atlasFilter','aria-label':'État des lieux',on:{change:renderLocList}},gearOption('','Tous les lieux'),gearOption('favorite','Favoris'),gearOption('visited','Visités'),gearOption('unvisited','À découvrir'),gearOption('battle','Avec carte de combat')));
  $('wLocList').before(controls,h('p',{id:'atlasLocCount',className:'muted'}));
  const mini=$('atlasMini');mini.onclick=e=>{if(!world)return;const r=mini.getBoundingClientRect();centerOn((e.clientX-r.left)/r.width*world.W,(e.clientY-r.top)/r.height*world.H,wcam.z);};
  mini.onkeydown=e=>{const d={ArrowLeft:[1,0],ArrowRight:[-1,0],ArrowUp:[0,1],ArrowDown:[0,-1]}[e.key];if(d){e.preventDefault();wcam.x+=d[0]*60;wcam.y+=d[1]*60;wredraw();}};
  $('worldHelp').textContent='Clic : sélectionner · Maj+clic : grouper · Clic droit : préparer un trajet · Maj+clic droit : ajouter une étape · Glisser : déplacer · Molette : zoom · P : groupe · F : vue complète';
}
function renderAtlas() {
  if(!world)return;buildWorldAtlas();const box=$('atlasPanel');box.replaceChildren();
  const heroes=sheets.filter(s=>s.camp!=='monster'&&!s.dead),food=heroes.length?Math.min(...heroes.map(s=>itemCount(s,'ration'))):0;
  box.append(h('div',{className:'atlas-party'},h('b',{textContent:`${heroes.length} aventurier${heroes.length>1?'s':''}`}),h('span',{textContent:`Vivres : ${food} jour${food>1?'s':''} pour tous`}),gearButton('Voir le groupe',atlasGroup,{className:'mini'})),
    h('label',{},'Suivre le groupe pendant le voyage',h('input',{type:'checkbox',checked:atlasFollow,on:{change:e=>{atlasFollow=e.target.checked;}}})),h('p',{id:'atlasStatus',role:'status','aria-live':'polite',className:'muted',textContent:atlasStatus}));
  const info=atlasRouteInfo();
  box.append(gearButton('🏕 Gérer l’expédition',openExpedition,{className:'wide-btn',id:'btnExpedition'}),h('p',{className:'muted',textContent:`Allure ${EXPEDITION_PACES[expeditionOptions().pace].name.toLowerCase()} · coffre : ${expeditionCount(equipmentState.chest.items.ration)} rations`}));
  if(!info||!info.legs.length){box.append(h('p',{className:'muted',textContent:'Prépare un trajet par clic droit, ou ajoute un lieu depuis sa fiche. Maj+clic droit ajoute une étape.'}));return;}
  box.append(h('h3',{textContent:'Carnet de route'}),h('p',{className:'muted',textContent:info.party.map(s=>s.name).join(', ')}));
  info.legs.forEach((leg,i)=>box.append(h('div',{className:'atlas-leg'},gearButton(`${i+1}. ${leg.p.name}`,()=>centerOn(leg.p.x,leg.p.y),{title:`${leg.km} km · ${leg.days} jour(s)`}),h('small',{textContent:`${leg.km} km · ${leg.days} j${leg.sea?' · bateau':''}`}),gearButton('↑',()=>{[world.route.points[i-1],world.route.points[i]]=[world.route.points[i],world.route.points[i-1]];saveWorld();renderAtlas();wredraw();},{className:'mini',disabled:i===0,'aria-label':'Monter cette étape'}),gearButton('×',()=>{world.route.points.splice(i,1);saveWorld();renderAtlas();wredraw();},{className:'mini','aria-label':'Retirer cette étape'}))));
  box.append(h('p',{className:'atlas-total',textContent:`${info.km} km · ${info.days} jours · arrivée estimée : jour ${world.day+info.days}`}),
    h('p',{className:'muted',textContent:'Trajets directs, durée selon les terrains. Les rencontres peuvent interrompre une étape.'}));
  if(info.sea)box.append(h('p',{className:'gear-warnings',textContent:'Traversée maritime : prévoir un bateau avec le MJ.'}));
  if(info.shortage.length)box.append(h('p',{className:'gear-warnings',textContent:'Rations dans les sacs · '+info.shortage.join(' · ')+(expeditionOptions().chestRations?' · Le coffre complétera les stocks disponibles en route.':'')}));
  box.append(gearButton(world.pending?'Rencontre à résoudre':wanim?'Voyage en cours…':map.turn>0?'Combat à terminer':'🚶 Partir vers la prochaine étape',travelNextStop,{className:'primary wide-btn',disabled:!!expeditionBlocked()}),gearButton('Effacer l’itinéraire',()=>{world.route=null;saveWorld();renderAtlas();wredraw();},{className:'wide-btn',disabled:!!wanim}));
}
function atlasLocationControls(l) {
  return h('div',{className:'atlas-location-controls'},
    gearButton(l.favorite?'★ Favori':'☆ Marquer en favori',()=>{l.favorite=!l.favorite;saveWorld();renderWorldPanels();wredraw();},{'aria-pressed':String(!!l.favorite)}),
    gearButton(l.visited?'✓ Visité':'Marquer comme visité',()=>{l.visited=!l.visited;saveWorld();renderWorldPanels();wredraw();},{'aria-pressed':String(!!l.visited)}),
    gearButton('＋ Ajouter à l’itinéraire',()=>planWorldStop(l,l),{className:'wide-btn'}));
}
function atlasLocationMatches(l) {const f=$('atlasFilter')?.value;return !f||f==='favorite'&&l.favorite||f==='visited'&&l.visited||f==='unvisited'&&!l.visited||f==='battle'&&l.battle;}
function atlasSortLocations(a,b) {
  if(atlasSort==='distance'){const p=atlasCenter();return Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y);}
  return (atlasSort==='type'?Object.keys(LOC_TYPES).indexOf(a.type)-Object.keys(LOC_TYPES).indexOf(b.type):0)||a.name.localeCompare(b.name,'fr');
}
function drawWorldRoutes(c) {
  const info=atlasRouteInfo();if(!info?.legs.length)return;
  c.save();const z=wcam.z;let from=atlasCenter(info.party);c.lineWidth=3/z;c.strokeStyle=world.opts.parchment?'#8a3327':'#ffe09a';c.setLineDash([7/z,5/z]);
  c.beginPath();c.moveTo(from.x*WCELL,from.y*WCELL);for(const {p}of info.legs)c.lineTo(p.x*WCELL,p.y*WCELL);c.stroke();c.setLineDash([]);
  info.legs.forEach(({p},i)=>{const x=p.x*WCELL,y=p.y*WCELL-17/z;c.fillStyle='#732d24';c.beginPath();c.arc(x,y,9/z,0,Math.PI*2);c.fill();c.fillStyle='#fff0cf';c.font=`bold ${11/z}px Georgia`;c.textAlign='center';c.textBaseline='middle';c.fillText(i+1,x,y);});c.restore();
}
function drawAtlasMini() {
  const mini=$('atlasMini');if(!mini||!WT||!world)return;const c=mini.getContext('2d');
  const height=Math.round(mini.width*world.H/world.W);if(mini.height!==height)mini.height=height;
  const sx=mini.width/world.W,sy=mini.height/world.H;
  mini.style.height='auto';mini.style.aspectRatio=`${world.W} / ${world.H}`;
  c.clearRect(0,0,mini.width,mini.height);c.drawImage(worldBackground(),0,0,mini.width,mini.height);
  world.locations.filter(l=>l.favorite).forEach(l=>{c.fillStyle='#a73224';c.fillRect(l.x*sx-2,l.y*sy-2,4,4);});
  sheets.filter(s=>s.camp!=='monster').forEach(s=>{const p=world.pos[s.id];if(!p)return;c.fillStyle='#fff1b0';c.strokeStyle='#382217';c.beginPath();c.arc(p.x*sx,p.y*sy,3,0,Math.PI*2);c.fill();c.stroke();});
  c.strokeStyle='#842e23';c.lineWidth=2;c.strokeRect(-wcam.x/(wcam.z*WCELL)*sx,-wcam.y/(wcam.z*WCELL)*sy,wcv.clientWidth/(wcam.z*WCELL)*sx,wcv.clientHeight/(wcam.z*WCELL)*sy);
  $('atlasZoom').textContent=Math.round(wcam.z*100)+' %';
}
function worldTokenPositions(list=sheets) {
  const placed=new Map(),z=wcam.z;
  // Spread visually overlapping pawns without changing campaign coordinates.
  for(const s of list){const p=worldVisualPosition(s.id);if(!p)continue;
    let x=p.x*WCELL,y=p.y*WCELL;
    for(let step=0;step<80;step++){
      if(![...placed.values()].some(q=>Math.hypot((q.x-x)*z,(q.y-y)*z)<30))break;
      const angle=step*2.4,r=14*Math.sqrt(step+1)/z;x=p.x*WCELL+Math.cos(angle)*r;y=p.y*WCELL+Math.sin(angle)*r;
    }
    placed.set(s.id,{x,y});
  }
  return placed;
}
window.addEventListener('keydown',e=>{if(mode!=='world'||e.ctrlKey||e.metaKey||e.altKey||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
  if(e.key.toLowerCase()==='p'){e.preventDefault();atlasGroup();}if(e.key.toLowerCase()==='f'){e.preventDefault();fitWorld();}
});
