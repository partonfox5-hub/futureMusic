"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { rateLimit } = require("./write-gate");

const SKU = "shark-game-quest-apk";
const PRICE = 999;
const validSessionId = (id) => typeof id === "string" && /^cs_(live|test)_[A-Za-z0-9]{10,240}$/.test(id);

function registerSharkStore(app, options) {
  const baseDir = options.baseDir;
  const origin = new URL(options.origin || "https://futuremusic.online").origin;
  if (!origin.startsWith("https://") && options.production) throw new Error("Shark checkout requires HTTPS");
  const apkPath = path.resolve(options.apkPath || path.join(baseDir, "private-downloads", "Shark-Quest.apk"));
  const dataDir = path.resolve(options.dataDir || path.join(baseDir, "private-downloads", "shark-orders"));
  const publicDir = path.resolve(baseDir, "public");
  const inPublic = (p) => {
    const rel = path.relative(publicDir, p);
    return rel === "" || (!rel.startsWith(".." + path.sep) && rel !== ".." && !path.isAbsolute(rel));
  };
  if (inPublic(apkPath) || inPublic(dataDir)) throw new Error("Shark downloads and orders must remain outside public/");
  function hasApk() {
    try {
      const real = fs.realpathSync(apkPath);
      return !inPublic(real) && fs.statSync(real).isFile() && fs.statSync(real).size > 0;
    } catch { return false; }
  }
  const checkoutReady = () => Boolean(options.getStripe()) && hasApk() && (!options.production || options.livePayments === true);
  const allowedOrigins = new Set([origin]);
  if (new URL(origin).hostname === "futuremusic.online") allowedOrigins.add(origin.replace("://futuremusic.online", "://www.futuremusic.online"));
  const pending = new Map();
  const privateHeaders = (res) => res.set({
    "Cache-Control": "private, no-store, max-age=0",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow",
    "X-Content-Type-Options": "nosniff"
  });
  const getSessionId = (req) => req.query.session_id || (req.session && req.session.sharkPurchase);
  function accessError(status, message) { return Object.assign(new Error(message), { status }); }

  // Stripe remains the durable source of ownership. Recheck it for every download,
  // including refunds/disputes; a redirect or browser cookie alone never grants access.
  async function verifyPayment(id) {
    if (!validSessionId(id)) throw accessError(400, "Open your private download page from your purchase confirmation.");
    const stripe = options.getStripe();
    if (!stripe) throw accessError(503, "Payment verification is temporarily unavailable. Please try again shortly.");
    let s;
    try { s = await stripe.checkout.sessions.retrieve(id, { expand: ["payment_intent.latest_charge"] }); }
    catch (err) {
      if (err.code === "resource_missing") throw accessError(403, "This purchase could not be verified.");
      throw accessError(503, "Payment verification is temporarily unavailable. Please try again shortly.");
    }
    const pi = s.payment_intent;
    const charge = pi && typeof pi === "object" && pi.latest_charge;
    if (s.id !== id || s.mode !== "payment" || s.status !== "complete" || s.payment_status !== "paid" ||
        s.currency !== "usd" || s.amount_total !== PRICE || s.livemode !== Boolean(options.production) ||
        !s.metadata || s.metadata.sku !== SKU || s.metadata.type !== "shark_apk" ||
        !pi || pi.status !== "succeeded" || !charge || typeof charge !== "object" ||
        !charge.paid || !charge.captured || charge.refunded || charge.disputed || charge.amount_refunded !== 0) {
      throw accessError(403, "A completed, valid Shark Game purchase is required. If you just paid, refresh this page in a moment or contact support.");
    }
    return s;
  }

  // Both the signed webhook and the return page can fulfill the same purchase.
  // Keep only delivery state locally; no card details or customer profile is saved.
  async function fulfillPaidSession(id) {
    if (pending.has(id)) return pending.get(id);
    const job = (async () => {
      const s = await verifyPayment(id);
      await fs.promises.mkdir(dataDir, { recursive: true, mode: 0o700 });
      if (inPublic(await fs.promises.realpath(dataDir))) throw new Error("Unsafe Shark order directory");
      const file = path.join(dataDir, id + ".json");
      let record;
      try { record = JSON.parse(await fs.promises.readFile(file, "utf8")); }
      catch (err) { if (err.code !== "ENOENT") throw err; }
      record ||= { sessionId: id, fulfilledAt: new Date().toISOString(), emailSent: false };
      const save = async () => {
        const temp = file + "." + crypto.randomBytes(6).toString("hex") + ".tmp";
        await fs.promises.writeFile(temp, JSON.stringify(record), { mode: 0o600 });
        await fs.promises.rename(temp, file);
      };
      await save();
      const mail = options.getMailer && options.getMailer();
      const email = s.customer_details && s.customer_details.email;
      if (mail && email && !record.emailSent) {
        await mail.sendMail({
          from: options.mailFrom,
          to: email,
          subject: "Your Shark Game download — Future Music",
          text: `Thank you for purchasing Shark Game for US$9.99.\n\nYour private APK download page:\n${origin}/shark-game/success?session_id=${encodeURIComponent(id)}\n\nKeep this link private and bookmark it for future downloads. This is a directly installed Quest APK; it does not add a Meta Horizon Store purchase to your account. Installation instructions are on the download page.\n\nFor download or billing support: ${origin}/contact\nFuture Music Online`
        });
        record.emailSent = true;
        await save();
      }
      return s;
    })();
    pending.set(id, job);
    try { return await job; } finally { pending.delete(id); }
  }

  app.get("/shark-game", (req, res) => res.render("shark-game", {
    title: "Shark Game — Quest VR submarine survival | Future Music",
    metaDescription: "Pilot a submarine, face a colossal shark, and repair your shelter in dark waters. Shark Game for Quest: US$9.99 direct APK download.",
    canonicalUrl: origin + "/shark-game",
    ogImage: origin + "/images/shark-game/landscape.webp",
    skipCommerce: true,
    available: checkoutReady(),
    canceled: req.query.canceled === "1"
  }));

  app.post("/api/shark-game/checkout", rateLimit("shark-checkout", 12, 60 * 60 * 1000), async (req, res) => {
    privateHeaders(res);
    if (!allowedOrigins.has(req.get("origin"))) return res.status(403).send("Please start your purchase from the Shark Game page.");
    if (!req.body || req.body.install_ack !== "yes") return res.status(400).send("Please confirm the Quest APK installation requirements first.");
    const stripe = options.getStripe();
    if (!checkoutReady()) return res.status(503).send("Downloads are being prepared. No payment has been taken. Please try again later.");
    try {
      const s = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [{ price_data: {
          currency: "usd", unit_amount: PRICE,
          product_data: { name: "Shark Game — Quest APK", description: "Direct-install VR game. Requires a compatible Meta Quest headset, Touch controllers and APK sideloading. Does not grant a Meta Store license." }
        }, quantity: 1 }],
        metadata: { sku: SKU, type: "shark_apk" },
        payment_intent_data: { metadata: { sku: SKU, type: "shark_apk" } },
        success_url: origin + "/shark-game/success?session_id={CHECKOUT_SESSION_ID}",
        cancel_url: origin + "/shark-game?canceled=1"
      });
      const url = new URL(s.url);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") throw new Error("Unexpected checkout destination");
      return res.redirect(303, url.href);
    } catch {
      return res.status(503).send("Checkout is temporarily unavailable. Please try again shortly.");
    }
  });

  app.get("/shark-game/success", async (req, res) => {
    privateHeaders(res);
    const id = getSessionId(req);
    try {
      await verifyPayment(id);
      if (req.session) req.session.sharkPurchase = id;
      // A mail outage must not deny a paid buyer their immediate download.
      try { await fulfillPaidSession(id); } catch { console.warn("[SHARK] Confirmation email needs retry"); }
      return res.render("shark-game-success", { title: "Your Shark Game download | Future Music", skipCommerce: true, noIndex: true,
        sessionId: id, downloadReady: hasApk(), error: null });
    } catch (err) {
      return res.status(err.status || 503).render("shark-game-success", { title: "Shark Game purchase verification | Future Music", skipCommerce: true, noIndex: true,
        sessionId: null, downloadReady: false, error: err.status ? err.message : "Your download is temporarily unavailable. Please contact support." });
    }
  });

  app.get("/api/shark-game/download", rateLimit("shark-download", 30, 60 * 60 * 1000), async (req, res) => {
    privateHeaders(res);
    try {
      await verifyPayment(getSessionId(req));
      if (!hasApk()) throw accessError(503, "The APK is temporarily unavailable. Keep your download page and try again shortly, or contact support.");
      return res.download(apkPath, "Shark-0.6.0-Quest.apk", (err) => {
        if (err && !res.headersSent) res.status(503).send("The download could not be completed. Please try again.");
      });
    } catch (err) { return res.status(err.status || 503).type("text").send(err.status ? err.message : "Download verification is temporarily unavailable."); }
  });

  return { fulfillPaidSession, verifyPayment };
}

module.exports = { registerSharkStore, SKU, PRICE };
