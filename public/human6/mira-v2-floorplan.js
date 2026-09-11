/**
 * House architecture — rooms / openings / doors / stairs as data.
 * Walls still go through Destruction.panel + HouseDoors + placeStairs.
 * Do not change CELL, wall thickness, hole padding, or door physics.
 */
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {makeSurfaceMap,wallMaterial} from './mira-v2-walls.js?v=17.2.0';
import {placeStairs} from './mira-v2-furniture.js?v=17.2.0';
import {HouseDoors} from './mira-v2-doors.js?v=17.2.0';
import {Destruction} from './mira-v2-destruction.js?v=17.2.0';

export const CELL=.6;
export const STORY=3.05;
export const WALL_H=3;
export const WALL_T=.14;
export const STORY_Y=WALL_H/2;

export function snapCell(n){return Math.round(n/CELL)*CELL;}
export function cell(n){return n*CELL;}

export function doorHole(axis,c,w=1.14,head=2.14){
 const r=w/2+CELL*.55;
 return p=>p.y<head&&p.y>.04&&(axis==='x'?Math.abs(p.x-c):Math.abs(p.z-c))<r;
}
export function winHole(axis,c,w=1.45,sill=.92,head=2.22){
 const r=w/2+CELL*.55;
 return p=>p.y>sill&&p.y<head&&(axis==='x'?Math.abs(p.x-c):Math.abs(p.z-c))<r;
}
export function garageHole(axis,c,w=4.9,head=2.45){
 const r=w/2;
 return p=>p.y<head&&(axis==='x'?Math.abs(p.x-c):Math.abs(p.z-c))<r;
}
export function stairHole(axis,c,w=1.44){
 const r=w/2;
 return p=>(axis==='x'?Math.abs(p.x-c):Math.abs(p.z-c))<r;
}
export function openingHole(o){
 const axis=o.axis||o.along;
 if(o.kind==='door')return doorHole(axis,o.at,o.w,o.head);
 if(o.kind==='window')return winHole(axis,o.at,o.w,o.sill,o.head);
 if(o.kind==='garage')return garageHole(axis,o.at,o.w,o.head);
 if(o.kind==='stair')return stairHole(axis,o.at,o.w);
 if(typeof o.test==='function')return o.test;
 return ()=>false;
}
export function combineHoles(fns){
 if(!fns.length)return ()=>false;
 return p=>fns.some(fn=>fn(p));
}

export function createHouseKit(w){
 const maps={wood:makeSurfaceMap('Wood'),tile:makeSurfaceMap('Tile'),plaster:makeSurfaceMap('Plaster'),stone:makeSurfaceMap('Stone'),brick:makeSurfaceMap('Brick'),shingle:makeSurfaceMap('Shingle')};
 const panel=(x,y,z,sx,sy,sz,hole,kind='plaster',map=maps.plaster)=>w.fractures.panel(new T.Vector3(x,y,z),new T.Vector3(sx,sy,sz),kind,hole||(()=>false),{map});
 const slab=(x,z,ww,dd,y,thick,map,kind='wood')=>{
  const mesh=w.fractures.panel(new T.Vector3(x,y+thick/2,z),new T.Vector3(ww,thick,dd),kind,()=>false,{map,skipObstacle:true,cell:Math.max(.55,Math.min(ww,dd)>8?.9:.62)});
  w.floors??=[];w.floors.push({x,z,w:ww,d:dd,y,h:thick});
  return mesh;
 };
 const pane=(x,y,z,sx,sy,sz)=>w.fractures.panel(new T.Vector3(x,y,z),new T.Vector3(sx,sy,sz),'glass');
 return {maps,panel,slab,pane};
}

