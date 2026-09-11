// Browser capture is separate from TTS. No provider key belongs in this module.
export function microphoneError(e){
  if(e?.name==='NotAllowedError'||e?.name==='SecurityError')return 'Microphone blocked. Allow this site in Quest Browser site permissions; check the headset microphone mute setting.';
  if(e?.name==='NotFoundError')return 'No microphone was found. Check the headset input device.';
  if(e?.name==='NotReadableError')return 'The microphone is busy or unavailable. Close other microphone apps and retry Voice.';
  return e?.message||'Microphone could not start. Retry Voice.';
}
export function createMicrophoneLease(env=globalThis){
  let stream=null,pending=null,ctx=null,generation=0,expiry=0;
  const close=()=>{generation++;clearTimeout(expiry);stream?.getTracks().forEach(t=>t.stop());stream=null;pending=null;ctx?.close().catch(()=>{});ctx=null;};
  const prepare=()=>{
    if(stream?.getAudioTracks().some(t=>t.readyState==='live'))return Promise.resolve(stream);
    if(pending)return pending;
    if(!env.navigator?.mediaDevices?.getUserMedia)return Promise.reject(new Error('Microphone needs HTTPS or localhost. Open the game directly in Quest Browser.'));
    if(env.document?.permissionsPolicy?.allowsFeature?.('microphone')===false)return Promise.reject(new Error('This page blocks microphone access. Open the game directly or allow microphone in the embedding page.'));
    const C=env.AudioContext||env.webkitAudioContext;
    try{ctx??=new C();ctx.resume().catch(()=>{});}catch{return Promise.reject(new Error('Browser audio input is unavailable.'));}
    const token=generation;
    // Keep the granted stream open across XR entry; never do a grant/stop/reopen preflight.
    pending=env.navigator.mediaDevices.getUserMedia({video:false,audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}})
      .catch(e=>{if(e.name==='OverconstrainedError')return env.navigator.mediaDevices.getUserMedia({audio:true});throw e;})
      .then(s=>{if(token!==generation){s.getTracks().forEach(t=>t.stop());throw new DOMException('Cancelled','AbortError');}stream=s;expiry=setTimeout(close,180000);return s;})
      .finally(()=>{if(token===generation)pending=null;});
    return pending;
  };
  return {prepare,close,get ready(){return !!stream?.getAudioTracks().some(t=>t.readyState==='live');},async take(){const s=await prepare();clearTimeout(expiry);const c=ctx;stream=null;ctx=null;return {stream:s,context:c};}};
}

