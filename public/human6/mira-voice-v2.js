import {speakNeural} from './mira-neural-voice.js?v=19.1.0';
import {speakBasic} from './mira-basic-voice.js?v=19.1.0';
import {localTranscribe,warmLocalSpeech,stopLocalSpeech} from './mira-local-speech.js?v=19.1.0';
import {EMOTION_NAMES} from './mira-v2-features.js?v=19.1.0';
export const DEFAULT_PERSONA='You are Mira, a friendly adult woman in an XR room. Reply in 1–2 short spoken sentences. Keep a consistent emotional state based on the conversation. End with [[EMOTION:neutral|happy|content|curious|listening|thoughtful|concerned|sad|surprise|afraid|angry|disgust|tease|flirty|laugh|tired]] choosing exactly one label. Respond warmly when appropriate; let emotion match the conversation. Only when requested, add [[ACTION:idle|wander|airSquats|stretch|jumpingJacks|march|sideSteps|dance|reach|heelRaises]]. Do not read tags aloud.';
const ACTIONS=['idle','wander','airSquats','stretch','jumpingJacks','march','sideSteps','dance','reach','heelRaises'];
const history=new Map();let voiceAudio=null;let serverAvailable=null;
export function unlockVoice(){try{voiceAudio=voiceAudio||new (window.AudioContext||window.webkitAudioContext)();voiceAudio.resume().catch(()=>{});if('speechSynthesis' in window)speechSynthesis.getVoices();}catch{}}
async function voiceServer(){if(serverAvailable!==null)return serverAvailable;try{const r=await fetch('/api/mira/health',{signal:AbortSignal.timeout(2000)});const j=await r.json();serverAvailable=r.ok&&j.ready===true;}catch{serverAvailable=false;}return serverAvailable;}

