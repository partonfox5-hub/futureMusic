import {LivingEyes} from './mira-v2-eyes.js?v=12.2';
import {EnhanceEyes} from './mira-v2-tearline.js?v=12.2';
import {EMOTION_NAMES,IDLE_NAMES,WALK_NAMES,V2_EXTRA_SLIDERS,FACE_PRESETS,EXERCISE_MODES,ATTENTION_MODES} from './mira-v2-controls.js?v=16.0';
export {EMOTION_NAMES,IDLE_NAMES,WALK_NAMES,ATTENTION_MODES} from './mira-v2-controls.js?v=16.0';
import * as THREE from 'three';
import {restoreSurfaceUV} from './mira-v2-uv.js?v=11.0';
import {HairGuides} from './mira-v2-hair.js?v=12.9';
import {SurfaceFlesh} from './mira-v2-tissue.js?v=12.0';
import {installV2Realism} from './mira-v2-realism.js?v=14.5';

// Mira v2: a bounded real-time approximation for this CC3 rig, Three r170.
const clamp = THREE.MathUtils.clamp, damp = THREE.MathUtils.damp;
const smooth = (x) => { x=clamp(x,0,1); return x*x*(3-2*x); };
const V = () => new THREE.Vector3();
const cap = (v,n) => { if(v.lengthSq()>n*n)v.setLength(n); return v; };
const tmp=V(), tmp2=V(), tmp3=V(), axis=V(), q=new THREE.Quaternion();
const up=new THREE.Vector3(0,1,0);
const FACE_POSES={
 // Resting-beauty baseline: lowered lids, Duchenne hint, no Eye_Wide. CC3 rest
 // lids are fully open, so Eye_Blink at rest is what kills the stare.
 neutral:{Eye_Blink:.11,Eye_Squint:.14,Brow_Drop:.05,Mouth_Smile:.08,Cheek_Raise:.10},
 happy:{Mouth_Smile:.92,Cheek_Raise:.72,Mouth_Dimple:.28,Eye_Squint:.32,Jaw_Open:.08,Eye_Blink:.06},
 content:{Mouth_Smile:.28,Eye_Squint:.18,Cheek_Raise:.26,Eye_Blink:.12,Brow_Drop:.06,Brow_Raise_Inner:.04},
 curious:{Brow_Raise_Inner:.20,Brow_Raise_Outer:.14,Mouth_Smile:.10,Eye_Squint:.08,Eye_Blink:.08},
 listening:{Brow_Raise_Inner:.10,Mouth_Smile:.14,Eye_Squint:.10,Eye_Blink:.12,Cheek_Raise:.08},
 thoughtful:{Brow_Compress:.14,Mouth_Press:.18,Eye_Squint:.16,Eye_Blink:.14,Brow_Drop:.06},
 concerned:{Brow_Raise_Inner:.32,Brow_Drop:.14,Mouth_Frown:.16,Eye_Squint:.08,Eye_Blink:.10},
 sad:{Brow_Raise_Inner:.48,Brow_Drop:.18,Mouth_Frown:.32,Eye_Squint:.14,Eye_Blink:.16},
 surprise:{Brow_Raise_Inner:.48,Brow_Raise_Outer:.43,Eye_Wide:.36,Jaw_Open:.18,V_Tight_O:.15},
 afraid:{Brow_Raise_Inner:.50,Brow_Compress:.20,Eye_Wide:.28,Mouth_Stretch:.22,Jaw_Open:.10,Eye_Blink:.04},
 angry:{Brow_Compress:.55,Brow_Drop:.43,Mouth_Press:.4,Eye_Squint:.30,Eye_Blink:.08},
 disgust:{Nose_Sneer:.48,Brow_Drop:.24,Mouth_Shrug_Upper:.3,Eye_Squint:.18,Eye_Blink:.10},
 tease:{Mouth_Smile:.30,Mouth_Dimple:.18,Eye_Squint:.18,Cheek_Raise:.12,Eye_Blink:.10},
 flirty:{Mouth_Smile:.26,Cheek_Raise:.18,Eye_Squint:.22,Eye_Blink:.12,Brow_Raise_Outer:.08},
 laugh:{Mouth_Smile:.88,Cheek_Raise:.68,Eye_Squint:.38,Jaw_Open:.22,V_Wide:.10,Eye_Blink:.08},
 tired:{Eye_Blink:.28,Brow_Raise_Inner:.08,Mouth_Press:.08,Eye_Squint:.10}
};

// The supplied arm vertices describe an A pose (~30 degrees down), while their
// inverse bind matrices and bones describe a T pose. Undo that baked tilt before
// applying animation. Keep this correction local to v2 and the player hands.
export function repairArmRestData(position,normal,indices,weights,names){
 // Twist and share bones own almost ALL arm vertices in the supplied CC3 mesh.
 // Omitting them leaves the arm in A-pose and the wrist in T-pose: a long tear.
 const family='(?:Upperarm(?:Twist0[12])?|Forearm(?:Twist0[12])?|ElbowShareBone|Hand|(?:Thumb|Index|Mid|Ring|Pinky)[1-3])';
 const owners=names.map(n=>new RegExp('^L_'+family+'$').test(n)?1:new RegExp('^R_'+family+'$').test(n)?-1:0);
 for(let i=0;i<position.length/3;i++){
  let left=0,right=0;for(let j=0;j<4;j++){const side=owners[indices[i*4+j]];if(side===1)left+=weights[i*4+j];if(side===-1)right+=weights[i*4+j];}
  const sum=Math.max(left,right);if(sum<.001)continue;const sign=left>right?1:-1;
  const x=position[i*3],y=position[i*3+1],z=position[i*3+2],angle=sign*Math.PI/6*clamp(sum*1.25,0,1),c=Math.cos(angle),s=Math.sin(angle);
  const cx=sign*.16365,cy=1.32236;
  position[i*3]=cx+c*(x-cx)-s*(y-cy);position[i*3+1]=cy+s*(x-cx)+c*(y-cy);
  position[i*3+2]=z-.026*smooth((Math.abs(x)-.30)/.30)*clamp(sum*1.25,0,1);
  if(normal){const nx=normal[i*3],ny=normal[i*3+1];normal[i*3]=c*nx-s*ny;normal[i*3+1]=s*nx+c*ny;}
  if(sum>.7&&Math.abs(x)>.4){
   for(let j=0;j<4;j++)weights[i*4+j]=owners[indices[i*4+j]]===sign?weights[i*4+j]/sum:0;
  }
 }
}

// Cache anatomical bend axes from the CC3 bind hierarchy, shared by NPC/PlayerHands.
export function makeFingerRig(bones,bind,side){
 const hand=bones[side+'_Hand'],joints={},matrices=new Map(),rows=['Thumb','Index','Mid','Ring','Pinky'];
 const frame=bone=>{
  if(!bone||!hand)return null;if(matrices.has(bone))return matrices.get(bone);
  const chain=[];let p=bone;for(;p&&p!==hand;p=p.parent)chain.unshift(p);if(p!==hand)return null;
  const m=new THREE.Matrix4();for(const b of chain)m.multiply(new THREE.Matrix4().compose(b.position,bind[b.name]||b.quaternion,b.scale));matrices.set(bone,m);return m;
 };
 const point=row=>{const m=frame(bones[side+'_'+row+'1']);return m?new THREE.Vector3().setFromMatrixPosition(m):null;};
 const index=point('Index'),pinky=point('Pinky'),mid=point('Mid');
 const forward=(mid||new THREE.Vector3(0,1,0)).clone().normalize(),lateral=index&&pinky?index.clone().sub(pinky).normalize():new THREE.Vector3(0,0,1);
 const palm=new THREE.Vector3().crossVectors(forward,lateral),palmar=new THREE.Vector3(side==='L'?1:-1,0,0);
 if(palm.lengthSq()<1e-8)palm.copy(palmar);else{palm.normalize();if(palm.dot(palmar)<0)palm.negate();}
 for(const row of rows)for(let j=1;j<=3;j++){
  const name=side+'_'+row+j,b=bones[name],m=frame(b);if(!b||!m)continue;
  const child=bones[side+'_'+row+(j+1)],inv=m.clone().invert();
  const along=child?.parent===b?child.position.clone():b.position.clone().applyQuaternion((bind[name]||b.quaternion).clone().invert());
  if(along.lengthSq()<1e-10)continue;along.normalize();
  const normal=palm.clone().transformDirection(inv),across=lateral.clone().transformDirection(inv);
  const flex=new THREE.Vector3().crossVectors(along,normal).normalize(),spread=new THREE.Vector3().crossVectors(along,across).normalize();
  const thumbAcross=pinky?pinky.clone().sub(new THREE.Vector3().setFromMatrixPosition(m)).transformDirection(inv):normal;
  joints[name]={flex,spread,oppose:new THREE.Vector3().crossVectors(along,thumbAcross).normalize(),row,j};
 }
 return {side,joints,phase:Object.fromEntries(rows.map(row=>[row,Math.random()*Math.PI*2])),q:new THREE.Quaternion()};
}
export function fingerRotation(rig,row,j,curl,time,out=new THREE.Quaternion()){
 const joint=rig.joints[rig.side+'_'+row+j];out.identity();if(!joint)return out;
 const f=['Index','Mid','Ring','Pinky'].indexOf(row),c=clamp(curl,0,1);
 if(row==='Thumb'){
  if(j===1)out.setFromAxisAngle(joint.oppose,.10+c*.16);
  return out.multiply(rig.q.setFromAxisAngle(joint.flex,c*[.18,.32,.18][j-1]));
 }
 const micro=.025*Math.sin(time*.8+rig.phase[row]),amount=clamp(c*(.94+f*.04)+micro,0,1);
 out.setFromAxisAngle(joint.flex,amount*[.55,1,.45][j-1]);
 if(j===1)out.multiply(rig.q.setFromAxisAngle(joint.spread,([.018,.004,-.004,-.018][f])*(1-c)));
 return out;
}

// Smooth, chest-anchored deformation in unscaled model coordinates. No animated
// breast scale or negative scale: volume grows by moving the complete surface.
export function shapePoint(x,y,z,size,likeness=0,butt=1,arms=1,options={}){
 let dx=0,dy=0,dz=0;
 if(y>1.04&&y<1.39&&z>-.01){
  // Compose small smooth warps instead of summing a large displacement. This
  // keeps spacing + inward angle + small size from folding the inner attachment.
  let bx=x,by=y,bz=z;const k=Math.cbrt(size*size)-1;
  for(let step=0;step<5;step++){
   let sx=0,sy=0,sz=0;
   for(const sign of [-1,1]){
    const cx=sign*.078,cy=1.207,rr=((bx-cx)/.092)**2+((by-cy)/.091)**2;
    const w=(1-smooth(rr))*smooth((bz-.025)/.042)*smooth(Math.abs(bx)/.032);
    sx+=sign*.032*k*w;sy+=(by-cy)*k*.36*w;sz+=k*.074*w;
    const attach=(1-smooth(rr*.70))*smooth((bz-.006)/.060)*smooth(Math.abs(bx)/.040);
    sx+=sign*((options.breastSpacing||0)*.012+(options.breastAngle||0)*.18*Math.max(0,bz-.03))*attach;
    sy+=(options.breastHeight||0)*.016*attach;
    // Larger soft volumes acquire a lower pole instead of expanding as a sphere.
    sy-=(.003+.026*Math.max(0,k))*(.35+.65*(options.softness??.62))*w*smooth((cy+.06-by)/.13);
    sz-=sign*(bx-cx)*(options.breastAngle||0)*.18*attach;
   }
   bx+=sx/5;by+=sy/5;bz+=sz/5;
  }
  dx=bx-x;dy=by-y;dz=bz-z;
 }
 // Broad lower-pole volume, with a soft attachment to the sacrum and thighs.
 // Preserve the authored centre fold: deepening it creates pinched triangles.
 if(y>.63&&y<1.01&&z<-.015){
  let bx=x,by=y,bz=z;const k=Math.cbrt(butt*butt)-1;
  for(let step=0;step<6;step++){
   const rr=((Math.abs(bx)-.095)/.14)**2+((by-.825)/.165)**2,w=(1-smooth(rr))*smooth((-bz-.015)/.065),side=Math.sign(bx),center=smooth(Math.abs(bx)/.055);
   const angle=(options.buttAngle||0)*.13;
   bx+=side*(.025*k+(options.buttSpacing||0)*.012+angle*Math.max(0,-bz-.035))*w*center/6;
   by+=((options.buttHeight||0)*.016-(.005+.032*Math.max(0,k))*(.45+.55*(options.softness??.62))*smooth((.94-by)/.15))*w/6;
   bz+=(-.047*k+side*(bx-side*.095)*angle)*w/6;
  }
  dx+=bx-x;dy+=by-y;dz+=bz-z;
 }
 // Shape the arm surface instead of multiplying upper-arm and forearm scales.
 // The original scale hierarchy also scaled every finger twice.
 if(Math.abs(x)>.15&&y>1.23&&y<1.42){
  const w=smooth((Math.abs(x)-.15)/.10)*(1-smooth((Math.abs(x)-.52)/.11));
  dy+=(y-1.321)*(arms-1)*w;dz+=(z+.0755)*(arms-1)*w;
 }
 // Continuous surface shaping avoids nonuniform bone-chain scales and a thigh
 // root translation that used to pull apart the narrow inner-leg triangles.
 const waist=(options.waist??1)-1,hips=(options.hips??1)-1,thigh=(options.thigh??1)-1;
 const trunk=(1-smooth((Math.abs(x)-.21)/.09));
 const ww=Math.exp(-(((y-1.04)/.13)**2))*trunk;
 const hw=Math.exp(-(((y-.87)/.12)**2))*trunk;
 dx+=x*(waist*.55*ww+hips*.44*hw);dz+=(z+.018)*(waist*.55*ww+hips*.34*hw);
 if(y>.42&&y<.88){
  const tw=smooth((y-.42)/.15)*(1-smooth((y-.76)/.12));
  const side=Math.sign(x)||1,center=side*.096;
  dx+=(x-center)*thigh*.58*tw;
  dz+=(z+.009)*thigh*.55*tw;
  dx+=side*(options.gap||0)*.016*tw*smooth(Math.abs(x)/.05);
  // Medial inner-thigh only. Do not flatten z or run on the buttocks: that
  // overlap (y ~ .63–.82, z < 0) carved a crater in the lower glute.
  const inner=(1-smooth((Math.abs(x)-.018)/.07))*smooth((y-.50)/.07)*(1-smooth((y-.72)/.08))*smooth((z+.01)/.05)*smooth((.03-Math.abs(z))/.04);
  const keep=Math.max(Math.abs(x),.036);
  dx+=side*(keep-Math.abs(x))*inner*.65;
 }
 // Small identity sculpt, shared by head/eyes/teeth and their morph endpoints.
 // Broad proportional changes only; a single portrait cannot recover depth.
 if(likeness>0&&y>1.405){
  const front=smooth((z+.018)/.055), jaw=Math.exp(-(((y-1.445)/.037)**2));
  dx-=x*.065*jaw*front*likeness;
  const nose=Math.exp(-((x/.022)**2+((y-1.518)/.031)**2));
  dz-=.0035*nose*front*likeness;
  dy+=.0015*Math.exp(-((x/.035)**2+((y-1.475)/.019)**2))*likeness;
 }
 // Resting periocular sculpt on the supplied CC3 head. Millimetres only:
 // drop the upper-lid rim, add orbital fat, slightly narrow the fissure,
 // and tilt the outer canthus down so the default aperture is not a stare.
 if(y>1.48&&y<1.575&&z>-.02){
  const front=smooth((z+.012)/.048);
  const eyeX=Math.abs(x)-.032,eyeBand=Math.exp(-(eyeX*eyeX)/(.028*.028))*Math.exp(-(((y-1.528)/.018)**2));
  const lid=eyeBand*front;
  dy-=.0024*lid;
  dz+=.0016*lid;
  const under=Math.exp(-(eyeX*eyeX)/(.030*.030))*Math.exp(-(((y-1.512)/.014)**2))*front;
  dz+=.0018*under;dy-=.0006*under;
  const canthus=smooth((Math.abs(x)-.048)/.018)*smooth((.072-Math.abs(x))/.012)*Math.exp(-(((y-1.524)/.012)**2))*front;
  dy-=.0012*canthus;
  const cheekMass=Math.exp(-((Math.abs(x)-.038)**2)/(.034*.034))*Math.exp(-(((y-1.492)/.022)**2))*front;
  dz+=.0022*cheekMass;
 }
 const face=options.faceProfile;
 if(face&&y>1.40){
  const front=smooth((z+.018)/.05),jaw=Math.exp(-(((y-1.446)/.029)**2)),cheek=Math.exp(-(((y-1.502)/.033)**2));
  dx+=x*(face.jaw*jaw+face.cheek*cheek)*front;
  dy+=(y-1.50)*face.length*smooth((y-1.40)/.055);
  dz+=face.nose*Math.exp(-((x/.024)**2+((y-1.52)/.024)**2))*front;
 }
 if(options.male){const upper=Math.exp(-(((y-1.29)/.16)**2))*(1-smooth((Math.abs(x)-.22)/.12));dx+=x*.14*upper;if(y>1.08&&y<1.34&&z>0){const w=(1-smooth(((y-1.21)/.13)**2))*(1-smooth((Math.abs(x)-.07)/.12));dz+=(.052-(z+dz))*w*.82;}}
 return [x+dx,y+dy,z+dz];
}

