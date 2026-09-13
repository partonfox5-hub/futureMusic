export const capture = async()=>{
 const H=human2,T=await import('three');if(H.renderer.xr.isPresenting)throw Error('Exit XR before running the fixed-camera diagnostic. Use the in-game Quest captures in XR.');H.renderer.setAnimationLoop(null);H.renderer.domElement.dataset.h6Capture='scene';H.performanceController.budget.adaptive=false;H.orbit.enabled=false;
 const report={hardware:'Desktop SwiftShader; Oculus user agent selects Quest budgets. Counts only, not Quest frame times.',cases:{},meshCosts:[]};
 async function settle(){for(let i=0;i<120;i++){H.human6?.farDetail.restore();H.openWorld.tick(.10);H.props.tick(.04);H.dogs.tick(.04);H.home.tick(.04);H.upgrade.beforeFrame(.10);H.human6?.tick(.10);H.ecology?.tick(.10);H.performanceController.beforeFrame(.20);H.weather.tick(.10,H.camera);await new Promise(r=>setTimeout(r,0));}H.scene.updateMatrixWorld(true);}
 async function capture(name,position,look){H.camera.position.set(...position);H.camera.lookAt(...look);await settle();const costs=new Map(),draw=H.renderer.renderBufferDirect;
 H.renderer.renderBufferDirect=function(camera,scene,geometry,material,object,group){const chain=[];for(let p=object;p&&chain.length<5;p=p.parent)if(p.name)chain.push(p.name);const key=chain.join(' / ')+' | '+geometry.type+' | '+material.type+' | '+(material.name||'');const entry=costs.get(key)||{calls:0,triangles:0};entry.calls++;entry.triangles+=Math.min(group?.count??Infinity,geometry.drawRange.count,geometry.index?.count??geometry.attributes.position.count)/3*(object.isInstancedMesh?object.count:1);costs.set(key,entry);return draw.apply(this,arguments);};
 H.human6?.farDetail.cull();H.renderer.info.reset();H.renderer.shadowMap.needsUpdate=true;try{H.renderer.render(H.scene,H.camera);}finally{H.renderer.renderBufferDirect=draw;}
 report.cases[name]={calls:H.renderer.info.render.calls,triangles:H.renderer.info.render.triangles,geometries:H.renderer.info.memory.geometries,textures:H.renderer.info.memory.textures,streaming:H.openWorld.snapshot(),position,look,actualCamera:H.camera.getWorldPosition(new T.Vector3()).toArray()};report.meshCosts.push({name,costs:[...costs].sort((a,b)=>b[1].calls-a[1].calls)});if(['Home','Car','Timberfall','Forest'].includes(name))await window.h6Capture?.(name);}
 await capture('Home',[0,1.6,12],[0,1.3,0]);
 const car=H.props.cars()[0],p=car.group.position;await capture('Car',[p.x+3,1.65,p.z+4],[p.x,1,p.z]);
 const a=H.mira.actors[0],p2=a.group.position;await capture('Close Mira',[p2.x,1.4,p2.z+1],[p2.x,1.3,p2.z]);
 const y=H.openWorld.field.heightAt(-560,-80)+1.6;await capture('Timberfall',[-560,y,-80],[-540,y,-80]);
 const yf=H.openWorld.field.heightAt(-140,-115)+1.6;await capture('Forest',[-140,yf,-115],[-140,yf,-160]);
 await capture('Flight',[-140,180,-115],[-140,0,-480]);
 return report;
}
;
