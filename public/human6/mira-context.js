/**
 * Human5 unifying context — project memory for Astra (and anyone splitting packs).
 *
 * Pure data. No Three.js. Leaf module: do not import body / furniture / lighting from here.
 *
 *   import {HUMAN5, ASTRA_RULES, briefFor, sessionPrompt} from './mira-context.js';
 *
 * When improving one pack, read HUMAN5.packs[name], HUMAN5.crossCuts, HUMAN5.host,
 * and HUMAN5.contracts so the change still composes in engine.js.
 */
export const HUMAN5 = {
  name: 'Human5',
  title: 'Mira · Human simulator',
  what: 'A first-person / Quest WebXR house you share with Mira (and optionally a dog, cat, cars, guns). Desktop orbit or pointer-lock WASD. Not Unreal, not photogrammetry, not a full cloth/ragdoll solver — approximations stay Quest-bounded.',
  url: 'https://futuremusic.online/human5/',
  local: 'http://localhost:8765/human5/',
  repo: 'https://github.com/partonfox5-hub/futureMusic.git',
  path: 'public/human5/',
  three: '0.170.0',
  units: 'meters',
  up: 'Y',
  gravity: 9.81,
  cacheQuery: 'v',
  version: {
    local: '16.2',
    production: '16.0',
    productionCommit: '7694c21',
    productionUrl: 'https://futuremusic.online/human5/?v=16.0',
    localUrl: 'http://localhost:8765/human5/?v=16.2',
    push: 'Do not git push unless the owner asked. Never force-push origin master.'
  },
  hosts: {
    engine: 'engine.js',
    boot: 'mira-boot.js',
    page: 'index.html'
  },

  boot: [
    'index.html importmap pins three@0.170.0',
    'mira-boot.js fills HUD selects, then import("./engine.js?v=")',
    'engine.js builds renderer, createStudioLights, createMiraSystem, MiraWorld, Props, cars, fire, weather, dogs, voice, HUD'
  ],

  mira: {
    glb: 'assets/mira.glb?v=13',
    tex: 'assets/tex/?v=r12',
    verts: 14164,
    morphs: 49,
    bones: 103,
    height: 1.68,
    versions: ['v1', 'v2'],
    keep: [
      'body vertex count and order',
      '49 named morphs',
      '103 bone names (Head, L_Eye, L_Breast, L_Hand, Hip, …)',
      '4-bone skin weights',
      'separate meshes: body, eyes, teeth, hair, lashes',
      'createMiraSystem as the runtime — wrap, do not replace',
      'wrapped Lambert skin in mira-v2.js — not MeshPhysical transmission'
    ]
  },

  renderer: {
    outputColorSpace: 'sRGB',
    toneMapping: 'ACESFilmic',
    exposure: 1.05,
    environmentIntensity: 0.65,
    shadows: {desktop: 'PCFSoftShadowMap', quest: 'BasicShadowMap'},
    pixelRatio: {desktop: 1.5, quest: 1.12},
    antialias: {desktop: true, quest: false}
  },

  scenes: ['Living room', 'Jungle', 'Beach'],
  livingRoom: {
    house: 'mira-v2-house.js',
    stairs: {bottom: [-0.16, 0.02, 2.40], yaw: Math.PI, steps: 16, run: 0.2625, width: 1.10},
    piano: {position: [-4.95, 0, -1.12], yaw: 0, mp3: 'assets/piano/'},
    fireplace: [-5.15, 0, 4.18],
    extinguisherCase: [-3.78, 1.18, 4.28],
    gym: [10.05, 0.06, 1.15],
    cars: 'two sedans in garage stalls, Pacejka-ish; reverse idle creep when gear=R'
  },

  packs: {
    body: {
      id: 'mira-body',
      api: 'mira-body.js',
      folder: 'mira-body-pack/',
      owns: 'skinned Mira, face morphs, hair cards, XPBD tissue, triangle contact, haptics, social hug, wrapped skin shader',
      mustNot: 'house, guns, piano mesh, weather, cars, dogs, voice, wardrobe',
      entry: 'installMiraBody / createMiraSystem'
    },
    furniture: {
      id: 'furniture',
      api: 'mira-furniture.js',
      folder: 'furniture-pack/',
      owns: 'detailed furniture meshes, tagMovable mass/AABB, stairs builder, piano + MP3, destruction register/panel',
      mustNot: 'Mira shader, studio lights, guns, cars, grab/throw loop',
      grabLivesIn: 'mira-v2-props.js Props.tickFurniture / holdFurniture (one implementation)',
      entry: 'createFurnitureWorld / tagMovable / detail* / installPiano'
    },
    lighting: {
      id: 'lighting',
      api: 'mira-lighting.js',
      folder: 'lighting-pack/',
      owns: 'createStudioLights (hemi/key/fill/rim/ambient/PMREM), RoomLight XR light-estimation',
      mustNot: 'Mira retopo, furniture meshes',
      also: 'house point lamps stay in mira-v2-house.js; weather may retint key/fill/rim',
      entry: 'createStudioLights / RoomLight'
    },
    house: {
      id: 'house',
      api: 'mira-house.js',
      folder: 'house-pack/',
      owns: 'living-room floorplan as data: rooms, slabs, wall segments, door/window holes, HouseDoors, stairs, roof, lamps, garage stalls — realized through existing panel/doors/stairs',
      mustNot: 'rewrite Destruction.panel, doorHole padding, HouseDoors physics, Mira, guns, cars, piano mesh, lighting lookdev',
      entry: 'createHouseWorld / realizeFloorplan(PRECISE_PLAN|AS_BUILT_PLAN)'
    },
    context: {
      id: 'context',
      api: 'mira-context.js',
      folder: 'context-pack/',
      owns: 'this spec — how packs compose, hard limits, gaps still in the host, conversational brief',
      mustNot: 'meshes, shaders, lights, physics implementations'
    }
  },

  host: {
    engine: 'Composes packs: renderer, createStudioLights, createMiraSystem, MiraWorld, Props, cars, fire, weather, dogs, voice, HUD.',
    world: 'mira-v2-world.js — scene graph, floors, A* walk, seats, sit IK (including piano hands/feet), floorHeight, obstacles.',
    house: 'mira-v2-house.js — production living-room layout (buildHouse). Architecture pack (mira-house.js) can realize a CELL-grid plan; do not switch the host until promoted.',
    props: 'mira-v2-props.js — grab/throw, guns, recoil/full-auto, sniper ADS overlay, furniture hold, piano click-before-fire, cased-item gravity skip.',
    firearms: 'mira-v2-firearms.js — rifle/shotgun/sniper meshes; sniper has scopeLens (objective) + scopeEye (ocular).',
    cars: 'mira-v2-car.js — two driveable sedans; reverse idle creep when in R without throttle/brake.',
    fire: 'mira-v2-fire.js — hearth, one wall-mounted extinguisher in a red glass case (item.cased).',
    weather: 'mira-v2-weather.js — sky/rain/snow; may retint key/fill/rim. Quest uses cheaper FBM, no weather raycast.',
    dogs: 'mira-v2-dog.js — dog + cat. Not in any pack.',
    wardrobe: 'mira-v2-wardrobe.js — cloth XPBD. Not in any pack.',
    voice: 'mira-voice-v2.js + /api/mira/* — not in any pack.',
    destruction: 'mira-v2-destruction.js — panel() instanced cells vs register() one whole mesh. House slabs use panel(..., {skipObstacle:true}).'
  },

  hostFiles: {
    'engine.js': 'Host composer',
    'mira-boot.js': 'HUD + dynamic engine import',
    'index.html': 'Page, importmap, HUD markup',
    'mira-v2-world.js': 'Scenes, A*, seats, sit IK',
    'mira-v2-house.js': 'Living-room floorplan',
    'mira-v2-props.js': 'Grab, guns, furniture hold',
    'mira-v2-firearms.js': 'Gun meshes + scope',
    'mira-v2-car.js': 'Sedans',
    'mira-v2-fire.js': 'Hearth + extinguisher case',
    'mira-v2-weather.js': 'Sky / precipitation',
    'mira-v2-dog.js': 'Dog and cat',
    'mira-v2-wardrobe.js': 'Cloth',
    'mira-voice-v2.js': 'Chat / TTS',
    'mira-v2-builder.js': 'Terrain builder',
    'mira-v2-locomotion.js': 'XR smooth move',
    'mira-v2-gadgets.js': 'Held gadgets',
    'mira-v2-injuries.js': 'Wound overlay',
    'mira-v2-restraints.js': 'Restraints UI',
    'mira-vr-menu.js': 'In-headset menu'
  },

  contracts: {
    world: {
      obstacle: '{x,z,w,d,y,h,object?} AABB in XZ, height Y. Walk, player, bullets, cars use world.obstacle / blocked / project.',
      seats: '{group, position, yaw, approach, occupant, piano?, keyboard?, sitDuration}',
      pickables: 'meshes the raycaster hits',
      movables: 'groups with userData.furniture',
      gravity: 9.81,
      revision: 'incremented on setScene; props/fire rebuild from this',
      pathfinding: 'local A* step 0.28, pad 5m, 8000 nodes'
    },
    actor: {
      world: 'set by engine via mira.setEnvironment(world)',
      seat: 'when set, world.after() owns leg/arm IK; poseArms/poseActivity no-op',
      version: "'v2' for the current Mira",
      shape: 'slider keys: height waist hips breast butt thigh gap arms jiggle + V2 extras'
    },
    furniture: {
      tagMovable: 'sets userData.furniture {id,mass,velocity,obstacle,health}',
      furnitureRoot: 'walk mesh → movable group',
      syncFurniture: 'call after a held piece moves',
      mass: 'volume * blendedDensity * 0.28, clamped 4..160 kg',
      grab: 'ONE loop: Props.tickFurniture / holdFurniture — do not fork'
    },
    destruction: {
      panel: 'instanced cells (floors, walls, TV glass). options.skipObstacle skips walk blockers.',
      register: 'one whole mesh (do not use for floors/ceilings — they nuke as one piece)',
      kinds: 'plaster, wood, glass, metal, …',
      tv: 'screen = panel(..., "glass", {cell:.2, skipObstacle:true}); bezel metal; stand wood'
    },
    lighting: {
      createStudioLights: 'returns {hemi,key,fill,rim,ambient,env,exposure}',
      RoomLight: 'XR only: start(session), tick(frame), stop()',
      desktopUnaffectedByXR: true,
      houseLamps: 'warm PointLights in mira-v2-house.js (gndLights) — not this pack'
    },
    house: {
      cell: 0.6,
      wall: 'Destruction.panel instanced cells; thickness 0.14; height 3; story 3.05',
      holes: 'doorHole / winHole (CELL*.55 pad). Do not fork.',
      doors: 'HouseDoors.place only',
      stairs: 'placeStairs; bottom in open living room; interior wall needs a stairwell hole',
      authoring: 'edit PRECISE_PLAN in mira-v2-floorplan.js; production remains buildHouse until promoted'
    },
    piano: {
      mesh: 'installPiano in mira-v2-piano.js (furniture pack)',
      audio: 'MP3 under assets/piano/{elise,prelude,joy,minuet,twinkle}.mp3 while Mira sits',
      playerKeys: 'palm hit volume expanded toward the bench (z further toward player)',
      sitIk: 'world.after — feet toward keyboard (bench local −Z); hands .61±hx so L/R not crossed',
      poseSkip: 'poseArms / poseActivity no-op when actor.seat is set',
      clickBeforeFire: 'piano click is tested before gun fire in Props'
    },
    cars: {
      reverseIdle: 'gear R, no user throttle/brake: throttle .33, cap speed −.63 m/s',
      count: 2,
      mass: 1250
    },
    fire: {
      extinguishers: 'exactly 1 per living room, wall case, glass front, health 8',
      cased: 'item.cased=true while parented to the case; Props.tick skips gravity until hold() clears cased'
    },
    sniper: {
      objective: 'userData.scopeLens',
      ocular: 'userData.scopeEye',
      ads: 'Circle+Ring overlay on camera when VR eye-near-ocular or desktop aligned; RT 384/512, FOV 7'
    },
    input: {
      desktop: 'orbit drag; first-person pointer lock WASD; click uses / fires; Q drop; E car',
      vr: 'grip grab, trigger use/fire, left stick move, right stick turn, Y menu, left trigger sprint',
      fullAuto: 'rifle auto:true polls XR button 0 / desktopTrigger (set inside props.desktop() because engine capture stopImmediatePropagation blocks canvas pointerdown)'
    }
  },

  crossCuts: [
    {
      id: 'piano-sit',
      packs: ['furniture', 'body'],
      host: 'mira-v2-world.js after/before',
      note: 'Furniture owns mesh + MP3 + key collision. Body must not fight seated IK (poseArms skip). Sit IK, walk-to-bench, and finger curl live in MiraWorld — not in either pack.'
    },
    {
      id: 'furniture-grab',
      packs: ['furniture'],
      host: 'mira-v2-props.js',
      note: 'Furniture pack tags mass/AABB. Props is the only grab/throw/gravity. Do not add a second physics loop in the furniture pack.'
    },
    {
      id: 'lighting-vs-ar',
      packs: ['lighting', 'body'],
      host: 'engine.js enterPassthrough',
      note: 'createStudioLights is desktop/VR. RoomLight is XR light-estimation. Desktop studio lights must not change when AR is off. Body harness may use RoomLight; house lamps stay in house.js.'
    },
    {
      id: 'weather-tint',
      packs: ['lighting'],
      host: 'mira-v2-weather.js',
      note: 'Weather may retint key/fill/rim. Do not bake weather colors into createStudioLights.'
    },
    {
      id: 'destruction',
      packs: ['furniture'],
      host: 'mira-v2-house.js slabs, mira-v2-props.js impact',
      note: 'Floors/ceilings/TV glass use panel() cells. register() is for whole objects. Props.impact drives breaks.'
    },
    {
      id: 'cased-extinguisher',
      packs: ['furniture'],
      host: 'mira-v2-fire.js + Props.tick',
      note: 'Not a gun-rack item. Wall case. Gravity skip via item.cased until held.'
    },
    {
      id: 'house-plan',
      packs: ['house', 'furniture'],
      host: 'mira-v2-house.js buildHouse until promoted',
      note: 'Rearrange rooms with realizeFloorplan + CELL 0.6. Keep Destruction.panel, doorHole/winHole, HouseDoors, placeStairs. Stair bottom stays in open living room with a hole in the interior wall. Furniture pack owns meshes; house pack only moves anchors.'
    },
    {
      id: 'mira-seated-pose',
      packs: ['body'],
      host: 'mira-v2-world.js',
      note: 'When actor.seat is set, world.after owns legs/arms/fingers. Body poseArms/poseActivity must no-op or they fight piano/chair IK.'
    }
  ],

  gaps: [
    'Production house still buildHouse in mira-v2-house.js — house-pack PRECISE_PLAN is the redesign surface until promoted',
    'Grab/throw loop (Props) — furniture pack documents it but does not duplicate it',
    'Guns, recoil, sniper overlay (mira-v2-props.js / firearms)',
    'Cars (mira-v2-car.js)',
    'Weather sky/rain/snow (mira-v2-weather.js)',
    'Dogs and cat (mira-v2-dog.js)',
    'Wardrobe cloth XPBD (mira-v2-wardrobe.js)',
    'Voice / chat (mira-voice-v2.js)',
    'Pathfinding and piano sit IK (mira-v2-world.js after/before/walk)',
    'Castle, terrain flora, laundry appliances'
  ],

  facts: [
    'Stairs start in the open living room (z=2.40, yaw π), not into the hallway wall. Interior wall at z=-1.6 has a stairwell hole |x+.16|<.72.',
    'One fire extinguisher, wall-mounted in a red glass case (not on the gun rack, not on the floor).',
    'TV screen is destructible glass cells; the stand is wood/metal.',
    'Piano: MP3 under assets/piano/ while Mira sits and fingers move; player key volume is enlarged toward the bench.',
    'Reverse: gear R and no throttle/brake, the car creeps back at about 0.63 m/s (throttle 0.33).',
    'Needboard is a separate local-only app. Human5 is public/human5 on futuremusic.online.',
    'Horde WebXR is always production at /horde — unrelated to these packs.',
    'Serve over HTTP. file:// fails ES modules and the GLB. Local: python -m http.server 8765 from public/. Packs in Downloads: port 8777.'
  ],

  doNot: [
    'Retopologize or replace Mira from a concept image',
    'Change body vertex count/order, morph names, or bone names',
    'Replace createMiraSystem',
    'Switch the runtime to Unreal, 3DGS, or NeRF',
    'Use MeshPhysical transmission as skin',
    'Edit a pack you were not assigned; if a contract forces a one-line host fix, say so',
    'Duplicate grab/throw or lighting in a pack that does not own it',
    'Force-push origin master',
    'Assume file:// works — serve over HTTP',
    'Push to production unless the owner asked'
  ],

  attach: {
    how: 'Give Astra this context pack PLUS the assigned feature pack. If only one folder is attached, that folder should still contain mira-context.js and context-pack/ASTRA.md.',
    order: [
      'Read context-pack/ASTRA.md (conversational brief)',
      'Read mira-context.js (machine spec) or call briefFor(pack) / sessionPrompt(pack)',
      'Read the assigned pack WIRING.md',
      'Edit only that pack unless a contract forces a host one-liner',
      'Cache-bump ?v= on edited imports',
      'Do not push unless asked'
    ]
  }
};

