/**
 * WILD HERDS - Game Logic
 */
// --- DEBUG TOGGLE ---
const TEST_UNLOCK_ALL = false; // Set to true to unlock all animals locally
// --- CONFIGURATION & STATE ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const ASSETS = {
    // Images will be loaded here
    images: {},
    audio: {}
};

const GAME_STATE = {
    screen: 'splash',
    lastTime: 0,
    controlScheme: 'wasd',
    isMobile: /Mobi|Android/i.test(navigator.userAgent),
    keys: { w: false, a: false, s: false, d: false },
    mouse: { x: 0, y: 0, active: false },
    camera: { x: 0, y: 0, zoom: 1 },
    // Audio State
    isMuted: false,
    bgMusic: null, // Stores the main music element
    ambience: null, // Stores the background_sounds element
    currentSongIndex: 0,
    // Add your song filenames here
        // Update this list with EVERY .mp3 file inside your /songs/ folder
    playlist: [
        'songs/song1.mp3', 
        'songs/song2.mp3',
        'songs/song3.mp3', // Example: Add your real files
        'songs/song4.mp3' // Example: Add your real files
    ], 
    sfxList: [
        'click', 'start_game', 'step', 'eat', 'levelup', 
        'fight_start', 'hit', 'die', 'monolith', 'revert', 
        'pickup', 'sparrow', 'eagle', 'victory', 'map_pickup', 'population_up' 
    ],
        currentUser: null, // { userId, email, ownedSkins: [] }
    lastStartConfig: null, // To store restart settings
    herdSpawnTimer: 0, // For the 60s spawn logic
    uiTimer: 0, // Throttle for UI updates
        sfxHistory: {}, // Tracks sound playback times
};

let world = {
    width: 5000, // 25% larger
        respawnTimer: 0,
    height: 5000,
    tileSize: 512,
    friction: 0.9,
    entities: [],
    clouds: [], 
    particles: [],
    projectiles: [], // New projectile array
    enemyHerds: [], 
    water: [], 
};

let player = {
    herd: [],
    type: 'dog', 
    totalXp: 0, // Track lifetime XP for score
    mapTimer: 0, // New minimap timer
    baseType: 'dog', // original type (for reverting monolith)
    xp: 0,
    growthPoints: 0, // Accumulates to 1 to spawn new animal
    upgrades: {
        hp: { level: 0, cost: 5 },
        speed: { level: 0, cost: 5 },
        damage: { level: 0, cost: 5 },
        breed: { level: 0, cost: 5 },
        bird: { level: 0, cost: 5 } // New upgrade
    },
    birdCooldown: 0,
    birdMaxCooldown: 25,
    monolithTimer: 0,
        birdPowerupTimer: 0, // New powerup timer
    flagImage: null
};

// Animal Stats config
const STATS = {
    dog: { hp: 30, dmg: 12, speed: 5, diet: 'carnivore' }, // Eats rabbits
    chimp: { hp: 33, dmg: 10, speed: 5, diet: 'omnivore' }, // Eats rabbits, grass, apples
    deer: { hp: 30, dmg: 10, speed: 6, diet: 'herbivore' }, // Eats grass, apples
    wolf: { hp: 45, dmg: 18, speed: 6, diet: 'carnivore' },
    gorilla: { hp: 49.5, dmg: 15, speed: 6, diet: 'omnivore' },
    moose: { hp: 45, dmg: 15, speed: 7.2, diet: 'herbivore' },
    rabbit: { hp: 5, dmg: 0, speed: 7.5, diet: 'herbivore' }, // Non-player
    sparrow: { hp: 10, dmg: 15, speed: 10, diet: 'none' },
    eagle: { hp: 20, dmg: 30, speed: 14, diet: 'none' },
    snake: { hp: 30, dmg: 10, speed: 4, diet: 'carnivore' }, // Slower (base is 5)
    crocodile: { hp: 50, dmg: 20, speed: 5, diet: 'carnivore' }, // Swim ability handled in logic
    pig: { hp: 36.3, dmg: 9, speed: 4.5, diet: 'herbivore' }, // +10% hp, -5% others from base 33/10/5
    rhino: { hp: 45, dmg: 12.5, speed: 6.25, diet: 'herbivore' }, // Big boost
    anteater: { hp: 27, dmg: 9, speed: 4, diet: 'herbivore' }, // -10% base
    elephant: { hp: 60, dmg: 20, speed: 10, diet: 'herbivore' }, // Double modifier
    cat: { hp: 28.5, dmg: 10, speed: 5.25, diet: 'carnivore' }, // +5% spd, -5% hp
    lion: { hp: 40, dmg: 18, speed: 7, diet: 'carnivore' }, // Huge Attack/Spd boost
        velociraptor: { hp: 30, dmg: 11, speed: 6.5, diet: 'carnivore' }, // +10% dmg (base 10), +30% speed (base 5)
    't-rex': { hp: 90, dmg: 33, speed: 3, diet: 'carnivore' }, // 200% HP/Dmg boost from velociraptor, -40% speed penalty

        chicken: { hp: 21, dmg: 7, speed: 3.5, diet: 'herbivore' }, // -30% of avg (~30/10/5)
    vulture: { hp: 45, dmg: 15, speed: 10, diet: 'carnivore' }, // +50% hp/dmg, Double speed (5->10)
    human: { hp: 24, dmg: 8, speed: 4, diet: 'omnivore' }, // -20% of avg
    // Human Stages (Calculated as Base Human + 20% compound per stage approx)
    human_bronze: { hp: 28.8, dmg: 9.6, speed: 4.8, diet: 'omnivore' },
    human_medieval: { hp: 34.5, dmg: 11.5, speed: 5.7, diet: 'omnivore' },
    human_renaissance: { hp: 41.4, dmg: 13.8, speed: 6.9, diet: 'omnivore' },
    human_20th: { hp: 49.7, dmg: 16.5, speed: 8.2, diet: 'omnivore' },
    human_modern: { hp: 59.6, dmg: 19.9, speed: 9.9, diet: 'omnivore' },
    human_future: { hp: 71.5, dmg: 23.8, speed: 11.8, diet: 'omnivore' }
};

// --- INITIALIZATION ---

function init() {
    resize();
    window.addEventListener('resize', resize);
    setupInputs();
    setupUI();
    // Load Placeholder Assets logic (In real app, await image loading)
    preloadAssets();

        // Check URL for payment success
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.get('payment') === 'success') {
        alert("Purchase Successful! Please select your animal.");
        // Prompt login again or rely on session if persisted (Session is handled by server, usually cookie remains)
        // In a real app, you might auto-fetch user session here.
    }

        // --- ADD THIS LINE HERE ---
    restoreSession(); 
    // --------------------------
    
    
    // SFX Placeholder
    // In a real implementation, we would load audio files here.
    
    loop(0);
}

async function restoreSession() {
    try {
        const res = await fetch('/api/game/check-session');
        const data = await res.json();
        
        if (data.success) {
            console.log("Session restored:", data.username);
            
            // Restore User State
            GAME_STATE.currentUser = data;
            
            // Update UI (Same logic as manual login)
            const loginBtn = document.getElementById('btn-login-global');
            loginBtn.innerText = "✅ " + data.username.split('@')[0];
            loginBtn.style.background = "rgba(0,0,0,0.5)";
            loginBtn.disabled = true;

            // Apply Unlocks immediately
            checkUnlocks(); 
        }
    } catch (err) {
        console.warn("Auto-login failed:", err);
    }
}


function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function preloadAssets() {
    const types = ['dog', 'chimp', 'deer', 'wolf', 'gorilla', 'moose', 'rabbit', 'snake', 'crocodile', 'pig', 'rhino', 'anteater', 'elephant', 'cat', 'lion', 'sparrow', 'eagle', 'velociraptor', 't-rex', 'chicken', 'vulture', 'human', 'human_bronze', 'human_medieval', 'human_renaissance', 'human_20th', 'human_modern', 'human_future'];

    const actions = ['still', 'move', 'ready', 'pounce'];
    
    types.forEach(type => {
        actions.forEach(act => {
            if(type === 'rabbit' && (act === 'ready' || act === 'pounce')) return;
            const img = new Image();
            img.src = `${type}/${act}.png`;
            // Fallback for demo purposes if files don't exist:
            img.onerror = () => { /* Draw colored rect instead */ }; 
            ASSETS.images[`${type}_${act}`] = img;
        });
    });
    
    // ADDED 'double' TO THIS LIST
    ['monolith', 'grass', 'apple', 'sparrow', 'eagle', 'tree', 'map', 'birdshot', 'chicken_projectile', 'double'].forEach(item => {        
        const img = new Image();
        img.src = `nature/${item}.png`; 
        ASSETS.images[item] = img;
    });
}

function playSound(name) {
    if (GAME_STATE.isMuted) return;
     // --- RATE LIMITER for Hit/Fight SFX ---
    // Max 3 times per 5 seconds (5000ms)
    if (name === 'hit' || name.includes('-fight')) {
        const now = Date.now();
        if (!GAME_STATE.sfxHistory[name]) GAME_STATE.sfxHistory[name] = [];
        
        // Remove timestamps older than 5 seconds
        GAME_STATE.sfxHistory[name] = GAME_STATE.sfxHistory[name].filter(t => now - t < 5000);
        
        // If we hit the limit, block playback
        if (GAME_STATE.sfxHistory[name].length >= 3) return;
        
        // Record this playback
        GAME_STATE.sfxHistory[name].push(now);
    }
    // --------------------------------------
    try {
        const audio = new Audio(`sfx/${name}.mp3`);
        audio.volume = 0.3; 
        
        // Auto-initialize array if missing (Fixes the "No Sound" bug)
        if (!GAME_STATE.activeSFX) GAME_STATE.activeSFX = [];

        // Add to tracker
        GAME_STATE.activeSFX.push(audio);
        
        // Remove from tracker when done playing
        audio.onended = () => {
            if (GAME_STATE.activeSFX) {
                GAME_STATE.activeSFX = GAME_STATE.activeSFX.filter(a => a !== audio);
            }
        };

        audio.play().catch(e => { });
    } catch(err) {
        console.warn("Sound missing:", name);
    }
}
function playMenuMusic() {
    stopMusic();
    if (GAME_STATE.isMuted) return;
    GAME_STATE.bgMusic = new Audio('Dumb Monkey Brain - Future Music Collective.mp3');
    GAME_STATE.bgMusic.loop = true;
    GAME_STATE.bgMusic.volume = 0.3;
    GAME_STATE.bgMusic.play().catch(e => console.log("Click interaction needed for audio"));
}

function playGameMusic() {
    stopMusic();
    if (GAME_STATE.isMuted) return;

    // 1. Ambient Background Loop
    // Ensure 'background_sounds.mp3' exists in your root folder or /sfx/ depending on where you put it
    GAME_STATE.ambience = new Audio('background_sounds.mp3'); 
    GAME_STATE.ambience.loop = true;
    GAME_STATE.ambience.volume = 0.3;
    GAME_STATE.ambience.play().catch(e => {
        console.warn("Ambience file missing or blocked:", e);
    });

    // 2. Playlist Logic
    playNextSong();
}

function playNextSong() {
    if (GAME_STATE.isMuted || !GAME_STATE.playlist.length) return;
    
    // Pick a random index based on playlist length
    const randomIndex = Math.floor(Math.random() * GAME_STATE.playlist.length);
    const songPath = GAME_STATE.playlist[randomIndex];
    
    GAME_STATE.bgMusic = new Audio(songPath);
    GAME_STATE.bgMusic.volume = 0.3;
    
    // When song ends, pick another random one
    GAME_STATE.bgMusic.onended = () => {
        playNextSong(); 
    };
    
    GAME_STATE.bgMusic.play().catch(e => {
        console.warn("Music play blocked", e);
    });
}

function stopMusic() {
    if (GAME_STATE.bgMusic) {
        GAME_STATE.bgMusic.pause();
        GAME_STATE.bgMusic = null;
    }
    if (GAME_STATE.ambience) {
        GAME_STATE.ambience.pause();
        GAME_STATE.ambience = null;
    }
}

function toggleMute() {
    GAME_STATE.isMuted = !GAME_STATE.isMuted;
    const btn = document.getElementById('btn-mute');
    btn.innerText = GAME_STATE.isMuted ? "🔇" : "🔊";

    if (GAME_STATE.isMuted) {
        if(GAME_STATE.bgMusic) GAME_STATE.bgMusic.pause();
        if(GAME_STATE.ambience) GAME_STATE.ambience.pause();
    } else {
        if(GAME_STATE.bgMusic) GAME_STATE.bgMusic.play();
        if(GAME_STATE.ambience) GAME_STATE.ambience.play();
        // Determine which music to restart if null
        if (!GAME_STATE.bgMusic) {
            if (GAME_STATE.screen === 'game') playGameMusic();
            else playMenuMusic();
        }
    }
}

// --- INPUT HANDLING ---

