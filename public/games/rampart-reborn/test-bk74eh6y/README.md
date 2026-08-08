# Rampart Reborn

Browser castle siege — walls, cannons, flags, multiplayer lobbies.  
**Stack:** Phaser 3 + PeerJS (CDN) · pure static files · no build step.

---

## Play locally

```bash
cd rampart-reborn
npx --yes serve .
# or:  python -m http.server 8080
```

Open the printed URL (must be **http://**, not `file://`).

---

## Deploy to your website (`public/` folder)

This project is **already static**. Copy the whole folder into your site’s public web root.

### Option A — Copy into `public/rampart-reborn/`

If your site is something like:

```
my-website/
  public/          ← files here are served as https://yoursite.com/...
  ...
```

1. Copy **everything** from `rampart-reborn` into `public/rampart-reborn/`:

```
public/
  rampart-reborn/
    index.html
    style.css
    README.md
    js/
      main.js
      data/
      scenes/
      systems/
```

2. Deploy/upload your site as usual (FTP, `git push`, cPanel, Netlify, Vercel, etc.).

3. Open:

```
https://YOUR-DOMAIN.com/rampart-reborn/
```

or

```
https://YOUR-DOMAIN.com/rampart-reborn/index.html
```

### Option B — Put the game at the site root

Copy the **contents** of `rampart-reborn` into `public/` so `public/index.html` is the game.  
Then the URL is just `https://YOUR-DOMAIN.com/`.

### Option C — GitHub Pages / Netlify / Vercel

| Host | Steps |
|------|--------|
| **GitHub Pages** | Push repo → Settings → Pages → deploy branch (root or `/docs`). URL: `https://USER.github.io/REPO/` |
| **Netlify** | Drag-and-drop the `rampart-reborn` folder, or connect repo with **publish directory** = folder containing `index.html`, **no build command** |
| **Vercel** | Import project, **Output/Root** = folder with `index.html`, framework = Other, no build |

### Checklist before going live

- [ ] Game loads over **HTTPS** (required for some multiplayer/network features)
- [ ] Paths are **relative** (`style.css`, `js/main.js`) — already set this way
- [ ] CDN works: Phaser + PeerJS load from jsDelivr (players need internet)
- [ ] Test **Single Player** first, then **Online Multiplayer** with a friend

---

## Multiplayer lobbies

1. Host clicks **Online Multiplayer** → **Create Room**
2. Share the **room code** with a friend
3. Guest enters code → **Join** → both click **Ready**
4. Host starts when both are ready (auto when both ready)

**Notes:**

- Uses **PeerJS** peer-to-peer (no game server of yours)
- Both players need outbound internet to the PeerJS broker
- Strict NATs/firewalls can block P2P; if join fails, try another network
- Disconnect mid-match falls back so the game stays playable

---

## Ammo & stockpiles

- Cannons and **ironclads** share a **powder** pool each battle
- Ammo = `(4 × number of cannons) + (2 × stockpiles)`
- **Powder Stockpile** costs **10 pts** in build/market; each gives **+2 ammo**
- HUD **Powder** shows remaining / max in battle

---

## Controls (short)

| Key | Action |
|-----|--------|
| LMB | Place / fire cannons / select |
| RMB | Rotate wall/bridge · unit orders |
| Space | Skip piece · wheel spin/stop |
| F | FPS mode |
| Wheel | Cycle build palette |

---

## Project layout

```
rampart-reborn/
  index.html
  style.css
  README.md
  js/main.js
  js/data/config.js    ← balance (ammo, costs, timers)
  js/scenes/
  js/systems/
```

No `npm install` or compile step required for deployment.
