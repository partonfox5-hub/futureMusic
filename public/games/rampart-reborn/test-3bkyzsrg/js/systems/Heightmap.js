/**
 * Heightmap — procedural terrain elevation 0..MAX_HEIGHT
 * Uses simple value-noise + ridge for hills/cliffs.
 */

import { CONFIG } from '../data/config.js';

export class Heightmap {
  /**
   * @param {number} w
   * @param {number} h
   * @param {number} [seed]
   */
  constructor(w, h, seed = 1337) {
    this.w = w;
    this.h = h;
    this.seed = seed;
    /** @type {number[][]} */
    this.data = [];
    this.generate();
  }

  /** Deterministic pseudo-random from seed + coords */
  _hash(x, y) {
    let n = (x * 374761393 + y * 668265263 + this.seed * 1274126177) | 0;
    n = (n ^ (n >> 13)) * 1274126177;
    n = n ^ (n >> 16);
    return (n >>> 0) / 4294967296;
  }

  _smoothNoise(x, y) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const n00 = this._hash(x0, y0);
    const n10 = this._hash(x0 + 1, y0);
    const n01 = this._hash(x0, y0 + 1);
    const n11 = this._hash(x0 + 1, y0 + 1);
    const a = n00 * (1 - sx) + n10 * sx;
    const b = n01 * (1 - sx) + n11 * sx;
    return a * (1 - sy) + b * sy;
  }

  _fbm(x, y, octaves = 4) {
    let amp = 1;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += this._smoothNoise(x * freq, y * freq) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / norm;
  }

  generate() {
    this.data = [];
    const scale = 0.07;
    for (let y = 0; y < this.h; y++) {
      const row = [];
      for (let x = 0; x < this.w; x++) {
        // Base rolling hills
        let n = this._fbm(x * scale, y * scale, 5);
        // Slight ridge near mid-sides for strategic high ground
        const midY = Math.abs(y - this.h / 2) / (this.h / 2);
        n += (1 - midY) * 0.08;
        // Discrete height levels 0..MAX_HEIGHT
        let h = Math.floor(n * (CONFIG.MAX_HEIGHT + 0.99));
        h = Math.max(0, Math.min(CONFIG.MAX_HEIGHT, h));
        row.push(h);
      }
      this.data.push(row);
    }
    // Flatten river band slightly (water is height 0 conceptually for movement)
    this.flattenRiverBand();
  }

  flattenRiverBand() {
    // Actual river columns set by GridMap; here soft-dip center
    const cx = Math.floor(this.w / 2);
    for (let y = 0; y < this.h; y++) {
      for (let dx = -2; dx <= 2; dx++) {
        const x = cx + dx;
        if (x >= 0 && x < this.w) {
          this.data[y][x] = Math.min(this.data[y][x], 0);
        }
      }
    }
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[y][x];
  }

  set(x, y, h) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data[y][x] = Math.max(0, Math.min(CONFIG.MAX_HEIGHT, h | 0));
  }

  /** Raise a rectangular area by +1 (clamped). */
  raiseArea(cx, cy, half = 2) {
    for (let y = cy - half; y <= cy + half; y++) {
      for (let x = cx - half; x <= cx + half; x++) {
        this.set(x, y, this.get(x, y) + 1);
      }
    }
  }

  /**
   * Movement cost multiplier for stepping onto (x,y) from (fx,fy).
   * Returns Infinity if climb is impossible without a path/ramp.
   */
  moveCost(fx, fy, tx, ty, hasPath = false) {
    const h0 = this.get(fx, fy);
    const h1 = this.get(tx, ty);
    const dh = h1 - h0;
    if (!hasPath && dh > CONFIG.MAX_CLIMB_WITHOUT_PATH) return Infinity;
    const base = CONFIG.HEIGHT_MOVE_COST[h1] || 1;
    if (dh > 0) return base * (1 + dh * 0.25);
    if (dh < 0) return base * 0.9; // downhill slightly faster
    return base;
  }

  /** Range bonus for elevated shooters (tiles). */
  rangeBonus(height) {
    return Math.floor(height * 0.6);
  }

  serialize() {
    return { seed: this.seed, data: this.data };
  }

  static fromSerialized(obj) {
    const hm = new Heightmap(obj.data[0].length, obj.data.length, obj.seed);
    hm.data = obj.data;
    return hm;
  }
}
