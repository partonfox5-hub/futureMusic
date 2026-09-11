using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.Rendering.Universal;
using UnityEngine.SceneManagement;

namespace NetKnight
{
    public class NetKnightGame : MonoBehaviour
    {
        public int playerHearts = 20, playerMaxHearts = 20, crystals;
        public int energy = 1000, maxEnergy = 1000, coins, missiles, rocketBoosts;
        public float jetMul = 1f, pulseMul = 1f, moveMul = 1f, score, goldT;
        public float Power => Mathf.Clamp(1f + (energy - 1000) * 0.001f, 0.2f, 4f);
        public float EnergySpeed => 1f + 0.001f * Mathf.Max(0, energy - 1000);
        public bool Gold => goldT > 0f;
        public void GrantGold()
        {
            if (_t < 6f) return;
            goldT = 42f;
            Hint("GOLD BLIMP — 42s instacharge, gold beam, forcefield.");
        }
        public NkLive live = new NkLive();
        public NkPlayer player;
        public NkDarkKnight knight;
        public NkWorld world;

        NkInput _input;
        Transform _root, _rig;
        Camera _cam;
        NkHud _visor;
        readonly List<NkLaser> _lasers = new List<NkLaser>();
        readonly List<Transform> _rifts = new List<Transform>();
        float _t, _nextHole = 60f, _hintT, _lastHurt, _regen, _retryIn, _crateSweep = 90f, _nextCage = 55f;
        int _powerTenth = -1;
        string _hint;
        bool _ready, _over, _camelSpawned, _triloSpawned;
        int _knightHits;
        float _nextHornet = 8f;
        bool _restarting;
        GameObject _loader;
        NkMenu _menu;
        NkIntro _intro;
        NkSplash _splash;
        int _swarmSeq;
        bool _buildStarted, _buildDone;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Boot()
        {
            if (Object.FindAnyObjectByType<NetKnightGame>()) return;
            var go = new GameObject("NetKnight");
            go.AddComponent<NetKnightGame>();
        }

        void Awake()
        {
            goldT = 0f;
            Physics.gravity = Vector3.zero;
            NkBrain.Load();
            _input = gameObject.AddComponent<NkInput>();
            _cam = Camera.main;
            if (!_cam)
            {
                var cgo = new GameObject("Camera");
                _cam = cgo.AddComponent<Camera>();
                cgo.AddComponent<AudioListener>();
            }
            SetupCam();
            _rig = new GameObject("Rig").transform;
            _cam.transform.SetParent(_rig, false);
            _cam.transform.localPosition = new Vector3(0, 1.4f, 0);
            Loader();
        }

        void SetupCam()
        {
            if (!_cam) return;
            _cam.clearFlags = CameraClearFlags.SolidColor;
            _cam.backgroundColor = new Color(0.04f, 0.02f, 0.07f);
            NkGfx.PaintSolid(_cam.backgroundColor);
            _cam.nearClipPlane = 0.05f;
            _cam.farClipPlane = 3000f;
            _cam.useOcclusionCulling = false;
            _cam.allowHDR = false;
            _cam.allowMSAA = true;
            NkQuestVisuals.Apply(_cam);
            var uacd = _cam.GetComponent<UniversalAdditionalCameraData>();
            if (!uacd) uacd = _cam.gameObject.AddComponent<UniversalAdditionalCameraData>();
            uacd.renderType = CameraRenderType.Base;
            uacd.allowXRRendering = true;
            uacd.renderPostProcessing = false;
            uacd.antialiasing = AntialiasingMode.None;
            var tpd = _cam.GetComponent<UnityEngine.InputSystem.XR.TrackedPoseDriver>();
            if (tpd) tpd.enabled = false;
        }

        IEnumerator Start()
        {
            yield return PlayFlow();
        }

        IEnumerator PlayFlow()
        {
            yield return null;
            if (_loader) { Object.Destroy(_loader); _loader = null; }
            NkBgm.Attach(gameObject);
            NkBgm.FadeIn(1.35f);
            _intro = NkIntro.Create(_cam, _input);
            if (_intro != null) _intro.ShowCurtain();
            float seat = 0f;
            while (seat < 0.45f)
            {
                seat += Time.unscaledDeltaTime;
                if (_intro != null) _intro.TickFrame();
                yield return null;
            }
            yield return _intro.PlayStory();
            SeatTrackingRig();
            if (!GetComponent<NkBgm>()) NkBgm.Attach(gameObject);
            if (_cam) _cam.backgroundColor = new Color(0.02f, 0.03f, 0.08f);
            _splash = NkSplash.Show(_cam, _input);
            if (_intro != null) { _intro.Dispose(_rig); _intro = null; }
            _buildStarted = _buildDone = false;
            StartCoroutine(CoBuild());
            float splashStart = Time.unscaledTime;
            const float maxWait = 20f;
            while (true)
            {
                float age = Time.unscaledTime - splashStart;
                if (age >= NkSplash.Duration && (_buildDone || age >= maxWait)) break;
                yield return null;
            }
            float outT = 0f;
            while (outT < 0.35f && _splash != null)
            {
                outT += Time.unscaledDeltaTime;
                _splash.SetLift(1f - Mathf.Clamp01(outT / 0.35f));
                yield return null;
            }
            GoLive();
        }

