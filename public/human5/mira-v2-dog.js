import * as THREE from 'three';
import { DogModel, clamp } from './src/dog/Dog.js?v=12.7';
import { DogPaws, floorAt } from './src/dog/DogPaws.js?v=12.1';
import { DogJaw } from './src/dog/DogJaw.js?v=12.7';
import { DogTail } from './src/dog/DogTail.js?v=12.1';
import { DogFur } from './src/dog/DogFur.js?v=12.7';
import { DogAudio } from './src/dog/DogAudio.js?v=12.1';
import { DogAI } from './src/dog/DogAI.js?v=12.6';
import { DogAnim } from './src/dog/DogAnim.js?v=12.6';
import { BONE_NAMES } from './src/dog/Dog.js?v=12.7';
const _p=new THREE.Vector3(),_q=new THREE.Vector3();
function dogNearestHit(handle,pos,maxDist){
 let best=null,bd=maxDist,point=new THREE.Vector3();
 handle.root.updateMatrixWorld(true);
 handle.root.traverse(mesh=>{
  if(!mesh.isSkinnedMesh||!mesh.geometry?.attributes?.position)return;
  const n=mesh.geometry.attributes.position.count,step=n>900?3:1;
  for(let i=0;i<n;i+=step){
   mesh.getVertexPosition(i,_p);_p.applyMatrix4(mesh.matrixWorld);
   const d=_p.distanceTo(pos);if(d<bd){bd=d;point.copy(_p);best=mesh;}
  }
 });
 if(!best)return null;
 let bone=handle._model.bones.Spine,bdB=1e9;
 for(const name of BONE_NAMES){
  const b=handle._model.bones[name];if(!b)continue;
  const d=b.getWorldPosition(_q).distanceTo(point);if(d<bdB){bdB=d;bone=b;}
 }
 handle.lastHitDistance=bd;
 return {mesh:best,bone,point:point.clone(),name:bone.name};
}

const byScene=new WeakMap(),byContext=new WeakMap();let emptySystem=null;
const Y=new THREE.Vector3(0,1,0);

