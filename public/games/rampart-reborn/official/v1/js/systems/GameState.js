/**
 * GameState — central match state for both local and multiplayer.
 */

import { CONFIG, OWNERS } from '../data/config.js';
import { GridMap } from './GridMap.js';
import { WallBuilder } from './WallBuilder.js';
import { UnitManager } from './UnitManager.js';
import { FlagSystem } from './FlagSystem.js';
import { CombatSystem } from './CombatSystem.js';
import { FPSController } from './FPSController.js';
import { drawCards } from '../data/cards.js';

export function createPlayer(id) {
  return {
    id,
    name: id === 0 ? 'Player 1' : 'Player 2',
    score: 0,
    spendPoints: 80, // starting purse
    isAI: false,
    mods: {},
    freeBuildings: [],
    extraCannons: 0,
    cannonCredits: 0,
    cannonsPlaced: 0,
    lastingCards: [],
    pendingTerrainRaise: false,
    upgrades: { spawn_rate: 0, hp_boost: 0 },
    eliminated: false,
    /** Shared cannon/ironclad ammo remaining this battle */
    cannonAmmo: 0,
    cannonAmmoMax: 0,
  };
}

export class GameState {
  constructor() {
    this.mode = 'sp'; // sp | hotseat | mp
    this.round = 1;
    this.phase = 'menu';
    this.phaseTime = 0;
    this.phaseDuration = 0;
    this.map = null;
    this.players = [createPlayer(0), createPlayer(1)];
    this.localPlayer = 0;
    this.activeHotseat = 0;
    this.builder = null;
    this.units = null;
    this.flags = null;
    this.combat = null;
    this.fps = null;
    this.cardChoices = [[], []];
    this.cardsPicked = [false, false];
    this.waveState = { waveTimer: 0 };
    this.shopLevelUpMode = false;
    this.winner = null;
    this.enclosedCache = null;
    this.tutorialSeen = localStorage.getItem('rr_tut') === '1';
    /** Build-phase skip votes [p0, p1] */
    this.buildSkipVotes = [false, false];
    /** Cannons lost this round (by victim player id) */
    this.cannonsLostThisRound = [0, 0];
    /** Loser prize wheel pending */
    this.wheelPending = false;
    this.wheelPlayer = null;
  }

  initMatch(mode, opts = {}) {
    this.mode = mode;
    this.round = 1;
    this.winner = null;
    this.players = [createPlayer(0), createPlayer(1)];
    if (mode === 'sp') {
      this.players[1].isAI = true;
      this.players[1].name = 'AI Warlord';
    }
    if (mode === 'mp') {
      this.localPlayer = opts.isHost ? 0 : 1;
      this.players[0].name = opts.hostName || 'Host';
      this.players[1].name = opts.guestName || 'Guest';
    }
    this.localPlayer = mode === 'mp' ? (opts.isHost ? 0 : 1) : 0;
    this.activeHotseat = 0;

    const seed = opts.seed || (Date.now() % 99999);
    this.map = new GridMap(CONFIG.MAP_W, CONFIG.MAP_H, seed);
    this.builder = new WallBuilder(this.map);
    this.units = new UnitManager(this.map);
    this.flags = new FlagSystem(this.map);
    this.units.setFlags(this.flags);
    this.combat = new CombatSystem(this.map, this.units);
    this.combat.scoreCb = (owner, pts, reason) => this.addScore(owner, pts);
    this.combat.onCannonLost = (victimOwner) => {
      if (victimOwner === 0 || victimOwner === 1) {
        this.cannonsLostThisRound[victimOwner] =
          (this.cannonsLostThisRound[victimOwner] || 0) + 1;
      }
    };
    this.fps = new FPSController(this.map, this.units, this.flags, this.combat);
    this.waveState = { waveTimer: 0 };
    this.cannonsLostThisRound = [0, 0];
    this.wheelPending = false;
    this.wheelPlayer = null;
  }

  /** Count standing cannons for a player (2×2 footprints). */
  countCannons(playerId) {
    if (this.combat?._listCannons) return this.combat._listCannons(playerId).length;
    let n = 0;
    this.map?.forEachBuilding?.('cannon', playerId, () => {
      n++;
    });
    return n;
  }

  countStockpiles(playerId) {
    let n = 0;
    this.map?.forEachBuilding?.('stockpile', playerId, () => {
      n++;
    });
    // 1×1 buildings: forEachBuilding works; also brute count if needed
    if (!n && this.map) {
      for (let y = 0; y < this.map.h; y++) {
        for (let x = 0; x < this.map.w; x++) {
          const c = this.map.cells[y][x];
          if (c.building === 'stockpile' && c.owner === playerId) n++;
        }
      }
    }
    return n;
  }

