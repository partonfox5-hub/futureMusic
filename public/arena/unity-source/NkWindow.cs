using System.Collections.Generic;
using UnityEngine;

namespace NetKnight
{
    public enum NkTvKind { Crowd, Forest, City, Boats, Traffic }

    public class NkWindow : MonoBehaviour
    {
        public static readonly List<NkWindow> All = new List<NkWindow>();
        public float hp = 42f;
        Texture2D _tex;
        Color[] _pix;
        int _w = 48, _h = 32;
        float _tick, _honk, _flash;
        NkTvKind _kind;
        bool _mono, _cracked, _flee;
        Transform _pane;
        Material _paneMat;
        Vector3 _hullC;
        float _hullR;
        bool _fromOut;
        Collider _col;
        struct Guy
        {
            public float x, y, vx, vy;
            public int pal;
            public float wave, flee;
        }
        Guy[] _guys;

        public static void Scatter(NkWorld world)
        {
            if (world == null) return;
            foreach (var s in world.spheres)
            {
                if (s == null) continue;
                int n = s.hub ? 7 : 4;
                for (int i = 0; i < n; i++)
                {
                    Vector3 dir = Random.onUnitSphere;
                    Vector3 pos = s.c + dir * (s.r * 0.993f);
                    Make(pos, Quaternion.LookRotation(-dir), Random.Range(1.15f, 1.85f), s.c, s.r);
                }
            }
            foreach (var t in world.tubes)
            {
                if (!t) continue;
                int n = Random.Range(2, 5);
                for (int i = 0; i < n; i++)
                {
                    float along = Random.Range(-0.35f, 0.35f);
                    float ang = Random.Range(0f, 360f) * Mathf.Deg2Rad;
                    Vector3 local = new Vector3(Mathf.Cos(ang) * (NkWorld.TubeRad * 0.985f), along * 18f, Mathf.Sin(ang) * (NkWorld.TubeRad * 0.985f));
                    Vector3 pos = t.TransformPoint(local);
                    Vector3 inward = (t.TransformPoint(new Vector3(0f, local.y, 0f)) - pos).normalized;
                    if (inward.sqrMagnitude < 0.01f) inward = -t.TransformDirection(local);
                    Make(pos, Quaternion.LookRotation(inward), Random.Range(0.9f, 1.4f));
                }
            }
        }

        public static NkWindow Make(Vector3 pos, Quaternion rot, float scale, Vector3 hullC = default, float hullR = 0f)
        {
            var go = new GameObject("DigitWindow");
            go.transform.position = pos;
            go.transform.rotation = rot;
            NkGfx.Part(PrimitiveType.Cube, go.transform, Vector3.zero, new Vector3(scale * 1.08f, scale * 0.78f, 0.06f),
                new Color(0.12f, 0.14f, 0.18f), false, 0.3f, 0.7f, false, "frame");
            var pane = GameObject.CreatePrimitive(PrimitiveType.Quad);
            Object.DestroyImmediate(pane.GetComponent<Collider>());
            pane.transform.SetParent(go.transform, false);
            pane.transform.localPosition = new Vector3(0f, 0f, 0.042f);
            pane.transform.localScale = new Vector3(scale, scale * 0.68f, 1f);
            var box = go.AddComponent<BoxCollider>();
            box.size = new Vector3(scale * 1.08f, scale * 0.78f, 0.12f);
            var w = go.AddComponent<NkWindow>();
            w._pane = pane.transform;
            w._kind = PickKind();
            w._hullC = hullC;
            w._hullR = hullR;
            w._col = box;
            w.BuildTex();
            w._paneMat = NkGfx.Textured(w._tex, Color.white, true, true);
            pane.GetComponent<Renderer>().sharedMaterial = w._paneMat;
            pane.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            All.Add(w);
            return w;
        }

        static NkTvKind PickKind()
        {
            float u = Random.value;
            if (u < 0.38f) return NkTvKind.Crowd;
            if (u < 0.53f) return NkTvKind.Forest;
            if (u < 0.68f) return NkTvKind.City;
            if (u < 0.83f) return NkTvKind.Boats;
            return NkTvKind.Traffic;
        }

