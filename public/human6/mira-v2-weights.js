import * as T from 'three';
import {tagMovable,syncFurniture} from './mira-v2-furniture.js?v=18.0.0';
const V=()=>new T.Vector3();
export const PLATES=[
 {kg:25,color:0x2f7a3a,r:.225,t:.056,n:2},
 {kg:20,color:0x2a5da8,r:.225,t:.046,n:2},
 {kg:15,color:0xd4b42a,r:.200,t:.038,n:2},
 {kg:10,color:0x3d8b4a,r:.162,t:.032,n:4},
 {kg:5,color:0xe8e6dc,r:.118,t:.028,n:4},
 {kg:2.5,color:0x2a2a2a,r:.095,t:.022,n:4},
 {kg:1.25,color:0xb0b4b8,r:.080,t:.018,n:4}
];
const BAR={mass:20,shaft:.66,sleeve0:.68,sleeve1:1.07,radius:.014,sleeveR:.025};

export function throwSpeed(mass){
 return 1.2*13.5/Math.pow(Math.max(1.15,mass),.44);
}

function plateGeom(r,t){
 const shape=new T.Shape();
 shape.absarc(0,0,r,0,Math.PI*2,false);
 const hole=new T.Path();hole.absarc(0,0,.0254,0,Math.PI*2,true);shape.holes.push(hole);
 const g=new T.ExtrudeGeometry(shape,{depth:t,bevelEnabled:true,bevelThickness:Math.min(.006,t*.18),bevelSize:Math.min(.01,r*.04),bevelSegments:1,curveSegments:22});
 g.translate(0,0,-t/2);return g;
}
function plateLabel(kg,hex){
 const c=document.createElement('canvas');c.width=256;c.height=256;
 const g=c.getContext('2d');
 g.fillStyle='#'+hex.toString(16).padStart(6,'0');g.beginPath();g.arc(128,128,124,0,Math.PI*2);g.fill();
 g.globalCompositeOperation='destination-out';g.beginPath();g.arc(128,128,30,0,Math.PI*2);g.fill();
 g.globalCompositeOperation='source-over';
 g.fillStyle='#f2f2f0';g.font='700 70px Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(String(kg),128,122);
 g.font='600 22px Arial,sans-serif';g.fillText('kg',128,168);
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;
}

function metal(color,rough=.38,metalness=.72){
 return new T.MeshStandardMaterial({color,roughness:rough,metalness});
}

export function spawnPlate(world,p,spec){
 const group=new T.Group();group.position.copy(p);world.root.add(group);
 const mesh=new T.Mesh(plateGeom(spec.r,spec.t),metal(spec.color,.42,.28));
 mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
 const hub=new T.Mesh(new T.CylinderGeometry(.046,.046,spec.t+.01,16),metal(0xc5c8cc,.3,.8));
 hub.rotation.x=Math.PI/2;group.add(hub);
 const map=plateLabel(spec.kg,spec.color);
 for(const s of [-1,1]){
  const face=new T.Mesh(new T.CircleGeometry(spec.r*.72,24),new T.MeshStandardMaterial({map,roughness:.55,metalness:.12}));
  face.position.z=s*(spec.t*.5+.001);if(s<0)face.rotation.y=Math.PI;group.add(face);
 }
 const furn=tagMovable(world,group,'Weight plate');
 furn.mass=spec.kg;furn.throwable=true;furn.health=220;furn.maxHealth=220;
 group.userData.plate={kg:spec.kg,r:spec.r,t:spec.t,onBar:null,onPeg:null,side:-1};
 mesh.userData.weightPlate=group.userData.plate;
 group.traverse(m=>{if(m.isMesh){m.userData.weightPlate=group.userData.plate;world.fractures.register(m,'metal');}});
 return group;
}

export function spawnDumbbell(world,p,kg){
 const group=new T.Group();group.position.copy(p);world.root.add(group);
 const r=.045+kg*.004,len=.28+kg*.006;
 const bar=new T.Mesh(new T.CylinderGeometry(.012,.012,len,10),metal(0x8a9096));
 bar.rotation.z=Math.PI/2;bar.position.y=r;group.add(bar);
 for(const s of [-1,1]){
  const bell=new T.Mesh(new T.CylinderGeometry(r,r*.92,.07,12),metal(0x2c2c2c,.5,.4));
  bell.rotation.z=Math.PI/2;bell.position.set(s*(len/2+.02),r,0);group.add(bell);
 }
 const furn=tagMovable(world,group,'Dumbbell');
 furn.mass=kg;furn.throwable=true;furn.health=180;
 group.userData.dumbbell={kg};
 group.traverse(m=>{if(m.isMesh){m.userData.dumbbell=group.userData.dumbbell;world.fractures.register(m,'metal');}});
 return group;
}

