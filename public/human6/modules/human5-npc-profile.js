import {installReferenceIdentity,REFERENCE_MIRA,IDENTITY_CONTROLS} from './human5-identity.js?v=17.5.0';
import {DYNAMICS_CONTROLS} from './human5-dynamics.js?v=17.5.0';
const bounds={height:[.75,1.25],waist:[.65,1.4],hips:[.65,1.5],breast:[.3,2],butt:[.4,1.8],thigh:[.65,1.5],gap:[-.6,.6],arms:[.65,1.5],jiggle:[0,2.5],breastHeight:[-.4,.4],breastSpacing:[-.4,.4],breastAngle:[-.4,.4],buttHeight:[-.4,.4],buttSpacing:[-.4,.4],buttAngle:[-.4,.4],softness:[0,1],damping:[0,1],bodySoftness:[0,1],faceSoftness:[0,1],hairMotion:[0,1],skinDetail:[0,1]};
const check=(x,min,max,name)=>{if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw new TypeError(name+' must be between '+min+' and '+max);return x;};
export function validateNPCProfile(input){
  if(!input||input.format!=='human5.npc/1')throw new TypeError('Expected human5.npc/1 profile');
  const name=String(input.name||'NPC').trim().slice(0,60);if(!name)throw new TypeError('NPC name is empty');
  const result={format:'human5.npc/1',name,faceType:Math.round(check(input.faceType??1,0,5,'faceType')),likeness:check(input.likeness??1,0,1.5,'likeness'),hairStyle:Math.round(check(input.hairStyle??1,0,10,'hairStyle')),hairColor:Math.round(check(input.hairColor??1,0,3,'hairColor')),shape:{},sculpt:{},physics:{},note:String(input.note||'').slice(0,2000)};
  for(const [key,value] of Object.entries(input.shape||{})){if(!bounds[key])throw new TypeError('Unknown shape variable: '+key);result.shape[key]=check(value,...bounds[key],key);}
  for(const [key,value] of Object.entries(input.sculpt||{})){const c=IDENTITY_CONTROLS.find(c=>c.key===key);if(!c)throw new TypeError('Unknown sculpt variable: '+key);result.sculpt[key]=check(value,c.min,c.max,key);}
  for(const [key,value] of Object.entries(input.physics||{})){const c=DYNAMICS_CONTROLS.find(c=>c.key===key);if(!c)throw new TypeError('Unknown physics variable: '+key);result.physics[key]=check(value,c.min,c.max,key);}
  return result;
}
export function applyNPCProfile(actor,input){
  const p=validateNPCProfile(input);if(actor?.version!=='v2')throw new TypeError('Select a V2 actor first');
  actor.h5Identity?.dispose();const preset={...REFERENCE_MIRA,...p,id:'imported-npc-profile',shape:{...REFERENCE_MIRA.shape,...p.shape},sculpt:{...REFERENCE_MIRA.sculpt,...p.sculpt},physics:{...REFERENCE_MIRA.physics,...p.physics}};
  const identity=installReferenceIdentity(actor,{preset});Object.assign(actor.shape,preset.physics);actor.h5Dynamics?.set(preset.physics);actor.h5Profile=p;return identity;
}
export function exportNPCProfile(actor){return validateNPCProfile({format:'human5.npc/1',name:actor.displayName,faceType:actor.faceType,likeness:actor.likeness,hairStyle:actor.hairStyle,hairColor:actor.hairColor,shape:Object.fromEntries(Object.entries(actor.shape).filter(([k])=>bounds[k])),sculpt:{...(actor.h5Identity?.sculpt||{})},physics:Object.fromEntries(DYNAMICS_CONTROLS.map(c=>[c.key,actor.shape[c.key]??c.value])),note:actor.h5Profile?.note||REFERENCE_MIRA.note});}