        IEnumerator CoBuild()
        {
            yield return SafeBuild();
            if (player && player.body)
            {
                player.body.isKinematic = true;
                player.body.linearVelocity = Vector3.zero;
            }
            _buildDone = true;
        }

        IEnumerator SafeBuild()
        {
            var e = BuildAsync(null);
            while (true)
            {
                bool more;
                object cur = null;
                try
                {
                    more = e.MoveNext();
                    if (more) cur = e.Current;
                }
                catch (System.Exception ex)
                {
                    Debug.LogException(ex);
                    break;
                }
                if (!more) yield break;
                yield return cur;
            }
            EnsurePlayer();
        }

        void GoLive()
        {
            if (_ready) return;
            if (world == null || world.spheres == null || world.spheres.Count == 0)
            {
                if (!_buildStarted || _buildDone) EnsureArena();
            }
            EnsurePlayer();
            if (_splash != null) { _splash.Dispose(); _splash = null; }
            if (_cam) _cam.backgroundColor = new Color(0.14f, 0.18f, 0.32f);
            if (player && player.body)
            {
                player.body.isKinematic = false;
                player.body.linearVelocity = Vector3.zero;
            }
            HookPlayerCam();
            if (!_visor && _cam) _visor = NkHud.Attach(_cam);
            _ready = true;
            if (world != null && player) world.Stream(player.transform.position);
        }

        void EnsureArena()
        {
            if (_root == null) _root = new GameObject("World").transform;
            if (world == null) world = new NkWorld();
            if (world.spheres.Count == 0)
            {
                try { world.Build(_root); }
                catch (System.Exception ex) { Debug.LogException(ex); }
            }
            EnsurePlayer();
        }

        void EnsurePlayer()
        {
            if (player) return;
            Vector3 spawn = Vector3.zero;
            if (world != null && world.spheres != null && world.spheres.Count > 0)
                spawn = world.CenterSpawn(world.spheres[0], new Vector3(0.35f, 0.2f, 0.9f));
            player = NkPlayer.Spawn(null, spawn, _input);
            if (player) player.transform.position = spawn;
            if (player && player.body)
            {
                player.body.isKinematic = true;
                player.body.linearVelocity = Vector3.zero;
                player.body.angularVelocity = Vector3.zero;
            }
        }

        void SeatTrackingRig()
        {
            if (!_cam) return;
            if (!_rig) _rig = new GameObject("Rig").transform;
            _cam.transform.SetParent(_rig, false);
            if (_input != null && _input.xrActive && _input.headValid)
            {
                _cam.transform.localPosition = _input.headPos;
                _cam.transform.localRotation = _input.headRot;
            }
            else
            {
                _cam.transform.localPosition = new Vector3(0f, 1.4f, 0f);
                _cam.transform.localRotation = Quaternion.identity;
            }
        }

        IEnumerator BuildAsync(NkIntro intro)
        {
            if (_buildStarted) yield break;
            _buildStarted = true;
            void P(float u, string s)
            {
                if (intro == null) return;
                intro.SetLoad(u, s);
                intro.TickFrame();
            }
            P(0.04f, "STUDIO LIGHTS");
            RenderSettings.ambientLight = new Color(0.42f, 0.38f, 0.55f);
            RenderSettings.ambientIntensity = 1.15f;
            RenderSettings.fog = false;
            var sun = new GameObject("Key").AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.color = new Color(0.55f, 0.7f, 1f);
            sun.intensity = 0.55f;
            sun.transform.rotation = Quaternion.Euler(40, 30, 0);
            var fill = new GameObject("Fill").AddComponent<Light>();
            fill.type = LightType.Directional;
            fill.color = new Color(1f, 0.3f, 0.7f);
            fill.intensity = 0.28f;
            fill.transform.rotation = Quaternion.Euler(200, -40, 0);
            yield return null;
            if (_root == null) _root = new GameObject("World").transform;
            if (world == null) world = new NkWorld();
            if (world.spheres.Count == 0)
                yield return world.BuildAsync(_root, (u, s) => P(0.08f + u * 0.72f, s));
            P(0.84f, "CONTESTANT RIG");
            yield return null;
            if (!player && world != null && world.spheres.Count > 0)
            {
                Vector3 pSpawn = world.CenterSpawn(world.spheres[0], new Vector3(0.35f, 0.2f, 0.9f));
                player = NkPlayer.Spawn(null, pSpawn, _input);
                player.transform.position = pSpawn;
            }
            if (player && player.body)
            {
                player.body.isKinematic = true;
                player.body.linearVelocity = Vector3.zero;
                player.body.angularVelocity = Vector3.zero;
            }
            Physics.SyncTransforms();
            NkCombat.quitting = false;
            yield return null;
            P(0.92f, "SUPPLY DROP");
            for (int i = 0; i < 16; i++)
            {
                SpawnCrateCluster(world.RandomOnInner(5f, player.transform.position), Random.Range(2, 9));
                if ((i & 1) == 1) yield return null;
            }
            for (int i = 0; i < world.spheres.Count; i++)
            {
                var s = world.spheres[i];
                if (s == null) continue;
                int n = s.hub ? 4 : 3;
                for (int k = 0; k < n; k++)
                    SpawnCrateCluster(s.c + Random.onUnitSphere * (s.r + Random.Range(5f, 16f)), Random.Range(2, 8));
                yield return null;
            }
            world.PlaceFragmentBelts();
            yield return null;
            world.PlaceHealWells();
            PlaceBlimps();
            PlaceMissiles();
            yield return null;
            P(0.97f, "WINDOWS");
            yield return null;
            NkWindow.Scatter(world);
            NkPetCage.Scatter(world, player.transform.position);
            yield return null;
            _menu = NkMenu.Attach(gameObject);
            Hint("Controls on visor  ·  stick-click missiles  ·  MENU pauses");
            P(1f, "LIVE");
            yield return null;
        }

