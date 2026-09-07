import { clamp } from './Dog.js?v=12.1';
export class DogAnim {
  constructor(model,paws,jaw,tail,ai,bark){this.model=model;this.paws=paws;this.jaw=jaw;this.tail=tail;this.ai=ai;this.bark=bark;this.time=0;this.wag=0;this.wagUntil=2.5;this.nextBurst=5+Math.random()*4;this.nextBark=.6+Math.random()*.6;this.sit=0;}
  tick(dt){
    this.time+=dt;
    if(this.ai.held){if(this.time>=this.nextBark){this.bark();this.nextBark=this.time+.28+Math.random()*.22;}this.wag=1;}
    else if(this.time>=this.nextBark){this.bark();this.nextBark=this.time+5+Math.random()*4;}
    if(this.time>=this.nextBurst){this.wagUntil=this.time+.65+Math.random()*.8;this.nextBurst=this.time+6+Math.random()*8;}
    this.ai.tick(dt);const state=this.ai.state;
    this.sit+=((state==='sit'?1:0)-this.sit)*Math.min(1,dt*4);
    const b=this.model.bones;
    // Hips move 10 mm at 0.4 Hz; planted paws solve against the actual floor.
    b.Spine.position.y=.445+Math.sin(this.time*Math.PI*.8)*.010-this.sit*.09;
    b.Spine.rotation.x=-this.sit*.18;
    b.Chest.rotation.x=this.sit*.20;
    b.Neck.rotation.x=state==='alert'?-.08:0;
    this.model.root.updateMatrixWorld(true);this.paws.tick(this.time,state,clamp(this.ai.speed/.58));
    this.jaw.tick(dt);
    this.tail.tick(dt,this.time,Math.max(this.wag,this.time<this.wagUntil?.88:0),state);
    this.model.root.updateMatrixWorld(true);
  }
}
