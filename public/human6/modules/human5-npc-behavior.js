import * as T from 'three';
import {GARMENTS} from '../mira-v2-wardrobe.js?v=17.8.0';
import {WEAPONS} from '../mira-v2-props.js?v=17.8.0';
import {CITY_BLOCKS,ROUTES} from './human5-worldfield.js?v=17.8.0';
import {V,rng,wrapMethod,clamp} from './human5-common.js?v=17.8.0';

export const NPC_ROLES={
 bandit:{name:'Bandit',weapon:'sword',armor:'leather',top:'fieldShirt',bottom:'workPants',color:0x594934,range:1.8,damage:9,cooldown:1.4},
 terrorist:{name:'Fictional insurgent',weapon:'rifle',armor:'tactical',top:'fieldShirt',bottom:'workPants',range:25,damage:8,cooldown:1.1},
 swat:{name:'SWAT',weapon:'rifle',armor:'riot',top:'tacticalShirt',bottom:'tacticalPants',range:28,damage:8,cooldown:.9},
 redcoat:{name:'Redcoat',weapon:'musket',armor:'none',top:'redcoat',bottom:'suitPants',range:28,damage:24,cooldown:8},
 zombie:{name:'Zombie',weapon:null,armor:'none',top:'tornShirt',bottom:'workPants',range:1.45,damage:6,cooldown:1.7},
 gangster:{name:'Gangster',weapon:'pistol',armor:'none',top:'streetShirt',bottom:'jeans',range:17,damage:8,cooldown:1.5},
 pedestrian:{name:'Pedestrian',weapon:null,armor:'none',top:'suitJacket',bottom:'suitPants',range:0,damage:0,cooldown:2}
};
export const NPC_MODES=['still','wander','passive','hunt player'];
export const FOLLOWER_ORDERS=['follow','stay','guard','patrol','go here','fetch','attack target','dismiss'];