export function createV2Class(Base,{loadMap,MORPH,BODY_HIT,installSkinShader,HAIR_COLORS,SLIDERS}){
 return class MiraV2 extends Base {
  constructor(root,scale,opts={}){
   super(restoreSurfaceUV(root),scale,opts);
   this.version='v2';this.autonomy=true;this.lifeT=8+Math.random()*5;this.greetingT=1;this.autoWander=false;this.mode='idle';this.shape.jiggle=opts.shape?.jiggle??2.8;
   for(const slider of V2_EXTRA_SLIDERS)this.shape[slider.key]=opts.shape?.[slider.key]??slider.value;
   this.hairStyle=clamp(opts.hairStyle||0,0,10);this.bodyType=opts.bodyType==='male'?'male':'female';this.displayName=opts.name||(this.bodyType==='male'?'Alex':'Mira');this.personality=opts.personality||this.personality;
   this.spineTouch=V();this.spineGoal=V();this.armSwing={};
   this.emotion={name:'content',intensity:.65,time:0,hold:8,source:'idle',valence:.28,arousal:.18};this.blinkAsym=Math.random()<.5?-1:1;
   this.emotionTarget={}; this.emotionCurrent={};this.expressionOverride=null;
   this.idleKind='rest';this.idleT=this.idleDur=6+Math.random()*6;this.idleChoice='auto';this.seed=Math.random()*100;
   this.gait=clamp(opts.gait||0,0,WALK_NAMES.length-1);
   this.handTargets={};this.grabs=new Map();this.balance={state:'standing',time:0,stress:0,tilt:0,dir:V(),velocity:V(),recoverFrom:0,airVel:0,groundedY:0,q:new THREE.Quaternion(),omega:V()};this.dead=false;this.headMissing=false;
   this.attentionMode=ATTENTION_MODES.includes(opts.attentionMode)?opts.attentionMode:'attentive';this.lookPhase=true;this.lookPhaseT=3+Math.random()*4;this.glanceT=1.5;this.smileLook=0;this.ignoreCloseT=0;this.followSide=Math.random()<.5?1:-1;
   this.likeness=opts.likeness??1;this.geomState='';this.deform=[];this.poseQ={};this.skinMeshes=[];
   this.headTouch=new THREE.Vector3();this.headTouchGoal=new THREE.Vector3();this.attentionT=0;this.attention=V();this.externalHands=[];
   this.root.updateMatrixWorld(true);
   this.footRestQ={};this.ankleRestY={};for(const side of ['L','R']){const bone=this.bones[side+'_Foot'];this.footRestQ[side]=this.group.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(bone.getWorldQuaternion(new THREE.Quaternion()));this.ankleRestY[side]=bone.getWorldPosition(V()).y/this.baseScale;}
   // Geometry must be actor-local: slider changes must never mutate v1/other clones.
   const shared=new Map();
   this.root.traverse(o=>{
    if(!o.isSkinnedMesh||o.name==='hair')return;
    const old=o.geometry,key=old.attributes.position;let record=shared.get(key);
    if(!record){
     record={base:Float32Array.from(key.array),baseNormals:Float32Array.from(old.attributes.normal.array),morph:(old.morphAttributes.position||[]).map(a=>a.array),indices:[],position:key.clone(),normal:old.attributes.normal.clone(),morphPosition:(old.morphAttributes.position||[]).map(a=>a.clone())};
     if(/body/.test(o.name)){
     record.skinIndex=old.attributes.skinIndex.clone();record.skinWeight=old.attributes.skinWeight.clone();
      repairArmRestData(record.base,record.baseNormals,record.skinIndex.array,record.skinWeight.array,o.skeleton.bones.map(b=>b.name));
      const l=o.skeleton.bones.findIndex(b=>b.name==='L_Breast'),r=o.skeleton.bones.findIndex(b=>b.name==='R_Breast'),chest=o.skeleton.bones.findIndex(b=>b.name==='Spine02');
      for(let i=0;i<key.count;i++){
       const x=key.getX(i),y=key.getY(i),z=key.getZ(i),bi=x>=0?l:r;
       const rr=((Math.abs(x)-.078)/.105)**2+((y-1.207)/.11)**2;
       const w=(1-smooth(rr))*smooth((z-.018)/.035)*smooth(Math.abs(x)/.025)*.92;
       const parts=[];let had=false;
       for(let j=0;j<4;j++){const index=old.attributes.skinIndex.array[i*4+j],weight=old.attributes.skinWeight.array[i*4+j];if(index===l||index===r){had ||= weight>0;continue;}if(weight>0)parts.push({index,weight});}
       if(!had&&w<.00001)continue;
       parts.sort((a,b)=>b.weight-a.weight);parts.splice(3);if(!parts.length)parts.push({index:chest,weight:1});
       const sum=parts.reduce((s,p)=>s+p.weight,0);for(const p of parts)p.weight=p.weight/sum*(1-w);parts.unshift({index:bi,weight:w});
       for(let j=0;j<4;j++){record.skinIndex.array[i*4+j]=parts[j]?.index||0;record.skinWeight.array[i*4+j]=parts[j]?.weight||0;}
      }
     }
     if(record.skinWeight){
      const names=o.skeleton.bones.map(b=>b.name),left=names.indexOf('L_Glute'),right=names.indexOf('R_Glute'),pelvis=names.indexOf('Pelvis');
      for(let i=0;i<key.count;i++){
       const x=record.base[i*3],y=record.base[i*3+1],z=record.base[i*3+2];
       const rr=((Math.abs(x)-.096)/.145)**2+((y-.826)/.160)**2;
       const w=(1-smooth(rr))*smooth((-z-.008)/.078)*smooth((Math.abs(x)-.013)/.055)*.86;
       const parts=[];let had=false;
       for(let j=0;j<4;j++){const index=record.skinIndex.array[i*4+j],weight=record.skinWeight.array[i*4+j];if(index===left||index===right){had ||= weight>0;continue;}if(weight>0)parts.push({index,weight});}
       if(!had&&w<1e-6)continue;
       parts.sort((a,b)=>b.weight-a.weight);parts.splice(w>1e-6?3:4);if(!parts.length)parts.push({index:pelvis,weight:1});
       const sum=parts.reduce((a,b)=>a+b.weight,0);parts.forEach(p=>p.weight=p.weight/sum*(1-w));if(w>1e-6)parts.unshift({index:x>=0?left:right,weight:w});
       for(let j=0;j<4;j++){record.skinIndex.array[i*4+j]=parts[j]?.index||0;record.skinWeight.array[i*4+j]=parts[j]?.weight||0;}
      }
     }
     shared.set(key,record);this.deform.push(record);
    }
    record.indices.push(...old.index.array);
    const geom=new THREE.BufferGeometry();geom.index=old.index;geom.attributes={...old.attributes,position:record.position,normal:record.normal};if(record.skinIndex){geom.attributes.skinIndex=record.skinIndex;geom.attributes.skinWeight=record.skinWeight;}
    // r170 enables morph shaders from property presence, even for an empty
    // array. Eyes/teeth have no targets: adding position:[] generates an illegal
    // zero-length GLSL uniform and makes the render loop read missing influences.
    geom.morphAttributes={};
    for(const [name,targets] of Object.entries(old.morphAttributes)){
     if(targets.length)geom.morphAttributes[name]=name==='position'?record.morphPosition:targets;
    }
    geom.morphTargetsRelative=old.morphTargetsRelative;geom.groups=old.groups.slice();o.geometry=geom;
    record.geom=geom;
    if(/Skin_/.test(o.material?.name))this.skinMeshes.push(o);
   });
   for(const d of this.deform){const g=new THREE.BufferGeometry();g.attributes={position:d.position,normal:d.normal};g.setIndex(d.indices);d.geom=g;if(d.morphPosition.length)g.morphAttributes.position=d.morphPosition;delete d.indices;}
   this.surfaceFlesh=new SurfaceFlesh(this);
   this.skinDetailMap=loadMap('skin_detail_v2.jpg',true);this.skinDetailMap.wrapS=this.skinDetailMap.wrapT=THREE.RepeatWrapping;
   this.headRegionMap=loadMap('head_region.png',false);
   this.applyLooks();
   this.hairDetail=opts.hairDetail==='classic'?'classic':'advanced';this.eyeDetail=opts.eyeDetail==='classic'?'classic':'advanced';
   this.hairPhysics=new HairGuides(this,BODY_HIT,this.hairDetail);this.eyes=new LivingEyes(this,loadMap,this.eyeDetail);this.enhanceEyes=new EnhanceEyes(this);
   this.root.traverse(o=>{if(o.isMesh){o.receiveShadow=!/Skin_/.test(o.material?.name);o.castShadow=!/hair|eyes/.test(o.name);}});
   if(!/OculusBrowser|Quest/i.test(globalThis.navigator?.userAgent||'')){
    try{installV2Realism(this,{loadMap,shapePoint,fingerRotation});}catch(err){console.warn('v2 realism skipped',err);}
   }
  }
  setVisualDetail(kind,value){
   const mode=value==='classic'?'classic':'advanced';
   if(kind==='eyes'){this.eyeDetail=mode;this.eyes?.setMode(mode);this.enhanceEyes?.setMode(mode);}
   if(kind==='hair'){this.hairDetail=mode;this.hairPhysics?.setMode(mode);}
   this.applyLooks();
  }
  visualStatus(){
   const eyes=this.eyes?.shells.length===2?(this.eyeDetail==='classic'?'Classic eyes':'Advanced eyes + tearline'):'Eye setup unavailable';
   const hair=this.hairPhysics?.mesh?(this.hairDetail==='classic'?'Classic hair':'Advanced hair'):'Hair setup unavailable';
   return eyes+' · '+hair;
  }
  applyLooks(){
   if(!this.deform)return;
   for(const m of this.hairMats)m.color.setHex((HAIR_COLORS[this.hairColor]||HAIR_COLORS[0]).tint);
   for(const m of this.headMats){m.map=loadMap(this.bodyType==='male'?'head.jpg':'head_v3.jpg',true);m.normalScale.setScalar(.28);m.roughness=.58;}
   this.root.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){
    if(/Skin_Body/.test(m.name))m.map=loadMap('body_v2.jpg',true);
    if(/Skin_/.test(m.name)){const d=this.deform.find(d=>d.position===o.geometry.attributes.position);if(d&&!o.geometry.attributes.v2SkinRest)o.geometry.setAttribute('v2SkinRest',new THREE.BufferAttribute(d.base,3));m.normalScale?.setScalar(/Head/.test(m.name)?.20:.32);m.envMapIntensity=.50;m.aoMap=null;m.aoMapIntensity=0;installSkinShader(m);installV2Skin(m,this);m.needsUpdate=true;}
    if(/Std_Eye_[LR]/.test(m.name)){m.roughness=.30;m.envMapIntensity=.75;}
    if(/cornea/i.test(m.name)&&!m.userData.livingEye){m.opacity=.22;m.envMapIntensity=.75;m.roughness=.12;}
   }});
   this.seamsReady=false;
   for(const o of this.skinMeshes)if(!o.geometry.attributes.v2ToneGain){const gains=new Float32Array(o.geometry.attributes.position.count*3);gains.fill(1);o.geometry.setAttribute('v2ToneGain',new THREE.BufferAttribute(gains,3));}
  }
  updateShapeGeometry(){
   const size=this.shape.breast,profile=FACE_PRESETS[this.faceType]||FACE_PRESETS[0],like=profile.like*this.likeness;
   const options={...this.shape,faceProfile:profile,male:this.bodyType==='male'};
   const key=[size,like,this.faceType,this.shape.butt,this.shape.arms,this.shape.waist,this.shape.hips,this.shape.thigh,this.shape.gap,this.shape.breastHeight,this.shape.breastSpacing,this.shape.breastAngle,this.shape.softness,this.shape.buttHeight,this.shape.buttSpacing,this.shape.buttAngle].map(n=>n.toFixed(3)).join('/')+this.bodyType+'/s12.6';if(key===this.geomState)return;this.geomState=key;
   const likenessChanged=like!==this.lastLikeness||this.faceType!==this.lastFace;this.lastLikeness=like;this.lastFace=this.faceType;
   for(const d of this.deform){
    const a=d.geom.attributes.position.array,b=d.base;
    for(let i=0;i<a.length;i+=3){const p=shapePoint(b[i],b[i+1],b[i+2],size,like,this.shape.butt,this.shape.arms,options);a[i]=p[0];a[i+1]=p[1];a[i+2]=p[2];}
    // Rebase expression deltas through the identity sculpt, preserving blendshapes.
    for(let j=0;likenessChanged&&j<d.morph.length;j++){
     const src=d.morph[j],dst=d.geom.morphAttributes.position[j].array;
     for(let i=0;i<dst.length;i+=3){
      if(!src[i]&&!src[i+1]&&!src[i+2]){dst[i]=dst[i+1]=dst[i+2]=0;continue;}
      const p=shapePoint(b[i]+src[i],b[i+1]+src[i+1],b[i+2]+src[i+2],size,like,this.shape.butt,this.shape.arms,options);
      dst[i]=p[0]-a[i];dst[i+1]=p[1]-a[i+1];dst[i+2]=p[2]-a[i+2];
     }
     d.geom.morphAttributes.position[j].needsUpdate=true;
    }
    d.geom.attributes.position.needsUpdate=true;
    // Preserve authored normals away from changed vertices, including material seams.
    const old=d.baseNormals;d.geom.computeVertexNormals();
    for(let i=0;i<b.length;i+=3)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])<1e-8){d.geom.attributes.normal.array.set(old.subarray(i,i+3),i);}
    // Weld normals across duplicated UV vertices, without smoothing opposing surfaces.
    if(!d.normalGroups){const groups=new Map();for(let i=0;i<b.length;i+=3){const k=[b[i],b[i+1],b[i+2]].map(x=>Math.round(x*100000)).join('/');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(i);}d.normalGroups=[...groups.values()].filter(g=>g.length>1);}
    const na=d.geom.attributes.normal.array;
    for(const group of d.normalGroups){const first=V().fromArray(na,group[0]),mean=V();for(const i of group){const n=V().fromArray(na,i);if(n.dot(first)>.3)mean.add(n);}mean.normalize();for(const i of group)if(V().fromArray(na,i).dot(first)>.3)mean.toArray(na,i);}
    d.geom.attributes.normal.needsUpdate=true;
    d.geom.computeBoundingSphere();
   }
   this.buildSoftLimits();
  }
  buildSoftLimits(){
   // Each weighted triangle gives a half-space in attachment displacement:
   // dot(N, N') / |N|² = 1 + gradient·displacement. Keep positive area with
   // a margin, including when placement, spacing and proportions are changed.
   this.softPlanes={};
   const skeleton=this.skeleton,names=skeleton.bones.map(b=>b.name);
   for(const soft of this.soft){
    const bi=names.indexOf(soft.name),parentIndex=names.indexOf(this.bones[soft.name].parent.name);
    const invQ=new THREE.Quaternion().setFromRotationMatrix(skeleton.boneInverses[parentIndex].clone().invert().extractRotation(skeleton.boneInverses[parentIndex].clone().invert())).invert();
    const planes=[];
    for(const d of this.deform){
     if(!d.skinWeight)continue;const pos=d.position,si=d.skinIndex.array,sw=d.skinWeight.array,idx=d.geom.index.array;
     const weight=i=>{let sum=0;for(let j=0;j<4;j++)if(si[i*4+j]===bi)sum+=sw[i*4+j];return sum;};
     for(let j=0;j<idx.length;j+=3){
      const [ia,ib,ic]=[idx[j],idx[j+1],idx[j+2]],wa=weight(ia),db=weight(ib)-wa,dc=weight(ic)-wa;if(Math.abs(db)+Math.abs(dc)<1e-6)continue;
      const a=V().fromBufferAttribute(pos,ia),e1=V().fromBufferAttribute(pos,ib).sub(a),e2=V().fromBufferAttribute(pos,ic).sub(a),n=e1.clone().cross(e2),area=n.lengthSq();if(area<1e-18)continue;
      const grad=e2.clone().cross(n).multiplyScalar(db).add(n.clone().cross(e1).multiplyScalar(dc)).divideScalar(area).applyQuaternion(invQ);
      if(grad.lengthSq()>1e-6)planes.push(grad);
     }
    }
    this.softPlanes[soft.name]=planes;
   }
  }
  applyShape(){
   for(const slider of [...SLIDERS,...V2_EXTRA_SLIDERS]){
    const max=slider.key==='jiggle'?6:slider.max,v=this.shape[slider.key];
    this.shape[slider.key]=clamp(Number.isFinite(v)?v:slider.value,slider.min,max);
   }
   // All body proportions are continuous mesh deformations. The bind hierarchy
   // stays uniform, so elbow, knee, finger and crotch weights agree as joints bend.
   this.root.scale.setScalar(this.baseScale*this.shape.height);
   this.updateShapeGeometry();
   for(const mesh of this.skinMeshes){const mat=mesh.material;mat.normalScale?.setScalar((/Head/.test(mat.name)?.10:/Leg/.test(mat.name)?.09:.14)+this.shape.skinDetail*.24);}
  }
  jiggleAmt(){return clamp(this.shape.jiggle??2.8,0,6);}
  setEmotion(name,intensity=.65,{hold=9,source='context',valence,arousal}={}){
   if(!EMOTION_NAMES.includes(name))name='neutral';
   const finite=(v,f)=>Number.isFinite(v)?v:f;
   Object.assign(this.emotion,{name,intensity:clamp(finite(intensity,.65),0,1),time:0,hold:clamp(finite(hold,9),1,60),source,valence:clamp(finite(valence,0),-1,1),arousal:clamp(finite(arousal,.3),0,1)});
  }
  beginSpeech(text,emotion='listening'){
   super.beginSpeech(text,emotion);
   this.setEmotion(emotion,.72,{hold:12,source:'reply'});
  }
  endSpeech(){super.endSpeech();if(this.mode==='talk')super.setMode('idle');this.lifeT=7;}
  setMode(mode){
   if(this.dead){this.mode='idle';this.autoWander=false;this.autonomy=false;return;}
   this.socialPair?.cancel();this.directedWalk=null;if(this.navigation?.seat)this.navigation.seat.occupant=null;this.navigation=null;if(this.seat){this.seat.occupant=null;this.group.position.y=this.baseY||0;}this.seat=null;
   if(mode==='auto'){this.autonomy=true;this.lifeT=6;this.autoWander=false;this.dest=null;super.setMode('idle');return;}
   if(mode!=='talk')this.autonomy=false;
   this.autoWander=mode==='wander';if(!this.autoWander)this.dest=null;
   super.setMode(mode);
  }
  walkTo(point){
   if(this.balance.state!=='standing'||this.grabs.size)return false;
   this.setMode('wander');this.autonomy=false;this.autoWander=true;
   this.dest=point.clone().setY(0);this.directedWalk=this.dest.clone();this.miraWalk=3600;this.feet={};return true;
  }
  setIdlePose(name){
   this.setMode('idle');this.idleChoice=['auto',...IDLE_NAMES].includes(name)?name:'rest';this.idleKind=this.idleChoice==='auto'?'rest':this.idleChoice;this.idleT=0;this.gestureWeight=0;
  }
  playFaceReference(name){this.faceReference={name,t:0};}
  tickExpr(dt){
   const e=this.emotion;e.time+=dt;
   if(this.expressionOverride)e.name=this.expressionOverride;
   const decay=this.expressionOverride?1:Math.exp(-Math.max(0,e.time-e.hold)/16);
   const strength=e.intensity*decay,pose=FACE_POSES[e.name]||{};
   for(const n of MORPH)this.want[n]=0;
   for(const [n,v] of Object.entries(pose)){
    if(n in this.want)this.want[n]=v*strength;
    else for(const side of ['L','R'])if(n+'_'+side in this.want)this.want[n+'_'+side]=v*strength;
   }
   if(this.faceReference){
    const r=this.faceReference;r.t+=dt;const u=clamp(r.t/3.0625,0,1);
    if(r.name==='smile'){
     const k=smooth((u-.12)/.8);this.want.Mouth_Smile_L=.28+.92*k;this.want.Mouth_Smile_R=.30+.95*k;this.want.Jaw_Open=.12*k;
     this.want.Cheek_Raise_L=this.want.Cheek_Raise_R=.78*k;this.want.Mouth_Dimple_R=.22*k;this.want.Eye_Squint_L=this.want.Eye_Squint_R=.16*k;
    }else{
     const k=smooth((u-.16)/.44),end=smooth((u-.68)/.32);
     this.want.Brow_Raise_Inner_L=this.want.Brow_Raise_Inner_R=.52*k;
     this.want.Brow_Raise_Outer_L=this.want.Brow_Raise_Outer_R=.3*k;
     this.want.Eye_Wide_L=this.want.Eye_Wide_R=.35*k;
     this.want.Jaw_Open=.52*k*(1-.72*end);this.want.V_Tight_O=.42*k;this.want.Mouth_Pucker_Up_L=this.want.Mouth_Pucker_Up_R=.35*end;
    }
    if(u>=1)this.faceReference=null;
   }
   if(['tease','flirty','thoughtful','curious'].includes(e.name)){
    this.want.Brow_Raise_Outer_R+=.12*strength;
    this.want.Mouth_Smile_R+=.12*strength;
   }
   if(!this.expressionOverride&&['neutral','content','happy','listening','curious'].includes(e.name)){
    const t=this.time||0,soft=.5+.5*Math.sin(t*.61+this.seed),brow=.5+.5*Math.sin(t*.37+this.seed*2);
    this.want.Mouth_Smile_L+=.035*soft;this.want.Mouth_Smile_R+=.028*soft;
    for(const side of ['L','R']){this.want['Cheek_Raise_'+side]+=.012*soft;this.want['Brow_Raise_Inner_'+side]+=.025*brow;}
   }
   if(e.time>e.hold+25&&!this.expressionOverride){e.name='content';e.intensity=.62;e.time=0;e.source='idle';}
   if(this.idleKind==='sigh'&&!this.speech?.active)this.want.Jaw_Open=.065*(this.gestureWeight||0);
   if(this.greetingSmileT>0){this.greetingSmileT=Math.max(0,this.greetingSmileT-dt);const smile=.24*smooth(this.greetingSmileT/.6);for(const n of ['Mouth_Smile','Mouth_Smile_L','Mouth_Smile_R'])if(n in this.want)this.want[n]=Math.max(this.want[n],smile);}
   this.expressionJaw=this.want.Jaw_Open;
   // Gaze-coupled lids: looking down drops the upper lid; looking up opens a little.
   // Rest Eye_Blink in the pose is the main stare-killer; this only adds a few percent.
   const lookDown=Math.max(this.want.Eye_L_Look_Down||0,this.want.Eye_R_Look_Down||0);
   const lookUp=Math.max(this.want.Eye_L_Look_Up||0,this.want.Eye_R_Look_Up||0);
   const lidFollow=lookDown*.18-lookUp*.06;
   this.want.Eye_Blink_L=(this.want.Eye_Blink_L||0)+lidFollow;
   this.want.Eye_Blink_R=(this.want.Eye_Blink_R||0)+lidFollow;
   this.want.Eye_Wide_L=Math.max(0,(this.want.Eye_Wide_L||0)-lookDown*.35);
   this.want.Eye_Wide_R=Math.max(0,(this.want.Eye_Wide_R||0)-lookDown*.35);
   this.blinkT-=dt;
   if(this.blinkT<=0&&this.blinkHold<=0){this.blinkHold=.18;this.blinkT=(2.5+Math.random()*3.5)/1.3;this.blinkAsym=Math.random()<.12?0:(Math.random()<.5?-1:1);this.halfBlink=Math.random()<.08;}
   let blink=0;
   if(this.blinkHold>0){this.blinkHold=Math.max(0,this.blinkHold-dt);const t=.18-this.blinkHold;blink=smooth(t<.055?t/.055:1-(t-.055)/.125);if(this.halfBlink)blink*=.55;}
   const lag=this.blinkAsym*.018,blinkL=blink,blinkR=this.blinkHold>0?smooth(Math.max(0,(.18-this.blinkHold-lag))<.055?(.18-this.blinkHold-lag)/.055:1-Math.max(0,.18-this.blinkHold-lag-.055)/.125)* (this.halfBlink?.55:1):0;
   this.want.Eye_Blink_L=Math.max(this.want.Eye_Blink_L||0,blinkL);
   this.want.Eye_Blink_R=Math.max(this.want.Eye_Blink_R||0,this.blinkAsym?blinkR:blinkL);
   this.cur.Eye_Blink_L=this.want.Eye_Blink_L;this.cur.Eye_Blink_R=this.want.Eye_Blink_R;
   if(blink>.4){this.want.Cheek_Raise_L=Math.max(0,(this.want.Cheek_Raise_L||0)-blink*.08);this.want.Cheek_Raise_R=Math.max(0,(this.want.Cheek_Raise_R||0)-blink*.08);}
  }
  tickSpeechFace(dt){
   const sp=this.speech;if(!sp?.active)return false;
   const upper={};for(const n of MORPH)if(/Brow|Eye|Nose|Cheek|Smile|Dimple/.test(n))upper[n]=this.want[n];
   super.tickSpeechFace(dt);
   Object.assign(this.want,upper);
   // Silence closes the mouth; preserve the supplied amplitude zero.
   const amp=clamp(Number.isFinite(sp.amp)?sp.amp:0,0,1);
   for(const n of ['Jaw_Open','V_Open','V_Wide','V_Tight_O','V_Lip_Open'])this.want[n]*=smooth(amp*3);
   // Stop late/missing audio callbacks from holding an expression indefinitely.
   if(sp.t>sp.duration+2)this.endSpeech();
   return true;
  }
  tickRest(){
   // restArm/poseArms own the hanging arm pose; no additive T-pose shove.
  }
  tickFingers(curl){
   const t=this.time||0;this.fingerRigs??={};
   const rotation=new THREE.Quaternion(),e=new THREE.Euler();
   for(const side of ['L','R']){
    const holding=this.heldBall&&side==='R';
    const open=['wave','explain'].includes(this.idleKind)||this.speech?.active;
    const tense=this.emotion?.name==='angry'||this.emotion?.name==='afraid';
    const target=holding?.88:tense?.6:open?.08:.21;
    const cur=this['finger'+side]=damp(this['finger'+side]??.21,target,7,this.dt||.016);
    const rig=this.fingerRigs[side]||(this.fingerRigs[side]=makeFingerRig(this.bones,this.bindQ,side));
    for(const row of ['Thumb','Index','Mid','Ring','Pinky'])for(let j=1;j<=3;j++){
     fingerRotation(rig,row,j,cur,t,rotation);e.setFromQuaternion(rotation,'XYZ');this.addE(side+'_'+row+j,e.x,e.y,e.z);
    }
   }
  }
  tickIdle(t,dt){
   if(this.dead||this.balance.state!=='standing')return;
   this.idleT-=dt;
   if(this.idleT<=0){
    const choices=['rest','rest','rest','rest','weightShift','weightShift','breathe','sigh','lookAround','shoulderRoll'];
    this.idleKind=this.idleChoice!=='auto'?this.idleChoice:choices[Math.floor(Math.random()*choices.length)];
    if(['sad','concerned','tired','angry'].includes(this.emotion.name)&&['dance','wiggle'].includes(this.idleKind))this.idleKind='breathe';
    this.idleDur=this.idleKind==='rest'?6+Math.random()*6:4+Math.random()*3;this.idleT=this.idleDur;
   }
   const u=clamp(1-this.idleT/this.idleDur,0,1);
   this.gestureWeight=this.idleChoice!=='auto'?damp(this.gestureWeight||0,1,6,dt):this.idleKind==='rest'?0:smooth(u/.22)*smooth((1-u)/.24);
   const w=this.gestureWeight;
   this.addE('Hip',0,Math.sin(t*.47+this.seed)*.013,.023*Math.sin(t*.32+this.seed));
   this.addE('Spine02',.009*Math.sin(t*1.15),0,-.01*Math.sin(t*.32+this.seed));
   const feeling=this.emotion.name,strength=this.emotion.intensity*Math.exp(-Math.max(0,this.emotion.time-this.emotion.hold)/16);
   if(['sad','tired','concerned'].includes(feeling)){this.addE('Spine02',.045*strength,0,0);this.addE('Head',.035*strength,0,0);}
   if(feeling==='curious')this.addE('Head',0,0,.035*strength);
   if(this.idleKind==='weightShift')this.addE('Hip',0,.025*w,.045*w);
   if(this.idleKind==='shoulderRoll'){
    this.addE('L_Clavicle',Math.sin(u*Math.PI*2)*.045*w,0,.035*w);
    this.addE('R_Clavicle',Math.sin(u*Math.PI*2+.3)*.045*w,0,-.035*w);
   }
   if(this.idleKind==='neckStretch')this.addE('Head',.08*w,0,.12*w);
   if(this.idleKind==='lookAround')this.addE('Head',0,.3*Math.sin(u*Math.PI*2)*w,0);
   if(this.idleKind==='sigh'){this.addE('Spine02',.045*Math.sin(u*Math.PI)*w,0,0);this.addE('Head',.055*w,0,0);}
   if(this.idleKind==='armStretch')this.addE('Spine02',-.045*w,0,0);
   if(['wiggle','dance'].includes(this.idleKind)){
    const beat=this.idleKind==='dance'?3.8:2.2;
    this.addE('Hip',.016*w,Math.sin(t*beat)*.075*w,Math.sin(t*beat)*.035*w);
    this.addE('Spine02',0,-Math.sin(t*beat)*.055*w,-Math.sin(t*beat)*.018*w);
    this.addE('Head',.03*Math.sin(t*beat)*w,0,0);
   }
  }
  tickWalk(moving){
   if(this.dead||this.balance.state!=='standing')return;
   super.tickWalk(moving);
   this.group.position.y-=.022*this.shape.height*clamp((this.speed-.5)/.18,0,1);
   const s=clamp(this.speed/.6,0,1),p=this.walkT;
   this.addE('Spine02',this.gait===3?.035*s:0,-Math.sin(p)*.025*s,0);
   this.addE('L_Clavicle',.016*Math.sin(p)*s,0,0);this.addE('R_Clavicle',-.016*Math.sin(p)*s,0,0);
  }
  die(){
   if(this.dead)return;
   this.dead=true;this.autonomy=false;this.autoWander=false;this.dest=null;this.navigation=null;this.speed=0;this.pathSpeed=0;this.mode='idle';this.modeT=0;
   this.socialPair?.cancel();this.endSpeech?.();this.directedWalk=null;
   if(this.seat){this.seat.occupant=null;this.seat=null;}
   if(this.balance.state==='standing')this.knockDown(new THREE.Vector3(0,0,-1));
   else{this.balance.state='loose';this.balance.time=0;}
  }
  wander(dt){
   if(this.dead||this.balance.state!=='standing'||this.grabs.size){this.speed=damp(this.speed,0,10,dt);this.pathSpeed=this.speed;return false;}
   if(this.pathSpeed!==undefined)this.speed=this.pathSpeed;
   if(this.autoWander&&this.mode==='wander'&&!this.dest&&!this.held&&(this.miraWalk||0)<=0){
    this.miraWalk=5+Math.random()*6;
    const here=this.group.position;
    for(let k=0;k<10;k++){
     const p=here.clone();p.x+=(Math.random()-.5)*7;p.z+=(Math.random()-.5)*7;p.y=0;
     if(!this.world?.blocked?.(p,.3)){this.dest=p;break;}
    }
   }
   const before=this.group.position.clone();const moving=super.wander(dt);
   if(this.directedWalk&&!this.dest&&!this.navigation){this.directedWalk=null;this.autoWander=false;this.mode='idle';this.modeT=0;this.speed=0;this.pathSpeed=0;}
   const moodSpeed=['sad','tired'].includes(this.emotion.name)?.8:1;
   const factor=([1,1.12,.84,1.25,.68,.92][this.gait]||1)*moodSpeed*((this.directedWalk||this.navigation)?1.45:1);
   this.group.position.sub(before).multiplyScalar(factor).add(before);this.pathSpeed=this.speed;this.speed*=factor;
   return moving;
  }
  solveChain(side,kind,target,pole){
   const names=kind==='arm'?['Upperarm','Forearm','Hand']:['Thigh','Calf','Foot'];
   const [a,b,c]=names.map(n=>this.bones[side+'_'+n]);if(!a||!b||!c)return;
   const pa=a.getWorldPosition(V()),pb=b.getWorldPosition(V()),pc=c.getWorldPosition(V());
   const l1=pa.distanceTo(pb),l2=pb.distanceTo(pc),dir=target.clone().sub(pa),dist=clamp(dir.length(),Math.sqrt(l1*l1+l2*l2+2*l1*l2*Math.cos((kind==='arm'?145:140)*Math.PI/180)),(l1+l2)*.998);
   if(dir.lengthSq()<1e-9)return;dir.normalize();
   const bend=pole.clone().sub(pa);bend.addScaledVector(dir,-bend.dot(dir));
   if(bend.lengthSq()<1e-8)bend.set(0,0,1).addScaledVector(dir,-dir.z);bend.normalize();
   const along=(l1*l1+dist*dist-l2*l2)/(2*dist);
   const joint=pa.clone().addScaledVector(dir,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along)));
   this.aimBone(a,b,joint);this.aimBone(b,c,pa.clone().addScaledVector(dir,dist));
  }
  poseArms(){
   if(this.dead)return;
   const h=this.shape.height,t=this.time,w=this.gestureWeight||0,step=clamp(this.speed/.65,0,1);
   for(const side of ['L','R']){
    if([...this.grabs.values()].some(g=>g.side===side&&g.limb==='arm'))continue;
    const sign=side==='L'?1:-1;
    const hand=this.bones[side+'_Hand'];if(!hand)continue;
    const dst=this.restArm(side,step);
    this.group.worldToLocal(dst);dst.divideScalar(h);
    const gesture=dst.clone();
    if(!step){
     if(this.idleKind==='handsTogether')gesture.set(sign*.046,1.02,.19);
     if(this.idleKind==='handsOnHips'||this.idleKind==='handOnHip'&&side==='L')gesture.set(sign*(.19+.040*(this.shape.hips-1)),1.035,-.018);
     if(this.idleKind==='hairTuck'&&side==='R')gesture.set(-.14,1.48,.015);
     if(this.idleKind==='lookAtHand'&&side==='R')gesture.set(-.14,1.19,.28);
     if(this.idleKind==='wave'&&side==='R')gesture.set(-.30+Math.sin(t*6)*.025,1.52,.15);
     if(this.idleKind==='explain')gesture.set(sign*.22,1.15,.26);
     if(this.idleKind==='armStretch')gesture.set(sign*.31,1.69,.08);
     if(this.idleKind==='dance')gesture.set(sign*(.29+.035*Math.sin(t*3.8)),1.09+.08*Math.sin(t*3.8+(side==='L'?0:Math.PI)),.22);
     if(this.idleKind==='wiggle')gesture.set(sign*.29,1.01,.10);
     dst.lerp(gesture,w);
    }
    if(this.speech?.active&&side==='R')dst.lerp(new THREE.Vector3(-.24,1.10+.03*Math.sin(t*3),.25),.55+.15*Math.sin(t*2.7));
    if(this.mode==='stretch')dst.set(sign*.28,1.71,.07);
    if(this.mode==='airSquats')dst.set(sign*.22,1.21,.34);
    if(this.mode==='jumpingJacks'){const a=(1-Math.cos(this.modeT*4.4))/2;dst.set(sign*(.26+.31*Math.sin(a*Math.PI)),.9+.81*a,.055);}
    if(EXERCISE_MODES.includes(this.mode))this.activityHandTarget(dst,side);
    dst.multiplyScalar(h);this.group.localToWorld(dst);
    const rest=hand.getWorldPosition(V());
    if(dst.distanceTo(rest)<.0015*h){this.handTargets[side]=rest.clone();continue;}
    const current=this.handTargets[side]||(this.handTargets[side]=rest.clone());current.lerp(dst,1-Math.exp(-this.dt*8));
    const hipPose=['handsOnHips','handOnHip'].includes(this.idleKind);
    const pole=new THREE.Vector3(sign*(hipPose?.58:.30),1.05,hipPose?.015:-.20).multiplyScalar(h);this.group.localToWorld(pole);
    this.solveChain(side,'arm',current,pole);
   }
  }
  restArm(side,step){
   const sign=side==='L'?1:-1,a=this.bones[side+'_Upperarm'],b=this.bones[side+'_Forearm'],c=this.bones[side+'_Hand'];
   // Reset just the two long bones. Finger flexion remains owned by tickFingers.
   a.quaternion.copy(this.bindQ[a.name]);b.quaternion.copy(this.bindQ[b.name]);
   this.group.updateMatrixWorld(true);
   const shoulder=a.getWorldPosition(V()),elbow=b.getWorldPosition(V()),wrist=c.getWorldPosition(V()),l1=shoulder.distanceTo(elbow),l2=elbow.distanceTo(wrist);
   const state=this.armSwing[side]||(this.armSwing[side]={angle:0,v:0,last:shoulder.clone(),vel:V()});
   const dt=Math.max(.001,this.dt),velocity=shoulder.clone().sub(state.last).divideScalar(dt);
   const accel=cap(velocity.clone().sub(state.vel).divideScalar(dt),6).applyQuaternion(this.group.getWorldQuaternion(new THREE.Quaternion()).invert());
   state.last.copy(shoulder);state.vel.copy(velocity);
   const target=sign*Math.sin(this.walkT-.18)*.26*step+.014*Math.sin(this.time*.77+this.seed+sign);
   state.v=(state.v+dt*(31*(target-state.angle)-accel.z*.24))/(1+5.4*dt+31*dt*dt);state.angle=clamp(state.angle+dt*state.v,-.48,.48);
   const clearance=.08+.06*Math.max(0,this.shape.hips-1)+.025*(this.shape.arms-1);
   const upperAngle=state.angle-.22,lowerAngle=state.angle+.30+.02*step;
   const upper=new THREE.Vector3(sign*clearance,-Math.cos(upperAngle),Math.sin(upperAngle)).normalize();
   const lower=new THREE.Vector3(sign*(clearance*.55),-Math.cos(lowerAngle),Math.sin(lowerAngle)).normalize();
   const rot=this.group.getWorldQuaternion(new THREE.Quaternion());upper.applyQuaternion(rot);lower.applyQuaternion(rot);
   elbow.copy(shoulder).addScaledVector(upper,l1);wrist.copy(elbow).addScaledVector(lower,l2);
   this.aimBone(a,b,elbow);this.aimBone(b,c,wrist);
   return c.getWorldPosition(V());
  }
  activityHandTarget(dst,side){
   const sign=side==='L'?1:-1,t=this.modeT,phase=t*3.4+(side==='L'?0:Math.PI);
   if(this.mode==='march')dst.set(sign*.25,1.00+.035*Math.cos(phase),.10-.13*Math.sin(phase));
   if(this.mode==='sideSteps')dst.set(sign*.29,1.02+.04*Math.sin(t*2.2),.12);
   if(this.mode==='dance')dst.set(sign*(.28+.07*Math.sin(t*3.8)),1.09+.16*Math.sin(t*3.8+sign),.20+.055*Math.cos(t*3.8));
   if(this.mode==='reach')dst.set(sign*.25,1.10+.57*(.5+.5*Math.sin(t*1.6+sign)),.18);
   if(this.mode==='heelRaises')dst.set(sign*.24,.96,.065);
  }
  poseActivity(){
   if(!EXERCISE_MODES.includes(this.mode)||this.grabs.size||this.balance.state!=='standing')return;
   const t=this.modeT,h=this.shape.height,mode=this.mode;
   let rootY=-.004,rootZ=0,lean=0,roll=0;
   const squat=(1-Math.cos(t*1.8))/2,jack=(1-Math.cos(t*4.4))/2;
   if(mode==='airSquats'){rootY-=.205*squat;rootZ=-.05*squat;lean=.16*squat;}
   if(mode==='jumpingJacks')rootY+=.06*Math.abs(Math.sin(t*4.4));
   if(mode==='dance'){rootY-=.025+.020*Math.sin(t*7.6);roll=.035*Math.sin(t*3.8);}
   if(mode==='sideSteps')rootY-=.012*Math.abs(Math.sin(t*2.2));
   if(mode==='heelRaises')rootY+=.050*(.5-.5*Math.cos(t*2.1));
   this.group.position.y=this.baseY+rootY*h;
   if(this.bones.Hip){this.bones.Hip.position.copy(this.bindPos.Hip);this.bones.Hip.position.z+=rootZ;}
   for(const name of ['Spine01','Spine02'])this.bones[name]?.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(lean*.5,0,roll*.5)));
   this.group.updateMatrixWorld(true);
   for(const side of ['L','R']){
    const sign=side==='L'?1:-1,phase=t*3.4+(side==='L'?0:Math.PI);
    const dst=new THREE.Vector3(sign*.10,this.ankleRestY[side],.013);
    if(mode==='airSquats')dst.x=sign*.15;
    if(mode==='jumpingJacks'){dst.x=sign*(.10+.13*jack);dst.y+=.06*Math.abs(Math.sin(t*4.4));}
    if(mode==='march'){const lift=Math.max(0,Math.sin(phase));dst.y+=.17*lift;dst.z+=.10*lift;}
    if(mode==='sideSteps'){const travel=Math.sin(t*2.2);dst.x+=.065*travel;dst.y+=.038*Math.max(0,sign*Math.cos(t*2.2));}
    if(mode==='dance'){dst.x+=.025*Math.sin(t*3.8);dst.y+=.012*Math.max(0,sign*Math.cos(t*3.8));}
    if(mode==='heelRaises')dst.y+=.043*(.5-.5*Math.cos(t*2.1));
    const ankleY=dst.y*h;dst.multiplyScalar(h);this.group.localToWorld(dst);dst.y=this.baseY+ankleY;
    const pole=new THREE.Vector3(sign*.15,.50,.42).multiplyScalar(h);this.group.localToWorld(pole);this.solveChain(side,'leg',dst,pole);
    const foot=this.bones[side+'_Foot'];if(foot){const parent=foot.parent.getWorldQuaternion(new THREE.Quaternion());foot.quaternion.copy(parent.invert().multiply(this.group.getWorldQuaternion(new THREE.Quaternion()))).multiply(this.footRestQ?.[side]||new THREE.Quaternion());}
   }
   this.group.updateMatrixWorld(true);
  }
  tickAwareness(dt,cam){
   if(this.dead){this.autonomy=false;this.autoWander=false;this.dest=null;return;}
   this.tickAttention(dt,cam);
   this.greetingT-=dt;this.lifeT-=dt;
   if(this.seat){this.sitHold=(this.sitHold||0)+dt;if(this.seat.piano)this.world.piano?.keepPlaying?.(this);const limit=this.seat.sitDuration||(7+Math.random()*8);if(this.sitHold>limit){this.world.piano?.stopIf?.(this);this.seat.occupant=null;this.group.position.copy(this.seat.approach);this.seat=null;this.sitHold=0;this.setMode('wander');this.lifeT=6+Math.random()*6;}return;}
   if(this.socialPair||this.directedWalk||this.navigation)return;
   if(this.balance.state!=='standing'||this.grabs.size||this.speech?.active||this.mode==='talk')return;
   if(this.autonomy&&this.greetingT<=0){
    const candidates=[cam,...(this.neighbors||[]).filter(a=>a!==this).map(a=>a.bones.Head.getWorldPosition(V()))];
    const other=candidates.find(p=>p.distanceTo(this.bones.Head.getWorldPosition(V()))<3.2);
    if(other){this.attention.copy(other);this.attentionT=3;if(this.idleChoice==='auto'){this.idleKind='lookAround';this.idleT=this.idleDur=4.5;this.gestureWeight=0;}this.greetingSmileT=3;this.lifeT=Math.max(this.lifeT,5);}
    this.greetingT=22+Math.random()*22;
   }
   if(this.attentionMode==='hyperattentive')return;
   if(!this.autonomy||this.lifeT>0)return;
   const seats=this.world?.seats?.filter(s=>s&&!s.occupant&&s.approach)||[];
   if(this.mode!=='wander'&&seats.length&&Math.random()<.42&&this.world.walk){
    const seat=seats[Math.floor(Math.random()*seats.length)];
    if(this.world.walk(this,seat.approach,seat)){this.sitHold=0;this.lifeT=14;return;}
   }
   if(this.mode==='wander'){
    super.setMode('idle');this.autoWander=false;this.dest=null;this.lifeT=3+Math.random()*5;
   }else{
    super.setMode('wander');this.autoWander=true;this.gait=[0,2,5][Math.floor(Math.random()*3)];this.lifeT=8+Math.random()*10;
   }
  }
  tickAttention(dt,cam){
   if(this.dead||this.balance.state!=='standing'||this.grabs.size||this.seat||this.socialPair)return;
   const mode=this.attentionMode||'attentive';
   const player=cam.clone().setY(0),me=this.group.position.clone().setY(0),dist=me.distanceTo(player);
   this.lookPhaseT-=dt;this.glanceT-=dt;
   if(this.lookPhaseT<=0){
    if(mode==='hyperattentive')this.lookPhase=true;
    else if(mode==='ignoring')this.lookPhase=Math.random()<.14;
    else this.lookPhase=Math.random()<.5;
    this.lookPhaseT=(this.lookPhase?3.5:5)+Math.random()*4;
   }
   const follow=mode==='hyperattentive'||(mode==='attentive'&&this.lookPhase);
   if(follow){
    const stand=1.28,away=player.clone().sub(me);if(away.lengthSq()<.0001)away.set(this.followSide,0,1);
    away.setY(0).normalize();
    const side=new THREE.Vector3(-away.z,0,away.x).multiplyScalar(this.followSide*.35);
    const slot=player.clone().addScaledVector(away,-stand).add(side);
    if(dist>1.55){this.dest=slot;this.autoWander=true;if(this.mode==='idle')super.setMode('wander');this.miraWalk=8;}
    else if(dist<1.05){this.dest=slot;this.autoWander=true;}
    else if(!this.navigation){this.dest=null;this.autoWander=false;if(this.mode==='wander'&&!this.directedWalk)super.setMode('idle');}
    this.lifeT=Math.max(this.lifeT,4);
   }else if(mode==='ignoring'){
    if(dist<1.85){this.ignoreCloseT+=dt;if(this.ignoreCloseT>3.2){const flee=me.clone().sub(player);if(flee.lengthSq()<.01)flee.set(this.followSide,0,1);flee.setY(0).normalize();this.dest=me.clone().addScaledVector(flee,2.4+Math.random()*1.6);this.autoWander=true;super.setMode('wander');this.miraWalk=10;this.ignoreCloseT=0;}}
    else this.ignoreCloseT=Math.max(0,this.ignoreCloseT-dt);
   }
  }
  tickGaze(dt,moving,cam){
   if(this.dead||this.headMissing)return;
   if(!this.speech?.active)this.want.Jaw_Open=this.expressionJaw||0;
   this.attentionT-=dt;
   const hp=this.bones.Head.getWorldPosition(V());
   const mode=this.attentionMode||'attentive';
   const lookPlayer=mode==='hyperattentive'||this.lookPhase||this.glanceT<=0;
   if(this.glanceT<=0)this.glanceT=mode==='ignoring'?4+Math.random()*5:2.2+Math.random()*2.6;
   if(this.attentionT<=0){
    this.attentionT=lookPlayer?.55+Math.random()*.7:(this.speech?.active?1.1:1.5)+Math.random()*2.8;
    const others=(this.neighbors||[]).filter(a=>a!==this&&a.group.position.distanceTo(this.group.position)<3.5);
    if(lookPlayer||this.mode==='talk')this.attention.copy(cam).add(new THREE.Vector3((Math.random()-.5)*.03,.04+(Math.random()-.2)*.05,0));
    else if(Math.random()<.22&&others.length)this.attention.copy(others[Math.floor(Math.random()*others.length)].bones.Head.getWorldPosition(V()));
    else this.attention.copy(hp).add(new THREE.Vector3((Math.random()-.5)*2.4,(Math.random()-.5)*.65,moving?3:1.8).applyQuaternion(this.group.getWorldQuaternion(new THREE.Quaternion())));
   }
   const looking=this.attention.distanceTo(cam)<.55;
   this.smileLook=damp(this.smileLook||0,looking&&lookPlayer?.85:0,3.2,dt);
   if(this.smileLook>.2){
    const s=this.smileLook;
    this.want.Mouth_Smile_L=Math.max(this.want.Mouth_Smile_L||0,.55+s*.55);
    this.want.Mouth_Smile_R=Math.max(this.want.Mouth_Smile_R||0,.58+s*.58);
    this.want.Cheek_Raise_L=Math.max(this.want.Cheek_Raise_L||0,.28+s*.4);
    this.want.Cheek_Raise_R=Math.max(this.want.Cheek_Raise_R||0,.28+s*.4);
    if(looking&&this.emotion.name!=='happy'&&!this.expressionOverride)this.setEmotion('happy',.55,{hold:3,source:'glance'});
   }
   const d=this.attention.clone().sub(hp).applyQuaternion(this.group.getWorldQuaternion(new THREE.Quaternion()).invert());
   const yaw=clamp(Math.atan2(d.x,d.z),-1.15,1.15),pitch=clamp(-Math.atan2(d.y,Math.max(.15,Math.hypot(d.x,d.z))),-.5,.55);
   this.gazeYaw=damp(this.gazeYaw||0,yaw,3.6,dt);this.gazePitch=damp(this.gazePitch||0,pitch,3.4,dt);
   const touch=clamp(this.headTouch.length()*3,0,1),free=1-touch;
   const nod=this.speech?.active?.025*Math.sin(this.time*3.1):.008*Math.sin(this.time*1.13+this.seed);
   const roll=['happy','curious','content'].includes(this.emotion.name)?Math.sin(this.time*.51+this.seed)*.035:0;
   this.addE('Head',(this.gazePitch*.56+nod)*free,this.gazeYaw*.55*free,roll*free);
   this.addE('NeckTwist02',this.gazePitch*.22*free,this.gazeYaw*.25*free,roll*.25*free);
   this.addE('NeckTwist01',this.gazePitch*.10*free,this.gazeYaw*.10*free,0);
   const eyeY=clamp(yaw-this.gazeYaw*.90*free-this.headTouch.y,-.34,.34);
   const eyeX=clamp(pitch-this.gazePitch*.88*free-this.headTouch.x,-.22,.22);
   this.eyeYaw=damp(this.eyeYaw||0,eyeY,24,dt);this.eyePitch=damp(this.eyePitch||0,eyeX,24,dt);
   const vergence=clamp(Math.atan2(.030,Math.max(.28,d.length())),0,.085);this.addE('L_Eye',this.eyePitch,this.eyeYaw-vergence,0);this.addE('R_Eye',this.eyePitch,this.eyeYaw+vergence,0);
   for(const side of ['L','R']){
    this.want['Eye_'+side+'_Look_L']=Math.max(0,-this.eyeYaw)*.45;this.want['Eye_'+side+'_Look_R']=Math.max(0,this.eyeYaw)*.45;
    this.want['Eye_'+side+'_Look_Up']=Math.max(0,-this.eyePitch)*.7;this.want['Eye_'+side+'_Look_Down']=Math.max(0,this.eyePitch)*.7;
   }
  }
  poseHeadContact(dt){
   if(this.headMissing)return;
   const held=[...this.grabs.values()].some(g=>g.head);
   if(!held){
    this.headTouchGoal.multiplyScalar(Math.exp(-dt*4));
    const center=this.bones.Head.localToWorld(new THREE.Vector3(0,.055,.015));
    for(const c of this.externalHands){
     const d=c.b.clone().sub(c.a),u=clamp(center.clone().sub(c.a).dot(d)/Math.max(1e-8,d.lengthSq()),0,1);
     const closest=c.a.clone().addScaledVector(d,u),away=center.clone().sub(closest),dist=away.length(),radius=.085*this.shape.height+c.r;
     if(dist<radius&&dist>.001){away.multiplyScalar((radius-dist)/dist).applyQuaternion(this.group.getWorldQuaternion(new THREE.Quaternion()).invert());this.headTouchGoal.x+=clamp(away.z*2,-.08,.08);this.headTouchGoal.y+=clamp(away.x*2.5,-.1,.1);}
    }
   }
   this.headTouchGoal.clamp(new THREE.Vector3(-.55,-.95,-.2),new THREE.Vector3(.6,.95,.2));
   this.headTouch.lerp(this.headTouchGoal,1-Math.exp(-dt*(held?14:5)));
   for(const [name,weight] of [['Head',.66],['NeckTwist02',.24],['NeckTwist01',.10]]){
    const bone=this.bones[name];if(bone)bone.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(this.headTouch.x*weight,this.headTouch.y*weight,this.headTouch.z*weight,'YXZ')));
   }
  }
  poseSpineContact(dt){
   if(![...this.grabs.values()].some(g=>g.body))this.spineGoal.multiplyScalar(Math.exp(-dt*3.5));
   this.spineTouch.lerp(this.spineGoal,1-Math.exp(-dt*8));
   for(const [name,w] of [['Waist',.22],['Spine01',.34],['Spine02',.44]]){
    const bone=this.bones[name];if(bone)bone.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(this.spineTouch.x*w,this.spineTouch.y*w,this.spineTouch.z*w,'YXZ')));
   }
   this.group.updateMatrixWorld(true);
  }
  handContact(pos,rad,velocity,react=true){
   this.handContactScale=this.shape.handResponse??2.7;
   try{return super.collidePoint(pos,rad,velocity,true,react);}finally{this.handContactScale=null;}
  }
  contactSoft(hit,normal,push,closing){
   const scale=this.handContactScale??1;
   super.contactSoft(hit,normal,push*scale,closing*scale);
   if(this.handContactScale!==null&&this.handContactScale!==undefined)this.surfaceFlesh?.contact(hit,normal,closing*scale,push*scale);
  }
  nearestHit(pos,maxDist){
   let best=super.nearestHit(pos,maxDist),bd=maxDist,point=null,chosen=null;
   const seen=new Set();
   this.root.traverse(mesh=>{
    if(!mesh.isSkinnedMesh||!/body/.test(mesh.name)||seen.has(mesh.geometry.attributes.position))return;
    seen.add(mesh.geometry.attributes.position);
    const posAttr=mesh.geometry.attributes.position;
    for(let i=0;i<posAttr.count;i+=2){
     mesh.getVertexPosition(i,tmp).applyMatrix4(mesh.matrixWorld);const distance=tmp.distanceTo(pos);
     if(distance>=bd)continue;
     const si=mesh.geometry.attributes.skinIndex,sw=mesh.geometry.attributes.skinWeight;let weight=-1,bone=null;
     for(let j=0;j<4;j++)if(sw.array[i*4+j]>weight){weight=sw.array[i*4+j];bone=mesh.skeleton.bones[si.array[i*4+j]];}
     while(bone&&!BODY_HIT.some(h=>h.name===bone.name))bone=bone.parent;
     const hit=bone&&BODY_HIT.find(h=>h.name===bone.name);
     if(hit){bd=distance;chosen=hit;point=tmp.clone();}
    }
   });
   const result=chosen||best;
   if(result&&!/arm|hand|thigh|leg|foot/.test(result.kind)){
    let limb=null,limbD=.12;
    for(const hit of BODY_HIT){
     if(!/arm|hand|thigh|leg|foot/.test(hit.kind))continue;
     const radius=this.hitSegment(hit);if(!radius)continue;
     const bone=this.bones[hit.name];if(!bone)continue;
     tmp.set(...(hit.offset||[0,0,0])).applyMatrix4(bone.matrixWorld);
     if(hit.end&&this.bones[hit.end])tmp2.setFromMatrixPosition(this.bones[hit.end].matrixWorld);else tmp2.copy(tmp);
     tmp3.subVectors(tmp2,tmp);axis.copy(pos).sub(tmp);
     const u=clamp(axis.dot(tmp3)/Math.max(1e-10,tmp3.lengthSq()),0,1);
     axis.copy(tmp).addScaledVector(tmp3,u);
     const d=pos.distanceTo(axis)-radius;
     if(d<limbD){limbD=d;limb=hit;point=axis.clone();}
    }
    if(limb){chosen=limb;bd=limbD;}
   }
   this.lastSurfacePoint=point;this.lastHitDistance=chosen?bd:this.lastHitDistance;return chosen||best;
  }
  beginGrab(ctrl,hit,contact){
   this.socialPair?.cancel();this.directedWalk=null;if(this.navigation?.seat)this.navigation.seat.occupant=null;this.navigation=null;if(this.seat){this.seat.occupant=null;this.group.position.y=this.baseY||0;}this.seat=null;
   if(this.grabs.has(ctrl))return;
   const bone=this.bones[hit.name];if(!bone)return;
   const anchor=contact?.clone()||this.lastSurfacePoint?.clone()||ctrl.getWorldPosition(V());
   const g={ctrl,hit,side:hit.name.startsWith('L_')?'L':hit.name.startsWith('R_')?'R':null,
    limb:/arm|hand/.test(hit.kind)?'arm':/thigh|leg|foot/.test(hit.kind)?'leg':null,
    local:bone.worldToLocal(anchor.clone()),last:ctrl.getWorldPosition(V()),velocity:V(),pull:V(),elapsed:0,offset:ctrl.getWorldPosition(V()).sub(anchor),spring:this.soft.find(s=>s.name===hit.name)||null,tx:0,ty:0,tz:0};
   if(['hip','belly','chest'].includes(hit.kind)){g.body=true;g.gripQ=ctrl.getWorldQuaternion(new THREE.Quaternion());g.spineStart=this.spineTouch.clone();g.startYaw=this.group.rotation.y;}
   if(hit.kind==='head'){g.head=true;g.gripQ=ctrl.getWorldQuaternion(new THREE.Quaternion());g.headStart=this.headTouch.clone().add(new THREE.Vector3(this.gazePitch*.88,this.gazeYaw*.9,0));}
   this.grabs.set(ctrl,g);this.held=[...this.grabs.values()][0];this.dest=null;this.feet={};this.setEmotion('surprise',.35,{hold:2,source:'interaction'});
  }
  tickGrab(dt){
   if(!(dt>0)||this.inBaseTick)return;
   for(const g of this.grabs.values()){
    const bone=this.bones[g.hit.name],p=g.ctrl.getWorldPosition(V()).sub(g.offset);
    const delta=g.ctrl.getWorldPosition(V()).sub(g.last);g.last.copy(p).add(g.offset);
    if(delta.length()>.55){this.endGrab(g.ctrl);continue;}
    g.velocity.lerp(cap(delta.multiplyScalar(1/Math.max(dt,.001)),3),1-Math.exp(-18*dt));g.elapsed+=dt;
    const anchor=bone.localToWorld(g.local.clone()),pull=p.clone().sub(anchor);g.pull.copy(pull);
    if(g.head){
     const deltaQ=g.ctrl.getWorldQuaternion(new THREE.Quaternion()).multiply(g.gripQ.clone().invert());
     const groupQ=this.group.getWorldQuaternion(new THREE.Quaternion());deltaQ.premultiply(groupQ.clone().invert()).multiply(groupQ);
     const e=new THREE.Euler().setFromQuaternion(deltaQ,'YXZ'),local=pull.clone().applyQuaternion(groupQ.invert());
     this.headTouchGoal.copy(g.headStart).add(new THREE.Vector3(e.x-local.y*2.5,e.y+local.x*3,e.z*.4));
     if(this.dead||this.balance.state!=='standing')this.carryByGrab(p,dt,g);
     continue;
    }
    if(g.spring){
     const local=pull.clone().applyQuaternion(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
     const temp={...g.spring,x:local.x,y:local.y,z:local.z,vx:0,vy:0,vz:0};this.limitSoft(temp);g.tx=temp.x;g.ty=temp.y;g.tz=temp.z;
     if(this.dead||this.balance.state!=='standing')this.carryByGrab(p,dt,g);
     continue;
    }
    const h=this.shape.height;
    if(g.body){
     const groupQ=this.group.getWorldQuaternion(new THREE.Quaternion()),dq=g.ctrl.getWorldQuaternion(new THREE.Quaternion()).multiply(g.gripQ.clone().invert());
     dq.premultiply(groupQ.clone().invert()).multiply(groupQ);const e=new THREE.Euler().setFromQuaternion(dq,'YXZ');
     this.spineGoal.copy(g.spineStart).add(new THREE.Vector3(e.x*.35,e.y*.18,e.z*.28));
     this.spineGoal.clamp(new THREE.Vector3(-.16,-.14,-.14),new THREE.Vector3(.18,.14,.14));
     const turn=Math.atan2(Math.sin(g.startYaw+e.y*.65-this.group.rotation.y),Math.cos(g.startYaw+e.y*.65-this.group.rotation.y));this.group.rotation.y+=clamp(turn,-1.2*dt,1.2*dt);
    }
    if(g.limb){
     const names=g.limb==='arm'?['Upperarm','Forearm','Hand']:['Thigh','Calf','Foot'];
     const proximal=g.hit.name===g.side+'_'+names[0];
     const end=this.bones[g.side+'_'+names[2]],tip=end.getWorldPosition(V()).add(pull);
     const pole=new THREE.Vector3((g.side==='L'?1:-1)*(g.limb==='arm'?.45:.12),g.limb==='arm'?1.12:.52,g.limb==='arm'?-.20:.3).multiplyScalar(h);this.group.localToWorld(pole);
     if(proximal){const b=this.bones[g.side+'_'+names[0]],child=this.bones[g.side+'_'+names[1]];this.aimBone(b,child,child.getWorldPosition(V()).add(pull));}
     else this.solveChain(g.side,g.limb,tip,pole);
    }
    const horizontal=Math.hypot(pull.x,pull.z),leg=g.limb==='leg';
    if(this.balance.state==='standing'&&!this.dead){
     const threshold=leg?.13*h:.31*h;
     this.balance.stress=Math.max(this.balance.stress,Math.max(0,horizontal-threshold)+(leg?Math.max(0,pull.y-.1*h):0));
     if(horizontal>threshold||g.body||!g.limb){
      const follow=cap(new THREE.Vector3(pull.x,0,pull.z),.35*h);
      this.group.position.addScaledVector(follow,1-Math.exp(-dt*(leg?1.4:g.body?8:4)));
      this.balance.dir.copy(pull).setY(0);cap(this.balance.dir,1);
     }
     if((leg&&(horizontal>.28*h||pull.y>.32*h))||horizontal>.72*h||this.balance.stress>.62*h||((g.body||g.head)&&pull.y>.18*h)){
      this.balance.state='loose';this.balance.time=0;this.balance.q.copy(this.root.quaternion);this.autoWander=false;this.dest=null;this.speed=0;
     }
    }
    if(this.balance.state!=='standing'||this.dead)this.carryByGrab(p,dt,g);
   }
   this.held=[...this.grabs.values()][0]||null;
  }
  placeRootPivot(){
   const h=this.shape.height;
   this.root.position.copy(this.baseRootPos||V());
   const pivot=new THREE.Vector3(0,.92*h,0),rot=pivot.clone().applyQuaternion(this.root.quaternion);
   this.root.position.add(pivot).sub(rot);
  }
  carryByGrab(p,dt,g){
   this.group.updateMatrixWorld(true);
   const bone=this.bones[g.hit.name];if(!bone)return;
   const remaining=p.clone().sub(bone.localToWorld(g.local.clone()));
   const h=this.shape.height,k=1-Math.exp(-dt*(g.body||this.dead?9:7));
   const step=remaining.clone().multiplyScalar(k);
   cap(step,.5*h);cap(step,2.6*dt+.07);
   this.group.position.add(step);
   const b=this.balance;b.q=b.q||new THREE.Quaternion();b.omega=b.omega||V();
   this.group.updateMatrixWorld(true);
   const G=bone.localToWorld(g.local.clone()),hip=this.bones.Hip?this.bones.Hip.getWorldPosition(V()):this.group.position.clone().add(new THREE.Vector3(0,.9*h,0));
   const r=hip.sub(G),torque=r.clone().cross(new THREE.Vector3(0,-1,0));
   const grabs=this.grabs.size,dampSpin=grabs>1?10:2.6;
   b.omega.addScaledVector(torque,dt*(grabs>1?.8:9)/Math.max(8,h*40));
   b.omega.multiplyScalar(Math.exp(-dt*dampSpin));
   if(b.omega.length()>3.2)b.omega.setLength(3.2);
   const ang=b.omega.length();
   if(ang>1e-4){
    const axis=b.omega.clone().normalize();
    b.q.premultiply(new THREE.Quaternion().setFromAxisAngle(axis,Math.min(.09,ang*dt)));b.q.normalize();
    this.root.quaternion.copy(b.q);this.placeRootPivot();this.group.updateMatrixWorld(true);
    const G2=bone.localToWorld(g.local.clone());this.group.position.add(p.clone().sub(G2));
   }
   const gy=this.balance.groundedY;
   if(Number.isFinite(gy)&&this.group.position.y<gy)this.group.position.y=gy;
  }
  endGrab(ctrl){
   const list=ctrl?[this.grabs.get(ctrl)]:[...this.grabs.values()];
   for(const g of list){if(!g)continue;
    if(g.spring){const vv=g.velocity.clone().applyQuaternion(this.bones[g.hit.name].parent.getWorldQuaternion(new THREE.Quaternion()).invert()).multiplyScalar(.08);cap(vv,.2);g.spring.vx=vv.x;g.spring.vy=vv.y;g.spring.vz=vv.z;this.limitSoft(g.spring);}
    else if(!g.head){this.balance.velocity.add(cap(g.velocity.clone().setY(0).multiplyScalar(.18),.6));this.balance.airVel=(this.balance.airVel||0)+g.velocity.y*.42;}
    this.grabs.delete(g.ctrl);
   }
   this.held=[...this.grabs.values()][0]||null;this.feet={};
  }
  knockDown(direction,velocity=V()){
   const b=this.balance;if(this.dead&&b.state!=='standing'){b.state='loose';return;}
   if(b.state==='standing')b.time=0;
   b.state='loose';b.dir.copy(direction).setY(0);if(b.dir.lengthSq()<.001)b.dir.set(0,0,-1);b.dir.normalize();
   b.q=b.q||new THREE.Quaternion();b.omega=b.omega||V();
   const axis=new THREE.Vector3(-b.dir.z,0,b.dir.x).normalize();
   b.omega.addScaledVector(axis,1.6);b.velocity.copy(velocity);b.velocity.y+=.12;cap(b.velocity,.9);
   this.autoWander=false;this.dest=null;this.speed=0;
   if(!this.dead)this.setEmotion('surprise',.7,{hold:3,source:'balance'});
  }
  wander(dt){
   const moving=super.wander(dt);
   const scale=this.waterSpeedScale??1;
   if(scale!==1&&this.moveVel){
    this.group.position.addScaledVector(this.moveVel,dt*(scale-1));
    this.speed*=scale;this.moveVel.multiplyScalar(scale);
   }
   return moving;
  }
  tickBalance(dt){
   if(this.waterSwimming){
    this.balance.airVel=this.waterVelocity?.y||0;
    if(this.waterFaceUp){
     const b=this.balance;b.q=b.q||new THREE.Quaternion();
     b.q.slerp(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2),1-Math.exp(-dt*1.2));
     this.root.quaternion.copy(b.q);this.placeRootPivot?.();
    }
    return;
   }
   const b=this.balance;b.time+=dt;b.stress=Math.max(0,b.stress-dt*.2);
   this.group.position.addScaledVector(b.velocity,dt);b.velocity.multiplyScalar(Math.exp(-dt*4.2));
   b.q=b.q||new THREE.Quaternion();b.omega=b.omega||V();
   const held=this.grabs.size>0,h=this.shape.height;
   if(b.state==='falling')b.state='loose';
   if(b.state==='down')b.state='loose';
   if(b.state==='standing'){
    if(!held){b.q.identity();b.omega.set(0,0,0);b.tilt=0;this.root.quaternion.identity();this.root.position.copy(this.baseRootPos||V());return;}
    this.root.quaternion.copy(b.q);this.placeRootPivot();return;
   }
   this.feet={};
   if(b.state==='recovering'){
    if(held||this.dead){b.state='loose';b.time=0;}
    else{
     b.q.slerp(new THREE.Quaternion(),1-Math.exp(-dt*2.5));b.omega.multiplyScalar(Math.exp(-dt*8));
     const up=new THREE.Vector3(0,1,0).applyQuaternion(b.q);
     if(up.y>.96&&b.time>1.1){b.state='standing';b.time=0;b.tilt=0;b.airVel=0;b.q.identity();this.root.quaternion.identity();this.root.position.copy(this.baseRootPos||V());this.group.position.y=this.baseY;this.feet={};this.handTargets={};this.poseQ={};return;}
    }
   }
   if(!held&&b.state==='loose'){
    this.root.quaternion.copy(b.q);this.placeRootPivot();this.group.updateMatrixWorld(true);
    const hip=this.bones.Hip?this.bones.Hip.getWorldPosition(V()):this.group.position.clone().add(new THREE.Vector3(0,.9*h,0));
    let min=Infinity;for(const spec of BODY_HIT){const bone=this.bones[spec.name];if(!bone)continue;min=Math.min(min,bone.getWorldPosition(tmp).y-spec.rad*h);}
    const support=new THREE.Vector3(hip.x,Number.isFinite(min)?min:this.group.position.y,hip.z);
    const torque=hip.clone().sub(support).cross(new THREE.Vector3(0,-1,0));
    b.omega.addScaledVector(torque,dt*7.5);b.omega.multiplyScalar(Math.exp(-dt*1.8));if(b.omega.length()>4)b.omega.setLength(4);
    const ang=b.omega.length();if(ang>1e-4){b.q.premultiply(new THREE.Quaternion().setFromAxisAngle(b.omega.clone().normalize(),ang*dt));b.q.normalize();}
    b.airVel=(b.airVel||0)-9.81*dt;
   }else if(held)b.airVel=0;
   this.root.quaternion.copy(b.q);this.placeRootPivot();
   if(b.state==='recovering'&&!this.dead){
    const k=Math.sin(Math.PI*clamp(b.time/2.8,0,1));
    this.bones.L_Thigh?.quaternion.multiply(q.setFromAxisAngle(new THREE.Vector3(1,0,0),.4*k));
    this.bones.R_Thigh?.quaternion.multiply(q.setFromAxisAngle(new THREE.Vector3(1,0,0),.7*k));
    this.bones.L_Calf?.quaternion.multiply(q.setFromAxisAngle(new THREE.Vector3(1,0,0),-.7*k));
    this.bones.R_Calf?.quaternion.multiply(q.setFromAxisAngle(new THREE.Vector3(1,0,0),-.95*k));
   }
   this.group.updateMatrixWorld(true);
   let min=Infinity;for(const spec of BODY_HIT){const bone=this.bones[spec.name];if(!bone)continue;min=Math.min(min,bone.getWorldPosition(tmp).y-spec.rad*h);}
   const groundedY=this.group.position.y+(this.baseY+.012*h-min);b.groundedY=groundedY;
   if(held){if(this.group.position.y<groundedY)this.group.position.y=groundedY;}
   else{this.group.position.y+=(b.airVel||0)*dt;if(this.group.position.y<=groundedY){this.group.position.y=groundedY;b.airVel=0;b.velocity.multiplyScalar(.82);b.omega.multiplyScalar(.55);}}
   this.group.updateMatrixWorld(true);
   const onFloor=this.group.position.y<=groundedY+0.02;
   if(b.state==='loose'&&!held&&!this.dead&&onFloor&&b.omega.length()<.45&&b.time>.85){b.state='recovering';b.time=0;this.setEmotion('concerned',.42,{hold:5,source:'recovery'});}
   if(b.state==='recovering'&&!this.dead){
    const u=clamp(b.time/2.8,0,1),brace=1-smooth((u-.25)/.5);
    for(const side of ['L','R']){
     const hand=this.bones[side+'_Hand'];if(!hand)continue;const sign=side==='L'?1:-1;
     const target=new THREE.Vector3(sign*.25*h,0,.20*h);this.group.localToWorld(target);target.y=this.baseY+.045*h;
     target.lerp(hand.getWorldPosition(V()),1-brace);
     const pole=this.bones[side+'_Forearm'].getWorldPosition(V()).add(new THREE.Vector3(sign*.12,.05,0));
     this.solveChain(side,'arm',target,pole);
    }
    this.group.updateMatrixWorld(true);
   }
  }
  tickSoft(dt){
   if(this.inBaseTick)return;
   // The original parent axes are rotated. Gravity must be converted from world
   // down; writing a constant local Y rest offset pushes tissue into the chest.
   for(const s of this.soft){
    const bone=this.bones[s.name];if(!bone)continue;
    const size=s.kind==='breast'?this.shape.breast:this.shape.butt;
    const k=this.softFrequency(s,size)**2;
    const gravity=new THREE.Vector3(0,-9.81,0).applyQuaternion(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
    s.v2Gravity=gravity.multiplyScalar((s.kind==='breast'?.44:.46)*this.shape.height/k);
    s.v2Gravity.multiplyScalar(.5+.5*Math.cbrt(size));
   }
   // Integrate in small fixed steps with backward-Euler compliant anchors.
   this.softAccumulator=Math.min(this.softAccumulator+dt,.05);
   for(const s of this.soft){const bone=this.bones[s.name];if(!bone)continue;
    s.anchor.copy(this.bindPos[s.name]).applyMatrix4(bone.parent.matrixWorld);
    const velocity=s.anchor.clone().sub(s.prevAnchor).multiplyScalar(1/Math.max(dt,.001));
    if(!s.ready||s.anchor.distanceTo(s.prevAnchor)>.25){s.prevVelocity.copy(velocity);s.acceleration.set(0,0,0);s.ready=true;}
    else{s.acceleration.copy(cap(velocity.clone().sub(s.prevVelocity).multiplyScalar(1/Math.max(dt,.001)),15)).applyQuaternion(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).multiplyScalar(-.48*this.jiggleAmt());}
    s.prevVelocity.copy(velocity);s.prevAnchor.copy(s.anchor);s.pressT-=dt;if(s.pressT<=0)s.press.multiplyScalar(Math.exp(-dt*20));
   }
   const step=1/120;
   while(this.softAccumulator+1e-9>=step){
    for(const s of this.soft){
     const size=s.kind==='breast'?this.shape.breast:this.shape.butt,j=this.jiggleAmt();
     const held=[...this.grabs.values()].find(g=>g.spring===s);
     const omega=this.softFrequency(s,size),k=held?1100:omega*omega;
     const damping=held?68:2*omega*(.12+.80*this.shape.damping);
     s.px=s.x;s.py=s.y;s.pz=s.z;
     for(const a of ['x','y','z']){
      const target=held?held['t'+a]:s.v2Gravity[a]+s.press[a];
      s['v'+a]=(s['v'+a]+step*((held?0:s.acceleration[a])+k*(target-s[a])))/(1+damping*step+k*step*step);
      s[a]+=step*s['v'+a];
     }
     this.limitSoft(s);
    }
    this.softAccumulator-=step;
   }
   for(const s of this.soft){const bone=this.bones[s.name];if(!bone)continue;
    const sc=bone.parent.getWorldScale(V());bone.position.copy(this.bindPos[s.name]);
    bone.position.x+=s.x/Math.max(.01,Math.abs(sc.x));bone.position.y+=s.y/Math.max(.01,Math.abs(sc.y));bone.position.z+=s.z/Math.max(.01,Math.abs(sc.z));
   }
  }
  softFrequency(s,size){return 2*Math.PI*(s.kind==='breast'?3.05:3.20)/Math.sqrt(size)/(.72+.85*this.shape.softness);}
  limitSoft(s){
   const size=s.kind==='breast'?this.shape.breast:this.shape.butt,h=this.shape.height;
   const growth=Math.cbrt(size),soft=this.shape.softness??.62,amp=(.55+.45*soft);
   // Parent Y points out of the chest. Compression into the attachment is much
   // more restricted than outward/downward motion; a spherical clamp can invert
   // the tightly weighted inner rim when the breast is enlarged.
   const limits=s.kind==='breast'?[[ -.029*h*growth*amp,.029*h*growth*amp],[-.002*h/Math.max(1,size),.047*h*growth*amp],[-.072*h*growth*amp,.040*h*growth*amp]]:[[-.030*h*growth*amp,.030*h*growth*amp],[-.060*h*growth*amp,.035*h*growth*amp],[-.040*h*growth*amp,.012*h*growth*amp]];
   for(const [i,a] of ['x','y','z'].entries()){
    const raw=Number.isFinite(s[a])?s[a]:0;s[a]=clamp(raw,limits[i][0],limits[i][1]);
    s['v'+a]=clamp(Number.isFinite(s['v'+a])?s['v'+a]:0,-.85,.85);
    if(s[a]!==raw)s['v'+a]*=.25;
   }
   const planes=this.softPlanes?.[s.name];
   if(planes){
    const offset=new THREE.Vector3(s.x,s.y,s.z).divideScalar(this.baseScale*h);
    // Scale along the proposed motion ray: preserves direction and satisfies
    // every triangle constraint in one pass, without oscillating projections.
    let factor=1;for(const g of planes){const dot=g.dot(offset);if(dot<-.78)factor=Math.min(factor,-.78/dot);}
    if(factor<1){s.x*=factor;s.y*=factor;s.z*=factor;s.vx*=.5;s.vy*=.5;s.vz*=.5;}
   }
  }
  applyStrike(hit,n,c,g,p){
   super.applyStrike(hit,n,c,g,p);
   if(c>2.3&&['chest','hip','thigh','leg','head'].includes(hit.kind))this.knockDown(n.clone().negate(),n.clone().multiplyScalar(-Math.min(c*.15,.7)));
   else if(c>.7&&!this.dead)this.setEmotion('surprise',clamp(c*.15,0,.6),{hold:2,source:'contact'});
  }
  resetPhysics(){
   this.socialPair?.cancel();this.directedWalk=null;if(this.navigation?.seat)this.navigation.seat.occupant=null;this.navigation=null;if(this.seat){this.seat.occupant=null;this.group.position.y=this.baseY||0;}this.seat=null;
   super.resetPhysics();this.grabs?.clear();this.handTargets={};this.armSwing={};this.spineTouch?.set(0,0,0);this.spineGoal?.set(0,0,0);this.hairPhysics?.reset();this.surfaceFlesh?.reset();
   if(this.balance){this.balance.velocity.set(0,0,0);this.balance.stress=0;}
  }
  tick(dt,cam,t){
   if(!this.baseRootPos)this.baseRootPos=this.root.position.clone();
   this.dt=clamp(dt,0,.05);this.time=t;dt=this.dt;this.tickAwareness(dt,cam);
   if(!this.seamsReady&&(this.seamTryT=(this.seamTryT||0)-dt)<=0){this.seamTryT=1;this.seamsReady=blendSkinSeams(this.skinMeshes);}
   this.root.position.copy(this.baseRootPos);this.root.quaternion.identity();
   if(this.dead){
    const savedY=this.group.position.y;
    this.poseAlpha=1;this.restoreBind();this.applyShape();this.tickRest();this.applyExtras();
    this.group.position.y=savedY;
    this.poseSpineContact(dt);this.group.updateMatrixWorld(true);
    this.tickBalance(dt);this.tickGrab(dt);this.group.updateMatrixWorld(true);
    this.tickSoft(dt);if(!this.headMissing)this.poseHeadContact(dt);this.group.updateMatrixWorld(true);
    this.surfaceFlesh?.tick(dt);this.hairPhysics?.tick(dt);if(!this.headMissing)this.enhanceEyes?.tick();this.injuryDriver?.pose(this);
    this.root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
    return;
   }
   const savedY=this.balance.state==='standing'?null:this.group.position.y;
   this.inBaseTick=true;super.tick(dt,cam,t);this.inBaseTick=false;
   if(savedY!==null)this.group.position.y=savedY;
   this.poseActivity();this.poseSpineContact(dt);this.poseArms();this.socialPair?.pose(this);
   if(this.bones.Hip&&this.waterBob)this.bones.Hip.position.y+=this.waterBob;
   this.group.updateMatrixWorld(true);
   this.tickBalance(dt);
   this.tickGrab(dt);
   this.group.updateMatrixWorld(true);
   this.tickSoft(dt);this.poseHeadContact(dt);this.group.updateMatrixWorld(true);
   this.surfaceFlesh?.tick(dt);this.hairPhysics?.tick(dt);if(!this.headMissing){this.eyes?.tick(dt,t);this.enhanceEyes?.tick();}this.injuryDriver?.pose(this);
   this.root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
  }
  keepArmsClear(){} // final world-space IK chooses hand targets clear of the chest
  solveFeet(dt,moving){
   if(EXERCISE_MODES.includes(this.mode)){this.feet={};return;}
   if(this.balance.state!=='standing'||this.seat){this.feet={};return;}
   if([...this.grabs.values()].some(g=>g.limb==='leg')){
    // Plant only the unheld leg; the held chain is owned by the grab constraint.
    const saved={};for(const g of this.grabs.values())if(g.limb==='leg')for(const n of ['Thigh','Calf','Foot']){const b=this.bones[g.side+'_'+n];saved[b.name]=b.quaternion.clone();}
    super.solveFeet(dt,moving);for(const [n,r] of Object.entries(saved))this.bones[n].quaternion.copy(r);return;
   }
   if(!moving){this.group.position.y=this.baseY-.001*this.shape.height;this.group.updateMatrixWorld(true);}
   super.solveFeet(dt,moving);
  }
 };
}

