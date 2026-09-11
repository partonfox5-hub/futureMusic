using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.XR;

namespace NetKnight
{
    public class NkBolt
    {
        public Transform t;
        public Vector3 p, dir;
        public float spd, spd0, spdMax, life, dmg, blast, size;
        public bool charged;
    }

    public class NkWeapons : MonoBehaviour
    {
        public Transform cannon, sword, muzzle, bladeTip, chargeBall, laserBeam, laserCore;
        public Renderer bladeRend, glowRend;
        public Light bladeLight, muzzleLight;
        public float swordSpeed;
        public float charge;
        public float laserFuel = 10f;
        public float laserCd;
        public float laserCdMax = 10f;
        public bool shieldOn;
        public bool drawing;
        public float LaserCharge01;
        public bool LaserCooling => laserCd > 0f;
        public float LaserMeter01 => laserCd > 0f ? 1f - Mathf.Clamp01(laserCd / Mathf.Max(0.2f, laserCdMax)) : Mathf.Clamp01(laserFuel / 10f);
        Transform _tower;
        public const float BallChargeMax = 7.170193f;
        public const float LaserWindup = 1.50574f;
        public const float MaxBallSize = 0.6325f;

        readonly List<NkBolt> _bolts = new List<NkBolt>();
        Vector3 _swordPrev, _tipPrev, _fwdPrev = Vector3.forward;
        float _leftHold, _rightHold, _burnT, _warm = 1.1f, _swingFxT, _relTipSpd, _angSpd, _swingGlow, _goldBoom;
        bool _laserSfx;
        Transform _goldBeam;
        bool _laserOn, _swordInit, _swinging;
        Transform _hiltFlame, _hiltCore, _bladeXf, _glowXf;
        LineRenderer _lassoLine;
        readonly List<Transform> _lassoHook = new List<Transform>();
        readonly List<Transform> _lassoPick = new List<Transform>();
        float _lassoT;
        bool _lassoOn;
        NkPlasmaStroke _draw;
        float _drawHueT;
        Color _drawCol = new Color(0.35f, 0.9f, 1f, 0.95f);
        Vector3 _bladeSc0, _glowSc0, _bladePos0, _glowPos0, _tipPos0, _colC0, _colS0;
        BoxCollider _swordCol;
        Material _bladeMat, _glowMat;
        Color _bladeBase = new Color(0.04f, 0.035f, 0.05f);

        public static NkWeapons Attach(NkPlayer player)
        {
            var w = player.gameObject.AddComponent<NkWeapons>();
            w.cannon = BuildCannon();
            w.sword = BuildSword(out w.bladeTip, out w.bladeRend, out w.glowRend, out w.bladeLight);
            w.muzzle = w.cannon.Find("muzzle");
            w.chargeBall = w.cannon.Find("charge");
            w.laserBeam = w.sword.Find("laser");
            w.laserCore = w.sword.Find("lasercore");
            w._tower = w.muzzle ? w.muzzle.Find("tower") : w.cannon.Find("muzzle/tower");
            if (w.bladeRend) w._bladeMat = w.bladeRend.material;
            if (w.glowRend) w._glowMat = w.glowRend.material;
            w._hiltFlame = w.sword.Find("hiltFlame");
            w._hiltCore = w.sword.Find("hiltCore");
            w._bladeXf = w.sword.Find("blade");
            w._glowXf = w.sword.Find("glow");
            if (w._bladeXf) { w._bladeSc0 = w._bladeXf.localScale; w._bladePos0 = w._bladeXf.localPosition; }
            if (w._glowXf) { w._glowSc0 = w._glowXf.localScale; w._glowPos0 = w._glowXf.localPosition; }
            if (w.bladeTip) w._tipPos0 = w.bladeTip.localPosition;
            w._swordCol = w.sword.GetComponent<BoxCollider>();
            if (w._swordCol) { w._colC0 = w._swordCol.center; w._colS0 = w._swordCol.size; }
            var body = player.GetComponent<Collider>();
            Ignore(body, w.cannon);
            Ignore(body, w.sword);
            return w;
        }

        static void Ignore(Collider a, Transform root)
        {
            if (!a || !root) return;
            foreach (var c in root.GetComponentsInChildren<Collider>())
                Physics.IgnoreCollision(a, c);
        }

        void OnDisable()
        {
            NkSfx.LaserHum(transform.position, false);
            _laserSfx = false;
        }

