/**
 * Gate mutating / paid endpoints. Cheap public reads stay open.
 * Writes that persist storage or burn third-party quota need a trusted home IP
 * (not Quest User-Agent, not spoofed X-Forwarded-For).
 */
"use strict";

const homeGate = require("./home-gate");

const hits = new Map();

function rateOk(key, max, windowMs) {
  const now = Date.now();
  let arr = hits.get(key);
  if (!arr) arr = [];
  arr = arr.filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    hits.set(key, arr);
    return false;
  }
  arr.push(now);
  hits.set(key, arr);
  return true;
}

function rateLimit(name, max, windowMs) {
  return (req, res, next) => {
    const k = name + ":" + (req.ip || "unknown");
    if (!rateOk(k, max, windowMs)) {
      res.setHeader("Retry-After", String(Math.ceil(windowMs / 1000)));
      return res.status(429).json({ error: "rate_limited" });
    }
    next();
  };
}

/** Bounded public POSTs: merch, login, gameplay signaling. Not paid LLM / GCS maps. */
const PUBLIC_WRITE = [
  /^\/login\/?$/,
  /^\/register\/?$/,
  /^\/logout\/?$/,
  /^\/contact\/?$/,
  /^\/initiate-checkout\/?$/,
  /^\/webhook\/?$/,
  /^\/api\/cart(\/|$)/,
  /^\/api\/game\//,
  /^\/api\/bsa(-test)?\/checkout\/?$/,
  /^\/api\/blockbuild\/checkout\/?$/,
  /^\/api\/shark-game\/checkout\/?$/,
  /^\/api\/chess\//,
  /^\/api\/chess-lobby\/?$/,
  /^\/api\/mmo\/?$/,
  /^\/api\/wish\/?$/,
  /^\/api\/rtc\/?$/,
  /^\/api\/hero-slayer\//,
  /^\/api\/terrarium\//,
  /^\/account\//,
  /^\/api\/justice\/verify-lawyer\/?$/,
  /^\/lattice\/api\/(login|register|logout)\/?$/,
];

const LARGE_JSON = [/^\/api\/horde\/maps\/?$/, /^\/api\/zoom\/maps\/?$/];

function normPath(p) {
  let s = String(p || "/").split("?")[0];
  try {
    s = decodeURIComponent(s);
  } catch {
    /* keep */
  }
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return s || "/";
}

function isPublicWrite(pathname) {
  const p = normPath(pathname);
  return PUBLIC_WRITE.some((re) => re.test(p));
}

function isLargeJsonPath(pathname) {
  return LARGE_JSON.some((re) => re.test(normPath(pathname)));
}

function denyWrite(req, res) {
  res.status(403);
  res.setHeader("Cache-Control", "no-store");
  if (String(req.path || "").startsWith("/api") || String(req.headers.accept || "").includes("json")) {
    return res.json({ error: "forbidden", reason: "write_gated" });
  }
  return res.type("txt").send("Forbidden");
}

function requireHomeWrite(req, res, next) {
  if (homeGate.isTrustedHome(req)) return next();
  return denyWrite(req, res);
}

function middleware(req, res, next) {
  const method = String(req.method || "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return next();
  const p = normPath(req.path);
  if (isPublicWrite(p)) return next();
  if (homeGate.isTrustedHome(req)) return next();
  return denyWrite(req, res);
}

function corsOriginAllowed(origin) {
  if (!origin) return true;
  let u;
  try {
    u = new URL(origin);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:" && u.protocol !== "capacitor:") return false;
  const host = u.hostname.toLowerCase();
  if (host === "futuremusic.online" || host === "www.futuremusic.online") return true;
  if (host === "localhost" || host === "127.0.0.1") return true;
  if (host === "addictinggames.com" || host.endsWith(".addictinggames.com")) return true;
  if (host === "newgrounds.com" || host.endsWith(".newgrounds.com")) return true;
  if (host === "ungrounded.net" || host.endsWith(".ungrounded.net")) return true;
  const gameUrl = process.env.GAME_URL;
  if (gameUrl) {
    try {
      if (origin === gameUrl || host === new URL(gameUrl).hostname.toLowerCase()) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, arr] of hits) {
    const next = arr.filter((t) => now - t < 60 * 60 * 1000);
    if (next.length) hits.set(k, next);
    else hits.delete(k);
  }
}, 5 * 60 * 1000).unref();

module.exports = {
  middleware,
  requireHomeWrite,
  rateLimit,
  rateOk,
  isPublicWrite,
  isLargeJsonPath,
  corsOriginAllowed,
  denyWrite,
};
