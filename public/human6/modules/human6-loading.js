/** Startup utilities also run without WebGL or an animation frame (a hidden tab). */
export function yieldToBrowser(){
  return new Promise(resolve=>{let frame,timer;const done=()=>{clearTimeout(timer);cancelAnimationFrame(frame);resolve();};frame=requestAnimationFrame(done);timer=setTimeout(done,50);});
}

export function withDeadline(promise,ms,label='Preparation'){
  let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label+' timed out. Reload to retry.')),ms);})]).finally(()=>clearTimeout(timer));
}

/** Abort a stalled transfer, retain ordinary browser caching, report bytes even
 * when a compressed response does not supply a useful Content-Length. */
export async function readAsset(url,{onProgress=()=>{},timeoutMs=30000,totalMs=180000,signal,fetcher=fetch}={}){
  const controller=new AbortController();let idle,total,reason='Download cancelled',reader;
  const abort=()=>{reason='Download cancelled';controller.abort();};
  const touch=()=>{clearTimeout(idle);idle=setTimeout(()=>{reason='Download stalled for '+Math.round(timeoutMs/1000)+' seconds';controller.abort();},timeoutMs);};
  if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
  total=setTimeout(()=>{reason='Download exceeded '+Math.round(totalMs/1000)+' seconds';controller.abort();},totalMs);touch();
  try{
    const response=await fetcher(url,{signal:controller.signal});
    if(!response.ok)throw new Error('HTTP '+response.status+' loading '+new URL(url,location.href).pathname);
    const length=response.headers.get('content-encoding')?0:Number(response.headers.get('content-length'))||0;let loaded=0;
    if(!response.body){const buffer=await response.arrayBuffer();onProgress({loaded:buffer.byteLength,total:length});return buffer;}
    reader=response.body.getReader();const chunks=[];
    for(;;){const {value,done}=await reader.read();if(done)break;loaded+=value.byteLength;if(loaded>64000000)throw new Error('Character asset is unexpectedly large');chunks.push(value);touch();onProgress({loaded,total:length});}
    if(!loaded)throw new Error('Character asset is empty');
    const bytes=new Uint8Array(loaded);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return bytes.buffer;
  }catch(error){controller.abort();throw new Error((error.name==='AbortError'?reason:error.message)+' · '+new URL(url,location.href).pathname);}
  finally{clearTimeout(idle);clearTimeout(total);signal?.removeEventListener('abort',abort);reader?.releaseLock();}
}