/** Planning is staggered at 5Hz. All bodies, grabs, injuries and locomotion remain host actors. */
export function installNPCBehavior({mira,props,world,wardrobe,camera,combat,quest=true}={}){
 const brains=new Map(),random=rng(62734),maxActive=quest?6:10;let time=0,serial=0,selectedRole='bandit',selectedMode='still',location='here',pendingPoint=null,planning=false;
 function stop(a){a.navigation=null;a.dest=null;a.directedWalk=null;a.autoWander=false;a.setMode?.('idle');}
 function setGoal(a,p){if(!p||a.held||a.dead)return false;const s=brains.get(a);if(s&&s.lastGoal?.distanceTo(p)<.6&&a.navigation)return true;const selected=mira.selected;let ok;planning=true;try{ok=mira.walkTo(p,a);}finally{planning=false;if(selected)mira.select(selected);}if(s)s.lastGoal=p.clone();return ok;}
 function attach(a,{role='pedestrian',mode='passive',hostile=false}={}){if(brains.has(a))return brains.get(a);const b={actor:a,id:++serial,role,mode,hostile,follower:false,order:'stay',home:a.group.position.clone(),plan:random()*.2,attack:0,lastSeen:null,lost:0,lastGoal:null,phase:random()*6.28,frozen:0};brains.set(a,b);a.h5Brain=b;b.restore=wrapMethod(a,'tick',old=>function(){if(b.frozen>0)return;const r=old.apply(this,arguments);if(b.lookPoint&&!a.dead&&!a.held&&a.solveChain){const hand=a.group.localToWorld(new T.Vector3(.19,1.23,.38)),pole=a.group.localToWorld(new T.Vector3(.5,1.0,.05));a.solveChain('R','arm',hand,pole);a.root.updateMatrixWorld(true);}return r;});combat.attach(a);a.autoWander=false;return b;}
 function pointFor(where='here') {const region=world.h5OpenWorld;let p=camera.getWorldPosition(V()),forward=camera.getWorldDirection(V()).setY(0).normalize();p.addScaledVector(forward,3);if(where==='woods')p.set(-145,0,-115);else if(where==='city')p.set(145,0,72);else if(where==='house'){const h=world.neighborhood?.houses?.[0];p.set(h?.x||0,0,(h?.z||0)+2);}p.y=region?.active?region.field.heightAt(p.x,p.z):(world.floorHeight?.(p)??0);return p;}
 function spawn({role=selectedRole,mode=selectedMode,where=location,position=null,hostile=role!=='pedestrian',select=true}={}){if(!NPC_ROLES[role]||!NPC_MODES.includes(mode))throw new TypeError('Invalid NPC role or behavior');if(mira.actors.length>=maxActive){props.status=`Active NPC limit ${maxActive}; remove or move an NPC before spawning more`;return null;}const old=mira.selected,spec=NPC_ROLES[role],p=position?.clone()||pointFor(where);p.x+=(random()-.5)*1.3;p.z+=(random()-.5)*1.3;
  const a=mira.spawn({version:'v2',name:spec.name+' '+(serial+1),bodyType:'male',faceType:Math.floor(random()*4),hairStyle:Math.floor(random()*4),hairColor:Math.floor(random()*3),position:p,shape:{height:.97+random()*.07,breast:.38,waist:1.04,hips:.9,arms:1.12,softness:.4}});if(!a)return null;
  attach(a,{role,mode,hostile});a.baseY=0;combat.equip(a,spec.armor);
  for(const id of [spec.top,spec.bottom]){const style=GARMENTS.find(g=>g.id===id);if(style){const c=wardrobe.equip(a,style);if(c)c.h5Budget=true;}}
  const id=WEAPONS[spec.weapon]?spec.weapon:spec.weapon==='musket'?'rifle':spec.weapon;if(id){const item=props.make(id);item.h5NPCOwner=a;props.items.push(item);props.hold(item,a);}
  stop(a);if(!select&&old)mira.select(old);props.status=`${spec.name} spawned · ${mode}`;return a;
 }
 function command(a,order){if(!a||!FOLLOWER_ORDERS.includes(order))return false;const b=attach(a);if(order==='dismiss'){b.follower=false;b.hostile=false;b.mode='passive';stop(a);return true;}b.follower=true;b.hostile=false;b.order=order;b.home.copy(a.group.position);b.target=null;b.lastGoal=null;stop(a);if(['go here','fetch','attack target'].includes(order))pendingPoint={actor:a,order};props.status=order==='go here'?'Point at a destination and press trigger':'Order: '+order;return true;}
 function visible(a,target){const eye=a.bones.Head?.getWorldPosition(V())||a.group.position.clone().add(new T.Vector3(0,1.45,0));const d=target.clone().sub(eye),len=d.length();if(len<.03)return true;const ray=new T.Ray(eye,d.normalize()),hit=props.hit(ray,len,false,{world:true,ignoreActor:a});return !hit||hit.distance>len-.3;}
 function patrol(b){const a=b.actor,p=b.home.clone();if(b.mode==='wander'||b.order==='patrol'){const r=ROUTES[Math.floor(random()*ROUTES.length)],point=r.points[Math.floor(random()*r.points.length)];p.set(point[0],0,point[1]);}else p.add(new T.Vector3((random()-.5)*7,0,(random()-.5)*7));p.y=world.h5OpenWorld?.field.heightAt(p.x,p.z)||0;setGoal(a,p);}
 function attack(b,target,player){const a=b.actor,spec=NPC_ROLES[b.role]||NPC_ROLES.bandit,origin=a.bones.Head?.getWorldPosition(V())||a.group.position.clone().add(new T.Vector3(0,1.4,0)),dir=target.clone().sub(origin).normalize();b.attack=spec.cooldown*(.9+random()*.25);stop(a);a.setEmotion?.('angry');
  const hand=a.bones.R_Hand;if(hand)hand.rotation.x-=.20;
  if(spec.range>3){const end=target.clone().add(new T.Vector3((random()-.5)*.45,(random()-.5)*.3,(random()-.5)*.45));props.beam(origin,end,0xffd488,.055);if(random()<.18)return;}
  if(player)combat.playerHit(spec.damage,dir);else if(b.target&&!b.target.dead){let mesh=null;b.target.root.traverse(m=>{if(!mesh&&m.isSkinnedMesh&&/^body/.test(m.name))mesh=m;});if(mesh)props.impact({object:mesh,point:target,weaponId:spec.weapon},spec.damage,dir,spec.range>3?'bullet':'blunt',0);}
 }
 function consumePoint(ray){const pending=pendingPoint;if(!pending)return false;const hit=props.hit(ray,120,false)||world.h5OpenWorld?.terrainAdapter.raycast?.(ray,500);if(!hit)return false;const a=pending.actor,b=attach(a);pendingPoint=null;
  if(pending.order==='attack target'){b.target=props.actorFor(hit.object);if(b.target===a)b.target=null;}
  else if(pending.order==='fetch'){const item=props.weaponHit(ray);if(item)b.fetch=item;else{b.order='go here';setGoal(a,hit.point);}}
  else{b.home.copy(hit.point);setGoal(a,hit.point);}return 'ordered';
 }
 const undo=wrapMethod(mira,'pointCommand',old=>function(ray){return consumePoint(ray)||old.call(this,ray);});
 const undoWalk=wrapMethod(world,'walk',old=>function(a,p,...args){const b=brains.get(a);if(b?.follower&&!planning){b.order='go here';b.lastGoal=p.clone();b.target=null;}return old.call(this,a,p,...args);});
 const undoPose=wrapMethod(props,'applyHoldPose',old=>function(item){const r=old.call(this,item),b=brains.get(item.holder);if(b?.lookPoint&&item.group.parent){const q=new T.Matrix4().lookAt(item.group.getWorldPosition(V()),b.lookPoint,new T.Vector3(0,1,0));item.group.quaternion.setFromRotationMatrix(q).premultiply(item.group.parent.getWorldQuaternion(new T.Quaternion()).invert());item.group.updateMatrixWorld(true);}return r;});
 const api={brains,spawn,attach,command,consumePoint,pointFor,maxActive,NPC_ROLES,NPC_MODES,FOLLOWER_ORDERS,
  get role(){return selectedRole;},set role(v){if(NPC_ROLES[v])selectedRole=v;},get mode(){return selectedMode;},set mode(v){if(NPC_MODES.includes(v))selectedMode=v;},get location(){return location;},set location(v){if(['here','house','woods','city'].includes(v))location=v;},
  tick(dt){time+=dt;const player=camera.getWorldPosition(V());for(const [a,b]of brains){if(!mira.actors.includes(a)){props.drop(a);b.restore?.();brains.delete(a);continue;}b.attack-=dt;b.frozen=Math.max(0,b.frozen-dt);if(a.dead){props.drop(a);continue;}if(a.held||b.frozen>0||a.h5Frozen){stop(a);continue;}b.plan-=dt;if(b.plan>0)continue;b.plan=.20;if(a.group.position.distanceToSquared(player)>180*180){stop(a);continue;}
    if(b.fetch){const item=b.fetch;if(item.holder!==null){b.fetch=null;continue;}if(item.group.getWorldPosition(V()).distanceTo(a.group.position)<1.3){props.drop(a);props.hold(item,a);b.fetch=null;b.order='follow';}else setGoal(a,item.group.getWorldPosition(V()));continue;}
    if(b.target?.dead||b.target?.h5Brain?.follower)b.target=null;if(b.follower&&['guard','follow'].includes(b.order)&&!b.target){const enemy=[...brains.values()].find(e=>e.hostile&&!e.actor.dead&&e.actor.group.position.distanceTo(a.group.position)<14);if(enemy)b.target=enemy.actor;}
    const target=b.target?.group.position.clone().add(new T.Vector3(0,1.05,0))||player,distance=a.group.position.distanceTo(target),aggressive=b.target||b.hostile&&b.mode!=='passive';
    if(aggressive&&(distance<34&&visible(a,target)||b.mode==='hunt player')){b.lastSeen=target.clone();b.lookPoint=target.clone();b.lost=3;const spec=NPC_ROLES[b.role];if(distance<=spec.range&&visible(a,target)){if(b.attack<=0)attack(b,target,!b.target);else stop(a);}else setGoal(a,target);continue;}
    b.lookPoint=null;if(b.follower&&b.order==='follow'){const desired=player.clone().add(new T.Vector3(Math.sin(b.id*2.4)*1.5,-1.55,Math.cos(b.id*2.4)*1.5));if(a.group.position.distanceTo(desired)>2)setGoal(a,desired);else stop(a);}
    else if(b.follower&&['stay','guard'].includes(b.order)){if(a.group.position.distanceTo(b.home)>1.5)setGoal(a,b.home);}
    else if(!a.navigation&&(!b.follower||b.order==='patrol')&&random()<.16)patrol(b);
   }
  },
  snapshot(){return [...brains.values()].map(b=>({id:b.id,name:b.actor.displayName,role:b.role,mode:b.mode,hostile:b.hostile,follower:b.follower,order:b.order}));},
  dispose(){undo();undoWalk();undoPose();for(const [a,b]of brains){b.restore?.();props.drop(a);delete a.h5Brain;}brains.clear();}
 };world.h5NPCs=api;return api;
}