function setupInputs() {
    // Keyboard
    window.addEventListener('keydown', e => {
        if(e.key.toLowerCase() === 'w') GAME_STATE.keys.w = true;
        if(e.key.toLowerCase() === 'a') GAME_STATE.keys.a = true;
        if(e.key.toLowerCase() === 's') GAME_STATE.keys.s = true;
        if(e.key.toLowerCase() === 'd') GAME_STATE.keys.d = true;
        if(e.code === 'Space') fireBirdshot(); // Spacebar trigger
    });
    
// Also add click trigger (Desktop only, ignore if mobile to prevent double tap issue)
window.addEventListener('mousedown', (e) => {
    if(GAME_STATE.isMobile) return; 
    // Only fire if clicking the Canvas, not UI buttons
    if(GAME_STATE.screen === 'game' && e.target.tagName === 'CANVAS') fireBirdshot();
});

    window.addEventListener('keyup', e => {
        if(e.key.toLowerCase() === 'w') GAME_STATE.keys.w = false;
        if(e.key.toLowerCase() === 'a') GAME_STATE.keys.a = false;
        if(e.key.toLowerCase() === 's') GAME_STATE.keys.s = false;
        if(e.key.toLowerCase() === 'd') GAME_STATE.keys.d = false;
    });

    // Mouse
    window.addEventListener('mousemove', e => {
        GAME_STATE.mouse.x = e.clientX;
        GAME_STATE.mouse.y = e.clientY;
        GAME_STATE.mouse.active = true;
    });

  // Touch
    if(GAME_STATE.isMobile) {
        GAME_STATE.controlScheme = 'touch';
        
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        let isDragging = false;

        window.addEventListener('touchstart', e => {
            // e.preventDefault(); // Optional: allow UI clicks to pass through
            const t = e.touches[0];
            touchStartX = t.clientX;
            touchStartY = t.clientY;
            touchStartTime = Date.now();
            isDragging = false; // Reset drag flag
        }, {passive: false});

        window.addEventListener('touchmove', e => {
            // Prevent scrolling while playing, UNLESS touching the roster list
            if(GAME_STATE.screen === 'game') {
                if(!e.target.closest('#roster-list')) {
                    e.preventDefault();
                }
            }
            
            const t = e.touches[0];
            const dist = Math.hypot(t.clientX - touchStartX, t.clientY - touchStartY);
            
            // Only consider it a "Move Command" if dragged more than 10px
            if(dist > 10) {
                isDragging = true;
                GAME_STATE.mouse.x = t.clientX;
                GAME_STATE.mouse.y = t.clientY;
                GAME_STATE.mouse.active = true;
            }
        }, {passive: false});

        window.addEventListener('touchend', e => {
            GAME_STATE.mouse.active = false; // Stop moving
            
            const duration = Date.now() - touchStartTime;
            
            // If it was a quick tap (under 300ms) and NOT a drag
            if(!isDragging && duration < 300 && GAME_STATE.screen === 'game') {
                // Fire Birdshot at the specific tap location
                fireBirdshot(touchStartX, touchStartY);
            }
        });
    }
}

function setupUI() {
 // Add hover sounds to all buttons
        document.querySelectorAll('button, .upgrade-btn, .hero-card').forEach(el => {
        el.onmouseenter = () => playSound('pickup');
    });
    // Mute Listener
    document.getElementById('btn-mute').onclick = (e) => {
        e.stopPropagation(); // Prevent clicking through to splash
        toggleMute();
    };

      // Fullscreen Toggle
    document.getElementById('btn-fullscreen').onclick = (e) => {
        e.stopPropagation();
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
        playSound('click');
    };

     // --- NEW: Global Login Button Logic ---
    const loginBtn = document.getElementById('btn-login-global');
    
    // Hide login button if playing (optional cleanup)
    if(GAME_STATE.currentUser) loginBtn.style.display = 'none';

    loginBtn.onclick = (e) => {
        e.stopPropagation();
        const modal = document.getElementById('auth-modal');
        const content = document.getElementById('auth-content');
        modal.classList.remove('hidden');

        content.innerHTML = `
            <h2>Player Login</h2>
            <p>Load your owned animals.</p>
            <input type="email" id="login-email" placeholder="Email" style="padding:10px; margin:5px; width:80%; color:black;">
            <input type="password" id="login-pass" placeholder="Password" style="padding:10px; margin:5px; width:80%; color:black;">
            <button id="btn-submit-login-global">Sign In</button>
            <button id="btn-cancel-login-global" style="background:#555;">Cancel</button>
        `;

        document.getElementById('btn-cancel-login-global').onclick = () => {
            modal.classList.add('hidden');
        };

        document.getElementById('btn-submit-login-global').onclick = async () => {
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-pass').value;
            try {
                const res = await fetch('/api/game/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email, password: pass })
                });
                const data = await res.json();
                if(data.success) {
                    GAME_STATE.currentUser = data;
                    checkUnlocks(); // Applies the skins immediately
                    modal.classList.add('hidden');
                    loginBtn.innerText = "✅ " + data.username.split('@')[0]; // Show name
                    loginBtn.style.background = "rgba(0,0,0,0.5)";
                    loginBtn.disabled = true; // Disable button after login
                    playSound('levelup');
                    alert("Login Successful! Your animals are unlocked.");
                } else {
                    alert("Login failed: " + data.message);
                }
            } catch(err) { alert("Server error"); }
        };
    };
    // --------------------------------------

    document.getElementById('splash-screen').onclick = () => {
        document.getElementById('splash-screen').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
        playSound('click');
        playMenuMusic(); // Start Menu Music
    };

    document.getElementById('btn-new-game').onclick = () => {
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('hero-selection').classList.remove('hidden');
        checkUnlocks(); // Fix: Applies TEST_UNLOCK_ALL logic immediately
        playSound('click');
    };

    // New: Back button for Hero Selection
    document.getElementById('btn-back-hero').onclick = () => {
        document.getElementById('hero-selection').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
        // Add this line below:
        document.getElementById('btn-settings-ingame').classList.add('hidden');
         if(!GAME_STATE.currentUser) document.getElementById('btn-login-global').classList.remove('hidden');
        playSound('click');
    };


    document.getElementById('btn-back-settings').onclick = () => {
        document.getElementById('settings-menu').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
        playSound('click');
    };
    
    document.getElementById('btn-animals').onclick = () => {
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('animals-menu').classList.remove('hidden');
        checkUnlocks(); // <--- Add this line
        playSound('click');
    };


    document.getElementById('btn-back-animals').onclick = () => {
        document.getElementById('animals-menu').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
        playSound('click');
    };

        // Roster Toggle
    const rosterBtn = document.getElementById('btn-roster-toggle');
    const rosterList = document.getElementById('roster-list');
    rosterBtn.onclick = () => {
        if(rosterList.classList.contains('hidden')) {
            rosterList.classList.remove('hidden');
            rosterBtn.innerText = "▲ Hide Roster";
        } else {
            rosterList.classList.add('hidden');
            rosterBtn.innerText = "▼ Show Roster";
        }
    };

// Mobile Upgrade Bar Minimize Toggle
    const minBtn = document.getElementById('btn-minimize-upgrades');
    const topBar = document.getElementById('top-bar');
    const birdBar = document.getElementById('birdshot-bar'); // Reference bird bar
    
    minBtn.onclick = (e) => {
        e.stopPropagation(); // Prevent canvas clicks
        if(topBar.classList.contains('minimized-bar')) {
            topBar.classList.remove('minimized-bar');
            birdBar.classList.remove('lowered'); // Raise bar back up
            minBtn.innerText = "▼"; // Arrow down to minimize
        } else {
            topBar.classList.add('minimized-bar');
            birdBar.classList.add('lowered'); // Drop bar down
            minBtn.innerText = "▲"; // Arrow up to expand
        }
        playSound('click');
    };

    document.getElementById('control-scheme').onchange = (e) => {
        GAME_STATE.controlScheme = e.target.value;
    };

    // Hero Selection
    document.querySelectorAll('.hero-card').forEach(card => {
        card.onclick = () => {
            const type = card.getAttribute('data-type');
            startGame(type);
        };
    });

       // In-Game Settings
    document.getElementById('btn-settings-ingame').onclick = () => {
        const menu = document.getElementById('ingame-menu');
        menu.classList.remove('hidden');
        // Pause logic implied (game loop could check for this class)
    };
    document.getElementById('btn-resume').onclick = () => {
        document.getElementById('ingame-menu').classList.add('hidden');
    };
    document.getElementById('btn-exit-main').onclick = () => {
        location.reload(); 
    };
    document.getElementById('btn-restart-current').onclick = () => {
        document.getElementById('ingame-menu').classList.add('hidden');
        // Restart using saved config
        if(GAME_STATE.lastStartConfig) {
            startGame(GAME_STATE.lastStartConfig.heroType);
        } else {
            location.reload();
        }
    };

    // Hero Selection with Locks
    document.querySelectorAll('.hero-card').forEach(card => {
        card.onclick = () => {
            const type = card.getAttribute('data-type');
            const isLocked = card.getAttribute('data-locked') === 'true';

            if(isLocked) {
                handleLockedContent(type);
            } else {
                startGame(type);
            }
        };
    });

['hp', 'spd', 'dmg', 'breed', 'bird'].forEach(stat => {
    document.getElementById(`upg-${stat}`).onclick = () => {
        playSound('click'); 
        attemptUpgrade(stat);
    };
});

 // Flag Canvas Logic
    const fCan = document.getElementById('flag-canvas');
    const fCtx = fCan.getContext('2d');
    let drawing = false;

    // Default white
    fCtx.fillStyle = 'white';
    fCtx.fillRect(0, 0, 200, 120);

    const startDraw = (e) => {
        drawing = true;
        drawOnFlag(e);
    };
    const endDraw = () => drawing = false;
    const drawOnFlag = (e) => {
        if(!drawing) return;
        e.preventDefault(); 
        const rect = fCan.getBoundingClientRect();
        // Handle touch or mouse
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const color = document.getElementById('flag-color').value;
        const size = document.getElementById('flag-size').value;
        const shape = document.getElementById('flag-shape').value;

        fCtx.fillStyle = color;
        fCtx.beginPath();
        if(shape === 'circle') {
            fCtx.arc(x, y, size, 0, Math.PI*2);
            fCtx.fill();
        } else {
            fCtx.fillRect(x - size/2, y - size/2, size, size);
        }
    };

    fCan.addEventListener('mousedown', startDraw);
    fCan.addEventListener('mouseup', endDraw);
    fCan.addEventListener('mousemove', drawOnFlag);
    // Touch support
    fCan.addEventListener('touchstart', startDraw);
    fCan.addEventListener('touchend', endDraw);
    fCan.addEventListener('touchmove', drawOnFlag);

    document.getElementById('btn-clear-flag').onclick = () => {
        fCtx.fillStyle = 'white';
        fCtx.fillRect(0, 0, 200, 120);
    };

    document.getElementById('btn-place-emoji').onclick = () => {
        const emoji = document.getElementById('flag-emoji').value;
        if(emoji) {
            fCtx.font = "50px Arial";
            fCtx.textAlign = "center";
            fCtx.textBaseline = "middle";
            fCtx.fillText(emoji, 100, 60);
        }
    };

    // Game Over Buttons
    document.getElementById('btn-restart').onclick = () => {
        document.getElementById('game-over-modal').classList.add('hidden');
        // Restart with current settings
        startGame(player.baseType);
    };
    document.getElementById('btn-return-menu').onclick = () => {
        location.reload(); // Simple reload to clear state for menu
    };
}

// --- GAME LOGIC CLASSES ---

class Animal {
    constructor(type, x, y, isPlayer, parentHerd = null, sizePercent = 1) {
        this.parentHerd = parentHerd;
        this.type = type; // chimp, deer, dog, etc.
        this.x = x;
        this.y = y;
        this.isPlayer = isPlayer;
        this.sizePercent = sizePercent; // 0.1 to 1.0
        
        // We use noise-like math to make them wander randomly but stay close
        const time = Date.now() * 0.001;
        // Move the "target" offset around in a figure-8 or chaotic pattern
        this.offsetX = Math.sin(time + this.x * 0.1) * 60 + Math.cos(time * 2.5) * 30;
        this.offsetY = Math.cos(time + this.y * 0.1) * 60 + Math.sin(time * 2.5) * 30;

        this.state = 'still'; // still, move, ready, pounce
        this.combatState = null; // null, 'in_cloud'
        this.fightCloudRef = null;

// Visual float
this.floatOffset = 0;
this.floatSpeed = Math.random() * 0.05 + 0.02;
    // Random Independent Movement
this.wanderTimer = 0;
this.wanderTargetX = 0;
this.wanderTargetY = 0;
this.regenTimer = 0; 


        // Stats (calculated from base + upgrades + size)
        this.currentHp = this.getMaxHp();
    }



    getMaxHp() {
        let base = STATS[this.type].hp;
        // Check if player or AI herd
        if(this.isPlayer) {
            base += player.upgrades.hp.level;
        } else if (this.parentHerd && this.parentHerd.upgrades) {
            base += this.parentHerd.upgrades.hp.level;
        }
        return base * this.sizePercent;
    }

    getDamage() {
        let base = STATS[this.type].dmg;
        if(this.isPlayer) base += player.upgrades.damage.level;
        return base * this.sizePercent;
    }

