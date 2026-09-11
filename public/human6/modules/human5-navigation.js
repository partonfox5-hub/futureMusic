import * as T from 'three';
import {ROUTES} from './human5-worldfield.js?v=18.0.0';
import {wrapMethod} from './human5-common.js?v=18.0.0';
/** Finite route graph and bounded local A*: never sort an expanding 8,000-node list. */
export class MinHeap {
 constructor(){this.a=[];}
 push(v){let i=this.a.length;this.a.push(v);while(i){const p=(i-1)>>1;if(this.a[p].f<=v.f)break;this.a[i]=this.a[p];i=p;}this.a[i]=v;}
 pop(){const a=this.a;if(!a.length)return null;const top=a[0],v=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1].f<a[j].f)j++;if(a[j].f>=v.f)break;a[i]=a[j];i=j;}a[i]=v;}return top;}
}
export class RouteGraph {
 constructor(routes=ROUTES){this.nodes=[];const keys=new Map();const add=p=>{const k=p[0].toFixed(1)+'/'+p[1].toFixed(1);if(keys.has(k))return keys.get(k);const i=this.nodes.length;keys.set(k,i);this.nodes.push({p:new T.Vector3(p[0],0,p[1]),edges:new Set()});return i;};
  for(const r of routes){const ids=r.points.map(add);for(let i=1;i<ids.length;i++){this.nodes[ids[i]].edges.add(ids[i-1]);this.nodes[ids[i-1]].edges.add(ids[i]);}}
  for(let i=0;i<this.nodes.length;i++)for(let j=i+1;j<this.nodes.length;j++)if(this.nodes[i].p.distanceTo(this.nodes[j].p)<12){this.nodes[i].edges.add(j);this.nodes[j].edges.add(i);}
 }
 nearest(p){let best=0,d=Infinity;this.nodes.forEach((n,i)=>{const e=Math.hypot(p.x-n.p.x,p.z-n.p.z);if(e<d){d=e;best=i;}});return best;}
 path(start,goal){const a=this.nearest(start),b=this.nearest(goal),open=new MinHeap(),cost=new Map([[a,0]]),prev=new Map();open.push({id:a,f:0});let found=false;
  while(open.a.length){const cur=open.pop().id;if(cur===b){found=true;break;}for(const j of this.nodes[cur].edges){const c=cost.get(cur)+this.nodes[cur].p.distanceTo(this.nodes[j].p);if(c<(cost.get(j)??Infinity)){cost.set(j,c);prev.set(j,cur);open.push({id:j,f:c+this.nodes[j].p.distanceTo(this.nodes[b].p)});}}}
  if(!found)return null;const out=[goal.clone().setY(0)];for(let i=b;;i=prev.get(i)){out.unshift(this.nodes[i].p.clone());if(i===a)break;}return out;
 }
}
export function boundedLocalPath(start,goal,blocked,r=.3,maxNodes=1000){const distance=Math.hypot(start.x-goal.x,start.z-goal.z),y=start.y,point=(x,z)=>new T.Vector3(x,y,z);let clear=true;
 for(let i=0;i<=Math.ceil(distance/.35);i++){const p=start.clone().lerp(goal,i/Math.max(1,Math.ceil(distance/.35)));p.y=y;if(blocked(p,r)){clear=false;break;}}if(clear)return [goal.clone().setY(0)];if(distance>32||blocked(point(goal.x,goal.z),r))return null;
 const step=.5,pad=3,x0=Math.min(start.x,goal.x)-pad,z0=Math.min(start.z,goal.z)-pad,nx=Math.ceil((Math.abs(start.x-goal.x)+pad*2)/step)+1,nz=Math.ceil((Math.abs(start.z-goal.z)+pad*2)/step)+1;
 const cell=p=>Math.round((p.z-z0)/step)*nx+Math.round((p.x-x0)/step),at=id=>point(x0+(id%nx)*step,z0+Math.floor(id/nx)*step),a=cell(start),b=cell(goal),heap=new MinHeap(),cost=new Map([[a,0]]),prev=new Map(),seen=new Set();heap.push({id:a,f:0});
 while(heap.a.length&&seen.size<maxNodes){const n=heap.pop().id;if(seen.has(n))continue;if(n===b){const out=[goal.clone().setY(0)];for(let i=n;i!==a;i=prev.get(i))out.unshift(at(i).setY(0));return out;}seen.add(n);const x=n%nx,z=Math.floor(n/nx);
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const xx=x+dx,zz=z+dz,id=zz*nx+xx;if(xx<0||zz<0||xx>=nx||zz>=nz||blocked(at(id),r)||dx&&dz&&(blocked(at(z*nx+xx),r)||blocked(at(zz*nx+x),r)))continue;const c=cost.get(n)+Math.hypot(dx,dz);if(c<(cost.get(id)??Infinity)){cost.set(id,c);prev.set(id,n);heap.push({id,f:c+at(id).distanceTo(at(b))/step});}}
 }return null;
}
export function installNavigation(world){const graph=new RouteGraph();const undo=wrapMethod(world,'path',old=>function(start,goal,r=.3){if(!world.h5OpenWorld?.active)return old.call(this,start,goal,r);const distance=Math.hypot(start.x-goal.x,start.z-goal.z);if(distance<28)return boundedLocalPath(start,goal,(p,r)=>world.blocked(p,r),r);const route=graph.path(start,goal);if(!route)return null;const first=route[0].clone();first.y=start.y;const local=boundedLocalPath(start,first,(p,r)=>world.blocked(p,r),r);return local?[...local,...route.slice(1)]:route;});return {graph,dispose:undo};}
