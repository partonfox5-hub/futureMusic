/**
 * In-memory WebRTC signaling for the combined New Eden / Fenrest 2-seat voice mesh.
 * GET poll is join+heartbeat+inbox. POST {op:signal|leave}.
 */
const CAP = 2;
const PEER_TTL_MS = 20000;
const SIGNAL_TTL_MS = 60000;
const ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

const rooms = new Map();

function json(res, data, status) {
  res.statusCode = status || 200;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(data));
}

function roomOf(id) {
  const key = String(id || "edenfen").slice(0, 64);
  let r = rooms.get(key);
  if (!r) {
    r = { id: key, peers: new Map(), signals: [], seq: 0 };
    rooms.set(key, r);
  }
  return r;
}

function prune(r, now) {
  for (const [id, p] of r.peers) {
    if (now - p.seen > PEER_TTL_MS) r.peers.delete(id);
  }
  const cut = now - SIGNAL_TTL_MS;
  if (r.signals.length) r.signals = r.signals.filter((s) => s.at > cut);
}

function roster(r) {
  return [...r.peers.values()].map((p) => ({ id: p.id, name: p.name }));
}

function handleGet(url) {
  const room = url.searchParams.get("room") || "edenfen";
  const peer = url.searchParams.get("peer") || "";
  const name = String(url.searchParams.get("name") || "").slice(0, 64);
  const since = Number(url.searchParams.get("since") ?? 0) || 0;
  if (!ID_RE.test(room) || !ID_RE.test(peer)) return { status: 400, body: { error: "invalid query" } };
  const r = roomOf(room);
  const now = Date.now();
  prune(r, now);
  const existing = r.peers.get(peer);
  if (!existing && r.peers.size >= CAP) {
    return {
      status: 200,
      body: { error: "full", cap: CAP, peers: roster(r), signals: [] },
    };
  }
  r.peers.set(peer, { id: peer, name, seen: now });
  const signals = r.signals
    .filter((s) => s.to === peer && s.id > since)
    .slice(0, 200)
    .map((s) => ({ id: s.id, from: s.from, kind: s.kind, payload: s.payload }));
  return { status: 200, body: { peers: roster(r), signals, cap: CAP } };
}

function handlePost(body) {
  const op = body && body.op;
  if (op === "signal") {
    const room = String(body.room || "");
    const from = String(body.from || "");
    const to = String(body.to || "");
    const kind = String(body.kind || "");
    if (!ID_RE.test(room) || !ID_RE.test(from) || !ID_RE.test(to)) return { status: 400, body: { error: "invalid request" } };
    if (kind !== "offer" && kind !== "answer" && kind !== "ice") return { status: 400, body: { error: "invalid request" } };
    let payload = body.payload;
    try {
      if (JSON.stringify(payload).length > 32768) return { status: 400, body: { error: "payload too large" } };
    } catch {
      return { status: 400, body: { error: "invalid request" } };
    }
    const r = roomOf(room);
    r.seq += 1;
    r.signals.push({ id: r.seq, room, from, to, kind, payload, at: Date.now() });
    if (r.signals.length > 400) r.signals.splice(0, r.signals.length - 400);
    return { status: 200, body: { ok: true } };
  }
  if (op === "leave") {
    const room = String(body.room || "");
    const peer = String(body.peer || "");
    if (!ID_RE.test(room) || !ID_RE.test(peer)) return { status: 400, body: { error: "invalid request" } };
    const r = rooms.get(room);
    if (r) r.peers.delete(peer);
    return { status: 200, body: { ok: true } };
  }
  return { status: 400, body: { error: "invalid request" } };
}

module.exports = function starleapRtc(req, res) {
  const url = new URL(req.url, "http://local");
  if (req.method === "GET") {
    const out = handleGet(url);
    return json(res, out.body, out.status);
  }
  if (req.method !== "POST") return json(res, { error: "method not allowed" }, 405);
  const finish = (body) => {
    const out = handlePost(body || {});
    return json(res, out.body, out.status);
  };
  if (req.readableEnded || (req.body != null && typeof req.body === "object" && !Buffer.isBuffer(req.body))) {
    return finish(req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body) ? req.body : {});
  }
  let buf = "";
  req.on("data", (c) => {
    buf += c;
    if (buf.length > 40_000) req.destroy();
  });
  req.on("end", () => {
    let body = {};
    try {
      body = JSON.parse(buf || "{}");
    } catch {
      return json(res, { error: "invalid JSON" }, 400);
    }
    return finish(body);
  });
};

module.exports._reset = () => rooms.clear();
module.exports._handleGet = handleGet;
module.exports._handlePost = handlePost;
module.exports._CAP = CAP;
