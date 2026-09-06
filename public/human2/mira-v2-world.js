import {Destruction} from './mira-v2-destruction.js?v=9.3';
import {buildHouse} from './mira-v2-house.js?v=9.3';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as T from 'three';
const V=()=>new T.Vector3(),clamp=T.MathUtils.clamp;
export const SCENES=['Living room','Jungle','Beach'];
export class MiraWorld {
 constructor(scene,system){this.scene=scene;this.system=system;this.root=new T.Group();scene.add(this.root);this.obstacles=[];this.seats=[];this.pickables=[];this.routes=new WeakMap();this.seated=new WeakMap();this.time=0;this.revision=0;this.extent=4.18;this.fractures=new Destruction(scene,this);this.setScene('Living room');}
 mat(color,roughness=.85){return new T.MeshStandardMaterial({color,roughness,metalness:0});}
 mesh(g,m,x,y,z){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;this.root.add(o);return o;}
 box(x,y,z,w,h,d,color){return this.mesh(new T.BoxGeometry(w,h,d),this.mat(color),x,y,z);}
 obstacle(x,z,w,d,y=0,h=1,object=null){const o={x,z,w,d,y,h,object};this.obstacles.push(o);this.grid=null;if(object){object.userData.obstacle=o;this.pickables.push(object);}return o;}
 chair(x,z,yaw=0,couch=false){const group=new T.Group();this.root.add(group);const wood=this.mat(0x765239),cloth=this.mat(couch?0x677e74:0xcb9f6d);const add=(w,h,d,y,z0,m)=>{const o=new T.Mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(.045,w*.2,h*.2,d*.2)),m);o.position.set(0,y,z0);o.castShadow=o.receiveShadow=true;group.add(o);return o;};const w=couch?1.55:.62;add(w,.16,.62,.43,0,cloth);add(w,.48,.16,.73,-.29,cloth);for(const sign of [-1,1]){const leg=add(.075,.36,.075,.18,.22,wood);leg.position.x=sign*(w/2-.09);const back=leg.clone();back.position.z=-.22;group.add(back);const arm=add(.10,.18,.61,.65,0,cloth);arm.position.x=sign*(w/2+.015);}
 group.position.set(x,0,z);group.rotation.y=yaw;group.updateMatrixWorld(true);
 const seat={group,position:new T.Vector3(x,.51,z),yaw,approach:group.localToWorld(new T.Vector3(0,0,1.02)),occupant:null};group.traverse(o=>{if(o.isMesh){o.userData.seat=seat;this.pickables.push(o);}});this.seats.push(seat);seat.obstacle=this.obstacle(x,z,Math.abs(Math.cos(yaw))*w+Math.abs(Math.sin(yaw))*.68,Math.abs(Math.sin(yaw))*w+Math.abs(Math.cos(yaw))*.68,0,.94);return seat;
 }
 setScene(name){
  if(!SCENES.includes(name))return;for(const a of this.system.actors){a.seat=null;a.navigation=null;a.dest=null;a.directedWalk=null;a.group.position.y=a.baseY||0;this.system.social.cancel(a);a.setMode('auto');}
  this.root.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});this.root.clear();this.obstacles=[];this.seats=[];this.pickables=[];this.grid=null;this.name=name;this.extent=name==='Living room'?11.6:4.18;this.revision++;this.fractures.clear();
  const jungle=name==='Jungle',beach=name==='Beach';this.scene.background=new T.Color(jungle?0x637f76:beach?0xaedced:0xc2b5a3);this.scene.fog=new T.Fog(this.scene.background,9,24);
  this.box(0,-.16,0,9,.3,9,jungle?0x6e7350:beach?0xe7d2a3:0xa58663);
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
 removeObstacle(o){if(!o)return;this.obstacles=this.obstacles.filter(x=>x!==o);this.grid=null;}
 nearby(p,r=.25){if(!this.grid){this.grid=new Map();for(const o of this.obstacles)for(let x=Math.floor(o.x-o.w/2);x<=Math.floor(o.x+o.w/2);x++)for(let z=Math.floor(o.z-o.d/2);z<=Math.floor(o.z+o.d/2);z++){const key=x+'/'+z;if(!this.grid.has(key))this.grid.set(key,[]);this.grid.get(key).push(o);}}const out=new Set();for(let x=Math.floor(p.x-r);x<=Math.floor(p.x+r);x++)for(let z=Math.floor(p.z-r);z<=Math.floor(p.z+r);z++)for(const o of this.grid.get(x+'/'+z)||[])out.add(o);return [...out];}
 blocked(p,r=.25,ignore=null){return this.nearby(p,r).some(o=>o!==ignore&&o.y<1.65&&o.y+o.h>.09&&Math.abs(p.x-o.x)<o.w/2+r&&Math.abs(p.z-o.z)<o.d/2+r);}
 path(start,goal,r=.25){
  const step=this.extent>5?.30:.22,n=Math.floor(this.extent*2/step)+1,toCell=p=>[clamp(Math.round((p.x+this.extent)/step),0,n-1),clamp(Math.round((p.z+this.extent)/step),0,n-1)],at=(x,z)=>new T.Vector3(x*step-this.extent,0,z*step-this.extent),id=(x,z)=>z*n+x,[sx,sz]=toCell(start),[gx,gz]=toCell(goal),end=id(gx,gz),begin=id(sx,sz);
  if(this.blocked(goal,r))return null;const open=[begin],cost=new Map([[begin,0]]),prev=new Map(),closed=new Set();let found=false;
  while(open.length){open.sort((a,b)=>cost.get(a)+Math.hypot(a%n-gx,Math.floor(a/n)-gz)-cost.get(b)-Math.hypot(b%n-gx,Math.floor(b/n)-gz));const cur=open.shift();if(cur===end){found=true;break;}if(closed.has(cur))continue;closed.add(cur);const x=cur%n,z=Math.floor(cur/n);
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const xx=x+dx,zz=z+dz;if(xx<0||zz<0||xx>=n||zz>=n||this.blocked(at(xx,zz),r)||dx&&dz&&(this.blocked(at(x+dx,z),r)||this.blocked(at(x,z+dz),r)))continue;const k=id(xx,zz),c=cost.get(cur)+Math.hypot(dx,dz);if(c<(cost.get(k)??Infinity)){cost.set(k,c);prev.set(k,cur);open.push(k);}}
  }
  if(!found)return null;const points=[goal.clone().setY(0)];for(let k=end;k!==begin;k=prev.get(k)){if(k===undefined)return null;points.unshift(at(k%n,Math.floor(k/n)));}return points.filter((p,i)=>i===points.length-1||p.distanceTo(start)>.08);
 }
 walk(actor,target,seat=null){if(!actor||actor.version!=='v2')return false;const start=actor.seat?actor.seat.approach:actor.group.position;const path=this.path(start,target,.22*Math.sqrt(actor.shape.hips));if(!path?.length)return false;if(seat?.occupant&&seat.occupant!==actor)return false;if(actor.seat){actor.group.position.copy(actor.seat.approach);actor.seat.occupant=null;}actor.seat=null;actor.group.position.y=actor.baseY||0;if(!actor.walkTo(path[0]))return false;actor.navigation={points:path,index:0,goal:target.clone(),seat};if(seat)seat.occupant=actor;return true;}
 command(ray,actor){const rc=new T.Raycaster();rc.ray.copy(ray);const ground=ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),V());rc.far=ground?ray.origin.distanceTo(ground):30;const hit=rc.intersectObjects(this.pickables,false).find(h=>h.object.visible&&!h.object.userData.chunks?.[h.instanceId]?.broken);if(!hit)return null;const seat=hit.object.userData.seat;if(seat)return this.walk(actor,seat.approach,seat)?'seating':'blocked';return 'blocked';}
 before(a){if(a.autonomy&&a.mode==='wander'&&a.dest&&!a.navigation&&!a.socialPair&&!a.seat){const points=this.path(a.group.position,a.dest,.22*Math.sqrt(a.shape.hips));if(points?.length){a.navigation={points,index:0,goal:a.dest.clone(),auto:true};a.dest=points[0].clone();}else a.dest=null;}if(a.navigation&&a.balance.state!=='standing'){if(a.navigation.seat)a.navigation.seat.occupant=null;a.navigation=null;}const n=a.navigation;if(n){const p=n.points[n.index];if(a.group.position.clone().setY(0).distanceTo(p)<.085||!a.dest){n.index++;if(n.index<n.points.length){a.dest=n.points[n.index].clone();a.directedWalk=n.goal.clone();a.mode='wander';a.autoWander=true;}else{a.navigation=null;a.dest=null;a.directedWalk=null;a.setMode(n.auto?'auto':'idle');if(n.seat){a.seat=n.seat;n.seat.occupant=a;a.seatBlend=0;}}}}}
 after(a,dt){
  if(a.seat){const seat=a.seat;a.seatBlend=Math.min(1,(a.seatBlend||0)+dt/.9);const k=a.seatBlend*a.seatBlend*(3-2*a.seatBlend);a.group.rotation.y+=Math.atan2(Math.sin(seat.yaw-a.group.rotation.y),Math.cos(seat.yaw-a.group.rotation.y))*(1-Math.exp(-dt*5));const pos=seat.position.clone();pos.y=a.group.position.y+(seat.position.y+.08*a.shape.height-a.bones.Hip.getWorldPosition(V()).y)*k;a.group.position.lerp(pos,1-Math.exp(-dt*7));a.group.position.y=pos.y;a.group.updateMatrixWorld(true);
   for(const side of ['L','R']){const sign=side==='L'?1:-1,foot=new T.Vector3(sign*.11*a.shape.height,0,.42*a.shape.height);seat.group.localToWorld(foot);foot.y=.065*a.shape.height;const pole=seat.group.localToWorld(new T.Vector3(sign*.16,.48,.8));a.solveChain(side,'leg',foot,pole);const hand=seat.group.localToWorld(new T.Vector3(sign*.13,.59,.21));a.solveChain(side,'arm',hand,seat.group.localToWorld(new T.Vector3(sign*.4,.8,.02)));}
   a.group.updateMatrixWorld(true);a.root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});return;
  }
  this.project(a.group.position,.20*Math.sqrt(a.shape.hips),.1,1.55);a.group.updateMatrixWorld(true);
 }
 project(p,r,y=0,height=.1){let hit=false;for(const o of this.nearby(p,r)){if(y>o.y+o.h||y+height<o.y)continue;const dx=p.x-o.x,dz=p.z-o.z,ex=o.w/2+r-Math.abs(dx),ez=o.d/2+r-Math.abs(dz);if(ex>0&&ez>0){if(ex<ez)p.x+=(dx>=0?1:-1)*ex;else p.z+=(dz>=0?1:-1)*ez;hit=true;}}return hit;}
 projectSphere(p,r){let hit=false;for(const o of this.nearby(p,r)){const q=new T.Vector3(T.MathUtils.clamp(p.x,o.x-o.w/2,o.x+o.w/2),T.MathUtils.clamp(p.y,o.y,o.y+o.h),T.MathUtils.clamp(p.z,o.z-o.d/2,o.z+o.d/2)),d=p.clone().sub(q),l=d.length();if(l>=r)continue;if(l>.000001)p.copy(q).addScaledVector(d,r/l);else{const choices=[[o.x+o.w/2+r-p.x,'x',1],[p.x-(o.x-o.w/2-r),'x',-1],[o.y+o.h+r-p.y,'y',1],[p.y-o.y+r,'y',-1],[o.z+o.d/2+r-p.z,'z',1],[p.z-(o.z-o.d/2-r),'z',-1]].sort((a,b)=>a[0]-b[0]);p[choices[0][1]]+=choices[0][0]*choices[0][2];}hit=true;}return hit;}
 tick(dt){this.time+=dt;this.fractures.tick(dt);for(const seat of this.seats)if(seat.occupant&&!this.system.actors.includes(seat.occupant))seat.occupant=null;for(const b of this.system.balls){if(b.held)continue;const before=b.mesh.position.clone();if(this.projectSphere(b.mesh.position,b.rad)){const n=b.mesh.position.clone().sub(before).normalize(),v=b.vel.dot(n);if(v<0)b.vel.addScaledVector(n,-1.4*v);}}}
}
