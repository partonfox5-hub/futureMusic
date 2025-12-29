const express = require('express');
const app = express();

app.set('trust proxy', 1); // Required for cross-domain cookies on GCloud
const cors = require('cors');
// Replace with your actual Game URL (e.g., https://colorization.web.app)
// Leave as '*' for testing, but specify exact domain for production
// Allow both the environment variable AND specific local/production URLs
const allowedOrigins = [
    process.env.GAME_URL,
    'https://mobile-game-853337900822.us-central1.run.app', // Your Cloud Run Game URL
    'http://localhost:8080', // Local testing
    'http://127.0.0.1:8080'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('web.app') || origin.includes('firebaseapp.com')) {
            callback(null, true);
        } else {
            // Optional: For debugging, you can uncomment the next line to allow ALL origins temporarily
            // callback(null, true); 
            console.log("Blocked by CORS:", origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

const path = require('path');
const fs = require('fs'); 
const http = require('http'); 
const bodyParser = require('body-parser');
const { Storage } = require('@google-cloud/storage');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const session = require('express-session');

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
    // 1. Only extract email and password (we ignore the username field from the form)
    const { email, password } = req.body;

    // 2. Validate existence
    if (!email || !password) {
        return res.status(400).send('Please provide both an email and password.');
    }

    if (pool) {
        try {
            // 3. DATABASE FIX: Use the email as the username
            // This satisfies the database requirement for a 'username' column automatically.
           

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
    const { email, password } = req.body;
    
    try {
        if (!pool) throw new Error("Database not connected");

        const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        
        if (users.length === 0) {
            return res.send('<script>alert("Invalid email or password"); window.location.href="/login";</script>');
        }

        const user = users[0];
                const match = await bcrypt.compare(password, user.password_hash);


        if (match) {
            req.session.userId = user.id;
            req.session.email = user.email;
            
            // --- FIX START ---
            const redirectUrl = req.session.returnTo || '/account';
            delete req.session.returnTo; // Clear it after use
            res.redirect(redirectUrl);
            // --- FIX END ---
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
    try {
        // 1. Setup default safe data with fallback date to prevent Date() crashes
        let user = { 
            email: req.session.email, 
            id: req.session.userId,
            created_at: new Date() // Fallback date if DB fails
        };
        let digitalAssets = [];
        let physicalOrders = [];

        // 2. Check if DB is actually available before ANY queries
        if (pool && typeof pool.query === 'function') {
            try {
                // Fetch User Profile
                // We use the raw pool.query for consistency here, or your helper if preferred
                const [userRows] = await pool.query("SELECT * FROM users WHERE id = ?", [req.session.userId]);
                if (userRows && userRows.length > 0) {
                    user = userRows[0];
                }

                // Fetch Digital Assets
                const [dAssets] = await pool.query(`
                    SELECT * FROM orders 
                    WHERE user_id = ? 
                    AND product_type = 'digital' 
                    ORDER BY created_at DESC
                `, [req.session.userId]);
                digitalAssets = dAssets;

                // Fetch Physical Orders
                const [pOrders] = await pool.query(`
                    SELECT * FROM orders 
                    WHERE user_id = ? 
                    AND (product_type IS NULL OR product_type != 'digital') 
                    ORDER BY created_at DESC
                `, [req.session.userId]);
                physicalOrders = pOrders;

                // --- NEW: Fetch Owned Skins & Assign Frame Colors ---
                let [mySkins] = await pool.query("SELECT * FROM user_skins WHERE user_id = ?", [req.session.userId]);
                
                // Iterate to ensure every skin has a persistent frame color
                let skinsUpdated = false;
                for (let skin of mySkins) {
                    if (!skin.frame_color) {
                        // Generate random hex color
                        const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
                        skin.frame_color = randomColor; // Update local object
                        
                        // Update DB asynchronously
                        await pool.query("UPDATE user_skins SET frame_color = ? WHERE id = ?", [randomColor, skin.id]);
                        skinsUpdated = true;
                    }
                }
                
                // If we updated any colors, passing the modified 'mySkins' array is sufficient 
                // as we updated the local objects in the loop.

            } catch (dbErr) {
                console.error("⚠️ Account DB Fetch Error:", dbErr.message);
                // We continue rendering with whatever data we have (likely just session data)
            }
        }

        // 3. Render Page
        // CRITICAL FIX: We pass 'user', NOT 'req.session.user' (which is undefined)
res.render('account', { 
    user: user, 
    digitalAssets: digitalAssets,
    physicalOrders: physicalOrders,
    gameSkins: mySkins || [] // Pass the skins to the template
});

    } catch (err) {
        console.error("❌ Account Page Critical Error:", err);
        res.status(500).send(`<h1>Error loading account</h1><p>${err.message}</p>`);
    }
});


// --- NEW ACCOUNT ACTION ROUTES ---

// Change Email
app.post('/account/update-email', requireAuth, async (req, res) => {
    const { newEmail } = req.body;
    if (!newEmail) return res.redirect('/account');
    
    try {
        if(pool) {
            await pool.query("UPDATE users SET email = ? WHERE id = ?", [newEmail, req.session.userId]);
            req.session.email = newEmail; // Update session
        }
        res.redirect('/account');
    } catch (err) {
        console.error("Update email error:", err);
        res.status(500).send("Error updating email.");
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
                // 1. Existing fallback for the basic 'sizes' column
                if (typeof p.sizes === 'string') { try { p.sizes = JSON.parse(p.sizes); } catch(e) { p.sizes = []; } }
                else if (!p.sizes) { p.sizes = []; }

                // 2. NEW LOGIC: Extract "real" sizes from metadata variants
                // This matches the logic currently used in your single product route
                if (p.metadata) {
                    try {
                        let meta = p.metadata;
                        // Handle potential double-stringification
                        if (typeof meta === 'string') { try { meta = JSON.parse(meta); } catch (e) {} }
                        if (typeof meta === 'string') { try { meta = JSON.parse(meta); } catch (e) {} }

                        if (meta && meta.variants && Array.isArray(meta.variants)) {
                            let extractedSizes = meta.variants
                                .filter(v => v.is_available === true) // Only show available sizes
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
        console.error("❌ Checkout blocked: Stripe is not configured.");
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
        console.log(`🚀 Creating Stripe Session for ${domain}`);
        const session = await stripe.checkout.sessions.create(sessionConfig);
        
        // 7. Record Order in DB
// --- REPLACEMENT CODE START ---

// 1. Fetch cart items WITH product details from your products table
// We join cart_items with products to get the description and type
const [itemsToOrder] = await pool.query(`
    SELECT 
        ci.*, 
        p.type AS product_type, 
        p.description 
    FROM cart_items ci
    JOIN products p ON ci.product_sku = p.sku
    WHERE ci.session_id = ?
`, [sessionId]); // Ensure 'sessionId' matches the variable name in your route (e.g., req.sessionID or session.id)

// 2. Insert into orders with the new fields
for (const item of itemsToOrder) {
    await pool.query(`
        INSERT INTO orders (
            user_id, 
            product_sku, 
            amount, 
            status, 
            product_type,    
            size,            
            description,     
            created_at
        ) VALUES (?, ?, ?, 'paid', ?, ?, ?, NOW())
    `, [
        userId,              // Ensure 'userId' matches your variable (e.g., req.session.userId)
        item.product_sku, 
        item.price,          // Assumes price is in cart_items. If not, change to 'item.product_price' based on your schema
        item.product_type,   // Maps to the new column
        item.size,           // Maps to the new column (from cart)
        item.description     // Maps to the new column
    ]);
}
// --- REPLACEMENT CODE END ---
        
        res.json({ id: session.id });

    } catch (err) {
        console.error("Checkout Error:", err);
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


app.post('/api/cart/add', async (req, res) => {
    // 1. Wrap EVERYTHING in try/catch to ensure JSON response (Fixes "Unexpected token <")
    try {
        // FIX: Accept sessionId from the browser (req.body) to match the frontend store.js
        const { sku, size, sessionId: bodySessionId } = req.body;
        
        // Priority: 1. Browser's LocalStorage ID, 2. Server Cookie ID
        const sessionId = bodySessionId || req.sessionID;

        if (!sku) return res.status(400).json({ error: 'SKU required' });

        // --- NEW LOGIC START: Product Validation & Size Cleanup ---
        let product = null;

        // 1. Fetch Product first to validate it exists and check its type
        if (pool) {
            const [rows] = await pool.query("SELECT * FROM products WHERE sku = ?", [sku]);
            if (rows.length > 0) product = rows[0];
        } else {
            product = await getProductBySku(sku); // Fallback to memory mock
        }

        if (!product) return res.status(404).json({ error: 'Product not found' });

        // 2. Determine Correct Size (Fixes "Size applied to songs")
        // Logic: If product has NO sizes defined, we FORCE size to be empty string.
        let finalSize = size || '';
        
        let productSizes = [];
        if (product.sizes) {
            try {
                // Handle both JSON string or pre-parsed array
                productSizes = typeof product.sizes === 'string' ? JSON.parse(product.sizes) : product.sizes;
            } catch(e) { productSizes = []; }
        }

        // If the product has no variants/sizes (e.g. Song), force finalSize to empty
        // This ensures songs never get stuck with a "Size: null" or "Size: undefined" tag
        if (!Array.isArray(productSizes) || productSizes.length === 0) {
            finalSize = '';
        }
        // --- NEW LOGIC END ---

        if (pool) {
            // DB Mode
            
            // A. Ensure session exists in 'carts' table
            await pool.query(
                "INSERT INTO carts (session_id, updated_at) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE updated_at = NOW()", 
                [sessionId]
            );

            // B. Check if this specific item (SKU + Size) is already in the cart
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
        } else {
            // Memory Cart Fallback (for testing without DB)
            if (!memoryCarts[sessionId]) memoryCarts[sessionId] = [];
            const cart = memoryCarts[sessionId];
            const existingItem = cart.find(i => i.sku === sku && i.size === finalSize);
            
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({ ...product, quantity: 1, size: finalSize });
            }
        }
        
        // Return Success JSON
        res.json({ success: true });

    } catch (err) {
        console.error("Cart Add Error:", err);
        // CRITICAL: Return JSON error, not HTML. This prevents the SyntaxError in frontend.
        res.status(500).json({ error: 'Server error: ' + err.message });
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
                ownedSkins: ownedSkinIds 
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

        // --- ADD THIS BLOCK ---
    if (password.length < 8) return res.json({ success: false, message: "Password must be at least 8 characters" });
    // ----------------------

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
    if(session.metadata && session.metadata.type === 'skin_purchase') {
        if(pool) {
            await pool.query("INSERT IGNORE INTO user_skins (user_id, skin_id) VALUES (?, ?)", 
                [session.metadata.userId, session.metadata.skinId]);
            console.log(`Skin ${session.metadata.skinId} unlocked for user ${session.metadata.userId}`);
        }
    }
  }
  response.json({received: true});
});

app.use((req, res, next) => res.status(404).render('404', { title: 'Signal Lost' }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));