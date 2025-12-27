const express = require('express');
const app = express();
// --- SESSION CONFIGURATION ---
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev_secret_key_123',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
const path = require('path');
const fs = require('fs'); 
const http = require('http'); 
const bodyParser = require('body-parser');
const { Storage } = require('@google-cloud/storage');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const session = require('express-session');


// Try loading .env if available
try { require('dotenv').config(); } catch (e) { /* dotenv not installed */ }

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

console.log(`🌍 DOMAIN Configured as: ${DOMAIN}`);

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
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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
        console.log("🕵️ IDENTITY CHECK: This container is running as:", data.trim());
    });
});
reqAuth.on('error', (e) => console.log("🕵️ IDENTITY CHECK FAILED:", e.message));
reqAuth.end();


// --- CACHE & CSP HEADERS ---
app.disable('etag');
app.disable('view cache');
app.use((req, res, next) => {
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

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// --- STRIPE ---
let stripe;
if (process.env.STRIPE_SECRET_KEY) {
    try {
        stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    } catch (e) {
        console.warn("⚠️ STRIPE WARNING:", e.message);
    }
} else {
    console.warn("⚠️ STRIPE WARNING: STRIPE_SECRET_KEY is missing. Checkout will not work.");
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

    console.log(`🔌 MODE: ${mode}. Attempting connection...`);

    async function initializeDbPool() {
        try {
            pool = mysql.createPool(dbConfig);
            const [rows] = await pool.query('SELECT 1 + 1 AS solution');
            if (rows && rows[0].solution === 2) {
                console.log("✅ DB CONNECTED SUCCESSFULLY (MySQL)");
                dbConnectionStatus = "CONNECTED";
            }
        } catch (err) {
            console.error("❌ INITIAL CONNECTION FAILED:", err.message);
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

// --- AUTH ROUTES ---

// 1. Show Login Page
app.get('/login', (req, res) => {
    res.render('login', { title: 'Login / Register' });
});

// 2. Handle Registration
app.post('/register', async (req, res) => {
    const { email, password, confirmPassword } = req.body;
    
    if (password !== confirmPassword) {
        return res.send('<script>alert("Passwords do not match"); window.location.href="/login";</script>');
    }

    try {
        if (!pool) throw new Error("Database not connected");
        
        // Check if user exists
        const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
        if (existing.length > 0) {
            return res.send('<script>alert("Email already exists"); window.location.href="/login";</script>');
        }

        // Hash password and save
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query("INSERT INTO users (email, password) VALUES (?, ?)", [email, hashedPassword]);

        // Auto-login after register
        const [newUser] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
        req.session.userId = newUser[0].id;
        req.session.email = email;
        
        res.redirect('/account');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error registering user");
    }
});

// 3. Handle Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        if (!pool) throw new Error("Database not connected");

        const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        
        if (users.length === 0) {
            return res.send('<script>alert("Invalid email or password"); window.location.href="/login";</script>');
        }

        const user = users[0];
        const match = await bcrypt.compare(password, user.password);

        if (match) {
            req.session.userId = user.id;
            req.session.email = user.email;
            res.redirect('/account');
        } else {
            res.send('<script>alert("Invalid email or password"); window.location.href="/login";</script>');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Login error");
    }
});

// 4. Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/', (req, res) => res.render('index', { title: 'Home' }));
app.get('/projects', (req, res) => res.render('projects', { title: 'Projects' }));
app.get('/about', (req, res) => res.render('about', { title: 'About' }));
app.get('/contact', (req, res) => res.render('contact', { title: 'Contact' }));
app.get('/advocacy', (req, res) => res.render('advocacy', { title: 'Advocacy' }));

// ADDED: Account Page Route
app.get('/account', requireAuth, async (req, res) => {
    // Optional: Fetch user details if needed
    // const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [req.session.userId]);
    
    res.render('account', { 
        title: 'My Account',
        user: { email: req.session.email, id: req.session.userId }
    });
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

// --- ROBUST MERCH ROUTE ---
app.get('/merch', async (req, res) => {
    const { type, sort, maxPrice } = req.query;
    const commonPayload = { query: req.query || {}, user: null, cartCount: 0 };

    try {
        if (pool) {
            let sql = "SELECT * FROM products WHERE 1=1";
            const params = [];
            if (type && type !== 'all') { sql += " AND type = ?"; params.push(type); }
            if (maxPrice) { sql += " AND price <= ?"; params.push(maxPrice); }
            if (sort === 'price_asc') sql += " ORDER BY price ASC";
            else if (sort === 'price_desc') sql += " ORDER BY price DESC";
            else sql += " ORDER BY created_at DESC";

            const result = await query(sql, params);
            const products = result.rows.map(p => {
                if (typeof p.sizes === 'string') { try { p.sizes = JSON.parse(p.sizes); } catch(e) { p.sizes = []; } }
                else if (!p.sizes) { p.sizes = []; }
                return p;
            });

            if (products.length === 0 && !type && !maxPrice) {
                res.render('merch', { ...commonPayload, merch: mockMerchItems, title: 'Merch (DB Empty)', debugError: "Connected but no products found.", dbStatus: "CONNECTED (EMPTY)" });
            } else {
                res.render('merch', { ...commonPayload, merch: products, title: 'Merch', debugError: null });
            }
        } else {
            let filtered = [...mockMerchItems];
            if (type && type !== 'all') filtered = filtered.filter(p => p.type === type);
            if (maxPrice) filtered = filtered.filter(p => p.price <= maxPrice);
            if (sort === 'price_asc') filtered.sort((a,b) => a.price - b.price);
            else if (sort === 'price_desc') filtered.sort((a,b) => b.price - a.price);

            res.render('merch', { ...commonPayload, merch: filtered, title: 'Merch (Offline)', debugError: dbErrorDetail || "Unknown DB Error", dbStatus: dbConnectionStatus });
        }
    } catch (err) {
        console.error("Merch Route Error:", err);
        try {
            res.render('merch', { ...commonPayload, merch: mockMerchItems, title: 'Merch (Crash)', debugError: err.message, dbStatus: "CRASHED" });
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
            if (product && typeof product.sizes === 'string') { try { product.sizes = JSON.parse(product.sizes); } catch(e) { product.sizes = []; } }
        } else {
            product = mockMerchItems.find(m => m.id === req.params.id || m.sku === req.params.id);
        }
        if (product) res.render('product', { product: product, title: product.name });
        else res.status(404).render('404', { title: 'Product Not Found' });
    } catch (err) {
        res.status(500).render('404', { title: 'Error' });
    }
});

app.get('/rights', (req, res) => res.render('rights', { songs: songsData, title: 'Purchase Rights' }));
app.get('/rights/confirmation', (req, res) => res.render('rights_confirmation', { title: 'Inquiry Received' }));
app.get('/cart', (req, res) => res.render('cart', { title: 'Your Inventory' }));
app.get('/checkout', (req, res) => res.render('checkout_form', { 
    title: 'Secure Checkout', 
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY 
}));

app.post('/initiate-checkout', async (req, res) => {
    const { sessionId, email, fullName, phone, password } = req.body;
    if (!pool) return res.status(500).json({ error: "DB Offline" });

    if (!stripe) {
        console.error("❌ Checkout blocked: Stripe is not configured.");
        return res.status(503).json({ error: "Payment gateway is not configured (Missing STRIPE_SECRET_KEY)." });
    }

    try {
        let userId;
        const userCheck = await query("SELECT id FROM users WHERE email = ?", [email]);
        if (userCheck.rows.length > 0) userId = userCheck.rows[0].id;
        else {
            const newUser = await query("INSERT INTO users (email, full_name, phone, password_hash) VALUES (?, ?, ?, ?)", [email, fullName, phone, password]);
            userId = newUser.rows.insertId;
        }
        
        const cartQuery = `
            SELECT ci.quantity, ci.size, p.name, p.price, p.sku, p.type, p.image_url
            FROM cart_items ci
            JOIN products p ON ci.product_sku = p.sku
            WHERE ci.session_id = ?
        `;
        const cartResult = await query(cartQuery, [sessionId]);
        const cartItems = cartResult.rows;

        if (cartItems.length === 0) return res.status(400).json({ error: "Cart is empty" });

        const hasPhysicalItems = cartItems.some(item => item.type !== 'digital');
        const lineItems = cartItems.map(item => {
            let desc = item.type;
            if (item.size) desc += ` | Size: ${item.size}`;
            
            // ROBUST IMAGE URL CONSTRUCTION
            let itemImages = [];
            if (item.image_url) {
                // If it's already an absolute URL, use it.
                if (item.image_url.startsWith('http')) {
                    itemImages = [item.image_url];
                } 
                // If it's relative, prepend DOMAIN
                else {
                    itemImages = [`${DOMAIN}${item.image_url}`];
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

        const sessionConfig = {
            payment_method_types: ['card'],
            customer_email: email,
            line_items: lineItems,
            mode: 'payment',
            success_url: `${DOMAIN}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${DOMAIN}/cart`,
            metadata: { userId: userId.toString(), custom_session_id: sessionId }
        };

        if (hasPhysicalItems) sessionConfig.shipping_address_collection = { allowed_countries: ['US', 'CA', 'GB'] };

        // Debug Log
        console.log(`🚀 Creating Stripe Session. Success URL: ${sessionConfig.success_url}`);

        const session = await stripe.checkout.sessions.create(sessionConfig);
        
        await query("INSERT INTO orders (user_id, stripe_session_id, total_amount, payment_status) VALUES (?, ?, ?, 'pending')", [userId, session.id, (session.amount_total / 100)]);
        res.json({ id: session.id });

    } catch (err) {
        console.error("Stripe Error:", err);
        res.status(500).json({ error: "Checkout failed: " + err.message });
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
            return res.json({ success: true });
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
        return res.json({ success: true, mode: 'memory' });
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

app.get('/projects', (req, res) => res.render('projects', { title: 'Projects' }));

app.post('/api/inquiry', async (req, res) => {
    const { songId, licenseType, duration, usage, email, cost } = req.body;
    if (pool) {
        try {
            await query("INSERT INTO rights_inquiries (song_id, license_type, duration, usage_details, contact_email, estimated_cost) VALUES (?, ?, ?, ?, ?, ?)", [songId, licenseType, duration, usage, email, cost]);
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: 'Failed to save inquiry.' }); }
    } else {
        res.json({ success: true, message: 'Inquiry received (Simulation Mode).' });
    }
});

app.use((req, res, next) => res.status(404).render('404', { title: 'Signal Lost' }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));