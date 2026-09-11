import * as T from 'three';
export function random(seed=1){let s=seed>>>0;return()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export const SPECIES=Object.freeze([
 {name:'Oak',kind:'oak',bark:0x71604a,leaf:0x577535,height:8,spread:3.1,branches:14,up:.36,deciduous:true},
 {name:'Silver birch',kind:'birch',bark:0xb8b5a4,leaf:0x719448,height:10,spread:2.2,branches:17,up:.62,deciduous:true},
 {name:'Scots pine',kind:'pine',bark:0x85604b,leaf:0x425c39,height:12,spread:2.8,branches:21,up:.13,deciduous:false},
 {name:'Aspen',kind:'aspen',bark:0x96977b,leaf:0x779148,height:9,spread:2.1,branches:16,up:.73,deciduous:true},
 {name:'Sugar maple',kind:'maple',bark:0x5a4030,leaf:0x3d6a2c,height:11,spread:3.8,branches:18,up:.48,deciduous:true},
 {name:'Weeping willow',kind:'willow',bark:0x7a6b52,leaf:0x8fb54a,height:9,spread:4.4,branches:20,up:-.42,deciduous:true}
]);
// Curved, tapered branch tubes and folded leaves; no downloaded assets or addons.
export function makeTreeGeometry(species=0,variant=0,lod=0){
 const sp=SPECIES[species],rnd=random(709+species*1057+variant*197),p=[],c=[],uv=[],tag=[],index=[],tips=[];
 const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),up=v(0,1,0),bark=new T.Color(sp.bark),green=new T.Color(sp.leaf);
 const vertex=(a,col,u=0,w=0,fol=0)=>{const i=p.length/3;p.push(a.x,a.y,a.z);c.push(col.r,col.g,col.b);uv.push(u,w);tag.push(fol);return i;};
 function branch(a,b,r0,r1,bend){
  const sides=lod===0?6:4,steps=lod===0?4:2,start=p.length/3,dir=b.clone().sub(a).normalize(),x=v(1,0,0).cross(dir).normalize();if(x.lengthSq()<.1)x.set(0,0,1);const z=dir.clone().cross(x).normalize();
  for(let j=0;j<=steps;j++){const t=j/steps,center=a.clone().lerp(b,t).addScaledVector(bend,Math.sin(t*Math.PI)),r=T.MathUtils.lerp(r0,r1,t);
   for(let k=0;k<sides;k++){const angle=k/sides*Math.PI*2,rr=r*(1+.09*Math.sin(k*7+j*.7));vertex(center.clone().addScaledVector(x,Math.cos(angle)*rr).addScaledVector(z,Math.sin(angle)*rr),bark.clone().multiplyScalar(.82+.18*Math.sin(angle+1)),k/sides,t,0);}
  }
  for(let j=0;j<steps;j++)for(let k=0;k<sides;k++){const a=start+j*sides+k,b=start+j*sides+(k+1)%sides;index.push(a,b,b+sides,a,b+sides,a+sides);}
 }
 function leaf(at,size,angle,tilt,col){
  const q=new T.Quaternion().setFromEuler(new T.Euler(tilt,angle,(rnd()-.5)*1.4)),start=p.length/3;
  if(kind==='maple'){
   const lobes=[[0,0,0,.5,0],[-.40,.26,0,0,.26],[-.70,.50,.05,0,.48],[-.24,.56,.11,.34,.54],[-.32,.90,.03,.28,.82],[0,1.16,.07,.5,1],[.32,.90,.03,.72,.82],[.24,.56,.11,.66,.54],[.70,.50,.05,1,.48],[.40,.26,0,1,.26]];
   for(const [x,y,z,u,w] of lobes)vertex(v(x*size,y*size,z*size).applyQuaternion(q).add(at),col,u,w,1);
   for(let i=1;i<lobes.length-1;i++)index.push(start,start+i,start+i+1);
   return;
  }
  const wide=kind==='willow'?.42:1,tall=kind==='willow'?1.55:1;
  // A central fold catches highlights and keeps the leaf visibly three-dimensional.
  for(const [x,y,z,u,w] of [[0,0,0,.5,0],[-.46,.43,0,0,.43],[0,.52,.10,.5,.52],[.46,.43,0,1,.43],[0,1,0,.5,1]])vertex(v(x*size*wide,y*size*tall,z*size).applyQuaternion(q).add(at),col,u,w,1);
  index.push(start,start+1,start+2,start,start+2,start+3,start+1,start+4,start+2,start+2,start+4,start+3);
 }
 function crown(center,radius){
  // Far crown lobes are opaque and cheap; a ragged surface retains silhouette.
  const g=new T.IcosahedronGeometry(1,0),a=g.attributes.position,start=p.length/3;
  for(let i=0;i<a.count;i++){const n=v().fromBufferAttribute(a,i),f=.84+.16*Math.sin(n.x*17+n.y*11+n.z*19);n.multiply(v(radius,radius*.72,radius)).multiplyScalar(f).add(center);vertex(n,green.clone().multiplyScalar(.73+.28*(n.y-center.y+radius)/(2*radius)),0,0,.45);}
  for(let i=0;i<a.count;i++)index.push(start+i);g.dispose();
 }
 const kind=sp.kind||'oak',pine=kind==='pine',oak=kind==='oak',maple=kind==='maple',willow=kind==='willow',birch=kind==='birch';
 const H=sp.height*(.91+rnd()*.18),lean=v((rnd()-.5)*.48,0,(rnd()-.5)*.48),trunkTop=lean.clone().add(v(0,H,0));
 branch(v(0,-.12,0),trunkTop,.15+((oak||maple)?.09:.02),.018,lean.clone().multiplyScalar(.7));
 const count=sp.branches;
 for(let i=0;i<count;i++){
  const t=(i+.6)/count,angle=i*2.399963+variant*.7+(rnd()-.5)*.8;
  const y=H*(pine?.26+t*.64:willow?.42+t*.50:.34+t*.52),a=lean.clone().multiplyScalar(y/H).add(v(0,y,0));
  const taper=pine?1-t*.8:maple?Math.sin(t*Math.PI*.85)*.78+.40:Math.sin(t*Math.PI*.78)*.65+.35;
  const length=sp.spread*taper*(.64+rnd()*.66),dir=v(Math.cos(angle),sp.up+(rnd()-.5)*(willow?.22:.45),Math.sin(angle)).normalize();
  const end=a.clone().addScaledVector(dir,length),bend=willow?v((rnd()-.5)*.22,-.62-rnd()*.40,(rnd()-.5)*.22):v((rnd()-.5)*.30,-.14-rnd()*.24,(rnd()-.5)*.30);
  tips.push(end.toArray());
  if(lod<2)branch(a,end,(.055+(1-t)*.055)*(oak||maple?1.2:.75),.009,bend);
  if(lod===2){if(i%2===0)crown(end.clone().add(v(0,willow?-.35:0,0)),(willow?.42:.57)+length*.22);continue;}
  const forks=lod===0?(maple?4:3):2;
  for(let j=0;j<forks;j++){
   const start=a.clone().lerp(end,.48+j*.17),az=angle+(j-1)*.65+(rnd()-.5)*.55;
   const twig=start.clone().add(v(Math.cos(az),pine?.10:willow?-.72:.48,Math.sin(az)).multiplyScalar(length*(.34+rnd()*.36)));
   if(lod===0)branch(start,twig,.018,.002,v(0,willow?-.55:birch?-.18:.10,0));
   tips.push(twig.toArray());
   if(willow&&lod===0){
    const hang=twig.clone().add(v((rnd()-.5)*.28,-length*(.75+rnd()*.7),(rnd()-.5)*.28));
    branch(twig,hang,.010,.002,v(0,-.28,0));tips.push(hang.toArray());
    for(let k=0;k<10;k++)leaf(twig.clone().lerp(hang,.1+rnd()*.9).add(v((rnd()-.5)*.12,0,(rnd()-.5)*.12)),.16*(.6+rnd()*.5),rnd()*Math.PI*2,1.1+(rnd()-.5)*.4,green.clone().multiplyScalar(.72+rnd()*.42));
   }
   const n=lod===0?(pine?18:maple?17:willow?12:15):5;
   for(let k=0;k<n;k++){
    const leafPos=start.clone().lerp(twig,.25+rnd()*.85).add(v((rnd()-.5)*.65,(rnd()-.5)*.47,(rnd()-.5)*.65));
    const size=(pine?.18:maple?.30:willow?.17:.25)*(lod===0?1:2.1)*(.65+rnd()*.7);
    leaf(leafPos,size,rnd()*Math.PI*2,willow?1.0+(rnd()-.5)*.8:(rnd()-.5)*2.4,green.clone().multiplyScalar(.72+rnd()*.42));
   }
  }
 }
 if(lod===2)crown(trunkTop.clone().add(v(0,-.4,0)),.65);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(p,3));geometry.setAttribute('color',new T.Float32BufferAttribute(c,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setAttribute('foliage',new T.Float32BufferAttribute(tag,1));geometry.setIndex(index);geometry.computeVertexNormals();geometry.computeBoundingSphere();geometry.boundingSphere.radius+=.35;
 geometry.userData={tips,height:H,triangles:index.length/3,species:sp.name,variant,lod};return geometry;
}
export function makeTreeMaterial(){
 const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.91,side:T.DoubleSide});
 material.userData.time={value:0};
 material.onBeforeCompile=s=>{
  s.uniforms.forestTime=material.userData.time;
  s.vertexShader='attribute float foliage; varying float vFoliage; varying vec2 vLeafUv; varying vec3 vBarkPos; uniform float forestTime;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vFoliage=foliage; vLeafUv=uv; vBarkPos=position;
   float treePhase=instanceMatrix[3].x*.19+instanceMatrix[3].z*.23;
   float sway=sin(forestTime*1.17+treePhase+position.y*.38)*.035;
   transformed.x+=sway*position.y*.15+foliage*sin(forestTime*3.2+position.x*4.0+treePhase)*.027;
   transformed.z+=foliage*cos(forestTime*2.5+position.z*5.0+treePhase)*.018;`);
  s.fragmentShader='varying float vFoliage; varying vec2 vLeafUv; varying vec3 vBarkPos;\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float vein=1.0-smoothstep(.015,.06,abs(vLeafUv.x-.5));
   float branchVein=pow(max(0.0,cos((vLeafUv.y-abs(vLeafUv.x-.5)*.65)*65.0)),12.0)*.10;
   float leafShade=.88+.10*vLeafUv.y+.07*vein-branchVein;
   float barkGroove=.89+.11*sin(vBarkPos.x*83.0+sin(vBarkPos.y*9.0)+vBarkPos.z*97.0);
   diffuseColor.rgb*=mix(barkGroove,leafShade,smoothstep(.5,.9,vFoliage));`);
 };
 material.customProgramCacheKey=()=> 'mira-forest-r1';return material;
}