        void BuildTex()
        {
            _tex = new Texture2D(_w, _h, TextureFormat.RGBA32, false);
            _tex.filterMode = FilterMode.Point;
            _tex.wrapMode = TextureWrapMode.Clamp;
            _pix = new Color[_w * _h];
            int n = _kind == NkTvKind.Traffic ? Random.Range(5, 9)
                : _kind == NkTvKind.Boats ? Random.Range(2, 5)
                : _kind == NkTvKind.Crowd ? Random.Range(2, 5)
                : Random.Range(3, 7);
            _guys = new Guy[n];
            for (int i = 0; i < n; i++)
            {
                _guys[i] = new Guy
                {
                    x = Random.Range(4f, _w - 5f),
                    y = _kind == NkTvKind.Boats ? Random.Range(8f, 14f) : (6f + (i % 3) * 3f),
                    vx = Random.Range(-0.45f, 0.45f),
                    pal = Random.Range(0, 5)
                };
            }
        }

        void OnDestroy() { All.Remove(this); }

        void LateUpdate()
        {
            if (_cracked) return;
            if (!_col) _col = GetComponent<Collider>();
            if (_col && _hullR > 0.5f)
                _col.enabled = NkOutsidePass.SolidFromInside(_hullC, _hullR, ref _fromOut);
        }

        public static void Scare(Vector3 p)
        {
            foreach (var w in All)
                if (w && !w._cracked && (w.transform.position - p).sqrMagnitude < 100f) w._flee = true;
        }

        public static void Threat(Vector3 p, Vector3 vel)
        {
            if (vel.sqrMagnitude < 0.04f) return;
            Vector3 n = vel.normalized;
            foreach (var w in All)
            {
                if (!w || w._cracked) continue;
                Vector3 to = w.transform.position - p;
                float d2 = to.sqrMagnitude;
                if (d2 < 1f || d2 > 420f) continue;
                if (Vector3.Dot(n, to.normalized) > 0.52f) w._flee = true;
            }
        }

        public bool Hit(float dmg, Vector3 at, Vector3 dir)
        {
            if (_cracked) return true;
            hp -= dmg;
            if (hp > 0f) return false;
            Crack();
            return true;
        }

        void Crack()
        {
            _cracked = true;
            _flee = false;
            var col = GetComponent<Collider>();
            if (col) col.enabled = false;
        }

        public void Tick(Vector3 player)
        {
            float d = Vector3.Distance(transform.position, player);
            bool near = d < 14f;
            _tick += Time.deltaTime;
            _flash += Time.deltaTime;
            if (_kind == NkTvKind.City && _flash > 0.85f) { _flash = 0f; _mono = !_mono; }
            if (_kind == NkTvKind.Traffic && near && !_cracked)
            {
                _honk -= Time.deltaTime;
                if (_honk <= 0f)
                {
                    _honk = Random.Range(1.1f, 2.4f);
                    NkSfx.Honk(transform.position);
                }
            }
            if (_tick < 0.09f) return;
            _tick = 0f;
            if (_cracked) { DrawStatic(); return; }
            if (_flee) { for (int i = 0; i < _guys.Length; i++) _guys[i].flee = 1.4f; _flee = false; }
            switch (_kind)
            {
                case NkTvKind.Forest: DrawForest(); break;
                case NkTvKind.City: DrawCity(); break;
                case NkTvKind.Boats: DrawBoats(near); break;
                case NkTvKind.Traffic: DrawTraffic(near); break;
                default: DrawCrowd(near); break;
            }
            _tex.SetPixels(_pix);
            _tex.Apply(false, false);
        }

        void DrawStatic()
        {
            for (int i = 0; i < _pix.Length; i++)
            {
                float n = Random.value;
                _pix[i] = n > 0.92f ? Color.white : new Color(n * 0.18f, n * 0.18f, n * 0.2f);
            }
            for (int k = 0; k < 7; k++)
            {
                int x0 = Random.Range(2, _w - 4), y0 = Random.Range(2, _h - 4);
                int x1 = x0 + Random.Range(-10, 11), y1 = y0 + Random.Range(-8, 9);
                Line(x0, y0, x1, y1, new Color(0.55f, 0.55f, 0.6f));
            }
            _tex.SetPixels(_pix);
            _tex.Apply(false, false);
        }

        void DrawCrowd(bool near)
        {
            var bg = new Color(0.05f, 0.18f, 0.16f);
            var glow = new Color(0.2f, 0.85f, 0.55f);
            for (int i = 0; i < _pix.Length; i++) _pix[i] = bg;
            for (int x = 0; x < _w; x++) { Plot(x, 3, glow * 0.45f); Plot(x, 4, new Color(0.08f, 0.12f, 0.1f)); }
            StepGuys(near, 2f, _h - 4f);
            for (int i = 0; i < _guys.Length; i++) DrawPerson(_guys[i], near && _guys[i].flee <= 0f);
        }

