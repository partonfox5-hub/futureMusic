try { require('dotenv').config(); } catch (e) { /* dotenv not installed */ }
const express = require('express');
const app = express();

// --- FIX START: Global Crash Handlers ---
process.on('uncaughtException', (err) => {
    console.error('CRITICAL ERROR: Uncaught Exception:', err);
    console.error(err.stack);
    process.exit(1); // Force exit so Cloud Run restarts it
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL ERROR: Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
// --- FIX END ---
const PRINTIFY_TOKEN = process.env.PRINTIFY_API_TOKEN;
const PRINTIFY_SHOP_ID = process.env.PRINTIFY_SHOP_ID || '4210003';

// --- NEW CODE: Google Cloud Storage Setup ---
const { Storage } = require('@google-cloud/storage');

// --- FIX: Explicit Project ID & Bucket Configuration ---
const storage = new Storage({ 
    // We explicitly set your Project ID here to prevent "Unknown Project" errors
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'futuremusic'
});
const bucketName = process.env.GCS_BUCKET_NAME || 'futuremusic'; 
// -------------------------------------------------------

app.set('trust proxy', 1); // Required for cross-domain cookies on GCloud
const cors = require('cors');
// Replace with your actual Game URL (e.g., https://colorization.web.app)
// Leave as '*' for testing, but specify exact domain for production
// Allow both the environment variable AND specific local/production URLs
const allowedOrigins = [
    process.env.GAME_URL,
    '[https://mobile-game-853337900822.us-central1.run.app](https://mobile-game-853337900822.us-central1.run.app)', // Your Cloud Run Game URL
    'http://localhost',        // Android debug origin
    'capacitor://localhost',    // iOS/Android production origin
    'http://localhost:8080',     // Local testing
    '[http://127.0.0.1:8080](http://127.0.0.1:8080)',
    '[https://futuremusic.online](https://futuremusic.online)',
'[https://www.futuremusic.online](https://www.futuremusic.online)',
    'https://addictinggames.com',
    'https://cdn2.addictinggames.com', // Specific AddictingGames CDN
    'https://html5.addictinggames.com', // Alternate AddictingGames CDN
    'https://newgrounds.com',
    'https://ungrounded.net', // Newgrounds CDN
    'https://uploads.ungrounded.net' // Newgrounds Uploads
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // 1. Exact Match Check
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }

// 2. Pattern Match Check (Allows all subdomains of your site and game portals)
        if (origin.includes('web.app') || 
            origin.includes('firebaseapp.com') || 
            origin.includes('futuremusic.online') ||
            origin.includes('addictinggames.com') || 
            origin.includes('newgrounds.com') ||
            origin.includes('ungrounded.net') ||
            origin.includes('localhost') ||
            origin.includes('127.0.0.1')) { 
            return callback(null, true);
        }

        // 3. Fallback: Block
        console.log("âš ï¸ BLOCKED BY CORS:", origin);
        // If you are still stuck, you can uncomment the line below to temporarily allow everything:
        // return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));


// --- FIX START: Body Parsers & Logging ---
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true }));

// Log every request to console (Visible in Google Cloud Logs)
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.path}`);
    next();
});
// --- FIX END ---

const path = require('path');
const fs = require('fs'); 
const http = require('http');
const https = require('https'); 
//const bodyParser = require('body-parser');
//const { Storage } = require('@google-cloud/storage');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const session = require('express-session');
const axios = require('axios');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// --- NEW CODE: Email Verification Setup ---
const pendingVerifications = {};

function buildMailTransport() {
    const user = process.env.SMTP_USER || process.env.GMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
    if (!user || !pass) return null;
    if (process.env.SMTP_HOST) {
        const port = Number(process.env.SMTP_PORT || 587);
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port,
            secure: port === 465,
            auth: { user, pass },
        });
    }
    return nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
    });
}
const transporter = buildMailTransport();
const CONTACT_TO = process.env.CONTACT_TO || 'partonfox5@gmail.com';
const CONTACT_SUBJECTS = {
    booking: 'Booking Inquiry',
    collaboration: 'Collaboration',
    support: 'Merch Support',
    fanmail: 'Fan Mail',
};
const contactHits = new Map();
function contactRateOk(ip) {
    const now = Date.now();
    const windowMs = 60 * 60 * 1000;
    const hits = (contactHits.get(ip) || []).filter((t) => now - t < windowMs);
    if (hits.length >= 8) {
        contactHits.set(ip, hits);
        return false;
    }
    hits.push(now);
    contactHits.set(ip, hits);
    return true;
}
function escapeMail(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
async function deliverContactMail({ name, email, subject, message, ip }) {
    const subjectLine = `[Future Music] ${subject} — ${name}`;
    const text =
        `New transmission from futuremusic.online/contact\n\n` +
        `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\nIP: ${ip || 'unknown'}\n\n${message}\n`;
    const html =
        `<div style="font-family:Georgia,serif;background:#111;color:#f4efe4;padding:24px">` +
        `<p style="letter-spacing:.2em;text-transform:uppercase;color:#d4af37;font-size:12px">Transmit Signal</p>` +
        `<h2 style="margin:8px 0 16px;color:#d4af37">New contact from ${escapeMail(name)}</h2>` +
        `<p><strong>Email:</strong> <a href="mailto:${escapeMail(email)}" style="color:#d4af37">${escapeMail(email)}</a></p>` +
        `<p><strong>Subject:</strong> ${escapeMail(subject)}</p>` +
        `<p style="white-space:pre-wrap;line-height:1.5;border-top:1px solid #333;padding-top:16px">${escapeMail(message)}</p>` +
        `</div>`;

    if (transporter) {
        const fromUser = process.env.SMTP_USER || process.env.GMAIL_USER;
        await transporter.sendMail({
            from: `"Future Music" <${fromUser}>`,
            to: CONTACT_TO,
            replyTo: email,
            subject: subjectLine,
            text,
            html,
        });
        return 'smtp';
    }

    const r = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(CONTACT_TO), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Origin: 'https://futuremusic.online',
            Referer: 'https://futuremusic.online/contact',
        },
        body: JSON.stringify({
            name,
            email,
            _replyto: email,
            _subject: subjectLine,
            _template: 'table',
            _captcha: 'false',
            message: text,
        }),
    });
    const data = await r.json().catch(() => ({}));
    if (data.success === 'true' || data.success === true) return 'formsubmit';
    if (String(data.message || '').toLowerCase().includes('activation')) return 'formsubmit-pending';
    throw new Error(data.message || 'Email delivery failed');
}
async function storeContactMessage({ name, email, subject, message }) {
    if (!pool) return false;
    try {
        await pool.query(
            `CREATE TABLE IF NOT EXISTS contact_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255),
                email VARCHAR(255),
                subject VARCHAR(255),
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
        );
        await pool.query(
            'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)',
            [name, email, subject, message]
        );
        return true;
    } catch (err) {
        console.error('Contact DB store skipped:', err.message);
        return false;
    }
}
// --- END NEW CODE ---

// --- SESSION CONFIGURATION ---
// --- SESSION CONFIGURATION ---
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev_secret_key_123',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 
    }
}));
// Add this middleware function to protect routes
const requireLogin = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    // Store the page they wanted to go to
    req.session.returnTo = req.originalUrl;
    res.redirect('/login');
};

// Try loading .env if available
//try { require('dotenv').config(); } catch (e) { /* dotenv not installed */ }

// --- CONFIGURATION ---
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'your-song-bucket-name';

// DOMAIN SETUP & SANITIZATION
// Stripe requires absolute URLs (http:// or https://).
let rawDomain = process.env.DOMAIN || 'http://localhost:8080';
// Ensure protocol exists
if (!rawDomain.startsWith('http://') && !rawDomain.startsWith('https://')) {
    rawDomain = 'http://' + rawDomain;
}
// Remove trailing slash to prevent double slashes in generated URLs
const DOMAIN = rawDomain.replace(/\/$/, '');

console.log(`ðŸŒ DOMAIN Configured as: ${DOMAIN}`);

// --- DATA LOADING ---
let songsData = [];
try {
    songsData = require('./songs.json');
} catch (error) {
    console.error('CRITICAL: songs.json not found!');
}

const mockMerchItems = [
    { sku: 'm1', id: 'm1', name: 'Standard Uniform', price: 45.00, image_url: '/images/merch-shirt.jpg', description: 'Standard issue poly-blend.', type: 'merch', sizes: ['S', 'M', 'L'] },
    { sku: 'm2', id: 'm2', name: 'Vinyl Protocol', price: 30.00, image_url: '/images/merch-vinyl.jpg', description: 'High fidelity audio storage.', type: 'merch', sizes: [] }
];

const memoryCarts = {};

// --- MIDDLEWARE ---
//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({ extended: true }));

// --- DIAGNOSTIC: IDENTITY CHECK ---
const options = {
    hostname: 'metadata.google.internal',
    port: 80,
    path: '/computeMetadata/v1/instance/service-accounts/default/email',
    method: 'GET',
    headers: { 'Metadata-Flavor': 'Google' }
};
const reqAuth = http.request(options, (resAuth) => {
    let data = '';
    resAuth.on('data', (chunk) => data += chunk);
    resAuth.on('end', () => {
        console.log("ðŸ•µï¸ IDENTITY CHECK: This container is running as:", data.trim());
    });
});
reqAuth.on('error', (e) => console.log("ðŸ•µï¸ IDENTITY CHECK FAILED:", e.message));
reqAuth.end();


// --- CACHE & CSP HEADERS ---
app.disable('etag');
app.disable('view cache');
app.use((req, res, next) => {
    const p = req.path || '';
    if (/\.src\.js$/i.test(p) || /\/games\/[^/]+\/src\//i.test(p)) {
        return res.status(404).type('text/plain').send('Not found');
    }
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    
    res.removeHeader("Content-Security-Policy");
    res.removeHeader("X-Content-Security-Policy");
    res.setHeader(
        "Content-Security-Policy",
        "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
        "script-src * 'unsafe-inline' 'unsafe-eval'; " + 
        "style-src * 'unsafe-inline'; " +
        "font-src * 'unsafe-inline' data: blob:; " +
        "img-src * 'unsafe-inline' data: blob:; " +
        "connect-src * 'unsafe-inline'; " +
        "frame-src *;"
    );
    next();
});

const homeGate = require('./lib/home-gate');
app.use(homeGate.middleware);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
const seo = require('./lib/seo');
// Canonical game URL is /neweden. Register before static so the pack's
// index.html is not served at /games/neweden/ (that path 404s in the SPA router).
app.get(['/games/neweden', '/games/neweden/'], (req, res) => res.redirect('/neweden'));
// Landings must beat express.static directory indexes (public/zombie-defense, paintcadia, terrarium).
app.get('/zombie-defense', (req, res) => res.render('game-landing', seo.page('zombie-defense')));
app.get('/paintcadia', (req, res) => res.render('game-landing', seo.page('paintcadia')));
app.get('/terrarium', (req, res) => res.render('game-landing', seo.page('terrarium')));

