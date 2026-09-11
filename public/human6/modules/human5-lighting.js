import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {V,clamp,finiteDt,disposeTree} from './human5-common.js?v=19.1.0';

export const LIGHT_BUDGETS=Object.freeze({quest:{point:2,spot:1,shadowSize:1024},desktop:{point:4,spot:2,shadowSize:2048}});
export const FIXTURES=['Torch','Standing lamp','Table lamp','Chandelier','Hanging shaded lamp'];

export function bulbMaterial({transmission=false}={}){
  return new T.MeshPhysicalMaterial({name:'H5 bulb glass',color:0xf3f6ff,metalness:0,roughness:.11,ior:1.46,clearcoat:1,clearcoatRoughness:.08,transmission:transmission?.94:0,thickness:.001,transparent:!transmission,opacity:transmission?1:.27,depthWrite:false});
}
function box(g,m,p,parent){const o=new T.Mesh(g,m);o.position.fromArray(p);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
/** Creates meshes only; pooled lights live in FixtureLights. tagMovable is the host's function. */
export function createFixture(world,type,{position=[0,0,0],yaw=0,tagMovable=null,fire=null,transmission=false,color=0xc5a778}={}){
  if(!FIXTURES.includes(type))throw new TypeError('Unknown fixture '+type);
  const root=new T.Group();root.name=type;root.position.fromArray(position);root.rotation.y=yaw;world.root.add(root);
  const metal=new T.MeshStandardMaterial({color:0x48413b,roughness:.32,metalness:.8});
  const shade=new T.MeshStandardMaterial({color,roughness:.9,side:T.DoubleSide});
  const glow=new T.MeshStandardMaterial({color:0xffe4b7,emissive:0xffc67e,emissiveIntensity:1.5,roughness:.4});
  const glass=bulbMaterial({transmission});
  const bulbs=[];let center=V(),direction=new T.Vector3(0,-1,0),kind='point';
  const bulb=(p)=>{box(new T.CylinderGeometry(.019,.019,.037,8),metal,[p[0],p[1]-.05,p[2]],root);const b=box(new T.SphereGeometry(.048,12,8),glass,p,root);b.castShadow=false;box(new T.SphereGeometry(.024,8,6),glow,p,root).castShadow=false;bulbs.push(b);};
  if(type==='Torch'){
    box(new T.CylinderGeometry(.018,.026,.70,9),new T.MeshStandardMaterial({color:0x694b2c,roughness:.94}),[0,.35,0],root);
    box(new T.CylinderGeometry(.059,.028,.13,10),metal,[0,.735,0],root);
    box(new T.CylinderGeometry(.038,.027,.10,8),new T.MeshStandardMaterial({color:0x99836b,roughness:1}),[0,.79,0],root);
    center.set(0,.84,0);root.userData.h5Torch=fire?.attachTorch(root,{wick:center,height:.32})||null;
  }else if(type==='Standing lamp'||type==='Table lamp'){
    const standing=type==='Standing lamp',h=standing?1.48:.48,r=standing?.23:.145;
    box(new T.CylinderGeometry(r,r,.05,18),metal,[0,.025,0],root);
    box(new T.CylinderGeometry(.017,.024,h,10),metal,[0,h/2+.04,0],root);
    center.set(0,h+.04,0);bulb(center.toArray());
    box(new T.CylinderGeometry(r*.72,r*1.25,.28,18,1,true),shade,[0,h+.08,0],root);
    kind='spot';
  }else if(type==='Hanging shaded lamp'){
    box(new T.CylinderGeometry(.009,.009,.6,6),metal,[0,-.30,0],root);
    box(new T.CylinderGeometry(.095,.32,.23,20,1,true),shade,[0,-.65,0],root);
    center.set(0,-.68,0);bulb(center.toArray());kind='spot';
  }else{
    box(new T.CylinderGeometry(.009,.009,.42,6),metal,[0,-.21,0],root);
    box(new T.TorusGeometry(.36,.017,6,24),metal,[0,-.5,0],root).rotation.x=Math.PI/2;
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;bulb([Math.cos(a)*.36,-.44,Math.sin(a)*.36]);}
    center.set(0,-.40,0);
  }
  const movable=['Standing lamp','Table lamp','Torch'].includes(type);
  const fixture={root,type,kind,center,direction,bulbs,enabled:true,color:0xffdbad,intensity:type==='Chandelier'?9:type==='Table lamp'?4:6,distance:7,angle:.95,penumbra:.65};
  root.userData.h5Fixture=fixture;
  if(movable&&tagMovable){const f=tagMovable(world,root,type==='Torch'?'Firewood':'Floor lamp');f.mass=type==='Torch'?.7:type==='Table lamp'?2.1:5;f.health=80;}
  root.traverse(o=>{if(o.isMesh&&!world.pickables.includes(o))world.pickables.push(o);});
  return fixture;
}

