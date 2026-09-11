import {hydraCharge,petChirp,chargeSettings,chargeNoise,plasmaImpact,screenCue} from './synthesis.js?v=4.0.0';
import {MUSIC} from './data.js?v=4.0.0';
const FILE={plasma:'plasma',impact:'plasma_impact',boom:'boom',break:'plasma_impact_big',hit:'contact',hurt:'hurt',laser:'laser',slash:'slash',shield:'shield',pulse:'pulse',warp:'robot',rift:'robot',enemyshot:'laser',petshot:'laser',pickup:'contact',missile:'plasma',gameover:'death',robot:'robot',hydracharge:'plasma',hydrafire:'plasma_impact_huge',cooldown:'pulse',petcry:'robot',knightcharge:'hydra_charge',knightlaser:'laser',carhorn:'car_horn',boathorn:'boat_horn',screenhello:'screen_hello'};
export class Sound {
 constructor(){this.ctx=null;this.voices=[];this.buffers=new Map();this.loading=new Map();this.volume=.7;this.musicVolume=.22;this.playing=false;this.last=new Map();this.track=0;this.near=[];}
 init(){if(this.ctx)return;const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)return;try{this.ctx=new AC();const c=this.ctx;this.master=c.createGain();this.master.gain.value=this.volume;const limiter=c.createDynamicsCompressor();limiter.threshold.value=-10;limiter.knee.value=15;limiter.ratio.value=6;limiter.attack.value=.004;limiter.release.value=.18;this.master.connect(limiter);limiter.connect(c.destination);this.fx=c.createGain();this.fx.connect(this.master);
 for(let i=0;i<24;i++){const gain=c.createGain(),pan=c.createPanner();pan.panningModel='HRTF';pan.distanceModel='inverse';pan.refDistance=3;pan.maxDistance=85;pan.rolloffFactor=1.1;gain.connect(pan);pan.connect(this.fx);this.voices.push({gain,pan,busy:0,source:null});}
 const make=(name,data)=>{const b=c.createBuffer(1,data.length,24000);b.copyToChannel(data,0);this.buffers.set(name,b);};make('hydra_charge',hydraCharge());make('charge_noise',chargeNoise());for(const r of [1,3,7,14,28])make('impact_'+r,plasmaImpact(r));for(const [name,kind]of [['car_horn','car'],['boat_horn','boat'],['screen_hello','hello']])make(name,screenCue(kind));this.createHum();for(let i=0;i<8;i++)make('pet_'+i,petChirp(i));
 this.music=new Audio();this.music.preload='none';this.music.src='assets/music/'+MUSIC[this.track];this.music.volume=this.musicVolume;this.music.addEventListener('ended',()=>{this.track=(this.track+1)%MUSIC.length;this.music.src='assets/music/'+MUSIC[this.track];if(this.playing)this.music.play().catch(()=>{});});
 const files=[...new Set(Object.values(FILE))].filter(name=>!this.buffers.has(name));let next=0;Promise.all(Array.from({length:3},async()=>{while(next<files.length)await this.load(files[next++]);})).catch(()=>{});
 }catch(e){console.warn('Audio:',e.message);this.ctx=null;}}
 async load(name){if(this.buffers.has(name))return this.buffers.get(name);if(this.loading.has(name))return this.loading.get(name);if(!this.ctx)return;const promise=fetch('assets/sfx/'+name+'.wav').then(r=>{if(!r.ok)throw Error(name);return r.arrayBuffer();}).then(b=>this.ctx.decodeAudioData(b)).then(b=>{this.buffers.set(name,b);return b;}).catch(()=>null);this.loading.set(name,promise);return promise;}
 unlock(){this.init();this.ctx?.resume().catch(()=>{});if(this.playing)this.music?.play().catch(()=>{});}
 setPlaying(on){this.playing=on;if(on){this.unlock();this.music?.play().catch(()=>{});}else{this.music?.pause();if(this.hum)this.hum.gain.gain.setTargetAtTime(0,this.ctx.currentTime,.02);}if(this.ctx)this.fx.gain.setTargetAtTime(on?1:0,this.ctx.currentTime,.025);}
 setVolume(v){this.volume=v;if(this.ctx)this.master.gain.setTargetAtTime(v,this.ctx.currentTime,.04);}
 setMusic(v){this.musicVolume=v;if(this.music)this.music.volume=v;}
 createHum(){
 const c=this.ctx,gain=c.createGain(),pan=c.createPanner(),filter=c.createBiquadFilter();gain.gain.value=0;pan.panningModel='HRTF';pan.refDistance=1;pan.rolloffFactor=.4;filter.type='lowpass';filter.Q.value=2.1;filter.connect(gain);gain.connect(pan);pan.connect(this.fx);
 const oscillators=[];for(const [type,f,level]of [['sine',43,.65],['sawtooth',86,.22],['sine',86.7,.23],['sine',230,.18]]){const o=c.createOscillator(),amp=c.createGain();o.type=type;o.frequency.value=f;amp.gain.value=level;o.connect(amp);amp.connect(filter);o.start();oscillators.push(o);}
 const noise=c.createBufferSource(),noiseGain=c.createGain();noise.buffer=this.buffers.get('charge_noise');noise.loop=true;noiseGain.gain.value=.01;noise.connect(noiseGain);noiseGain.connect(filter);noise.start();this.hum={gain,pan,filter,oscillators,noise,noiseGain};
 }
 updateHum(g){if(!this.hum)return;const c=this.ctx,h=this.hum,t=Math.min(1,g.weapons.charge/(7.170193/g.power)),s=chargeSettings(t),on=this.playing&&g.weapons.charge>0;
  h.gain.gain.setTargetAtTime(on?s.volume:0,c.currentTime,.035);h.filter.frequency.setTargetAtTime(s.cutoff,c.currentTime,.03);h.noiseGain.gain.setTargetAtTime(s.noise,c.currentTime,.03);
  [s.bass,s.bass*2,s.bass*2.014,s.whine].forEach((f,i)=>h.oscillators[i].frequency.setTargetAtTime(f,c.currentTime,.025));
  const p=g.weapons.muzzle;h.pan.positionX.value=p.x;h.pan.positionY.value=p.y;h.pan.positionZ.value=p.z;
 }
 event(e){if(!this.ctx||!e.p||!this.playing)return;
  const now=this.ctx.currentTime;if(e.type==='boom'||(e.type==='impact'&&!e.exploded)){
   const r=Math.max(.3,e.radius||2);if(now-(this.last.get('explosion')??-9)<.045&&r<=(this.lastExplosionRadius||0)*1.3)return;this.last.set('explosion',now);this.lastExplosionRadius=r;const bank=[1,3,7,14,28].reduce((a,b)=>Math.abs(b-r)<Math.abs(a-r)?b:a,1);
   this.play('impact_'+bank,e.p,Math.min(.95,.23+Math.sqrt(r)*.14),Math.max(.78,Math.min(1.2,(bank/r)**.10)),2);
   const original=r>9?'plasma_impact_huge':r>3?'plasma_impact_big':'plasma_impact';this.load(original).then(()=>{if(this.playing)this.play(original,e.p,.17+Math.min(.2,r*.01),r>9?.82:1);});return;
  }
  if(e.type==='impact')return;let name=e.type==='hydracharge'?'hydra_charge':e.type==='petcry'?'pet_'+(e.kind||0):FILE[e.type];if(!name)return;
  const min=e.type==='pickup'?.035:e.type==='hit'?.045:e.quiet?.13:0;if(now-(this.last.get(e.type)??-9)<min)return;this.last.set(e.type,now);
  this.play(name,e.p,['carhorn','boathorn','screenhello'].includes(e.type)?.36:e.quiet?.12:e.type==='pickup'?.25:.65,1);
 }
 play(name,p,volume=1,rate=1,priority=0){const c=this.ctx,buffer=this.buffers.get(name);if(!c||!buffer||c.state!=='running'||!this.volume)return;let v=this.voices.find(v=>v.busy<=c.currentTime);if(!v&&priority>0){v=this.voices.filter(v=>(v.priority||0)<priority).sort((a,b)=>(a.priority||0)-(b.priority||0)||a.busy-b.busy)[0];if(v?.source)try{v.source.stop();}catch{}}if(!v)return;v.priority=priority;v.pan.positionX.value=p.x;v.pan.positionY.value=p.y;v.pan.positionZ.value=p.z;v.gain.gain.value=volume;const src=c.createBufferSource();src.buffer=buffer;src.playbackRate.value=rate;src.connect(v.gain);src.start();v.source=src;v.busy=c.currentTime+buffer.duration/rate;src.onended=()=>{src.disconnect();if(v.source===src)v.source=null;};}
 update(p,forward,up,g){if(!this.ctx)return;this.updateHum(g);const l=this.ctx.listener;for(const [prefix,v]of [['position',p],['forward',forward],['up',up]])for(const [suffix,key]of [['X','x'],['Y','y'],['Z','z']])if(l[prefix+suffix])l[prefix+suffix].value=v[key];const level=Math.floor(g.power*10);if(level>(this.level??10)&&level>=11){const name='power-p'+Math.min(40,level);this.load(name).then(()=>this.play(name,p,.8));}this.level=level;}
}
