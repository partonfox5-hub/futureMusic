/**
 * Rampart Reborn — global configuration
 * Tweak map size, timings, balance here.
 */

export const CONFIG = {
  // Display
  GAME_WIDTH: 1024,
  GAME_HEIGHT: 640,
  TILE: 16, // pixels per tile (map is scaled to fit)

  // Map (tiles) — large relative to units for strategic play
  MAP_W: 64,
  MAP_H: 40,
  // River / boundary column (tiles). Shifts with cards.
  RIVER_WIDTH: 3,
  // Starting boundary center X
  get RIVER_CENTER() {
    return Math.floor(this.MAP_W / 2);
  },

  // Height system 0–5
  MAX_HEIGHT: 5,
  HEIGHT_MOVE_COST: [1, 1.15, 1.35, 1.6, 1.9, 2.3],
  MAX_CLIMB_WITHOUT_PATH: 1,

  // Rounds
  TOTAL_ROUNDS: 6,

  // Phase timers (seconds)
  TIME_CARDS: 20,
  TIME_BUILD: 45,
  TIME_ARM: 0, // arm phase removed — cannons auto-deploy at battle
  TIME_BATTLE: 50,
  TIME_SCORE: 4,
  TIME_SHOP: 40,

  // Build
  WALL_HP: 40,
  WALL_HP_BONUS: 15, // card: reinforced walls
  KEEP_HP: 200,
  CANNON_FOOTPRINT: 2, // 2x2
  PIECES_PER_BUILD: 14,
  EXTRA_PIECES_MASON: 3,

  // Arm phase: free cannon placement credits each round (in addition to keep bonuses)
  FREE_CANNONS_PER_ROUND: 1,

  // Wall placement: each grid segment costs this many spend points
  WALL_SEGMENT_COST: 1,

  // Each round grants this × current round number to every player (round 1 → 20, round 2 → 40, …)
  ROUND_BONUS_PER_ROUND: 20,

  // Combat
  CANNON_DAMAGE: 31, // ~40% more than prior 22
  // Unlimited range — shots can land anywhere on the map (enemy side included)
  CANNON_RANGE: 0,
  CANNON_COOLDOWN: 2.25, // sec — slow reload between shots
  CANNON_PROJ_SPEED: 144, // ~10% slower than 160 (classic Rampart lob)
  CANNON_MAX_FLIGHT: 3.1, // slightly longer flight so map-wide shots still complete
  CANNON_ARC_HEIGHT: 18, // low arc (original Rampart style)
  // Shared battle ammo for cannons + ironclads
  CANNON_BASE_AMMO_PER_GUN: 4, // shots per cannon at battle start
  STOCKPILE_AMMO_BONUS: 2, // each stockpile building adds this many shots
  STOCKPILE_COST: 10,
  // Archer towers: fast tickle damage
  ARCHER_DAMAGE: 2,
  ARCHER_RANGE: 14,
  ARCHER_COOLDOWN: 0.28,
  CATAPULT_DAMAGE: 35,
  CATAPULT_RANGE: 16,
  CATAPULT_COOLDOWN: 3.5,
  ARROW_SPEED: 380,
  MAX_SIMULTANEOUS_SHOTS_PER_CANNON: 1,

  // Units
  KNIGHT_HP: 45,
  KNIGHT_DMG: 8,
  KNIGHT_SPEED: 55,
  KNIGHT_SPAWN_RATE: 4, // seconds — barracks production
  ROYAL_KNIGHT_HP: 68, // +50%
  ROYAL_KNIGHT_DMG: 12, // +50%
  ROYAL_KNIGHT_SPEED: 82, // +50%
  CAT_UNIT_HP: 70,
  CAT_UNIT_DMG: 22,
  CAT_UNIT_SPEED: 28,
  CAT_SPAWN_RATE: 14,
  SHIP_HP: 80,
  SHIP_DMG: 12,
  SHIP_SPEED: 40,
  IRONCLAD_HP: 140,
  IRONCLAD_DMG: 20,
  IRONCLAD_SPEED: 32,
  IRONCLAD_CANNON_CD: 2.8,
  GRUNT_HP: 30,
  GRUNT_DMG: 5,
  // Land units on water (no bridge): keep 25% speed = 75% slower
  RIVER_SPEED_MULT: 0.25,
  BRIDGE_SEGMENT_COST: 5,

  // Flags
  FLAG_CAPTURE_TIME: 3, // seconds with unit in range
  FLAG_CAPTURE_RANGE: 1, // tiles (Chebyshev) from flag
  FLAG_POINTS: 10,
  FLAGS_PER_SIDE: 2,
  FLAGS_NEUTRAL: 2,
  DESTROY_POINTS: 3, // minimal
  UNIT_KILL_POINTS: 2,
  TERRITORY_POINTS: 1, // per enclosed tile at score phase

  // FPS avatar
  AVATAR_HP: 120,
  WIZARD_DMG: 18,
  WIZARD_AOE: 28,
  KNIGHT_CHARGE_DMG: 32,
  AVATAR_SPEED_WIZ: 90,
  AVATAR_SPEED_KNT: 120,

  // AI
  AI_BUILD_QUALITY: 0.75, // 0–1 how well AI places walls
  AI_AGGRESSION: 0.6,

  // Colors (Phaser hex)
  COLORS: {
    bg: 0x0a0e14,
    grass0: 0x1e3a1e,
    grass1: 0x2a4a2a,
    grass2: 0x365636,
    grass3: 0x426842,
    grass4: 0x4e7a4e,
    grass5: 0x5a8c5a,
    water: 0x1a4a6e,
    river: 0x0f3555,
    wallP0: 0x5a8fd4,
    wallP1: 0xd45a5a,
    wallDamaged: 0x6b5b4a,
    keepP0: 0x3d8bfd,
    keepP1: 0xf85149,
    crater: 0x2a2218,
    moat: 0x1a5a7a,
    fog: 0x000000,
    select: 0xffd700,
    flag: 0xffcc00,
    ghostOk: 0x44ff88,
    ghostBad: 0xff4444,
  },

  // Building catalog (placed during build or bought in shop)
  BUILDINGS: {
    keep: { name: 'Keep', w: 2, h: 2, hp: 200, cost: 0, placeable: false },
    cannon: { name: 'Cannon', w: 2, h: 2, hp: 60, cost: 40, placeable: true, icon: '💣' },
    barracks: { name: 'Barracks', w: 2, h: 2, hp: 80, cost: 55, placeable: true, icon: '⚔' },
    jousting: { name: 'Jousting Field', w: 2, h: 2, hp: 100, cost: 0, placeable: false, icon: '🐴' },
    archer: { name: 'Archer Tower', w: 1, h: 1, hp: 55, cost: 45, placeable: true, icon: '🏹' },
    gate: { name: 'Gate', w: 1, h: 1, hp: 50, cost: 25, placeable: true, icon: '🚪' },
    moat: { name: 'Moat', w: 1, h: 1, hp: 30, cost: 15, placeable: true, icon: '💧' },
    dock: { name: 'Dock', w: 2, h: 1, hp: 70, cost: 50, placeable: true, icon: '⚓' },
    dock_ironclad: { name: 'Ironclad Yard', w: 2, h: 1, hp: 110, cost: 0, placeable: false, icon: '🚢' },
    mason: { name: 'Mason Hut', w: 2, h: 2, hp: 65, cost: 50, placeable: true, icon: '🧱' },
    watchtower: { name: 'Watchtower', w: 1, h: 1, hp: 70, cost: 40, placeable: true, icon: '👁' },
    catapult_maker: { name: 'Catapult Works', w: 2, h: 2, hp: 75, cost: 70, placeable: true, icon: '🪨' },
    bridge: { name: 'Bridge', w: 1, h: 1, hp: 45, cost: 5, placeable: true, icon: '🌉', waterOnly: true },
    stockpile: {
      name: 'Powder Stockpile',
      w: 1,
      h: 1,
      hp: 40,
      cost: 10,
      placeable: true,
      icon: '📦',
    },
  },

  SHOP_UPGRADES: [
    { id: 'spawn_rate', name: 'Faster Spawns', desc: '+20% unit spawn rate', cost: 60, max: 3 },
    { id: 'wall_repair', name: 'Repair All Walls', desc: 'Restore 40% HP to your walls', cost: 35, max: 99 },
    { id: 'hp_boost', name: 'Fortify Structures', desc: '+25% max HP (existing)', cost: 50, max: 2 },
    { id: 'level_up', name: 'Raise Building Level', desc: 'Next click: +1 level (max 5)', cost: 45, max: 99 },
    { id: 'extra_cannon', name: 'Reserve Cannon', desc: '+1 cannon placement credit', cost: 30, max: 5 },
    {
      id: 'upgrade_dock',
      name: 'Ironclad Shipyard',
      desc: 'Upgrade one dock → produces ironclads (ship cannons)',
      cost: 90,
      max: 99,
    },
    {
      id: 'upgrade_barracks',
      name: 'Jousting Field',
      desc: 'Upgrade one barracks → royal knights (+50% stats)',
      cost: 85,
      max: 99,
    },
  ],

  // Unit sprite sheet: 64×64 frames
  UNIT_SPRITE_SIZE: 64,
  UNIT_ANIM_FPS: 8,
};

