using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

namespace NetKnight
{
    public class NkStore : MonoBehaviour
    {
        public bool open;
        public static bool AnyOpen;
        Transform _panel, _hud, _selBar, _keeper, _armL, _armR, _pupilL, _pupilR;
        TextMesh _list, _title, _hudList, _hudHint;
        int _sel;
        float _talk, _stickLatch;
        AudioSource _src;
        static readonly string[] Names =
        {
            "Rocket boost  +5% speed",
            "Seeking missile  ×1",
            "Seeking missile  ×5",
            "Bitpup",
            "Sparkat",
            "Pterling",
            "Bunzard",
            "Shelldon",
            "Foxwyrm",
            "Sharquit",
            "Gatormon"
        };
        static readonly int[] Costs = { 250, 9, 40, 14, 18, 24, 30, 38, 48, 62, 88 };
        static readonly int[] Kinds = { -10, -1, -5, 0, 1, 2, 3, 4, 5, 6, 7 };

        public static NkStore Make(Transform tube, Vector3 unused) => Make(tube);

        public string TryBuy(NetKnightGame g)
        {
            if (!open) SetOpen(true);
            else Buy(g);
            return "";
        }

        public static NkStore Make(Transform tube)
        {
            float rad = 3.4f;
            var go = new GameObject("StoreBooth");
            go.transform.SetParent(tube, false);
            go.transform.localPosition = new Vector3(rad * 0.02f, 0f, 0f);
            go.transform.localRotation = Quaternion.identity;
            var steel = new Color(0.28f, 0.3f, 0.34f);
            var dark = new Color(0.08f, 0.09f, 0.11f);
            var neon = new Color(0.2f, 1f, 0.55f);
            var frame = new GameObject("Frame").transform;
            frame.SetParent(go.transform, false);
            frame.localPosition = new Vector3(rad - 0.06f, 0f, 0f);
            NkGfx.Part(PrimitiveType.Cube, frame, new Vector3(0.06f, 0.7f, 0f), new Vector3(0.12f, 0.1f, 1.55f), steel, false, 0.4f, 0.7f, false, "top");
            NkGfx.Part(PrimitiveType.Cube, frame, new Vector3(0.06f, -0.7f, 0f), new Vector3(0.12f, 0.1f, 1.55f), steel, false, 0.4f, 0.7f, false, "bot");
            NkGfx.Part(PrimitiveType.Cube, frame, new Vector3(0.06f, 0f, 0.78f), new Vector3(0.12f, 1.5f, 0.1f), steel, false, 0.4f, 0.7f, false, "r");
            NkGfx.Part(PrimitiveType.Cube, frame, new Vector3(0.06f, 0f, -0.78f), new Vector3(0.12f, 1.5f, 0.1f), steel, false, 0.4f, 0.7f, false, "l");
            var room = new GameObject("Room").transform;
            room.SetParent(go.transform, false);
            room.localPosition = new Vector3(rad + 0.95f, 0f, 0f);
            NkGfx.Part(PrimitiveType.Cube, room, new Vector3(0.9f, 0f, 0f), new Vector3(0.08f, 1.7f, 1.7f), dark, true, 0.2f, 0f, false, "back");
            NkGfx.Part(PrimitiveType.Cube, room, new Vector3(0f, 0.85f, 0f), new Vector3(1.85f, 0.08f, 1.7f), steel, false, 0.3f, 0.4f, false, "ceil");
            NkGfx.Part(PrimitiveType.Cube, room, new Vector3(0f, -0.85f, 0f), new Vector3(1.85f, 0.08f, 1.7f), steel, false, 0.3f, 0.4f, false, "floor");
            NkGfx.Part(PrimitiveType.Cube, room, new Vector3(0f, 0f, 0.85f), new Vector3(1.85f, 1.7f, 0.08f), dark, true, 0.2f, 0f, false, "sideA");
            NkGfx.Part(PrimitiveType.Cube, room, new Vector3(0f, 0f, -0.85f), new Vector3(1.85f, 1.7f, 0.08f), dark, true, 0.2f, 0f, false, "sideB");
            NkGfx.Part(PrimitiveType.Cube, room, new Vector3(-0.2f, -0.45f, 0f), new Vector3(1.1f, 0.35f, 1.2f), new Color(0.2f, 0.14f, 0.1f), false, 0.3f, 0.1f, false, "counter");
            var lite = room.gameObject.AddComponent<Light>();
            lite.type = LightType.Point;
            lite.color = new Color(0.6f, 1f, 0.5f);
            lite.range = 4.5f;
            lite.intensity = 1.6f;

            var keeper = BuildMuppet(room);
            keeper.localPosition = new Vector3(0.15f, -0.05f, 0f);

            var pane = GameObject.CreatePrimitive(PrimitiveType.Quad);
            Object.DestroyImmediate(pane.GetComponent<Collider>());
            pane.transform.SetParent(frame, false);
            pane.transform.localPosition = new Vector3(-0.02f, 0.05f, 0f);
            pane.transform.localRotation = Quaternion.Euler(0f, -90f, 0f);
            pane.transform.localScale = new Vector3(2.02f, 1.72f, 1f);
            pane.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(new Color(0.04f, 0.07f, 0.06f, 0.82f), 0.82f, true);
            pane.SetActive(false);

            var titleGo = new GameObject("title");
            titleGo.transform.SetParent(pane.transform, false);
            titleGo.transform.localPosition = new Vector3(0f, 0.42f, -0.02f);
            titleGo.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            var title = titleGo.AddComponent<TextMesh>();
            title.anchor = TextAnchor.MiddleCenter;
            title.alignment = TextAlignment.Center;
            title.characterSize = 0.018f;
            title.fontSize = 48;
            title.color = neon;
            title.text = "TUBE MART";
            title.fontStyle = FontStyle.Bold;
            NkGfx.FlipText(title);

            var listGo = new GameObject("list");
            listGo.transform.SetParent(pane.transform, false);
            listGo.transform.localPosition = new Vector3(0f, 0.05f, -0.02f);
            listGo.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            var list = listGo.AddComponent<TextMesh>();
            list.anchor = TextAnchor.MiddleCenter;
            list.alignment = TextAlignment.Left;
            list.characterSize = 0.012f;
            list.fontSize = 36;
            list.color = new Color(0.75f, 1f, 0.8f);
            NkGfx.FlipText(list);

            var sign = new GameObject("sign").AddComponent<TextMesh>();
            sign.text = "X  TO  SHOP";
            sign.anchor = TextAnchor.MiddleCenter;
            sign.characterSize = 0.062f;
            sign.fontSize = 52;
            sign.color = new Color(0.95f, 0.78f, 0.18f);
            sign.fontStyle = FontStyle.Bold;
            sign.transform.SetParent(frame, false);
            sign.transform.localPosition = new Vector3(-0.08f, 0.98f, 0f);
            sign.transform.localRotation = Quaternion.Euler(0f, -90f, 0f);
            NkGfx.FlipText(sign);

            var st = go.AddComponent<NkStore>();
            st._panel = pane.transform;
            st._list = list;
            st._title = title;
            st._keeper = keeper;
            st._armL = keeper.Find("armL");
            st._armR = keeper.Find("armR");
            st._pupilL = keeper.Find("eyeL/pupil");
            st._pupilR = keeper.Find("eyeR/pupil");
            st._src = go.AddComponent<AudioSource>();
            st._src.spatialBlend = 1;
            st._src.playOnAwake = false;
            st.BuildCamHud();
            var col = go.AddComponent<BoxCollider>();
            col.isTrigger = true;
            col.center = new Vector3(rad - 0.2f, 0f, 0f);
            col.size = new Vector3(1.4f, 2.2f, 2.2f);
            st.Refresh();
            return st;
        }

