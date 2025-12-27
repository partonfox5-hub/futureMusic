require('dotenv').config(); // Load env vars if in local dev
const express = require('express');
const app = express();
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// =================================================================
// 1. DATABASE CONNECTION (PostgreSQL)
// =================================================================
// Configure these in your Google Cloud Run Environment Variables
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || '35.245.190.221', // Your specific IP
    database: process.env.DB_NAME || 'shinemore_db',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
    
    // TIMEOUT SETTINGS
    connectionTimeoutMillis: 5000, 
    idleTimeoutMillis: 30000, 

    // CRITICAL FIX FOR CLOUD SQL PUBLIC IP:
    ssl: {
        rejectUnauthorized: false // Allows self-signed certs (standard for Cloud SQL)
    }
});

// --- TEST DB CONNECTION ---
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error acquiring client', err.stack);
    } else {
        console.log('Database Connected Successfully');
        client.query('SELECT NOW()', (err, result) => {
            release();
            if (err) {
                return console.error('Error executing query', err.stack);
            }
            console.log('Database Time:', result.rows[0]);
        });
    }
});

// =================================================================
// 2. MIDDLEWARE & SECURITY
// =================================================================

// Trust Proxy is REQUIRED for Google Cloud Run to handle secure cookies correctly
app.set('trust proxy', 1);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Secure Session Configuration
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'session',
        createTableIfMissing: true // Ensures session table exists to prevent crashes
    }),
    secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-prod',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: process.env.NODE_ENV === 'production', // TRUE in production (HTTPS)
        httpOnly: true, // Prevents XSS attacks on the cookie
        sameSite: 'lax'
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport Serialization
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        done(null, result.rows[0]);
    } catch (err) {
        done(err, null);
    }
});

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'mock_client_id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'mock_client_secret',
    callbackURL: "/auth/google/callback"
  },
  async function(accessToken, refreshToken, profile, cb) {
    try {
        // Check if user exists based on Google ID
        let res = await pool.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
        
        if (res.rows.length > 0) {
            return cb(null, res.rows[0]);
        } else {
            // Check if user exists based on Email (to merge accounts)
            const email = profile.emails[0].value;
            res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            
            if (res.rows.length > 0) {
                // Update existing user with Google ID
                const user = res.rows[0];
                await pool.query('UPDATE users SET google_id = $1 WHERE id = $2', [profile.id, user.id]);
                return cb(null, user);
            } else {
                // Create New User from Google
                const newUser = await pool.query(
                    'INSERT INTO users (full_name, email, google_id) VALUES ($1, $2, $3) RETURNING *',
                    [profile.displayName, email, profile.id]
                );
                return cb(null, newUser.rows[0]);
            }
        }
    } catch (err) {
        return cb(err, null);
    }
  }
));

