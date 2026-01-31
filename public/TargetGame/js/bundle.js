
// ==========================================
// START OF js/constants.js
// ==========================================

const CONFIG = {
    // CHANGE THIS to your production URL when deploying live (e.g. 'https://your-app.com')
    API_BASE_URL: 'https://futuremusic.online', 

    TOTAL_LEVELS: 20,
    BASE_WIN_SCORE: 500,
    SCORE_INC_PER_LEVEL: 25,
    BASE_SPAWN_RATE_MS: 1500,
   SPAWN_RATE_INC_PCT: 0.02, // CHANGED: 2% faster per level (was 0.03)
    LEVEL_TIME_SEC: 180, 

    // NEW: Spawn Rates from CSV (Green, Blue, Red, Gold, Orange)
    LEVEL_WEIGHTS: [
        { level: 1,  green: 50, blue: 20, red: 20, gold: 10, orange: 0 },
        { level: 2,  green: 46, blue: 21, red: 21, gold: 11, orange: 1 },
        { level: 3,  green: 42, blue: 22, red: 22, gold: 12, orange: 2 },
        { level: 4,  green: 38, blue: 23, red: 23, gold: 13, orange: 3 },
        { level: 5,  green: 34, blue: 24, red: 24, gold: 14, orange: 4 },
        { level: 6,  green: 30, blue: 25, red: 25, gold: 15, orange: 5 },
        { level: 7,  green: 26, blue: 26, red: 26, gold: 16, orange: 6 },
        { level: 8,  green: 25, blue: 25, red: 25, gold: 18, orange: 7 },
        { level: 9,  green: 24, blue: 24, red: 24, gold: 19, orange: 9 },
        { level: 10, green: 24, blue: 24, red: 24, gold: 18, orange: 10 },
        { level: 11, green: 23, blue: 24, red: 24, gold: 17, orange: 11 },
        { level: 12, green: 22, blue: 24, red: 24, gold: 16, orange: 12 },
        { level: 13, green: 21, blue: 24, red: 24, gold: 15, orange: 13 },
        { level: 14, green: 20, blue: 24, red: 24, gold: 14, orange: 14 },
        { level: 15, green: 19, blue: 24, red: 24, gold: 13, orange: 15 },
        { level: 16, green: 18, blue: 24, red: 24, gold: 12, orange: 16 },
        { level: 17, green: 17, blue: 24, red: 24, gold: 11, orange: 17 },
        { level: 18, green: 16, blue: 24, red: 24, gold: 10, orange: 18 },
        { level: 19, green: 15, blue: 24, red: 24, gold: 9,  orange: 19 },
        { level: 20, green: 14, blue: 24, red: 24, gold: 8,  orange: 20 }
    ],

    // Target Configurations
    TARGETS: {
        GREEN: { type: 'green', hp: 1, points: 10, mechanic: 'tap' },
        BLUE:  { type: 'blue',  hp: 2, points: 15, mechanic: 'double_tap' },
        RED:   { type: 'red',   hp: 1, points: 20, mechanic: 'slice' },
        ORANGE:{ type: 'orange',hp: 1, points: 25, mechanic: 'circle' },
        GOLD:  { type: 'gold',  hp: 1, points: 100,mechanic: 'drag' }
    },

    // Powerups
    POWERUPS: {
        HOURGLASS: { type: 'hourglass', duration: 0, text: "SLOW MOTION!" }, 
        BOMB:      { type: 'bomb', duration: 0, text: "BOOM!" },
        STAR:      { type: 'star', duration: 10000, text: "STAR POWER!" }
    },

    // Lifecycle (ms)
    FADE_IN_MIN: 500,
    FADE_IN_MAX: 3000,
    STAY_MIN: 4000,
    STAY_MAX: 6000,
    FADE_OUT: 1000,
    
    // Ads
    AD_INTERVAL_HALF: 90, // Show ad at 90 seconds remaining (halfway of 180)
    
 IMAGES: [
        'green_solid.png', 'green_broken.png',
        'blue_solid.png', 'blue_broken.png',
        'red_solid.png', 'red_broken.png',
        'orange_solid.png', 'orange_broken.png',
        'gold_solid.png', 'gold_broken.png',
        'hourglass.png', 'bomb.png', 'star.png', 'star_active.png',
        'chest.png',
        'bg1.jpg', 'bg2.jpg', 'bg3.jpg', 'bg4.jpg', 'bg5.jpg',
        'bg6.jpg', 'bg7.jpg', 'bg8.jpg', 'bg9.jpg', 'bg10.jpg',
        'bg11.jpg', 'bg12.jpg', 'bg13.jpg', 'bg14.jpg', 'bg15.jpg',
        'bg16.jpg', 'bg17.jpg', 'bg18.jpg', 'bg19.jpg', 'bg20.jpg'
    ],
    
    BACKGROUNDS: [
        'bg1.jpg', 'bg2.jpg', 'bg3.jpg', 'bg4.jpg', 'bg5.jpg',
        'bg6.jpg', 'bg7.jpg', 'bg8.jpg', 'bg9.jpg', 'bg10.jpg',
        'bg11.jpg', 'bg12.jpg', 'bg13.jpg', 'bg14.jpg', 'bg15.jpg',
        'bg16.jpg', 'bg17.jpg', 'bg18.jpg', 'bg19.jpg', 'bg20.jpg'
    ],
    // Add your exact MP3 filenames here (Browser cannot guess them)
    SOUNDTRACK: [
        'track1.mp3', 
        'track2.mp3', 
        'track3.mp3',
        'track4.mp3',
        'track5.mp3'
    ]
};
// Global state container
const STATE = {
    images: {},
    audio: {},
    userId: null, // Track logged in user ID
    hasRemovedAds: false,
    maxUnlockedLevel: 1 // Start with only Level 1
};

// ==========================================
// START OF js/ad_manager.js
// ==========================================

