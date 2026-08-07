/**
 * ShopIcons — transparent PNG icons for post-round market (64×64 crisp pixel art).
 */

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

function px(ctx, color, x, y, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}

/** Soft drop-shadow under icon body */
function shadow(ctx, x, y, w, h) {
  px(ctx, 'rgba(0,0,0,0.25)', x + 2, y + 2, w, h);
}

const DRAWS = {
  cannon(ctx) {
    shadow(ctx, 10, 38, 44, 14);
    px(ctx, '#5a3818', 12, 40, 40, 12);
    px(ctx, '#6b4423', 12, 38, 40, 10);
    px(ctx, '#1a1a1a', 14, 44, 10, 10);
    px(ctx, '#1a1a1a', 40, 44, 10, 10);
    px(ctx, '#555', 17, 47, 4, 4);
    px(ctx, '#555', 43, 47, 4, 4);
    px(ctx, '#4a4a4a', 16, 26, 30, 16);
    px(ctx, '#2a2a2a', 34, 22, 22, 12);
    px(ctx, '#111', 52, 25, 6, 6);
    px(ctx, '#d4a017', 18, 32, 12, 4);
    px(ctx, '#3d8bfd', 20, 28, 8, 3);
  },
  barracks(ctx) {
    shadow(ctx, 12, 26, 40, 30);
    px(ctx, '#5c3a1a', 10, 18, 44, 14);
    px(ctx, '#8b5a2b', 14, 28, 36, 26);
    px(ctx, '#3a2818', 28, 38, 10, 16);
    px(ctx, '#ffe08a', 18, 34, 8, 8);
    px(ctx, '#ffe08a', 38, 34, 8, 8);
    px(ctx, '#222', 20, 36, 4, 4);
    px(ctx, '#c4a35a', 16, 22, 2, 16);
    px(ctx, '#c4a35a', 46, 22, 2, 16);
    px(ctx, '#2a5a9a', 12, 14, 40, 8);
  },
  archer(ctx) {
    shadow(ctx, 20, 20, 24, 36);
    px(ctx, '#4a6a40', 20, 18, 24, 12);
    px(ctx, '#6b8f5e', 22, 22, 20, 32);
    px(ctx, '#c4a35a', 26, 10, 12, 12);
    px(ctx, '#111', 30, 28, 4, 10);
    px(ctx, '#8b0000', 16, 26, 10, 2);
    px(ctx, '#3d8bfd', 24, 6, 16, 6);
  },
  gate(ctx) {
    shadow(ctx, 14, 12, 36, 44);
    px(ctx, '#5a4a2a', 16, 12, 32, 42);
    px(ctx, '#8b7355', 18, 14, 28, 38);
    for (let i = 0; i < 5; i++) px(ctx, '#1a1a1a', 22 + i * 5, 18, 3, 30);
    px(ctx, '#d4a017', 20, 16, 24, 4);
    px(ctx, '#d4a017', 20, 48, 24, 3);
  },
  moat(ctx) {
    px(ctx, '#0f3555', 8, 14, 48, 40);
    px(ctx, '#1a5a7a', 12, 18, 40, 32);
    px(ctx, '#2a7a9a', 16, 28, 12, 3);
    px(ctx, '#2a7a9a', 36, 38, 14, 3);
    px(ctx, '#3a6a3a', 14, 16, 3, 12);
    px(ctx, '#3a6a3a', 48, 40, 3, 10);
  },
  dock(ctx) {
    px(ctx, '#0f3555', 2, 36, 60, 18);
    px(ctx, '#2a7aaa', 6, 42, 20, 2);
    shadow(ctx, 6, 26, 52, 18);
    px(ctx, '#6b4423', 8, 28, 48, 16);
    for (let i = 0; i < 6; i++) px(ctx, '#5a3818', 12 + i * 7, 28, 2, 16);
    px(ctx, '#4a3018', 10, 18, 4, 28);
    px(ctx, '#4a3018', 50, 18, 4, 28);
  },
  mason(ctx) {
    shadow(ctx, 12, 20, 40, 34);
    px(ctx, '#6a5b4a', 12, 18, 40, 10);
    px(ctx, '#9a8b7a', 14, 24, 36, 28);
    px(ctx, '#3d8bfd', 16, 14, 32, 6);
    px(ctx, '#bbb', 18, 36, 10, 8);
    px(ctx, '#999', 32, 38, 12, 6);
    px(ctx, '#555', 44, 10, 8, 18);
    px(ctx, 'rgba(200,200,200,0.5)', 46, 4, 5, 6);
  },
  watchtower(ctx) {
    shadow(ctx, 22, 16, 20, 40);
    px(ctx, '#5a6a7a', 24, 16, 16, 40);
    px(ctx, '#708090', 26, 18, 12, 36);
    px(ctx, '#3d8bfd', 20, 10, 24, 10);
    px(ctx, '#ffe08a', 28, 28, 8, 8);
    px(ctx, '#222', 30, 30, 4, 4);
  },
  catapult_maker(ctx) {
    shadow(ctx, 10, 28, 44, 24);
    px(ctx, '#3a2a1a', 10, 28, 44, 24);
    px(ctx, '#5a4a3a', 12, 30, 40, 20);
    px(ctx, '#6b4423', 16, 12, 6, 30);
    px(ctx, '#6b4423', 42, 12, 6, 30);
    px(ctx, '#8b6433', 16, 12, 32, 6);
    px(ctx, '#4a3020', 18, 16, 20, 4);
    px(ctx, '#333', 34, 10, 12, 12);
  },
  bridge(ctx) {
    px(ctx, '#0f3555', 4, 18, 56, 32);
    px(ctx, '#2a7aaa', 8, 40, 16, 2);
    shadow(ctx, 6, 26, 52, 16);
    px(ctx, '#6b4423', 8, 28, 48, 14);
    for (let i = 0; i < 7; i++) px(ctx, '#5a3818', 10 + i * 7, 28, 2, 14);
    px(ctx, '#8b6433', 8, 28, 48, 2);
  },
  stockpile(ctx) {
    shadow(ctx, 12, 18, 40, 34);
    px(ctx, '#6b4423', 14, 20, 36, 30);
    px(ctx, '#8b6433', 14, 18, 36, 6);
    px(ctx, '#d4a017', 18, 22, 28, 3);
    px(ctx, '#3a2a1a', 18, 40, 10, 8);
    px(ctx, '#3a2a1a', 36, 40, 10, 8);
    px(ctx, '#5a3818', 20, 28, 4, 12);
    px(ctx, '#5a3818', 40, 28, 4, 12);
  },
  spawn_rate(ctx) {
    px(ctx, '#8a6a0a', 12, 28, 10, 8);
    px(ctx, '#d4a017', 18, 24, 30, 12);
    px(ctx, '#e8c040', 42, 18, 14, 22);
    px(ctx, '#fff6c8', 24, 10, 4, 12);
    px(ctx, '#fff6c8', 32, 6, 3, 14);
  },
  wall_repair(ctx) {
    shadow(ctx, 14, 14, 36, 36);
    px(ctx, '#8b7355', 16, 16, 32, 32);
    px(ctx, '#c4a574', 18, 18, 28, 8);
    px(ctx, '#6b5b4a', 18, 28, 28, 4);
    px(ctx, '#888', 28, 30, 22, 6);
    px(ctx, '#aaa', 42, 24, 6, 22);
  },
  hp_boost(ctx) {
    shadow(ctx, 18, 12, 28, 40);
    px(ctx, '#1a4a8a', 20, 14, 24, 38);
    px(ctx, '#3d8bfd', 24, 18, 16, 30);
    px(ctx, '#d4a017', 28, 28, 8, 12);
    px(ctx, '#ffe08a', 30, 30, 4, 4);
  },
  level_up(ctx) {
    px(ctx, '#2ea043', 28, 10, 8, 32);
    px(ctx, '#3fb950', 16, 22, 32, 8);
    px(ctx, '#56d364', 22, 42, 20, 8);
  },
  extra_cannon(ctx) {
    DRAWS.cannon(ctx);
  },
  upgrade_dock(ctx) {
    px(ctx, '#0f3555', 2, 38, 60, 16);
    shadow(ctx, 8, 20, 48, 26);
    px(ctx, '#1a1a1a', 10, 22, 44, 24);
    px(ctx, '#3a3a3a', 14, 16, 36, 14);
    px(ctx, '#f85149', 28, 12, 8, 8);
    px(ctx, '#111', 40, 26, 12, 6);
    px(ctx, '#666', 16, 28, 10, 4);
  },
  upgrade_barracks(ctx) {
    shadow(ctx, 14, 18, 36, 30);
    px(ctx, '#6b4423', 16, 28, 14, 18);
    px(ctx, '#8b5a2b', 20, 18, 30, 26);
    px(ctx, '#c4a07a', 42, 20, 12, 12);
    px(ctx, '#111', 48, 24, 3, 3);
    px(ctx, '#d4a017', 24, 12, 18, 10);
  },
};

const cache = new Map();

export function shopIconDataUrl(id) {
  if (cache.has(id)) return cache.get(id);
  const S = 64;
  const { c, ctx } = canvas(S, S);
  ctx.clearRect(0, 0, S, S);
  const draw = DRAWS[id] || DRAWS.barracks;
  draw(ctx, S);
  const url = c.toDataURL('image/png');
  cache.set(id, url);
  return url;
}

export function shopIconHtml(id) {
  const src = shopIconDataUrl(id);
  return `<img class="shop-ico-img" src="${src}" width="56" height="56" alt="" draggable="false" />`;
}