/** Fixed light count avoids material recompile when nearby lamps change. */
export class FixtureLights {
  constructor(scene,{quest=true,fire=null,occluded=null}={}){
    this.scene=scene;this.fire=fire;this.occluded=occluded;this.fixtures=new Set();this.time=0;this.visibility=new WeakMap();this.selectionDue=0;this.cachedSources=[];this.stats={selections:0,occlusionQueries:0};
    const b=LIGHT_BUDGETS[quest?'quest':'desktop'];this.slots=[];
    for(const kind of ['point','spot'])for(let i=0;i<b[kind];i++){
      const light=kind==='point'?new T.PointLight(0xffffff,0,7,2):new T.SpotLight(0xffffff,0,7,.95,.65,2);
      light.castShadow=false;light.userData.h5Pooled=true;scene.add(light);if(light.target)scene.add(light.target);this.slots.push({kind,light,source:null});
    }
  }
  add(f){this.fixtures.add(f);return f;}
  remove(f){this.fixtures.delete(f);}
  tick(dt,viewer){
    dt=finiteDt(dt);this.time+=dt;this.selectionDue-=dt;const refresh=this.selectionDue<=0;if(refresh){this.selectionDue=1/12;this.stats.selections++;}const sources=refresh?[]:this.cachedSources;
    if(refresh){
    for(const f of this.fixtures){
      if(!f.enabled||!f.root.parent||f.type==='Torch')continue;let visible=true;for(let o=f.root;o;o=o.parent)if(!o.visible){visible=false;break;}if(!visible)continue;
      const position=f.root.localToWorld(f.center.clone());
      if(position.distanceToSquared(viewer)>f.distance*f.distance*4)continue;
      sources.push({...f,position,direction:f.direction.clone().transformDirection(f.root.matrixWorld),identity:f});
    }
    for(const s of this.fire?.emitters()||[])sources.push({...s,identity:s.root,kind:'point',color:0xff982e,intensity:2.7*s.heat*(.9+.1*Math.sin(this.time*11+s.position.x)),distance:5});
    this.cachedSources=sources;}
    const used=new Set();
    for(const slot of this.slots){
      let best=null,score=0;
      for(const s of sources){
        if(s.kind!==slot.kind||used.has(s.identity))continue;
        let visibility=this.visibility.get(s.identity);if(!visibility||this.time-visibility.time>.10||visibility.a.distanceToSquared(s.position)>.04||visibility.b.distanceToSquared(viewer)>.09){visibility={time:this.time,a:s.position.clone(),b:viewer.clone(),blocked:!!(this.stats.occlusionQueries++,this.occluded?.(s.position,viewer,s.root,null))};this.visibility.set(s.identity,visibility);}if(visibility.blocked)continue;
        const value=s.intensity/(.4+s.position.distanceToSquared(viewer))*(slot.source===s.identity?1.25:1);
        if(value>score){best=s;score=value;}
      }
      const L=slot.light;
      if(!best){L.intensity*=Math.exp(-10*dt);slot.source=null;continue;}
      used.add(best.identity);
      // When ownership changes, darken before relocation; no light drifting through walls.
      if(slot.source!==best.identity){L.intensity=0;slot.source=best.identity;}
      if(best.center&&best.root?.parent)best.position.copy(best.root.localToWorld(best.center.clone()));
      L.position.copy(best.position);L.color.setHex(best.color);L.distance=best.distance;
      L.intensity=T.MathUtils.damp(L.intensity,best.intensity,14,dt);
      if(L.target){L.angle=best.angle??.95;L.penumbra=best.penumbra??.65;L.target.position.copy(best.position).add(best.direction);L.target.updateMatrixWorld();}
    }
  }
  dispose(){for(const {light} of this.slots){light.removeFromParent();light.target?.removeFromParent();light.dispose?.();}this.fixtures.clear();}
}

