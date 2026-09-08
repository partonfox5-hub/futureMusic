import { clamp } from './Dog.js?v=12.1';
export class DogAnim {
  constructor(model,paws,jaw,tail,ai,bark){this.model=model;this.paws=paws;this.jaw=jaw;this.tail=tail;this.ai=ai;this.bark=bark;this.time=0;this.wag=0;this.wagUntil=2.5;this.nextBurst=5+Math.random()*4;this.nextBark=.6+Math.random()*.6;this.sit=0;}
  tick(dt){
    this.time+=dt;
    const b=this.model.bones,ai=this.ai;
    if(ai.dead){this.sit=Math.min(1,this.sit+dt*2.2);this.wag=0;ai.tick(dt);b.Spine.position.y=.445-this.sit*.10;b.Spine.rotation.x=-this.sit*.28;b.Chest.rotation.x=this.sit*.16;this.model.root.updateMatrixWorld(true);this.paws.tick(this.time,'sit',0);this.jaw.tick(dt);this.tail.tick(dt,this.time,0,'sit');this.model.root.updateMatrixWorld(true);return;}
    if(ai.held){if(this.time>=this.nextBark){this.bark();this.nextBark=this.time+.28+Math.random()*.22;}this.wag=1;}
    else if(this.time>=this.nextBark){this.bark();this.nextBark=this.time+5+Math.random()*4;}
    if(this.time>=this.nextBurst){this.wagUntil=this.time+.65+Math.random()*.8;this.nextBurst=this.time+6+Math.random()*8;}
    ai.tick(dt);const state=ai.state;
    this.sit+=((state==='sit'?1:0)-this.sit)*Math.min(1,dt*4);
    const sway=Math.sin(this.time*Math.PI*1.6)*clamp(ai.speed/.58);
    b.Spine.position.y=.445+Math.sin(this.time*Math.PI*.8)*.010-this.sit*.11;
    b.Spine.rotation.x=-this.sit*.32+ai.lookPitch*.12;
    b.Spine.rotation.y=ai.bodyYaw*.55+ai.turn*.18;
    b.Spine.rotation.z=sway*.08+ai.lookRoll*.12;
    b.Chest.rotation.x=this.sit*.22+ai.lookPitch*.16;
    b.Chest.rotation.y=ai.bodyYaw*.45;
    b.Chest.rotation.z=-sway*.06+ai.lookRoll*.18;
    this.model.root.updateMatrixWorld(true);this.paws.tick(this.time,state,clamp(ai.speed/.58));
    this.jaw.tick(dt);
    this.tail.tick(dt,this.time,Math.max(this.wag,this.time<this.wagUntil?.88:0),state);
    this.model.root.updateMatrixWorld(true);
  }
}
