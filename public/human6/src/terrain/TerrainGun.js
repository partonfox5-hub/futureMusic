import * as T from 'three';
import {clamp} from './TerrainHeightfield.js';
export const TERRAIN_WEAPONS=Object.freeze({
  terrain_raise:{name:'Terrain gun · Raise',mass:1.1,reach:.32,sharpness:0,kind:'terrain',category:'tool',terrainMode:1},
  terrain_lower:{name:'Terrain gun · Lower',mass:1.1,reach:.32,sharpness:0,kind:'terrain',category:'tool',terrainMode:-1}
});
export const isTerrainGun=item=>!!item&&Object.hasOwn(TERRAIN_WEAPONS,item.id);
export function makeTerrainGun(id,scene){
  const data={...TERRAIN_WEAPONS[id]};if(!data.name)throw new Error('Unknown terrain gun');
  const group=new T.Group();group.name=data.name;
  const shell=new T.MeshStandardMaterial({color:0x566671,metalness:.4,roughness:.48}),grip=new T.MeshStandardMaterial({color:0x20282c,roughness:.92}),glow=new T.MeshBasicMaterial({color:data.terrainMode>0?0x70eab2:0xffb05c});
  const add=(g,m,x,y,z)=>{const mesh=new T.Mesh(g,m);mesh.position.set(x,y,z);mesh.castShadow=true;group.add(mesh);return mesh;};
  add(new T.BoxGeometry(.076,.077,.22),shell,0,.032,-.07);
  add(new T.BoxGeometry(.044,.11,.055),grip,0,-.057,.016).rotation.x=-.2;
  add(new T.CylinderGeometry(.034,.04,.15,10),shell,0,.032,-.24).rotation.x=Math.PI/2;
  add(new T.TorusGeometry(.035,.006,5,12),glow,0,.032,-.32);
  add(new T.BoxGeometry(.058,.006,.085),glow,0,.074,-.04);
  add(new T.TorusGeometry(.027,.005,5,12),grip,0,-.044,-.055).rotation.y=Math.PI/2;
  group.traverse(o=>o.userData.weapon=id);scene.add(group);
  return{id,data,group,holder:null,lastTip:null,lastPoint:null,handle:new T.Vector3(0,-.057,.016),velocity:new T.Vector3(),lastHit:new Map(),kick:0,swing:0,terrainMode:data.terrainMode,terrainGlow:glow};
}
export class TerrainGun {
  constructor({props,getTerrain,radius=3,rate=2.2,range=40}){
    this.props=props;this.getTerrain=getTerrain;this.radius=radius;this.rate=rate;this.range=range;this.states=new Map();this.down=false;this.desktopRay=null;this.pointer=new T.Vector2();this.clock=0;this.elapsed=0;this.disposed=false;
    this.rc=new T.Raycaster();this.visuals=[];this.listeners=[];
    for(let i=0;i<2;i++){
      const g=new T.BufferGeometry().setFromPoints(Array.from({length:65},()=>new T.Vector3())),ring=new T.Line(g,new T.LineBasicMaterial({color:0x70eab2,depthTest:true}));
      const beam=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),new T.LineBasicMaterial({color:0x70eab2,transparent:true,opacity:.65}));
      ring.frustumCulled=beam.frustumCulled=false;ring.raycast=beam.raycast=()=>{};props.scene.add(ring,beam);ring.visible=beam.visible=false;this.visuals.push({ring,beam});
    }
    const listen=(target,type,fn)=>{target?.addEventListener?.(type,fn);this.listeners.push(()=>target?.removeEventListener?.(type,fn));};
    listen(globalThis.window,'pointerup',()=>this.stopDesktop());listen(globalThis.window,'pointercancel',()=>this.stopDesktop());listen(globalThis.window,'blur',()=>this.cancel());
    listen(globalThis.document,'visibilitychange',()=>{if(document.hidden)this.cancel();});
    listen(globalThis.document,'pointerlockchange',()=>{if(!document.pointerLockElement)this.cancel();});
    listen(props.renderer?.domElement,'pointermove',e=>this.setPointer(e));
    listen(globalThis.window,'keydown',e=>{
      if(/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName)||e.target?.isContentEditable||e.repeat)return;
      const item=props.held.get('desktop');if(!isTerrainGun(item))return;
      if(e.code==='KeyT'){this.setMode(item,-item.terrainMode);e.preventDefault();}
      if(e.code==='BracketLeft')this.radius=clamp(this.radius-.5,2,12);
      if(e.code==='BracketRight')this.radius=clamp(this.radius+.5,2,12);
    });
    listen(props.renderer?.xr,'sessionend',()=>this.cancel());
  }
  setPointer(e){const r=this.props.renderer.domElement?.getBoundingClientRect();if(r?.width&&r.height){this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.desktopRay=null;}}
  startDesktop(ray){if(this.blocked())return true;this.desktopRay=ray.clone();this.down=true;return true;}
  stopDesktop(){this.down=false;this.desktopRay=null;}
  blocked(){const p=this.props;return!!(p.menu?.isOpen||p.builder?.active||p.restraints?.placing||p.driving?.()||!p.world.root.visible||globalThis.document?.hidden);}
  setMode(item,mode){item.terrainMode=mode<0?-1:1;item.terrainGlow?.color.set(item.terrainMode>0?0x70eab2:0xffb05c);this.props.status='Terrain gun · '+(item.terrainMode>0?'RAISE':'LOWER')+' · hold trigger · radius '+this.radius.toFixed(1)+' m';}
  cancel(){this.stopDesktop();this.states.clear();for(const v of this.visuals)v.ring.visible=v.beam.visible=false;this.clock=0;this.elapsed=0;}
  holdPose(item){
    const p=this.props,key=item.holder,vr=key!=='desktop';
    if(vr&&!p.renderer.xr.isPresenting){p.drop(key);return;}
    const parent=p.handParent(key);if(!parent){p.drop(key);return;}
    if(item.group.parent!==parent)parent.attach(item.group);
    item.group.quaternion.setFromEuler(new T.Euler(vr?-.18:.16,0,0));
    if(vr)item.group.position.set(0,-.012,-.05).sub(item.handle.clone().applyQuaternion(item.group.quaternion));else item.group.position.set(.16,-.11,-.40);
    item.group.updateWorldMatrix(true,true);
  }
  aim(item){
    if(item.holder==='desktop'){
      const camera=this.props.camera;
      if(globalThis.document?.pointerLockElement)this.rc.setFromCamera(new T.Vector2(),camera);
      else if(this.desktopRay){this.rc.ray.copy(this.desktopRay);return this.rc.ray;}
      else this.rc.setFromCamera(this.pointer,camera);
      return this.rc.ray;
    }
    const origin=item.group.localToWorld(new T.Vector3(0,.032,-.325)),q=item.group.getWorldQuaternion(new T.Quaternion());
    return new T.Ray(origin,new T.Vector3(0,0,-1).applyQuaternion(q).normalize());
  }
  draw(v,hit,ray,mode,field){
    const color=mode>0?0x70eab2:0xffb05c;v.ring.material.color.set(color);v.beam.material.color.set(color);
    const p=v.ring.geometry.attributes.position;
    for(let i=0;i<65;i++){const angle=i/64*Math.PI*2,x=hit.point.x+Math.cos(angle)*this.radius,z=hit.point.z+Math.sin(angle)*this.radius;p.setXYZ(i,x,(field.heightAt(x,z)??hit.point.y)+.045,z);}
    p.needsUpdate=true;const b=v.beam.geometry.attributes.position;b.setXYZ(0,ray.origin.x,ray.origin.y,ray.origin.z);b.setXYZ(1,hit.point.x,hit.point.y+.035,hit.point.z);b.needsUpdate=true;v.ring.visible=v.beam.visible=true;
  }
  tick(dt){
    const p=this.props,terrain=this.getTerrain();if(!terrain||this.blocked()){this.cancel();return;}
    dt=clamp(Number.isFinite(dt)?dt:0,0,.05);this.clock+=dt;this.elapsed+=dt;
    const held=[...p.held.values()].filter(isTerrainGun),live=new Set(held);
    for(const item of this.states.keys())if(!live.has(item))this.states.delete(item);
    const inputs=[];
    for(const item of held){
      let state=this.states.get(item);if(!state){state={ready:item.holder==='desktop',toggle:false};this.states.set(item,state);}
      let pressure=0,toggle=false;
      if(item.holder==='desktop')pressure=this.down?1:0;
      else{
        const hand=p.system.hands.handedness[item.holder],src=[...(p.renderer.xr.getSession()?.inputSources||[])].find(s=>s.handedness===hand&&!s.hand),buttons=src?.gamepad?.buttons;
        pressure=clamp(buttons?.[0]?.value??(buttons?.[0]?.pressed?1:0),0,1);
        // Right stick click only: left stick already spawns restraints in this host.
        toggle=hand==='right'&&!!buttons?.[3]?.pressed;
        if(!src){state.ready=false;pressure=0;}
      }
      if(pressure<.1)state.ready=true;
      if(toggle&&!state.toggle){this.setMode(item,-item.terrainMode);state.ready=false;}state.toggle=toggle;
      inputs.push({item,pressure:state.ready?pressure:0});
    }
    if(this.clock<.05)return;const elapsed=Math.min(this.elapsed,.075);this.clock=0;this.elapsed=0;
    for(const v of this.visuals)v.ring.visible=v.beam.visible=false;
    let index=0;
    for(const {item,pressure} of inputs){
      const ray=this.aim(item),hit=terrain.mesh.raycast(ray,this.range);if(!hit)continue;
      // Respect nearer walls, props and actors, excluding our own held tool and terrain proxy.
      const blocker=p.hit?.(ray,hit.distance,false);
      if(blocker&&blocker.object!==terrain.mesh.root&&blocker.distance<hit.distance-.04)continue;
      if(pressure>.1){const result=terrain.field.brush({x:hit.point.x,z:hit.point.z,radius:this.radius,delta:item.terrainMode*this.rate*pressure*elapsed});
        p.status=result?'Terrain '+(item.terrainMode>0?'raised':'lowered')+' · '+this.radius.toFixed(1)+' m brush':'House foundation protected';
      }
      if(this.visuals[index])this.draw(this.visuals[index++],hit,ray,item.terrainMode,terrain.field);
    }
    if(!held.some(i=>i.holder==='desktop'))this.stopDesktop();
  }
  dispose(){if(this.disposed)return;this.disposed=true;this.cancel();for(const fn of this.listeners)fn();for(const v of this.visuals)for(const mesh of [v.ring,v.beam]){mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();}}
}
