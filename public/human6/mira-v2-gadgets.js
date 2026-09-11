import * as T from 'three';
import {withOffscreenView,mapPortalCamera,portalTransfer} from './modules/human5-view-surfaces.js?v=18.0.0';
import {playSfx,unlockSfx} from './mira-v2-sfx.js?v=18.0.0';
const V=()=>new T.Vector3(),Q=()=>new T.Quaternion(),M=()=>new T.Matrix4();
const QUEST=/Quest|OculusBrowser/i.test(globalThis.navigator?.userAgent||'');
export const GUNS=['pistol','laser','rifle','sniper','shotgun','uzi','marker','marker2','portal','torch'];
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
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

function gVal(world){const g=world?.gravity;return Number.isFinite(g)?g:9.81;}

const splatVert=`varying vec2 u;varying float vWet;varying float vStreak;varying vec3 vCol;attribute float aWet;attribute float aStreak;
void main(){u=uv;vWet=aWet;vStreak=aStreak;vCol=instanceColor;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`;
const splatFrag=`varying vec2 u;varying float vWet;varying float vStreak;varying vec3 vCol;
void main(){
 vec2 p=(u-.5)*2.0;
 p.y=p.y*(1.0+vStreak*2.6)+vStreak*0.85;
 float n=sin(p.x*9.4+p.y*7.1)*sin(p.x*13.0-p.y*11.2)*.12;
 float e=length(p*vec2(1.0,.62+vStreak*.2))+n;
 float drip=max(0.0,p.y)*vStreak;
 float fingers=abs(sin(p.x*11.0+vStreak*7.0));
 e-=(1.0-fingers)*drip*.55;
 float edge=1.0-smoothstep(.38,.98,e);
 float holes=smoothstep(.16,.22,abs(sin(p.x*17.0+p.y*13.0)))*.10*(1.0-vStreak);
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
 props.world.portalOpen=(p,o,r,y,h)=>g.coversPortal(p,o,r,y,h);
 g.rebuildRack();
 return g;
}

class Gadgets {
 constructor(props){
  this.props=props;this.world=props.world;this.scene=props.scene;
  this.paintColor=null;this.balls=[];this.splats=[];this.portals=[null,null];
  this.prevCam=V();this.camReady=false;this.cool=0;this.rack=null;this.pegs=[];this.rc=new T.Raycaster();
  this.CAP=QUEST?140:240;
  const geom=new T.PlaneGeometry(1,1,1,1);
  this.wet=new T.InstancedBufferAttribute(new Float32Array(this.CAP),1);
  this.streakAttr=new T.InstancedBufferAttribute(new Float32Array(this.CAP),1);
  geom.setAttribute('aWet',this.wet);geom.setAttribute('aStreak',this.streakAttr);
  this.splatMat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-6,
   vertexShader:splatVert,fragmentShader:splatFrag});
  this.splatMesh=new T.InstancedMesh(geom,this.splatMat,this.CAP);
  this.splatMesh.frustumCulled=false;this.splatMesh.renderOrder=6;this.splatMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  this.splatMesh.count=0;this.scene.add(this.splatMesh);
  this.splatMesh.setColorAt(0,new T.Color(1,1,1));
  dummy.scale.setScalar(0);dummy.updateMatrix();
  for(let i=0;i<this.CAP;i++){this.splatMesh.setMatrixAt(i,dummy.matrix);this.splats.push({live:false,parent:null,local:V(),localN:V(),color:new T.Color(),r:0,wet:0,age:0,seed:0,streak:0,body:false});}
  this.ballPool=[];
  const ballMat=new T.MeshStandardMaterial({roughness:.35,metalness:.05});
  for(let i=0;i<24;i++){
   const m=new T.Mesh(new T.SphereGeometry(.017,10,8),ballMat.clone());
   m.castShadow=true;m.visible=false;this.scene.add(m);
   this.ballPool.push({mesh:m,live:false,vel:V(),age:0,color:0x2aa0e8});
  }
  this.portalRT=[[],[]]; // allocate only when a paired portal is visible
  this.vcam=new T.PerspectiveCamera();this.vcam.matrixAutoUpdate=this.vcam.matrixWorldAutoUpdate=false;
  this.crossCooldown=new WeakMap();this.portalEyes=[];
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
 const cols=5,row=Math.floor(i/cols),col=i%cols;
 const z=-.78+(cols<=1?0:col/(cols-1)*1.56);
 return {x:.07,y:1.48-row*.36,z,yaw:0};
};

Gadgets.prototype.rebuildRack=function(){
 if(this.rack){
  for(const item of this.props.items||[])if(item.group?.parent===this.rack)this.props.scene.attach(item.group);
  this.rack.removeFromParent();this.rack.traverse(o=>{o.geometry?.dispose?.();if(o.material&&!o.material.map)o.material.dispose?.();});this.rack=null;
 }
 this.pegs=[];
 if(this.world.name!=='Living room')return;
 const board=new T.Group();board.name='GunRack';
 board.position.set(-6.97,0,.92);
 const wood=new T.MeshStandardMaterial({color:0x6a4e38,roughness:.86});
 const peg=new T.MeshStandardMaterial({color:0x3d3228,roughness:.7});
 const plate=new T.Mesh(new T.BoxGeometry(.04,1.28,1.88),wood);plate.position.set(0,1.24,0);plate.castShadow=plate.receiveShadow=true;board.add(plate);
 const rail=new T.Mesh(new T.BoxGeometry(.05,.06,1.88),peg);rail.position.set(-.005,1.74,0);board.add(rail);
 const rail2=rail.clone();rail2.position.y=1.38;board.add(rail2);
 const rail3=rail.clone();rail3.position.y=.98;board.add(rail3);
 GUNS.forEach((_,i)=>{
  const s=this.slotPose(i);
  const p=new T.Mesh(new T.CylinderGeometry(.012,.012,.07,8),peg);
  p.rotation.z=Math.PI/2;p.position.set(s.x-.02,s.y-.02,s.z);board.add(p);this.pegs.push(p);
 });
 this.world.root.add(board);this.rack=board;
 const box=new T.Box3().setFromObject(board),c=box.getCenter(V()),sz=box.getSize(V());
 this.world.obstacle(c.x,c.z,sz.x,sz.z,box.min.y,sz.y,board);
 this.restock();
};

Gadgets.prototype.hang=function(item){
 const i=GUNS.indexOf(item.id);if(i<0||!this.rack)return;
 const s=this.slotPose(i);
 this.rack.attach(item.group);
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
 if(Math.abs(n.y)>.35){this.props.status='Place portals on a broad, upright wall';return;}
 const fit=this.fitPortal(hit,n);if(!fit){this.props.status='A full doorway of solid wall is needed';return;}
 this.placePortal(idx,fit.position,n,hit.object,fit.owners);
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

Gadgets.prototype.fitPortal=function(hit,normal){
 const position=hit.point.clone();position.y=(this.world.floorHeight?.(position,.85)||0)+PORTAL_H*.5+.02;
 const q=this.orientPortal(normal),owners=new Set([hit.object]);
 // A doorway may span wall tiles. Test its center and edges, not the entire mesh AABB.
 for(const x of [-.54,0,.54])for(const y of [-1.03,0,1.03]){
  const p=new T.Vector3(x,y,0).applyQuaternion(q).add(position).addScaledVector(normal,.18);
  const h=this.props.hit(new T.Ray(p,normal.clone().negate()),.30,false,{world:true});
  if(!h||this.props.actorFor(h.object)||this.props.dogFor(h.object)||h.object.userData?.cloth||h.object.userData?.carPart)return null;
  for(let o=h.object;o;o=o.parent)if(o.userData?.furniture)return null;
  const n=h.face?.normal?.clone().transformDirection(h.object.matrixWorld);
  if(!n||n.dot(normal)<.98||Math.abs(h.point.clone().sub(position).dot(normal))>.06)return null;
  owners.add(h.object);
 }
 return {position,owners};
};
Gadgets.prototype.placePortal=function(idx,point,normal,object,owners=new Set([object])){
 if(![0,1].includes(idx)||!object?.parent)return false;
 this.clearPortal(idx);
 const n=normal.clone().normalize(),pos=point.clone().addScaledVector(n,.035);
 const color=PORTAL_COLORS[idx],group=new T.Group();group.name=(idx?'Orange':'Blue')+' portal';
 const W=PORTAL_W,H=PORTAL_H,thickness=PORTAL_T,D=.042,innerW=W-2*thickness,innerH=H-2*thickness;
 const frame=new T.MeshStandardMaterial({color,roughness:.32,metalness:.18,emissive:color,emissiveIntensity:1.4});
 const bar=(w,h,x,y)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,D),frame);m.position.set(x,y,-D*.28);group.add(m);};
 bar(W,thickness,0,H/2-thickness/2);bar(W,thickness,0,-H/2+thickness/2);
 bar(thickness,H-2*thickness,-W/2+thickness/2,0);bar(thickness,H-2*thickness,W/2-thickness/2,0);
 const inner=new T.Mesh(new T.PlaneGeometry(innerW,innerH),new T.ShaderMaterial({
  toneMapped:true,side:T.FrontSide,depthWrite:true,
  uniforms:{map:{value:null},col:{value:new T.Color(color)},hasPair:{value:0},portalMatrix:{value:new T.Matrix4()}},
  vertexShader:portalVert,fragmentShader:portalFrag
 }));inner.position.z=.002;group.add(inner);
 group.quaternion.copy(this.orientPortal(n));group.position.copy(pos);group.updateMatrixWorld(true);
 // Keep the doorway on a world-space root; the wall anchor follows its transform without shear.
 const parent=this.world.root;parent.attach(group);object.updateWorldMatrix(true,false);
 group.userData.portal=true;group.traverse(m=>{m.userData.portal=true;});
 const portal=this.portals[idx]={group,inner,idx,parent,owners,hw:innerW/2,hh:innerH/2,views:[],anchor:object,anchorPoint:object.worldToLocal(pos.clone()),anchorNormal:n.clone().applyMatrix3(new T.Matrix3().getNormalMatrix(object.matrixWorld).invert()).normalize()};
 inner.onBeforeRender=(_r,_s,cam)=>{const eye=Math.max(0,this.portalEyes.indexOf(cam)),view=portal.views[eye]||portal.views[0],u=inner.material.uniforms;
  u.hasPair.value=view?.valid?1:0;if(view?.valid){u.map.value=view.texture;u.portalMatrix.value.copy(view.matrix);}inner.material.uniformsNeedUpdate=true;};
 this.world.h5OpenWorld?.pinView('portal'+idx,pos);
 this.camReady=false;this.props.status=(idx?'Orange':'Blue')+' portal placed';return portal;
};
Gadgets.prototype.clearPortal=function(idx){
 const p=this.portals[idx];if(p){p.group.removeFromParent();const mats=new Set();p.group.traverse(o=>{o.geometry?.dispose?.();if(o.material)mats.add(o.material);});mats.forEach(m=>m.dispose());}
 this.portals[idx]=null;for(const rt of this.portalRT[idx])rt.dispose();this.portalRT[idx]=[];
 for(const other of this.portals)if(other)other.views=[];
 this.world.h5OpenWorld?.unpinView('portal'+idx);
};
Gadgets.prototype.clearPortals=function(){this.clearPortal(0);this.clearPortal(1);this.props.status='Portals cleared';};
Gadgets.prototype.portalWorld=function(p){
 if(!p?.group?.parent||!p.anchor?.parent)return null;p.anchor.updateWorldMatrix(true,false);
 const position=p.anchorPoint.clone().applyMatrix4(p.anchor.matrixWorld),normal=p.anchorNormal.clone().applyMatrix3(new T.Matrix3().getNormalMatrix(p.anchor.matrixWorld)).normalize(),q=this.orientPortal(normal);
 p.group.position.copy(p.group.parent.worldToLocal(position));p.group.quaternion.copy(p.group.parent.getWorldQuaternion(Q()).invert().multiply(q));p.group.updateWorldMatrix(true,false);
 return {point:p.group.getWorldPosition(V()),normal:new T.Vector3(0,0,1).transformDirection(p.group.matrixWorld),hw:p.hw,hh:p.hh,group:p.group,idx:p.idx};
};
Gadgets.prototype.coversPortal=function(point,obstacle=null,radius=0,yOffset=0,height=0){
 if(!point||!this.portals.every(p=>p?.group?.parent))return false;
 for(const p of this.portals){
  if(obstacle){const object=obstacle.object||obstacle.mesh;let related=false;
   for(const owner of p.owners){for(let o=owner;o;o=o.parent)if(o===object)related=true;for(let o=object;o;o=o.parent)if(o===owner)related=true;}
   if(!related)continue;
  }
  const center=point.clone();center.y+=yOffset+height*.5;p.group.updateWorldMatrix(true,false);const local=p.group.worldToLocal(center);
  if(Math.abs(local.x)<p.hw-Math.min(radius*.75,.25)&&Math.abs(local.y)+height*.5<p.hh+.045&&Math.abs(local.z)<.52)return true;
 }
 return false;
};
Gadgets.prototype.tryCross=function(pos,prev,vel,key=pos){
 const [A,B]=this.portals;if(!A||!B||(this.crossCooldown.get(key)||0)>this.props.time)return null;
 for(const [fromP,toP]of [[A,B],[B,A]]){
  const from=this.portalWorld(fromP),to=this.portalWorld(toP);if(!from||!to)continue;
  const d0=prev.clone().sub(from.point).dot(from.normal),d1=pos.clone().sub(from.point).dot(from.normal);
  if(d0<=0||d1>0)continue;
  const mid=prev.clone().lerp(pos,d0/(d0-d1)),local=from.group.worldToLocal(mid);
  if(Math.abs(local.x)>from.hw||Math.abs(local.y)>from.hh)continue;
  const transfer=portalTransfer(from.group.matrixWorld,to.group.matrixWorld),q=new T.Quaternion().setFromRotationMatrix(transfer);
  const out=pos.clone().applyMatrix4(transfer).addScaledVector(to.normal,.12);
  if(vel)vel.applyQuaternion(q);this.crossCooldown.set(key,this.props.time+.18);
  return {pos:out,q,from,to};
 }
 return null;
};
Gadgets.prototype.relocate=function(object,mapped){
 const worldQ=object.getWorldQuaternion(Q()).premultiply(mapped.q);object.position.copy(object.parent?object.parent.worldToLocal(mapped.pos.clone()):mapped.pos);
 object.quaternion.copy(object.parent?object.parent.getWorldQuaternion(Q()).invert().multiply(worldQ):worldQ);object.updateWorldMatrix(true,true);
};
Gadgets.prototype.teleportPlayer=function(mapped){
 const rig=this.props.rig,cam=this.props.camera;if(!rig||!cam)return;
 const transfer=portalTransfer(mapped.from.group.matrixWorld,mapped.to.group.matrixWorld),move=object=>{const p=object.getWorldPosition(V()).applyMatrix4(transfer).addScaledVector(mapped.to.normal,.12);this.relocate(object,{pos:p,q:mapped.q});};
 for(const actor of this.props.system.actors||[])if(actor.grabs?.size||actor.held){move(actor.group);for(const s of actor.soft||[])s.ready=false;actor.navigation=null;actor.h5PortalPrev=null;}
 const furniture=new Set();for(const [key,h]of this.props.furnHolds||[])if(typeof key==='number'||key==='desktop'){if(!furniture.has(h.group)){move(h.group);furniture.add(h.group);}if(h.last)h.last.applyMatrix4(transfer);}
 // Turn about the tracked head, then place it. Room-scale offset must not swing the player.
 rig.rotation.y+=new T.Euler().setFromQuaternion(mapped.q,'YXZ').y;rig.updateWorldMatrix(true,true);
 rig.position.add(mapped.pos.clone().sub(cam.getWorldPosition(V())));rig.updateWorldMatrix(true,true);
 this.prevCam.copy(cam.getWorldPosition(V()));this.camReady=true;
};

Gadgets.prototype.allocSplat=function(){
 let s=this.splats.find(x=>!x.live);
 if(!s){s=this.splats.reduce((a,b)=>a.age>b.age?a:b);s.live=false;}
 return s;
};

Gadgets.prototype.splat=function(point,normal,object,color,scale=1,opts={}){
 if(!object||object.userData?.portal)return;
 const n=normal.clone();if(n.lengthSq()<1e-8)n.set(0,1,0);n.normalize();
 const parent=object.isInstancedMesh?this.world.root:object;
 parent.updateWorldMatrix(true,false);
 const inv=parent.matrixWorld.clone().invert();
 const s=this.allocSplat();
 s.live=true;s.parent=parent;s.age=0;s.wet=1;s.streak=0;s.body=!!opts.body;s.seed=Math.random()*6.28;
 s.r=(.055+Math.random()*.04)*scale;s.color.setHex(color);
 s.local.copy(point).applyMatrix4(inv);
 s.localN.copy(n).transformDirection(inv).normalize();
};

Gadgets.prototype.wrapHits=function(mesh,point,normal,radius=0.11,count=10){
 const hits=[{point:point.clone(),normal:normal.clone(),object:mesh,uv:null}];
 const tan=new T.Vector3(1,0,0).cross(normal);if(tan.lengthSq()<1e-6)tan.set(0,0,1).cross(normal);tan.normalize();
 const bit=new T.Vector3().crossVectors(normal,tan);
 this.rc.near=0;this.rc.far=radius*2.6;
 for(let i=0;i<count;i++){
  const a=i/count*Math.PI*2,r=radius*(.28+.72*((i%4)/3));
  const offset=tan.clone().multiplyScalar(Math.cos(a)*r).addScaledVector(bit,Math.sin(a)*r);
  this.rc.ray.origin.copy(point).add(offset).addScaledVector(normal,.12);
  this.rc.ray.direction.copy(normal).multiplyScalar(-1).addScaledVector(offset,-.4).normalize();
  const h=this.rc.intersectObject(mesh,false)[0];
  if(h&&h.distance<radius*2.8)hits.push(h);
 }
 return hits;
};

Gadgets.prototype.injectDogPaint=function(model,tex){
 const hook=mat=>{
  if(!mat||mat.userData.dogPaintHook){if(mat?.userData.dogPaint)mat.userData.dogPaint.value=tex;return;}
  const u={value:tex};mat.userData.dogPaint=u;mat.userData.dogPaintHook=true;
  const prev=mat.onBeforeCompile,oldKey=mat.customProgramCacheKey?.bind(mat);
  mat.onBeforeCompile=(shader,renderer)=>{
   prev?.(shader,renderer);
   shader.uniforms.dogPaint=u;
   if(!shader.fragmentShader.includes('uniform sampler2D dogPaint')){
    shader.fragmentShader=shader.fragmentShader
     .replace('#include <common>','#include <common>\nuniform sampler2D dogPaint;')
     .replace('#include <map_fragment>',`#include <map_fragment>
      vec4 dogP=texture2D(dogPaint,vMapUv);
      diffuseColor.rgb=mix(diffuseColor.rgb,mix(diffuseColor.rgb*0.32,dogP.rgb,0.88),dogP.a);
     `)
     .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      roughnessFactor=mix(roughnessFactor,0.98,texture2D(dogPaint,vMapUv).a);`);
   }
  };
  mat.customProgramCacheKey=()=>(oldKey?oldKey():(mat.name||''))+'-dpaint';
  mat.needsUpdate=true;
 };
 hook(model.coat);
 model.root?.traverse(o=>{if(o.isMesh&&o.material?.name?.startsWith('Dog_FurShell'))hook(o.material);});
};

