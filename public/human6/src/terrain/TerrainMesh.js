import * as T from 'three';
import {createTerrainMaterial} from './TerrainSurface.js';
export class TerrainMesh {
  constructor(field,{chunkCells=32,near=82,mid=160,far=280}={}){
    this.field=field;this.chunkCells=chunkCells;this.ranges=[near,mid,far];this.root=new T.Group();this.root.name='Advanced terrain';this.root.userData.terrain=true;
    this.material=createTerrainMaterial(field.options.biome);this.chunks=[];this.timer=1;this.last=new T.Vector3(Infinity,0,Infinity);
    if(field.n%chunkCells)throw new Error('Terrain segments must divide by chunkCells');
    for(let j=0;j<field.n;j+=chunkCells)for(let i=0;i<field.n;i+=chunkCells){
      const mesh=new T.Mesh(new T.BufferGeometry(),this.material);mesh.receiveShadow=true;mesh.castShadow=false;mesh.raycast=()=>{};
      mesh.userData.terrain=true;this.root.add(mesh);
      this.chunks.push({i,j,mesh,cache:new Map(),step:0,x:(i+chunkCells/2)*field.cell-field.half,z:(j+chunkCells/2)*field.cell-field.half});
    }
    this.root.raycast=(rc,hits)=>{const h=this.raycast(rc.ray,rc.far);if(h&&h.distance>=rc.near)hits.push(h);};
    this.off=field.onChange(r=>this.dirty(r));this.tick(1,new T.Vector3());
  }
  geometry(chunk,step){
    const f=this.field,n=this.chunkCells/step,count=(n+1)*(n+1),p=[],norm=[],ids=[];
    const push=(i,j,skirt=false)=>{
      const x=i*f.cell-f.half,z=j*f.cell-f.half,h=f.at(i,j),normal=f.normalAt(x,z);
      p.push(x,h-(skirt?Math.max(3,step*f.cell):0),z);norm.push(normal.x,normal.y,normal.z);return p.length/3-1;
    };
    for(let z=0;z<=n;z++)for(let x=0;x<=n;x++)push(chunk.i+x*step,chunk.j+z*step);
    for(let z=0;z<n;z++)for(let x=0;x<n;x++){const a=z*(n+1)+x,b=a+1,c=a+n+1,d=c+1;ids.push(a,c,b,b,c,d);}
    const edge=[];
    for(let x=0;x<=n;x++)edge.push(x);
    for(let z=1;z<=n;z++)edge.push(z*(n+1)+n);
    for(let x=n-1;x>=0;x--)edge.push(n*(n+1)+x);
    for(let z=n-1;z>0;z--)edge.push(z*(n+1));
    for(const a of edge)push(chunk.i+(a%(n+1))*step,chunk.j+Math.floor(a/(n+1))*step,true);
    for(let k=0;k<edge.length;k++){const q=(k+1)%edge.length;ids.push(edge[k],count+k,edge[q],edge[q],count+k,count+q);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(norm,3));g.setIndex(ids);g.computeBoundingSphere();g.computeBoundingBox();return g;
  }
  show(c,step){
    let entry=c.cache.get(step);
    if(!entry){entry={g:this.geometry(c,step),dirty:null};c.cache.set(step,entry);}
    else if(entry.dirty){this.updateGeometry(c,step,entry.g,entry.dirty);entry.dirty=null;}
    if(c.step===0)c.mesh.geometry.dispose();c.mesh.geometry=entry.g;c.step=step;
  }
  dirty(r){
    for(const c of this.chunks)if(c.i<=r.i1+1&&c.i+this.chunkCells>=r.i0-1&&c.j<=r.j1+1&&c.j+this.chunkCells>=r.j0-1){
      for(const e of c.cache.values()){const old=e.dirty;e.dirty=old?{i0:Math.min(old.i0,r.i0),i1:Math.max(old.i1,r.i1),j0:Math.min(old.j0,r.j0),j1:Math.max(old.j1,r.j1)}:{...r};}this.show(c,c.step||1);
    }
  }
  updateGeometry(c,step,g,r){
    const f=this.field,p=g.attributes.position,n=g.attributes.normal,normal=new T.Vector3();
    const side=this.chunkCells/step+1,topCount=side*side;
    for(let k=0;k<p.count;k++){
      const x=p.getX(k),z=p.getZ(k),i=Math.round((x+f.half)/f.cell),j=Math.round((z+f.half)/f.cell);
      if(i<r.i0-1||i>r.i1+1||j<r.j0-1||j>r.j1+1)continue;
      p.setY(k,f.at(i,j)-(k>=topCount?Math.max(3,step*f.cell):0));f.normalAt(x,z,normal);n.setXYZ(k,normal.x,normal.y,normal.z);
    }
    p.needsUpdate=n.needsUpdate=true;g.computeBoundingSphere();g.computeBoundingBox();
  }
  tick(dt,viewer){
    this.timer+=dt;if(this.timer<.20||viewer.distanceToSquared(this.last)<4)return;this.timer=0;this.last.copy(viewer);
    const r=this.ranges;
    for(const c of this.chunks){const d=Math.hypot(c.x-viewer.x,c.z-viewer.z);let step=d<r[0]?1:d<r[1]?2:d<r[2]?4:8;
      // Hysteresis avoids LOD chatter while standing near a threshold.
      if(c.step&&step!==c.step){const boundary=r[Math.log2(Math.min(step,c.step))];if(Math.abs(d-boundary)<5)step=c.step;}
      if(c.step!==step)this.show(c,step);
    }
  }
  raycast(ray,maxDistance=80){
    const f=this.field,o=ray.origin,d=ray.direction;
    if(![o.x,o.y,o.z,d.x,d.y,d.z,maxDistance].every(Number.isFinite)&&maxDistance!==Infinity)return null;
    // DDA traverses only the grid cells touched by the ray, then tests their exact two triangles.
    let enter=0,leave=maxDistance;
    for(const [v,a,min,max] of [[o.x,d.x,-f.half,f.half],[o.y,d.y,f.options.minHeight,f.options.maxHeight],[o.z,d.z,-f.half,f.half]]){
      if(Math.abs(a)<1e-12){if(v<min||v>max)return null;continue;}
      let t0=(min-v)/a,t1=(max-v)/a;if(t0>t1)[t0,t1]=[t1,t0];enter=Math.max(enter,t0);leave=Math.min(leave,t1);
    }
    if(enter>leave||leave<0)return null;
    const eps=1e-7,p=ray.at(enter+eps,new T.Vector3());
    let i=T.MathUtils.clamp(Math.floor((p.x+f.half)/f.cell),0,f.n-1),j=T.MathUtils.clamp(Math.floor((p.z+f.half)/f.cell),0,f.n-1);
    const sx=Math.sign(d.x),sz=Math.sign(d.z),tx=sx?f.cell/Math.abs(d.x):Infinity,tz=sz?f.cell/Math.abs(d.z):Infinity;
    let nx=sx?((i+(sx>0?1:0))*f.cell-f.half-o.x)/d.x:Infinity,nz=sz?((j+(sz>0?1:0))*f.cell-f.half-o.z)/d.z:Infinity;
    const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),e=new T.Vector3(),hit=new T.Vector3();
    for(let guard=0;guard<f.n*2+4&&i>=0&&j>=0&&i<f.n&&j<f.n;guard++){
      const x=i*f.cell-f.half,z=j*f.cell-f.half;
      a.set(x,f.at(i,j),z);b.set(x+f.cell,f.at(i+1,j),z);c.set(x,f.at(i,j+1),z+f.cell);e.set(x+f.cell,f.at(i+1,j+1),z+f.cell);
      let best=null,dist=Infinity;
      for(const tri of [[a,c,b],[b,c,e]])if(ray.intersectTriangle(...tri,false,hit)){
        const t=hit.distanceTo(o);if(t>=enter-eps&&t<=Math.min(leave,nx,nz)+eps&&t<dist){dist=t;best=hit.clone();}
      }
      if(best){const normal=new T.Vector3();f.normalAt(best.x,best.z,normal);return{point:best,distance:dist,object:this.root,face:{normal}};}
      const next=Math.min(nx,nz);if(next>leave||!Number.isFinite(next))break;
      if(nx<=nz+eps){i+=sx;nx+=tx;}if(nz<=next+eps){j+=sz;nz+=tz;}
    }
    return null;
  }
  get triangles(){return this.chunks.reduce((s,c)=>s+c.mesh.geometry.index.count/3,0);}
  dispose(){this.off();this.root.removeFromParent();for(const c of this.chunks)for(const e of c.cache.values())e.g.dispose();this.material.dispose();}
}
