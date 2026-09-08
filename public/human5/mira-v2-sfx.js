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
export function sfxForBreak(kind){if(kind==='glass')return 'glass';if(kind==='metal')return 'metal';if(kind==='wood'||kind==='plaster')return 'wood';return 'impact';}
export function sfxForHit(kind){if(kind==='laser')return 'laser';if(kind==='bullet')return 'impact';if(kind==='cut')return 'whoosh';if(kind==='scuff')return 'thud';return 'thud';}
