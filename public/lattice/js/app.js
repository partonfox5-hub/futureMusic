(function () {
  var BASE = "/lattice";
  var D = window.LatticeDimensions;
  var M = window.LatticeMatching;
  var OCR = window.LatticeOcr;
  var root = document.getElementById("app");
  var state = {
    me: null,
    config: { google: false, stripe: false },
    rail: [],
    directory: null,
    filters: defaultFilters(),
    filtersOpen: false,
    onboard: { step: 0, displayName: "", age: 29, gender: "woman", seeking: ["man"], city: "", country: "", intent: "long-term", bio: "", occupation: "", education: "bachelor", traits: D.defaultTraits(29), heavy: ["age", "kidsDesire", "politics"] },
    openGroup: "physical",
    profileTab: "you",
    err: "",
    busy: false
  };

  function defaultFilters() {
    return {
      q: "", gender: "", intent: "", city: "", country: "", education: "", religion: "", language: "",
      sort: "match", dim: "", dimMin: "", dimMax: "", minAge: "", maxAge: "", minHeight: "", maxHeight: "",
      compatible: true, verified: false, checked: false
    };
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function initials(name) {
    return String(name || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (w) { return w[0]; })
      .join("")
      .toUpperCase();
  }

  function path() {
    var p = location.pathname;
    if (p.indexOf(BASE) === 0) p = p.slice(BASE.length);
    if (!p || p === "/") return "/";
    return p.replace(/\/$/, "") || "/";
  }

  function go(p, replace) {
    var url = BASE + p;
    if (replace) history.replaceState({}, "", url);
    else history.pushState({}, "", url);
    render();
  }

  function routeParts() {
    return path().split("/").filter(Boolean);
  }

  async function api(url, opts) {
    opts = opts || {};
    var init = {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      method: opts.method || (opts.body ? "POST" : "GET")
    };
    if (opts.body) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }
    var res = await fetch(BASE + url, init);
    var data = {};
    try { data = await res.json(); } catch (e) { data = {}; }
    if (res.status === 401 && url !== "/api/me") {
      go("/login");
      throw new Error("Sign in required.");
    }
    if (!res.ok && !data.error) data.error = "Request failed";
    return data;
  }

  function yinYang(size) {
    size = size || 32;
    return '<svg viewBox="0 0 32 32" width="' + size + '" height="' + size + '" aria-hidden="true">' +
      '<circle cx="16" cy="16" r="15.2" fill="var(--fg)"/>' +
      '<path d="M16 0.8a15.2 15.2 0 0 1 0 30.4 7.6 7.6 0 0 1 0-15.2 7.6 7.6 0 0 0 0-15.2z" fill="var(--wine)"/>' +
      '<circle cx="16" cy="8.4" r="2.6" fill="var(--wine)"/>' +
      '<circle cx="16" cy="23.6" r="2.6" fill="var(--fg)"/>' +
      "</svg>";
  }

  function crystalBloom(r, folds) {
    folds = folds || 6;
    var inner = r * 0.2;
    var waist = r * 0.5;
    var spread = (Math.PI / folds) * 0.7;
    var stroke = Math.max(0.55, r * 0.07).toFixed(3);
    var facet = Math.max(0.35, r * 0.04).toFixed(3);
    var hex = [];
    var i, a, d;
    for (i = 0; i < 6; i++) {
      a = (i * Math.PI) / 3 - Math.PI / 2;
      d = inner * 1.15;
      hex.push((Math.cos(a) * d).toFixed(3) + "," + (Math.sin(a) * d).toFixed(3));
    }
    var petals = "";
    for (i = 0; i < folds; i++) {
      a = (i * 2 * Math.PI) / folds - Math.PI / 2;
      var tipx = (Math.cos(a) * r).toFixed(3);
      var tipy = (Math.sin(a) * r).toFixed(3);
      var lx = (Math.cos(a - spread) * waist).toFixed(3);
      var ly = (Math.sin(a - spread) * waist).toFixed(3);
      var rx = (Math.cos(a + spread) * waist).toFixed(3);
      var ry = (Math.sin(a + spread) * waist).toFixed(3);
      var ix = (Math.cos(a) * inner).toFixed(3);
      var iy = (Math.sin(a) * inner).toFixed(3);
      petals += '<polygon points="' + ix + "," + iy + " " + lx + "," + ly + " " + tipx + "," + tipy + " " + rx + "," + ry +
        '" fill="currentColor" fill-opacity="0.28" stroke="currentColor" stroke-linejoin="miter" stroke-width="' + stroke + '"/>' +
        '<line x1="' + ix + '" y1="' + iy + '" x2="' + tipx + '" y2="' + tipy + '" stroke="currentColor" stroke-width="' + facet + '" opacity="0.55"/>';
    }
    return petals + '<polygon points="' + hex.join(" ") + '" fill="var(--rose)" stroke="var(--bloom)" stroke-width="' + Math.max(0.4, r * 0.05).toFixed(3) + '"/>';
  }

  function portrait(name, seed, size) {
    size = size || "md";
    seed = Number(seed) || 1;
    var warm = seed % 3 !== 1;
    var h, h2, s, s2, l, l2;
    if (warm) {
      h = (348 + (seed * 7) % 22) % 360;
      h2 = (h + 10) % 360; s = 24; s2 = 32; l = 16; l2 = 38;
    } else {
      h = 210; h2 = 200; s = 7; s2 = 9; l = 14; l2 = 34;
    }
    var gid = "g" + seed + size;
    var dots = "";
    for (var i = 0; i < 9; i++) {
      var ang = ((seed * 13 + i * 37) % 360) * (Math.PI / 180);
      var r = 18 + ((seed * (i + 3)) % 22);
      var x = 50 + Math.cos(ang) * r;
      var y = 50 + Math.sin(ang) * r;
      var connected = i === seed % 9;
      var petal = i % 4 === 0;
      if (connected) {
        dots += '<line x1="50" y1="50" x2="' + x + '" y2="' + y + '" stroke="rgb(196 92 106 / 0.55)" stroke-width="1.2"/>';
      }
      dots += '<circle cx="' + x + '" cy="' + y + '" r="' + (petal ? 2.5 : 1.5) + '" fill="' + (petal ? "rgb(232 180 184 / 0.9)" : "rgb(236 236 232 / 0.8)") + '"/>';
    }
    return '<div class="portrait ' + size + '" aria-hidden="true"><svg viewBox="0 0 100 100">' +
      '<defs><radialGradient id="' + gid + '" cx="35%" cy="30%">' +
      '<stop offset="0%" stop-color="hsl(' + h2 + " " + s2 + "% " + l2 + '%)"/>' +
      '<stop offset="100%" stop-color="hsl(' + h + " " + s + "% " + l + '%)"/>' +
      "</radialGradient></defs>" +
      '<rect width="100" height="100" fill="url(#' + gid + ')"/>' + dots +
      '<circle cx="50" cy="50" r="11" fill="#f2f1ee"/>' +
      '<path d="M50 39a11 11 0 0 1 0 22 5.5 5.5 0 0 1 0-11 5.5 5.5 0 0 0 0-11z" fill="#7a3340"/>' +
      '<circle cx="50" cy="44.5" r="1.9" fill="#7a3340"/>' +
      '<circle cx="50" cy="55.5" r="1.9" fill="#f2f1ee"/>' +
      '</svg><span class="ini">' + esc(initials(name)) + "</span></div>";
  }

  function brand(to, size) {
    return '<a class="brand ' + (size || "md") + '" href="' + BASE + (to || "/") + '" data-link>' +
      yinYang(size === "sm" ? 24 : 32) + "<span>Lattice</span></a>";
  }

  function iconSearch() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>';
  }
  function iconMsg() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>';
  }
  function iconShield() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l8 4v5c0 5-3.4 8.4-8 9-4.6-.6-8-4-8-9V7z"/></svg>';
  }
  function iconUser() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-3.5 4.2-5 8-5s6.5 1.5 8 5"/></svg>';
  }

  function heroField() {
    var cols = 7, rows = 5, nodes = [], i, col, row;
    for (i = 0; i < cols * rows; i++) {
      col = i % cols; row = Math.floor(i / cols);
      nodes.push({ i: i, x: 32 + col * 52, y: 28 + row * 56, col: col, row: row });
    }
    var a = nodes[8], b = nodes[17];
    var lines = "";
    nodes.forEach(function (n) {
      var right = nodes.find(function (o) { return o.row === n.row && o.col === n.col + 1; });
      var down = nodes.find(function (o) { return o.col === n.col && o.row === n.row + 1; });
      if (right) lines += '<line x1="' + n.x + '" y1="' + n.y + '" x2="' + right.x + '" y2="' + right.y + '" stroke="currentColor" stroke-width="0.8" opacity="0.18"/>';
      if (down) lines += '<line x1="' + n.x + '" y1="' + n.y + '" x2="' + down.x + '" y2="' + down.y + '" stroke="currentColor" stroke-width="0.8" opacity="0.18"/>';
    });
    var dots = nodes.map(function (n) {
      var close = n.i === a.i || n.i === b.i;
      return '<circle cx="' + n.x + '" cy="' + n.y + '" r="' + (close ? 5.5 : 2) + '" fill="' +
        (n.i === a.i ? "var(--fg)" : n.i === b.i ? "var(--bloom)" : "currentColor") + '" opacity="' + (close ? 0.85 : 0.28) + '"/>';
    }).join("");
    var flowers = [
      [nodes[0], 13, 6, "var(--rose)"], [nodes[4], 10, 8, "var(--bloom)"], [nodes[6], 15, 6, "var(--rose)"],
      [nodes[14], 9, 8, "var(--bloom)"], [nodes[20], 12, 6, "var(--rose)"], [nodes[24], 11, 8, "var(--bloom)"],
      [nodes[21], 16, 6, "var(--rose)"], [nodes[27], 10, 6, "var(--bloom)"]
    ].map(function (f) {
      return '<g transform="translate(' + f[0].x + " " + f[0].y + ')" fill="' + f[3] + '" stroke="' + f[3] + '">' + crystalBloom(f[1], f[2]) + "</g>";
    }).join("");
    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    return '<div class="hero-wash" style="position:relative;min-height:420px;overflow:hidden;border-radius:var(--radius-xl);border:1px solid var(--border)">' +
      '<svg viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0;width:100%;height:100%;color:var(--accent)" aria-hidden="true">' +
      lines +
      '<path d="M ' + a.x + " " + a.y + " C " + (a.x + 28) + " " + (a.y - 36) + ", " + (b.x - 28) + " " + (b.y + 36) + ", " + b.x + " " + b.y +
      '" fill="none" stroke="var(--bloom)" stroke-width="1.7" opacity="0.55"/>' +
      dots + flowers +
      '<g transform="translate(' + (mx + 4) + " " + (my - 14) + ')">' +
      '<circle r="16" fill="var(--fg)"/><path d="M0 -16a16 16 0 0 1 0 32 8 8 0 0 1 0-16 8 8 0 0 0 0-16z" fill="var(--wine)"/>' +
      '<circle cx="0" cy="-8" r="2.5" fill="var(--wine)"/><circle cx="0" cy="8" r="2.5" fill="var(--fg)"/></g></svg>' +
      '<img class="aphrodite" src="/lattice/img/aphrodite.png" alt="" style="position:absolute;inset:0;width:100%;height:100%;z-index:10"/>' +
      '<p style="position:absolute;inset:auto 0 0 0;z-index:20;display:flex;align-items:center;gap:.5rem;padding:2.5rem 1.25rem 1.25rem;background:linear-gradient(to top, color-mix(in oklab, var(--bg) 80%, transparent), transparent);font-size:.75rem;color:var(--muted)">' +
      yinYang(20) + " Two poles, both directions. Close is rare. Close and mutual is the point.</p></div>";
  }

  function nightLattice() {
    var dots = "";
    for (var i = 0; i < 48; i++) {
      dots += '<circle cx="' + ((i * 97) % 800) + '" cy="' + ((i * 53) % 900) + '" r="' + (i % 7 === 0 ? 2.2 : 1.1) + '" fill="currentColor" opacity="0.32"/>';
    }
    var crystals = [
      [110, 150, 22, 6], [250, 720, 16, 8], [640, 500, 26, 6], [520, 120, 14, 8],
      [720, 280, 18, 6], [80, 520, 15, 8], [430, 70, 12, 6], [300, 400, 11, 8]
    ].map(function (c) {
      return '<g transform="translate(' + c[0] + " " + c[1] + ')" color="var(--rose)">' + crystalBloom(c[2], c[3]) + "</g>";
    }).join("");
    return '<svg viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;color:var(--accent)" aria-hidden="true">' +
      dots +
      '<line x1="180" y1="240" x2="310" y2="310" stroke="currentColor" stroke-width="1" opacity="0.35"/>' +
      '<line x1="310" y1="310" x2="430" y2="250" stroke="var(--bloom)" stroke-width="1.4" opacity="0.6"/>' +
      crystals +
      '<g transform="translate(370 280)"><circle r="26" fill="var(--fg)"/>' +
      '<path d="M0 -26a26 26 0 0 1 0 52 13 13 0 0 1 0-26 13 13 0 0 0 0-26z" fill="var(--wine)"/>' +
      '<circle cx="0" cy="-13" r="4" fill="var(--wine)"/><circle cx="0" cy="13" r="4" fill="var(--fg)"/></g></svg>';
  }

  function landing() {
    return '<main class="page-wash" style="min-height:100dvh">' +
      '<header class="wrap" style="display:flex;align-items:center;justify-content:space-between;padding-top:1.25rem;padding-bottom:1.25rem">' +
      brand("/", "md") + '<a class="btn sm" href="' + BASE + '/login" data-link>Sign in</a></header>' +
      '<section class="wrap grid-2" style="padding-bottom:5rem;padding-top:1.5rem">' +
      "<div><p class=\"subtle\" style=\"font-size:.75rem;letter-spacing:.22em;text-transform:uppercase;color:var(--rose)\">Reciprocal Euclidean matching</p>" +
      '<h1 style="margin:.8rem 0 0;font-size:clamp(2.4rem,6vw,3.7rem);line-height:1.05">Match on every dimension that matters.</h1>' +
      '<p class="muted" style="margin:1.1rem 0 0;max-width:36rem;line-height:1.6">You are a point in a 48-dimension space — body, personality, values, lifestyle, how you bond. Lattice finds people close to what you want, who also want someone like you. Two poles. One distance.</p>' +
      '<div style="margin-top:2rem;display:flex;flex-wrap:wrap;gap:.75rem">' +
      '<a class="btn lg" href="' + BASE + '/login" data-link>' + (state.config.google ? "Continue with Google" : "Create an account") + "</a>" +
      '<a class="btn lg outline" href="#how">How it works</a></div>' +
      '<dl style="margin-top:3rem;display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;border-top:1px solid var(--border);padding-top:1.4rem;font-size:.875rem">' +
      '<div><dt class="muted">Membership</dt><dd class="tabular" style="margin:.25rem 0 0;font-weight:500">$20 / month</dd></div>' +
      '<div><dt class="muted">Background check</dt><dd class="tabular" style="margin:.25rem 0 0;font-weight:500">$35 once</dd></div>' +
      '<div><dt class="muted">ID scan</dt><dd style="margin:.25rem 0 0;font-weight:500">Custom OCR</dd></div></dl></div>' +
      heroField() + "</section>" +
      '<section id="how" style="border-top:1px solid var(--border)"><div class="wrap grid-3" style="padding:4rem 1.25rem">' +
      [["01", "Declare the space", "Set your traits and the weights of what you want. Age, height, Big Five, values, pace — anything."],
        ["02", "Prove you exist", "Upload a government ID. Lattice reads the machine-readable zone with a custom OCR pipeline, then you can optionally run a $35 background check."],
        ["03", "Search the field", "A top rail of closest reciprocal matches. A search that filters the worldwide directory on any characteristic. Message anyone as a member."]
      ].map(function (s) {
        return '<article class="card" style="position:relative;overflow:hidden"><p class="mono" style="font-size:.75rem;color:var(--bloom)">' + s[0] +
          "</p><h2 style=\"margin:.75rem 0 0;font-size:1.5rem\">" + s[1] + '</h2><p class="muted" style="margin:.5rem 0 0;font-size:.875rem;line-height:1.55">' + s[2] + "</p></article>";
      }).join("") + "</div></section>" +
      '<footer style="border-top:1px solid var(--border)"><div class="wrap" style="display:flex;flex-direction:column;gap:.75rem;padding:2rem 1.25rem;font-size:.75rem;color:var(--subtle)">' +
      brand("/", "sm") + "<span>Site accounts · Google when configured · custom ID OCR · $20 membership · $35 background check</span></div></footer></main>";
  }

  function login() {
    var err = new URLSearchParams(location.search).get("error");
    return '<main class="page-wash" style="position:relative;min-height:100dvh;overflow:hidden">' +
      '<div style="position:absolute;inset:0;opacity:.5;pointer-events:none">' + nightLattice() + "</div>" +
      '<div class="hide-md" style="position:absolute;inset:0 0 0 auto;width:50%;pointer-events:none">' +
      '<img class="aphrodite" src="/lattice/img/aphrodite.png" alt="" style="position:absolute;bottom:0;right:0;height:100%;width:100%"/></div>' +
      '<div class="wrap" style="position:relative;z-index:2;min-height:100dvh;display:flex;align-items:center;padding:2.5rem 1.25rem">' +
      '<div style="max-width:28rem">' + brand("/", "md") +
      '<h1 style="margin:2.4rem 0 0;font-size:2.4rem;line-height:1.1">Sign in to Lattice</h1>' +
      '<p class="muted" style="margin:.75rem 0 0;font-size:.9rem;line-height:1.55">One account, stored in our Cloud SQL. Then your dimensions, a government ID scan, and membership to write.</p>' +
      (err === "google" ? '<p class="danger" style="margin:1rem 0 0;font-size:.85rem">Google sign-in failed. Use email, or try again.</p>' : "") +
      (state.err ? '<p class="danger" style="margin:1rem 0 0;font-size:.85rem">' + esc(state.err) + "</p>" : "") +
      '<div style="margin-top:2rem;display:grid;gap:.75rem">' +
      (state.config.google ? '<a class="btn lg full" href="' + BASE + '/api/auth/google">Continue with Google</a>' : "") +
      '<form id="auth-form" style="display:grid;gap:.65rem">' +
      '<label class="field"><span>Email</span><input class="input" name="email" type="email" required autocomplete="email"></label>' +
      '<label class="field"><span>Password</span><input class="input" name="password" type="password" required minlength="8" autocomplete="current-password"></label>' +
      '<label class="field" id="confirm-wrap" style="display:none"><span>Confirm password</span><input class="input" name="confirmPassword" type="password" minlength="8"></label>' +
      '<button class="btn lg full" type="submit" id="auth-submit">Sign in</button>' +
      '<button class="btn outline full" type="button" id="auth-toggle">Need an account? Register</button>' +
      "</form></div>" +
      '<p class="subtle" style="margin-top:2rem;font-size:.75rem;line-height:1.5">By continuing you agree to ID verification. Messaging is $20 / month. Background checks are $35. Graphic violence and sex-act terms are stripped from messages. Same site account as merch checkout.</p>' +
      "</div></div></main>";
  }

  function shell(inner) {
    var rail = (state.rail || []).slice(0, 12).map(function (p) {
      return '<a class="rail-chip" href="' + BASE + "/app/people/" + encodeURIComponent(p.userId) + '" data-link>' +
        portrait(p.displayName, p.photoSeed, "sm") +
        '<span class="hide-md" style="font-size:.75rem">' + esc((p.displayName || "").split(" ")[0]) + "</span>" +
        '<span class="mono" style="font-size:.65rem;color:var(--bloom)">' + Math.round(p.score) + "</span></a>";
    }).join("");
    if (!rail) rail = '<span class="subtle" style="padding:0 .5rem;font-size:.75rem">Dimensional matches appear here</span>';
    var pth = path();
    function nav(href, label, icon, active) {
      return '<a class="icon-link' + (active ? " active" : "") + '" href="' + BASE + href + '" data-link aria-label="' + label + '">' + icon + "</a>";
    }
    return '<div style="min-height:100dvh;display:flex;flex-direction:column;background:var(--bg)">' +
      '<header class="shell-head"><div class="shell-row">' + brand("/app", "sm") +
      '<div class="rail">' + rail + "</div>" +
      '<nav class="icon-nav">' +
      nav("/app", "Search", iconSearch(), pth === "/app") +
      nav("/app/messages", "Messages", iconMsg(), pth.indexOf("/app/messages") === 0) +
      nav("/app/verify", "Verify", iconShield(), pth.indexOf("/app/verify") === 0) +
      nav("/app/profile", "You", iconUser(), pth.indexOf("/app/profile") === 0 || pth.indexOf("/app/billing") === 0 || pth.indexOf("/app/settings") === 0) +
      "</nav></div></header><div style=\"flex:1\">" + inner + "</div></div>";
  }

  function onboard() {
    var o = state.onboard;
    var step = o.step;
    var body = "";
    if (step === 0) {
      body = '<label class="field"><span>Name</span><input class="input" id="ob-name" value="' + esc(o.displayName) + '"></label>' +
        '<label class="field"><span>Age</span><input class="input" id="ob-age" type="number" min="18" max="90" value="' + o.age + '"></label>' +
        '<label class="field"><span>I am</span><select id="ob-gender">' +
        D.GENDERS.map(function (g) { return '<option value="' + g + '"' + (o.gender === g ? " selected" : "") + ">" + (g === "woman" ? "A woman" : g === "man" ? "A man" : "Nonbinary") + "</option>"; }).join("") +
        "</select></label><fieldset class=\"field\"><span>Open to</span><div style=\"display:flex;flex-wrap:wrap;gap:.75rem;color:var(--fg);font-size:.9rem\">" +
        D.GENDERS.map(function (g) {
          return '<label style="display:flex;align-items:center;gap:.4rem;min-height:2.75rem"><input type="checkbox" name="seeking" value="' + g + '"' +
            (o.seeking.indexOf(g) >= 0 ? " checked" : "") + "> " + g + "</label>";
        }).join("") + "</div></fieldset>";
    } else if (step === 1) {
      body = '<label class="field"><span>City</span><input class="input" id="ob-city" value="' + esc(o.city) + '" placeholder="Lisbon"></label>' +
        '<label class="field"><span>Country</span><input class="input" id="ob-country" value="' + esc(o.country) + '" placeholder="Portugal"></label>' +
        '<label class="field"><span>Looking for</span><select id="ob-intent">' +
        D.INTENTS.map(function (x) { return '<option value="' + x + '"' + (o.intent === x ? " selected" : "") + ">" + x + "</option>"; }).join("") +
        "</select></label>" +
        '<label class="field"><span>Occupation</span><input class="input" id="ob-occ" value="' + esc(o.occupation) + '"></label>' +
        '<label class="field"><span>Education</span><select id="ob-edu">' +
        D.EDUCATIONS.map(function (x) { return '<option value="' + x + '"' + (o.education === x ? " selected" : "") + ">" + x + "</option>"; }).join("") +
        "</select></label>" +
        '<label class="field"><span>Bio</span><textarea id="ob-bio" maxlength="600">' + esc(o.bio) + "</textarea></label>";
    } else {
      var matter = ["age", "kidsDesire", "politics", "familyOrientation", "spirituality", "relationshipPace", "attachAvoidance", "ambition"];
      body = '<p class="muted" style="font-size:.85rem">Move the sliders for who you are. Mark what must match.</p>' +
        D.GROUPS.map(function (g) {
          var dims = D.DIMENSIONS.filter(function (d) { return d.group === g.id; });
          return '<section style="margin-top:1.2rem"><h3 class="subtle" style="font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;font-family:var(--font-sans)">' + g.label + "</h3>" +
            dims.map(function (d) {
              var v = o.traits[d.id] != null ? o.traits[d.id] : 50;
              return '<label class="field" style="margin-top:.8rem"><span style="display:flex;justify-content:space-between">' + d.label +
                '<span class="mono tabular">' + Math.round(v) + (d.unit ? " " + d.unit : "") + "</span></span>" +
                '<input class="range dim-range" data-id="' + d.id + '" type="range" min="' + d.min + '" max="' + d.max + '" value="' + v + '">' +
                (matter.indexOf(d.id) >= 0
                  ? '<label style="display:flex;align-items:center;gap:.4rem;margin-top:.4rem;color:var(--fg)"><input type="checkbox" class="heavy" value="' + d.id + '"' +
                    (o.heavy.indexOf(d.id) >= 0 ? " checked" : "") + "> Weight this heavily</label>"
                  : "") + "</label>";
            }).join("") + "</section>";
        }).join("");
    }
    return '<main class="wrap-sm" style="padding:2.5rem 1.25rem">' + brand("/app", "sm") +
      '<p class="muted" style="margin:2rem 0 0;font-size:.75rem;letter-spacing:.2em;text-transform:uppercase">Step ' + (step + 1) + " of 3</p>" +
      "<h1 style=\"margin:.4rem 0 0;font-size:2.2rem\">" + (step === 0 ? "Who you are" : step === 1 ? "Where you stand" : "Your dimensions") + "</h1>" +
      '<div id="ob-body" style="margin-top:2rem;display:grid;gap:1rem">' + body + "</div>" +
      (state.err ? '<p class="danger" style="margin-top:1rem">' + esc(state.err) + "</p>" : "") +
      '<div style="margin-top:2rem;display:flex;gap:.6rem">' +
      (step > 0 ? '<button class="btn outline" id="ob-back">Back</button>' : "") +
      '<button class="btn" id="ob-next">' + (step === 2 ? "Save and verify" : "Continue") + "</button></div></main>";
  }

  var SHORTCUTS = [
    { label: "Mutual seeking", patch: { compatible: true } },
    { label: "Wants children", patch: { dim: "kidsDesire", dimMin: 70 } },
    { label: "Athletic", patch: { dim: "fitness", dimMin: 72 } },
    { label: "Early riser", patch: { dim: "nightOwl", dimMax: 35 } },
    { label: "Homebody", patch: { dim: "travel", dimMax: 35 } },
    { label: "Marriage", patch: { intent: "marriage" } },
    { label: "ID verified", patch: { verified: true } },
    { label: "Background clear", patch: { checked: true } }
  ];

  function shortcutOn(s) {
    var p = s.patch, f = state.filters;
    if (p.compatible) return f.compatible;
    if (p.intent) return f.intent === p.intent;
    if (p.verified) return f.verified;
    if (p.checked) return f.checked;
    if (p.dim) return f.dim === p.dim;
    return false;
  }

  function directoryView() {
    var f = state.filters;
    var dir = state.directory;
    var people = (dir && dir.people) || [];
    var member = dir && dir.member;
    var cards = !dir
      ? '<p class="subtle" style="margin-top:1.2rem">Searching…</p>'
      : people.length === 0
        ? '<p class="muted" style="margin-top:2rem">No one matches those filters. Clear a chip, or turn off mutual seeking.</p>'
        : '<ul class="people-grid" style="list-style:none;margin:0.75rem 0 0;padding:0">' + people.map(function (p) {
          var poles = M.traitTags(p.traits, true).filter(function (t, i, a) { return a.indexOf(t) === i; }).slice(0, 3);
          return '<li><a class="person-card" href="' + BASE + "/app/people/" + encodeURIComponent(p.userId) + '" data-link>' +
            portrait(p.displayName, p.photoSeed, "md") +
            '<div style="min-width:0;flex:1"><div style="display:flex;justify-content:space-between;gap:.5rem">' +
            "<h2 style=\"margin:0;font-size:1rem;font-family:var(--font-sans);font-weight:500\">" + esc(p.displayName) + "</h2>" +
            '<span class="mono tabular" style="font-size:.75rem;color:var(--bloom)">' + Math.round(p.score) + "%</span></div>" +
            '<p class="muted" style="margin:.2rem 0 0;font-size:.75rem">' + p.age + " · " + esc(p.city) + ", " + esc(p.country) + "</p>" +
            '<p class="subtle" style="margin:.5rem 0 0;font-size:.75rem;line-height:1.45">' + esc((p.bio || "").slice(0, 120)) + "</p>" +
            '<div style="margin-top:.5rem;display:flex;flex-wrap:wrap;gap:.25rem">' +
            '<span class="badge">' + esc(p.intent) + "</span>" +
            (p.idStatus === "verified" ? '<span class="badge ok">ID</span>' : "") +
            (p.bgStatus === "clear" ? '<span class="badge">Checked</span>' : "") +
            poles.map(function (t) { return '<span class="badge">' + esc(t) + "</span>"; }).join("") +
            "</div></div></a></li>";
        }).join("") + "</ul>";
    return '<main class="wrap" style="padding:1.5rem 1rem">' +
      '<div style="display:flex;flex-direction:column;gap:.75rem">' +
      '<input class="input" id="dir-q" value="' + esc(f.q) + '" placeholder="Search anyone worldwide — name, city, athletic, devout, night owl…" aria-label="Search members">' +
      '<div style="display:flex;gap:.5rem"><select id="dir-sort">' +
      [["match", "Sort: match"], ["age", "Sort: age"], ["name", "Sort: name"], ["recent", "Sort: recent"]].map(function (o) {
        return '<option value="' + o[0] + '"' + (f.sort === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
      }).join("") + '</select><button class="btn outline" id="dir-filters">Filters</button></div></div>' +
      '<div class="chips" style="margin-top:.75rem">' + SHORTCUTS.map(function (s, i) {
        return '<button class="chip' + (shortcutOn(s) ? " on" : "") + '" data-sc="' + i + '">' + s.label + "</button>";
      }).join("") + "</div>" +
      (state.filtersOpen ? '<div class="filter-grid">' +
        '<label class="field"><span>Gender</span><select id="f-gender"><option value="">Any</option>' +
        D.GENDERS.map(function (g) { return '<option value="' + g + '"' + (f.gender === g ? " selected" : "") + ">" + g + "</option>"; }).join("") + "</select></label>" +
        '<label class="field"><span>Intent</span><select id="f-intent"><option value="">Any</option>' +
        D.INTENTS.map(function (g) { return '<option value="' + g + '"' + (f.intent === g ? " selected" : "") + ">" + g + "</option>"; }).join("") + "</select></label>" +
        '<label class="field"><span>City</span><input class="input" id="f-city" value="' + esc(f.city) + '"></label>' +
        '<label class="field"><span>Country</span><input class="input" id="f-country" value="' + esc(f.country) + '"></label>' +
        '<label class="field"><span>Education</span><select id="f-edu"><option value="">Any</option>' +
        D.EDUCATIONS.map(function (g) { return '<option value="' + g + '"' + (f.education === g ? " selected" : "") + ">" + g + "</option>"; }).join("") + "</select></label>" +
        '<label class="field"><span>Faith</span><input class="input" id="f-rel" value="' + esc(f.religion) + '"></label>' +
        '<label class="field"><span>Language</span><input class="input" id="f-lang" value="' + esc(f.language) + '"></label>' +
        '<label class="field"><span>Age</span><div style="display:flex;gap:.4rem"><input class="input" id="f-amin" placeholder="min" value="' + esc(f.minAge) + '"><input class="input" id="f-amax" placeholder="max" value="' + esc(f.maxAge) + '"></div></label>' +
        "</div>" : "") +
      (!member ? '<div class="notice"><p class="muted" style="margin:0">Browse freely. Messaging needs a $20 / month membership and a verified ID.</p><a class="btn sm" href="' + BASE + '/app/billing" data-link>$20 / month</a></div>' : "") +
      '<p class="subtle tabular" style="margin-top:1.2rem;font-size:.75rem">' + (dir ? people.length + " people" : "Searching…") + "</p>" +
      cards + "</main>";
  }

  function personView(payload) {
    if (!payload || !payload.person) return '<p class="muted" style="padding:2rem">No one here.</p>';
    var person = payload.person, me = payload.me, flags = payload.flags || {};
    var fits = me ? M.topFits(me.prefs, person.traits) : [];
    var gaps = me ? M.topGaps(me.prefs, person.traits) : [];
    var groups = me ? M.groupDirectedScores(me.prefs, person.traits) : [];
    function dimBar(g) {
      var d = D.DIM_BY_ID[g.id] || { min: 0, max: 100 };
      var span = d.max - d.min || 1;
      var left = ((g.youWant - d.min) / span) * 100;
      var right = ((g.theyAre - d.min) / span) * 100;
      return '<div><div style="display:flex;justify-content:space-between;font-size:.85rem"><span class="muted">' + esc(g.label) +
        '</span><span class="mono" style="font-size:.75rem">' + Math.round(g.youWant) + " → " + Math.round(g.theyAre) + "</span></div>" +
        '<div style="position:relative;margin-top:.5rem;height:.35rem;border-radius:99px;background:var(--border)">' +
        '<i style="position:absolute;top:50%;width:8px;height:8px;border-radius:99px;background:var(--muted);left:' + left + '%;transform:translate(-50%,-50%)"></i>' +
        '<i style="position:absolute;top:50%;width:8px;height:8px;border-radius:99px;background:var(--bloom);left:' + right + '%;transform:translate(-50%,-50%)"></i></div></div>';
    }
    return '<main class="wrap-md" style="padding:2rem 1rem">' +
      '<div style="display:flex;gap:1rem;align-items:flex-start">' + portrait(person.displayName, person.photoSeed, "xl") +
      '<div style="min-width:0;flex:1"><h1 style="margin:0;font-size:1.9rem">' + esc(person.displayName) + "</h1>" +
      '<p class="muted" style="margin:.35rem 0 0;font-size:.9rem">' + person.age + " · " + esc(person.city) + ", " + esc(person.country) + " · " + esc(person.occupation) + "</p>" +
      '<div style="margin-top:.75rem;display:flex;flex-wrap:wrap;gap:.35rem">' +
      '<span class="badge rose">Match ' + Math.round(person.score) + "%</span>" +
      '<span class="badge">you→them ' + Math.round(person.youToThem) + "%</span>" +
      '<span class="badge">them→you ' + Math.round(person.themToYou) + "%</span>" +
      (person.idStatus === "verified" ? '<span class="badge ok">ID verified</span>' : "") +
      (person.bgStatus === "clear" ? '<span class="badge ok">Background clear</span>' : "") +
      "</div></div></div>" +
      '<p style="margin:1.5rem 0 0;line-height:1.6">' + esc(person.bio) + "</p>" +
      '<dl style="margin-top:1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:.75rem">' +
      [["Intent", person.intent], ["Education", person.education], ["Faith", person.religion], ["Languages", (person.languages || []).join(", ")]].map(function (m) {
        return '<div class="card" style="padding:.8rem"><dt class="subtle" style="font-size:.65rem;letter-spacing:.08em;text-transform:uppercase">' + m[0] +
          "</dt><dd style=\"margin:.35rem 0 0;text-transform:capitalize\">" + esc(m[1]) + "</dd></div>";
      }).join("") + "</dl>" +
      (groups.length ? '<section class="card" style="margin-top:2rem"><h2 style="margin:0;font-size:1.15rem">Fit by region of the space</h2>' +
        groups.map(function (g) {
          return '<div style="margin-top:.8rem"><div style="display:flex;justify-content:space-between;font-size:.75rem;color:var(--muted)"><span>' + g.label +
            '</span><span class="mono">' + g.score + "</span></div><div class=\"bar\" style=\"margin-top:.3rem\"><i style=\"width:" + g.score + '%"></i></div></div>';
        }).join("") + "</section>" : "") +
      '<div class="grid-2" style="margin-top:1rem;align-items:stretch">' +
      '<section class="card"><h2 style="margin:0;font-size:1.15rem">Closest dimensions</h2><div style="margin-top:.8rem;display:grid;gap:1rem">' + fits.map(dimBar).join("") + "</div></section>" +
      '<section class="card"><h2 style="margin:0;font-size:1.15rem">Largest gaps</h2><div style="margin-top:.8rem;display:grid;gap:1rem">' + gaps.map(dimBar).join("") + "</div></section></div>" +
      '<div style="margin-top:2rem;display:flex;flex-wrap:wrap;gap:.6rem">' +
      '<a class="btn" href="' + BASE + "/app/messages/" + encodeURIComponent(person.userId) + '" data-link>Message</a>' +
      '<button class="btn outline" id="act-like">' + (flags.like ? "Unlike" : "Like") + "</button>" +
      '<button class="btn outline" id="act-block">' + (flags.block ? "Unblock" : "Block") + "</button>" +
      '<a class="btn outline" href="' + BASE + '/app" data-link>Back to search</a></div></main>';
  }

  function threadsView(data) {
    var threads = (data && data.threads) || [];
    return '<main class="wrap-md" style="padding:1.5rem 1rem"><h1 style="margin:0;font-size:1.8rem">Messages</h1>' +
      (threads.length === 0 ? '<p class="muted" style="margin-top:1.5rem">No threads yet. Open anyone from search and write first.</p>' : "") +
      '<ul style="list-style:none;margin:1.5rem 0 0;padding:0">' + threads.map(function (t) {
        return '<li style="border-top:1px solid var(--border)"><a href="' + BASE + "/app/messages/" + encodeURIComponent(t.otherId) +
          '" data-link style="display:flex;align-items:center;gap:.75rem;min-height:3.5rem;padding:.75rem 0">' +
          portrait(t.otherName, t.photoSeed, "md") +
          '<div style="min-width:0"><p style="margin:0;font-size:.9rem">' + esc(t.otherName) + '</p><p class="subtle" style="margin:.15rem 0 0;font-size:.75rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
          esc(t.lastBody) + "</p></div></a></li>";
      }).join("") + "</ul></main>";
  }

  function threadView(otherId, person, msgs) {
    var p = person && person.person;
    var list = (msgs && msgs.messages) || [];
    var meId = state.me && state.me.user && state.me.user.id;
    return '<div style="max-width:42rem;margin:0 auto;min-height:calc(100dvh - 64px);display:flex;flex-direction:column">' +
      '<div style="display:flex;align-items:center;gap:.75rem;border-bottom:1px solid var(--border);padding:.75rem 1rem">' +
      (p ? portrait(p.displayName, p.photoSeed, "sm") : "") +
      '<div style="flex:1;min-width:0"><a href="' + BASE + "/app/people/" + encodeURIComponent(otherId) + '" data-link style="font-weight:500">' +
      esc(p ? p.displayName : "Member") + '</a><p class="subtle" style="margin:0;font-size:.7rem">AI mediator ready — not enabled</p></div>' +
      (p ? '<span class="mono" style="color:var(--bloom);font-size:.8rem">' + yinYang(20) + " " + Math.round(p.score) + "</span>" : "") +
      "</div>" +
      '<div id="thread-list" style="flex:1;overflow:auto;padding:1rem;display:flex;flex-direction:column;gap:.75rem">' +
      (list.length === 0 ? '<p class="muted">No messages yet. Write first — they can reply.</p>' : "") +
      list.map(function (m) {
        var mine = String(m.senderId) === String(meId);
        return '<div class="msg-row' + (mine ? " mine" : "") + '"><div class="bubble ' + (mine ? "mine" : "theirs") + '">' +
          "<p style=\"margin:0\">" + esc(m.body) + "</p>" +
          (m.censored ? '<p class="subtle" style="margin:.3rem 0 0;font-size:.65rem">filtered</p>' : "") + "</div></div>";
      }).join("") + "</div>" +
      '<form id="msg-form" style="display:flex;gap:.5rem;padding:1rem;border-top:1px solid var(--border)">' +
      '<input class="input" id="msg-body" maxlength="2000" placeholder="Write a message" autocomplete="off">' +
      '<button class="btn" type="submit">Send</button></form>' +
      '<p id="msg-err" class="danger" style="padding:0 1rem 1rem;margin:0;font-size:.8rem"></p></div>';
  }

  function verifyView(status, scan) {
    var q = scan ? OCR.assessQuality(scan.quality) : null;
    var verified = status === "verified";
    return '<main class="wrap-md" style="padding:2rem 1rem"><p class="muted" style="font-size:.75rem;letter-spacing:.2em;text-transform:uppercase">Custom OCR</p>' +
      '<h1 style="margin:.4rem 0 0;font-size:2.2rem">ID verification</h1>' +
      '<p class="muted" style="margin:.75rem 0 0;font-size:.9rem;line-height:1.55">Lattice reads the machine-readable zone on a passport-style document, then validates ICAO check digits. Use the specimen to see it work end-to-end. Only a hash of the MRZ is stored — not the raw document number in the open profile.</p>' +
      '<div style="margin-top:1rem"><span class="badge ' + (verified ? "ok" : "") + '">' + esc(status || "unverified") + "</span></div>" +
      '<div class="card" style="margin-top:2rem"><div style="display:flex;flex-wrap:wrap;gap:.75rem">' +
      '<label class="btn outline" style="cursor:pointer">Upload ID photo<input type="file" accept="image/*" capture="environment" id="id-file" hidden></label>' +
      '<button class="btn outline" id="id-specimen">Use specimen</button></div>' +
      (scan ? '<img alt="Scan preview" src="' + scan.previewDataUrl + '" style="margin-top:1rem;width:100%;border-radius:var(--radius-md);border:1px solid var(--border)">' : "") +
      (q ? '<ul class="muted" style="margin:1rem 0 0;padding-left:1.1rem;font-size:.8rem">' + q.notes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul>" : "") +
      '<div style="margin-top:1rem;display:grid;gap:.6rem">' +
      '<label class="field"><span>MRZ line 1</span><input class="input mono" id="mrz1" value="' + esc(scan ? scan.line1 : "") + '"></label>' +
      '<label class="field"><span>MRZ line 2</span><input class="input mono" id="mrz2" value="' + esc(scan ? scan.line2 : "") + '"></label></div>' +
      '<button class="btn" style="margin-top:1rem" id="id-submit">Submit scan</button>' +
      '<p id="id-err" class="danger" style="margin:.75rem 0 0;font-size:.85rem"></p></div></main>';
  }

  function billingView(data) {
    var qs = new URLSearchParams(location.search);
    var kind = state.billKind || "membership";
    return '<main class="wrap-sm" style="padding:2rem 1.25rem"><h1 style="margin:0;font-size:2.2rem">Billing</h1>' +
      '<p class="muted" style="margin:.5rem 0 0;font-size:.9rem">$20 each month to message anyone. $35 once for a background check badge. Card numbers never touch our servers — Stripe Checkout on the same Cloud Run stack as merch.</p>' +
      (qs.get("ok") ? '<p class="badge ok" style="margin-top:1rem">Payment recorded.</p>' : "") +
      (qs.get("canceled") ? '<p class="muted" style="margin-top:1rem">Checkout canceled.</p>' : "") +
      '<div style="margin-top:1.4rem;display:flex;gap:.4rem;flex-wrap:wrap">' +
      '<span class="badge ' + (data.member ? "ok" : "") + '">' + (data.member ? "Member" : "Not a member") + "</span>" +
      '<span class="badge">Background: ' + esc(data.bgStatus || "none") + "</span></div>" +
      '<div style="margin-top:2rem;display:grid;gap:.75rem">' +
      [["membership", "Membership", "$20 / month", "Message anyone. Keep searching the full directory."],
        ["background", "Background check", "$35", "Identity + watchlist + criminal index. Shows a Checked badge."],
        ["both", "Both", "$55", "Start with membership and a check in one charge."]
      ].map(function (o) {
        return '<button class="opt' + (kind === o[0] ? " on" : "") + '" data-kind="' + o[0] + '"><div style="display:flex;justify-content:space-between;font-size:.9rem"><span>' +
          o[1] + '</span><span class="tabular">' + o[2] + '</span></div><p class="muted" style="margin:.35rem 0 0;font-size:.75rem">' + o[3] + "</p></button>";
      }).join("") + "</div>" +
      '<button class="btn lg full" style="margin-top:1.5rem" id="pay-go"' + (data.stripe ? "" : " disabled") + ">" +
      (data.stripe ? "Continue to Stripe" : "Stripe is not configured") + "</button>" +
      '<p id="pay-err" class="danger" style="margin:.75rem 0 0;font-size:.85rem"></p>' +
      ((data.payments || []).length ? '<h2 style="margin:2rem 0 0;font-size:1.1rem">History</h2><ul style="list-style:none;padding:0">' +
        data.payments.map(function (p) {
          return '<li class="subtle" style="padding:.5rem 0;border-bottom:1px solid var(--border);font-size:.8rem">' +
            esc(p.kind) + " · $" + (p.amountCents / 100).toFixed(2) + " · " + esc(p.status) + "</li>";
        }).join("") + "</ul>" : "") +
      "</main>";
  }

  function profileView() {
    var p = state.me && state.me.profile;
    if (!p) return '<main class="wrap-sm" style="padding:2rem"><p class="muted">No profile yet. <a href="' + BASE + '/app/onboard" data-link>Onboard</a></p></main>';
    var tab = state.profileTab;
    var traits = p.traits || {};
    var prefs = p.prefs || {};
    var groups = D.GROUPS.map(function (g) {
      var open = state.openGroup === g.id;
      return '<section><button type="button" class="grp-tog" data-g="' + g.id + '" style="display:flex;width:100%;justify-content:space-between;background:none;border:0;color:var(--subtle);letter-spacing:.08em;text-transform:uppercase;font-size:.75rem;padding:.4rem 0">' +
        g.label + "<span>" + (open ? "–" : "+") + "</span></button>" +
        (open ? '<div style="margin-top:.6rem;display:grid;gap:1rem">' + D.DIMENSIONS.filter(function (d) { return d.group === g.id; }).map(function (d) {
          if (tab === "you") {
            var v = traits[d.id] != null ? traits[d.id] : d.min;
            return '<label class="field"><span style="display:flex;justify-content:space-between">' + d.label +
              '<span class="mono">' + Math.round(v) + (d.unit ? " " + d.unit : "") + "</span></span>" +
              '<input class="range t-range" data-id="' + d.id + '" type="range" min="' + d.min + '" max="' + d.max + '" value="' + v + '"></label>';
          }
          var pr = prefs[d.id] || { ideal: 50, weight: 1 };
          return '<div><div class="field"><span style="display:flex;justify-content:space-between">' + d.label +
            '<span class="mono">ideal ' + Math.round(pr.ideal) + " · w " + pr.weight + "</span></span>" +
            '<input class="range p-ideal" data-id="' + d.id + '" type="range" min="' + d.min + '" max="' + d.max + '" value="' + pr.ideal + '">' +
            '<input class="range p-w" data-id="' + d.id + '" type="range" min="0" max="3" step="0.1" value="' + pr.weight + '"></div></div>';
        }).join("") + "</div>" : "") + "</section>";
    }).join("");
    return '<main class="wrap-md" style="padding:2rem 1rem"><div style="display:flex;gap:1rem;align-items:center">' +
      portrait(p.displayName, p.photoSeed, "lg") +
      "<div><h1 style=\"margin:0;font-size:1.8rem\">" + esc(p.displayName) + '</h1><p class="muted" style="margin:.25rem 0 0">' + p.age + " · " + esc(p.city || "Unknown city") + "</p>" +
      '<div style="margin-top:.5rem;display:flex;gap:.35rem;flex-wrap:wrap">' +
      '<span class="badge ' + (p.member ? "ok" : "") + '">' + (p.member ? "Member" : "Guest") + "</span>" +
      '<span class="badge ' + (p.idStatus === "verified" ? "ok" : "") + '">ID ' + esc(p.idStatus) + "</span>" +
      '<span class="badge">BG ' + esc(p.bgStatus) + "</span></div></div></div>" +
      '<div style="margin-top:1.4rem;display:flex;flex-wrap:wrap;gap:.5rem">' +
      '<a class="btn sm" href="' + BASE + '/app/billing" data-link>Billing</a>' +
      '<a class="btn sm outline" href="' + BASE + '/app/verify" data-link>ID scan</a>' +
      '<a class="btn sm outline" href="' + BASE + '/app/settings" data-link>Settings</a>' +
      '<button class="btn sm outline" id="sign-out">Sign out</button></div>' +
      '<div style="margin-top:2rem;display:grid;gap:.75rem">' +
      '<label class="field"><span>City</span><input class="input" id="pr-city" value="' + esc(p.city) + '"></label>' +
      '<label class="field"><span>Bio</span><textarea id="pr-bio">' + esc(p.bio) + "</textarea></label></div>" +
      '<div style="margin-top:2rem;display:flex;gap:.5rem">' +
      '<button class="btn sm' + (tab === "you" ? "" : " outline") + '" id="tab-you">Your traits</button>' +
      '<button class="btn sm' + (tab === "want" ? "" : " outline") + '" id="tab-want">What you want</button></div>' +
      '<div style="margin-top:1.4rem;display:grid;gap:1rem">' + groups + "</div>" +
      '<button class="btn" style="margin-top:2rem" id="pr-save">Save dimensions</button>' +
      '<p id="pr-err" class="danger" style="margin:.75rem 0 0"></p></main>';
  }

  function settingsView() {
    var s = (state.me && state.me.settings) || {};
    var n = s.notifications || {};
    var p = s.privacy || {};
    var d = s.discovery || {};
    var a = s.account || {};
    var email = (state.me && state.me.user && state.me.user.email) || "";
    function tog(id, on, label, hint) {
      return '<label class="switch-row"><span><strong style="font-weight:500">' + label + '</strong>' +
        (hint ? '<span class="subtle" style="display:block;font-size:.75rem">' + hint + "</span>" : "") +
        '</span><input type="checkbox" id="' + id + '"' + (on ? " checked" : "") + "></label>";
    }
    return '<main class="wrap-sm" style="padding:2rem 1.25rem"><h1 style="margin:0;font-size:2rem">Account & settings</h1>' +
      '<p class="muted" style="margin:.5rem 0 0;font-size:.9rem">Stored in Cloud SQL against your site user. Same login as the rest of futuremusic.online.</p>' +
      '<section class="card" style="margin-top:1.5rem"><h2 style="margin:0;font-size:1.1rem">Notifications</h2>' +
      tog("n-msg", n.messages !== false, "Messages", "When someone writes you") +
      tog("n-like", n.likes !== false, "Likes", "When someone likes your profile") +
      tog("n-match", n.matches !== false, "Mutual matches", "When a like is returned") +
      tog("n-mkt", n.marketing === true, "Occasional notes", "Off by default") + "</section>" +
      '<section class="card" style="margin-top:1rem"><h2 style="margin:0;font-size:1.1rem">Privacy</h2>' +
      tog("p-dir", p.directoryVisible !== false, "Show in directory") +
      tog("p-city", p.showCity !== false, "Show city") +
      tog("p-occ", p.showOccupation !== false, "Show occupation") +
      tog("a-hide", a.hideProfile === true, "Hide profile", "Removes you from search until you unhide") + "</section>" +
      '<section class="card" style="margin-top:1rem"><h2 style="margin:0;font-size:1.1rem">Discovery defaults</h2>' +
      tog("d-comp", d.compatibleOnly !== false, "Mutual seeking by default") +
      tog("d-ver", d.verifiedOnly === true, "Verified IDs only") +
      tog("d-chk", d.checkedOnly === true, "Background-cleared only") + "</section>" +
      '<button class="btn" style="margin-top:1rem" id="set-save">Save settings</button>' +
      '<section class="card" style="margin-top:1.5rem"><h2 style="margin:0;font-size:1.1rem">Email</h2>' +
      '<label class="field" style="margin-top:.8rem"><span>Account email</span><input class="input" id="acc-email" type="email" value="' + esc(email) + '"></label>' +
      '<button class="btn outline sm" style="margin-top:.8rem" id="email-save">Update email</button></section>' +
      '<section class="card" style="margin-top:1rem"><h2 style="margin:0;font-size:1.1rem">Password</h2>' +
      '<p class="subtle" style="margin:.5rem 0 0;font-size:.75rem">Google-only accounts can leave current blank and set a password here.</p>' +
      '<label class="field" style="margin-top:.8rem"><span>Current</span><input class="input" id="pw-cur" type="password"></label>' +
      '<label class="field" style="margin-top:.8rem"><span>New</span><input class="input" id="pw-new" type="password"></label>' +
      '<button class="btn outline sm" style="margin-top:.8rem" id="pw-save">Change password</button></section>' +
      '<p id="set-err" class="danger" style="margin-top:1rem"></p></main>';
  }

  function collectOnboard() {
    var o = state.onboard;
    var el;
    if ((el = document.getElementById("ob-name"))) o.displayName = el.value;
    if ((el = document.getElementById("ob-age"))) o.age = Number(el.value) || o.age;
    if ((el = document.getElementById("ob-gender"))) o.gender = el.value;
    var seek = document.querySelectorAll('input[name="seeking"]:checked');
    if (seek.length) o.seeking = Array.prototype.map.call(seek, function (n) { return n.value; });
    if ((el = document.getElementById("ob-city"))) o.city = el.value;
    if ((el = document.getElementById("ob-country"))) o.country = el.value;
    if ((el = document.getElementById("ob-intent"))) o.intent = el.value;
    if ((el = document.getElementById("ob-occ"))) o.occupation = el.value;
    if ((el = document.getElementById("ob-edu"))) o.education = el.value;
    if ((el = document.getElementById("ob-bio"))) o.bio = el.value;
    document.querySelectorAll(".dim-range").forEach(function (r) { o.traits[r.getAttribute("data-id")] = Number(r.value); });
    var heavy = document.querySelectorAll(".heavy:checked");
    if (document.querySelector(".heavy")) o.heavy = Array.prototype.map.call(heavy, function (n) { return n.value; });
  }

  async function saveOnboard() {
    var o = state.onboard;
    o.traits.age = o.age;
    var prefs = D.defaultPrefs(o.traits);
    o.heavy.forEach(function (id) {
      if (prefs[id]) prefs[id] = { ideal: prefs[id].ideal, weight: 2.5 };
    });
    var res = await api("/api/profile", {
      body: {
        displayName: o.displayName,
        age: o.age,
        gender: o.gender,
        seeking: o.seeking,
        city: o.city,
        country: o.country,
        intent: o.intent,
        bio: o.bio,
        occupation: o.occupation,
        education: o.education,
        traits: o.traits,
        prefs: prefs,
        onboarded: true,
        photoSeed: (o.displayName || "").length * 17 + o.age
      }
    });
    if (res.error) throw new Error(res.error);
    state.me.profile = res.profile;
  }

  function bindLanding() {}

  function bindLogin() {
    var mode = "login";
    var form = document.getElementById("auth-form");
    var tog = document.getElementById("auth-toggle");
    var sub = document.getElementById("auth-submit");
    var wrap = document.getElementById("confirm-wrap");
    tog.addEventListener("click", function () {
      mode = mode === "login" ? "register" : "login";
      wrap.style.display = mode === "register" ? "block" : "none";
      sub.textContent = mode === "register" ? "Create account" : "Sign in";
      tog.textContent = mode === "register" ? "Have an account? Sign in" : "Need an account? Register";
    });
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      state.err = "";
      var fd = new FormData(form);
      var body = {
        email: fd.get("email"),
        password: fd.get("password"),
        confirmPassword: fd.get("confirmPassword") || fd.get("password")
      };
      try {
        var res = await api(mode === "register" ? "/api/register" : "/api/login", { body: body });
        if (res.error) throw new Error(res.error);
        go("/app");
      } catch (err) {
        state.err = err.message;
        render();
      }
    });
  }

  function bindOnboard() {
    document.getElementById("ob-next").addEventListener("click", async function () {
      collectOnboard();
      if (state.onboard.step < 2) {
        state.onboard.step += 1;
        render();
        return;
      }
      try {
        state.err = "";
        await saveOnboard();
        go("/app/verify");
      } catch (err) {
        state.err = err.message;
        render();
      }
    });
    var back = document.getElementById("ob-back");
    if (back) back.addEventListener("click", function () {
      collectOnboard();
      state.onboard.step -= 1;
      render();
    });
  }

  function readFiltersFromDom() {
    var f = state.filters;
    var el = document.getElementById("dir-q"); if (el) f.q = el.value;
    el = document.getElementById("dir-sort"); if (el) f.sort = el.value;
    el = document.getElementById("f-gender"); if (el) f.gender = el.value;
    el = document.getElementById("f-intent"); if (el) f.intent = el.value;
    el = document.getElementById("f-city"); if (el) f.city = el.value;
    el = document.getElementById("f-country"); if (el) f.country = el.value;
    el = document.getElementById("f-edu"); if (el) f.education = el.value;
    el = document.getElementById("f-rel"); if (el) f.religion = el.value;
    el = document.getElementById("f-lang"); if (el) f.language = el.value;
    el = document.getElementById("f-amin"); if (el) f.minAge = el.value;
    el = document.getElementById("f-amax"); if (el) f.maxAge = el.value;
  }

  function bindDirectory() {
    document.getElementById("dir-filters").addEventListener("click", function () {
      readFiltersFromDom();
      state.filtersOpen = !state.filtersOpen;
      render();
    });
    var q = document.getElementById("dir-q");
    var t;
    q.addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(function () { state.filters.q = q.value; loadDirectory(); }, 280);
    });
    document.getElementById("dir-sort").addEventListener("change", function (e) {
      state.filters.sort = e.target.value;
      loadDirectory();
    });
    document.querySelectorAll("[data-sc]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var s = SHORTCUTS[Number(btn.getAttribute("data-sc"))];
        var p = s.patch;
        if (p.compatible != null) state.filters.compatible = !state.filters.compatible;
        if (p.intent) state.filters.intent = state.filters.intent === p.intent ? "" : p.intent;
        if (p.verified) state.filters.verified = !state.filters.verified;
        if (p.checked) state.filters.checked = !state.filters.checked;
        if (p.dim) {
          if (state.filters.dim === p.dim) { state.filters.dim = ""; state.filters.dimMin = ""; state.filters.dimMax = ""; }
          else { state.filters.dim = p.dim; state.filters.dimMin = p.dimMin != null ? String(p.dimMin) : ""; state.filters.dimMax = p.dimMax != null ? String(p.dimMax) : ""; }
        }
        loadDirectory();
      });
    });
    ["f-gender", "f-intent", "f-edu"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("change", function () { readFiltersFromDom(); loadDirectory(); });
    });
    ["f-city", "f-country", "f-rel", "f-lang", "f-amin", "f-amax"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("change", function () { readFiltersFromDom(); loadDirectory(); });
    });
  }

  async function loadDirectory() {
    var f = state.filters;
    var body = {
      q: f.q, gender: f.gender || undefined, intent: f.intent || undefined, city: f.city || undefined,
      country: f.country || undefined, education: f.education || undefined, religion: f.religion || undefined,
      language: f.language || undefined, sort: f.sort, dim: f.dim || undefined,
      dimMin: f.dimMin ? Number(f.dimMin) : undefined, dimMax: f.dimMax ? Number(f.dimMax) : undefined,
      minAge: f.minAge ? Number(f.minAge) : undefined, maxAge: f.maxAge ? Number(f.maxAge) : undefined,
      compatible: f.compatible, verified: f.verified || undefined, checked: f.checked || undefined
    };
    state.directory = await api("/api/directory", { body: body });
    state.rail = (state.directory.people || []).slice(0, 12);
    render();
  }

  function bindPerson(id, flags) {
    document.getElementById("act-like").addEventListener("click", async function () {
      await api("/api/interactions", { body: { targetId: id, kind: flags.like ? "unlike" : "like" } });
      render();
    });
    document.getElementById("act-block").addEventListener("click", async function () {
      await api("/api/interactions", { body: { targetId: id, kind: flags.block ? "unblock" : "block" } });
      go("/app");
    });
  }

  function bindThread(otherId) {
    document.getElementById("msg-form").addEventListener("submit", async function (e) {
      e.preventDefault();
      var body = document.getElementById("msg-body").value;
      var err = document.getElementById("msg-err");
      err.textContent = "";
      var res = await api("/api/messages", { body: { otherId: otherId, body: body } });
      if (!res.ok) { err.textContent = res.error || "Could not send."; return; }
      document.getElementById("msg-body").value = "";
      render();
    });
  }

  function bindVerify() {
    var scan = state.scan || null;
    async function applyFile(file) {
      var err = document.getElementById("id-err");
      err.textContent = "Scanning…";
      try {
        state.scan = await OCR.scanIdImage(file);
        render();
      } catch (e) {
        err.textContent = e.message || "Scan failed";
      }
    }
    document.getElementById("id-file").addEventListener("change", function (e) {
      var f = e.target.files && e.target.files[0];
      if (f) applyFile(f);
    });
    document.getElementById("id-specimen").addEventListener("click", async function () {
      var blob = await OCR.drawSpecimenDocument();
      applyFile(blob);
    });
    document.getElementById("id-submit").addEventListener("click", async function () {
      var err = document.getElementById("id-err");
      err.textContent = "";
      var res = await api("/api/verify", {
        body: {
          line1: document.getElementById("mrz1").value,
          line2: document.getElementById("mrz2").value,
          quality: (state.scan && state.scan.quality) || { blur: 40, glare: 0, fill: 1, contrast: 0.4, linesFound: 2 }
        }
      });
      if (res.error) { err.textContent = res.error; return; }
      state.verifyStatus = res.status;
      render();
    });
  }

  function bindBilling() {
    document.querySelectorAll("[data-kind]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.billKind = b.getAttribute("data-kind");
        render();
      });
    });
    document.getElementById("pay-go").addEventListener("click", async function () {
      var err = document.getElementById("pay-err");
      err.textContent = "";
      var res = await api("/api/checkout", { body: { kind: state.billKind || "membership" } });
      if (res.error) { err.textContent = res.error; return; }
      if (res.url) location.href = res.url;
    });
  }

  function bindProfile() {
    document.getElementById("tab-you").addEventListener("click", function () { state.profileTab = "you"; render(); });
    document.getElementById("tab-want").addEventListener("click", function () { state.profileTab = "want"; render(); });
    document.querySelectorAll(".grp-tog").forEach(function (b) {
      b.addEventListener("click", function () { state.openGroup = b.getAttribute("data-g"); render(); });
    });
    document.getElementById("sign-out").addEventListener("click", async function () {
      await api("/api/logout", { method: "POST", body: {} });
      state.me = { user: null };
      go("/");
    });
    document.getElementById("pr-save").addEventListener("click", async function () {
      var p = state.me.profile;
      var traits = Object.assign({}, p.traits);
      var prefs = JSON.parse(JSON.stringify(p.prefs || D.defaultPrefs(traits)));
      document.querySelectorAll(".t-range").forEach(function (r) { traits[r.getAttribute("data-id")] = Number(r.value); });
      document.querySelectorAll(".p-ideal").forEach(function (r) {
        var id = r.getAttribute("data-id");
        prefs[id] = prefs[id] || { ideal: 50, weight: 1 };
        prefs[id].ideal = Number(r.value);
      });
      document.querySelectorAll(".p-w").forEach(function (r) {
        var id = r.getAttribute("data-id");
        prefs[id] = prefs[id] || { ideal: 50, weight: 1 };
        prefs[id].weight = Number(r.value);
      });
      var res = await api("/api/profile", {
        body: {
          displayName: p.displayName, age: p.age, gender: p.gender, seeking: p.seeking,
          city: document.getElementById("pr-city").value, country: p.country, bio: document.getElementById("pr-bio").value,
          education: p.education, occupation: p.occupation, religion: p.religion, languages: p.languages,
          intent: p.intent, traits: traits, prefs: prefs, photoSeed: p.photoSeed, onboarded: true
        }
      });
      var err = document.getElementById("pr-err");
      if (res.error) { err.textContent = res.error; return; }
      state.me.profile = res.profile;
      err.style.color = "var(--ok)";
      err.textContent = "Saved.";
    });
  }

  function bindSettings() {
    document.getElementById("set-save").addEventListener("click", async function () {
      var res = await api("/api/settings", {
        body: {
          notifications: {
            messages: document.getElementById("n-msg").checked,
            likes: document.getElementById("n-like").checked,
            matches: document.getElementById("n-match").checked,
            marketing: document.getElementById("n-mkt").checked
          },
          privacy: {
            directoryVisible: document.getElementById("p-dir").checked,
            showCity: document.getElementById("p-city").checked,
            showOccupation: document.getElementById("p-occ").checked
          },
          discovery: {
            compatibleOnly: document.getElementById("d-comp").checked,
            verifiedOnly: document.getElementById("d-ver").checked,
            checkedOnly: document.getElementById("d-chk").checked
          },
          account: { hideProfile: document.getElementById("a-hide").checked }
        }
      });
      var err = document.getElementById("set-err");
      if (res.error) { err.textContent = res.error; return; }
      state.me.settings = res.settings;
      err.style.color = "var(--ok)";
      err.textContent = "Settings saved.";
    });
    document.getElementById("email-save").addEventListener("click", async function () {
      var res = await api("/api/account/email", { body: { email: document.getElementById("acc-email").value } });
      var err = document.getElementById("set-err");
      if (res.error) { err.textContent = res.error; return; }
      state.me.user.email = res.email;
      err.style.color = "var(--ok)";
      err.textContent = "Email updated.";
    });
    document.getElementById("pw-save").addEventListener("click", async function () {
      var res = await api("/api/account/password", {
        body: { currentPassword: document.getElementById("pw-cur").value, newPassword: document.getElementById("pw-new").value }
      });
      var err = document.getElementById("set-err");
      if (res.error) { err.textContent = res.error; return; }
      err.style.color = "var(--ok)";
      err.textContent = "Password changed.";
    });
  }

  var cache = {};

  async function render() {
    var p = path();
    if (!state.configLoaded) {
      state.config = await api("/api/config");
      state.configLoaded = true;
    }
    if (!state.meLoaded || p.indexOf("/app") === 0) {
      state.me = await api("/api/me");
      state.meLoaded = true;
    }
    if (state.me && state.me.user && (p === "/" || p === "/login")) {
      go("/app", true);
      return;
    }
    if (p.indexOf("/app") === 0 && !(state.me && state.me.user)) {
      go("/login", true);
      return;
    }
    if (state.me && state.me.user && !(state.me.profile && state.me.profile.onboarded) && p.indexOf("/app/onboard") !== 0 && p.indexOf("/app") === 0) {
      if (state.me.user.email && !state.onboard.displayName) {
        state.onboard.displayName = state.me.user.email.split("@")[0];
      }
      go("/app/onboard", true);
      return;
    }

    var binder = function () {};
    if (p === "/") {
      root.innerHTML = landing();
    } else if (p === "/login") {
      root.innerHTML = login();
      binder = bindLogin;
    } else if (p === "/app/onboard") {
      root.innerHTML = onboard();
      binder = bindOnboard;
    } else if (p === "/app") {
      if (!state.directory) {
        root.innerHTML = shell('<p class="muted" style="padding:2rem">Loading directory…</p>');
        binder = function () {};
        await loadDirectory();
        return;
      }
      root.innerHTML = shell(directoryView());
      binder = bindDirectory;
    } else if (p.indexOf("/app/people/") === 0) {
      var pid = decodeURIComponent(p.slice("/app/people/".length));
      var person = await api("/api/people/" + encodeURIComponent(pid));
      root.innerHTML = shell(personView(person));
      binder = function () { bindPerson(pid, person.flags || {}); };
    } else if (p === "/app/messages") {
      var th = await api("/api/threads");
      root.innerHTML = shell(threadsView(th));
    } else if (p.indexOf("/app/messages/") === 0) {
      var oid = decodeURIComponent(p.slice("/app/messages/".length));
      var [pr, ms] = await Promise.all([
        api("/api/people/" + encodeURIComponent(oid)),
        api("/api/messages/" + encodeURIComponent(oid))
      ]);
      root.innerHTML = shell(threadView(oid, pr, ms));
      binder = function () { bindThread(oid); };
    } else if (p === "/app/verify") {
      var st = await api("/api/verify");
      root.innerHTML = shell(verifyView(st.status, state.scan));
      binder = bindVerify;
    } else if (p === "/app/billing") {
      var bill = await api("/api/billing");
      root.innerHTML = shell(billingView(bill));
      binder = bindBilling;
    } else if (p === "/app/settings") {
      root.innerHTML = shell(settingsView());
      binder = bindSettings;
    } else if (p === "/app/profile") {
      root.innerHTML = shell(profileView());
      binder = bindProfile;
    } else {
      root.innerHTML = landing();
    }

    root.querySelectorAll("[data-link]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        var href = a.getAttribute("href");
        if (href.indexOf(BASE) === 0) go(href.slice(BASE.length) || "/");
      });
    });
    binder();
  }

  window.addEventListener("popstate", function () { state.directory = state.directory; render(); });
  render().catch(function (err) {
    root.innerHTML = '<main class="wrap" style="padding:3rem 1rem"><p class="danger">' + esc(err.message) + "</p></main>";
  });
})();