        static Transform BuildMuppet(Transform room)
        {
            var root = new GameObject("Keeper").transform;
            root.SetParent(room, false);
            var felt = new Color(0.22f, 0.72f, 0.28f);
            var feltD = new Color(0.12f, 0.45f, 0.18f);
            var shirt = new Color(0.85f, 0.15f, 0.22f);
            NkGfx.Part(PrimitiveType.Sphere, root, new Vector3(0f, 0.22f, 0f), Vector3.one * 0.55f, felt, false, 0.55f, 0f, false, "head");
            NkGfx.Part(PrimitiveType.Sphere, root, new Vector3(0f, -0.12f, 0f), new Vector3(0.48f, 0.5f, 0.4f), shirt, false, 0.4f, 0f, false, "body");
            var nose = NkGfx.Part(PrimitiveType.Sphere, root, new Vector3(-0.22f, 0.18f, 0f), Vector3.one * 0.16f, new Color(1f, 0.45f, 0.12f), false, 0.6f, 0f, false, "nose");
            var eyeL = NkGfx.Part(PrimitiveType.Sphere, root, new Vector3(-0.18f, 0.34f, 0.12f), Vector3.one * 0.16f, Color.white, true, 0.2f, 0f, false, "eyeL");
            var eyeR = NkGfx.Part(PrimitiveType.Sphere, root, new Vector3(-0.18f, 0.34f, -0.12f), Vector3.one * 0.16f, Color.white, true, 0.2f, 0f, false, "eyeR");
            NkGfx.Part(PrimitiveType.Sphere, eyeL, Vector3.zero, Vector3.one * 0.45f, Color.black, true, 0.1f, 0f, false, "pupil");
            NkGfx.Part(PrimitiveType.Sphere, eyeR, Vector3.zero, Vector3.one * 0.45f, Color.black, true, 0.1f, 0f, false, "pupil");
            NkGfx.Part(PrimitiveType.Sphere, root, new Vector3(0.05f, 0.48f, 0f), new Vector3(0.42f, 0.18f, 0.5f), feltD, false, 0.7f, 0f, false, "hair");
            var armL = NkGfx.Part(PrimitiveType.Sphere, root, new Vector3(0.05f, 0.02f, 0.28f), new Vector3(0.14f, 0.14f, 0.42f), felt, false, 0.5f, 0f, false, "armL");
            var armR = NkGfx.Part(PrimitiveType.Sphere, root, new Vector3(0.05f, 0.02f, -0.28f), new Vector3(0.14f, 0.14f, 0.42f), felt, false, 0.5f, 0f, false, "armR");
            NkGfx.Part(PrimitiveType.Cube, root, new Vector3(-0.2f, 0.08f, 0f), new Vector3(0.12f, 0.04f, 0.22f), new Color(0.15f, 0.05f, 0.05f), false, 0.3f, 0f, false, "mouth");
            root.localRotation = Quaternion.Euler(0f, -90f, 0f);
            return root;
        }

