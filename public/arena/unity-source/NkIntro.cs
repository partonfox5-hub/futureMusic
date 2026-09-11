using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace NetKnight
{
    public class NkIntro
    {
        Camera _cam;
        NkInput _input;
        Transform _root, _seat, _overlay;
        TextMesh _line, _skip, _loadLabel;
        Transform _comic, _box, _loadRoot, _loadFill, _dim;
        Transform _hostA, _hostB;
        Transform _armAL, _armAR, _armBL, _armBR;
        float _flash, _typeT;
        int _typed;
        string _full = "";
        bool _abort, _loading, _curtain;
        NkVisorFollow _follow;
        static readonly Color BootClear = new Color(0.04f, 0.02f, 0.07f);
        const float HudZ = 1.42f;

        static readonly string[] Lines =
        {
            "The Replicators ended scarcity. Anything can be transmuted. The world drowned in glittering junk.",
            "So we built a gameshow out of the leftovers. TRANSMUTE LIVE. Those linked spheres are last season's megastructures — a livestreamed coliseum.",
            "Every point is a GLYPH, the currency of abundance. You are tonight's contestant. Don't hit zero.",
            "Are you ready?!",
            "HOW TO FLY. Left stick strafes. Right stick climbs and turns. Hold A to jet. Tap A on a wall to kick off.",
            "HOW TO FIGHT. Left trigger shoots plasma. Swing the sword to cut and bounce shots. Hold right trigger to charge the sword laser.",
            "GADGETS. Left grip paints a plasma pad. Hold right grip for a red energy lasso — yank foes, crates and pads, and slam small enemies into walls. Stick-click fires a seeking missile. B force-pulses. Y toggles the HUD.",
            "THE COLISEUM. Smash crates for power glyphs and missiles. Cyan wells restore hull. Pads are solid ground. Don't hit zero.",
            "FOES AND PETS. Drones, knights, hydras, camels and hornets hunt you. Owl-lemurs crawl the hulls. Break a rare cage and that pet joins as an orbital strike."
        };
        static readonly string[] Comics =
        {
            "NkStory/comic_abundance",
            "NkStory/comic_orbs",
            "NkStory/comic_studio",
            "NkStory/comic_contestant",
            "NkStory/tut_fly",
            "NkStory/tut_fight",
            "NkStory/tut_tools",
            "NkStory/tut_world",
            "NkStory/tut_foes"
        };
        static readonly float[] Holds = { 4.312f, 4.312f, 4.312f, 2.156f, 5.4f, 5.4f, 5.4f, 5.4f, 5.4f };

        public static NkIntro Create(Camera cam, NkInput input)
        {
            var intro = new NkIntro();
            intro._cam = cam;
            intro._input = input;
            intro.BuildSet();
            NkSfx.CrowdLoop(true, cam ? cam.transform.position : Vector3.zero);
            return intro;
        }

        public IEnumerator PlayStory()
        {
            for (int i = 0; i < Lines.Length; i++)
            {
                BeginBeat(i);
                float t = 0f;
                bool last = i == Lines.Length - 1;
                while (true)
                {
                    t += Time.deltaTime;
                    TickType(i);
                    if (_input != null)
                    {
                        if (_input.PressedB()) { _abort = true; break; }
                        if (t > 0.12f && _input.PressedAdvance()) break;
                    }
                    float hold = i < Holds.Length ? Holds[i] : 5.4f;
                    if (t >= hold && _typed >= _full.Length) break;
                    bool talking = !last && _typed < _full.Length;
                    Talk(_hostA, talking && (i % 2 == 0), last, _armAL, _armAR);
                    Talk(_hostB, talking && (i % 2 == 1), last, _armBL, _armBR);
                    yield return null;
                }
                if (_abort) break;
            }
        }

        public void TickFrame()
        {
            TickCam();
            TickSkipFlash();
        }

        public void ShowLoading()
        {
            _loading = true;
            _curtain = false;
            SeatOverlay();
            if (_overlay) _overlay.gameObject.SetActive(true);
            if (_skip) _skip.gameObject.SetActive(false);
            if (_box) _box.gameObject.SetActive(false);
            if (_dim) _dim.gameObject.SetActive(true);
            if (_comic)
            {
                _comic.gameObject.SetActive(true);
                _comic.localPosition = new Vector3(0f, 0.10f, HudZ + 0.06f);
                _comic.localScale = new Vector3(0.70f, 0.39f, 1f);
            }
            var tex = Resources.Load<Texture2D>("NkStory/comic_studio");
            if (_comic && tex)
                _comic.GetComponent<Renderer>().sharedMaterial = NkGfx.Textured(tex, Color.white, true, true);
            if (_loadRoot)
            {
                _loadRoot.gameObject.SetActive(true);
                _loadRoot.localPosition = new Vector3(0f, -0.26f, HudZ);
            }
            TickCam();
            SetLoad(0.02f, "TRANSMUTING COLISEUM");
            NkSfx.Ui(_cam ? _cam.transform.position : Vector3.zero);
        }

        public void SetLoad(float u, string label)
        {
            u = Mathf.Clamp01(u);
            if (_loadLabel) _loadLabel.text = label + "\n" + Mathf.RoundToInt(u * 100f) + "%";
            if (_loadFill)
            {
                float w = 0.72f * Mathf.Max(0.02f, u);
                _loadFill.localScale = new Vector3(w, 0.028f, 1f);
                _loadFill.localPosition = new Vector3(-0.36f + w * 0.5f, -0.02f, -0.002f);
            }
        }

        public void Dispose(Transform returnCamTo = null)
        {
            if (_follow) _follow.paintClear = false;
            if (_cam && _root && _cam.transform.IsChildOf(_root))
                _cam.transform.SetParent(returnCamTo, true);
            if (_root) Object.Destroy(_root.gameObject);
            if (_overlay) Object.Destroy(_overlay.gameObject);
            _root = null;
            _overlay = null;
            _seat = null;
            _cam = null;
            NkSfx.CrowdLoop(false, Vector3.zero);
        }

        public void ShowCurtain()
        {
            _curtain = true;
            SeatOverlay();
            if (_overlay) _overlay.gameObject.SetActive(true);
            if (_dim) _dim.gameObject.SetActive(true);
            if (_box) _box.gameObject.SetActive(false);
            if (_skip) _skip.gameObject.SetActive(false);
            if (_comic) _comic.gameObject.SetActive(false);
            if (_loadRoot) _loadRoot.gameObject.SetActive(false);
            if (_line) _line.text = "";
            NkGfx.PaintSolid(BootClear);
            TickCam();
        }

        void BeginBeat(int i)
        {
            NkBootGuard.Release();
            _curtain = false;
            SeatOverlay();
            if (_overlay) _overlay.gameObject.SetActive(true);
            if (_dim) _dim.gameObject.SetActive(false);
            if (_box) _box.gameObject.SetActive(true);
            if (_skip) { _skip.text = "PRESS  B  TO  SKIP"; NkGfx.FaceHud(_skip); }
            bool tut = i >= 4;
            _full = Wrap(Lines[i], tut ? 24 : 20);
            _typed = 0;
            _typeT = 0f;
            if (_line) _line.text = "";
            var tex = i < Comics.Length ? Resources.Load<Texture2D>(Comics[i]) : null;
            if (_comic && tex)
            {
                _comic.gameObject.SetActive(true);
                _comic.localPosition = new Vector3(0f, tut ? 0.18f : 0.16f, HudZ + 0.06f);
                _comic.localScale = tut ? new Vector3(0.56f, 0.315f, 1f) : new Vector3(0.38f, 0.214f, 1f);
                _comic.GetComponent<Renderer>().sharedMaterial = NkGfx.Textured(tex, Color.white, true, true);
                NkSfx.Ui(_cam ? _cam.transform.position : Vector3.zero);
            }
            if (_box) _box.localPosition = new Vector3(0f, tut ? -0.36f : -0.32f, HudZ);
        }

        void TickType(int beat)
        {
            if (_typed >= _full.Length) { if (_line) _line.text = _full; return; }
            _typeT += Time.deltaTime;
            const float step = 0.016464f;
            int added = 0;
            while (_typeT >= step && _typed < _full.Length)
            {
                _typeT -= step;
                _typed++;
                added++;
            }
            if (added > 0)
            {
                if (_line) _line.text = _full.Substring(0, _typed);
                char c = _full[_typed - 1];
                if (c != ' ' && c != '\n' && (_typed % 3 == 0))
                    NkSfx.Type(_cam ? _cam.transform.position : Vector3.zero);
            }
        }

        void BuildSet()
        {
            _root = new GameObject("IntroSet").transform;
            _seat = new GameObject("IntroSeat").transform;
            _seat.SetParent(_root, false);
            _seat.position = new Vector3(0f, 1.15f, -2.6f);
            if (_cam)
            {
                _cam.transform.SetParent(_seat, false);
                _cam.transform.localPosition = new Vector3(0f, 1.55f, 0f);
                _cam.transform.localRotation = Quaternion.identity;
            }
            RenderSettings.ambientLight = new Color(0.35f, 0.22f, 0.45f);
            var key = new GameObject("introKey").AddComponent<Light>();
            key.type = LightType.Spot;
            key.color = new Color(1f, 0.85f, 0.55f);
            key.intensity = 2.4f;
            key.range = 18f;
            key.spotAngle = 70f;
            key.transform.SetParent(_root, false);
            key.transform.position = new Vector3(0f, 4.6f, -1f);
            key.transform.rotation = Quaternion.Euler(50f, 0f, 0f);
            NkGfx.Part(PrimitiveType.Cube, _root, new Vector3(0f, -0.05f, 2f), new Vector3(14f, 0.1f, 10f), new Color(0.12f, 0.08f, 0.16f), true, 0.2f, 0f, true, "floor");
            NkGfx.Part(PrimitiveType.Cube, _root, new Vector3(0f, 2.4f, 5.4f), new Vector3(16f, 5.4f, 0.2f), new Color(0.08f, 0.04f, 0.12f), true, 0.2f, 0f, false, "back");
            NkGfx.Part(PrimitiveType.Cube, _root, new Vector3(0f, 0.7f, 2.5f), new Vector3(3.6f, 1.05f, 1.4f), new Color(0.75f, 0.58f, 0.12f), false, 0.55f, 0.85f, true, "desk");
            var screen = GameObject.CreatePrimitive(PrimitiveType.Quad);
            Object.DestroyImmediate(screen.GetComponent<Collider>());
            screen.transform.SetParent(_root, false);
            screen.transform.position = new Vector3(0f, 3.35f, 5.2f);
            screen.transform.localScale = new Vector3(7.2f, 3.2f, 1f);
            var studio = Resources.Load<Texture2D>("NkStory/comic_studio");
            screen.GetComponent<Renderer>().sharedMaterial = studio
                ? NkGfx.Textured(studio, Color.white, true, false)
                : NkGfx.Make(new Color(0.2f, 0.05f, 0.35f), 1, true);
            _hostA = MakeHost(new Vector3(-0.9f, 0.98f, 2.15f), new Color(0.85f, 0.68f, 0.12f), "NkStory/host_gold", out _armAL, out _armAR);
            _hostB = MakeHost(new Vector3(0.95f, 0.98f, 2.2f), new Color(0.85f, 0.12f, 0.5f), "NkStory/host_magenta", out _armBL, out _armBR);
            if (_cam)
            {
                _cam.clearFlags = CameraClearFlags.SolidColor;
                _cam.backgroundColor = BootClear;
            }
            NkGfx.PaintSolid(BootClear);
            BuildOverlay();
            SeatOverlay();
        }

        void SeatOverlay()
        {
            if (!_overlay) return;
            Camera cam = _cam ? _cam : Camera.main;
            var all = Camera.allCameras;
            for (int i = 0; i < all.Length; i++)
                if (all[i] && all[i].stereoEnabled) { cam = all[i]; break; }
            if (cam && _overlay.parent != cam.transform)
            {
                _overlay.SetParent(cam.transform, false);
                _overlay.localPosition = Vector3.zero;
                _overlay.localRotation = Quaternion.identity;
                _overlay.localScale = Vector3.one;
            }
            if (!_follow) _follow = _overlay.gameObject.GetComponent<NkVisorFollow>();
            if (!_follow) _follow = _overlay.gameObject.AddComponent<NkVisorFollow>();
            _follow.cam = cam;
            _follow.clear = BootClear;
            _follow.paintClear = true;
        }

        void TickCam()
        {
            if (_cam && _seat && _cam.transform.IsChildOf(_seat) && _input != null && _input.headValid)
            {
                _cam.transform.localPosition = _input.headPos + new Vector3(0f, 0.35f, 0f);
                _cam.transform.localRotation = _input.headRot;
            }
            NkGfx.PaintSolid(BootClear);
            SeatOverlay();
        }

        Transform MakeHost(Vector3 pos, Color suit, string faceRes, out Transform armL, out Transform armR)
        {
            var root = new GameObject("Host").transform;
            root.SetParent(_root, false);
            root.position = pos;
            var skin = new Color(0.86f, 0.68f, 0.52f);
            var pants = Color.Lerp(suit, Color.black, 0.45f);
            NkGfx.Part(PrimitiveType.Capsule, root, new Vector3(0f, 0.55f, 0f), new Vector3(0.38f, 0.42f, 0.26f), suit, false, 0.4f, 0.55f, false, "torso");
            NkGfx.Part(PrimitiveType.Capsule, root, new Vector3(0f, 0.08f, 0f), new Vector3(0.34f, 0.28f, 0.24f), pants, false, 0.35f, 0.2f, false, "hips");
            NkGfx.Part(PrimitiveType.Capsule, root, new Vector3(-0.09f, -0.42f, 0.02f), new Vector3(0.12f, 0.38f, 0.12f), pants, false, 0.3f, 0.15f, false, "legL");
            NkGfx.Part(PrimitiveType.Capsule, root, new Vector3(0.09f, -0.42f, 0.02f), new Vector3(0.12f, 0.38f, 0.12f), pants, false, 0.3f, 0.15f, false, "legR");
            NkGfx.Part(PrimitiveType.Sphere, root, new Vector3(0f, 0.92f, 0.01f), Vector3.one * 0.12f, skin, false, 0.45f, 0.05f, false, "neck");
            var head = new GameObject("head").transform;
            head.SetParent(root, false);
            head.localPosition = new Vector3(0f, 1.12f, 0.04f);
            var skull = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            Object.DestroyImmediate(skull.GetComponent<Collider>());
            skull.transform.SetParent(head, false);
            skull.transform.localScale = new Vector3(0.28f, 0.32f, 0.26f);
            skull.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(skin, 1, false, 0.45f, 0.05f);
            var face = GameObject.CreatePrimitive(PrimitiveType.Quad);
            Object.DestroyImmediate(face.GetComponent<Collider>());
            face.transform.SetParent(head, false);
            face.transform.localPosition = new Vector3(0f, 0.02f, 0.13f);
            face.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            face.transform.localScale = new Vector3(0.28f, 0.34f, 1f);
            var tex = Resources.Load<Texture2D>(faceRes);
            face.GetComponent<Renderer>().sharedMaterial = tex
                ? NkGfx.Textured(tex, Color.white, true, true)
                : NkGfx.Make(skin, 1, true);
            var mouth = GameObject.CreatePrimitive(PrimitiveType.Cube);
            Object.DestroyImmediate(mouth.GetComponent<Collider>());
            mouth.name = "mouth";
            mouth.transform.SetParent(head, false);
            mouth.transform.localPosition = new Vector3(0f, -0.05f, 0.145f);
            mouth.transform.localScale = new Vector3(0.08f, 0.012f, 0.02f);
            mouth.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(new Color(0.35f, 0.08f, 0.1f), 1, true);
            armL = new GameObject("armL").transform;
            armL.SetParent(root, false);
            armL.localPosition = new Vector3(-0.24f, 0.72f, 0f);
            NkGfx.Part(PrimitiveType.Capsule, armL, new Vector3(-0.02f, -0.18f, 0f), new Vector3(0.1f, 0.22f, 0.1f), suit, false, 0.4f, 0.5f, false, "upper");
            NkGfx.Part(PrimitiveType.Capsule, armL, new Vector3(-0.02f, -0.42f, 0.04f), new Vector3(0.08f, 0.2f, 0.08f), skin, false, 0.4f, 0.05f, false, "fore");
            NkGfx.Part(PrimitiveType.Sphere, armL, new Vector3(-0.02f, -0.58f, 0.06f), Vector3.one * 0.08f, skin, false, 0.4f, 0.05f, false, "hand");
            armR = new GameObject("armR").transform;
            armR.SetParent(root, false);
            armR.localPosition = new Vector3(0.24f, 0.72f, 0f);
            NkGfx.Part(PrimitiveType.Capsule, armR, new Vector3(0.02f, -0.18f, 0f), new Vector3(0.1f, 0.22f, 0.1f), suit, false, 0.4f, 0.5f, false, "upper");
            NkGfx.Part(PrimitiveType.Capsule, armR, new Vector3(0.02f, -0.42f, 0.04f), new Vector3(0.08f, 0.2f, 0.08f), skin, false, 0.4f, 0.05f, false, "fore");
            NkGfx.Part(PrimitiveType.Sphere, armR, new Vector3(0.02f, -0.58f, 0.06f), Vector3.one * 0.08f, skin, false, 0.4f, 0.05f, false, "hand");
            return root;
        }

        void BuildOverlay()
        {
            _overlay = new GameObject("IntroHud").transform;
            var gold = NkGfx.Make(new Color(0.95f, 0.75f, 0.15f), 1, true);
            var black = NkGfx.Make(new Color(0.02f, 0.02f, 0.04f, 0.92f), 0.92f, true);
            _dim = GameObject.CreatePrimitive(PrimitiveType.Quad).transform;
            Object.DestroyImmediate(_dim.GetComponent<Collider>());
            _dim.SetParent(_overlay, false);
            _dim.localPosition = new Vector3(0f, 0f, HudZ + 0.22f);
            _dim.localRotation = Quaternion.Euler(0f, 180f, 0f);
            _dim.localScale = new Vector3(2.6f, 1.6f, 1f);
            _dim.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(new Color(0.02f, 0.02f, 0.05f, 0.84f), 0.84f, true);
            _dim.gameObject.SetActive(false);
            _box = new GameObject("box").transform;
            _box.SetParent(_overlay, false);
            _box.localPosition = new Vector3(0f, -0.32f, HudZ);
            void Frame(Transform parent, Vector3 p, Vector3 s)
            {
                var q = GameObject.CreatePrimitive(PrimitiveType.Quad);
                Object.DestroyImmediate(q.GetComponent<Collider>());
                q.transform.SetParent(parent, false);
                q.transform.localPosition = p;
                q.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
                q.transform.localScale = s;
                q.GetComponent<Renderer>().sharedMaterial = gold;
            }
            var card = GameObject.CreatePrimitive(PrimitiveType.Quad);
            Object.DestroyImmediate(card.GetComponent<Collider>());
            card.transform.SetParent(_box, false);
            card.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            card.transform.localScale = new Vector3(0.86f, 0.32f, 1f);
            card.GetComponent<Renderer>().sharedMaterial = black;
            Frame(_box, new Vector3(0f, 0.17f, -0.002f), new Vector3(0.88f, 0.010f, 1f));
            Frame(_box, new Vector3(0f, -0.17f, -0.002f), new Vector3(0.88f, 0.010f, 1f));
            Frame(_box, new Vector3(-0.44f, 0f, -0.002f), new Vector3(0.010f, 0.34f, 1f));
            Frame(_box, new Vector3(0.44f, 0f, -0.002f), new Vector3(0.010f, 0.34f, 1f));
            var tm = new GameObject("line").AddComponent<TextMesh>();
            tm.transform.SetParent(_box, false);
            tm.transform.localPosition = new Vector3(0f, 0.00f, -0.01f);
            tm.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            tm.anchor = TextAnchor.MiddleCenter;
            tm.alignment = TextAlignment.Center;
            tm.characterSize = 0.0066f;
            tm.fontSize = 42;
            tm.fontStyle = FontStyle.Bold;
            tm.color = Color.white;
            tm.text = "";
            NkGfx.FaceHud(tm);
            _line = tm;
            var sk = new GameObject("skip").AddComponent<TextMesh>();
            sk.transform.SetParent(_overlay, false);
            sk.transform.localPosition = new Vector3(0f, -0.10f, HudZ);
            sk.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            sk.anchor = TextAnchor.MiddleCenter;
            sk.alignment = TextAlignment.Center;
            sk.characterSize = 0.011f;
            sk.fontSize = 42;
            sk.fontStyle = FontStyle.Bold;
            sk.color = new Color(1f, 0.85f, 0.2f);
            sk.text = "";
            sk.gameObject.SetActive(false);
            NkGfx.FaceHud(sk);
            _skip = sk;
            _comic = GameObject.CreatePrimitive(PrimitiveType.Quad).transform;
            Object.DestroyImmediate(_comic.GetComponent<Collider>());
            _comic.SetParent(_overlay, false);
            _comic.localPosition = new Vector3(0f, 0.16f, HudZ + 0.06f);
            _comic.localRotation = Quaternion.Euler(0f, 180f, 0f);
            _comic.localScale = new Vector3(0.38f, 0.214f, 1f);
            _comic.gameObject.SetActive(false);
            _loadRoot = new GameObject("load").transform;
            _loadRoot.SetParent(_overlay, false);
            _loadRoot.localPosition = new Vector3(0f, -0.26f, HudZ);
            var well = GameObject.CreatePrimitive(PrimitiveType.Quad);
            Object.DestroyImmediate(well.GetComponent<Collider>());
            well.transform.SetParent(_loadRoot, false);
            well.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            well.transform.localScale = new Vector3(0.78f, 0.12f, 1f);
            well.GetComponent<Renderer>().sharedMaterial = black;
            Frame(_loadRoot, new Vector3(0f, 0.07f, -0.002f), new Vector3(0.8f, 0.01f, 1f));
            Frame(_loadRoot, new Vector3(0f, -0.07f, -0.002f), new Vector3(0.8f, 0.01f, 1f));
            Frame(_loadRoot, new Vector3(-0.4f, 0f, -0.002f), new Vector3(0.01f, 0.14f, 1f));
            Frame(_loadRoot, new Vector3(0.4f, 0f, -0.002f), new Vector3(0.01f, 0.14f, 1f));
            var fill = GameObject.CreatePrimitive(PrimitiveType.Quad);
            Object.DestroyImmediate(fill.GetComponent<Collider>());
            fill.transform.SetParent(_loadRoot, false);
            fill.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            fill.GetComponent<Renderer>().sharedMaterial = gold;
            _loadFill = fill.transform;
            var lt = new GameObject("ll").AddComponent<TextMesh>();
            lt.transform.SetParent(_loadRoot, false);
            lt.transform.localPosition = new Vector3(0f, 0.04f, -0.01f);
            lt.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            lt.anchor = TextAnchor.MiddleCenter;
            lt.alignment = TextAlignment.Center;
            lt.characterSize = 0.01f;
            lt.fontSize = 36;
            lt.fontStyle = FontStyle.Bold;
            lt.color = new Color(1f, 0.85f, 0.25f);
            lt.text = "";
            NkGfx.FaceHud(lt);
            _loadLabel = lt;
            _loadRoot.gameObject.SetActive(false);
            SetLoad(0f, "");
            _overlay.gameObject.SetActive(false);
        }

        void TickSkipFlash()
        {
            if (_loading || _curtain) { if (_skip) _skip.gameObject.SetActive(false); return; }
            _flash += Time.deltaTime;
            bool on = (_flash % 4.2f) < 1.35f;
            if (_skip)
            {
                _skip.gameObject.SetActive(on);
                float a = 0.45f + 0.55f * Mathf.Abs(Mathf.Sin(Time.time * 7f));
                _skip.color = new Color(1f, 0.88f, 0.25f, a);
            }
        }

        static string Wrap(string s, int width = 20)
        {
            if (string.IsNullOrEmpty(s)) return s;
            var sb = new System.Text.StringBuilder();
            int col = 0;
            var words = s.Split(' ');
            for (int i = 0; i < words.Length; i++)
            {
                string w = words[i];
                if (col > 0 && col + 1 + w.Length > width)
                {
                    sb.Append('\n');
                    col = 0;
                }
                else if (col > 0)
                {
                    sb.Append(' ');
                    col++;
                }
                sb.Append(w);
                col += w.Length;
            }
            return sb.ToString();
        }

        void Talk(Transform host, bool speaking, bool facePlayer, Transform armL, Transform armR)
        {
            if (!host) return;
            Transform mouth = null;
            foreach (var t in host.GetComponentsInChildren<Transform>())
                if (t.name == "mouth") { mouth = t; break; }
            if (mouth)
            {
                float o = speaking ? 0.018f + Mathf.Abs(Mathf.Sin(Time.time * 16f)) * 0.06f : 0.012f;
                mouth.localScale = new Vector3(0.08f, o, 0.02f);
            }
            float sway = Mathf.Sin(Time.time * 1.6f + host.position.x) * 4f;
            if (armL) armL.localRotation = Quaternion.Euler(speaking ? -18f + Mathf.Sin(Time.time * 7f) * 14f : sway, 8f, 12f);
            if (armR) armR.localRotation = Quaternion.Euler(speaking ? -12f + Mathf.Sin(Time.time * 6.2f + 1f) * 12f : -sway, -8f, -12f);
            Vector3 look = facePlayer && _cam
                ? (_cam.transform.position - host.position)
                : new Vector3(-host.position.x * 0.2f, 0f, -1.2f);
            look.y = 0f;
            if (look.sqrMagnitude > 0.01f)
                host.rotation = Quaternion.Slerp(host.rotation, Quaternion.LookRotation(look), Time.deltaTime * (facePlayer ? 5f : 2f));
        }
    }

    public class NkVisorFollow : MonoBehaviour
    {
        public Camera cam;
        public Color clear = new Color(0.04f, 0.02f, 0.07f);
        public bool paintClear = true;

        void LateUpdate()
        {
            var c = cam ? cam : Camera.main;
            var all = Camera.allCameras;
            for (int i = 0; i < all.Length; i++)
                if (all[i] && all[i].stereoEnabled) { c = all[i]; break; }
            if (c)
            {
                if (transform.parent != c.transform)
                    transform.SetParent(c.transform, false);
                transform.localPosition = Vector3.zero;
                transform.localRotation = Quaternion.identity;
                transform.localScale = Vector3.one;
            }
            if (paintClear) NkGfx.PaintSolid(clear);
        }
    }

    public class NkBootGuard : MonoBehaviour
    {
        public static readonly Color Clear = new Color(0.04f, 0.02f, 0.07f);
        static NkBootGuard _i;
        bool _hold = true;
        readonly Dictionary<Camera, Transform> _skies = new Dictionary<Camera, Transform>();

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        static void Early()
        {
            RenderSettings.skybox = null;
            if (_i) return;
            var go = new GameObject("NkBootGuard");
            Object.DontDestroyOnLoad(go);
            _i = go.AddComponent<NkBootGuard>();
            Camera.onPreCull += _i.OnPre;
        }

        public static void Release()
        {
            if (_i) _i._hold = false;
        }

        bool _gfxReady;

        void Update() { _gfxReady = true; }

        void OnPre(Camera cam)
        {
            if (!cam) return;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = Clear;
            if (!_gfxReady) return;
            Transform sky;
            if (!_skies.TryGetValue(cam, out sky) || !sky)
            {
                var q = GameObject.CreatePrimitive(PrimitiveType.Quad);
                Object.Destroy(q.GetComponent<Collider>());
                q.name = "NkBootSky";
                q.transform.SetParent(cam.transform, false);
                q.transform.localPosition = new Vector3(0f, 0f, 0.11f);
                q.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
                q.transform.localScale = new Vector3(24f, 14f, 1f);
                var r = q.GetComponent<Renderer>();
                r.sharedMaterial = NkGfx.Make(Clear, 1, true);
                r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                sky = q.transform;
                _skies[cam] = sky;
            }
            sky.gameObject.SetActive(_hold);
        }

        void OnDestroy()
        {
            Camera.onPreCull -= OnPre;
            if (_i == this) _i = null;
        }
    }
}
