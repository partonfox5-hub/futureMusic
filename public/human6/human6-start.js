/* Keep the error UI outside the module graph: even a missing Three.js file or
 * failed module import must leave a readable error and a working Retry button. */
(()=>{
  const load=document.getElementById('load'),message=document.getElementById('loadMessage'),detail=document.getElementById('loadDetail'),retry=document.getElementById('loadRetry');
  const began=performance.now(),stages=[],warnings=[],failures=[],controls=[...document.querySelectorAll('[data-runtime],#desk')];
  let stage='Loading game code',stageAt=began,complete=false,failed=false,bytes=null,model=null,finishedAt=null;
  for(const el of controls)el.disabled=true;
  retry.onclick=()=>location.reload();
  const show=()=>{if(complete)return;message.textContent=stage;detail.textContent=failed?'You can retry loading or save the loading report.':(bytes&&stage==='Downloading Mira'?bytes+' · ':'')+Math.round((performance.now()-began)/1000)+' seconds';};
  const record=()=>stages.push({stage,startMs:stageAt,durationMs:performance.now()-stageAt});
  const api={
    get complete(){return complete;},get failed(){return failed;},
    stage(text){if(complete||failed)return;if(text!==stage){record();stage=String(text);stageAt=performance.now();}show();},
    async step(text){api.stage(text);await new Promise(resolve=>setTimeout(resolve,0));await new Promise(resolve=>{let id,timer;const done=()=>{cancelAnimationFrame(id);clearTimeout(timer);resolve();};id=requestAnimationFrame(done);timer=setTimeout(done,50);});},
    warn(text){warnings.push(String(text));},
    fail(error){console.error(error);if(!failed)record();complete=false;failed=true;for(const el of controls)el.disabled=true;stage='Unable to load Human6: '+String(error?.message||error);failures.push({ms:performance.now(),message:stage,stack:error?.stack||null});load.hidden=false;retry.hidden=false;show();},
    ready(){if(failed)return;record();finishedAt=performance.now();stage='Ready';complete=true;clearInterval(watch);load.hidden=true;for(const el of controls)el.disabled=false;document.dispatchEvent(new Event('human6:ready'));},
    snapshot(){return {format:'human6.loading/1',version:'20.3.1',userAgent:navigator.userAgent,complete,failed,stage,elapsedMs:(finishedAt??performance.now())-began,stages:[...stages],warnings:[...warnings],failures:[...failures]};},
    async takeModel(){const job=model;if(!job)return null;try{const result=await job;if(result.error)throw result.error;return result.buffer;}finally{model=null;}}
  };
  globalThis.h6Boot=api;
  const watch=setInterval(()=>{if(!complete&&!failed&&performance.now()-stageAt>45000){if(stage==='Loading game code'){api.fail(new Error('Game files stopped loading. Check the connection and upload the complete folder, then retry.'));return;}retry.hidden=false;detail.textContent='This stage is taking longer than expected. You can wait or retry.';}else show();},500);
  document.getElementById('loadReport').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(api.snapshot(),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='human6-loading.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);};
  addEventListener('error',event=>{if(event.error&&!complete)api.fail(event.error);else{const url=event.target?.src||event.target?.href;if(url)api.warn('File unavailable: '+new URL(url,location.href).pathname);}},true);
  addEventListener('unhandledrejection',event=>{if(!complete)api.fail(event.reason);});
  if(location.protocol==='file:'){api.fail('Open this folder through a web server; browsers cannot load game modules from a file URL.');return;}
  import('./modules/human6-loading.js?v=20.3.1').then(({readAsset})=>{
    model=readAsset(new URL('./assets/mira-runtime-20.3.glb',document.baseURI),{onProgress:p=>{bytes=(p.loaded/1048576).toFixed(1)+' MB'+(p.total?' / '+(p.total/1048576).toFixed(1)+' MB':'');if(stage==='Downloading Mira')show();}}).then(buffer=>({buffer}),error=>({error}));
    // A generated list starts the static graph in parallel, avoiding serial
    // import discovery over headset Wi-Fi. Everything essential is same-origin.
    fetch('./startup-modules.json?v=20.3.1').then(r=>r.ok?r.json():[]).then(urls=>{for(const href of urls){const link=document.createElement('link');link.rel='modulepreload';link.href=href;document.head.append(link);}}).catch(()=>{});
    return import('./mira-boot.js?v=20.3.1');
  }).catch(error=>api.fail(error));
  show();
})();