export function spawnBarbell(world,p,yaw=0){
 const group=new T.Group();group.position.copy(p);group.rotation.y=yaw;world.root.add(group);
 const chrome=metal(0xc5c8cc,.28,.82),dark=metal(0x4a4e52,.4,.55);
 const shaft=new T.Mesh(new T.CylinderGeometry(BAR.radius,BAR.radius,BAR.shaft*2,12),dark);
 shaft.rotation.z=Math.PI/2;shaft.position.y=.014;group.add(shaft);
 for(const s of [-1,1]){
  const sleeve=new T.Mesh(new T.CylinderGeometry(BAR.sleeveR,BAR.sleeveR,BAR.sleeve1-BAR.sleeve0+.04,12),chrome);
  sleeve.rotation.z=Math.PI/2;sleeve.position.set(s*(BAR.sleeve0+BAR.sleeve1)*.5,.014,0);group.add(sleeve);
  const ring=new T.Mesh(new T.TorusGeometry(.03,.006,6,12),dark);
  ring.rotation.y=Math.PI/2;ring.position.set(s*BAR.shaft,.014,0);group.add(ring);
 }
 const furn=tagMovable(world,group,'Barbell');
 furn.mass=BAR.mass;furn.throwable=true;furn.melee=true;furn.health=260;
 furn.kind='blunt';furn.reach=1.15;
 group.userData.barbell={sides:[[],[]],mass:BAR.mass};
 group.traverse(m=>{if(m.isMesh){m.userData.barbell=true;world.fractures.register(m,'metal');}});
 return group;
}

export function spawnBench(world,p,yaw=0){
 const group=new T.Group();group.position.copy(p);group.rotation.y=yaw;world.root.add(group);
 const pad=new T.Mesh(new T.BoxGeometry(1.32,.08,.34),new T.MeshStandardMaterial({color:0x3a2a28,roughness:.9}));
 pad.position.set(0,.44,0);group.add(pad);
 const frame=new T.Mesh(new T.BoxGeometry(1.24,.06,.28),metal(0x4a4a4e,.5,.4));
 frame.position.set(0,.38,0);group.add(frame);
 for(const [x,z] of [[-.52,.12],[-.52,-.12],[.42,.12],[.42,-.12]]){
  const leg=new T.Mesh(new T.BoxGeometry(.05,.38,.05),metal(0x33363a));
  leg.position.set(x,.19,z);group.add(leg);
 }
 const cross=new T.Mesh(new T.BoxGeometry(.05,.05,1.16),metal(0x33363a));
 cross.position.set(.58,1.12,0);group.add(cross);
 for(const s of [-1,1]){
  const up=new T.Mesh(new T.BoxGeometry(.05,1.28,.05),metal(0x33363a));
  up.position.set(.58,.70,s*.56);group.add(up);
  const hook=new T.Mesh(new T.BoxGeometry(.16,.028,.05),metal(0x8a9096));
  hook.position.set(.46,1.16,s*.56);group.add(hook);
 }
 const furn=tagMovable(world,group,'Bench');
 furn.mass=38;furn.health=90;furn.rackY=1.16;furn.rackX=.46;
 group.traverse(m=>{if(m.isMesh)world.fractures.register(m,m===pad?'wood':'metal');});
 return group;
}

function refreshBar(bar){
 const bb=bar.userData.barbell,furn=bar.userData.furniture;if(!bb||!furn)return;
 let m=BAR.mass;
 for(const side of bb.sides)for(const pl of side)m+=pl.userData.plate.kg;
 bb.mass=m;furn.mass=m;
}

function popFromWorld(world,plate){
 plate.updateWorldMatrix(true,true);
 const wp=plate.getWorldPosition(new T.Vector3());
 const wq=plate.getWorldQuaternion(new T.Quaternion());
 (world?.root||plate.parent).attach(plate);
 plate.position.copy(wp);plate.quaternion.copy(wq);
 return plate;
}
export function detachPlate(world,plate){
 const info=plate.userData.plate;if(!info)return plate;
 if(info.onPeg){
  const peg=info.onPeg,list=peg.plates,i=list.indexOf(plate);if(i>=0)list.splice(i);
  popFromWorld(world,plate);info.onPeg=null;info.side=-1;
  restackPeg(peg);
 }else if(info.onBar){
  const bar=info.onBar,bb=bar.userData.barbell,side=info.side;
  const list=bb.sides[side],i=list.indexOf(plate);if(i>=0)list.splice(i);
  popFromWorld(world,plate);info.onBar=null;info.side=-1;
  restack(bar,side);refreshBar(bar);
 }else return plate;
 const furn=tagMovable(world,plate,'Weight plate');
 furn.mass=info.kg;furn.throwable=true;furn.health=220;
 return plate;
}
function restackPeg(peg){
 const sign=Math.sign(peg.z)||1;
 let z=peg.z+sign*.04;
 for(const pl of peg.plates){
  const t=pl.userData.plate.t;
  z+=sign*(t*.5+.003);
  pl.position.set(0,peg.y,z);pl.rotation.set(0,0,0);
  z+=sign*(t*.5);
 }
}

