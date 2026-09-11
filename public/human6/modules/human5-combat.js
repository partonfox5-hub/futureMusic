import * as T from 'three';
import {wrapMethod,clamp,V} from './human5-common.js?v=17.2.0';

export const ARMOR_PRESETS={
 none:{name:'None',mass:0,plates:{}},
 leather:{name:'Leather & buckler',mass:7,plates:{torso:65,armL:30,armR:30},shield:55,color:0x654c34},
 tactical:{name:'Tactical vest & helmet',mass:12,plates:{torso:120,head:65},color:0x283b35},
 riot:{name:'Heavy protective armor',mass:22,plates:{torso:180,head:100,armL:60,armR:60,legL:70,legR:70},shield:140,color:0x303944},
 plate:{name:'Steel plate armor',mass:25,plates:{torso:160,head:90,armL:70,armR:70,legL:90,legR:90},shield:100,color:0x879299}
};
export function hitRegion(name=''){
 const side=/^L|Left/i.test(name)?'L':'R';
 if(/head|neck|eye|jaw|skull/i.test(name))return 'head';
 if(/arm|hand|wrist|shoulder|finger/i.test(name))return 'arm'+side;
 if(/thigh|calf|shin|foot|toe|hip_[LR]/i.test(name))return 'leg'+side;
 return 'torso';
}
/** Durability consumes incoming game energy. Body penetration starts on the breaking hit. */
export class ArmorState {
 constructor(id='none'){this.equip(id);}
 equip(id){if(!ARMOR_PRESETS[id])throw new TypeError('Unknown armor');this.id=id;this.plates={...ARMOR_PRESETS[id].plates};this.shield=ARMOR_PRESETS[id].shield||0;}
 get mass(){return ARMOR_PRESETS[this.id].mass;}
 absorb(region,energy,front=false){energy=Number.isFinite(energy)?Math.max(0,energy):0;const initial=energy;let absorbed=0;
  if(front&&this.shield>0){const d=Math.min(energy,this.shield);this.shield-=d;energy-=d;absorbed+=d;}
  const durability=this.plates[region]||0,d=Math.min(energy,durability);if(durability>0)this.plates[region]-=d;energy-=d;absorbed+=d;
  return {energy,absorbed,covered:absorbed>0,impulse:initial?clamp(1-absorbed/initial*.76,.24,1):0};
 }
 snapshot(){return {id:this.id,plates:{...this.plates},shield:this.shield,mass:this.mass};}
}

