// public/terrarium/game.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let birds = [];
let bugs = [];
let seeds = [];
let feeders = [];
let eggs = [];
let chronology = [];
window.chronology = chronology; // Expose to UI
let trees = [
    { x: canvas.width * 0.2, y: canvas.height - 50, w: 40, h: canvas.height * 0.6, branches: [{x: canvas.width * 0.2, y: canvas.height - 250, w: 180, side: 1}] },
    { x: canvas.width * 0.8, y: canvas.height - 50, w: 50, h: canvas.height * 0.7, branches: [{x: canvas.width * 0.8 - 180, y: canvas.height - 300, w: 180, side: -1}] }
];

const birdFacts = {
    'Robin': 'Robins are known for their running and stopping behavior while foraging on the ground.',
    'Blue Jay': 'Blue Jays are known to mimic the calls of hawks to clear other birds from feeders.',
    'Cardinal': 'Unlike many other songbirds in North America, both male and female Cardinals can sing.'
};

// Browser Session Handling
let SESSION_TOKEN = localStorage.getItem('terrarium_session');
if (!SESSION_TOKEN) {
    SESSION_TOKEN = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('terrarium_session', SESSION_TOKEN);
}

const BIRD_AGING_MULTIPLIER = 100;
let isImmortal = false;

// System Sounds (Web Audio API)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
window.unlockAudio = function() { if(audioCtx.state === 'suspended') audioCtx.resume(); };

function playChirp(species) {
    if(audioCtx.state === 'suspended') return; // Wait for user interaction to unlock audio
    
    const osc = audioCtx.createOscillator();
    const mod = audioCtx.createOscillator();
    const modGain = audioCtx.createGain();
    const gainNode = audioCtx.createGain();
    
    let baseFreq = species === 'Blue Jay' ? 1200 : species === 'Cardinal' ? 2200 : 3500;
    let trillSpeed = species === 'Cardinal' ? 15 : species === 'Blue Jay' ? 0 : 25;
    
    // Modulator for beautiful trill effect
    mod.type = 'sine';
    mod.frequency.value = trillSpeed; 
    modGain.gain.value = 300; 
    
    mod.connect(modGain);
    modGain.connect(osc.frequency);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq + 600, audioCtx.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.05); // Fade in smoothly
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4); // Fade out
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    mod.start(); osc.start();
    mod.stop(audioCtx.currentTime + 0.4); osc.stop(audioCtx.currentTime + 0.4);
}

class Bird {
    constructor(x, y, species, customData = null, existingClientId = null, existingAge = 0, existingName = null) {
        this.clientId = existingClientId || 'bird_' + Math.random().toString(36).substr(2, 9);
        this.x = x; 
        this.y = y;
        this.species = species;
        this.name = existingName || `Wild ${species}`;
        this.age = existingAge;
        this.vx = (Math.random() - 0.5) * 3;
        this.vy = (Math.random() - 0.5) * 3;
        this.state = 'flying'; 
        this.flapCycle = Math.random() * Math.PI * 2;
        this.customData = customData;
        
        if(customData && customData.bodyColor) {
            this.bodyColor = customData.bodyColor;
            this.wingColor = customData.wingColor;
        } else {
            this.bodyColor = species === 'Cardinal' ? '#D22B2B' : species === 'Blue Jay' ? '#4169E1' : '#8B4513';
            this.wingColor = species === 'Cardinal' ? '#8B0000' : species === 'Blue Jay' ? '#0000CD' : '#A0522D';
        }
        
        setInterval(() => { if(Math.random() < 0.1) playChirp(this.species); }, 5000);
    }

