/**
 * FPSController — simplified first-person/action mode during battle.
 * Uses top-down avatar with "FPS overlay" feel: WASD move, mouse aim, spells/melee.
 * TODO: Optional Three.js first-person camera projecting heightmap (expansion point).
 */

import { CONFIG } from '../data/config.js';

export class FPSController {
  /**
   * @param {import('./GridMap.js').GridMap} map
   * @param {import('./UnitManager.js').UnitManager} units
   * @param {import('./FlagSystem.js').FlagSystem} flags
   * @param {import('./CombatSystem.js').CombatSystem} combat
   */
  constructor(map, units, flags, combat) {
    this.map = map;
    this.units = units;
    this.flags = flags;
    this.combat = combat;
    this.active = false;
    this.role = 'wizard'; // wizard | knight
    this.owner = 0;
    this.x = 0;
    this.y = 0;
    this.hp = CONFIG.AVATAR_HP;
    this.maxHp = CONFIG.AVATAR_HP;
    this.aimX = 0;
    this.aimY = 0;
    this.cd = 0;
    this.chargeCd = 0;
    this.teleportCd = 0;
    this.keys = new Set();
    this.mods = {};
  }

  /**
   * Enter FPS near player's keep.
   */
  enter(owner, role, mods = {}) {
    this.owner = owner;
    this.role = role || 'wizard';
    this.mods = mods;
    this.hp = CONFIG.AVATAR_HP;
    this.active = true;
    this.cd = 0;
    // Spawn at keep
    let sx = owner === 0 ? 5 : this.map.w - 7;
    let sy = Math.floor(this.map.h / 2);
    this.map.forEachBuilding('keep', owner, (x, y) => {
      sx = x + 1;
      sy = y + 1;
    });
    this.x = sx * CONFIG.TILE + CONFIG.TILE / 2;
    this.y = sy * CONFIG.TILE + CONFIG.TILE / 2;
  }

  exit() {
    this.active = false;
    this.keys.clear();
  }

  get tileX() {
    return Math.floor(this.x / CONFIG.TILE);
  }
  get tileY() {
    return Math.floor(this.y / CONFIG.TILE);
  }

  onKeyDown(code) {
    this.keys.add(code);
  }
  onKeyUp(code) {
    this.keys.delete(code);
  }

  setAim(worldX, worldY) {
    this.aimX = worldX;
    this.aimY = worldY;
  }

  /**
   * Primary action: fire spell / melee / charge
   */
  primary() {
    if (!this.active || this.cd > 0) return;
    if (this.role === 'wizard') {
      this._castBolt();
      this.cd = 0.45;
    } else {
      this._melee();
      this.cd = 0.35;
    }
  }

  secondary() {
    if (!this.active) return;
    if (this.role === 'wizard') {
      if (this.teleportCd > 0) return;
      this._teleport();
      this.teleportCd = 4;
    } else {
      if (this.chargeCd > 0) return;
      this._charge();
      this.chargeCd = 3.5;
    }
  }

  interact() {
    if (!this.active) return;
    this.flags.interact(this.owner, this.tileX, this.tileY);
  }

  _castBolt() {
    const boost = this.mods.wizardBoost ? 1.4 : 1;
    const dmg = CONFIG.WIZARD_DMG * boost;
    // Projectile toward aim
    const tileX = Math.floor(this.aimX / CONFIG.TILE);
    const tileY = Math.floor(this.aimY / CONFIG.TILE);
    this.combat.spawnProjectile({
      fromX: this.x,
      fromY: this.y,
      toTileX: tileX,
      toTileY: tileY,
      dmg,
      owner: this.owner,
      kind: 'arrow',
      speed: 400,
    });
    // Small AoE at impact delay — approximate immediate nearby foes
    for (const u of this.units.units) {
      if (!u.alive || u.owner === this.owner) continue;
      if (Math.hypot(u.x - this.aimX, u.y - this.aimY) < CONFIG.TILE * 1.5) {
        u.hp -= dmg * 0.5;
      }
    }
  }

