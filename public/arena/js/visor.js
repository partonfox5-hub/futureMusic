import {T,V,clamp} from './math.js?v=5.0.0';
import {canvas,texture} from './textures.js?v=5.0.0';

export function drawPowerGauge(x,p,power){
 const w=x.canvas.width,h=x.canvas.height,ratio=clamp(p.energy/4000,0,1);x.clearRect(0,0,w,h);x.fillStyle='rgba(3,13,24,.80)';x.fillRect(0,0,w,h);x.strokeStyle='#3b687b';x.lineWidth=2;x.strokeRect(1,1,w-2,h-2);
 x.fillStyle=p.energy<200?'#ff715f':'#d4fbed';x.font='bold 44px sans-serif';x.textAlign='left';x.fillText('POWER  '+Math.round(p.energy).toLocaleString('en-US'),28,58);x.textAlign='right';x.font='bold 60px sans-serif';x.fillText('×'+power.toFixed(2),w-28,64);x.textAlign='left';
 const left=28,span=w-56,gap=5,segments=32,sw=(span-gap*(segments-1))/segments;
 for(let i=0;i<segments;i++){const px=left+i*(sw+gap);x.fillStyle='#162e42';x.fillRect(px,88,sw,32);const fill=clamp(ratio*segments-i,0,1);if(fill){x.fillStyle=p.energy<200?'#ff665e':i<8?'#48efbb':i<16?'#41d3fc':i<24?'#a997ff':'#ffa6ed';x.fillRect(px,88,sw*fill,32);}}
 const peak=left+clamp(p.maxEnergy/4000,0,1)*span;x.fillStyle='#f2f9ff';x.fillRect(peak-1,82,2,45);x.font='24px monospace';x.fillStyle='#92bacb';for(let i=0;i<=4;i++){x.textAlign=i===0?'left':i===4?'right':'center';x.fillText(i+'×',left+span*i/4,155);}x.textAlign='left';x.fillStyle=p.hearts<=0?'#ff9079':'#83a6b9';x.font='22px sans-serif';x.fillText(p.hearts<=0?'HULL LOST · INCOMING HITS DRAIN POWER':'WHITE MARKER: RECOVERABLE PEAK',28,194);x.textAlign='right';x.fillText('PEAK '+Math.round(p.maxEnergy).toLocaleString('en-US'),w-28,194);x.textAlign='left';
}

