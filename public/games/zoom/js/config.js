/** Zoom — shared catalogs. */

export const CELL = 1.25;
export const MAP_W = 96;
export const MAP_H = 96;
export const EYE = 1.55;
export const SHAPE_FLAT = 0;
export const SHAPE_ROUND = 1;
export const SHAPE_OVAL = 2;
export const SHAPE_SPHERE = 3;
export const FLAG_SPIKE = 1;
export const FLAG_CROUCH = 2;
export const FLAG_UNSTABLE = 4;
export const WALL_CRACK = 128;
export const LIQ_NONE = 0;
export const LIQ_WATER = 1;
export const LIQ_LAVA = 2;
export const SKY_CAVE = 0;
export const SKY_DAY = 1;
export const SKY_NIGHT = 2;
export const SKY_JUNGLE = 3;
export const STORIES = 3;
export const STORY_H = 3.15;

export const SHAPES = [
  { id: SHAPE_FLAT, key: "flat", name: "Flat hall", hint: "Square rooms and halls — flat floor and ceiling.", ink: "#d8d0c0" },
  { id: SHAPE_ROUND, key: "round", name: "Round tunnel", hint: "Circular pipe. Thin strokes become tubes; wide fills get barrel vaults.", ink: "#9ad4ff" },
  { id: SHAPE_OVAL, key: "oval", name: "Misshapen oval", hint: "Uneven oval tunnels, lumpy organic caves.", ink: "#c4a070" },
  { id: SHAPE_SPHERE, key: "sphere", name: "Sphere chamber", hint: "Each stamp is a perfect sphere. Overlap them for grotto clusters.", ink: "#d4a0ff" },
];

export const BIOMES = [
  { id: "arctic", name: "Arctic tunnel", swatch: "#c8e4f4", fog: 0x8ab4c8, ambient: 0xb0d0e4 },
  { id: "stone", name: "Stone tunnel", swatch: "#8a8680", fog: 0x1a1814, ambient: 0x6a6860 },
  { id: "space", name: "Space corridor", swatch: "#3a5078", fog: 0x04060c, ambient: 0x4a6a9a },
  { id: "jungle", name: "Jungle cavern", swatch: "#2f6a38", fog: 0x0a180c, ambient: 0x3a6a34 },
  { id: "doom", name: "Doom dungeon", swatch: "#8a2018", fog: 0x1a0604, ambient: 0x8a3020 },
  { id: "royal", name: "Royal castle", swatch: "#d4b46a", fog: 0x1a1410, ambient: 0xc4a868 },
  { id: "haunted", name: "Haunted mansion", swatch: "#5a4860", fog: 0x100c12, ambient: 0x6a5a70 },
  { id: "mossy", name: "Mossy cobblestone", swatch: "#6a7a48", fog: 0x10140c, ambient: 0x5a6a40 },
  { id: "crystal", name: "Crystalline", swatch: "#7a4ec8", fog: 0x0c0618, ambient: 0x8a60d0 },
];

export const WALL_TEX = [
  { id: "castle", name: "Castle", swatch: "#8a8680" },
  { id: "manor", name: "Manor", swatch: "#6a5040" },
  { id: "metal", name: "Metal", swatch: "#6a7078" },
  { id: "siding", name: "Siding", swatch: "#c4b090" },
  { id: "straw", name: "Straw hut", swatch: "#c4a050" },
  { id: "cabin", name: "Wood cabin", swatch: "#8a5a32" },
  { id: "space", name: "Space metal", swatch: "#3a5070" },
  { id: "cave", name: "Cavern rock", swatch: "#6a5a48" },
  { id: "granite", name: "Granite", swatch: "#7a7a78" },
  { id: "mossrock", name: "Moss cave", swatch: "#4a6a40" },
  { id: "ice", name: "Ice cave", swatch: "#a8d0e0" },
  { id: "crystal", name: "Crystal cave", swatch: "#7a4ec8" },
  { id: "sandstone", name: "Sandstone", swatch: "#c4a070" },
  { id: "dungeon", name: "Dungeon brick", swatch: "#5a5048" },
];

