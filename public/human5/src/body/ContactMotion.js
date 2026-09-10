import * as T from 'three';
const V=()=>new T.Vector3(),clamp=T.MathUtils.clamp;
export class ContactMotion {
 constructor(actor,tissue,fingerRotation){this.fingerRotation=fingerRotation;this.actor=actor;this.tissue=tissue;this.reach=null;this.dt=1/72;this.curl=0;}
 hug(other,pair){
  const a=this.actor;if(pair.kind!=='hug'||pair.stage!=='embrace'||!other?.bones.Spine02)return;
  const axis=other.group.position.clone().sub(a.group.position).setY(0),distance=axis.length();if(distance<.01||distance>.65*(a.shape.height+other.shape.height))return;axis.divideScalar(distance);
  const w=clamp(pair.weight,0,1),chest=a.bones.Spine02;
  if(chest){const local=axis.clone().applyQuaternion(a.group.getWorldQuaternion(new T.Quaternion()).invert());chest.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(.045*w*local.z,0,-.025*w*local.x)));}
  // Both actors call this from their own social pose. Preserve stronger direct
  // hand contact and use the existing local s.press channel for pair compression.
  for(const s of a.soft)if(s.kind==='breast'){
   const bone=a.bones[s.name],point=bone.getWorldPosition(V()),otherChest=other.bones.Spine02.getWorldPosition(V()),gap=point.distanceTo(otherChest),depth=clamp((.21*other.shape.height+.09*a.shape.height-gap)*.18,0,.009*a.shape.height)*w;
   if(depth>s.press.length()){s.press.copy(axis).negate().multiplyScalar(depth).applyQuaternion(bone.parent.getWorldQuaternion(new T.Quaternion()).invert());s.pressT=.06;}
  }
 }
 // Returns true once the wrist reaches the object. Object ownership stays with
 // the existing ball system until then; it cannot teleport into a distant hand.
 requestPickup(ball,dt){
  const a=this.actor;if(!ball?.mesh||ball.held||a.dead||a.seat||a.grabs.size||a.directedWalk||a.socialPair)return false;
  if(!this.reach||this.reach.ball!==ball)this.reach={ball,target:a.bones.R_Hand.getWorldPosition(V()),age:0};
  this.reach.age+=dt;const hand=a.bones.R_Hand.getWorldPosition(V()),distance=hand.distanceTo(ball.mesh.position);
  return distance<Math.max(.06,ball.rad+.025);
 }
 posePickup(dt){
  const a=this.actor,r=this.reach;if(!r){this.curl=a.heldBall?.75:0;return;}
  if(r.ball.held||a.heldBall||r.age>3||a.dead||a.seat||a.grabs.size||a.socialPair||a.directedWalk||a.group.position.distanceTo(r.ball.mesh.position)>1.1){this.reach=null;return;}
  const hand=a.bones.R_Hand,target=r.ball.mesh.position,d=r.target.distanceTo(target),speed=d<.20?.65:1.45,step=Math.min(d,speed*Math.min(.05,dt));
  if(d>1e-5)r.target.addScaledVector(target.clone().sub(r.target),step/d);
  // Blend a bounded reach bend into the current procedural pose. No root spring.
  const low=clamp((a.bones.Hip.getWorldPosition(V()).y-target.y-.20)/.65,0,1),spine=a.bones.Spine02;
  const hip=a.bones.Hip,footTargets=['L','R'].map(side=>a.bones[side+'_Foot'].getWorldPosition(V()));
  if(hip){const down=V().set(0,-.38*low*a.shape.height,0).applyQuaternion(hip.parent.getWorldQuaternion(new T.Quaternion()).invert()).divide(hip.parent.getWorldScale(V()));hip.position.add(down);}
  if(spine)spine.quaternion.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),low*.35));
  a.group.updateMatrixWorld(true);
  const shoulder=a.bones.R_Shoulder||a.bones.R_Upperarm;
  if(shoulder){const sp=shoulder.getWorldPosition(V()),maxReach=.68*(a.shape.height||1),reach=r.target.distanceTo(sp);if(reach>maxReach)r.target.copy(sp).addScaledVector(r.target.clone().sub(sp).normalize(),maxReach);}
  for(const [i,side] of ['L','R'].entries())a.solveChain(side,'leg',footTargets[i],a.group.localToWorld(new T.Vector3(side==='L'?.14:-.14,.45,.65)));
  const pole=a.bones.R_Forearm.getWorldPosition(V()).add(new T.Vector3(-.14,.03,.08).applyQuaternion(a.group.quaternion));a.solveChain('R','arm',r.target,pole);
  const remaining=hand.getWorldPosition(V()).distanceTo(target);this.curl=clamp(1-remaining/.20,0,.8);const rig=a.fingerRigs?.R;if(rig&&this.fingerRotation)for(const row of ['Thumb','Index','Mid','Ring','Pinky'])for(let j=1;j<=3;j++){const name='R_'+row+j,b=a.bones[name];if(b)b.quaternion.copy(a.bindQ[name]).multiply(this.fingerRotation(rig,row,j,this.curl,a.time||0));}a.group.updateMatrixWorld(true);
 }
 reset(){this.reach=null;this.curl=0;}
}
