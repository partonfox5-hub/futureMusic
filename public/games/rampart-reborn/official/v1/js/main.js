/**
 * Rampart Reborn — entry point
 * Static deploy: serve this folder over HTTP (GitHub Pages / Netlify / any static host).
 * Local: `npx serve .` or `python -m http.server` from the project root.
 */

import { CONFIG } from './data/config.js';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';

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
  // eslint-disable-next-line no-new
  const game = new Phaser.Game(config);
  // Keep canvas fitted when iframe / shell resizes
  const refreshScale = () => {
    try {
      game.scale?.refresh();
    } catch (_) {}
  };
  window.addEventListener('resize', refreshScale);
  // After fonts / layout settle in embedded iframe
  setTimeout(refreshScale, 100);
  setTimeout(refreshScale, 500);
  console.info(
    '%c Rampart Reborn %c ready ',
    'background:#d4a017;color:#000;font-weight:bold',
    'background:#161b22;color:#e6edf3'
  );
}
