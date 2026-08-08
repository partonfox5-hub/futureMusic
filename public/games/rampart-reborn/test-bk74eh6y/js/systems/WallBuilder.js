/**
 * WallBuilder — polyomino generation, rotation, ghost placement validation.
 */

import { POLYOMINOES, CONFIG } from '../data/config.js';

export class WallBuilder {
  /**
   * @param {import('./GridMap.js').GridMap} map
   */
  constructor(map) {
    this.map = map;
    this.current = null; // { shape: [ [dx,dy],... ], owner, hpBonus }
    this.gx = 0;
    this.gy = 0;
    this.piecesLeft = 0;
    this.mode = 'wall'; // 'wall' | 'bridge' | building type key
    this.pendingBuilding = null;
  }

  startPhase(owner, pieceCount, hpBonus = 0) {
    this.owner = owner;
    this.piecesLeft = pieceCount;
    this.hpBonus = hpBonus;
    this.mode = 'wall';
    this.pendingBuilding = null;
    this.nextPiece();
  }

  /** True when placing wall or bridge polyominoes (RMB rotates). */
  isPolyominoMode() {
    return this.mode === 'wall' || this.mode === 'bridge';
  }

  nextPiece() {
    if (this.piecesLeft <= 0) {
      this.current = null;
      return null;
    }
    const shape = POLYOMINOES[Math.floor(Math.random() * POLYOMINOES.length)].map(([x, y]) => [x, y]);
    this.current = { shape, owner: this.owner, hpBonus: this.hpBonus };
    // Center near player's keep area
    const side = this.owner;
    this.gx = side === 0 ? 8 : this.map.w - 12;
    this.gy = Math.floor(this.map.h / 2) - 2;
    return this.current;
  }

