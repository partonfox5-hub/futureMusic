/**
 * PhaseManager — orchestrates the full match loop.
 */

import { CONFIG, PHASES } from '../data/config.js';

export class PhaseManager {
  /**
   * @param {import('./GameState.js').GameState} state
   * @param {object} hooks - UI / scene callbacks
   */
  constructor(state, hooks = {}) {
    this.state = state;
    this.hooks = hooks;
    this.running = false;
    this._aiBuildAcc = 0;
    this._aiBattleAcc = 0;
  }

  startMatch() {
    // Round setup (bonus pts, flags) runs once on BUILD entry
    this.running = true;
    this.enterPhase(PHASES.BUILD);
  }

  enterPhase(phase) {
    const s = this.state;
    s.phase = phase;
    s.phaseTime = 0;

    switch (phase) {
      case PHASES.CARDS:
        // Cards/bonus-pick removed — build between rounds already covers economy
        this.enterPhase(PHASES.BUILD);
        return;

      case PHASES.BUILD: {
        this.hooks.showCards?.(false);
        // Round setup (pts bonus, flags, reset mods) — once per enter BUILD
        s.beginRound();
        s.buildSkipVotes = [false, false];
        s.applyTerrainRaises();
        // Hotseat: P0 builds first then P1; SP: player builds while AI builds in background
        if (s.mode === 'hotseat') {
          s.activeHotseat = 0;
          s.startBuildFor(0);
          s.phaseDuration = s.buildDurationFor(0);
        } else {
          s.startBuildFor(s.localPlayer);
          s.phaseDuration = s.buildDurationFor(s.localPlayer);
          if (s.players[1].isAI) {
            // AI builds its walls over time during phase
            this._aiBuildPiecesLeft = true;
            s.builderAI = new (s.builder.constructor)(s.map);
            const p = s.players[1];
            let pieces = CONFIG.PIECES_PER_BUILD + (p.mods.extraPieces || 0);
            s.builderAI.startPhase(1, pieces, p.mods.wallHpBonus || 0);
          }
        }
        this.hooks.onPhase?.(phase);
        this.hooks.showBuildPalette?.(true);
        this.hooks.updateSkipVote?.(true);
        break;
      }

      case PHASES.ARM:
        // Legacy: arm phase removed — jump straight into battle
        this.enterPhase(PHASES.BATTLE);
        return;

      case PHASES.BATTLE: {
        this.hooks.showBuildPalette?.(false);
        this.hooks.updateSkipVote?.(false);
        // Enclosure check + auto-deploy cannons (no manual arm phase)
        for (const id of [0, 1]) {
          s.evaluateEnclosure(id);
        }
        if (s.checkVictory()) {
          this.enterPhase(PHASES.END);
          return;
        }
        s.cannonsLostThisRound = [0, 0];
        for (const id of [0, 1]) {
          this._autoDeployCannons(id);
        }
        // Ammo after cannons are placed: base per gun + stockpile bonuses
        s.refillAllCannonAmmo?.();
        s.combat.tryConsumeAmmo = (owner) => s.trySpendAmmo(owner, 1);
        if (s.units) s.units.tryConsumeAmmo = (owner) => s.trySpendAmmo(owner, 1);
        s.phaseDuration = CONFIG.TIME_BATTLE;
        s.enclosedCache = s.map.computeEnclosed();
        s.combat.playerMods = s.players.map((p) => p.mods);
        s.combat.resetProjectiles();
        s.combat.playerClickAim = { 0: null, 1: null }; // cleared when not clicking
        this._ammoDryAcc = 0;
        this.hooks.onPhase?.(phase);
        break;
      }

      case PHASES.SCORE:
        s.scorePhasePoints();
        s.fps.exit();
        // Loser wheel only if: lost more cannons this round AND fewer remaining
        {
          const loser = s.getCannonLossLoser?.() ?? null;
          if (loser !== null) {
            s.wheelPending = true;
            s.wheelPlayer = loser;
            s.phaseDuration = 9999; // wait for wheel claim
            this.hooks.onPhase?.(phase);
            this.hooks.showPrizeWheel?.(loser, s.cannonsLostThisRound[loser] || 0);
            break;
          }
        }
        s.wheelPending = false;
        s.phaseDuration = CONFIG.TIME_SCORE;
        this.hooks.onPhase?.(phase);
        break;

      case PHASES.SHOP:
        // Post-round market removed — go straight to next build
        this.hooks.showShop?.(false);
        this._advanceToNextRound();
        return;

      case PHASES.END:
        s.phaseDuration = 9999;
        this.running = false;
        this.hooks.showShop?.(false);
        this.hooks.onPhase?.(phase);
        this.hooks.showEnd?.(true);
        break;

      default:
        break;
    }
    this.hooks.updateHUD?.(true);
    this.hooks.audio?.phase?.();
  }