export function inferEmotion(text){
 const t=String(text||'').toLowerCase();
 if(/griev|died|death|lonely|depress|sad|hurt|worried|anxious|afraid/.test(t))return 'concerned';
 if(/frustrat|annoy|angry|upset|stress/.test(t))return 'concerned';
 if(/thank|appreciate|reliev/.test(t))return 'content';
 if(/haha|\blol\b|laugh|funny/.test(t))return 'laugh';
 if(/surpris|amazing|wow|incredible/.test(t))return 'surprise';
 if(/tired|sleepy|exhaust/.test(t))return 'tired';
 if(/love|beautiful|pretty|cute/.test(t))return 'happy';
 if(/think|consider|wonder/.test(t))return 'thoughtful';
 if(/\?/.test(t))return 'curious';
 if(/\b(hello|hi|hey)\b/.test(t))return 'happy';
 return 'listening';
}
export function parseAction(text){
 const raw=String(text||'');const e=/\[\[EMOTION:\s*([a-z]+)\s*\]\]/i.exec(raw);const a=/\[\[ACTION:\s*([a-z]+)\s*\]\]/i.exec(raw);
 const clean=raw.replace(/\[\[(?:ACTION|EMOTION):[^\]]*\]\]/gi,'').trim();
 const act=a?.[1];return {text:clean,emotion:EMOTION_NAMES.includes(e?.[1].toLowerCase())?e[1].toLowerCase():inferEmotion(clean),mode:act==='stop'?'idle':ACTIONS.find(x=>x.toLowerCase()===act?.toLowerCase())||null};
}
function requestedAction(text){
 const t=String(text||'').toLowerCase();
 if(/^(stop|rest|stand still)|please stop/.test(t))return 'idle';
 if(!/^(please|can you|could you|let.s|do|start|walk|wander|stretch|squat|jump)|show me/.test(t))return null;
 if(/squat/.test(t))return 'airSquats';if(/jumping jacks/.test(t))return 'jumpingJacks';if(/stretch/.test(t))return 'stretch';if(/walk|wander/.test(t))return 'wander';return null;
}
function localReply(text,previous){
 const emotion=inferEmotion(text),mode=requestedAction(text);let reply;
 if(mode)reply=mode==='idle'?"Okay, I'll stand here.":"Sure, let's try that movement.";
 else if(/what.*name|who are you/i.test(text))reply="I'm Mira. We can explore the room, try clothes, or choose an activity together.";
 else if(/how are you|how.*doing/i.test(text))reply="I'm feeling good. It's nice having you here. How are you?";
 else if(/clothes|wardrobe|dress/i.test(text))reply="You can drag something from the wardrobe onto me. Which outfit shall we try?";
 else if(/sit|chair|couch/i.test(text))reply="Point at a chair or the couch and I'll walk over to sit down.";
 else if(/jungle|beach|living room/i.test(text))reply="You can change our surroundings in the Scene menu. Where would you like to go?";
 else if(emotion==='concerned')reply="That sounds difficult. I'm listening—what happened?";
 else if(emotion==='content')reply="You're welcome. I'm glad we're talking.";
 else if(emotion==='laugh')reply="That made me smile.";
 else if(emotion==='tired')reply="We can slow down and take a quiet moment.";
 else if(emotion==='curious'||emotion==='thoughtful')reply="I'm thinking about what you said. Tell me a little more.";
 else if(emotion==='happy')reply="Hey, it's good to see you.";
 else reply=previous.length?"I'm still listening. What would you like to talk about next?":"I'm listening. What would you like to talk about?";
 return {text:reply,emotion,mode,intensity:emotion==='surprise'?.65:.55,source:'local fallback'};
}
export async function miraChat(userText,persona,{conversationId='default'}={}){
 const previous=history.get(conversationId)||[];let result;
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
 try{
  if(!await voiceServer())throw new Error('No conversation server');
  const r=await fetch('/api/mira/chat',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,
   body:JSON.stringify({text:userText,persona:persona||DEFAULT_PERSONA,history:previous.slice(-12),emotion:inferEmotion(userText)})});
  const j=await r.json();
  if(r.ok&&typeof j.reply==='string'){
   result=parseAction(j.reply);
   if(EMOTION_NAMES.includes(j.emotion))result.emotion=j.emotion;
   for(const k of ['intensity','valence','arousal'])if(Number.isFinite(j[k]))result[k]=Math.max(k==='valence'?-1:0,Math.min(1,j[k]));
   if(ACTIONS.includes(j.action))result.mode=j.action;
   result.mode=result.mode||requestedAction(userText);result.source='conversation';
  }
 }catch(e){/* Static hosting intentionally falls back to local conversational cues. */}finally{clearTimeout(timer);}
 result=result||localReply(userText,previous);
 history.set(conversationId,[...previous,{role:'user',content:String(userText).slice(0,1000)},{role:'assistant',content:result.text.slice(0,1000)}].slice(-12));
 return result;
}

function pickFemaleVoice() {
  const voices = speechSynthesis.getVoices ? speechSynthesis.getVoices() : [];
  return voices.find((v) => /female|zira|samantha|google us english|eva|siri|aria|jenny|susan|hazel|linda|karen|moira|veena|fiona|tessa|zira/i.test(v.name + " " + (v.lang || "")))
    || voices.find((v) => /^en/i.test(v.lang))
    || null;
}

