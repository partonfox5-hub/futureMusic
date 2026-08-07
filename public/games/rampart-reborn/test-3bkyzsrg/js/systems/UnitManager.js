/**
 * UnitManager — knights, catapults, ships, grunts + lightweight AI orders.
 */

import { CONFIG, OWNERS } from '../data/config.js';
import { Pathfinder } from './Pathfinding.js';

let _uid = 1;

export class Unit {
  constructor(opts) {
    this.id = _uid++;
    this.type = opts.type; // knight | catapult | ship | grunt | avatar
    this.owner = opts.owner;
    this.x = opts.x; // pixel
    this.y = opts.y;
    this.tx = Math.floor(opts.x / CONFIG.TILE);
    this.ty = Math.floor(opts.y / CONFIG.TILE);
    this.hp = opts.hp;
    this.maxHp = opts.hp;
    this.dmg = opts.dmg;
    this.speed = opts.speed;
    this.path = [];
    this.pathI = 0;
    this.attackCd = 0;
    this.target = null; // unit id or {tileX,tileY,kind}
    this.order = 'idle'; // idle | move | attack | capture | attack_walls
    this.selected = false;
    this.alive = true;
    this.captureProgress = 0;
    this.radius = opts.radius || 6;
    this.animFrame = 0;
    this.animTime = 0;
    this.facing = 1; // 1 right, -1 left
    this.cannonCd = 0; // ironclad ship gun
    this.naval = opts.naval || false;
  }

  get tileX() {
    return Math.floor(this.x / CONFIG.TILE);
  }
  get tileY() {
    return Math.floor(this.y / CONFIG.TILE);
  }

  get isNaval() {
    return this.naval || this.type === 'ship' || this.type === 'ironclad';
  }
}

export class UnitManager {
  /**
   * @param {import('./GridMap.js').GridMap} map
   * @param {import('./FlagSystem.js').FlagSystem} [flags]
   */
  constructor(map, flags = null) {
    this.map = map;
    this.flags = flags;
    this.pathfinder = new Pathfinder(map);
    /** @type {Unit[]} */
    this.units = [];
    /** spawn timers per building key */
    this.spawnTimers = new Map();
    this.projectileCb = null; // set by combat
  }

  setFlags(flags) {
    this.flags = flags;
  }

  clear() {
    this.units = [];
    this.spawnTimers.clear();
  }

  spawn(type, owner, tileX, tileY, mods = {}) {
    const px = tileX * CONFIG.TILE + CONFIG.TILE / 2;
    const py = tileY * CONFIG.TILE + CONFIG.TILE / 2;
    const dmgMult = mods.unitDmgMult || 1;
    let u;
    switch (type) {
      case 'knight':
        u = new Unit({
          type,
          owner,
          x: px,
          y: py,
          hp: CONFIG.KNIGHT_HP,
          dmg: CONFIG.KNIGHT_DMG * dmgMult,
          speed: CONFIG.KNIGHT_SPEED,
          radius: 5,
        });
        break;
      case 'catapult':
        u = new Unit({
          type,
          owner,
          x: px,
          y: py,
          hp: CONFIG.CAT_UNIT_HP,
          dmg: CONFIG.CAT_UNIT_DMG * dmgMult,
          speed: CONFIG.CAT_UNIT_SPEED,
          radius: 7,
        });
        break;
      case 'ship':
        u = new Unit({
          type,
          owner,
          x: px,
          y: py,
          hp: CONFIG.SHIP_HP,
          dmg: CONFIG.SHIP_DMG * dmgMult,
          speed: CONFIG.SHIP_SPEED,
          radius: 8,
          naval: true,
        });
        break;
      case 'ironclad':
        u = new Unit({
          type,
          owner,
          x: px,
          y: py,
          hp: CONFIG.IRONCLAD_HP,
          dmg: CONFIG.IRONCLAD_DMG * dmgMult,
          speed: CONFIG.IRONCLAD_SPEED,
          radius: 9,
          naval: true,
        });
        break;
      case 'royal_knight':
        u = new Unit({
          type,
          owner,
          x: px,
          y: py,
          hp: CONFIG.ROYAL_KNIGHT_HP,
          dmg: CONFIG.ROYAL_KNIGHT_DMG * dmgMult,
          speed: CONFIG.ROYAL_KNIGHT_SPEED,
          radius: 6,
        });
        break;
      case 'grunt':
        u = new Unit({
          type,
          owner,
          x: px,
          y: py,
          hp: CONFIG.GRUNT_HP,
          dmg: CONFIG.GRUNT_DMG * dmgMult,
          speed: 40,
          radius: 5,
        });
        break;
      default:
        return null;
    }
    this.units.push(u);
    return u;
  }