  /**
   * Refill shared ammo pool for battle:
   * (base per cannon × cannons) + (2 × stockpiles). Ironclads draw from same pool.
   */
  refillCannonAmmo(playerId) {
    const guns = Math.max(0, this.countCannons(playerId));
    const piles = this.countStockpiles(playerId);
    const base = CONFIG.CANNON_BASE_AMMO_PER_GUN ?? 4;
    const bonus = CONFIG.STOCKPILE_AMMO_BONUS ?? 2;
    // At least some ammo if you have guns or stockpiles; 0 if neither
    const max = guns * base + piles * bonus;
    const p = this.players[playerId];
    if (!p) return 0;
    p.cannonAmmoMax = max;
    p.cannonAmmo = max;
    return max;
  }

  refillAllCannonAmmo() {
    for (const p of this.players) this.refillCannonAmmo(p.id);
  }

  trySpendAmmo(playerId, amount = 1) {
    const p = this.players[playerId];
    if (!p) return false;
    if ((p.cannonAmmo || 0) < amount) return false;
    p.cannonAmmo -= amount;
    return true;
  }

  getAmmo(playerId) {
    return this.players[playerId]?.cannonAmmo ?? 0;
  }

  /**
   * Loser prize wheel eligibility — both must hold:
   * (A) lost strictly more cannons this round than the opponent
   * (B) currently has fewer cannons remaining than the opponent
   * @returns {number|null} player id or null
   */
  getCannonLossLoser() {
    const lost0 = this.cannonsLostThisRound[0] || 0;
    const lost1 = this.cannonsLostThisRound[1] || 0;
    const have0 = this.countCannons(0);
    const have1 = this.countCannons(1);

    // P0: lost more AND has fewer remaining
    if (lost0 > lost1 && have0 < have1) return 0;
    // P1: lost more AND has fewer remaining
    if (lost1 > lost0 && have1 < have0) return 1;
    return null;
  }

  applyWheelPrize(prize) {
    const pid = this.wheelPlayer;
    if (pid == null || !this.players[pid]) return;
    const p = this.players[pid];
    if (prize.type === 'cannon') {
      p.extraCannons = (p.extraCannons || 0) + 1;
      p.freeBuildings.push('cannon');
    } else if (prize.type === 'points') {
      const pts = prize.amount || 0;
      p.score += pts;
      p.spendPoints += pts;
    }
    this.wheelPending = false;
    this.wheelPlayer = null;
  }

  addScore(owner, rawPts) {
    const mult = this.players[owner].mods.pointMult || 1;
    const pts = Math.round(rawPts * mult);
    this.players[owner].score += pts;
    this.players[owner].spendPoints += pts;
    return pts;
  }

  resetRoundMods() {
    for (const p of this.players) {
      p.mods = {};
      // Re-apply lasting upgrade spawn mult
      if (p.upgrades.spawn_rate) {
        p.mods.spawnMult = 1 + p.upgrades.spawn_rate * 0.2;
      }
      p.freeBuildings = [];
      p.cannonsPlaced = 0;
      p.pendingTerrainRaise = false;
    }
    this.cardsPicked = [false, false];
    this.cardChoices = [drawCards(3), drawCards(3)];
  }

  beginRound() {
    this.resetRoundMods();
    this.units.clear();
    this.combat.resetProjectiles();
    this.fps.exit();
    this.flags.spawnRoundFlags();
    this.buildSkipVotes = [false, false];
    // Refresh enclosure
    this.enclosedCache = this.map.computeEnclosed();

    // Each round grants 20 × rounds-passed bonus to every player.
    // "Rounds passed" counts the current round index (round 1 → 20, round 2 → 40, …).
    const bonus = (CONFIG.ROUND_BONUS_PER_ROUND ?? 20) * this.round;
    for (const p of this.players) {
      p.spendPoints += bonus;
      p.score += bonus;
    }
  }

  /** Cost in spend points for a wall polyomino (1 per segment). */
  wallCostForCells(cells) {
    return (cells?.length || 0) * (CONFIG.WALL_SEGMENT_COST ?? 1);
  }

  canAffordWall(playerId, cells) {
    const cost = this.wallCostForCells(cells);
    return (this.players[playerId]?.spendPoints ?? 0) >= cost;
  }