function ampLoop(onAmp, getT, getDur, alive) {
  let raf = 0;
  const step = () => {
    if (!alive()) return;
    const t = getT();
    const dur = getDur();
    if (onAmp) onAmp(0.35 + 0.65 * Math.abs(Math.sin(t * 10.5)), t, dur);
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

export async function miraSpeak(text, hooks = {}) {
  const { onStart, onAmp, onEnd } = hooks;
  if (!text) { if (onEnd) onEnd(); return; }
  let finished=false,basicStarted=false;
  const finish = () => { if(finished)return;finished=true;if (onEnd) onEnd(); };
  const basic=async()=>{if(basicStarted||finished)return;basicStarted=true;try{unlockVoice();await speakBasic(text,voiceAudio,hooks);}catch(e){hooks.onError?.(e.message);}finally{finish();}};

  if(!['device','server'].includes(hooks.voice)){try{unlockVoice();await speakNeural(text,voiceAudio,{...hooks,onEnd:finish});return;}catch(e){hooks.onStatus?.('Natural voice unavailable · using fallback');console.warn('Natural voice',e.message);}}
  try {
    if(hooks.voice!=='server')throw new Error('Use device voice');
    if(!await voiceServer())throw new Error("No voice server");
    const r = await fetch("/api/mira/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: "eve" }),
      signal: AbortSignal.timeout(10000),
    });
    if (r.ok && /^(audio\/|application\/octet-stream)/i.test(r.headers.get("content-type") || "")) {
      const buf = await r.arrayBuffer();
      if (buf.byteLength > 200) {
        const url = URL.createObjectURL(new Blob([buf], { type: r.headers.get("content-type") || "audio/mpeg" }));
        const a = new Audio(url);
        a.preload = "auto";
        let analyser = null, data = null, raf = 0, stopped = false, audioContext=null;
        const stop = (notify=true) => {
          if (stopped) return;
          stopped = true;
          cancelAnimationFrame(raf);
          URL.revokeObjectURL(url);
          
          if(notify)finish();
        };
        try {
          const ctx = audioContext = voiceAudio || new (window.AudioContext || window.webkitAudioContext)();
          if (ctx.state === "suspended") await ctx.resume().catch(() => {});
          const src = ctx.createMediaElementSource(a);
          analyser = ctx.createAnalyser();
          analyser.fftSize = 1024;
          src.connect(analyser);
          analyser.connect(ctx.destination);
          data = new Uint8Array(analyser.fftSize);
        } catch (e) {
          console.warn("tts analyser", e);
        }
        const tick = () => {
          if (stopped) return;
          let amp = 0.4;
          if (analyser && data) {
            analyser.getByteTimeDomainData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) {
              const v = (data[i] - 128) / 128;
              sum += v * v;
            }
            amp = Math.min(1, Math.sqrt(sum / data.length) * 5.2);
          } else {
            amp = 0.35 + 0.65 * Math.abs(Math.sin((a.currentTime || 0) * 10.5));
          }
          if (onAmp) onAmp(amp, a.currentTime || 0, a.duration || 1);
          if (!a.paused && !a.ended) raf = requestAnimationFrame(tick);
        };
        a.onplay = () => {
          if (onStart) onStart(a.duration && isFinite(a.duration) ? a.duration : Math.max(1.2, text.length * 0.055));
          tick();
        };
        a.onended = () => stop();
        a.onerror = () => {hooks.onError?.("Reply audio failed. Check headset volume and audio permissions.");stop();};
        try {
          await a.play();
          return;
        } catch (e) {
          stop(false);
        }
      }
    }
  } catch (e) {
    console.warn("tts api", e);
  }

  try {
    const u = new SpeechSynthesisUtterance(text);
    const fem = pickFemaleVoice();
    if (fem) u.voice = fem;
    u.pitch = 1.03;
    u.rate = 1.0;
    const dur = Math.max(1.15, text.split(/\s+/).length * 0.34);
    let t0 = 0;
    let cancelAmp = null;
    const startWatch=setTimeout(()=>{if(!t0){basic();speechSynthesis.cancel();}},3500);
    u.onstart = () => {clearTimeout(startWatch);
      t0 = performance.now();
      if (onStart) onStart(dur);
      cancelAmp = ampLoop(onAmp, () => (performance.now() - t0) / 1000, () => dur, () => true);
    };
    u.onend = () => { if(basicStarted)return;clearTimeout(startWatch);if (cancelAmp) cancelAmp(); finish(); };
    u.onerror = () => { clearTimeout(startWatch);if (cancelAmp) cancelAmp(); basic(); };
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    if (speechSynthesis.getVoices && !speechSynthesis.getVoices().length) {
      speechSynthesis.onvoiceschanged = () => {
        const v = pickFemaleVoice();
        if (v) u.voice = v;
      };
    }
  } catch (e) {
    console.warn("tts fallback", e);
    basic();
  }
}