  getById(id) {
    return this.units.find((u) => u.id === id && u.alive);
  }

  selected(owner = null) {
    return this.units.filter((u) => u.alive && u.selected && (owner === null || u.owner === owner));
  }

  selectInRect(x1, y1, x2, y2, owner) {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    for (const u of this.units) {
      if (!u.alive || u.owner !== owner) {
        if (u.owner === owner) u.selected = false;
        continue;
      }
      u.selected = u.x >= minX && u.x <= maxX && u.y >= minY && u.y <= maxY;
    }
  }

  selectAt(px, py, owner) {
    let hit = null;
    for (const u of this.units) {
      if (!u.alive || u.owner !== owner) continue;
      const d = Math.hypot(u.x - px, u.y - py);
      if (d < u.radius + 6) {
        hit = u;
        break;
      }
    }
    for (const u of this.units) {
      if (u.owner === owner) u.selected = u === hit;
    }
    return hit;
  }

  clearSelection(owner) {
    for (const u of this.units) {
      if (u.owner === owner) u.selected = false;
    }
  }

  orderMove(units, tileX, tileY) {
    for (const u of units) {
      const path = this.pathfinder.find(u.tileX, u.tileY, tileX, tileY, {
        owner: u.owner,
        naval: u.isNaval,
        canSwim: !u.isNaval, // land units may cross water slowly
      });
      u.path = path || [];
      u.pathI = 0;
      u.order = 'move';
      u.target = { tileX, tileY, kind: 'move' };
      u.captureProgress = 0;
    }
  }

  orderAttackMove(units, tileX, tileY) {
    this.orderMove(units, tileX, tileY);
    for (const u of units) u.order = 'attack';
  }

  orderNearestFlag(units) {
    if (!this.flags) return;
    for (const u of units) {
      let best = null;
      let bestD = Infinity;
      for (const f of this.flags.flags) {
        if (f.owner === u.owner) continue;
        const d = Math.abs(f.x - u.tileX) + Math.abs(f.y - u.tileY);
        if (d < bestD) {
          bestD = d;
          best = f;
        }
      }
      if (best) {
        this.orderMove([u], best.x, best.y);
        u.order = 'capture';
        u.target = { tileX: best.x, tileY: best.y, kind: 'flag', flagId: best.id };
      }
    }
  }

  orderAttackWalls(units) {
    for (const u of units) {
      const enemy = 1 - u.owner;
      const t = this.pathfinder.findNearest(
        u.tileX,
        u.tileY,
        (x, y, c) => c && c.owner === enemy && (c.wall || (c.building && c.building !== 'moat')),
        50
      );
      if (t) {
        // Path to adjacent tile
        const adj = this._adjacentPassable(t.x, t.y, u);
        if (adj) {
          this.orderMove([u], adj.x, adj.y);
          u.order = 'attack_walls';
          u.target = { tileX: t.x, tileY: t.y, kind: 'structure' };
        }
      }
    }
  }