        public bool InRange(Vector3 p) => Vector3.Distance(Window, p) < 2.8f;
        Vector3 Window => transform.TransformPoint(new Vector3(3.25f, 0f, 0f));

        void BuildCamHud()
        {
            var gold = new Color(0.83f, 0.69f, 0.22f);
            var cream = new Color(0.96f, 0.94f, 0.88f);
            var ink = new Color(0.08f, 0.08f, 0.1f);
            _hud = new GameObject("StoreHud").transform;
            void Quad(Transform parent, Vector3 p, Vector3 s, Color c, float a)
            {
                var q = GameObject.CreatePrimitive(PrimitiveType.Quad);
                Object.DestroyImmediate(q.GetComponent<Collider>());
                q.transform.SetParent(parent, false);
                q.transform.localPosition = p;
                q.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
                q.transform.localScale = s;
                q.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(c, a, true);
            }
            Quad(_hud, new Vector3(0f, 0f, 0.92f), new Vector3(0.92f, 0.78f, 1f), cream, 0.96f);
            Quad(_hud, new Vector3(0f, 0.40f, 0.918f), new Vector3(0.94f, 0.018f, 1f), gold, 1f);
            Quad(_hud, new Vector3(0f, -0.40f, 0.918f), new Vector3(0.94f, 0.018f, 1f), gold, 1f);
            Quad(_hud, new Vector3(-0.47f, 0f, 0.918f), new Vector3(0.018f, 0.82f, 1f), gold, 1f);
            Quad(_hud, new Vector3(0.47f, 0f, 0.918f), new Vector3(0.018f, 0.82f, 1f), gold, 1f);
            var titleGo = new GameObject("ht").AddComponent<TextMesh>();
            titleGo.transform.SetParent(_hud, false);
            titleGo.transform.localPosition = new Vector3(0f, 0.33f, 0.91f);
            titleGo.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            titleGo.anchor = TextAnchor.MiddleCenter;
            titleGo.alignment = TextAlignment.Center;
            titleGo.characterSize = 0.014f;
            titleGo.fontSize = 48;
            titleGo.fontStyle = FontStyle.Bold;
            titleGo.color = gold;
            titleGo.text = "TUBE MART";
            NkGfx.FlipText(titleGo);
            _hudHint = titleGo;
            var sub = new GameObject("hx").AddComponent<TextMesh>();
            sub.transform.SetParent(_hud, false);
            sub.transform.localPosition = new Vector3(0f, 0.27f, 0.91f);
            sub.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            sub.anchor = TextAnchor.MiddleCenter;
            sub.alignment = TextAlignment.Center;
            sub.characterSize = 0.009f;
            sub.fontSize = 36;
            sub.fontStyle = FontStyle.Bold;
            sub.color = ink;
            sub.text = "X TO SHOP   ·   STICK BROWSE   ·   B CLOSE";
            NkGfx.FlipText(sub);
            _selBar = new GameObject("sel").transform;
            _selBar.SetParent(_hud, false);
            Quad(_selBar, Vector3.zero, new Vector3(0.78f, 0.042f, 1f), gold, 0.35f);
            Quad(_selBar, new Vector3(-0.38f, 0f, -0.002f), new Vector3(0.012f, 0.042f, 1f), gold, 1f);
            var listGo = new GameObject("hl").AddComponent<TextMesh>();
            listGo.transform.SetParent(_hud, false);
            listGo.transform.localPosition = new Vector3(-0.02f, 0.02f, 0.908f);
            listGo.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            listGo.anchor = TextAnchor.MiddleCenter;
            listGo.alignment = TextAlignment.Left;
            listGo.characterSize = 0.0082f;
            listGo.fontSize = 36;
            listGo.color = ink;
            NkGfx.FlipText(listGo);
            _hudList = listGo;
            _hud.gameObject.SetActive(false);
        }

        void StickHud()
        {
            if (!_hud || !open) return;
            var cam = Camera.main;
            if (!cam) return;
            _hud.position = cam.transform.position;
            _hud.rotation = cam.transform.rotation;
        }

        public void Tick(float dt, NkInput inp, Vector3 head, NetKnightGame game)
        {
            if (_hud) _hud.gameObject.SetActive(false);
            if (open) SetOpen(false);
            return;
        }

