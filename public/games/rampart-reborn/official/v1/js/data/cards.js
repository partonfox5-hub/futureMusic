/**
 * Card pool for the pre-round card selection phase.
 * duration: 'round' | 'lasting'
 */

export const CARD_POOL = [
  {
    id: 'points_boost',
    name: 'War Chest',
    icon: '💰',
    desc: '+15% points this round',
    duration: 'round',
    apply(ctx, player) {
      ctx.players[player].mods.pointMult = (ctx.players[player].mods.pointMult || 1) * 1.15;
    },
  },
  {
    id: 'boundary_push',
    name: 'Push Boundary',
    icon: '↔',
    desc: 'Shift river 1 tile toward the enemy',
    duration: 'lasting',
    apply(ctx, player) {
      const dir = player === 0 ? 1 : -1;
      ctx.boundaryOffset = (ctx.boundaryOffset || 0) + dir;
      ctx.map?.applyBoundary?.(ctx.boundaryOffset);
    },
  },
  {
    id: 'free_barracks',
    name: 'Free Barracks',
    icon: '⚔',
    desc: 'Place 1 free barracks this build phase',
    duration: 'round',
    apply(ctx, player) {
      ctx.players[player].freeBuildings.push('barracks');
    },
  },
  {
    id: 'free_mason',
    name: 'Master Mason',
    icon: '🧱',
    desc: '1 free mason hut + auto-repair aura',
    duration: 'round',
    apply(ctx, player) {
      ctx.players[player].freeBuildings.push('mason');
      ctx.players[player].mods.masonBoost = true;
    },
  },
  {
    id: 'spawn_surge',
    name: 'Muster Call',
    icon: '📯',
    desc: '+40% spawn rate this round',
    duration: 'round',
    apply(ctx, player) {
      ctx.players[player].mods.spawnMult = (ctx.players[player].mods.spawnMult || 1) * 1.4;
    },
  },
  {
    id: 'reinforced_walls',
    name: 'Reinforced Stone',
    icon: '🪨',
    desc: 'New walls start with +HP this round',
    duration: 'round',
    apply(ctx, player) {
      ctx.players[player].mods.wallHpBonus = 15;
    },
  },
  {
    id: 'raise_terrain',
    name: 'Raise Earth',
    icon: '⛰',
    desc: 'Raise terrain +1 in a 5×5 near your keep',
    duration: 'lasting',
    apply(ctx, player) {
      ctx.players[player].pendingTerrainRaise = true;
    },
  },
  {
    id: 'extra_build_time',
    name: 'Longer Build',
    icon: '⏱',
    desc: '+12s build time this round',
    duration: 'round',
    apply(ctx, player) {
      ctx.players[player].mods.extraBuildTime = 12;
    },
  },
  {
    id: 'unit_damage',
    name: 'Sharpened Steel',
    icon: '🔪',
    desc: 'Units +25% damage this round',
    duration: 'round',
    apply(ctx, player) {
      ctx.players[player].mods.unitDmgMult = (ctx.players[player].mods.unitDmgMult || 1) * 1.25;
    },
  },
  {
    id: 'free_catapult',
    name: 'Siege Gift',
    icon: '🪨',
    desc: '1 free catapult works building',
    duration: 'round',
    apply(ctx, player) {
      ctx.players[player].freeBuildings.push('catapult_maker');
    },
  },
  {
    id: 'free_cannon',
    name: 'Field Piece',
    icon: '💣',
    desc: '+1 free cannon credit',
    duration: 'round',
    apply(ctx, player) {
      ctx.players[player].extraCannons = (ctx.players[player].extraCannons || 0) + 1;
    },
  },
  {
    id: 'archer_focus',
    name: 'Eagle Eye',
    icon: '🏹',
    desc: 'Archers +range and +damage this round',
    duration: 'round',
    apply(ctx, player) {
      ctx.players[player].mods.archerBoost = true;
    },
  },
  {
    id: 'moat_discount',
    name: 'Flood Works',
    icon: '💧',
    desc: '3 free moat segments',
    duration: 'round',
    apply(ctx, player) {
      for (let i = 0; i < 3; i++) ctx.players[player].freeBuildings.push('moat');
    },
  },
  {
    id: 'dock_ready',
    name: 'Harbor Charter',
    icon: '⚓',
    desc: '1 free dock (must place near water)',
    duration: 'round',
    apply(ctx, player) {
      ctx.players[player].freeBuildings.push('dock');
    },
  },
  {
    id: 'watch_out',
    name: 'Sentinel',
    icon: '👁',
    desc: '1 free watchtower',
    duration: 'round',
    apply(ctx, player) {
      ctx.players[player].freeBuildings.push('watchtower');
    },
  },
  {
    id: 'gate_master',
    name: 'Portcullis',
    icon: '🚪',
    desc: '2 free gates',
    duration: 'round',
    apply(ctx, player) {
      ctx.players[player].freeBuildings.push('gate', 'gate');
    },
  },
  {
    id: 'heal_keep',
    name: 'Blessed Keep',
    icon: '✨',
    desc: 'Fully repair your keep(s)',
    duration: 'round',
    apply(ctx, player) {
      ctx.map?.healKeeps?.(player);
    },
  },
  {
    id: 'scorch',
    name: 'Scorched Earth',
    icon: '🔥',
    desc: 'Enemy walls near river take chip damage',
    duration: 'round',
    apply(ctx, player) {
      ctx.map?.chipEnemyNearRiver?.(player, 12);
    },
  },
  {
    id: 'double_flags',
    name: 'Banner Frenzy',
    icon: '⚑',
    desc: 'Flags worth +50% points this round',
    duration: 'round',
    apply(ctx, player) {
      ctx.players[player].mods.flagMult = (ctx.players[player].mods.flagMult || 1) * 1.5;
    },
  },
  {
    id: 'wizard_power',
    name: 'Arcane Focus',
    icon: '🧙',
    desc: 'FPS Wizard spells +40% damage',
    duration: 'round',
    apply(ctx, player) {
      ctx.players[player].mods.wizardBoost = true;
    },
  },
  {
    id: 'knight_charge',
    name: 'Warhorse',
    icon: '🐴',
    desc: 'FPS Knight charge +damage & speed',
    duration: 'round',
    apply(ctx, player) {
      ctx.players[player].mods.knightBoost = true;
    },
  },
  {
    id: 'extra_pieces',
    name: 'Stone Surplus',
    icon: '📦',
    desc: '+4 wall pieces this build',
    duration: 'round',
    apply(ctx, player) {
      ctx.players[player].mods.extraPieces = 4;
    },
  },
  {
    id: 'repair_aura',
    name: 'Restoration',
    icon: '💚',
    desc: 'Slowly auto-repair walls during battle',
    duration: 'round',
    apply(ctx, player) {
      ctx.players[player].mods.battleRepair = true;
    },
  },
  {
    id: 'vision',
    name: 'Scout Network',
    icon: '🔭',
    desc: 'Reveal enemy side (no fog) this round',
    duration: 'round',
    apply(ctx, player) {
      ctx.players[player].mods.fullVision = true;
    },
  },
];

/** Draw `n` unique random cards from the pool. */
export function drawCards(n = 3, rng = Math.random) {
  const pool = [...CARD_POOL];
  const out = [];
  for (let i = 0; i < n && pool.length; i++) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}
