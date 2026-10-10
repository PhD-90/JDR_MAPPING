// Petits accessoires dessinés localement : aucune image distante, aucune collision.
const SMALL_DECOR = {
  grassTuft:['Touffes d’herbe','nature','#82914b'], flowers:['Fleurs sauvages','nature','#dca274'],
  mushrooms:['Champignons','nature','#ae4939'], fern:['Fougères','nature','#4d7b48'],
  bush:['Buisson à baies','nature','#53724a'], stump:['Souche','nature','#9b7449'],
  logs:['Bois coupé','nature','#825736'], pebbles:['Petits cailloux','nature','#a09985'],
  bedroll:['Paillasse','camp','#9c6548'], campfire:['Feu de camp','camp','#e19835'],
  lantern:['Lanterne','camp','#d9b359'], tent:['Petite tente','camp','#ae8b55'],
  chair:['Chaise','tavern','#94633f'], bench:['Banc','tavern','#976b43'],
  sacks:['Sacs de provisions','tavern','#b49b69'], urn:['Jarres','tavern','#ad7150'],
  bottles:['Bouteilles','tavern','#4f8977'], plates:['Vaisselle','tavern','#d6c8a6'],
  books:['Livres empilés','dungeon','#84423a'], scrolls:['Parchemins','dungeon','#d6be87'],
  candles:['Bougies','dungeon','#edcf91'], rug:['Tapis ancien','dungeon','#923f38'],
  bones:['Ossements','dungeon','#d6c7a4'], chains:['Chaînes','dungeon','#8e9291']
};
for(const [key,[name,category,c]] of Object.entries(SMALL_DECOR))
  OBJECTS[key]={name,category,c,shape:'detail',e:0,w:1,h:1};

