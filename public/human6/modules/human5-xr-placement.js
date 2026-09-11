import * as T from 'three';
const up=new T.Vector3(0,1,0);
/** Place the tracked head without reading a stale XR ArrayCamera after rig mutation.
 * Rig must have an unscaled parent (the game's Scene). Head tracking stays untouched.
 */
export function placeXRHead(rig,trackedCamera,target,yaw){
 rig.updateWorldMatrix(true,false);trackedCamera.updateWorldMatrix(true,false);
 const head=trackedCamera.getWorldPosition(new T.Vector3()),q=trackedCamera.getWorldQuaternion(new T.Quaternion());
 const local=rig.worldToLocal(head.clone()),headYaw=new T.Euler().setFromQuaternion(q,'YXZ').y;
 const rotation=new T.Quaternion().setFromAxisAngle(up,yaw-headYaw).multiply(rig.getWorldQuaternion(new T.Quaternion()));
 const origin=target.clone().sub(local.multiply(rig.getWorldScale(new T.Vector3())).applyQuaternion(rotation));
 if(rig.parent){rig.parent.worldToLocal(origin);rotation.premultiply(rig.parent.getWorldQuaternion(new T.Quaternion()).invert());}
 rig.position.copy(origin);rig.quaternion.copy(rotation);rig.updateWorldMatrix(true,true);
 return {localHead:local,worldOrigin:rig.getWorldPosition(new T.Vector3())};
}
