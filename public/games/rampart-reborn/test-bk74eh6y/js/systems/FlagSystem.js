/**
 * FlagSystem — flags spawn each round; capture by units in range (3s).
 * Capture allowed on own side, enemy side, or neutral banks.
 * Flags never spawn on water / river tiles.
 */

import { CONFIG } from '../data/config.js';

let _fid = 1;

export class FlagSystem {
  /**
   * @param {import('./GridMap.js').GridMap} map
   */
  constructor(map) {
    this.map = map;
    /** @type {{id:number,x:number,y:number,zone:string,owner:number,progress:object,points:number}[]} */
    this.flags = [];
  }

  /** Spawn flags for a new round. */
  spawnRoundFlags() {
    this.flags = [];
    const { min, max } = this.map.riverCols();

    for (let i = 0; i < CONFIG.FLAGS_PER_SIDE; i++) {
      this._spawnInRegion(2, min - 2, 2, this.map.h - 3, 'p0');
    }
    for (let i = 0; i < CONFIG.FLAGS_PER_SIDE; i++) {
      this._spawnInRegion(max + 2, this.map.w - 3, 2, this.map.h - 3, 'p1');
    }
    for (let i = 0; i < CONFIG.FLAGS_NEUTRAL; i++) {
      this._spawnOnRiverBank(i % 2 === 0 ? 0 : 1);
    }
  }

  _spawnOnRiverBank(preferSide) {
    const { min, max } = this.map.riverCols();
    const candidates = [];
    for (let y = 2; y < this.map.h - 2; y++) {
      for (let x = min - 1; x >= 1; x--) {
        const c = this.map.get(x, y);
        if (!c || c.water) continue;
        if (this.map.sideOf(x) === -1) continue;
        candidates.push({ x, y, side: 0 });
        break;
      }
      for (let x = max + 1; x < this.map.w - 1; x++) {
        const c = this.map.get(x, y);
        if (!c || c.water) continue;
        if (this.map.sideOf(x) === -1) continue;
        candidates.push({ x, y, side: 1 });
        break;
      }
    }
    const pool = candidates.filter((c) => c.side === preferSide);
    const use = pool.length ? pool : candidates;
    for (let attempt = 0; attempt < 60 && use.length; attempt++) {
      const pick = use[(Math.random() * use.length) | 0];
      if (this._tryPlaceFlag(pick.x, pick.y, 'neutral')) return;
    }
    this._spawnInRegion(2, this.map.w - 3, 2, this.map.h - 3, 'neutral');
  }

  _spawnInRegion(x0, x1, y0, y1, zone) {
    if (x1 < x0) return;
    for (let attempt = 0; attempt < 80; attempt++) {
      const x = (x0 + Math.floor(Math.random() * Math.max(1, x1 - x0 + 1))) | 0;
      const y = (y0 + Math.floor(Math.random() * Math.max(1, y1 - y0 + 1))) | 0;
      if (this._tryPlaceFlag(x, y, zone)) return;
    }
  }

  _tryPlaceFlag(x, y, zone) {
    const c = this.map.get(x, y);
    if (!c) return false;
    if (c.water) return false;
    if (this.map.sideOf(x) === -1) return false;
    if (c.wall || c.crater) return false;
    if (c.building && c.building !== 'moat' && c.building !== 'bridge') return false;
    if (c.moat) return false;
    if (this.flags.some((f) => Math.abs(f.x - x) + Math.abs(f.y - y) < 4)) return false;
    this.flags.push({
      id: _fid++,
      x,
      y,
      zone,
      owner: -1,
      progress: { 0: 0, 1: 0 },
      points: CONFIG.FLAG_POINTS,
    });
    return true;
  }

  /** Chebyshev distance — unit "in range" of flag */
  _inRange(u, f) {
    const r = CONFIG.FLAG_CAPTURE_RANGE ?? 1;
    return Math.max(Math.abs(u.tileX - f.x), Math.abs(u.tileY - f.y)) <= r;
  }

  /**
   * Any unit within capture range progresses capture (own or enemy side flags).
   */
  update(dt, units, avatar, onCapture, playerMods = [{}, {}]) {
    const need = CONFIG.FLAG_CAPTURE_TIME ?? 3;
    for (const f of this.flags) {
      if (f.owner === 0 || f.owner === 1) continue;

      const present = { 0: false, 1: false };
      for (const u of units) {
        if (!u.alive) continue;
        if (this._inRange(u, f)) present[u.owner] = true;
      }
      if (avatar && Math.max(Math.abs(avatar.tileX - f.x), Math.abs(avatar.tileY - f.y)) <= (CONFIG.FLAG_CAPTURE_RANGE ?? 1)) {
        present[avatar.owner] = true;
      }

      if (present[0] && present[1]) continue; // contested

      for (const p of [0, 1]) {
        if (present[p]) {
          f.progress[p] += dt;
          f.progress[1 - p] = Math.max(0, f.progress[1 - p] - dt * 0.5);
          if (f.progress[p] >= need) {
            f.owner = p;
            const mult = playerMods[p]?.flagMult || 1;
            const pts = Math.round((f.points || CONFIG.FLAG_POINTS) * mult);
            f.capturedPoints = pts;
            f.removed = true; // disappear after capture
            if (onCapture) onCapture(p, f, pts);
          }
        } else {
          f.progress[p] = Math.max(0, f.progress[p] - dt * 0.35);
        }
      }
    }
    // Drop captured flags so they vanish from the map
    if (this.flags.some((f) => f.removed)) {
      this.flags = this.flags.filter((f) => !f.removed);
    }
  }

  interact(owner, tileX, tileY) {
    const r = CONFIG.FLAG_CAPTURE_RANGE ?? 1;
    const f = this.flags.find(
      (fl) =>
        fl.owner < 0 &&
        Math.max(Math.abs(fl.x - tileX), Math.abs(fl.y - tileY)) <= r
    );
    if (!f) return false;
    f.progress[owner] += 1.0;
    return true;
  }

  /** Display points for a flag */
  displayPoints(f, playerMods = [{}, {}]) {
    if (f.owner === 0 || f.owner === 1) return f.capturedPoints || f.points || CONFIG.FLAG_POINTS;
    return f.points || CONFIG.FLAG_POINTS;
  }

  serialize() {
    return this.flags.map((f) => ({ ...f, progress: { ...f.progress } }));
  }
}
