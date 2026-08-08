/**
 * Audio — Web Audio API.
 * Cannon fire uses multi-layered noise + boom synthesis (realistic field-gun profile)
 * pre-rendered into a buffer so each shot plays a real sample-like blast, not a beep.
 */

export class AudioSynth {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.master = null;
    /** @type {AudioBuffer|null} */
    this.cannonBuffer = null;
    /** @type {AudioBuffer|null} */
    this.impactBuffer = null;
    this._building = false;
  }

  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.45;
    this.master.connect(this.ctx.destination);
  }

  resume() {
    this.ensure();
    if (this.ctx?.state === 'suspended') this.ctx.resume();
    // Warm samples off the hot path — never rebuild mid-shot
    this._scheduleWarmSamples();
  }

  /**
   * Kick off sample build on idle time so first fire never blocks the main thread.
   */
  _scheduleWarmSamples() {
    if (this.cannonBuffer || this._building || this._warmScheduled) return;
    this._warmScheduled = true;
    const run = () => {
      this._warmScheduled = false;
      this._ensureCannonSampleSync();
    };
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(run, { timeout: 400 });
    } else {
      setTimeout(run, 0);
    }
  }

  /**
   * Build cannon/impact buffers once. Prefer calling via _scheduleWarmSamples
   * before battle so fire() is a cheap buffer play.
   */
  _ensureCannonSampleSync() {
    if (this.cannonBuffer || this._building) return;
    this.ensure();
    if (!this.ctx) return;
    this._building = true;
    try {
      this.cannonBuffer = this._renderCannonBuffer();
      this.impactBuffer = this._renderImpactBuffer();
    } catch (e) {
      console.warn('Cannon sample render failed', e);
    }
    this._building = false;
  }

  /** @deprecated use _ensureCannonSampleSync / _scheduleWarmSamples */
  async _ensureCannonSample() {
    this._ensureCannonSampleSync();
  }

  _renderCannonBuffer() {
    const sr = this.ctx.sampleRate;
    // Shorter mono-leaning buffer = less main-thread hitch if ever built late
    const duration = 0.95;
    const n = Math.floor(sr * duration);
    const buf = this.ctx.createBuffer(1, n, sr);
    const L = buf.getChannelData(0);

    // White noise source
    const noise = new Float32Array(n);
    for (let i = 0; i < n; i++) noise[i] = Math.random() * 2 - 1;

    // Helpers
    const env = (t, a, d) => {
      if (t < a) return t / a;
      return Math.exp(-((t - a) / d));
    };

    for (let i = 0; i < n; i++) {
      const t = i / sr;
      let s = 0;

      // 1) Initial crack / muzzle blast (bright noise, very short)
      if (t < 0.08) {
        const e = env(t, 0.001, 0.025);
        // high-emphasize noise
        const crack = noise[i] * e * 0.95;
        s += crack;
        // metallic ping
        s += Math.sin(2 * Math.PI * (1800 - t * 12000) * t) * e * 0.25;
      }

      // 2) Main low boom (pitch drops like a real gun)
      if (t < 0.9) {
        const e = Math.exp(-t * 3.2);
        const f = 68 * Math.exp(-t * 2.4) + 28; // 68Hz → ~28Hz
        const boom = Math.sin(2 * Math.PI * f * t);
        // slight saturation
        const sat = Math.tanh(boom * 2.2) * e * 0.85;
        s += sat;
        // sub thump
        s += Math.sin(2 * Math.PI * 42 * t) * Math.exp(-t * 4) * 0.55;
      }

      // 3) Body rumble — lowpassed noise
      if (t < 1.4) {
        // simple 1-pole lowpass on noise
        const rumble = noise[i] * Math.exp(-t * 2.1) * 0.45;
        s += rumble * (0.35 + 0.65 * Math.exp(-t * 1.5));
      }

      // 4) Shell air whoosh (mid band, brief)
      if (t > 0.02 && t < 0.2) {
        const e = Math.sin(((t - 0.02) / 0.18) * Math.PI);
        s += noise[i] * e * 0.12;
      }

      // 5) Distant echo / courtyard slap
      const echoT = t - 0.14;
      if (echoT > 0 && echoT < 0.6) {
        const ei = Math.floor(echoT * sr);
        const e = Math.exp(-echoT * 4) * 0.28;
        s += noise[Math.min(ei, n - 1)] * e * 0.35;
        s += Math.sin(2 * Math.PI * 50 * echoT) * e * 0.4;
      }
      const echo2 = t - 0.32;
      if (echo2 > 0 && echo2 < 0.5) {
        s += Math.sin(2 * Math.PI * 40 * echo2) * Math.exp(-echo2 * 5) * 0.12;
      }

      // Soft clip
      s = Math.tanh(s * 1.15);
      L[i] = s * 0.95;
    }

    // One-pole lowpass for body (keep early crack bright)
    let lpL = 0;
    const alpha = 0.22;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      if (t < 0.03) continue;
      lpL += alpha * (L[i] - lpL);
      const mix = Math.min(1, (t - 0.03) / 0.05);
      L[i] = L[i] * (1 - mix * 0.55) + lpL * mix * 0.55;
    }

    return buf;
  }

  _renderImpactBuffer() {
    const sr = this.ctx.sampleRate;
    const duration = 0.35;
    const n = Math.floor(sr * duration);
    const buf = this.ctx.createBuffer(1, n, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const noise = Math.random() * 2 - 1;
      d[i] =
        noise * Math.exp(-t * 18) * 0.5 +
        Math.sin(2 * Math.PI * 90 * t) * Math.exp(-t * 12) * 0.35 +
        Math.sin(2 * Math.PI * 45 * t) * Math.exp(-t * 8) * 0.25;
      d[i] = Math.tanh(d[i]);
    }
    return buf;
  }

  _playBuffer(buffer, vol = 1, rate = 1) {
    if (!this.enabled || !this.ctx || !buffer) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    // Mild low shelf so it feels heavy
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowshelf';
    filter.frequency.value = 120;
    filter.gain.value = 4;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start();
    return src;
  }

  beep(freq, dur = 0.08, type = 'square', vol = 0.3) {
    if (!this.enabled) return;
    this.ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  place() {
    this.beep(220, 0.06, 'triangle', 0.2);
    this.beep(330, 0.05, 'triangle', 0.12);
  }

  /**
   * Realistic cannon fire (field gun blast).
   * Never rebuilds samples on the hot path — use fallback beep if not warm yet.
   */
  fire() {
    if (!this.enabled) return;
    this.ensure();
    if (this.ctx?.state === 'suspended') this.ctx.resume();
    if (!this.cannonBuffer) {
      // Avoid multi-hundred-ms hitch on first shot; play light fallback and warm for next
      this._scheduleWarmSamples();
      this._fallbackCannon();
      return;
    }
    const rate = 0.92 + Math.random() * 0.14;
    const vol = 0.85 + Math.random() * 0.15;
    this._playBuffer(this.cannonBuffer, vol, rate);
  }

  /** Quick fallback if buffer render fails */
  _fallbackCannon() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    // noise burst
    const sr = this.ctx.sampleRate;
    const len = Math.floor(sr * 0.5);
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 6);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, t0);
    filter.frequency.exponentialRampToValueAtTime(200, t0 + 0.4);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.9, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.6);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);

    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(70, t0);
    o.frequency.exponentialRampToValueAtTime(30, t0 + 0.5);
    const g2 = this.ctx.createGain();
    g2.gain.setValueAtTime(0.7, t0);
    g2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
    o.connect(g2);
    g2.connect(this.master);
    o.start(t0);
    o.stop(t0 + 0.6);
  }

  hit() {
    if (!this.enabled) return;
    this.ensure();
    if (this.impactBuffer) {
      this._playBuffer(this.impactBuffer, 0.45, 0.95 + Math.random() * 0.1);
      return;
    }
    this.beep(140, 0.05, 'square', 0.15);
  }

  /**
   * Low whistle as cannonball descends the arc (Rampart-style).
   */
  whistle() {
    if (!this.enabled) return;
    this.ensure();
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const dur = 0.55;
    // Falling pitch sine + soft noise for air
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(780, t0);
    o.frequency.exponentialRampToValueAtTime(220, t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t0);
    g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    filter.Q.value = 2.5;
    o.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);

    // Thin noise hiss
    const sr = this.ctx.sampleRate;
    const n = Math.floor(sr * dur);
    const buf = this.ctx.createBuffer(1, n, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 3) * 0.35;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g2 = this.ctx.createGain();
    g2.gain.value = 0.08;
    const f2 = this.ctx.createBiquadFilter();
    f2.type = 'highpass';
    f2.frequency.value = 1200;
    src.connect(f2);
    f2.connect(g2);
    g2.connect(this.master);
    src.start(t0);
  }

  capture() {
    this.beep(440, 0.08, 'sine', 0.22);
    this.beep(554, 0.1, 'sine', 0.18);
    this.beep(659, 0.14, 'sine', 0.18);
  }

  phase() {
    this.beep(300, 0.1, 'sine', 0.18);
    this.beep(450, 0.12, 'sine', 0.14);
  }

  deny() {
    this.beep(100, 0.15, 'sawtooth', 0.12);
  }
}