export function createHouseWorld(scene){
 const root=new T.Group();scene.add(root);
 const world={
  root,scene,movables:[],obstacles:[],pickables:[],seats:[],stairs:[],floors:[],
  revision:0,gravity:9.81,extent:24,grid:null,
  mat(c,r=.85){return new T.MeshStandardMaterial({color:c,roughness:r,metalness:0});},
  mesh(g,m,x,y,z){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;root.add(o);return o;},
  box(x,y,z,w,h,d,color){return this.mesh(new T.BoxGeometry(w,h,d),this.mat(color),x,y,z);},
  obstacle(x,z,w,d,y=0,h=1,object=null){const o={x,z,w,d,y,h,object};this.obstacles.push(o);this.grid=null;if(object){object.userData.obstacle=o;this.pickables.push(object);}return o;},
  removeObstacle(o){if(!o)return;this.obstacles=this.obstacles.filter(x=>x!==o);this.grid=null;},
  nearby(p,r=.25){
   if(!this.grid){this.grid=new Map();for(const o of this.obstacles)for(let x=Math.floor(o.x-o.w/2);x<=Math.floor(o.x+o.w/2);x++)for(let z=Math.floor(o.z-o.d/2);z<=Math.floor(o.z+o.d/2);z++){const key=x+'/'+z;if(!this.grid.has(key))this.grid.set(key,[]);this.grid.get(key).push(o);}}
   const out=new Set();for(let x=Math.floor(p.x-r);x<=Math.floor(p.x+r);x++)for(let z=Math.floor(p.z-r);z<=Math.floor(p.z+r);z++)for(const o of this.grid.get(x+'/'+z)||[])out.add(o);return [...out];
  },
  blocked(p,r=.25,ignore=null){const y0=Number.isFinite(p?.y)?p.y:.1;return this.nearby(p,r).some(o=>o!==ignore&&!o.walkable&&y0<o.y+o.h&&y0+1.5>o.y&&Math.abs(p.x-o.x)<o.w/2+r&&Math.abs(p.z-o.z)<o.d/2+r);},
  projectSphere(p,r){let hit=false;for(const o of this.nearby(p,r)){const q=new T.Vector3(T.MathUtils.clamp(p.x,o.x-o.w/2,o.x+o.w/2),T.MathUtils.clamp(p.y,o.y,o.y+o.h),T.MathUtils.clamp(p.z,o.z-o.d/2,o.z+o.d/2)),d=p.clone().sub(q),l=d.length();if(l>=r)continue;if(l>.000001)p.copy(q).addScaledVector(d,r/l);hit=true;}return hit;}
 };
 world.fractures=new Destruction(scene,world);
 world.doors=new HouseDoors(world);
 return world;
}

export function clearHouse(world){
 world.doors?.clear?.();
 world.root.traverse(o=>{o.geometry?.dispose?.();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose?.();});
 world.root.clear();
 world.obstacles=[];world.seats=[];world.pickables=[];world.movables=[];world.stairs=[];world.floors=[];world.grid=null;
 world.fractures?.clear?.();
 world.doors=new HouseDoors(world);
 world.revision++;
}

function addStairRail(w){
 const y=STORY+.02,h=.86,round=(x,yy,z,sx,sy,sz,color)=>{
  const o=w.mesh(new RoundedBoxGeometry(sx,sy,sz,2,.01),w.mat(color),x,yy,z);return o;
 };
 const posts=[[-.70,-1.32],[-.70,.75],[-.70,2.80],[.38,-1.32],[.38,.75]];
 for(const [x,z] of posts)round(x,y+h/2,z,.045,h,.045,0x4a372c);
 const rail=(x0,z0,x1,z1)=>{
  const mesh=w.mesh(new T.BoxGeometry(Math.max(.04,Math.abs(x1-x0)||.04),.04,Math.max(.04,Math.abs(z1-z0)||.04)),w.mat(0x4a372c),(x0+x1)/2,y+h,(z0+z1)/2);
  w.fractures.register(mesh,'wood');
 };
 rail(-.70,-1.32,-.70,2.80);rail(.38,-1.32,.38,.75);rail(-.70,-1.32,.38,-1.32);
}

function addGable(w,maps,r){
 const shingle=wallMaterial('shingle',maps.shingle);
 const {x0,x1,z0,z1,eave,rise}=r;
 const cx=(x0+x1)/2,cz=(z0+z1)/2,halfZ=(z1-z0)/2,spanX=x1-x0,len=Math.hypot(halfZ,rise),pitch=Math.atan2(rise,halfZ);
 const slope=(zMid,sign)=>{
  const mesh=w.mesh(new T.BoxGeometry(spanX,.09,len+.12),shingle,cx,eave+rise/2,zMid);
  mesh.rotation.x=sign*pitch;mesh.castShadow=mesh.receiveShadow=true;w.fractures.register(mesh,'wood');
 };
 slope((z0+cz)/2,-1);slope((z1+cz)/2,1);
 const ridge=w.mesh(new T.BoxGeometry(spanX+.1,.08,.16),w.mat(0x3f2c24),cx,eave+rise+.02,cz);
 w.fractures.register(ridge,'wood');
 if(r.gables!==false){
  for(const x of [x0+.12,x1-.12]){
   const shape=new T.Shape();
   shape.moveTo(z0,eave);shape.lineTo(cz,eave+rise);shape.lineTo(z1,eave);shape.closePath();
   const gable=new T.Mesh(new T.ShapeGeometry(shape),wallMaterial('plaster',maps.plaster));
   gable.rotation.y=Math.PI/2;gable.position.set(x,0,0);gable.castShadow=true;gable.receiveShadow=true;gable.material.side=T.DoubleSide;
   w.root.add(gable);w.fractures.register(gable,'plaster');
  }
 }
}

