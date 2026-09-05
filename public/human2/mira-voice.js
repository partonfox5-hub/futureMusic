export const DEFAULT_PERSONA =
  "You are Mira, a warm playful young woman in an AR room. Reply in 1-2 short spoken sentences. If they mention exercise, workout, jumping jacks, squats, fitness or stretching, end with [[ACTION:jumpingJacks]] or [[ACTION:airSquats]] or [[ACTION:stretch]]. To stop exercising, [[ACTION:stop]]. Be friendly and a little teasing.";

export function parseAction(text) {
  const m = /\[\[ACTION:([a-zA-Z]+)\]\]/.exec(text || "");
  const clean = (text || "").replace(/\s*\[\[ACTION:[a-zA-Z]+\]\]\s*/g, " ").trim();
  const act = m ? m[1] : "";
  let mode = null;
  const low = (text || "").toLowerCase();
  if (/jumping\s*jack/.test(low) || act === "jumpingJacks") mode = "jumpingJacks";
  else if (/squat/.test(low) || act === "airSquats") mode = "airSquats";
  else if (/stretch|warmup|warm-up/.test(low) || act === "stretch") mode = "stretch";
  else if (act === "stop" || /stop (it|that|exercis)|that's enough|thats enough/.test(low)) mode = "wander";
  else if (/exercis|workout|fitness/.test(low) && !mode) mode = "jumpingJacks";
  return { text: clean, mode };
}

function localReply(userText) {
  const low = (userText || "").toLowerCase();
  if (/squat/.test(low)) return "Okay — air squats with me. Keep your chest up. [[ACTION:airSquats]]";
  if (/jumping\s*jack|jacks/.test(low)) return "Jumping jacks! Arms out, let's go. [[ACTION:jumpingJacks]]";
  if (/stretch|warmup|warm-up/.test(low)) return "Mmm, stretch with me for a minute. [[ACTION:stretch]]";
  if (/exercis|workout|fitness/.test(low)) return "Let's move — jumping jacks first. [[ACTION:jumpingJacks]]";
  if (/stop|enough|rest|tired/.test(low)) return "Alright, I'll catch my breath. [[ACTION:stop]]";
  if (/hello|hi\b|hey/.test(low)) return "Hey — I'm Mira. Come closer and talk to me.";
  if (/ball|throw|catch/.test(low)) return "Spawn a rubber ball with Y and toss it. I'll throw it back until I get bored.";
  return "Mm, I'm listening. Say that again a little closer.";
}

export async function miraChat(userText, persona) {
  const fromUser = parseAction(userText);
  try {
    const r = await fetch("/api/mira/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: userText, persona: persona || DEFAULT_PERSONA }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.reply) {
      const parsed = parseAction(j.reply);
      if (!parsed.mode && fromUser.mode) parsed.mode = fromUser.mode;
      return parsed;
    }
  } catch (e) {
    console.warn("mira chat", e);
  }
  return parseAction(localReply(userText));
}

export async function miraSpeak(text) {
  if (!text) return;
  try {
    const r = await fetch("/api/mira/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (r.ok) {
      const buf = await r.arrayBuffer();
      if (buf.byteLength > 200) {
        const url = URL.createObjectURL(new Blob([buf], { type: r.headers.get("content-type") || "audio/mpeg" }));
        const a = new Audio(url);
        a.play().catch(() => {});
        a.onended = () => URL.revokeObjectURL(url);
        return;
      }
    }
  } catch (e) {
    console.warn("tts api", e);
  }
  try {
    const u = new SpeechSynthesisUtterance(text);
    const voices = speechSynthesis.getVoices();
    const fem = voices.find((v) => /female|zira|samantha|google us english|eva|siri|aria|jenny/i.test(v.name + " " + (v.lang || ""))) || voices.find((v) => /^en/i.test(v.lang));
    if (fem) u.voice = fem;
    u.pitch = 1.14;
    u.rate = 1.02;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch (e) {
    console.warn("tts fallback", e);
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
  let timer = 0;

  navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then((s) => {
    if (stopped) { s.getTracks().forEach((t) => t.stop()); return; }
    stream = s;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
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
    rec.onend = () => { try { rec.start(); } catch (_) {} };
    try {
      rec.start();
      return rec;
    } catch (_) {}
  }
  return startMediaFallback(onText);
}