export const ASTRA_RULES = [
  'Read HUMAN5 (mira-context.js) and context-pack/ASTRA.md before editing a pack.',
  'Stay inside the assigned pack unless a shared contract is broken — then change the smallest host line and say why.',
  'Keep Mira 14164 verts / 49 morphs / 103 bones.',
  'Keep Three.js r170 and ES modules with ?v= cache bust.',
  'Furniture collision stays AABB obstacles; do not invent a second grab system.',
  'Lighting: RoomLight is XR-only; desktop studio lights stay createStudioLights.',
  'Piano: MP3 in assets/piano while Mira sits; player keys use the enlarged pad; sit IK is in world.after.',
  'House architecture: edit PRECISE_PLAN; keep panel/doorHole/HouseDoors/placeStairs; do not promote over buildHouse unless asked.',
  'One fire extinguisher per living room, wall case with glass, not the gun rack.',
  'TV screen is glass cells (destruction kind glass); stand is wood/metal.',
  'Do not push to production unless the owner asked.'
];

export const HUMAN5_FILES = {
  context: ['mira-context.js', 'context-pack/'],
  body: HUMAN5.packs.body,
  furniture: HUMAN5.packs.furniture,
  lighting: HUMAN5.packs.lighting,
  house: HUMAN5.packs.house,
  host: ['engine.js', 'mira-boot.js', 'index.html', 'mira-v2-world.js', 'mira-v2-props.js', 'mira-v2-house.js']
};