  _melee() {
    const boost = this.mods.knightBoost ? 1.35 : 1;
    const dmg = 14 * boost;
    const ang = Math.atan2(this.aimY - this.y, this.aimX - this.x);
    const reach = 22;
    const hx = this.x + Math.cos(ang) * reach;
    const hy = this.y + Math.sin(ang) * reach;
    for (const u of this.units.units) {
      if (!u.alive || u.owner === this.owner) continue;
      if (Math.hypot(u.x - hx, u.y - hy) < 16) {
        u.hp -= dmg;
        if (u.hp <= 0) {
          u.alive = false;
          if (this.combat.scoreCb) this.combat.scoreCb(this.owner, CONFIG.UNIT_KILL_POINTS, 'kill');
        }
      }
    }
    // Hit structure
    const tx = Math.floor(hx / CONFIG.TILE);
    const ty = Math.floor(hy / CONFIG.TILE);
    const res = this.map.damageTile(tx, ty, dmg * 0.6, this.owner);
    if (res.destroyed && this.combat.scoreCb) this.combat.scoreCb(this.owner, res.points, 'destroy');
    if (res.destroyed && this.combat.onExplosion) {
      const T = CONFIG.TILE;
      this.combat.onExplosion(tx * T + T / 2, ty * T + T / 2, res.kind || 'building');
    }
  }

  _charge() {
    const boost = this.mods.knightBoost ? 1.4 : 1;
    const ang = Math.atan2(this.aimY - this.y, this.aimX - this.x);
    const dist = 48 * boost;
    this._tryMove(this.x + Math.cos(ang) * dist, this.y + Math.sin(ang) * dist, true);
    // Damage along path
    for (const u of this.units.units) {
      if (!u.alive || u.owner === this.owner) continue;
      if (Math.hypot(u.x - this.x, u.y - this.y) < 28) {
        u.hp -= CONFIG.KNIGHT_CHARGE_DMG * boost;
        if (u.hp <= 0) u.alive = false;
      }
    }
  }

  _teleport() {
    const tileX = Math.floor(this.aimX / CONFIG.TILE);
    const tileY = Math.floor(this.aimY / CONFIG.TILE);
    const c = this.map.get(tileX, tileY);
    if (!c || c.water || (c.wall && !c.gateOpen)) return;
    // Limit range
    if (Math.hypot(tileX - this.tileX, tileY - this.tileY) > 8) return;
    this.x = tileX * CONFIG.TILE + CONFIG.TILE / 2;
    this.y = tileY * CONFIG.TILE + CONFIG.TILE / 2;
    // Heal pulse
    this.hp = Math.min(this.maxHp, this.hp + 15);
  }

  update(dt) {
    if (!this.active) return;
    this.cd = Math.max(0, this.cd - dt);
    this.chargeCd = Math.max(0, this.chargeCd - dt);
    this.teleportCd = Math.max(0, this.teleportCd - dt);

    const speed =
      this.role === 'wizard'
        ? CONFIG.AVATAR_SPEED_WIZ
        : CONFIG.AVATAR_SPEED_KNT * (this.mods.knightBoost ? 1.2 : 1);

    let mx = 0;
    let my = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) my -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) my += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mx += 1;
    if (mx || my) {
      const len = Math.hypot(mx, my);
      this._tryMove(this.x + (mx / len) * speed * dt, this.y + (my / len) * speed * dt);
    }

    // Take damage from nearby enemies
    for (const u of this.units.units) {
      if (!u.alive || u.owner === this.owner) continue;
      if (Math.hypot(u.x - this.x, u.y - this.y) < 12) {
        this.hp -= (u.dmg * 0.5) * dt;
      }
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.exit();
      return 'dead';
    }
    return null;
  }

  _tryMove(nx, ny, force = false) {
    const tileX = Math.floor(nx / CONFIG.TILE);
    const tileY = Math.floor(ny / CONFIG.TILE);
    const c = this.map.get(tileX, tileY);
    if (!c) return;
    if (c.water) return;
    if (c.wall && c.wallHp > 0) {
      if (c.building === 'gate' && (c.gateOpen || c.owner === this.owner)) {
        // pass
      } else if (!force) {
        // Knight charge can bash walls slightly
        if (force) this.map.damageTile(tileX, tileY, 10, this.owner);
        return;
      }
    }
    if (c.building && c.building !== 'gate' && c.building !== 'moat' && c.owner !== this.owner) {
      if (force) this.map.damageTile(tileX, tileY, 8, this.owner);
      return;
    }
    // Height climb check
    const cost = this.map.heightmap.moveCost(this.tileX, this.tileY, tileX, tileY);
    if (!isFinite(cost) && !force) return;
    this.x = nx;
    this.y = ny;
  }

  /** Snapshot for renderer */
  state() {
    return {
      active: this.active,
      role: this.role,
      owner: this.owner,
      x: this.x,
      y: this.y,
      hp: this.hp,
      maxHp: this.maxHp,
      aimX: this.aimX,
      aimY: this.aimY,
    };
  }
}
