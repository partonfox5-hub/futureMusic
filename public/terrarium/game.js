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
function playChirp(species) {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    let freq = species === 'Blue Jay' ? 3000 : species === 'Cardinal' ? 4500 : 5500;
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq + 1000, audioCtx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
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

        if (this.state === 'flying' || this.state === 'hopping') {
            if (this.state === 'flying') {
                this.x += this.vx; this.y += this.vy;
                this.flapCycle += 0.5;
                if (this.x < 20 || this.x > canvas.width - 20) this.vx *= -1;
                if (this.y < 20 || this.y > canvas.height - 100) this.vy *= -1;
            } else {
                this.flapCycle = 0;
                if(Math.random() < 0.05) this.x += (Math.random() - 0.5) * 20;
                let hopChance = (this.customData && this.customData.habit === 'branch hog') ? 0.001 : 0.02;
                if(Math.random() < hopChance) { this.state = 'flying'; this.vy = -3; }
            }

            if (this.hunger > 10) {
                let nearestSeed = seeds.find(s => Math.hypot(s.x - this.x, s.y - this.y) < 300);
                let nearestFeeder = feeders.find(f => f.food > 0 && Math.hypot(f.x - this.x, f.y - this.y) < 300);
                let nearestBug = bugs.find(b => Math.hypot(b.x - this.x, b.y - this.y) < 300);
                
                let target = nearestFeeder || nearestSeed || nearestBug;
                if (target) {
                    this.state = 'swooping';
                    this.target = target;
                    this.targetType = nearestFeeder ? 'feeder' : nearestSeed ? 'seed' : 'bug';
                }
            }

            let libidoMultiplier = (this.customData && this.customData.libido) ? this.customData.libido / 5 : 1;
            if (this.age > 365 && Math.random() < (0.0005 * libidoMultiplier)) {
                let mate = birds.find(b => b !== this && b.species === this.species && b.age > 365 && b.state !== 'mating');
                if (mate) {
                    this.state = 'mating';
                    mate.state = 'mating';
                    setTimeout(() => {
                        this.state = 'flying'; mate.state = 'flying';
                        eggs.push({x: this.x, y: this.y, species: this.species, hatchTime: 100, parent1: this.name, parent2: mate.name, customData: this.customData});
                        chronology.push(`${this.name} and ${mate.name} laid an egg!`);
                    }, 2000);
                }
            }

            if (this.state === 'flying' && Math.random() < 0.02) {
                trees.forEach(t => t.branches.forEach(b => {
                    let branchX = b.side === 1 ? t.x : t.x - b.w;
                    if (this.x > branchX && this.x < branchX + b.w && Math.abs(this.y - b.y) < 50) {
                        this.state = 'hopping'; this.y = b.y - 10; this.vy = 0;
                    }
                }));
            }

        } else if (this.state === 'swooping') {
            this.flapCycle += 0.8;
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.hypot(dx, dy);
            
            this.x += (dx / dist) * 4;
            this.y += (dy / dist) * 4;

            if (dist < 15) {
                this.hunger = 0;
                if (this.targetType === 'bug') bugs = bugs.filter(b => b !== this.target);
                if (this.targetType === 'seed') seeds = seeds.filter(s => s !== this.target);
                if (this.targetType === 'feeder') this.target.food -= 10;
                this.state = 'flying'; this.vy = -3; 
            }
        }
    }

    drawMathBird(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        let scale = (this.customData && this.customData.size) ? parseFloat(this.customData.size) : 1;
        let angle = Math.atan2(this.vy, this.vx);
        
        if (this.state === 'hopping' || this.state === 'mating') angle = 0;
        if (this.vx < 0) { ctx.scale(-scale, scale); } else { ctx.scale(scale, scale); }
        if (this.state !== 'hopping' && this.state !== 'mating') ctx.rotate(angle);

        ctx.fillStyle = this.wingColor;
        ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-25, -5); ctx.lineTo(-25, 5); ctx.fill();

        ctx.fillStyle = this.bodyColor;
        ctx.beginPath(); ctx.ellipse(0, 0, 15, 10, 0, 0, Math.PI * 2); ctx.fill();

        if (this.species === 'Blue Jay' || this.species === 'Cardinal') {
            ctx.beginPath(); ctx.moveTo(5, -8); ctx.lineTo(0, -18); ctx.lineTo(-5, -8); ctx.fill();
        }

        ctx.fillStyle = '#FFD700';
        ctx.beginPath(); ctx.moveTo(12, -2); ctx.lineTo(22, 0); ctx.lineTo(12, 2); ctx.fill();

        let flapOffset = (this.state !== 'hopping' && this.state !== 'mating') ? Math.sin(this.flapCycle) * 15 : 0;
        ctx.fillStyle = this.wingColor;
        ctx.beginPath();
        ctx.moveTo(-5, -5); ctx.lineTo(-15, -20 + flapOffset); ctx.lineTo(5, -5);
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