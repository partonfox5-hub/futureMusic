import * as T from 'three';
export const VERSION = '17.2.0';
export const clamp = T.MathUtils.clamp;
export const V = () => new T.Vector3();
export function finiteDt(dt, max=.05) { return Number.isFinite(dt) ? clamp(dt,0,max) : 0; }
export function attachedTo(object,scene){for(let o=object;o;o=o.parent)if(o===scene)return true;return false;}
export function rng(seed=1701) { let s=seed>>>0; return () => { s=(Math.imul(1664525,s)+1013904223)>>>0; return s/4294967296; }; }
export function smooth(x) { x=clamp(x,0,1); return x*x*(3-2*x); }
export function gravityOf(world,out=V()) {
  if (world?.gravityVector?.isVector3) return out.copy(world.gravityVector);
  return out.set(0,-(Number.isFinite(world?.gravity)?world.gravity:9.81),0);
}
// Segment versus box, including a swept radius. Returns first fraction or null.
export function segmentBox(a,b,box,radius=0) {
  let lo=0,hi=1;
  for (const k of ['x','y','z']) {
    const d=b[k]-a[k],min=box.min[k]-radius,max=box.max[k]+radius;
    if (Math.abs(d)<1e-10) { if(a[k]<min||a[k]>max)return null; continue; }
    let x=(min-a[k])/d,y=(max-a[k])/d;if(x>y)[x,y]=[y,x];
    lo=Math.max(lo,x);hi=Math.min(hi,y);if(lo>hi)return null;
  }
  return lo;
}
export function obstacleBox(o,out=new T.Box3()) {
  return out.set(new T.Vector3(o.x-o.w/2,o.y??0,o.z-o.d/2),new T.Vector3(o.x+o.w/2,(o.y??0)+(o.h??1),o.z+o.d/2));
}
export function localBounds(root) {
  root.updateWorldMatrix(true,true);const inv=root.matrixWorld.clone().invert(),out=new T.Box3();
  root.traverse(o=>{if(!o.isMesh||o.userData.h5Effect)return;o.geometry.computeBoundingBox();out.union(o.geometry.boundingBox.clone().applyMatrix4(inv.clone().multiply(o.matrixWorld)));});
  return out;
}
export function disposeTree(root) {
  const geometries=new Set(),materials=new Set(),textures=new Set();
  root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture&&v.userData?.h5Owned)textures.add(v);}});
  root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
}
export function wrapMethod(object,key,fn) {
  const own=Object.hasOwn(object,key),old=object[key];if(typeof old!=='function')throw new TypeError('Missing host method '+key);
  const replacement=fn(old);object[key]=replacement;
  return ()=>{if(object[key]===replacement){if(own)object[key]=old;else delete object[key];}};
}
export function detachMovable(world,root) {
  const f=root.userData.furniture; if(f?.held)return false;
  if(f?.obstacle)world.removeObstacle(f.obstacle);
  if(f?.seat?.occupant){f.seat.occupant.seat=null;f.seat.occupant=null;}
  for(const key of ['movables','pickables','seats'])if(world[key])world[key]=world[key].filter(o=>o!==root&&o!==f?.seat&&o?.userData?.furnRoot!==root);
  disposeTree(root);world.grid=null;return true;
}