class AdManager {
  constructor(gameInstance) {
        this.game = gameInstance;
        this.overlay = document.getElementById('ad-overlay');
        
        // Containers
        this.googleContainer = document.getElementById('google-ad-container');
        this.videoContainer = document.getElementById('video-ad-container');
        
        // Video Elements
        this.videoPlayer = document.getElementById('ad-video-player');
        this.videoCountdown = document.getElementById('video-countdown');
        this.videoCloseBtn = document.getElementById('video-close-btn');
        this.googleTimer = document.getElementById('google-ad-timer');

        this.currentLink = null;
        this.isAdPlaying = false;

        // Setup Video Click Listener
        this.videoPlayer.addEventListener('click', () => {
            if (this.currentLink) {
                window.open(this.currentLink, '_blank');
            }
        });

        // Setup Close Button
        this.videoCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent video click
            this.closeAd();
        });

        // SAFETY: Handle Video Errors (500 Error, 404, Decode Error)
        // If video fails, immediately show Close button so game doesn't freeze
        this.videoPlayer.addEventListener('error', (e) => {
            console.warn("Ad Failed to Load (Error 500/404). Showing Close Button.");
            this.videoCloseBtn.classList.remove('hidden');
            this.videoCountdown.innerText = "Skip";
        });
        
        // SAFETY: Handle Stalled Video (Connection drops)
        this.videoPlayer.addEventListener('stalled', () => {
             // If stalled for too long, button is available
             this.videoCloseBtn.classList.remove('hidden');
        });

        // Video Events
        this.videoPlayer.addEventListener('timeupdate', () => {
            const currentTime = this.videoPlayer.currentTime;
            
            // Logic: Countdown strictly from 30 seconds
            let left = Math.ceil(30 - currentTime);
            if (left < 0) left = 0;
            
            this.videoCountdown.innerText = left + "s";

            // Logic: If user has watched 30s, show close button
            if (currentTime >= 30) {
                this.videoCloseBtn.classList.remove('hidden');
            }
        });
        
        this.videoPlayer.addEventListener('ended', () => {
            this.videoCloseBtn.classList.remove('hidden');
        });
    }


    shouldShowAd() {
        if (STATE.hasRemovedAds) return false;
        return true;
    }

 triggerAd(callback) {
        if (!this.shouldShowAd()) {
            if (callback) callback();
            return;
        }

        this.game.pause();
        this.overlay.classList.remove('hidden');
        this.isAdPlaying = true;
        this.onAdComplete = callback;

        // Reset UI
        this.googleContainer.classList.add('hidden');
        this.videoContainer.classList.add('hidden');
        this.videoCloseBtn.classList.add('hidden');

        // Logic: CHANGED - 3-Way Split Video Ads
        const rand = Math.random();

        if (rand < 0.33) {
            this.playVideoAd('cohabisafe');
        } else if (rand < 0.66) {
            this.playVideoAd('merch');
        } else {
            this.playVideoAd('colorization');
        }
    }

    playGoogleAd() {
        this.googleContainer.classList.remove('hidden');
        
        // Refresh AdSense slot (Requires existing ins tag in HTML)
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch(e) { console.log("AdSense error", e); }

        // Simulate 5s timer for Google Ad (since we can't detect closure easily on web)
        let timeLeft = 5;
        this.googleTimer.innerText = `Close in ${timeLeft}s...`;
        
        const gInterval = setInterval(() => {
            timeLeft--;
            this.googleTimer.innerText = `Close in ${timeLeft}s...`;
            if (timeLeft <= 0) {
                clearInterval(gInterval);
                this.googleTimer.innerHTML = "<button onclick='window.gameInstance.adManager.closeAd()' style='padding:5px 10px; background:red; color:white; border:1px solid white; cursor:pointer;'>CLOSE X</button>";
            }
        }, 1000);
    }

  playVideoAd(type) {
        // FIX: Show container BEFORE loading source to prevent browser optimization issues
        this.videoContainer.classList.remove('hidden');
        
        // Ensure close button is hidden at start, but show countdown
        this.videoCloseBtn.classList.add('hidden');
        this.videoCountdown.innerText = "30s"; 
        
        // Points to Server Route that handles GCS Signed URLs
        const baseAdUrl = `${CONFIG.API_BASE_URL}/api/ad-video/`;

        if (type === 'cohabisafe') {
            this.videoPlayer.src = baseAdUrl + 'cohabisafe.mp4';
            this.currentLink = 'https://www.cohabisafe.com';
        } else if (type === 'merch') {
            this.videoPlayer.src = baseAdUrl + 'merch.mp4';
            this.currentLink = 'https://futuremusic.online/merch';
        } else if (type === 'colorization') {
            if (window.innerWidth <= 768) {
                this.videoPlayer.src = baseAdUrl + 'colorization_mobile.mp4';
            } else {
                this.videoPlayer.src = baseAdUrl + 'colorization_desktop.mp4';
            }
            this.currentLink = 'https://futuremusic.online/projects';
        }

        // FIX: Explicitly load to reset the element
        this.videoPlayer.load();

        // CHROME DESKTOP FIX: 
        // We must allow the browser to paint the overlay as "Visible" before attempting to play.
        // Wrapping the play logic in a timeout ensures the DOM is ready and prevents the freeze.
        setTimeout(() => {
            // Safety Timeout: If video doesn't start in 3 seconds, show close button
            // This prevents the game from freezing if the browser blocks the video
            const safetyTimer = setTimeout(() => {
                console.log("Ad safety timer triggered");
                this.videoCloseBtn.classList.remove('hidden');
                this.videoCountdown.innerText = "Skip";
            }, 3000);

            const playPromise = this.videoPlayer.play();

            if (playPromise !== undefined) {
                playPromise.then(_ => {
                    // Video playback started, cancel safety timer
                    clearTimeout(safetyTimer);
                })
                .catch(error => {
                    console.error("Ad Playback Error:", error);
                    // CRITICAL FIX: If 500/404 Error or NotSupportedError (Autoplay block) happens, 
                    // show Close immediately so game doesn't freeze.
                    clearTimeout(safetyTimer);
                    this.videoCloseBtn.classList.remove('hidden');
                    this.videoCountdown.innerText = "Tap X";
                });
            }
        }, 150); // 150ms delay to ensure Chrome paints the element as visible
    }


 closeAd() {
        this.videoPlayer.pause();
        this.videoPlayer.src = ""; // Unload video
        this.videoPlayer.load();   // Force browser to drop the resource connection
        
        this.overlay.classList.add('hidden');
        this.googleContainer.classList.add('hidden'); // Ensure Google container is also hidden
        this.videoContainer.classList.add('hidden');  // Ensure Video container is also hidden
        
        this.isAdPlaying = false;
        
        if (this.onAdComplete) {
            this.onAdComplete();
            this.onAdComplete = null;
        } else {
            this.game.resume();
        }
    }

    buyNoAds() {
        // Redirect to website purchase page
        if(confirm("To remove ads, please visit FutureMusic.online. You will be redirected to the account page.")) {
            window.open('https://www.futuremusic.online/account', '_blank');
        }
    }
}

// ==========================================
// START OF js/entities.js
// ==========================================

class Entity {
    constructor(x, y, type, levelSpeedMult = 1) {
        this.x = x;
        this.y = y;
        this.width = 80;
        this.height = 80;
        this.alpha = 0;
        this.state = 'spawning'; // spawning, active, dying, dead
        this.spawnTimer = 0;
        this.lifeTimer = 0;
        this.dieTimer = 0;
        
        // Randomize timings, affected by Level Difficulty (faster levels = shorter stay)
        this.fadeInTime = Math.random() * (CONFIG.FADE_IN_MAX - CONFIG.FADE_IN_MIN) + CONFIG.FADE_IN_MIN;
        
        const baseStay = Math.random() * (CONFIG.STAY_MAX - CONFIG.STAY_MIN) + CONFIG.STAY_MIN;
        this.stayTime = baseStay / levelSpeedMult; // Reduces stay time as level increases

        this.fadeOutTime = CONFIG.FADE_OUT;
        this.scale = 1.0; // Added for Star growth effect
    }

    update(dt, speedMultiplier) {
        // Hourglass effect modifies dt or timers
        const effectiveDt = dt * speedMultiplier;

        if (this.state === 'spawning') {
            this.spawnTimer += effectiveDt;
            this.alpha = Math.min(1, this.spawnTimer / this.fadeInTime);
            if (this.spawnTimer >= this.fadeInTime) {
                this.state = 'active';
                this.alpha = 1;
            }
        } else if (this.state === 'active') {
            this.lifeTimer += effectiveDt;
            if (this.lifeTimer >= this.stayTime && !this.isDragging) {
                this.state = 'dying';
            }
        } else if (this.state === 'dying') {
            this.dieTimer += effectiveDt;
            this.alpha = 1 - (this.dieTimer / this.fadeOutTime);
            
            // NEW: If this is a broken star, grow while fading
            if (this.isStarBreak) {
                this.scale += (2.0 * effectiveDt / 1000); // Grow fast
            }

            if (this.dieTimer >= this.fadeOutTime) {
                this.state = 'dead';
            }
        }
    }

draw(ctx, imgSolid) {
        ctx.globalAlpha = this.alpha;
        
        // Apply Scale (for Star Effect)
        const currentW = this.width * this.scale;
        const currentH = this.height * this.scale;

        const drawX = Math.floor(this.x - currentW/2);
        const drawY = Math.floor(this.y - currentH/2);
        const drawW = Math.floor(currentW);
        const drawH = Math.floor(currentH);

        if(imgSolid && imgSolid.complete && imgSolid.naturalHeight !== 0) {
            ctx.drawImage(imgSolid, drawX, drawY, drawW, drawH);
        } else {
            ctx.fillStyle = this.def ? this.def.type : 'grey';
            ctx.fillRect(drawX, drawY, drawW, drawH);
        }
        ctx.globalAlpha = 1;
    }

