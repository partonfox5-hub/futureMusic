let selectedBird = null;

// Desktop Drag and Drop
document.getElementById('seed-bag').addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', 'seed'));
document.getElementById('feeder-item').addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', 'feeder'));

const canvasEl = document.getElementById('gameCanvas');
canvasEl.addEventListener('dragover', e => e.preventDefault());
canvasEl.addEventListener('drop', e => {
    e.preventDefault();
    const rect = canvasEl.getBoundingClientRect();
    handleItemDrop(e.dataTransfer.getData('text/plain'), e.clientX - rect.left, e.clientY - rect.top);
});

// Mobile/Universal Click-to-Place & Bird Click
let activeTool = null;
document.getElementById('seed-bag').addEventListener('click', () => activeTool = 'seed');
document.getElementById('feeder-item').addEventListener('click', () => activeTool = 'feeder');

canvasEl.addEventListener('click', e => {
    const rect = canvasEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool) {
        handleItemDrop(activeTool, x, y);
        activeTool = null;
        return;
    }

    let clickedBird = birds.find(b => Math.hypot(b.x - x, b.y - y) < 30);
    if (clickedBird) {
        selectedBird = clickedBird;
        document.getElementById('bird-name').value = clickedBird.name;
        document.getElementById('bird-species').innerText = clickedBird.species;
        document.getElementById('bird-age').innerText = Math.floor(clickedBird.age);
        document.getElementById('bird-fact').innerText = birdFacts[clickedBird.species] || 'A unique custom bird!';
        document.getElementById('bird-modal').classList.remove('hidden');
    }
});

function handleItemDrop(type, x, y) {
    if (type === 'seed') {
        let droppedOnFeeder = feeders.find(f => Math.hypot(f.x - x, f.y - y) < 40);
        if (droppedOnFeeder) droppedOnFeeder.food = 100;
        else for(let i=0; i<5; i++) seeds.push({x: x + (Math.random()-0.5)*40, y: canvasEl.height - 50, amount: 10});
    } else if (type === 'feeder') {
        let hung = false;
        trees.forEach(t => t.branches.forEach(b => {
            let branchX = b.side === 1 ? t.x : t.x - b.w;
            if (x > branchX && x < branchX + b.w && Math.abs(y - b.y) < 100) {
                feeders.push({x: x, y: b.y + 10, food: 100}); hung = true;
            }
        }));
        if(!hung) feeders.push({x: x, y: canvasEl.height - 90, food: 100}); 
    }
}

// Bindings
document.getElementById('bird-name').addEventListener('input', (e) => {
    if (selectedBird) selectedBird.name = e.target.value;
});

function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

document.getElementById('custom-bird-btn').addEventListener('click', () => {
    document.getElementById('custom-maker-modal').classList.remove('hidden');
});

document.getElementById('chronology-btn').addEventListener('click', () => {
    const list = document.getElementById('chronology-list');
    list.innerHTML = chronology.length ? chronology.map(c => `<li>${c}</li>`).join('') : '<li>No history yet...</li>';
    document.getElementById('chronology-modal').classList.remove('hidden');
});

document.getElementById('immortal-toggle').addEventListener('change', (e) => isImmortal = e.target.checked);

function createCustomBird() {
    const name = document.getElementById('c-name').value || 'Custom Species';
    const bodyColor = document.getElementById('c-body').value;
    const wingColor = document.getElementById('c-wing').value;
    const habit = document.getElementById('c-habit').value;
    const size = document.getElementById('c-size').value;
    const lifespan = document.getElementById('c-lifespan').value;
    const libido = document.getElementById('c-libido').value;
    
    const customData = { bodyColor, wingColor, habit, size, lifespan, libido };
    
    const roster = document.getElementById('custom-roster');
    const btn = document.createElement('button');
    btn.innerText = name;
    btn.onclick = () => spawnBird(name, customData);
    roster.appendChild(btn);
    
    closeModal('custom-maker-modal');
}