    update(dt, herdCenterX, herdCenterY, herdSpeedStage) {
                // Regen Logic (1 HP every 2 seconds if not fighting)
        if(!this.combatState) {
            this.regenTimer += dt;
            if(this.regenTimer >= 2) {
                this.regenTimer = 0;
                if(this.currentHp < this.getMaxHp()) this.currentHp = Math.min(this.currentHp + 1, this.getMaxHp());
            }
        } else {
            this.regenTimer = 0;
        }
        if(this.combatState === 'in_cloud') return; // Handled by cloud

        // Growth
        if(this.sizePercent < 1.0) {
            this.sizePercent += 0.02 * dt; // Grow over time
            if(this.sizePercent > 1.0) this.sizePercent = 1.0;
        }

// Target Position (Independent Random Wandering)
this.wanderTimer -= dt;

// Calculate dynamic radius so they pick targets further out as herd grows
const countForRadius = this.isPlayer ? player.herd.length : (this.parentHerd ? this.parentHerd.members.length : 1);
let radiusMod = countForRadius * 0.0025;
if(countForRadius > 100) radiusMod += (countForRadius - 100) * 0.0025;
if(countForRadius > 150) radiusMod += (countForRadius - 150) * 0.0025;
const herdRadius = 150 * (1 + radiusMod);

if (this.wanderTimer <= 0) {
    // Pick a new spot within the circle relative to 0,0
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * herdRadius;
    this.wanderTargetX = Math.cos(angle) * dist;
    this.wanderTargetY = Math.sin(angle) * dist;
    // Set time until next move decision (1 to 3 seconds)
    this.wanderTimer = 1 + Math.random() * 2;
}

// Smoothly move offset towards the random target
this.offsetX += (this.wanderTargetX - this.offsetX) * 2 * dt;
this.offsetY += (this.wanderTargetY - this.offsetY) * 2 * dt;

    // -- FIXED PATHFINDING / LEASH LOGIC --
    // Calculate max range based on herd size with tiered spreading
    const herdCount = this.isPlayer ? player.herd.length : (this.parentHerd ? this.parentHerd.members.length : 1);
    
    let spreadMod = herdCount * 0.0025; // Base 0.25% per member
    if(herdCount > 100) spreadMod += (herdCount - 100) * 0.0025; // Additional 0.25% for counts > 100
    if(herdCount > 150) spreadMod += (herdCount - 150) * 0.0025; // Further 0.25% for counts > 150

    const maxRange = 150 * (1 + spreadMod);
    // Check distance of the WANDER TARGET (offsetX/Y) from center
    const wanderDist = Math.sqrt(this.offsetX*this.offsetX + this.offsetY*this.offsetY);
    
    // If wandering too far, pull back hard
    if(wanderDist > maxRange) {
        this.offsetX *= 0.95; 
        this.offsetY *= 0.95;
    }

    const targetX = herdCenterX + this.offsetX;
    const targetY = herdCenterY + this.offsetY;

    // Calculate potential next position
    const nextAnimX = this.x + (targetX - this.x) * 5 * dt;
    const nextAnimY = this.y + (targetY - this.y) * 5 * dt;
    // Pathfinding / Stuck Logic
    let isHardCol = checkHardCollision(nextAnimX, nextAnimY, 10);
    const distToHerd = getDist(this.x, this.y, herdCenterX, herdCenterY);

    // If stuck behind tree/water AND far from herd (>250px), enable "Ghost Mode" to regroup
    if (isHardCol && distToHerd > 250) {
        isHardCol = false; 
    }

    if(!isHardCol) {
        this.x = nextAnimX;
        this.y = nextAnimY;
    } else {
        // Simple sliding: Try moving just X or just Y if diagonal blocked
        if(!checkHardCollision(nextAnimX, this.y, 10)) this.x = nextAnimX;
        else if(!checkHardCollision(this.x, nextAnimY, 10)) this.y = nextAnimY;
    }
// Determine facing direction (FIXED: Swapped logic)
if (targetX < this.x) this.facingLeft = false;
if (targetX > this.x) this.facingLeft = true;

        // Visual Float (Y-axis bob)
        this.floatOffset = Math.sin(Date.now() * 0.005) * 10;

        // Determine State & Animation Speed
        if (herdSpeedStage > 0) {
            this.state = 'move';
        } else {
            this.state = 'still';
        }

        // Logic for collision with enemies/resources happens in main loop
    }

draw(ctx, tick) {
        if(this.combatState === 'in_cloud') return;

        let imgKey = `${this.type}_${this.state}`;
        
        // Base rate 1000ms. 
        // Stage 1 (speed 0.5): 1000ms
        // Stage 2 (speed 0.75): Increase speed by 50% means decrease interval by 1.5x -> 666ms
        // Stage 3 (speed 1.0): Increase again by 1.5x -> 444ms
        let toggleRate = 1000;
        if(player.moveStage === 2) toggleRate = 666;
        if(player.moveStage === 3) toggleRate = 444;

        if(this.state === 'move') {
            if (Math.floor(Date.now() / toggleRate) % 2 === 0) {
                imgKey = `${this.type}_still`;
            }
        }

        let img = ASSETS.images[imgKey];

                // Fix for missing move animations: Fallback to 'still' if specific frame is missing/broken
        if ((!img || !img.complete || img.naturalWidth === 0) && this.state === 'move') {
            img = ASSETS.images[`${this.type}_still`];
        }
        
        // STANDARD SIZE: This fixes the "Way too large" issue.
        // T-Rex is rendered 50% larger
        const baseSize = (this.type === 't-rex') ? 120 : 80; 
        
        // CHECK IF IMAGE IS LOADED AND VALID (Fixes the "Broken State" crash)
        if(!img || !img.complete || img.naturalWidth === 0) {
            // Fallback shape if image is missing/broken
            ctx.fillStyle = this.isPlayer ? 'yellow' : 'red';
            ctx.beginPath();
            ctx.arc(this.x, this.y + this.floatOffset, 20 * this.sizePercent, 0, Math.PI*2);
            ctx.fill();
        } else {
            // Draw image with forced size
            const w = baseSize * this.sizePercent;
            const h = baseSize * this.sizePercent; // Keeps it square, or use aspect ratio if preferred
           ctx.save();
            ctx.translate(this.x, this.y + this.floatOffset);

            // Draw Health Bar
            const hpPct = this.currentHp / this.getMaxHp();
            ctx.fillStyle = "red";
            ctx.fillRect(-20, -baseSize/2 - 10, 40, 5);
            ctx.fillStyle = "#00ff00";
            ctx.fillRect(-20, -baseSize/2 - 10, 40 * hpPct, 5);



            if(this.facingLeft) ctx.scale(-1, 1); // Flip horizontally
            
            // Draw centered at (0,0) because we translated
            ctx.drawImage(img, -w/2, -h/2, w, h);
             ctx.restore();
}
        }
    }


class FightCloud {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.teamPlayer = []; 
        this.teamEnemy = []; 
        this.timer = 0;
        this.particles = [];
        this.texts = [];
        this.lightning = [];
        this.lightningTimer = 0;
        // playSound('fight_start'); // Removed to handle manually
    }

    addCombatant(animal, team) {
        animal.combatState = 'in_cloud';
        animal.fightCloudRef = this;
        if(team === 'player') this.teamPlayer.push(animal);
        else this.teamEnemy.push(animal);
    }

    update(dt) {
        this.timer += dt;
        this.lightningTimer -= dt;

        // Lightning Logic
        if(this.lightningTimer <= 0) {
            this.lightning = [];
            if(Math.random() < 0.5) { // 50% chance every 0.2s
                // Generate Bolt
                let lx = this.x + (Math.random()-0.5)*100;
                let ly = this.y + (Math.random()-0.5)*100;
                let segments = [];
                for(let i=0; i<4; i++) {
                    segments.push({x: lx, y: ly});
                    lx += (Math.random()-0.5)*60;
                    ly += (Math.random()-0.5)*60;
                }
                this.lightning = segments;
                this.lightningColor = ['#FFFF00', '#00FFFF', '#FF00FF'][Math.floor(Math.random()*3)];
            }
            this.lightningTimer = 0.2;
        }

  // Damage Logic (every 1 second)
        if(Math.floor(this.timer) > Math.floor(this.timer - dt)) {
            // Player attacks Enemy
            this.teamPlayer.forEach(p => {
                if(this.teamEnemy.length > 0) {
                    const target = this.teamEnemy[Math.floor(Math.random() * this.teamEnemy.length)];
                    target.currentHp -= p.getDamage();
                    this.addText("pow!", this.x, this.y);
                    // 0.5x Rate Throttle for Hit Sound
                    if(Math.random() > 0.5) playSound('hit');
                    if(target.currentHp <= 0) this.kill(target, 'enemy');
                }
            });

            // Enemy attacks Player
            this.teamEnemy.forEach(e => {
                if(this.teamPlayer.length > 0) {
                    const target = this.teamPlayer[Math.floor(Math.random() * this.teamPlayer.length)];
                    target.currentHp -= e.getDamage();
                    this.addText("oof!", this.x, this.y);
                    // 0.5x Rate Throttle for Hit Sound
                    if(Math.random() > 0.5) playSound('hit');
                    if(target.currentHp <= 0) this.kill(target, 'player');
                }
            });
        }

        // Cleanup empty cloud
        if(this.teamPlayer.length === 0 && this.teamEnemy.length === 0) return false;
        
        if (this.teamPlayer.length === 0) {
             this.teamEnemy.forEach(a => { a.combatState = null; a.fightCloudRef = null; });
             return false;
        } else if (this.teamEnemy.length === 0) {
            this.teamPlayer.forEach(a => { a.combatState = null; a.fightCloudRef = null; });
            return false;
        }

        // Smoke Particles (More frequent)
        if(Math.random() < 0.4) {
            this.particles.push({
                x: this.x + (Math.random()-0.5)*80,
                y: this.y + (Math.random()-0.5)*80,
                r: 20 + Math.random() * 15,
                color: Math.random() < 0.5 ? '#888' : '#ddd',
                life: 1.0
            });
        }
        
        // Update particles
        for(let i=this.particles.length-1; i>=0; i--) {
            let p = this.particles[i];
            p.life -= dt * 0.8;
            p.y -= 20 * dt; // Float up
            p.r += 10 * dt; // Expand
            if(p.life <= 0) this.particles.splice(i, 1);
        }

        // Text update
        this.texts.forEach(t => {
            t.y -= 30 * dt;
            t.life -= dt;
        });
        this.texts = this.texts.filter(t => t.life > 0);

        return true;
    }

    kill(animal, team) {
        playSound('die');
        if(team === 'player') {
            this.teamPlayer = this.teamPlayer.filter(a => a !== animal);
            player.herd = player.herd.filter(a => a !== animal);
        } else {
            this.teamEnemy = this.teamEnemy.filter(a => a !== animal);
            // REMOVE FROM PARENT HERD
            if(animal.parentHerd && animal.parentHerd.members) {
                animal.parentHerd.members = animal.parentHerd.members.filter(m => m !== animal);
            }
            
            // Only give XP if the killer team (teamPlayer) is actually the Human Player
            if(this.teamPlayer.length > 0 && this.teamPlayer[0].isPlayer) {
                const xpMult = (player.type === 'velociraptor' || player.type === 't-rex') ? 2 : 1;
                addXP(2 * xpMult, this.x, this.y);
                
                // --- STATS: Track Kill ---
                const t = animal.type;
                player.stats.killedAnimals[t] = (player.stats.killedAnimals[t] || 0) + 1;

                // --- STATS: Track Herd Elimination ---
                // We already filtered the member out above. If length is now 0, player killed the last one.
                if(animal.parentHerd && animal.parentHerd.members.length === 0) {
                    player.stats.herdsEliminated++;
                }
            }
        }
    }

    addText(txt, x, y) {
        // Random Position Logic
        const offsetX = (Math.random() - 0.5) * 150;
        const offsetY = (Math.random() - 0.5) * 100;
        this.texts.push({
            text: txt,
            x: x + offsetX,
            y: y + offsetY,
            life: 0.8
        });
    }

    draw(ctx) {
        // 1. Draw Smoke/Cloud Particles (Bigger cloud)
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;

        // 2. Draw Lightning
        if(this.lightning.length > 0) {
            ctx.strokeStyle = this.lightningColor;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(this.lightning[0].x, this.lightning[0].y);
            for(let i=1; i<this.lightning.length; i++) {
                ctx.lineTo(this.lightning[i].x, this.lightning[i].y);
            }
            ctx.stroke();
        }

        // 3. Draw Floating Text (Below UI)
        ctx.fillStyle = "white";
        ctx.font = "bold 20px Arial";
        ctx.shadowColor = "black"; ctx.shadowBlur = 3;
        this.texts.forEach(t => {
            ctx.fillText(t.text, t.x, t.y);
        });
        ctx.shadowBlur = 0;

        // 4. VS UI WINDOW (Always on top of cloud)
        this.drawVSWindow(ctx);
    }

    drawVSWindow(ctx) {
        // Calculate Strength
        let pStr = 0;
        this.teamPlayer.forEach(p => pStr += (p.currentHp + p.getDamage()));
        let eStr = 0;
        this.teamEnemy.forEach(e => eStr += (e.currentHp + e.getDamage()));
        
        // Avoid div by zero
        const total = pStr + eStr || 1;
        const pPct = pStr / total;
        
        // Coordinates for Window relative to Cloud
        const wx = this.x - 100;
        const wy = this.y - 180;
        const w = 200;
        const h = 100;

        // Background (Grey)
        ctx.fillStyle = "rgba(80, 80, 80, 0.9)";
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.fillRect(wx, wy, w, h);
        ctx.strokeRect(wx, wy, w, h);

        // VS Text
        ctx.fillStyle = "red";
        ctx.font = "italic bold 30px Arial";
        ctx.textAlign = "center";
        ctx.fillText("VS", this.x, wy + 55);

 // Player Info (Left)
        if(this.teamPlayer.length > 0) {
            const pType = this.teamPlayer[0].type;
            const img = ASSETS.images[`${pType}_still`];
            // ADDED SAFETY CHECK BELOW:
            if(img && img.complete && img.naturalWidth !== 0) {
                ctx.drawImage(img, wx + 10, wy + 10, 40, 40);
            }
            
            // Draw Player Flag (Mini) - ADDED SAFETY CHECK
            if(player.flagImage && player.flagImage.complete && player.flagImage.naturalWidth !== 0) {
                 ctx.drawImage(player.flagImage, wx + 10, wy + 55, 30, 20);
            }

            ctx.fillStyle = "cyan";
            ctx.font = "bold 16px Arial";
            ctx.fillText(this.teamPlayer.length, wx + 30, wy + 90);
        }

  // Enemy Info (Right)
        if(this.teamEnemy.length > 0) {
            const eType = this.teamEnemy[0].type;
            const img = ASSETS.images[`${eType}_still`];
            // ADDED SAFETY CHECK BELOW:
            if(img && img.complete && img.naturalWidth !== 0) {
                ctx.save();
                ctx.scale(-1, 1); // Flip enemy image
                ctx.drawImage(img, -(wx + w - 10), wy + 10, 40, 40);
                ctx.restore();
            }

            // Enemy Flag (Color box)
            if(this.teamEnemy[0].parentHerd) {
                ctx.fillStyle = this.teamEnemy[0].parentHerd.flagColor;
                ctx.fillRect(wx + w - 40, wy + 55, 30, 20);
            }

            ctx.fillStyle = "orange";
            ctx.font = "bold 16px Arial";
            ctx.fillText(this.teamEnemy.length, wx + w - 30, wy + 90);
        }

        // Strength Bar (Bottom of window)
        ctx.fillStyle = "#444";
        ctx.fillRect(wx + 10, wy + 95, 180, 10); // BG
        // Player Bar
        ctx.fillStyle = "cyan";
        ctx.fillRect(wx + 10, wy + 95, 180 * pPct, 10);
    }
}

