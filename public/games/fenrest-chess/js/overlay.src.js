import { makeGame } from "./nx-chess.js";

const SPR = "/games/character-chess/sprites/characters/";
const CARD = "/games/character-chess/sprites/cards/";
const SFX = "/games/character-chess/sfx/";
const PEER_KEY = "cc-lobby-peer";

const PACKS = [
  {
    id: "primeval",
    cls: "cc-tf",
    img: "zenlord.png",
    label: "Terraform",
    sub: "Rock · ground · grass · fighting",
    name: "Terraform",
    blurb: "Lift a tile and rewrite the map. Earth and fighting champions, plus the Terraform spell.",
    hero: [{ id: "terraform", name: "Terraform", kind: "Spell", art: "terraform.png", desc: "Lift a tile on your half or beside one of your creatures, then place it on a ghost square touching the board. A hole stays behind.", effect: "Move a tile · leaves a hole" }],
    units: [
      { id: "pebblet", name: "Pebblet", title: "Brickadillo", role: "Pawn", types: ["rock"], blurb: "A walking dry-stone wall. Prefers to be sat on, then suddenly doesn't." },
      { id: "sproutle", name: "Sproutle", title: "Seed Gecko", role: "Pawn", types: ["grass"], blurb: "Photosynthesis as a personality. Will sunbathe on a rook if you let it." },
      { id: "brawler", name: "Brawler", title: "Fist Pawn", role: "Pawn", types: ["fighting"], blurb: "A fighting pawn. The smallest glove still counts." },
      { id: "griffonair", name: "Griffonair", title: "Bronze Swoop", role: "Knight", types: ["flying", "fighting"], blurb: "Lion-eagle of the reliquary stables. Prefers a clean dive." },
      { id: "quakehorn", name: "Quakehorn", title: "Granite Ram", role: "Bishop", types: ["ground", "rock"], blurb: "Each charge redraws the contour lines. Quiet, until it isn't." },
      { id: "golemheart", name: "Golemheart", title: "Rune Stack", role: "Rook", types: ["rock", "steel"], blurb: "Stacked stone with a glowing word in the chest." },
      { id: "zenlord", name: "Zen Lord Statue", title: "Monk King of Stone", role: "King", types: ["rock", "psychic"], blurb: "A seated monk-king carved from prayer-stone. Struck, it is shoved to a neighbor." },
      { id: "earthmatron", name: "Earthmatron", title: "Fault Crown", role: "Queen", types: ["ground", "fighting"], blurb: "Ground and fighting. The continent is her glove." },
    ],
    extras: [
      { id: "trap_wall", name: "Wall", kind: "Trap", art: "trap_wall.png", desc: "A 100 HP barrier. Recast upgrades it to stone.", effect: "100 HP · recast upgrades" },
      { id: "boost_ground", name: "Ground Boost", kind: "Boost", art: "boost_ground.png", desc: "All Ground units gain 2% HP, Attack, Sp. Attack, and XP gain.", effect: "+2% Ground" },
    ],
  },
  {
    id: "nightcourt",
    cls: "cc-med",
    img: "vampire_queen.png",
    label: "Curse of Medusa",
    sub: "Dark · water · psychic",
    name: "Curse of Medusa",
    blurb: "A gaze that forgets flesh. Dark, water, and psychic champions, plus Curse of Medusa.",
    hero: [{ id: "medusa", name: "Curse of Medusa", kind: "Spell", art: "medusa.png", desc: "Turn a unit to stone. Stoned units gain 3 Armor and cannot act. An ally may strike them — one hit ends the clash and frees them. An enemy attack is a normal battle.", effect: "Stone · +3 Armor · ally one-hit free" }],
    units: [
      { id: "relicimp", name: "Relicimp", title: "Tablet Familiar", role: "Pawn", types: ["dark"], blurb: "A horned spirit bound to a cracked stone tablet. Loves unfair trades." },
      { id: "tidrop", name: "Tidrop", title: "Bubble Frog", role: "Pawn", types: ["water"], blurb: "Carries a personal tide in the sac on its back. Never actually looks wet." },
      { id: "frogseer", name: "Frogseer", title: "Pond Detective", role: "Pawn", types: ["water", "psychic"], blurb: "Notices footprints on water. The coat is non-negotiable." },
      { id: "wizardcat", name: "Wizardcat", title: "Star Hat Familiar", role: "Knight", types: ["psychic"], blurb: "Borrowed from a folk tale of New Eden. The orb is a polite moon." },
      { id: "hexweaver", name: "Hexweaver", title: "Rune Moth", role: "Bishop", types: ["psychic", "fairy"], blurb: "Four hands, one polite curse. The shawl is a spellbook that walks." },
      { id: "nightveil", name: "Nightveil", title: "Mask of Dusk", role: "Rook", types: ["ghost", "dark"], blurb: "A duelist's shade wearing a gold funerary mask. The cloak has no body in it." },
      { id: "pharaohm", name: "Pharaohm", title: "Obsidian Sphinx", role: "King", types: ["psychic", "dark"], blurb: "A reliquary sovereign. One eye burns gold; the other is a sealed riddle." },
      { id: "vampire_queen", name: "Vampire Queen", title: "Midnight Crown", role: "Queen", types: ["dark", "ghost"], blurb: "Nightspawn calls another vampire to an empty neighbor. She never shares the throne." },
    ],
    extras: [
      { id: "trap_sleep", name: "Sleep Trap", kind: "Trap", art: "trap_sleep.png", desc: "Trigger: put the piece that steps here to sleep.", effect: "On step: Sleep 1 turn" },
      { id: "boost_psychic", name: "Psychic Boost", kind: "Boost", art: "boost_psychic.png", desc: "All Psychic units gain 2% HP, Attack, Sp. Attack, and XP gain.", effect: "+2% Psychic" },
    ],
  },
  {
    id: "alpha",
    cls: "cc-rites",
    img: "ordessyeus.png",
    label: "Rites of Flame",
    sub: "Fire · electric · normal",
    name: "Rites of Flame",
    blurb: "Give a name so the rest can shout — then call it back. Fire, electric, and normal champions.",
    hero: [
      { id: "resurrection", name: "Resurrection", kind: "Spell", art: "resurrection.png", desc: "Choose a piece you lost this match and return it to a vacant tile on your half, at half HP.", effect: "Return a fallen piece · 50% HP" },
      { id: "sacrifice", name: "Sacrifice", kind: "Spell", art: "sacrifice.png", desc: "Destroy one of your units. All your other units gain 5% Attack and Sp. Attack.", effect: "KO ally · army +5% ATK/SPA" },
    ],
    units: [
      { id: "emberpaw", name: "Emberpaw", title: "Cinder Fox", role: "Pawn", types: ["fire"], blurb: "Its tail is a living wick. The hotter the fight, the brighter the plume." },
      { id: "sparklet", name: "Sparklet", title: "Arc Shrew", role: "Pawn", types: ["electric"], blurb: "A copper-teal shrew with live antennae. Charge lives in the whiskers, not the cheeks." },
      { id: "chefcoon", name: "Chefcoon", title: "Pan Bandit", role: "Pawn", types: ["normal", "fire"], blurb: "A raccoon that seasons the battlefield. Do not skip dessert." },
      { id: "voltstag", name: "Voltstag", title: "Storm Antler", role: "Knight", types: ["electric", "normal"], blurb: "Each antler is a lightning rod. Herds of them write weather." },
      { id: "emberlancer", name: "Emberlancer", title: "Kiln Antelope", role: "Bishop", types: ["fire", "fighting"], blurb: "Duelist of the kiln-fields. The lance is just a very committed spark." },
      { id: "cindrax", name: "Cindrax", title: "Kiln Drake", role: "Rook", types: ["fire", "dragon"], blurb: "A mid-form kiln wyrm. Molten cracks glow along the spine when it sprints." },
      { id: "ordessyeus", name: "Ordessyeus", title: "Magma King", role: "King", types: ["fire"], blurb: "Red robes, a golden scepter, and a court of cooling stone. The kiln bows." },
      { id: "empyrean", name: "Empyrean", title: "Solar Plume", role: "Queen", types: ["fire", "flying"], blurb: "A legendary pocket-beast. Dawn takes its orders from this one." },
    ],
    extras: [
      { id: "trap_burn", name: "Burning Trap", kind: "Trap", art: "trap_burn.png", desc: "Trigger: burn the piece that steps here.", effect: "On step: Burn 3 turns" },
      { id: "boost_fire", name: "Fire Boost", kind: "Boost", art: "boost_fire.png", desc: "All Fire units gain 2% HP, Attack, Sp. Attack, and XP gain.", effect: "+2% Fire" },
    ],
  },
  {
    id: "maps",
    cls: "cc-maps",
    img: "azurecolossus.png",
    label: "Map Pack",
    sub: "Medium field + RTS theatre",
    name: "Map Pack",
    blurb: "Unlock Medium 16×16 mountain fields and the 24×24 RTS theatre — gather, build, and watch the barbarians.",
    hero: [],
    units: [],
    extras: [
      { id: "medium", name: "Medium field", kind: "Board", art: "terraform.png", desc: "16×16 board with a mountain range. More room to evolve, flank, and terraform.", effect: "16×16 · 256 tiles" },
      { id: "rts", name: "RTS mode", kind: "Board", art: "farm_xp.png", desc: "24×24 field with forests, lakes, giant peaks, gather/build, and barbarians.", effect: "24×24 · gather / build" },
    ],
  },
];

