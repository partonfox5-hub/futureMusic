import * as T from 'three';
const V=()=>new T.Vector3(),Q=()=>new T.Quaternion();
const visible=o=>{while(o){if(!o.visible)return false;o=o.parent;}return true;};
export const WEAPONS={sword:{name:'Sword',mass:1.4,reach:.95,sharpness:.85,kind:'cut'},mace:{name:'Mace',mass:2.8,reach:.66,sharpness:0,kind:'blunt'},pistol:{name:'Pistol',mass:.9,reach:.24,kind:'bullet'},laser:{name:'Laser pistol',mass:1.2,reach:.28,kind:'laser'}};
export class Props {
 constructor({scene,system,world,wardrobe,camera,renderer,rig}){Object.assign(this,{scene,system,world,wardrobe,camera,renderer,rig});this.items=[];this.held=new Map();this.shots=[];this.effects=[];this.marks=[];this.time=0;this.revision=-1;this.rc=new T.Raycaster();this.status='Weapons are on the living-room table.';this._focusBox=new T.Box3();this._focusSize=new T.Vector3();this._focusCenter=new T.Vector3();this.focusGlow=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial({color:0x66d8ff,transparent:true,opacity:.16,depthWrite:false,side:T.BackSide,toneMapped:false}));this.focusGlow.renderOrder=18;this.focusGlow.visible=false;this.focusGlow.frustumCulled=false;this.focusEdges=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(1.02,1.02,1.02)),new T.LineBasicMaterial({color:0xb8f0ff,transparent:true,opacity:.95,depthTest:false,toneMapped:false}));this.focusEdges.renderOrder=19;this.focusEdges.visible=false;this.scene.add(this.focusGlow,this.focusEdges);this.syncWorld();}
 tex(file){if(!this._maps)this._maps={};if(this._maps[file])return this._maps[file];const t=new T.TextureLoader().load('/human3/assets/tex/'+file);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return this._maps[file]=t;}
 make(id){
  const data=WEAPONS[id],group=new T.Group();
  const steel=new T.MeshStandardMaterial({color:0xffffff,map:this.tex('gun_steel.jpg'),roughness:.28,metalness:.82});
  const blued=new T.MeshStandardMaterial({color:0x3a4048,map:this.tex('gun_steel.jpg'),roughness:.38,metalness:.7});
  const leather=new T.MeshStandardMaterial({color:0xffffff,map:this.tex('grip_leather.jpg'),roughness:.92,metalness:0});
  const wood=new T.MeshStandardMaterial({color:0xffffff,map:this.tex('walnut_wood.jpg'),roughness:.88,metalness:.05});
  const add=(geom,mat,x,y,z,rx=0,ry=0,rz=0)=>{const m=new T.Mesh(geom,mat);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=true;group.add(m);return m;};
  // Origin sits in the palm. +Y up the grip, -Z out the barrel / blade.
  if(id==='sword'){
   add(new T.CylinderGeometry(.017,.019,.13,24),leather,0,.02,.01,Math.PI/2,0,0);
   add(new T.BoxGeometry(.16,.014,.028,8,2,4),steel,0,.02,-.08);
   add(new T.BoxGeometry(.034,.01,.78,6,2,24),steel,0,.02,-.50);
   const tip=add(new T.ConeGeometry(.017,.14,16),steel,0,.02,-.96);tip.rotation.x=-Math.PI/2;
   add(new T.CylinderGeometry(.022,.022,.028,20),blued,0,.02,.08,Math.PI/2,0,0);
  }else if(id==='mace'){
   add(new T.CylinderGeometry(.016,.02,.5,24),wood,0,.02,-.22,Math.PI/2,0,0);
   add(new T.SphereGeometry(.095,28,20),steel,0,.02,-.54);
   for(let i=0;i<12;i++){const spike=add(new T.ConeGeometry(.016,.1,10),steel,0,.02,-.54);spike.rotation.z=i*Math.PI/6;spike.translateY(.09);}
  }else{
   add(new T.BoxGeometry(.034,.12,.04,4,10,4),leather,0,.05,.018, .22,0,0);
   add(new T.BoxGeometry(.036,.042,.16,4,4,12),blued,0,.04,-.09);
   add(new T.BoxGeometry(.04,.028,.12,4,3,8),steel,0,.018,-.06);
   add(new T.CylinderGeometry(.011,.009,.07,20),blued,0,.036,-.20,Math.PI/2,0,0);
   add(new T.TorusGeometry(.02,.0045,12,24),steel,0,-.01,-.03,0,Math.PI/2,0);
   add(new T.BoxGeometry(.008,.024,.012),steel,0,-.002,-.012);
   add(new T.BoxGeometry(.01,.01,.022),blued,0,.064,-.16);
   if(id==='laser')for(const x of [-.022,.022])add(new T.BoxGeometry(.007,.014,.12),new T.MeshBasicMaterial({color:0x9df5ff}),x,.04,-.1);
  }
  group.traverse(m=>m.userData.weapon=id);
  const item={id,data,group,holder:null,lastTip:null,lastPoint:null,velocity:V(),lastHit:new Map(),kick:0,swing:0};
  this.scene.add(group);return item;
 }
 syncWorld(){
  if(this.revision===this.world.revision)return;this.revision=this.world.revision;
  if(this.restraints){for(const l of [...this.restraints.links])this.restraints.remove(l);this.restraints.cancel();}
  for(const m of this.marks.filter(m=>!m.actor))this.dispose(m.mesh);this.marks=this.marks.filter(m=>m.actor);
  this.shots=[];for(const e of this.effects)this.dispose(e.mesh);this.effects=[];
  const kept=[];
  for(const item of this.items){
   if(item.holder!==null){kept.push(item);continue;}
   item.group.removeFromParent();item.group.traverse(m=>{m.geometry?.dispose();m.material?.dispose?.();});
  }
  this.items=kept;
  const heldIds=new Set(kept.map(i=>i.id));
  if(this.world.name!=='Living room')return;
  const p=this.world.tableAnchor;if(!p)return;
  Object.keys(WEAPONS).forEach((id,i)=>{
   if(heldIds.has(id))return;
   const item=this.make(id);
   item.group.position.set(i<2?p.x-.55:p.x+.42,p.y+.07,p.z+(i%2?.20:-.18));
   item.group.rotation.set(0,i<2?-Math.PI/2:0,0);
   this.items.push(item);
  });
 }
 ray(i){const c=this.system.hands.ctrl[i];return new T.Ray(c.getWorldPosition(V()),new T.Vector3(0,0,-1).applyQuaternion(c.getWorldQuaternion(Q())));}
 weaponHit(ray){this.rc.ray.copy(ray);this.rc.far=8;const h=this.rc.intersectObjects(this.items.filter(x=>x.holder===null).map(x=>x.group),true).find(h=>visible(h.object));if(!h)return null;const blocker=this.hit(ray,h.distance,false);if(blocker&&blocker.distance<h.distance-.005)return null;return this.items.find(x=>x.id===h.object.userData.weapon);}
 handParent(key,gun){if(key==='desktop')return this.camera;const hands=this.system.hands;if(!hands)return null;return gun?hands.ctrl[key]:hands.grip[key];}
 applyHoldPose(item){
  const key=item.holder,gun=item.data.kind==='bullet'||item.data.kind==='laser',vr=key!=='desktop';
  if(vr&&!this.renderer.xr.isPresenting){this.drop(key);return;}
  const parent=this.handParent(key,gun);if(!parent){this.drop(key);return;}
  if(item.group.parent!==parent)parent.attach(item.group);
  if(vr){item.group.position.set(0,gun?-.018:-.008,gun?-.06:-.028);item.group.rotation.set(gun?-.14:-.1,0,0);}
  else{item.group.position.set(gun?.16:.20,gun?-.10:-.14,gun?-.38:-.42);item.group.rotation.set(gun?.12:0,0,0);}
  if(item.kick)item.group.rotation.x-=item.kick*1.6;
  if(item.swing>0)item.group.rotation.y+=Math.sin(item.swing/.30*Math.PI)*1.1;
  item.group.updateMatrixWorld(true);
 }
 hold(item,key){if(!item||item.holder!==null)return false;this.drop(key);item.holder=key;item.lastTip=null;item.lastPoint=null;item.velocity.set(0,0,0);this.held.set(key,item);this.applyHoldPose(item);this.status=item.data.name+' held · '+(key==='desktop'?'click to use, Q to drop':'stays in hand · trigger fires · release grip to drop');return true;}
 equip(id){return this.hold(this.items.find(i=>i.id===id),'desktop');}
 drop(key){const item=this.held.get(key);if(!item)return;item.group.updateMatrixWorld(true);this.scene.attach(item.group);item.holder=null;item.lastTip=null;item.lastPoint=null;this.held.delete(key);this.status='Dropped '+item.data.name;}
 grip(i){if(this.vehicle?.grip(i))return true;const p=this.system.hands.grip[i].getWorldPosition(V()),item=this.items.filter(x=>x.holder===null).sort((a,b)=>a.group.getWorldPosition(V()).distanceToSquared(p)-b.group.getWorldPosition(V()).distanceToSquared(p))[0];return item&&item.group.getWorldPosition(V()).distanceTo(p)<.32?this.hold(item,i):false;}
 release(i){this.vehicle?.release(i);this.drop(i);}
 trigger(i){if(this.restraints?.handleSelect(i))return true;if(this.restraints?.placing)return this.restraints.place(this.ray(i));if(this.vehicle?.driving)return true;const held=this.held.get(i);if(held){if(['bullet','laser'].includes(held.data.kind))this.fire(held);return true;}return false;}
 desktop(ray){if(this.vehicle?.driving)return true;if(this.restraints?.placing)return this.restraints.place(ray);const item=this.held.get('desktop');if(item){if(['bullet','laser'].includes(item.data.kind))this.fire(item,ray);else{item.swing=.30;const hit=this.hit(ray,1.45);if(hit)this.impact(hit,item.data.mass*18,ray.direction,item.data.kind,item.data.sharpness);}return true;}const rope=this.restraints?.hit(ray);if(rope){this.restraints.selected=rope.object.userData.restraint;this.restraints.status='Selected link '+this.restraints.selected.id;return true;}if(this.vehicle?.click(ray))return true;const picked=this.weaponHit(ray);return picked?this.hold(picked,'desktop'):false;}
 hit(ray,max=50,ropes=true){const meshes=[...this.world.pickables,...(this.vehicle?.pickables||[])];for(const a of this.system.actors)a.root.traverse(m=>{if(m.isSkinnedMesh&&/^body/.test(m.name)){m.computeBoundingSphere();meshes.push(m);}});this.rc.ray.copy(ray);this.rc.near=0;this.rc.far=max;const hit=this.rc.intersectObjects(meshes,false).find(h=>visible(h.object)&&!h.object.userData.chunks?.[h.instanceId]?.broken),rope=ropes&&this.restraints?.hit(ray,max);return rope&&(!hit||rope.distance<hit.distance)?rope:hit;}
 actorFor(o){while(o){const a=this.system.actors.find(a=>a.root===o);if(a)return a;o=o.parent;}return null;}
 fire(item,aim){if(this.time-(item.lastFire??-2)<(item.id==='laser'?.18:.22))return;item.lastFire=this.time;item.kick=Math.min(.12,(item.kick||0)+.05);const muzzle=item.group.localToWorld(new T.Vector3(0,.03,-item.data.reach)),dir=aim?(this.hit(aim,35)?.point||aim.at(15,V())).clone().sub(muzzle).normalize():new T.Vector3(0,0,-1).applyQuaternion(item.group.getWorldQuaternion(Q())),ray=new T.Ray(muzzle,dir);if(item.id==='laser'){const hit=this.hit(ray,35),end=hit?.point||ray.at(35,V());this.beam(muzzle,end,0x99f7ff,.10);if(hit)this.impact(hit,24,dir,'laser',0);}else{this.shots.push({position:muzzle.clone(),velocity:dir.clone().multiplyScalar(85),age:0});this.beam(muzzle,muzzle.clone().addScaledVector(dir,.12),0xffde9c,.04);}if(typeof item.holder==='number')this.system.hands.haptics.contact(item.holder,'prop',1,.004);}
 beam(a,b,color,ttl){const length=a.distanceTo(b),m=new T.Mesh(new T.CylinderGeometry(.003,.003,Math.max(.001,length),5),new T.MeshBasicMaterial({color,transparent:true}));m.position.copy(a).lerp(b,.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());this.scene.add(m);this.effects.push({mesh:m,ttl,life:ttl,velocity:V(),expand:0});}
 impact(hit,energy,dir,kind,sharpness=0){if(hit.object.userData.restraint){if(kind==='cut'||kind==='laser')this.restraints.cut(hit.object.userData.restraint);return;}const actor=this.actorFor(hit.object);let result=null;if(actor){if(this.injuries)result=this.injuries.impact(actor,hit,energy,kind,dir);else{const region=actor.nearestHit(hit.point,.15);if(region){actor.applyStrike?.(region,dir.clone().negate(),Math.min(3,Math.sqrt(energy)*.3),0,hit.point);actor.reactToHit?.(region,dir,energy,kind,hit.point);}}}else if(hit.object.userData.carPart)this.vehicle.damage(hit,energy,kind,dir);else{this.world.nudge(hit.object,dir,energy);this.world.fractures.impact(hit,energy,dir,kind,sharpness);}if(!actor||this.injuries?.enabled!==false)this.mark(hit,actor,kind);this.status=(kind==='laser'?'Laser burn':kind==='bullet'?'Bullet impact':kind==='cut'?'Blade impact':'Blunt impact')+(result?' · '+result.region+(result.fractured?' · fractured':''):'');
 if(kind==='laser')for(let j=0;j<5;j++){const m=new T.Mesh(new T.IcosahedronGeometry(.008,0),new T.MeshBasicMaterial({color:j<3?0xffb46b:0x878681,transparent:true,opacity:.8}));m.position.copy(hit.point);this.scene.add(m);this.effects.push({mesh:m,ttl:.55,life:.55,velocity:dir.clone().multiplyScalar(-.35).add(new T.Vector3(Math.sin(j*2.3)*.3,.25+j*.08,Math.cos(j*2.3)*.3)),expand:j>2?2:0});}}
 mark(hit,actor,kind){const size=kind==='laser'?.034:kind==='bullet'?.024:.042,material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-3,uniforms:{age:{value:0},laser:{value:kind==='laser'?1:0},skin:{value:actor?1:0},bullet:{value:kind==='bullet'?1:0}},vertexShader:'varying vec2 u;void main(){u=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 u;uniform float age;uniform float laser;uniform float skin;uniform float bullet;void main(){float r=length((u-.5)*2.0);float alpha=(1.0-smoothstep(.50,1.0,r))*.8;vec3 c=mix(vec3(.065,.055,.045),vec3(.21,.16,.24),skin);c=mix(c,vec3(.045),bullet*(1.0-smoothstep(.08,.28,r)));float heat=laser*exp(-age*3.0)*(1.0-smoothstep(.18,.65,r));c+=heat*vec3(1.8,.43,.055);gl_FragColor=vec4(c,alpha);}' });const mesh=new T.Mesh(new T.PlaneGeometry(size*2,size*2),material);const normal=hit.face?.normal.clone().transformDirection(hit.object.matrixWorld)||new T.Vector3(0,1,0);mesh.position.copy(hit.point).addScaledVector(normal,.0015);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),normal);let anchor=null;if(actor){const surface=this.system.contacts.surface(actor);surface.begin();surface.project(hit.point.clone(),.004);anchor=surface.lastClosest?{surface,ref:surface.lastClosest}:null;}else if(!hit.object.isInstancedMesh)hit.object.attach(mesh);if(!mesh.parent)this.scene.add(mesh);this.marks.push({mesh,actor,anchor,object:hit.object,piece:hit.object.userData.chunks?.[hit.instanceId]||hit.object.userData.piece,age:0});while(this.marks.length>48)this.dispose(this.marks.shift().mesh);}
 dispose(m){m.removeFromParent();m.geometry?.dispose();m.material?.dispose();}
 setFocus(node){
  const glow=this.focusGlow,edges=this.focusEdges;
  if(!node){glow.visible=false;edges.visible=false;return;}
  this._focusBox.setFromObject(node);
  if(this._focusBox.isEmpty()){glow.visible=false;edges.visible=false;return;}
  this._focusBox.getCenter(this._focusCenter);this._focusBox.getSize(this._focusSize);
  const pulse=.85+.15*Math.sin(this.time*8);
  glow.position.copy(this._focusCenter);glow.scale.copy(this._focusSize).multiplyScalar(1.08);glow.material.opacity=.10+.08*pulse;glow.visible=true;
  edges.position.copy(this._focusCenter);edges.scale.copy(this._focusSize);edges.material.opacity=.55+.4*pulse;edges.visible=true;
 }
 tickFocus(){
  if(!this.renderer.xr.isPresenting||this.menu?.isOpen||!this.world.root.visible){this.setFocus(null);return;}
  let best=null,bd=4.2;
  const consider=(node,dist)=>{if(node&&dist<bd){bd=dist;best=node;}};
  for(let i=0;i<2;i++){
   if(this.system.hands?.active&&!this.system.hands.active[i])continue;
   const ray=this.ray(i);
   const rope=this.restraints?.hit(ray,bd);if(rope)consider(rope.object,rope.distance);
   const wep=this.weaponHit(ray);if(wep&&wep.holder===null)consider(wep.group,ray.origin.distanceTo(wep.group.getWorldPosition(V())));
   const meshes=[];for(const a of this.system.actors)a.root.traverse(m=>{if(m.isSkinnedMesh&&/^body/.test(m.name)){m.computeBoundingSphere();meshes.push(m);}});
   this.rc.ray.copy(ray);this.rc.near=0;this.rc.far=bd;
   const ah=meshes.length?this.rc.intersectObjects(meshes,false).find(h=>visible(h.object)):null;
   if(ah){const actor=this.actorFor(ah.object);if(actor)consider(actor.group,ah.distance);}
  }
  this.setFocus(best);
 }
 tick(dt){this.time+=dt;this.syncWorld();for(const item of this.items)item.group.visible=this.world.root.visible;if(!this.world.root.visible){this.vehicle?.tick(dt);this.setFocus(null);return;}this.vehicle?.tick(dt);this.restraints?.tick(dt);this.injuries?.tick(dt);for(const item of this.items){if(item.holder!==null){item.kick*=Math.exp(-dt*14);if(item.swing>0)item.swing=Math.max(0,item.swing-dt);this.applyHoldPose(item);
 const tip=item.group.localToWorld(new T.Vector3(0,0,-item.data.reach));if(item.lastTip&&item.holder!=='desktop'&&['cut','blunt'].includes(item.data.kind)){const dist=tip.distanceTo(item.lastTip),speed=Math.min(12,dist/Math.max(.001,dt));if(dist>.004&&dist<.75){const ray=new T.Ray(item.lastTip.clone(),tip.clone().sub(item.lastTip).normalize()),hit=this.hit(ray,dist+.025),key=hit&&(this.actorFor(hit.object)?.group.uuid||hit.object.uuid);if(hit&&this.time-(item.lastHit.get(key)??-2)>.24){item.lastHit.set(key,this.time);this.impact(hit,.5*item.data.mass*speed*speed,ray.direction,item.data.kind,item.data.sharpness);this.system.hands.haptics.contact(item.holder,'prop',speed,.01);}}}item.lastTip=tip;const p=item.group.getWorldPosition(V());if(item.lastPoint)item.velocity.copy(p).sub(item.lastPoint).divideScalar(Math.max(.001,dt)).clampLength(0,8);item.lastPoint=p.clone();
 }else{item.velocity.y-=9.81*dt;item.group.position.addScaledVector(item.velocity,dt);const p=item.group.position,old=p.clone();if(this.world.projectSphere(p,.055)){const n=p.clone().sub(old).normalize(),vn=item.velocity.dot(n);if(vn<0)item.velocity.addScaledVector(n,-1.1*vn);item.velocity.multiplyScalar(.8);}if(p.y<.05){p.y=.05;item.velocity.multiplyScalar(.85);item.velocity.y=Math.abs(item.velocity.y)*.12;}}}
 for(const shot of this.shots){shot.age+=dt;const next=shot.position.clone().addScaledVector(shot.velocity,dt),dist=next.distanceTo(shot.position),ray=new T.Ray(shot.position.clone(),shot.velocity.clone().normalize()),hit=this.hit(ray,dist);this.beam(shot.position,hit?.point||next,0xffe5ac,.035);if(hit){this.impact(hit,32,ray.direction,'bullet');shot.age=2;}shot.position.copy(next);shot.velocity.y-=9.81*dt;}this.shots=this.shots.filter(x=>x.age<.8).slice(-12);
 for(const e of this.effects){e.ttl-=dt;e.mesh.position.addScaledVector(e.velocity,dt);e.mesh.material.opacity=Math.max(0,e.ttl/e.life);if(e.expand)e.mesh.scale.addScalar(dt*e.expand*10);if(e.ttl<=0)this.dispose(e.mesh);}this.effects=this.effects.filter(e=>e.ttl>0);while(this.effects.length>80)this.dispose(this.effects.shift().mesh);
 const updated=new Set();for(const m of this.marks){m.age+=dt;m.mesh.material.uniforms.age.value=m.age;if(m.anchor&&this.system.actors.includes(m.actor)){const {surface,ref}=m.anchor;if(!updated.has(surface)){surface.begin();updated.add(surface);}const tri=new T.Triangle();surface.vertex(ref.cache,ref.ids[0],tri.a);surface.vertex(ref.cache,ref.ids[1],tri.b);surface.vertex(ref.cache,ref.ids[2],tri.c);const normal=tri.getNormal(V());m.mesh.position.copy(tri.a).multiplyScalar(ref.bary.x).addScaledVector(tri.b,ref.bary.y).addScaledVector(tri.c,ref.bary.z).addScaledVector(normal,.002);m.mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),normal);}if(m.age>100||m.piece?.broken||m.actor&&!this.system.actors.includes(m.actor))this.dispose(m.mesh);}this.marks=this.marks.filter(m=>m.mesh.parent);
  this.tickFocus();
 }
}