function addShed(w,maps,r){
 const roof=w.mesh(new T.BoxGeometry(r.w,.1,r.d),wallMaterial('shingle',maps.shingle),r.x,r.y,r.z);
 roof.rotation.z=r.rotZ||0;w.fractures.register(roof,'wood');
}

export function realizeFloorplan(world,plan){
 const kit=createHouseKit(world);
 if(!world.doors)world.doors=new HouseDoors(world);
 const pad=plan.pad;
 if(pad)world.box(pad.x,pad.y,pad.z,pad.w,pad.h,pad.d,pad.color??0x6d7a62);
 for(const s of plan.slabs||[])kit.slab(s.x,s.z,s.w,s.d,s.y??.02,s.thick??.05,kit.maps[s.map||'wood'],s.kind||'wood');
 for(const wall of plan.walls||[]){
  const hole=combineHoles((wall.openings||[]).map(openingHole));
  kit.panel(wall.x,wall.y,wall.z,wall.sx,wall.sy,wall.sz,hole,wall.kind||'plaster',kit.maps[wall.map||'plaster']);
 }
 for(const g of plan.glass||[])kit.pane(g.x,g.y,g.z,g.sx,g.sy,g.sz);
 for(const d of plan.doors||[])world.doors.place(d.x,d.y??0,d.z,d.yaw??0,d.opts||{});
 if(plan.stairs){
  const s=plan.stairs;
  placeStairs(world,new T.Vector3(s.position[0],s.position[1],s.position[2]),s.yaw,{steps:s.steps,rise:s.rise,run:s.run,width:s.width});
  if(s.rail)addStairRail(world);
 }
 for(const roof of plan.roofs||[]){
  if(roof.type==='gable')addGable(world,kit.maps,roof);
  else addShed(world,kit.maps,roof);
 }
 for(const lamp of plan.lamps||[]){
  const [x,y,z,color]=lamp;
  const light=new T.PointLight(color,9,7,2);light.position.set(x,y,z);world.root.add(light);
  world.mesh(new RoundedBoxGeometry(.40,.04,.40,2,.03),world.mat(0xe7dfca),x,y+.24,z);
 }
 world.garageStalls=(plan.garageStalls||[]).map(s=>({position:new T.Vector3(s.position[0],s.position[1],s.position[2]),yaw:s.yaw,color:s.color}));
 world.plan=plan;
 return world;
}

export function addRoomLabels(world,plan){
 const group=new T.Group();group.name='room-labels';world.root.add(group);
 for(const room of plan.rooms||[]){
  const c=document.createElement('canvas');c.width=512;c.height=128;
  const ctx=c.getContext('2d');ctx.fillStyle='#1c1814cc';ctx.fillRect(0,0,512,128);
  ctx.fillStyle='#f4efe8';ctx.font='bold 48px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(room.name,256,64);
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
  const sprite=new T.Sprite(new T.SpriteMaterial({map,transparent:true,depthTest:false}));
  sprite.position.set(room.x,1.2+(room.story||0)*STORY,room.z);
  sprite.scale.set(Math.min(3.2,room.w*.55),.8,1);
  group.add(sprite);
 }
 return group;
}

export function addCellGrid(scene,extent=16){
 const pts=[],n=Math.round(extent/CELL);
 for(let i=-n;i<=n;i++){
  const a=i*CELL,e=n*CELL;
  pts.push(a,.025,-e,a,.025,e,-e,.025,a,e,.025,a);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));
 const line=new T.LineSegments(g,new T.LineBasicMaterial({color:0x7eb6ff,transparent:true,opacity:.22}));
 line.name='cell-grid';scene.add(line);return line;
}

const hy=STORY_Y,H=WALL_H,WT=WALL_T,y2=STORY+hy;

