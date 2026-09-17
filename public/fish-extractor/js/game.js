(() => {
  const W = 720;
  const H = 400;
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const FIRST = ["Rick", "Dana", "Mo", "Luce", "Baz", "Ivy", "Ken", "Pam", "Oz", "Nell", "Vic", "Ash", "Rey", "June", "Cal", "Tess", "Niko", "Wren", "Sol", "Bea", "Dex", "Mira", "Hank", "Yara", "Paz"];
  const LAST = ["Pike", "Gulch", "Voss", "Haddock", "Crook", "Mire", "Shank", "Bait", "Kelp", "Dreg", "Roach", "Quill", "Silt", "Fenn", "Grub"];
  const SPECIES = [
    "Gutterfin", "Sewer Perch", "Oil Eel", "Dumpster Koi", "Alley Barracuda",
    "Manhole Ray", "Neon Loach", "Siren Smelt", "Concrete Catfish",
    "Subway Sturgeon", "Graffiti Guppy", "Stormdrain Leviathan", "Parking Lot Pike",
    "Iridium Lungfish", "Abyssal Gourami", "Chrome Coelacanth",
  ];
  const EXOTIC = ["Iridium Lungfish", "Abyssal Gourami", "Chrome Coelacanth"];
  const COLORS = [
    { n: "mud", v: 0.2, hex: "#6a5a3a" },
    { n: "slate", v: 0.35, hex: "#4a5a6a" },
    { n: "olive", v: 0.4, hex: "#4a6a32" },
    { n: "rust", v: 0.55, hex: "#a04828" },
    { n: "gold", v: 0.8, hex: "#d4a024" },
    { n: "neon", v: 1.0, hex: "#c8ff3a" },
    { n: "magenta", v: 1.15, hex: "#e040a0" },
    { n: "ultramarine", v: 1.3, hex: "#3060ff" },
  ];
  const WEIGHTS = [
    { n: "tiny", m: 0.4 },
    { n: "small", m: 0.8 },
    { n: "medium", m: 1.2 },
    { n: "large", m: 1.9 },
    { n: "huge", m: 3.1 },
    { n: "boat-sinking", m: 5.2 },
  ];
  const GUNS = [
    { id: "pistol", n: "Pistol", cost: 40, dmg: 6, range: 70, rate: 1.4, icon: "img/g-pistol.jpg" },
    { id: "smg", n: "SMG", cost: 90, dmg: 4, range: 62, rate: 6, icon: "img/g-smg.jpg" },
    { id: "shot", n: "Street Shotgun", cost: 130, dmg: 14, range: 42, rate: 0.7, icon: "img/g-shot.jpg" },
    { id: "rifle", n: "Rifle", cost: 180, dmg: 12, range: 110, rate: 1.1, icon: "img/g-rifle.jpg" },
    { id: "laser", n: "Laser Pistol", cost: 280, dmg: 16, range: 100, rate: 1.6, icon: "img/g-laser.jpg" },
    { id: "cannon", n: "Auto Laser Cannon", cost: 520, dmg: 9, range: 120, rate: 8, icon: "img/g-cannon.jpg" },
  ];
  const RODS = [
    { id: "none", n: "No rod (2nd gun)", cost: 0, rare: 0, heavy: 0, icon: "img/icon-fight.png" },
    { id: "stick", n: "Stick + string", cost: 30, rare: 0.02, heavy: 0, icon: "img/g-stick.jpg" },
    { id: "fib", n: "Fiberglass", cost: 140, rare: 0.1, heavy: 0.08, icon: "img/g-fib.jpg" },
    { id: "carbon", n: "Carbon Reel", cost: 320, rare: 0.22, heavy: 0.18, icon: "img/g-carbon.jpg" },
    { id: "myth", n: "Mythic Telescoper", cost: 680, rare: 0.4, heavy: 0.35, icon: "img/g-myth.jpg" },
  ];
  const SK = ["combat", "hack", "fish", "build", "sales"];
  const SK_ICON = {
    combat: "img/sk-combat.jpg",
    hack: "img/sk-hack.jpg",
    fish: "img/sk-fish.jpg",
    build: "img/sk-build.jpg",
    sales: "img/sk-sales.jpg",
  };
  const PORTRAITS = Array.from({ length: 25 }, (_, i) => "img/port-" + String(i + 1).padStart(2, "0") + ".jpg");
  const SK_TIP = {
    combat: "Combat — guns, brawls, surviving a kick to the teeth",
    hack: "Hack — fences, terminals, anything with a light",
    fish: "Fish — reading water and setting the hook",
    build: "Build — walls, counters, the ugly stuff that stays",
    sales: "Sales — talking passives into paying",
  };
  const PHRASES = [
    "I don't fish. I extract.",
    "The pond owes me.",
    "Don't touch my cut.",
    "Cops blink first.",
    "Ravioli is not my favorite food.",
    "Bait is a personality.",
    "If it sparkles, it's mine.",
    "I only run toward money.",
    "The hatch was a suggestion.",
    "Ravioli is not my favorite food.",
    "Count it twice. Then once more.",
    "Sleep is for people with savings.",
    "I brought my own trouble.",
    "I eat what I catch.",
    "Ravioli is not my favorite food.",
    "The register is a kind of prayer.",
    "Wolves have better manners than cops.",
    "I don't do shallow water.",
    "My bag is already heavier than my conscience.",
    "Ravioli is not my favorite food.",
    "If the bird's late, we walk.",
    "I name the fish after people I owe.",
    "Keep the neon. Dump the rest.",
    "I only blink when the Geiger does.",
    "Ravioli is not my favorite food.",
  ];
  let portSeq = 0;
  const BAGS = [
    { id: "plastic", n: "Plastic grocery bags", extra: 2, cost: 28 },
    { id: "paper", n: "Paper bags", extra: 3, cost: 64 },
    { id: "case", n: "Briefcase", extra: 5, cost: 140 },
    { id: "ruck", n: "Rucksack", extra: 10, cost: 310 },
  ];
  const VEHS = [
    { id: "bike", n: "Pedal bike", cost: 45, hp: 22, spd: 74, seats: 2, icon: "img/v-bike.jpg" },
    { id: "ebike", n: "E-bike", cost: 95, hp: 32, spd: 94, seats: 2, icon: "img/v-ebike.jpg" },
    { id: "moto", n: "Motorcycle", cost: 170, hp: 38, spd: 120, seats: 2, icon: "img/v-moto.jpg" },
    { id: "jeep", n: "Jeep", cost: 290, hp: 62, spd: 90, seats: 4, icon: "img/v-jeep.jpg" },
    { id: "van", n: "Van", cost: 440, hp: 82, spd: 76, seats: 6, icon: "img/v-van.jpg" },
    { id: "humvee", n: "Humvee", cost: 720, hp: 125, spd: 84, seats: 4, icon: "img/v-humvee.jpg" },
    { id: "amph", n: "Amphibious Tank", cost: 1080, hp: 168, spd: 68, seats: 4, atk: "cannon", range: 88, dmg: 9, rate: 1.1, amph: 1, icon: "img/v-amph.jpg" },
    { id: "tank", n: "Tank", cost: 1500, hp: 230, spd: 50, seats: 3, atk: "turret", range: 96, dmg: 11, rate: 0.85, icon: "img/v-tank.jpg" },
    { id: "heli", n: "Helicopter", cost: 2300, hp: 98, spd: 142, seats: 4, atk: "guns", range: 112, dmg: 4, rate: 9, icon: "img/v-heli.jpg" },
  ];

  const state = {
    screen: "menu",
    cash: 180,
    job: 1,
    crew: [],
    sel: null,
    drama: null,
    order: "move",
    buildPick: null,
    box: null,
    mouse: { x: 0, y: 0 },
    units: [],
    mobs: [],
    shots: [],
    fishInv: [],
    builds: [],
    pond: { x: 600, y: 80, r: 54 },
    t: 0,
    spawn: 0,
    done: false,
    listed: null,
    market: null,
    deals: { off: null, on: null },
    garage: [],
    vehUnlock: 0,
    vehs: [],
    mktSp: SPECIES[0],
    mktTick: 0,
    mktBars: 48,
    heli: null,
    extract: { x: 70, y: 342, w: 108, h: 72 },
    props: [],
    rate: 0.03,
    debtRate: 0.075,
    lots: [],
    hirePool: [],
    hiredThisJob: 0,
    lvQ: [],
    fence: null,
    hack: null,
  };

  const BIONIC_COST = 260;
  const CORNERS = [
    { id: "NW", x: 96, y: 78 },
    { id: "NE", x: 624, y: 78 },
    { id: "SW", x: 96, y: 322 },
    { id: "SE", x: 624, y: 322 },
  ];

  let ac = null;
  let bgmName = "";
  let bgmTimer = 0;
  function audio() {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
    return ac;
  }
  function beep(freq, dur, type, vol, slide) {
    const a = audio();
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type || "square";
    o.connect(g);
    g.connect(a.destination);
    const t = a.currentTime;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
    g.gain.setValueAtTime(vol || 0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  function noiseBurst(dur, vol) {
    const a = audio();
    const n = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = a.createBufferSource();
    const g = a.createGain();
    const f = a.createBiquadFilter();
    src.buffer = n;
    f.type = "highpass";
    f.frequency.value = 900;
    src.connect(f);
    f.connect(g);
    g.connect(a.destination);
    g.gain.setValueAtTime(vol || 0.08, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
    src.start();
  }
  function sfx(kind) {
    try {
      if (kind === "gun" || kind === "fire") {
        beep(180, 0.05, "square", 0.05, 70);
        noiseBurst(0.06, 0.07);
        return;
      }
      if (kind === "hit") {
        beep(90, 0.07, "square", 0.06, 50);
        noiseBurst(0.05, 0.05);
        return;
      }
      if (kind === "catch") {
        beep(392, 0.07, "square", 0.05);
        setTimeout(() => beep(523, 0.08, "square", 0.05), 70);
        setTimeout(() => beep(659, 0.1, "square", 0.05), 140);
        return;
      }
      if (kind === "win") {
        [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.12, "square", 0.05), i * 90));
        return;
      }
      if (kind === "fail") {
        beep(160, 0.18, "square", 0.06, 50);
        setTimeout(() => beep(80, 0.22, "square", 0.06), 120);
        return;
      }
      const tab = {
        click: [330, 0.04, "square", 0.035],
        hire: [440, 0.08, "square", 0.05],
        laser: [880, 0.07, "square", 0.04],
        miss: [196, 0.07, "square", 0.03],
        build: [262, 0.08, "square", 0.04],
        sell: [698, 0.1, "square", 0.05],
        hurt: [98, 0.12, "square", 0.06],
      };
      const m = tab[kind] || tab.click;
      beep(m[0], m[1], m[2], m[3], kind === "sell" ? m[0] * 1.5 : 0);
    } catch (e) {}
  }

  const SONGS = {
    menu: { bpm: 96, bass: [110, 0, 110, 0, 98, 0, 82, 0], lead: [330, 392, 330, 262, 294, 330, 0, 392] },
    plan: { bpm: 88, bass: [98, 98, 110, 0, 82, 82, 87, 0], lead: [196, 220, 247, 262, 247, 220, 196, 0] },
    mission: { bpm: 132, bass: [82, 82, 98, 82, 73, 73, 82, 98], lead: [247, 0, 294, 247, 330, 0, 294, 220] },
    sky: { bpm: 150, bass: [146, 146, 164, 130, 146, 174, 164, 130], lead: [392, 440, 494, 0, 392, 523, 440, 0] },
  };
  function stopBgm() {
    bgmName = "";
    if (bgmTimer) {
      clearInterval(bgmTimer);
      bgmTimer = 0;
    }
  }
  function startBgm(name) {
    if (bgmName === name) return;
    stopBgm();
    const song = SONGS[name];
    if (!song) return;
    bgmName = name;
    let step = 0;
    const tick = () => {
      try {
        const i = step % 8;
        if (song.bass[i]) beep(song.bass[i], 0.14, "square", 0.028);
        if (song.lead[i]) beep(song.lead[i], 0.11, "square", 0.022);
        step++;
      } catch (e) {}
    };
    tick();
    bgmTimer = setInterval(tick, 60000 / song.bpm / 2);
  }

  function rnd(a) {
    return a[(Math.random() * a.length) | 0];
  }
  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function fmtPct(r) {
    const n = (r * 100).toFixed(2);
    return (r >= 0 ? "+" : "") + n + "%";
  }

  function gauss() {
    let u = 0, v = 0, s = 0;
    do {
      u = Math.random() * 2 - 1;
      v = Math.random() * 2 - 1;
      s = u * u + v * v;
    } while (!s || s >= 1);
    return u * Math.sqrt((-2 * Math.log(s)) / s);
  }

  function rollRate() {
    const raw = clamp(0.023 + gauss() * 0.01, -0.0067, 0.04);
    state.rate = raw * 0.65 * 0.65;
    state.debtRate = (raw * 2.5 + 0.03) * 0.65 * 1.1;
  }

  function applyInterest() {
    const r = state.cash >= 0 ? state.rate : state.debtRate;
    const before = state.cash;
    state.cash = Math.round(state.cash * (1 + r) * 100) / 100;
    return { before, after: state.cash, r };
  }

  function tickLots() {
    const matured = [];
    (state.lots || []).forEach((lot) => {
      lot.amt = Math.round(lot.amt * (1 + lot.rate) * 100) / 100;
      lot.left -= 1;
      if (lot.left <= 0) matured.push(lot);
    });
    state.lots = (state.lots || []).filter((lot) => lot.left > 0);
    matured.forEach((lot) => {
      state.cash = Math.round((state.cash + lot.amt) * 100) / 100;
    });
    return matured;
  }

  function paintCash() {
    const el = document.getElementById("cash");
    if (el) el.textContent = String(Math.round(state.cash));
    const box = document.getElementById("cashBox");
    if (box) box.classList.toggle("neg", state.cash < 0);
    const apy = document.getElementById("apy");
    if (apy) {
      const r = state.cash >= 0 ? state.rate : state.debtRate;
      apy.textContent = fmtPct(r) + " APY";
      apy.className = "apy" + (state.cash < 0 || (state.rate || 0) < 0 ? " dn" : "");
    }
    if (typeof renderLiq === "function") renderLiq();
  }

  function pondDist(x, y) {
    const p = state.pond;
    if (!p) return 99;
    const dx = (x - p.x) / p.r;
    const dy = (y - p.y) / (p.r * 0.72);
    return Math.hypot(dx, dy);
  }

  function inDeep(x, y) {
    return pondDist(x, y) < 0.42;
  }

  function isAmph(v) {
    return v && v.def && v.def.amph;
  }
  function name() {
    return rnd(FIRST) + " " + rnd(LAST);
  }
  function stat() {
    return 1 + ((Math.random() * 5) | 0);
  }

  function xpNeed(lv) {
    return Math.round(14 * Math.pow(lv, 1.82) + 10);
  }

  function hirePrice(c) {
    return Math.max(
      40,
      Math.round(30 + state.job * 14 + c.combat * 9 + c.hack * 8 + c.fish * 8 + c.build * 6 + c.sales * 7)
    );
  }

  function makeCrew(paid, preset) {
    const c = {
      id: Math.random().toString(36).slice(2, 8),
      name: name(),
      combat: stat(),
      hack: stat(),
      fish: stat(),
      build: stat(),
      sales: stat(),
      hp: 40,
      max: 40,
      gun: Object.assign({}, GUNS[0]),
      rod: Object.assign({}, RODS[1]),
      gun2: null,
      status: "ok",
      heat: 0,
      bag: null,
      bionics: 0,
      sit: 0,
      portrait: takePortrait(),
      quote: "",
      cut: 0.01,
      lv: 1,
      xp: 0,
      need: xpNeed(1),
      worth: 0,
      cutAdj: 0,
      moralePerm: 0,
      moraleJob: 0,
    };
    if (paid) {
      c.combat += 1;
      c.fish += 1;
    }
    if (preset) {
      ["name", "combat", "hack", "fish", "build", "sales", "portrait", "cut"].forEach((k) => {
        if (preset[k] != null) c[k] = preset[k];
      });
    }
    const pi = PORTRAITS.indexOf(c.portrait);
    c.quote = pi >= 0 ? PHRASES[pi] : PHRASES[0];
    c.hireCost = hirePrice(c);
    return c;
  }

  function freePortraits() {
    const used = {};
    (state.crew || []).forEach((c) => {
      if (c.portrait) used[c.portrait] = 1;
    });
    (state.hirePool || []).forEach((c) => {
      if (c.portrait) used[c.portrait] = 1;
    });
    const free = PORTRAITS.filter((p) => !used[p]);
    return free.length ? free : PORTRAITS.slice();
  }

  function takePortrait() {
    const free = freePortraits();
    const p = free[(Math.random() * free.length) | 0];
    return p;
  }

  function rollHirePool() {
    const taken = {};
    (state.crew || []).forEach((c) => {
      if (c.portrait) taken[c.portrait] = 1;
    });
    const free = PORTRAITS.filter((p) => !taken[p]);
    const pick = [];
    const bag = (free.length >= 3 ? free : PORTRAITS.slice()).slice();
    for (let i = bag.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = bag[i];
      bag[i] = bag[j];
      bag[j] = t;
    }
    for (let i = 0; i < 3; i++) pick.push(makeCrew(0, { portrait: bag[i] }));
    state.hirePool = pick;
    state.hiredThisJob = 0;
  }

  function moraleMul(c) {
    return clamp(1 - ((c.moraleJob || 0) + (c.moralePerm || 0)), 0.45, 1.25);
  }

  function gainXp(c, n) {
    if (!c || n <= 0) return;
    c.xp = (c.xp || 0) + n;
    while (c.xp >= c.need) {
      c.xp -= c.need;
      c.lv += 1;
      c.need = xpNeed(c.lv);
      c.cut += 0.001 + Math.random() * 0.0015;
      state.lvQ = state.lvQ || [];
      state.lvQ.push(c.id);
    }
    flushLevel();
  }

  function flushLevel() {
    if (!state.lvQ || !state.lvQ.length) return;
    if (document.getElementById("overlay").classList.contains("show") && !document.getElementById("panel-level").classList.contains("hidden")) return;
    const id = state.lvQ[0];
    const c = state.crew.find((x) => x.id === id);
    if (!c) {
      state.lvQ.shift();
      flushLevel();
      return;
    }
    document.getElementById("lvWho").textContent = c.name + " hits level " + c.lv + ". Cut now " + (c.cut * 100).toFixed(2) + "%. Pick a skill.";
    const box = document.getElementById("lvSkills");
    box.innerHTML = "";
    SK.forEach((k) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "lv-sk";
      b.innerHTML = '<img src="' + SK_ICON[k] + '" alt="" width="28" height="28" /> ' + k.toUpperCase() + " " + c[k] + " → " + (c[k] + 1);
      b.onclick = () => {
        if (k === "hack") c[k] = Math.min(12, c[k] + 1);
        else c[k] += 1;
        state.lvQ.shift();
        sfx("hire");
        if (state.screen === "plan") {
          hideOverlay();
          renderPlan();
        } else hideOverlay();
        flushLevel();
      };
      box.appendChild(b);
    });
    showPanel("panel-level");
  }

  function takeCuts(gross) {
    const crew = state.crew || [];
    let share = 0;
    crew.forEach((c) => (share += c.cut || 0));
    share = Math.min(0.9, share);
    crew.forEach((c) => {
      const bit = gross * (c.cut || 0);
      c.worth = (c.worth || 0) + bit;
    });
    return Math.max(0, Math.round(gross * (1 - share)));
  }

  function skLine(c) {
    return SK.map(
      (k) =>
        '<span class="sk" title="' +
        (SK_TIP[k] || k) +
        '"><img src="' +
        SK_ICON[k] +
        '" alt="' +
        k +
        '" />' +
        c[k] +
        "</span>"
    ).join("");
  }

  function hireCost() {
    return 50 + state.crew.length * 35 + state.job * 8;
  }

  function showPanel(id) {
    ["panel-main", "panel-how", "panel-shop", "panel-over", "panel-market", "panel-garage", "panel-stock", "panel-bags", "panel-bank", "panel-hire", "panel-hack", "panel-level"].forEach((p) => {
      const el = document.getElementById(p);
      if (el) el.classList.toggle("hidden", p !== id);
    });
    document.getElementById("overlay").classList.add("show");
  }

  function initListed() {
    const sp = {}, col = {}, w = {};
    SPECIES.forEach((s) => (sp[s] = true));
    COLORS.forEach((c) => (col[c.n] = true));
    WEIGHTS.forEach((x) => (w[x.n] = true));
    return { sp, col, w };
  }

  function bootEconomy() {
    if (!state.listed) state.listed = initListed();
    if (!state.market) {
      state.market = {};
      SPECIES.forEach((s) => {
        state.market[s] = { vol: 5 + ((Math.random() * 28) | 0), mul: 1 };
        seedChart(s);
      });
    }
    if (!state.garage) state.garage = [];
    if (!state.deals || !state.deals.off) rollDeals();
    rollVolumes();
  }

  function rollVolumes() {
    SPECIES.forEach((s) => {
      if (!state.market[s]) state.market[s] = { vol: 8, mul: 1 };
      const m = state.market[s];
      m.vol = Math.max(3, Math.round(m.vol * (0.72 + Math.random() * 0.7)));
      m.mul = clamp(m.mul * (0.97 + Math.random() * 0.06), 0.25, 4);
      pushCandle(s, m.mul, m.vol);
    });
  }

  function rollDeals() {
    const picks = [
      { kind: "sp", key: rnd(SPECIES) },
      { kind: "col", key: rnd(COLORS).n },
      { kind: "w", key: rnd(WEIGHTS).n },
    ];
    state.deals = { off: rnd(picks), on: rnd(picks) };
    if (state.deals.on.kind === state.deals.off.kind && state.deals.on.key === state.deals.off.key) {
      state.deals.on = picks.find((p) => p.key !== state.deals.off.key) || picks[0];
    }
    stampDealShocks();
  }

  function shockChart(sp, dir, amt) {
    if (!state.market || !state.market[sp]) return;
    seedChart(sp);
    const m = state.market[sp];
    const last = m.candles[m.candles.length - 1];
    const px = last ? last.c : basePx(sp);
    const drop = amt || 0.5;
    let c;
    if (dir < 0) {
      c = Math.max(1.1, px * (1 - drop * (0.85 + Math.random() * 0.2)));
      m.candles.push({
        o: px,
        h: px * (1 + Math.random() * 0.03),
        l: c * (0.92 + Math.random() * 0.04),
        c,
        v: Math.max(8, Math.round((last.v || 8) * (3 + Math.random() * 4))),
        event: "clr",
      });
      m.mul = clamp(m.mul * (1 - drop * 0.7), 0.25, 4);
    } else {
      c = px * (1 + drop * (0.85 + Math.random() * 0.25));
      m.candles.push({
        o: px,
        h: c * (1.02 + Math.random() * 0.04),
        l: px * (0.96 + Math.random() * 0.02),
        c,
        v: Math.max(8, Math.round((last.v || 8) * (3 + Math.random() * 4))),
        event: "spot",
      });
      m.mul = clamp(m.mul * (1 + drop * 0.7), 0.25, 4);
    }
    if (m.candles.length > 200) m.candles.splice(0, m.candles.length - 200);
    refreshBook(m);
  }

  function stampDealShocks() {
    const off = state.deals && state.deals.off;
    const on = state.deals && state.deals.on;
    if (off) {
      if (off.kind === "sp") shockChart(off.key, -1, 0.52);
      else SPECIES.forEach((s) => shockChart(s, -1, 0.22));
    }
    if (on) {
      if (on.kind === "sp") shockChart(on.key, 1, 0.5);
      else SPECIES.forEach((s) => shockChart(s, 1, 0.22));
    }
  }

  function dealHit(f, deal) {
    if (!deal) return false;
    if (deal.kind === "sp") return f.sp === deal.key;
    if (deal.kind === "col") return f.col.n === deal.key;
    return f.w.n === deal.key;
  }

  function dealLabel(d) {
    if (!d) return "—";
    return (d.kind === "sp" ? "type " : d.kind === "col" ? "color " : "weight ") + d.key;
  }

  function paintDeals() {
    const off = document.getElementById("dealClrLbl");
    const on = document.getElementById("dealSpotLbl");
    if (off) off.textContent = dealLabel(state.deals && state.deals.off);
    if (on) on.textContent = dealLabel(state.deals && state.deals.on);
  }

  function isListed(f) {
    const L = state.listed;
    if (!L) return true;
    return L.sp[f.sp] && L.col[f.col.n] && L.w[f.w.n];
  }

  function listedFish() {
    return state.fishInv.find(isListed);
  }

  function takeListedFish() {
    if (state.screen === "mission") {
      for (const u of state.units) {
        if (u.crew.hp <= 0 || u.extracted || !u.carry) continue;
        const i = u.carry.findIndex(isListed);
        if (i >= 0) return u.carry.splice(i, 1)[0];
      }
      return null;
    }
    const f = listedFish();
    if (!f) return null;
    state.fishInv.splice(state.fishInv.indexOf(f), 1);
    return f;
  }

  function sampleFish(sp) {
    return { sp, col: COLORS[3], w: WEIGHTS[2], kg: 2 };
  }
  function hideOverlay() {
    document.getElementById("overlay").classList.remove("show");
  }

  function startPlan() {
    startBgm("plan");
    state.screen = "plan";
    state.cash = 180;
    state.job = 1;
    state.crew = [];
    state.crew.push(makeCrew(1));
    state.crew.push(makeCrew(0));
    state.sel = state.crew[0].id;
    state.drama = null;
    state.fishInv = [];
    state.garage = [];
    state.vehUnlock = 0;
    state.listed = initListed();
    state.market = null;
    state.lots = [];
    rollRate();
    rollHirePool();
    bootEconomy();
    document.getElementById("plan").classList.remove("hidden");
    document.getElementById("mission").classList.add("hidden");
    hideOverlay();
    rollDrama(true);
    renderPlan();
    renderLiq();
  }

  function rollDrama(quiet) {
    if (quiet && Math.random() < 0.45) {
      state.drama = null;
      return;
    }
    if (Math.random() < 0.35 || quiet) {
      state.drama = null;
      return;
    }
    const live = state.crew.filter((c) => c.status === "ok");
    if (!live.length) return;
    const a = rnd(live);
    const b = rnd(live);
    const solos = [
      [a.name + " pawned the van battery.", a, "cash", 25],
      [a.name + " is fishing in the sink again.", a, "fish", 1],
      [a.name + " tried to hack a toaster and bricked it.", a, "hack", 1],
    ];
    const duos = a !== b
      ? [
          [a.name + " and " + b.name + " are in a silent feud over bait.", a, b],
          [a.name + " sold " + b.name + "'s shoes.", a, b],
        ]
      : [];
    if (duos.length && Math.random() < 0.5) {
      const d = rnd(duos);
      state.drama = { text: d[0] + " Suspend one or take a $-40 hit.", a: d[1], b: d[2], cash: 40 };
    } else {
      const d = rnd(solos);
      state.drama = { text: d[0] + " Fire, suspend, or eat the penalty.", a: d[1], b: null, kind: d[2], n: d[3] };
    }
  }

  function renderPlan() {
    paintCash();
    document.getElementById("jobNum").textContent = String(state.job);
    const fishEl = document.getElementById("fishNum");
    if (fishEl) fishEl.textContent = String((state.fishInv || []).length);
    paintDeals();
    document.getElementById("obj").textContent = "Plan the crew";
    const box = document.getElementById("dramaBox");
    if (!state.drama) {
      box.className = "drama empty";
      box.textContent = "No heat. Yet.";
    } else {
      box.className = "drama";
      box.textContent = state.drama.text;
    }
    const list = document.getElementById("crewList");
    list.innerHTML = "";
    state.crew.forEach((c) => {
      const el = document.createElement("div");
      el.className =
        "member" +
        (state.sel === c.id ? " on" : "") +
        (c.heat ? " hot" : "") +
        (c.sit > 0 || c.status === "infirm" ? " down" : "") +
        (c.bionics ? " bio" : "");
      el.innerHTML =
        '<div class="port-wrap"><img src="' +
        (c.portrait || PORTRAITS[0]) +
        '" alt="" /><span class="cut-badge">' +
        ((c.cut || 0) * 100).toFixed(2) +
        "%</span></div><div><h3>" +
        c.name +
        (c.bionics ? " · BIO" : "") +
        (c.sit > 0 ? " [INFIRM " + c.sit + "]" : c.status !== "ok" ? " [" + c.status + "]" : "") +
        " · Lv " +
        (c.lv || 1) +
        "</h3><div class='quote'>“" +
        (c.quote || "") +
        "”</div><div class='stats'>" +
        skLine(c) +
        "</div><div class='worth'>NET $" +
        Math.round(c.worth || 0) +
        "</div></div>";
      el.onclick = () => {
        state.sel = c.id;
        renderPlan();
      };
      list.appendChild(el);
    });
    document.getElementById("hireBtn").innerHTML =
      '<img src="img/icon-hire.png" alt="" /> HIRE STREET TALENT (' +
      (3 - (state.hiredThisJob || 0)) +
      " left)";
    const me = state.crew.find((c) => c.id === state.sel);
    const d = document.getElementById("detail");
    if (!me) {
      d.textContent = "Select a crew member.";
      return;
    }
    const xpPct = Math.min(100, (100 * (me.xp || 0)) / (me.need || 1));
    d.innerHTML =
      "<b>" +
      me.name +
      "</b> Lv " +
      (me.lv || 1) +
      "<br><i>“" +
      (me.quote || "") +
      "”</i><br>" +
      skLine(me) +
      "<div class='xpbar'><i style='width:" +
      xpPct +
      "%'></i></div>XP " +
      Math.round(me.xp || 0) +
      "/" +
      (me.need || 0) +
      "<br>Cut " +
      ((me.cut || 0) * 100).toFixed(2) +
      "% · net $" +
      Math.round(me.worth || 0) +
      "<br>Gun: " +
      me.gun.n +
      "<br>Rod: " +
      me.rod.n +
      (me.gun2 ? "<br>Second gun: " + me.gun2.n : "") +
      "<br>Carry: " +
      carryCap(me) +
      " fish" +
      (me.bag ? " (" + me.bag.n + ")" : " (hands)") +
      (me.bionics ? "<br>Bionics: +35% speed · +5 bags · +15% fire · +25% HP · patchable" : "") +
      (me.sit > 0 ? "<br>Infirmary: sits out " + me.sit + " more job" + (me.sit === 1 ? "" : "s") : "") +
      "<div class='row'><button id='dCutUp'>CUT +0.25%</button><button id='dCutDn'>CUT −0.25%</button></div>" +
      "<div class='row'><button id='dFire' class='warn'>FIRE</button><button id='dSus'>SUSPEND</button><button id='dArm'>GEAR</button>" +
      (me.bionics
        ? ""
        : "<button id='dBio'>BIONICS ($" + BIONIC_COST + ")</button>") +
      (me.sit > 0 && me.bionics
        ? "<button id='dPatch'>PATCH UP ($" + patchCost() + ")</button>"
        : "") +
      "</div>";
    document.getElementById("dFire").onclick = () => {
      if (state.crew.length < 2) return;
      sfx("fire");
      state.crew = state.crew.filter((c) => c.id !== me.id);
      state.sel = state.crew[0] && state.crew[0].id;
      if (state.drama && (state.drama.a === me || state.drama.b === me)) state.drama = null;
      renderPlan();
    };
    document.getElementById("dSus").onclick = () => {
      me.status = me.status === "suspended" ? "ok" : "suspended";
      if (state.drama && (state.drama.a === me || state.drama.b === me)) state.drama = null;
      sfx("click");
      renderPlan();
    };
    document.getElementById("dArm").onclick = () => openShop(me);
    const tweakCut = (dir) => {
      if (me.cutAdj) return;
      me.cut = Math.max(0.0025, me.cut + dir * 0.0025);
      me.cutAdj = dir;
      if (dir < 0) {
        me.moraleJob = 0.25;
        sfx("hurt");
      } else {
        me.moraleJob = -0.12;
        sfx("hire");
      }
      renderPlan();
    };
    document.getElementById("dCutUp").onclick = () => tweakCut(1);
    document.getElementById("dCutDn").onclick = () => tweakCut(-1);
    const bioBtn = document.getElementById("dBio");
    if (bioBtn)
      bioBtn.onclick = () => {
        if (me.bionics || state.cash < BIONIC_COST) return;
        state.cash -= BIONIC_COST;
        me.bionics = 1;
        me.max = Math.round((me.max || 40) * 1.25);
        me.hp = me.max;
        sfx("hire");
        renderPlan();
      };
    const patchBtn = document.getElementById("dPatch");
    if (patchBtn)
      patchBtn.onclick = () => {
        const cost = patchCost();
        if (!me.bionics || me.sit <= 0 || state.cash < cost) return;
        state.cash -= cost;
        me.sit = 0;
        me.status = me.status === "suspended" ? "suspended" : "ok";
        me.hp = me.max;
        sfx("hire");
        renderPlan();
      };
  }

  function gearCard(icon, title, sub, locked, on) {
    const b = document.createElement("div");
    b.className = "gear-card" + (locked ? " locked" : "");
    b.innerHTML =
      '<img src="' +
      icon +
      '" alt="" onerror="this.src=\'img/icon-deploy.png\'" /><b>' +
      title +
      "</b><br>" +
      sub;
    if (!locked && on) b.onclick = on;
    return b;
  }

  function openShop(me) {
    document.getElementById("shopWho").textContent = me.name + " · $" + state.cash;
    const g = document.getElementById("shopGuns");
    g.innerHTML = "";
    GUNS.forEach((gun) => {
      g.appendChild(
        gearCard(gun.icon, gun.n, "$" + gun.cost + " · dmg " + gun.dmg, false, () => {
          if (state.cash < gun.cost) return;
          state.cash -= gun.cost;
          if (me.rod.id === "none" && me.gun) me.gun2 = Object.assign({}, gun);
          else me.gun = Object.assign({}, gun);
          sfx("hire");
          openShop(me);
          renderPlan();
        })
      );
    });
    const r = document.getElementById("shopRods");
    r.innerHTML = "";
    RODS.forEach((rod) => {
      const t = rodTier(rod);
      const extra =
        t > 0
          ? " · +" + Math.round((Math.pow(1.25, t) - 1) * 100) + "% bar"
          : "";
      r.appendChild(
        gearCard(rod.icon, rod.n, "$" + rod.cost + extra, false, () => {
          if (state.cash < rod.cost && rod.cost) return;
          state.cash -= rod.cost;
          me.rod = Object.assign({}, rod);
          if (rod.id !== "none") me.gun2 = null;
          sfx("hire");
          openShop(me);
          renderPlan();
        })
      );
    });
    showPanel("panel-shop");
  }

  function patchCost() {
    return 80 + state.job * 22;
  }

  function pickCorners() {
    const pondC = rnd(CORNERS);
    const lzC = rnd(CORNERS.filter((c) => c.id !== pondC.id));
    return {
      pond: { x: pondC.x, y: pondC.y, r: 65, corner: pondC.id },
      extract: { x: lzC.x, y: lzC.y, w: 112, h: 74, corner: lzC.id },
    };
  }

  function maybeFence(pond) {
    const j = state.job;
    const p = j <= 1 ? 0.12 : Math.min(0.86, 0.22 + (j - 1) * 0.13);
    if (Math.random() > p) return null;
    const ang = Math.atan2(H * 0.5 - pond.y, W * 0.5 - pond.x);
    return {
      x: pond.x,
      y: pond.y,
      rx: pond.r + 22,
      ry: pond.r * 0.72 + 18,
      gateAng: ang,
      gateHalf: 0.32,
      open: false,
      gap: 11,
    };
  }

  function inPen(x, y) {
    const f = state.fence;
    if (!f) return false;
    const dx = (x - f.x) / f.rx;
    const dy = (y - f.y) / f.ry;
    return dx * dx + dy * dy < 1;
  }

  function onGate(x, y, pad) {
    const f = state.fence;
    if (!f || !f.open) return false;
    const ang = Math.atan2(y - f.y, x - f.x);
    let d = Math.abs(ang - f.gateAng);
    if (d > Math.PI) d = Math.PI * 2 - d;
    const ring = Math.abs(Math.hypot((x - f.x) / f.rx, (y - f.y) / f.ry) - 1);
    return d < f.gateHalf && ring < 0.3 && pad <= f.gap;
  }

  function fenceCross(x0, y0, x1, y1, pad, veh) {
    if (!state.fence) return false;
    if (veh && veh.def && veh.def.id === "heli") return false;
    if (inPen(x0, y0) === inPen(x1, y1)) return false;
    const tank = veh && veh.def && veh.def.id === "tank";
    const p = tank ? 18 : pad || 8;
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    if (onGate(x1, y1, p) || onGate(mx, my, p)) return false;
    return true;
  }

  function termPos() {
    const f = state.fence;
    if (!f) return null;
    return {
      x: f.x + Math.cos(f.gateAng) * (f.rx + 14),
      y: f.y + Math.sin(f.gateAng) * (f.ry + 14),
    };
  }

  function spawnProps(pond, extract) {
    const props = [];
    const clear = (x, y, pad) => {
      if (x < 28 || y < 28 || x > W - 28 || y > H - 28) return false;
      if (Math.hypot(x - pond.x, y - pond.y) < pond.r + 26) return false;
      if (Math.abs(x - extract.x) < extract.w / 2 + 22 && Math.abs(y - extract.y) < extract.h / 2 + 22) return false;
      if (props.some((p) => Math.hypot(p.x - x, p.y - y) < (pad || 26))) return false;
      return true;
    };
    const place = (kind, n, pad) => {
      let tries = 0;
      while (n > 0 && tries++ < 80) {
        const x = 36 + Math.random() * (W - 72);
        const y = 36 + Math.random() * (H - 72);
        if (!clear(x, y, pad)) continue;
        props.push({ kind, x, y, taken: null });
        n--;
      }
    };
    place("bush", 7 + ((Math.random() * 4) | 0), 28);
    place("bench", 3 + ((Math.random() * 3) | 0), 36);
    place("hole", 3 + ((Math.random() * 3) | 0), 40);
    return props;
  }

  function inBush(x, y) {
    return (state.props || []).some((p) => p.kind === "bush" && Math.hypot(p.x - x, p.y - y) < 16);
  }

  function inHole(x, y) {
    return (state.props || []).some((p) => p.kind === "hole" && Math.hypot(p.x - x, p.y - y) < 9);
  }

  function fireRate(c) {
    return (c.gun.rate || 1) * (c.bionics ? 1.15 : 1) * moraleMul(c);
  }

  function deploy() {
    startBgm("mission");
    const live = state.crew.filter((c) => c.status === "ok" && !(c.sit > 0));
    if (!live.length) {
      document.getElementById("obj").textContent = "Nobody fit to deploy. Wait infirmary or PATCH UP bionics.";
      return;
    }
    if (state.drama) {
      if (state.drama.cash) {
        state.cash -= state.drama.cash;
        if (state.drama.a) state.drama.a.combat = Math.max(1, state.drama.a.combat - 1);
        if (state.drama.b) state.drama.b.sales = Math.max(1, state.drama.b.sales - 1);
      } else if (state.drama.a && state.drama.kind === "cash") state.cash -= state.drama.n;
      else if (state.drama.a && state.drama.kind) state.drama.a[state.drama.kind] = Math.max(1, state.drama.a[state.drama.kind] - state.drama.n);
      state.drama = null;
    }
    state.screen = "mission";
    state.t = 0;
    state.spawn = 0;
    state.done = false;
    state.builds = [];
    state.mobs = [];
    state.shots = [];
    state.order = "move";
    state.buildPick = null;
    state.box = null;
    document.getElementById("buildMenu").classList.add("hidden");
    document.querySelectorAll("#orders [data-order]").forEach((b) => b.classList.toggle("on", b.dataset.order === "move"));
    document.querySelectorAll("#buildMenu [data-build]").forEach((b) => b.classList.remove("on"));
    const corners = pickCorners();
    state.pond = corners.pond;
    state.extract = corners.extract;
    state.fence = maybeFence(state.pond);
    state.props = spawnProps(state.pond, state.extract);
    state.heli = null;
    state.evac = false;
    const z = state.extract;
    state.units = live.map((c, i) => {
      c.max = Math.round((36 + c.combat * 8) * (c.bionics ? 1.25 : 1));
      c.hp = c.max;
      const x = z.x + (i % 3) * 18 - 18;
      const y = z.y + Math.floor(i / 3) * 16 - 10;
      return {
        crew: c,
        x,
        y,
        tx: x,
        ty: y,
        sel: i === 0,
        job: "move",
        cd: 0,
        fish: null,
        buildT: 0,
        sellT: 0,
        veh: null,
        catchShow: null,
        carry: [],
        extracted: 0,
      };
    });
    state.vehs = (state.garage || []).map((g, i) => {
      const def = VEHS.find((v) => v.id === g.id) || VEHS[0];
      return {
        id: "v" + i + Math.random().toString(36).slice(2, 5),
        def,
        x: z.x + 40 + i * 34,
        y: z.y - 28,
        tx: z.x + 40 + i * 34,
        ty: z.y - 28,
        hp: g.hp,
        max: def.hp,
        stolen: null,
        cd: 0,
        garage: g,
      };
    });
    let seat = 0;
    state.vehs.forEach((v) => {
      for (let s = 0; s < v.def.seats && seat < state.units.length; s++) {
        const u = state.units[seat++];
        u.veh = v;
        u.x = v.x;
        u.y = v.y;
        u.tx = v.x;
        u.ty = v.y;
      }
    });
    document.getElementById("plan").classList.add("hidden");
    document.getElementById("mission").classList.remove("hidden");
    hideOverlay();
    paintCash();
    sfx("click");
  }

  function hostile(m) {
    return m && m.hp > 0 && (m.role === "savage" || m.role === "sab" || m.role === "cop" || m.role === "wolf");
  }

  function inExtract(u) {
    const z = state.extract;
    if (!z || !u) return false;
    return Math.abs(u.x - z.x) < z.w / 2 && Math.abs(u.y - z.y) < z.h / 2;
  }

  function nearestSoon(m) {
    let nd = 1e9;
    state.units.forEach((u) => {
      if (u.crew.hp <= 0) return;
      nd = Math.min(nd, Math.hypot(u.x - m.x, u.y - m.y));
    });
    return nd < 90;
  }

  function spawnMob(forceSavage) {
    let role = "passive";
    if (forceSavage === true) role = "savage";
    else if (forceSavage === false) role = "passive";
    spawnMobRole(role);
  }

  function spawnMobRole(role) {
    const job = state.job;
    const armed = role === "cop" || (role === "savage" && job > 1 && Math.random() < 0.12);
    const hp =
      role === "cop"
        ? 22 + job * 5
        : role === "sab"
          ? 16 + job * 3
          : role === "wolf"
            ? 14 + job * 4
            : role === "savage"
              ? 10 + job * 3 + (armed ? 8 : 0)
              : role === "homeless"
                ? 8 + job
                : 9;
    const spd =
      (role === "wolf" ? 36 : role === "homeless" ? 21 : role === "passive" ? 22 : 18) +
      Math.random() * 12 +
      job;
    state.mobs.push({
      x: Math.random() < 0.5 ? -10 : W + 10,
      y: 40 + Math.random() * (H - 80),
      hp,
      max: hp,
      dmg: role === "wolf" ? 7 : role === "cop" ? 6 : armed ? 5 : 3,
      spd,
      armed,
      savage: role !== "passive" && role !== "homeless",
      role,
      cd: 0.4,
      buy: 0,
      slot: -1,
      leaving: 0,
      cloak: 0,
      cloakCd: 4 + Math.random() * 6,
      dash: 0,
      dashCd: 6 + Math.random() * 8,
      veh: null,
      vis: 1,
    });
  }

  function selected() {
    return state.units.filter((u) => u.sel && u.crew.hp > 0);
  }

  function worldPos(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * W,
      y: ((e.clientY - r.top) / r.height) * H,
    };
  }

  function wallHit(x, y, pad) {
    pad = pad == null ? 8 : pad;
    return state.builds.find(
      (b) =>
        b.kind === "wall" &&
        b.done &&
        Math.abs(x - b.x) < b.w / 2 + pad &&
        Math.abs(y - b.y) < b.h / 2 + pad
    );
  }

  function counterAt(x, y) {
    return state.builds.find(
      (b) =>
        b.kind === "counter" &&
        b.done &&
        Math.abs(x - b.x) < b.w / 2 + 6 &&
        Math.abs(y - b.y) < b.h / 2 + 10
    );
  }

  function issueMove(x, y, job) {
    const who = selected();
    if (!who.length) return;
    if (job === "dismount") {
      who.forEach((u) => {
        if (u.veh) {
          u.x = u.veh.x + (Math.random() - 0.5) * 18;
          u.y = u.veh.y + 14 + Math.random() * 10;
          u.veh = null;
        }
        u.job = "move";
        u.tx = x;
        u.ty = y;
      });
      return;
    }
    if (job === "board") {
      who.forEach((u) => {
        const v = nearestOpenVeh(u.x, u.y);
        if (v) board(u, v);
      });
      return;
    }
    const ridden = new Set();
    who.forEach((u, i) => {
      u.job = job || "move";
      u.buildT = 0;
      if (u.job !== "fish") u.fish = null;
      if (u.veh && !u.veh.stolen) {
        ridden.add(u.veh);
      } else {
        u.tx = x + (i % 3) * 12 - 12;
        u.ty = y + Math.floor(i / 3) * 12;
      }
    });
    ridden.forEach((v) => {
      v.tx = x;
      v.ty = y;
    });
  }

  function vehSeats(v) {
    return state.units.filter((u) => u.crew.hp > 0 && u.veh === v).length;
  }

  function nearestOpenVeh(x, y) {
    let best = null;
    let bd = 1e9;
    (state.vehs || []).forEach((v) => {
      if (v.hp <= 0 || v.stolen) return;
      if (vehSeats(v) >= v.def.seats) return;
      const d = Math.hypot(v.x - x, v.y - y);
      if (d < bd && d < 48) {
        bd = d;
        best = v;
      }
    });
    return best;
  }

  function board(u, v) {
    if (!v || v.hp <= 0 || vehSeats(v) >= v.def.seats) return;
    u.veh = v;
    u.fish = null;
    u.job = "move";
    u.x = v.x;
    u.y = v.y;
    sfx("click");
  }

  function placeBuild(x, y) {
    const kind = state.buildPick;
    if (!kind) return false;
    if (kind === "register") {
      const c = counterAt(x, y);
      if (!c) {
        float(x, y, "on counter");
        return false;
      }
      if (state.builds.some((b) => b.kind === "register" && b.counter === c.id)) {
        float(c.x, c.y - 16, "has register");
        return false;
      }
      state.builds.push({
        id: Math.random().toString(36).slice(2, 7),
        kind: "register",
        x: c.x,
        y: c.y - 10,
        w: 14,
        h: 12,
        prog: 0,
        done: false,
        counter: c.id,
      });
    } else if (kind === "counter") {
      state.builds.push({
        id: Math.random().toString(36).slice(2, 7),
        kind: "counter",
        x,
        y,
        w: 44,
        h: 14,
        prog: 0,
        done: false,
      });
    } else {
      state.builds.push({
        id: Math.random().toString(36).slice(2, 7),
        kind: "wall",
        x,
        y,
        w: 30,
        h: 12,
        prog: 0,
        done: false,
      });
    }
    const site = state.builds[state.builds.length - 1];
    const who = selected();
    if (who.length) {
      who.forEach((u, i) => {
        u.tx = site.x + i * 8;
        u.ty = site.y + 16;
        u.job = "build";
        u.buildT = 0;
      });
    }
    sfx("click");
    return true;
  }

  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    if (state.screen !== "mission" || state.done) return;
    const p = worldPos(e);
    issueMove(p.x, p.y, state.order === "fight" ? "fight" : "move");
  });

  canvas.addEventListener("mousedown", (e) => {
    if (state.screen !== "mission" || state.done) return;
    if (e.button !== 0) return;
    const p = worldPos(e);
    state.mouse = p;
    const tp = termPos();
    if (tp && state.fence && !state.fence.open && Math.hypot(p.x - tp.x, p.y - tp.y) < 18) {
      const here = selected().filter((u) => u.crew.hp > 0 && Math.hypot(u.x - tp.x, u.y - tp.y) < 22);
      if (here.length) startHack(here[0]);
      else {
        const who = selected();
        if (who.length) {
          who.forEach((u) => {
            u.job = "hack";
            u.tx = tp.x;
            u.ty = tp.y;
            if (u.veh) {
              u.veh.tx = tp.x;
              u.veh.ty = tp.y;
            }
          });
          float(tp.x, tp.y - 16, "HACK IT");
        } else startHack();
      }
      return;
    }
    const hit = state.units.find((u) => u.crew.hp > 0 && !u.veh && Math.hypot(u.x - p.x, u.y - p.y) < 14);
    if (hit && hit.fish && hit.fish.phase === "bite") {
      tryCatch(hit);
      return;
    }
    const vh = (state.vehs || []).find((v) => v.hp > 0 && Math.hypot(v.x - p.x, v.y - p.y) < 18);
    if (vh && state.order === "board") {
      selected().forEach((u) => board(u, vh));
      return;
    }
    state.box = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, shift: e.shiftKey, hit };
  });

  window.addEventListener("mousemove", (e) => {
    if (state.screen !== "mission") return;
    const p = worldPos(e);
    state.mouse = p;
    if (state.box) {
      state.box.x1 = p.x;
      state.box.y1 = p.y;
    }
  });

  window.addEventListener("mouseup", (e) => {
    if (!state.box || state.screen !== "mission") return;
    if (e.button !== 0) {
      state.box = null;
      return;
    }
    const b = state.box;
    state.box = null;
    const x = Math.min(b.x0, b.x1);
    const y = Math.min(b.y0, b.y1);
    const w = Math.abs(b.x1 - b.x0);
    const h = Math.abs(b.y1 - b.y0);
    if (w > 8 || h > 8) {
      if (!b.shift) state.units.forEach((u) => (u.sel = false));
      state.units.forEach((u) => {
        if (u.crew.hp > 0 && u.x >= x && u.x <= x + w && u.y >= y && u.y <= y + h) u.sel = true;
      });
      sfx("click");
      return;
    }
    if (state.buildPick) {
      placeBuild(b.x0, b.y0);
      return;
    }
    if (b.hit && b.hit.crew.hp > 0) {
      if (!b.shift) state.units.forEach((u) => (u.sel = false));
      b.hit.sel = true;
      sfx("click");
      return;
    }
    state.units.forEach((u) => (u.sel = false));
  });

  function rodTier(rod) {
    if (!rod) return 0;
    const i = RODS.findIndex((r) => r.id === rod.id);
    return i <= 1 ? 0 : i - 1;
  }

  function catchWin(u) {
    const skill = (u.crew && u.crew.fish ? u.crew.fish : 0) * 0.02;
    return (0.09 + skill) * Math.pow(1.25, rodTier(u.crew && u.crew.rod));
  }

  function tryCatch(u) {
    const f = u.fish;
    if (!f || f.phase !== "bite") return;
    const err = Math.abs(f.mark - 0.5);
    if (err < catchWin(u)) {
      if ((u.carry || []).length >= carryCap(u.crew)) {
        float(u.x, u.y - 24, "BAGS FULL");
        sfx("miss");
      } else {
        const fish = rollFish(u.crew.rod, u.veh && isAmph(u.veh) && inDeep(u.x, u.y));
        u.carry = u.carry || [];
        u.carry.push(fish);
        u.catchShow = { fish, t: 1.6 };
        float(u.x, u.y - 24, fish.col.n + " " + fish.sp);
        gainXp(u.crew, 4 + (fish.kg || 1) + (fish.exotic ? 8 : 0));
        sfx("catch");
      }
    } else sfx("miss");
    u.fish = { phase: "wait", t: 0.6 + Math.random() };
  }

  function rollFish(rod, deep) {
    const t = rodTier(rod);
    const shallow = SPECIES.filter((s) => EXOTIC.indexOf(s) < 0);
    let sp = shallow[0];
    if (deep) {
      sp = rnd(EXOTIC);
    } else {
      const rare = Math.random() + (rod.rare || 0);
      if (Math.random() < 0.022 + (rod.rare || 0) * 0.05) sp = rnd(EXOTIC);
      else if (rare > 0.92) sp = shallow[shallow.length - 1];
      else if (rare > 0.75) sp = rnd(shallow.slice(10));
      else if (rare > 0.45) sp = rnd(shallow.slice(5, 12));
      else sp = rnd(shallow.slice(0, 7));
    }
    let wi = 0;
    const wr = Math.random() + (rod.heavy || 0) + (deep ? 0.18 : 0);
    if (wr > 0.92) wi = 5;
    else if (wr > 0.78) wi = 4;
    else if (wr > 0.55) wi = 3;
    else if (wr > 0.3) wi = 2;
    else wi = wr > 0.12 ? 1 : 0;
    const col = deep || EXOTIC.indexOf(sp) >= 0 ? rnd(COLORS.slice(4)) : rnd(COLORS);
    return {
      sp,
      col,
      w: WEIGHTS[wi],
      kg: +(0.3 + wi * 1.4 + Math.random() * 1.2 + (deep ? 1.4 : 0)).toFixed(1),
      rodVal: Math.pow(1.25, t),
      exotic: EXOTIC.indexOf(sp) >= 0 ? 1 : 0,
    };
  }

  function fishValue(f) {
    let v = 24 * f.w.m * f.col.v * (1 + f.kg * 0.15) * (f.rodVal || 1) * ((f.exotic || EXOTIC.indexOf(f.sp) >= 0) ? 6.2 : 1);
    const mk = state.market && state.market[f.sp];
    if (mk) v *= mk.mul;
    if (dealHit(f, state.deals && state.deals.off)) v *= 0.5;
    if (dealHit(f, state.deals && state.deals.on)) v *= 1.5;
    return Math.max(1, Math.round(v));
  }

  function basePx(sp) {
    const m = state.market && state.market[sp];
    const exo = EXOTIC.indexOf(sp) >= 0 ? 6.2 : 1;
    return Math.max(1.5, 24 * 1.2 * 0.55 * 1.3 * exo * ((m && m.mul) || 1));
  }

  function seedChart(sp) {
    if (!state.market[sp]) state.market[sp] = { vol: 8, mul: 1 };
    const m = state.market[sp];
    if (m.candles && m.candles.length > 40) return m;
    let px = basePx(sp);
    const candles = [];
    for (let i = 0; i < 100; i++) {
      const shock = Math.random() < 0.04 ? (Math.random() - 0.5) * 0.18 : 0;
      const drift = (Math.random() - 0.48) * 0.055 + shock;
      const o = px;
      const c = Math.max(1.1, px * (1 + drift));
      const h = Math.max(o, c) * (1 + Math.random() * 0.028);
      const l = Math.min(o, c) * (1 - Math.random() * 0.028);
      const v = Math.max(1, Math.round((m.vol || 8) * (0.35 + Math.random() * 1.8)));
      candles.push({ o, h, l, c, v });
      px = c;
    }
    m.candles = candles;
    m.tape = [];
    m.rsi = [];
    refreshBook(m);
    return m;
  }

  function pushCandle(sp, mul, vol) {
    const m = state.market[sp];
    if (!m) return;
    seedChart(sp);
    const last = m.candles[m.candles.length - 1];
    const px = last ? last.c : basePx(sp);
    const o = px;
    const c = Math.max(1.1, px * (0.97 + Math.random() * 0.06) * (mul && last ? Math.sqrt(mul / ((m.mul || 1) + 0.0001)) : 1));
    const h = Math.max(o, c) * (1 + Math.random() * 0.02);
    const l = Math.min(o, c) * (1 - Math.random() * 0.02);
    const v = Math.max(1, Math.round((vol || m.vol || 8) * (0.5 + Math.random())));
    m.candles.push({ o, h, l, c, v });
    if (m.candles.length > 200) m.candles.shift();
    refreshBook(m);
  }

  function tickLiveMarket(dt) {
    const panel = document.getElementById("panel-market");
    if (!panel || panel.classList.contains("hidden")) return;
    state.mktTick = (state.mktTick || 0) + dt;
    SPECIES.forEach((sp) => {
      seedChart(sp);
      const m = state.market[sp];
      const last = m.candles[m.candles.length - 1];
      if (!last) return;
      last.c = Math.max(1.1, last.c * (1 + (Math.random() - 0.5) * 0.006));
      last.h = Math.max(last.h, last.c);
      last.l = Math.min(last.l, last.c);
      last.v += Math.random() < 0.3 ? 1 : 0;
    });
    if (state.mktTick > 2.8) {
      state.mktTick = 0;
      SPECIES.forEach((sp) => pushCandle(sp, state.market[sp].mul, state.market[sp].vol));
    }
    state.mktBookT = (state.mktBookT || 0) + dt;
    state.mktDrawT = (state.mktDrawT || 0) + dt;
    if (state.mktBookT > 3.6) {
      state.mktBookT = 0;
      const m = state.market[state.mktSp] || seedChart(state.mktSp);
      refreshBook(m);
      renderBookOnly();
    }
    if (state.mktDrawT > 0.28) {
      state.mktDrawT = 0;
      drawMarketChart();
    }
  }

  function sma(arr, n) {
    const out = new Array(arr.length).fill(null);
    let s = 0;
    for (let i = 0; i < arr.length; i++) {
      s += arr[i];
      if (i >= n) s -= arr[i - n];
      if (i >= n - 1) out[i] = s / n;
    }
    return out;
  }

  function rsiArr(candles, p) {
    p = p || 14;
    const out = new Array(candles.length).fill(null);
    let ag = 0;
    let al = 0;
    for (let i = 1; i < candles.length; i++) {
      const ch = candles[i].c - candles[i - 1].c;
      const g = Math.max(0, ch);
      const l = Math.max(0, -ch);
      if (i <= p) {
        ag += g;
        al += l;
        if (i === p) {
          ag /= p;
          al /= p;
          out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
        }
      } else {
        ag = (ag * (p - 1) + g) / p;
        al = (al * (p - 1) + l) / p;
        out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
      }
    }
    return out;
  }

  function hhll(candles, i, len) {
    let h = -1e9;
    let l = 1e9;
    const a = Math.max(0, i - len + 1);
    for (let k = a; k <= i; k++) {
      h = Math.max(h, candles[k].h);
      l = Math.min(l, candles[k].l);
    }
    return (h + l) / 2;
  }

  function ichimoku(candles) {
    const n = candles.length;
    const tenkan = new Array(n).fill(null);
    const kijun = new Array(n).fill(null);
    const sa = new Array(n).fill(null);
    const sb = new Array(n).fill(null);
    for (let i = 0; i < n; i++) {
      if (i >= 8) tenkan[i] = hhll(candles, i, 9);
      if (i >= 25) kijun[i] = hhll(candles, i, 26);
      if (i >= 26) {
        const t = tenkan[i - 26];
        const k = kijun[i - 26];
        sa[i] = t != null && k != null ? (t + k) / 2 : null;
        sb[i] = i >= 51 ? hhll(candles, i - 26, 52) : hhll(candles, Math.max(0, i - 26), Math.min(52, i - 25));
      }
    }
    return { tenkan, kijun, sa, sb };
  }

  function refreshBook(m) {
    if (!m || !m.candles || !m.candles.length) return;
    const px = m.candles[m.candles.length - 1].c;
    const bids = [];
    const asks = [];
    let p = px * (0.997 - Math.random() * 0.002);
    for (let i = 0; i < 14; i++) {
      p *= 0.993 - Math.random() * 0.004;
      bids.push({
        p: +p.toFixed(2),
        q: Math.max(1, Math.round((m.vol || 8) * (0.18 + Math.random() * 1.1) * (1 - i * 0.03))),
      });
    }
    p = px * (1.003 + Math.random() * 0.002);
    for (let i = 0; i < 14; i++) {
      p *= 1.007 + Math.random() * 0.004;
      asks.push({
        p: +p.toFixed(2),
        q: Math.max(1, Math.round((m.vol || 8) * (0.16 + Math.random() * 1.05) * (1 - i * 0.03))),
      });
    }
    m.bids = bids;
    m.asks = asks;
    const spr = +(asks[0].p - bids[0].p).toFixed(2);
    m.spreadRaw = spr;
    m.spread = m.spread == null ? spr : +((m.spread * 0.72 + spr * 0.28).toFixed(2));
    const liq = bids.reduce((s, x) => s + x.q, 0) + asks.reduce((s, x) => s + x.q, 0);
    m.liq = m.liq == null ? liq : Math.round(m.liq * 0.7 + liq * 0.3);
  }

  function tapeAdd(sp, side, px, q) {
    const m = state.market[sp];
    if (!m) return;
    m.tape = m.tape || [];
    m.tape.unshift({ side, px: +px.toFixed(2), q, t: Date.now() });
    if (m.tape.length > 24) m.tape.pop();
  }

  function carryCap(c) {
    return 5 + (c && c.bag ? c.bag.extra : 0) + (c && c.bionics ? 5 : 0);
  }

  const floats = [];
  function float(x, y, t) {
    floats.push({ x, y, t, life: 1 });
  }

  function nearPond(u) {
    return pondDist(u.x, u.y) < 1.18;
  }

  function nearestWater(u) {
    const p = state.pond;
    if (!p) return { x: u.x, y: u.y };
    if (state.fence && !state.fence.open && !inPen(u.x, u.y)) {
      const tp = termPos();
      if (tp) {
        const a = state.fence.gateAng;
        return { x: tp.x - Math.cos(a) * 20, y: tp.y - Math.sin(a) * 20 };
      }
    }
    const deep = u.veh && isAmph(u.veh);
    const a = p.r * (deep ? 0.3 : 0.96);
    const b = p.r * 0.72 * (deep ? 0.3 : 0.96);
    let dx = u.x - p.x;
    let dy = u.y - p.y;
    if (!dx && !dy) dx = 1;
    const k = Math.hypot(dx / a, dy / b) || 1;
    if (!deep && k <= 1.05) return { x: u.x, y: u.y };
    return { x: p.x + dx / k, y: p.y + dy / k };
  }

  function shopReady() {
    return state.builds.some((b) => b.kind === "register" && b.done);
  }

  function registers() {
    return state.builds.filter((b) => b.kind === "register" && b.done);
  }

  function update(dt) {
    if (state.screen !== "mission" || state.done) return;
    state.t += dt;
    state.spawn += dt;
    const sav = state.mobs.filter((m) => m.role === "savage" || m.role === "sab").length;
    const pas = state.mobs.filter((m) => m.role === "passive").length;
    const homelessN = state.mobs.filter((m) => m.role === "homeless").length;
    const copN = state.mobs.filter((m) => m.role === "cop").length;
    const wolfN = state.mobs.filter((m) => m.role === "wolf").length;
    const t = state.t;
    const wantHome = Math.min(16, Math.floor(t / 11));
    const wantCop = Math.min(12, Math.floor(Math.max(0, t - 22) / 15));
    const wantWolf = Math.min(6, Math.floor(Math.max(0, t - 38) / 13 * 0.75));
    const wantSav = state.job === 1 ? (t > 14 ? 1 : 0) : Math.min(8, 1 + Math.floor(t / 20));
    const interval = Math.max(0.42, 1.35 - t / 80 - state.job * 0.04);
    if (state.spawn > interval) {
      state.spawn = 0;
      if (homelessN < wantHome) spawnMobRole("homeless");
      else if (copN < wantCop) spawnMobRole("cop");
      else if (wolfN < wantWolf) spawnMobRole("wolf");
      else if (sav < wantSav) spawnMobRole(Math.random() < 0.22 ? "sab" : "savage");
      else if (pas < 2 + state.job) spawnMobRole("passive");
    }
    for (const u of state.units) {
      if (u.crew.hp <= 0) continue;
      if (u.catchShow) {
        u.catchShow.t -= dt;
        if (u.catchShow.t <= 0) u.catchShow = null;
      }
      if (u.veh) {
        if (u.veh.hp <= 0) u.veh = null;
        else {
          u.x = u.veh.x;
          u.y = u.veh.y;
        }
      }
      const dx = u.tx - u.x;
      const dy = u.ty - u.y;
      const d = Math.hypot(dx, dy);
      if (u.extracted) continue;
      if (!u.veh && d > 3) {
        let sp = 55 + u.crew.combat * 2;
        if (u.crew.bionics) sp *= 1.35;
        sp *= moraleMul(u.crew);
        const cap = carryCap(u.crew);
        const load = (u.carry ? u.carry.length : 0) / Math.max(1, cap);
        sp *= 1 - 0.29 * Math.min(1, load);
        const nx = u.x + (dx / d) * 8;
        const ny = u.y + (dy / d) * 8;
        let blocker = null;
        let blockD = 16;
        for (const m of state.mobs) {
          if (m.hp <= 0 || m.leaving) continue;
          if (m.role !== "passive" && m.role !== "homeless") continue;
          const md = Math.hypot(m.x - nx, m.y - ny);
          if (md < 13) {
            sp *= 0.18;
            if (md < blockD) {
              blockD = md;
              blocker = m;
            }
          }
        }
        const ox = u.x;
        const oy = u.y;
        const stepx = u.x + (dx / d) * sp * dt;
        const stepy = u.y + (dy / d) * sp * dt;
        if (!wallHit(stepx, u.y, 6) && !fenceCross(u.x, u.y, stepx, u.y, 6, null)) u.x = stepx;
        if (!wallHit(u.x, stepy, 6) && !fenceCross(u.x, u.y, u.x, stepy, 6, null)) u.y = stepy;
        if (Math.hypot(u.x - ox, u.y - oy) < 0.35 && blocker) u.stuckT = (u.stuckT || 0) + dt;
        else u.stuckT = 0;
        if (u.stuckT >= 2 && blocker && u.cd <= 0) {
          fire(u, blocker, u.crew.gun);
          if (u.crew.gun2) fire(u, blocker, u.crew.gun2);
          u.cd = 1 / fireRate(u.crew);
          float(u.x, u.y - 18, "MOVE");
        }
      } else u.stuckT = 0;
      if (!u.veh && inHole(u.x, u.y)) {
        u.crew.hp = 0;
        u.carry = [];
        float(u.x, u.y - 12, "FELL IN");
        sfx("fail");
        continue;
      }
      u.cd -= dt;
      if (!u.veh && (u.job === "fight" || u.job === "extract" || state.mobs.some((m) => hostile(m) && m.vis !== 0 && Math.hypot(m.x - u.x, m.y - u.y) < u.crew.gun.range))) {
        let t = null;
        let bd = 1e9;
        for (const m of state.mobs) {
          if (!hostile(m) || m.vis === 0) continue;
          if (inBush(m.x, m.y) && Math.hypot(m.x - u.x, m.y - u.y) > 12) continue;
          const dd = Math.hypot(m.x - u.x, m.y - u.y);
          if (dd < bd && dd < u.crew.gun.range + 20) {
            bd = dd;
            t = m;
          }
        }
        if (t && u.cd <= 0 && bd < u.crew.gun.range) {
          fire(u, t, u.crew.gun);
          if (u.crew.gun2 && Math.random() < 0.5) fire(u, t, u.crew.gun2);
          u.cd = 1 / fireRate(u.crew);
        }
      }
      const amphFish = u.veh && isAmph(u.veh) && pondDist(u.x, u.y) < 1.05;
      if (u.job === "fish" && u.crew.rod.id !== "none" && ((!u.veh && nearPond(u)) || amphFish)) {
        if (!u.fish) u.fish = { phase: "wait", t: 0.4 };
        u.fish.t -= dt;
        if (u.fish.phase === "wait" && u.fish.t <= 0) {
          u.fish = { phase: "bite", t: 0, mark: 0, dir: 1 };
        }
        if (u.fish.phase === "bite") {
          u.fish.mark += u.fish.dir * dt * (1.52 + Math.random() * 0.38 - u.crew.fish * 0.05) * Math.pow(1.1, rodTier(u.crew.rod));
          if (u.fish.mark > 1) {
            u.fish.mark = 1;
            u.fish.dir = -1;
          }
          if (u.fish.mark < 0) {
            u.fish.mark = 0;
            u.fish.dir = 1;
          }
        }
      } else if (u.job !== "fish") u.fish = null;

      if (state.fence && !state.fence.open) {
        const tp = termPos();
        if (tp && Math.hypot(u.x - tp.x, u.y - tp.y) < 22) {
          const aimed = Math.hypot((u.tx || 0) - tp.x, (u.ty || 0) - tp.y) < 32;
          if (u.job === "hack" || u.job === "fish" || aimed) {
            const ov = document.getElementById("overlay");
            const pan = document.getElementById("panel-hack");
            if (!ov || !ov.classList.contains("show") || !pan || pan.classList.contains("hidden")) startHack(u);
          }
        }
      }

      if (u.job === "build" && d < 18) {
        const site = state.builds.find((b) => !b.done && Math.hypot(b.x - u.x, b.y - u.y) < 36);
        if (site && !site.done) {
          site.prog += dt * (0.28 + u.crew.build * 0.1);
          if (site.prog >= 1) {
            site.done = true;
            sfx("build");
            float(site.x, site.y - 10, site.kind);
            gainXp(u.crew, 8);
          }
        }
      }

      if (u.job === "sell") {
        const r = registers()[0];
        if (r) {
          u.tx = r.x - 8;
          u.ty = r.y + 22;
        }
        u.sellT += dt;
      }
    }

    const regs = registers();
    const passives = state.mobs.filter((m) => m.role === "passive" && m.hp > 0 && !m.leaving);
    for (const m of state.mobs) {
      if (m.hp <= 0) continue;
      if (m.role === "sab") {
        m.cloakCd -= dt;
        m.dashCd -= dt;
        if (m.cloak > 0) {
          m.cloak -= dt;
          m.vis = 0;
        } else m.vis = 1;
        if (m.cloakCd <= 0 && m.cloak <= 0) {
          m.cloak = 3;
          m.cloakCd = 15;
        }
        if (m.dash > 0) m.dash -= dt;
        else if (m.dashCd <= 0 && nearestSoon(m)) {
          m.dash = 2;
          m.dashCd = 15;
        }
        const empty = (state.vehs || []).find((v) => v.hp > 0 && vehSeats(v) === 0 && !v.stolen && Math.hypot(v.x - m.x, v.y - m.y) < 20);
        if (empty) {
          empty.stolen = m;
          m.veh = empty;
          m.x = empty.x;
          m.y = empty.y;
        }
      }
      if (m.veh) {
        if (m.veh.hp <= 0) {
          m.veh.stolen = null;
          m.veh = null;
        } else {
          m.x = m.veh.x;
          m.y = m.veh.y;
        }
      }
      let tx = W / 2;
      let ty = H / 2;
      const prey = state.units.filter((u) => u.crew.hp > 0 && !u.extracted && !(inBush(u.x, u.y) && Math.hypot(u.x - m.x, u.y - m.y) > 12));
      let nearest = null;
      let nd = 1e9;
      prey.forEach((u) => {
        const dd = Math.hypot(u.x - m.x, u.y - m.y);
        if (dd < nd) {
          nd = dd;
          nearest = u;
        }
      });
      if (m.bang > 0) {
        m.bang -= dt;
        tx = m.x;
        ty = m.y;
        if (m.bang <= 0 && m.role === "cop" && m.kick) {
          const h = m.kick;
          h.bench = null;
          h.sleeping = 0;
          h.bang = 0;
          h.tx = h.x + (Math.random() < 0.5 ? -40 : 40);
          m.kick = null;
        }
      } else if (m.leaving) {
        tx = m.x < W * 0.5 ? -40 : W + 40;
        ty = m.y;
        if (m.x < -16 || m.x > W + 16) m.hp = 0;
      } else if (m.role === "homeless") {
        if (m.bench) {
          tx = m.bench.x;
          ty = m.bench.y - 4;
          m.sleeping = 1;
          m.sleepT = (m.sleepT || 0) - dt;
          if (m.sleepT <= 0) {
            m.bench = null;
            m.sleeping = 0;
          }
        } else {
          if (!m.seekBench && Math.random() < dt * 0.38) {
            const benches = (state.props || []).filter((p) => p.kind === "bench");
            let want = null;
            let bd = 1e9;
            benches.forEach((b) => {
              if (state.mobs.some((h) => h !== m && h.hp > 0 && h.bench === b)) return;
              const dd = Math.hypot(b.x - m.x, b.y - m.y);
              if (dd < bd) {
                bd = dd;
                want = b;
              }
            });
            if (want) m.seekBench = want;
          }
          if (m.seekBench) {
            tx = m.seekBench.x;
            ty = m.seekBench.y - 4;
            if (Math.hypot(m.x - m.seekBench.x, m.y - m.seekBench.y) < 14) {
              m.bench = m.seekBench;
              m.seekBench = null;
              m.sleeping = 1;
              m.sleepT = 5 + Math.random() * 8;
            }
          } else if (nearest) {
            tx = nearest.x;
            ty = nearest.y;
            if (nd < 14 && nearest.carry && nearest.carry.length) {
              m.stealT = (m.stealT || 0) + dt;
              if (m.stealT > 4.2) {
                nearest.carry.pop();
                float(m.x, m.y - 14, "stole fish");
                m.stealT = 0;
                m.leaving = 1;
                sfx("hurt");
              }
            }
          }
        }
      } else if (m.role === "cop") {
        const sleeper = state.mobs.find((h) => h.role === "homeless" && h.hp > 0 && h.bench && Math.hypot(h.x - m.x, h.y - m.y) < 150);
        if (sleeper) {
          tx = sleeper.x;
          ty = sleeper.y;
          if (Math.hypot(m.x - sleeper.x, m.y - sleeper.y) < 16) {
            m.bang = 1.8;
            sleeper.bang = 1.8;
            m.kick = sleeper;
            sfx("hurt");
          }
        } else if (nearest) {
          tx = nearest.x;
          ty = nearest.y;
        }
      } else if (m.role === "passive" && regs.length) {
        let shop = regs[0];
        let sd = 1e9;
        regs.forEach((r) => {
          const dd = Math.hypot(r.x - m.x, r.y - m.y);
          if (dd < sd) {
            sd = dd;
            shop = r;
          }
        });
        const line = passives
          .filter((p) => {
            const r = regs.reduce((best, rr) => (Math.hypot(rr.x - p.x, rr.y - p.y) < Math.hypot(best.x - p.x, best.y - p.y) ? rr : best), regs[0]);
            return r === shop;
          })
          .sort((a, b) => Math.hypot(a.x - shop.x, a.y - shop.y) - Math.hypot(b.x - shop.x, b.y - shop.y));
        const slot = Math.max(0, line.indexOf(m));
        tx = shop.x;
        ty = shop.y + 16 + slot * 11;
        if (slot === 0 && Math.hypot(m.x - shop.x, m.y - (shop.y + 16)) < 14) {
          m.buy += dt;
          const f = takeListedFish();
          if (m.buy > 0.75 && f) {
            const v = fishValue(f);
            const seller = prey.slice().sort((a, b) => b.crew.sales - a.crew.sales)[0];
            const bonus = seller ? 1 + seller.crew.sales * 0.06 : 1;
            const pay = takeCuts(Math.round(v * bonus));
            state.cash += pay;
            if (seller) gainXp(seller.crew, 3);
            sfx("sell");
            float(shop.x, shop.y - 16, "+$" + pay);
            m.buy = 0;
            m.leaving = 1;
          }
        }
      } else if (m.role === "passive" && nearest) {
        const hold = 14;
        if (nd > hold) {
          tx = nearest.x;
          ty = nearest.y;
        } else {
          tx = m.x + Math.sin(state.t * 3 + m.x) * 4;
          ty = m.y + Math.cos(state.t * 2 + m.y) * 4;
        }
      } else if (nearest) {
        tx = nearest.x;
        ty = nearest.y;
      }
      const dx = tx - m.x;
      const dy = ty - m.y;
      const d = Math.hypot(dx, dy) || 1;
      const spd = m.spd * (m.dash > 0 ? 2 : 1);
      if (!m.veh) {
        const mx = m.x + (dx / d) * spd * dt;
        const my = m.y + (dy / d) * spd * dt;
        if (!wallHit(mx, m.y, 6) && !fenceCross(m.x, m.y, mx, m.y, 6, null)) m.x = mx;
        if (!wallHit(m.x, my, 6) && !fenceCross(m.x, m.y, m.x, my, 6, null)) m.y = my;
        if (!m.veh && inHole(m.x, m.y)) {
          m.hp = 0;
          float(m.x, m.y - 12, "FELL IN");
          sfx("fail");
          continue;
        }
      }
      m.cd -= dt;
      if (hostile(m) && nearest && m.vis !== 0 && m.cd <= 0 && !(m.bang > 0)) {
        const reach = m.role === "cop" ? 70 : m.armed ? 48 : 16;
        if (d < reach) {
          if (m.role === "cop" || (m.armed && d > 16)) {
            state.shots.push({ x: m.x, y: m.y, vx: (dx / d) * 170, vy: (dy / d) * 170, dmg: m.dmg, life: 0.9, foe: 1 });
          } else {
            nearest.crew.hp -= m.dmg;
            sfx("hurt");
          }
          m.cd = m.role === "cop" ? 0.62 : 0.7;
        }
      }
    }

    (state.vehs || []).forEach((v) => {
      if (v.hp <= 0) return;
      const riders = state.units.filter((u) => u.crew.hp > 0 && u.veh === v);
      if (v.stolen) {
        const prey = state.units.filter((u) => u.crew.hp > 0 && !u.extracted);
        let t = prey[0];
        let bd = 1e9;
        prey.forEach((u) => {
          const dd = Math.hypot(u.x - v.x, u.y - v.y);
          if (dd < bd) {
            bd = dd;
            t = u;
          }
        });
        if (t) {
          v.tx = t.x;
          v.ty = t.y;
        }
      }
      const dx = v.tx - v.x;
      const dy = v.ty - v.y;
      const d = Math.hypot(dx, dy);
      if (d > 4 && (riders.length || v.stolen)) {
        const sp = v.def.spd;
        const mx = v.x + (dx / d) * sp * dt;
        const my = v.y + (dy / d) * sp * dt;
        const wetX = pondDist(mx, v.y) < 1;
        const wetY = pondDist(v.x, my) < 1;
        if (!wallHit(mx, v.y, 10) && (!wetX || isAmph(v)) && !fenceCross(v.x, v.y, mx, v.y, 10, v)) v.x = mx;
        if (!wallHit(v.x, my, 10) && (!wetY || isAmph(v)) && !fenceCross(v.x, v.y, v.x, my, 10, v)) v.y = my;
      }
      v.cd -= dt;
      if (v.def.atk && v.cd <= 0 && (riders.length || v.stolen)) {
        let tgt = null;
        let td = 1e9;
        if (v.stolen) {
          state.units.forEach((u) => {
            if (u.crew.hp <= 0) return;
            const dd = Math.hypot(u.x - v.x, u.y - v.y);
            if (dd < td && dd < v.def.range) {
              td = dd;
              tgt = u;
            }
          });
        } else {
          state.mobs.forEach((m) => {
            if (!hostile(m) || m.vis === 0) return;
            const dd = Math.hypot(m.x - v.x, m.y - v.y);
            if (dd < td && dd < v.def.range) {
              td = dd;
              tgt = m;
            }
          });
        }
        if (tgt) {
          const n = Math.hypot(tgt.x - v.x, tgt.y - v.y) || 1;
          const shots = v.def.atk === "guns" ? 2 : 1;
          for (let i = 0; i < shots; i++) {
            state.shots.push({
              x: v.x + (i ? 4 : -2),
              y: v.y,
              vx: ((tgt.x - v.x) / n) * 240,
              vy: ((tgt.y - v.y) / n) * 240,
              dmg: v.def.dmg,
              life: 0.85,
              foe: !!v.stolen,
              laser: v.def.atk === "turret",
            });
          }
          v.cd = 1 / v.def.rate;
          sfx("gun");
        }
      }
      const defended = riders.length > 0 || state.units.some((u) => u.crew.hp > 0 && Math.hypot(u.x - v.x, u.y - v.y) < 42);
      if (!defended && !v.stolen) {
        state.mobs.forEach((m) => {
          if (!hostile(m) || m.role === "sab" || m.vis === 0) return;
          if (Math.hypot(m.x - v.x, m.y - v.y) < 18 && m.cd <= 0) {
            v.hp -= m.dmg;
            m.cd = 0.5;
            if (v.hp <= 0) {
              float(v.x, v.y, "wreck");
              sfx("hurt");
            }
          }
        });
      }
    });

    for (const s of state.shots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (s.foe) {
        for (const u of state.units) {
          if (u.crew.hp > 0 && !u.veh && Math.hypot(u.x - s.x, u.y - s.y) < 10) {
            u.crew.hp -= s.dmg;
            s.life = 0;
            sfx("hurt");
          }
        }
        (state.vehs || []).forEach((v) => {
          if (v.hp > 0 && !v.stolen && Math.hypot(v.x - s.x, v.y - s.y) < 14) {
            v.hp -= s.dmg;
            s.life = 0;
          }
        });
      } else {
        let hit = null;
        let hd = 1e9;
        for (const m of state.mobs) {
          if (m.hp <= 0) continue;
          const dd = Math.hypot(m.x - s.x, m.y - s.y);
          if (dd < 11 && dd < hd) {
            hd = dd;
            hit = m;
          }
        }
        if (hit) {
          hit.hp -= s.dmg;
          s.life = 0;
          sfx("hit");
          if (hit.role === "passive") float(hit.x, hit.y - 12, "customer");
        }
        (state.vehs || []).forEach((v) => {
          if (v.hp > 0 && v.stolen && Math.hypot(v.x - s.x, v.y - s.y) < 14) {
            v.hp -= s.dmg;
            s.life = 0;
          }
        });
      }
    }
    state.shots = state.shots.filter((s) => s.life > 0);
    state.mobs = state.mobs.filter((m) => m.hp > 0);
    state.vehs = (state.vehs || []).filter((v) => v.hp > 0);
    floats.forEach((f) => {
      f.life -= dt;
      f.y -= 20 * dt;
    });
    for (let i = floats.length - 1; i >= 0; i--) if (floats[i].life <= 0) floats.splice(i, 1);

    tickExtract(dt);

    const live = state.units.filter((u) => u.crew.hp > 0 && !u.extracted);
    if (!live.length) {
      if (!state.units.some((u) => u.extracted)) endJob(false);
      else if (!state.heli) endJob(true);
    }
    const carried = state.units.reduce((n, u) => n + ((u.carry && u.carry.length) || 0), 0);
    paintCash();
    paintDeals();
    document.getElementById("fishNum").textContent = String(carried);
    if (state.heli && state.heli.phase === "land") {
      const wait = state.units.filter((u) => u.crew.hp > 0 && !u.extracted);
      if (wait.length)
        document.getElementById("obj").textContent =
          "HELI HOLD · waiting " + wait.map((u) => (u.crew.name || "").split(" ")[0]).join(", ");
    } else {
      document.getElementById("obj").textContent =
        "LZ " +
        ((state.extract && state.extract.corner) || "SW") +
        " · bags " +
        carried +
        " · homeless " +
        homelessN +
        " · cops " +
        copN +
        " · wolves " +
        wolfN +
        " · " +
        (shopReady() ? "REGISTER OPEN" : "pond " + ((state.pond && state.pond.corner) || "NE"));
    }
  }

  function tickExtract(dt) {
    const z = state.extract;
    if (!z) return;
    const living = state.units.filter((u) => u.crew.hp > 0);
    const live = living.filter((u) => !u.extracted);
    if (state.evac) {
      live.forEach((u) => {
        u.job = "extract";
        if (u.veh) {
          u.veh.tx = z.x;
          u.veh.ty = z.y;
        } else {
          u.tx = z.x;
          u.ty = z.y;
        }
      });
      if (!state.heli && live.some((u) => inExtract(u) && !u.veh)) {
        state.heli = { phase: "in", t: 0, x: z.x - 90, y: -36 };
        float(z.x, z.y - 24, "BIRD INBOUND");
        sfx("win");
      }
    }
    const h = state.heli;
    if (!h) return;
    h.t += dt;
    if (h.phase === "in") {
      h.x += (z.x - h.x) * 2.4 * dt;
      h.y += (z.y - 16 - h.y) * 2.4 * dt;
      if (Math.hypot(h.x - z.x, h.y - (z.y - 16)) < 10) {
        h.phase = "land";
        h.t = 0;
        h.x = z.x;
        h.y = z.y - 16;
        float(z.x, z.y - 28, "TOUCHDOWN · HOLD FOR CREW");
      }
    } else if (h.phase === "land") {
      live.forEach((u) => {
        if (inExtract(u) && !u.veh) {
          u.extracted = 1;
          u.x = h.x;
          u.y = h.y;
        }
      });
      const left = state.units.filter((u) => u.crew.hp > 0 && !u.extracted);
      if (left.length) {
        const names = left.map((u) => u.crew.name.split(" ")[0]).join(", ");
        document.getElementById("obj").textContent = "HELI HOLD · waiting " + names;
      } else {
        h.phase = "up";
        h.t = 0;
        float(z.x, z.y - 28, "ALL ABOARD");
      }
    } else if (h.phase === "up") {
      h.y -= 78 * dt;
      h.x += 22 * dt;
      state.units.forEach((u) => {
        if (u.extracted) {
          u.x = h.x;
          u.y = h.y;
        }
      });
      if (h.y < -48) {
        const remain = state.units.filter((u) => u.crew.hp > 0 && !u.extracted);
        if (!remain.length) endJob(true);
        else {
          state.heli = null;
          float(z.x, z.y - 10, "BIRD AWAY");
        }
      }
    }
  }

  function fire(u, t, gun) {
    const dx = t.x - u.x;
    const dy = t.y - u.y;
    const n = Math.hypot(dx, dy) || 1;
    state.shots.push({
      x: u.x,
      y: u.y,
      vx: (dx / n) * 220,
      vy: (dy / n) * 220,
      dmg: gun.dmg + u.crew.combat * 0.4,
      life: 0.8,
      laser: gun.id.indexOf("laser") >= 0 || gun.id === "cannon",
    });
    sfx(gun.id === "cannon" || gun.id === "laser" ? "laser" : "gun");
  }

  const skyCv = document.getElementById("sky");
  const skyCtx = skyCv && skyCv.getContext("2d");
  const skyKeys = {};
  window.addEventListener("keydown", (e) => {
    skyKeys[e.key] = 1;
    if (state.screen === "sky" && (e.key === " " || e.code === "Space")) {
      e.preventDefault();
      skyFire();
    }
  });
  window.addEventListener("keyup", (e) => {
    skyKeys[e.key] = 0;
  });

  function startSky(haul) {
    startBgm("sky");
    state.screen = "sky";
    state.skyHaul = haul || [];
    state.sky = {
      t: 0,
      x: 70,
      y: 200,
      vx: 120,
      vy: 0,
      cd: 0,
      shots: [],
      balloons: [],
      foes: [
        { kind: "heli", x: -40, y: 80, vy: 10 },
        { kind: "heli", x: -120, y: 260, vy: -8 },
        { kind: "blimp", x: 40, y: 40, vy: 4 },
      ],
      pmiss: [],
      spin: 0,
      dead: 0,
      won: 0,
      land: 0,
      worldW: 2700,
      padX: 2520,
      padY: 290,
      spawn: 0,
    };
    const wrap = document.getElementById("skyWrap");
    if (wrap) wrap.classList.remove("hidden");
    document.getElementById("mission").classList.add("hidden");
    const hud = document.getElementById("skyHud");
    if (hud) hud.textContent = "WASD / arrows · SPACE missiles · " + state.skyHaul.length + " fish aboard · land the pad";
  }

  function skyFire() {
    const s = state.sky;
    if (!s || s.dead || s.won || s.cd > 0) return;
    s.cd = 0.14;
    const spd = Math.hypot(s.vx || 0, s.vy || 0) || 1;
    const fx = Math.abs(s.vx) > 8 ? s.vx / spd : 1;
    const fy = (s.vy || 0) / spd * 0.45;
    s.shots.push({
      x: s.x + fx * 22,
      y: s.y + fy * 8,
      vx: fx * 380,
      vy: fy * 260 + (Math.random() - 0.5) * 24,
    });
    sfx("gun");
  }

  function finishSky(ok) {
    const wrap = document.getElementById("skyWrap");
    if (wrap) wrap.classList.add("hidden");
    state.sky = null;
    state.screen = "mission";
    if (ok && state.skyHaul) state.fishInv.push.apply(state.fishInv, state.skyHaul);
    state.skyHaul = [];
    finishJobTail(true);
  }

  function updateSky(dt) {
    const s = state.sky;
    if (!s) return;
    s.t += dt;
    s.cd = Math.max(0, s.cd - dt);
    if (s.dead) {
      s.spin += dt * 8;
      s.y += 40 * dt;
      if (s.t > 1.4) finishSky(false);
      return;
    }
    if (s.won) {
      s.land += dt;
      s.y += (s.padY - s.y) * 3 * dt;
      if (s.land > 0.8) finishSky(true);
      return;
    }
    let ax = 0;
    let ay = 0;
    if (skyKeys.w || skyKeys.W || skyKeys.ArrowUp) ay -= 1;
    if (skyKeys.s || skyKeys.S || skyKeys.ArrowDown) ay += 1;
    if (skyKeys.a || skyKeys.A || skyKeys.ArrowLeft) ax -= 1;
    if (skyKeys.d || skyKeys.D || skyKeys.ArrowRight) ax += 1;
    s.vx = (s.vx || 0) + ax * 920 * dt;
    s.vy = (s.vy || 0) + ay * 920 * dt;
    s.vx *= 0.9;
    s.vy *= 0.9;
    if (!ax) s.vx += 18 * dt;
    s.x = clamp(s.x + s.vx * dt, 36, s.worldW + 20);
    s.y = clamp(s.y + s.vy * dt, 22, 368);
    s.spawn += dt;
    if (s.spawn > 0.32) {
      s.spawn = 0;
      const cols = ["#e04060", "#40a0e8", "#e8c040", "#48c060", "#e070c8", "#f07838", "#58e0d0", "#b060ff", "#f0f0e8"];
      s.balloons.push({
        x: s.x - 80 + Math.random() * 520,
        y: 412 + Math.random() * 36,
        vy: -(22 + Math.random() * 40),
        r: 3.5 + Math.random() * 3.2,
        col: cols[(Math.random() * cols.length) | 0],
      });
    }
    s.shots.forEach((m) => {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
    });
    s.shots = s.shots.filter((m) => m.x < s.x + 500);
    s.balloons.forEach((b) => {
      b.y += b.vy * dt;
    });
    s.balloons = s.balloons.filter((b) => b.y > -30 && b.x > s.x - 80);
    s.shots.forEach((m) => {
      s.balloons.forEach((b) => {
        if (b.dead) return;
        if (Math.hypot(m.x - b.x, m.y - b.y) < b.r + 4) {
          b.dead = 1;
          m.x = 9e9;
          sfx("hit");
        }
      });
    });
    s.balloons = s.balloons.filter((b) => !b.dead);
    s.balloons.forEach((b) => {
      if (Math.hypot(b.x - s.x, b.y - s.y) < b.r + 10) {
        s.dead = 1;
        s.t = 0;
        sfx("fail");
      }
    });
    s.foes.forEach((f) => {
      f.x += (s.x - 90 - f.x) * 0.6 * dt;
      f.y += ((f.kind === "blimp" ? 50 : s.y + f.vy) - f.y) * 0.4 * dt;
      f.cd = (f.cd || 0) - dt;
      if (f.cd <= 0) {
        f.cd = 1.1 + Math.random() * 0.8;
        const jx = (Math.random() - 0.5) * 140;
        const jy = (Math.random() - 0.5) * 160;
        s.pmiss.push({ x: f.x + 10, y: f.y, vx: 40 + Math.random() * 30, vy: (s.y + jy - f.y) * 0.15 });
      }
    });
    s.pmiss.forEach((m) => {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
    });
    s.pmiss = s.pmiss.filter((m) => m.x < s.x + 400 && m.y > -20 && m.y < 420);
    s.pmiss.forEach((m) => {
      if (Math.hypot(m.x - s.x, m.y - s.y) < 12) {
        s.dead = 1;
        s.t = 0;
        sfx("fail");
      }
    });
    if (s.x > s.padX - 10 && s.y > s.padY - 36 && s.y < s.padY + 24) {
      s.won = 1;
      s.land = 0;
      sfx("win");
    }
    if (s.x > s.worldW + 40 && !s.won) {
      s.dead = 1;
      s.t = 0;
    }
  }

  function drawSky() {
    const s = state.sky;
    const c = skyCtx;
    if (!s || !c) return;
    const cam = s.x - 260;
    c.fillStyle = "#0b1a28";
    c.fillRect(0, 0, 720, 400);
    c.fillStyle = "#12283a";
    for (let i = 0; i < 18; i++) {
      const bx = ((i * 220 - cam * 0.3) % 800) - 40;
      c.fillRect(bx, 260 + (i % 3) * 20, 70, 160);
    }
    const padSx = s.padX - cam;
    c.fillStyle = "#2a2a28";
    c.fillRect(padSx - 30, s.padY - 8, 90, 90);
    c.fillStyle = "#3a3a30";
    c.fillRect(padSx - 40, s.padY + 20, 110, 140);
    c.fillStyle = "#c8ff3a";
    c.beginPath();
    c.arc(padSx + 16, s.padY + 8, 16, 0, 7);
    c.stroke();
    c.fillRect(padSx + 8, s.padY + 6, 16, 4);
    c.fillRect(padSx + 14, s.padY, 4, 16);
    s.balloons.forEach((b) => {
      const bx = b.x - cam;
      c.fillStyle = b.col || "#e04060";
      c.beginPath();
      c.ellipse(bx, b.y, b.r * 0.85, b.r, 0, 0, 7);
      c.fill();
      c.fillStyle = "rgba(255,255,255,0.35)";
      c.beginPath();
      c.ellipse(bx - b.r * 0.25, b.y - b.r * 0.3, b.r * 0.28, b.r * 0.22, 0, 0, 7);
      c.fill();
      c.strokeStyle = "#ddd";
      c.beginPath();
      c.moveTo(bx, b.y + b.r);
      c.lineTo(bx, b.y + b.r + 7);
      c.stroke();
    });
    s.foes.forEach((f) => {
      const x = f.x - cam;
      if (f.kind === "blimp") {
        c.fillStyle = "#243050";
        c.beginPath();
        c.ellipse(x, f.y, 28, 11, 0, 0, 7);
        c.fill();
        c.fillStyle = "#1a2038";
        c.fillRect(x - 8, f.y + 8, 16, 6);
        c.fillStyle = "#fff";
        c.font = "8px sans-serif";
        c.fillText("POLICE", x - 16, f.y + 3);
      } else {
        c.save();
        c.translate(x, f.y);
        c.fillStyle = "#1a3058";
        c.beginPath();
        c.ellipse(2, 1, 13, 6, 0, 0, 7);
        c.fill();
        c.fillRect(-18, -1, 14, 4);
        c.fillStyle = "#80a0d0";
        c.beginPath();
        c.ellipse(7, 0, 5, 4, 0, 0, 7);
        c.fill();
        const pr = s.t * 38;
        c.strokeStyle = "#c8d0e0";
        c.beginPath();
        c.moveTo(Math.cos(pr) * 16, -8);
        c.lineTo(-Math.cos(pr) * 16, -8);
        c.stroke();
        c.fillStyle = "#fff";
        c.font = "6px sans-serif";
        c.fillText("PD", -4, 3);
        c.restore();
      }
    });
    c.fillStyle = "#f0e0a0";
    s.shots.forEach((m) => c.fillRect(m.x - cam, m.y, 6, 2));
    c.fillStyle = "#80ffea";
    s.pmiss.forEach((m) => c.fillRect(m.x - cam, m.y, 5, 2));
    c.save();
    c.translate(s.x - cam, s.y);
    if (s.dead) c.rotate(s.spin);
    const nose = (s.vx || 0) < -20 ? -1 : 1;
    c.scale(nose, 1);
    drawSkyChopper(c, s.t, s.dead);
    c.restore();
    c.fillStyle = "#c8ff3a";
    c.font = "12px sans-serif";
    c.fillText(s.dead ? "SPIN-OUT · HAUL LOST" : s.won ? "PAD" : "PAD " + Math.max(0, ((s.padX - s.x) / 220) | 0) + "s", 12, 20);
  }

  function drawSkyChopper(c, t, wreck) {
    const rot = t * 42;
    c.fillStyle = wreck ? "#5a2020" : "#2a3530";
    c.beginPath();
    c.ellipse(2, 1, 16, 7, 0, 0, 7);
    c.fill();
    c.fillStyle = wreck ? "#3a1010" : "#1a2420";
    c.fillRect(-22, -2, 18, 5);
    c.fillRect(-28, -6, 4, 10);
    c.fillStyle = wreck ? "#6a3030" : "#3a80a0";
    c.beginPath();
    c.ellipse(8, -1, 7, 5, 0, 0, 7);
    c.fill();
    c.strokeStyle = "#111";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(-8, 7);
    c.lineTo(-4, 11);
    c.lineTo(12, 11);
    c.lineTo(10, 7);
    c.stroke();
    c.strokeStyle = wreck ? "#a04040" : "#c8d0c8";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(Math.cos(rot) * 22, -10 + Math.sin(rot) * 3);
    c.lineTo(-Math.cos(rot) * 22, -10 - Math.sin(rot) * 3);
    c.stroke();
    c.beginPath();
    c.moveTo(Math.cos(rot + 1.57) * 22, -10 + Math.sin(rot + 1.57) * 3);
    c.lineTo(-Math.cos(rot + 1.57) * 22, -10 - Math.sin(rot + 1.57) * 3);
    c.stroke();
    c.fillStyle = "#111";
    c.fillRect(-2, -12, 5, 4);
    c.strokeStyle = "#aaa";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(-28, -6);
    c.lineTo(-28 + Math.cos(t * 28) * 5, -10);
    c.stroke();
    c.fillStyle = wreck ? "#ff6a3d" : "#c8ff3a";
    c.fillRect(14, 0, 3, 2);
  }

  function endJob(win) {
    if (state.done) return;
    state.done = true;
    const died = [];
    const deployed = state.units.map((u) => u.crew);
    state.units.forEach((u) => {
      if (u.crew.hp <= 0) {
        died.push(u.crew);
        u.crew.sit = 1 + ((Math.random() * 3) | 0);
        u.crew.status = "infirm";
      } else {
        u.crew.hp = u.crew.max;
      }
    });
    state.crew.forEach((c) => {
      if (c.sit > 0 && !died.includes(c) && !deployed.includes(c)) {
        c.sit -= 1;
        if (c.sit <= 0) {
          c.sit = 0;
          if (c.status === "infirm") c.status = "ok";
          c.hp = c.max;
        }
      }
    });
    if (win) {
      const haul = [];
      state.units.forEach((u) => {
        if (u.carry && u.carry.length && (u.extracted || u.crew.hp > 0)) {
          haul.push.apply(haul, u.carry);
          u.carry = [];
        }
      });
      if (!state.skySkip) {
        startSky(haul);
        return;
      }
      state.fishInv.push.apply(state.fishInv, haul);
    }
    finishJobTail(win);
  }

  function finishJobTail(win) {
    const title = win || state.units.some((u) => u.extracted) ? "EXTRACTED" : "WIPED";
    if (title === "WIPED") {
      sfx("fail");
      state.garage = [];
    } else {
      sfx("win");
      state.garage = (state.vehs || [])
        .filter((v) => v.hp > 0 && !v.stolen)
        .map((v) => ({ id: v.def.id, hp: Math.max(1, v.hp | 0) }));
      state.job += 1;
      rollDeals();
      rollVolumes();
      rollHirePool();
    }
    state.crew.forEach((c) => {
      if (c.cutAdj < 0) c.moralePerm = Math.min(0.45, (c.moralePerm || 0) + 0.1);
      if (c.cutAdj > 0) c.moralePerm = Math.max(0, (c.moralePerm || 0) - 0.05);
      c.moraleJob = 0;
      c.cutAdj = 0;
    });
    state.units.forEach((u) => {
      if (u.extracted) gainXp(u.crew, 6);
    });
    const bank = applyInterest();
    const matured = tickLots();
    rollRate();
    document.getElementById("overTitle").textContent = title;
    document.getElementById("overMsg").textContent =
      (title === "WIPED" ? "Crew wiped. Rides lost. " : "Catch warehoused (" + state.fishInv.length + " fish). ") +
      "Cash $" +
      Math.round(state.cash) +
      " · year " +
      fmtPct(bank.r) +
      (matured.length ? " · " + matured.length + " lot(s) matured" : "") +
      ". Next job " +
      state.job +
      ".";
    rollDrama(false);
    showPanel("panel-over");
  }

  function px(x, y, c, w, h) {
    ctx.fillStyle = c;
    ctx.fillRect(x | 0, y | 0, w || 1, h || 1);
  }

  function drawWolf(x, y, t) {
    x |= 0;
    y |= 0;
    const bob = ((t * 10) | 0) % 2;
    px(x - 10, y - 4 + bob, "#3a342c", 18, 7);
    px(x + 6, y - 7 + bob, "#3a342c", 8, 5);
    px(x + 12, y - 6 + bob, "#2a241c", 4, 3);
    px(x - 8, y - 8 + bob, "#4a4034", 4, 4);
    px(x - 3, y - 8 + bob, "#4a4034", 4, 4);
    px(x + 10, y - 5 + bob, "#c8ff3a", 2, 2);
    px(x - 10, y + 3, "#2a241c", 4, 4);
    px(x + 2, y + 3, "#2a241c", 4, 4);
    px(x - 12, y - 1 + bob, "#4a4034", 5, 2);
  }

  function drawGhost(x, y, col) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = col || "#c8e8a0";
    ctx.strokeRect((x | 0) - 6, (y | 0) - 14, 12, 20);
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = col || "#c8e8a0";
    ctx.fillRect((x | 0) - 5, (y | 0) - 13, 10, 18);
    ctx.restore();
  }

  function drawDude(x, y, role, t, armed, look) {
    look = look || {};
    if (look.ghost) {
      drawGhost(x, y, look.cyborg ? "#80ffea" : "#c8e8a0");
      return;
    }
    if (role === "wolf") {
      drawWolf(x, y, t);
      return;
    }
    ctx.save();
    ctx.translate(x | 0, y | 0);
    if (look.scale && look.scale !== 1) ctx.scale(look.scale, look.scale);
    const bob = look.sleep ? 0 : ((t * 8) | 0) % 2;
    const body = look.cyborg
      ? "#4a5a60"
      : role === "crew"
        ? "#2a3848"
        : role === "cop"
          ? "#243a68"
          : role === "sab"
            ? "#1a1814"
            : role === "savage"
              ? "#5a3020"
              : role === "homeless"
                ? "#5a5040"
                : "#8a7a60";
    const skin = look.cyborg ? "#8a9aa0" : role === "crew" ? "#c4a070" : role === "cop" ? "#d0b080" : "#b8a080";
    const hat = look.cyborg ? "#1a2830" : role === "crew" ? "#c8ff3a" : role === "cop" ? "#1a2040" : role === "sab" ? "#0a0a08" : "#4a4030";
    px(-5, -14 + bob, hat, 10, 3);
    px(-4, -12 + bob, skin, 8, 6);
    px(-2, -10 + bob, "#1a120c", 2, 2);
    px(1, -10 + bob, "#1a120c", 2, 2);
    px(-6, -6 + bob, body, 12, 10);
    px(-5, 4, body, 4, 7);
    px(1, 4, body, 4, 7);
    if (role === "cop") px(-1, -4, "#d4a024", 3, 3);
    if (armed || role === "crew" || role === "cop") px(5, -3, look.cyborg ? "#80ffea" : "#222", 8, 2);
    if (role === "sab") px(-5, -15 + bob, "#111", 10, 4);
    if (role === "homeless") {
      px(-7, -7 + bob, "#6a5a38", 14, 8);
      px(-4, 4, "#3a3020", 3, 6);
    }
    if (look.cyborg) {
      px(-4, -11 + bob, "#40c0e0", 8, 3);
      px(4, -16 + bob, "#8ab", 2, 7);
      px(-8, -3 + bob, "#6a7a88", 3, 7);
      px(5, 5, "#3a4a50", 3, 5);
    }
    if (look.sleep) {
      ctx.fillStyle = "#e8e2d4";
      ctx.font = "8px sans-serif";
      ctx.fillText("z", 8, -16);
    }
    ctx.restore();
  }

  function drawFishIcon(x, y, fish, life) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, life);
    const c = (fish.col && fish.col.hex) || "#c8ff3a";
    px(x - 7, y - 3, c, 14, 6);
    px(x + 6, y - 5, c, 4, 4);
    px(x + 6, y + 1, c, 4, 4);
    px(x - 8, y - 1, c, 3, 4);
    px(x + 2, y - 2, "#111", 2, 2);
    ctx.fillStyle = "#e8e2d4";
    ctx.font = "8px sans-serif";
    ctx.fillText((fish.w && fish.w.n) || "", x - 10, y - 8);
    ctx.restore();
  }

  function drawVeh(v) {
    const x = v.x | 0;
    const y = v.y | 0;
    const id = v.def.id;
    const col = v.stolen ? "#6a2020" : "#2a4030";
    const lit = v.stolen ? "#c04030" : "#c8ff3a";
    if (id === "heli") {
      px(x - 16, y - 6, col, 32, 10);
      px(x - 2, y - 14, col, 4, 8);
      px(x - 18, y - 16, lit, 36, 2);
      px(x + 12, y - 4, col, 10, 3);
    } else if (id === "amph") {
      px(x - 18, y - 4, "#1a3040", 36, 8);
      px(x - 16, y - 8, col, 32, 14);
      px(x - 4, y - 14, "#1a2018", 18, 8);
      px(x + 8, y - 12, lit, 14, 3);
      px(x - 18, y + 6, "#2a5060", 8, 5);
      px(x + 10, y + 6, "#2a5060", 8, 5);
    } else if (id === "tank") {
      px(x - 16, y - 6, col, 32, 14);
      px(x - 4, y - 12, "#1a2018", 18, 8);
      px(x + 8, y - 10, lit, 14, 3);
    } else if (id === "bike" || id === "ebike" || id === "moto") {
      px(x - 10, y - 4, col, 20, 6);
      px(x - 8, y + 2, "#111", 4, 4);
      px(x + 5, y + 2, "#111", 4, 4);
      if (id !== "bike") px(x - 2, y - 8, lit, 6, 4);
    } else {
      px(x - 14, y - 8, col, 28, 14);
      px(x - 12, y - 4, "#89a", 6, 4);
      px(x + 4, y - 4, "#89a", 6, 4);
      px(x - 10, y + 6, "#111", 5, 4);
      px(x + 6, y + 6, "#111", 5, 4);
    }
    ctx.fillStyle = "#111";
    ctx.fillRect(x - 12, y + 12, 24, 3);
    ctx.fillStyle = "#c8ff3a";
    ctx.fillRect(x - 12, y + 12, 24 * Math.max(0, v.hp / v.max), 3);
    if (v.stolen) {
      ctx.fillStyle = "#ff6a3d";
      ctx.font = "8px sans-serif";
      ctx.fillText("HOT", x - 8, y - 14);
    }
  }

  function draw() {
    if (state.screen !== "mission") return;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#2a2e24";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#3a3e32";
    for (let y = 0; y < H; y += 24) for (let x = 0; x < W; x += 24) ctx.fillRect(x, y, 22, 22);
    const p = state.pond;
    ctx.fillStyle = "#1a4a54";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.r, p.r * 0.72, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = "#0a2848";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 2, p.r * 0.42, p.r * 0.3, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = "#3a8a9a";
    ctx.beginPath();
    ctx.ellipse(p.x - 8, p.y - 6, p.r * 0.4, p.r * 0.22, 0.3, 0, 7);
    ctx.fill();
    if (state.fence) {
      const f = state.fence;
      ctx.strokeStyle = f.open ? "#3a8a40" : "#80ffea";
      ctx.lineWidth = 2;
      ctx.setLineDash(f.open ? [2, 6] : [4, 3]);
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, f.rx, f.ry, 0, 0, 7);
      ctx.stroke();
      ctx.setLineDash([]);
      const g0 = f.gateAng - f.gateHalf;
      const g1 = f.gateAng + f.gateHalf;
      ctx.strokeStyle = f.open ? "#c8ff3a" : "#ff6a3d";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, f.rx, f.ry, 0, g0, g1);
      ctx.stroke();
      const tp = termPos();
      if (tp) {
        px(tp.x - 6, tp.y - 8, "#111", 12, 14);
        px(tp.x - 4, tp.y - 6, f.open ? "#3a8a40" : "#c8ff3a", 8, 6);
        ctx.fillStyle = "#c8ff3a";
        ctx.font = "8px sans-serif";
        ctx.fillText(f.open ? "OPEN" : "HACK", tp.x - 12, tp.y + 14);
      }
      if (!f.open) {
        ctx.strokeStyle = "rgba(128,255,234,0.5)";
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = state.t * 6 + i * 0.7;
          ctx.moveTo(f.x + Math.cos(a) * f.rx, f.y + Math.sin(a) * f.ry);
          ctx.lineTo(f.x + Math.cos(a + 0.2) * (f.rx - 4), f.y + Math.sin(a + 0.2) * (f.ry - 3));
        }
        ctx.stroke();
      }
    }
    const z = state.extract;
    if (z) {
      ctx.save();
      ctx.strokeStyle = "#c8ff3a";
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 2;
      ctx.strokeRect(z.x - z.w / 2, z.y - z.h / 2, z.w, z.h);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(200,255,58,0.08)";
      ctx.fillRect(z.x - z.w / 2, z.y - z.h / 2, z.w, z.h);
      ctx.fillStyle = "#c8ff3a";
      ctx.font = "10px sans-serif";
      ctx.fillText("EXTRACTION LZ", z.x - 42, z.y - z.h / 2 - 4);
      ctx.restore();
    }
    (state.props || []).forEach((p) => {
      const x = p.x | 0, y = p.y | 0;
      if (p.kind === "hole") {
        px(x - 8, y - 6, "#0a0c08", 16, 12);
        px(x - 6, y - 4, "#1a1c14", 12, 8);
        px(x - 3, y - 2, "#050604", 6, 4);
        ctx.strokeStyle = "#3a3e32";
        ctx.strokeRect(x - 8, y - 6, 16, 12);
      } else if (p.kind === "bench") {
        px(x - 12, y - 4, "#5a4030", 24, 5);
        px(x - 11, y + 1, "#3a2a20", 3, 5);
        px(x + 8, y + 1, "#3a2a20", 3, 5);
        px(x - 12, y - 6, "#6a5040", 24, 3);
      } else if (p.kind === "bush") {
        px(x - 10, y - 6, "#1a3a18", 20, 12);
        px(x - 7, y - 10, "#2a5a24", 14, 10);
        px(x - 4, y - 12, "#3a7a30", 8, 6);
        px(x + 2, y - 8, "#246020", 8, 8);
      }
    });
    if (state.heli) {
      const hv = { x: state.heli.x, y: state.heli.y, def: { id: "heli" }, hp: 1, max: 1, stolen: null };
      drawVeh(hv);
      ctx.strokeStyle = "#c8ff3a";
      const spin = state.t * 18;
      ctx.beginPath();
      ctx.moveTo(state.heli.x + Math.cos(spin) * 18, state.heli.y - 16 + Math.sin(spin) * 3);
      ctx.lineTo(state.heli.x - Math.cos(spin) * 18, state.heli.y - 16 - Math.sin(spin) * 3);
      ctx.stroke();
    }
    for (const b of state.builds) {
      ctx.globalAlpha = 0.4 + b.prog * 0.6;
      if (b.kind === "wall") {
        ctx.fillStyle = "#6a5a48";
        ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
        ctx.fillStyle = "#8a7a60";
        for (let i = 0; i < 4; i++) ctx.fillRect(b.x - b.w / 2 + 2 + i * 7, b.y - 3, 5, 4);
      } else if (b.kind === "counter") {
        ctx.fillStyle = "#8a6238";
        ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
        ctx.fillStyle = "#c4a070";
        ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, 4);
      } else {
        ctx.fillStyle = "#d4a024";
        ctx.fillRect(b.x - 8, b.y - 8, 16, 12);
        ctx.fillStyle = "#222";
        ctx.fillRect(b.x - 4, b.y - 5, 8, 5);
        ctx.fillStyle = "#c8ff3a";
        ctx.fillRect(b.x + 3, b.y - 3, 2, 2);
      }
      ctx.globalAlpha = 1;
      if (!b.done) {
        ctx.fillStyle = "#111";
        ctx.fillRect(b.x - 12, b.y + 14, 24, 3);
        ctx.fillStyle = "#c8ff3a";
        ctx.fillRect(b.x - 12, b.y + 14, 24 * Math.min(1, b.prog), 3);
      }
    }

    if (state.buildPick && !state.box) {
      const mx = state.mouse.x;
      const my = state.mouse.y;
      ctx.globalAlpha = 0.4;
      if (state.buildPick === "register") {
        const c = counterAt(mx, my);
        ctx.fillStyle = c ? "#c8ff3a" : "#ff6a3d";
        ctx.fillRect((c ? c.x : mx) - 8, (c ? c.y - 10 : my) - 8, 16, 12);
      } else if (state.buildPick === "counter") {
        ctx.fillStyle = "#c4a070";
        ctx.fillRect(mx - 22, my - 7, 44, 14);
      } else {
        ctx.fillStyle = "#8a7a60";
        ctx.fillRect(mx - 15, my - 6, 30, 12);
      }
      ctx.globalAlpha = 1;
    }

    (state.vehs || []).forEach((v) => {
      drawVeh(v);
      if (!isAmph(v) || v.stolen) return;
      const riders = state.units.filter((u) => u.crew.hp > 0 && u.veh === v && !u.extracted);
      riders.forEach((u, i) => {
        const ox = v.x - 10 + (i % 3) * 10;
        const oy = v.y - 16 - Math.floor(i / 3) * 8;
        drawDude(ox, oy, "crew", state.t, true, {
          cyborg: !!u.crew.bionics,
          scale: u.crew.bionics ? 1.2 : 1,
        });
      });
    });
    for (const m of state.mobs) {
      if (m.vis === 0) continue;
      const ghost = inBush(m.x, m.y);
      drawDude(m.x, m.y, m.role, state.t, m.armed, { ghost, sleep: !!m.sleeping });
      if (m.role === "cop" && !ghost) {
        ctx.fillStyle = "#3a5a9a";
        ctx.fillRect(m.x + 4, m.y - 3, 7, 2);
      }
      if (m.bang > 0) {
        ctx.fillStyle = "#ff6a3d";
        ctx.font = "bold 14px sans-serif";
        ctx.fillText("!", m.x - 3, m.y - 20);
      }
    }
    for (const s of state.shots) {
      ctx.fillStyle = s.laser ? "#80ffea" : "#f0e0a0";
      ctx.fillRect(s.x - 1, s.y - 1, s.laser ? 5 : 3, 2);
    }
    for (const u of state.units) {
      if (u.crew.hp <= 0) continue;
      if (u.extracted) continue;
      if (u.veh && isAmph(u.veh)) {
        if (u.fish && u.fish.phase === "bite") {
          const bw = 34;
          const bh = 7;
          const gw = Math.max(4, bw * catchWin(u) * 2);
          ctx.fillStyle = "#111";
          ctx.fillRect(u.x - bw / 2, u.y - 36, bw, bh);
          ctx.fillStyle = "#c8ff3a";
          ctx.fillRect(u.x - gw / 2, u.y - 36, gw, bh);
          ctx.fillStyle = "#fff";
          ctx.fillRect(u.x - bw / 2 + bw * u.fish.mark - 1, u.y - 37, 3, bh + 2);
        }
        continue;
      }
      if (u.veh) continue;
      if (u.sel) {
        ctx.strokeStyle = "#c8ff3a";
        ctx.strokeRect(u.x - 11, u.y - 18, 22, 24);
      }
      const ghost = inBush(u.x, u.y);
      drawDude(u.x, u.y, "crew", state.t, true, {
        ghost,
        cyborg: !!u.crew.bionics,
        scale: u.crew.bionics ? 1.2 : 1,
      });
      if (!ghost) {
      ctx.font = "8px sans-serif";
      ctx.textAlign = "center";
      const nm = (u.crew.name || "crew").split(" ")[0];
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#111";
      ctx.strokeText(nm, u.x, u.y - 22);
      ctx.fillStyle = "#e8e2d4";
      ctx.fillText(nm, u.x, u.y - 22);
      ctx.fillStyle = "#111";
      ctx.fillRect(u.x - 10, u.y + 11, 20, 3);
      ctx.fillStyle = "#c44";
      ctx.fillRect(u.x - 10, u.y + 11, 20 * (u.crew.hp / u.crew.max), 3);
      const cap = carryCap(u.crew);
      const n = (u.carry && u.carry.length) || 0;
      ctx.fillStyle = "#c8ff3a";
      ctx.fillText(n + "/" + cap, u.x, u.y + 22);
      ctx.textAlign = "left";
      }
      if (u.catchShow && u.catchShow.fish) drawFishIcon(u.x, u.y - 28, u.catchShow.fish, u.catchShow.t);
      if (u.fish && u.fish.phase === "bite") {
        const bw = 34;
        const bh = 7;
        const gw = Math.max(4, bw * catchWin(u) * 2);
        ctx.fillStyle = "#111";
        ctx.fillRect(u.x - bw / 2, u.y - 30, bw, bh);
        ctx.fillStyle = "#c8ff3a";
        ctx.fillRect(u.x - gw / 2, u.y - 30, gw, bh);
        ctx.fillStyle = "#fff";
        ctx.fillRect(u.x - bw / 2 + bw * u.fish.mark - 1, u.y - 31, 3, bh + 2);
      }
    }
    (state.props || []).forEach((p) => {
      if (p.kind !== "bush") return;
      const x = p.x | 0, y = p.y | 0;
      ctx.globalAlpha = 0.5;
      px(x - 9, y - 8, "#2a5a24", 18, 12);
      px(x - 5, y - 12, "#3a7a30", 10, 8);
      ctx.globalAlpha = 1;
    });
    if (state.box) {
      const x = Math.min(state.box.x0, state.box.x1);
      const y = Math.min(state.box.y0, state.box.y1);
      const bw = Math.abs(state.box.x1 - state.box.x0);
      const bh = Math.abs(state.box.y1 - state.box.y0);
      ctx.strokeStyle = "#c8ff3a";
      ctx.globalAlpha = 0.9;
      ctx.strokeRect(x, y, bw, bh);
      ctx.fillStyle = "rgba(200,255,58,0.12)";
      ctx.fillRect(x, y, bw, bh);
      ctx.globalAlpha = 1;
    }
    ctx.font = "10px sans-serif";
    for (const f of floats) {
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = "#c8ff3a";
      ctx.fillText(f.t, f.x - 10, f.y);
      ctx.globalAlpha = 1;
    }
  }

  let last = 0;
  function loop(ms) {
    const dt = Math.min(0.05, (ms - last) / 1000 || 0.016);
    last = ms;
    if (state.screen === "sky") {
      updateSky(dt);
      drawSky();
    } else {
      update(dt);
      draw();
      tickLiveMarket(dt);
    }
    requestAnimationFrame(loop);
  }

  function countSp(sp) {
    return (state.fishInv || []).filter((f) => f.sp === sp).length;
  }

  function applyImpact(sp, qty, sell) {
    const m = state.market[sp];
    if (!m) return;
    const stock = countSp(sp);
    if (stock <= m.vol) return;
    const ratio = qty / Math.max(1, m.vol);
    m.mul = clamp(m.mul * (1 + (sell ? -0.05 : 0.05) * ratio), 0.25, 4);
  }

  function chgOf(m) {
    if (!m.candles || m.candles.length < 2) return 0;
    const a = m.candles[0].c;
    const b = m.candles[m.candles.length - 1].c;
    return ((b - a) / a) * 100;
  }

  function drawMarketChart() {
    const cv = document.getElementById("mktChart");
    if (!cv) return;
    const c = cv.getContext("2d");
    const W = cv.width;
    const H = cv.height;
    c.fillStyle = "#0a0d12";
    c.fillRect(0, 0, W, H);
    const sp = state.mktSp || SPECIES[0];
    const m = seedChart(sp);
    const all = m.candles;
    if (!all.length) return;
    const nShow = clamp(state.mktBars || 48, 12, all.length);
    const bars = all.slice(all.length - nShow);
    const rsi = rsiArr(bars, 14);
    const closes = bars.map((b) => b.c);
    const ma7 = sma(closes, 7);
    const ma25 = sma(closes, 25);
    const ema12 = sma(closes, 12);
    const ich = ichimoku(bars);
    const padL = 8;
    const padR = 52;
    const volH = 54;
    const rsiH = 62;
    const top = 8;
    const chartH = H - volH - rsiH - 18;
    const n = bars.length;
    const cw = (W - padL - padR) / n;
    let lo = 1e9;
    let hi = -1e9;
    bars.forEach((b, i) => {
      lo = Math.min(lo, b.l, ich.sa[i] || b.l, ich.sb[i] || b.l);
      hi = Math.max(hi, b.h, ich.sa[i] || b.h, ich.sb[i] || b.h);
    });
    const span = Math.max(0.5, hi - lo) * 1.06;
    const yx = (p) => top + chartH * (1 - (p - lo) / span);
    c.strokeStyle = "#1c2430";
    c.lineWidth = 1;
    for (let g = 0; g < 5; g++) {
      const y = top + (chartH * g) / 4;
      c.beginPath();
      c.moveTo(padL, y);
      c.lineTo(W - padR, y);
      c.stroke();
      c.fillStyle = "#5a6578";
      c.font = "9px sans-serif";
      c.fillText((hi - (span * g) / 4).toFixed(1), W - padR + 4, y + 3);
    }
    for (let i = 1; i < n; i++) {
      const x = padL + i * cw;
      const a = ich.sa[i];
      const b = ich.sb[i];
      const ap = ich.sa[i - 1];
      const bp = ich.sb[i - 1];
      if (a == null || b == null || ap == null || bp == null) continue;
      c.fillStyle = a > b ? "rgba(61,214,140,0.14)" : "rgba(255,106,61,0.14)";
      c.beginPath();
      c.moveTo(x - cw, yx(ap));
      c.lineTo(x, yx(a));
      c.lineTo(x, yx(b));
      c.lineTo(x - cw, yx(bp));
      c.closePath();
      c.fill();
    }
    function strokeLine(arr, col, w) {
      c.strokeStyle = col;
      c.lineWidth = w || 1.2;
      c.beginPath();
      let on = false;
      for (let i = 0; i < n; i++) {
        if (arr[i] == null) {
          on = false;
          continue;
        }
        const x = padL + i * cw + cw * 0.5;
        const y = yx(arr[i]);
        if (!on) {
          c.moveTo(x, y);
          on = true;
        } else c.lineTo(x, y);
      }
      c.stroke();
    }
    strokeLine(ich.sa, "rgba(80,180,220,0.7)", 1);
    strokeLine(ich.sb, "rgba(200,140,60,0.7)", 1);
    strokeLine(ich.tenkan, "#e8c040", 1);
    strokeLine(ich.kijun, "#c050ff", 1);
    strokeLine(ma7, "#c8ff3a", 1.4);
    strokeLine(ma25, "#4ad2ff", 1.4);
    strokeLine(ema12, "#ff8ad4", 1);
    let maxV = 1;
    bars.forEach((b) => {
      if (b.v > maxV) maxV = b.v;
    });
    for (let i = 0; i < n; i++) {
      const b = bars[i];
      const x = padL + i * cw;
      const up = b.c >= b.o;
      c.fillStyle = up ? "#3dd68c" : "#ff6a3d";
      const y1 = yx(b.h);
      const y2 = yx(b.l);
      c.fillRect(x + cw * 0.45, y1, Math.max(1, cw * 0.1), Math.max(1, y2 - y1));
      const yo = yx(Math.max(b.o, b.c));
      const yc = yx(Math.min(b.o, b.c));
      c.fillRect(x + cw * 0.18, yo, Math.max(1.2, cw * 0.64), Math.max(1, yc - yo));
      const vh = (b.v / maxV) * (volH - 8);
      c.globalAlpha = 0.7;
      c.fillRect(x + cw * 0.2, H - rsiH - 6 - vh, Math.max(1, cw * 0.6), vh);
      c.globalAlpha = 1;
    }
    const rsiTop = H - rsiH;
    c.fillStyle = "#10141c";
    c.fillRect(0, rsiTop, W, rsiH);
    c.strokeStyle = "#2a3140";
    c.strokeRect(padL, rsiTop + 4, W - padL - padR, rsiH - 10);
    [30, 50, 70].forEach((lv) => {
      const y = rsiTop + 4 + (rsiH - 10) * (1 - lv / 100);
      c.strokeStyle = lv === 50 ? "#3a4458" : "#5a3040";
      c.beginPath();
      c.moveTo(padL, y);
      c.lineTo(W - padR, y);
      c.stroke();
    });
    c.strokeStyle = "#d0d6ff";
    c.lineWidth = 1.2;
    c.beginPath();
    let on = false;
    for (let i = 0; i < n; i++) {
      if (rsi[i] == null) continue;
      const x = padL + i * cw + cw * 0.5;
      const y = rsiTop + 4 + (rsiH - 10) * (1 - rsi[i] / 100);
      if (!on) {
        c.moveTo(x, y);
        on = true;
      } else c.lineTo(x, y);
    }
    c.stroke();
    const last = bars[n - 1];
    const lastR = rsi[n - 1];
    c.fillStyle = "#e8e2d4";
    c.font = "11px sans-serif";
    c.fillText(
      sp +
        "  O " +
        last.o.toFixed(2) +
        "  H " +
        last.h.toFixed(2) +
        "  L " +
        last.l.toFixed(2) +
        "  C " +
        last.c.toFixed(2) +
        "  Vol " +
        last.v +
        (lastR != null ? "  RSI " + lastR.toFixed(1) : "") +
        "  Ichimoku  ·  " +
        nShow +
        " bars (wheel zoom)",
      padL,
      12
    );
    bars.forEach((b, i) => {
      if (!b.event) return;
      const x = padL + i * cw;
      c.fillStyle = b.event === "clr" ? "#ff6a3d" : "#c8ff3a";
      c.font = "9px sans-serif";
      c.fillText(b.event === "clr" ? "CLR" : "SPOT", x, Math.max(22, yx(b.h) - 6));
    });
  }

  function renderBookOnly() {
    const m = seedChart(state.mktSp || SPECIES[0]);
    const book = document.getElementById("mktBook");
    const quote = document.getElementById("mktQuote");
    const tape = document.getElementById("mktTape");
    if (!book || !m.bids) return;
    const last = m.candles[m.candles.length - 1];
    const chg = chgOf(m);
    const rsi = rsiArr(m.candles, 14);
    const lastR = rsi[rsi.length - 1];
    if (quote)
      quote.innerHTML =
        "<b>" +
        (state.mktSp || "") +
        "</b><br>Last $" +
        last.c.toFixed(2) +
        " <span class='" +
        (chg >= 0 ? "up" : "dn") +
        "'>" +
        (chg >= 0 ? "+" : "") +
        chg.toFixed(2) +
        "%</span><br>Spread $" +
        (m.spread || 0).toFixed(2) +
        " · Liq " +
        (m.liq || 0) +
        " lots<br>RSI(14) " +
        (lastR != null ? lastR.toFixed(1) : "—") +
        " · MA7 " +
        (function () {
          const v = sma(
            m.candles.map((b) => b.c),
            7
          ).slice(-1)[0];
          return v != null ? v.toFixed(2) : "—";
        })() +
        "<br>Depth " +
        m.bids.length +
        "×" +
        m.asks.length +
        " · 24h vol " +
        m.candles.reduce((s, b) => s + b.v, 0) +
        "<br><b>You hold " +
        countSp(state.mktSp) +
        "</b> " +
        (state.mktSp || "") +
        (countSp(state.mktSp) ? " · can sell" : " · none to sell");
    const maxQ = Math.max(1, ...m.bids.map((x) => x.q), ...m.asks.map((x) => x.q));
    const askRows = m.asks
      .slice()
      .reverse()
      .slice(0, 10)
      .map((a) => {
        const w = (a.q / maxQ) * 100;
        return (
          "<div class='book-row ask'><span class='bar' style='width:" +
          w +
          "%'></span><span>" +
          a.p.toFixed(2) +
          "</span><span>" +
          a.q +
          "</span><span>" +
          (a.p * a.q).toFixed(0) +
          "</span></div>"
        );
      })
      .join("");
    const bidRows = m.bids
      .slice(0, 10)
      .map((a) => {
        const w = (a.q / maxQ) * 100;
        return (
          "<div class='book-row bid'><span class='bar' style='width:" +
          w +
          "%'></span><span>" +
          a.p.toFixed(2) +
          "</span><span>" +
          a.q +
          "</span><span>" +
          (a.p * a.q).toFixed(0) +
          "</span></div>"
        );
      })
      .join("");
    book.innerHTML =
      "<div class='book-row'><span>PRICE</span><span>SIZE</span><span>NOTIONAL</span></div>" +
      askRows +
      "<div class='book-mid'>BBO $" +
      last.c.toFixed(2) +
      " · spread " +
      (m.spread || 0).toFixed(2) +
      "</div>" +
      bidRows;
    if (tape)
      tape.innerHTML = (m.tape || [])
        .slice(0, 8)
        .map((t) => (t.side === "buy" ? "▲" : "▼") + " " + t.q + " @ $" + t.px)
        .join(" · ") || "prints wait for a fill";
  }

  function renderMarket() {
    bootEconomy();
    if (!state.mktSp) state.mktSp = SPECIES[0];
    SPECIES.forEach((s) => seedChart(s));
    const listSp = SPECIES.slice();
    if (state.mktSort) listSp.sort((a, b) => countSp(b) - countSp(a) || a.localeCompare(b));
    const deals = document.getElementById("marketDeals");
    deals.textContent =
      "SPOT " + dealLabel(state.deals.on) + " +50% · CLR " + dealLabel(state.deals.off) + " −50%  ·  candles · SMA7/25 · EMA12 · RSI14 · Ichimoku";
    const list = document.getElementById("mktList");
    list.innerHTML = "";
    listSp.forEach((sp) => {
      const m = seedChart(sp);
      const chg = chgOf(m);
      const last = m.candles[m.candles.length - 1];
      const el = document.createElement("div");
      el.className = "term-sp" + (sp === state.mktSp ? " on" : "");
      el.innerHTML =
        "<span>" +
        sp +
        " <i class='have'>x" +
        countSp(sp) +
        "</i></span><span class='chg " +
        (chg >= 0 ? "up" : "dn") +
        "'>$" +
        last.c.toFixed(1) +
        " " +
        (chg >= 0 ? "+" : "") +
        chg.toFixed(1) +
        "%</span>";
      el.onclick = () => {
        state.mktSp = sp;
        renderMarket();
      };
      list.appendChild(el);
    });
    const acts = document.getElementById("mktActs");
    const sp = state.mktSp;
    const m = seedChart(sp);
    const px = fishValue(sampleFish(sp));
    const stock = countSp(sp);
    acts.innerHTML = "";
    const mkb = (label, fn) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.onclick = fn;
      acts.appendChild(b);
    };
    mkb("BUY 1  $" + px, () => {
      if (state.cash < px) return;
      state.cash -= px;
      state.fishInv.push(sampleFish(sp));
      applyImpact(sp, 1, false);
      tapeAdd(sp, "buy", px, 1);
      const last = m.candles[m.candles.length - 1];
      last.c *= 1.012;
      last.h = Math.max(last.h, last.c);
      last.v += 1;
      refreshBook(m);
      sfx("hire");
      renderPlan();
      renderMarket();
    });
    mkb("SELL 1", () => {
      const i = state.fishInv.findIndex((f) => f.sp === sp);
      if (i < 0) return;
      const f = state.fishInv.splice(i, 1)[0];
      const got = takeCuts(fishValue(f));
      state.cash += got;
      applyImpact(sp, 1, true);
      tapeAdd(sp, "sell", got, 1);
      const last = m.candles[m.candles.length - 1];
      last.c *= 0.988;
      last.l = Math.min(last.l, last.c);
      last.v += 1;
      refreshBook(m);
      sfx("sell");
      renderPlan();
      renderMarket();
    });
    mkb("BUY VOL " + m.vol, () => {
      const n = m.vol;
      const cost = n * px;
      if (state.cash < cost) return;
      state.cash -= cost;
      for (let k = 0; k < n; k++) state.fishInv.push(sampleFish(sp));
      applyImpact(sp, n, false);
      tapeAdd(sp, "buy", px, n);
      sfx("hire");
      renderPlan();
      renderMarket();
    });
    mkb("SELL VOL", () => {
      const n = Math.min(countSp(sp), m.vol);
      if (!n) return;
      let got = 0;
      for (let k = 0; k < n; k++) {
        const i = state.fishInv.findIndex((f) => f.sp === sp);
        if (i < 0) break;
        got += takeCuts(fishValue(state.fishInv.splice(i, 1)[0]));
      }
      state.cash += got;
      applyImpact(sp, n, true);
      tapeAdd(sp, "sell", got / n, n);
      sfx("sell");
      renderPlan();
      renderMarket();
    });
    const have = document.createElement("div");
    have.style.cssText = "grid-column:1/-1;font-size:10px;color:#9aa3b0;text-align:center";
    have.textContent =
      "Inventory " +
      stock +
      " " +
      sp +
      " · warehouse total " +
      (state.fishInv || []).length +
      " · book updates every few seconds";
    acts.appendChild(have);
    drawMarketChart();
    renderBookOnly();
    showPanel("panel-market");
  }

  function renderGarage() {
    const own = document.getElementById("garageOwn");
    const buy = document.getElementById("garageBuy");
    const hint = document.getElementById("garageHint");
    const counts = {};
    (state.garage || []).forEach((g) => (counts[g.id] = (counts[g.id] || 0) + 1));
    hint.textContent = (state.garage || []).length
      ? "Crew deploys already mounted. Hostiles wreck undefended rides. Saboteurs steal them. Amphibious tank can fish the dark hole."
      : "On foot. Buy a bike to start the chain.";
    own.innerHTML = "";
    VEHS.forEach((v) => {
      if (!counts[v.id]) return;
      own.appendChild(gearCard(v.icon, v.n, "owned " + counts[v.id] + " · " + v.seats + " seats", false, null));
    });
    buy.innerHTML = "";
    VEHS.forEach((v, i) => {
      const locked = i > state.vehUnlock;
      buy.appendChild(
        gearCard(
          v.icon,
          v.n,
          "$" + v.cost + " · " + v.seats + " seats" + (v.atk ? " · " + v.atk : "") + (locked ? " · LOCKED" : ""),
          locked,
          locked
            ? null
            : () => {
                if (state.cash < v.cost) return;
                state.cash -= v.cost;
                state.garage.push({ id: v.id, hp: v.hp });
                if (i === state.vehUnlock && state.vehUnlock < VEHS.length - 1) state.vehUnlock += 1;
                sfx("hire");
                renderGarage();
                renderPlan();
              }
        )
      );
    });
    showPanel("panel-garage");
  }

  function renderStock() {
    if (!state.listed) state.listed = initListed();
    const box = document.getElementById("stockBox");
    box.innerHTML = "";
    const mk = (title, keys, bag) => {
      const fs = document.createElement("fieldset");
      const lg = document.createElement("legend");
      lg.textContent = title;
      fs.appendChild(lg);
      keys.forEach((k) => {
        const lb = document.createElement("label");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = !!bag[k];
        cb.onchange = () => (bag[k] = cb.checked);
        lb.appendChild(cb);
        lb.appendChild(document.createTextNode(" " + k));
        fs.appendChild(lb);
      });
      box.appendChild(fs);
    };
    mk("Species", SPECIES, state.listed.sp);
    mk("Color", COLORS.map((c) => c.n), state.listed.col);
    mk("Weight", WEIGHTS.map((w) => w.n), state.listed.w);
    showPanel("panel-stock");
  }

  document.getElementById("startBtn").onclick = () => {
    audio();
    startPlan();
  };
  document.getElementById("howBtn").onclick = () => showPanel("panel-how");
  document.getElementById("howBack").onclick = () => showPanel("panel-main");
  document.getElementById("hireBtn").onclick = () => openHire();
  function openHire() {
    if ((state.hiredThisJob || 0) >= 3) return;
    if (!state.hirePool || !state.hirePool.length) rollHirePool();
    const left = state.hirePool;
    document.getElementById("hireHint").textContent =
      left.length === 1
        ? "Last face in the alley. Take them or walk."
        : "Pick one. " + (3 - (state.hiredThisJob || 0)) + " hires left this job.";
    const grid = document.getElementById("hireGrid");
    grid.innerHTML = "";
    left.forEach((c) => {
      const el = document.createElement("div");
      el.className = "hire-card";
      el.innerHTML =
        '<div class="port-wrap"><img class="port" src="' +
        c.portrait +
        '" alt="" /><span class="cut-badge">' +
        (c.cut * 100).toFixed(2) +
        '%</span></div><h3>' +
        c.name +
        '</h3><div class="quote">“' +
        c.quote +
        '”</div><div class="stats">' +
        skLine(c) +
        '</div><div class="cost">$' +
        c.hireCost +
        " · net $0</div>";
      el.onclick = () => {
        if (state.cash < c.hireCost) return;
        state.cash -= c.hireCost;
        state.crew.push(c);
        state.sel = c.id;
        state.hirePool = state.hirePool.filter((x) => x !== c);
        state.hiredThisJob = (state.hiredThisJob || 0) + 1;
        sfx("hire");
        hideOverlay();
        renderPlan();
      };
      grid.appendChild(el);
    });
    showPanel("panel-hire");
  }
  document.getElementById("hireBack").onclick = () => {
    hideOverlay();
    renderPlan();
  };

  function hackScale(h) {
    const hack = clamp(h | 0, 1, 12);
    if (hack >= 12) return { rounds: 0, letters: 0 };
    const t = (hack - 1) / 10;
    return {
      rounds: Math.max(1, Math.round(3 - t * 2)),
      letters: Math.max(3, Math.round(5 - t * 2)),
    };
  }

  function paintHackGlyphs() {
    const h = state.hack;
    const cv = document.getElementById("hackCv");
    if (!h || !cv) return;
    const c = cv.getContext("2d");
    const n = h.code.length;
    c.fillStyle = "#0a0c10";
    c.fillRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < n; i++) {
      c.save();
      c.translate(24 + i * (n > 4 ? 38 : 48), 40 + Math.sin(i * 2) * 6);
      c.rotate((Math.random() - 0.5) * 0.5);
      c.fillStyle = i % 2 ? "#c8ff3a" : "#80ffea";
      c.font = "bold 28px monospace";
      c.fillText(h.code[i], 0, 0);
      c.restore();
    }
    c.strokeStyle = "rgba(200,255,58,0.25)";
    for (let i = 0; i < 8; i++) {
      c.beginPath();
      c.moveTo(0, Math.random() * 80);
      c.lineTo(280, Math.random() * 80);
      c.stroke();
    }
  }

  function nextHackRound() {
    const alphabet = "A3B7DEHKMNPRSTY";
    let code = "";
    for (let i = 0; i < state.hack.letters; i++) code += alphabet[(Math.random() * alphabet.length) | 0];
    state.hack.code = code;
    paintHackGlyphs();
    document.getElementById("hackIn").value = "";
    const who = state.hack.who;
    document.getElementById("hackHint").textContent =
      (who ? who + " hacks. " : "") +
      "Captcha " +
      (state.hack.done + 1) +
      "/" +
      state.hack.need +
      " · " +
      state.hack.letters +
      " glyphs · tries " +
      state.hack.tries;
  }

  function openGate(who) {
    if (!state.fence) return;
    state.fence.open = true;
    state.hack = null;
    if (who) gainXp(who, 12);
    sfx("win");
    hideOverlay();
    const tp = termPos();
    if (tp) float(tp.x, tp.y - 12, "GATE OPEN");
    state.units.forEach((u) => {
      if (u.job === "hack") u.job = "move";
      if (u.job === "fish") {
        const shore = nearestWater(u);
        u.tx = shore.x;
        u.ty = shore.y;
        if (u.veh && isAmph(u.veh)) {
          u.veh.tx = shore.x;
          u.veh.ty = shore.y;
        }
      }
    });
  }

  function startHack(u) {
    if (state.fence && state.fence.open) return;
    if (state.hack && document.getElementById("overlay").classList.contains("show") && !document.getElementById("panel-hack").classList.contains("hidden")) return;
    const who = u || selected()[0] || state.units.find((x) => x.crew.hp > 0);
    const hack = who && who.crew ? clamp(who.crew.hack, 1, 12) : 1;
    if (hack >= 12) {
      openGate(who && who.crew);
      return;
    }
    const sc = hackScale(hack);
    state.hack = {
      need: sc.rounds,
      done: 0,
      letters: sc.letters,
      tries: 2 + Math.min(4, hack | 0),
      who: who ? who.crew.name.split(" ")[0] : "",
      crew: who && who.crew,
    };
    nextHackRound();
    showPanel("panel-hack");
  }
  document.getElementById("hackGo").onclick = () => {
    if (!state.hack || !state.fence) return;
    const v = (document.getElementById("hackIn").value || "").toUpperCase().replace(/\s/g, "");
    if (v === state.hack.code) {
      state.hack.done += 1;
      sfx("catch");
      if (state.hack.done >= state.hack.need) openGate(state.hack.crew);
      else nextHackRound();
    } else {
      state.hack.tries -= 1;
      sfx("fail");
      if (state.hack.tries <= 0) {
        hideOverlay();
        const tp = termPos();
        if (tp) float(tp.x, tp.y - 12, "LOCKOUT");
      } else document.getElementById("hackHint").textContent = "Wrong. Tries " + state.hack.tries + ".";
    }
  };
  document.getElementById("hackBack").onclick = () => hideOverlay();
  document.getElementById("goBtn").onclick = deploy;
  document.getElementById("marketBtn").onclick = () => renderMarket();
  const mktChart = document.getElementById("mktChart");
  if (mktChart) {
    mktChart.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const allN = (state.market && state.market[state.mktSp] && state.market[state.mktSp].candles && state.market[state.mktSp].candles.length) || 80;
        const step = e.deltaY > 0 ? 10 : -10;
        state.mktBars = clamp((state.mktBars || 48) + step, 12, Math.max(12, allN));
        drawMarketChart();
      },
      { passive: false }
    );
  }
  document.getElementById("mktSort").onclick = () => {
    state.mktSort = !state.mktSort;
    document.getElementById("mktSort").textContent = state.mktSort ? "SORTED BY STOCK" : "SORT BY STOCK";
    renderMarket();
  };
  document.getElementById("garageBtn").onclick = () => renderGarage();
  document.getElementById("stockBtn").onclick = () => renderStock();
  document.getElementById("marketBack").onclick = () => {
    hideOverlay();
    renderPlan();
  };
  document.getElementById("garageBack").onclick = () => {
    hideOverlay();
    renderPlan();
  };
  document.getElementById("stockBack").onclick = () => {
    hideOverlay();
    renderPlan();
  };
  document.getElementById("shopBtn").onclick = () => {
    const me = state.crew.find((c) => c.id === state.sel) || state.crew[0];
    if (me) openShop(me);
  };
  document.getElementById("shopBack").onclick = () => {
    hideOverlay();
    renderPlan();
  };
  document.getElementById("overBtn").onclick = () => {
    hideOverlay();
    document.getElementById("mission").classList.add("hidden");
    document.getElementById("plan").classList.remove("hidden");
    state.screen = "plan";
    startBgm("plan");
    rollHirePool();
    renderPlan();
    renderLiq();
  };

  const TRANCHES = [
    { id: "cd", n: "3Y CD", years: 3, lo: 1.25, hi: 1.333, blurb: "3 job-years" },
    { id: "t10", n: "10Y T", years: 10, lo: 2, hi: 2.667, blurb: "10 job-years" },
    { id: "c30", n: "30Y AAA", years: 30, lo: 5, hi: 6.667, blurb: "30 job-years" },
  ];

  function renderLiq() {
    const strip = document.getElementById("liqStrip");
    if (!strip) return;
    strip.classList.toggle("show", state.screen === "plan");
    const rates = document.getElementById("liqRates");
    if (rates)
      rates.textContent =
        "APY " + fmtPct(state.rate) + " · OD " + fmtPct(state.debtRate);
    const box = document.getElementById("liqTiers");
    if (box) {
      box.innerHTML = "";
      TRANCHES.forEach((tr) => {
        const el = document.createElement("div");
        el.className = "liq-card";
        el.innerHTML =
          "<b title='" +
          tr.blurb +
          "'>" +
          tr.n +
          "</b><span>" +
          fmtPct(state.rate * tr.lo) +
          "–" +
          fmtPct(state.rate * tr.hi) +
          "</span><input type='number' min='1' step='10' placeholder='$' /><button type='button'>+</button>";
        const inp = el.querySelector("input");
        el.querySelector("button").onclick = (e) => {
          e.stopPropagation();
          const n = Math.floor(+inp.value);
          if (!(n > 0) || state.cash < n || state.screen !== "plan") return;
          state.cash -= n;
          const mul = tr.lo + Math.random() * (tr.hi - tr.lo);
          state.lots.push({
            id: tr.id,
            n: tr.n,
            amt: n,
            rate: state.rate * mul,
            left: tr.years,
            years: tr.years,
          });
          sfx("hire");
          paintCash();
          renderLiq();
        };
        box.appendChild(el);
      });
    }
    const lots = document.getElementById("liqLots");
    if (lots) {
      lots.textContent = (state.lots || []).length
        ? state.lots.map((l) => l.n + " $" + Math.round(l.amt) + " " + l.left + "y").join(" · ")
        : "no lots";
    }
  }

  document.getElementById("cashBox").onclick = () => {
    if (state.screen === "plan") {
      const inp = document.querySelector("#liqTiers input");
      if (inp) inp.focus();
    }
  };
  const bankBack = document.getElementById("bankBack");
  if (bankBack)
    bankBack.onclick = () => {
      hideOverlay();
      renderPlan();
    };
  function renderBags() {
    const me = state.crew.find((c) => c.id === state.sel) || state.crew[0];
    const who = document.getElementById("bagsWho");
    if (who)
      who.textContent = me
        ? me.name + " · hands 5 · now " + carryCap(me) + (me.bag ? " with " + me.bag.n : "") + " · $" + state.cash
        : "Select crew.";
    const grid = document.getElementById("bagsGrid");
    grid.innerHTML = "";
    BAGS.forEach((b) => {
      const el = document.createElement("div");
      el.className = "buy";
      el.innerHTML = "<b>" + b.n + "</b><br>+" + b.extra + " fish · $" + b.cost + (me && me.bag && me.bag.id === b.id ? "<br>EQUIPPED" : "");
      el.onclick = () => {
        if (!me || state.cash < b.cost) return;
        state.cash -= b.cost;
        me.bag = { id: b.id, n: b.n, extra: b.extra };
        sfx("hire");
        renderBags();
        renderPlan();
      };
      grid.appendChild(el);
    });
    showPanel("panel-bags");
  }

  document.getElementById("bagsBtn").onclick = () => renderBags();
  document.getElementById("bagsBack").onclick = () => {
    hideOverlay();
    renderPlan();
  };
  document.getElementById("extractBtn").onclick = () => {
    state.evac = true;
    const who = state.units.filter((u) => u.crew.hp > 0 && !u.extracted);
    who.forEach((u) => {
      u.job = "extract";
      if (u.veh) u.veh = null;
      u.tx = state.extract.x;
      u.ty = state.extract.y;
    });
    sfx("click");
    float(state.extract.x, state.extract.y - 20, "EXTRACT · ALL LIVING");
  };
  document.querySelectorAll("#orders [data-order]").forEach((b) => {
    b.onclick = () => {
      const order = b.dataset.order;
      if (order === "build") {
        const menu = document.getElementById("buildMenu");
        const open = menu.classList.contains("hidden");
        menu.classList.toggle("hidden", !open);
        if (!open) {
          state.buildPick = null;
          document.querySelectorAll("#buildMenu [data-build]").forEach((x) => x.classList.remove("on"));
        }
        state.order = "build";
      } else {
        document.getElementById("buildMenu").classList.add("hidden");
        state.buildPick = null;
        state.order = order;
        if (order === "fish" || order === "sell" || order === "fight" || order === "board" || order === "dismount" || order === "hack") {
          if (order === "board" || order === "dismount") {
            const u0 = selected()[0];
            issueMove(u0 ? u0.x : 0, u0 ? u0.y : 0, order);
          } else {
            selected().forEach((u) => {
              u.job = order;
              if (order === "fish") {
                u.fish = null;
                const shore = nearestWater(u);
                if (u.veh && isAmph(u.veh)) {
                  u.veh.tx = shore.x;
                  u.veh.ty = shore.y;
                  u.tx = shore.x;
                  u.ty = shore.y;
                } else {
                  if (u.veh) u.veh = null;
                  u.tx = shore.x;
                  u.ty = shore.y;
                }
              }
              if (order === "hack") {
                const tp = termPos();
                if (tp) {
                  u.tx = tp.x;
                  u.ty = tp.y;
                  if (u.veh) {
                    u.veh.tx = tp.x;
                    u.veh.ty = tp.y;
                  }
                }
              }
            });
          }
        }
      }
      document.querySelectorAll("#orders [data-order]").forEach((x) => x.classList.toggle("on", x === b));
    };
  });
  document.querySelectorAll("#buildMenu [data-build]").forEach((b) => {
    b.onclick = () => {
      state.buildPick = b.dataset.build;
      state.order = "build";
      document.querySelectorAll("#buildMenu [data-build]").forEach((x) => x.classList.toggle("on", x === b));
      sfx("click");
    };
  });

  requestAnimationFrame(loop);
  window.FE = state;

  (function bootSplash() {
    const logo = document.getElementById("logo-screen");
    const click = document.getElementById("click-start");
    if (!logo || !click) return;
    setTimeout(() => {
      logo.classList.add("fade");
      setTimeout(() => {
        logo.classList.add("hidden");
        click.classList.remove("hidden");
      }, 600);
    }, 1700);
    click.addEventListener("click", () => {
      click.classList.add("hidden");
      try {
        audio();
      } catch (e) {}
      startBgm("menu");
      sfx("click");
      showPanel("panel-main");
    });
  })();
})();
