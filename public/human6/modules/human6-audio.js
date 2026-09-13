import * as T from 'three';
import {audioContext,sfxMaster} from '../mira-v2-sfx.js?v=20.3.0';
import {wrapMethod} from './human5-common.js?v=20.3.0';

// Cached, original procedural transients: crack, mechanical action, body and tail.
// No per-shot PCM allocation. A voice cap prevents a firefight from saturating audio.
export function installCombatAudio({camera,props,world}){
  const buffers=new Map(),voices=new Set(),eye=new T.Vector3(),p=new T.Vector3(),right=new T.Vector3(),q=new T.Quaternion();let muted=false;
  function buffer(c,kind){if(buffers.has(kind))return buffers.get(kind);const dur=kind==='orbital'?2.4:kind==='rifle'||kind==='musket'?1.1:kind==='metal'?.65:.48,b=c.createBuffer(1,Math.ceil(c.sampleRate*dur),c.sampleRate),d=b.getChannelData(0);let low=0,seed=kind.length*197+37;
    for(let i=0;i<d.length;i++){const t=i/c.sampleRate;seed=(Math.imul(seed,1664525)+1013904223)|0;const noise=(seed>>>0)/2147483648-1;low+=.09*(noise-low);let x;
      if(['rifle','pistol','shotgun','musket','uzi','sniper'].includes(kind)){const heavy=/shotgun|musket|sniper/.test(kind);x=(noise-low)*Math.exp(-t*95)*.8+low*Math.exp(-t*(heavy?7:12))*1.4+Math.sin(2*Math.PI*(heavy?78:130)*t)*Math.exp(-t*34)*.65;for(const [delay,amp]of [[.034,.24],[.085,.15],[.17,.11],[.31,.07]])if(t>delay)x+=noise*amp*Math.exp(-(t-delay)*26);}
      else if(kind==='metal')x=(Math.sin(t*2*Math.PI*783)+.6*Math.sin(t*2*Math.PI*1327)+.4*Math.sin(t*2*Math.PI*2203))*Math.exp(-t*9)*.3+noise*Math.exp(-t*75)*.25;
      else if(kind==='wood')x=Math.sin(t*2*Math.PI*174)*Math.exp(-t*20)*.65+low*Math.exp(-t*17);
      else if(kind==='glass')x=(noise-low)*Math.exp(-t*9)*(.3+.25*Math.sin(t*213)**2);
      else if(kind==='orbital')x=low*Math.exp(-t*2)*1.8+Math.sin(2*Math.PI*(58*t-8*t*t))*Math.exp(-t*2.4)*.8;
      else if(kind==='whoosh')x=(noise-low)*Math.sin(Math.PI*Math.min(1,t/dur))**2*.22;
      else if(kind==='hoof')x=(Math.sin(t*2*Math.PI*190)*.5+noise*.4)*Math.exp(-t*65);
      else x=(low*.9+Math.sin(t*2*Math.PI*87)*.5)*Math.exp(-t*21)+noise*Math.exp(-t*90)*.25;
      d[i]=Math.tanh(x)*.76;
    }buffers.set(kind,b);return b;
  }
  function play(kind,position,volume=1){if(muted||voices.size>=20)return false;camera.getWorldPosition(eye);const distance=position?eye.distanceTo(position):0;if(distance>160)return false;const c=audioContext();if(!c||c.state!=='running')return false;try{const s=c.createBufferSource(),gain=c.createGain(),pan=c.createStereoPanner(),filter=c.createBiquadFilter();s.buffer=buffer(c,kind);s.playbackRate.value=.96+Math.random()*.08;filter.type='lowpass';filter.frequency.value=Math.max(650,16000/(1+distance*.055));gain.gain.value=Math.min(.9,volume)*.65/(1+(distance/13)**1.5);if(position){right.set(1,0,0).applyQuaternion(camera.getWorldQuaternion(q));p.copy(position).sub(eye).normalize();pan.pan.value=T.MathUtils.clamp(p.dot(right),-1,1);}s.connect(filter);filter.connect(gain);gain.connect(pan);pan.connect(sfxMaster());voices.add(s);s.onended=()=>{s.disconnect();filter.disconnect();gain.disconnect();pan.disconnect();voices.delete(s);};s.start();return true;}catch{return false;}}
  const undo=wrapMethod(props,'impact',old=>function(hit,energy,dir,kind,...rest){const mat=hit.object?.material,tag=hit.object?.userData,material=tag?.materialKind||tag?.piece?.kind;const k=material==='glass'||mat?.transparent&&mat?.opacity<.6?'glass':material==='metal'||mat?.metalness>.45?'metal':material==='wood'?'wood':'impact';play(k,hit.point,Math.min(1,.3+energy/60));return old.call(this,hit,energy,dir,kind,...rest);});
  const api={play,buffer,get voices(){return voices.size;},get muted(){return muted;},set muted(v){muted=!!v;},dispose(){undo();for(const v of voices)try{v.stop();}catch{}buffers.clear();delete world.h6Audio;}};world.h6Audio=api;props.h6Audio=api;return api;
}