// SHARK — unlisted VR sub game. Register before static so /games/shark/ does not
// serve the directory index (canonical URL is /shark). Not linked from nav.
function sharkHeaders(res) {
    res.setHeader('Permissions-Policy', 'xr-spatial-tracking=(self), fullscreen=(self), gamepad=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
}
app.get(['/games/shark', '/games/shark/'], (req, res) => res.redirect('/shark'));
app.get(['/shark', '/shark/'], (req, res) => {
    sharkHeaders(res);
    res.sendFile(path.join(__dirname, 'public', 'games', 'shark', 'index.html'));
});
app.get(["/test-b7k2n9qx", "/test-b7k2n9qx/"], (req, res) => {
    sharkHeaders(res);
    res.sendFile(path.join(__dirname, "public", "games", "shark", "test-b7k2n9qx", "index.html"));
});
app.get(["/test-h8w3k9nq", "/test-h8w3k9nq/"], (req, res) => res.redirect(301, "/shark"));

// FENREST — unlisted Quest 3 WebXR village. Canonical URL is /fenrest.
// Not linked from homepage / projects / nav. Register before static so
// /games/fenrest/ does not serve the pack's index.html.
function fenrestHeaders(res) {
    res.setHeader('Permissions-Policy', 'xr-spatial-tracking=(self), fullscreen=(self), gamepad=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self), microphone=(self)');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
}
app.use('/games/character-chess', (req, res, next) => {
    res.setHeader('Permissions-Policy', 'xr-spatial-tracking=(self), fullscreen=(self), gamepad=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)');
    if (/\.html?$/.test(req.path) || req.path === '/' || req.path === '') {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
    next();
});
app.get(['/games/fenrest', '/games/fenrest/'], (req, res) => res.redirect('/fenrest'));
app.get(['/fenrest', '/fenrest/'], (req, res) => {
    fenrestHeaders(res);
    res.sendFile(path.join(__dirname, 'public', 'games', 'fenrest', 'index.html'));
});
app.get(["/test-r8k3m2qv", "/test-r8k3m2qv/"], (req, res) => {
    fenrestHeaders(res);
    res.sendFile(path.join(__dirname, "public", "games", "fenrest", "index.html"));
});
app.get(["/test-k7p2n9wm", "/test-k7p2n9wm/"], (req, res) => {
    fenrestHeaders(res);
    res.sendFile(path.join(__dirname, "public", "games", "fenrest", "test-k7p2n9wm", "index.html"));
});
app.get(["/test-w7n3q9fm", "/test-w7n3q9fm/"], (req, res) => {
    fenrestHeaders(res);
    res.sendFile(path.join(__dirname, "public", "games", "fenrest", "test-w7n3q9fm", "index.html"));
});
app.get(["/test-n2q8k4wm", "/test-n2q8k4wm/"], (req, res) => {
    fenrestHeaders(res);
    res.sendFile(path.join(__dirname, "public", "games", "fenrest", "test-n2q8k4wm", "index.html"));
});
app.use("/games/fenrest-chess", (req, res, next) => {
    res.setHeader("Permissions-Policy", "xr-spatial-tracking=(self), fullscreen=(self), gamepad=(self), microphone=(self)");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    next();
});

// BLOCKBUILD — unlisted VR stud-brick workshop. Canonical URL is /blockbuild.
function blockbuildHeaders(res) {
    res.setHeader("Permissions-Policy", "xr-spatial-tracking=(self), fullscreen=(self), gamepad=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
}
app.get(["/games/blockbuild", "/games/blockbuild/"], (req, res) => res.redirect(301, "/blockbuild"));
app.get(["/blockbuild", "/blockbuild/"], (req, res) => {
    blockbuildHeaders(res);
    res.sendFile(path.join(__dirname, "public", "games", "blockbuild", "index.html"));
});

function cardsHeaders(res) {
    res.setHeader("Permissions-Policy", "xr-spatial-tracking=(self), fullscreen=(self), gamepad=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
}
app.get(["/games/iridex-cards", "/games/iridex-cards/"], (req, res) => res.redirect("/cards"));
app.get(["/cards", "/cards/"], (req, res) => {
    cardsHeaders(res);
    res.sendFile(path.join(__dirname, "public", "games", "iridex-cards", "index.html"));
});

const BLOCKBUILD_SKU = "blockbuild-workshop";
const BLOCKBUILD_PRICE_CENTS = 999;
const BLOCKBUILD_COOKIE = "bb_unlock";
function blockbuildToken() {
    const secret = process.env.SESSION_SECRET || "dev_secret_key_123";
    return crypto.createHmac("sha256", secret).update(BLOCKBUILD_SKU).digest("hex").slice(0, 32);
}
function grantBlockbuild(req, res) {
    if (req.session) req.session.blockbuildPaid = true;
    res.cookie(BLOCKBUILD_COOKIE, blockbuildToken(), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 10 * 365 * 24 * 60 * 60 * 1000,
        path: "/",
    });
}
function hasBlockbuild(req) {
    if (homeGate.isHomeLan(req)) return true;
    if (req.session && req.session.blockbuildPaid) return true;
    const raw = String(req.headers.cookie || "");
    for (const part of raw.split(";")) {
        const idx = part.indexOf("=");
        if (idx < 0) continue;
        const k = part.slice(0, idx).trim();
        if (k === BLOCKBUILD_COOKIE) return decodeURIComponent(part.slice(idx + 1).trim()) === blockbuildToken();
    }
    return false;
}
function sendBlockbuildPlay(res) {
    blockbuildHeaders(res);
    res.sendFile(path.join(__dirname, "public", "games", "blockbuild", "index.html"));
}
app.get(["/bricks", "/bricks/"], (req, res) => {
    if (hasBlockbuild(req)) return res.redirect(302, "/bricks/play");
    res.render("bricks", { ...seo.page("bricks"), paid: false });
});
app.get(["/bricks/play", "/bricks/play/"], async (req, res) => {
    const sessionId = String(req.query.session_id || "");
    if (sessionId && stripe) {
        try {
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            if (session.payment_status === "paid" && session.metadata?.sku === BLOCKBUILD_SKU) {
                grantBlockbuild(req, res);
            }
        } catch (e) {
            console.warn("[BLOCKBUILD] verify:", e.message);
        }
    }
    if (!hasBlockbuild(req)) return res.redirect(302, "/bricks");
    sendBlockbuildPlay(res);
});
app.post("/api/blockbuild/checkout", async (req, res) => {
    if (!stripe) return res.status(503).json({ error: "Payments are not configured." });
    try {
        const protocol = req.headers["x-forwarded-proto"] || req.protocol;
        const host = req.get("host");
        const domain = `${protocol}://${host}`;
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: [{
                price_data: {
                    currency: "usd",
                    unit_amount: BLOCKBUILD_PRICE_CENTS,
                    product_data: {
                        name: "Blockbuild — workshop",
                        description: "Unlock the stud-brick workshop. Desktop + VR. One-time $9.99.",
                    },
                },
                quantity: 1,
            }],
            metadata: { sku: BLOCKBUILD_SKU, type: "blockbuild_unlock" },
            success_url: `${domain}/bricks/play?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${domain}/bricks`,
            customer_email: req.session.email || undefined,
        });
        res.json({ url: session.url, sessionId: session.id });
    } catch (e) {
        console.error("[BLOCKBUILD] checkout", e);
        res.status(500).json({ error: e.message || "Checkout failed" });
    }
});

// PLANMORPHER — original VR god-game. Canonical URL is /planmorpher.
function planmorpherHeaders(res) {
    res.setHeader("Permissions-Policy", "xr-spatial-tracking=(self), fullscreen=(self), gamepad=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
}
app.get(["/games/planmorpher", "/games/planmorpher/", "/games/planmorph", "/games/planmorph/", "/planmorph", "/planmorph/"], (req, res) => res.redirect(301, "/planmorpher"));
app.get(["/planmorpher", "/planmorpher/"], (req, res) => {
    planmorpherHeaders(res);
    res.sendFile(path.join(__dirname, "public", "games", "planmorpher", "index.html"));
});
app.get(["/planmorpher-archive", "/planmorpher-archive/"], (req, res) => {
    planmorpherHeaders(res);
    res.sendFile(path.join(__dirname, "public", "games", "planmorpher", "archive", "index.html"));
});
app.get(["/test-m4p8k2nw", "/test-m4p8k2nw/"], (req, res) => res.redirect(301, "/planmorpher"));
app.get(["/test-p9k2w7nm", "/test-p9k2w7nm/"], (req, res) => res.redirect(301, "/planmorpher"));
app.get(["/test-t3n8w6qk", "/test-t3n8w6qk/"], (req, res) => res.redirect(301, "/planmorpher"));
app.get(["/test-n7q2k8wm", "/test-n7q2k8wm/"], (req, res) => {
    planmorpherHeaders(res);
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    res.sendFile(path.join(__dirname, "public", "games", "planmorpher", "test-n7q2k8wm", "index.html"));
});

// PLANETRY — unlisted Quest 3 WebXR orbital RTS. Canonical URL is /planetry.
function planetryHeaders(res) {
    res.setHeader("Permissions-Policy", "xr-spatial-tracking=(self), fullscreen=(self), gamepad=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
}
function sendPlanetry(req, res) {
    planetryHeaders(res);
    const fp = path.join(__dirname, "public", "games", "planetry", "index.html");
    if (!fs.existsSync(fp)) {
        console.error("[planetry] missing", fp);
        return res.status(500).send("Planetry is missing on this server.");
    }
    res.sendFile(fp);
}
app.get(["/games/planetry", "/games/planetry/"], (req, res) => res.redirect("/planetry"));
app.get(["/planetary", "/planetary/"], (req, res) => res.redirect("/planetry"));
app.get(["/planetry", "/planetry/"], sendPlanetry);
app.get(["/test-q8m2n5kw", "/test-q8m2n5kw/"], (req, res) => {
    planetryHeaders(res);
    res.sendFile(path.join(__dirname, "public", "games", "planetry", "test-q8m2n5kw", "index.html"));
});
app.use("/planetry", (req, res, next) => {
    planetryHeaders(res);
    next();
}, express.static(path.join(__dirname, "public", "games", "planetry")));

// ZOOM — dungeon crawler + map maker. Canonical URLs /zoom and /zoommaps.
function zoomHeaders(res) {
    res.setHeader("Permissions-Policy", "xr-spatial-tracking=(self), fullscreen=(self), gamepad=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self), microphone=(self)");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
}
app.get(["/games/zoom", "/games/zoom/"], (req, res) => res.redirect("/zoom"));
app.get(["/zoom", "/zoom/"], (req, res) => {
    zoomHeaders(res);
    res.sendFile(path.join(__dirname, "public", "games", "zoom", "play.html"));
});
app.get(["/zoommaps", "/zoommaps/", "/zoom/maps", "/zoom/maps/"], (req, res) => {
    zoomHeaders(res);
    res.sendFile(path.join(__dirname, "public", "games", "zoom", "maps.html"));
});
app.get(["/test-w3n9k7qm", "/test-w3n9k7qm/"], (req, res) => res.redirect(301, "/zoom"));
app.get(["/test-w3n9k7qm-maps", "/test-w3n9k7qm-maps/"], (req, res) => res.redirect(301, "/zoommaps"));
app.get(["/test-v4n8k2qm", "/test-v4n8k2qm/"], (req, res) => res.redirect(301, "/zoom"));
app.use("/games/zoom", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    next();
});
try {
    require("./lib/zoom").mount(app, { storage, bucketName });
    console.log("[zoom] maps api mounted");
} catch (e) {
    console.error("[zoom] api failed", e.message);
}

function hordeHeaders(res) {
    res.setHeader("Permissions-Policy", "xr-spatial-tracking=(self), fullscreen=(self), gamepad=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
}
app.get(["/games/horde", "/games/horde/"], (req, res) => res.redirect("/horde"));
app.get(["/horde", "/horde/"], (req, res) => {
    hordeHeaders(res);
    res.sendFile(path.join(__dirname, "public", "games", "horde", "index.html"));
});
app.get(["/test-k8n2w5q1", "/test-k8n2w5q1/"], (req, res) => res.redirect(301, "/horde"));
app.get(["/test-w4n8k2pt", "/test-w4n8k2pt/"], (req, res) => res.redirect(301, "/horde"));
app.get(["/test-m3k9r7qw", "/test-m3k9r7qw/"], (req, res) => res.redirect(301, "/horde"));
app.get(["/test-r4n8k2w7", "/test-r4n8k2w7/"], (req, res) => res.redirect(301, "/horde"));
app.get(["/test-k2n8w4qh", "/test-k2n8w4qh/"], (req, res) => res.redirect(301, "/horde"));

// BLOCKBUILD Quest Store exclusive — unlisted private URL, not home-gated.
const BBQST = "/bbqst-h8k2m9q4";
app.use(BBQST, (req, res, next) => {
    res.setHeader("Permissions-Policy", "xr-spatial-tracking=(self), fullscreen=(self), gamepad=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)");
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    next();
});
app.get([BBQST, BBQST + "/"], (req, res) => {
    res.setHeader("Permissions-Policy", "xr-spatial-tracking=(self), fullscreen=(self), gamepad=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)");
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    res.sendFile(path.join(__dirname, "public", "bbqst-h8k2m9q4", "index.html"));
});
app.get(BBQST + "/manifest.webmanifest", (req, res) => {
    res.type("application/manifest+json");
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    res.sendFile(path.join(__dirname, "public", "bbqst-h8k2m9q4", "manifest.webmanifest"));
});

// Digital Asset Links for the Blockbuild Quest TWA. express.static ignores dotfiles.
app.get("/.well-known/assetlinks.json", (req, res) => {
    res.type("application/json");
    res.sendFile(path.join(__dirname, "public", ".well-known", "assetlinks.json"));
});

app.use(express.static(path.join(__dirname, 'public')));

// --- STRIPE ---
let stripe;
if (process.env.STRIPE_SECRET_KEY) {
    try {
        stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    } catch (e) {
        console.warn("âš ï¸ STRIPE WARNING:", e.message);
    }
} else {
    console.warn("âš ï¸ STRIPE WARNING: STRIPE_SECRET_KEY is missing. Checkout will not work.");
}

// --- DATABASE CONNECTION ---
let pool;
let dbConnectionStatus = "PENDING";
let dbErrorDetail = null;

const cleanConnectionName = (process.env.INSTANCE_CONNECTION_NAME || '').trim();
const bypassHost = (process.env.DB_HOST || '').trim();

const DB_CONFIG = {
    user: process.env.DB_USER || '',           
    password: process.env.DB_PASSWORD || '',   
    database: process.env.DB_NAME || '',       
};

console.log("--- DB CONFIG CHECK ---");
console.log("User:", DB_CONFIG.user ? "SET" : "MISSING");
console.log("Cloud SQL Target:", cleanConnectionName || "None");
console.log("Bypass Host:", bypassHost || "None");

if (DB_CONFIG.user && DB_CONFIG.database) {
    const dbConfig = {
        user: DB_CONFIG.user,
        password: DB_CONFIG.password,
        database: DB_CONFIG.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    };

    let mode = 'Localhost';
    if (bypassHost) {
        mode = 'TCP BYPASS';
        dbConfig.host = bypassHost;
        dbConfig.port = 3306; 
    } else if (cleanConnectionName) {
        mode = 'UNIX SOCKET';
        dbConfig.socketPath = `/cloudsql/${cleanConnectionName}`;
        delete dbConfig.host; 
    } else {
        dbConfig.host = '127.0.0.1';
    }

    console.log(`ðŸ”Œ MODE: ${mode}. Attempting connection...`);

    async function initializeDbPool() {
        try {
            pool = mysql.createPool(dbConfig);
            const [rows] = await pool.query('SELECT 1 + 1 AS solution');
            if (rows && rows[0].solution === 2) {
                console.log("âœ… DB CONNECTED SUCCESSFULLY (MySQL)");
                dbConnectionStatus = "CONNECTED";
            }
        } catch (err) {
            console.error("âŒ INITIAL CONNECTION FAILED:", err.message);
            let socketDiagnostic = "";
            if (mode === 'UNIX SOCKET') {
                try {
                    if (!fs.existsSync('/cloudsql')) {
                        socketDiagnostic = "The /cloudsql folder does NOT exist.";
                    } else {
                        const contents = fs.readdirSync('/cloudsql');
                        if (contents.length === 0) {
                            socketDiagnostic = "The /cloudsql folder is EMPTY. The Proxy failed to start.";
                        } else {
                            socketDiagnostic = `The /cloudsql folder contains: [${contents.join(', ')}].`;
                        }
                    }
                } catch (fsErr) {
                    socketDiagnostic = "Could not read /cloudsql: " + fsErr.message;
                }
            }
            dbConnectionStatus = "FAILED";
            dbErrorDetail = `${err.message} || ${socketDiagnostic}`;
            pool = null; 
        }
    }
    initializeDbPool();
} else {
    dbConnectionStatus = "CONFIG_MISSING";
    dbErrorDetail = "Environment variables missing.";
}

// Helper to query DB
async function query(sql, params) {
    if (!pool) throw new Error("Database connection is not available.");
    const [rows] = await pool.execute(sql, params); 
    return { rows };
}

// --- HELPER FUNCTIONS ---

async function getProductBySku(sku) {
    if (pool) {
        try {
            const res = await query("SELECT * FROM products WHERE sku = ?", [sku]);
            if (res.rows.length > 0) return res.rows[0];
        } catch (e) { console.error("DB Error:", e); }
    }
    const merch = mockMerchItems.find(m => m.sku === sku || m.id === sku);
    if (merch) return merch;
    return null;
}

// --- AUTH MIDDLEWARE ---
const requireAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    return res.redirect('/login');
};


// --- ROUTES ---
app.get('/checkout-form', requireLogin, async (req, res) => {
    try {
        let user = {};

        // Robust DB Fetch: Check if 'query' helper exists
        if (typeof query === 'function') {
             const result = await query('SELECT * FROM users WHERE id = ?', [req.session.userId]);
             if (result.rows && result.rows.length > 0) {
                 user = result.rows[0];
             } else if (Array.isArray(result) && result.length > 0) {
                 user = result[0];
             }
        } else if (typeof pool !== 'undefined') {
             // Fallback to raw mysql2 pool
             const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.session.userId]);
             if (rows && rows.length > 0) user = rows[0];
        }

        res.render('checkout_form', { 
            title: 'Secure Checkout',
            user: user || {}, 
            // We now pass the key here so the frontend doesn't need to hardcode it
            stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY 
        });

    } catch (err) {
        console.error("Error loading checkout page:", err);
        res.render('checkout_form', { 
            title: 'Secure Checkout',
            user: {},
            stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
        });
    }
});
// --- AUTH ROUTES ---

// 1. Show Login Page
app.get('/login', (req, res) => {
    res.render('login', { title: 'Login / Register' });
});

// 2. Handle Registration
app.post('/register', async (req, res) => {
    // 1. Extract email, password, AND confirmPassword
    const { email, password, confirmPassword } = req.body;

    // 2. Validate existence
    if (!email || !password) {
        return res.status(400).send('Please provide both an email and password.');
    }

    // --- NEW SECURITY: Strict Password Validation ---
    if (password !== confirmPassword) {
        return res.status(400).send('Error: Passwords do not match.');
    }

    // Regex: At least 8 chars, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).send('Error: Password must be at least 8 characters long and contain at least one number, one uppercase letter, and one lowercase letter.');
    }
    // ------------------------------------------------

    if (pool) {
        try {
            // 3. DATABASE FIX: Use the email as the username
            // This satisfies the database requirement for a 'username' column automatically.
                       // --- NEW: Check if email exists ---
            const [existingUser] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
            if (existingUser.length > 0) {
                 return res.send('<script>alert("That email is already registered. Please sign in."); window.location.href="/login";</script>');
            }
            // ----------------------------------

            // 4. Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

// 5. Insert into DB (Using only email and password)
            // 5. Insert into DB (Using only email and password)
            const result = await query(
                "INSERT INTO users (email, password_hash) VALUES (?, ?)", 
                [email, hashedPassword]
            );
            
            // Success! Auto-login the user
            req.session.userId = result.rows.insertId;
            req.session.email = email;
            res.redirect('/account');

        } catch (err) {
            // 6. LOGGING: This will print the exact DB error to your terminal
            console.error("Registration Error:", err);
            
            // Send a clear error to the screen so you aren't staring at a blank page
            res.status(500).send(`Error registering user: ${err.message}`);
        }
    } else {
        res.status(500).send('Database connection not established.');
    }
});


// 3. Handle Login
app.post('/login', async (req, res) => {
    try {
        console.log("ðŸŸ¢ DEBUG: Login attempted for:", req.body.email);
        
        const { email, password } = req.body;
        
        if (!pool) throw new Error("Database not connected");

        // 1. Fetch User
        // Note: We use pool.query here which returns [rows, fields]
        const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        
        if (users.length === 0) {
            console.log("ðŸŸ  DEBUG: User not found in DB.");
            return res.send('<script>alert("Invalid email or password"); window.location.href="/login";</script>');
        }

        const user = users[0];
        
        // 2. Validate Data before Bcrypt
        console.log("ðŸŸ¢ DEBUG: User found. ID:", user.id);
        
        if (!password) throw new Error("Password field is missing from the request body.");
        if (!user.password_hash) throw new Error("This user has no password_hash in the database. (Did you manually insert them?)");

        // 3. Compare Password
        console.log("ðŸŸ¢ DEBUG: Comparing password hash...");
        const match = await bcrypt.compare(password, user.password_hash);

        if (match) {
            console.log("ðŸŸ¢ DEBUG: Password match! Setting session...");
            req.session.userId = user.id;
            req.session.email = user.email;
            
            // --- FIX START ---
            const redirectUrl = req.session.returnTo || '/account';
            delete req.session.returnTo; // Clear it after use
            
            console.log("ðŸŸ¢ DEBUG: Redirecting to:", redirectUrl);
            res.redirect(redirectUrl);
            // --- FIX END ---
        } else {
            console.log("ðŸŸ  DEBUG: Password mismatch.");
            res.send('<script>alert("Invalid email or password"); window.location.href="/login";</script>');
        }
    } catch (loginErr) {
        // --- NUCLEAR LOGGER FOR LOGIN ---
        console.error("ðŸ”´ LOGIN CRASH:", loginErr);
        
        console.log(JSON.stringify({
            severity: 'ERROR',
            component: 'login_route',
            message: "Login Route Failed",
            error_message: loginErr.message,
            stack_trace: loginErr.stack
        }));

        res.status(500).send(`
            <div style="background: #000; color: #ff5555; padding: 40px; font-family: monospace;">
                <h1>ðŸ›‘ LOGIN FAILED</h1>
                <p>The server crashed while trying to log you in.</p>
                <hr style="border: 1px solid #333; margin: 20px 0;">
                <h3 style="color: white;">Error Details:</h3>
                <pre style="background: #111; padding: 15px; border: 1px solid #333;">${loginErr.message}</pre>
                <h3 style="color: white;">Stack Trace:</h3>
                <pre style="background: #111; padding: 15px; border: 1px solid #333; white-space: pre-wrap;">${loginErr.stack}</pre>
            </div>
        `);
    }
});