  /**
   * @param {number} dt seconds
   */
  update(dt) {
    if (!this.running) return;
    const s = this.state;
    if (s.phase === PHASES.END || s.phase === PHASES.MENU) return;

    s.phaseTime += dt;

    // Phase-specific simulation
    if (s.phase === PHASES.BUILD) {
      this._updateBuild(dt);
    } else if (s.phase === PHASES.BATTLE) {
      this._updateBattle(dt);
    }

    // Timer end transitions
    if (s.phaseTime >= s.phaseDuration) {
      this._advanceFrom(s.phase);
    }

    // HUD every frame for watch hand; scores throttled inside updateHUD
    this.hooks.updateHUD?.(false);
  }

  _updateBuild(dt) {
    const s = this.state;
    // AI wall building (pays 1 pt per segment)
    if (s.builderAI && s.builderAI.piecesLeft > 0) {
      this._aiBuildAcc += dt;
      if (this._aiBuildAcc > 0.35) {
        this._aiBuildAcc = 0;
        const ai = s.players[1];
        const res = s.builderAI.aiPlaceBest(25, ai.spendPoints);
        if (res.placed && res.cost > 0) {
          ai.spendPoints = Math.max(0, ai.spendPoints - res.cost);
        }
        // AI also places free buildings
        this._aiPlaceFreeBuildings(1);
        // If AI is broke and can't place more wall pieces, vote skip eventually
        if (ai.spendPoints < 1 && s.builderAI.piecesLeft > 0) {
          // still can skip pieces; leave timer unless human also skips
        }
      }
    }
  }

  /**
   * Player votes to end the current build timer early.
   * SP: human vote ends build immediately (AI is considered ready).
   * Hotseat: ends the active player's build segment.
   * MP: both players must vote.
   */
  voteBuildSkip(playerId) {
    const s = this.state;
    if (s.phase !== PHASES.BUILD) return false;
    s.buildSkipVotes[playerId] = true;

    if (s.mode === 'sp') {
      // Single human controls skip for the whole build session
      s.buildSkipVotes[0] = true;
      s.buildSkipVotes[1] = true;
      this.hooks.toast?.('Build phase skipped');
      this.skipPhase();
      return true;
    }

    if (s.mode === 'hotseat') {
      // End current builder's turn immediately
      s.buildSkipVotes[s.activeHotseat] = true;
      this.hooks.toast?.(`Player ${s.activeHotseat + 1} ready — ending build`);
      s.phaseTime = s.phaseDuration;
      this._advanceFrom(PHASES.BUILD);
      // Reset vote for next hotseat builder if still in BUILD
      if (s.phase === PHASES.BUILD) {
        s.buildSkipVotes = [false, false];
        this.hooks.updateSkipVote?.(true);
      }
      return true;
    }

    // Multiplayer: need both
    if (s.buildSkipVotes[0] && s.buildSkipVotes[1]) {
      this.hooks.toast?.('Both players ready — ending build');
      this.skipPhase();
      return true;
    }
    this.hooks.toast?.('Skip vote registered — waiting for opponent');
    this.hooks.updateSkipVote?.(true);
    return true;
  }

  _aiPlaceFreeBuildings(playerId) {
    const s = this.state;
    const p = s.players[playerId];
    while (p.freeBuildings.length) {
      const type = p.freeBuildings[0];
      let placed = false;
      for (let t = 0; t < 30 && !placed; t++) {
        const x = playerId === 0 ? 3 + ((Math.random() * 18) | 0) : s.map.w - 22 + ((Math.random() * 18) | 0);
        const y = 3 + ((Math.random() * (s.map.h - 6)) | 0);
        if (s.map.placeBuilding(type, x, y, playerId)) {
          p.freeBuildings.shift();
          placed = true;
        }
      }
      if (!placed) p.freeBuildings.shift();
    }
  }

