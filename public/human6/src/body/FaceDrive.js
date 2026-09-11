const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);},damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
export function blinkEnvelope(t,close=.09,hold=.03,open=.175){if(t<0)return 0;if(t<close)return smooth(t/close);if(t<close+hold)return 1;return 1-smooth((t-close-hold)/open);}
// Behavior controls only morph weights and timing. No prompt text drives vertices.
export class FaceDrive {
 constructor(actor,{random=Math.random,blinkRate=15,gazeHold=1.8,asymmetry=.08,duchenne=true,poseWeights={}}={}){
  this.actor=actor;this.random=random;this.behavior={blinkRate,gazeHold,asymmetry,duchenne,poseWeights};this.time=0;this.nextBlink=1+random()*3;this.blinkAge=Infinity;this.close=.09;this.hold=.03;this.open=.175;this.sign=random()<.5?-1:1;this.lag=.008;this.history=[];this.state={L:{smile:0,cheek:0,dimple:0},R:{smile:0,cheek:0,dimple:0}};this.crease={value:0};
 }
 configure(p={}){
  for(const key of ['blinkRate','gazeHold','asymmetry'])if(Number.isFinite(p[key]))this.behavior[key]=p[key];
  this.behavior.blinkRate=Math.max(3,Math.min(35,this.behavior.blinkRate));this.behavior.gazeHold=Math.max(.3,Math.min(8,this.behavior.gazeHold));this.behavior.asymmetry=Math.max(0,Math.min(.15,this.behavior.asymmetry));
  if(typeof p.duchenne==='boolean')this.behavior.duchenne=p.duchenne;
  if(p.poseWeights&&typeof p.poseWeights==='object')this.behavior.poseWeights={...p.poseWeights};
 }
 blink(){this.blinkAge=0;this.close=.08+this.random()*.02;this.hold=.02+this.random()*.02;this.open=.15+this.random()*.05;this.lag=.004+this.random()*.007;this.nextBlink=60/Math.max(3,this.behavior.blinkRate)*(.65+this.random()*.7);}
 tick(dt){
  const a=this.actor,w=a.want,cur=a.cur;dt=Math.min(.05,Math.max(0,dt));this.time+=dt;this.nextBlink-=dt;this.blinkAge+=dt;if(this.nextBlink<=0&&this.blinkAge>this.close+this.hold+this.open+.02)this.blink();
  for(const [key,value] of Object.entries(this.behavior.poseWeights))if(key in w&&Number.isFinite(value))w[key]=clamp(w[key]*Math.max(0,Math.min(2,value)));
  this.history.push({t:this.time,L:clamp(w.Mouth_Smile_L||0),R:clamp(w.Mouth_Smile_R||0)});while(this.history.length>2&&this.history[1].t<this.time-.12)this.history.shift();
  const when=this.time-.10;let delayed={L:0,R:0};for(let i=0;i<this.history.length;i++){const p=this.history[i];if(p.t<=when)delayed=p;else{if(i>0){const q=this.history[i-1],f=clamp((when-q.t)/(p.t-q.t));delayed={L:q.L+(p.L-q.L)*f,R:q.R+(p.R-q.R)*f};}break;}}
  let smile=0,dimple=0,cheek=0;
  for(const side of ['L','R']){
   const s=this.state[side],asym=1+(side==='L'?-1:1)*this.sign*this.behavior.asymmetry*.5;
   s.cheek=damp(s.cheek,clamp((w['Cheek_Raise_'+side]||0)*asym),16,dt);
   s.smile=damp(s.smile,clamp(delayed[side]*asym),14,dt);
   s.dimple=damp(s.dimple,clamp((w['Mouth_Dimple_'+side]||0)*smooth((s.smile-.5)/.35)*asym),10,dt);
   w['Cheek_Raise_'+side]=s.cheek;w['Mouth_Smile_'+side]=s.smile;w['Mouth_Dimple_'+side]=s.dimple;
   const joyful=['happy','laugh','content','flirty','tease'].includes(a.emotion?.name);
   if(joyful)w['Eye_Squint_'+side]=this.behavior.duchenne?clamp((w['Eye_Squint_'+side]||0)*smooth(s.smile/.65)):0;
   const down=clamp((w['Eye_'+side+'_Look_Down']||0)/.154),up=clamp((w['Eye_'+side+'_Look_Up']||0)/.154),rest=clamp((w['Eye_Blink_'+side]||0)*(1-.45*up)+down*.16);
   const blink=blinkEnvelope(this.blinkAge-(side==='R'?this.lag:0),this.close,this.hold,this.open);
   w['Eye_Blink_'+side]=Math.max(rest,blink);w['Eye_Wide_'+side]=clamp(((w['Eye_Wide_'+side]||0)+up*.11-down*.08)*(1-blink));
   // These channels already have a physical envelope. Avoid a second 9/s filter.
   for(const key of ['Mouth_Smile_','Mouth_Dimple_','Cheek_Raise_','Eye_Blink_','Eye_Wide_'])cur[key+side]=w[key+side];
   smile+=s.smile*.5;dimple+=s.dimple*.5;cheek+=s.cheek*.5;
  }
  this.crease.value=clamp(.7*smile+.5*dimple+.3*cheek);
 }
}
