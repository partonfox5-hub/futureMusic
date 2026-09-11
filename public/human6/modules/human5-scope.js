import * as T from 'three';
import {withOffscreenView,scopeFov} from './human5-view-surfaces.js?v=18.0.0';
import {stickAxes,deadzone} from '../mira-v2-locomotion.js?v=18.0.0';

const vertexShader=`varying vec2 vScopeUV;void main(){vScopeUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragmentShader=`varying vec2 vScopeUV;uniform sampler2D map;
void main(){vec2 p=vScopeUV-.5;vec3 c=texture2D(map,vScopeUV).rgb;
 float vertical=1.-smoothstep(.0015,.0035,abs(p.x));float horizontal=1.-smoothstep(.0015,.0035,abs(p.y));
 float ticks=(1.-smoothstep(.001,.003,abs(fract(abs(p.y)*16.+.5)-.5)))*step(abs(p.x),.020);
 c=mix(c,vec3(.008,.010,.009),max(max(vertical,horizontal)*.85,ticks));
 c*=1.-smoothstep(.43,.5,length(p));gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

/** Physical rear ocular in VR; desktop-only assisted optic. No headset FOV changes. */
export function createScope(props,{quest=true}={}){
 const {renderer,camera,scene,world,system}=props;
 let target=null,view=null,mat=null,overlay=null,lastRender=-Infinity,idle=0;
 const optics=new WeakMap(),installed=new Map();
 const api={zoom:6,active:false,renderCount:0,
  adjust(value){if(Number.isFinite(value))api.zoom=T.MathUtils.clamp(value,2,12);return api.zoom;},
  tick(dt){const item=[...props.held.values()].find(i=>i.id==='sniper'&&(i.holder==='desktop'||typeof i.holder==='number'));
   if(api.item&&api.item!==item){const previous=optics.get(api.item);if(previous?.material===mat)previous.material=previous.userData.h5OriginalScopeMaterial;}
   for(const [lens,owner]of installed)if(!props.items.includes(owner)){lens.userData.h5OriginalScopeMaterial?.dispose();installed.delete(lens);}
   api.item=item||null;api.active=!!item;if(!item){if(overlay)overlay.visible=false;idle+=dt;if(idle>5&&target){target.dispose();target=null;if(mat)mat.uniforms.map.value=null;}return;}
   idle=0;const vr=renderer.xr.isPresenting,hand=system.hands.handedness[item.holder];
   const source=vr?[...renderer.xr.getSession().inputSources].find(s=>s.handedness===hand&&!s.hand):null;
   if(!system.h5MenuOpen){const axis=stickAxes(source?.gamepad);api.adjust(api.zoom-deadzone(0,axis.y,.18).y*dt*5);}
   item.scopeZoom=api.zoom;
   let lens=optics.get(item);if(!lens){item.group.traverse(m=>{if(m.userData.scopeEye)lens=m;});if(!lens)return;optics.set(item,lens);installed.set(lens,item);lens.userData.h5OriginalScopeMaterial=lens.material;}
   if(!target){const n=quest?384:640;target=new T.WebGLRenderTarget(n,n,{generateMipmaps:false,minFilter:T.LinearFilter,magFilter:T.LinearFilter});}
   if(!view)view=new T.PerspectiveCamera(9,1,.07,1200);
   if(!mat)mat=new T.ShaderMaterial({uniforms:{map:{value:target.texture}},vertexShader,fragmentShader,toneMapped:true});
   mat.uniforms.map.value=target.texture;lens.material=mat;
   if(!vr){if(!overlay){overlay=new T.Mesh(new T.CircleGeometry(.108,48),mat);overlay.renderOrder=29;overlay.position.set(0,0,-.40);camera.add(overlay);props.scopeOverlay=overlay;}overlay.visible=item.holder==='desktop';}
   else if(overlay)overlay.visible=false;
   item.group.updateWorldMatrix(true,true);const eye=camera.getWorldPosition(new T.Vector3()),ocular=lens.getWorldPosition(new T.Vector3());
   const direction=new T.Vector3(0,0,-1).applyQuaternion(item.group.getWorldQuaternion(new T.Quaternion()));
   // Distant/unraised optic remains a dark glass lens and consumes no remote render.
   if(vr&&(eye.distanceTo(ocular)>.65||camera.getWorldDirection(new T.Vector3()).dot(direction)<.35))return;
   const hz=quest?[30,24,18][world.h5Performance?.budget.tier||0]:45;
   if(props.time-lastRender<1/hz)return;lastRender=props.time;
   view.fov=scopeFov(api.zoom);view.updateProjectionMatrix();
   view.position.copy(ocular).addScaledVector(direction,.44);view.quaternion.copy(item.group.getWorldQuaternion(new T.Quaternion()));view.updateMatrixWorld(true);
   const hidden=[item.group,overlay,system.vrPanel,...(props.gadgets?.portals||[]).map(p=>p?.group)];
   withOffscreenView(renderer,hidden,()=>{renderer.setRenderTarget(target);renderer.setViewport(0,0,target.width,target.height);renderer.clear();renderer.render(scene,view);api.renderCount++;});
  },
  get camera(){return view;},get target(){return target;},
  dispose(){renderer.domElement.removeEventListener('wheel',wheel,true);for(const [lens]of installed)if(lens.material===mat)lens.material=lens.userData.h5OriginalScopeMaterial;overlay?.removeFromParent();overlay?.geometry.dispose();mat?.dispose();target?.dispose();delete props.scopeOverlay;}
 };
 const wheel=e=>{if(renderer.xr.isPresenting||props.held.get('desktop')?.id!=='sniper')return;e.preventDefault();e.stopImmediatePropagation();api.adjust(api.zoom-e.deltaY*.01);};
 renderer.domElement.addEventListener('wheel',wheel,{capture:true,passive:false});
 return api;
}