export const SKY_KINDS = [
  { id: SKY_DAY, name: "Day skybox" },
  { id: SKY_NIGHT, name: "Night skybox" },
  { id: SKY_JUNGLE, name: "Jungle canopy" },
];

export const PORTAL_COLORS = [0xff4466, 0x44ddff, 0x88ff44, 0xffaa22, 0xcc66ff, 0xffffff, 0xff66cc, 0x44ffcc];

export const FEN = "/games/fenrest/sprites/";
export const ZSPR = "/games/zoom/sprites/";

function bot(id, name, color, size, move, attack, hp, spd, dmg) {
  return { id, name, robot: true, color, size, move, attack, hp, spd, dmg, w: size, h: size * 1.65 };
}

export const ENEMIES = [
  { id: "wolf", name: "Wolf", file: FEN + "wolf.png", sheet: true, hp: 5, spd: 4.3, dmg: 9, w: 1.25, h: 1.7 },
  { id: "bandit", name: "Bandit", file: FEN + "bandit.png", sheet: true, hp: 8, spd: 3.1, dmg: 11, w: 1.15, h: 2.05 },
  { id: "guard", name: "Guard", file: FEN + "guard.png", sheet: true, hp: 12, spd: 2.6, dmg: 14, w: 1.2, h: 2.1 },
  { id: "lizard", name: "Lizard", file: FEN + "lizard.png", sheet: true, hp: 6, spd: 3.7, dmg: 10, w: 1.15, h: 1.95 },
  { id: "lizardfolk", name: "Lizardfolk", file: FEN + "lizardfolk.png", sheet: true, hp: 9, spd: 3.3, dmg: 12, w: 1.25, h: 2.05 },
  { id: "mage", name: "Mage", file: FEN + "human.png", sheet: true, hp: 7, spd: 2.4, dmg: 13, w: 1.1, h: 2.0 },
  { id: "necromancer", name: "Necromancer", file: FEN + "innkeeper.png", sheet: true, hp: 11, spd: 2.1, dmg: 15, w: 1.2, h: 2.05 },
  { id: "wyrd", name: "Wyrd", file: FEN + "woman.png", sheet: true, hp: 6, spd: 2.8, dmg: 10, w: 1.1, h: 2.0 },
  { id: "dragon", name: "Dragon", file: FEN + "dragon.png", sheet: true, hp: 28, spd: 3.3, dmg: 22, w: 2.5, h: 2.2 },
  { id: "skeleton", name: "Skeleton", file: ZSPR + "skeleton.png", sheet: false, hp: 7, spd: 2.9, dmg: 12, w: 1.15, h: 2.15 },
  { id: "slime", name: "Slime", file: ZSPR + "slime.png", sheet: false, hp: 4, spd: 2.2, dmg: 8, w: 1.35, h: 1.2 },
  { id: "wraith", name: "Wraith", file: ZSPR + "wraith.png", sheet: false, hp: 10, spd: 3.5, dmg: 14, w: 1.3, h: 2.2 },
  { id: "raptor", name: "Raptor", file: FEN + "raptor.png", sheet: false, hp: 9, spd: 4.6, dmg: 13, w: 1.9, h: 1.5 },
  { id: "trex", name: "Tyrant", file: FEN + "trex.png", sheet: false, hp: 36, spd: 2.3, dmg: 24, w: 3.4, h: 3.1 },
  { id: "mammoth", name: "Mammoth", file: FEN + "mammoth.png", sheet: false, hp: 40, spd: 1.7, dmg: 20, w: 3.2, h: 2.6 },
  bot("scout", "Scout drone", 0x44ccff, 0.7, "hover", "plasma", 6, 4.4, 8),
  bot("sentry", "Sentry", 0xcc3344, 1.1, "patrol", "beam", 14, 1.6, 12),
  bot("brute", "Brute", 0xff7722, 1.7, "charge", "melee", 28, 3.4, 18),
  bot("strider", "Strider", 0xaa66ff, 1.4, "orbit", "burst", 16, 2.8, 10),
  bot("crawler", "Crawler", 0x55aa33, 0.85, "strafe", "melee", 8, 3.8, 9),
  bot("wasp", "Wasp", 0xffdd33, 0.65, "hover", "lunge", 5, 5.2, 8),
  bot("tank", "Siege tank", 0x667788, 2.0, "patrol", "flame", 40, 1.4, 16),
  bot("sniper", "Sniper", 0xe8e8f0, 1.15, "patrol", "beam", 10, 1.8, 20),
  bot("pyro", "Pyro", 0xff4411, 1.2, "charge", "flame", 18, 3.0, 11),
  bot("disc", "Disc drone", 0x3388ff, 0.9, "hover", "burst", 9, 3.6, 9),
  bot("knight", "Knight", 0xd4b050, 1.35, "charge", "melee", 22, 2.7, 15),
  bot("spider", "Spider bot", 0x222228, 1.0, "strafe", "plasma", 12, 3.5, 10),
  bot("bomber", "Bomber", 0x8a5a32, 1.25, "lunge", "burst", 14, 2.4, 14),
  bot("hunter", "Hunter", 0xff66aa, 1.05, "charge", "melee", 11, 4.8, 12),
  bot("wisp", "Wisp bot", 0xccffe8, 0.75, "hover", "plasma", 7, 3.2, 9),
  bot("bull", "Bull", 0xaa2020, 1.55, "lunge", "melee", 24, 3.9, 17),
  bot("swarm", "Swarmling", 0x66ff88, 0.5, "strafe", "melee", 3, 5.4, 6),
];

