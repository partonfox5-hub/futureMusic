import * as T from 'three';
import {V,clamp,smooth,wrapMethod} from './human5-common.js?v=17.8.0';
import {installReferenceGroom} from './human5-groom.js?v=17.8.0';
import {weldSkinNormals} from './human5-skin.js?v=17.8.0';

export const REFERENCE_MIRA=Object.freeze({
  id:'mira-reference-17',name:'Mira',faceType:1,likeness:0,hairStyle:1,hairColor:1,
  shape:{height:1,waist:.91,hips:1.08,breast:1.86,butt:1.74,thigh:1.57,gap:-.08,arms:.94,jiggle:4.5,handResponse:12,breastHeight:-.12,breastSpacing:.04,breastAngle:.02,buttHeight:-.04,buttSpacing:.02,buttAngle:0,softness:.75,damping:.48,bodySoftness:.75,faceSoftness:.32,hairMotion:1,skinDetail:.35},
  sculpt:{jawWidth:.07,chinLength:.004,cheekFullness:.003,noseProjection:-.0015,browHeight:0,lipFullness:.0012,craniumWidth:-.02,eyeWidth:.045,eyeAperture:.10},
  physics:{tissueDensity:980,waterDrag:5,thighGravity:.55,spineFlexibility:.48,gaitVariation:.40,fluidBias:.075,muscleTone:.6,surfaceRipple:.0018},
  note:'Artist-fit approximation from supplied references. Photos do not establish exact body measurements or hidden skull geometry.'
});
export const IDENTITY_CONTROLS=[
  {key:'jawWidth',min:-.12,max:.12,value:-.055},{key:'chinLength',min:-.012,max:.012,value:-.008},
  {key:'cheekFullness',min:-.004,max:.006,value:.0025},{key:'noseProjection',min:-.004,max:.004,value:-.0015},
  {key:'browHeight',min:-.003,max:.003,value:.001},{key:'lipFullness',min:0,max:.002,value:.0012},
  {key:'craniumWidth',min:-.05,max:.05,value:-.02},
  {key:'eyeWidth',min:-.08,max:.10,value:.045},{key:'eyeAperture',min:-.12,max:.18,value:.10}
];
const bell=(x,center,width)=>Math.exp(-(((x-center)/width)**2));
export function identityWarp(x,y,z,s=REFERENCE_MIRA.sculpt){
  if(y<1.395)return [x,y,z];
  const front=smooth((z+.012)/.05),jaw=bell(y,1.431,.025),cheek=bell(y,1.483,.022),chin=bell(y,1.408,.014)*bell(x,0,.040);
  const eye=bell(Math.abs(x),.031,.022)*bell(y,1.513,.017)*front;
  const dx=x*((s.jawWidth||0)*jaw*front+(s.craniumWidth||0)*bell(y,1.615,.07))+(x-Math.sign(x)*.031)*(s.eyeWidth||0)*eye;
  const dy=(s.chinLength||0)*chin+(s.browHeight||0)*bell(y,1.545,.013)*front+(y-1.513)*(s.eyeAperture||0)*eye;
  const dz=(s.cheekFullness||0)*cheek*bell(Math.abs(x),.042,.028)*front+(s.noseProjection||0)*bell(x,0,.017)*bell(y,1.480,.021)*front+(s.lipFullness||0)*bell(x,0,.030)*bell(y,1.448,.010)*front;
  return [x+dx,y+dy,z+dz];
}

export const REFERENCE_EXPRESSIONS=Object.freeze({
  softSmile:{Mouth_Smile_L:.31,Mouth_Smile_R:.37,Cheek_Raise_L:.16,Cheek_Raise_R:.19,Eye_Squint_L:.07,Eye_Squint_R:.07},
  wideSmile:{Mouth_Smile_L:.86,Mouth_Smile_R:.91,Cheek_Raise_L:.67,Cheek_Raise_R:.70,Eye_Squint_L:.22,Eye_Squint_R:.24,Mouth_Dimple_L:.18,Mouth_Dimple_R:.24,Jaw_Open:.18},
  frown:{Mouth_Frown_L:.57,Mouth_Frown_R:.54,Brow_Raise_Inner_L:.39,Brow_Raise_Inner_R:.39,Brow_Drop_L:.18,Brow_Drop_R:.18},
  anger:{Brow_Drop_L:.62,Brow_Drop_R:.65,Brow_Compress_L:.56,Brow_Compress_R:.56,Eye_Squint_L:.28,Eye_Squint_R:.30,Mouth_Press_L:.42,Mouth_Press_R:.40,Nose_Sneer_L:.10,Nose_Sneer_R:.10},
  referenceLook:{Brow_Raise_Outer_R:.18,Brow_Raise_Inner_L:.08,Mouth_Smile_R:.14,Mouth_Smile_L:.08,Eye_Wide_L:.10,Eye_Wide_R:.10},
  surprise:{Brow_Raise_Inner_L:.55,Brow_Raise_Inner_R:.55,Brow_Raise_Outer_L:.4,Brow_Raise_Outer_R:.4,Eye_Wide_L:.48,Eye_Wide_R:.48,Jaw_Open:.32}
});

