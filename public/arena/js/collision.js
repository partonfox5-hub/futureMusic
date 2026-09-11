import {T,V,clamp,raySphere} from './math.js?v=4.0.0';
import {chunkEdge} from './fracture.js?v=4.0.0';
const shapes={hullChunk:[1.2,.13,.9],crate:[.57,.57,.57],cage:[.76,.76,.76],barrel:[.50,.67,.50],pad:[1.72,.13,1.72],window:[1.33,.83,.12],kennel:[1.43,1.33,1.53],island:[1,.14,1]};
export function halfSize(e){const shape=e.half||shapes[e.type];if(!shape)return null;const k=e.scale||1;return V(...shape).multiplyScalar(k);}
export function entityRay(o,d,e,max,pad=0){if(e.type==='hullChunk'&&e.source)return chunkRay(o,d,e,max,pad);const half=halfSize(e);if(!half)return raySphere(o,d,e.p,e.r+pad,max);half.addScalar(pad);const q=e.q.clone().invert(),p=o.clone().sub(e.p).applyQuaternion(q),dir=d.clone().applyQuaternion(q);let enter=-Infinity,exit=Infinity;for(let axis=0;axis<3;axis++){const a=p.getComponent(axis),b=dir.getComponent(axis),h=half.getComponent(axis);if(Math.abs(b)<1e-9){if(Math.abs(a)>h)return Infinity;continue;}let lo=(-h-a)/b,hi=(h-a)/b;if(lo>hi)[lo,hi]=[hi,lo];enter=Math.max(enter,lo);exit=Math.min(exit,hi);if(enter>exit)return Infinity;}const t=enter>.0001?enter:exit>.0001?exit:Infinity;return t<=max?t:Infinity;}
export function resolveBody(p,v,e,r=.38){if(e.type==='hullChunk'&&e.source)return resolveChunk(p,v,e,r);const half=halfSize(e);if(!half||!e.alive)return false;const inv=e.q.clone().invert(),local=p.clone().sub(e.p).applyQuaternion(inv),nearest=local.clone().clamp(half.clone().negate(),half),normal=local.clone().sub(nearest),dist=normal.length();if(dist>=r)return false;let depth=r-dist;if(dist>.00001)normal.multiplyScalar(1/dist);else{let axis=0,gap=Infinity;for(let i=0;i<3;i++){const edge=half.getComponent(i)-Math.abs(local.getComponent(i));if(edge<gap){gap=edge;axis=i;}}normal.set(0,0,0).setComponent(axis,local.getComponent(axis)>=0?1:-1);depth=r+gap;}normal.applyQuaternion(e.q);p.addScaledVector(normal,depth+.003);const approach=v.dot(normal);if(approach<0){v.addScaledVector(normal,-approach);if(!['window','kennel','island'].includes(e.type))e.v.addScaledVector(normal,approach*.28);}return normal;}

function footprint(p,e,pad=0){return Math.hypot(p.x,p.z)<(e.scale||1)*chunkEdge(Math.atan2(p.z,p.x))+pad;}
function chunkRay(origin,direction,e,max,pad){
 const inv=e.q.clone().invert(),o=origin.clone().sub(e.p).applyQuaternion(inv),d=direction.clone().applyQuaternion(inv),R=e.source.radius,tube=e.source.type==='tube';
 let best=Infinity;const b=o.clone();b.y+=R;
 const A=d.x*d.x+d.y*d.y+(tube?0:d.z*d.z),B=b.x*d.x+b.y*d.y+(tube?0:b.z*d.z);
 if(A<1e-10)return Infinity;
 for(const r of [R+pad,R-.24-pad]){const C=b.x*b.x+b.y*b.y+(tube?0:b.z*b.z)-r*r,disc=B*B-A*C;if(disc<0)continue;
  for(const t of [(-B-Math.sqrt(disc))/A,(-B+Math.sqrt(disc))/A]){if(t<.0001||t>max||t>=best)continue;const p=o.clone().addScaledVector(d,t);if(p.y>-R*.5&&footprint(p,e,pad))best=t;}
 }return best;
}
function resolveChunk(p,v,e,r){
 if(!e.alive)return false;const inv=e.q.clone().invert(),local=p.clone().sub(e.p).applyQuaternion(inv);if(!footprint(local,e,r*.4))return false;
 const R=e.source.radius,rr=local.x*local.x+(e.source.type==='tube'?0:local.z*local.z),top=Math.sqrt(Math.max(.01,R*R-rr))-R,bottom=Math.sqrt(Math.max(.01,(R-.24)**2-rr))-R;
 if(local.y>top+r||local.y<bottom-r)return false;
 const above=local.y>(top+bottom)*.5,normal=V(local.x/R,1,e.source.type==='tube'?0:local.z/R).normalize().multiplyScalar(above?1:-1).applyQuaternion(e.q);
 const depth=above?top+r-local.y:local.y-bottom+r;p.addScaledVector(normal,depth+.003);const approach=v.dot(normal);if(approach<0){v.addScaledVector(normal,-approach);e.v.addScaledVector(normal,approach*.05);}return normal;
}