export async function transcribeBlob(blob,signal,status){
 if(!await voiceServer()){status?.('Recognizing locally…');return localTranscribe(blob,signal,status);}
 const fd=new FormData();fd.append('file',blob,/mp4/.test(blob.type)?'clip.m4a':'clip.webm');const r=await fetch('/api/mira/stt',{method:'POST',body:fd,signal});if(!r.ok)throw new Error('Transcription service returned '+r.status);const j=await r.json();if(typeof j.text!=='string')throw new Error('Invalid transcription reply');return j.text.trim();
}

export function startMic(onText,hooks={}){
 let stopped=false,stream=null,recorder=null,recognition=null,interval=0,restart=0,nativeMode=false,nativeResults=0,busy=false,segment=null;
 let noise=.004,lastStatus='',ctx=null;const abort=new AbortController(),pending=new Set();
 const quest=/OculusBrowser|Quest|Oculus/i.test(navigator.userAgent||'');
 const status=(state,message)=>{if(lastStatus===state+message)return;lastStatus=state+message;hooks.onStatus?.({state,message});};
 const stop=(quiet=false)=>{
  if(stopped)return;stopped=true;clearInterval(interval);clearTimeout(restart);for(const t of pending)clearTimeout(t);pending.clear();abort.abort();stopLocalSpeech();
  if(recognition){recognition.onend=null;recognition.abort();}if(recorder?.state==='recording')recorder.stop();
  stream?.getTracks().forEach(t=>t.stop());ctx?.close().catch(()=>{});hooks.onLevel?.(0);if(!quiet)status('off','Voice off');
 };
 const fail=message=>{stop(true);status('error',message);};
 const deliver=text=>{if(!stopped&&!hooks.isSpeaking?.()&&text)onText(text);};
 const useServer=()=>{nativeMode=false;if(recognition){recognition.onend=null;recognition.abort();recognition=null;}};
 status('starting','Allow microphone access to start voice.');
 voiceServer();
 try{ctx=new (window.AudioContext||window.webkitAudioContext)();ctx.resume().catch(()=>{});}catch(e){fail('Audio input is unavailable in this browser.');return {stop};}
 if(!navigator.mediaDevices?.getUserMedia){fail('Microphone requires HTTPS or localhost.');return {stop};}
 const openMic=()=>navigator.mediaDevices.getUserMedia({audio:quest?{echoCancellation:false,noiseSuppression:false,autoGainControl:true}:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}}).catch(()=>navigator.mediaDevices.getUserMedia({audio:true}));
 openMic().then(async s=>{
  if(stopped){s.getTracks().forEach(t=>t.stop());return;}stream=s;await ctx.resume();if(stopped)return;
  const src=ctx.createMediaStreamSource(s),analyser=ctx.createAnalyser();analyser.fftSize=1024;src.connect(analyser);const data=new Float32Array(analyser.fftSize);
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR&&!await voiceServer())warmLocalSpeech(message=>status('loading',message)).catch(e=>{if(!stopped)fail(e.message);});
  if(SR&&!quest){try{
   recognition=new SR();recognition.continuous=true;recognition.interimResults=false;recognition.lang='en-US';nativeMode=true;
   recognition.onresult=ev=>{for(let i=ev.resultIndex||0;i<ev.results.length;i++){const r=ev.results[i];if(r.isFinal){nativeResults++;deliver(r[0]?.transcript?.trim());}}};
   recognition.onerror=ev=>{if(stopped)return;if(ev.error==='not-allowed')fail('Microphone permission was denied. Allow it in the headset browser settings.');else if(ev.error!=='no-speech'&&ev.error!=='aborted')useServer();};
   recognition.onend=()=>{if(!stopped&&nativeMode)restart=setTimeout(()=>{try{recognition?.start();}catch{useServer();}},450);};recognition.start();
  }catch{useServer();}}
  if(typeof MediaRecorder==='undefined'){
   if(!nativeMode){fail('This browser has no supported microphone recording or speech recognition.');return;}
   status('listening','Listening · browser speech recognition');return;
  }
  const mime=(quest?['audio/mp4','audio/webm;codecs=opus','audio/webm']:['audio/webm;codecs=opus','audio/webm','audio/mp4']).find(m=>MediaRecorder.isTypeSupported(m));
  const begin=()=>{
   if(stopped||busy||hooks.isSpeaking?.())return;
   const seg={chunks:[],voiced:0,silence:0,elapsed:0,nativeAtStart:nativeResults,send:true};segment=seg;
   const rec=new MediaRecorder(stream,mime?{mimeType:mime}:{});recorder=rec;
   rec.ondataavailable=e=>{if(e.data?.size)seg.chunks.push(e.data);};
   rec.onerror=()=>fail('Microphone recording failed. Toggle Voice to retry.');
   rec.onstop=()=>{
    if(stopped||!seg.send||seg.voiced<160||seg.nativeAtStart!==nativeResults){busy=false;return;}
    const blob=new Blob(seg.chunks,{type:rec.mimeType||mime||'audio/webm'});busy=true;
    const run=async()=>{
     if(stopped)return;
     if(seg.nativeAtStart!==nativeResults||hooks.isSpeaking?.()){busy=false;return;}
     useServer();status('transcribing','Transcribing your voice…');
     const timeout=setTimeout(()=>abort.abort(),180000);
     try{deliver(await transcribeBlob(blob,abort.signal,message=>status('transcribing',message)));}
     catch(e){if(!stopped)fail(e.name==='AbortError'?'Transcription timed out. Check the voice server.':e.message);}
     finally{clearTimeout(timeout);busy=false;}
    };
    if(nativeMode){const timer=setTimeout(()=>{pending.delete(timer);run();},1600);pending.add(timer);}else run();
   };
   rec.start(160);status('listening',nativeMode?'Listening · browser speech recognition':'Listening · local recognition fallback');
  };
  begin();
  interval=setInterval(()=>{
   if(stopped)return;analyser.getFloatTimeDomainData(data);let sum=0;for(const x of data)sum+=x*x;const rms=Math.sqrt(sum/data.length);hooks.onLevel?.(Math.min(1,rms*14));
   if(hooks.isSpeaking?.()){
    if(segment)segment.send=false;if(recorder?.state==='recording')recorder.stop();status('replying','Mira is replying · microphone paused');return;
   }
   if(busy)return;
   if(!recorder||recorder.state==='inactive'){begin();return;}
   const seg=segment;seg.elapsed+=80;
   const threshold=quest?Math.max(.0035,Math.min(.016,noise*2.1)):Math.max(.009,Math.min(.032,noise*2.5));
   if(rms>threshold){seg.voiced+=80;seg.silence=0;status('hearing','Hearing you…');}
   else{seg.silence+=80;if(!seg.voiced)noise=noise*.98+Math.min(rms,.012)*.02;}
   if((seg.voiced>=(quest?100:160)&&seg.silence>=(quest?560:720))||seg.elapsed>=12000||(!seg.voiced&&seg.elapsed>=2000)){recorder.stop();}
  },80);
 }).catch(e=>{if(!stopped)fail(e.name==='NotAllowedError'?'Microphone permission denied. Allow it in the headset browser settings.':'Microphone could not start: '+e.message);});
 return {stop};
}