Gadgets.prototype.matDogFur=function(dog,hit,color){
 const model=dog._model||dog.model;if(!model?.coat)return;
 let pack=dog._paint;
 if(!pack){
  const c=document.createElement('canvas');c.width=c.height=512;
  const ctx=c.getContext('2d');ctx.clearRect(0,0,512,512);
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.flipY=true;
  pack=dog._paint={canvas:c,ctx,tex};
  this.injectDogPaint(model,tex);
 }
 const uv=hit.uv;if(!uv)return;
 const ctx=pack.ctx,x=uv.x*512,y=(1-uv.y)*512,col=new T.Color(color);
 const r=(col.r*255)|0,g=(col.g*255)|0,b=(col.b*255)|0;
 const grd=ctx.createRadialGradient(x,y,2,x,y,34);
 grd.addColorStop(0,`rgba(${r},${g},${b},0.95)`);
 grd.addColorStop(.4,`rgba(${(r*.55)|0},${(g*.55)|0},${(b*.55)|0},0.78)`);
 grd.addColorStop(1,`rgba(${(r*.25)|0},${(g*.25)|0},${(b*.25)|0},0)`);
 ctx.globalCompositeOperation='source-over';ctx.fillStyle=grd;
 ctx.beginPath();ctx.arc(x,y,34,0,Math.PI*2);ctx.fill();
 for(let i=0;i<10;i++){
  const a=Math.random()*Math.PI*2,rr=6+Math.random()*22;
  ctx.fillStyle=`rgba(${(r*.45)|0},${(g*.45)|0},${(b*.45)|0},${.28+Math.random()*.4})`;
  ctx.beginPath();ctx.ellipse(x+Math.cos(a)*rr,y+Math.sin(a)*rr,2+Math.random()*4,4+Math.random()*7,a,0,Math.PI*2);ctx.fill();
 }
 pack.tex.needsUpdate=true;
};

