let ctx=null,master=null,unlocked=false;
function ac(){
 if(!ctx){ctx=new (window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=.55;master.connect(ctx.destination);}
 if(ctx.state==='suspended')ctx.resume();
 return ctx;
}
export function unlockSfx(){unlocked=true;try{ac();}catch{}}
export function audioContext(){unlockSfx();try{return ac();}catch{return null;}}
export function sfxMaster(){audioContext();return master;}
function env(g,t,a,s,d){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(a,t+.004);g.gain.exponentialRampToValueAtTime(Math.max(.0001,s),t+d);}
function noise(c,dur){const n=Math.max(1,Math.floor(c.sampleRate*dur)),b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;const s=c.createBufferSource();s.buffer=b;return s;}
function filt(c,type,freq,q=1){const f=c.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;return f;}
export function playSfx(kind,vol=1){
 unlocked=true;
 try{
  const c=ac(),t=c.currentTime,g=c.createGain();g.gain.value=vol;g.connect(master);
  if(kind==='explode'){
   const n=noise(c,.55),f=filt(c,'lowpass',420,0.8),o=c.createOscillator();o.type='sine';o.frequency.setValueAtTime(78,t);o.frequency.exponentialRampToValueAtTime(28,t+.42);
   const og=c.createGain();env(g,t,1,.0008,.5);env(og,t,.85,.0001,.38);n.connect(f);f.connect(g);o.connect(og);og.connect(g);n.start(t);n.stop(t+.55);o.start(t);o.stop(t+.45);
  }else if(kind==='gun'){
   const n=noise(c,.18),f=filt(c,'lowpass',1800,0.7),click=c.createOscillator();click.type='square';click.frequency.setValueAtTime(180,t);click.frequency.exponentialRampToValueAtTime(40,t+.09);
   const cg=c.createGain();env(g,t,.9,.0008,.16);env(cg,t,.7,.0001,.08);n.connect(f);f.connect(g);click.connect(cg);cg.connect(g);n.start(t);n.stop(t+.18);click.start(t);click.stop(t+.1);
  }else if(kind==='laser'){
   const o=c.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(1480,t);o.frequency.exponentialRampToValueAtTime(420,t+.12);env(g,t,.35,.0008,.12);o.connect(g);o.start(t);o.stop(t+.13);
  }else if(kind==='impact'){
   const n=noise(c,.22),f=filt(c,'bandpass',420,2.2),o=c.createOscillator();o.type='triangle';o.frequency.setValueAtTime(90,t);o.frequency.exponentialRampToValueAtTime(32,t+.16);
   env(g,t,.8,.0008,.2);n.connect(f);f.connect(g);o.connect(g);n.start(t);n.stop(t+.22);o.start(t);o.stop(t+.18);
  }else if(kind==='wood'){
   const n=noise(c,.28),f=filt(c,'bandpass',520,3);env(g,t,.7,.0008,.24);n.connect(f);f.connect(g);n.start(t);n.stop(t+.28);
  }else if(kind==='glass'){
   const n=noise(c,.35),f=filt(c,'highpass',2400,0.8);env(g,t,.55,.0008,.32);n.connect(f);f.connect(g);n.start(t);n.stop(t+.35);
   for(const hz of [2400,3100,4100]){const o=c.createOscillator();o.type='sine';o.frequency.value=hz;const og=c.createGain();og.gain.setValueAtTime(.12,t);og.gain.exponentialRampToValueAtTime(.0001,t+.4);o.connect(og);og.connect(g);o.start(t);o.stop(t+.4);}
  }else if(kind==='metal'){
   const n=noise(c,.2),f=filt(c,'bandpass',1100,4),o=c.createOscillator();o.type='square';o.frequency.setValueAtTime(220,t);o.frequency.exponentialRampToValueAtTime(70,t+.2);
   env(g,t,.55,.0008,.22);n.connect(f);f.connect(g);o.connect(g);n.start(t);n.stop(t+.2);o.start(t);o.stop(t+.22);
  }else if(kind==='whoosh'){
   const n=noise(c,.16),f=filt(c,'bandpass',900,1.1);env(g,t,.28,.0008,.14);n.connect(f);f.connect(g);n.start(t);n.stop(t+.16);
  }else if(kind==='thud'){
   const o=c.createOscillator();o.type='sine';o.frequency.setValueAtTime(70,t);o.frequency.exponentialRampToValueAtTime(28,t+.18);env(g,t,.7,.0008,.2);o.connect(g);o.start(t);o.stop(t+.2);
  }else if(kind==='plaster'){
   const n=noise(c,.22),f=filt(c,'bandpass',780,1.6);env(g,t,.62,.0008,.2);n.connect(f);f.connect(g);n.start(t);n.stop(t+.22);
  }else if(kind==='paint'){
   const n=noise(c,.08),f=filt(c,'bandpass',1400,1.1),o=c.createOscillator();o.type='square';o.frequency.setValueAtTime(420,t);o.frequency.exponentialRampToValueAtTime(90,t+.07);
   env(g,t,.55,.0008,.09);n.connect(f);f.connect(g);o.connect(g);n.start(t);n.stop(t+.08);o.start(t);o.stop(t+.08);
  }else if(kind==='splat'){
   const n=noise(c,.16),f=filt(c,'lowpass',900,0.8);env(g,t,.7,.0008,.16);n.connect(f);f.connect(g);n.start(t);n.stop(t+.16);
  }else if(kind==='reload'){
   const n=noise(c,.22),f=filt(c,'bandpass',900,1.8),o=c.createOscillator();o.type='square';o.frequency.setValueAtTime(180,t);o.frequency.exponentialRampToValueAtTime(70,t+.12);
   const o2=c.createOscillator();o2.type='triangle';o2.frequency.setValueAtTime(520,t+.14);o2.frequency.exponentialRampToValueAtTime(140,t+.38);
   const g2=c.createGain();g2.gain.setValueAtTime(0,t);g2.gain.linearRampToValueAtTime(.22,t+.16);g2.gain.exponentialRampToValueAtTime(.0001,t+.42);
   env(g,t,.55,.0008,.2);n.connect(f);f.connect(g);o.connect(g);o2.connect(g2);g2.connect(g);n.start(t);n.stop(t+.22);o.start(t);o.stop(t+.14);o2.start(t+.12);o2.stop(t+.42);
  }else if(kind==='portal'){
   const o=c.createOscillator();o.type='sine';o.frequency.setValueAtTime(240,t);o.frequency.exponentialRampToValueAtTime(720,t+.18);
   const o2=c.createOscillator();o2.type='triangle';o2.frequency.setValueAtTime(90,t);o2.frequency.linearRampToValueAtTime(40,t+.28);
   env(g,t,.4,.0008,.28);o.connect(g);o2.connect(g);o.start(t);o.stop(t+.2);o2.start(t);o2.stop(t+.3);
  }
 }catch{}
}
export function sfxForBreak(kind){if(kind==='glass')return 'glass';if(kind==='metal')return 'metal';if(kind==='plaster')return 'plaster';if(kind==='wood')return 'wood';return 'impact';}
export function sfxForHit(kind){if(kind==='laser')return 'laser';if(kind==='bullet')return 'impact';if(kind==='cut')return 'whoosh';if(kind==='scuff')return 'thud';return 'thud';}

// Shared, loop-safe combustion loops synthesized from uneven cylinder pulses.
// No network fetch or per-parked-car graph. These are procedural sounds, not recordings.
const engineBuffers=new WeakMap(),engineVoices=new Set();
function combustionBuffers(c){
 if(engineBuffers.has(c))return engineBuffers.get(c);
 const result=[800,2400,4400].map((rpm,band)=>{
  const cycles=Math.round(rpm/120*1.5),duration=cycles*120/rpm,n=Math.round(duration*c.sampleRate),b=c.createBuffer(1,n,c.sampleRate),a=b.getChannelData(0);
  let low=0;for(let i=0;i<n;i++){
   const phase=i/n*cycles;let pulse=0;
   for(let cylinder=0;cylinder<4;cylinder++){const p=((phase-cylinder*.25+1e3)%1),strength=[1,.94,1.03,.97][cylinder];pulse+=strength*Math.exp(-p*(26+band*5))*Math.sin(p*Math.PI*(8+band*2));}
   // Periodic valve/intake detail avoids broadband hiss and discontinuous seams.
   const mechanical=Math.sin(phase*Math.PI*2*23)*.035+Math.sin(phase*Math.PI*2*41)*.016;
   low=low*.82+pulse*.18;a[i]=Math.tanh((pulse-low*.25)*1.9+mechanical)*.68;
  }
  // Equal-power seam blend is baked once, shared by every audible vehicle.
  const fade=Math.min(256,Math.floor(n/20));for(let i=0;i<fade;i++){const t=i/fade,v=a[n-fade+i]*(1-t)+a[i]*t;a[i]=v;}
  return b;
 });engineBuffers.set(c,result);return result;
}
export class CarAudio {
 constructor(){this.rpm=850;this.hornUntil=0;this.started=false;this.nodes=null;}
 dispose(){if(!this.nodes)return;for(const b of this.nodes.bands){try{b.source.stop();}catch{}b.source.disconnect();b.gain.disconnect();}for(const n of Object.values(this.nodes))try{n.disconnect?.();}catch{}this.nodes=null;engineVoices.delete(this);this.started=false;}
 ensure(){
  if(this.nodes)return this.nodes.c;
  if(engineVoices.size>=4)return null;
  unlockSfx();const c=ac();if(!c)return null;
  const output=c.createGain();output.gain.value=0;output.connect(sfxMaster());
  const pan=c.createStereoPanner(),lp=filt(c,'lowpass',1100,.65);lp.connect(pan);pan.connect(output);
  const bands=combustionBuffers(c).map((buffer,i)=>{const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;source.loop=true;gain.gain.value=0;source.connect(gain);gain.connect(lp);source.start();return {source,gain,rpm:[800,2400,4400][i]};});
  this.nodes={c,master:output,pan,lp,bands};engineVoices.add(this);this.silent=0;return c;
 }
 tick(car,input,dt){
  const active=!!(car.driving||car.h5Traffic?.active),head=car.liveCamera||car.camera,eye=head?.getWorldPosition(car.group.position.clone()),distance=eye?eye.distanceTo(car.group.position):0;
  if(!active||distance>48||!unlocked){if(this.nodes){this.nodes.master.gain.setTargetAtTime(0,this.nodes.c.currentTime,.12);this.silent=(this.silent||0)+dt;if(this.silent>2)this.dispose();}this.started=false;return;}
  const c=this.ensure();if(!c||!this.nodes)return;this.silent=0;
  const speed=car.velocity?.length?.()||0,throttle=Math.max(0,input?.throttle||0),target=Math.max(780,Number.isFinite(car.engineRPM)?car.engineRPM:850+throttle*3000+speed*48);
  this.rpm+=(target-this.rpm)*(1-Math.exp(-dt*12));
  const load=throttle,shift=car.h5Vehicle?.auto?.shift||0,t=c.currentTime,n=this.nodes,rpm=this.rpm;
  const middle=rpm<2400?(rpm-800)/1600:(4400-rpm)/2000,weights=[Math.max(0,1-(rpm-800)/1600),Math.max(0,Math.min(1,middle)),Math.max(0,(rpm-2400)/2000)];
  const sum=Math.hypot(...weights)||1;
  n.bands.forEach((b,i)=>{b.source.playbackRate.setTargetAtTime(Math.max(.55,Math.min(1.65,rpm/b.rpm)),t,.035);b.gain.gain.setTargetAtTime(weights[i]/sum,t,.055);});
  n.lp.frequency.setTargetAtTime((car.driving?1150:1900)+rpm*.27+load*1350,t,.08);
  const damage=car.h5Vehicle?.damage?.engine||0,rough=1+damage*.12*Math.sin(car.time*31),volume=(.10+load*.16+Math.min(.035,speed*.002))*(shift?.7:1)*rough;
  n.master.gain.setTargetAtTime(volume/(1+(distance/9)**2),t,.08);
  if(!car.driving&&eye){const local=car.group.position.clone().sub(eye).applyQuaternion(head.getWorldQuaternion(car.group.quaternion.clone()).invert());n.pan.pan.setTargetAtTime(Math.max(-1,Math.min(1,local.x/Math.max(1,distance))),t,.08);}else n.pan.pan.setTargetAtTime(0,t,.08);
  if(!this.started){this.started=true;this.crank();}
 }

 crank(){
  try{
   const c=ac(),t=c.currentTime,g=c.createGain();g.connect(master);
   const o=c.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(48,t);o.frequency.exponentialRampToValueAtTime(90,t+.18);
   env(g,t,.28,.0008,.22);o.connect(g);o.start(t);o.stop(t+.24);
  }catch{}
 }
 horn(){
  const now=typeof performance!=='undefined'?performance.now()/1000:0;
  if(now<this.hornUntil)return false;this.hornUntil=now+.38;
  try{
   const c=this.ensure(),t=c.currentTime,g=c.createGain();g.connect(master);
   const o=c.createOscillator();o.type='square';o.frequency.setValueAtTime(412,t);
   const o2=c.createOscillator();o2.type='square';o2.frequency.setValueAtTime(349,t);
   env(g,t,.55,.0008,.22);o.connect(g);o2.connect(g);o.start(t);o.stop(t+.2);o2.start(t);o2.stop(t+.2);
  }catch{}
  return true;
 }
 shifter(){
  try{
   const c=this.ensure(),t=c.currentTime,g=c.createGain();g.connect(master);
   const n=noise(c,.05),f=filt(c,'bandpass',2100,4.5),o=c.createOscillator();o.type='square';o.frequency.setValueAtTime(190,t);o.frequency.exponentialRampToValueAtTime(90,t+.04);
   env(g,t,.32,.0008,.07);n.connect(f);f.connect(g);o.connect(g);n.start(t);n.stop(t+.05);o.start(t);o.stop(t+.05);
  }catch{}
 }
 door(open){
  try{
   const c=this.ensure(),t=c.currentTime,g=c.createGain();g.connect(master);
   if(open){
    const n=noise(c,.18),f=filt(c,'bandpass',380,1.4);env(g,t,.42,.0008,.2);n.connect(f);f.connect(g);n.start(t);n.stop(t+.18);
    const o=c.createOscillator();o.type='triangle';o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(70,t+.12);o.connect(g);o.start(t);o.stop(t+.14);
   }else{
    const n=noise(c,.12),f=filt(c,'lowpass',520,0.9),o=c.createOscillator();o.type='sine';o.frequency.setValueAtTime(90,t);o.frequency.exponentialRampToValueAtTime(42,t+.1);
    env(g,t,.7,.0008,.16);n.connect(f);f.connect(g);o.connect(g);n.start(t);n.stop(t+.12);o.start(t);o.stop(t+.14);
   }
  }catch{}
 }
}