  update(deltaTime) {
        this.age += (deltaTime / 1000) * BIRD_AGING_MULTIPLIER;
        let maxLifespan = (this.customData && this.customData.lifespan) ? this.customData.lifespan : 3650;
        
        if (!isImmortal && this.age > maxLifespan) { 
            chronology.push(`${this.name} (${this.species}) died of old age at ${Math.floor(this.age)} days.`);
            birds = birds.filter(b => b !== this);
            return;
        }

        this.hunger = (this.hunger || 0) + deltaTime / 1000;

        if (this.state === 'flying' || this.state === 'perching') {
            if (this.state === 'flying') {
                this.x += this.vx; this.y += this.vy;
                this.flapCycle += 0.5;
                if (this.x < 20 || this.x > canvas.width - 20) this.vx *= -1;
                if (this.y < 20 || this.y > canvas.height - 100) this.vy *= -1;
            } else if (this.state === 'perching') {
                this.flapCycle = 0;
                if(Math.random() < 0.02) this.x += (Math.random() - 0.5) * 15; // Hop around in tree
                let hopChance = (this.customData && this.customData.habit === 'branch hog') ? 0.001 : 0.01;
                if(Math.random() < hopChance) { this.state = 'flying'; this.vy = -3; } // Take off
            }

            // Look for food
            if (this.hunger > 10) {
                let nearestSeed = seeds.find(s => Math.hypot(s.x - this.x, s.y - this.y) < 400);
                let nearestFeeder = feeders.find(f => f.food > 0 && Math.hypot(f.x - this.x, f.y - this.y) < 400);
                let nearestBug = bugs.find(b => Math.hypot(b.x - this.x, b.y - this.y) < 400);
                
                let target = nearestFeeder || nearestSeed || nearestBug;
                if (target) {
                    this.state = 'swooping';
                    this.target = target;
                    this.targetType = nearestFeeder ? 'feeder' : nearestSeed ? 'seed' : 'bug';
                    this.swoopStart = {x: this.x, y: this.y};
                    this.swoopProgress = 0;
                    // Bezier Control Point: Drop low to create an arc
                    this.swoopCp = {x: this.x + (target.x - this.x)*0.8, y: Math.max(this.y, target.y) + 80}; 
                }
            }

            // Look for a mate autonomously
            let libidoMultiplier = (this.customData && this.customData.libido) ? this.customData.libido / 5 : 1;
            if (this.age > 365 && Math.random() < (0.001 * libidoMultiplier)) {
                let mate = birds.find(b => b !== this && b.species === this.species && b.age > 365 && b.state !== 'seeking_mate' && b.state !== 'mating');
                if (mate) {
                    this.state = 'seeking_mate';
                    mate.state = 'seeking_mate';
                    this.target = mate;
                    mate.target = this;
                }
            }

            // Look for a tree to perch in
            if (this.state === 'flying' && Math.random() < 0.03) {
                let targetTree = trees[Math.floor(Math.random() * trees.length)];
                this.state = 'seeking_tree';
                this.target = {x: targetTree.x + (Math.random() - 0.5) * 100, y: targetTree.y - targetTree.h + (Math.random() - 0.5) * 50};
            }

        } else if (this.state === 'swooping') {
            this.flapCycle += 0.2; // Glide mostly
            this.swoopProgress += (deltaTime / 1000) * 1.5;
            
            if (this.swoopProgress >= 1) {
                this.swoopProgress = 1;
                this.hunger = 0;
                if (this.targetType === 'bug') bugs = bugs.filter(b => b !== this.target);
                if (this.targetType === 'seed') seeds = seeds.filter(s => s !== this.target);
                if (this.targetType === 'feeder') this.target.food -= 10;
                this.state = 'flying'; this.vy = -3; 
            } else {
                // Quadratic Bezier Curve for Arcing Flight
                let t = this.swoopProgress;
                let invT = 1 - t;
                this.x = invT * invT * this.swoopStart.x + 2 * invT * t * this.swoopCp.x + t * t * this.target.x;
                this.y = invT * invT * this.swoopStart.y + 2 * invT * t * this.swoopCp.y + t * t * this.target.y;
            }
        } else if (this.state === 'seeking_tree') {
            this.flapCycle += 0.6;
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.hypot(dx, dy);
            this.x += (dx / dist) * 3;
            this.y += (dy / dist) * 3;
            if (dist < 10) { this.state = 'perching'; this.vy = 0; }
        } else if (this.state === 'seeking_mate') {
            this.flapCycle += 0.6;
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 10) {
                this.x += (dx / dist) * 3;
                this.y += (dy / dist) * 3;
            } else {
                this.state = 'mating';
                if(this.target) this.target.state = 'mating';
                setTimeout(() => {
                    this.state = 'flying'; 
                    if(this.target) {
                        this.target.state = 'flying';
                        eggs.push({x: this.x, y: this.y, species: this.species, hatchTime: 100, parent1: this.name, parent2: this.target.name, customData: this.customData});
                        chronology.push(`${this.name} and ${this.target.name} laid an egg!`);
                        this.target = null;
                    }
                }, 2000);
            }
        }
    }

    drawMathBird(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        let scale = (this.customData && this.customData.size) ? parseFloat(this.customData.size) : 1;
        let angle = Math.atan2(this.vy, this.vx);
        
        if (this.state === 'perching' || this.state === 'mating') angle = 0;
        if (this.vx < 0) { ctx.scale(-scale, scale); } else { ctx.scale(scale, scale); }
        if (this.state !== 'perching' && this.state !== 'mating') ctx.rotate(angle);

        // Retrieve components
        let tailType = this.customData?.tail || 'normal';
        let bodyType = this.customData?.body || 'normal';
        let headType = this.customData?.head || 'smooth';
        let beakType = this.customData?.beak || 'short';
        let wingType = this.customData?.wing || 'pointed';

        // Tail
        ctx.fillStyle = this.wingColor;
        ctx.beginPath();
        if (tailType === 'forked') {
            ctx.moveTo(-10, 0); ctx.lineTo(-30, -10); ctx.lineTo(-20, 0); ctx.lineTo(-30, 10);
        } else if (tailType === 'fan') {
            ctx.moveTo(-10, 0); ctx.arc(-10, 0, 15, Math.PI*0.7, Math.PI*1.3);
        } else { // normal
            ctx.moveTo(-10, 0); ctx.lineTo(-25, -5); ctx.lineTo(-25, 5);
        }
        ctx.fill();

        // Body
        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        if (bodyType === 'slim') ctx.ellipse(0, 0, 15, 7, 0, 0, Math.PI * 2);
        else if (bodyType === 'plump') ctx.ellipse(0, 0, 18, 14, 0, 0, Math.PI * 2);
        else ctx.ellipse(0, 0, 15, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head/Crest
        if (headType === 'crested' || this.species === 'Blue Jay' || this.species === 'Cardinal') {
            ctx.beginPath(); ctx.moveTo(5, -8); ctx.lineTo(0, -18); ctx.lineTo(-5, -8); ctx.fill();
        }

        // Beak
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        if (beakType === 'long') {
            ctx.moveTo(12, -2); ctx.lineTo(28, 0); ctx.lineTo(12, 2);
        } else if (beakType === 'curved') {
            ctx.moveTo(12, -2); ctx.quadraticCurveTo(22, -5, 20, 5); ctx.lineTo(12, 2);
        } else { // short
            ctx.moveTo(12, -2); ctx.lineTo(20, 0); ctx.lineTo(12, 2);
        }
        ctx.fill();

        // Wing
        let flapOffset = (this.state !== 'perching' && this.state !== 'mating') ? Math.sin(this.flapCycle) * 15 : 0;
        ctx.fillStyle = this.wingColor;
        ctx.beginPath();
        if (wingType === 'rounded') {
            ctx.ellipse(0, -5 + flapOffset/2, 10, 6, Math.PI/4 + flapOffset/20, 0, Math.PI*2);
        } else { // pointed
            ctx.moveTo(-5, -5); ctx.lineTo(-15, -20 + flapOffset); ctx.lineTo(5, -5);
        }
        ctx.fill();

        ctx.restore();
    }
}

