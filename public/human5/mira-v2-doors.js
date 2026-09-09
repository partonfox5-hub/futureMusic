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
  this.grips=new Map();
 }
 clear(){
  for(const d of this.list){
   if(d.obstacle)this.world.removeObstacle(d.obstacle);
   d.root.removeFromParent();
  }
  this.list=[];this.grips.clear();
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
  const latchX=-hingeSign*(width-.08);
  const knob=new T.Mesh(new T.SphereGeometry(.028,10,8),new T.MeshStandardMaterial({color:0xc4b089,roughness:.35,metalness:.65}));
  knob.position.set(latchX,-height*.04,thick*.55);panel.add(knob);
  const plate=new T.Mesh(new T.BoxGeometry(.04,.11,.01),new T.MeshStandardMaterial({color:0xb09a72,roughness:.4,metalness:.55}));
  plate.position.set(latchX,-height*.04,thick*.52);panel.add(plate);
  const o=this.world.obstacle(x,z,axisAligned(yaw,width,thick).w,axisAligned(yaw,width,thick).d,y,height,panel);
  const part=this.world.fractures.register(panel,'wood',o);
  const door={root,panel,knob,hingeSign,swing,max,angle:0,target:0,velocity:0,latched:true,grabbed:null,obstacle:o,part,width,height,thick,yaw,x,y,z};
  panel.userData.houseDoor=door;knob.userData.houseDoor=door;plate.userData.houseDoor=door;
  this.world.pickables.push(knob,plate);
  this.list.push(door);
  this.syncObstacle(door);
  return door;
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
   const handle=d.knob.getWorldPosition(V());
   if(p.distanceTo(handle)>.11)continue;
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
