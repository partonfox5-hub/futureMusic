import {T,V,clamp,lerp,segmentDistance,raySphere} from './math.js';
import {RULES} from './data.js';
export class Weapons {
 constructor(game){this.g=game;this.charge=0;this.laserCharge=0;this.fuel=10;this.cooldown=0;this.pulseCooldown=0;this.lassoT=0;this.lasso=[];this.base=V();this.tip=V();this.muzzle=V();this.prevTip=null;this.prevPlayer=V();this.swing=0;this.swingAnim=0;this.meleeCd=0;this.beam=null;this.goldBeam=null;this.draw=null;this.last={};this.burnCd=0;this.strokeCd=0;}
 tick(dt,input){const g=this.g,p=g.player,forward=input.forward||V(0,0,1),left=input.left||{offset:V(.27,-.2,.2),dir:forward},right=input.right||{offset:V(-.27,-.2,.2),dir:forward},lDir=left.dir.clone().normalize(),rDir=right.dir.clone().normalize();
  this.muzzle.copy(p.p).add(left.offset).addScaledVector(lDir,.4);this.base.copy(p.p).add(right.offset);this.tip.copy(this.base).addScaledVector(rDir,1.15);
  this.swingAnim=Math.max(0,this.swingAnim-dt);if(input.desktop&&input.laser&&!this.last.laser){this.swingAnim=.25;this.meleeCd=0;}
  if(this.swingAnim>0){const a=(.25-this.swingAnim)/.25*Math.PI-Math.PI/2,axis=V(0,1,0);this.tip.copy(this.base).add(rDir.clone().applyAxisAngle(axis,a).multiplyScalar(1.15));}
  this.swing=this.prevTip?this.tip.clone().sub(this.prevTip).sub(p.p.clone().sub(this.prevPlayer)).length()/Math.max(.008,dt):0;this.swing=clamp(this.swing,0,40);this.prevTip=this.tip.clone();this.prevPlayer.copy(p.p);
  this.cooldown=Math.max(0,this.cooldown-dt);this.pulseCooldown=Math.max(0,this.pulseCooldown-dt);this.meleeCd=Math.max(0,this.meleeCd-dt);this.burnCd=Math.max(0,this.burnCd-dt);this.strokeCd=Math.max(0,this.strokeCd-dt);this.beam=null;this.goldBeam=null;
  if(g.time<1.1){this.last={...input};return;}
  if(input.plasma){this.charge=Math.min(RULES.ballCharge/g.power,this.charge+dt);if(p.gold>0)this.gold(lDir,dt);}else if(this.last.plasma&&this.charge>0){if(p.gold<=0)this.firePlasma(lDir);this.charge=0;}
  if(this.cooldown===0&&this.fuel<=0)this.fuel=10;
  if(input.laser&&this.cooldown<=0){this.laserCharge+=dt;if(this.laserCharge>=(p.gold>0?.04:RULES.laserWindup/g.power)){this.fireLaser(rDir,dt);this.fuel=Math.max(0,this.fuel-dt);if(this.fuel===0){this.cooldown=RULES.laserCooldown/g.power;this.laserCharge=0;g.emit('cooldown',this.tip);}}}else this.laserCharge=0;
  if((this.swing>2.6||this.swingAnim>0)&&this.meleeCd===0){let hit=false;for(const e of g.grid.near(this.base,3,[]))if(!e.item&&e.type!=='pet'&&segmentDistance(e.p,this.base,this.tip)<e.r+.22){g.damage(e,(2.8+this.swing*.18)*g.power*(e.type==='hydra'?2:1),rDir);hit=true;}if(hit){this.meleeCd=.14;g.emit('slash',this.tip);} }
  if(input.pulse&&!this.last.pulse&&this.pulseCooldown<=0)this.pulse();
  if(input.missileLeft&&!this.last.missileLeft)this.missile(-1,forward);
  if(input.missileRight&&!this.last.missileRight)this.missile(1,forward);
  this.tickLasso(dt,input.lasso,rDir);this.tickDrawing(dt,input.draw);
  if(!this.strokeCd){this.strokeCd=.15;for(const stroke of g.strokes)if(stroke.solid){for(let i=1;i<stroke.points.length;i++){const a=stroke.points[i-1],b=stroke.points[i];for(const e of g.grid.near(b,2,[]))if(e.enemy&&segmentDistance(e.p,a,b)<e.r+.14)g.damage(e,2.5*g.power,b.clone().sub(a).normalize());if(segmentDistance(p.p,a,b)<.38){p.v.multiplyScalar(.5);p.grounded=true;}}}}
  this.last={plasma:!!input.plasma,laser:!!input.laser,pulse:!!input.pulse,missileLeft:!!input.missileLeft,missileRight:!!input.missileRight};
 }
 firePlasma(dir){const g=this.g,t=clamp(this.charge/(RULES.ballCharge/g.power),0,1),charged=this.charge>=.22,size=(charged?lerp(.09,.55,t):.07)*1.15,dmg=(charged?lerp(6,48,t):2.2)*g.power,blast=(charged?lerp(2.4,13.5,t):1.15)*g.power;
  g.shot(this.muzzle,dir,charged?lerp(22,14,t):32,dmg,{r:size,blast,charge:t});g.metrics.shots++;g.emit('plasma',this.muzzle,{power:t});
 }
 fireLaser(dir,dt){const g=this.g,len=RULES.laserRange*g.power,hit=g.trace(this.tip,dir,len,0,()=>false);let end=hit?.distance??len;const items=g.grid.ray(this.tip,dir,end,3,[]).map(e=>({e,t:raySphere(this.tip,dir,e.p,e.r+.08,end)})).filter(h=>Number.isFinite(h.t)&&!h.e.item&&h.e.type!=='pet'&&h.e.type!=='well').sort((a,b)=>a.t-b.t);
  for(const {e,t}of items){if(t>end)break;if(['crate','barrel','drone'].includes(e.type))g.damage(e,1000,dir);else{g.damage(e,e.type==='hydra'&&e.hp<=6?100:8*dt*g.power,dir);end=t;break;}}
  for(const b of g.projectiles)if(b.alive&&b.owner==='enemy'&&b.kind==='rocket'&&Number.isFinite(raySphere(this.tip,dir,b.p,b.r+.12,end))){b.alive=false;g.emit('boom',b.p,{radius:1});}
  const point=this.tip.clone().addScaledVector(dir,end);this.beam={a:this.tip.clone(),b:point,color:g.player.gold>0?0xffd748:0xa0f5ff,width:g.player.gold>0?.12:.06};if(hit?.stroke&&Math.abs(end-hit.distance)<.001)g.hitStroke(hit.stroke,8*dt*g.power,dir);if(hit&&!hit.stroke&&Math.abs(end-hit.distance)<.001&&this.burnCd===0){this.burnCd=.35;if(g.map.scorch(hit))g.breach(hit);}
  if(!this.lastBeam||g.time-this.lastBeam>.16){g.emit('laser',this.tip,{quiet:true});this.lastBeam=g.time;}
 }
 gold(dir,dt){const g=this.g,hit=g.trace(this.muzzle,dir,58,.3,e=>!e.item&&e.type!=='pet'),end=hit?.distance??58;this.goldBeam={a:this.muzzle.clone(),b:this.muzzle.clone().addScaledVector(dir,end),color:0xffdd60,width:.42};this.goldAcc=(this.goldAcc||0)+dt;if(this.goldAcc>=.3){this.goldAcc=0;for(let i=1;i<=5;i++)g.blast(this.muzzle.clone().addScaledVector(dir,end*i/5),32,7.2);if(hit&&!hit.entity&&g.map.scorch(hit))g.breach(hit);g.emit('plasma',this.muzzle,{power:1});}}
 pulse(){const g=this.g,p=g.player,r=RULES.pulseRadius*g.power;this.pulseCooldown=RULES.pulseCooldown;g.metrics.pulses++;for(const e of g.grid.near(p.p,r,[])){if(e.item||['pet','well','marquee','window','kennel','hatch','island'].includes(e.type))continue;const d=e.p.clone().sub(p.p),len=d.length();if(len<r){e.v.addScaledVector(d.normalize(),23.4*g.power*(1-len/r*.4));e.stun=.55;if(e.type==='trilo')g.damage(e,.4*g.power,d);}}g.emit('pulse',p.p,{radius:r});}
 missile(side,forward){const g=this.g;if(g.player.missiles<=0){g.say('Collect a seeking missile rack first.');return;}if(g.projectiles.filter(b=>b.owner==='player'&&b.kind==='missile').length>=2){g.say('Two missiles are already in flight.');return;}const right=forward.clone().cross(V(0,1,0)).normalize(),origin=g.player.p.clone().addScaledVector(right,side*.28).add(V(0,.12,0)),target=g.target(origin,forward,48);g.shot(origin,forward,15.5,9.5*g.power,{kind:'missile',target:target?.id||0,seek:7,blast:1.4,range:28,life:2.6,r:.12});g.player.missiles--;g.emit('missile',origin);}
 tickLasso(dt,held,dir){const g=this.g;this.lasso.length=0;if(!held){this.lassoT=0;return;}this.lassoT=clamp(this.lassoT+dt*1.15,0,1);if(this.lassoT<.42)return;const reach=4+this.lassoT*12,leash=this.tip.clone().addScaledVector(dir,2.7);for(const e of g.grid.near(this.tip,reach,[])){if(e.item||['well','pet','hatch','kennel','island','window','marquee'].includes(e.type))continue;const d=e.p.clone().sub(this.tip),len=d.length();if(len>reach||d.normalize().dot(dir)<.65)continue;this.lasso.push(e.id);e.v.addScaledVector(leash.clone().sub(e.p).normalize(),dt*(18+this.swing*2.8));e.stun=.08;e.grabbedUntil=g.time+.25;if(this.lasso.length>=8)break;}}
 tickDrawing(dt,held){const g=this.g;if(held){if(!this.draw){if(g.strokes.length>=8){const s=g.strokes.find(s=>s!==this.draw);if(s)s.alive=false;}this.draw={id:++g.id,points:[],life:60,alive:true,solid:false,hp:42,v:V()};g.strokes.push(this.draw);}const points=this.draw.points;if((!points.length||points[points.length-1].distanceToSquared(this.muzzle)>.0144)&&points.length<96)points.push(this.muzzle.clone());}
  else if(this.draw){this.draw.solid=true;this.draw.life=10*g.speedPower;g.emit('shield',this.muzzle);this.draw=null;}}
 serialize(){return {fuel:this.fuel,cooldown:this.cooldown,pulseCooldown:this.pulseCooldown};}
 restore(d){Object.assign(this,d||{});}
}
