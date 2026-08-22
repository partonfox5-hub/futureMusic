/* Future Music homepage galaxy splash — WebGL2/1 nebula, planets, gravity wells, black holes. */
(function (global) {
  "use strict";

  const MAX_HOLES = 4;
  const MAX_PLANETS = 6;

  const VERT_FULL = `
    attribute vec2 aPos;
    varying vec2 vUv;
    void main() {
      vUv = aPos * 0.5 + 0.5;
      gl_Position = vec4(aPos, 0.0, 1.0);
    }
  `;

  const FRAG_SCENE = `
    precision highp float;
    varying vec2 vUv;
    uniform vec2 uRes;
    uniform float uTime;
    uniform vec4 uPlanetPos[6];
    uniform vec4 uPlanetPar[6];

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }
    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = p * 2.07 + vec2(1.7, 9.2);
        a *= 0.5;
      }
      return v;
    }
    float n3(vec3 p) {
      return noise(p.xy + vec2(p.z * 1.7, p.z * 3.1));
    }
    float fbm3(vec3 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 4; i++) {
        v += a * n3(p);
        p = p * 2.11 + vec3(1.3, 0.7, 2.1);
        a *= 0.5;
      }
      return v;
    }

    vec3 planetAlbedo(vec3 p, float typ, float seed) {
      float y = p.y;
      float n = fbm3(p * 3.2 + seed);
      float n2 = fbm3(p * 8.0 + seed * 1.7);
      if (typ < 0.5) {
        float ice = smoothstep(-0.15, 0.55, abs(y) + n * 0.15);
        vec3 land = mix(vec3(0.07, 0.16, 0.08), vec3(0.28, 0.22, 0.12), n);
        vec3 ocean = vec3(0.02, 0.08, 0.22);
        vec3 c = mix(ocean, land, smoothstep(0.42, 0.55, n));
        c = mix(c, vec3(0.86, 0.91, 0.96), ice);
        float cloud = smoothstep(0.55, 0.8, n2);
        return mix(c, vec3(0.9, 0.93, 0.98), cloud * 0.65);
      } else if (typ < 1.5) {
        float bands = sin(y * 14.0 + n * 3.5 + seed);
        vec3 a = vec3(0.62, 0.38, 0.16);
        vec3 b = vec3(0.92, 0.78, 0.52);
        vec3 c = vec3(0.35, 0.18, 0.08);
        vec3 col = mix(a, b, 0.5 + 0.5 * bands);
        col = mix(col, c, smoothstep(0.6, 0.95, n2));
        return col * (0.85 + 0.2 * n);
      } else if (typ < 2.5) {
        vec3 base = mix(vec3(0.12, 0.22, 0.55), vec3(0.25, 0.55, 0.72), 0.5 + 0.5 * y);
        float storm = smoothstep(0.62, 0.9, n);
        return mix(base, vec3(0.75, 0.85, 0.95), storm * 0.45) + n2 * 0.08;
      } else if (typ < 3.5) {
        vec3 rock = mix(vec3(0.22, 0.1, 0.06), vec3(0.45, 0.22, 0.1), n);
        float crack = smoothstep(0.72, 0.92, n2);
        vec3 lava = vec3(1.6, 0.45, 0.05);
        return mix(rock, lava, crack);
      } else if (typ < 4.5) {
        vec3 ice = mix(vec3(0.55, 0.62, 0.7), vec3(0.85, 0.9, 0.95), n);
        float cap = smoothstep(0.35, 0.7, abs(y));
        return mix(vec3(0.35, 0.38, 0.42), ice, cap);
      } else {
        float bands = sin(y * 10.0 + n * 2.0);
        return mix(vec3(0.72, 0.58, 0.32), vec3(0.95, 0.86, 0.62), 0.5 + 0.5 * bands);
      }
    }

    vec3 atmTint(float typ) {
      if (typ < 0.5) return vec3(0.35, 0.6, 1.0);
      if (typ < 1.5) return vec3(1.0, 0.75, 0.4);
      if (typ < 2.5) return vec3(0.4, 0.7, 1.0);
      if (typ < 3.5) return vec3(1.0, 0.35, 0.1);
      if (typ < 4.5) return vec3(0.7, 0.85, 1.0);
      return vec3(1.0, 0.85, 0.5);
    }

    void main() {
      vec2 uv = vUv;
      float aspect = uRes.x / max(uRes.y, 1.0);
      vec2 p = uv - 0.5;
      p.x *= aspect;

      float t = uTime * 0.015;
      float nA = fbm(uv * 1.6 + vec2(t, -t * 0.4));
      float nB = fbm(uv * 3.2 + vec2(-t * 0.7, t * 0.5) + 8.0);
      float nC = fbm(uv * 6.5 + 20.0 + t * 0.2);

      vec3 col = vec3(0.0006, 0.0008, 0.0022);
      col += vec3(0.035, 0.012, 0.038) * nA;
      col += vec3(0.012, 0.035, 0.045) * nB * 0.55;
      col += vec3(0.055, 0.032, 0.012) * pow(nC, 2.2) * 0.22;

      float r = length(p);
      float ang = atan(p.y, p.x);
      float arm = 0.5 + 0.5 * sin(ang * 2.0 + r * 16.0 - uTime * 0.04);
      float spiral = pow(arm, 3.0) * exp(-r * 2.8) * (0.45 + 0.35 * nB);
      col += vec3(0.38, 0.24, 0.10) * spiral * 0.22;
      col += vec3(0.05, 0.08, 0.12) * exp(-r * 4.2) * 0.22;

      float core = exp(-r * 18.0);
      col += vec3(0.7, 0.55, 0.32) * core * 0.28;
      col += vec3(0.8, 0.5, 0.22) * pow(core, 2.4) * 0.18;

      vec3 light = normalize(vec3(-0.35, 0.2, 0.75));

      for (int i = 0; i < 6; i++) {
        vec2 c = uPlanetPos[i].xy;
        float rad = uPlanetPos[i].z;
        float z = uPlanetPos[i].w;
        if (rad >= 0.001) {
        float typ = uPlanetPar[i].x;
        float rot = uPlanetPar[i].y;
        float seed = uPlanetPar[i].z;

        vec2 d = uv - c;
        d.x *= aspect;
        float rr = length(d) / rad;
        if (typ > 4.5) {
          vec2 rd = d;
          rd.y *= 3.2;
          float ringR = length(rd) / rad;
          if (ringR > 1.25 && ringR < 2.15 && rr > 0.95) {
            float dens = smoothstep(1.25, 1.4, ringR) * smoothstep(2.15, 1.85, ringR);
            dens *= 0.55 + 0.45 * noise(vec2(ringR * 8.0, atan(rd.y, rd.x) * 4.0));
            float behind = d.y > 0.0 && rr < 1.0 ? 0.0 : 1.0;
            col += vec3(0.85, 0.72, 0.45) * dens * 0.55 * behind;
          }
        }
        if (rr < 1.0) {
          float nz = sqrt(max(0.0, 1.0 - rr * rr));
          vec3 nrm = vec3(d / rad, nz);
          float cs = cos(rot);
          float sn = sin(rot);
          vec3 pr = vec3(cs * nrm.x + sn * nrm.z, nrm.y, -sn * nrm.x + cs * nrm.z);
          vec3 alb = planetAlbedo(pr, typ, seed);
          float ndl = max(0.0, dot(nrm, light));
          float wrap = ndl * 0.78 + 0.22;
          float fres = pow(1.0 - max(nrm.z, 0.0), 2.4);
          vec3 atm = atmTint(typ) * fres * 0.85;
          float spec = 0.0;
          if (typ < 0.5) {
            vec3 h = normalize(light + vec3(0.0, 0.0, 1.0));
            spec = pow(max(dot(nrm, h), 0.0), 48.0) * 0.35;
          }
          float shadeZ = mix(0.42, 0.72, clamp(z, 0.0, 1.0));
          col = alb * wrap * shadeZ + atm * shadeZ + vec3(spec);
        } else if (rr < 1.18) {
          float halo = 1.0 - smoothstep(1.0, 1.18, rr);
          col += atmTint(typ) * halo * 0.12;
        }
        }
      }

      col += vec3(0.7, 0.78, 0.9) * pow(nC, 12.0) * 0.06;
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const VERT_STAR = `
    attribute vec2 aPos;
    attribute vec4 aData;
    uniform vec2 uRes;
    varying vec3 vCol;
    varying float vBright;
    void main() {
      vec2 clip = vec2(aPos.x / uRes.x * 2.0 - 1.0, aPos.y / uRes.y * 2.0 - 1.0);
      gl_Position = vec4(clip, 0.0, 1.0);
      float psz = aData.w * (uRes.y / 720.0);
      gl_PointSize = max(1.0, min(psz, 28.0));
      vCol = aData.xyz;
      vBright = aData.w;
    }
  `;

  const FRAG_STAR = `
    precision mediump float;
    varying vec3 vCol;
    varying float vBright;
    void main() {
      vec2 c = gl_PointCoord * 2.0 - 1.0;
      float d = dot(c, c);
      if (d > 1.0) discard;
      float core = exp(-d * 6.5);
      float spike = 0.0;
      if (vBright > 5.5) {
        spike = exp(-abs(c.x) * 38.0) * exp(-abs(c.y) * 2.4)
              + exp(-abs(c.y) * 38.0) * exp(-abs(c.x) * 2.4);
      }
      float a = core + spike * 0.55;
      gl_FragColor = vec4(vCol * (0.42 + core * 0.55), a);
    }
  `;

  const FRAG_COMPOSITE = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uScene;
    uniform vec2 uRes;
    uniform float uTime;
    uniform vec3 uHoles[4];

    vec3 diskColor(vec2 rel, float rs, float mass) {
      float tilt = 0.42;
      vec2 q = rel;
      q.y /= tilt;
      float r = length(q);
      float inner = rs * 2.15;
      float outer = rs * (7.5 + mass * 5.0);
      if (r < inner || r > outer) return vec3(0.0);
      float ang = atan(q.y, q.x);
      float dens = smoothstep(inner, inner * 1.35, r) * smoothstep(outer, inner * 2.2, r);
      float turb = 0.5 + 0.5 * sin(ang * 5.0 + r * 18.0 - uTime * 1.6);
      dens *= 0.4 + 0.6 * turb;
      vec3 hot = vec3(1.7, 1.25, 0.65);
      vec3 mid = vec3(1.15, 0.45, 0.1);
      vec3 cool = vec3(0.35, 0.12, 0.04);
      float k = smoothstep(outer * 0.7, inner, r);
      vec3 col = mix(cool, mix(mid, hot, k), k);
      col *= 1.0 + 0.55 * clamp(q.x / (r + 0.001), -1.0, 1.0);
      return col * dens * (1.6 + mass * 2.0);
    }

    void main() {
      vec2 uv = vUv;
      float aspect = uRes.x / max(uRes.y, 1.0);
      vec2 luv = uv;
      vec3 add = vec3(0.0);
      float hide = 0.0;

      for (int i = 0; i < 4; i++) {
        vec2 h = uHoles[i].xy;
        float m = uHoles[i].z;
        if (m >= 0.008) {
        vec2 d = luv - h;
        d.x *= aspect;
        float r = length(d);
        float rs = 0.008 + m * 0.0725;
        vec2 dn = d / max(r, 1e-5);
        float pull = (rs * rs) / (r * r + 1e-4);
        luv.x -= (dn.x / aspect) * pull * 1.25;
        luv.y -= dn.y * pull * 1.25;

        float horizon = smoothstep(rs * 1.12, rs * 0.92, r);
        hide = max(hide, horizon);
        float ring = exp(-pow((r - rs * 2.05) * 90.0, 2.0));
        add += vec3(1.5, 1.15, 0.55) * ring * (0.8 + m);
        add += diskColor(d, rs, m);
        add += vec3(1.0, 0.55, 0.15) * exp(-r * 8.0 / max(m, 0.05)) * m * 0.25;
        }
      }

      vec2 suv = clamp(luv, 0.0, 1.0);
      vec3 col = texture2D(uScene, suv).rgb;
      float oob = 1.0 - step(0.0, luv.x) * step(luv.x, 1.0) * step(0.0, luv.y) * step(luv.y, 1.0);
      col *= 1.0 - oob;
      col *= 1.0 - hide;
      col += add;
      float vig = smoothstep(1.15, 0.35, length((vUv - 0.5) * vec2(aspect * 0.55, 1.0)));
      col *= mix(0.28, 1.0, vig);
      col = col / (col + vec3(1.15)) * 1.05;
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(sh), src.slice(0, 120));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function program(gl, vs, fs) {
    const v = compile(gl, gl.VERTEX_SHADER, vs);
    const f = compile(gl, gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    const p = gl.createProgram();
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(p));
      return null;
    }
    return p;
  }

  function makeFBO(gl, w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fb, w, h };
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function GalaxySplash(canvas, opts) {
    opts = opts || {};
    const root = opts.root || canvas.parentElement || canvas;
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
    });
    if (!gl) {
      console.warn("GalaxySplash: WebGL unavailable");
      return { destroy: function () {} };
    }

    const sceneProg = program(gl, VERT_FULL, FRAG_SCENE);
    const starProg = program(gl, VERT_STAR, FRAG_STAR);
    const compProg = program(gl, VERT_FULL, FRAG_COMPOSITE);
    if (!sceneProg || !starProg || !compProg) {
      return { destroy: function () {} };
    }

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const starBuf = gl.createBuffer();
    let fbo = null;
    let w = 0;
    let h = 0;
    let dpr = 1;

    const mobile = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 800;
    const starCount = mobile ? 4200 : 12000;
    const dustCount = mobile ? 900 : 2400;
    const nStars = starCount + dustCount;
    const starPos = new Float32Array(nStars * 2);
    const starVel = new Float32Array(nStars * 2);
    const starData = new Float32Array(nStars * 4);
    const starBufCPU = new Float32Array(nStars * 6);

    function starColor(i, dust) {
      if (dust) return [1.0, 0.72, 0.38];
      const t = Math.random();
      if (t > 0.92) return [0.83, 0.68, 0.22];
      if (t > 0.82) return [0.45, 0.78, 0.85];
      if (t > 0.7) return [0.65, 0.78, 1.0];
      if (t > 0.58) return [1.0, 0.82, 0.62];
      if (t > 0.5) return [1.0, 0.55, 0.4];
      return [0.95, 0.96, 1.0];
    }

    function resetStar(i, edge) {
      const dust = i >= starCount;
      if (edge) {
        const side = (Math.random() * 4) | 0;
        if (side === 0) {
          starPos[i * 2] = Math.random() * w;
          starPos[i * 2 + 1] = -4;
        } else if (side === 1) {
          starPos[i * 2] = Math.random() * w;
          starPos[i * 2 + 1] = h + 4;
        } else if (side === 2) {
          starPos[i * 2] = -4;
          starPos[i * 2 + 1] = Math.random() * h;
        } else {
          starPos[i * 2] = w + 4;
          starPos[i * 2 + 1] = Math.random() * h;
        }
      } else {
        starPos[i * 2] = Math.random() * w;
        starPos[i * 2 + 1] = Math.random() * h;
      }
      const drift = dust ? 3 : 1.6;
      starVel[i * 2] = rand(-drift, drift);
      starVel[i * 2 + 1] = rand(-drift * 0.6, drift * 0.6);
      const c = starColor(i, dust);
      starData[i * 4] = c[0];
      starData[i * 4 + 1] = c[1];
      starData[i * 4 + 2] = c[2];
      starData[i * 4 + 3] = dust ? rand(0.9, 1.7) : Math.random() > 0.985 ? rand(4.5, 8) : rand(0.8, 2.2);
    }

    const planets = [];
    function initPlanets() {
      planets.length = 0;
      const types = [0, 1, 2, 3, 4, 5];
      for (let i = 0; i < MAX_PLANETS; i++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = 0.32 + Math.random() * 0.4;
        planets.push({
          x: 0.5 + Math.cos(ang) * dist * 0.9,
          y: 0.5 + Math.sin(ang) * dist,
          z: Math.random() * 0.45,
          r: rand(0.016, 0.034) * (0.65 + Math.random() * 0.4),
          vx: rand(-0.008, 0.008),
          vy: rand(-0.005, 0.005),
          rot: Math.random() * Math.PI * 2,
          spin: rand(0.08, 0.22) * (Math.random() > 0.5 ? 1 : -1),
          type: types[i],
          seed: rand(1, 40),
          alive: 1,
        });
      }
    }

    const holes = [];
    for (let i = 0; i < MAX_HOLES; i++) holes.push({ x: 0.5, y: 0.5, mass: 0, grow: false, age: 0 });
    let holding = false;
    let holdIndex = -1;
    const cursor = { x: -10, y: -10, on: false };

    function eventUV(e) {
      const rect = root.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / Math.max(rect.width, 1),
        y: (e.clientY - rect.top) / Math.max(rect.height, 1),
      };
    }

    function interactiveTarget(el) {
      return !!(el && el.closest && el.closest("a, button, input, textarea, select, label"));
    }

    function onDown(e) {
      if (e.button != null && e.button !== 0) return;
      if (interactiveTarget(e.target)) return;
      const uv = eventUV(e);
      let idx = holes.findIndex((h) => h.mass < 0.01);
      if (idx < 0) {
        let min = 0;
        for (let i = 1; i < MAX_HOLES; i++) if (holes[i].mass < holes[min].mass) min = i;
        idx = min;
      }
      holes[idx].x = uv.x;
      holes[idx].y = 1 - uv.y;
      holes[idx].mass = Math.max(holes[idx].mass, 0.035);
      holes[idx].age = 0;
      holes[idx].grow = true;
      holding = true;
      holdIndex = idx;
      try {
        root.setPointerCapture(e.pointerId);
      } catch (err) {}
      e.preventDefault();
    }

    function onUp() {
      holding = false;
      if (holdIndex >= 0) holes[holdIndex].grow = false;
      holdIndex = -1;
    }

    function onMove(e) {
      const uv = eventUV(e);
      cursor.x = uv.x;
      cursor.y = 1 - uv.y;
      cursor.on = true;
    }

    function onLeave() {
      cursor.on = false;
    }

    function resize() {
      const rect = root.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.75);
      w = Math.max(2, Math.floor(rect.width * dpr));
      h = Math.max(2, Math.floor(rect.height * dpr));
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      gl.viewport(0, 0, w, h);
      if (fbo) {
        gl.deleteTexture(fbo.tex);
        gl.deleteFramebuffer(fbo.fb);
      }
      fbo = makeFBO(gl, w, h);
      for (let i = 0; i < nStars; i++) resetStar(i, false);
    }

    function loc(prog, name) {
      return gl.getUniformLocation(prog, name);
    }

    const sceneLoc = {
      uRes: loc(sceneProg, "uRes"),
      uTime: loc(sceneProg, "uTime"),
      planetPos: [],
      planetPar: [],
    };
    for (let i = 0; i < MAX_PLANETS; i++) {
      sceneLoc.planetPos[i] = loc(sceneProg, "uPlanetPos[" + i + "]");
      sceneLoc.planetPar[i] = loc(sceneProg, "uPlanetPar[" + i + "]");
    }
    const starLoc = {
      uRes: loc(starProg, "uRes"),
    };
    const compLoc = {
      uRes: loc(compProg, "uRes"),
      uTime: loc(compProg, "uTime"),
      uScene: loc(compProg, "uScene"),
      holes: [0, 1, 2, 3].map((i) => loc(compProg, "uHoles[" + i + "]")),
    };

    gl.enable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);

    let last = performance.now();
    let raf = 0;
    let dead = false;

    function step(now) {
      if (dead) return;
      raf = requestAnimationFrame(step);
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const t = now * 0.001;

      if (holding && holdIndex >= 0) {
        holes[holdIndex].mass = Math.min(0.475, holes[holdIndex].mass + dt * 0.21);
      }
      for (let i = 0; i < MAX_HOLES; i++) {
        if (holes[i].mass > 0) holes[i].age += dt;
        if (!holes[i].grow && holes[i].mass > 0) {
          holes[i].mass *= Math.exp(-dt * 0.18);
          if (holes[i].mass < 0.015) {
            holes[i].mass = 0;
            holes[i].age = 0;
          }
        }
      }

      const planetPos = new Float32Array(MAX_PLANETS * 4);
      const planetPar = new Float32Array(MAX_PLANETS * 4);
      planets.sort(function (a, b) { return a.z - b.z; });
      for (let i = 0; i < planets.length; i++) {
        const p = planets[i];
        p.rot += p.spin * dt;
        for (let k = 0; k < MAX_HOLES; k++) {
          const hole = holes[k];
          if (hole.mass < 0.01) continue;
          const pull = 0.5 + 0.5 * (1 - Math.exp(-hole.age / 2.6));
          const dx = hole.x - p.x;
          const dy = hole.y - p.y;
          const d2 = dx * dx + dy * dy + 0.00035;
          const f = (hole.mass * 0.38 * dt * pull) / d2;
          p.vx += dx * f;
          p.vy += dy * f;
          const rs = 0.006 + hole.mass * 0.05;
          if (Math.sqrt(d2) < rs * 1.4) {
            p.x = Math.random();
            p.y = Math.random();
            p.vx *= 0.1;
            p.vy *= 0.1;
          }
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < -0.12) p.x = 1.12;
        if (p.x > 1.12) p.x = -0.12;
        if (p.y < -0.12) p.y = 1.12;
        if (p.y > 1.12) p.y = -0.12;
        if (cursor.on && !holding) {
          const cdx = p.x - cursor.x;
          const cdy = p.y - cursor.y;
          const cd2 = cdx * cdx + cdy * cdy + 1e-6;
          const cr = 0.065;
          if (cd2 < cr * cr) {
            const cd = Math.sqrt(cd2);
            const fall = 1 - cd / cr;
            p.vx += (cdx / cd) * fall * fall * 0.85 * dt;
            p.vy += (cdy / cd) * fall * fall * 0.85 * dt;
          }
        }
        p.vx *= 0.995;
        p.vy *= 0.995;
        planetPos[i * 4] = p.x;
        planetPos[i * 4 + 1] = p.y;
        planetPos[i * 4 + 2] = p.r * (0.55 + p.z * 0.28);
        planetPos[i * 4 + 3] = p.z;
        planetPar[i * 4] = p.type;
        planetPar[i * 4 + 1] = p.rot;
        planetPar[i * 4 + 2] = p.seed;
      }

      for (let i = 0; i < nStars; i++) {
        let x = starPos[i * 2];
        let y = starPos[i * 2 + 1];
        let vx = starVel[i * 2];
        let vy = starVel[i * 2 + 1];
        const dust = i >= starCount ? 1.6 : 1;
        for (let k = 0; k < MAX_HOLES; k++) {
          const hole = holes[k];
          if (hole.mass < 0.01) continue;
          const pull = 0.5 + 0.5 * (1 - Math.exp(-hole.age / 2.6));
          const hx = hole.x * w;
          const hy = hole.y * h;
          const dx = hx - x;
          const dy = hy - y;
          const d2 = dx * dx + dy * dy + 140;
          const f = (hole.mass * 26000 * dt * dust * pull) / d2;
          vx += dx * f;
          vy += dy * f;
          const rs = (0.006 + hole.mass * 0.05) * Math.min(w, h);
          if (dx * dx + dy * dy < rs * rs * 1.3) {
            resetStar(i, true);
            x = starPos[i * 2];
            y = starPos[i * 2 + 1];
            vx = starVel[i * 2];
            vy = starVel[i * 2 + 1];
          }
        }
        if (cursor.on && !holding) {
          const cx = cursor.x * w;
          const cy = cursor.y * h;
          const rdx = x - cx;
          const rdy = y - cy;
          const rd2 = rdx * rdx + rdy * rdy;
          const radius = 0.078 * Math.min(w, h);
          if (rd2 < radius * radius && rd2 > 1) {
            const rd = Math.sqrt(rd2);
            const fall = 1 - rd / radius;
            const force = fall * fall * 9000 * dt * dust;
            vx += (rdx / rd) * force;
            vy += (rdy / rd) * force;
          }
        }
        vx *= 0.9992;
        vy *= 0.9992;
        x += vx * dt * 18;
        y += vy * dt * 18;
        if (x < -10) x = w + 10;
        if (x > w + 10) x = -10;
        if (y < -10) y = h + 10;
        if (y > h + 10) y = -10;
        starPos[i * 2] = x;
        starPos[i * 2 + 1] = y;
        starVel[i * 2] = vx;
        starVel[i * 2 + 1] = vy;
        const o = i * 6;
        starBufCPU[o] = x;
        starBufCPU[o + 1] = y;
        starBufCPU[o + 2] = starData[i * 4];
        starBufCPU[o + 3] = starData[i * 4 + 1];
        starBufCPU[o + 4] = starData[i * 4 + 2];
        starBufCPU[o + 5] = starData[i * 4 + 3];
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.fb);
      gl.viewport(0, 0, w, h);
      gl.disable(gl.BLEND);
      gl.useProgram(sceneProg);
      gl.uniform2f(sceneLoc.uRes, w, h);
      gl.uniform1f(sceneLoc.uTime, t);
      for (let i = 0; i < MAX_PLANETS; i++) {
        gl.uniform4fv(sceneLoc.planetPos[i], planetPos.subarray(i * 4, i * 4 + 4));
        gl.uniform4fv(sceneLoc.planetPar[i], planetPar.subarray(i * 4, i * 4 + 4));
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      const spa = gl.getAttribLocation(sceneProg, "aPos");
      gl.enableVertexAttribArray(spa);
      gl.vertexAttribPointer(spa, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.useProgram(starProg);
      gl.uniform2f(starLoc.uRes, w, h);
      gl.bindBuffer(gl.ARRAY_BUFFER, starBuf);
      gl.bufferData(gl.ARRAY_BUFFER, starBufCPU, gl.DYNAMIC_DRAW);
      const ap = gl.getAttribLocation(starProg, "aPos");
      const ad = gl.getAttribLocation(starProg, "aData");
      gl.enableVertexAttribArray(ap);
      gl.enableVertexAttribArray(ad);
      gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 24, 0);
      gl.vertexAttribPointer(ad, 4, gl.FLOAT, false, 24, 8);
      gl.drawArrays(gl.POINTS, 0, nStars);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.disable(gl.BLEND);
      gl.useProgram(compProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fbo.tex);
      gl.uniform1i(compLoc.uScene, 0);
      gl.uniform2f(compLoc.uRes, w, h);
      gl.uniform1f(compLoc.uTime, t);
      for (let i = 0; i < MAX_HOLES; i++) {
        gl.uniform3f(compLoc.holes[i], holes[i].x, holes[i].y, holes[i].mass);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      const cpa = gl.getAttribLocation(compProg, "aPos");
      gl.enableVertexAttribArray(cpa);
      gl.vertexAttribPointer(cpa, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function onResize() {
      resize();
    }

    initPlanets();
    resize();
    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("resize", onResize);
    raf = requestAnimationFrame(step);

    return {
      destroy: function () {
        dead = true;
        cancelAnimationFrame(raf);
        root.removeEventListener("pointerdown", onDown);
        root.removeEventListener("pointermove", onMove);
        root.removeEventListener("pointerleave", onLeave);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        window.removeEventListener("resize", onResize);
      },
    };
  }

  global.GalaxySplash = {
    mount: function (canvas, opts) {
      return GalaxySplash(canvas, opts);
    },
  };
})(typeof window !== "undefined" ? window : this);
