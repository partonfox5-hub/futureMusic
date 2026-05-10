// public/terrarium/game.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let birds = [];
let bugs = [];
let branches = [ {x: 100, y: canvas.height - 200, w: 300}, {x: canvas.width - 400, y: canvas.height - 300, w: 250} ];

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
        if (!isImmortal && this.age > 3650) { 
            birds = birds.filter(b => b !== this);
            return;
        }

        if (this.state === 'flying') {
            this.x += this.vx; this.y += this.vy;
            this.flapCycle += 0.5;

            if (this.x < 20 || this.x > canvas.width - 20) this.vx *= -1;
            if (this.y < 20 || this.y > canvas.height - 100) this.vy *= -1;

            let nearestBug = bugs.find(b => Math.hypot(b.x - this.x, b.y - this.y) < 200);
            if (nearestBug) {
                this.state = 'swooping';
                this.target = nearestBug;
            }
        } else if (this.state === 'swooping') {
            this.flapCycle += 0.8;
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.hypot(dx, dy);
            
            this.x += (dx / dist) * 4;
            this.y += (dy / dist) * 4;

            if (dist < 10) {
                bugs = bugs.filter(b => b !== this.target); 
                this.state = 'flying';
                this.vy = -3; 
            }
        }
    }

    drawMathBird(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        let angle = Math.atan2(this.vy, this.vx);
        if (this.vx < 0) { ctx.scale(1, -1); } 
        ctx.rotate(angle);

        ctx.fillStyle = this.wingColor;
        ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-25, -5); ctx.lineTo(-25, 5); ctx.fill();

        ctx.fillStyle = this.bodyColor;
        ctx.beginPath(); ctx.ellipse(0, 0, 15, 10, 0, 0, Math.PI * 2); ctx.fill();

        if (this.species === 'Blue Jay' || this.species === 'Cardinal') {
            ctx.beginPath(); ctx.moveTo(5, -8); ctx.lineTo(0, -18); ctx.lineTo(-5, -8); ctx.fill();
        }

        ctx.fillStyle = '#FFD700';
        ctx.beginPath(); ctx.moveTo(12, -2); ctx.lineTo(22, 0); ctx.lineTo(12, 2); ctx.fill();

        let flapOffset = this.state !== 'hopping' ? Math.sin(this.flapCycle) * 15 : 0;
        ctx.fillStyle = this.wingColor;
        ctx.beginPath();
        ctx.moveTo(-5, -5); ctx.lineTo(-15, -20 + flapOffset); ctx.lineTo(5, -5);
        ctx.fill();

        ctx.restore();
    }
}

function drawEnvironment() {
    const now = Date.now();
    const cycleProgress = (now % (15 * 60 * 1000)) / (15 * 60 * 1000);
    
    let color = cycleProgress < 0.25 ? '#87CEEB' : cycleProgress < 0.5 ? '#4A90E2' : cycleProgress < 0.75 ? '#FF7E67' : '#0B1D3A';
    document.getElementById('sky-overlay').style.backgroundColor = color;

    ctx.strokeStyle = '#4B3621'; ctx.lineWidth = 10;
    branches.forEach(b => {
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + b.w, b.y + 20); ctx.stroke();
    });

    ctx.fillStyle = '#000';
    bugs.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 2, 0, Math.PI*2); ctx.fill(); });
}

let lastTime = Date.now();
function gameLoop() {
    const now = Date.now();
    const deltaTime = now - lastTime;
    lastTime = now;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawEnvironment();

    if (Math.random() < 0.02 && bugs.length < 20) bugs.push({x: Math.random() * canvas.width, y: canvas.height - 10});

    birds.forEach(bird => {
        bird.update(deltaTime);
        bird.drawMathBird(ctx);
    });

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