Gadgets.prototype.impactPaint=function(hit,color){
 const n=(hit.face?.normal.clone().transformDirection(hit.object.matrixWorld)||new T.Vector3(0,1,0));
 if(n.lengthSq()<1e-8)n.set(0,1,0);n.normalize();
 const actor=this.props.actorFor?.(hit.object),dog=this.props.dogFor?.(hit.object);
 const bone=actor?.nearestHit?.(hit.point,.22)?.bone||dog?.nearestHit?.(hit.point,.28)?.bone;
 if(dog)this.matDogFur(dog,hit,color);
 if(actor||dog){
  const mesh=hit.object,samples=this.wrapHits(mesh,hit.point,n,.12,12);
  for(const h of samples){
   const hn=(h.face?.normal.clone().transformDirection(mesh.matrixWorld)||n.clone());
   if(hn.lengthSq()<1e-8)hn.copy(n);hn.normalize();
   const parent=bone||mesh;
   this.splat(h.point||hit.point,hn,parent,color,.42+Math.random()*.28,{body:true});
  }
 }else{
  this.splat(hit.point,n,hit.object,color,1.15);
  const tan=new T.Vector3(1,0,0).cross(n);if(tan.lengthSq()<1e-6)tan.set(0,0,1).cross(n);tan.normalize();
  const bit=new T.Vector3().crossVectors(n,tan);
  for(let i=0;i<6;i++){
   const o=tan.clone().multiplyScalar((Math.random()-.5)*.16).addScaledVector(bit,(Math.random()-.5)*.16);
   this.splat(hit.point.clone().add(o).addScaledVector(n,.001),n,hit.object,color,.45+Math.random()*.4);
  }
 }
 playSfx('splat');
 this.props.status=dog?'Paint in the fur':actor?'Paint on skin':'Paint coverage';
};

