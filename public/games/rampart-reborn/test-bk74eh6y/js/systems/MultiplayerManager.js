/**
 * MultiplayerManager — PeerJS P2P lobby + light state sync.
 *
 * Reliability notes:
 * - Host uses a **server-assigned** peer id (not a custom id) — custom ids on
 *   the free PeerJS cloud often fail silently ("Local peer ready" then hang).
 * - Room code is the host's peer id **exactly** (never force upper/lowercase).
 * - DataConnection must wait for `open` before send; Ready/chat only after open.
 */

export const MP_PROTOCOL_VERSION = 1;
export const MP_MODULE_ID = 'rampart-reborn';

/** Shared PeerJS cloud options (HTTPS site → secure broker). */
function peerOptions() {
  return {
    host: '0.peerjs.com',
    port: 443,
    path: '/',
    secure: true,
    debug: 2,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
      ],
    },
  };
}

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
    this.localNick = 'Player';
    this.remoteNick = 'Opponent';
    this._boundConn = null;
    this.onStatus = () => {};
    this.onChat = () => {};
    this.onMessage = () => {};
    this.onReadyChange = () => {};
    this.onDisconnect = () => {};
    this.onPeerConnected = () => {};
    this.onNickChange = () => {};
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
   * Host: open broker with random id → room code = peer.id (exact).
   */
  async createRoom(nickname) {
    this.destroy();
    this.isHost = true;
    this.setNickname(nickname || 'Host');
    this.onStatus('Creating room…');
    const ok = await this._initPeer(null);
    if (!ok) return false;
    this.roomCode = this.peer.id;
    this.onStatus('Waiting for opponent… share code: ' + this.roomCode);
    return true;
  }

  /**
   * Guest: open broker, then connect to host peer id from the shared code.
   */
  async joinRoom(code, nickname) {
    this.destroy();
    this.isHost = false;
    this.setNickname(nickname || 'Guest');

    const raw = String(code || '').trim().replace(/\s+/g, '');
    if (raw.length < 4) {
      this.onStatus('Invalid code — paste the full room code from the host');
      return false;
    }
    this.roomCode = raw;
    this.onStatus('Connecting to matchmaking…');

    const peerOk = await this._initPeer(null);
    if (!peerOk) return false;

    this.onStatus('Linking to host… (' + raw.slice(0, 8) + '…)');
    return this._connectToHost(raw);
  }

  _initPeer(_unusedCustomId) {
    return new Promise((resolve) => {
      if (typeof Peer === 'undefined') {
        this.onStatus('PeerJS not loaded — check network / adblock');
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
        // Always random id — most reliable on free PeerJS cloud
        this.peer = new Peer(peerOptions());
      } catch (e) {
        this.onStatus('Peer init failed: ' + e.message);
        done(false);
        return;
      }

      this.peer.on('open', (myId) => {
        console.info('[mp] peer open', myId, 'host=', this.isHost);
        if (this.isHost) {
          this.roomCode = myId;
        }
        done(true);
      });

      this.peer.on('connection', (conn) => {
        console.info('[mp] host got connection from', conn.peer);
        // Only one guest
        if (this.conn && this.connected && this.conn !== conn) {
          try {
            conn.close();
          } catch (_) {}
          return;
        }
        this._bindConn(conn);
      });

      this.peer.on('error', (err) => {
        console.warn('[mp] peer error', err);
        const type = err?.type || '';
        const msg = err?.message || String(err);
        // peer-unavailable is common when code is wrong / host left
        if (type === 'peer-unavailable') {
          this.onStatus('Host not found — wrong code or host left. Recreate room.');
        } else if (type === 'network') {
          this.onStatus('Network error talking to PeerJS cloud');
        } else if (type === 'server-error') {
          this.onStatus('PeerJS server error — try again in a moment');
        } else {
          this.onStatus('Peer error: ' + (type || msg));
        }
        if (!settled) done(false);
      });

      this.peer.on('disconnected', () => {
        this.onStatus('Lost PeerJS broker — reconnecting…');
        try {
          this.peer.reconnect();
        } catch (_) {}
      });

      setTimeout(() => {
        if (!settled) {
          this.onStatus('PeerJS timeout — cloud broker blocked or offline?');
          done(false);
        }
      }, 20000);
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

      // Try exact id, then lower/upper (broker is case-sensitive; cover paste mistakes)
      const candidates = [];
      const pushUnique = (s) => {
        if (s && !candidates.includes(s)) candidates.push(s);
      };
      pushUnique(hostId);
      pushUnique(hostId.toLowerCase());
      pushUnique(hostId.toUpperCase());

      let attempt = 0;

      const tryNext = () => {
        if (settled) return;
        if (attempt >= candidates.length) {
          this.onStatus('Could not reach host — check code, both use same test URL, host still waiting');
          finish(false);
          return;
        }
        const id = candidates[attempt++];
        this.onStatus('Trying link… (' + attempt + '/' + candidates.length + ')');
        console.info('[mp] connect attempt to', id);

        let conn;
        try {
          conn = this.peer.connect(id, { reliable: true });
        } catch (e) {
          console.warn('[mp] connect throw', e);
          setTimeout(tryNext, 200);
          return;
        }

        const failTimer = setTimeout(() => {
          if (settled || this.connected) return;
          try {
            conn.close();
          } catch (_) {}
          tryNext();
        }, 8000);

        conn.on('open', () => {
          clearTimeout(failTimer);
          console.info('[mp] data channel open to', id);
          this.roomCode = id;
          this._bindConn(conn);
          this.onStatus('Joined! Waiting for nicknames…');
          finish(true);
        });

        conn.on('error', (e) => {
          console.warn('[mp] conn error', e);
          clearTimeout(failTimer);
          if (!settled) tryNext();
        });
      };

      const start = () => tryNext();
      if (this.peer.open) start();
      else this.peer.on('open', start);

      setTimeout(() => {
        if (!settled) {
          this.onStatus('Join timed out — host must keep lobby open; use full code');
          finish(false);
        }
      }, 28000);
    });
  }

  _bindConn(conn) {
    if (!conn) return;
    if (this._boundConn === conn && this.connected) {
      this._sendHello();
      return;
    }

    if (this.conn && this.conn !== conn) {
      try {
        this.conn.close();
      } catch (_) {}
    }

    this.conn = conn;
    this._boundConn = conn;
    this.localReady = false;
    this.remoteReady = false;

    // Drop prior listeners if rebinding same object (PeerJS is eventful)
    conn.on('data', (data) => this._onData(data));

    conn.on('close', () => {
      if (this.conn !== conn) return;
      console.info('[mp] connection closed');
      this.connected = false;
      this.conn = null;
      this._boundConn = null;
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
      console.warn('[mp] data error', err);
      this.onStatus('Link error: ' + (err?.type || err?.message || err));
    });

    const markOpen = () => {
      if (this.conn !== conn) return;
      const was = this.connected;
      this.connected = true;
      console.info('[mp] markOpen host=', this.isHost, 'peer=', conn.peer);
      this._sendHello();
      // Second hello shortly after — first packet can race ICE
      setTimeout(() => this._sendHello(), 250);
      setTimeout(() => this._sendHello(), 800);
      this.onStatus(
        this.isHost
          ? 'Player connected! Both enter nicknames & press Ready.'
          : 'Connected to host! Press Ready when both are set.'
      );
      if (!was) this.onPeerConnected();
      this.onNickChange(this.localNick, this.remoteNick);
    };

    if (conn.open) {
      markOpen();
    } else {
      conn.on('open', markOpen);
      // Poll — some PeerJS builds fire open before listener attaches
      let n = 0;
      const poll = setInterval(() => {
        n++;
        if (conn.open) {
          clearInterval(poll);
          markOpen();
        } else if (n > 40) {
          clearInterval(poll);
        }
      }, 100);
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
    if (data == null) return;
    // PeerJS binary mode may deliver objects; json mode same
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        return;
      }
    }
    if (typeof data !== 'object') return;

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
        this.onStatus('Version mismatch — both players must use the same game URL');
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
            ? `${this.remoteNick} is in the lobby — both press Ready`
            : `Linked with ${this.remoteNick} — press Ready`
        );
      }
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
    if (!this.conn || !this.connected) return;
    try {
      // Prefer open channel; some browsers report open late
      if (this.conn.open === false) return;
      this.conn.send(data);
    } catch (e) {
      console.warn('[mp] send failed', e);
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

  broadcastState(state) {
    if (!this.isHost) return;
    this.send({ t: 'state', state });
  }

  sendInput(input) {
    this.send({ t: 'input', input });
  }

  bothReady() {
    return !!(this.localReady && this.remoteReady && this.connected);
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
    this._boundConn = null;
    this.connected = false;
    this.localReady = false;
    this.remoteReady = false;
    this.isHost = false;
    this.roomCode = null;
    this.remoteNick = 'Opponent';
  }
}