  rotate(dir = 1) {
    if (!this.current || !this.isPolyominoMode()) return;
    const s = this.current.shape;
    // Rotate 90° CW or CCW around origin
    this.current.shape = s.map(([x, y]) => (dir > 0 ? [-y, x] : [y, -x]));
    // Normalize to min 0,0
    let minX = Infinity;
    let minY = Infinity;
    for (const [x, y] of this.current.shape) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
    }
    this.current.shape = this.current.shape.map(([x, y]) => [x - minX, y - minY]);
  }

  setGhostTile(tx, ty) {
    this.gx = tx;
    this.gy = ty;
  }

  /** Absolute cells for current wall/bridge piece or building footprint. */
  ghostCells() {
    if (!this.isPolyominoMode() && this.pendingBuilding) {
      const def = CONFIG.BUILDINGS[this.pendingBuilding];
      if (!def) return [];
      const cells = [];
      for (let dy = 0; dy < def.h; dy++) {
        for (let dx = 0; dx < def.w; dx++) {
          cells.push({ x: this.gx + dx, y: this.gy + dy });
        }
      }
      return cells;
    }
    if (!this.current) return [];
    return this.current.shape.map(([dx, dy]) => ({
      x: this.gx + dx,
      y: this.gy + dy,
    }));
  }

  /** Spend-point cost of current wall/bridge ghost (1 per segment). */
  wallCost(cells = null) {
    if (!this.isPolyominoMode()) return 0;
    const c = cells || this.ghostCells();
    const per =
      this.mode === 'bridge'
        ? CONFIG.BRIDGE_SEGMENT_COST ?? 1
        : CONFIG.WALL_SEGMENT_COST ?? 1;
    return c.length * per;
  }

  ghostValid(spendPoints = Infinity) {
    if (!this.isPolyominoMode() && this.pendingBuilding) {
      return this.map.canPlaceBuilding(this.pendingBuilding, this.gx, this.gy, this.owner);
    }
    const cells = this.ghostCells();
    if (!cells.length) return false;
    if (spendPoints < this.wallCost(cells)) return false;

    if (this.mode === 'bridge') {
      for (const { x, y } of cells) {
        const c = this.map.get(x, y);
        if (!c || !c.water || c.crater) return false;
        if (c.wall || c.building) return false;
        if (this.map.sideOf(x) === 1 - this.owner) return false;
      }
      return true;
    }

    // Walls — never on water
    for (const { x, y } of cells) {
      const c = this.map.get(x, y);
      if (!c) return false;
      if (c.water || c.crater) return false;
      if (c.wall) return false;
      if (c.building && c.building !== 'gate') return false;
      if (this.map.sideOf(x) === 1 - this.owner) return false;
      if (this.map.sideOf(x) === -1) return false;
    }
    return true;
  }

  /**
   * @param {number} [spendPoints]
   */
  tryPlace(spendPoints = Infinity) {
    if (!this.isPolyominoMode() && this.pendingBuilding) {
      const ok = this.map.placeBuilding(this.pendingBuilding, this.gx, this.gy, this.owner);
      if (ok) {
        this.pendingBuilding = null;
        this.mode = 'wall';
      }
      return ok;
    }
    if (!this.current || this.piecesLeft <= 0) return false;
    const cells = this.ghostCells();
    const cost = this.wallCost(cells);
    if (spendPoints < cost) return false;
    let ok = false;
    if (this.mode === 'bridge') {
      ok = this.map.placeBridges(cells, this.owner);
    } else {
      ok = this.map.placeWalls(cells, this.owner, this.hpBonus);
    }
    if (ok) {
      this.lastWallCost = cost;
      this.piecesLeft--;
      this.nextPiece();
    }
    return ok;
  }

  skipPiece() {
    if (!this.isPolyominoMode() || this.piecesLeft <= 0) return;
    this.piecesLeft--;
    this.nextPiece();
  }

  selectBuilding(type) {
    if (!type || type === 'wall') {
      this.mode = 'wall';
      this.pendingBuilding = null;
      return;
    }
    if (type === 'bridge') {
      this.mode = 'bridge';
      this.pendingBuilding = null;
      if (!this.current) this.nextPiece();
      return;
    }
    this.mode = 'building';
    this.pendingBuilding = type;
  }

  /**
   * Simple AI wall placement — tries to ring open gaps near keeps.
   * @param {number} maxTries
   * @param {number} [spendPoints]
   * @returns {{placed:boolean,cost:number}}
   */
  aiPlaceBest(maxTries = 40, spendPoints = Infinity) {
    if (!this.current || this.piecesLeft <= 0) return { placed: false, cost: 0 };
    const owner = this.owner;
    // Prefer positions around first keep
    let targets = [];
    this.map.forEachBuilding('keep', owner, (x, y) => {
      targets.push({ x: x - 2, y: y - 2 });
    });
    if (!targets.length) {
      targets.push({
        x: owner === 0 ? 6 : this.map.w - 14,
        y: Math.floor(this.map.h / 2) - 3,
      });
    }

    for (let t = 0; t < maxTries; t++) {
      const base = targets[t % targets.length];
      const ox = base.x + Math.floor(Math.random() * 10) - 3;
      const oy = base.y + Math.floor(Math.random() * 10) - 3;
      for (let r = 0; r < 4; r++) {
        this.gx = ox;
        this.gy = oy;
        if (this.ghostValid(spendPoints)) {
          const cost = this.wallCost();
          if (this.tryPlace(spendPoints)) return { placed: true, cost: this.lastWallCost || cost };
        }
        this.rotate(1);
      }
    }
    // skip if can't place (no refund — piece discarded)
    this.skipPiece();
    return { placed: false, cost: 0 };
  }
}

/**
 * Rotate shape utility exported for tests / multiplayer.
 */
export function rotateShape(shape, dir = 1) {
  let s = shape.map(([x, y]) => (dir > 0 ? [-y, x] : [y, -x]));
  let minX = Infinity;
  let minY = Infinity;
  for (const [x, y] of s) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
  }
  return s.map(([x, y]) => [x - minX, y - minY]);
}