        void Loader() { }

        void RiseWhiteKnight()
        {
            Vector3 pos = knight.transform.position;
            Vector3 vel = Vector3.zero;
            var rb0 = knight.GetComponent<Rigidbody>();
            if (rb0) vel = rb0.linearVelocity;
            Object.DestroyImmediate(knight.gameObject);
            knight = NkDarkKnight.Spawn(pos, true);
            var rb = knight ? knight.GetComponent<Rigidbody>() : null;
            if (rb) rb.linearVelocity = vel;
            Hint("The Dark Knight falls — a WHITE KNIGHT rises.");
            NkSfx.Boom(pos);
            NkSfx.Crowd(pos);
        }

        void ConfineAll()
        {
            if (world == null) return;
            if (player && player.body) world.Confine(player.body, 0.9f);
            if (knight)
            {
                var rb = knight.GetComponent<Rigidbody>();
                if (rb) world.Confine(rb, knight.white ? 1.8f : 1.2f);
            }
            foreach (var c in NkCamel.All) if (c) { var rb = c.GetComponent<Rigidbody>(); if (rb) world.Confine(rb, 0.9f); }
            foreach (var t in NkTrilo.All) if (t) { var rb = t.GetComponent<Rigidbody>(); if (rb) world.Confine(rb, 1.3f); }
            foreach (var d in NkDrone.All) if (d && d.body) world.Confine(d.body, 0.55f);
            foreach (var b in NkBreakable.All)
            {
                if (!b) continue;
                var rb = b.GetComponent<Rigidbody>();
                if (rb) world.Confine(rb, 0.55f);
            }
            foreach (var s in NkPlasmaStroke.All)
            {
                if (!s) continue;
                var rb = s.GetComponent<Rigidbody>();
                if (rb && !rb.isKinematic) world.Confine(rb, 0.7f);
            }
            foreach (var s in NkCrystal.All)
            {
                if (!s) continue;
                var rb = s.GetComponent<Rigidbody>();
                if (rb) world.Confine(rb, 0.4f);
            }
            foreach (var c in NkCoin.All)
            {
                if (!c) continue;
                var rb = c.GetComponent<Rigidbody>();
                if (rb) world.Confine(rb, 0.4f);
            }
        }

        void Build()
        {
            RenderSettings.ambientLight = new Color(0.42f, 0.38f, 0.55f);
            RenderSettings.ambientIntensity = 1.15f;
            RenderSettings.fog = false;
            var sun = new GameObject("Key").AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.color = new Color(0.55f, 0.7f, 1f);
            sun.intensity = 0.55f;
            sun.transform.rotation = Quaternion.Euler(40, 30, 0);
            var fill = new GameObject("Fill").AddComponent<Light>();
            fill.type = LightType.Directional;
            fill.color = new Color(1f, 0.3f, 0.7f);
            fill.intensity = 0.28f;
            fill.transform.rotation = Quaternion.Euler(200, -40, 0);

            _root = new GameObject("World").transform;
            world = new NkWorld();
            world.Build(_root);

            Vector3 pSpawn = world.CenterSpawn(world.spheres[0], new Vector3(0.35f, 0.2f, 0.9f));
            player = NkPlayer.Spawn(null, pSpawn, _input);
            player.transform.position = pSpawn;
            if (player.body)
            {
                player.body.linearVelocity = Vector3.zero;
                player.body.angularVelocity = Vector3.zero;
            }
            Physics.SyncTransforms();
            _cam.transform.SetParent(player.transform, false);
            _cam.transform.localPosition = new Vector3(0, 1.4f, 0);
            _visor = NkHud.Attach(_cam);
            NkBgm.Attach(gameObject);
            NkCombat.quitting = false;

            for (int i = 0; i < 16; i++)
                SpawnCrateCluster(world.RandomOnInner(5f, player.transform.position), Random.Range(2, 9));
            foreach (var s in world.spheres)
            {
                if (s == null) continue;
                int n = s.hub ? 4 : 3;
                for (int k = 0; k < n; k++)
                    SpawnCrateCluster(s.c + Random.onUnitSphere * (s.r + Random.Range(5f, 16f)), Random.Range(2, 8));
            }
            world.PlaceFragmentBelts();
            world.PlaceHealWells();
            PlaceBlimps();
            PlaceMissiles();
            NkWindow.Scatter(world);
            NkPetCage.Scatter(world, player.transform.position);
            _menu = NkMenu.Attach(gameObject);

            Hint("Controls on visor  ·  stick-click missiles  ·  MENU pauses");
        }

