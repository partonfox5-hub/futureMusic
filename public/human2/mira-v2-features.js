import * as THREE from 'three';

// Mira v2: a bounded real-time approximation for this CC3 rig, Three r170.
const clamp = THREE.MathUtils.clamp, damp = THREE.MathUtils.damp;
const smooth = (x) => { x=clamp(x,0,1); return x*x*(3-2*x); };
const V = () => new THREE.Vector3();
const cap = (v,n) => { if(v.lengthSq()>n*n)v.setLength(n); return v; };
const tmp=V(), tmp2=V(), tmp3=V(), axis=V(), q=new THREE.Quaternion();
const up=new THREE.Vector3(0,1,0);
export const EMOTION_NAMES=['neutral','happy','content','curious','listening','thoughtful','concerned','sad','surprise','afraid','angry','disgust','tease','flirty','laugh','tired'];
export const IDLE_NAMES=['rest','weightShift','handsTogether','handOnHip','hairTuck','lookAtHand','wave','explain','shoulderRoll','lookAround','breathe','neckStretch'];
export const WALK_NAMES=['Relaxed','Purposeful','Soft','Brisk','Careful','Stroll'];
const FACE_POSES={
 neutral:{}, happy:{Mouth_Smile:.48,Cheek_Raise:.26,Mouth_Dimple:.14},
 content:{Mouth_Smile:.23,Eye_Squint:.08,Cheek_Raise:.12},
 curious:{Brow_Raise_Inner:.23,Brow_Raise_Outer:.18,Eye_Wide:.13,Mouth_Smile:.08},
 listening:{Brow_Raise_Inner:.13,Mouth_Smile:.11},
 thoughtful:{Brow_Compress:.14,Mouth_Press:.22,Eye_Squint:.12},
 concerned:{Brow_Raise_Inner:.35,Brow_Drop:.13,Mouth_Frown:.18},
 sad:{Brow_Raise_Inner:.5,Brow_Drop:.19,Mouth_Frown:.35,Eye_Squint:.1},
 surprise:{Brow_Raise_Inner:.48,Brow_Raise_Outer:.43,Eye_Wide:.48,Jaw_Open:.2,V_Tight_O:.17},
 afraid:{Brow_Raise_Inner:.52,Brow_Compress:.22,Eye_Wide:.4,Mouth_Stretch:.25,Jaw_Open:.12},
 angry:{Brow_Compress:.55,Brow_Drop:.43,Mouth_Press:.4,Eye_Squint:.27},
 disgust:{Nose_Sneer:.48,Brow_Drop:.24,Mouth_Shrug_Upper:.3,Eye_Squint:.15},
 tease:{Mouth_Smile:.32,Mouth_Dimple:.16,Eye_Squint:.12},
 flirty:{Mouth_Smile:.29,Cheek_Raise:.13,Eye_Squint:.16},
 laugh:{Mouth_Smile:.68,Cheek_Raise:.5,Eye_Squint:.28,Jaw_Open:.28,V_Wide:.13},
 tired:{Eye_Blink:.22,Brow_Raise_Inner:.08,Mouth_Press:.08}
};

