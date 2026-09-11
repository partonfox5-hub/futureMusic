using UnityEngine;
using UnityEngine.InputSystem;

namespace NetKnight
{
    public class NkSplash
    {
        public const string Url = "https://www.futuremusic.online";
        public const float Duration = 5f;
        public const float FadeIn = 2.2f;

        Camera _cam;
        NkInput _input;
        Transform _root;
        Material _dimMat, _logoMat, _glowMat;
        TextMesh _word, _link, _hint;
        Collider _hit;
        float _t, _lift = 1f;
        bool _opened;
        Color _wordC, _linkC, _hintC;
        const float Z = 1.42f;

        public static NkSplash Show(Camera cam, NkInput input)
        {
            var s = new NkSplash();
            s._cam = cam;
            s._input = input;
            s.Build();
            s.AttachCam();
            return s;
        }

        public float Age => _t;
        public void SetLift(float u) { _lift = Mathf.Clamp01(u); }

        void Build()
        {
            _root = new GameObject("FmSplash").transform;
            _dimMat = new Material(NkGfx.Make(new Color(0.02f, 0.03f, 0.08f), 1f, true));
            var sky = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            Object.DestroyImmediate(sky.GetComponent<Collider>());
            sky.name = "FmSky";
            sky.transform.SetParent(_root, false);
            sky.transform.localScale = new Vector3(28f, 28f, -28f);
            var skyR = sky.GetComponent<Renderer>();
            skyR.sharedMaterial = _dimMat;
            skyR.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            skyR.receiveShadows = false;
            var dim = GameObject.CreatePrimitive(PrimitiveType.Quad);
            Object.DestroyImmediate(dim.GetComponent<Collider>());
            dim.transform.SetParent(_root, false);
            dim.transform.localPosition = new Vector3(0f, 0f, Z + 0.18f);
            dim.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            dim.transform.localScale = new Vector3(12f, 8f, 1f);
            dim.GetComponent<Renderer>().sharedMaterial = _dimMat;
            dim.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;

            var tex = Resources.Load<Texture2D>("NkStory/fm_logo");
            _logoMat = FadeMat(new Color(1f, 1f, 1f, 0f));
            if (tex)
            {
                _logoMat.mainTexture = tex;
                if (_logoMat.HasProperty("_BaseMap")) _logoMat.SetTexture("_BaseMap", tex);
            }
            var logo = GameObject.CreatePrimitive(PrimitiveType.Quad);
            logo.name = "FmLogo";
            logo.transform.SetParent(_root, false);
            logo.transform.localPosition = new Vector3(0f, 0.12f, Z);
            logo.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            logo.transform.localScale = new Vector3(0.38f, 0.38f, 1f);
            logo.GetComponent<Renderer>().sharedMaterial = _logoMat;
            logo.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            var box = logo.AddComponent<BoxCollider>();
            box.size = new Vector3(1.15f, 1.85f, 0.08f);
            box.center = new Vector3(0f, -0.55f, 0f);
            _hit = box;

            _glowMat = FadeMat(new Color(1f, 0.82f, 0.22f, 0f));
            var ring = GameObject.CreatePrimitive(PrimitiveType.Quad);
            Object.DestroyImmediate(ring.GetComponent<Collider>());
            ring.transform.SetParent(logo.transform, false);
            ring.transform.localPosition = new Vector3(0f, 0f, -0.012f);
            ring.transform.localScale = new Vector3(1.12f, 1.12f, 1f);
            ring.GetComponent<Renderer>().sharedMaterial = _glowMat;
            ring.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;

            _word = Label(_root, new Vector3(0f, -0.14f, Z - 0.01f), 0.010f, 48,
                new Color(1f, 0.86f, 0.28f, 0f), "www.futuremusic.online");
            _wordC = _word.color;
            _link = Label(_root, new Vector3(0f, -0.22f, Z - 0.01f), 0.0084f, 42,
                new Color(0.55f, 0.92f, 1f, 0f), "www.futuremusic.online");
            _linkC = _link.color;
            _hint = Label(_root, new Vector3(0f, -0.32f, Z - 0.01f), 0.0072f, 36,
                new Color(0.85f, 0.8f, 0.55f, 0f), "website  ·  point and trigger to open");
            _hintC = _hint.color;
            FollowCam();
        }