// --- GAME FUNCTIONS ---

function startGame(heroType) {
GAME_STATE.lastStartConfig = { heroType };
      // Capture Flag
    const fCan = document.getElementById('flag-canvas');
    player.flagImage = new Image();
    player.flagImage.src = fCan.toDataURL();
      player.humanAge = 0; // 0=Paleo, 1=Bronze, etc.
    // Capture Enemy Count
    const enemyCount = parseInt(document.getElementById('herd-slider').value);
    // Capture Map Size
    const mapPct = parseInt(document.getElementById('map-size-slider').value) / 100;
    world.width = 6000 * mapPct;
    world.height = 6000 * mapPct;

    // Capture Herd Color
    player.herdColor = document.getElementById('herd-color-picker').value;
        // Capture Difficulty
    GAME_STATE.difficulty = document.getElementById('difficulty-select').value;

        document.getElementById('hero-selection').classList.add('hidden');
    document.getElementById('global-background').style.display = 'none'; // Fix: Hide spinning background
    document.getElementById('game-ui').classList.remove('hidden');
        // Ensure icons are visible (already visible via HTML fix, but safe to keep)
    document.getElementById('top-right-icons').classList.remove('hidden');
    document.getElementById('btn-login-global').classList.add('hidden'); // Hide login during gameplay
        document.getElementById('btn-settings-ingame').classList.remove('hidden'); // Show Settings button
    // Hide Global Background again to be safe
    document.getElementById('global-background').style.display = 'none';
    
    player.baseType = heroType;
    player.type = heroType;
  player.herd = [];
    player.xp = 0;
    player.totalXp = 0; 
    player.mapTimer = 0; 
    player.growthAccumulator = 0;

        // STATS TRACKING
    player.stats = {
        killedAnimals: {}, // Map 'type' -> count
        herdsEliminated: 0,
        monolithTime: 0,
        birdshots: 0,
        totalSpawned: 3 // Starts with 3
    };
    
    // 1. SPAWN WORLD FIRST (Generates Water/Trees)
    spawnWorld(); 

    // 2. NOW FIND SAFE PLAYER POS
    const startPos = findSafeSpawnLocation(100); // 100px buffer for player
    player.pos = {x: startPos.x, y: startPos.y};

    player.velocity = {x:0, y:0};
    player.moveTime = 0; 
    player.moveStage = 0;
    player.monolithTimer = 0;
    updateStatsUI();
    
    playGameMusic(); 
    
    playSound(`choose_${heroType}`); 
    
    for(let i=0; i<3; i++) {
        player.herd.push(new Animal(heroType, player.pos.x, player.pos.y, true, null));
    }

    world.enemyHerds = []; 
    spawnEnemyHerds(enemyCount);

    GAME_STATE.screen = 'game';
}

function spawnEnemyHerds(count) {
    // REMOVED: world.enemyHerds = []; so we don't wipe existing herds
    const types = ['dog', 'chimp', 'deer', 'snake', 'pig', 'anteater', 'cat'];
    for(let i=0; i<count; i++) {
        const type = types[Math.floor(Math.random()*types.length)];
        
  // Use global safe finder (200px padding for whole herd)
        const safeLoc = findSafeSpawnLocation(200);
        let startX = safeLoc.x;
        let startY = safeLoc.y;

        // Note: The global helper handles Water/Trees/Walls.
        // We accept that herds might spawn vaguely near each other or the player 
        // to prioritize NOT spawning in water/trees, which causes bugs.

        const herd = {
            center: { x: startX, y: startY },
            members: [],
            dir: Math.random() * 6.28,
                        stuckTimer: 0, // <--- Add this
            lastPos: { x: startX, y: startY }, // <--- Add this
            timer: 0,
            flagColor: `hsl(${Math.floor(Math.random()*360)}, 70%, 50%)`,
            // AI Logic Properties
            xp: 0,
            totalXp: 0, // Track lifetime XP for score
            birdCooldown: 0, // AI Birdshot
            growthAccumulator: 0,
            upgrades: {
                hp: { level: 0 },
                speed: { level: 0 },
                damage: { level: 0 },
                breed: { level: 0 }
            }
        };
        // Add 3 animals to this enemy herd
        for(let j=0; j<3; j++) {
    // Pass 'herd' object as the parentHerd argument
    herd.members.push(new Animal(type, herd.center.x, herd.center.y, false, herd));         }
        world.enemyHerds.push(herd);
    }
}

function spawnWorld() {
    generateWater(); 
    const areaMod = (world.width / 5000) ** 2; // Scale counts by map area
    world.entities = [];

    // 1. Spawn Trees (Obstacles)
    for(let i=0; i < 80 * areaMod; i++) {
        // Check only water/walls for trees initially (radius 30 to stay clear of water)
        const pos = findSafeSpawnLocation(30);
        if(pos) {
            world.entities.push({ type: 'tree', x: pos.x, y: pos.y });
        }
    }

    // 2. Spawn Rabbits
    for(let i=0; i < 42 * areaMod; i++) {
        const pos = findSafeSpawnLocation(10);
        if(pos) {
            world.entities.push({
                type: 'rabbit',
                x: pos.x,
                y: pos.y,
                dir: Math.random() * Math.PI * 2,
                changeDirTimer: 0
            });
        }
    }

    // 3.5 Spawn Map Items (Rare)
    for(let i=0; i<3; i++) {
        const pos = findSafeSpawnLocation(30);
        if(pos) {
            world.entities.push({ type: 'map', x: pos.x, y: pos.y });
        }
    }

    // 3.6 Spawn Birdshot Powerups (Rare)
    for(let i=0; i<3; i++) {
        const pos = findSafeSpawnLocation(30);
        if(pos) {
            world.entities.push({ type: 'birdshot', x: pos.x, y: pos.y });
        }
    }

    // 3.7 Spawn Herd Doubler (Very Rare)
    for(let i=0; i<2; i++) {
        const pos = findSafeSpawnLocation(40);
        if(pos) {
            world.entities.push({ type: 'double', x: pos.x, y: pos.y });
        }
    }

    // 4. Spawn Grass & Apples (Avoid Water AND Trees)
    const spawnResource = (type, count) => {
        for(let i=0; i<count; i++) {
            const pos = findSafeSpawnLocation(10); 
            if(pos) {
                // Extra check: Do not overlap other apples/grass closely
                let overlap = false;
                for(let e of world.entities) {
                    if((e.type === 'grass' || e.type === 'apple') && getDist(pos.x, pos.y, e.x, e.y) < 20) {
                        overlap = true; 
                        break;
                    }
                }
                if(!overlap) {
                    world.entities.push({ type: type, x: pos.x, y: pos.y });
                }
            }
        }
    };

    spawnResource('grass', Math.floor(300 * areaMod));
    
    // Modified Apple Spawning (50% near trees)
    for(let i=0; i < 40 * areaMod; i++) {
        let pos;
        if(Math.random() < 0.5) {
            // Find a random tree
            const trees = world.entities.filter(e => e.type === 'tree');
            if(trees.length > 0) {
                const tree = trees[Math.floor(Math.random() * trees.length)];
                // Spawn within 60px of tree
                const angle = Math.random() * Math.PI * 2;
                const dist = 30 + Math.random() * 30;
                pos = { x: tree.x + Math.cos(angle)*dist, y: tree.y + Math.sin(angle)*dist };
                // Ensure bounds
                if(checkHardCollision(pos.x, pos.y, 10)) pos = findSafeSpawnLocation(10);
            } else { pos = findSafeSpawnLocation(10); }
        } else {
            pos = findSafeSpawnLocation(10);
        }
        if(pos) world.entities.push({ type: 'apple', x: pos.x, y: pos.y });
    }
}

function updateStatsUI() {
    document.getElementById('xp-display').innerText = Math.floor(player.xp);
    
    // Update upgrade buttons
    const maps = { 
        'hp': player.upgrades.hp, 
        'spd': player.upgrades.speed, 
        'dmg': player.upgrades.damage,
        'breed': player.upgrades.breed,
        'bird': player.upgrades.bird 
    };
    for(let k in maps) {
        const btn = document.getElementById(`upg-${k}`);
        const costSpan = btn.querySelector('.cost');
        costSpan.innerText = `(${maps[k].cost}xp)`;
        
        if(player.xp >= maps[k].cost) btn.classList.remove('disabled');
        else btn.classList.add('disabled');
    }

    // Update Stats Bar
    const pStats = STATS[player.type];
    const hp = pStats.hp + player.upgrades.hp.level;
    const spd = pStats.speed + (player.upgrades.speed.level * pStats.speed * 0.02);
    const dmg = pStats.dmg + player.upgrades.damage.level;
    
    // Dynamic Breed Calculation (Matches updateGame logic)
    let baseBreed = 10;
    if(player.type === 'snake') baseBreed = 20;
    if(player.type === 'velociraptor' || player.type === 't-rex') baseBreed = 6.5;
    
    const breed = baseBreed + (player.upgrades.breed.level * 0.5);

    document.getElementById('stat-hp').innerText = Math.floor(hp);
    document.getElementById('stat-spd').innerText = spd.toFixed(1);
    document.getElementById('stat-dmg').innerText = Math.floor(dmg);
    document.getElementById('stat-breed').innerText = breed.toFixed(1);
}

function attemptUpgrade(stat) {
    // Map the HTML ID codes to the Player Data keys
    let key = stat;
    if (stat === 'spd') key = 'speed';
    if (stat === 'dmg') key = 'damage';
    if (stat === 'breed') key = 'breed';
    if (stat === 'bird') key = 'bird';

    const data = player.upgrades[key];
    
    // Safety check to ensure data exists
    if (!data) return; 

       if(player.xp >= data.cost) {
        // Chicken Penalty: Upgrades only 70% effective
        if(player.baseType === 'chicken') {
            // We increment by 0.7 internally, but data.level is usually an integer. 
            // We will handle the math in updateStatsUI/Game loops, but here we just increment level normally.
            // However, to keep it clean with your existing system, we will keep level as int and adjust calculation.
        }
        player.xp -= data.cost;
        data.level++;
        data.cost++;
        playSound('levelup');
        updateStatsUI();
    }
}

function fireBirdshot(targetX = null, targetY = null) {
    if(player.birdCooldown > 0) return;
    
    let cd = player.birdMaxCooldown - (player.upgrades.bird.level * 0.25);
    // 50% cooldown if powerup active
    if(player.birdPowerupTimer > 0) cd *= 0.4;
    
    player.birdCooldown = Math.max(0, cd);
    
    // Calculate direction relative to center screen (player position)
    // Use provided target args (Touch) or global mouse (Desktop)
    const rawX = (targetX !== null) ? targetX : GAME_STATE.mouse.x;
    const rawY = (targetY !== null) ? targetY : GAME_STATE.mouse.y;

    const dx = rawX - canvas.width/2;
    const dy = rawY - canvas.height/2;
    const baseAngle = Math.atan2(dy, dx);
    const isEagle = player.monolithTimer > 0;
    
    const spawnProj = (ang) => {
        world.projectiles.push({
            x: player.pos.x,
            y: player.pos.y,
            vx: Math.cos(ang) * 800,
            vy: Math.sin(ang) * 800,
            type: isEagle ? 'eagle' : 'sparrow',
            damage: 15 + player.upgrades.bird.level,
            hp: 10 + player.upgrades.bird.level,
            isEagle: isEagle
        });
    };

    spawnProj(baseAngle); // Center shot

    // Powerup: Two extra shots at 45 degrees (0.785 radians)
    if(player.birdPowerupTimer > 0) {
        spawnProj(baseAngle - 0.436);
        spawnProj(baseAngle + 0.436);
    }
    
    playSound(isEagle ? 'eagle' : 'sparrow');
        player.stats.birdshots++;
}