    // Simple box collision for taps
    contains(x, y) {
        if(this.state === 'dead' || this.state === 'dying') return false;
        return x >= this.x - this.width/2 && x <= this.x + this.width/2 &&
               y >= this.y - this.height/2 && y <= this.y + this.height/2;
    }
}

class Target extends Entity {
 constructor(x, y, definition, levelSpeedMult = 1) {
        super(x, y, null, levelSpeedMult); // Pass multiplier to Entity
        this.def = definition;
        this.isDragging = false;
        this.broken = false;
        this.isStarBreak = false; // Flag for effect

        // ORIGINAL BASE WAS 88. 
        // REQUEST: "About 10% bigger". New Base = 98.
        // NEW REQUEST: 15% smaller on mobile only.
        let base = 98; 
        
        // Mobile check (standard breakpoint)
        if (window.innerWidth <= 768) {
            base = 98 * 0.85; // Reduce by 15%
        }
        
        if (this.def.type === 'green') {
            this.width = base * 1.10; this.height = base * 1.10;
        } else if (this.def.type === 'blue') {
            this.width = base * 1.20; this.height = base * 1.20;
        } else if (this.def.type === 'gold') {
            this.width = base * 1.05; this.height = base * 1.05;
        } else if (this.def.type === 'orange') {
            this.width = base * 1.30; this.height = base * 1.30;
        } else if (this.def.type === 'red') {
            this.width = base * 1.25; this.height = base * 1.25;
        }
    }
    
    break() {
        this.broken = true;
        // Check if it's a star for visual effect
        if (this.def.type === 'star_active') {
            this.isStarBreak = true;
        }
        this.state = 'dying'; 
        this.dieTimer = 0; 
    }
}

class PowerUp extends Entity {
    constructor(x, y, definition) {
        super(x, y);
        this.def = definition;
        this.width = 60;
        this.height = 60;
    }
}

// Circular wave effect
class Ripple {
    constructor(x, y, color, maxRadius = 80) { // Added maxRadius param
        this.x = x;
        this.y = y;
        this.color = color || 'white';
        this.radius = 0;
        this.alpha = 1;
        this.maxRadius = maxRadius; // Use param
        this.speed = 150; 
    }
    
    update(dt) {
        this.radius += this.speed * (dt/1000);
        this.alpha -= (1.5 * dt/1000); 
    }
    
    draw(ctx) {
        if(this.alpha <= 0) return;
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
        ctx.strokeStyle = this.color; 
        ctx.globalAlpha = this.alpha;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
    }
}

// Drag line effect
class Trail {
    constructor(color) {
        this.points = [];
        this.color = color || 'white';
        this.lifeTime = 3000; // 3 seconds fade
    }

    addPoint(x, y) {
        this.points.push({ x: x, y: y, life: this.lifeTime });
    }

    update(dt) {
        for(let i=0; i<this.points.length; i++) {
            this.points[i].life -= dt;
        }
        this.points = this.points.filter(p => p.life > 0);
    }

    draw(ctx) {
        if (this.points.length < 2) return;
        
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 5;

        for (let i = 0; i < this.points.length - 1; i++) {
            const p1 = this.points[i];
            const p2 = this.points[i+1];
            
            // Calculate opacity based on life of the point
            const alpha = Math.max(0, p1.life / this.lifeTime);
            
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = this.color; 
            ctx.globalAlpha = alpha;
            ctx.stroke();
        }
        ctx.restore();
    }
}

class FloatingText {
    constructor(x, y, text) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.life = 1200; 
        this.timer = 0;
        
        // Determine scale/color based on point value
        this.baseScale = 1.0;
        this.color = '#FFD700'; // Default Gold

        // If it is a number, apply logic
        if (!isNaN(text)) {
            const val = parseInt(text);
            if (val >= 100) {
                this.baseScale = 2.0;
                this.color = '#FF4500'; // OrangeRed for huge points
                this.text = "+" + val;
            } else if (val >= 50) {
                this.baseScale = 1.5;
                this.color = '#00FF00'; // Green for good points
                this.text = "+" + val;
            } else {
                this.text = "+" + val;
            }
        }
        
        this.scale = 0.5;
    }

    update(dt) {
        this.timer += dt;
        this.y -= (80 * dt/1000); // Float up faster
        
        // Pop animation logic (grow quickly then settle)
        if (this.timer < 200) {
            // Grow to baseScale * 1.5
            this.scale = 0.5 + (this.timer / 200) * (this.baseScale * 1.5 - 0.5); 
        } else {
            // Shrink back to baseScale
            this.scale = (this.baseScale * 1.5) - ((this.timer - 200) / 1000) * 0.5; 
        }
    }

    draw(ctx) {
        const alpha = 1 - Math.pow(this.timer / this.life, 3); // Ease out fade
        if(alpha <= 0) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale); // Apply pop scale
        
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color; 
        ctx.font = '900 32px "Segoe UI", Arial, sans-serif'; 
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;
        ctx.textAlign = 'center';
        
        ctx.strokeText(this.text, 0, 0);
        ctx.fillText(this.text, 0, 0);
        ctx.restore();
    }
}
class ShootingStar extends Entity {
    constructor(canvasWidth, canvasHeight) {
        super(0, 0);
        this.width = 60;
        this.height = 60;
        // Start from left, move to right
        this.x = -50;
        this.y = Math.random() * (canvasHeight * 0.5); // Top half of screen
        
        // CHANGED: 30% Slower (Original 800+rand400 -> New 560+rand280)
        this.vx = 560 + Math.random() * 280; 
        this.vy = 100 + Math.random() * 100; // Slight downward angle
        
        this.state = 'active'; 
        this.alpha = 1;
    }

    update(dt) {
        // Move across screen
        this.x += this.vx * (dt / 1000);
        this.y += this.vy * (dt / 1000);

        // If goes off screen right, kill it
        if (this.x > window.innerWidth + 100 || this.y > window.innerHeight + 100) {
            this.state = 'dead';
        }
    }
    
    // Override draw to use a specific star image or shape
    draw(ctx, img) {
        // We will pass the 'star.png' or similar from Game class, or draw a glowing trail here
        ctx.save();
        ctx.translate(this.x, this.y);
        // Rotate based on movement
        ctx.rotate(Math.atan2(this.vy, this.vx));
        
        // Draw tail
        ctx.beginPath();
        ctx.moveTo(-40, 0);
        ctx.lineTo(0, 0);
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Draw head (reuse star image logic in game.draw or simple circle)
        if(img) {
            ctx.drawImage(img, -20, -20, 40, 40);
        } else {
            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.restore();
    }
}

// ==========================================
// START OF js/input.js
// ==========================================

class InputHandler {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.game = game;
        this.activeTouches = new Map(); 
        this.doubleTapThreshold = 300; 
        this.lastTapTime = 0;
        this.lastTapTarget = null;
        
        this.targetColors = ['green', 'blue', 'red', 'orange', 'gold'];

        this.canvas.addEventListener('mousedown', this.onStart.bind(this));
        this.canvas.addEventListener('mousemove', this.onMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onEnd.bind(this));
        