        void TickDisabled(float dt, NkInput inp, Vector3 head, NetKnightGame game)
        {
            bool near = InRange(head);
            if (_keeper)
            {
                _keeper.localPosition = new Vector3(0.15f, -0.05f + Mathf.Sin(Time.unscaledTime * 2.2f) * 0.04f, 0f);
                if (_armL) _armL.localRotation = Quaternion.Euler(0f, 0f, Mathf.Sin(Time.unscaledTime * 3f) * 18f);
                if (_armR) _armR.localRotation = Quaternion.Euler(0f, 0f, -Mathf.Sin(Time.unscaledTime * 2.4f) * 18f);
            }
            if (open) StickHud();
            bool x = inp.left.primaryDown || (!inp.xrActive && Keyboard.current != null && Keyboard.current.xKey.wasPressedThisFrame);
            if (open && inp.PressedB()) { SetOpen(false); return; }
            if (!near && !open) return;
            if (!near && open) { SetOpen(false); return; }
            if (x)
            {
                if (!open) { SetOpen(true); game.Hint("Stick up/down to browse  ·  X to buy  ·  B to close"); }
                else Buy(game);
            }
            if (open)
            {
                _stickLatch -= dt;
                float sy = inp.left.valid ? inp.left.stick.y : 0f;
                if (!inp.xrActive && Keyboard.current != null)
                {
                    if (Keyboard.current.upArrowKey.wasPressedThisFrame) sy = 1f;
                    if (Keyboard.current.downArrowKey.wasPressedThisFrame) sy = -1f;
                }
                if (_stickLatch <= 0f && sy > 0.55f) { _sel = (_sel + Names.Length - 1) % Names.Length; Refresh(); _stickLatch = 0.22f; }
                if (_stickLatch <= 0f && sy < -0.55f) { _sel = (_sel + 1) % Names.Length; Refresh(); _stickLatch = 0.22f; }
            }
        }

        void OnDestroy()
        {
            if (open) AnyOpen = false;
            if (_hud) Object.Destroy(_hud.gameObject);
        }

        void SetOpen(bool v)
        {
            open = v;
            AnyOpen = v;
            if (_panel) _panel.gameObject.SetActive(false);
            if (_hud) _hud.gameObject.SetActive(v);
            if (v) { Refresh(); StickHud(); NkSfx.Shop(Window); }
        }

        void Refresh()
        {
            string sb = "";
            for (int i = 0; i < Names.Length; i++)
            {
                string mark = i == _sel ? "▶ " : "   ";
                sb += mark + Names[i] + "    " + Costs[i] + "c\n";
            }
            if (_list) _list.text = sb + "\ncoins to spend";
            if (_hudList) _hudList.text = sb;
            if (_hudHint) _hudHint.text = "TUBE MART";
            if (_selBar)
                _selBar.localPosition = new Vector3(0f, 0.155f - _sel * 0.0285f, 0.909f);
        }

        void Buy(NetKnightGame g)
        {
            int cost = Costs[_sel];
            int kind = Kinds[_sel];
            if (g.coins < cost)
            {
                g.Hint("Need " + cost + " coins.");
                NkSfx.Beep(Window);
                return;
            }
            if (kind == -10)
            {
                if (g.rocketBoosts >= 5) { g.Hint("Rocket boost maxed (5)."); return; }
                g.coins -= cost;
                g.rocketBoosts++;
                g.moveMul *= 1.05f;
                NkSfx.Boost(Window);
                g.Hint("Rocket boost " + g.rocketBoosts + "/5. Speed +5%.");
            }
            else if (kind < 0)
            {
                int n = kind == -5 ? 5 : 1;
                if (g.missiles + n > 100) { g.Hint("Missile racks full (100)."); return; }
                g.coins -= cost;
                g.missiles += n;
                g.Hint("Loaded " + n + " seeking missile" + (n > 1 ? "s" : "") + ".");
            }
            else
            {
                if (NkPet.Has(kind)) { g.Hint("You already have that pet."); return; }
                g.coins -= cost;
                NkPet.Spawn(g.player, kind);
                g.Hint(Names[_sel] + " orbits you now.");
            }
            NkSfx.Coin(Window);
        }
    }

public class NkPet : MonoBehaviour
    {
        public static readonly List<NkPet> All = new List<NkPet>();
        public int kind;
        public float power, hp, maxHp;
        public bool caged;
        Transform _follow, _body, _head, _jaw, _tail;
        Transform[] _limbs;
        float _ang, _rad, _cd, _bob;
        Transform _bar;
        static readonly bool[] Owned = new bool[8];
        static readonly string[] Names = { "Bitpup", "Sparkat", "Pterling", "Bunzard", "Shelldon", "Foxwyrm", "Sharquit", "Gatormon" };
        static readonly float[] Powers = { 50, 75, 90, 110, 130, 155, 175, 200 };
        static readonly Color[] Colors =
        {
            new Color(0.95f, 0.7f, 0.3f), new Color(1f, 0.45f, 0.15f), new Color(0.45f, 0.85f, 1f),
            new Color(1f, 0.55f, 0.75f), new Color(0.4f, 0.75f, 0.4f), new Color(1f, 0.35f, 0.2f),
            new Color(0.3f, 0.55f, 0.85f), new Color(0.25f, 0.7f, 0.28f)
        };

        public static bool Has(int kind) => kind >= 0 && kind < Owned.Length && Owned[kind];
        public static string NameOf(int kind) => Names[Mathf.Clamp(kind, 0, Names.Length - 1)];
        public static void ResetOwned()
        {
            for (int i = 0; i < Owned.Length; i++) Owned[i] = false;
        }

