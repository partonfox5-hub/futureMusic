import * as T from 'three';
import {readAsset,withDeadline,yieldToBrowser} from '../modules/human6-loading.js?v=20.3.0';
import {initialViewObjects} from '../modules/human5-startup-warmup.js?v=20.3.0';

export async function run(H){
 const results=[],assert=(ok,message)=>{if(!ok)throw Error(message);};
 const test=async(name,fn)=>{try{results.push({name,pass:true,evidence:await fn()});}catch(error){results.push({name,pass:false,error:error.stack});}};
 H.renderer.setAnimationLoop(null);
 await test('Unknown-length transfers report bytes and retain all chunks',async()=>{
  const progress=[],buffer=await readAsset('./test.glb',{fetcher:async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array([4,3]));c.enqueue(new Uint8Array([2,1,0]));c.close();}})),onProgress:p=>progress.push(p)});
  assert([...new Uint8Array(buffer)].join(',')==='4,3,2,1,0','Corrupt streamed bytes');assert(progress.at(-1).loaded===5&&progress.at(-1).total===0,'Unknown length hid progress');return {bytes:buffer.byteLength};
 });
 await test('Stalled response bodies are aborted and reject',async()=>{
  let aborted=false,error;try{await readAsset('./stalled.glb',{timeoutMs:30,fetcher:async(_,{signal})=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array([1]));signal.addEventListener('abort',()=>{aborted=true;c.error(new DOMException('Aborted','AbortError'));},{once:true});}}))});}catch(e){error=e;}
  assert(aborted&&/stalled/.test(error?.message),'A stalled transfer remained pending');return {aborted};
 });
 await test('HTTP errors and empty responses cannot report a successful load',async()=>{
  const errors=[];for(const response of [new Response('missing',{status:404}),new Response(new Uint8Array())])try{await readAsset('./missing.glb',{fetcher:async()=>response});}catch(error){errors.push(error.message);}
  assert(errors.length===2&&/HTTP 404/.test(errors[0])&&/empty/.test(errors[1]),'Invalid transfer accepted');return {rejected:errors.length};
 });
 await test('Preparation deadlines release an unresolved promise',async()=>{
  let error;try{await withDeadline(new Promise(()=>{}),30,'Shader');}catch(e){error=e;}assert(/Shader timed out/.test(error?.message),'Shader wait never failed');assert(await withDeadline(Promise.resolve(7),100)===7,'Successful preparation was discarded');return {deadlineHandled:true};
 });
 await test('Loading can yield without requestAnimationFrame callbacks',async()=>{
  const request=globalThis.requestAnimationFrame,cancel=globalThis.cancelAnimationFrame;globalThis.requestAnimationFrame=()=>0;globalThis.cancelAnimationFrame=()=>{};try{await withDeadline(yieldToBrowser(),300,'Hidden-tab yield');}finally{globalThis.requestAnimationFrame=request;globalThis.cancelAnimationFrame=cancel;}return {timerFallback:true};
 });
 await test('Initial shader selection excludes hidden, offscreen and batched originals',()=>{
  const s=new T.Scene(),camera=new T.PerspectiveCamera(60,1,.1,40),geometry=new T.BoxGeometry(1,1,1),material=new T.MeshBasicMaterial(),add=(name,x,z)=>{const m=new T.Mesh(geometry,material);m.name=name;m.position.set(x,0,z);s.add(m);return m;};
  const front=add('front',0,-5),hidden=add('hidden',0,-5);hidden.visible=false;add('behind',0,5);add('distant',0,-80);add('side',80,-5);add('source',0,-5).layers.set(31);
  s.updateMatrixWorld(true);camera.updateMatrixWorld(true);const selected=initialViewObjects(s,camera);assert(selected.length===1&&selected[0]===front,'Compiled invisible geometry');assert(front.parent===s,'Preparation reparented a game mesh');geometry.dispose();material.dispose();return {selected:selected.map(m=>m.name)};
 });
 await test('The stowed XR map does not redraw or upload its texture',()=>{
  const map=H.human6.minimap,old=H.renderer.xr.isPresenting,before=map.stats.draws,version=map.texture.version;H.renderer.xr.isPresenting=true;
  try{for(let i=0;i<30;i++)map.tick(.1);assert(map.stats.draws===before&&map.texture.version===version,'A stowed map still updates its texture');}finally{H.renderer.xr.isPresenting=old;}return {draws:0,uploads:0};
 });
 await test('Terrain map builds cooperatively and refreshes after terrain edits',()=>{
  const map=H.human6.minimap,field=H.openWorld.field,revision=field.revision,builds=map.stats.builds;field.revision++;
  try{map.tick(.21);const firstRows=map.stats.rows;assert(firstRows>0&&firstRows<128,'Whole map constructed in one frame');for(let i=0;i<140&&map.stats.builds===builds;i++)map.tick(.05);assert(map.stats.rows===128&&map.stats.builds>builds,'Incremental map never finished');return {firstRows,completedRows:map.stats.rows};}finally{field.revision=revision;}
 });
 await test('Open-world furniture templates are complete without the legacy map',()=>{
  const templates=H.world.furnitureTemplates,names=['Table','Coffee table','TV stand','Bookshelf','Kitchen counter','Refrigerator','Microwave','Bed','Nightstand','Bathtub','Sink','Toilet','Mirror'];for(const name of names)assert(templates.get(name)?.children.length,'Missing template '+name);
  let nestedSeat=false;templates.get('Table').traverse(o=>{if(o.userData.seat||o.userData.furniture?.seat)nestedSeat=true;});assert(!nestedSeat,'Table contains the old couch/chair');return {templates:templates.size,legacyMapBuilt:false};
 });
 await test('Travel grass builds in slices and preserves cuts when rebuilt',()=>{
  const vegetation=H.world.h5Vegetation,field=H.openWorld.field,position=H.camera.position.clone(),saved=vegetation.save(),revision=field.revision,matrix=new T.Matrix4(),point=new T.Vector3();
  const settle=()=>{for(let i=0;i<100;i++){vegetation.tick(.1);if(i>4&&!vegetation.snapshot().buildingGrass)return;}throw Error('Grass job did not finish');};
  try{H.camera.position.set(-140,field.heightAt(-140,-115)+1.6,-115);vegetation.tick(.4);const pending=vegetation.snapshot().buildingGrass;settle();assert(vegetation.grass.count>0,'No grass generated');vegetation.grass.getMatrixAt(0,matrix);point.setFromMatrixPosition(matrix);point.y+=.02;assert(vegetation.cutAt(point,.22)>0,'Grass is no longer cuttable');const x=point.x,z=point.z;
   vegetation.restore(vegetation.save());settle();assert(vegetation.cuts.get(x,z,1)<=.021,'Cut was lost during rebuilding');
   H.camera.position.x+=30;vegetation.tick(.4);field.revision++;settle();const stats=vegetation.snapshot();assert(!stats.buildingGrass,'Terrain revision stranded the grass job');return {pendingAfterFirstSlice:pending,grass:stats.grassInstances,cutPreserved:true,maxSliceMs:stats.grassBuild.maxSliceMs};
  }finally{field.revision=revision;vegetation.restore(saved);H.camera.position.copy(position);settle();}
 });
 await test('The cul-de-sac prop stays hidden before the first simulation tick',()=>{assert(!H.mira.noodle.group.visible,'The clipping prop returned during loading');return {visible:false};});
 await test('Startup diagnostics and all entry controls reach ready together',()=>{
  const boot=globalThis.h6Boot.snapshot();assert(boot.complete&&!boot.failed,'Startup is incomplete');assert(document.getElementById('load').hidden,'Loading card is still blocking entry');for(const id of ['enter','enterAR','enterVrSharp','desk','firstPerson'])assert(!document.getElementById(id).disabled,'Entry control is still disabled: '+id);
  assert(!H.startup.samples.some(s=>s.stage==='vehicleView'),'Compulsory car views returned');return {elapsedMs:boot.elapsedMs,stageCount:boot.stages.length};
 });
 return {passed:results.filter(r=>r.pass).length,total:results.length,questHardwareTested:false,results};
}
