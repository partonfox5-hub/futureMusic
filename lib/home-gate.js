/**
 * Home-network gate for unlisted / in-progress titles.
 * Public: anything on /projects, plus Planmorpher, plus the rest of the site.
 * Restricted: VR packs and other titles not listed on Projects.
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
  .forEach((ip) => HOME_IPS.add(normalizeIp(ip)));

function normalizeIp(raw) {
  let ip = String(raw || "").trim().toLowerCase();
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  const pct = ip.indexOf("%");
  if (pct >= 0) ip = ip.slice(0, pct);
  return ip;
}

function clientIp(req) {
  const xf = String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  const raw = xf || req.ip || (req.socket && req.socket.remoteAddress) || "";
  return normalizeIp(raw);
}

function isHomeNetwork(req) {
  const ip = clientIp(req);
  if (!ip) return false;
  if (HOME_IPS.has(ip)) return true;
  if (ip === "localhost" || ip.startsWith("127.")) return true;
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
];

const RESTRICTED_PREFIXES = [
  "/horde",
  "/blockbuild",
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

function restrictedHtml() {
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
  </style>
</head>
<body>
  <div class="sign">
    <p class="kicker">Future Music Collective</p>
    <h1>Restricted Access</h1>
    <p>coming soon!</p>
    <a href="/projects">Projects</a>
  </div>
</body>
</html>`;
}

function sendRestricted(res) {
  res.status(403);
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.type("html").send(restrictedHtml());
}

function middleware(req, res, next) {
  if (!isRestrictedPath(req.path)) return next();
  if (isHomeNetwork(req)) return next();
  return sendRestricted(res);
}

module.exports = {
  clientIp,
  isHomeNetwork,
  isRestrictedPath,
  middleware,
  sendRestricted,
  HOME_IPS,
};