function restack(bar,side){
 const list=bar.userData.barbell.sides[side],sign=side===1?1:-1;
 let x=sign*BAR.sleeve0;
 for(const pl of list){
  const t=pl.userData.plate.t;
  x+=sign*(t*.5+.002);
  pl.position.set(x,.014,0);pl.rotation.set(0,Math.PI/2,0);
  x+=sign*(t*.5);
 }
}

export function tryLoadPlate(world,bar,plate){
 const info=plate.userData.plate,bb=bar.userData.barbell;if(!info||!bb||info.onBar||plate===bar)return false;
 plate.updateWorldMatrix(true,true);bar.updateWorldMatrix(true,true);
 const p=plate.getWorldPosition(new T.Vector3());
 let best=-1,bd=.22;
 for(const side of [0,1]){
  const sign=side===1?1:-1,list=bb.sides[side];
  let x=sign*BAR.sleeve0;for(const pl of list)x+=sign*(pl.userData.plate.t+.004);
  const sleeve=bar.localToWorld(new T.Vector3(x,.014,0));
  const d=p.distanceTo(sleeve);if(d<bd){bd=d;best=side;}
 }
 if(best<0)return false;
 const furn=plate.userData.furniture;
 if(furn?.obstacle)world.removeObstacle(furn.obstacle);
 if(world.movables)world.movables=world.movables.filter(g=>g!==plate);
 bar.attach(plate);
 info.onBar=bar;info.side=best;
 bb.sides[best].push(plate);
 restack(bar,best);refreshBar(bar);
 if(furn){furn.held=null;furn.holds?.clear?.();}
 return true;
}

export function rackBarbell(bench,bar){
 const bf=bench.userData.furniture,bb=bar.userData.barbell;if(!bf||!bb)return false;
 bench.updateWorldMatrix(true,true);bar.updateWorldMatrix(true,true);
 const hook=bench.localToWorld(new T.Vector3(.46,1.16,0));
 const mid=bar.getWorldPosition(new T.Vector3());
 if(hook.distanceTo(mid)>.72)return false;
 bar.position.copy(hook);
 const q=bench.getWorldQuaternion(new T.Quaternion()).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI/2));
 bar.quaternion.copy(q);
 const furn=bar.userData.furniture;if(furn){furn.velocity.set(0,0,0);furn.omega=furn.omega||new T.Vector3();furn.omega.set(0,0,0);furn.racked=true;}
 return true;
}

