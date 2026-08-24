/** Zoom — shared catalogs. */

export const CELL = 1.25;
export const MAP_W = 96;
export const MAP_H = 96;
export const SHAPE_FLAT = 0;
export const SHAPE_ROUND = 1;
export const SHAPE_OVAL = 2;
export const SHAPE_SPHERE = 3;

export const SHAPES = [
  { id: SHAPE_FLAT, key: "flat", name: "Flat hall", hint: "Square rooms and halls — flat floor and ceiling." },
  { id: SHAPE_ROUND, key: "round", name: "Round tunnel", hint: "Circular pipe. Thin strokes become tubes; wide fills get barrel vaults." },
  { id: SHAPE_OVAL, key: "oval", name: "Misshapen oval", hint: "Uneven oval tunnels, lumpy organic caves." },
  { id: SHAPE_SPHERE, key: "sphere", name: "Sphere chamber", hint: "Each stamp is a perfect sphere. Overlap them for grotto clusters." },
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

export const FEN = "/games/fenrest/sprites/";
export const ZSPR = "/games/zoom/sprites/";

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

export const ENEMY_BY_ID = Object.fromEntries(ENEMIES.map((e) => [e.id, e]));
export const OBJECT_BY_ID = Object.fromEntries(OBJECTS.map((o) => [o.id, o]));

export function routes() {
  return window.ZOOM_ROUTES || { play: "/zoom", maps: "/zoommaps" };
}