function drawEnvironment() {
    const now = Date.now();
    const cycleDuration = 15 * 60 * 1000; 
    const cycleProgress = (now % cycleDuration) / cycleDuration;
    
    let color;
    if (cycleProgress < 0.1) color = '#ffb347'; // Dawn
    else if (cycleProgress < 0.4) color = '#87CEEB'; // Morning/Noon
    else if (cycleProgress < 0.5) color = '#ff7e67'; // Dusk
    else color = '#0B1D3A'; // Night
    document.getElementById('sky-overlay').style.backgroundColor = color;

    // Ground
    ctx.fillStyle = '#2d4c1e';
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

    // Trees & Branches
    trees.forEach(t => {
        ctx.fillStyle = '#4B3621';
        ctx.fillRect(t.x - t.w/2, t.y - t.h, t.w, t.h); 
        t.branches.forEach(b => {
            ctx.fillRect(b.side === 1 ? t.x : t.x - b.w, b.y, b.w, 15); 
        });
        ctx.fillStyle = '#228B22';
        ctx.beginPath(); ctx.arc(t.x, t.y - t.h, 100, 0, Math.PI*2); ctx.fill();
    });

    // Feeders
    feeders.forEach(f => {
        ctx.fillStyle = '#8B4513'; ctx.fillRect(f.x - 15, f.y, 30, 40);
        ctx.fillStyle = '#FFD700'; ctx.fillRect(f.x - 10, f.y + 10, 20, (f.food / 100) * 30);
    });

    // Seeds, Bugs, Eggs
    ctx.fillStyle = '#eedd82';
    seeds.forEach(s => { ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, Math.PI*2); ctx.fill(); });
    ctx.fillStyle = '#000';
    bugs.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 2, 0, Math.PI*2); ctx.fill(); });
    ctx.fillStyle = '#f4f4f4';
    eggs.forEach(e => { ctx.beginPath(); ctx.ellipse(e.x, e.y, 6, 8, 0, 0, Math.PI*2); ctx.fill(); });
}