// Smooth, chest-anchored deformation in unscaled model coordinates. No animated
// breast scale or negative scale: volume grows by moving the complete surface.
export function shapePoint(x,y,z,size,likeness=0){
 let dx=0,dy=0,dz=0;
 if(y>1.08&&y<1.35&&z>.01){
  for(const sign of [-1,1]){
   const cx=sign*.078, cy=1.207;
   const rr=((x-cx)/.092)**2+((y-cy)/.091)**2;
   const w=(1-smooth(rr))*smooth((z-.025)/.042);
   const k=Math.cbrt(size*size)-1;
   dx+=(x-cx)*k*.46*w;
   dy+=(y-cy)*k*.36*w;
   dz+=k*.062*w;
  }
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
 return [x+dx,y+dy,z+dz];
}

export function createV2Class(Base,{loadMap,MORPH,BODY_HIT,installSkinShader,HAIR_COLORS}){
 return class MiraV2 extends Base {
  constructor(root,scale,opts={}){
   super(root,scale,opts);
   this.version='v2'; this.autoWander=false;this.mode='idle';this.shape.jiggle=opts.shape?.jiggle??1.15;
   this.emotion={name:'neutral',intensity:.6,time:0,hold:6,source:'idle',valence:0,arousal:.2};
   this.emotionTarget={}; this.emotionCurrent={};this.expressionOverride=null;
   this.idleKind='rest';this.idleT=3;this.idleDur=3;this.idleChoice='auto';this.seed=Math.random()*100;
   this.gait=clamp(opts.gait||0,0,WALK_NAMES.length-1);
   this.handTargets={};this.grabs=new Map();this.balance={state:'standing',time:0,stress:0,tilt:0,dir:V(),velocity:V(),recoverFrom:0};
   this.likeness=opts.likeness??1;this.geomState='';this.deform=[];this.poseQ={};
   this.root.updateMatrixWorld(true);
   // Geometry must be actor-local: slider changes must never mutate v1/other clones.
   const shared=new Map();
   this.root.traverse(o=>{
    if(!o.isSkinnedMesh||o.name==='hair')return;
    const old=o.geometry,key=old.attributes.position;let record=shared.get(key);
    if(!record){
     record={base:Float32Array.from(key.array),baseNormals:Float32Array.from(old.attributes.normal.array),morph:(old.morphAttributes.position||[]).map(a=>a.array),indices:[],position:key.clone(),normal:old.attributes.normal.clone(),morphPosition:(old.morphAttributes.position||[]).map(a=>a.clone())};
     if(/body/.test(o.name)){
      record.skinIndex=old.attributes.skinIndex.clone();record.skinWeight=old.attributes.skinWeight.clone();
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
   });
   for(const d of this.deform){const g=new THREE.BufferGeometry();g.attributes={position:d.position,normal:d.normal};g.setIndex(d.indices);d.geom=g;if(d.morphPosition.length)g.morphAttributes.position=d.morphPosition;delete d.indices;}
   this.applyLooks();
   this.hairPhysics=new HairGuides(this,BODY_HIT);
   this.root.traverse(o=>{if(o.isMesh){o.receiveShadow=true;o.castShadow=!/hair|eyes/.test(o.name);}});
  }
  applyLooks(){
   if(!this.deform)return;
   for(const m of this.hairMats)m.color.setHex((HAIR_COLORS[this.hairColor]||HAIR_COLORS[0]).tint);
   for(const m of this.headMats){m.map=loadMap('head_v2.jpg',true);m.normalScale.setScalar(.5);m.roughness=.93;}
   this.root.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){
    if(/Skin_Body/.test(m.name))m.map=loadMap('body_v2.jpg',true);
    if(/Skin_/.test(m.name)){m.normalScale?.setScalar(/Head/.test(m.name)?.5:.7);installSkinShader(m);m.needsUpdate=true;}
    if(/Std_Eye_[LR]/.test(m.name)){m.roughness=.22;m.envMapIntensity=1.15;}
   }});
  }
  updateShapeGeometry(){
   const size=this.shape.breast,like=this.faceType===1?this.likeness:0;
   const key=size.toFixed(3)+'/'+like.toFixed(3);if(key===this.geomState)return;this.geomState=key;
   const likenessChanged=like!==this.lastLikeness;this.lastLikeness=like;
   for(const d of this.deform){
    const a=d.geom.attributes.position.array,b=d.base;
    for(let i=0;i<a.length;i+=3){const p=shapePoint(b[i],b[i+1],b[i+2],size,like);a[i]=p[0];a[i+1]=p[1];a[i+2]=p[2];}
    // Rebase expression deltas through the identity sculpt, preserving blendshapes.
    for(let j=0;likenessChanged&&j<d.morph.length;j++){
     const src=d.morph[j],dst=d.geom.morphAttributes.position[j].array;
     for(let i=0;i<dst.length;i+=3){
      if(!src[i]&&!src[i+1]&&!src[i+2]){dst[i]=dst[i+1]=dst[i+2]=0;continue;}
      const p=shapePoint(b[i]+src[i],b[i+1]+src[i+1],b[i+2]+src[i+2],size,like);
      dst[i]=p[0]-a[i];dst[i+1]=p[1]-a[i+1];dst[i+2]=p[2]-a[i+2];
     }
     d.geom.morphAttributes.position[j].needsUpdate=true;
    }
    d.geom.attributes.position.needsUpdate=true;
    // Preserve authored normals away from changed vertices, including material seams.
    const old=d.baseNormals;d.geom.computeVertexNormals();
    for(let i=0;i<b.length;i+=3)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])<1e-8){d.geom.attributes.normal.array.set(old.subarray(i,i+3),i);}
    d.geom.attributes.normal.needsUpdate=true;
    d.geom.computeBoundingSphere();
   }
  }
  applyShape(){
   const s=this.shape,bs=s.breast;super.applyShape();
   // In this rig scaling these weighted attachment bones produces a dented chest.
   for(const n of ['L_Breast','R_Breast'])this.bones[n]?.scale.copy(this.bindS[n]);
   this.updateShapeGeometry();
  }
  setEmotion(name,intensity=.65,{hold=9,source='context',valence,arousal}={}){
   if(!EMOTION_NAMES.includes(name))name='neutral';
   const finite=(v,f)=>Number.isFinite(v)?v:f;
   Object.assign(this.emotion,{name,intensity:clamp(finite(intensity,.65),0,1),time:0,hold:clamp(finite(hold,9),1,60),source,valence:clamp(finite(valence,0),-1,1),arousal:clamp(finite(arousal,.3),0,1)});
  }
  beginSpeech(text,emotion='listening'){
   super.beginSpeech(text,emotion);
   this.setEmotion(emotion,.72,{hold:12,source:'reply'});
  }
  endSpeech(){super.endSpeech();if(this.mode==='talk')this.setMode('idle');}
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
     const k=smooth((u-.12)/.8);this.want.Mouth_Smile_L=.13+.48*k;this.want.Mouth_Smile_R=.12+.52*k;
     this.want.Cheek_Raise_L=this.want.Cheek_Raise_R=.28*k;this.want.Mouth_Dimple_R=.12*k;
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
   if(e.time>e.hold+40&&!this.expressionOverride){e.name='neutral';e.intensity=.5;}
   this.blinkT-=dt;
   if(this.blinkT<=0&&this.blinkHold<=0){this.blinkHold=.18;this.blinkT=2.5+Math.random()*3.5;}
   let blink=0;
   if(this.blinkHold>0){this.blinkHold=Math.max(0,this.blinkHold-dt);const t=.18-this.blinkHold;blink=smooth(t<.055?t/.055:1-(t-.055)/.125);}
   this.want.Eye_Blink_L=this.want.Eye_Blink_R=Math.max(this.want.Eye_Blink_L,blink);
   this.cur.Eye_Blink_L=this.cur.Eye_Blink_R=this.want.Eye_Blink_L;
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
   this.addE('L_Upperarm',.01,.08,-1.20);this.addE('R_Upperarm',.01,-.08,1.20);
   this.addE('L_Forearm',.12,0,0);this.addE('R_Forearm',.12,0,0);
  }
  tickFingers(curl){
   const t=this.time||0;
   for(const side of ['L','R']){
    const holding=this.heldBall&&side==='R';
    const open=['wave','explain'].includes(this.idleKind)||this.speech?.active;
    const tense=this.emotion?.name==='angry'||this.emotion?.name==='afraid';
    const target=holding?.88:tense?.6:open?.1:.34;
    const cur=this['finger'+side]=damp(this['finger'+side]??.3,target,7,this.dt||.016);
    for(const [i,row] of ['Index','Mid','Ring','Pinky'].entries()){
     const c=cur*(.78+i*.13)+.018*Math.sin(t*.8+i*.7+(side==='L'?0:1));
     for(let j=1;j<=3;j++)this.addE(side+'_'+row+j,c*[.6,1.05,.67][j-1],0,j===1?(i-1.5)*.015:0);
    }
    this.addE(side+'_Thumb1',.13,side==='L'?.12:-.12,0);
    this.addE(side+'_Thumb2',cur*.42,0,0);this.addE(side+'_Thumb3',cur*.2,0,0);
   }
  }
  tickIdle(t,dt){
   this.idleT-=dt;
   if(this.idleT<=0){
    this.idleKind=this.idleChoice!=='auto'?this.idleChoice:IDLE_NAMES[Math.floor(Math.random()*IDLE_NAMES.length)];
    this.idleDur=3+Math.random()*3;this.idleT=this.idleDur;
   }
   const u=clamp(1-this.idleT/this.idleDur,0,1);
   this.gestureWeight=smooth(u/.22)*smooth((1-u)/.24);
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
  }
  tickWalk(moving){
   super.tickWalk(moving);
   this.group.position.y-=.022*this.shape.height*clamp((this.speed-.5)/.18,0,1);
   const s=clamp(this.speed/.6,0,1),p=this.walkT;
   this.addE('Spine02',this.gait===3?.035*s:0,-Math.sin(p)*.025*s,0);
   this.addE('L_Clavicle',.016*Math.sin(p)*s,0,0);this.addE('R_Clavicle',-.016*Math.sin(p)*s,0,0);
  }
  wander(dt){
   if(this.balance.state!=='standing'||this.grabs.size){this.speed=damp(this.speed,0,10,dt);this.pathSpeed=this.speed;return false;}
   if(this.pathSpeed!==undefined)this.speed=this.pathSpeed;
   // Base path steering, with six distinct speed/cadence styles.
   const before=this.group.position.clone();const moving=super.wander(dt);
   const moodSpeed=['sad','tired'].includes(this.emotion.name)?.8:1;
   const factor=([1,1.12,.84,1.25,.68,.92][this.gait]||1)*moodSpeed;
   this.group.position.sub(before).multiplyScalar(factor).add(before);this.pathSpeed=this.speed;this.speed*=factor;
   return moving;
  }
  solveChain(side,kind,target,pole){
   const names=kind==='arm'?['Upperarm','Forearm','Hand']:['Thigh','Calf','Foot'];
   const [a,b,c]=names.map(n=>this.bones[side+'_'+n]);if(!a||!b||!c)return;
   const pa=a.getWorldPosition(V()),pb=b.getWorldPosition(V()),pc=c.getWorldPosition(V());
   const l1=pa.distanceTo(pb),l2=pb.distanceTo(pc),dir=target.clone().sub(pa),dist=clamp(dir.length(),Math.abs(l1-l2)+.005,(l1+l2)*.99);
   if(dir.lengthSq()<1e-9)return;dir.normalize();
   const bend=pole.clone().sub(pa);bend.addScaledVector(dir,-bend.dot(dir));
   if(bend.lengthSq()<1e-8)bend.set(0,0,1).addScaledVector(dir,-dir.z);bend.normalize();
   const along=(l1*l1+dist*dist-l2*l2)/(2*dist);
   const joint=pa.clone().addScaledVector(dir,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along)));
   this.aimBone(a,b,joint);this.aimBone(b,c,pa.clone().addScaledVector(dir,dist));
  }
  poseArms(){
   const h=this.shape.height,t=this.time,w=this.gestureWeight||0,step=clamp(this.speed/.65,0,1);
   for(const side of ['L','R']){
    if([...this.grabs.values()].some(g=>g.side===side&&g.limb==='arm'))continue;
    const sign=side==='L'?1:-1;
    const hand=this.bones[side+'_Hand'];if(!hand)continue;
    const dst=new THREE.Vector3(sign*(.24+.018*this.shape.arms),.90,-.025+sign*Math.sin(this.walkT)*.085*step);
    const gesture=dst.clone();
    if(!step){
     if(this.idleKind==='handsTogether')gesture.set(sign*.046,1.02,.19);
     if(this.idleKind==='handOnHip'&&side==='L')gesture.set(.22,1.05,.01);
     if(this.idleKind==='hairTuck'&&side==='R')gesture.set(-.14,1.48,.015);
     if(this.idleKind==='lookAtHand'&&side==='R')gesture.set(-.14,1.19,.28);
     if(this.idleKind==='wave'&&side==='R')gesture.set(-.30+Math.sin(t*6)*.025,1.52,.15);
     if(this.idleKind==='explain')gesture.set(sign*.22,1.15,.26);
     dst.lerp(gesture,w);
    }
    if(this.speech?.active&&side==='R')dst.lerp(new THREE.Vector3(-.24,1.10+.03*Math.sin(t*3),.25),.55+.15*Math.sin(t*2.7));
    if(this.mode==='stretch')dst.set(sign*.28,1.75,.0);
    if(this.mode==='airSquats')dst.set(sign*.22,1.21,.34);
    if(this.mode==='jumpingJacks'){const a=(1+Math.sin(this.modeT*7.2))/2;dst.set(sign*(.27+.28*Math.sin(a*Math.PI)),.9+.86*a,0);}
    dst.multiplyScalar(h);this.group.localToWorld(dst);
    const current=this.handTargets[side]||(this.handTargets[side]=dst.clone());current.lerp(dst,1-Math.exp(-this.dt*10));
    const pole=new THREE.Vector3(sign*.48,1.15,-.15).multiplyScalar(h);this.group.localToWorld(pole);
    this.solveChain(side,'arm',current,pole);
   }
  }
  tickGaze(dt,moving,cam){
   if(this.faceReference?.name==='surprise'){
    const u=this.faceReference.t/3.0625;this.want.Jaw_Open=.52*smooth((u-.16)/.44)*(1-.72*smooth((u-.68)/.32));
   }
   super.tickGaze(dt,moving,cam);
   this.saccadeT=(this.saccadeT||0)-dt;
   if(this.saccadeT<=0){this.saccadeT=.5+Math.random()*1.8;this.saccade=(Math.random()-.5)*.07;}
   const gx=this.gazeYaw*.38+(this.saccade||0);
   // Rotate the actual eyeballs: this GLB's eye-look morphs live on the body only.
   this.addE('L_Eye',this.gazePitch*.32,gx,0);this.addE('R_Eye',this.gazePitch*.32,gx,0);
  }
  nearestHit(pos,maxDist){
   let best=super.nearestHit(pos,maxDist),bd=maxDist,point=null,chosen=null;
   const seen=new Set();
   this.root.traverse(mesh=>{
    if(!mesh.isSkinnedMesh||!/body/.test(mesh.name)||seen.has(mesh.geometry.attributes.position))return;
    seen.add(mesh.geometry.attributes.position);
    for(let i=0;i<mesh.geometry.attributes.position.count;i++){
     mesh.getVertexPosition(i,tmp).applyMatrix4(mesh.matrixWorld);const distance=tmp.distanceTo(pos);
     if(distance>=bd)continue;
     const si=mesh.geometry.attributes.skinIndex,sw=mesh.geometry.attributes.skinWeight;let weight=-1,bone=null;
     for(let j=0;j<4;j++)if(sw.array[i*4+j]>weight){weight=sw.array[i*4+j];bone=mesh.skeleton.bones[si.array[i*4+j]];}
     while(bone&&!BODY_HIT.some(h=>h.name===bone.name))bone=bone.parent;
     const hit=bone&&BODY_HIT.find(h=>h.name===bone.name);
     if(hit){bd=distance;chosen=hit;point=tmp.clone();}
    }
   });
   this.lastSurfacePoint=point;this.lastHitDistance=chosen?bd:this.lastHitDistance;return chosen||best;
  }
  beginGrab(ctrl,hit,contact){
   if(this.grabs.has(ctrl))return;
   const bone=this.bones[hit.name];if(!bone)return;
   const anchor=contact?.clone()||this.lastSurfacePoint?.clone()||ctrl.getWorldPosition(V());
   const g={ctrl,hit,side:hit.name.startsWith('L_')?'L':hit.name.startsWith('R_')?'R':null,
    limb:/arm|hand/.test(hit.kind)?'arm':/thigh|leg|foot/.test(hit.kind)?'leg':null,
    local:bone.worldToLocal(anchor.clone()),last:ctrl.getWorldPosition(V()),velocity:V(),pull:V(),elapsed:0,offset:ctrl.getWorldPosition(V()).sub(anchor),spring:this.soft.find(s=>s.name===hit.name)||null,tx:0,ty:0,tz:0};
   this.grabs.set(ctrl,g);this.held=[...this.grabs.values()][0];this.dest=null;this.feet={};this.setEmotion('surprise',.35,{hold:2,source:'interaction'});
  }
  tickGrab(dt){
   if(!(dt>0)||(this.inBaseTick&&this.balance.state!=='standing'))return;
   for(const g of this.grabs.values()){
    const bone=this.bones[g.hit.name],p=g.ctrl.getWorldPosition(V()).sub(g.offset);
    const delta=g.ctrl.getWorldPosition(V()).sub(g.last);g.last.copy(p).add(g.offset);
    if(delta.length()>.55){this.endGrab(g.ctrl);continue;}
    g.velocity.lerp(cap(delta.multiplyScalar(1/Math.max(dt,.001)),3),1-Math.exp(-18*dt));g.elapsed+=dt;
    const anchor=bone.localToWorld(g.local.clone()),pull=p.clone().sub(anchor);g.pull.copy(pull);
    if(g.spring){
     const local=pull.clone().applyQuaternion(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
     const temp={...g.spring,x:local.x,y:local.y,z:local.z,vx:0,vy:0,vz:0};this.limitSoft(temp);g.tx=temp.x;g.ty=temp.y;g.tz=temp.z;
     continue;
    }
    const h=this.shape.height;
    // Preserve the contact offset even for an elbow/mid-limb grab.
    if(g.limb){
     const names=g.limb==='arm'?['Upperarm','Forearm','Hand']:['Thigh','Calf','Foot'];
     const proximal=g.hit.name===g.side+'_'+names[0];
     const end=this.bones[g.side+'_'+names[2]],tip=end.getWorldPosition(V()).add(pull);
     const pole=new THREE.Vector3((g.side==='L'?1:-1)*(g.limb==='arm'?.45:.12),g.limb==='arm'?1.12:.52,g.limb==='arm'?-.15:.3).multiplyScalar(h);this.group.localToWorld(pole);
     if(proximal){const b=this.bones[g.side+'_'+names[0]],child=this.bones[g.side+'_'+names[1]];this.aimBone(b,child,child.getWorldPosition(V()).add(pull));}
     else this.solveChain(g.side,g.limb,tip,pole);
    }
    // Pulling a leg removes one support. Arm pulls take a step before toppling.
    const horizontal=Math.hypot(pull.x,pull.z),leg=g.limb==='leg';
    if(this.balance.state==='standing'){
     const threshold=leg?.13*h:.31*h;
     this.balance.stress=Math.max(this.balance.stress,Math.max(0,horizontal-threshold)+(leg?Math.max(0,pull.y-.1*h):0));
     if(horizontal>threshold||!g.limb){
      const follow=cap(new THREE.Vector3(pull.x,0,pull.z),.35*h);
      this.group.position.addScaledVector(follow,1-Math.exp(-dt*(leg?1.4:4)));
      this.balance.dir.copy(pull).setY(0);cap(this.balance.dir,1);
     }
     if((leg&&(horizontal>.25*h||pull.y>.25*h))||horizontal>.63*h||this.balance.stress>.48*h)this.knockDown(pull,g.velocity);
    }else{
     this.group.position.addScaledVector(cap(pull.clone().setY(0),.4*h),1-Math.exp(-dt*4));
    }
   }
   this.held=[...this.grabs.values()][0]||null;
  }
  endGrab(ctrl){
   const list=ctrl?[this.grabs.get(ctrl)]:[...this.grabs.values()];
   for(const g of list){if(!g)continue;
    if(g.spring){const vv=g.velocity.clone().applyQuaternion(this.bones[g.hit.name].parent.getWorldQuaternion(new THREE.Quaternion()).invert()).multiplyScalar(.08);cap(vv,.2);g.spring.vx=vv.x;g.spring.vy=vv.y;g.spring.vz=vv.z;this.limitSoft(g.spring);}
    else this.balance.velocity.add(cap(g.velocity.clone().setY(0).multiplyScalar(.18),.6));
    this.grabs.delete(g.ctrl);
   }
   this.held=[...this.grabs.values()][0]||null;this.feet={};
  }
  knockDown(direction,velocity=V()){
   if(this.balance.state!=='standing')return;
   const b=this.balance;b.state='falling';b.time=0;b.dir.copy(direction).setY(0);
   if(b.dir.lengthSq()<.001)b.dir.set(0,0,-1);b.dir.normalize();
   b.velocity.copy(velocity).setY(0);cap(b.velocity,.7);this.autoWander=false;this.dest=null;this.speed=0;
   this.setEmotion('surprise',.7,{hold:3,source:'balance'});
  }
  tickBalance(dt){
   const b=this.balance;b.time+=dt;b.stress=Math.max(0,b.stress-dt*.2);
   this.group.position.addScaledVector(b.velocity,dt);b.velocity.multiplyScalar(Math.exp(-dt*5));
   if(b.state==='standing'){b.tilt=0;this.root.quaternion.identity();return;}
   this.feet={};
   if(b.state==='falling'){
    b.tilt=damp(b.tilt,1.45,6,dt);
    if(b.time>.95){b.state='down';b.time=0;}
   }else if(b.state==='down'){
    b.tilt=damp(b.tilt,1.45,8,dt);
    if(b.time>1.1&&!this.grabs.size){b.state='recovering';b.time=0;b.recoverFrom=b.tilt;this.setEmotion('concerned',.42,{hold:5,source:'recovery'});}
   }else if(b.state==='recovering'){
    if(this.grabs.size){b.state='down';b.time=0;return;}
    const u=clamp(b.time/3.2,0,1);b.tilt=b.recoverFrom*(1-smooth(u));
    if(u===1){b.state='standing';b.time=0;b.tilt=0;this.root.quaternion.identity();this.group.position.y=this.baseY;this.feet={};this.handTargets={};this.poseQ={};}
   }
   if(b.state==='standing')return;
   // Rotate about the hip and place the lowest body capsule above the floor.
   // Recovery is procedural animation, not a physically solved active ragdoll.
   const localDir=b.dir.clone().applyQuaternion(this.group.getWorldQuaternion(new THREE.Quaternion()).invert());
   const fallAxis=new THREE.Vector3(localDir.z,0,-localDir.x).normalize();
   this.root.quaternion.setFromAxisAngle(fallAxis,b.tilt);
   const h=this.shape.height;
   this.root.position.copy(this.baseRootPos||V());
   const pivot=new THREE.Vector3(0,.92*h,0),rot=pivot.clone().applyQuaternion(this.root.quaternion);
   this.root.position.add(pivot).sub(rot);
   this.group.position.y=this.baseY-.016*h;
   if(b.state==='recovering'){
    const k=Math.sin(Math.PI*clamp(b.time/3.2,0,1));
    this.bones.L_Thigh.quaternion.multiply(q.setFromAxisAngle(new THREE.Vector3(1,0,0),.5*k));
    this.bones.R_Thigh.quaternion.multiply(q.setFromAxisAngle(new THREE.Vector3(1,0,0),.85*k));
    this.bones.L_Calf.quaternion.multiply(q.setFromAxisAngle(new THREE.Vector3(1,0,0),-.8*k));
    this.bones.R_Calf.quaternion.multiply(q.setFromAxisAngle(new THREE.Vector3(1,0,0),-1.1*k));
   }
   this.group.updateMatrixWorld(true);
   let min=Infinity;
   for(const spec of BODY_HIT){const bone=this.bones[spec.name];if(!bone)continue;min=Math.min(min,bone.getWorldPosition(tmp).y-spec.rad*h);}
   this.group.position.y+=this.baseY+.012*h-min;
   this.group.updateMatrixWorld(true);
   if(b.state==='recovering'){
    const u=clamp(b.time/3.2,0,1),brace=1-smooth((u-.35)/.45);
    for(const side of ['L','R']){
     const hand=this.bones[side+'_Hand'],sign=side==='L'?1:-1;
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
    const k=(2*Math.PI*(s.kind==='breast'?2.9:4.8)/Math.sqrt(size))**2;
    const gravity=new THREE.Vector3(0,-9.81,0).applyQuaternion(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
    s.v2Gravity=gravity.multiplyScalar((s.kind==='breast'?.30:.1)*this.shape.height/k);
    s.v2Gravity.multiplyScalar(.5+.5*Math.cbrt(size));
   }
   // Integrate in small fixed steps with backward-Euler compliant anchors.
   this.softAccumulator=Math.min(this.softAccumulator+dt,.05);
   for(const s of this.soft){const bone=this.bones[s.name];if(!bone)continue;
    s.anchor.copy(this.bindPos[s.name]).applyMatrix4(bone.parent.matrixWorld);
    const velocity=s.anchor.clone().sub(s.prevAnchor).multiplyScalar(1/Math.max(dt,.001));
    if(!s.ready||s.anchor.distanceTo(s.prevAnchor)>.25){s.prevVelocity.copy(velocity);s.acceleration.set(0,0,0);s.ready=true;}
    else{s.acceleration.copy(cap(velocity.clone().sub(s.prevVelocity).multiplyScalar(1/Math.max(dt,.001)),15)).applyQuaternion(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).multiplyScalar(-.35*this.jiggleAmt());}
    s.prevVelocity.copy(velocity);s.prevAnchor.copy(s.anchor);s.pressT-=dt;if(s.pressT<=0)s.press.multiplyScalar(Math.exp(-dt*20));
   }
   const step=1/120;
   while(this.softAccumulator+1e-9>=step){
    for(const s of this.soft){
     const size=s.kind==='breast'?this.shape.breast:this.shape.butt,j=this.jiggleAmt();
     const held=[...this.grabs.values()].find(g=>g.spring===s);
     const omega=2*Math.PI*(s.kind==='breast'?2.9:4.8)/Math.sqrt(size),k=held?750:omega*omega;
     const damping=held?48:2*omega*clamp(.62/(.6+j*.55),.28,.85);
     s.px=s.x;s.py=s.y;s.pz=s.z;
     for(const a of ['x','y','z']){
      const target=held?held['t'+a]:s.v2Gravity[a]+s.press[a];
      s['v'+a]=(s['v'+a]+step*(s.acceleration[a]+k*(target-s[a])))/(1+damping*step+k*step*step);
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
  limitSoft(s){
   const size=s.kind==='breast'?this.shape.breast:this.shape.butt,h=this.shape.height;
   const growth=Math.cbrt(size);
   // Parent Y points out of the chest. Compression into the attachment is much
   // more restricted than outward/downward motion; a spherical clamp can invert
   // the tightly weighted inner rim when the breast is enlarged.
   const limits=s.kind==='breast'?[[ -.014*h*growth,.014*h*growth],[-.002*h/Math.max(1,size),.022*h*growth],[-.028*h*growth,.018*h*growth]]:[[-.018*h,.018*h],[-.016*h,.016*h],[-.016*h,.016*h]];
   for(const [i,a] of ['x','y','z'].entries()){
    const raw=Number.isFinite(s[a])?s[a]:0;s[a]=clamp(raw,limits[i][0],limits[i][1]);
    s['v'+a]=clamp(Number.isFinite(s['v'+a])?s['v'+a]:0,-.55,.55);
    if(s[a]!==raw)s['v'+a]*=.25;
   }
  }
  applyStrike(hit,n,c,g,p){
   super.applyStrike(hit,n,c,g,p);
   if(c>2.3&&['chest','hip','thigh','leg','head'].includes(hit.kind))this.knockDown(n.clone().negate(),n.clone().multiplyScalar(-Math.min(c*.15,.7)));
   else if(c>.7)this.setEmotion('surprise',clamp(c*.15,0,.6),{hold:2,source:'contact'});
  }
  resetPhysics(){
   super.resetPhysics();this.grabs?.clear();this.handTargets={};this.hairPhysics?.reset();
   if(this.balance){this.balance.velocity.set(0,0,0);this.balance.stress=0;}
  }
  tick(dt,cam,t){
   if(!this.baseRootPos)this.baseRootPos=this.root.position.clone();
   this.dt=clamp(dt,0,.05);this.time=t;dt=this.dt;
   this.root.position.copy(this.baseRootPos);this.root.quaternion.identity();
   // The v1 animation pipeline dispatches through these v2 overrides.
   this.inBaseTick=true;super.tick(dt,cam,t);this.inBaseTick=false;
   this.poseArms();this.group.updateMatrixWorld(true);
   // Limb IK follows the final arm pose, including both controllers independently.
   this.tickBalance(dt);
   if(this.balance.state!=='standing')this.tickGrab(dt);
   this.group.updateMatrixWorld(true);
   this.tickSoft(dt);this.group.updateMatrixWorld(true);
   this.hairPhysics?.tick(dt);
   this.root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
  }
  keepArmsClear(){} // final world-space IK chooses hand targets clear of the chest
  solveFeet(dt,moving){
   if(this.balance.state!=='standing'){this.feet={};return;}
   if([...this.grabs.values()].some(g=>g.limb==='leg')){
    // Plant only the unheld leg; the held chain is owned by the grab constraint.
    const saved={};for(const g of this.grabs.values())if(g.limb==='leg')for(const n of ['Thigh','Calf','Foot']){const b=this.bones[g.side+'_'+n];saved[b.name]=b.quaternion.clone();}
    super.solveFeet(dt,moving);for(const [n,r] of Object.entries(saved))this.bones[n].quaternion.copy(r);return;
   }
   super.solveFeet(dt,moving);
  }
 };
}

// A small set of guide chains drives the supplied 20k hair-card vertices in the
// vertex shader. Pinned roots, compliant rest/length constraints, capsules and
// floor projection. No per-frame CPU skinning/upload of the full hair mesh.
class HairGuides {
 constructor(actor,hits){
  this.actor=actor;this.hits=hits;this.acc=0;this.chains=[];this.uniform=Array.from({length:48},V);this.ready=false;
  actor.root.traverse(o=>{if(o.isSkinnedMesh&&/hair/i.test(o.name))this.mesh=o;});
  if(!this.mesh)return;
  const mesh=this.mesh;mesh.geometry=mesh.geometry.clone();const attr=mesh.geometry.attributes.position;
  const head=actor.bones.Head,inv=head.matrixWorld.clone().invert(),p=V();
  const samples=Array.from({length:12},()=>Array.from({length:4},()=>({sum:V(),n:0})));
  const ids=new Float32Array(attr.count*2);
  for(let i=0;i<attr.count;i++){
   p.fromBufferAttribute(attr,i);mesh.applyBoneTransform(i,p);p.applyMatrix4(mesh.matrixWorld).applyMatrix4(inv);
   const angle=(Math.atan2(p.x,p.z)+Math.PI)/(2*Math.PI)*12;
   const t=clamp((.025-p.y)/.45,0,1)*3;ids[i*2]=angle;ids[i*2+1]=t;
   const a=Math.floor(angle)%12,j=Math.round(t);samples[a][j].sum.add(p);samples[a][j].n++;
  }
  mesh.geometry.setAttribute('v2HairCoord',new THREE.BufferAttribute(ids,2));
  for(let a=0;a<12;a++){
   const theta=(a+.5)/12*Math.PI*2-Math.PI;
   const nodes=[];
   for(let j=0;j<4;j++){
    const s=samples[a][j],rest=s.n?s.sum.divideScalar(s.n):new THREE.Vector3(Math.sin(theta)*.115,.04-j*.15,Math.cos(theta)*.115);
    const world=rest.clone().applyMatrix4(head.matrixWorld);nodes.push({rest,p:world.clone(),prev:world.clone(),target:world.clone(),lambda:0});
   }
   this.chains.push(nodes);
  }
  const mat=mesh.material;mat.roughness=.58;
  mat.onBeforeCompile=shader=>{
   shader.uniforms.v2HairOffsets={value:this.uniform};
   shader.vertexShader='attribute vec2 v2HairCoord;\nuniform vec3 v2HairOffsets[48];\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <skinning_vertex>',`#include <skinning_vertex>
    float ha=mod(v2HairCoord.x,12.0); int ia=int(floor(ha)); int ib=int(mod(float(ia)+1.0,12.0));
    float ht=clamp(v2HairCoord.y,0.0,2.999); int hj=int(floor(ht)); float hf=fract(ht);
    vec3 da=mix(v2HairOffsets[ia*4+hj],v2HairOffsets[ia*4+hj+1],hf);
    vec3 db=mix(v2HairOffsets[ib*4+hj],v2HairOffsets[ib*4+hj+1],hf);
    vec3 hairDelta=mix(da,db,fract(ha))*smoothstep(0.0,0.45,ht);
    transformed += inverse(mat3(modelMatrix))*hairDelta;`);
  };
  mat.customProgramCacheKey=()=> 'mira-v2-hair-r170';mat.needsUpdate=true;
 }
 reset(){this.ready=false;this.acc=0;}
 tick(dt){
  if(!this.mesh||!dt)return;const head=this.actor.bones.Head;
  for(const chain of this.chains)for(const n of chain){n.target.copy(n.rest).applyMatrix4(head.matrixWorld);if(!this.ready||n.p.distanceTo(n.target)>.5){n.p.copy(n.target);n.prev.copy(n.target);}}
  this.ready=true;this.acc=Math.min(this.acc+dt,.05);const step=1/120,h=this.actor.shape.height;
  const spheres=[];
  for(const spec of this.hits){
   if(!/head|chest|arm|hand/.test(spec.kind))continue;
   const b=this.actor.bones[spec.name];if(!b)continue;
   const a=new THREE.Vector3(...(spec.offset||[0,0,0])).applyMatrix4(b.matrixWorld);
   const e=spec.end&&this.actor.bones[spec.end]?this.actor.bones[spec.end].getWorldPosition(V()):a.clone();
   spheres.push({a,b:e,r:spec.rad*h+.008*h});
  }
  while(this.acc+1e-9>=step){
   for(const chain of this.chains){
    chain[0].p.copy(chain[0].target);chain[0].prev.copy(chain[0].p);
    for(let j=1;j<4;j++){
     const n=chain[j],old=n.p.clone();
     n.p.add(cap(n.p.clone().sub(n.prev).multiplyScalar(.965),.025*h)).addScaledVector(new THREE.Vector3(0,-9.81,0),step*step*.35);
     n.p.addScaledVector(n.target.clone().sub(n.p),j===1?.055:.018);n.prev.copy(old);n.lambda=0;
    }
    for(let iter=0;iter<3;iter++)for(let j=1;j<4;j++){
     const a=chain[j-1],b=chain[j],delta=b.p.clone().sub(a.p),len=delta.length();
     const rest=a.target.distanceTo(b.target),alpha=.000002/(step*step),wa=j===1?0:1;
     if(len>1e-8){const dl=(-(len-rest)-alpha*b.lambda)/(wa+1+alpha);b.lambda+=dl;delta.multiplyScalar(dl/len);b.p.add(delta);if(wa)a.p.sub(delta);}
     for(const c of spheres){const d=c.b.clone().sub(c.a);const u=clamp(b.p.clone().sub(c.a).dot(d)/Math.max(d.lengthSq(),1e-8),0,1);const center=c.a.clone().addScaledVector(d,u),normal=b.p.clone().sub(center),dist=normal.length();if(dist<c.r){if(dist<1e-6)normal.set(0,0,-1);else normal.divideScalar(dist);b.p.copy(center).addScaledVector(normal,c.r);}}
     b.p.y=Math.max(this.actor.baseY+.012*h,b.p.y);
     const offset=cap(b.p.clone().sub(b.target),.105*h);b.p.copy(b.target).add(offset);
    }
   }
   this.acc-=step;
  }
  for(let i=0;i<12;i++)for(let j=0;j<4;j++)this.uniform[i*4+j].subVectors(this.chains[i][j].p,this.chains[i][j].target);
 }
}
