/**
 * MapRenderer — grid-based texture stamps for terrain & structures + overlay FX.
 */

import { CONFIG } from '../data/config.js';
import { AssetFactory } from './AssetFactory.js';

const C = CONFIG.COLORS;

export class MapRenderer {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    AssetFactory.generate(scene);

    const ww = CONFIG.MAP_W * CONFIG.TILE;
    const wh = CONFIG.MAP_H * CONFIG.TILE;

    // Static-ish world layer (terrain + walls + buildings)
    this.rt = scene.add.renderTexture(0, 0, ww, wh);
    this.rt.setOrigin(0, 0);
    this.rt.setDepth(0);

    this.overlay = scene.add.graphics();
    this.overlay.setDepth(10);

    this.fx = scene.add.graphics();
    this.fx.setDepth(12);

    // Sprite pools for dynamic entities (buildings, units, projectiles, flags)
    this.buildingSprites = scene.add.group();
    this.unitSprites = scene.add.group();
    this.projSprites = scene.add.group();
    this.flagSprites = scene.add.group();
    this.flagLabels = scene.add.group();
    this.crosshairImg = scene.add.image(0, 0, 'crosshair').setDepth(15).setVisible(false);
    this.impactImg = scene.add.image(0, 0, 'impact').setDepth(14).setVisible(false);

