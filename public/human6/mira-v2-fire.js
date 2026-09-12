import * as T from 'three';
import {tagMovable} from './mira-v2-furniture.js?v=19.3.0';
import {playSfx,unlockSfx} from './mira-v2-sfx.js?v=19.3.0';
const V=()=>new T.Vector3(),Q=()=>new T.Quaternion();
const QUEST=/Quest|OculusBrowser/i.test(globalThis.navigator?.userAgent||'');
const MAX=QUEST?10:18,MAX_LIGHTS=QUEST?2:3;

const flameVert=`varying vec2 u;varying float vSeed;attribute float aSeed;attribute float aPhase;
void main(){u=uv;vSeed=aSeed;vec3 p=position;p.x*=(0.72+0.28*sin(aPhase+uv.y*6.0));p.y+=uv.y*uv.y*0.12;
gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(p,1.0);}`;
const flameFrag=`varying vec2 u;varying float vSeed;uniform float time;
void main(){
 vec2 p=u-vec2(.5,0.0);
 float y=u.y;
 float w=mix(.46,.08,y*y);
 float n=sin((p.x*14.0+vSeed)*1.7+time*11.0)*sin(y*9.0+time*7.0+vSeed);
 float body=1.0-smoothstep(w,w+.16,abs(p.x)+n*.04);
 float tip=smoothstep(.12,.92,y);
 float alpha=body*(1.0-pow(tip,1.6));
 if(alpha<.05)discard;
 vec3 col=mix(vec3(1.0,.42,.05),vec3(1.0,.92,.45),pow(1.0-y,.55)+n*.08);
 col=mix(col,vec3(.25,.04,.0),smoothstep(.55,.98,y));
 gl_FragColor=vec4(col,alpha);
}`;

