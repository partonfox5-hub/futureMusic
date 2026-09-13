import * as T from 'three';

const gauss=(x,c,r)=>Math.exp(-(((x-c)/r)**2));
/** Breed bind-space sculpt: preserve the original skeleton, skinning and identity. */
export function refinePetSurface(model,g){
  const b=model.breed,cat=model.species==='cat',p=g.attributes.position,h=b.headCenter,r=b.head;
  // Smooth the quantized field mesh before sculpting its anatomical landmarks.
  const neighbors=Array.from({length:p.count},()=>new Set()),indices=g.index;
  for(let i=0;i<indices.count;i+=3){const a=indices.getX(i),b=indices.getX(i+1),c=indices.getX(i+2);neighbors[a].add(b).add(c);neighbors[b].add(a).add(c);neighbors[c].add(a).add(b);}
  const smoothed=new Float32Array(p.array.length);for(let pass=0;pass<3;pass++){for(let i=0;i<p.count;i++){const adjacent=neighbors[i];for(let k=0;k<3;k++){let sum=0;for(const j of adjacent)sum+=p.array[j*3+k];smoothed[i*3+k]=T.MathUtils.lerp(p.array[i*3+k],sum/Math.max(1,adjacent.size),.36);}}p.array.set(smoothed);}

  for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i),ax=Math.abs(x),sign=Math.sign(x);
    const head=gauss(y,h[1],r[1]*1.2)*gauss(z,h[2],r[2]*1.4);
    // Eye sockets, brow ridge, nasal stop and cheek planes break the spherical face.
    const orbit=gauss(ax,r[0]*.70,.027)*gauss(y,h[1]+.01,.023)*gauss(z,h[2]+r[2]*.82,.042);
    z-=orbit*(cat?.003:.004);z+=gauss(ax,r[0]*.67,.030)*gauss(y,h[1]+.044,.016)*gauss(z,h[2]+r[2]*.70,.05)*.006;
    x+=sign*gauss(y,h[1]-.035,.032)*gauss(z,h[2]+.015,.08)*head*(cat?.008:.004);
    z-=gauss(x,0,.04)*gauss(y,h[1]+.01,.023)*gauss(z,b.muzzleCenter[2]-.025,.055)*.005;
    if(!cat&&y>h[1]+.025)y-=Math.max(0,y-h[1]-.025)*.24*head;
    if(cat&&b.coat==='blue'){const bulk=T.MathUtils.smoothstep(y,.18,.33)*(1-T.MathUtils.smoothstep(y,.50,.65))*(1-T.MathUtils.smoothstep(z,.18,.29));x*=1+.38*bulk;y-=bulk*gauss(y,.33,.08)*.014;}
    // Rib cage narrows into the waist; scapulae and haunches stay rounded.
    const torso=gauss(y,.46,.17);x*=1-torso*gauss(z,-.07,.11)*(cat?.025:.06);
    // Smooth the abdomen into the pelvis; a tucked waist must not expose a ball joint.
    const flank=gauss(z,-.17,.10)*gauss(y,.36,.10);x*=1+flank*(cat?.20:.10);
    if(cat)y-=gauss(z,.23,.12)*gauss(y,.58,.06)*.012;
    x+=sign*gauss(ax,.11,.06)*gauss(y,.46,.13)*(gauss(z,.18,.08)+gauss(z,-.25,.09))*.009;
    if(cat){y-=gauss(z,-.025,.28)*gauss(y,.59,.06)*.018;}
    // Four softly separated toes, weighted to each original paw bone.
    if(y<.10){const paw=Math.max(gauss(z,.275,.09),gauss(z,-.30,.09));z+=paw*gauss(y,.05,.038)*(.0015+.0025*Math.cos((ax-.115)*230));}
    p.setXYZ(i,x,y,z);
  }p.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();model.h6Anatomy=true;
}

/** Compress the long canine lower-leg proportions in every cat mesh and bind bone. */
export function fitCatSkeleton(model){
  const cat=model.species==='cat',strength=cat?(model.breed.coat==='points'?.20:.37):0;
  const fit=(x,y,z,out)=>{const neck=T.MathUtils.smoothstep(y,.51,.70),face=T.MathUtils.smoothstep(z,.43,.55);return out.set(x,y-strength*T.MathUtils.clamp(y-.08,0,.35)-neck*(cat?.026:.047),z*(cat?1.04:1)+(!cat?face*.025:0));};
  const temp=new T.Vector3(),geometries=new Set();
  model.root.traverse(mesh=>{if(!mesh.isSkinnedMesh||geometries.has(mesh.geometry))return;geometries.add(mesh.geometry);const g=mesh.geometry,p=g.attributes.position;
    for(let i=0;i<p.count;i++){fit(p.getX(i),p.getY(i),p.getZ(i),temp);p.setXYZ(i,temp.x,temp.y,temp.z);}
    // Relative ear morphs are above the compressed lower legs; only depth changes.
    for(const a of g.morphAttributes.position||[])for(let i=0;i<a.count;i++)a.setZ(i,a.getZ(i)*(cat?1.04:1));
    p.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();
  });
  const oldHead=model.bind.Head.clone();
  if(model.muzzleOffset){temp.copy(oldHead).add(model.muzzleOffset);fit(temp.x,temp.y,temp.z,temp);model.muzzleOffset.copy(temp);}
  for(const p of Object.values(model.bind))fit(p.x,p.y,p.z,p);
  for(const [name,bone]of Object.entries(model.bones)){bone.position.copy(model.bind[name]);if(model.bind[bone.parent?.name])bone.position.sub(model.bind[bone.parent.name]);}
  model.muzzleOffset?.sub(model.bind.Head);model.root.updateMatrixWorld(true);model.skeleton.calculateInverses();model.h6CatProportions=cat;model.h6AnatomicalBind=true;
}