        this.canvas.addEventListener('touchstart', this.onStart.bind(this), {passive: false});
        this.canvas.addEventListener('touchmove', this.onMove.bind(this), {passive: false});
        this.canvas.addEventListener('touchend', this.onEnd.bind(this), {passive: false});
    }

    getPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        let clientX, clientY;
        if(e.changedTouches) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

onStart(e) {
        e.preventDefault();
        const pos = this.getPos(e);
        
        // FIX: Correctly extract identifier for Touch events
        const id = e.changedTouches ? e.changedTouches[0].identifier : 'mouse';
        
        // Pick random color for this interaction
        const randColor = this.targetColors[Math.floor(Math.random() * this.targetColors.length)];

        // Create visual trail
        const trail = this.game.addTrail(randColor);
        trail.addPoint(pos.x, pos.y);

        this.activeTouches.set(id, {
            points: [pos], 
            startTime: Date.now(),
            target: this.game.hitTest(pos.x, pos.y),
            color: randColor,
            trail: trail
        });

        const touch = this.activeTouches.get(id);

        // Tap Logic / Drag Init
        if (touch.target) {
            if (touch.target.def.mechanic === 'drag') {
                touch.target.isDragging = true;
            }
        }
    }

 onMove(e) {
        e.preventDefault();
        const id = e.changedTouches ? e.changedTouches[0].identifier : 'mouse';
        if (!this.activeTouches.has(id)) return;

        const touch = this.activeTouches.get(id);
        const pos = this.getPos(e);
        touch.points.push(pos);
        
        // Update visual trail
        if (touch.trail) touch.trail.addPoint(pos.x, pos.y);

        // 1. Drag Logic
        if (touch.target && touch.target.isDragging) {
            touch.target.x = pos.x;
            touch.target.y = pos.y;
            if (touch.target.def.type === 'gold') {
                this.game.checkDragCollision(touch.target, touch.color);
            }
        }

        // 2. NEW: Shooting Star Line Collision
        // Check if this point touches any active ShootingStar
        this.game.targets.forEach(t => {
            if (t instanceof ShootingStar && t.state === 'active') {
                // Simple distance check (circle collision)
                const dx = t.x - pos.x;
                const dy = t.y - pos.y;
                // If distance is less than radius + margin (40px)
                if (Math.sqrt(dx*dx + dy*dy) < 40) {
                     // Manually trigger the "tap" handler for the star
                     this.handleTap(t.x, t.y, touch.color); 
                }
            }
        });

        // 3. Slice Logic (Red)
        if (touch.points.length > 2) {
             this.game.checkSlice(touch.points, touch.color);
        }
    }

 onEnd(e) {
        e.preventDefault();
        const id = e.changedTouches ? e.changedTouches[0].identifier : 'mouse';
        if (!this.activeTouches.has(id)) return;

        const touch = this.activeTouches.get(id);
        const endTime = Date.now();
        const duration = endTime - touch.startTime;
        const pos = this.getPos(e);

        // Drag Drop Logic (Gold)
        if (touch.target && touch.target.isDragging) {
            touch.target.isDragging = false;
            // We check one last time in case they released right over it
            this.game.checkDragCollision(touch.target, touch.color);
        } 
        // Circle Logic (Orange)
        else if (touch.points.length > 10) {
            this.game.checkCircle(touch.points, touch.color);
        }
        // Tap Logic
        else if (duration < 250 && touch.points.length < 10) {
            // It was a tap, show ripple now
            this.game.addRipple(pos.x, pos.y, touch.color);
            this.handleTap(pos.x, pos.y, touch.color);
        }

        this.activeTouches.delete(id);
    }

 handleTap(x, y, inputColor) {
        const target = this.game.hitTest(x, y);
        if (!target) return;

        const now = Date.now();
        
        // Shooting Star Logic
        if (target instanceof ShootingStar) {
            target.state = 'dead';
            this.game.score += 500;
            this.game.texts.push(new FloatingText(target.x, target.y, "FRENZY!"));
            this.game.shootingStarBonusTimer = 10000; // 10 seconds of 5x spawn
            this.game.playSfx('star.mp3'); // Or reuse star sound
            return;
        }

        // Star Logic
        if (this.game.starModeActive || target.def.type === 'star_active') {
            this.game.destroyTarget(target, true);
            return;
        }

        if (target instanceof PowerUp) {
            this.game.activatePowerup(target);
            return;
        }

        if (target.def.mechanic === 'tap') {
            this.game.destroyTarget(target);
        } 
        else if (target.def.mechanic === 'double_tap') {
            if (this.lastTapTarget === target && (now - this.lastTapTime) < this.doubleTapThreshold) {
                this.game.destroyTarget(target);
                this.lastTapTarget = null;
            } else {
                this.lastTapTarget = target;
                this.lastTapTime = now;
            }
        }
    }
}

// ==========================================
// START OF js/game.js
// ==========================================