        void DrawForest()
        {
            var sky = new Color(0.18f, 0.38f, 0.22f);
            var leaf = new Color(0.12f, 0.42f, 0.14f);
            var trunk = new Color(0.28f, 0.16f, 0.07f);
            for (int i = 0; i < _pix.Length; i++) _pix[i] = sky;
            for (int x = 0; x < _w; x++)
                for (int y = 0; y < 7; y++)
                    Plot(x, y, new Color(0.08f, 0.22f, 0.08f));
            int[] xs = { 6, 14, 22, 30, 38, 44 };
            for (int t = 0; t < xs.Length; t++)
            {
                int x = xs[t];
                for (int y = 6; y < 16; y++) Plot(x, y, trunk);
                for (int k = 0; k < 18; k++)
                    Plot(x + Random.Range(-4, 5), 16 + Random.Range(0, 10), leaf);
            }
            StepGuys(true, 6f, 12f);
            for (int i = 0; i < _guys.Length; i++)
            {
                var g = _guys[i];
                Color c = g.flee > 0f ? new Color(0.95f, 0.85f, 0.4f) : new Color(0.7f, 0.55f, 0.25f);
                Plot(Mathf.RoundToInt(g.x), Mathf.RoundToInt(g.y), c);
                Plot(Mathf.RoundToInt(g.x), Mathf.RoundToInt(g.y) + 1, c);
            }
        }

        void DrawCity()
        {
            var night = _mono ? new Color(0.08f, 0.08f, 0.09f) : new Color(0.08f, 0.05f, 0.18f);
            var bld = _mono ? new Color(0.28f, 0.28f, 0.3f) : new Color(0.25f, 0.12f, 0.45f);
            var win = _mono ? new Color(0.85f, 0.85f, 0.8f) : new Color(1f, 0.85f, 0.25f);
            for (int i = 0; i < _pix.Length; i++) _pix[i] = night;
            for (int b = 0; b < 8; b++)
            {
                int x0 = 2 + b * 6, w = 4, h = 8 + (b * 3) % 14;
                for (int x = x0; x < x0 + w && x < _w; x++)
                    for (int y = 0; y < h && y < _h; y++)
                    {
                        Plot(x, y, bld);
                        if ((x + y + (_mono ? 0 : 1)) % 3 == 0 && y > 2) Plot(x, y, win);
                    }
            }
            StepGuys(true, 1f, 8f);
            for (int i = 0; i < _guys.Length; i++)
                Plot(Mathf.RoundToInt(_guys[i].x), Mathf.RoundToInt(_guys[i].y), _mono ? Color.white : new Color(1f, 0.4f, 0.7f));
        }

        void DrawBoats(bool near)
        {
            var water = new Color(0.05f, 0.18f, 0.42f);
            var foam = new Color(0.45f, 0.75f, 0.95f);
            for (int i = 0; i < _pix.Length; i++) _pix[i] = water;
            int tide = Mathf.RoundToInt(Mathf.Sin(Time.time * 1.4f) * 2f);
            for (int x = 0; x < _w; x++)
                Plot(x, 10 + ((x + tide) % 5 == 0 ? 1 : 0), foam * 0.6f);
            for (int y = 0; y < 9; y++)
                for (int x = 0; x < _w; x++)
                    Plot(x, y, Color.Lerp(water, foam, 0.12f + 0.05f * Mathf.Sin(x * 0.4f + Time.time)));
            StepGuys(near, 8f, 16f);
            for (int i = 0; i < _guys.Length; i++)
            {
                int x = Mathf.RoundToInt(_guys[i].x), y = Mathf.RoundToInt(_guys[i].y);
                var hull = new Color(0.7f, 0.35f, 0.15f);
                Plot(x, y, hull); Plot(x - 1, y, hull); Plot(x + 1, y, hull); Plot(x + 2, y, hull);
                Plot(x, y + 1, Color.white); Plot(x + 1, y + 2, new Color(0.9f, 0.9f, 0.85f));
            }
        }

