/**
 * Express mount for futuremusic.online — one room, four seats.
 *   const mmo = require("./starleap-mmo.cjs");
 *   app.use("/api/mmo", mmo);
 */
const CAP = 4;
const ROOM = "eden";
const DEMO = 3;
const STALE_MS = 10000;
const EVENT_KEEP = 96;
const WISH_CAP = 8;

const rooms = new Map();

function json(res, data, status) {
  res.statusCode = status || 200;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(data));
}

function parseFill(raw, fallback) {
  if (raw === "none" || raw === "demo" || raw === "full") return raw;
  return fallback || "none";
}

function roomOf() {
  for (const k of [...rooms.keys()]) {
    if (k !== ROOM) rooms.delete(k);
  }
  let r = rooms.get(ROOM);
  if (!r) {
    r = {
      id: ROOM,
      peers: new Map(),
      fill: "none",
      seq: 0,
      events: [],
      wishes: new Map(),
      lastTick: Date.now(),
    };
    rooms.set(ROOM, r);
  }
  return r;
}

function prune(r, now) {
  for (const [id, p] of r.peers) {
    if (!p.traveler && now - p.seen > STALE_MS) r.peers.delete(id);
  }
}

function tickTravelers(r, now) {
  const dt = Math.min(0.25, Math.max(0.016, (now - r.lastTick) / 1000));
  r.lastTick = now;
  for (const p of r.peers.values()) {
    if (!p.traveler) continue;
    p.yaw += Math.sin(now * 0.00055 + p.hue) * 0.85 * dt;
    const spd = 2.2 + (p.hue % 7) * 0.12;
    p.vx = -Math.sin(p.yaw) * spd;
    p.vz = -Math.cos(p.yaw) * spd;
    p.x += p.vx * dt;
    p.z += p.vz * dt;
    if (Math.hypot(p.x, p.z) > 64) p.yaw += Math.PI * 0.55;
    p.y = 0;
    p.t = now;
  }
}

function travelerWant(r) {
  const humans = [...r.peers.values()].filter((p) => !p.traveler).length;
  if (r.fill === "none" || humans === 0) return 0;
  if (r.fill === "demo") return DEMO;
  return Math.max(0, CAP - humans);
}

function ensureTravelers(r, now) {
  const want = travelerWant(r);
  let pack = [...r.peers.values()].filter((p) => p.traveler);
  if (r.fill === "none") {
    for (const p of pack) r.peers.delete(p.id);
    return;
  }
  while (pack.length < want && r.peers.size < CAP) {
    const i = pack.length;
    const id = `tr-${r.id}-${i}`;
    const a = (i / Math.max(1, want)) * Math.PI * 2 + 0.4;
    const peer = {
      id,
      name: `Traveler ${i + 1}`,
      traveler: true,
      bot: true,
      x: Math.cos(a) * 16,
      y: 0,
      z: 20 + Math.sin(a) * 11,
      yaw: a + Math.PI,
      vx: 0,
      vz: 0,
      fp: false,
      seen: now,
      hue: (i * 47 + 12) % 360,
      t: now,
    };
    r.peers.set(id, peer);
    pack.push(peer);
  }
  while (pack.length > want) {
    const last = pack.pop();
    if (last) r.peers.delete(last.id);
  }
}

function kickTravelerIfFull(r) {
  if (r.peers.size < CAP) return true;
  const extra = [...r.peers.values()].find((p) => p.traveler);
  if (!extra) return false;
  r.peers.delete(extra.id);
  return true;
}

function pushEvent(r, ev) {
  r.seq += 1;
  const full = { ...ev, seq: r.seq };
  r.events.push(full);
  if (r.events.length > EVENT_KEEP) r.events.splice(0, r.events.length - EVENT_KEEP);
  return full;
}

function round(n, d = 3) {
  const k = 10 ** d;
  return Math.round(n * k) / k;
}

function payload(r, since = 0) {
  return {
    ok: true,
    cap: CAP,
    fill: r.fill,
    seq: r.seq,
    peers: [...r.peers.values()].map((p) => ({
      id: p.id,
      name: p.name,
      traveler: !!p.traveler,
      bot: !!p.traveler,
      x: round(p.x),
      y: round(p.y),
      z: round(p.z),
      yaw: round(p.yaw, 4),
      vx: round(p.vx),
      vz: round(p.vz),
      fp: !!p.fp,
      hue: p.hue,
      t: p.t,
    })),
    wishes: [...r.wishes.values()],
    events: r.events.filter((e) => e.seq > since).slice(-EVENT_KEEP),
  };
}