// 4. Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/', (req, res) => res.render('index', { title: 'Home' }));
app.get('/projects', (req, res) => res.render('projects', seo.page('projects')));
app.get('/addiction-slayer', (req, res) => res.render('game-landing', seo.page('addiction-slayer')));
app.get('/target-catharsis', (req, res) => res.render('game-landing', seo.page('target-catharsis')));
app.get('/color-contagion', (req, res) => res.render('game-landing', seo.page('color-contagion')));
app.get('/herd-orama', (req, res) => res.render('game-landing', seo.page('herd-orama')));
app.get(['/zombie-game', '/zombie-tower-defense'], (req, res) => res.redirect(301, '/zombie-defense'));
app.get(['/herd-survival', '/colorization'], (req, res) => {
    if (req.path.indexOf('color') !== -1) return res.redirect(301, '/color-contagion');
    res.redirect(301, '/herd-orama');
});
app.get(['/rampart-reborn', '/rampart-game'], (req, res) => res.redirect(301, '/rampart'));

// Rampart Reborn â€” game shell + mod-lab APIs
try {
    require('./rampart-lab').mount(app, { requireLogin });
    console.log('[rampart-lab] routes mounted');
} catch (e) {
    console.error('[rampart-lab] failed to mount:', e.message);
}

const CHESS_ALPHA_SKU = 'creature-chess-alpha-pack';
const CHESS_ALPHA_PRICE_CENTS = 199;
const CHESS_PACKS = {
    alpha: { sku: 'creature-chess-alpha-pack', cookie: 'chess_alpha_pack', session: 'chessAlphaPack', name: 'Creature Chess — Rites of Flame', blurb: 'Resurrection, Sacrifice, and fire / electric / normal champions.' },
    nightcourt: { sku: 'creature-chess-nightcourt-pack', cookie: 'chess_nightcourt_pack', session: 'chessNightcourtPack', name: 'Creature Chess — Curse of Medusa', blurb: 'Petrify a unit. Dark, water, and psychic champions.' },
    primeval: { sku: 'creature-chess-primeval-pack', cookie: 'chess_primeval_pack', session: 'chessPrimevalPack', name: 'Creature Chess — Terraform', blurb: 'Reshape the board. Rock, ground, grass, and fighting champions.' },
    maps: { sku: 'creature-chess-maps-pack', cookie: 'chess_maps_pack', session: 'chessMapsPack', name: 'Creature Chess — Map Pack', blurb: 'Medium 16×16 fields and the 24×24 RTS theatre.' },
};
function chessPackToken(sku) {
    const secret = process.env.SESSION_SECRET || 'dev_secret_key_123';
    return crypto.createHmac('sha256', secret).update(sku).digest('hex').slice(0, 32);
}
function chessAlphaToken() {
    return chessPackToken(CHESS_ALPHA_SKU);
}
function readReqCookie(req, name) {
    const raw = String(req.headers.cookie || '');
    for (const part of raw.split(';')) {
        const idx = part.indexOf('=');
        if (idx < 0) continue;
        const k = part.slice(0, idx).trim();
        if (k === name) return decodeURIComponent(part.slice(idx + 1).trim());
    }
    return '';
}
function grantChessPack(req, res, packId) {
    const def = CHESS_PACKS[packId] || CHESS_PACKS.alpha;
    if (req.session) req.session[def.session] = true;
    res.cookie(def.cookie, chessPackToken(def.sku), {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 10 * 365 * 24 * 60 * 60 * 1000,
        path: '/',
    });
}
function grantChessAlpha(req, res) {
    grantChessPack(req, res, 'alpha');
}
const CHESS_ALPHA_OWNER_IPS = ['47.224.115.198'];
function chessClientIp(req) {
    const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const raw = xf || req.ip || (req.socket && req.socket.remoteAddress) || '';
    return String(raw).replace(/^::ffff:/i, '').split('%')[0];
}
function hasChessPack(req, packId) {
    if (CHESS_ALPHA_OWNER_IPS.includes(chessClientIp(req))) return true;
    const def = CHESS_PACKS[packId];
    if (!def) return false;
    if (req.session && req.session[def.session]) return true;
    return readReqCookie(req, def.cookie) === chessPackToken(def.sku);
}
function hasChessAlpha(req) {
    return hasChessPack(req, 'alpha');
}
function chessPackStatus(req) {
    return {
        alpha: hasChessPack(req, 'alpha'),
        nightcourt: hasChessPack(req, 'nightcourt'),
        primeval: hasChessPack(req, 'primeval'),
        maps: hasChessPack(req, 'maps'),
    };
}

// Unlisted test pages (not linked from homepage / projects)
app.get('/test-3bkyzsrg', (req, res) => {
    res.render('test-3bkyzsrg', { title: 'Rampart responsive test' });
});
app.get('/test-bk74eh6y', (req, res) => {
    res.render('test-bk74eh6y', { title: 'Rampart multiplayer test' });
});
app.get('/test-c4h9n2x8', (req, res) => {
    res.redirect(301, '/chess');
});
app.get('/test-r8k2m6qv', (req, res) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Permissions-Policy', 'xr-spatial-tracking=(self), fullscreen=(self), gamepad=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)');
    res.render('test-r8k2m6qv');
});
app.get(['/test-n4k8w2mt', '/test-n4k8w2mt/'], (req, res) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.render('test-n4k8w2mt', seo.page('projects'));
});

// Battle Sphere Arena — $15 Stripe paygate + WebXR play. No home-LAN skip.
const BSA_SKU = "battle-sphere-arena";
const BSA_PRICE_CENTS = 1500;
const BSA_COOKIE = "bsa_unlock";
function bsaPlayHeaders(res) {
    res.setHeader("Permissions-Policy", "xr-spatial-tracking=(self), fullscreen=(self), gamepad=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
}
function bsaToken() {
    const secret = process.env.SESSION_SECRET || "dev_secret_key_123";
    return crypto.createHmac("sha256", secret).update(BSA_SKU).digest("hex").slice(0, 32);
}
function grantBsa(req, res) {
    if (req.session) req.session.bsaPaid = true;
    res.cookie(BSA_COOKIE, bsaToken(), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 10 * 365 * 24 * 60 * 60 * 1000,
        path: "/",
    });
}
function hasBsa(req) {
    if (req.session && req.session.bsaPaid) return true;
    const raw = String(req.headers.cookie || "");
    for (const part of raw.split(";")) {
        const idx = part.indexOf("=");
        if (idx < 0) continue;
        const k = part.slice(0, idx).trim();
        if (k === BSA_COOKIE) return decodeURIComponent(part.slice(idx + 1).trim()) === bsaToken();
    }
    return false;
}
async function verifyBsaSession(req, res) {
    const sessionId = String(req.query.session_id || "");
    if (!sessionId || !stripe) return;
    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status === "paid" && session.metadata?.sku === BSA_SKU) {
            grantBsa(req, res);
        }
    } catch (e) {
        console.warn("[BSA] verify:", e.message);
    }
}
function sendBsaPlay(res) {
    bsaPlayHeaders(res);
    res.sendFile(path.join(__dirname, "public", "games", "battle-sphere-arena", "index.html"));
}
app.get(["/battle-sphere-arena", "/battle-sphere-arena/"], async (req, res) => {
    await verifyBsaSession(req, res);
    if (hasBsa(req)) return res.redirect(302, "/battle-sphere-arena/play");
    res.render("battle-sphere-arena", seo.page("battle-sphere-arena"));
});
app.get(["/battle-sphere-arena/play", "/battle-sphere-arena/play/"], async (req, res) => {
    await verifyBsaSession(req, res);
    if (!hasBsa(req)) return res.redirect(302, "/battle-sphere-arena");
    sendBsaPlay(res);
});
async function bsaCheckout(req, res) {
    if (!stripe) return res.status(503).json({ error: "Payments are not configured." });
    try {
        const protocol = req.headers["x-forwarded-proto"] || req.protocol;
        const host = req.get("host");
        const domain = `${protocol}://${host}`;
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: [{
                price_data: {
                    currency: "usd",
                    unit_amount: BSA_PRICE_CENTS,
                    product_data: {
                        name: "Battle Sphere Arena",
                        description: "Unlock browser + WebXR play. One-time $15.",
                        images: [`${domain}/images/battle-sphere-arena/cover.jpg`],
                    },
                },
                quantity: 1,
            }],
            metadata: { sku: BSA_SKU, type: "bsa_unlock" },
            success_url: `${domain}/battle-sphere-arena/play?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${domain}/battle-sphere-arena`,
            customer_email: req.session.email || undefined,
        });
        res.json({ url: session.url, sessionId: session.id });
    } catch (e) {
        console.error("[BSA] checkout", e);
        res.status(500).json({ error: e.message || "Checkout failed" });
    }
}
app.post("/api/bsa/checkout", bsaCheckout);
app.post("/api/bsa-test/checkout", bsaCheckout);
app.get(["/test-q4m8w2k7", "/test-q4m8w2k7/"], (req, res) => res.redirect(301, "/"));
app.get(["/test-q4m8w2k7/projects", "/test-q4m8w2k7/projects/"], (req, res) => res.redirect(301, "/projects"));
app.get(["/test-q4m8w2k7/arena", "/test-q4m8w2k7/arena/"], (req, res) => res.redirect(301, "/battle-sphere-arena"));
app.get(["/test-q4m8w2k7/play", "/test-q4m8w2k7/play/"], (req, res) => res.redirect(301, "/battle-sphere-arena/play"));

try {
    const chessLobby = require('./chess-lobby.cjs');
    app.all('/api/chess-lobby', chessLobby);
    console.log('[chess] lobby mounted');
} catch (e) {
    console.error('[chess] lobby mount failed:', e.message);
}
app.get('/chess', async (req, res) => {
    res.setHeader('Permissions-Policy', 'xr-spatial-tracking=(self), fullscreen=(self), gamepad=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)');
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    const sessionId = String(req.query.session_id || '');
    if (sessionId && stripe) {
        try {
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            if (session.payment_status === 'paid' && session.metadata?.sku) {
                const packId = Object.keys(CHESS_PACKS).find((k) => CHESS_PACKS[k].sku === session.metadata.sku);
                if (packId) grantChessPack(req, res, packId);
            }
        } catch (e) {
            console.warn('[CHESS] success verify:', e.message);
        }
    }
    const ua = String(req.get('user-agent') || '');
    if (/Quest|OculusBrowser|Oculus|Pacific/i.test(ua)) {
        const q = sessionId ? ('?session_id=' + encodeURIComponent(sessionId)) : '';
        return res.redirect('/games/character-chess/chess-static.html' + q);
    }
    res.render('chess', {
        ...seo.page('chess'),
        sessionId,
        alphaUnlocked: hasChessAlpha(req),
        chessPacks: chessPackStatus(req),
    });
});
app.get('/test-m8q2n5k7', (req, res) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Permissions-Policy', 'xr-spatial-tracking=(self), fullscreen=(self), gamepad=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)');
    res.sendFile(path.join(__dirname, 'public', 'games', 'shark-test-m8q2n5k7', 'index.html'));
});
app.get('/test-p3n8q4v6', (req, res) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Permissions-Policy', 'xr-spatial-tracking=(self), fullscreen=(self), gamepad=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)');
    res.sendFile(path.join(__dirname, 'public', 'games', 'shark-test-p3n8q4v6', 'index.html'));
});
app.get('/test-n8q3v6k2', (req, res) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Permissions-Policy', 'xr-spatial-tracking=(self), fullscreen=(self), gamepad=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)');
    res.sendFile(path.join(__dirname, 'public', 'games', 'shark-test-n8q3v6k2', 'index.html'));
});
app.get('/test-k4w8n2p7', (req, res) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Permissions-Policy', 'xr-spatial-tracking=(self), fullscreen=(self), gamepad=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)');
    res.sendFile(path.join(__dirname, 'public', 'games', 'shark-test-k4w8n2p7', 'index.html'));
});

const SHARK_YT_CHANNEL = 'UClOdltq7PUfU3cLyK0O-6jA';
const SHARK_YT_FALLBACK = ['SQha9mRCsv8', 'hpUL9b0vVX8', 'DjZTj5Gv4NA', '01RVvhkRL_U', 'DGXsDgt5KZY', 'z1PFzPjj024', 'ZwGVGPxJO3E', 'KVKnZgM8_4g'];
let sharkRadioCache = { t: 0, videos: [] };

function sharkClockToSec(s) {
    const p = String(s).split(':').map((n) => parseInt(n, 10));
    if (!p.length || p.some((n) => Number.isNaN(n))) return null;
    if (p.length === 2) return p[0] * 60 + p[1];
    if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
    return null;
}

function sharkVideosFromHtml(html) {
    const out = [];
    const seen = new Set();
    const blocks = String(html).split('lockupViewModel');
    for (let i = 0; i < blocks.length; i++) {
        const idm = blocks[i].match(/\/vi\/([a-zA-Z0-9_-]{11})\//);
        if (!idm || seen.has(idm[1])) continue;
        const tm = blocks[i].match(/"text":"(\d{1,2}:\d{2}(?::\d{2})?)"/);
        const sec = tm ? sharkClockToSec(tm[1]) : null;
        if (sec != null && sec >= 540) continue;
        seen.add(idm[1]);
        out.push(idm[1]);
    }
    if (!out.length) {
        const ids = [...String(html).matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map((m) => m[1]);
        for (let i = 0; i < ids.length; i++) {
            if (!seen.has(ids[i])) {
                seen.add(ids[i]);
                out.push(ids[i]);
            }
        }
    }
    return out;
}

app.get('/api/shark/radio', async (req, res) => {
    const dir = path.join(__dirname, 'public', 'games', 'shark', 'songs');
    let files = [];
    try {
        files = fs.readdirSync(dir).filter((f) => /\.(mp3|ogg|wav|m4a)$/i.test(f) && !f.startsWith('.'));
    } catch (e) {}
    if (files.length) {
        return res.json({
            source: 'local',
            tracks: files.map((f) => '/games/shark/songs/' + encodeURIComponent(f)),
        });
    }
    if (sharkRadioCache.videos.length && Date.now() - sharkRadioCache.t < 10 * 60 * 1000) {
        return res.json({ source: 'youtube', videos: sharkRadioCache.videos, maxSeconds: 540 });
    }
    let videos = [];
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
    try {
        const ac = new AbortController();
        const to = setTimeout(() => ac.abort(), 8000);
        const rss = await fetch(
            'https://www.youtube.com/feeds/videos.xml?channel_id=' + SHARK_YT_CHANNEL,
            { signal: ac.signal, headers: { 'User-Agent': ua } }
        );
        clearTimeout(to);
        if (rss.ok) {
            const xml = await rss.text();
            videos = [...xml.matchAll(/<yt:videoId>([^<]+)<\/yt:videoId>/g)].map((m) => m[1]);
        }
    } catch (e) {
        console.error('[shark radio rss]', e.message);
    }
    if (!videos.length) {
        try {
            const ac = new AbortController();
            const to = setTimeout(() => ac.abort(), 8000);
            const html = await fetch('https://www.youtube.com/@limitationsoflanguage/videos', {
                signal: ac.signal,
                headers: { 'User-Agent': ua, 'Accept-Language': 'en-US,en;q=0.9' },
            }).then((r) => r.text());
            clearTimeout(to);
            videos = sharkVideosFromHtml(html);
        } catch (e) {
            console.error('[shark radio scrape]', e.message);
        }
    }
    if (!videos.length) videos = SHARK_YT_FALLBACK.slice();
    sharkRadioCache = { t: Date.now(), videos };
    res.json({ source: 'youtube', videos, maxSeconds: 540 });
});

// New Eden + Fenrest — unlisted, not on homepage/projects. One combined world, 2 explorers + voice.
try {
    const starleapMmo = require('./starleap-mmo.cjs');
    const starleapWish = require('./starleap-wish.cjs');
    const starleapRtc = require('./starleap-rtc.cjs');
    app.all('/api/mmo', starleapMmo);
    app.all('/api/wish', starleapWish);
    app.all('/api/rtc', starleapRtc);
    console.log('[neweden] mmo + wish + rtc voice mounted');
} catch (e) {
    console.error('[neweden] failed to mount mmo/wish/rtc:', e.message);
}

function newedenHeaders(res) {
    res.setHeader('Permissions-Policy', 'xr-spatial-tracking=(self), fullscreen=(self), gamepad=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self), microphone=(self)');
}

function newedenFile(rel) {
    return path.join(__dirname, 'public', 'games', 'neweden', rel);
}
app.get('/folk/:file', (req, res, next) => {
    const fp = newedenFile(path.join('folk', path.basename(req.params.file || '')));
    if (!fs.existsSync(fp)) return next();
    res.sendFile(fp);
});
app.get('/game/anvil.png', (req, res, next) => {
    const fp = newedenFile(path.join('game', 'anvil.png'));
    if (!fs.existsSync(fp)) return next();
    res.sendFile(fp);
});
app.get('/radio/:file', (req, res, next) => {
    const fp = newedenFile(path.join('radio', path.basename(req.params.file || '')));
    if (!fs.existsSync(fp)) return next();
    res.sendFile(fp);
});

app.get(['/neweden', '/neweden/', '/neweden/login', '/neweden/login/'], (req, res) => {
    newedenHeaders(res);
    const indexPath = path.join(__dirname, 'public', 'games', 'neweden', 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');
    const sess = req.session || {};
    const user = sess.user || (sess.userId ? { name: sess.username || sess.displayName || 'Explorer' } : null);
    const payload = user ? { name: user.displayName || user.name || user.username || '' } : null;
    html = html.replace(/<title>[^<]*<\/title>/i, '');
    html = html.replace(
        '<head>',
        `<head><script>window.__FM_USER__=${JSON.stringify(payload)};</script>${seo.metaHtml('neweden')}`
    );
    res.type('html').send(html);
});


app.get(['/test-m7q2n8kw', '/test-m7q2n8kw/'], (req, res) => {
    newedenHeaders(res);
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    const indexPath = path.join(__dirname, 'public', 'games', 'neweden', 'test-m7q2n8kw', 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');
    const sess = req.session || {};
    const user = sess.user || (sess.userId ? { name: sess.username || sess.displayName || 'Explorer' } : null);
    const payload = user ? { name: user.displayName || user.name || user.username || '' } : null;
    html = html.replace(
        '<head>',
        `<head><script>window.__FM_USER__=${JSON.stringify(payload)};</script>`
    );
    res.type('html').send(html);
});
app.get(['/test-p3w8r6nt', '/test-p3w8r6nt/'], (req, res) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Permissions-Policy', 'xr-spatial-tracking=(self), fullscreen=(self), gamepad=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)');
    res.sendFile(path.join(__dirname, 'public', 'games', 'character-chess', 'test-m7q2n8kw', 'index.html'));
});
app.get(['/test-c8w4k2np', '/test-c8w4k2np/'], (req, res) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Permissions-Policy', 'xr-spatial-tracking=(self), fullscreen=(self), gamepad=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)');
    res.sendFile(path.join(__dirname, 'public', 'games', 'character-chess', 'test-c8w4k2np', 'index.html'));
});
app.get('/test-v8k3n6q2', (req, res) => {
    newedenHeaders(res);
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    const indexPath = path.join(__dirname, 'public', 'games', 'neweden', 'index-test-v8k3n6q2.html');
    let html = fs.readFileSync(indexPath, 'utf8');
    const sess = req.session || {};
    const user = sess.user || (sess.userId ? { name: sess.username || sess.displayName || 'Explorer' } : null);
    const payload = user ? { name: user.displayName || user.name || user.username || '' } : null;
    html = html.replace(
        '<head>',
        `<head><script>window.__FM_USER__=${JSON.stringify(payload)};</script>`
    );
    res.type('html').send(html);
});