// One recorder, one transcription job, bounded 12-second segments, no frame-loop work.
export function createVoiceBridge({localTranscribe,warmLocalSpeech,stopLocalSpeech,env=globalThis,fetchImpl=globalThis.fetch,preferNative=!/Quest|Oculus/i.test(env.navigator?.userAgent||'')}={}){
  const lease=createMicrophoneLease(env);let active=null,health=null,healthAt=0;
  const serverReady=async()=>{if(health!==null&&Date.now()-healthAt<15000)return health;try{const r=await fetchImpl('/api/mira/health',{signal:AbortSignal.timeout(2500)});health=r.ok&&(await r.json()).ready===true;}catch{health=false;}healthAt=Date.now();return health;};
  const transcribe=async(blob,signal,status)=>{
    if(await serverReady()){
      const fd=new FormData();fd.append('file',blob,/mp4/.test(blob.type)?'clip.m4a':'clip.webm');
      const r=await fetchImpl('/api/mira/stt',{method:'POST',body:fd,signal});
      if(!r.ok)throw new Error('Speech service returned '+r.status+'. Check the voice server connection.');
      const j=await r.json();if(typeof j.text!=='string')throw new Error('Speech service returned an invalid transcript.');return j.text.trim();
    }
    if(!localTranscribe)throw new Error('Microphone works, but no speech recognition service is configured.');
    status('loading','Recognizing on the headset…');return localTranscribe(blob,signal,message=>status('loading',message));
  };
  function startMic(onText,hooks={}){
    if(active)return active;
    let stopped=false,stream,ctx,source,analyser,mute,recorder,recognition,segment,interval,restart,jobAbort;
    let busy=false,native=false,nativeResults=0,noise=.003,lastStatus='',lastSpeaking=0,lastSample=0,zeroSince=0;
    const diagnostics={state:'starting',backend:'pending',rms:0,track:'pending',context:'pending',segments:0,transcripts:0};
    const status=(state,message)=>{if(stopped&&state!=='off'&&state!=='error')return;diagnostics.state=state;if(lastStatus===state+message)return;lastStatus=state+message;hooks.onStatus?.({state,message});};
    const stop=(quiet=false)=>{if(stopped)return;stopped=true;clearInterval(interval);clearTimeout(restart);jobAbort?.abort();
      if(recognition){recognition.onend=null;recognition.abort();}if(recorder?.state==='recording'){segment.send=false;recorder.stop();}
      source?.disconnect();analyser?.disconnect();mute?.disconnect();stream?.getTracks().forEach(t=>t.stop());ctx?.close().catch(()=>{});stopLocalSpeech?.();lease.close();hooks.onLevel?.(0);active=null;if(!quiet)status('off','Voice off');};
    const fail=e=>{stop(true);status('error',typeof e==='string'?e:microphoneError(e));};
    const deliver=text=>{if(!stopped&&!hooks.isSpeaking?.()&&text?.trim()){diagnostics.transcripts++;Promise.resolve(onText(text.trim())).catch(e=>status('error','Conversation failed: '+e.message));}};
    const fallback=()=>{native=false;diagnostics.backend=health?'server':'local';if(recognition){recognition.onend=null;recognition.abort();recognition=null;}};
    const handle={stop,diagnostics,resume:()=>ctx?.resume(),get stream(){return stream;}};active=handle;
    status('starting','Allow microphone access to start voice.');
    const setup=async()=>{
      const claimed=await lease.take();if(stopped){claimed.stream.getTracks().forEach(t=>t.stop());claimed.context?.close().catch(()=>{});return;}
      stream=claimed.stream;ctx=claimed.context;await ctx.resume();if(stopped)return;
      const track=stream.getAudioTracks()[0];if(!track)throw new Error('Microphone stream contains no audio.');
      track.addEventListener('ended',()=>{if(!stopped)fail('Microphone disconnected. Retry Voice.');});
      track.addEventListener('mute',()=>status('muted','Headset microphone is muted. Check the headset microphone setting.'));
      source=ctx.createMediaStreamSource(stream);analyser=ctx.createAnalyser();analyser.fftSize=1024;
      // A silent sink keeps analysis processing without playing the microphone back.
      mute=ctx.createGain();mute.gain.value=0;source.connect(analyser);analyser.connect(mute);mute.connect(ctx.destination);
      const data=new Float32Array(analyser.fftSize),SR=env.SpeechRecognition||env.webkitSpeechRecognition;
      if(preferNative&&SR){try{recognition=new SR();recognition.continuous=true;recognition.interimResults=false;recognition.lang=hooks.language||'en-US';
        recognition.onresult=e=>{for(let i=e.resultIndex||0;i<e.results.length;i++)if(e.results[i].isFinal){nativeResults++;deliver(e.results[i][0]?.transcript);}};
        recognition.onerror=e=>{if(stopped)return;if(['not-allowed','service-not-allowed','network','audio-capture'].includes(e.error))fallback();};
        recognition.onend=()=>{if(!stopped&&native)restart=setTimeout(()=>{try{recognition.start();}catch{fallback();}},500);};
        recognition.start();native=true;diagnostics.backend='browser';
      }catch{fallback();}}
      if(typeof env.MediaRecorder==='undefined'){if(native){status('listening','Listening · browser recognition');return;}throw new Error('This browser cannot record audio. Update Quest Browser and retry.');}
      const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(m=>env.MediaRecorder.isTypeSupported(m));
      if(!native){const server=await serverReady();if(stopped)return;diagnostics.backend=server?'server':'local';
        if(!server){status('loading','Preparing headset speech recognition. The first download may take a minute.');if(!warmLocalSpeech)throw new Error('Microphone works, but no speech recognizer is configured.');await warmLocalSpeech(message=>status('loading',message));if(stopped)return;}}
      const begin=()=>{
        if(stopped||busy||hooks.isSpeaking?.())return;
        const seg={chunks:[],voiced:0,silence:0,elapsed:0,send:true,nativeAtStart:nativeResults};segment=seg;
        const rec=new env.MediaRecorder(stream,mime?{mimeType:mime}:{});recorder=rec;
        rec.ondataavailable=e=>{if(e.data?.size)seg.chunks.push(e.data);};rec.onerror=()=>fail('Microphone recorder failed. Retry Voice.');
        rec.onstop=async()=>{if(stopped||!seg.send||seg.voiced<160)return;busy=true;diagnostics.segments++;
          try{if(native)await new Promise(resolve=>{restart=setTimeout(resolve,900);});if(stopped||hooks.isSpeaking?.()||nativeResults!==seg.nativeAtStart)return;
            if(native)fallback();status('transcribing','Transcribing your voice…');jobAbort=new AbortController();const timeout=setTimeout(()=>jobAbort?.abort(),120000);
            try{const blob=new Blob(seg.chunks,{type:rec.mimeType||mime||'audio/webm'});deliver(await transcribe(blob,jobAbort.signal,status));}finally{clearTimeout(timeout);}
          }catch(e){if(!stopped)fail(e.name==='AbortError'?'Speech recognition timed out. Retry Voice.':e.message);}finally{busy=false;}};
        rec.start(200);status('listening','Listening · '+diagnostics.backend+' recognition');
      };
      begin();lastSample=env.performance.now();zeroSince=lastSample;
      interval=setInterval(()=>{if(stopped)return;const now=env.performance.now(),ms=Math.min(160,Math.max(0,now-lastSample));lastSample=now;
        diagnostics.track=track.readyState+(track.muted?' / muted':'');diagnostics.context=ctx.state;
        if(ctx.state!=='running'){status('muted','Audio is suspended. Use Retry Voice in the headset menu.');return;}
        analyser.getFloatTimeDomainData(data);let sum=0;for(const x of data)sum+=x*x;const rms=Math.sqrt(sum/data.length);diagnostics.rms=rms;hooks.onLevel?.(Math.min(1,rms*18));
        if(rms>.00001)zeroSince=now;
        if(hooks.isSpeaking?.()){lastSpeaking=now;if(segment)segment.send=false;if(recorder?.state==='recording')recorder.stop();status('replying','Mira is replying · listening resumes afterward');return;}
        if(now-lastSpeaking<500)return;
        if(now-zeroSince>10000){status('muted','Microphone is open but silent. Check headset mute and site microphone permission.');}
        if(busy)return;if(!recorder||recorder.state==='inactive'){begin();return;}
        const seg=segment;seg.elapsed+=ms;const threshold=Math.max(.003,Math.min(.018,noise*2.3));
        if(rms>threshold){seg.voiced+=ms;seg.silence=0;status('hearing','Hearing you…');}else{seg.silence+=ms;if(!seg.voiced)noise=noise*.98+Math.min(rms,.009)*.02;}
        if((seg.voiced>=160&&seg.silence>=640)||seg.elapsed>=12000||(!seg.voiced&&seg.elapsed>=2400))recorder.stop();
      },80);
    };
    setup().catch(e=>{if(!stopped)fail(e);});return handle;
  }
  return {lease,startMic,prepare:()=>lease.prepare(),stop(){active?.stop();lease.close();},get diagnostics(){return active?.diagnostics||{state:'off'};}};
}
