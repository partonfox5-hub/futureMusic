/* npm install; npx playwright install chromium
 * H5_PROJECT=/absolute/path/human5 node tests/browser-regression.cjs
 * H5_CHROMIUM=/path/to/custom/chromium is optional. Software GPU is never Quest FPS evidence.
 */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const project=path.resolve(process.env.H5_PROJECT||path.join(__dirname,'..')),out=path.resolve(process.env.H5_RESULTS||path.join(__dirname,'results','whole-project'));fs.mkdirSync(out,{recursive:true});
const threeRoot=path.resolve(path.dirname(require.resolve('three')),'..');
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname==='/favicon.ico'){res.writeHead(204).end();return;}let part=decodeURIComponent(url.pathname).replace(/^\/human5\//,'');if(!part||part.endsWith('/'))part+='index.html';const p=path.resolve(project,part);if(!p.startsWith(project+'/')){res.writeHead(403).end();return;}fs.readFile(p,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary','.json':'application/json'})[path.extname(p)]||'application/octet-stream');res.end(b);});});
const quant=a=>{a=a.slice().sort((a,b)=>a-b);return {p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],max:a.at(-1)};};
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
 const browser=await chromium.launch({executablePath:process.env.H5_CHROMIUM||undefined,headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 const page=await browser.newPage({userAgent:'Human5 simulated Quest code path; OculusBrowser regression test',viewport:{width:960,height:600}}),errors=[];
 page.on('pageerror',e=>errors.push(e.stack));page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error(m.text());}});
 await page.route('https://cdn.jsdelivr.net/npm/three@0.170.0/**',route=>route.fulfill({path:path.join(threeRoot,route.request().url().split('three@0.170.0/')[1]),contentType:'text/javascript'}));
 await page.goto(`http://127.0.0.1:${port}/human5/index.html?debug`);await page.waitForFunction(()=>window.human2?.mira.ready&&(!human2.startup||human2.startup.complete)&&human2.mira.actors[0].headMats.every(m=>m.map?.image?.complete),null,{timeout:120000});





 await page.evaluate(()=>{human2.performanceController.budget.adaptive=false;human2.performanceController.budget.setTier(2);});
 const reports=[];
 for(const location of ['Home','Car','City','Forest']){
  const transition=await page.evaluate(location=>{const H=human2;H.orbit.enabled=false;const begin=performance.now();if(location==='Home'){H.rig.position.set(0,0,0);H.camera.position.set(0,1.6,6);H.camera.lookAt(0,1.4,0);}else if(location==='Car'){H.props.cars()[0].enter();}else{for(const car of H.props.cars())if(car.driving)car.exit();H.openWorld.travel(location);}H.performanceController.budget.samples=[];return {syncMs:performance.now()-begin};},location);
  await page.waitForFunction(()=>human2.performanceController.budget.samples.length>=64,null,{timeout:240000});
  const data=await page.evaluate(()=>{const H=human2;return {performance:H.performanceController.exportReport(),world:H.openWorld.snapshot(),ecology:H.ecology.snapshot(),startup:H.startup.samples,longFrames:H.world.h5LongFrames||0,morphs:H.mira.actors.map(a=>a.skinMeshes.map(m=>({name:m.material.name,vertices:m.geometry.attributes.position.count,targets:m.geometry.morphAttributes.position?.length||0,residual:m.userData.h5MorphResidualM}))),seams:H.mira.actors.map(a=>({ready:a.seamsReady,skin:!!a.h5Skin})),driving:H.props.cars().filter(c=>c.driving).length};});
  reports.push({location,transition,...data});fs.writeFileSync(path.join(out,'whole-application.json'),JSON.stringify({note:'Actual engine animation loop in Chromium SwiftShader; simulated Quest UA, monoscopic 960x600. These are software-renderer diagnostics, not headset FPS measurements.',reports,errors},null,2));
  console.log(JSON.stringify({location,transition,samples:data.performance.samples,cpu:data.performance.cpuMs,interval:data.performance.frameIntervalMs,calls:data.performance.drawCalls,resources:data.performance.resources,world:data.world,longFrames:data.longFrames}));
 }
 assert.equal(errors.length,0,errors.join('\n'));assert(reports.every(r=>r.performance.samples>=64));assert(reports.every(r=>r.performance.tier==='sustain'),'Fixed sustain profile changed');assert.equal(reports[1].driving,1);assert(reports.every(r=>r.world.residentCells<=11),'Streaming cell cap exceeded');
 assert(reports[0].seams.every(s=>s.ready&&s.skin));for(const actor of reports[0].morphs){for(const m of actor){if(/Head/.test(m.name))assert(m.targets>0,'Face expressions lost');else if(m.residual<=.001)assert.equal(m.targets,0,'Unused body morph atlas retained');}}
 console.log('PASS: actual animation loop, vehicle entry/exit, streaming and rendering across home, car, city and forest');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