Gadgets.prototype.writeSplats=function(){
 const up=new T.Vector3(0,1,0),g=this.gravity();let written=0;
 for(let i=0;i<this.CAP;i++){
  const s=this.splats[i];
  if(!s.live||!s.parent?.parent)continue;
  s.parent.updateWorldMatrix(true,false);
  const p=s.local.clone().applyMatrix4(s.parent.matrixWorld);
  const n=s.localN.clone().transformDirection(s.parent.matrixWorld).normalize();
  const vertical=Math.abs(n.dot(up))<.82;
  dummy.position.copy(p).addScaledVector(n,s.body?.0018:.0024);
  if(vertical&&s.streak>0.02){
   const down=up.clone().multiplyScalar(-1).addScaledVector(n,n.dot(up));
   if(down.lengthSq()>1e-6)down.normalize();else down.set(0,-1,0);
   const right=new T.Vector3().crossVectors(n,down);if(right.lengthSq()<1e-6)right.set(1,0,0);right.normalize();
   down.crossVectors(n,right).normalize();
   dummy.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(right,down,n));
  }else dummy.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),n);
  dummy.scale.set(s.r*(s.body?1.35:1.7),s.r*(s.body?1.25:1.5)+s.streak,1);
  dummy.updateMatrix();
  this.splatMesh.setMatrixAt(written,dummy.matrix);
  this.splatMesh.setColorAt(written,s.color);
  this.wet.setX(written,s.wet);this.streakAttr.setX(written++,s.body?s.streak*.25:s.streak);
  if(s.wet>.08&&g>0.5&&vertical&&!s.body){
   const down=up.clone().multiplyScalar(-1).addScaledVector(n,n.dot(up));
   if(down.lengthSq()>1e-6){
    down.normalize();
    const world=p.clone().addScaledVector(down,dtSafe(this)*.12*s.wet);
    s.local.copy(world).applyMatrix4(s.parent.matrixWorld.clone().invert());
   }
  }
 }
 this.splatMesh.count=written;this.splatMesh.instanceMatrix.needsUpdate=true;
 if(this.splatMesh.instanceColor)this.splatMesh.instanceColor.needsUpdate=true;
 this.wet.needsUpdate=true;this.streakAttr.needsUpdate=true;
};

