import {T,V,clamp,unit,raySphere,segmentDistance} from './math.js?v=5.0.0';
import {SPHERES,LINKS,BRANCHES,RULES} from './data.js?v=5.0.0';
import {Navigator} from './navigation.js?v=5.0.0';
import {fractureProfile,inSphereHole,inTubeHole} from './fracture.js?v=5.0.0';
export class ArenaMap {
 constructor(random){
  this.random=random;this.revision=0;this.holes=[];this.burns=[];this.tubeHoles=[];
  this.spheres=SPHERES.map((s,id)=>({...s,id,c:V(...s.c),holes:[]}));this.tubes=[];this.rooms=[];this.stores=[];this.hatches=[];this.nests=[];
  for(const [a,b,store]of LINKS){const sa=this.spheres[a],sb=this.spheres[b],d=sb.c.clone().sub(sa.c).normalize();this.addHole(a,d,3.8,'portal');this.addHole(b,d.clone().negate(),3.8,'portal');this.tube(sa.c.clone().addScaledVector(d,sa.r*.998),sb.c.clone().addScaledVector(d,-sb.r*.998),a,b,!!store);}
  for(const [a,b]of BRANCHES){const t=this.tubes.find(t=>t.a===a&&t.b===b),perp=t.d.clone().cross(V(0,1,0)).normalize(),mid=t.start.clone().add(t.end).multiplyScalar(.5),c=mid.clone().addScaledVector(perp,13.4),q=new T.Quaternion().setFromUnitVectors(V(0,0,1),perp);
    const room={id:this.rooms.length,c,size:16,q,inv:q.clone().invert(),door:3.91};this.rooms.push(room);this.tubeHoles.push({tube:t.id,c:mid.clone().addScaledVector(perp,3.4),r:3.1,permanent:true});this.tube(mid.clone().addScaledVector(perp,3.2),c.clone().addScaledVector(perp,-7.8),a,b,false,true);}
  for(const s of this.spheres){if(!s.hub&&random()<.33){const dir=V(0,random()<.5?1:-1,0),r=Math.max(1.25,s.r*Math.sin(8*Math.PI/180)*.82);this.hatches.push({sphere:s.id,dir,r,pos:s.c.clone().addScaledVector(dir,s.r),hp:18,open:false});}}
  // NkWorld.PlaceHydras: three deterministic sectors, delayed 18 / 40 / 72 s.
  for(const [id,delay] of [[0,18],[1,40],[2,72]]){const s=this.spheres[id];let dir=unit(random);for(let i=0;i<16;i++){dir=unit(random);if(Math.abs(dir.y)<.7&&!this.spheres.some(o=>o!==s&&o.c.clone().sub(s.c).normalize().dot(dir)>.8))break;}this.nests.push({id:this.nests.length,sphere:id,dir,pos:s.c.clone().addScaledVector(dir,s.r*.992),timer:delay,open:false,openT:0,headsNext:1,headHealth:RULES.hydraBaseHealth,severed:0,headSerial:0,regrowth:[],fallen:false,disabled:false,hp:RULES.hydraNestHealth,maxHp:RULES.hydraNestHealth});}
  for(const t of this.tubes.filter(t=>t.store)){const side=V(1,0,0).applyQuaternion(t.q),pos=t.mid.clone().addScaledVector(side,3.35);this.stores.push({id:this.stores.length,tube:t.id,pos,side});}
  this.paths=Array.from({length:8},()=>Array(8).fill(Infinity));for(let i=0;i<8;i++)this.paths[i][i]=0;for(const [a,b]of LINKS)this.paths[a][b]=this.paths[b][a]=1;for(let k=0;k<8;k++)for(let a=0;a<8;a++)for(let b=0;b<8;b++)this.paths[a][b]=Math.min(this.paths[a][b],this.paths[a][k]+this.paths[k][b]);
  this.navigator=new Navigator(this);this._p=V();this._v=V();this._o=V();this._d=V();
 }
 tube(start,end,a,b,store,branch=false){const d=end.clone().sub(start),len=d.length();d.normalize();const q=new T.Quaternion().setFromUnitVectors(V(0,1,0),d);const t={id:this.tubes.length,start,end,mid:start.clone().add(end).multiplyScalar(.5),d,len,q,inv:q.clone().invert(),r:3.4,a,b,store,branch};this.tubes.push(t);return t;}
 addHole(sphere,dir,r,type='damage',profile=null){const s=this.spheres[sphere];const h={dir:dir.clone().normalize(),r,type,profile:type==='damage'?(profile||fractureProfile((sphere+1)*977+s.holes.length*113)):null};s.holes.push(h);this.revision++;return h;}
 through(s,point,margin=0){const n=this._v.copy(point).sub(s.c).normalize();for(const h of s.holes)if(inSphereHole(h,n,s.r,margin))return true;for(const h of this.hatches)if(h.sphere===s.id&&h.open&&inSphereHole(h,n,s.r,margin))return true;for(const h of this.nests)if(h.sphere===s.id&&h.open&&!h.disabled&&inSphereHole({dir:h.dir,r:1.8},n,s.r,margin))return true;return false;}
 sector(p){let found=-1;for(const s of this.spheres)if(p.distanceToSquared(s.c)<s.r*s.r)found=s.id;return found;}
 nearest(p){let best=this.spheres[0],dist=Infinity;for(const s of this.spheres){const d=Math.abs(p.distanceTo(s.c)-s.r);if(d<dist){dist=d;best=s;}}return best;}
 portalAtTube(t,p){return this.tubeHoles.some(h=>h.tube===t.id&&inTubeHole(h,t,p));}
 // Shared collision geometry used by projectiles and the player; actual openings.
 ray(o,d,max=1000,moving=false){
  let best=null,dist=max;const point=this._p;
  for(const s of this.spheres){const delta=o.clone().sub(s.c),b=delta.dot(d),h=b*b-delta.lengthSq()+s.r*s.r;if(h<0)continue;const root=Math.sqrt(h);for(const hit of [-b-root,-b+root]){if(hit<=.0001||hit>=dist)continue;point.copy(o).addScaledVector(d,hit);if(this.through(s,point,moving?.3:0))continue;dist=hit;best={type:'sphere',id:s.id,distance:hit,pos:point.clone(),normal:point.clone().sub(s.c).normalize()};}}

  for(const t of this.tubes){const lo=this._o.copy(o).sub(t.mid).applyQuaternion(t.inv),ld=this._d.copy(d).applyQuaternion(t.inv);const A=ld.x*ld.x+ld.z*ld.z,B=lo.x*ld.x+lo.z*ld.z,C=lo.x*lo.x+lo.z*lo.z-t.r*t.r,disc=B*B-A*C;if(A<1e-9||disc<0)continue;const rt=Math.sqrt(disc);for(const hit of [(-B-rt)/A,(-B+rt)/A]){if(hit<=.0001||hit>=dist||Math.abs(lo.y+ld.y*hit)>t.len*.5)continue;point.copy(o).addScaledVector(d,hit);if(this.portalAtTube(t,point))continue;dist=hit;best={type:'tube',id:t.id,distance:hit,pos:point.clone(),normal:V(lo.x+ld.x*hit,0,lo.z+ld.z*hit).normalize().applyQuaternion(t.q)};}}
  for(const room of this.rooms){const lo=this._o.copy(o).sub(room.c).applyQuaternion(room.inv),ld=this._d.copy(d).applyQuaternion(room.inv),half=room.size/2;
    for(let axis=0;axis<3;axis++)for(const side of [-1,1]){const dv=ld.getComponent(axis);if(Math.abs(dv)<1e-9)continue;const hit=(side*half-lo.getComponent(axis))/dv;if(hit<=.0001||hit>=dist)continue;const p=lo.clone().addScaledVector(ld,hit);if(Math.abs(p.getComponent((axis+1)%3))>half||Math.abs(p.getComponent((axis+2)%3))>half)continue;if(axis===2&&side===-1&&Math.abs(p.x)<room.door&&Math.abs(p.y)<room.door)continue;dist=hit;best={type:'room',id:room.id,distance:hit,pos:o.clone().addScaledVector(d,hit),normal:V().setComponent(axis,side).applyQuaternion(room.q)};}}
  if(d.y<-.0001){const hit=(RULES.groundY-o.y)/d.y;if(hit>0&&hit<dist){dist=hit;best={type:'lava',id:0,distance:hit,pos:o.clone().addScaledVector(d,hit),normal:V(0,1,0)};}}
  return best;
 }
 move(p,v,dt,r=.35){const speed=v.length();if(speed<1e-8)return null;const d=v.clone().multiplyScalar(1/speed),length=speed*dt,hit=this.ray(p,d,length+r,true);if(hit){p.addScaledVector(d,Math.max(0,hit.distance-r));const dot=v.dot(hit.normal);v.addScaledVector(hit.normal,-dot);v.multiplyScalar(.62);return hit;}p.addScaledVector(v,dt);return null;}
 scorch(hit,radius=3){if(!hit||!['sphere','tube'].includes(hit.type))return false;let b=this.burns.find(b=>b.type===hit.type&&b.id===hit.id&&b.pos.distanceToSquared(hit.pos)<5);if(!b){b={type:hit.type,id:hit.id,pos:hit.pos.clone(),hits:0,radius};this.burns.push(b);}b.radius=Math.max(b.radius||3,radius);if(++b.hits<(hit.type==='sphere'?RULES.wallStrength:4))return false;
  const r=clamp(1.8+b.radius*.15,2.45,4.2);let hole;
  if(hit.type==='sphere')hole=this.addHole(hit.id,hit.pos.clone().sub(this.spheres[hit.id].c),r);else{hole={tube:hit.id,c:hit.pos.clone(),r:Math.min(r,3),profile:fractureProfile(this.revision*717+31)};this.tubeHoles.push(hole);this.revision++;}this.burns.splice(this.burns.indexOf(b),1);hit.breach=hole;return hole;}
 interior(id,frac=.4){const s=this.spheres[id];return s.c.clone().addScaledVector(unit(this.random),s.r*frac*(.2+this.random()*.8));}
 route(from,to,time=0,agent=null){return this.navigator.route(from,to,time,agent);}

