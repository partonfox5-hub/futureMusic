import * as T from 'three';
import {tagMovable,syncFurniture} from './mira-v2-furniture.js?v=17.2.0';
import {FloraGrass} from './src/flora/FloraGrass.js?v=17.2.0';
import {FloraPlants} from './src/flora/FloraPlants.js?v=17.2.0';
import {FloraHarvest} from './src/flora/FloraHarvest.js?v=17.2.0';
import {FloraBoulders} from './src/flora/FloraBoulders.js?v=17.2.0';
import {FloraDebris} from './src/flora/FloraDebris.js?v=17.2.0';
// Copy src/* to src/flora/* per module.json. Host imports are dependencies, not bundled copies.
export function createFloraSystem(ctx={}){
 ctx??={};
 if(ctx.props?.flora&&!ctx.props.flora.disposed)return ctx.props.flora;
 const world=ctx.world||{},root=new T.Group(),geometries=new Set(),materials=new Set(),textures=new Set();root.name='Mira Flora';let serial=0,seed=1729,time=0,revision=world.revision,parent=world.root,density=.45,grass=null,plants=null,harvest=null,boulders=null,debris=null;
 const quest=ctx.quest??(/Quest|OculusBrowser/i.test(globalThis.navigator?.userAgent||'')),maps={},assetErrors=[];
 const names={grass_albedo:'png',flower_atlas:'png',beet_albedo:'jpg',carrot_albedo:'jpg',rock_albedo:'jpg',rock_normal:'jpg',dirt_albedo:'jpg'};
 if(typeof document!=='undefined'&&ctx.loadTextures!==false){const loader=new T.TextureLoader();for(const [name,ext] of Object.entries(names)){const url=new URL(`./assets/flora/${name}.${ext}`,import.meta.url).href,t=loader.load(url,undefined,()=>assetErrors.push(name));t.colorSpace=name.endsWith('normal')?T.NoColorSpace:T.SRGBColorSpace;t.wrapS=t.wrapT=ext==='png'?T.ClampToEdgeWrapping:T.RepeatWrapping;t.anisotropy=Math.min(4,ctx.renderer?.capabilities?.getMaxAnisotropy?.()||1);t.name=name;textures.add(t);maps[name]=t;}}
 const env={ctx,world,root,quest,maps,items:[],name:world.name,density,random:()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},id:kind=>`flora-${kind}-${++serial}`,
  geometry:g=>(geometries.add(g),g),material:p=>{const m=new T.MeshStandardMaterial(Object.fromEntries(Object.entries(p).filter(([,v])=>v!==undefined)));if(p.map?.name)m.userData.floraTexture=p.map.name;materials.add(m);return m;},
  mesh:(g,m,into=root)=>{geometries.add(g);const mesh=new T.Mesh(g,m);mesh.castShadow=false;mesh.receiveShadow=true;into.add(mesh);return mesh;},
  floor:(x,z)=>{try{return Number(world.floorHeight?.(new T.Vector3(x,0,z)))||0;}catch{return 0;}},
  held:g=>{const f=g?.userData?.furniture;if(f?.holds?.size||f?.held!=null)return true;return [...(ctx.props?.furnHolds?.values?.()||[])].some(h=>h.group===g);},
  find:v=>typeof v==='string'?env.items.find(h=>h.id===v):env.items.includes(v)?v:env.items.find(h=>h.group===v||h.mesh===v),
  blocked:(x,z,r)=>{for(const o of world.obstacles||[])if(!o.walkable&&o.h>.08&&Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r)return true;return false;},
  tag:(g,id,mass)=>{tagMovable(world,g,id);const f=g.userData.furniture;f.mass=mass;f.density=mass/Math.max(.0001,f.volume);return f;},
  sync:g=>{if(typeof world.obstacle==='function')syncFurniture(world,g);},
  remove:h=>{if(!h||!env.items.includes(h))return;for(const [key,hold] of ctx.props?.furnHolds?.entries?.()||[])if(hold.group===h.group){if(ctx.props.releaseFurniture)ctx.props.releaseFurniture(key);else ctx.props.furnHolds.delete(key);}const meshes=new Set();h.group.traverse(o=>{if(o.isMesh)meshes.add(o);});if(world.movables)world.movables=world.movables.filter(g=>g!==h.group);if(world.pickables)world.pickables=world.pickables.filter(m=>!meshes.has(m));const obstacle=h.group.userData.furniture?.obstacle;if(obstacle)world.removeObstacle?.(obstacle);if(world.fractures?.parts)world.fractures.parts=world.fractures.parts.filter(p=>!meshes.has(p.mesh));h.group.removeFromParent();h.mound?.removeFromParent();env.items.splice(env.items.indexOf(h),1);}
 };
 function clear(){for(const h of [...env.items])env.remove(h);debris?.dispose();boulders?.restore();root.clear();root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();geometries.clear();materials.clear();grass=plants=harvest=boulders=debris=null;}
 function populate(name=world.name){if(api.disposed)return api;clear();revision=world.revision;parent=world.root;env.name=name;seed=name==='Beach'?6311:1729;if(!['Jungle','Beach'].includes(name))return api;(world.root||ctx.scene)?.add(root);if(!root.parent)return api;
  env.density=density;env.rockMaterial=env.material({map:maps.rock_albedo,normalMap:maps.rock_normal,normalScale:new T.Vector2(.45,.45),color:0xc0c1b9,roughness:.92});env.rockMaterial.userData.floraTexture='rock_albedo';
  debris=new FloraDebris(env);boulders=new FloraBoulders(env,debris);
  // Missing host services leave a safe scenery-only overlay, never a second furniture API.
  if(typeof world.obstacle==='function'&&typeof world.removeObstacle==='function'){world.movables??=[];world.pickables??=[];world.obstacles??=[];boulders.populate();plants=new FloraPlants(env);plants.populate();harvest=new FloraHarvest(env,debris);}
  grass=new FloraGrass(env);return api;
 }
 function tick(dt){if(api.disposed)return;if(world.revision!==revision||world.root!==parent)populate();if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.05);time+=dt;grass?.tick(time);harvest?.tick(dt);boulders?.tick();debris?.tick(dt);}
 const api={root,quest,disposed:false,get density(){return density;},get grass(){return grass?.mesh||null;},get assetErrors(){return [...assetErrors];},populate,clear,tick,
  setDensity:v=>{density=T.MathUtils.clamp(Number.isFinite(Number(v))?Number(v):.45,0,1);env.density=density;grass?.setDensity(density);return api;},
  pull:v=>harvest?.pull(v)||false,smash:(v,hit)=>boulders?.smash(v,hit)||false,list:()=>[...env.items],
  dispose:()=>{if(api.disposed)return;clear();for(const t of textures)t.dispose();textures.clear();api.disposed=true;if(ctx.props?.flora===api)delete ctx.props.flora;}
 };
 if(ctx.props)ctx.props.flora=api;populate();return api;
}
export function installFlora(ctx={}){return createFloraSystem(ctx);}
