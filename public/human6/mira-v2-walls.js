import * as T from 'three';
import {playSfx} from './mira-v2-sfx.js?v=19.3.0';
const V=()=>new T.Vector3(),Q=()=>new T.Quaternion(),CELL=.6,STORY=3.05;
const QUEST=/Quest|OculusBrowser/i.test(globalThis.navigator?.userAgent||'');
const PALETTE={Plaster:0xc9c1b1,Brick:0xa26148,Wood:0x947051,Tile:0xc3c7c1,Stone:0x85847c,Castle:0x8a8478,Metal:0x929b9d,Glass:0x9fc1c7,Shingle:0x5c4034};
const maps=new Map();

function hash(x,y){const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);}
function valueN(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return hash(ix,iy)*(1-u)*(1-v)+hash(ix+1,iy)*u*(1-v)+hash(ix,iy+1)*(1-u)*v+hash(ix+1,iy+1)*u*v;}
function hexRgb(hex){return [(hex>>16)&255,(hex>>8)&255,hex&255];}

export function makeSurfaceMap(name){
 if(maps.has(name))return maps.get(name);
 const size=name==='Plaster'?1024:512,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 const c=canvas.getContext('2d'),img=c.createImageData(size,size),d=img.data,base=hexRgb(PALETTE[name]||PALETTE.Plaster);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size;let r=base[0],g=base[1],b=base[2];
  const n=valueN(u*18,v*18)*.5+valueN(u*54,v*54)*.3+valueN(u*140,v*140)*.2;
  if(name==='Plaster'){
   const pore=valueN(u*90,v*90);const speckle=hash(x*.17,y*.31);
   const streak=valueN(u*8,v*220)*.08;
   const shade=(n-.5)*.16+streak+(speckle>.93?-0.10:0)+(pore>.72?-0.05:0);
   r+=shade*38;g+=shade*34;b+=shade*28;
   if(v>.86){const dirt=(v-.86)/.14;r-=18*dirt;g-=16*dirt;b-=14*dirt;}
  }else if(name==='Brick'){
   const row=Math.floor(v*8),col=Math.floor(u*4+(row%2)*.5),mortar=(Math.abs((v*8)%1-.02)<.06)||(Math.abs((u*4+(row%2)*.5)%1-.02)<.045);
   const brick=hash(col,row);
   r=mortar?196:140+brick*40;g=mortar?178:78+brick*22;b=mortar?162:58+brick*16;
   r+=(n-.5)*18;g+=(n-.5)*12;
  }else if(name==='Wood'){
   const plank=Math.floor(u*8),grain=Math.sin((v+hash(plank,1)*.2)*40+n*6);
   const shade=.12*grain+(n-.5)*.1+hash(plank,2)*.08;
   r=118+shade*50;g=86+shade*36;b=52+shade*22;
   if(Math.abs((u*8)%1)<.03){r*=.72;g*=.72;b*=.7;}
  }else if(name==='Tile'){
   const grout=Math.abs((u*6)%1)<.04||Math.abs((v*6)%1)<.04;
   r=grout?150:base[0]+(n-.5)*14;g=grout?154:base[1]+(n-.5)*14;b=grout?158:base[2]+(n-.5)*12;
  }else if(name==='Castle'){
   const row=Math.floor(v*5),col=Math.floor(u*3+(row%2)*.5);
   const mortar=Math.abs((v*5)%1-.03)<.09||Math.abs((u*3+(row%2)*.5)%1-.03)<.07;
   const tone=hash(col,row),chip=hash(x*.3,y*.11);
   r=mortar?96:108+tone*42;g=mortar?90:102+tone*32;b=mortar?82:90+tone*24;
   r+=(n-.5)*16+(chip>.92?-18:0);g+=(n-.5)*12;b+=(n-.5)*10;
   if(v>.9){r*=.88;g*=.88;b*=.9;}
  }else if(name==='Stone'){
   const blot=valueN(u*7,v*9);
   r=base[0]+(blot-.5)*28+(n-.5)*16;g=base[1]+(blot-.5)*24;b=base[2]+(blot-.5)*18;
  }else if(name==='Metal'){
   const line=Math.sin(v*size*.4)*8;r=base[0]+line;g=base[1]+line;b=base[2]+line+(n-.5)*10;
  }else if(name==='Shingle'){
   const row=Math.floor(v*16),col=Math.floor(u*9+(row%2)*.5);
   const mortar=Math.abs((v*16)%1)<.07||Math.abs((u*9+(row%2)*.5)%1)<.035;
   const tone=hash(col,row);
   r=mortar?46:78+tone*36;g=mortar?40:52+tone*22;b=mortar?38:48+tone*16;
   r+=(n-.5)*14;g+=(n-.5)*10;
   if(v<.08){r*=.78;g*=.78;b*=.8;}
  }else{r+= (n-.5)*10;g+=(n-.5)*10;b+=(n-.5)*10;}
  const i=(y*size+x)*4;d[i]=Math.max(0,Math.min(255,r));d[i+1]=Math.max(0,Math.min(255,g));d[i+2]=Math.max(0,Math.min(255,b));d[i+3]=255;
 }
 c.putImageData(img,0,0);
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;map.needsUpdate=true;
 maps.set(name,map);return map;
}