function addXP(amount, x = null, y = null) {
    player.xp += amount;
    player.totalXp += amount; // Track lifetime
    
    // Default to player positionif no coordinates provided
    const tx = x || player.pos.x;
    const ty = y || player.pos.y;

    // Floating Text
    const cloud = new FightCloud(tx, ty);
    cloud.addText(`+${amount} XP`, tx, ty);
    world.clouds.push(cloud);


    updateStatsUI();
}

// --- MAIN LOOP ---

function loop(timestamp) {
    // Cap dt at 0.1 seconds (100ms) to prevent physics explosions on tab switch
    const dt = Math.min((timestamp - GAME_STATE.lastTime) / 1000, 0.1) || 0;
    GAME_STATE.lastTime = timestamp;

    if(GAME_STATE.screen === 'game') {
        updateGame(dt);
        drawGame(dt);
    }   else {
        // Clear canvas so the CSS #global-background is visible
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    requestAnimationFrame(loop);
}

function updateGame(dt) {
    if(player.birdCooldown > 0) player.birdCooldown -= dt;
    // Update Birdshot UI
    const bBar = document.getElementById('birdshot-fill');
    const bText = document.getElementById('birdshot-text');
    if(player.birdCooldown <= 0) {
        bBar.style.width = '100%';
        bText.innerText = GAME_STATE.isMobile ? "TAP FOR BIRDSHOT" : "SPACE FOR BIRDSHOT";
    } else {
        const pct = 100 - ((player.birdCooldown / player.birdMaxCooldown) * 100);
        bBar.style.width = `${pct}%`;
        bText.innerText = player.birdCooldown.toFixed(1) + "s";
    }

    // 0. Respawn Logic (Every 30s)
    world.respawnTimer += dt;
    if(world.respawnTimer >= 30) {
        world.respawnTimer = 0;

        for(let i=0; i<10; i++) { 
            const p = findSafeSpawnLocation(10);
            world.entities.push({type: 'grass', x: p.x, y: p.y});
        }
        for(let i=0; i<2; i++) { 
            const p = findSafeSpawnLocation(10);
            world.entities.push({type: 'apple', x: p.x, y: p.y});
        }
        for(let i=0; i<5; i++) { 
             const p = findSafeSpawnLocation(10);
             world.entities.push({type: 'rabbit', x: p.x, y: p.y, dir: 0, changeDirTimer: 0});
        }
        // Monoliths
        const monos = world.entities.filter(e => e.type === 'monolith').length;
        if(monos < 5) {
            const p = findSafeSpawnLocation(60);
            world.entities.push({type: 'monolith', x: p.x, y: p.y});
        }
         // Maps
        const maps = world.entities.filter(e => e.type === 'map').length;
        if(maps < 3) {
            const p = findSafeSpawnLocation(30);
            world.entities.push({type: 'map', x: p.x, y: p.y});
        }
        // Birdshots
        const birds = world.entities.filter(e => e.type === 'birdshot').length;
        if(birds < 3) {
            const p = findSafeSpawnLocation(30);
            world.entities.push({type: 'birdshot', x: p.x, y: p.y});
        }
        // Doublers (Ensure at least 2 exist)
        const doubles = world.entities.filter(e => e.type === 'double').length;
        if(doubles < 2) {
            const p = findSafeSpawnLocation(40);
            world.entities.push({type: 'double', x: p.x, y: p.y});
        }
    }

    // NEW: Herd Spawn Logic (Every 60s if < 15 herds)
    GAME_STATE.herdSpawnTimer += dt;
    if(GAME_STATE.herdSpawnTimer >= 60) {
        GAME_STATE.herdSpawnTimer = 0;
        const totalHerds = 1 + world.enemyHerds.length; 
        if(totalHerds < 15) {
            spawnEnemyHerds(1); 
            const p = player.pos;
            const cloud = new FightCloud(p.x, p.y - 100);
            cloud.addText("⚠️ NEW HERD ENTERED!", p.x, p.y - 100);
            world.clouds.push(cloud);
        }
    }

    // 1. Growth Logic
    let baseBreed = 0.10;
    if(player.type === 'snake') baseBreed = 0.20;
    if(player.type === 'velociraptor' || player.type === 't-rex') baseBreed = 0.065; 
    const breedPct = baseBreed + (player.upgrades.breed.level * 0.005);
    const growthRate = (player.herd.length * breedPct) / 15;
    player.growthAccumulator += growthRate * dt;

    if(player.growthAccumulator >= 1) {
        player.growthAccumulator -= 1;
        if(player.herd.length < 200) {
            player.herd.push(new Animal(player.type, player.pos.x, player.pos.y, true, null, 0.2));
            playSound('population_up'); 
             player.stats.totalSpawned++;
        }
    }

    if(player.birdPowerupTimer > 0) player.birdPowerupTimer -= dt;
    
    // 2. Monolith Timer UI
    const monoUi = document.getElementById('monolith-timer-ui');
    if(player.monolithTimer > 0) {
        player.monolithTimer -= dt;
        player.stats.monolithTime += dt;
        monoUi.classList.remove('hidden');
        document.getElementById('mono-time-val').innerText = Math.ceil(player.monolithTimer);
        
        if(player.monolithTimer <= 0) {
            revertMonolith();
            monoUi.classList.add('hidden');
        }
    }

    // Map Timer UI
    const mapUi = document.getElementById('map-timer-ui');
    if(player.mapTimer > 0) {
        player.mapTimer -= dt;
        mapUi.classList.remove('hidden');
        document.getElementById('map-time-val').innerText = Math.ceil(player.mapTimer);
        if(player.mapTimer <= 0) mapUi.classList.add('hidden');
    }

     // Birdshot Timer UI
    const birdUi = document.getElementById('birdshot-timer-ui');
    if(player.birdPowerupTimer > 0) {
        birdUi.classList.remove('hidden');
        document.getElementById('bird-time-val').innerText = Math.ceil(player.birdPowerupTimer);
    } else {
        birdUi.classList.add('hidden');
    }

    // 3. Movement Physics (Player)
    let inputVector = { x: 0, y: 0 };
    let moving = false;

    if(GAME_STATE.controlScheme === 'wasd') {
        if(GAME_STATE.keys.w) inputVector.y = -1;
        if(GAME_STATE.keys.s) inputVector.y = 1;
        if(GAME_STATE.keys.a) inputVector.x = -1;
        if(GAME_STATE.keys.d) inputVector.x = 1;
        if(inputVector.x !== 0 || inputVector.y !== 0) moving = true;
    } else {
        if(GAME_STATE.mouse.active) {
            const dx = GAME_STATE.mouse.x - canvas.width/2;
            const dy = GAME_STATE.mouse.y - canvas.height/2;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if(dist > 25) { 
                inputVector.x = dx / dist;
                inputVector.y = dy / dist;
                moving = true;
            }
        }
    }

    const stats = STATS[player.type];
    let speedMult = 1;
    let maxSpeed = stats.speed + (player.upgrades.speed.level * stats.speed * 0.02);
    if(player.monolithTimer > 0) maxSpeed *= 1.2; 

    if(moving) {
        player.moveTime += dt;
        if(player.moveTime < 1.5) { speedMult = 0.5; player.moveStage = 1; } 
        else if (player.moveTime < 3.0) { speedMult = 0.75; player.moveStage = 2; } 
        else { speedMult = 1.0; player.moveStage = 3; }
    } else {
        player.moveTime = 0; player.moveStage = 0; speedMult = 0;
    }

    const penalty = Math.max(0, (player.herd.length - 1) * 0.0025);
    const finalSpeedMult = Math.max(0.1, speedMult - penalty);
    const speed = maxSpeed * finalSpeedMult * 60 * dt; 
    
    let nextX = player.pos.x + inputVector.x * speed;
    let nextY = player.pos.y + inputVector.y * speed;

    const isCroc = (player.type === 'crocodile');
    if(!checkHardCollision(nextX, nextY, 20, isCroc)) {
        player.pos.x = nextX;
        player.pos.y = nextY;
    }
    player.pos.x = Math.max(0, Math.min(world.width, player.pos.x));
    player.pos.y = Math.max(0, Math.min(world.height, player.pos.y));

    // 4. Update Entities (World)
    world.entities.forEach((ent, index) => {
        if(ent.type === 'rabbit') {
            ent.changeDirTimer -= dt;
            if(ent.changeDirTimer <= 0) {
                ent.dir = Math.random() * Math.PI * 2;
                ent.changeDirTimer = Math.random() * 2 + 1;
            }
            const rSpeed = STATS.rabbit.speed * 60 * dt;
            const nextRx = ent.x + Math.cos(ent.dir) * rSpeed;
            const nextRy = ent.y + Math.sin(ent.dir) * rSpeed;
            if(!checkHardCollision(nextRx, nextRy, 5)) {
                ent.x = nextRx;
                ent.y = nextRy;
            } else { ent.dir = Math.random() * Math.PI * 2; }
            if(ent.x < 0) ent.x = 0; if(ent.x > world.width) ent.x = world.width;
            if(ent.y < 0) ent.y = 0; if(ent.y > world.height) ent.y = world.height;
        }
    });

    // 5. Collision & Interactions (Player & AI vs Items)
    for (let i = world.entities.length - 1; i >= 0; i--) {
        const ent = world.entities[i];
        let eaten = false;

        // Player Eating Logic
        for(let j = 0; j < player.herd.length; j++) {
            const member = player.herd[j];
            const dist = getDist(member.x, member.y, ent.x, ent.y);

            if(dist < 50) {
                const memberDiet = STATS[member.type].diet;
                if(ent.type === 'monolith') {
                    activateMonolith();
                    world.entities.splice(i, 1);
                    eaten = true;
                }
                else if (ent.type === 'birdshot') {
                    player.birdPowerupTimer = 60;
                    playSound('levelup'); 
                    world.entities.splice(i, 1);
                    eaten = true;
                }
                else if (ent.type === 'map') {
                    player.mapTimer = 60; 
                    playSound('levelup'); 
                    world.entities.splice(i, 1);
                    eaten = true;
                }
                else if (ent.type === 'double') {
                    // PLAYER EATS DOUBLER
                    const currentCount = player.herd.length;
                    const toAdd = Math.min(currentCount, 200 - currentCount);
                    for(let k=0; k<toAdd; k++) {
                        player.herd.push(new Animal(player.type, player.pos.x, player.pos.y, true, null));
                    }
                    const cloud = new FightCloud(ent.x, ent.y);
                    cloud.addText(`x2 HERD! (+${toAdd})`, ent.x, ent.y);
                    world.clouds.push(cloud);
                    playSound('levelup'); 
                    world.entities.splice(i, 1);
                    eaten = true;
                }
                else if (ent.type === 'grass' && (memberDiet === 'herbivore' || memberDiet === 'omnivore')) {
                    addXP(1, ent.x, ent.y);
                    playSound('pickup');
                    world.entities.splice(i, 1); 
                    eaten = true;
                }
                else if (ent.type === 'apple' && (memberDiet === 'herbivore' || memberDiet === 'omnivore')) {
                    addXP(3, ent.x, ent.y);
                    playSound('pickup');
                    world.entities.splice(i, 1); 
                    eaten = true;
                }
                else if (ent.type === 'rabbit' && (memberDiet === 'carnivore' || memberDiet === 'omnivore')) {
                    const xpAmt = (player.type === 'dog') ? 10 : 5; 
                    addXP(xpAmt, ent.x, ent.y);
                    playSound('pickup');
                    world.entities.splice(i, 1); 
                    world.clouds.push(new FightCloud(ent.x, ent.y)); 
                    world.clouds[world.clouds.length-1].addText("Eaten!", ent.x, ent.y);
                    eaten = true;
                }
            }
            if(eaten) break; 
        }

        // AI Eating Logic
        if(!eaten) {
            for(let h of world.enemyHerds) {
                if(getDist(h.center.x, h.center.y, ent.x, ent.y) < 150) {
                    const diet = STATS[h.members[0].type].diet;
                    for(let m of h.members) {
                         if(getDist(m.x, m.y, ent.x, ent.y) < 40) {
                            let aiAte = false;
                            
                            if (ent.type === 'grass' && (diet === 'herbivore' || diet === 'omnivore')) aiAte = true;
                            else if (ent.type === 'apple' && (diet === 'herbivore' || diet === 'omnivore')) { aiAte = true; h.xp += 2; } 
                            else if (ent.type === 'rabbit' && (diet === 'carnivore' || diet === 'omnivore')) { aiAte = true; h.xp += 5; } 
                            else if (ent.type === 'monolith') { aiAte = true; h.xp += 10; playSound('monolith'); } 
                            else if (ent.type === 'birdshot') { aiAte = true; h.birdCooldown = 0; } 
                            else if (ent.type === 'map') { aiAte = true; h.xp += 5; }
                            else if (ent.type === 'double') { 
                                // AI EATS DOUBLER
                                aiAte = true; 
                                const currentCount = h.members.length;
                                const toAdd = Math.min(currentCount, 200 - currentCount);
                                for(let k=0; k<toAdd; k++) {
                                    h.members.push(new Animal(h.members[0].type, h.center.x, h.center.y, false, h));
                                }
                                const cloud = new FightCloud(ent.x, ent.y);
                                cloud.addText(`AI DOUBLED!`, ent.x, ent.y);
                                world.clouds.push(cloud);
                            }

                            if(aiAte) {
                                h.xp += 1; h.totalXp += 1;
                                world.entities.splice(i, 1);
                                eaten = true;
                                break; 
                            }
                         }
                    }
                }
                if(eaten) break; 
            }
        }
    }

    // 5.5 Herd vs Herd Combat
    world.enemyHerds.forEach(enemyHerd => {
        let collisionFound = false;
        let fightX = 0, fightY = 0;
        for(let p of player.herd) {
            if(p.combatState === 'in_cloud') continue;
            for(let e of enemyHerd.members) {
                if(e.combatState === 'in_cloud') continue;
                if(getDist(p.x, p.y, e.x, e.y) < 50) {
                    collisionFound = true;
                    fightX = (p.x + e.x) / 2;
                    fightY = (p.y + e.y) / 2;
                    break;
                }
            }
            if(collisionFound) break;
        }

        if(collisionFound) {
            const camX = player.pos.x;
            const camY = player.pos.y;
            const screenDist = getDist(fightX, fightY, camX, camY);
            if(screenDist < 1000) {
                playSound('fight_start');
                playSound(`${player.type}-fight`); 
                if(enemyHerd.members.length > 0) playSound(`${enemyHerd.members[0].type}-fight`);
            }
            const cloud = new FightCloud(fightX, fightY);
            player.herd.forEach(p => {
                if(getDist(p.x, p.y, fightX, fightY) < 150 && !p.combatState) cloud.addCombatant(p, 'player');
            });
            enemyHerd.members.forEach(e => {
                if(getDist(e.x, e.y, fightX, fightY) < 150 && !e.combatState) cloud.addCombatant(e, 'enemy');
            });
            world.clouds.push(cloud);
            console.log(`[FIGHT STARTED] Player VS Enemy`);
        }
    });

    // AI vs AI Combat
    for(let i=0; i<world.enemyHerds.length; i++) {
        for(let j=i+1; j<world.enemyHerds.length; j++) {
            const h1 = world.enemyHerds[i];
            const h2 = world.enemyHerds[j];
            const h1Busy = h1.members.some(m => m.combatState);
            const h2Busy = h2.members.some(m => m.combatState);
            if(h1Busy || h2Busy) continue;

            let touching = false;
            let fightPos = {x: 0, y: 0};
            for(let m1 of h1.members) {
                for(let m2 of h2.members) {
                    if(getDist(m1.x, m1.y, m2.x, m2.y) < 50) {
                        touching = true;
                        fightPos.x = (m1.x + m2.x) / 2;
                        fightPos.y = (m1.y + m2.y) / 2;
                        break;
                    }
                }
                if(touching) break;
            }

            if(touching) {
                 const cloud = new FightCloud(fightPos.x, fightPos.y);
                 h1.members.forEach(m => { if(!m.combatState && getDist(m.x, m.y, fightPos.x, fightPos.y) < 150) cloud.addCombatant(m, 'player'); }); 
                 h2.members.forEach(m => { if(!m.combatState && getDist(m.x, m.y, fightPos.x, fightPos.y) < 150) cloud.addCombatant(m, 'enemy'); });
                 world.clouds.push(cloud);
            }
        }
    }

    // Projectiles Update
    for(let i=world.projectiles.length-1; i>=0; i--) {
        let p = world.projectiles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if(checkHardCollision(p.x, p.y, 5)) { world.projectiles.splice(i, 1); continue; }

        // AI shooting Player
        if (p.ownerHerd) { 
            if (getDist(p.x, p.y, player.pos.x, player.pos.y) < 100) {
                const cloud = new FightCloud(p.x, p.y);
                const bird = new Animal(p.type, p.x, p.y, false, null); 
                bird.currentHp = p.isEagle ? p.hp * 2 : p.hp;
                bird.getDamage = () => (p.isEagle ? p.damage * 2 : p.damage);
                cloud.addCombatant(bird, 'enemy'); 
                player.herd.forEach(m => {
                    if (getDist(m.x, m.y, p.x, p.y) < 150 && !m.combatState) cloud.addCombatant(m, 'player');
                });
                world.clouds.push(cloud);
                world.projectiles.splice(i, 1);
                continue; 
            }
        }
        // Player shooting AI
        let hit = false;
        for(let h of world.enemyHerds) {
            if (p.ownerHerd === h) continue; 
            if(getDist(p.x, p.y, h.center.x, h.center.y) < 100) {
                const cloud = new FightCloud(p.x, p.y);
                const bird = new Animal(p.type, p.x, p.y, true, null);
                bird.currentHp = p.isEagle ? p.hp * 2 : p.hp;
                bird.getDamage = () => (p.isEagle ? p.damage * 2 : p.damage);
                cloud.addCombatant(bird, 'player');
                h.members.forEach(m => {
                    if(getDist(m.x, m.y, p.x, p.y) < 150 && !m.combatState) cloud.addCombatant(m, 'enemy');
                });
                world.clouds.push(cloud);
                world.projectiles.splice(i, 1);
                hit = true;
                break;
            }
        }
        if(hit) continue;
    }

    // 6. Update Fight Clouds
    world.clouds = world.clouds.filter(cloud => cloud.update(dt));

    // 7. Update Player Herd (Zoom)
    const count = player.herd.length;
    let zoomDrop = 0;
    if (count > 3) {
        const stage1 = Math.min(count, 100) - 3;
        zoomDrop += stage1 * 0.005;
        if (count > 100) {
            const stage2 = Math.min(count, 200) - 100;
            zoomDrop += stage2 * 0.0025;
        }
        if (count > 200) {
            const stage3 = count - 200;
            zoomDrop += stage3 * 0.00125;
        }
    }
    let baseZoomTarget = Math.max(0.1, 1.0 - zoomDrop);
    if(player.type === 't-rex') baseZoomTarget *= 0.85; 
    GAME_STATE.camera.zoom += (baseZoomTarget - GAME_STATE.camera.zoom) * 0.1;

    // AI MOVEMENT UPDATES (STUCK FIX)
    for(let i = world.enemyHerds.length - 1; i >= 0; i--) {
        let herd = world.enemyHerds[i];
        herd.members = herd.members.filter(m => m.currentHp > 0);

        if(herd.members.length === 0) {
            addXP(10, herd.center.x, herd.center.y);
            const cloud = new FightCloud(herd.center.x, herd.center.y);
            cloud.addText("💀 HERD DEFEATED", herd.center.x, herd.center.y - 30);
            cloud.addText("🏆 Victory! +10XP", herd.center.x, herd.center.y + 10);
            world.clouds.push(cloud); 
            world.enemyHerds.splice(i, 1);
            continue;
        }

        // Stats & Growth
        let difficultyMult = 1.0;
        if(GAME_STATE.difficulty === 'medium') difficultyMult = 1.33; 
        if(GAME_STATE.difficulty === 'hard') difficultyMult = 1.75;   
        const gain = (0.5 * difficultyMult) * dt;
        herd.xp += gain;
        herd.totalXp += gain; 
        
        if(herd.xp > 5) {
            const stats = ['hp', 'speed', 'damage', 'breed'];
            const pick = stats[Math.floor(Math.random() * stats.length)];
            herd.upgrades[pick].level++;
            herd.xp -= 5;
        }

        let diffBreedMod = 0;
        if(GAME_STATE.difficulty === 'medium') diffBreedMod = 0.025; 
        if(GAME_STATE.difficulty === 'hard') diffBreedMod = 0.075;   
        const breedPct = 0.10 + diffBreedMod + (herd.upgrades.breed.level * 0.005);
        const growthRate = (herd.members.length * breedPct) / 15;
        herd.growthAccumulator += growthRate * dt;
        
        if(herd.growthAccumulator >= 1) {
            herd.growthAccumulator = 0;
            if(herd.members.length < 200) {
                herd.members.push(new Animal(herd.members[0].type, herd.center.x, herd.center.y, false, herd, 0.2));
            }
        }

        if(herd.birdCooldown > 0) herd.birdCooldown -= dt;
        else {
            const distToP = getDist(herd.center.x, herd.center.y, player.pos.x, player.pos.y);
            if(distToP < 500) { 
                herd.birdCooldown = 30; 
                const angle = Math.atan2(player.pos.y - herd.center.y, player.pos.x - herd.center.x);
                world.projectiles.push({
                    x: herd.center.x, y: herd.center.y,
                    vx: Math.cos(angle) * 800, vy: Math.sin(angle) * 800,
                    type: 'sparrow', damage: 15, hp: 10, isEagle: false,
                    ownerHerd: herd 
                });
            }
        }

        // --- NEW AI STUCK FIX ---
        // Init properties
        if (typeof herd.avoidTimer === 'undefined') herd.avoidTimer = 0;
        if (typeof herd.avoidAngle === 'undefined') herd.avoidAngle = 0;
        if (typeof herd.targetX === 'undefined') { herd.targetX = herd.center.x; herd.targetY = herd.center.y; }

     // Decision Logic (only if not avoiding)
        if(herd.avoidTimer <= 0) {
            let foundInterest = false;
            
            // --- AI TUNING ---
            let fleeRange = 500;       // Distance to run from stronger player
            let powerupRange = 1500;   // INCREASED: Distance to smell Monoliths/Doublers (High Priority)
            let foodRange = 400;       // Distance to look for grass/apples (Low Priority)
            // -----------------
            
            // 1. Flee from Player (Highest Priority: Survival)
            const distToP = getDist(herd.center.x, herd.center.y, player.pos.x, player.pos.y);
            if(distToP < fleeRange && player.herd.length > herd.members.length * 1.5) {
                const dx = herd.center.x - player.pos.x;
                const dy = herd.center.y - player.pos.y;
                herd.targetX = herd.center.x + dx;
                herd.targetY = herd.center.y + dy;
                foundInterest = true;
            }

            // 2. Seek Powerups (Double/Monolith/Birdshot) - INCREASED RANGE
            if(!foundInterest) {
                let bestDist = 9999;
                for(let ent of world.entities) {
                    if(['double','monolith','birdshot'].includes(ent.type)) {
                         const d = getDist(herd.center.x, herd.center.y, ent.x, ent.y);
                         // Use powerupRange (1500) instead of generic awareness (500)
                         if(d < powerupRange && d < bestDist) {
                             bestDist = d;
                             herd.targetX = ent.x;
                             herd.targetY = ent.y;
                             foundInterest = true;
                         }
                    }
                }
            }

            // 3. Hunt (Food or Weaker Herds) - Standard Range
            if(!foundInterest) {
                const diet = STATS[herd.members[0].type].diet;
                let bestDist = 9999;
                
                // Scan Entities
                for(let ent of world.entities) {
                    let isFood = false;
                    if(diet === 'herbivore' && (ent.type === 'grass' || ent.type === 'apple')) isFood = true;
                    if(diet === 'carnivore' && ent.type === 'rabbit') isFood = true;
                    if(diet === 'omnivore' && ['grass','apple','rabbit'].includes(ent.type)) isFood = true;
                    
                    // Added 'map' here as a low priority objective (like food)
                    if(ent.type === 'map') isFood = true; 

                    if(isFood) {
                         const d = getDist(herd.center.x, herd.center.y, ent.x, ent.y);
                         if(d < foodRange && d < bestDist) { 
                             bestDist = d;
                             herd.targetX = ent.x;
                             herd.targetY = ent.y;
                             foundInterest = true;
                         }
                    }
                }
                
                // Scan Player (Hunt)
                if(distToP < foodRange && herd.members.length > player.herd.length * 1.5) {
                    herd.targetX = player.pos.x;
                    herd.targetY = player.pos.y;
                    foundInterest = true;
                }
            }

            // 4. Wander (If nothing interesting)
            if(!foundInterest) {
                const distToT = getDist(herd.center.x, herd.center.y, herd.targetX, herd.targetY);
                // If close to target or target is invalid/blocked, pick new one
                if(distToT < 50 || checkHardCollision(herd.targetX, herd.targetY, 40)) {
                    // Pick valid random point
                    for(let k=0; k<5; k++) {
                        const ang = Math.random() * 6.28;
                        const dist = 200 + Math.random() * 300;
                        const tx = herd.center.x + Math.cos(ang) * dist;
                        const ty = herd.center.y + Math.sin(ang) * dist;
                        if(!checkHardCollision(tx, ty, 50)) {
                            herd.targetX = tx;
                            herd.targetY = ty;
                            break;
                        }
                    }
                }
            }
        }

        // MOVEMENT EXECUTION
        let desiredAngle = 0;
        if(herd.avoidTimer > 0) {
            herd.avoidTimer -= dt;
            desiredAngle = herd.avoidAngle;
        } else {
            desiredAngle = Math.atan2(herd.targetY - herd.center.y, herd.targetX - herd.center.x);
        }

        const aiSpeedBase = 100 + (herd.upgrades.speed.level * 2);
        const aiSpeed = aiSpeedBase * dt; 
        
        let nextX = herd.center.x + Math.cos(desiredAngle) * aiSpeed;
        let nextY = herd.center.y + Math.sin(desiredAngle) * aiSpeed;

        const isAiCroc = (herd.members.length > 0 && herd.members[0].type === 'crocodile');
        
        // COLLISION CHECK -> BOUNCE
        if(!checkHardCollision(nextX, nextY, 20, isAiCroc)) {           
             herd.center.x = nextX;
             herd.center.y = nextY;
             herd.dir = desiredAngle; 
        } else {
            // Hit wall/tree -> Trigger Bounce/Avoidance
            herd.avoidTimer = 1.5; // Run away for 1.5s
            // Bounce: Reflect or just pick random opposite direction
            herd.avoidAngle = desiredAngle + Math.PI + (Math.random() - 0.5); 
            // Reset wander target so they don't try to go back to the same spot immediately
            herd.targetX = herd.center.x; 
            herd.targetY = herd.center.y;
        }

        herd.members.forEach(a => a.update(dt, herd.center.x, herd.center.y, 1));
    }

    // Check Win Condition
    if(world.enemyHerds.length === 0 && GAME_STATE.screen === 'game') {
        const modal = document.getElementById('game-over-modal');
        if(modal.classList.contains('hidden')) {
            if(GAME_STATE.activeSFX) { GAME_STATE.activeSFX.forEach(a => { a.pause(); a.currentTime = 0; }); GAME_STATE.activeSFX = []; }
            playSound('victory'); 
            stopMusic(); 
            if(GAME_STATE.difficulty === 'hard' && GAME_STATE.currentUser) {
                fetch('/api/game/record-win', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ userId: GAME_STATE.currentUser.userId, difficulty: 'hard' })
                }).then(r => r.json()).then(d => {
                    if(d.success) {
                        GAME_STATE.currentUser.hardModeWins = d.newCount;
                        alert(`Hard Mode Win Recorded! Total: ${d.newCount}`);
                    }
                });
            }
            document.getElementById('go-title').innerText = "VICTORY!";
            document.getElementById('go-emoji').innerText = "👑";
            document.getElementById('go-message').innerText = "You are the last herd standing!";
            document.getElementById('go-stats').innerHTML = generateStatsHTML();
            modal.classList.remove('hidden');
        }
    }

    // Update Particles
    for(let i=world.particles.length-1; i>=0; i--) {
        let p = world.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt * 2;
        p.angle += 5 * dt;
        if(p.life <= 0) world.particles.splice(i, 1);
    }

    // Game Over Check
    if(player.herd.length === 0) {
        const modal = document.getElementById('game-over-modal');
        if(modal.classList.contains('hidden')) {
            if(GAME_STATE.activeSFX) { GAME_STATE.activeSFX.forEach(a => { a.pause(); a.currentTime = 0; }); GAME_STATE.activeSFX = []; }
            playSound('game-over');
            stopMusic(); 
            document.getElementById('go-title').innerText = "GAME OVER";
            document.getElementById('go-emoji').innerText = "☹️";
            document.getElementById('go-message').innerText = "Your herd has been wiped out.";
            document.getElementById('go-stats').innerHTML = generateStatsHTML();
            modal.classList.remove('hidden');
        }
    }
    
    // Update Player Herd
    player.herd.forEach(a => {
        a.update(dt, player.pos.x, player.pos.y, player.moveStage);
    });
}