  /**
   * Auto-place cannons up to credit allowance near keeps / own side.
   * Guarantees at least free-round cannons when a keep exists.
   */
  _autoDeployCannons(playerId) {
    const s = this.state;
    const p = s.players[playerId];
    const enc = s.map.computeEnclosed();
    // Count existing cannons with combat's footprint logic (any owned cannon)
    let existing = 0;
    if (s.combat) existing = s.combat._listCannons(playerId).length;
    else {
      s.map.forEachBuilding('cannon', playerId, () => {
        existing++;
      });
    }
    let left = Math.max(0, (p.cannonCredits || 0) - existing);
    // Always try for at least 1 if player has any keep and zero cannons
    if (left <= 0 && existing === 0) {
      const keeps = s.map.getEnclosedKeeps(playerId);
      if (keeps.length) left = 1;
      else {
        // even unenclosed home keep on own side
        s.map.forEachBuilding('keep', playerId, () => {
          left = Math.max(left, 1);
        });
      }
    }
    if (left <= 0) return;

    const spots = [];
    s.map.forEachBuilding('keep', playerId, (kx, ky) => {
      for (let dy = -5; dy <= 5; dy++) {
        for (let dx = -5; dx <= 5; dx++) {
          spots.push({ x: kx + dx, y: ky + dy, d: Math.abs(dx) + Math.abs(dy) });
        }
      }
    });
    spots.sort((a, b) => a.d - b.d);

    const def = CONFIG.BUILDINGS.cannon;
    const tryPlaceAt = (x, y, force = false) => {
      if (s.map.sideOf(x) !== playerId) return false;
      if (!force) {
        if (!enc[y] || !enc[y][x]) return false;
        for (let dy = 0; dy < def.h; dy++) {
          for (let dx = 0; dx < def.w; dx++) {
            if (!enc[y + dy] || !enc[y + dy][x + dx]) return false;
          }
        }
        if (!s.map.canPlaceBuilding('cannon', x, y, playerId)) return false;
        if (s.map.placeBuilding('cannon', x, y, playerId)) {
          left--;
          p.cannonsPlaced = (p.cannonsPlaced || 0) + 1;
          return true;
        }
        return false;
      }
      // Force-place: clear soft blockers and stamp footprint (last resort)
      for (let dy = 0; dy < def.h; dy++) {
        for (let dx = 0; dx < def.w; dx++) {
          const c = s.map.get(x + dx, y + dy);
          if (!c || c.water || c.isKeep) return false;
          if (c.building && c.building !== 'cannon') return false;
        }
      }
      for (let dy = 0; dy < def.h; dy++) {
        for (let dx = 0; dx < def.w; dx++) {
          const c = s.map.get(x + dx, y + dy);
          c.wall = false;
          c.wallHp = 0;
          c.building = 'cannon';
          c.buildingHp = def.hp;
          c.buildingMaxHp = def.hp;
          c.buildingLevel = 1;
          c.owner = playerId;
        }
      }
      left--;
      p.cannonsPlaced = (p.cannonsPlaced || 0) + 1;
      return true;
    };

    for (const sp of spots) {
      if (left <= 0) break;
      tryPlaceAt(sp.x, sp.y, false);
    }
    for (let y = 0; y < s.map.h && left > 0; y++) {
      for (let x = 0; x < s.map.w && left > 0; x++) {
        tryPlaceAt(x, y, false);
      }
    }
    // Force near keep if still none
    if (left > 0) {
      for (const sp of spots) {
        if (left <= 0) break;
        tryPlaceAt(sp.x, sp.y, true);
      }
    }
  }

  _updateBattle(dt) {
    const s = this.state;
    // Enclosure is expensive — refresh a few times per second only
    this._encAcc = (this._encAcc || 0) + dt;
    if (!s.enclosedCache || this._encAcc > 0.45) {
      this._encAcc = 0;
      s.enclosedCache = s.map.computeEnclosed();
    }
    s.units.tickSpawns(
      dt,
      s.players.map((p) => p.mods),
      s.enclosedCache
    );
    s.combat.update(dt, s.enclosedCache);
    s.units.update(dt, s.combat, s.players.map((p) => p.mods));
    s.flags.update(
      dt,
      s.units.units,
      s.fps.active ? { owner: s.fps.owner, tileX: s.fps.tileX, tileY: s.fps.tileY } : null,
      (owner, flag, pts) => {
        s.addScore(owner, pts);
        this.hooks.toast?.(`Flag captured! +${pts}`);
        this.hooks.audio?.capture?.();
      },
      s.players.map((p) => p.mods)
    );
    s.fps.update(dt);

    // Battle repair card
    for (const p of s.players) {
      if (p.mods.battleRepair) {
        s.map.repairWallsPercent(p.id, 0.01 * dt);
      }
    }

    // AI units + cannon return fire
    this._aiBattleAcc += dt;
    if (this._aiBattleAcc > 1.2) {
      this._aiBattleAcc = 0;
      if (s.players[1].isAI) {
        s.units.aiDirect(1, CONFIG.AI_AGGRESSION);
      }
    }
    // AI cannons fire back (slow cadence, any map target)
    if (s.players[1].isAI) {
      this._aiCannonAcc = (this._aiCannonAcc || 0) + dt;
      if (this._aiCannonAcc >= 1.6) {
        this._aiCannonAcc = 0;
        const target = s.combat.pickAiTarget(1);
        if (target) s.combat.aiFireAt(1, target.x, target.y);
      }
    }
    // Hotseat/MP: optional light AI-less — only P1 when isAI
    if (s.mode === 'sp') {
      s.units.spawnWaveThreat(dt, s.waveState);
    }

    // Both sides empty powder → end battle early (let in-flight shots land first)
    this._checkBothOutOfAmmo(dt);
  }

