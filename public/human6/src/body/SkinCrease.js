import * as T from 'three';
// Extends the installed V2 Standard shader. Existing UVs, albedo, normals,
// surface-guide deformation and one-pass lighting remain owned by the host.
export class SkinCrease {
 constructor(actor,face,loadMap){this.actor=actor;this.face=face;this.map=loadMap('head_wrinkle.jpg',false);this.headWrap={value:new T.Vector3(.34,.115,.055)};this.bodyWrap={value:new T.Vector3(.23,.075,.035)};this.poreStrength={value:.000075};this.wrinkleStrength={value:.00032};this.materials=new Map();this.install();}
 install(){
  this.actor.root.traverse(mesh=>{if(!mesh.isMesh)return;for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
   if(!/Skin_/.test(material?.name))continue;const current=material.onBeforeCompile;if(current?.miraCreaseOwner===this)return;
   const head=/Head/.test(material.name),priorKey=material.customProgramCacheKey,prior=current;
   const hook=shader=>{
    prior?.(shader);
    shader.uniforms.miraCrease=this.face.crease;shader.uniforms.miraWrinkleMap={value:this.map};shader.uniforms.miraWrap=head?this.headWrap:this.bodyWrap;shader.uniforms.miraPoreStrength=this.poreStrength;shader.uniforms.miraWrinkleStrength=this.wrinkleStrength;
    shader.fragmentShader=`uniform float miraCrease; uniform sampler2D miraWrinkleMap; uniform vec3 miraWrap; uniform float miraPoreStrength; uniform float miraWrinkleStrength;\n`+shader.fragmentShader;
    // Remove the old albedo detail gain. Pores become tiled micro-height only.
    shader.fragmentShader=shader.fragmentShader.replace(/vec3 blendN=pow\(abs\(normalize\(v2RestNormal\)\),vec3\(4\.0\)\);[\s\S]*?diffuseColor\.rgb\*=mix\(vec3\(1\.0\),detailGain,v2DetailAmount\);/,'');
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
     float miraCavity=${head?'clamp((1.0-texture2D(miraWrinkleMap,vMapUv).r)*8.0,0.0,1.0)':'0.0'};`);
    // The host's region roughness code follows roughnessmap_fragment. Apply the
    // final crease adjustment later, just before normal construction.
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
     vec3 miraBlend=pow(abs(normalize(v2RestNormal)),vec3(4.0));miraBlend/=max(dot(miraBlend,vec3(1.0)),.0001);
     vec3 miraCoord=v2RestPos*12.5;
     vec3 miraDetail=texture2D(v2DetailMap,miraCoord.yz).rgb*miraBlend.x+texture2D(v2DetailMap,miraCoord.xz).rgb*miraBlend.y+texture2D(v2DetailMap,miraCoord.xy).rgb*miraBlend.z;
     float miraHeight=dot(miraDetail,vec3(.299,.587,.114))*miraPoreStrength-miraCavity*miraCrease*miraWrinkleStrength;
     vec3 miraDx=-dFdx(vViewPosition),miraDy=-dFdy(vViewPosition),miraR1=cross(miraDy,normal),miraR2=cross(normal,miraDx);
     float miraDet=dot(miraDx,miraR1);
     vec3 miraGradient=sign(miraDet)*(dFdx(miraHeight)*miraR1+dFdy(miraHeight)*miraR2);
     normal=normalize(max(abs(miraDet),1e-10)*normal-miraGradient);
     roughnessFactor=max(.28,roughnessFactor-miraCavity*miraCrease*.035);`);
    shader.fragmentShader=shader.fragmentShader.replace(/vec3 skinWrap\s*=\s*vec3\(\s*0\.28,\s*0\.12,\s*0\.06\s*\);/,`float miraEdge=pow(1.0-abs(dot(geometryNormal,geometryViewDir)),2.0);
     float miraThin=${head?'max(smoothstep(.057,.083,abs(v2RestPos.x)),max((1.0-smoothstep(.010,.028,abs(v2RestPos.x)))*smoothstep(.022,.055,v2RestPos.z), (1.0-smoothstep(.010,.025,abs(v2RestPos.y-1.53)))*smoothstep(.005,.026,v2RestPos.z)))':'0.15'};
     vec3 skinWrap=miraWrap*(.80+.30*miraEdge*clamp(miraThin,0.0,1.0));`);
   };
   hook.miraCreaseOwner=this;material.onBeforeCompile=hook;material.customProgramCacheKey=()=> (priorKey?.call(material)||'')+'|mira-crease-1-'+(head?'head':'body');material.needsUpdate=true;this.materials.set(material,{prior,priorKey,hook});
  }});
 }
 dispose(){for(const [m,r] of this.materials)if(m.onBeforeCompile===r.hook){m.onBeforeCompile=r.prior;m.customProgramCacheKey=r.priorKey;m.needsUpdate=true;}this.materials.clear();/* loadMap texture is shared host cache; do not dispose it. */}
}