// Domain Project Page
app.get('/domain', (req, res) => {
    res.render('domain', seo.page('domain'));
});

app.get('/about', (req, res) => res.render('about', { title: 'About' }));
app.get(['/privacy', '/privacy/'], (req, res) => res.render('privacy', {
    title: 'Privacy Policy | Future Music Collective',
    metaDescription: 'Privacy policy for futuremusic.online and the Blockbuild Quest app: what data we collect, how we use it, and how to request deletion.',
    canonicalUrl: 'https://futuremusic.online/privacy',
    ogTitle: 'Privacy Policy | Future Music Collective',
    ogDescription: 'What data Future Music Collective collects, how it is used, and how to request deletion.',
}));
app.get(['/terms', '/terms/', '/tos', '/tos/'], (req, res) => res.render('terms', {
    title: 'Terms of Service | Future Music Collective',
    metaDescription: 'Terms of service for futuremusic.online and the Blockbuild app on the Meta Horizon Store.',
    canonicalUrl: 'https://futuremusic.online/terms',
    ogTitle: 'Terms of Service | Future Music Collective',
    ogDescription: 'Terms of service for Future Music Collective websites and Blockbuild.',
}));
app.get('/contact', (req, res) => res.render('contact', {
    title: 'Contact',
    sent: String(req.query.sent || '') === '1',
    error: String(req.query.error || ''),
}));
app.get('/advocacy', (req, res) => res.render('advocacy', { title: 'Advocacy' }));

app.get(['/numgen', '/numgen/'], (req, res) => {
    res.render('numgen', seo.page('numgen'));
});
app.get([
    '/random-number-generator',
    '/random-number-generator/',
    '/number-generator',
    '/number-generator/',
    '/10-digit-number-generator',
    '/10-digit-number-generator/',
    '/random-number-picker',
    '/random-number-picker/'
], (req, res) => {
    res.redirect(301, '/numgen');
});

// Handle Contact Form Submission
app.post('/contact', async (req, res) => {
    const honeypot = String(req.body.company || req.body.website || '').trim();
    if (honeypot) return res.redirect('/contact?sent=1');

    const name = String(req.body.codename || req.body.name || '').trim();
    const email = String(req.body.email || '').trim();
    const subjectKey = String(req.body.subject || '').trim();
    const subject = CONTACT_SUBJECTS[subjectKey] || subjectKey || 'General';
    const message = String(req.body.message || '').trim();
    const ip = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();

    if (!name || !email || !message) {
        return res.redirect('/contact?error=missing');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.redirect('/contact?error=email');
    }
    if (!contactRateOk(ip || 'unknown')) {
        return res.redirect('/contact?error=rate');
    }

    try {
        const via = await deliverContactMail({ name, email, subject, message, ip });
        await storeContactMessage({ name, email, subject, message });
        console.log('[CONTACT] delivered via', via, 'from', email);
        return res.redirect('/contact?sent=1');
    } catch (err) {
        console.error('Contact Form Error:', err);
        try {
            const saved = await storeContactMessage({ name, email, subject, message });
            if (saved) {
                console.warn('[CONTACT] mail failed, stored in database');
                return res.redirect('/contact?sent=1');
            }
        } catch (dbErr) {
            console.error('Contact fallback store failed:', dbErr.message);
        }
        return res.redirect('/contact?error=send');
    }
});

// ============================================================================
// --- JUSTICE PORTAL: ISOLATED SYSTEM ---
// ============================================================================

// --- EVIDENCE CATALOG ---
const standardAnalyses = [
    { title: 'Cruel & Unnecessary Punishment', url: '/analysis/cruel and unneccessary punishment summary.pdf' },
    { title: 'Evidence Failures', url: '/analysis/evidence failures.pdf' },
    { title: 'Human Rights Basis', url: '/analysis/human rights basis summary.pdf' },
    { title: 'Legal & Moral Error', url: '/analysis/Legal and moral error summary (trial court).pdf' }
];

const evidenceCatalog = [
    { 
        id: 'exhibits_pdf', 
        title: 'Defendant_Copy of Exhibits_Tendered.pdf', 
        type: 'split-screen', 
        url: '/evidence/Defendant_Copy of Exhibits_Tendered.pdf', 
        documentHash: 'Pending Verification', 
        aiAnalyses: [
            { title: 'Evidence Failures', url: '/analysis/evidence failures.pdf' }
        ] 
    },
    { id: 'parton_2_5', title: 'parton.f.2.5.25.pdf', type: 'split-screen', url: '/evidence/parton.f.2.5.25.pdf', documentHash: 'Pending Verification', aiAnalyses: standardAnalyses },
    { id: 'parton_3_12', title: 'parton.f.3.12.25.pdf', type: 'split-screen', url: '/evidence/parton.f.3.12.25.pdf', documentHash: 'Pending Verification', aiAnalyses: standardAnalyses },
    { id: 'parton_5_15', title: 'parton.f.5.15.25.pdf', type: 'split-screen', url: '/evidence/parton.f.5.15.25.pdf', documentHash: 'Pending Verification', aiAnalyses: standardAnalyses },
    { id: 'parton_5_21', title: 'parton.f.5.21.25.pdf', type: 'split-screen', url: '/evidence/parton.f.5.21.25.pdf', documentHash: 'Pending Verification', aiAnalyses: standardAnalyses },
    { id: 'parton_5_22', title: 'parton.f.5.22.25.pdf', type: 'split-screen', url: '/evidence/parton.f.5.22.25.pdf', documentHash: 'Pending Verification', aiAnalyses: standardAnalyses },
    { id: 'parton_7_2', title: 'parton.f.7.2.25.pdf', type: 'split-screen', url: '/evidence/parton.f.7.2.25.pdf', documentHash: 'Pending Verification', aiAnalyses: standardAnalyses },
    { id: 'parton_7_7', title: 'parton.f.7.7.25.pdf', type: 'split-screen', url: '/evidence/parton.f.7.7.25.pdf', documentHash: 'Pending Verification', aiAnalyses: standardAnalyses },
    { id: 'parton_7_9', title: 'parton.f.7.9.25.pdf', type: 'split-screen', url: '/evidence/parton.f.7.9.25.pdf', documentHash: 'Pending Verification', aiAnalyses: standardAnalyses },
    { id: 'parton_8_27', title: 'parton.f.8.27.25.pdf', type: 'split-screen', url: '/evidence/parton.f.8.27.25.pdf', documentHash: 'Pending Verification', aiAnalyses: standardAnalyses },
    { id: 'parton_9_18', title: 'parton.f.9.18.25.pdf', type: 'split-screen', url: '/evidence/parton.f.9.18.25.pdf', documentHash: 'Pending Verification', aiAnalyses: standardAnalyses },
    { id: 'parton_10_29', title: 'parton.f.10.29.25.pdf', type: 'split-screen', url: '/evidence/parton.f.10.29.25.pdf', documentHash: 'Pending Verification', aiAnalyses: standardAnalyses },
    { 
        id: 'video_evidence_1', 
        title: 'Video Evidence 1 (External)', 
        type: 'video', 
        url: 'https://storage.googleapis.com/futuremusic/evidence/video1.mp4', 
        documentHash: 'Pending Verification' 
    },
    { 
        id: 'video_evidence_2', 
        title: 'Video Evidence 2 (External)', 
        type: 'video', 
        url: 'https://storage.googleapis.com/futuremusic/evidence/video2.mp4', 
        documentHash: 'Pending Verification' 
    }
];

// --- AI ANALYSIS CATALOG (For the Dropdown) ---
// Note: The data-target="p3-l45" must exactly match the id="p3-l45" in the transcriptHtml above.
const aiAnalyses = [];

// --- JUSTICE PORTAL: ROUTES ---

// 1. Main Portal Page
app.get('/justice', (req, res) => {
    res.render('justice', { 
        title: 'Public Evidence & Accountability Portal', 
        user: req.session.linkedinProfile || null,
        evidenceCatalog: evidenceCatalog
    });
});

// 2. Split Screen Review Route
app.get('/justice/review/:id', (req, res) => {
    const doc = evidenceCatalog.find(d => d.id === req.params.id);
    if (!doc) return res.redirect('/justice');
    
    res.render('review', { title: doc.title, doc: doc, catalog: evidenceCatalog });
});