function drawSmallDecor(c,o) {
  const col=o.color, dark=shade(col,.55), light=shade(col,1.25);
  c.save();c.translate((o.x+o.w/2)*T,(o.y+o.h/2)*T-objE(o));
  c.scale(o.w*T/48,o.h*T/48);c.rotate((o.rotation||0)*Math.PI/2);c.lineJoin='round';c.lineCap='round';
  const line=(pts,color=dark,width=2)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
  const oval=(x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
  const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  const poly=(pts,color)=>{c.fillStyle=color;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
  const flame=(x,y,size)=>{const g=c.createRadialGradient(x,y,0,x,y,size*2.5);g.addColorStop(0,'#ffc76a66');g.addColorStop(1,'#ffc76a00');oval(x,y,size*2.5,size*2,g);poly([[x-size,y+size],[x-size*.6,y-size*.3],[x,y-size*2],[x+size*.5,y-size*.4],[x+size,y+size]],'#e89732');poly([[x-size*.4,y+size],[x,y-size*.6],[x+size*.4,y+size]],'#fff1a9');};
  switch(o.type){
    case 'grassTuft': case 'fern':
      for(let j=0;j<3;j++){const x=-12+j*11,y=6+(j%2)*7;line([[x-7,y-8],[x,y+3],[x+6,y-13]],col,2);line([[x,y+3],[x-1,y-17]],light,2);
        if(o.type==='fern')for(let k=0;k<4;k++){line([[x-5,y-3-k*3],[x-1,y-k*3],[x+4,y-5-k*3]],col,2);}}break;
    case 'flowers':
      for(let j=0;j<5;j++){const x=-13+(j%3)*13,y=-5+Math.floor(j/3)*14;line([[x,y+10],[x,y]],'#557346');for(let k=0;k<5;k++)oval(x+Math.cos(k*1.26)*3,y+Math.sin(k*1.26)*3,2.5,2.5,j%2?light:col);oval(x,y,1.7,1.7,'#f2d563');}break;
    case 'mushrooms':
      [[-10,7,7],[8,12,6],[5,-5,9]].forEach(([x,y,r])=>{rect(x-2,y-4,4,10,'#dcc6a1');oval(x,y-5,r,r*.6,col);oval(x-r*.35,y-7,1.6,1.3,'#f0dbb1');oval(x+r*.3,y-4,1.3,1.2,'#f0dbb1');});break;
    case 'bush':
      [[-8,6,10],[7,5,11],[0,-4,12]].forEach(([x,y,r])=>oval(x,y,r,r*.8,col));oval(-3,-7,7,4,light);[[-10,3],[6,-4],[11,8],[-1,10]].forEach(([x,y])=>oval(x,y,2,2,'#b85950'));break;
    case 'stump':
      poly([[-13,14],[-10,-7],[10,-7],[14,14],[3,10],[-4,15]],dark);oval(0,-7,11,6,col);oval(0,-7,7,3.5,light);line([[-4,-7],[3,-7],[4,-5]],dark,1);line([[-7,0],[-9,9]],col);break;
    case 'logs':
      [[-8,7],[1,-2],[8,8]].forEach(([x,y])=>{line([[x-7,y-8],[x+8,y+5]],dark,9);line([[x-7,y-9],[x+8,y+4]],col,6);oval(x+8,y+5,4,3,'#cbaa77');oval(x+8,y+5,2,1.5,dark);});break;
    case 'pebbles':
      for(let j=0;j<9;j++){const x=(hash(j+o.id,11)-.5)*34,y=(hash(j,7)-.5)*30;oval(x,y,3+hash(j,4)*3,2+hash(j,3)*2,j%2?col:light);}break;
    case 'bedroll':
      rect(-12,-16,24,32,dark);rect(-10,-14,20,27,col);oval(0,-13,11,4,light);line([[-6,-5],[-6,13]],light,1);line([[-11,8],[11,8]],dark);break;
    case 'campfire':
      for(let j=0;j<8;j++)oval(Math.cos(j*.785)*14,Math.sin(j*.785)*9+6,4,3,'#888477');line([[-10,11],[9,0]],'#63482d',5);line([[-8,0],[10,11]],'#86623c',5);flame(0,0,7);break;
    case 'lantern':
      oval(0,10,10,5,'#0004');line([[-4,-13],[-4,-18],[4,-18],[4,-13]],dark);poly([[-9,-8],[-5,-14],[5,-14],[9,-8]],dark);rect(-7,-8,14,20,col);rect(-4,-5,8,13,'#ffe9a5');flame(0,3,2);line([[-8,13],[8,13]],dark,4);break;
    case 'tent':
      poly([[-20,12],[-2,-17],[20,6],[4,17]],col);poly([[-20,12],[-2,-17],[4,17]],light);poly([[-12,12],[-2,-10],[0,16]],dark);line([[0,-16],[19,6],[23,15]],'#d8c28b',1);line([[-18,13],[-23,18]],'#d8c28b',1);break;
    case 'chair':
      line([[-9,-13],[-9,14]],dark,3);line([[9,-13],[9,14]],dark,3);rect(-11,-16,22,9,col);rect(-11,-2,22,12,light);line([[-9,8],[-9,18]],dark,3);line([[9,8],[9,18]],dark,3);break;
    case 'bench':
      rect(-16,1,5,14,dark);rect(11,1,5,14,dark);rect(-20,-5,40,11,col);line([[-18,-3],[18,-3]],light);line([[-18,1],[18,1]],dark,1);break;
    case 'sacks':
      [[-8,4],[9,8]].forEach(([x,y])=>{oval(x,y,9,11,col);poly([[x-5,y-8],[x-6,y-16],[x+5,y-16],[x+4,y-8]],light);line([[x-5,y-9],[x+5,y-9]],dark);line([[x-5,y-2],[x-5,y+5]],light);});break;
    case 'urn':
      [[-8,4,1],[10,10,.7]].forEach(([x,y,s])=>{oval(x,y,10*s,12*s,col);rect(x-5*s,y-14*s,10*s,7*s,col);oval(x,y-14*s,6*s,3*s,light);oval(x,y-14*s,3*s,1.5*s,dark);line([[x-5*s,y-5*s],[x-6*s,y+4*s]],light,2);});break;
    case 'bottles':
      [[-11,6],[0,12],[11,3]].forEach(([x,y])=>{rect(x-4,y-11,8,18,col);rect(x-2,y-18,4,8,col);rect(x-2,y-19,4,3,'#b99357');rect(x-3,y-4,6,6,'#d9cba5');line([[x-2,y-9],[x-2,y-6]],light,1);});break;
    case 'plates':
      [[-9,1],[9,8]].forEach(([x,y])=>{oval(x,y+2,9,6,dark);oval(x,y,9,6,col);oval(x,y,6,3.5,light);});rect(8,-13,7,9,dark);rect(9,-12,5,5,col);break;
    case 'books':
      [[-14,5,28,12],[-11,-3,24,11],[-14,-11,27,10]].forEach(([x,y,w,h],i)=>{rect(x,y,w,h,i%2?dark:col);rect(x+3,y+3,w-5,h-4,'#d6c9a8');rect(x,y,w,3,i%2?dark:col);});line([[-11,-10],[-11,-3]],'#c0a55c',1);break;
    case 'scrolls':
      rect(-13,-11,26,24,col);oval(-13,1,3,13,light);oval(13,1,3,13,light);for(let j=0;j<4;j++)line([[-7,-5+j*4],[5-(j%2)*4,-5+j*4]],dark,1);line([[0,-12],[0,14]],'#934d40');break;
    case 'candles':
      oval(0,13,16,6,dark);[[-9,3,12],[0,8,23],[9,4,15]].forEach(([x,y,h])=>{rect(x-2,y-h,5,h,col);oval(x,y,4,2,light);flame(x,y-h-3,2.3);});break;
    case 'rug':
      rect(-19,-17,38,34,dark);rect(-17,-15,34,30,col);line([[-14,-12],[14,-12],[14,12],[-14,12],[-14,-12]],light,1);poly([[0,-10],[10,0],[0,10],[-10,0]],light);poly([[0,-6],[6,0],[0,6],[-6,0]],col);for(let j=-16;j<=16;j+=4){line([[j,-17],[j,-21]],light,1);line([[j,17],[j,21]],light,1);}break;
    case 'bones':
      [[-7,6,8,-4],[-9,-7,10,9]].forEach(([x,y,a,b])=>{line([[x,y],[a,b]],col,3);oval(x,y,3,2,col);oval(a,b,3,2,col);});oval(5,-10,7,6,col);rect(1,-7,8,5,col);oval(3,-11,1.8,2,dark);oval(8,-11,1.8,2,dark);break;
    case 'chains':
      for(let j=0;j<9;j++){const x=-15+j*4,y=Math.sin(j*.65)*8;c.strokeStyle=j%2?light:dark;c.lineWidth=2;c.beginPath();c.ellipse(x,y,4,2.5,.5,0,Math.PI*2);c.stroke();}break;
  }
  c.restore();
}