export const OBJECTS = [
  { id: "torch", name: "Torch", light: true },
  { id: "crate", name: "Crate" },
  { id: "barrel", name: "Barrel" },
  { id: "chest", name: "Chest" },
  { id: "pillar", name: "Pillar" },
  { id: "bones", name: "Bone pile" },
  { id: "crystal", name: "Crystal" },
  { id: "table", name: "Table" },
  { id: "chair", name: "Chair" },
  { id: "banner", name: "Banner" },
  { id: "mushroom", name: "Mushroom" },
  { id: "stalagmite", name: "Stalagmite" },
  { id: "altar", name: "Altar" },
  { id: "cage", name: "Cage" },
  { id: "coffin", name: "Coffin" },
  { id: "bookshelf", name: "Bookshelf" },
  { id: "campfire", name: "Campfire", light: true },
  { id: "anvil", name: "Anvil" },
  { id: "spikes", name: "Spike trap" },
  { id: "fountain", name: "Fountain" },
];

export const WEAPONS = [
  { id: "pistol", name: "Plasma pistol", slot: "gun", dmg: 12, rpm: 3.5, mag: 12, spread: 0.018, pellets: 1, speed: 52, color: 0x66ccff, beam: true },
  { id: "shotgun", name: "Scatter gun", slot: "gun", dmg: 7, rpm: 1.15, mag: 6, spread: 0.16, pellets: 7, speed: 38, color: 0xffcc66, beam: false },
  { id: "rifle", name: "Assault rifle", slot: "gun", dmg: 9, rpm: 11, mag: 30, spread: 0.03, pellets: 1, speed: 64, color: 0x88ff66, beam: true },
  { id: "bazooka", name: "Bazooka", slot: "gun", dmg: 48, rpm: 0.55, mag: 1, spread: 0.01, pellets: 1, speed: 22, color: 0xff4466, splash: 2.6, beam: false },
  { id: "flamethrower", name: "Flamethrower", slot: "gun", dmg: 6, rpm: 16, mag: 50, spread: 0.12, pellets: 1, speed: 18, color: 0xff6622, flame: true, range: 7 },
  { id: "whip", name: "Whip", slot: "melee", dmg: 14, reach: 3.3, rate: 0.45 },
  { id: "sword", name: "Sword", slot: "melee", dmg: 18, reach: 2.2, rate: 0.38 },
  { id: "katana", name: "Katana", slot: "melee", dmg: 22, reach: 2.55, rate: 0.28 },
  { id: "saber-blue", name: "Blue saber", slot: "melee", dmg: 26, reach: 2.7, rate: 0.26, saber: true, color: 0x3399ff },
  { id: "saber-green", name: "Green saber", slot: "melee", dmg: 26, reach: 2.7, rate: 0.26, saber: true, color: 0x33dd55 },
  { id: "saber-red", name: "Red saber", slot: "melee", dmg: 28, reach: 2.7, rate: 0.24, saber: true, color: 0xff3333 },
  { id: "saber-purple", name: "Purple saber", slot: "melee", dmg: 27, reach: 2.75, rate: 0.25, saber: true, color: 0xcc66ff },
  { id: "saber-yellow", name: "Yellow saber", slot: "melee", dmg: 25, reach: 2.65, rate: 0.27, saber: true, color: 0xffee44 },
  { id: "saber-cyan", name: "Cyan saber", slot: "melee", dmg: 26, reach: 2.7, rate: 0.26, saber: true, color: 0x44f0ff },
  { id: "saber-orange", name: "Orange saber", slot: "melee", dmg: 27, reach: 2.7, rate: 0.25, saber: true, color: 0xff8822 },
  { id: "saber-white", name: "White saber", slot: "melee", dmg: 30, reach: 2.8, rate: 0.22, saber: true, color: 0xf4f4ff },
];

