using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace NetKnight
{
    public static class NkGfx
    {
        static Shader _lit, _unlit;
        static readonly Dictionary<int, Material> Cache = new Dictionary<int, Material>();

        static Shader Lit()
        {
            if (_lit) return _lit;
            _lit = Shader.Find("Universal Render Pipeline/Simple Lit")
                   ?? Shader.Find("Universal Render Pipeline/Lit")
                   ?? Unlit();
            return _lit;
        }
        static Shader Unlit()
        {
            if (_unlit) return _unlit;
            _unlit = Shader.Find("Universal Render Pipeline/Unlit")
                     ?? Shader.Find("Unlit/Color")
                     ?? Shader.Find("Sprites/Default");
            return _unlit;
        }

        public static Material Make(Color c, float a = 1f, bool unlit = false, float smooth = 0.28f, float metal = 0f)
        {
            c.a = a;
            int key = ((unlit ? 1 : 0) << 31)
                      ^ ((int)(c.r * 255) << 20) ^ ((int)(c.g * 255) << 12) ^ ((int)(c.b * 255) << 4) ^ (int)(a * 15)
                      ^ ((int)(smooth * 20f) << 8) ^ (int)(metal * 20f);
            if (Cache.TryGetValue(key, out var m) && m) return m;
            m = new Material(unlit ? Unlit() : Lit()) { name = "Nk" };
            m.color = c;
            if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", c);
            if (m.HasProperty("_Color")) m.SetColor("_Color", c);
            if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", smooth);
            if (m.HasProperty("_Metallic")) m.SetFloat("_Metallic", metal);
            if (a < 0.99f)
            {
                if (m.HasProperty("_Surface")) m.SetFloat("_Surface", 1f);
                m.SetOverrideTag("RenderType", "Transparent");
                m.SetInt("_SrcBlend", (int)BlendMode.SrcAlpha);
                m.SetInt("_DstBlend", (int)BlendMode.OneMinusSrcAlpha);
                m.SetInt("_ZWrite", 0);
                m.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
                m.renderQueue = 3000;
            }
            Cache[key] = m;
            return m;
        }

        public static Color Hex(int hex) =>
            new Color32((byte)((hex >> 16) & 255), (byte)((hex >> 8) & 255), (byte)(hex & 255), 255);

        public static Material Make(int hex, float a = 1f, bool unlit = false, float smooth = 0.28f, float metal = 0f) =>
            Make(Hex(hex), a, unlit, smooth, metal);

        public static Material Chrome(Texture tex = null)
        {
            var m = new Material(Lit()) { name = "NkChrome" };
            var c = new Color(0.82f, 0.86f, 0.92f);
            if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", c);
            m.color = c;
            if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", 0.94f);
            if (m.HasProperty("_Metallic")) m.SetFloat("_Metallic", 1f);
            if (tex)
            {
                m.mainTexture = tex;
                if (m.HasProperty("_BaseMap")) m.SetTexture("_BaseMap", tex);
            }
            return m;
        }

        public static Material Additive(Color c)
        {
            var m = new Material(Unlit());
            if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", c);
            m.color = c;
            if (m.HasProperty("_Surface")) m.SetFloat("_Surface", 1);
            m.SetInt("_SrcBlend", (int)BlendMode.SrcAlpha);
            m.SetInt("_DstBlend", (int)BlendMode.One);
            m.SetInt("_ZWrite", 0);
            m.SetInt("_Cull", (int)CullMode.Off);
            m.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
            m.renderQueue = 3200;
            return m;
        }

        public static void WireCage(Transform parent, float rad, Material mat, int segs = 18, float thick = 0.04f)
        {
            if (!parent || !mat) return;
            void Ring(Vector3 euler)
            {
                var up = Quaternion.Euler(euler) * Vector3.up;
                for (int i = 0; i < segs; i++)
                {
                    float a0 = i / (float)segs * Mathf.PI * 2f;
                    float a1 = (i + 1) / (float)segs * Mathf.PI * 2f;
                    Vector3 p0 = Quaternion.Euler(euler) * new Vector3(Mathf.Cos(a0), 0f, Mathf.Sin(a0)) * rad;
                    Vector3 p1 = Quaternion.Euler(euler) * new Vector3(Mathf.Cos(a1), 0f, Mathf.Sin(a1)) * rad;
                    var bar = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    Object.DestroyImmediate(bar.GetComponent<Collider>());
                    bar.transform.SetParent(parent, false);
                    bar.transform.localPosition = (p0 + p1) * 0.5f;
                    bar.transform.localRotation = Quaternion.LookRotation((p1 - p0).normalized, up);
                    bar.transform.localScale = new Vector3(thick, thick, Vector3.Distance(p0, p1));
                    var r = bar.GetComponent<Renderer>();
                    r.sharedMaterial = mat;
                    r.shadowCastingMode = ShadowCastingMode.Off;
                }
            }
            Ring(Vector3.zero);
            Ring(new Vector3(90f, 0f, 0f));
            Ring(new Vector3(0f, 0f, 90f));
        }

        public static Material Textured(Texture tex, Color tint, bool unlit = true, bool doubleSided = true)
        {
            var m = new Material(unlit ? Unlit() : Lit());
            m.mainTexture = tex;
            if (m.HasProperty("_BaseMap")) m.SetTexture("_BaseMap", tex);
            if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", tint);
            m.color = tint;
            m.SetFloat("_Cull", doubleSided ? (float)CullMode.Off : (float)CullMode.Back);
            m.SetInt("_Cull", doubleSided ? (int)CullMode.Off : (int)CullMode.Back);
            return m;
        }

        public static void Unmirror(TextMesh tm)
        {
            if (!tm) return;
            var s = tm.transform.localScale;
            s.x = Mathf.Abs(s.x);
            tm.transform.localScale = s;
        }

        public static void FlipText(TextMesh tm)
        {
            if (!tm) return;
            var s = tm.transform.localScale;
            if (s.x > 0f) s.x = -s.x;
            tm.transform.localScale = s;
        }

        public static void PaintSolid(Color bg)
        {
            RenderSettings.skybox = null;
            var cams = Camera.allCameras;
            for (int i = 0; i < cams.Length; i++)
            {
                var c = cams[i];
                if (!c) continue;
                c.clearFlags = CameraClearFlags.SolidColor;
                c.backgroundColor = bg;
            }
        }

        public static void FaceHud(TextMesh tm)
        {
            if (!tm) return;
            tm.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            FlipText(tm);
            var r = tm.GetComponent<Renderer>();
            if (r && r.material)
            {
                r.material.SetInt("_Cull", (int)CullMode.Back);
                r.material.SetFloat("_Cull", (float)CullMode.Back);
            }
        }

        static Mesh _hiBox;
        public static Mesh SubdivBox(int div)
        {
            if (_hiBox && div == 3) return _hiBox;
            if (div < 1) div = 1;
            var verts = new List<Vector3>();
            var tris = new List<int>();
            void Face(Vector3 n, Vector3 u, Vector3 v)
            {
                int o = verts.Count;
                for (int y = 0; y <= div; y++)
                    for (int x = 0; x <= div; x++)
                    {
                        float fx = x / (float)div * 2f - 1f;
                        float fy = y / (float)div * 2f - 1f;
                        verts.Add((n + u * fx + v * fy) * 0.5f);
                    }
                int stride = div + 1;
                for (int y = 0; y < div; y++)
                    for (int x = 0; x < div; x++)
                    {
                        int a = o + y * stride + x, b = a + 1, c = a + stride, d = c + 1;
                        tris.Add(a); tris.Add(c); tris.Add(b);
                        tris.Add(b); tris.Add(c); tris.Add(d);
                    }
            }
            Face(Vector3.forward, Vector3.right, Vector3.up);
            Face(Vector3.back, Vector3.left, Vector3.up);
            Face(Vector3.up, Vector3.right, Vector3.back);
            Face(Vector3.down, Vector3.right, Vector3.forward);
            Face(Vector3.right, Vector3.back, Vector3.up);
            Face(Vector3.left, Vector3.forward, Vector3.up);
            var m = new Mesh { name = "nkHiBox" };
            m.SetVertices(verts);
            m.SetTriangles(tris, 0);
            m.RecalculateNormals();
            m.RecalculateBounds();
            if (div == 3) _hiBox = m;
            return m;
        }

        public static Transform HiBox(Transform parent, Vector3 loc, Vector3 sc, Color c, string n)
        {
            var go = new GameObject(n);
            go.transform.SetParent(parent, false);
            go.transform.localPosition = loc;
            go.transform.localScale = sc;
            var mf = go.AddComponent<MeshFilter>();
            mf.sharedMesh = SubdivBox(3);
            var mr = go.AddComponent<MeshRenderer>();
            mr.sharedMaterial = Make(c, 1, false, 0.46f, 0.8f);
            mr.shadowCastingMode = ShadowCastingMode.Off;
            return go.transform;
        }

        public static Transform Part(PrimitiveType t, Transform parent, Vector3 loc, Vector3 sc, Color c,
            bool unlit = false, float smooth = 0.35f, float metal = 0.15f, bool collider = false, string n = "p")
        {
            var p = GameObject.CreatePrimitive(t);
            p.name = n;
            if (!collider)
            {
                var col = p.GetComponent<Collider>();
                if (col) Object.DestroyImmediate(col);
            }
            p.transform.SetParent(parent, false);
            p.transform.localPosition = loc;
            p.transform.localRotation = Quaternion.identity;
            p.transform.localScale = sc;
            p.GetComponent<Renderer>().sharedMaterial = Make(c, 1f, unlit, smooth, metal);
            p.GetComponent<Renderer>().shadowCastingMode = ShadowCastingMode.Off;
            return p.transform;
        }

        public static Transform Part(PrimitiveType t, Transform parent, Vector3 loc, Vector3 sc, Material mat,
            bool collider = false, string n = "p")
        {
            var p = GameObject.CreatePrimitive(t);
            p.name = n;
            if (!collider)
            {
                var col = p.GetComponent<Collider>();
                if (col) Object.DestroyImmediate(col);
            }
            p.transform.SetParent(parent, false);
            p.transform.localPosition = loc;
            p.transform.localScale = sc;
            p.GetComponent<Renderer>().sharedMaterial = mat;
            p.GetComponent<Renderer>().shadowCastingMode = ShadowCastingMode.Off;
            return p.transform;
        }
    }
}
