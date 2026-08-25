/** Tiny WebAudio hits so ZOOM has feedback without asset files. */

let ac;

function ctx() {
  if (ac) return ac;
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;
  ac = new C();
  return ac;
}

export function sfxUnlock() {
  const c = ctx();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

function beep(type, freq, dur, vol, slide) {
  const c = ctx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  const f = c.createBiquadFilter();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), c.currentTime + dur);
  f.type = "lowpass";
  f.frequency.value = Math.min(4200, freq * 4);
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(f);
  f.connect(g);
  g.connect(c.destination);
  o.start();
  o.stop(c.currentTime + dur + 0.02);
}

function noise(dur, vol, freq) {
  const c = ctx();
  if (!c) return;
  const n = Math.max(1, (c.sampleRate * dur) | 0);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  f.Q.value = 0.7;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  src.connect(f);
  f.connect(g);
  g.connect(c.destination);
  src.start();
}

const FN = {
  psy() {
    beep("sawtooth", 220, 0.22, 0.09, 90);
    beep("sine", 680, 0.18, 0.06, 240);
    noise(0.16, 0.08, 900);
  },
  glass() {
    beep("triangle", 1480, 0.12, 0.07, 420);
    beep("square", 920, 0.08, 0.04, 200);
    noise(0.18, 0.11, 2400);
  },
  grab() {
    beep("sine", 180, 0.1, 0.07, 140);
  },
  release() {
    beep("triangle", 240, 0.12, 0.05, 110);
  },
  swing() {
    noise(0.1, 0.07, 600);
    beep("sawtooth", 160, 0.08, 0.04, 80);
  },
  gun() {
    noise(0.09, 0.12, 700);
    beep("square", 140, 0.07, 0.06, 70);
  },
  hit() {
    noise(0.08, 0.1, 400);
    beep("sawtooth", 90, 0.1, 0.08, 50);
  },
  boom() {
    noise(0.22, 0.14, 180);
    beep("sine", 70, 0.28, 0.12, 40);
  },
  cycle() {
    beep("square", 520, 0.06, 0.04, 780);
  },
  fire() {
    noise(0.12, 0.06, 500);
    beep("sawtooth", 310, 0.1, 0.05, 120);
  },
  land() {
    noise(0.08, 0.06, 220);
  },
};

export function sfx(name) {
  try {
    sfxUnlock();
    (FN[name] || FN.hit)();
  } catch {}
}