function drawGame(dt) {
    // Clear
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const zoom = GAME_STATE.camera.zoom;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Save Context for Camera Transform
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(zoom, zoom);
    ctx.translate(-player.pos.x, -player.pos.y);

    // Draw Background Tiles
    // We only draw tiles visible on screen for performance (simple culling)
    // Tiled background color
    ctx.fillStyle = '#3a5f2d'; // Base grass
    ctx.fillRect(0, 0, world.width, world.height);


    // DRAW WATER
    ctx.fillStyle = '#4fa4bc';
    world.water.forEach(w => {
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw Static World Entities
    world.entities.forEach(ent => {
        let img = ASSETS.images[ent.type];
        if(ent.type === 'rabbit') img = ASSETS.images['rabbit_move']; 

        // Size Logic: Base 40. Trees 5x (200), Monoliths 3x (120)
        let drawSize = 40;
        if(ent.type === 'tree') drawSize = 200; 
        if(ent.type === 'monolith') drawSize = 120;

        if(img && img.complete && img.naturalWidth !== 0) {
            ctx.save(); // Save for transform
            ctx.translate(ent.x, ent.y);
            
            // Flip rabbit based on direction (cos(dir) < 0 means left)
            if(ent.type === 'rabbit' && Math.cos(ent.dir) < 0) {
                ctx.scale(-1, 1);
            }
            
             ctx.drawImage(img, -drawSize/2, -drawSize/2, drawSize, drawSize);
            ctx.restore();
        } else {
            // Fallback squares
            ctx.fillStyle = ent.type === 'grass' ? '#5bd45b' : (ent.type === 'apple' ? 'red' : 'white');
            if(ent.type === 'monolith') ctx.fillStyle = 'black';
            if(ent.type === 'tree') ctx.fillStyle = '#2d4c1e'; // Dark green fallback for tree
            ctx.fillRect(ent.x-10, ent.y-10, 20, 20);
        }
    });

     // Draw Particles
    world.particles.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = p.life;
        if(p.type === 'grass') {
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(-2, -5, 4, 10); // Grass blade
        } else {
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI*2); // Blood drop
            ctx.fill();
        }
        ctx.restore();
    });

    // Draw Fight Clouds (Behind animals usually, but here layer order matters)
    world.clouds.forEach(c => c.draw(ctx));




    // Draw Projectiles
    world.projectiles.forEach(p => {
        const img = ASSETS.images[p.type === 'eagle' ? 'eagle' : 'sparrow'];
        // SAFETY CHECK: Ensure image is fully loaded and not broken
        if(img && img.complete && img.naturalWidth !== 0) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(Math.atan2(p.vy, p.vx));
            ctx.drawImage(img, -20, -20, 40, 40);
            ctx.restore();
        } else {
            // Fallback if image is missing/broken
            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 10, 0, Math.PI*2);
            ctx.fill();
        }
    });
    // Draw Player Herd


    world.enemyHerds.forEach(herd => {
        // Draw Range Circle
        if(herd.members.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = herd.flagColor;
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.25;
            ctx.setLineDash([10, 15]);

            // --- UPDATED LOGIC (Tiered Spread) ---
            const count = herd.members.length;
            let spreadMod = count * 0.0025;
            if(count > 100) spreadMod += (count - 100) * 0.01;
            if(count > 150) spreadMod += (count - 150) * 0.015;

            const rangeScale = 1 + spreadMod;
            // ---------------------

            ctx.ellipse(herd.center.x, herd.center.y, 150 * rangeScale, 100 * rangeScale, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1.0;
        }
        
        // Draw Members
        herd.members.forEach(a => {
            // Performance Culling: Only draw if on screen
            const dx = Math.abs(a.x - player.pos.x);
            const dy = Math.abs(a.y - player.pos.y);
            // Rough screen bounds (assuming 1920x1080 max)
            if(dx < 1200 && dy < 800) {
                a.draw(ctx, 0);
            }
        });
    });

     // Draw Enemy Flags & Counters
    world.enemyHerds.forEach(herd => {
        if(herd.members.length > 0) {
            ctx.fillStyle = herd.flagColor;
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.fillRect(herd.center.x + 20, herd.center.y - 60, 30, 20);
            ctx.strokeRect(herd.center.x + 20, herd.center.y - 60, 30, 20);
            
            ctx.fillStyle = 'red';
            ctx.font = "bold 20px Arial";
            ctx.fillText(herd.members.length, herd.center.x + 60, herd.center.y - 45);
        }
    });

    player.herd.forEach(a => a.draw(ctx, 0));

    // Draw Herd Range Circle (Isometric Dotted)
    ctx.beginPath();
    ctx.strokeStyle = player.herdColor || 'cyan';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.25; // 50% more transparent than 0.5 = 0.25
    ctx.setLineDash([10, 15]); // Dotted line
    // --- UPDATED LOGIC (Tiered Spread) ---
    const pCount = player.herd.length;
    let spreadMod = pCount * 0.0025;
    if(pCount > 100) spreadMod += (pCount - 100) * 0.0025;
    if(pCount > 150) spreadMod += (pCount - 150) * 0.005;

    const rangeScale = 1 + spreadMod;
    // ---------------------
    ctx.ellipse(player.pos.x, player.pos.y, 150 * rangeScale, 100 * rangeScale, 0, 0, Math.PI * 2); 
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash
    ctx.globalAlpha = 1.0; 

 ctx.restore(); // Restore to Screen Coordinate space (0,0 is top left)

    // --- NEW UI DRAWING (Moved after restore to handle mobile screen coords) ---
    
    // Calculate Scale
    // Reduced growth rate by further 30% to prevent UI from getting too huge at 200
    const scaleFactor = GAME_STATE.isMobile ? 0.01 : 0.014;
    const uiScale = 1.0 + (player.herd.length * scaleFactor);
    
    // Determine Position
    let drawX, drawY;
    
    if (GAME_STATE.isMobile) {
        // UPDATED: Mobile Top Left
        drawX = 215; 
        // Pad 1px per animal from top
        drawY = 45 + player.herd.length; 
    } else {
        // Desktop: Center Screen (above player)
        drawX = canvas.width / 2;
        drawY = (canvas.height / 2) - 80;
    }

    // 1. Draw Flag
    if(player.flagImage && player.flagImage.complete && player.flagImage.naturalWidth !== 0) {
        const fw = 50 * uiScale; 
        const fh = 30 * uiScale;
        
        let flagX, flagY;
        
        if (GAME_STATE.isMobile) {
            // Mobile: Flag to the left of the number
            flagX = drawX - fw - 10;
            flagY = drawY - (fh/2) - 10;
        } else {
            // Desktop: Flag to the left of the number (Original relative pos)
            flagX = drawX - 20 - fw - 10;
            flagY = drawY - fh + 5;
        }

        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.strokeRect(flagX, flagY, fw, fh); 
        ctx.drawImage(player.flagImage, flagX, flagY, fw, fh);
    }

    // 2. Draw Herd Counter
    ctx.font = `bold ${40 * uiScale}px Arial`;
    const hue = Math.min(120, player.herd.length * 5); 
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.shadowColor = "black";
    ctx.shadowBlur = 4;
    ctx.lineWidth = 1;
    
    let textX, textY;
    if (GAME_STATE.isMobile) {
        textX = drawX;
        textY = drawY;
        // UPDATED: Left align so it draws to the right of the flag
        ctx.textAlign = "left"; 
    } else {
        textX = drawX - 20;
        textY = drawY;
        ctx.textAlign = "start"; // Reset to default
    }

    ctx.strokeText(player.herd.length, textX, textY); 
    ctx.fillText(player.herd.length, textX, textY);   
    
    // Reset Alignment and Shadow
    ctx.textAlign = "start";
    ctx.shadowBlur = 0;

    // --- MINIMAP DRAWING (Moved to DrawGame for Performance) ---
    if(player.mapTimer > 0) {
        const mapScale = 50;
        const mmW = world.width / mapScale;
        const mmH = world.height / mapScale;
        const mmX = canvas.width - mmW - 20; // Correct Top Right
        const mmY = (canvas.width < 768) ? 200 : 80;

        // Background
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(mmX, mmY, mmW, mmH);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.strokeRect(mmX, mmY, mmW, mmH);

        // Water
        ctx.fillStyle = "rgba(79, 164, 188, 0.8)";
        world.water.forEach(w => {
            ctx.beginPath();
            ctx.arc(mmX + w.x/mapScale, mmY + w.y/mapScale, w.r/mapScale, 0, Math.PI*2);
            ctx.fill();
        });

        // Player Dot
        ctx.fillStyle = "cyan";
        ctx.beginPath();
        ctx.arc(mmX + player.pos.x/mapScale, mmY + player.pos.y/mapScale, 3, 0, Math.PI*2);
        ctx.fill();

    // Enemy Dots (REAL TIME POSITIONING)
        world.enemyHerds.forEach(h => {
             if(h.members.length > 0) {
                 ctx.fillStyle = "red";
                 ctx.fillRect(mmX + h.center.x/mapScale - 2, mmY + h.center.y/mapScale - 2, 4, 4);
             }
        });
    }

    // Fix: Throttle UI updates to prevent lag spikes and physics tunneling
    GAME_STATE.uiTimer += dt;
    if(GAME_STATE.uiTimer > 1.0) {
        updateRosterUI(); 
        GAME_STATE.uiTimer = 0;
    }

    
}