/** Production living-room shell, transcribed from mira-v2-house.js. Off-grid on purpose. */
export const AS_BUILT_PLAN={
 id:'as-built',
 name:'Living room (production 16.2)',
 rooms:[
  {id:'living',name:'Living',x:-3.4,z:1.4,w:7.6,d:6.0},
  {id:'kitchen',name:'Kitchen',x:3.8,z:1.4,w:6.8,d:6.0},
  {id:'bedroom',name:'Bedroom',x:-1.6,z:-4.2,w:4.0,d:5.2},
  {id:'bath',name:'Bath',x:-5.4,z:-4.2,w:3.6,d:5.2},
  {id:'dining',name:'Dining',x:3.8,z:-4.2,w:6.8,d:5.2},
  {id:'garage',name:'Garage',x:3.8,z:7.5,w:6.8,d:6.2},
  {id:'gym',name:'Gym',x:9.85,z:1.4,w:5.3,d:6.0},
  {id:'laundry',name:'Laundry',x:9.85,z:-4.2,w:5.3,d:5.2}
 ],
 pad:{x:0,y:-.18,z:1.8,w:22,h:.32,d:20,color:0x6d7a62},
 slabs:[
  {x:-3.4,z:1.4,w:7.6,d:6.0,y:.02,thick:.05,map:'wood'},
  {x:3.8,z:1.4,w:6.8,d:6.0,y:.02,thick:.05,map:'wood'},
  {x:-3.4,z:-4.2,w:7.6,d:5.2,y:.02,thick:.05,map:'wood'},
  {x:3.8,z:-4.2,w:6.8,d:5.2,y:.02,thick:.05,map:'wood'},
  {x:3.8,z:7.5,w:6.8,d:6.2,y:.02,thick:.05,map:'stone',kind:'stone'},
  {x:-5.4,z:-4.2,w:3.6,d:5.2,y:.02,thick:.05,map:'tile',kind:'stone'},
  {x:-4.02,z:-.4,w:6.36,d:10.0,y:STORY,thick:.07,map:'wood'},
  {x:-.16,z:-3.40,w:1.20,d:3.90,y:STORY,thick:.07,map:'wood'},
  {x:-.16,z:3.88,w:1.20,d:1.44,y:STORY,thick:.07,map:'wood'},
  {x:3.88,z:-.4,w:6.64,d:10.0,y:STORY,thick:.07,map:'wood'},
  {x:-5.4,z:3.1,w:3.6,d:3.6,y:STORY,thick:.07,map:'tile',kind:'stone'},
  {x:9.85,z:1.4,w:5.3,d:6.0,y:.02,thick:.05,map:'stone',kind:'stone'},
  {x:9.85,z:-4.2,w:5.3,d:5.2,y:.02,thick:.05,map:'tile',kind:'stone'}
 ],
 walls:[
  {x:-3.4,y:hy,z:-6.8,sx:7.6,sy:H,sz:WT,openings:[{kind:'window',axis:'x',at:-2.2}]},
  {x:3.8,y:hy,z:-6.8,sx:6.8,sy:H,sz:WT,openings:[{kind:'window',axis:'x',at:5.0}]},
  {x:-7.2,y:hy,z:-1.2,sx:WT,sy:H,sz:11.2,openings:[{kind:'window',axis:'z',at:-4.2}]},
  {x:7.2,y:hy,z:-1.2,sx:WT,sy:H,sz:11.2,openings:[{kind:'door',axis:'z',at:1.4},{kind:'door',axis:'z',at:-4.2}]},
  {x:7.2,y:hy,z:7.5,sx:WT,sy:H,sz:6.2,openings:[{kind:'window',axis:'z',at:7.5,w:1.2}]},
  {x:-3.4,y:hy,z:4.4,sx:7.6,sy:H,sz:WT,openings:[{kind:'door',axis:'x',at:-2.0}]},
  {x:3.8,y:hy,z:4.4,sx:6.8,sy:H,sz:WT,openings:[{kind:'door',axis:'x',at:3.8}]},
  {x:.4,y:hy,z:10.6,sx:6.8,sy:H,sz:.16,openings:[{kind:'garage',axis:'x',at:3.8,w:4.9,head:2.45}]},
  {x:.4,y:hy,z:7.5,sx:WT,sy:H,sz:6.2,openings:[{kind:'door',axis:'z',at:7.5}]},
  {x:-3.6,y:hy,z:-4.2,sx:WT,sy:H,sz:5.2,openings:[{kind:'door',axis:'z',at:-4.2}]},
  {x:-3.4,y:hy,z:-1.6,sx:7.6,sy:H,sz:WT,openings:[{kind:'door',axis:'x',at:-5.4},{kind:'door',axis:'x',at:-1.6},{kind:'stair',axis:'x',at:-.16,w:1.44}]},
  {x:3.8,y:hy,z:-1.6,sx:6.8,sy:H,sz:WT,openings:[{kind:'door',axis:'x',at:3.8}]},
  {x:12.5,y:hy,z:1.4,sx:.16,sy:H,sz:6.0,openings:[{kind:'window',axis:'z',at:1.4}]},
  {x:9.85,y:hy,z:-1.6,sx:5.3,sy:H,sz:.16,openings:[{kind:'window',axis:'x',at:9.85}]},
  {x:9.85,y:hy,z:4.4,sx:5.3,sy:H,sz:.16,openings:[]},
  {x:12.5,y:hy,z:-4.2,sx:.16,sy:H,sz:5.2,openings:[{kind:'window',axis:'z',at:-4.2}]},
  {x:9.85,y:hy,z:-6.8,sx:5.3,sy:H,sz:.16,openings:[{kind:'window',axis:'x',at:9.85}]},
  {x:-3.4,y:y2,z:-6.8,sx:7.6,sy:H,sz:WT,openings:[{kind:'window',axis:'x',at:-2.2,sill:STORY+.92,head:STORY+2.22,w:1.9}]},
  {x:3.8,y:y2,z:-6.8,sx:6.8,sy:H,sz:WT,openings:[{kind:'window',axis:'x',at:5.2,sill:STORY+.92,head:STORY+2.22,w:1.8}]},
  {x:-7.2,y:y2,z:-.4,sx:WT,sy:H,sz:12.8,openings:[{kind:'window',axis:'z',at:1.2,sill:STORY+.92,head:STORY+2.22,w:1.7}]},
  {x:7.2,y:y2,z:-.4,sx:WT,sy:H,sz:12.8,openings:[{kind:'window',axis:'z',at:1.0,sill:STORY+.92,head:STORY+2.22,w:1.7}]},
  {x:-3.4,y:y2,z:4.4,sx:7.6,sy:H,sz:WT,openings:[]},
  {x:3.8,y:y2,z:4.4,sx:6.8,sy:H,sz:WT,openings:[]},
  {x:.55,y:y2,z:3.15,sx:WT,sy:H,sz:2.5,openings:[{kind:'door',axis:'z',at:3.15,head:STORY+2.14}]},
  {x:-3.8,y:y2,z:3.1,sx:WT,sy:H,sz:3.6,openings:[{kind:'door',axis:'z',at:3.1,head:STORY+2.14}]},
  {x:-5.4,y:y2,z:1.8,sx:3.6,sy:H,sz:WT,openings:[{kind:'door',axis:'x',at:-5.4,head:STORY+2.14}]},
  {x:-3.4,y:STORY+H,z:-.4,sx:7.6,sy:.12,sz:12.8,kind:'wood',map:'wood',openings:[]},
  {x:3.8,y:STORY+H,z:-.4,sx:6.8,sy:.12,sz:12.8,kind:'wood',map:'wood',openings:[]},
  {x:9.85,y:H,z:1.4,sx:5.4,sy:.12,sz:6.1,kind:'wood',map:'wood',openings:[]},
  {x:9.85,y:H,z:-4.2,sx:5.4,sy:.12,sz:5.3,kind:'wood',map:'wood',openings:[]}
 ],
 glass:[
  {x:-7.18,y:1.58,z:-4.2,sx:.035,sy:1.22,sz:1.42},
  {x:-2.2,y:1.58,z:-6.78,sx:1.48,sy:1.22,sz:.035},
  {x:5.0,y:1.58,z:-6.78,sx:1.42,sy:1.22,sz:.035},
  {x:7.18,y:1.58,z:7.5,sx:.035,sy:1.1,sz:1.15},
  {x:12.48,y:1.58,z:1.4,sx:.035,sy:1.18,sz:1.35},
  {x:9.85,y:1.58,z:-1.58,sx:1.35,sy:1.18,sz:.035},
  {x:12.48,y:1.58,z:-4.2,sx:.035,sy:1.18,sz:1.28},
  {x:9.85,y:1.58,z:-6.78,sx:1.28,sy:1.18,sz:.035},
  {x:-2.2,y:STORY+1.58,z:-6.78,sx:1.42,sy:1.18,sz:.035},
  {x:5.2,y:STORY+1.58,z:-6.78,sx:1.32,sy:1.18,sz:.035},
  {x:-7.18,y:STORY+1.58,z:1.2,sx:.035,sy:1.18,sz:1.28},
  {x:7.18,y:STORY+1.58,z:1.0,sx:.035,sy:1.18,sz:1.22}
 ],
 doors:[
  {x:-2.0,y:0,z:4.4,yaw:0,opts:{hinge:-1,swing:1}},
  {x:3.8,y:0,z:4.4,yaw:0,opts:{hinge:1,swing:1}},
  {x:.4,y:0,z:7.5,yaw:Math.PI/2,opts:{hinge:-1,swing:-1}},
  {x:-5.4,y:0,z:-1.6,yaw:0,opts:{hinge:-1,swing:-1}},
  {x:-1.6,y:0,z:-1.6,yaw:0,opts:{hinge:1,swing:-1}},
  {x:3.8,y:0,z:-1.6,yaw:0,opts:{hinge:-1,swing:-1}},
  {x:7.2,y:0,z:1.4,yaw:Math.PI/2,opts:{hinge:-1,swing:1}},
  {x:7.2,y:0,z:-4.2,yaw:Math.PI/2,opts:{hinge:1,swing:-1}},
  {x:-3.6,y:0,z:-4.2,yaw:Math.PI/2,opts:{hinge:-1,swing:1}},
  {x:.55,y:STORY,z:3.15,yaw:Math.PI/2,opts:{hinge:-1,swing:-1}}
 ],
 stairs:{position:[-.16,.02,2.40],yaw:Math.PI,steps:16,rise:STORY/16,run:.2625,width:1.10,rail:true},
 roofs:[
  {type:'gable',x0:-7.45,x1:7.45,z0:-7.05,z1:4.65,eave:STORY+3.02,rise:2.85},
  {type:'gable',x0:.15,x1:7.45,z0:4.42,z1:10.85,eave:3.04,rise:1.55,gables:false},
  {type:'shed',x:10.05,y:H+.72,z:1.4,w:5.8,d:6.5,rotZ:-.16},
  {type:'shed',x:10.05,y:H+.7,z:-4.2,w:5.8,d:5.6,rotZ:-.14}
 ],
 lamps:[[-3.2,2.70,1.4,0xffdec0],[4.2,2.70,1.6,0xe5efff],[10.0,2.70,1.4,0xe8e4d8],[-4.9,2.2,-.6,0xffe6c8]],
 garageStalls:[
  {position:[2.7,0,7.6],yaw:Math.PI,color:0x1e4f8a},
  {position:[5.5,0,7.6],yaw:Math.PI,color:0xb42222}
 ],
 anchors:[
  {id:'piano',x:-4.95,z:-1.12,yaw:0,note:'installPiano — keep clear of stair hole'},
  {id:'fireplace',x:-5.15,z:4.18,note:'hearth on living north wall'},
  {id:'extinguisher',x:-3.78,z:4.28,note:'wall case, not gun rack'},
  {id:'tv',x:-3.4,z:4.05},
  {id:'bed',x:-1.6,z:-4.4},
  {id:'gym',x:10.05,z:1.15},
  {id:'laundry',x:9.85,z:-4.2}
 ]
};