export function spawnPlateTree(world,p,yaw=0){
 const group=new T.Group();group.position.copy(p);group.rotation.y=yaw;world.root.add(group);
 const steel=metal(0x3a3e42,.45,.55),chrome=metal(0xb8bdc2,.32,.75);
 const post=new T.Mesh(new T.CylinderGeometry(.028,.034,1.18,10),steel);post.position.y=.59;group.add(post);
 const base=new T.Mesh(new T.CylinderGeometry(.15,.17,.05,12),steel);base.position.y=.025;group.add(base);
 const pegs=[];
 PLATES.forEach((spec,i)=>{
  const y=.20+i*.135;
  for(const side of [-1,1]){
   const peg=new T.Mesh(new T.CylinderGeometry(.012,.012,.30,8),chrome);
   peg.rotation.x=Math.PI/2;peg.position.set(0,y,side*.20);group.add(peg);
   pegs.push({mesh:peg,y,z:side*.20,kg:spec.kg,plates:[],tree:group});
  }
 });
 group.userData.plateTree={pegs};
 group.traverse(m=>{if(m.isMesh){m.castShadow=true;world.fractures.register(m,'metal');}});
 world.obstacle(p.x,p.z,.28,.55,0,1.2,group);
 return group;
}
function putPlateOnPeg(world,peg,plate){
 const info=plate.userData.plate,tree=peg.tree;if(!info||!tree||info.onBar||info.onPeg)return false;
 const furn=plate.userData.furniture;
 if(furn?.obstacle)world.removeObstacle(furn.obstacle);
 if(world.movables)world.movables=world.movables.filter(g=>g!==plate);
 tree.attach(plate);info.onPeg=peg;peg.plates.push(plate);restackPeg(peg);
 if(furn){furn.held=null;furn.holds?.clear?.();furn.velocity?.set(0,0,0);}
 return true;
}
export function tryRackPlate(world,tree,plate){
 const info=plate.userData.plate,pt=tree.userData.plateTree;if(!info||!pt||info.onBar||info.onPeg)return false;
 plate.updateWorldMatrix(true,true);tree.updateWorldMatrix(true,true);
 const p=plate.getWorldPosition(new T.Vector3());
 let best=null,bd=.28;
 for(const peg of pt.pegs){
  if(Math.abs(peg.kg-info.kg)>0.01)continue;
  const tip=tree.localToWorld(new T.Vector3(0,peg.y,peg.z+Math.sign(peg.z)*.12));
  const d=p.distanceTo(tip);if(d<bd){bd=d;best=peg;}
 }
 if(!best){
  for(const peg of pt.pegs){
   const tip=tree.localToWorld(new T.Vector3(0,peg.y,peg.z+Math.sign(peg.z)*.12));
   const d=p.distanceTo(tip);if(d<bd){bd=d;best=peg;}
  }
 }
 return best?putPlateOnPeg(world,best,plate):false;
}

export function installWeights(world,origin=new T.Vector3(10.1,0,1.2),yaw=0){
 const q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),yaw);
 const at=(x,y,z)=>origin.clone().add(new T.Vector3(x,y,z).applyQuaternion(q));
 const bench=spawnBench(world,at(0,0,0),yaw);
 const bar=spawnBarbell(world,at(.46,1.16,0),yaw+Math.PI/2);
 if(bar.userData.furniture){bar.userData.furniture.racked=true;bar.userData.furniture.velocity.set(0,0,0);}
 const trees=[spawnPlateTree(world,at(-1.05,0,-1.15),yaw),spawnPlateTree(world,at(-1.05,0,1.15),yaw)];
 const plates=[];
 const used=new Map();
 for(const spec of PLATES){
  for(let i=0;i<spec.n;i++){
   const g=spawnPlate(world,at(-1.05,spec.r,.2),spec);
   plates.push(g);
   let peg=null;
   for(const tree of trees){
    const free=tree.userData.plateTree.pegs.find(p=>p.kg===spec.kg&&(used.get(p)||0)<Math.ceil(spec.n/2));
    if(free){peg=free;break;}
   }
   if(!peg)for(const tree of trees){peg=tree.userData.plateTree.pegs.find(p=>p.kg===spec.kg);if(peg)break;}
   if(peg){putPlateOnPeg(world,peg,g);used.set(peg,(used.get(peg)||0)+1);}
  }
 }
 const bells=[];
 [[5,-1.85,.85],[5,-1.85,1.05],[10,-1.55,.85],[10,-1.55,1.05],[15,-1.25,.85],[15,-1.25,1.05]].forEach(([kg,x,z])=>bells.push(spawnDumbbell(world,at(x,0,z),kg)));
 world.gym={bench,bar,plates,bells,trees};
 return world.gym;
}

export function plateFromObject(o){
 while(o){if(o.userData?.plate)return o.userData.plate.onBar?o:o;if(o.userData?.weightPlate){let g=o;while(g&&!g.userData.plate)g=g.parent;return g;}o=o.parent;}
 return null;
}

