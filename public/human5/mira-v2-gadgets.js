import * as T from 'three';
import {playSfx,unlockSfx} from './mira-v2-sfx.js?v=13.8';
const V=()=>new T.Vector3(),Q=()=>new T.Quaternion(),M=()=>new T.Matrix4();
const QUEST=/Quest|OculusBrowser/i.test(globalThis.navigator?.userAgent||'');
export const GUNS=['pistol','laser','rifle','sniper','shotgun','uzi','marker','marker2','portal'];
export const MELEE=['sword','axe','mace'];
const PORTAL_COLORS=[0x3aa0ff,0xff9a32];
const PORTAL_W=1.18,PORTAL_H=2.22,PORTAL_T=.05;
const dummy=new T.Object3D();
const portalVert=`varying vec4 vProj;uniform mat4 portalMatrix;
void main(){vec4 world=modelMatrix*vec4(position,1.0);vProj=portalMatrix*world;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const portalFrag=`varying vec4 vProj;uniform sampler2D map;uniform vec3 col;uniform float hasPair;
void main(){
 if(hasPair<.5){gl_FragColor=vec4(col*.10,1.0);return;}
 vec2 uv=vProj.xy/max(vProj.w,1e-4)*.5+.5;
 if(uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0){gl_FragColor=vec4(col*.07,1.0);return;}
 gl_FragColor=texture2D(map,uv);
}`;

function gVal(world){const g=world?.gravity;return Number.isFinite(g)?g:9.81;}

const splatVert=`varying vec2 u;varying float vWet;varying vec3 vCol;attribute float aWet;
void main(){u=uv;vWet=aWet;vCol=instanceColor;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`;
const splatFrag=`varying vec2 u;varying float vWet;varying vec3 vCol;
void main(){
 vec2 p=(u-.5)*2.0;
 float n=sin(p.x*9.4+p.y*7.1)*sin(p.x*13.0-p.y*11.2)*.12;
 float e=length(p*vec2(1.0,.78))+n;
 float edge=1.0-smoothstep(.42,.98,e);
 float holes=smoothstep(.16,.22,abs(sin(p.x*17.0+p.y*13.0)))*.12;
 float alpha=max(0.0,edge-holes);
 if(alpha<.04)discard;
 float rim=smoothstep(.55,.95,e);
 vec3 c=vCol*(.55+.45*vWet);
 c=mix(c,c*1.25+vec3(.18,.18,.16)*vWet,rim*vWet);
 float spec=pow(max(0.0,1.0-e),6.0)*vWet*.55;
 gl_FragColor=vec4(c+spec,alpha*mix(.72,.96,vWet));
}`;

export function installGadgets(props){
 const g=new Gadgets(props);
 props.gadgets=g;
 props.world.portalOpen=p=>g.coversPortal(p);
 g.rebuildRack();
 return g;
}

class Gadgets {
 constructor(props){
  this.props=props;this.world=props.world;this.scene=props.scene;
  this.paintColor=null;this.balls=[];this.splats=[];this.portals=[null,null];
  this.prevCam=V();this.camReady=false;this.cool=0;this.rack=null;this.pegs=[];
  this.CAP=QUEST?140:240;
  const geom=new T.PlaneGeometry(1,1,1,1);
  this.wet=new T.InstancedBufferAttribute(new Float32Array(this.CAP),1);
  geom.setAttribute('aWet',this.wet);
  this.splatMat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-6,
   vertexShader:splatVert,fragmentShader:splatFrag});
  this.splatMesh=new T.InstancedMesh(geom,this.splatMat,this.CAP);
  this.splatMesh.frustumCulled=false;this.splatMesh.renderOrder=6;this.splatMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  this.scene.add(this.splatMesh);
  this.splatMesh.setColorAt(0,new T.Color(1,1,1));
  dummy.scale.setScalar(0);dummy.updateMatrix();
  for(let i=0;i<this.CAP;i++){this.splatMesh.setMatrixAt(i,dummy.matrix);this.splats.push({live:false,parent:null,local:V(),localN:V(),color:new T.Color(),r:0,wet:0,age:0,seed:0});}
  this.ballPool=[];
  const ballMat=new T.MeshStandardMaterial({roughness:.35,metalness:.05});
  for(let i=0;i<24;i++){
   const m=new T.Mesh(new T.SphereGeometry(.017,10,8),ballMat.clone());
   m.castShadow=true;m.visible=false;this.scene.add(m);
   this.ballPool.push({mesh:m,live:false,vel:V(),age:0,color:0x2aa0e8});
  }
  const rtW=QUEST?384:768,rtH=QUEST?704:1408;
  this.portalRT=[0,1].map(()=>new T.WebGLRenderTarget(rtW,rtH,{minFilter:T.LinearFilter,magFilter:T.LinearFilter,generateMipmaps:false,depthBuffer:true}));
  this.vcam=new T.PerspectiveCamera();this.vcam.matrixAutoUpdate=false;
  this.portalFlip=new T.Matrix4().makeRotationY(Math.PI);
  this._m1=new T.Matrix4();this._plane=new T.Vector4();this._q4=new T.Vector4();
  this._rendering=false;
 }

 gravity(){return gVal(this.world);}
 zeroG(){return this.gravity()<0.5;}
 setZeroG(on){
  const world=this.world,was=this.zeroG();
  world.gravity=on?0:9.81;
  if(on&&!was){
   for(const group of world.movables||[]){
    const f=group.userData?.furniture;if(!f||f.held!=null)continue;
    f.velocity??=V();f.velocity.y+=.12+Math.random()*.28;f.velocity.x+=(Math.random()-.5)*.08;f.velocity.z+=(Math.random()-.5)*.08;
   }
   for(const item of this.props.items)if(item.holder==null){item.velocity.y+=.18+Math.random()*.2;item.velocity.x+=(Math.random()-.5)*.05;item.velocity.z+=(Math.random()-.5)*.05;}
  }
  this.props.status=on?'Zero gravity':'Gravity restored';
  return on;
 }
 toggleZeroG(){return this.setZeroG(!this.zeroG());}
}

export function buildMarker(id,add){
 const paint=id==='marker2'?0xc43b3b:0x2aa0e8;
 const body=new T.MeshStandardMaterial({color:0x1c1e22,roughness:.55,metalness:.25});
 const accent=new T.MeshStandardMaterial({color:0x2a2d33,roughness:.4,metalness:.35});
 const hopper=new T.MeshStandardMaterial({color:paint,roughness:.35,metalness:.08});
 const barrel=new T.MeshStandardMaterial({color:0x6a7076,roughness:.32,metalness:.65});
 add(new T.BoxGeometry(.038,.072,.16),new T.MeshStandardMaterial({color:0x2b241e,roughness:.92}),0,-.028,.01);
 add(new T.BoxGeometry(.046,.055,.22),body,0,.018,-.04);
 add(new T.BoxGeometry(.05,.018,.20),accent,0,.048,-.05);
 const tube=add(new T.CylinderGeometry(.013,.015,.28,10),barrel,0,.02,-.28);tube.rotation.x=Math.PI/2;
 const shroud=add(new T.CylinderGeometry(.018,.018,.16,8),accent,0,.02,-.22);shroud.rotation.x=Math.PI/2;
 const hop=add(new T.SphereGeometry(.055,12,10),hopper,0,.10,-.02);hop.scale.y=1.15;
 add(new T.CylinderGeometry(.018,.022,.04,8),hopper,0,.055,-.02);
 const tank=add(new T.CylinderGeometry(.022,.022,.14,10),barrel,0,.01,.12);tank.rotation.x=Math.PI/2;
 add(new T.TorusGeometry(.028,.005,6,12),accent,0,-.042,-.01).rotation.y=Math.PI/2;
 add(new T.BoxGeometry(.01,.028,.016),accent,0,-.012,-.04);
 add(new T.BoxGeometry(.012,.01,.04),new T.MeshBasicMaterial({color:paint}),0,.058,-.12);
}

export function buildPortalGun(add){
 const shell=new T.MeshStandardMaterial({color:0xe8e4dc,roughness:.38,metalness:.12});
 const dark=new T.MeshStandardMaterial({color:0x1a1c1e,roughness:.5,metalness:.3});
 add(new T.BoxGeometry(.04,.07,.14),new T.MeshStandardMaterial({color:0x2a2622,roughness:.9}),0,-.03,.02);
 add(new T.BoxGeometry(.07,.07,.22),shell,0,.03,-.04);
 add(new T.SphereGeometry(.055,12,10),shell,.0,.04,-.02).scale.set(1.15,.85,1.4);
 const b1=add(new T.CylinderGeometry(.02,.024,.16,12),dark,-.018,.04,-.22);b1.rotation.x=Math.PI/2;
 const b2=add(new T.CylinderGeometry(.02,.024,.16,12),dark,.018,.04,-.22);b2.rotation.x=Math.PI/2;
 add(new T.TorusGeometry(.022,.006,6,14),new T.MeshBasicMaterial({color:PORTAL_COLORS[0]}),-.018,.04,-.30).rotation.x=Math.PI/2;
 add(new T.TorusGeometry(.022,.006,6,14),new T.MeshBasicMaterial({color:PORTAL_COLORS[1]}),.018,.04,-.30).rotation.x=Math.PI/2;
 add(new T.BoxGeometry(.08,.012,.08),dark,0,.075,-.02);
};

Gadgets.prototype.buildMarker=buildMarker;
Gadgets.prototype.buildPortalGun=buildPortalGun;
Gadgets.prototype.decorate=function(item){
 const id=item.id;
 if(id!=='marker'&&id!=='marker2'&&id!=='portal')return item;
 item.handle.set(0,-.05,.02);
 return item;
};

Gadgets.prototype.slotPose=function(i){
 const cols=5,row=Math.floor(i/cols),col=i%cols,x=0.255,y=1.46-row*.36,z0=-1.12,span=1.7;
 const z=z0+(cols<=1?0:col/(cols-1)*span);
 return {x,y,z,yaw:Math.PI/2};
};

Gadgets.prototype.rebuildRack=function(){
 if(this.rack){this.rack.removeFromParent();this.rack.traverse(o=>{o.geometry?.dispose?.();if(o.material&&!o.material.map)o.material.dispose?.();});this.rack=null;}
 this.pegs=[];
 if(this.world.name!=='Living room')return;
 const board=new T.Group();board.name='GunRack';
 const wood=new T.MeshStandardMaterial({color:0x6a4e38,roughness:.86});
 const peg=new T.MeshStandardMaterial({color:0x3d3228,roughness:.7});
 const plate=new T.Mesh(new T.BoxGeometry(.04,1.22,1.96),wood);plate.position.set(.33,1.22,-.28);plate.castShadow=plate.receiveShadow=true;board.add(plate);
 const rail=new T.Mesh(new T.BoxGeometry(.05,.06,1.96),peg);rail.position.set(.31,1.72,-.28);board.add(rail);
 const rail2=rail.clone();rail2.position.y=1.22;board.add(rail2);
 const rail3=rail.clone();rail3.position.y=.78;board.add(rail3);
 GUNS.forEach((_,i)=>{
  const s=this.slotPose(i);
  const p=new T.Mesh(new T.CylinderGeometry(.012,.012,.07,8),peg);
  p.rotation.z=Math.PI/2;p.position.set(s.x+.04,s.y-.02,s.z);board.add(p);this.pegs.push(p);
 });
 this.world.root.add(board);this.rack=board;
 const box=new T.Box3().setFromObject(board),c=box.getCenter(V()),sz=box.getSize(V());
 this.world.obstacle(c.x,c.z,sz.x,sz.z,box.min.y,sz.y,board);
 this.restock();
};

Gadgets.prototype.hang=function(item){
 const i=GUNS.indexOf(item.id);if(i<0)return;
 const s=this.slotPose(i);
 item.group.position.set(s.x,s.y,s.z);
 item.group.rotation.set(0,s.yaw,0);
 item.velocity.set(0,0,0);
 item.group.updateMatrixWorld(true);
};

Gadgets.prototype.restock=function(id){
 const ids=id?[id]:GUNS;
 for(const gun of ids){
  let item=this.props.items.find(x=>x.id===gun);
  if(!item){item=this.props.make(gun);this.props.items.push(item);}
  if(item.holder!=null)continue;
  if(this.world.name==='Living room')this.hang(item);
 }
 this.props.status='Guns on the wall rack';
 return this.props.items.filter(x=>ids.includes(x.id));
};

Gadgets.prototype.spawn=function(id){
 if(!GUNS.includes(id)&&!MELEE.includes(id))id='marker';
 let item=this.props.items.find(x=>x.id===id);
 if(!item){item=this.props.make(id);this.props.items.push(item);}
 if(item.holder==null){
  if(GUNS.includes(id)&&this.world.name==='Living room')this.hang(item);
  else{
   const cam=this.props.camera,p=cam.getWorldPosition(V()),d=cam.getWorldDirection(V());
   item.group.position.copy(p).addScaledVector(d,.55).setY(Math.max(.2,p.y-.2));
   item.velocity.set(0,0,0);
  }
 }
 return item;
};

Gadgets.prototype.colorOf=function(item){
 if(this.paintColor)return this.paintColor;
 return item?.data?.color||0x2aa0e8;
};

Gadgets.prototype.shootPaint=function(item,aim){
 if(this.props.time-(item.lastFire??-2)<.11)return;
 item.lastFire=this.props.time;item.kick=Math.min(.14,(item.kick||0)+.06);
 unlockSfx();playSfx('paint');
 const muzzle=item.group.localToWorld(new T.Vector3(0,.02,-.42));
 const dir=aim?(this.props.hit(aim,35)?.point||aim.at(12,V())).clone().sub(muzzle).normalize():new T.Vector3(0,0,-1).applyQuaternion(item.group.getWorldQuaternion(Q()));
 const slot=this.ballPool.find(b=>!b.live)||this.ballPool[0];
 slot.live=true;slot.age=0;slot.color=this.colorOf(item);
 slot.mesh.visible=true;slot.mesh.position.copy(muzzle);
 slot.mesh.material.color.setHex(slot.color);
 slot.vel.copy(dir).multiplyScalar(22+(Math.random()-.5)*1.4);
 slot.vel.x+=(Math.random()-.5)*.35;slot.vel.y+=(Math.random()-.5)*.25;
 this.props.beam(muzzle,muzzle.clone().addScaledVector(dir,.18),slot.color,.05);
 if(typeof item.holder==='number')this.props.system.hands.haptics?.contact(item.holder,'prop',.85,.005);
};

Gadgets.prototype.shootPortal=function(item,aim){
 if(this.props.time-(item.lastFire??-2)<.28)return;
 item.lastFire=this.props.time;item.kick=Math.min(.1,(item.kick||0)+.04);
 unlockSfx();playSfx('portal');
 const muzzle=item.group.localToWorld(new T.Vector3(0,.04,-.32));
 const dir=aim?(this.props.hit(aim,28,false)?.point||aim.at(10,V())).clone().sub(muzzle).normalize():new T.Vector3(0,0,-1).applyQuaternion(item.group.getWorldQuaternion(Q()));
 const ray=new T.Ray(muzzle,dir),hit=this.props.hit(ray,28,false);
 const idx=item.portalNext||0;item.portalNext=1-idx;
 const col=PORTAL_COLORS[idx];
 this.props.beam(muzzle,hit?.point||ray.at(12,V()),col,.12);
 if(!hit||this.props.actorFor(hit.object)||this.props.dogFor(hit.object)) {this.props.status='Portal needs a surface';return;}
 const n=(hit.face?.normal.clone().transformDirection(hit.object.matrixWorld)||new T.Vector3(0,1,0));
 if(n.lengthSq()<1e-8)n.set(0,1,0);n.normalize();
 if(hit.object.userData?.portal) {this.props.status='Cannot place on a portal';return;}
 this.placePortal(idx,hit.point,n,hit.object);
 if(typeof item.holder==='number')this.props.system.hands.haptics?.contact(item.holder,'prop',1,.006);
};

Gadgets.prototype.orientPortal=function(normal){
 const z=normal.clone().normalize();
 const y=new T.Vector3(0,1,0);
 if(Math.abs(z.dot(y))>.92)y.set(0,0,-Math.sign(z.y)||-1);
 y.addScaledVector(z,-y.dot(z)).normalize();
 const x=new T.Vector3().crossVectors(y,z).normalize();
 y.crossVectors(z,x).normalize();
 return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));
};

Gadgets.prototype.placePortal=function(idx,point,normal,object){
 this.clearPortal(idx);
 const n=normal.clone();if(n.lengthSq()<1e-8)n.set(0,1,0);n.normalize();
 const pos=point.clone().addScaledVector(n,.04);
 if(Math.abs(n.y)<.35){
  const floor=Number(this.world.floorHeight?.(pos,.85))||0;
  pos.y=floor+PORTAL_H*.5+.02;
 }
 const color=PORTAL_COLORS[idx],group=new T.Group();
 const W=PORTAL_W,H=PORTAL_H,T=PORTAL_T,D=.042,innerW=W-2*T,innerH=H-2*T;
 const frame=new T.MeshStandardMaterial({color,roughness:.32,metalness:.18,emissive:color,emissiveIntensity:.7});
 const bar=(w,h,x,y)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,D),frame);m.position.set(x,y,-D*.28);m.castShadow=true;group.add(m);return m;};
 bar(W,T,0,H/2-T/2);bar(W,T,0,-H/2+T/2);bar(T,H-2*T,-W/2+T/2,0);bar(T,H-2*T,W/2-T/2,0);
 const inner=new T.Mesh(new T.PlaneGeometry(innerW,innerH),new T.ShaderMaterial({
  toneMapped:false,side:T.FrontSide,depthWrite:true,
  uniforms:{map:{value:this.portalRT[idx].texture},col:{value:new T.Color(color)},hasPair:{value:0},portalMatrix:{value:new T.Matrix4()}},
  vertexShader:portalVert,fragmentShader:portalFrag
 }));
 inner.position.z=.002;group.add(inner);
 const q=this.orientPortal(n);
 group.quaternion.copy(q);group.position.copy(pos);
 const parent=object.isInstancedMesh?this.world.root:object;
 parent.updateWorldMatrix(true,false);
 const local=parent.worldToLocal(group.position.clone());
 parent.add(group);group.position.copy(local);
 group.quaternion.copy(parent.getWorldQuaternion(Q()).invert().premultiply(q));
 group.userData.portal=true;group.traverse(m=>{m.userData.portal=true;});
 this.portals[idx]={group,inner,idx,parent,hw:innerW/2,hh:innerH/2};
 this.props.status=(idx?'Orange':'Blue')+' portal placed';
};

Gadgets.prototype.clearPortal=function(idx){
 const p=this.portals[idx];if(!p)return;
 p.group.removeFromParent();p.group.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.();});
 this.portals[idx]=null;
};
Gadgets.prototype.clearPortals=function(){this.clearPortal(0);this.clearPortal(1);this.props.status='Portals cleared';};

Gadgets.prototype.portalWorld=function(p){
 if(!p?.group)return null;
 p.group.updateWorldMatrix(true,false);
 const point=p.group.getWorldPosition(V());
 const normal=new T.Vector3(0,0,1).applyQuaternion(p.group.getWorldQuaternion(Q())).normalize();
 return {point,normal,hw:p.hw,hh:p.hh,group:p.group,idx:p.idx};
};

Gadgets.prototype.coversPortal=function(point){
 if(!point)return false;
 for(const p of this.portals){
  if(!p?.group)continue;
  p.group.updateWorldMatrix(true,false);
  const local=p.group.worldToLocal(point.clone());
  if(Math.abs(local.x)<p.hw&&Math.abs(local.y)<p.hh&&Math.abs(local.z)<.38)return true;
 }
 return false;
};

Gadgets.prototype.tryCross=function(pos,prev,vel){
 const A=this.portals[0],B=this.portals[1];
 if(!A||!B||this.cool>0)return null;
 for(const [fromP,toP] of [[A,B],[B,A]]){
  const from=this.portalWorld(fromP),to=this.portalWorld(toP);if(!from||!to)continue;
  const d0=prev.clone().sub(from.point).dot(from.normal),d1=pos.clone().sub(from.point).dot(from.normal);
  if(d0*d1>0)continue;
  const t=d0===d1?0:d0/(d0-d1),mid=prev.clone().lerp(pos,t);
  const local=from.group.worldToLocal(mid.clone());
  if(Math.abs(local.x)>from.hw||Math.abs(local.y)>from.hh)continue;
  const q=new T.Quaternion().setFromUnitVectors(from.normal.clone().negate(),to.normal);
  const rel=pos.clone().sub(from.point).applyQuaternion(q);
  const out=to.point.clone().add(rel).addScaledVector(to.normal,.12);
  if(vel)vel.applyQuaternion(q);
  this.cool=.18;
  return {pos:out,q,from,to};
 }
 return null;
};

Gadgets.prototype.teleportPlayer=function(mapped){
 const rig=this.props.rig,cam=this.props.camera;
 if(!rig||!cam)return;
 const eye=cam.getWorldPosition(V());
 const delta=mapped.pos.clone().sub(eye);
 rig.position.add(delta);
 const e=new T.Euler().setFromQuaternion(mapped.q,'YXZ');
 rig.rotation.y+=e.y;
 rig.updateWorldMatrix(true,true);
 this.prevCam.copy(mapped.pos);
 this.camReady=true;
};

Gadgets.prototype.allocSplat=function(){
 let s=this.splats.find(x=>!x.live);
 if(!s){s=this.splats.reduce((a,b)=>a.age>b.age?a:b);s.live=false;}
 return s;
};

Gadgets.prototype.splat=function(point,normal,object,color,scale=1){
 if(!object||object.userData?.portal)return;
 const n=normal.clone();if(n.lengthSq()<1e-8)n.set(0,1,0);n.normalize();
 const parent=object.isInstancedMesh?this.world.root:object;
 parent.updateWorldMatrix(true,false);
 const inv=parent.matrixWorld.clone().invert();
 const s=this.allocSplat();
 s.live=true;s.parent=parent;s.age=0;s.wet=1;s.r=(.07+Math.random()*.05)*scale;s.seed=Math.random()*6.28;
 s.color.setHex(color);
 s.local.copy(point).applyMatrix4(inv);
 s.localN.copy(n).transformDirection(inv).normalize();
};

Gadgets.prototype.impactPaint=function(hit,color){
 const n=(hit.face?.normal.clone().transformDirection(hit.object.matrixWorld)||new T.Vector3(0,1,0));
 if(n.lengthSq()<1e-8)n.set(0,1,0);n.normalize();
 const actor=this.props.actorFor?.(hit.object),dog=this.props.dogFor?.(hit.object);
 const bone=actor?.nearestHit?.(hit.point,.22)?.bone||dog?.nearestHit?.(hit.point,.28)?.bone;
 const target=bone||hit.object;
 this.splat(hit.point,n,target,color,1.15);
 const tan=new T.Vector3(1,0,0).cross(n);if(tan.lengthSq()<1e-6)tan.set(0,0,1).cross(n);tan.normalize();
 const bit=new T.Vector3().crossVectors(n,tan);
 for(let i=0;i<6;i++){
  const o=tan.clone().multiplyScalar((Math.random()-.5)*.16).addScaledVector(bit,(Math.random()-.5)*.16);
  this.splat(hit.point.clone().add(o).addScaledVector(n,.001),n,target,color,.45+Math.random()*.4);
 }
 playSfx('splat');
 this.props.status='Paint coverage';
};

Gadgets.prototype.writeSplats=function(){
 const up=new T.Vector3(0,1,0),g=this.gravity();
 for(let i=0;i<this.CAP;i++){
  const s=this.splats[i];
  if(!s.live||!s.parent?.parent){dummy.scale.setScalar(0);dummy.updateMatrix();this.splatMesh.setMatrixAt(i,dummy.matrix);this.wet.setX(i,0);continue;}
  s.parent.updateWorldMatrix(true,false);
  const p=s.local.clone().applyMatrix4(s.parent.matrixWorld);
  const n=s.localN.clone().transformDirection(s.parent.matrixWorld).normalize();
  dummy.position.copy(p).addScaledVector(n,.0024);
  dummy.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),n);
  dummy.scale.set(s.r*2.05,s.r*1.7,1);
  dummy.updateMatrix();
  this.splatMesh.setMatrixAt(i,dummy.matrix);
  this.splatMesh.setColorAt(i,s.color);
  this.wet.setX(i,s.wet);
  if(s.wet>.12&&g>0.5&&Math.abs(n.dot(up))<.82){
   const down=up.clone().multiplyScalar(-1).addScaledVector(n,n.dot(up));
   if(down.lengthSq()>1e-6){
    down.normalize();
    const world=p.clone().addScaledVector(down,0.018*s.wet);
    s.local.copy(world).applyMatrix4(s.parent.matrixWorld.clone().invert());
   }
  }
 }
 this.splatMesh.instanceMatrix.needsUpdate=true;
 if(this.splatMesh.instanceColor)this.splatMesh.instanceColor.needsUpdate=true;
 this.wet.needsUpdate=true;
};

Gadgets.prototype.clearPaint=function(){
 for(const s of this.splats)s.live=false;
 this.writeSplats();
 this.props.status='Paint cleared';
};

Gadgets.prototype.tickBalls=function(dt){
 const g=this.gravity();
 for(const b of this.ballPool){
  if(!b.live)continue;
  b.age+=dt;b.vel.y-=g*dt;
  const prev=b.mesh.position.clone();
  const next=prev.clone().addScaledVector(b.vel,dt);
  const mapped=this.tryCross(next,prev,b.vel);
  if(mapped){b.mesh.position.copy(mapped.pos);continue;}
  const dist=next.distanceTo(prev),ray=new T.Ray(prev,b.vel.clone().normalize());
  const hit=dist>1e-5?this.props.hit(ray,dist+.01,false):null;
  if(hit&&this.coversPortal(hit.point)){b.mesh.position.copy(next);continue;}
  if(hit){this.impactPaint(hit,b.color);b.live=false;b.mesh.visible=false;continue;}
  b.mesh.position.copy(next);
  if(b.age>2.4||b.mesh.position.y<-4){b.live=false;b.mesh.visible=false;}
 }
};

Gadgets.prototype.applyOblique=function(cam,to){
 const n=new T.Vector3(0,0,1).applyQuaternion(to.group.getWorldQuaternion(Q())).normalize();
 const p=to.group.getWorldPosition(V());
 const nCam=n.clone().transformDirection(cam.matrixWorldInverse),pCam=p.clone().applyMatrix4(cam.matrixWorldInverse);
 const clip=this._plane.set(nCam.x,nCam.y,nCam.z,-nCam.dot(pCam));
 if(clip.w>0)clip.multiplyScalar(-1);
 const m=cam.projectionMatrix.elements;if(Math.abs(m[14])<1e-8)return;
 const q=this._q4;
 q.x=(Math.sign(clip.x)+m[8])/m[0];q.y=(Math.sign(clip.y)+m[9])/m[5];q.z=-1;q.w=(1+m[10])/m[14];
 const s=2/clip.dot(q);m[2]=clip.x*s;m[6]=clip.y*s;m[10]=clip.z*s+1;m[14]=clip.w*s;
};

Gadgets.prototype.renderOne=function(renderer,mainCam,from,to,camPos){
 from.group.updateWorldMatrix(true,false);to.group.updateWorldMatrix(true,false);
 const fromN=new T.Vector3(0,0,1).applyQuaternion(from.group.getWorldQuaternion(Q()));
 const fromP=from.group.getWorldPosition(V());
 const u=from.inner.material.uniforms;
 if(camPos.clone().sub(fromP).dot(fromN)<.02){u.hasPair.value=0;return;}
 const cam=this.vcam;
 cam.projectionMatrix.copy(mainCam.projectionMatrix);
 this._m1.copy(from.group.matrixWorld).invert();
 cam.matrixWorld.copy(to.group.matrixWorld).multiply(this.portalFlip).multiply(this._m1).multiply(mainCam.matrixWorld);
 cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
 this.applyOblique(cam,to);
 renderer.setRenderTarget(this.portalRT[from.idx]);renderer.clear();renderer.render(this.scene,cam);
 u.map.value=this.portalRT[from.idx].texture;u.hasPair.value=1;
 u.portalMatrix.value.multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse);
};

Gadgets.prototype.renderViews=function(renderer,mainCam){
 if(this._rendering||!this.world.root.visible)return;
 const a=this.portals[0],b=this.portals[1];
 if(!a||!b){for(const p of this.portals)if(p?.inner?.material?.uniforms)p.inner.material.uniforms.hasPair.value=0;return;}
 const camPos=mainCam.getWorldPosition(V());
 const near=a.group.getWorldPosition(V()).distanceTo(camPos)<22||b.group.getWorldPosition(V()).distanceTo(camPos)<22;
 if(!near){for(const p of this.portals)if(p?.inner?.material?.uniforms)p.inner.material.uniforms.hasPair.value=0;return;}
 this._portalFrame=(this._portalFrame||0)+1;
 if(QUEST&&(this._portalFrame&1))return;
 this._rendering=true;
 const xr=renderer.xr.enabled,shadows=renderer.shadowMap.enabled,prev=renderer.getRenderTarget();
 renderer.xr.enabled=false;renderer.shadowMap.enabled=false;
 a.group.visible=false;b.group.visible=false;
 this.renderOne(renderer,mainCam,a,b,camPos);
 this.renderOne(renderer,mainCam,b,a,camPos);
 a.group.visible=true;b.group.visible=true;
 renderer.shadowMap.enabled=shadows;renderer.xr.enabled=xr;renderer.setRenderTarget(prev);
 this._rendering=false;
};

Gadgets.prototype.tickPortals=function(dt){
 this.cool=Math.max(0,this.cool-dt);
 const cam=this.props.camera.getWorldPosition(V());
 if(this.camReady){
  const mapped=this.tryCross(cam,this.prevCam,null);
  if(mapped)this.teleportPlayer(mapped);
 }
 this.prevCam.copy(cam);this.camReady=true;
 for(const group of this.world.movables||[]){
  const f=group.userData?.furniture;if(!f||f.held!=null)continue;
  const p=group.getWorldPosition(V());
  f.prevWorld??=p.clone();
  const mapped=this.tryCross(p,f.prevWorld,f.velocity);
  if(mapped){
   const parent=group.parent;
   group.position.copy(parent?.worldToLocal(mapped.pos.clone())||mapped.pos);
   group.quaternion.premultiply(mapped.q);
  }
  f.prevWorld.copy(group.getWorldPosition(V()));
 }
 for(const item of this.props.items){
  if(item.holder!=null)continue;
  const p=item.group.getWorldPosition(V());
  item.prevWorld??=p.clone();
  const mapped=this.tryCross(p,item.prevWorld,item.velocity);
  if(mapped){item.group.position.copy(mapped.pos);item.group.quaternion.premultiply(mapped.q);}
  item.prevWorld.copy(item.group.getWorldPosition(V()));
 }
 const balls=this.props.system?.balls||[];
 for(const b of balls){
  if(!b?.mesh||b.held)continue;
  const p=b.mesh.position,prev=b.prevWorld||p.clone();
  const mapped=this.tryCross(p,prev,b.vel);
  if(mapped)b.mesh.position.copy(mapped.pos);
  b.prevWorld=p.clone();
 }
 for(const d of this.props.dogs?.list?.()||[]){
  const p=d.root.getWorldPosition(V());
  d.prevWorld??=p.clone();
  const mapped=this.tryCross(p,d.prevWorld,null);
  if(mapped){
   const parent=d.root.parent;
   d.root.position.copy(parent?.worldToLocal(mapped.pos.clone())||mapped.pos);
   d.root.rotation.y+=new T.Euler().setFromQuaternion(mapped.q,'YXZ').y;
  }
  d.prevWorld.copy(d.root.getWorldPosition(V()));
 }
};

Gadgets.prototype.tickSplats=function(dt){
 let live=0,wet=false;
 for(const s of this.splats){
  if(!s.live)continue;live++;
  s.age+=dt;s.wet=Math.max(0,s.wet-dt*.22);
  if(s.wet>0){wet=true;s.r=Math.min(.22,s.r+dt*.055*s.wet);}
  if(s.age>90)s.live=false;
 }
 if(live>1){
  for(let i=0;i<this.splats.length;i++){
   const a=this.splats[i];if(!a.live)continue;
   for(let j=i+1;j<this.splats.length;j++){
    const b=this.splats[j];if(!b.live||a.parent!==b.parent)continue;
    if(a.color.getHex()!==b.color.getHex())continue;
    if(a.local.distanceTo(b.local)<(a.r+b.r)*.55){
     if(a.r>=b.r){a.r=Math.min(.24,a.r+.012);b.live=false;}
     else{b.r=Math.min(.24,b.r+.012);a.live=false;break;}
    }
   }
  }
 }
 if(live||wet||this._splatDirty){this.writeSplats();this._splatDirty=!!live;}
};

Gadgets.prototype.tick=function(dt){
 this.splatMesh.visible=this.world.root.visible;
 if(!this.world.root.visible)return;
 this.tickBalls(dt);
 this.tickPortals(dt);
 this.tickSplats(dt);
};

Gadgets.prototype.dispose=function(){
 this.clearPaint();this.clearPortals();
 for(const rt of this.portalRT||[])rt.dispose();
 if(this.rack)this.rack.removeFromParent();
 this.splatMesh.removeFromParent();this.splatMesh.dispose();
 for(const b of this.ballPool){b.mesh.removeFromParent();b.mesh.geometry.dispose();b.mesh.material.dispose();}
};
