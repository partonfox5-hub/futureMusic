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
    this.onStatus = () => {};
    this.onChat = () => {};
    this.onMessage = () => {};
    this.onReadyChange = () => {};
    this.onDisconnect = () => {};
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

  /**
   * Create a room. Peer id = full room code (prefix + short id).
   * Host waits until a guest connects before Ready is meaningful.
   */
  async createRoom() {
    this.destroy();
    this.roomCode = this._code();
    this.isHost = true;
    this.onStatus('Creating room…');
    const ok = await this._initPeer(this.roomCode);
    if (ok) this.onStatus('Waiting for opponent… share code: ' + this.roomCode);
    return ok;
  }

  async joinRoom(code) {
    this.destroy();
    let raw = (code || '').toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
    // Allow short 5-char codes: apply current protocol prefix
    if (raw.length === 5 && !raw.startsWith('RRP')) {
      raw = this._roomPrefix() + raw;
    }
    this.roomCode = raw;
    this.isHost = false;
    if (this.roomCode.length < 6) {
      this.onStatus('Invalid code');
      return false;
    }
    this.onStatus('Connecting to host…');
    await this._initPeer(); // random id
    return this._connectToHost(this.roomCode);
  }

  _initPeer(id) {
    return new Promise((resolve) => {
      if (typeof Peer === 'undefined') {
        this.onStatus('PeerJS not loaded — multiplayer unavailable');
        resolve(false);
        return;
      }
      try {
        this.peer = id ? new Peer(id) : new Peer();
      } catch (e) {
        this.onStatus('Peer init failed: ' + e.message);
        resolve(false);
        return;
      }

      this.peer.on('open', (myId) => {
        if (this.isHost) {
          this.roomCode = myId;
          this.onStatus('Room created. Share code: ' + myId);
        } else {
          this.onStatus('Local peer ready: ' + myId);
        }
        resolve(true);
      });

      this.peer.on('connection', (conn) => {
        if (this.conn) {
          conn.close();
          return;
        }
        this._bindConn(conn);
        this.onStatus('Player connected!');
      });

      this.peer.on('error', (err) => {
        console.warn('Peer error', err);
        this.onStatus('Peer error: ' + (err.type || err.message || err));
      });

      this.peer.on('disconnected', () => {
        this.onStatus('Disconnected from PeerServer — retrying…');
        try {
          this.peer.reconnect();
        } catch (_) {}
      });
    });
  }

  _connectToHost(hostId) {
    return new Promise((resolve) => {
      if (!this.peer) {
        resolve(false);
        return;
      }
      const tryConnect = () => {
        const conn = this.peer.connect(hostId, { reliable: true });
        conn.on('open', () => {
          this._bindConn(conn);
          this.onStatus('Joined room ' + hostId);
          resolve(true);
        });
        conn.on('error', (e) => {
          this.onStatus('Join failed: ' + e);
          resolve(false);
        });
      };
      if (this.peer.open) tryConnect();
      else this.peer.on('open', tryConnect);
    });
  }

  _bindConn(conn) {
    this.conn = conn;
    this.connected = true;
    this.localReady = false;
    this.remoteReady = false;
    if (this.isHost) {
      this.onStatus('Player connected! Both must press Ready to start.');
    }
    conn.on('data', (data) => {
      if (!data || !data.t) return;
      if (data.t === 'chat') this.onChat(data.from, data.text);
      else if (data.t === 'ready') {
        this.remoteReady = !!data.ready;
        this.onReadyChange(this.localReady, this.remoteReady);
      } else if (data.t === 'hello') {
        // Protocol handshake — reject mismatch silently by closing
        if (
          data.protocolVersion != null &&
          data.protocolVersion !== this.protocolVersion
        ) {
          this.onStatus('Version mismatch — same game version required');
          try {
            conn.close();
          } catch (_) {}
          return;
        }
      } else {
        this.onMessage(data);
      }
    });
    conn.on('open', () => {
      this.send({
        t: 'hello',
        moduleId: this.moduleId,
        protocolVersion: this.protocolVersion,
      });
    });
    // Guest connect path already fired open before bind; send hello now
    if (conn.open) {
      this.send({
        t: 'hello',
        moduleId: this.moduleId,
        protocolVersion: this.protocolVersion,
      });
    }
    conn.on('close', () => {
      this.connected = false;
      this.conn = null;
      this.localReady = false;
      this.remoteReady = false;
      this.onStatus(
        this.isHost
          ? 'Opponent disconnected — waiting for a new guest…'
          : 'Disconnected from host'
      );
      this.onDisconnect();
    });
  }

  send(data) {
    if (this.conn && this.connected) {
      try {
        this.conn.send(data);
      } catch (e) {
        console.warn('send failed', e);
      }
    }
  }

  sendChat(text, fromName) {
    this.send({ t: 'chat', from: fromName, text });
    this.onChat(fromName, text);
  }

  setReady(ready) {
    this.localReady = ready;
    this.send({ t: 'ready', ready });
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
  }
}
