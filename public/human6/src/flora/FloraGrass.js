import * as T from 'three';
export function clumpGeometry(){
 const p=[],uv=[],idx=[];
 for(let blade=0;blade<4;blade++){const a=blade*2.399,h=.18+(blade%3)*.055,ox=Math.cos(a)*.024,oz=Math.sin(a)*.024,side=new T.Vector3(Math.cos(a),0,Math.sin(a));
  const start=p.length/3;for(let j=0;j<=3;j++){const t=j/3,y=t*h,w=.021*(1-t*.88),bend=t*t*.055;for(const s of [-1,1]){p.push(ox+side.x*w*s-Math.sin(a)*bend,y,oz+side.z*w*s+Math.cos(a)*bend);uv.push((s+1)/2,t);}}
  for(let j=0;j<3;j++){const i=start+j*2;idx.push(i,i+1,i+2,i+1,i+3,i+2);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
export class FloraGrass {
 constructor(env){this.env=env;this.limit=env.quest?1800:4000;this.clock={value:0};const m=env.material({map:env.maps.grass_albedo,color:0xb2c692,roughness:.89,side:T.DoubleSide,alphaHash:true,alphaTest:.24});
  m.userData.floraTexture='grass_albedo';m.onBeforeCompile=s=>{s.uniforms.floraTime=this.clock;s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nuniform float floraTime;').replace('#include <begin_vertex>',`#include <begin_vertex>
 vec3 floraBase=(modelMatrix*instanceMatrix*vec4(0.0,0.0,0.0,1.0)).xyz;
 float floraTip=clamp(position.y/.26,0.0,1.0);float floraWind=sin(floraTime*1.6+dot(floraBase.xz,vec2(.73,1.19)))*.04*floraTip*floraTip;
 transformed.x+=floraWind;transformed.z+=floraWind*.38;`);};m.customProgramCacheKey=()=> 'mira-flora-wind-12.2';
  this.mesh=new T.InstancedMesh(env.geometry(clumpGeometry()),m,this.limit);this.mesh.name='Flora grass clumps';this.mesh.castShadow=false;this.mesh.receiveShadow=true;env.root.add(this.mesh);this.available=0;const dummy=new T.Object3D(),color=new T.Color();
  for(let attempts=0;attempts<this.limit*9&&this.available<this.limit;attempts++){const a=env.random()*Math.PI*2,r=Math.sqrt(env.random())*8.1,x=Math.cos(a)*r,z=Math.sin(a)*r;if(env.name==='Beach'&&z<-7.5)continue;if(env.blocked(x,z,.045))continue;
   // Non-uniform patches with open soil between them, all roots on the sampled bed.
   if(Math.sin(x*1.3+Math.cos(z))*.5+Math.sin(z*1.7)*.25<-.52)continue;const h=env.floor(x,z),s=.7+env.random()*.6;dummy.position.set(x,h-.004,z);dummy.rotation.set(0,env.random()*Math.PI*2,0);dummy.scale.set(s,s*(env.name==='Beach'?.72:1),s);dummy.updateMatrix();this.mesh.setMatrixAt(this.available,dummy.matrix);color.setHSL(.21+env.random()*.045,.27+env.random()*.18,.40+env.random()*.09);this.mesh.setColorAt(this.available,color);this.available++;}
  this.mesh.instanceMatrix.needsUpdate=true;if(this.mesh.instanceColor)this.mesh.instanceColor.needsUpdate=true;this.mesh.computeBoundingSphere();this.setDensity(env.density);
 }
 setDensity(value){this.mesh.count=Math.min(this.available,Math.round(this.limit*value*(this.env.name==='Beach'?.30:1)));this.mesh.visible=this.mesh.count>0;}
 tick(time){this.clock.value=time;}
}