export function createDogSystem(input={}) {
  const context=(input&&typeof input==='object')?input:{};
  const existing=byContext.get(context)||(context.scene&&byScene.get(context.scene));
  if(existing){existing._install(context);return existing;}
  if(!Object.keys(context).length&&emptySystem){byContext.set(context,emptySystem);return emptySystem;}
  const ctx={...context},handles=[],audio=new DogAudio();let serial=0,raf=0,lastFrame=0,hostOwned=!!ctx.props||ctx.hostTick===true,readySeen=false,disposed=false;
  const rafAvailable=()=>typeof requestAnimationFrame==='function';
  const cancelLoop=()=>{if(raf&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(raf);raf=0;lastFrame=0;};
  const step=dt=>{
    if(!handles.length||disposed)return;
    dt=clamp(dt,0,.1);if(!dt)return;
    audio.tick();for(const h of [...handles]){h.tickGrab(dt);h._anim.tick(dt);h._fur.tick(dt,ctx.renderer);}
  };
  const ownFrame=t=>{raf=0;if(disposed||hostOwned||!handles.length)return;const dt=lastFrame?(t-lastFrame)/1000:1/60;lastFrame=t;step(dt);raf=requestAnimationFrame(ownFrame);};
  const ensureLoop=()=>{if(!hostOwned&&ctx.scene&&handles.length&&rafAvailable()&&!raf)raf=requestAnimationFrame(ownFrame);};
  const announce=()=>{if(ctx.props&&typeof ctx.props==='object')ctx.props.dogs=system;if(typeof window!=='undefined')window.HUMAN2_DOG=system;};
  const defaultTransform=()=>{
    const g=(ctx.mira||ctx.system)?.actors?.[0]?.group;let yaw=0,position=new THREE.Vector3();
    if(g){
      if(g.getWorldPosition)g.getWorldPosition(position);else if(g.position)position.copy(g.position);
      yaw=g.getWorldQuaternion?new THREE.Euler().setFromQuaternion(g.getWorldQuaternion(new THREE.Quaternion()),'YXZ').y:g.rotation?.y||0;
    }
    position.add(new THREE.Vector3(.85,0,.15).applyAxisAngle(Y,yaw));position.y=floorAt(ctx.world,position.x,position.z,0);
    // The host scene normally has identity transform; also support transformed scene roots.
    if(ctx.scene?.worldToLocal)ctx.scene.worldToLocal(position);
    if(ctx.scene?.getWorldQuaternion)yaw-=new THREE.Euler().setFromQuaternion(ctx.scene.getWorldQuaternion(new THREE.Quaternion()),'YXZ').y;
    return {position,yaw};
  };
  const system={
    handles,
    spawn(opts={}){
      if(disposed)return null;opts=opts&&typeof opts==='object'?opts:{};
      const id=opts.id==null?`dog-${++serial}`:String(opts.id),found=handles.find(h=>h.id===id);if(found)return found;
      const model=new DogModel(),paws=new DogPaws(model,ctx.world),jaw=new DogJaw(model),tail=new DogTail(model);
      const fur=new DogFur(model,ctx.renderer,paws.padMaterial),ai=new DogAI(model,ctx);
      const mira0=(ctx.mira||ctx.system)?.actors?.[0];
      ai.setAttention(opts.attentionMode||mira0?.attentionMode||'attentive');
      model.compactMeshes();fur.rebindLayers();
      const tf=defaultTransform(),last=handles.at(-1);let position=tf.position,yaw=tf.yaw;
      if(last&&!opts.default){position=last.root.position.clone().add(new THREE.Vector3(.6,0,0).applyAxisAngle(Y,last.root.rotation.y));yaw=last.root.rotation.y;}
      if(opts.position){if(Array.isArray(opts.position))position.fromArray(opts.position);else position.copy(opts.position);}
      if(Number.isFinite(opts.yaw))yaw=opts.yaw;
      model.root.position.copy(position);model.root.rotation.y=yaw;model.root.name='Human2_Dog';
      model.root.userData.dogHandle=true;
      if(ctx.scene?.add)ctx.scene.add(model.root);
      model.root.updateMatrixWorld(true);
      const handle={
        id,root:model.root,grabs:new Map(),
        setJaw(t){jaw.set(t);return handle;},
        bark(){audio.bark(()=>jaw.bark(),handle);return handle;},
        setWag(amount){handle._anim.wag=clamp(amount);return handle;},
        setFollow(value){ai.follow=!!value;return handle;},
        setAttention(mode){ai.setAttention(mode);return handle;},
        setState(state){if(['idle','sit','stand','alert'].includes(state))ai.state=state;return handle;},
        nearestHit(pos,maxDist=.2){return dogNearestHit(handle,pos,maxDist);},
        beginGrab(ctrl,hit,point){
          if(!hit||handle.grabs.has(ctrl))return;
          const bone=hit.bone||handle._model.bones.Spine,pt=point||hit.point;
          handle.grabs.set(ctrl,{ctrl,bone,local:bone.worldToLocal(pt.clone()),last:ctrl.getWorldPosition(new THREE.Vector3())});
          ai.held=true;ai.state='alert';handle._anim.nextBark=handle._anim.time;handle.bark();
        },
        tickGrab(dt){
          if(!handle.grabs.size){ai.held=false;return;}
          ai.held=true;
          for(const g of handle.grabs.values()){
            const target=g.ctrl.getWorldPosition(new THREE.Vector3()),cur=g.bone.localToWorld(g.local.clone());
            const delta=target.clone().sub(cur);if(delta.length()>.9){handle.endGrab(g.ctrl);continue;}
            if(delta.length()>6*dt+.08)delta.setLength(6*dt+.08);
            handle.root.position.add(delta);
            handle.root.position.y=Math.max(floorAt(ctx.world,handle.root.position.x,handle.root.position.z,0),handle.root.position.y);
            handle.root.updateMatrixWorld(true);
          }
        },
        endGrab(ctrl){
          if(ctrl)handle.grabs.delete(ctrl);else handle.grabs.clear();
          if(!handle.grabs.size)ai.held=false;
        },
        despawn(){system.despawn(handle);},
        _model:model,_paws:paws,_jaw:jaw,_tail:tail,_fur:fur,_ai:ai
      };
      handle.root.userData.dog=handle;
      handle._anim=new DogAnim(model,paws,jaw,tail,ai,()=>handle.bark());
      handles.push(handle);announce();ensureLoop();return handle;
    },
    spawnDefault(){return handles.find(h=>h.id==='dog-default')||system.spawn({id:'dog-default',default:true});},
    despawn(idOrHandle){const id=typeof idOrHandle==='object'?idOrHandle?.id:idOrHandle,i=handles.findIndex(h=>h.id===id);if(i<0)return false;const h=handles.splice(i,1)[0];audio.cancel(h);h._fur.dispose();h._model.dispose();if(!handles.length)cancelLoop();return true;},
    tick(dt){if(!hostOwned){hostOwned=true;cancelLoop();}step(dt);},
    list(){return handles.slice();},
    // Optional lifecycle helper for fork reloads. Normal host use only needs tick().
    dispose(){for(const h of [...handles])system.despawn(h);disposed=true;cancelLoop();audio.dispose();if(typeof document!=='undefined')document.removeEventListener('mira:ready',onReady);if(ctx.scene)byScene.delete(ctx.scene);if(ctx.props?.dogs===system)delete ctx.props.dogs;if(typeof window!=='undefined'&&window.HUMAN2_DOG===system)delete window.HUMAN2_DOG;},
    _install(next){Object.assign(ctx,next);hostOwned=hostOwned||!!ctx.props||ctx.hostTick===true;if(hostOwned)cancelLoop();if(ctx.scene){byScene.set(ctx.scene,system);for(const h of handles)if(!h.root.parent)ctx.scene.add(h.root);}byContext.set(next,system);announce();if(ctx.scene&&(readySeen||(ctx.mira||ctx.system)?.ready===true))system.spawnDefault();ensureLoop();}
  };
  function onReady(){readySeen=true;if(ctx.scene&&!disposed)system.spawnDefault();}
  if(typeof document!=='undefined')document.addEventListener('mira:ready',onReady,{once:true});
  byContext.set(context,system);if(!Object.keys(context).length)emptySystem=system;
  system._install(context);return system;
}
export function installDog(ctx){return createDogSystem(ctx);}
export const DogModule={install:installDog,create:createDogSystem};
