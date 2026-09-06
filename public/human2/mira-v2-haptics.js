// Optional XR controller output. Unsupported actuators are a quiet no-op.
// A hand's contacts are coalesced, capped, and rate-limited; no sustained rumble.
export class ContactHaptics {
 constructor(renderer){this.renderer=renderer;this.time=0;this.last=[-1,-1];this.pending=[0,0];this.duration=[0,0];}
 advance(dt){this.time+=Math.min(.05,Math.max(0,dt));}
 contact(i,kind,speed=0,depth=0){
  const base=kind==='hair'?.010:kind==='head'?.018:kind==='prop'?.026:.020;
  const strength=Math.min(.065,base+Math.min(2,Math.max(0,speed))*.015+Math.min(.02,Math.max(0,depth))*.45);
  this.pending[i]=Math.max(this.pending[i],strength);this.duration[i]=Math.max(this.duration[i],kind==='hair'?10:18);
 }
 flush(handedness){
  const session=this.renderer.xr.getSession?.();
  for(let i=0;i<2;i++){
   const strength=this.pending[i],duration=this.duration[i];this.pending[i]=this.duration[i]=0;
   if(!session||!strength||this.time-this.last[i]<.12)continue;
   const source=Array.from(session.inputSources||[]).find(s=>s.handedness===handedness[i]&&!s.hand),gamepad=source?.gamepad;
   const actuator=gamepad?.hapticActuators?.[0]||gamepad?.vibrationActuator;if(!actuator)continue;
   this.last[i]=this.time;
   try{
    const result=typeof actuator.pulse==='function'?actuator.pulse(strength,duration):typeof actuator.playEffect==='function'?actuator.playEffect('dual-rumble',{startDelay:0,duration,weakMagnitude:strength,strongMagnitude:0}):null;
    result?.catch?.(()=>{});
   }catch{ /* Browser/driver may decline a vibration during session teardown. */ }
  }
 }
}