/**
 * Same room program, corners on the 0.6 m CELL grid so walls meet.
 * Stair geometry (rise/run/width) is unchanged. Bottom stays in open living room.
 */
export const PRECISE_PLAN={
 id:'precise',
 name:'Living room (CELL grid)',
 rooms:[
  {id:'living',name:'Living',x:-3.6,z:1.2,w:7.2,d:6.0},
  {id:'kitchen',name:'Kitchen',x:3.6,z:1.2,w:7.2,d:6.0},
  {id:'bedroom',name:'Bedroom',x:-1.8,z:-4.2,w:3.6,d:4.8},
  {id:'bath',name:'Bath',x:-5.4,z:-4.2,w:3.6,d:4.8},
  {id:'dining',name:'Dining',x:3.6,z:-4.2,w:7.2,d:4.8},
  {id:'garage',name:'Garage',x:3.6,z:7.5,w:7.2,d:6.6},
  {id:'gym',name:'Gym',x:9.9,z:1.2,w:5.4,d:6.0},
  {id:'laundry',name:'Laundry',x:9.9,z:-4.2,w:5.4,d:4.8}
 ],
 pad:{x:2.4,y:-.18,z:1.8,w:22.8,h:.32,d:21.6,color:0x6d7a62},
 slabs:[
  {x:-3.6,z:1.2,w:7.2,d:6.0,y:.02,thick:.05,map:'wood'},
  {x:3.6,z:1.2,w:7.2,d:6.0,y:.02,thick:.05,map:'wood'},
  {x:-1.8,z:-4.2,w:3.6,d:4.8,y:.02,thick:.05,map:'wood'},
  {x:-5.4,z:-4.2,w:3.6,d:4.8,y:.02,thick:.05,map:'tile',kind:'stone'},
  {x:3.6,z:-4.2,w:7.2,d:4.8,y:.02,thick:.05,map:'wood'},
  {x:3.6,z:7.5,w:7.2,d:6.6,y:.02,thick:.05,map:'stone',kind:'stone'},
  {x:9.9,z:1.2,w:5.4,d:6.0,y:.02,thick:.05,map:'stone',kind:'stone'},
  {x:9.9,z:-4.2,w:5.4,d:4.8,y:.02,thick:.05,map:'tile',kind:'stone'},
  {x:-3.6,z:-.6,w:7.2,d:9.6,y:STORY,thick:.07,map:'wood'},
  {x:3.6,z:-.6,w:7.2,d:9.6,y:STORY,thick:.07,map:'wood'},
  {x:0,z:3.6,w:1.2,d:1.2,y:STORY,thick:.07,map:'wood'},
  {x:-5.4,z:3.0,w:3.6,d:3.6,y:STORY,thick:.07,map:'tile',kind:'stone'}
 ],
 walls:[
  {x:-3.6,y:hy,z:-6.6,sx:7.2,sy:H,sz:WT,openings:[{kind:'window',axis:'x',at:-2.4}]},
  {x:3.6,y:hy,z:-6.6,sx:7.2,sy:H,sz:WT,openings:[{kind:'window',axis:'x',at:4.8}]},
  {x:-7.2,y:hy,z:-1.2,sx:WT,sy:H,sz:10.8,openings:[{kind:'window',axis:'z',at:-4.2}]},
  {x:7.2,y:hy,z:-1.2,sx:WT,sy:H,sz:10.8,openings:[{kind:'door',axis:'z',at:1.2},{kind:'door',axis:'z',at:-4.2}]},
  {x:7.2,y:hy,z:7.5,sx:WT,sy:H,sz:6.6,openings:[{kind:'window',axis:'z',at:7.8,w:1.2}]},
  {x:-3.6,y:hy,z:4.2,sx:7.2,sy:H,sz:WT,openings:[{kind:'door',axis:'x',at:-1.8}]},
  {x:3.6,y:hy,z:4.2,sx:7.2,sy:H,sz:WT,openings:[{kind:'door',axis:'x',at:3.6}]},
  {x:3.6,y:hy,z:10.8,sx:7.2,sy:H,sz:.16,openings:[{kind:'garage',axis:'x',at:3.6,w:4.8,head:2.45}]},
  {x:0,y:hy,z:7.5,sx:WT,sy:H,sz:6.6,openings:[{kind:'door',axis:'z',at:7.2}]},
  {x:-3.6,y:hy,z:-4.2,sx:WT,sy:H,sz:4.8,openings:[{kind:'door',axis:'z',at:-4.2}]},
  {x:-3.6,y:hy,z:-1.8,sx:7.2,sy:H,sz:WT,openings:[{kind:'door',axis:'x',at:-5.4},{kind:'door',axis:'x',at:-1.8},{kind:'stair',axis:'x',at:0,w:1.44}]},
  {x:3.6,y:hy,z:-1.8,sx:7.2,sy:H,sz:WT,openings:[{kind:'door',axis:'x',at:3.6}]},
  {x:12.6,y:hy,z:1.2,sx:.16,sy:H,sz:6.0,openings:[{kind:'window',axis:'z',at:1.2}]},
  {x:9.9,y:hy,z:-1.8,sx:5.4,sy:H,sz:.16,openings:[{kind:'window',axis:'x',at:9.6}]},
  {x:9.9,y:hy,z:4.2,sx:5.4,sy:H,sz:.16,openings:[]},
  {x:12.6,y:hy,z:-4.2,sx:.16,sy:H,sz:4.8,openings:[{kind:'window',axis:'z',at:-4.2}]},
  {x:9.9,y:hy,z:-6.6,sx:5.4,sy:H,sz:.16,openings:[{kind:'window',axis:'x',at:9.6}]},
  {x:-3.6,y:y2,z:-6.6,sx:7.2,sy:H,sz:WT,openings:[{kind:'window',axis:'x',at:-2.4,sill:STORY+.92,head:STORY+2.22,w:1.9}]},
  {x:3.6,y:y2,z:-6.6,sx:7.2,sy:H,sz:WT,openings:[{kind:'window',axis:'x',at:4.8,sill:STORY+.92,head:STORY+2.22,w:1.8}]},
  {x:-7.2,y:y2,z:-.6,sx:WT,sy:H,sz:12.0,openings:[{kind:'window',axis:'z',at:1.2,sill:STORY+.92,head:STORY+2.22,w:1.7}]},
  {x:7.2,y:y2,z:-.6,sx:WT,sy:H,sz:12.0,openings:[{kind:'window',axis:'z',at:1.2,sill:STORY+.92,head:STORY+2.22,w:1.7}]},
  {x:-3.6,y:y2,z:4.2,sx:7.2,sy:H,sz:WT,openings:[]},
  {x:3.6,y:y2,z:4.2,sx:7.2,sy:H,sz:WT,openings:[]},
  {x:.6,y:y2,z:3.0,sx:WT,sy:H,sz:2.4,openings:[{kind:'door',axis:'z',at:3.0,head:STORY+2.14}]},
  {x:-3.6,y:STORY+H,z:-.6,sx:7.2,sy:.12,sz:12.0,kind:'wood',map:'wood',openings:[]},
  {x:3.6,y:STORY+H,z:-.6,sx:7.2,sy:.12,sz:12.0,kind:'wood',map:'wood',openings:[]},
  {x:9.9,y:H,z:1.2,sx:5.4,sy:.12,sz:6.0,kind:'wood',map:'wood',openings:[]},
  {x:9.9,y:H,z:-4.2,sx:5.4,sy:.12,sz:4.8,kind:'wood',map:'wood',openings:[]}
 ],
 glass:[
  {x:-7.18,y:1.58,z:-4.2,sx:.035,sy:1.22,sz:1.42},
  {x:-2.4,y:1.58,z:-6.58,sx:1.48,sy:1.22,sz:.035},
  {x:4.8,y:1.58,z:-6.58,sx:1.42,sy:1.22,sz:.035},
  {x:7.18,y:1.58,z:7.8,sx:.035,sy:1.1,sz:1.15},
  {x:12.58,y:1.58,z:1.2,sx:.035,sy:1.18,sz:1.35},
  {x:9.6,y:1.58,z:-1.78,sx:1.35,sy:1.18,sz:.035},
  {x:12.58,y:1.58,z:-4.2,sx:.035,sy:1.18,sz:1.28},
  {x:9.6,y:1.58,z:-6.58,sx:1.28,sy:1.18,sz:.035},
  {x:-2.4,y:STORY+1.58,z:-6.58,sx:1.42,sy:1.18,sz:.035},
  {x:4.8,y:STORY+1.58,z:-6.58,sx:1.32,sy:1.18,sz:.035},
  {x:-7.18,y:STORY+1.58,z:1.2,sx:.035,sy:1.18,sz:1.28},
  {x:7.18,y:STORY+1.58,z:1.2,sx:.035,sy:1.18,sz:1.22}
 ],
 doors:[
  {x:-1.8,y:0,z:4.2,yaw:0,opts:{hinge:-1,swing:1}},
  {x:3.6,y:0,z:4.2,yaw:0,opts:{hinge:1,swing:1}},
  {x:0,y:0,z:7.2,yaw:Math.PI/2,opts:{hinge:-1,swing:-1}},
  {x:-5.4,y:0,z:-1.8,yaw:0,opts:{hinge:-1,swing:-1}},
  {x:-1.8,y:0,z:-1.8,yaw:0,opts:{hinge:1,swing:-1}},
  {x:3.6,y:0,z:-1.8,yaw:0,opts:{hinge:-1,swing:-1}},
  {x:7.2,y:0,z:1.2,yaw:Math.PI/2,opts:{hinge:-1,swing:1}},
  {x:7.2,y:0,z:-4.2,yaw:Math.PI/2,opts:{hinge:1,swing:-1}},
  {x:-3.6,y:0,z:-4.2,yaw:Math.PI/2,opts:{hinge:-1,swing:1}},
  {x:.6,y:STORY,z:3.0,yaw:Math.PI/2,opts:{hinge:-1,swing:-1}}
 ],
 stairs:{position:[0,.02,2.40],yaw:Math.PI,steps:16,rise:STORY/16,run:.2625,width:1.10,rail:true},
 roofs:[
  {type:'gable',x0:-7.45,x1:7.45,z0:-6.85,z1:4.45,eave:STORY+3.02,rise:2.85},
  {type:'gable',x0:-.05,x1:7.45,z0:4.22,z1:11.05,eave:3.04,rise:1.55,gables:false},
  {type:'shed',x:10.2,y:H+.72,z:1.2,w:5.8,d:6.5,rotZ:-.16},
  {type:'shed',x:10.2,y:H+.7,z:-4.2,w:5.8,d:5.4,rotZ:-.14}
 ],
 lamps:[[-3.6,2.70,1.2,0xffdec0],[3.6,2.70,1.2,0xe5efff],[9.6,2.70,1.2,0xe8e4d8],[-4.8,2.2,-.6,0xffe6c8]],
 garageStalls:[
  {position:[2.4,0,7.8],yaw:Math.PI,color:0x1e4f8a},
  {position:[5.4,0,7.8],yaw:Math.PI,color:0xb42222}
 ],
 anchors:[
  {id:'piano',x:-4.8,z:-1.2,yaw:0,note:'against living south wall, west of stairs'},
  {id:'fireplace',x:-5.4,z:4.2,note:'living north wall'},
  {id:'extinguisher',x:-3.6,z:4.2,note:'wall case'},
  {id:'tv',x:-3.6,z:3.6},
  {id:'bed',x:-1.8,z:-4.2},
  {id:'gym',x:9.6,z:1.2},
  {id:'laundry',x:9.6,z:-4.2}
 ]
};

export const PLANS={asBuilt:AS_BUILT_PLAN,precise:PRECISE_PLAN};
