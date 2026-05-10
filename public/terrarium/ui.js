let selectedBird = null;
let draggedBird = null;
let isDraggingBird = false;

// Desktop Drag and Drop
document.getElementById('seed-bag').addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', 'seed'));
document.getElementById('feeder-item').addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', 'feeder'));
document.getElementById('birdhouse-item').addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', 'birdhouse'));

const canvasEl = document.getElementById('gameCanvas');
canvasEl.addEventListener('dragover', e => e.preventDefault());
canvasEl.addEventListener('drop', e => {
    e.preventDefault();
    const rect = canvasEl.getBoundingClientRect();
    handleItemDrop(e.dataTransfer.getData('text/plain'), e.clientX - rect.left, e.clientY - rect.top);
});

// Mobile/Universal Click-to-Place & Bird Click/Drag
let activeTool = null;
document.getElementById('seed-bag').addEventListener('click', () => activeTool = 'seed');
document.getElementById('feeder-item').addEventListener('click', () => activeTool = 'feeder');
document.getElementById('birdhouse-item').addEventListener('click', () => activeTool = 'birdhouse');

canvasEl.addEventListener('mousedown', e => {
    const rect = canvasEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool) {
        handleItemDrop(activeTool, x, y);
        activeTool = null;
        return;
    }

    let clickedBird = birds.find(b => !b.inBirdhouse && Math.hypot(b.x - x, b.y - y) < 30);
    if (clickedBird) {
        draggedBird = clickedBird;
        isDraggingBird = false;
        draggedBird.state = 'dragged';
    }
});

canvasEl.addEventListener('mousemove', e => {
    const rect = canvasEl.getBoundingClientRect();
    window.mouseX = e.clientX - rect.left;
    window.mouseY = e.clientY - rect.top;

    if (draggedBird) {
        isDraggingBird = true;
        draggedBird.x = window.mouseX;
        draggedBird.y = window.mouseY;
    }
});

window.addEventListener('mouseup', e => {
    if (draggedBird) {
        const nestRect = document.getElementById('retire-nest').getBoundingClientRect();
        let inNestX = e.clientX >= nestRect.left && e.clientX <= nestRect.right;
        let inNestY = e.clientY >= nestRect.top && e.clientY <= nestRect.bottom;

        if (isDraggingBird && inNestX && inNestY) {
            let index = window.birds.indexOf(draggedBird);
            if(index > -1) window.birds.splice(index, 1);
            window.chronology.push(`${draggedBird.name} was retired to the nest.`);
        } else if (!isDraggingBird) {
            selectedBird = draggedBird;
            document.getElementById('bird-name').value = draggedBird.name;
            document.getElementById('bird-species').innerText = draggedBird.species;
            document.getElementById('bird-age').innerText = Math.floor(draggedBird.age);
            document.getElementById('bird-fact').innerText = birdFacts[draggedBird.species] || 'A unique custom bird!';
            document.getElementById('bird-modal').classList.remove('hidden');
        }
        
        if (window.birds.includes(draggedBird)) draggedBird.state = 'flying';
        draggedBird = null;
    }
});

function handleItemDrop(type, x, y) {
    if (type === 'seed') {
        let droppedOnFeeder = feeders.find(f => Math.hypot(f.x - x, f.y - y) < 40);
        if (droppedOnFeeder) droppedOnFeeder.food = 100;
        else for(let i=0; i<5; i++) seeds.push({x: x + (Math.random()-0.5)*40, y: canvasEl.height - 50, amount: 10});
    } else if (type === 'feeder' || type === 'birdhouse') {
        let hung = false;
        trees.forEach(t => t.branches.forEach(b => {
            let branchX = b.side === 1 ? t.x : t.x - b.w;
            if (x > branchX && x < branchX + b.w && Math.abs(y - b.y) < 100) {
                if(type === 'feeder') feeders.push({x: x, y: b.y + 10, food: 100});
                if(type === 'birdhouse') birdhouses.push({x: x, y: b.y - 20, occupants: []});
                hung = true;
            }
        }));
        if(!hung) {
            if(type === 'feeder') feeders.push({x: x, y: canvasEl.height - 90, food: 100}); 
            if(type === 'birdhouse') birdhouses.push({x: x, y: canvasEl.height - 90, occupants: []}); 
        }
    }
}

