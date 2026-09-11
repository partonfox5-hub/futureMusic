import {FaceDrive} from './src/body/FaceDrive.js';
import {TissueRig,installSurfaceDamping} from './src/body/TissueRig.js';
import {SkinCrease} from './src/body/SkinCrease.js';
import {ContactMotion} from './src/body/ContactMotion.js';
export {FaceDrive,TissueRig,SkinCrease,ContactMotion};
export {XPBDCluster,signedVolume} from './src/body/XPBDCluster.js';
// Install only at the END of MiraV2 construction, after eyes / SurfaceFlesh.
// The Base class and MiraV1 prototypes are never mutated.
export function installV2Realism(actor,{loadMap,shapePoint,fingerRotation,behavior={}}={}){
 if(actor.version!=='v2')return null;if(actor.realism)return actor.realism;
 if(typeof loadMap!=='function'||typeof shapePoint!=='function')throw new TypeError('Pass the host loadMap and shapePoint functions');
 const restores=[],face=new FaceDrive(actor,behavior),tissue=new TissueRig(actor,shapePoint),contact=new ContactMotion(actor,tissue,fingerRotation),skin=new SkinCrease(actor,face,loadMap);face.configure(behavior);
 const wrap=(key,make)=>{const own=Object.hasOwn(actor,key),old=actor[key],next=make(old);actor[key]=next;restores.push(()=>{if(actor[key]===next){if(own)actor[key]=old;else delete actor[key];}});};
 wrap('tickExpr',old=>function(dt){
  // Suppress only the legacy blink block; retain all FACE_POSES, speech and
  // emotion logic. The new lid pass runs AFTER this frame's gaze calculation.
  this.blinkHold=0;this.blinkT=Infinity;return old.call(this,dt);
 });
 wrap('tickMorphs',old=>function(dt){face.tick(dt);return old.call(this,dt);});
 wrap('tickGaze',old=>function(dt,...args){const expired=this.attentionT<=dt,result=old.call(this,dt,...args);if(expired)this.attentionT=face.behavior.gazeHold*(.8+face.random()*.4);return result;});
 wrap('tickSoft',old=>function(dt){try{tissue.tick(dt);}catch(err){console.warn('tissue',err);if(typeof old==='function')return old.call(this,dt);}});
 wrap('applyLooks',old=>function(...args){const result=old.apply(this,args);skin.install();return result;});
 wrap('resetPhysics',old=>function(...args){const result=old.apply(this,args);tissue.reset();contact.reset();return result;});
 // Existing poseArms is after base gaze, and before final tissue simulation.
 wrap('poseArms',old=>function(dt,...args){const result=typeof old==='function'?old.call(this,dt,...args):undefined;try{contact.posePickup(Math.min(.05,this.dt||dt||1/72));}catch{}return result;});
 const resetSurface=installSurfaceDamping(actor.surfaceFlesh);
 const api={face,tissue,skin,contact,setBehavior:options=>face.configure(options),contactHug:(other,pair)=>contact.hug(other,pair),requestPickup:(ball,dt)=>contact.requestPickup(ball,dt),afterSeatPose:()=>tissue.afterSeatPose(),reset:()=>{tissue.reset();contact.reset();},dispose(){skin.dispose();resetSurface();for(const restore of restores.reverse())restore();actor.blinkT=2;actor.blinkHold=0;if(actor.realism===api)delete actor.realism;}};
 actor.realism=api;return api;
}
