import * as T from 'three';
import {V,clamp,finiteDt,gravityOf,wrapMethod,rng} from './human5-common.js?v=17.8.0';

export const DYNAMICS_CONTROLS=Object.freeze([
  {key:'tissueDensity',label:'Tissue density',min:900,max:1100,step:5,value:980},
  {key:'waterDrag',label:'Tissue water drag',min:0,max:12,step:.1,value:5},
  {key:'thighGravity',label:'Thigh gravity response',min:0,max:1,step:.02,value:.55},
  {key:'spineFlexibility',label:'Spine flexibility',min:0,max:1,step:.02,value:.48},
  {key:'gaitVariation',label:'Step variation',min:0,max:1,step:.02,value:.40},
  {key:'fluidBias',label:'Tissue fluid response',min:0,max:.1,step:.005,value:.075},
  {key:'muscleTone',label:'Underlying muscle support',min:0,max:1,step:.02,value:.6},
  {key:'surfaceRipple',label:'Surface tissue motion',min:0,max:.003,step:.0001,value:.0018}
]);

export function submergedFraction(height,y,radius=.035){return clamp((height-y)/(2*radius)+.5,0,1);}
// An object of density 980 kg/m3 displaces almost its own weight in fresh water.
// It does not fly upwards or lift the entire attached character by itself.
export function environmentalAcceleration(g,water,rho,submerged,out=V()){
  out.copy(g);if(water)out.addScaledVector(g,-clamp(water.density||1000,500,1500)/rho*submerged);return out;
}

class EnvironmentalTissue {
  constructor(actor,options){this.actor=actor;this.options=options;this.restores=[];this.clusterRestores=[];this.stats={submerged:0,clusters:0};
    const tissue=actor.realism?.tissue;if(!tissue)throw new TypeError('Existing V2 TissueRig is required');this.tissue=tissue;
    this.restores.push(wrapMethod(tissue,'rebuild',old=>{const self=this;return function(){self.unhook();const r=old.apply(this,arguments);self.instrument();return r;};}));
    if(tissue.ready)this.instrument();
    const surface=actor.surfaceFlesh;
    if(surface)this.restores.push(wrapMethod(surface,'tick',old=>{const self=this;return function(dt){
      const r=old.apply(this,arguments);dt=finiteDt(dt);if(!dt)return r;
      // Existing guide springs provide inertia. Add a persistent gravity equilibrium
      // to their output, in world coordinates, without modifying bone locations.
      for(let i=0;i<3;i++){
        const guide=this.guides[i],bone=actor.bones[guide.name];if(!bone)continue;
        const p=bone.getWorldPosition(V()),water=self.options.waterAt(p,.12),f=water?submergedFraction(water.height,p.y,.12):0;
        const g=environmentalAcceleration(gravityOf(actor.world),water,self.options.tissueDensity,f);
        const amount=i?self.options.thighGravity:.3,soft=actor.shape.bodySoftness??.5;
        const target=g.multiplyScalar(.0017*amount*soft*(actor.shape.height||1)).clampLength(0,.018);
        this.offsets[i].add(target);
      }return r;
    };}));
  }
  instrument(){
    const self=this;
    for(const c of this.tissue.clusters){
      this.clusterRestores.push(wrapMethod(c.cluster,'step',old=>function(h,params={}){
        let sum=0;const g=gravityOf(self.actor.world),rho=self.options.tissueDensity;
        const baseDrag=Math.exp(-(3+clamp(params.damping??.5,0,1)*24)*h);
        for(let i=0;i<24;i+=3){
          const p=V().fromArray(this.p,i),water=self.options.waterAt(p,.035),fraction=water?submergedFraction(water.height,p.y):0;sum+=fraction/8;
          const accel=environmentalAcceleration(g,water,rho,fraction),flow=water?.velocity||V(),drag=Math.exp(-self.options.waterDrag*fraction*h);
          for(let j=0;j<3;j++){const axis=['x','y','z'][j];this.v[i+j]=flow[axis]+(this.v[i+j]-flow[axis])*drag+accel[axis]*h/Math.max(.01,baseDrag);}
        }
        const soft=clamp(params.softness??.62,0,1),breast=c.soft.kind==='breast';
        // Softer fascia permits gravity equilibrium; muscular glute support stays
        // firmer. Near-incompressible volume remains an independent constraint.
        const bias=1+self.options.fluidBias;
        const attachmentCompliance=breast?(.000015+soft*soft*.00055)*bias:(.000008+soft*soft*.00016)/(1+self.options.muscleTone*1.5);
        const shearCompliance=(.000001+soft*soft*(breast?.000055:.000035))*bias;
        self.stats.submerged=sum;return old.call(this,h,{...params,gravity:0,attachmentCompliance,shearCompliance});
      }));
    }
    this.stats.clusters=this.tissue.clusters.length;
  }
  unhook(){this.clusterRestores.reverse().forEach(f=>f());this.clusterRestores=[];}
  dispose(){this.unhook();this.restores.reverse().forEach(f=>f());}
}