        public static NkPet Spawn(NkPlayer player, int kind, bool caged = false)
        {
            kind = Mathf.Clamp(kind, 0, 7);
            if (!caged && Owned[kind]) return null;
            if (!caged) Owned[kind] = true;
            var go = new GameObject(Names[kind]);
            var p = go.AddComponent<NkPet>();
            p.kind = kind;
            p.caged = caged;
            p.power = Powers[kind];
            p.maxHp = p.hp = 90f + p.power * 1.15f;
            p._follow = player && player.cam ? player.cam : (player ? player.transform : null);
            p._ang = kind * 0.8f;
            p._rad = (1.05f + kind * 0.12f) * 1.25f;
            p._bob = Random.value * 6f;
            p.Build();
            var col = go.AddComponent<SphereCollider>();
            col.radius = (0.28f + kind * 0.03f) * 0.5f;
            col.enabled = !caged;
            All.Add(p);
            return p;
        }

        public void Release(NkPlayer player)
        {
            caged = false;
            if (kind >= 0 && kind < Owned.Length) Owned[kind] = true;
            _follow = player && player.cam ? player.cam : (player ? player.transform : null);
            var col = GetComponent<SphereCollider>();
            if (col) col.enabled = true;
            transform.localScale = Vector3.one * ((0.55f + kind * 0.1f) * 0.5f);
        }

        Transform Ball(Transform parent, Vector3 loc, Vector3 sc, Color c, float smooth, float metal, string n, bool unlit = false)
        {
            return NkGfx.Part(PrimitiveType.Sphere, parent, loc, sc, c, unlit, smooth, metal, false, n);
        }

        Transform Box(Transform parent, Vector3 loc, Vector3 sc, Color c, float smooth, float metal, string n)
        {
            return NkGfx.Part(PrimitiveType.Cube, parent, loc, sc, c, false, smooth, metal, false, n);
        }

        Transform Joint(Transform parent, Vector3 loc, string n)
        {
            var t = new GameObject(n).transform;
            t.SetParent(parent, false);
            t.localPosition = loc;
            return t;
        }

        void Build()
        {
            var c = Colors[kind];
            var d = c * 0.55f;
            var hide = Color.Lerp(c, new Color(0.12f, 0.1f, 0.1f), 0.35f);
            float s = (0.55f + kind * 0.1f) * 0.5f;
            transform.localScale = Vector3.one * s;
            _body = Joint(transform, new Vector3(0f, 0.06f, 0.02f), "chest");
            Ball(_body, Vector3.zero, new Vector3(0.58f, 0.44f, 0.72f), c, 0.78f, 0.06f, "torso");
            Ball(_body, new Vector3(0f, 0.02f, 0.04f), new Vector3(0.42f, 0.28f, 0.5f), hide, 0.35f, 0.55f, "plating");
            _head = Joint(_body, new Vector3(0f, 0.16f, 0.28f), "head");
            Ball(_head, Vector3.zero, Vector3.one * 0.4f, c, 0.76f, 0.05f, "skull");
            Ball(_head, new Vector3(-0.08f, 0.06f, 0.14f), Vector3.one * 0.09f, Color.white, 0.2f, 0f, "eL", true);
            Ball(_head, new Vector3(0.08f, 0.06f, 0.14f), Vector3.one * 0.09f, Color.white, 0.2f, 0f, "eR", true);
            Ball(_head, new Vector3(-0.08f, 0.06f, 0.18f), Vector3.one * 0.04f, Color.black, 0.2f, 0f, "pL", true);
            Ball(_head, new Vector3(0.08f, 0.06f, 0.18f), Vector3.one * 0.04f, Color.black, 0.2f, 0f, "pR", true);
            _jaw = Box(_head, new Vector3(0f, -0.08f, 0.1f), new Vector3(0.22f, 0.08f, 0.2f), hide, 0.4f, 0.2f, "jaw");
            var limbs = new List<Transform>();
            if (kind == 0 || kind == 1 || kind == 3 || kind == 5)
            {
                Ball(_head, new Vector3(-0.14f, 0.16f, 0.02f), new Vector3(0.12f, 0.2f, 0.08f), d, 0.7f, 0.04f, "earL");
                Ball(_head, new Vector3(0.14f, 0.16f, 0.02f), new Vector3(0.12f, 0.2f, 0.08f), d, 0.7f, 0.04f, "earR");
            }
            if (kind == 2)
            {
                var wL = Joint(_body, new Vector3(-0.22f, 0.08f, 0f), "wingL");
                var wR = Joint(_body, new Vector3(0.22f, 0.08f, 0f), "wingR");
                Box(wL, new Vector3(-0.28f, 0f, 0f), new Vector3(0.55f, 0.05f, 0.32f), d, 0.65f, 0.08f, "sailL");
                Box(wR, new Vector3(0.28f, 0f, 0f), new Vector3(0.55f, 0.05f, 0.32f), d, 0.65f, 0.08f, "sailR");
                limbs.Add(wL); limbs.Add(wR);
            }
            if (kind == 4)
                Ball(_body, Vector3.zero, new Vector3(0.82f, 0.55f, 0.78f), d, 0.28f, 0.15f, "shell");
            if (kind == 6)
                Box(_head, new Vector3(0f, -0.02f, 0.22f), new Vector3(0.28f, 0.12f, 0.36f), d, 0.4f, 0.25f, "snout");
            if (kind == 7)
                Box(_head, new Vector3(0f, -0.04f, 0.2f), new Vector3(0.42f, 0.14f, 0.4f), d, 0.35f, 0.2f, "jaws");
            int legs = (kind == 2) ? 2 : 4;
            for (int i = 0; i < legs; i++)
            {
                float sx = (i % 2 == 0) ? -1f : 1f;
                float z = legs == 2 ? 0.05f : (i < 2 ? 0.16f : -0.16f);
                var hip = Joint(_body, new Vector3(sx * 0.16f, -0.08f, z), "hip" + i);
                Ball(hip, Vector3.zero, Vector3.one * 0.1f, hide, 0.4f, 0.55f, "hinge");
                var knee = Joint(hip, new Vector3(sx * 0.02f, -0.12f, 0f), "knee" + i);
                NkGfx.Part(PrimitiveType.Cylinder, hip, new Vector3(0f, -0.06f, 0f), new Vector3(0.07f, 0.07f, 0.07f), c, false, 0.7f, 0.08f, false, "thigh");
                NkGfx.Part(PrimitiveType.Cylinder, knee, new Vector3(0f, -0.07f, 0f), new Vector3(0.055f, 0.07f, 0.055f), hide, false, 0.45f, 0.4f, false, "shin");
                Ball(knee, new Vector3(0f, -0.14f, 0.02f), new Vector3(0.1f, 0.06f, 0.12f), d, 0.5f, 0.2f, "paw");
                limbs.Add(hip);
                limbs.Add(knee);
            }
            _tail = Joint(_body, new Vector3(0f, 0.02f, -0.32f), "tail");
            Transform tp = _tail;
            for (int i = 0; i < 4; i++)
            {
                var seg = Ball(tp, i == 0 ? Vector3.zero : new Vector3(0f, 0f, -0.09f), Vector3.one * (0.12f - i * 0.018f),
                    i % 2 == 0 ? c : hide, 0.75f, 0.08f, "tail" + i);
                tp = Joint(seg, new Vector3(0f, 0f, -0.05f), "tlink" + i);
            }
            _limbs = limbs.ToArray();
            var bar = GameObject.CreatePrimitive(PrimitiveType.Cube);
            Object.DestroyImmediate(bar.GetComponent<Collider>());
            bar.name = "hp";
            bar.transform.SetParent(transform, false);
            bar.transform.localPosition = new Vector3(0f, 0.55f, 0f);
            bar.transform.localScale = new Vector3(0.7f, 0.06f, 0.06f);
            bar.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(new Color(0.3f, 1f, 0.45f), 1, true);
            _bar = bar.transform;
        }