 serialize(){return {holes:this.spheres.map(s=>s.holes.filter(h=>h.type==='damage').map(h=>({d:h.dir.toArray(),r:h.r,profile:h.profile}))),tubeHoles:this.tubeHoles.filter(h=>!h.permanent).map(h=>({tube:h.tube,c:h.c.toArray(),r:h.r,profile:h.profile})),burns:this.burns.map(b=>({...b,pos:b.pos.toArray()})),hatches:this.hatches.map(h=>({open:h.open,hp:h.hp})),nests:this.nests.map(({timer,open,openT,headsNext,fallen,disabled,hp,headHealth,severed,headSerial,regrowth})=>({timer,open,openT,headsNext,fallen,disabled,hp,headHealth,severed,headSerial,regrowth}))};}
 restore(data){if(!data)return;data.holes?.forEach((hs,id)=>hs.forEach(h=>this.addHole(id,V(...h.d),h.r,'damage',h.profile)));for(const h of data.tubeHoles||[])this.tubeHoles.push({...h,c:V(...h.c)});this.burns=(data.burns||[]).map(b=>({...b,pos:V(...b.pos)}));data.hatches?.forEach((h,i)=>Object.assign(this.hatches[i]||{},h));data.nests?.forEach((n,i)=>Object.assign(this.nests[i]||{},n));for(const n of this.nests)if(n.disabled&&!this.spheres[n.sphere].holes.some(h=>h.type==='damage'&&h.dir.dot(n.dir)>.999))this.addHole(n.sphere,n.dir,3.35);this.revision++;}
}
