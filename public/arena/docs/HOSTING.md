# Hosting NetKnight

Upload the whole game folder to your static hosting service or website, preserving its subfolders. For example:

```text
public_html/games/netknight/
  index.html
  style.css
  icon.svg
  js/
  vendor/
  assets/
```

Open your website's `/games/netknight/` URL in Meta Quest Browser and select **Enter VR**. A direct game page is the most straightforward entry point. All references are relative, so hosting under a subfolder works. No build server or account service is used.

Use HTTPS on the headset. `navigator.xr.requestSession('immersive-vr')` is available only in secure contexts and is requested directly from the VR button's click handler. This build requests `local-floor` and optionally `bounded-floor`. See [MDN's session documentation](https://developer.mozilla.org/en-US/docs/Web/API/XRSystem/requestSession).

## Embedding in an existing page

For a game on the same website:

```html
<iframe
  src="/games/netknight/"
  title="NetKnight — Battle Sphere Arena"
  allow="xr-spatial-tracking; fullscreen; autoplay"
  allowfullscreen
  style="width:100%;height:80vh;border:0">
</iframe>
```

If your server sends a restrictive `Permissions-Policy`, allow `xr-spatial-tracking` for the game origin. Cross-origin embedding requires the parent page's policy to grant that origin access. See [WebXR permissions and security](https://developer.mozilla.org/en-US/docs/Web/API/XRSystem/requestSession#security). The game needs no geolocation, camera video, microphone, or account login.

Serve `.js` files as JavaScript (`text/javascript` or `application/javascript`), `.json` as `application/json`, `.wav` as `audio/wav`, and `.mp3` as `audio/mpeg`. Avoid a site-wide single-page-app rewrite that returns your site's HTML instead of game JS or audio files. Prefer the normal directory index behavior.

The content uses its supplied names unchanged within the ZIP. A case-sensitive host is supported. No CORS setup is needed when all included files are served from the same origin. HTTP range requests are useful for media streaming; common static hosts support them.

## Local desktop check

From the extracted game folder:

```sh
npm run dev
```

Then open `http://localhost:4173`. The Node server has no runtime dependencies. Python is also an option:

```sh
python3 -m http.server 4173
```

These local commands are for desktop testing. A Quest connecting to another computer over plain LAN HTTP does not get the usual localhost secure-context exception; use your HTTPS website for the headset.

## First Quest check

1. Use a trigger to advance the restored intro, or B to skip. Confirm the lower-left holographic map and top-center power gauge after it ends. Confirm that both weapons appear and that the left trigger fires plasma on release.
2. Confirm that the right sword follows the controller, and holding its trigger starts the laser after the charge delay.
3. Fly through a main tunnel, turn with the right stick, and use left grip + X to pause.
4. Point at a menu button and press a trigger. Test resume, map and save/load.
5. Watch the first hydra nest after 18 seconds. Its lower jaw should open, charge should appear inside the mouth, and the first three plasma orbs should emerge there.
6. Use Settings → Performance display to inspect the actual device's frame cadence. Start with Balanced. Try Performance if the headset misses frames; High is optional.

The build requests 72 Hz when the session advertises it. It also adjusts foveation/detail when the observed cadence degrades. This is a target and an adaptive policy, not a measured Quest performance result. Eye-buffer scaling is configured before session creation, following [Three.js WebXRManager requirements](https://threejs.org/docs/pages/WebXRManager.html).

If Enter VR stays unavailable, confirm HTTPS, Meta Quest Browser, iframe permissions and that another immersive session is not already active. If the page reports a WebGL startup failure, confirm hardware graphics is enabled in that browser/device. A missing-file error usually means the archive's subfolders were not uploaded together or the host is rewriting asset URLs.

## Replacing an older hosted build

Upload all files from the new `netknight-webvr` folder, including the new JavaScript modules. The packaged runtime uses `?v=5.0.0` on module URLs and the page stylesheet so the browser requests the new code. Close an existing VR session and reload the game page after uploading. If a CDN caches the HTML itself, purge its cached game page. Do not remove the `assets` or `vendor` folders. Existing saves can be loaded and are upgraded automatically.