// 3. LinkedIn Auth Flow (Strictly for the Justice Portal)
app.get('/auth/linkedin', (req, res) => {
    const redirectUri = `${DOMAIN}/auth/linkedin/callback`;
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const scope = 'openid profile email';
    const state = req.sessionID;
    const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scope)}`;
    res.redirect(url);
});

app.get('/auth/linkedin/callback', async (req, res) => {
    const { code, error } = req.query;
    if (error) return res.send(`Authentication Error: ${error}`);
    try {
        const redirectUri = `${DOMAIN}/auth/linkedin/callback`;
        const tokenRes = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
            client_id: process.env.LINKEDIN_CLIENT_ID,
            client_secret: process.env.LINKEDIN_CLIENT_SECRET
        }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

        const accessToken = tokenRes.data.access_token;
        const profileRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        // Save secure LinkedIn data to session
        req.session.linkedinProfile = profileRes.data;
        res.redirect('/justice'); // Send them back to the portal
    } catch (err) {
        console.error("LinkedIn Auth Failed:", err.response ? err.response.data : err.message);
        res.status(500).send('LinkedIn Verification Failed. Check your API keys.');
    }
});

// --- NEW CODE: Justice Portal Verification Endpoints ---
app.post('/api/justice/verify-lawyer', (req, res) => {
    const { state, barNumber } = req.body;
    // Automated verification logic: checking formatting. In production, this would query a state bar API.
    if (state && barNumber && barNumber.length >= 4) {
        res.json({ success: true, message: "Credentials verified." });
    } else {
        res.json({ success: false, message: "Invalid credentials." });
    }
});

app.post('/api/justice/send-verification', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    const token = crypto.randomBytes(20).toString('hex');
    pendingVerifications[token] = email;

    const verifyLink = `${DOMAIN}/justice/verify-email?token=${token}`;

    try {
        if (!transporter) {
            return res.status(503).json({ error: "Failed to send email. Check SMTP configuration." });
        }
        await transporter.sendMail({
            from: `"Justice Portal" <${process.env.SMTP_USER || 'noreply@futuremusic.online'}>`,
            to: email,
            subject: "Verify your email for the Justice Portal",
            text: `Please verify your email by clicking this link: ${verifyLink}`,
            html: `<p>Please verify your email by clicking this link: <a href="${verifyLink}">${verifyLink}</a></p>`
        });
        res.json({ success: true });
    } catch (err) {
        console.error("Email send error:", err);
        res.status(500).json({ error: "Failed to send email. Check SMTP configuration." });
    }
});

app.get('/justice/verify-email', (req, res) => {
    const { token } = req.query;
    if (token && pendingVerifications[token]) {
        const email = pendingVerifications[token];
        req.session.verifiedEmail = email;
        delete pendingVerifications[token];
        res.send('<script>alert("Email verified successfully! You can close this tab and submit your attestation."); window.close();</script>');
    } else {
        res.status(400).send("Invalid or expired verification token.");
    }
});

app.get('/api/justice/check-email-verification', (req, res) => {
    if (req.session.verifiedEmail) {
        res.json({ verified: true, email: req.session.verifiedEmail });
    } else {
        res.json({ verified: false });
    }
});
// --- END NEW CODE ---

app.post('/api/justice/attest', async (req, res) => {
    const { 
        signatureHash, walletAddress, drawnSignatureBase64, 
        fullName, emailAddress, phoneNumber,
        agreeAcquit, agreeDisqualify, rationale, 
        isLawyer, barNumber, state, timeTracking 
    } = req.body;

    const linkedinProfile = req.session.linkedinProfile;

    // Enforce at least LinkedIn OR Email
    if (!linkedinProfile && (!emailAddress || req.session.verifiedEmail !== emailAddress)) {
        return res.status(400).json({ error: 'Must provide either a verified Email Address or verify via LinkedIn.' });
    }

    const attestationRecord = {
        schema: "EAS-Judicial-Accountability-v2",
        timestamp: new Date().toISOString(),
        identity: {
            linkedinVerifiedName: linkedinProfile ? linkedinProfile.name : 'Unverified',
            linkedinId: linkedinProfile ? linkedinProfile.sub : 'N/A', 
            providedFullName: fullName,
            providedEmail: emailAddress || (linkedinProfile ? linkedinProfile.email : 'N/A'),
            providedPhone: phoneNumber || 'N/A',
            verifiedVia: linkedinProfile ? 'LinkedIn + Manual Entry' : 'Manual Entry (Email)'
        },
        professionalCredentials: {
            isLawyer: isLawyer,
            state: state || 'N/A',
            barNumber: barNumber || 'N/A'
        },
        cryptographicProof: {
            signerAddress: walletAddress,
            walletSignature: signatureHash, 
            drawnSignature: drawnSignatureBase64 
        },
        evidenceReviewed: evidenceCatalog.map(doc => ({
            id: doc.id,
            title: doc.title,
            documentHash: doc.documentHash, 
            timeSpentSeconds: timeTracking[doc.id] || 0
        })),
        attestation: {
            concludesAcquittal: agreeAcquit,
            concludesJudgeDisqualified: agreeDisqualify,
            rationale: rationale
        }
    };

    try {
        const pinataUrl = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
        const response = await axios.post(pinataUrl, attestationRecord, {
            headers: {
                'Content-Type': 'application/json',
                pinata_api_key: process.env.PINATA_API_KEY,
                pinata_secret_api_key: process.env.PINATA_SECRET_KEY
            }
        });

        res.json({ success: true, ipfsHash: response.data.IpfsHash });
    } catch (err) {
        console.error("Pinata Upload Error:", err.response ? err.response.data : err.message);
        res.status(500).json({ error: 'Failed to upload to IPFS' });
    }
});


// --- DEBUG ROUTE: VIEW DATA WITHOUT CRASHING ---
// NOTE: We removed 'requireAuth' so you can access this without logging in
app.get('/account/debug', async (req, res) => {
    
    // 1. HARDCODE A USER ID FOR TESTING (Use 1, or whatever your User ID is)
    const testUserId = 1; 
    
    // 2. Initialize Safe Defaults
    let user = { id: testUserId, email: 'debug_test', full_name: 'Debug User' };
    let digitalAssets = [];
    let physicalOrders = [];
    let mySkins = [];

    // 3. Run the queries manually to test the DB
    if (pool) {
        try {
            const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [testUserId]);
            if (rows.length > 0) user = rows[0];
        } catch (e) { user.error = e.message; }

        try {
            const [dRows] = await pool.query("SELECT * FROM orders WHERE user_id = ? AND product_type = 'digital' ORDER BY created_at DESC", [testUserId]);
            digitalAssets = dRows;
        } catch (e) { digitalAssets = [{error: e.message}]; }
        
        try {
            const [pRows] = await pool.query("SELECT * FROM orders WHERE user_id = ? AND (product_type IS NULL OR product_type != 'digital') ORDER BY created_at DESC", [testUserId]);
            physicalOrders = pRows;
        } catch (e) { physicalOrders = [{error: e.message}]; }

        try {
            const [sRows] = await pool.query("SELECT * FROM user_skins WHERE user_id = ?", [testUserId]);
            mySkins = Array.isArray(sRows) ? sRows : [];
        } catch (e) { mySkins = [{error: e.message}]; }
    }

    // 4. Dump the result as JSON
    res.json({
        DEBUG_MODE: true,
        testUserId: testUserId,
        dbStatus: (typeof dbConnectionStatus !== 'undefined' ? dbConnectionStatus : 'UNKNOWN'),
        userData: user,
        digitalAssets: digitalAssets,
        physicalOrders: physicalOrders,
        skins: mySkins
    });
});
// ADDED: Account Page Route
// ADDED: Account Page Route (Robust Version)
app.get('/account', requireAuth, async (req, res) => {
    // 0. MASTER ERROR TRAP: Wrap the ENTIRE route logic
    try {
        console.log("ðŸŸ¢ DEBUG: Account Route Hit. User ID:", req.session.userId);

        // 1. Initialize Safe Defaults (So page never crashes even if DB fails)
        let user = { 
            id: req.session.userId, 
            email: req.session.email || 'Traveler',
            full_name: 'Anonymous',
            created_at: new Date(),
            private_message: null,
            avatar_url: null
        };
        let digitalAssets = [];
        let physicalOrders = [];
        let mySkins = [];
        let cartCount = 0;

        // 2. Safely Fetch Data (Independent Blocks)
        // We use separate try/catch blocks so one missing table doesn't crash the whole page.
        if (pool) {
            console.log("ðŸŸ¢ DEBUG: DB Pool active. Fetching data...");
            
            // A. User Data
            try {
                const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [req.session.userId]);
                if (rows.length > 0) user = rows[0];
            } catch (e) { console.error("âš ï¸ Account - User Fetch Error:", e.message); }

            // B. Cart Count
            try {
                const sid = req.sessionID || '';
                const [cRows] = await pool.query("SELECT SUM(quantity) as count FROM cart_items WHERE session_id = ?", [sid]);
                if (cRows.length > 0 && cRows[0].count) cartCount = parseInt(cRows[0].count);
            } catch (e) { console.error("âš ï¸ Account - Cart Fetch Error:", e.message); }

            // C. Orders (Digital & Physical)
            try {
const [dRows] = await pool.query(`
SELECT o.*, p.download_reference, p.sku, p.image_url 
FROM orders o 
LEFT JOIN products p ON (o.product_sku = p.sku OR p.name = o.description) 
WHERE o.user_id = ? AND o.product_type = 'digital' 
ORDER BY o.created_at DESC
`, [req.session.userId]);                digitalAssets = dRows;
                
                const [pRows] = await pool.query("SELECT * FROM orders WHERE user_id = ? AND (product_type IS NULL OR product_type != 'digital') ORDER BY created_at DESC", [req.session.userId]);
                physicalOrders = pRows;
            } catch (e) { 
                console.error("âš ï¸ Account - Orders Fetch Error:", e.message); 
            }

            // D. Skins
            try {
                const [sRows] = await pool.query("SELECT * FROM user_skins WHERE user_id = ?", [req.session.userId]);
                mySkins = Array.isArray(sRows) ? sRows : [];
                
                // Color Logic for Skins
                for (let skin of mySkins) {
                    if (!skin.frame_color) {
                        const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
                        skin.frame_color = randomColor;
                        if (skin.id) {
                            pool.query("UPDATE user_skins SET frame_color = ? WHERE id = ?", [randomColor, skin.id]).catch(err => {});
                        }
                    }
                }
            } catch (e) { console.error("âš ï¸ Account - Skins Fetch Error:", e.message); }
        } else {
            console.log("ðŸŸ  DEBUG: DB Pool is missing/offline.");
        }

        // 3. Render Page
        console.log("ðŸŸ¢ DEBUG: All data fetched. Rendering EJS now...");
        
        res.render('account', { 
            title: 'Command Center', 
            user: user, 
            digitalAssets: digitalAssets,
            physicalOrders: physicalOrders,
            gameSkins: mySkins,
            cartCount: cartCount,
            // --- FIXES START: Variables required by Header/Footer ---
            path: req.path,          // Fixes "Active Link" logic in header
            query: req.query,        // Fixes "Search Bar" logic in header
            dbStatus: dbConnectionStatus || 'UNKNOWN', // Fixes debug banners
            // --- FIXES END ---
        });

    } catch (criticalErr) {
        // --- THE NUCLEAR LOGGER ---
        // This catches ANY crash in the route, not just the render part.
        
        console.error("ðŸ”´ CRITICAL CRASH IN /ACCOUNT ROUTE:", criticalErr);
        
        // Force Cloud Run to see it as an ERROR
        console.log(JSON.stringify({
            severity: 'ERROR',
            component: 'account_route_crash',
            message: "CRITICAL: Account Route Failed",
            error_message: criticalErr.message,
            stack_trace: criticalErr.stack
        }));

        // Show the error to YOU in the browser
        res.status(500).send(`
            <div style="background: #000; color: #ff5555; padding: 50px; font-family: monospace;">
                <h1>ðŸ›‘ CRITICAL ROUTE ERROR</h1>
                <p>The server crashed before it could finish loading the page.</p>
                <hr style="border-color: #333;">
                <h3>Error Details:</h3>
                <pre style="background: #111; padding: 20px; border: 1px solid #333;">${criticalErr.message}</pre>
                <h3>Stack Trace:</h3>
                <pre style="background: #111; padding: 20px; border: 1px solid #333; white-space: pre-wrap;">${criticalErr.stack}</pre>
            </div>
        `);
    }
});
// ... existing code ...



// --- NEW ACCOUNT ACTION ROUTES ---

// Change Email (Robust Version)
app.post('/account/update-email', requireAuth, async (req, res) => {
    const { newEmail } = req.body;
    if (!newEmail) return res.redirect('/account');
    
    try {
        if(pool) {
            // 1. Check if email is already taken by another user
            const [existing] = await pool.query("SELECT id FROM users WHERE email = ? AND id != ?", [newEmail, req.session.userId]);
            if (existing.length > 0) {
                 return res.send('<script>alert("That email address is already in use."); window.location.href="/account";</script>');
            }

            // 2. Perform Update
            await pool.query("UPDATE users SET email = ? WHERE id = ?", [newEmail, req.session.userId]);
            req.session.email = newEmail; 
            
            // 3. Force Session Save (Fixes the "not logged in" glitch after update)
            req.session.save((err) => {
                if (err) console.error("Session save error", err);
                res.send('<script>alert("Email updated successfully."); window.location.href="/account";</script>');
            });
            return;
        }
        res.redirect('/account');
    } catch (err) {
        console.error("Update email error:", err);
        // Keep user in the flow instead of showing a white error page
        res.send('<script>alert("Error updating email. Please try again."); window.location.href="/account";</script>');
    }
});


// Reset (Change) Password
app.post('/account/update-password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    try {
        if (!pool) throw new Error("DB Offline");
        
        // 1. Fetch current user hash
        const [users] = await pool.query("SELECT password_hash FROM users WHERE id = ?", [req.session.userId]);
        if (users.length === 0) return res.redirect('/login');
        
        // 2. Compare old password
        const match = await bcrypt.compare(currentPassword, users[0].password_hash);
        if (!match) {
            return res.send('<script>alert("Current password incorrect."); window.location.href="/account";</script>');
        }
        
        // 3. Hash new password and update
        const newHash = await bcrypt.hash(newPassword, 10);
        await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, req.session.userId]);
        
        res.send('<script>alert("Password updated successfully."); window.location.href="/account";</script>');
        
    } catch (err) {
        console.error("Update password error:", err);
        res.status(500).send("Error updating password.");
    }
});

// Transmit Private Message
app.post('/account/message', requireAuth, async (req, res) => {
    const { message } = req.body;
    if (!message) return res.redirect('/account');

    try {
        if (!pool) throw new Error("DB Offline");

        // 1. Check if user already has a message sent (extra security, though UI disables it too)
        const [users] = await pool.query("SELECT private_message FROM users WHERE id = ?", [req.session.userId]);
        if (users[0] && users[0].private_message) {
             return res.send('<script>alert("You have already transmitted your one message."); window.location.href="/account";</script>');
        }

        // 2. Update
        await pool.query("UPDATE users SET private_message = ? WHERE id = ?", [message, req.session.userId]);
        
        res.redirect('/account');

    } catch (err) {
        console.error("Message transmission error:", err);
        res.status(500).send("Error transmitting message.");
    }
});


app.get('/music', (req, res) => {
    if (req.query.song) return res.redirect(`/song/${req.query.song}`);
    res.render('music', { songs: songsData, title: 'Music' });
});

app.get('/song/:id', (req, res) => {
    const songId = req.params.id;
    const song = songsData.find(s => {
        if (s.youtube_info && s.youtube_info.video_id === songId) return true;
        if (s.spotify_id === songId) return true;
        return false;
    });
    if (song) res.render('song', { song: song, title: song.name });
    else res.status(404).render('404', { title: 'Signal Lost' });
});

// Hide merch whose Printify/local images 404 or return JSON errors.
const merchImageCache = new Map();
const MERCH_IMG_TTL_MS = 45 * 60 * 1000;

function merchImageLooksOk(url) {
    if (!url || typeof url !== 'string') return Promise.resolve(false);
    const now = Date.now();
    const hit = merchImageCache.get(url);
    if (hit && now - hit.t < MERCH_IMG_TTL_MS) return Promise.resolve(hit.ok);

    if (url.startsWith('/') && !url.startsWith('//')) {
        const abs = path.join(__dirname, 'public', url.replace(/^\//, ''));
        const ok = fs.existsSync(abs);
        merchImageCache.set(url, { ok, t: now });
        return Promise.resolve(ok);
    }

    return new Promise((resolve) => {
        let settled = false;
        const finish = (ok) => {
            if (settled) return;
            settled = true;
            merchImageCache.set(url, { ok, t: Date.now() });
            resolve(ok);
        };
        let parsed;
        try { parsed = new URL(url); } catch (e) { finish(false); return; }
        const lib = parsed.protocol === 'https:' ? https : http;
        const req = lib.request({
            method: 'GET',
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            headers: { 'User-Agent': 'futuremusic-merch-image-check', Range: 'bytes=0-128' },
            timeout: 4000,
        }, (res) => {
            res.resume();
            const code = res.statusCode || 0;
            const type = String(res.headers['content-type'] || '');
            const loc = res.headers.location;
            if (code >= 300 && code < 400 && loc && (loc.startsWith('http') || loc.startsWith('/'))) {
                const next = loc.startsWith('http') ? loc : parsed.origin + loc;
                merchImageLooksOk(next).then(finish);
                return;
            }
            finish((code === 200 || code === 206) && /image|jpeg|jpg|png|webp|gif|octet/i.test(type));
        });
        req.on('error', () => finish(false));
        req.on('timeout', () => { req.destroy(); finish(true); });
        req.end();
    });
}

async function keepMerchWithWorkingImages(products) {
    if (!Array.isArray(products) || !products.length) return [];
    const flags = new Array(products.length);
    let i = 0;
    const workers = Array.from({ length: Math.min(12, products.length) }, async () => {
        while (i < products.length) {
            const idx = i++;
            flags[idx] = await merchImageLooksOk(products[idx] && products[idx].image_url);
        }
    });
    await Promise.all(workers);
    return products.filter((_, n) => flags[n]);
}

// --- ROBUST MERCH ROUTE ---
app.get('/merch', async (req, res) => {
    const { type, sort, maxPrice } = req.query;
    const commonPayload = { query: req.query || {}, user: null, cartCount: 0 };

    try {
        if (pool) {
           let sql = "SELECT * FROM products WHERE 1=1 AND type != 'digital' AND image_url IS NOT NULL AND image_url != '' AND image_url LIKE 'http%'";

            const params = [];
            if (type && type !== 'all') { sql += " AND type = ?"; params.push(type); }
            if (maxPrice) { sql += " AND price <= ?"; params.push(maxPrice); }
                        // --- ADDED: Search Filter ---
            if (req.query.search) { 
                sql += " AND (name LIKE ? OR description LIKE ?)"; 
                const term = `%${req.query.search}%`;
                params.push(term, term); 
            }

            if (sort === 'price_asc') sql += " ORDER BY price ASC";
            else if (sort === 'price_desc') sql += " ORDER BY price DESC";
            else sql += " ORDER BY created_at DESC";

const result = await query(sql, params);
                       const products = result.rows.map(p => {
                // 1. Parse sizes
                if (typeof p.sizes === 'string') { try { p.sizes = JSON.parse(p.sizes); } catch(e) { p.sizes = []; } }
                else if (!Array.isArray(p.sizes)) { p.sizes = []; }

                // 2. NEW LOGIC: Extract "real" sizes from metadata variants
                if (p.metadata) {
                    try {
                        let meta = p.metadata;
                        // Handle potential double-stringification
                        if (typeof meta === 'string') { try { meta = JSON.parse(meta); } catch (e) {} }
                        if (typeof meta === 'string') { try { meta = JSON.parse(meta); } catch (e) {} }

                        if (meta && meta.variants && Array.isArray(meta.variants)) {
                            let extractedSizes = meta.variants
                                .filter(v => v.is_available === true)
                                .map(v => {
                                    if (!v.title) return null;
                                    // Cleans "L / Black" down to just "L"
                                    return v.title.split(' / ')[0].trim();
                                })
                                .filter(s => s);
                            
                            // Deduplicate (remove duplicate 'L' entries)
                            extractedSizes = [...new Set(extractedSizes)];

                            // If we found valid variants, OVERRIDE the default sizes
                            if (extractedSizes.length > 0) {
                                p.sizes = extractedSizes;
                            }
                        }
                    } catch (e) {
                        console.error("Metadata error for product:", p.sku);
                    }
                }

                // 3. FINAL CLEANUP: Remove empty strings (""), spaces (" "), or nulls
                p.sizes = p.sizes.filter(s => s && s.toString().trim().length > 0);
                
                return p;
            });

            const visible = await keepMerchWithWorkingImages(products);
            if (visible.length === 0 && !type && !maxPrice) {
                const mocks = await keepMerchWithWorkingImages(mockMerchItems);
                res.render('merch', { ...commonPayload, merch: mocks, title: 'Merch (DB Empty)', debugError: products.length ? null : "Connected but no products found.", dbStatus: "CONNECTED (EMPTY)" });
            } else {
                res.render('merch', { ...commonPayload, merch: visible, title: 'Merch', debugError: null });
            }
        } else {
            let filtered = mockMerchItems.filter(p => p.type !== 'digital');
            if (type && type !== 'all') filtered = filtered.filter(p => p.type === type);
            if (maxPrice) filtered = filtered.filter(p => p.price <= maxPrice);
            if (sort === 'price_asc') filtered.sort((a,b) => a.price - b.price);
            else if (sort === 'price_desc') filtered.sort((a,b) => b.price - a.price);
            filtered = await keepMerchWithWorkingImages(filtered);

            res.render('merch', { ...commonPayload, merch: filtered, title: 'Merch (Offline)', debugError: dbErrorDetail || "Unknown DB Error", dbStatus: dbConnectionStatus });
        }
    } catch (err) {
        console.error("Merch Route Error:", err);
        try {
            const mocks = await keepMerchWithWorkingImages(mockMerchItems);
            res.render('merch', { ...commonPayload, merch: mocks, title: 'Merch (Crash)', debugError: err.message, dbStatus: "CRASHED" });
        } catch (renderErr) {
            res.status(500).send(`<h1>Critical Error</h1><p>${err.message}</p>`);
        }
    }
});

app.get('/merch/:id', async (req, res) => {
    try {
        let product;
        if (pool) {
            const querySql = "SELECT * FROM products WHERE CAST(id AS CHAR) = ? OR sku = ?";
            const result = await query(querySql, [req.params.id, req.params.id]);
            product = result.rows[0];
            const sku = product ? product.sku || req.params.id : req.params.id; 
            let sizes = [];

if (product.metadata) {
    try {
        let meta = product.metadata;

        // 1. Attempt to parse if it's a string
        if (typeof meta === 'string') {
            try { meta = JSON.parse(meta); } catch (e) { /* ignore first fail */ }
        }
        
        // 2. CHECK FOR DOUBLE STRINGIFICATION (Common in CSV imports)
        // If it is STILL a string after the first parse, parse it again.
        if (typeof meta === 'string') {
            try { meta = JSON.parse(meta); } catch (e) { console.error('Double parse failed:', e); }
        }

        // 3. Extract Variants
        if (meta && meta.variants && Array.isArray(meta.variants)) {
            sizes = meta.variants
                .filter(v => v.is_available === true) // <--- CHANGED: Removed is_enabled check
                .map(v => {
                    if (!v.title) return null;
                    // Handles "L / Black" -> "L" AND "Large" -> "Large"
                    return v.title.split(' / ')[0].trim();
                })
                .filter(s => s); // Remove nulls
            
            // Deduplicate
            sizes = [...new Set(sizes)];
        }
    } catch (e) {
        console.error("Metadata error for SKU:", sku, e);
    }
}

// DEBUG: Check your server console when you load the page to see if this array is populated
console.log(`SKU: ${sku} | Extracted Sizes:`, sizes); 
            if (product && typeof product.sizes === 'string') { try { product.sizes = JSON.parse(product.sizes); } catch(e) { product.sizes = []; } }
            if (sizes.length > 0) {
    product.sizes = sizes;
}
        } else {
            product = mockMerchItems.find(m => m.id === req.params.id || m.sku === req.params.id);
            
        }
        if (product && typeof product.sizes === 'string') { try { product.sizes = JSON.parse(product.sizes); } catch(e) { product.sizes = []; } }
        if (product && !(await merchImageLooksOk(product.image_url))) {
            return res.redirect('/merch');
        }
        if (product) res.render('product', { product: { ...product, sizes: product.sizes }, title: product.name });
        else res.status(404).render('404', { title: 'Product Not Found' });
    } catch (err) {
        res.status(500).render('404', { title: 'Error' });
    }
});

app.get('/rights', (req, res) => res.render('rights', { songs: songsData, title: 'Purchase Rights' }));
app.get('/rights/confirmation', (req, res) => res.render('rights_confirmation', { title: 'Inquiry Received' }));
app.get('/cart', (req, res) => res.render('cart', { title: 'Your Inventory' }));


app.post('/initiate-checkout', async (req, res) => {
    // 1. Destructure all fields (Note: password is removed, shipping fields added)
    const { sessionId, fullName, email, phone, address, city, state, zip, country } = req.body;
    const userId = req.session.userId;

    // 2. Validation Checks
    if (!pool) return res.status(500).json({ error: "DB Offline" });
    
    // Enforce Login
    if (!userId) {
        return res.status(401).json({ error: 'User must be logged in' });
    }

    if (!stripe) {
        console.error("âŒ Checkout blocked: Stripe is not configured.");
        return res.status(503).json({ error: "Payment gateway is not configured (Missing STRIPE_SECRET_KEY)." });
    }

    try {
        // 3. Update User Profile with Shipping Data
        // We update the existing logged-in user instead of creating a new one
        await query(
            `UPDATE users SET 
             full_name = ?, phone = ?, 
             shipping_address = ?, shipping_city = ?, shipping_state = ?, shipping_zip = ?, shipping_country = ?
             WHERE id = ?`,
            [fullName, phone, address, city, state, zip, country, userId]
        );

        // 4. Fetch Cart Items (Existing Logic)
        const cartQuery = `
            SELECT ci.quantity, ci.size, p.name, p.price, p.sku, p.type, p.image_url
            FROM cart_items ci
            JOIN products p ON ci.product_sku = p.sku
            WHERE ci.session_id = ?
        `;
        const cartResult = await query(cartQuery, [sessionId]);
        const cartItems = cartResult.rows || cartResult; // Handle if rows is direct array or property

        if (!cartItems || cartItems.length === 0) return res.status(400).json({ error: "Cart is empty" });

        // 5. Construct Line Items (Existing Logic)
        const hasPhysicalItems = cartItems.some(item => item.type !== 'digital');
        const lineItems = cartItems.map(item => {
            let desc = item.type;
            if (item.size) desc += ` | Size: ${item.size}`;
            
            // ROBUST IMAGE URL CONSTRUCTION
            let itemImages = [];
            if (item.image_url) {
                if (item.image_url.startsWith('http')) {
                    itemImages = [item.image_url];
                } else {
                    itemImages = [`${process.env.DOMAIN || 'http://localhost:8080'}${item.image_url}`];
                }
            }

            return {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: item.name,
                        description: desc, 
                        metadata: { sku: item.sku, type: item.type, size: item.size },
                        images: itemImages,
                    },
                    unit_amount: Math.round(Number(item.price) * 100),
                },
                quantity: item.quantity,
            };
        });

// 1. Get the dynamic domain (This fixes the broken back link)
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.get('host');
        const domain = `${protocol}://${host}`;

        // 2. Configure the Session
        const sessionConfig = {
            payment_method_types: ['card'],
            customer_email: email, // Preserves the email from your form
            line_items: lineItems,
            mode: 'payment',
            // CRITICAL: We use 'app_session_id' to match the success route logic we added
            metadata: { 
                app_session_id: sessionId,
                userId: (typeof userId !== 'undefined' && userId) ? userId.toString() : null 
            },
            // Note: pointing to '/success' to match the new route we created
            success_url: `${domain}/success?session_id={CHECKOUT_SESSION_ID}`, 
            cancel_url: `${domain}/cart`, // Fixes the back button issue
        };

        // 3. Preserve Shipping Address Collection if needed
        if (typeof hasPhysicalItems !== 'undefined' && hasPhysicalItems) {
            sessionConfig.shipping_address_collection = { allowed_countries: ['US', 'CA', 'GB'] };
        }

        // 4. Create the Session
        console.log(`ðŸš€ Creating Stripe Session for ${domain}`);
        const session = await stripe.checkout.sessions.create(sessionConfig);
        
        // 7. Record Order in DB