        void OnDestroy()
        {
            All.Remove(this);
            if (!caged && kind >= 0 && kind < Owned.Length) Owned[kind] = false;
        }

        public void Hurt(float dmg)
        {
            if (caged) return;
            hp -= dmg;
            if (hp <= 0f) Destroy(gameObject);
        }

        public void Tick(float dt, NkPlayer player, NetKnightGame game)
        {
            if (caged)
            {
                transform.Rotate(0f, 50f * dt, 0f, Space.Self);
                Wiggle(dt, Vector3.zero);
                return;
            }
            if (!_follow && player) _follow = player.cam ? player.cam : player.transform;
            if (!_follow) return;
            _ang += dt * (0.7f + kind * 0.05f);
            Vector3 orbit = Quaternion.Euler(12f, _ang * Mathf.Rad2Deg, 0f) * Vector3.forward * _rad;
            orbit.y += Mathf.Sin(Time.time * 2f + _bob) * 0.18f;
            Vector3 want = _follow.position + _follow.right * orbit.x + _follow.up * orbit.y + _follow.forward * (orbit.z * 0.35f);
            transform.position = Vector3.Lerp(transform.position, want, dt * 5f);
            var look = BestAim(game);
            Vector3 tangent = Vector3.ProjectOnPlane(want - transform.position, Vector3.up);
            if (tangent.sqrMagnitude > 0.002f)
                transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(tangent.normalized, Vector3.up), dt * 4f);
            else if (_follow)
                transform.rotation = Quaternion.Slerp(transform.rotation, _follow.rotation, dt * 2f);
            Aim360(look, dt);
            Wiggle(dt, look);
            if (_bar)
            {
                float u = Mathf.Clamp01(hp / maxHp);
                _bar.localScale = new Vector3(0.7f * u, 0.06f, 0.06f);
                _bar.LookAt(_follow.position);
            }
            _cd -= dt;
            if (_cd <= 0f && look.sqrMagnitude > 0.4f)
            {
                _cd = 1.5f + kind * 0.08f;
                Attack(look.normalized, game);
            }
        }

