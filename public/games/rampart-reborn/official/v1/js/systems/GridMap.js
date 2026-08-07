/**
 * GridMap — authoritative 2D cell grid for walls, buildings, ownership, water.
 * Enclosure uses flood-fill from exterior; only orthogonal connectivity counts.
 */

import { CONFIG, OWNERS } from '../data/config.js';
import { Heightmap } from './Heightmap.js';

/**
 * @typedef {object} Cell
 * @property {number} height
 * @property {number} owner - OWNERS
 * @property {boolean} wall
 * @property {number} wallHp
 * @property {number} wallMaxHp
 * @property {string|null} building - type key or null
 * @property {number} buildingHp
 * @property {number} buildingMaxHp
 * @property {number} buildingLevel - 1..5
 * @property {boolean} crater
 * @property {boolean} moat
 * @property {boolean} water - river / open water
 * @property {boolean} gateOpen
 * @property {boolean} isKeep
 * @property {number} keepOwner
 */

export class GridMap {
  /**
   * @param {number} [w]
   * @param {number} [h]
   * @param {number} [seed]
   */
  constructor(w = CONFIG.MAP_W, h = CONFIG.MAP_H, seed = Date.now() % 99999) {
    this.w = w;
    this.h = h;
    this.heightmap = new Heightmap(w, h, seed);
    this.boundaryOffset = 0;
    /** @type {Cell[][]} */
    this.cells = [];
    this._initCells();
    this.applyBoundary(0);
    this._placeStartingKeeps();
  }

  _emptyCell(x, y) {
    return {
      height: this.heightmap.get(x, y),
      owner: OWNERS.NONE,
      wall: false,
      wallHp: 0,
      wallMaxHp: CONFIG.WALL_HP,
      building: null,
      buildingHp: 0,
      buildingMaxHp: 0,
      buildingLevel: 0,
      crater: false,
      moat: false,
      water: false,
      gateOpen: false,
      isKeep: false,
      keepOwner: OWNERS.NONE,
    };
  }

  _initCells() {
    this.cells = [];
    for (let y = 0; y < this.h; y++) {
      const row = [];
      for (let x = 0; x < this.w; x++) {
        row.push(this._emptyCell(x, y));
      }
      this.cells.push(row);
    }
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x, y) {
    if (!this.inBounds(x, y)) return null;
    return this.cells[y][x];
  }

