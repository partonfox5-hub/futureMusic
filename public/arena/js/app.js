import * as T from '../vendor/three.module.js';
import {Simulation,RULES,seededRandom} from './simulation.js';
import {Arena} from './world.js';
import {makeBlaster} from './models.js';
import {Effects} from './effects.js';
import {Sound} from './audio.js';
import {VRUI} from './vr-ui.js';
import {stick,turnAroundHead,clampRig,controllerAim,QualityGovernor} from './controls.js';

const $=id=>document.getElementById(id),canvas=$('game');
const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false,stencil:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);
renderer.xr.enabled=true;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=false;renderer.info.autoReset=false;
const scene=new T.Scene(),rig=new T.Group();scene.add(rig);
const camera=new T.PerspectiveCamera(72,innerWidth/innerHeight,.06,110);rig.add(camera);camera.position.set(0,1.6,0);rig.position.set(0,0,18);
const sim=new Simulation(),arena=new Arena(scene),effects=new Effects(scene),sound=new Sound(),ui=new VRUI(rig),governor=new QualityGovernor();
const eye=new T.Vector3(),forward=new T.Vector3(),right=new T.Vector3(),headUp=new T.Vector3(),up=new T.Vector3(0,1,0),velocity=new T.Vector3(),origin=new T.Vector3(),aim=new T.Vector3(),quat=new T.Quaternion();
let mode='menu',hasRun=false,paused=false,xrBusy=false,last=0,accumulator=0,yaw=0,pitch=0,snapReady=true,hudAt=0,audioAt=0,damageFade=0,menuHover=-1,contextLost=false;
let lastDamagePulse=0;const keys=Object.create(null),controllers=[],buttons=new Map();
const settings={quality:'auto',turn:'smooth',volume:.7,music:.22,comfort:true,stats:false};
const debug=new URLSearchParams(location.search).has('debug'),lookEuler=new T.Euler(0,0,0,'YXZ');
try{const saved=JSON.parse(localStorage.getItem('battlesphere-settings-v2')||'null');if(saved){if(['auto','low','balanced','high'].includes(saved.quality))settings.quality=saved.quality;if(['smooth','snap'].includes(saved.turn))settings.turn=saved.turn;for(const k of ['volume','music'])if(Number.isFinite(saved[k]))settings[k]=Math.max(0,Math.min(1,saved[k]));for(const k of ['comfort','stats'])if(typeof saved[k]==='boolean')settings[k]=saved[k];}}catch{}
function saveSettings(){try{localStorage.setItem('battlesphere-settings-v2',JSON.stringify(settings));}catch{}}
function status(t){$('status').textContent=t;}
function applyQuality(){
  const level=settings.quality==='auto'?governor.level:({low:0,balanced:1,high:2}[settings.quality]);
  governor.auto=settings.quality==='auto';effects.budget=[96,168,240][level];
  arena.setQuality?.(level);
  renderer.xr.setFoveation([.75,.5,.25][level]);
  // Framebuffer allocation is only changed outside an active XR session.
  if(!renderer.xr.isPresenting){renderer.xr.setFramebufferScaleFactor([.8,.9,1][level]);renderer.setPixelRatio(Math.min(devicePixelRatio,[1,1.5,2][level]));}
}
function readEye(){rig.updateMatrixWorld(true);if(renderer.xr.isPresenting)renderer.xr.updateCamera(camera);camera.getWorldPosition(eye);camera.getWorldQuaternion(quat);forward.set(0,0,-1).applyQuaternion(quat);headUp.set(0,1,0).applyQuaternion(quat);}
function resetRun(){sim.reset();effects.clear();velocity.set(0,0,0);rig.rotation.set(0,0,0);rig.position.set(0,0,18);yaw=0;pitch=0;if(!renderer.xr.isPresenting){camera.position.set(0,1.6,0);camera.rotation.set(0,0,0);}hasRun=true;accumulator=0;damageFade=0;buttons.clear();governor.reset();}
function showDesktopMenu(){
  $('menu').hidden=false;$('hud').hidden=true;$('reticle').hidden=true;$('flight-hint').hidden=true;
  $('menu-title').innerHTML=sim.ended?'POWER<br><em>DEPLETED</em><span class="title-dot">.</span>':hasRun?'ARENA<br><em>PAUSED</em><span class="title-dot">.</span>':'BATTLE<br><em>SPHERE</em><br>ARENA<span class="title-dot">.</span>';
  $('menu-subtitle').innerHTML=hasRun?`${sim.score} points · ${formatTime(sim.elapsed)} survived<br>${sim.shots?Math.round(sim.hits/sim.shots*100):0}% hit accuracy`:'Zero gravity. Fourteen hunters.<br>Keep your power above zero.';
  $('play-desktop').innerHTML=(hasRun&&!sim.ended?'RESUME IN BROWSER':'PLAY IN BROWSER')+' <span>→</span>';$('restart').hidden=!hasRun;
}
function setPaused(on){
  if(!on&&sim.ended)on=true;
  paused=on;accumulator=0;velocity.set(0,0,0);for(const k of Object.keys(keys))delete keys[k];sound.setPlaying(!on&&hasRun&&!sim.ended);
  if(renderer.xr.isPresenting){ui.panel.visible=on;ui.hud.visible=!on;if(on){ui.positionPanel(camera,rig);drawVRMenu();}}
  else if(on){if(document.pointerLockElement)document.exitPointerLock();showDesktopMenu();}else{$('menu').hidden=true;$('hud').hidden=false;$('reticle').hidden=false;$('flight-hint').hidden=false;}
}
function lockPointer(){canvas.focus();const p=canvas.requestPointerLock?.();p?.catch?.(()=>status('Click the play area to capture the mouse.'));}
function startDesktop(){if(contextLost)return;sound.unlock();if(!hasRun||sim.ended)resetRun();mode='desktop';setPaused(false);lockPointer();}
function formatTime(t){const s=Math.floor(t);return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
function menuRows(){return [
  {label:sim.ended?'NEW RUN':'RESUME',action:()=>{if(sim.ended)resetRun();setPaused(false);}},
  {label:'RESTART RUN',action:()=>{resetRun();setPaused(false);}},
  {label:`SOUND: ${settings.volume>0?'ON':'OFF'}`,action:()=>{settings.volume=settings.volume>0?0:.7;sound.setVolume(settings.volume);syncSettings();drawVRMenu();}},
  {label:`TURN: ${settings.turn.toUpperCase()}`,action:()=>{settings.turn=settings.turn==='smooth'?'snap':'smooth';syncSettings();drawVRMenu();}},
  {label:`GRAPHICS: ${settings.quality.toUpperCase()}`,action:()=>{const choices=['auto','low','balanced','high'];settings.quality=choices[(choices.indexOf(settings.quality)+1)%4];applyQuality();syncSettings();drawVRMenu();}},
  {label:'EXIT VR',action:()=>renderer.xr.getSession()?.end().catch(()=>{})}
];}
function drawVRMenu(){ui.drawMenu(sim.ended?'POWER DEPLETED':'ARENA PAUSED',`${sim.score} POINTS  /  ${formatTime(sim.elapsed)}  /  ${sim.shots?Math.round(sim.hits/sim.shots*100):0}% ACCURACY`,menuRows(),menuHover);}
function pulse(controller,value=.25,duration=35){try{const gamepad=controller?.userData.source?.gamepad;const p=gamepad?.hapticActuators?.[0]?.pulse(value,duration);p?.catch?.(()=>{});}catch{}}
function shoot(controller=null){
  if(!hasRun||paused||sim.ended||contextLost)return;
  if(controller)controllerAim(controller,origin,aim);else {readEye();origin.copy(eye);aim.copy(forward);}
  if(sim.fire(origin.x,origin.y,origin.z,aim.x,aim.y,aim.z)){sound.play('shot',origin.x,origin.y,origin.z,.65);const gun=controller?controller.userData.gun:desktopGun;gun.userData.flashUntil=performance.now()+55;gun.userData.recoil=.028;pulse(controller);}
}
const desktopGun=makeBlaster();desktopGun.position.set(.24,-.23,-.38);camera.add(desktopGun);desktopGun.visible=false;
for(let i=0;i<2;i++){
  const c=renderer.xr.getController(i),gun=makeBlaster();rig.add(c);c.add(gun);c.userData.gun=gun;
  const line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3(0,0,-4)]),new T.LineBasicMaterial({color:0x74ffd8,transparent:true,opacity:.7}));line.visible=false;c.add(line);c.userData.line=line;
  c.addEventListener('connected',e=>{c.userData.source=e.data;});c.addEventListener('disconnected',()=>{c.userData.source=null;buttons.delete(c);});
  c.addEventListener('selectstart',()=>{sound.unlock();if(paused){const hit=ui.pick(c);if(hit>=0){pulse(c,.15,20);sound.play('ui',eye.x,eye.y,eye.z);ui.rows[hit].action();}}else shoot(c);});controllers.push(c);
}
async function startVR(){
  if(xrBusy||renderer.xr.isPresenting||contextLost)return;
  if(!isSecureContext){status('VR needs HTTPS. Open this page from your secure website in Quest Browser.');return;}
  if(!navigator.xr){status('Open this page in Quest Browser to enter VR. Desktop play is available here.');return;}
  xrBusy=true;$('enter-vr').disabled=true;status('Starting VR…');sound.unlock();applyQuality();
  let session;
  try{
    renderer.xr.setReferenceSpaceType('local-floor');
    session=await navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor'],optionalFeatures:[]});
    // State changes only after the user/browser has granted the session.
    if(document.pointerLockElement)document.exitPointerLock();
    camera.position.set(0,0,0);camera.rotation.set(0,0,0);rig.rotation.set(0,0,0);
    session.addEventListener('end',()=>{
      document.body.classList.remove('xr');mode='desktop';ui.panel.visible=false;ui.hud.visible=false;rig.rotation.set(0,0,0);camera.position.set(0,1.6,0);camera.rotation.set(0,0,0);yaw=0;pitch=0;desktopGun.visible=false;paused=true;velocity.set(0,0,0);buttons.clear();sound.setPlaying(false);showDesktopMenu();status('VR ended. Resume here or enter VR again.');checkVR();
    },{once:true});
    await renderer.xr.setSession(session);
    if(!hasRun||sim.ended)resetRun();mode='xr';document.body.classList.add('xr');setPaused(false);ui.hud.visible=true;desktopGun.visible=false;governor.reset();
    if(session.supportedFrameRates&&session.updateTargetFrameRate){const supported=Array.from(session.supportedFrameRates);const preferred=supported.includes(72)?72:Math.min(...supported);if(Number.isFinite(preferred)){try{await session.updateTargetFrameRate(preferred);governor.target=preferred;}catch{}}}
    renderer.xr.setFoveation([.75,.5,.25][settings.quality==='auto'?governor.level:({low:0,balanced:1,high:2}[settings.quality])]);
    session.addEventListener('visibilitychange',()=>{if(session.visibilityState!=='visible')setPaused(true);});
    status('VR connected.');
  }catch(e){if(session)try{await session.end();}catch{}camera.position.set(0,1.6,0);status(`VR could not start: ${e.message||e.name}. You can retry or play in the browser.`);showDesktopMenu();}
  finally{xrBusy=false;checkVR();}
}
async function checkVR(){
  const b=$('enter-vr');if(!isSecureContext){b.disabled=true;b.innerHTML='VR REQUIRES HTTPS';return;}
  if(!navigator.xr){b.disabled=true;b.innerHTML='OPEN ON QUEST FOR VR';return;}
  try{const ok=await navigator.xr.isSessionSupported('immersive-vr');b.disabled=!ok||xrBusy;b.innerHTML=ok?'ENTER VR <span>↗</span>':'VR HEADSET NOT DETECTED';}catch{b.disabled=true;b.textContent='VR UNAVAILABLE';}
}
function syncSettings(){
  $('quality').value=settings.quality;$('turn').value=settings.turn;$('volume').value=settings.volume*100;$('music').value=settings.music*100;$('comfort').checked=settings.comfort;$('stats-toggle').checked=settings.stats;$('stats').hidden=!settings.stats;sound.setVolume(settings.volume);sound.setMusic(settings.music);saveSettings();
}
for(const id of ['quality','turn','volume','music','comfort','stats-toggle'])$(id).addEventListener('input',()=>{
  if(id==='volume'||id==='music'){sound.unlock();settings[id]=Number($(id).value)/100;}else if(id==='comfort')settings.comfort=$(id).checked;else if(id==='stats-toggle')settings.stats=$(id).checked;else settings[id]=$(id).value;
  syncSettings();if(id==='quality')applyQuality();
});
$('play-desktop').addEventListener('click',startDesktop);$('enter-vr').addEventListener('click',startVR);$('restart').addEventListener('click',()=>{resetRun();startDesktop();});
document.addEventListener('keydown',e=>{
  if(e.target.matches('input,select,summary,button')&&e.code!=='Escape')return;
  if(['Space','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();keys[e.code]=true;
  if(e.repeat)return;if(e.code==='KeyP'&&hasRun)setPaused(!paused);if(e.code==='KeyF'&&mode==='desktop')shoot();
});
document.addEventListener('keyup',e=>{keys[e.code]=false;});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement!==canvas||paused||renderer.xr.isPresenting)return;yaw-=e.movementX*.0022;pitch=T.MathUtils.clamp(pitch-e.movementY*.0022,-1.35,1.35);});
canvas.addEventListener('mousedown',e=>{if(e.button===0&&!paused&&mode==='desktop'){if(document.pointerLockElement===canvas)shoot();else lockPointer();}});
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&mode==='desktop'&&!paused&&hasRun)setPaused(true);});
addEventListener('blur',()=>{if(hasRun&&!renderer.xr.isPresenting)setPaused(true);for(const k of Object.keys(keys))delete keys[k];});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&hasRun)setPaused(true);});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;setPaused(true);status('Graphics context lost. Waiting for recovery…');});
canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;governor.reset();last=0;status('Graphics restored. Resume when ready.');});

