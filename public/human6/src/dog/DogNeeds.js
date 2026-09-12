import { clamp } from './Dog.js?v=19.3.0';

// All four meters measure reserves: zero hunger means starving.
export class DogNeeds {
 constructor(){this.hunger=55;this.thirst=55;this.sleep=70;this.energy=70;}
 tick(dt,{state='idle',speed=0,dead=false}={}){
  if(dead||!Number.isFinite(dt)||dt<=0)return;
  this.hunger=clamp(this.hunger-dt*1.2/60,0,100);
  this.thirst=clamp(this.thirst-dt*1.6/60,0,100);
  const sleeping=state==='sleep';
  this.sleep=clamp(this.sleep+dt*(sleeping?3.5:-.8/60),0,100);
  this.energy=clamp(this.energy+dt*(sleeping?5:state==='pant'?1.5:speed>1? -4:speed>.05?-.18:.12),0,100);
 }
 eat(count=1){const n=Math.max(0,Math.floor(count));this.hunger=clamp(this.hunger+10*n,0,100);this.energy=clamp(this.energy+3*n,0,100);return n;}
 drink(dt){this.thirst=clamp(this.thirst+28*Math.max(0,dt),0,100);}
 spend(amount){if(this.energy<amount)return false;this.energy=clamp(this.energy-amount,0,100);return true;}
 get restless(){return this.hunger<12||this.thirst<10;}
 get obedience(){return this.restless?.3:this.energy<20?.65:1;}
}
