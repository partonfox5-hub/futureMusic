/**
 * Express mount for futuremusic.online — New Eden + Fenrest share one
 * two-seat server (combined VR). First human is red-hatted; second is green.
 *   const mmo = require("./starleap-mmo.cjs");
 *   app.use("/api/mmo", mmo);
 */
const CAP = 2;
const ROOM = "eden";
const ALIAS = new Set(["eden", "fenrest", "edenfen", "neweden"]);
const STALE_MS = 12000;
const EVENT_KEEP = 96;
const WISH_CAP = 8;
const HAT = { 0: "red", 1: "green" };
const HUE = { 0: 8, 1: 125 };

const rooms = new Map();

function json(res, data, status) {
  res.statusCode = status || 200;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(data));
}

function parseFill() {
  return "none";
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

function humansOf(r) {
  return [...r.peers.values()].filter((p) => !p.traveler);
}

function prune(r, now) {
  for (const [id, p] of r.peers) {
    if (!p.traveler && now - p.seen > STALE_MS) r.peers.delete(id);
  }
}

function freeSlot(r, keepId) {
  const used = new Set();
  for (const p of r.peers.values()) {
    if (p.traveler) continue;
    if (keepId && p.id === keepId) continue;
    if (p.slot === 0 || p.slot === 1) used.add(p.slot);
  }
  if (!used.has(0)) return 0;
  if (!used.has(1)) return 1;
  return -1;
}

function tickTravelers(r, now) {
  r.lastTick = now;
  for (const p of [...r.peers.values()]) {
    if (p.traveler) r.peers.delete(p.id);
  }
}

function ensureTravelers() {
  /* two-seat coop — no filler bots */
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

function publicPeer(p) {
  return {
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
    slot: p.slot ?? 0,
    hat: p.hat || HAT[p.slot ?? 0] || "red",
    realm: p.realm || "neweden",
    vr: !!p.vr,
    t: p.t,
  };
}

function payload(r, since = 0) {
  return {
    ok: true,
    cap: CAP,
    fill: "none",
    seq: r.seq,
    peers: humansOf(r).map(publicPeer),
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
  parseFill(body.fill);
  const realmRaw = String(body.realm || "").toLowerCase();
  const realm = realmRaw === "fenrest" ? "fenrest" : "neweden";
  const vr = !!body.vr;

  if (op === "join") {
    const existing = r.peers.get(peer);
    if (!existing) {
      const humans = humansOf(r).length;
      if (humans >= CAP && !kickTravelerIfFull(r)) {
        return {
          ok: false,
          error: "Party is full (2 explorers on this server).",
          room: r.id,
          cap: CAP,
          peers: humansOf(r).map(publicPeer),
        };
      }
      const slot = freeSlot(r);
      if (slot < 0) {
        return {
          ok: false,
          error: "Party is full (2 explorers on this server).",
          room: r.id,
          cap: CAP,
          peers: humansOf(r).map(publicPeer),
        };
      }
      r.peers.set(peer, {
        id: peer,
        name: name || "Wanderer",
        traveler: false,
        bot: false,
        x: slot === 0 ? 2 : 4.2,
        y: 0,
        z: slot === 0 ? 16.8 : 15.4,
        yaw: 0,
        vx: 0,
        vz: 0,
        fp: true,
        seen: now,
        slot,
        hat: HAT[slot],
        hue: HUE[slot],
        realm,
        vr,
        t: now,
      });
    } else {
      existing.name = name || existing.name;
      existing.seen = now;
      existing.traveler = false;
      existing.t = now;
      existing.realm = realm || existing.realm;
      existing.vr = vr || existing.vr;
      if (existing.slot !== 0 && existing.slot !== 1) {
        existing.slot = freeSlot(r, existing.id);
        if (existing.slot < 0) existing.slot = 0;
      }
      existing.hat = HAT[existing.slot] || "red";
      existing.hue = HUE[existing.slot] ?? 8;
    }
    tickTravelers(r, now);
    const self = r.peers.get(peer);
    return { ok: true, room: r.id, self: peer, slot: self?.slot ?? 0, hat: self?.hat || "red", ...payload(r, since) };
  }
  if (op === "leave") {
    r.peers.delete(peer);
    return { ok: true };
  }
  if (op === "state") {
    const p = r.peers.get(peer);
    if (!p || p.traveler) return { error: "not joined", ...payload(r, since), ok: false };
    p.x = Number(body.x) || 0;
    p.y = Number(body.y) || 0;
    p.z = Number(body.z) || 0;
    p.yaw = Number(body.yaw) || 0;
    p.vx = Number(body.vx) || 0;
    p.vz = Number(body.vz) || 0;
    p.fp = !!body.fp;
    p.seen = now;
    p.t = now;
    if (body.realm) p.realm = String(body.realm) === "fenrest" ? "fenrest" : "neweden";
    if (body.vr != null) p.vr = !!body.vr;
    prune(r, now);
    tickTravelers(r, now);
    return payload(r, since);
  }
  if (op === "wish") {
    const wish = body.wish;
    if (!wish || !wish.id || !wish.recipe) return { ok: false, error: "bad wish" };
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
    if (!id) return { ok: false, error: "bad id" };
    const w = r.wishes.get(id);
    if (w) w.taken = true;
    pushEvent(r, { kind: "taken", id });
    return payload(r, since);
  }
  return { ok: false, error: "unknown op" };
}

module.exports = function starleapMmo(req, res) {
  const url = new URL(req.url, "http://local");
  const peerQ = url.searchParams.get("peer") || "";
  const sinceQ = Number(url.searchParams.get("since") ?? 0) || 0;
  const roomQ = String(url.searchParams.get("room") || ROOM).toLowerCase();
  if (roomQ && !ALIAS.has(roomQ) && roomQ !== ROOM) {
    /* still share the one combined room */
  }
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
      return json(res, { ok: false, error: "bad json" }, 400);
    }
    const out = handleBody(body, sinceQ);
    return json(res, out, out && out.ok === false && out.error && out.error.startsWith("Party") ? 200 : 200);
  });
};

module.exports._handleBody = handleBody;
module.exports._roomOf = roomOf;
module.exports._CAP = CAP;
module.exports._reset = () => rooms.clear();
