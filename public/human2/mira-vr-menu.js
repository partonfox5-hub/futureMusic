import * as THREE from 'three';
import {SLIDERS,FACE_TYPES} from './mira-v2.js?v=3';
import {EMOTION_NAMES,IDLE_NAMES,WALK_NAMES} from './mira-v2-features.js?v=3';
export function createVRMenu({scene,renderer,camera,system,spawn,onSync}){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1320;
 const ctx=canvas.getContext('2d'),tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
 const panel=new THREE.Mesh(new THREE.PlaneGeometry(.74,.954),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide,toneMapped:false}));
 panel.visible=false;panel.renderOrder=20;scene.add(panel);
 const rays=system.hands.ctrl.map(ctrl=>{const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-2)]),new THREE.LineBasicMaterial({color:0x9bd6ff}));line.visible=false;ctrl.add(line);return line;});
 const raycaster=new THREE.Raycaster(),q=new THREE.Quaternion(),v=new THREE.Vector3();
 let page=0,items=[],open=false,drag=[null,null],stamp='',lastDraw=0,notice='';
 const modes=['idle','wander','airSquats','stretch','jumpingJacks'];
 function active(){return system.selected;}
 function draw(){
  items=[];ctx.fillStyle='#151c25';ctx.fillRect(0,0,1024,1320);ctx.strokeStyle='#657d92';ctx.lineWidth=3;ctx.strokeRect(3,3,1018,1314);
  ctx.fillStyle='#eef7ff';ctx.font='bold 42px sans-serif';ctx.fillText('MIRA',40,62);
  ctx.font='26px sans-serif';ctx.fillStyle='#b7c8d8';ctx.fillText('Y: close  ·  point + trigger to adjust',40,105);
  function button(label,x,y,w,h,fn){ctx.fillStyle='#26384b';ctx.fillRect(x,y,w,h);ctx.fillStyle='#edf6ff';ctx.font='28px sans-serif';ctx.textAlign='center';ctx.fillText(label,x+w/2,y+h/2+10);ctx.textAlign='left';items.push({x,y,w,h,fn});}
  ['ACTOR','SHAPE','EXPRESSION'].forEach((n,i)=>button((i===page?'• ':'')+n,40+i*318,140,306,66,()=>{page=i;draw();}));
  const a=active();ctx.font='30px sans-serif';ctx.fillStyle='#aed8fb';ctx.fillText(a?`Mira ${system.actors.indexOf(a)+1} · ${a.version.toUpperCase()}`:'No actor selected',40,264);
  function cycle(label,y,values,get,set){const val=get();ctx.fillStyle='#c9d6e2';ctx.font='28px sans-serif';ctx.fillText(label,40,y);button('‹',40,y+18,90,70,()=>{set(values[(values.indexOf(val)+values.length-1)%values.length]);onSync?.();draw();});button(String(val),144,y+18,734,70,()=>{set(values[(values.indexOf(val)+1)%values.length]);onSync?.();draw();});button('›',892,y+18,90,70,()=>{set(values[(values.indexOf(val)+1)%values.length]);onSync?.();draw();});}
  if(page===0){
   button('SPAWN V1',40,300,455,80,()=>{spawn('v1');draw();});button('SPAWN V2',515,300,467,80,()=>{spawn('v2');draw();});
   button('SELECT NEXT',40,400,610,76,()=>{const list=system.actors;system.select(list[(list.indexOf(active())+1)%list.length]);onSync?.();draw();});
   button('REMOVE',670,400,312,76,()=>{if(active())system.remove(active());onSync?.();draw();});
   if(a){cycle('Movement',540,modes,()=>a.mode,m=>{a.autoWander=m==='wander';a.dest=null;a.feet={};a.setMode(m);});
    if(a.version==='v2'){
     cycle('Walk style',690,WALK_NAMES,()=>WALK_NAMES[a.gait],x=>a.gait=WALK_NAMES.indexOf(x));
     cycle('Idle pose',840,['auto',...IDLE_NAMES],()=>a.idleChoice,x=>{a.idleChoice=x;a.idleT=0;});
    }
   }
   button('TOSS BALL',40,1020,455,76,()=>{const c=renderer.xr.getCamera();c.getWorldPosition(v);const dir=c.getWorldDirection(new THREE.Vector3());system.spawnBall(v.clone().addScaledVector(dir,.5),dir.multiplyScalar(2).setY(1));});
   button('VOICE ON / OFF',515,1020,467,76,()=>document.getElementById('micBtn')?.click());
   button('EXIT VR / AR',40,1130,942,76,()=>renderer.xr.getSession()?.end());
  }else if(page===1&&a){
   for(let i=0;i<SLIDERS.length;i++){
    const s=SLIDERS[i],y=315+i*91,x=360,w=612;ctx.fillStyle='#dce8f2';ctx.font='26px sans-serif';ctx.fillText(s.label+'  '+a.shape[s.key].toFixed(2),40,y+22);
    ctx.fillStyle='#455568';ctx.fillRect(x,y+5,w,19);const u=(a.shape[s.key]-s.min)/(s.max-s.min);ctx.fillStyle='#92d1ff';ctx.fillRect(x,y+5,w*u,19);ctx.beginPath();ctx.arc(x+w*u,y+14,19,0,Math.PI*2);ctx.fill();
    items.push({x:x-20,y:y-20,w:w+40,h:68,slider:true,fn:px=>{const k=THREE.MathUtils.clamp((px-x)/w,0,1);a.shape[s.key]=Math.round((s.min+k*(s.max-s.min))/s.step)*s.step;onSync?.();draw();}});
   }
   button('FACE: '+(a.faceType===1?'REFERENCE':'NATURAL'),40,1150,942,76,()=>{a.faceType=a.faceType===1?0:1;a.applyLooks();onSync?.();draw();});
  }else if(page===2&&a){
   if(a.version==='v2'){
    cycle('Expression',340,EMOTION_NAMES,()=>a.emotion.name,x=>{a.expressionOverride=x;a.setEmotion(x,.8,{source:'manual'});});
    button(a.expressionOverride?'USE CONVERSATION CONTEXT':'CONTEXT IS ACTIVE',40,495,942,80,()=>{a.expressionOverride=null;a.setEmotion('neutral',.5,{source:'idle'});draw();});
    ctx.fillStyle='#c9d6e2';ctx.font='28px sans-serif';ctx.fillText('Expressions persist and gradually settle.',40,645);ctx.fillText('Use the desktop chat or voice to converse.',40,695);
    button('PREVIEW SMILE CLIP',40,780,942,80,()=>a.playFaceReference?.('smile'));
    button('PREVIEW SURPRISE CLIP',40,890,942,80,()=>a.playFaceReference?.('surprise'));
   }else{ctx.fillText('Select Mira v2 for context expression controls.',40,355);}
  }
  ctx.font='24px sans-serif';ctx.fillStyle='#acbecf';ctx.fillText(notice||'Grip: grab body  ·  Right B: ball',40,1280);tex.needsUpdate=true;
 }
 function toggle(){open=!open;panel.visible=open&&renderer.xr.isPresenting;drag=[null,null];if(open){const c=renderer.xr.getCamera();const eye=c.getWorldPosition(new THREE.Vector3());const forward=c.getWorldDirection(new THREE.Vector3());forward.y=0;forward.normalize();panel.position.copy(eye).addScaledVector(forward,1.1);panel.position.y-=.10;panel.lookAt(eye.x,panel.position.y,eye.z);panel.updateMatrixWorld(true);draw();}}
 function hit(i){const ctrl=system.hands.ctrl[i];ctrl.getWorldPosition(raycaster.ray.origin);raycaster.ray.direction.set(0,0,-1).applyQuaternion(ctrl.getWorldQuaternion(q));const hit=raycaster.intersectObject(panel)[0];if(!hit)return null;return {x:hit.uv.x*1024,y:(1-hit.uv.y)*1320};}
 function select(i){if(!open)return false;const p=hit(i);if(p){const item=items.find(a=>p.x>=a.x&&p.x<=a.x+a.w&&p.y>=a.y&&p.y<=a.y+a.h);if(item){try{item.fn(p.x);}catch(e){notice=e.message;draw();}if(item.slider)drag[i]=item;}}return true;}
 function tick(){
  if(!renderer.xr.isPresenting){open=false;panel.visible=false;}
  rays.forEach(r=>r.visible=open);if(!open)return;
  const a=active(),state=a?`${system.actors.indexOf(a)}/${a.version}/${a.mode}/${a.emotion?.name}`:'empty';if(state!==stamp&&performance.now()-lastDraw>150){stamp=state;lastDraw=performance.now();draw();}
  const session=renderer.xr.getSession();for(let i=0;i<2;i++)if(drag[i]){
   const src=[...session.inputSources].find(s=>s.handedness===system.hands.handedness[i]);if(!src?.gamepad?.buttons?.[0]?.pressed){drag[i]=null;continue;}
   const p=hit(i);if(p)drag[i].fn(p.x);
  }
 }
 system.setUIHandlers({onToggle:toggle,onSelect:select,isOpen:()=>open});
 return {tick,toggle,get isOpen(){return open;}};
}