        static Transform BuildCannon()
        {
            var root = new GameObject("MechCannon").transform;
            void Part(PrimitiveType t, Vector3 loc, Vector3 sc, Color c, string n, bool unlit = false, float metal = 0.65f)
            {
                var p = GameObject.CreatePrimitive(t);
                Object.Destroy(p.GetComponent<Collider>());
                p.name = n;
                p.transform.SetParent(root, false);
                p.transform.localPosition = loc;
                p.transform.localScale = sc;
                p.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(c, 1, unlit, 0.35f, metal);
            }
            var steel = new Color(0.22f, 0.26f, 0.32f);
            var dark = new Color(0.08f, 0.09f, 0.12f);
            var ice = new Color(0.45f, 0.82f, 1f);
            Part(PrimitiveType.Cube, new Vector3(0f, -0.02f, 0.04f), new Vector3(0.16f, 0.14f, 0.22f), steel, "body");
            Part(PrimitiveType.Cube, new Vector3(0f, 0.04f, 0.02f), new Vector3(0.18f, 0.05f, 0.16f), dark, "shoulder");
            var barrel = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            Object.Destroy(barrel.GetComponent<Collider>());
            barrel.transform.SetParent(root, false);
            barrel.transform.localRotation = Quaternion.Euler(90, 0, 0);
            barrel.transform.localPosition = new Vector3(0f, 0.01f, 0.28f);
            barrel.transform.localScale = new Vector3(0.11f, 0.22f, 0.11f);
            barrel.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(dark, 1, false, 0.5f, 0.8f);
            var sleeve = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            Object.Destroy(sleeve.GetComponent<Collider>());
            sleeve.transform.SetParent(root, false);
            sleeve.transform.localRotation = Quaternion.Euler(90, 0, 0);
            sleeve.transform.localPosition = new Vector3(0f, 0.01f, 0.18f);
            sleeve.transform.localScale = new Vector3(0.14f, 0.08f, 0.14f);
            sleeve.GetComponent<Renderer>().sharedMaterial = NkGfx.Chrome();
            for (int i = 0; i < 4; i++)
            {
                float a = i * 90f;
                var vane = GameObject.CreatePrimitive(PrimitiveType.Cube);
                Object.Destroy(vane.GetComponent<Collider>());
                vane.transform.SetParent(root, false);
                vane.transform.localPosition = new Vector3(Mathf.Sin(a * Mathf.Deg2Rad) * 0.08f, Mathf.Cos(a * Mathf.Deg2Rad) * 0.08f, 0.26f);
                vane.transform.localScale = new Vector3(0.018f, 0.06f, 0.16f);
                vane.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(steel, 1, false, 0.4f, 0.7f);
            }
            var mag = GameObject.CreatePrimitive(PrimitiveType.Cube);
            Object.Destroy(mag.GetComponent<Collider>());
            mag.transform.SetParent(root, false);
            mag.transform.localPosition = new Vector3(0f, -0.1f, 0.08f);
            mag.transform.localScale = new Vector3(0.08f, 0.1f, 0.12f);
            mag.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(new Color(0.12f, 0.18f, 0.28f), 1, false, 0.3f, 0.4f);
            var mz = new GameObject("muzzle").transform;
            mz.SetParent(root, false);
            mz.localPosition = new Vector3(0f, 0.01f, 0.52f);
            var ring = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            Object.Destroy(ring.GetComponent<Collider>());
            ring.transform.SetParent(mz, false);
            ring.transform.localRotation = Quaternion.Euler(90, 0, 0);
            ring.transform.localScale = new Vector3(0.09f, 0.012f, 0.09f);
            ring.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(ice, 1, true);
            var ball = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            Object.Destroy(ball.GetComponent<Collider>());
            ball.name = "charge";
            ball.transform.SetParent(root, false);
            ball.transform.localPosition = mz.localPosition;
            ball.transform.localScale = Vector3.one * 0.04f;
            ball.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(0.7f, 0.9f, 1f, 0.85f));
            ball.SetActive(false);
            var lite = mz.gameObject.AddComponent<Light>();
            lite.type = LightType.Point;
            lite.color = ice;
            lite.range = 2.2f;
            lite.intensity = 0.4f;
            var tower = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            Object.Destroy(tower.GetComponent<Collider>());
            tower.name = "tower";
            tower.transform.SetParent(mz, false);
            tower.transform.localRotation = Quaternion.Euler(90, 0, 0);
            tower.transform.localPosition = new Vector3(0f, 0f, 0.95f);
            tower.transform.localScale = new Vector3(1.15f, 1.35f, 1.15f);
            tower.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(0.3f, 0.9f, 1f, 0.72f));
            var halo = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            Object.Destroy(halo.GetComponent<Collider>());
            halo.name = "halo";
            halo.transform.SetParent(tower.transform, false);
            halo.transform.localScale = new Vector3(1.6f, 0.35f, 1.6f);
            halo.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(0.45f, 0.95f, 1f, 0.55f));
            var tl = tower.gameObject.AddComponent<Light>();
            tl.type = LightType.Point;
            tl.color = new Color(0.4f, 0.9f, 1f);
            tl.range = 5.5f;
            tl.intensity = 4.2f;
            tower.SetActive(false);
            return root;
        }

        static Transform BuildSword(out Transform tip, out Renderer blade, out Renderer glow, out Light lite)
        {
            var root = new GameObject("ObsidianArm").transform;
            var obsidian = new Color(0.05f, 0.04f, 0.07f);
            var edge = new Color(0.18f, 0.08f, 0.12f);
            var steel = new Color(0.16f, 0.16f, 0.18f);
            void Box(Vector3 loc, Vector3 sc, Color c, string n)
            {
                var p = GameObject.CreatePrimitive(PrimitiveType.Cube);
                Object.Destroy(p.GetComponent<Collider>());
                p.name = n;
                p.transform.SetParent(root, false);
                p.transform.localPosition = loc;
                p.transform.localScale = sc;
                p.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(c, 1, false, 0.55f, 0.75f);
            }
            Box(new Vector3(0f, -0.02f, 0.02f), new Vector3(0.12f, 0.1f, 0.16f), steel, "forearm");
            Box(new Vector3(0f, -0.02f, 0.12f), new Vector3(0.14f, 0.08f, 0.08f), obsidian, "gauntlet");
            Box(new Vector3(0f, 0.02f, 0.18f), new Vector3(0.04f, 0.05f, 0.08f), edge, "guard");
            var b = GameObject.CreatePrimitive(PrimitiveType.Cube);
            Object.Destroy(b.GetComponent<Collider>());
            b.name = "blade";
            b.transform.SetParent(root, false);
            b.transform.localPosition = new Vector3(0f, 0.01f, 0.88934f);
            b.transform.localScale = new Vector3(0.035f, 0.09f, 1.39148f);
            blade = b.GetComponent<Renderer>();
            blade.sharedMaterial = NkGfx.Make(obsidian, 1, false, 0.92f, 0.85f);
            var g = GameObject.CreatePrimitive(PrimitiveType.Cube);
            Object.Destroy(g.GetComponent<Collider>());
            g.name = "glow";
            g.transform.SetParent(root, false);
            g.transform.localPosition = new Vector3(0f, 0.01f, 0.883082f);
            g.transform.localScale = new Vector3(0.018f, 0.11f, 1.352828f);
            glow = g.GetComponent<Renderer>();
            glow.sharedMaterial = NkGfx.Additive(new Color(0.85f, 0.08f, 0.05f, 0.45f));
            tip = new GameObject("tip").transform;
            tip.SetParent(root, false);
            tip.localPosition = new Vector3(0f, 0.01f, 1.630528f);
            var hf = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            Object.Destroy(hf.GetComponent<Collider>());
            hf.name = "hiltFlame";
            hf.transform.SetParent(root, false);
            hf.transform.localPosition = new Vector3(0f, 0.04f, 0.2f);
            hf.transform.localScale = Vector3.one * 0.07f;
            hf.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(1f, 0.35f, 0.05f, 0.8f));
            var hc = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            Object.Destroy(hc.GetComponent<Collider>());
            hc.name = "hiltCore";
            hc.transform.SetParent(root, false);
            hc.transform.localPosition = new Vector3(0f, 0.04f, 0.2f);
            hc.transform.localScale = Vector3.one * 0.035f;
            hc.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(1f, 0.85f, 0.35f, 0.95f));
            var beam = GameObject.CreatePrimitive(PrimitiveType.Cube);
            Object.Destroy(beam.GetComponent<Collider>());
            beam.name = "laser";
            beam.transform.SetParent(root, false);
            beam.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(0.7f, 0.05f, 0.08f, 0.85f));
            beam.SetActive(false);
            var core = GameObject.CreatePrimitive(PrimitiveType.Cube);
            Object.Destroy(core.GetComponent<Collider>());
            core.name = "lasercore";
            core.transform.SetParent(root, false);
            core.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(1f, 0.35f, 0.25f, 0.95f));
            core.SetActive(false);
            var lg = tip.gameObject.AddComponent<Light>();
            lg.type = LightType.Point;
            lg.color = new Color(1f, 0.15f, 0.08f);
            lg.range = 3.5f;
            lg.intensity = 0f;
            lite = lg;
            var col = root.gameObject.AddComponent<BoxCollider>();
            col.center = new Vector3(0f, 0.01f, 0.908434f);
            col.size = new Vector3(0.08f, 0.12f, 1.64272f);
            col.isTrigger = true;
            return root;
        }

        public void Tick(float dt, NkInput inp, NkPlayer player, NetKnightGame game)
        {
            _warm -= dt;
            PoseWeapon(cannon, inp, inp.left, player, new Vector3(0.02f, -0.04f, 0.02f));
            PoseWeapon(sword, inp, inp.right, player, new Vector3(0f, -0.03f, 0.0f));
            SampleSwing(dt, player);
            TickCannon(dt, inp, player, game);
            TickSword(dt, inp, player, game);
            TickLasso(dt, inp, player, game);
            TickBolts(dt, game);
            TickBladeLook(dt);
            Melee(game);
        }

        void SampleSwing(float dt, NkPlayer player)
        {
            _swinging = false;
            if (!sword || !sword.gameObject.activeInHierarchy)
            {
                swordSpeed = 0f;
                _swordInit = false;
                return;
            }
            Vector3 tip = bladeTip ? bladeTip.position : sword.position + sword.forward * 1.15f;
            Vector3 fwd = sword.forward;
            if (!_swordInit || _warm > 0f)
            {
                _swordPrev = sword.position;
                _tipPrev = tip;
                _fwdPrev = fwd;
                _swordInit = true;
                swordSpeed = 0f;
                return;
            }
            float invDt = 1f / Mathf.Max(dt, 0.008f);
            Vector3 bodyVel = player && player.body ? player.body.linearVelocity : Vector3.zero;
            Vector3 relTip = (tip - _tipPrev) * invDt - bodyVel;
            _relTipSpd = relTip.magnitude;
            _angSpd = Vector3.Angle(_fwdPrev, fwd) * invDt;
            swordSpeed = _relTipSpd;
            _swordPrev = sword.position;
            _tipPrev = tip;
            _fwdPrev = fwd;
            if (_relTipSpd > 22f || _angSpd > 900f) return;
            _swinging = _relTipSpd > 3.2f && _angSpd > 220f;
        }

        void TickBladeLook(float dt)
        {
            if (_swinging) _swingGlow = 1.5f;
            else _swingGlow = Mathf.Max(0f, _swingGlow - dt);
            float flash = Mathf.Clamp01(_swingGlow / 0.16f);
            float grow = Mathf.Lerp(1f, 1.5f, flash);
            float wide = Mathf.Lerp(1f, 1.5f, flash);
            if (_bladeXf)
            {
                float z = _bladeSc0.z * grow;
                _bladeXf.localScale = new Vector3(_bladeSc0.x * wide, _bladeSc0.y * wide, z);
                _bladeXf.localPosition = new Vector3(_bladePos0.x, _bladePos0.y, _bladePos0.z + (z - _bladeSc0.z) * 0.5f);
            }
            if (_glowXf)
            {
                float z = _glowSc0.z * grow;
                _glowXf.localScale = new Vector3(_glowSc0.x * wide, _glowSc0.y * wide, z);
                _glowXf.localPosition = new Vector3(_glowPos0.x, _glowPos0.y, _glowPos0.z + (z - _glowSc0.z) * 0.5f);
            }
            if (bladeTip)
                bladeTip.localPosition = new Vector3(_tipPos0.x, _tipPos0.y, _tipPos0.z + _bladeSc0.z * (grow - 1f));
            if (_swordCol)
            {
                float hit = flash > 0.01f ? 2f : 1f;
                _swordCol.size = new Vector3(_colS0.x * wide * hit, _colS0.y * wide * hit, _colS0.z * grow);
                _swordCol.center = new Vector3(_colC0.x, _colC0.y, _colC0.z + _colS0.z * (grow - 1f) * 0.5f);
            }
            bool gold = Object.FindAnyObjectByType<NetKnightGame>() is NetKnightGame gg && gg.Gold;
            bool laserHold = _laserOn || LaserCharge01 > 0.12f;
            if (_lassoOn && _glowMat)
            {
                var g = new Color(1f, 0.05f, 0.04f, 0.95f);
                if (_glowMat.HasProperty("_BaseColor")) _glowMat.SetColor("_BaseColor", g);
                _glowMat.color = g;
                if (_bladeMat)
                {
                    var c = new Color(0.55f, 0.04f, 0.04f);
                    if (_bladeMat.HasProperty("_BaseColor")) _bladeMat.SetColor("_BaseColor", c);
                    _bladeMat.color = c;
                }
                if (bladeLight) bladeLight.intensity = 6.5f;
            }
            else if (!laserHold && _glowMat)
            {
                var g = gold
                    ? new Color(1f, 0.82f, 0.12f, 0.95f)
                    : Color.Lerp(new Color(0.85f, 0.04f, 0.03f, 0.45f), new Color(1f, 0.02f, 0.02f, 1f), flash);
                if (_glowMat.HasProperty("_BaseColor")) _glowMat.SetColor("_BaseColor", g);
                _glowMat.color = g;
            }
            if (!laserHold && _bladeMat)
            {
                var c = gold
                    ? new Color(0.85f, 0.62f, 0.08f)
                    : Color.Lerp(_bladeBase, new Color(0.95f, 0.02f, 0.04f), 0.4f + flash * 0.6f);
                if (_bladeMat.HasProperty("_BaseColor")) _bladeMat.SetColor("_BaseColor", c);
                _bladeMat.color = c;
            }
            if (!laserHold && bladeLight)
                bladeLight.intensity = Mathf.Lerp(bladeLight.intensity, gold ? 6.5f : (flash > 0.01f ? 7.4f : 1.1f), dt * 14f);
            if (_hiltFlame)
            {
                float s = (_swinging ? 0.14f : 0.07f) * (1f + Mathf.Sin(Time.time * 28f) * 0.18f);
                _hiltFlame.localScale = Vector3.one * s;
                _hiltFlame.localPosition = new Vector3(0f, 0.04f, 0.2f) + Random.insideUnitSphere * 0.008f;
            }
            if (_hiltCore)
                _hiltCore.localScale = Vector3.one * ((_swinging ? 0.055f : 0.032f) * (1f + Mathf.Sin(Time.time * 40f) * 0.12f));
            if (_swinging)
            {
                _swingFxT -= dt;
                if (_swingFxT <= 0f)
                {
                    _swingFxT = 0.22f;
                    SlashArc();
                    if (sword) NkSfx.Swing(sword.position);
                    NkInput.Rumble(XRNode.RightHand, 0.45f, 0.06f);
                }
            }
        }

        void SlashArc()
        {
            if (!bladeTip || !sword) return;
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            Object.DestroyImmediate(go.GetComponent<Collider>());
            go.transform.position = (sword.position + bladeTip.position) * 0.5f;
            go.transform.rotation = sword.rotation;
            go.transform.localScale = new Vector3(0.04f, 0.02f, 0.85f);
            go.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(1f, 0.12f, 0.05f, 0.85f));
            Object.Destroy(go, 0.12f);
        }

        void PoseWeapon(Transform w, NkInput inp, NkHand h, NkPlayer player, Vector3 localOff)
        {
            if (!w || !h.valid) { if (w) w.gameObject.SetActive(false); return; }
            w.gameObject.SetActive(true);
            if (inp.xrActive && player)
            {
                w.SetParent(player.transform, false);
                w.localRotation = h.rot;
                w.localPosition = h.pos + h.rot * localOff;
                return;
            }
            var rot = player.HRotPub(inp, h);
            var pos = player.HPosPub(inp, h) + rot * localOff;
            w.SetParent(null, true);
            w.position = pos;
            w.rotation = rot;
        }

        void TickCannon(float dt, NkInput inp, NkPlayer player, NetKnightGame game)
        {
            bool holdDraw = inp.left.valid && inp.left.grip;
            if (!inp.xrActive && Keyboard.current != null && Keyboard.current.cKey.isPressed) holdDraw = true;
            if (_warm > 0f) holdDraw = false;
            if (_tower) _tower.gameObject.SetActive(false);
            drawing = holdDraw;
            shieldOn = false;
            if (holdDraw)
            {
                TickDraw(dt, game);
                _leftHold = 0f;
                charge = 0f;
                return;
            }
            if (_draw)
            {
                float life = 10f * (1f + 0.001f * Mathf.Max(0, (game ? game.energy : 1000) - 1000));
                _draw.Solidify(life);
                if (game) game.Hint("Plasma line set  ·  " + life.ToString("0.0") + "s");
                _draw = null;
            }
            if (_goldBeam && (game == null || !game.Gold)) _goldBeam.gameObject.SetActive(false);
            if (game && game.Gold)
            {
                bool heldG = inp.left.valid && inp.left.trigger;
                if (!inp.xrActive && Mouse.current != null) heldG = Mouse.current.leftButton.isPressed;
                if (_warm > 0f) heldG = false;
                if (_goldBeam) _goldBeam.gameObject.SetActive(heldG);
                if (heldG) FireGoldCannon(game);
                else if (_goldBeam) _goldBeam.gameObject.SetActive(false);
                _leftHold = 0f;
                return;
            }
            bool held = inp.left.valid && inp.left.trigger;
            if (!inp.xrActive && Mouse.current != null) held = Mouse.current.leftButton.isPressed;
            if (_warm > 0f) held = false;
            if (held) _leftHold += dt;
            if (chargeBall)
            {
                bool show = held && _leftHold > 0.18f;
                chargeBall.gameObject.SetActive(show);
                if (show)
                {
                    charge = Mathf.Clamp01(_leftHold / (BallChargeMax / Mathf.Max(0.2f, game.Power)));
                    float s = Mathf.Lerp(0.05f, 0.48f, charge) * 1.15f;
                    chargeBall.localScale = Vector3.one * s;
                    chargeBall.localPosition = muzzle ? muzzle.localPosition : new Vector3(0, 0.01f, 0.52f);
                    if (muzzle)
                    {
                        var l = muzzle.GetComponent<Light>();
                        if (l) l.intensity = 0.5f + charge * 6f;
                    }
                    NkInput.Rumble(XRNode.LeftHand, 0.12f + charge * 0.7f, 0.05f);
                }
            }
            bool released = inp.left.valid && !inp.left.trigger && _leftHold > 0.02f;
            if (!inp.xrActive && Mouse.current != null)
                released = Mouse.current.leftButton.wasReleasedThisFrame && _leftHold > 0.02f;
            if (released)
            {
                FireBolt(_leftHold, game);
                _leftHold = 0f;
                charge = 0f;
                if (chargeBall) chargeBall.gameObject.SetActive(false);
                if (muzzle) { var l = muzzle.GetComponent<Light>(); if (l) l.intensity = 0.35f; }
            }
            if (!held) _leftHold = 0f;
        }

        void TickLasso(float dt, NkInput inp, NkPlayer player, NetKnightGame game)
        {
            bool hold = inp.right.valid && inp.right.grip;
            if (!inp.xrActive)
            {
                var k = Keyboard.current;
                if (k != null && k.rKey.isPressed) hold = true;
                var pad = Gamepad.current;
                if (pad != null && pad.rightShoulder.isPressed) hold = true;
            }
            else
            {
                var pad = Gamepad.current;
                if (pad != null && pad.rightShoulder.isPressed) hold = true;
            }
            if (_warm > 0f) hold = false;
            _lassoOn = hold;
            if (!hold)
            {
                _lassoT = 0f;
                DropLasso();
                if (_lassoLine) _lassoLine.enabled = false;
                return;
            }
            if (!_lassoLine)
            {
                var go = new GameObject("Lasso");
                go.transform.SetParent(sword ? sword : transform, false);
                _lassoLine = go.AddComponent<LineRenderer>();
                _lassoLine.positionCount = 28;
                _lassoLine.useWorldSpace = true;
                _lassoLine.widthMultiplier = 0.045f;
                _lassoLine.material = NkGfx.Additive(new Color(1f, 0.12f, 0.08f, 0.95f));
                _lassoLine.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                _lassoLine.numCapVertices = 4;
            }
            _lassoLine.enabled = true;
            _lassoT = Mathf.Min(1f, _lassoT + dt * 1.15f);
            Vector3 origin = bladeTip ? bladeTip.position : (sword ? sword.position + sword.forward * 1.5f : transform.position);
            Vector3 aim = sword ? sword.forward : (player && player.cam ? player.cam.forward : Vector3.forward);
            CollectLasso(origin, aim);
            DrawLasso(origin, dt);
            if (_lassoT > 0.42f) PullLasso(player, dt);
            NkInput.Rumble(XRNode.RightHand, 0.22f + _lassoT * 0.45f, 0.04f);
        }

        void DropLasso()
        {
            for (int i = 0; i < _lassoHook.Count; i++)
            {
                var t = _lassoHook[i];
                if (!t) continue;
                var g = t.GetComponent<NkLassoGrab>();
                if (g) Object.Destroy(g);
            }
            _lassoHook.Clear();
        }

        void CollectLasso(Vector3 origin, Vector3 aim)
        {
            _lassoPick.Clear();
            Vector3 fwd = aim.sqrMagnitude > 0.01f ? aim.normalized : Vector3.forward;
            void Consider(Transform t, Vector3 at)
            {
                if (!t || _lassoPick.Contains(t) || _lassoPick.Count >= 3) return;
                Vector3 d = at - origin;
                float dist = d.magnitude;
                if (dist < 0.45f || dist > 38f) return;
                if (Vector3.Dot(fwd, d / dist) < 0.58f) return;
                _lassoPick.Add(t);
            }
            foreach (var d in NkDrone.All) if (d) Consider(d.transform, d.transform.position);
            foreach (var l in NkLemur.All) if (l) Consider(l.transform, l.Aim);
            foreach (var h in NkHornet.All) if (h) Consider(h.transform, h.transform.position);
            foreach (var c in NkCamel.All) if (c) Consider(c.transform, c.Aim);
            foreach (var t in NkTrilo.All) if (t) Consider(t.transform, t.Aim);
            var game = Object.FindAnyObjectByType<NetKnightGame>();
            if (game && game.knight) Consider(game.knight.transform, game.knight.transform.position + Vector3.up * 1.6f);
            if (_lassoPick.Count == 0)
            {
                foreach (var b in NkBreakable.All) if (b) Consider(b.transform, b.transform.position);
                foreach (var p in NkPad.All) if (p) Consider(p.transform, p.transform.position);
            }
            for (int i = 0; i < _lassoHook.Count; i++)
            {
                var t = _lassoHook[i];
                if (!t) continue;
                if (!_lassoPick.Contains(t))
                {
                    var grab = t.GetComponent<NkLassoGrab>();
                    if (grab) Object.Destroy(grab);
                }
            }
            for (int i = 0; i < _lassoPick.Count; i++)
            {
                var t = _lassoPick[i];
                if (!t) continue;
                var grab = t.GetComponent<NkLassoGrab>();
                if (!grab) grab = t.gameObject.AddComponent<NkLassoGrab>();
                grab.Arm(game);
            }
            _lassoHook.Clear();
            for (int i = 0; i < _lassoPick.Count; i++)
                if (_lassoPick[i]) _lassoHook.Add(_lassoPick[i]);
        }

        void DrawLasso(Vector3 origin, float dt)
        {
            if (!_lassoLine) return;
            int n = _lassoLine.positionCount;
            Vector3 end = origin + (sword ? sword.forward : Vector3.forward) * (4f + _lassoT * 8f);
            if (_lassoHook.Count > 0 && _lassoHook[0])
                end = _lassoHook[0].position;
            for (int i = 0; i < n; i++)
            {
                float u = i / (float)(n - 1);
                Vector3 p = Vector3.Lerp(origin, end, u * _lassoT);
                Vector3 nrm = Vector3.Cross((end - origin).sqrMagnitude > 0.01f ? (end - origin).normalized : Vector3.forward, Vector3.up);
                if (nrm.sqrMagnitude < 0.01f) nrm = Vector3.right;
                nrm.Normalize();
                float weave = (1f - u) * _lassoT * 0.55f;
                float a = u * 12.5f + Time.time * 9f;
                p += nrm * (Mathf.Sin(a) * weave) + Vector3.Cross(nrm, (end - origin).normalized) * (Mathf.Cos(a * 1.3f) * weave);
                if (_lassoT > 0.55f && _lassoHook.Count > 0)
                    p = Vector3.Lerp(p, Vector3.Lerp(origin, end, u), (_lassoT - 0.55f) / 0.45f);
                _lassoLine.SetPosition(i, p);
            }
            _lassoLine.widthMultiplier = 0.035f + Mathf.Sin(Time.time * 22f) * 0.01f;
        }

        void PullLasso(NkPlayer player, float dt)
        {
            Vector3 origin = bladeTip ? bladeTip.position : (sword ? sword.position + sword.forward * 1.5f : transform.position);
            Vector3 aim = sword ? sword.forward : (player && player.cam ? player.cam.forward : Vector3.forward);
            Vector3 leash = origin + aim.normalized * 2.7f;
            float swing = swordSpeed;
            for (int i = 0; i < _lassoHook.Count; i++)
            {
                var t = _lassoHook[i];
                if (!t) continue;
                var rb = t.GetComponent<Rigidbody>();
                if (!rb) rb = t.GetComponentInParent<Rigidbody>();
                Vector3 d = leash - t.position;
                float m = d.magnitude;
                float mass = rb ? rb.mass : 8f;
                bool light = mass <= 16f;
                if (light)
                {
                    if (rb)
                    {
                        Vector3 want = (m < 0.15f) ? Vector3.zero : d / Mathf.Max(0.04f, dt) * 0.22f;
                        want = Vector3.ClampMagnitude(want, 34f);
                        if (swing > 3.5f) want += aim.normalized * (swing * 1.15f);
                        rb.linearVelocity = Vector3.Lerp(rb.linearVelocity, want, 1f - Mathf.Exp(-dt * 11f));
                        rb.WakeUp();
                    }
                    else t.position = Vector3.MoveTowards(t.position, leash, 18f * dt);
                }
                else
                {
                    if (m < 1.6f) continue;
                    Vector3 pull = d.normalized * (16f + Mathf.Min(18f, mass * 0.03f));
                    if (rb) rb.AddForce(pull, ForceMode.Acceleration);
                    else t.position += d.normalized * (4.2f * dt);
                }
            }
        }

        void TickDraw(float dt, NetKnightGame game)
        {
            _drawHueT -= dt;
            if (_drawHueT <= 0f)
            {
                _drawHueT = Random.Range(1f, 2f);
                _drawCol = Color.HSVToRGB(Random.value, 0.82f, 1f);
                _drawCol.a = 0.95f;
                if (_draw) _draw.SetColor(_drawCol);
            }
            Vector3 p = muzzle ? muzzle.position : (cannon ? cannon.position : transform.position);
            if (_draw == null)
            {
                _draw = NkPlasmaStroke.Begin(p, _drawCol);
                if (game) game.Hint("Plasma draw  ·  release to set");
            }
            else _draw.StrokeTo(p);
            var body = GetComponent<Collider>();
            if (body && _draw)
            {
                var cols = _draw.GetComponentsInChildren<Collider>(true);
                for (int i = 0; i < cols.Length; i++)
                    if (cols[i]) Physics.IgnoreCollision(body, cols[i], true);
            }
            if (chargeBall)
            {
                chargeBall.gameObject.SetActive(true);
                chargeBall.localScale = Vector3.one * 0.1f;
                chargeBall.localPosition = muzzle ? muzzle.localPosition : new Vector3(0f, 0.01f, 0.52f);
                var rend = chargeBall.GetComponent<Renderer>();
                if (rend) rend.sharedMaterial = NkGfx.Additive(_drawCol);
            }
            if (muzzle)
            {
                var l = muzzle.GetComponent<Light>();
                if (l) { l.color = _drawCol; l.intensity = 2.4f; }
            }
            NkInput.Rumble(XRNode.LeftHand, 0.16f, 0.04f);
        }

        void FireBolt(float hold, NetKnightGame game)
        {
            if (!muzzle) return;
            float pwr = game ? game.Power : 1f;
            bool charged = hold >= 0.22f;
            float t = Mathf.Clamp01(hold / (BallChargeMax / Mathf.Max(0.2f, pwr)));
            float size = (charged ? Mathf.Lerp(0.09f, 0.55f, t) : 0.07f) * 1.15f;
            float dmg = (charged ? Mathf.Lerp(6f, 48f, t) : 2.2f) * pwr;
            float blast = (charged ? Mathf.Lerp(2.4f, 13.5f, t) : 1.15f) * pwr;
            float spd = charged ? Mathf.Lerp(22f, 14f, t) : 32f;
            var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            Object.Destroy(go.GetComponent<Collider>());
            go.transform.position = muzzle.position;
            go.transform.localScale = Vector3.one * size;
            go.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(charged
                ? new Color(0.55f, 0.85f, 1f, 0.95f)
                : new Color(0.85f, 0.95f, 1f, 0.95f));
            var dir = muzzle.forward;
            _bolts.Add(new NkBolt
            {
                t = go.transform, p = muzzle.position, dir = dir,
                spd = spd, spd0 = spd, spdMax = spd * 1.3f,
                life = 3.68f * pwr, dmg = dmg, blast = blast, size = size, charged = charged
            });
            NkInput.Rumble(XRNode.LeftHand, charged ? 1f : 0.35f, charged ? 0.2f : 0.06f);
            if (muzzle) NkSfx.Plasma(muzzle.position, charged);
        }

        void FireGoldCannon(NetKnightGame game)
        {
            if (!muzzle) return;
            if (!_goldBeam)
            {
                var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
                Object.Destroy(go.GetComponent<Collider>());
                go.name = "goldbeam";
                go.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(1f, 0.75f, 0.15f, 0.92f));
                _goldBeam = go.transform;
            }
            Vector3 o = muzzle.position;
            Vector3 d = muzzle.forward;
            float max = 58f;
            float thick = 0.62f;
            float end = max;
            if (Physics.SphereCast(o, thick * 0.42f, d, out var hit, max))
            {
                if (!(hit.collider.transform.IsChildOf(cannon) || hit.collider.transform.IsChildOf(sword)
                    || hit.collider.GetComponentInParent<NkPlayer>()))
                    end = hit.distance;
            }
            PlaceBeam(_goldBeam, o, d, end, thick);
            _goldBeam.gameObject.SetActive(true);
            NkInput.Rumble(XRNode.LeftHand, 0.55f, 0.04f);
            _goldBoom -= Time.deltaTime;
            if (_goldBoom > 0f) return;
            _goldBoom = 0.3f;
            int n = Mathf.Clamp(Mathf.RoundToInt(end / 2.6f), 1, 5);
            for (int i = 1; i <= n; i++)
            {
                float t = (i / (float)n) * end;
                Vector3 p = o + d * t;
                Vector3 nn = (i == n && hit.collider) ? hit.normal : -d;
                Blast(p, nn, 32f, 7.2f, true, game, transform, 0.55f);
            }
            if (Time.frameCount % 6 == 0) NkSfx.Plasma(o, true);
        }

        void TickBolts(float dt, NetKnightGame game)
        {
            for (int i = _bolts.Count - 1; i >= 0; i--)
            {
                var b = _bolts[i];
                b.life -= dt;
                b.spd = Mathf.MoveTowards(b.spd, b.spdMax, (b.spdMax - b.spd0) * dt / 0.8f);
                Vector3 vel = b.dir * b.spd;
                Vector3 np = b.p + vel * dt;
                NkWindow.Threat(b.p, vel);
                if (Physics.SphereCast(b.p, b.size * 0.45f, b.dir, out var hit, vel.magnitude * dt + 0.05f))
                {
                    Impact(hit.point, hit.normal, b.dmg, b.blast, b.charged, b.size, game);
                    if (b.t) Object.Destroy(b.t.gameObject);
                    _bolts.RemoveAt(i);
                    continue;
                }
                if (b.life <= 0)
                {
                    if (b.t) Object.Destroy(b.t.gameObject);
                    _bolts.RemoveAt(i);
                    continue;
                }
                b.p = np;
                if (b.t) b.t.position = np;
                _bolts[i] = b;
            }
        }

        void TickSword(float dt, NkInput inp, NkPlayer player, NetKnightGame game)
        {
            if (laserCd > 0f)
            {
                laserCd -= dt;
                if (laserCd <= 0f) { laserCd = 0f; laserFuel = 10f; laserCdMax = 8f / Mathf.Max(0.2f, game ? game.Power : 1f); }
            }
            bool held = inp.right.valid && inp.right.trigger;
            if (!inp.xrActive && Mouse.current != null) held = Mouse.current.rightButton.isPressed;
            if (_warm > 0f) held = false;
            if (held && laserCd <= 0f) _rightHold += dt;
            else if (!held) { _rightHold = 0f; _laserOn = false; }
            float pwr = game ? game.Power : 1f;
            float wind = (game && game.Gold) ? 0.04f : LaserWindup / Mathf.Max(0.2f, pwr);
            LaserCharge01 = laserCd > 0f ? 0f : Mathf.Clamp01(_rightHold / wind);
            float glow = LaserCharge01;
            if (_bladeMat)
            {
                var c = Color.Lerp(_bladeBase, new Color(0.55f, 0.04f, 0.06f), glow);
                if (_bladeMat.HasProperty("_BaseColor")) _bladeMat.SetColor("_BaseColor", c);
                _bladeMat.color = c;
            }
            if (_glowMat)
            {
                var g = new Color(1f, 0.08f, 0.06f, 0.15f + glow * 0.8f);
                if (_glowMat.HasProperty("_BaseColor")) _glowMat.SetColor("_BaseColor", g);
                _glowMat.color = g;
            }
            if (bladeLight) bladeLight.intensity = glow * 3.8f;
            _laserOn = held && laserCd <= 0f && _rightHold >= wind && laserFuel > 0f;
            if (_laserOn)
            {
                laserFuel -= dt;
                if (laserFuel <= 0f)
                {
                    laserFuel = 0f;
                    laserCdMax = 8f / Mathf.Max(0.2f, pwr);
                    laserCd = laserCdMax;
                    _laserOn = false;
                    _rightHold = 0f;
                    if (game) game.Hint("Sword laser recharging — " + laserCdMax.ToString("0.0") + "s.");
                }
            }
            if (laserBeam) laserBeam.gameObject.SetActive(_laserOn);
            if (laserCore) laserCore.gameObject.SetActive(_laserOn);
            if (_laserOn)
            {
                FireLaser(game);
                if (bladeTip)
                {
                    if (!_laserSfx)
                    {
                        NkSfx.Laser(bladeTip.position);
                        _laserSfx = true;
                    }
                    NkSfx.LaserHum(bladeTip.position, true);
                }
            }
            else
            {
                if (_laserSfx) NkSfx.LaserHum(bladeTip ? bladeTip.position : transform.position, false);
                _laserSfx = false;
                if (bladeLight && !held) bladeLight.intensity = 0f;
            }
        }

        void FireLaser(NetKnightGame game)
        {
            if (!bladeTip) return;
            Vector3 o = bladeTip.position;
            Vector3 d = bladeTip.forward;
            float pwr = game ? game.Power : 1f;
            float max = 55.2f * pwr;
            bool gold = game && game.Gold;
            float aoe = gold ? 0.121f : 0.0605f;
            var hits = Physics.SphereCastAll(o, aoe, d, max);
            System.Array.Sort(hits, (a, b) => a.distance.CompareTo(b.distance));
            float end = max;
            bool burned = false;
            foreach (var hit in hits)
            {
                if (hit.collider.transform.IsChildOf(cannon) || hit.collider.transform.IsChildOf(sword)) continue;
                if (hit.collider.GetComponentInParent<NkPlayer>()) continue;
                if (hit.collider.GetComponentInParent<NkPet>()) continue;
                end = hit.distance;
                var dr = hit.collider.GetComponentInParent<NkDrone>();
                if (dr)
                {
                    dr.SpillLoot();
                    NkSlice.Cut(dr.gameObject, hit.point, d, false);
                    Sparks(hit.point);
                    burned = true;
                    continue;
                }
                var br = hit.collider.GetComponentInParent<NkBreakable>();
                if (br)
                {
                    NkSlice.Cut(br.gameObject, hit.point, d, true);
                    Sparks(hit.point);
                    burned = true;
                    continue;
                }
                if (NkCombat.HurtAny(hit.collider.transform, 8f * Time.deltaTime * pwr, d, hit.point, game, true))
                {
                    Sparks(hit.point);
                    burned = true;
                    break;
                }
                SurfaceBurn(hit.point, hit.normal, game);
                burned = true;
                break;
            }
            float len = end;
            PlaceBeam(laserBeam, o, d, len, gold ? 0.121f : 0.0605f);
            PlaceBeam(laserCore, o, d, len, gold ? 0.04f : 0.0198f);
            if (burned) NkInput.Rumble(XRNode.RightHand, 0.45f, 0.04f);
        }

        static void PlaceBeam(Transform beam, Vector3 origin, Vector3 dir, float len, float thick)
        {
            if (!beam) return;
            beam.position = origin + dir * (len * 0.5f);
            beam.rotation = Quaternion.LookRotation(dir);
            beam.localScale = new Vector3(thick, thick, len);
        }

        void SurfaceBurn(Vector3 p, Vector3 n, NetKnightGame game)
        {
            if (Time.time - _burnT < 0.055f) return;
            _burnT = Time.time;
            Inferno(p, n, 1.85f, true);
        }

        public static void Sparks(Vector3 p)
        {
            for (int i = 0; i < 7; i++)
            {
                var s = GameObject.CreatePrimitive(PrimitiveType.Cube);
                Object.Destroy(s.GetComponent<Collider>());
                s.transform.position = p;
                s.transform.localScale = Vector3.one * Random.Range(0.02f, 0.05f);
                s.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(1f, 0.2f, 0.12f, 0.95f));
                var rb = s.AddComponent<Rigidbody>();
                rb.useGravity = false;
                rb.linearVelocity = Random.onUnitSphere * Random.Range(3f, 8f);
                Object.Destroy(s, 0.28f);
            }
        }

        void Impact(Vector3 p, Vector3 n, float dmg, float blast, bool charged, float size, NetKnightGame game) =>
            Blast(p, n, dmg, blast, charged, game, transform, size);

        public static void Blast(Vector3 p, Vector3 n, float dmg, float blast, bool charged, NetKnightGame game, Transform ignoreRoot = null, float size = 0f)
        {
            Inferno(p, n, Mathf.Max(0.7f, blast), charged);
            NkSfx.PlasmaImpact(p, charged, size);
            NkWindow.Scare(p);
            if (charged && size >= 0.42f && game && game.world != null)
                game.world.ScorchWall(p);
            if (size > MaxBallSize * 0.5f)
            {
                NkInput.Rumble(XRNode.LeftHand, 0.32f, 0.12f);
                NkInput.Rumble(XRNode.RightHand, 0.32f, 0.12f);
            }
            var cols = Physics.OverlapSphere(p, blast);
            foreach (var c in cols)
            {
                if (ignoreRoot && (c.transform == ignoreRoot || c.transform.IsChildOf(ignoreRoot))) continue;
                if (c.GetComponentInParent<NkPlayer>() || c.GetComponentInParent<NkPet>()) continue;
                NkCombat.HurtAny(c.transform, dmg, n, p, game);
                var rb = c.attachedRigidbody;
                if (rb) rb.AddExplosionForce(dmg * 1.8f, p, blast, 0.4f, ForceMode.Impulse);
            }
        }

        static void Inferno(Vector3 p, Vector3 n, float power, bool charged)
        {
            float mul = charged ? 1.35f : 0.85f;
            Puff(p, Vector3.one * (0.35f * mul), Vector3.one * (power * 0.85f * mul),
                NkGfx.Additive(new Color(1f, 0.95f, 0.7f, 0.95f)), charged ? 0.28f : 0.14f);
            Puff(p, Vector3.one * (0.55f * mul), Vector3.one * (power * 1.15f * mul),
                NkGfx.Additive(new Color(1f, 0.45f, 0.08f, 0.9f)), charged ? 0.5f : 0.22f);
            Puff(p + n * 0.08f, Vector3.one * (0.4f * mul), Vector3.one * (power * 1.4f * mul),
                NkGfx.Additive(new Color(1f, 0.22f, 0.04f, 0.8f)), charged ? 0.55f : 0.26f);
            int tongues = charged ? 12 : 7;
            for (int i = 0; i < tongues; i++)
            {
                Vector3 dir = (n * 0.45f + Random.onUnitSphere).normalized;
                var flame = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                Object.DestroyImmediate(flame.GetComponent<Collider>());
                flame.transform.position = p + dir * 0.12f;
                flame.transform.rotation = Quaternion.LookRotation(dir);
                float thick = Random.Range(0.12f, 0.28f) * mul;
                float len = Random.Range(0.55f, 1.4f) * power * 0.22f * mul;
                flame.transform.localScale = new Vector3(thick, thick, len);
                var hot = i % 3 == 0
                    ? new Color(1f, 0.85f, 0.25f, 0.9f)
                    : (i % 3 == 1 ? new Color(1f, 0.35f, 0.05f, 0.85f) : new Color(0.9f, 0.12f, 0.02f, 0.8f));
                flame.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(hot);
                var puff = flame.AddComponent<NkPuff>();
                puff.endScale = new Vector3(thick * 1.8f, thick * 1.8f, len * 2.2f);
                puff.drift = dir * Random.Range(1.6f, 4.2f);
                puff.life = charged ? Random.Range(0.35f, 0.7f) : Random.Range(0.18f, 0.35f);
            }
            int smokes = charged ? 9 : 5;
            for (int i = 0; i < smokes; i++)
            {
                Vector3 dir = (n * 0.7f + Random.insideUnitSphere * 0.8f).normalized;
                var smoke = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                Object.DestroyImmediate(smoke.GetComponent<Collider>());
                smoke.transform.position = p + dir * Random.Range(0.1f, 0.45f);
                float s0 = (0.35f + power * 0.12f) * mul;
                smoke.transform.localScale = Vector3.one * s0;
                float g = Random.Range(0.08f, 0.22f);
                smoke.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(new Color(g, g * 0.9f, g * 0.85f, 0.45f), 0.42f, true);
                var puff = smoke.AddComponent<NkPuff>();
                puff.endScale = Vector3.one * (s0 * Random.Range(3.2f, 5.5f));
                puff.drift = dir * Random.Range(0.4f, 1.3f) + Vector3.up * 0.35f;
                puff.life = charged ? Random.Range(0.9f, 1.6f) : Random.Range(0.45f, 0.85f);
            }
            int embers = charged ? 18 : 8;
            for (int i = 0; i < embers; i++)
            {
                var e = GameObject.CreatePrimitive(PrimitiveType.Cube);
                Object.DestroyImmediate(e.GetComponent<Collider>());
                e.transform.position = p + Random.insideUnitSphere * 0.15f;
                e.transform.localScale = Vector3.one * Random.Range(0.03f, 0.08f) * mul;
                e.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(1f, Random.Range(0.25f, 0.7f), 0.05f, 0.95f));
                var rb = e.AddComponent<Rigidbody>();
                rb.useGravity = false;
                rb.linearDamping = 1.4f;
                rb.linearVelocity = (n * Random.Range(1.5f, 4f) + Random.onUnitSphere * Random.Range(2f, 7f)) * mul;
                rb.angularVelocity = Random.onUnitSphere * 8f;
                Object.Destroy(e, charged ? Random.Range(0.4f, 0.9f) : 0.35f);
            }
            var liteGo = new GameObject("InfernoLight");
            liteGo.transform.position = p + n * 0.2f;
            var lite = liteGo.AddComponent<Light>();
            lite.type = LightType.Point;
            lite.color = new Color(1f, 0.45f, 0.12f);
            lite.range = 6f + power * 0.6f;
            lite.intensity = charged ? 8.5f : 3.8f;
            var fade = liteGo.AddComponent<NkPuff>();
            fade.life = charged ? 0.55f : 0.22f;
            fade.endScale = Vector3.one;
            Object.Destroy(liteGo, fade.life);
        }

        static void Puff(Vector3 p, Vector3 s0, Vector3 s1, Material mat, float life)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            Object.DestroyImmediate(go.GetComponent<Collider>());
            go.transform.position = p;
            go.transform.localScale = s0;
            go.GetComponent<Renderer>().sharedMaterial = mat;
            var puff = go.AddComponent<NkPuff>();
            puff.endScale = s1;
            puff.life = life;
        }

        void Melee(NetKnightGame game)
        {
            if (_warm > 0f || !sword || !_swinging) return;
            Vector3 a = sword.TransformPoint(new Vector3(0, 0.01f, 0.18f));
            Vector3 b = bladeTip ? bladeTip.position : sword.TransformPoint(new Vector3(0, 0.01f, 1.148f));
            var hits = Physics.OverlapCapsule(a, b, 0.64f);
            float pwr = game ? game.Power : 1f;
            foreach (var h in hits)
            {
                if (h.transform.IsChildOf(sword) || h.transform.IsChildOf(cannon)) continue;
                if (h.GetComponentInParent<NkPlayer>() || h.GetComponentInParent<NkPet>()) continue;
                Vector3 at = ClosestHit(h, b);
                float dmg = (2.8f + _relTipSpd * 0.18f) * pwr;
                if (NkCombat.HurtAny(h.transform, dmg, sword.forward, at, game))
                    Sparks(at);
            }
        }

        static Vector3 ClosestHit(Collider h, Vector3 p)
        {
            if (!h) return p;
            if (h is BoxCollider || h is SphereCollider || h is CapsuleCollider)
                return h.ClosestPoint(p);
            var mesh = h as MeshCollider;
            if (mesh && mesh.convex) return h.ClosestPoint(p);
            return h.bounds.ClosestPoint(p);
        }
    }

    public class NkPuff : MonoBehaviour
    {
        public Vector3 endScale = Vector3.one;
        public Vector3 drift;
        public float life = 0.4f;
        Vector3 _s0;
        float _t;
        Light _lite;
        float _lite0;

        void Start()
        {
            _s0 = transform.localScale;
            _lite = GetComponent<Light>();
            if (_lite) _lite0 = _lite.intensity;
        }

        void Update()
        {
            _t += Time.deltaTime;
            float u = Mathf.Clamp01(_t / Mathf.Max(0.01f, life));
            transform.localScale = Vector3.Lerp(_s0, endScale, u);
            transform.position += drift * Time.deltaTime;
            if (_lite) _lite.intensity = _lite0 * (1f - u);
            if (u >= 1f) Destroy(gameObject);
        }
    }

    public class NkLassoGrab : MonoBehaviour
    {
        NetKnightGame _game;
        Rigidbody _rb;
        float _damp, _ang, _cool;
        bool _armed;

        public static bool Held(Component c) => c && c.GetComponent<NkLassoGrab>();

        public void Arm(NetKnightGame game)
        {
            _game = game;
            if (!_rb) _rb = GetComponent<Rigidbody>() ?? GetComponentInParent<Rigidbody>();
            if (_rb && !_armed)
            {
                _damp = _rb.linearDamping;
                _ang = _rb.angularDamping;
                _rb.linearDamping = Mathf.Min(_damp, 0.55f);
                _rb.angularDamping = Mathf.Min(_ang, 0.8f);
                _armed = true;
            }
            var pl = game && game.player ? game.player.GetComponent<Collider>() : null;
            var mine = GetComponent<Collider>() ?? GetComponentInParent<Collider>();
            if (pl && mine) Physics.IgnoreCollision(pl, mine, true);
        }

        void OnCollisionEnter(Collision c)
        {
            if (!_armed || !c.collider || _cool > 0f) return;
            if (c.collider.GetComponentInParent<NkPlayer>()) return;
            float spd = _rb ? _rb.linearVelocity.magnitude : c.relativeVelocity.magnitude;
            if (spd < 8.5f) return;
            _cool = 0.1f;
            Vector3 n = c.relativeVelocity.sqrMagnitude > 0.04f ? c.relativeVelocity.normalized : transform.forward;
            Vector3 at = c.contactCount > 0 ? c.GetContact(0).point : transform.position;
            float dmg = Mathf.Lerp(5f, 26f, Mathf.InverseLerp(8.5f, 34f, spd));
            bool foe = NkCombat.HurtAny(c.collider.transform, dmg, n, at, _game);
            NkCombat.HurtAny(transform, foe ? dmg * 0.5f : dmg * 0.9f, -n, at, _game);
            if (spd > 14f) NkSfx.Boom(at);
        }

        void Update() { _cool -= Time.deltaTime; }

        void OnDestroy()
        {
            if (_rb && _armed)
            {
                _rb.linearDamping = _damp;
                _rb.angularDamping = _ang;
            }
        }
    }

    public static class NkSlice
    {
        public static void Cut(GameObject go, Vector3 point, Vector3 beamDir, bool loot)
        {
            if (!go) return;
            var rend = go.GetComponentInChildren<Renderer>();
            var mat = rend ? rend.sharedMaterial : NkGfx.Make(0x444444);
            Vector3 n = Vector3.Cross(beamDir, Vector3.up);
            if (n.sqrMagnitude < 0.01f) n = Vector3.Cross(beamDir, Vector3.right);
            n.Normalize();
            var scale = go.transform.lossyScale;
            for (int i = 0; i < 2; i++)
            {
                var chunk = GameObject.CreatePrimitive(PrimitiveType.Cube);
                chunk.name = "Shard";
                chunk.transform.position = point + n * (i == 0 ? 0.09f : -0.09f);
                chunk.transform.rotation = Random.rotation;
                chunk.transform.localScale = Vector3.Scale(scale, new Vector3(0.55f, 0.45f, 0.6f));
                chunk.GetComponent<Renderer>().sharedMaterial = mat;
                var rb = chunk.AddComponent<Rigidbody>();
                rb.useGravity = false;
                rb.mass = 0.4f;
                rb.linearDamping = 0.25f;
                rb.linearVelocity = n * (i == 0 ? 3.2f : -3.2f) + beamDir * 1.4f + Random.insideUnitSphere * 0.6f;
                rb.angularVelocity = Random.onUnitSphere * 6f;
                Object.Destroy(chunk, 2.4f);
            }
            NkWeapons.Sparks(point);
            if (loot)
                NkCombat.BurstLoot(point, Random.Range(2, 5), Random.Range(1, 4));
            Object.Destroy(go);
        }
    }
}