/** Opt-in VR/daylight rig. Replace the old rig once; do not stack both rigs. */
export function createQuestLighting(scene,{renderer,quest=true,shadows=true,environment=null}={}){
  const group=new T.Group();group.name='H5 daylight';scene.add(group);
  const hemi=new T.HemisphereLight(0xd5e5ff,0x746553,.38),key=new T.DirectionalLight(0xfff1db,2.4),fill=new T.DirectionalLight(0xd8e8ff,.12),rim=new T.DirectionalLight(0xffffff,0),ambient=new T.AmbientLight(0xffffff,.025);
  key.position.set(7,11,5);fill.position.set(-4,3,-2);group.add(hemi,key,ambient,key.target);
  key.castShadow=shadows;const size=quest?1024:2048;key.shadow.mapSize.set(size,size);Object.assign(key.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.1,far:34});key.shadow.bias=-.00015;key.shadow.normalBias=.015;
  let target=null,outdoorTarget=null;const previous={environment:scene.environment,intensity:scene.environmentIntensity};
  if(environment)scene.environment=environment;
  else if(renderer){const pm=new T.PMREMGenerator(renderer),room=new RoomEnvironment();try{target=pm.fromScene(room,.04);
      const skyScene=new T.Scene(),skyMat=new T.ShaderMaterial({side:T.BackSide,vertexShader:'varying vec3 dir;void main(){dir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec3 dir;void main(){vec3 d=normalize(dir);vec3 sky=mix(vec3(.70,.75,.77),vec3(.19,.39,.69),smoothstep(0.0,.85,d.y));vec3 ground=vec3(.16,.14,.10);vec3 col=mix(ground,sky,smoothstep(-.04,.04,d.y));float sun=pow(max(0.0,dot(d,normalize(vec3(7.0,11.0,5.0)))),240.0);gl_FragColor=vec4(col+vec3(3.3,2.8,2.1)*sun,1.0);}'}),skyMesh=new T.Mesh(new T.SphereGeometry(10,24,12),skyMat);skyScene.add(skyMesh);outdoorTarget=pm.fromScene(skyScene,.05);skyMesh.geometry.dispose();skyMat.dispose();scene.environment=outdoorTarget.texture;}finally{room.dispose();pm.dispose();}}
  scene.environmentIntensity=.35;
  const lightOffset=new T.Vector3(7,11,5),lightRight=new T.Vector3(5,0,-7).normalize(),lightUp=new T.Vector3().crossVectors(new T.Vector3(7,11,5).normalize(),lightRight).normalize(),focus=new T.Vector3();
  return {key,fill,rim,hemi,ambient,env:scene.environment,exposure:1.05,
    setTimeOfDay(cycle,weatherDim=1){
      const solar=T.MathUtils.smoothstep(cycle.sun.y,-.03,.12),lunar=cycle.night*.065;
      lightOffset.copy(solar>.025?cycle.sun:cycle.moon).multiplyScalar(14);
      lightRight.crossVectors(new T.Vector3(0,1,0),lightOffset).normalize();lightUp.crossVectors(lightOffset,lightRight).normalize();
      key.color.copy(solar>.025?cycle.sunColor:new T.Color(0x96b8ee));key.intensity=(2.4*solar+lunar)*weatherDim;
      hemi.intensity=(.055+.325*cycle.day)*weatherDim;hemi.color.copy(cycle.zenith).lerp(new T.Color(0xd5e5ff),.48);
      ambient.intensity=.012+.013*cycle.day;scene.environmentIntensity=(.035+.315*cycle.day)*weatherDim;
    },
    setInterior(inside){if(target&&outdoorTarget)scene.environment=inside?target.texture:outdoorTarget.texture;},
    follow(p){const snap=14/size;focus.copy(p);const x=focus.dot(lightRight),y=focus.dot(lightUp);focus.addScaledVector(lightRight,Math.round(x/snap)*snap-x).addScaledVector(lightUp,Math.round(y/snap)*snap-y);key.target.position.copy(focus);key.position.copy(focus).add(lightOffset);key.target.updateMatrixWorld();},
    dispose(){group.removeFromParent();key.dispose();if(scene.environment===(environment||target?.texture)||scene.environment===outdoorTarget?.texture){scene.environment=previous.environment;scene.environmentIntensity=previous.intensity;}target?.dispose();outdoorTarget?.dispose();}
  };
}