export class FireSystem {
 constructor(props){
  this.props=props;this.world=props.world;this.scene=props.scene;
  this.sites=[];this.hearth=null;this.clock=0;this.spreadT=0;
  this.dummy=new T.Object3D();
  this.mat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{time:{value:0}},vertexShader:flameVert,fragmentShader:flameFrag});
  const n=QUEST?48:96;
  this.mesh=new T.InstancedMesh(new T.PlaneGeometry(.34,.62),this.mat,n);
  this.mesh.count=0;this.mesh.frustumCulled=false;this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  this.mesh.raycast=()=>{};this.scene.add(this.mesh);
  const seeds=new Float32Array(n),phases=new Float32Array(n);
  for(let i=0;i<n;i++){seeds[i]=Math.random()*6;phases[i]=Math.random()*6;}
  this.mesh.geometry.setAttribute('aSeed',new T.InstancedBufferAttribute(seeds,1));
  this.mesh.geometry.setAttribute('aPhase',new T.InstancedBufferAttribute(phases,1));
  this.lights=[];
  for(let i=0;i<MAX_LIGHTS;i++){const l=new T.PointLight(0xff7a28,0,6.5,2);l.visible=false;this.scene.add(l);this.lights.push(l);}
 }
 clear(){
  for(const s of this.sites)s.part&&(s.part.burning=false);
  this.sites=[];this.hearth=null;
  this.mesh.count=0;this.mesh.instanceMatrix.needsUpdate=true;
  for(const l of this.lights){l.visible=false;l.intensity=0;}
 }
 buildHearth(world){
  if(world.name!=='Living room'){this.hearth=null;return;}
  const x=-5.15,z=4.18,y=0;
  const stone=world.mat(0x6d675c,.92),dark=world.mat(0x3a342c,.9),brick=world.mat(0x7a5a48,.88);
  const g=new T.Group();g.name='Fireplace';g.position.set(x,y,z);world.root.add(g);
  const box=(sx,sy,sz,px,py,pz,m)=>{const o=new T.Mesh(new T.BoxGeometry(sx,sy,sz),m);o.position.set(px,py,pz);o.castShadow=o.receiveShadow=true;g.add(o);return o;};
  box(1.28,.12,.42,0,.06,0,stone);
  box(.16,1.18,.38,-.52,.70,0,brick);box(.16,1.18,.38,.52,.70,0,brick);
  box(1.20,.16,.38,0,1.32,0,stone);
  box(1.10,.10,.10,0,1.44,0,dark);
  const back=box(1.00,.92,.06,0,.62,-.16,dark);
  const opening={x,y:.62,z:z+.04,w:.84,h:.92,d:.28};
  world.obstacle(x,z,.70, .22, 0, 1.4, g);
  g.traverse(m=>{if(m.isMesh){world.pickables.push(m);m.userData.hearth=true;}});
  this.hearth={group:g,opening,logs:[],lit:false,heat:0,back};
  for(let i=0;i<2;i++){
   const log=this.spawnLog(world,x+(i-.5)*.12,0.16,z+.02,false);
   this.tryLoadLog(log);
  }
  for(let i=0;i<3;i++)this.spawnLog(world,x-0.78,0.08,z-0.08-i*.12,true);
  this.mountExtinguisherCase(world,-3.78,1.18,4.28,0);
 }
 mountExtinguisherCase(world,x,y,z,yaw=0){
  const g=new T.Group();g.position.set(x,y,z);g.rotation.y=yaw;world.root.add(g);
  const red=new T.MeshStandardMaterial({color:0xb01c1c,roughness:.42,metalness:.28});
  const dark=new T.MeshStandardMaterial({color:0x3a1212,roughness:.55,metalness:.2});
  const chrome=new T.MeshStandardMaterial({color:0xc5ced4,roughness:.22,metalness:.82});
  const add=(mesh,px,py,pz)=>{mesh.position.set(px,py,pz);mesh.castShadow=true;g.add(mesh);return mesh;};
  add(new T.Mesh(new T.BoxGeometry(.34,.78,.04),red),0,0,.06);
  add(new T.Mesh(new T.BoxGeometry(.34,.04,.16),red),0,.37,.0);
  add(new T.Mesh(new T.BoxGeometry(.34,.04,.16),red),0,-.37,.0);
  add(new T.Mesh(new T.BoxGeometry(.04,.70,.16),red),-.15,0,.0);
  add(new T.Mesh(new T.BoxGeometry(.04,.70,.16),red),.15,0,.0);
  const glass=add(new T.Mesh(new T.BoxGeometry(.26,.66,.012),new T.MeshPhysicalMaterial({color:0xa8c4cc,roughness:.08,metalness:.12,transparent:true,opacity:.32,transmission:.55,thickness:.01})),0,0,-.08);
  world.fractures.register(glass,'glass');
  if(glass.userData.piece){glass.userData.piece.health=8;glass.userData.piece.maxHealth=8;}
  add(new T.Mesh(new T.BoxGeometry(.04,.08,.02),chrome),.12,.02,-.09);
  add(new T.Mesh(new T.BoxGeometry(.30,.03,.14),dark),0,-.34,.0);
  g.traverse(m=>{if(m.isMesh)world.pickables.push(m);});
  world.obstacle(x,z,.36,.18,y-.42,.84,g);
  this.spawnExtinguisher(world,x,y-.02,z-.02,true,g);
 }
 spawnLog(world,x,y,z,pile=false){
  const wood=new T.MeshStandardMaterial({color:0x6b4e32,roughness:.92});
  const bark=new T.Mesh(new T.CylinderGeometry(.045,.05,.38,8),wood);
  bark.rotation.z=Math.PI/2;bark.rotation.y=(Math.random()-.5)*.4;
  const g=new T.Group();g.add(bark);g.position.set(x,y,z);world.root.add(g);
  g.castShadow=true;const furn=tagMovable(world,g,'Firewood');
  if(furn){furn.mass=Math.min(8,furn.mass||6);furn.log=true;}
  world.fractures.register(bark,'wood');
  if(bark.userData.piece){bark.userData.piece.health=22;bark.userData.piece.maxHealth=22;}
  g.userData.firewood=true;
  return g;
 }
 spawnExtinguisher(world,x,y,z,upright=false,caseGroup=null){
  const props=this.props;if(!props?.make)return null;
  let item=props.items.find(i=>i.id==='extinguisher'&&i.holder==null);
  if(!item){item=props.make('extinguisher');props.items.push(item);}
  if(caseGroup){
   caseGroup.attach(item.group);
   item.group.position.set(0,-.04,-.02);
   item.group.rotation.set(-Math.PI/2,0,0);
   item.cased=true;
  }else{
   props.scene.attach(item.group);
   item.group.position.set(x,y+(upright?0:.28),z);
   item.group.rotation.set(upright?-Math.PI/2:0,upright?0:.4,0);
   item.cased=false;
  }
  item.velocity.set(0,0,0);
  return item;
 }
 tryLoadLog(group){
  const h=this.hearth;if(!h||!group?.userData?.firewood)return false;
  if(h.logs.length>=4)return false;
  const p=group.getWorldPosition(V());
  if(p.distanceTo(new T.Vector3(h.opening.x,h.opening.y-.2,h.opening.z))>.7)return false;
  const furn=group.userData.furniture;if(furn?.held)return false;
  const i=h.logs.length;
  h.group.attach(group);
  group.position.set((i-1.2)*.11,.16+ (i%2)*.05,.02);
  group.rotation.set(0,0,.2*(i%2?1:-1));
  if(furn){furn.held='hearth';furn.velocity.set(0,0,0);furn.omega?.set(0,0,0);}
  h.logs.push(group);group.userData.inHearth=true;
  this.props.status='Log on the fire grate'+(h.lit?' · burning':' · needs a light');
  return true;
 }
 ignite(hit,fromTorch=true){
  if(!hit?.point)return false;
  unlockSfx();playSfx('whoosh');
  if(hit.object?.userData?.hearth||hit.object?.parent?.userData?.hearth){
   const h=this.hearth;if(!h||!h.logs.length){this.props.status='Fireplace needs logs first';return false;}
   h.lit=true;h.heat=1;this.ensureSite(new T.Vector3(h.opening.x,h.opening.y-.08,h.opening.z),'hearth',null,.55);
   this.props.status='Fireplace lit';return true;
  }
  const part=hit.object.userData.chunks?.[hit.instanceId]||hit.object.userData.piece||hit.object.userData.wallPart;
  if(part&&(part.kind==='plaster'||part.kind==='wood')&&!part.broken){
   this.ensureSite(hit.point.clone(),'spread',part,.42);part.burning=true;part.heat=(part.heat||0)+.8;
   this.props.status='Fire catching';return true;
  }
  const furn=hit.object.userData?.furnRoot?.userData?.furniture||hit.object.userData?.furniture;
  if(furn&&!furn.broken){this.ensureSite(hit.point.clone(),'furn',furn,.4);furn.burning=true;this.props.status='Furniture alight';return true;}
  this.ensureSite(hit.point.clone(),'ground',null,.32);
  this.props.status='Fire started';return true;
 }
 spray(origin,dir){
  unlockSfx();playSfx('whoosh',.45);
  let n=0;
  for(const s of this.sites){
   const to=s.p.clone().sub(origin);const dist=to.length();if(dist>3.4)continue;
   if(dir.dot(to.normalize())<.35)continue;
   s.heat=Math.max(0,s.heat-.55);n++;
   if(s.heat<=.05){s.dead=true;if(s.part)s.part.burning=false;if(s.furn)s.furn.burning=false;}
  }
  if(this.hearth?.lit){
   const hp=new T.Vector3(this.hearth.opening.x,this.hearth.opening.y,this.hearth.opening.z);
   if(origin.distanceTo(hp)<3.2&&dir.dot(hp.clone().sub(origin).normalize())>.2){
    this.hearth.heat=Math.max(0,this.hearth.heat-.4);
    if(this.hearth.heat<.08){this.hearth.lit=false;for(const s of this.sites)if(s.kind==='hearth')s.dead=true;}
   }
  }
  this.sites=this.sites.filter(s=>!s.dead);
  this.props.status=n?'Fire dying':'Spray missed';
  return n;
 }
 ensureSite(p,kind,ref,size){
  const near=this.sites.find(s=>s.p.distanceTo(p)<.28);
  if(near){near.heat=Math.min(1.4,near.heat+.35);near.size=Math.max(near.size,size);return near;}
  if(this.sites.length>=MAX){
   const weakest=this.sites.reduce((a,b)=>a.heat<b.heat?a:b);
   if(weakest.heat>.4)return weakest;
   weakest.dead=true;this.sites=this.sites.filter(s=>!s.dead);
  }
  const site={p:p.clone(),kind,part:kind==='spread'?ref:null,furn:kind==='furn'?ref:null,heat:.7,size,age:0,seed:Math.random()*10};
  this.sites.push(site);return site;
 }
 tick(dt){
  dt=Math.min(.05,dt);this.clock+=dt;this.mat.uniforms.time.value=this.clock;
  if(this.world.revision!==this._rev){this._rev=this.world.revision;this.clear();this.buildHearth(this.world);}
  if(this.world.name!=='Living room'||!this.world.root.visible){this.mesh.count=0;for(const l of this.lights)l.visible=false;return;}
  for(const g of this.world.movables||[])if(g.userData.firewood&&!g.userData.inHearth)this.tryLoadLog(g);
  if(this.hearth?.lit){
   this.hearth.heat=Math.min(1,this.hearth.heat+dt*.04);
   this.hearth.burnT=(this.hearth.burnT||0)+dt;
   if(this.hearth.logs.length&&this.hearth.burnT>18){
    const log=this.hearth.logs.pop();log.removeFromParent();this.hearth.burnT=0;
    if(!this.hearth.logs.length){this.hearth.lit=false;this.hearth.heat=0;for(const s of this.sites)if(s.kind==='hearth')s.dead=true;}
   }
   this.ensureSite(new T.Vector3(this.hearth.opening.x,this.hearth.opening.y-.05,this.hearth.opening.z),'hearth',null,.5+this.hearth.heat*.15);
  }
  this.sites=this.sites.filter(s=>s.kind!=='torch');
  for(const item of this.props.items||[]){
   if(item.id!=='torch'||item.holder==null)continue;
   const tip=item.group.localToWorld(new T.Vector3(0,.03,-.44));
   this.ensureSite(tip,'torch',null,.2).heat=1;
  }
  this.spreadT+=dt;
  if(this.spreadT>.55){this.spreadT=0;this.spread();}
  this.damage(dt);
  this.sites=this.sites.filter(s=>{s.age+=dt;if(s.kind==='torch')return true;if(s.kind==='hearth'&&!this.hearth?.lit)return false;if(s.part?.broken)return false;if(s.furn?.broken)return false;s.heat=Math.max(0,s.heat-dt*(s.kind==='hearth'?0:.012));return s.heat>.06&&!s.dead;});
  this.draw();
  this.npcDuty(dt);
 }
 spread(){
  const parts=this.world.fractures?.parts;if(!parts)return;
  for(const s of this.sites){
   if(s.heat<.45||s.kind==='hearth'||s.kind==='torch')continue;
   for(const part of parts){
    if(part.broken||part.burning||(part.kind!=='plaster'&&part.kind!=='wood'))continue;
    const d=part.p.distanceTo(s.p);if(d>.85||d<.02)continue;
    part.heat=(part.heat||0)+.22*(s.heat);
    if(part.heat>=1){part.burning=true;this.ensureSite(part.p.clone(),'spread',part,.38);}
   }
  }
 }
 damage(dt){
  const dir=new T.Vector3(0,.2,1);
  for(const s of this.sites){
   if(s.kind==='hearth'||s.kind==='torch')continue;
   const energy=18*dt*s.heat;
   if(s.part&&!s.part.broken)this.world.fractures.impact({object:s.part.mesh,instanceId:s.part.index,point:s.p,face:{normal:new T.Vector3(0,0,1)}},energy,dir,'laser',0);
   if(s.furn&&!s.furn.broken)this.props.damageFurniture(s.furn,energy*1.1,dir,'laser',0,{point:s.p,object:s.furn.obstacle?.object});
  }
 }
 draw(){
  let i=0,li=0;const n=this.mesh.geometry.attributes.aSeed.count;
  for(const s of this.sites){
   const tongues=s.kind==='hearth'?4:3;
   for(let k=0;k<tongues&&i<n;k++){
    const flicker=.85+.15*Math.sin(this.clock*14+s.seed+k);
    this.dummy.position.set(s.p.x+(k-1)*s.size*.18,s.p.y+s.size*.22,s.p.z+(k%2?s.size*.06:-s.size*.04));
    this.dummy.scale.set(s.size*(.7+k*.12)*flicker,s.size*(.9+s.heat*.5)*flicker,1);
    this.dummy.lookAt(this.dummy.position.x+Math.sin(this.clock*3+k)*.2,this.dummy.position.y+1,this.dummy.position.z+Math.cos(this.clock*2+k)*.2);
    this.dummy.updateMatrix();this.mesh.setMatrixAt(i++,this.dummy.matrix);
   }
   if(li<this.lights.length){
    const L=this.lights[li++];L.visible=true;L.position.copy(s.p).y+=.25;
    L.intensity=(s.kind==='hearth'?3.2:1.6)*s.heat*(.85+.15*Math.sin(this.clock*9+s.seed));
    L.distance=s.kind==='hearth'?5.5:4.2;
   }
  }
  this.mesh.count=i;this.mesh.instanceMatrix.needsUpdate=true;
  for(;li<this.lights.length;li++){this.lights[li].visible=false;this.lights[li].intensity=0;}
 }
 nearestFire(from,max=9){
  let best=null,d=max;
  for(const s of this.sites){if(s.kind==='hearth'||s.kind==='torch')continue;const n=from.distanceTo(s.p);if(n<d){d=n;best=s;}}
  return best;
 }
 npcDuty(dt){
  if(!this.sites.some(s=>s.kind!=='hearth'&&s.heat>.3)){
   for(const a of this.props.system?.actors||[])if(a.fireDuty){this.releaseNpc(a);a.fireDuty=null;}
   return;
  }
  const ext=this.props.items.filter(i=>i.id==='extinguisher'&&(i.holder==null||i.holder?.bones));
  for(const a of this.props.system?.actors||[]){
   if(a.dead||a.held||a.seat)continue;
   const ap=a.group.position;
   const blaze=this.nearestFire(ap,10);if(!blaze){if(a.fireDuty){this.releaseNpc(a);a.fireDuty=null;}continue;}
   a.fireDuty??={phase:'seek'};
   const duty=a.fireDuty;
   if(duty.phase==='seek'){
    const tool=ext.find(i=>i.holder==null||i.holder===a);
    if(!tool)continue;
    if(tool.holder!==a){
     const tp=tool.group.getWorldPosition(V());
     if(ap.distanceTo(tp)>1.1){
      if(!a.dest||a.dest.distanceToSquared(tp)>1.6)this.world.walk?.(a,tp);
      continue;
     }
     this.props.hold(tool,a);
    }
    duty.phase='spray';
   }
   if(duty.phase==='spray'){
    const tool=this.props.items.find(i=>i.id==='extinguisher'&&i.holder===a);
    if(!tool){duty.phase='seek';continue;}
    if(ap.distanceTo(blaze.p)>1.35){
     if(!a.dest||a.dest.distanceToSquared(blaze.p)>1.6)this.world.walk?.(a,blaze.p);
     continue;
    }
    a.dest=null;a.navigation=null;a.directedWalk=null;
    const dir=blaze.p.clone().sub(ap);dir.y=0;if(dir.lengthSq()>.01)a.group.rotation.y=Math.atan2(dir.x,dir.z);
    duty.cool=(duty.cool||0)-dt;
    if(duty.cool<=0){duty.cool=.28;const origin=a.bones?.R_Hand?.getWorldPosition(V())||ap.clone().setY(ap.y+1.1);this.spray(origin,blaze.p.clone().sub(origin).normalize());}
   }
  }
 }
 releaseNpc(a){
  for(const [k,item] of this.props.held)if(k===a)this.props.drop(a);
 }
}

