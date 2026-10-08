"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const express = require("express");
const session = require("express-session");
const { registerSharkStore, SKU } = require("../lib/shark-store");
const writeGate = require("../lib/write-gate");
const homeGate = require("../lib/home-gate");
const ID = "cs_test_SharkPurchase0123456789";
function paid(overrides = {}) {
  return { id: ID, mode: "payment", status: "complete", payment_status: "paid", amount_total: 999,
    currency: "usd", livemode: false, metadata: { sku: SKU, type: "shark_apk" },
    customer_details: { email: "buyer@example.invalid" },
    payment_intent: { status: "succeeded", latest_charge: { paid: true, captured: true, refunded: false, disputed: false, amount_refunded: 0 } }, ...overrides };
}
async function fixture(t, changes = {}) {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "shark-store-test-"));
  fs.mkdirSync(path.join(baseDir, "public"));
  const apkPath = path.join(baseDir, "Shark.apk");
  if (!changes.missingApk) fs.writeFileSync(apkPath, "private-apk-test-bytes");
  const calls = { create: [], retrieve: [], email: [] };
  let current = paid();
  const stripe = { checkout: { sessions: {
    create: async (body) => { calls.create.push(body); return { id: ID, url: "https://checkout.stripe.com/c/pay/" + ID }; },
    retrieve: async (id, params) => { calls.retrieve.push({ id, params }); if (changes.stripeError) throw changes.stripeError; return current; }
  } } };
  const app = express();
  app.set("view engine", "ejs"); app.set("views", path.join(__dirname, "../views"));
  app.use(express.urlencoded({ extended: false }));
  app.use(session({ secret: "only-for-isolated-automated-test", resave: false, saveUninitialized: false }));
  app.use(homeGate.middleware); app.use(writeGate.middleware);
  app.use(express.static(path.join(baseDir, "public")));
  const store = registerSharkStore(app, { baseDir, apkPath, origin: "https://futuremusic.online", production: Boolean(changes.production), livePayments: changes.livePayments,
    getStripe: () => changes.noStripe ? null : stripe,
    getMailer: () => ({ sendMail: async (body) => { calls.email.push(body); if (changes.mailError) throw new Error("mail outage"); } }),
    mailFrom: "shop@example.invalid" });
  const server = app.listen(0, "127.0.0.1");
  await new Promise(r => server.once("listening", r));
  t.after(async () => {
    await new Promise(r => server.close(r));
    assert.equal(path.dirname(baseDir), os.tmpdir());
    assert.ok(path.basename(baseDir).startsWith("shark-store-test-"));
    fs.rmSync(baseDir, { recursive: true, force: true });
  });
  const url = "http://127.0.0.1:" + server.address().port;
  return { ...store, baseDir, calls, setPayment: s => { current = s; },
    get: p => fetch(url + p),
    checkout: (body = "install_ack=yes", origin = "https://futuremusic.online") => fetch(url + "/api/shark-game/checkout", {
      method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: origin }, body
    }) };
}