        void DrawTraffic(bool near)
        {
            var road = new Color(0.12f, 0.12f, 0.13f);
            var line = new Color(0.95f, 0.85f, 0.2f);
            for (int i = 0; i < _pix.Length; i++) _pix[i] = road;
            for (int x = 0; x < _w; x++)
            {
                Plot(x, 10, line); Plot(x, 20, line);
                if ((x / 3) % 2 == 0) { Plot(x, 15, Color.white); Plot(x, 5, Color.white); }
            }
            StepGuys(near, 3f, _h - 4f);
            Color[] cars = { new Color(0.9f, 0.15f, 0.12f), new Color(0.2f, 0.45f, 1f), new Color(0.95f, 0.85f, 0.15f), new Color(0.2f, 0.8f, 0.35f), new Color(0.85f, 0.85f, 0.88f) };
            for (int i = 0; i < _guys.Length; i++)
            {
                int x = Mathf.RoundToInt(_guys[i].x), y = Mathf.RoundToInt(_guys[i].y);
                Color c = cars[_guys[i].pal % cars.Length];
                Plot(x, y, c); Plot(x + 1, y, c); Plot(x + 2, y, c);
                Plot(x, y + 1, c); Plot(x + 1, y + 1, Color.cyan * 0.5f); Plot(x + 2, y + 1, c);
            }
        }

        void StepGuys(bool near, float yMin, float yMax)
        {
            for (int i = 0; i < _guys.Length; i++)
            {
                var g = _guys[i];
                g.flee = Mathf.Max(0f, g.flee - 0.09f);
                if (g.flee > 0f)
                {
                    g.vx = g.x < _w * 0.5f ? -1.8f : 1.8f;
                    g.vy = Random.Range(-0.4f, 0.5f);
                }
                else
                {
                    if (Random.value < 0.05f) g.vx = Random.Range(-0.45f, 0.45f);
                    g.vy *= 0.7f;
                }
                g.x += g.vx;
                g.y += g.vy;
                if (g.x < 2f) { g.x = 2f; g.vx = Mathf.Abs(g.vx); }
                if (g.x > _w - 4f) { g.x = _w - 4f; g.vx = -Mathf.Abs(g.vx); }
                g.y = Mathf.Clamp(g.y, yMin, yMax);
                _guys[i] = g;
            }
        }

        void DrawPerson(Guy g, bool wave)
        {
            Color[] pal =
            {
                new Color(1f, 0.82f, 0.55f), new Color(0.95f, 0.55f, 0.4f), new Color(0.4f, 0.7f, 1f),
                new Color(0.7f, 0.95f, 0.45f), new Color(0.9f, 0.45f, 0.85f)
            };
            Color skin = pal[g.pal % pal.Length];
            Color shirt = pal[(g.pal + 2) % pal.Length] * 0.8f;
            int x = Mathf.RoundToInt(g.x), y = Mathf.RoundToInt(g.y);
            Plot(x, y + 6, skin); Plot(x - 1, y + 6, skin); Plot(x + 1, y + 6, skin);
            Plot(x - 1, y + 7, Color.black); Plot(x + 1, y + 7, Color.black);
            Plot(x, y + 4, shirt); Plot(x, y + 5, shirt); Plot(x - 1, y + 4, shirt); Plot(x + 1, y + 4, shirt);
            Plot(x, y + 2, new Color(0.15f, 0.18f, 0.35f)); Plot(x, y + 3, new Color(0.15f, 0.18f, 0.35f));
            Plot(x - 1, y + 1, new Color(0.2f, 0.15f, 0.12f)); Plot(x + 1, y + 1, new Color(0.2f, 0.15f, 0.12f));
            int arm = wave ? y + 8 : y + 4;
            Plot(x - 2, arm, skin); Plot(x + 2, wave ? y + 8 : y + 4, skin);
            if (wave) { Plot(x - 2, y + 9, skin); Plot(x + 2, y + 9, skin); }
        }

        void Line(int x0, int y0, int x1, int y1, Color c)
        {
            int n = Mathf.Max(Mathf.Abs(x1 - x0), Mathf.Abs(y1 - y0), 1);
            for (int i = 0; i <= n; i++)
            {
                float u = i / (float)n;
                Plot(Mathf.RoundToInt(Mathf.Lerp(x0, x1, u)), Mathf.RoundToInt(Mathf.Lerp(y0, y1, u)), c);
            }
        }

        void Plot(int x, int y, Color c)
        {
            if ((uint)x >= (uint)_w || (uint)y >= (uint)_h) return;
            _pix[y * _w + x] = c;
        }
    }
}
