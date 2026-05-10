// public/terrarium/game.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let birds = [];
let bugs = [];
let seeds = [];
let feeders = [];
let birdhouses = [];
let eggs = [];
let chronology = [];
let birdRegistry = []; // Tracks all birds ever born for Chronology
window.chronology = chronology; 
window.birdRegistry = birdRegistry;
window.mouseX = 0;
window.mouseY = 0;
window.isPaused = false;
window.hoveredBird = null;
window.gameSpeedMultiplier = 1;
window.gameTime = Date.now();
let timeSinceLastBug = 0;
let nextBugInterval = Math.random() * 20000 + 10000; // 10s to 30s
let trees = [];
let numTrees = Math.floor(Math.random() * 3) + 2; // 2 to 4 trees
for (let i = 0; i < numTrees; i++) {
    let tx = canvas.width * (0.1 + (i * 0.8 / numTrees)) + (Math.random() * 100 - 50);
    let th = canvas.height * (0.4 + Math.random() * 0.4);
    let tw = 30 + Math.random() * 30;
    let branches = [];
    let numBranches = Math.floor(Math.random() * 3) + 2;
    for (let j = 0; j < numBranches; j++) {
        let side = Math.random() > 0.5 ? 1 : -1;
        let by = canvas.height - 50 - (th * (0.2 + Math.random() * 0.7));
        let bw = 80 + Math.random() * 120;
        branches.push({ x: side === 1 ? tx : tx - bw, y: by, w: bw, side: side });
    }
    trees.push({ x: tx, y: canvas.height - 50, w: tw, h: th, branches: branches });
}

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
    if(audioCtx.state === 'suspended') return; 
    
    const osc = audioCtx.createOscillator();
    const mod = audioCtx.createOscillator();
    const modGain = audioCtx.createGain();
    const gainNode = audioCtx.createGain();
    
    // 3x more distinct sounds per species
    let variation = Math.floor(Math.random() * 3);
    
    let baseFreq = species === 'Blue Jay' ? 1200 + (variation * 300) : species === 'Cardinal' ? 2200 + (variation * 400) : 3500 + (variation * 500);
    let trillSpeed = species === 'Cardinal' ? 15 + (variation * 5) : species === 'Blue Jay' ? (variation * 8) : 25 + (variation * 10);
    let sweep = variation === 1 ? -400 : 600; // Some pitch down, some pitch up
    
    mod.type = variation === 2 ? 'square' : 'sine';
    mod.frequency.value = trillSpeed; 
    modGain.gain.value = 300 + (variation * 100); 
    
    mod.connect(modGain);
    modGain.connect(osc.frequency);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(100, baseFreq + sweep), audioCtx.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.05); 
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4); 
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    mod.start(); osc.start();
    mod.stop(audioCtx.currentTime + 0.4); osc.stop(audioCtx.currentTime + 0.4);
}

class Bird {
    constructor(x, y, species, customData = null, existingClientId = null, existingAge = 0, existingName = null, parents = []) {
        this.clientId = existingClientId || 'bird_' + Math.random().toString(36).substr(2, 9);
        this.x = x; 
        this.y = y;
        this.species = species;
        this.name = existingName || `Wild ${species}`;
      this.age = existingAge;
        let spd = (customData && customData.speed) ? parseFloat(customData.speed) : 1;
        this.vx = (Math.random() - 0.5) * 3 * spd;
        this.vy = (Math.random() - 0.5) * 3 * spd;
        this.state = 'flying'; 
        this.flapCycle = Math.random() * Math.PI * 2;
        this.customData = customData;
        this.inBirdhouse = null;
        this.opacity = 1;
        
        let isCustomName = existingName ? true : false;
        birdRegistry.push({ id: this.clientId, name: this.name, species: this.species, customName: isCustomName, parents: parents });
        
        if(customData && customData.bodyColor) {
            this.bodyColor = customData.bodyColor;
            this.wingColor = customData.wingColor;
        } else {
            this.bodyColor = species === 'Cardinal' ? '#D22B2B' : species === 'Blue Jay' ? '#4169E1' : '#8B4513';
            this.wingColor = species === 'Cardinal' ? '#8B0000' : species === 'Blue Jay' ? '#0000CD' : '#A0522D';
        }
        
        // 50% more frequent sounds (approx 3333ms instead of 5000ms)
        setInterval(() => { if(!window.isPaused && Math.random() < 0.15) playChirp(this.species); }, 3333);
    }