        void Aim360(Vector3 look, float dt)
        {
            if (!_head) return;
            Vector3 d = look.sqrMagnitude > 0.01f ? look : (_follow ? _follow.forward : transform.forward);
            if (d.sqrMagnitude < 1e-6f) return;
            Vector3 f = d.normalized;
            Vector3 up = Vector3.up;
            if (Mathf.Abs(Vector3.Dot(f, up)) > 0.96f) up = transform.right;
            _head.rotation = Quaternion.Slerp(_head.rotation, Quaternion.LookRotation(f, up), dt * 8f);
        }

        void Wiggle(float dt, Vector3 look)
        {
            float t = Time.time + _bob;
            if (_body)
            {
                float sq = 1f + Mathf.Sin(t * 5.5f) * 0.07f;
                _body.localScale = new Vector3(sq, 2f - sq, sq);
                _body.localRotation = Quaternion.Euler(Mathf.Sin(t * 3.2f) * 6f, 0f, Mathf.Sin(t * 2.4f) * 4f);
            }
            if (_jaw) _jaw.localRotation = Quaternion.Euler(Mathf.Sin(t * 7f) * 10f, 0f, 0f);
            if (_tail) _tail.localRotation = Quaternion.Euler(Mathf.Sin(t * 5f) * 14f, Mathf.Sin(t * 3.6f) * 22f, 0f);
            if (_limbs == null) return;
            for (int i = 0; i < _limbs.Length; i++)
            {
                if (!_limbs[i]) continue;
                float g = Mathf.Sin(t * 8f + i * 1.1f) * 18f;
                _limbs[i].localRotation = Quaternion.Euler(g, Mathf.Sin(t * 3f + i) * 8f, 0f);
            }
        }

        Vector3 BestAim(NetKnightGame game)
        {
            var t = NkCombat.BestEnemy(game && game.player && game.player.cam ? game.player.cam.GetComponent<Camera>() : Camera.main,
                transform.position, 22f, false, false);
            return t ? (AimOf(t) - transform.position) : Vector3.zero;
        }

        static Vector3 AimOf(Transform t)
        {
            var tr = t.GetComponent<NkTrilo>();
            if (tr) return tr.Aim;
            var c = t.GetComponent<NkCamel>();
            if (c) return c.Aim;
            return t.position;
        }

        void Attack(Vector3 dir, NetKnightGame game)
        {
            float dmg = power * 0.035f;
            Color c = Colors[kind];
            switch (kind)
            {
                case 0: Bolt(dir, dmg, 0.18f, c, 16f); break;
                case 1:
                    for (int i = -1; i <= 1; i++)
                        Arc(Quaternion.Euler(0, i * 18f, 0) * dir, dmg * 0.45f, c);
                    break;
                case 2: Bolt(dir, dmg, 0.1f, c, 22f); break;
                case 3: Ring(dmg * 0.7f, c); break;
                case 4: Spin(dmg, c); break;
                case 5: Bolt(dir, dmg, 0.12f, new Color(1f, 0.4f, 0.1f), 14f, true); break;
                case 6: Ram(dir, dmg * 1.1f, c); break;
                default: Chomp(dir, dmg * 1.2f, c); break;
            }
        }

        void Bolt(Vector3 dir, float dmg, float size, Color c, float spd, bool seek = false)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            Object.DestroyImmediate(go.GetComponent<Collider>());
            go.transform.position = transform.position + dir * 0.3f;
            go.transform.localScale = Vector3.one * size;
            go.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(c);
            go.AddComponent<NkPetShot>().Init(dir, spd, dmg, 1.4f, seek);
        }

        void Arc(Vector3 dir, float dmg, Color c)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            Object.DestroyImmediate(go.GetComponent<Collider>());
            go.transform.position = transform.position + dir * 0.4f;
            go.transform.rotation = Quaternion.LookRotation(dir);
            go.transform.localScale = new Vector3(0.06f, 0.28f, 0.7f);
            go.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(c);
            go.AddComponent<NkPetShot>().Init(dir, 18f, dmg, 0.45f, false);
        }

        void Ring(float dmg, Color c)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            Object.DestroyImmediate(go.GetComponent<Collider>());
            go.transform.position = transform.position;
            go.transform.localScale = new Vector3(0.4f, 0.02f, 0.4f);
            go.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(c);
            go.AddComponent<NkPetShot>().Init(Vector3.up, 0.1f, dmg, 0.5f, false, 7f);
        }

        void Spin(float dmg, Color c)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            Object.DestroyImmediate(go.GetComponent<Collider>());
            go.transform.position = transform.position;
            go.transform.localScale = Vector3.one * 0.55f;
            go.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(c);
            go.AddComponent<NkPetShot>().Init(transform.forward, 8f, dmg, 0.7f, false);
        }

        void Ram(Vector3 dir, float dmg, Color c)
        {
            Bolt(dir, dmg, 0.22f, c, 20f);
        }

        void Chomp(Vector3 dir, float dmg, Color c)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            Object.DestroyImmediate(go.GetComponent<Collider>());
            go.transform.position = transform.position + dir * 0.5f;
            go.transform.rotation = Quaternion.LookRotation(dir);
            go.transform.localScale = new Vector3(0.7f, 0.25f, 0.7f);
            go.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(c);
            go.AddComponent<NkPetShot>().Init(dir, 12f, dmg, 0.4f, false);
        }
    }

    public class NkPetShot : MonoBehaviour
    {
        Vector3 _dir;
        float _spd, _dmg, _life, _aoe;
        bool _seek;

        public void Init(Vector3 dir, float spd, float dmg, float life, bool seek, float aoe = 0.45f)
        {
            _dir = dir.normalized;
            _spd = spd;
            _dmg = dmg;
            _life = life;
            _seek = seek;
            _aoe = aoe;
        }

        void Update()
        {
            float dt = Time.deltaTime;
            _life -= dt;
            if (_seek)
            {
                var t = NkCombat.BestEnemy(Camera.main, transform.position, 30f, false, false);
                if (t)
                {
                    var want = (t.position - transform.position).normalized;
                    _dir = Vector3.Slerp(_dir, want, dt * 5f).normalized;
                }
            }
            transform.position += _dir * _spd * dt;
            if (_spd > 0.2f && _dir.sqrMagnitude > 0.01f) transform.rotation = Quaternion.LookRotation(_dir);
            if (_aoe > 1f) transform.localScale += Vector3.one * (dt * 8f);
            if (Physics.SphereCast(transform.position, 0.12f, _dir, out var hit, _spd * dt + 0.08f))
            {
                if (!hit.collider.GetComponentInParent<NkPlayer>() && !hit.collider.GetComponentInParent<NkPet>()
                    && !hit.collider.GetComponentInParent<NkPetCage>())
                    NkCombat.HurtAny(hit.collider.transform, _dmg, _dir, hit.point, Object.FindAnyObjectByType<NetKnightGame>());
                Destroy(gameObject);
                return;
            }
            if (_life <= 0f) Destroy(gameObject);
        }
    }