class Game {
    constructor() {
        window.gameInstance = this; // <--- ADD THIS LINE
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.effectCanvas = document.getElementById('effect-canvas');
        this.effCtx = this.effectCanvas.getContext('2d');
        
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.input = new InputHandler(this.canvas, this);
        this.adManager = new AdManager(this);
        
        this.targets = [];
        this.ripples = [];
        this.trails = [];
        this.texts = []; // Floating Text
        this.score = 0;
        this.level = 1;
        this.timeLeft = 0;
        this.isRunning = false;
        this.lastTime = 0;
        this.spawnTimer = 0;
        
        // Powerup States
        this.speedMultiplier = 1;
        this.starModeActive = false;
        this.starModeTimer = 0;

        // UI Setup
        this.setupMenu();
        
        // Audio Setup
        this.musicMuted = false;
        this.sfxMuted = false;
        this.musicPlayer = new Audio();
        this.musicPlayer.loop = true; // Use loop for background
        
        // Setup Sound Button Listeners
        this.setupAudioControls();
        this.setupMenuSound();
    }

resize() {
    // Add a small timeout to allow mobile browsers to calculate new innerHeight after fullscreen transition
    setTimeout(() => {
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.effectCanvas.width = window.innerWidth * dpr;
        this.effectCanvas.height = window.innerHeight * dpr;

        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';
        this.effectCanvas.style.width = window.innerWidth + 'px';
        this.effectCanvas.style.height = window.innerHeight + 'px';

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);
        
        this.effCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.effCtx.scale(dpr, dpr);

        // Resolution Fix: Enable high quality smoothing
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }, 100);
}
 setupMenu() {
        // Load Saved Data
        const savedLevel = localStorage.getItem('maxUnlockedLevel');
        if (savedLevel) STATE.maxUnlockedLevel = parseInt(savedLevel);

        // Generate Level Buttons
        const container = document.getElementById('level-select');
        container.innerHTML = ''; 
        
        for(let i=1; i<=CONFIG.TOTAL_LEVELS; i++) {
            let card = document.createElement('div');
            card.className = 'lvl-card';
            
            // Background Image
            const bgImg = CONFIG.BACKGROUNDS[(i - 1) % CONFIG.BACKGROUNDS.length];
            card.style.backgroundImage = `url('images/${bgImg}')`;

            // Fancy Level Number
            let num = document.createElement('div');
            num.className = 'lvl-num';
            num.innerText = i;
            card.appendChild(num);

            // High Score Display
            let scoreVal = localStorage.getItem(`level_${i}_score`) || 0;
            let scoreDiv = document.createElement('div');
            scoreDiv.className = 'lvl-score';
            scoreDiv.innerText = `Best: ${scoreVal}`;
            card.appendChild(scoreDiv);
            
            if (i <= STATE.maxUnlockedLevel) {
                card.onclick = () => {
                     this.playMenuTone();
                     document.getElementById('level-select-screen').classList.add('hidden');
                     this.startLevel(i);
                };
            } else {
                card.classList.add('locked');
            }
            container.appendChild(card);
        }
        
        // Listeners
        document.getElementById('btn-show-levels').onclick = () => {
            document.getElementById('main-menu').classList.add('hidden');
            document.getElementById('level-select-screen').classList.remove('hidden');
        };

        document.getElementById('btn-back-menu').onclick = () => {
            document.getElementById('level-select-screen').classList.add('hidden');
            document.getElementById('main-menu').classList.remove('hidden');
        };

        // Logic change: Main menu "How to Play" sets flag so we return to menu
        document.getElementById('btn-how-to').onclick = () => {
             this.fromMenu = true; 
             document.getElementById('main-menu').classList.add('hidden');
             this.startTutorial();
        };
        
        document.getElementById('btn-next-level').onclick = () => {
             document.getElementById('game-over').classList.add('hidden');
             this.startLevel(this.level + 1);
        }

        document.getElementById('btn-tut-next').onclick = () => this.nextTutorialSlide();
        document.getElementById('btn-tut-prev').onclick = () => this.prevTutorialSlide();
        document.getElementById('btn-tut-skip').onclick = () => this.finishTutorial(); 
        document.getElementById('btn-restart').onclick = () => this.startLevel(this.level);
        document.getElementById('btn-menu').onclick = () => {
            document.getElementById('game-over').classList.add('hidden');
            document.getElementById('main-menu').classList.remove('hidden');
        };
        // Logic: If logged in, buy. If not, login.
        document.getElementById('btn-iap').onclick = () => {
            if (STATE.userId) {
                // User is logged in, initiate purchase
                this.purchaseNoAds();
            } else {
                // User not logged in, show modal
                document.getElementById('login-modal').classList.remove('hidden');
                document.getElementById('main-menu').classList.add('hidden');
            }
        };

  // --- NEW LOGIN LOGIC START ---
        document.getElementById('btn-game-login').onclick = () => {
            document.getElementById('login-modal').classList.remove('hidden');
            document.getElementById('main-menu').classList.add('hidden');
        };

        document.getElementById('btn-cancel-login').onclick = () => {
            document.getElementById('login-modal').classList.add('hidden');
            document.getElementById('main-menu').classList.remove('hidden');
            document.getElementById('login-status').innerText = "";
        };

        document.getElementById('btn-submit-login').onclick = () => this.performLogin();
        // --- NEW LOGIN LOGIC END ---



        // Setup Color Modal Options
        const colorOpts = ['green', 'blue', 'red', 'orange', 'gold'];
        const modalContainer = document.getElementById('color-options');
        modalContainer.innerHTML = ''; 
        colorOpts.forEach(clr => {
            const b = document.createElement('div');
            b.className = 'color-choice-btn';
            b.style.backgroundColor = clr;
            b.onclick = () => this.activateMonoColor(clr);
            modalContainer.appendChild(b);
        });
        
        CONFIG.IMAGES.forEach(src => {
            const img = new Image();
            img.src = 'images/' + src;
            STATE.images[src] = img;
        });

        // Add menu_background to the image loader manually if needed or via config
        const mbg = new Image();
        mbg.src = 'images/menu_background.jpg';
    }



async performLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-pass').value;
        const statusEl = document.getElementById('login-status');

        if (!email || !password) {
            statusEl.innerText = "Credentials required.";
            return;
        }

        statusEl.innerText = "Connecting to FutureMusic...";

        try {
            // CHANGED: Added CONFIG.API_BASE_URL to fix file:///C:/ fetch errors
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/game/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                // --- THIS IS THE CODE FROM STEP 6 ---
                STATE.hasRemovedAds = data.hasNoAds; // Update the global state
                STATE.userId = data.userId; // Store User ID for purchases
                // ------------------------------------

                statusEl.innerText = "Success! Account Synced.";
                statusEl.style.color = "lime";
                
                // Visual feedback in menu
                const loginBtn = document.getElementById('btn-game-login');
                loginBtn.innerText = "Logged In: " + data.username;
                loginBtn.disabled = true;
                loginBtn.style.background = "#333";
                
                // If they have ads removed, hide the "Remove Ads" button
                if (STATE.hasRemovedAds) {
                    document.getElementById('btn-iap').style.display = 'none';
                }

                // Close modal after 1 second
                setTimeout(() => {
                    document.getElementById('login-modal').classList.add('hidden');
                    document.getElementById('main-menu').classList.remove('hidden');
                }, 1000);

            } else {
                statusEl.innerText = "Error: " + data.message;
                statusEl.style.color = "red";
            }
        } catch (err) {
            console.error(err);
            statusEl.innerText = "Connection Error (Check Server).";
            statusEl.style.color = "red";
        }
    }

async purchaseNoAds() {
        const btn = document.getElementById('btn-iap');
        const originalText = btn.innerText;
        btn.innerText = "Processing...";
        btn.disabled = true;

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/game/purchase-no-ads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: STATE.userId })
            });

            const data = await response.json();

            if (data.url) {
                // FIX: Use window.top.location to break out of the iFrame for Stripe
                window.top.location.href = data.url;
            } else {
                alert("Error: " + (data.error || "Unknown error"));
                btn.innerText = originalText;
                btn.disabled = false;
            }
        } catch (e) {
            console.error(e);
            alert("Connection error.");
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }

 setupAudioControls() {
        const btnMusic = document.getElementById('btn-music');
        const btnSfx = document.getElementById('btn-sfx');
        const btnFull = document.getElementById('btn-fullscreen');

        btnMusic.onclick = () => {
            this.playMenuTone();
            this.musicMuted = !this.musicMuted;
            btnMusic.innerText = this.musicMuted ? '🔇' : '🎵';
            if (this.musicMuted) {
                this.musicPlayer.pause();
            } else {
                if (this.isRunning) this.playCurrentTrack();
            }
        };

        btnSfx.onclick = () => {
            this.playMenuTone();
            this.sfxMuted = !this.sfxMuted;
            btnSfx.innerText = this.sfxMuted ? '🔇' : '🔊';
        };

        // NEW: Fullscreen Toggle Logic
        btnFull.onclick = () => {
            this.playMenuTone();
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.log(`Error attempting to enable full-screen mode: ${err.message}`);
                });
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        };
    }

    setupMenuSound() {
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.addEventListener('mousedown', () => this.playMenuTone());
        });
    }

    playMenuTone() {
        if (this.sfxMuted) return;
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        // Random pitch between 300Hz and 600Hz
        osc.frequency.value = 300 + Math.random() * 300;
        osc.type = 'sine';
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.1);
        osc.stop(ctx.currentTime + 0.1);
    }

    playCurrentTrack() {
        if (this.musicMuted || !CONFIG.SOUNDTRACK.length) return;

        // Determine track based on Level (1-5 repeats)
        // Level 1 = Index 0, Level 6 = Index 0
        const trackIndex = (this.level - 1) % 5;
        const trackName = CONFIG.SOUNDTRACK[trackIndex];
        const fullPath = 'soundtrack/' + trackName;

        // If specific track is not already loaded or playing
        // Extract filename from src to compare properly
        const currentSrc = this.musicPlayer.src.split('/').pop();
        
        if (currentSrc !== trackName) {
            this.musicPlayer.src = fullPath;
            this.musicPlayer.volume = 0.5;
            this.musicPlayer.play().catch(e => console.log("Audio play failed:", e));
        } else if (this.musicPlayer.paused) {
            this.musicPlayer.play();
        }
    }

    pauseMusic() {
        if(this.musicPlayer) this.musicPlayer.pause();
    }
    
    playSfx(filename) {
        if (this.sfxMuted) return; 
        const sfx = new Audio('sounds/' + filename); 
        sfx.play().catch(e => {});
    }