/** A single skinned guard-hair draw, shared skin weights with the visible coat. */
export function buildGuardHair(model){
  const src=model.body.geometry,p=src.attributes.position,n=src.attributes.normal,idx=src.index,sw=src.attributes.skinWeight,si=src.attributes.skinIndex,col=src.attributes.color;
  const count=model.species==='cat'?12000:10000,positions=[],normals=[],uv=[],colors=[],joints=[],weights=[],fur=[];let seed=72341;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;};
  const a=new T.Vector3(),normal=new T.Vector3(),tangent=new T.Vector3(),across=new T.Vector3(),v=new T.Vector3();
  // Sample by surface area, so dense facial topology does not steal the torso groom.
  const areas=new Float32Array(idx.count/3),edge=new T.Vector3(),other=new T.Vector3();let total=0;
  for(let f=0;f<areas.length;f++){a.fromBufferAttribute(p,idx.getX(f*3));edge.fromBufferAttribute(p,idx.getX(f*3+1)).sub(a);other.fromBufferAttribute(p,idx.getX(f*3+2)).sub(a);total+=edge.cross(other).length()*.5;areas[f]=total;}
  for(let k=0;k<count;k++){const sample=rand()*total;let lo=0,hi=areas.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(areas[mid]<sample)lo=mid+1;else hi=mid;}const face=lo,ids=[idx.getX(face*3),idx.getX(face*3+1),idx.getX(face*3+2)],u=Math.sqrt(rand()),bary=[1-u,u*(1-rand()),0];bary[2]=1-bary[0]-bary[1];a.setScalar(0);normal.setScalar(0);const rgb=[0,0,0],blend=new Map();
    for(let j=0;j<3;j++){a.addScaledVector(v.fromBufferAttribute(p,ids[j]),bary[j]);normal.addScaledVector(v.fromBufferAttribute(n,ids[j]),bary[j]);for(let c=0;c<3;c++)rgb[c]+=col.array[ids[j]*3+c]*bary[j];for(let c=0;c<4;c++){const bone=si.array[ids[j]*4+c];blend.set(bone,(blend.get(bone)||0)+sw.array[ids[j]*4+c]*bary[j]);}}
    // Facial coat stays close to the skin; silhouette fins belong on the body.
    if(a.z>.285&&a.y>(model.species==='cat'?.45:.62))continue;
    normal.normalize();const list=[...blend].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=list.reduce((s,r)=>s+r[1],0)||1;
    const shortFace=a.y>(model.species==='cat'?.50:.65)||a.y<.12,length=(.002+rand()*.007)*model.breed.fur*(shortFace?.28:1),width=(.00030+rand()*.0004)*model.breed.fur;
    tangent.set(a.x*.12,-.4,-.9).addScaledVector(normal,-normal.dot(v.set(a.x*.12,-.4,-.9))).normalize();across.crossVectors(normal,tangent).normalize();
    for(const [s,t]of [[-1,0],[1,0],[-1,.5],[-1,.5],[1,0],[1,.5],[-1,.5],[1,.5],[0,1]]){v.copy(a).addScaledVector(normal,length*t*.7).addScaledVector(tangent,length*t*t*.7).addScaledVector(across,s*width*(1-t*.85));positions.push(...v.toArray());normals.push(normal.x,normal.y,normal.z);uv.push((s+1)*.5,t);colors.push(...rgb);fur.push(1);for(let c=0;c<4;c++){joints.push(list[c]?.[0]||0);weights.push((list[c]?.[1]||0)/sum);}}
  }
  const g=new T.BufferGeometry();for(const [name,data,size]of [['position',positions,3],['normal',normals,3],['uv',uv,2],['color',colors,3],['skinWeight',weights,4],['dogFurLength',fur,1]])g.setAttribute(name,new T.Float32BufferAttribute(data,size));g.setAttribute('skinIndex',new T.Uint16BufferAttribute(joints,4));
  const mat=new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide,alphaTest:.5,alphaToCoverage:true});mat.name='H6_GuardHair';mat.onBeforeCompile=s=>{s.uniforms.h6HairCoat={value:model.h6CoatTexture};s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 h6HairUV;varying vec3 h6HairRest;').replace('#include <begin_vertex>','#include <begin_vertex>\nh6HairUV=uv;h6HairRest=position;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 h6HairUV;varying vec3 h6HairRest;uniform sampler2D h6HairCoat;').replace('#include <alphatest_fragment>','if(abs(dot(normalize(vNormal),normalize(vViewPosition)))>.46)discard;float hairWidth=abs(h6HairUV.x-.5)*2.;if(hairWidth>1.-h6HairUV.y*.5)discard;vec3 coat=texture2D(h6HairCoat,vec2(h6HairRest.z*2.2+h6HairRest.x*.8,h6HairRest.y*2.8)).rgb;diffuseColor.rgb*=.89+h6HairUV.y*.06;float projected=length(fwidth(h6HairUV));if(projected>1.2)discard;');};mat.customProgramCacheKey=()=> 'h6-pet-guard-hair';model.materials.add(mat);const mesh=model.mesh('guard_hair',g,mat);mesh.castShadow=false;mesh.userData.h6GuardHair=true;return mesh;
}
