// Original procedural audio. Buffers are synthesized once, with no network fetches.
import {seededRandom} from './simulation.js';
export class Sound {
  constructor(){this.ctx=null;this.volume=.7;this.musicVolume=.22;this.voices=[];this.enabled=true;this.playing=false;this.alarmAt=0;this.damageAt=0;this.near=new Array(4);this.dist=new Float64Array(4);}
  init(){
    if(this.ctx)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    try{
      const ctx=this.ctx=new AC();this.master=ctx.createGain();this.master.gain.value=this.volume;
      const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=12;limiter.ratio.value=5;limiter.attack.value=.004;limiter.release.value=.16;
      this.master.connect(limiter);limiter.connect(ctx.destination);
      this.fx=ctx.createGain();this.fx.connect(this.master);this.ambient=ctx.createGain();this.ambient.gain.value=0;this.ambient.connect(this.master);
      this.music=ctx.createGain();this.music.gain.value=this.musicVolume;this.music.connect(this.ambient);
      const random=seededRandom(952);
      const make=(seconds,fn)=>{const b=ctx.createBuffer(1,Math.ceil(seconds*ctx.sampleRate),ctx.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=fn(i/ctx.sampleRate,i,random()*2-1);return b;};
      this.buffers={
        shot:make(.28,(t,i,n)=>(Math.sin(2*Math.PI*(1100*t-1600*t*t))*.45+n*.3)*Math.exp(-t*24)*Math.min(t*1400,1)),
        hit:make(.20,(t,i,n)=>(n*.55+Math.sin(t*3200)*.18)*Math.exp(-t*28)*Math.min(t*1500,1)),
        kill:make(.8,(t,i,n)=>(n*.48+Math.sin(2*Math.PI*(95*t-35*t*t))*.48)*Math.exp(-t*7)*Math.min(t*600,1)),
        damage:make(.20,(t,i,n)=>(Math.sin(t*490)*.5+n*.08)*Math.sin(Math.PI*t/.2)**2),
        alarm:make(.22,(t)=>Math.sin(t*2*Math.PI*440)*.22*Math.sin(Math.PI*t/.22)**2),
        ui:make(.12,t=>Math.sin(t*2*Math.PI*880)*.2*Math.sin(Math.PI*t/.12)**2),
        end:make(1.4,t=>Math.sin(2*Math.PI*(240*t-65*t*t))*.25*Math.sin(Math.PI*t/1.4)**2),
        hum:make(4,t=>(Math.sin(t*2*Math.PI*55)*.18+Math.sin(t*2*Math.PI*82.5)*.07)*(1+.12*Math.sin(t*Math.PI))),
        drone:make(2,t=>(Math.sin(t*Math.PI*220)+Math.sin(t*Math.PI*222))*.075*(.8+.2*Math.cos(t*4*Math.PI)))
      };
      // 8-bar, 120 BPM arpeggio with a restrained kick and metallic hi-hat.
      const notes=[55,65.406,73.416,82.407];
      this.buffers.music=make(16,(t,i,n)=>{const beat=t*2,b=Math.floor(beat),p=(beat-b)/2,note=notes[Math.floor(b/8)%4],arp=[1,2,3,4,3,2,1,2][Math.floor(beat*2)%8],a=t%.25;
        const bass=Math.sin(2*Math.PI*note*t)*Math.exp(-p*6)*.13;
        const ping=Math.sin(2*Math.PI*note*arp*4*a)*Math.exp(-a*22)*.035;
        const kick=Math.sin(2*Math.PI*(58*p+2*(1-Math.exp(-p*40))))*Math.exp(-p*24)*.17;
        const hat=n*Math.exp(-(t%.25)*150)*.045;return bass+ping+kick+hat;});
      for(let i=0;i<20;i++){const gain=ctx.createGain(),pan=ctx.createPanner();pan.panningModel='equalpower';pan.distanceModel='inverse';pan.refDistance=3;pan.maxDistance=70;pan.rolloffFactor=1;gain.connect(pan);pan.connect(this.fx);this.voices.push({gain,pan,busy:0,source:null});}
      const loop=(buffer,bus)=>{const s=ctx.createBufferSource();s.buffer=buffer;s.loop=true;s.connect(bus);s.start();return s;};
      this.reactorPan=ctx.createPanner();this.reactorPan.panningModel='equalpower';this.reactorPan.refDistance=6;this.reactorPan.rolloffFactor=.8;this.reactorPan.connect(this.ambient);loop(this.buffers.hum,this.reactorPan);
      loop(this.buffers.music,this.music);
      this.droneLoops=Array.from({length:4},()=>{const p=ctx.createPanner(),g=ctx.createGain();p.panningModel='equalpower';p.refDistance=2;p.rolloffFactor=1.6;p.connect(g);g.gain.value=0;g.connect(this.ambient);loop(this.buffers.drone,p);return {p,g};});
    }catch(e){console.warn('Audio unavailable:',e.message);this.ctx=null;}
  }
  unlock(){this.init();if(this.ctx?.state==='suspended')this.ctx.resume().catch(()=>{});}
  setPlaying(on){this.playing=on;if(this.ctx)this.ambient.gain.setTargetAtTime(on?1:0,this.ctx.currentTime,.08);}
  setVolume(v){this.volume=v;if(this.ctx)this.master.gain.setTargetAtTime(v,this.ctx.currentTime,.04);}
  setMusic(v){this.musicVolume=v;if(this.ctx)this.music.gain.setTargetAtTime(v,this.ctx.currentTime,.06);}
  play(name,x=0,y=0,z=0,volume=1){
    const c=this.ctx;if(!c||c.state!=='running'||this.volume===0)return;
    const buffer=this.buffers[name];if(!buffer)return;
    const v=this.voices.find(v=>v.busy<=c.currentTime);if(!v)return;
    v.pan.positionX.value=x;v.pan.positionY.value=y;v.pan.positionZ.value=z;v.gain.gain.value=volume;
    const s=c.createBufferSource();s.buffer=buffer;s.connect(v.gain);s.start();v.source=s;v.busy=c.currentTime+buffer.duration;
    s.onended=()=>{s.disconnect();if(v.source===s)v.source=null;};
  }
  update(eye,forward,up,sim){
    const c=this.ctx;if(!c)return;const l=c.listener;
    if(l.positionX){l.positionX.value=eye.x;l.positionY.value=eye.y;l.positionZ.value=eye.z;l.forwardX.value=forward.x;l.forwardY.value=forward.y;l.forwardZ.value=forward.z;l.upX.value=up.x;l.upY.value=up.y;l.upZ.value=up.z;}
    else{l.setPosition(eye.x,eye.y,eye.z);l.setOrientation(forward.x,forward.y,forward.z,up.x,up.y,up.z);}
    if(!this.playing)return;
    this.near.fill(null);this.dist.fill(Infinity);
    for(const d of sim.drones){if(d.hp<=0)continue;const dist=(d.x-eye.x)**2+(d.y-eye.y)**2+(d.z-eye.z)**2;for(let i=0;i<4;i++){if(dist<this.dist[i]){for(let j=3;j>i;j--){this.dist[j]=this.dist[j-1];this.near[j]=this.near[j-1];}this.dist[i]=dist;this.near[i]=d;break;}}}
    for(let i=0;i<4;i++){const d=this.near[i],v=this.droneLoops[i];v.g.gain.setTargetAtTime(d ? .7 : 0,c.currentTime,.15);if(d){v.p.positionX.value=d.x;v.p.positionY.value=d.y;v.p.positionZ.value=d.z;}}
    if(sim.power<200&&c.currentTime>this.alarmAt){this.play('alarm',eye.x,eye.y,eye.z);this.alarmAt=c.currentTime+1.2;}
    if(sim.damage>0&&c.currentTime>this.damageAt){this.play('damage',eye.x,eye.y,eye.z);this.damageAt=c.currentTime+.24;}
  }
}
