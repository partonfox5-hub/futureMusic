import {clamp} from '../sim/state.js';
export const RELIEF_THRESHOLDS=Object.freeze({sleep:{energy:35},toilet:{bladder:35},shower:{hygiene:45}});
// Definitions contain behavior; world records contain only serializable data.
export class SmartObjects {
 constructor(state){this.state=state;this.types=new Map();}
 define(type,ads){if(!type||!Array.isArray(ads))throw Error('Invalid object definition');this.types.set(type,ads.map(a=>({...a,duration:Math.max(.25,a.duration||1)})));return this;}
 add(object){if(!object.id||!this.types.has(object.type)||this.state.objects.some(o=>o.id===object.id))throw Error('Unknown object type or duplicate ID');if(!Number.isFinite(object.pos?.x)||!Number.isFinite(object.pos?.z))throw Error('Object needs a position');const record={capacity:1,reservations:[],...object};record.capacity=Math.max(1,Math.floor(record.capacity));record.reservations=[];this.state.objects.push(record);return record;}
 get(id){return this.state.objects.find(o=>o.id===id);}
 ad(object,verb){return this.types.get(object?.type)?.find(a=>a.verb===verb);}
 check(n,object,ad,{occupied=true}={}){if(!n?.alive)return 'Resident is deceased';if(!object||!ad||object.disabled)return 'Interaction unavailable';if(object.owner&&object.owner!==n.id&&!object.public&&!object.allowed?.includes(n.id))return 'Permission required';for(const [key,limit] of Object.entries({...RELIEF_THRESHOLDS[ad.verb],...ad.below}))if(n.needs[key]>=limit)return `${key} must be below ${limit}`;if(ad.food&&!(object.inventory||[]).some(i=>i.kind==='food'&&i.quantity>0))return 'No food available';const reason=ad.precondition?.(n,object,this.state);if(reason)return typeof reason==='string'?reason:'Requirements not met';if(occupied&&(object.reservations||[]).filter(id=>id!==n.id).length>=object.capacity)return 'Occupied';return null;}
 ads(n){return this.state.objects.flatMap(o=>(this.types.get(o.type)||[]).map(a=>({objectId:o.id,verb:a.verb,motives:{...a.motives},duration:a.duration,distance:Math.hypot(n.pos.x-o.pos.x,n.pos.z-o.pos.z),reason:this.check(n,o,a)})));}
 reserve(n,object,ad){const reason=this.check(n,object,ad);if(reason)return reason;object.reservations??=[];if(!object.reservations.includes(n.id))object.reservations.push(n.id);return null;}
 release(n){for(const o of this.state.objects)o.reservations=(o.reservations||[]).filter(id=>id!==n.id);}
 remove(id){this.state.objects=this.state.objects.filter(o=>o.id!==id);}
 fill(n,ad,dt){for(const [key,amount] of Object.entries(ad.motives||{}))if(key!=='comfort'&&key in n.needs)n.needs[key]=clamp(n.needs[key]+amount*dt/ad.duration);}
}