/** AR-only: snapshots authored lights at session start; no change without an estimate. */
export class EstimatedRoomLight {
  constructor(scene,renderer,rig){this.scene=scene;this.renderer=renderer;this.rig=rig;this.probe=new T.LightProbe();this.primary=new T.DirectionalLight(0xffffff,0);this.probe.intensity=0;this.session=null;this.saved=[];this.age=0;this.generation=0;}
  async start(session,{mode='immersive-ar'}={}){
    this.stop();if(mode!=='immersive-ar'||!session?.requestLightProbe)return false;
    this.session=session;this.scene.add(this.probe,this.primary,this.primary.target);const generation=++this.generation;
    this.saved=[];this.scene.traverse(o=>{if(o.isLight&&o!==this.probe&&o!==this.primary&&!o.userData.h5Pooled)this.saved.push([o,o.intensity]);});this.env=this.scene.environmentIntensity;
    this.end=()=>this.stop();session.addEventListener('end',this.end,{once:true});
    try{const p=await session.requestLightProbe();if(generation===this.generation&&this.session===session){this.xrProbe=p;return true;}}catch{}return false;
  }
  restore(){for(const [l,intensity] of this.saved)l.intensity=intensity;if(this.env!==undefined)this.scene.environmentIntensity=this.env;this.probe.intensity=0;this.primary.intensity=0;}
  stop(){this.generation++;this.session?.removeEventListener('end',this.end);this.restore();this.saved=[];this.session=null;this.xrProbe=null;this.age=0;this.probe.removeFromParent();this.primary.removeFromParent();this.primary.target.removeFromParent();}
  tick(frame,dt=1/72){
    if(!frame||!this.xrProbe)return;dt=finiteDt(dt);this.age+=dt;let e,pose;
    try{e=frame.getLightEstimate(this.xrProbe);const ref=this.renderer.xr.getReferenceSpace();pose=ref&&frame.getPose(this.xrProbe.probeSpace,ref);}catch{e=null;}
    if(!e||!pose){if(this.age>2)this.restore();return;}this.age=0;const a=1-Math.exp(-3*dt);
    // Conservative rotationally invariant L0 ambient term. Higher SH bands require
    // proper SH rotation, so they are not incorrectly reused in the wrong space.
    this.probe.sh.coefficients[0].lerp(V().fromArray(e.sphericalHarmonicsCoefficients),a);
    for(let i=1;i<9;i++)this.probe.sh.coefficients[i].set(0,0,0);this.probe.intensity=1;
    const m=new T.Matrix4().fromArray(pose.transform.matrix);if(this.rig){this.rig.updateWorldMatrix(true,false);m.premultiply(this.rig.matrixWorld);}
    const p=V().setFromMatrixPosition(m),d=e.primaryLightDirection,c=e.primaryLightIntensity,peak=Math.max(c.x,c.y,c.z,.0001);
    const dir=V().set(d.x,d.y,d.z).transformDirection(m);this.primary.target.position.copy(p);this.primary.position.copy(p).addScaledVector(dir,3);this.primary.target.updateMatrixWorld();
    this.primary.color.setRGB(c.x/peak,c.y/peak,c.z/peak);this.primary.intensity=T.MathUtils.damp(this.primary.intensity,Math.min(peak,6),3,dt);
    for(const [l,i] of this.saved)l.intensity=T.MathUtils.damp(l.intensity,i*.08,3,dt);this.scene.environmentIntensity=T.MathUtils.damp(this.scene.environmentIntensity,this.env*.12,3,dt);
  }
  dispose(){this.stop();this.probe.removeFromParent();this.primary.removeFromParent();this.primary.target.removeFromParent();}
}