function dtSafe(g){return Math.min(.05,g._dt||.016);}

Gadgets.prototype.clearPaint=function(){
 for(const s of this.splats)s.live=false;
 for(const d of this.props.dogs?.list?.()||[]){
  const pack=d._paint;if(!pack)continue;
  pack.ctx.clearRect(0,0,pack.canvas.width,pack.canvas.height);pack.tex.needsUpdate=true;
 }
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
  const mapped=this.tryCross(next,prev,b.vel,b.mesh);
  if(mapped){b.mesh.position.copy(mapped.pos);continue;}
  const dist=next.distanceTo(prev),ray=new T.Ray(prev,b.vel.clone().normalize());
  const hit=dist>1e-5?this.props.hit(ray,dist+.01,false):null;
  if(hit&&this.coversPortal(hit.point)){b.mesh.position.copy(next);continue;}
  if(hit){this.impactPaint(hit,b.color);b.live=false;b.mesh.visible=false;continue;}
  b.mesh.position.copy(next);
  if(b.age>2.4||b.mesh.position.y<-4){b.live=false;b.mesh.visible=false;}
 }
};

Gadgets.prototype.renderOne=function(renderer,source,from,to,eyeIndex){
 this.portalWorld(from);this.portalWorld(to);
 const pos=source.getWorldPosition(V()),normal=new T.Vector3(0,0,1).transformDirection(from.group.matrixWorld);
 const view=from.views[eyeIndex]||(from.views[eyeIndex]={valid:false});view.valid=false;
 if(pos.sub(from.group.getWorldPosition(V())).dot(normal)<.025)return;
 const clip=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(source.projectionMatrix,source.matrixWorldInverse));if(!clip.intersectsObject(from.inner))return;
 let rt=this.portalRT[from.idx][eyeIndex];if(!rt){rt=new T.WebGLRenderTarget(QUEST?320:640,QUEST?576:1152,{minFilter:T.LinearFilter,magFilter:T.LinearFilter,generateMipmaps:false,depthBuffer:true});this.portalRT[from.idx][eyeIndex]=rt;}
 view.matrix=mapPortalCamera(this.vcam,source,from.group.matrixWorld,to.group.matrixWorld);
 renderer.setRenderTarget(rt);renderer.setViewport(0,0,rt.width,rt.height);renderer.clear();renderer.render(this.scene,this.vcam);
 view.texture=rt.texture;view.valid=true;
};
Gadgets.prototype.renderViews=function(renderer,mainCam){
 if(this._rendering||!this.world.root.visible)return;const [a,b]=this.portals;if(!a||!b)return;
 const pos=mainCam.getWorldPosition(V());if(Math.min(a.group.getWorldPosition(V()).distanceTo(pos),b.group.getWorldPosition(V()).distanceTo(pos))>45){a.views=[];b.views=[];return;}
 if(renderer.xr.enabled&&renderer.xr.isPresenting)renderer.xr.updateCamera(mainCam);
 const xr=renderer.xr.isPresenting?renderer.xr.getCamera():null;
 this.portalEyes=xr?.cameras?.length?xr.cameras.slice(0,2):[mainCam];
 const hidden=[a.group,b.group,this.props.scopeOverlay,this.props.system.vrPanel];
 for(const item of this.props.held.values())if(item.holder==='desktop'||typeof item.holder==='number')hidden.push(item.group);
 this._rendering=true;try{withOffscreenView(renderer,hidden,()=>{for(let eye=0;eye<this.portalEyes.length;eye++){const cam=this.portalEyes[eye];this.renderOne(renderer,cam,a,b,eye);this.renderOne(renderer,cam,b,a,eye);}});}finally{this._rendering=false;}
};