/** Polyomino shapes (relative coords). Classic Rampart-style. */
export const POLYOMINOES = [
  // I tetromino
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  // O square
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  // T
  [[0, 0], [1, 0], [2, 0], [1, 1]],
  // L
  [[0, 0], [0, 1], [0, 2], [1, 2]],
  // J
  [[1, 0], [1, 1], [1, 2], [0, 2]],
  // S
  [[1, 0], [2, 0], [0, 1], [1, 1]],
  // Z
  [[0, 0], [1, 0], [1, 1], [2, 1]],
  // Plus
  [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
  // Long L
  [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]],
  // U
  [[0, 0], [0, 1], [1, 1], [2, 1], [2, 0]],
  // Domino
  [[0, 0], [1, 0]],
  // Triomino I
  [[0, 0], [1, 0], [2, 0]],
  // Triomino L
  [[0, 0], [0, 1], [1, 1]],
  // Single (repair filler)
  [[0, 0]],
  // Big square 3x3 ring corner
  [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
];

export const PHASES = {
  MENU: 'menu',
  LOBBY: 'lobby',
  CARDS: 'cards',
  BUILD: 'build',
  ARM: 'arm',
  BATTLE: 'battle',
  SCORE: 'score',
  SHOP: 'shop',
  END: 'end',
};

export const OWNERS = {
  NONE: -1,
  P0: 0,
  P1: 1,
  NEUTRAL: 2,
};