export function briefFor(pack) {
  const p = HUMAN5.packs[pack];
  if (!p) return 'Unknown pack. Valid: body, furniture, lighting, house, context.';
  const cuts = HUMAN5.crossCuts.filter(c => c.packs.includes(pack));
  return [
    'Human5 context brief for pack: ' + pack,
    'API: ' + p.api + '  folder: ' + p.folder,
    'Owns: ' + p.owns,
    'Must not touch: ' + (p.mustNot || 'other packs'),
    'Host composer: engine.js. World: mira-v2-world.js. Interaction: mira-v2-props.js.',
    'Hard Mira limits: ' + HUMAN5.mira.verts + ' verts, ' + HUMAN5.mira.morphs + ' morphs, ' + HUMAN5.mira.bones + ' bones.',
    'Three.js ' + HUMAN5.three + ', meters, Y-up, g=' + HUMAN5.gravity + '.',
    'Cross-cuts for this pack: ' + (cuts.map(c => c.id + ' — ' + c.note).join(' | ') || 'none'),
    'Gaps still only in the host: ' + HUMAN5.gaps.slice(0, 4).join('; ') + '.',
    'Rules: ' + ASTRA_RULES.slice(0, 4).join(' ')
  ].join('\n');
}

/** Full prompt to paste at the start of an Astra session that only has one pack. */
export function sessionPrompt(pack) {
  const p = HUMAN5.packs[pack] || HUMAN5.packs.context;
  const cuts = HUMAN5.crossCuts.filter(c => !pack || pack === 'context' || c.packs.includes(pack));
  return [
    'You are working on Human5 (' + HUMAN5.title + '). ' + HUMAN5.what,
    '',
    'Live: ' + HUMAN5.url + '  Local: ' + HUMAN5.local + '  Repo path: ' + HUMAN5.path,
    'Local cache ' + HUMAN5.version.local + ' · production ' + HUMAN5.version.production + ' (' + HUMAN5.version.push + ')',
    'Three.js ' + HUMAN5.three + ' ES modules. Units meters, Y-up, g=' + HUMAN5.gravity + '. Cache-bust imports with ?v=.',
    '',
    'Boot: ' + HUMAN5.boot.join(' → '),
    '',
    'Assigned pack: ' + (pack || 'context'),
    'API ' + p.api + ' in ' + p.folder,
    'You own: ' + p.owns,
    'You must not: ' + (p.mustNot || 'implement other packs'),
    '',
    'Mira mesh contract: ' + HUMAN5.mira.verts + ' verts, ' + HUMAN5.mira.morphs + ' morphs, ' + HUMAN5.mira.bones + ' bones. Wrap createMiraSystem; do not replace. ' + HUMAN5.mira.keep.join('; ') + '.',
    '',
    'How packs compose:',
    Object.entries(HUMAN5.packs).map(([k, v]) => '  - ' + k + ': ' + v.api + ' — ' + v.owns).join('\n'),
    '',
    'Host still owns: ' + Object.entries(HUMAN5.host).map(([k, v]) => k + ' (' + v + ')').join('; '),
    '',
    'Shared contracts:',
    '  obstacles ' + HUMAN5.contracts.world.obstacle,
    '  seats ' + HUMAN5.contracts.world.seats,
    '  furniture grab ' + HUMAN5.contracts.furniture.grab,
    '  lights ' + HUMAN5.contracts.lighting.createStudioLights + '; ' + HUMAN5.contracts.lighting.RoomLight,
    '  piano sit IK ' + HUMAN5.contracts.piano.sitIk,
    '',
    'Cross-cutting facts (do not violate even if you only edit one pack):',
    cuts.map(c => '  - ' + c.id + ': ' + c.note).join('\n'),
    '',
    'Current house facts:',
    HUMAN5.facts.map(f => '  - ' + f).join('\n'),
    '',
    'Do not: ' + HUMAN5.doNot.join('; ') + '.',
    '',
    'Session order: ' + HUMAN5.attach.order.join(' → ')
  ].join('\n');
}