/** Angular compliance around the authored pose; no second pelvis/ragdoll integrator. */
class SpineResponse {
  constructor(actor,options){this.actor=actor;this.options=options;this.acc=0;this.last=V();this.velocity=V();this.ready=false;
    this.nodes=['Waist','Spine01','Spine02','NeckTwist01'].filter(n=>actor.bones[n]).map((name,i)=>({name,angle:V(),omega:V(),impulse:V(),limit:i===3?new T.Vector3(.15,.18,.12):new T.Vector3(.18,.13,.14)}));
  }
  reset(){this.ready=false;this.acc=0;for(const n of this.nodes){n.angle.set(0,0,0);n.omega.set(0,0,0);n.impulse.set(0,0,0);}}
  impulse(point,impulse){
    const a=this.actor;for(const n of this.nodes){const bone=a.bones[n.name],pivot=bone.getWorldPosition(V()),lever=point.clone().sub(pivot).clampLength(0,.8),torque=lever.cross(impulse).clampLength(0,6).applyQuaternion(bone.parent.getWorldQuaternion(new T.Quaternion()).invert());n.omega.addScaledVector(torque,.12);n.omega.clampLength(0,2);}
  }
  tick(dt){
    const a=this.actor;dt=finiteDt(dt);if(!dt)return;
    const hip=a.bones.Hip?.getWorldPosition(V())||a.group.getWorldPosition(V()),velocity=hip.clone().sub(this.last).divideScalar(dt),accel=V();
    if(this.ready&&hip.distanceTo(this.last)<.4)accel.copy(velocity).sub(this.velocity).divideScalar(dt).clampLength(0,18);else this.reset();
    this.last.copy(hip);this.velocity.copy(velocity);this.ready=true;this.acc=Math.min(.05,this.acc+dt);
    const targets=[];
    for(const n of this.nodes){
      const bone=a.bones[n.name],q=bone.parent.getWorldQuaternion(new T.Quaternion()).invert();
      const effective=gravityOf(a.world).sub(accel).applyQuaternion(q),up=V().set(0,1,0).applyQuaternion(a.bindQ[n.name]||new T.Quaternion());
      // Torque is evaluated around the bone's actual bind-frame direction.
      const torque=up.cross(effective).multiplyScalar(.012*(.25+this.options.spineFlexibility));
      for(const grab of a.grabs?.values()||[]){if(grab.spring||!grab.pull)continue;const force=grab.pull.clone().clampLength(0,.25).multiplyScalar(12).applyQuaternion(q);torque.add(V().set(0,.25,0).cross(force).multiplyScalar(.09));}
      targets.push(torque.clamp(n.limit.clone().negate(),n.limit));
    }
    const h=1/120;
    while(this.acc+1e-9>=h){
      for(let i=0;i<this.nodes.length;i++){
        const n=this.nodes[i],omega=10+(1-this.options.spineFlexibility)*12,k=omega*omega,d=omega*1.55;
        for(const axis of ['x','y','z']){const neighbor=((this.nodes[i-1]?.angle[axis]||0)+(this.nodes[i+1]?.angle[axis]||0))*.14,target=targets[i][axis]+neighbor;n.omega[axis]=(n.omega[axis]+h*k*(target-n.angle[axis]))/(1+d*h+k*h*h);n.angle[axis]=clamp(n.angle[axis]+h*n.omega[axis],-n.limit[axis],n.limit[axis]);}
      }this.acc-=h;
    }
    if(a.seat)return; // Host piano/sitting IK has final ownership.
    for(const n of this.nodes)a.bones[n.name].quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(n.angle.x,n.angle.y,n.angle.z,'XYZ')));
    a.group.updateMatrixWorld(true);
  }
}

