import * as THREE from 'three';

export class DogBite {
 constructor(handle,ctx,items){this.handle=handle;this.ctx=ctx;this.items=items;this.cooldown=0;this.ray=new THREE.Raycaster();this.ray.near=0;this.ray.far=.22;}
 tick(dt){this.cooldown=Math.max(0,this.cooldown-dt);}
 muzzle(out=new THREE.Vector3()){const h=this.handle,cat=h.kind==='cat'||h._model?.species==='cat';h._model.updatePoseWorld();return h.bones.Head.localToWorld(h._model.muzzleOffset?out.copy(h._model.muzzleOffset):out.set(0,cat?-.012:-.015,cat?.085:.246));}
 direction(out=new THREE.Vector3()){return out.set(0,0,1).applyQuaternion(this.handle.bones.Head.getWorldQuaternion(new THREE.Quaternion())).normalize();}
 snap(target=null){
  const h=this.handle;if(this.cooldown>0||h.dead||h.h5Mouth?.held||h._ai.held||h.root.userData.waterSwimming)return false;
  // 0.45 s jaw cycle; 0.50 s damage gate enforces the stricter two impacts/s cap.
  this.cooldown=.5;h._jaw.bark();
  const origin=this.muzzle(),dir=this.direction();this.ray.set(origin,dir);
  const roots=this.ctx.scene?.children||[],hits=this.ray.intersectObjects(roots,true);
  let hit=null;
  // Teeth can already overlap paper. Front-face raycasts miss the inside of a sealed bag.
  for(const a of this.items.items)if(a.type==='bag'&&!a.torn){const box=new THREE.Box3().setFromObject(a.group);if(box.containsPoint(origin)){hit={mesh:a.group.children[0],object:a.group.children[0],point:origin.clone(),normal:dir.clone().negate(),distance:0};break;}}

  for(const r of hits){
   if(hit)break;
   let o=r.object,skip=false;for(let p=o;p;p=p.parent)if(p===h.root||p.visible===false){skip=true;break;}
   const item=this.items.resolve(o);if(skip||item?.owner===h||o===this.items.mesh)continue;
   // A nearer solid object blocks the bite, even when a bag was the intended interest.
   const actor=o.userData.actor||o.userData.mira||null;
   hit={...r,mesh:o,object:o,point:r.point.clone(),normal:r.face?.normal?.clone().transformDirection(o.matrixWorld),actor};break;
  }
  if(!hit)return false;
  if(typeof this.ctx.props?.impact==='function')this.ctx.props.impact(hit,1.2,dir,'bite',.08);
  else this.items.impact(hit,1.2,dir,'bite',.08);
  return hit;
 }
}
