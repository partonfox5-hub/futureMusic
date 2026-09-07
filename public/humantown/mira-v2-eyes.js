import * as T from 'three';
// Corneal clearcoat, iris parallax and pupil remapping on the existing bulged
// cornea geometry. No additive white shell and no scene-wide transmission pass.
export class LivingEyes {
 constructor(actor,loadMap){this.actor=actor;this.pupil={value:.048};this.illumination=.6;this.shells=[];
  actor.root.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const name=mesh.material?.name;if(/^Std_Eye_[LR]$/.test(name))mesh.visible=false;if(!/^Std_Cornea_[LR]$/.test(name))return;
   const side=name.endsWith('_L')?'l':'r',old=mesh.material,m=new T.MeshPhysicalMaterial({name,color:0xffffff,map:loadMap('eye_'+side+'.jpg',true),normalMap:loadMap('eye_'+side+'_n.jpg',false),normalScale:new T.Vector2(.09,.09),roughness:.43,metalness:0,ior:1.336,specularIntensity:.22,clearcoat:1,clearcoatRoughness:.045,envMapIntensity:1.05});
   m.userData.livingEye=true;m.customProgramCacheKey=()=> 'mira-living-eye-r9';m.onBeforeCompile=s=>this.shader(s);mesh.material=m;old.dispose();mesh.castShadow=mesh.receiveShadow=false;this.shells.push(mesh);
  });
 }
 shader(s){s.uniforms.miraPupil=this.pupil;s.fragmentShader='uniform float miraPupil;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
  vec2 eyeUv=vMapUv,du=dFdx(eyeUv),dv=dFdy(eyeUv);vec3 dp=dFdx(-vViewPosition),dq=dFdy(-vViewPosition);float determinant=du.x*dv.y-du.y*dv.x;vec2 shift=vec2(0.0);
  if(abs(determinant)>1e-10){vec3 tu=(dp*dv.y-dq*du.y)/determinant,tv=(dq*du.x-dp*dv.x)/determinant,viewDir=normalize(vViewPosition);float depth=.00075/max(.35,abs(dot(viewDir,normalize(vNormal))));shift=-depth*vec2(dot(viewDir,tu)/max(dot(tu,tu),1e-7),dot(viewDir,tv)/max(dot(tv,tv),1e-7));shift=clamp(shift,vec2(-.014),vec2(.014));}
  eyeUv+=shift*(1.0-smoothstep(.115,.145,length(eyeUv-.5)));vec2 radial=eyeUv-.5;float radius=length(radial),sampleRadius=radius;
  if(radius<.132)sampleRadius=radius<miraPupil?radius*.048/miraPupil:.048+(radius-miraPupil)*(.132-.048)/(.132-miraPupil);
  vec4 eyeTexel=texture2D(map,.5+radial*sampleRadius/max(radius,1e-6));float limbus=smoothstep(.106,.124,radius)*(1.0-smoothstep(.129,.146,radius));eyeTexel.rgb*=1.0-.24*limbus;diffuseColor*=eyeTexel;
 #endif`);}
 tick(dt,time){const target=T.MathUtils.clamp(.054-this.illumination*.012+(this.actor.emotion?.arousal||0)*.003+Math.sin(time*.71+this.actor.seed)*.00045,.035,.060);this.pupil.value=T.MathUtils.damp(this.pupil.value,target,1.8,dt);}
}
