// Short deterministic accents supplement the original recordings.
export function hydraCharge(sampleRate=24000){const duration=1.05,a=new Float32Array(Math.ceil(duration*sampleRate));let phase=0;for(let i=0;i<a.length;i++){const t=i/sampleRate,u=t/duration,f=82+360*u*u;phase+=2*Math.PI*f/sampleRate;const env=Math.sin(Math.PI*u)**.8;a[i]=(Math.sin(phase)*.24+Math.sin(phase*2.01)*.08+Math.sin(phase*.5)*.12)*env*(.65+.35*u);}return a;}
export function petChirp(kind,sampleRate=24000){const duration=.42,a=new Float32Array(Math.ceil(duration*sampleRate));let phase=0;for(let i=0;i<a.length;i++){const t=i/sampleRate,u=t/duration,f=(430+kind*73)*(1+.22*Math.sin(u*Math.PI*3));phase+=2*Math.PI*f/sampleRate;a[i]=Math.sin(phase)*Math.sin(Math.PI*u)**2*(.7+.3*Math.cos(u*Math.PI*8))*.18;}return a;}

export function chargeSettings(t){t=Math.max(0,Math.min(1,t));return {bass:43+112*t*t,whine:230+1080*t*t*t,cutoff:180+2400*t*t,volume:.035+.24*t**1.4,noise:.006+.043*t*t};}
export function chargeNoise(sampleRate=24000){const a=new Float32Array(sampleRate);let seed=5124;for(let i=0;i<a.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;a[i]=(seed/4294967296*2-1)*.45;}return a;}
export function plasmaImpact(radius=3,sampleRate=24000){
 const scale=Math.sqrt(Math.max(.3,radius)),duration=.6+scale*.43,a=new Float32Array(Math.ceil(duration*sampleRate));let seed=941,low=0,phase=0,chirp=0,held=0;
 for(let i=0;i<a.length;i++){const t=i/sampleRate,u=t/duration;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/4294967296*2-1;low+=.045/(1+scale*.2)*(noise-low);
  if(i%Math.max(1,Math.floor(2+u*11))===0)held=Math.round(noise*14)/14;
  phase+=Math.PI*2*(32+80*Math.exp(-t*8)/Math.max(1,scale*.3))/sampleRate;
  chirp+=Math.PI*2*(90+1700*Math.exp(-t*(13/Math.max(1,scale*.3))))/sampleRate;
  const attack=1-Math.exp(-t*420),end=Math.min(1,(1-u)*14),body=Math.exp(-t/(.14+scale*.095));
  a[i]=Math.tanh((Math.sin(phase)*.42+low*2.1+held*.20*Math.exp(-t*7)+Math.sin(chirp)*.21*Math.exp(-t*9))*1.2)*body*attack*end*.88;
 }return a;
}
export function screenCue(kind,sampleRate=24000){const duration=kind==='boat'?.7:.38,a=new Float32Array(Math.ceil(duration*sampleRate));for(let i=0;i<a.length;i++){const t=i/sampleRate,u=t/duration,base=kind==='boat'?147:kind==='car'?420:720,envelope=Math.sin(Math.PI*u)**2*(kind==='car'?(Math.sin(t*40)>-.2?1:.1):1);a[i]=(Math.sin(t*6.283*base)*.15+Math.sin(t*6.283*base*1.26)*.075)*envelope;}return a;}
// Eight related notes vary each pickup while overlapping into a consonant chord.
export function fragmentChime(kind=0,sampleRate=24000){const notes=[0,2,4,7,9,12,14,16],frequency=523.251*2**(notes[kind%8]/12),duration=.48,a=new Float32Array(Math.ceil(duration*sampleRate));
 for(let i=0;i<a.length;i++){const t=i/sampleRate,envelope=(1-Math.exp(-t*600))*Math.exp(-t*9)*Math.min(1,(duration-t)*40);a[i]=(Math.sin(t*Math.PI*2*frequency)*.24+Math.sin(t*Math.PI*2*frequency*2.004)*.065*Math.exp(-t*12)+Math.sin(t*Math.PI*2*frequency*3)*.025)*envelope;}return a;}
export function slashCrackle(sampleRate=24000){const a=new Float32Array(Math.floor(sampleRate*.32));let seed=97,phase=0;
 for(let i=0;i<a.length;i++){const t=i/sampleRate,u=i/a.length;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/4294967296*2-1;phase+=2*Math.PI*(160+1800*(1-u)**3)/sampleRate;const gate=Math.sin(t*2*Math.PI*73)>.73?1:.16;a[i]=(noise*gate*.42+Math.sin(phase)*.13)*(1-Math.exp(-t*500))*Math.exp(-t*12)*(1-u);}return a;}
