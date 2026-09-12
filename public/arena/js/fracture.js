import {V,clamp,rng} from './math.js?v=5.0.0';

// The same radial contour is used for visible tears and physical openings.
export function fractureProfile(seed){
 const random=rng(seed),phase=random()*6.283,a=[];
 for(let i=0;i<48;i++){const t=i/48*Math.PI*2;a.push(1+.16*Math.sin(t*3+phase)+.11*Math.sin(t*5-phase*.7)+.055*Math.sin(t*11+phase*2)+(random()-.5)*.065);}
 return a;
}
export function rimRadius(h,angle){
 if(!h.profile)return h.r;
 const u=((angle/(Math.PI*2)%1+1)%1)*h.profile.length,i=Math.floor(u);
 return h.r*(h.profile[i]*(1-u+i)+h.profile[(i+1)%h.profile.length]*(u-i));
}
export function tangentFrame(dir){const side=dir.clone().cross(V(0,1,0));if(side.lengthSq()<.01)side.copy(dir).cross(V(1,0,0));side.normalize();return {side,up:side.clone().cross(dir).normalize()};}
export function inSphereHole(h,n,radius,margin=0){
 const dot=n.dot(h.dir);if(dot<=0)return false;
 const distance=Math.sqrt(Math.max(0,1-dot*dot))*radius;
 if(distance>h.r*1.4)return false;
 const {side,up}=h.frame||(h.frame=tangentFrame(h.dir));
 return distance<Math.max(.01,rimRadius(h,Math.atan2(n.dot(up),n.dot(side)))-margin);
}
export function sphereRim(h,radius,extra=0){
 const {side,up}=h.frame||(h.frame=tangentFrame(h.dir)),points=[];
 for(let i=0;i<=96;i++){const t=i/96*Math.PI*2,angle=Math.asin(clamp((rimRadius(h,t)+extra)/radius,0,.99));points.push(h.dir.clone().multiplyScalar(Math.cos(angle)).addScaledVector(side,Math.sin(angle)*Math.cos(t)).addScaledVector(up,Math.sin(angle)*Math.sin(t)));}
 return points;
}
export function inTubeHole(h,t,p,margin=0){
 const a=h.c.clone().sub(t.mid).applyQuaternion(t.inv),b=p.clone().sub(t.mid).applyQuaternion(t.inv);
 const u=Math.atan2(a.z*b.x-a.x*b.z,a.x*b.x+a.z*b.z)*t.r,v=b.y-a.y;
 return Math.hypot(u,v)<Math.max(.01,rimRadius(h,Math.atan2(v,u))-margin);
}

export const chunkEdge=a=>1+.065*Math.sin(a*5)+.035*Math.sin(a*9+.4);
