const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs'); // Added for diagnostics
const bodyParser = require('body-parser');
const { Storage } = require('@google-cloud/storage');
const { Pool } = require('pg');

// Try loading .env if available (fixes local issues)
try { require('dotenv').config(); } catch (e) { /* dotenv not installed */ }

// --- CONFIGURATION ---
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'your-song-bucket-name';
const DOMAIN = process.env.DOMAIN || 'http://localhost:8080';

// --- DATA LOADING ---
let songsData = [];
try {
    songsData = require('./songs.json');
} catch (error) {
    console.error('CRITICAL: songs.json not found!');
}

// Fallback Merch Data (Used if DB is offline or empty)
const mockMerchItems = [
    { sku: 'm1', id: 'm1', name: 'Standard Uniform', price: 45.00, image_url: '/images/merch-shirt.jpg', description: 'Standard issue poly-blend.', type: 'merch' },
    { sku: 'm2', id: 'm2', name: 'Vinyl Protocol', price: 30.00, image_url: '/images/merch-vinyl.jpg', description: 'High fidelity audio storage.', type: 'merch' }
];

// In-Memory Cart (Fallback for when DB is offline)
const memoryCarts = {};

// --- MIDDLEWARE ---
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- AGGRESSIVE CACHE KILLING ---
app.disable('etag');
app.disable('view cache');
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    next();
});

// --- CSP OVERRIDE ---
app.use((req, res, next) => {
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

// --- STRIPE INIT ---
let stripe;
if (process.env.STRIPE_SECRET_KEY) {
    try {
        stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    } catch (e) {
        console.warn("⚠️ WARNING: Failed to initialize Stripe with provided key.", e.message);
    }
}

// --- DATABASE CONNECTION & DIAGNOSTICS ---
let pool;
let dbConnectionStatus = "PENDING";
let dbErrorDetail = null;

// Clean inputs to avoid whitespace traps
const rawConnectionName = process.env.INSTANCE_CONNECTION_NAME || '';
const cleanConnectionName = rawConnectionName.trim();

const DB_CONFIG = {
    user: process.env.DB_USER || '',           
    password: process.env.DB_PASSWORD || '',   
    database: process.env.DB_NAME || '',       
    connectionName: cleanConnectionName 
};

// Log config status (masked)
console.log("--- DB CONFIG CHECK ---");
console.log("User:", DB_CONFIG.user ? "SET" : "MISSING");
console.log("Pass:", DB_CONFIG.password ? "SET" : "MISSING");
console.log("DB Name:", DB_CONFIG.database ? "SET" : "MISSING");
console.log("Cloud SQL Target:", DB_CONFIG.connectionName || "None");

if (DB_CONFIG.user && DB_CONFIG.database) {
    const dbConfig = {
        user: DB_CONFIG.user,
        password: DB_CONFIG.password,
        database: DB_CONFIG.database,
    };

    // Cloud SQL Logic
    if (DB_CONFIG.connectionName) {
        dbConfig.host = `/cloudsql/${DB_CONFIG.connectionName}`;
    } else {
        dbConfig.host = '127.0.0.1';
    }

    pool = new Pool(dbConfig);

    pool.on('error', (err, client) => {
        console.error('❌ DB POOL ERROR:', err);
        dbConnectionStatus = "ERROR";
        dbErrorDetail = err.message;
    });

    pool.connect((err, client, release) => {
        if (err) {
            console.error("❌ INITIAL CONNECTION FAILED:", err.message);
            
            // --- ENHANCED DIAGNOSTICS ---
            // If we can't connect, look at the file system to see what IS there.
            let socketDiagnostic = "";
            if (dbConfig.host.startsWith('/cloudsql')) {
                try {
                    if (fs.existsSync('/cloudsql')) {
                        const contents = fs.readdirSync('/cloudsql');
                        if (contents.length === 0) {
                            socketDiagnostic = "The /cloudsql folder is EMPTY. The proxy failed to start. (Check Permissions/API)";
                        } else {
                            socketDiagnostic = `The /cloudsql folder contains: [${contents.join(', ')}]. We looked for: [${DB_CONFIG.connectionName}]`;
                        }
                    } else {
                        socketDiagnostic = "The /cloudsql folder does NOT exist. Cloud Run Connection setting is missing.";
                    }
                } catch (fsErr) {
                    socketDiagnostic = "Could not read /cloudsql: " + fsErr.message;
                }
            }

            console.error("🕵️ DIAGNOSTIC REPORT:", socketDiagnostic);
            
            // Update the status for the UI
            dbConnectionStatus = "FAILED";
            dbErrorDetail = `${err.message} || DIAGNOSTIC: ${socketDiagnostic}`;
            
            pool = null; 
        } else {
            console.log("✅ DB CONNECTED SUCCESSFULLY");
            dbConnectionStatus = "CONNECTED";
            release();
        }
    });

} else {
    dbConnectionStatus = "CONFIG_MISSING";
    dbErrorDetail = "Environment variables (DB_USER, DB_NAME, etc) are missing.";
}

// --- HELPER FUNCTIONS ---

async function getProductBySku(sku) {
    // 1. Try DB
    if (pool) {
        try {
            const res = await pool.query("SELECT * FROM products WHERE sku = $1", [sku]);
            if (res.rows.length > 0) return res.rows[0];
        } catch (e) { console.error("DB Error fetching product:", e); }
    }
    
    // 2. Fallback: Check Merch
    const merch = mockMerchItems.find(m => m.sku === sku || m.id === sku);
    if (merch) return merch;

    // 3. Fallback: Check Songs
    const song = songsData.find(s => 
        (s.youtube_info && s.youtube_info.video_id === sku) || 
        s.spotify_id === sku
    );

    if (song) {
        return {
            sku: sku,
            name: song.name,
            price: 0.99,
            type: 'digital',
            image_url: song.youtube_info ? `https://img.youtube.com/vi/${song.youtube_info.video_id}/mqdefault.jpg` : '/images/default-album-art.jpg'
        };
    }

    return null;
}

// --- ROUTES ---

// 1. BASIC PAGES
app.get('/', (req, res) => res.render('index', { title: 'Home' }));
app.get('/projects', (req, res) => res.render('projects', { title: 'Projects' }));
app.get('/about', (req, res) => res.render('about', { title: 'About' }));
app.get('/contact', (req, res) => res.render('contact', { title: 'Contact' }));
app.get('/advocacy', (req, res) => res.render('advocacy', { title: 'Advocacy' }));

// 2. MUSIC PAGES
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
    if (song) {
        res.render('song', { song: song, title: song.name });
    } else {
        res.status(404).render('404', { title: 'Signal Lost' });
    }
});

