import {V,raySphere,segmentDistance} from './math.js?v=5.0.0';

// A small shared graph connects the real doors, tunnels and hull breaches.
// Rebuild only after geometry changes; share the destination field across bots.
export class Navigator {
 constructor(map){this.map=map;this.revision=-1;this.goal=V(Infinity,0,0);this.nextField=0;this.agents=new WeakMap();this.builds=0;this.fields=0;}
 enclosed(p){const m=this.map;if(m.sector(p)>=0)return true;
  if(m.tubes.some(t=>segmentDistance(p,t.start,t.end)<t.r+.15))return true;
  return m.rooms.some(r=>{const q=p.clone().sub(r.c).applyQuaternion(r.inv);return Math.max(Math.abs(q.x),Math.abs(q.y),Math.abs(q.z))<r.size/2;});
 }
 clear(a,b){const d=b.clone().sub(a),len=d.length();return len<.05||!this.map.ray(a,d.multiplyScalar(1/len),len,true);}
 rebuild(){const m=this.map;this.nodes=[];const add=(p,out=false,inside=null)=>this.nodes.push({p:p.clone(),out,inside,edges:[],cost:Infinity});
  for(const s of m.spheres)add(s.c);
  for(const t of m.tubes){add(t.start.clone().addScaledVector(t.d,-1.4));add(t.mid);add(t.end.clone().addScaledVector(t.d,1.4));}
  for(const r of m.rooms)add(r.c);
  for(const s of m.spheres){const exits=[...s.holes.filter(h=>h.type==='damage'),...m.hatches.filter(h=>h.sphere===s.id&&h.open)];
   for(const h of exits){const p=s.c.clone().addScaledVector(h.dir,s.r),inside=p.clone().addScaledVector(h.dir,-2.2);add(inside);add(p.clone().addScaledVector(h.dir,2.2),true,inside);}
  }
  for(const h of m.tubeHoles.filter(h=>!h.permanent)){const t=m.tubes[h.tube],normal=h.c.clone().sub(t.mid),along=normal.dot(t.d);normal.addScaledVector(t.d,-along).normalize();const inside=h.c.clone().addScaledVector(normal,-1.6);add(inside);add(h.c.clone().addScaledVector(normal,1.6),true,inside);}
  for(let i=0;i<this.nodes.length;i++)for(let j=0;j<i;j++){const a=this.nodes[i],b=this.nodes[j];if(this.clear(a.p,b.p)){const d=a.p.distanceTo(b.p);a.edges.push([j,d]);b.edges.push([i,d]);}}
  this.revision=m.revision;this.nextField=-Infinity;this.agents=new WeakMap();this.builds++;
 }
 field(to,time){if(this.revision!==this.map.revision)this.rebuild();if(time<this.nextField&&this.goal.distanceToSquared(to)<9)return;
  this.goal.copy(to);this.nextField=time+.3;this.fields++;const outside=!this.enclosed(to),nodes=this.nodes,done=new Set();
  for(const n of nodes)n.cost=outside?(n.out?n.p.distanceTo(to)*1.08:Infinity):(this.clear(n.p,to)?n.p.distanceTo(to):Infinity);
  for(let count=0;count<nodes.length;count++){let at=-1,cost=Infinity;for(let i=0;i<nodes.length;i++)if(!done.has(i)&&nodes[i].cost<cost){cost=nodes[i].cost;at=i;}if(at<0)break;done.add(at);for(const [j,d]of nodes[at].edges)nodes[j].cost=Math.min(nodes[j].cost,cost+d);}
 }
 exterior(from,to){let obstacle=null,best=Infinity;const direction=to.clone().sub(from),length=direction.length();if(length<.01)return to;direction.multiplyScalar(1/length);
  for(const s of this.map.spheres){const radial=from.clone().sub(s.c),r=s.r+1.3,dist=radial.length();
   if(dist<r&&radial.dot(direction)>=0)continue;
   const hit=raySphere(from,direction,s.c,r,length);if(hit<best){best=hit;obstacle=s;}}
  let candidate=to;
  if(obstacle){const s=obstacle,normal=from.clone().sub(s.c).normalize(),tangent=to.clone().sub(s.c).addScaledVector(normal,-to.clone().sub(s.c).dot(normal));
   if(tangent.lengthSq()<.01)tangent.crossVectors(normal,Math.abs(normal.y)<.8?V(0,1,0):V(1,0,0));tangent.normalize();
   candidate=s.c.clone().add(normal.multiplyScalar(Math.cos(.32)).addScaledVector(tangent,Math.sin(.32)).multiplyScalar(s.r+3.2));
  }
  const toward=candidate.clone().sub(from),distance=toward.length(),hit=this.map.ray(from,toward.normalize(),distance+1,true);
  if(hit&&hit.type==='tube'){const tube=this.map.tubes[hit.id],along=from.clone().sub(tube.mid).dot(tube.d),axis=tube.mid.clone().addScaledVector(tube.d,along),normal=from.clone().sub(axis).normalize(),target=to.clone().sub(axis);target.addScaledVector(tube.d,-target.dot(tube.d));const tangent=target.addScaledVector(normal,-target.dot(normal));if(tangent.lengthSq()<.01)tangent.crossVectors(normal,tube.d);return axis.add(normal.multiplyScalar(Math.cos(.5)).addScaledVector(tangent.normalize(),Math.sin(.5)).multiplyScalar(Math.max(tube.r+2,from.distanceTo(axis))));}
  if(hit&&hit.type==='room'){const room=this.map.rooms[hit.id],normal=from.clone().sub(room.c).normalize(),tangent=to.clone().sub(room.c);tangent.addScaledVector(normal,-tangent.dot(normal));if(tangent.lengthSq()<.01)tangent.crossVectors(normal,V(0,1,0));return room.c.clone().add(normal.multiplyScalar(.95).addScaledVector(tangent.normalize(),.32).normalize().multiplyScalar(room.size*.9));}
  return candidate;
 }
 route(from,to,time=0,agent=null){
  // Ordinary same-room pursuit takes a single visibility test and no graph work.
  if(this.clear(from,to))return to;
  const inside=this.enclosed(from),targetInside=this.enclosed(to);if(!inside&&!targetInside)return this.exterior(from,to);
  this.field(to,time);const cached=agent&&this.agents.get(agent);if(cached&&cached.until>time&&cached.revision===this.revision&&from.distanceToSquared(cached.p)>1)return cached.p;
  let target=null,best=Infinity;
  for(const n of this.nodes){if(!Number.isFinite(n.cost))continue;const d=from.distanceTo(n.p);if(d<.65)continue;
   const score=d+n.cost;if(score>best+.03)continue;
   if(inside?!this.clear(from,n.p):!n.out)continue;
   best=score;target=n;
  }
  let p=target?(inside?target.p:from.distanceToSquared(target.p)<9?target.inside:this.exterior(from,target.p)):from.clone();
  if(agent)this.agents.set(agent,{p:p.clone(),until:time+.25,revision:this.revision});return p;
 }
}