// --- HELPER FUNCTIONS ---

function getDist(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2));
}

function activateMonolith() {
    playSound('monolith');
    player.monolithTimer = 60;
    
    // Transform types
    if(player.type === 'dog') player.type = 'wolf';
    else if(player.type === 'deer') player.type = 'moose';
    else if(player.type === 'chimp') player.type = 'gorilla';
        else if(player.type === 'snake') player.type = 'crocodile';
    else if(player.type === 'pig') player.type = 'rhino';
    else if(player.type === 'anteater') player.type = 'elephant';
    else if(player.type === 'cat') player.type = 'lion';
        else if(player.type === 'velociraptor') player.type = 't-rex';
    // Play specific upgrade sound based on the NEW type
playSound(`${player.type}-upgrade`);

    // Apply to existing herd
    player.herd.forEach(a => a.type = player.type);
}

function revertMonolith() {
    playSound('revert');
    player.type = player.baseType;
    player.herd.forEach(a => a.type = player.type);
}

function spawnParticles(x, y, type) {
    for(let i=0; i<10; i++) {
        world.particles.push({
            x: x, 
            y: y,
            vx: (Math.random() - 0.5) * 200,
            vy: (Math.random() - 0.5) * 200,
            life: 1.0,
            type: type, // 'grass' or 'blood'
            angle: Math.random() * 6.28
        });
    }
}

