import {Destruction} from './mira-v2-destruction.js?v=h4.1';
import {buildHouse} from './mira-v2-house.js?v=h4.2';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as T from 'three';
const V=()=>new T.Vector3(),clamp=T.MathUtils.clamp;
export const SCENES=['Living room','Jungle','Beach'];
export class MiraWorld {
 constructor(scene,system){this.scene=scene;this.system=system;this.root=new T.Group();scene.add(this.root);this.obstacles=[];this.seats=[];this.pickables=[];this.bodies=[];this.routes=new WeakMap();this.seated=new WeakMap();this.time=0;this.revision=0;this.extent=4.18;this.fractures=new Destruction(scene,this);this.setScene('Living room');}
 tex(file){if(!this._maps)this._maps={};if(this._maps[file])return this._maps[file];const t=new T.TextureLoader().load('/human4/assets/tex/'+file);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;return this._maps[file]=t;}
 surf(kind,color,roughness=.85){
  const files={floor:'oak_floor.jpg',wall:'plaster_wall.jpg',wood:'walnut_wood.jpg',cloth:'sofa_fabric.jpg',metal:'gun_steel.jpg',stone:'plaster_wall.jpg'};
  const file=files[kind];if(!file)return this.mat(color,roughness);
  const map=this.tex(file).clone();map.needsUpdate=true;map.wrapS=map.wrapT=T.RepeatWrapping;
  const rep=kind==='floor'?[8,8]:kind==='wall'?[3,2]:kind==='cloth'?[3,3]:kind==='metal'?[1.4,1.4]:kind==='stone'?[2.2,2.2]:[2,2];map.repeat.set(rep[0],rep[1]);
  const metal=kind==='metal'?0.78:0;
  const rough=kind==='metal'?.32:kind==='stone'?.92:roughness;
  const tint=kind==='metal'?0xc8ccd0:kind==='stone'?0xb7b5ae:0xffffff;
  return new T.MeshStandardMaterial({map,color:tint,roughness:rough,metalness:metal});
 }
 mat(color,roughness=.85){return new T.MeshStandardMaterial({color,roughness,metalness:0});}
 mesh(g,m,x,y,z){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;this.root.add(o);return o;}
 box(x,y,z,w,h,d,color,kind){return this.mesh(new T.BoxGeometry(w,h,d),kind?this.surf(kind,color):this.mat(color),x,y,z);}
 obstacle(x,z,w,d,y=0,h=1,object=null,mass=0){
  const o={x,z,w,d,y,h,object,mass,vx:0,vz:0,dynamic:mass>0,restitution:mass>0?0.18:0.04,friction:mass>0?3.4:0};
  this.obstacles.push(o);if(mass>0)this.bodies.push(o);this.grid=null;
  if(object){object.userData.obstacle=o;this.pickables.push(object);}
  return o;
 }
 nudge(object,dir,energy){
  let o=object?.userData?.obstacle||object?.userData?.piece?.obstacle;
  if(!o&&object){let p=object;while(p){if(p.userData?.obstacle){o=p.userData.obstacle;break;}p=p.parent;}}
  if(!o?.dynamic||!o.mass)return;
  const imp=Math.min(18,Math.sqrt(Math.max(0,energy))*1.4)/o.mass;
  o.vx+=(dir.x||0)*imp;o.vz+=(dir.z||0)*imp;
  this.clampSpeed(o);
 }
 clampSpeed(o){const sp=Math.hypot(o.vx,o.vz);if(sp>5){o.vx*=5/sp;o.vz*=5/sp;}}
 chair(x,z,yaw=0,couch=false){const group=new T.Group();this.root.add(group);const wood=this.surf('wood',0x765239),cloth=this.surf('cloth',couch?0x677e74:0xcb9f6d);const add=(w,h,d,y,z0,m)=>{const o=new T.Mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(.045,w*.2,h*.2,d*.2)),m);o.position.set(0,y,z0);o.castShadow=o.receiveShadow=true;group.add(o);return o;};const w=couch?1.55:.62;add(w,.16,.62,.43,0,cloth);add(w,.48,.16,.73,-.29,cloth);for(const sign of [-1,1]){const leg=add(.075,.36,.075,.18,.22,wood);leg.position.x=sign*(w/2-.09);const back=leg.clone();back.position.z=-.22;group.add(back);const arm=add(.10,.18,.61,.65,0,cloth);arm.position.x=sign*(w/2+.015);}
 group.position.set(x,0,z);group.rotation.y=yaw;group.updateMatrixWorld(true);
 const seat={group,position:new T.Vector3(x,.51,z),yaw,approach:group.localToWorld(new T.Vector3(0,0,1.02)),occupant:null};group.traverse(o=>{if(o.isMesh){o.userData.seat=seat;this.pickables.push(o);}});this.seats.push(seat);const body=this.obstacle(x,z,Math.abs(Math.cos(yaw))*w+Math.abs(Math.sin(yaw))*.68,Math.abs(Math.sin(yaw))*w+Math.abs(Math.cos(yaw))*.68,0,.94,group,couch?32:12);body.restitution=.16;body.friction=3.8;seat.obstacle=body;return seat;
 }
 setScene(name){
  if(!SCENES.includes(name))return;for(const a of this.system.actors){a.seat=null;a.navigation=null;a.dest=null;a.directedWalk=null;a.group.position.y=a.baseY||0;this.system.social.cancel(a);a.setMode('auto');}
  this.root.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});this.root.clear();this.obstacles=[];this.seats=[];this.pickables=[];this.bodies=[];this.houseDoors=[];this.grid=null;this.name=name;this.extent=name==='Living room'?48:4.18;this.revision++;this.fractures.clear();
  const jungle=name==='Jungle',beach=name==='Beach';this.scene.background=new T.Color(jungle?0x637f76:beach?0xaedced:0xc2b5a3);this.scene.fog=new T.Fog(this.scene.background,9,24);
  this.box(0,-.16,0,9,.3,9,jungle?0x6e7350:beach?0xe7d2a3:0xa58663,jungle||beach?null:'floor');
  if(!jungle&&!beach){
   buildHouse(this);
  }else{
   const spots=[[-3,-2.7],[-2.9,1.8],[2.7,-3.1],[3.1,1.9],[.8,-3.8],[-3.7,-.3]];spots.forEach(([x,z],i)=>{this.tree(x,z,2.3+(i%3)*.45,beach);this.obstacle(x,z,.28,.28,0,3.5);});
   for(const [x,z,s] of [[1.55,-.65,.68],[-1.55,-1.7,.6],[2.9,.55,.43]]){const rock=this.mesh(new T.IcosahedronGeometry(s,2),this.mat(jungle?0x666c5c:0x929488),x,s*.57,z);rock.scale.set(1,.67,.82);rock.rotation.y=x;this.obstacle(x,z,s*1.85,s*1.55,0,s*1.3,rock);}
   this.chair(-1.2,1.25,-.35,beach);this.chair(1.6,-2.2,.4);
   if(beach){const water=this.mesh(new T.PlaneGeometry(35,14,1,1),this.mat(0x539daa,.27),0,-.02,-10);water.rotation.x=-Math.PI/2;water.castShadow=false;this.water=water;}
   else{this.water=null;for(let i=0;i<12;i++){const angle=i*2.399,x=Math.cos(angle)*(3.1+(i%2)*.65),z=Math.sin(angle)*(3.1+(i%2)*.65);const bush=this.mesh(new T.SphereGeometry(.35,12,8),this.mat(i%2?0x65764b:0x4a6849),x,.25,z);bush.scale.y=.6;}}
  }
  // Room limits are also player/ball collision surfaces, not just scenery.
  if(name!=='Living room')for(const [x,z,w,d] of [[-4.4,0,.2,9],[4.4,0,.2,9],[0,-4.4,9,.2],[0,4.4,9,.2]])this.obstacle(x,z,w,d,0,4);
 }
 tree(x,z,height,palm){const trunk=this.mesh(new T.CylinderGeometry(.065,.11,height,10),this.mat(palm?0x9b8060:0x70614c),x,height/2,z);if(palm){for(let j=0;j<8;j++){const leaf=this.mesh(new T.SphereGeometry(1,12,6),this.mat(j%2?0x557450:0x6e884f),x+Math.cos(j*Math.PI/4)*.6,height-.12,z+Math.sin(j*Math.PI/4)*.6);leaf.scale.set(.85,.075,.19);leaf.rotation.set(0,-j*Math.PI/4,-.22);}}else{const crown=this.mesh(new T.IcosahedronGeometry(.72,2),this.mat(0x49644b),x,height-.12,z);crown.scale.set(1,1.1,1);}}
 removeObstacle(o){if(!o)return;this.obstacles=this.obstacles.filter(x=>x!==o);this.bodies=this.bodies.filter(x=>x!==o);this.grid=null;}
 nearby(p,r=.25){if(!this.grid){this.grid=new Map();for(const o of this.obstacles)for(let x=Math.floor(o.x-o.w/2);x<=Math.floor(o.x+o.w/2);x++)for(let z=Math.floor(o.z-o.d/2);z<=Math.floor(o.z+o.d/2);z++){const key=x+'/'+z;if(!this.grid.has(key))this.grid.set(key,[]);this.grid.get(key).push(o);}}const out=new Set();for(let x=Math.floor(p.x-r);x<=Math.floor(p.x+r);x++)for(let z=Math.floor(p.z-r);z<=Math.floor(p.z+r);z++)for(const o of this.grid.get(x+'/'+z)||[])out.add(o);return [...out];}
 blocked(p,r=.25,ignore=null){return this.nearby(p,r).some(o=>o!==ignore&&o.y<1.65&&o.y+o.h>.09&&Math.abs(p.x-o.x)<o.w/2+r&&Math.abs(p.z-o.z)<o.d/2+r);}
 path(start,goal,r=.25){
  const goalV=goal.clone().setY(0),startV=start.clone().setY(0),span=startV.distanceTo(goalV);
  if(this.blocked(goalV,r))return null;
  if(span<.14)return [goalV];
  if(span>9.5)return [goalV];
  const pad=2.2,minX=Math.min(startV.x,goalV.x)-pad,maxX=Math.max(startV.x,goalV.x)+pad,minZ=Math.min(startV.z,goalV.z)-pad,maxZ=Math.max(startV.z,goalV.z)+pad;
  const step=.34,nx=Math.max(4,Math.ceil((maxX-minX)/step)+1),nz=Math.max(4,Math.ceil((maxZ-minZ)/step)+1);
  const at=(x,z)=>new T.Vector3(minX+x*step,0,minZ+z*step),toCell=p=>[clamp(Math.round((p.x-minX)/step),0,nx-1),clamp(Math.round((p.z-minZ)/step),0,nz-1)],id=(x,z)=>z*nx+x;
  const [sx,sz]=toCell(startV),[gx,gz]=toCell(goalV),end=id(gx,gz),begin=id(sx,sz);
  const open=[begin],cost=new Map([[begin,0]]),prev=new Map(),closed=new Set();let found=false,iters=0,cap=nx*nz*2;
  while(open.length&&iters++<cap){let best=0,bestS=Infinity;for(let i=0;i<open.length;i++){const a=open[i],s=(cost.get(a)||0)+Math.hypot(a%nx-gx,Math.floor(a/nx)-gz);if(s<bestS){bestS=s;best=i;}}const cur=open.splice(best,1)[0];if(cur===end){found=true;break;}if(closed.has(cur))continue;closed.add(cur);const x=cur%nx,z=Math.floor(cur/nx);
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const xx=x+dx,zz=z+dz;if(xx<0||zz<0||xx>=nx||zz>=nz||this.blocked(at(xx,zz),r)||dx&&dz&&(this.blocked(at(x+dx,z),r)||this.blocked(at(x,z+dz),r)))continue;const k=id(xx,zz),c=(cost.get(cur)||0)+Math.hypot(dx,dz);if(c<(cost.get(k)??Infinity)){cost.set(k,c);prev.set(k,cur);open.push(k);}}
  }
  if(!found)return [goalV];const points=[goalV];for(let k=end;k!==begin;k=prev.get(k)){if(k===undefined)return [goalV];points.unshift(at(k%nx,Math.floor(k/nx)));}return points.filter((p,i)=>i===points.length-1||p.distanceTo(startV)>.1);
 }
 walk(actor,target,seat=null){if(!actor||actor.version!=='v2')return false;const start=actor.seat?actor.seat.approach:actor.group.position;const path=this.path(start,target,.22*Math.sqrt(actor.shape.hips));if(!path?.length)return false;if(seat?.occupant&&seat.occupant!==actor)return false;if(actor.seat){actor.group.position.copy(actor.seat.approach);actor.seat.occupant=null;}actor.seat=null;actor.group.position.y=actor.baseY||0;if(!actor.walkTo(path[0]))return false;actor.navigation={points:path,index:0,goal:target.clone(),seat};if(seat)seat.occupant=actor;return true;}
 command(ray,actor){const rc=new T.Raycaster();rc.ray.copy(ray);const ground=ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),V());rc.far=ground?ray.origin.distanceTo(ground):30;const hit=rc.intersectObjects(this.pickables,false).find(h=>h.object.visible&&!h.object.userData.chunks?.[h.instanceId]?.broken);if(!hit)return null;const seat=hit.object.userData.seat;if(seat)return this.walk(actor,seat.approach,seat)?'seating':'blocked';return 'blocked';}
 before(a){if(a.autonomy&&a.mode==='wander'&&a.dest&&!a.navigation&&!a.socialPair&&!a.seat){const points=this.path(a.group.position,a.dest,.22*Math.sqrt(a.shape.hips));if(points?.length){a.navigation={points,index:0,goal:a.dest.clone(),auto:true};a.dest=points[0].clone();}else a.dest=null;}if(a.navigation&&a.balance.state!=='standing'){if(a.navigation.seat)a.navigation.seat.occupant=null;a.navigation=null;}const n=a.navigation;if(n){const p=n.points[n.index];if(a.group.position.clone().setY(0).distanceTo(p)<.085||!a.dest){n.index++;if(n.index<n.points.length){a.dest=n.points[n.index].clone();a.directedWalk=n.goal.clone();a.mode='wander';a.autoWander=true;}else{a.navigation=null;a.dest=null;a.directedWalk=null;a.setMode(n.auto?'auto':'idle');if(n.seat){a.seat=n.seat;n.seat.occupant=a;a.seatBlend=0;}}}}}
 after(a,dt){
  if(a.seat){const seat=a.seat;a.seatBlend=Math.min(1,(a.seatBlend||0)+dt/.9);const k=a.seatBlend*a.seatBlend*(3-2*a.seatBlend);a.group.rotation.y+=Math.atan2(Math.sin(seat.yaw-a.group.rotation.y),Math.cos(seat.yaw-a.group.rotation.y))*(1-Math.exp(-dt*5));const pos=seat.position.clone();pos.y=a.group.position.y+(seat.position.y+.08*a.shape.height-a.bones.Hip.getWorldPosition(V()).y)*k;a.group.position.lerp(pos,1-Math.exp(-dt*7));a.group.position.y=pos.y;a.group.updateMatrixWorld(true);
   for(const side of ['L','R']){const sign=side==='L'?1:-1,foot=new T.Vector3(sign*.11*a.shape.height,0,.42*a.shape.height);seat.group.localToWorld(foot);foot.y=.065*a.shape.height;const pole=seat.group.localToWorld(new T.Vector3(sign*.16,.48,.8));a.solveChain(side,'leg',foot,pole);const hand=seat.group.localToWorld(new T.Vector3(sign*.13,.59,.21));a.solveChain(side,'arm',hand,seat.group.localToWorld(new T.Vector3(sign*.4,.8,.02)));}
   a.group.updateMatrixWorld(true);a.root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});return;
  }
  this.project(a.group.position,.20*Math.sqrt(a.shape.hips),.1,1.55,dt);a.group.updateMatrixWorld(true);
 }
 project(p,r,y=0,height=.1,dt=1/72){
  let hit=false;
  for(const o of this.nearby(p,r)){
   if(y>o.y+o.h||y+height<o.y)continue;
   const dx=p.x-o.x,dz=p.z-o.z,ex=o.w/2+r-Math.abs(dx),ez=o.d/2+r-Math.abs(dz);
   if(ex<=0||ez<=0)continue;
   const nx=ex<ez?(dx>=0?1:-1):0,nz=ex<ez?0:(dz>=0?1:-1),pen=ex<ez?ex:ez;
   p.x+=nx*pen;p.z+=nz*pen;
   if(o.dynamic&&o.mass){
    const acc=58/o.mass;
    o.vx-=nx*acc*dt;o.vz-=nz*acc*dt;
    this.clampSpeed(o);
   }
   hit=true;
  }
  return hit;
 }
 projectSphere(p,r){
  let hit=false;
  for(const o of this.nearby(p,r)){
   const q=new T.Vector3(T.MathUtils.clamp(p.x,o.x-o.w/2,o.x+o.w/2),T.MathUtils.clamp(p.y,o.y,o.y+o.h),T.MathUtils.clamp(p.z,o.z-o.d/2,o.z+o.d/2)),d=p.clone().sub(q),l=d.length();
   if(l>=r)continue;
   if(l>.000001)p.copy(q).addScaledVector(d,r/l);
   else{const choices=[[o.x+o.w/2+r-p.x,'x',1],[p.x-(o.x-o.w/2-r),'x',-1],[o.y+o.h+r-p.y,'y',1],[p.y-o.y+r,'y',-1],[o.z+o.d/2+r-p.z,'z',1],[p.z-(o.z-o.d/2-r),'z',-1]].sort((a,b)=>a[0]-b[0]);p[choices[0][1]]+=choices[0][0]*choices[0][2];}
   if(o.dynamic&&o.mass){o.vx+=(p.x-o.x)*1.6/o.mass;o.vz+=(p.z-o.z)*1.6/o.mass;this.clampSpeed(o);}
   hit=true;
  }
  return hit;
 }
 separate(a,b){
  if(a===b)return false;
  if(a.y>=b.y+b.h||b.y>=a.y+a.h)return false;
  const dx=a.x-b.x,dz=a.z-b.z,ex=a.w/2+b.w/2-Math.abs(dx),ez=a.d/2+b.d/2-Math.abs(dz);
  if(ex<=0||ez<=0)return false;
  const nx=ex<ez?(dx>=0?1:-1):0,nz=ex<ez?0:(dz>=0?1:-1),pen=ex<ez?ex:ez;
  const invA=a.dynamic&&a.mass?1/a.mass:0,invB=b.dynamic&&b.mass?1/b.mass:0,inv=invA+invB;
  if(inv<=0)return false;
  a.x+=nx*pen*(invA/inv);a.z+=nz*pen*(invA/inv);
  b.x-=nx*pen*(invB/inv);b.z-=nz*pen*(invB/inv);
  const rv=(a.vx-b.vx)*nx+(a.vz-b.vz)*nz;
  if(rv<0){
   const e=Math.min(a.restitution??.12,b.restitution??.12),j=-(1+e)*rv/inv;
   a.vx+=j*nx*invA;a.vz+=j*nz*invA;b.vx-=j*nx*invB;b.vz-=j*nz*invB;
   this.clampSpeed(a);this.clampSpeed(b);
  }
  return true;
 }
 syncBody(o){
  const node=o.object;
  if(node){node.position.x=o.x;node.position.z=o.z;node.updateMatrixWorld(true);}
  if(o.anchor){o.anchor.x=o.x;o.anchor.z=o.z;}
  const seat=this.seats.find(s=>s.obstacle===o);
  if(seat){seat.position.x=o.x;seat.position.z=o.z;seat.approach.copy(seat.group.localToWorld(new T.Vector3(0,0,1.02)));}
 }
 tick(dt){this.fractures.mesh.visible=this.root.visible;this.time+=dt;this.fractures.tick(dt);this.tickBodies(dt);for(const seat of this.seats)if(seat.occupant&&!this.system.actors.includes(seat.occupant))seat.occupant=null;for(const b of this.system.balls){if(b.held)continue;const before=b.mesh.position.clone();if(this.projectSphere(b.mesh.position,b.rad)){const n=b.mesh.position.clone().sub(before).normalize(),v=b.vel.dot(n);if(v<0)b.vel.addScaledVector(n,-1.4*v);}}}
 tickBodies(dt){
  dt=Math.min(.05,dt);
  const lim=this.extent-0.3;
  let moved=false;
  for(const o of this.bodies){
   if(!o.dynamic||o.mass<=0)continue;
   const damp=Math.exp(-dt*(o.friction||3.4));
   o.vx*=damp;o.vz*=damp;
   if(o.vx*o.vx+o.vz*o.vz<4e-6){o.vx=0;o.vz=0;continue;}
   o.x+=o.vx*dt;o.z+=o.vz*dt;
   o.x=T.MathUtils.clamp(o.x,-lim+o.w/2,lim-o.w/2);
   o.z=T.MathUtils.clamp(o.z,-lim+o.d/2,lim-o.d/2);
   moved=true;
  }
  if(!moved)return;
  this.grid=null;
  for(const o of this.bodies){
   if(!o.dynamic)continue;
   for(const wall of this.nearby({x:o.x,z:o.z},Math.max(o.w,o.d)*.5+.25)){
    if(wall===o||wall.dynamic)continue;
    this.separate(o,wall);
   }
  }
  for(let i=0;i<this.bodies.length;i++)for(let j=i+1;j<this.bodies.length;j++)this.separate(this.bodies[i],this.bodies[j]);
  for(const o of this.bodies)this.syncBody(o);
  this.grid=null;
 }
}
