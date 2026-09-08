import {FURNITURE,SURFACES} from './mira-v2-builder.js?v=13.0';
import {WEAPONS} from './mira-v2-props.js?v=13.3';
import {draft,saveDraft,OUTFITS,PERSONAS,clothingItems,setDraftGarment} from './mira-v2-catalog.js?v=11.0';
import {SCENES} from './mira-v2-world.js?v=13.3';
import {GARMENTS} from './mira-v2-wardrobe.js?v=11.2';
import * as THREE from 'three';
import {SLIDERS,FACE_TYPES} from './mira-v2.js?v=13.3';
import {shapeSliders,FACE_PRESETS,HAIR_STYLES,ACTIVITY_MODES,ACTION_LABELS,POSE_LABELS,ATTENTION_MODES,ATTENTION_LABELS} from './mira-v2-controls.js?v=12.9';
import {HAIR_COLORS} from './mira-v2.js?v=13.3';
import {EMOTION_NAMES,IDLE_NAMES,WALK_NAMES} from './mira-v2-features.js?v=13.3';
export function createVRMenu({scene,renderer,camera,system,spawn,onSync,world,wardrobe,spawnConfigured,copyConfiguration,props,saveScene,loadScene}){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1320;
 const ctx=canvas.getContext('2d'),tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
 const panel=new THREE.Mesh(new THREE.PlaneGeometry(.74,.954),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide,toneMapped:false,depthTest:false,depthWrite:false}));
 panel.visible=false;panel.renderOrder=20;scene.add(panel);
 const rays=system.hands.ctrl.map(ctrl=>{const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-2)]),new THREE.LineBasicMaterial({color:0x9bd6ff}));line.visible=false;ctrl.add(line);return line;});
 const raycaster=new THREE.Raycaster(),q=new THREE.Quaternion(),v=new THREE.Vector3();
 let page=4,shapePage=0,items=[],open=false,drag=[null,null],stamp='',lastDraw=0,notice='',hover=[-1,-1],cursor=[null,null],editField=null,bodyDraft=false,editClothes=false,editVisual=false,garmentIndex=0,weaponIndex=0,lastController=1;
 const modes=ACTIVITY_MODES;
 function active(){return system.selected;}
 function draw(){
  items=[];ctx.fillStyle='#151c25';ctx.fillRect(0,0,1024,1320);ctx.strokeStyle='#657d92';ctx.lineWidth=3;ctx.strokeRect(3,3,1018,1314);
  ctx.fillStyle='#eef7ff';ctx.font='bold 42px sans-serif';ctx.fillText('MIRA · BUILD & PLAY',40,62);
  ctx.font='26px sans-serif';ctx.fillStyle='#b7c8d8';ctx.fillText('Y: close  ·  point + trigger to adjust',40,105);
  function button(label,x,y,w,h,fn){ctx.fillStyle='#26384b';ctx.fillRect(x,y,w,h);ctx.fillStyle='#edf6ff';ctx.font='25px sans-serif';ctx.textAlign='center';ctx.fillText(label,x+w/2,y+h/2+10);ctx.textAlign='left';items.push({x,y,w,h,fn});}
  ['ACTOR','BODY','STYLE','MOOD','POSES','SCENE','SPAWN','LINKS','DRIVE','BUILD'].forEach((n,i)=>button((i===page?'• ':'')+n,12+i*100,140,96,66,()=>{page=i;draw();}));
  const a=active();ctx.font='30px sans-serif';ctx.fillStyle='#aed8fb';ctx.fillText(a?`Mira ${system.actors.indexOf(a)+1} · ${a.version.toUpperCase()}`:'No actor selected',40,264);
  function cycle(label,y,values,get,set){const val=get();ctx.fillStyle='#c9d6e2';ctx.font='28px sans-serif';ctx.fillText(label,40,y);button('‹',40,y+18,90,70,()=>{set(values[(values.indexOf(val)+values.length-1)%values.length]);onSync?.();draw();});button(String(val),144,y+18,734,70,()=>{set(values[(values.indexOf(val)+1)%values.length]);onSync?.();draw();});button('›',892,y+18,90,70,()=>{set(values[(values.indexOf(val)+1)%values.length]);onSync?.();draw();});}
  if(page===9){
   const b=world.builder;
   cycle('Piece',320,['Wall','Floor','Ceiling','Furniture'],()=>b.kind,x=>b.setKind(x));
   if(b.kind==='Furniture')cycle('Furniture',460,FURNITURE,()=>b.furniture,x=>b.furniture=x);
   else{
    cycle('Patch · each square is 0.6 m',460,['1×1','2×2','3×3'],()=>b.size+'×'+b.size,x=>b.size=Number(x[0]));
    cycle('Texture / material',600,Object.keys(SURFACES),()=>b.surface,x=>b.surface=x);
   }
   cycle('Rotation',740,['0°','90°','180°','270°'],()=>Math.round(b.yaw*180/Math.PI)+'°',x=>b.yaw=parseInt(x)*Math.PI/180);
   if(b.kind!=='Furniture'&&b.kind!=='Floor')cycle(b.kind==='Wall'?'Wall base height':'Ceiling underside height',880,Array.from({length:11},(_,i)=>(i*.6).toFixed(1)+' m'),()=>b.height.toFixed(1)+' m',x=>b.height=parseFloat(x));
   button('CLOSE & PLACE',40,1020,455,70,()=>toggle());
   button('STOP',515,1020,467,70,()=>{b.stop();draw();});
   button('UNDO LAST',40,1110,455,70,()=>{b.undo();draw();});
   button('SAVE SCENE',515,1110,467,70,()=>{notice='Saved '+saveScene();draw();});
   ctx.font='22px sans-serif';ctx.fillStyle='#c9d6e2';ctx.fillText('Close Y to equip. Trigger places. Right stick click rotates.',40,1220);
  }else if(page===8){const car=props.cars?.().find(c=>c.driving)||props.vehicle;button(car.driving?'EXIT CAR':'ENTER DRIVER SEAT',40,325,455,80,()=>{car.driving?car.exit():car.enter();draw();});button('GEAR '+(car.gear||'P'),515,325,467,80,()=>{car.cycleGear?.();draw();});button('REPAIR / RESET CAR',40,445,942,80,()=>{for(const c of props.cars?.()||[car])c.reset();draw();});button('REAR VIEW MIRROR '+(car.mirrorEnabled?'ON':'OFF'),40,565,942,80,()=>{car.mirrorEnabled=!car.mirrorEnabled;draw();});ctx.fillStyle='#dce8f2';ctx.font='27px sans-serif';ctx.fillText(car.telemetry||car.status||'',40,690);ctx.font='29px sans-serif';for(const [i,text] of ['Grip stalk: P / N / D. Grip wheel: steer.','Grip handles to open doors; grip hood/trunk edge.','Trigger only works in D/N while seated; N coasts.','Left X / Space brakes in every gear, including P.','Y menu applies brake. EXIT remains explicit.','Repair restores panels, tires and gear P.'].entries())ctx.fillText(text,40,750+i*57);
  }else if(page===7){
   const r=props.restraints,l=r.selected;cycle('Attachment',325,['Flexible tether','Short fixed link'],()=>r.mode==='rope'?'Flexible tether':'Short fixed link',x=>r.mode=x==='Flexible tether'?'rope':'fuse');button('PLACE TWO ANCHORS',40,445,600,70,()=>{r.start();notice='Close Y, point + trigger twice';draw();});button('CANCEL',660,445,322,70,()=>{r.cancel();draw();});
   cycle('Selected link',580,['None',...r.links.map(l=>'Link '+l.id+(l.broken?' · cut':''))],()=>l?'Link '+l.id+(l.broken?' · cut':''):'None',name=>r.selected=r.links.find(x=>name==='Link '+x.id+(x.broken?' · cut':''))||null);
   ctx.fillStyle='#dce8f2';ctx.font='28px sans-serif';ctx.fillText('Length: '+(l?.length||0).toFixed(2)+' m',40,735);ctx.fillStyle='#526c80';ctx.fillRect(365,719,600,24);if(l&&!l.broken){ctx.fillStyle='#9bd6ff';ctx.fillRect(365,719,600*l.length/5,24);items.push({x:345,y:692,w:640,h:65,slider:true,fn:px=>{r.setLength((px-365)/600*5);draw();}});}
   button('CUT · LEAVE ENDS',40,810,455,70,()=>{r.cut();draw();});button('REMOVE',515,810,467,70,()=>{r.remove();draw();});button('INJURIES '+(props.injuries.enabled?'ON':'OFF'),40,920,455,70,()=>{props.injuries.enabled=!props.injuries.enabled;draw();});button('DETACHMENT '+(props.injuries.allowSever?'ON':'OFF'),515,920,467,70,()=>{props.injuries.allowSever=!props.injuries.allowSever;draw();});button('RESTORE SELECTED NPC',40,1030,455,70,()=>{props.injuries.heal(a);draw();});button('CLEAR BODIES',515,1030,467,70,()=>{notice=props.injuries.clearBodies();draw();});ctx.font='24px sans-serif';ctx.fillText('Left stick click: attach · Sword or laser: cut a link',40,1180);
  }else if(page===6){
   if(editVisual){
    const choices=['Classic','Advanced'];
    cycle('Spawning eyes',325,choices,()=>draft.eyeDetail==='classic'?'Classic':'Advanced',x=>{draft.eyeDetail=x.toLowerCase();saveDraft();});
    cycle('Spawning hair',505,choices,()=>draft.hairDetail==='classic'?'Classic':'Advanced',x=>{draft.hairDetail=x.toLowerCase();saveDraft();});
    ctx.font='27px sans-serif';ctx.fillStyle='#c9d6e2';ctx.fillText('Classic: original eye materials and original hair cut.',40,750);ctx.fillText('Advanced: cornea effects, pupil response and hair guides.',40,805);ctx.fillText('These choices apply to the next configured NPC.',40,880);
    button('DONE',40,1050,942,80,()=>{editVisual=false;dispatchEvent(new Event('mira:draft'));draw();});
   }else if(editClothes){for(const [i,slot] of ['top','bottom','underwear','dress'].entries()){const choices=[{id:'',name:'None'},...GARMENTS.filter(g=>g.slot===slot)];cycle('Spawning '+slot,325+i*150,choices.map(g=>g.name),()=>choices.find(g=>g.id===(clothingItems().find(id=>GARMENTS.find(g=>g.id===id)?.slot===slot)||''))?.name,name=>setDraftGarment(slot,choices.find(g=>g.name===name).id));}cycle('Hair colour',930,HAIR_COLORS.map(c=>c.name),()=>HAIR_COLORS[draft.hairColor].name,name=>{draft.hairColor=HAIR_COLORS.findIndex(c=>c.name===name);saveDraft();});button('DONE',40,1100,942,80,()=>{editClothes=false;dispatchEvent(new Event('mira:draft'));draw();});
   }else if(editField){
    ctx.font='23px sans-serif';ctx.fillStyle='#dce8f2';const str=String(draft[editField]);for(let i=0;i<5;i++)ctx.fillText(str.slice(Math.max(0,str.length-250)+i*50,Math.max(0,str.length-250)+(i+1)*50),40,320+i*34);
    Array.from('qwertyuiopasdfghjklzxcvbnm.,!?').forEach((c,i)=>button(c,40+(i%10)*94,530+Math.floor(i/10)*90,82,75,()=>{draft[editField]=(draft[editField]+c).slice(0,editField==='name'?48:2000);saveDraft();draw();}));
    button('SPACE',40,850,290,76,()=>{draft[editField]+=' ';saveDraft();draw();});button('BACKSPACE',355,850,290,76,()=>{draft[editField]=draft[editField].slice(0,-1);saveDraft();draw();});button('CLEAR',670,850,312,76,()=>{draft[editField]='';saveDraft();draw();});button('DONE',40,970,942,80,()=>{saveDraft();dispatchEvent(new Event('mira:draft'));editField=null;draw();});
   }else{
    cycle('Body profile',320,['Female','Male · adapted rig'],()=>draft.bodyType==='male'?'Male · adapted rig':'Female',x=>{draft.bodyType=x==='Female'?'female':'male';draft.name=draft.bodyType==='male'?'Alex':'Mira';draft.faceType=draft.bodyType==='male'?5:1;draft.hairStyle=draft.bodyType==='male'?8:0;draft.shape={};saveDraft();});
    cycle('Face',455,FACE_PRESETS.map(f=>f.name),()=>FACE_PRESETS[draft.faceType]?.name,x=>{draft.faceType=FACE_PRESETS.findIndex(f=>f.name===x);saveDraft();});
    if(draft.hairDetail!=='classic')cycle('Hair',590,HAIR_STYLES,()=>HAIR_STYLES[draft.hairStyle],x=>{draft.hairStyle=HAIR_STYLES.indexOf(x);saveDraft();});
    cycle('Clothes',725,OUTFITS.map(x=>x.name),()=>OUTFITS[draft.outfit]?.name,x=>{draft.outfit=OUTFITS.findIndex(o=>o.name===x);delete draft.clothes;saveDraft();});
    cycle('Personality',860,PERSONAS.map(x=>x.name),()=>PERSONAS[draft.persona]?.name,x=>{draft.persona=PERSONAS.findIndex(p=>p.name===x);draft.prompt=PERSONAS[draft.persona].prompt;saveDraft();});
    button('EDIT NAME',40,990,290,68,()=>{editField='name';draw();});button('EDIT PROMPT',350,990,310,68,()=>{editField='prompt';draw();});button('EYES / HAIR',680,990,302,68,()=>{editVisual=true;draw();});
    button('COPY FEATURES',40,1080,455,68,()=>{copyConfiguration();draw();});button('MODULAR CLOTHES',515,1080,467,68,()=>{editClothes=true;draw();});button('SPAWN '+draft.name.toUpperCase(),40,1162,942,76,()=>{saveDraft();dispatchEvent(new Event('mira:draft'));spawnConfigured();draw();});
   }
  }else if(page===5){
   cycle('Diorama',330,SCENES,()=>world.name,name=>{world.setScene(name);document.getElementById('sceneSelect').value=name;});
   cycle('Clothing',470,GARMENTS.map(g=>g.name),()=>GARMENTS[garmentIndex].name,name=>garmentIndex=GARMENTS.findIndex(g=>g.name===name));button('DRESS SELECTED NPC',40,590,942,65,()=>{notice=wardrobe.equip(active(),GARMENTS[garmentIndex])?'Clothing applied':'Select a v2 actor';draw();});
   cycle('Table equipment',700,Object.values(WEAPONS).map(w=>w.name),()=>Object.values(WEAPONS)[weaponIndex].name,name=>weaponIndex=Object.values(WEAPONS).findIndex(w=>w.name===name));button('FIND WEAPON',40,800,455,62,()=>{notice='Reach for the table handle and hold grip';draw();});button('DROP',515,800,467,62,()=>props.drop(lastController));
   button('HAPTICS '+system.hands.haptics.gain.toFixed(1)+'×',40,880,455,62,()=>{system.hands.haptics.gain=(system.hands.haptics.gain+.5)%2.5;draw();});button('VOICE ON / OFF',515,880,467,62,()=>document.getElementById('micBtn')?.click());
   button('SAVE SCENE',40,958,455,62,()=>{notice=saveScene?('Saved '+saveScene()):'Save unavailable';draw();});button('LOAD LAST',515,958,467,62,()=>{notice=loadScene?loadScene():'Load unavailable';draw();});
   button('REBUILD HOUSE',40,1036,942,62,()=>{world.setScene('Living room');notice='House rebuilt';draw();});
   cycle('Vegetation',1105,['Off','Low','Normal','Lush'],()=>['Off','Low','Normal','Lush'][Math.round((props.flora?.density??.45)*3)],name=>{const v={Off:0,Low:.25,Normal:.45,Lush:.8}[name];props.flora?.setDensity(v);});
   ctx.font='24px sans-serif';ctx.fillStyle='#c9d6e2';ctx.fillText('Hold grip to wield · Release to drop · Trigger fires',40,1240);
  }else if(page===0){
   button('SPAWN V1',40,300,455,80,()=>{spawn('v1');draw();});button('SPAWN V2',515,300,467,80,()=>{spawn('v2');draw();});
   button('SELECT NEXT',40,400,610,76,()=>{const list=system.actors;system.select(list[(list.indexOf(active())+1)%list.length]);onSync?.();draw();});
   button('REMOVE',670,400,312,76,()=>{if(active())system.remove(active());onSync?.();draw();});
   if(a){cycle('Movement',540,modes,()=>a.autonomy?'auto':a.mode,m=>{a.autoWander=m==='wander';a.dest=null;a.feet={};a.setMode(m);});
    if(a.version==='v2'){
     cycle('Walk style',690,WALK_NAMES,()=>WALK_NAMES[a.gait],x=>a.gait=WALK_NAMES.indexOf(x));
     cycle('Idle pose',840,['auto',...IDLE_NAMES],()=>a.idleChoice,x=>a.setIdlePose(x));
    }
   }
   button('SPAWN DOG',40,942,942,68,()=>{props.dogs?.spawn();draw();});
   button('TOSS BALL',40,1020,455,76,()=>{const c=camera;c.getWorldPosition(v);const dir=c.getWorldDirection(new THREE.Vector3());system.spawnBall(v.clone().addScaledVector(dir,.5),dir.multiplyScalar(2).setY(1));});
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
   const target=bodyDraft?{version:'v2',shape:draft.shape}:a;const sliders=shapeSliders(SLIDERS,target),pages=Math.ceil(sliders.length/7);shapePage=Math.min(shapePage,pages-1);
   const visible=sliders.slice(shapePage*7,shapePage*7+7);
   for(let i=0;i<visible.length;i++){
    const s=visible[i],y=326+i*99,x=480,w=482,value=target.shape[s.key]??s.value;
    ctx.fillStyle='#dce8f2';ctx.font='26px sans-serif';ctx.fillText(s.label,40,y+10);ctx.fillStyle='#9bd6ff';ctx.fillText(value.toFixed(2),360,y+10);
    ctx.fillStyle='#455568';ctx.fillRect(x,y-6,w,19);const u=(value-s.min)/(s.max-s.min);ctx.fillStyle='#92d1ff';ctx.fillRect(x,y-6,w*u,19);ctx.beginPath();ctx.arc(x+w*u,y+3,18,0,Math.PI*2);ctx.fill();
    items.push({x:x-20,y:y-27,w:w+40,h:64,slider:true,fn:px=>{const k=THREE.MathUtils.clamp((px-x)/w,0,1);target.shape[s.key]=Math.round((s.min+k*(s.max-s.min))/s.step)*s.step;if(bodyDraft)saveDraft();onSync?.();draw();}});
   }
   button('‹ PREVIOUS',40,1050,390,76,()=>{shapePage=(shapePage+pages-1)%pages;draw();});
   button('NEXT ›',592,1050,390,76,()=>{shapePage=(shapePage+1)%pages;draw();});
   ctx.fillStyle='#b7c8d8';ctx.font='26px sans-serif';ctx.fillText(`${shapePage+1} / ${pages}`,462,1100);
   button(bodyDraft?'EDITING NEXT SPAWN':'EDITING SELECTED ACTOR',40,1160,942,66,()=>{bodyDraft=!bodyDraft;draw();});
  }else if(page===2&&a){
   const faces=a.version==='v2'?FACE_PRESETS:FACE_TYPES;
   cycle('Face',320,faces.map(f=>f.name),()=>faces[a.faceType]?.name||faces[0].name,x=>{a.faceType=faces.findIndex(f=>f.name===x);a.applyLooks();});
   if(a.version==='v2'&&a.hairDetail!=='classic')cycle('Hairstyle',465,HAIR_STYLES,()=>HAIR_STYLES[a.hairStyle],x=>a.hairStyle=HAIR_STYLES.indexOf(x));
   cycle('Hair colour',610,HAIR_COLORS.map(f=>f.name),()=>HAIR_COLORS[a.hairColor].name,x=>{a.hairColor=HAIR_COLORS.findIndex(f=>f.name===x);a.applyLooks();});
   if(a.version==='v2'){
    cycle('Eye rendering',755,['Classic','Advanced'],()=>a.eyeDetail==='classic'?'Classic':'Advanced',x=>a.setVisualDetail('eyes',x.toLowerCase()));
    cycle('Hair rendering',900,['Classic','Advanced'],()=>a.hairDetail==='classic'?'Classic':'Advanced',x=>a.setVisualDetail('hair',x.toLowerCase()));
   }
   ctx.fillStyle='#b7c8d8';ctx.font='27px sans-serif';ctx.fillText(a.visualStatus?.()||'Original V1 appearance',40,1090);
   ctx.font='25px sans-serif';ctx.fillText('Classic hair keeps the original cut.',40,1150);ctx.fillText('Advanced hair responds to movement and brushing.',40,1200);
  }else if(page===3&&a){
   if(a.version==='v2'){
    cycle('Attention',320,ATTENTION_MODES.map(m=>ATTENTION_LABELS[m]),()=>ATTENTION_LABELS[a.attentionMode||'attentive'],x=>{a.attentionMode=ATTENTION_MODES.find(m=>ATTENTION_LABELS[m]===x)||'attentive';onSync?.();});
    cycle('Expression',470,EMOTION_NAMES,()=>a.emotion.name,x=>{a.expressionOverride=x;a.setEmotion(x,.8,{source:'manual'});});
    button(a.expressionOverride?'USE CONVERSATION CONTEXT':'CONTEXT IS ACTIVE',40,620,942,70,()=>{a.expressionOverride=null;a.setEmotion('neutral',.5,{source:'idle'});draw();});
    ctx.fillStyle='#c9d6e2';ctx.font='26px sans-serif';ctx.fillText('Hyperattentive stays close. Ignoring wanders off.',40,720);ctx.fillText('Attentive looks at you about half the time.',40,760);
    button('PREVIEW SMILE CLIP',40,800,942,72,()=>a.playFaceReference?.('smile'));
    button('PREVIEW SURPRISE CLIP',40,890,942,72,()=>a.playFaceReference?.('surprise'));
   }else{ctx.fillText('Select Mira v2 for context expression controls.',40,355);}
  }
  ctx.font='24px sans-serif';ctx.fillStyle='#acbecf';ctx.fillText((page===9?world.builder.status:notice)||system.voiceStatus||'Trigger: select / walk  ·  Grip: grab body',40,1280);for(let i=0;i<2;i++){const item=items[hover[i]];if(item){ctx.strokeStyle='#ffe5a0';ctx.lineWidth=6;ctx.strokeRect(item.x-3,item.y-3,item.w+6,item.h+6);}const p=cursor[i];if(p){ctx.beginPath();ctx.arc(p.x,p.y,8,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();}}tex.needsUpdate=true;
 }
 function placeInFront(){const c=camera;c.updateWorldMatrix(true,false);const eye=c.getWorldPosition(new THREE.Vector3()),forward=new THREE.Vector3(0,0,-1).applyQuaternion(c.getWorldQuaternion(new THREE.Quaternion()));forward.y=0;if(forward.lengthSq()<.001)forward.set(0,0,-1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())).setY(0);forward.normalize();panel.position.copy(eye).addScaledVector(forward,1.1);panel.position.y-=.10;panel.lookAt(eye);panel.updateMatrixWorld(true);}
 function toggle(){
  const closing=open,fromBuild=page===9;
  open=!open;panel.visible=open&&renderer.xr.isPresenting;drag=[null,null];
  if(open){world.builder?.stop();placeInFront();draw();}
  else if(fromBuild&&world.builder){const right=system.hands.handedness.indexOf('right');world.builder.start(right>=0?right:lastController);}
 }

 const wristCanvas=document.createElement('canvas');wristCanvas.width=256;wristCanvas.height=128;const wc=wristCanvas.getContext('2d');wc.fillStyle='#18384d';wc.fillRect(0,0,256,128);wc.strokeStyle='#9bd6ff';wc.lineWidth=8;wc.strokeRect(4,4,248,120);wc.fillStyle='#ffffff';wc.font='bold 48px sans-serif';wc.textAlign='center';wc.fillText('MENU',128,82);
 const wristTex=new THREE.CanvasTexture(wristCanvas);wristTex.colorSpace=THREE.SRGBColorSpace;
 const wristButtons=system.hands.grip.map(grip=>{const b=new THREE.Mesh(new THREE.PlaneGeometry(.060,.030),new THREE.MeshBasicMaterial({map:wristTex,side:THREE.DoubleSide,depthTest:false,depthWrite:false,toneMapped:false}));b.position.set(0,.070,-.025);b.renderOrder=25;grip.add(b);b.visible=false;return b;});
 function rayFrom(i){const ctrl=system.hands.ctrl[i];ctrl.getWorldPosition(raycaster.ray.origin);raycaster.ray.direction.set(0,0,-1).applyQuaternion(ctrl.getWorldQuaternion(q));}
 function hitWrist(i){rayFrom(i);return wristButtons.some((b,j)=>j!==i&&b.visible&&raycaster.intersectObject(b).length>0);}
 function hit(i){const ctrl=system.hands.ctrl[i];ctrl.getWorldPosition(raycaster.ray.origin);raycaster.ray.direction.set(0,0,-1).applyQuaternion(ctrl.getWorldQuaternion(q));const hit=raycaster.intersectObject(panel)[0];if(!hit)return null;return {x:hit.uv.x*1024,y:(1-hit.uv.y)*1320};}
 function select(i){lastController=i;if(hitWrist(i)){toggle();return true;}if(!open)return false;const p=hit(i);if(p){const item=items.find(a=>p.x>=a.x&&p.x<=a.x+a.w&&p.y>=a.y&&p.y<=a.y+a.h);if(item){system.hands.haptics?.contact(i,'prop',0,.002);try{item.fn(p.x);}catch(e){notice=e.message;draw();}if(item.slider)drag[i]=item;}}return true;}
 function tick(){
  const eye=camera.getWorldPosition(new THREE.Vector3());
  wristButtons.forEach((b,i)=>{b.visible=renderer.xr.isPresenting&&system.hands.grip[i].visible&&(system.hands.handedness[i]==='left'||(system.hands.handedness[i]==='none'&&i===0));if(b.visible){b.lookAt(eye);b.updateWorldMatrix(true,false);}});
  if(!renderer.xr.isPresenting){open=false;panel.visible=false;}
  rays.forEach((r,i)=>{const floor=renderer.xr.isPresenting&&!open?system.controllerFloorTarget(i):null;r.visible=open||!!floor||renderer.xr.isPresenting&&system.hands.active?.[i]||(renderer.xr.isPresenting&&hitWrist(i));r.scale.z=open?1:floor?system.hands.ctrl[i].getWorldPosition(new THREE.Vector3()).distanceTo(floor)/2:1;});if(!open)return;
  const view=camera,forward=new THREE.Vector3(0,0,-1).applyQuaternion(view.getWorldQuaternion(q)),to=panel.position.clone().sub(eye);if(to.dot(forward)<.2||to.length()>2)placeInFront();
  let changed=false;for(let i=0;i<2;i++){const p=hit(i),index=p?items.findIndex(item=>p.x>=item.x&&p.x<=item.x+item.w&&p.y>=item.y&&p.y<=item.y+item.h):-1;if(index!==hover[i]||p&&(!cursor[i]||Math.hypot(p.x-cursor[i].x,p.y-cursor[i].y)>3))changed=true;hover[i]=index;cursor[i]=p;rays[i].material.color.setHex(index>=0?0xffdfa1:0x9bd6ff);}if(changed&&performance.now()-lastDraw>32){draw();lastDraw=performance.now();}
  const a=active(),state=a?`${system.actors.indexOf(a)}/${a.version}/${a.mode}/${a.emotion?.name}/${system.voiceStatus||''}`:'empty';if(state!==stamp&&performance.now()-lastDraw>150){stamp=state;lastDraw=performance.now();draw();}
  const session=renderer.xr.getSession();for(let i=0;i<2;i++)if(drag[i]){
   const src=[...session.inputSources].find(s=>s.handedness===system.hands.handedness[i]);if(!src?.gamepad?.buttons?.[0]?.pressed){drag[i]=null;continue;}
   const p=hit(i);if(p)drag[i].fn(p.x);
  }
 }
 system.setUIHandlers({onToggle:toggle,onSelect:select,isOpen:()=>open});
 return {tick,toggle,panel,get hovered(){return [...hover];},get isOpen(){return open;}};
}