class LocomotionVariation {
  constructor(actor,options){this.actor=actor;this.options=options;this.random=rng(771+Math.floor((actor.seed||0)*13));this.step=0;this.prevSwing={};this.restores=[];this.lastYaw=actor.group.rotation.y;this.turn=0;
    this.restores.push(wrapMethod(actor,'solveFeet',old=>{const self=this;return function(dt,moving){
      const result=old.apply(this,arguments);if(this.seat||this.dead||this.grabs?.size||this.balance?.state!=='standing')return result;
      for(const side of ['L','R']){const f=this.feet?.[side];if(!f)continue;
        if(f.swing&&!self.prevSwing[side]){
          // Choose variation once per step. Do not inject random frame jitter.
          const amount=self.options.gaitVariation,h=this.shape.height||1,dx=(self.random()-.5)*.018*h*amount,dz=(self.random()-.5)*.055*h*amount;
          const delta=new T.Vector3(dx,0,dz).applyQuaternion(this.group.quaternion);f.end.add(delta);f.duration*=1+(self.random()-.5)*.12*amount;self.step++;
        }
        self.prevSwing[side]=f.swing;
        if(f.swing){const foot=this.bones[side+'_Foot'];if(foot){const u=f.progress,roll=Math.sin(Math.PI*u)*.11-self.options.gaitVariation*.04*Math.sin(2*Math.PI*u);foot.quaternion.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),roll));}}
      }return result;
    };}));
    this.restores.push(wrapMethod(actor,'poseArms',old=>{const self=this;return function(){
      const result=old.apply(this,arguments);if(this.seat||this.grabs?.size||this.dead||this.balance?.state!=='standing')return result;
      const dt=Math.max(.001,this.dt||1/72),dy=Math.atan2(Math.sin(this.group.rotation.y-self.lastYaw),Math.cos(this.group.rotation.y-self.lastYaw));self.lastYaw=this.group.rotation.y;
      self.turn=T.MathUtils.damp(self.turn,clamp(dy/dt,-1.2,1.2),6,dt);
      const phase=this.walkT||0,weight=clamp((this.speed||0)/.7,0,1),amount=self.options.gaitVariation;
      const chest=this.bones.Spine02;if(chest)chest.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(.018*weight,Math.sin(phase)*.028*weight,-self.turn*.035*amount)));
      return result;
    };}));
  }
  dispose(){this.restores.reverse().forEach(f=>f());}
}

/** Call once after actor construction. Existing XPBD, grab and IK methods remain owners. */
export function installHumanDynamics(actor,{waterAt=()=>null,...settings}={}){
  if(actor?.version!=='v2')return null;if(actor.h5Dynamics)return actor.h5Dynamics;
  const options={waterAt};for(const c of DYNAMICS_CONTROLS)options[c.key]=clamp(Number.isFinite(settings[c.key])?settings[c.key]:c.value,c.min,c.max);
  const tissue=new EnvironmentalTissue(actor,options),spine=new SpineResponse(actor,options),gait=new LocomotionVariation(actor,options),restores=[];
  // Host poseSpineContact is before arms/grabs/tissue. It restores pose each frame.
  restores.push(wrapMethod(actor,'poseSpineContact',old=>function(dt){const r=old.apply(this,arguments);spine.tick(dt);return r;}));
  restores.push(wrapMethod(actor,'resetPhysics',old=>function(){const r=old.apply(this,arguments);spine.reset();return r;}));
  restores.push(wrapMethod(actor,'applyStrike',old=>function(hit,n,c,g,p){const r=old.apply(this,arguments);const point=p||this.bones.Spine02.getWorldPosition(V());spine.impulse(point,n.clone().multiplyScalar(-Math.min(5,c||0)));return r;}));
  const api={options,tissue,spine,gait,set(values){for(const c of DYNAMICS_CONTROLS)if(Number.isFinite(values[c.key]))options[c.key]=clamp(values[c.key],c.min,c.max);},impulse:(p,v)=>spine.impulse(p,v),dispose(){restores.reverse().forEach(f=>f());gait.dispose();tissue.dispose();delete actor.h5Dynamics;}};
  actor.h5Dynamics=api;return api;
}
