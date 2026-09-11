import * as THREE from 'three';
import { floorAt } from './DogPaws.js?v=17.8.0';
const V=()=>new THREE.Vector3(),R=.018,CAP=200;
const pos=(p,out=V())=>Array.isArray(p)?out.fromArray(p):p?.isVector3?out.copy(p):out.set(p?.x||0,p?.y||0,p?.z||0);

export class DogItems {
 constructor(ctx){
  this.ctx=ctx;this.items=[];this.serial=0;this.time=0;this.disposed=false;this.slow=false;
  this.particles=Array.from({length:CAP},()=>({active:false,p:V(),v:V(),rest:false,bowl:null,local:V(),cat:false}));
  this.dummy=new THREE.Object3D();this.material=new THREE.MeshStandardMaterial({color:0x9b6332,roughness:.96});
  this.mesh=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(R,0),this.material,CAP);
  this.mesh.name='Dog_Kibble_200';this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.mesh.frustumCulled=false;
  this.mesh.castShadow=false;this.mesh.receiveShadow=true;
  this.catMat=new THREE.MeshStandardMaterial({color:0xd4a24a,roughness:.9});
  this.catMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.022,.01,.016),this.catMat,CAP);
  this.catMesh.name='Cat_Kibble_200';this.catMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.catMesh.frustumCulled=false;
  this.dummy.scale.setScalar(0);this.dummy.updateMatrix();for(let i=0;i<CAP;i++){this.mesh.setMatrixAt(i,this.dummy.matrix);this.catMesh.setMatrixAt(i,this.dummy.matrix);}
  ctx.scene?.add(this.mesh,this.catMesh);this.tug=null;this.bindImpact();
 }
 bindImpact(){
  const props=this.ctx.props;if(!props||props.impact===this.wrapper)return;
  this.unbindImpact();this.props=props;this.original=props.impact;const self=this,original=this.original;
  this.wrapper=function(hit,energy,dir,kind,sharpness){
   if(!self.disposed&&self.impact(hit,energy,dir,kind,sharpness))return true;
   return original?.apply(this,arguments);
  };props.impact=this.wrapper;
 }
 unbindImpact(){if(this.props&&this.wrapper&&this.props.impact===this.wrapper)this.props.impact=this.original;}
 resolve(hit){for(let o=hit?.mesh||hit?.object||hit;o;o=o.parent)if(o.userData?.dogItem)return o.userData.dogItem;return null;}
 isHeld(item){
  if(item.owner&&item.owner!=='player')return false;
  const u=item.group.userData,f=u.furniture||{};
  if(item.controller||u.held||u.heldBy||f.held||f.heldBy||f.holder||f.grab)return true;
  for(let p=item.group.parent;p&&p!==this.ctx.scene;p=p.parent)if(p.isXRController||p.userData?.inputSource||p.userData?.handedness)return true;
  return false;
 }
 setHeld(group,controller,velocity){
  const item=this.resolve(group);if(!item)return false;
  if(controller){if(item.owner&&item.owner!=='player')this.releaseDog(item.owner);item.controller=controller;item.owner='player';}
  else{item.controller=null;item.group.userData.furniture.heldBy=null;item.owner=null;if(velocity)item.velocity.copy(velocity);}
  return true;
 }
 movable(group,enabled=true){
  const w=this.ctx.world;if(!w)return;w.movables??=[];const list=w.movables;
  if(list instanceof Set){if(enabled)list.add(group);else list.delete(group);}
  else if(Array.isArray(list)){const i=list.indexOf(group);if(enabled&&i<0)list.push(group);else if(!enabled&&i>=0)list.splice(i,1);}
 }
 register(type,g,p,mass,volume){
  g.name=`Dog_${type}_${++this.serial}`;this.ctx.scene?.add(g);g.position.copy(this.ctx.scene?.worldToLocal(pos(p))||pos(p));
  const item={id:g.name,type,group:g,owner:null,controller:null,velocity:V(),angularVelocity:V(),previous:g.getWorldPosition(V()),heldLast:false,heldSince:0,stillFor:0,throwSerial:0,health:(type==='bag'||type==='catbag')?24:100,remaining:(type==='bag'||type==='catbag')?200:0,torn:false,nextInterest:0};
  g.userData.dogItem=item;g.userData.pickable=true;
  g.userData.furniture={id:item.id,mass,volume,density:mass/volume,velocity:item.velocity,vel:item.velocity,angularVelocity:item.angularVelocity,heldBy:null};
  g.userData.health=item.health;g.userData.kind=type==='bag'||type==='catbag'?'paper':type==='bone'?'bone':type==='chicken'?'rubber':'ceramic';
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.userData.dogItem=item;}});
  const w=this.ctx.world;if(w){w.movables??=[];if(w.movables instanceof Set)w.movables.add(g);else if(Array.isArray(w.movables)&&!w.movables.includes(g))w.movables.push(g);}
  this.items.push(item);return g;
 }
 spawnBone(p){
  const g=new THREE.Group(),m=new THREE.MeshStandardMaterial({color:0xe5d2ae,roughness:.72});
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.20,9),m);shaft.rotation.z=Math.PI/2;shaft.position.y=.04;g.add(shaft);
  const geo=new THREE.SphereGeometry(.037,9,6);for(const x of [-.105,.105])for(const z of [-.018,.018]){const a=new THREE.Mesh(geo,m);a.position.set(x,.04,z);g.add(a);}
  return this.register('bone',g,p,.18,.0007);
 }
 spawnChicken(p){
  const g=new THREE.Group(),yel=new THREE.MeshStandardMaterial({color:0xf0c93a,roughness:.55}),red=new THREE.MeshStandardMaterial({color:0xc43b3b,roughness:.7}),org=new THREE.MeshStandardMaterial({color:0xe07a28,roughness:.6});
  const body=new THREE.Mesh(new THREE.SphereGeometry(.055,10,8),yel);body.scale.set(1.15,.85,1);body.position.y=.055;g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.028,8,6),yel);head.position.set(.05,.08,0);g.add(head);
  const beak=new THREE.Mesh(new THREE.ConeGeometry(.012,.028,6),org);beak.rotation.z=-Math.PI/2;beak.position.set(.078,.078,0);g.add(beak);
  const comb=new THREE.Mesh(new THREE.BoxGeometry(.018,.022,.008),red);comb.position.set(.048,.108,0);g.add(comb);
  const wattle=new THREE.Mesh(new THREE.SphereGeometry(.008,6,4),red);wattle.position.set(.062,.058,0);g.add(wattle);
  return this.register('chicken',g,p,.12,.0005);
 }
 spawnCatBag(p){
  const g=new THREE.Group(),paper=new THREE.MeshStandardMaterial({color:0x3d8b8a,roughness:.99}),cream=new THREE.MeshStandardMaterial({color:0xf0e6c8,roughness:1}),ink=new THREE.MeshStandardMaterial({color:0x1f4f52,roughness:1});
  const geo=new THREE.BoxGeometry(.24,.34,.13,2,3,1),a=geo.attributes.position;
  for(let i=0;i<a.count;i++){const y=a.getY(i),t=(y+.17)/.34;a.setXYZ(i,a.getX(i)*(1-.16*t),y+.17,a.getZ(i)*(1-.30*t));}
  geo.computeVertexNormals();const body=new THREE.Mesh(geo,paper);g.add(body);
  const band=new THREE.Mesh(new THREE.BoxGeometry(.22,.07,.132),cream);band.position.y=.16;g.add(band);
  const fish=new THREE.Mesh(new THREE.SphereGeometry(.04,8,6),ink);fish.scale.set(1.4,.55,.35);fish.position.set(0,.16,.07);g.add(fish);
  const top=new THREE.Mesh(new THREE.BoxGeometry(.20,.022,.09),paper);top.position.y=.35;g.add(top);
  const flap=new THREE.Mesh(new THREE.ConeGeometry(.11,.11,5,1,true),paper);flap.position.y=.32;flap.rotation.z=.75;flap.visible=false;g.add(flap);
  const mouth=new THREE.Mesh(new THREE.CircleGeometry(.075,8),ink);mouth.rotation.x=-Math.PI/2;mouth.position.y=.341;mouth.visible=false;g.add(mouth);
  this.register('catbag',g,p,.65,.011);Object.assign(g.userData.dogItem,{top,flap,mouth});return g;
 }
 spawnKibbleBag(p){
  const g=new THREE.Group(),paper=new THREE.MeshStandardMaterial({color:0xc9ac75,roughness:.99}),ink=new THREE.MeshStandardMaterial({color:0x69513a,roughness:1});
  const geo=new THREE.BoxGeometry(.25,.36,.14,2,3,1),a=geo.attributes.position;
  for(let i=0;i<a.count;i++){const y=a.getY(i),t=(y+.18)/.36;a.setXYZ(i,a.getX(i)*(1-.20*t),y+.18,a.getZ(i)*(1-.35*t)+Math.sin(y*48)*.003);}
  geo.computeVertexNormals();const body=new THREE.Mesh(geo,paper);g.add(body);
  const stripe=new THREE.Mesh(new THREE.BoxGeometry(.22,.055,.143),ink);stripe.position.y=.18;g.add(stripe);
  const top=new THREE.Mesh(new THREE.BoxGeometry(.205,.024,.094),paper);top.position.y=.37;g.add(top);
  const flap=new THREE.Mesh(new THREE.ConeGeometry(.12,.12,5,1,true),paper);flap.position.y=.34;flap.rotation.z=.75;flap.visible=false;g.add(flap);
  const mouth=new THREE.Mesh(new THREE.CircleGeometry(.08,8),ink);mouth.rotation.x=-Math.PI/2;mouth.position.y=.361;mouth.visible=false;g.add(mouth);
  this.register('bag',g,p,.7,.012);Object.assign(g.userData.dogItem,{top,flap,mouth});return g;
 }
 spawnBowl(p){
  const g=new THREE.Group(),m=new THREE.MeshStandardMaterial({color:0x617b8b,roughness:.3,metalness:.15,side:THREE.DoubleSide});
  const profile=[[0,.024],[.16,.024],[.205,.09],[.22,.09],[.183,0],[0,0]].map(a=>new THREE.Vector2(...a));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(profile,24),m));
  const out=this.register('bowl',g,p,.45,.005);out.userData.dogItem.bounds=new THREE.Box3();return out;
 }
 impact(hit,energy,dir,kind='blunt',sharpness=0){
  const a=this.resolve(hit);if(!a||(a.type!=='bag'&&a.type!=='catbag'))return false;
  if(a.torn)return true;
  a.health=Math.max(0,a.health-Math.max(0,Number(energy)||0)*(kind==='cut'?1: .35));a.group.userData.health=a.health;
  if(a.health===0){a.torn=true;a.top.visible=false;a.flap.visible=true;a.mouth.visible=true;}
  return true;
 }
 spill(item){
  if(!item.torn||item.remaining<=0)return;
  const origin=item.group.localToWorld(new THREE.Vector3(0,.37,0));let emitted=0;const cat=item.type==='catbag';
  for(const p of this.particles){if(p.active)continue;p.active=true;p.rest=false;p.bowl=null;p.cat=cat;p.p.copy(origin).add(new THREE.Vector3((Math.random()-.5)*.18,Math.random()*.10,(Math.random()-.5)*.12));p.v.set((Math.random()-.5)*.7,.25+Math.random()*.6,(Math.random()-.5)*.7);item.remaining--;if(++emitted>=200||!item.remaining)break;}
 }
 isToy(item){return item&&(item.type==='bone'||item.type==='chicken');}
 carry(item,handle){
  if(!this.isToy(item)||this.isHeld(item))return false;
  if(item.owner&&item.owner!==handle)this.drop(item);
  this.movable(item.group,false);item.owner=handle;item.velocity.set(0,0,0);handle.bones.Jaw.add(item.group);
  item.group.position.set(0,item.type==='chicken'?-.02:-.03,item.type==='chicken'?.11:.13);
  item.group.rotation.set(0,item.type==='chicken'?.4:0,0);item.previous.copy(item.group.getWorldPosition(V()));return true;
 }
 drop(item,p,velocity){
  if(!item)return;const old=item.group.getWorldPosition(V());this.ctx.scene?.attach(item.group);
  const w=p?pos(p):old;item.group.position.copy(item.group.parent?.worldToLocal(w.clone())||w);item.group.rotation.set(0,item.group.rotation.y,0);
  this.movable(item.group,true);item.owner=null;item.controller=null;item.velocity.copy(velocity||new THREE.Vector3(0,.15,.08));item.previous.copy(w);item.nextInterest=this.time+10;
 }
 releaseDog(h){for(const a of this.items)if(a.owner===h)this.drop(a);h._ai?.cancelFetch?.();}
 takeFromMouth(h,controller){const a=this.items.find(a=>a.owner===h);if(!a)return null;this.drop(a);h._ai.cancelFetch();a.nextInterest=this.time+8;this.setHeld(a.group,controller);controller?.attach?.(a.group);return a.group;}
 foodNear(point,range=2){let best=null,d=range;for(const p of this.particles){if(!p.active||!p.rest)continue;const n=p.p.distanceTo(point);if(n<d){d=n;best=p;}}return best;}
 bowlFood(){return this.particles.some(p=>p.active&&p.bowl);}
 eat(point,needs,radius=.13){
  if(needs.hunger>=99.999)return false;
  const p=this.particles.find(p=>p.active&&p.p.distanceTo(point)<radius);if(!p)return false;
  p.active=false;p.rest=true;p.bowl=null;p.v.set(0,0,0);needs.eat();this.write(this.particles.indexOf(p));return true;
 }
 write(i){
  const p=this.particles[i];this.dummy.position.copy(p.p);if(this.mesh.parent)this.mesh.parent.worldToLocal(this.dummy.position);
  this.dummy.scale.setScalar(p.active&&!p.cat?1:0);this.dummy.updateMatrix();this.mesh.setMatrixAt(i,this.dummy.matrix);this.mesh.instanceMatrix.needsUpdate=true;
  this.dummy.scale.setScalar(p.active&&p.cat?1:0);this.dummy.rotation.y=i*.7;this.dummy.updateMatrix();this.catMesh.setMatrixAt(i,this.dummy.matrix);this.catMesh.instanceMatrix.needsUpdate=true;this.dummy.rotation.set(0,0,0);
 }
 tick(dt){
  if(this.disposed)return;this.time+=dt;this.bindImpact();if(!this.mesh.parent)this.ctx.scene?.add(this.mesh);if(!this.catMesh.parent)this.ctx.scene?.add(this.catMesh);
  for(const a of this.items){
   const g=a.group,w=g.getWorldPosition(V()),held=this.isHeld(a),measured=w.clone().sub(a.previous).divideScalar(Math.max(dt,.001));
   if(held){if(!a.heldLast)a.heldSince=this.time;a.owner='player';a.stillFor=measured.length()<.06?a.stillFor+dt:0;a.sampleVelocity=measured.clone();}
   else if(a.heldLast){a.owner=null;if(a.velocity.length()<1.2&&a.sampleVelocity)a.velocity.copy(a.sampleVelocity);if(Math.max(a.velocity.length(),measured.length())>1.2)a.throwSerial++;a.stillFor=0;}
   else if(a.owner==='player')a.owner=null;
   const movingExternally=w.distanceToSquared(a.previous)>1e-8;
   // A furniture integrator that already moved the object owns this frame's motion.
   if(!held&&!a.owner&&!movingExternally){
    a.velocity.y-=(Number.isFinite(this.ctx.world?.gravity)?this.ctx.world.gravity:9.8)*dt;w.addScaledVector(a.velocity,dt);const floor=floorAt(this.ctx.world,w.x,w.z,0);
    if(w.y<floor){w.y=floor;a.velocity.y=0;a.velocity.x*=Math.exp(-6*dt);a.velocity.z*=Math.exp(-6*dt);}
    const center=w.clone().add(new THREE.Vector3(0,.04,0));this.ctx.world?.projectSphere?.(center,.04);w.copy(center).add(new THREE.Vector3(0,-.04,0));g.position.copy(g.parent?.worldToLocal(w.clone())||w);
   }else if(!held&&!a.owner&&measured.length()>1.2&&this.isToy(a)&&this.time>(a.externalThrowUntil||0)){a.throwSerial++;a.externalThrowUntil=this.time+1;}
   a.heldLast=held;a.previous.copy(g.getWorldPosition(V()));if(a.torn)this.spill(a);
  }
  const bowls=this.items.filter(a=>a.type==='bowl');for(const a of bowls){a.group.updateWorldMatrix(true,true);a.bounds.setFromObject(a.group);}
  for(let i=0;i<CAP;i++){
   const p=this.particles[i];if(!p.active)continue;
   if(p.bowl){
    const q=p.bowl.group.localToWorld(p.local.clone()),up=new THREE.Vector3(0,1,0).transformDirection(p.bowl.group.matrixWorld);
    p.p.copy(q);if(up.y<.65){p.bowl=null;p.rest=false;p.v.set(0,0,0);}else{this.write(i);continue;}
   }
   if(p.rest)continue;
   const before=p.p.y;p.v.y-=9.8*dt;p.p.addScaledVector(p.v,dt);
   let landed=false;
   for(const a of bowls){if(new THREE.Vector3(0,1,0).transformDirection(a.group.matrixWorld).y<.65)continue;const local=a.group.worldToLocal(p.p.clone()),b=a.bounds;
    if(p.p.x>=b.min.x&&p.p.x<=b.max.x&&p.p.z>=b.min.z&&p.p.z<=b.max.z&&Math.hypot(local.x,local.z)<.16&&local.y<.12&&before>=b.min.y+.02&&p.v.y<=0){
     local.y=.024+R;p.local.copy(local);p.p.copy(a.group.localToWorld(local));p.bowl=a;p.rest=true;p.v.set(0,0,0);landed=true;break;
    }
   }
   if(!landed){
    const floor=floorAt(this.ctx.world,p.p.x,p.p.z,0)+R;
    if(p.p.y<=floor){p.p.y=floor;p.v.y=0;p.v.x*=.65;p.v.z*=.65;if(p.v.lengthSq()<.003){p.rest=true;p.v.set(0,0,0);}}
    // One cheap host sphere projection per airborne pebble; no all-wall rigid bodies.
    this.ctx.world?.projectSphere?.(p.p,R);
   }
   this.write(i);
  }
  if(!this.slow)this.separate();
 }
 separate(){
  // Spatial buckets, with at most four neighbor nudges each; sleeping food stays asleep.
  const cells=new Map();for(let i=0;i<CAP;i++){const p=this.particles[i];if(!p.active||p.bowl)continue;const x=Math.floor(p.p.x/.04),z=Math.floor(p.p.z/.04);let nudges=0;
   if(!p.rest)for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(const j of cells.get(`${x+dx},${z+dz}`)||[]){if(nudges>=4)break;const q=this.particles[j],d=p.p.clone().sub(q.p);if(Math.abs(d.y)>.035)continue;d.y=0;const n=d.length();if(n>1e-5&&n<R*1.8){p.p.addScaledVector(d,(R*1.8-n)*.25/n);nudges++;}}
   const key=`${x},${z}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(i);if(nudges)this.write(i);
  }
 }
 dispose(){
  this.disposed=true;this.unbindImpact();const geometries=new Set(),materials=new Set();
  for(const a of this.items){const w=this.ctx.world?.movables;if(w instanceof Set)w.delete(a.group);else if(Array.isArray(w)){const i=w.indexOf(a.group);if(i>=0)w.splice(i,1);}a.group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});a.group.removeFromParent();}
  for(const g of geometries)g.dispose();for(const m of materials)m.dispose();this.items.length=0;
  this.mesh.removeFromParent();this.mesh.geometry.dispose();this.material.dispose();this.mesh.dispose();
  this.catMesh.removeFromParent();this.catMesh.geometry.dispose();this.catMat.dispose();this.catMesh.dispose();
  for(const p of this.particles)p.active=false;
 }
}
