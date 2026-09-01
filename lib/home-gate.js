/**
 * Home-network gate for unlisted / in-progress titles.
 * Public: Projects listings, Planmorpher, and the rest of the site.
 * Restricted: VR packs and other titles not listed on Projects.
 *
 * Quest Browser often arrives as IPv6 (or a later hop) while the laptop
 * is IPv4, so we match every forwarded address and the home IPv4 /24.
 * Quest / Oculus Browser is also allowed — those titles are played on the headset.
 *
 * Extra IPs: HOME_IPS=1.2.3.4,5.6.7.8
 */
"use strict";

const HOME_IPS = new Set([
  "47.224.115.198", // owner WAN (also chess alpha owner)
  "127.0.0.1",
  "::1",
]);

(process.env.HOME_IPS || "")
  .split(/[,;\s]+/)
  .map((s) => s.trim())
  .filter(Boolean)
  .forEach((ip) => {
    const n = normalizeIp(ip);
    if (n) HOME_IPS.add(n);
  });

function normalizeIp(raw) {
  let ip = String(raw || "").trim().toLowerCase();
  if (!ip || ip === "unknown" || ip === "null") return "";
  ip = ip.replace(/^"|"$/g, "");
  ip = ip.replace(/^for=/i, "").replace(/^proto=.*$/i, "");
  if (ip.startsWith("[")) {
    const end = ip.indexOf("]");
    if (end > 0) ip = ip.slice(1, end);
  }
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.split(":")[0];
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  const pct = ip.indexOf("%");
  if (pct >= 0) ip = ip.slice(0, pct);
  return ip;
}

function ipv4Parts(ip) {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return null;
  const p = [+m[1], +m[2], +m[3], +m[4]];
  if (p.some((n) => n > 255)) return null;
  return p;
}

function same24(a, b) {
  const pa = ipv4Parts(a);
  const pb = ipv4Parts(b);
  if (!pa || !pb) return false;
  return pa[0] === pb[0] && pa[1] === pb[1] && pa[2] === pb[2];
}

function ipv6Hextets(ip) {
  if (!ip.includes(":")) return null;
  if (ipv4Parts(ip)) return null;
  let s = ip;
  if (s.includes(".")) {
    const last = s.lastIndexOf(":");
    s = s.slice(0, last);
  }
  const [left, right] = s.split("::");
  let parts = left.split(":").filter(Boolean);
  const tail = right != null ? right.split(":").filter(Boolean) : [];
  while (parts.length + tail.length < 8) parts.push("0");
  parts = parts.concat(tail);
  if (parts.length !== 8) return null;
  return parts.map((h) => parseInt(h, 16) || 0);
}

function same64(a, b) {
  const pa = ipv6Hextets(a);
  const pb = ipv6Hextets(b);
  if (!pa || !pb) return false;
  return pa[0] === pb[0] && pa[1] === pb[1] && pa[2] === pb[2] && pa[3] === pb[3];
}

function collectIps(req) {
  const out = [];
  const add = (v) => {
    const ip = normalizeIp(v);
    if (ip && !out.includes(ip)) out.push(ip);
  };
  String(req.headers["x-forwarded-for"] || "")
    .split(",")
    .forEach(add);
  String(req.headers["forwarded"] || "")
    .split(",")
    .forEach((part) => {
      const m = /for=("?\[?)([^\]";,]+)/i.exec(part);
      if (m) add(m[2]);
    });
  add(req.headers["x-real-ip"]);
  add(req.headers["cf-connecting-ip"]);
  add(req.headers["true-client-ip"]);
  add(req.ip);
  add(req.socket && req.socket.remoteAddress);
  return out;
}

function clientIp(req) {
  return collectIps(req)[0] || "";
}

function ipIsHome(ip) {
  if (!ip) return false;
  if (HOME_IPS.has(ip)) return true;
  if (ip === "localhost" || ip.startsWith("127.")) return true;
  for (const home of HOME_IPS) {
    if (same24(home, ip)) return true;
    if (same64(home, ip)) return true;
  }
  return false;
}

function isQuestHeadset(req) {
  const ua = String(req.headers["user-agent"] || "");
  return /OculusBrowser|Quest\s*[0-9]|Pacific|Miramar|FBAN\/Oculus|Quest 2|Quest 3|Quest Pro/i.test(ua);
}

function isHomeLan(req) {
  return collectIps(req).some(ipIsHome);
}