  /**
   * If every player is out of cannon/ironclad powder and no shells are in the air,
   * cut the battle short after a brief settle delay.
   */
  _checkBothOutOfAmmo(dt) {
    const s = this.state;
    const a0 = s.getAmmo?.(0) ?? s.players[0]?.cannonAmmo ?? 0;
    const a1 = s.getAmmo?.(1) ?? s.players[1]?.cannonAmmo ?? 0;
    if (a0 > 0 || a1 > 0) {
      this._ammoDryAcc = 0;
      return;
    }
    const inflight = s.combat?.projectiles?.length || 0;
    if (inflight > 0) {
      this._ammoDryAcc = 0;
      return;
    }
    this._ammoDryAcc = (this._ammoDryAcc || 0) + dt;
    // ~0.75s dry + no projectiles so last impacts resolve and UI can catch up
    if (this._ammoDryAcc < 0.75) return;
    this._ammoDryAcc = 0;
    this.hooks.toast?.('Both sides out of powder — battle ends early');
    s.phaseTime = s.phaseDuration;
  }

  _aiShop(playerId) {
    const s = this.state;
    const p = s.players[playerId];
    // Buy repairs / spawn upgrades if affordable
    if (p.spendPoints >= 35) {
      s.map.repairWallsPercent(playerId, 0.4);
      p.spendPoints -= 35;
    }
    if (p.spendPoints >= 60 && p.upgrades.spawn_rate < 3) {
      p.upgrades.spawn_rate++;
      p.spendPoints -= 60;
      p.mods.spawnMult = 1 + p.upgrades.spawn_rate * 0.2;
    }
  }

  _advanceFrom(phase) {
    const s = this.state;
    switch (phase) {
      case PHASES.BUILD:
        if (s.mode === 'hotseat' && s.activeHotseat === 0) {
          // Place free buildings leftover attempt
          this._aiPlaceFreeBuildings(0);
          s.activeHotseat = 1;
          s.startBuildFor(1);
          s.phaseTime = 0;
          s.phaseDuration = s.buildDurationFor(1);
          s.buildSkipVotes = [false, false];
          this.hooks.toast?.('Player 2 — Build phase');
          this.hooks.updateHUD?.();
          this.hooks.updateSkipVote?.(true);
          this.hooks.showBuildPalette?.(true);
          return;
        }
        // Spend free buildings for human if any left — skip
        this._aiPlaceFreeBuildings(s.localPlayer);
        this.enterPhase(PHASES.BATTLE);
        break;
      case PHASES.ARM:
        this.enterPhase(PHASES.BATTLE);
        break;
      case PHASES.BATTLE:
        this.enterPhase(PHASES.SCORE);
        break;
      case PHASES.SCORE:
        if (s.wheelPending) {
          // Wait for prize wheel to finish (do not advance)
          s.phaseTime = 0;
          return;
        }
        // Re-check enclosure after damage; then next build (no market)
        for (const id of [0, 1]) s.evaluateEnclosure(id);
        this._advanceToNextRound();
        break;
      case PHASES.SHOP:
        // Legacy: market removed
        this.hooks.showShop?.(false);
        this._advanceToNextRound();
        break;
      default:
        break;
    }
  }

  /** Increment round and enter BUILD, or END if match over. */
  _advanceToNextRound() {
    const s = this.state;
    s.round++;
    if (s.checkVictory()) {
      this.enterPhase(PHASES.END);
    } else {
      this.enterPhase(PHASES.BUILD);
    }
  }

  /** Force skip / continue from UI */
  skipPhase() {
    if (!this.running) return;
    const phase = this.state.phase;
    this._advanceFrom(phase);
    // enterPhase resets phaseTime; guard if advance kept same phase (hotseat handoff)
    if (this.state.phase === phase && this.state.phaseTime >= this.state.phaseDuration) {
      this.state.phaseTime = 0;
    }
    this.hooks.updateSkipVote?.(this.state.phase === PHASES.BUILD);
  }

  shopDone() {
    // Market removed — no-op
  }

  /** Called when prize wheel is claimed — continue to next build/end. */
  wheelDone() {
    const s = this.state;
    if (s.phase !== PHASES.SCORE) return;
    s.wheelPending = false;
    s.phaseTime = s.phaseDuration;
    this._advanceFrom(PHASES.SCORE);
  }
}
