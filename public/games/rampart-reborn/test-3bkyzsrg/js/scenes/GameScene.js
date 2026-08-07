/**
 * GameScene — main Phaser scene: input, rendering, phase integration.
 */

import { CONFIG, PHASES } from '../data/config.js';
import { GameState } from '../systems/GameState.js';
import { PhaseManager } from '../systems/PhaseManager.js';
import { MapRenderer } from '../systems/MapRenderer.js';
import { AudioSynth } from '../systems/AudioSynth.js';
import { MultiplayerManager } from '../systems/MultiplayerManager.js';
import { AssetFactory } from '../systems/AssetFactory.js';
import { shopIconHtml } from '../systems/ShopIcons.js';
import { PrizeWheel } from '../systems/PrizeWheel.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.state = new GameState();
    this.audio = new AudioSynth();
    this.mp = new MultiplayerManager();
    this.renderer = new MapRenderer(this);
    this.phaseMgr = null;

    this.mapDirty = true;
    this.pointerTile = { x: 0, y: 0 };
    this.crosshair = { x: 0, y: 0 };
    this.selecting = false;
    this.selectStart = null;
    this.selectRect = null;
    this.cameraDrag = null;
    /** @type {{id:string,type:string|null}[]} */
    this.paletteOptions = [];
    this.paletteIndex = 0;
    this._battlePress = null; // {x,y,worldX,worldY,hitUnit}

    // World size
    this.worldW = CONFIG.MAP_W * CONFIG.TILE;
    this.worldH = CONFIG.MAP_H * CONFIG.TILE;
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    this.cameras.main.setBackgroundColor(CONFIG.COLORS.bg);

    // Zoom to fit
    this._fitCamera();

    this._bindDOM();
    this._bindInput();
    this._setupMP();

    // Menu: no map until match starts
    this.state.map = null;
  }

  _fitCamera() {
    const cam = this.cameras.main;
    // World already matches design size; Phaser.Scale.FIT handles display.
    // Keep camera centered on the full map.
    const zx = CONFIG.GAME_WIDTH / this.worldW;
    const zy = CONFIG.GAME_HEIGHT / this.worldH;
    const z = Math.min(zx, zy);
    cam.setZoom(z);
    cam.centerOn(this.worldW / 2, this.worldH / 2);
  }

  /** Phaser notifies when the scale manager refits the canvas (iframe resize). */
  scaleRefresh() {
    this._fitCamera();
  }

  _bindDOM() {
    const $ = (id) => document.getElementById(id);

    // Menu buttons
    document.querySelectorAll('#panel-menu [data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.audio.resume();
        const mode = btn.getAttribute('data-mode');
        if (mode === 'mp') {
          this._showPanel('lobby');
        } else {
          this.startGame(mode);
        }
      });
    });

    $('btn-tutorial')?.addEventListener('click', () => this._showPanel('tutorial'));
    $('btn-tut-close')?.addEventListener('click', () => {
      localStorage.setItem('rr_tut', '1');
      this._showPanel('menu');
    });
    $('btn-lobby-back')?.addEventListener('click', () => {
      this.mp.destroy();
      this._showPanel('menu');
    });

    // Lobby buttons — handlers live in _setupMP (single place, no overwrite)
    $('btn-create-room')?.addEventListener('click', () => this._lobbyCreate());
    $('btn-copy-code')?.addEventListener('click', () => {
      if (this.mp.roomCode) navigator.clipboard?.writeText(this.mp.roomCode);
      this.toast('Code copied');
    });
    $('btn-join-room')?.addEventListener('click', () => this._lobbyJoin());
    $('btn-ready')?.addEventListener('click', () => this._lobbyReady());
    $('btn-chat-send')?.addEventListener('click', () => this._sendChat());
    $('chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._sendChat();
    });

    $('btn-shop-done')?.addEventListener('click', () => this.phaseMgr?.shopDone());
    $('btn-rematch')?.addEventListener('click', () => {
      this._showPanel('menu');
      this.state.phase = PHASES.MENU;
    });

    $('btn-skip-build')?.addEventListener('click', () => this._onSkipBuildClick());

    // Build palette populated later
    this._paletteEl = $('palette-btns');
  }

  _readNickname() {
    const el = document.getElementById('lobby-nick');
    const v = (el?.value || '').trim();
    if (v) return v;
    // Prompt if empty
    const asked = window.prompt('Quick nickname for this match?', 'Captain');
    if (asked != null && asked.trim()) {
      if (el) el.value = asked.trim().slice(0, 16);
      return asked.trim().slice(0, 16);
    }
    return 'Player';
  }

  _unlockLobbyChat(on) {
    const chat = document.getElementById('chat-input');
    const send = document.getElementById('btn-chat-send');
    if (chat) chat.disabled = !on;
    if (send) send.disabled = !on;
  }

  _setLobbyStatus(msg) {
    const el = document.getElementById('lobby-status');
    if (el) el.textContent = msg;
  }

  _updateLobbyPlayers() {
    const el = document.getElementById('lobby-players');
    if (!el) return;
    if (!this.mp.connected) {
      el.textContent = this.mp.isHost
        ? `You: ${this.mp.localNick} · waiting for opponent…`
        : `You: ${this.mp.localNick}`;
      return;
    }
    el.textContent = `You: ${this.mp.localNick}  ·  Opponent: ${this.mp.remoteNick}`;
  }

  _enableLobbyReady(on) {
    const btn = document.getElementById('btn-ready');
    if (!btn) return;
    btn.disabled = !on;
    if (on && btn.textContent === 'Waiting…') {
      /* keep waiting label if already ready */
    } else if (on) {
      btn.textContent = 'Ready';
    }
  }

  async _lobbyCreate() {
    this.audio.resume();
    const nick = this._readNickname();
    this._setLobbyStatus('Creating room…');
    this._enableLobbyReady(false);
    const ok = await this.mp.createRoom(nick);
    const codeEl = document.getElementById('room-code-display');
    const copyBtn = document.getElementById('btn-copy-code');
    if (codeEl) codeEl.textContent = this.mp.roomCode || 'ERROR';
    if (copyBtn) copyBtn.disabled = !this.mp.roomCode;
    document.getElementById('btn-ready').textContent = 'Ready';
    this._unlockLobbyChat(false);
    this._updateLobbyPlayers();
    if (ok) {
      this._setLobbyStatus('Waiting for opponent… share the code above');
    }
  }

  async _lobbyJoin() {
    this.audio.resume();
    const nick = this._readNickname();
    const code = document.getElementById('join-code')?.value || '';
    this._setLobbyStatus('Joining…');
    const ok = await this.mp.joinRoom(code, nick);
    this._updateLobbyPlayers();
    if (ok) {
      this._enableLobbyReady(true);
      this._unlockLobbyChat(true);
      this._setLobbyStatus('Joined — press Ready when both players are here');
    }
  }

  _lobbyReady() {
    if (!this.mp.connected) {
      this.toast('Wait for an opponent to join first');
      return;
    }
    this.mp.setReady(true);
    const btn = document.getElementById('btn-ready');
    if (btn) {
      btn.textContent = 'Waiting…';
      btn.disabled = true;
    }
    this._setLobbyStatus(
      this.mp.remoteReady
        ? 'Both ready — starting…'
        : 'You are ready — waiting for opponent…'
    );
    if (this.mp.bothReady() && this.mp.isHost) {
      this._startMultiplayerMatch();
    }
  }

  _onSkipBuildClick() {
    if (!this.phaseMgr || this.state.phase !== PHASES.BUILD) return;
    const pid = this._actingPlayer();
    this.audio.place();
    this.phaseMgr.voteBuildSkip(pid);
    if (this.state.mode === 'mp' && this.mp) {
      this.mp.send({ t: 'input', input: { type: 'skipBuild', playerId: pid } });
    }
    this.updateSkipVote(true);
    this.updateHUD();
  }

  updateSkipVote(show) {
    const btn = document.getElementById('btn-skip-build');
    const status = document.getElementById('skip-vote-status');
    if (!btn) return;
    if (!show || this.state.phase !== PHASES.BUILD) {
      // leave button visible while palette is open; status cleared when hidden via palette
      if (status) status.textContent = '';
      btn.classList.remove('voted');
      btn.disabled = false;
      btn.textContent = 'Vote: End Build Early';
      return;
    }
    const votes = this.state.buildSkipVotes || [false, false];
    const pid = this._actingPlayer();
    const localVoted = !!votes[pid];
    btn.disabled = localVoted && this.state.mode === 'mp';
    btn.classList.toggle('voted', localVoted);
    if (this.state.mode === 'sp') {
      btn.textContent = localVoted ? 'Ending build…' : 'End Build Early';
      if (status) status.textContent = 'Skip the remaining timer';
    } else if (this.state.mode === 'hotseat') {
      btn.textContent = `P${pid + 1}: End My Build`;
      if (status) status.textContent = 'Ends your build turn';
    } else {
      btn.textContent = localVoted ? 'Voted — waiting…' : 'Vote: End Build Early';
      const n = (votes[0] ? 1 : 0) + (votes[1] ? 1 : 0);
      if (status) status.textContent = `Votes ${n}/2 — both must agree`;
    }
  }

  _setupMP() {
    // Single source of truth for PeerJS callbacks (do not re-assign elsewhere)
    this.mp.onStatus = (msg) => {
      this._setLobbyStatus(msg);
      this.setStatus(msg);
      if (this.mp.connected) {
        this._enableLobbyReady(true);
        this._unlockLobbyChat(true);
        this._updateLobbyPlayers();
      }
    };
    this.mp.onPeerConnected = () => {
      this._enableLobbyReady(true);
      this._unlockLobbyChat(true);
      this._updateLobbyPlayers();
      this.toast(`${this.mp.remoteNick || 'Opponent'} linked`);
    };
    this.mp.onNickChange = () => this._updateLobbyPlayers();
    this.mp.onChat = (from, text) => {
      const log = document.getElementById('chat-log');
      if (!log) return;
      const div = document.createElement('div');
      div.textContent = `${from}: ${text}`;
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
    };
    this.mp.onReadyChange = (local, remote) => {
      this.setStatus(`Ready — you:${local ? 'yes' : 'no'} · foe:${remote ? 'yes' : 'no'}`);
      if (local && !remote) {
        this._setLobbyStatus('You are ready — waiting for opponent…');
      } else if (!local && remote) {
        this._setLobbyStatus(`${this.mp.remoteNick} is ready — press Ready`);
        this._enableLobbyReady(true);
        const btn = document.getElementById('btn-ready');
        if (btn) btn.textContent = 'Ready';
      } else if (local && remote) {
        this._setLobbyStatus('Both ready — starting…');
      }
      if (local && remote && this.mp.isHost) {
        this._startMultiplayerMatch();
      }
    };
    this.mp.onMessage = (data) => {
      if (data.t === 'start') {
        this.startGame('mp', {
          isHost: false,
          seed: data.seed,
          hostName: this.mp.remoteNick,
          guestName: this.mp.localNick,
        });
      } else if (data.t === 'state' && data.state) {
        this._applyRemoteState(data.state);
      } else if (data.t === 'input') {
        if (data.input?.type === 'skipBuild') {
          const pid = data.input.playerId ?? (this.mp.isHost ? 1 : 0);
          this.phaseMgr?.voteBuildSkip(pid);
          this.updateSkipVote(true);
        } else if (this.mp.isHost) {
          this._handleRemoteInput(data.input);
        }
      }
    };
    this.mp.onDisconnect = () => {
      // Still in lobby
      if (this.state.phase === PHASES.MENU || !this.phaseMgr?.running) {
        this._enableLobbyReady(false);
        document.getElementById('btn-ready').textContent = 'Ready';
        this._unlockLobbyChat(false);
        this._updateLobbyPlayers();
        this._setLobbyStatus(
          this.mp.isHost
            ? 'Opponent disconnected — waiting for a new guest…'
            : 'Disconnected from host'
        );
        this.toast('Opponent left the lobby');
        return;
      }
      this.toast('Opponent left — continuing offline vs AI');
      if (this.state.players?.[1]) {
        this.state.players[1].isAI = true;
        this.state.mode = 'sp';
      }
    };
  }

  _sendChat() {
    const input = document.getElementById('chat-input');
    if (!input?.value.trim()) return;
    if (!this.mp.connected) {
      this.toast('Not connected yet');
      return;
    }
    this.mp.sendChat(input.value.trim(), this.mp.localNick);
    input.value = '';
  }

  _startMultiplayerMatch() {
    if (this._mpStarting) return;
    this._mpStarting = true;
    const seed = Date.now() % 99999;
    this.mp.send({
      t: 'start',
      seed,
      hostName: this.mp.localNick,
      guestName: this.mp.remoteNick,
    });
    this.startGame('mp', {
      isHost: true,
      seed,
      hostName: this.mp.localNick,
      guestName: this.mp.remoteNick,
    });
    setTimeout(() => {
      this._mpStarting = false;
    }, 2000);
  }

  _applyRemoteState(snap) {
    // Lightweight: scores + phase sync; full map replace is heavy but OK occasionally
    if (!this.state?.players) return;
    this.state.round = snap.round;
    this.state.phase = snap.phase;
    this.state.phaseTime = snap.phaseTime;
    this.state.phaseDuration = snap.phaseDuration;
    if (snap.players) {
      snap.players.forEach((p, i) => {
        Object.assign(this.state.players[i], {
          score: p.score,
          spendPoints: p.spendPoints,
          eliminated: p.eliminated,
        });
      });
    }
    // TODO: full map/unit desync reconciliation for production lockstep
    this.mapDirty = true;
    this.updateHUD();
  }

  _handleRemoteInput(input) {
    // Host applies guest build placements / battle orders
    if (!input || !this.state.map) return;
    const owner = 1; // guest is P1
    if (input.type === 'placeWall' && input.cells) {
      const cost = input.cost ?? input.cells.length * (CONFIG.WALL_SEGMENT_COST ?? 1);
      if (this.state.players[owner].spendPoints < cost) return;
      if (this.state.map.placeWalls(input.cells, owner, input.hpBonus || 0)) {
        this.state.players[owner].spendPoints -= cost;
        this.mapDirty = true;
      }
    } else if (input.type === 'placeBridge' && input.cells) {
      const cost = input.cost ?? input.cells.length * (CONFIG.BRIDGE_SEGMENT_COST ?? 1);
      if (this.state.players[owner].spendPoints < cost) return;
      if (this.state.map.placeBridges(input.cells, owner)) {
        this.state.players[owner].spendPoints -= cost;
        this.mapDirty = true;
      }
    } else if (input.type === 'placeBuilding') {
      this.state.map.placeBuilding(input.building, input.x, input.y, owner);
      this.mapDirty = true;
    } else if (input.type === 'order' && input.unitIds) {
      const units = input.unitIds.map((id) => this.state.units.getById(id)).filter(Boolean);
      if (input.order === 'move') this.state.units.orderMove(units, input.tx, input.ty);
      if (input.order === 'flag') this.state.units.orderNearestFlag(units);
      if (input.order === 'walls') this.state.units.orderAttackWalls(units);
    }
  }

  startGame(mode, opts = {}) {
    this.audio.resume();
    this.state.initMatch(mode, opts);
    this.phaseMgr = new PhaseManager(this.state, {
      onPhase: (p) => this.onPhase(p),
      showCards: (v) => this.showCards(v),
      showBuildPalette: (v) => this.showBuildPalette(v),
      showShop: (v) => this.showShop(v),
      showEnd: (v) => this.showEnd(v),
      updateHUD: (force) => this.updateHUD(force),
      toast: (m) => this.toast(m),
      audio: this.audio,
      updateSkipVote: (v) => this.updateSkipVote(v),
      showPrizeWheel: (pid, lost) => this.showPrizeWheel(pid, lost),
    });

    // Impact FX + explosions + cannon audio
    this.state.combat.onImpactFx = (x, y) => {
      this.renderer.showImpact(x, y);
      this.mapDirty = true;
    };
    this.state.combat.onExplosion = (x, y, kind) => {
      this.renderer.spawnExplosion(x, y, kind);
      this.mapDirty = true;
      this.audio.hit();
    };
    this.state.combat.onFireSound = () => this.audio.fire();
    this.state.combat.onHitSound = () => this.audio.hit();
    this.state.combat.onWhistleSound = () => this.audio.whistle();
    this.audio.resume(); // pre-render cannon sample on match start
    this._hudScoreAcc = 0;
    this._paintWatch(1, 1);
    this.prizeWheel = new PrizeWheel();
    this.prizeWheel.bind(document.getElementById('wheel-canvas'));
    this.prizeWheel.onSettle = (prize) => this._onWheelSettle(prize);
    document.getElementById('btn-wheel-claim')?.addEventListener('click', () => this._claimWheelPrize());

    this.mapDirty = true;
    this._hideAllPanels();
    if (!this.state.tutorialSeen && mode !== 'mp') {
      // brief toast instead of blocking
      this.toast('Tip: enclose keeps with walls · R rotate · F for FPS in battle');
      localStorage.setItem('rr_tut', '1');
      this.state.tutorialSeen = true;
    }

    this.phaseMgr.startMatch();
    this.setStatus(mode === 'sp' ? 'Single player' : mode === 'hotseat' ? 'Hotseat' : 'Multiplayer');
  }

  onPhase(phase) {
    this.mapDirty = true;
    this.updateHUD();
    const names = {
      [PHASES.CARDS]: 'Build / Repair',
      [PHASES.BUILD]: 'Build / Repair',
      [PHASES.BATTLE]: 'Battle!',
      [PHASES.SCORE]: 'Scoring',
      [PHASES.SHOP]: 'Market',
      [PHASES.END]: 'Match Over',
    };
    this.setStatus(names[phase] || phase);

    if (phase === PHASES.BUILD) {
      const bonus = (CONFIG.ROUND_BONUS_PER_ROUND ?? 20) * this.state.round;
      this.toast(`Round ${this.state.round}: +${bonus} bonus pts — build & repair`);
      this.updateSkipVote(true);
    } else {
      this.updateSkipVote(false);
    }
    if (phase === PHASES.BATTLE) {
      this.mapDirty = true; // show auto-deployed cannons
      const p = this.state.players[this.state.localPlayer];
      const ammo = p?.cannonAmmo ?? 0;
      const max = p?.cannonAmmoMax ?? 0;
      this.toast(
        `Battle! Powder ${ammo}/${max} — click to fire. Stockpiles +2 ammo. Archers auto-fire.`
      );
    }
  }

  // ─── UI panels ─────────────────────────────────────────────────────────

  _showPanel(name) {
    this._hideAllPanels();
    const map = {
      menu: 'panel-menu',
      lobby: 'panel-lobby',
      tutorial: 'panel-tutorial',
      cards: 'panel-cards',
      shop: 'panel-shop',
      wheel: 'panel-wheel',
      end: 'panel-end',
    };
    const el = document.getElementById(map[name]);
    if (el) el.classList.add('active');
  }

  _hideAllPanels() {
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    document.getElementById('build-palette')?.classList.add('hidden');
  }

  /** Bonus card pick removed — inter-round economy is shop + build only. */
  showCards(_show) {
    document.getElementById('panel-cards')?.classList.remove('active');
  }

  showBuildPalette(show) {
    const dock = document.getElementById('build-palette');
    if (!dock) return;
    if (!show) {
      dock.classList.add('hidden');
      return;
    }
    dock.classList.remove('hidden');
    const btns = document.getElementById('palette-btns');
    btns.innerHTML = '';

    // Build ordered option list for mousewheel cycling
    this.paletteOptions = [
      { id: 'wall', type: null, label: '🧱 Wall (RMB rotate)' },
      { id: 'bridge', type: 'bridge', label: '🌉 Bridge on water' },
    ];
    const pid = this._actingPlayer();
    const free = this.state.players[pid].freeBuildings;
    const counts = {};
    free.forEach((t) => {
      counts[t] = (counts[t] || 0) + 1;
    });
    Object.entries(counts).forEach(([t, n]) => {
      const def = CONFIG.BUILDINGS[t];
      this.paletteOptions.push({
        id: 'free:' + t,
        type: t,
        label: `${def?.icon || ''} ${def?.name || t} ×${n} free`,
      });
    });
    for (const [t, def] of Object.entries(CONFIG.BUILDINGS)) {
      if (!def.placeable || counts[t]) continue;
      if (t === 'bridge') continue; // already listed as polyomino mode
      this.paletteOptions.push({
        id: t,
        type: t,
        label: `${def.icon || ''} ${def.name} (${def.cost})`,
      });
    }

    // Sync index to current selection
    let idx = 0;
    if (this.state.builder.mode === 'bridge') {
      idx = this.paletteOptions.findIndex((o) => o.id === 'bridge');
    } else if (this.state.builder.mode === 'wall') {
      idx = this.paletteOptions.findIndex((o) => o.id === 'wall');
    } else {
      const curType = this.state.builder.pendingBuilding;
      idx = this.paletteOptions.findIndex((o) => o.type === curType);
    }
    if (idx >= 0) this.paletteIndex = idx;

    this.paletteOptions.forEach((opt, i) => {
      const b = document.createElement('button');
      b.className = 'btn small' + (i === this.paletteIndex ? ' active' : '');
      b.textContent = opt.label;
      b.addEventListener('click', () => {
        this.paletteIndex = i;
        this._applyPaletteOption(opt);
        this.showBuildPalette(true);
      });
      btns.appendChild(b);
    });

    const active = this.paletteOptions[this.paletteIndex];
    const pts = this.state.players[pid]?.spendPoints ?? 0;
    let wallCostHint = '';
    if (this.state.builder.isPolyominoMode?.() && this.state.builder.current) {
      const wc = this.state.builder.wallCost();
      const kind = this.state.builder.mode === 'bridge' ? 'bridge' : 'wall';
      wallCostHint = ` · Next ${kind}: ${wc} pt${wc === 1 ? '' : 's'}`;
    }
    document.getElementById('piece-preview').textContent =
      (this.state.builder.piecesLeft > 0
        ? `Pieces left: ${this.state.builder.piecesLeft}`
        : 'No wall pieces') +
      ` · ${pts} pts` +
      wallCostHint +
      (active ? ` · ${active.label}` : '') +
      ' · Wheel to cycle';
    this.updateSkipVote(true);
  }

  _applyPaletteOption(opt) {
    if (!opt || !this.state.builder) return;
    if (opt.id === 'wall' || opt.type == null) this.state.builder.selectBuilding(null);
    else this.state.builder.selectBuilding(opt.type);
  }

  /** Mousewheel cycles build palette options. */
  _cycleBuildOption(dir) {
    if (!this.paletteOptions.length || this.state.phase !== PHASES.BUILD) return;
    this.paletteIndex =
      (this.paletteIndex + dir + this.paletteOptions.length) % this.paletteOptions.length;
    this._applyPaletteOption(this.paletteOptions[this.paletteIndex]);
    this.showBuildPalette(true);
    this.audio.place();
  }

  _worldPoint(ptr) {
    const cam = this.cameras.main;
    // Prefer camera matrix (correct with zoom/scroll). Fallback for edge Phaser builds.
    if (typeof cam.getWorldPoint === 'function') {
      const out = cam.getWorldPoint(ptr.x, ptr.y);
      if (out && Number.isFinite(out.x) && Number.isFinite(out.y)) {
        return { x: out.x, y: out.y };
      }
    }
    return {
      x: cam.scrollX + ptr.x / cam.zoom,
      y: cam.scrollY + ptr.y / cam.zoom,
    };
  }

  /**
   * Battle: fire a cannon at world point. Returns true if a shot was spawned.
   * Targets ANY map position (own / river / enemy side).
   */
  _fireCannonAt(worldX, worldY) {
    const s = this.state;
    if (!s.combat || s.phase !== PHASES.BATTLE) return false;
    const pid = this._actingPlayer();
    // Clamp to full map (not just own half)
    const maxX = s.map.w * CONFIG.TILE - 0.01;
    const maxY = s.map.h * CONFIG.TILE - 0.01;
    const x = Math.max(0, Math.min(maxX, worldX));
    const y = Math.max(0, Math.min(maxY, worldY));
    const result = s.combat.manualFire(pid, x, y);
    if (result?.ok) {
      this.renderer.showImpact(x, y);
      this.mapDirty = true;
      this.updateHUD(true);
      return true;
    }
    if (result?.reason === 'no_cannon') {
      this.toast('No cannons — enclose a keep so they auto-deploy');
    } else if (result?.reason === 'cooldown') {
      this.toast('Cannon reloading…');
    } else if (result?.reason === 'no_ammo') {
      this.toast('Out of powder! Build stockpiles (+2 ammo each)');
    }
    this.updateHUD(true);
    return false;
  }

  showPrizeWheel(playerId, cannonsLost) {
    const s = this.state;
    const p = s.players[playerId];
    const panel = document.getElementById('panel-wheel');
    const sub = document.getElementById('wheel-subtitle');
    const hint = document.getElementById('wheel-hint');
    const result = document.getElementById('wheel-result');
    const claim = document.getElementById('btn-wheel-claim');
    if (result) {
      result.classList.add('hidden');
      result.textContent = '';
    }
    if (claim) claim.disabled = true;
    if (sub) {
      const have = this.state.countCannons?.(playerId) ?? 0;
      const foe = this.state.countCannons?.(1 - playerId) ?? 0;
      const lostFoe = this.state.cannonsLostThisRound?.[1 - playerId] || 0;
      sub.textContent =
        `${p?.name || 'Player'} lost more cannons (${cannonsLost} vs ${lostFoe}) ` +
        `and has fewer left (${have} vs ${foe}) — consolation spin!`;
    }
    if (hint) {
      hint.innerHTML = 'Press <kbd>Space</kbd> to spin · press again to stop';
    }
    panel?.classList.add('active');
    this.prizeWheel.bind(document.getElementById('wheel-canvas'));
    this.prizeWheel.open(p?.name || 'Player', cannonsLost);

    // AI auto-spins after a short delay
    if (p?.isAI) {
      if (hint) hint.textContent = 'AI is spinning the consolation wheel…';
      setTimeout(() => {
        if (!this.prizeWheel.active || this.prizeWheel.settled) return;
        this.prizeWheel.onSpace(); // start
        setTimeout(() => {
          if (!this.prizeWheel.settled) this.prizeWheel.onSpace(); // brake
        }, 900 + Math.random() * 1200);
      }, 600);
    }
  }

  _onWheelSettle(prize) {
    const result = document.getElementById('wheel-result');
    const claim = document.getElementById('btn-wheel-claim');
    const hint = document.getElementById('wheel-hint');
    let msg = '';
    if (prize.type === 'cannon') msg = '⚔ Free Cannon!';
    else msg = `+${prize.amount} Treasury points!`;
    if (result) {
      result.textContent = msg;
      result.classList.remove('hidden');
    }
    if (hint) hint.textContent = 'Claim your prize to continue';
    if (claim) claim.disabled = false;
    this.audio.capture?.();
    // AI auto-claims
    const pid = this.state.wheelPlayer;
    if (this.state.players[pid]?.isAI) {
      setTimeout(() => this._claimWheelPrize(), 700);
    }
  }

  _claimWheelPrize() {
    if (!this.prizeWheel?.prize || !this.state.wheelPending) return;
    const prize = this.prizeWheel.prize;
    this.state.applyWheelPrize(prize);
    this.prizeWheel.close();
    document.getElementById('panel-wheel')?.classList.remove('active');
    this.toast(
      prize.type === 'cannon'
        ? 'Consolation: Free cannon credit!'
        : `Consolation: +${prize.amount} pts`
    );
    this.updateHUD(true);
    this.phaseMgr?.wheelDone();
  }

  /** Post-round market removed — no-op. */
  showShop(_show) {
    document.getElementById('panel-shop')?.classList.remove('active');
  }

  showEnd() {
    const s = this.state;
    const w = s.winner;
    const title = document.getElementById('end-title');
    const detail = document.getElementById('end-detail');
    if (w === s.localPlayer) title.textContent = 'Victory!';
    else if (w === null) title.textContent = 'Draw';
    else title.textContent = 'Defeat';
    detail.textContent = `${s.players[0].name}: ${s.players[0].score}  —  ${s.players[1].name}: ${s.players[1].score}`;
    document.getElementById('panel-end')?.classList.add('active');
  }

  // ─── Input ─────────────────────────────────────────────────────────────

  _bindInput() {
    this.input.mouse?.disableContextMenu();

    this.input.on('pointermove', (ptr) => {
      const wp = this._worldPoint(ptr);
      this.pointerTile.x = Math.floor(wp.x / CONFIG.TILE);
      this.pointerTile.y = Math.floor(wp.y / CONFIG.TILE);
      this.crosshair.x = wp.x;
      this.crosshair.y = wp.y;

      if (this.state.phase === PHASES.BUILD && this.state.builder) {
        this.state.builder.setGhostTile(this.pointerTile.x, this.pointerTile.y);
      }
      if (this.state.fps?.active) {
        this.state.fps.setAim(wp.x, wp.y);
      }
      if (this.selecting && this.selectStart) {
        this.selectRect = {
          x: Math.min(this.selectStart.x, wp.x),
          y: Math.min(this.selectStart.y, wp.y),
          w: Math.abs(wp.x - this.selectStart.x),
          h: Math.abs(wp.y - this.selectStart.y),
        };
      }
      // Hold LMB: keep aiming + fire when reload finishes (anywhere on map)
      if (
        this.state.phase === PHASES.BATTLE &&
        !this.state.fps?.active &&
        ptr.leftButtonDown() &&
        this._battlePress &&
        !this._battlePress.hitUnit
      ) {
        this._fireCannonAt(wp.x, wp.y);
      }
      if (this.cameraDrag) {
        const cam = this.cameras.main;
        cam.scrollX -= (ptr.x - this.cameraDrag.x) / cam.zoom;
        cam.scrollY -= (ptr.y - this.cameraDrag.y) / cam.zoom;
        this.cameraDrag = { x: ptr.x, y: ptr.y };
      }
    });

    this.input.on('pointerdown', (ptr) => {
      this.audio.resume();
      const wp = this._worldPoint(ptr);
      const tx = Math.floor(wp.x / CONFIG.TILE);
      const ty = Math.floor(wp.y / CONFIG.TILE);
      const s = this.state;

      // Build: right-click rotates wall/bridge pieces (not pan)
      if (s.phase === PHASES.BUILD && (ptr.button === 2 || ptr.rightButtonDown())) {
        if (s.builder?.isPolyominoMode?.()) {
          s.builder.rotate(1);
          this.audio.place();
        }
        return;
      }

      if (ptr.middleButtonDown() || (ptr.rightButtonDown() && s.phase !== PHASES.BATTLE)) {
        this.cameraDrag = { x: ptr.x, y: ptr.y };
        return;
      }

      if (s.phase === PHASES.BUILD) {
        if (ptr.leftButtonDown()) {
          const owner = this._actingPlayer();
          s.builder.owner = owner;
          if (s.builder.pendingBuilding) {
            const type = s.builder.pendingBuilding;
            const p = s.players[owner];
            const def = CONFIG.BUILDINGS[type];
            const freeIdx = p.freeBuildings.indexOf(type);
            const isFree = freeIdx >= 0;
            if (!isFree && (!def || p.spendPoints < def.cost)) {
              this.toast(`Need ${def?.cost || '?'} pts or a free credit`);
              this.audio.deny();
              return;
            }
            const bx = s.builder.gx;
            const by = s.builder.gy;
            if (s.builder.tryPlace()) {
              if (isFree) p.freeBuildings.splice(freeIdx, 1);
              else p.spendPoints -= def.cost;
              this.audio.place();
              this.mapDirty = true;
              this.showBuildPalette(true);
              this.updateHUD();
              this._mpInput({ type: 'placeBuilding', building: type, x: bx, y: by });
            } else this.audio.deny();
          } else {
            // Wall or bridge polyomino
            const cells = s.builder.ghostCells();
            const ownerP = s.players[owner];
            const cost = s.builder.wallCost(cells);
            const kind = s.builder.mode === 'bridge' ? 'bridge' : 'wall';
            if (ownerP.spendPoints < cost) {
              this.toast(
                `Need ${cost} pts (1 per ${kind} segment) — have ${ownerP.spendPoints}`
              );
              this.audio.deny();
              return;
            }
            if (s.builder.tryPlace(ownerP.spendPoints)) {
              ownerP.spendPoints -= s.builder.lastWallCost ?? cost;
              this.audio.place();
              this.mapDirty = true;
              this.showBuildPalette(true);
              this.updateHUD();
              this._mpInput({
                type: kind === 'bridge' ? 'placeBridge' : 'placeWall',
                cells,
                hpBonus: s.builder.hpBonus,
                cost: s.builder.lastWallCost ?? cost,
              });
            } else this.audio.deny();
          }
        }
      } else if (s.phase === PHASES.BATTLE) {
        if (s.fps.active) {
          if (ptr.button === 0 || ptr.leftButtonDown()) s.fps.primary();
          if (ptr.button === 2 || ptr.rightButtonDown()) s.fps.secondary();
          return;
        }
        // Left click (button 0): always try to fire at map position — including enemy side
        const isLeft = ptr.button === 0 || ptr.leftButtonDown();
        const isRight = ptr.button === 2 || ptr.rightButtonDown();
        if (isLeft) {
          const pid = this._actingPlayer();
          const hit = s.units.selectAt(wp.x, wp.y, pid);
          this._battlePress = {
            x: ptr.x,
            y: ptr.y,
            worldX: wp.x,
            worldY: wp.y,
            hitUnit: !!hit,
          };
          if (!hit) {
            // Fire at exact click — full map, no range gate
            this._fireCannonAt(wp.x, wp.y);
            this.selecting = true;
            this.selectStart = { x: wp.x, y: wp.y };
            this.selectRect = { x: wp.x, y: wp.y, w: 0, h: 0 };
          }
        }
        if (isRight) {
          const sel = s.units.selected(this._actingPlayer());
          if (sel.length) {
            s.units.orderAttackMove(sel, tx, ty);
            this.audio.place();
            this._mpInput({
              type: 'order',
              order: 'move',
              unitIds: sel.map((u) => u.id),
              tx,
              ty,
            });
          }
        }
      }
    });

    this.input.on('pointerup', (ptr) => {
      this.cameraDrag = null;
      const s = this.state;
      const wp = this._worldPoint(ptr);

      if (s.phase === PHASES.BATTLE && this._battlePress && !s.fps?.active) {
        const press = this._battlePress;
        this._battlePress = null;
        const r = this.selectRect;
        if (!press.hitUnit && r && (r.w > 14 || r.h > 14)) {
          // Box select units (drag) — doesn't cancel the aim shot already fired
          s.units.selectInRect(r.x, r.y, r.x + r.w, r.y + r.h, this._actingPlayer());
        }
        // Clear directing shortly after release so auto resumes
        s.combat.clearPlayerAim(this._actingPlayer());
      }

      this.selecting = false;
      this.selectRect = null;
      this.selectStart = null;
    });

    this.input.keyboard?.on('keydown', (e) => {
      const s = this.state;
      if (s.fps?.active) {
        s.fps.onKeyDown(e.code);
      }
      if ((e.code === 'KeyR' || e.code === 'KeyE') && s.phase === PHASES.BUILD) {
        s.builder.rotate(1);
      }
      if (e.code === 'Space') {
        if (s.wheelPending && this.prizeWheel?.active) {
          e.preventDefault();
          this.prizeWheel.onSpace();
          const hint = document.getElementById('wheel-hint');
          if (hint && this.prizeWheel.spinning && !this.prizeWheel.braking) {
            hint.innerHTML = 'Press <kbd>Space</kbd> again to stop the wheel';
          }
          return;
        }
        if (s.phase === PHASES.BUILD) {
          e.preventDefault();
          s.builder.skipPiece();
          this.showBuildPalette(true);
        }
      }
      if (e.code === 'KeyF' && s.phase === PHASES.BATTLE) {
        if (s.fps.active) {
          s.fps.exit();
          document.getElementById('fps-mode-indicator')?.classList.add('hidden');
        } else {
          s.fps.enter(this._actingPlayer(), s.fps.role || 'wizard', s.players[this._actingPlayer()].mods);
          const ind = document.getElementById('fps-mode-indicator');
          if (ind) {
            ind.classList.remove('hidden');
            ind.textContent = `FPS: ${s.fps.role}`;
          }
          this.toast('FPS mode — WASD move · Click attack · RMB special · E capture · Esc exit');
        }
      }
      if (e.code === 'Digit1' && s.phase === PHASES.BATTLE) {
        s.fps.role = 'wizard';
        if (s.fps.active) s.fps.enter(this._actingPlayer(), 'wizard', s.players[this._actingPlayer()].mods);
        this.toast('Role: Wizard');
      }
      if (e.code === 'Digit2' && s.phase === PHASES.BATTLE) {
        s.fps.role = 'knight';
        if (s.fps.active) s.fps.enter(this._actingPlayer(), 'knight', s.players[this._actingPlayer()].mods);
        this.toast('Role: Knight');
      }
      if (e.code === 'Escape' && s.fps?.active) {
        s.fps.exit();
        document.getElementById('fps-mode-indicator')?.classList.add('hidden');
      }
      if (e.code === 'KeyE' && s.fps?.active) s.fps.interact();
      if (e.code === 'KeyG' && s.phase === PHASES.BATTLE) {
        // Toggle nearest gate
        this._toggleNearestGate();
      }
      if (e.code === 'KeyQ' && s.phase === PHASES.BATTLE) {
        const sel = s.units.selected(this._actingPlayer());
        s.units.orderNearestFlag(sel.length ? sel : s.units.units.filter((u) => u.alive && u.owner === this._actingPlayer()));
        this.toast('Orders: capture flags');
      }
      if (e.code === 'KeyX' && s.phase === PHASES.BATTLE) {
        const sel = s.units.selected(this._actingPlayer());
        s.units.orderAttackWalls(sel.length ? sel : s.units.units.filter((u) => u.alive && u.owner === this._actingPlayer()));
        this.toast('Orders: attack walls');
      }
      if (e.code === 'KeyH') {
        this._showPanel('tutorial');
      }
      // Camera pan keys when not FPS
      if (!s.fps?.active) {
        const cam = this.cameras.main;
        const step = 40 / cam.zoom;
        if (e.code === 'ArrowLeft') cam.scrollX -= step;
        if (e.code === 'ArrowRight') cam.scrollX += step;
        if (e.code === 'ArrowUp') cam.scrollY -= step;
        if (e.code === 'ArrowDown') cam.scrollY += step;
      }
    });

    this.input.keyboard?.on('keyup', (e) => {
      this.state.fps?.onKeyUp(e.code);
    });

    // Wheel: cycle build options during BUILD; otherwise zoom (hold Shift to zoom in build)
    this.input.on('wheel', (ptr, objs, dx, dy) => {
      if (this.state.phase === PHASES.BUILD && !ptr.event?.shiftKey) {
        ptr.event?.preventDefault?.();
        this._cycleBuildOption(dy > 0 ? 1 : -1);
        return;
      }
      const cam = this.cameras.main;
      const nz = Phaser.Math.Clamp(cam.zoom * (dy > 0 ? 0.9 : 1.1), 0.5, 2.5);
      cam.setZoom(nz);
    });
  }

  _actingPlayer() {
    const s = this.state;
    if (s.mode === 'hotseat') {
      if (s.phase === PHASES.BUILD) return s.activeHotseat;
      return s.activeHotseat; // could expand
    }
    return s.localPlayer;
  }

  _toggleNearestGate() {
    const s = this.state;
    const pid = this._actingPlayer();
    let best = null;
    let bd = 99;
    const tx = this.pointerTile.x;
    const ty = this.pointerTile.y;
    s.map.forEachBuilding('gate', pid, (x, y, cell) => {
      const d = Math.abs(x - tx) + Math.abs(y - ty);
      if (d < bd) {
        bd = d;
        best = cell;
      }
    });
    // Also scan cells (gate is per-cell)
    for (let y = 0; y < s.map.h; y++) {
      for (let x = 0; x < s.map.w; x++) {
        const c = s.map.cells[y][x];
        if (c.building === 'gate' && c.owner === pid) {
          const d = Math.abs(x - tx) + Math.abs(y - ty);
          if (d < bd && d < 8) {
            c.gateOpen = !c.gateOpen;
            this.toast(c.gateOpen ? 'Gate opened' : 'Gate closed');
            this.mapDirty = true;
            return;
          }
        }
      }
    }
  }

  _mpInput(input) {
    if (this.state.mode === 'mp' && !this.mp.isHost) {
      this.mp.sendInput(input);
    }
  }

  // ─── Frame loop ────────────────────────────────────────────────────────

  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000);
    if (this.phaseMgr && this.state.phase !== PHASES.MENU) {
      this.phaseMgr.update(dt);
      // Host broadcasts occasionally
      if (this.state.mode === 'mp' && this.mp.isHost && this.mp.connected) {
        this._syncAcc = (this._syncAcc || 0) + dt;
        if (this._syncAcc > 0.5) {
          this._syncAcc = 0;
          this.mp.broadcastState({
            round: this.state.round,
            phase: this.state.phase,
            phaseTime: this.state.phaseTime,
            phaseDuration: this.state.phaseDuration,
            players: this.state.players.map((p) => ({
              score: p.score,
              spendPoints: p.spendPoints,
              eliminated: p.eliminated,
            })),
          });
        }
      }
    }

    if (!this.state.map) return;

    // Full terrain+wall redraw only when dirty (not every battle frame) — FPS win
    if (this.mapDirty) {
      const enc =
        this.state.phase === PHASES.BUILD
          ? this.state.map.computeEnclosed()
          : this.state.enclosedCache;
      this.renderer.drawMap(this.state.map, enc);
      this.mapDirty = false;
    }

    const ghostCells =
      this.state.phase === PHASES.BUILD ? this.state.builder.ghostCells() : null;
    const spendForGhost =
      this.state.players[this._actingPlayer()]?.spendPoints ?? 0;
    const ghostValid =
      this.state.phase === PHASES.BUILD
        ? this.state.builder.ghostValid(spendForGhost)
        : false;

    let ghostKey = null;
    if (this.state.phase === PHASES.BUILD && this.state.builder?.pendingBuilding) {
      ghostKey = AssetFactory.buildingKey(
        this.state.builder.pendingBuilding,
        this._actingPlayer()
      );
    }

    let aimLine = null;
    if (this.state.phase === PHASES.BATTLE && !this.state.fps?.active && this.state.combat) {
      // Always draw line from a cannon to cursor across the WHOLE map (infinite range feedback)
      const origin = this.state.combat.getAimOrigin(
        this._actingPlayer(),
        this.crosshair.x,
        this.crosshair.y
      );
      if (origin) {
        const maxX = this.state.map.w * CONFIG.TILE - 0.01;
        const maxY = this.state.map.h * CONFIG.TILE - 0.01;
        aimLine = {
          x1: origin.x,
          y1: origin.y,
          x2: Math.max(0, Math.min(maxX, this.crosshair.x)),
          y2: Math.max(0, Math.min(maxY, this.crosshair.y)),
        };
      }
    }

    this.renderer.drawOverlay(
      this.state,
      {
        ghostCells,
        ghostValid,
        ghostKey,
        selectRect: this.selectRect,
        crosshair:
          this.state.phase === PHASES.BATTLE && !this.state.fps.active ? this.crosshair : null,
        aimLine,
      },
      dt
    );
  }

  /**
   * @param {boolean} [forceScores] full score/phase text refresh
   */
  updateHUD(forceScores = true) {
    const s = this.state;
    if (!s.players) return;

    const dur = s.phaseDuration || 1;
    const left = Math.max(0, dur - (s.phaseTime || 0));
    const frac = s.phase === PHASES.MENU || s.phase === PHASES.END ? 1 : left / dur;
    this._paintWatch(frac, left);

    const timerEl = document.getElementById('hud-timer');
    if (timerEl) {
      timerEl.textContent =
        s.phase === PHASES.MENU || s.phase === PHASES.END ? '—' : `${Math.ceil(left)}s`;
    }

    // Throttle score DOM writes
    this._hudScoreAcc = (this._hudScoreAcc || 0) + 0.016;
    if (!forceScores && this._hudScoreAcc < 0.2) return;
    this._hudScoreAcc = 0;

    const phaseEl = document.getElementById('hud-phase');
    const roundEl = document.getElementById('hud-round');
    if (phaseEl) phaseEl.textContent = (s.phase || 'menu').toUpperCase();
    if (roundEl) roundEl.textContent = `Round ${s.round}/${CONFIG.TOTAL_ROUNDS}`;
    const sp0 = document.getElementById('score-p0');
    const sp1 = document.getElementById('score-p1');
    const spend = document.getElementById('spend-pts');
    if (sp0) sp0.textContent = s.players[0].score;
    if (sp1) sp1.textContent = s.players[1].score;
    if (spend) spend.textContent = s.players[s.localPlayer]?.spendPoints ?? 0;
    const ammoEl = document.getElementById('hud-ammo');
    if (ammoEl) {
      const p = s.players[s.localPlayer];
      if (s.phase === PHASES.BATTLE) {
        ammoEl.textContent = `${p?.cannonAmmo ?? 0}/${p?.cannonAmmoMax ?? 0}`;
      } else {
        const piles = s.countStockpiles?.(s.localPlayer) ?? 0;
        const guns = s.countCannons?.(s.localPlayer) ?? 0;
        const est =
          guns * (CONFIG.CANNON_BASE_AMMO_PER_GUN ?? 4) +
          piles * (CONFIG.STOCKPILE_AMMO_BONUS ?? 2);
        ammoEl.textContent = `~${est}`;
      }
    }
  }

  /**
   * Draw medieval watch: shaded elapsed wedge + hand for remaining phase time.
   * @param {number} remainingFrac 1 = full, 0 = empty
   * @param {number} secondsLeft
   */
  _paintWatch(remainingFrac, secondsLeft) {
    const canvas = document.getElementById('hud-watch');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(W, H) * 0.42;
    ctx.clearRect(0, 0, W, H);

    // Wood/iron bezel ring
    const bezel = ctx.createRadialGradient(cx - 8, cy - 8, R * 0.2, cx, cy, R + 8);
    bezel.addColorStop(0, '#6a5a48');
    bezel.addColorStop(0.55, '#3a2a1a');
    bezel.addColorStop(1, '#1a1008');
    ctx.beginPath();
    ctx.arc(cx, cy, R + 6, 0, Math.PI * 2);
    ctx.fillStyle = bezel;
    ctx.fill();

    // Face
    const face = ctx.createRadialGradient(cx - 6, cy - 8, 2, cx, cy, R);
    face.addColorStop(0, '#e8d4a8');
    face.addColorStop(0.7, '#c4a87a');
    face.addColorStop(1, '#8a7040');
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = face;
    ctx.fill();

    // Tick marks (60s style)
    ctx.strokeStyle = '#2a1a08';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const r0 = R * (i % 3 === 0 ? 0.72 : 0.82);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * R * 0.92, cy + Math.sin(a) * R * 0.92);
      ctx.stroke();
    }

    // Shaded portion = time remaining (sweeps as clock runs down)
    const rem = Math.max(0, Math.min(1, remainingFrac));
    if (rem > 0.001 && rem < 0.999) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R * 0.78, -Math.PI / 2, -Math.PI / 2 + rem * Math.PI * 2, false);
      ctx.closePath();
      ctx.fillStyle = 'rgba(60, 40, 20, 0.28)';
      ctx.fill();
    } else if (rem >= 0.999) {
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.78, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(60, 40, 20, 0.18)';
      ctx.fill();
    }

    // Hand points at remaining fraction (full = 12 o'clock, empty = full circle)
    const handA = -Math.PI / 2 + rem * Math.PI * 2;
    ctx.strokeStyle = '#3a1a08';
    ctx.fillStyle = '#5a2a10';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(handA) * R * 0.7, cy + Math.sin(handA) * R * 0.7);
    ctx.stroke();
    // Hand tip ornament
    ctx.beginPath();
    ctx.arc(
      cx + Math.cos(handA) * R * 0.7,
      cy + Math.sin(handA) * R * 0.7,
      3,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = '#d4a017';
    ctx.fill();
    // Hub
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#2a1a08';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#d4a017';
    ctx.fill();
  }

  setStatus(msg) {
    const el = document.getElementById('status-line');
    if (el) el.textContent = msg;
  }

  toast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.add('hidden'), 2800);
  }
}