  _adjacentPassable(tx, ty, u) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]]) {
      const x = tx + dx;
      const y = ty + dy;
      const c = this.map.get(x, y);
      if (!c) continue;
      if (u.type === 'ship') {
        if (c.water) return { x, y };
      } else if (!c.water && !(c.wall && c.wallHp > 0)) {
        return { x, y };
      }
    }
    return { x: tx, y: ty };
  }

  /**
   * Building production tick.
   * @param {number} dt
   * @param {object[]} playerMods - mods per player
   * @param {boolean[][]} enclosed
   */
  /**
   * Scan grid for production buildings (more reliable than forEachBuilding footprint quirks).
   */
  _eachProducer(type, fn) {
    const def = CONFIG.BUILDINGS[type];
    const bw = def?.w || 2;
    const bh = def?.h || 2;
    const visited = new Set();
    for (let y = 0; y < this.map.h; y++) {
      for (let x = 0; x < this.map.w; x++) {
        if (visited.has(x + ',' + y)) continue;
        const c = this.map.cells[y][x];
        if (!c || c.building !== type) continue;
        // footprint origin
        let full = true;
        for (let dy = 0; dy < bh && full; dy++) {
          for (let dx = 0; dx < bw && full; dx++) {
            const cc = this.map.get(x + dx, y + dy);
            if (!cc || cc.building !== type || cc.owner !== c.owner) full = false;
          }
        }
        if (!full) {
          // 1×1 or fragment — still produce from this cell
          if ((bw === 1 && bh === 1) || c.building === type) {
            visited.add(x + ',' + y);
            fn(x, y, c);
          }
          continue;
        }
        for (let dy = 0; dy < bh; dy++) {
          for (let dx = 0; dx < bw; dx++) visited.add(x + dx + ',' + (y + dy));
        }
        fn(x, y, c);
      }
    }
  }

  /** Find a free tile near a building to spawn a unit. */
  _spawnTileNear(x, y, w, h, naval) {
    const offsets = [
      [w, 0],
      [0, h],
      [w, h],
      [-1, 0],
      [0, -1],
      [w, -1],
      [-1, h],
      [Math.floor(w / 2), h + 1],
      [w + 1, Math.floor(h / 2)],
    ];
    for (const [dx, dy] of offsets) {
      const sx = x + dx;
      const sy = y + dy;
      const c = this.map.get(sx, sy);
      if (!c) continue;
      if (c.wall && c.wallHp > 0) continue;
      if (c.building && c.building !== 'bridge' && c.building !== 'gate' && c.building !== 'moat') {
        continue;
      }
      if (naval) {
        if (c.water || c.building === 'dock' || c.building === 'dock_ironclad' || c.building === 'bridge') {
          return { x: sx, y: sy };
        }
      } else {
        // land units: prefer non-water, but allow bridge
        if (!c.water || c.building === 'bridge') return { x: sx, y: sy };
      }
    }
    // fallback: building center
    return { x: x + Math.max(0, w - 1), y: y + Math.max(0, h - 1) };
  }

  tickSpawns(dt, playerMods, enclosed) {
    const spawnTypes = [
      { building: 'barracks', unit: 'knight', rate: CONFIG.KNIGHT_SPAWN_RATE || 4 },
      { building: 'jousting', unit: 'royal_knight', rate: (CONFIG.KNIGHT_SPAWN_RATE || 4) * 0.85 },
      { building: 'catapult_maker', unit: 'catapult', rate: CONFIG.CAT_SPAWN_RATE },
      // Ships / ironclads ONLY from docks the player actually placed (or upgraded)
      { building: 'dock', unit: 'ship', rate: 12, requiresPlacedDock: true },
      { building: 'dock_ironclad', unit: 'ironclad', rate: 16, requiresPlacedDock: true },
    ];

    for (const st of spawnTypes) {
      this._eachProducer(st.building, (x, y, cell) => {
        const isDock = st.building === 'dock' || st.building === 'dock_ironclad';
        const def = CONFIG.BUILDINGS[st.building] || { w: 2, h: 2 };
        // Soft enclosure: docks always; others need enclosure OR any own keep still viable
        if (!isDock && enclosed) {
          const tileEnc = enclosed[y] && enclosed[y][x];
          if (!tileEnc) {
            // still allow if player has at least one enclosed keep (fort under siege)
            const keeps = this.map.getEnclosedKeeps?.(cell.owner) || [];
            if (!keeps.length) return;
          }
        }

        const key = `${st.building}:${x},${y}`;
        let t = this.spawnTimers.get(key) || 0;
        const mods = (playerMods && playerMods[cell.owner]) || {};
        const mult = mods.spawnMult || 1;
        const rate = Math.max(2.5, st.rate / mult);
        t += dt;
        if (t >= rate) {
          t = 0;
          const count = this.units.filter((u) => u.alive && u.owner === cell.owner).length;
          if (count < 40) {
            const naval = st.unit === 'ship' || st.unit === 'ironclad';
            const pos = this._spawnTileNear(x, y, def.w || 2, def.h || 2, naval);
            const u = this.spawn(st.unit, cell.owner, pos.x, pos.y, mods);
            // Auto-order new troops toward nearest flag / enemy
            if (u && !naval) {
              this.orderNearestFlag([u]);
              if (!u.path?.length) this.orderAttackWalls([u]);
            }
          }
        }
        this.spawnTimers.set(key, t);
      });
    }
  }

  /**
   * Main unit simulation.
   */
  update(dt, combat, playerMods) {
    for (const u of this.units) {
      if (!u.alive) continue;
      u.attackCd = Math.max(0, u.attackCd - dt);
      u.cannonCd = Math.max(0, u.cannonCd - dt);

      // Moat damage to enemies
      const cell = this.map.get(u.tileX, u.tileY);
      if (cell && cell.moat && cell.owner !== u.owner) {
        u.hp -= 4 * dt;
      }

      // Move along path
      if (u.path && u.pathI < u.path.length) {
        const node = u.path[u.pathI];
        const tx = node.x * CONFIG.TILE + CONFIG.TILE / 2;
        const ty = node.y * CONFIG.TILE + CONFIG.TILE / 2;
        const dx = tx - u.x;
        const dy = ty - u.y;
        const dist = Math.hypot(dx, dy);
        const hCost = this.map.heightmap.moveCost(u.tileX, u.tileY, node.x, node.y);
        let spd = u.speed / (isFinite(hCost) ? hCost : 2);
        // Land units on open water (no bridge): 75% slower
        const destCell = this.map.get(node.x, node.y);
        if (
          !u.isNaval &&
          destCell &&
          destCell.water &&
          destCell.building !== 'bridge' &&
          destCell.building !== 'dock' &&
          destCell.building !== 'dock_ironclad'
        ) {
          spd *= CONFIG.RIVER_SPEED_MULT ?? 0.25;
        }
        if (dist < 2) {
          u.pathI++;
          u.x = tx;
          u.y = ty;
        } else {
          if (dx !== 0) u.facing = dx > 0 ? 1 : -1;
          u.x += (dx / dist) * spd * dt;
          u.y += (dy / dist) * spd * dt;
          // Walk animation (4 frames @ UNIT_ANIM_FPS)
          u.animTime += dt;
          const fps = CONFIG.UNIT_ANIM_FPS || 8;
          if (u.animTime >= 1 / fps) {
            u.animTime = 0;
            u.animFrame = (u.animFrame + 1) % 4;
          }
        }
      }

      // Orders
      if (u.order === 'capture' && u.target?.kind === 'flag' && this.flags) {
        const f = this.flags.flags.find((fl) => fl.id === u.target.flagId);
        if (f && f.x === u.tileX && f.y === u.tileY) {
          // FlagSystem handles capture ticks
        }
      }

      // Auto-acquire enemy units in melee range
      if (u.attackCd <= 0 && u.type !== 'ship') {
        const foe = this._nearestEnemy(u, u.type === 'catapult' ? 5 : 1.2);
        if (foe) {
          this._strike(u, foe, combat);
        } else if (u.order === 'attack_walls' && u.target?.kind === 'structure') {
          const d = Math.abs(u.tileX - u.target.tileX) + Math.abs(u.tileY - u.target.tileY);
          if (d <= 1.5) {
            const dmg = u.dmg * (u.type === 'catapult' ? 1.5 : 1);
            const res = this.map.damageTile(u.target.tileX, u.target.tileY, dmg, u.owner);
            u.attackCd = u.type === 'catapult' ? 2.2 : 0.8;
            if (combat?.onStructureHit) combat.onStructureHit(u.target.tileX, u.target.tileY, u.owner, res);
          }
        }
      }

      // Ships fire at nearest shore structure
      if (u.type === 'ship' && u.attackCd <= 0) {
        const t = this.pathfinder.findNearest(
          u.tileX,
          u.tileY,
          (x, y, c) => c && c.owner === 1 - u.owner && (c.wall || c.building),
          14
        );
        if (t && Math.hypot(t.x - u.tileX, t.y - u.tileY) < 12) {
          if (this.projectileCb) {
            this.projectileCb({
              fromX: u.x,
              fromY: u.y,
              toTileX: t.x,
              toTileY: t.y,
              targetX: t.x * CONFIG.TILE + CONFIG.TILE / 2,
              targetY: t.y * CONFIG.TILE + CONFIG.TILE / 2,
              dmg: u.dmg,
              owner: u.owner,
              kind: 'cannonball',
            });
          }
          u.attackCd = 2.5;
        }
      }

      // Ironclads: ship guns share the player's cannon ammo pool
      if (u.type === 'ironclad' && u.cannonCd <= 0 && this.projectileCb) {
        const spend = () =>
          typeof this.tryConsumeAmmo === 'function' ? this.tryConsumeAmmo(u.owner) : true;

        let best = null;
        let bestD = Infinity;
        for (const o of this.units) {
          if (!o.alive || o.owner === u.owner) continue;
          const d = Math.hypot(o.x - u.x, o.y - u.y);
          if (d < bestD) {
            bestD = d;
            best = o;
          }
        }
        let targetX;
        let targetY;
        let toTileX;
        let toTileY;
        if (best) {
          targetX = best.x;
          targetY = best.y;
          toTileX = best.tileX;
          toTileY = best.tileY;
        } else {
          const t = this.pathfinder.findNearest(
            u.tileX,
            u.tileY,
            (x, y, c) => c && c.owner === 1 - u.owner && (c.wall || c.building),
            40
          );
          if (!t) {
            u.cannonCd = 1;
          } else {
            toTileX = t.x;
            toTileY = t.y;
            targetX = t.x * CONFIG.TILE + CONFIG.TILE / 2;
            targetY = t.y * CONFIG.TILE + CONFIG.TILE / 2;
          }
        }
        if (targetX != null) {
          if (!spend()) {
            u.cannonCd = 1.2; // out of ammo — check back later
          } else {
            this.projectileCb({
              fromX: u.x,
              fromY: u.y,
              toTileX,
              toTileY,
              targetX,
              targetY,
              dmg: CONFIG.CANNON_DAMAGE * 0.85,
              owner: u.owner,
              kind: 'cannonball',
            });
            u.cannonCd = CONFIG.IRONCLAD_CANNON_CD || 2.8;
          }
        }
      }

      if (u.hp <= 0) {
        u.alive = false;
      }
    }

    // Prune dead occasionally
    if (this.units.length > 80) {
      this.units = this.units.filter((u) => u.alive);
    }
  }

  _nearestEnemy(u, rangeTiles) {
    let best = null;
    let bestD = rangeTiles * CONFIG.TILE;
    for (const o of this.units) {
      if (!o.alive || o.owner === u.owner) continue;
      const d = Math.hypot(o.x - u.x, o.y - u.y);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    return best;
  }

  _strike(u, foe, combat) {
    foe.hp -= u.dmg;
    u.attackCd = 0.7;
    if (foe.hp <= 0) {
      foe.alive = false;
      if (combat?.onUnitKill) combat.onUnitKill(u.owner, foe);
    }
  }

  /**
   * AI: send idle units toward flags or walls.
   */
  aiDirect(owner, aggression = 0.6) {
    const idle = this.units.filter((u) => u.alive && u.owner === owner && (!u.path || u.pathI >= u.path.length));
    for (const u of idle) {
      if (Math.random() < aggression) {
        if (Math.random() < 0.55) this.orderNearestFlag([u]);
        else this.orderAttackWalls([u]);
      }
    }
  }

  /**
   * Single-player: occasional land grunts only.
   * Boats/ships never free-spawn — only from player-placed docks (or ironclad yards).
   */
  spawnWaveThreat(dt, state) {
    state.waveTimer = (state.waveTimer || 0) + dt;
    if (state.waveTimer < 10) return;
    state.waveTimer = 0;
    const side = 1; // AI is P1
    // No ships without a dock — AI must place docks to get boats
    if (Math.random() < 0.45) {
      const y = 2 + Math.floor(Math.random() * (this.map.h - 4));
      const { min } = this.map.riverCols();
      this.spawn('grunt', side, min - 1, y);
    }
  }

  serialize() {
    return this.units.filter((u) => u.alive).map((u) => ({
      id: u.id,
      type: u.type,
      owner: u.owner,
      x: u.x,
      y: u.y,
      hp: u.hp,
      maxHp: u.maxHp,
      order: u.order,
    }));
  }
}
