import * as T from 'three';
import {V,clamp,finiteDt,gravityOf,localBounds,segmentBox,obstacleBox,disposeTree,attachedTo} from './human5-common.js?v=17.5.0';

// Artistic combustion parameters, NOT measured ignition temperatures.
export const FUEL = Object.freeze({
  wood:{ignition:1,heat:1,burnSeconds:70,spread:.22},
  fabric:{ignition:.70,heat:1.2,burnSeconds:35,spread:.30},
  stuffing:{ignition:.25,heat:1.8,burnSeconds:22,spread:.42},
  paper:{ignition:.38,heat:1.1,burnSeconds:18,spread:.22},
  plastic:{ignition:1.3,heat:1.1,burnSeconds:65,spread:.20},
  food:{ignition:2.0,heat:.45,burnSeconds:85,spread:.12},
  inert:{ignition:Infinity,heat:0,burnSeconds:Infinity,spread:0}
});

const vertex = 'varying vec2 vUV; varying float vSeed; void main(){vUV=uv; vSeed=instanceMatrix[3].x*3.1+instanceMatrix[3].z; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}';
const fragment = 'uniform float time; varying vec2 vUV; varying float vSeed; void main(){vec2 p=vec2((vUV.x-.5)*2.,vUV.y); float bend=sin(p.y*9.-time*7.+vSeed)*.12*p.y+sin(p.y*19.-time*11.)*.04; float width=mix(.8,.015,p.y); float edge=abs(p.x+bend)/max(.02,width); float a=(1.-smoothstep(.50,1.,edge))*smoothstep(0.,.08,p.y)*(1.-smoothstep(.64,1.,p.y)); if(a<.015)discard; vec3 color=mix(vec3(1.,.10,.005),vec3(1.,.72,.16),clamp((1.-edge)*(1.-p.y)*1.7,0.,1.)); gl_FragColor=vec4(color*1.6,a*.83);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}';

