import * as T from 'three';
import {tagMovable} from './mira-v2-furniture.js?v=15.3';
import {unlockSfx,audioContext,sfxMaster} from './mira-v2-sfx.js?v=15.3';

function midi(n){return 440*Math.pow(2,(n-69)/12);}
function durToken(s){let d=4/Number(s.replace('.',''));if(s.endsWith('.'))d*=1.5;return d;}
function compile(bpm,src){
 const acc={c:0,d:2,e:4,f:5,g:7,a:9,b:11},spb=60/bpm,notes=[];let beat=0;
 for(const tok of String(src).split(/\s+/).filter(t=>t&&t!=='|')){
  if(tok[0]==='r'){beat+=durToken(tok.slice(1));continue;}
  const parts=tok.split('+');
  let step=0;
  for(const p of parts){
   const m=p.match(/^([a-g])([s#b]?)(\d)-(\d\.?)$/i);if(!m)continue;
   let n=acc[m[1].toLowerCase()]+(Number(m[3])+1)*12;
   if(m[2]==='s'||m[2]==='#')n++;else if(m[2]==='b')n--;
   const d=durToken(m[4]);notes.push({t:beat*spb,d:d*spb*.92,n,v:.7});step=Math.max(step,d);
  }
  beat+=step;
 }
 return notes;
}

export const SONGS=[
 {id:'elise',name:'Für Elise',composer:'Beethoven',bpm:114,src:`
  e5-8 ds5-8 e5-8 ds5-8 e5-8 b4-8 d5-8 c5-8 a4-4 r8
  c4-8 e4-8 a4-8 b4-4 r8 e4-8 gs4-8 b4-8 c5-4 r8
  e5-8 ds5-8 e5-8 ds5-8 e5-8 b4-8 d5-8 c5-8 a4-4 r8
  c4-8 e4-8 a4-8 b4-4 r8 e4-8 c5-8 b4-8 a4-2
  e5-8 ds5-8 e5-8 ds5-8 e5-8 b4-8 d5-8 c5-8 a4-4 r8
  c4-8 e4-8 a4-8 b4-4 r8 e4-8 gs4-8 b4-8 c5-4 r8
  e5-8 ds5-8 e5-8 ds5-8 e5-8 b4-8 d5-8 c5-8 a4-4 r8
  c4-8 e4-8 a4-8 b4-4 r8 e4-8 c5-8 b4-8 a4-2
  b4-8 c5-8 d5-8 e5-4 g4-8 f5-8 e5-8 d5-4 f4-8 e5-8 d5-8 c5-4 e4-8 d5-8 c5-8 b4-4
  e5-8 ds5-8 e5-8 ds5-8 e5-8 b4-8 d5-8 c5-8 a4-2`},
 {id:'prelude',name:'Prelude in C',composer:'Bach',bpm:72,src:`
  c4-16 e4-16 g4-16 c5-16 e5-16 g4-16 c5-16 e5-16 c4-16 e4-16 g4-16 c5-16 e5-16 g4-16 c5-16 e5-16
  c4-16 d4-16 a4-16 d5-16 f5-16 a4-16 d5-16 f5-16 c4-16 d4-16 a4-16 d5-16 f5-16 a4-16 d5-16 f5-16
  b3-16 d4-16 g4-16 d5-16 f5-16 g4-16 d5-16 f5-16 b3-16 d4-16 g4-16 d5-16 f5-16 g4-16 d5-16 f5-16
  c4-16 e4-16 g4-16 c5-16 e5-16 g4-16 c5-16 e5-16 c4-16 e4-16 g4-16 c5-16 e5-16 g4-16 c5-16 e5-16
  c4-16 e4-16 a4-16 e5-16 a5-16 a4-16 e5-16 a5-16 c4-16 e4-16 a4-16 e5-16 a5-16 a4-16 e5-16 a5-16
  c4-16 d4-16 fs4-16 a4-16 d5-16 fs4-16 a4-16 d5-16 c4-16 d4-16 fs4-16 a4-16 d5-16 fs4-16 a4-16 d5-16
  b3-16 d4-16 g4-16 d5-16 g5-16 g4-16 d5-16 g5-16 b3-16 d4-16 g4-16 d5-16 g5-16 g4-16 d5-16 g5-16
  b3-16 c4-16 e4-16 g4-16 c5-16 e4-16 g4-16 c5-16 b3-16 c4-16 e4-16 g4-16 c5-16 e4-16 g4-16 c5-16
  a3-16 c4-16 e4-16 g4-16 c5-16 e4-16 g4-16 c5-16 a3-16 c4-16 e4-16 g4-16 c5-16 e4-16 g4-16 c5-16
  d3-16 a3-16 d4-16 fs4-16 c5-16 d4-16 fs4-16 c5-16 d3-16 a3-16 d4-16 fs4-16 c5-16 d4-16 fs4-16 c5-16
  g3-16 b3-16 d4-16 g4-16 b4-16 d4-16 g4-16 b4-16 g3-16 b3-16 d4-16 g4-16 b4-16 d4-16 g4-16 b4-16
  g3-16 as3-16 e4-16 g4-16 cs5-16 e4-16 g4-16 cs5-16 g3-16 as3-16 e4-16 g4-16 cs5-16 e4-16 g4-16 cs5-16
  f3-16 a3-16 d4-16 a4-16 d5-16 d4-16 a4-16 d5-16 f3-16 a3-16 d4-16 a4-16 d5-16 d4-16 a4-16 d5-16
  f3-16 gs3-16 d4-16 f4-16 b4-16 d4-16 f4-16 b4-16 f3-16 gs3-16 d4-16 f4-16 b4-16 d4-16 f4-16 b4-16
  e3-16 g3-16 c4-16 g4-16 c5-16 c4-16 g4-16 c5-16 e3-16 g3-16 c4-16 g4-16 c5-16 c4-16 g4-16 c5-16
  e3-16 f3-16 a3-16 c4-16 f4-16 a3-16 c4-16 f4-16 e3-16 f3-16 a3-16 c4-16 f4-16 a3-16 c4-16 f4-16
  d3-16 f3-16 a3-16 c4-16 f4-16 a3-16 c4-16 f4-16 d3-16 f3-16 a3-16 c4-16 f4-16 a3-16 c4-16 f4-16
  g2-16 d3-16 g3-16 b3-16 f4-16 g3-16 b3-16 f4-16 g2-16 d3-16 g3-16 b3-16 f4-16 g3-16 b3-16 f4-16
  c3-16 e3-16 g3-16 c4-16 e4-16 g3-16 c4-16 e4-16 c3-16 e3-16 g3-16 c4-16 e4-16 g3-16 c4-16 e4-16
  c3-16 g3-16 as3-16 c4-16 e4-16 as3-16 c4-16 e4-16 c3-16 g3-16 as3-16 c4-16 e4-16 as3-16 c4-16 e4-16
  f2-16 f3-16 a3-16 c4-16 e4-16 a3-16 c4-16 e4-16 f2-16 f3-16 a3-16 c4-16 e4-16 a3-16 c4-16 e4-16
  fs2-16 c3-16 a3-16 c4-16 ds4-16 a3-16 c4-16 ds4-16 fs2-16 c3-16 a3-16 c4-16 ds4-16 a3-16 c4-16 ds4-16
  gs2-16 f3-16 b3-16 f4-16 d4-16 b3-16 f4-16 d5-16 g2-16 f3-16 g3-16 b3-16 d4-16 f4-16 d4-16 b3-16
  g2-16 e3-16 g3-16 c4-16 e4-16 g4-16 e4-16 c4-16 g2-16 d3-16 g3-16 c4-16 f4-16 g4-16 f4-16 d4-16
  g2-16 d3-16 g3-16 b3-16 d4-16 f4-16 d4-16 b3-16 g2-16 e3-16 g3-16 c4-16 e4-16 g4-16 e4-16 c4-16
  c3-16 c4-16 g3-16 as3-16 c4-16 e4-16 g4-16 c5-16 c3-8 r8 c2-2`},
 {id:'joy',name:'Ode to Joy',composer:'Beethoven',bpm:112,src:`
  e4-4 e4-4 f4-4 g4-4 g4-4 f4-4 e4-4 d4-4 c4-4 c4-4 d4-4 e4-4 e4-4. d4-8 d4-2
  e4-4 e4-4 f4-4 g4-4 g4-4 f4-4 e4-4 d4-4 c4-4 c4-4 d4-4 e4-4 d4-4. c4-8 c4-2
  d4-4 d4-4 e4-4 c4-4 d4-4 e4-8 f4-8 e4-4 c4-4 d4-4 e4-8 f4-8 e4-4 d4-4 c4-4 d4-4 g3-2
  e4-4 e4-4 f4-4 g4-4 g4-4 f4-4 e4-4 d4-4 c4-4 c4-4 d4-4 e4-4 d4-4. c4-8 c4-2
  e4-4 e4-4 f4-4 g4-4 g4-4 f4-4 e4-4 d4-4 c4-4 c4-4 d4-4 e4-4 e4-4. d4-8 d4-2
  e4-4 e4-4 f4-4 g4-4 g4-4 f4-4 e4-4 d4-4 c4-4 c4-4 d4-4 e4-4 d4-4. c4-8 c4-2`},
 {id:'minuet',name:'Minuet in G',composer:'Petzold',bpm:108,src:`
  d5-4 g4-8 a4-8 b4-8 c5-8 d5-4 g4-4 g4-4
  e5-4 c5-8 d5-8 e5-8 fs5-8 g5-4 g4-4 g4-4
  c5-4 d5-8 c5-8 b4-8 a4-8 b4-4 c5-8 b4-8 a4-8 g4-8
  fs4-4 g4-8 a4-8 b4-8 g4-8 a4-2
  d5-4 g4-8 a4-8 b4-8 c5-8 d5-4 g4-4 g4-4
  e5-4 c5-8 d5-8 e5-8 fs5-8 g5-4 g4-4 g4-4
  c5-4 d5-8 c5-8 b4-8 a4-8 b4-4 c5-8 b4-8 a4-8 g4-8
  a4-4 b4-8 a4-8 g4-8 fs4-8 g4-2
  b4-4 b4-8 a4-8 b4-8 c5-8 a4-4 a4-8 g4-8 a4-8 b4-8
  g4-4 g4-8 fs4-8 g4-8 a4-8 fs4-4 d4-4 d4-4
  e4-4 e4-8 fs4-8 g4-8 a4-8 b4-4 a4-4 g4-4
  fs4-4 e4-4 d4-2
  d5-4 g4-8 a4-8 b4-8 c5-8 d5-4 g4-4 g4-4
  e5-4 c5-8 d5-8 e5-8 fs5-8 g5-4 g4-4 g4-4
  c5-4 d5-8 c5-8 b4-8 a4-8 b4-4 c5-8 b4-8 a4-8 g4-8
  a4-4 d4-4 g4-2`},
 {id:'twinkle',name:'Twinkle Twinkle',composer:'French melody',bpm:100,src:`
  c4-4 c4-4 g4-4 g4-4 a4-4 a4-4 g4-2
  f4-4 f4-4 e4-4 e4-4 d4-4 d4-4 c4-2
  g4-4 g4-4 f4-4 f4-4 e4-4 e4-4 d4-2
  g4-4 g4-4 f4-4 f4-4 e4-4 e4-4 d4-2
  c4-4 c4-4 g4-4 g4-4 a4-4 a4-4 g4-2
  f4-4 f4-4 e4-4 e4-4 d4-4 d4-4 c4-2
  c4-4 e4-4 g4-4 c5-4 a4-4 a4-4 g4-2
  f4-4 f4-4 e4-4 e4-4 d4-4 g3-4 c4-2
  c4-4 c4-4 g4-4 g4-4 a4-4 a4-4 g4-2
  f4-4 f4-4 e4-4 e4-4 d4-4 d4-4 c4-2`}
];
for(const s of SONGS)s.notes=compile(s.bpm,s.src);

function plaque(title,sub){
 const c=document.createElement('canvas');c.width=512;c.height=160;
 const g=c.getContext('2d');g.fillStyle='#1a120c';g.fillRect(0,0,512,160);
 g.fillStyle='#e8d7b0';g.font='700 36px Georgia,serif';g.textAlign='center';g.fillText(title,256,70);
 g.font='16px Georgia,serif';g.fillStyle='#c4b089';g.fillText(sub,256,112);
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.needsUpdate=true;return map;
}

export function installPiano(world,origin=new T.Vector3(-5.85,0,.35),yaw=Math.PI/2){
 const root=new T.Group();root.position.copy(origin);root.rotation.y=yaw;world.root.add(root);
 const wood=world.mat(0x3c2416,.78),black=world.mat(0x111111,.4),ivory=world.mat(0xf3efe4,.55);
 const body=new T.Mesh(new T.BoxGeometry(1.48,.62,.58),wood);body.position.set(0,.56,-.04);root.add(body);
 const rim=new T.Mesh(new T.BoxGeometry(1.52,.08,.62),wood);rim.position.set(0,.90,-.04);root.add(rim);
 const fall=new T.Mesh(new T.BoxGeometry(1.46,.04,.16),wood);fall.position.set(0,.95,.28);root.add(fall);
 const keys=new T.Group();keys.position.set(-.66,.91,.22);root.add(keys);
 const whites=['C','D','E','F','G','A','B'];
 for(let i=0;i<14;i++){
  const k=new T.Mesh(new T.BoxGeometry(.088,.028,.28),ivory);
  k.position.set(i*.094,0,0);keys.add(k);k.userData.pianoKey=true;
 }
 for(const i of [0,1,3,4,5,7,8,10,11,12]){
  const k=new T.Mesh(new T.BoxGeometry(.056,.018,.17),black);
  k.position.set(i*.094+.048,.018,-.04);keys.add(k);k.userData.pianoKey=true;
 }
 const stand=new T.Mesh(new T.BoxGeometry(.42,.28,.02),new T.MeshStandardMaterial({map:plaque(SONGS[0].name,SONGS[0].composer),roughness:.86}));
 stand.position.set(0,1.18,.02);root.add(stand);
 const bench=new T.Group();bench.position.set(0,0,.62);root.add(bench);
 const pad=new T.Mesh(new T.BoxGeometry(.46,.07,.28),world.mat(0x5a3a28,.9));pad.position.y=.46;bench.add(pad);
 for(const s of [-1,1]){const leg=new T.Mesh(new T.BoxGeometry(.05,.46,.05),wood);leg.position.set(s*.16,.23,.08);bench.add(leg);const b=leg.clone();b.position.z=-.08;bench.add(b);}
 root.traverse(m=>{if(m.isMesh){m.castShadow=m.receiveShadow=true;world.pickables.push(m);world.fractures.register(m,'wood');}});
 world.obstacle(origin.x,origin.z,1.2,.8,0,.95,body);
 const seat={group:bench,position:bench.localToWorld(new T.Vector3(0,.48,0)),yaw:yaw+Math.PI,approach:root.localToWorld(new T.Vector3(0,0,1.15)),occupant:null,piano:true,sitDuration:34,keyboard:keys};
 bench.traverse(m=>{if(m.isMesh)m.userData.seat=seat;});
 world.seats.push(seat);tagMovable(world,bench,'Chair');
 const api={
  root,keys,stand,seat,index:0,playing:null,started:0,panner:null,listener:null,
  songs:SONGS,
  setSong(i){this.index=((i%SONGS.length)+SONGS.length)%SONGS.length;const s=SONGS[this.index];if(stand.material.map)stand.material.map.dispose();stand.material.map=plaque(s.name,s.composer);stand.material.needsUpdate=true;},
  ensureAudio(){
   const c=audioContext();if(!c)return null;
   if(!this.panner){
    const p=c.createPanner();p.panningModel='HRTF';p.distanceModel='inverse';p.refDistance=2.2;p.maxDistance=26;p.rolloffFactor=1.15;p.coneInnerAngle=360;
    p.connect(sfxMaster()||c.destination);
    this.panner=p;this.listener=c.listener;
   }
   return c;
  },
  play(id){
   unlockSfx();const c=this.ensureAudio();if(!c)return;
   this.stop();
   if(id!=null){const i=SONGS.findIndex(s=>s.id===id);if(i>=0)this.setSong(i);}
   const song=SONGS[this.index],now=c.currentTime;
   this.playing={song,end:now+song.notes[song.notes.length-1].t+song.notes[song.notes.length-1].d+0.4,actor:null};
   this.started=now;
   for(const n of song.notes)this.note(c,now+n.t,n);
  },
  note(c,t,n){
   const o=c.createOscillator(),o2=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter();
   o.type='triangle';o2.type='sine';o.frequency.value=midi(n.n);o2.frequency.value=midi(n.n)*2;
   f.type='lowpass';f.frequency.value=1800+n.n*12;
   g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.12*n.v,t+.012);g.gain.exponentialRampToValueAtTime(.0008,t+n.d+.18);
   o.connect(g);o2.connect(g);g.connect(f);f.connect(this.panner);
   o.start(t);o2.start(t);o.stop(t+n.d+.22);o2.stop(t+n.d+.22);
  },
  stop(){this.playing=null;const c=audioContext();if(!c||!this.panner)return;const g=c.createGain();},
  ensurePlaying(actor){
   if(this.playing?.actor===actor)return;
   this.play();if(this.playing)this.playing.actor=actor;
  },
  stopIf(actor){if(this.playing?.actor===actor)this.stop();},
  keepPlaying(actor){if(!this.playing||audioContext()?.currentTime>this.playing.end){this.setSong(this.index+1);this.ensurePlaying(actor);}},
  click(ray,props){
   const hit=props.hit(ray,6,false);if(!hit)return false;
   let o=hit.object,on=false;while(o){if(o===root||o===bench){on=true;break;}o=o.parent;}
   if(!on)return false;
   if(hit.object.userData.seat)return false;
   if(hit.object===stand||hit.object.userData.pianoKey){
    if(this.playing&&!this.playing.actor)this.stop();else this.play(hit.object===stand?SONGS[(this.index+1)%SONGS.length].id:undefined);
    props.status=this.playing?'Piano · '+this.playing.song.name:'Piano stopped';
    return true;
   }
   this.play();props.status='Piano · '+SONGS[this.index].name;return true;
  },
  tick(camera){
   const c=audioContext();if(!c||!this.panner)return;
   root.updateWorldMatrix(true,true);
   const p=root.getWorldPosition(new T.Vector3());
   const t=c.currentTime;
   if(this.panner.positionX){this.panner.positionX.setValueAtTime(p.x,t);this.panner.positionY.setValueAtTime(p.y+.9,t);this.panner.positionZ.setValueAtTime(p.z,t);}
   else this.panner.setPosition(p.x,p.y+.9,p.z);
   const lis=c.listener,cam=camera;if(!cam||!lis)return;
   const wp=cam.getWorldPosition(new T.Vector3()),dir=new T.Vector3(0,0,-1).applyQuaternion(cam.getWorldQuaternion(new T.Quaternion())),up=new T.Vector3(0,1,0).applyQuaternion(cam.getWorldQuaternion(new T.Quaternion()));
   if(lis.positionX){lis.positionX.setValueAtTime(wp.x,t);lis.positionY.setValueAtTime(wp.y,t);lis.positionZ.setValueAtTime(wp.z,t);lis.forwardX.setValueAtTime(dir.x,t);lis.forwardY.setValueAtTime(dir.y,t);lis.forwardZ.setValueAtTime(dir.z,t);lis.upX.setValueAtTime(up.x,t);lis.upY.setValueAtTime(up.y,t);lis.upZ.setValueAtTime(up.z,t);}
   else{lis.setPosition(wp.x,wp.y,wp.z);lis.setOrientation(dir.x,dir.y,dir.z,up.x,up.y,up.z);}
   if(this.playing&&c.currentTime>this.playing.end&&!this.playing.actor)this.playing=null;
   seat.position.copy(bench.localToWorld(new T.Vector3(0,.48,0)));
   seat.approach.copy(root.localToWorld(new T.Vector3(0,0,1.15)));
  }
 };
 world.piano=api;return api;
}