        static TextMesh Label(Transform parent, Vector3 loc, float size, int font, Color c, string text)
        {
            var tm = new GameObject(text).AddComponent<TextMesh>();
            tm.transform.SetParent(parent, false);
            tm.transform.localPosition = loc;
            tm.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            tm.anchor = TextAnchor.MiddleCenter;
            tm.alignment = TextAlignment.Center;
            tm.characterSize = size;
            tm.fontSize = font;
            tm.fontStyle = FontStyle.Bold;
            tm.color = c;
            tm.text = text;
            NkGfx.FlipText(tm);
            return tm;
        }

        static Material FadeMat(Color c)
        {
            var src = NkGfx.Make(new Color(c.r, c.g, c.b, 1f), 1f, true);
            var m = new Material(src);
            if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", c);
            m.color = c;
            if (c.a < 0.99f)
            {
                if (m.HasProperty("_Surface")) m.SetFloat("_Surface", 1f);
                m.SetOverrideTag("RenderType", "Transparent");
                m.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
                m.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
                m.SetInt("_ZWrite", 0);
                m.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
                m.renderQueue = 3200;
            }
            return m;
        }

        public void Tick(float dt)
        {
            _t += dt;
            FollowCam();
            float vis = Mathf.Clamp01(_t / FadeIn) * _lift;
            SetA(_logoMat, vis);
            SetA(_glowMat, vis * (0.12f + 0.1f * Mathf.Abs(Mathf.Sin(Time.unscaledTime * 2.4f))));
            SetA(_dimMat, 0.92f * _lift);
            if (_word) { var c = _wordC; c.a = vis; _word.color = c; }
            if (_link)
            {
                var c = _linkC;
                c.a = vis * (0.65f + 0.35f * Mathf.Abs(Mathf.Sin(Time.unscaledTime * 3.2f)));
                _link.color = c;
            }
            if (_hint) { var c = _hintC; c.a = vis * 0.85f; _hint.color = c; }
            PollClick();
        }

        void AttachCam()
        {
            if (!_root || !_cam) return;
            _root.SetParent(_cam.transform, false);
            _root.localPosition = Vector3.zero;
            _root.localRotation = Quaternion.identity;
            _root.localScale = Vector3.one;
        }

        void FollowCam()
        {
            if (!_root || !_cam) return;
            if (_root.parent != _cam.transform) AttachCam();
            else
            {
                _root.localPosition = Vector3.zero;
                _root.localRotation = Quaternion.identity;
            }
        }

        static void SetA(Material m, float a)
        {
            if (!m) return;
            var c = m.HasProperty("_BaseColor") ? m.GetColor("_BaseColor") : m.color;
            c.a = Mathf.Clamp01(a);
            if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", c);
            m.color = c;
        }

        void PollClick()
        {
            if (_opened || _cam == null || _t < 0.35f) return;
            bool look = false;
            Vector3 logo = _root.TransformPoint(new Vector3(0f, 0.05f, Z));
            Vector3 to = logo - _cam.transform.position;
            if (to.sqrMagnitude > 0.01f && Vector3.Dot(_cam.transform.forward, to.normalized) > 0.88f)
                look = true;
            if (_input != null && _input.right.valid)
            {
                Vector3 o = _cam.transform.position;
                Vector3 d = _cam.transform.rotation * _input.right.dir;
                if (_input.xrActive)
                {
                    o = _cam.transform.position + _cam.transform.rotation * (_input.right.pos - _input.headPos);
                    d = _cam.transform.rotation * _input.right.dir;
                }
                if (Physics.Raycast(o, d, out var hit, 3.5f) && hit.collider == _hit)
                    look = true;
            }
            if (!look) return;
            bool click = false;
            if (_input != null && (_input.right.triggerDown || _input.left.triggerDown || _input.right.primaryDown))
                click = true;
            var m = Mouse.current;
            if (m != null && m.leftButton.wasPressedThisFrame) click = true;
            if (!click) return;
            OpenSite();
        }

        void OpenSite()
        {
            if (_opened) return;
            _opened = true;
            Application.OpenURL(Url);
            if (_hint) _hint.text = "opening  www.futuremusic.online";
            NkSfx.Ui(_cam ? _cam.transform.position : Vector3.zero);
        }

        public void Dispose()
        {
            if (_root) Object.Destroy(_root.gameObject);
            _root = null;
            _cam = null;
            _hit = null;
        }
    }
}