/** Thermal simulation only. The host remains the sole owner of rigid-body motion. */
export class FireSystem {
  constructor({scene,world,maxSources=24,maxSurfaces=768,waterAt=()=>null,onIgnite=()=>{},onBurn=()=>{},occluded=null}={}) {
    if(!scene||!world)throw new TypeError('FireSystem needs scene and world');
    Object.assign(this,{scene,world,maxSources,maxSurfaces,waterAt,onIgnite,onBurn,occluded});
    this.surfaces=new Map();this.sources=new Set();this.acc=0;this.time=0;this.nextId=1;this.grid=new Map();this.stats={burning:0,surfaces:0,rendered:0};
    this.effects=new T.Group();this.effects.name='H5 fire effects';scene.add(this.effects);
    const geo=new T.PlaneGeometry(1,1);geo.translate(0,.5,0);
    this.material=new T.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,side:T.DoubleSide});
    this.flames=new T.InstancedMesh(geo,this.material,maxSources*2);this.flames.count=0;this.flames.frustumCulled=false;this.flames.userData.h5Effect=true;this.effects.add(this.flames);
    this.dummy=new T.Object3D();this._box=new T.Box3();this._p=V();
  }
  register(root,{material='wood',bounds=null,exposed=true,onExpose=null}={}) {
    if(this.surfaces.size>=this.maxSurfaces)throw new RangeError('Fire surface budget exhausted');
    const spec=FUEL[material];if(!spec)throw new TypeError('Unknown fuel '+material);
    const f={id:this.nextId++,root,material,spec,localBox:bounds?.clone()||localBounds(root),box:new T.Box3(),heat:0,fuel:1,wet:0,burning:false,exposed,onExpose,point:V(),ready:false};
    this.surfaces.set(f.id,f);this.updateSurface(f);return f;
  }
  unregister(f){this.surfaces.delete(f.id);}
  updateSurface(f){f.root.updateWorldMatrix(true,false);f.box.copy(f.localBox).applyMatrix4(f.root.matrixWorld);if(!f.ready){f.localBox.getCenter(f.point);f.ready=true;}}
  expose(f){f.exposed=true;f.onExpose?.(f);}
  ignite(f,worldPoint=null){if(!f.exposed||f.fuel<=0||f.wet>.35||!Number.isFinite(f.spec.ignition))return false;f.heat=f.spec.ignition+1;if(worldPoint){f.point.copy(worldPoint);f.root.worldToLocal(f.point);f.localBox.clampPoint(f.point,f.point);}if(!f.burning){f.burning=true;this.onIgnite(f);}return true;}
  extinguish(f,wetness=.65){f.burning=false;f.heat=0;f.wet=clamp(wetness,0,1);}
  douse(center,radius=.5,strength=1){for(const f of this.surfaces.values())if(f.box.distanceToPoint(center)<=radius)this.extinguish(f,strength);for(const s of this.sources)if(s.p.distanceTo(center)<=radius)s.lit=false;}
  attachTorch(root,{wick=new T.Vector3(0,.78,0),radius=.075,height=.30,fuelSeconds=900,lit=true}={}){
    const s={root,wick:wick.clone(),radius,height,fuelSeconds,lit,p:V(),previous:V(),velocity:V(),sweep:[],ready:false,heat:1.8};this.sources.add(s);return s;
  }
  removeTorch(s){this.sources.delete(s);}
  setTorchLit(s,lit){s.lit=!!lit&&s.fuelSeconds>0;}
  blocked(a,b,ignoreA=null,ignoreB=null){
    if(this.occluded)return !!this.occluded(a,b,ignoreA,ignoreB);
    const midpoint=this._p.copy(a).add(b).multiplyScalar(.5),radius=Math.hypot(a.x-b.x,a.z-b.z)*.5+.02;
    for(const o of this.world.nearby?.(midpoint,radius)||this.world.obstacles||[]){
      if(o.object===ignoreA||o.object===ignoreB||o.object?.userData?.furnRoot===ignoreA||o.object?.userData?.furnRoot===ignoreB)continue;
      const box=obstacleBox(o,this._box);if(box.containsPoint(a)||box.containsPoint(b))continue;
      if(segmentBox(a,b,box)!==null)return true;
    }return false;
  }
  rebuildGrid(){
    this.grid.clear();
    for(const f of this.surfaces.values()){
      if(!attachedTo(f.root,this.scene)){this.surfaces.delete(f.id);continue;}this.updateSurface(f);
      if(!f.exposed||f.fuel<=0||!Number.isFinite(f.spec.ignition))continue;
      const lo=f.box.min,hi=f.box.max;
      for(let x=Math.floor(lo.x);x<=Math.floor(hi.x);x++)for(let y=Math.floor(lo.y);y<=Math.floor(hi.y);y++)for(let z=Math.floor(lo.z);z<=Math.floor(hi.z);z++){
        const key=x+'/'+y+'/'+z;if(!this.grid.has(key))this.grid.set(key,[]);this.grid.get(key).push(f);
      }
    }
  }
  near(a,b,r){
    const box=new T.Box3().setFromPoints([a,b]).expandByScalar(r),out=new Set();
    for(let x=Math.floor(box.min.x);x<=Math.floor(box.max.x);x++)for(let y=Math.floor(box.min.y);y<=Math.floor(box.max.y);y++)for(let z=Math.floor(box.min.z);z<=Math.floor(box.max.z);z++)for(const f of this.grid.get(x+'/'+y+'/'+z)||[])out.add(f);
    return out;
  }
  heatSegment(a,b,r,amount,dt,sourceRoot){
    const source=sourceRoot?.spec?sourceRoot:null,ignoreRoot=source?source.root:sourceRoot;
    for(const f of this.near(a,b,r)){
      if(f===source||(!source&&f.root===ignoreRoot)||f.burning)continue;
      const u=segmentBox(a,b,f.box,r);if(u===null)continue;
      const p=V().lerpVectors(a,b,u),target=f.box.clampPoint(p,V());if(this.blocked(p,target,ignoreRoot,f.root))continue;
      f.heat+=amount*dt*(1-f.wet);if(f.heat>=f.spec.ignition)this.ignite(f,target);
    }
  }
  advance(h){
    this.rebuildGrid();const g=gravityOf(this.world),up=g.lengthSq()>1e-8?g.normalize().negate():new T.Vector3(0,1,0);
    for(const s of this.sources){
      if(!s.root.parent)continue;
      const water=this.waterAt(s.p);if(water&&s.p.y<water.height){s.lit=false;s.sweep.length=0;}
      if(!s.lit||s.fuelSeconds<=0){s.sweep.length=0;continue;}s.fuelSeconds=Math.max(0,s.fuelSeconds-h);if(!s.fuelSeconds)s.lit=false;
      this.heatSegment(s.p,s.p.clone().addScaledVector(up,s.height*.8),s.radius,s.heat,h,s.root);
      // Sweeps collected on EVERY render frame; a fast held torch cannot jump over fuel.
      for(const [a,b,dt] of s.sweep)this.heatSegment(a,b,s.radius+s.height*.2,s.heat,dt,s.root);
      s.sweep.length=0;
    }
    for(const f of this.surfaces.values()){
      if(!f.root.parent)continue;
      const p=f.root.localToWorld(f.point.clone()),water=this.waterAt(p);
      if(water&&p.y<water.height){this.extinguish(f,1);continue;}
      f.wet=Math.max(0,f.wet-h*.012);
      if(!f.burning){f.heat=Math.max(0,f.heat-h*.10);continue;}
      f.fuel=Math.max(0,f.fuel-h/f.spec.burnSeconds);
      this.heatSegment(p,p.clone().addScaledVector(up,.32),f.spec.spread,f.spec.heat,h,f);
      this.onBurn(f,h);if(f.fuel<=0){f.burning=false;f.root.userData.h5Burned=true;}
    }
  }
  tick(dt,cameraPosition=V()){
    dt=finiteDt(dt);if(!dt)return;this.time+=dt;
    for(const s of this.sources){
      s.root.updateWorldMatrix(true,false);s.p.copy(s.wick).applyMatrix4(s.root.matrixWorld);
      if(s.ready){const d=s.p.distanceTo(s.previous);s.velocity.subVectors(s.p,s.previous).divideScalar(dt).clampLength(0,4);if(d<2&&s.lit)s.sweep.push([s.previous.clone(),s.p.clone(),dt]);else s.sweep.length=0;}
      s.previous.copy(s.p);s.ready=true;
    }
    this.acc=Math.min(.15,this.acc+dt);while(this.acc>=.05){this.advance(.05);this.acc-=.05;}
    this.render(cameraPosition);return this.stats;
  }
  emitters(){
    const out=[];for(const s of this.sources)if(s.lit&&s.fuelSeconds>0&&s.root.parent)out.push({position:s.p,height:s.height,radius:s.radius,heat:s.heat,velocity:s.velocity,root:s.root});
    for(const f of this.surfaces.values())if(f.burning&&f.root.parent)out.push({position:f.root.localToWorld(f.point.clone()),height:.25+.25*f.fuel,radius:.09+f.spec.spread*.25,heat:f.spec.heat,velocity:V(),root:f.root});
    return out;
  }
  render(camera){
    const all=this.emitters(),sources=all.sort((a,b)=>a.position.distanceToSquared(camera)-b.position.distanceToSquared(camera)).slice(0,this.maxSources);
    const g=gravityOf(this.world),zero=g.lengthSq()<.0001,up=zero?new T.Vector3(0,1,0):g.normalize().negate();
    let i=0;for(const s of sources){
      const dir=up.clone().addScaledVector(s.velocity,-.055).normalize(),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),dir);
      for(let k=0;k<2;k++){
        this.dummy.position.copy(s.position);this.dummy.quaternion.copy(q).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),k*Math.PI/2));
        this.dummy.scale.set(s.radius*3,zero?s.radius*2:s.height,1);if(zero)this.dummy.position.addScaledVector(up,-s.radius);
        this.dummy.updateMatrix();this.flames.setMatrixAt(i++,this.dummy.matrix);
      }
    }
    this.flames.count=i;this.flames.instanceMatrix.needsUpdate=true;this.material.uniforms.time.value=this.time;
    Object.assign(this.stats,{burning:all.length,surfaces:this.surfaces.size,rendered:sources.length});
  }
  dispose(){this.surfaces.clear();this.sources.clear();disposeTree(this.effects);}
}
