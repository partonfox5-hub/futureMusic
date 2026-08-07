/**
 * MultiplayerManager — PeerJS P2P lobby + state sync.
 * Host is authoritative for phase timers and combat resolution;
 * clients send inputs; host broadcasts snapshots.
 *
 * Graceful fallback: if PeerJS fails, game continues offline.
 */

/** Protocol version for lobby isolation (must match module.manifest multiplayer.protocolVersion). */
export const MP_PROTOCOL_VERSION = 1;
export const MP_MODULE_ID = 'rampart-reborn';

export class MultiplayerManager {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.isHost = false;
    this.roomCode = null;
    this.connected = false;
    this.localReady = false;
    this.remoteReady = false;
    this.protocolVersion = MP_PROTOCOL_VERSION;
    this.moduleId = MP_MODULE_ID;
    /** @type {string} */
    this.localNick = 'Player';
    /** @type {string} */
    this.remoteNick = 'Opponent';
    this.onStatus = () => {};
    this.onChat = () => {};
    this.onMessage = () => {};
    this.onReadyChange = () => {};
    this.onDisconnect = () => {};
    this.onPeerConnected = () => {};
    this.onNickChange = () => {};
  }

  /** Peer id prefix so only same-protocol builds can join each other (always uppercase). */
  _roomPrefix() {
    return `RRP${this.protocolVersion}`;
  }

  _code() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 5; i++) s += chars[(Math.random() * chars.length) | 0];
    return (this._roomPrefix() + s).toUpperCase();
  }

  setNickname(nick) {
    const cleaned = String(nick || '')
      .trim()
      .replace(/[^\w\s\-'.]/g, '')
      .slice(0, 16);
    this.localNick = cleaned || (this.isHost ? 'Host' : 'Guest');
    if (this.connected) this._sendHello();
    this.onNickChange(this.localNick, this.remoteNick);
    return this.localNick;
  }

  /**
   * Create a room. Peer id = full room code (prefix + short id).
   * Host waits until a guest connects before Ready is meaningful.
   */
  async createRoom(nickname) {
    this.destroy();
    this.isHost = true;
    this.setNickname(nickname || 'Host');
    this.roomCode = this._code();
    this.onStatus('Creating room…');
    const ok = await this._initPeer(this.roomCode);
    if (ok) this.onStatus('Waiting for opponent… share code: ' + this.roomCode);
    return ok;
  }

  async joinRoom(code, nickname) {
    this.destroy();
    this.isHost = false;
    this.setNickname(nickname || 'Guest');
    let raw = (code || '').toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
    // Allow short 5-char codes: apply current protocol prefix
    if (raw.length === 5 && !raw.startsWith('RRP')) {
      raw = this._roomPrefix() + raw;
    }
    this.roomCode = raw;
    if (this.roomCode.length < 6) {
      this.onStatus('Invalid code');
      return false;
    }
    this.onStatus('Connecting to host…');
    const peerOk = await this._initPeer(); // random id
    if (!peerOk) return false;
    return this._connectToHost(this.roomCode);
  }

  _initPeer(id) {
    return new Promise((resolve) => {
      if (typeof Peer === 'undefined') {
        this.onStatus('PeerJS not loaded — multiplayer unavailable');
        resolve(false);
        return;
      }
      let settled = false;
      const done = (ok) => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };

      try {
        // Explicit cloud options + JSON serialization for reliable DataConnection
        const opts = {
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' },
            ],
          },
        };
        this.peer = id ? new Peer(id, opts) : new Peer(opts);
      } catch (e) {
        this.onStatus('Peer init failed: ' + e.message);
        done(false);
        return;
      }

      this.peer.on('open', (myId) => {
        if (this.isHost) {
          this.roomCode = String(myId).toUpperCase();
          this.onStatus('Room created. Share code: ' + this.roomCode);
        } else {
          this.onStatus('Local peer ready');
        }
        done(true);
      });

      this.peer.on('connection', (conn) => {
        // Host receives guest
        if (this.conn && this.connected) {
          try {
            conn.close();
          } catch (_) {}
          return;
        }
        this._bindConn(conn);
      });

      this.peer.on('error', (err) => {
        console.warn('Peer error', err);
        const type = err?.type || '';
        const msg = err?.message || String(err);
        this.onStatus('Peer error: ' + (type || msg));
        // Unavailable ID — retry with new code once
        if (type === 'unavailable-id' && this.isHost && !settled) {
          try {
            this.peer.destroy();
          } catch (_) {}
          this.roomCode = this._code();
          this.peer = new Peer(this.roomCode, {
            debug: 1,
            config: {
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' },
              ],
            },
          });
          this.peer.on('open', (myId) => {
            this.roomCode = String(myId).toUpperCase();
            this.onStatus('Room created. Share code: ' + this.roomCode);
            done(true);
          });
          this.peer.on('connection', (conn) => this._bindConn(conn));
          this.peer.on('error', (e2) => {
            this.onStatus('Peer error: ' + (e2?.type || e2?.message || e2));
            done(false);
          });
          return;
        }
        if (!settled) done(false);
      });

      this.peer.on('disconnected', () => {
        this.onStatus('Disconnected from PeerServer — retrying…');
        try {
          this.peer.reconnect();
        } catch (_) {}
      });

      // Safety timeout
      setTimeout(() => {
        if (!settled) {
          this.onStatus('Peer server timeout — check network / try again');
          done(false);
        }
      }, 15000);
    });
  }

  _connectToHost(hostId) {
    return new Promise((resolve) => {
      if (!this.peer) {
        resolve(false);
        return;
      }
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };

      const tryConnect = () => {
        const conn = this.peer.connect(hostId, {
          reliable: true,
          serialization: 'json',
        });
        conn.on('open', () => {
          this._bindConn(conn);
          this.onStatus('Joined room ' + hostId);
          finish(true);
        });
        conn.on('error', (e) => {
          this.onStatus('Join failed: ' + (e?.type || e?.message || e));
          finish(false);
        });
        // PeerJS sometimes never fires open if host id wrong
        setTimeout(() => {
          if (!settled && !this.connected) {
            this.onStatus('Join timed out — check code / host still waiting');
            finish(false);
          }
        }, 12000);
      };

      if (this.peer.open) tryConnect();
      else this.peer.on('open', tryConnect);
    });
  }

  _bindConn(conn) {
    // Avoid double-binding
    if (this.conn === conn) return;

    // Replace previous half-open conn
    if (this.conn && this.conn !== conn) {
      try {
        this.conn.close();
      } catch (_) {}
    }

    this.conn = conn;
    this.localReady = false;
    this.remoteReady = false;

    const markOpen = () => {
      if (this.connected && this.conn === conn) {
        // already open — still refresh hello
        this._sendHello();
        return;
      }
      this.connected = true;
      this._sendHello();
      this.onStatus(
        this.isHost
          ? `Player connected${this.remoteNick ? ' (' + this.remoteNick + ')' : ''}! Both press Ready.`
          : `Connected to host${this.remoteNick ? ' (' + this.remoteNick + ')' : ''}. Press Ready when set.`
      );
      this.onPeerConnected();
    };

    conn.on('data', (data) => this._onData(data));

    conn.on('close', () => {
      if (this.conn !== conn) return;
      this.connected = false;
      this.conn = null;
      this.localReady = false;
      this.remoteReady = false;
      this.remoteNick = 'Opponent';
      this.onStatus(
        this.isHost
          ? 'Opponent disconnected — waiting for a new guest…'
          : 'Disconnected from host'
      );
      this.onDisconnect();
    });

    conn.on('error', (err) => {
      console.warn('DataConnection error', err);
      this.onStatus('Link error: ' + (err?.type || err?.message || err));
    });

    // Host: connection event may fire before open — MUST wait
    if (conn.open) {
      markOpen();
    } else {
      conn.on('open', markOpen);
      // Some PeerJS builds already opened by the time we attach
      setTimeout(() => {
        if (conn.open && !this.connected) markOpen();
      }, 50);
    }
  }

  _sendHello() {
    this.send({
      t: 'hello',
      moduleId: this.moduleId,
      protocolVersion: this.protocolVersion,
      nick: this.localNick,
    });
  }

  _onData(data) {
    if (!data || typeof data !== 'object') return;
    const t = data.t || data.type;
    if (!t) return;

    if (t === 'chat') {
      this.onChat(data.from || this.remoteNick || 'Peer', data.text || '');
      return;
    }
    if (t === 'ready') {
      this.remoteReady = !!data.ready;
      this.onReadyChange(this.localReady, this.remoteReady);
      return;
    }
    if (t === 'hello') {
      if (
        data.protocolVersion != null &&
        Number(data.protocolVersion) !== Number(this.protocolVersion)
      ) {
        this.onStatus('Version mismatch — same game version required');
        try {
          this.conn?.close();
        } catch (_) {}
        return;
      }
      if (data.nick) {
        this.remoteNick = String(data.nick).slice(0, 16);
        this.onNickChange(this.localNick, this.remoteNick);
        this.onStatus(
          this.isHost
            ? `${this.remoteNick} joined! Both press Ready.`
            : `Connected to ${this.remoteNick}. Press Ready when set.`
        );
      }
      // Reply once so both sides learn nicknames (skip if this was already an ack)
      if (!data.ack) {
        this.send({
          t: 'hello',
          moduleId: this.moduleId,
          protocolVersion: this.protocolVersion,
          nick: this.localNick,
          ack: true,
        });
      }
      return;
    }
    this.onMessage({ ...data, t });
  }

  send(data) {
    if (this.conn && this.connected && this.conn.open) {
      try {
        this.conn.send(data);
      } catch (e) {
        console.warn('send failed', e);
      }
    }
  }

  sendChat(text, fromName) {
    const from = fromName || this.localNick || 'Player';
    this.send({ t: 'chat', from, text });
    this.onChat(from, text);
  }

  setReady(ready) {
    this.localReady = !!ready;
    this.send({ t: 'ready', ready: this.localReady });
    this.onReadyChange(this.localReady, this.remoteReady);
  }

  /** Host sends full or partial game state */
  broadcastState(state) {
    if (!this.isHost) return;
    this.send({ t: 'state', state });
  }

  sendInput(input) {
    this.send({ t: 'input', input });
  }

  bothReady() {
    return this.localReady && this.remoteReady && this.connected;
  }

  destroy() {
    try {
      this.conn?.close();
    } catch (_) {}
    try {
      this.peer?.destroy();
    } catch (_) {}
    this.peer = null;
    this.conn = null;
    this.connected = false;
    this.localReady = false;
    this.remoteReady = false;
    this.isHost = false;
    this.remoteNick = 'Opponent';
  }
}
