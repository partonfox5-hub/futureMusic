import {T,V,clamp,unit,segmentDistance} from './math.js?v=5.0.0';
import {PETS,RULES} from './data.js?v=5.0.0';
import {knightSwordPose,KNIGHT_SCALE} from './knight-pose.js?v=5.0.0';
export function tickSpawns(g,dt){
 for(const type of ['knight','camel','trilo']){const at=RULES[type+'At'];if(!g.flags[type]&&g.time>=at){g.flags[type]=true;const sector=type==='knight'?1:type==='trilo'?2:Math.floor(g.random()*8);g.spawn(type,g.map.interior(sector,.12));g.say(type==='knight'?'The Dark Knight has entered Knight Sector.':type==='camel'?'A robotic hover-camel slides in.':'Power-armor trilobite on approach.');}}
 for(const key of Object.keys(g.timers))g.timers[key]-=dt;
 if(g.timers.crate<=0){g.timers.crate=90;if(g.entities.filter(e=>e.alive&&['crate','barrel'].includes(e.type)).length<52)for(let i=0;i<8;i++)g.cluster(g.map.interior(i,.65),5);for(let i=g.entities.filter(e=>e.alive&&e.type==='missilePickup').length;i<3;i++)g.addMissile();}
 if(g.timers.cage<=0){g.timers.cage=48+g.random()*40;g.addCages();}

 if(g.timers.rift<=0){g.timers.rift=Math.max(4.35,20-(g.time-60)*.12)*1.05*RULES.swarmIntervalScale;const s=g.map.spheres[Math.floor(g.random()*8)],dir=unit(g.random),p=s.c.clone().addScaledVector(dir,s.r*.97);g.rifts.push({p,dir,age:0,life:3.5,released:false,sphere:s.id});g.emit('rift',p);}
 for(const r of g.rifts){r.age+=dt;r.life-=dt;if(r.age>.75&&!r.released){r.released=true;const base=2+Math.floor(g.random()*2),scaled=base*RULES.swarmBatchScale,n=Math.floor(scaled)+(g.random()<scaled%1?1:0),pack=++g.id;for(let i=0;i<n;i++)g.spawn('drone',r.p.clone().addScaledVector(r.dir,-1-i*.35),{kind:Math.floor(g.random()*7),pack,sphere:r.sphere});if(g.random()<.34){const n=g.random()<.18?2+Math.floor(g.random()*4):1;for(let i=0;i<n;i++)g.spawn('lemur',r.p.clone().addScaledVector(r.dir,-1),{sphere:r.sphere,pack});}g.emit('swarm',g.player.p,{count:n,pack});g.say('INCOMING UFO SWARM · '+n+' saucers deployed.');}}
 if(g.timers.hornet<=0){const n=g.time>720?5:3;g.timers.hornet=(n===5?130+g.random()*60:95+g.random()*55)*1.3;const s=g.map.nearest(g.player.p),at=s.c.clone().addScaledVector(unit(g.random),s.r+15);for(let i=0;i<n;i++)g.spawn('hornet',at.clone().addScaledVector(unit(g.random),i*2),{exterior:true});g.say('Hornet gunships patrol the outer hulls.');}
 for(const n of g.map.nests){
  if(n.disabled)continue;
  if(!n.open){n.timer-=dt;if(n.timer>0)continue;n.open=true;g.map.revision++;spawnHydraPair(g,n,1);g.say('A hydra awakens. Sever its heads to expose the nest.');}
  n.regrowth??=[];
  for(let i=n.regrowth.length-1;i>=0;i--)if(g.time>=n.regrowth[i].at){const count=n.regrowth[i].count;spawnHydraPair(g,n,count);n.regrowth.splice(i,1);g.say('Two heads regrow. This hydra is stronger.');}
 }
}
function spawnHydraPair(g,n,count){for(let i=0;i<count;i++){const index=n.headSerial++;g.spawn('hydra',n.pos.clone().addScaledVector(n.dir,-3),{nest:n.id,headIndex:index,phase:index*2.39996,cd:.6+i*.3,hp:n.headHealth,maxHp:n.headHealth});}}

