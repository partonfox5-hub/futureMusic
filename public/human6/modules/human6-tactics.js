import * as T from 'three';
import {NPC_ROLES} from './human5-npc-behavior.js?v=20.2.0';
import {wrapMethod} from './human5-common.js?v=20.2.0';

const UP=new T.Vector3(0,1,0),FORWARD=new T.Vector3(0,0,-1),clamp=T.MathUtils.clamp;
export function accuracySample(percent,random=Math.random){return random()<clamp(Number(percent)||0,0,100)/100;}
export function installTactics({world,mira,props,camera,gameplay,factions,audio}){
  const npcs=gameplay.npcs,combat=gameplay.combat,settings={accuracy:65,coordination:70,melee:65};
  const eye=new T.Vector3(),origin=new T.Vector3(),target=new T.Vector3(),dir=new T.Vector3(),side=new T.Vector3(),end=new T.Vector3(),v=new T.Vector3(),p=new T.Vector3(),hand=new T.Vector3(),pole=new T.Vector3(),scale=new T.Vector3(),q=new T.Quaternion(),parentQ=new T.Quaternion(),matrix=new T.Matrix4(),ray=new T.Ray(),playerSphere=new T.Sphere(new T.Vector3(),.28),segmentA=new T.Vector3(),segmentB=new T.Vector3(),pointRay=new T.Vector3(),pointSegment=new T.Vector3();
  const restEuler=new T.Euler(.7,Math.PI,0);
  const stats={shots:0,playerHits:0,actorHits:0,blockedShots:0,parries:0,meleeHits:0};let clock=0;
  function state(b){return b.tactics||(b.tactics={plan:b.id*.031% .25,shot:.3+(b.id%3)*.08,burst:0,moveTimer:0,phase:'guard',phaseTime:.5,struck:false,recoil:0,stamina:1,suppression:0,side:b.id%2?1:-1,goal:new T.Vector3(),path:[],pathIndex:0,moving:false,aim:new T.Vector3(),target:null,visible:false,active:false,poseHand:new T.Vector3(),posePole:new T.Vector3(),mag:30,shots:0});}
  function valid(a){return a&&!a.dead&&!a.headMissing&&a.balance?.state!=='ragdoll'&&!a.held&&!a.grabs?.size;}
  function permitted(a,b){return factions.enemy(a,b);}
  function targetPoint(a,out){if(a==='player'){camera.getWorldPosition(out);out.y-=.36;return out;}return out.copy(a.group.position).addScaledVector(UP,1.16*(a.shape?.height||1));}
  function lineOfSight(a,to){origin.copy(a.group.position).addScaledVector(UP,1.38*(a.shape?.height||1));dir.copy(to).sub(origin);const distance=dir.length();if(distance<.1)return true;ray.set(origin,dir.multiplyScalar(1/distance));const hit=props.hit(ray,distance,false,{ignoreActor:a});return !hit||hit.distance>distance-.42||props.actorFor(hit.object)===state(a.h5Brain).target;}
  function choose(b,s){const a=b.actor;camera.getWorldPosition(eye);let best=null,bd=Infinity;
    if(b.target&&valid(b.target)&&permitted(a,b.target)){best=b.target;bd=a.group.position.distanceToSquared(b.target.group.position);}
    if(permitted(a,'player')&&combat.player.health>0){const d=a.group.position.distanceToSquared(eye);if(d<bd){bd=d;best='player';}}
    for(const other of mira.actors){if(other===a||!valid(other)||!permitted(a,other))continue;const d=a.group.position.distanceToSquared(other.group.position);if(d<bd){bd=d;best=other;}}
    // Reports are shared only within the same faction and nearby formation.
    if(bd>55*55&&accuracySample(settings.coordination))for(const ally of npcs.brains.values()){const r=ally.tactics;if(ally!==b&&factions.groupOf(ally.actor)===factions.groupOf(a)&&r?.active&&r.target&&ally.actor.group.position.distanceToSquared(a.group.position)<24*24){best=r.target;break;}}
    s.target=best;return best;
  }
  function planMove(b,s,distance,ranged){const a=b.actor,desired=ranged?12+(b.id%3)*3:1.5;
    if(!ranged&&s.phase==='windup'||!ranged&&s.phase==='strike')return;
    dir.copy(s.aim).sub(a.group.position).setY(0).normalize();side.set(-dir.z,0,dir.x);
    if(!ranged){s.goal.copy(a.group.position).addScaledVector(dir,clamp(distance-desired,-1.5,3)).addScaledVector(side,s.side*(.6+settings.melee*.005));}
    else{
      const coordinated=accuracySample(settings.coordination),flank=coordinated&&(b.id%3)!==0;
      s.goal.copy(a.group.position).addScaledVector(dir,clamp(distance-desired,-3.5,6)).addScaledVector(side,s.side*(flank?3.5:1.3));
      if(s.suppression>.4&&coordinated){let found=false;for(let j=0;j<6;j++){const theta=b.phase+j*Math.PI/3;p.copy(a.group.position);p.x+=Math.sin(theta)*3.2;p.z+=Math.cos(theta)*3.2;p.y+=1.0;v.copy(s.aim).sub(p);const len=v.length();ray.set(p,v.normalize());const cover=props.hit(ray,Math.min(5,len),false,{actors:false});p.y-=1.0;if(cover&&!world.blocked?.(p,.3)){s.goal.copy(p);found=true;break;}}if(found)s.shot=Math.max(s.shot,.6);}
    }
    s.goal.x=clamp(s.goal.x,-world.extent+1,world.extent-1);s.goal.z=clamp(s.goal.z,-world.extent+1,world.extent-1);s.goal.y=a.group.position.y;
    if(!world.blocked?.(s.goal,.32)){s.path=world.path?.(a.group.position,s.goal,.32)||[s.goal.clone()];s.pathIndex=0;}else{s.side*=-1;s.path=[];}npcs.stop(a);
  }
  function pose(a,b,dt=.016){const s=state(b);if(!s.active||!valid(a)||!a.solveChain)return;const item=props.held.get(a),ranged=item&&item.data.kind==='bullet';
    // Keep aiming at the opponent while navigation supplies strafing/backsteps.
    const yaw=Math.atan2(s.aim.x-a.group.position.x,s.aim.z-a.group.position.z),difference=Math.atan2(Math.sin(yaw-a.group.rotation.y),Math.cos(yaw-a.group.rotation.y));a.group.rotation.y+=difference*(1-Math.exp(-dt*14));a.group.updateWorldMatrix(true,true);
    let x=-.22,y=1.28,z=.29;
    if(!ranged){if(s.phase==='windup'){x=-.40;y=1.53;z=.10;}else if(s.phase==='strike'){const k=1-s.phaseTime/.2;x=-.38+.65*k;y=1.48-.4*k;z=.28+.29*Math.sin(k*Math.PI);}else{x=-.22;y=1.23;z=.34;}}
    hand.set(x,y-s.recoil*.12,z-s.recoil*.2);a.group.localToWorld(hand);pole.set(-.66,.94,.05);a.group.localToWorld(pole);a.solveChain('R','arm',hand,pole);a.root.updateWorldMatrix(true,true);
    if(item){holdPose(item);if(ranged){hand.set(-.015,-.025,-Math.min(.30,item.data.reach*.38));item.group.localToWorld(hand);pole.set(.6,.9,.15);a.group.localToWorld(pole);a.solveChain('L','arm',hand,pole);a.root.updateWorldMatrix(true,true);}}
  }
  function holdPose(item){const a=item.holder,b=a?.h5Brain;if(!b)return false;const s=state(b),parent=a.bones?.R_Hand;if(!parent)return false;
    if(item.group.parent!==parent)parent.attach(item.group);parent.getWorldPosition(hand);parent.getWorldQuaternion(parentQ);parent.getWorldScale(scale);
    if(s.active){target.copy(s.aim);if(item.data.kind!=='bullet'){dir.copy(target).sub(hand);dir.y+=s.phase==='guard'?.85:s.phase==='windup'?1.0:-.12;target.copy(hand).add(dir);}matrix.lookAt(hand,target,UP);q.setFromRotationMatrix(matrix);}
    else{a.group.getWorldQuaternion(q);q.multiply(parentQ.setFromEuler(restEuler));}
    // Cancel skeleton scale, preserve exact handle contact in the palm.
    parent.getWorldQuaternion(parentQ).invert();item.group.quaternion.copy(parentQ).multiply(q);item.group.scale.set(1/Math.max(.0001,scale.x),1/Math.max(.0001,scale.y),1/Math.max(.0001,scale.z));
    item.group.position.copy(item.handle).multiply(item.group.scale).applyQuaternion(item.group.quaternion).negate();item.group.updateWorldMatrix(true,true);return true;
  }
  function fire(b,s,item){
    if(!item||item.reloading)return;if(item.data.magSize&&item.mag<=0){props.startReload(item);s.burst=0;return;}
    holdPose(item);origin.set(0,.032,-item.data.reach);item.group.localToWorld(origin);target.copy(s.aim);
    const accurate=accuracySample(settings.accuracy),distance=origin.distanceTo(target);dir.copy(target).sub(origin).normalize();side.crossVectors(dir,UP);if(side.lengthSq()<.01)side.set(1,0,0);else side.normalize();
    // A percentage controls an accurate aim attempt; geometry still decides impact.
    if(!accurate){const angle=Math.random()*Math.PI*2,miss=.75+distance*(.022+Math.random()*.025);target.addScaledVector(side,Math.cos(angle)*miss);v.crossVectors(side,dir);target.addScaledVector(v,Math.sin(angle)*miss);}
    dir.copy(target).sub(origin).normalize();ray.set(origin,dir);const max=160,hit=props.hit(ray,max,false,{ignoreActor:b.actor});let stop=hit?.distance??max;
    camera.getWorldPosition(eye);let playerDistance=Infinity;
    if(permitted(b.actor,'player')&&combat.player.health>0){for(let j=0;j<3;j++){playerSphere.center.copy(eye);playerSphere.center.y-=.18+j*.39;playerSphere.radius=.28;if(ray.intersectSphere(playerSphere,v))playerDistance=Math.min(playerDistance,origin.distanceTo(v));}}
    const damage=NPC_ROLES[b.role]?.damage||8;
    if(playerDistance<stop){stop=playerDistance;combat.playerHit(damage,dir);stats.playerHits++;}
    else if(hit){const actor=props.actorFor(hit.object)||hit.object.userData?.cloth?.actor;if(actor&&permitted(b.actor,actor)){props.impact({...hit,weaponId:item.id},damage,dir,'bullet',0);stats.actorHits++;if(actor.h5Brain)state(actor.h5Brain).suppression=1;}
      else if(!actor){props.impact({...hit,weaponId:item.id},damage,dir,'bullet',0);stats.blockedShots++;}}
    end.copy(origin).addScaledVector(dir,stop);props.beam(origin,end,0xffdf93,.045);audio.play(item.id,origin,.8);if(item.data.magSize)item.mag--;s.recoil=Math.min(.5,s.recoil+.18);s.shots++;stats.shots++;
  }
  function playerParry(from,to){ray.set(from,dir.copy(to).sub(from).normalize());const len=from.distanceTo(to);for(const [key,item]of props.held){if(key?.bones||!['cut','blunt'].includes(item.data.kind))continue;segmentA.copy(item.handle);item.group.localToWorld(segmentA);segmentB.set(0,0,-item.data.reach);item.group.localToWorld(segmentB);const d=ray.distanceSqToSegment(segmentA,segmentB,pointRay,pointSegment);if(d<.13*.13&&from.distanceTo(pointRay)<len+.1){if(typeof key==='number')mira.hands.haptics?.contact(key,'prop',1,.02);return true;}}return false;}
  function strike(b,s){const a=b.actor;targetPoint(s.target,target);origin.copy(a.group.position).addScaledVector(UP,1.2);const distance=origin.distanceTo(target);if(distance>2.05||!s.visible||!accuracySample(settings.melee))return;
    if(s.target==='player'&&playerParry(origin,target)){s.phase='recover';s.phaseTime=.85;s.stamina=Math.max(0,s.stamina-.28);audio.play('metal',target);stats.parries++;return;}
    if(s.target!=='player'){const other=s.target.h5Brain?.tactics;if(other?.phase==='guard'&&accuracySample(settings.melee*.7)){other.phase='windup';other.phaseTime=.24;audio.play('metal',target);stats.parries++;return;}}
    dir.copy(target).sub(origin).normalize();if(s.target==='player')combat.playerHit(NPC_ROLES[b.role]?.damage||7,dir);else{ray.set(origin,dir);const hit=props.hit(ray,2.1,false,{ignoreActor:a});if(hit&&combat.resolve(hit)===s.target)props.impact({...hit,weaponId:props.held.get(a)?.id},NPC_ROLES[b.role]?.damage||9,dir,'blunt');}
    audio.play('impact',target,.6);stats.meleeHits++;
  }
  function tickBrain(b,dt){const a=b.actor,s=state(b);s.recoil*=Math.exp(-dt*11);s.suppression=Math.max(0,s.suppression-dt*.3);s.stamina=Math.min(1,s.stamina+dt*.22);s.shot-=dt;s.plan-=dt;s.moveTimer-=dt;
    if(!valid(a)||b.frozen>0||a.h5Frozen||b.mode==='passive'){s.active=false;b.lookPoint=null;return false;}
    if(s.plan<=0){s.plan=.18+(b.id%3)*.023;choose(b,s);if(s.target){targetPoint(s.target,s.aim);s.visible=lineOfSight(a,s.aim);}}
    if(!s.target||!permitted(a,s.target)){s.active=false;b.lookPoint=null;return false;}
    targetPoint(s.target,s.aim);const distance=a.group.position.distanceTo(s.aim),ranged=props.held.get(a)?.data.kind==='bullet';
    if(distance>70||(!s.visible&&b.mode!=='hunt player'&&distance>35)){s.active=false;b.lookPoint=null;return true;}
    s.active=true;b.lookPoint=s.aim;a.h5Urgent=ranged&&distance>17;a.lookAtPos=s.aim;
    if(s.moveTimer<=0){s.moveTimer=ranged?.8+Math.random()*.65:.45+Math.random()*.35;planMove(b,s,distance,ranged);}
    if(s.path.length&&!(s.phase==='windup'&&!ranged)&&!(s.phase==='strike'&&!ranged)){p.copy(s.path[s.pathIndex]);dir.copy(p).sub(a.group.position).setY(0);const len=dir.length();if(len<.25){s.pathIndex++;if(s.pathIndex>=s.path.length)s.path=[];}else{const pace=ranged?(distance>25?2.8:1.7):1.2;p.copy(a.group.position).addScaledVector(dir,Math.min(len,pace*dt)/len);world.project(p,.32,.05,1.7);a.group.position.x=p.x;a.group.position.z=p.z;a.speed=pace;s.moving=true;}}else{s.moving=false;}
    if(ranged){const item=props.held.get(a);if(s.visible&&distance<65&&s.shot<=0){if(!s.burst)s.burst=item.id==='musket'?1:item.data.auto?3+((b.id+s.shots)%3):1;fire(b,s,item);s.burst--;s.shot=s.burst>0?Math.max(.09,item.data.fireRate||.14):item.id==='musket'?7.5:item.data.auto?.45+Math.random()*.4:.34+Math.random()*.3;}}
    else{s.phaseTime-=dt;if(s.phaseTime<=0){if(s.phase==='guard'&&distance<2.1&&s.stamina>.28){s.phase='windup';s.phaseTime=.48-settings.melee*.002;s.struck=false;audio.play('whoosh',a.group.position,.4);}else if(s.phase==='windup'){s.phase='strike';s.phaseTime=.2;s.stamina-=.26;}else if(s.phase==='strike'){s.phase='recover';s.phaseTime=.55;}else{s.phase='guard';s.phaseTime=.45+Math.random()*.6;}}
      if(s.phase==='strike'&&!s.struck){s.struck=true;strike(b,s);}}
    return true;
  }
  const undoPose=wrapMethod(props,'applyHoldPose',old=>function(item){if(item.holder?.h5Brain&&holdPose(item))return;return old.call(this,item);});
  const undoImpact=wrapMethod(props,'impact',old=>function(hit,energy,dir,kind,...rest){const a=combat.resolve(hit),b=a?.h5Brain,s=b&&state(b);if(s){s.suppression=Math.min(1,s.suppression+.45);if(s.active&&s.phase==='guard'&&['cut','blunt'].includes(kind)&&energy<80&&accuracySample(settings.melee*.65)){stats.parries++;s.phase='windup';s.phaseTime=.25;audio.play('metal',hit.point,.8);return {parried:true};}}return old.call(this,hit,energy,dir,kind,...rest);});
  const region=world.h5OpenWorld,undoSave=wrapMethod(region,'save',old=>function(){return {...old.call(this),combatSettings:{...settings}};}),undoRestore=wrapMethod(region,'restore',old=>function(data){const values=data.combatSettings;if(values&&Object.keys(settings).some(k=>!Number.isFinite(values[k])||values[k]<0||values[k]>100))throw Error('Invalid combat percentages');const result=old.call(this,data);if(values)for(const key of Object.keys(settings))settings[key]=values[key];return result;});
  const api={settings,stats,state,pose,holdPose,tickBrain,permitted,lineOfSight,
    tick(dt){clock+=dt;},dispose(){undoRestore();undoSave();undoImpact();undoPose();delete world.h6Combat;}};world.h6Combat=api;return api;
}
