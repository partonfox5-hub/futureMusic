import {T,V,clamp} from './math.js?v=5.0.0';
import {STORY} from './data.js?v=5.0.0';
import {canvas,texture} from './textures.js?v=5.0.0';

const holds=[4.312,4.312,4.312,2.156,5.4,5.4,5.4,5.4,5.4];
export const INTRO_BEATS=STORY.slice(0,9).map(([image,title,text],i)=>({image,title,text,hold:holds[i]}));
INTRO_BEATS[5]={...INTRO_BEATS[5],text:INTRO_BEATS[5].text+' Forceful swings also launch red energy slashes.'};
INTRO_BEATS.push({image:'tut_world.jpg',title:'Your holographic visor',hold:7,text:'Your 3D arena map floats at the lower left. Green marks you, red marks the Knight, and gold marks hydra nests. The top-center POWER meter shows your glyphs and attack multiplier. When hull is gone, incoming hits drain power. Zero power ends the broadcast.'});
INTRO_BEATS.push({image:'fm_logo.png',title:'Future Music Collective',hold:5,text:'www.futuremusic.online'});

export class IntroTimeline {
 constructor(){this.active=false;this.index=0;this.elapsed=0;this.total=0;}
 start(){this.active=true;this.index=0;this.elapsed=0;this.total=0;}
 get beat(){return INTRO_BEATS[Math.min(this.index,INTRO_BEATS.length-1)];}
 get typed(){return Math.min(this.beat.text.length,Math.floor(this.elapsed/.016464));}
 next(){if(!this.active)return;this.index++;this.elapsed=0;if(this.index>=INTRO_BEATS.length)this.active=false;}
 skip(){this.active=false;}
 tick(dt){if(!this.active)return;this.elapsed+=dt;this.total+=dt;if(this.elapsed>=Math.max(this.beat.hold,this.beat.text.length*.016464+.7))this.next();}
}
function wrap(x,text,width){const lines=[];let line='';for(const word of text.split(' ')){const next=(line?line+' ':'')+word;if(x.measureText(next).width>width&&line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines;}

export class Intro {
 constructor(onFinish){this.onFinish=onFinish;this.timeline=new IntroTimeline();this.scene=new T.Scene();this.scene.background=new T.Color(0x100a1b);this.root=new T.Group();this.scene.add(this.root);this.images=new Map();this.textures=new Map();this.geometries=new Set();this.materials=new Set();this.hosts=[];this.nextDraw=0;this.lastInput=false;this.built=false;this.redraws=0;this.onCue=null;}
 get active(){return this.timeline.active;}
 material(color,metalness=0){const m=new T.MeshStandardMaterial({color,metalness,roughness:.4});this.materials.add(m);return m;}
 image(name){if(this.textures.has(name))return this.textures.get(name);const img=new Image(),t=new T.Texture();t.colorSpace=T.SRGBColorSpace;this.images.set(name,img);this.textures.set(name,t);img.onload=()=>{t.image=img;t.needsUpdate=true;this.nextDraw=0;};img.src='assets/story/'+name;return t;}
 mesh(parent,geo,mat,p,scale=V(1,1,1)){const o=new T.Mesh(geo,mat);o.position.copy(p);o.scale.copy(scale);parent.add(o);this.geometries.add(geo);this.materials.add(mat);return o;}
 build(){if(this.built)return;this.built=true;const box=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,14,10),capsule=new T.CapsuleGeometry(.5,1,3,8),gold=this.material(0xb79531,.75),dark=this.material(0x181423,.1),skin=this.material(0xe3bb98),black=this.material(0x261526);
  this.scene.add(new T.HemisphereLight(0xbadffe,0x412849,2.3));const light=new T.DirectionalLight(0xffdcad,2.1);light.position.set(-2,4,1);this.scene.add(light);
  this.mesh(this.root,box,dark,V(0,-1.5,-3),V(12,.15,9));this.mesh(this.root,box,dark,V(0,.8,-6.1),V(14,6,.2));this.mesh(this.root,box,gold,V(0,-.98,-3.8),V(4.4,.72,.85));
  const lineMat=new T.MeshBasicMaterial({color:0x7ccbe3,toneMapped:false});for(const y of [-1.1,2.2])this.mesh(this.root,box,lineMat,V(0,y,-5.9),V(9,.022,.02));
  for(let i=0;i<2;i++){const root=new T.Group();root.position.set(i?1.65:-1.65,-1.28,-3.95);this.root.add(root);const suit=this.material(i?0xbe267d:0xd1ab28,.55),pants=this.material(i?0x511732:0x554013,.3);
   this.mesh(root,capsule,suit,V(0,.7,0),V(.36,.37,.25));this.mesh(root,capsule,pants,V(0,.28,0),V(.31,.2,.23));for(const x of [-.11,.11])this.mesh(root,capsule,pants,V(x,-.13,0),V(.1,.25,.12));this.mesh(root,sphere,skin,V(0,1.06,0),V(.085,.11,.085));const head=new T.Group();head.position.set(0,1.31,.04);root.add(head);this.mesh(head,sphere,skin,V(),V(.17,.2,.16));this.mesh(head,new T.PlaneGeometry(.31,.37),new T.MeshBasicMaterial({map:this.image(i?'host_magenta.jpg':'host_gold.jpg'),toneMapped:false}),V(0,.01,.158));const mouth=this.mesh(head,box,black,V(0,-.06,.169),V(.08,.018,.012));const arms=[];
   for(const side of [-1,1]){const arm=new T.Group();arm.position.set(side*.26,.86,0);root.add(arm);this.mesh(arm,capsule,suit,V(side*.02,-.19,0),V(.095,.21,.1));this.mesh(arm,capsule,skin,V(side*.02,-.47,.04),V(.075,.18,.08));this.mesh(arm,sphere,skin,V(side*.02,-.64,.06),V(.068,.085,.063));arms.push(arm);}this.hosts.push({root,head,mouth,arms});
  }
  this.cardCanvas=canvas(1280,900);this.cardTexture=texture(this.cardCanvas);this.card=this.mesh(this.root,new T.PlaneGeometry(1.92,1.35),new T.MeshBasicMaterial({map:this.cardTexture,transparent:true,toneMapped:false}),V(0,.17,-2.85));
  for(const beat of INTRO_BEATS)this.image(beat.image);
 }
 recenter(camera){camera.updateMatrixWorld(true);const pos=camera.getWorldPosition(V()),forward=V(0,0,-1).applyQuaternion(camera.getWorldQuaternion(new T.Quaternion())).setY(0).normalize();if(forward.lengthSq()<.1)forward.set(0,0,-1);this.root.position.copy(pos);this.root.quaternion.setFromUnitVectors(V(0,0,-1),forward);}
 start(camera){this.build();this.timeline.start();this.recenter(camera);this.lastInput=true;this.nextDraw=0;this.draw(false);}
 next(){this.timeline.next();this.nextDraw=0;if(!this.active)this.onFinish();}
 skip(){if(!this.active)return;this.timeline.skip();this.onFinish();}
 cancel(){this.timeline.skip();}
 update(dt,input,xr){if(!this.active)return;const was=this.timeline.index,pressed=!!(input.plasma||input.laser||input.introNext);if(input.pulse){this.skip();return;}if(pressed&&!this.lastInput&&this.timeline.elapsed>.12){this.next();if(!this.active)return;}this.lastInput=pressed;this.timeline.tick(dt);if(!this.active){this.onFinish();return;}if(was!==this.timeline.index){this.nextDraw=0;this.onCue?.();}
  const t=this.timeline.total;for(const [i,h]of this.hosts.entries()){const speaking=this.timeline.index%2===i&&this.timeline.typed<this.timeline.beat.text.length&&this.timeline.index<9;h.mouth.scale.y=speaking?.018+Math.abs(Math.sin(t*16))*.045:.014;h.head.rotation.z=Math.sin(t*1.6+i)*.025;h.arms[0].rotation.set(speaking?-.3+Math.sin(t*7)*.23:Math.sin(t*1.6)*.07,.14,.2);h.arms[1].rotation.set(speaking?-.2+Math.sin(t*6.2+1)*.21:-Math.sin(t*1.6)*.07,-.14,-.2);}
  if(this.timeline.total>=this.nextDraw){this.draw(xr);this.nextDraw=this.timeline.total+1/15;}
 }
 draw(xr){const x=this.cardCanvas.getContext('2d'),beat=this.timeline.beat,index=this.timeline.index,splash=index===INTRO_BEATS.length-1;x.clearRect(0,0,1280,900);x.fillStyle='rgba(4,12,24,.94)';x.fillRect(0,0,1280,900);x.strokeStyle=splash?'#d3b869':'#4a7188';x.lineWidth=3;x.strokeRect(2,2,1276,896);x.fillStyle='#81dfd3';x.font='bold 22px sans-serif';x.fillText(splash?'FUTURE MUSIC COLLECTIVE':`TRANSMUTE LIVE / ${index<4?'INTRO':'TUTORIAL'} ${index+1} / 10`,38,46);
  x.fillStyle='#edf6fb';x.font='bold 37px sans-serif';x.fillText(beat.title,38,99);const img=this.images.get(beat.image),ready=img&&(img.naturalWidth||img.width)>0;if(ready){const scale=Math.min(1198/(img.naturalWidth||img.width),435/(img.naturalHeight||img.height)),w=(img.naturalWidth||img.width)*scale,h=(img.naturalHeight||img.height)*scale;x.drawImage(img,640-w/2,124+(435-h)/2,w,h);}else{x.fillStyle='#183748';x.fillRect(38,125,1204,425);x.fillStyle='#82d8e3';x.font='bold 50px sans-serif';x.textAlign='center';x.fillText(splash?'FUTURE MUSIC':'TRANSMUTE LIVE',640,340);x.textAlign='left';}
  x.font='28px sans-serif';x.fillStyle='#dae8f2';const text=beat.text.slice(0,this.timeline.typed);let y=596;for(const line of wrap(x,text,1190)){x.fillText(line,42,y);y+=36;}
  x.fillStyle='#89b7c6';x.font='23px sans-serif';x.fillText(xr?'TRIGGER: NEXT     B: SKIP':'SPACE / NEXT: CONTINUE     ESC / SKIP: PLAY',42,843);x.fillStyle='#436172';x.fillRect(42,869,1196,5);x.fillStyle='#8af0cf';x.fillRect(42,869,1196*Math.min(1,(index+1)/INTRO_BEATS.length),5);this.cardTexture.needsUpdate=true;this.redraws++;
 }
 dispose(){for(const g of this.geometries)g.dispose();for(const m of this.materials)m.dispose();for(const t of this.textures.values())t.dispose();this.cardTexture?.dispose();this.scene.clear();}
}
