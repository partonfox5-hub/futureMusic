const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');const {chromium}=require('playwright');const project=path.resolve(process.env.H5_PROJECT||path.join(__dirname,'..')),out=path.resolve(process.env.H5_RESULTS||path.join(__dirname,'results','final-stress'));fs.mkdirSync(out,{recursive:true});const threeRoot=path.resolve(path.dirname(require.resolve('three')),'..');
const server=http.createServer((q,r)=>{const p=path.join(project,decodeURIComponent(new URL(q.url,'http://x').pathname).replace(/^\/human5\//,''));fs.readFile(p,(e,b)=>{r.writeHead(e?404:200,{'Content-Type':p.endsWith('.html')?'text/html':p.endsWith('.js')?'text/javascript':p.endsWith('.mp3')?'audio/mpeg':'application/octet-stream'});r.end(e?'missing':b)});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.H5_CHROMIUM||undefined,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],headless:true});const errors=[];try{const page=await browser.newPage({userAgent:'OculusBrowser Human5 cash test',viewport:{width:960,height:600}});page.on('pageerror',e=>{errors.push(e.stack);console.error(e.stack)});page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404')){errors.push(m.text());console.error(m.text());}});await page.route('https://cdn.jsdelivr.net/npm/three@0.170.0/**',r=>r.fulfill({path:path.join(threeRoot,r.request().url().split('three@0.170.0/')[1]),contentType:'text/javascript'}));await page.goto('http://127.0.0.1:'+server.address().port+'/human5/index.html?debug');await page.waitForFunction(()=>window.human2?.mira.ready&&human2.startup.complete,null,{timeout:120000});
const report=await page.evaluate(async()=>{
 const H=human2,T=await import('three');H.renderer.setAnimationLoop(null);H.orbit.enabled=false;
 const a=H.mira.actors[0],e=a.enhanceEyes;if(!e?.ready)throw Error('Lid finish not initialized');
 const saved=a.skinMeshes.map(m=>m.morphTargetInfluences?.slice());
 for(const m of a.skinMeshes)if(m.morphTargetInfluences)m.morphTargetInfluences.fill(0);
 H.scene.updateMatrixWorld(true);e.tick();const rest=e.points.flat().map(p=>p.toArray());
 const head=e.skin,names=head.morphTargetDictionary;
 for(const [key,index] of Object.entries(names))if(/Eye_Blink/.test(key))head.morphTargetInfluences[index]=1;
 e.tick();const blink=e.points.flat().map(p=>p.toArray());let movement=0;
 for(let i=0;i<rest.length;i++)movement=Math.max(movement,Math.hypot(...rest[i].map((v,k)=>v-blink[i][k])));
 if(movement<.001)throw Error('Tear ribbons ignore the animated eyelid');
 for(const m of [e.occ,e.tear])for(const v of m.geometry.attributes.position.array)if(!Number.isFinite(v))throw Error('Invalid lid mesh');
 for(let i=0;i<a.skinMeshes.length;i++)if(saved[i])a.skinMeshes[i].morphTargetInfluences.splice(0,saved[i].length,...saved[i]);
 e.tick();
 const {RigidBatches}=await import('./modules/human5-batching.js?v=19.1.0');
 const world={pickables:[]},batches=new RigidBatches(world),scene=new T.Scene(),r=new T.Group();scene.add(r);
 for(let i=0;i<3;i++){const m=new T.Mesh(new T.BoxGeometry(.1,.1,.1),new T.MeshStandardMaterial({color:0xaaaabb}));m.position.x=i*.2;r.add(m);}
 const source=r.children[0];batches.add(r);const entry=batches.entries.get(r),before=entry.groups[0].mesh.geometry.attributes.position.count;batches.tick();source.visible=false;batches.tick();const after=entry.groups[0].mesh.geometry.attributes.position.count;
 if(!(after<before)||batches.changed(entry))throw Error('Visibility cache broke damaged parts');batches.clear();if(world.pickables.length)throw Error('Batch removal leaked');
 const ropes=H.props.restraints;ropes.clearAll();const anchor=x=>({point:new T.Vector3(x,1,2),static:true,mass:Infinity,weight:0});const links=[ropes.create(anchor(0),anchor(1)),ropes.create(anchor(1),anchor(2))];ropes.cut(links[1]);let disposed=0;for(const l of links)for(const m of [l.rope,...l.cuffs])for(const asset of [m.geometry,m.material])asset.addEventListener('dispose',()=>disposed++);ropes.start();ropes.pending=anchor(0);const removed=ropes.clearAll();if(removed!==2||ropes.links.length||ropes.pending||ropes.placing||disposed!==12||links.some(l=>l.rope.parent||l.cuffs.some(c=>c.parent)))throw Error('Bulk restraint removal did not dispose intact and cut links');
 H.weather.cycle.running=false;H.weather.cycle.setHour(10);H.weather.tick(0,H.camera);
 const focus=a.bones.Head.getWorldPosition(new T.Vector3());const front=new T.Vector3(0,.025,.38).applyQuaternion(a.group.getWorldQuaternion(new T.Quaternion()));H.camera.position.copy(focus).add(front);H.camera.lookAt(focus.clone().add(new T.Vector3(0,.00,0)));
 for(const id of ['ui','hud','stats','hint']){const el=document.getElementById(id);if(el)el.style.display='none';}
 H.scene.updateMatrixWorld(true);e.tick();H.renderer.render(H.scene,H.camera);
 return {lidMotionM:movement,lidDraws:e.group.children.length,vertices:e.occ.geometry.attributes.position.count+e.tear.geometry.attributes.position.count,corneaIOR:a.eyes.entries.find(e=>e.cornea).advanced.ior,batchVertices:{before,after},restraints:{removed,disposed}};
});
await page.screenshot({path:path.join(out,'eyes-neutral.png')});
for(const expression of ['wideSmile','anger','surprise']){await page.evaluate(expression=>{const H=human2,a=H.mira.actors[0];a.h5Identity.express(expression);for(let i=0;i<45;i++)a.tickMorphs(1/72);H.scene.updateMatrixWorld(true);a.enhanceEyes.tick();H.renderer.render(H.scene,H.camera);},expression);await page.screenshot({path:path.join(out,'eyes-'+expression+'.png')});}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({report,errors},null,2));assert.deepEqual(errors,[]);console.log(JSON.stringify({report,errors}));
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
