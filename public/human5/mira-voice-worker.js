// Speech recognition runs away from the render loop. No audio leaves the
// device on this path; model/runtime files are downloaded once and cached.
let transcriber=null,loading=null;
self.onmessage=async({data})=>{const {id,audio}=data;try{
 if(!transcriber){self.postMessage({id,status:'Loading local speech model…'});if(!loading)loading=(async()=>{const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');env.allowLocalModels=false;env.backends.onnx.wasm.numThreads=1;env.backends.onnx.wasm.proxy=false;transcriber=await pipeline('automatic-speech-recognition','Xenova/whisper-tiny.en',{quantized:true,revision:'main',progress_callback:p=>{if(p.status==='progress')self.postMessage({id,status:'Loading speech model: '+Math.round(p.progress||0)+'%'});}});return transcriber;})();transcriber=await loading;}
 if(!audio){self.postMessage({id,ready:true});return;}const result=await transcriber(audio,{chunk_length_s:20,stride_length_s:3,return_timestamps:false});self.postMessage({id,text:result.text||''});
 }catch(e){transcriber=null;loading=null;self.postMessage({id,error:e.message||'Local speech recognition failed'});}};
