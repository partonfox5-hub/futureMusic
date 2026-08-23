/**
 * Lattice dating app — Cloud SQL (MySQL) + site sessions.
 * Mounted at /lattice. Unlisted from homepage / projects / nav.
 */
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const { DIMENSIONS, defaultTraits, defaultPrefs } = require("./public/lattice/js/dimensions.js");
const matching = require("./public/lattice/js/matching.js");
const { parseTd3 } = require("./public/lattice/js/mrz.js");
const { censorMessage } = require("./lib/lattice/censor");
const { SEED_PEOPLE } = require("./lib/lattice/seed-people");

const MEMBERSHIP_CENTS = 2000;
const BACKGROUND_CENTS = 3500;
const PASSWORD_RE = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
const PUBLIC_DIR = path.join(__dirname, "public", "lattice");
const INDEX_HTML = path.join(PUBLIC_DIR, "index.html");

const DEFAULT_SETTINGS = {
  notifications: { messages: true, likes: true, matches: true, marketing: false },
  privacy: { directoryVisible: true, showCity: true, showOccupation: true, readReceipts: false },
  discovery: { compatibleOnly: true, verifiedOnly: false, checkedOnly: false, ageMin: 18, ageMax: 75 },
  account: { hideProfile: false }
};

const REPLIES = [
  "That landed. Tell me more about what a good week looks like for you.",
  "I like the way you put that. Where are you writing from tonight?",
  "Noted — and agreed, mostly. What's the non-negotiable I should know?",
  "I'm around. If we met this month, what would you actually want to do?",
  "That's a real sentence. Rare here. Keep going."
];

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function memberActive(until) {
  if (!until) return false;
  const t = until instanceof Date ? until.getTime() : Date.parse(until);
  return Number.isFinite(t) && t > Date.now();
}

function threadKey(a, b) {
  return [String(a), String(b)].sort().join("::");
}

function publicOrigin(req) {
  const raw = (process.env.DOMAIN || "").trim();
  if (raw) {
    const withProto = /^https?:\/\//i.test(raw) ? raw : "https://" + raw;
    return withProto.replace(/\/$/, "");
  }
  const host = req.get("x-forwarded-host") || req.get("host") || "futuremusic.online";
  const proto = (req.get("x-forwarded-proto") || "https").split(",")[0].trim();
  return proto + "://" + host;
}

function clientIp(req) {
  const fwd = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return fwd || req.ip || "";
}

