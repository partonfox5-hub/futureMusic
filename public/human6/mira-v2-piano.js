import * as T from 'three';
import {tagMovable} from './mira-v2-furniture.js?v=19.3.0';
import {unlockSfx,audioContext,sfxMaster} from './mira-v2-sfx.js?v=19.3.2';

function midi(n){return 440*Math.pow(2,(n-69)/12);}
function durToken(s){let d=4/Number(s.replace('.',''));if(s.endsWith('.'))d*=1.5;return d;}
function compile(bpm,src){
 const acc={c:0,d:2,e:4,f:5,g:7,a:9,b:11},spb=60/bpm,notes=[];let beat=0;
 for(const tok of String(src).split(/\s+/).filter(t=>t&&t!=='|')){
  if(tok[0]==='r'){beat+=durToken(tok.slice(1));continue;}
  const parts=tok.split('+');
  let step=0;
  for(const p of parts){
   const m=p.match(/^([a-g])([s#b]?)(\d)-(\d+\.?)$/i);if(!m)continue;
   let n=acc[m[1].toLowerCase()]+(Number(m[3])+1)*12;
   if(m[2]==='s'||m[2]==='#')n++;else if(m[2]==='b')n--;
   const d=durToken(m[4]);notes.push({t:beat*spb,d:d*spb*.92,n,v:.7});step=Math.max(step,d);
  }
  beat+=step;
 }
 return notes;
}

export const SONGS=[
 {id:'elise',name:'Für Elise',composer:'Beethoven',bpm:114,src:`
  e5-8 ds5-8 e5-8 ds5-8 e5-8 b4-8 d5-8 c5-8 a4-4 r8
  c4-8 e4-8 a4-8 b4-4 r8 e4-8 gs4-8 b4-8 c5-4 r8
  e5-8 ds5-8 e5-8 ds5-8 e5-8 b4-8 d5-8 c5-8 a4-4 r8
  c4-8 e4-8 a4-8 b4-4 r8 e4-8 c5-8 b4-8 a4-2
  e5-8 ds5-8 e5-8 ds5-8 e5-8 b4-8 d5-8 c5-8 a4-4 r8
  c4-8 e4-8 a4-8 b4-4 r8 e4-8 gs4-8 b4-8 c5-4 r8
  e5-8 ds5-8 e5-8 ds5-8 e5-8 b4-8 d5-8 c5-8 a4-4 r8
  c4-8 e4-8 a4-8 b4-4 r8 e4-8 c5-8 b4-8 a4-2
  b4-8 c5-8 d5-8 e5-4 g4-8 f5-8 e5-8 d5-4 f4-8 e5-8 d5-8 c5-4 e4-8 d5-8 c5-8 b4-4
  e5-8 ds5-8 e5-8 ds5-8 e5-8 b4-8 d5-8 c5-8 a4-2`},
 {id:'prelude',name:'Prelude in C',composer:'Bach',bpm:72,src:`
  c4-16 e4-16 g4-16 c5-16 e5-16 g4-16 c5-16 e5-16 c4-16 e4-16 g4-16 c5-16 e5-16 g4-16 c5-16 e5-16
  c4-16 d4-16 a4-16 d5-16 f5-16 a4-16 d5-16 f5-16 c4-16 d4-16 a4-16 d5-16 f5-16 a4-16 d5-16 f5-16
  b3-16 d4-16 g4-16 d5-16 f5-16 g4-16 d5-16 f5-16 b3-16 d4-16 g4-16 d5-16 f5-16 g4-16 d5-16 f5-16
  c4-16 e4-16 g4-16 c5-16 e5-16 g4-16 c5-16 e5-16 c4-16 e4-16 g4-16 c5-16 e5-16 g4-16 c5-16 e5-16
  c4-16 e4-16 a4-16 e5-16 a5-16 a4-16 e5-16 a5-16 c4-16 e4-16 a4-16 e5-16 a5-16 a4-16 e5-16 a5-16
  c4-16 d4-16 fs4-16 a4-16 d5-16 fs4-16 a4-16 d5-16 c4-16 d4-16 fs4-16 a4-16 d5-16 fs4-16 a4-16 d5-16
  b3-16 d4-16 g4-16 d5-16 g5-16 g4-16 d5-16 g5-16 b3-16 d4-16 g4-16 d5-16 g5-16 g4-16 d5-16 g5-16
  b3-16 c4-16 e4-16 g4-16 c5-16 e4-16 g4-16 c5-16 b3-16 c4-16 e4-16 g4-16 c5-16 e4-16 g4-16 c5-16
  a3-16 c4-16 e4-16 g4-16 c5-16 e4-16 g4-16 c5-16 a3-16 c4-16 e4-16 g4-16 c5-16 e4-16 g4-16 c5-16
  d3-16 a3-16 d4-16 fs4-16 c5-16 d4-16 fs4-16 c5-16 d3-16 a3-16 d4-16 fs4-16 c5-16 d4-16 fs4-16 c5-16
  g3-16 b3-16 d4-16 g4-16 b4-16 d4-16 g4-16 b4-16 g3-16 b3-16 d4-16 g4-16 b4-16 d4-16 g4-16 b4-16
  g3-16 as3-16 e4-16 g4-16 cs5-16 e4-16 g4-16 cs5-16 g3-16 as3-16 e4-16 g4-16 cs5-16 e4-16 g4-16 cs5-16
  f3-16 a3-16 d4-16 a4-16 d5-16 d4-16 a4-16 d5-16 f3-16 a3-16 d4-16 a4-16 d5-16 d4-16 a4-16 d5-16
  f3-16 gs3-16 d4-16 f4-16 b4-16 d4-16 f4-16 b4-16 f3-16 gs3-16 d4-16 f4-16 b4-16 d4-16 f4-16 b4-16
  e3-16 g3-16 c4-16 g4-16 c5-16 c4-16 g4-16 c5-16 e3-16 g3-16 c4-16 g4-16 c5-16 c4-16 g4-16 c5-16
  e3-16 f3-16 a3-16 c4-16 f4-16 a3-16 c4-16 f4-16 e3-16 f3-16 a3-16 c4-16 f4-16 a3-16 c4-16 f4-16
  d3-16 f3-16 a3-16 c4-16 f4-16 a3-16 c4-16 f4-16 d3-16 f3-16 a3-16 c4-16 f4-16 a3-16 c4-16 f4-16
  g2-16 d3-16 g3-16 b3-16 f4-16 g3-16 b3-16 f4-16 g2-16 d3-16 g3-16 b3-16 f4-16 g3-16 b3-16 f4-16
  c3-16 e3-16 g3-16 c4-16 e4-16 g3-16 c4-16 e4-16 c3-16 e3-16 g3-16 c4-16 e4-16 g3-16 c4-16 e4-16
  c3-16 g3-16 as3-16 c4-16 e4-16 as3-16 c4-16 e4-16 c3-16 g3-16 as3-16 c4-16 e4-16 as3-16 c4-16 e4-16
  f2-16 f3-16 a3-16 c4-16 e4-16 a3-16 c4-16 e4-16 f2-16 f3-16 a3-16 c4-16 e4-16 a3-16 c4-16 e4-16
  fs2-16 c3-16 a3-16 c4-16 ds4-16 a3-16 c4-16 ds4-16 fs2-16 c3-16 a3-16 c4-16 ds4-16 a3-16 c4-16 ds4-16
  gs2-16 f3-16 b3-16 f4-16 d4-16 b3-16 f4-16 d5-16 g2-16 f3-16 g3-16 b3-16 d4-16 f4-16 d4-16 b3-16
  g2-16 e3-16 g3-16 c4-16 e4-16 g4-16 e4-16 c4-16 g2-16 d3-16 g3-16 c4-16 f4-16 g4-16 f4-16 d4-16
  g2-16 d3-16 g3-16 b3-16 d4-16 f4-16 d4-16 b3-16 g2-16 e3-16 g3-16 c4-16 e4-16 g4-16 e4-16 c4-16
  c3-16 c4-16 g3-16 as3-16 c4-16 e4-16 g4-16 c5-16 c3-8 r8 c2-2`},
 {id:'joy',name:'Ode to Joy',composer:'Beethoven',bpm:112,src:`
  e4-4 e4-4 f4-4 g4-4 g4-4 f4-4 e4-4 d4-4 c4-4 c4-4 d4-4 e4-4 e4-4. d4-8 d4-2
  e4-4 e4-4 f4-4 g4-4 g4-4 f4-4 e4-4 d4-4 c4-4 c4-4 d4-4 e4-4 d4-4. c4-8 c4-2
  d4-4 d4-4 e4-4 c4-4 d4-4 e4-8 f4-8 e4-4 c4-4 d4-4 e4-8 f4-8 e4-4 d4-4 c4-4 d4-4 g3-2
  e4-4 e4-4 f4-4 g4-4 g4-4 f4-4 e4-4 d4-4 c4-4 c4-4 d4-4 e4-4 d4-4. c4-8 c4-2
  e4-4 e4-4 f4-4 g4-4 g4-4 f4-4 e4-4 d4-4 c4-4 c4-4 d4-4 e4-4 e4-4. d4-8 d4-2
  e4-4 e4-4 f4-4 g4-4 g4-4 f4-4 e4-4 d4-4 c4-4 c4-4 d4-4 e4-4 d4-4. c4-8 c4-2`},
 {id:'minuet',name:'Minuet in G',composer:'Petzold',bpm:108,src:`
  d5-4 g4-8 a4-8 b4-8 c5-8 d5-4 g4-4 g4-4
  e5-4 c5-8 d5-8 e5-8 fs5-8 g5-4 g4-4 g4-4
  c5-4 d5-8 c5-8 b4-8 a4-8 b4-4 c5-8 b4-8 a4-8 g4-8
  fs4-4 g4-8 a4-8 b4-8 g4-8 a4-2
  d5-4 g4-8 a4-8 b4-8 c5-8 d5-4 g4-4 g4-4
  e5-4 c5-8 d5-8 e5-8 fs5-8 g5-4 g4-4 g4-4
  c5-4 d5-8 c5-8 b4-8 a4-8 b4-4 c5-8 b4-8 a4-8 g4-8
  a4-4 b4-8 a4-8 g4-8 fs4-8 g4-2
  b4-4 b4-8 a4-8 b4-8 c5-8 a4-4 a4-8 g4-8 a4-8 b4-8
  g4-4 g4-8 fs4-8 g4-8 a4-8 fs4-4 d4-4 d4-4
  e4-4 e4-8 fs4-8 g4-8 a4-8 b4-4 a4-4 g4-4
  fs4-4 e4-4 d4-2
  d5-4 g4-8 a4-8 b4-8 c5-8 d5-4 g4-4 g4-4
  e5-4 c5-8 d5-8 e5-8 fs5-8 g5-4 g4-4 g4-4
  c5-4 d5-8 c5-8 b4-8 a4-8 b4-4 c5-8 b4-8 a4-8 g4-8
  a4-4 d4-4 g4-2`},
 {id:'twinkle',name:'Twinkle Twinkle',composer:'French melody',bpm:100,src:`
  c4-4 c4-4 g4-4 g4-4 a4-4 a4-4 g4-2
  f4-4 f4-4 e4-4 e4-4 d4-4 d4-4 c4-2
  g4-4 g4-4 f4-4 f4-4 e4-4 e4-4 d4-2
  g4-4 g4-4 f4-4 f4-4 e4-4 e4-4 d4-2
  c4-4 c4-4 g4-4 g4-4 a4-4 a4-4 g4-2
  f4-4 f4-4 e4-4 e4-4 d4-4 d4-4 c4-2
  c4-4 e4-4 g4-4 c5-4 a4-4 a4-4 g4-2
  f4-4 f4-4 e4-4 e4-4 d4-4 g3-4 c4-2
  c4-4 c4-4 g4-4 g4-4 a4-4 a4-4 g4-2
  f4-4 f4-4 e4-4 e4-4 d4-4 d4-4 c4-2`}
];
for(const s of SONGS)s.notes=compile(s.bpm,s.src);

function woodMap(){
 const c=document.createElement('canvas');c.width=256;c.height=256;
 const g=c.getContext('2d');
 g.fillStyle='#4a2a16';g.fillRect(0,0,256,256);
 for(let i=0;i<48;i++){
  const x=i*5.4+(i%3)*1.7;
  g.strokeStyle=`rgba(${28+i%8},${12+i%5},${6},${.1+((i*17)%8)/40})`;
  g.lineWidth=1.1+(i%4)*.4;
  g.beginPath();g.moveTo(x,-4);
  g.bezierCurveTo(x+4,80,x-6,160,x+2,260);g.stroke();
 }
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(2,1);t.anisotropy=4;return t;
}
function sheetMap(title,sub){
 const c=document.createElement('canvas');c.width=512;c.height=704;
 const g=c.getContext('2d');
 g.fillStyle='#efe6d2';g.fillRect(0,0,512,704);
 g.fillStyle='#e4d7bc';g.fillRect(18,18,476,668);
 g.strokeStyle='#cbb892';g.strokeRect(18,18,476,668);
 g.fillStyle='#3a2a18';g.font='700 28px Georgia,serif';g.textAlign='center';g.fillText(title,256,58);
 g.font='italic 16px Georgia,serif';g.fillStyle='#6a5438';g.fillText(sub,256,82);
 g.fillStyle='#1c1710';
 for(let staff=0;staff<5;staff++){
  const y0=128+staff*108;
  g.strokeStyle='#2a2218';g.lineWidth=1.2;
  for(let l=0;l<5;l++){g.beginPath();g.moveTo(48,y0+l*9);g.lineTo(464,y0+l*9);g.stroke();}
  g.font='700 34px Georgia,serif';g.textAlign='left';g.fillText('G',50,y0+34);
  for(let n=0;n<11;n++){
   const x=118+n*30,y=y0+6+((n*3+staff)%9)*4.2;
   g.beginPath();g.ellipse(x,y,7,5, -.4,0,Math.PI*2);g.fill();
   g.beginPath();g.moveTo(x+6,y);g.lineTo(x+6,y-22);g.stroke();
  }
 }
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.needsUpdate=true;return map;
}
const _p=new T.Vector3(),_d=new T.Vector3(),_u=new T.Vector3(),_q=new T.Quaternion(),_k=new T.Vector3();

export function installPiano(world,origin=new T.Vector3(-5.85,0,.35),yaw=Math.PI/2){
 const root=new T.Group();root.position.copy(origin);root.rotation.y=yaw;world.root.add(root);
 const grain=woodMap();
 const mahogany=new T.MeshStandardMaterial({map:grain,color:0x6a3a22,roughness:.38,metalness:.08});
 const dark=new T.MeshStandardMaterial({map:grain,color:0x3a2014,roughness:.42,metalness:.06});
 const polish=new T.MeshStandardMaterial({color:0x2a160e,roughness:.22,metalness:.12});
 const brass=new T.MeshStandardMaterial({color:0xb08a4a,roughness:.32,metalness:.78});
 const ivory=new T.MeshStandardMaterial({color:0xf4efe6,roughness:.52,metalness:0});
 const ebony=new T.MeshStandardMaterial({color:0x161412,roughness:.34,metalness:.08});
 const felt=new T.MeshStandardMaterial({color:0x7a1822,roughness:.9,metalness:0});
 const clickables=[],sheets=[];
 function part(mesh,kind='wood',health){
  mesh.castShadow=mesh.receiveShadow=true;
  const p=world.fractures.register(mesh,kind);
  if(health){p.health=health;p.maxHealth=health;}
  clickables.push(mesh);root.add(mesh);return mesh;
 }
 function add(mesh,x,y,z){mesh.position.set(x,y,z);return mesh;}

 const body=part(add(new T.Mesh(new T.BoxGeometry(1.48,.62,.58),mahogany),0,.53,-.08),'wood',92);
 const back=part(add(new T.Mesh(new T.BoxGeometry(1.50,1.18,.07),dark),0,.81,-.36),'wood',80);
 const left=part(add(new T.Mesh(new T.BoxGeometry(.07,1.18,.78),dark),-.745,.81,0),'wood',64);
 const right=part(add(new T.Mesh(new T.BoxGeometry(.07,1.18,.78),dark),.745,.81,0),'wood',64);
 const lid=part(add(new T.Mesh(new T.BoxGeometry(1.50,.04,.64),polish),0,1.42,-.08),'wood',48);
 const fall=part(add(new T.Mesh(new T.BoxGeometry(1.36,.05,.16),mahogany),0,.94,.22),'wood',36);
 const keybed=part(add(new T.Mesh(new T.BoxGeometry(1.28,.05,.28),dark),0,.66,.22),'wood',52);
 const apron=part(add(new T.Mesh(new T.BoxGeometry(1.36,.28,.07),mahogany),0,.52,.34),'wood',40);
 const cheekL=part(add(new T.Mesh(new T.BoxGeometry(.08,.16,.30),mahogany),-.68,.76,.22),'wood',28);
 const cheekR=part(add(new T.Mesh(new T.BoxGeometry(.08,.16,.30),mahogany),.68,.76,.22),'wood',28);
 const upper=part(add(new T.Mesh(new T.BoxGeometry(1.36,.46,.04),mahogany),0,1.16,.18),'wood',55);
 const rail=part(add(new T.Mesh(new T.BoxGeometry(1.36,.03,.04),brass),0,1.38,.20),'metal',40);
 const strip=add(new T.Mesh(new T.BoxGeometry(1.24,.01,.26),felt),0,.69,.22);strip.castShadow=false;root.add(strip);clickables.push(strip);

 for(const [x,z] of [[-.62,-.22],[-.21,-.22],[.21,-.22],[.62,-.22],[-.62,.16],[.62,.16]]){
  part(add(new T.Mesh(new T.CylinderGeometry(.028,.034,.58,10),mahogany),x,.29,z),'wood',32);
  part(add(new T.Mesh(new T.CylinderGeometry(.042,.048,.035,10),dark),x,.02,z),'wood',22);
  const ring=add(new T.Mesh(new T.TorusGeometry(.032,.007,6,12),brass),x,.12,z);ring.rotation.x=Math.PI/2;root.add(ring);clickables.push(ring);
 }
 const lyre=part(add(new T.Mesh(new T.BoxGeometry(.22,.28,.04),dark),0,.28,.22),'wood',24);
 for(const x of [-.07,0,.07]){
  const ped=part(add(new T.Mesh(new T.BoxGeometry(.04,.012,.09),brass),x,.12,.30),'metal',18);
  ped.rotation.x=.18;
 }

 const keys=new T.Group();keys.position.set(-.61,.71,.26);root.add(keys);
 const nWhite=52,ww=.0234,dummy=new T.Object3D();
 const whiteMidi=[];let midiN=21;for(let i=0;i<nWhite;i++){whiteMidi.push(midiN);const nm=['A','B','C','D','E','F','G'][i%7];midiN+=(nm==='B'||nm==='E')?1:2;}
 const whites=new T.InstancedMesh(new T.BoxGeometry(ww*.92,.014,.145),ivory,nWhite);
 whites.instanceMatrix.setUsage(T.DynamicDrawUsage);whites.castShadow=false;whites.raycast=()=>{};whites.userData.pianoKey=true;whites.userData.noHit=true;
 const whiteX=new Float32Array(nWhite),whiteDown=new Float32Array(nWhite);
 for(let i=0;i<nWhite;i++){whiteX[i]=i*ww;dummy.position.set(i*ww,0,0);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();whites.setMatrixAt(i,dummy.matrix);}
 keys.add(whites);
 const blackIdx=[],blackMidi=[];
 for(let i=0;i<nWhite-1;i++){if(whiteMidi[i+1]-whiteMidi[i]===2){blackIdx.push(i);blackMidi.push(whiteMidi[i]+1);}}
 const blacks=new T.InstancedMesh(new T.BoxGeometry(ww*.58,.012,.09),ebony,blackIdx.length);
 blacks.instanceMatrix.setUsage(T.DynamicDrawUsage);blacks.castShadow=false;blacks.raycast=()=>{};blacks.userData.pianoKey=true;blacks.userData.noHit=true;
 const blackX=new Float32Array(blackIdx.length),blackDown=new Float32Array(blackIdx.length);
 blackIdx.forEach((i,n)=>{blackX[n]=i*ww+ww*.52;dummy.position.set(blackX[n],.012,-.026);dummy.updateMatrix();blacks.setMatrixAt(n,dummy.matrix);});
 keys.add(blacks);
 const keyPad=new T.Mesh(new T.BoxGeometry(1.28,.12,.42),new T.MeshBasicMaterial({visible:false}));
 keyPad.position.set(0,.76,.40);keyPad.userData.pianoBody=true;keyPad.userData.pianoKey=true;root.add(keyPad);clickables.push(keyPad);

 const rack=part(add(new T.Mesh(new T.BoxGeometry(.56,.02,.16),dark),0,1.12,.12),'wood',22);
 rack.rotation.x=-.42;
 const sheetMat=new T.MeshStandardMaterial({map:sheetMap(SONGS[0].name,SONGS[0].composer),roughness:.88,metalness:0,side:T.DoubleSide});
 const leafL=new T.Mesh(new T.PlaneGeometry(.24,.34),sheetMat);
 const leafR=new T.Mesh(new T.PlaneGeometry(.24,.34),sheetMat);
 leafL.position.set(-.13,1.28,.18);leafR.position.set(.13,1.28,.18);
 leafL.rotation.x=-.28;leafR.rotation.x=-.28;
 leafL.userData.pianoSheet=leafR.userData.pianoSheet=true;
 root.add(leafL,leafR);sheets.push(leafL,leafR);clickables.push(leafL,leafR);
 for(const leaf of [leafL,leafR]){const p=world.fractures.register(leaf,'wood');p.health=p.maxHealth=12;}

 const bench=new T.Group();bench.position.set(0,0,.72);root.add(bench);
 const pad=new T.Mesh(new T.BoxGeometry(.5,.06,.28),new T.MeshStandardMaterial({color:0x4a2e22,roughness:.86}));pad.position.y=.48;bench.add(pad);
 const top=new T.Mesh(new T.BoxGeometry(.5,.04,.28),mahogany);top.position.y=.44;bench.add(top);
 for(const s of [-1,1])for(const z of [-1,1]){
  const leg=new T.Mesh(new T.CylinderGeometry(.018,.024,.44,8),mahogany);leg.position.set(s*.18,.22,z*.09);bench.add(leg);
 }
 bench.traverse(m=>{if(m.isMesh){m.castShadow=m.receiveShadow=true;world.fractures.register(m,'wood');}});

 world.obstacle(origin.x,origin.z,1.22,.62,0,1.28,body);
 const seat={group:bench,position:bench.localToWorld(new T.Vector3(0,.50,0)),yaw:yaw+Math.PI,approach:root.localToWorld(new T.Vector3(0,0,1.35)),occupant:null,piano:true,sitDuration:120,keyboard:keys};
 bench.traverse(m=>{if(m.isMesh)m.userData.seat=seat;});
 world.seats.push(seat);tagMovable(world,bench,'Chair');
 const rc=new T.Raycaster();
 const api={
  root,keys,seat,index:0,playing:null,started:0,panner:null,listener:null,clickables,sheets,
  songs:SONGS,
  paintSheet(){
   const s=SONGS[this.index],map=sheetMap(s.name,s.composer),old=sheets[0]?.material.map;
   for(const leaf of sheets){leaf.material.map=map;leaf.material.needsUpdate=true;}
   if(old&&old!==map)old.dispose();
  },
  setSong(i){this.index=((i%SONGS.length)+SONGS.length)%SONGS.length;this.paintSheet();},
  cycleSong(){
   const actor=this.playing?.actor||null;
   this.setSong(this.index+1);
   if(actor||this.playing){this.play();if(this.playing)this.playing.actor=actor;}
  },
  ensureAudio(){
   const c=audioContext();if(!c)return null;
   if(!this.panner){
    const p=c.createPanner();p.panningModel='HRTF';p.distanceModel='inverse';p.refDistance=2.2;p.maxDistance=26;p.rolloffFactor=1.15;p.coneInnerAngle=360;
    p.connect(sfxMaster()||c.destination);
    this.panner=p;this.listener=c.listener;
   }
   return c;
  },
  play(id){
   unlockSfx();
   this.stop();
   if(id!=null){const i=SONGS.findIndex(s=>s.id===id);if(i>=0)this.setSong(i);}
   const song=SONGS[this.index];
   const file=song.file||('assets/piano/'+song.id+'.mp3');
   if(!this.media){this.media=new Audio();this.media.loop=true;this.media.preload='auto';this.media.crossOrigin='anonymous';}
   this.media.onerror=()=>{
    if(file.endsWith('.mp3')){song.file='assets/piano/'+song.id+'.wav';this.mediaSrc='';this.play();return;}
    this.playOsc();
   };
   if(this.mediaSrc!==file){this.mediaSrc=file;this.media.src=file;}
   this.media.currentTime=0;this.media.volume=.72;
   const go=()=>{this.media.play()?.catch?.(()=>{this.playOsc();});};
   go();
   this.playing={song,end:Infinity,actor:null,media:true};
   this.started=performance.now()/1000;
  },
  playOsc(){
   const c=this.ensureAudio();if(!c)return;
   const song=SONGS[this.index],now=c.currentTime,last=song.notes[song.notes.length-1];
   this.playing={song,end:now+(last?last.t+last.d:1)+0.4,actor:this.playing?.actor||null,media:false};
   this.started=now;
   for(const n of song.notes)this.note(c,now+n.t,n);
  },
  note(c,t,n){
   const o=c.createOscillator(),o2=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter();
   o.type='triangle';o2.type='sine';o.frequency.value=midi(n.n);o2.frequency.value=midi(n.n)*2;
   f.type='lowpass';f.frequency.value=1800+n.n*12;
   g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.12*n.v,t+.012);g.gain.exponentialRampToValueAtTime(.0008,t+n.d+.18);
   o.connect(g);o2.connect(g);g.connect(f);f.connect(this.panner);
   o.start(t);o2.start(t);o.stop(t+n.d+.22);o2.stop(t+n.d+.22);
  },
  stop(){try{this.media?.pause();}catch{}this.playing=null;this.clearPlayedKeys();},
  ensurePlaying(actor){
   if(this.playing?.actor===actor&&this.media&&!this.media.paused)return;
   this.play();if(this.playing)this.playing.actor=actor;
  },
  stopIf(actor){if(this.playing?.actor===actor)this.stop();},
  keepPlaying(actor){
   if(this.media&&this.playing?.media){
    if(this.media.paused)this.media.play()?.catch?.(()=>{});
    if(this.playing)this.playing.actor=actor;
    return;
   }
   if(!this.playing||audioContext()?.currentTime>this.playing.end){this.setSong(this.index+1);this.ensurePlaying(actor);}
  },
  sitNow(actor){
   if(actor.seat&&actor.seat!==this.seat){actor.seat.occupant=null;actor.group.position.copy(actor.seat.approach);}
   actor.navigation=null;actor.dest=null;actor.directedWalk=null;actor.autoWander=false;actor.mode='idle';actor.sitHold=0;
   this.seat.occupant=actor;actor.seat=this.seat;actor.seatBlend=Math.max(actor.seatBlend||0,.15);
   this.ensurePlaying(actor);
  },
  invite(actor,props){
   if(!actor||actor.version!=='v2'){if(props)props.status='Select a Mira, then point at the piano';return true;}
   if(actor.seat===this.seat){this.ensurePlaying(actor);if(props)props.status=(actor.displayName||'Mira')+' · playing '+SONGS[this.index].name;return true;}
   if(this.seat.occupant&&this.seat.occupant!==actor){if(props)props.status='Piano · occupied';return true;}
   actor.sitHold=0;
   const name=actor.displayName||'Mira';
   const here=actor.group.position.clone().setY(0),ap=this.seat.approach.clone().setY(0);
   if(here.distanceTo(ap)<.9&&actor.balance?.state==='standing'){
    this.sitNow(actor);if(props)props.status=name+' · playing '+SONGS[this.index].name;return true;
   }
   let ok=world.walk(actor,this.seat.approach,this.seat);
   if(!ok){
    for(const off of [[0,0,1.55],[.95,0,1.15],[-.95,0,1.15],[1.15,0,.35],[-1.15,0,.35],[0,0,1.9]]){
     const p=root.localToWorld(new T.Vector3(off[0],off[1],off[2]));
     if(!world.blocked(p,.22)&&world.walk(actor,p,this.seat)){ok=true;break;}
    }
   }
   if(!ok){
    if(actor.seat){actor.group.position.copy(actor.seat.approach);actor.seat.occupant=null;actor.seat=null;}
    const goal=this.seat.approach.clone();
    if(actor.walkTo?.(goal)){
     actor.navigation={points:[goal.clone()],index:0,goal,seat:this.seat};
     actor.directedWalk=goal.clone();actor.dest=goal.clone();actor.autoWander=true;ok=true;
     this.seat.occupant=actor;
    }
   }
   if(props)props.status=ok?name+' · to the piano':'Piano · no path';
   return true;
  },
  click(ray,props){
   const r=ray?.isRaycaster?ray.ray:ray;if(!r?.origin)return false;
   rc.ray.copy(r);rc.near=0;rc.far=6;
   const live=clickables.filter(m=>m.visible&&m.parent);
   const hits=rc.intersectObjects(live,false);if(!hits.length)return false;
   const first=hits[0];
   if(first.object.userData.seat)return false;
   const sheet=hits.find(h=>h.object.userData.pianoSheet&&h.distance<=first.distance+.3);
   if(sheet){
    this.cycleSong();
    if(props)props.status='Piano · '+SONGS[this.index].name;
    return true;
   }
   const actor=props?.system?.selected||props?.system?.select?.();
   return this.invite(actor,props);
  },
  writeKey(mesh,i,x,y,z){
   dummy.position.set(x,y,z);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  },
  pressKey(kind,i,midiN,silent=false){
   const down=kind==='w'?whiteDown:blackDown;if(down[i]>.5)return;
   down[i]=1;
   if(kind==='w')this.writeKey(whites,i,whiteX[i],-.008,0);else this.writeKey(blacks,i,blackX[i],.004,-.026);
   if(!silent){unlockSfx();const c=this.ensureAudio();if(c)this.note(c,c.currentTime,{n:midiN,d:.22,v:.85});}
  },
  releaseKey(kind,i){
   const down=kind==='w'?whiteDown:blackDown;if(down[i]<.5)return;down[i]=0;
   if(kind==='w')this.writeKey(whites,i,whiteX[i],0,0);else this.writeKey(blacks,i,blackX[i],.012,-.026);
  },
  midiKey(n){
   const wi=whiteMidi.indexOf(n);if(wi>=0)return ['w',wi];
   const bi=blackMidi.indexOf(n);if(bi>=0)return ['b',bi];
   return null;
  },
  clearPlayedKeys(){
   for(let i=0;i<nWhite;i++)if(whiteDown[i]>.5)this.releaseKey('w',i);
   for(let i=0;i<blackIdx.length;i++)if(blackDown[i]>.5)this.releaseKey('b',i);
  },
  tickPlayedKeys(){
   if(!this.playing)return;
   const t=this.playing.media&&this.media&&!this.media.paused?this.media.currentTime:(audioContext()?audioContext().currentTime-(this.started||0):0);
   const active=new Set();
   for(const n of this.playing.song.notes){
    if(t>=n.t&&t<=n.t+n.d+.04){const k=this.midiKey(n.n);if(k)active.add(k[0]+k[1]);}
   }
   for(let i=0;i<nWhite;i++){
    if(active.has('w'+i))this.pressKey('w',i,whiteMidi[i],true);else if(whiteDown[i]>.5)this.releaseKey('w',i);
   }
   for(let i=0;i<blackIdx.length;i++){
    if(active.has('b'+i))this.pressKey('b',i,blackMidi[i],true);else if(blackDown[i]>.5)this.releaseKey('b',i);
   }
  },
  tickPlayerKeys(props){
   const hands=props?.system?.hands;if(!hands?.palmPos)return;
   keys.updateWorldMatrix(true,true);
   const tips=[];
   for(let i=0;i<2;i++){const p=hands.palmPos(i);if(p)tips.push(p);}
   if(!tips.length)return;
   const hit=(x,y,z,rx,rz)=>{
    const wp=keys.localToWorld(_k.set(x,y,z));
    for(const t of tips){if(Math.abs(t.x-wp.x)<rx&&Math.abs(t.z-wp.z)<rz&&t.y<wp.y+.10&&t.y>wp.y-.16)return true;}
    return false;
   };
   for(let i=0;i<nWhite;i++){
    if(hit(whiteX[i],.01,.10,ww*.72,.18))this.pressKey('w',i,whiteMidi[i]);else if(!this.playing)this.releaseKey('w',i);
   }
   for(let i=0;i<blackIdx.length;i++){
    if(hit(blackX[i],.02,.06,ww*.5,.14))this.pressKey('b',i,blackMidi[i]);else if(!this.playing)this.releaseKey('b',i);
   }
   whites.instanceMatrix.needsUpdate=true;blacks.instanceMatrix.needsUpdate=true;
  },
  tick(camera,props){
   this.tickPlayerKeys(props);
   if(this.playing)this.tickPlayedKeys();
   whites.instanceMatrix.needsUpdate=true;blacks.instanceMatrix.needsUpdate=true;
   if(this.media&&camera){
    const d=camera.getWorldPosition(_p).distanceTo(root.getWorldPosition(_d));
    this.media.volume=Math.max(.08,Math.min(.8,2.4/(d+1.1)));
   }
   const c=audioContext();if(!c||!this.panner){seat.position.copy(bench.localToWorld(new T.Vector3(0,.50,0)));seat.approach.copy(root.localToWorld(new T.Vector3(0,0,1.35)));return;}
   root.updateWorldMatrix(true,true);
   const p=root.getWorldPosition(_p),t=c.currentTime;
   if(this.panner.positionX){this.panner.positionX.setValueAtTime(p.x,t);this.panner.positionY.setValueAtTime(p.y+.9,t);this.panner.positionZ.setValueAtTime(p.z,t);}
   else this.panner.setPosition(p.x,p.y+.9,p.z);
   const lis=c.listener,cam=camera;if(!cam||!lis)return;
   const wp=cam.getWorldPosition(_d),dir=new T.Vector3(0,0,-1).applyQuaternion(cam.getWorldQuaternion(_q)),up=_u.set(0,1,0).applyQuaternion(cam.getWorldQuaternion(new T.Quaternion()));
   if(lis.positionX){lis.positionX.setValueAtTime(wp.x,t);lis.positionY.setValueAtTime(wp.y,t);lis.positionZ.setValueAtTime(wp.z,t);lis.forwardX.setValueAtTime(dir.x,t);lis.forwardY.setValueAtTime(dir.y,t);lis.forwardZ.setValueAtTime(dir.z,t);lis.upX.setValueAtTime(up.x,t);lis.upY.setValueAtTime(up.y,t);lis.upZ.setValueAtTime(up.z,t);}
   else{lis.setPosition(wp.x,wp.y,wp.z);lis.setOrientation(dir.x,dir.y,dir.z,up.x,up.y,up.z);}
   if(this.playing&&c.currentTime>this.playing.end&&!this.playing.actor)this.playing=null;
   seat.position.copy(bench.localToWorld(new T.Vector3(0,.50,0)));
   seat.approach.copy(root.localToWorld(new T.Vector3(0,0,1.35)));
  }
 };
 world.piano=api;return api;
}
