import * as T from 'three';

/** The same garment topology and material follow the skeleton outside arm's reach.
 * Held and detached fabric always returns to the particle solver. Nothing is removed
 * from collision/picking; cuts share the same face list in both representations.
 */
export function createClothSkin(cloth){
 const ref=cloth.skinAnchors.find(r=>r?.cache?.mesh);if(!ref||cloth.fitted!==cloth.p.length)return null;
 const source=ref.cache.mesh,n=cloth.p.length,position=new Float32Array(n*3),normal=new Float32Array(n*3),indices=new Uint16Array(n*4),weights=new Float32Array(n*4),v=new T.Vector3(),norm=new T.Vector3(),temp=new T.Vector3();
 for(let i=0;i<n;i++){
  const r=cloth.skinAnchors[i];if(!r)return null;const g=r.cache.mesh.geometry,score=new Map();v.setScalar(0);norm.setScalar(0);
  for(let k=0;k<3;k++){const id=r.ids[k],b=r.bary.getComponent(k);if(!b)continue;v.addScaledVector(temp.fromBufferAttribute(g.attributes.position,id),b);norm.addScaledVector(temp.fromBufferAttribute(g.attributes.normal,id),b);for(let j=0;j<4;j++){const bi=g.attributes.skinIndex.getComponent(id,j),w=g.attributes.skinWeight.getComponent(id,j)*b;score.set(bi,(score.get(bi)||0)+w);}}
  norm.normalize();v.addScaledVector(norm,.014);v.toArray(position,i*3);norm.toArray(normal,i*3);const top=[...score].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=top.reduce((s,v)=>s+v[1],0)||1;top.forEach(([bi,w],j)=>{indices[i*4+j]=bi;weights[i*4+j]=w/sum;});
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(position,3));g.setAttribute('normal',new T.BufferAttribute(normal,3));g.setAttribute('uv',cloth.mesh.geometry.attributes.uv.clone());g.setAttribute('skinIndex',new T.BufferAttribute(indices,4));g.setAttribute('skinWeight',new T.BufferAttribute(weights,4));g.setIndex(cloth.mesh.geometry.index.clone());
 const mesh=new T.SkinnedMesh(g,cloth.mesh.material);mesh.name='Skinned '+cloth.style.name;mesh.position.copy(source.position);mesh.quaternion.copy(source.quaternion);mesh.scale.copy(source.scale);mesh.bindMode=source.bindMode;mesh.bind(source.skeleton,source.bindMatrix);mesh.frustumCulled=false;mesh.castShadow=mesh.receiveShadow=true;mesh.userData.cloth=cloth;source.parent.add(mesh);mesh.visible=false;
 const api={mesh,active:false,version:cloth.mesh.geometry.index,
  set(active){active=!!active&&!cloth.hold&&!cloth.detached&&!!cloth.actor&&cloth.faces.length>0;
   if(this.version!==cloth.mesh.geometry.index){g.setIndex(cloth.mesh.geometry.index.clone());this.version=cloth.mesh.geometry.index;}
   if(this.active&&!active&&cloth.actor){mesh.updateWorldMatrix(true,false);mesh.skeleton.update();for(let i=0;i<n;i++){mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld);cloth.p[i].copy(v);cloth.prev[i].copy(v);}cloth.acc=0;cloth.sync();}
   this.active=active;mesh.visible=active;cloth.mesh.visible=!active&&cloth.faces.length>0;
  },dispose(){mesh.removeFromParent();g.dispose();}
 };return api;
}
