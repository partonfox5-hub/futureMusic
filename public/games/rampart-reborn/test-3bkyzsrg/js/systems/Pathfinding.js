/**
 * A* pathfinding on the grid with height-aware movement costs.
 * Orthogonal only (4-dir) for classic tactical feel.
 */

import { CONFIG } from '../data/config.js';

export class Pathfinder {
  /**
   * @param {import('./GridMap.js').GridMap} map
   */
  constructor(map) {
    this.map = map;
  }

  /**
   * @param {number} sx
   * @param {number} sy
   * @param {number} gx
   * @param {number} gy
   * @param {object} [opts]
   * @param {number} [opts.owner] - friendly owner (open gates)
   * @param {boolean} [opts.ignoreWalls]
   * @param {boolean} [opts.naval] - water only
   * @returns {{x:number,y:number}[]|null}
   */
  find(sx, sy, gx, gy, opts = {}) {
    const map = this.map;
    if (!map.inBounds(sx, sy) || !map.inBounds(gx, gy)) return null;

    const key = (x, y) => y * map.w + x;
    const open = new MinHeap();
    const came = new Map();
    const gScore = new Map();
    const startK = key(sx, sy);
    gScore.set(startK, 0);
    open.push(startK, this._h(sx, sy, gx, gy));

    const closed = new Set();
    let iters = 0;
    const maxIters = map.w * map.h * 2;

    while (open.size && iters++ < maxIters) {
      const ck = open.pop();
      if (closed.has(ck)) continue;
      closed.add(ck);
      const cx = ck % map.w;
      const cy = (ck / map.w) | 0;
      if (cx === gx && cy === gy) {
        return this._reconstruct(came, ck, map.w);
      }

      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (!map.inBounds(nx, ny)) continue;
        if (!this._passable(cx, cy, nx, ny, opts)) continue;
        const nk = key(nx, ny);
        if (closed.has(nk)) continue;

        const stepCost = map.heightmap.moveCost(cx, cy, nx, ny, false);
        if (!isFinite(stepCost)) continue;

        const cell = map.get(nx, ny);
        let mult = stepCost;
        // Moat slows enemies
        if (cell.moat && cell.owner !== opts.owner) mult *= 2.5;
        if (cell.crater) mult *= 1.4;
        // Land units on open water (no bridge): 75% slower → 4× path cost
        if (
          !opts.naval &&
          cell.water &&
          cell.building !== 'bridge' &&
          cell.building !== 'dock'
        ) {
          mult *= 1 / (CONFIG.RIVER_SPEED_MULT || 0.25);
        }

        const tent = (gScore.get(ck) ?? Infinity) + mult;
        if (tent < (gScore.get(nk) ?? Infinity)) {
          came.set(nk, ck);
          gScore.set(nk, tent);
          open.push(nk, tent + this._h(nx, ny, gx, gy));
        }
      }
    }
    return null;
  }

  _h(x, y, gx, gy) {
    return Math.abs(x - gx) + Math.abs(y - gy);
  }

  _passable(fx, fy, tx, ty, opts) {
    const c = this.map.get(tx, ty);
    if (!c) return false;

    if (opts.naval) {
      return c.water || c.building === 'dock' || c.building === 'dock_ironclad' || c.building === 'bridge';
    }

    // Land units may cross water (slow) or walk bridges at full rate
    if (c.water && c.building !== 'bridge' && c.building !== 'dock' && c.building !== 'dock_ironclad') {
      if (opts.canSwim === false) return false;
      // default: land units can enter water
    }

    if (opts.ignoreWalls) return true;

    // Walls block unless open friendly gate
    if (c.wall && c.wallHp > 0) {
      if (c.building === 'gate' && c.gateOpen && c.owner === opts.owner) return true;
      if (opts.attackWalls && tx === opts.goalX && ty === opts.goalY) return true;
      return false;
    }

    // Solid buildings block (bridge/dock/moat/gate allowed)
    if (
      c.building &&
      c.building !== 'gate' &&
      c.building !== 'moat' &&
      c.building !== 'dock' &&
      c.building !== 'dock_ironclad' &&
      c.building !== 'bridge'
    ) {
      if (opts.attackBuildings && tx === opts.goalX && ty === opts.goalY) return true;
      return false;
    }

    return true;
  }

  _reconstruct(came, ck, w) {
    const path = [];
    let cur = ck;
    while (came.has(cur)) {
      path.push({ x: cur % w, y: (cur / w) | 0 });
      cur = came.get(cur);
    }
    path.push({ x: cur % w, y: (cur / w) | 0 });
    path.reverse();
    return path;
  }

  /**
   * Find nearest target tile matching predicate.
   */
  findNearest(sx, sy, pred, maxR = 40) {
    const map = this.map;
    let best = null;
    let bestD = Infinity;
    for (let y = Math.max(0, sy - maxR); y < Math.min(map.h, sy + maxR); y++) {
      for (let x = Math.max(0, sx - maxR); x < Math.min(map.w, sx + maxR); x++) {
        if (!pred(x, y, map.get(x, y))) continue;
        const d = Math.abs(x - sx) + Math.abs(y - sy);
        if (d < bestD) {
          bestD = d;
          best = { x, y };
        }
      }
    }
    return best;
  }
}

/** Binary min-heap for A*. */
class MinHeap {
  constructor() {
    this.a = []; // {k, p}
  }
  get size() {
    return this.a.length;
  }
  push(k, p) {
    this.a.push({ k, p });
    this._up(this.a.length - 1);
  }
  pop() {
    const top = this.a[0];
    const last = this.a.pop();
    if (this.a.length && last) {
      this.a[0] = last;
      this._down(0);
    }
    return top.k;
  }
  _up(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.a[p].p <= this.a[i].p) break;
      [this.a[p], this.a[i]] = [this.a[i], this.a[p]];
      i = p;
    }
  }
  _down(i) {
    const n = this.a.length;
    for (;;) {
      let s = i;
      const l = i * 2 + 1;
      const r = l + 1;
      if (l < n && this.a[l].p < this.a[s].p) s = l;
      if (r < n && this.a[r].p < this.a[s].p) s = r;
      if (s === i) break;
      [this.a[s], this.a[i]] = [this.a[i], this.a[s]];
      i = s;
    }
  }
}