// Make 'user' available to all EJS templates (Header, etc.)
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    next();
});

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Helper to await login (Prevents race conditions during redirect)
const loginUser = (req, user) => {
    return new Promise((resolve, reject) => {
        req.login(user, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
};

// =================================================================
// 3. SERVICE DATA (Complete)
// =================================================================
const servicesData = {
    'web-design': {
        title: 'Website Design',
        icon: 'fas fa-pencil-ruler',
        tagline: 'UI/UX focused digital experiences that convert.',
        description: 'We don’t just design websites; we architect user journeys. Our design process merges aesthetic excellence with behavioral psychology to create interfaces that are intuitive, accessible, and high-converting.',
        features: ['Responsive & Adaptive Design', 'User Experience (UX) Auditing', 'Interactive Prototyping', 'Design Systems']
    },
    'web-infrastructure': {
        title: 'Web Infrastructure',
        icon: 'fas fa-server',
        tagline: 'Scalable cloud architecture for 99.99% uptime.',
        description: 'Your application is only as good as the server it runs on. We design resilient, auto-scaling cloud architectures on AWS and Google Cloud that handle traffic spikes without blinking.',
        features: ['Cloud Migration', 'Serverless Architecture', 'CI/CD Pipelines', 'Load Balancing']
    },
    'web-branding': {
        title: 'Web Branding',
        icon: 'fas fa-palette',
        tagline: 'Building cohesive, memorable digital identities.',
        description: 'Your brand is more than a logo. We craft complete digital visual identities that resonate with your audience, ensuring consistency across web, mobile, and social platforms.',
        features: ['Logo & Identity Design', 'Brand Guidelines', 'Visual Assets', 'Social Media Kits']
    },
    'advertising-brand': {
        title: 'Advertising & Brand',
        icon: 'fas fa-bullhorn',
        tagline: 'Digital identity strategy and programmatic reach.',
        description: 'In a crowded market, visibility is currency. We align your brand identity with data-driven advertising campaigns that target your ideal customer with surgical precision.',
        features: ['Brand Identity Design', 'Programmatic Ad Buying', 'SEO & Content Strategy', 'Social Media Intelligence']
    },
    'mobile-app-development': {
        title: 'Mobile App Development',
        icon: 'fas fa-mobile-alt',
        tagline: 'Native and Cross-platform iOS and Android solutions.',
        description: 'Put your business in your customer’s pocket. We build performant, offline-capable mobile applications using React Native and Swift that feel seamless and native.',
        features: ['iOS & Android Development', 'React Native / Flutter', 'App Store Optimization', 'Mobile Payment Integration']
    },
    'desktop-applications': {
        title: 'Desktop Applications',
        icon: 'fas fa-desktop',
        tagline: 'High-performance software for Windows, macOS, and Linux.',
        description: 'For power users and complex workflows, the browser isn’t always enough. We build robust desktop applications using Electron and C++ that leverage the full power of the hardware.',
        features: ['Cross-Platform Development', 'Offline Functionality', 'Hardware Integration', 'Legacy System Modernization']
    },
    'vr-development': {
        title: 'VR Development',
        icon: 'fas fa-vr-cardboard',
        tagline: 'Immersive experiences for training and simulation.',
        description: 'Step into the next dimension of interaction. We build VR and AR applications for industrial training, architectural visualization, and immersive brand storytelling.',
        features: ['Unity & Unreal Engine', '3D Modeling & Animation', 'Immersive Training Sims', 'WebXR Experiences']
    },
    'automation-consulting': {
        title: 'Automation Consulting',
        icon: 'fas fa-cogs',
        tagline: 'Workflow optimization and AI agent integration.',
        description: 'Stop wasting human potential on robotic tasks. We analyze your operational bottlenecks and deploy AI agents and script-based automations to recapture thousands of hours of productivity.',
        features: ['Workflow Analysis', 'RPA (Robotic Process Automation)', 'Custom AI Agents', 'API Integration']
    },
    'business-software': {
        title: 'Business Software Development',
        icon: 'fas fa-briefcase',
        tagline: 'Custom ERP, CRM, and internal tooling.',
        description: 'Off-the-shelf software rarely fits perfectly. We build bespoke internal tools that map exactly to your unique business processes, eliminating workarounds and spreadsheet chaos.',
        features: ['Custom CRM/ERP', 'Inventory Management', 'Employee Portals', 'Data Dashboards']
    },
    'cybersecurity': {
        title: 'Cybersecurity',
        icon: 'fas fa-shield-alt',
        tagline: 'Enterprise-grade protection and compliance.',
        description: 'Protect your assets and your reputation. We provide comprehensive security audits, penetration testing, and compliance implementation (SOC2, GDPR) to ensure your data stays yours.',
        features: ['Penetration Testing', 'Security Audits', 'Compliance (SOC2/HIPAA)', 'Encryption Standards']
    },
    'data-analytics': {
        title: 'Data Analytics',
        icon: 'fas fa-chart-line',
        tagline: 'Business Intelligence and Predictive Modeling.',
        description: 'Turn raw data into actionable insights. We build data warehouses and visualization dashboards that help leadership make evidence-based decisions in real-time.',
        features: ['Data Warehousing', 'PowerBI / Tableau', 'Predictive Modeling', 'ETL Pipelines']
    },
    'wcag-compliance': {
        title: 'Accessibility (WCAG)',
        icon: 'fas fa-universal-access',
        tagline: 'Inclusive digital experiences for everyone.',
        description: 'Ensure your digital products are accessible to all users, complying with WCAG 2.1 AA standards and ADA regulations. We audit, remediate, and monitor your platforms.',
        features: ['Audit & Remediation', 'VPAT Creation', 'Screen Reader Testing', 'Compliance Monitoring']
    }
};

// =================================================================
// 4. LEGAL DATA STORE
// =================================================================
const legalDocs = {
    'privacy': {
        title: 'Privacy Policy',
        date: 'Effective: January 1, 2025',
        content: `Shine More Online ("we", "us", or "our") operates the website and provides software development services. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service. We use your data to provide and improve the Service. By using the Service, you agree to the collection and use of information in accordance with this policy. We collect several different types of information for various purposes to provide and improve our Service to you, including Personal Data (Email, Name, Phone) and Usage Data. We maintain appropriate technical and organizational measures to protect your data.`
    },
    'terms': {
        title: 'Terms of Service',
        date: 'Effective: January 1, 2025',
        content: `Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the Shine More Online website. Your access to and use of the Service is conditioned on your acceptance of and compliance with these Terms. These Terms apply to all visitors, users, and others who access or use the Service. By accessing or using the Service you agree to be bound by these Terms. If you disagree with any part of the terms then you may not access the Service. Intellectual Property: The Service and its original content, features, and functionality are and will remain the exclusive property of Shine More Online and its licensors.`
    },
    'cookies': {
        title: 'Cookie Policy',
        date: 'Effective: January 1, 2025',
        content: `We use cookies and similar tracking technologies to track the activity on our Service and hold certain information. Cookies are files with small amount of data which may include an anonymous unique identifier. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service. Examples of Cookies we use: Session Cookies (to operate our Service), Preference Cookies (to remember your preferences), and Security Cookies.`
    },
    'sla': {
        title: 'Service Level Agreement',
        date: 'Effective: January 1, 2025',
        content: `This Service Level Agreement (SLA) describes the levels of service that Shine More Online ("Provider") will provide to the Customer. 1. Uptime Commitment: For Managed Hosting clients, we guarantee a monthly uptime of 99.9%. 2. Response Times: Critical issues (System Down) will receive a response within 1 hour (24/7). High priority issues within 4 hours. Normal priority within 24 hours. 3. Maintenance: Scheduled maintenance will be communicated at least 48 hours in advance. Emergency maintenance may be performed at any time to ensure security and stability.`
    },
    'dpa': {
        title: 'Data Processing Agreement',
        date: 'Effective: January 1, 2025',
        content: `This Data Processing Agreement ("DPA") reflects the parties' agreement with respect to the processing of personal data. Shine More Online acts as a Data Processor for the Client (Data Controller). We shall process Personal Data only on documented instructions from the Controller. We ensure that persons authorized to process the personal data have committed themselves to confidentiality or are under an appropriate statutory obligation of confidentiality.`
    }
};

// =================================================================
// 5. ROUTES
// =================================================================

app.get('/', (req, res) => {
    res.render('index', { title: 'New world | Better outcomes' });
});

app.get('/services', (req, res) => {
    res.render('services', { title: 'Our Services' });
});

// Dynamic Route for Individual Services
app.get('/services/:slug', (req, res) => {
    const service = servicesData[req.params.slug];
    if (service) {
        res.render('service-detail', { 
            title: `${service.title} | Shine More`, 
            service: service,
            currentSlug: req.params.slug 
        });
    } else {
        res.redirect('/services');
    }
});

app.get('/portfolio', (req, res) => {
    res.render('portfolio', { title: 'Case Studies' });
});

app.get('/about', (req, res) => {
    res.render('about', { title: 'About Us' });
});

// --- NEW/UPDATED ROUTES ---

app.get('/careers', (req, res) => {
    res.render('careers', { title: 'Careers | Shine More' });
});

// Press now points to Blog template
app.get('/press', (req, res) => {
    res.render('blog', { title: 'Press & Insights | Shine More' });
});

// Status is generic
app.get('/status', (req, res) => {
    res.render('generic', { title: 'System Status', subtitle: 'All systems operational (99.99% Uptime).' });
});

// Support now uses the support template
app.get('/support', (req, res) => {
    res.render('support', { title: 'Support Portal | Shine More' });
});

// Legal Routes
Object.keys(legalDocs).forEach(key => {
    app.get(`/${key}`, (req, res) => {
        res.render('legal', { doc: legalDocs[key], title: legalDocs[key].title });
    });
});

// --- AUTH ROUTES ---

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect dashboard.
    res.redirect('/dashboard');
  });

// Login Page
app.get('/login', (req, res) => {
    if (req.user) return res.redirect('/dashboard');
    res.render('login', { title: 'Login | Shine More' });
});

// Login Logic (Secure)
app.post('/login', passport.authenticate('local', { 
    successRedirect: '/dashboard',
    failureRedirect: '/login?error=Invalid Credentials'
}));

// Dashboard (Protected Route)
app.get('/dashboard', async (req, res) => {
    if (!req.user) {
        return res.redirect('/login');
    }

    try {
        const userId = req.user.id;
        
        // Fetch Projects for this specific user from DB
        const projectResult = await pool.query(
            'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC', 
            [userId]
        );

        res.render('dashboard', { 
            title: 'Dashboard | Shine More', 
            user: req.user,
            projects: projectResult.rows
        });
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

// Logout
app.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

// --- CONTACT & PROJECT CREATION ROUTES ---

app.get('/contact', (req, res) => {
    res.render('contact', { title: 'Start Project | Shine More' });
});

// --- MISSING HEADER/FOOTER ROUTES ---

// Redirect /account to /dashboard
app.get('/account', (req, res) => {
    res.redirect('/dashboard');
});

// Map /projects to the existing portfolio page
// 2. Projects Route
app.get('/projects', (req, res) => {
    // If you ever decide to load dynamic projects from DB, you would query here.
    // For now, projects.ejs is static, so we just render it.
    res.render('projects', { 
        title: 'Project Archive | Future Music Collective',
        // If projects.ejs DOES use a loop, uncomment the next line and pass an empty array to prevent crash
        // projects: [] 
    });
});

// Add routes for Music, Merch, Rights, Advocacy, Cart
// Ensure you have music.ejs, merch.ejs, etc., or point these to 'generic'
// 3. Music (Fetches 'digital' products from DB)
app.get('/music', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM products WHERE type = 'digital' ORDER BY created_at DESC"
        );
        
        // Transform the DB rows to match what the template expects
        // Your template expects 'youtube_info' inside the object, which is inside 'metadata' in your DB
        const songs = result.rows.map(row => {
            let metadata = {};
            if (typeof row.metadata === 'string') {
                try { metadata = JSON.parse(row.metadata); } catch(e) { console.error('Error parsing metadata', e); }
            } else {
                metadata = row.metadata || {};
            }

            return {
                ...row,
                youtube_info: metadata.youtube_info || {},
                spotify_id: metadata.spotify_id || '',
                album: metadata.album || ''
            };
        });

        res.render('music', { 
            title: 'Music | Future Music Collective',
            songs: songs 
        });
    } catch (err) {
        console.error("Error fetching music:", err);
        res.status(500).send("Database Error: " + err.message);
    }
});

// 5. Merch (Fetches physical products)
app.get('/merch', async (req, res) => {
    try {
        let queryStr = "SELECT * FROM products WHERE type != 'digital'";
        const values = [];
        
        // Filter by Type (if selected)
        if (req.query.type && req.query.type !== 'all') {
            values.push(req.query.type);
            queryStr += ` AND type = $${values.length}`;
        }

        // Sorting Logic
        if (req.query.sort === 'price_asc') {
            queryStr += " ORDER BY CAST(price AS DECIMAL) ASC";
        } else if (req.query.sort === 'price_desc') {
            queryStr += " ORDER BY CAST(price AS DECIMAL) DESC";
        } else {
            queryStr += " ORDER BY created_at DESC"; // Default: Newest first
        }

        const result = await pool.query(queryStr, values);

        res.render('merch', { 
            title: 'Merch | Future Music Collective',
            merch: result.rows,
            query: req.query,
            debugError: null
        });

    } catch (err) {
        console.error("Error fetching merch:", err);
        // Render with empty list so page doesn't crash, but show error
        res.render('merch', { 
            title: 'Merch | Future Music Collective',
            merch: [], 
            query: req.query,
            debugError: err.message 
        });
    }
});


// 4. Rights (Fetches songs for dropdown)
app.get('/rights', async (req, res) => {
    try {
        // Reuse the same logic to get songs
        const result = await pool.query(
            "SELECT * FROM products WHERE type = 'digital' ORDER BY name ASC"
        );
        
        const songs = result.rows.map(row => {
            let metadata = {};
            if (typeof row.metadata === 'string') {
                try { metadata = JSON.parse(row.metadata); } catch(e) {}
            } else {
                metadata = row.metadata || {};
            }
            return {
                ...row,
                youtube_info: metadata.youtube_info || {},
                spotify_id: metadata.spotify_id || ''
            };
        });

        res.render('rights', { 
            title: 'Rights & Royalties',
            songs: songs
        });
    } catch (err) {
        console.error("Error fetching songs for rights:", err);
        res.status(500).send("Database Error");
    }
});

app.get('/song/:id', async (req, res) => {
    try {
        // Search by SKU (which seems to hold your Video ID based on the JSON) or ID
        const result = await pool.query(
            "SELECT * FROM products WHERE sku = $1 OR id = $1", 
            [req.params.id]
        );

        if (result.rows.length > 0) {
            const song = result.rows[0];
            // Parse metadata
            let metadata = {};
            try { metadata = JSON.parse(song.metadata); } catch(e) {}
            song.youtube_info = metadata.youtube_info || {};
            song.album = metadata.album || '';

            res.render('song', { title: song.name, song: song });
        } else {
            res.status(404).render('404', { title: 'Song Not Found' });
        }
    } catch (err) {
        res.status(500).send("Error: " + err.message);
    }
});

app.get('/advocacy', (req, res) => {
    res.render('advocacy', { title: 'Advocacy' });
});

app.get('/cart', (req, res) => {
    res.render('cart', { title: 'Your Cart' });
});

// Handle New Project + Account Creation
app.post('/contact', async (req, res) => {
    const { fullName, email, password, phone, organization, projectType, serviceTier, projectDesc, features, enable2FA } = req.body;
    
    // SAFEGUARD: Ensure we have valid numbers to prevent SQL NaN errors
    const baseCost = parseFloat(projectType) || 0;
    const monthlyCost = parseFloat(serviceTier) || 0;
    const estimatedDeposit = baseCost * 0.10;

    // Convert features array to JSON for DB (Safe fallback)
    const featuresJson = JSON.stringify(features || []);
    
    // Start a Transaction (All or Nothing)
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        let userId;
        let currentUser;

        // 1. Check if logged in OR user exists
        if (req.user) {
            userId = req.user.id;
            currentUser = req.user;
        } else {
            // Check for existing user by email
            const userCheck = await client.query('SELECT * FROM users WHERE email = $1', [email]);
            
            if (userCheck.rows.length > 0) {
                // User exists - ideally we force login here, but for this flow we associate
                userId = userCheck.rows[0].id;
                currentUser = userCheck.rows[0];
            } else {
                // Create New User
                const saltRounds = 12; // Stronger hashing
                // Fallback password if not provided (e.g. simple contact form usage)
                const safePassword = password || 'tempPass' + Math.random().toString(36).slice(-8);
                const hash = await bcrypt.hash(safePassword, saltRounds);
                
                // 2FA Secret generation (placeholder)
                const twoFactorSecret = enable2FA ? 'MOCK_SECRET_KEY_123' : null;

                const newUser = await client.query(
                    `INSERT INTO users (full_name, email, password_hash, phone_number, organization, two_factor_secret) 
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                    [fullName, email, hash, phone, organization, twoFactorSecret]
                );
                userId = newUser.rows[0].id;
                currentUser = newUser.rows[0];
                
                // CRITICAL FIX: Manually log them in for this session using helper
                // This awaits the login process to ensure session is saved before redirect
                await loginUser(req, currentUser);
            }
        }

        // 2. Create Project
        const newProject = await client.query(
            `INSERT INTO projects 
            (user_id, project_type, service_tier, base_cost, monthly_cost, estimated_deposit, description, features_json) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [userId, 'Custom Project', serviceTier, baseCost, monthlyCost, estimatedDeposit, projectDesc, featuresJson]
        );

        // 3. Create Transaction (Pending)
        await client.query(
            `INSERT INTO transactions (project_id, user_id, amount, status, payment_type)
             VALUES ($1, $2, $3, 'pending', 'deposit')`,
            [newProject.rows[0].id, userId, estimatedDeposit]
        );

        await client.query('COMMIT');

        // Redirect to Stripe Checkout (Simulated)
        // In real app: create Stripe Session here and redirect to session.url
        res.redirect('/dashboard?status=deposit_pending');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error("CRITICAL ERROR IN /contact:", e);
        res.status(500).send(`
            <h1>Service Unavailable</h1>
            <p>We encountered an error processing your request.</p>
            <pre style="background:#eee; padding:10px;">Error Details: ${e.message}</pre>
            <p><a href="/contact">Go Back</a></p>
        `);
    } finally {
        client.release();
    }
});

// =================================================================
// 6. 404 ERROR HANDLER (MUST BE LAST ROUTE)
// =================================================================
app.use((req, res, next) => {
    res.status(404).render('404', { title: 'Page Not Found' });
});

// 5. Port Configuration
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});