import * as T from 'three';

/** Curved iris, limbal ring and derivative-filtered radial pigment in one draw. */
export function petEye(model,side){
  const b=model.breed,cat=model.species==='cat',hx=b.head[0],hc=b.headCenter,center=new T.Vector3(side*hx*(cat?.56:.67),hc[1]+.009,hc[2]+b.head[2]*(cat?.78:.74)),r=cat?.023:.018,angle=side*(cat?.23:.32);
  if(!model.h6EyeMaterial){const mat=new T.MeshPhysicalMaterial({color:b.eye,roughness:.34,clearcoat:1,clearcoatRoughness:.055});mat.name='Pet layered iris';mat.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 petEyeUV;').replace('#include <begin_vertex>','#include <begin_vertex>\npetEyeUV=uv;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 petEyeUV;').replace('#include <color_fragment>',`#include <color_fragment>
    vec2 ep=(petEyeUV-.5)*2.;float er=length(ep);float ea=atan(ep.y,ep.x);float aa=max(fwidth(er),.004);
    float fibers=sin(ea*73.+sin(ea*19.)*2.+er*15.)*.14+sin(ea*137.-er*26.)*.08;
    float ring=1.-smoothstep(.84,.99,er);float pupil=length(ep/vec2(${cat?'.27,.64':'.48,.48'}));
    vec3 pigment=diffuseColor.rgb*(.82+fibers)*mix(.55,1.,smoothstep(.2,.6,er));
    pigment=mix(vec3(.006,.004,.003),pigment,smoothstep(1.-aa*3.,1.+aa*3.,pupil));diffuseColor.rgb=mix(vec3(.024,.019,.016),pigment,ring);
  `);};mat.customProgramCacheKey=()=> 'h6-pet-iris-'+cat;model.materials.add(mat);model.h6EyeMaterial=mat;}
  const pos=[],uv=[],indices=[],radial=8,angular=48;for(let j=0;j<=radial;j++){const rr=j/radial;for(let k=0;k<=angular;k++){const a=k/angular*Math.PI*2,x=Math.cos(a)*rr,y=Math.sin(a)*rr;pos.push(x*r,y*r*.79,.005*(1-rr*rr));uv.push(x*.5+.5,y*.5+.5);if(j<radial&&k<angular){const n=j*(angular+1)+k;indices.push(n,n+angular+1,n+1,n+1,n+angular+1,n+angular+2);}}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.rotateY(angle);g.translate(center.x,center.y,center.z);g.computeVertexNormals();model.skin(g,'Head');const mesh=model.mesh('anatomical_eye',g,model.h6EyeMaterial);mesh.castShadow=false;
  const pts=[];for(let i=0;i<=40;i++){const a=i/40*Math.PI*2,local=new T.Vector3(Math.cos(a)*r*1.04,Math.sin(a)*r*.79,0).applyAxisAngle(new T.Vector3(0,1,0),angle);pts.push(center.clone().add(local).toArray());}model.tube('eyelid',pts,pts.map(()=>cat?.0018:.002),'Head',model.rimMaterial,5);
}
