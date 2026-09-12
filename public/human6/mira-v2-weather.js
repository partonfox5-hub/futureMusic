import {DayNightClock} from './modules/human5-day-night.js?v=19.3.0';
import * as T from 'three';
const QUEST=/Quest|OculusBrowser/i.test(globalThis.navigator?.userAgent||'');
const V=()=>new T.Vector3();
const MODES=['clear','clouds','rain','clouds','snow','clear'];
const noopRay=()=>{};

const SKY_VERT=`varying vec3 vDir;
void main(){
 vDir=normalize(position);
 gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
}`;
const SKY_FRAG=`varying vec3 vDir;
uniform float time,coverage,rain,snow,night,day,twilight;
uniform vec3 sunDir,moonDir,zenith,horizon,sunColor,cloudColor;uniform vec2 wind;uniform sampler2D cloudNoise;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
 vec3 dir=normalize(vDir);float h=max(dir.y,0.0);
 vec3 col=mix(horizon,zenith,pow(h,.46));
 float sunDot=dot(dir,sunDir),sunAngle=length(dir-sunDir);
 float haze=pow(max(sunDot,0.),22.)*.22+pow(max(sunDot,0.),220.)*.34;
 col+=sunColor*(haze+2.8*(1.-smoothstep(.006,.008+fwidth(sunAngle),sunAngle)))*smoothstep(-.06,.01,sunDir.y)*(1.-rain*.7);
 float moonAngle=length(dir-moonDir),moonDisk=1.-smoothstep(.0065,.008+fwidth(moonAngle),moonAngle);
 float lunarDetail=.83+.13*sin(dir.x*1650.)*sin(dir.z*1370.);
 col+=vec3(.64,.73,.9)*(moonDisk*lunarDetail+pow(max(dot(dir,moonDir),0.),340.)*.055)*night;
 if(h>.01){
  // Stable celestial points; derivative anti-aliasing prevents tiny stars from crawling.
  vec2 starUV=vec2(atan(dir.z,dir.x)/6.2831853+.5,asin(clamp(dir.y,-1.,1.))/3.14159265+.5)*vec2(320.,160.);
  vec2 cell=floor(starUV),local=fract(starUV)-.5;float seed=hash(cell),dist=length(local),aa=max(length(fwidth(starUV)),.025);
  float star=(1.-smoothstep(.055,.055+aa,dist))*.028/max(aa*aa,.028)*step(.982,seed);
  col+=vec3(.7,.8,1.)*star*night*smoothstep(.02,.25,h)*(.85+.15*sin(time*.7+seed*80.));
  vec2 uv=dir.xz/max(h,.13)*.095+wind*time*.0018;
  vec4 sampleA=texture2D(cloudNoise,uv),sampleB=texture2D(cloudNoise,uv*2.03+vec2(.19,-.27)+wind*time*.0004);
  float density=sampleA.r*.72+sampleB.r*.28,threshold=mix(.75,.17,coverage);
  float cloud=smoothstep(threshold,threshold+.22,density)*smoothstep(.01,.18,h);
  float relief=clamp(.72+(sampleA.g-sampleA.r)*3.0,.45,1.08);
  vec3 lit=cloudColor*relief*mix(1.,.55,rain)*mix(1.,1.08,snow);
  float silver=pow(max(sunDot,0.),10.)*(1.-smoothstep(.1,.8,cloud))*day;
  col=mix(col,lit+sunColor*silver*.22,cloud*.96);
 }
 col=mix(col,horizon,rain*.20);gl_FragColor=vec4(col,1.0);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
function makeCloudNoise(){
 const size=128,data=new Uint8Array(size*size*4);let seed=9731;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const grids=[8,16,32,64].map(n=>({n,a:Float32Array.from({length:n*n},random)}));
 const noise=(x,y)=>{let sum=0,weight=.54;for(const {n,a}of grids){const xx=x/size*n,yy=y/size*n,i=Math.floor(xx),j=Math.floor(yy),tx=xx-i,ty=yy-j,u=tx*tx*(3-2*tx),v=ty*ty*(3-2*ty),get=(i,j)=>a[((j%n+n)%n)*n+(i%n+n)%n];sum+=weight*((get(i,j)*(1-u)+get(i+1,j)*u)*(1-v)+(get(i,j+1)*(1-u)+get(i+1,j+1)*u)*v);weight*=.5;}return sum;};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4;data[i]=noise(x,y)*255;data[i+1]=noise(x+2,y+1)*255;data[i+2]=0;data[i+3]=255;}
 const texture=new T.DataTexture(data,size,size);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}

export function installWeather({scene,world,camera,renderer,lights={},daylight=null}={}){
 const quest=QUEST, rainN=quest?120:720, flakeN=quest?90:560, puddleN=quest?20:110, snowN=quest?36:220;
 const group=new T.Group();group.name='Weather';scene.add(group);const cycle=new DayNightClock(10),cloudNoise=makeCloudNoise();let lastSkyTime=performance.now();
 const skyMat=new T.ShaderMaterial({uniforms:{
  cloudNoise:{value:cloudNoise},night:{value:0},day:{value:1},twilight:{value:0},moonDir:{value:cycle.moon},sunColor:{value:cycle.sunColor},cloudColor:{value:cycle.cloudColor},time:{value:0},coverage:{value:.38},rain:{value:0},snow:{value:0},
  sunDir:{value:new T.Vector3(.45,.72,.38).normalize()},
  wind:{value:new T.Vector2(.045,.018)},
  zenith:{value:new T.Color(0x5ea7e6)},horizon:{value:new T.Color(0xd7e6f4)}
 },vertexShader:SKY_VERT,fragmentShader:SKY_FRAG,side:T.BackSide,depthWrite:false,depthTest:false,fog:false});
 const sky=new T.Mesh(new T.SphereGeometry(1,16,12),skyMat);
 sky.frustumCulled=false;sky.renderOrder=-1000;sky.raycast=noopRay;sky.userData.weatherSkip=sky.userData.noHit=true;
 sky.onBeforeRender=function(_r,_s,cam){
  this.position.setFromMatrixPosition(cam.matrixWorld);
  const far=Number.isFinite(cam.far)&&cam.far>1?cam.far:80;
  this.scale.setScalar(Math.max(12,far*.82));
  this.updateMatrixWorld();
 };
 group.add(sky);

 const rainGeo=new T.BoxGeometry(.012,.55,.012);const rainMat=new T.MeshBasicMaterial({color:0xb7d4ea,transparent:true,opacity:.45,depthWrite:false,fog:false});
 const rain=new T.InstancedMesh(rainGeo,rainMat,rainN);rain.frustumCulled=false;rain.count=0;rain.instanceMatrix.setUsage(T.DynamicDrawUsage);rain.raycast=noopRay;rain.userData.noHit=true;group.add(rain);
 const rainDrop=Array.from({length:rainN},()=>({x:0,y:0,z:0,v:12}));

 const flakeGeo=new T.PlaneGeometry(.07,.07);const flakeMat=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.85,depthWrite:false,side:T.DoubleSide,fog:false});
 const flakes=new T.InstancedMesh(flakeGeo,flakeMat,flakeN);flakes.frustumCulled=false;flakes.count=0;flakes.instanceMatrix.setUsage(T.DynamicDrawUsage);flakes.raycast=noopRay;flakes.userData.noHit=true;group.add(flakes);
 const flake=Array.from({length:flakeN},()=>({x:0,y:0,z:0,s:.05,w:Math.random()*6}));

 const puddleMat=new T.MeshStandardMaterial({color:0x2a3a44,roughness:.08,metalness:.22,transparent:true,opacity:.0,envMapIntensity:1.4});
 const puddleGeo=new T.CircleGeometry(1,18);puddleGeo.rotateX(-Math.PI/2);
 const puddles=new T.InstancedMesh(puddleGeo,puddleMat,puddleN);puddles.frustumCulled=false;puddles.count=0;puddles.instanceMatrix.setUsage(T.DynamicDrawUsage);puddles.raycast=noopRay;puddles.userData.noHit=true;group.add(puddles);
 const puddle=Array.from({length:puddleN},()=>({x:0,z:0,y:0,r:0,life:0,n:new T.Vector3(0,1,0)}));

 const snowMat=new T.MeshStandardMaterial({color:0xf4f7fb,roughness:.92,metalness:0});
 const snowGeo=new T.CircleGeometry(1,12);snowGeo.rotateX(-Math.PI/2);
 const snows=new T.InstancedMesh(snowGeo,snowMat,snowN);snows.frustumCulled=false;snows.count=0;snows.instanceMatrix.setUsage(T.DynamicDrawUsage);snows.raycast=noopRay;snows.userData.noHit=true;group.add(snows);
 const snow=Array.from({length:snowN},()=>({x:0,z:0,y:0,r:0,h:0,n:new T.Vector3(0,1,0)}));

 const dummy=new T.Object3D(),ray=new T.Raycaster(),down=new T.Vector3(0,-1,0),up=new T.Vector3(0,1,0),upAxis=new T.Vector3(0,1,0);
 const wetMats=new Map();
 let mode='clouds',automatic=true,modeT=120+Math.random()*180,next=0,seed=1,wetApplied=-1;
 const state={coverage:.4,rain:0,snow:0,wet:0,snowCover:0,label:'Cloudy'};
 const origLights=new Map();
 for(const [k,l] of Object.entries(lights))if(l)origLights.set(k,{l,i:l.intensity,c:l.color.clone()});
 let hemi=null;scene.traverse(o=>{if(!hemi&&o.isHemisphereLight)hemi=o;});const baseHemiIntensity=hemi?.intensity??.38;
 const bgColor=new T.Color();
 const hitList=[];

 function rng(){seed=seed*1664525+1013904223|0;return (seed>>>0)/4294967296;}
 function hits(){
  hitList.length=0;
  if(world.terrain)hitList.push(world.terrain);
  for(const f of world.floors||[])if(f.object)hitList.push(f.object);
  return hitList;
 }
 function sampleSurface(px,pz,y0){
  const meshes=hits();if(!meshes.length)return null;
  ray.set(new T.Vector3(px,y0+40,pz),down);ray.far=80;
  const hit=ray.intersectObjects(meshes,true)[0];if(!hit?.face)return null;
  const n=hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
  ray.set(hit.point.clone().addScaledVector(n,.04),up);ray.far=6;
  const roof=ray.intersectObjects(meshes,true)[0];
  return {p:hit.point,n,indoor:!!roof&&roof.distance<5.5};
 }
 function scatterRain(cam){
  const c=cam.getWorldPosition(V()),span=18;
  for(const d of rainDrop){
   d.x=c.x+(rng()-.5)*span*2;d.y=c.y+2+rng()*14;d.z=c.z+(rng()-.5)*span*2;d.v=11+rng()*7;
  }
 }
 function scatterSnow(cam){
  const c=cam.getWorldPosition(V()),span=16;
  for(const d of flake){
   d.x=c.x+(rng()-.5)*span*2;d.y=c.y+1+rng()*12;d.z=c.z+(rng()-.5)*span*2;d.s=.04+rng()*.06;d.w=rng()*6;
  }
 }
 function setMode(nextMode){
  mode=nextMode;modeT=120+rng()*180;
  state.label=mode==='rain'?'Rain':mode==='snow'?'Snow':mode==='clouds'?'Cloudy':'Clear';
 }
 function targets(){
  if(mode==='clear')return {coverage:.18,rain:0,snow:0};
  if(mode==='clouds')return {coverage:.62,rain:0,snow:0};
  if(mode==='rain')return {coverage:.88,rain:1,snow:0};
  return {coverage:.7,rain:0,snow:1};
 }
 function applyWet(amount){
  if(quest)return;
  world.root?.traverse(o=>{
   if(!o.isMesh||o.isInstancedMesh)return;
   const mats=Array.isArray(o.material)?o.material:[o.material];
   for(const m of mats){
    if(!m||m.userData?.weatherSkip||!('roughness'in m))continue;
    if(!wetMats.has(m))wetMats.set(m,{r:m.roughness,g:m.metalness??0,c:m.color?m.color.clone():null});
    const o0=wetMats.get(m);
    m.roughness=T.MathUtils.lerp(o0.r,Math.min(o0.r,.18),.72*amount);
    if(m.metalness!=null)m.metalness=T.MathUtils.lerp(o0.g,Math.min(.35,o0.g+.12),.45*amount);
    if(m.color&&o0.c)m.color.copy(o0.c).multiplyScalar(1-amount*.18);
   }
  });
 }
 function writeInstances(mesh,list,yoff,tilt){
  let n=0;
  for(const s of list){
   if(s.r<.04)continue;
   dummy.position.set(s.x,s.y+yoff,s.z);
   dummy.quaternion.setFromUnitVectors(upAxis,s.n);
   dummy.scale.set(s.r,1,s.r*(tilt||1));
   dummy.updateMatrix();mesh.setMatrixAt(n++,dummy.matrix);
  }
  mesh.count=n;mesh.instanceMatrix.needsUpdate=true;mesh.visible=n>0;
 }

 scatterRain(camera);scatterSnow(camera);
 setMode('clouds');

 const api={
  group,state,cycle,sky,
  get label(){return state.label;},
  setMode,
  get selection(){return automatic?'auto':mode;},
  choose(value){if(!['auto','clear','clouds','rain','snow'].includes(value))throw new TypeError('Unknown weather');automatic=value==='auto';if(!automatic)setMode(value);else modeT=120+rng()*180;},
  tick(dt,cam){
   if(!cam||(renderer?.xr?.isPresenting&&!scene.background)){group.visible=false;lastSkyTime=performance.now();return;}
   group.visible=true;
   const skyNow=performance.now();cycle.advance(document.hidden?0:Math.max(0,(skyNow-lastSkyTime)/1000));lastSkyTime=skyNow;
   dt=Math.min(.05,dt);if(automatic)modeT-=dt;
   if(modeT<=0)setMode(MODES[(MODES.indexOf(mode)+1)%MODES.length]||'clouds');
   const want=targets();
   state.coverage+=(want.coverage-state.coverage)*Math.min(1,dt*.35);
   state.rain+=(want.rain-state.rain)*Math.min(1,dt*.45);
   state.snow+=(want.snow-state.snow)*Math.min(1,dt*.4);
   state.wet=T.MathUtils.clamp(state.wet+(state.rain*dt*.22-dt*.045),0,1);
   state.snowCover=T.MathUtils.clamp(state.snowCover+(state.snow*dt*.16-dt*.03),0,1);

   const u=skyMat.uniforms,t=performance.now()*.001;
   u.time.value=t;u.coverage.value=state.coverage;u.rain.value=state.rain;u.snow.value=state.snow;
   u.sunDir.value.copy(cycle.sun);u.night.value=cycle.night;u.day.value=cycle.day;u.twilight.value=cycle.twilight;
   u.zenith.value.copy(cycle.zenith).lerp(cycle.horizon,state.coverage*.16+state.rain*.30);
   u.horizon.value.copy(cycle.horizon);

   const far=Number.isFinite(cam.far)&&cam.far>1?cam.far:450;
   const fogCol=u.horizon.value;
   bgColor.copy(fogCol);
   if(world.scene?.fog){world.scene.fog.color.copy(fogCol);world.scene.fog.near=state.rain>.2?32:Math.min(90,far*.22);world.scene.fog.far=Math.min(far*.9,state.rain>.2?180:world.h5OpenWorld?.active?1250:280);}
   if(scene.background?.isColor)scene.background.copy(fogCol);
   else if(!renderer?.xr?.isPresenting)scene.background=bgColor.clone();
   renderer?.setClearColor?.(fogCol,1);
   const dim=1-state.rain*.45-state.coverage*.18-state.snow*.12;
   if(daylight)daylight.setTimeOfDay(cycle,dim);else{for(const {l,i} of origLights.values())l.intensity=i*dim*cycle.day;if(hemi)hemi.intensity=baseHemiIntensity*dim*(.10+.90*cycle.day);}

   const c=cam.getWorldPosition(V()),span=18,wind=state.rain?3.2:1.1;
   let rc=0;
   if(state.rain>.04){
    rain.count=Math.floor(rainN*state.rain);
    for(const d of rainDrop){
     d.y-=d.v*dt;d.x+=wind*dt;d.z+=.4*dt;
     if(d.y<c.y-6){d.y=c.y+8+rng()*10;d.x=c.x+(rng()-.5)*span*2;d.z=c.z+(rng()-.5)*span*2;}
     dummy.position.set(d.x,d.y,d.z);dummy.rotation.set(0,0,.12);dummy.scale.set(1,1+state.rain,1);if(world.h5OpenWorld?.isSheltered(dummy.position))dummy.scale.setScalar(0);dummy.updateMatrix();
     if(rc<rain.count)rain.setMatrixAt(rc++,dummy.matrix);
    }
    rain.instanceMatrix.needsUpdate=true;rain.visible=true;rainMat.opacity=.28+.3*state.rain;
   }else{rain.visible=false;rain.count=0;}

   let fc=0;
   if(state.snow>.04){
    flakes.count=Math.floor(flakeN*state.snow);
    for(const d of flake){
     d.y-=(.7+d.s*4)*dt;d.x+=Math.sin(t*1.4+d.w)*.35*dt;d.z+=Math.cos(t*1.1+d.w)*.28*dt;
     if(d.y<c.y-5){d.y=c.y+6+rng()*9;d.x=c.x+(rng()-.5)*span*2;d.z=c.z+(rng()-.5)*span*2;}
     dummy.position.set(d.x,d.y,d.z);dummy.rotation.set(0,t+d.w,0);dummy.scale.setScalar(d.s*12);if(world.h5OpenWorld?.isSheltered(dummy.position))dummy.scale.setScalar(0);dummy.updateMatrix();
     if(fc<flakes.count)flakes.setMatrixAt(fc++,dummy.matrix);
    }
    flakes.instanceMatrix.needsUpdate=true;flakes.visible=true;
   }else{flakes.visible=false;flakes.count=0;}

   next-=dt;
   if(next<=0){
    next=quest?.55:.2;
    const ox=c.x+(rng()-.5)*28,oz=c.z+(rng()-.5)*28;
    const s=sampleSurface(ox,oz,c.y);
    if(s&&!s.indoor){
     if(state.rain>.25&&s.n.y>.88){
      let slot=puddle.find(p=>p.life<=0)||puddle.reduce((a,b)=>a.r<b.r?a:b);
      if(slot.life<=0||rng()>.6){slot.x=s.p.x;slot.z=s.p.z;slot.y=s.p.y+.012;slot.n.copy(s.n);slot.r=.12;slot.life=1;}
      else slot.r=Math.min(1.6,slot.r+dt*8);
     }
     if(state.snow>.2&&s.n.y>.42){
      let slot=snow.find(p=>p.r<.05);
      if(!slot){slot=snow.reduce((a,b)=>a.r<b.r?a:b);if(slot.r>.55&&rng()>.7)slot=null;}
      if(slot){slot.x=s.p.x;slot.z=s.p.z;slot.y=s.p.y+.016;slot.n.copy(s.n);slot.r=Math.max(slot.r,.18);slot.h=Math.min(.12,slot.h+dt*2);}
     }
    }
    if(!quest){
     if(state.wet>0.02&&Math.abs(state.wet-wetApplied)>.04){applyWet(state.wet);wetApplied=state.wet;}
     else if(state.wet<=0.02&&wetMats.size){
      for(const [m,o0] of wetMats){m.roughness=o0.r;if(m.metalness!=null)m.metalness=o0.g;if(m.color&&o0.c)m.color.copy(o0.c);}
      wetApplied=0;
     }
    }
   }
   for(const p of puddle){
    if(state.rain>.2){p.life=Math.min(1,p.life+dt*.15);p.r=Math.min(1.8,p.r+dt*.08*state.rain);}
    else{p.life-=dt*.08;p.r=Math.max(0,p.r-dt*.12);}
    if(p.life<=0)p.r=0;
   }
   for(const p of snow){
    if(state.snow>.15)p.r=Math.min(1.1,p.r+dt*.06*state.snow);
    else p.r=Math.max(0,p.r-dt*.07);
   }
   puddleMat.opacity=.15+.5*state.wet;
   writeInstances(puddles,puddle,.0,1);
   writeInstances(snows,snow,.0,1);
  }
 };
 world.weather=api;return api;
}
