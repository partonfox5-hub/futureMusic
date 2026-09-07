import * as T from 'three';
// Corneal clearcoat, iris parallax and pupil remapping on the existing bulged
// cornea geometry. No additive white shell and no scene-wide transmission pass.
export class LivingEyes {
 constructor(actor,loadMap,mode='advanced'){
  this.actor=actor;this.pupil={value:.048};this.illumination=.6;this.shells=[];this.entries=[];this.lightTime=0;
  actor.root.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;
   const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
   for(let index=0;index<materials.length;index++){
    const old=materials[index],name=old?.name||'';if(!/^Std_(Eye|Cornea)_[LR]$/.test(name))continue;
    const cornea=/Cornea/.test(name),entry={mesh,index,array:Array.isArray(mesh.material),original:old,originalVisible:old.visible,cornea};
    if(cornea){
     const side=name.endsWith('_L')?'l':'r',m=new T.MeshPhysicalMaterial({name,color:0xffffff,map:loadMap('eye_'+side+'.jpg',true),normalMap:loadMap('eye_'+side+'_n.jpg',false),normalScale:new T.Vector2(.09,.09),roughness:.43,metalness:0,ior:1.336,specularIntensity:.22,clearcoat:1,clearcoatRoughness:.045,envMapIntensity:1.05});
     m.userData.livingEye=true;m.customProgramCacheKey=()=> 'mira-living-eye-r11';m.onBeforeCompile=shader=>this.shader(shader);entry.advanced=m;this.shells.push(mesh);
    }
    this.entries.push(entry);
   }
  });this.setMode(mode);
 }
 setMode(mode){
  this.mode=mode==='classic'?'classic':'advanced';
  for(const entry of this.entries){const {mesh,index,array,original,advanced,cornea}=entry;
   const material=this.mode==='advanced'&&cornea?advanced:original;
   original.visible=this.mode==='advanced'&&!cornea?false:entry.originalVisible;
   if(array)mesh.material[index]=material;else mesh.material=material;
   mesh.visible=true;mesh.castShadow=mesh.receiveShadow=false;material.needsUpdate=true;
  }
 }
 disposeInactive(){for(const e of this.entries){if(e.cornea)(this.mode==='advanced'?e.original:e.advanced).dispose();}}
 sampleLight(){
  let scene=this.actor.group||this.actor.root;while(scene.parent)scene=scene.parent;
  const position=this.actor.bones?.Head?.getWorldPosition(new T.Vector3())||this.actor.root.getWorldPosition(new T.Vector3());
  let energy=scene.environment?.isTexture?(scene.environmentIntensity??1)*.25:0;
  scene.traverseVisible(o=>{if(!o.isLight||!(o.intensity>0))return;const luminance=o.color?o.color.r*.2126+o.color.g*.7152+o.color.b*.0722:1;
   let weight=o.isAmbientLight?1:o.isHemisphereLight?.5:o.isLightProbe?.35:o.isDirectionalLight?.4:0;
   if(o.isPointLight||o.isSpotLight){const d=o.getWorldPosition(new T.Vector3()).distanceTo(position);weight=1/Math.max(1,d*d);if(o.distance>0)weight*=Math.pow(Math.max(0,1-Math.pow(d/o.distance,4)),2);}
   energy+=luminance*o.intensity*weight;
  });this.illumination=T.MathUtils.clamp(energy/(1+energy),0,1);
 }
 shader(s){s.uniforms.miraPupil=this.pupil;s.fragmentShader='uniform float miraPupil;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
  vec2 eyeUv=vMapUv,du=dFdx(eyeUv),dv=dFdy(eyeUv);vec3 dp=dFdx(-vViewPosition),dq=dFdy(-vViewPosition);float determinant=du.x*dv.y-du.y*dv.x;vec2 shift=vec2(0.0);
  if(abs(determinant)>1e-10){vec3 tu=(dp*dv.y-dq*du.y)/determinant,tv=(dq*du.x-dp*dv.x)/determinant,viewDir=normalize(vViewPosition);float depth=.00075/max(.35,abs(dot(viewDir,normalize(vNormal))));shift=-depth*vec2(dot(viewDir,tu)/max(dot(tu,tu),1e-7),dot(viewDir,tv)/max(dot(tv,tv),1e-7));shift=clamp(shift,vec2(-.014),vec2(.014));}
  eyeUv+=shift*(1.0-smoothstep(.115,.145,length(eyeUv-.5)));vec2 radial=eyeUv-.5;float radius=length(radial),sampleRadius=radius;
  if(radius<.132)sampleRadius=radius<miraPupil?radius*.048/miraPupil:.048+(radius-miraPupil)*(.132-.048)/(.132-miraPupil);
  vec4 eyeTexel=texture2D(map,.5+radial*sampleRadius/max(radius,1e-6));float limbus=smoothstep(.106,.124,radius)*(1.0-smoothstep(.129,.146,radius));eyeTexel.rgb*=1.0-.24*limbus;diffuseColor*=eyeTexel;
 #endif`);}
 tick(dt,time){
  if(this.mode!=='advanced')return;this.lightTime-=dt;if(this.lightTime<=0){this.sampleLight();this.lightTime=.25;}
  const target=T.MathUtils.clamp(.060-this.illumination*.032+(this.actor.emotion?.arousal||0)*.002+Math.sin(time*.71+this.actor.seed)*.00045,.028,.061);
  this.pupil.value=T.MathUtils.damp(this.pupil.value,target,1.8,dt);
 }
}