// Material boundaries are matched in linear light at coincident mesh vertices,
// then feathered across a ten-centimetre surface neighbourhood. This keeps UV
// detail while avoiding a hard switch between separately authored skin atlases.
const seamCache=new Map();
export function blendSkinSeams(meshes){
 if(!meshes.length)return true;
 if(typeof document==='undefined')return false;
 const maps=meshes.map(o=>o.material.map);
 if(maps.some(m=>!m?.image?.width||m.image.complete===false))return false;
 const key=maps.map(m=>m.uuid).join('/');
 if(seamCache.has(key)){meshes.forEach((m,i)=>{m.geometry.attributes.v2ToneGain.array.set(seamCache.get(key)[i]);m.geometry.attributes.v2ToneGain.needsUpdate=true;});return true;}
 const records=[],buckets=new Map();
 try{
  for(const mesh of meshes){
   const g=mesh.geometry,map=mesh.material.map,canvas=document.createElement('canvas');canvas.width=canvas.height=512;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(map.image,0,0,512,512);const pixels=ctx.getImageData(0,0,512,512).data;
   const used=new Set(g.index.array),adj=new Map(),record={mesh,g,used,adj,seeds:new Map()};records.push(record);
   const pos=g.attributes.position,uv=g.attributes.uv;
   for(let i=0;i<g.index.count;i+=3){const tri=[g.index.array[i],g.index.array[i+1],g.index.array[i+2]];for(const a of tri){if(!adj.has(a))adj.set(a,new Set());for(const b of tri)if(a!==b)adj.get(a).add(b);}}
   for(const i of used){
    const key=[pos.getX(i),pos.getY(i),pos.getZ(i)].map(n=>Math.round(n*10000)).join(',');
    let u=((uv.getX(i)%1)+1)%1,v=clamp(uv.getY(i),0,1);if(map.flipY)v=1-v;
    const idx=(Math.min(511,Math.floor(v*512))*512+Math.min(511,Math.floor(u*512)))*4;
    const color=[0,1,2].map(j=>Math.pow(pixels[idx+j]/255,2.2));
    const bucket=buckets.get(key)||[];bucket.push({record,i,color});buckets.set(key,bucket);
   }
  }
  for(const bucket of buckets.values()){
   if(bucket.length<2)continue;
   if(new Set(bucket.map(b=>b.record)).size===1&&new Set(bucket.map(b=>b.color.map(x=>x.toFixed(5)).join())).size===1)continue;
   const lums=bucket.map(b=>0.2126*b.color[0]+0.7152*b.color[1]+0.0722*b.color[2]);
   if(Math.max(...lums)-Math.min(...lums)>0.22)continue;
   const mean=[0,1,2].map(c=>bucket.reduce((s,b)=>s+b.color[c],0)/bucket.length);
   for(const b of bucket)b.record.seeds.set(b.i,mean.map((c,j)=>clamp(c/Math.max(.025,b.color[j]),.35,3)));
  }
  for(const r of records){
   const gains=r.g.attributes.v2ToneGain.array,p=r.g.attributes.position,queue=[],dist=new Map(),source=new Map();
   for(const [i,gain] of r.seeds){queue.push(i);dist.set(i,0);source.set(i,gain);}
   // Relax geodesic distances rather than stopping at the first BFS visit.
   for(let k=0;k<queue.length;k++){
    const i=queue[k],d=dist.get(i),gain=source.get(i),py=p.getY(i),px=Math.abs(p.getX(i)),reach=(py>.42&&py<.90&&px<.16)?.28:.10,weight=1-smooth(d/reach);
    for(let c=0;c<3;c++)gains[i*3+c]=1+(gain[c]-1)*weight;
    for(const j of r.adj.get(i)||[]){const nd=d+Math.hypot(p.getX(i)-p.getX(j),p.getY(i)-p.getY(j),p.getZ(i)-p.getZ(j));if(nd>=reach||nd>=(dist.get(j)??Infinity)-1e-7)continue;dist.set(j,nd);source.set(j,gain);queue.push(j);}
   }
   // Diffuse in log colour-gain space to remove Voronoi-like correction patches.
   const entries=[...dist.keys()],next=new Float32Array(gains);
   for(let pass=0;pass<18;pass++){
    for(const i of entries){if(r.seeds.has(i))continue;const neighbors=[...r.adj.get(i)||[]];if(!neighbors.length)continue;
     for(let c=0;c<3;c++){let sum=0;for(const j of neighbors)sum+=Math.log(Math.max(.01,gains[j*3+c]));next[i*3+c]=Math.exp(Math.log(Math.max(.01,gains[i*3+c]))*.35+sum/neighbors.length*.65);}
    }
    for(const i of entries)gains.set(next.subarray(i*3,i*3+3),i*3);
   }
   r.g.attributes.v2ToneGain.needsUpdate=true;
  }
  seamCache.set(key,meshes.map(o=>Float32Array.from(o.geometry.attributes.v2ToneGain.array)));return true;
 }catch(e){console.warn('Skin boundary blend unavailable',e.message);return true;}
}
function installV2Skin(material,actor){
 const current=material.onBeforeCompile,previous=current.v2SkinBase||current;
 material.onBeforeCompile=shader=>{
  previous?.(shader);
  actor?.surfaceFlesh?.installShader(shader);
  shader.vertexShader='attribute vec3 v2ToneGain;\nattribute vec3 v2SkinRest;\nvarying vec3 v2RestPos;\nvarying vec3 v2RestNormal;\nvarying vec3 v2Tone;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nv2Tone=v2ToneGain;v2RestPos=v2SkinRest;v2RestNormal=normal;');
  shader.uniforms.v2SkinTexel={value:new THREE.Vector2(1/(material.map?.image?.width||2048),1/(material.map?.image?.height||2048))};
  shader.uniforms.v2DetailMap={value:actor.skinDetailMap};
  shader.uniforms.v2RegionMap={value:actor.headRegionMap||actor.skinDetailMap};
  shader.uniforms.v2DetailAmount={value:/Body/.test(material.name)?.75:/Head/.test(material.name)?.14:.46};
  shader.uniforms.v2AlbedoBlur={value:/Leg/.test(material.name)?.66:/Arm/.test(material.name)?.42:.12};
  shader.fragmentShader='varying vec3 v2Tone;\nvarying vec3 v2RestPos;\nvarying vec3 v2RestNormal;\nuniform sampler2D v2DetailMap;\nuniform sampler2D v2RegionMap;\nuniform float v2DetailAmount;\nuniform float v2AlbedoBlur;\nuniform vec2 v2SkinTexel;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',THREE.ShaderChunk.map_fragment.replace('diffuseColor *= sampledDiffuseColor;',`
    vec2 skinDx=v2SkinTexel*2.3;
    vec3 softAlbedo=(texture2D(map,vMapUv+vec2(skinDx.x,0.0)).rgb+texture2D(map,vMapUv-vec2(skinDx.x,0.0)).rgb+texture2D(map,vMapUv+vec2(0.0,skinDx.y)).rgb+texture2D(map,vMapUv-vec2(0.0,skinDx.y)).rgb)*0.25;
    float innerThigh=smoothstep(0.15,0.018,abs(v2RestPos.x))*smoothstep(0.40,0.50,v2RestPos.y)*smoothstep(0.90,0.70,v2RestPos.y)*smoothstep(0.07,-0.04,v2RestPos.z);
    sampledDiffuseColor.rgb=mix(sampledDiffuseColor.rgb,softAlbedo,clamp(v2AlbedoBlur+innerThigh*0.32,0.0,0.93));
    // Perioral atlas padding on head_v3 is near-white. Do not let seam gain
    // or those texels bleach the mouth into a joker ring.
    float luma=dot(sampledDiffuseColor.rgb,vec3(0.299,0.587,0.114));
    float mouthZone=smoothstep(1.430,1.458,v2RestPos.y)*smoothstep(1.515,1.488,v2RestPos.y)*smoothstep(-0.04,0.00,v2RestPos.z);
    if(${/Head/.test(material.name)?'true':'false'}){
     vec3 skinRef=vec3(0.78,0.52,0.44);
     sampledDiffuseColor.rgb=mix(sampledDiffuseColor.rgb,mix(sampledDiffuseColor.rgb,skinRef,0.72),mouthZone*smoothstep(0.58,0.78,luma));
    }
    diffuseColor *= sampledDiffuseColor;
    vec3 tone=v2Tone;
    if(${/Head/.test(material.name)?'true':'false'})tone=mix(vec3(1.0),clamp(v2Tone,vec3(0.88),vec3(1.08)),1.0-mouthZone*0.92);
    diffuseColor.rgb *= tone;
    // Small photograph-inspired detail, projected in rest space across UV seams.
    // The albedo tile is mean-normalized; it does not paint a second skin colour.
    vec3 blendN=pow(abs(normalize(v2RestNormal)),vec3(4.0));blendN/=max(dot(blendN,vec3(1.0)),0.0001);
    vec3 coord=v2RestPos*12.5;
    vec3 detailSkin=texture2D(v2DetailMap,coord.yz).rgb*blendN.x+texture2D(v2DetailMap,coord.xz).rgb*blendN.y+texture2D(v2DetailMap,coord.xy).rgb*blendN.z;
    vec3 detailGain=clamp(detailSkin/vec3(0.7760,0.4283,0.2907),vec3(0.70),vec3(1.32));
    diffuseColor.rgb*=mix(vec3(1.0),detailGain,v2DetailAmount);`));
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   // Region-aware head roughness: UV mask first, rest-space fallback. Body stays mid-matte.
   float restY=v2RestPos.y,restZ=v2RestPos.z,restAx=abs(v2RestPos.x);
   float lipMask=smoothstep(1.455,1.468,restY)*smoothstep(1.492,1.478,restY)*smoothstep(0.006,0.028,restZ)*smoothstep(0.038,0.012,restAx);
   float lidMask=smoothstep(1.508,1.518,restY)*smoothstep(1.548,1.536,restY)*smoothstep(-0.005,0.02,restZ);
   float tzone=smoothstep(1.50,1.53,restY)*smoothstep(0.02,0.055,restZ)*smoothstep(0.045,0.012,restAx);
   if(${/Head/.test(material.name)?'true':'false'}){
    vec4 region=texture2D(v2RegionMap,vMapUv);
    lipMask=max(lipMask,region.r);
    tzone=max(tzone,region.g);
    lidMask=max(lidMask,region.b);
    roughnessFactor=mix(clamp(0.46+0.22*roughnessFactor,0.42,0.72),0.30,clamp(lipMask*0.90+lidMask*0.55,0.0,1.0));
    roughnessFactor=mix(roughnessFactor,0.44,tzone*0.40);
   }else{
    roughnessFactor=clamp(0.48+0.30*roughnessFactor,0.52,0.84);
   }`);
  // Skin's dielectric F0 is about .028 (IOR ~1.4); Standard's .04 looked coated.
  shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>',THREE.ShaderChunk.lights_physical_fragment.replace('vec3( 0.04 )','vec3( 0.028 )'));
  // Head keeps a stronger color-dependent wrap; body stays conservative.
  shader.fragmentShader=shader.fragmentShader.replace('skinLobe * directLight.color, 0.38',/Head/.test(material.name)?'skinLobe * directLight.color, 0.32':'skinLobe * directLight.color, 0.18');
 };
 material.onBeforeCompile.v2SkinBase=previous;
 material.customProgramCacheKey=()=> 'mira-skin-r12.6-mouth';
}
