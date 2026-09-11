// Retains the isolate's CC0 bark: Denis Chardonnet / BigSoundBank #2955.
const BARK_URL=new URL('../../assets/dog/bark.mp3',import.meta.url);
const PATTERNS={greeting:[1.04,.65,1],'demand-bone':[1.12,.7,2],'left-behind-bone':[.96,.9,2],'play-zoomie':[1.2,.55,2],'warning-destroy':[.86,.9,1],'sleepy-grumble':[.72,.45,1],ambient:[1,.6,1]};
export class DogAudio {
 constructor(){this.ctx=null;this.queue=[];this.active=new Set();this.busyUntil=0;this.disposed=false;this.buffer=null;this.loading=null;this.unlock=this.unlock.bind(this);if(typeof document!=='undefined')for(const t of ['pointerdown','touchstart','keydown'])document.addEventListener(t,this.unlock,{passive:true});this.preload();}
 context(){if(this.disposed)return null;if(this.ctx)return this.ctx;try{const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(C)this.ctx=new C();}catch(_){}return this.ctx;}
 preload(){if(this.disposed||this.loading||typeof fetch!=='function')return;this.loading=fetch(BARK_URL).then(r=>{if(!r.ok)throw Error('bark');return r.arrayBuffer();}).then(async b=>{const c=this.context();if(c){const data=await c.decodeAudioData(b);if(!this.disposed)this.buffer=data;}}).catch(()=>{});}
 unlock(){const c=this.context();if(c?.state==='suspended')c.resume().then(()=>this.tick()).catch(()=>{});else this.tick();}
 bark(start=()=>{},owner=null,pattern='ambient'){
  if(this.disposed)return false;const c=this.context(),p=PATTERNS[pattern]||PATTERNS.ambient;
  if(!c){start();return false;}if(this.queue.some(q=>q.owner===owner))return false;
  const cat=owner?.kind==='cat';
  for(let i=0;i<(cat?1:p[2]);i++)this.queue.push({start,owner,pitch:p[0]*(.94+Math.random()*.12),gain:p[1],ready:c.currentTime+i*.35,quiet:pattern==='sleepy-grumble',fired:false,voice:cat?'cat':'dog'});
  if(c.state!=='running'){this.queue[0].start();this.queue[0].fired=true;return false;}return this.tick();
 }
 tick(){
  const c=this.ctx;if(this.disposed||!c||c.state!=='running'||c.currentTime<this.busyUntil||!this.queue.length||this.queue[0].ready>c.currentTime)return false;
  const a=this.queue.shift(),now=c.currentTime+.006,gain=c.createGain(),nodes=[gain],sources=[];
  let duration;
  if(a.voice==='cat'){
   duration=a.quiet?.22:.38;const o=c.createOscillator(),o2=c.createOscillator(),f=c.createBiquadFilter(),tone=c.createGain();
   o.type='triangle';o2.type='sine';f.type='bandpass';f.frequency.value=1400*a.pitch;f.Q.value=2.4;
   o.frequency.setValueAtTime(920*a.pitch,now);o.frequency.exponentialRampToValueAtTime(420*a.pitch,now+duration);
   o2.frequency.setValueAtTime(1380*a.pitch,now);o2.frequency.exponentialRampToValueAtTime(640*a.pitch,now+duration);
   tone.gain.value=.22;o.connect(f);o2.connect(tone);tone.connect(f);f.connect(gain);
   o.start(now);o2.start(now);o.stop(now+duration);o2.stop(now+duration);sources.push(o,o2);nodes.push(o,o2,f,tone);
  }else if(this.buffer){const s=c.createBufferSource();s.buffer=this.buffer;s.playbackRate.value=a.pitch;duration=Math.min(this.buffer.duration/a.pitch,a.quiet?.4:.72);s.connect(gain);sources.push(s);nodes.push(s);s.start(now);s.stop(now+duration);}
  else{
   duration=a.quiet?.38:.48;const data=c.createBuffer(1,Math.ceil(c.sampleRate*duration*a.pitch)+1,c.sampleRate),samples=data.getChannelData(0);let last=0;
   for(let i=0;i<samples.length;i++){last=last*.35+(Math.random()*2-1)*.65;samples[i]=last*(.6+.4*Math.sin(i/c.sampleRate*704));}
   const s=c.createBufferSource(),f=c.createBiquadFilter(),o=c.createOscillator(),tone=c.createGain();s.buffer=data;s.playbackRate.value=a.pitch;
   f.type='bandpass';f.frequency.setValueAtTime(540*a.pitch,now);f.frequency.exponentialRampToValueAtTime(240*a.pitch,now+duration);f.Q.value=.85;
   o.type='triangle';o.frequency.setValueAtTime(140*a.pitch,now);o.frequency.exponentialRampToValueAtTime(80*a.pitch,now+duration);tone.gain.value=.15;
   s.connect(f);f.connect(gain);o.connect(tone);tone.connect(gain);s.start(now);o.start(now);s.stop(now+duration);o.stop(now+duration);sources.push(s,o);nodes.push(s,f,o,tone);
  }
  gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime((this.buffer?.42:.2)*a.gain,now+.025);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);gain.connect(c.destination);
  const active={owner:a.owner,sources,nodes};this.active.add(active);sources[0].onended=()=>{for(const n of nodes)try{n.disconnect();}catch(_){}this.active.delete(active);};
  this.busyUntil=now+duration+.035;if(!a.fired)a.start();return true;
 }
 cancel(owner){this.queue=this.queue.filter(a=>a.owner!==owner);for(const a of this.active)if(a.owner===owner){for(const s of a.sources)try{s.stop();}catch(_){}for(const n of a.nodes)try{n.disconnect();}catch(_){}this.active.delete(a);}}
 dispose(){this.disposed=true;this.queue=[];for(const a of [...this.active])this.cancel(a.owner);if(typeof document!=='undefined')for(const t of ['pointerdown','touchstart','keydown'])document.removeEventListener(t,this.unlock);this.ctx?.close?.().catch(()=>{});this.buffer=null;}
}
