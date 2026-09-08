import * as T from 'three';
import {playSfx,unlockSfx} from './mira-v2-sfx.js?v=13.6';
const V=()=>new T.Vector3(),Q=()=>new T.Quaternion(),M=()=>new T.Matrix4();
const QUEST=/Quest|OculusBrowser/i.test(globalThis.navigator?.userAgent||'');
export const GUNS=['pistol','laser','marker','marker2','portal'];
export const MELEE=['sword','axe','mace'];
const PORTAL_COLORS=[0x3aa0ff,0xff9a32];
const dummy=new T.Object3D();

function gVal(world){const g=world?.gravity;return Number.isFinite(g)?g:9.81;}

const splatVert=`varying vec2 u;varying float vWet;varying vec3 vCol;attribute float aWet;attribute vec3 instanceColor;
void main(){u=uv;vWet=aWet;vCol=instanceColor;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
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
 const n=GUNS.length,x=0.255,y=1.22,z0=-1.05,span=1.52;
 const z=z0+(n<=1?0:i/(n-1)*span);
 return {x,y,z,yaw:Math.PI/2};
};

Gadgets.prototype.rebuildRack=function(){
 if(this.rack){this.rack.removeFromParent();this.rack.traverse(o=>{o.geometry?.dispose?.();if(o.material&&!o.material.map)o.material.dispose?.();});this.rack=null;}
 this.pegs=[];
 if(this.world.name!=='Living room')return;
 const board=new T.Group();board.name='GunRack';
 const wood=new T.MeshStandardMaterial({color:0x6a4e38,roughness:.86});
 const peg=new T.MeshStandardMaterial({color:0x3d3228,roughness:.7});
 const plate=new T.Mesh(new T.BoxGeometry(.04,.92,1.78),wood);plate.position.set(.33,1.18,-.28);plate.castShadow=plate.receiveShadow=true;board.add(plate);
 const rail=new T.Mesh(new T.BoxGeometry(.05,.06,1.78),peg);rail.position.set(.31,1.58,-.28);board.add(rail);
 const rail2=rail.clone();rail2.position.y=.78;board.add(rail2);
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
 if(!GUNS.includes(id)&&id!=='sword'&&id!=='axe'&&id!=='mace')id='marker';
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

Gadgets.prototype.placePortal=function(idx,point,normal,object){
 this.clearPortal(idx);
 const color=PORTAL_COLORS[idx],group=new T.Group();
 const ring=new T.Mesh(new T.TorusGeometry(.42,.028,10,28),new T.MeshBasicMaterial({color,transparent:true,opacity:.95}));
 const inner=new T.Mesh(new T.CircleGeometry(.40,28),new T.ShaderMaterial({
  transparent:true,side:T.DoubleSide,depthWrite:false,
  uniforms:{t:{value:0},col:{value:new T.Color(color)}},
  vertexShader:'varying vec2 u;void main(){u=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:`varying vec2 u;uniform float t;uniform vec3 col;
   void main(){vec2 p=(u-.5)*2.0;float r=length(p);float ang=atan(p.y,p.x);
   float swirl=.5+.5*sin(ang*6.0-t*3.0+r*8.0);float a=(1.0-smoothstep(.72,1.0,r))*mix(.45,.85,swirl);
   vec3 c=mix(col,vec3(.02,.04,.08),smoothstep(.0,.85,r));gl_FragColor=vec4(c,a);}`
 }));
 inner.position.z=-.004;group.add(ring,inner);
 const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),normal);
 group.quaternion.copy(q);group.position.copy(point).addScaledVector(normal,.03);
 const parent=object.isInstancedMesh?this.world.root:object;
 const local=parent.worldToLocal(group.position.clone());
 parent.add(group);group.position.copy(local);
 group.quaternion.copy(parent.getWorldQuaternion(Q()).invert().premultiply(q));
 group.userData.portal=true;group.traverse(m=>{m.userData.portal=true;});
 this.portals[idx]={group,inner,idx,parent,normal:normal.clone(),point:point.clone(),radius:.42,hw:.34,hh:.42};
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
 return {point,normal,radius:p.radius};
};

Gadgets.prototype.insidePortal=function(info,pos){
 const rel=pos.clone().sub(info.point),along=rel.dot(info.normal),flat=rel.addScaledVector(info.normal,-along);
 return Math.abs(along)<.22&&flat.length()<info.radius*.92;
};
Gadgets.prototype.coversPortal=function(point){
 if(!point)return false;
 for(const p of this.portals){
  const w=this.portalWorld(p);if(!w)continue;
  const rel=point.clone().sub(w.point),along=rel.dot(w.normal);
  rel.addScaledVector(w.normal,-along);
  if(Math.abs(along)<.38&&rel.length()<w.radius*.92)return true;
 }
 return false;
};

Gadgets.prototype.tryCross=function(pos,prev,vel){
 const a=this.portals[0]&&this.portalWorld(this.portals[0]),b=this.portals[1]&&this.portalWorld(this.portals[1]);
 if(!a||!b||this.cool>0)return null;
 for(const [from,to] of [[a,b],[b,a]]){
  const d0=prev.clone().sub(from.point).dot(from.normal),d1=pos.clone().sub(from.point).dot(from.normal);
  if(d0*d1>0)continue;
  const t=d0===d1?0:d0/(d0-d1),mid=prev.clone().lerp(pos,t);
  const flat=mid.clone().sub(from.point);flat.addScaledVector(from.normal,-flat.dot(from.normal));
  if(flat.length()>from.radius*.88)continue;
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
 this.splat(hit.point,n,hit.object,color,1.15);
 const tan=new T.Vector3(1,0,0).cross(n);if(tan.lengthSq()<1e-6)tan.set(0,0,1).cross(n);tan.normalize();
 const bit=new T.Vector3().crossVectors(n,tan);
 for(let i=0;i<6;i++){
  const o=tan.clone().multiplyScalar((Math.random()-.5)*.16).addScaledVector(bit,(Math.random()-.5)*.16);
  this.splat(hit.point.clone().add(o).addScaledVector(n,.001),n,hit.object,color,.45+Math.random()*.4);
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

Gadgets.prototype.tickPortals=function(dt){
 this.cool=Math.max(0,this.cool-dt);
 for(const p of this.portals){if(p?.inner?.material?.uniforms)p.inner.material.uniforms.t.value=this.props.time;}
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
 for(const s of this.splats){
  if(!s.live)continue;
  s.age+=dt;s.wet=Math.max(0,s.wet-dt*.22);
  if(s.wet>0)s.r=Math.min(.22,s.r+dt*.055*s.wet);
  if(s.age>90)s.live=false;
 }
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
 this.writeSplats();
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
 if(this.rack)this.rack.removeFromParent();
 this.splatMesh.removeFromParent();this.splatMesh.dispose();
 for(const b of this.ballPool){b.mesh.removeFromParent();b.mesh.geometry.dispose();b.mesh.material.dispose();}
};