// --- REPLACEMENT CODE START ---

// 1. Fetch cart items WITH product details from your products table
// We join cart_items with products to get the description and type
// 7. Record Order in DB (UPDATED)
// --- REPLACEMENT CODE START ---

// 1. Fetch cart items WITH product details from your products table
// ADDED: p.name and p.price to the SELECT list so they are available for the insert
const [itemsToOrder] = await pool.query(`
    SELECT 
        ci.*, 
        p.name,
        p.price,
        p.type AS product_type, 
        p.description 
    FROM cart_items ci
    JOIN products p ON ci.product_sku = p.sku
    WHERE ci.session_id = ?
`, [sessionId]);

// 2. Insert into orders with the new fields
for (const item of itemsToOrder) {
    await pool.query(`
        INSERT INTO orders (
            user_id, 
            stripe_session_id,
            total_amount, 
            payment_status, 
            product_type,
            product_sku,
            size,            
            description,
            status,     
            created_at
        ) VALUES (?, ?, ?, 'unpaid', ?, ?, ?, ?, ?, NOW())
    `, [
        userId, 
        session.id,           
        item.price || 0,      
        item.product_type,
        item.product_sku,           // <--- NEW: Saving the SKU
        item.size || 'N/A', 
        item.name,            
        'order received'      
    ]);
}
// --- REPLACEMENT CODE END ---
// --- REPLACEMENT CODE END ---
        
        res.json({ id: session.id });

    } catch (err) {
        console.error("Checkout Error:", err);
        res.status(500).json({ error: "Checkout failed: " + err.message });
    }
});


// --- NEW ROUTE: Handle Stripe Success ---
app.get('/success', async (req, res) => {
    const sessionId = req.query.session_id;

    try {
        // 1. Clean up the cart (Optional but recommended)
        // We try to retrieve the Stripe session to find the original app_session_id
        if (stripe && sessionId && pool) {
            try {
                const session = await stripe.checkout.sessions.retrieve(sessionId);
                const appSessionId = session.metadata.app_session_id;
                
                if (appSessionId) {
                    await pool.query("DELETE FROM cart_items WHERE session_id = ?", [appSessionId]);
                    console.log(`ðŸ›’ Cart cleared for session: ${appSessionId}`);
                }
            } catch (err) {
                console.error("âš ï¸ Failed to clear cart after success:", err.message);
            }
        }

        // 2. Redirect to Account
        res.redirect('/account');

    } catch (err) {
        console.error("Success Route Error:", err);
        res.redirect('/account'); // Fallback to account anyway
    }
});


app.post('/api/cart', async (req, res) => {
    const { sessionId, sku, quantity, size } = req.body;
    if (!sessionId || !sku) return res.status(400).json({ error: 'Missing data' });
    const storedSize = size || '';

    if (pool) {
        try {
            await query("INSERT INTO carts (session_id, updated_at) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE updated_at = NOW()", [sessionId]);
            const existingItem = await query("SELECT id FROM cart_items WHERE session_id = ? AND product_sku = ? AND size = ?", [sessionId, sku, storedSize]);
            if (existingItem.rows.length > 0) {
                await query("UPDATE cart_items SET quantity = quantity + ? WHERE id = ?", [quantity || 1, existingItem.rows[0].id]);
            } else {
                await query("INSERT INTO cart_items (session_id, product_sku, quantity, size) VALUES (?, ?, ?, ?)", [sessionId, sku, quantity || 1, storedSize]);
            }
            // CHANGED: Fetch new count and return it
const countResult = await query("SELECT SUM(quantity) as count FROM cart_items WHERE session_id = ?", [sessionId]);
const newCount = (countResult.rows && countResult.rows[0].count) ? parseInt(countResult.rows[0].count) : 0;
return res.json({ success: true, newCount });
        } catch (err) { return res.status(500).json({ error: 'Database error: ' + err.message }); }
    } else {
        if (!memoryCarts[sessionId]) memoryCarts[sessionId] = [];
        const cart = memoryCarts[sessionId];
        const existingItem = cart.find(i => i.sku === sku && i.size === storedSize);
        if (existingItem) existingItem.quantity += (quantity || 1);
        else {
            const product = await getProductBySku(sku);
            if (!product) return res.status(404).json({ error: 'Product not found' });
            cart.push({ ...product, quantity: quantity || 1, size: storedSize });
        }
        // CHANGED: Calculate memory count
const newCount = cart.reduce((acc, item) => acc + item.quantity, 0);
return res.json({ success: true, mode: 'memory', newCount });
    }
});

app.get('/api/cart/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    if (pool) {
        try {
            const querySql = `
                SELECT ci.id as item_id, ci.quantity, ci.size, p.* FROM cart_items ci 
                JOIN products p ON ci.product_sku = p.sku 
                WHERE ci.session_id = ? 
                ORDER BY ci.added_at DESC
            `;
            const result = await query(querySql, [sessionId]);
            res.json({ items: result.rows });
        } catch (err) { res.status(500).json({ error: 'Failed to load cart' }); }
    } else {
        const items = memoryCarts[sessionId] || [];
        res.json({ items: items });
    }
});

app.delete('/api/cart', async (req, res) => {
    const { sessionId, sku, size } = req.body;
    const storedSize = size || '';
    if (pool) {
        try {
            await query("DELETE FROM cart_items WHERE session_id = ? AND product_sku = ? AND size = ?", [sessionId, sku, storedSize]);
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: 'Database error' }); }
    } else {
        if (memoryCarts[sessionId]) memoryCarts[sessionId] = memoryCarts[sessionId].filter(i => !(i.sku === sku && i.size === storedSize));
        res.json({ success: true });
    }
});

app.get('/', (req, res) => {
    res.render('index', { 
        title: 'Home',
        featuredSong: songsData.find(s => s.youtube_info && s.youtube_info.video_id === 'Cem7RZsb7Rw'), 
        featuredMerch: mockMerchItems[0] 
    });
});

app.get('/projects', (req, res) => res.render('projects', seo.page('projects')));


app.post('/api/cart/add', async (req, res) => {
    // 1. DIAGNOSTIC LOG: See exactly what the browser sent
    console.log("ðŸ›’ API/CART/ADD Request:", req.body);

    try {
        const { sku, size, sessionId: bodySessionId } = req.body;
        
        // 2. Priority: Browser Session -> Server Session -> Random Fallback
        let sessionId = bodySessionId || req.sessionID;
        if (!sessionId) sessionId = `guest-${Date.now()}`;

        if (!sku) {
            console.log("âŒ Missing SKU in request");
            return res.status(400).json({ success: false, error: 'SKU required' });
        }

        // 3. Clean Size Input (Fixes "null" or "undefined" strings)
        let finalSize = size;
        if (!finalSize || finalSize === 'null' || finalSize === 'undefined') {
            finalSize = '';
        }

        // 4. Product Lookup (Safely)
        let product = null;
        if (pool) {
            try {
                const [rows] = await pool.query("SELECT * FROM products WHERE sku = ?", [sku]);
                product = rows[0];
            } catch (dbErr) {
                console.error("âš ï¸ DB Product Fetch Error (Continuing to mock):", dbErr.message);
            }
        }
        
        // Fallback to mock items if DB fails or product not found
        if (!product) {
            product = mockMerchItems.find(p => p.sku === sku);
        }

        if (!product) {
            console.log("âŒ Product not found for SKU:", sku);
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        // 5. Database Operation (Wrapped in its own try/catch to prevent crashes)
        if (pool) {
            try {
                // A. Ensure cart container exists
                await pool.query(
                    "INSERT INTO carts (session_id, updated_at) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE updated_at = NOW()", 
                    [sessionId]
                );

                // B. Check for existing item
                const [existing] = await pool.query(
                    "SELECT id FROM cart_items WHERE session_id = ? AND product_sku = ? AND size = ?", 
                    [sessionId, sku, finalSize]
                );

                // C. Update or Insert
                if (existing.length > 0) {
                    await pool.query("UPDATE cart_items SET quantity = quantity + 1 WHERE id = ?", [existing[0].id]);
                } else {
                    await pool.query(
                        "INSERT INTO cart_items (session_id, product_sku, quantity, size, added_at) VALUES (?, ?, 1, ?, NOW())", 
                        [sessionId, sku, finalSize]
                    );
                }
            } catch (sqlErr) {
                console.error("ðŸ”¥ SQL Error during cart update:", sqlErr);
                throw new Error("Database failed to update cart: " + sqlErr.message);
            }
        } else {
            // Memory Fallback (If DB is completely offline)
            if (!memoryCarts[sessionId]) memoryCarts[sessionId] = [];
            const cart = memoryCarts[sessionId];
            const existingItem = cart.find(i => i.sku === sku && i.size === finalSize);
            
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({ ...product, quantity: 1, size: finalSize });
            }
        }
        
        // 6. Success Response
        // --- ADDED: Calculate New Count for Instant Badge Update ---
        let newCount = 0;
        if (pool) {
            try {
               const [cRows] = await pool.query("SELECT SUM(quantity) as count FROM cart_items WHERE session_id = ?", [sessionId]);
               if(cRows.length > 0) newCount = parseInt(cRows[0].count || 0);
            } catch(e) {}
        } else {
            // Memory fallback count
            const cart = memoryCarts[sessionId] || [];
            newCount = cart.reduce((acc, item) => acc + item.quantity, 0);
        }

        console.log(`âœ… Added ${sku} (Size: ${finalSize}) to cart for session ${sessionId}. New Count: ${newCount}`);
        res.json({ success: true, newCount: newCount });

    } catch (err) {
        // 7. CATASTROPHIC ERROR HANDLER
        // This ensures you receive JSON even if the server crashes
        console.error("ðŸ”¥ CRITICAL SERVER ERROR:", err);
        res.status(500).json({ 
            success: false,
            error: err.message || "Internal Server Error",
            details: "Check Cloud Run logs for 'CRITICAL SERVER ERROR'"
        });
    }
});

// --- ADMIN REPAIR TOOL ---
// Visit this URL once to fix your database data
app.get('/admin/repair-data', async (req, res) => {
    if (!pool) return res.send("DB Offline");
    
    try {
        // 1. Give every product default sizes if they don't have any
        // This will make your Dropdown Menus appear
        const defaultSizes = JSON.stringify(["S", "M", "L", "XL", "2XL"]);
        
        const [updateResult] = await pool.query(
            "UPDATE products SET sizes = ? WHERE sizes IS NULL OR sizes = '' OR sizes = '[]'", 
            [defaultSizes]
        );

        // 2. Ensure cart_items has the size column (Double check)
        try {
            await pool.query("ALTER TABLE cart_items ADD COLUMN size VARCHAR(50) DEFAULT ''");
        } catch (e) { /* Ignore if exists */ }

        res.send(`
            <h1>Repair Complete</h1>
            <p>Updated ${updateResult.changedRows} products with default sizes.</p>
            <p>Database schema verified.</p>
            <a href="/merch" style="font-size: 20px; font-weight: bold; color: green;">GO TO MERCH PAGE NOW &rarr;</a>
        `);
    } catch (err) {
        res.status(500).send("Error: " + err.message);
    }
});