export const PICKUPS = [
  ...WEAPONS.map((w) => ({ id: w.id, name: w.name, cat: "weapon" })),
  { id: "jetpack", name: "Jetpack", cat: "gear", fuel: 6 },
  { id: "fuel", name: "Fuel tank", cat: "gear", fuel: 6 },
  { id: "medkit", name: "Medkit", cat: "item", heal: 40 },
  { id: "lantern", name: "Lantern", cat: "item" },
  { id: "shield", name: "Shield shard", cat: "item" },
  { id: "bomb", name: "Plasma bomb", cat: "item" },
  { id: "ammo", name: "Ammo crate", cat: "item", ammo: true },
];

export const LOOT = [
  { id: "coin", name: "Coin", value: 1, file: ZSPR + "loot/coin.png", scale: 0.32 },
  { id: "goldbar", name: "Gold bar", value: 25, file: ZSPR + "loot/goldbar.png", scale: 0.42 },
  { id: "ruby", name: "Ruby", value: 100, file: ZSPR + "loot/ruby.png", scale: 0.4 },
  { id: "diamond", name: "Diamond", value: 500, file: ZSPR + "loot/diamond.png", scale: 0.42 },
  { id: "chest", name: "Treasure chest", value: 1000, file: ZSPR + "loot/chest.png", scale: 0.5 },
];

export const SHOP = [
  { id: "ammo", name: "Ammo refill", cost: 25, kind: "ammo" },
  { id: "medkit", name: "Medkit", cost: 40, kind: "item" },
  { id: "fuel", name: "Fuel tank", cost: 45, kind: "item" },
  { id: "shield", name: "Shield shard", cost: 55, kind: "item" },
  { id: "haste", name: "Haste (20s)", cost: 80, kind: "power" },
  { id: "rage", name: "Rage (20s)", cost: 90, kind: "power" },
  { id: "heal", name: "Full heal", cost: 120, kind: "power" },
  ...WEAPONS.map((w) => ({
    id: w.id,
    name: w.name,
    cost: w.saber ? 180 + Math.round(w.dmg) : w.slot === "melee" ? 70 + w.dmg * 2 : 40 + Math.round((w.dmg * (w.mag || 4)) / 3),
    kind: "weapon",
  })),
];

export const ENEMY_BY_ID = Object.fromEntries(ENEMIES.map((e) => [e.id, e]));
export const OBJECT_BY_ID = Object.fromEntries(OBJECTS.map((o) => [o.id, o]));
export const WEAPON_BY_ID = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));
export const PICKUP_BY_ID = Object.fromEntries(PICKUPS.map((p) => [p.id, p]));

export function routes() {
  return window.ZOOM_ROUTES || { play: "/zoom", maps: "/zoommaps" };
}
