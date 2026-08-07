/**
 * AssetFactory — procedural grid-based pixel-art textures for all structures.
 * No external image hosts; generated once into Phaser's texture manager.
 */

import { CONFIG } from '../data/config.js';

const T = () => CONFIG.TILE;

/** Parse #RRGGBB or 0xRRGGBB to [r,g,b,a] */
function rgba(c, a = 255) {
  if (typeof c === 'string') {
    const n = parseInt(c.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
  }
  return [(c >> 16) & 255, (c >> 8) & 255, c & 255, a];
}

/**
 * Create ImageData-like pixel buffer helpers on a canvas.
 */
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { c, ctx, w, h };
}

function fill(ctx, color, x, y, w, h) {
  const [r, g, b, a] = rgba(color, typeof color === 'object' ? 255 : 255);
  // accept [r,g,b,a] arrays too
  if (Array.isArray(color)) {
    ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${(color[3] ?? 255) / 255})`;
  } else {
    const ch = rgba(color, a);
    ctx.fillStyle = `rgba(${ch[0]},${ch[1]},${ch[2]},${ch[3] / 255})`;
  }
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}

/** Draw pixel grid from string rows (chars map to colors). */
function stamp(ctx, x0, y0, rows, palette) {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const col = palette[ch];
      if (!col) continue;
      fill(ctx, col, x0 + x, y0 + y, 1, 1);
    }
  }
}

export class AssetFactory {
  /**
   * @param {Phaser.Scene} scene
   */
  static generate(scene) {
    const tile = T();
    // Always refresh structure/unit art when code updates (versioned marker)
    const ver = 'rr_v5_ammo';
    if (scene.textures.exists(ver)) return;
    ['rr_ready', 'rr_v2', 'rr_v3_flags', 'rr_v4_anim'].forEach((k) => {
      try {
        if (scene.textures.exists(k)) scene.textures.remove(k);
      } catch (_) {}
    });
    const mark = makeCanvas(1, 1);
    scene.textures.addCanvas(ver, mark.c);
    scene.textures.addCanvas('rr_ready', mark.c);

    this._terrain(scene, tile);
    this._walls(scene, tile);
    this._structures(scene, tile);
    this._units(scene, tile);
    this._flags(scene); // large animated purple flags (transparent)
    this._fx(scene, tile);
  }

  /**
   * Large purple capture flags — transparent bg, 4-frame wave, room for +pts text.
   * Display size ~48×56 world px.
   */
  static _flags(scene) {
    const W = 48;
    const H = 56;
    const frames = 4;
    // Neutral purple + owner-tinted purple variants
    const variants = [
      { key: 'flag', cloth: [0x7b2cbf, 0x9b4de0, 0x5a1a9a], pole: 0x3a2a1a },
      { key: 'flag_0', cloth: [0x5b4dcf, 0x7b6dff, 0x3a2a9a], pole: 0x2a2a3a },
      { key: 'flag_1', cloth: [0x9b3cbf, 0xc45de8, 0x6a1a8a], pole: 0x3a1a2a },
    ];
    for (const v of variants) {
      for (let fr = 0; fr < frames; fr++) {
        const { c, ctx } = makeCanvas(W, H);
        ctx.clearRect(0, 0, W, H); // transparent
        this._drawFlagFrame(ctx, W, H, fr, v.cloth, v.pole);
        this._add(scene, `${v.key}_${fr}`, c);
        if (fr === 0) this._add(scene, v.key, c); // default static key
      }
    }
  }

  static _drawFlagFrame(ctx, W, H, fr, cloth, pole) {
    const wave = Math.sin((fr / 4) * Math.PI * 2) * 3;
    const wave2 = Math.cos((fr / 4) * Math.PI * 2) * 2;
    // pole
    fill(ctx, pole, 6, 4, 3, H - 8);
    fill(ctx, 0x2a1a10, 5, 3, 5, 4); // finial
    fill(ctx, 0xc9a227, 5, 2, 5, 2);
    // cloth — large purple banner with inset area for text
    const cx = 10 + wave;
    const cy = 6 + Math.abs(wave2);
    const cw = 34;
    const ch = 32;
    // outer cloth
    fill(ctx, cloth[0], cx, cy, cw, ch);
    // wave scallops on fly edge
    for (let i = 0; i < 5; i++) {
      const oy = cy + 4 + i * 5 + (fr % 2);
      fill(ctx, cloth[1], cx + cw - 2, oy, 3 + (i % 2) + wave2 * 0.3, 4);
    }
    // highlight stripe
    fill(ctx, cloth[1], cx + 2, cy + 2, cw - 8, 4);
    // darker fold
    fill(ctx, cloth[2], cx + 2, cy + ch - 6, cw - 6, 4);
    // inner panel (darker purple) — point text sits here
    fill(ctx, cloth[2], cx + 5, cy + 9, cw - 12, 14);
    fill(ctx, [155, 77, 224, 70], cx + 6, cy + 10, cw - 14, 12);
    // gold trim
    fill(ctx, 0xd4a017, cx, cy, cw - 2, 2);
    fill(ctx, 0xd4a017, cx, cy + ch - 2, cw - 4, 2);
  }

  static _add(scene, key, canvas) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, canvas);
    try {
      const tex = scene.textures.get(key);
      if (tex && Phaser.Textures?.FilterMode) {
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    } catch (_) {
      /* older Phaser builds */
    }
  }

  /**
   * Register base key + 4 animation frames (subtle smoke/flag/torch flicker).
   * frame 0 === base key for static fallbacks.
   */
  static _addAnim(scene, baseKey, w, h, drawFn) {
    for (let fr = 0; fr < 4; fr++) {
      const { c, ctx } = makeCanvas(w, h);
      ctx.clearRect(0, 0, w, h);
      drawFn(ctx, w, h, fr);
      const key = fr === 0 ? baseKey : `${baseKey}_${fr}`;
      this._add(scene, key, c);
      if (fr === 0) this._add(scene, `${baseKey}_0`, c);
    }
  }

  static _terrain(scene, tile) {
    const grasses = [
      [0x1a3320, 0x243f28, 0x2d4a2d],
      [0x1e3a22, 0x2a4a2a, 0x355835],
      [0x244428, 0x325832, 0x3e663e],
      [0x2a502e, 0x3a663a, 0x487848],
      [0x325c36, 0x427442, 0x528852],
      [0x3a6840, 0x4c844c, 0x5e985e],
    ];
    for (let h = 0; h <= 5; h++) {
      const { c, ctx } = makeCanvas(tile, tile);
      const g = grasses[h];
      fill(ctx, g[0], 0, 0, tile, tile);
      // dither / grass blades
      for (let i = 0; i < 18; i++) {
        const x = (i * 7 + h * 3) % tile;
        const y = (i * 11 + h * 5) % tile;
        fill(ctx, g[1 + (i % 2)], x, y, 1, 1 + (i % 2));
      }
      // height highlight / shadow
      if (h > 0) {
        fill(ctx, [255, 255, 255, 20 + h * 8], 0, 0, tile, 2);
        fill(ctx, [0, 0, 0, 25 + h * 10], 0, tile - 2, tile, 2);
        // cliff edge on north if high
        fill(ctx, [40, 30, 20, 60], 0, 0, tile, 1);
      }
      this._add(scene, `terrain_${h}`, c);
    }
    // Water
    {
      const { c, ctx } = makeCanvas(tile, tile);
      fill(ctx, 0x0f3555, 0, 0, tile, tile);
      for (let i = 0; i < 8; i++) {
        fill(ctx, 0x1a5a8a, (i * 5) % tile, (i * 3 + 2) % tile, 3, 1);
        fill(ctx, 0x2a7aaa, (i * 7 + 2) % tile, (i * 4) % tile, 2, 1);
      }
      this._add(scene, 'terrain_water', c);
    }
    // Crater
    {
      const { c, ctx } = makeCanvas(tile, tile);
      fill(ctx, 0x2a2218, 0, 0, tile, tile);
      fill(ctx, 0x1a1510, 3, 3, tile - 6, tile - 6);
      fill(ctx, 0x3a3020, 5, 5, tile - 10, tile - 10);
      this._add(scene, 'terrain_crater', c);
    }
    // Enclosed tint overlay (semi)
    {
      const { c, ctx } = makeCanvas(tile, tile);
      fill(ctx, [255, 220, 100, 28], 0, 0, tile, tile);
      this._add(scene, 'terrain_enclosed', c);
    }
  }

  static _walls(scene, tile) {
    const defs = [
      { key: 'wall_0', base: 0x4a7ab8, lite: 0x6a9ad8, dark: 0x2a4a78 },
      { key: 'wall_1', base: 0xb85a5a, lite: 0xd87a7a, dark: 0x782a2a },
      { key: 'wall_n', base: 0x6b5b4a, lite: 0x8b7b6a, dark: 0x4b3b2a },
    ];
    for (const d of defs) {
      const { c, ctx } = makeCanvas(tile, tile);
      fill(ctx, d.dark, 0, 0, tile, tile);
      fill(ctx, d.base, 1, 1, tile - 2, tile - 2);
      // brick pattern
      for (let row = 0; row < 4; row++) {
        const yy = 2 + row * 4;
        const off = row % 2 ? 3 : 0;
        for (let col = 0; col < 3; col++) {
          fill(ctx, d.lite, off + col * 5 + 1, yy, 4, 3);
          fill(ctx, d.dark, off + col * 5 + 1, yy + 2, 4, 1);
        }
      }
      this._add(scene, d.key, c);
    }
    // Gate closed / open
    for (const open of [false, true]) {
      const { c, ctx } = makeCanvas(tile, tile);
      fill(ctx, 0x5a4a2a, 0, 0, tile, tile);
      fill(ctx, 0x8b7355, 1, 1, tile - 2, tile - 2);
      if (open) {
        fill(ctx, 0x1a1510, 4, 2, tile - 8, tile - 4);
        fill(ctx, 0xc9a227, 3, 1, 2, tile - 2);
        fill(ctx, 0xc9a227, tile - 5, 1, 2, tile - 2);
      } else {
        // portcullis bars
        for (let i = 0; i < 4; i++) {
          fill(ctx, 0x333, 3 + i * 3, 2, 2, tile - 4);
        }
        fill(ctx, 0xc9a227, 2, 2, tile - 4, 2);
      }
      this._add(scene, open ? 'gate_open' : 'gate_closed', c);
    }
  }

  static _structures(scene, tile) {
    // 1×1 structures
    this._drawArcher(scene, tile);
    this._drawWatchtower(scene, tile);
    this._drawMoat(scene, tile);
    this._drawGateAlreadyDone = true;

    // 2×1 dock / ironclad yard
    this._drawDock(scene, tile);
    this._drawIroncladDock(scene, tile);

    // 2×2 structures
    this._drawKeep(scene, tile, 0);
    this._drawKeep(scene, tile, 1);
    this._drawCannon(scene, tile, 0);
    this._drawCannon(scene, tile, 1);
    this._drawBarracks(scene, tile, 0);
    this._drawBarracks(scene, tile, 1);
    this._drawJousting(scene, tile, 0);
    this._drawJousting(scene, tile, 1);
    this._drawMason(scene, tile, 0);
    this._drawMason(scene, tile, 1);
    this._drawCatapultMaker(scene, tile, 0);
    this._drawCatapultMaker(scene, tile, 1);

    // Bridge planks (1×1, on water)
    this._drawBridge(scene, tile);
    this._drawStockpile(scene, tile);

    // Wall piece ghost preview icon
    {
      const { c, ctx } = makeCanvas(tile, tile);
      fill(ctx, 0x8b7355, 2, 2, tile - 4, tile - 4);
      fill(ctx, 0xc4a574, 3, 3, tile - 6, 3);
      this._add(scene, 'icon_wall', c);
    }
  }

  static _drawStockpile(scene, tile) {
    this._addAnim(scene, 'stockpile', tile, tile, (ctx, w, h, fr) => {
      // crates / powder barrels (transparent bg)
      fill(ctx, 0x6b4423, 2, 6, w - 4, h - 8);
      fill(ctx, 0x8b6433, 3, 5, w - 6, 3);
      fill(ctx, 0x5a3818, 4, 10, 4, h - 14);
      fill(ctx, 0x5a3818, w - 8, 10, 4, h - 14);
      fill(ctx, 0xd4a017, 6, 8, w - 12, 2);
      // barrel tops
      fill(ctx, 0x3a2a1a, 5, h - 7, 6, 4);
      fill(ctx, 0x3a2a1a, w - 11, h - 7, 6, 4);
      if (fr % 2 === 0) fill(ctx, 0x888, 7, 12, 2, 2);
    });
    this._addAnim(scene, 'stockpile_0', tile, tile, (ctx, w, h, fr) => {
      fill(ctx, 0x6b4423, 2, 6, w - 4, h - 8);
      fill(ctx, 0x3d8bfd, 4, 8, w - 8, 2);
    });
    this._addAnim(scene, 'stockpile_1', tile, tile, (ctx, w, h, fr) => {
      fill(ctx, 0x6b4423, 2, 6, w - 4, h - 8);
      fill(ctx, 0xf85149, 4, 8, w - 8, 2);
    });
  }

  static _drawBridge(scene, tile) {
    this._addAnim(scene, 'bridge', tile, tile, (ctx, w, h, fr) => {
      fill(ctx, 0x0f3555, 0, 0, w, h);
      fill(ctx, 0x6b4423, 1, 4, w - 2, h - 8);
      for (let i = 0; i < 4; i++) fill(ctx, 0x5a3818, 2 + i * 4, 4, 1, h - 8);
      fill(ctx, 0x8b6433, 1, 4, w - 2, 1);
      fill(ctx, 0x8b6433, 1, h - 5, w - 2, 1);
      // water sparkle under planks
      if (fr % 2 === 0) fill(ctx, 0x2a7aaa, 3, h - 3, 4, 1);
    });
    this._addAnim(scene, 'bridge_0', tile, tile, (ctx, w, h, fr) => {
      fill(ctx, 0x0f3555, 0, 0, w, h);
      fill(ctx, 0x6b4423, 1, 4, w - 2, h - 8);
    });
    this._addAnim(scene, 'bridge_1', tile, tile, (ctx, w, h, fr) => {
      fill(ctx, 0x0f3555, 0, 0, w, h);
      fill(ctx, 0x6b4423, 1, 4, w - 2, h - 8);
    });
  }

  static _drawIroncladDock(scene, tile) {
    const W = tile * 2;
    const H = tile;
    for (const owner of [0, 1]) {
      this._addAnim(scene, `dock_ironclad_${owner}`, W, H, (ctx, w, h, fr) => {
        fill(ctx, 0x0f3555, 0, 0, w, h);
        fill(ctx, 0x3a3a3a, 1, 2, w - 2, h - 3);
        fill(ctx, 0x222, 2, 4, w - 4, 4);
        fill(ctx, owner === 0 ? 0x3d8bfd : 0xf85149, 4, 3, 6, 2);
        fill(ctx, 0x666, 10, 5, 8, 3);
        if (fr % 2) fill(ctx, 0xffaa44, 40, 6, 3, 2); // forge spark
      });
    }
  }

  static _drawJousting(scene, tile, owner) {
    const S = tile * 2;
    const accent = owner === 0 ? 0x3d8bfd : 0xf85149;
    this._addAnim(scene, `jousting_${owner}`, S, S, (ctx, w, h, fr) => {
      fill(ctx, 0x3a5a2a, 1, 1, w - 2, h - 2);
      fill(ctx, 0x2a4a1a, 2, h - 8, w - 4, 6);
      fill(ctx, 0x8b5a2b, 4, 10, w - 8, 3);
      fill(ctx, accent, 6, 6, 4, 8);
      fill(ctx, accent, w - 10, 6, 4, 8);
      const wave = fr % 2 === 0 ? 0 : 2;
      fill(ctx, 0x444, w / 2, 2, 1, 10);
      fill(ctx, accent, w / 2 + 1 + wave, 2, 7, 5);
    });
  }

  static _drawKeep(scene, tile, owner) {
    const S = tile * 2;
    const stone = owner === 0 ? 0x5a7a9a : 0x9a5a5a;
    const roof = owner === 0 ? 0x3d8bfd : 0xf85149;
    const lite = owner === 0 ? 0x8ab4e8 : 0xf0a0a0;
    this._addAnim(scene, `keep_${owner}`, S, S, (ctx, w, h, fr) => {
      fill(ctx, stone, 2, 10, w - 4, h - 12);
      fill(ctx, lite, 3, 11, w - 6, 3);
      fill(ctx, stone, 2, 4, 8, 14);
      fill(ctx, stone, w - 10, 4, 8, 14);
      for (let i = 0; i < 4; i++) {
        fill(ctx, roof, 2 + i * 4, 2, 3, 4);
        fill(ctx, roof, w - 14 + i * 3, 2, 3, 4);
      }
      fill(ctx, 0x3a2818, w / 2 - 3, h - 10, 6, 8);
      fill(ctx, 0xc9a227, w / 2 - 1, h - 7, 2, 2);
      // waving banner
      const wave = fr % 2 === 0 ? 0 : 2;
      fill(ctx, 0x444, w / 2, 0, 1, 8);
      fill(ctx, roof, w / 2 + 1 + wave, 1, 6, 4);
      // torch flicker
      if (fr % 2 === 0) fill(ctx, 0xffaa44, 4, 12, 2, 3);
      else fill(ctx, 0xff6622, 4, 11, 2, 4);
    });
  }

  static _drawCannon(scene, tile, owner) {
    const S = tile * 2;
    const wood = 0x6b4423;
    const iron = 0x3a3a3a;
    const rim = owner === 0 ? 0x3d8bfd : 0xf85149;
    this._addAnim(scene, `cannon_${owner}`, S, S, (ctx, w, h, fr) => {
      fill(ctx, wood, 4, 18, w - 8, 10);
      fill(ctx, 0x4a3018, 4, 26, w - 8, 2);
      fill(ctx, 0x222, 6, 22, 6, 6);
      fill(ctx, 0x222, w - 12, 22, 6, 6);
      fill(ctx, 0x888, 8, 24, 2, 2);
      fill(ctx, 0x888, w - 10, 24, 2, 2);
      fill(ctx, wood, 8, 12, w - 16, 10);
      fill(ctx, iron, 10, 8, 18, 7);
      fill(ctx, 0x222, 26, 9, 4, 5);
      fill(ctx, 0x111, 28, 10, 3, 3);
      fill(ctx, rim, 12, 14, 8, 2);
      // idle muzzle spark
      if (fr === 1 || fr === 3) fill(ctx, 0xffaa44, 30, 9, 3, 3);
      else fill(ctx, 0x555, 29, 10, 2, 3);
    });
  }

  static _drawBarracks(scene, tile, owner) {
    const S = tile * 2;
    const wall = 0x8b5a2b;
    const roof = owner === 0 ? 0x2a5a9a : 0x9a2a2a;
    this._addAnim(scene, `barracks_${owner}`, S, S, (ctx, w, h, fr) => {
      fill(ctx, wall, 3, 12, w - 6, h - 14);
      fill(ctx, roof, 1, 8, w - 2, 6);
      for (let i = 0; i < 8; i++) {
        fill(ctx, roof, 4 + i, 8 - Math.min(i, 7 - i), 1, 1);
      }
      fill(ctx, 0x3a2818, w / 2 - 3, h - 10, 6, 8);
      // window lamp flicker
      const lamp = fr % 2 === 0 ? 0xffe08a : 0xffcc55;
      fill(ctx, lamp, 6, 16, 4, 4);
      fill(ctx, lamp, w - 10, 16, 4, 4);
      fill(ctx, 0x222, 7, 17, 2, 2);
      fill(ctx, 0xccc, 5, 14, 1, 6);
      fill(ctx, 0xccc, w - 6, 14, 1, 6);
      // chimney smoke puffs
      if (fr > 0) fill(ctx, [200, 200, 200, 100 + fr * 30], w - 8, 4 - fr, 3, 3);
    });
  }

  static _drawMason(scene, tile, owner) {
    const S = tile * 2;
    this._addAnim(scene, `mason_${owner}`, S, S, (ctx, w, h, fr) => {
      fill(ctx, 0x9a8b7a, 3, 10, w - 6, h - 12);
      fill(ctx, 0x6a5b4a, 2, 8, w - 4, 4);
      fill(ctx, owner === 0 ? 0x3d8bfd : 0xf85149, 4, 6, w - 8, 3);
      fill(ctx, 0xbbb, 6, 18, 5, 4);
      fill(ctx, 0x999, 14, 20, 6, 3);
      fill(ctx, 0x777, 22, 18, 4, 5);
      fill(ctx, 0x555, w - 10, 4, 5, 8);
      fill(ctx, 0x888, w - 9, 2, 3, 3);
      // smoke
      fill(ctx, [180, 180, 180, 80 + fr * 40], w - 8, fr, 4, 3);
    });
  }

  static _drawCatapultMaker(scene, tile, owner) {
    const S = tile * 2;
    this._addAnim(scene, `catapult_maker_${owner}`, S, S, (ctx, w, h, fr) => {
      fill(ctx, 0x5a4a3a, 2, 14, w - 4, h - 16);
      fill(ctx, 0x3a2a1a, 2, 12, w - 4, 3);
      fill(ctx, 0x6b4423, 6, 6, 3, 16);
      fill(ctx, 0x6b4423, w - 10, 6, 3, 16);
      fill(ctx, 0x8b6433, 6, 6, w - 12, 3);
      // swinging arm
      const arm = 8 + (fr % 3);
      fill(ctx, 0x4a3020, 8, arm, 14, 2);
      fill(ctx, 0x333, 20, arm - 4, 6, 6);
      fill(ctx, owner === 0 ? 0x3d8bfd : 0xf85149, 4, h - 6, w - 8, 2);
    });
  }

  static _drawArcher(scene, tile) {
    for (const owner of [0, 1]) {
      const wood = 0x6b8f5e;
      const top = owner === 0 ? 0x3d8bfd : 0xf85149;
      this._addAnim(scene, `archer_${owner}`, tile, tile, (ctx, w, h, fr) => {
        fill(ctx, wood, 4, 5, w - 8, h - 6);
        fill(ctx, 0x4a6a40, 5, 6, w - 10, 3);
        fill(ctx, top, 3, 2, w - 6, 5);
        fill(ctx, 0xc4a35a, 6, 1, 4, 3);
        fill(ctx, 0x111, 7, 8, 2, 4);
        // archer bob / arrow
        if (fr % 2 === 0) fill(ctx, 0x8b0000, 9, 6, 5, 1);
      });
    }
  }

  static _drawWatchtower(scene, tile) {
    for (const owner of [0, 1]) {
      this._addAnim(scene, `watchtower_${owner}`, tile, tile, (ctx, w, h, fr) => {
        fill(ctx, 0x708090, 5, 4, 6, h - 4);
        fill(ctx, 0x5a6a7a, 5, 4, 6, 2);
        fill(ctx, owner === 0 ? 0x3d8bfd : 0xf85149, 3, 1, 10, 4);
        const lamp = fr % 2 === 0 ? 0xffe08a : 0xffaa44;
        fill(ctx, lamp, 6, 7, 4, 3);
        fill(ctx, 0x222, 7, 8, 2, 2);
      });
    }
  }

  static _drawMoat(scene, tile) {
    const { c, ctx } = makeCanvas(tile, tile);
    fill(ctx, 0x1a5a7a, 0, 0, tile, tile);
    fill(ctx, 0x0f3555, 2, 2, tile - 4, tile - 4);
    for (let i = 0; i < 5; i++) {
      fill(ctx, 0x2a7a9a, 2 + i * 3, 4 + (i % 3), 2, 1);
    }
    // reeds
    fill(ctx, 0x3a6a3a, 1, 1, 1, 4);
    fill(ctx, 0x3a6a3a, tile - 2, tile - 5, 1, 4);
    this._add(scene, 'moat', c);
  }

  static _drawDock(scene, tile) {
    const W = tile * 2;
    const H = tile;
    const drawDock = (ctx, w, h, fr) => {
      fill(ctx, 0x0f3555, 0, 0, w, h);
      fill(ctx, 0x6b4423, 1, 3, w - 2, h - 5);
      for (let i = 0; i < 6; i++) fill(ctx, 0x5a3818, 2 + i * 5, 3, 1, h - 5);
      fill(ctx, 0x8b6433, 1, 3, w - 2, 1);
      fill(ctx, 0x4a3018, 2, 1, 2, h - 2);
      fill(ctx, 0x4a3018, w - 4, 1, 2, h - 2);
      if (fr % 2 === 0) fill(ctx, 0x2a7aaa, 8, h - 2, 6, 1);
    };
    this._addAnim(scene, 'dock', W, H, drawDock);
    this._addAnim(scene, 'dock_0', W, H, drawDock);
    this._addAnim(scene, 'dock_1', W, H, drawDock);
  }

  static _units(scene, tile) {
    // 64×64 animated frames (4-frame walk) for each unit type × owner
    const S = 64;
    for (const owner of [0, 1]) {
      const col = owner === 0 ? 0x3d8bfd : 0xf85149;
      for (let fr = 0; fr < 4; fr++) {
        this._drawKnightFrame(scene, owner, col, fr, S, 'knight');
        this._drawKnightFrame(scene, owner, col, fr, S, 'royal_knight', true);
        this._drawCatFrame(scene, owner, col, fr, S);
        this._drawShipFrame(scene, owner, col, fr, S, false);
        this._drawShipFrame(scene, owner, col, fr, S, true);
        this._drawGruntFrame(scene, owner, col, fr, S);
      }
    }
    // Flags generated separately in _flags() — large purple animated
  }

  static _drawKnightFrame(scene, owner, col, fr, S, type = 'knight', royal = false) {
    const { c, ctx } = makeCanvas(S, S);
    ctx.clearRect(0, 0, S, S);
    const bob = fr % 2 === 0 ? 0 : 2;
    const leg = fr === 1 || fr === 2 ? 4 : 0;
    // shadow
    fill(ctx, [0, 0, 0, 50], 18, 50, 28, 8);
    // body
    fill(ctx, col, 22, 22 + bob, 20, 22);
    fill(ctx, royal ? 0xffd700 : 0xccc, 26, 18 + bob, 12, 10); // helm
    fill(ctx, 0xffe0c0, 28, 24 + bob, 8, 6); // face
    // lance / sword
    fill(ctx, 0xaaa, 42, 20 + bob, 14, 3);
    if (royal) fill(ctx, 0xffd700, 20, 28 + bob, 6, 10); // cape
    // legs
    fill(ctx, 0x333, 24, 42 + bob, 6, 10 + leg);
    fill(ctx, 0x333, 34, 42 + bob, 6, 10 - leg);
    this._add(scene, `unit_${type}_${owner}_${fr}`, c);
    if (fr === 0) this._add(scene, `unit_${type}_${owner}`, c);
  }

  static _drawCatFrame(scene, owner, col, fr, S) {
    const { c, ctx } = makeCanvas(S, S);
    ctx.clearRect(0, 0, S, S);
    const wheel = fr * 2;
    fill(ctx, [0, 0, 0, 40], 12, 48, 40, 8);
    fill(ctx, 0x6b4423, 10, 30, 44, 16);
    fill(ctx, col, 16, 18, 28, 16);
    fill(ctx, 0x333, 36, 12, 14, 14);
    fill(ctx, 0x222, 14 + (wheel % 6), 42, 10, 10);
    fill(ctx, 0x222, 40 + (wheel % 6), 42, 10, 10);
    this._add(scene, `unit_catapult_${owner}_${fr}`, c);
    if (fr === 0) this._add(scene, `unit_catapult_${owner}`, c);
  }

  static _drawShipFrame(scene, owner, col, fr, S, ironclad) {
    const type = ironclad ? 'ironclad' : 'ship';
    const { c, ctx } = makeCanvas(S, S);
    ctx.clearRect(0, 0, S, S);
    const wave = fr % 2 === 0 ? 0 : 1;
    fill(ctx, 0x1a4a6e, 4, 40 + wave, 56, 12);
    if (ironclad) {
      fill(ctx, 0x2a2a2a, 8, 24 + wave, 48, 20);
      fill(ctx, 0x444, 12, 18 + wave, 40, 12);
      fill(ctx, col, 28, 14 + wave, 8, 8);
      fill(ctx, 0x111, 40, 26 + wave, 10, 6); // gun
    } else {
      fill(ctx, 0x5c4033, 8, 28 + wave, 48, 16);
      fill(ctx, col, 30, 12 + wave, 4, 22);
      fill(ctx, 0xfff, 34, 14 + wave, 14, 12);
    }
    this._add(scene, `unit_${type}_${owner}_${fr}`, c);
    if (fr === 0) this._add(scene, `unit_${type}_${owner}`, c);
  }

  static _drawGruntFrame(scene, owner, col, fr, S) {
    const { c, ctx } = makeCanvas(S, S);
    ctx.clearRect(0, 0, S, S);
    const bob = fr % 2;
    fill(ctx, [0, 0, 0, 40], 20, 48, 24, 6);
    fill(ctx, 0x6a4a3a, 22, 26 + bob, 20, 18);
    fill(ctx, 0xc4a07a, 26, 18 + bob, 12, 12);
    fill(ctx, col, 18, 30 + bob, 6, 8);
    fill(ctx, 0x333, 24, 44 + bob, 6, 10);
    fill(ctx, 0x333, 34, 44 + bob, 6, 10);
    this._add(scene, `unit_grunt_${owner}_${fr}`, c);
    if (fr === 0) this._add(scene, `unit_grunt_${owner}`, c);
  }

  static _fx(scene, tile) {
    // cannonball
    {
      const { c, ctx } = makeCanvas(8, 8);
      fill(ctx, 0x222, 1, 1, 6, 6);
      fill(ctx, 0x555, 2, 2, 3, 3);
      fill(ctx, 0xaaa, 2, 2, 1, 1);
      this._add(scene, 'proj_ball', c);
    }
    // arrow
    {
      const { c, ctx } = makeCanvas(10, 4);
      fill(ctx, 0xc4a35a, 0, 1, 8, 2);
      fill(ctx, 0xccc, 7, 0, 3, 4);
      fill(ctx, 0x8b0000, 0, 1, 2, 2);
      this._add(scene, 'proj_arrow', c);
    }
    // crosshair
    {
      const { c, ctx } = makeCanvas(24, 24);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(12, 12, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 12);
      ctx.lineTo(7, 12);
      ctx.moveTo(17, 12);
      ctx.lineTo(24, 12);
      ctx.moveTo(12, 0);
      ctx.lineTo(12, 7);
      ctx.moveTo(12, 17);
      ctx.lineTo(12, 24);
      ctx.stroke();
      this._add(scene, 'crosshair', c);
    }
    // impact ring
    {
      const { c, ctx } = makeCanvas(16, 16);
      ctx.strokeStyle = 'rgba(255,200,80,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(8, 8, 6, 0, Math.PI * 2);
      ctx.stroke();
      this._add(scene, 'impact', c);
    }
  }

  /** Texture key for a building cell (top-left stamp). */
  static buildingKey(type, owner = 0, gateOpen = false) {
    if (type === 'gate') return gateOpen ? 'gate_open' : 'gate_closed';
    if (type === 'moat') return 'moat';
    if (type === 'bridge') return 'bridge';
    if (type === 'dock') return 'dock';
    if (type === 'wall') return `wall_${owner === 0 || owner === 1 ? owner : 'n'}`;
    const o = owner === 0 || owner === 1 ? owner : 0;
    if (type === 'stockpile') return `stockpile_${o}`;
    const keyed = [
      'keep',
      'cannon',
      'barracks',
      'jousting',
      'archer',
      'watchtower',
      'mason',
      'catapult_maker',
      'dock_ironclad',
    ];
    if (keyed.includes(type)) return `${type}_${o}`;
    return `wall_${o}`;
  }

  static isMultiTile(type) {
    const def = CONFIG.BUILDINGS[type];
    return def && (def.w > 1 || def.h > 1);
  }
}
