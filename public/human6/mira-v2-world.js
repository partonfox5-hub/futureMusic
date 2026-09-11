import {captureFurniture,tagMovable} from './mira-v2-furniture.js?v=18.0.0';
import {Destruction} from './mira-v2-destruction.js?v=18.0.0';
import {buildHouse} from './mira-v2-house.js?v=18.0.0';
import {buildCastle,inCastleClearing} from './mira-v2-castle.js?v=18.0.0';
import {plantTerrain,scatterTrees,tickNature,chopTree as chopNature,ramTree as ramNature,terrainHeight} from './mira-v2-nature.js?v=18.0.0';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as T from 'three';
const V=()=>new T.Vector3(),clamp=T.MathUtils.clamp,QUEST=/Quest|OculusBrowser/i.test(globalThis.navigator?.userAgent||'');
export const SCENES=['Living room','Jungle','Beach'];
export class MiraWorld {
 constructor(scene,system){this.scene=scene;this.system=system;this.root=new T.Group();scene.add(this.root);this.obstacles=[];this.seats=[];this.pickables=[];this.movables=[];this.stairs=[];this.routes=new WeakMap();this.seated=new WeakMap();this.time=0;this.revision=0;this.extent=4.18;this.gravity=9.81;this.fractures=new Destruction(scene,this);this.setScene('Living room');}
 captureFurniture(id,start,x,z){captureFurniture(this,id,this.root.children.slice(start),x,z);}
 mat(color,roughness=.85){return new T.MeshStandardMaterial({color,roughness,metalness:0});}
 mesh(g,m,x,y,z){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;this.root.add(o);return o;}
 box(x,y,z,w,h,d,color){return this.mesh(new T.BoxGeometry(w,h,d),this.mat(color),x,y,z);}
 obstacle(x,z,w,d,y=0,h=1,object=null){const o={x,z,w,d,y,h,object};this.obstacles.push(o);this.grid=null;if(object){object.userData.obstacle=o;this.pickables.push(object);}return o;}
 chair(x,z,yaw=0,couch=false){const group=new T.Group();this.root.add(group);const wood=this.mat(0x765239),cloth=this.mat(couch?0x677e74:0xcb9f6d),cushion=this.mat(couch?0x738a80:0xd4ab78);const add=(ww,h,d,y,z0,m)=>{const o=new T.Mesh(new RoundedBoxGeometry(ww,h,d,2,Math.min(.045,ww*.2,h*.2,d*.2)),m);o.position.set(0,y,z0);o.castShadow=o.receiveShadow=true;group.add(o);return o;};const w=couch?1.55:.62;add(w,.12,.62,.40,0,cloth);add(w-.06,.07,.54,.48,.02,cushion);add(w,.50,.12,.74,-.30,cloth);if(couch)for(const sx of [-.48,0,.48]){const p=add(.46,.20,.13,.88,-.24,cushion);p.position.x=sx;}for(const sign of [-1,1]){const leg=add(.07,.38,.07,.19,.24,wood);leg.position.x=sign*(w/2-.09);const back=leg.clone();back.position.z=-.24;group.add(back);const arm=add(.09,.16,.58,.64,0,cloth);arm.position.x=sign*(w/2+.02);}if(!couch){const slat=add(.04,.42,.04,.72,-.30,wood);slat.position.x=0;}
 group.position.set(x,0,z);group.rotation.y=yaw;group.updateMatrixWorld(true);
 const seat={group,position:new T.Vector3(x,.51,z),yaw,approach:group.localToWorld(new T.Vector3(0,0,1.02)),occupant:null};group.traverse(o=>{if(o.isMesh){o.userData.seat=seat;this.pickables.push(o);this.fractures.register(o,'wood');if(o.userData.piece){o.userData.piece.health=24;o.userData.piece.maxHealth=24;}}});this.seats.push(seat);const furn=tagMovable(this,group,couch?'Couch':'Chair');furn.seat=seat;seat.obstacle=furn.obstacle;furn.health=24;return seat;
 }
 setScene(name){
  if(!SCENES.includes(name))return;for(const a of this.system.actors){a.seat=null;a.navigation=null;a.dest=null;a.directedWalk=null;a.group.position.y=a.baseY||0;this.system.social.cancel(a);a.setMode('auto');}
  this.doors?.clear?.();
 this.root.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});this.root.clear();this.obstacles=[];this.seats=[];this.pickables=[];this.movables=[];this.stairs=[];this.floors=[];this.trees=[];this.terrain=null;this.grid=null;this.waterBeds=[];this.name=name;this.extent=144;this.builder?.clear();this.revision++;this.fractures.clear();
  const jungle=name==='Jungle',beach=name==='Beach';this.scene.background=new T.Color(jungle?0x637f76:beach?0xaedced:0xc2b5a3);this.scene.fog=new T.Fog(this.scene.background,110,360);
  this.terrainPad=jungle||beach?3.4:16;this.terrainAmp=beach?.4:jungle?1.15:1;
  plantTerrain(this,{size:312,pad:this.terrainPad,amp:this.terrainAmp,grass:jungle?0x4e6640:beach?0xd7c08c:0x5d7048,dirt:jungle?0x4a4030:beach?0xc2a56e:0x6a5a3e});
  if(!jungle&&!beach){
   buildHouse(this);
   buildCastle(this);
   scatterTrees(this,{count:QUEST?28:85,pad:18,extent:80,flat:this.terrainPad,avoid:inCastleClearing});
   for(const [x,z,s] of [[8.6,-6.4,.52],[-9.4,7.2,.44],[12.1,3.4,.36],[-7.6,-11.2,.58],[15.2,-8.1,.4],[28,-18,.62],[-24,22,.48],[32,14,.4],[-30,-12,.55],[48,20,.55],[-52,-28,.48],[60,-8,.4]]){
    if(inCastleClearing(x,z))continue;
    const y=terrainHeight(x,z,this.terrainPad,this.terrainAmp);
    const rock=this.mesh(new T.IcosahedronGeometry(s,2),this.mat(0x6a6e62),x,y+s*.55,z);rock.scale.set(1,.68,.84);rock.rotation.y=x;this.obstacle(x,z,s*1.8,s*1.5,y,s*1.2,rock);
   }
  }else{
   scatterTrees(this,{count:QUEST?32:90,pad:5.2,extent:90,palm:beach,flat:this.terrainPad,avoid:beach?(x,z)=>z<-6:null});
   for(const [x,z,s] of [[1.55,-.65,.68],[-1.55,-1.7,.6],[2.9,.55,.43],[6.2,4.1,.5],[-5.4,-3.8,.46],[18,11,.52],[-22,-9,.46],[26,-16,.4]]){
    const y=terrainHeight(x,z,this.terrainPad,this.terrainAmp);
    const rock=this.mesh(new T.IcosahedronGeometry(s,2),this.mat(jungle?0x666c5c:0x929488),x,y+s*.57,z);rock.scale.set(1,.67,.82);rock.rotation.y=x;this.obstacle(x,z,s*1.85,s*1.55,y,s*1.3,rock);
   }
   this.chair(-1.2,1.25,-.35,beach);this.chair(1.6,-2.2,.4);
   if(beach){
    const terr=this.terrain,pos=terr?.geometry?.attributes?.position;
    if(pos){for(let i=0;i<pos.count;i++){const zz=pos.getZ(i);if(zz<-7.5){const t=T.MathUtils.clamp((-7.5-zz)/5,0,1);pos.setY(i,T.MathUtils.lerp(pos.getY(i),-1.65,t*t));}}pos.needsUpdate=true;terr.geometry.computeVertexNormals();}
    this.waterBeds.push({rect:true,z0:-48,z1:-7.5,bed:-1.65});
    const water=this.mesh(new T.PlaneGeometry(96,36,1,1),this.mat(0x539daa,.27),0,-.04,-24);water.rotation.x=-Math.PI/2;water.castShadow=false;this.water=water;
   }
   else{this.water=null;for(let i=0;i<16;i++){const angle=i*2.399,x=Math.cos(angle)*(4.2+(i%2)*1.1),z=Math.sin(angle)*(4.2+(i%2)*1.1);const y=terrainHeight(x,z,this.terrainPad,this.terrainAmp);const bush=this.mesh(new T.SphereGeometry(.38,12,8),this.mat(i%2?0x65764b:0x4a6849),x,y+.25,z);bush.scale.y=.6;}}
  }
  if(this.builder?.wardrobe.rack){const b=new T.Box3().setFromObject(this.builder.wardrobe.rack),p=b.getCenter(V()),s=b.getSize(V());this.obstacle(p.x,p.z,s.x,s.z,b.min.y,s.y);}
  // Room limits are also player/ball collision surfaces, not just scenery.
  for(const [x,z,w,d] of [[-144.2,0,.2,289],[144.2,0,.2,289],[0,-144.2,289,.2],[0,144.2,289,.2]])this.obstacle(x,z,w,d,0,4);
 }
 chopTree(tree,point,energy,dir,kind){return chopNature(tree,point,energy,dir,kind);}
 ramTree(tree,point,energy,dir){return ramNature(tree,point,energy,dir);}
 tree(x,z,height,palm){const trunk=this.mesh(new T.CylinderGeometry(.065,.11,height,10),this.mat(palm?0x9b8060:0x70614c),x,height/2,z);if(palm){for(let j=0;j<8;j++){const leaf=this.mesh(new T.SphereGeometry(1,12,6),this.mat(j%2?0x557450:0x6e884f),x+Math.cos(j*Math.PI/4)*.6,height-.12,z+Math.sin(j*Math.PI/4)*.6);leaf.scale.set(.85,.075,.19);leaf.rotation.set(0,-j*Math.PI/4,-.22);}}else{const crown=this.mesh(new T.IcosahedronGeometry(.72,2),this.mat(0x49644b),x,height-.12,z);crown.scale.set(1,1.1,1);}}
 removeObstacle(o){if(!o)return;this.obstacles=this.obstacles.filter(x=>x!==o);this.grid=null;}
 nearby(p,r=.25){if(!this.grid){this.grid=new Map();for(const o of this.obstacles)for(let x=Math.floor(o.x-o.w/2);x<=Math.floor(o.x+o.w/2);x++)for(let z=Math.floor(o.z-o.d/2);z<=Math.floor(o.z+o.d/2);z++){const key=x+'/'+z;if(!this.grid.has(key))this.grid.set(key,[]);this.grid.get(key).push(o);}}const out=new Set();for(let x=Math.floor(p.x-r);x<=Math.floor(p.x+r);x++)for(let z=Math.floor(p.z-r);z<=Math.floor(p.z+r);z++)for(const o of this.grid.get(x+'/'+z)||[])out.add(o);return [...out];}
 blocked(p,r=.25,ignore=null){const y0=Number.isFinite(p?.y)?p.y:.1;return this.nearby(p,r).some(o=>o!==ignore&&!o.walkable&&y0<o.y+o.h&&y0+1.5>o.y&&Math.abs(p.x-o.x)<o.w/2+r&&Math.abs(p.z-o.z)<o.d/2+r);}
 excavateWater(x,z,r,bedY){
  this.waterBeds??=[];
  this.waterBeds=this.waterBeds.filter(b=>Math.hypot(b.x-x,b.z-z)>0.4);
  this.waterBeds.push({x,z,r,bed:bedY});
  const mesh=this.terrain,pos=mesh?.geometry?.attributes?.position;if(!pos)return;
  for(let i=0;i<pos.count;i++){
   const px=pos.getX(i),pz=pos.getZ(i),d=Math.hypot(px-x,pz-z);
   if(d>=r)continue;
   const k=1-d/r,y=pos.getY(i),want=T.MathUtils.lerp(y,bedY,k*k);
   pos.setY(i,Math.min(y,want));
  }
  pos.needsUpdate=true;mesh.geometry.computeVertexNormals();
 }
 floorHeight(p,zArg,maxStep){
  // p.y is feet (or a wheel), never eye height. Step is one stair, not a whole story.
  const x=p&&typeof p==='object'?p.x:p,z=p&&typeof p==='object'?p.z:zArg;
  const pt=new T.Vector3(x||0,(p&&typeof p==='object'&&Number.isFinite(p.y))?p.y:0,z||0);
  const step=Number.isFinite(maxStep)?maxStep:(Number.isFinite(zArg)&&p&&typeof p==='object'&&zArg>0&&zArg<=2?zArg:.42);
  const yRef=Number.isFinite(pt.y)?pt.y:0,candidates=[this.terrain?terrainHeight(x||0,z||0,this.terrainPad??5.4,this.terrainAmp??1):0];
  for(const b of this.waterBeds||[]){
   if(b.rect){if((z||0)>=b.z0&&(z||0)<=b.z1)candidates.push(b.bed);}
   else if(Math.hypot((x||0)-b.x,(z||0)-b.z)<(b.r||0))candidates.push(b.bed);
  }
  for(const f of this.floors||[]){
   if(Math.abs((x||0)-f.x)<f.w/2+.01&&Math.abs((z||0)-f.z)<f.d/2+.01)candidates.push(f.y+f.h);
  }
  let stairH=null;
  for(const group of this.stairs||[]){
   if(!group.parent)continue;const data=group.userData.stairs;if(!data)continue;
   const local=group.worldToLocal(pt.clone());
   if(Math.abs(local.x)>data.width/2+.08||local.z<-.08||local.z>data.run+.12)continue;
   const t=T.MathUtils.clamp(local.z/Math.max(.001,data.run),0,1);
   stairH=t*data.rise;
   candidates.push(stairH);
  }
  // Stairs win over the slab they pass through, or you snap back upstairs.
  if(stairH!=null)return stairH;
  const reachable=candidates.filter(c=>c<=yRef+step);
  if(reachable.length)return Math.max(...reachable);
  const below=candidates.filter(c=>c<=yRef+0.02);
  if(below.length)return Math.max(...below);
  return Math.min(...candidates);
 }
 path(start,goal,r=.25){
  const distance=start.distanceTo(goal);let clear=true;for(let i=0;i<=Math.ceil(distance/.2);i++)if(this.blocked(start.clone().lerp(goal,i/Math.max(1,Math.ceil(distance/.2))),r)){clear=false;break;}if(clear)return [goal.clone().setY(0)];
  if(this.blocked(goal,r))return null;
  const pad=5,minX=Math.min(start.x,goal.x)-pad,maxX=Math.max(start.x,goal.x)+pad,minZ=Math.min(start.z,goal.z)-pad,maxZ=Math.max(start.z,goal.z)+pad;
  const step=.28,nx=Math.max(4,Math.ceil((maxX-minX)/step)+1),nz=Math.max(4,Math.ceil((maxZ-minZ)/step)+1);
  const toCell=p=>[clamp(Math.round((p.x-minX)/step),0,nx-1),clamp(Math.round((p.z-minZ)/step),0,nz-1)];
  const at=(x,z)=>new T.Vector3(minX+x*step,0,minZ+z*step),id=(x,z)=>z*nx+x;
  const [sx,sz]=toCell(start),[gx,gz]=toCell(goal),end=id(gx,gz),begin=id(sx,sz);
  const open=[begin],cost=new Map([[begin,0]]),prev=new Map(),closed=new Set();let found=false;
  while(open.length&&closed.size<8000){open.sort((a,b)=>cost.get(a)+Math.hypot(a%nx-gx,Math.floor(a/nx)-gz)-cost.get(b)-Math.hypot(b%nx-gx,Math.floor(b/nx)-gz));const cur=open.shift();if(cur===end){found=true;break;}if(closed.has(cur))continue;closed.add(cur);const x=cur%nx,z=Math.floor(cur/nx);
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const xx=x+dx,zz=z+dz;if(xx<0||zz<0||xx>=nx||zz>=nz||this.blocked(at(xx,zz),r)||dx&&dz&&(this.blocked(at(x+dx,z),r)||this.blocked(at(x,z+dz),r)))continue;const k=id(xx,zz),c=cost.get(cur)+Math.hypot(dx,dz);if(c<(cost.get(k)??Infinity)){cost.set(k,c);prev.set(k,cur);open.push(k);}}
  }
  if(!found)return null;const points=[goal.clone().setY(0)];for(let k=end;k!==begin;k=prev.get(k)){if(k===undefined)return null;points.unshift(at(k%nx,Math.floor(k/nx)));}return points.filter((p,i)=>i===points.length-1||p.distanceTo(start)>.08);
 }
 walk(actor,target,seat=null){
  if(!actor||actor.version!=='v2')return false;
  const start=actor.seat?actor.seat.approach:actor.group.position,rad=.32*Math.sqrt(actor.shape.hips||1);
  let path=this.path(start,target,rad);if(!path?.length)path=this.path(start,target,Math.max(.16,rad*.55));
  if(seat?.occupant&&seat.occupant!==actor)return false;
  if(actor.seat){actor.group.position.copy(actor.seat.approach);actor.seat.occupant=null;}actor.seat=null;actor.group.position.y=actor.baseY||0;
  const first=path?.[0]||target.clone().setY(0);
  if(!actor.walkTo(first))return false;
  actor.navigation={points:path?.length?path:[first.clone()],index:0,goal:target.clone(),seat};
  actor.directedWalk=target.clone().setY(0);actor.dest=first.clone();actor.autoWander=true;
  if(seat)seat.occupant=actor;return true;
 }
 command(ray,actor){
  const rc=new T.Raycaster();rc.ray.copy(ray);const ground=ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),V());rc.far=ground?ray.origin.distanceTo(ground):30;
  const hit=rc.intersectObjects(this.pickables,false).find(h=>h.object.visible&&!h.object.userData.chunks?.[h.instanceId]?.broken);if(!hit)return null;
  const seat=hit.object.userData.seat;if(seat)return this.walk(actor,seat.approach,seat)?'seating':'blocked';
  let o=hit.object;while(o){if(o===this.piano?.root){this.piano.invite(actor,{status:''});return 'piano';}if(o.userData?.pianoSheet){this.piano?.cycleSong?.();return 'piano';}o=o.parent;}
  return null;
 }
 before(a){
  if(a.balance.state==='standing'&&!a.waterSwimming&&!a.grabs.size&&!a.seat)a.baseY=this.floorHeight(a.group.position);
  if(a.dead){a.dest=null;a.navigation=null;a.autoWander=false;a.autonomy=false;return;}
  if(a.autonomy&&a.mode==='wander'&&a.dest&&!a.navigation&&!a.socialPair&&!a.seat){
   const points=this.path(a.group.position,a.dest,.32*Math.sqrt(a.shape.hips||1));
   if(points?.length){a.navigation={points,index:0,goal:a.dest.clone(),auto:true};a.dest=points[0].clone();}
  }
  if(a.navigation&&a.balance.state!=='standing'){if(a.navigation.seat)a.navigation.seat.occupant=null;a.navigation=null;}
  const n=a.navigation;if(!n)return;
  const here=a.group.position.clone().setY(0);
  const seatAt=n.seat?.approach?n.seat.approach.clone().setY(0):null;
  if(n.seat&&seatAt&&here.distanceTo(seatAt)<.7){
   a.navigation=null;a.dest=null;a.directedWalk=null;a.autoWander=false;a.mode='idle';
   a.seat=n.seat;n.seat.occupant=a;a.seatBlend=0;return;
  }
  const p=n.points[n.index];
  if(here.distanceTo(p)<.32||!a.dest){
   n.index++;
   if(n.index<n.points.length){a.dest=n.points[n.index].clone();a.directedWalk=n.goal.clone();a.mode='wander';a.autoWander=true;}
   else{
    a.navigation=null;a.dest=null;a.directedWalk=null;a.autoWander=false;a.mode=n.auto?'idle':'idle';
    if(n.seat){a.seat=n.seat;n.seat.occupant=a;a.seatBlend=0;}
    else if(n.auto)a.autonomy=true;
   }
  }
 }
 after(a,dt){
  if(a.seat){const seat=a.seat;a.seatBlend=Math.min(1,(a.seatBlend||0)+dt/.9);const k=a.seatBlend*a.seatBlend*(3-2*a.seatBlend);a.group.rotation.y+=Math.atan2(Math.sin(seat.yaw-a.group.rotation.y),Math.cos(seat.yaw-a.group.rotation.y))*(1-Math.exp(-dt*5));const pos=seat.position.clone();pos.y=a.group.position.y+(seat.position.y+.08*a.shape.height-a.bones.Hip.getWorldPosition(V()).y)*k;a.group.position.lerp(pos,1-Math.exp(-dt*7));a.group.position.y=pos.y;a.group.updateMatrixWorld(true);
   for(const side of ['L','R']){
    const sign=side==='L'?1:-1,h=a.shape.height;
    if(seat.piano){
     const foot=new T.Vector3(sign*.13*h,0,-.22*h);seat.group.localToWorld(foot);foot.y=.02*h;
     const pole=seat.group.localToWorld(new T.Vector3(sign*.18*h,.30*h,-.38*h));
     a.solveChain(side,'leg',foot,pole);
    }else{
     const foot=new T.Vector3(sign*.11*h,0,.22*h);seat.group.localToWorld(foot);foot.y=.065*h;
     const pole=seat.group.localToWorld(new T.Vector3(sign*.16,.42,.12));a.solveChain(side,'leg',foot,pole);
    }
    if(seat.piano&&seat.keyboard){
     seat.keyboard.updateWorldMatrix(true,true);
     const hx=side==='L'?-.22:.22,t=this.time||0;
     const hand=seat.keyboard.localToWorld(new T.Vector3(.61+hx,.015,.04+Math.sin(t*8+(side==='L'?0:1.3))*.035));
     const elbow=seat.keyboard.localToWorld(new T.Vector3(.61+hx*1.55,.22,.18));
     a.solveChain(side,'arm',hand,elbow);
    }else{
     const hand=seat.group.localToWorld(new T.Vector3(sign*.13,.59,.21));a.solveChain(side,'arm',hand,seat.group.localToWorld(new T.Vector3(sign*.4,.8,.02)));
    }
   }
   if(seat.piano&&a.seatBlend>.25)this.piano?.ensurePlaying(a);
   a.group.updateMatrixWorld(true);a.root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});return;
  }
  if(a.balance.state==='standing'&&!a.waterSwimming&&!a.grabs.size)a.group.position.y=this.floorHeight(a.group.position)+Math.max(-.02,a.group.position.y-(a.baseY||0));
  this.project(a.group.position,.34*Math.sqrt(a.shape.hips||1),.06,1.7);a.group.updateMatrixWorld(true);
 }
 project(p,r,y=0,height=.1,ignore=null){
  const y0=Number.isFinite(p?.y)?p.y+y:y;
  let hit=false;
  for(let pass=0;pass<4;pass++){
   let moved=false;
   for(const o of this.nearby(p,r)){
    if(o===ignore||o.h5Container||o.walkable||y0>o.y+o.h||y0+height<o.y)continue;
    if(this.portalOpen?.(p,o,r,y,height))continue;
    const dx=p.x-o.x,dz=p.z-o.z,ex=o.w/2+r-Math.abs(dx),ez=o.d/2+r-Math.abs(dz);
    if(ex>0&&ez>0){if(ex<ez)p.x+=(dx>=0?1:-1)*ex;else p.z+=(dz>=0?1:-1)*ez;hit=true;moved=true;}
   }
   if(!moved)break;
  }
  return hit;
 }
 projectSphere(p,r){let hit=false;for(let pass=0;pass<3;pass++){let moved=false;for(const o of this.nearby(p,r)){if(o.h5Container)continue;if(this.portalOpen?.(p,o,r))continue;const q=new T.Vector3(T.MathUtils.clamp(p.x,o.x-o.w/2,o.x+o.w/2),T.MathUtils.clamp(p.y,o.y,o.y+o.h),T.MathUtils.clamp(p.z,o.z-o.d/2,o.z+o.d/2)),d=p.clone().sub(q),l=d.length();if(l>=r)continue;if(l>.000001)p.copy(q).addScaledVector(d,r/l);else{const choices=[[o.x+o.w/2+r-p.x,'x',1],[p.x-(o.x-o.w/2-r),'x',-1],[o.y+o.h+r-p.y,'y',1],[p.y-o.y+r,'y',-1],[o.z+o.d/2+r-p.z,'z',1],[p.z-(o.z-o.d/2-r),'z',-1]].sort((a,b)=>a[0]-b[0]);p[choices[0][1]]+=choices[0][0]*choices[0][2];}hit=true;moved=true;}if(!moved)break;}return hit;}
 tick(dt){this.fractures.mesh.visible=this.root.visible;this.time+=dt;this.fractures.tick(dt);this.doors?.tick?.(dt);this.laundry?.tick?.(dt);tickNature(this,dt);for(const seat of this.seats)if(seat.occupant&&!this.system.actors.includes(seat.occupant))seat.occupant=null;for(const b of this.system.balls){if(b.held)continue;const before=b.mesh.position.clone();if(this.projectSphere(b.mesh.position,b.rad)){const n=b.mesh.position.clone().sub(before).normalize(),v=b.vel.dot(n);if(v<0)b.vel.addScaledVector(n,-1.4*v);}}}
}
