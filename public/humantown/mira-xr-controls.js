import * as T from 'three';
const V=()=>new T.Vector3(),Q=()=>new T.Quaternion();
// Viewer transforms are local to XR reference space. Do not ask the unparented
// ArrayCamera to rebuild matrixWorld: that can discard the player-rig transform.
export function viewerPose(renderer,rig,camera,frame){
 const pose=frame?.getViewerPose(renderer.xr.getReferenceSpace?.());if(pose){const p=pose.transform.position,q=pose.transform.orientation;renderer.miraHead={p:new T.Vector3(p.x,p.y,p.z),q:new T.Quaternion(q.x,q.y,q.z,q.w)};}
 if(!renderer.xr.isPresenting)return {position:camera.getWorldPosition(V()),quaternion:camera.getWorldQuaternion(Q())};
 const h=renderer.miraHead;if(h){rig.updateWorldMatrix(true,false);return {position:h.p.clone().applyMatrix4(rig.matrixWorld),quaternion:rig.getWorldQuaternion(Q()).multiply(h.q)};}
 const c=renderer.xr.getCamera(),position=V(),quaternion=Q();c.matrixWorld.decompose(position,quaternion,V());return {position,quaternion};
}
export function stick(gp){const a=gp?.axes||[];return a.length>=4?{x:a[2]||0,y:a[3]||0}:{x:a[0]||0,y:a[1]||0};}
export function moveXR(renderer,rig,camera,dt,{blocked=false,speed=1.45,turn=1.65}={}){if(!renderer.xr.isPresenting||blocked)return;const src=[...(renderer.xr.getSession()?.inputSources||[])],left=src.find(s=>s.handedness==='left'),right=src.find(s=>s.handedness==='right'),l=stick(left?.gamepad),r=stick(right?.gamepad),dead=v=>Math.abs(v)<.15?0:Math.sign(v)*(Math.abs(v)-.15)/.85,pose=viewerPose(renderer,rig,camera),forward=new T.Vector3(0,0,-1).applyQuaternion(pose.quaternion).setY(0).normalize(),side=new T.Vector3(-forward.z,0,forward.x),angle=-dead(r.x)*turn*dt;
 if(angle){const offset=pose.position.clone().sub(rig.position),rotated=offset.clone().applyAxisAngle(new T.Vector3(0,1,0),angle);rig.position.add(offset).sub(rotated);rig.rotation.y+=angle;}
 const x=dead(l.x),y=dead(l.y),normal=Math.max(1,Math.hypot(x,y));rig.position.addScaledVector(forward,-y/normal*speed*dt).addScaledVector(side,x/normal*speed*dt);rig.updateMatrixWorld(true);
}
export function placePanel(panel,renderer,rig,camera,distance=.80){const p=viewerPose(renderer,rig,camera),forward=new T.Vector3(0,0,-1).applyQuaternion(p.quaternion);forward.y=0;if(forward.lengthSq()<.01)forward.set(0,0,-1).applyQuaternion(rig.quaternion);forward.normalize();panel.position.copy(p.position).addScaledVector(forward,distance);panel.position.y-=.08;panel.lookAt(p.position);panel.updateMatrixWorld(true);}
