/**
 * CombatSystem — cannons, archers, catapult buildings, projectiles.
 */

import { CONFIG } from '../data/config.js';

let _pid = 1;

export class CombatSystem {
  /**
   * @param {import('./GridMap.js').GridMap} map
   * @param {import('./UnitManager.js').UnitManager} units
   */
  constructor(map, units) {
    this.map = map;
    this.units = units;
    /** @type {object[]} */
    this.projectiles = [];
    this.cooldowns = new Map(); // key building -> remaining
    this.scoreCb = null;
    /** Optional: (kind) => void — e.g. audio for cannon fire */
    this.onFireSound = null;
    this.onHitSound = null;
    this.onImpactFx = null;
    this.onExplosion = null;
    /** (victimOwner) => void when a cannon building is destroyed */
    this.onCannonLost = null;
    this.playerMods = [{}, {}];
    /**
     * When player is actively aiming (clicking), auto-fire for that owner
     * yields briefly so shots go where they clicked. Keyed by owner id.
     * value = timestamp (performance.now) until which player is "directing".
     */
    this.playerDirectUntil = { 0: 0, 1: 0 };
    this.playerClickAim = { 0: null, 1: null }; // {x,y} world

    units.projectileCb = (p) => this.spawnProjectile(p);
  }

  resetProjectiles() {
    this.projectiles = [];
    this.cooldowns.clear();
    this.playerDirectUntil = { 0: 0, 1: 0 };
    this.playerClickAim = { 0: null, 1: null };
  }

  /** Call while / when player clicks to aim cannons at a world point. */
  setPlayerAim(owner, worldX, worldY, holdMs = 350) {
    this.playerClickAim[owner] = { x: worldX, y: worldY };
    this.playerDirectUntil[owner] = performance.now() + holdMs;
  }

  clearPlayerAim(owner) {
    this.playerClickAim[owner] = null;
    this.playerDirectUntil[owner] = 0;
  }

  isPlayerDirecting(owner) {
    return performance.now() < (this.playerDirectUntil[owner] || 0);
  }

  spawnProjectile(p) {
    // Clamp target to full map bounds (own side + river + enemy side all valid)
    const mapW = this.map.w * CONFIG.TILE;
    const mapH = this.map.h * CONFIG.TILE;
    let tx = p.targetX != null ? p.targetX : (p.toTileX + 0.5) * CONFIG.TILE;
    let ty = p.targetY != null ? p.targetY : (p.toTileY + 0.5) * CONFIG.TILE;
    tx = Math.max(0, Math.min(mapW - 0.01, tx));
    ty = Math.max(0, Math.min(mapH - 0.01, ty));
    const tileX = Math.floor(tx / CONFIG.TILE);
    const tileY = Math.floor(ty / CONFIG.TILE);
    const kind = p.kind || 'cannonball';

    // Long shots: scale speed so a full-map lob arrives in ~1.25s (feels infinite range)
    let speed = p.speed || CONFIG.CANNON_PROJ_SPEED;
    if (kind === 'cannonball' || kind === 'boulder') {
      const dist = Math.hypot(tx - p.fromX, ty - p.fromY);
      const maxFlight = CONFIG.CANNON_MAX_FLIGHT ?? 1.25;
      speed = Math.max(speed, dist / maxFlight);
    }

    this.projectiles.push({
      id: _pid++,
      x: p.fromX,
      y: p.fromY,
      tx,
      ty,
      toTileX: tileX,
      toTileY: tileY,
      dmg: p.dmg,
      owner: p.owner,
      kind,
      speed,
      arc: kind === 'cannonball' || kind === 'boulder' ? 1 : 0,
      t: 0,
      life: 0,
      sx: p.fromX,
      sy: p.fromY,
    });
    if ((kind === 'cannonball' || kind === 'boulder') && this.onFireSound) {
      this.onFireSound(kind);
    }
  }

  /**
   * List every 2×2 cannon footprint owned by player (full map scan).
   * Uses visited cells so adjacent cannons aren't merged/skipped.
   * No range / side / enclosure filter — fire is purely click + reload.
   */
  _listCannons(owner) {
    const out = [];
    const def = CONFIG.BUILDINGS.cannon;
    const visited = new Set();
    const w = def.w || 2;
    const h = def.h || 2;

    for (let y = 0; y < this.map.h; y++) {
      for (let x = 0; x < this.map.w; x++) {
        if (visited.has(x + ',' + y)) continue;
        const c = this.map.cells[y][x];
        if (!c || c.building !== 'cannon' || c.owner !== owner) continue;

        // Require full w×h footprint of this owner's cannons starting at (x,y)
        let full = true;
        for (let dy = 0; dy < h && full; dy++) {
          for (let dx = 0; dx < w && full; dx++) {
            const cc = this.map.get(x + dx, y + dy);
            if (!cc || cc.building !== 'cannon' || cc.owner !== owner) full = false;
          }
        }
        if (!full) {
          // orphan fragment — mark single cell visited so we don't loop forever
          visited.add(x + ',' + y);
          continue;
        }
        for (let dy = 0; dy < h; dy++) {
          for (let dx = 0; dx < w; dx++) visited.add(x + dx + ',' + (y + dy));
        }
        const key = `cannon:${x},${y}`;
        out.push({
          x,
          y,
          cx: (x + w / 2) * CONFIG.TILE,
          cy: (y + h / 2) * CONFIG.TILE,
          key,
          ready: (this.cooldowns.get(key) || 0) <= 0,
        });
      }
    }
    return out;
  }

