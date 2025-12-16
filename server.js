const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const { Storage } = require('@google-cloud/storage');
const { Pool } = require('pg');

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

// Fallback Merch Data (Used if DB is offline)
const mockMerchItems = [
    { sku: 'm1', id: 'm1', name: 'Standard Uniform', price: 45.00, image_url: '/images/merch-shirt.jpg', description: 'Standard issue poly-blend.', type: 'merch' },
    { sku: 'm2', id: 'm2', name: 'Vinyl Protocol', price: 30.00, image_url: '/images/merch-vinyl.jpg', description: 'High fidelity audio storage.', type: 'merch' }
];

// In-Memory Cart (Fallback for when DB is offline)
const memoryCarts = {};

// --- MIDDLEWARE ---
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// FORCE PERMISSIVE CSP HEADER
// This overrides any default strict security headers causing the font/script blocks
app.use((req, res, next) => {
    res.setHeader(
        "Content-Security-Policy",
        "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
        "script-src * 'unsafe-inline' 'unsafe-eval'; " +
        "connect-src * 'unsafe-inline'; " +
        "img-src * data: blob:; " +
        "frame-src *; " +
        "style-src * 'unsafe-inline'; " +
        "font-src * data: blob:;"
    );
    next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// --- STRIPE INIT (SAFE MODE) ---
let stripe;
if (process.env.STRIPE_SECRET_KEY) {
    try {
        stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    } catch (e) {
        console.warn("⚠️ WARNING: Failed to initialize Stripe with provided key.", e.message);
    }
}

// --- DATABASE CONNECTION (SAFE MODE) ---
let pool;
if (process.env.DB_USER && process.env.DB_NAME) {
    const dbConfig = {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    };
    if (process.env.INSTANCE_CONNECTION_NAME) {
        dbConfig.host = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
    } else {
        dbConfig.host = '127.0.0.1';
    }
    pool = new Pool(dbConfig);
    console.log("Connected to PostgreSQL Database.");
} else {
    console.warn("⚠️ DATABASE NOT CONNECTED: Running in FALLBACK MODE (In-Memory).");
}

// --- HELPER FUNCTIONS ---

async function generateSignedUrl(filename) {
    // Mock URL if no bucket configured
    if (!process.env.GCS_BUCKET_NAME) return `https://storage.googleapis.com/mock-bucket/${filename}`;
    
    // ... existing GCS logic ...
    const storage = new Storage();
    // (omitted for brevity, keep your existing logic here if needed)
    return "#"; 
}

// Helper to look up product (DB or Fallback)
async function getProductBySku(sku) {
    if (pool) {
        const res = await pool.query("SELECT * FROM products WHERE sku = $1", [sku]);
        return res.rows[0];
    }
    
    // Fallback: Check Merch
    const merch = mockMerchItems.find(m => m.sku === sku || m.id === sku);
    if (merch) return merch;

    // Fallback: Check Songs (songs.json)
    // Map song ID to a product structure
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

// 3. MERCH PAGES
app.get('/merch', async (req, res) => {
    try {
        if (pool) {
            const result = await pool.query("SELECT * FROM products WHERE type = 'merch' ORDER BY created_at DESC");
            res.render('merch', { merch: result.rows, title: 'Merch' });
        } else {
            // Fallback
            res.render('merch', { merch: mockMerchItems, title: 'Merch (Offline)' });
        }
    } catch (err) {
        console.error("Merch Error:", err);
        res.render('merch', { merch: [], title: 'Merch (Error)' });
    }
});

app.get('/merch/:id', async (req, res) => {
    try {
        let product;
        if (pool) {
            const result = await pool.query("SELECT * FROM products WHERE id = $1 OR sku = $1", [req.params.id]);
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
        console.error("Product DB Error:", err);
        res.status(500).render('404', { title: 'Error' });
    }
});

// 4. OTHER STORE PAGES
app.get('/rights', (req, res) => {
    res.render('rights', { songs: songsData, title: 'Purchase Rights' });
});

app.get('/cart', (req, res) => {
    res.render('cart', { title: 'Your Inventory' });
});

// 5. API & CART HANDLERS

// Add Item to Cart
app.post('/api/cart', async (req, res) => {
    const { sessionId, sku, quantity } = req.body;
    if (!sessionId || !sku) return res.status(400).json({ error: 'Missing session or SKU' });

    // --- DB MODE ---
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
            console.error('DB Cart Error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
    } 
    
    // --- FALLBACK MEMORY MODE ---
    else {
        if (!memoryCarts[sessionId]) memoryCarts[sessionId] = [];
        const cart = memoryCarts[sessionId];
        const existingItem = cart.find(i => i.sku === sku);
        
        if (existingItem) {
            existingItem.quantity += (quantity || 1);
        } else {
            // We need to look up product details to store enough info for the cart
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

// Get Cart Items
app.get('/api/cart/:sessionId', async (req, res) => {
    const { sessionId } = req.params;

    // --- DB MODE ---
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
            console.error('Cart Fetch Error:', err);
            res.status(500).json({ error: 'Failed to load cart' });
        }
    }
    
    // --- FALLBACK MEMORY MODE ---
    else {
        const items = memoryCarts[sessionId] || [];
        res.json({ items: items });
    }
});

// Remove Item from Cart
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

// Handle Rights Inquiry
app.post('/api/inquiry', async (req, res) => {
    // Just log it in fallback mode
    if (!pool) {
        console.log("Inquiry received (DB Offline):", req.body);
        return res.json({ success: true, message: 'Inquiry received (Simulation Mode).' });
    }
    // ... DB implementation ...
});

// Handle Stripe Checkout
app.post('/create-checkout-session', async (req, res) => {
    const { sessionId } = req.body;
    if (!stripe) return res.status(503).json({ error: 'Payment system offline' });

    let cartItems = [];

    // Get Items
    if (pool) {
        const query = `
            SELECT ci.quantity, p.name, p.price, p.sku, p.type
            FROM cart_items ci
            JOIN products p ON ci.product_sku = p.sku
            WHERE ci.session_id = $1
        `;
        const result = await pool.query(query, [sessionId]);
        cartItems = result.rows;
    } else {
        cartItems = memoryCarts[sessionId] || [];
    }

    if (cartItems.length === 0) return res.status(400).json({ error: 'Cart is empty' });

    const lineItems = cartItems.map(item => {
        return {
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.name,
                    metadata: { sku: item.sku, type: item.type }
                },
                unit_amount: Math.round(Number(item.price) * 100),
            },
            quantity: item.quantity,
        };
    });

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${DOMAIN}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${DOMAIN}/cart`,
        });
        res.json({ id: session.id });
    } catch (error) {
        console.error("Stripe Error:", error);
        res.status(500).json({ error: error.message });
    }
});
// FORCE PERMISSIVE CSP HEADER
app.use((req, res, next) => {
    res.setHeader(
        "Content-Security-Policy",
        "default-src 'self' https://*.stripe.com; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.stripe.com https://js.stripe.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com data:; " +
        "img-src 'self' data: blob: https://*.stripe.com https://*.googleapis.com https://img.youtube.com https://placehold.co; " +
        "frame-src 'self' https://*.stripe.com https://js.stripe.com; " +
        "connect-src 'self' https://*.stripe.com;"
    );
    next();
});
// 404 CATCH-ALL
app.use((req, res, next) => {
    res.status(404).render('404', { title: 'Signal Lost' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});