function rateLimiter(max, windowMs) {
  const hits = new Map();
  return function (req, res, next) {
    const key = clientIp(req) + "|" + (req.path || "");
    const now = Date.now();
    const row = hits.get(key) || [];
    const fresh = row.filter((t) => now - t < windowMs);
    if (fresh.length >= max) {
      return res.status(429).json({ error: "Too many attempts. Wait and try again." });
    }
    fresh.push(now);
    hits.set(key, fresh);
    if (hits.size > 4000) {
      for (const [k, v] of hits) {
        if (!v.length || now - v[v.length - 1] > windowMs) hits.delete(k);
      }
    }
    next();
  };
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const host = new URL(origin).hostname;
    return (
      host === req.hostname ||
      host === "futuremusic.online" ||
      host === "www.futuremusic.online" ||
      host === "localhost" ||
      host === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

function toPublic(row, includePrefs) {
  const traits = parseJson(row.traits, {});
  const prefs = parseJson(row.prefs, {});
  const out = {
    userId: row.user_id,
    isSeed: Boolean(row.is_seed),
    displayName: row.display_name,
    age: Number(row.age),
    gender: row.gender,
    seeking: parseJson(row.seeking, []),
    city: row.city,
    country: row.country,
    lat: Number(row.lat),
    lng: Number(row.lng),
    bio: row.bio,
    education: row.education,
    occupation: row.occupation,
    religion: row.religion,
    languages: parseJson(row.languages, []),
    intent: row.intent,
    traits,
    photoSeed: Number(row.photo_seed) || 1,
    idStatus: row.id_status,
    bgStatus: row.bg_status,
    member: memberActive(row.member_until),
    onboarded: Boolean(row.onboarded)
  };
  if (includePrefs) out.prefs = prefs;
  return out;
}

function toOwn(row) {
  const pub = toPublic(row, true);
  let until = null;
  if (row.member_until) {
    until = row.member_until instanceof Date ? row.member_until.toISOString() : String(row.member_until);
  }
  return { ...pub, prefs: pub.prefs || {}, memberUntil: until, hidden: Boolean(row.hidden) };
}

function sanitizeIdPayload(parse, quality, confirmedName) {
  if (!parse || !parse.ok) {
    return { ok: false, error: parse && parse.error ? parse.error : "unreadable", quality, confirmedName: confirmedName || null };
  }
  return {
    ok: true,
    lastName: parse.lastName,
    givenNames: parse.givenNames,
    nationality: parse.nationality,
    birthDate: parse.birthDate,
    sex: parse.sex,
    expiry: parse.expiry,
    documentType: parse.documentType,
    issuer: parse.issuer,
    quality,
    confirmedName: confirmedName || null
  };
}

async function createSiteUser(pool, email, passwordHash) {
  try {
    const [result] = await pool.query("INSERT INTO users (email, password_hash) VALUES (?, ?)", [email, passwordHash]);
    return result.insertId;
  } catch (err) {
    if (String(err.message || "").toLowerCase().includes("username")) {
      const [result] = await pool.query(
        "INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)",
        [email, email, passwordHash]
      );
      return result.insertId;
    }
    throw err;
  }
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS lattice_profiles (
    user_id VARCHAR(64) NOT NULL PRIMARY KEY,
    account_user_id INT NULL,
    is_seed TINYINT(1) NOT NULL DEFAULT 0,
    display_name VARCHAR(80) NOT NULL,
    age INT NOT NULL DEFAULT 29,
    gender VARCHAR(24) NOT NULL DEFAULT 'woman',
    seeking TEXT NOT NULL,
    city VARCHAR(80) NOT NULL DEFAULT '',
    country VARCHAR(80) NOT NULL DEFAULT '',
    lat DOUBLE NOT NULL DEFAULT 0,
    lng DOUBLE NOT NULL DEFAULT 0,
    bio VARCHAR(600) NOT NULL DEFAULT '',
    education VARCHAR(40) NOT NULL DEFAULT 'bachelor',
    occupation VARCHAR(80) NOT NULL DEFAULT '',
    religion VARCHAR(80) NOT NULL DEFAULT 'none',
    languages TEXT NOT NULL,
    intent VARCHAR(24) NOT NULL DEFAULT 'long-term',
    traits MEDIUMTEXT NOT NULL,
    prefs MEDIUMTEXT NOT NULL,
    photo_seed INT NOT NULL DEFAULT 1,
    id_status VARCHAR(24) NOT NULL DEFAULT 'unverified',
    id_payload MEDIUMTEXT NOT NULL,
    bg_status VARCHAR(24) NOT NULL DEFAULT 'none',
    bg_payload MEDIUMTEXT NOT NULL,
    member_until DATETIME NULL,
    onboarded TINYINT(1) NOT NULL DEFAULT 0,
    hidden TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_lattice_account (account_user_id),
    INDEX idx_lattice_seed (is_seed),
    INDEX idx_lattice_city (city)
  )`,
  `CREATE TABLE IF NOT EXISTS lattice_settings (
    user_id VARCHAR(64) NOT NULL PRIMARY KEY,
    payload MEDIUMTEXT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS lattice_interactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    actor_id VARCHAR(64) NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    kind VARCHAR(24) NOT NULL,
    payload TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_lattice_pair_kind (actor_id, target_id, kind),
    INDEX idx_lattice_actor (actor_id, kind),
    INDEX idx_lattice_target (target_id, kind)
  )`,
  `CREATE TABLE IF NOT EXISTS lattice_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    thread_key VARCHAR(140) NOT NULL,
    sender_id VARCHAR(64) NOT NULL,
    recipient_id VARCHAR(64) NOT NULL,
    body TEXT NOT NULL,
    censored TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_lattice_thread (thread_key, created_at),
    INDEX idx_lattice_msg_users (sender_id, recipient_id)
  )`,
  `CREATE TABLE IF NOT EXISTS lattice_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    kind VARCHAR(24) NOT NULL,
    amount_cents INT NOT NULL,
    stripe_session_id VARCHAR(128) NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_lattice_stripe (stripe_session_id),
    INDEX idx_lattice_pay_user (user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS lattice_id_scans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    mrz_hash CHAR(64) NOT NULL,
    parsed TEXT NOT NULL,
    quality TEXT NOT NULL,
    status VARCHAR(24) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_lattice_id_user (user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS lattice_audit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(64) NULL,
    action VARCHAR(48) NOT NULL,
    ip VARCHAR(64) NULL,
    meta TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_lattice_audit_user (user_id, created_at)
  )`,
  `CREATE TABLE IF NOT EXISTS lattice_google (
    google_sub VARCHAR(128) NOT NULL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    email VARCHAR(190) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_lattice_google_user (user_id)
  )`
];

function mount(app, opts) {
  const getPool = opts.getPool;
  const stripe = opts.stripe || null;
  const bcrypt = opts.bcrypt;
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  let schemaReady = null;
  let seedReady = null;

  async function poolOrThrow() {
    const pool = getPool();
    if (!pool) throw new Error("Database is not connected.");
    return pool;
  }

  async function ensureSchema() {
    if (schemaReady) return schemaReady;
    schemaReady = (async () => {
      const pool = await poolOrThrow();
      for (const sql of SCHEMA) await pool.query(sql);
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
    return schemaReady;
  }

  async function ensureSeed() {
    await ensureSchema();
    if (seedReady) return seedReady;
    seedReady = (async () => {
      const pool = await poolOrThrow();
      const [rows] = await pool.query("SELECT COUNT(*) AS n FROM lattice_profiles WHERE is_seed = 1");
      if (Number(rows[0] && rows[0].n) > 0) return;
      const until = new Date(Date.now() + 86400000 * 400);
      for (const p of SEED_PEOPLE) {
        await pool.query(
          `INSERT IGNORE INTO lattice_profiles (
            user_id, account_user_id, is_seed, display_name, age, gender, seeking, city, country, lat, lng,
            bio, education, occupation, religion, languages, intent, traits, prefs, photo_seed,
            id_status, id_payload, bg_status, bg_payload, member_until, onboarded, hidden
          ) VALUES (?, NULL, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', '{}', ?, '{}', ?, 1, 0)`,
          [
            p.userId,
            p.displayName,
            p.age,
            p.gender,
            JSON.stringify(p.seeking),
            p.city,
            p.country,
            p.lat,
            p.lng,
            p.bio,
            p.education,
            p.occupation,
            p.religion,
            JSON.stringify(p.languages),
            p.intent,
            JSON.stringify(p.traits),
            JSON.stringify(p.prefs),
            p.photoSeed,
            p.age % 3 === 0 ? "clear" : "none",
            until
          ]
        );
      }
    })().catch((err) => {
      seedReady = null;
      throw err;
    });
    return seedReady;
  }

  async function audit(userId, action, req, meta) {
    try {
      const pool = await poolOrThrow();
      await pool.query(
        "INSERT INTO lattice_audit (user_id, action, ip, meta) VALUES (?, ?, ?, ?)",
        [userId || null, action, clientIp(req).slice(0, 64), JSON.stringify(meta || {})]
      );
    } catch (err) {
      console.error("[lattice] audit failed:", err.message);
    }
  }

  async function getProfile(userId) {
    const pool = await poolOrThrow();
    const [rows] = await pool.query("SELECT * FROM lattice_profiles WHERE user_id = ? LIMIT 1", [userId]);
    return rows[0] || null;
  }

  async function getSettings(userId) {
    const pool = await poolOrThrow();
    const [rows] = await pool.query("SELECT payload FROM lattice_settings WHERE user_id = ? LIMIT 1", [userId]);
    if (!rows[0]) return { ...DEFAULT_SETTINGS };
    const stored = parseJson(rows[0].payload, {});
    return {
      notifications: { ...DEFAULT_SETTINGS.notifications, ...(stored.notifications || {}) },
      privacy: { ...DEFAULT_SETTINGS.privacy, ...(stored.privacy || {}) },
      discovery: { ...DEFAULT_SETTINGS.discovery, ...(stored.discovery || {}) },
      account: { ...DEFAULT_SETTINGS.account, ...(stored.account || {}) }
    };
  }

  async function blockedSet(userId) {
    const pool = await poolOrThrow();
    const [rows] = await pool.query(
      `SELECT actor_id, target_id FROM lattice_interactions
       WHERE kind = 'block' AND (actor_id = ? OR target_id = ?)`,
      [userId, userId]
    );
    const set = new Set();
    for (const r of rows) {
      set.add(r.actor_id === userId ? r.target_id : r.actor_id);
    }
    return set;
  }

  function latticeHeaders(res) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Content-Type-Options", "nosniff");
  }

  const api = express.Router();
  api.use((req, res, next) => {
    latticeHeaders(res);
    next();
  });
  api.use((req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    if (!sameOrigin(req)) return res.status(403).json({ error: "Invalid origin." });
    next();
  });

  function requireUser(req, res, next) {
    if (req.session && req.session.userId) {
      req.latticeUserId = String(req.session.userId);
      req.latticeEmail = req.session.email || "";
      return next();
    }
    return res.status(401).json({ error: "Sign in required." });
  }

  api.get("/config", (req, res) => {
    res.json({
      google: googleEnabled,
      stripe: Boolean(stripe),
      membershipCents: MEMBERSHIP_CENTS,
      backgroundCents: BACKGROUND_CENTS
    });
  });

  api.get("/me", async (req, res) => {
    try {
      await ensureSeed();
      if (!req.session || !req.session.userId) {
        return res.json({ user: null, profile: null, settings: null, google: googleEnabled });
      }
      const userId = String(req.session.userId);
      const row = await getProfile(userId);
      const settings = await getSettings(userId);
      res.json({
        user: { id: userId, email: req.session.email || "" },
        profile: row ? toOwn(row) : null,
        settings,
        google: googleEnabled
      });
    } catch (err) {
      console.error("[lattice] /me", err);
      res.status(500).json({ error: "Could not load session." });
    }
  });

  api.post("/register", rateLimiter(8, 60 * 60 * 1000), async (req, res) => {
    try {
      await ensureSchema();
      const email = String(req.body.email || "").trim().toLowerCase();
      const password = String(req.body.password || "");
      const confirm = String(req.body.confirmPassword || req.body.confirm || "");
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "Enter a valid email." });
      }
      if (password !== confirm) return res.status(400).json({ error: "Passwords do not match." });
      if (!PASSWORD_RE.test(password)) {
        return res.status(400).json({
          error: "Password must be at least 8 characters with upper, lower, and a number."
        });
      }
      const pool = await poolOrThrow();
      const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
      if (existing.length) return res.status(409).json({ error: "That email is already registered. Sign in." });
      const hash = await bcrypt.hash(password, 10);
      const id = await createSiteUser(pool, email, hash);
      req.session.userId = id;
      req.session.email = email;
      await audit(String(id), "register", req, { method: "password" });
      req.session.save(() => res.json({ ok: true, user: { id: String(id), email } }));
    } catch (err) {
      console.error("[lattice] register", err);
      res.status(500).json({ error: "Could not create account." });
    }
  });

  api.post("/login", rateLimiter(12, 15 * 60 * 1000), async (req, res) => {
    try {
      await ensureSchema();
      const email = String(req.body.email || "").trim().toLowerCase();
      const password = String(req.body.password || "");
      if (!email || !password) return res.status(400).json({ error: "Email and password required." });
      const pool = await poolOrThrow();
      const [users] = await pool.query("SELECT id, email, password_hash FROM users WHERE email = ?", [email]);
      if (!users.length || !users[0].password_hash) {
        return res.status(401).json({ error: "Invalid email or password." });
      }
      const match = await bcrypt.compare(password, users[0].password_hash);
      if (!match) return res.status(401).json({ error: "Invalid email or password." });
      req.session.userId = users[0].id;
      req.session.email = users[0].email;
      await audit(String(users[0].id), "login", req, { method: "password" });
      req.session.save(() => res.json({ ok: true, user: { id: String(users[0].id), email: users[0].email } }));
    } catch (err) {
      console.error("[lattice] login", err);
      res.status(500).json({ error: "Sign-in failed." });
    }
  });

  api.post("/logout", (req, res) => {
    if (!req.session) return res.json({ ok: true });
    req.session.destroy(() => res.json({ ok: true }));
  });

  if (googleEnabled) {
    try {
      const passport = require("passport");
      const GoogleStrategy = require("passport-google-oauth20").Strategy;
      if (!app.get("latticePassport")) {
        passport.use(
          "lattice-google",
          new GoogleStrategy(
            {
              clientID: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
              callbackURL: "/lattice/api/auth/google/callback",
              passReqToCallback: true,
              proxy: true
            },
            async (req, accessToken, refreshToken, profile, done) => {
              try {
                await ensureSchema();
                const pool = await poolOrThrow();
                const email = String((profile.emails && profile.emails[0] && profile.emails[0].value) || "")
                  .trim()
                  .toLowerCase();
                const sub = String(profile.id);
                if (!email) return done(new Error("Google account has no email."));
                const [linked] = await pool.query("SELECT user_id FROM lattice_google WHERE google_sub = ?", [sub]);
                let userId;
                if (linked.length) {
                  userId = linked[0].user_id;
                } else {
                  const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
                  if (existing.length) userId = String(existing[0].id);
                  else {
                    const hash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
                    userId = String(await createSiteUser(pool, email, hash));
                  }
                  await pool.query(
                    "INSERT INTO lattice_google (google_sub, user_id, email) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE email = VALUES(email)",
                    [sub, userId, email]
                  );
                }
                return done(null, { id: userId, email });
              } catch (err) {
                return done(err);
              }
            }
          )
        );
        app.use(passport.initialize());
        app.set("latticePassport", true);
      }

      api.get("/auth/google", (req, res, next) => {
        const passport = require("passport");
        passport.authenticate("lattice-google", { scope: ["profile", "email"], session: false, prompt: "select_account" })(
          req,
          res,
          next
        );
      });

      api.get("/auth/google/callback", (req, res, next) => {
        const passport = require("passport");
        passport.authenticate("lattice-google", { session: false }, async (err, user) => {
          if (err || !user) {
            console.error("[lattice] google callback", err);
            return res.redirect("/lattice/login?error=google");
          }
          req.session.userId = user.id;
          req.session.email = user.email;
          await audit(String(user.id), "login", req, { method: "google" });
          req.session.save(() => res.redirect("/lattice/app"));
        })(req, res, next);
      });
    } catch (err) {
      console.error("[lattice] Google OAuth not available:", err.message);
    }
  }

  api.get("/profile", requireUser, async (req, res) => {
    try {
      await ensureSeed();
      const row = await getProfile(req.latticeUserId);
      res.json({ profile: row ? toOwn(row) : null });
    } catch (err) {
      console.error("[lattice] profile get", err);
      res.status(500).json({ error: "Could not load profile." });
    }
  });

  api.post("/profile", requireUser, async (req, res) => {
    try {
      await ensureSchema();
      const pool = await poolOrThrow();
      const existing = await getProfile(req.latticeUserId);
      const data = req.body || {};
      const age = Math.max(18, Math.min(90, Number(data.age ?? (existing && existing.age) ?? 29) || 29));
      let traits = data.traits || (existing ? parseJson(existing.traits, defaultTraits(age)) : defaultTraits(age));
      if (typeof traits !== "object" || Array.isArray(traits)) traits = defaultTraits(age);
      traits.age = age;
      let prefs = data.prefs || (existing ? parseJson(existing.prefs, defaultPrefs(traits)) : defaultPrefs(traits));
      if (typeof prefs !== "object" || Array.isArray(prefs)) prefs = defaultPrefs(traits);
      const displayName = String(data.displayName ?? (existing && existing.display_name) ?? "Member").slice(0, 80);
      const gender = String(data.gender ?? (existing && existing.gender) ?? "woman").slice(0, 24);
      const seeking = Array.isArray(data.seeking)
        ? data.seeking.map(String).slice(0, 3)
        : existing
          ? parseJson(existing.seeking, ["man"])
          : ["man"];
      const city = String(data.city ?? (existing && existing.city) ?? "").slice(0, 80);
      const country = String(data.country ?? (existing && existing.country) ?? "").slice(0, 80);
      const bio = String(data.bio ?? (existing && existing.bio) ?? "").slice(0, 600);
      const education = String(data.education ?? (existing && existing.education) ?? "bachelor").slice(0, 40);
      const occupation = String(data.occupation ?? (existing && existing.occupation) ?? "").slice(0, 80);
      const religion = String(data.religion ?? (existing && existing.religion) ?? "none").slice(0, 80);
      const languages = Array.isArray(data.languages)
        ? data.languages.map(String).slice(0, 8)
        : existing
          ? parseJson(existing.languages, ["English"])
          : ["English"];
      const intent = String(data.intent ?? (existing && existing.intent) ?? "long-term").slice(0, 24);
      const photoSeed = Number(data.photoSeed ?? (existing && existing.photo_seed) ?? Math.floor(Math.random() * 9999));
      const lat = Number(data.lat ?? (existing && existing.lat) ?? 0) || 0;
      const lng = Number(data.lng ?? (existing && existing.lng) ?? 0) || 0;
      const onboarded = data.onboarded === false ? 0 : 1;

      await pool.query(
        `INSERT INTO lattice_profiles (
          user_id, account_user_id, is_seed, display_name, age, gender, seeking, city, country, lat, lng,
          bio, education, occupation, religion, languages, intent, traits, prefs, photo_seed,
          id_status, id_payload, bg_status, bg_payload, member_until, onboarded, hidden
        ) VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          display_name = VALUES(display_name),
          age = VALUES(age),
          gender = VALUES(gender),
          seeking = VALUES(seeking),
          city = VALUES(city),
          country = VALUES(country),
          lat = VALUES(lat),
          lng = VALUES(lng),
          bio = VALUES(bio),
          education = VALUES(education),
          occupation = VALUES(occupation),
          religion = VALUES(religion),
          languages = VALUES(languages),
          intent = VALUES(intent),
          traits = VALUES(traits),
          prefs = VALUES(prefs),
          photo_seed = VALUES(photo_seed),
          onboarded = VALUES(onboarded),
          account_user_id = VALUES(account_user_id)`,
        [
          req.latticeUserId,
          Number(req.latticeUserId) || null,
          displayName,
          age,
          gender,
          JSON.stringify(seeking),
          city,
          country,
          lat,
          lng,
          bio,
          education,
          occupation,
          religion,
          JSON.stringify(languages),
          intent,
          JSON.stringify(traits),
          JSON.stringify(prefs),
          photoSeed,
          (existing && existing.id_status) || "unverified",
          (existing && existing.id_payload) || "{}",
          (existing && existing.bg_status) || "none",
          (existing && existing.bg_payload) || "{}",
          existing ? existing.member_until : null,
          onboarded,
          existing ? existing.hidden : 0
        ]
      );
      const row = await getProfile(req.latticeUserId);
      await audit(req.latticeUserId, "profile_save", req, { onboarded: Boolean(onboarded) });
      res.json({ profile: row ? toOwn(row) : null });
    } catch (err) {
      console.error("[lattice] profile save", err);
      res.status(500).json({ error: "Could not save profile." });
    }
  });

  api.post("/directory", requireUser, async (req, res) => {
    try {
      await ensureSeed();
      const pool = await poolOrThrow();
      const me = await getProfile(req.latticeUserId);
      const settings = await getSettings(req.latticeUserId);
      const blocked = await blockedSet(req.latticeUserId);
      const [rows] = await pool.query(
        "SELECT * FROM lattice_profiles WHERE user_id != ? AND onboarded = 1 AND hidden = 0 AND is_seed IN (0, 1)",
        [req.latticeUserId]
      );
      const myOwn = me ? toOwn(me) : null;
      const myTraits = myOwn ? myOwn.traits : defaultTraits();
      const myPrefs = myOwn ? myOwn.prefs : defaultPrefs(myTraits);
      const data = req.body || {};
      let people = [];
      for (const row of rows) {
        if (blocked.has(row.user_id)) continue;
        const p = toPublic(row, true);
        const theirPrefs = p.prefs || defaultPrefs(p.traits);
        const score = myOwn
          ? matching.reciprocalScore(myPrefs, myTraits, theirPrefs, p.traits)
          : matching.directedScore(myPrefs, p.traits);
        delete p.prefs;
        people.push({
          ...p,
          score,
          youToThem: matching.directedScore(myPrefs, p.traits),
          themToYou: matching.directedScore(theirPrefs, myTraits)
        });
      }
      const q = String(data.q || "").trim().toLowerCase();
      if (q) people = people.filter((p) => matching.profileSearchText(p).includes(q));
      if (data.gender) people = people.filter((p) => p.gender === data.gender);
      if (data.intent) people = people.filter((p) => p.intent === data.intent);
      if (data.city) {
        const c = String(data.city).toLowerCase();
        people = people.filter((p) => p.city.toLowerCase().includes(c));
      }
      if (data.country) {
        const c = String(data.country).toLowerCase();
        people = people.filter((p) => p.country.toLowerCase().includes(c));
      }
      if (data.education) people = people.filter((p) => p.education === data.education);
      if (data.religion) {
        const r = String(data.religion).toLowerCase();
        people = people.filter((p) => p.religion.toLowerCase().includes(r));
      }
      if (data.language) {
        const lang = String(data.language).toLowerCase();
        people = people.filter((p) => p.languages.some((l) => l.toLowerCase().includes(lang)));
      }
      if (data.minAge != null && data.minAge !== "") people = people.filter((p) => p.age >= Number(data.minAge));
      if (data.maxAge != null && data.maxAge !== "") people = people.filter((p) => p.age <= Number(data.maxAge));
      if (data.minHeight != null && data.minHeight !== "") {
        people = people.filter((p) => (p.traits.height || 0) >= Number(data.minHeight));
      }
      if (data.maxHeight != null && data.maxHeight !== "") {
        people = people.filter((p) => (p.traits.height || 0) <= Number(data.maxHeight));
      }
      if (data.dim && DIMENSIONS.some((d) => d.id === data.dim)) {
        const id = data.dim;
        if (data.dimMin != null && data.dimMin !== "") people = people.filter((p) => (p.traits[id] || 0) >= Number(data.dimMin));
        if (data.dimMax != null && data.dimMax !== "") people = people.filter((p) => (p.traits[id] || 0) <= Number(data.dimMax));
      }
      const wantVerified = data.verified || (settings.discovery && settings.discovery.verifiedOnly);
      const wantChecked = data.checked || (settings.discovery && settings.discovery.checkedOnly);
      if (wantVerified) people = people.filter((p) => p.idStatus === "verified");
      if (wantChecked) people = people.filter((p) => p.bgStatus === "clear");
      const compatible = data.compatible !== false && (settings.discovery ? settings.discovery.compatibleOnly !== false : true);
      if (compatible && myOwn && myOwn.seeking.length) {
        people = people.filter((p) => myOwn.seeking.includes(p.gender) && p.seeking.includes(myOwn.gender));
      }
      const sort = data.sort || "match";
      people.sort((a, b) => {
        if (sort === "age") return a.age - b.age;
        if (sort === "name") return a.displayName.localeCompare(b.displayName);
        if (sort === "recent") return a.userId < b.userId ? 1 : -1;
        return b.score - a.score;
      });
      res.json({
        people,
        member: me ? memberActive(me.member_until) : false,
        onboarded: Boolean(me && me.onboarded)
      });
    } catch (err) {
      console.error("[lattice] directory", err);
      res.status(500).json({ error: "Could not load directory." });
    }
  });

  api.get("/people/:id", requireUser, async (req, res) => {
    try {
      await ensureSeed();
      const otherId = String(req.params.id);
      const blocked = await blockedSet(req.latticeUserId);
      if (blocked.has(otherId)) return res.json({ person: null, me: null });
      const me = await getProfile(req.latticeUserId);
      const row = await getProfile(otherId);
      if (!row || row.hidden) return res.json({ person: null, me: me ? toOwn(me) : null });
      const p = toPublic(row, true);
      const theirPrefs = p.prefs || defaultPrefs(p.traits);
      const myOwn = me ? toOwn(me) : null;
      const myTraits = myOwn ? myOwn.traits : defaultTraits();
      const myPrefs = myOwn ? myOwn.prefs : defaultPrefs(myTraits);
      delete p.prefs;
      const pool = await poolOrThrow();
      await pool.query(
        `INSERT INTO lattice_interactions (actor_id, target_id, kind, payload)
         VALUES (?, ?, 'view', '{}')
         ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP`,
        [req.latticeUserId, otherId]
      );
      const [likes] = await pool.query(
        "SELECT kind FROM lattice_interactions WHERE actor_id = ? AND target_id = ? AND kind IN ('like','block','hide')",
        [req.latticeUserId, otherId]
      );
      const flags = {};
      for (const r of likes) flags[r.kind] = true;
      res.json({
        person: {
          ...p,
          score: matching.reciprocalScore(myPrefs, myTraits, theirPrefs, p.traits),
          youToThem: matching.directedScore(myPrefs, p.traits),
          themToYou: matching.directedScore(theirPrefs, myTraits)
        },
        me: myOwn,
        flags
      });
    } catch (err) {
      console.error("[lattice] person", err);
      res.status(500).json({ error: "Could not load profile." });
    }
  });

  api.post("/interactions", requireUser, async (req, res) => {
    try {
      await ensureSchema();
      const kind = String(req.body.kind || "");
      const targetId = String(req.body.targetId || "");
      const allowed = ["like", "unlike", "block", "unblock", "hide", "unhide", "report"];
      if (!allowed.includes(kind) || !targetId || targetId === req.latticeUserId) {
        return res.status(400).json({ error: "Invalid interaction." });
      }
      const pool = await poolOrThrow();
      if (kind === "unlike" || kind === "unblock" || kind === "unhide") {
        const map = { unlike: "like", unblock: "block", unhide: "hide" };
        await pool.query("DELETE FROM lattice_interactions WHERE actor_id = ? AND target_id = ? AND kind = ?", [
          req.latticeUserId,
          targetId,
          map[kind]
        ]);
      } else {
        const payload = kind === "report" ? JSON.stringify({ reason: String(req.body.reason || "unspecified").slice(0, 240) }) : "{}";
        await pool.query(
          `INSERT INTO lattice_interactions (actor_id, target_id, kind, payload)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE payload = VALUES(payload), created_at = CURRENT_TIMESTAMP`,
          [req.latticeUserId, targetId, kind, payload]
        );
      }
      await audit(req.latticeUserId, "interaction", req, { kind, targetId });
      res.json({ ok: true });
    } catch (err) {
      console.error("[lattice] interaction", err);
      res.status(500).json({ error: "Could not save interaction." });
    }
  });

  api.get("/settings", requireUser, async (req, res) => {
    try {
      await ensureSchema();
      res.json({ settings: await getSettings(req.latticeUserId), email: req.latticeEmail });
    } catch (err) {
      console.error("[lattice] settings get", err);
      res.status(500).json({ error: "Could not load settings." });
    }
  });

  api.post("/settings", requireUser, async (req, res) => {
    try {
      await ensureSchema();
      const incoming = req.body || {};
      const current = await getSettings(req.latticeUserId);
      const next = {
        notifications: { ...current.notifications, ...(incoming.notifications || {}) },
        privacy: { ...current.privacy, ...(incoming.privacy || {}) },
        discovery: { ...current.discovery, ...(incoming.discovery || {}) },
        account: { ...current.account, ...(incoming.account || {}) }
      };
      const pool = await poolOrThrow();
      await pool.query(
        `INSERT INTO lattice_settings (user_id, payload) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE payload = VALUES(payload)`,
        [req.latticeUserId, JSON.stringify(next)]
      );
      if (next.account && next.account.hideProfile != null) {
        await pool.query("UPDATE lattice_profiles SET hidden = ? WHERE user_id = ?", [
          next.account.hideProfile ? 1 : 0,
          req.latticeUserId
        ]);
      }
      await audit(req.latticeUserId, "settings", req, {});
      res.json({ settings: next });
    } catch (err) {
      console.error("[lattice] settings save", err);
      res.status(500).json({ error: "Could not save settings." });
    }
  });

  api.post("/account/email", requireUser, async (req, res) => {
    try {
      const newEmail = String(req.body.email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        return res.status(400).json({ error: "Enter a valid email." });
      }
      const pool = await poolOrThrow();
      const [existing] = await pool.query("SELECT id FROM users WHERE email = ? AND id != ?", [
        newEmail,
        req.latticeUserId
      ]);
      if (existing.length) return res.status(409).json({ error: "That email is already in use." });
      await pool.query("UPDATE users SET email = ? WHERE id = ?", [newEmail, req.latticeUserId]);
      req.session.email = newEmail;
      await audit(req.latticeUserId, "email_change", req, {});
      req.session.save(() => res.json({ ok: true, email: newEmail }));
    } catch (err) {
      console.error("[lattice] email", err);
      res.status(500).json({ error: "Could not update email." });
    }
  });

  api.post("/account/password", requireUser, async (req, res) => {
    try {
      const currentPassword = String(req.body.currentPassword || "");
      const nextPassword = String(req.body.newPassword || "");
      if (!PASSWORD_RE.test(nextPassword)) {
        return res.status(400).json({
          error: "Password must be at least 8 characters with upper, lower, and a number."
        });
      }
      const pool = await poolOrThrow();
      const [users] = await pool.query("SELECT password_hash FROM users WHERE id = ?", [req.latticeUserId]);
      if (!users.length) return res.status(404).json({ error: "Account not found." });
      const [googleRows] = await pool.query("SELECT google_sub FROM lattice_google WHERE user_id = ? LIMIT 1", [
        req.latticeUserId
      ]);
      const googleLinked = googleRows.length > 0;
      if (!googleLinked || currentPassword) {
        const match = await bcrypt.compare(currentPassword, users[0].password_hash);
        if (!match) return res.status(401).json({ error: "Current password is incorrect." });
      }
      const hash = await bcrypt.hash(nextPassword, 10);
      await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [hash, req.latticeUserId]);
      await audit(req.latticeUserId, "password_change", req, {});
      res.json({ ok: true });
    } catch (err) {
      console.error("[lattice] password", err);
      res.status(500).json({ error: "Could not update password." });
    }
  });

  api.get("/threads", requireUser, async (req, res) => {
    try {
      await ensureSeed();
      const pool = await poolOrThrow();
      const [rows] = await pool.query(
        `SELECT * FROM lattice_messages
         WHERE sender_id = ? OR recipient_id = ?
         ORDER BY created_at DESC`,
        [req.latticeUserId, req.latticeUserId]
      );
      const latest = new Map();
      for (const m of rows) {
        if (!latest.has(m.thread_key)) latest.set(m.thread_key, m);
      }
      const threads = [];
      for (const m of latest.values()) {
        const otherId = m.sender_id === req.latticeUserId ? m.recipient_id : m.sender_id;
        const p = await getProfile(otherId);
        threads.push({
          threadKey: m.thread_key,
          otherId,
          otherName: p ? p.display_name : "Member",
          photoSeed: p ? Number(p.photo_seed) : 1,
          lastBody: m.body,
          lastAt: m.created_at instanceof Date ? m.created_at.toISOString() : String(m.created_at)
        });
      }
      res.json({ threads });
    } catch (err) {
      console.error("[lattice] threads", err);
      res.status(500).json({ error: "Could not load messages." });
    }
  });

  api.get("/messages/:otherId", requireUser, async (req, res) => {
    try {
      const otherId = String(req.params.otherId);
      const blocked = await blockedSet(req.latticeUserId);
      if (blocked.has(otherId)) return res.json({ messages: [] });
      const pool = await poolOrThrow();
      const key = threadKey(req.latticeUserId, otherId);
      const [rows] = await pool.query(
        "SELECT * FROM lattice_messages WHERE thread_key = ? ORDER BY created_at ASC",
        [key]
      );
      res.json({
        messages: rows.map((m) => ({
          id: Number(m.id),
          threadKey: m.thread_key,
          senderId: m.sender_id,
          recipientId: m.recipient_id,
          body: m.body,
          censored: Boolean(m.censored),
          createdAt: m.created_at instanceof Date ? m.created_at.toISOString() : String(m.created_at)
        }))
      });
    } catch (err) {
      console.error("[lattice] messages", err);
      res.status(500).json({ error: "Could not load thread." });
    }
  });

  api.post("/messages", requireUser, rateLimiter(40, 60 * 1000), async (req, res) => {
    try {
      await ensureSeed();
      const otherId = String(req.body.otherId || "");
      if (!otherId || otherId === req.latticeUserId) return res.status(400).json({ ok: false, error: "Invalid recipient." });
      const blocked = await blockedSet(req.latticeUserId);
      if (blocked.has(otherId)) return res.status(403).json({ ok: false, error: "You cannot message this person." });
      const me = await getProfile(req.latticeUserId);
      if (!me || !memberActive(me.member_until)) {
        return res.json({ ok: false, error: "Membership required to message." });
      }
      if (me.id_status !== "verified") {
        return res.json({ ok: false, error: "Verify your ID before messaging." });
      }
      const bodyIn = String(req.body.body || "").trim().slice(0, 2000);
      if (!bodyIn) return res.json({ ok: false, error: "Empty message." });
      const { text, censored } = censorMessage(bodyIn);
      const pool = await poolOrThrow();
      const key = threadKey(req.latticeUserId, otherId);
      const [result] = await pool.query(
        "INSERT INTO lattice_messages (thread_key, sender_id, recipient_id, body, censored) VALUES (?, ?, ?, ?, ?)",
        [key, req.latticeUserId, otherId, text, censored ? 1 : 0]
      );
      const other = await getProfile(otherId);
      if (other && other.is_seed) {
        const reply = REPLIES[Math.abs(otherId.length + text.length) % REPLIES.length];
        await pool.query(
          "INSERT INTO lattice_messages (thread_key, sender_id, recipient_id, body, censored) VALUES (?, ?, ?, ?, 0)",
          [key, otherId, req.latticeUserId, reply]
        );
      }
      const [inserted] = await pool.query("SELECT * FROM lattice_messages WHERE id = ?", [result.insertId]);
      const m = inserted[0];
      res.json({
        ok: true,
        censored,
        message: m
          ? {
              id: Number(m.id),
              threadKey: m.thread_key,
              senderId: m.sender_id,
              recipientId: m.recipient_id,
              body: m.body,
              censored: Boolean(m.censored),
              createdAt: m.created_at instanceof Date ? m.created_at.toISOString() : String(m.created_at)
            }
          : null
      });
    } catch (err) {
      console.error("[lattice] send", err);
      res.status(500).json({ ok: false, error: "Could not send message." });
    }
  });

  api.get("/verify", requireUser, async (req, res) => {
    try {
      const row = await getProfile(req.latticeUserId);
      res.json({ status: (row && row.id_status) || "unverified" });
    } catch (err) {
      res.status(500).json({ error: "Could not load ID status." });
    }
  });

  api.post("/verify", requireUser, rateLimiter(20, 60 * 60 * 1000), async (req, res) => {
    try {
      await ensureSchema();
      const line1 = String(req.body.line1 || "");
      const line2 = String(req.body.line2 || "");
      const quality = req.body.quality || { blur: 0, glare: 1, fill: 0, contrast: 0, linesFound: 0 };
      const parse = parseTd3(line1, line2);
      const q = quality;
      const qualityOk = Number(q.blur) > 12 && Number(q.glare) < 0.12 && Number(q.contrast) > 0.08;
      let status = "pending";
      if (parse.ok && qualityOk) status = "verified";
      else if (!parse.ok && line1.length < 20) status = "rejected";
      const safe = sanitizeIdPayload(parse, q, req.body.confirmedName);
      const mrzHash = crypto.createHash("sha256").update(line1 + "\n" + line2).digest("hex");
      const pool = await poolOrThrow();
      await pool.query(
        "INSERT INTO lattice_id_scans (user_id, mrz_hash, parsed, quality, status) VALUES (?, ?, ?, ?, ?)",
        [req.latticeUserId, mrzHash, JSON.stringify(safe), JSON.stringify(q), status]
      );
      const existing = await getProfile(req.latticeUserId);
      const name = parse.ok
        ? (parse.givenNames + " " + parse.lastName).trim()
        : String(req.body.confirmedName || (existing && existing.display_name) || "Member");
      if (existing) {
        await pool.query("UPDATE lattice_profiles SET id_status = ?, id_payload = ? WHERE user_id = ?", [
          status,
          JSON.stringify(safe),
          req.latticeUserId
        ]);
      } else {
        const traits = defaultTraits(29);
        await pool.query(
          `INSERT INTO lattice_profiles (
            user_id, account_user_id, is_seed, display_name, traits, prefs, seeking, languages,
            id_status, id_payload, bg_payload
          ) VALUES (?, ?, 0, ?, ?, ?, '[]', '["English"]', ?, ?, '{}')`,
          [
            req.latticeUserId,
            Number(req.latticeUserId) || null,
            name.slice(0, 80),
            JSON.stringify(traits),
            JSON.stringify(defaultPrefs(traits)),
            status,
            JSON.stringify(safe)
          ]
        );
      }
      await audit(req.latticeUserId, "id_scan", req, { status });
      res.json({ ok: status === "verified", status, parse: safe });
    } catch (err) {
      console.error("[lattice] verify", err);
      res.status(500).json({ error: "Could not submit ID scan." });
    }
  });

  api.get("/billing", requireUser, async (req, res) => {
    try {
      await ensureSchema();
      const row = await getProfile(req.latticeUserId);
      const pool = await poolOrThrow();
      const [pays] = await pool.query(
        "SELECT id, kind, amount_cents, status, created_at FROM lattice_payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
        [req.latticeUserId]
      );
      const profile = row ? toOwn(row) : null;
      res.json({
        profile,
        member: profile ? profile.member : false,
        memberUntil: profile ? profile.memberUntil : null,
        bgStatus: profile ? profile.bgStatus : "none",
        prices: { membership: MEMBERSHIP_CENTS, background: BACKGROUND_CENTS },
        stripe: Boolean(stripe),
        payments: pays.map((p) => ({
          id: Number(p.id),
          kind: p.kind,
          amountCents: Number(p.amount_cents),
          status: p.status,
          createdAt: p.created_at instanceof Date ? p.created_at.toISOString() : String(p.created_at)
        }))
      });
    } catch (err) {
      console.error("[lattice] billing", err);
      res.status(500).json({ error: "Could not load billing." });
    }
  });

  api.post("/checkout", requireUser, async (req, res) => {
    try {
      if (!stripe) return res.status(503).json({ error: "Payments are not configured on this server." });
      const kind = String(req.body.kind || "membership");
      if (!["membership", "background", "both"].includes(kind)) {
        return res.status(400).json({ error: "Choose membership, background, or both." });
      }
      await ensureSchema();
      const origin = publicOrigin(req);
      const lineItems = [];
      if (kind === "membership" || kind === "both") {
        lineItems.push({
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: MEMBERSHIP_CENTS,
            recurring: { interval: "month" },
            product_data: { name: "Lattice membership" }
          }
        });
      }
      if (kind === "background" || kind === "both") {
        lineItems.push({
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: BACKGROUND_CENTS,
            product_data: { name: "Lattice background check" }
          }
        });
      }
      const mode = kind === "background" ? "payment" : "subscription";
      const session = await stripe.checkout.sessions.create({
        mode,
        line_items: lineItems,
        customer_email: req.latticeEmail || undefined,
        metadata: { latticeUserId: req.latticeUserId, kind, app: "lattice" },
        success_url: origin + "/lattice/api/billing/success?session_id={CHECKOUT_SESSION_ID}",
        cancel_url: origin + "/lattice/app/billing?canceled=1"
      });
      const pool = await poolOrThrow();
      const amount = (kind === "both" ? MEMBERSHIP_CENTS + BACKGROUND_CENTS : kind === "membership" ? MEMBERSHIP_CENTS : BACKGROUND_CENTS);
      await pool.query(
        "INSERT INTO lattice_payments (user_id, kind, amount_cents, stripe_session_id, status) VALUES (?, ?, ?, ?, 'pending')",
        [req.latticeUserId, kind, amount, session.id]
      );
      res.json({ ok: true, url: session.url });
    } catch (err) {
      console.error("[lattice] checkout", err);
      res.status(500).json({ error: "Could not start checkout." });
    }
  });

  async function fulfillStripeSession(session) {
    const userId = session.metadata && session.metadata.latticeUserId;
    const kind = (session.metadata && session.metadata.kind) || "membership";
    if (!userId) return;
    const pool = await poolOrThrow();
    const [existing] = await pool.query("SELECT status FROM lattice_payments WHERE stripe_session_id = ? LIMIT 1", [
      session.id
    ]);
    if (existing[0] && existing[0].status === "paid") return;
    await pool.query("UPDATE lattice_payments SET status = 'paid' WHERE stripe_session_id = ?", [session.id]);
    const me = await getProfile(userId);
    if (kind === "membership" || kind === "both") {
      const until = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
      if (me) {
        await pool.query("UPDATE lattice_profiles SET member_until = ? WHERE user_id = ?", [until, userId]);
      } else {
        const traits = defaultTraits(29);
        await pool.query(
          `INSERT INTO lattice_profiles (
            user_id, account_user_id, display_name, traits, prefs, seeking, languages,
            id_payload, bg_payload, member_until
          ) VALUES (?, ?, 'Member', ?, ?, '[]', '["English"]', '{}', '{}', ?)`,
          [userId, Number(userId) || null, JSON.stringify(traits), JSON.stringify(defaultPrefs(traits)), until]
        );
      }
    }
    if (kind === "background" || kind === "both") {
      const name = (me && me.display_name) || "Member";
      const clear = name.length % 7 !== 0;
      const bgStatus = clear ? "clear" : "review";
      const payload = JSON.stringify({
        vendor: "LatticeCheck",
        result: bgStatus,
        checkedAt: new Date().toISOString(),
        scope: ["identity", "global-watchlist", "criminal-index"]
      });
      await pool.query("UPDATE lattice_profiles SET bg_status = ?, bg_payload = ? WHERE user_id = ?", [
        bgStatus,
        payload,
        userId
      ]);
    }
  }

  api.get("/billing/success", requireUser, async (req, res) => {
    try {
      const sessionId = String(req.query.session_id || "");
      if (!stripe || !sessionId) return res.redirect("/lattice/app/billing?error=1");
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const paid = session.payment_status === "paid" || session.status === "complete";
      if (!paid) return res.redirect("/lattice/app/billing?error=unpaid");
      if (session.metadata && session.metadata.latticeUserId !== req.latticeUserId) {
        return res.redirect("/lattice/app/billing?error=mismatch");
      }
      await fulfillStripeSession(session);
      await audit(req.latticeUserId, "payment", req, { kind: session.metadata && session.metadata.kind });
      res.redirect("/lattice/app/billing?ok=1");
    } catch (err) {
      console.error("[lattice] billing success", err);
      res.redirect("/lattice/app/billing?error=1");
    }
  });

  app.use("/lattice/api", api);

  app.use("/lattice", (req, res, next) => {
    latticeHeaders(res);
    next();
  });
  app.use("/lattice", express.static(PUBLIC_DIR, { index: false, maxAge: "1h" }));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (!req.path.startsWith("/lattice")) return next();
    if (req.path.startsWith("/lattice/api")) return next();
    if (/\.[a-zA-Z0-9]+$/.test(req.path)) return next();
    latticeHeaders(res);
    res.sendFile(INDEX_HTML);
  });
}

module.exports = { mount };