        void SpawnKnight()
        {
            if (knight || world == null || player == null) return;
            var kSphere = world.spheres.Count > 1 ? world.spheres[1] : world.spheres[0];
            Vector3 spawn = world.CenterSpawn(kSphere, new Vector3(-0.7f, 0.35f, -1.2f));
            if (Vector3.Distance(spawn, player.transform.position) < 10f)
                spawn = kSphere.c + Vector3.forward * (kSphere.r * 0.35f);
            knight = NkDarkKnight.Spawn(spawn);
            NkBrain.ApplyToKnight(knight);
            if (knight.staff)
            {
                var kc = knight.GetComponent<Collider>();
                var sc = knight.staff.GetComponent<Collider>();
                if (kc && sc) Physics.IgnoreCollision(kc, sc);
            }
            Hint("The Dark Knight enters the coliseum.");
        }

        void SpawnCrateCluster(Vector3 at, int n)
        {
            n = Mathf.Clamp(n, 1, 12);
            int style = Random.Range(0, 5);
            float spread = Random.Range(2.6f, 8.8f);
            Vector3 axis = Random.onUnitSphere;
            if (axis.sqrMagnitude < 0.01f) axis = Vector3.up;
            axis.Normalize();
            Vector3 side = Vector3.Cross(axis, Random.onUnitSphere);
            if (side.sqrMagnitude < 0.01f) side = Vector3.right;
            side.Normalize();
            int clumps = style == 4 ? Random.Range(2, 4) : 1;
            var hubs = new Vector3[clumps];
            for (int h = 0; h < clumps; h++)
                hubs[h] = h == 0 ? Vector3.zero : Random.onUnitSphere * Random.Range(3.8f, 12f);
            for (int i = 0; i < n; i++)
            {
                Vector3 off;
                switch (style)
                {
                    case 0:
                        off = Random.insideUnitSphere * spread;
                        break;
                    case 1:
                    {
                        float a = i / (float)Mathf.Max(1, n) * Mathf.PI * 2f + Random.Range(-0.28f, 0.28f);
                        off = (Quaternion.FromToRotation(Vector3.up, axis)
                            * new Vector3(Mathf.Cos(a), Random.Range(-0.4f, 0.4f), Mathf.Sin(a))) * spread;
                        break;
                    }
                    case 2:
                        off = axis * ((i - n * 0.5f) * Random.Range(1.15f, 2.5f)) + Random.insideUnitSphere * 1.15f;
                        break;
                    case 3:
                    {
                        float a = i * 0.95f;
                        float r = 0.45f + i * (spread / Mathf.Max(1, n));
                        off = Quaternion.AngleAxis(a * Mathf.Rad2Deg * 1.4f, axis) * side * r + axis * Mathf.Sin(a) * 0.85f;
                        break;
                    }
                    default:
                        off = hubs[i % clumps] + Random.insideUnitSphere * Random.Range(0.8f, 2.2f);
                        break;
                }
                bool barrel = Random.value < (style == 1 ? 0.64f : Random.Range(0.28f, 0.58f));
                NkBreakable.Make(at + off, barrel);
            }
        }

        void TickCrates(float dt)
        {
            _crateSweep -= dt;
            if (_crateSweep > 0f) return;
            _crateSweep = 90f;
            if (world == null || player == null) return;
            int live = 0;
            foreach (var b in NkBreakable.All) if (b) live++;
            int want = 52;
            while (live < want)
            {
                int n = Random.Range(2, 9);
                bool outer = Random.value < 0.38f;
                Vector3 at = outer
                    ? world.RandomOnOuter(5f, player.transform.position)
                    : world.RandomOnInner(5f, player.transform.position);
                SpawnCrateCluster(at, n);
                live += n;
                if (Random.value < 0.4f)
                {
                    int extra = Random.Range(2, 5);
                    SpawnCrateCluster(at + Random.onUnitSphere * Random.Range(5f, 14f), extra);
                    live += extra;
                }
            }
            Hint("Supply sweep — fresh crates drift in.");
            int mis = 0;
            foreach (var m in NkMissilePickup.All) if (m) mis++;
            while (mis < 3 && world.spheres.Count > 0)
            {
                NkMissilePickup.Make(world.RandomOnInner(8f, player.transform.position));
                mis++;
            }
        }