    this._imgCache = new Map();
    this._animT = 0;
    this._lastMap = null;
    /** @type {{x:number,y:number,t:number,life:number,kind:string,parts:object[]}[]} */
    this.explosions = [];
    this._buildAnimAcc = 0;
  }

  /**
   * Spawn a small explosion (wall / building / cannon / unit).
   * Cheap particle burst for 30+ FPS.
   */
  spawnExplosion(wx, wy, kind = 'building') {
    // Cap concurrent explosions for performance
    if (this.explosions.length > 12) this.explosions.shift();
    const n = kind === 'wall' ? 6 : kind === 'cannon' ? 10 : 8;
    const parts = [];
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      const sp = 40 + Math.random() * 90;
      parts.push({
        x: wx,
        y: wy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 20,
        r: 2 + Math.random() * 3,
        life: 0.25 + Math.random() * 0.35,
        t: 0,
        col:
          kind === 'cannon'
            ? 0xffaa33
            : kind === 'wall'
              ? 0x8b7355
              : 0xff6622,
      });
    }
    this.explosions.push({ x: wx, y: wy, t: 0, life: 0.55, kind, parts });
  }

  _updateExplosions(dt) {
    const live = [];
    for (const ex of this.explosions) {
      ex.t += dt;
      if (ex.t >= ex.life) continue;
      for (const p of ex.parts) {
        p.t += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 120 * dt; // gravity
      }
      live.push(ex);
    }
    this.explosions = live;
  }

  _drawExplosions(g) {
    for (const ex of this.explosions) {
      // flash core
      const flash = 1 - ex.t / ex.life;
      if (flash > 0.5) {
        g.fillStyle(0xffee88, (flash - 0.5) * 1.2);
        g.fillCircle(ex.x, ex.y, 6 + (1 - flash) * 14);
      }
      for (const p of ex.parts) {
        if (p.t >= p.life) continue;
        const a = 1 - p.t / p.life;
        g.fillStyle(p.col, a);
        g.fillCircle(p.x, p.y, p.r * a);
      }
    }
  }

  /**
   * Stamp terrain + walls only (buildings are animated sprites on top).
   * @param {import('./GridMap.js').GridMap} map
   * @param {boolean[][]|null} enclosed
   */
  drawMap(map, enclosed = null) {
    const T = CONFIG.TILE;
    const rt = this.rt;
    rt.clear();
    this._lastMap = map;

    // Terrain
    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        const c = map.cells[y][x];
        const px = x * T;
        const py = y * T;
        let key = 'terrain_0';
        if (c.water) key = 'terrain_water';
        else if (c.crater) key = 'terrain_crater';
        else key = `terrain_${Math.min(5, c.height | 0)}`;
        if (this.scene.textures.exists(key)) {
          rt.draw(key, px, py);
        }
        if (enclosed && enclosed[y][x] && !c.water && this.scene.textures.exists('terrain_enclosed')) {
          rt.draw('terrain_enclosed', px, py);
        }
      }
    }

    // Walls & moats & gates (static — user requested walls/terrain stay as-is)
    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        const c = map.cells[y][x];
        const px = x * T;
        const py = y * T;
        if (c.moat && this.scene.textures.exists('moat')) {
          rt.draw('moat', px, py);
        }
        if (c.building === 'gate') {
          const gk = c.gateOpen ? 'gate_open' : 'gate_closed';
          if (this.scene.textures.exists(gk)) rt.draw(gk, px, py);
        } else if (c.wall && c.wallHp > 0 && c.building !== 'gate') {
          const wk =
            c.owner === 0 ? 'wall_0' : c.owner === 1 ? 'wall_1' : 'wall_n';
          if (this.scene.textures.exists(wk)) rt.draw(wk, px, py);
        }
      }
    }

    // Rebuild building sprite list from map
    this._rebuildBuildingSprites(map);
  }

  _rebuildBuildingSprites(map) {
    const T = CONFIG.TILE;
    // Hide all, then place
    this.buildingSprites.getChildren().forEach((s) => s.setVisible(false));
    const list = [];
    const visited = new Set();
    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        const c = map.cells[y][x];
        if (!c.building || c.building === 'gate' || c.building === 'moat') continue;
        if (visited.has(x + ',' + y)) continue;
        const def = CONFIG.BUILDINGS[c.building];
        const bw = def?.w || 1;
        const bh = def?.h || 1;
        if (bw > 1 || bh > 1) {
          let full = true;
          for (let dy = 0; dy < bh && full; dy++) {
            for (let dx = 0; dx < bw && full; dx++) {
              const cc = map.get(x + dx, y + dy);
              if (!cc || cc.building !== c.building || cc.owner !== c.owner) full = false;
            }
          }
          if (!full) {
            visited.add(x + ',' + y);
            continue;
          }
          for (let dy = 0; dy < bh; dy++) {
            for (let dx = 0; dx < bw; dx++) visited.add(x + dx + ',' + (y + dy));
          }
        } else {
          visited.add(x + ',' + y);
        }
        list.push({
          type: c.building,
          owner: c.owner,
          x,
          y,
          w: bw,
          h: bh,
          gateOpen: c.gateOpen,
        });
      }
    }
    while (this.buildingSprites.getLength() < list.length) {
      const img = this.scene.add.image(0, 0, 'keep_0').setDepth(5).setOrigin(0, 0);
      this.buildingSprites.add(img);
    }
    this._buildingMeta = list;
    const kids = this.buildingSprites.getChildren();
    list.forEach((b, i) => {
      const img = kids[i];
      const base = AssetFactory.buildingKey(b.type, b.owner, b.gateOpen);
      const key = this.scene.textures.exists(base + '_0') ? base + '_0' : base;
      if (this.scene.textures.exists(key)) img.setTexture(key);
      img.setVisible(true);
      img.setPosition(b.x * T, b.y * T);
      img.setDisplaySize(b.w * T, b.h * T);
      img.setData('meta', b);
    });
    for (let i = list.length; i < kids.length; i++) kids[i].setVisible(false);
  }

  _animateBuildings(dt = 1 / 60) {
    if (!this._buildingMeta) return;
    // Throttle anim swaps (~5 fps texture changes) for performance
    this._buildAnimAcc = (this._buildAnimAcc || 0) + dt;
    if (this._buildAnimAcc < 0.2) return;
    this._buildAnimAcc = 0;
    const frame = Math.floor((this._animT || 0) * 5) % 4;
    const kids = this.buildingSprites.getChildren();
    this._buildingMeta.forEach((b, i) => {
      const img = kids[i];
      if (!img || !img.visible) return;
      const base = AssetFactory.buildingKey(b.type, b.owner, b.gateOpen);
      let key = `${base}_${frame}`;
      if (!this.scene.textures.exists(key)) key = base;
      if (this.scene.textures.exists(key) && img.texture.key !== key) img.setTexture(key);
    });
  }

  /**
   * Dynamic overlay: units, flags, projectiles, ghosts, selection, HP.
   * @param {number} [dt]
   */
  drawOverlay(state, opts = {}, dt = 1 / 60) {
    const o = this.overlay;
    o.clear();
    const T = CONFIG.TILE;
    this._animT = (this._animT || 0) + dt;
    this._animateBuildings(dt);
    this._updateExplosions(dt);

    // Flags (sprite-like via graphics + texture stamp)
    this._syncFlags(state);

    // Ghost placement — tinted building preview
    if (opts.ghostCells && opts.ghostCells.length) {
      const ok = opts.ghostValid;
      const col = ok ? C.ghostOk : C.ghostBad;
      o.fillStyle(col, 0.35);
      o.lineStyle(2, col, 0.95);
      for (const cell of opts.ghostCells) {
        o.fillRect(cell.x * T, cell.y * T, T, T);
        o.strokeRect(cell.x * T + 0.5, cell.y * T + 0.5, T - 1, T - 1);
      }
      // Ghost structure icon at first cell
      if (opts.ghostKey && this.scene.textures.exists(opts.ghostKey)) {
        const g0 = opts.ghostCells[0];
        o.fillStyle(col, 0.15);
        // draw faint outline only; stamp via temporary image
        this._ghostStamp(opts.ghostKey, g0.x * T, g0.y * T, ok ? 0.55 : 0.35);
      }
    } else {
      this._clearGhostStamp();
    }

    // Box select
    if (opts.selectRect) {
      const r = opts.selectRect;
      o.lineStyle(2, C.select, 0.95);
      o.fillStyle(C.select, 0.12);
      o.fillRect(r.x, r.y, r.w, r.h);
      o.strokeRect(r.x, r.y, r.w, r.h);
    }

    // Units via sprites
    this._syncUnits(state);

    // Projectiles via sprites
    this._syncProjectiles(state);

    // Structure HP bars (walls/buildings damaged)
    if (state.map && opts.showHp !== false) {
      this._drawHpBars(state.map, o, T);
    }

    // FPS avatar
    const fps = state.fps.state();
    if (fps.active) {
      o.fillStyle(fps.role === 'wizard' ? 0xa371f7 : 0xf0c040, 1);
      o.fillCircle(fps.x, fps.y, 8);
      o.lineStyle(2, 0xffffff, 0.95);
      o.strokeCircle(fps.x, fps.y, 11);
      o.lineStyle(2, 0xffffff, 0.6);
      o.lineBetween(fps.x, fps.y, fps.aimX, fps.aimY);
      o.fillStyle(0x000, 0.55);
      o.fillRect(fps.x - 14, fps.y - 18, 28, 4);
      o.fillStyle(0xf85149, 1);
      o.fillRect(fps.x - 14, fps.y - 18, 28 * (fps.hp / fps.maxHp), 4);
    }

    // Crosshair follows cursor in battle
    if (opts.crosshair) {
      this.crosshairImg.setVisible(true);
      this.crosshairImg.setPosition(opts.crosshair.x, opts.crosshair.y);
    } else {
      this.crosshairImg.setVisible(false);
    }

    // Aim line from nearest cannon to crosshair (battle feedback)
    if (opts.aimLine) {
      o.lineStyle(1, 0xffd700, 0.45);
      o.lineBetween(opts.aimLine.x1, opts.aimLine.y1, opts.aimLine.x2, opts.aimLine.y2);
      o.fillStyle(0xffd700, 0.25);
      o.fillCircle(opts.aimLine.x2, opts.aimLine.y2, 6);
    }

    this._drawExplosions(o);
  }

  _ghostStampImg = null;
  _ghostStamp(key, x, y, alpha) {
    if (!this._ghostStampImg) {
      this._ghostStampImg = this.scene.add.image(0, 0, key).setOrigin(0, 0).setDepth(9);
    }
    if (this._ghostStampImg.texture.key !== key) this._ghostStampImg.setTexture(key);
    this._ghostStampImg.setPosition(x, y).setAlpha(alpha).setVisible(true);
  }
  _clearGhostStamp() {
    if (this._ghostStampImg) this._ghostStampImg.setVisible(false);
  }

  _syncFlags(state) {
    const T = CONFIG.TILE;
    const need = state.flags.flags.length;
    // Slightly smaller purple flags — +pts still inside cloth
    const FW = 36;
    const FH = 42;
    const frame = Math.floor((this._animT || 0) * 6) % 4;

    while (this.flagSprites.getLength() < need) {
      const img = this.scene.add.image(0, 0, 'flag_0').setDepth(8);
      img.setDisplaySize(FW, FH);
      this.flagSprites.add(img);
    }
    while (this.flagLabels.getLength() < need) {
      const txt = this.scene.add
        .text(0, 0, '', {
          fontFamily: 'Segoe UI, system-ui, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#f0e6ff',
          stroke: '#2a1040',
          strokeThickness: 4,
          align: 'center',
        })
        .setOrigin(0.5, 0.5)
        .setDepth(9);
      this.flagLabels.add(txt);
    }
    const list = this.flagSprites.getChildren();
    const labels = this.flagLabels.getChildren();
    list.forEach((img, i) => {
      const f = state.flags.flags[i];
      const label = labels[i];
      if (!f) {
        img.setVisible(false);
        if (label) label.setVisible(false);
        return;
      }
      // Animated purple flag (owner variants after capture)
      const base =
        f.owner === 0 ? 'flag_0' : f.owner === 1 ? 'flag_1' : 'flag';
      let key = `${base}_${frame}`;
      if (!this.scene.textures.exists(key)) key = base;
      if (!this.scene.textures.exists(key)) key = 'flag_0';
      if (img.texture.key !== key && this.scene.textures.exists(key)) img.setTexture(key);
      // Anchor near tile center-bottom (pole at left of sprite)
      const cx = f.x * T + T * 0.55;
      const cy = f.y * T + T * 0.35;
      img.setVisible(true);
      img.setPosition(cx, cy);
      img.setDisplaySize(FW, FH);
      img.setOrigin(0.2, 0.15);

      // Point text centered in the purple cloth panel
      if (label) {
        const pts = state.flags.displayPoints
          ? state.flags.displayPoints(f)
          : f.points || CONFIG.FLAG_POINTS;
        label.setVisible(true);
        // Cloth center relative to image origin
        label.setPosition(cx + FW * 0.28, cy + FH * 0.32);
        label.setText(`+${pts}`);
        if (f.owner === 0) {
          label.setColor('#c8d8ff');
          label.setStroke('#1a2a60', 4);
        } else if (f.owner === 1) {
          label.setColor('#ffd0e8');
          label.setStroke('#501030', 4);
        } else {
          label.setColor('#f5e6ff');
          label.setStroke('#2a1040', 4);
        }
      }
    });
    // Capture progress under flag
    const o = this.overlay;
    const needT = CONFIG.FLAG_CAPTURE_TIME || 3;
    for (const f of state.flags.flags) {
      const px = f.x * T - 4;
      const py = f.y * T + T + 2;
      const p0 = f.progress[0] / needT;
      const p1 = f.progress[1] / needT;
      const barW = T + 16;
      if (p0 > 0 && f.owner < 0) {
        o.fillStyle(0x000000, 0.45);
        o.fillRect(px, py, barW, 4);
        o.fillStyle(C.keepP0, 0.95);
        o.fillRect(px, py, barW * Math.min(1, p0), 4);
      }
      if (p1 > 0 && f.owner < 0) {
        o.fillStyle(0x000000, 0.45);
        o.fillRect(px, py + 5, barW, 4);
        o.fillStyle(C.keepP1, 0.95);
        o.fillRect(px, py + 5, barW * Math.min(1, p1), 4);
      }
    }
  }

  _syncUnits(state) {
    const alive = state.units.units.filter((u) => u.alive);
    while (this.unitSprites.getLength() < alive.length) {
      const img = this.scene.add.image(0, 0, 'unit_knight_0_0').setDepth(11);
      this.unitSprites.add(img);
    }
    const list = this.unitSprites.getChildren();
    const disp = Math.max(18, Math.floor((CONFIG.UNIT_SPRITE_SIZE || 64) * 0.35));
    list.forEach((img, i) => {
      const u = alive[i];
      if (!u) {
        img.setVisible(false);
        return;
      }
      const frame = (u.animFrame || 0) % 4;
      const base = `unit_${u.type}_${u.owner}`;
      let tex = `${base}_${frame}`;
      if (!this.scene.textures.exists(tex)) tex = `${base}_0`;
      if (!this.scene.textures.exists(tex)) tex = `unit_knight_${u.owner}_0`;
      if (!this.scene.textures.exists(tex)) tex = `unit_knight_${u.owner}`;
      if (img.texture.key !== tex && this.scene.textures.exists(tex)) img.setTexture(tex);
      img.setVisible(true);
      img.setPosition(u.x, u.y);
      img.setDisplaySize(disp, disp);
      img.setFlipX(u.facing < 0);
      img.setAlpha(1);
      if (u.selected) {
        this.overlay.lineStyle(2, C.select, 1);
        this.overlay.strokeCircle(u.x, u.y, disp * 0.55);
      }
      if (u.hp < u.maxHp) {
        this.overlay.fillStyle(0x000, 0.55);
        this.overlay.fillRect(u.x - 10, u.y - disp * 0.55, 20, 3);
        this.overlay.fillStyle(0x3fb950, 1);
        this.overlay.fillRect(u.x - 10, u.y - disp * 0.55, 20 * (u.hp / u.maxHp), 3);
      }
    });
  }

  _syncProjectiles(state) {
    const projs = state.combat.projectiles;
    while (this.projSprites.getLength() < projs.length) {
      const img = this.scene.add.image(0, 0, 'proj_ball').setDepth(13);
      this.projSprites.add(img);
    }
    const arcH = CONFIG.CANNON_ARC_HEIGHT ?? 18;
    const list = this.projSprites.getChildren();
    list.forEach((img, i) => {
      const p = projs[i];
      if (!p) {
        img.setVisible(false);
        return;
      }
      const key = p.kind === 'arrow' ? 'proj_arrow' : 'proj_ball';
      if (img.texture.key !== key) img.setTexture(key);
      // Low Rampart-style arc (sin peak mid-flight)
      const arcY = p.arc ? Math.sin(Math.min(1, Math.max(0, p.t)) * Math.PI) * arcH : 0;
      img.setVisible(true);
      img.setPosition(p.x, p.y - arcY);
      if (p.kind === 'arrow') {
        img.setRotation(Math.atan2(p.ty - p.sy, p.tx - p.sx));
        img.setScale(1);
      } else {
        img.setRotation(0);
        img.setScale(1.15);
      }
      // Subtle trail along path
      this.overlay.lineStyle(1, p.kind === 'arrow' ? 0xffe0a0 : 0x555555, 0.3);
      this.overlay.lineBetween(p.sx, p.sy, p.x, p.y - arcY * 0.4);
    });
  }

  _drawHpBars(map, o, T) {
    // Sparse: only damaged walls/buildings
    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        const c = map.cells[y][x];
        if (c.wall && c.wallHp > 0 && c.wallHp < c.wallMaxHp * 0.99) {
          const r = c.wallHp / c.wallMaxHp;
          o.fillStyle(0x000, 0.45);
          o.fillRect(x * T + 1, y * T + T - 3, T - 2, 2);
          o.fillStyle(r > 0.4 ? 0x3fb950 : 0xf85149, 1);
          o.fillRect(x * T + 1, y * T + T - 3, (T - 2) * r, 2);
        }
        // multi-tile HP once at top-left
        if (c.building && c.building !== 'gate' && c.building !== 'moat') {
          const left = map.get(x - 1, y);
          const up = map.get(x, y - 1);
          if (left && left.building === c.building && left.owner === c.owner) continue;
          if (up && up.building === c.building && up.owner === c.owner) continue;
          if (c.buildingHp < c.buildingMaxHp * 0.99) {
            const def = CONFIG.BUILDINGS[c.building];
            const w = (def?.w || 1) * T;
            const r = c.buildingHp / (c.buildingMaxHp || 1);
            o.fillStyle(0x000, 0.5);
            o.fillRect(x * T + 1, y * T + (def?.h || 1) * T - 3, w - 2, 2);
            o.fillStyle(r > 0.4 ? 0x3fb950 : 0xf85149, 1);
            o.fillRect(x * T + 1, y * T + (def?.h || 1) * T - 3, (w - 2) * r, 2);
          }
        }
      }
    }
  }

  showImpact(worldX, worldY) {
    this.impactImg.setPosition(worldX, worldY).setVisible(true).setAlpha(1).setScale(1);
    this.scene.tweens.add({
      targets: this.impactImg,
      alpha: 0,
      scale: 2.2,
      duration: 280,
      onComplete: () => this.impactImg.setVisible(false),
    });
  }

  flashTile(x, y) {
    const T = CONFIG.TILE;
    this.fx.fillStyle(0xffffff, 0.45);
    this.fx.fillRect(x * T, y * T, T, T);
    this.scene.time.delayedCall(90, () => this.fx.clear());
  }
}