function aim(g,e){const d=g.player.p.clone().sub(e.p),dist=d.length();return {dir:d.multiplyScalar(1/Math.max(.001,dist)),dist};}
function shoot(g,e,dir,speed=14,dmg=1,extra={}){g.shot(e.p.clone().addScaledVector(dir,e.r+.15),dir,speed,dmg,{owner:'enemy',kind:'bolt',r:.09,life:4,...(extra.kind==='rocket'?{blast:2.2}:{}),...extra});g.emit('enemyshot',e.p,{quiet:true});}
function travel(g,e,wish,dt,force=4){e.v.lerp(wish,1-Math.exp(-force*dt));g.map.move(e.p,e.v,dt,Math.min(e.r,.6));}
function visible(g,e,dir,dist){return !g.map.ray(e.p,dir,Math.max(0,dist-.5));}
export function tickAI(g,dt,input){
 const p=g.player,forward=input.forward||V(0,0,1),right=forward.clone().cross(V(0,1,0)).normalize();let slot=0;
 for(const e of g.entities){if(!e.alive)continue;
  if(e.type==='pet'){tickPet(g,e,dt,slot++,forward,right);continue;}
  if(e.type==='blimp'){e.p.y+=Math.sin(g.time*.7+e.phase)*dt*.3;e.q.setFromAxisAngle(V(0,1,0),g.time*.12+e.phase);continue;}
  if(!e.enemy)continue;e.aiAcc=(e.aiAcc||0)+dt;const dist2=e.p.distanceToSquared(p.p),interval=dist2>10000?1/8:dist2>3600?1/20:0;if(e.aiAcc<interval)continue;const tick=e.aiAcc;e.aiAcc=0;
  const {dir,dist}=aim(g,e);e.dir=dir;e.cd-=tick;e.stateT-=tick;e.beamT=Math.max(0,(e.beamT||0)-tick);e.attack=Math.max(0,(e.attack||0)-tick);
  if(e.stun>0){g.map.move(e.p,e.v,tick,Math.min(.6,e.r));e.v.multiplyScalar(.95);continue;}
  if(e.type==='hydra'){tickHydra(g,e,tick,dir,dist);continue;}
  const waypoint=g.map.route(e.p,p.p,g.time,e),route=waypoint.clone().sub(e.p).normalize(),same=waypoint===p.p,side=dir.clone().cross(V(0,1,0)).normalize();let wish=V();
  if(e.type==='drone'){
   const fast=e.kind===1||e.kind===6,hold=fast?7.2:8.4,speed=fast?5.4:e.kind===0?3:4;wish.copy(same?dir:route).multiplyScalar(same?(dist>hold?speed:dist<hold-2?-2:0):speed);wish.addScaledVector(side,Math.sin(g.time+e.phase)*2.1);wish.y+=Math.sin(g.time*1.2+e.phase)*.8;
   for(const other of g.grid.near(e.p,2.4,[]))if(other!==e&&other.type==='drone'){const away=e.p.clone().sub(other.p),len=away.length();if(len>0&&len<2.4)wish.addScaledVector(away,(2.4-len)/len*2);}
   if((e.kind===5||e.kind===6)&&dist<8.5&&e.stateT<=0){e.attack=.48;e.stateT=3.2+g.random()*1.6;}if(e.attack>0)wish.copy(dir).multiplyScalar(e.kind===6?15.4:14);
   if(e.kind===3&&e.stateT<=0){const jump=unit(g.random).multiplyScalar(2.2+g.random()*2.3);g.map.move(e.p,jump,1,.6);e.stateT=2.2+g.random()*1.6;g.emit('warp',e.p,{small:true});}
   if(e.cd<=0&&dist<28&&dist>1.5&&visible(g,e,dir,dist)){shoot(g,e,dir,16);e.cd=(e.kind===2?.82:1.4)+g.random()*1.1;}
   if(e.kind===6&&(e.rocketCd||0)<=0&&dist>6&&dist<32){shoot(g,e,dir,7.75,2,{kind:'rocket',target:-1,seek:2.2,life:3.5});e.rocketCd=5.5+g.random()*2;}e.rocketCd=(e.rocketCd||0)-tick;
   if(dist<.9&&e.contactCd<=0){g.hurt(1,dir);e.contactCd=1;}e.contactCd=(e.contactCd??1)-tick;
  }
  else if(e.type==='knight'){
   if(!e.white&&!e.mercy&&e.hp>30&&p.hearts<=5.6){e.mercy=true;p.hearts=Math.max(1,10);e.flee=9;g.say('The Dark Knight grants you mercy. For now.');}
   e.flee=Math.max(0,(e.flee||0)-tick);e.mode=dist<6.8?1:0;e.morph=(e.morph||0)+(e.mode-(e.morph||0))*(1-Math.exp(-tick*5));const speed=(e.mode===1?22:14)*(e.white?1.55:1)*g.learning.agro;wish.copy(same?dir:route).multiplyScalar(e.flee>0?-9:same?(dist>6?speed*.45:dist<3?-3:0):speed*.6);wish.addScaledVector(side,Math.sin(g.time*1.8+e.phase)*(e.white?5:3));wish.y+=Math.sin(g.time*2)*g.learning.vertical*3;
   if(e.cd<=0&&dist<46&&dist>5&&visible(g,e,dir,dist)&&!e.laserCast){e.laserCast='charge';e.laserT=0;g.emit('knightcharge',e.p);}
   if(dist<(e.white?4.6:3.6)&&e.stateT<=0){e.attack=.5;e.stateT=g.learning.gap*.65;g.hurt(e.white?5:4,dir);g.emit('slash',e.p);}
   // Respect frequently used force pulses, and kick away from nearby hulls.
   if(g.learning.pulse>.35&&g.weapons.pulseCooldown===0&&dist<9)wish.addScaledVector(dir,-3*g.learning.pulse);
   const s=g.map.spheres[g.map.sector(e.p)];if(s&&e.p.distanceTo(s.c)>s.r-2)wish.addScaledVector(s.c.clone().sub(e.p).normalize(),10);
  }
  else if(e.type==='camel'){
   wish.copy(same?dir:route).multiplyScalar(same?(dist>10?4.2:dist<6?-1.8:.4):4.2).addScaledVector(side,Math.sin(g.time*.7+e.phase)*2.4);wish.y+=Math.sin(g.time*1.4)*1.1;
   if(e.cd<=0&&dist>2&&dist<38&&visible(g,e,dir,dist)){e.beamT=.85;e.cd=9.6+g.random()*4;g.emit('robot',e.p);}if(e.beamT>0&&(e.burnCd||0)<=0&&visible(g,e,dir,dist)){g.hurt(1,dir);e.burnCd=.28;}e.burnCd=(e.burnCd||0)-tick;
  }
  else if(e.type==='trilo'){
   if(e.stateT<=0){e.mode=e.mode===0?1:e.mode===1?2:e.mode===2&&e.landed?3:0;e.stateT=[1.4,1.3,.55,1.1,.85][e.mode];e.landed=false;}
   if(!same)wish.copy(route).multiplyScalar(6);else if(e.mode===0)wish.copy(dir).multiplyScalar(2.2).addScaledVector(side,Math.sin(g.time*1.6)*2.8);else if(e.mode===1)wish.copy(side).multiplyScalar(Math.sin(e.phase)>0?5.5:-5.5).addScaledVector(dir,1.2);else if(e.mode===4)wish.copy(dir).multiplyScalar(-7.5);else {wish.copy(dir).multiplyScalar(11);if(dist<3.4&&!e.landed){g.hurt(e.mode===3?3:2,dir);e.landed=true;e.attack=.5;}}wish.y+=Math.sin(g.time*3.4)*1.5;
  }
  else if(e.type==='lemur'){
   const s=g.map.spheres[e.sphere??g.map.sector(e.p)]||g.map.nearest(e.p);if(g.map.sector(p.p)===s.id){const desired=p.p.clone().sub(s.c).normalize().multiplyScalar(s.r-1).add(s.c);wish.copy(desired.sub(e.p)).clampLength(0,3.2);e.p.copy(e.p.clone().sub(s.c).setLength(s.r-1).add(s.c));}else wish.copy(route).multiplyScalar(3.5);
   if(e.cd<=0&&dist<36&&visible(g,e,dir,dist)){shoot(g,e,dir,7.75,1,{kind:'rocket',target:-1,seek:2.5,life:4});e.cd=3+g.random()*2;}
  }
  else if(e.type==='hornet'){
   const outside=g.map.sector(p.p)<0,s=g.map.nearest(e.p),dest=outside?p.p:s.c.clone().addScaledVector(p.p.clone().sub(s.c).normalize(),s.r+12),fly=dest.clone().sub(e.p).normalize();wish.copy(fly).multiplyScalar(e.p.distanceTo(dest)>12?6:-1).addScaledVector(side,Math.sin(g.time*.6+e.phase)*4);wish.y+=Math.sin(g.time*2+e.phase);
   if(e.cd<=0&&outside&&dist<65&&visible(g,e,dir,dist)){shoot(g,e,dir,22,1);shoot(g,e,dir.clone().addScaledVector(side,.05).normalize(),22,1);e.cd=.8;e.attack=.2;}if((e.rocketCd||0)<=0&&outside&&dist<45){shoot(g,e,dir,10,3,{kind:'rocket',target:-1,seek:1.8,life:4});e.rocketCd=6;}e.rocketCd=(e.rocketCd||0)-tick;
  }
  if((e.type!=='hornet'||!g.map.navigator.enclosed(p.p))&&(!same||g.map.sector(e.p)!==g.map.sector(p.p)||(g.map.sector(e.p)<0&&g.map.navigator.enclosed(e.p)))){const speed={drone:e.kind===1||e.kind===6?5.4:4,knight:8.4*(e.white?1.55:1),camel:4.2,trilo:6,lemur:3.5,hornet:6}[e.type]||4;wish.copy(route).multiplyScalar(speed);}
  if(e.type==='knight'&&e.laserCast)wish.multiplyScalar(.35);travel(g,e,wish,tick,e.type==='knight'?3:2.3);if(e.type==='knight')tickKnightLaser(g,e,tick);
 }
}
function tickKnightLaser(g,e,dt){
 e.beam=null;e.laserCharge=0;if(!e.laserCast)return;
 const face=new T.Quaternion().setFromUnitVectors(V(0,0,1),e.dir),scale=(e.scale||1)*(e.white?1.85:1)*KNIGHT_SCALE;
 const localTarget=g.player.p.clone().sub(e.p).applyQuaternion(face.clone().invert()).multiplyScalar(1/scale).sub(V(.66,-.19,.36));
 const desired=new T.Quaternion().setFromUnitVectors(V(0,0,1),localTarget.normalize());e.swordAim??=desired.clone();e.swordAim.slerp(desired,1-Math.exp(-dt*(e.laserCast==='charge'?6:1.6)));
 const pose=knightSwordPose(e,g.time);e.laserTip=pose.tip;e.laserT+=dt;
 if(e.laserCast==='charge'){e.laserCharge=clamp(e.laserT/1.35,0,1);if(e.laserT<1.35)return;e.laserCast='fire';e.laserT=0;e.burnCd=0;g.emit('knightlaser',pose.tip);}
 if(e.laserCast==='fire'){
  const hit=g.trace(pose.tip,pose.dir,52,0,x=>x!==e&&!x.enemy&&x.type!=='kennel'),end=hit?.pos||pose.tip.clone().addScaledVector(pose.dir,52);
  e.beam={a:pose.tip,b:end,color:0xac47ff,width:e.white?.15:.10};e.laserCharge=1;
  e.burnCd=(e.burnCd||0)-dt;if(e.burnCd<=0){e.burnCd=.12;
   if(segmentDistance(g.player.p,pose.tip,end)<.48)g.hurt(e.white?2:1,pose.dir);
   if(hit){if(hit.entity)g.damage(hit.entity,1.6,pose.dir,'enemy');else if(hit.stroke)g.hitStroke(hit.stroke,1.6,pose.dir);g.ignite(hit,pose.dir,0xa855ff);}
  }
  if(e.laserT>1.65){e.laserCast=null;e.laserCharge=0;e.beam=null;e.cd=(e.white?3.6:4.8)/g.learning.agro;}
 }
}

