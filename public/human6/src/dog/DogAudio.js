import * as T from 'three';
const ROOT=new URL('../../assets/pets/',import.meta.url);
export const PET_VOICES=Object.freeze({
 'dog:bark':['dog-bark-1','dog-bark-2','dog-bark-3'],
 'dog:whine':['dog-whine-1','dog-whine-2'],
 'dog:growl':['dog-growl-1','dog-growl-2'],
 'cat:meow':['cat-meow-1','cat-meow-2'],
 'cat:purr':['cat-purr-1','cat-purr-2'],
 'cat:growl':['cat-growl-1','cat-growl-2']
});
export function voiceCategory(species,pattern){
 if(/growl|warning|destroy|grumble/.test(pattern))return 'growl';
 if(species==='cat')return /purr|content|sleep/.test(pattern)?'purr':'meow';
 return /whine|left-behind|demand|content/.test(pattern)?'whine':'bark';
}
/** Gesture-unlocked, bounded positional recording player shared by all pets. */
export class DogAudio {
 constructor(host={}){this.host=host;this.ctx=null;this.queue=[];this.active=new Set();this.buffers=new Map();this.loading=new Map();this.previous=new Map();this.cooldowns=new Map();this.disposed=false;this.errors=new Set();this.clock=0;this._p=new T.Vector3();this._forward=new T.Vector3();this._up=new T.Vector3();this._q=new T.Quaternion();this.unlock=()=>{this.context()?.resume().then(()=>this.tick()).catch(()=>{});};if(typeof window!=='undefined')for(const e of ['pointerdown','touchstart','keydown'])window.addEventListener(e,this.unlock,{passive:true});}
 context(){if(this.disposed)return null;if(!this.ctx){const A=globalThis.AudioContext||globalThis.webkitAudioContext;if(A)this.ctx=new A({latencyHint:'interactive'});}return this.ctx;}
 async load(id){if(this.buffers.has(id))return this.buffers.get(id);if(this.loading.has(id))return this.loading.get(id);const ctx=this.context();if(!ctx)return null;const p=fetch(new URL(id+'.mp3',ROOT)).then(r=>{if(!r.ok)throw Error(id+' '+r.status);return r.arrayBuffer();}).then(b=>ctx.decodeAudioData(b)).then(b=>{if(!this.disposed)this.buffers.set(id,b);return b;}).catch(()=>{this.errors.add(id);return null;}).finally(()=>this.loading.delete(id));this.loading.set(id,p);return p;}
 bark(start,owner,pattern='ambient'){
  if(this.disposed||owner?.dead)return false;const species=owner?.kind==='cat'?'cat':'dog',category=voiceCategory(species,pattern),key=species+':'+category,bank=PET_VOICES[key],now=performance.now()/1000,coolKey=(owner?.id||'pet')+':'+category;
  if(now<(this.cooldowns.get(coolKey)||0)||this.queue.some(q=>q.owner===owner)||[...this.active].some(v=>v.owner===owner))return false;
  let choices=bank.filter(id=>id!==this.previous.get(coolKey));const id=choices[Math.floor(Math.random()*choices.length)];this.previous.set(coolKey,id);this.cooldowns.set(coolKey,now+(category==='purr'?5:1.3));
  if(this.queue.length>=6)return false;this.queue.push({start,owner,id,category,rate:(owner?.breed?.voice||1)*(.975+Math.random()*.05),at:now});this.load(id);return true;
 }
 position(node,p,now){if(node.positionX){node.positionX.setValueAtTime(p.x,now);node.positionY.setValueAtTime(p.y,now);node.positionZ.setValueAtTime(p.z,now);}else node.setPosition(p.x,p.y,p.z);}
 tick(){const c=this.ctx;if(!c||c.state!=='running'||this.disposed)return;const now=c.currentTime,cam=this.host.renderer?.xr?.isPresenting?this.host.renderer.xr.getCamera(this.host.camera):this.host.camera;
  if(cam){cam.getWorldPosition(this._p);this.position(c.listener,this._p,now);cam.getWorldQuaternion(this._q);this._forward.set(0,0,-1).applyQuaternion(this._q);this._up.set(0,1,0).applyQuaternion(this._q);const l=c.listener;if(l.forwardX){for(const [n,v]of [['forward',this._forward],['up',this._up]])for(const axis of ['X','Y','Z'])l[n+axis].setValueAtTime(v[axis.toLowerCase()],now);}else l.setOrientation(...this._forward.toArray(),...this._up.toArray());}
  for(const v of this.active){if(v.owner?.dead||!v.owner?.root?.parent){this.stop(v);continue;}v.owner.root.getWorldPosition(this._p);this._p.y+=(v.owner.breed?.scale||1)*.7;this.position(v.pan,this._p,now);}
  this.queue=this.queue.filter(q=>performance.now()/1000-q.at<6&&!q.owner?.dead&&!!q.owner?.root?.parent);
  while(this.active.size<3){const i=this.queue.findIndex(q=>this.buffers.has(q.id));if(i<0)break;const q=this.queue.splice(i,1)[0],buffer=this.buffers.get(q.id),source=c.createBufferSource(),gain=c.createGain(),pan=c.createPanner();source.buffer=buffer;source.playbackRate.value=q.rate;pan.panningModel='equalpower';pan.distanceModel='inverse';pan.refDistance=q.category==='purr'?.7:1.7;pan.maxDistance=28;pan.rolloffFactor=1.35;gain.gain.value=q.category==='purr'?.28:.8;source.connect(gain).connect(pan).connect(c.destination);q.owner.root.getWorldPosition(this._p);this._p.y+=(q.owner.breed?.scale||1)*.7;this.position(pan,this._p,now);const v={source,gain,pan,owner:q.owner};this.active.add(v);source.onended=()=>this.clean(v);q.start?.();source.start();}
 }
 clean(v){v.source.disconnect();v.gain.disconnect();v.pan.disconnect();this.active.delete(v);}
 stop(v){try{v.source.stop();}catch{}this.clean(v);}
 cancel(owner){this.queue=this.queue.filter(q=>q.owner!==owner);for(const v of [...this.active])if(v.owner===owner)this.stop(v);for(const key of this.cooldowns.keys())if(key.startsWith((owner?.id||'pet')+':')){this.cooldowns.delete(key);this.previous.delete(key);}}
 snapshot(){return {active:this.active.size,queued:this.queue.length,decoded:this.buffers.size,failed:[...this.errors],context:this.ctx?.state||'locked'};}
 dispose(){this.disposed=true;for(const e of ['pointerdown','touchstart','keydown'])globalThis.window?.removeEventListener(e,this.unlock);for(const v of [...this.active])this.stop(v);this.queue=[];this.buffers.clear();this.loading.clear();this.ctx?.close().catch(()=>{});}
}
