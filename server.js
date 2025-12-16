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

// --- DATABASE CONNECTION (SAFE MODE) ---
let pool;
if (process.env.DB_USER && process.env.DB_NAME) {
    const dbConfig = {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    };
    // Cloud Run uses Unix socket, Local uses TCP
    if (process.env.INSTANCE_CONNECTION_NAME) {
        dbConfig.host = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
    } else {
        dbConfig.host = '127.0.0.1';
    }
    pool = new Pool(dbConfig);
} else {
    console.warn("⚠️ WARNING: Database credentials missing. Rights Inquiry will fail, but server will start.");
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

// Mock Merch Data (Shared)
const merchItems = [
    { id: 'm1', name: 'Standard Uniform', price: 45.00, image: '/images/merch-shirt.jpg', description: 'Standard issue poly-blend. Designed for optimal conformity and durability in all sectors.' },
    { id: 'm2', name: 'Vinyl Protocol', price: 30.00, image: '/images/merch-vinyl.jpg', description: 'High fidelity audio storage. Contains the complete auditory instructions for the current era.' },
    { id: 'm3', name: 'Neural Patch', price: 10.00, image: '/images/merch-sticker.jpg', description: 'Adhesive emblem. Mark your possessions or yourself as property of the collective.' }
];

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
app.get('/music', (req, res) => {
    if (req.query.song) return res.redirect(`/song/${req.query.song}`);
    res.render('music', { songs: songsData });
});

app.get('/song/:id', (req, res) => {
    const songId = req.params.id;
    const song = songsData.find(s => {
        if (s.youtube_info && s.youtube_info.video_id === songId) return true;
        if (s.spotify_id === songId) return true;
        return false;
    });
    if (song) {
        res.render('song', { song: song });
    } else {
        res.status(404).render('404', { title: 'Signal Lost' });
    }
});

// 3. MERCH PAGES
app.get('/merch', (req, res) => {
    res.render('merch', { merch: merchItems, title: 'Merch' });
});

app.get('/merch/:id', (req, res) => {
    const item = merchItems.find(m => m.id === req.params.id);
    if (item) {
        res.render('product', { product: item, title: item.name });
    } else {
        res.status(404).render('404', { title: 'Product Not Found' });
    }
});

// 4. OTHER STORE PAGES
app.get('/rights', (req, res) => {
    res.render('rights', { songs: songsData, title: 'Purchase Rights' });
});

app.get('/cart', (req, res) => {
    res.render('cart', { title: 'Your Inventory' });
});

// 5. API & FORM HANDLERS

// Handle Rights Inquiry
app.post('/api/inquiry', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database unavailable' });

    const { songId, rightsType, duration, usage, estimatedCost, contactEmail } = req.body;
    if (!contactEmail || !songId) return res.status(400).json({ error: 'Missing required fields' });

    try {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS rights_inquiries (
                id SERIAL PRIMARY KEY,
                song_id VARCHAR(255),
                rights_type VARCHAR(50),
                duration VARCHAR(50),
                usage_details TEXT,
                estimated_cost NUMERIC,
                contact_email VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await pool.query(createTableQuery);

        const insertQuery = `
            INSERT INTO rights_inquiries (song_id, rights_type, duration, usage_details, estimated_cost, contact_email)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id;
        `;
        const values = [songId, rightsType, duration, usage, estimatedCost, contactEmail];
        const result = await pool.query(insertQuery, values);

        res.json({ success: true, message: 'Inquiry received. The machine will contact you.' });
    } catch (err) {
        console.error('Database Error:', err);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

// Handle Stripe Checkout
app.post('/create-checkout-session', async (req, res) => {
    if (!stripe) return res.status(503).json({ error: 'Payment system offline (Key missing or invalid)' });

    const cartItems = req.body.items;
    const lineItems = cartItems.map(item => {
        return {
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.name,
                    metadata: { id: item.id, type: item.type }
                },
                unit_amount: Math.round(item.price * 100),
            },
            quantity: 1,
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

app.get('/checkout/success', async (req, res) => {
    const session_id = req.query.session_id;
    res.render('success', { title: 'Transaction Complete', sessionId: session_id });
});

app.post('/api/get-downloads', async (req, res) => {
    const { songIds } = req.body; 
    const links = [];
    for (const id of songIds) {
        const filename = `${id}.mp3`; 
        const url = await generateSignedUrl(filename);
        if (url) links.push({ id, url });
    }
    res.json({ links });
});

// 404 CATCH-ALL
app.use((req, res, next) => {
    res.status(404).render('404', { title: 'Signal Lost' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});