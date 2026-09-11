// Runs the real app and real Three.js scene math with a renderer/DOM adapter.
// This deliberately does NOT claim to test WebGL rendering or headset tracking.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
const root=path.resolve(await fs.access('dist/index.html').then(()=> 'dist',()=>'.'));
const events=new Map(),elements=new Map();let renderer,clock=0,session,failSession=false;
class Element {
  constructor(id){this.id=id;this.hidden=false;this.disabled=false;this.style={};this.dataset={};this.listeners=new Map();this.textContent='';this.innerHTML='';this.value='';this.checked=false;}
  addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(fn);}
  async dispatch(type,event={}){for(const fn of this.listeners.get(type)||[])await fn(event);}
  matches(){return false;}
  focus(){}
  requestPointerLock(){document.pointerLockElement=this;return document.dispatch('pointerlockchange');}
  getContext(){return new Proxy({measureText:s=>({width:s.length*12})},{get(o,p){return p in o?o[p]:()=>{}},set(o,p,v){o[p]=v;return true;}});}
}
const html=await fs.readFile(path.join(root,'index.html'),'utf8');for(const [,id]of html.matchAll(/id="([^"]+)"/g))elements.set(id,new Element(id));
const document=new Element('document');document.getElementById=id=>elements.get(id);document.createElement=tag=>new Element(tag);document.body={classList:{add(){},remove(){}}};document.exitPointerLock=()=>{document.pointerLockElement=null;document.dispatch('pointerlockchange');};
class XRSession extends EventTarget {constructor(){super();this.inputSources=[];this.supportedFrameRates=[72,90];this.frameRate=72;this.visibilityState='visible';}async end(){renderer.xr.isPresenting=false;this.dispatchEvent(new Event('end'));}async updateTargetFrameRate(r){this.frameRate=r;}}
class Renderer {
  constructor(){renderer=this;this.info={autoReset:true,render:{calls:0,triangles:0},memory:{geometries:0,textures:0},reset:()=>{this.info.render.calls=0;this.info.render.triangles=0;}};this.shadowMap={};this.controllers=[new THREE.Group(),new THREE.Group()];this.controllers.forEach(c=>c.visible=false);
    this.xr={enabled:false,isPresenting:false,getController:i=>this.controllers[i],setFoveation(){},setFramebufferScaleFactor:()=>{assert.ok(!this.xr.isPresenting,'Framebuffer must not resize in session');},setReferenceSpaceType(){},getSession:()=>this.xr.isPresenting?session:null,updateCamera:cam=>cam.updateMatrixWorld(true),setSession:async s=>{session=s;this.xr.isPresenting=true;}};
  }
  setPixelRatio(){}setSize(){}async compileAsync(){}setAnimationLoop(fn){this.loop=fn;}
  render(scene,camera){scene.updateMatrixWorld(true);const geos=new Set(),textures=new Set();scene.traverseVisible(o=>{if(o.isMesh||o.isPoints||o.isLine){if(o.isInstancedMesh&&!o.count)return;this.info.render.calls++;this.info.render.triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);geos.add(o.geometry);if(o.material.map)textures.add(o.material.map);}});this.info.memory.geometries=geos.size;this.info.memory.textures=textures.size;}
}
const navigator={xr:{isSessionSupported:async()=>true,requestSession:async()=>{if(failSession)throw new Error('Test denial');return new XRSession();}}};
const ctx=vm.createContext({console,document,window:{},navigator,isSecureContext:true,location:{search:'?debug=1'},URLSearchParams,performance:{now:()=>clock},innerWidth:1280,innerHeight:800,devicePixelRatio:1,localStorage:{getItem:()=>null,setItem(){}},addEventListener:(t,f)=>events.set(t,f),Event,EventTarget});
const actual={...THREE,WebGLRenderer:Renderer},three=new vm.SyntheticModule(Object.keys(actual),function(){for(const [k,v]of Object.entries(actual))this.setExport(k,v);},{context:ctx});
const cache=new Map();async function load(file){if(file.endsWith('three.module.js'))return three;if(cache.has(file))return cache.get(file);const mod=new vm.SourceTextModule(await fs.readFile(file,'utf8'),{context:ctx,identifier:file});cache.set(file,mod);await mod.link((specifier,parent)=>load(path.resolve(path.dirname(parent.identifier),specifier)));return mod;}
const app=await load(path.join(root,'js/app.js'));await app.evaluate();
const tick=(n=1)=>{for(let i=0;i<n;i++){clock+=1000/90;renderer.loop(clock);}};
const state=()=>JSON.parse(elements.get('stats').dataset.diagnostics);
const key=async code=>{await document.dispatch('keydown',{code,repeat:false,target:elements.get('game'),preventDefault(){}});};
tick(20);assert.ok(elements.get('status').textContent.startsWith('Ready'));assert.equal(state().mode,'menu');
await elements.get('play-desktop').dispatch('click');tick(180);assert.equal(state().mode,'desktop');assert.equal(state().paused,false);assert.ok(state().elapsed>1.9);assert.ok(state().power<1000);
await key('KeyF');tick(20);assert.equal(state().shots,1);
await key('KeyP');tick(20);const pausedAt=state().elapsed;tick(180);assert.equal(state().elapsed,pausedAt);assert.equal(state().paused,true);
await elements.get('play-desktop').dispatch('click');tick(20);assert.equal(state().paused,false);
await elements.get('restart').dispatch('click');tick(20);assert.equal(state().shots,0);assert.ok(state().elapsed<.3);
await key('KeyP');tick(20);failSession=true;await elements.get('enter-vr').dispatch('click');tick(20);assert.ok(elements.get('status').textContent.includes('Test denial'));assert.equal(renderer.xr.isPresenting,false);assert.equal(state().paused,true);
failSession=false;await elements.get('enter-vr').dispatch('click');tick(20);assert.equal(state().mode,'xr');assert.equal(state().paused,false);assert.equal(renderer.xr.isPresenting,true);
const source={handedness:'right',gamepad:{axes:[0,0,0,0],buttons:Array.from({length:6},()=>({pressed:false})),hapticActuators:[]}};session.inputSources=[source];const c=renderer.controllers[0];c.visible=true;c.dispatchEvent({type:'connected',data:source});c.dispatchEvent({type:'selectstart'});tick(20);assert.equal(state().shots,1);
source.gamepad.buttons[5].pressed=true;tick(20);assert.equal(state().paused,true);source.gamepad.buttons[5].pressed=false;tick(20);source.gamepad.buttons[5].pressed=true;tick(20);assert.equal(state().paused,false);
await session.end();tick(20);assert.equal(state().mode,'desktop');assert.equal(state().paused,true);
console.log(JSON.stringify({passed:true,coverage:['app startup','desktop start','shot','pause freeze','resume','reset','XR denial recovery','XR session entry','controller fire','Y/B pause edges','session exit'],rendering:'Not tested; renderer and browser adapters used',finalDiagnostics:state()},null,2));