export class Visor {
 constructor(camera){this.camera=camera;this.root=new T.Group();this.root.name='HolographicVisor';camera.add(this.root);this.mapRoot=new T.Group();this.mapRoot.name='LowerLeftHolographicMap';this.root.add(this.mapRoot);this.volume=new T.Group();this.volume.rotation.set(.384,.663,0);this.mapRoot.add(this.volume);this.scale=.00155;this.map=null;this.resources=[];this.matrix=new T.Matrix4();this.white=new T.Quaternion();this.lastPower=-Infinity;this.lastMarkers=-Infinity;this.uploads=0;
  const mat=(color,opacity,wireframe=false)=>new T.MeshBasicMaterial({color,transparent:true,opacity,wireframe,depthTest:false,depthWrite:false,toneMapped:false,blending:T.AdditiveBlending});
  this.sphereGeometry=new T.SphereGeometry(1,12,8);this.cylinderGeometry=new T.CylinderGeometry(1,1,1,6);this.boxGeometry=new T.BoxGeometry(1,1,1);this.markerGeometry=new T.SphereGeometry(1,8,6);
  const batch=(geo,capacity,material)=>{const b=new T.InstancedMesh(geo,material,capacity);b.frustumCulled=false;b.count=0;b.renderOrder=92;this.volume.add(b);this.resources.push(b);return b;};
  this.shells=batch(this.sphereGeometry,8,mat(0xffcc71,.12));this.wires=batch(this.sphereGeometry,8,mat(0xffffff,.6,true));this.tunnels=batch(this.cylinderGeometry,15,mat(0x79bddc,.5));this.rooms=batch(this.boxGeometry,4,mat(0x6ccde6,.45,true));this.markers=batch(this.markerGeometry,16,mat(0xffffff,.95));
  this.playerMarker=new T.Mesh(new T.ConeGeometry(.009,.03,6),mat(0x6affb5,1));this.playerMarker.renderOrder=94;this.volume.add(this.playerMarker);
  this.labelCanvas=canvas(640,120);const lx=this.labelCanvas.getContext('2d');lx.fillStyle='rgba(3,15,27,.6)';lx.fillRect(0,0,640,120);lx.fillStyle='#80d7e7';lx.font='bold 32px sans-serif';lx.fillText('HOLOGRAPHIC NETWORK',17,38);lx.font='24px sans-serif';lx.fillStyle='#70ffb5';lx.fillText('▲ YOU',17,80);lx.fillStyle='#ff657f';lx.fillText('● KNIGHT',155,80);lx.fillStyle='#ffcb68';lx.fillText('● HYDRA',357,80);
  this.labelTexture=texture(this.labelCanvas);this.label=new T.Mesh(new T.PlaneGeometry(.55,.103),new T.MeshBasicMaterial({map:this.labelTexture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));this.label.position.set(0,-.24,.05);this.label.renderOrder=93;this.mapRoot.add(this.label);
  this.powerCanvas=canvas(1024,220);this.powerTexture=texture(this.powerCanvas);this.powerPlane=new T.Mesh(new T.PlaneGeometry(.98,.211),new T.MeshBasicMaterial({map:this.powerTexture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));this.powerPlane.name='TopCenterPowerGauge';this.powerPlane.renderOrder=95;this.root.add(this.powerPlane);
 }
 place(batch,i,p,scale,color=null,q=this.white){this.matrix.compose(p,q,scale);batch.setMatrixAt(i,this.matrix);if(color!==null)batch.setColorAt(i,new T.Color(color));}
 build(map){this.map=map;const s=this.scale;for(const [i,n]of map.spheres.entries()){const p=n.c.clone().multiplyScalar(s),size=V(n.r*s,n.r*s,n.r*s);this.place(this.shells,i,p,size);this.place(this.wires,i,p,size,0xe2b967);}this.shells.count=this.wires.count=8;
  for(const [i,t]of map.tubes.entries())this.place(this.tunnels,i,t.mid.clone().multiplyScalar(s),V(t.r*s,t.len*s,t.r*s),null,t.q);this.tunnels.count=map.tubes.length;
  for(const [i,r]of map.rooms.entries())this.place(this.rooms,i,r.c.clone().multiplyScalar(s),V(r.size*s,r.size*s,r.size*s),null,r.q);this.rooms.count=map.rooms.length;
  for(const b of [this.shells,this.wires,this.tunnels,this.rooms]){b.instanceMatrix.needsUpdate=true;if(b.instanceColor)b.instanceColor.needsUpdate=true;}this.lastPower=this.lastMarkers=-Infinity;
 }
 update(g,show,xr,forward){this.root.visible=show;if(!show)return;if(this.map!==g.map)this.build(g.map);
  if(xr){this.mapRoot.position.set(-.68,-.40,-1.4);this.powerPlane.position.set(0,.46,-1.45);}else{const half=Math.tan(this.camera.fov*Math.PI/360);this.mapRoot.position.set(-half*1.4*this.camera.aspect+.33,-half*1.4+.34,-1.4);this.powerPlane.position.set(0,half*1.45-.14,-1.45);}
  this.playerMarker.position.copy(g.player.p).multiplyScalar(this.scale);this.playerMarker.quaternion.setFromUnitVectors(V(0,1,0),forward.clone().normalize());
  if(g.time-this.lastMarkers>=.1||g.time<this.lastMarkers){this.lastMarkers=g.time;let count=0;for(const e of g.entities)if(e.alive&&e.type==='knight'&&count<16)this.place(this.markers,count++,e.p.clone().multiplyScalar(this.scale),V(.009,.009,.009),e.white?0xffe0ed:0xff406e);for(const n of g.map.nests)if(!n.disabled&&count<16)this.place(this.markers,count++,n.pos.clone().multiplyScalar(this.scale),V(.006,.006,.006),0xffc768);this.markers.count=count;this.markers.instanceMatrix.needsUpdate=true;if(this.markers.instanceColor)this.markers.instanceColor.needsUpdate=true;
   const sector=g.map.sector(g.player.p);for(let i=0;i<8;i++)this.wires.setColorAt(i,new T.Color(i===sector?0x81ffe0:0xdfb56f));this.wires.instanceColor.needsUpdate=true;
  }
  if(g.time-this.lastPower>=.1||g.time<this.lastPower){this.lastPower=g.time;drawPowerGauge(this.powerCanvas.getContext('2d'),g.player,g.power);this.powerTexture.needsUpdate=true;this.uploads++;}
 }
 dispose(){this.camera.remove(this.root);for(const b of this.resources){b.dispose();b.material.dispose();}for(const geo of [this.sphereGeometry,this.cylinderGeometry,this.boxGeometry,this.markerGeometry,this.playerMarker.geometry,this.label.geometry,this.powerPlane.geometry])geo.dispose();for(const m of [this.playerMarker.material,this.label.material,this.powerPlane.material])m.dispose();this.labelTexture.dispose();this.powerTexture.dispose();}
}
