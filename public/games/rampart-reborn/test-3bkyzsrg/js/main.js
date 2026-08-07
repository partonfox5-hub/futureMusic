/**
 * Rampart Reborn — entry point
 * Static deploy: serve this folder over HTTP.
 * Layout is fluid; Phaser fits #game-container with no page scrollbars.
 */

import { CONFIG } from './data/config.js';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';

/**
 * Keep CSS fluid tokens in sync with the actual viewport (iframe-safe).
 * 100vh inside nested iframes is unreliable; measure documentElement instead.
 */
function syncViewportVars() {
  const root = document.documentElement;
  const w = root.clientWidth || window.innerWidth || 1;
  const h = root.clientHeight || window.innerHeight || 1;
  root.style.setProperty('--app-w', `${w}px`);
  root.style.setProperty('--app-h', `${h}px`);
  // ui scale 0.65–1.05 based on height
  const ui = Math.max(0.65, Math.min(1.05, h / 860));
  root.style.setProperty('--ui', String(ui));
  return { w, h };
}

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: CONFIG.GAME_WIDTH,
  height: CONFIG.GAME_HEIGHT,
  backgroundColor: '#0a0e14',
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game-container',
    expandParent: false,
    // Never enlarge past container
    fullscreenTarget: document.body,
  },
  scene: [BootScene, GameScene],
  fps: { target: 60, forceSetTimeOut: false },
  render: {
    pixelArt: true,
    antialias: false,
  },
};

// Guard if Phaser CDN failed
if (typeof Phaser === 'undefined') {
  document.body.innerHTML =
    '<div style="color:#fff;font-family:sans-serif;padding:2rem">' +
    '<h1>Phaser failed to load</h1><p>Check your network / CDN access, then reload.</p></div>';
} else {
  syncViewportVars();
  const game = new Phaser.Game(config);

  const refreshLayout = () => {
    syncViewportVars();
    try {
      game.scale?.refresh();
    } catch (_) {}
  };

  window.addEventListener('resize', refreshLayout);
  window.addEventListener('orientationchange', () => setTimeout(refreshLayout, 50));

  // Iframe / shell resizes without window.resize
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => refreshLayout());
    ro.observe(document.documentElement);
    const wrap = document.getElementById('game-wrap');
    if (wrap) ro.observe(wrap);
    const container = document.getElementById('game-container');
    if (container) ro.observe(container);
  }

  // Fonts / first paint settle
  setTimeout(refreshLayout, 50);
  setTimeout(refreshLayout, 250);
  setTimeout(refreshLayout, 800);
  if (document.fonts?.ready) {
    document.fonts.ready.then(refreshLayout).catch(() => {});
  }

  console.info(
    '%c Rampart Reborn %c ready ',
    'background:#d4a017;color:#000;font-weight:bold',
    'background:#161b22;color:#e6edf3'
  );
}
