// Dog-owned procedural bark. No dependency or mutation of mira-v2-sfx.js.
export class DogAudio {
  constructor(){this.ctx=null;this.queue=[];this.busyUntil=0;this.failed=false;this.disposed=false;this.unlock=this.unlock.bind(this);if(typeof document!=='undefined')for(const type of ['pointerdown','touchstart','keydown'])document.addEventListener(type,this.unlock,{passive:true});}
  context(){
    if(this.ctx||this.failed||this.disposed)return this.ctx;
    try {const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C){this.failed=true;return null;}this.ctx=new C();}catch(_){this.failed=true;}
    return this.ctx;
  }
  unlock(){const ctx=this.context();if(ctx?.state==='suspended')ctx.resume().then(()=>this.tick()).catch(()=>{});else this.tick();}
  bark(start=()=>{},owner=null){
    if(this.disposed)return false;
    const ctx=this.context();
    if(!ctx){start();return false;}
    // Bound queued automatic requests during a long suspended/autoplay-blocked session.
    if(!this.queue.some(q=>q.owner===owner))this.queue.push({start,owner});
    if(ctx.state!=='running'){start();return false;}return this.tick();
  }
  tick(){
    const c=this.ctx;if(!c||c.state!=='running'||c.currentTime<this.busyUntil||!this.queue.length)return false;
    const next=this.queue.shift(),now=c.currentTime+.008,duration=.57,pitch=.92+Math.random()*.16;
    const n=c.createBuffer(1,Math.ceil(c.sampleRate*.68),c.sampleRate),data=n.getChannelData(0);let last=0;
    for(let i=0;i<data.length;i++){last=last*.35+(Math.random()*2-1)*.65;const t=i/c.sampleRate;data[i]=last*(.60+.40*Math.sin(2*Math.PI*112*t));}
    const noise=c.createBufferSource();noise.buffer=n;noise.playbackRate.value=pitch;
    const filter=c.createBiquadFilter();filter.type='bandpass';filter.frequency.setValueAtTime(560*pitch,now);filter.frequency.exponentialRampToValueAtTime(260*pitch,now+duration);filter.Q.value=.85;
    const gain=c.createGain();gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.18,now+.055);gain.gain.setValueAtTime(.13,now+.22);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    const osc=c.createOscillator(),tone=c.createGain();osc.type='triangle';osc.frequency.setValueAtTime(140*pitch,now);osc.frequency.exponentialRampToValueAtTime(80*pitch,now+duration);tone.gain.value=.16;
    noise.connect(filter);filter.connect(gain);osc.connect(tone);tone.connect(gain);gain.connect(c.destination);
    noise.start(now);noise.stop(now+duration);osc.start(now);osc.stop(now+duration);
    noise.onended=()=>{noise.disconnect();filter.disconnect();gain.disconnect();osc.disconnect();tone.disconnect();};
    this.busyUntil=now+duration+.045;next.start();return true;
  }
  cancel(owner){this.queue=this.queue.filter(q=>q.owner!==owner);}
  dispose(){this.disposed=true;this.queue=[];if(typeof document!=='undefined')for(const type of ['pointerdown','touchstart','keydown'])document.removeEventListener(type,this.unlock);this.ctx?.close?.().catch(()=>{});}
}