export function installCombat({world,mira,props,camera,rig,renderer}={}){
 if(world.h5Combat)return world.h5Combat;
 const states=new Map(),restores=[],player={health:100,invincible:false,armor:new ArmorState(),velocity:V(),hurt:0};let allInvincible=false;
 const isProtected=a=>!!a&&(allInvincible||!!a.h5Invincible);
 const resolve=hit=>hit?.actor||hit?.object?.userData?.h5Armor?.actor||hit?.object?.userData?.cloth?.actor||props.actorFor(hit?.object)||props.dogFor(hit?.object);
 function attach(a){if(!a||states.has(a))return states.get(a);const s={actor:a,health:100,armor:new ArmorState(),meshes:[],restores:[],impulse:1};states.set(a,s);a.h5Combat=s;
  for(const key of ['applyStrike','knockDown','die'])if(typeof a[key]==='function')s.restores.push(wrapMethod(a,key,old=>function(){if(isProtected(a))return false;return old.apply(this,arguments);}));
  return s;
 }
 function clearMeshes(s){for(const m of s.meshes){m.removeFromParent();m.geometry.dispose();m.material.dispose();}s.meshes=[];}
 function equip(a,id){if(a==='player'){player.armor.equip(id);return true;}const s=attach(a);if(!s)return false;s.armor.equip(id);clearMeshes(s);if(id==='none'||a.version!=='v2')return true;
  const bones=a.bones||{},skin=[];a.root.traverse(o=>{if(o.isSkinnedMesh&&o.skeleton&&!skin.length)skin.push(o);});if(!skin.length)return true;const sk=skin[0].skeleton;
  const boneFor=r=>{const choices=r==='head'?['Head']:r==='torso'?['Spine02','Spine01','Spine']:r.startsWith('arm')?[r.endsWith('L')?'L_UpperArm':'R_UpperArm',r.endsWith('L')?'L_ForeArm':'R_ForeArm']: [r.endsWith('L')?'L_Calf':'R_Calf',r.endsWith('L')?'L_Thigh':'R_Thigh'];return choices.map(k=>bones[k]||sk.bones.find(b=>b.name.toLowerCase()===k.toLowerCase())).find(Boolean);};
  const rest=b=>{const i=sk.bones.indexOf(b);return i>=0?V().setFromMatrixPosition(sk.boneInverses[i].clone().invert()):V();};
  for(const region of Object.keys(s.armor.plates)){
   const b=boneFor(region);if(!b)continue;const center=rest(b),head=region==='head',torso=region==='torso';
   const size=head?[.112,.125,.112]:torso?[.205,.195,.139]:[.076,.14,.077];
   if(torso)center.y+=.07;else if(head)center.y+=.055;else center.y-=.055;
   const g=new T.SphereGeometry(1,12,8,0,Math.PI*2,0,head?Math.PI*.62:Math.PI);g.scale(...size);g.translate(...center.toArray());g.applyMatrix4(sk.boneInverses[sk.bones.indexOf(b)]);
   const mat=new T.MeshStandardMaterial({color:ARMOR_PRESETS[id].color,metalness:id==='plate'?.75:.12,roughness:id==='plate'?.4:.88,side:T.DoubleSide});const m=new T.Mesh(g,mat);m.name='Armor '+region;m.userData.h5Armor={actor:a,region};m.castShadow=true;b.add(m);s.meshes.push(m);
  }
  if(s.armor.shield){const b=boneFor('armL');if(b){const g=new T.CylinderGeometry(.24,.24,.032,12);g.rotateX(Math.PI/2);const p=rest(b);p.y-=.28;p.z+=.15;g.translate(...p.toArray());g.applyMatrix4(sk.boneInverses[sk.bones.indexOf(b)]);const m=new T.Mesh(g,new T.MeshStandardMaterial({color:ARMOR_PRESETS[id].color,metalness:.5,roughness:.65}));m.userData.h5Armor={actor:a,region:'shield'};b.add(m);s.meshes.push(m);}}
  return true;
 }
 function defend(a,hit,energy,dir){const s=attach(a);if(isProtected(a))return {energy:0,absorbed:energy,impulse:0,invincible:true};
  const nearest=a.nearestHit?.(hit.point,.6),region=hit.object?.userData?.h5Armor?.region||hitRegion(nearest?.name||nearest?.bone?.name);
  const front=dir?.dot(new T.Vector3(0,0,1).applyQuaternion(a.root.getWorldQuaternion(new T.Quaternion())))<-.35;
  const result=s.armor.absorb(region==='shield'?'armL':region,energy,front);s.impulse=result.impulse;s.health=Math.max(0,s.health-result.energy*.65);return result;
 }
 const impact=props.impact;
 restores.push(wrapMethod(props,'impact',old=>function(hit,energy,dir,kind,sharpness){const a=resolve(hit);if(!a)return old.apply(this,arguments);if(isProtected(a))return {invincible:true};const result=defend(a,hit,energy,dir);const marked={...hit,h5Defended:true};
  if(result.energy<=0){props.impulseTarget(a,dir,energy,hit.weaponId);props.status='Armor absorbed impact';return result;}
  const value=old.call(this,marked,result.energy,dir,kind,sharpness);if(attach(a).health<=0)a.die?.();return value;
 }));
 if(props.injuries){restores.push(wrapMethod(props.injuries,'impact',old=>function(a,hit,energy,kind,dir,id){if(isProtected(a))return {invincible:true};if(!hit.h5Defended){const d=defend(a,hit,energy,dir);if(d.energy<=0)return d;energy=d.energy;}return old.call(this,a,hit,energy,kind,dir,id);}));
  for(const key of ['sever','severDog'])if(typeof props.injuries[key]==='function')restores.push(wrapMethod(props.injuries,key,old=>function(a){if(isProtected(a))return false;return old.apply(this,arguments);}));
 }
 restores.push(wrapMethod(props,'impulseTarget',old=>function(a,dir,energy,id){if(isProtected(a))return;const s=attach(a),f=s.impulse??1;if(f>.98)return old.apply(this,arguments);const before=a.root.position.clone();old.call(this,a,dir,Math.min(energy,9),undefined);a.root.position.lerpVectors(before,a.root.position,f);s.impulse=1;}));
 function playerHit(energy,dir,region='torso') {if(player.invincible||!(energy>0)||player.health<=0)return false;const front=!!dir&&dir.dot(camera.getWorldDirection(V()))<-.25;const r=player.armor.absorb(region,energy,front);player.health=Math.max(0,player.health-r.energy);player.hurt=1;if(dir)player.velocity.addScaledVector(dir,Math.min(1.25,energy*.018)*r.impulse/(1+player.armor.mass/65));return r;}
 const api={states,player,attach,equip,resolve,isProtected,defend,playerHit,
  get allInvincible(){return allInvincible;},set allInvincible(v){allInvincible=!!v;},
  setInvincible(a,v){if(a==='all')allInvincible=!!v;else if(a==='player')player.invincible=!!v;else if(a){attach(a);a.h5Invincible=!!v;}},
  speedScale(a='player'){return 1/Math.sqrt(1+(a==='player'?player.armor.mass:attach(a)?.armor.mass||0)/40);},
  heal(a){if(a==='player'){player.health=100;player.velocity.setScalar(0);return true;}const s=attach(a);if(!s)return false;props.injuries?.heal(a);a.dead=false;if(a._ai){a._ai.dead=false;a._ai.hurt=false;}if(a.balance){a.balance.state='recovering';a.balance.time=0;}s.health=100;return true;},
  tick(dt){for(const a of [...mira.actors,...(props.dogs?.list?.()||[])])attach(a);for(const [a,s]of states){if(!a.group?.parent&&!a.root?.parent){clearMeshes(s);s.restores.reverse().forEach(f=>f());states.delete(a);continue;}for(const m of s.meshes){const r=m.userData.h5Armor.region,d=r==='shield'?s.armor.shield:s.armor.plates[r];m.visible=d>0;}}
   player.hurt=Math.max(0,player.hurt-dt);if(player.invincible)player.velocity.setScalar(0);if(player.velocity.lengthSq()>.0001){const obj=renderer.xr.isPresenting?rig:camera,delta=player.velocity.clone().multiplyScalar(Math.min(.05,dt));obj.position.add(delta);player.velocity.multiplyScalar(Math.exp(-8*dt));}
  },
  snapshot(){return {allInvincible,player:{health:player.health,armor:player.armor.snapshot()},actors:[...states].map(([a,s])=>({name:a.displayName,health:s.health,invincible:isProtected(a),armor:s.armor.snapshot()}))};},
  dispose(){restores.reverse().forEach(f=>f());for(const s of states.values()){clearMeshes(s);s.restores.reverse().forEach(f=>f());delete s.actor.h5Combat;}states.clear();delete world.h5Combat;}
 };world.h5Combat=api;return api;
}
