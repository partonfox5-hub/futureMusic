import * as T from 'three';
const V=()=>new T.Vector3(),Q=()=>new T.Quaternion();
const clamp=T.MathUtils.clamp;

function woodMat(color=0x6b4e36){
 return new T.MeshStandardMaterial({color,roughness:.82,metalness:.02});
}

export class HouseDoors {
 constructor(world){
  this.world=world;
  this.list=[];
  this.casings=[];
  this.grips=new Map();
 }
 clear(){
  for(const d of this.list){
   if(d.obstacle)this.world.removeObstacle(d.obstacle);
   d.root.removeFromParent();
  }
  for(const f of this.casings){
   f.traverse(m=>{
    const piece=m.userData?.piece;
    if(piece?.obstacle)this.world.removeObstacle(piece.obstacle);
    if(piece)piece.broken=true;
    if(this.world.pickables)this.world.pickables=this.world.pickables.filter(o=>o!==m);
   });
   f.removeFromParent();
  }
  this.list=[];this.casings=[];this.grips.clear();
 }
 place(x,y,z,yaw,opts={}){
  const width=opts.width??.9,height=opts.height??2.04,thick=opts.thick??.042;
  const hingeSign=opts.hinge??-1,swing=opts.swing??-1,max=opts.max??95*Math.PI/180;
  const along=new T.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  const hingePos=new T.Vector3(x,y+height/2,z).addScaledVector(along,hingeSign*width/2);
  const root=new T.Group();root.position.copy(hingePos);root.rotation.y=yaw;this.world.root.add(root);
  const panel=new T.Mesh(new T.BoxGeometry(width,height,thick),woodMat(opts.color??0x6e5138));
  panel.position.set(-hingeSign*width/2,0,0);panel.castShadow=panel.receiveShadow=true;root.add(panel);
  const stile=new T.Mesh(new T.BoxGeometry(width*.16,height*.96,thick+.006),woodMat(0x5a412e));
  stile.position.set(-hingeSign*width*.42,0,0);panel.add(stile);
  const mid=new T.Mesh(new T.BoxGeometry(width*.72,.06,thick+.008),woodMat(0x5a412e));
  mid.position.set(-hingeSign*width*.02,-height*.08,0);panel.add(mid);
  const half=width/2,knobR=.032,inset=Math.min(.07,Math.max(.045,half-knobR-.02));
  const latchX=clamp(-hingeSign*(half-inset),-half+knobR+.015,half-knobR-.015);
  const knobY=.92-height/2;
  const metal=new T.MeshStandardMaterial({color:0xd4c4a0,roughness:.32,metalness:.7});
  const plateMat=new T.MeshStandardMaterial({color:0xb09a72,roughness:.4,metalness:.55});
  const o=this.world.obstacle(x,z,axisAligned(yaw,width,thick).w,axisAligned(yaw,width,thick).d,y,height,panel);
  const part=this.world.fractures.register(panel,'wood',o);
  const door={root,panel,knob:null,knobs:[],hingeSign,swing,max,angle:0,target:0,velocity:0,latched:true,grabbed:null,obstacle:o,part,width,height,thick,yaw,x,y,z};
  const spindle=new T.Mesh(new T.CylinderGeometry(.008,.008,thick+.016,8),metal);
  spindle.rotation.x=Math.PI/2;spindle.position.set(latchX,knobY,0);panel.add(spindle);
  const mount=(side)=>{
   const zFace=side*(thick/2);
   const plate=new T.Mesh(new T.BoxGeometry(.05,.12,.008),plateMat);
   plate.position.set(latchX,knobY,zFace+side*.004);panel.add(plate);
   const neck=new T.Mesh(new T.CylinderGeometry(.011,.011,.022,8),metal);
   neck.rotation.x=Math.PI/2;neck.position.set(latchX,knobY,zFace+side*.015);panel.add(neck);
   const knob=new T.Mesh(new T.SphereGeometry(knobR,12,10),metal);
   knob.position.set(latchX,knobY,zFace+side*(.022+knobR));panel.add(knob);
   plate.userData.houseDoor=door;neck.userData.houseDoor=door;knob.userData.houseDoor=door;
   this.world.pickables.push(knob,plate);
   door.knobs.push(knob);
   return knob;
  };
  door.knob=mount(1);mount(-1);
  panel.userData.houseDoor=door;
  this.placeCasing(x,y,z,yaw,width,height);
  this.list.push(door);
  this.syncObstacle(door);
  return door;
 }
 placeCasing(x,y,z,yaw,width,height){
  const coverW=1.62,coverH=2.16,thick=.15,innerW=width+.05,innerH=height+.03;
  const sideW=Math.max(.08,(coverW-innerW)/2),headH=Math.max(.08,coverH-innerH);
  const frame=new T.Group();frame.name='Door casing';frame.position.set(x,0,z);frame.rotation.y=yaw;this.world.root.add(frame);this.casings.push(frame);
  const mat=woodMat(0x5c4634);
  const add=(sx,sy,sz,px,py,pz)=>{
   const m=new T.Mesh(new T.BoxGeometry(sx,sy,sz),mat);
   m.position.set(px,py,pz);m.castShadow=m.receiveShadow=true;m.name='Door jamb';frame.add(m);
  };
  add(sideW,innerH,thick,-(innerW+sideW)/2,y+innerH/2,0);
  add(sideW,innerH,thick,(innerW+sideW)/2,y+innerH/2,0);
  add(innerW+sideW*2,headH,thick,0,y+innerH+headH/2,0);
  frame.updateWorldMatrix(true,true);
  frame.traverse(m=>{
   if(!m.isMesh)return;
   const box=new T.Box3().setFromObject(m),c=box.getCenter(V()),s=box.getSize(V());
   const o=this.world.obstacle(c.x,c.z,Math.max(.06,s.x),Math.max(.06,s.z),box.min.y,s.y,m);
   this.world.fractures.register(m,'wood',o);
  });
 }
 syncObstacle(d){
  if(!d.obstacle||d.part?.broken)return;
  d.root.updateWorldMatrix(true,true);
  const box=new T.Box3().setFromObject(d.panel),c=box.getCenter(V()),s=box.getSize(V());
  d.obstacle.x=c.x;d.obstacle.z=c.z;
  d.obstacle.w=Math.max(.07,s.x);d.obstacle.d=Math.max(.07,s.z);
  d.obstacle.y=box.min.y;d.obstacle.h=Math.max(.2,s.y);
  this.world.grid=null;
 }
 palm(props,i){return props.system.hands.palmPos?.(i)?.clone()||props.system.hands.grip?.[i]?.getWorldPosition(V());}
 hingeAngle(d,worldPoint){
  const local=d.root.parent.worldToLocal(worldPoint.clone()).sub(d.root.position);
  const c=Math.cos(-d.yaw),s=Math.sin(-d.yaw);
  const lx=local.x*c-local.z*s,lz=local.x*s+local.z*c;
  return Math.atan2(lz,lx);
 }
 grip(i,props){
  if(this.grips.has(i))return true;
  const p=this.palm(props,i);if(!p)return false;
  for(const d of this.list){
   if(d.part?.broken||d.grabbed!=null)continue;
   d.root.updateWorldMatrix(true,true);
   const knobs=d.knobs?.length?d.knobs:[d.knob];
   if(!knobs.some(k=>p.distanceTo(k.getWorldPosition(V()))<.12))continue;
   this.grips.set(i,{door:d,start:this.hingeAngle(d,p),angle:d.angle});
   d.grabbed=i;d.latched=false;d.velocity=0;
   props.status='Door · pull to swing, release to latch or leave open';
   if(typeof i==='number')props.system.hands.haptics?.contact?.(i,'prop',.5,.012);
   return true;
  }
  return false;
 }
 release(i){
  const g=this.grips.get(i);if(!g)return;
  const d=g.door;d.grabbed=null;
  d.target=d.angle<10*Math.PI/180?0:d.max;
  d.latched=d.target===0;
  this.grips.delete(i);
 }
 click(ray,props){
  const hit=props.hit(ray,8,false);const d=hit?.object?.userData?.houseDoor;
  if(!d||d.part?.broken)return false;
  d.target=d.target>1e-3?0:d.max;d.latched=false;d.velocity=0;
  props.status=d.target?'Door opening':'Door closing';
  return true;
 }
 tick(dt){
  dt=Math.min(.04,dt);
  for(const [i,g] of [...this.grips]){
   const props=this.world.interactions;if(!props){this.release(i);continue;}
   const p=this.palm(props,i);if(!p||g.door.part?.broken){this.release(i);continue;}
   const a=this.hingeAngle(g.door,p);
   const delta=Math.atan2(Math.sin(a-g.start),Math.cos(a-g.start));
   g.door.angle=g.door.target=clamp(g.angle+delta*g.door.swing*g.door.hingeSign,0,g.door.max);
  }
  for(const d of this.list){
   if(d.part?.broken){
    if(d.obstacle){this.world.removeObstacle(d.obstacle);d.obstacle=null;}
    d.root.visible=false;continue;
   }
   if(d.grabbed==null){
    d.velocity+=(48*(d.target-d.angle)-11*d.velocity)*dt;
    d.angle=clamp(d.angle+d.velocity*dt,0,d.max);
    if(d.target===0&&d.angle<.003){d.angle=d.velocity=0;d.latched=true;}
   }
   d.root.quaternion.setFromAxisAngle(new T.Vector3(0,1,0),d.yaw+d.swing*d.angle);
   this.syncObstacle(d);
  }
 }
}

function axisAligned(yaw,width,thick){
 const c=Math.abs(Math.cos(yaw)),s=Math.abs(Math.sin(yaw));
 return {w:width*c+thick*s,d:width*s+thick*c};
}