// Global Audio Unlock
document.body.addEventListener('click', () => {
    if(window.unlockAudio) window.unlockAudio();
}, { once: true });

// Bindings
document.getElementById('bird-name').addEventListener('input', (e) => {
    if (selectedBird) {
        selectedBird.name = e.target.value;
        let reg = window.birdRegistry.find(b => b.id === selectedBird.clientId);
        if (reg) { reg.name = selectedBird.name; reg.customName = true; }
    }
});

function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

document.getElementById('custom-bird-btn').addEventListener('click', () => {
    document.getElementById('custom-maker-modal').classList.remove('hidden');
});

document.getElementById('pause-btn').addEventListener('click', (e) => {
    window.isPaused = !window.isPaused;
    e.target.innerText = window.isPaused ? 'Resume' : 'Pause';
});

document.getElementById('chronology-btn').addEventListener('click', () => {
    const list = document.getElementById('chronology-list');
    
    // Sort registry: custom named first, then alphabetically
    let sortedRegistry = [...window.birdRegistry].sort((a, b) => {
        if (a.customName && !b.customName) return -1;
        if (!a.customName && b.customName) return 1;
        return a.name.localeCompare(b.name);
    });

    let html = '<h4>Family Trees & Roster</h4><ul>';
    if (sortedRegistry.length > 0) {
        sortedRegistry.forEach(bird => {
            let parentNames = "Unknown";
            if (bird.parents && bird.parents.length === 2) {
                let p1 = window.birdRegistry.find(b => b.id === bird.parents[0]);
                let p2 = window.birdRegistry.find(b => b.id === bird.parents[1]);
                if (p1 && p2) parentNames = `${p1.name} & ${p2.name}`;
            }
            html += `<li><strong>${bird.name}</strong> (${bird.species}) - Parents: ${parentNames}</li>`;
        });
    } else {
        html += '<li>No birds born yet...</li>';
    }
    html += '</ul><h4>Event Log</h4><ul>';
    html += window.chronology && window.chronology.length > 0 
        ? window.chronology.map(c => `<li>${c}</li>`).join('') 
        : '<li>No history yet...</li>';
    html += '</ul>';

    list.innerHTML = html;
    document.getElementById('chronology-modal').classList.remove('hidden');
});

document.getElementById('immortal-toggle').addEventListener('change', (e) => isImmortal = e.target.checked);

function createCustomBird() {
    const name = document.getElementById('c-name').value || 'Custom Species';
    const bodyColor = document.getElementById('c-body').value;
    const wingColor = document.getElementById('c-wing').value;
    
    // New Components
    const body = document.getElementById('c-body-type').value;
    const head = document.getElementById('c-head-type').value;
    const beak = document.getElementById('c-beak-type').value;
    const wing = document.getElementById('c-wing-type').value;
    const tail = document.getElementById('c-tail-type').value;

    const habit = document.getElementById('c-habit').value;
    const size = document.getElementById('c-size').value;
    const lifespan = document.getElementById('c-lifespan').value;
    const libido = document.getElementById('c-libido').value;
    const speed = document.getElementById('c-speed').value;
    const temperament = document.getElementById('c-temperament').value;
    
    const customData = { bodyColor, wingColor, body, head, beak, wing, tail, habit, size, lifespan, libido, speed, temperament };
    
    // 1. Add to Roster
    const roster = document.getElementById('custom-roster');
    const btn = document.createElement('button');
    btn.innerText = name;
    btn.onclick = () => spawnBird(name, customData);
    roster.appendChild(btn);
    
    // 2. Spawn immediately (Hatch)
    spawnBird(name, customData);
    
    // 3. Close the modal
    closeModal('custom-maker-modal');
}