Gadgets.prototype.tickPortals=function(dt){
 for(let i=0;i<2;i++)if(this.portals[i]&&!this.portals[i].anchor?.parent)this.clearPortal(i);
 if(!this.portals[0]||!this.portals[1]){this.camReady=false;return;}
 this.cool=Math.max(0,this.cool-dt);
 const cam=this.props.camera.getWorldPosition(V());
 if(this.camReady){
  const mapped=this.tryCross(cam,this.prevCam,null,this.props.rig);
  if(mapped)this.teleportPlayer(mapped);
 }
 this.prevCam.copy(this.props.camera.getWorldPosition(V()));this.camReady=true;
 for(const group of this.world.movables||[]){
  const f=group.userData?.furniture;if(!f||f.held!=null)continue;
  const p=group.getWorldPosition(V());
  f.prevWorld??=p.clone();
  const mapped=this.tryCross(p,f.prevWorld,f.velocity,group);
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
  const mapped=this.tryCross(p,item.prevWorld,item.velocity,item.group);
  if(mapped){item.group.position.copy(mapped.pos);item.group.quaternion.premultiply(mapped.q);}
  item.prevWorld.copy(item.group.getWorldPosition(V()));
 }
 const balls=this.props.system?.balls||[];
 for(const b of balls){
  if(!b?.mesh||b.held)continue;
  const p=b.mesh.position,prev=b.prevWorld||p.clone();
  const mapped=this.tryCross(p,prev,b.vel,b.mesh);
  if(mapped)b.mesh.position.copy(mapped.pos);
  b.prevWorld=p.clone();
 }
 for(const a of this.props.system.actors||[]){const p=a.group.getWorldPosition(V()).add(new T.Vector3(0,.95,0));
  if(a.h5PortalPrev&&!a.grabs?.size&&!a.held){const mapped=this.tryCross(p,a.h5PortalPrev,null,a);if(mapped){const offset=mapped.pos.clone().sub(p);this.relocate(a.group,{pos:a.group.getWorldPosition(V()).add(offset),q:mapped.q});a.navigation=null;a.directedWalk=null;for(const s of a.soft||[])s.ready=false;}}
  a.h5PortalPrev=a.group.getWorldPosition(V()).add(new T.Vector3(0,.95,0));
 }
 for(const d of this.props.dogs?.list?.()||[]){
  const p=d.root.getWorldPosition(V());
  d.prevWorld??=p.clone();
  const mapped=this.tryCross(p,d.prevWorld,null,d.root);
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
  s.age+=dt;s.wet=Math.max(0,s.wet-dt*.16);
  if(s.wet>0){
   wet=true;s.r=Math.min(.22,s.r+dt*.04*s.wet);
   if(!s.body)s.streak=Math.min(.62,s.streak+dt*.55*s.wet);
  }
  if(s.age>90)s.live=false;
 }
 if(live>1){
  for(let i=0;i<this.splats.length;i++){
   const a=this.splats[i];if(!a.live||a.streak>.1)continue;
   for(let j=i+1;j<this.splats.length;j++){
    const b=this.splats[j];if(!b.live||a.parent!==b.parent||b.streak>.1)continue;
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
 this._dt=dt;
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