export function buildTorch(add){
 const wood=new T.MeshStandardMaterial({color:0x5a3d24,roughness:.9});
 const wrap=new T.MeshStandardMaterial({color:0xc9b48a,roughness:.85});
 const shaft=add(new T.CylinderGeometry(.016,.02,.42,8),wood,0,.02,-.18);shaft.rotation.x=Math.PI/2;
 add(new T.CylinderGeometry(.028,.022,.08,8),wrap,0,.03,-.38);
 add(new T.SphereGeometry(.03,8,6),new T.MeshBasicMaterial({color:0xff7a28}),0,.03,-.44);
}
export function buildExtinguisher(add){
 const red=new T.MeshStandardMaterial({color:0xb42222,roughness:.45,metalness:.25});
 const metal=new T.MeshStandardMaterial({color:0x9aa3a8,roughness:.3,metalness:.7});
 const body=add(new T.CylinderGeometry(.055,.06,.32,12),red,0,.04,-.12);body.rotation.x=Math.PI/2;
 add(new T.CylinderGeometry(.018,.018,.08,8),metal,0,.09,-.02);
 const hose=add(new T.CylinderGeometry(.01,.01,.14,6),metal,0,.07,-.28);hose.rotation.x=.6;
 add(new T.BoxGeometry(.04,.03,.05),metal,0,.11,-.34);
}

export function installFire(props){
 const sys=new FireSystem(props);props.flames=sys;props.world.fire=sys;sys.buildHearth(props.world);return sys;
}
