import * as THREE from 'three';
const V=()=>new THREE.Vector3();
const landmarks=[
 [[-.04842627,1.512048,.07326356],[-.01385653,1.513815,.08413012],[-.03068605,1.519135,.08106538],[-.03244476,1.507449,.08035913]],
 [[.04856252,1.511613,.07291369],[.01561538,1.515662,.08358459],[.03258345,1.518444,.08030942],[.03076435,1.506600,.08014513]]
];
/** Socket details follow the actual morphed skin, not fixed planes across the iris.
 * Two thin ribbon draws cover both eyes. Eight skin samples per update.
 */
export class EyeFinish {
 constructor(actor){
  this.actor=actor;this.mode=actor.eyeDetail||'advanced';this.sides=[];this.ready=false;
  this.skin=actor.skinMeshes?.find(m=>/Skin_Head/.test(m.material?.name));if(!this.skin)return;
  const base=actor.deform?.find(d=>d.position===this.skin.geometry.attributes.position)?.base||this.skin.geometry.attributes.position.array;
  this.indices=landmarks.map(points=>points.map(p=>{let best=Infinity,index=0;for(let i=0;i<base.length;i+=3){const d=(base[i]-p[0])**2+(base[i+1]-p[1])**2+(base[i+2]-p[2])**2;if(d<best){best=d;index=i/3;}}return index;}));
  this.group=new THREE.Group();this.group.name='MiraEyeFinish';actor.bones.Head.add(this.group);this.inverse=new THREE.Matrix4();this.p=V();this.q=V();this.control=V();this.points=landmarks.map(()=>Array.from({length:4},V));
  const build=(ribbons,material)=>{const p=new Float32Array(ribbons*17*2*3),uv=[],ids=[];for(let r=0;r<ribbons;r++)for(let j=0;j<=16;j++)for(let k=0;k<2;k++){uv.push(j/16,k);if(j<16&&k===0){const a=r*34+j*2;ids.push(a,a+1,a+2,a+1,a+3,a+2);}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3).setUsage(THREE.DynamicDrawUsage));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ids);const m=new THREE.Mesh(g,material);m.frustumCulled=false;m.castShadow=m.receiveShadow=false;this.group.add(m);return m;};
  const occ=new THREE.ShaderMaterial({name:'Fitted eyelid contact shade',side:THREE.DoubleSide,transparent:true,depthWrite:false,uniforms:{},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;void main(){float a=(1.-vUv.y)*.20*smoothstep(0.,.12,vUv.x)*(1.-smoothstep(.88,1.,vUv.x));gl_FragColor=vec4(.028,.018,.013,a);}'});
  this.occ=build(4,occ);this.occ.renderOrder=3;
  this.tear=build(2,new THREE.MeshPhysicalMaterial({name:'Fitted lower tear meniscus',color:0x69574c,roughness:.13,metalness:0,ior:1.336,specularIntensity:1,clearcoat:0,transparent:true,opacity:.32,depthWrite:false,side:THREE.DoubleSide,envMapIntensity:.75}));this.tear.renderOrder=4;
  actor.root.updateWorldMatrix(true,true);this.skin.skeleton.update();this.ready=true;this.tick();
 }
 setMode(mode){this.mode=mode==='classic'?'classic':'advanced';if(this.group)this.group.visible=this.mode==='advanced'&&!this.actor.headMissing;}
 tick(){
  if(!this.ready)return;this.group.visible=this.mode==='advanced'&&!this.actor.headMissing;if(!this.group.visible)return;
  this.group.updateWorldMatrix(true,false);this.skin.updateWorldMatrix(true,false);this.inverse.copy(this.group.matrixWorld).invert();
  const occ=this.occ.geometry.attributes.position,tear=this.tear.geometry.attributes.position;
  const {p,q,control}=this;
  for(let side=0;side<2;side++){
   const points=this.points[side];for(let j=0;j<4;j++)this.skin.getVertexPosition(this.indices[side][j],points[j]).applyMatrix4(this.skin.matrixWorld).applyMatrix4(this.inverse);
   const [a,b,upper,lower]=points;
   for(let lid=0;lid<2;lid++){
    const mid=lid?lower:upper;control.copy(mid).multiplyScalar(2).addScaledVector(a,-.5).addScaledVector(b,-.5);
    for(let j=0;j<=16;j++){const t=j/16,width=Math.sin(Math.PI*t),u=1-t;p.copy(a).multiplyScalar(u*u).addScaledVector(control,2*u*t).addScaledVector(b,t*t);p.z+=.00028;
     for(let k=0;k<2;k++){q.copy(p);q.y+=(lid?1:-1)*k*.00075*width;q.toArray(occ.array,((side*2+lid)*34+j*2+k)*3);if(lid){q.copy(p);q.y+=(k-.5)*.00032*width;q.z+=.00008;q.toArray(tear.array,(side*34+j*2+k)*3);}}
    }
   }
  }
  occ.needsUpdate=true;tear.needsUpdate=true;this.tear.geometry.computeVertexNormals();
 }
 dispose(){if(!this.ready)return;for(const m of [this.occ,this.tear]){m.geometry.dispose();m.material.dispose();}this.group.removeFromParent();this.ready=false;}
}
export {EyeFinish as EnhanceEyes};