// 3. MERCH PAGES (With On-Screen Debugging)
app.get('/merch', async (req, res) => {
    try {
        if (pool) {
            // FIX 1: Use LOWER(type) to handle Case Sensitivity
            const result = await pool.query("SELECT * FROM products WHERE LOWER(type) = 'merch' ORDER BY created_at DESC");
            
            if (result.rows.length === 0) {
                res.render('merch', { 
                    merch: mockMerchItems, 
                    title: 'Merch (DB Empty)',
                    debugError: "Database connected, but 0 products found with type='merch'. Check your table data.",
                    dbStatus: "CONNECTED (EMPTY)"
                });
            } else {
                res.render('merch', { 
                    merch: result.rows, 
                    title: 'Merch',
                    debugError: null 
                });
            }
        } else {
            // DB is Offline/Failed -> Show On-Screen Error
            res.render('merch', { 
                merch: mockMerchItems, 
                title: 'Merch (Offline Mode)',
                debugError: dbErrorDetail || "Unknown Database Error", 
                dbStatus: dbConnectionStatus
            });
        }
    } catch (err) {
        res.render('merch', { 
            merch: mockMerchItems, 
            title: 'Merch (Crash)',
            debugError: err.message,
            dbStatus: "CRASHED"
        });
    }
});

app.get('/merch/:id', async (req, res) => {
    try {
        let product;
        if (pool) {
            // FIX 2: Cast ID to TEXT to prevent crash with string SKUs
            const query = "SELECT * FROM products WHERE CAST(id AS TEXT) = $1 OR sku = $1";
            const result = await pool.query(query, [req.params.id]);
            product = result.rows[0];
        } else {
            product = mockMerchItems.find(m => m.id === req.params.id || m.sku === req.params.id);
        }
        
        if (product) {
            res.render('product', { product: product, title: product.name });
        } else {
            res.status(404).render('404', { title: 'Product Not Found' });
        }
    } catch (err) {
        console.error("Product Page Error:", err);
        res.status(500).render('404', { title: 'Error' });
    }
});

// 4. CHECKOUT & RIGHTS PAGES

app.get('/rights', (req, res) => {
    res.render('rights', { songs: songsData, title: 'Purchase Rights' });
});

app.get('/rights/confirmation', (req, res) => {
    res.render('rights_confirmation', { title: 'Inquiry Received' });
});

app.get('/cart', (req, res) => {
    res.render('cart', { title: 'Your Inventory' });
});

app.get('/checkout', (req, res) => {
    res.render('checkout_form', { title: 'Secure Checkout' });
});