startLevel(lvl) {
        this.level = lvl;
        this.score = 0;
        
        // TIME: Base 180 + (Level-1)*7.3
        this.timeLeft = CONFIG.LEVEL_TIME_SEC + ((lvl - 1) * 7.3);
        
        this.targets = [];
        this.ripples = [];
        this.trails = [];
        this.texts = [];
        this.speedMultiplier = 1;
        this.starModeActive = false;
        this.halfwayAdShown = false;
        this.levelEnded = false; 
        this.adAccumulator = 0; // <--- NEW: Track 90s interval
        
        // Shooting Star Bonus
        this.shootingStarBonusTimer = 0; 
        this.secondAccumulator = 0;

        this.comboColor = null;
        this.comboCount = 0;
        this.sequence = []; 
        this.sequenceIndex = 0;
        this.generateSequence();
        this.monoColorMode = null;
        this.monoColorTimer = 0;

        // SPAWN RATE: Base * (0.98)^(Level-1) - 2% faster (smaller delay) per level
        this.currentSpawnRate = CONFIG.BASE_SPAWN_RATE_MS * Math.pow(0.98, lvl - 1);
        
        // SCORE: Base 500 + (Level-1)*150
        this.targetScore = CONFIG.BASE_WIN_SCORE + ((lvl-1) * 150);

        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('game-over').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');
        document.getElementById('target-val').innerText = this.targetScore;
        document.getElementById('level-val').innerText = this.level;
        document.getElementById('chest-zone').classList.remove('hidden');
        
        this.changeBackground();
        // Clear old interval if exists to prevent stacking
        if(this.bgInterval) clearInterval(this.bgInterval);
        this.bgInterval = setInterval(() => this.changeBackground(), 10000);

        // Trigger Ad at Beginning of Level (except level 1 tutorial)
        const startAction = () => {
             this.playCurrentTrack(); 
             this.beginGameplay();
        };

        if (this.level === 1) {
             this.startTutorial();
        } else {
             // Show Ad first, then start game
             this.adManager.triggerAd(startAction);
        }
    }
    beginGameplay() {
        this.isRunning = true;
        this.lastTime = Date.now();
        this.playCurrentTrack();
        this.loop();
    }
    
    startTutorial() {
        this.tutIndex = 0;
        // ... (Keep existing slides array) ...
        this.tutSlides = [
            { img: 'green_solid.png', text: "GREEN Targets: Just TAP them to break!" },
            { img: 'blue_solid.png', text: "BLUE Targets: Double TAP quickly!" },
            { img: 'red_solid.png', text: "RED Targets: SLICE through them!" },
            { img: 'orange_solid.png', text: "ORANGE Targets: Draw a CIRCLE around them!" },
            { img: 'gold_solid.png', text: "GOLD Targets: DRAG them into the chest!" },
            { img: 'green_broken.png', text: "COMBOS: Break 3+ of the SAME color in a row for multiplier points!" },
            { img: 'star.png', text: "POWERUPS: Tap for special effects like Star Mode!" }
        ];
        
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('tutorial-modal').classList.remove('hidden');
        
        // Update Button Text
        const btn = document.getElementById('btn-tut-skip');
        if(this.fromMenu) {
            btn.innerText = "Return to Menu";
        } else {
            btn.innerText = "Start Level";
        }

        this.updateTutorialUI();
    }

    updateTutorialUI() {
        const slide = this.tutSlides[this.tutIndex];
        document.getElementById('tut-text').innerText = slide.text;
        document.getElementById('tut-img').src = 'images/' + slide.img;
        document.getElementById('tut-page').innerText = `${this.tutIndex + 1}/${this.tutSlides.length}`;
        
        document.getElementById('btn-tut-prev').disabled = (this.tutIndex === 0);
        document.getElementById('btn-tut-next').style.display = (this.tutIndex === this.tutSlides.length - 1) ? 'none' : 'inline-block';
    }

    nextTutorialSlide() {
        if (this.tutIndex < this.tutSlides.length - 1) {
            this.tutIndex++;
            this.updateTutorialUI();
        }
    }

    prevTutorialSlide() {
        if (this.tutIndex > 0) {
            this.tutIndex--;
            this.updateTutorialUI();
        }
    }
 finishTutorial() {
        document.getElementById('tutorial-modal').classList.add('hidden');
        
        if (this.fromMenu) {
            this.fromMenu = false; // Reset
            document.getElementById('main-menu').classList.remove('hidden');
        } else {
            // Actually start the game
            document.getElementById('hud').classList.remove('hidden');
            this.playCurrentTrack(); // Start Music Now
            this.beginGameplay();
        }
    }
    changeBackground() {
        if(!this.bgIndex) this.bgIndex = 0;
        const bgName = CONFIG.BACKGROUNDS[this.bgIndex % CONFIG.BACKGROUNDS.length];
        // Set image url
        document.getElementById('bg-layer').style.backgroundImage = `url('images/${bgName}')`;
        document.getElementById('bg-layer').style.backgroundColor = 'transparent';
        this.bgIndex++;
    }

    pause() { 
        this.isRunning = false; 
        this.pauseMusic();
    }
    resume() { 
        this.isRunning = true; 
        this.lastTime = Date.now(); 
        this.playCurrentTrack();
        this.loop(); 
    }

 spawnTarget() {
        const maxTargetSize = 150; 
        const safeMargin = maxTargetSize / 2 + 20; 
        const chestBuffer = 140; 

        // FIX: Use window.innerWidth/Height instead of this.canvas.width/height
        // The canvas width includes the Device Pixel Ratio multiplier, which causes
        // coordinates to be off-screen on high-res mobile displays.
        const minX = safeMargin;
        const maxX = window.innerWidth - safeMargin;
        const minY = safeMargin;
        const maxY = window.innerHeight - safeMargin - chestBuffer;

        const x = minX < maxX ? Math.random() * (maxX - minX) + minX : window.innerWidth/2;
        const y = minY < maxY ? Math.random() * (maxY - minY) + minY : window.innerHeight/2;

        // Calculate Level Speed Multiplier for Despawn (Stay Time)
        // 2% per level: Math.pow(1.02, level - 1)
        const despawnSpeedMult = Math.pow(1.02, this.level - 1);

        // Powerup Chance (1/20)
        if (Math.random() < 0.05) {
            const keys = Object.keys(CONFIG.POWERUPS);
            const pKey = keys[Math.floor(Math.random() * keys.length)];
            this.targets.push(new PowerUp(x, y, CONFIG.POWERUPS[pKey]));
            return;
        }

        // Target Selection
        if (this.starModeActive) {
            const starDef = { ...CONFIG.TARGETS.GREEN, type: 'star_active', points: 50 }; 
            this.targets.push(new Target(x, y, starDef, despawnSpeedMult));
        } 
        else if (this.monoColorMode) {
            const key = this.monoColorMode.toUpperCase();
            if(CONFIG.TARGETS[key]) {
                this.targets.push(new Target(x, y, CONFIG.TARGETS[key], despawnSpeedMult));
            }
        }
        else {
            // NEW: Use Weighted Probability from CSV
            // Default to Level 20 weights if level > 20
            const safeLevel = Math.min(this.level, 20); 
            const weights = CONFIG.LEVEL_WEIGHTS.find(w => w.level === safeLevel) || CONFIG.LEVEL_WEIGHTS[0];
            
            const rng = Math.random() * 100;
            let currentWeight = 0;
            let selectedType = 'green'; // Fallback

            // Order: green, blue, red, gold, orange
            const types = ['green', 'blue', 'red', 'gold', 'orange'];
            
            for (let type of types) {
                currentWeight += weights[type];
                if (rng <= currentWeight) {
                    selectedType = type;
                    break;
                }
            }

            this.targets.push(new Target(x, y, CONFIG.TARGETS[selectedType.toUpperCase()], despawnSpeedMult));
        }
    }

 update(dt) {
        if(this.levelEnded) return;

        this.timeLeft -= dt / 1000;
        
        // Shooting Star Bonus Timer
        if (this.shootingStarBonusTimer > 0) {
            this.shootingStarBonusTimer -= dt;
        }

        // 1% Chance per second for Shooting Star
        this.secondAccumulator += dt;
        if (this.secondAccumulator >= 1000) {
            this.secondAccumulator = 0;
            if (Math.random() < 0.01) { // 1% chance
                this.targets.push(new ShootingStar(this.canvas.width, this.canvas.height));
            }
        }
        
        // Random Ambient Ripples
        if (Math.random() < 0.02) {
             const rx = Math.random() * this.canvas.width;
             const ry = Math.random() * this.canvas.height;
             this.ripples.push(new Ripple(rx, ry, 'rgba(255,255,255,0.3)'));
        }
        
        // --- 90 Second Interval Ad Logic & Warning ---
        if (!STATE.hasRemovedAds) {
            this.adAccumulator += dt;

            // SHOW WARNING (Between 80s and 90s)
            if (this.adAccumulator >= 80000 && this.adAccumulator < 90000) {
                const warnEl = document.getElementById('ad-warning');
                const countEl = document.getElementById('ad-countdown');
                const timeLeft = Math.ceil((90000 - this.adAccumulator) / 1000);
                
                warnEl.classList.remove('hidden');
                countEl.innerText = timeLeft;
            } else {
                document.getElementById('ad-warning').classList.add('hidden');
            }

            // TRIGGER AD (At 90s)
            if (this.adAccumulator >= 90000) { 
                this.adAccumulator = 0; // Reset timer immediately to prevent double trigger
                document.getElementById('ad-warning').classList.add('hidden'); // Ensure warning is gone
                
                this.adManager.triggerAd(() => {
                    this.lastTime = Date.now(); // Reset delta calculation
                    this.resume();
                });
            }
        } else {
            // Ensure warning is hidden if ads are removed during play
            document.getElementById('ad-warning').classList.add('hidden');
        }

        if (this.timeLeft <= 0) {
            this.endLevel();
            return;
        }

        this.spawnTimer += dt * this.speedMultiplier;
        
        // Apply 5x spawn rate if shooting star bonus is active
        let effectiveSpawnRate = this.currentSpawnRate;
        if (this.shootingStarBonusTimer > 0) {
            effectiveSpawnRate /= 5;
        }

        if (this.spawnTimer >= effectiveSpawnRate) {
            this.spawnTarget();
            this.spawnTimer = 0;
        }

        if (this.starModeActive) {
            this.starModeTimer -= dt;
            if (this.starModeTimer <= 0) this.starModeActive = false;
        }

        if (this.monoColorMode) {
            this.monoColorTimer -= dt;
            if (this.monoColorTimer <= 0) this.monoColorMode = null;
        }

        // Update Entities and check Penalties
        this.targets.forEach(t => {
            t.update(dt, this.speedMultiplier);
            
            // Penalty: If target dies naturally (not broken) and isn't a powerup/star/shootingstar
            if (t.state === 'dead' && !t.broken && t instanceof Target && t.def.type !== 'star_active') {
                const penalty = 10 + ((this.level - 1) * 5);
                this.score = Math.max(0, this.score - penalty);
                this.texts.push(new FloatingText(t.x, t.y, `-${penalty}`));
            }
        });
        
        this.targets = this.targets.filter(t => t.state !== 'dead');

        this.ripples.forEach(r => r.update(dt));
        this.ripples = this.ripples.filter(r => r.alpha > 0);

        this.trails.forEach(t => t.update(dt));
        this.trails = this.trails.filter(t => t.points.length > 0);

        this.texts.forEach(t => t.update(dt));
        this.texts = this.texts.filter(t => t.timer < t.life);

        document.getElementById('score-val').innerText = Math.floor(this.score);
        const m = Math.floor(Math.max(0, this.timeLeft) / 60);
        const s = Math.floor(Math.max(0, this.timeLeft) % 60);
        document.getElementById('time-val').innerText = `${m}:${s < 10 ? '0'+s : s}`;
    }

draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.effCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.trails.forEach(t => t.draw(this.effCtx));
        this.ripples.forEach(r => r.draw(this.effCtx));
        this.texts.forEach(t => t.draw(this.effCtx));

        this.targets.forEach(t => {
            if (t instanceof ShootingStar) {
                // Pass the star texture
                t.draw(this.ctx, STATE.images['star.png']);
                return;
            }

            let imgName = '';
            if (t instanceof PowerUp) {
                imgName = t.def.type + '.png';
            } else {
                // Fix: Properly display active star targets
                if (t.def.type === 'star_active') {
                    // Use the star texture, do not look for _solid or _broken
                    imgName = 'star_active.png';
                } else {
                    if (t.broken) {
                        imgName = t.def.type + '_broken.png';
                    } else {
                        imgName = t.def.type + '_solid.png';
                    }
                }
            }
            
            t.draw(this.ctx, STATE.images[imgName]);
        });
    }

    loop() {
        if (!this.isRunning) return;
        const now = Date.now();
        const dt = now - this.lastTime;
        this.lastTime = now;

        this.update(dt);
        this.draw();
        requestAnimationFrame(() => this.loop());
    }

endLevel() {
        this.isRunning = false;
        this.levelEnded = true; 
        this.musicPlayer.pause(); 
        
        // Trigger Ad at End of Level
        this.adManager.triggerAd(() => {
            // Play Complete Sound AFTER ad
            this.playSfx('level_complete.mp3');

            const passed = this.score >= this.targetScore;
            
            if (passed) {
                // Save Max Level
                if (this.level >= STATE.maxUnlockedLevel) {
                    STATE.maxUnlockedLevel = this.level + 1;
                    localStorage.setItem('maxUnlockedLevel', STATE.maxUnlockedLevel);
                }
                
                // Save High Score
                const currentHigh = localStorage.getItem(`level_${this.level}_score`) || 0;
                if (this.score > currentHigh) {
                    localStorage.setItem(`level_${this.level}_score`, Math.floor(this.score));
                }

                // Refresh menu to update cards
                this.setupMenu();
            }

            const goTitle = document.getElementById('go-title');
            goTitle.innerText = passed ? "Level Complete!" : "Level Failed";
            goTitle.style.color = passed ? "lime" : "red";
            document.getElementById('go-score').innerText = Math.floor(this.score);
            
            const btnNext = document.getElementById('btn-next-level');
            if (passed && this.level < CONFIG.TOTAL_LEVELS) {
                btnNext.classList.remove('hidden');
            } else {
                btnNext.classList.add('hidden');
            }

            document.getElementById('game-over').classList.remove('hidden');
            document.getElementById('hud').classList.add('hidden');
            document.getElementById('sequence-board').innerHTML = ''; 
        });
    }

    // --- Interaction Logic ---

    hitTest(x, y) {
        // Return top-most active target
        for(let i = this.targets.length-1; i>=0; i--) {
            // Do not interact with broken/dying targets
            if(!this.targets[i].broken && this.targets[i].contains(x, y)) {
                return this.targets[i];
            }
        }
        return null;
    }

