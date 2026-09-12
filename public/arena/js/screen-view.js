import {T,V} from './math.js?v=5.0.0';
import {canvas,texture} from './textures.js?v=5.0.0';
import {screenFrame} from './screens.js?v=5.0.0';

function person(x,px,py,time,index,wave,flee,scale=1){
 x.save();x.translate(px,py);x.scale(scale,scale);const bounce=flee?Math.sin(time*16+index)*1.8:0;x.translate(0,bounce);
 x.strokeStyle=['#7dd5d8','#d27eaa','#dfc58e','#b1aae5'][index%4];x.lineWidth=3.4;x.lineCap='round';
 x.beginPath();x.moveTo(0,-12);x.lineTo(0,0);x.moveTo(0,-9);x.lineTo(-6,-4);
 if(wave){x.moveTo(0,-9);x.lineTo(6,-15);x.lineTo(9+Math.sin(time*12+index)*3,-23);}else{x.moveTo(0,-9);x.lineTo(6,flee?-16:-4);}x.stroke();
 x.strokeStyle='#263245';x.lineWidth=2.4;const stride=flee?Math.sin(time*16+index)*6:1.5;x.beginPath();x.moveTo(0,0);x.lineTo(-4-stride,9);x.moveTo(0,0);x.lineTo(4+stride,9);x.stroke();
 x.fillStyle=['#d6b99b','#956b51','#edcfac'][index%3];x.beginPath();x.arc(0,-17,4.3,0,Math.PI*2);x.fill();x.fillStyle='#222131';x.fillRect(-4,-21,8,2);x.fillRect(-2,-17,1,1);x.fillRect(1,-17,1,1);x.restore();
}
export function drawScreen(x,kind,frame,time){
 const width=224,height=128,wave=frame===1,escape=frame>=2&&frame<=6?(frame-2)/4:0,panic=frame>=2&&frame<=6;
 const sky=x.createLinearGradient(0,0,0,height);sky.addColorStop(0,['#536c92','#426d9c','#5b4f74','#355b5c','#352342'][kind]);sky.addColorStop(1,['#b19999','#bed7d8','#b58e96','#b0b28f','#72667c'][kind]);x.fillStyle=sky;x.fillRect(0,0,width,height);
 // Architecture remains when residents and vehicles flee off-screen.
 if(kind===0||kind===2){for(let i=0;i<12;i++){const h=18+(i*29)%49;x.fillStyle=i%2?'#364759':'#536070';x.fillRect(i*21-8,86-h,18,h);x.fillStyle='#d1b781';for(let y=89-h;y<82;y+=8)for(let a=0;a<2;a++)x.fillRect(i*21-5+a*7,y,3,3);}x.fillStyle='#373943';x.fillRect(0,87,width,41);x.strokeStyle='#aa9d81';x.lineWidth=1;for(let i=0;i<9;i++){x.beginPath();x.moveTo(i*30,110);x.lineTo(i*30+15,110);x.stroke();}}
 else if(kind===1){x.fillStyle='#244d73';x.fillRect(0,66,width,62);for(let y=68;y<128;y+=7){x.strokeStyle=y%2?'#517f99':'#6b8b9d';x.beginPath();for(let i=0;i<=28;i++){const px=i*8,py=y+Math.sin(i+time*2)*1.3;if(i)x.lineTo(px,py);else x.moveTo(px,py);}x.stroke();}x.fillStyle='#6b665f';x.fillRect(0,61,224,7);for(let i=0;i<11;i++){x.fillStyle='#857d70';x.fillRect(i*22,53,3,12);}}
 else if(kind===3){x.fillStyle='#526e50';x.fillRect(0,85,width,43);for(let i=0;i<10;i++){x.fillStyle='#43533a';x.fillRect(i*25,28,4,70);x.fillStyle=i%2?'#365944':'#3e674d';x.beginPath();x.moveTo(i*25-17,69);x.lineTo(i*25+2,11+i%3*8);x.lineTo(i*25+21,69);x.fill();}x.fillStyle='#8b9272';x.beginPath();x.moveTo(70,128);x.lineTo(110,83);x.lineTo(130,83);x.lineTo(169,128);x.fill();}
 else{for(let row=0;row<4;row++){x.fillStyle=row%2?'#292438':'#41334e';x.fillRect(0,53+row*19,width,18);}x.fillStyle='#cebcd3';x.fillRect(0,42,width,2);}
 if(frame!==6&&frame!==7){
  for(let i=0;i<5;i++){
   const base=22+i*43+Math.sin(time*.7+i)*3,target=base<112?-65:width+65,px=base+(target-base)*escape,py=kind===1?87+i%2*20:kind===4?77+i%2*30:103+i%2*13;
   if(kind===0){x.fillStyle=['#ae414b','#a3b4c0','#d5a348'][i%3];x.beginPath();x.moveTo(px-17,py);x.lineTo(px-12,py-6);x.lineTo(px-6,py-14);x.lineTo(px+8,py-14);x.lineTo(px+14,py-6);x.lineTo(px+18,py-4);x.lineTo(px+18,py+2);x.lineTo(px-17,py+2);x.closePath();x.fill();x.fillStyle='#a7c5d1';x.fillRect(px-5,py-12,10,5);x.fillStyle='#182230';for(const wheel of [-10,11]){x.beginPath();x.arc(px+wheel,py+2,3.4,0,6.283);x.fill();x.fillStyle='#6d7683';x.fillRect(px+wheel-1,py+1,2,2);x.fillStyle='#182230';}x.fillStyle=wave&&Math.sin(time*14)>0?'#fff7b4':'#b8c5c1';x.fillRect(px+16,py-4,3,3);if(wave)person(x,px+3,py-4,time,i,true,false,.45);}
   else if(kind===1){x.fillStyle=['#dde2d6','#a8b9c5','#b49c75'][i%3];x.beginPath();x.moveTo(px-17,py);x.lineTo(px+20,py);x.lineTo(px+12,py+7);x.lineTo(px-12,py+7);x.fill();x.fillStyle='#d5d5bd';x.beginPath();x.moveTo(px,py-31);x.lineTo(px-13,py-3);x.lineTo(px,py-3);x.fill();x.strokeStyle='#817962';x.lineWidth=1;x.beginPath();x.moveTo(px,py-32);x.lineTo(px,py);x.stroke();person(x,px+8,py,time,i,wave,panic,.46);}
   else person(x,px,py,time,i,wave,panic,kind===4?1:.74);
  }
  if(kind===0||kind===1)for(let i=0;i<3;i++){const px=45+i*64,target=px<112?-35:260;person(x,px+(target-px)*escape,kind===0?82:57,time,i+2,wave,panic,.6);}
 }
 if(frame===7){x.fillStyle='rgba(5,8,13,.4)';x.fillRect(0,0,width,height);x.strokeStyle='#d0dae0';x.lineWidth=1;x.beginPath();for(let i=0;i<11;i++){x.moveTo(119,65);x.lineTo(112+Math.cos(i*2.4)*155,64+Math.sin(i*2.4)*88);}x.stroke();}
 x.fillStyle='rgba(4,8,15,.68)';x.fillRect(0,0,width,18);x.fillStyle=panic?'#ffc4a2':'#d7eded';x.font='bold 9px monospace';x.fillText(frame===7?'SIGNAL DAMAGED':wave?'HELLO, PILOT!':panic?frame===6?'TAKING COVER':'INCOMING!':['TRAFFIC • LIVE','HARBOR • LIVE','CITY • LIVE','FOREST • LIVE','AUDIENCE • LIVE'][kind],6,12);
 x.fillStyle='rgba(4,8,15,.10)';for(let y=20;y<height;y+=4)x.fillRect(0,y,width,1);
}

