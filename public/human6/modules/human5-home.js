import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {wrapMethod} from './human5-common.js?v=19.3.0';
import {tagMovable} from '../mira-v2-furniture.js?v=19.3.0';
import {BASEMENT,basementFloor,inBasementFootprint,LatchHinge,reflectCamera,CondensationGrid} from './human5-home-mechanics.js?v=19.3.0';
import {withOffscreenView,clipPortalCamera} from './human5-view-surfaces.js?v=19.3.0';
import {createArcadeGame} from './human5-arcade.js?v=19.3.0';
import {createWetnessSystem} from './human5-wetness.js?v=19.3.0';

const V=()=>new T.Vector3(),clamp=T.MathUtils.clamp;
export function installHome({world,scene,camera,renderer,rig,props,mira,wardrobe,weather,upgrade,keys={},quest=true}={}){
  if(world.h5Home)return world.h5Home;
  const restores=[],owned=new Set(),obstacles=[],pickables=[],controls=[],showers=[],mirrors=[],holds=new Map();
  const wetness=createWetnessSystem({mira,props,world,weather,wardrobe}),materials=new Set(),geometries=new Set(),textures=new Set(),fixtures=[];
  const raycaster=new T.Raycaster(),viewer=V(),dummy=new T.Object3D(),virtual=new T.PerspectiveCamera();
  let root=null,crate=null,arcade=null,steam=null,clock=0,mirrorAcc=0,eyes=[],metal,wood,paint,stone,rubber;
  function mat(color,roughness=.7,metalness=0){const m=new T.MeshStandardMaterial({color,roughness,metalness});materials.add(m);return m;}
  function mesh(parent,geometry,material,pos=[0,0,0]){geometries.add(geometry);const m=new T.Mesh(geometry,material);m.position.set(...pos);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  const box=(parent,size,pos,material)=>mesh(parent,new T.BoxGeometry(...size),material,pos);
  function line(parent,a,b,r,material){const A=new T.Vector3(...a),B=new T.Vector3(...b),m=mesh(parent,new T.CylinderGeometry(r,r,A.distanceTo(B),6),material);m.position.copy(A).add(B).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),B.sub(A).normalize());return m;}
  function group(parent,name,pos,yaw=0){const g=new T.Group();g.name=name;g.position.set(...pos);g.rotation.y=yaw;parent.add(g);return g;}
  const toWorld=(h,x,y,z)=>new T.Vector3(x,y,z).applyAxisAngle(new T.Vector3(0,1,0),h.yaw).add(new T.Vector3(h.x,0,h.z));
  function pick(m){if(!pickables.includes(m)){world.pickables.push(m);pickables.push(m);}return m;}
  function collider(m,walkable=false){m.updateWorldMatrix(true,true);const b=new T.Box3().setFromObject(m),s=b.getSize(V()),c=b.getCenter(V()),o=world.obstacle(c.x,c.z,s.x,s.z,b.min.y,s.y);o.object=m;o.h5Home=true;o.walkable=walkable;obstacles.push(o);return o;}
  function control(m,kind,click,data={}){m.userData.h5HomeControl=true;m.userData.h5DynamicPart=true;controls.push({mesh:m,kind,click,...data});return m;}
  /** Merge only rigid siblings. Preserve collision and picking ownership. */
  function merge(g){g.updateWorldMatrix(true,true);const inv=g.matrixWorld.clone().invert(),sets=new Map();
    for(const m of [...g.children])if(m.isMesh&&m.visible&&!m.isInstancedMesh&&!m.userData.h5HomeControl){if(!sets.has(m.material))sets.set(m.material,[]);sets.get(m.material).push(m);}
    for(const [material,list]of sets)if(list.length>1){const gs=list.map(m=>m.geometry.clone().applyMatrix4(inv.clone().multiply(m.matrixWorld))),geo=mergeGeometries(gs);gs.forEach(x=>x.dispose());const combined=mesh(g,geo,material);combined.name='Home rigid parts';let wasPick=false;
      for(const old of list){if(pickables.includes(old)){wasPick=true;world.pickables=world.pickables.filter(x=>x!==old);pickables.splice(pickables.indexOf(old),1);}for(const o of obstacles)if(o.object===old)o.object=combined;old.removeFromParent();geometries.delete(old.geometry);old.geometry.dispose();}if(wasPick)pick(combined);
    }
  }
  function installGroundHole(){if(!world.h5OpenWorld?.active)return;const found=new Set();world.terrain.traverse(m=>{if(m.name==='Persistent distant terrain'||m.userData.h5Terrain)found.add(m.material);});
    for(const m of found){if(!m||m.userData.h5BasementHole)continue;const old=m.onBeforeCompile,key=m.customProgramCacheKey;
      m.onBeforeCompile=s=>{old.call(m,s);s.fragmentShader=s.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(terrainWorld.x>-21.20&&terrainWorld.x<-12.80&&terrainWorld.z>-3.60&&terrainWorld.z<3.60)discard;');};m.customProgramCacheKey=()=> (key?.call(m)||'')+'/willow-basement';m.userData.h5BasementHole=true;m.needsUpdate=true;
    }
  }
  function buildBasement(h){const b=BASEMENT,g=group(root,'Willow basement',[h.x,0,h.z],h.yaw);h.bounds.min.y=-2.95;
    if(h.slab){h.slab.removeFromParent();h.slab.geometry.dispose();h.slab=null;}world.floors=world.floors.filter(f=>f!==h.floorRecord);
    const floors=[{x:-3.515,z:0,w:.17,d:8.4},{x:.655,z:0,w:5.89,d:8.4},{x:b.stairX,z:(-4.2+b.stairBottom)/2,w:b.stairWidth,d:b.stairBottom+4.2},{x:b.stairX,z:(4.2+b.stairTop)/2,w:b.stairWidth,d:4.2-b.stairTop}];
    for(const f of floors){pick(box(g,[f.w,.12,f.d],[f.x,-.005,f.z],wood));const p=toWorld(h,f.x,-.065,f.z);world.floors.push({x:p.x,z:p.z,w:f.d,d:f.w,y:-.065,h:.12,h5Home:true});}
    pick(box(g,[b.w,.16,b.d],[0,b.level-.08,0],stone));world.floors.push({x:h.x,z:h.z,w:b.d,d:b.w,y:b.level-.16,h:.16,h5Home:true});
    for(const [size,pos]of [[[b.w,2.8,.17],[0,-1.4,-b.d/2]],[[b.w,2.8,.17],[0,-1.4,b.d/2]],[[.17,2.8,b.d],[-b.w/2,-1.4,0]],[[.17,2.8,b.d],[b.w/2,-1.4,0]]]){const m=box(g,size,pos,paint);pick(m);collider(m);}
    const run=(b.stairTop-b.stairBottom)/b.steps,rise=(b.top-b.level)/b.steps;
    for(let i=0;i<b.steps;i++)pick(box(g,[b.stairWidth,(i+1)*rise,run],[b.stairX,b.level+(i+1)*rise/2,b.stairBottom+(i+.5)*run],wood));
    for(const x of [b.stairX-.55,b.stairX+.55]){line(g,[x,b.level+.9,b.stairBottom],[x,b.top+.9,b.stairTop-.22],.025,metal);for(let i=0;i<5;i++){const t=i/4,z=b.stairBottom+t*(b.stairTop-.22-b.stairBottom),y=b.level+t*(b.top-b.level);line(g,[x,y,z],[x,y+.9,z],.016,metal);}}
    const edge=box(g,[.035,1,b.stairTop-b.stairBottom-.25],[b.stairX+.59,.55,(b.stairTop+b.stairBottom-.25)/2],metal);edge.visible=false;collider(edge);
    merge(g);for(const m of g.children)if(m.isMesh&&m.visible)pick(m);owned.add(g);h.contents.push(g);
    crate=createCrate(toWorld(h,1.65,b.level,.9),h.yaw);arcade=createArcade(toWorld(h,-.65,b.level,-2.8),h.yaw);h.contents.push(crate.root,arcade.root);
    for(const x of [-1.2,1.6]){const lamp=box(g,[.55,.05,.28],[x,-.25,1.3],mat(0xf6e8c6,.35));lamp.material.emissive.setHex(0xffdc9c);lamp.material.emissiveIntensity=.65;}
    const fixture={root:g,type:'Basement ceiling',kind:'point',center:new T.Vector3(0,-.6,0),direction:new T.Vector3(0,-1,0),bulbs:[],enabled:true,color:0xffdfad,intensity:16,distance:7};upgrade.lights.add(fixture);fixtures.push(fixture);
  }
  function createCrate(position,yaw){const g=group(root,'Large dog crate',position.toArray(),yaw),hinge=group(g,'Crate hinged door',[-.54,.035,.78]),state=new LatchHinge();hinge.userData.h5DynamicPart=true;
    const frame=group(g,'Crate steel cage',[0,0,0]);box(frame,[1.13,.055,1.60],[0,.028,0],rubber);
    for(const x of [-.55,.55])for(const z of [-.79,.79])line(frame,[x,.03,z],[x,1.18,z],.015,metal);
    for(const y of [.08,1.17]){for(const x of [-.55,.55])line(frame,[x,y,-.79],[x,y,.79],.014,metal);for(const z of [-.79,.79])line(frame,[-.55,y,z],[.55,y,z],.014,metal);}
    for(let z=-.70;z<=.70;z+=.10)for(const x of [-.55,.55])line(frame,[x,.06,z],[x,1.17,z],.0065,metal);
    for(let x=-.45;x<=.45;x+=.10){line(frame,[x,.06,-.79],[x,1.17,-.79],.0065,metal);line(frame,[x,1.17,-.79],[x,1.17,.79],.0065,metal);}
    for(const y of [.10,.58,1.08])line(hinge,[.015,y,0],[1.055,y,0],.012,metal);for(let x=.015;x<=1.06;x+=.104)line(hinge,[x,.10,0],[x,1.08,0],.007,metal);
    const bolt=box(hinge,[.19,.025,.025],[.99,.64,.035],metal);control(bolt,'bolt',()=>state.slide(state.bolt>.5?0:1),{state,owner:g});
    box(hinge,[.035,.07,.025],[.94,.62,.064],metal);const handle=box(hinge,[.025,.13,.035],[.90,.65,.055],rubber);control(handle,'crateDoor',()=>{if(!state.latched)state.target=state.angle>.5?0:1.65;},{state,hinge,owner:g});
    box(frame,[.045,.06,.06],[.58,.68,.815],metal);for(const y of [.23,.98])line(frame,[-.55,y-.05,.79],[-.55,y+.05,.79],.027,metal);merge(frame);merge(hinge);
    g.updateMatrixWorld(true);const f=tagMovable(world,g,'Dog crate');f.mass=22;f.mix={metal:1};f.health=240;f.obstacle.h5Container=true;const parts=[];
    for(const [size,pos]of [[[.04,1.18,1.6],[-.55,.59,0]],[[.04,1.18,1.6],[.55,.59,0]],[[1.1,1.18,.04],[0,.59,-.79]],[[1.1,.04,1.6],[0,1.17,0]]]){const m=box(g,size,pos,metal);m.visible=false;parts.push({mesh:m,obstacle:collider(m)});}
    const door=box(hinge,[1.07,1.13,.03],[.535,.6,0],metal);door.visible=false;parts.push({mesh:door,obstacle:collider(door)});g.traverse(m=>{if(m.isMesh&&m.visible)pick(m);});owned.add(g);
    return {root:g,hinge,bolt,state,parts,lastStamp:'',tick(dt){if(!g.parent)return;state.tick(dt);hinge.rotation.y=-state.angle;bolt.position.x=.88+.11*state.bolt;
      const stamp=[...g.position.toArray(),...g.quaternion.toArray(),state.angle].join('/');if(stamp===this.lastStamp)return;this.lastStamp=stamp;g.updateWorldMatrix(true,true);
      for(const part of parts){const b=new T.Box3().setFromObject(part.mesh),s=b.getSize(V()),c=b.getCenter(V());Object.assign(part.obstacle,{x:c.x,z:c.z,w:s.x,d:s.z,y:b.min.y,h:s.y});}world.grid=null;}};
  }
  function createArcade(position,yaw){const g=group(root,'Basement arcade cabinet',position.toArray(),yaw),body=box(g,[.76,1.55,.61],[0,.775,0],wood);box(g,[.83,.12,.84],[0,.91,.12],paint);box(g,[.77,.22,.21],[0,1.66,-.13],paint);box(g,[.78,.10,.66],[0,.08,0],rubber);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.generateMipmaps=false;texture.minFilter=T.LinearFilter;textures.add(texture);
    const material=new T.MeshBasicMaterial({map:texture,toneMapped:false});materials.add(material);const screen=mesh(g,new T.PlaneGeometry(.63,.57),material,[0,1.28,.36]);screen.rotation.x=-.13;screen.castShadow=false;box(g,[.70,.66,.018],[0,1.29,.29],rubber);
    const game=createArcadeGame(canvas),joystick=group(g,'Arcade joystick',[-.22,.99,.26]);joystick.userData.h5DynamicPart=true;line(joystick,[0,0,0],[0,.115,0],.009,metal);
    const top=mesh(joystick,new T.SphereGeometry(.034,10,8),mat(0xa63732),[0,.135,0]);control(top,'arcadeStick',()=>{arcade.focus=!arcade.focus;if(!arcade.focus)arcade.release();},{joystick});
    const buttons=[];for(let i=0;i<3;i++){const m=mesh(g,new T.CylinderGeometry(.034,.034,.025,12),mat([0x478773,0xb54e46,0xd2a348][i]),[.07+i*.09,.991,.28]);control(m,'arcadeButton',()=>{game.button(i,true);game.button(i,false);},{game,button:i});buttons.push(m);}
    pick(body);owned.add(g);collider(body);return {root:g,screen,texture,game,joystick,buttons,focus:false,controller:null,keys:new Set(),
      tick(dt,near){if(!near&&this.focus)this.release();if(game.tick(dt,near))texture.needsUpdate=true;joystick.rotation.z=-game.input.x*.25;joystick.rotation.x=game.input.y*.25;},
      release(){this.focus=false;this.controller=null;this.keys.clear();game.release();}};
  }
  function createMirror(parent,pos,yaw){const frame=box(parent,[.70,.80,.035],pos,metal);frame.rotation.y=yaw;const g=group(parent,'Bathroom mirror',pos,yaw);
    const material=new T.ShaderMaterial({uniforms:{image:{value:null},projection:{value:new T.Matrix4()},valid:{value:0}},
      vertexShader:'varying vec4 reflected;uniform mat4 projection;void main(){vec4 world=modelMatrix*vec4(position,1.);reflected=projection*world;gl_Position=projectionMatrix*viewMatrix*world;}',
      fragmentShader:'uniform sampler2D image;uniform float valid;varying vec4 reflected;void main(){vec2 uv=reflected.xy/reflected.w*.5+.5;gl_FragColor=vec4(mix(vec3(.14,.19,.20),texture2D(image,clamp(uv,0.,1.)).rgb,valid),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
    materials.add(material);const m=mesh(g,new T.PlaneGeometry(.63,.73),material,[0,0,.021]);m.castShadow=false;const a={root:g,mesh:m,views:[],lastSeen:0};
    m.onBeforeRender=(r,s,c)=>{const i=Math.max(0,eyes.indexOf(c)),view=a.views[i]||a.views[0];material.uniforms.valid.value=view?1:0;if(view){material.uniforms.image.value=view.target.texture;material.uniforms.projection.value.copy(view.projection);}material.uniformsNeedUpdate=true;};mirrors.push(a);pick(frame);return a;
  }
  function createShower(h,r){const p=toWorld(h,r.x+r.w/2-.65,.055,r.z-r.d/2+.69),g=group(root,h.name+' shower',p.toArray(),h.yaw),s={id:h.id,root:g,flow:0,temperature:.25,fog:0,glass:[],wipes:[]};
    box(g,[1.16,.08,1.26],[0,.04,0],stone);mesh(g,new T.CylinderGeometry(.055,.055,.006,12),metal,[0,.083,0]);
    line(g,[0,.7,-.57],[0,2.06,-.57],.012,metal);line(g,[0,2.06,-.57],[0,2.06,-.18],.016,metal);mesh(g,new T.CylinderGeometry(.11,.11,.026,16),metal,[0,2.04,-.18]);
    box(g,[.35,.21,.025],[0,1.08,-.555],metal);for(const y of [.72,1.78])line(g,[0,y,-.57],[0,y,-.62],.026,metal);
    for(const x of [-.57,.57])for(const z of [-.61,.61])if(z<0||x<0)line(g,[x,.08,z],[x,2.10,z],.018,metal);
    s.fogUniform={value:0};for(const x of [-.57,.57]){const material=new T.MeshStandardMaterial({color:0xc4d9d6,roughness:.15,metalness:.15,transparent:true,opacity:.10,depthWrite:false,side:T.DoubleSide});materials.add(material);
      const grid=new CondensationGrid(),texture=new T.DataTexture(grid.data,grid.width,grid.height,T.RedFormat);texture.minFilter=texture.magFilter=T.LinearFilter;texture.unpackAlignment=1;texture.needsUpdate=true;textures.add(texture);
      material.onBeforeCompile=shader=>{shader.uniforms.h5GlassFog=s.fogUniform;shader.uniforms.h5GlassWipe={value:texture};
        shader.vertexShader='varying vec2 h5PanelUV;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nh5PanelUV=vec2(position.z/1.22+.5,position.y/1.97+.5);');
        shader.fragmentShader='uniform float h5GlassFog;uniform sampler2D h5GlassWipe;varying vec2 h5PanelUV;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat h5Fog=h5GlassFog*(1.-texture2D(h5GlassWipe,h5PanelUV).r);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.65,.71,.70),h5Fog);diffuseColor.a+=h5Fog*.55;');};material.customProgramCacheKey=()=> 'h5-shower-fog-wipe-2';
      const m=box(g,[.012,1.97,1.22],[x,1.07,0],material);m.castShadow=false;s.glass.push(m);s.wipes.push({mesh:m,grid,texture});collider(m);pick(m);}

    const dial=mesh(g,new T.CylinderGeometry(.05,.05,.026,16),metal,[.13,1.10,-.525]);dial.rotation.x=Math.PI/2;s.dial=dial;box(dial,[.008,.012,.032],[0,.02,.023],mat(0xca735d));control(dial,'temperature',()=>s.temperature=s.temperature<.5?.85:s.temperature<.95?1:.15,{shower:s});
    const handle=box(g,[.035,.14,.038],[-.12,1.09,-.51],metal);s.handle=handle;control(handle,'water',()=>s.flow=s.flow>.1?0:1,{shower:s});
    const streamMat=new T.MeshBasicMaterial({color:0xc0dfed,transparent:true,opacity:.38,depthWrite:false});materials.add(streamMat);const geometry=new T.CylinderGeometry(.0025,.0035,.15,3);geometries.add(geometry);
    const stream=new T.InstancedMesh(geometry,streamMat,32);stream.instanceMatrix.setUsage(T.DynamicDrawUsage);stream.count=0;stream.frustumCulled=false;stream.raycast=()=>{};stream.userData.noHit=true;g.add(stream);s.stream=stream;
    merge(g);g.traverse(m=>{if(m.isMesh&&!m.isInstancedMesh)pick(m);});showers.push(s);owned.add(g);h.contents.push(g);
    const sinkP=toWorld(h,r.x-r.w/2+.10,1.57,r.z),mount=group(root,h.name+' mirror mounting',sinkP.toArray(),h.yaw+Math.PI/2);createMirror(mount,[0,0,0],0);owned.add(mount);h.contents.push(mount);return s;
  }
  function build(){if(world.name!=='Cul-de-sac')return;root=new T.Group();root.name='Home interactions';world.root.add(root);metal=mat(0x777f81,.32,.78);wood=mat(0x55463b,.85);paint=mat(0xb9b4a3,.85);stone=mat(0xc7c6bd,.92);rubber=mat(0x29302e,.96);
    for(const h of world.neighborhood?.houses||[]){if(h.id==='willow')buildBasement(h);const r=h.plan.rooms.find(r=>r.id==='bath');if(r)createShower(h,r);}installGroundHole();
    const material=new T.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:'varying vec2 st;void main(){st=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 st;void main(){float d=length(st-.5)*2.;float a=(1.-smoothstep(.15,1.,d))*.10;gl_FragColor=vec4(.79,.82,.82,a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});materials.add(material);const geo=new T.PlaneGeometry(1,1);geometries.add(geo);steam=new T.InstancedMesh(geo,material,24);steam.count=0;steam.frustumCulled=false;steam.instanceMatrix.setUsage(T.DynamicDrawUsage);steam.raycast=()=>{};steam.userData.noHit=true;root.add(steam);world.grid=null;
  }
  function clear(){holds.clear();arcade?.game.dispose();for(const m of mirrors)for(const v of m.views)v?.target.dispose();mirrors.length=showers.length=controls.length=0;
    const obs=new Set(obstacles),picks=new Set(pickables);world.obstacles=world.obstacles.filter(o=>!obs.has(o));world.pickables=world.pickables.filter(m=>!picks.has(m));obstacles.length=pickables.length=0;
    if(crate?.root){const g=crate.root;world.movables=world.movables.filter(m=>m!==g);world.removeObstacle(g.userData.furniture?.obstacle);for(const [key,h]of props.furnHolds)if(h.group===g)props.releaseFurniture(key);}
    for(const f of fixtures)upgrade.lights.remove(f);fixtures.length=0;world.floors=world.floors.filter(f=>!f.h5Home);root?.removeFromParent();root=null;crate=arcade=steam=null;
    for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();geometries.clear();materials.clear();textures.clear();owned.clear();world.grid=null;
  }
  function visible(m){for(let o=m;o;o=o.parent)if(!o.visible)return false;return !!m.parent;}
  function hit(ray,max=2.5){raycaster.ray.copy(ray);raycaster.near=0;raycaster.far=max;const h=raycaster.intersectObjects(controls.map(c=>c.mesh).filter(visible),false)[0];if(!h)return null;const block=props.hit(ray,h.distance-.025,false,{actors:false});if(block&&block.distance<h.distance-.025)return null;return {control:controls.find(c=>c.mesh===h.object),hit:h};}
  const outside=(c,point)=>!c.owner||c.owner.worldToLocal(point.clone()).z>.75;
  function click(ray,key=null){const found=hit(ray);if(!found||!outside(found.control,ray.origin))return false;const c=found.control;c.click();if(c.kind==='arcadeStick')arcade.controller=typeof key==='number'?key:null;
    props.status=c.kind==='bolt'?(crate.state.latched?'Crate bolt engaged':'Crate bolt withdrawn'):c.kind==='crateDoor'&&crate.state.latched?'Slide the outside bolt to open the crate':c.kind==='arcadeStick'?'Arcade focused · arrows / A, B · Esc to leave':c.kind==='temperature'?'Shower temperature '+Math.round(c.shower.temperature*100)+'%':c.kind==='water'?'Shower '+(c.shower.flow?'on':'off'):'Arcade button';return true;
  }
  function grip(i){const palm=props.system.hands?.palmPos(i);if(!palm)return false;let nearest=null,distance=.10;for(const c of controls)if(visible(c.mesh)&&outside(c,palm)){const d=c.mesh.getWorldPosition(V()).distanceTo(palm);if(d<distance){nearest=c;distance=d;}}if(!nearest)return false;
    const c=nearest;holds.set(i,{control:c,initial:palm.clone(),start:c.state?.bolt??c.shower?.temperature??0});if(c.kind==='arcadeButton')c.game.button(c.button,true);if(c.kind==='arcadeStick'){arcade.focus=true;arcade.controller=i;}return true;
  }
  function release(i){const h=holds.get(i);if(!h)return;const c=h.control;if(c.state)c.state.target=null;if(c.kind==='arcadeButton')c.game.button(c.button,false);if(c.kind==='arcadeStick')arcade.release();holds.delete(i);}
  function tickControls(){for(const [i,h]of holds){const c=h.control,palm=props.system.hands?.palmPos(i);if(!palm){release(i);continue;}const local=c.mesh.parent.worldToLocal(palm.clone());
    if(c.kind==='bolt'){const start=c.mesh.parent.worldToLocal(h.initial.clone());c.state.slide(h.start+(local.x-start.x)/.11);}
    else if(c.kind==='crateDoor'){const v=c.hinge.parent.worldToLocal(palm.clone()).sub(c.hinge.position);if(!c.state.latched)c.state.target=clamp(Math.atan2(v.z,v.x),0,c.state.maxAngle);}
    else if(c.kind==='temperature'){const start=c.mesh.parent.worldToLocal(h.initial.clone());c.shower.temperature=clamp(h.start+(local.x-start.x)*4,0,1);}
    else if(c.kind==='water')c.shower.flow=clamp((local.y-.99)/.20,0,1);
    else if(c.kind==='arcadeStick'){const v=c.joystick.parent.worldToLocal(palm.clone()).sub(c.joystick.position);arcade.game.axis(v.x/.085,-v.z/.085);}}
  }
  function tickArcade(dt){if(!arcade)return;const near=arcade.root.getWorldPosition(V()).distanceToSquared(viewer)<16;
    if(arcade.focus&&renderer.xr.isPresenting){const hand=props.system.hands.handedness[arcade.controller],source=[...renderer.xr.getSession()?.inputSources||[]].find(s=>s.handedness===hand),axes=source?.gamepad?.axes;
      if(axes){const x=axes[axes.length>=4?2:0]||0,y=axes[axes.length>=4?3:1]||0;if(Math.hypot(x,y)>.12||!holds.has(arcade.controller))arcade.game.axis(x,y);const b=source.gamepad.buttons;arcade.game.button(0,!!b[4]?.pressed);arcade.game.button(1,!!b[5]?.pressed);}}
    arcade.tick(dt,near);
  }
  function wipeAt(point,radius=.065){let changed=0;for(const s of showers){if(s.fog<.01||!visible(s.root))continue;for(const w of s.wipes){const p=w.mesh.worldToLocal(point.clone());if(Math.abs(p.x)>.065||Math.abs(p.y)>1.02||Math.abs(p.z)>.67)continue;if(w.grid.wipe(p.z/1.22+.5,p.y/1.97+.5,radius)){w.texture.needsUpdate=true;changed++;}}}return changed;}
  function tickShowers(dt){let n=0;const cq=camera.getWorldQuaternion(new T.Quaternion());
    for(const s of showers){s.fog=clamp(s.fog+dt*(s.flow*Math.max(0,s.temperature-.5)*.38-.012),0,1);s.fogUniform.value=s.fog;for(const w of s.wipes)if(w.grid.decay(dt,s.flow&&s.temperature>.5?12:4))w.texture.needsUpdate=true;s.dial.rotation.z=(s.temperature-.5)*2.5;s.handle.rotation.z=-s.flow*.9;
      const near=s.root.getWorldPosition(V()).distanceToSquared(viewer)<81;let count=0;if(near&&s.flow>.01)for(let i=0;i<32;i++){const phase=(clock*1.7+i*.6180339)%1,r=.035+phase*.15,a=i*2.39996;dummy.position.set(Math.cos(a)*r,1.98-phase*1.88,-.18+Math.sin(a)*r);dummy.quaternion.identity();dummy.scale.set(1,.5+s.flow*.7,1);dummy.updateMatrix();s.stream.setMatrixAt(count++,dummy.matrix);}s.stream.count=count;if(count)s.stream.instanceMatrix.needsUpdate=true;
      if(near&&s.flow>.01&&s.temperature>.55)for(let j=0;j<12&&n<24;j++){const t=(clock*.22+j*.618)%1;dummy.position.copy(s.root.localToWorld(new T.Vector3(Math.sin(j*12.4+t*2)*.28,1.25+t*.95,Math.cos(j*3.7+t)*.22)));dummy.quaternion.copy(cq);dummy.scale.setScalar(.22+t*.5);dummy.updateMatrix();steam.setMatrixAt(n++,dummy.matrix);}}
    steam.count=n;if(n)steam.instanceMatrix.needsUpdate=true;
  }
  function renderMirrors(dt){mirrorAcc+=dt;const tier=world.h5Performance?.budget.tier||0,hz=quest?[24,18,12][tier]:30;if(mirrorAcc<1/hz)return;mirrorAcc=0;
    let best=null,dist=36;const frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    for(const m of mirrors){if(!visible(m.mesh))continue;m.root.updateWorldMatrix(true,false);const point=m.root.getWorldPosition(V()),normal=new T.Vector3(0,0,1).transformDirection(m.root.matrixWorld),d=point.distanceToSquared(viewer);if(d<dist&&viewer.clone().sub(point).dot(normal)>.03&&(renderer.xr.isPresenting||frustum.intersectsObject(m.mesh))){best=m;dist=d;}}
    for(const m of mirrors)if(m!==best&&clock-m.lastSeen>4&&m.views.length){m.views.forEach(v=>v?.target.dispose());m.views=[];}
    if(!best)return;best.lastSeen=clock;if(renderer.xr.isPresenting){renderer.xr.updateCamera(camera);eyes=renderer.xr.getCamera(camera).cameras||[camera];}else eyes=[camera];
    withOffscreenView(renderer,[...mirrors.map(m=>m.mesh),props.system.vrPanel,...(props.gadgets?.portals||[]).map(p=>p?.group)],()=>{eyes.forEach((eye,i)=>{eye.updateWorldMatrix(true,false);reflectCamera(virtual,eye,best.root.matrixWorld);clipPortalCamera(virtual,best.root.matrixWorld);let v=best.views[i];
      if(!v){const target=new T.WebGLRenderTarget(quest?320:512,quest?384:640,{minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:true});target.texture.generateMipmaps=false;v=best.views[i]={target,projection:new T.Matrix4()};}
      v.projection.multiplyMatrices(virtual.projectionMatrix,virtual.matrixWorldInverse);renderer.setRenderTarget(v.target);renderer.clear();renderer.render(scene,virtual);});});
  }
  function key(e){if(!arcade?.focus||renderer.xr.isPresenting||/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName))return;const down=e.type==='keydown';if(e.code==='Escape'){arcade.release();return;}
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyB','Space'].includes(e.code))return;e.preventDefault();e.stopImmediatePropagation();keys[e.code]=false;
    if(down)arcade.keys.add(e.code);else arcade.keys.delete(e.code);arcade.game.axis((arcade.keys.has('ArrowRight')?1:0)-(arcade.keys.has('ArrowLeft')?1:0),(arcade.keys.has('ArrowDown')?1:0)-(arcade.keys.has('ArrowUp')?1:0));if(['KeyA','KeyB','Space'].includes(e.code))arcade.game.button(e.code==='KeyB'?1:0,down);
  }
  const blur=()=>arcade?.release();document.addEventListener('keydown',key,true);document.addEventListener('keyup',key,true);globalThis.addEventListener('blur',blur);
  const api={get root(){return root;},get crate(){return crate;},get arcade(){return arcade;},showers,mirrors,holds,wetness,click,grip,release,wipeAt,
    consumesStick(hand){return !!arcade?.focus&&props.system.hands.handedness[arcade.controller]===hand;},
    setShower(id,{flow,temperature}={}){const s=showers.find(s=>s.id===id);if(!s)return false;if(Number.isFinite(flow))s.flow=clamp(flow,0,1);if(Number.isFinite(temperature))s.temperature=clamp(temperature,0,1);return s;},
    floorHeight(p,step){return root?basementFloor(p,step):null;},groundHeight(x,z,h){return root&&inBasementFootprint({x,y:0,z})?BASEMENT.level:h;},
    tick(dt){if(!root)return;clock+=Math.min(dt,.05);camera.getWorldPosition(viewer);tickControls();if(renderer.xr.isPresenting)for(let i=0;i<2;i++){const palm=props.system.hands?.palmPos(i);if(palm)wipeAt(palm);}crate?.tick(dt);tickArcade(dt);tickShowers(dt);wetness.tick(dt,showers);renderMirrors(dt);},
    onTerrainRebuilt:installGroundHole,
    snapshot(){return {showers:showers.length,flowing:showers.filter(s=>s.flow>0).length,steamInstances:steam?.count||0,mirrorTargets:mirrors.reduce((n,m)=>n+m.views.length,0),crate:crate?{angle:crate.state.angle,bolt:crate.state.bolt,latched:crate.state.latched}:null,arcade:arcade?.game.title||null};},
    dispose(){clear();wetness.dispose();restores.reverse().forEach(f=>f());document.removeEventListener('keydown',key,true);document.removeEventListener('keyup',key,true);globalThis.removeEventListener('blur',blur);delete world.h5Home;}
  };world.h5Home=api;
  for(const name of ['trigger','desktop'])restores.push(wrapMethod(props,name,old=>function(arg){const key=name==='trigger'?arg:'desktop';if(!this.held.has(key)&&!this.builder?.active&&!this.restraints?.placing&&click(name==='trigger'?this.ray(arg):arg,key))return true;return old.apply(this,arguments);}));
  restores.push(wrapMethod(props,'grip',old=>function(i){return !this.held.has(i)&&grip(i)||old.apply(this,arguments);}));restores.push(wrapMethod(props,'release',old=>function(i){release(i);return old.apply(this,arguments);}));
  restores.push(wrapMethod(world,'setScene',old=>function(name){clear();const r=old.apply(this,arguments);build();return r;}));build();return api;
}