  /** After cards applied, start build for player */
  startBuildFor(playerId) {
    const p = this.players[playerId];
    let pieces = CONFIG.PIECES_PER_BUILD + (p.mods.extraPieces || 0);
    // Mason buildings grant extra pieces
    let masonCount = 0;
    this.map.forEachBuilding('mason', playerId, () => {
      masonCount++;
    });
    pieces += masonCount * CONFIG.EXTRA_PIECES_MASON;
    if (p.mods.masonBoost) pieces += 2;
    this.builder.startPhase(playerId, pieces, p.mods.wallHpBonus || 0);
  }

  buildDurationFor(playerId) {
    return CONFIG.TIME_BUILD + (this.players[playerId].mods.extraBuildTime || 0);
  }

  /**
   * Evaluate enclosure after build — mark eliminated if no keep.
   */
  evaluateEnclosure(playerId) {
    const keeps = this.map.getEnclosedKeeps(playerId);
    if (!keeps.length) {
      // Grace on round 1 if starter wall intact — still check
      this.players[playerId].eliminated = true;
      return false;
    }
    this.players[playerId].eliminated = false;
    // Every round grants 1 free cannon credit on top of keep-based + card extras
    const freePerRound = CONFIG.FREE_CANNONS_PER_ROUND ?? 1;
    this.players[playerId].cannonCredits =
      this.map.cannonCredits(playerId) +
      (this.players[playerId].extraCannons || 0) +
      freePerRound;
    return true;
  }

  applyTerrainRaises() {
    for (const p of this.players) {
      if (!p.pendingTerrainRaise) continue;
      let kx = p.id === 0 ? 5 : this.map.w - 7;
      let ky = Math.floor(this.map.h / 2);
      this.map.forEachBuilding('keep', p.id, (x, y) => {
        kx = x;
        ky = y;
      });
      this.map.heightmap.raiseArea(kx, ky, 2);
      this.map.syncHeights();
      p.pendingTerrainRaise = false;
    }
  }

  scorePhasePoints() {
    for (const p of this.players) {
      const terr = this.map.countEnclosedTerritory(p.id);
      this.addScore(p.id, terr * CONFIG.TERRITORY_POINTS);
    }
  }

  checkVictory() {
    if (this.players[0].eliminated && !this.players[1].eliminated) {
      this.winner = 1;
      return true;
    }
    if (this.players[1].eliminated && !this.players[0].eliminated) {
      this.winner = 0;
      return true;
    }
    if (this.players[0].eliminated && this.players[1].eliminated) {
      this.winner = this.players[0].score >= this.players[1].score ? 0 : 1;
      return true;
    }
    if (this.round > CONFIG.TOTAL_ROUNDS) {
      this.winner = this.players[0].score >= this.players[1].score ? 0 : 1;
      return true;
    }
    return false;
  }

  /**
   * AI picks a card (simple heuristic).
   */
  aiPickCard(playerId) {
    const choices = this.cardChoices[playerId];
    if (!choices.length) return;
    // Prefer free buildings / damage
    let best = 0;
    let bestScore = -1;
    choices.forEach((c, i) => {
      let s = Math.random();
      if (c.id.includes('free') || c.id.includes('spawn') || c.id.includes('damage')) s += 1;
      if (c.duration === 'lasting') s += 0.3;
      if (s > bestScore) {
        bestScore = s;
        best = i;
      }
    });
    this.pickCard(playerId, best);
  }

  pickCard(playerId, index) {
    if (this.cardsPicked[playerId]) return null;
    const card = this.cardChoices[playerId][index];
    if (!card) return null;
    this.cardsPicked[playerId] = true;
    const ctx = {
      players: this.players,
      map: this.map,
      boundaryOffset: this.map.boundaryOffset,
    };
    card.apply(ctx, playerId);
    if (ctx.boundaryOffset !== this.map.boundaryOffset) {
      this.map.applyBoundary(ctx.boundaryOffset);
    }
    if (card.duration === 'lasting') {
      this.players[playerId].lastingCards.push(card.id);
    }
    return card;
  }

  /** Serialize compact match snapshot for MP */
  serializePublic() {
    return {
      round: this.round,
      phase: this.phase,
      phaseTime: this.phaseTime,
      phaseDuration: this.phaseDuration,
      map: this.map.serialize(),
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        score: p.score,
        spendPoints: p.spendPoints,
        eliminated: p.eliminated,
        cannonCredits: p.cannonCredits,
        cannonsPlaced: p.cannonsPlaced,
        mods: p.mods,
        freeBuildings: p.freeBuildings,
      })),
      units: this.units.serialize(),
      flags: this.flags.serialize(),
      winner: this.winner,
    };
  }
}