app.post('/initiate-checkout', async (req, res) => {
    const { sessionId, email, fullName, phone, password } = req.body;

    if (!pool) {
        return res.status(500).json({ error: "DB Offline - Cannot process secure orders." });
    }

    try {
        let userId;
        const userCheck = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
        if (userCheck.rows.length > 0) {
            userId = userCheck.rows[0].id;
        } else {
            const newUser = await pool.query(
                "INSERT INTO users (email, full_name, phone, password_hash) VALUES ($1, $2, $3, $4) RETURNING id",
                [email, fullName, phone, password] 
            );
            userId = newUser.rows[0].id;
        }
        
        const cartQuery = `
            SELECT ci.quantity, p.name, p.price, p.sku, p.type, p.image_url
            FROM cart_items ci
            JOIN products p ON ci.product_sku = p.sku
            WHERE ci.session_id = $1
        `;
        const cartResult = await pool.query(cartQuery, [sessionId]);
        const cartItems = cartResult.rows;

        if (cartItems.length === 0) return res.status(400).json({ error: "Cart is empty" });

        const hasPhysicalItems = cartItems.some(item => item.type === 'merch');
        
        const lineItems = cartItems.map(item => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.name,
                    metadata: { sku: item.sku, type: item.type },
                    images: item.image_url ? [`${DOMAIN}${item.image_url}`] : [],
                },
                unit_amount: Math.round(Number(item.price) * 100),
            },
            quantity: item.quantity,
        }));

        const sessionConfig = {
            payment_method_types: ['card'],
            customer_email: email,
            line_items: lineItems,
            mode: 'payment',
            success_url: `${DOMAIN}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${DOMAIN}/cart`,
            metadata: {
                userId: userId.toString(), 
                custom_session_id: sessionId
            }
        };

        if (hasPhysicalItems) {
            sessionConfig.shipping_address_collection = {
                allowed_countries: ['US', 'CA', 'GB'],
            };
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);

        await pool.query(
            "INSERT INTO orders (user_id, stripe_session_id, total_amount, payment_status) VALUES ($1, $2, $3, 'pending')",
            [userId, session.id, (session.amount_total / 100)]
        );

        res.json({ id: session.id });

    } catch (err) {
        console.error("Checkout / DB Error:", err);
        res.status(500).json({ error: "Checkout failed: " + err.message });
    }
});

// 5. API HANDLERS

app.post('/api/inquiry', async (req, res) => {
    const { songId, licenseType, duration, usage, email, cost } = req.body;

    if (pool) {
        try {
            await pool.query(
                `INSERT INTO rights_inquiries 
                (song_id, license_type, duration, usage_details, contact_email, estimated_cost) 
                VALUES ($1, $2, $3, $4, $5, $6)`,
                [songId, licenseType, duration, usage, email, cost]
            );
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: 'Failed to save inquiry.' });
        }
    } else {
        res.json({ success: true, message: 'Inquiry received (Simulation Mode).' });
    }
});

app.post('/api/cart', async (req, res) => {
    const { sessionId, sku, quantity } = req.body;
    if (!sessionId || !sku) return res.status(400).json({ error: 'Missing session or SKU' });

    if (pool) {
        try {
            await pool.query(
                `INSERT INTO carts (session_id, updated_at) 
                 VALUES ($1, NOW()) 
                 ON CONFLICT (session_id) DO UPDATE SET updated_at = NOW()`,
                [sessionId]
            );
            const existingItem = await pool.query(
                "SELECT * FROM cart_items WHERE session_id = $1 AND product_sku = $2",
                [sessionId, sku]
            );
            if (existingItem.rows.length > 0) {
                await pool.query(
                    "UPDATE cart_items SET quantity = quantity + $1 WHERE id = $2",
                    [quantity || 1, existingItem.rows[0].id]
                );
            } else {
                await pool.query(
                    "INSERT INTO cart_items (session_id, product_sku, quantity) VALUES ($1, $2, $3)",
                    [sessionId, sku, quantity || 1]
                );
            }
            return res.json({ success: true });
        } catch (err) {
            return res.status(500).json({ error: 'Database error' });
        }
    } else {
        if (!memoryCarts[sessionId]) memoryCarts[sessionId] = [];
        const cart = memoryCarts[sessionId];
        const existingItem = cart.find(i => i.sku === sku);
        
        if (existingItem) {
            existingItem.quantity += (quantity || 1);
        } else {
            const product = await getProductBySku(sku);
            if (!product) return res.status(404).json({ error: 'Product/Song not found' });
            cart.push({
                sku: sku,
                quantity: quantity || 1,
                name: product.name,
                price: product.price,
                type: product.type,
                image_url: product.image_url
            });
        }
        return res.json({ success: true, mode: 'memory' });
    }
});

app.get('/api/cart/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    if (pool) {
        try {
            const query = `
                SELECT ci.id as item_id, ci.quantity, p.* FROM cart_items ci
                JOIN products p ON ci.product_sku = p.sku
                WHERE ci.session_id = $1
                ORDER BY ci.added_at DESC
            `;
            const result = await pool.query(query, [sessionId]);
            res.json({ items: result.rows });
        } catch (err) {
            res.status(500).json({ error: 'Failed to load cart' });
        }
    } else {
        const items = memoryCarts[sessionId] || [];
        res.json({ items: items });
    }
});

app.delete('/api/cart', async (req, res) => {
    const { sessionId, sku } = req.body;
    if (pool) {
        try {
            await pool.query("DELETE FROM cart_items WHERE session_id = $1 AND product_sku = $2", [sessionId, sku]);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: 'Database error' });
        }
    } else {
        if (memoryCarts[sessionId]) {
            memoryCarts[sessionId] = memoryCarts[sessionId].filter(i => i.sku !== sku);
        }
        res.json({ success: true });
    }
});

// 404 CATCH-ALL
app.use((req, res, next) => {
    res.status(404).render('404', { title: 'Signal Lost' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});