destroyTarget(target, forceStarScore = false, inputColor = null) {
        if (!target || target.state === 'dying') return;
        
        // Safety check: ShootingStars and PowerUps might not have 'def' populated like Targets
        let type = target.def ? target.def.type : 'unknown';
        let pts = target.def ? target.def.points : 0;
        let textToShow = ""; // To store multiplier text if needed

        if(forceStarScore) pts = 50;
        
        if (inputColor && inputColor === type) {
             pts *= 2;
             textToShow = "MATCH! x2";
        }

        if (!forceStarScore && type === this.comboColor) {
            this.comboCount++;
            if (this.comboCount >= 3) {
                const mult = 1.1 + ((this.comboCount - 3) * 0.1);
                pts *= mult;
                textToShow = `Combo x${mult.toFixed(1)}`;
                this.playSfx('combo.mp3'); 
            }
        } else {
            this.comboColor = type;
            this.comboCount = 1;
        }

        this.checkSequence(type);

        const finalPoints = Math.floor(pts);
        this.score += finalPoints;
        
        // Show Score Text (Priority over combo text, or show both)
        // Requirement: Show points. If there was combo text, maybe show separate?
        // Let's float the POINTS at the target location.
        this.texts.push(new FloatingText(target.x, target.y, finalPoints));

        // If there was specific flavor text (Match/Combo), float it slightly higher
        if (textToShow !== "") {
             this.texts.push(new FloatingText(target.x, target.y - 40, textToShow));
        }

        // Sound & Animation Logic
        if (forceStarScore || type === 'star_active' || this.starModeActive) {
            this.playSfx('star_break.mp3'); 
            this.addRipple(target.x, target.y, 'gold', 200); 
        } else {
            // Safety for sound file
            if(type !== 'unknown') {
                this.playSfx(type + '_break.mp3');
            }
        }

        // CRITICAL FIX: Check if break function exists before calling
        if (typeof target.break === 'function') {
            target.break();
        } else {
            // Manually kill entities that don't have break animation logic
            target.state = 'dying';
            target.dieTimer = 0;
        }
    }

 activatePowerup(p) {
        p.state = 'dead';
        
        // Show Powerup Text
        if (p.def.text) {
             this.texts.push(new FloatingText(p.x, p.y, p.def.text));
        }

        if (p.def.type === 'hourglass') {
            this.speedMultiplier = 1.25; 
            setTimeout(() => this.speedMultiplier = 1, 5000);
        } else if (p.def.type === 'bomb') {
            this.playSfx('bomb.mp3'); // Assuming bomb sound
            this.targets.forEach(t => {
                if(t instanceof Target) this.destroyTarget(t);
            });
        } else if (p.def.type === 'star') {
            this.starModeActive = true;
            this.starModeTimer = p.def.duration;
        }
    }

    addTrail(color) {
        const t = new Trail(color);
        this.trails.push(t);
        return t;
    }

    generateSequence() {
        const colors = ['green', 'blue', 'red', 'orange', 'gold'];
        // Shuffle
        for (let i = colors.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [colors[i], colors[j]] = [colors[j], colors[i]];
        }
        this.sequence = colors;
        this.sequenceIndex = 0;
        this.updateSequenceUI();
    }

    updateSequenceUI() {
        const container = document.getElementById('sequence-board');
        container.innerHTML = '';
        this.sequence.forEach((col, idx) => {
            const dot = document.createElement('div');
            dot.className = 'seq-dot';
            dot.style.backgroundColor = col;
            if (idx === this.sequenceIndex) dot.classList.add('active');
            if (idx < this.sequenceIndex) dot.style.opacity = '0.2'; // Completed
            container.appendChild(dot);
        });
    }

 checkSequence(colorType) {
        if (this.sequenceIndex >= this.sequence.length) return; 

        if (this.sequence[this.sequenceIndex] === colorType) {
            this.sequenceIndex++;
            this.updateSequenceUI();
            
            if (this.sequenceIndex >= this.sequence.length) {
                // New Audio: Color Select Trigger
                this.playSfx('color_select.mp3');

                this.pause(); 
                document.getElementById('color-modal').classList.remove('hidden');
            }
        } else {
            this.generateSequence(); 
        }
    }

    activateMonoColor(color) {
        document.getElementById('color-modal').classList.add('hidden');
        this.monoColorMode = color;
        this.monoColorTimer = 15000; // 15s
        this.generateSequence(); // Start fresh sequence for after
        this.resume();
    }

    addRipple(x, y, color, maxRadius) {
        this.ripples.push(new Ripple(x, y, color, maxRadius));
    }

 checkSlice(points, inputColor) {
        this.targets.forEach(t => {
            // CRITICAL FIX: Added 't.def &&' check because ShootingStars do not have 'def'
            if (t.def && t.def.type === 'red' && t.state === 'active') {
                // 1. Gather all points from the gesture that are INSIDE the target
                const insidePoints = points.filter(p => t.contains(p.x, p.y));

                // 2. Need at least 2 points to form a line
                if (insidePoints.length < 2) return;

                // 3. Check the maximum distance between any two points inside the target
                // If the distance spans a large % of the width, it's a full cut.
                let maxDistSq = 0;
                
                // Optimization: Just check start vs end of the inside segment
                const first = insidePoints[0];
                const last = insidePoints[insidePoints.length - 1];
                
                const dx = first.x - last.x;
                const dy = first.y - last.y;
                const dist = Math.sqrt(dx*dx + dy*dy);

                // If cut covers 80% of diameter, break it
                if (dist >= t.width * 0.8) {
                    this.destroyTarget(t);
                }
            }
        });
    }
    
    // lineIntersectsRect is no longer used, so it is removed.

    checkCircle(points, inputColor) {
        // Calculate bounding box of drawing
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        points.forEach(p => {
            if(p.x < minX) minX = p.x;
            if(p.x > maxX) maxX = p.x;
            if(p.y < minY) minY = p.y;
            if(p.y > maxY) maxY = p.y;
        });

        const width = maxX - minX;
        const height = maxY - minY;

        // Ensure drawing is roughly circle/square shape and big enough
        if (width < 50 || height < 50) return;

        this.targets.forEach(t => {
            if (t.def.type === 'orange' && t.state === 'active') {
                // Is target inside the drawing bounds?
                if (t.x > minX && t.x < maxX && t.y > minY && t.y < maxY) {
                    this.destroyTarget(t);
                }
            }
        });
    }
    
 checkDragCollision(target, inputColor) {
        if (target.def.type !== 'gold') return;
        
        const chestDiv = document.getElementById('chest-zone');
        const chest = chestDiv.getBoundingClientRect();
        
        // Calculate target boundaries based on its center x,y and width/height
        const tLeft = target.x - target.width / 2;
        const tRight = target.x + target.width / 2;
        const tTop = target.y - target.height / 2;
        const tBottom = target.y + target.height / 2;

        // Check for Box Overlap (AABB Collision)
        // If the target box overlaps the chest box at all, consider it collected
        const overlap = (
            tLeft < chest.right &&
            tRight > chest.left &&
            tTop < chest.bottom &&
            tBottom > chest.top
        );
        
   if (overlap) {
            // FIX: Pass the ACTUAL input color from the touch (passed from InputHandler)
            // If the user's color (inputColor) is 'gold', destroyTarget logic will trigger x2 match.
            // If the user's color is 'red', it won't trigger match x2.
            this.destroyTarget(target, false, inputColor); 
            
            // Force stop dragging immediately so it doesn't get stuck on finger
            target.isDragging = false; 
        }
    }
}

// Start Game
window.onload = () => {
    new Game();
};