  /**
   * Optional ammo gate: (owner) => boolean. Set by GameState.
   * When set, must return true to allow a shot (and should decrement ammo).
   */
  tryConsumeAmmo = null;

  /**
   * Fire at exact world pixel — ANYWHERE on the map (own side, river, enemy side).
   * Infinite range. Limited by reload + shared ammo pool (cannons & ironclads).
   */
  manualFire(owner, worldX, worldY) {
    // Keep aim for visual line; fire is immediate
    this.setPlayerAim(owner, worldX, worldY, 600);

    const mapW = this.map.w * CONFIG.TILE;
    const mapH = this.map.h * CONFIG.TILE;
    const aimX = Math.max(0, Math.min(mapW - 0.01, worldX));
    const aimY = Math.max(0, Math.min(mapH - 0.01, worldY));

    const list = this._listCannons(owner);
    if (!list.length) return { ok: false, reason: 'no_cannon' };

    const ready = list.filter((c) => c.ready);
    if (!ready.length) return { ok: false, reason: 'cooldown' };

    // Ammo check (shared pool)
    if (typeof this.tryConsumeAmmo === 'function') {
      if (!this.tryConsumeAmmo(owner)) return { ok: false, reason: 'no_ammo' };
    }

    ready.sort(
      (a, b) => Math.hypot(aimX - a.cx, aimY - a.cy) - Math.hypot(aimX - b.cx, aimY - b.cy)
    );
    const best = ready[0];

    this.spawnProjectile({
      fromX: best.cx,
      fromY: best.cy,
      targetX: aimX,
      targetY: aimY,
      toTileX: Math.floor(aimX / CONFIG.TILE),
      toTileY: Math.floor(aimY / CONFIG.TILE),
      dmg: CONFIG.CANNON_DAMAGE,
      owner,
      kind: 'cannonball',
      speed: CONFIG.CANNON_PROJ_SPEED,
    });
    this.cooldowns.set(best.key, CONFIG.CANNON_COOLDOWN);
    return {
      ok: true,
      fromX: best.cx,
      fromY: best.cy,
      toX: aimX,
      toY: aimY,
    };
  }

  /** Aim-line origin: any owned ready cannon (no range gate). */
  getAimOrigin(owner, worldX, worldY) {
    const ready = this._listCannons(owner).filter((c) => c.ready);
    if (!ready.length) {
      // Show line from any cannon even if reloading
      const any = this._listCannons(owner);
      if (!any.length) return null;
      any.sort(
        (a, b) =>
          Math.hypot(worldX - a.cx, worldY - a.cy) - Math.hypot(worldX - b.cx, worldY - b.cy)
      );
      return { x: any[0].cx, y: any[0].cy };
    }
    ready.sort(
      (a, b) =>
        Math.hypot(worldX - a.cx, worldY - a.cy) - Math.hypot(worldX - b.cx, worldY - b.cy)
    );
    return { x: ready[0].cx, y: ready[0].cy };
  }

  _countActiveCannons(owner) {
    return this._listCannons(owner).length;
  }

