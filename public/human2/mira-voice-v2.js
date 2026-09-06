import {EMOTION_NAMES} from './mira-v2-features.js?v=3';
export const DEFAULT_PERSONA='You are Mira, a friendly adult woman in an XR room. Reply in 1–2 short spoken sentences. Keep a consistent emotional state based on the conversation. End with [[EMOTION:neutral|happy|content|curious|listening|thoughtful|concerned|sad|surprise|afraid|angry|disgust|tease|flirty|laugh|tired]] choosing exactly one label. Use moderate expressions. Only when requested, add [[ACTION:idle|wander|airSquats|stretch|jumpingJacks]]. Do not read tags aloud.';
const ACTIONS=['idle','wander','airSquats','stretch','jumpingJacks'];
const history=new Map();
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
  const finish = () => { if (onEnd) onEnd(); };

  try {
    const r = await fetch("/api/mira/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: "eve" }),
    });
    if (r.ok && /^(audio\/|application\/octet-stream)/i.test(r.headers.get("content-type") || "")) {
      const buf = await r.arrayBuffer();
      if (buf.byteLength > 200) {
        const url = URL.createObjectURL(new Blob([buf], { type: r.headers.get("content-type") || "audio/mpeg" }));
        const a = new Audio(url);
        a.preload = "auto";
        let analyser = null, data = null, raf = 0, stopped = false, audioContext=null;
        const stop = () => {
          if (stopped) return;
          stopped = true;
          cancelAnimationFrame(raf);
          URL.revokeObjectURL(url);
          audioContext?.close().catch(()=>{});
          finish();
        };
        try {
          const ctx = audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
        a.onended = stop;
        a.onerror = stop;
        try {
          await a.play();
        } catch (e) {
          stop();
        }
        return;
      }
    }
  } catch (e) {
    console.warn("tts api", e);
  }

  try {
    const u = new SpeechSynthesisUtterance(text);
    const fem = pickFemaleVoice();
    if (fem) u.voice = fem;
    u.pitch = 1.16;
    u.rate = 1.0;
    const dur = Math.max(1.15, text.split(/\s+/).length * 0.34);
    let t0 = 0;
    let cancelAmp = null;
    u.onstart = () => {
      t0 = performance.now();
      if (onStart) onStart(dur);
      cancelAmp = ampLoop(onAmp, () => (performance.now() - t0) / 1000, () => dur, () => true);
    };
    u.onend = () => { if (cancelAmp) cancelAmp(); finish(); };
    u.onerror = () => { if (cancelAmp) cancelAmp(); finish(); };
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
    finish();
  }
}

async function transcribeBlob(blob) {
  const fd = new FormData();
  fd.append("file", blob, "clip.webm");
  const r = await fetch("/api/mira/stt", { method: "POST", body: fd });
  const j = await r.json().catch(() => ({}));
  return (j.text || "").trim();
}

function startMediaFallback(onText) {
  let stopped = false;
  let rec = null;
  let chunks = [];
  let speaking = false;
  let silentMs = 0;
  let stream = null;
  let analyser = null;
  let data = null;
  let timer = 0, micContext=null;

  navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then((s) => {
    if (stopped) { s.getTracks().forEach((t) => t.stop()); return; }
    stream = s;
    const ctx = micContext = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaStreamSource(s);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    src.connect(analyser);
    data = new Uint8Array(analyser.fftSize);
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
    timer = setInterval(() => {
      if (stopped || !analyser) return;
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      if (rms > 0.045) {
        silentMs = 0;
        if (!speaking) {
          speaking = true;
          chunks = [];
          try {
            rec = new MediaRecorder(stream, { mimeType: mime });
            rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
            rec.onstop = async () => {
              const blob = new Blob(chunks, { type: mime });
              if (blob.size < 1200) return;
              try {
                const t = await transcribeBlob(blob);
                if (t) onText(t);
              } catch (e) { console.warn("stt", e); }
            };
            rec.start();
          } catch (e) { speaking = false; }
        }
      } else if (speaking) {
        silentMs += 80;
        if (silentMs > 750 && rec && rec.state === "recording") {
          try { rec.stop(); } catch (_) {}
          speaking = false;
        }
      }
    }, 80);
  }).catch((e) => console.warn("mic", e));

  return {
    stop() {
      stopped = true;
      clearInterval(timer);
      try { if (rec && rec.state === "recording") rec.stop(); } catch (_) {}
      if (stream) stream.getTracks().forEach((t) => t.stop());
      micContext?.close().catch(()=>{});
    },
  };
}

export function startMic(onText) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (ev) => {
      const t = ev.results[ev.results.length - 1];
      if (t && t.isFinal && t[0] && t[0].transcript) onText(t[0].transcript.trim());
    };
    rec.onerror = () => {};
    let keepListening=true;
    rec.onend = () => { if(keepListening)try { rec.start(); } catch (_) {} };
    try {
      rec.start();
      return {stop(){keepListening=false;rec.onend=null;rec.abort();}};
    } catch (_) {}
  }
  return startMediaFallback(onText);
}