const TILES = [
  { id: "cpu", cls: "cc-cpu", img: "emberlancer.png", label: "Play vs CPU", sub: "Classic field" },
  { id: "bonus", cls: "cc-bonus", img: "hexweaver.png", label: "Spells & traps", sub: "Bonus rules" },
  { id: "hot", cls: "cc-hot", img: "wizardcat.png", label: "Pass & play", sub: "One device" },
  { id: "multi", cls: "cc-multi", img: "primarch.png", label: "Two-player lobby", sub: "See your rival at once" },
  { id: "how", cls: "cc-how", img: "frogseer.png", label: "How to play", sub: "Draft · move · battle" },
  { id: "vr", cls: "cc-vr", img: "skyrazor.png", label: "VR table", sub: "Quest browser" },
  ...PACKS.map((p) => ({ id: "pack:" + p.id, cls: p.cls, img: p.img, label: p.label, sub: p.sub, price: "$1.99" })),
];

function peerId() {
  try {
    const e = sessionStorage.getItem(PEER_KEY);
    if (e) return e;
  } catch {}
  const id = "c-" + Math.random().toString(36).slice(2, 10);
  try {
    sessionStorage.setItem(PEER_KEY, id);
  } catch {}
  return id;
}

function waitGame() {
  return new Promise((res) => {
    const t = setInterval(() => {
      if (window.__game?.getState) {
        clearInterval(t);
        res(window.__game);
      }
    }, 50);
    setTimeout(() => {
      clearInterval(t);
      res(window.__game || null);
    }, 15000);
  });
}

