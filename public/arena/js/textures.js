import {T,V,rng} from './math.js?v=4.0.0';
import {sphereRim,rimRadius,inSphereHole} from './fracture.js?v=4.0.0';
import {paintArenaPanel} from './wall-style.js?v=4.0.0';
export function canvas(w,h=w){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
export function texture(c){const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=2;return t;}
export const paintPanel=paintArenaPanel;
function spherePath(x,c,h,s,extra=0){
 const points=sphereRim(h,s.r,extra).map(p=>[Math.atan2(p.z,-p.x)/(Math.PI*2),Math.acos(Math.max(-1,Math.min(1,p.y)))/Math.PI]);
 let previous=points[0][0];for(const p of points){while(p[0]-previous>.5)p[0]-=1;while(p[0]-previous<-.5)p[0]+=1;previous=p[0];}
 const pole=inSphereHole(h,V(0,h.dir.y>0?1:-1,0),s.r)?(h.dir.y>0?0:1):null;
 for(const shift of [-2,-1,0,1,2]){x.beginPath();points.forEach(([u,v],i)=>{if(i)x.lineTo((u+shift)*c.width,v*c.height);else x.moveTo((u+shift)*c.width,v*c.height);});if(pole!==null){x.lineTo((points.at(-1)[0]+shift)*c.width,pole*c.height);x.lineTo((points[0][0]+shift)*c.width,pole*c.height);}x.closePath();x.fill();}
}
export function spherePaint(base,sphere,map){const c=canvas(base.width,base.height),x=c.getContext('2d');x.drawImage(base,0,0);const holes=[...sphere.holes];for(const h of map.hatches)if(h.sphere===sphere.id&&h.open)holes.push(h);for(const n of map.nests)if(n.sphere===sphere.id&&n.open&&!n.disabled)holes.push({dir:n.dir,r:1.8});
 for(const h of holes){if(h.profile){x.globalCompositeOperation='source-over';x.fillStyle='#322328';spherePath(x,c,h,sphere,.28);x.fillStyle='#b96d42';spherePath(x,c,h,sphere,.10);}x.globalCompositeOperation='destination-out';spherePath(x,c,h,sphere);}return c;
}
export function tubePaint(base,t,map){const c=canvas(base.width,base.height),x=c.getContext('2d');x.drawImage(base,0,0);
 for(const h of map.tubeHoles)if(h.tube===t.id){const p=h.c.clone().sub(t.mid).applyQuaternion(t.inv),u=Math.atan2(p.x,p.z)/(Math.PI*2),v=.5-p.y/t.len;
  const path=(extra)=>{for(const offset of [-1,0,1]){x.beginPath();for(let i=0;i<=96;i++){const a=i/96*Math.PI*2,r=rimRadius(h,a)+extra,px=(u+offset+Math.cos(a)*r/t.r/(Math.PI*2))*c.width,py=(v-Math.sin(a)*r/t.len)*c.height;if(i)x.lineTo(px,py);else x.moveTo(px,py);}x.closePath();x.fill();}};
  if(h.profile){x.globalCompositeOperation='source-over';x.fillStyle='#33282c';path(.24);x.fillStyle='#b96d42';path(.09);}x.globalCompositeOperation='destination-out';path(0);
 }return c;
}
export function lavaTexture(){const c=canvas(512),x=c.getContext('2d'),random=rng(614);x.fillStyle='#241823';x.fillRect(0,0,512,512);for(let j=0;j<80;j++){let px=random()*512,py=random()*512;x.beginPath();x.moveTo(px,py);for(let k=0;k<8;k++){px+=(random()-.5)*90;py+=(random()-.5)*90;x.lineTo(px,py);}x.strokeStyle='#802925';x.lineWidth=7;x.stroke();x.strokeStyle='#f15b20';x.lineWidth=2.5;x.stroke();x.strokeStyle='#ffb84c';x.lineWidth=.8;x.stroke();}const t=texture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(30,30);return t;}
export function labelTexture(title,subtitle='',color='#91eaff',w=512,h=128){const c=canvas(w,h),x=c.getContext('2d');x.fillStyle='rgba(5,13,27,.92)';x.fillRect(0,0,w,h);x.fillStyle=color;x.fillRect(0,0,7,h);x.font='700 32px system-ui';x.fillText(title,24,53);x.fillStyle='#a6bbd1';x.font='18px monospace';x.fillText(subtitle,25,91);return texture(c);}