function handleBody(body, sinceQ) {
  const r = roomOf();
  const now = Date.now();
  prune(r, now);
  const op = String(body.op || "");
  const peer = String(body.peer || "").slice(0, 64);
  const name = String(body.name || "Wanderer").slice(0, 32);
  const since = Number(body.since ?? sinceQ ?? 0) || 0;
  const fill = parseFill(body.fill ?? body.fillBots, "none");

  if (op === "join") {
    const humans = [...r.peers.values()].filter((p) => !p.traveler).length;
    if (humans === 0) r.fill = fill;
    if (!r.peers.has(peer) && !kickTravelerIfFull(r)) {
      return { error: "World is full (4 explorers, one server).", room: r.id, ...payload(r, since) };
    }
    const existing = r.peers.get(peer);
    if (existing) {
      existing.name = name || existing.name;
      existing.seen = now;
      existing.traveler = false;
      existing.t = now;
    } else {
      r.peers.set(peer, {
        id: peer,
        name: name || "Wanderer",
        traveler: false,
        bot: false,
        x: 2,
        y: 0,
        z: 16.8,
        yaw: 0,
        vx: 0,
        vz: 0,
        fp: true,
        seen: now,
        hue: Math.abs(hash(peer)) % 360,
        t: now,
      });
    }
    ensureTravelers(r, now);
    tickTravelers(r, now);
    return { room: r.id, self: peer, ...payload(r, since) };
  }
  if (op === "leave") {
    r.peers.delete(peer);
    return { ok: true };
  }
  if (op === "state") {
    const p = r.peers.get(peer);
    if (!p || p.traveler) return { error: "not joined", ...payload(r, since) };
    p.x = Number(body.x) || 0;
    p.y = Number(body.y) || 0;
    p.z = Number(body.z) || 0;
    p.yaw = Number(body.yaw) || 0;
    p.vx = Number(body.vx) || 0;
    p.vz = Number(body.vz) || 0;
    p.fp = !!body.fp;
    p.seen = now;
    p.t = now;
    prune(r, now);
    ensureTravelers(r, now);
    tickTravelers(r, now);
    return payload(r, since);
  }
  if (op === "wish") {
    const wish = body.wish;
    if (!wish || !wish.id || !wish.recipe) return { error: "bad wish" };
    if (r.wishes.size >= WISH_CAP && !r.wishes.has(wish.id)) {
      const first = r.wishes.keys().next().value;
      if (first) r.wishes.delete(first);
    }
    r.wishes.set(wish.id, wish);
    pushEvent(r, { kind: "wish", from: peer, wish });
    return payload(r, since);
  }
  if (op === "taken") {
    const id = String(body.id || "");
    if (!id) return { error: "bad id" };
    const w = r.wishes.get(id);
    if (w) w.taken = true;
    pushEvent(r, { kind: "taken", id });
    return payload(r, since);
  }
  return { error: "unknown op" };
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

module.exports = function starleapMmo(req, res) {
  const url = new URL(req.url, "http://local");
  const peerQ = url.searchParams.get("peer") || "";
  const sinceQ = Number(url.searchParams.get("since") ?? 0) || 0;
  if (req.method === "GET") {
    const r = roomOf();
    const now = Date.now();
    prune(r, now);
    if (peerQ) {
      const p = r.peers.get(peerQ);
      if (p && !p.traveler) {
        p.seen = now;
        p.t = now;
      }
    }
    ensureTravelers(r, now);
    tickTravelers(r, now);
    return json(res, payload(r, sinceQ));
  }
  let buf = "";
  req.on("data", (c) => {
    buf += c;
    if (buf.length > 64_000) req.destroy();
  });
  req.on("end", () => {
    let body = {};
    try {
      body = JSON.parse(buf || "{}");
    } catch {
      return json(res, { error: "bad json" }, 400);
    }
    return json(res, handleBody(body, sinceQ));
  });
};