  /**
   * Apply river / boundary. offset positive = river shifts right (favor P0).
   */
  applyBoundary(offset = 0) {
    this.boundaryOffset = offset;
    const cx = CONFIG.RIVER_CENTER + offset;
    const half = Math.floor(CONFIG.RIVER_WIDTH / 2);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.cells[y][x];
        const inRiver = x >= cx - half && x <= cx + half;
        c.water = inRiver;
        if (inRiver) {
          c.height = 0;
          this.heightmap.set(x, y, 0);
          // Clear walls/buildings that would sit in river (except docks allowed later on edge)
          if (c.wall && !c.building) {
            c.wall = false;
            c.wallHp = 0;
          }
        }
      }
    }
  }

  /** Side of map: 0 left (P0), 1 right (P1), -1 river/neutral band. */
  sideOf(x) {
    const cx = CONFIG.RIVER_CENTER + this.boundaryOffset;
    const half = Math.floor(CONFIG.RIVER_WIDTH / 2);
    if (x < cx - half) return 0;
    if (x > cx + half) return 1;
    return -1;
  }

  riverCols() {
    const cx = CONFIG.RIVER_CENTER + this.boundaryOffset;
    const half = Math.floor(CONFIG.RIVER_WIDTH / 2);
    return { min: cx - half, max: cx + half };
  }

  _placeStartingKeeps() {
    // P0 home keep left, P1 home keep right
    const ky = Math.floor(this.h / 2) - 1;
    this.placeKeep(4, ky, 0, true);
    this.placeKeep(this.w - 6, ky, 1, true);
    // Extra keeps for expansion targets
    this.placeKeep(10, 6, 0, false);
    this.placeKeep(10, this.h - 8, 0, false);
    this.placeKeep(this.w - 12, 6, 1, false);
    this.placeKeep(this.w - 12, this.h - 8, 1, false);
  }

  /**
   * Place a keep footprint. home keeps start with a small enclosed starter wall.
   */
  placeKeep(x, y, owner, withStarterWall = false) {
    const def = CONFIG.BUILDINGS.keep;
    for (let dy = 0; dy < def.h; dy++) {
      for (let dx = 0; dx < def.w; dx++) {
        const c = this.get(x + dx, y + dy);
        if (!c || c.water) continue;
        c.isKeep = true;
        c.keepOwner = owner;
        c.building = 'keep';
        c.buildingHp = def.hp;
        c.buildingMaxHp = def.hp;
        c.buildingLevel = 1;
        c.owner = owner;
      }
    }
    if (withStarterWall) {
      // 8×8 ring around keep — room for keep + barracks + cannon space
      const ox = x - 3;
      const oy = y - 3;
      const size = 8;
      for (let i = 0; i < size; i++) {
        this._setWall(ox + i, oy, owner, true);
        this._setWall(ox + i, oy + size - 1, owner, true);
        this._setWall(ox, oy + i, owner, true);
        this._setWall(ox + size - 1, oy + i, owner, true);
      }
      // Clear keep / interior building footprint walls
      for (let dy = -1; dy <= def.h + 1; dy++) {
        for (let dx = -1; dx <= def.w + 2; dx++) {
          const c = this.get(x + dx, y + dy);
          if (c && !c.isKeep) {
            // only clear accidental walls inside, not the ring
            const onRing =
              x + dx === ox ||
              x + dx === ox + size - 1 ||
              y + dy === oy ||
              y + dy === oy + size - 1;
            if (!onRing && c.wall && !c.building) {
              c.wall = false;
              c.wallHp = 0;
            }
          }
        }
      }
      for (let dy = 0; dy < def.h; dy++) {
        for (let dx = 0; dx < def.w; dx++) {
          const c = this.get(x + dx, y + dy);
          if (c) {
            c.wall = false;
            c.wallHp = 0;
          }
        }
      }
      // Starter barracks inside the fort so round-1 battles have troops
      const candidates = [
        [x + 2, y],
        [x + 2, y - 1],
        [x - 2, y],
        [x, y + 2],
        [x + 2, y + 1],
        [x - 1, y + 2],
      ];
      let placed = false;
      for (const [bx, by] of candidates) {
        if (this.canPlaceBuilding('barracks', bx, by, owner)) {
          this.placeBuilding('barracks', bx, by, owner);
          placed = true;
          break;
        }
      }
      // Force stamp if placement rules blocked (guarantees soldiers spawn)
      if (!placed) {
        const bx = x + 2;
        const by = y;
        const bdef = CONFIG.BUILDINGS.barracks;
        for (let dy = 0; dy < bdef.h; dy++) {
          for (let dx = 0; dx < bdef.w; dx++) {
            const c = this.get(bx + dx, by + dy);
            if (!c || c.water || c.isKeep) continue;
            c.wall = false;
            c.wallHp = 0;
            c.building = 'barracks';
            c.buildingHp = bdef.hp;
            c.buildingMaxHp = bdef.hp;
            c.buildingLevel = 1;
            c.owner = owner;
          }
        }
      }
    }
  }

  _setWall(x, y, owner, force = false) {
    const c = this.get(x, y);
    if (!c || c.water || c.crater) return false;
    if (c.building && c.building !== 'gate') return false;
    if (c.wall && !force) return false;
    c.wall = true;
    c.wallHp = c.wallMaxHp || CONFIG.WALL_HP;
    c.wallMaxHp = c.wallMaxHp || CONFIG.WALL_HP;
    c.owner = owner;
    return true;
  }

  /**
   * Place polyomino wall cells. cells = [{x,y},...] absolute.
   * @returns {boolean}
   */
  placeWalls(cells, owner, hpBonus = 0) {
    // Validate all first
    for (const { x, y } of cells) {
      const c = this.get(x, y);
      if (!c) return false;
      if (c.water || c.crater) return false;
      if (c.wall) return false;
      if (c.building && c.building !== 'gate') return false;
      if (this.sideOf(x) !== owner && this.sideOf(x) !== -1) return false;
      // Allow wall on own side only (not deep enemy)
      if (this.sideOf(x) === 1 - owner) return false;
    }
    const maxHp = CONFIG.WALL_HP + hpBonus;
    for (const { x, y } of cells) {
      const c = this.get(x, y);
      c.wall = true;
      c.wallMaxHp = maxHp;
      c.wallHp = maxHp;
      c.owner = owner;
    }
    return true;
  }

  canPlaceBuilding(type, x, y, owner) {
    const def = CONFIG.BUILDINGS[type];
    if (!def) return false;
    for (let dy = 0; dy < def.h; dy++) {
      for (let dx = 0; dx < def.w; dx++) {
        const c = this.get(x + dx, y + dy);
        if (!c) return false;
        if (c.building || c.wall || c.crater) return false;
        if (type === 'bridge') {
          // Bridges ONLY on water
          if (!c.water) return false;
        } else if (type === 'dock') {
          // Dock must touch water (may sit on land)
        } else if (c.water) {
          return false; // walls & normal buildings cannot go over water
        }
        if (type !== 'moat' && c.moat) return false;
        const side = this.sideOf(x + dx);
        if (type === 'bridge') {
          // Bridges allowed on river band and own-side water edges
          if (side === 1 - owner) return false;
        } else if (type === 'dock') {
          if (side === 1 - owner) return false;
        } else if (side !== owner) {
          return false;
        }
      }
    }
    if (type === 'dock') {
      let touchesWater = false;
      for (let dy = -1; dy <= def.h; dy++) {
        for (let dx = -1; dx <= def.w; dx++) {
          const c = this.get(x + dx, y + dy);
          if (c && c.water) touchesWater = true;
        }
      }
      if (!touchesWater) return false;
    }
    return true;
  }

  /**
   * Place bridge polyomino on water only (not walls — walls never go on water).
   */
  placeBridges(cells, owner) {
    for (const { x, y } of cells) {
      const c = this.get(x, y);
      if (!c || !c.water || c.crater) return false;
      if (c.building || c.wall) return false;
      if (this.sideOf(x) === 1 - owner) return false;
    }
    const def = CONFIG.BUILDINGS.bridge;
    const hp = def?.hp || 45;
    for (const { x, y } of cells) {
      const c = this.get(x, y);
      c.building = 'bridge';
      c.buildingHp = hp;
      c.buildingMaxHp = hp;
      c.buildingLevel = 1;
      c.owner = owner;
      // water stays true underneath — pathing treats bridge as walkable
    }
    return true;
  }

  /** Upgrade first matching building of type for owner → newType */
  upgradeBuildingType(fromType, toType, owner) {
    let done = false;
    this.forEachBuilding(fromType, owner, (x, y) => {
      if (done) return;
      const def = CONFIG.BUILDINGS[toType];
      if (!def) return;
      const tiles = this._buildingTiles(x, y, fromType);
      for (const [tx, ty] of tiles) {
        const c = this.get(tx, ty);
        if (!c) continue;
        c.building = toType;
        c.buildingMaxHp = def.hp;
        c.buildingHp = def.hp;
        c.buildingLevel = Math.max(1, c.buildingLevel || 1);
      }
      done = true;
    });
    return done;
  }

  placeBuilding(type, x, y, owner, free = false) {
    if (!this.canPlaceBuilding(type, x, y, owner)) return false;
    const def = CONFIG.BUILDINGS[type];
    for (let dy = 0; dy < def.h; dy++) {
      for (let dx = 0; dx < def.w; dx++) {
        const c = this.get(x + dx, y + dy);
        if (type === 'moat') {
          c.moat = true;
          c.owner = owner;
          c.building = 'moat';
          c.buildingHp = def.hp;
          c.buildingMaxHp = def.hp;
          c.buildingLevel = 1;
        } else if (type === 'gate') {
          c.wall = true;
          c.building = 'gate';
          c.gateOpen = false;
          c.wallHp = def.hp;
          c.wallMaxHp = def.hp;
          c.buildingHp = def.hp;
          c.buildingMaxHp = def.hp;
          c.buildingLevel = 1;
          c.owner = owner;
        } else if (type === 'bridge') {
          c.building = 'bridge';
          c.buildingHp = def.hp;
          c.buildingMaxHp = def.hp;
          c.buildingLevel = 1;
          c.owner = owner;
        } else {
          c.building = type;
          c.buildingHp = def.hp;
          c.buildingMaxHp = def.hp;
          c.buildingLevel = 1;
          c.owner = owner;
        }
      }
    }
    return true;
  }

  /**
   * Damage wall/building at tile. Returns true if destroyed something.
   * @returns {{destroyed:boolean,points:number,kind?:string,x?:number,y?:number}}
   */
  damageTile(x, y, amount, attackerOwner = OWNERS.NONE) {
    const c = this.get(x, y);
    if (!c) return { destroyed: false, points: 0 };
    let points = 0;
    let destroyed = false;
    let kind = null;

    const victimOwner = c.owner;
    if (c.building && c.building !== 'gate' && c.building !== 'bridge') {
      c.buildingHp -= amount;
      if (c.buildingHp <= 0) {
        const wasKeep = c.isKeep;
        kind = c.building === 'cannon' ? 'cannon' : 'building';
        this._clearBuildingFootprint(x, y, c.building);
        destroyed = true;
        points = CONFIG.DESTROY_POINTS;
        if (wasKeep) points += 25;
      }
    } else if (c.building === 'bridge') {
      c.buildingHp -= amount;
      if (c.buildingHp <= 0) {
        c.building = null;
        c.buildingHp = 0;
        destroyed = true;
        kind = 'building';
        points = CONFIG.DESTROY_POINTS;
      }
    } else if (c.wall || c.building === 'gate') {
      c.wallHp -= amount;
      c.buildingHp = c.wallHp;
      if (c.wallHp <= 0) {
        c.wall = false;
        c.wallHp = 0;
        if (c.building === 'gate') {
          c.building = null;
          c.gateOpen = false;
        }
        destroyed = true;
        kind = 'wall';
        points = CONFIG.DESTROY_POINTS;
      }
    }
    return {
      destroyed,
      points,
      kind,
      x,
      y,
      owner: destroyed ? victimOwner : undefined,
    };
  }

  /** Clear multi-tile building by scanning nearby for same type owner. */
  _clearBuildingFootprint(x, y, type) {
    // Flood small area clearing this building type contiguous
    const c0 = this.get(x, y);
    if (!c0) return;
    const owner = c0.owner;
    const stack = [[x, y]];
    const seen = new Set();
    while (stack.length) {
      const [cx, cy] = stack.pop();
      const key = cx + ',' + cy;
      if (seen.has(key)) continue;
      seen.add(key);
      const c = this.get(cx, cy);
      if (!c || c.building !== type || c.owner !== owner) continue;
      const wasKeep = c.isKeep;
      c.building = null;
      c.buildingHp = 0;
      c.buildingMaxHp = 0;
      c.buildingLevel = 0;
      c.isKeep = false;
      // keepOwner retained for "ruins" reclaim? clear
      c.keepOwner = wasKeep ? c.keepOwner : OWNERS.NONE;
      if (c.moat && type === 'moat') c.moat = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        stack.push([cx + dx, cy + dy]);
      }
    }
  }

  createCrater(x, y) {
    const c = this.get(x, y);
    if (!c || c.water) return;
    c.crater = true;
    c.wall = false;
    c.wallHp = 0;
    if (c.building && c.building !== 'keep') {
      this._clearBuildingFootprint(x, y, c.building);
    }
  }

  // ─── Enclosure (classic Rampart) ───────────────────────────────────────

  /**
   * A wall blocks if it has HP and is not an open gate.
   * Orthogonal only.
   */
  isBlockingWall(x, y) {
    const c = this.get(x, y);
    if (!c) return true; // map edge acts as open exterior
    if (c.water) return false;
    if (c.building === 'gate' && c.gateOpen) return false;
    return c.wall && c.wallHp > 0;
  }

  /**
   * Flood-fill from map exterior / water / river to find non-enclosed tiles.
   * Anything not reached and not a wall is "enclosed".
   * @returns {boolean[][]} enclosed[y][x]
   */
  computeEnclosed() {
    const W = this.w;
    const H = this.h;
    const exterior = Array.from({ length: H }, () => Array(W).fill(false));
    const q = [];

    const tryPush = (x, y) => {
      if (!this.inBounds(x, y)) return;
      if (exterior[y][x]) return;
      if (this.isBlockingWall(x, y)) return;
      exterior[y][x] = true;
      q.push(x, y);
    };

    // Seed: all border tiles + all water
    for (let x = 0; x < W; x++) {
      tryPush(x, 0);
      tryPush(x, H - 1);
    }
    for (let y = 0; y < H; y++) {
      tryPush(0, y);
      tryPush(W - 1, y);
    }
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (this.cells[y][x].water) tryPush(x, y);
      }
    }

    while (q.length) {
      const y = q.pop();
      const x = q.pop();
      tryPush(x + 1, y);
      tryPush(x - 1, y);
      tryPush(x, y + 1);
      tryPush(x, y - 1);
    }

    const enclosed = Array.from({ length: H }, () => Array(W).fill(false));
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!exterior[y][x] && !this.isBlockingWall(x, y)) {
          enclosed[y][x] = true;
        }
      }
    }
    return enclosed;
  }

  /**
   * Keeps that are fully enclosed (every keep footprint tile enclosed or is wall? 
   * Classic: keep interior must be inside continuous walls).
   */
  getEnclosedKeeps(owner = null) {
    const enc = this.computeEnclosed();
    const keeps = [];
    const seen = new Set();

    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.cells[y][x];
        if (!c.isKeep || !c.building) continue;
        if (owner !== null && c.keepOwner !== owner && c.owner !== owner) continue;
        const key = `${c.owner}:${x >> 1},${y >> 1}`; // rough de-dupe
        // Better: find top-left of keep
        if (seen.has(x + ',' + y)) continue;
        // Collect footprint
        const tiles = this._buildingTiles(x, y, 'keep');
        if (!tiles.length) continue;
        tiles.forEach(([tx, ty]) => seen.add(tx + ',' + ty));
        const fully = tiles.every(([tx, ty]) => enc[ty][tx]);
        if (fully) {
          keeps.push({
            owner: c.keepOwner !== OWNERS.NONE ? c.keepOwner : c.owner,
            tiles,
            x: tiles[0][0],
            y: tiles[0][1],
            home: false,
          });
        }
      }
    }
    return keeps;
  }

  _buildingTiles(x, y, type) {
    const c0 = this.get(x, y);
    if (!c0 || c0.building !== type) return [];
    const owner = c0.owner;
    const out = [];
    const seen = new Set();
    const stack = [[x, y]];
    while (stack.length) {
      const [cx, cy] = stack.pop();
      const k = cx + ',' + cy;
      if (seen.has(k)) continue;
      seen.add(k);
      const c = this.get(cx, cy);
      if (!c || c.building !== type || c.owner !== owner) continue;
      out.push([cx, cy]);
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    return out;
  }

  /** Cannon credits: 2 for first enclosed keep + 1 per additional. */
  cannonCredits(owner) {
    const keeps = this.getEnclosedKeeps(owner);
    if (!keeps.length) return 0;
    return 2 + (keeps.length - 1);
  }

  /** Mark cannons only functional if still enclosed. */
  isEnclosedTile(x, y, enc = null) {
    const e = enc || this.computeEnclosed();
    return !!(e[y] && e[y][x]);
  }

  countEnclosedTerritory(owner) {
    const enc = this.computeEnclosed();
    let n = 0;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (enc[y][x] && this.sideOf(x) === owner) n++;
      }
    }
    return n;
  }

  /** After combat: un-enclosed buildings of certain types lose "active" status — handled by systems. */
  healKeeps(owner) {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.cells[y][x];
        if (c.isKeep && (c.owner === owner || c.keepOwner === owner) && c.building === 'keep') {
          c.buildingHp = c.buildingMaxHp;
        }
      }
    }
  }

  chipEnemyNearRiver(player, dmg) {
    const enemy = 1 - player;
    const { min, max } = this.riverCols();
    for (let y = 0; y < this.h; y++) {
      for (let x = min - 3; x <= max + 3; x++) {
        const c = this.get(x, y);
        if (!c || c.owner !== enemy) continue;
        if (c.wall) this.damageTile(x, y, dmg, player);
      }
    }
  }

  repairWallsPercent(owner, pct) {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.cells[y][x];
        if (c.owner === owner && c.wall) {
          c.wallHp = Math.min(c.wallMaxHp, c.wallHp + c.wallMaxHp * pct);
        }
      }
    }
  }

  fortifyStructures(owner, mult) {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.cells[y][x];
        if (c.owner !== owner) continue;
        if (c.wall) {
          c.wallMaxHp = Math.floor(c.wallMaxHp * mult);
          c.wallHp = Math.min(c.wallMaxHp, Math.floor(c.wallHp * mult));
        }
        if (c.building) {
          c.buildingMaxHp = Math.floor(c.buildingMaxHp * mult);
          c.buildingHp = Math.min(c.buildingMaxHp, Math.floor(c.buildingHp * mult));
        }
      }
    }
  }

  /** Iterate buildings of type for owner (top-left only). */
  forEachBuilding(type, owner, fn) {
    const seen = new Set();
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.cells[y][x];
        if (c.building !== type) continue;
        if (owner !== null && c.owner !== owner) continue;
        const tiles = this._buildingTiles(x, y, type);
        if (!tiles.length) continue;
        const k = tiles.map((t) => t.join(',')).sort()[0];
        if (seen.has(k)) continue;
        seen.add(k);
        const [tx, ty] = tiles[0];
        fn(tx, ty, c, tiles);
      }
    }
  }

  /** Sync height from heightmap into cells. */
  syncHeights() {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (!this.cells[y][x].water) {
          this.cells[y][x].height = this.heightmap.get(x, y);
        }
      }
    }
  }

  /**
   * Lightweight serialization for multiplayer sync.
   * Full grid — OK for 64x40 occasional sync.
   */
  serialize() {
    return {
      w: this.w,
      h: this.h,
      boundaryOffset: this.boundaryOffset,
      heightmap: this.heightmap.serialize(),
      cells: this.cells.map((row) =>
        row.map((c) => ({
          h: c.height,
          o: c.owner,
          w: c.wall ? 1 : 0,
          wh: c.wallHp | 0,
          wm: c.wallMaxHp | 0,
          b: c.building,
          bh: c.buildingHp | 0,
          bm: c.buildingMaxHp | 0,
          bl: c.buildingLevel | 0,
          cr: c.crater ? 1 : 0,
          m: c.moat ? 1 : 0,
          wa: c.water ? 1 : 0,
          go: c.gateOpen ? 1 : 0,
          k: c.isKeep ? 1 : 0,
          ko: c.keepOwner,
        }))
      ),
    };
  }

  static fromSerialized(data) {
    const map = new GridMap(data.w, data.h, data.heightmap?.seed || 0);
    map.heightmap = Heightmap.fromSerialized(data.heightmap);
    map.boundaryOffset = data.boundaryOffset || 0;
    for (let y = 0; y < data.h; y++) {
      for (let x = 0; x < data.w; x++) {
        const s = data.cells[y][x];
        const c = map.cells[y][x];
        c.height = s.h;
        c.owner = s.o;
        c.wall = !!s.w;
        c.wallHp = s.wh;
        c.wallMaxHp = s.wm;
        c.building = s.b;
        c.buildingHp = s.bh;
        c.buildingMaxHp = s.bm;
        c.buildingLevel = s.bl;
        c.crater = !!s.cr;
        c.moat = !!s.m;
        c.water = !!s.wa;
        c.gateOpen = !!s.go;
        c.isKeep = !!s.k;
        c.keepOwner = s.ko;
      }
    }
    return map;
  }
}