// A subtle peripheral mask, rendered separately in each eye without postprocessing.
const vignette=new T.Mesh(new T.PlaneGeometry(2,2),new T.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,uniforms:{amount:{value:0},damage:{value:0}},vertexShader:'varying vec2 p;void main(){p=position.xy;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'varying vec2 p;uniform float amount;uniform float damage;void main(){float edge=smoothstep(.55,1.2,length(p));gl_FragColor=vec4(mix(vec3(.002,.008,.015),vec3(.35,.015,.025),damage),edge*max(amount,damage*.6));}'}));vignette.frustumCulled=false;vignette.renderOrder=80;scene.add(vignette);

function processXrButtons(){
  for(const c of controllers){c.userData.line.visible=paused;const source=c.userData.source,gp=source?.gamepad;if(!gp)continue;const down=!!gp.buttons[5]?.pressed;if(down&&!buttons.get(c)){setPaused(!paused);pulse(c,.18,25);}buttons.set(c,down);}
  if(paused){let found=-1;for(const c of controllers){if(c.userData.source){const hit=ui.pick(c);if(hit>=0){found=hit;break;}}}if(found!==menuHover){menuHover=found;drawVRMenu();}}
}
function move(dt){
  if(renderer.xr.isPresenting){
    const sources=renderer.xr.getSession()?.inputSources||[];let lx=0,ly=0,rx=0,ry=0;
    for(const s of sources){if(!s.gamepad)continue;const [x,y]=stick(s.gamepad);if(s.handedness==='left'){lx=x;ly=y;}else if(s.handedness==='right'){rx=x;ry=y;}}
    if(settings.turn==='snap'){if(Math.abs(rx)<.25)snapReady=true;if(snapReady&&Math.abs(rx)>.65){turnAroundHead(rig,camera,-Math.sign(rx)*Math.PI/6);snapReady=false;readEye();}}
    else if(rx){turnAroundHead(rig,camera,-rx*1.7*dt);readEye();}
    right.set(1,0,0).applyQuaternion(quat);right.y=0;right.normalize();
    velocity.addScaledVector(right,lx*RULES.xrAcceleration*dt);velocity.addScaledVector(forward,-ly*RULES.xrAcceleration*dt);velocity.y-=ry*RULES.xrAcceleration*dt;
  }else{
    lookEuler.set(pitch,yaw,0,'YXZ');camera.quaternion.setFromEuler(lookEuler);readEye();right.crossVectors(forward,up).normalize();
    const f=(keys.KeyW?1:0)-(keys.KeyS?1:0),s=(keys.KeyD?1:0)-(keys.KeyA?1:0),v=(keys.Space?1:0)-((keys.KeyC||keys.ControlLeft)?1:0);
    velocity.addScaledVector(forward,f*RULES.acceleration*dt);velocity.addScaledVector(right,s*RULES.acceleration*dt);velocity.y+=v*RULES.acceleration*dt;
  }
  velocity.multiplyScalar(Math.max(0,1-RULES.damping*dt));rig.position.addScaledVector(velocity,dt);rig.updateMatrixWorld(true);clampRig(rig,camera,velocity,RULES.boundary);readEye();
}
function hud(){
  $('power').innerHTML=`${Math.round(sim.power)} <small>/ 1000</small>`;$('score').textContent=String(sim.score).padStart(5,'0');$('time').textContent=formatTime(sim.elapsed);$('power-bar').style.width=`${Math.min(100,sim.power/14)}%`;$('power-bar').style.background=sim.power<200?'#ff606b':'#70edcf';
  const info=renderer.info,currentLevel=settings.quality==='auto'?governor.level:({low:0,balanced:1,high:2}[settings.quality]),stats=`${Math.round(1000/(governor.ema||16.67))} FPS · ${info.render.calls} calls · ${Math.round(info.render.triangles/1000)}k triangles\n${['Performance','Balanced','High'][currentLevel]} · ${info.memory.geometries} geometries · ${info.memory.textures} textures`;
  $('stats').textContent=stats;ui.updateHUD(sim,camera,rig,settings.stats?stats.split('\n')[0]:'Y / B: MENU     TRIGGERS: FIRE');
  // Read-only diagnostics: no controls or gameplay mutations are exposed.
  if(debug){$('stats').dataset.diagnostics=JSON.stringify({power:sim.power,score:sim.score,elapsed:sim.elapsed,shots:sim.shots,hits:sim.hits,activeBolts:sim.bolts.filter(b=>b.active).length,alive:sim.drones.filter(d=>d.hp>0).length,mode,paused,ended:sim.ended,position:eye.toArray(),calls:info.render.calls,triangles:info.render.triangles,geometries:info.memory.geometries,textures:info.memory.textures,frameMs:governor.ema,audio:sound.ctx?.state||'not-started'});}
}
function frame(now){
  const raw=last?(now-last):1000/72;last=now;const dt=Math.min(.05,Math.max(0,raw/1000));if(contextLost)return;
  readEye();if(renderer.xr.isPresenting)processXrButtons();
  const running=hasRun&&!paused&&!sim.ended;
  if(running){
    accumulator+=dt;let steps=0;
    while(accumulator>=1/90&&steps<5){
      move(1/90);sim.step(1/90,eye);
      for(const event of sim.events){if(event.type==='hit'||event.type==='kill'){effects.burst(event.type,event.x,event.y,event.z);sound.play(event.type,event.x,event.y,event.z,event.type==='kill'?1:.65);}else if(event.type==='end'){sound.play('end',eye.x,eye.y,eye.z);setPaused(true);}}
      if(sim.damage>0){damageFade=.8;if(now-lastDamagePulse>240){for(const c of controllers)pulse(c,.4,60);lastDamagePulse=now;}}
      accumulator-=1/90;steps++;if(sim.ended){accumulator=0;break;}
    }
    if(steps===5)accumulator=Math.min(accumulator,1/90);
  }
  if(!hasRun){camera.position.set(0,1.6,0);rig.position.set(-5,1,22);camera.lookAt(2,0,0);readEye();}
  arena.update(sim,paused?0:dt,eye);effects.update(sim,paused?0:dt,eye);
  desktopGun.visible=mode==='desktop'&&!paused&&hasRun;desktopGun.position.z=-.38+(desktopGun.userData.recoil||0);
  function animateGun(gun){gun.userData.flash.visible=now<(gun.userData.flashUntil||0);gun.userData.recoil=(gun.userData.recoil||0)*Math.exp(-dt*28);}
  animateGun(desktopGun);for(const c of controllers)animateGun(c.userData.gun);
  damageFade=Math.max(0,damageFade-dt*2);vignette.material.uniforms.damage.value=damageFade;vignette.material.uniforms.amount.value=renderer.xr.isPresenting&&settings.comfort&&running?Math.min(.7,velocity.length()*.065):0;vignette.visible=damageFade>0||vignette.material.uniforms.amount.value>0;
  if(now-audioAt>50){sound.update(eye,forward,headUp,sim);audioAt=now;}
  if(renderer.xr.isPresenting)ui.positionHUD(camera,rig);
  if(now-hudAt>100){hud();hudAt=now;}
  if(running){governor.target=renderer.xr.isPresenting?(renderer.xr.getSession()?.frameRate||72):60;if(governor.sample(raw,dt))applyQuality();}
  renderer.info.reset();renderer.render(scene,camera);
}
syncSettings();applyQuality();checkVR();
try{await renderer.compileAsync(scene,camera);}catch(e){console.warn('Shader warmup:',e.message);}
status('Ready. Use Quest Browser for VR, or a mouse and keyboard for desktop.');
renderer.setAnimationLoop(frame);
