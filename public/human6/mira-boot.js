import {GARMENTS} from './mira-v2-garments.js?v=19.1.0';
import {miraSpeak,unlockVoice} from './mira-voice-v2.js?v=19.1.0';
import {retryNeuralVoice} from './mira-neural-voice.js?v=19.1.0';
import {FACE_PRESETS,HAIR_STYLES,EMOTION_NAMES,IDLE_NAMES,WALK_NAMES,ACTIVITY_MODES,ACTION_LABELS} from './mira-v2-controls.js?v=19.1.0';
import {draft,saveDraft,OUTFITS,PERSONAS,clothingItems,setDraftGarment} from './mira-v2-catalog.js?v=19.1.0';
const $=id=>document.getElementById(id);
const hud=$('hud');
if(hud){
  let hudScroll=0;
  const openSel=()=>{hudScroll=hud.scrollTop;hud.classList.add('hud-select-open');hud.scrollTop=hudScroll;};
  const closeSel=()=>{hud.classList.remove('hud-select-open');hud.scrollTop=hudScroll;};
  hud.addEventListener('mousedown',e=>{if(e.target.tagName==='SELECT')openSel();},true);
  hud.addEventListener('pointerdown',e=>{if(e.target.tagName==='SELECT')openSel();},true);
  hud.addEventListener('focusin',e=>{if(e.target.tagName==='SELECT')openSel();});
  hud.addEventListener('focusout',e=>{if(e.target.tagName==='SELECT')setTimeout(closeSel,0);});
  hud.addEventListener('change',e=>{if(e.target.tagName==='SELECT')closeSel();});
}
export function options(id,values){const el=$(id);if(el)el.replaceChildren(...values.map((x,i)=>new Option(typeof x==='string'?x:x.label,typeof x==='string'?String(i):String(x.value))));}
options('activity',ACTIVITY_MODES.map(value=>({label:ACTION_LABELS[value],value})));options('walkStyle',WALK_NAMES);options('idlePose',['auto',...IDLE_NAMES]);options('expression',['context',...EMOTION_NAMES]);options('hairStyle',HAIR_STYLES);options('sceneSelect',['Living room','Jungle','Beach'].map(value=>({label:value,value})));
options('npcFace',FACE_PRESETS.map(f=>f.name));options('npcHair',HAIR_STYLES);options('npcOutfit',OUTFITS.map(o=>o.name));options('npcPersona',PERSONAS.map(p=>p.name));
const fields={npcName:'name',npcBody:'bodyType',npcFace:'faceType',npcHair:'hairStyle',npcColor:'hairColor',npcEyes:'eyeDetail',npcHairDetail:'hairDetail',npcOutfit:'outfit',npcPersona:'persona',npcPrompt:'prompt'};
const slots=['top','bottom','underwear','dress'];for(const slot of slots){options('spawn_'+slot,[{label:'None',value:''},...GARMENTS.filter(g=>g.slot===slot).map(g=>({label:g.name,value:g.id}))]);$('spawn_'+slot).onchange=e=>{setDraftGarment(slot,e.target.value);sync();};}
options('wardrobeSelect',GARMENTS.map(g=>({label:g.name,value:g.id})));
function sync(){$('npcHair').disabled=draft.hairDetail==='classic';for(const slot of slots)$('spawn_'+slot).value=clothingItems().find(id=>GARMENTS.find(g=>g.id===id)?.slot===slot)||'';for(const [id,key] of Object.entries(fields))$(id).value=String(draft[key]);}
sync();for(const [id,key] of Object.entries(fields))$(id).addEventListener('input',()=>{draft[key]=['faceType','hairStyle','hairColor','outfit','persona'].includes(key)?Number($(id).value):$(id).value;if(key==='outfit')delete draft.clothes;if(key==='persona')draft.prompt=PERSONAS[draft.persona].prompt;if(key==='bodyType'){draft.name=draft.bodyType==='male'?'Alex':'Mira';draft.faceType=draft.bodyType==='male'?5:1;draft.hairStyle=draft.bodyType==='male'?8:0;draft.shape={};}saveDraft();sync();});addEventListener('mira:draft',sync);
$('retryVoice').onclick=()=>{retryNeuralVoice();$('ttsStatus').textContent='Ready to retry. Press Preview voice.';};
$('previewVoice').onclick=async()=>{unlockVoice();delete $('ttsStatus').dataset.engine;$('previewVoice').disabled=true;try{await miraSpeak('Hi, I am Mira. It is lovely to see you.',{voice:$('ttsVoice').value,onStatus:text=>{$('ttsStatus').textContent=text;if(text==='Natural voice ready')$('ttsStatus').dataset.engine='Kokoro';},onStart:()=>{$('ttsStatus').textContent='Playing voice preview';},onEnd:()=>{$('ttsStatus').textContent='Voice preview finished'+($('ttsStatus').dataset.engine?' · '+$('ttsStatus').dataset.engine:'');},onError:text=>$('ttsStatus').textContent=text});}finally{$('previewVoice').disabled=false;}};
try{await import('./engine.js?v=19.1.1');}catch(error){console.error(error);$('load').textContent=/WebGL|context/i.test(error?.message||'')?'3D graphics are unavailable in this browser. Open the live demo in a WebGL-enabled desktop browser or Quest Browser. NPC configuration can still be saved.':'Scene startup failed: '+error.message;$('load').style.cssText='left:20px;top:80px;transform:none;max-width:calc(100vw - 365px);letter-spacing:0;padding:15px;background:#211a16';document.querySelectorAll('[data-runtime]').forEach(el=>el.disabled=true);}
