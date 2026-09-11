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
 ray(p,d,len,pad=0,out=[]){
  const ex=p.x+d.x*len,ey=p.y+d.y*len,ez=p.z+d.z*len;
  // Short projectile sweeps are cheapest as one box. Long diagonal rays walk
  // only the intersected grid cells, with a conservative swept-radius margin.
  if(len<=this.size*1.5)return this.box(Math.min(p.x,ex)-pad,Math.min(p.y,ey)-pad,Math.min(p.z,ez)-pad,Math.max(p.x,ex)+pad,Math.max(p.y,ey)+pad,Math.max(p.z,ez)+pad,out);
  out.length=0;const tag=++this.serial,k=1/this.size,margin=pad+1e-6;
  let cx=Math.floor(p.x*k),cy=Math.floor(p.y*k),cz=Math.floor(p.z*k),t=0;
  const sx=Math.sign(d.x),sy=Math.sign(d.y),sz=Math.sign(d.z),dx=sx?this.size/Math.abs(d.x):Infinity,dy=sy?this.size/Math.abs(d.y):Infinity,dz=sz?this.size/Math.abs(d.z):Infinity;
  let tx=sx?((cx+(sx>0?1:0))*this.size-p.x)/d.x:Infinity,ty=sy?((cy+(sy>0?1:0))*this.size-p.y)/d.y:Infinity,tz=sz?((cz+(sz>0?1:0))*this.size-p.z)/d.z:Infinity;
  for(let steps=0;steps<4096;steps++){
   const end=Math.min(len,tx,ty,tz),ax=p.x+d.x*t,ay=p.y+d.y*t,az=p.z+d.z*t,bx=p.x+d.x*end,by=p.y+d.y*end,bz=p.z+d.z*end;
   for(let x=Math.floor((Math.min(ax,bx)-margin)*k);x<=Math.floor((Math.max(ax,bx)+margin)*k);x++)for(let y=Math.floor((Math.min(ay,by)-margin)*k);y<=Math.floor((Math.max(ay,by)+margin)*k);y++)for(let z=Math.floor((Math.min(az,bz)-margin)*k);z<=Math.floor((Math.max(az,bz)+margin)*k);z++){
    const key=this.key(x,y,z),a=this.cells.get(key),b=this.staticCells.get(key);if(a)for(const e of a)if(e.alive&&e._tag!==tag){e._tag=tag;out.push(e);}if(b)for(const e of b)if(e.alive&&e._tag!==tag){e._tag=tag;out.push(e);}
   }
   if(end>=len)break;if(tx<=end+1e-8){cx+=sx;tx+=dx;}if(ty<=end+1e-8){cy+=sy;ty+=dy;}if(tz<=end+1e-8){cz+=sz;tz+=dz;}t=end;
  }return out;
 }
}
