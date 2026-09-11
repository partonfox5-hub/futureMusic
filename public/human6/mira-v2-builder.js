import * as T from 'three';
import {FURNITURE,placeFurniture} from './mira-v2-furniture.js?v=17.5.0';
export {FURNITURE};
export const CELL=.6;
export const SURFACES={Plaster:{kind:'plaster',color:0xc9c1b1},Brick:{kind:'stone',color:0xa26148},Wood:{kind:'wood',color:0x947051},Tile:{kind:'stone',color:0xc3c7c1},Stone:{kind:'stone',color:0x85847c},Castle:{kind:'stone',color:0x8a8478},Metal:{kind:'metal',color:0x929b9d},Glass:{kind:'glass',color:0x9fc1c7}};
export {makeSurfaceMap} from './mira-v2-walls.js?v=17.5.0';
export function layout(kind,n,p,yaw=0,height=0){
 const cells=[],vertical=kind==='Wall',side=Math.round(yaw/(Math.PI/2))%2!==0;
 for(let a=0;a<n;a++)for(let b=0;b<n;b++){
  const center=new T.Vector3(p.x,height,p.z),size=new T.Vector3(CELL,.12,CELL);
  if(vertical){size.set(side?.12:CELL,CELL,side?CELL:.12);center[side?'z':'x']+=a*CELL;center.y+=(b+.5)*CELL;}
  else{center.x+=a*CELL;center.z+=b*CELL;center.y+=kind==='Ceiling'?.06:.025;}
  cells.push({center,size});
 }
 return cells;
}
const cellKey=c=>[c.center.x,c.center.y,c.center.z,c.size.x,c.size.y,c.size.z].map(n=>n.toFixed(3)).join('/');
export class Builder {
 constructor(world,wardrobe,props){
  Object.assign(this,{world,wardrobe,props});world.builder=this;this.kind='Wall';this.size=1;this.surface='Plaster';this.furniture=FURNITURE[0];this.yaw=0;this.height=0;this.active=false;this.records=[];this.status='Choose a piece. Close Y to place it.';this.controller=1;this.maps=new Map();this.stickClick=false;
  this.ghost=new T.Group();world.scene.add(this.ghost);this.ghost.visible=false;
  this.previewMaterial=new T.MeshBasicMaterial({color:0x72dcb0,transparent:true,opacity:.38,depthWrite:false});
  this.previewGeometry=new T.BoxGeometry(1,1,1);
  for(let i=0;i<9;i++)this.ghost.add(new T.Mesh(this.previewGeometry,this.previewMaterial));
 }
 clear(){
  this.active=false;this.ghost.visible=false;
  const roots=new Set(this.records.map(r=>r.object));this.wardrobe.tokens=this.wardrobe.tokens.filter(t=>{let o=t;while(o){if(roots.has(o))return false;o=o.parent;}return true;});
  this.records=[];
 }
 setKind(kind){this.kind=kind;this.height=kind==='Ceiling'?3:0;}
 start(i=1){if(!this.world.root.visible){this.status='Building is available in the visible VR scene.';return false;}this.controller=i;this.active=true;this.status=this.kind+' ready · trigger places · right stick click rotates · Y finishes';return true;}
 stop(){this.active=false;this.ghost.visible=false;if(!/ready|Rotated|Placed|Blocked|Aim/.test(this.status))this.status='Placement stopped.';}
 isWall(part){return part&&!part.broken&&part.size.y>=CELL*.8&&Math.min(part.size.x,part.size.z)<CELL*.4;}
 isCeiling(part){return part&&!part.broken&&part.size.y<CELL*.45&&Math.min(part.size.x,part.size.z)>=CELL*.45&&part.p.y>.8;}
 wallSide(part){return part.size.x<part.size.z;}
 rotate(){this.yaw=(this.yaw+Math.PI/2)%(Math.PI*2);this.status='Rotated '+Math.round(this.yaw*180/Math.PI)+'° · right stick click to rotate';const btn=typeof document!=='undefined'&&document.getElementById('buildRotate');if(btn)btn.textContent='ROTATE '+Math.round(this.yaw*180/Math.PI)+'°';}
 tick(session){if(!this.active||!session)return;const right=[...session.inputSources].find(s=>s.handedness==='right'&&!s.hand);const click=!!right?.gamepad?.buttons[3]?.pressed;if(click&&!this.stickClick)this.rotate();this.stickClick=click;}
 target(ray){
  const rc=new T.Raycaster();rc.ray.copy(ray);rc.far=18;
  const pick=this.world.pickables.filter(m=>m.visible&&m.userData.chunks);
  const hit=pick.length?rc.intersectObjects(pick,false).find(h=>!h.object.userData.chunks?.[h.instanceId]?.broken):null;
  const part=hit?.object.userData.chunks?.[hit.instanceId];
  let p;
  if(this.kind==='Ceiling'&&this.isCeiling(part)){
   const look=ray.direction.clone();look.y=0;if(look.lengthSq()<.0001)look.set(0,0,-1);look.normalize();
   const alongX=Math.abs(look.x)>=Math.abs(look.z),gap=(1+this.size)*CELL/2;
   p=new T.Vector3(part.p.x+(alongX?Math.sign(look.x||1)*gap:0),0,part.p.z+(!alongX?Math.sign(look.z||1)*gap:0));
   p._ceiling=part;
  }else if(this.isWall(part))p=new T.Vector3(part.p.x,0,part.p.z);
  else if(this.kind==='Ceiling'){
   p=ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-this.height),new T.Vector3());
   if(!p||ray.origin.distanceTo(p)>18)p=ray.direction.y<-.015?ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),new T.Vector3()):null;
  }else{
   p=ray.direction.y<-.015?ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),new T.Vector3()):null;
  }
  if(!p||ray.origin.distanceTo(p)>18)return null;
  p.x=Math.round(p.x/CELL)*CELL;p.z=Math.round(p.z/CELL)*CELL;p._wall=this.isWall(part)?part:null;p._ceiling=p._ceiling||(this.isCeiling(part)?part:null);return p;
 }
 specification(p){const spec={kind:this.kind,n:this.size,surface:this.surface,furniture:this.furniture,x:p.x,z:p.z,yaw:this.yaw,height:['Furniture','Floor'].includes(this.kind)?0:this.height};if(spec.kind==='Wall')this.snapStack(spec);if(spec.kind==='Ceiling')this.snapCeiling(spec,p._wall,p._ceiling);return spec;}
 snapStack(spec){
  const side=Math.round(spec.yaw/(Math.PI/2))%2!==0;
  const foot=[],seen=new Set();
  for(const c of this.cells({...spec,height:0})){const k=c.center.x.toFixed(3)+'/'+c.center.z.toFixed(3);if(seen.has(k))continue;seen.add(k);foot.push(c);}
  let top=-Infinity,overlap=false;
  for(const part of this.world.fractures.parts){
   if(!this.isWall(part))continue;
   if(!foot.some(c=>Math.abs(c.center.x-part.p.x)<(c.size.x+part.size.x)/2-.02&&Math.abs(c.center.z-part.p.z)<(c.size.z+part.size.z)/2-.02))continue;
   if(this.wallSide(part)!==side)return;
   overlap=true;top=Math.max(top,part.p.y+part.size.y/2);
  }
  if(overlap&&top>-Infinity)spec.height=Math.round(top/CELL)*CELL;
 }
 snapCeiling(spec,wall,ceiling){
  let top=wall?wall.p.y+wall.size.y/2:-Infinity;
  if(ceiling)top=Math.max(top,ceiling.p.y-ceiling.size.y/2);
  const reach=spec.n*CELL+CELL*2,gap=(1+spec.n)*CELL/2;
  let best=null,bd=1e9;
  for(const part of this.world.fractures.parts){
   if(this.isCeiling(part)){
    const dx=Math.abs(part.p.x-spec.x),dz=Math.abs(part.p.z-spec.z);
    if(dx<reach&&dz<reach){
     top=Math.max(top,part.p.y-part.size.y/2);
     const dist=Math.hypot(dx,dz);
     if(dist<bd&&(dx>CELL*.2||dz>CELL*.2)){bd=dist;best=part;}
    }
    continue;
   }
   if(!this.isWall(part))continue;
   if(Math.abs(part.p.x-spec.x)<reach&&Math.abs(part.p.z-spec.z)<reach)top=Math.max(top,part.p.y+part.size.y/2);
  }
  if(best){
   const dx=spec.x-best.p.x,dz=spec.z-best.p.z;
   if(Math.abs(dx)>=Math.abs(dz)&&Math.abs(dx)>CELL*.2)spec.x=best.p.x+Math.sign(dx||1)*gap;
   else if(Math.abs(dz)>CELL*.2)spec.z=best.p.z+Math.sign(dz||1)*gap;
   spec.x=Math.round(spec.x/CELL)*CELL;spec.z=Math.round(spec.z/CELL)*CELL;
  }
  if(top>-Infinity)spec.height=Math.round(top/CELL)*CELL;
 }
 cells(spec){return layout(spec.kind,spec.n,new T.Vector3(spec.x,0,spec.z),spec.yaw,spec.height);}
 occupiedCells(){
  if(this.occupancyRevision!==this.world.revision||this.occupancyCount!==this.world.fractures.parts.length){
   this.occupied=new Map(this.world.fractures.parts.filter(p=>p.index!==undefined).map(p=>[cellKey({center:p.p,size:p.size}),p]));
   this.occupancyRevision=this.world.revision;this.occupancyCount=this.world.fractures.parts.length;
  }
  return this.occupied;
 }
 valid(spec){
  if(!Number.isFinite(spec.x)||!Number.isFinite(spec.z)||!Number.isFinite(spec.height)||!Number.isFinite(spec.yaw)||spec.height<0||spec.height>6)return false;
  if(!['Wall','Floor','Ceiling','Furniture'].includes(spec.kind)||![1,2,3].includes(spec.n)||!SURFACES[spec.surface]||!FURNITURE.includes(spec.furniture))return false;
  if(spec.kind==='Floor'&&spec.height!==0)return false;
  if(spec.kind==='Furniture'){
   const box=this.furnitureBounds(spec),p=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());
   if(Math.max(Math.abs(box.min.x),Math.abs(box.max.x),Math.abs(box.min.z),Math.abs(box.max.z))>this.world.extent)return false;
   return !this.world.nearby(p,Math.max(size.x,size.z)).some(o=>o.y+o.h>.12&&o.y<box.max.y&&Math.abs(p.x-o.x)<(o.w+size.x)/2-.01&&Math.abs(p.z-o.z)<(o.d+size.z)/2-.01);
  }
  return this.cells(spec).every(c=>Math.abs(c.center.x)+c.size.x/2<=this.world.extent&&Math.abs(c.center.z)+c.size.z/2<=this.world.extent&&(!this.occupiedCells().get(cellKey(c))||this.occupiedCells().get(cellKey(c)).broken));
 }
 furnitureBounds(spec){
  const source=spec.furniture==='Clothing rack'?this.wardrobe.rack:this.world.furnitureTemplates.get(spec.furniture);
  let box;
  if(source){source.updateWorldMatrix(true,true);box=new T.Box3().setFromObject(source);if(spec.furniture==='Clothing rack')box.applyMatrix4(source.matrixWorld.clone().invert());}
  else if(spec.furniture==='Staircase')box=new T.Box3(new T.Vector3(-.55,0,-.05),new T.Vector3(.55,1.85,2.7));
  else{const width=spec.furniture==='Couch'?1.65:.72;box=new T.Box3(new T.Vector3(-width/2,0,-.38),new T.Vector3(width/2,1,.38));}
  return box.applyMatrix4(new T.Matrix4().makeRotationY(spec.yaw)).translate(new T.Vector3(spec.x,0,spec.z));
 }
 preview(ray){
  const p=this.active&&this.world.root.visible?this.target(ray):null;this.ghost.visible=!!p;if(!p)return;
  const spec=this.specification(p);this.previewMaterial.color.setHex(this.valid(spec)?0x72dcb0:0xef7967);
  const cells=spec.kind==='Furniture'?[{center:this.furnitureBounds(spec).getCenter(new T.Vector3()),size:this.furnitureBounds(spec).getSize(new T.Vector3())}]:this.cells(spec);
  this.ghost.children.forEach((m,i)=>{m.visible=i<cells.length;if(m.visible){m.position.copy(cells[i].center);m.scale.copy(cells[i].size);}});
 }
 texture(name){if(this.maps.has(name))return this.maps.get(name);const map=makeSurfaceMap(name);this.maps.set(name,map);return map;}
 place(ray){if(!this.active)return false;const p=this.target(ray);if(!p){this.status='Aim down at ground within 18 metres.';return true;}this.add(this.specification(p));return true;}
 add(spec,restoring=false){
  if(this.records.length>=240||!this.valid(spec)){this.status='Blocked, overlapping, outside map, or build limit reached.';return false;}
  // Never place a solid patch through the player or an NPC.
  if(!restoring){const bodies=[this.props.camera.getWorldPosition(new T.Vector3()),...this.props.system.actors.map(a=>a.group.position)];const boxes=spec.kind==='Furniture'?[this.furnitureBounds(spec)]:this.cells(spec).map(c=>new T.Box3().setFromCenterAndSize(c.center,c.size));
   if(boxes.some(b=>b.max.y>.12&&b.min.y<1.7&&bodies.some(p=>p.x>b.min.x-.18&&p.x<b.max.x+.18&&p.z>b.min.z-.18&&p.z<b.max.z+.18))){this.status='Move away from the placement area first.';return false;}}
  let object;
  if(spec.kind==='Furniture')object=placeFurniture(this.world,this.wardrobe,spec.furniture,new T.Vector3(spec.x,0,spec.z),spec.yaw);
  else{
   const cells=this.cells(spec),min=cells[0].center.clone(),max=cells[cells.length-1].center.clone(),size=max.clone().sub(min).add(cells[0].size),center=min.add(max).multiplyScalar(.5);
   object=this.world.fractures.panel(center,size,SURFACES[spec.surface].kind,()=>false,{cells,map:this.texture(spec.surface)});
   object.name=spec.surface+' '+spec.kind;
   if(spec.kind==='Floor'){this.world.floors??=[];for(const c of cells)this.world.floors.push({x:c.center.x,z:c.center.z,w:c.size.x,d:c.size.z,y:c.center.y-c.size.y/2,h:c.size.y,object});}
  }
  if(!object)return false;this.records.push({spec:{...spec},object});this.status='Placed '+(spec.kind==='Furniture'?spec.furniture:spec.n+'×'+spec.n+' '+spec.surface+' '+spec.kind.toLowerCase());return true;
 }
 undo(){
  const record=this.records.pop();if(!record){this.status='Nothing to undo.';return;}
  const objects=new Set();record.object.traverse(o=>objects.add(o));
  for(const seat of this.world.seats.filter(s=>objects.has(s.group))){if(seat.occupant){seat.occupant.seat=null;seat.occupant.group.position.copy(seat.approach);}this.world.removeObstacle(seat.obstacle);}
  this.world.seats=this.world.seats.filter(s=>!objects.has(s.group));
  for(const part of this.world.fractures.parts.filter(p=>objects.has(p.mesh)))this.world.removeObstacle(part.obstacle);
  this.world.removeObstacle(record.object.userData.obstacle);
  if(this.world.stairs)this.world.stairs=this.world.stairs.filter(g=>g!==record.object);
  this.world.fractures.parts=this.world.fractures.parts.filter(p=>!objects.has(p.mesh));this.world.pickables=this.world.pickables.filter(o=>!objects.has(o));this.wardrobe.tokens=this.wardrobe.tokens.filter(o=>!objects.has(o));
  if(this.world.floors)this.world.floors=this.world.floors.filter(f=>f.object!==record.object);
  record.object.removeFromParent();record.object.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});this.status='Removed last placement.';
 }
 snapshot(){return this.records.map(r=>({...r.spec,broken:r.object.userData.chunks?.filter(p=>p.broken).map(p=>p.index)||[]}));}
 restore(records){if(!Array.isArray(records))return;for(const spec of records.slice(0,240))if(this.add(spec,true))for(const i of spec.broken||[]){const part=this.records.at(-1).object.userData.chunks?.[i];if(part){part.broken=true;part.mesh.setMatrixAt(i,new T.Matrix4().makeScale(0,0,0));part.mesh.instanceMatrix.needsUpdate=true;this.world.removeObstacle(part.obstacle);}}}
}
