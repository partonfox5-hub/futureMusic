(() => {
  const canvas = document.getElementById("view");
  const ctx = canvas.getContext("2d");
  const overlayEl = document.getElementById("overlay");
  const keys = {};
  let W = 0, H = 0;
  const mouse = { x: 0, y: 0, live: false, left: 0, right: 0, mid: 0 };
  const CELL = 26;
  const WORLD = 3800;

  const SHAPES = [
    [[0, 0], [1, 0], [2, 0], [3, 0]],
    [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [2, 0], [1, 1]],
    [[0, 0], [0, 1], [0, 2], [1, 2]],
    [[1, 0], [1, 1], [1, 2], [0, 2]],
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[0, 0], [1, 0], [2, 0]],
    [[0, 0], [1, 0]],
    [[0, 0], [0, 1], [1, 1]],
    [[0, 0]],
  ];

  const MODS = ["laser", "thrust", "speed", "field", "claw", "batt", "gen", "missile"];
  const BATT_CAP = 100;
  const LASER_COST = 3.75;
  const THRUST_DRAIN = 16.5;
  const FIELD_DRAIN = 3;
  const MOVE_DRAIN = FIELD_DRAIN / 6;
  const ENEMY_EFF = 2.5;
  const PLAYER_EFF = 1.3;
  const PLAYER_FIELD_EFF = 2;
  const ENEMY_ROF = 0.7;
  const SPD_MUL = 1.05;
  const SPAWN_SLOW = 1.15;

  const SFX = {
    ac: null,
    rumble: null,
    fieldWas: false,
    thrustWas: false,
    ctx() {
      try {
        if (!this.ac) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return null;
          this.ac = new AC();
        }
        if (this.ac.state === "suspended") this.ac.resume();
        return this.ac;
      } catch (e) {
        return null;
      }
    },
    unlock() {
      this.ctx();
      BGM.start();
    },
    fuse(player) {
      if (player) {
        this.tone(1650, 0.035, "square", 0.09, 1100);
        this.tone(2400, 0.025, "square", 0.05);
        this.noise(0.03, 0.04, 2500);
      } else {
        this.tone(380, 0.06, "square", 0.07, 180);
        this.tone(220, 0.08, "triangle", 0.05, 110);
      }
    },
    tone(freq, dur, type, vol, slide) {
      const ac = this.ctx();
      if (!ac) return;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type || "square";
      o.frequency.setValueAtTime(freq, ac.currentTime);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), ac.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.08, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      o.connect(g);
      g.connect(ac.destination);
      o.start();
      o.stop(ac.currentTime + dur + 0.02);
    },
    noise(dur, vol, hp) {
      const ac = this.ctx();
      if (!ac) return;
      const n = Math.max(1, (ac.sampleRate * dur) | 0);
      const buf = ac.createBuffer(1, n, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource();
      src.buffer = buf;
      const f = ac.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = hp || 900;
      const g = ac.createGain();
      g.gain.setValueAtTime(vol || 0.12, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      src.connect(f);
      f.connect(g);
      g.connect(ac.destination);
      src.start();
    },
    fire(gun, team) {
      if (gun && gun.missile) {
        this.noise(0.14, 0.1, 500);
        this.tone(team === "p" ? 160 : 120, 0.16, "sawtooth", 0.07, 50);
        return;
      }
      if (gun && gun.large) {
        this.tone(team === "p" ? 240 : 170, 0.12, "sawtooth", 0.09, 90);
        this.noise(0.08, 0.06, 700);
        return;
      }
      if (team === "p") this.tone(980 + Math.random() * 420, 0.045, "square", 0.055, 1400);
      else this.tone(320 + Math.random() * 180, 0.055, "square", 0.05, 180);
    },
    hit(kind) {
      if (kind === "boom") {
        this.noise(0.28, 0.16, 400);
        this.tone(90, 0.22, "sine", 0.1, 40);
      } else if (kind === "field") {
        this.tone(700 + Math.random() * 200, 0.04, "sine", 0.04, 200);
      } else {
        this.noise(0.06, 0.08, 1400);
        this.tone(220 + Math.random() * 90, 0.05, "triangle", 0.04, 80);
      }
    },
    field(on) {
      if (on) {
        this.tone(180, 0.38, "sine", 0.09, 720);
        this.tone(90, 0.4, "triangle", 0.04, 360);
      } else {
        this.tone(640, 0.42, "sine", 0.08, 90);
        this.tone(320, 0.36, "triangle", 0.03, 60);
      }
    },
    emp() {
      this.tone(1400, 0.08, "sine", 0.07, 400);
      this.tone(90, 0.12, "square", 0.05, 40);
      this.noise(0.1, 0.06, 2000);
    },
    warp() {
      this.tone(520, 0.35, "sine", 0.08, 140);
      this.tone(260, 0.4, "triangle", 0.05, 70);
    },
    stun() {
      this.tone(80, 0.2, "sawtooth", 0.07, 40);
      this.noise(0.15, 0.08, 600);
    },
    coreBoom() {
      this.noise(0.5, 0.24, 220);
      this.noise(0.22, 0.14, 1600);
      this.tone(70, 0.55, "sine", 0.14, 22);
      this.tone(160, 0.32, "sawtooth", 0.1, 36);
      this.tone(980, 0.09, "square", 0.07, 140);
      this.tone(2100, 0.06, "square", 0.045, 280);
      this.tone(440, 0.12, "triangle", 0.06, 90);
    },
    setThrust(on) {
      const ac = this.ctx();
      if (!ac) return;
      if (on && !this.rumble) {
        const o = ac.createOscillator();
        const o2 = ac.createOscillator();
        const g = ac.createGain();
        o.type = "sawtooth";
        o2.type = "square";
        o.frequency.value = 62;
        o2.frequency.value = 93;
        g.gain.value = 0.035;
        o.connect(g);
        o2.connect(g);
        g.connect(ac.destination);
        o.start();
        o2.start();
        this.rumble = { o, o2, g };
      }
      if (!on && this.rumble) {
        try {
          this.rumble.o.stop();
          this.rumble.o2.stop();
        } catch (e) {}
        this.rumble = null;
        this.tone(70, 0.12, "sawtooth", 0.04, 30);
      }
    },
  };

  const BGM = {
    list: ["audio/star-blaster.mp3", "audio/brass-circuit-jig.mp3"],
    i: 0,
    el: null,
    started: false,
    start() {
      if (this.started) return;
      this.started = true;
      this.play(0);
    },
    play(i) {
      this.i = ((i % this.list.length) + this.list.length) % this.list.length;
      if (this.el) {
        try {
          this.el.pause();
        } catch (e) {}
      }
      const a = new Audio(this.list[this.i]);
      a.volume = 0.09;
      a.addEventListener("ended", () => this.play(this.i + 1));
      a.play().catch(() => {
        this.started = false;
      });
      this.el = a;
    },
  };

  const GUNS = {
    needle: { power: 1, r: 2.2, spd: 360, cd: 1.55, count: 1, fan: 0, color: "#ff7a88" },
    pulse: { power: 1, r: 3.1, spd: 320, cd: 1.05, count: 1, fan: 0, color: "#ff5a6a" },
    spread: { power: 1, r: 2.6, spd: 310, cd: 1.15, count: 3, fan: 0.42, color: "#ff8060" },
    lance: { power: 3, r: 7.2, spd: 290, cd: 1.85, count: 1, fan: 0, color: "#ff3060", large: 1 },
    burst: { power: 1, r: 2.4, spd: 400, cd: 1.45, count: 1, fan: 0, color: "#ff9a40", burst: 4 },
    spiral: { power: 1, r: 2.5, spd: 250, cd: 0.16, count: 1, fan: 0, color: "#ff64a0" },
    mortar: { power: 2, r: 8.5, spd: 150, cd: 1.7, count: 1, fan: 0, color: "#ffb040" },
    twin: { power: 1, r: 2.8, spd: 360, cd: 0.8, count: 2, fan: 0.18, color: "#ff546c" },
    prism: { power: 2, r: 3.4, spd: 380, cd: 0.95, count: 5, fan: 0.7, color: "#ff40a0" },
    siege: { power: 4, r: 10, spd: 240, cd: 2.3, count: 1, fan: 0, color: "#ff2038", large: 1 },
    nova: { power: 2, r: 3.8, spd: 270, cd: 2.1, count: 8, fan: 6.28, color: "#ff8060" },
  };

  const FLEET = [
    {
      name: "dusk probe",
      gun: "needle",
      ai: "kite",
      range: 270,
      spd: 155,
      cells: [
        [0, 0, "core"],
        [0, -1, "wall"],
        [0, 1, "wall"],
        [-1, 0, "batt"],
        [1, 0, "laser"],
      ],
    },
    {
      name: "red fang",
      gun: "pulse",
      ai: "chase",
      range: 220,
      spd: 165,
      cells: [
        [0, 0, "core"],
        [-1, 0, "wall"],
        [1, 0, "wall"],
        [0, 1, "wall"],
        [-1, -1, "laser"],
        [1, -1, "laser"],
        [0, -1, "wall"],
      ],
    },
    {
      name: "scarab",
      gun: "spread",
      ai: "orbit",
      range: 300,
      spd: 120,
      cells: [
        [0, 0, "core"],
        [-1, 0, "wall"],
        [1, 0, "wall"],
        [0, -1, "wall"],
        [0, 1, "wall"],
        [-1, -1, "wall"],
        [1, -1, "wall"],
        [-1, 1, "field"],
        [1, 1, "laser"],
      ],
    },
    {
      name: "glass pike",
      gun: "lance",
      ai: "snipe",
      range: 520,
      spd: 110,
      cells: [
        [0, 0, "core"],
        [0, -1, "wall"],
        [0, 1, "wall"],
        [0, -2, "wall"],
        [0, 2, "wall"],
        [1, 0, "laser"],
        [2, 0, "laser"],
        [-1, 0, "wall"],
      ],
    },
    {
      name: "iron ram",
      gun: "pulse",
      ai: "ram",
      range: 80,
      spd: 190,
      cells: [
        [0, 0, "core"],
        [-1, 0, "wall"],
        [1, 0, "wall"],
        [0, -1, "wall"],
        [-1, -1, "wall"],
        [1, -1, "wall"],
        [0, 1, "thrust"],
        [-1, 1, "thrust"],
        [1, 1, "wall"],
        [0, -2, "wall"],
      ],
    },
    {
      name: "gyre",
      gun: "spiral",
      ai: "spin",
      range: 240,
      spd: 130,
      cells: [
        [0, 0, "core"],
        [1, 0, "laser"],
        [-1, 0, "laser"],
        [0, 1, "laser"],
        [0, -1, "laser"],
        [1, 1, "wall"],
        [-1, -1, "wall"],
        [1, -1, "wall"],
        [-1, 1, "wall"],
      ],
    },
    {
      name: "howler",
      gun: "burst",
      ai: "kite",
      range: 310,
      spd: 125,
      cells: [
        [0, 0, "core"],
        [-1, 0, "wall"],
        [1, 0, "wall"],
        [0, 1, "wall"],
        [0, -1, "wall"],
        [-2, 0, "laser"],
        [2, 0, "laser"],
        [-1, -1, "wall"],
        [1, -1, "wall"],
        [0, 2, "thrust"],
      ],
    },
    {
      name: "veil moth",
      gun: "mortar",
      ai: "orbit",
      range: 340,
      spd: 100,
      cells: [
        [0, 0, "core"],
        [-1, 0, "field"],
        [1, 0, "field"],
        [0, -1, "wall"],
        [0, 1, "wall"],
        [-1, -1, "wall"],
        [1, 1, "wall"],
        [0, -2, "laser"],
        [-2, 0, "wall"],
        [2, 0, "wall"],
      ],
    },
    {
      name: "hook crab",
      gun: "twin",
      ai: "chase",
      range: 200,
      spd: 140,
      cells: [
        [0, 0, "core"],
        [-1, 0, "wall"],
        [1, 0, "wall"],
        [0, 1, "wall"],
        [-2, 0, "claw"],
        [2, 0, "claw"],
        [-1, -1, "laser"],
        [1, -1, "laser"],
        [0, -1, "wall"],
      ],
    },
    {
      name: "sunbiter",
      gun: "spread",
      ai: "kite",
      range: 280,
      spd: 95,
      cells: [
        [0, 0, "core"],
        [-1, 0, "wall"],
        [1, 0, "wall"],
        [0, -1, "wall"],
        [0, 1, "wall"],
        [-1, -1, "laser"],
        [1, -1, "laser"],
        [-1, 1, "laser"],
        [1, 1, "laser"],
        [-2, 0, "wall"],
        [2, 0, "wall"],
        [0, -2, "speed"],
        [0, 2, "field"],
      ],
    },
    {
      name: "night barge",
      gun: "twin",
      ai: "kite",
      range: 320,
      spd: 90,
      cells: [
        [0, 0, "core"],
        [-1, 0, "wall"], [1, 0, "wall"], [0, -1, "wall"], [0, 1, "wall"],
        [-2, 0, "wall"], [2, 0, "wall"], [0, -2, "wall"], [0, 2, "wall"],
        [-1, -1, "wall"], [1, -1, "wall"], [-1, 1, "wall"], [1, 1, "wall"],
        [-2, -1, "laser"], [2, -1, "laser"], [-2, 1, "field"], [2, 1, "batt"],
        [0, 3, "thrust"],
      ],
    },
    {
      name: "blood nave",
      gun: "prism",
      ai: "orbit",
      range: 360,
      spd: 80,
      cells: [
        [0, 0, "core"],
        [-1, 0, "wall"], [1, 0, "wall"], [0, -1, "wall"], [0, 1, "wall"],
        [-2, 0, "laser"], [2, 0, "laser"], [0, -2, "laser"], [0, 2, "laser"],
        [-1, -2, "wall"], [1, -2, "wall"], [-1, 2, "wall"], [1, 2, "wall"],
        [-2, -1, "wall"], [2, -1, "wall"], [-2, 1, "wall"], [2, 1, "wall"],
        [-3, 0, "field"], [3, 0, "batt"], [0, -3, "speed"], [0, 3, "thrust"],
      ],
    },
    {
      name: "eclipse keel",
      gun: "lance",
      ai: "snipe",
      range: 580,
      spd: 85,
      cells: [
        [0, 0, "core"],
        [1, 0, "wall"], [2, 0, "wall"], [3, 0, "laser"], [4, 0, "laser"],
        [-1, 0, "wall"], [-2, 0, "wall"], [-3, 0, "batt"],
        [0, -1, "wall"], [0, 1, "wall"], [1, -1, "wall"], [1, 1, "wall"],
        [2, -1, "wall"], [2, 1, "wall"], [3, -1, "field"], [3, 1, "field"],
        [0, -2, "wall"], [0, 2, "thrust"],
      ],
    },
    {
      name: "grave sun",
      gun: "mortar",
      ai: "orbit",
      range: 380,
      spd: 70,
      cells: [
        [0, 0, "core"],
        [-1, 0, "field"], [1, 0, "field"], [0, -1, "field"], [0, 1, "wall"],
        [-2, 0, "wall"], [2, 0, "wall"], [0, -2, "wall"], [0, 2, "wall"],
        [-1, -1, "wall"], [1, -1, "wall"], [-1, 1, "wall"], [1, 1, "wall"],
        [-2, -2, "laser"], [2, -2, "laser"], [-2, 2, "batt"], [2, 2, "batt"],
        [-3, 0, "wall"], [3, 0, "wall"], [0, -3, "laser"], [0, 3, "thrust"],
      ],
    },
    {
      name: "throne hydra",
      gun: "nova",
      ai: "kite",
      range: 340,
      spd: 65,
      cells: [
        [0, 0, "core"],
        [-1, 0, "wall"], [1, 0, "wall"], [0, -1, "wall"], [0, 1, "wall"],
        [-2, 0, "laser"], [2, 0, "laser"], [0, -2, "laser"], [0, 2, "laser"],
        [-1, -1, "wall"], [1, -1, "wall"], [-1, 1, "wall"], [1, 1, "wall"],
        [-2, -1, "wall"], [2, -1, "wall"], [-2, 1, "wall"], [2, 1, "wall"],
        [-1, -2, "wall"], [1, -2, "wall"], [-1, 2, "field"], [1, 2, "field"],
        [-3, 0, "laser"], [3, 0, "laser"], [0, -3, "batt"], [0, 3, "thrust"],
        [-3, -1, "wall"], [3, -1, "wall"], [-2, -2, "speed"], [2, 2, "batt"],
      ],
    },
  ];

  const S = {
    t: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    ang: 0,
    cells: {},
    pieces: [],
    enemies: [],
    proj: [],
    fx: [],
    rings: [],
    holds: [],
    dead: false,
    overT: 0,
    score: 0,
    best: 0,
    shake: 0,
    zoom: 1,
    cam: { x: 0, y: 0, z: 1 },
    fuel: 1,
    fuelMax: 1,
    thrustCd: 0,
    thrusting: false,
    spawnE: 2.5,
    spawnP: 0.4,
    spawnM: 1.2,
    stars: [],
    ramT: 0,
    bashT: 0,
    fuseT: 0,
    orbs: [],
    spawnO: 0.4,
    sizeClass: 0,
    sizePick: false,
    buff: { hp: 0, dmg: 0, spd: 0, spawnHull: 0, spawnGun: 0, spawnMove: 0 },
    bgStars: [],
    stunT: 0,
    warpT: 0,
    warpCd: 0,
    paused: false,
    spool: 0,
    spoolVel: 0,
    credited: 0,
    killer: "",
  };

  const SPR = {};
  const UP_COST = [375, 1875, 7500, 22500, 45000, 75000];
  const META = { dmg: 0, spd: 0, nrg: 0, hp: 0, bank: 0 };

  function loadMeta() {
    try {
      const raw = JSON.parse(localStorage.getItem("hullcore.meta") || "{}");
      META.dmg = clamp(raw.dmg || 0, 0, 6);
      META.spd = clamp(raw.spd || 0, 0, 6);
      META.nrg = clamp(raw.nrg || 0, 0, 6);
      META.hp = clamp(raw.hp || 0, 0, 6);
      META.bank = Math.max(0, raw.bank || 0);
    } catch (e) {}
  }
  function saveMeta() {
    try {
      localStorage.setItem("hullcore.meta", JSON.stringify(META));
    } catch (e) {}
  }
  function metaMul(k) {
    return 1 + 0.05 * (META[k] || 0);
  }
  function upCost(k) {
    const lv = META[k] || 0;
    if (lv >= 6) return 0;
    return UP_COST[lv];
  }
  function refreshShop() {
    document.querySelectorAll(".bankVal").forEach((el) => {
      el.textContent = fmt(META.bank);
    });
    const hudBank = document.getElementById("hudBank");
    if (hudBank) hudBank.textContent = fmt(META.bank);
    document.querySelectorAll(".upg").forEach((btn) => {
      const k = btn.getAttribute("data-k");
      const lv = META[k] || 0;
      const cost = upCost(k);
      const lvEl = btn.querySelector(".upg-lv");
      const costEl = btn.querySelector(".upg-cost");
      if (lvEl) lvEl.textContent = lv + "/6";
      if (costEl) costEl.textContent = lv >= 6 ? "MAX" : fmt(cost);
      btn.disabled = lv >= 6 || META.bank < cost;
    });
  }
  function buyUpgrade(k) {
    if (!META.hasOwnProperty(k) || k === "bank") return;
    const lv = META[k] || 0;
    if (lv >= 6) return;
    const cost = UP_COST[lv];
    if (META.bank < cost) return;
    META.bank -= cost;
    META[k] = lv + 1;
    saveMeta();
    refreshShop();
    hud();
  }
  loadMeta();

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }
  function key(x, y) {
    return x + "," + y;
  }
  function parseKey(k) {
    const p = k.split(",");
    return { x: +p[0], y: +p[1] };
  }
  function rnd(a) {
    return a[(Math.random() * a.length) | 0];
  }
  function hypot(x, y) {
    return Math.hypot(x, y);
  }
  function angTo(ax, ay, bx, by) {
    return Math.atan2(by - ay, bx - ax);
  }
  function rebuildShip(ship) {
    const list = [];
    const batts = [];
    const cells = ship.cells;
    for (const k in cells) list.push(cells[k]);
    let r = CELL;
    const cnt = {};
    let nThL = 0, nSpL = 0, nField = 0, fieldStr = 0, fieldMul = 0, warpL = 0, genL = 1;
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      const L = c.lvl || 1;
      const rr = Math.sqrt(c.x * c.x + c.y * c.y) * CELL + CELL * 0.7;
      if (rr > r) r = rr;
      cnt[c.type] = (cnt[c.type] || 0) + 1;
      if (c.type === "thrust") nThL += L;
      else if (c.type === "speed") nSpL += L;
      else if (c.type === "field") {
        nField++;
        fieldStr += 0.5 * L;
        fieldMul += Math.pow(1.5, L - 1);
      } else if (c.type === "batt") batts.push(c);
      else if (c.type === "warp") { if (L > warpL) warpL = L; }
      else if (c.type === "gen") genL += L;
    }
    ship._list = list;
    ship._batts = batts;
    ship._rad = r;
    ship._cnt = cnt;
    ship._nThL = nThL;
    ship._nSpL = nSpL;
    ship._nField = nField;
    ship._fieldStr = fieldStr;
    ship._fieldMul = fieldMul;
    ship._warpL = warpL;
    ship._genL = genL;
    ship._dirty = 0;
    const ang = ship.ang || 0;
    ship._angC = ang;
    ship._cs = Math.cos(ang);
    ship._sn = Math.sin(ang);
  }
  function cellsOf(ship) {
    if (!ship._list || ship._dirty) rebuildShip(ship);
    const ang = ship.ang || 0;
    if (ship._angC !== ang) {
      ship._angC = ang;
      ship._cs = Math.cos(ang);
      ship._sn = Math.sin(ang);
    }
    return ship._list;
  }
  function eachCell(ship, fn) {
    const list = cellsOf(ship);
    for (let i = 0; i < list.length; i++) fn(list[i]);
  }
  function countType(ship, type) {
    cellsOf(ship);
    return ship._cnt[type] || 0;
  }
  function cellCount(ship) {
    return cellsOf(ship).length;
  }
  function hullCount(ship) {
    cellsOf(ship);
    return Math.max(0, (ship._list.length || 0) - (ship._cnt.core || 0));
  }
  function cellWorld(ship, c) {
    if (ship._dirty || !ship._list || ship._angC !== (ship.ang || 0)) cellsOf(ship);
    const lx = c.x * CELL, ly = c.y * CELL;
    const cs = ship._cs, sn = ship._sn;
    return {
      x: ship.x + lx * cs - ly * sn,
      y: ship.y + lx * sn + ly * cs,
    };
  }
  function worldToLocal(ship, wx, wy) {
    const ang = ship.ang || 0;
    const dx = wx - ship.x, dy = wy - ship.y;
    const cs = Math.cos(ang), sn = Math.sin(ang);
    return {
      x: (dx * cs + dy * sn) / CELL,
      y: (-dx * sn + dy * cs) / CELL,
    };
  }
  function turnToward(cur, want, max) {
    let d = want - cur;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return cur + clamp(d, -max, max);
  }
  function compLvl(c) {
    return clamp(c && c.lvl ? c.lvl : 1, 1, 5);
  }
  function lvlScale(L) {
    return 1 + (L - 1) * 0.14;
  }
  function shipRadius(ship) {
    cellsOf(ship);
    return ship._rad || CELL;
  }
  function hpOf(type) {
    if (type === "core") return 1;
    if (type === "wall") return 3;
    return 2;
  }
  function fmt(n) {
    n = Math.floor(n);
    if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
    return String(n);
  }

  function pal(enemy) {
    return enemy
      ? { plate: "#2a2228", hi: "#4a3038", riv: "#6a4048", edge: "#140c10", acc: "#a03038" }
      : { plate: "#6a7380", hi: "#b0bac6", riv: "#d8e0e8", edge: "#2a3038", acc: "#7cf0ff" };
  }

  function roundRect(ctx, x0, y0, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x0 + r, y0);
    ctx.arcTo(x0 + w, y0, x0 + w, y0 + h, r);
    ctx.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
    ctx.arcTo(x0, y0 + h, x0, y0, r);
    ctx.arcTo(x0, y0, x0 + w, y0, r);
    ctx.closePath();
  }

  function sprKey(type, lvl, enemy) {
    return type + "L" + clamp(lvl || 1, 1, 5) + (enemy ? "e" : "p");
  }

  function bake(type, lvl, enemy) {
    const L = Math.max(1, Math.min(5, lvl || 1));
    const s = 48;
    const c = document.createElement("canvas");
    c.width = s;
    c.height = s;
    const x = c.getContext("2d");
    const p = pal(enemy);
    x.fillStyle = p.plate;
    x.fillRect(1, 1, 46, 46);
    x.strokeStyle = p.edge;
    x.lineWidth = 2;
    x.strokeRect(1.5, 1.5, 45, 45);
    x.save();
    x.translate(24, 24);
    x.fillStyle = p.plate;
    x.strokeStyle = p.edge;
    x.lineWidth = 2;
    if (type === "wall" || type === "core") {
      roundRect(x, -20, -20, 40, 40, 5);
      x.fill();
      x.stroke();
      x.fillStyle = p.hi;
      x.globalAlpha = 0.35;
      x.fillRect(-16, -16, 32, 8);
      x.globalAlpha = 1;
      x.fillStyle = p.riv;
      const rivs = [[-12, -12], [12, -12], [-12, 12], [12, 12], [0, 0]];
      if (L >= 3) rivs.push([-6, 0], [6, 0], [0, -8], [0, 8]);
      rivs.forEach((q) => {
        x.beginPath();
        x.arc(q[0], q[1], 2.2, 0, 7);
        x.fill();
      });
      if (L > 1) {
        x.strokeStyle = enemy ? "#ff6070" : "#c8d8e8";
        x.lineWidth = 1.5;
        x.strokeRect(-14, -14, 28, 28);
      }
    }
    if (type === "laser") {
      roundRect(x, -18, -18, 36, 36, 4);
      x.fill();
      x.stroke();
      x.fillStyle = enemy ? "#5a1820" : "#1a4050";
      x.beginPath();
      x.arc(0, 4, 9, 0, 7);
      x.fill();
      const n = L;
      x.fillStyle = enemy ? "#ff4060" : "#7cf0ff";
      for (let i = 0; i < n; i++) {
        const ox = (i - (n - 1) / 2) * Math.min(7, 20 / n);
        x.fillRect(ox - 2.4, -20, 4.8, 16);
      }
      x.fillStyle = p.hi;
      x.fillRect(-10, 10, 20, 6);
    } else if (type === "thrust") {
      roundRect(x, -17, -16, 34, 32, 3);
      x.fill();
      x.stroke();
      const slots = L;
      x.fillStyle = "#1a1410";
      for (let i = 0; i < slots; i++) {
        const ox = (i - (slots - 1) / 2) * Math.min(8, 22 / slots);
        x.beginPath();
        x.moveTo(ox - 5, 2);
        x.lineTo(ox + 5, 2);
        x.lineTo(ox + 3, 16);
        x.lineTo(ox - 3, 16);
        x.closePath();
        x.fill();
        x.fillStyle = "#ff9040";
        x.fillRect(ox - 2.5, 6, 5, 7);
        x.fillStyle = "#1a1410";
      }
    } else if (type === "speed") {
      roundRect(x, -18, -18, 36, 36, 6);
      x.fill();
      x.stroke();
      x.strokeStyle = enemy ? "#ff6070" : "#40e0c0";
      x.lineWidth = 2.6;
      for (let i = 0; i < L; i++) {
        const y = 10 - i * 6;
        x.beginPath();
        x.moveTo(-11 + i, y);
        x.lineTo(0, y - 14);
        x.lineTo(11 - i, y);
        x.stroke();
      }
    } else if (type === "field") {
      roundRect(x, -18, -18, 36, 36, 8);
      x.fill();
      x.stroke();
      x.strokeStyle = enemy ? "#c040ff" : "#80a0ff";
      x.lineWidth = 2;
      for (let r = 0; r < L; r++) {
        const rad = 12 - r * 2;
        x.beginPath();
        for (let i = 0; i <= 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
          if (i === 0) x.moveTo(px, py);
          else x.lineTo(px, py);
        }
        x.stroke();
      }
      x.fillStyle = enemy ? "rgba(180,40,220,0.3)" : "rgba(80,120,255,0.3)";
      x.beginPath();
      x.arc(0, 0, 6, 0, 7);
      x.fill();
    } else if (type === "claw") {
      roundRect(x, -16, -14, 32, 28, 3);
      x.fill();
      x.stroke();
      x.strokeStyle = p.acc;
      x.lineWidth = 2 + L * 0.4;
      const reach = 14 + L * 2;
      x.beginPath();
      x.moveTo(-6, 2);
      x.quadraticCurveTo(-16 - L, -8, -6 - L, -reach);
      x.moveTo(6, 2);
      x.quadraticCurveTo(16 + L, -8, 6 + L, -reach);
      if (L >= 3) {
        x.moveTo(-2, 2);
        x.quadraticCurveTo(-10, -10, 0, -reach - 2);
        x.moveTo(2, 2);
        x.quadraticCurveTo(10, -10, 0, -reach - 2);
      }
      x.stroke();
      x.fillStyle = "#c8b060";
      x.beginPath();
      x.arc(0, 4, 3 + L * 0.4, 0, 7);
      x.fill();
    } else if (type === "batt") {
      roundRect(x, -16, -18, 32, 36, 4);
      x.fill();
      x.stroke();
      x.fillStyle = enemy ? "#3a1810" : "#14120c";
      x.fillRect(-11, -13, 22, 28);
      x.strokeStyle = enemy ? "#ff8060" : "#ffe080";
      x.strokeRect(-11, -13, 22, 28);
      x.fillStyle = enemy ? "#ff6040" : "#ffe080";
      for (let i = 0; i < L; i++) {
        x.fillRect(-8, 10 - i * 5, 16, 3.5);
      }
    } else if (type === "missile") {
      roundRect(x, -17, -18, 34, 36, 3);
      x.fill();
      x.stroke();
      const tubes = L;
      for (let i = 0; i < tubes; i++) {
        const ox = (i - (tubes - 1) / 2) * Math.min(7, 22 / tubes);
        x.fillStyle = "#1a1410";
        x.fillRect(ox - 3, -16, 6, 22);
        x.fillStyle = enemy ? "#ff6040" : "#ffb040";
        x.beginPath();
        x.moveTo(ox - 3, -16);
        x.lineTo(ox, -21);
        x.lineTo(ox + 3, -16);
        x.fill();
      }
      x.fillStyle = p.hi;
      x.fillRect(-10, 10, 20, 5);
    } else if (type === "gen") {
      roundRect(x, -18, -18, 36, 36, 7);
      x.fill();
      x.stroke();
      x.strokeStyle = enemy ? "#ff9050" : "#ffcc60";
      x.lineWidth = 2;
      for (let r = 0; r < L; r++) {
        x.beginPath();
        x.arc(0, 0, 5 + r * 3, -0.4, 3.5);
        x.stroke();
      }
      x.fillStyle = enemy ? "#ff7030" : "#ffe080";
      x.beginPath();
      x.arc(0, 0, 4, 0, 7);
      x.fill();
    } else if (type === "emp") {
      roundRect(x, -17, -17, 34, 34, 6);
      x.fill();
      x.stroke();
      x.strokeStyle = enemy ? "#d080ff" : "#a8f0ff";
      x.lineWidth = 2.4;
      for (let i = 0; i < L; i++) {
        x.beginPath();
        x.arc(0, 2, 6 + i * 3, -1.1, 1.1);
        x.stroke();
      }
      x.fillStyle = enemy ? "#c060ff" : "#80e8ff";
      x.beginPath();
      x.arc(0, 0, 4, 0, 7);
      x.fill();
    } else if (type === "warp") {
      roundRect(x, -17, -17, 34, 34, 8);
      x.fill();
      x.stroke();
      x.strokeStyle = enemy ? "#ffb060" : "#c8a0ff";
      x.lineWidth = 2;
      x.beginPath();
      x.arc(0, 0, 11, 0, 7);
      x.stroke();
      x.beginPath();
      x.moveTo(0, 0);
      x.lineTo(0, -8);
      x.moveTo(0, 0);
      x.lineTo(6 + L, 2);
      x.stroke();
      for (let i = 0; i < L; i++) {
        x.beginPath();
        x.arc(0, 0, 5 + i * 2, -0.6, 2.2);
        x.stroke();
      }
    }
    if (type === "core") {
      const g = x.createRadialGradient(-4, -4, 2, 0, 0, 18);
      if (enemy) {
        g.addColorStop(0, "#ffe0e8");
        g.addColorStop(0.35, "#ff3048");
        g.addColorStop(1, "#400010");
      } else {
        g.addColorStop(0, "#ffffff");
        g.addColorStop(0.3, "#c8ffff");
        g.addColorStop(1, "#1a6080");
      }
      x.fillStyle = g;
      x.beginPath();
      x.arc(0, 0, 16, 0, 7);
      x.fill();
    }
    x.restore();
    x.save();
    x.translate(24, 24);
    for (let i = 0; i < L; i++) {
      x.fillStyle = enemy ? "#ff7060" : "#ffe080";
      x.fillRect(-15 + i * 6.2, 19, 5, 2.4);
    }
    x.restore();
    return c;
  }

  function bootSprites() {
    const types = ["wall", "laser", "thrust", "speed", "field", "claw", "batt", "core", "missile", "gen", "emp", "warp"];
    types.forEach((t) => {
      for (let L = 1; L <= 5; L++) {
        SPR[sprKey(t, L, false)] = bake(t, L, false);
        SPR[sprKey(t, L, true)] = bake(t, L, true);
      }
    });
  }
  bootSprites();

  function addCell(ship, x, y, type, extra) {
    const L = extra && extra.lvl ? clamp(extra.lvl, 1, 5) : 1;
    let hp = type === "wall" ? 3 + (L - 1) * 2 : hpOf(type) + (L - 1);
    if (ship === S) hp *= metaMul("hp") * (1 + 0.1 * ((S.buff && S.buff.hp) || 0));
    const c = { x, y, type, hp, max: hp, cd: 0, flash: 0, shut: 0, lvl: L };
    if (type === "batt") {
      c.cap = BATT_CAP * L;
      c.store = extra && extra.store != null ? extra.store : c.cap;
    }
    if (extra && extra.dark) c.dark = 1;
    ship.cells[key(x, y)] = c;
    ship._dirty = 1;
  }
  function upgradeCell(c) {
    if (compLvl(c) >= 5) return false;
    c.lvl = compLvl(c) + 1;
    if (c.type === "batt") {
      c.cap = BATT_CAP * c.lvl;
      c.store = Math.min(c.cap, (c.store || 0) + BATT_CAP);
    }
    if (c.type === "wall") {
      c.max = (3 + (c.lvl - 1) * 2) * (S.cells[key(c.x, c.y)] === c ? metaMul("hp") : 1);
      c.hp = c.max;
    } else {
      c.max = (hpOf(c.type) + (c.lvl - 1)) * (S.cells[key(c.x, c.y)] === c ? metaMul("hp") : 1);
      c.hp = c.max;
    }
    c.flash = 0.22;
    return true;
  }
  function enemyCompLevel() {
    const t = S.t;
    let L = 1;
    if (t > 30 && Math.random() < 0.5) L = 2;
    if (t > 65 && Math.random() < 0.42) L = 3;
    if (t > 105 && Math.random() < 0.35) L = 4;
    if (t > 155 && Math.random() < 0.28) L = 5;
    return L;
  }
  function delCell(ship, c) {
    delete ship.cells[key(c.x, c.y)];
    ship._dirty = 1;
  }

  function resetShip() {
    S.cells = {};
    S._dirty = 1;
    addCell(S, 0, 0, "core");
    for (let y = -1; y <= 1; y++) {
      for (let x = -1; x <= 1; x++) {
        if (x || y) addCell(S, x, y, "wall");
      }
    }
    addCell(S, 2, 0, "laser");
    addCell(S, 0, 2, "thrust");
    addCell(S, -2, 0, "claw");
    addCell(S, 0, -2, "batt");
    S.x = 0;
    S.y = 0;
    S.vx = 0;
    S.vy = 0;
    S.ang = 0;
    S.holds = [];
    S.fuel = 1.7;
    S.fuelMax = 1.7;
    S.thrustCd = 0;
    S.thrusting = false;
    S.genT = 0;
    S.stunT = 0;
    S.warpT = 0;
    S.warpCd = 0;
    S.spool = 0;
    S.spoolVel = 0;
    S.paused = false;
    S.sizeClass = 0;
    S.sizePick = false;
    S.buff = { hp: 0, dmg: 0, spd: 0, spawnHull: 0, spawnGun: 0, spawnMove: 0 };
  }

  function makeStars() {
    S.stars = [];
    S.bgStars = [];
    for (let i = 0; i < 220; i++) {
      const warm = Math.random();
      S.bgStars.push({
        x: Math.random(),
        y: Math.random(),
        s: warm > 0.92 ? 2.8 + Math.random() * 2.4 : 0.7 + Math.random() * 1.6,
        a: 0.35 + Math.random() * 0.65,
        c: warm > 0.78
          ? [1, 0.82 + Math.random() * 0.12, 0.55 + Math.random() * 0.2]
          : warm > 0.45
            ? [0.75 + Math.random() * 0.2, 0.82, 1]
            : [0.92, 0.94, 1],
        tw: Math.random() * 6.28,
      });
    }
  }

  function classRadius() {
    const base = 2.15 * 1.3 * CELL;
    return base * 1.15 * Math.pow(1.5, S.sizeClass || 0);
  }
  function hullReach() {
    let m = 0;
    eachCell(S, (c) => {
      m = Math.max(m, hypot(c.x, c.y) * CELL);
    });
    return m;
  }
  function openSizePick() {
    if (S.sizePick || S.dead || S.paused) return;
    S.sizePick = true;
    const ov = document.getElementById("overlay");
    document.getElementById("panel-title").classList.add("hidden");
    document.getElementById("panel-over").classList.add("hidden");
    document.getElementById("panel-pause").classList.add("hidden");
    const msg = document.getElementById("sizeMsg");
    if (msg) msg.textContent = "Class " + (S.sizeClass + 2) + " — pick a bonus for this run.";
    document.getElementById("panel-size").classList.remove("hidden");
    ov.classList.add("show");
  }
  function maybeSizeUp() {
    if (S.sizePick || S.dead) return;
    if (hullReach() > classRadius() + CELL * 0.5) openSizePick();
  }
  function applySizePick(kind) {
    if (!S.sizePick) return;
    if (kind === "hull") {
      S.buff.hp += 1;
      S.buff.spawnHull += 1;
      eachCell(S, (c) => {
        c.max *= 1.1;
        c.hp *= 1.1;
      });
    } else if (kind === "gun") {
      S.buff.dmg += 1;
      S.buff.spawnGun += 1;
    } else if (kind === "move") {
      S.buff.spd += 1;
      S.buff.spawnMove += 1;
    } else return;
    S.sizeClass += 1;
    S.sizePick = false;
    document.getElementById("panel-size").classList.add("hidden");
    document.getElementById("overlay").classList.remove("show");
    hud();
    maybeSizeUp();
  }

  function centroid(shape) {
    let x = 0, y = 0;
    shape.forEach((c) => {
      x += c[0];
      y += c[1];
    });
    return { x: x / shape.length, y: y / shape.length };
  }

  function rotCell(x, y, k) {
    k = ((k % 4) + 4) % 4;
    if (k === 0) return [x, y];
    if (k === 1) return [-y, x];
    if (k === 2) return [-x, -y];
    return [y, -x];
  }

  function pieceWorldCells(p) {
    const sh = p.shape;
    const c = centroid(sh);
    const cs = Math.cos(p.rot), sn = Math.sin(p.rot);
    return sh.map((cell) => {
      const lx = (cell[0] - c.x) * CELL;
      const ly = (cell[1] - c.y) * CELL;
      return { x: p.x + lx * cs - ly * sn, y: p.y + lx * sn + ly * cs, type: p.type };
    });
  }

  function rndMod() {
    const r = Math.random();
    const g = 1 + 0.1 * (S.buff.spawnGun || 0);
    const m = 1 + 0.1 * (S.buff.spawnMove || 0);
    const h = 1 + 0.1 * (S.buff.spawnHull || 0);
    const bag = [];
    const add = (t, n) => {
      for (let i = 0; i < n; i++) bag.push(t);
    };
    add("emp", 5);
    add("warp", 5);
    add("missile", Math.round(7 * g));
    add("laser", Math.round(16 * g));
    add("gen", 8);
    add("field", Math.round(10 * h));
    add("speed", Math.round(12 * m));
    add("thrust", Math.round(12 * m));
    add("claw", 10);
    add("batt", 12);
    return rnd(bag);
  }

  function spawnPiece(mod, nearEdge) {
    const type = mod ? rndMod() : "wall";
    const shape = mod ? [[0, 0]] : rnd(SHAPES).map((c) => c.slice());
    let x, y;
    if (nearEdge) {
      const a = Math.random() * 6.28;
      const d = 420 + Math.random() * 900;
      x = S.x + Math.cos(a) * d;
      y = S.y + Math.sin(a) * d;
    } else {
      x = (Math.random() - 0.5) * WORLD * 1.4;
      y = (Math.random() - 0.5) * WORLD * 1.4;
    }
    x = clamp(x, -WORLD, WORLD);
    y = clamp(y, -WORLD, WORLD);
    if (hypot(x - S.x, y - S.y) < 220) {
      x += 300;
      y += 200;
    }
    const drift = !mod;
    return {
      id: Math.random(),
      kind: mod ? "mod" : "drift",
      type,
      shape,
      x,
      y,
      vx: drift ? (Math.random() - 0.5) * 46 : 0,
      vy: drift ? (Math.random() - 0.5) * 46 : 0,
      rot: Math.random() * 6.28,
      vr: drift ? (Math.random() - 0.5) * 0.7 : 0,
      enemyTint: 0,
      grabbed: 0,
      cellHp: shape.map(() => hpOf(type)),
      lvl: worldPieceLevel(),
    };
  }
  function worldPieceLevel() {
    const t = S.t;
    if (t < 40) return 1;
    const roll = Math.random();
    if (t > 150 && roll < 0.12) return 4;
    if (t > 100 && roll < 0.22) return 3;
    if (t > 50 && roll < 0.4) return 2;
    return 1;
  }

  function battList(ship) {
    cellsOf(ship);
    return ship._batts || [];
  }
  function energyOf(ship) {
    return battList(ship).reduce((s, c) => s + (c.store || 0), 0);
  }
  function energyMax(ship) {
    return battList(ship).reduce((s, c) => s + (c.cap || BATT_CAP * compLvl(c)), 0);
  }
  function genPower(ship) {
    cellsOf(ship);
    return ship._genL || 1;
  }
  function tickGen(ship, dt) {
    if (!ship || ship.dead) return;
    ship.genT = (ship.genT || 0) + dt;
    while (ship.genT >= 3) {
      ship.genT -= 3;
      addEnergy(genPower(ship), ship);
    }
  }
  function shipHasPower(ship) {
    return energyOf(ship || S) > 0.4;
  }
  function stunned(ship) {
    return (ship.stunT || 0) > 0;
  }
  function bestWarpLvl() {
    cellsOf(S);
    return S._warpL || 0;
  }
  function warpSlow() {
    const L = Math.max(1, bestWarpLvl());
    return clamp(0.75 - (L - 1) * 0.1, 0.2, 0.75);
  }
  function thrustLurch() {
    cellsOf(S);
    const nTh = S._nThL || 0;
    const mass = Math.max(1, cellCount(S) - 1);
    const ratio = nTh / mass;
    return {
      nTh,
      mass,
      ratio,
      lurch: clamp(1.15 / (0.28 + ratio * 2.2), 0.4, 3.2),
    };
  }
  function spendEnergy(n, ship, kind) {
    ship = ship || S;
    if (ship !== S) n = n / ENEMY_EFF;
    else if (kind === "field") n = n / PLAYER_FIELD_EFF / metaMul("nrg");
    else n = n / PLAYER_EFF / metaMul("nrg");
    if (n <= 0) return true;
    if (energyOf(ship) < n - 0.001) return false;
    let left = n;
    battList(ship).forEach((c) => {
      if (left <= 0) return;
      const take = Math.min(c.store, left);
      c.store -= take;
      left -= take;
    });
    return true;
  }
  function addEnergy(n, ship) {
    ship = ship || S;
    let left = n;
    battList(ship)
      .slice()
      .sort((a, b) => (a.store || 0) - (b.store || 0))
      .forEach((c) => {
        const room = (c.cap || BATT_CAP) - (c.store || 0);
        const add = Math.min(room, left);
        c.store += add;
        left -= add;
      });
    return n - left;
  }
  function spawnOrb(near) {
    let x, y;
    if (near) {
      const a = Math.random() * 6.28;
      const d = 220 + Math.random() * 700;
      x = S.x + Math.cos(a) * d;
      y = S.y + Math.sin(a) * d;
    } else {
      x = (Math.random() - 0.5) * WORLD * 1.5;
      y = (Math.random() - 0.5) * WORLD * 1.5;
    }
    const warm = Math.random();
    return {
      x,
      y,
      p: Math.random() * 6.28,
      s: 3.2 + Math.random() * 3.4,
      tw: Math.random() * 6.28,
      c: warm > 0.72
        ? [1, 0.78 + Math.random() * 0.15, 0.48]
        : warm > 0.4
          ? [0.72, 0.84, 1]
          : [0.95, 0.96, 1],
      spike: Math.random() > 0.62,
    };
  }

  function growCells(cells, rings) {
    const map = {};
    cells.forEach((c) => {
      map[c[0] + "," + c[1]] = [c[0], c[1], c[2]];
    });
    for (let r = 0; r < rings; r++) {
      const add = [];
      Object.keys(map).forEach((k) => {
        const p = map[k];
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach((n) => {
          const nx = p[0] + n[0], ny = p[1] + n[1];
          const kk = nx + "," + ny;
          if (!map[kk]) add.push([nx, ny, "wall"]);
        });
      });
      add.forEach((c) => {
        map[c[0] + "," + c[1]] = c;
      });
    }
    return Object.keys(map).map((k) => map[k]);
  }
  function sprinkle(cells, type, n) {
    const walls = cells.filter((c) => c[2] === "wall" && (Math.abs(c[0]) + Math.abs(c[1]) >= 2));
    for (let i = walls.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = walls[i];
      walls[i] = walls[j];
      walls[j] = t;
    }
    walls.slice(0, n).forEach((c) => {
      c[2] = type;
    });
    return cells;
  }
  function scaleEnemy(spec) {
    const t = S.t;
    const rings = Math.min(5, Math.floor(t / 38));
    let cells = spec.cells.map((c) => c.slice());
    cells = growCells(cells, rings);
    cells = sprinkle(cells, "laser", Math.min(10, Math.floor(t / 48)));
    if (t > 50) cells = sprinkle(cells, "field", 1 + ((t / 90) | 0));
    if (t > 80) cells = sprinkle(cells, "thrust", 2);
    if (t > 45) cells = sprinkle(cells, "gen", 1 + ((t / 120) | 0));
    if (t > 60 && Math.random() < 0.45) cells = sprinkle(cells, "missile", 1 + ((t / 140) | 0));
    if (t > 75 && Math.random() < 0.35) cells = sprinkle(cells, "emp", 1);
    if (t > 90 && Math.random() < 0.3) cells = sprinkle(cells, "warp", 1);
    cells = sprinkle(cells, "batt", Math.max(1, 1 + ((t / 70) | 0)));
    if (!cells.some((c) => c[2] === "batt")) {
      const wall = cells.find((c) => c[2] === "wall");
      if (wall) wall[2] = "batt";
      else cells.push([-2, 0, "batt"]);
    }
    let gun = spec.gun;
    if (t > 95 && gun === "needle") gun = "pulse";
    if (t > 130 && Math.random() < 0.35) gun = "prism";
    if (t > 170 && Math.random() < 0.4) gun = "siege";
    if (t > 210 && Math.random() < 0.35) gun = "nova";
    return {
      name: spec.name,
      gun,
      ai: spec.ai,
      range: spec.range + t * 0.35,
      spd: spec.spd,
      cells,
    };
  }
  function enemyGun(e) {
    const src = GUNS[e.gun] || GUNS.pulse;
    const g = {
      power: src.power,
      r: src.r,
      spd: src.spd,
      cd: src.cd,
      count: src.count,
      fan: src.fan,
      color: src.color,
      large: src.large,
      burst: src.burst,
    };
    const t = S.t;
    g.power = Math.max(1, Math.round(g.power * (1 + t / 110)));
    g.spd *= 1 + t / 240;
    g.cd = Math.max(0.12, g.cd * (1 - Math.min(0.48, t / 210)));
    g.r *= 1 + t / 260;
    if (t > 120 && g.count === 3) g.count = 5;
    if (t > 160 && e.gun === "lance") g.power = Math.max(g.power, 4);
    g.cd = (g.cd || 0.7) / ENEMY_ROF;
    return g;
  }
  function scaleGunByLvl(g, L) {
    L = clamp(L || 1, 1, 5);
    return {
      power: Math.max(1, Math.round((g.power || 1) * (0.5 + 0.5 * L))),
      r: (g.r || 3) * (1 + (L - 1) * 0.2),
      spd: (g.spd || 300) * (1 + (L - 1) * 0.05),
      cd: Math.max(0.08, (g.cd || 0.7) * (1 - (L - 1) * 0.08)),
      count: g.count,
      fan: g.fan,
      color: g.color,
      large: g.large || (L >= 4 ? 1 : 0),
      burst: g.burst,
    };
  }

  function spawnEnemy(raw) {
    const spec = scaleEnemy(raw);
    const a = Math.random() * 6.28;
    const d = 540 + Math.random() * 220;
    const e = {
      name: spec.name,
      gun: spec.gun,
      ai: spec.ai,
      range: spec.range,
      spd: spec.spd,
      x: S.x + Math.cos(a) * d,
      y: S.y + Math.sin(a) * d,
      vx: 0,
      vy: 0,
      cells: {},
      spin: Math.random() * 6.28,
      burstLeft: 0,
      burstGap: 0,
      grabbed: 0,
      dead: false,
      flash: 0,
      dying: 0,
      genT: 0,
    };
    spec.cells.forEach((c) => addCell(e, c[0], c[1], c[2], { lvl: c[2] === "core" ? 1 : enemyCompLevel() }));
    return e;
  }

  function pickFleet() {
    const t = S.t;
    if (t < 22) return FLEET[0];
    if (t < 45) return rnd(FLEET.slice(0, 4));
    if (t < 75) return rnd(FLEET.slice(1, 8));
    if (t < 115) return rnd(FLEET.slice(4, 12));
    if (t < 165) return rnd(FLEET.slice(7));
    return rnd(FLEET.slice(10));
  }

  function neighbors(x, y) {
    return [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];
  }

  function tryFuse(p, ship) {
    ship = ship || S;
    const kSnap = ((Math.round(p.rot / (Math.PI / 2)) % 4) + 4) % 4;
    const sh = p.shape.map((c) => rotCell(c[0], c[1], kSnap));
    const cen = centroid(sh);
    const loc = worldToLocal(ship, p.x, p.y);
    const locals = sh.map((c) => ({
      x: loc.x + (c[0] - cen.x),
      y: loc.y + (c[1] - cen.y),
      type: p.type,
    }));
    let best = null;
    let bestCost = 1e9;
    for (let ox = -2; ox <= 2; ox++) {
      for (let oy = -2; oy <= 2; oy++) {
        const snapped = locals.map((c) => ({
          x: Math.round(c.x + ox),
          y: Math.round(c.y + oy),
          type: c.type,
        }));
        const seen = {};
        let overlap = 0;
        let adj = 0;
        let cost = 0;
        for (let i = 0; i < snapped.length; i++) {
          const s = snapped[i];
          const kk = key(s.x, s.y);
          if (seen[kk]) overlap++;
          seen[kk] = 1;
          if (ship.cells[kk]) overlap++;
          neighbors(s.x, s.y).forEach((n) => {
            if (ship.cells[key(n[0], n[1])]) adj++;
          });
          cost += Math.abs(s.x - locals[i].x) + Math.abs(s.y - locals[i].y);
        }
        if (overlap) continue;
        if (!adj) continue;
        if (cost < bestCost) {
          bestCost = cost;
          best = snapped;
        }
      }
    }
    if (!best) return false;
    best.forEach((c) => addCell(ship, c.x, c.y, c.type || p.type, { dark: p.enemyTint ? 1 : 0, store: p.store, lvl: p.lvl || 1 }));
    if (ship === S) S.score += 5 * best.length;
    SFX.fuse(ship === S);
    spark(p.x, p.y, p.enemyTint ? "#ff6070" : "#c8e8ff", 8);
    if (ship === S) maybeSizeUp();
    return true;
  }

  function tryMergeOntoShip(p, ship) {
    ship = ship || S;
    if (!p || p.gone || (p.lvl || 1) >= 5) return false;
    if (p.type === "core") return false;
    const cells = pieceWorldCells(p);
    let best = null, bestD = CELL * 1.12, bestI = 0;
    cells.forEach((w, i) => {
      eachCell(ship, (c) => {
        if (c.type === "core" || c.type !== p.type) return;
        if (compLvl(c) !== (p.lvl || 1) || compLvl(c) >= 5) return;
        const sw = cellWorld(ship, c);
        const d = hypot(w.x - sw.x, w.y - sw.y);
        if (d < bestD) {
          bestD = d;
          best = c;
          bestI = i;
        }
      });
    });
    if (!best) return false;
    upgradeCell(best);
    if (ship === S) S.score += 8 * compLvl(best);
    SFX.fuse(ship === S);
    spark(cellWorld(ship, best).x, cellWorld(ship, best).y, "#ffe080", 12);
    if (ship === S) maybeSizeUp();
    if (!p.shape || p.shape.length <= 1) p.gone = 1;
    else {
      p.shape.splice(bestI, 1);
      if (p.cellHp) p.cellHp.splice(bestI, 1);
      if (!p.shape.length) p.gone = 1;
    }
    return true;
  }

  function tryMergePieces(a, b) {
    if (!a || !b || a.gone || b.gone || a === b) return false;
    if (a.type !== b.type || a.type === "core") return false;
    const la = a.lvl || 1, lb = b.lvl || 1;
    if (la !== lb || la >= 5) return false;
    const cellsA = pieceWorldCells(a);
    const cellsB = pieceWorldCells(b);
    let close = false;
    cellsA.forEach((wa) => {
      cellsB.forEach((wb) => {
        if (hypot(wa.x - wb.x, wa.y - wb.y) < CELL * 1.08) close = true;
      });
    });
    if (!close) return false;
    a.lvl = la + 1;
    a.x = (a.x + b.x) / 2;
    a.y = (a.y + b.y) / 2;
    b.gone = 1;
    spark(a.x, a.y, "#ffe080", 10);
    S.score += 6 * a.lvl;
    return true;
  }

  function spark(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28;
      const s = 30 + Math.random() * 90;
      S.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0.35 + Math.random() * 0.25, c: color });
    }
  }

  function boom(x, y, scale, color) {
    S.shake = Math.max(S.shake, 10 * scale);
    S.rings.push({ x, y, r: 4, vr: 180 * scale, t: 0.45, c: color });
    S.rings.push({ x, y, r: 2, vr: 110 * scale, t: 0.55, c: "#ffffff" });
    spark(x, y, color, 18 + (scale * 10) | 0);
    spark(x, y, "#ffffff", 8);
  }

  function fieldStats(ship) {
    if (!shipHasPower(ship) || stunned(ship)) return { r: 0, str: 0 };
    cellsOf(ship);
    const str = ship._fieldStr || 0;
    if (!str) return { r: 0, str: 0 };
    return { r: ship._rad + 28 + str * 28, str };
  }

  function fieldDrainMul(ship) {
    cellsOf(ship);
    return ship._fieldMul || 0;
  }

  function applyField(proj, ship) {
    if (proj.team === (ship === S ? "p" : "e")) return;
    if (!proj.gated) proj.gated = [];
    if (proj.gated.indexOf(ship) >= 0) return;
    const f = fieldStats(ship);
    if (!f.str) return;
    if (hypot(proj.x - ship.x, proj.y - ship.y) > f.r + proj.r) return;
    proj.gated.push(ship);
    let hitMul = 1;
    eachCell(ship, (c) => {
      if (c.type === "field") hitMul = Math.max(hitMul, Math.pow(1.5, compLvl(c) - 1));
    });
    spendEnergy(2 * hitMul, ship, "field");
    SFX.hit("field");
    if (f.str >= proj.power + 1) {
      proj.vx = 0;
      proj.vy = 0;
      proj.life = Math.min(proj.life, 0.14);
      proj.stop = 1;
      spark(proj.x, proj.y, "#80a0ff", 6);
    } else if (f.str >= 1 && f.str >= proj.power) {
      spark(proj.x, proj.y, "#c0a0ff", 10);
      proj.life = 0;
    } else {
      const heavy = proj.large || proj.power >= 2 || proj.r >= 5;
      if (heavy) {
        proj.power = Math.max(1, proj.power - 1);
        proj.r = Math.max(1.8, proj.r * 0.5);
        proj.large = 0;
      } else {
        proj.r = Math.max(1.45, proj.r * 0.42);
        proj.pellet = 1;
      }
      spark(proj.x, proj.y, "#a0c8ff", 5);
    }
  }

  function fireShot(team, x, y, ang, gun, from) {
    const g = gun;
    const n = g.count || 1;
    const fan = g.fan || 0;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : (i / (n - 1) - 0.5) * fan;
      const a = ang + t;
      S.proj.push({
        team,
        x,
        y,
        vx: Math.cos(a) * g.spd,
        vy: Math.sin(a) * g.spd,
        r: g.r,
        power: g.power,
        life: g.missile ? 3.8 : 2.4,
        color: g.color,
        large: g.large || 0,
        gated: [],
        stop: 0,
        from: from || "",
        missile: g.missile || 0,
        aoe: g.aoe || 0,
        emp: g.emp || 0,
        stun: g.stun || 0,
        ox: x,
        oy: y,
        baseR: g.baseR || g.r,
      });
    }
    if (!g.emp) SFX.fire(g, team);
  }

  function fireEmp(team, x, y, ang, c, from) {
    const L = compLvl(c);
    const stun = 2 + (L - 1);
    const spd = 200 + L * 18;
    const fan = 0.32;
    const g = {
      r: 5 + L,
      baseR: 4 + L * 0.8,
      spd,
      count: 3,
      fan,
      color: team === "p" ? "#9ef0ff" : "#d890ff",
      emp: 1,
      stun,
      missile: 0,
      power: 0,
    };
    fireShot(team, x, y, ang, g, from);
    SFX.emp();
  }

  function applyStun(ship, dur) {
    ship.stunT = Math.max(ship.stunT || 0, dur);
    SFX.stun();
  }

  function playerMissile(c) {
    const L = compLvl(c);
    const lg = playerGun(c);
    return {
      power: lg.power,
      r: 4 + L * 0.55,
      spd: lg.spd / 3,
      cd: Math.max(0.36, lg.cd * 4),
      count: 1,
      fan: 0,
      color: "#ffb040",
      missile: 1,
      aoe: CELL * (1.3 + 0.28 * L),
      large: 1,
    };
  }

  function ejectCell(ship, c, bx, by) {
    const w = cellWorld(ship, c);
    dropHoldIfCell(ship, c);
    delCell(ship, c);
    const dx = w.x - bx, dy = w.y - by;
    const d = hypot(dx, dy) || 1;
    S.pieces.push({
      id: Math.random(),
      kind: c.type === "wall" ? "drift" : "mod",
      type: c.type,
      shape: [[0, 0]],
      x: w.x,
      y: w.y,
      vx: (dx / d) * 90 + (Math.random() - 0.5) * 50,
      vy: (dy / d) * 90 + (Math.random() - 0.5) * 50,
      rot: Math.random() * 6.28,
      vr: (Math.random() - 0.5) * 1.4,
      enemyTint: ship !== S ? 1 : 0,
      grabbed: 0,
      lvl: c.lvl || 1,
      store: c.store,
      cellHp: [Math.max(1, c.hp || 1)],
    });
  }

  function missileBlast(x, y, aoe, power, team) {
    SFX.hit("boom");
    boom(x, y, 0.55 + aoe / 50, "#ff9040");
    function blastShip(ship, isPlayer) {
      if ((team === "p" && ship === S) || (team === "e" && ship !== S)) return;
      if (ship.dead || ship.dying) return;
      const hit = [];
      eachCell(ship, (c) => {
        const w = cellWorld(ship, c);
        if (hypot(w.x - x, w.y - y) < aoe + CELL * 0.35) hit.push(c);
      });
      hit.forEach((c) => {
        c.flash = 0.14;
        if (c.type === "core") {
          c.hp -= power;
          if (c.hp <= 0) {
            if (isPlayer) die("A missile");
            else killEnemy(ship);
          }
          return;
        }
        c.hp -= Math.max(1, (power || 1) - 1);
        if (Math.random() < 0.38) {
          spark(cellWorld(ship, c).x, cellWorld(ship, c).y, "#ffb070", 6);
          dropHoldIfCell(ship, c);
          delCell(ship, c);
          if (!isPlayer) S.score += 10;
        } else {
          ejectCell(ship, c, x, y);
          if (!isPlayer) S.score += 8;
        }
      });
    }
    blastShip(S, true);
    S.enemies.forEach((e) => blastShip(e, false));
    S.pieces.forEach((p) => {
      if (p.gone) return;
      if (hypot(p.x - x, p.y - y) < aoe) {
        if (Math.random() < 0.45) p.gone = 1;
        else {
          p.vx += (p.x - x) * 2;
          p.vy += (p.y - y) * 2;
        }
      }
    });
  }

  function projHitsShip(pr, ship) {
    cellsOf(ship);
    if (hypot(pr.x - ship.x, pr.y - ship.y) > (ship._rad || 40) + (pr.r || 4) + CELL) return false;
    const list = ship._list;
    const lim = CELL * 0.52 + (pr.r || 0);
    for (let i = 0; i < list.length; i++) {
      const w = cellWorld(ship, list[i]);
      if (hypot(pr.x - w.x, pr.y - w.y) < lim) return true;
    }
    return false;
  }

  function maybeDetonate(pr) {
    if (!pr.missile || pr.boom) return false;
    let hit = false;
    if (pr.team !== "p" && !S.dead && projHitsShip(pr, S)) hit = true;
    if (pr.team !== "e") {
      S.enemies.forEach((e) => {
        if (!e.dead && !e.dying && projHitsShip(pr, e)) hit = true;
      });
    }
    if (!hit) {
      S.pieces.forEach((p) => {
        if (p.gone) return;
        pieceWorldCells(p).forEach((w) => {
          if (hypot(pr.x - w.x, pr.y - w.y) < CELL * 0.52 + pr.r) hit = true;
        });
      });
    }
    if (!hit) return false;
    pr.boom = 1;
    pr.life = 0;
    missileBlast(pr.x, pr.y, pr.aoe || CELL * 1.4, pr.power || 1, pr.team);
    return true;
  }

  function playerGun(c) {
    const L = compLvl(c);
    return {
      power: L * metaMul("dmg") * (1 + 0.1 * (S.buff.dmg || 0)),
      r: 2.5 + L * 0.7,
      spd: 580 + L * 30,
      cd: Math.max(0.09, 0.185 - L * 0.014),
      count: 1,
      fan: 0,
      color: L >= 4 ? "#d0ffff" : "#7cf0ff",
      large: L >= 4 ? 1 : 0,
    };
  }

  function hitShip(ship, proj, isPlayer) {
    cellsOf(ship);
    if (hypot(proj.x - ship.x, proj.y - ship.y) > (ship._rad || 40) + (proj.r || 4) + CELL) return false;
    let hit = null;
    let best = 1e9;
    eachCell(ship, (c) => {
      const w = cellWorld(ship, c);
      const d = hypot(proj.x - w.x, proj.y - w.y);
      if (d < CELL * 0.52 + proj.r && d < best) {
        best = d;
        hit = c;
      }
    });
    if (!hit) return false;
    hit.hp -= proj.power;
    hit.flash = 0.12;
    proj.life = 0;
    SFX.hit(proj.missile ? "boom" : "shot");
    spark(proj.x, proj.y, proj.color, 5);
    if (hit.type === "core" && hit.hp <= 0) {
      if (isPlayer) die(proj.from || "A shot");
      else killEnemy(ship);
    } else if (hit.hp <= 0) {
      const w = cellWorld(ship, hit);
      spark(w.x, w.y, "#ffb070", 8);
      dropHoldIfCell(ship, hit);
      delCell(ship, hit);
      if (isPlayer) S.score += 0;
      else S.score += 15;
    }
    return true;
  }

  function hitDebris(proj) {
    if (proj.life <= 0) return false;
    for (let i = 0; i < S.pieces.length; i++) {
      const p = S.pieces[i];
      if (p.gone) continue;
      if (p.kind !== "drift" && p.type !== "wall") continue;
      if (!p.shape || !p.shape.length) continue;
      const cells = pieceWorldCells(p);
      if (!p.cellHp || p.cellHp.length !== p.shape.length) {
        p.cellHp = p.shape.map(() => 3);
      }
      for (let k = 0; k < cells.length; k++) {
        const w = cells[k];
        if (hypot(proj.x - w.x, proj.y - w.y) >= CELL * 0.52 + proj.r) continue;
        p.cellHp[k] -= proj.power || 1;
        proj.life = 0;
        SFX.hit("shot");
        spark(proj.x, proj.y, proj.color || "#c8d0d8", 5);
        p.vx += (proj.vx || 0) * 0.012;
        p.vy += (proj.vy || 0) * 0.012;
        if (p.cellHp[k] <= 0) {
          p.shape.splice(k, 1);
          p.cellHp.splice(k, 1);
          if (!p.shape.length) p.gone = 1;
        }
        return true;
      }
    }
    return false;
  }

  function dropHoldIfCell(ship, cell) {
    S.holds = S.holds.filter((h) => !(h.claw === cell));
  }

  function killEnemy(en) {
    if (en.dying) return;
    en.dying = 0.55;
    en.flash = 0.55;
    SFX.coreBoom();
    en.grabbed = 0;
    S.holds.forEach((h) => {
      if (h.ref === en) h.ref = null;
    });
    S.holds = S.holds.filter((h) => h.ref);
    const n = cellCount(en);
    S.score += 120 + n * 12;
    S.shake = 12;
  }

  function finishKill(en) {
    const core = en.cells[key(0, 0)] || Object.values(en.cells).find((c) => c.type === "core");
    const cx = en.x, cy = en.y;
    const nCells = Math.max(1, cellCount(en));
    boom(cx, cy, 1.3, "#ff4060");
    const pellets = 8 + Math.min(16, nCells);
    for (let i = 0; i < pellets; i++) {
      const a = (i / pellets) * 6.28 + Math.random() * 0.4;
      const sp = 50 + Math.random() * 140;
      S.orbs.push({
        x: cx + Math.cos(a) * 12,
        y: cy + Math.sin(a) * 12,
        p: Math.random() * 6.28,
        s: 4.5 + Math.random() * 3.5,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        tw: Math.random() * 6.28,
        c: [1, 0.82, 0.55],
        spike: 1,
      });
    }
    eachCell(en, (c) => {
      if (c.type === "core") return;
      const w = cellWorld(en, c);
      S.pieces.push({
        id: Math.random(),
        kind: c.type === "wall" ? "drift" : "mod",
        type: c.type === "wall" ? "wall" : c.type,
        shape: [[0, 0]],
        x: w.x,
        y: w.y,
        vx: (w.x - cx) * 1.4 + (Math.random() - 0.5) * 30,
        vy: (w.y - cy) * 1.4 + (Math.random() - 0.5) * 30,
        rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 1.2,
        enemyTint: 1,
        grabbed: 0,
        lvl: c.lvl || 1,
        cellHp: [c.hp || 3],
      });
    });
    S.holds.forEach((h) => {
      if (h.ref === en) h.ref = null;
    });
    S.holds = S.holds.filter((h) => h.ref);
    en.dead = true;
    en.cells = {};
  }

  function die(by) {
    if (S.dead) return;
    S.dead = true;
    S.overT = 0;
    S.killer = by;
    S.shake = 18;
    boom(S.x, S.y, 1.6, "#7cf0ff");
    if (S.score > S.best) {
      S.best = S.score;
      try {
        localStorage.setItem("hullcore.best", String(S.best));
      } catch (e) {}
    }
    if (!S.credited) {
      META.bank += S.score;
      S.credited = 1;
      saveMeta();
    }
    setTimeout(() => {
      document.getElementById("overTitle").textContent = "CORE BREACH";
      document.getElementById("overMsg").textContent =
        (by ? by : "A shot") + " found the reactor. Run " + fmt(S.score) + " · banked.";
      document.getElementById("panel-over").classList.remove("hidden");
      document.getElementById("panel-title").classList.add("hidden");
      document.getElementById("overlay").classList.add("show");
      refreshShop();
      hud();
    }, 700);
  }

  function clawTips() {
    const tips = [];
    const wm = worldMouse();
    eachCell(S, (c) => {
      if (c.type !== "claw") return;
      const o = cellWorld(S, c);
      const d = hypot(wm.x - o.x, wm.y - o.y) || 1;
      const reach = 210 * (1 + (compLvl(c) - 1) * 0.2) * Math.pow(1.05, S.sizeClass || 0);
      const k = Math.min(1, reach / d);
      tips.push({
        cell: c,
        ox: o.x,
        oy: o.y,
        x: o.x + (wm.x - o.x) * k,
        y: o.y + (wm.y - o.y) * k,
      });
    });
    return tips;
  }

  function tryGrab() {
    if (S.dead || stunned(S) || S.holds.length) return;
    const tips = clawTips();
    if (!tips.length) return;
    let best = null, bd = 72;
    S.pieces.forEach((p) => {
      if (p.grabbed) return;
      tips.forEach((t) => {
        const d = hypot(p.x - t.x, p.y - t.y);
        if (d < bd) {
          bd = d;
          best = { kind: "piece", ref: p, claw: t.cell, tip: t };
        }
      });
    });
    S.enemies.forEach((e) => {
      if (e.dead || e.dying) return;
      const er = shipRadius(e) * 0.45;
      tips.forEach((t) => {
        const d = hypot(e.x - t.x, e.y - t.y);
        if (d < bd + er) {
          bd = d;
          best = { kind: "enemy", ref: e, claw: t.cell, tip: t };
        }
      });
    });
    if (!best) return;
    best.ref.grabbed = 1;
    best.offx = best.ref.x - best.tip.x;
    best.offy = best.ref.y - best.tip.y;
    S.holds.push(best);
  }

  function releaseHolds() {
    S.holds.forEach((h) => releaseHold(h));
    S.holds = [];
  }

  function releaseHold(h) {
    if (!h.ref) return;
    h.ref.grabbed = 0;
    const wm = worldMouse();
    const flick = 90;
    const d = hypot(wm.x - S.x, wm.y - S.y) || 1;
    h.ref.vx = ((wm.x - S.x) / d) * flick + S.vx * 0.4;
    h.ref.vy = ((wm.y - S.y) / d) * flick + S.vy * 0.4;
    if (h.kind === "piece") {
      if (pieceHitsShip(h.ref, S)) {
        if (tryMergeOntoShip(h.ref, S)) {}
        else if (tryFuse(h.ref, S)) h.ref.gone = 1;
      }
    }
  }

  function pieceHitsShip(p, ship) {
    ship = ship || S;
    cellsOf(ship);
    if (hypot(p.x - ship.x, p.y - ship.y) > (ship._rad || 40) + CELL * 5) return false;
    const cells = pieceWorldCells(p);
    const list = ship._list;
    const lim = CELL * 1.05;
    for (let i = 0; i < cells.length; i++) {
      const w = cells[i];
      for (let j = 0; j < list.length; j++) {
        const sw = cellWorld(ship, list[j]);
        if (hypot(w.x - sw.x, w.y - sw.y) < lim) return true;
      }
    }
    return false;
  }

  function worldMouse() {
    const z = S.cam.z;
    return {
      x: S.cam.x + (mouse.x - W / 2) / z,
      y: S.cam.y + (mouse.y - H / 2) / z,
    };
  }

  function loadRun() {
    try {
      S.best = parseInt(localStorage.getItem("hullcore.best") || "0", 10) || 0;
    } catch (e) {
      S.best = 0;
    }
    S.t = 0;
    S.dead = false;
    S.overT = 0;
    S.score = 0;
    S.credited = 0;
    S.shake = 0;
    S.proj = [];
    S.fx = [];
    S.rings = [];
    S.pieces = [];
    S.enemies = [];
    S.holds = [];
    S.spawnE = 1.2;
    S.spawnP = 0.2;
    S.spawnM = 0.5;
    resetShip();
    makeStars();
    S.ramT = 0;
    for (let i = 0; i < 16; i++) S.pieces.push(spawnPiece(false, true));
    for (let i = 0; i < 8; i++) S.pieces.push(spawnPiece(true, true));
    function placeNear(type, ang, dist) {
      const p = spawnPiece(true, false);
      p.type = type;
      p.shape = [[0, 0]];
      p.x = S.x + Math.cos(ang) * dist;
      p.y = S.y + Math.sin(ang) * dist;
      p.vx = 0;
      p.vy = 0;
      p.vr = 0;
      S.pieces.push(p);
    }
    [
      ["laser", 0.4],
      ["field", 2.2],
      ["speed", 3.8],
      ["thrust", 5.1],
      ["batt", 4.4],
      ["gen", 1.0],
    ].forEach((pair) => placeNear(pair[0], pair[1], 130));
    S.orbs = [];
    for (let i = 0; i < 28; i++) S.orbs.push(spawnOrb(true));
    S.spawnO = 0.4;
    S.bashT = 0;
    S.fuseT = 0;
    S.spawnE = 7 * SPAWN_SLOW;
    SFX.setThrust(false);
    SFX.thrustWas = false;
    SFX.fieldWas = false;
    hud();
    canvas.tabIndex = 0;
    canvas.focus();
  }

  function hud() {
    const h = hullCount(S);
    document.getElementById("hullVal").textContent = h;
    document.getElementById("hullMax").textContent = "";
    document.getElementById("scoreVal").textContent = fmt(S.score);
    document.getElementById("bestVal").textContent = fmt(S.best);
    const hudBank = document.getElementById("hudBank");
    if (hudBank) hudBank.textContent = fmt(META.bank);
    const classVal = document.getElementById("classVal");
    if (classVal) classVal.textContent = String((S.sizeClass || 0) + 1);
    const box = document.getElementById("modBox");
    const map = {
      laser: "LAS " + countType(S, "laser"),
      thrust: "THR " + countType(S, "thrust"),
      speed: "SPD " + countType(S, "speed"),
      field: "FLD " + countType(S, "field"),
      claw: "CLAW " + countType(S, "claw"),
      batt: "BATT " + countType(S, "batt"),
      gen: "GEN " + countType(S, "gen"),
      missile: "MSL " + countType(S, "missile"),
      emp: "EMP " + countType(S, "emp"),
      warp: "WARP " + countType(S, "warp"),
    };
    box.querySelectorAll("span").forEach((el) => {
      el.textContent = map[el.getAttribute("data-k")] || el.textContent;
    });
    const nrg = energyOf(S);
    const nmax = Math.max(1, energyMax(S));
    const nrgVal = document.getElementById("nrgVal");
    const nrgMax = document.getElementById("nrgMax");
    const nrgBar = document.getElementById("nrgBar");
    if (nrgVal) nrgVal.textContent = String(Math.floor(nrg));
    if (nrgMax) nrgMax.textContent = " / " + Math.floor(nmax);
    if (nrgBar) nrgBar.style.width = clamp(nrg / nmax, 0, 1) * 100 + "%";
    const bar = document.getElementById("bar");
    if (S.thrustCd > 0) {
      bar.classList.add("cool");
      bar.style.width = clamp(1 - S.thrustCd / 3.1, 0, 1) * 100 + "%";
    } else {
      bar.classList.remove("cool");
      bar.style.width = clamp(S.fuel / Math.max(0.2, S.fuelMax), 0, 1) * 100 + "%";
    }
  }

  function speedNow() {
    cellsOf(S);
    const n = S._list.length;
    const nSp = S._nSpL || 0;
    const nTh = S._nThL || 0;
    const massK = 1 + 0.0384 * Math.max(0, n - 9);
    let spd = (205 * SPD_MUL * (1 + 0.225 * nSp)) / massK;
    S.fuelMax = 1.5 + 0.4 * nTh;
    const boost = 1.96 + 0.28 * nTh;
    const spool = clamp(S.spool, 0, 1.35);
    spd *= 1 + (boost - 1) * spool;
    return spd * metaMul("spd") * (1 + 0.1 * (S.buff.spd || 0));
  }

  function tick(dt) {
    if (S.sizePick) return;
    if (S.paused) return;
    if (overlayEl && overlayEl.classList.contains("show") && !S.dead) return;
    S.t += dt;
    S.shake *= 0.88;
    S.ramT = Math.max(0, S.ramT - dt);
    S.bashT = Math.max(0, S.bashT - dt);
    S.fuseT = Math.max(0, S.fuseT - dt);
    S.stunT = Math.max(0, (S.stunT || 0) - dt);
    S.warpT = Math.max(0, (S.warpT || 0) - dt);
    S.warpCd = Math.max(0, (S.warpCd || 0) - dt);
    const wdt = S.warpT > 0 ? dt * warpSlow() : dt;
    if (S.dead) {
      S.overT += dt;
    }

    if (!S.dead && !stunned(S) && shipHasPower(S)) {
      const fmul = fieldDrainMul(S);
      if (fmul) spendEnergy(FIELD_DRAIN * fmul * dt, S, "field");
    }
    if (!S.dead) tickGen(S, dt);
    const fieldOn = !S.dead && fieldStats(S).str > 0;
    if (fieldOn !== SFX.fieldWas) {
      SFX.field(fieldOn);
      SFX.fieldWas = fieldOn;
    }
    if (S.dead && SFX.thrustWas) {
      SFX.setThrust(false);
      SFX.thrustWas = false;
    }

    const nTh = countType(S, "thrust");
    if (!S.dead) {
      let wantThrust = false;
      if (S.thrustCd > 0) {
        S.thrustCd -= dt;
        S.thrusting = false;
        if (S.thrustCd <= 0) {
          S.thrustCd = 0;
          S.fuel = S.fuelMax;
        }
      } else if (!stunned(S) && (keys[" "] || keys.Space) && nTh > 0 && S.fuel > 0 && shipHasPower(S) && spendEnergy(THRUST_DRAIN * dt, S)) {
        S.thrusting = true;
        wantThrust = true;
        S.fuel -= dt;
        if (S.fuel <= 0) {
          S.fuel = 0;
          S.thrusting = false;
          wantThrust = false;
          S.thrustCd = 3.1;
        }
      } else {
        if (S.thrusting) S.thrustCd = 1.35;
        S.thrusting = false;
      }
      const tl = thrustLurch();
      const wantSpool = wantThrust ? 1 : 0;
      const omega = 5.4 / tl.lurch;
      const zeta = 0.28 + 0.5 * clamp(tl.ratio * 2, 0, 1);
      S.spoolVel += ((wantSpool - S.spool) * omega * omega - 2 * zeta * omega * S.spoolVel) * dt;
      S.spool += S.spoolVel * dt;
      S.spool = clamp(S.spool, -0.2, 1.4);
      if (!wantThrust && S.spool < 0.02 && S.spoolVel < 0.05) {
        S.spool = 0;
        S.spoolVel = 0;
      }
      const thrustingNow = S.spool > 0.08;
      if (thrustingNow !== SFX.thrustWas) {
        SFX.setThrust(thrustingNow);
        SFX.thrustWas = thrustingNow;
      }

      let ax = 0, ay = 0;
      if (!stunned(S)) {
        if (keys.w || keys.W || keys.ArrowUp) ay -= 1;
        if (keys.s || keys.S || keys.ArrowDown) ay += 1;
        if (keys.a || keys.A || keys.ArrowLeft) ax -= 1;
        if (keys.d || keys.D || keys.ArrowRight) ax += 1;
      } else {
        S.vx *= 0.9;
        S.vy *= 0.9;
      }
      const n = hypot(ax, ay) || 1;
      const spd = speedNow();
      if (ax || ay) {
        const crawl = spendEnergy(MOVE_DRAIN * dt, S) ? 1 : 0.1;
        S.vx += (ax / n) * spd * 9 * dt * crawl;
        S.vy += (ay / n) * spd * 9 * dt * crawl;
      }
      const damp = Math.exp(-9 * dt);
      S.vx *= damp;
      S.vy *= damp;
      S.x += S.vx * dt;
      S.y += S.vy * dt;
      if (S.x < -WORLD || S.x > WORLD) S.vx *= -0.45;
      if (S.y < -WORLD || S.y > WORLD) S.vy *= -0.45;
      S.x = clamp(S.x, -WORLD, WORLD);
      S.y = clamp(S.y, -WORLD, WORLD);
      if (mouse.live && !stunned(S)) {
        const wm = worldMouse();
        const want = Math.atan2(wm.y - S.y, wm.x - S.x);
        const turn = 3.2 / (1 + 0.035 * Math.max(0, cellCount(S) - 9));
        S.ang = turnToward(S.ang || 0, want, turn * dt);
      }
    }

    const tips = clawTips();
    S.holds = S.holds.filter((h) => {
      if (!S.cells[key(h.claw.x, h.claw.y)] || S.cells[key(h.claw.x, h.claw.y)].type !== "claw") {
        if (h.ref) h.ref.grabbed = 0;
        return false;
      }
      return !!(h.ref && !h.ref.gone);
    });
    if (mouse.right && !S.holds.length) tryGrab();
    S.holds.forEach((h) => {
      const t = tips.find((q) => q.cell === h.claw) || tips[0];
      if (!t || !h.ref) return;
      if (h.kind === "enemy" && (h.ref.dying || h.ref.dead)) {
        h.ref.grabbed = 0;
        h.ref = null;
        return;
      }
      const ox = h.ref.x, oy = h.ref.y;
      h.ref.x = t.x + h.offx;
      h.ref.y = t.y + h.offy;
      const idt = Math.max(dt, 0.001);
      h.ref.vx = clamp((h.ref.x - ox) / idt, -900, 900);
      h.ref.vy = clamp((h.ref.y - oy) / idt, -900, 900);
      if (h.kind === "piece" && h.ref) {
        if (tryMergeOntoShip(h.ref, S)) h.ref = null;
        else {
          S.pieces.forEach((q) => {
            if (!h.ref || q === h.ref || q.gone) return;
            tryMergePieces(h.ref, q);
          });
        }
      }
    });
    eachCell(S, (c) => {
      if (c.type !== "claw") return;
      const want = S.holds.some((h) => h.claw === c) ? 1 : 0;
      c.shut += (want - (c.shut || 0)) * Math.min(1, dt * 14);
    });

    const radP = shipRadius(S) + 12;
    S.orbs.forEach((o) => {
      if (o.gone) return;
      if (o.vx) {
        o.x += o.vx * wdt;
        o.y += o.vy * wdt;
        o.vx *= 0.94;
        o.vy *= 0.94;
      }
      if (hypot(o.x - S.x, o.y - S.y) < radP) {
        addEnergy(16 + Math.random() * 16, S);
        o.gone = 1;
        spark(o.x, o.y, "#ffe080", 8);
      } else {
        S.enemies.forEach((e) => {
          if (o.gone || e.dead || e.dying) return;
          if (hypot(o.x - e.x, o.y - e.y) < shipRadius(e) + 10) {
            addEnergy(16 + Math.random() * 16, e);
            o.gone = 1;
            spark(o.x, o.y, "#ffb070", 6);
          }
        });
      }
    });
    S.orbs = S.orbs.filter((o) => !o.gone);

    S.pieces.forEach((p) => {
      if (p.gone || p.grabbed) return;
      p.x += p.vx * wdt;
      p.y += p.vy * wdt;
      p.rot += p.vr * wdt;
      if (p.kind === "mod") {
        p.vx *= 0.98;
        p.vy *= 0.98;
      }
      if (p.x < -WORLD || p.x > WORLD) p.vx *= -1;
      if (p.y < -WORLD || p.y > WORLD) p.vy *= -1;
      p.x = clamp(p.x, -WORLD, WORLD);
      p.y = clamp(p.y, -WORLD, WORLD);
      let absorbed = false;
      if (!S.dead && pieceHitsShip(p, S)) {
        if (tryMergeOntoShip(p, S)) absorbed = true;
        else if (tryFuse(p, S)) {
          p.gone = 1;
          absorbed = true;
        }
      }
      if (!absorbed && !p.gone) {
        for (let ei = 0; ei < S.enemies.length; ei++) {
          const e = S.enemies[ei];
          if (e.dead || e.dying || e.grabbed) continue;
          if (!pieceHitsShip(p, e)) continue;
          if (tryMergeOntoShip(p, e) || tryFuse(p, e)) {
            p.gone = 1;
            absorbed = true;
            break;
          }
          const px = p.x - e.x, py = p.y - e.y;
          const pd = hypot(px, py) || 1;
          p.x += (px / pd) * 10;
          p.y += (py / pd) * 10;
          p.vx += (px / pd) * 40;
          p.vy += (py / pd) * 40;
          absorbed = true;
          break;
        }
      }
      if (!absorbed && !S.dead && pieceHitsShip(p, S)) {
        const px = p.x - S.x, py = p.y - S.y;
        const pd = hypot(px, py) || 1;
        p.x += (px / pd) * 10;
        p.y += (py / pd) * 10;
        p.vx += (px / pd) * 50;
        p.vy += (py / pd) * 50;
      }
    });
    for (let i = 0; i < S.pieces.length; i++) {
      const a = S.pieces[i];
      if (a.gone || a.grabbed) continue;
      for (let j = i + 1; j < S.pieces.length; j++) {
        const b = S.pieces[j];
        if (b.gone || b.grabbed) continue;
        if (hypot(a.x - b.x, a.y - b.y) > CELL * 8) continue;
        tryMergePieces(a, b);
      }
    }
    S.pieces = S.pieces.filter((p) => !p.gone);

    S.enemies.forEach((e) => {
      if (e.dead) return;
      eachCell(e, (c) => {
        c.cd = Math.max(0, c.cd - wdt);
        c.flash = Math.max(0, c.flash - wdt);
      });
      if (e.dying) {
        e.dying -= dt;
        e.flash -= dt;
        if (e.dying <= 0) finishKill(e);
        return;
      }
      if (e.grabbed) {
        if (!S.dead) stealContact(e);
        return;
      }
      e.stunT = Math.max(0, (e.stunT || 0) - dt);
      if (stunned(e)) {
        e.vx *= 0.88;
        e.vy *= 0.88;
        e.x += e.vx * wdt;
        e.y += e.vy * wdt;
        return;
      }
      tickGen(e, wdt);
      if (shipHasPower(e)) {
        const fmul = fieldDrainMul(e);
        if (fmul) spendEnergy(FIELD_DRAIN * fmul * dt, e, "field");
      }
      if (e.ai === "ram" && countType(e, "thrust") > 0 && shipHasPower(e)) spendEnergy(THRUST_DRAIN * 0.45 * dt, e);
      const dx = S.x - e.x, dy = S.y - e.y;
      const d = hypot(dx, dy) || 1;
      const nx = dx / d, ny = dy / d;
      let ax = 0, ay = 0;
      if (e.ai === "chase") {
        ax = nx;
        ay = ny;
      } else if (e.ai === "kite") {
        if (d > e.range + 50) {
          ax = nx;
          ay = ny;
        } else if (d < e.range - 50) {
          ax = -nx;
          ay = -ny;
        } else {
          ax = -ny;
          ay = nx;
        }
      } else if (e.ai === "orbit") {
        ax = -ny + nx * (d > e.range ? 0.6 : -0.2);
        ay = nx + ny * (d > e.range ? 0.6 : -0.2);
      } else if (e.ai === "snipe") {
        if (d < 430) {
          ax = -nx;
          ay = -ny;
        } else if (d > 580) {
          ax = nx;
          ay = ny;
        } else {
          ax = -ny * 0.5;
          ay = nx * 0.5;
        }
      } else if (e.ai === "ram") {
        ax = nx;
        ay = ny;
      } else if (e.ai === "spin") {
        e.spin += dt * 2.1;
        ax = Math.cos(e.spin) * 0.55 + nx * 0.35;
        ay = Math.sin(e.spin) * 0.55 + ny * 0.35;
      }
      const an = hypot(ax, ay) || 1;
      let nSpE = 0;
      eachCell(e, (c) => {
        if (c.type === "speed") nSpE += compLvl(c);
      });
      const mul = 1 + 0.18 * nSpE + (e.ai === "ram" ? 0.25 * countType(e, "thrust") : 0);
      const crawl = spendEnergy(MOVE_DRAIN * dt, e) ? 1 : 0.1;
      e.vx += (ax / an) * e.spd * SPD_MUL * mul * 8 * dt * crawl;
      e.vy += (ay / an) * e.spd * SPD_MUL * mul * 8 * dt * crawl;
      const ed = Math.exp(-7 * dt);
      e.vx *= ed;
      e.vy *= ed;
      e.x += e.vx * wdt;
      e.y += e.vy * wdt;

      const gun = enemyGun(e);
      const powered = shipHasPower(e);
      e.burstGap = Math.max(0, e.burstGap - dt);
      if (powered && gun.burst && e.burstLeft > 0 && e.burstGap <= 0) {
        eachCell(e, (c) => {
          if (c.type !== "laser") return;
          if (!spendEnergy(LASER_COST * (0.75 + 0.25 * compLvl(c)), e)) return;
          const w = cellWorld(e, c);
          fireShot("e", w.x, w.y, angTo(w.x, w.y, S.x, S.y), scaleGunByLvl(gun, compLvl(c)), "A " + e.name);
        });
        e.burstLeft--;
        e.burstGap = 0.08 / ENEMY_ROF;
      }
      eachCell(e, (c) => {
        if (c.type !== "laser" || c.cd > 0) return;
        if (!powered) return;
        const w = cellWorld(e, c);
        let aim = angTo(w.x, w.y, S.x, S.y);
        if (e.ai === "spin") aim = e.spin + c.x + c.y;
        const inRange = d < e.range + 220;
        if (!inRange && e.ai !== "spin") return;
        if (!spendEnergy(LASER_COST * (0.75 + 0.25 * compLvl(c)), e)) return;
        if (gun.burst) {
          e.burstLeft = gun.burst - 1;
          e.burstGap = 0.08 / ENEMY_ROF;
        }
        const eg = scaleGunByLvl(gun, compLvl(c));
        fireShot("e", w.x, w.y, aim, eg, "A " + e.name);
        c.cd = eg.cd;
        c.flash = 0.08;
      });
      eachCell(e, (c) => {
        if (c.type !== "missile" || c.cd > 0) return;
        if (!powered) return;
        const inRange = d < e.range + 280;
        if (!inRange) return;
        if (!spendEnergy(LASER_COST * (1 + 0.3 * compLvl(c)), e)) return;
        const w = cellWorld(e, c);
        const mg = playerMissile(c);
        mg.color = "#ff8060";
        mg.spd = (mg.spd || 200) * 0.9;
        fireShot("e", w.x, w.y, angTo(w.x, w.y, S.x, S.y), mg, "A " + e.name);
        c.cd = mg.cd / ENEMY_ROF;
        c.flash = 0.1;
      });
      eachCell(e, (c) => {
        if (c.type !== "emp" || c.cd > 0) return;
        if (!powered) return;
        if (d > e.range + 260) return;
        if (!spendEnergy(LASER_COST * (1.1 + 0.25 * compLvl(c)), e)) return;
        const w = cellWorld(e, c);
        fireEmp("e", w.x, w.y, angTo(w.x, w.y, S.x, S.y), c, "A " + e.name);
        c.cd = (0.85 / ENEMY_ROF);
        c.flash = 0.1;
      });

      if (!S.dead) ramShips(S, e);
    });
    for (let i = 0; i < S.enemies.length; i++) {
      for (let j = i + 1; j < S.enemies.length; j++) bashPair(S.enemies[i], S.enemies[j]);
    }
    S.enemies = S.enemies.filter((e) => !e.dead);

    eachCell(S, (c) => {
      c.cd = Math.max(0, c.cd - dt);
      c.flash = Math.max(0, c.flash - dt);
    });
    if (!S.dead && !stunned(S) && mouse.left) {
      const wm = worldMouse();
      eachCell(S, (c) => {
        if (c.type !== "laser" || c.cd > 0) return;
        const g = playerGun(c);
        if (!spendEnergy(LASER_COST * (0.75 + 0.25 * compLvl(c)), S)) return;
        const w = cellWorld(S, c);
        fireShot("p", w.x, w.y, angTo(w.x, w.y, wm.x, wm.y), g);
        c.cd = g.cd;
        c.flash = 0.08;
      });
    }
    if (!S.dead && !stunned(S) && (keys.e || keys.E)) {
      const wm = worldMouse();
      eachCell(S, (c) => {
        if (c.type !== "emp" || c.cd > 0) return;
        if (!spendEnergy(LASER_COST * (1.1 + 0.25 * compLvl(c)), S)) return;
        const w = cellWorld(S, c);
        fireEmp("p", w.x, w.y, angTo(w.x, w.y, wm.x, wm.y), c, "");
        c.cd = Math.max(0.45, 0.7 - compLvl(c) * 0.05);
        c.flash = 0.1;
      });
    }
    if (!S.dead && !stunned(S) && mouse.mid) {
      const wm = worldMouse();
      eachCell(S, (c) => {
        if (c.type !== "missile" || c.cd > 0) return;
        const g = playerMissile(c);
        if (!spendEnergy(LASER_COST * (1 + 0.3 * compLvl(c)), S)) return;
        const w = cellWorld(S, c);
        fireShot("p", w.x, w.y, angTo(w.x, w.y, wm.x, wm.y), g);
        c.cd = g.cd;
        c.flash = 0.1;
      });
    }

    S.proj.forEach((pr) => {
      pr.life -= wdt;
      if (!pr.stop) {
        pr.x += pr.vx * wdt;
        pr.y += pr.vy * wdt;
      }
      if (pr.emp) {
        const dist = hypot(pr.x - (pr.ox || pr.x), pr.y - (pr.oy || pr.y));
        pr.r = (pr.baseR || 5) * (1 + dist / 72);
      }
      applyField(pr, S);
      S.enemies.forEach((e) => {
        if (!e.dead && !e.dying) applyField(pr, e);
      });
      if (pr.emp && pr.life > 0) {
        const stun = pr.stun || 2;
        if (pr.team !== "p" && !S.dead && projHitsShip(pr, S)) {
          applyStun(S, stun);
          pr.life = 0;
        }
        if (pr.team !== "e") {
          S.enemies.forEach((e) => {
            if (e.dead || e.dying || pr.life <= 0) return;
            if (projHitsShip(pr, e)) {
              applyStun(e, stun);
              pr.life = 0;
            }
          });
        }
      } else if (pr.missile) {
        maybeDetonate(pr);
      } else {
        if (pr.life > 0) hitDebris(pr);
        if (pr.team === "e" && !S.dead && pr.life > 0) {
          hitShip(S, pr, true);
        } else if (pr.team === "p" && pr.life > 0) {
          S.enemies.forEach((e) => {
            if (e.dead || e.dying || pr.life <= 0) return;
            hitShip(e, pr, false);
          });
        }
      }
    });
    S.proj = S.proj.filter((p) => p.life > 0);
    S.pieces = S.pieces.filter((p) => !p.gone);

    if (S.fx.length > 90) S.fx.splice(0, S.fx.length - 90);
    S.fx.forEach((p) => {
      p.t -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    });
    S.fx = S.fx.filter((p) => p.t > 0);
    S.rings.forEach((r) => {
      r.t -= dt;
      r.r += r.vr * dt;
    });
    S.rings = S.rings.filter((r) => r.t > 0);

    S.spawnE -= wdt;
    S.spawnP -= wdt;
    S.spawnM -= wdt;
    const needP = 14 + Math.min(10, (S.t / 40) | 0);
    const needM = 7 + Math.min(6, (S.t / 50) | 0);
    const needE = (S.t < 40 ? 1 : 2) + Math.min(6, (S.score / 500) | 0);
    if (S.spawnP <= 0 && S.pieces.filter((p) => p.kind === "drift").length < needP) {
      S.pieces.push(spawnPiece(false, true));
      S.spawnP = 0.7 / (1 + 0.1 * (S.buff.spawnHull || 0));
    }
    if (S.spawnM <= 0 && S.pieces.filter((p) => p.kind === "mod").length < needM) {
      S.pieces.push(spawnPiece(true, true));
      S.spawnM = 1.4 / (1 + 0.06 * ((S.buff.spawnGun || 0) + (S.buff.spawnMove || 0) + (S.buff.spawnHull || 0)));
    }
    if (S.spawnE <= 0 && S.enemies.length < needE) {
      S.enemies.push(spawnEnemy(pickFleet()));
      S.spawnE = Math.max(1.4, 4.2 - S.t * 0.02) * SPAWN_SLOW;
    }
    S.spawnO -= dt;
    if (S.spawnO <= 0 && S.orbs.length < 36) {
      S.orbs.push(spawnOrb(true));
      S.spawnO = 0.55;
    }

    const wantZ = (52 / Math.max(46, shipRadius(S))) * S.zoom * 1.05;
    S.cam.z += (wantZ - S.cam.z) * 0.08;
    S.cam.x += (S.x - S.cam.x) * 0.14;
    S.cam.y += (S.y - S.cam.y) * 0.14;
    if ((S.t * 8 | 0) !== ((S.t - dt) * 8 | 0)) hud();
  }

  function ramShips(a, b) {
    cellsOf(a);
    cellsOf(b);
    if (hypot(a.x - b.x, a.y - b.y) > (a._rad || 40) + (b._rad || 40)) return;
    let hit = false;
    let coreA = false;
    let coreB = null;
    const chips = [];
    const la = a._list, lb = b._list;
    for (let i = 0; i < la.length; i++) {
      const ca = la[i];
      const wa = cellWorld(a, ca);
      for (let j = 0; j < lb.length; j++) {
        const cb = lb[j];
        const wb = cellWorld(b, cb);
        if (hypot(wa.x - wb.x, wa.y - wb.y) < CELL * 0.78) {
          hit = true;
          if (ca.type === "core") coreA = true;
          if (cb.type === "core") coreB = cb;
          if (ca.type !== "core") chips.push(ca);
          if (cb.type !== "core") chips.push(cb);
        }
      }
    }
    if (!hit) return;
    const dx = a.x - b.x, dy = a.y - b.y;
    const d = hypot(dx, dy) || 1;
    a.vx += (dx / d) * 220;
    a.vy += (dy / d) * 220;
    b.vx -= (dx / d) * 220;
    b.vy -= (dy / d) * 220;
    if (S.ramT > 0) return;
    S.ramT = 0.38;
    if (coreA) die("A " + (b.name || "hull") + " ram");
    if (coreB) {
      coreB.hp -= 1;
      if (coreB.hp <= 0) killEnemy(b);
    }
    chips.slice(0, 4).forEach((c) => {
      c.hp -= 1;
      c.flash = 0.1;
      if (c.hp <= 0) {
        if (a.cells[key(c.x, c.y)] === c) delCell(a, c);
        else delCell(b, c);
      }
    });
  }

  function stealContact(e) {
    cellsOf(S);
    cellsOf(e);
    if (hypot(e.x - S.x, e.y - S.y) > (S._rad || 40) + (e._rad || 40) + CELL) return;
    const coreE = Object.values(e.cells).find((c) => c.type === "core");
    if (coreE) {
      const w = cellWorld(e, coreE);
      let blocked = false;
      const list = S._list;
      for (let i = 0; i < list.length; i++) {
        const wa = cellWorld(S, list[i]);
        if (hypot(w.x - wa.x, w.y - wa.y) < CELL * 0.78) {
          blocked = true;
          break;
        }
      }
      if (blocked) {
        killEnemy(e);
        spark(w.x, w.y, "#ff4060", 14);
        boom(w.x, w.y, 0.7, "#ff4060");
        return;
      }
    }
    if (S.fuseT > 0) return;
    const stolen = [];
    eachCell(e, (cb) => {
      if (cb.type === "core") return;
      const wb = cellWorld(e, cb);
      let hit = false;
      eachCell(S, (ca) => {
        const wa = cellWorld(S, ca);
        if (hypot(wa.x - wb.x, wa.y - wb.y) < CELL * 0.9) hit = true;
      });
      if (hit) stolen.push(cb);
    });
    if (!stolen.length) return;
    S.fuseT = 0.1;
    stolen.slice(0, 2).forEach((cb) => {
      const w = cellWorld(e, cb);
      const p = {
        type: cb.type,
        shape: [[0, 0]],
        x: w.x,
        y: w.y,
        rot: 0,
        enemyTint: 1,
        store: cb.store,
        lvl: cb.lvl || 1,
      };
      delCell(e, cb);
      if (tryMergeOntoShip(p)) {
        spark(w.x, w.y, "#ffe080", 8);
      } else if (!tryFuse(p)) {
        S.pieces.push({
          id: Math.random(),
          kind: cb.type === "wall" ? "drift" : "mod",
          type: cb.type,
          shape: [[0, 0]],
          x: w.x,
          y: w.y,
          vx: (Math.random() - 0.5) * 40,
          vy: (Math.random() - 0.5) * 40,
          rot: 0,
          vr: 0,
          enemyTint: 1,
          grabbed: 0,
          lvl: cb.lvl || 1,
          cellHp: [cb.hp || 3],
        });
      } else {
        spark(w.x, w.y, "#ff8060", 6);
      }
    });
  }

  function bashPair(a, b) {
    if (a.dead || b.dead || a.dying || b.dying) return;
    if (!(a.grabbed || b.grabbed)) return;
    let hit = false;
    eachCell(a, (ca) => {
      const wa = cellWorld(a, ca);
      eachCell(b, (cb) => {
        const wb = cellWorld(b, cb);
        if (hypot(wa.x - wb.x, wa.y - wb.y) < CELL * 0.8) hit = true;
      });
    });
    if (!hit) return;
    const dx = a.x - b.x, dy = a.y - b.y;
    const d = hypot(dx, dy) || 1;
    const rel = hypot(a.vx - b.vx, a.vy - b.vy);
    a.vx += (dx / d) * 260;
    a.vy += (dy / d) * 260;
    b.vx -= (dx / d) * 260;
    b.vy -= (dy / d) * 260;
    if (S.bashT > 0) return;
    S.bashT = 0.2;
    const dmg = rel > 320 ? 3 : rel > 160 ? 2 : 1;
    S.shake = Math.max(S.shake, 6);
    spark((a.x + b.x) / 2, (a.y + b.y) / 2, "#ffb070", 10);
    [a, b].forEach((ship) => {
      const cells = Object.values(ship.cells).filter((c) => c.type !== "core");
      cells.slice(0, 3).forEach((c) => {
        c.hp -= dmg;
        c.flash = 0.12;
        if (c.hp <= 0) delCell(ship, c);
      });
    });
  }

  function drawDisabled(wx, wy) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,70,80,0.92)";
    ctx.lineWidth = 2.4 / S.cam.z;
    ctx.beginPath();
    ctx.arc(wx, wy, CELL * 0.36, 0, 7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(wx - 6, wy - 6);
    ctx.lineTo(wx + 6, wy + 6);
    ctx.stroke();
    ctx.restore();
  }

  function drawCell(ship, c, enemy) {
    const w = cellWorld(ship, c);
    const hp = Math.max(1, c.hp);
    const spr = SPR[sprKey(c.type, compLvl(c), enemy || c.dark)] || SPR[sprKey(c.type, 1, enemy || c.dark)];
    ctx.save();
    ctx.translate(w.x, w.y);
    ctx.rotate(ship.ang || 0);
    const sc = lvlScale(compLvl(c));
    const half = CELL * 0.58 * sc;
    if (c.flash > 0) ctx.globalAlpha = 0.55 + Math.sin(S.t * 80) * 0.45;
    if (spr) ctx.drawImage(spr, -half, -half, half * 2, half * 2);
    else {
      ctx.fillStyle = enemy || c.dark ? "#3a3238" : "#6a7380";
      ctx.fillRect(-half * 0.9, -half * 0.9, half * 1.8, half * 1.8);
    }
    if (compLvl(c) > 1) {
      ctx.strokeStyle = "rgba(255,224,120," + (0.35 + 0.1 * compLvl(c)) + ")";
      ctx.lineWidth = Math.max(1.2, 2 / (S.cam.z || 1));
      ctx.strokeRect(-CELL * 0.48 * sc, -CELL * 0.48 * sc, CELL * 0.96 * sc, CELL * 0.96 * sc);
    }
    if (c.type === "batt") {
      const k = clamp((c.store || 0) / (c.cap || BATT_CAP), 0, 1);
      ctx.fillStyle = "#14120c";
      ctx.fillRect(-CELL * 0.32, CELL * 0.26, CELL * 0.64, 4);
      ctx.fillStyle = "#ffe080";
      ctx.fillRect(-CELL * 0.32, CELL * 0.26, CELL * 0.64 * k, 4);
    }
    if (c.type === "thrust" && S.thrusting && !enemy) {
      const vang = hypot(S.vx, S.vy) > 8 ? Math.atan2(S.vy, S.vx) : Math.atan2(c.y, c.x);
      ctx.rotate(vang + Math.PI);
      const g = ctx.createLinearGradient(0, 0, 0, 28);
      g.addColorStop(0, "rgba(255,220,120,0.9)");
      g.addColorStop(1, "rgba(255,80,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-6, 8);
      ctx.lineTo(6, 8);
      ctx.lineTo(0, 26 + Math.random() * 8);
      ctx.fill();
    }
    ctx.restore();
    if ((c.type === "laser" || c.type === "thrust" || c.type === "field" || c.type === "missile" || c.type === "emp") && (!shipHasPower(ship) || stunned(ship))) {
      drawDisabled(w.x, w.y);
    }
  }

  function drawCore(ship, enemy) {
    const c = ship.cells[key(0, 0)];
    if (!c || c.type !== "core") {
      eachCell(ship, (q) => {
        if (q.type === "core") drawCoreAt(ship, q, enemy);
      });
      return;
    }
    drawCoreAt(ship, c, enemy);
  }

  function drawCoreAt(ship, c, enemy) {
    const w = cellWorld(ship, c);
    const dying = enemy && ship.dying;
    const black = dying && ((S.t * 18) | 0) % 2 === 0;
    const pr = 13;
    const pulse = 1 + Math.sin(S.t * 5) * 0.05;
    ctx.save();
    if (black) {
      ctx.fillStyle = "#050308";
      ctx.beginPath();
      ctx.arc(w.x, w.y, pr * 1.15, 0, 7);
      ctx.fill();
      ctx.restore();
      return;
    }
    const grd = ctx.createRadialGradient(w.x - 4, w.y - 4, 2, w.x, w.y, pr * 1.9 * pulse);
    if (enemy) {
      grd.addColorStop(0, "#ffffff");
      grd.addColorStop(0.18, "#ffd0d8");
      grd.addColorStop(0.45, "#ff3048");
      grd.addColorStop(1, "rgba(120,0,20,0)");
    } else {
      grd.addColorStop(0, "#ffffff");
      grd.addColorStop(0.18, "#c8ffff");
      grd.addColorStop(0.45, "#7cf0ff");
      grd.addColorStop(1, "rgba(80,180,255,0)");
    }
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(w.x, w.y, pr * 1.85 * pulse, 0, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w.x, w.y, pr, 0, 7);
    ctx.fillStyle = enemy ? "#ff2040" : "#e8ffff";
    ctx.fill();
    ctx.restore();
  }

  function drawShip(ship, enemy) {
    eachCell(ship, (c) => {
      if (c.type !== "core") drawCell(ship, c, enemy);
    });
    drawCore(ship, enemy);
  }

  function drawPiece(p) {
    const cells = pieceWorldCells(p);
    cells.forEach((w) => {
      const spr = SPR[sprKey(p.type, p.lvl || 1, p.enemyTint)] || SPR[sprKey(p.type, 1, p.enemyTint)];
      ctx.save();
      ctx.translate(w.x, w.y);
      ctx.rotate(p.rot);
      const sc = lvlScale(p.lvl || 1);
      const half = CELL * 0.58 * sc;
      ctx.globalAlpha = p.kind === "mod" ? 1 : 0.95;
      ctx.fillStyle = p.enemyTint ? "#3a3238" : "#6a7380";
      ctx.fillRect(-half * 0.9, -half * 0.9, half * 1.8, half * 1.8);
      if (spr) ctx.drawImage(spr, -half, -half, half * 2, half * 2);
      ctx.restore();
    });
  }

  function drawNebula() {
    ctx.fillStyle = "#000005";
    ctx.fillRect(0, 0, W, H);
    const t = S.t;
    const blobs = [
      [0.32, 0.42, 0.62, "rgba(42,10,48,0.55)"],
      [0.68, 0.38, 0.52, "rgba(10,32,46,0.48)"],
      [0.5, 0.52, 0.78, "rgba(52,28,8,0.26)"],
      [0.48, 0.48, 0.28, "rgba(110,72,28,0.16)"],
    ];
    blobs.forEach((b) => {
      const x = W * (b[0] + Math.sin(t * 0.028) * 0.02);
      const y = H * (b[1] + Math.cos(t * 0.022) * 0.018);
      const r = Math.max(W, H) * b[2];
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, b[3]);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 7);
      ctx.fill();
    });
    const cx = W * 0.5, cy = H * 0.5;
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.42);
    cg.addColorStop(0, "rgba(95,72,32,0.14)");
    cg.addColorStop(0.45, "rgba(40,22,10,0.05)");
    cg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = cg;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.012);
    ctx.strokeStyle = "rgba(180,120,50,0.07)";
    ctx.lineWidth = 18;
    for (let a = 0; a < 3; a++) {
      ctx.beginPath();
      for (let i = 0; i < 40; i++) {
        const u = i / 40;
        const ang = a * 2.09 + u * 5.2;
        const rad = 30 + u * Math.min(W, H) * 0.55;
        const x = Math.cos(ang) * rad, y = Math.sin(ang) * rad * 0.55;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
    const stars = S.bgStars || [];
    for (let i = 0; i < stars.length; i++) {
      const st = stars[i];
      const tw = 0.65 + 0.35 * Math.sin(S.t * 2.2 + st.tw);
      ctx.globalAlpha = st.a * tw;
      ctx.fillStyle = "rgb(" + ((st.c[0] * 255) | 0) + "," + ((st.c[1] * 255) | 0) + "," + ((st.c[2] * 255) | 0) + ")";
      const s = st.s * tw;
      ctx.fillRect(st.x * W, st.y * H, s, s);
    }
    ctx.globalAlpha = 1;
  }

  function drawPickupStar(o) {
    const tw = 0.6 + Math.sin(S.t * 5.5 + (o.tw || o.p || 0)) * 0.35;
    const col = o.c || [1, 0.86, 0.55];
    const s = (o.s || 4) * tw;
    ctx.fillStyle = "rgba(" + ((col[0] * 255) | 0) + "," + ((col[1] * 255) | 0) + "," + ((col[2] * 255) | 0) + "," + (0.55 + 0.4 * tw) + ")";
    ctx.beginPath();
    ctx.arc(o.x, o.y, s * 0.55, 0, 7);
    ctx.fill();
    if (o.spike) {
      ctx.strokeStyle = "rgba(" + ((col[0] * 255) | 0) + "," + ((col[1] * 255) | 0) + "," + ((col[2] * 255) | 0) + ",0.45)";
      ctx.lineWidth = 0.8 / Math.max(0.4, S.cam.z);
      ctx.beginPath();
      ctx.moveTo(o.x - s * 2.2, o.y);
      ctx.lineTo(o.x + s * 2.2, o.y);
      ctx.moveTo(o.x, o.y - s * 2.2);
      ctx.lineTo(o.x, o.y + s * 2.2);
      ctx.stroke();
    }
  }

  function draw() {
    drawNebula();
    ctx.save();
    const shx = (Math.random() - 0.5) * S.shake;
    const shy = (Math.random() - 0.5) * S.shake;
    ctx.translate(W / 2 + shx, H / 2 + shy);
    ctx.scale(S.cam.z, S.cam.z);
    ctx.translate(-S.cam.x, -S.cam.y);

    const viewLim = (Math.max(W, H) * 0.72) / Math.max(0.2, S.cam.z) + 120;
    const viewLim2 = viewLim * viewLim;
    function onScreen(x, y) {
      const dx = x - S.cam.x, dy = y - S.cam.y;
      return dx * dx + dy * dy < viewLim2;
    }
    S.orbs.forEach((o) => {
      if (onScreen(o.x, o.y)) drawPickupStar(o);
    });

    const f = fieldStats(S);
    if (f.str) {
      ctx.beginPath();
      ctx.arc(S.x, S.y, f.r, 0, 7);
      ctx.strokeStyle = "rgba(120,170,255," + (0.18 + 0.1 * f.str) + ")";
      ctx.lineWidth = 2 / S.cam.z;
      ctx.stroke();
      ctx.fillStyle = "rgba(80,120,255," + (0.03 + 0.02 * f.str) + ")";
      ctx.fill();
    }

    S.pieces.forEach((p) => {
      if (onScreen(p.x, p.y)) drawPiece(p);
    });
    S.enemies.forEach((e) => {
      if (e.dead) return;
      if (!onScreen(e.x, e.y)) return;
      const ef = fieldStats(e);
      if (ef.str) {
        ctx.beginPath();
        ctx.arc(e.x, e.y, ef.r, 0, 7);
        ctx.strokeStyle = "rgba(200,60,255,0.22)";
        ctx.lineWidth = 2 / S.cam.z;
        ctx.stroke();
      }
      drawShip(e, true);
    });
    if (!S.dead || S.overT < 0.5) {
      const cr = classRadius();
      ctx.save();
      ctx.strokeStyle = "rgba(180,210,255,0.35)";
      ctx.lineWidth = 1.2 / Math.max(0.4, S.cam.z);
      ctx.setLineDash([5 / S.cam.z, 7 / S.cam.z]);
      ctx.beginPath();
      ctx.arc(S.x, S.y, cr, 0, 7);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      drawShip(S, false);
    }

    const tips = clawTips();
    tips.forEach((t) => {
      const shut = t.cell.shut || 0;
      ctx.strokeStyle = "rgba(220,200,130,0.92)";
      ctx.lineWidth = 4 / S.cam.z;
      const mx = (t.x + t.ox) / 2 - (t.y - t.oy) * 0.14;
      const my = (t.y + t.oy) / 2 + (t.x - t.ox) * 0.14;
      ctx.beginPath();
      ctx.moveTo(t.ox, t.oy);
      ctx.quadraticCurveTo(mx, my, t.x, t.y);
      ctx.stroke();
      const ang = Math.atan2(t.y - t.oy, t.x - t.ox);
      const open = 13 * (1 - shut) + 2.5;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(ang);
      ctx.strokeStyle = "#f0dc90";
      ctx.lineWidth = 2.6 / S.cam.z;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(1, -2);
      ctx.quadraticCurveTo(9, -open * 0.7, 17, -open);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(1, 2);
      ctx.quadraticCurveTo(9, open * 0.7, 17, open);
      ctx.stroke();
      ctx.fillStyle = shut > 0.5 ? "#ffe080" : "#a09060";
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, 7);
      ctx.fill();
      ctx.restore();
    });

    S.proj.forEach((p) => {
      if (p.emp) {
        const dist = hypot(p.x - (p.ox || p.x), p.y - (p.oy || p.y));
        const rr = (p.baseR || 5) * (1 + dist / 72);
        const ang = Math.atan2(p.vy, p.vx);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(ang);
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = Math.max(2, rr * 0.38) / Math.max(0.4, S.cam.z);
        ctx.beginPath();
        ctx.arc(rr * 0.15, 0, rr, -1.05, 1.05);
        ctx.stroke();
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = Math.max(3, rr * 0.55) / Math.max(0.4, S.cam.z);
        ctx.beginPath();
        ctx.arc(rr * 0.15, 0, rr * 0.72, -0.85, 0.85);
        ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = 1;
        return;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 7);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.stop ? 0.45 : 1;
      ctx.fill();
      if (p.large) {
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 2 / S.cam.z;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    S.rings.forEach((r) => {
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, 7);
      ctx.strokeStyle = r.c;
      ctx.globalAlpha = clamp(r.t * 2, 0, 0.8);
      ctx.lineWidth = 3 / S.cam.z;
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
    S.fx.forEach((p) => {
      ctx.globalAlpha = clamp(p.t * 3, 0, 1);
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x, p.y, 3 / S.cam.z, 3 / S.cam.z);
      ctx.globalAlpha = 1;
    });

    ctx.restore();
    if (S.warpT > 0) {
      ctx.fillStyle = "rgba(90,50,150," + (0.09 + 0.05 * Math.sin(S.t * 8)) + ")";
      ctx.fillRect(0, 0, W, H);
    }
    if ((S.stunT || 0) > 0) {
      ctx.fillStyle = "rgba(160,220,255," + (0.08 + 0.05 * Math.sin(S.t * 18)) + ")";
      ctx.fillRect(0, 0, W, H);
    }
  }

  let last = 0;
  function loop(ms) {
    const dt = Math.min(0.033, (ms - last) / 1000 || 0.016);
    last = ms;
    tick(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  canvas.addEventListener("mousemove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * W;
    mouse.y = ((e.clientY - r.top) / r.height) * H;
    mouse.live = true;
  });
  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 0) mouse.left = 1;
    if (e.button === 1) {
      e.preventDefault();
      mouse.mid = 1;
    }
    if (e.button === 2) {
      e.preventDefault();
      mouse.right = 1;
      tryGrab();
    }
  });
  canvas.addEventListener("auxclick", (e) => e.preventDefault());
  window.addEventListener("mouseup", (e) => {
    if (e.button === 0) mouse.left = 0;
    if (e.button === 1) mouse.mid = 0;
    if (e.button === 2) {
      mouse.right = 0;
      releaseHolds();
    }
  });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  window.addEventListener("wheel", (e) => {
    if (document.getElementById("overlay").classList.contains("show")) return;
    e.preventDefault();
    const step = e.deltaY > 0 ? 1 / 1.1 : 1.1;
    S.zoom = clamp(S.zoom * step, 0.5, 2);
  }, { passive: false });
  function setPause(on) {
    if (S.dead || S.sizePick) return;
    const ov = document.getElementById("overlay");
    const title = document.getElementById("panel-title");
    if (!title.classList.contains("hidden") && ov.classList.contains("show") && !S.paused) return;
    S.paused = !!on;
    const pp = document.getElementById("panel-pause");
    const po = document.getElementById("panel-over");
    if (S.paused) {
      title.classList.add("hidden");
      po.classList.add("hidden");
      pp.classList.remove("hidden");
      ov.classList.add("show");
      SFX.setThrust(false);
      SFX.thrustWas = false;
    } else {
      pp.classList.add("hidden");
      ov.classList.remove("show");
    }
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (S.dead || S.sizePick) return;
      const ov = document.getElementById("overlay");
      const title = document.getElementById("panel-title");
      if (ov.classList.contains("show") && !title.classList.contains("hidden") && !S.paused) return;
      setPause(!S.paused);
      return;
    }
    keys[e.key] = 1;
    if (e.code === "KeyW") keys.w = 1;
    if (e.code === "KeyA") keys.a = 1;
    if (e.code === "KeyS") keys.s = 1;
    if (e.code === "KeyD") keys.d = 1;
    if (e.code === "KeyE") keys.e = 1;
    if (e.code === "Space") keys[" "] = 1;
    if (e.key === " " || e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
    }
    if (S.paused || S.dead) return;
    if ((e.key === "r" || e.key === "R" || e.key === "f" || e.key === "F") && S.holds.length) {
      const dir = e.key === "r" || e.key === "R" ? 1 : -1;
      S.holds.forEach((h) => {
        if (h.kind === "piece" && h.ref) h.ref.rot += dir * (Math.PI / 2);
      });
    }
    if ((e.key === "q" || e.key === "Q") && !stunned(S) && bestWarpLvl() && S.warpT <= 0 && S.warpCd <= 0 && shipHasPower(S)) {
      const L = bestWarpLvl();
      if (spendEnergy(12 + L * 4, S)) {
        S.warpT = 3 + (L - 1);
        S.warpCd = S.warpT + 3;
        SFX.warp();
      }
    }
  });
  window.addEventListener("keyup", (e) => {
    keys[e.key] = 0;
    if (e.code === "KeyW") keys.w = 0;
    if (e.code === "KeyA") keys.a = 0;
    if (e.code === "KeyS") keys.s = 0;
    if (e.code === "KeyD") keys.d = 0;
    if (e.code === "KeyE") keys.e = 0;
    if (e.code === "Space") keys[" "] = 0;
  });

  document.getElementById("overlay").addEventListener("click", (e) => {
    const sizeBtn = e.target.closest(".size-pick");
    if (sizeBtn) {
      applySizePick(sizeBtn.getAttribute("data-pick"));
      return;
    }
    const btn = e.target.closest(".upg");
    if (!btn || btn.disabled) return;
    buyUpgrade(btn.getAttribute("data-k"));
  });

  document.getElementById("startBtn").onclick = () => {
    SFX.unlock();
    document.getElementById("overlay").classList.remove("show");
    loadRun();
  };
  document.getElementById("retryBtn").onclick = () => {
    SFX.unlock();
    document.getElementById("overlay").classList.remove("show");
    loadRun();
  };
  document.getElementById("titleBtn").onclick = () => {
    document.getElementById("panel-over").classList.add("hidden");
    document.getElementById("panel-title").classList.remove("hidden");
  };
  document.getElementById("resumeBtn").onclick = () => setPause(false);
  document.getElementById("pauseTitleBtn").onclick = () => {
    S.paused = false;
    document.getElementById("panel-pause").classList.add("hidden");
    document.getElementById("panel-over").classList.add("hidden");
    document.getElementById("panel-title").classList.remove("hidden");
    document.getElementById("overlay").classList.add("show");
  };

  try {
    S.best = parseInt(localStorage.getItem("hullcore.best") || "0", 10) || 0;
    document.getElementById("bestVal").textContent = fmt(S.best);
  } catch (e) {}
  refreshShop();
  makeStars();

  (function bootSplash() {
    const logo = document.getElementById("logo-screen");
    const click = document.getElementById("click-start");
    if (!logo || !click) {
      requestAnimationFrame(loop);
      return;
    }
    setTimeout(() => {
      logo.classList.add("fade");
      setTimeout(() => {
        logo.classList.add("hidden");
        click.classList.remove("hidden");
      }, 600);
    }, 1700);
    click.addEventListener("click", () => {
      click.classList.add("hidden");
      SFX.unlock();
    });
    requestAnimationFrame(loop);
  })();
})();
