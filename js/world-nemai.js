// Atlas de Nemaï : illustration fournie, lieux et terrain de voyage calés en pixels sur la référence.
// Le fichier original reste intact. Les limites de terrain sont une approximation de lecture du dessin.
const NEMAI={width:1231,height:864,W:308,H:216,asset:'assets/maps/nemai.webp',kmPerPixel:100/175};
const NEMAI_PLACES=[
  ['zerua','Zerua','capitale',190,543,62,'Citadelle de la côte occidentale, au-dessus de l’océan d’Hirel.'],
  ['rimal','Rimal','ville',315,226,47,'Ville fortifiée sur la côte, au sud du lac Lénore.'],
  ['vaxelaire','Vaxelaire','capitale',701,273,61,'Cité fortifiée dominant la vallée de la Hallure.'],
  ['galaric','Galaric','ville',1090,173,43,'Ville des contreforts des monts Orins.'],
  ['fassyle','Fassylé','ville',941,651,64,'Cité fortifiée à la lisière sud de la forêt de Tarora.'],
  ['tamsol','Tamsol','ville',775,557,47,'Bourg fortifié au cœur de la boucle de la rivière.'],
  ['port-vieux','Port-Vieux','port',431,478,55,'Port sur la rive occidentale, au sud de la Hallure.'],
  ['port-soleil','Port-Soleil','port',95,417,36,'Petit port insulaire dans l’océan d’Hirel.'],
  ['phare-ouest','Phare-Ouest','tour',314,527,23,'Phare dominant le rivage entre Zerua et Port-Vieux.'],
  ['dosal','Dosal','village',360,315,24,'Village entre Rimal et les rives de la Hallure.'],
  ['sarkas','Sarkas','village',433,173,18,'Localité au nord des bois de Rimal.'],
  ['villers','Villers-sur-Hallure','village',533,363,35,'Habitations et cultures sur la rive nord de la Hallure.'],
  ['pont-riviere','Pont-Rivière','village',664,345,27,'Village à proximité du pont de la Hallure.'],
  ['basse-rives','Basse-Rives','village',677,434,28,'Village de la rive sud, sur la route de Tamsol.'],
  ['carrefour-vert','Carrefour-Vert','village',508,598,32,'Carrefour des routes de Port-Vieux, Brasol et Tamsol.'],
  ['brasol','Brasol','village',459,691,28,'Hameau et terres cultivées au sud de Carrefour-Vert.'],
  ['xavenfort','Xavenfort','village',819,766,35,'Bourg côtier au nord de la baie Calme.'],
  ['moureas','Mouréas','village',661,167,18,'Localité des marais de Dornas.'],
  ['eau-noire','Eau-Noire','village',821,175,29,'Village près des marais, au pied des monts Orins.'],
  ['bouleau-blanc','Bouleau-Blanc','village',985,108,30,'Village des contreforts, à l’ouest de Galaric.'],
  ['val-fleuri','Val-Fleuri','village',940,251,25,'Village au nord de la Hallure.'],
  ['pierre-levee','Pierre-Levée','village',1052,276,22,'Localité entre Val-Fleuri et Buc-Moir.'],
  ['buc-moir','Buc-Moir','village',1122,217,25,'Village adossé aux montagnes orientales.'],
  ['hauterives','Hauterives','village',1039,351,26,'Village près de la rivière, au nord de Tarora.'],
  ['bois-ombrage','Bois-Ombragé','village',789,412,24,'Village boisé sur la rive sud de la Hallure.'],
  ['orse-du-bois','Orsé-du-Bois','village',964,500,35,'Village au milieu de la forêt de Tarora.'],
  ['val-vert','Val-Vert','village',1090,573,23,'Hameau forestier à l’est de Fassylé.'],
  ['lac-lenore','Lac Lénore','lieu',204,87,35,'Lac au nord-ouest de la carte.','lake'],
  ['iles-soleil','Îles du Soleil','lieu',155,197,31,'Archipel occidental, au large de Rimal.','beach'],
  ['marais-dornas','Marais de Dornas','lieu',576,191,30,'Terres marécageuses autour de Mouréas.','swamp'],
  ['monts-orins','Monts Orins','lieu',856,47,32,'Chaîne de montagnes au nord de Nemaï.','mountain'],
  ['foret-tarora','Forêt de Tarora','lieu',1052,472,28,'Grande forêt de l’est, autour d’Orsé-du-Bois.','forest'],
  ['hallure','Rivière Hallure','lieu',870,367,26,'Rivière traversant Nemaï d’est en ouest.','grass'],
  ['baie-calme','Baie-Calme','lieu',865,807,28,'Baie sur la côte méridionale, au sud de Xavenfort.','ocean'],
  ['ocean-hirel','Océan d’Hirel','lieu',151,300,38,'Océan bordant les côtes ouest et sud de Nemaï.','ocean'],
];
// Zones des noms imprimés : cliquer « Zerua » ou sa citadelle ouvre le même lieu.
const NEMAI_LABELS={
  zerua:[120,650,238,695],rimal:[290,193,371,240],vaxelaire:[777,228,899,280],galaric:[947,149,1069,202],fassyle:[886,729,983,769],tamsol:[672,485,764,529],
  'port-vieux':[246,441,357,479],'port-soleil':[131,374,253,412],'phare-ouest':[40,482,153,513],dosal:[321,263,400,304],sarkas:[441,161,520,196],
  villers:[423,279,629,338],'pont-riviere':[642,352,762,386],'basse-rives':[653,439,763,479],'carrefour-vert':[449,543,618,580],brasol:[427,633,514,670],xavenfort:[748,702,870,741],
  moureas:[663,141,755,179],'eau-noire':[780,113,878,148],'bouleau-blanc':[931,121,1068,156],'val-fleuri':[873,270,962,303],'pierre-levee':[962,251,1075,291],
  'buc-moir':[1080,222,1184,263],hauterives:[983,308,1094,346],'bois-ombrage':[807,411,942,467],'orse-du-bois':[926,530,1051,564],'val-vert':[1065,595,1158,635],
  'lac-lenore':[143,57,278,125],'iles-soleil':[64,138,214,189],'marais-dornas':[516,92,685,163],'monts-orins':[737,65,860,93],'foret-tarora':[949,374,1126,444],
  hallure:[742,297,959,353],'baie-calme':[755,790,910,830],'ocean-hirel':[68,251,228,327],
};
const NEMAI_LAND=[
  [[349,24],[1201,24],[1201,837],[926,837],[914,798],[864,774],[830,781],[789,760],[746,777],[701,755],[645,771],[596,781],[563,762],[505,790],[477,783],[447,764],[419,774],[379,794],[325,809],[265,815],[217,812],[178,782],[127,796],[78,766],[40,711],[28,614],[53,584],[96,566],[145,552],[174,521],[182,478],[207,453],[237,495],[266,544],[302,569],[332,576],[346,549],[329,527],[344,500],[354,478],[345,452],[364,419],[356,399],[384,386],[348,372],[324,361],[307,325],[281,283],[268,242],[251,213],[255,171],[265,142],[260,115],[281,78],[319,43]],
  [[60,404],[85,385],[116,393],[134,416],[119,448],[85,469],[62,451]],
  [[129,170],[144,162],[153,179],[143,192],[128,186]],
  [[165,181],[185,185],[194,208],[182,221],[164,206]],
  [[109,193],[125,183],[137,201],[122,214],[110,207]],
];
const NEMAI_ZONES=[
  ['lake',[[47,30],[292,30],[264,82],[250,120],[232,154],[193,143],[171,127],[110,132],[58,108]]],
  ['forest',[[345,79],[474,90],[519,210],[635,239],[623,316],[554,352],[444,365],[349,327],[321,256]]],
  ['swamp',[[491,109],[777,99],[897,135],[902,215],[792,244],[729,218],[658,232],[543,208]]],
  ['mountain',[[361,24],[1201,24],[1201,303],[1133,295],[1093,229],[1078,128],[1000,106],[920,108],[850,81],[728,77],[471,104]]],
  ['forest',[[793,397],[942,403],[1109,386],[1198,433],[1198,765],[1103,789],[1044,724],[1026,649],[1006,566],[913,527],[868,458]]],
  ['hills',[[366,570],[427,626],[471,696],[427,758],[361,787],[319,772],[287,708],[238,664],[222,615],[299,567]]],
  ['mountain',[[1136,161],[1201,96],[1201,453],[1168,403],[1131,347],[1160,291]]],
];
const NEMAI_RIVERS=[
  [[1194,329],[1114,359],[1054,373],[987,389],[920,373],[870,352],[820,358],[756,375],[703,384],[651,397],[602,420],[548,424],[495,405],[451,386],[407,383],[359,393]],
  [[642,397],[637,448],[621,490],[614,532],[630,579],[624,630],[650,654],[700,679],[755,696],[815,676],[846,642],[863,596],[866,543],[850,506],[834,457],[816,407],[812,365]],
];
const isNemai=(w=world)=>w?.style==='nemai';
const nemaiPoint=(x,y)=>({x:x/NEMAI.width*NEMAI.W,y:y/NEMAI.height*NEMAI.H});
function nemaiInside(x,y,points) {
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const [ax,ay]=points[i],[bx,by]=points[j];
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }return inside;
}
function nemaiWorld() {
  return {v:1,style:'nemai',seed:1,W:NEMAI.W,H:NEMAI.H,scale:NEMAI.width/NEMAI.W*NEMAI.kmPerPixel,name:'Nemaï',day:1,pos:{},journal:[],
    opts:{regions:false,rivers:false,symbols:true,labels:true,parchment:true},
    regions:[['Zerua',190,543,35],['Rimal',315,226,125],['Vaxelaire',701,273,10],['Galaric',1090,173,210],['Fassylé',941,651,285]].map(([name,x,y,hue])=>({name,...nemaiPoint(x,y),hue,rep:0})),
    locations:NEMAI_PLACES.map(([id,name,type,x,y,radius,desc,terrain])=>({id:'nemai-'+id,name,type,...nemaiPoint(x,y),reference:{x,y,radius,name,label:NEMAI_LABELS[id]},desc,notes:'',battle:null,pop:0,...(terrain?{terrain}: {})}))};
}
function nemaiTerrain() {
  const {W,H}=NEMAI,N=W*H,water=new Uint8Array(N),biome=new Uint8Array(N),e=new Float32Array(N),alt=new Float32Array(N),temp=new Float32Array(N),moist=new Float32Array(N),flow=new Float32Array(N);
  let landCount=0;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const px=(x+.5)*NEMAI.width/W,py=(y+.5)*NEMAI.height/H,i=y*W+x;
    let b=NEMAI_LAND.some(p=>nemaiInside(px,py,p))?'grass':'ocean';
    for(const [key,polygon] of NEMAI_ZONES)if((b!=='ocean'||key==='lake')&&nemaiInside(px,py,polygon))b=key;
    for(const place of NEMAI_PLACES)if(!place[7]&&Math.hypot(px-place[3],py-place[4])<12)b='grass';
    biome[i]=BI[b];water[i]=b==='ocean'?1:b==='lake'?2:0;
    if(!water[i])landCount++;
    alt[i]=b==='mountain'?.6:b==='hills'?.23:water[i]?-.1:.06;e[i]=alt[i];temp[i]=b==='mountain'?.35:.58;moist[i]=b==='swamp'?.95:b==='forest'?.7:.5;
  }
  const rivers=NEMAI_RIVERS.map(points=>points.map(([x,y])=>{const p=nemaiPoint(x,y),i=Math.floor(p.y)*W+Math.floor(p.x);flow[i]=15;return i;}));
  return {W,H,e,h:alt,water,biome,flow,rivers,temp,moist,landCount};
}
const nemaiImage=new Image();
let nemaiImageState='loading';
nemaiImage.onload=()=>{nemaiImageState='ready';if(typeof world!=='undefined'&&isNemai()){renderWorldPanels();wredraw();}};
nemaiImage.onerror=()=>{nemaiImageState='error';if(typeof world!=='undefined'&&isNemai()){renderWorldPanels();wredraw();}};
nemaiImage.src=NEMAI.asset;
function worldBackground() {return isNemai()&&nemaiImageState==='ready'?nemaiImage:WT.img;}
function nemaiLocationRadius(l) {return l.reference?Math.max(12/wcam.z/WCELL,l.reference.radius*NEMAI.W/NEMAI.width):12/wcam.z/WCELL;}
function hitNemaiLocation(p) {
  const px=p.x*NEMAI.width/NEMAI.W,py=p.y*NEMAI.height/NEMAI.H;
  const labels=world.locations.filter(l=>{const b=l.reference?.label;return b&&px>=b[0]&&py>=b[1]&&px<=b[2]&&py<=b[3];});
  if(labels.length)return labels.sort((a,b)=>{const area=l=>(l.reference.label[2]-l.reference.label[0])*(l.reference.label[3]-l.reference.label[1]);return area(a)-area(b);})[0];
  return world.locations.filter(l=>Math.hypot(l.x-p.x,l.y-p.y)<nemaiLocationRadius(l)).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0]||null;
}
function drawNemaiLocation(c,l,publicView=false) {
  const x=l.x*WCELL,y=l.y*WCELL,z=wcam.z,selected=!publicView&&wsel.loc===l,hovered=!publicView&&whover&&hitLoc(whover)===l;
  if(!world.opts.symbols&&!selected&&!hovered)return;
  c.save();c.lineWidth=(selected?2:1)/z;c.strokeStyle=selected?'#f6d68c':'#593e23';c.fillStyle=selected?'#842c25':'#f4e0ad';
  c.shadowColor='#27170c70';c.shadowBlur=3;c.beginPath();c.arc(x,y,(selected?7:hovered?5:3)/z,0,Math.PI*2);c.fill();c.stroke();
  if(selected){c.shadowBlur=0;c.strokeStyle='#7f2c23';c.beginPath();c.arc(x,y,13/z,0,Math.PI*2);c.stroke();}
  if(!publicView&&(l.battle||l.favorite||l.visited)){c.font=`bold ${12/z}px Georgia`;c.fillStyle='#772f21';c.fillText(l.battle?'⚔':l.favorite?'★':'✓',x+9/z,y-9/z);}
  const renamed=!l.reference||l.name!==l.reference.name;
  if(world.opts.labels&&(selected||hovered||renamed)){
    c.shadowBlur=0;c.font=`bold ${12/z}px Georgia`;c.textAlign='center';c.textBaseline='middle';
    const w=c.measureText(l.name).width+16/z;c.fillStyle='#f8eacced';c.strokeStyle='#8a6339';c.lineWidth=1/z;
    c.fillRect(x-w/2,y+15/z,w,22/z);c.strokeRect(x-w/2,y+15/z,w,22/z);c.fillStyle='#4b2c18';c.fillText(l.name,x,y+26/z);
  }c.restore();
}
function updateNemaiControls() {
  const fixed=isNemai();$('nemaiNotice').classList.toggle('hidden',!fixed);
  $('nemaiNotice').textContent=nemaiImageState==='error'?'L’illustration n’a pas pu être chargée. Vérifie assets/maps/nemai.webp.':nemaiImageState==='loading'?'Chargement du parchemin de Nemaï…':'Carte de référence · 35 lieux · échelle : 100 km. Les noms et décors imprimés font partie du parchemin.';
  $('btnNemai').disabled=fixed||!!wanim||map.turn>0;$('btnNemai').textContent=fixed?'✓ Carte de Nemaï active':'🗺 Utiliser la carte de Nemaï';
  let backup=false;try{backup=!!localStorage.getItem('jdr-world-before-nemai');}catch(e){}
  $('btnPreviousWorld').classList.toggle('hidden',!backup);$('btnPreviousWorld').disabled=!!wanim||map.turn>0;
  for(const key of ['rivers','parchment'])$('wo_'+key).disabled=fixed;
  $('worldSymbolLabel').firstChild.textContent=fixed?'Repères interactifs ':'Montagnes et forêts ';
  $('worldLabelLabel').firstChild.textContent=fixed?'Étiquettes des repères ':'Noms ';
  $('wSeed').disabled=fixed;$('wRegen').disabled=fixed;$('wGen').disabled=fixed;
  $('nemaiGenerationHint').classList.toggle('hidden',!fixed);
  $('wLegend').classList.toggle('hidden',fixed);
}
function switchNemaiWorld(restore=false) {
  if(wanim||map.turn>0||(!restore&&isNemai()))return false;
  const linked=world?.locations.find(l=>l.id===map.locId);
  if(linked)linked.battle=JSON.parse(JSON.stringify(map));
  let previous;
  try{
    if(restore){previous=JSON.parse(localStorage.getItem('jdr-world-before-nemai'));if(!previous?.locations||!previous?.regions)return false;}
    // Write first: a full browser must never cause the current world to disappear.
    if(world)localStorage.setItem('jdr-world-before-nemai',JSON.stringify(world));
  }catch(e){alert('Impossible de conserver la carte actuelle : exporte la campagne avant de changer de monde.');return false;}
  clearTimeout(worldSaveTimer);clearTimeout(battleSaveTimer);wdrag=null;whover=null;wsel={loc:null,ids:new Set()};atlasStatus='';setAddType(null);
  world=restore?previous:nemaiWorld();WT=null;buildWorldCache();ensurePositions();
  delete map.locId;undoStack.length=0;redoStack.length=0;syncHistoryUI();changed();saveWorld(true);renderWorldPanels();fitWorld();return true;
}
