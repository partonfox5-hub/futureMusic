import {T,V} from './math.js?v=4.0.0';
export const SWORD_TIP=1.63;
export const KNIGHT_SCALE=1.55;
// Match the articulated right shoulder / forearm / sword in models.js.
// Gameplay laser and rendered blade tip both call this function.
export function knightSwordPose(e,time){
 const scale=(e.scale||1)*(e.white?1.85:1)*KNIGHT_SCALE;
 const armAngle=e.laserCast?0:e.attack>0?-1.0:Math.sin(time*2+(e.phase||0)+1)*.2;
 const armQ=new T.Quaternion().setFromAxisAngle(V(1,0,0),armAngle);
 const bladeDir=V(0,0,1).applyQuaternion(e.swordAim||new T.Quaternion());
 const local=V(0,-.62,.06).add(V(0,-.13,.30)).addScaledVector(bladeDir,SWORD_TIP);
 local.applyQuaternion(armQ).add(V(.66,.56,0)).multiplyScalar(scale);
 const face=new T.Quaternion().setFromUnitVectors(V(0,0,1),e.dir||V(0,0,1));
 return {tip:local.applyQuaternion(face).add(e.p),dir:bladeDir.applyQuaternion(armQ).applyQuaternion(face)};
}