function kindMap(kind){
 return makeSurfaceMap({plaster:'Plaster',wood:'Wood',stone:'Stone',castle:'Castle',glass:'Glass',metal:'Metal',shingle:'Shingle'}[kind]||(kind==='brick'?'Brick':'Plaster'));
}

export function wallMaterial(kind,map){
 const glass=kind==='glass';
 const shingle=kind==='shingle';
 const mat=new T.MeshStandardMaterial({
  map:glass?null:(map||kindMap(kind)),color:glass?0x9fc1c7:0xffffff,
  roughness:glass?.18:kind==='metal'?.38:shingle?.78:.88,metalness:kind==='metal'?.62:0,
  transparent:glass,opacity:glass?.30:1,envMapIntensity:glass?1.1:shingle?.35:.45
 });
 if(glass||shingle)return mat;
 mat.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader
   .replace('#include <common>','#include <common>\nvarying vec3 vWallP;varying vec3 vWallN;')
   .replace('#include <fog_vertex>',`#include <fog_vertex>
vec4 wp = vec4(transformed,1.0);
#ifdef USE_INSTANCING
wp = instanceMatrix * wp;
#endif
vWallP = (modelMatrix * wp).xyz;
#ifdef USE_INSTANCING
vWallN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);
#else
vWallN = normalize(mat3(modelMatrix) * objectNormal);
#endif`);
  shader.fragmentShader=shader.fragmentShader
   .replace('#include <common>','#include <common>\nvarying vec3 vWallP;varying vec3 vWallN;float wallDirt;')
   .replace('#include <map_fragment>',`#ifdef USE_MAP
 vec3 wn=abs(normalize(vWallN));vec3 wt=wn/max(wn.x+wn.y+wn.z,1e-4);
 vec2 s=vec2(1.6667);
 vec4 tex=texture2D(map,vWallP.zy*s)*wt.x+texture2D(map,vWallP.xz*s)*wt.y+texture2D(map,vWallP.xy*s)*wt.z;
 diffuseColor *= tex;
#endif
 float story=mod(vWallP.y+0.04,3.05);
 wallDirt=mix(0.58,1.0,smoothstep(0.0,0.32,story));
 diffuseColor.rgb *= wallDirt;`)
   .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+(1.0-wallDirt)*0.08,0.72,0.96);');
 };
 mat.customProgramCacheKey=()=>'mira-wall-ws-14.2';
 return mat;
}

function isWallCell(s){return s.y>=CELL*.8&&Math.min(s.x,s.z)<CELL*.45;}
function thinAxis(s){return s.x<s.z?'x':'z';}

