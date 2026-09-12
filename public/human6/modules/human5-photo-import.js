import {applyNPCProfile,validateNPCProfile,exportNPCProfile} from './human5-npc-profile.js?v=19.3.0';
import {weldSkinNormals} from './human5-skin.js?v=19.3.0';
import {deformGeometry,validateField} from './human5-photo-field.js?v=19.3.0';

export function applyPhotoNPC(actor,input){
 if(actor?.version!=='v2')throw Error('Select a V2 NPC first');
 if(input?.format!=='human5.photo-npc/1')throw Error('Choose a .h5photo.json export');
 const profile=validateNPCProfile(input.profile),field=validateField(input.faceField);
 actor.h5PhotoFit?.dispose();
 const identity=applyNPCProfile(actor,profile),previous=actor.updateShapeGeometry;let stamp=null,live=true;
 function wrapped(){
  const before=this.deform[0]?.position.version;
  const result=previous.apply(this,arguments);
  if(!live||this.h5Identity!==identity||(this.geomState===stamp&&before===this.deform[0]?.position.version))return result;
  for(const d of this.deform)deformGeometry(d.geom,field);
  this.buildSoftLimits();weldSkinNormals(this);this.seamsReady=!!this.h5Skin;stamp=this.geomState;
  return result;
 }
 actor.updateShapeGeometry=wrapped;
 function rebuild(){stamp=null;if(actor.h5Identity===identity)identity.setSculpt({...identity.sculpt});else{actor.geomState='';actor.lastLikeness=NaN;actor.applyShape();}actor.realism?.tissue.reset();}
 const api={field,profile,setStrength(value){if(!Number.isFinite(value)||value<0||value>1)throw Error('Strength must be 0–1');field.strength=value;rebuild();},export(){if(actor.h5Identity!==identity)throw Error('The photo identity was replaced; import the photo profile again');return {format:'human5.photo-npc/1',profile:exportNPCProfile(actor),faceField:structuredClone(field),report:input.report};},dispose(){if(!live)return;live=false;if(actor.updateShapeGeometry===wrapped){actor.updateShapeGeometry=previous;rebuild();}delete actor.h5PhotoFit;}};
 actor.h5PhotoFit=api;rebuild();return api;
}

export function installPhotoNPCImport({mira}){
 const panel=document.getElementById('hud')||document.getElementById('ui');if(!panel)return null;
 const section=document.createElement('details'),title=document.createElement('summary'),input=document.createElement('input'),status=document.createElement('p'),exportButton=document.createElement('button');
 section.style.cssText='padding:12px;min-width:240px';title.textContent='Photo NPC Studio import';input.type='file';input.accept='.json';input.setAttribute('aria-label','Import photo NPC geometry');exportButton.textContent='EXPORT PHOTO NPC';
 input.onchange=async()=>{try{const file=input.files[0];if(!file)return;if(file.size>256000)throw Error('Profile exceeds 256 KB');applyPhotoNPC(mira.selected,JSON.parse(await file.text()));status.textContent='Photo fit applied to selected NPC. Review expressions and save this profile for reuse.';}catch(e){status.textContent=e.message;}finally{input.value='';}};
 exportButton.onclick=()=>{try{const fit=mira.selected?.h5PhotoFit;if(!fit)throw Error('Selected NPC has no photo geometry');const url=URL.createObjectURL(new Blob([JSON.stringify(fit.export(),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='photo-npc.h5photo.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}catch(e){status.textContent=e.message;}};
 section.append(title,input,exportButton,status);panel.append(section);return {dispose(){section.remove();}};
}