async function post(body) {
  const res = await fetch("/api/chess-lobby", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

function el(html) {
  const d = document.createElement("div");
  d.innerHTML = html.trim();
  return d.firstElementChild;
}

function playSfx(name) {
  try {
    const a = new Audio(SFX + name + ".wav");
    a.volume = 0.28;
    a.play().catch(() => {});
  } catch {}
}

function sqIndex(file, rank) {
  return (8 - rank) * 8 + file;
}

function cineHTML() {
  const files = "abcdefgh";
  let tiles = "";
  for (let r = 8; r >= 1; r--) {
    for (let f = 0; f < 8; f++) {
      const dark = (f + r) % 2 === 0;
      tiles += `<div class="cc-sq${dark ? " dark" : ""}" data-sq="${files[f]}${r}"></div>`;
    }
  }
  return `<div id="cc-cine">
    <div class="cc-cine-board">${tiles}<div class="cc-bolt" id="cc-bolt"></div><div class="cc-clash" id="cc-clash"></div></div>
    <div class="cc-caption" id="cc-caption">Champions collide — captures become battles</div>
  </div>`;
}

function placeCine(id, char, file, rank, side) {
  const board = document.querySelector(".cc-cine-board");
  if (!board) return null;
  let img = document.getElementById(id);
  if (!img) {
    img = document.createElement("img");
    img.id = id;
    img.className = "cc-cine-piece" + (side === "b" ? " black" : "");
    img.alt = "";
    board.appendChild(img);
  }
  img.src = SPR + char + ".png";
  const size = 100 / 8;
  img.style.left = file * size - 1.2 + "%";
  img.style.top = (7 - rank) * size - 18 + "%";
  img.style.height = size + 18 + "%";
  img.style.width = size + 4 + "%";
  return img;
}

function startCinematic() {
  if (window.__ccCine) return;
  window.__ccCine = true;
  const caption = () => document.getElementById("cc-caption");
  const bolt = () => document.getElementById("cc-bolt");
  const clash = () => document.getElementById("cc-clash");
  const setCap = (t) => {
    const n = caption();
    if (n) n.textContent = t;
  };
  const loop = () => {
    if (!document.getElementById("cc-shell")?.classList.contains("on")) {
      setTimeout(loop, 1200);
      return;
    }
    document.querySelectorAll(".cc-cine-piece").forEach((n) => n.remove());
    const wN = placeCine("cc-wN", "emberlancer", 1, 0, "w");
    const bN = placeCine("cc-bN", "nightveil", 6, 7, "b");
    const wP = placeCine("cc-wP", "sproutle", 4, 1, "w");
    const wQ = placeCine("cc-wQ", "wizardcat", 3, 0, "w");
    const bK = placeCine("cc-bK", "pharaohm", 4, 7, "b");
    setCap("Champions collide — captures become battles");
    setTimeout(() => {
      if (wN) placeCine("cc-wN", "emberlancer", 3, 3, "w");
      if (bN) placeCine("cc-bN", "nightveil", 3, 4, "b");
    }, 700);
    setTimeout(() => {
      playSfx("punch");
      const cl = clash();
      if (cl) {
        cl.style.left = "43%";
        cl.style.top = "46%";
        cl.classList.add("on");
        setTimeout(() => cl.classList.remove("on"), 520);
      }
      wN?.classList.add("hit");
      bN?.classList.add("hit");
      setTimeout(() => {
        wN?.classList.remove("hit");
        bN?.classList.remove("hit");
      }, 400);
    }, 1500);
    setTimeout(() => {
      setCap("Lightning Bolt — a spear of three sparks");
      playSfx("magic");
      if (wQ) placeCine("cc-wQ", "wizardcat", 2, 2, "w");
    }, 2400);
    setTimeout(() => {
      const b = bolt();
      if (b) {
        b.classList.add("on");
        setTimeout(() => b.classList.remove("on"), 560);
      }
      playSfx("hit");
      bN?.classList.add("hit");
      setTimeout(() => bN?.classList.remove("hit"), 400);
    }, 3100);
    setTimeout(() => {
      setCap("A minion reaches the far rank and evolves");
      const steps = [
        [4, 2],
        [4, 3],
        [4, 4],
        [4, 5],
        [4, 6],
        [4, 7],
      ];
      steps.forEach((s, i) => {
        setTimeout(() => {
          playSfx("whoosh");
          placeCine("cc-wP", i === steps.length - 1 ? "sproutle_evo" : "sproutle", s[0], s[1], "w");
          if (i === steps.length - 1) {
            const p = document.getElementById("cc-wP");
            p?.classList.add("evo");
            playSfx("level");
            if (bK) {
              bK.classList.add("stone");
              setCap("Curse of Medusa — stone, until a single allied blow frees them");
            }
          }
        }, i * 420);
      });
    }, 3900);
    setTimeout(loop, 11000);
  };
  loop();
}

function ownedMap(game) {
  const s = game?.getState?.() || {};
  return s.unlockedPacks || {};
}

function tileMarkup(t, owned) {
  const packId = t.id.startsWith("pack:") ? t.id.slice(5) : "";
  const has = packId && owned[packId];
  return `<button type="button" class="cc-tile ${t.cls}" data-act="${t.id}">
    <img class="art" src="${SPR}${t.img}" alt="">
    <span class="shade"></span>
    ${t.price ? `<span class="price${has ? " owned" : ""}">${has ? "Owned" : t.price}</span>` : ""}
    <span class="label">${t.label}<span class="sub">${t.sub}</span></span>
  </button>`;
}

function cardBtn(c, pack) {
  const art = c.art ? CARD + c.art : SPR + c.id + ".png";
  const meta = [c.kind || c.role, ...(c.types || [])].filter(Boolean).join(" · ");
  return `<button type="button" class="cc-card" data-closeup="${pack.id}:${c.id}">
    <img src="${art}" alt="">
    <div class="nm">${c.name}</div>
    <div class="meta">${meta}</div>
    <div class="desc">${c.effect || c.title || ""}</div>
  </button>`;
}

function findCard(pack, id) {
  return (
    pack.hero.find((c) => c.id === id) ||
    pack.units.find((c) => c.id === id) ||
    pack.extras.find((c) => c.id === id)
  );
}

function mount() {
  if (document.getElementById("cc-shell")) return;
  const shell = el(`<div id="cc-shell"></div>`);
  shell.innerHTML = `
    ${cineHTML()}
    <div class="cc-veil"></div>
    <div class="cc-bento">
      <div class="cc-brand">
        <p class="kicker">Aetherboard rest hall</p>
        <h1>Creature<br/>Chess</h1>
        <p>Champions on every piece. Captures become duels. Three $1.99 packs rewrite the roster — and a Map Pack opens the larger theatres.</p>
      </div>
      ${TILES.map((t) => tileMarkup(t, {})).join("")}
    </div>
  `;
  const lobby = el(`<div id="cc-lobby"></div>`);
  lobby.innerHTML = `
    <h2>The waiting stones</h2>
    <p class="cc-note">One lobby. Two players. You appear here the moment you sit down.</p>
    <div class="cc-seats">
      <div class="cc-seat" id="cc-seat-w"><div class="empty">White seat</div></div>
      <div class="cc-seat" id="cc-seat-b"><div class="empty">Waiting for a rival…</div></div>
    </div>
    <div class="cc-board-set" id="cc-scale">
      <button type="button" data-s="1" class="on">Original 8×8</button>
      <button type="button" data-s="2">Medium 16×16 · Map Pack</button>
      <button type="button" data-s="3">RTS 24×24 · Map Pack</button>
    </div>
    <p class="cc-note" id="cc-host-note">The first player is host and chooses board size at start.</p>
    <div class="cc-lobby-actions">
      <button type="button" class="back" id="cc-leave">Leave lobby</button>
      <button type="button" id="cc-start">Start match</button>
    </div>
  `;
  const shop = el(`<div id="cc-shop"></div>`);
  const closeup = el(`<div id="cc-closeup"></div>`);
  const chip = el(`<div class="cc-chip" id="cc-chip"></div>`);
  document.body.append(shell, lobby, shop, closeup, chip);
}

function paintSeat(node, p, hostId) {
  if (!p) {
    node.innerHTML = `<div class="empty">${node.id.endsWith("w") ? "White seat" : "Waiting for a rival…"}</div>`;
    return;
  }
  const img = SPR + (p.portrait || "primarch") + ".png";
  node.innerHTML = `<img src="${img}" alt=""><div class="meta">${p.name}${p.id === hostId ? " · Host" : ""}<small>${p.seat === "w" ? "White" : "Black"}</small></div>`;
}

function setScaleUi(scale, isHost) {
  document.querySelectorAll("#cc-scale button").forEach((b) => {
    b.classList.toggle("on", Number(b.dataset.s) === scale);
    b.disabled = !isHost;
  });
  document.getElementById("cc-start").style.display = isHost ? "" : "none";
}

function applyBoardConfig(scale, mountains) {
  const n = scale >= 3 ? 24 : scale >= 2 ? 16 : 8;
  window.__CC_N = n;
  window.__CC_FILES = "abcdefghijklmnopqrstuvwx".slice(0, n);
  window.__CC_MOUNTAINS = mountains || [];
}

function startLocal(game, mode, ruleset) {
  window.__CC_MULTI = false;
  window.__CC_SEAT = null;
  window.__CC_N = 8;
  window.__CC_FILES = "abcdefgh";
  window.__CC_MOUNTAINS = [];
  document.getElementById("cc-shell").classList.remove("on");
  document.getElementById("cc-lobby").classList.remove("on");
  game.getState().startDraft(mode, ruleset);
}

function renderShop(game, packId) {
  const shop = document.getElementById("cc-shop");
  const owned = ownedMap(game);
  const pack = PACKS.find((p) => p.id === packId);
  if (!pack) {
    shop.innerHTML = `<div class="cc-shop-panel">
      <div class="cc-shop-top">
        <div>
          <p class="kicker">Creature packs</p>
          <h2>$1.99 a pack</h2>
          <p class="blurb">Each pack is a theme: a signature spell, a full court, a trap, and a type boost. Open a pack to inspect every card.</p>
        </div>
        <button type="button" class="cc-x" data-shop="close" aria-label="Close">×</button>
      </div>
      <div class="cc-pack-list">
        ${PACKS.map(
          (p) => `<button type="button" data-shop="${p.id}">
            <h3>${p.name}</h3>
            <p class="blurb">${p.blurb}</p>
            <p class="meta">${owned[p.id] ? "Unlocked" : "$1.99"}</p>
          </button>`,
        ).join("")}
      </div>
    </div>`;
  } else {
    const has = !!owned[pack.id];
    shop.innerHTML = `<div class="cc-shop-panel">
      <div class="cc-shop-top">
        <div>
          <p class="kicker">${has ? "Unlocked" : "$1.99 · Stripe"}</p>
          <h2>${pack.name}</h2>
          <p class="blurb">${pack.blurb}</p>
        </div>
        <button type="button" class="cc-x" data-shop="close" aria-label="Close">×</button>
      </div>
      ${pack.hero.length ? `<div class="cc-feat">${pack.hero.map((c) => cardBtn({ ...c, kind: c.kind }, pack)).join("")}</div>` : ""}
      ${pack.units.length ? `<p class="kicker" style="margin-top:18px">The court — 3 pawns, knight, bishop, rook, king, queen</p><div class="cc-grid-cards">${pack.units.map((u) => cardBtn(u, pack)).join("")}</div>` : ""}
      <p class="kicker" style="margin-top:18px">${pack.id === "maps" ? "Theatres" : "Trap & type boost"}</p>
      <div class="cc-grid-cards">${pack.extras.map((c) => cardBtn(c, pack)).join("")}</div>
      ${has ? `<p class="cc-ok">This browser already has ${pack.name}.</p>` : `<div class="cc-shop-actions">
        <button type="button" data-buy="${pack.id}">Continue to Stripe — $1.99</button>
        <button type="button" class="ghost" data-shop="close">Not now</button>
      </div><p class="cc-err" id="cc-shop-err"></p>`}
    </div>`;
  }
  shop.classList.add("on");
  document.body.classList.add("cc-shop-on");
}

function openCloseup(pack, card) {
  const box = document.getElementById("cc-closeup");
  const art = card.art ? CARD + card.art : SPR + card.id + ".png";
  box.innerHTML = `<div class="cc-closeup-card">
    <img src="${art}" alt="">
    <div>
      <p class="kicker">${card.kind || card.role || "Card"}</p>
      <h3>${card.name}</h3>
      ${card.title ? `<p class="meta">${card.title}</p>` : ""}
      <div class="cc-types">${(card.types || []).map((t) => `<span>${t}</span>`).join("")}${card.effect ? `<span>${card.effect}</span>` : ""}</div>
      <p class="body">${card.desc || card.blurb || ""}</p>
      <div class="cc-shop-actions" style="margin-top:18px">
        <button type="button" class="ghost" data-closeup-x>Close</button>
      </div>
    </div>
  </div>`;
  box.classList.add("on");
}

async function buyPack(packId, game) {
  const err = document.getElementById("cc-shop-err");
  if (err) err.textContent = "";
  try {
    const res = await fetch("/api/chess/alpha-checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ pack: packId }),
    });
    const data = await res.json();
    if (data.url) {
      const w = window.top || window;
      w.location.href = data.url;
      return;
    }
    if (err) err.textContent = data.error || "Checkout could not start.";
  } catch (e) {
    if (err) err.textContent = "Checkout is available on futuremusic.online.";
  }
}

function closeShop(game) {
  document.getElementById("cc-shop")?.classList.remove("on");
  document.getElementById("cc-closeup")?.classList.remove("on");
  document.body.classList.remove("cc-shop-on");
  try {
    game.getState().closeAlphaModal?.();
  } catch {}
}

function refreshPackBadges(game) {
  const owned = ownedMap(game);
  document.querySelectorAll("#cc-shell [data-act^='pack:']").forEach((btn) => {
    const id = btn.dataset.act.slice(5);
    const tag = btn.querySelector(".price");
    if (!tag) return;
    if (owned[id]) {
      tag.textContent = "Owned";
      tag.classList.add("owned");
    } else {
      tag.textContent = "$1.99";
      tag.classList.remove("owned");
    }
  });
}

async function boot() {
  mount();
  startCinematic();
  const game = await waitGame();
  if (!game) return;
  if (window.Pt) window.__CC_Pt = window.Pt;
  window.__ccMkH = function () {
    const n = window.__CC_N || 8;
    if (n <= 8 && window.__CC_Pt) return new window.__CC_Pt();
    return makeGame(n);
  };
  try {
    game.getState().hydrateAlphaPack?.();
  } catch {}

  const shell = document.getElementById("cc-shell");
  const lobbyEl = document.getElementById("cc-lobby");
  const chip = document.getElementById("cc-chip");
  const self = peerId();
  let inLobby = false;
  let scale = 1;
  let lastStartSeq = 0;
  let lastMoveSeq = 0;
  let applying = false;

  function syncChrome(s) {
    const title = s.phase === "title";
    if (title && !inLobby && !window.__CC_MULTI) {
      window.__CC_N = 8;
      window.__CC_FILES = "abcdefgh";
      window.__CC_MOUNTAINS = [];
      window.__CC_SEAT = null;
    }
    shell.classList.toggle("on", title && !inLobby);
    document.body.classList.toggle("cc-hide-stock-title", title);
    if (!title) lobbyEl.classList.remove("on");
    if (s.alphaModalOpen) {
      renderShop(game, s.packModal || null);
    } else {
      document.getElementById("cc-shop")?.classList.remove("on");
      document.getElementById("cc-closeup")?.classList.remove("on");
      document.body.classList.remove("cc-shop-on");
    }
    refreshPackBadges(game);
  }
  syncChrome(game.getState());
  game.subscribe((s) => syncChrome(s));

  shell.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    const st = game.getState();
    if (act === "cpu") startLocal(game, "cpu", "classic");
    else if (act === "bonus") startLocal(game, "cpu", "bonus");
    else if (act === "hot") startLocal(game, "hotseat", "classic");
    else if (act === "how") st.setHowTo(true);
    else if (act === "vr") (st.vrActive ? st.exitVr : st.enterVr)();
    else if (act === "multi") openLobby();
    else if (act.startsWith("pack:")) st.openPackModal(act.slice(5));
  });

  document.getElementById("cc-shop").addEventListener("click", (ev) => {
    const close = ev.target.closest("[data-shop='close']");
    if (close) return closeShop(game);
    const pick = ev.target.closest("[data-shop]");
    if (pick && pick.dataset.shop && pick.dataset.shop !== "close") {
      game.getState().openPackModal(pick.dataset.shop);
      return;
    }
    const buy = ev.target.closest("[data-buy]");
    if (buy) return void buyPack(buy.dataset.buy, game);
    const cu = ev.target.closest("[data-closeup]");
    if (cu) {
      const [pid, cid] = cu.dataset.closeup.split(":");
      const pack = PACKS.find((p) => p.id === pid);
      const card = pack && findCard(pack, cid);
      if (pack && card) openCloseup(pack, card);
    }
  });
  document.getElementById("cc-closeup").addEventListener("click", (ev) => {
    if (ev.target.closest("[data-closeup-x]") || ev.target.id === "cc-closeup") {
      document.getElementById("cc-closeup").classList.remove("on");
    }
  });

  async function openLobby() {
    inLobby = true;
    shell.classList.remove("on");
    lobbyEl.classList.add("on");
    const portraits = ["primarch", "emberlancer", "voidseraph", "griffonair", "stormcrown"];
    const portrait = portraits[Math.floor(Math.random() * portraits.length)];
    const joined = await post({ op: "join", peer: self, name: "Challenger " + self.slice(-3), portrait });
    if (joined && joined.ok === false) {
      inLobby = false;
      lobbyEl.classList.remove("on");
      shell.classList.add("on");
      window.alert(joined.error || "Lobby is full.");
      return;
    }
    tickLobby();
  }

  async function tickLobby() {
    if (!inLobby && !window.__CC_MULTI) return;
    try {
      const q = new URLSearchParams({ peer: self });
      const data = await (await fetch("/api/chess-lobby?" + q)).json();
      const w = (data.peers || []).find((p) => p.seat === "w");
      const b = (data.peers || []).find((p) => p.seat === "b");
      paintSeat(document.getElementById("cc-seat-w"), w, data.hostId);
      paintSeat(document.getElementById("cc-seat-b"), b, data.hostId);
      scale = data.scale || 1;
      const isHost = data.hostId === self;
      setScaleUi(scale, isHost);
      document.getElementById("cc-host-note").textContent = isHost
        ? "You are host. Pick a field size, then start when both seats are filled."
        : "Host chooses the field. You will sit Black.";
      document.getElementById("cc-start").disabled = !isHost || (data.peers || []).length < 2;

      if (data.started && inLobby) {
        const startEv = (data.events || []).filter((e) => e.kind === "start").pop();
        const seq = startEv?.seq || 1;
        const isHost = data.hostId === self;
        if (seq !== lastStartSeq && (isHost || data.snapshot)) {
          lastStartSeq = seq;
          beginMatch(data);
        }
      }
      if (window.__CC_MULTI && data.events) {
        for (const ev of data.events) {
          if (ev.kind === "move" && ev.seq > lastMoveSeq && ev.by !== self) {
            lastMoveSeq = ev.seq;
            replayMove(ev.from, ev.to);
          } else if (ev.kind === "move" && ev.by === self) lastMoveSeq = Math.max(lastMoveSeq, ev.seq);
        }
      }
      const other = (data.peers || []).find((p) => p.id !== self);
      if (other && game.getState().phase === "playing") {
        chip.classList.add("on");
        chip.innerHTML = `<img src="${SPR}${other.portrait || "primarch"}.png" alt=""> <span>${other.name} · ${other.seat === "w" ? "White" : "Black"}</span>`;
      } else if (game.getState().phase !== "playing") chip.classList.remove("on");
    } catch {}
  }
  setInterval(tickLobby, 450);

  document.getElementById("cc-scale").addEventListener("click", async (ev) => {
    const b = ev.target.closest("button");
    if (!b || b.disabled) return;
    const next = Number(b.dataset.s);
    if ((next === 2 || next === 3) && !ownedMap(game).maps) {
      game.getState().openPackModal("maps");
      return;
    }
    scale = next;
    await post({ op: "settings", peer: self, scale });
    tickLobby();
  });
  document.getElementById("cc-leave").onclick = async () => {
    inLobby = false;
    window.__CC_MULTI = false;
    await post({ op: "leave", peer: self });
    lobbyEl.classList.remove("on");
    if (game.getState().phase === "title") shell.classList.add("on");
  };
  document.getElementById("cc-start").onclick = async () => {
    if ((scale === 2 || scale === 3) && !ownedMap(game).maps) {
      game.getState().openPackModal("maps");
      return;
    }
    const data = await post({ op: "start", peer: self, scale });
    if (data?.ok) beginMatch(data);
  };

  function sliceState(s) {
    return {
      phase: s.phase,
      mode: "hotseat",
      ruleset: s.ruleset,
      champions: s.champions,
      bySquare: s.bySquare,
      terrain: s.terrain,
      turn: s.turn,
      history: s.history,
      lastMove: s.lastMove,
      traps: s.traps,
      ap: s.ap,
      hands: s.hands,
      decks: s.decks,
      message: s.message,
      field3d: false,
    };
  }

  function beginMatch(data) {
    inLobby = false;
    lobbyEl.classList.remove("on");
    shell.classList.remove("on");
    const me = (data.peers || []).find((p) => p.id === self);
    window.__CC_MULTI = true;
    window.__CC_SEAT = me?.seat || "w";
    applyBoardConfig(data.scale || 1, data.mountains || []);
    const isHost = data.hostId === self;
    if (isHost) {
      game.setState({ alphaUnlocked: true });
      game.getState().startDraft("hotseat", "classic");
      game.setState({ draftSide: "b", alphaUnlocked: true });
      game.getState().confirmDraft();
      setTimeout(() => {
        post({ op: "sync", peer: self, snapshot: sliceState(game.getState()) }).catch(() => {});
      }, 80);
    } else if (data.snapshot && data.snapshot.champions) {
      if (typeof window.__ccBindH === "function") window.__ccBindH(makeGame(window.__CC_N));
      window.__game.setState({ ...data.snapshot, selected: null, legal: [], busy: false, thinking: false });
    }
  }

  const moveQ = [];
  function replayMove(from, to) {
    if (!from || !to) return;
    moveQ.push([from, to]);
    drainMoves();
  }
  function drainMoves() {
    if (applying || !moveQ.length) return;
    const s = game.getState();
    if (s.phase !== "playing" || s.busy || s.battle) return;
    const [from, to] = moveQ.shift();
    applying = true;
    window.__CC_FORCE = true;
    try {
      game.getState().clickSquare(from);
      game.getState().clickSquare(to);
    } catch {}
    window.__CC_FORCE = false;
    applying = false;
  }

  let hist = "";
  game.subscribe((s) => {
    drainMoves();
    if (!window.__CC_MULTI || applying) return;
    const h = (s.history || []).join(",");
    if (h === hist) return;
    const prev = hist;
    hist = h;
    if (!s.lastMove) return;
    if ((s.history || []).length <= (prev ? prev.split(",").filter(Boolean).length : 0)) return;
    post({ op: "move", peer: self, from: s.lastMove.from, to: s.lastMove.to }).catch(() => {});
  });
}

boot();
