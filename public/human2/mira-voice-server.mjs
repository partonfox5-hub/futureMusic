// Optional Node 20+ companion. Bind locally behind your existing HTTPS server.
// No dependencies; keys stay on the server. See README-v2.md for routing.
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export function createVoiceServer({apiKey=process.env.OPENAI_API_KEY,origin=process.env.MIRA_ORIGIN,fetchImpl=fetch}={}){
 let windowAt=Date.now(),requests=0,inFlight=0;
 return createServer(async(req,res)=>{
  const json=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  const path=new URL(req.url,'http://localhost').pathname;
  if(!['/api/mira/stt','/api/mira/chat','/api/mira/tts'].includes(path)){json(404,{error:'Unknown route'});return;}
  if(req.method!=='POST'){json(405,{error:'Use POST'});return;}
  if(!apiKey||!origin){json(503,{error:'Set OPENAI_API_KEY and MIRA_ORIGIN on the voice server.'});return;}
  if(req.headers.origin!==origin){json(403,{error:'Origin not allowed'});return;}
  if(Date.now()-windowAt>60000){windowAt=Date.now();requests=0;}
  if(++requests>45||inFlight>=3){json(429,{error:'Voice server busy; retry shortly.'});return;}
  inFlight++;
  try{
   let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>4*1024*1024)throw Object.assign(new Error('Audio upload too large'),{status:413});chunks.push(chunk);}
   const body=Buffer.concat(chunks),headers={Authorization:'Bearer '+apiKey},signal=AbortSignal.timeout(15000);let upstream;
   if(path.endsWith('/stt')){
    const form=await new Request('http://localhost',{method:'POST',headers:{'content-type':req.headers['content-type']||''},body}).formData();
    const file=form.get('file');if(!file||typeof file.arrayBuffer!=='function'||file.size<100)throw Object.assign(new Error('Upload an audio file'),{status:400});
    const fd=new FormData();fd.set('file',file,file.name||'clip.webm');fd.set('model',process.env.MIRA_STT_MODEL||'gpt-4o-mini-transcribe');fd.set('response_format','json');
    upstream=await fetchImpl('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers,body:fd,signal});
   }else{
    const input=JSON.parse(body.toString('utf8')),text=String(input.text||'').trim().slice(0,1200);if(!text)throw Object.assign(new Error('Text is required'),{status:400});
    headers['Content-Type']='application/json';
    if(path.endsWith('/chat')){
     const history=Array.isArray(input.history)?input.history.filter(m=>['user','assistant'].includes(m.role)&&typeof m.content==='string').slice(-12).map(m=>({role:m.role,content:m.content.slice(0,1200)})):[];
     const persona=String(input.persona||'You are Mira, a friendly adult XR character. Give a short spoken reply.').slice(0,4000);
     upstream=await fetchImpl('https://api.openai.com/v1/chat/completions',{method:'POST',headers,signal,body:JSON.stringify({model:process.env.MIRA_CHAT_MODEL||'gpt-4o-mini',messages:[{role:'system',content:persona},...history,{role:'user',content:text}],max_tokens:180})});
    }else upstream=await fetchImpl('https://api.openai.com/v1/audio/speech',{method:'POST',headers,signal,body:JSON.stringify({model:'tts-1',voice:'nova',input:text,response_format:'mp3'})});
   }
   if(!upstream.ok){json(upstream.status===429?429:502,{error:'Voice provider request failed. Check server credentials, quota and model access.'});return;}
   if(path.endsWith('/tts')){res.writeHead(200,{'Content-Type':'audio/mpeg','Cache-Control':'no-store'});res.end(Buffer.from(await upstream.arrayBuffer()));}
   else{const value=await upstream.json();json(200,path.endsWith('/stt')?{text:value.text||''}:{reply:value.choices?.[0]?.message?.content||''});}
  }catch(e){json(e.status|| (e.name==='TimeoutError'?504:400),{error:e.status?e.message:'Voice request failed. Check the request format and provider connection.'});}
  finally{inFlight--;}
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.MIRA_VOICE_PORT||8787);
 createVoiceServer().listen(port,'127.0.0.1',()=>console.log(`Mira voice API listening on 127.0.0.1:${port}`));
}