  /**
   * Auto-fire towers each frame.
   * @param {number} dt
   * @param {boolean[][]|null} enclosedCache optional precomputed enclosure
   */
  updateAuto(dt, enclosedCache = null) {
    // Recompute enclosure at most occasionally if no cache (costly on large maps)
    if (enclosedCache) {
      this._enc = enclosedCache;
    } else {
      this._encTick = (this._encTick || 0) + dt;
      if (!this._enc || this._encTick > 0.4) {
        this._encTick = 0;
        this._enc = this.map.computeEnclosed();
      }
    }
    const enc = this._enc;

    // Tick cooldowns
    for (const [k, v] of this.cooldowns) {
      this.cooldowns.set(k, Math.max(0, v - dt));
    }

    // Cannons do NOT auto-fire. They only fire via manualFire() when the player clicks.

    // Archer towers — auto-fire at enemy units only (not walls/buildings)
    this.map.forEachBuilding('archer', null, (x, y, cell) => {
      if (!enc[y] || !enc[y][x]) return;
      const key = `archer:${x},${y}`;
      if ((this.cooldowns.get(key) || 0) > 0) return;
      const mods = this.playerMods[cell.owner] || {};
      let range =
        CONFIG.ARCHER_RANGE +
        this.map.heightmap.rangeBonus(cell.height || 0) +
        (cell.buildingLevel || 1) -
        1;
      if (mods.archerBoost) range += 3;
      // preferStructures=false → units only
      const target = this._acquireTarget(x, y, cell.owner, range, false);
      if (!target || !target.unit) return;
      const dmg = CONFIG.ARCHER_DAMAGE * (mods.archerBoost ? 1.35 : 1);
      this.spawnProjectile({
        fromX: x * CONFIG.TILE + CONFIG.TILE / 2,
        fromY: y * CONFIG.TILE + CONFIG.TILE / 2,
        toTileX: target.tx,
        toTileY: target.ty,
        targetX: target.unit.x,
        targetY: target.unit.y,
        dmg,
        owner: cell.owner,
        kind: 'arrow',
        speed: CONFIG.ARROW_SPEED,
      });
      this.cooldowns.set(key, CONFIG.ARCHER_COOLDOWN);
    });

    // Watchtowers — same: auto at enemy units only
    this.map.forEachBuilding('watchtower', null, (x, y, cell) => {
      if (!enc[y] || !enc[y][x]) return;
      const key = `wt:${x},${y}`;
      if ((this.cooldowns.get(key) || 0) > 0) return;
      const range = CONFIG.ARCHER_RANGE + 4 + this.map.heightmap.rangeBonus(cell.height || 0);
      const target = this._acquireTarget(x, y, cell.owner, range, false);
      if (!target || !target.unit) return;
      this.spawnProjectile({
        fromX: x * CONFIG.TILE + CONFIG.TILE / 2,
        fromY: y * CONFIG.TILE + CONFIG.TILE / 2,
        toTileX: target.tx,
        toTileY: target.ty,
        targetX: target.unit.x,
        targetY: target.unit.y,
        dmg: CONFIG.ARCHER_DAMAGE,
        owner: cell.owner,
        kind: 'arrow',
        speed: CONFIG.ARROW_SPEED,
      });
      this.cooldowns.set(key, CONFIG.ARCHER_COOLDOWN * 1.15);
    });

    // Static catapult buildings (if we treat catapult_maker as also firing — optional siege shot)
    // Units handle mobile catapults; maker only spawns.

    // Mason auto-repair nearby walls
    this.map.forEachBuilding('mason', null, (x, y, cell) => {
      if (!enc[y][x]) return;
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const c = this.map.get(x + dx, y + dy);
          if (c && c.wall && c.owner === cell.owner && c.wallHp < c.wallMaxHp) {
            c.wallHp = Math.min(c.wallMaxHp, c.wallHp + 3 * dt);
          }
        }
      }
    });
  }

  _acquireTarget(bx, by, owner, range, preferStructures) {
    // Prefer nearest living enemy units (incoming threats)
    let bestU = null;
    let bestD = range + 0.01;
    for (const u of this.units.units) {
      if (!u.alive || u.owner === owner) continue;
      const d = Math.hypot(u.tileX - bx, u.tileY - by);
      if (d <= range && d < bestD) {
        bestD = d;
        bestU = u;
      }
    }
    if (bestU) return { tx: bestU.tileX, ty: bestU.tileY, unit: bestU };

    if (!preferStructures) return null;

    // Enemy wall / building (siege when no units in range)
    const enemy = 1 - owner;
    let best = null;
    let bd = range + 0.01;
    for (let y = Math.max(0, by - range); y < Math.min(this.map.h, by + range + 1); y++) {
      for (let x = Math.max(0, bx - range); x < Math.min(this.map.w, bx + range + 1); x++) {
        const c = this.map.get(x, y);
        if (!c || c.owner !== enemy) continue;
        if (!(c.wall || (c.building && c.building !== 'moat'))) continue;
        const d = Math.hypot(x - bx, y - by);
        if (d < bd) {
          bd = d;
          best = { tx: x, ty: y };
        }
      }
    }
    return best;
  }

  updateProjectiles(dt) {
    const live = [];
    for (const p of this.projectiles) {
      p.life += dt;
      const dx = p.tx - p.sx;
      const dy = p.ty - p.sy;
      const dist = Math.hypot(dx, dy) || 1;
      const step = p.speed * dt;
      const prevT = p.t;
      p.t += step / dist;
      if (p.t >= 1) {
        this._impact(p);
        continue;
      }
      p.x = p.sx + dx * p.t;
      p.y = p.sy + dy * p.t;
      // Low arc whistle as shot descends past apex (t crosses 0.5)
      if (
        (p.kind === 'cannonball' || p.kind === 'boulder') &&
        !p.whistlePlayed &&
        prevT < 0.5 &&
        p.t >= 0.5
      ) {
        p.whistlePlayed = true;
        if (this.onWhistleSound) this.onWhistleSound();
      }
      live.push(p);
    }
    this.projectiles = live;
  }

  /**
   * AI (or scripted) fire: pick a ready cannon and lob at a target world point.
   * Used so enemy fires back during battle.
   */
  aiFireAt(owner, worldX, worldY) {
    return this.manualFire(owner, worldX, worldY);
  }

  /** Choose a sensible AI target (cheap — avoids full-map scans every shot). */
  pickAiTarget(owner) {
    const enemy = 1 - owner;
    // Prefer a random living enemy unit (O(n) units only)
    const foes = [];
    for (const u of this.units.units) {
      if (u.alive && u.owner === enemy) foes.push(u);
    }
    if (foes.length && Math.random() < 0.7) {
      const u = foes[(Math.random() * foes.length) | 0];
      return { x: u.x + (Math.random() - 0.5) * 24, y: u.y + (Math.random() - 0.5) * 24 };
    }
    // Sample sparse grid for structures (not full scan)
    const samples = [];
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() * this.map.w) | 0;
      const y = (Math.random() * this.map.h) | 0;
      const c = this.map.cells[y][x];
      if (c && c.owner === enemy && (c.wall || (c.building && c.building !== 'moat'))) {
        samples.push({ x, y });
      }
    }
    if (samples.length) {
      const w = samples[(Math.random() * samples.length) | 0];
      return {
        x: w.x * CONFIG.TILE + CONFIG.TILE / 2,
        y: w.y * CONFIG.TILE + CONFIG.TILE / 2,
      };
    }
    const side = enemy === 0 ? 0.2 : 0.8;
    return {
      x: this.map.w * CONFIG.TILE * side,
      y: this.map.h * CONFIG.TILE * (0.3 + Math.random() * 0.4),
    };
  }

  _impact(p) {
    // Snap impact tile from final pixel (click-accurate)
    const hitTileX = Math.floor(p.tx / CONFIG.TILE);
    const hitTileY = Math.floor(p.ty / CONFIG.TILE);
    p.toTileX = hitTileX;
    p.toTileY = hitTileY;

    // Hit units near impact point
    let hitUnit = false;
    for (const u of this.units.units) {
      if (!u.alive || u.owner === p.owner) continue;
      if (Math.hypot(u.x - p.tx, u.y - p.ty) < CONFIG.TILE * 1.1) {
        u.hp -= p.dmg;
        hitUnit = true;
        if (u.hp <= 0) {
          u.alive = false;
          if (this.scoreCb) this.scoreCb(p.owner, CONFIG.UNIT_KILL_POINTS, 'kill');
          if (this.onExplosion) {
            this.onExplosion(u.x, u.y, 'unit');
          }
        }
      }
    }
    // Always apply structure damage at impact tile (splash small)
    const res = this.map.damageTile(hitTileX, hitTileY, hitUnit ? p.dmg * 0.35 : p.dmg, p.owner);
    if (res.destroyed && this.scoreCb) {
      this.scoreCb(p.owner, res.points, 'destroy');
    }
    if (res.destroyed && this.onExplosion) {
      const wx = hitTileX * CONFIG.TILE + CONFIG.TILE / 2;
      const wy = hitTileY * CONFIG.TILE + CONFIG.TILE / 2;
      this.onExplosion(wx, wy, res.kind || 'building');
    }
    if (res.destroyed && res.kind === 'cannon' && this.onCannonLost != null) {
      this.onCannonLost(res.owner);
    }
    if (p.kind === 'boulder' && Math.random() < 0.35) {
      this.map.createCrater(hitTileX, hitTileY);
    }
    if (this.onImpactFx) this.onImpactFx(p.tx, p.ty);
    if (this.onHitSound && (p.kind === 'cannonball' || p.kind === 'boulder')) {
      this.onHitSound(p.kind);
    }
  }

  onStructureHit(tx, ty, owner, res) {
    if (res?.destroyed && this.scoreCb) this.scoreCb(owner, res.points, 'destroy');
    if (res?.destroyed && this.onExplosion) {
      this.onExplosion(
        tx * CONFIG.TILE + CONFIG.TILE / 2,
        ty * CONFIG.TILE + CONFIG.TILE / 2,
        res.kind || 'building'
      );
    }
    if (res?.destroyed && res.kind === 'cannon' && this.onCannonLost != null) {
      this.onCannonLost(res.owner);
    }
  }

  onUnitKill(owner, foe) {
    if (this.scoreCb) this.scoreCb(owner, CONFIG.UNIT_KILL_POINTS, 'kill');
  }

  update(dt, enclosedCache = null) {
    this.updateAuto(dt, enclosedCache);
    this.updateProjectiles(dt);
  }
}