export function installReferenceIdentity(actor,{preset=REFERENCE_MIRA,texture=null,enabled=true}={}){
  if(actor?.version!=='v2')return null;if(actor.h5Identity)return actor.h5Identity;
  const before={shape:{...actor.shape},faceType:actor.faceType,likeness:actor.likeness,hairStyle:actor.hairStyle,hairColor:actor.hairColor,name:actor.displayName},restores=[];
  const sculpt={...preset.sculpt};let active=enabled,appliedStamp=null,expression=null,exprTime=0;
  const eyeKeys=new Map((actor.eyes?.entries||[]).filter(e=>e.advanced).map(e=>[e.advanced,e.advanced.customProgramCacheKey]));
  if(actor.eyes?.shader){restores.push(wrapMethod(actor.eyes,'shader',old=>function(s){const result=old.apply(this,arguments);if(active)s.fragmentShader=s.fragmentShader.replace('diffuseColor*=eyeTexel;','float h5Iris=smoothstep(miraPupil,miraPupil+.008,radius)*(1.-smoothstep(.118,.134,radius));eyeTexel.rgb=mix(eyeTexel.rgb,vec3(.24,.20,.085)*(dot(eyeTexel.rgb,vec3(.2126,.7152,.0722))*3.+.15),h5Iris*.72);diffuseColor*=eyeTexel;');return result;}));}
  function paint(){for(const [m,key] of eyeKeys){m.customProgramCacheKey=active?()=> 'mira-reference-hazel-17':key;m.needsUpdate=true;}if(!active)return;for(const m of actor.headMats||[])if(texture){m.map=texture;m.needsUpdate=true;}for(const m of actor.hairMats||[])m.color.setHex([0xffffff,0xc4a080,0xc45a28,0x8a5a32][actor.hairColor]||0xc4a080);for(const e of actor.eyes?.entries||[])if(e.advanced){e.advanced.customProgramCacheKey=()=> 'mira-reference-hazel-17';e.advanced.needsUpdate=true;}}
  restores.push(wrapMethod(actor,'applyLooks',old=>function(){const r=old.apply(this,arguments);paint();return r;}));
  restores.push(wrapMethod(actor,'updateShapeGeometry',old=>function(){
    const prior=this.geomState;
    if(active)this.lastLikeness=NaN;
    const result=old.apply(this,arguments);if(!active||this.geomState===appliedStamp)return result;
    for(const d of this.deform){
      const p=d.position.array,base=Float32Array.from(p);
      for(let i=0;i<p.length;i+=3)p.set(identityWarp(base[i],base[i+1],base[i+2],sculpt),i);
      for(const attr of d.geom.morphAttributes.position||[]){const m=attr.array;
        for(let i=0;i<m.length;i+=3){const q=identityWarp(base[i]+m[i],base[i+1]+m[i+1],base[i+2]+m[i+2],sculpt);m[i]=q[0]-p[i];m[i+1]=q[1]-p[i+1];m[i+2]=q[2]-p[i+2];}attr.needsUpdate=true;
      }
      d.position.needsUpdate=true;d.geom.computeVertexNormals();d.normal.needsUpdate=true;d.geom.computeBoundingSphere();
    }
    this.buildSoftLimits();weldSkinNormals(this);this.seamsReady=!!this.h5Skin;appliedStamp=this.geomState;return result;
  }));
  // Drive the actual 49 channels just before the existing FaceDrive/morph pass.
  restores.push(wrapMethod(actor,'tickMorphs',old=>function(dt){
    if(expression){exprTime+=dt;const weight=smooth(exprTime/.22)*(1-smooth((exprTime-expression.duration)/.3));
      for(const [key,value] of Object.entries(REFERENCE_EXPRESSIONS[expression.name]))if(key in this.want){if(this.speech&&/Jaw|V_/.test(key))continue;this.want[key]=T.MathUtils.lerp(this.want[key]||0,value,weight);}
      if(exprTime>expression.duration+.3)expression=null;
    }
    return old.apply(this,arguments);
  }));
  const api={preset,sculpt,get enabled(){return active;},setEnabled(value){active=!!value;appliedStamp=null;actor.geomState='';actor.lastLikeness=NaN;
    if(active){Object.assign(actor.shape,preset.shape);actor.faceType=preset.faceType;actor.likeness=preset.likeness;actor.hairStyle=preset.hairStyle;actor.hairColor=preset.hairColor;actor.displayName=preset.name;}
    else{Object.assign(actor.shape,before.shape);Object.assign(actor,{faceType:before.faceType,likeness:before.likeness,hairStyle:before.hairStyle,hairColor:before.hairColor,displayName:before.name});}
    actor.applyLooks();actor.applyShape();actor.hairPhysics?.setStyle(actor.hairStyle);actor.realism?.tissue.reset();
  },setSculpt(values){for(const c of IDENTITY_CONTROLS)if(Number.isFinite(values[c.key]))sculpt[c.key]=clamp(values[c.key],c.min,c.max);appliedStamp=null;actor.geomState='';actor.lastLikeness=NaN;actor.applyShape();},express(name,duration=3){if(!(name in REFERENCE_EXPRESSIONS))throw new TypeError('Unknown expression '+name);expression={name,duration:clamp(duration,.5,60)};exprTime=0;},dispose({restore=true}={}){actor.h5Groom?.dispose();if(restore)api.setEnabled(false);restores.reverse().forEach(f=>f());delete actor.h5Identity;}};
  actor.h5Identity=api;api.setEnabled(enabled);installReferenceGroom(actor);return api;
}