        void PlaceBlimps()
        {
            if (world == null || world.spheres.Count < 2 || !player) return;
            Vector3 from = player.transform.position;
            int n = 0;
            for (int i = 1; i < world.spheres.Count && n < 1; i++)
            {
                var s = world.spheres[i];
                if (s == null) continue;
                for (int tries = 0; tries < 12; tries++)
                {
                    Vector3 pos = world.InteriorPoint(s, 0.4f);
                    if (Vector3.Distance(pos, from) < 22f) continue;
                    NkBlimp.Make(pos);
                    n++;
                    break;
                }
            }
        }

        void PlaceMissiles()
        {
            if (world == null || world.spheres.Count < 1 || !player) return;
            int n = 0;
            for (int i = 0; i < world.spheres.Count && n < 3; i++)
            {
                var s = world.spheres[i];
                if (s == null) continue;
                Vector3 pos = world.InteriorPoint(s, 0.38f);
                if (Vector3.Distance(pos, player.transform.position) < 8f) continue;
                NkMissilePickup.Make(pos);
                n++;
            }
        }

        public void AddEnergy(int n)
        {
            energy += n;
            if (energy > maxEnergy) maxEnergy = energy;
            live.crystals += n;
            score += n;
        }

        public void AddKillScore(float pts) { score += pts; }
        public void AddKnightScore(float dmg)
        {
            score += 32f * Mathf.Pow(1.18f, _knightHits);
            _knightHits++;
        }

        public void FireMissile(int side)
        {
            if (missiles <= 0) { Hint("No seeking missiles. Smash crates or pick up racks."); return; }
            if (NkMissile.InFlight >= 2) { Hint("Two missiles already in the air."); return; }
            if (!NkMissile.Fire(_cam, side, this)) return;
            missiles--;
            NkSfx.Missile(_cam.transform.position);
        }

        public void Hint(string s) { _hint = s; _hintT = 4f; }

        public void HurtPlayer(int hearts, Vector3 dir, float powerMul = 1f)
        {
            _lastHurt = Time.time;
            if (player && player.body) player.body.AddForce(dir.normalized * 3.5f, ForceMode.VelocityChange);
            NkInput.Rumble(UnityEngine.XR.XRNode.LeftHand, 0.7f, 0.1f);
            if (player) NkSfx.Hurt(player.transform.position);
            int drain = Mathf.Max(1, Mathf.RoundToInt(hearts * 25f * powerMul));
            if (playerHearts > 0)
            {
                playerHearts -= hearts;
                if (playerHearts < 0)
                {
                    int overflow = -playerHearts;
                    playerHearts = 0;
                    DrainPower(Mathf.Max(1, Mathf.RoundToInt(overflow * 25f * powerMul)));
                    Hint("Hull gone — hits now drain power.");
                }
            }
            else DrainPower(drain);
        }

        void DrainPower(int n)
        {
            energy -= n;
            if (energy < 0) energy = 0;
        }

        void HookPlayerCam()
        {
            if (!_cam || !player) return;
            _cam.farClipPlane = 3000f;
            _cam.useOcclusionCulling = false;
            _cam.transform.SetParent(player.transform, false);
            if (_input != null && _input.xrActive && _input.headValid)
            {
                _cam.transform.localPosition = _input.headPos;
                _cam.transform.localRotation = _input.headRot;
            }
            else
            {
                _cam.transform.localPosition = new Vector3(0f, 1.4f, 0f);
                _cam.transform.localRotation = Quaternion.identity;
            }
        }

