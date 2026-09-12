import * as T from '../vendor/three.module.js?v=5.0.0';
export {T};export const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
export const clamp=T.MathUtils.clamp,lerp=T.MathUtils.lerp;
export function rng(seed=14629){let s=seed>>>0;const f=()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};f.state=()=>s;f.restore=v=>{s=v|0;};return f;}
export function unit(random,out=V()){const y=random()*2-1,a=random()*Math.PI*2,k=Math.sqrt(1-y*y);return out.set(Math.cos(a)*k,y,Math.sin(a)*k);}
export function raySphere(o,d,c,r,max=Infinity){const x=o.x-c.x,y=o.y-c.y,z=o.z-c.z,b=x*d.x+y*d.y+z*d.z,cc=x*x+y*y+z*z-r*r,h=b*b-cc;if(h<0)return Infinity;const root=Math.sqrt(h),a=-b-root,z1=-b+root;const t=a>.0001?a:z1>.0001?z1:Infinity;return t<=max?t:Infinity;}
export function segmentDistance(p,a,b){const x=b.x-a.x,y=b.y-a.y,z=b.z-a.z,l=x*x+y*y+z*z,t=l?clamp(((p.x-a.x)*x+(p.y-a.y)*y+(p.z-a.z)*z)/l,0,1):0;return Math.hypot(p.x-a.x-x*t,p.y-a.y-y*t,p.z-a.z-z*t);}
export function dead(v){return Math.abs(v)<.08?0:Math.sign(v)*(Math.abs(v)-.08)/.92;}
export function axes(g){const a=g?.axes||[];return a.length>=4?[dead(a[2]),dead(a[3])]:[dead(a[0]||0),dead(a[1]||0)];}
// Capsule intersection for drawn plasma: continuous sweeps avoid tunnelling.
export function rayCapsule(o,d,a,b,r,max=Infinity){const ba=b.clone().sub(a),oa=o.clone().sub(a),baba=ba.lengthSq();if(baba<1e-9)return raySphere(o,d,a,r,max);const bard=ba.dot(d),baoa=ba.dot(oa),rdoa=d.dot(oa),A=baba-bard*bard,B=baba*rdoa-baoa*bard,C=baba*oa.lengthSq()-baoa*baoa-r*r*baba,h=B*B-A*C;let best=Infinity;if(Math.abs(A)>1e-9&&h>=0){const t=(-B-Math.sqrt(h))/A,y=baoa+t*bard;if(t>=0&&t<=max&&y>0&&y<baba)best=t;}return Math.min(best,raySphere(o,d,a,r,max),raySphere(o,d,b,r,max));}
export function nearestOnSegment(p,a,b){const d=b.clone().sub(a);return a.clone().addScaledVector(d,clamp(p.clone().sub(a).dot(d)/Math.max(1e-9,d.lengthSq()),0,1));}
