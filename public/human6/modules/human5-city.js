import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {clamp,V} from './human5-common.js?v=17.5.0';

/** Bounded kinematic elevator; requests queue, doors interlock with travel. */
export class ElevatorMotion {
 constructor({floors=3,story=3.15,base=0,floor=0}={}){Object.assign(this,{floors,story,base,y:base+floor*story,velocity:0,floor,target:floor,door:1,wait:2,queue:[]});}
 request(floor){if(!Number.isInteger(floor)||floor<0||floor>=this.floors)return false;if(floor===this.floor&&Math.abs(this.y-this.level(floor))<.015){this.wait=2;return true;}if(!this.queue.includes(floor)&&floor!==this.target)this.queue.push(floor);return true;}
 level(floor){return this.base+floor*this.story;}
 tick(dt,blocked=false){dt=clamp(dt,0,.05);const before=this.y;
  if(this.wait>0){this.wait=Math.max(0,this.wait-dt);this.door=Math.min(1,this.door+dt*1.3);if(blocked)this.wait=1;return 0;}
  if(this.target===this.floor&&this.queue.length)this.target=this.queue.shift();
  if(this.target!==this.floor){if(blocked&&this.door>.05){this.wait=1;return 0;}this.door=Math.max(0,this.door-dt*1.3);if(this.door>.001)return 0;const delta=this.level(this.target)-this.y,speed=Math.sign(delta)*Math.min(1.8,Math.sqrt(2*1.6*Math.abs(delta)));this.velocity+=clamp(speed-this.velocity,-1.6*dt,1.6*dt);const move=this.velocity*dt;
   if(Math.abs(delta)<.012||Math.sign(delta)!==Math.sign(delta-move)){this.y=this.level(this.target);this.floor=this.target;this.velocity=0;this.wait=2;}else this.y+=move;
  }else this.door=Math.min(1,this.door+dt*1.3);return this.y-before;
 }
}
class Parts {
 constructor(){this.parts=new Map();}
 box(material,x,y,z,w,h,d,rotation=0){const g=new T.BoxGeometry(w,h,d);if(rotation)g.rotateY(rotation);g.translate(x,y,z);if(!this.parts.has(material))this.parts.set(material,[]);this.parts.get(material).push(g);}
 finish(root){const meshes=[];for(const [material,parts] of this.parts){const mesh=new T.Mesh(mergeGeometries(parts),material);parts.forEach(g=>g.dispose());mesh.castShadow=!material.transparent;mesh.receiveShadow=true;root.add(mesh);meshes.push(mesh);}return meshes;}
}
function buttonTexture(text){if(!globalThis.document)return null;const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#263743';c.fillRect(0,0,128,128);c.fillStyle='#d8e8e8';c.font='bold 46px sans-serif';c.textAlign='center';c.fillText(text,64,82);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture;}
/** Static walls batch by material. Collision records and physical stairs stay separate. */
export function createCityBuilding(world,b,{furnish=null,saved={}}={}){
 const root=new T.Group();root.name=b.name;root.userData.h5City=b.id;world.root.add(root);
 const owned=[],material=(color,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness:.84,...extra});owned.push(m);return m;};
 const wall=material([0xc4bca9,0xb5bec4,0xb29b8a,0xc7c5b7][b.floors%4]),trim=material(0x536572),floorMat=material(0xb5aba0),rail=material(0x73797b,{roughness:.4,metalness:.65}),glass=material(0x8eb1bd,{transparent:true,opacity:.23,depthWrite:false,roughness:.16,metalness:.08,side:T.DoubleSide});
 const parts=new Parts(),obstacles=[],floors=[],stairs=[],buttons=[],elevators=[],furniture=[],W=b.w,D=b.d,Y=b.y+.14,S=b.story||3.15,H=b.floors*S,x0=b.x-W/2,z0=b.z-D/2;
 const box=(m,x,y,z,w,h,d,solid=false)=>{parts.box(m,b.x+x,Y+y,b.z+z,w,h,d);if(solid){const o={x:b.x+x,z:b.z+z,y:Y+y-h/2,w,d,h,h5City:b.id};world.obstacles.push(o);obstacles.push(o);} };
 const slab=(x,z,w,d,y)=>{box(floorMat,x,y-.075,z,w,.15,d);const f={x:b.x+x,z:b.z+z,w,d,y:Y+y-.15,h:.15,h5City:b.id};floors.push(f);world.floors.push(f);const o={...f,walkable:true};obstacles.push(o);world.obstacles.push(o);};
 const openingWall=(x,z,w,d,y,h,doorCenter=0,doorWidth=1.25)=>{if(w>d){const left=doorCenter-doorWidth/2-(x-w/2),right=x+w/2-doorCenter-doorWidth/2;if(left>0)box(wall,x-w/2+left/2,y+h/2,z,left,h,d,true);if(right>0)box(wall,doorCenter+doorWidth/2+right/2,y+h/2,z,right,h,d,true);box(wall,doorCenter,y+2.3+(h-2.3)/2,z,doorWidth,Math.max(.1,h-2.3),d,true);}else{const left=doorCenter-doorWidth/2-(z-d/2),right=z+d/2-doorCenter-doorWidth/2;if(left>0)box(wall,x,y+h/2,z-d/2+left/2,w,h,left,true);if(right>0)box(wall,x,y+h/2,doorCenter+doorWidth/2+right/2,w,h,right,true);box(wall,x,y+2.3+(h-2.3)/2,doorCenter,w,Math.max(.1,h-2.3),doorWidth,true);}};
 // Ground foundations; no floating buildings on a sloping parcel.
 box(wall,0,-.32,0,W+.7,.65,D+.7);
 const lift={x:-W/2+1.8,z:D/2-1.8,w:2.65,d:2.65};
 const stairX=W/2-2.6,stairFront=D/2-7.8,run=3.05,width=1.55,rise=S/2;
 for(let f=0;f<b.floors;f++){
  const y=f*S;
  // Three slabs leave a full-height elevator shaft and switchback stairwell.
  slab(0,-4.05,W,D-8.1,y);
  slab((-W/2+3.25+W/2-5.0)/2,D/2-4.05,W-8.25,8.1,y);
  slab(-W/2+1.625,D/2-5.58,3.25,5.04,y);
  slab(stairX,stairFront-.35,5.2,.70,y);
  // Facade is real openings: opaque sill/header/piers, glass between them.
  for(const side of [-1,1]){
   for(const alongX of [true,false]){const length=alongX?W:D,fixed=side*(alongX?D:W)/2,count=Math.max(3,Math.floor(length/3.5)),cell=length/count;
    for(let j=0;j<count;j++){const t=-length/2+(j+.5)*cell,entrance=alongX&&side===1&&f===0&&Math.abs(t)<cell*.6;
     const isLookout=b.type==='penthouse'&&f===b.floors-1&&alongX&&side===1,sill=isLookout?.10:.78,top=2.68,ww=cell-.26;
     if(entrance){openingWall(t,fixed,cell,.22,y,S,t,1.65);continue;}
     if(alongX){box(wall,t,y+sill/2,fixed,cell,sill,.22,true);box(wall,t,y+(top+S)/2,fixed,cell,S-top,.22,true);box(trim,t-cell/2+.09,y+S/2,fixed,.18,S,.27,true);box(glass,t,y+(top+sill)/2,fixed,ww,top-sill,.035,true);}else{box(wall,fixed,y+sill/2,t,.22,sill,cell,true);box(wall,fixed,y+(top+S)/2,t,.22,S-top,cell,true);box(trim,fixed,y+S/2,t-cell/2+.09,.27,S,.18,true);box(glass,fixed,y+(top+sill)/2,t,.035,top-sill,ww,true);}
    }
   }
  }
  // Main hall reaches the lift and stairs. Apartments and offices use distinct partitions.
  if(f>0||b.type!=='restaurant'){
   const rooms=b.type==='office'?2:3,roomWidth=(W-2)/rooms;
   for(let i=0;i<rooms;i++){const cx=-W/2+1+(i+.5)*roomWidth;openingWall(cx,-1.25,roomWidth,.14,y,S-.15,cx,1.25);if(i<rooms-1)box(wall,-W/2+1+(i+1)*roomWidth,y+(S-.15)/2,(-D/2-1.25)/2,.14,S-.15,D/2-1.25,true);}
  }else openingWall(0,-D*.19,W,.16,y,S-.15,W*.23,1.4);
  // Elevator shaft, call button and closed landing door prevent a fall into the empty shaft.
  const lx=lift.x,lz=lift.z;box(wall,lx-lift.w/2-.10,y+S/2,lz,.18,S,lift.d+.3,true);box(wall,lx+lift.w/2+.10,y+S/2,lz,.18,S,lift.d+.3,true);box(wall,lx,y+S/2,lz+lift.d/2+.1,lift.w,.18+S,.18,true);
  // Stair flights have their own exact support height. Steps stay below 18 cm.
  if(f<b.floors-1){
   for(const flight of [0,1]){const sx=stairX+(flight?-.92:.92),startZ=stairFront+(flight?run:0),sign=flight?-1:1,baseY=Y+y+flight*rise;
    const rec={x:b.x+sx,z:b.z+startZ,width,run,rise,baseY,sign,floor:f};stairs.push(rec);
    for(let k=0;k<9;k++){const h=(k+1)*rise/9,z=startZ+sign*(k+.5)*run/9;box(floorMat,sx,y+flight*rise+h/2,z,width,h,run/9+.01);}
    // Small rail posts and an inclined handrail, batched with all other rails.
    for(let k=0;k<=5;k++)for(const side of [-1,1])box(rail,sx+side*width/2,y+flight*rise+rise*k/5+.52,startZ+sign*run*k/5,.035,1.04,.035);
   }
   slab(stairX,stairFront+run+.54,5.2,1.08,y+rise);
  }
 }
 slab(0,0,W+.35,D+.35,H);box(trim,0,H+.20,-D/2,W,.4,.16);box(trim,-W/2,H+.20,0,.16,.4,D);box(trim,W/2,H+.20,0,.16,.4,D);
 const meshes=parts.finish(root);for(const mesh of meshes){mesh.userData.h5City=b.id;world.pickables.push(mesh);}root.updateMatrixWorld(true);
 const motion=new ElevatorMotion({floors:b.floors,story:S,base:Y,floor:saved.elevatorFloor||0}),car=new T.Group();car.name=b.name+' elevator';root.add(car);car.position.set(b.x+lift.x,motion.y,b.z+lift.z);
 const makeMesh=(geo,mat,parent=root)=>{const m=new T.Mesh(geo,mat);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 const deck=makeMesh(new T.BoxGeometry(lift.w,.12,lift.d),floorMat,car);deck.position.y=-.06;
 for(const side of [-1,1]){const m=makeMesh(new T.BoxGeometry(.06,2.6,lift.d),rail,car);m.position.set(side*lift.w/2,1.3,0);}const back=makeMesh(new T.BoxGeometry(lift.w,2.6,.06),rail,car);back.position.set(0,1.3,lift.d/2);
 const carFloor={x:car.position.x,z:car.position.z,w:lift.w,d:lift.d,y:motion.y-.12,h:.12,h5City:b.id};floors.push(carFloor);world.floors.push(carFloor);
 const gates=[];for(let f=0;f<b.floors;f++){
  const gate={x:car.position.x,z:car.position.z-lift.d/2,y:Y+f*S,w:lift.w,d:.10,h:2.6,h5City:b.id};obstacles.push(gate);world.obstacles.push(gate);
  const panels=[];for(const side of [-1,1]){const m=makeMesh(new T.BoxGeometry(lift.w/2,2.6,.06),rail);m.position.set(gate.x+side*lift.w/4,gate.y+1.3,gate.z);panels.push({m,side});}gates.push({gate,panels});
  const tex=buttonTexture(String(f+1)),mat=material(0xffffff,{map:tex,roughness:.42});if(tex)owned.push(tex);const m=makeMesh(new T.BoxGeometry(.20,.24,.035),mat);m.position.set(gate.x+lift.w/2+.26,gate.y+1.1,gate.z-.13);m.userData.h5CityButton=()=>motion.request(f);buttons.push(m);world.pickables.push(m);
 }
 const selectors=[];for(let f=0;f<b.floors;f++){const tex=buttonTexture(String(f+1)),mat=material(0xffffff,{map:tex,roughness:.42});if(tex)owned.push(tex);const m=makeMesh(new T.BoxGeometry(.16,.16,.035),mat,car);m.position.set(.64+(f%2)*.20,.9+Math.floor(f/2)*.20,lift.d/2-.065);m.rotation.y=Math.PI;m.userData.h5CityButton=()=>motion.request(f);buttons.push(m);selectors.push(m);world.pickables.push(m);}
 const api={id:b.id,spec:b,root,stairs,floors,obstacles,buttons,meshes,motion,car,carFloor,lift,permanent:b.type==='penthouse'||b.type==='restaurant',furniture,
  stairHeight(p,step=.42){const candidates=[];for(const s of stairs){if(Math.abs(p.x-s.x)>s.width/2+.04)continue;const z=(p.z-s.z)*s.sign;if(z<-.04||z>s.run+.04)continue;const h=s.baseY+clamp(z/s.run,0,1)*s.rise;if(h<=p.y+step&&h>=p.y-.7)candidates.push(h);}return candidates.length?Math.max(...candidates):null;},
  contains(p,pad=0){return Math.abs(p.x-b.x)<W/2+pad&&Math.abs(p.z-b.z)<D/2+pad;},
  inLift(p,y=motion.y,tol=.30){return Math.abs(p.x-car.position.x)<lift.w/2-.12&&Math.abs(p.z-car.position.z)<lift.d/2-.08&&Math.abs(p.y-y)<tol;},
  tick(dt,feet,carry){const doorZone=feet&&Math.abs(feet.x-car.position.x)<lift.w/2+.15&&Math.abs(feet.z-(car.position.z-lift.d/2))<.23&&Math.abs(feet.y-motion.y)<.2,oldY=motion.y,dy=motion.tick(dt,doorZone);if(dy)carry?.(api,dy,oldY);car.position.y=motion.y;carFloor.y=motion.y-.12;
   for(let f=0;f<gates.length;f++){const {gate,panels}=gates[f],open=Math.abs(motion.y-(Y+f*S))<.025?motion.door:0;gate.h=open>.96?0:2.6;for(const {m,side} of panels)m.position.x=gate.x+side*(lift.w/4+open*lift.w/2);}
  },
  dispose(){const remove=new Set([...meshes,...buttons]);world.pickables=world.pickables.filter(m=>!remove.has(m));const os=new Set(obstacles),fs=new Set(floors);world.obstacles=world.obstacles.filter(o=>!os.has(o));world.floors=world.floors.filter(f=>!fs.has(f));world.grid=null;saved.elevatorFloor=motion.floor;root.removeFromParent();root.traverse(o=>o.geometry?.dispose());owned.forEach(m=>m.dispose());}
 };
 if(furnish&&(b.type==='restaurant'||b.type==='penthouse'))furniture.push(...furnish(b,Y,root));world.grid=null;return api;
}