// ====================== PRINTIFY SYNC (with cleanup) ======================
app.get('/admin/sync-printify', async (req, res) => {
    if (!PRINTIFY_TOKEN) {
        return res.status(500).send('PRINTIFY_API_TOKEN missing');
    }
    if (!pool) {
        return res.status(500).send('Database offline');
    }

    try {
        const response = await axios.get(
            `https://api.printify.com/v1/shops/${PRINTIFY_SHOP_ID}/products.json?limit=50`,
            {
                headers: {
                    Authorization: `Bearer ${PRINTIFY_TOKEN}`,
                    'User-Agent': 'FutureMusic'
                }
            }
        );

        const products = response.data.data || [];
        const currentSkus = new Set();
        let updated = 0;

        for (const p of products) {
            const sku = String(p.id);
            currentSkus.add(sku);

            const name = p.title || 'Untitled';
            const description = p.description || '';
            const price = (p.variants?.[0]?.price || 0) / 100;
            const image_url = p.images?.[0]?.src || null;
            const type = (p.tags && p.tags[0]) || 'Apparel';

            const metadata = {
                variants: (p.variants || []).map(v => ({
                    id: v.id,
                    title: v.title,
                    price: v.price / 100,
                    is_available: v.is_enabled && v.is_available
                }))
            };

            await pool.query(`
                INSERT INTO products (sku, name, description, price, image_url, type, metadata, sizes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    description = VALUES(description),
                    price = VALUES(price),
                    image_url = VALUES(image_url),
                    type = VALUES(type),
                    metadata = VALUES(metadata)
            `, [
                sku,
                name,
                description,
                price,
                image_url,
                type,
                JSON.stringify(metadata),
                JSON.stringify([])
            ]);

            updated++;
        }

// --- DELETE everything that is no longer in Printify ---
// First remove any cart items that reference products we're about to delete
if (currentSkus.size > 0) {
    const placeholders = Array.from(currentSkus).map(() => '?').join(',');

    // 1. Clean cart_items that point to dead products
    await pool.query(
        `DELETE FROM cart_items 
         WHERE product_sku NOT IN (${placeholders})`,
        Array.from(currentSkus)
    );

    // 2. Now it's safe to delete the old products
    await pool.query(
        `DELETE FROM products 
         WHERE type != 'digital' 
         AND sku NOT IN (${placeholders})`,
        Array.from(currentSkus)
    );
}

        res.send(`
            <h1>Sync Complete</h1>
            <p>Pulled <strong>${products.length}</strong> current products from Printify.</p>
            <p>Updated/inserted: ${updated}</p>
            <p>Old unavailable products have been removed.</p>
            <a href="/merch">Go to Merch â†’</a>
        `);
    } catch (err) {
        console.error('Printify sync error:', err.response?.data || err.message);
        res.status(500).send(`
            <h1>Sync Failed</h1>
            <pre>${err.response?.data ? JSON.stringify(err.response.data, null, 2) : err.message}</pre>
        `);
    }
});


// --- GAME API ROUTES ---

// Game Login (JSON response)
app.post('/api/game/login', async (req, res) => {
    const { email, password } = req.body; // Game sends 'username' as email
    try {
        if (!pool) throw new Error("DB Offline");
        const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        
        if (users.length === 0) return res.json({ success: false, message: "User not found" });

        const user = users[0];
        const match = await bcrypt.compare(password, user.password_hash);

        if (match) {
            req.session.userId = user.id;
            req.session.email = user.email;
            req.session.save(); // Force save

            // Fetch owned skins
            const [skins] = await pool.query("SELECT skin_id FROM user_skins WHERE user_id = ?", [user.id]);
            const ownedSkinIds = skins.map(s => s.skin_id);

            res.json({ 
                success: true, 
                userId: user.id, 
                username: user.email, 
                ownedSkins: ownedSkinIds,
                hasNoAds: !!user.has_no_ads,
                hardModeWins: user.hard_mode_wins || 0
            });
        } else {
            res.json({ success: false, message: "Invalid password" });
        }
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: "Server error" });
    }
});

// Game Register (JSON response)
app.post('/api/game/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.json({ success: false, message: "Missing credentials" });

    // --- UPDATED SECURITY BLOCK ---
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.json({ success: false, message: "Password too weak: Must be 8+ chars with 1 Upper, 1 Lower, and 1 Number." });
    }
    // ------------------------------
    if (pool) {
        try {
            // Check if exists
            const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
            if (existing.length > 0) return res.json({ success: false, message: "Email already taken" });

            const hashedPassword = await bcrypt.hash(password, 10);
            const result = await query("INSERT INTO users (email, password_hash) VALUES (?, ?)", [email, hashedPassword]);
            
            req.session.userId = result.rows.insertId;
            req.session.email = email;
            req.session.save();

            res.json({ 
                success: true, 
                user: { id: result.rows.insertId, username: email },
                ownedSkins: []
            });
        } catch (err) {
            console.error(err);
            res.json({ success: false, message: "Registration failed" });
        }
    } else {
        res.json({ success: false, message: "DB Offline" });
    }
});

// Fetch Skins
app.post('/api/game/get-skins', async (req, res) => {
    const { userId } = req.body;
    if(!pool) return res.json({ success: false });
    try {
        const [skins] = await pool.query("SELECT skin_id FROM user_skins WHERE user_id = ?", [userId]);
        res.json({ success: true, ownedSkins: skins.map(s => s.skin_id) });
    } catch(e) { res.json({ success: false }); }
});

// NEW: Purchase Animal or Pack
app.post('/api/game/purchase-animal', async (req, res) => {
    const { userId, type, animalName } = req.body; // type = 'single' or 'pack'
    if (!userId) return res.json({ error: "Not logged in" });
    if (!stripe) return res.json({ error: "Payments unavailable" });

    // Logic: Pack=$2.99, Velociraptor=$1.99, Others=$0.99
    let price = 99;
    if (type === 'pack') price = 299;
    else if (animalName.toLowerCase() === 'velociraptor') price = 199;

    const itemName = type === 'pack' ? "Predator Pack (4 Animals)" : `Unlock: ${animalName}`;

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: { name: itemName },
                    unit_amount: price, 
                },
                quantity: 1,
            }],
            mode: 'payment',
            metadata: { 
                type: 'animal_purchase', // We will detect this in webhook
                userId: userId,
                animalId: type === 'pack' ? 'all_animals' : animalName.toLowerCase()
            },
            success_url: `${req.headers.origin}/?payment=success&unlock=${type === 'pack' ? 'pack' : animalName}`, 
            cancel_url: `${req.headers.origin}/herd-orama`,
        });
        res.json({ url: session.url });
    } catch (e) {
        res.json({ error: e.message });
    }
});

// Create Stripe Checkout for Skins
app.post('/api/game/purchase-skin', async (req, res) => {
    const { skinId, skinName, userId } = req.body;
    if (!userId) return res.json({ error: "Not logged in" });
    if (!stripe) return res.json({ error: "Payments unavailable" });

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: { name: skinName + " (Skin)" },
                    unit_amount: 100, // $1.00 - Adjust based on your logic
                },
                quantity: 1,
            }],
            mode: 'payment',
            metadata: { 
                type: 'skin_purchase',
                userId: userId,
                skinId: skinId
            },
            // Redirect back to game
            success_url: `${req.headers.origin}/?payment=success&skinId=${skinId}`, 

            cancel_url: `${req.headers.origin}/herd-orama`,
        });
        res.json({ url: session.url });
    } catch (e) {
        res.json({ error: e.message });
    }
});

// Create Stripe Checkout for No Ads
app.post('/api/game/purchase-no-ads', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.json({ error: "Not logged in" });
    if (!stripe) return res.json({ error: "Payments unavailable" });

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: { name: "Remove Ads (Target Breaker)" },
                    unit_amount: 199, // $1.99
                },
                quantity: 1,
            }],
            mode: 'payment',
            metadata: { 
                type: 'no_ads_purchase',
                userId: userId
            },
            // Redirect back to game with a success flag
            success_url: `${req.headers.origin}/?payment=success&type=no_ads`, 
            cancel_url: `${req.headers.origin}/`,
        });
        res.json({ url: session.url });
    } catch (e) {
        res.json({ error: e.message });
    }
});

// Stripe Webhook (Or Success Handler) - Simple version for "success_url" verification
// Note: In production, use webhooks. For now, we will add a verify endpoint called by the game.
app.post('/api/game/verify-purchase', async (req, res) => {
    const { userId, skinId } = req.body;
    if (!userId || !skinId) return res.json({ success: false, message: "Missing data" });

    if(pool) {
        try {
            // Insert skin into user_skins table
            await pool.query("INSERT IGNORE INTO user_skins (user_id, skin_id, purchased_at) VALUES (?, ?, NOW())", 
                [userId, skinId]);
            console.log(`Verified purchase: ${skinId} for user ${userId}`);
            res.json({ success: true });
        } catch (err) {
            console.error("Verify Error:", err);
            res.json({ success: false, message: "DB Error" });
        }
    } else {
        res.json({ success: false, message: "DB Offline" });
    }
});

// Stripe Webhook Handler (Recommended)
app.post('/webhook', express.raw({type: 'application/json'}), async (request, response) => {
  const sig = request.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (session.metadata && session.metadata.type === "blockbuild_unlock") {
        console.log("[BLOCKBUILD] paid", session.id);
    } else if (session.metadata && session.metadata.type === "bsa_unlock") {
        console.log("[BSA] paid", session.id);
    } else if(session.metadata && session.metadata.type === 'skin_purchase') {
        if(pool) {
            await pool.query("INSERT IGNORE INTO user_skins (user_id, skin_id) VALUES (?, ?)", 
                [session.metadata.userId, session.metadata.skinId]);
            console.log(`Skin ${session.metadata.skinId} unlocked for user ${session.metadata.userId}`);
        }
    }  else if (session.metadata && session.metadata.type === 'animal_purchase') {
        if (pool) {
            // We reuse user_skins table but use the animal name as the "skin_id"
            // If it's the pack, we insert all 4
            if(session.metadata.animalId === 'all_animals') {
                const animals = ['snake', 'pig', 'anteater', 'cat'];
                for(let animal of animals) {
                    await pool.query("INSERT IGNORE INTO user_skins (user_id, skin_id) VALUES (?, ?)", 
                        [session.metadata.userId, animal]);
                }
            } else {
                await pool.query("INSERT IGNORE INTO user_skins (user_id, skin_id) VALUES (?, ?)", 
                    [session.metadata.userId, session.metadata.animalId]);
            }
            console.log(`Animal(s) unlocked for user ${session.metadata.userId}`);

              // --- NEW: Record Transaction History ---
            const amount = session.amount_total / 100; // Convert cents to dollars
            const desc = session.metadata.animalId === 'all_animals' ? 'Predator Pack' : `Unlock: ${session.metadata.animalId}`;
            
            await pool.query(`
                INSERT INTO orders (
                    user_id, 
                    stripe_session_id,
                    total_amount, 
                    payment_status, 
                    product_type,
                    product_sku,
                    description,
                    status,     
                    created_at
                ) VALUES (?, ?, ?, 'paid', 'game_unlock', ?, ?, 'completed', NOW())
            `, [
                session.metadata.userId,
                session.id,
                amount,
                session.metadata.animalId, // Use animal ID as the SKU
                desc
            ]);
            console.log(`Order record created for Animal Purchase: ${desc}`);
            // ---------------------------------------
        }
    }
    // --- NEW CODE: Handle No Ads Purchase ---
    else if (session.metadata && session.metadata.type === 'creature_chess_alpha') {
        if (pool && session.metadata.userId) {
            try {
                await pool.query(`UPDATE orders SET status = 'completed' WHERE session_id = ?`, [session.id]);
            } catch (e) {
                console.warn('[CHESS] webhook order:', e.message);
            }
        }
        console.log('[CHESS] Alpha pack paid', session.id);
    }
    else if (session.metadata && session.metadata.type === 'no_ads_purchase') {
        if (pool) {
            // Update the user record to disable ads
            await pool.query("UPDATE users SET has_no_ads = 1 WHERE id = ?", 
                [session.metadata.userId]);
            console.log(`Ads removed for user ${session.metadata.userId}`);
        }
    }
    // ----------------------------------------
        // --- NEW CODE: Handle Standard Cart Purchases (Digital/Physical) ---
    else if (session.metadata && session.metadata.type === 'cart_checkout') {
        // This assumes you pass 'cart_checkout' and 'userId' in metadata during Stripe Session creation
        const userId = session.metadata.userId;
        const sessionId = session.metadata.sessionId; // From your store cart
        
        // Move items from cart to orders
        if(pool && userId) {
            // 1. Create Order
            const [orderResult] = await pool.query(
                "INSERT INTO orders (user_id, total, status, session_id) VALUES (?, ?, 'completed', ?)",
                [userId, session.amount_total / 100, sessionId] // Stripe amount is in cents
            );
            const orderId = orderResult.insertId;

            // 2. Copy Items from Cart to Order Items
            // Note: This logic depends on your checkout flow ensuring cart items still exist 
            // or are passed in metadata. A robust implementation would look up the cart by sessionId.
            await pool.query(`
                INSERT INTO order_items (order_id, product_sku, quantity, price_at_time)
                SELECT ?, product_sku, quantity, 0 
                FROM cart_items 
                WHERE session_id = ?
            `, [orderId, sessionId]);
            
            // 3. (Optional) Clear Cart
            await pool.query("DELETE FROM cart_items WHERE session_id = ?", [sessionId]);
            
            console.log(`Order ${orderId} created for user ${userId}`);
        }
    }
    // ------------------------------------------------------------------
  }
  response.json({received: true});
});

// Check Active Session (Auto-login on refresh)
app.get('/api/game/check-session', async (req, res) => {
    // 1. Check if session exists
    if (!req.session || !req.session.userId) {
        return res.json({ success: false });
    }

    const userId = req.session.userId;

    try {
        if (!pool) throw new Error("DB Offline");

        // 2. Fetch User Details
        const [users] = await pool.query("SELECT * FROM users WHERE id = ?", [userId]);
        if (users.length === 0) return res.json({ success: false });
        const user = users[0];

        // 3. Fetch Skins
        const [skins] = await pool.query("SELECT skin_id FROM user_skins WHERE user_id = ?", [userId]);
        const ownedSkinIds = skins.map(s => s.skin_id);

        // 4. Return same data structure as /api/game/login
        res.json({ 
            success: true, 
            userId: user.id, 
            username: user.email, 
            ownedSkins: ownedSkinIds,
            hasNoAds: !!user.has_no_ads,
            hardModeWins: user.hard_mode_wins || 0
        });

    } catch (err) {
        console.error("Session Check Error:", err);
        res.json({ success: false });
    }
});

// Record Hard Mode Win
app.post('/api/game/record-win', async (req, res) => {
    const { userId, difficulty } = req.body;
    if (!userId || difficulty !== 'hard') return res.json({ success: false });

    if (pool) {
        try {
            await pool.query("UPDATE users SET hard_mode_wins = hard_mode_wins + 1 WHERE id = ?", [userId]);
            
            // Return new count
            const [rows] = await pool.query("SELECT hard_mode_wins FROM users WHERE id = ?", [userId]);
            res.json({ success: true, newCount: rows[0].hard_mode_wins });
        } catch (e) {
            console.error(e);
            res.json({ success: false });
        }
    } else {
        res.json({ success: false });
    }
});
// --- NEW ROUTE: Secure Ad Streaming from GCS ---
app.get('/api/ad-video/:filename', async (req, res) => {
    const { filename } = req.params;
    // Using the bucket name found in your screenshot
    const bucketName = 'futuremusic'; 
    const filePath = `ads/${filename}`;

    try {
        // 1. Generate a temporary signed URL (valid for 15 minutes)
        // This allows the browser to load the private video file
        const [url] = await storage
            .bucket(bucketName)
            .file(filePath)
            .getSignedUrl({
                version: 'v4',
                action: 'read',
                expires: Date.now() + 15 * 60 * 1000, 
            });

        // 2. Redirect the video player to this secure Google URL
        res.redirect(url);

    } catch (err) {
        console.error("Ad Stream Error:", err);
        // If file missing or permissions wrong, send 404
        res.status(404).send("Ad not found");
    }
});

// ============================================================================
// --- TERRARIUM GAME API ROUTES ---
// ============================================================================