function isHomeNetwork(req) {
  const ips = collectIps(req);
  if (ips.some(ipIsHome)) return true;
  // Quest Browser often prefers IPv6 and never presents the laptop's IPv4.
  // These unlisted titles are meant to be played on the owner's headset.
  if (isQuestHeadset(req)) return true;
  return false;
}

function normPath(p) {
  let s = String(p || "/").split("?")[0];
  try {
    s = decodeURIComponent(s);
  } catch {
    /* keep raw */
  }
  s = s.toLowerCase();
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return s || "/";
}

function starts(p, prefix) {
  return p === prefix || p.startsWith(prefix + "/");
}

/** Creature Chess + Planmorpher stay world-readable (and Hero Slayer splash art). */
const PUBLIC_GAME_PREFIXES = [
  "/games/character-chess",
  "/games/planmorpher",
  "/games/hero-slayer-splash",
  "/games/blockbuild",
  "/games/iridex-cards",
  "/games/battle-sphere-arena",
];

const RESTRICTED_PREFIXES = [
  "/horde",
  "/blockbuild",
  "/cards",
  "/shark",
  "/fenrest",
  "/neweden",
  "/planetry",
  "/planetary",
  "/zoom",
  "/zoommaps",
  "/rampart",
  "/lattice",
  "/terrarium",
  "/folk",
  "/radio",
  "/api/mmo",
  "/api/wish",
  "/api/rtc",
  "/api/zoom",
  "/api/shark",
  "/api/rampart",
];

function isRestrictedPath(pathname) {
  const p = normPath(pathname);
  if (starts(p, "/bricks")) return false;
  if (starts(p, "/test-q4m8w2k7")) return false;
  if (p.startsWith("/test-")) return true;
  for (const ok of PUBLIC_GAME_PREFIXES) {
    if (starts(p, ok)) return false;
  }
  if (p === "/games" || p.startsWith("/games/")) return true;
  for (const r of RESTRICTED_PREFIXES) {
    if (starts(p, r)) return true;
  }
  return false;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function restrictedHtml(seenIps) {
  const ref = (seenIps || []).slice(0, 4).join(" · ");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Restricted Access — coming soon</title>
  <link rel="icon" type="image/png" href="/images/logo.png" />
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Raleway:wght@400;600&display=swap" rel="stylesheet" />
  <style>
    html, body { margin: 0; min-height: 100%; background: #050505; color: #f2f1ee; font-family: Raleway, system-ui, sans-serif; }
    body { display: flex; align-items: center; justify-content: center; padding: 32px 16px; }
    .sign {
      width: min(440px, 100%);
      text-align: center;
      padding: 36px 28px 32px;
      background: #16120e;
      border: 1px solid rgba(212, 175, 55, 0.55);
      box-shadow: inset 0 0 0 7px rgba(20, 16, 12, 0.85), 0 0 40px rgba(212, 175, 55, 0.12);
    }
    .kicker {
      margin: 0;
      letter-spacing: 0.32em;
      text-transform: uppercase;
      font-size: 11px;
      color: #d4af37;
      font-weight: 600;
    }
    h1 {
      font-family: Cinzel, Georgia, serif;
      font-size: clamp(28px, 7vw, 40px);
      margin: 12px 0 14px;
      line-height: 1.05;
      font-weight: 700;
      color: #f4efe4;
    }
    p { margin: 0 0 22px; color: #d5cbbd; font-size: 16px; line-height: 1.55; }
    a {
      display: inline-block;
      color: #050505;
      background: #d4af37;
      text-decoration: none;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      font-size: 12px;
      padding: 12px 18px;
    }
    a:hover { background: #fff; }
    .ref { margin-top: 18px; color: #6a645c; font-size: 11px; word-break: break-all; }
  </style>
</head>
<body>
  <div class="sign">
    <p class="kicker">Future Music Collective</p>
    <h1>Restricted Access</h1>
    <p>coming soon!</p>
    <a href="/projects">Projects</a>
    ${ref ? `<p class="ref">${escapeHtml(ref)}</p>` : ""}
  </div>
</body>
</html>`;
}

function sendRestricted(res, req) {
  const ips = req ? collectIps(req) : [];
  res.status(403);
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.type("html").send(restrictedHtml(ips));
}

function middleware(req, res, next) {
  if (!isRestrictedPath(req.path)) return next();
  if (isHomeNetwork(req)) return next();
  return sendRestricted(res, req);
}

module.exports = {
  clientIp,
  collectIps,
  isHomeLan,
  isHomeNetwork,
  isQuestHeadset,
  isRestrictedPath,
  middleware,
  sendRestricted,
  HOME_IPS,
};