let lastTime = Date.now();
function gameLoop() {
    const now = Date.now();
    const deltaTime = now - lastTime;
    lastTime = now;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawEnvironment();

    if (Math.random() < 0.02 && bugs.length < 20) bugs.push({x: Math.random() * canvas.width, y: canvas.height - 50});

    eggs.forEach(e => {
        e.hatchTime -= deltaTime / 1000 * BIRD_AGING_MULTIPLIER;
        if (e.hatchTime <= 0) {
            birds.push(new Bird(e.x, e.y, e.species, e.customData, null, 0, `Baby ${e.species}`));
            chronology.push(`A new ${e.species} hatched from ${e.parent1} and ${e.parent2}!`);
        }
    });
    eggs = eggs.filter(e => e.hatchTime > 0);

    birds.forEach(bird => { bird.update(deltaTime); bird.drawMathBird(ctx); });
    requestAnimationFrame(gameLoop);
}

async function init() {
    try {
        // UPDATED API ROUTE
        const res = await fetch(`/api/terrarium/load/${SESSION_TOKEN}`);
        const data = await res.json();
        
        const offlineDays = (data.secondsOffline / 86400) * BIRD_AGING_MULTIPLIER;
        
        if (data.birds) {
            data.birds.forEach(b => {
                let traits = b.custom_traits ? JSON.parse(b.custom_traits) : null;
                let newBird = new Bird(b.x_pos, b.y_pos, b.species, traits, b.client_id, b.age_days + offlineDays, b.name);
                birds.push(newBird);
            });
        }
    } catch (e) {
        console.error("Failed to load DB state, starting fresh.", e);
    }

    gameLoop();
    
    // UPDATED API ROUTE
    setInterval(() => {
        const payload = birds.map(b => ({
            clientId: b.clientId, name: b.name, species: b.species, 
            age: b.age, x: b.x, y: b.y, customData: b.customData
        }));

        fetch('/api/terrarium/save', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ session: SESSION_TOKEN, birds: payload })
        }).catch(err => console.error("Auto-save failed", err));
    }, 10000);
}

init();

window.spawnBird = (species, customData = null) => birds.push(new Bird(canvas.width/2, canvas.height/2, species, customData));
window.birds = birds;