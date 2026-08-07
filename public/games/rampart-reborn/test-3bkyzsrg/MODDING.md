# Modding Rampart Reborn

## Keep multiplayer working

1. Leave `module.manifest.json` `moduleId` as `"rampart-reborn"`.
2. If you change network message shapes, bump `multiplayer.protocolVersion` and the constant `MP_PROTOCOL_VERSION` in `js/systems/MultiplayerManager.js` so your fork only lobbies with itself.
3. Do not remove PeerJS, Create/Join room, Ready, or host-authoritative state sync.
4. Room codes are `RRP{protocolVersion}{5 chars}` (e.g. `RRP1K7M3Q`).

## Safe places to tweak balance

- `js/data/config.js` — HP, timers, ammo, speeds, building costs
- Sprites / `style.css` — visuals only
- AI aggressiveness constants

## Upload back to the site

1. Zip the **game root** (must include `index.html` + `module.manifest.json`).
2. On the Rampart page, sign in and use **Upload fork**.
3. Pass static (+ optional Grok) validation.
4. Share the fork Play link so you and friends open the **same version** for multiplayer.

## Grok Build first prompt (example)

```
Open this Rampart Reborn folder. Keep multiplayer (PeerJS, room codes, Ready flow,
module.manifest.json protocolVersion) intact. Tweak wall HP and cannon ammo for a
faster siege, then tell me what you changed.
```
