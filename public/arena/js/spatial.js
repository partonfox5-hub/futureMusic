// Static arena props keep their broad-phase cells until creation/destruction.
// Moving entities use reused cell lists. Queries combine both without duplicates.
const STATIC=new Set(['marquee','window','well','kennel','hatch','island']);
export class SpatialGrid {
 constructor(size=8){this.size=size;this.cells=new Map();this.staticCells=new Map();this.used=[];this.serial=0;this.staticSignature='';this.rebuilds={static:0,dynamic:0};}
 key(x,y,z){return ((x+512)&1023)*1048576+((y+512)&1023)*1024+((z+512)&1023);}
 insert(e,cells,track){const k=1/this.size,r=e.bound||e.r||.3;for(let x=Math.floor((e.p.x-r)*k);x<=Math.floor((e.p.x+r)*k);x++)for(let y=Math.floor((e.p.y-r)*k);y<=Math.floor((e.p.y+r)*k);y++)for(let z=Math.floor((e.p.z-r)*k);z<=Math.floor((e.p.z+r)*k);z++){const key=this.key(x,y,z);let a=cells.get(key);if(!a){a=[];cells.set(key,a);}if(track&&!a.length)this.used.push(a);a.push(e);}}
 rebuild(entities){for(const a of this.used)a.length=0;this.used.length=0;let staticCount=0,sum=0;for(const e of entities)if(e.alive){if(STATIC.has(e.type)){staticCount++;sum+=e.id;}else this.insert(e,this.cells,true);}const signature=staticCount+':'+sum;if(signature!==this.staticSignature){this.staticSignature=signature;this.staticCells.clear();for(const e of entities)if(e.alive&&STATIC.has(e.type))this.insert(e,this.staticCells,false);this.rebuilds.static++;}this.rebuilds.dynamic++;}
 box(minX,minY,minZ,maxX,maxY,maxZ,out=[]){out.length=0;const tag=++this.serial,k=1/this.size;for(let x=Math.floor(minX*k);x<=Math.floor(maxX*k);x++)for(let y=Math.floor(minY*k);y<=Math.floor(maxY*k);y++)for(let z=Math.floor(minZ*k);z<=Math.floor(maxZ*k);z++){const key=this.key(x,y,z),a=this.cells.get(key),b=this.staticCells.get(key);if(a)for(const e of a)if(e.alive&&e._tag!==tag){e._tag=tag;out.push(e);}if(b)for(const e of b)if(e.alive&&e._tag!==tag){e._tag=tag;out.push(e);}}return out;}
 near(p,r,out=[]){return this.box(p.x-r,p.y-r,p.z-r,p.x+r,p.y+r,p.z+r,out);}
 ray(p,d,len,pad=0,out=[]){const x=p.x+d.x*len,y=p.y+d.y*len,z=p.z+d.z*len;return this.box(Math.min(p.x,x)-pad,Math.min(p.y,y)-pad,Math.min(p.z,z)-pad,Math.max(p.x,x)+pad,Math.max(p.y,y)+pad,Math.max(p.z,z)+pad,out);}
}
