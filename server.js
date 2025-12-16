const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const { Storage } = require('@google-cloud/storage');
const { Pool } = require('pg');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// --- CONFIGURATION ---
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'your-song-bucket-name';
const DOMAIN = process.env.DOMAIN || 'http://localhost:8080';

// --- MIDDLEWARE ---
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// --- DATABASE CONNECTION (Cloud SQL) ---
// Note: Ensure you have the 'pg' package installed: npm install pg
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

// If running on Cloud Run, use the Unix socket. Otherwise (local), use TCP.
if (process.env.INSTANCE_CONNECTION_NAME) {
    dbConfig.host = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
} else {
    dbConfig.host = '127.0.0.1'; // Localhost for testing
}

const pool = new Pool(dbConfig);

// --- STORAGE CONNECTION ---
// Note: Ensure you have the storage package: npm install @google-cloud/storage
const storage = new Storage();

// --- DATA LOADING ---
let songsData = [];
try {
    songsData = require('./songs.json');
} catch (error) {
    console.error('CRITICAL: songs.json not found!');
}

// --- HELPER FUNCTIONS ---

// Generate a Signed URL for a song file
async function generateSignedUrl(filename) {
    const options = {
        version: 'v4',
        action: 'read',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    };

    // Assumes files are named by their Spotify ID or Video ID in the bucket
    // e.g., "5ODkke4UjAMVbN1tQckssx.mp3"
    try {
        const [url] = await storage
            .bucket(BUCKET_NAME)
            .file(filename)
            .getSignedUrl(options);
        return url;
    } catch (err) {
        console.error("Error generating signed URL:", err);
        return null;
    }
}

// --- ROUTES ---

// 1. HOME & BASIC PAGES
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
        res.status(404).send('Song not found');
    }
});

// 3. NEW PAGES
app.get('/merch', (req, res) => {
    // Mock merch data - in production, this could come from a DB
    const merchItems = [
        { id: 'm1', name: 'Standard Uniform', price: 45.00, image: '/images/merch-shirt.jpg', description: 'Standard issue poly-blend.' },
        { id: 'm2', name: 'Vinyl Protocol', price: 30.00, image: '/images/merch-vinyl.jpg', description: 'High fidelity audio storage.' },
        { id: 'm3', name: 'Neural Patch', price: 10.00, image: '/images/merch-sticker.jpg', description: 'Adhesive emblem.' }
    ];
    res.render('merch', { merch: merchItems, title: 'Merch' });
});

app.get('/rights', (req, res) => {
    res.render('rights', { songs: songsData, title: 'Purchase Rights' });
});

app.get('/cart', (req, res) => {
    res.render('cart', { title: 'Your Inventory' });
});

// 4. API & FORM HANDLERS

// Handle Rights Inquiry (Cloud SQL)
app.post('/api/inquiry', async (req, res) => {
    const { songId, rightsType, duration, usage, estimatedCost, contactEmail } = req.body;

    // Simple validation
    if (!contactEmail || !songId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Create table if it doesn't exist (Move this to a migration script in production)
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

        // Insert Inquiry
        const insertQuery = `
            INSERT INTO rights_inquiries (song_id, rights_type, duration, usage_details, estimated_cost, contact_email)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id;
        `;
        const values = [songId, rightsType, duration, usage, estimatedCost, contactEmail];
        const result = await pool.query(insertQuery, values);

        console.log(`Inquiry created with ID: ${result.rows[0].id}`);
        res.json({ success: true, message: 'Inquiry received. The machine will contact you.' });

    } catch (err) {
        console.error('Database Error:', err);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

// Handle Stripe Checkout Creation
app.post('/create-checkout-session', async (req, res) => {
    const cartItems = req.body.items; // Array of { id, type, name, price }

    const lineItems = cartItems.map(item => {
        return {
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.name,
                    metadata: {
                        id: item.id,
                        type: item.type // 'digital' or 'merch'
                    }
                },
                unit_amount: Math.round(item.price * 100), // Stripe expects cents
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

// Checkout Success Page
app.get('/checkout/success', async (req, res) => {
    const session_id = req.query.session_id;
    // In a real app, verify the session with Stripe here:
    // const session = await stripe.checkout.sessions.retrieve(session_id);

    // For now, render success page. 
    // The frontend will call /api/download-links if digital items were bought.
    res.render('success', { title: 'Transaction Complete', sessionId: session_id });
});

// Get Download Links (Post-Purchase)
// NOTE: securely verifying purchases requires webhooks. 
// For this simple version, we will generate links based on requested IDs.
// IN PRODUCTION: Validate 'session_id' to ensure these items were actually paid for.
app.post('/api/get-downloads', async (req, res) => {
    const { songIds } = req.body; 
    const links = [];

    for (const id of songIds) {
        // Assuming files are stored as ID.mp3
        const filename = `${id}.mp3`; 
        const url = await generateSignedUrl(filename);
        if (url) {
            links.push({ id, url });
        }
    }

    res.json({ links });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});