export class ScreenView{
 constructor(scene){
  this.scene=scene;this.c=canvas(1024,640);this.x=this.c.getContext('2d');this.t=texture(this.c);this.t.generateMipmaps=false;this.t.minFilter=T.LinearFilter;this.t.anisotropy=1;this.last=-1;this.uploads=0;this.drawn=new Map();
  const geo=new T.PlaneGeometry(2.4,1.4);geo.setAttribute('screenTile',new T.InstancedBufferAttribute(new Float32Array(256),1).setUsage(T.DynamicDrawUsage));const mat=new T.MeshBasicMaterial({map:this.t,toneMapped:false});
  mat.onBeforeCompile=shader=>{shader.vertexShader='attribute float screenTile;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>',`#include <uv_vertex>
   vMapUv=vec2((mod(screenTile,8.0)+.02+uv.x*.96)/8.0,1.0-(floor(screenTile/8.0)+.02+(1.0-uv.y)*.96)/5.0);`);};mat.customProgramCacheKey=()=> 'netknight-reactive-screen-v4';
  this.mesh=new T.InstancedMesh(geo,mat,256);this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);this.mesh.frustumCulled=false;this.mesh.count=0;scene.add(this.mesh);this.matrix=new T.Matrix4();this.slots=new Set();
 }
 update(g,visible,quality='balanced'){
  let count=0;this.slots.clear();const tile=this.mesh.geometry.attributes.screenTile;
  for(const e of visible){if(e.type!=='window'||count>=256)continue;const frame=screenFrame(e),slot=e.kind*8+frame;this.slots.add(slot);
   this.matrix.compose(e.p.clone().add(V(0,0,.095).applyQuaternion(e.q)),e.q,V(e.scale,e.scale,e.scale));this.mesh.setMatrixAt(count,this.matrix);tile.setX(count++,slot);
  }
  this.mesh.count=count;this.mesh.visible=count>0;if(!count)return;this.mesh.instanceMatrix.needsUpdate=true;tile.needsUpdate=true;
  const interval=quality==='performance'?.18:.12,time=Math.floor(g.time/interval)*interval;let dirty=false;
  for(const slot of this.slots){if(this.drawn.get(slot)===time)continue;this.drawn.set(slot,time);const kind=Math.floor(slot/8),frame=slot%8;this.x.save();this.x.translate(frame*128,kind*128);this.x.beginPath();this.x.rect(0,0,128,128);this.x.clip();this.x.scale(128/224,1);drawScreen(this.x,kind,frame,time);this.x.restore();dirty=true;}
  if(dirty){this.t.needsUpdate=true;this.uploads++;}this.last=time;
 }
 dispose(){this.scene.remove(this.mesh);this.mesh.geometry.dispose();this.mesh.material.dispose();this.mesh.dispose();this.t.dispose();}
}
