# Human5 17.6 — Checkpoint 10

This integrated checkpoint restores the saved 17.5 project after the workspace restart and adds the house interactions and vehicle crash correction. Character fidelity, soft straight shoulder-length hair, the full final performance review, and the separate photo/video NPC creator remain unfinished. The requested anatomy slider defaults and skin/tissue changes are not part of this checkpoint.

## Vehicle crash correction

A browser reproduction of driving into Willow's exterior wall failed with `Cannot read properties of undefined (reading 'x')` in `WallSystem.stamp`. The car had supplied an object and instance index but no contact point. Car impacts now supply a world-space contact point, and the older wall API has a defensive fallback for callers without one.

Collision samples cover two body heights. Contacts look up their wall cells directly. A car damages at most four nearby wall cells per simulation frame; absorbed energy and remaining wall resistance affect its speed. The existing dent and mechanical damage paths remain active. The regression broke four wall cells without an exception and left a finite vehicle velocity. This is a bounded game approximation of masonry, timber framing and bodywork; it is not a structural finite-element simulation or GTA-quality destruction.

The initial car views are prepared behind a loading card. This includes an actual render because shader compilation alone did not remove the graphics driver's first-use stall. Two default cars are placed at their current scene parking locations before preparation. Loading may take longer. The workstation software-rendering diagnostic previously measured a 5.7-second first rear-view render; the latest prepared run measured about 191 ms, with later calls about 44 ms. These are diagnostic runs with variable workstation load, not a controlled speedup benchmark or Quest FPS result. A smaller entry hitch remains to be addressed during the final performance passes. New user-spawned vehicle types can still incur their own first-use resource work.

## Starting house

Willow cottage, the one-bedroom house on the west side of the cul-de-sac, now has a basement at −2.8 m. Stairs are on the left side of the front living area when viewed in the house's local plan. Furniture and the rug were moved away from the stair opening. The upper floor has an actual opening, and streamed-terrain collision and aiming respect the basement. Seventeen visible steps use a smooth traversal ramp. The basement has a floor, perimeter walls, railing, lighting, an arcade and a large-dog crate.

Basement ceiling lights use the existing local-light pool. They do not add a permanently active point-light shader slot.

## Arcade

The cabinet includes a joystick, three buttons, and a 512×512 canvas display. The included **Orbit Catch** game is playable. Point and trigger/click the joystick to focus, or grip it and move your hand. Desktop arrows move; A/Space performs action A; B restarts the demo; Escape leaves. While a VR controller owns the arcade, its stick and secondary buttons are routed to the game rather than walking, jumping, deleting an NPC or spawning a ball.

An adapter can be registered through `world.h5Home.arcade.game.register(id, adapter)`, then loaded with `.load(id)`. Required methods:

```js
const adapter = {
  title: 'Your game',
  reset() {},
  update(dt, input) { /* input.x, input.y, input.buttons (Set) */ },
  render(ctx, width, height) {},
  onButton(id, pressed) {}, // optional; ids 0, 1, 2
  onAxis(x, y) {},         // optional
  suspend() {},           // optional when switching away
  dispose() {}            // optional on cabinet shutdown
};
```

The display updates at at most 30 Hz within four metres and sleeps farther away. DOM/CSS games require a canvas rendering adapter; arbitrary HTML pages are not automatically converted into a WebXR texture. No remote game code is evaluated.

## Dog crate

The crate is approximately 1.13×1.60×1.18 m and weighs 22 kg in the furniture system. It has a hollow interior, separate wall/roof collision pieces, a hinged front door, and an outside sliding bolt. Grip the bolt and slide it or point/click it, then pull the handle. The bolt engages only near the closed position; it cannot lock an open door. The hinge is damped and can be left open. Whole-crate furniture grabbing remains available.

Thin cage bars use consolidated geometry; body collision approximates each cage face with a thin slab rather than testing every individual bar.

## Bathrooms and wetness

All five house bathrooms include a supported shower pipe/head, mixer controls, tray, drain, glass side panels and a wall mirror above the sink. Point and trigger/click the flow handle or temperature dial; these controls also accept nearby hand grips. The temperature click cycles between cool, warm/hot and maximum hot. Hot running water creates bounded steam and accumulating glass condensation. Condensation fades after the shower stops. Interactive wiping is not implemented in this checkpoint.

Skin, hair and clothing acquire bounded wetness from showers, rain outside shelter, and water immersion. Skin becomes slightly darker and glossier; hair and fabric darken more and dry more slowly. Legacy hair receives added damping when wet and uses current world gravity. Wetness is a surface/guide approximation, not fluid simulation or a complete wet-hair groom.

Only the nearest eligible mirror renders, within six metres, at 24/18/12 Hz on Quest quality tiers. It uses separate eye targets in XR, one reflection level, and restores renderer state after offscreen work. Targets are released after four seconds unused. Steam has a 24-instance cap; each nearby running shower has 32 simple water segments. Mirrors and shower glass use inexpensive material approximations rather than ray tracing or volumetric transport.

## Verification and remaining work

The browser checks covered stair ascent/descent, upper/basement floor separation, dropped-object and aiming collision, closed and open crate collision, latch engagement, arcade input/render/sleep, shower wetness/drying, hot condensation/steam limits, reflection pose/state, and scene rebuild cleanup. The in-game screenshots in `test-results/home` are actual renders. Regression evidence also includes the original car crash stack and the corrected run.

No Quest headset was available. Microphone permissions, stereo comfort, frame delivery, thermal behavior, long sessions and GPU memory need on-device verification. The final whole-application review and the additional performance pass immediately before final export are still pending. See `PROJECT-REMAINING.md` for the continuing scope.
