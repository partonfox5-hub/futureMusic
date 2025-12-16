const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const { Storage } = require('@google-cloud/storage');
const { Pool } = require('pg');

// --- CONFIGURATION ---
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'your-song-bucket-name';
const DOMAIN = process.env.DOMAIN || 'http://localhost:8080';

// --- MIDDLEWARE ---
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
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
} else {
    console.warn("⚠️ WARNING: STRIPE_SECRET_KEY is missing. Checkout will fail, but server will start.");
}

// --- DATABASE CONNECTION ---
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
} else {
    console.warn("⚠️ WARNING: Database credentials missing. Store functionality will be limited.");
}

// --- STORAGE CONNECTION ---
const storage = new Storage();

// --- DATA LOADING ---
let songsData = [];
try {
    songsData = require('./songs.json');
} catch (error) {
    console.error('CRITICAL: songs.json not found!');
}

// --- HELPER FUNCTIONS ---

async function generateSignedUrl(filename) {
    if (!process.env.GCS_BUCKET_NAME) return "#";
    
    const options = {
        version: 'v4',
        action: 'read',
        expires: Date.now() + 15 * 60 * 1000, 
    };

    try {
        const [url] = await storage
            .bucket(BUCKET_NAME)
            .file(filename)
            .getSignedUrl(options);
        return url;
    } catch (err) {
        console.error("Error generating signed URL:", err.message);
        return null;
    }
}

// --- ROUTES ---

// 1. BASIC PAGES
app.get('/', (req, res) => res.render('index', { title: 'Home' }));
app.get('/projects', (req, res) => res.render('projects', { title: 'Projects' }));
app.get('/about', (req, res) => res.render('about', { title: 'About' }));
app.get('/contact', (req, res) => res.render('contact', { title: 'Contact' }));

// 2. MUSIC PAGES
// (Kept as requested: Populating from songs.json)
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
// (Updated: Populating from Database)
app.get('/merch', async (req, res) => {
    try {
        if (!pool) throw new Error("Database not connected");
        
        // Fetch only physical merch items
        const result = await pool.query("SELECT * FROM products WHERE type = 'merch' ORDER BY created_at DESC");
        
        res.render('merch', { merch: result.rows, title: 'Merch' });
    } catch (err) {
        console.error("Merch DB Error:", err);
        res.render('merch', { merch: [], title: 'Merch (Offline)' });
    }
});

app.get('/merch/:id', async (req, res) => {
    try {
        if (!pool) throw new Error("Database not connected");

        const result = await pool.query("SELECT * FROM products WHERE id = $1", [req.params.id]);
        
        if (result.rows.length > 0) {
            res.render('product', { product: result.rows[0], title: result.rows[0].name });
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

// Add Item to Cart (Persistent Session)
app.post('/api/cart', async (req, res) => {
    const { sessionId, sku, quantity } = req.body;
    
    if (!pool) return res.status(503).json({ error: 'Database unavailable' });
    if (!sessionId || !sku) return res.status(400).json({ error: 'Missing session or SKU' });

    try {
        // 1. Ensure Cart Exists
        await pool.query(
            `INSERT INTO carts (session_id, updated_at) 
             VALUES ($1, NOW()) 
             ON CONFLICT (session_id) DO UPDATE SET updated_at = NOW()`,
            [sessionId]
        );

        // 2. Add/Update Item in Cart
        // Logic: Check if exists, if so update quantity, else insert
        // Note: Using a simple check-then-insert/update logic for compatibility
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

        res.json({ success: true });
    } catch (err) {
        console.error('Cart Add Error:', err);
        res.status(500).json({ error: 'Failed to update cart' });
    }
});

// Get Cart Items
app.get('/api/cart/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    if (!pool) return res.json({ items: [] });

    try {
        // Join cart_items with products to get details
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
});

// Remove Item from Cart
app.delete('/api/cart', async (req, res) => {
    const { sessionId, sku } = req.body;
    if (!pool) return res.status(503).json({ error: 'Database unavailable' });

    try {
        await pool.query(
            "DELETE FROM cart_items WHERE session_id = $1 AND product_sku = $2",
            [sessionId, sku]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Cart Remove Error:', err);
        res.status(500).json({ error: 'Failed to remove item' });
    }
});

// Handle Rights Inquiry
app.post('/api/inquiry', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database unavailable' });

    const { songId, rightsType, duration, usage, estimatedCost, contactEmail } = req.body;
    
    try {
        const insertQuery = `
            INSERT INTO rights_inquiries (song_id, rights_type, duration, usage_details, estimated_cost, contact_email)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
        await pool.query(insertQuery, [songId, rightsType, duration, usage, estimatedCost, contactEmail]);
        res.json({ success: true, message: 'Inquiry received. The machine will contact you.' });
    } catch (err) {
        console.error('Inquiry Error:', err);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

// Handle Stripe Checkout
app.post('/create-checkout-session', async (req, res) => {
    const { sessionId } = req.body;
    
    if (!stripe) return res.status(503).json({ error: 'Payment system offline' });
    if (!sessionId) return res.status(400).json({ error: 'Session ID required' });

    try {
        // 1. Fetch items from DB to ensure prices are correct (Security)
        const query = `
            SELECT ci.quantity, p.name, p.price, p.sku, p.type
            FROM cart_items ci
            JOIN products p ON ci.product_sku = p.sku
            WHERE ci.session_id = $1
        `;
        const cartResult = await pool.query(query, [sessionId]);
        const cartItems = cartResult.rows;

        if (cartItems.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        const lineItems = cartItems.map(item => {
            return {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: item.name,
                        metadata: { sku: item.sku, type: item.type }
                    },
                    unit_amount: Math.round(Number(item.price) * 100), // Ensure price is number
                },
                quantity: item.quantity,
            };
        });

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${DOMAIN}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${DOMAIN}/cart`,
            metadata: {
                app_session_id: sessionId
            }
        });

        res.json({ id: session.id });
    } catch (error) {
        console.error("Stripe Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/checkout/success', async (req, res) => {
    const session_id = req.query.session_id;
    // Optional: Clear cart in DB here based on session_id
    res.render('success', { title: 'Transaction Complete', sessionId: session_id });
});

app.post('/api/get-downloads', async (req, res) => {
    const { songIds } = req.body; 
    const links = [];
    // Note: songIds here are typically YouTube IDs based on the schema mapping
    for (const id of songIds) {
        const filename = `${id}.mp3`; 
        const url = await generateSignedUrl(filename);
        if (url) links.push({ id, url });
    }
    res.json({ links });
});
app.get('/advocacy', (req, res) => res.render('advocacy', { title: 'The Platform' }));


// 404 CATCH-ALL
app.use((req, res, next) => {
    res.status(404).render('404', { title: 'Signal Lost' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});