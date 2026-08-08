/**
 * Loser Prize Wheel — spin with realistic momentum.
 * Space: start spin (if idle) or apply brake (if spinning).
 * 8 segments: 1× free cannon + 7× point bonuses (3 / 5 / 10 / 15).
 */

export const WHEEL_SEGMENTS = [
  { id: 'cannon', type: 'cannon', label: 'FREE\nCANNON', color: '#2ea043', text: '#fff' },
  { id: 'p3a', type: 'points', amount: 3, label: '+3', color: '#5a4a3a', text: '#f0d78c' },
  { id: 'p5a', type: 'points', amount: 5, label: '+5', color: '#3a4a5a', text: '#c8e0ff' },
  { id: 'p10a', type: 'points', amount: 10, label: '+10', color: '#4a3a5a', text: '#e8d0ff' },
  { id: 'p15', type: 'points', amount: 15, label: '+15', color: '#5a3a2a', text: '#ffd0a0' },
  { id: 'p3b', type: 'points', amount: 3, label: '+3', color: '#3a5a4a', text: '#c8f0d0' },
  { id: 'p5b', type: 'points', amount: 5, label: '+5', color: '#4a4a2a', text: '#f0e8a0' },
  { id: 'p10b', type: 'points', amount: 10, label: '+10', color: '#2a3a5a', text: '#a8c8ff' },
];

export class PrizeWheel {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.angle = 0; // radians, 0 = pointer at top of segment 0 boundary
    this.omega = 0; // rad/s
    this.spinning = false;
    this.braking = false;
    this.settled = false;
    this.prize = null;
    this.onSettle = null;
    this._raf = 0;
    this._lastT = 0;
    this.active = false;
    this.playerName = '';
    this.cannonsLost = 0;
  }

  bind(canvas) {
    this.canvas = canvas;
    this.ctx = canvas?.getContext('2d') || null;
  }

  open(playerName, cannonsLost) {
    this.active = true;
    this.settled = false;
    this.spinning = false;
    this.braking = false;
    this.prize = null;
    this.omega = 0;
    this.angle = Math.random() * Math.PI * 2;
    this.playerName = playerName || 'Player';
    this.cannonsLost = cannonsLost || 0;
    this._lastT = performance.now();
    this._loop();
    this.draw();
  }

  close() {
    this.active = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  /** Space pressed: start or stop */
  onSpace() {
    if (!this.active || this.settled) return;
    if (!this.spinning && this.omega < 0.05) {
      // Start: strong initial spin
      this.spinning = true;
      this.braking = false;
      this.omega = 18 + Math.random() * 10; // rad/s
      this._lastT = performance.now();
    } else if (this.spinning && !this.braking) {
      // Begin decelerating with friction
      this.braking = true;
    }
  }

  _loop = () => {
    if (!this.active) return;
    const now = performance.now();
    let dt = (now - this._lastT) / 1000;
    this._lastT = now;
    dt = Math.min(0.05, Math.max(0, dt));

    if (this.spinning || this.omega > 0.02) {
      // Momentum: low air drag, stronger friction when braking
      const drag = this.braking ? 4.2 : 0.55;
      this.omega *= Math.exp(-drag * dt);
      // Extra constant brake while holding stop intent
      if (this.braking) this.omega = Math.max(0, this.omega - 2.8 * dt);
      this.angle += this.omega * dt;

      if (this.braking && this.omega < 0.35) {
        // Snap settle onto center of landing segment with soft ease
        this.omega = 0;
        this.spinning = false;
        this.braking = false;
        this._settle();
      }
    }

    this.draw();
    this._raf = requestAnimationFrame(this._loop);
  };

  /** Which segment the pointer (top) is on */
  currentSegmentIndex() {
    const n = WHEEL_SEGMENTS.length;
    const seg = (Math.PI * 2) / n;
    // Pointer at -π/2 (top). Wheel angle increases clockwise when we draw that way.
    // Normalize: rotation of wheel; segment under pointer
    let a = (-this.angle - Math.PI / 2) % (Math.PI * 2);
    if (a < 0) a += Math.PI * 2;
    // Invert because we rotate the wheel under a fixed pointer
    let idx = Math.floor(a / seg);
    // Alternative: pointer fixed at top, wheel drawn rotated by `angle`
    // Segment i covers [i*seg, (i+1)*seg) in wheel local coords.
    // World angle of segment mid after rotation...
    // Simpler: angle of pointer in wheel space = -angle - π/2
    let w = (-Math.PI / 2 - this.angle) % (Math.PI * 2);
    if (w < 0) w += Math.PI * 2;
    idx = Math.floor(w / seg) % n;
    return idx;
  }

  _settle() {
    const n = WHEEL_SEGMENTS.length;
    const seg = (Math.PI * 2) / n;
    const idx = this.currentSegmentIndex();
    // Nudge angle so pointer sits in center of segment
    let w = (-Math.PI / 2 - this.angle) % (Math.PI * 2);
    if (w < 0) w += Math.PI * 2;
    const center = idx * seg + seg / 2;
    const delta = center - w;
    this.angle -= delta;
    this.settled = true;
    this.prize = { ...WHEEL_SEGMENTS[idx], index: idx };
    if (this.onSettle) this.onSettle(this.prize);
  }

  draw() {
    const ctx = this.ctx;
    const canvas = this.canvas;
    if (!ctx || !canvas) return;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2 + 8;
    const R = Math.min(W, H) * 0.38;
    const n = WHEEL_SEGMENTS.length;
    const seg = (Math.PI * 2) / n;

    ctx.clearRect(0, 0, W, H);

    // Outer wood ring
    ctx.beginPath();
    ctx.arc(cx, cy, R + 14, 0, Math.PI * 2);
    const wood = ctx.createRadialGradient(cx, cy, R, cx, cy, R + 16);
    wood.addColorStop(0, '#6b4423');
    wood.addColorStop(1, '#2a1808');
    ctx.fillStyle = wood;
    ctx.fill();

    // Iron rim
    ctx.beginPath();
    ctx.arc(cx, cy, R + 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#8a949e';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.angle);

    for (let i = 0; i < n; i++) {
      const s = WHEEL_SEGMENTS[i];
      const a0 = i * seg - Math.PI / 2;
      const a1 = a0 + seg;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, a0, a1);
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();
      ctx.strokeStyle = '#1a1008';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      const mid = a0 + seg / 2;
      ctx.save();
      ctx.rotate(mid);
      ctx.translate(R * 0.58, 0);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = s.text;
      ctx.font = s.type === 'cannon' ? 'bold 11px Cinzel, Georgia, serif' : 'bold 16px Cinzel, Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lines = s.label.split('\n');
      lines.forEach((line, li) => {
        ctx.fillText(line, 0, (li - (lines.length - 1) / 2) * 12);
      });
      ctx.restore();
    }

    // Hub
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#d4a017';
    ctx.fill();
    ctx.strokeStyle = '#2a1a08';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // Pointer (top)
    ctx.beginPath();
    ctx.moveTo(cx, cy - R - 4);
    ctx.lineTo(cx - 12, cy - R - 22);
    ctx.lineTo(cx + 12, cy - R - 22);
    ctx.closePath();
    ctx.fillStyle = '#d4a017';
    ctx.fill();
    ctx.strokeStyle = '#1a1008';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