test("checkout charges the fixed price and redirects to hosted Stripe only", async t => {
  const f = await fixture(t);
  const r = await f.checkout("install_ack=yes&price=1&quantity=99");
  assert.equal(r.status, 303); assert.match(r.headers.get("location"), /^https:\/\/checkout.stripe.com\//);
  const body = f.calls.create[0];
  assert.equal(body.line_items[0].price_data.unit_amount, 999); assert.equal(body.line_items[0].quantity, 1);
  assert.equal(body.line_items[0].price_data.currency, "usd"); assert.equal(body.metadata.sku, SKU);
  assert.equal(body.success_url, "https://futuremusic.online/shark-game/success?session_id={CHECKOUT_SESSION_ID}");
  assert.deepEqual(body.payment_method_types, ["card"]);
});
for (const change of [{ noStripe: true }, { missingApk: true }, { production: true, livePayments: false }]) {
  test("checkout cannot take payment when delivery or payment setup is unavailable " + JSON.stringify(change), async t => {
    const f = await fixture(t, change); const r = await f.checkout();
    assert.equal(r.status, 503); assert.equal(f.calls.create.length, 0);
    const html = await (await f.get("/shark-game")).text();
    assert.ok(!html.includes('action="/api/shark-game/checkout"'));
  });
}
test("checkout requires installation acknowledgement and rejects a foreign origin", async t => {
  const f = await fixture(t);
  assert.equal((await f.checkout("")).status, 400);
  assert.equal((await f.checkout("install_ack=yes", "https://attacker.invalid")).status, 403);
  assert.equal(f.calls.create.length, 0);
});
test("public route gates allow only the bounded Shark checkout write", () => {
  for (const p of ["/shark-game", "/shark-game/success", "/api/shark-game/checkout", "/api/shark-game/download"]) assert.equal(homeGate.isRestrictedPath(p), false);
  assert.equal(writeGate.isPublicWrite("/api/shark-game/checkout"), true);
  assert.equal(writeGate.isPublicWrite("/api/shark-game/admin"), false);
});
test("anonymous and malformed requests cannot download the APK or traverse directories", async t => {
  const f = await fixture(t);
  for (const p of ["/api/shark-game/download", "/api/shark-game/download?session_id=../../Shark.apk"]) assert.equal((await f.get(p)).status, 400);
  assert.equal((await f.get("/Shark.apk")).status, 404);
  assert.equal(f.calls.retrieve.length, 0);
});
const invalid = [
  ["unpaid", { payment_status: "unpaid" }], ["unfinished", { status: "open" }],
  ["wrong product", { metadata: { sku: "hero-slayer", type: "shark_apk" } }],
  ["wrong amount", { amount_total: 1 }], ["wrong currency", { currency: "eur" }],
  ["wrong environment", { livemode: true }], ["wrong session", { id: "cs_test_AnotherBuyer012345" }],
  ["subscription", { mode: "subscription" }],
  ["pending intent", { payment_intent: { status: "processing" } }],
  ["unexpanded charge", { payment_intent: { status: "succeeded", latest_charge: "ch_123" } }]
];
for (const key of ["refunded", "disputed"]) invalid.push([key, { payment_intent: { ...paid().payment_intent, latest_charge: { ...paid().payment_intent.latest_charge, [key]: true } } }]);
invalid.push(["partial refund", { payment_intent: { ...paid().payment_intent, latest_charge: { ...paid().payment_intent.latest_charge, amount_refunded: 50 } } }]);
for (const [name, overrides] of invalid) {
  test("download denied: " + name, async t => {
    const f = await fixture(t); f.setPayment(paid(overrides));
    const r = await f.get("/api/shark-game/download?session_id=" + ID);
    assert.equal(r.status, 403); assert.ok(!(await r.text()).includes("private-apk-test-bytes"));
  });
}
test("valid payment streams the private APK, then a refund revokes future downloads", async t => {
  const f = await fixture(t);
  const r = await f.get("/api/shark-game/download?session_id=" + ID);
  assert.equal(r.status, 200); assert.equal(await r.text(), "private-apk-test-bytes");
  assert.match(r.headers.get("content-disposition"), /Shark-0.6.0-Quest.apk/);
  assert.match(r.headers.get("cache-control"), /no-store/); assert.equal(r.headers.get("referrer-policy"), "no-referrer");
  f.setPayment(paid({ payment_intent: { ...paid().payment_intent, latest_charge: { ...paid().payment_intent.latest_charge, refunded: true } } }));
  assert.equal((await f.get("/api/shark-game/download?session_id=" + ID)).status, 403);
});
test("payment outages fail closed", async t => {
  const f = await fixture(t, { stripeError: new Error("network") });
  assert.equal((await f.get("/api/shark-game/download?session_id=" + ID)).status, 503);
});
test("webhook and return-page fulfillment are idempotent and survive a new store instance", async t => {
  const f = await fixture(t);
  await Promise.all([f.fulfillPaidSession(ID), f.fulfillPaidSession(ID)]);
  await f.fulfillPaidSession(ID);
  assert.equal(f.calls.email.length, 1); assert.match(f.calls.email[0].text, /session_id=cs_test_/);
  const record = JSON.parse(fs.readFileSync(path.join(f.baseDir, "private-downloads/shark-orders", ID + ".json")));
  assert.equal(record.emailSent, true); assert.equal(record.email, undefined);
  const second = registerSharkStore(express(), { baseDir: f.baseDir, origin: "https://futuremusic.online", production: false,
    getStripe: () => ({ checkout: { sessions: { retrieve: async () => paid() } } }),
    getMailer: () => ({ sendMail: () => { throw new Error("Duplicate email"); } }) });
  await second.fulfillPaidSession(ID);
});
test("email outage still gives the paid buyer a confirmation and download link", async t => {
  const f = await fixture(t, { mailError: true });
  const r = await f.get("/shark-game/success?session_id=" + ID); const html = await r.text();
  assert.equal(r.status, 200); assert.ok(html.includes("Download Shark Game for Quest"));
  assert.ok(!html.includes("googlesyndication")); assert.equal(r.headers.get("referrer-policy"), "no-referrer");
});
test("APK and fulfillment records cannot be configured under public", () => {
  const baseDir = path.resolve(__dirname, "..");
  assert.throws(() => registerSharkStore(express(), { baseDir, apkPath: path.join(baseDir, "public/game.apk") }), /outside public/);
  assert.throws(() => registerSharkStore(express(), { baseDir, dataDir: path.join(baseDir, "public/orders") }), /outside public/);
});
