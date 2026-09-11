import { clamp } from './Dog.js?v=17.2.0';
export class DogAnim {
 constructor(model,paws,jaw,tail,ai,bark){Object.assign(this,{model,paws,jaw,tail,ai,bark});this.time=0;this.wag=0;this.nextBurst=8+Math.random()*10;this.sit=0;this.down=0;this.forage=0;this.bow=0;}
 tick(dt){
  this.time+=dt;const b=this.model.bones,ai=this.ai,h=ai.handle;
  h.needs.tick(dt,{state:ai.state,speed:ai.speed,dead:ai.dead});h._bite.tick(dt);ai.tick(dt);const state=ai.state,n=h.needs;
  if(this.time>=this.nextBurst){if(n.energy>40)ai.startBurst();this.nextBurst=this.time+14+Math.random()*14;}
  if(!ai.dead&&!ai.held&&n.energy>50&&ai.clock-ai.lastBark>8&&state==='idle'&&Math.random()<dt*.018)ai.say('ambient',8);
  const sitting=state==='sit',lying=state==='sleep'||state==='chew'||ai.dead,feeding=['eat','pickup','eat-bag'].includes(state);
  this.sit+=((sitting?1:0)-this.sit)*Math.min(1,dt*5);this.down+=((lying?1:0)-this.down)*Math.min(1,dt*4);this.forage+=((feeding?1:0)-this.forage)*Math.min(1,dt*6);
  this.bow+=((state==='play-bow'?1:0)-this.bow)*Math.min(1,dt*8);
  const moving=clamp(ai.speed/.65),sway=Math.sin(this.time*8.2)*moving;
  b.Spine.position.y=.445+Math.sin(this.time*2.5)*.006-this.sit*.11-this.down*.245-this.forage*.28-this.bow*.02;
  b.Spine.rotation.set(-this.sit*.3-this.down*.12+this.forage*.13+this.bow*.32,clamp(ai.pathBend*.40+ai.bodyYaw,-.3,.3),sway*.045,'XYZ');
  b.Chest.rotation.set(this.sit*.20+this.down*.1+this.forage*.10+this.bow*.25,clamp(ai.pathBend*.34+ai.lookYaw*.045,-.27,.27),-sway*.035,'XYZ');
  if(ai.speed<.02)ai.pathBend*=Math.exp(-dt*4);
  this.model.root.updateMatrixWorld(true);ai.poseLook();this.model.setEars?.(ai.hurt?.9:state==='sleep'?1:state==='chew'?.55:0);
  this.model.root.updateMatrixWorld(true);
  ai.ctx.props?.water?.stepDog(h,dt);
  if(this.model.root.userData.waterSwimming){
   const p=h.waterPaddle??Math.sin(this.time*9);for(const s of ['L','R']){const k=s==='L'?1:-1;b[`${s}_UpperArm`].rotation.x=p*k*.45;b[`${s}_Thigh`].rotation.x=-p*k*.4;}
  }else this.paws.tick(this.time,lying?'sleep':sitting?'sit':state,moving,ai.pathBend);
  this.jaw.activity=state==='eat'||state==='chew'?.24+.22*Math.sin(this.time*12):state==='drink'?.35+.12*Math.sin(this.time*15):state==='pant'||state==='zoomie'?.4:0;
  if(['eat-bag','destroy','snap'].includes(state))h._bite.snap(ai.interest);
  this.jaw.tick(dt);
  let amount=state==='greet'||state==='fetch-return'?.9:state==='fetch'||state==='carry'?.75:state==='alert'?.10:.18;
  if(n.restless||n.sleep<18)amount=.07;if(ai.hurt||ai.dead||state==='sleep')amount=0;
  this.tail.tick(dt,this.time,Math.max(amount,this.wag),state,{hurt:ai.hurt,sleepy:n.sleep<18,hungry:n.restless,greeting:state==='greet'||state==='fetch-return'});
  this.model.root.updateMatrixWorld(true);
 }
}