function tickHydra(g,e,dt,dir,dist){const n=g.map.nests[e.nest],s=g.map.spheres[n.sphere],inward=n.dir.clone().negate(),side=inward.clone().cross(V(0,1,0)).normalize(),reach=clamp(s.r*.82,14,40),target=g.player.p.clone().sub(n.pos).clampLength(0,reach).add(n.pos);
 e.coil=.5+.45*Math.sin(g.time*.75+e.phase);if(e.retreat){e.p.lerp(n.pos,clamp(dt*2,0,1));if(e.p.distanceToSquared(n.pos)<4)e.alive=false;return;}
 target.addScaledVector(side,Math.sin(e.phase)*2.8).add(V(0,Math.cos(e.phase)*2.0,0));const desired=g.map.sector(g.player.p)===n.sphere?target:n.pos.clone().addScaledVector(inward,reach*(.28+e.coil*.55)).addScaledVector(side,Math.sin(g.time+e.phase)*4);e.p.lerp(desired,1-Math.exp(-1.4*dt));const delta=e.p.clone().sub(s.c);if(delta.length()>s.r-1)e.p.copy(s.c).add(delta.setLength(s.r-1));
 if(dist<1.5&&e.stateT<=0){g.hurt(2,dir);e.stateT=1.2;e.attack=.6;}
 // Charge is an explicit gameplay phase. Its mouth-space position drives both
 // the animated jaw/charge model and the projectile spawn (no body-origin shots).
 const face=new T.Quaternion().setFromUnitVectors(V(0,0,1),dir);
 e.mouth=V(0,-.26,.63).applyQuaternion(face).add(e.p);
 e.jaw=0;e.charge=0;
 if(e.cd<=0&&dist<42&&!e.cast&&visible(g,e,dir,dist)){e.cast='charge';e.castT=0;e.beamMode=e.beamMode===undefined?(e.headIndex%2===1):!e.beamMode;g.emit('hydracharge',e.mouth);}
 if(e.cast==='charge'){e.castT+=dt;e.charge=clamp(e.castT/1.05,0,1);e.jaw=.35+e.charge*.65;
  if(e.castT>=1.05){e.cast=e.beamMode?'beam':'recoil';e.castT=0;e.cd=3.5+g.random()*2.5;
   if(e.beamMode){e.beamT=1.2;}else{for(let i=-1;i<=1;i++){const fire=dir.clone().addScaledVector(side,i*.10).normalize();g.shot(e.mouth,fire,12,1,{owner:'enemy',kind:'hydraplasma',r:.24,life:4,color:0xd370ff});}g.emit('hydrafire',e.mouth);}
  }
 }else if(e.cast==='beam'){e.castT+=dt;e.jaw=1;e.charge=.4;const sweep=dir.clone().applyAxisAngle(V(0,1,0),Math.sin(g.time*4+e.phase)*.16);e.beamDir=sweep;
  if((e.burnCd||0)<=0){const wall=g.map.ray(e.mouth,sweep,45),end=e.mouth.clone().addScaledVector(sweep,wall?.distance??45);if(segmentDistance(g.player.p,e.mouth,end)<.55)g.hurt(1,sweep);e.burnCd=.25;}
  if(e.castT>=1.2){e.cast='recoil';e.castT=0;}
 }else if(e.cast==='recoil'){e.castT+=dt;e.jaw=Math.max(0,1-e.castT/.55);if(e.castT>=.55)e.cast=null;}
 e.burnCd=(e.burnCd||0)-dt;
 const crate=g.grid.near(e.p,1.4,[]).find(x=>x.alive&&['crate','barrel'].includes(x.type));if(crate){crate.alive=false;e.hp=Math.min(e.maxHp,e.hp+2);g.emit('break',crate.p);}
}
function tickPet(g,e,dt,index,forward,right){e.bodyDir=forward.clone();const p=g.player,k=PETS[e.kind],a=g.time*.5+index/Math.max(1,g.entities.filter(x=>x.alive&&x.type==='pet').length)*Math.PI*2,r=(1.05+e.kind*.12)*1.25,desired=p.p.clone().addScaledVector(right,Math.cos(a)*r).add(V(0,Math.sin(a)*r*.75,0)).addScaledVector(forward,.35+Math.sin(a)*.3);e.p.lerp(desired,1-Math.exp(-5*dt));e.cd-=dt;let target=e.targetId?g.entities.find(x=>x.id===e.targetId&&x.alive):null;e.targetCd=(e.targetCd||0)-dt;if(!target||e.targetCd<=0){target=g.target(e.p,null,22);e.targetId=target?.id||0;e.targetCd=.25;}if(!target)return;e.dir=target.p.clone().sub(e.p).normalize();if(e.cd>0)return;e.cd=1.5+e.kind*.08;e.attack=.35;const dmg=k[1]*.035;
 if(e.kind===3){g.blast(e.p,dmg*.7,7,'pet');return;}
 const spec=[{speed:16},{speed:18},{speed:22},{speed:0},{speed:8},{speed:14,seek:4},{speed:20,mul:1.1},{speed:12,mul:1.2}][e.kind];
 if(e.kind===1){for(let i=-1;i<=1;i++)g.shot(e.p,e.dir.clone().addScaledVector(right,i*.09).normalize(),18,dmg*.45,{kind:'pet',life:2,r:.08,color:k[3]});}
 else g.shot(e.p,e.dir,spec.speed,dmg*(spec.mul||1),{kind:'pet',target:target.id,seek:spec.seek||0,life:2.5,r:e.kind>=4?.18:.08,color:k[3]});g.emit('petshot',e.p,{quiet:true});
}
