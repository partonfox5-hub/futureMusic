Battle Sphere Arena — WebXR (all game files)
============================================

Production WebXR build from futuremusic.online.

  game.js          zero-g arena (Three.js r160 + WebXR)
  index.html       desktop + Enter VR (relative paths)
  trailer.mp4      menu background
  images/          cover, card, hero, universal
  battle-sphere-arena-landing.ejs   site store page (not required to play)

Do not open index.html as file://
From this folder:

  python -m http.server 8788

Then: http://localhost:8788/

Desktop: WASD fly, mouse look, click laser, Space/C up-down.
VR: Quest Browser, Enter VR, trigger fires.

Live: https://futuremusic.online/battle-sphere-arena