     update(deltaTime) {
        if (this.state === 'dead') {
            this.y += (deltaTime / 1000) * 50; // Fall down
            if (this.y > canvas.height - 50) {
                this.y = canvas.height - 50;
                this.opacity -= (deltaTime / 1000) * 0.5; // Fade out over 2 seconds
                if (this.opacity <= 0) {
                    birds = birds.filter(b => b !== this);
                }
            }
            return;
        }

        if (this.state === 'dragged') return;
        
        let speedMult = (this.customData && this.customData.speed) ? parseFloat(this.customData.speed) : 1;
        let temperament = (this.customData && this.customData.temperament) ? parseInt(this.customData.temperament) : 5;

        this.age += (deltaTime / 1000) * BIRD_AGING_MULTIPLIER;
        let maxLifespan = (this.customData && this.customData.lifespan) ? this.customData.lifespan : 3650;
        
       if (!isImmortal && this.age > maxLifespan) { 
            chronology.push(`${this.name} (${this.species}) died of old age at ${Math.floor(this.age)} days.`);
            this.state = 'dead';
            if(this.inBirdhouse) {
                this.inBirdhouse.occupants = this.inBirdhouse.occupants.filter(b => b !== this);
                this.x = this.inBirdhouse.x;
                this.y = this.inBirdhouse.y;
                this.inBirdhouse = null;
            }
            return;
        }

        const cycleDuration = 15 * 60 * 1000; 
        const cycleProgress = (window.gameTime % cycleDuration) / cycleDuration;
        const isNight = cycleProgress > 0.5;

        if (this.inBirdhouse) {
            if (!isNight) {
                this.inBirdhouse.occupants = this.inBirdhouse.occupants.filter(b => b !== this);
                this.inBirdhouse = null;
                this.state = 'flying';
                this.vy = -3 * speedMult;
            } else {
                this.x = this.inBirdhouse.x;
                this.y = this.inBirdhouse.y;
                return; // Sleep safely
            }
        } else if (isNight && this.state !== 'seeking_birdhouse') {
            let availableHouse = birdhouses.find(h => h.occupants.length < 3 && !h.occupants.includes(this));
            if (availableHouse) {
                this.state = 'seeking_birdhouse';
                this.target = availableHouse;
            }
        }

        this.hunger = (this.hunger || 0) + deltaTime / 1000;

        if (this.state === 'flying' || this.state === 'perching') {
            if (this.state === 'flying') {
                if (temperament < 10) {
                    let avoidRadius = (10 - temperament) * 20; 
                    let nearestOther = birds.find(b => b !== this && b.species !== this.species && b.state !== 'dead' && !b.inBirdhouse && Math.hypot(b.x - this.x, b.y - this.y) < avoidRadius);
                    if (nearestOther) {
                        this.vx += (this.x > nearestOther.x ? 0.2 : -0.2) * speedMult;
                        this.vy += (this.y > nearestOther.y ? 0.2 : -0.2) * speedMult;
                    }
                }

                this.x += this.vx; this.y += this.vy;
                this.flapCycle += 0.5 * speedMult;
                
                let maxSpd = 5 * speedMult;
                if (this.vx > maxSpd) this.vx = maxSpd;
                if (this.vx < -maxSpd) this.vx = -maxSpd;
                if (this.vy > maxSpd) this.vy = maxSpd;
                if (this.vy < -maxSpd) this.vy = -maxSpd;

                if (this.x < 20 || this.x > canvas.width - 20) this.vx *= -1;
                if (this.y < 20 || this.y > canvas.height - 100) this.vy *= -1;
  } else if (this.state === 'perching') {
                this.flapCycle = 0;
                let isNocturnal = this.customData && this.customData.habit === 'nocturnal';
                let sleeping = isNight && !isNocturnal;
                
                if (!sleeping) {
                    if(Math.random() < 0.02) this.x += (Math.random() - 0.5) * 15; 
                    let hopChance = (this.customData && this.customData.habit === 'branch hog') ? 0.001 : 0.01;
                    if(Math.random() < hopChance) { this.state = 'flying'; this.vy = -3 * speedMult; } 
                }
            }

            if (this.hunger > 10 && !isNight) {
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
                    this.swoopCp = {x: this.x + (target.x - this.x)*0.8, y: Math.max(this.y, target.y) + 80}; 
                }
            }

                 let libidoMultiplier = (this.customData && this.customData.libido) ? this.customData.libido / 5 : 1;
            let canMate = this.state === 'perching' || this.y > canvas.height - 60; // Trees or ground only
            if (canMate && this.age > 365 && Math.random() < (0.001 * libidoMultiplier)) {
                let mate = birds.find(b => b !== this && b.age > 365 && b.state !== 'seeking_mate' && b.state !== 'mating' && b.state !== 'dead' && (b.state === 'perching' || b.y > canvas.height - 60));
                if (mate) {
                    this.state = 'seeking_mate';
                    this.target = mate;
                    // Do NOT set mate's state to seeking, they stay perching/grounded so egg isn't mid-air
                }
            }

            let isNocturnal = this.customData && this.customData.habit === 'nocturnal';
            if (this.state === 'flying') {
                let seekChance = (isNight && !isNocturnal) ? 0.1 : 0.03; // Seek trees aggressively at night
                if (Math.random() < seekChance) {
                    let targetTree = trees[Math.floor(Math.random() * trees.length)];
                    this.state = 'seeking_tree';
                    this.target = {x: targetTree.x + (Math.random() - 0.5) * 100, y: targetTree.y - targetTree.h + (Math.random() - 0.5) * 50};
                }
            }

        } else if (this.state === 'seeking_birdhouse') {
            this.flapCycle += 0.6 * speedMult;
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.hypot(dx, dy);
            this.x += (dx / dist) * 3 * speedMult;
            this.y += (dy / dist) * 3 * speedMult;
            if (dist < 10) {
                if (this.target.occupants.length < 3) {
                    this.target.occupants.push(this);
                    this.inBirdhouse = this.target;
                    this.state = 'sleeping';
                } else {
                    this.state = 'flying'; 
                }
            }
        } else if (this.state === 'swooping') {
            this.flapCycle += 0.2 * speedMult; 
            this.swoopProgress += (deltaTime / 1000) * 1.5 * speedMult;
            
            if (this.swoopProgress >= 1) {
                this.swoopProgress = 1;
                this.hunger = 0;
                if (this.targetType === 'bug') bugs = bugs.filter(b => b !== this.target);
                if (this.targetType === 'seed') seeds = seeds.filter(s => s !== this.target);
                if (this.targetType === 'feeder') this.target.food -= 10;
                this.state = 'flying'; this.vy = -3 * speedMult; 
            } else {
                let t = this.swoopProgress;
                let invT = 1 - t;
                this.x = invT * invT * this.swoopStart.x + 2 * invT * t * this.swoopCp.x + t * t * this.target.x;
                this.y = invT * invT * this.swoopStart.y + 2 * invT * t * this.swoopCp.y + t * t * this.target.y;
            }
        } else if (this.state === 'seeking_tree') {
            this.flapCycle += 0.6 * speedMult;
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.hypot(dx, dy);
            this.x += (dx / dist) * 3 * speedMult;
            this.y += (dy / dist) * 3 * speedMult;
            if (dist < 10) { this.state = 'perching'; this.vy = 0; }
          } else if (this.state === 'seeking_mate') {
            if (!this.target || this.target.state === 'dead' || this.target.state === 'mating') {
                this.state = 'flying'; // Cancel if mate moved or died
                return;
            }
            this.flapCycle += 0.6 * speedMult;
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 10) {
                this.x += (dx / dist) * 3 * speedMult;
                this.y += (dy / dist) * 3 * speedMult;
            } else {
                this.state = 'mating';
                this.target.state = 'mating';
                setTimeout(() => {
                    if (this.state === 'dead') return;
                    this.state = 'flying'; 
                    if(this.target && this.target.state !== 'dead') {
                        this.target.state = 'flying';
                        
                        // Cross-breeding trait mixing
                        let mix = (t1, t2) => Math.random() < 0.5 ? t1 : t2;
                        let cd1 = this.customData || {};
                        let cd2 = this.target.customData || {};
                        
                        let newCustomData = {
                            bodyColor: mix(this.bodyColor, this.target.bodyColor),
                            wingColor: mix(this.wingColor, this.target.wingColor),
                            body: mix(cd1.body || 'normal', cd2.body || 'normal'),
                            head: mix(cd1.head || (this.species==='Cardinal'||this.species==='Blue Jay'?'crested':'smooth'), cd2.head || (this.target.species==='Cardinal'||this.target.species==='Blue Jay'?'crested':'smooth')),
                            beak: mix(cd1.beak || 'short', cd2.beak || 'short'),
                            wing: mix(cd1.wing || 'pointed', cd2.wing || 'pointed'),
                            tail: mix(cd1.tail || 'normal', cd2.tail || 'normal'),
                            habit: mix(cd1.habit || 'normal', cd2.habit || 'normal'),
                            size: mix(cd1.size || 1, cd2.size || 1),
                            lifespan: mix(cd1.lifespan || 3650, cd2.lifespan || 3650),
                            libido: mix(cd1.libido || 5, cd2.libido || 5),
                            speed: mix(cd1.speed || 1, cd2.speed || 1),
                            temperament: mix(cd1.temperament || 5, cd2.temperament || 5)
                        };
                        
                        let newSpecies = this.species === this.target.species ? this.species : `Hybrid ${this.species.split(' ')[0]}-${this.target.species.split(' ')[0]}`;

                        eggs.push({x: this.x, y: this.y, species: newSpecies, hatchTime: 100, parent1: this.name, parent2: this.target.name, p1Id: this.clientId, p2Id: this.target.clientId, customData: newCustomData});
                        chronology.push(`${this.name} and ${this.target.name} laid an egg!`);
                        this.target = null;
                    }
                }, 2000);
            }
        }
    }

      drawMathBird(ctx) {
        if (this.inBirdhouse) return; // Don't draw if inside birdhouse

        ctx.save();
        ctx.globalAlpha = Math.max(0, this.opacity);
        ctx.translate(this.x, this.y);
        
        // 365 days = 1 year. At 100x multiplier, this takes 3.65 real seconds to reach full size.
        let growthScale = Math.min(1, 0.25 + (this.age / 365) * 0.75); 
        let customScale = (this.customData && this.customData.size) ? parseFloat(this.customData.size) : 1;
        let scale = growthScale * customScale;
        
        let angle = Math.atan2(this.vy, this.vx);
        
        if (this.state === 'perching' || this.state === 'mating' || this.state === 'dragged') angle = 0;
        if (this.vx < 0) { ctx.scale(-scale, scale); } else { ctx.scale(scale, scale); }
        if (this.state !== 'perching' && this.state !== 'mating' && this.state !== 'dragged') ctx.rotate(angle);
        if (this.state === 'dead') { ctx.scale(1, -1); angle = 0; } // Fall upside down

        let tailType = this.customData?.tail || 'normal';
        let bodyType = this.customData?.body || 'normal';
        let headType = this.customData?.head || 'smooth';
        let beakType = this.customData?.beak || 'short';
        let wingType = this.customData?.wing || 'pointed';

        ctx.fillStyle = this.wingColor;
        ctx.beginPath();
        if (tailType === 'forked') {
            ctx.moveTo(-10, 0); ctx.lineTo(-30, -10); ctx.lineTo(-20, 0); ctx.lineTo(-30, 10);
        } else if (tailType === 'fan') {
            ctx.moveTo(-10, 0); ctx.arc(-10, 0, 15, Math.PI*0.7, Math.PI*1.3);
        } else { 
            ctx.moveTo(-10, 0); ctx.lineTo(-25, -5); ctx.lineTo(-25, 5);
        }
        ctx.fill();

        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        if (bodyType === 'slim') ctx.ellipse(0, 0, 15, 7, 0, 0, Math.PI * 2);
        else if (bodyType === 'plump') ctx.ellipse(0, 0, 18, 14, 0, 0, Math.PI * 2);
        else ctx.ellipse(0, 0, 15, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        if (headType === 'crested' || this.species === 'Blue Jay' || this.species === 'Cardinal') {
            ctx.beginPath(); ctx.moveTo(5, -8); ctx.lineTo(0, -18); ctx.lineTo(-5, -8); ctx.fill();
        }

        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        if (beakType === 'long') {
            ctx.moveTo(12, -2); ctx.lineTo(28, 0); ctx.lineTo(12, 2);
        } else if (beakType === 'curved') {
            ctx.moveTo(12, -2); ctx.quadraticCurveTo(22, -5, 20, 5); ctx.lineTo(12, 2);
        } else { 
            ctx.moveTo(12, -2); ctx.lineTo(20, 0); ctx.lineTo(12, 2);
        }
        ctx.fill();
        let flapOffset = (this.state !== 'perching' && this.state !== 'mating' && this.state !== 'dragged' && this.state !== 'dead') ? Math.sin(this.flapCycle) * 15 : 0;
        ctx.fillStyle = this.wingColor;
        ctx.beginPath();
        if (wingType === 'rounded') {
            ctx.ellipse(0, -5 + flapOffset/2, 10, 6, Math.PI/4 + flapOffset/20, 0, Math.PI*2);
        } else { 
            ctx.moveTo(-5, -5); ctx.lineTo(-15, -20 + flapOffset); ctx.lineTo(5, -5);
        }
        ctx.fill();

        ctx.restore();

        // Draw hover circle
        if (window.hoveredBird === this && this.state !== 'dead') {
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 35 * scale, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

function drawEnvironment() {
    const cycleDuration = 15 * 60 * 1000; 
    const cycleProgress = (window.gameTime % cycleDuration) / cycleDuration;
    
    let color;
    if (cycleProgress < 0.1) color = '#ffb347'; 
    else if (cycleProgress < 0.4) color = '#87CEEB'; 
    else if (cycleProgress < 0.5) color = '#ff7e67'; 
    else color = '#0B1D3A'; 
    document.getElementById('sky-overlay').style.backgroundColor = color;

   // Background Hills
    ctx.fillStyle = '#3a5f27';
    ctx.beginPath();
    ctx.ellipse(canvas.width * 0.2, canvas.height - 50, canvas.width * 0.4, 150, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(canvas.width * 0.8, canvas.height - 50, canvas.width * 0.5, 200, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Background distant trees
    ctx.fillStyle = '#224016';
    for(let i = 1; i < 10; i++) {
        let dx = canvas.width * (i / 10);
        let dy = canvas.height - 80 + Math.sin(i) * 30;
        ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx - 15, dy + 40); ctx.lineTo(dx + 15, dy + 40); ctx.fill();
    }

    // Foreground Ground
    ctx.fillStyle = '#2d4c1e';
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

    trees.forEach(t => {
        ctx.fillStyle = '#4B3621';
        ctx.fillRect(t.x - t.w/2, t.y - t.h, t.w, t.h); 
        t.branches.forEach(b => {
            ctx.fillRect(b.side === 1 ? t.x : t.x - b.w, b.y, b.w, 15); 
        });
        ctx.fillStyle = '#228B22';
        ctx.beginPath(); ctx.arc(t.x, t.y - t.h, 100, 0, Math.PI*2); ctx.fill();
    });

    feeders.forEach(f => {
        ctx.fillStyle = '#8B4513'; ctx.fillRect(f.x - 15, f.y, 30, 40);
        ctx.fillStyle = '#FFD700'; ctx.fillRect(f.x - 10, f.y + 10, 20, (f.food / 100) * 30);
    });

    // Draw Birdhouses
    birdhouses.forEach(h => {
        ctx.fillStyle = '#c19a6b'; ctx.fillRect(h.x - 20, h.y, 40, 40);
        ctx.fillStyle = '#8B0000'; ctx.beginPath(); ctx.moveTo(h.x - 25, h.y); ctx.lineTo(h.x, h.y - 20); ctx.lineTo(h.x + 25, h.y); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(h.x, h.y + 20, 10, 0, Math.PI*2); ctx.fill();
    });

    ctx.fillStyle = '#eedd82';
    seeds.forEach(s => { ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, Math.PI*2); ctx.fill(); });
    
    // Draw Worms
    ctx.strokeStyle = '#ffb6c1';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    bugs.forEach(b => { 
        ctx.beginPath(); 
        let squirm = Math.sin(b.cycle || 0) * 3;
        ctx.moveTo(b.x - 5, b.y);
        ctx.quadraticCurveTo(b.x, b.y - 5 - squirm, b.x + 5, b.y);
        ctx.stroke(); 
    });

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

    // Calculate hovered bird for slowdown and circle, even when paused
    window.hoveredBird = birds.find(b => !b.inBirdhouse && b.state !== 'dead' && Math.hypot(b.x - window.mouseX, b.y - window.mouseY) < 30);
    
    if (!window.isPaused) {
        const timeScale = window.hoveredBird ? 0.5 : 1.0;
        const speedMult = window.gameSpeedMultiplier || 1;
        const scaledDelta = deltaTime * timeScale * speedMult;
        
        window.gameTime += scaledDelta; // Advance internal game time

        timeSinceLastBug += scaledDelta;
        if (timeSinceLastBug > nextBugInterval && bugs.length < 20) {
            bugs.push({
                x: Math.random() * canvas.width, 
                y: canvas.height - 30 + (Math.random() * 20 - 10), 
                vx: (Math.random() - 0.5) * 20, 
                cycle: Math.random() * Math.PI * 2
            });
            timeSinceLastBug = 0;
            nextBugInterval = Math.random() * 20000 + 10000; // 10s to 30s
        }

        bugs.forEach(b => {
            b.x += (b.vx * scaledDelta) / 1000;
            b.cycle += (scaledDelta / 1000) * 15;
            if (b.x < 0 || b.x > canvas.width) b.vx *= -1;
            if (Math.random() < 0.01) b.vx *= -1; // Randomly change direction
        });

        eggs.forEach(e => {
            e.hatchTime -= scaledDelta / 1000 * BIRD_AGING_MULTIPLIER;
            if (e.hatchTime <= 0) {
                birds.push(new Bird(e.x, e.y, e.species, e.customData, null, 0, `Baby ${e.species}`, [e.p1Id, e.p2Id]));
                chronology.push(`A new ${e.species} hatched from ${e.parent1} and ${e.parent2}!`);
            }
        });
        eggs = eggs.filter(e => e.hatchTime > 0);

        birds.forEach(bird => { bird.update(scaledDelta); bird.drawMathBird(ctx); });
    } else {
        // If paused, just draw them in their current state so dragging/hovering updates visually
        birds.forEach(bird => { 
            if (bird.state === 'dragged') {
                bird.x = window.mouseX;
                bird.y = window.mouseY;
            }
            bird.drawMathBird(ctx); 
        });
    }

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
window.getBirds = () => birds;
window.removeBird = (bird) => { birds = birds.filter(b => b !== bird); };