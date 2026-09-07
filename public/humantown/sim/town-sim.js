import {createTown,advanceClock,selected} from './state.js';
import {tickMotives} from './motives.js';
import {SmartObjects} from '../objects/smart.js';
import {Orders} from './orders.js';
export class TownSim {
 constructor(state=createTown()){this.state=state;state.checkpoints=2;this.systems=[];this.accumulator=0;this.objects=new SmartObjects(state);this.orders=new Orders(state,this.objects);}
 get selected(){return selected(this.state);}
 use(fn){this.systems.push(fn);}
 step(realDt=.25){if(this.state.paused)return;const rate=Math.max(.25,Math.min(4,Number(this.state.rate)||1)),dt=realDt*rate;advanceClock(this.state,dt);this.orders.tick(dt);tickMotives(this.state,dt,realDt);for(const n of this.state.npcs)if(!n.alive)this.orders.cancel(n,false);for(const fn of this.systems)fn(this.state,dt,realDt);this.state.version++;}
 tick(dt){if(this.state.paused){this.accumulator=0;return;}if(!Number.isFinite(dt)||dt<=0)return;this.accumulator+=Math.min(dt,1);while(this.accumulator>=.25-1e-9){this.step(.25);this.accumulator=Math.max(0,this.accumulator-.25);}}
}
