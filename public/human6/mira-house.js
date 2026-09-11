/**
 * House architecture pack — arrange rooms with the existing modular builder.
 * Does not replace wall cells, door physics, or destruction.
 *
 *   import {createHouseWorld, realizeFloorplan, PRECISE_PLAN} from './mira-house.js';
 *   const world = createHouseWorld(scene);
 *   realizeFloorplan(world, PRECISE_PLAN);
 */
export {
  CELL, STORY, WALL_H, WALL_T, STORY_Y,
  snapCell, cell,
  doorHole, winHole, garageHole, stairHole, openingHole, combineHoles,
  createHouseKit, createHouseWorld, clearHouse,
  realizeFloorplan, addRoomLabels, addCellGrid,
  AS_BUILT_PLAN, PRECISE_PLAN, PLANS
} from './mira-v2-floorplan.js?v=17.5.0';
export {HouseDoors} from './mira-v2-doors.js?v=17.5.0';
export {Builder, layout, SURFACES} from './mira-v2-builder.js?v=17.5.0';
export {makeSurfaceMap, wallMaterial} from './mira-v2-walls.js?v=17.5.0';
export {placeStairs} from './mira-v2-furniture.js?v=17.5.0';
export {Destruction} from './mira-v2-destruction.js?v=17.5.0';
export {HUMAN5, ASTRA_RULES, briefFor, sessionPrompt} from './mira-context.js';

export const HOUSE = {
  three: '0.170.0',
  cell: .6,
  story: 3.05,
  wallHeight: 3,
  wallThick: .14,
  files: [
    'mira-house.js',
    'mira-v2-floorplan.js',
    'mira-v2-doors.js',
    'mira-v2-walls.js',
    'mira-v2-builder.js',
    'mira-v2-destruction.js',
    'mira-v2-furniture.js',
    'mira-v2-sfx.js',
    'mira-v2-house.js'
  ],
  keep: [
    'Destruction.panel cell walls (do not rewrite)',
    'doorHole / winHole padding (CELL*.55)',
    'HouseDoors hinge / latch / casing',
    'placeStairs rise/run/width unless the brief changes stairs',
    'stair bottom in open living room, not into a hallway wall'
  ]
};