// Auto-Load Game State based on Browser Session
app.get('/api/terrarium/load/:session', async (req, res) => {
    const { session } = req.params;
    if (!pool) return res.status(500).json({ error: "Database offline" });

    try {
        let [users] = await pool.query('SELECT * FROM bird_users WHERE session_token = ?', [session]);
        
        if (users.length === 0) {
            await pool.query('INSERT INTO bird_users (session_token) VALUES (?)', [session]);
            [users] = await pool.query('SELECT * FROM bird_users WHERE session_token = ?', [session]);
        }
        const user = users[0];
        
        const [birds] = await pool.query('SELECT * FROM birds WHERE user_id = ? AND is_alive = TRUE', [user.id]);
        const [feeders] = await pool.query('SELECT * FROM feeders WHERE user_id = ?', [user.id]);
        
        const now = new Date();
        const lastSaved = new Date(user.last_saved);
        const secondsOffline = Math.max(0, (now - lastSaved) / 1000);
        
        res.json({ user, birds, feeders, secondsOffline });
    } catch (err) {
        console.error("Terrarium Load Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Auto-Save Game State (Called every 10 seconds in the background)
app.post('/api/terrarium/save', async (req, res) => {
    const { session, birds } = req.body;
    if (!pool) return res.status(500).json({ error: "Database offline" });

    try {
        const [users] = await pool.query('SELECT id FROM bird_users WHERE session_token = ?', [session]);
        if (users.length === 0) return res.status(404).json({ error: "User not found" });
        
        const userId = users[0].id;
        
        // Update user's last online timestamp
        await pool.query('UPDATE bird_users SET last_saved = CURRENT_TIMESTAMP WHERE id = ?', [userId]);

        // Save each bird using UPSERT
        if (birds && birds.length > 0) {
            for (let b of birds) {
                const traits = JSON.stringify(b.customData || {});
                await pool.query(`
                    INSERT INTO birds (client_id, user_id, name, species, age_days, x_pos, y_pos, custom_traits) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    age_days = VALUES(age_days), x_pos = VALUES(x_pos), y_pos = VALUES(y_pos), name = VALUES(name)
                `, [b.clientId, userId, b.name, b.species, b.age, b.x, b.y, traits]);
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error("Terrarium Save Error:", err);
        res.status(500).json({ error: err.message });
    }
});
// ============================================================================


// ============================================================================
// HERO SLAYER ALPHA â€” test routes (slug 7qsba2gtr6). Promote after QA.
// Retail $20 / Alpha sale $5 (75% off). Stripe Checkout â†’ download zip.
// ============================================================================
const HERO_SLAYER_SKU = "hero-slayer-alpha";
const HERO_SLAYER_PRICE_CENTS = 500; // $5.00 alpha
const HERO_SLAYER_RETAIL_CENTS = 2000;
const pathMod = require("path");
const fsMod = require("fs");
const HERO_SLAYER_ZIP = pathMod.join(__dirname, "public", "downloads", "hero-slayer-alpha.zip");
/** GCS object key in bucket `futuremusic` (or GCS_BUCKET_NAME). */
const HERO_SLAYER_GCS_PATH = process.env.HERO_SLAYER_GCS_PATH || "downloads/hero-slayer-alpha.zip";


// Production Hero Slayer product
app.get("/hero-slayer", (req, res) => {
    res.render("hero-slayer", seo.page("hero-slayer"));
});
app.get("/hero-slayer/success", async (req, res) => {
    const sessionId = req.query.session_id || "";
    if (sessionId && stripe) {
        try {
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            if (session.payment_status === "paid" && session.metadata?.sku === HERO_SLAYER_SKU) {
                req.session.heroSlayerEntitled = true;
                req.session.heroSlayerSessionId = sessionId;
            }
        } catch (e) {
            console.warn("[HERO-SLAYER] success verify:", e.message);
        }
    }
    res.render("hero-slayer-success", {
        title: "Hero Slayer Download",
        sessionId: sessionId || req.session.heroSlayerSessionId || "",
    });
});

app.get("/test-7qsba2gtr6", (req, res) => {
    res.render("test-7qsba2gtr6", { title: "Hero Slayer â€” Alpha Access (Test)" });
});
app.get("/test-7qsba2gtr6-splash", (req, res) => {
    res.render("test-7qsba2gtr6-splash", { title: "Hero Slayer Splash (Test)" });
});
app.get("/test-7qsba2gtr6-success", async (req, res) => {
    const sessionId = req.query.session_id || "";
    // Mark session as entitled if Stripe paid
    if (sessionId && stripe) {
        try {
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            if (session.payment_status === "paid" && session.metadata?.sku === HERO_SLAYER_SKU) {
                req.session.heroSlayerEntitled = true;
                req.session.heroSlayerSessionId = sessionId;
            }
        } catch (e) {
            console.warn("[HERO-SLAYER] success verify:", e.message);
        }
    }
    res.render("test-7qsba2gtr6-success", {
        title: "Hero Slayer Download",
        sessionId: sessionId || req.session.heroSlayerSessionId || "",
    });
});

app.post("/api/chess/alpha-checkout", async (req, res) => {
    if (!stripe) {
        return res.status(503).json({ error: "Payment gateway not configured." });
    }
    try {
        const packId = String((req.body && req.body.pack) || "alpha");
        const pack = CHESS_PACKS[packId] || CHESS_PACKS.alpha;
        const protocol = req.headers["x-forwarded-proto"] || req.protocol;
        const host = req.get("host");
        const domain = `${protocol}://${host}`;
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: [{
                price_data: {
                    currency: "usd",
                    unit_amount: CHESS_ALPHA_PRICE_CENTS,
                    product_data: {
                        name: pack.name,
                        description: pack.blurb || "Unlock a Creature Chess pack for $1.99.",
                        images: [`${domain}/images/creature-chess.jpg`],
                        metadata: { sku: pack.sku },
                    },
                },
                quantity: 1,
            }],
            metadata: {
                sku: pack.sku,
                pack: packId,
                type: "creature_chess_pack",
                userId: req.session.userId ? String(req.session.userId) : "",
            },
            success_url: `${domain}/chess?alpha=ok&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${domain}/chess`,
            customer_email: req.session.email || undefined,
        });
        if (pool && req.session.userId) {
            try {
                await pool.query(
                    `INSERT INTO orders (user_id, total, status, session_id, product_sku, product_type, description)
                     VALUES (?, ?, 'pending', ?, ?, 'digital', ?)
                     ON DUPLICATE KEY UPDATE status = status`,
                    [req.session.userId, CHESS_ALPHA_PRICE_CENTS / 100, session.id, pack.sku, pack.name]
                );
            } catch (dbErr) {
                console.warn("[CHESS] order insert skipped:", dbErr.message);
            }
        }
        res.json({ url: session.url, sessionId: session.id });
    } catch (e) {
        console.error("[CHESS] checkout error:", e);
        res.status(500).json({ error: e.message || "Checkout failed" });
    }
});

app.get("/api/chess/alpha-status", (req, res) => {
    const packs = chessPackStatus(req);
    res.json({ unlocked: packs.alpha, packs });
});

app.post("/api/chess/alpha-verify", async (req, res) => {
    const sessionId = (req.body && req.body.session_id) || req.query.session_id || "";
    if (!sessionId) return res.json({ unlocked: hasChessAlpha(req), packs: chessPackStatus(req) });
    if (!stripe) return res.status(503).json({ unlocked: false, error: "Payments unavailable" });
    try {
        const session = await stripe.checkout.sessions.retrieve(String(sessionId));
        const packId = Object.keys(CHESS_PACKS).find((k) => CHESS_PACKS[k].sku === session.metadata?.sku);
        if (session.payment_status === "paid" && packId) {
            grantChessPack(req, res, packId);
            if (pool && req.session.userId) {
                try {
                    await pool.query(`UPDATE orders SET status = 'completed' WHERE session_id = ?`, [sessionId]);
                } catch (dbErr) {
                    console.warn("[CHESS] order complete skipped:", dbErr.message);
                }
            }
            const packs = chessPackStatus(req);
            packs[packId] = true;
            return res.json({ unlocked: packs.alpha, pack: packId, packs });
        }
        res.json({ unlocked: hasChessAlpha(req), packs: chessPackStatus(req) });
    } catch (e) {
        console.warn("[CHESS] verify:", e.message);
        res.json({ unlocked: hasChessAlpha(req), packs: chessPackStatus(req) });
    }
});

app.post("/api/hero-slayer/checkout", async (req, res) => {
    if (!stripe) {
        return res.status(503).json({ error: "Payment gateway not configured (STRIPE_SECRET_KEY)." });
    }
    try {
        const protocol = req.headers["x-forwarded-proto"] || req.protocol;
        const host = req.get("host");
        const domain = `${protocol}://${host}`;
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: [{
                price_data: {
                    currency: "usd",
                    unit_amount: HERO_SLAYER_PRICE_CENTS,
                    product_data: {
                        name: "Hero Slayer â€” Alpha Access",
                        description: "Normally $20 â€” Alpha 75% off ($5). Desktop package download.",
                        images: [`${domain}/images/hero-slayer/demon_king.jpg`],
                        metadata: { sku: HERO_SLAYER_SKU },
                    },
                },
                quantity: 1,
            }],
            metadata: {
                sku: HERO_SLAYER_SKU,
                type: "hero_slayer_alpha",
                userId: req.session.userId ? String(req.session.userId) : "",
            },
            success_url: `${domain}/hero-slayer/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${domain}/hero-slayer`,
            customer_email: req.session.email || undefined,
        });
        // Best-effort order row for logged-in users
        if (pool && req.session.userId) {
            try {
                await pool.query(
                    `INSERT INTO orders (user_id, total, status, session_id, product_sku, product_type, description)
                     VALUES (?, ?, 'pending', ?, ?, 'digital', ?)
                     ON DUPLICATE KEY UPDATE status = status`,
                    [req.session.userId, HERO_SLAYER_PRICE_CENTS / 100, session.id, HERO_SLAYER_SKU, "Hero Slayer Alpha"]
                );
            } catch (dbErr) {
                console.warn("[HERO-SLAYER] order insert skipped:", dbErr.message);
            }
        }
        res.json({ url: session.url, sessionId: session.id });
    } catch (e) {
        console.error("[HERO-SLAYER] checkout error:", e);
        res.status(500).json({ error: e.message || "Checkout failed" });
    }
});

app.get("/api/hero-slayer/download", async (req, res) => {
    const sessionId = req.query.session_id || req.session.heroSlayerSessionId;
    let entitled = !!req.session.heroSlayerEntitled;

    if (!entitled && sessionId && stripe) {
        try {
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            if (session.payment_status === "paid" && session.metadata?.sku === HERO_SLAYER_SKU) {
                entitled = true;
                req.session.heroSlayerEntitled = true;
                req.session.heroSlayerSessionId = sessionId;
                if (pool && req.session.userId) {
                    try {
                        await pool.query(
                            `UPDATE orders SET status = 'completed' WHERE session_id = ?`,
                            [sessionId]
                        );
                    } catch (_) { /* ok */ }
                }
            }
        } catch (e) {
            console.warn("[HERO-SLAYER] download verify:", e.message);
        }
    }

    // Dev/local: allow if zip is on disk and Stripe is not configured
    if (!entitled && !process.env.STRIPE_SECRET_KEY && fsMod.existsSync(HERO_SLAYER_ZIP)) {
        entitled = true;
    }

    if (!entitled) {
        return res.status(403).send("Purchase required. Complete checkout first.");
    }

    const targetBucket = process.env.GCS_BUCKET_NAME || bucketName || "futuremusic";
    const gcsPath = HERO_SLAYER_GCS_PATH; // downloads/hero-slayer-alpha.zip

    // Prefer GCS signed URL (production Cloud Run â€” zip is not in the git image)
    try {
        const file = storage.bucket(targetBucket).file(gcsPath);
        const [exists] = await file.exists();
        if (exists) {
            let options = {
                version: "v4",
                action: "read",
                expires: Date.now() + 60 * 60 * 1000, // 1 hour (large zip)
                responseDisposition: 'attachment; filename="hero-slayer-alpha.zip"',
            };
            try {
                const [serviceAccountEmail] = await storage.getServiceAccount();
                if (serviceAccountEmail && serviceAccountEmail.email_address) {
                    options.serviceAccountEmail = serviceAccountEmail.email_address;
                }
            } catch (_) { /* ADC may still sign without this */ }
            const [url] = await file.getSignedUrl(options);
            console.log(`[HERO-SLAYER] Redirecting to signed GCS URL gs://${targetBucket}/${gcsPath}`);
            return res.redirect(url);
        }
        console.warn(`[HERO-SLAYER] GCS object missing: gs://${targetBucket}/${gcsPath}`);
    } catch (gcsErr) {
        console.error("[HERO-SLAYER] GCS signed URL failed:", gcsErr.message);
    }

    // Fallback: local file (dev machine with zip on disk)
    if (fsMod.existsSync(HERO_SLAYER_ZIP)) {
        return res.download(HERO_SLAYER_ZIP, "hero-slayer-alpha.zip");
    }
    return res.status(404).send("Download package is being prepared. Please try again shortly.");
});


// --- FIX START: Global Error Handler ---
app.use((err, req, res, next) => {
    console.error("!!! SERVER ERROR !!!");
    console.error(err.stack); // This prints the specific error line to logs
    res.status(500).send(`
        <h1>Internal Server Error</h1>
        <p>The server encountered an error:</p>
        <pre>${err.message}</pre>
    `);
});
// --- FIX END ---

app.get('/api/download/:sku', async (req, res, next) => {
    // 1. SETUP: Logging & Variables
    console.log(`[DOWNLOAD] Request received for SKU: ${req.params.sku}`);
    const { sku } = req.params;
    const userId = req.session.userId;
    // Use ENV bucket if available, otherwise fallback to your hardcoded default
    const targetBucket = process.env.GCS_BUCKET_NAME || 'futuremusic';

    try {
        // 2. AUTH CHECK
        if (!userId) {
            console.log(`[DOWNLOAD] Blocked: User not logged in.`);
            return res.status(401).send('Please log in to download assets.');
        }

        if (!pool) throw new Error("Database connection is offline.");

        // 3. OWNERSHIP CHECK (Simplified Logic)
        // Check if there is an order for this User ID that matches the SKU
        // OR matches the Product Name (legacy support)
        const [orders] = await pool.query(`
            SELECT o.id 
            FROM orders o
            LEFT JOIN products p ON p.sku = ?
            WHERE o.user_id = ? 
            AND (
                o.product_sku = ? 
                OR 
                (p.name IS NOT NULL AND o.description = p.name)
            )
            LIMIT 1
        `, [sku, userId, sku]);

        if (orders.length === 0) {
            console.log(`[DOWNLOAD] Blocked: No purchase found for User ${userId} / SKU ${sku}`);
            return res.status(403).send('You have not purchased this item.');
        }

        // 4. GET FILENAME
        const [products] = await pool.query('SELECT download_reference FROM products WHERE sku = ?', [sku]);
        
        // Safety check: Does the product exist and have a filename?
        if (!products.length || !products[0].download_reference) {
            console.error(`[DOWNLOAD] Data Error: Product SKU ${sku} exists, but 'download_reference' is empty.`);
            return res.status(404).send('Asset file mapping is missing in the database.');
        }

        const fileName = products[0].download_reference;
        const filePath = `songs/${fileName}`;

        // --- FIX START: Identity Check & Options ---
        // 1. Detect who is running this code
        // We use the storage auth client to find the active Service Account email
        const [serviceAccountEmail] = await storage.getServiceAccount();
        console.log(`[DOWNLOAD] Current Service Account Email: ${serviceAccountEmail.email_address}`);
        console.log(`[DOWNLOAD] Attempting to sign URL for: gs://${targetBucket}/${filePath}`);

        // 5. GENERATE SIGNED URL
        const options = {
            version: 'v4',
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
            // Explicitly set the account email to help the signer
            serviceAccountEmail: serviceAccountEmail.email_address 
        };

        const [url] = await storage
            .bucket(targetBucket)
            .file(filePath)
            .getSignedUrl(options);
        // --- FIX END ---

        // 6. SUCCESS
        console.log(`[DOWNLOAD] Success. Redirecting user.`);
        res.redirect(url);

    } catch (error) {
        // 7. SPECIFIC ERROR LOGGING
        console.error('*** CRITICAL DOWNLOAD ERROR ***');
        console.error('Message:', error.message);
        
        // Check for common Signing errors
        if (error.message.includes('SigningError') || error.message.includes('credential')) {
            console.error('HINT: This is likely a permissions issue. If Local: Uncomment "keyFilename". If Cloud: Ensure Service Account has "Token Creator" role.');
        }

        // Pass to global handler or show user simple message
        res.status(500).send(`Server Error: ${error.message}`);
    }
});
app.get('/herdorama', (req, res) => {
    res.redirect(301, '/herd-orama');
});

// --- FIX START: Global Error Handler ---

try {
    require('./lattice').mount(app, {
        getPool: () => pool,
        stripe,
        bcrypt
    });
    console.log('[lattice] routes mounted at /lattice');
} catch (e) {
    console.error('[lattice] failed to mount:', e.message);
}

app.get(["/planetry", "/planetry/"], sendPlanetry);

app.use((req, res, next) => res.status(404).render('404', { title: 'Signal Lost' }));

const PORT = parseInt(process.env.PORT) || 8080;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`âœ… Server successfully started on port ${PORT}`);
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error('âŒ Port is already in use!');
    } else {
        console.error('âŒ Server failed to start:', e);
    }
});