export function installWeightPhysics(props){
 const api={
  nearestPlate(pos,r=.2){
   let best=null,bd=r;
   const consider=g=>{if(!g?.userData?.plate)return;const box=new T.Box3().setFromObject(g),d=box.clampPoint(pos,new T.Vector3()).distanceTo(pos);if(d<bd){bd=d;best=g;}};
   for(const g of props.world.movables||[])consider(g);
   const gym=props.world.gym;if(gym?.bar?.userData.barbell)for(const side of gym.bar.userData.barbell.sides)for(const p of side)consider(p);
   return best;
  },
  pickPlate(object){
   let g=object;while(g&&!g.userData?.plate)g=g.parent;
   if(!g?.userData?.plate)return null;
   if(g.userData.plate.onBar||g.userData.plate.onPeg)detachPlate(props.world,g);
   return g;
  },
  onRelease(group){
   const furn=group?.userData?.furniture;if(!furn)return;
   const gym=props.world.gym;if(!gym)return;
   if(group.userData.plate){
    for(const bar of [gym.bar,...(props.world.movables||[]).filter(m=>m.userData.barbell)]){
     if(tryLoadPlate(props.world,bar,group))return;
    }
    for(const tree of gym.trees||[])if(tryRackPlate(props.world,tree,group))return;
   }
   if(group.userData.barbell&&gym.bench)rackBarbell(gym.bench,group);
  },
  throwHeld(key){
   const hold=props.furnHolds.get(key);if(!hold)return false;
   const group=hold.group,furn=group.userData.furniture;
   if(!furn?.throwable&&!group.userData.plate&&!group.userData.dumbbell)return false;
   const cam=props.camera,dir=new T.Vector3(0,0,-1).applyQuaternion(cam.getWorldQuaternion(new T.Quaternion()));
   dir.y+=.22;dir.normalize();
   const speed=throwSpeed(furn.mass);
   props.releaseFurniture(key);
   furn.velocity.copy(dir).multiplyScalar(speed);
   furn.velocity.y=Math.max(furn.velocity.y,speed*.28);
   furn.omega=new T.Vector3((Math.random()-.5)*6,(Math.random()-.5)*4,(Math.random()-.5)*6);
   if(speed<2.4)this.onRelease(group);
   return true;
  },
  tick(dt){
   const gym=props.world.gym;if(!gym)return;
   this.tickThrown(dt);
   this.tickMelee(dt);
  },
  tickThrown(dt){
   for(const group of props.world.movables||[]){
    const furn=group.userData.furniture,plate=group.userData.plate||group.userData.dumbbell;
    if(!furn||!plate||furn.holds?.size||group.userData.plate?.onBar)continue;
    const speed=furn.velocity?.length?.()||0;if(speed<1.6)continue;
    const prev=group.userData.lastThrowPos||group.getWorldPosition(new T.Vector3());
    const now=group.getWorldPosition(new T.Vector3());
    const dist=prev.distanceTo(now);if(dist<.01){group.userData.lastThrowPos=now;continue;}
    const ray=new T.Ray(prev,now.clone().sub(prev).normalize());
    const hit=props.hit(ray,dist+.04,false,{world:true});
    group.userData.lastThrowPos=now.clone();
    if(!hit)continue;
    let skip=false,o=hit.object;while(o){if(o===group)skip=true;o=o.parent;}
    if(skip)continue;
    if(props.time-(furn.lastImpact||0)<.18)continue;
    furn.lastImpact=props.time;
    const energy=Math.min(92,.22*.5*furn.mass*speed*speed);
    props.impact(hit,energy,ray.direction,'blunt',0);
    const n=hit.face?.normal.clone().transformDirection(hit.object.matrixWorld)||ray.direction.clone().negate();
    n.normalize();const vn=furn.velocity.dot(n);if(vn<0)furn.velocity.addScaledVector(n,-1.25*vn);
    furn.velocity.multiplyScalar(.55);
   }
  },
  tickMelee(dt){
   for(const [key,hold] of props.furnHolds){
    const group=hold.group,furn=group.userData.furniture;
    if(!furn?.melee&&!group.userData.barbell&&!group.userData.dumbbell)continue;
    const samples=[group.localToWorld(new T.Vector3(-1.05,.02,0)),group.localToWorld(new T.Vector3(1.05,.02,0))];
    const prev=group.userData.lastMelee||samples.map(s=>s.clone());
    group.userData.lastMelee=samples.map(s=>s.clone());
    if(typeof key==='number'&&props.time<(furn.armedAt||0))continue;
    for(let i=0;i<samples.length;i++){
     const a=prev[i],b=samples[i],dist=a.distanceTo(b),speed=Math.min(14,dist/Math.max(.001,dt));
     if(dist<.03||dist>.9||speed<1.4)continue;
     const ray=new T.Ray(a,b.clone().sub(a).normalize());
     const hit=props.hit(ray,dist+.04,false,{world:true});if(!hit)continue;
     let skip=false,o=hit.object;while(o){if(o===group)skip=true;o=o.parent;}
     if(skip)continue;
     const id=hit.object.uuid;if(props.time-(furn.lastHit?.get?.(id)??-2)<.28)continue;
     furn.lastHit=furn.lastHit||new Map();furn.lastHit.set(id,props.time);
     const energy=.5*furn.mass*speed*speed*.12;
     props.impact(hit,Math.min(110,energy),ray.direction,'blunt',0);
     if(typeof key==='number')props.system.hands.haptics?.contact(key,'prop',Math.min(1,speed*.4),.01);
    }
   }
  }
 };
 props.weights=api;return api;
}
