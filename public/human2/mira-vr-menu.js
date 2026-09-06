import * as THREE from 'three';
import {SLIDERS,FACE_TYPES} from './mira-v2.js?v=7';
import {shapeSliders,FACE_PRESETS,HAIR_STYLES,ACTIVITY_MODES,ACTION_LABELS,POSE_LABELS} from './mira-v2-controls.js?v=7';
import {HAIR_COLORS} from './mira-v2.js?v=7';
import {EMOTION_NAMES,IDLE_NAMES,WALK_NAMES} from './mira-v2-features.js?v=7';
export function createVRMenu({scene,renderer,camera,system,spawn,onSync}){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1320;
 const ctx=canvas.getContext('2d'),tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
 const panel=new THREE.Mesh(new THREE.PlaneGeometry(.74,.954),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide,toneMapped:false,depthTest:false,depthWrite:false}));
 panel.visible=false;panel.renderOrder=20;scene.add(panel);
 const rays=system.hands.ctrl.map(ctrl=>{const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-2)]),new THREE.LineBasicMaterial({color:0x9bd6ff}));line.visible=false;ctrl.add(line);return line;});
 const raycaster=new THREE.Raycaster(),q=new THREE.Quaternion(),v=new THREE.Vector3();
 let page=4,shapePage=0,items=[],open=false,drag=[null,null],stamp='',lastDraw=0,notice='';
 const modes=ACTIVITY_MODES;
 function active(){return system.selected;}
 function draw(){
  items=[];ctx.fillStyle='#151c25';ctx.fillRect(0,0,1024,1320);ctx.strokeStyle='#657d92';ctx.lineWidth=3;ctx.strokeRect(3,3,1018,1314);
  ctx.fillStyle='#eef7ff';ctx.font='bold 42px sans-serif';ctx.fillText('MIRA · UPDATE 7',40,62);
  ctx.font='26px sans-serif';ctx.fillStyle='#b7c8d8';ctx.fillText('Y: close  ·  point + trigger to adjust',40,105);
  function button(label,x,y,w,h,fn){ctx.fillStyle='#26384b';ctx.fillRect(x,y,w,h);ctx.fillStyle='#edf6ff';ctx.font='28px sans-serif';ctx.textAlign='center';ctx.fillText(label,x+w/2,y+h/2+10);ctx.textAlign='left';items.push({x,y,w,h,fn});}
  ['ACTOR','BODY','STYLE','MOOD','POSES'].forEach((n,i)=>button((i===page?'• ':'')+n,40+i*190,140,180,66,()=>{page=i;draw();}));
  const a=active();ctx.font='30px sans-serif';ctx.fillStyle='#aed8fb';ctx.fillText(a?`Mira ${system.actors.indexOf(a)+1} · ${a.version.toUpperCase()}`:'No actor selected',40,264);
  function cycle(label,y,values,get,set){const val=get();ctx.fillStyle='#c9d6e2';ctx.font='28px sans-serif';ctx.fillText(label,40,y);button('‹',40,y+18,90,70,()=>{set(values[(values.indexOf(val)+values.length-1)%values.length]);onSync?.();draw();});button(String(val),144,y+18,734,70,()=>{set(values[(values.indexOf(val)+1)%values.length]);onSync?.();draw();});button('›',892,y+18,90,70,()=>{set(values[(values.indexOf(val)+1)%values.length]);onSync?.();draw();});}
  if(page===0){
   button('SPAWN V1',40,300,455,80,()=>{spawn('v1');draw();});button('SPAWN V2',515,300,467,80,()=>{spawn('v2');draw();});
   button('SELECT NEXT',40,400,610,76,()=>{const list=system.actors;system.select(list[(list.indexOf(active())+1)%list.length]);onSync?.();draw();});
   button('REMOVE',670,400,312,76,()=>{if(active())system.remove(active());onSync?.();draw();});
   if(a){cycle('Movement',540,modes,()=>a.autonomy?'auto':a.mode,m=>{a.autoWander=m==='wander';a.dest=null;a.feet={};a.setMode(m);});
    if(a.version==='v2'){
     cycle('Walk style',690,WALK_NAMES,()=>WALK_NAMES[a.gait],x=>a.gait=WALK_NAMES.indexOf(x));
     cycle('Idle pose',840,['auto',...IDLE_NAMES],()=>a.idleChoice,x=>a.setIdlePose(x));
    }
   }
   button('TOSS BALL',40,1020,455,76,()=>{const c=renderer.xr.getCamera();c.getWorldPosition(v);const dir=c.getWorldDirection(new THREE.Vector3());system.spawnBall(v.clone().addScaledVector(dir,.5),dir.multiplyScalar(2).setY(1));});
   button('VOICE ON / OFF',515,1020,467,76,()=>document.getElementById('micBtn')?.click());
   button('EXIT VR / AR',40,1130,942,76,()=>renderer.xr.getSession()?.end());
  }else if(page===4&&a){
   const choices=['idle','auto','wander','handsOnHips','airSquats','stretch','jumpingJacks','march','dance','sideSteps','reach','heelRaises','hug','armAround'];
   choices.forEach((mode,i)=>button(ACTION_LABELS[mode]||({handsOnHips:'Hands on hips',hug:'Hug nearby Mira',armAround:'Arm around Mira'})[mode],40+(i%2)*475,315+Math.floor(i/2)*82,455,68,()=>{
    if(mode==='hug'||mode==='armAround'){notice=system.requestSocial(mode)?'Approaching nearby Mira':'Needs two nearby, unoccupied v2 actors';}
    else if(mode==='handsOnHips'){a.setIdlePose?.(mode);notice='Hands on hips';}
    else{a.setMode(mode);notice=ACTION_LABELS[mode];}
    onSync?.();draw();
   }));
   if(a.version==='v2')cycle('Idle position',930,['auto',...IDLE_NAMES].map(n=>POSE_LABELS[n]||n),()=>POSE_LABELS[a.idleChoice]||a.idleChoice,label=>a.setIdlePose(['auto',...IDLE_NAMES].find(n=>(POSE_LABELS[n]||n)===label)));
   button('STOP / RELAX',40,1060,942,72,()=>{a.setIdlePose?a.setIdlePose('rest'):a.setMode('idle');notice='Stopped';onSync?.();draw();});
   ctx.fillStyle='#b7c8d8';ctx.font='25px sans-serif';ctx.fillText('Close Y, aim at the floor, then pull trigger to walk.',40,1190);
  }else if(page===1&&a){
   const sliders=shapeSliders(SLIDERS,a),pages=Math.ceil(sliders.length/7);shapePage=Math.min(shapePage,pages-1);
   const visible=sliders.slice(shapePage*7,shapePage*7+7);
   for(let i=0;i<visible.length;i++){
    const s=visible[i],y=326+i*99,x=480,w=482,value=a.shape[s.key]??s.value;
    ctx.fillStyle='#dce8f2';ctx.font='26px sans-serif';ctx.fillText(s.label,40,y+10);ctx.fillStyle='#9bd6ff';ctx.fillText(value.toFixed(2),360,y+10);
    ctx.fillStyle='#455568';ctx.fillRect(x,y-6,w,19);const u=(value-s.min)/(s.max-s.min);ctx.fillStyle='#92d1ff';ctx.fillRect(x,y-6,w*u,19);ctx.beginPath();ctx.arc(x+w*u,y+3,18,0,Math.PI*2);ctx.fill();
    items.push({x:x-20,y:y-27,w:w+40,h:64,slider:true,fn:px=>{const k=THREE.MathUtils.clamp((px-x)/w,0,1);a.shape[s.key]=Math.round((s.min+k*(s.max-s.min))/s.step)*s.step;onSync?.();draw();}});
   }
   button('‹ PREVIOUS',40,1050,390,76,()=>{shapePage=(shapePage+pages-1)%pages;draw();});
   button('NEXT ›',592,1050,390,76,()=>{shapePage=(shapePage+1)%pages;draw();});
   ctx.fillStyle='#b7c8d8';ctx.font='26px sans-serif';ctx.fillText(`${shapePage+1} / ${pages}`,462,1100);
   ctx.fillText('Softer = more give. Damping = faster settling.',40,1190);
  }else if(page===2&&a){
   const faces=a.version==='v2'?FACE_PRESETS:FACE_TYPES;
   cycle('Face',330,faces.map(f=>f.name),()=>faces[a.faceType]?.name||faces[0].name,x=>{a.faceType=faces.findIndex(f=>f.name===x);a.applyLooks();});
   if(a.version==='v2')cycle('Hairstyle',510,HAIR_STYLES,()=>HAIR_STYLES[a.hairStyle],x=>a.hairStyle=HAIR_STYLES.indexOf(x));
   cycle('Hair colour',690,HAIR_COLORS.map(f=>f.name),()=>HAIR_COLORS[a.hairColor].name,x=>{a.hairColor=HAIR_COLORS.findIndex(f=>f.name===x);a.applyLooks();});
   ctx.fillStyle='#b7c8d8';ctx.font='28px sans-serif';ctx.fillText('Hair responds to movement and brushing.',40,965);
   ctx.fillText('Body pages include softness and skin detail.',40,1020);
  }else if(page===3&&a){
   if(a.version==='v2'){
    cycle('Expression',340,EMOTION_NAMES,()=>a.emotion.name,x=>{a.expressionOverride=x;a.setEmotion(x,.8,{source:'manual'});});
    button(a.expressionOverride?'USE CONVERSATION CONTEXT':'CONTEXT IS ACTIVE',40,495,942,80,()=>{a.expressionOverride=null;a.setEmotion('neutral',.5,{source:'idle'});draw();});
    ctx.fillStyle='#c9d6e2';ctx.font='28px sans-serif';ctx.fillText('Expressions persist and gradually settle.',40,645);ctx.fillText('Use the desktop chat or voice to converse.',40,695);
    button('PREVIEW SMILE CLIP',40,780,942,80,()=>a.playFaceReference?.('smile'));
    button('PREVIEW SURPRISE CLIP',40,890,942,80,()=>a.playFaceReference?.('surprise'));
   }else{ctx.fillText('Select Mira v2 for context expression controls.',40,355);}
  }
  ctx.font='24px sans-serif';ctx.fillStyle='#acbecf';ctx.fillText(notice||system.voiceStatus||'Trigger: select / walk  ·  Grip: grab body',40,1280);tex.needsUpdate=true;
 }
 function toggle(){open=!open;panel.visible=open&&renderer.xr.isPresenting;drag=[null,null];if(open){page=4;const c=renderer.xr.getCamera();const eye=c.getWorldPosition(new THREE.Vector3());const forward=c.getWorldDirection(new THREE.Vector3());forward.y=0;if(forward.lengthSq()<.001)forward.set(0,0,-1);forward.normalize();panel.position.copy(eye).addScaledVector(forward,1.1);panel.position.y-=.10;panel.lookAt(eye.x,panel.position.y,eye.z);panel.updateMatrixWorld(true);draw();}}
 const wristCanvas=document.createElement('canvas');wristCanvas.width=256;wristCanvas.height=128;const wc=wristCanvas.getContext('2d');wc.fillStyle='#18384d';wc.fillRect(0,0,256,128);wc.strokeStyle='#9bd6ff';wc.lineWidth=8;wc.strokeRect(4,4,248,120);wc.fillStyle='#ffffff';wc.font='bold 48px sans-serif';wc.textAlign='center';wc.fillText('MENU',128,82);
 const wristTex=new THREE.CanvasTexture(wristCanvas);wristTex.colorSpace=THREE.SRGBColorSpace;
 const wristButtons=system.hands.grip.map(grip=>{const b=new THREE.Mesh(new THREE.PlaneGeometry(.060,.030),new THREE.MeshBasicMaterial({map:wristTex,side:THREE.DoubleSide,depthTest:false,depthWrite:false,toneMapped:false}));b.position.set(0,.070,-.025);b.renderOrder=25;grip.add(b);b.visible=false;return b;});
 function rayFrom(i){const ctrl=system.hands.ctrl[i];ctrl.getWorldPosition(raycaster.ray.origin);raycaster.ray.direction.set(0,0,-1).applyQuaternion(ctrl.getWorldQuaternion(q));}
 function hitWrist(i){rayFrom(i);return wristButtons.some((b,j)=>j!==i&&b.visible&&raycaster.intersectObject(b).length>0);}
 function hit(i){const ctrl=system.hands.ctrl[i];ctrl.getWorldPosition(raycaster.ray.origin);raycaster.ray.direction.set(0,0,-1).applyQuaternion(ctrl.getWorldQuaternion(q));const hit=raycaster.intersectObject(panel)[0];if(!hit)return null;return {x:hit.uv.x*1024,y:(1-hit.uv.y)*1320};}
 function select(i){if(hitWrist(i)){toggle();return true;}if(!open)return false;const p=hit(i);if(p){const item=items.find(a=>p.x>=a.x&&p.x<=a.x+a.w&&p.y>=a.y&&p.y<=a.y+a.h);if(item){try{item.fn(p.x);}catch(e){notice=e.message;draw();}if(item.slider)drag[i]=item;}}return true;}
 function tick(){
  const eye=renderer.xr.getCamera().getWorldPosition(new THREE.Vector3());
  wristButtons.forEach((b,i)=>{b.visible=renderer.xr.isPresenting&&system.hands.grip[i].visible&&(system.hands.handedness[i]==='left'||(system.hands.handedness[i]==='none'&&i===0));if(b.visible){b.lookAt(eye);b.updateWorldMatrix(true,false);}});
  if(!renderer.xr.isPresenting){open=false;panel.visible=false;}
  rays.forEach((r,i)=>{const floor=renderer.xr.isPresenting&&!open?system.controllerFloorTarget(i):null;r.visible=open||!!floor||(renderer.xr.isPresenting&&hitWrist(i));r.scale.z=open?1:floor?system.hands.ctrl[i].getWorldPosition(new THREE.Vector3()).distanceTo(floor)/2:1;});if(!open)return;
  const a=active(),state=a?`${system.actors.indexOf(a)}/${a.version}/${a.mode}/${a.emotion?.name}/${system.voiceStatus||''}`:'empty';if(state!==stamp&&performance.now()-lastDraw>150){stamp=state;lastDraw=performance.now();draw();}
  const session=renderer.xr.getSession();for(let i=0;i<2;i++)if(drag[i]){
   const src=[...session.inputSources].find(s=>s.handedness===system.hands.handedness[i]);if(!src?.gamepad?.buttons?.[0]?.pressed){drag[i]=null;continue;}
   const p=hit(i);if(p)drag[i].fn(p.x);
  }
 }
 system.setUIHandlers({onToggle:toggle,onSelect:select,isOpen:()=>open});
 return {tick,toggle,panel,get isOpen(){return open;}};
}