        void Update()
        {
            float dt = Mathf.Min(0.05f, Time.deltaTime);
            _input.Poll();
            if (_intro != null) _intro.TickFrame();
            if (_splash != null && !_ready)
            {
                SeatTrackingRig();
                _splash.Tick(Time.unscaledDeltaTime);
                if (_splash.Age > 22f) GoLive();
            }
            if (_ready && _input.xrActive && _input.headValid && _cam)
            {
                _cam.transform.localPosition = _input.headPos;
                _cam.transform.localRotation = _input.headRot;
            }
            if (!_ready) return;
            if (player == null || world == null)
            {
                EnsurePlayer();
                if (player == null || world == null) return;
            }
            NkPlayLog.Tick(this);
            if (!_input.xrActive) _input.DesktopFallback(_cam.transform);
            if (_menu != null && _ready && !_over && _input.PressedMenu())
                _menu.Toggle(player);
            if (_menu != null && _menu.IsOpen)
            {
                _menu.Tick(_input, this, player);
                return;
            }
            if (NkStore.AnyOpen)
            {
                float udt = Time.unscaledDeltaTime;
                Vector3 shopHead = _cam ? _cam.transform.position : (player ? player.transform.position : Vector3.zero);
                if (world != null)
                    foreach (var st in world.stores)
                        if (st) st.Tick(udt, _input, shopHead, this);
                if (_visor && player && player.weapons)
                    _visor.SetLaser(player.weapons.LaserMeter01, player.weapons.LaserCooling, player.weapons.LaserCharge01);
                return;
            }
            if (_over)
            {
                if (_visor) _visor.Status(_hint);
                _retryIn -= dt;
                if (_retryIn <= 0f && AnyRetry()) Retry();
                return;
            }

            _t += dt;
            if (goldT > 0f)
            {
                goldT -= dt;
                if (goldT <= 0f) { goldT = 0f; Hint("Gold blimp fades."); }
            }
            if (world != null && player) world.Stream(player.transform.position);
            if (energy < maxEnergy && Time.time - _lastHurt > 4.5f)
            {
                _regen += 4f * dt;
                while (_regen >= 1f && energy < maxEnergy) { energy++; _regen -= 1f; }
            }
            if (player)
            {
                Vector3 at = player.transform.position + Vector3.up * 0.85f;
                foreach (var w in NkHealWell.All)
                    if (w) w.Tick(dt, at, this);
            }
            if (world != null && world.scoreboard) world.scoreboard.Set(score, _t);
            if (_visor) { _visor.SetClock(_t); _visor.SetPurse(score); }
            live.Sample(player.body ? player.body.linearVelocity : Vector3.zero,
                world.spheres.Count > 0 ? Vector3.Distance(player.transform.position, world.spheres[0].c) : 0);
            if (_input.left.secondaryDown || (!_input.xrActive && Keyboard.current != null && Keyboard.current.yKey.wasPressedThisFrame))
            {
                if (_visor)
                {
                    bool on = _visor.ToggleHud();
                    Hint(on ? "HUD on" : "HUD off  ·  Y to show");
                }
            }

            player.Tick(dt, _input, world, this);
            if (knight) knight.Tick(dt, player, this, world);
            var head = player && player.cam ? player.cam.position : player.transform.position;
            foreach (var w in NkWindow.All)
                if (w) w.Tick(head);

            TickHoles(dt);
            TickCages(dt);
            TickCrates(dt);
            TickDrones(dt);
            TickLasers(dt);
            TickNewFoes(dt);
            TickHornets(dt);
            foreach (var h in world.hydras)
                if (h) h.Tick(dt, player, this, world);
            foreach (var c in NkCamel.All.ToArray())
                if (c) c.Tick(dt, player, this, _lasers);
            foreach (var t in NkTrilo.All.ToArray())
                if (t) t.Tick(dt, player, this);
            foreach (var l in NkLemur.All.ToArray())
                if (l) l.Tick(dt, player, this, world);
            ConfineAll();
            if (_visor) _visor.Tick(knight, _cam);
            if (_visor && world != null && player) _visor.TickHolo(world, player.transform.position);
            if (_visor && player && player.weapons)
                _visor.SetLaser(player.weapons.LaserMeter01, player.weapons.LaserCooling, player.weapons.LaserCharge01);
            if (_visor)
            {
                _visor.SetHealth(playerHearts, playerMaxHearts);
                _visor.SetPower(energy, maxEnergy, Power);
                _visor.SetMissiles(missiles);
                _visor.SetHullGone(playerHearts <= 0);
            }
            TickPowerVoice();

            if (!knight && _t >= 30f) SpawnKnight();
            if (knight && knight.hearts <= 0)
            {
                if (!knight.white) RiseWhiteKnight();
                else
                {
                    knight.SurviveWipe(world);
                    Hint("The White Knight vanishes — the hunt continues.");
                }
            }
            if (energy <= 0) End(false, "Power depleted.");

            _hintT -= dt;
            if (_visor && Time.frameCount % 4 == 0)
            {
                string line = "▸ " + missiles;
                if (player && player.weapons)
                {
                    var wpn = player.weapons;
                    if (wpn.LaserCooling) line += "   LASER CD " + wpn.laserCd.ToString("0.0") + "s";
                    else line += "   LASER " + wpn.laserFuel.ToString("0.0") + "s";
                }
                if (knight && knight.hearts < 10f)
                    line += "\n⚠  " + (knight.white ? "WHITE" : "DARK") + " KNIGHT  ♥ " + Mathf.CeilToInt(knight.hearts);
                if (Gold) line += "  GOLD " + goldT.ToString("0") + "s";
                if (_hintT > 0) line += "\n" + _hint;
                _visor.Status(line);
            }
            if (_visor) _visor.SetKnightWarn(knight && knight.hearts < 10f, knight);
        }

        void TickNewFoes(float dt)
        {
            if (!_camelSpawned && _t > 84f && world.spheres.Count > 0)
            {
                _camelSpawned = true;
                var s = world.spheres[Random.Range(0, world.spheres.Count)];
                NkCamel.Spawn(world.CenterSpawn(s, Random.insideUnitSphere * 4f));
                Hint("A robotic hover-camel slides in.");
            }
            if (!_triloSpawned && _t > 116f && world.spheres.Count > 0)
            {
                _triloSpawned = true;
                var s = world.spheres.Count > 2 ? world.spheres[2] : world.spheres[0];
                NkTrilo.Spawn(world.CenterSpawn(s, new Vector3(2f, 1f, -3f)));
                Hint("Power-armor trilobite on approach.");
            }
        }