const crackVert=`varying vec2 u;void main(){u=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const crackFrag=`varying vec2 u;uniform float seed;uniform float flash;
void main(){
 vec2 p=(u-.5)*2.0;
 float k=sin(p.x*11.0+seed)*0.08;
 float a=1.0-smoothstep(.06,.16,abs(p.y+k+0.12*sin(p.x*7.3+seed)));
 float b=1.0-smoothstep(.05,.14,abs(p.x*.35-p.y+0.2*sin(p.x*13.0)));
 float c=1.0-smoothstep(.78,1.0,length(p));
 float alpha=max(a,b*.7)*c*.92;
 if(alpha<.05)discard;
 vec3 col=mix(vec3(.16,.13,.11),vec3(.08,.07,.06),a);
 col+=flash*vec3(.55,.5,.42);
 gl_FragColor=vec4(col,alpha);
}`;

export class WallSystem {
 constructor(scene,world,fractures){
  this.scene=scene;this.world=world;this.fractures=fractures;
  this.maxDecal=QUEST?24:48;this.maxTrim=QUEST?280:520;this.maxStud=QUEST?36:64;this.maxDust=QUEST?16:28;
  this.dummy=new T.Object3D();
  const wood=new T.MeshStandardMaterial({map:makeSurfaceMap('Wood'),roughness:.82,color:0xffffff});
  this.trimMat=wood;
  this.baseMesh=this.makeInst('Wall_Baseboard',new T.BoxGeometry(1,1,1),wood,this.maxTrim);
  this.crownMesh=this.makeInst('Wall_Crown',new T.BoxGeometry(1,1,1),wood,this.maxTrim);
  this.caseMesh=this.makeInst('Wall_Casing',new T.BoxGeometry(1,1,1),wood,this.maxTrim);
  this.baseN=this.crownN=this.caseN=0;this.trimByPart=new Map();this.alloc={base:0,crown:0,case:0};
  this.decalMat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-5,uniforms:{seed:{value:0},flash:{value:0}},vertexShader:crackVert,fragmentShader:crackFrag});
  this.decals=this.makeInst('Wall_Crack',new T.PlaneGeometry(1,1),this.decalMat,this.maxDecal);
  this.decalList=[];this.decalSlot=0;
  const lath=new T.MeshStandardMaterial({map:makeSurfaceMap('Wood'),color:0x8a7358,roughness:.9});
  const plaster=new T.MeshStandardMaterial({map:makeSurfaceMap('Plaster'),color:0xb7aea0,roughness:.92});
  this.holeMatFront=plaster;this.holeMatBack=lath;
  this.holes=new Map();
  this.studMesh=this.makeInst('Wall_Stud',new T.BoxGeometry(1,1,1),wood,this.maxStud);this.studN=0;
  this.dustMesh=this.makeInst('Wall_Dust',new T.PlaneGeometry(.12,.12),new T.MeshBasicMaterial({color:0xd8cbb8,transparent:true,opacity:.7,depthWrite:false,side:T.DoubleSide}),this.maxDust);
  this.dust=[];
 }
 makeInst(name,geo,mat,n){
  const mesh=new T.InstancedMesh(geo,mat,n);mesh.name=name;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.castShadow=true;mesh.receiveShadow=true;
  this.dummy.scale.setScalar(0);this.dummy.updateMatrix();for(let i=0;i<n;i++)mesh.setMatrixAt(i,this.dummy.matrix);
  this.world.root.add(mesh);return mesh;
 }
 hideInst(mesh,n){this.dummy.scale.setScalar(0);this.dummy.updateMatrix();for(let i=0;i<n;i++)mesh.setMatrixAt(i,this.dummy.matrix);mesh.instanceMatrix.needsUpdate=true;}
 clear(){
  for(const g of this.holes.values())g.removeFromParent();this.holes.clear();
  this.trimByPart.clear();this.decalList=[];this.dust=[];this.baseN=this.crownN=this.caseN=this.studN=0;this.decalSlot=0;
  const drop=m=>{if(!m)return;m.removeFromParent();m.geometry?.dispose?.();};
  drop(this.baseMesh);drop(this.crownMesh);drop(this.caseMesh);drop(this.decals);drop(this.studMesh);drop(this.dustMesh);
  const wood=this.trimMat;
  this.baseMesh=this.makeInst('Wall_Baseboard',new T.BoxGeometry(1,1,1),wood,this.maxTrim);
  this.crownMesh=this.makeInst('Wall_Crown',new T.BoxGeometry(1,1,1),wood,this.maxTrim);
  this.caseMesh=this.makeInst('Wall_Casing',new T.BoxGeometry(1,1,1),wood,this.maxTrim);
  this.decals=this.makeInst('Wall_Crack',new T.PlaneGeometry(1,1),this.decalMat,this.maxDecal);
  this.studMesh=this.makeInst('Wall_Stud',new T.BoxGeometry(1,1,1),wood,this.maxStud);
  this.dustMesh=this.makeInst('Wall_Dust',new T.PlaneGeometry(.12,.12),new T.MeshBasicMaterial({color:0xd8cbb8,transparent:true,opacity:.7,depthWrite:false,side:T.DoubleSide}),this.maxDust);
 }
 prepMesh(mesh){
  if(!mesh.instanceColor){const c=new T.Color(1,1,1);for(let i=0;i<mesh.count;i++)mesh.setColorAt(i,c);}
 }
 dress(mesh,cells,kind,bounds){
  if(kind==='glass'||!cells?.length)return;
  const wall=cells.filter(c=>isWallCell(c.s||c.size));
  if(!wall.length)return;
  const parts=mesh.userData.chunks||[];
  for(const cell of wall){
   const p=cell.p||cell.center,s=cell.s||cell.size,part=parts.find(ch=>Math.abs(ch.p.x-p.x)<.02&&Math.abs(ch.p.y-p.y)<.02&&Math.abs(ch.p.z-p.z)<.02);
   const axis=thinAxis(s),along=axis==='x'?'z':'x',bottom=p.y-s.y/2,top=p.y+s.y/2,len=s[along],thick=s[axis];
   const put=(which,y,h,deep)=>{
    const mesh=which==='base'?this.baseMesh:this.crownMesh;let n=which==='base'?this.baseN:this.crownN;
    if(n>=this.maxTrim)return;
    this.dummy.position.set(p.x,y,p.z);this.dummy.rotation.set(0,0,0);
    const sc=V();sc.set(1,h,1);sc[along]=len;sc[axis]=deep;
    this.dummy.scale.copy(sc);this.dummy.updateMatrix();mesh.setMatrixAt(n,this.dummy.matrix);
    if(part){const list=this.trimByPart.get(part)||[];list.push({mesh,i:n});this.trimByPart.set(part,list);}
    if(which==='base')this.baseN=n+1;else this.crownN=n+1;
   };
   const story=Math.round(bottom/STORY)*STORY;
   if(Math.abs(bottom-story)<.18)put('base',bottom+.04,.08,thick+.028);
   const ceil=story+3.0;
   if(Math.abs(top-ceil)<.16||Math.abs(top-(story+STORY))<.16)put('crown',top-.03,.06,thick+.022);
  }
  this.dressCasing(mesh,wall,bounds);
  this.baseMesh.instanceMatrix.needsUpdate=true;this.crownMesh.instanceMatrix.needsUpdate=true;this.caseMesh.instanceMatrix.needsUpdate=true;
  this.baseN=Math.min(this.maxTrim,this.baseN);this.crownN=Math.min(this.maxTrim,this.crownN);
 }
 dressCasing(mesh,wall,bounds){
  if(!bounds||wall.length<2)return;
  const keys=new Set(wall.map(c=>{const p=c.p||c.center;return `${p.x.toFixed(2)}/${p.y.toFixed(2)}/${p.z.toFixed(2)}`;}));
  const parts=mesh.userData.chunks||[];
  for(const cell of wall){
   const p=cell.p||cell.center,s=cell.s||cell.size,axis=thinAxis(s),along=axis==='x'?'z':'x';
   const localY=((p.y%STORY)+STORY)%STORY;
   if(localY>.82&&localY<2.35)continue;
   for(const dir of [-1,1]){
    const n=p.clone();n[along]+=dir*CELL;
    if(n[along]<bounds.min[along]-.05||n[along]>bounds.max[along]+.05)continue;
    const key=`${n.x.toFixed(2)}/${p.y.toFixed(2)}/${n.z.toFixed(2)}`;
    if(keys.has(key))continue;
    if(this.caseN>=this.maxTrim)return;
    const i=this.caseN++,edge=p.clone();edge[along]+=dir*(s[along]/2-.04);
    this.dummy.position.copy(edge);this.dummy.rotation.set(0,0,0);
    const sc=V().set(1,s.y,.09);sc[axis]=s[axis]+.03;sc[along]=.08;
    this.dummy.scale.copy(sc);this.dummy.updateMatrix();this.caseMesh.setMatrixAt(i,this.dummy.matrix);
    const part=parts.find(ch=>Math.abs(ch.p.x-p.x)<.02&&Math.abs(ch.p.y-p.y)<.02&&Math.abs(ch.p.z-p.z)<.02);
    if(part){const list=this.trimByPart.get(part)||[];list.push({mesh:this.caseMesh,i});this.trimByPart.set(part,list);}
   }
  }
 }
 stamp(hit,part,energy,dir){
  if(!part||part.index==null||part.kind==='glass')return;
  const n=(hit.face?.normal.clone().transformDirection(hit.object.matrixWorld)||dir.clone().negate());
  if(n.lengthSq()<1e-8)n.set(0,1,0);n.normalize();
  const i=this.decalSlot++%this.maxDecal;
  this.decalList=this.decalList.filter(d=>d.i!==i);
  const size=.12+Math.min(.14,Math.sqrt(Math.max(0,energy))*.02);
  this.dummy.position.copy(hit.point?.isVector3?hit.point:part.p).addScaledVector(n,.004);
  this.dummy.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),n);
  this.dummy.scale.set(size,size*(.55+.5*Math.random()),1);this.dummy.updateMatrix();
  this.decals.setMatrixAt(i,this.dummy.matrix);this.decals.instanceMatrix.needsUpdate=true;
  this.decalList.push({i,part,age:0,flash:.18});
  this.scar(part);
  this.give(part);
 }
 scar(part){
  const mesh=part.mesh;if(part.index==null||!mesh?.isInstancedMesh)return;
  this.prepMesh(mesh);
  const c=new T.Color();mesh.getColorAt(part.index,c);c.multiplyScalar(.92);mesh.setColorAt(part.index,c);mesh.instanceColor.needsUpdate=true;
 }
 give(part){
  if(part.index==null||!part.size||part.broken)return;
  const max=part.maxHealth||48,t=1-Math.max(0,part.health)/max,axis=thinAxis(part.size),s=part.size.clone();
  s[axis]=Math.max(.08,part.size[axis]-.02*t);
  this.dummy.position.copy(part.p);this.dummy.rotation.set(0,0,0);this.dummy.scale.copy(s);this.dummy.updateMatrix();
  part.mesh.setMatrixAt(part.index,this.dummy.matrix);part.mesh.instanceMatrix.needsUpdate=true;
 }
 openHole(part,hit){
  if(!part||part.holed||part.broken||part.kind!=='plaster'||part.index==null)return;
  part.holed=true;
  this.dummy.scale.setScalar(0);this.dummy.updateMatrix();part.mesh.setMatrixAt(part.index,this.dummy.matrix);part.mesh.instanceMatrix.needsUpdate=true;
  const g=new T.Group(),s=part.size,axis=thinAxis(s),along=axis==='x'?'z':'x';
  const face=s[along],h=s.y,th=s[axis],hole=.28;
  const front=this.holeMatFront,back=this.holeMatBack;
  const mk=(sx,sy,sz,x,y,z,mat)=>{const m=new T.Mesh(new T.BoxGeometry(sx,sy,sz),mat);m.position.set(x,y,z);m.castShadow=true;g.add(m);};
  const t=Math.max(.04,(face-hole)/2),b=Math.max(.04,(h-hole)/2);
  if(axis==='z'){
   mk(face,b,th,0, h/2-b/2,0,front);mk(face,b,th,0,-(h/2-b/2),0,front);
   mk(t,hole,th,-(face/2-t/2),0,0,front);mk(t,hole,th,face/2-t/2,0,0,front);
   mk(hole*.92,hole*.92,.012,0,0,-th/2+.01,back);
  }else{
   mk(th,b,face,0,h/2-b/2,0,front);mk(th,b,face,0,-(h/2-b/2),0,front);
   mk(th,hole,t,0,0,-(face/2-t/2),front);mk(th,hole,t,0,0,face/2-t/2,front);
   mk(.012,hole*.92,hole*.92,th/2-.01,0,0,back);
  }
  g.position.copy(part.p);this.world.root.add(g);this.holes.set(part,g);
  g.traverse(m=>{if(m.isMesh){m.userData.wallPart=part;this.world.pickables.push(m);}});
  playSfx('plaster');
 }
 hideTrim(part){
  const list=this.trimByPart.get(part);if(!list)return;
  this.dummy.scale.setScalar(0);this.dummy.updateMatrix();
  for(const t of list)t.mesh.setMatrixAt(t.i,this.dummy.matrix);
  this.baseMesh.instanceMatrix.needsUpdate=true;this.crownMesh.instanceMatrix.needsUpdate=true;this.caseMesh.instanceMatrix.needsUpdate=true;
 }
 neighborAlive(part){
  return this.fractures.parts.some(p=>p!==part&&!p.broken&&p.mesh===part.mesh&&p.kind===part.kind&&Math.hypot(p.p.x-part.p.x,p.p.z-part.p.z)<CELL*1.15&&Math.abs(p.p.y-part.p.y)<CELL*.7);
 }
 revealFrame(part){
  if(part.kind!=='plaster'||part.frame||part.framed)return;
  part.framed=true;
  const s=part.size,axis=thinAxis(s),along=axis==='x'?'z':'x';
  if(!isWallCell(s))return;
  const studW=.055,studD=.10,h=s.y,len=s[along];
  const wood=new T.MeshStandardMaterial({map:makeSurfaceMap('Wood'),color:0xffffff,roughness:.84});
  const members=[];
  const place=(sx,sy,sz,ox,oy,oz)=>{
   const mesh=new T.Mesh(new T.BoxGeometry(sx,sy,sz),wood);
   mesh.position.set(part.p.x+ox,part.p.y+oy,part.p.z+oz);
   mesh.castShadow=mesh.receiveShadow=true;mesh.name='Wall stud';
   this.world.root.add(mesh);
   const o=this.world.obstacle(mesh.position.x,mesh.position.z,Math.max(.07,sx),Math.max(.07,sz),mesh.position.y-sy/2,sy,mesh);
   const piece=this.fractures.register(mesh,'wood',o);
   if(piece){piece.frame=true;piece.shell=part;piece.health=28;piece.maxHealth=28;}
   mesh.userData.piece=piece;mesh.userData.wallPart=piece;
   members.push(piece);
   return mesh;
  };
  const plate=(oy)=>axis==='x'?place(studW,.05,len*.96,0,oy,0):place(len*.96,.05,studW,0,oy,0);
  plate(h/2-.03);plate(-(h/2-.03));
  for(const off of [-len*.33,0,len*.33]){
   if(axis==='x')place(studW,h*.86,studD,0,0,off);
   else place(studD,h*.86,studW,off,0,0);
  }
  part.frameMembers=members;
 }

 puff(part,dir,energy){
  const n=Math.min(this.maxDust,12);
  for(let k=0;k<n;k++){
   const i=k%this.maxDust;
   const vel=dir.clone().multiplyScalar(.4+Math.random()*.8).add(new T.Vector3((Math.random()-.5)*1.2,.5+Math.random()*.8,(Math.random()-.5)*1.2));
   this.dust[i]={i,p:part.p.clone().add(new T.Vector3((Math.random()-.5)*sRand(part),.1,(Math.random()-.5)*sRand(part))),v:vel,age:0};
  }
 }
 shatter(part,dir,energy){
  const hole=this.holes.get(part);
  if(hole){
   hole.traverse(m=>{if(m.isMesh)m.visible=false;});
   hole.removeFromParent();
   if(this.world.pickables)this.world.pickables=this.world.pickables.filter(o=>{
    let p=o;while(p){if(p===hole)return false;p=p.parent;}
    return o!==hole;
   });
   this.holes.delete(part);
  }
  this.hideTrim(part);
  if(part.kind==='plaster')this.revealFrame(part);
  if(part.frame&&part.mesh){
   part.mesh.visible=false;
   part.mesh.removeFromParent();
   if(this.world.pickables)this.world.pickables=this.world.pickables.filter(o=>o!==part.mesh);
  }
  this.puff(part,dir,energy);
 }
 tick(dt){
  for(const d of this.decalList){d.age+=dt;d.flash=Math.max(0,d.flash-dt*5);}
  if(this.decalMat.uniforms)this.decalMat.uniforms.flash.value=this.decalList.reduce((m,d)=>Math.max(m,d.flash),0);
  for(const d of this.dust){
   if(!d)continue;d.age+=dt;d.v.y-=2.4*dt;d.p.addScaledVector(d.v,dt);
   this.dummy.position.copy(d.p);this.dummy.lookAt(d.p.x,d.p.y+1,d.p.z);this.dummy.scale.setScalar(Math.max(0,1-d.age/.38));this.dummy.updateMatrix();
   this.dustMesh.setMatrixAt(d.i,this.dummy.matrix);this.dustMesh.material.opacity=Math.max(0,.7*(1-d.age/.38));
  }
  this.dust=this.dust.filter(d=>d&&d.age<.38);
  if(!this.dust.length)this.hideInst(this.dustMesh,this.maxDust);else this.dustMesh.instanceMatrix.needsUpdate=true;
 }
}

function sRand(part){return Math.max(part.size?.x||.2,part.size?.z||.2)*.4;}