public class NkMissile : MonoBehaviour
    {
        public static readonly List<NkMissile> All = new List<NkMissile>();
        public static int InFlight => All.Count;
        Transform _target;
        Vector3 _last;
        float _fuel = 2.6f;
        const float Spd = 15.5f;
        const float Range = 28f;
        float _traveled;

        public static bool Fire(Camera cam, int side, NetKnightGame game)
        {
            if (!cam || InFlight >= 2) return false;
            Vector3 origin = cam.transform.position + cam.transform.right * (side < 0 ? -0.28f : 0.28f) + cam.transform.up * 0.12f + cam.transform.forward * 0.15f;
            var target = NkCombat.BestEnemy(cam, origin, 48f, true);
            var go = new GameObject("Missile");
            go.transform.position = origin;
            go.transform.rotation = cam.transform.rotation;
            NkGfx.Part(PrimitiveType.Cylinder, go.transform, Vector3.zero, new Vector3(0.07f, 0.16f, 0.07f),
                new Color(0.7f, 0.72f, 0.78f), false, 0.4f, 0.8f, false, "body").localRotation = Quaternion.Euler(90, 0, 0);
            NkGfx.Part(PrimitiveType.Cube, go.transform, new Vector3(0, 0, -0.12f), new Vector3(0.16f, 0.02f, 0.08f),
                new Color(0.8f, 0.15f, 0.1f), false, 0.3f, 0.2f, false, "fin");
            var flame = NkGfx.Part(PrimitiveType.Sphere, go.transform, new Vector3(0, 0, -0.2f), Vector3.one * 0.1f,
                new Color(1f, 0.45f, 0.1f), true, 0.2f, 0f, false, "jet");
            flame.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(1f, 0.4f, 0.05f, 0.9f));
            var m = go.AddComponent<NkMissile>();
            m._target = target;
            m._last = target ? target.position : origin + cam.transform.forward * 8f;
            All.Add(m);
            return true;
        }

        void OnDestroy() { All.Remove(this); }

        void Update()
        {
            float dt = Time.deltaTime;
            _fuel -= dt;
            if (_target) _last = _target.position;
            Vector3 to = _last - transform.position;
            float dist = to.magnitude;
            Vector3 dir = dist > 0.05f ? to / dist : transform.forward;
            transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(dir), dt * 7f);
            Vector3 step = transform.forward * Spd * dt;
            _traveled += step.magnitude;
            if (Physics.SphereCast(transform.position, 0.1f, transform.forward, out var hit, step.magnitude + 0.05f))
            {
                if (!hit.collider.GetComponentInParent<NkPlayer>() && !hit.collider.GetComponentInParent<NkPet>())
                {
                    var g = Object.FindAnyObjectByType<NetKnightGame>();
                    NkCombat.HurtAny(hit.collider.transform, 9.5f * (g ? g.Power : 1f), transform.forward, hit.point, g);
                    NkWeapons.Blast(hit.point, hit.normal, 6f, 1.4f, false, g, transform, 0.2f);
                }
                Destroy(gameObject);
                return;
            }
            transform.position += step;
            if (_fuel <= 0f || _traveled > Range)
            {
                var g = Object.FindAnyObjectByType<NetKnightGame>();
                NkWeapons.Blast(transform.position, -transform.forward, 6f, 1.4f, false, g, transform, 0.22f);
                NkSfx.Boom(transform.position);
                Destroy(gameObject);
            }
        }
    }
}
