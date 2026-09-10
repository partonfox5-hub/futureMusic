let ctx=null,master=null,unlocked=false;
function ac(){
 if(!ctx){ctx=new (window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=.55;master.connect(ctx.destination);}
 if(ctx.state==='suspended')ctx.resume();
 return ctx;
}
export function unlockSfx(){unlocked=true;try{ac();}catch{}}
function env(g,t,a,s,d){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(a,t+.004);g.gain.exponentialRampToValueAtTime(Math.max(.0001,s),t+d);}
function noise(c,dur){const n=Math.max(1,Math.floor(c.sampleRate*dur)),b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;const s=c.createBufferSource();s.buffer=b;return s;}
function filt(c,type,freq,q=1){const f=c.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;return f;}
export function playSfx(kind,vol=1){
 unlocked=true;
 try{
  const c=ac(),t=c.currentTime,g=c.createGain();g.gain.value=vol;g.connect(master);
  if(kind==='gun'){
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
  }else if(kind==='portal'){
   const o=c.createOscillator();o.type='sine';o.frequency.setValueAtTime(240,t);o.frequency.exponentialRampToValueAtTime(720,t+.18);
   const o2=c.createOscillator();o2.type='triangle';o2.frequency.setValueAtTime(90,t);o2.frequency.linearRampToValueAtTime(40,t+.28);
   env(g,t,.4,.0008,.28);o.connect(g);o2.connect(g);o.start(t);o.stop(t+.2);o2.start(t);o2.stop(t+.3);
  }
 }catch{}
}
export function sfxForBreak(kind){if(kind==='glass')return 'glass';if(kind==='metal')return 'metal';if(kind==='plaster')return 'plaster';if(kind==='wood')return 'wood';return 'impact';}
export function sfxForHit(kind){if(kind==='laser')return 'laser';if(kind==='bullet')return 'impact';if(kind==='cut')return 'whoosh';if(kind==='scuff')return 'thud';return 'thud';}

export class CarAudio {
 constructor(){this.rpm=850;this.hornUntil=0;this.started=false;this.nodes=null;}
 ensure(){
  unlockSfx();const c=ac();if(!c||this.nodes)return c;
  const master=c.createGain();master.gain.value=0;master.connect(c.destination);
  const osc=c.createOscillator();osc.type='sawtooth';osc.frequency.value=70;
  const osc2=c.createOscillator();osc2.type='square';osc2.frequency.value=35;
  const og=c.createGain();og.gain.value=.18;const og2=c.createGain();og2.gain.value=.07;
  const n=noise(c,1.6);n.loop=true;const ng=c.createGain();ng.gain.value=.12;
  const lp=filt(c,'lowpass',420,0.8),bp=filt(c,'bandpass',180,1.1);
  osc.connect(og);osc2.connect(og2);n.connect(ng);og.connect(bp);og2.connect(lp);ng.connect(lp);bp.connect(lp);lp.connect(master);
  osc.start();osc2.start();n.start();
  this.nodes={c,master,osc,osc2,og,og2,n,ng,lp,bp};
  return c;
 }
 tick(car,input,dt){
  const c=this.ensure();if(!c||!this.nodes)return;
  const drive=!!car.driving&&(car.gear==='D'||car.gear==='R');
  const speed=car.velocity?.length?.()||0,throttle=drive?Math.max(0,input?.throttle||0):0;
  const target=drive?820+throttle*3400+speed*62+(car.gear==='R'?180:0):car.driving?780:0;
  this.rpm+=(target-this.rpm)*Math.min(1,dt*3.2);
  const load=throttle*(.55+.45*Math.min(1,speed/8));
  const vol=drive?.07+throttle*.26+Math.min(.16,speed*.018):car.driving?.04:0;
  const t=c.currentTime,n=this.nodes;
  n.osc.frequency.setTargetAtTime(this.rpm/12.2,t,.05);
  n.osc2.frequency.setTargetAtTime(this.rpm/24.4,t,.05);
  n.lp.frequency.setTargetAtTime(280+this.rpm*.22+load*90,t,.08);
  n.og.gain.setTargetAtTime(.12+.16*load,t,.08);
  n.ng.gain.setTargetAtTime(.08+.14*throttle,t,.08);
  n.master.gain.setTargetAtTime(vol,t,.12);
  if(drive&&!this.started){this.started=true;this.crank();}
  if(!car.driving)this.started=false;
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