function generateWater() {
    world.water = [];
    // Scale lakes based on map area (Area = Ratio * Ratio)
const ratio = world.width / 5000;
const lakeCount = Math.floor(25 * ratio * ratio);
    for(let i=0; i<lakeCount; i++) {
        world.water.push({
            x: Math.random() * world.width,
            y: Math.random() * world.height,
            r: 100 + Math.random() * 250 // Radius for circle
        });
    }
}

function checkHardCollision(x, y, radius = 0, canSwim = false) {
    // 1. Map Edges
    if (x < radius || x > world.width - radius || y < radius || y > world.height - radius) return true;

    // 2. Water (Only if cannot swim)
    if (!canSwim) {
        for(let w of world.water) {
            const dist = Math.sqrt((x - w.x)**2 + (y - w.y)**2);
            if (dist < w.r + radius) return true;
        }
    }

    // 3. Trees
    for(let e of world.entities) {
        if(e.type === 'tree') {
            const dist = Math.sqrt((x - e.x)**2 + (y - e.y)**2);
            if(dist < 80 + radius) return true;
        }
    }
    return false;
}
function updateRosterUI() {
    const rosterDiv = document.getElementById('roster-list');

    // 1. Collect and Sort Data (Same logic as before)
    let allHerds = [];
    
    // Player Data
    allHerds.push({
        isPlayer: true,
        score: Math.floor(player.totalXp * player.herd.length),
        members: player.herd,
        flag: null
    });

    // Enemy Data
    world.enemyHerds.forEach(h => {
        allHerds.push({
            isPlayer: false,
            score: Math.floor((h.totalXp || h.xp) * h.members.length),
            members: h.members,
            flag: h.flagColor,
            herdRef: h
        });
    });

    // Sort by Score Descending
    allHerds.sort((a, b) => b.score - a.score);

    // 2. DOM Diffing Logic
    const activeIDs = new Set();

    allHerds.forEach((data) => {
        const count = data.members.length;
        if(count === 0) return;

        // Generate a Unique ID for the DOM Element
        // We tag the herd object with a random ID if it doesn't have one yet so we can track it frame-to-frame
        let uniqueID;
        if (data.isPlayer) {
            uniqueID = 'roster-card-player';
        } else {
            if (!data.herdRef.rosterID) {
                data.herdRef.rosterID = 'roster-enemy-' + Math.random().toString(36).substr(2, 9);
            }
            uniqueID = data.herdRef.rosterID;
        }
        activeIDs.add(uniqueID);

        // Calculate Data
        const type = data.isPlayer ? player.type : data.members[0].type;
        const iconSrc = `${type}/still.png`;
        const scoreFmt = data.score.toLocaleString();
        
        // Fight Status Logic
        let fightHTML = '';
        let isFighting = false;
        let enemyFlagHTML = '';

        for(let m of data.members) {
            if(m.combatState === 'in_cloud' && m.fightCloudRef) {
                isFighting = true;
                const cloud = m.fightCloudRef;
                let opponents = cloud.teamPlayer.includes(m) ? cloud.teamEnemy : cloud.teamPlayer;
                
                if(opponents.length > 0) {
                    const opp = opponents[0];
                    if(opp.isPlayer) {
                         enemyFlagHTML = `<div style="width:20px;height:14px;background:white;border:1px solid #000;display:inline-block;"><img src="${player.flagImage ? player.flagImage.src : ''}" style="width:100%;height:100%;"></div>`;
                    } else if (opp.parentHerd) {
                         enemyFlagHTML = `<div style="width:20px;height:14px;background:${opp.parentHerd.flagColor};border:1px solid white;display:inline-block;"></div>`;
                    }
                }
                break;
            }
        }

        if(isFighting) {
            fightHTML = `<div style="margin-left:auto; display:flex; align-items:center; gap:5px;"><span>⚔️</span>${enemyFlagHTML}</div>`;
        }

        // Check if Card Exists
        let card = document.getElementById(uniqueID);

        if (!card) {
            // CREATE NEW CARD
            card = document.createElement('div');
            card.id = uniqueID;
            card.className = 'roster-card';
            
            // Generate Static HTML
            let flagContent = '';
            if(data.isPlayer) flagContent = `<div style="width:30px;height:20px;background:white;border:1px solid #000; display:flex; justify-content:center; overflow:hidden;"><img src="${player.flagImage.src}" style="width:100%;height:100%;"></div>`;
            else flagContent = `<div style="width:30px;height:20px;background:${data.flag};border:1px solid white;"></div>`;

            card.innerHTML = `
                ${flagContent}
                <img class="roster-icon" src="${iconSrc}" style="width:30px; height:30px;">
                <div style="display:flex; flex-direction:column; font-size:0.8rem; line-height:1;">
                    <span class="roster-count">x${count}</span>
                    <span class="roster-score" style="color:#ffd700;">${scoreFmt} pts</span>
                </div>
                <div class="roster-fight-status">${fightHTML}</div>
            `;
            rosterDiv.appendChild(card);
        } else {
            // UPDATE EXISTING CARD (Prevent Image Flash)
            
            // 1. Update Counts/Scores
            const countSpan = card.querySelector('.roster-count');
            const scoreSpan = card.querySelector('.roster-score');
            if (countSpan.innerText !== `x${count}`) countSpan.innerText = `x${count}`;
            if (scoreSpan.innerText !== `${scoreFmt} pts`) scoreSpan.innerText = `${scoreFmt} pts`;

            // 2. Update Fight Status
            const fightDiv = card.querySelector('.roster-fight-status');
            if (fightDiv.innerHTML !== fightHTML) fightDiv.innerHTML = fightHTML;

            // 3. Update Icon (Only if type changed, e.g. Monolith)
            const iconImg = card.querySelector('.roster-icon');
            // We use getAttribute to check the raw string rather than the full resolved URL
            if (iconImg && iconImg.getAttribute('src') !== iconSrc) {
                iconImg.src = iconSrc;
            }

            // 4. Re-order visual position
            // appendChild simply moves the element to the end if it already exists, 
            // effectively sorting the visual list without reloading the image.
            rosterDiv.appendChild(card); 
        }
    });

    // 3. Cleanup (Remove cards that died)
    Array.from(rosterDiv.children).forEach(child => {
        if (!activeIDs.has(child.id)) {
            rosterDiv.removeChild(child);
        }
    });
}

function handleLockedContent(animalType) {
    const modal = document.getElementById('auth-modal');
    const content = document.getElementById('auth-content');
    modal.classList.remove('hidden');

    // Custom Raptor Logic vs Standard
    if(animalType === 'velociraptor') {
        const hardWins = (GAME_STATE.currentUser && GAME_STATE.currentUser.hardModeWins) ? GAME_STATE.currentUser.hardModeWins : 0;
        content.innerHTML = `
            <h2>Unlock VELOCIRAPTOR</h2>
            <p>Special Unit. Not included in packs.</p>
            <button id="btn-buy-single">Buy Now ($1.99)</button>
            <p style="margin:10px 0;">-- OR --</p>
            <p>Win 10 games on Hard Mode<br>Current: <b>${hardWins}/10</b></p>
            <button onclick="document.getElementById('auth-modal').classList.add('hidden')" style="background:#555;">Close</button>
        `;
    } else {
        // Standard Logic
        content.innerHTML = `
            <h2>Unlock ${animalType.toUpperCase()}</h2>
            <div style="display:flex; gap:10px; justify-content:center; margin-bottom:10px;">
                <button id="btn-buy-single">Buy ${animalType} ($0.99)</button>
                <button id="btn-buy-pack" style="background:gold; color:black; border-color:white;">Buy 4 Pack ($2.99)</button>
            </div>
            <button onclick="document.getElementById('auth-modal').classList.add('hidden')">Cancel</button>
        `;
    }
    
    // Attempt purchase handler
    const attemptBuy = (purchaseType) => {
        if(!GAME_STATE.currentUser) {
            // No user? Show Login Form inside the same modal
            content.innerHTML = `
                <h2>Login Required</h2>
                <p>You must be logged in to purchase.</p>
                <input type="email" id="login-email" placeholder="Email" style="padding:10px; margin:5px; width:80%;">
                <input type="password" id="login-pass" placeholder="Password" style="padding:10px; margin:5px; width:80%;">
                <button id="btn-submit-login">Login & Continue</button>
                <button id="btn-cancel-login">Cancel</button>
            `;

            document.getElementById('btn-cancel-login').onclick = () => {
                document.getElementById('auth-modal').classList.add('hidden');
            };

            document.getElementById('btn-submit-login').onclick = async () => {
                const email = document.getElementById('login-email').value;
                const pass = document.getElementById('login-pass').value;
                try {
                    const res = await fetch('/api/game/login', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ email, password: pass })
                    });
                    const data = await res.json();
                    if(data.success) {
                        GAME_STATE.currentUser = data;
                        checkUnlocks(); 
                        // User logged in, now trigger the purchase they originally wanted
                        initiatePurchase(GAME_STATE.currentUser.userId, purchaseType, animalType);
                    } else {
                        alert("Login failed: " + data.message);
                    }
                } catch(e) { alert("Server error"); }
            };
        } else {
            // User exists, go straight to purchase
            initiatePurchase(GAME_STATE.currentUser.userId, purchaseType, animalType);
        }
    };

    document.getElementById('btn-buy-single').onclick = () => attemptBuy('single');
    document.getElementById('btn-buy-pack').onclick = () => attemptBuy('pack');
}

async function initiatePurchase(userId, type, animalName) {
    const res = await fetch('/api/game/purchase-animal', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ userId, type, animalName })
    });
    const data = await res.json();
    // FIX: Use window.top to escape any iframes and satisfy Stripe security
    if(data.url) window.top.location.href = data.url;
}

function checkUnlocks() {
    const owned = (GAME_STATE.currentUser && GAME_STATE.currentUser.ownedSkins) ? GAME_STATE.currentUser.ownedSkins : [];
    
    // 1. Update Hero Selection Menu (New Game)
    document.querySelectorAll('.hero-card').forEach(card => {
        const type = card.getAttribute('data-type');
        
        const hardWins = (GAME_STATE.currentUser && GAME_STATE.currentUser.hardModeWins) ? GAME_STATE.currentUser.hardModeWins : 0;
        
        // Update Raptor Progress Text
        if(type === 'velociraptor') {
            const prog = document.getElementById('raptor-progress');
            if(prog) prog.innerText = hardWins;
        }

        // Force unlock if Debug is on, or if it's a free animal, or if user owns it, OR if Raptor condition met
        let isUnlocked = TEST_UNLOCK_ALL || ['dog','chimp','deer'].includes(type) || owned.includes(type);
        
        // Special Raptor Condition
        if(type === 'velociraptor' && hardWins >= 10) isUnlocked = true;

        if(isUnlocked) {
            card.setAttribute('data-locked', 'false');
            const p = card.querySelector('p');
            if(p) p.innerText = p.innerText.replace('🔒', '✅');
            const img = card.querySelector('img');
            if(img) img.style.filter = 'none';
        } else {
            // Ensure visual lock state if not owned
            card.setAttribute('data-locked', 'true');
            const img = card.querySelector('img');
            if(img) img.style.filter = 'grayscale(100%)';
        }
    });

    // 2. Update My Animals Menu
    document.querySelectorAll('.animal-card').forEach(card => {
        const type = card.getAttribute('data-type');
        if(!type) return; // Skip if no data-type (free animals in your HTML might not have it yet if you didn't add it)

        const isUnlocked = TEST_UNLOCK_ALL || ['dog','chimp','deer'].includes(type) || owned.includes(type);
        const img = card.querySelector('img');
        const title = card.querySelector('h3');

        if(isUnlocked) {
            if(img) img.style.filter = 'none';
            if(title) title.innerText = title.innerText.replace('🔒', '').trim();
        } else {
            if(img) img.style.filter = 'grayscale(100%)';
            // Add lock emoji if missing
            if(title && !title.innerText.includes('🔒')) {
                title.innerText = title.innerText + ' 🔒';
            }
        }
    });
}

// --- NEW HELPER: SAFE SPAWN ---
function findSafeSpawnLocation(padding = 50) {
    let attempts = 0;
    let maxAttempts = 500;
    
    while (attempts < maxAttempts) {
        const tx = Math.random() * world.width;
        const ty = Math.random() * world.height;
        
        // checkHardCollision returns TRUE if hitting Wall/Water/Tree
        if (!checkHardCollision(tx, ty, padding)) {
            return { x: tx, y: ty };
        }
        attempts++;
    }
    
    // Fallback: If map is totally full, return center to prevent crash
    return { x: world.width / 2, y: world.height / 2 };
}

function generateStatsHTML() {
    let killsHTML = '';
    const kills = player.stats.killedAnimals;
    if(Object.keys(kills).length === 0) killsHTML = 'None';
    else {
        for(let type in kills) {
            killsHTML += `${type}: ${kills[type]}<br>`;
        }
    }

    return `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <div>
                <strong>General Stats:</strong><br>
                Herds Eliminated: <span style="color:#ffd700">${player.stats.herdsEliminated}</span><br>
                Total Spawned: ${player.stats.totalSpawned}<br>
                Birdshots Fired: ${player.stats.birdshots}<br>
                Monolith Time: ${player.stats.monolithTime.toFixed(1)}s
            </div>
            <div>
                <strong>Defeated Enemies:</strong><br>
                <div style="font-size:0.8rem; line-height:1.4;">
                ${killsHTML}
                </div>
            </div>
        </div>
    `;
}


// Start
init();