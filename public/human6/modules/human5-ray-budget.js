import * as T from 'three';

const bounds=new WeakMap(),point=new T.Vector3();
/** Conservative bone bounds reject distant rays before skinning every body triangle. */
export function rayMayHitActor(props,actor,ray,maxDistance){
 let cache=bounds.get(actor);if(!cache){const bones=actor.bones?Object.values(actor.bones).filter(b=>b?.isBone):[];if(!bones.length)actor.root.traverse(b=>{if(b.isBone)bones.push(b);});cache={bones,box:new T.Box3(),frame:-1,at:-1};bounds.set(actor,cache);}
 if(!cache.bones.length)return true;
 const now=performance.now();if(cache.frame!==props.time||now-cache.at>25){cache.frame=props.time;cache.at=now;cache.box.makeEmpty();for(const b of cache.bones){point.setFromMatrixPosition(b.matrixWorld);if(Number.isFinite(point.lengthSq()))cache.box.expandByPoint(point);}cache.box.expandByScalar(.85);}
 if(cache.box.containsPoint(ray.origin))return true;
 const p=ray.intersectBox(cache.box,point);return !!p&&ray.origin.distanceToSquared(p)<=maxDistance*maxDistance;
}
