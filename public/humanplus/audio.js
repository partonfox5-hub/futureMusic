let actx = null;

export function audioReady() {
  if (actx) return actx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  actx = new AC();
  return actx;
}

const PATCH = {
  nibbit: { wave: "square", f: 720, hop: 180 },
  fluffo: { wave: "sine", f: 420, hop: 80 },
  sparkle: { wave: "triangle", f: 980, hop: 220 },
  grumble: { wave: "sawtooth", f: 140, hop: -40 },
  pipkin: { wave: "triangle", f: 640, hop: 120 },
  chicken: { wave: "square", f: 880, hop: 260 },
  ostrich: { wave: "sawtooth", f: 220, hop: 60 },
  bear: { wave: "sawtooth", f: 90, hop: -20 },
  turtle: { wave: "sine", f: 180, hop: 30 },
  beaver: { wave: "square", f: 260, hop: 70 },
  cat: { wave: "triangle", f: 760, hop: 140 },
  dog: { wave: "sawtooth", f: 210, hop: 50 },
  tiger: { wave: "sawtooth", f: 130, hop: 40 },
  bunny: { wave: "sine", f: 900, hop: 200 },
  frog: { wave: "square", f: 310, hop: 90 },
  pig: { wave: "sawtooth", f: 250, hop: -30 },
  duck: { wave: "square", f: 480, hop: 110 },
  fox: { wave: "triangle", f: 540, hop: 90 },
  owl: { wave: "sine", f: 280, hop: -50 },
  mouse: { wave: "square", f: 1200, hop: 240 },
  lizard: { wave: "triangle", f: 360, hop: 70 },
  horde: { wave: "sawtooth", f: 70, hop: -25 },
};

function beep(freq, dur, type, gain, slide) {
  const ctx = audioReady();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  o.type = type || "sine";
  o.frequency.setValueAtTime(freq, ctx.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), ctx.currentTime + dur);
  f.type = "lowpass";
  f.frequency.value = Math.min(4200, freq * 4);
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(gain || 0.08, ctx.currentTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  o.connect(f); f.connect(g); g.connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + dur + 0.02);
}

export function summonTone(id) {
  const p = PATCH[id] || PATCH.nibbit;
  beep(p.f, 0.16, p.wave, 0.09, p.hop);
  setTimeout(() => beep(p.f + p.hop * 0.5, 0.12, p.wave, 0.06, p.hop * 0.4), 90);
}

export function attackTone(id) {
  const p = PATCH[id] || PATCH.horde;
  beep(p.f * 0.7, 0.11, p.wave, 0.1, -p.f * 0.3);
  beep(p.f * 1.4, 0.07, "square", 0.04, 40);
}

export function eatTone() { beep(520, 0.08, "sine", 0.05, 180); }
export function petTone() { beep(880, 0.1, "sine", 0.04, 220); beep(1320, 0.12, "triangle", 0.03, 80); }
export function portalTone() { beep(90, 0.28, "sawtooth", 0.07, 40); beep(180, 0.2, "square", 0.03, -60); }
export function laserTone() { beep(1400, 0.06, "square", 0.05, -800); }
export function rallyTone() { beep(440, 0.1, "triangle", 0.06, 220); beep(660, 0.14, "sine", 0.05, 120); }
