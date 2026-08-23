/**
 * Creature Chess — one lobby, two seats. First joiner is host.
 */
const CAP = 2;
const STALE_MS = 20000;
const FILES = "abcdefghijklmnopqrstuvwx";

const lobby = {
  peers: new Map(),
  hostId: null,
  scale: 1,
  started: false,
  mountains: [],
  seq: 0,
  events: [],
  snapshot: null,
};

function json(res, data, status) {
  res.statusCode = status || 200;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(data));
}

function prune(now) {
  for (const [id, p] of lobby.peers) {
    if (now - p.seen > STALE_MS) lobby.peers.delete(id);
  }
  if (lobby.hostId && !lobby.peers.has(lobby.hostId)) {
    const first = [...lobby.peers.keys()][0] || null;
    lobby.hostId = first;
  }
  if (lobby.peers.size === 0) {
    lobby.hostId = null;
    lobby.started = false;
    lobby.snapshot = null;
    lobby.mountains = [];
    lobby.events = [];
    lobby.scale = 1;
  }
}

function nFor(scale) {
  const s = Number(scale) || 1;
  if (s >= 3) return 24;
  if (s >= 2) return 16;
  return 8;
}

function makeMountains(scale) {
  const N = nFor(scale);
  if (N !== 24) return [];
  const used = new Set();
  const out = [];
  const mid = [10, 11, 12, 13, 14];
  const clusters = 5 + Math.floor(Math.random() * 4);
  for (let c = 0; c < clusters; c++) {
    let f = 1 + Math.floor(Math.random() * (N - 2));
    let ri = Math.floor(Math.random() * mid.length);
    const size = 2 + Math.floor(Math.random() * 5);
    for (let k = 0; k < size; k++) {
      const ff = Math.max(0, Math.min(N - 1, f + ((k * 3) % 5) - 2));
      const rr = mid[Math.max(0, Math.min(mid.length - 1, ri + (k % 3) - 1))];
      const sq = FILES[ff] + String(rr);
      if (used.has(sq)) continue;
      used.add(sq);
      out.push({ square: sq, kind: "wall", look: "mountain" });
    }
  }
  return out;
}

function publicPeer(p) {
  return {
    id: p.id,
    name: p.name,
    portrait: p.portrait || "primarch",
    seat: p.seat,
    seen: p.seen,
  };
}

function payload() {
  const peers = [...lobby.peers.values()].sort((a, b) => a.joinedAt - b.joinedAt).map(publicPeer);
  return {
    ok: true,
    cap: CAP,
    hostId: lobby.hostId,
    scale: lobby.scale,
    started: lobby.started,
    mountains: lobby.mountains,
    peers,
    seq: lobby.seq,
    events: lobby.events.slice(-48),
    snapshot: lobby.snapshot,
  };
}

function handle(body) {
  const now = Date.now();
  prune(now);
  const op = String(body.op || "");
  const peer = String(body.peer || "").slice(0, 64);
  const name = String(body.name || "Challenger").slice(0, 24);

  if (op === "join") {
    let p = lobby.peers.get(peer);
    if (!p) {
      if (lobby.peers.size >= CAP) {
        return { ok: false, error: "Lobby is full (2 players).", ...payload() };
      }
      if (lobby.started && lobby.peers.size >= CAP) {
        return { ok: false, error: "Match already underway.", ...payload() };
      }
      const seat = lobby.peers.size === 0 ? "w" : "b";
      p = {
        id: peer,
        name,
        portrait: String(body.portrait || "primarch").slice(0, 32),
        seat,
        seen: now,
        joinedAt: now,
      };
      lobby.peers.set(peer, p);
      if (!lobby.hostId) lobby.hostId = peer;
    } else {
      p.name = name || p.name;
      p.seen = now;
      if (body.portrait) p.portrait = String(body.portrait).slice(0, 32);
    }
    return { ok: true, self: peer, seat: p.seat, ...payload() };
  }
  if (op === "leave") {
    lobby.peers.delete(peer);
    prune(now);
    return { ok: true };
  }
  if (op === "settings") {
    if (peer !== lobby.hostId) return { ok: false, error: "Only the host sets the board.", ...payload() };
    const scale = Math.max(1, Math.min(3, Number(body.scale) || 1));
    lobby.scale = scale;
    return { ok: true, ...payload() };
  }
  if (op === "start") {
    if (peer !== lobby.hostId) return { ok: false, error: "Only the host can start.", ...payload() };
    if (lobby.peers.size < 2) return { ok: false, error: "Need two players.", ...payload() };
    const scale = Math.max(1, Math.min(3, Number(body.scale) || lobby.scale || 1));
    lobby.scale = scale;
    lobby.mountains = makeMountains(scale);
    lobby.started = true;
    lobby.seq += 1;
    lobby.events.push({ seq: lobby.seq, kind: "start", scale, mountains: lobby.mountains, at: now });
    return { ok: true, ...payload() };
  }
  if (op === "move") {
    const p = lobby.peers.get(peer);
    if (!p) return { ok: false, error: "not in lobby" };
    p.seen = now;
    lobby.seq += 1;
    const ev = { seq: lobby.seq, kind: "move", from: body.from, to: body.to, by: peer, seat: p.seat, at: now };
    lobby.events.push(ev);
    if (lobby.events.length > 80) lobby.events.splice(0, lobby.events.length - 80);
    return { ok: true, ...payload() };
  }
  if (op === "sync") {
    const p = lobby.peers.get(peer);
    if (!p) return { ok: false, error: "not in lobby" };
    p.seen = now;
    lobby.snapshot = body.snapshot || lobby.snapshot;
    return { ok: true, ...payload() };
  }
  if (op === "reset") {
    if (peer !== lobby.hostId) return { ok: false, error: "host only" };
    lobby.started = false;
    lobby.snapshot = null;
    lobby.mountains = [];
    lobby.events = [];
    return { ok: true, ...payload() };
  }
  return { ok: false, error: "unknown op" };
}

module.exports = function chessLobby(req, res) {
  const url = new URL(req.url, "http://local");
  if (req.method === "GET") {
    prune(Date.now());
    const peer = url.searchParams.get("peer") || "";
    if (peer && lobby.peers.has(peer)) lobby.peers.get(peer).seen = Date.now();
    return json(res, payload());
  }
  const finish = (body) => json(res, handle(body || {}));
  if (req.readableEnded || (req.body != null && typeof req.body === "object" && !Buffer.isBuffer(req.body))) {
    return finish(req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body) ? req.body : {});
  }
  let buf = "";
  req.on("data", (c) => {
    buf += c;
    if (buf.length > 200_000) req.destroy();
  });
  req.on("end", () => {
    try {
      finish(JSON.parse(buf || "{}"));
    } catch {
      json(res, { ok: false, error: "bad json" }, 400);
    }
  });
};