        void TickHornets(float dt)
        {
            foreach (var h in NkHornet.All.ToArray())
                if (h) h.Tick(dt, player, this, _lasers);
            if (!_ready || world == null || !player) return;
            if (_t < 480f) return;
            _nextHornet -= dt;
            if (_nextHornet > 0f) return;
            int n = _t > 720f ? 5 : 3;
            _nextHornet = (n == 5 ? Random.Range(130f, 190f) : Random.Range(95f, 150f)) * 1.3f;
            Vector3 at = world.RandomOutside(player.transform.position);
            NkHornet.SpawnPack(at, n);
            Hint(n == 5 ? "Hornet pack — five insect gunships outside the spheres." : "Hornet copters on the hull — stay inside or intercept.");
        }

        void TickHoles(float dt)
        {
            if (_t < 60f) return;
            _nextHole -= dt;
            if (_nextHole > 0) return;
            float span = Mathf.Max(4.35f, 20f - (_t - 60f) * 0.12f) * 1.05f;
            _nextHole = span;
            var p = world.RandomRiftPoint();
            var r = world.OpenRift(p);
            _rifts.Add(r);
            world.InsideAny(p, out var sph, out _, out var inward);
            var iris = r ? r.GetComponent<NkIrisDoor>() : null;
            System.Action spill = () =>
            {
                int n = Mathf.Max(2, Mathf.RoundToInt(Random.Range(2, 4) * 1.1f * 0.95f));
                int swarm = ++_swarmSeq;
                for (int i = 0; i < n; i++)
                {
                    var kind = (NkDroneKind)Random.Range(0, 7);
                    if (i == 0 && Random.value < 0.35f) kind = NkDroneKind.Missile;
                    NkDrone.Make(p + inward * (0.8f + i * 0.15f) + Random.insideUnitSphere * 0.4f, swarm, kind);
                }
                Hint("Steel hatch irises open. A mixed drone swarm spills in.");
                if (Random.value < 0.34f)
                {
                    int pack = Random.value < 0.18f ? Random.Range(2, 6) : 1;
                    NkLemur.SpawnPack(world, p, pack);
                    Hint(pack == 1 ? "An owl-lemur crawler clings to the hull." : pack + " owl-lemurs crawl from the grate.");
                }
            };
            if (iris) iris.Release(spill);
            else spill();
        }

        void TickDrones(float dt)
        {
            var weap = player ? player.weapons : null;
            var p = _cam ? _cam.transform.position : player.transform.position;
            foreach (var d in NkDrone.All.ToArray())
                if (d) d.Tick(dt, p, weap, _lasers);
        }

        void TickLasers(float dt)
        {
            var weap = player ? player.weapons : null;
            var p = _cam ? _cam.transform.position : Vector3.zero;
            for (int i = _lasers.Count - 1; i >= 0; i--)
            {
                var l = _lasers[i];
                l.life -= dt;
                Vector3 np = l.p + l.v * dt;
                NkWindow.Threat(l.p, l.v);
                if (weap && (NkCombat.NearSword(weap, l.p, 0.2f)
                    || (Physics.Raycast(l.p, l.v.normalized, out var hit, l.v.magnitude * dt + 0.7f)
                        && NkCombat.HitsSword(hit.collider, weap))))
                {
                    if (l.vis) Destroy(l.vis.gameObject);
                    if (weap.sword) NkWeapons.Sparks(weap.sword.position);
                    _lasers.RemoveAt(i);
                    continue;
                }
                if (Vector3.Distance(np, p) < 0.28f)
                {
                    HurtPlayer(1, l.v, 0.95f);
                    live.hitsTaken++;
                    if (l.vis) Destroy(l.vis.gameObject);
                    _lasers.RemoveAt(i);
                    continue;
                }
                if (l.life <= 0 || Physics.Raycast(l.p, l.v, out _, l.v.magnitude * dt))
                {
                    if (l.vis) Destroy(l.vis.gameObject);
                    _lasers.RemoveAt(i);
                    continue;
                }
                l.p = np;
                if (l.vis)
                {
                    l.vis.position = np;
                    if (l.v.sqrMagnitude > 0.01f) l.vis.rotation = Quaternion.LookRotation(l.v);
                }
                _lasers[i] = l;
            }
        }

        void End(bool win, string msg)
        {
            if (_over) return;
            _over = true;
            if (_menu) _menu.SetOpen(false, player);
            Time.timeScale = 1f;
            AudioListener.pause = false;
            _retryIn = 0.7f;
            Hint(msg);
            var ses = live.Seal(_t, win, msg);
            NkBrain.SaveSession(ses);
            if (!win)
            {
                NkBrain.SubmitScore(score, _t);
                if (_visor) _visor.ShowGameOver(score, NkBrain.HighScoreText(), _t);
                if (_cam) NkSfx.GameOver(_cam.transform.position);
            }
        }

