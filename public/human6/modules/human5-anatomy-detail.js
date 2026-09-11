import * as T from 'three';

/** Local, conforming edge refinement. All material partitions share the same
 * expanded attributes; skin weights and every expression target are preserved.
 * Runs once at construction, never during animation. No global subdivision.
 */
export function refineAnatomyDetail(root,passes=2){
  const groups=new Map();root.traverse(mesh=>{
    if(!mesh.isSkinnedMesh||mesh.name==='hair'||!mesh.geometry.index)return;
    const key=mesh.geometry.attributes.position;
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);
  });let added=0;
  const edgeKey=(a,b)=>a<b?a+'/'+b:b+'/'+a;
  for(const meshes of groups.values())for(let pass=0;pass<passes;pass++){
    const first=meshes[0].geometry,position=first.attributes.position,edges=new Map(),pairs=[];
    const near=(x,y,z)=>z>.07&&Math.hypot(Math.abs(x)-.0762,y-1.187)<.028;
    const mark=(a,b)=>{const key=edgeKey(a,b);if(!edges.has(key)){edges.set(key,position.count+pairs.length);pairs.push([a,b]);}};
    for(const mesh of meshes){const ids=mesh.geometry.index.array;
      for(let i=0;i<ids.length;i+=3){const [a,b,c]=[ids[i],ids[i+1],ids[i+2]];
        const x=(position.getX(a)+position.getX(b)+position.getX(c))/3,y=(position.getY(a)+position.getY(b)+position.getY(c))/3,z=(position.getZ(a)+position.getZ(b)+position.getZ(c))/3;
        if(near(x,y,z)||[a,b,c].some(v=>near(position.getX(v),position.getY(v),position.getZ(v)))){mark(a,b);mark(b,c);mark(c,a);}
      }
    }
    if(!pairs.length)break;added+=pairs.length;
    function expand(attr,name=''){
      const size=attr.itemSize,array=new attr.array.constructor((position.count+pairs.length)*size);array.set(attr.array);
      for(let n=0;n<pairs.length;n++){const [a,b]=pairs[n],offset=(position.count+n)*size;
        for(let j=0;j<size;j++)array[offset+j]=(attr.array[a*size+j]+attr.array[b*size+j])*.5;
        if(name==='normal'){const length=Math.hypot(array[offset],array[offset+1],array[offset+2]);if(length>1e-9)for(let j=0;j<3;j++)array[offset+j]/=length;}
      }
      return new T.BufferAttribute(array,size,attr.normalized);
    }
    const attrs=Object.fromEntries(Object.entries(first.attributes).map(([name,attr])=>[name,expand(attr,name)]));
    if(attrs.skinIndex&&attrs.skinWeight){
      const si=first.attributes.skinIndex.array,sw=first.attributes.skinWeight.array;
      for(let n=0;n<pairs.length;n++){
        const influences=new Map();for(const v of pairs[n])for(let j=0;j<4;j++)if(sw[v*4+j]>0)influences.set(si[v*4+j],(influences.get(si[v*4+j])||0)+sw[v*4+j]*.5);
        const top=[...influences].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=top.reduce((s,v)=>s+v[1],0),offset=(position.count+n)*4;
        for(let j=0;j<4;j++){attrs.skinIndex.array[offset+j]=top[j]?.[0]||0;attrs.skinWeight.array[offset+j]=(top[j]?.[1]||0)/Math.max(1e-9,sum);}
      }
    }
    const morph=Object.fromEntries(Object.entries(first.morphAttributes).map(([name,targets])=>[name,targets.map(a=>expand(a))]));
    for(const mesh of meshes){
      const old=mesh.geometry,ids=old.index.array,out=[],offsets=[];
      for(let i=0;i<ids.length;i+=3){offsets.push(out.length);const v=[ids[i],ids[i+1],ids[i+2]],mid=v.map((a,j)=>edges.get(edgeKey(a,v[(j+1)%3]))),count=mid.filter(x=>x!==undefined).length;
        const [a,b,c]=v,[ab,bc,ca]=mid;
        if(count===0)out.push(a,b,c);
        else if(count===3)out.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);
        else if(count===1){const j=mid.findIndex(x=>x!==undefined),x=v[j],y=v[(j+1)%3],z=v[(j+2)%3],m=mid[j];out.push(x,m,z,m,y,z);}
        else{const j=mid.findIndex((x,k)=>x!==undefined&&mid[(k+1)%3]!==undefined),x=v[j],y=v[(j+1)%3],z=v[(j+2)%3],m=mid[j],n=mid[(j+1)%3];out.push(m,y,n,x,m,z,m,n,z);}
      }
      offsets.push(out.length);
      const g=new T.BufferGeometry();g.attributes=attrs;g.morphAttributes=morph;g.morphTargetsRelative=old.morphTargetsRelative;g.setIndex(out);
      g.groups=old.groups.map(a=>({...a,start:offsets[a.start/3],count:offsets[(a.start+a.count)/3]-offsets[a.start/3]}));
      g.userData={...old.userData,h5AnatomyDetail:true};g.computeBoundingSphere();mesh.geometry=g;
    }
  }
  return added;
}
