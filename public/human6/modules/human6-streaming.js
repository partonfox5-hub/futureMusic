/** Stable 96 m save identities; independent activation, retention and reuse budgets. */
export const STREAMING = Object.freeze({cellSize:96, coreRadius:1, retain:120, lookAheadSeconds:.9, lookAheadMax:96, active:16, cache:4, sliceMs:2.2, scanSeconds:.20, understoryLoad:48, understoryRetain:72, farForest:1250});
export function cellDistance(x,z,p,size=96){return Math.hypot(Math.max(0,Math.abs((x+.5)*size-p.x)-size/2),Math.max(0,Math.abs((z+.5)*size-p.z)-size/2));}
export function planCells(p,ahead,resident,{half=2112,pins=[],burning=[],limit=STREAMING.active}={}){
  const candidates=new Map(),size=STREAMING.cellSize;
  function offer(x,z,priority){if(x*size<-half||z*size<-half||x*size>=half||z*size>=half)return;const key=x+'/'+z,old=candidates.get(key);if(!old||priority<old.d)candidates.set(key,{key,x,z,d:priority});}
  function disk(q,r,bias){for(let z=Math.floor((q.z-r)/size);z<=Math.floor((q.z+r)/size);z++)for(let x=Math.floor((q.x-r)/size);x<=Math.floor((q.x+r)/size);x++){const d=cellDistance(x,z,q,size);if(d<=r)offer(x,z,bias+d);}}
  const cx=Math.floor(p.x/size),cz=Math.floor(p.z/size);for(let z=cz-STREAMING.coreRadius;z<=cz+STREAMING.coreRadius;z++)for(let x=cx-STREAMING.coreRadius;x<=cx+STREAMING.coreRadius;x++)offer(x,z,cellDistance(x,z,p,size));
  if(Math.hypot(ahead.x-p.x,ahead.z-p.z)>8)disk(ahead,32,78);
  // Retention has lower priority than immediate/approaching cells, but avoids
  // border oscillation. The LRU cache handles the remaining bounded evictions.
  for(const c of resident.values()){const d=cellDistance(c.x,c.z,p,size);if(d<STREAMING.retain)offer(c.x,c.z,115+d);}
  const result=[...candidates.values()].sort((a,b)=>a.d-b.d).slice(0,limit);
  for(const q of pins){const x=Math.floor(q.x/size),z=Math.floor(q.z/size),key=x+'/'+z;if(x*size>=-half&&z*size>=-half&&x*size<half&&z*size<half&&!result.some(c=>c.key===key))result.push({key,x,z,d:0});}
  for(const c of burning.slice(0,3))if(!result.some(q=>q.key===c.key))result.push({...c,d:0});
  return result.sort((a,b)=>a.d-b.d);
}