        bool AnyRetry()
        {
            if (_input.left.triggerDown || _input.right.triggerDown || _input.left.primaryDown || _input.right.primaryDown
                || _input.left.gripDown || _input.right.gripDown || _input.left.stickClickDown || _input.right.stickClickDown)
                return true;
            var k = Keyboard.current;
            var m = Mouse.current;
            return (k != null && k.anyKey.wasPressedThisFrame) || (m != null && (m.leftButton.wasPressedThisFrame || m.rightButton.wasPressedThisFrame));
        }

        void Retry()
        {
            if (_restarting) return;
            _restarting = true;
            if (_menu) _menu.SetOpen(false, player);
            Time.timeScale = 1f;
            AudioListener.pause = false;
            StopAllCoroutines();
            StartCoroutine(RestartCo());
        }

        IEnumerator RestartCo()
        {
            NkCombat.BeginTeardown();
            NkSfx.LaserHum(Vector3.zero, false);
            NkSfx.CrowdLoop(false, Vector3.zero);
            if (_intro != null) { _intro.Dispose(_rig); _intro = null; }
            if (_splash != null) { _splash.Dispose(); _splash = null; }
            if (_visor) { _visor.Dispose(); _visor = null; }
            if (_cam)
            {
                if (_rig) _cam.transform.SetParent(_rig, true);
                else _cam.transform.SetParent(null, true);
                _cam.transform.localPosition = new Vector3(0f, 1.4f, 0f);
                _cam.transform.localRotation = Quaternion.identity;
            }
            for (int i = 0; i < _lasers.Count; i++)
                if (_lasers[i].vis) Object.Destroy(_lasers[i].vis.gameObject);
            _lasers.Clear();
            _rifts.Clear();
            if (world != null && world.hydras != null)
            {
                foreach (var h in world.hydras)
                    if (h) Object.Destroy(h.gameObject);
                world.hydras.Clear();
            }
            if (player) { Object.Destroy(player.gameObject); player = null; }
            if (knight) { Object.Destroy(knight.gameObject); knight = null; }
            NkCombat.WipeEntities();
            if (_root) { Object.Destroy(_root.gameObject); _root = null; }
            world = null;
            yield return null;
            NkCombat.WipeEntities();
            NkCombat.quitting = false;
            ResetRun();
            _restarting = false;
            yield return PlayFlow();
        }

        void ResetRun()
        {
            playerHearts = playerMaxHearts = 20;
            energy = maxEnergy = 1000;
            coins = missiles = rocketBoosts = 0;
            jetMul = pulseMul = moveMul = 1f;
            score = goldT = 0f;
            live = new NkLive();
            _t = 0f;
            _nextHole = 60f;
            _hintT = 0f;
            _lastHurt = 0f;
            _regen = 0f;
            _retryIn = 0f;
            _crateSweep = 90f;
            _nextCage = 55f;
            _hint = null;
            _ready = false;
            _buildStarted = false;
            _buildDone = false;
            _over = false;
            _camelSpawned = false;
            _triloSpawned = false;
            _knightHits = 0;
            _swarmSeq = 0;
            _nextHornet = 8f;
            _powerTenth = -1;
        }

        void TickPowerVoice()
        {
            int tenth = Mathf.Clamp(Mathf.FloorToInt(Power * 10f + 0.0001f), 2, 40);
            if (_powerTenth < 0) { _powerTenth = tenth; return; }
            if (tenth > _powerTenth)
            {
                if (tenth >= 11)
                {
                    Vector3 at = player && player.cam ? player.cam.position : (player ? player.transform.position : Vector3.zero);
                    NkSfx.PowerLevel(tenth, at);
                    Hint("POWER  x" + (tenth / 10f).ToString("0.0"));
                }
                _powerTenth = tenth;
            }
            else if (tenth < _powerTenth)
                _powerTenth = tenth;
        }

        void TickCages(float dt)
        {
            if (!_ready || world == null || !player) return;
            _nextCage -= dt;
            if (_nextCage > 0f) return;
            _nextCage = Random.Range(48f, 88f);
            NkPetCage.Scatter(world, player.transform.position);
        }

        void OnApplicationPause(bool pauseStatus)
        {
            if (pauseStatus && _ready && !_over && _menu != null && !_menu.IsOpen)
                _menu.SetOpen(true, player);
        }

        void OnApplicationFocus(bool hasFocus)
        {
            if (!hasFocus && _ready && !_over && _menu != null && !_menu.IsOpen)
                _menu.SetOpen(true, player);
        }

        void OnApplicationQuit()
        {
            Time.timeScale = 1f;
            AudioListener.pause = false;
            NkCombat.quitting = true;
            if (!_over && _ready)
                NkBrain.SaveSession(live.Seal(_t, energy > 0, "quit"));
        }

        void OnDestroy()
        {
            NkCombat.quitting = true;
        }
    }
}
