using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace NetKnight
{
    public class NkScroll : MonoBehaviour
    {
        void Update()
        {
            var r = GetComponent<Renderer>();
            if (r && r.material) r.material.mainTextureOffset += new Vector2(Time.deltaTime * 0.07f, Time.deltaTime * 0.02f);
        }
    }

    public class NkZone
    {
        public Transform root;
        public Vector3 c;
        public float keep;
        public bool always;
    }

    [System.Serializable]
    public class NkSphere
    {
        public Vector3 c;
        public float r;
        public Transform t;
        public Mesh mesh;
        public MeshFilter mf;
        public MeshCollider col;
        public MeshFilter innerMf;
        public Renderer innerRend;
        public NkHatch hatch;
        public bool hub;
        public readonly List<Transform> rifts = new List<Transform>();
        public readonly List<Vector3> holeDirs = new List<Vector3>();
        public readonly List<float> holeSin = new List<float>();
    }

    public class NkHatch : MonoBehaviour
    {
        public float hp = 18f;
        public bool blown;
        public NkSphere sphere;
        public float rad = 1.6f;
        GameObject _lid, _outer;
        Transform _wheel;

        public static float SizeOf(NkSphere s) => Mathf.Max(1.25f, s.r * Mathf.Sin(8f * Mathf.Deg2Rad) * 0.82f);

        public static NkHatch Make(NkSphere s, bool top)
        {
            Vector3 pole = top ? Vector3.up : Vector3.down;
            Vector3 pos = s.c + pole * (s.r * 0.995f);
            var go = new GameObject(top ? "HatchTop" : "HatchBot");
            if (s.t) go.transform.SetParent(s.t, true);
            go.transform.position = pos;
            go.transform.rotation = Quaternion.FromToRotation(Vector3.up, pole);
            float rad = SizeOf(s);
            var steel = new Color(0.55f, 0.57f, 0.6f);
            var dark = new Color(0.18f, 0.19f, 0.22f);
            var rust = new Color(0.32f, 0.22f, 0.16f);

            var rim = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            Object.DestroyImmediate(rim.GetComponent<Collider>());
            rim.transform.SetParent(go.transform, false);
            rim.transform.localScale = new Vector3(rad * 2.35f, 0.07f, rad * 2.35f);
            rim.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(steel, 1, false, 0.35f, 0.88f);

            var lip = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            Object.DestroyImmediate(lip.GetComponent<Collider>());
            lip.transform.SetParent(go.transform, false);
            lip.transform.localPosition = new Vector3(0f, -0.04f, 0f);
            lip.transform.localScale = new Vector3(rad * 2.12f, 0.035f, rad * 2.12f);
            lip.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(dark, 1, false, 0.5f, 0.7f);

            var lid = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            lid.name = "Lid";
            lid.transform.SetParent(go.transform, false);
            lid.transform.localPosition = new Vector3(0f, -0.06f, 0f);
            lid.transform.localScale = new Vector3(rad * 1.95f, 0.055f, rad * 1.95f);
            lid.GetComponent<Renderer>().sharedMaterial = NkGfx.Chrome();

            var outer = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            outer.name = "OuterPlate";
            outer.transform.SetParent(go.transform, false);
            outer.transform.localPosition = new Vector3(0f, 0.05f, 0f);
            outer.transform.localScale = new Vector3(rad * 1.88f, 0.04f, rad * 1.88f);
            outer.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(steel, 1, false, 0.4f, 0.9f);

            for (int i = 0; i < 8; i++)
            {
                float a = i / 8f * Mathf.PI * 2f;
                var bolt = GameObject.CreatePrimitive(PrimitiveType.Cube);
                Object.DestroyImmediate(bolt.GetComponent<Collider>());
                bolt.transform.SetParent(go.transform, false);
                bolt.transform.localPosition = new Vector3(Mathf.Cos(a) * rad * 0.98f, 0.09f, Mathf.Sin(a) * rad * 0.98f);
                bolt.transform.localScale = new Vector3(0.09f, 0.06f, 0.09f);
                bolt.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(dark, 1, false, 0.3f, 0.9f);
            }

            var wheel = new GameObject("Wheel").transform;
            wheel.SetParent(go.transform, false);
            wheel.localPosition = new Vector3(0f, 0.14f, 0f);
            float wr = rad * 0.46f;
            var hub = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            Object.DestroyImmediate(hub.GetComponent<Collider>());
            hub.transform.SetParent(wheel, false);
            hub.transform.localScale = new Vector3(wr * 0.42f, 0.045f, wr * 0.42f);
            hub.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(rust, 1, false, 0.45f, 0.7f);
            var rimW = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            Object.DestroyImmediate(rimW.GetComponent<Collider>());
            rimW.transform.SetParent(wheel, false);
            rimW.transform.localScale = new Vector3(wr * 2f, 0.028f, wr * 2f);
            rimW.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(steel, 1, false, 0.4f, 0.85f);
            var rimIn = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            Object.DestroyImmediate(rimIn.GetComponent<Collider>());
            rimIn.transform.SetParent(wheel, false);
            rimIn.transform.localPosition = new Vector3(0f, 0.01f, 0f);
            rimIn.transform.localScale = new Vector3(wr * 1.72f, 0.02f, wr * 1.72f);
            rimIn.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(dark, 1, false, 0.5f, 0.6f);
            for (int i = 0; i < 6; i++)
            {
                float a = i / 6f * 180f;
                var spoke = GameObject.CreatePrimitive(PrimitiveType.Cube);
                Object.DestroyImmediate(spoke.GetComponent<Collider>());
                spoke.transform.SetParent(wheel, false);
                spoke.transform.localRotation = Quaternion.Euler(0f, a, 0f);
                spoke.transform.localScale = new Vector3(wr * 1.85f, 0.04f, 0.07f);
                spoke.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(rust, 1, false, 0.4f, 0.65f);
            }

            var h = go.AddComponent<NkHatch>();
            h._lid = lid;
            h._outer = outer;
            h._wheel = wheel;
            h.sphere = s;
            h.rad = rad;
            s.hatch = h;
            return h;
        }

        public bool Hit(float dmg, Vector3 at, Vector3 dir)
        {
            if (blown) return true;
            hp -= dmg;
            if (_lid)
            {
                _lid.transform.localPosition += dir.normalized * 0.01f;
                _lid.transform.Rotate(dir.normalized * 2.2f, Space.World);
            }
            if (_wheel) _wheel.Rotate(0f, 22f, 0f, Space.Self);
            if (hp > 0) return false;
            Blow(at);
            return true;
        }

        void Blow(Vector3 at)
        {
            if (blown) return;
            blown = true;
            var boom = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            Object.DestroyImmediate(boom.GetComponent<Collider>());
            boom.transform.position = at;
            boom.transform.localScale = Vector3.one * 1.6f;
            boom.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(1f, 0.45f, 0.15f, 0.9f));
            Object.Destroy(boom, 0.35f);
            if (_lid) Object.Destroy(_lid);
            if (_outer) Object.Destroy(_outer);
            if (_wheel) Object.Destroy(_wheel.gameObject);
            var glow = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            Object.DestroyImmediate(glow.GetComponent<Collider>());
            glow.transform.SetParent(transform, false);
            glow.transform.localPosition = new Vector3(0f, -0.02f, 0f);
            glow.transform.localScale = new Vector3(rad * 1.7f, 0.025f, rad * 1.7f);
            glow.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(1f, 0.2f, 0.05f, 0.7f));
            var game = Object.FindAnyObjectByType<NetKnightGame>();
            if (game) game.Hint("Hatch blown — a hole spills into the outside.");
        }
    }

    public class NkWorld
    {
        public readonly List<NkSphere> spheres = new List<NkSphere>();
        public readonly List<Transform> tubes = new List<Transform>();
        public readonly List<NkStore> stores = new List<NkStore>();
        public readonly List<NkHydraNest> hydras = new List<NkHydraNest>();
        public readonly List<NkZone> zones = new List<NkZone>();
        public NkScoreboard scoreboard;
        Texture2D banner, wall;
        public const float TubeRad = 3.4f;
        class NkScorch
        {
            public NkSphere sph;
            public Vector3 dir;
            public int hits;
            public Transform vis;
        }
        readonly List<NkScorch> _scorches = new List<NkScorch>();
        class NkTubeBurn
        {
            public Transform tube;
            public Vector3 local;
            public int hits;
            public Transform vis;
        }
        readonly List<NkTubeBurn> _tubeBurns = new List<NkTubeBurn>();
        readonly List<Transform> _holedTubes = new List<Transform>();
        readonly List<Vector3> _tubeHoleLocal = new List<Vector3>();

        public void Build(Transform root)
        {
            banner = NkTex.Banner();
            wall = NkTex.Wall();
            var crop = NkTex.Crop();
            Physics.gravity = Vector3.zero;
            Physics.defaultSolverIterations = 12;
            Physics.defaultSolverVelocityIterations = 8;

            AddSphere(root, Vector3.zero, 45f, true);
            AddSphere(root, new Vector3(0f, 8f, 100f), 30f);
            AddSphere(root, new Vector3(82f, 20f, 38f), 31.25f);
            AddSphere(root, new Vector3(-76f, -24f, 48f), 30f);
            AddSphere(root, new Vector3(48f, -28f, 118f), 27.5f);
            AddSphere(root, new Vector3(-55f, 42f, 95f), 28.75f);
            AddSphere(root, new Vector3(98f, -12f, -40f), 30f);
            AddSphere(root, new Vector3(-18f, 22f, -92f), 27.5f);

            Connect(root, 0, 1, true);
            Connect(root, 0, 2, true);
            Connect(root, 0, 3, true);
            Connect(root, 0, 6, false);
            Connect(root, 0, 7, false);
            Connect(root, 1, 4, false);
            Connect(root, 1, 5, true);
            Connect(root, 2, 4, false);
            Connect(root, 3, 5, false);
            Connect(root, 6, 7, false);
            Connect(root, 2, 6, false);

            BranchChamber(root, 0, 1);
            BranchChamber(root, 0, 2);
            BranchChamber(root, 1, 4);
            BranchChamber(root, 0, 7);

            PlaceHatches();
            PlaceHydras();
            CookColliders();
            Decorate(root, crop);
            PlaceMarquees();
            BuildOutside(root);
            scoreboard = NkScoreboard.Make(spheres[0]);
        }

        public IEnumerator BuildAsync(Transform root, System.Action<float, string> prog)
        {
            void P(float u, string s) { if (prog != null) prog(u, s); }
            banner = NkTex.Banner();
            wall = NkTex.Wall();
            var crop = NkTex.Crop();
            Physics.gravity = Vector3.zero;
            Physics.defaultSolverIterations = 12;
            Physics.defaultSolverVelocityIterations = 8;
            P(0.08f, "FORGING SPHERES");
            yield return null;
            AddSphere(root, Vector3.zero, 45f, true);
            P(0.12f, "FORGING SPHERES");
            yield return null;
            AddSphere(root, new Vector3(0f, 8f, 100f), 30f);
            P(0.16f, "FORGING SPHERES");
            yield return null;
            AddSphere(root, new Vector3(82f, 20f, 38f), 31.25f);
            P(0.20f, "FORGING SPHERES");
            yield return null;
            AddSphere(root, new Vector3(-76f, -24f, 48f), 30f);
            P(0.24f, "FORGING SPHERES");
            yield return null;
            AddSphere(root, new Vector3(48f, -28f, 118f), 27.5f);
            P(0.28f, "FORGING SPHERES");
            yield return null;
            AddSphere(root, new Vector3(-55f, 42f, 95f), 28.75f);
            P(0.32f, "FORGING SPHERES");
            yield return null;
            AddSphere(root, new Vector3(98f, -12f, -40f), 30f);
            P(0.36f, "FORGING SPHERES");
            yield return null;
            AddSphere(root, new Vector3(-18f, 22f, -92f), 27.5f);
            yield return null;
            P(0.42f, "CUTTING TUBES");
            Connect(root, 0, 1, true);
            yield return null;
            Connect(root, 0, 2, true);
            yield return null;
            Connect(root, 0, 3, true);
            yield return null;
            Connect(root, 0, 6, false);
            yield return null;
            Connect(root, 0, 7, false);
            yield return null;
            Connect(root, 1, 4, false);
            yield return null;
            Connect(root, 1, 5, true);
            yield return null;
            Connect(root, 2, 4, false);
            yield return null;
            Connect(root, 3, 5, false);
            yield return null;
            Connect(root, 6, 7, false);
            yield return null;
            Connect(root, 2, 6, false);
            yield return null;
            P(0.58f, "SIDE BOXES");
            BranchChamber(root, 0, 1);
            yield return null;
            BranchChamber(root, 0, 2);
            yield return null;
            BranchChamber(root, 1, 4);
            yield return null;
            BranchChamber(root, 0, 7);
            yield return null;
            P(0.70f, "HATCHES");
            PlaceHatches();
            yield return null;
            P(0.74f, "HYDRA KENNELS");
            PlaceHydras();
            yield return null;
            for (int i = 0; i < spheres.Count; i++)
            {
                CookOne(spheres[i]);
                P(0.72f + i * 0.01f, "HATCHES");
                yield return null;
            }
            P(0.82f, "PLATFORMS");
            for (int i = 0; i < spheres.Count; i++)
            {
                NkPad.Fill(spheres[i], spheres[i].hub ? 9 : 5);
                yield return null;
            }
            P(0.86f, "LAVA FIELD");
            yield return null;
            BuildOutside(root);
            yield return null;
            P(0.88f, "TICKER BELTS");
            PlaceMarquees();
            yield return null;
            P(0.90f, "GLYPH BOARD");
            scoreboard = NkScoreboard.Make(spheres[0]);
        }

        public Vector3 InteriorPoint(NkSphere s, float frac = 0.32f)
        {
            if (s == null && spheres.Count > 0) s = spheres[0];
            if (s == null) return Vector3.zero;
            Vector3 d = Random.insideUnitSphere;
            if (d.sqrMagnitude < 0.04f) d = Vector3.up * 0.4f + Vector3.forward * 0.2f;
            return s.c + d.normalized * (s.r * frac * Random.Range(0.2f, 1f));
        }

        public Vector3 CenterSpawn(NkSphere s, Vector3 nudge)
        {
            if (s == null && spheres.Count > 0) s = spheres[0];
            if (s == null) return nudge;
            return s.c + nudge;
        }

        public bool InsideAny(Vector3 p, out NkSphere sph, out float dist, out Vector3 inward)
        {
            sph = null; dist = 999; inward = Vector3.up;
            float best = 999;
            foreach (var s in spheres)
            {
                var d = p - s.c;
                float mag = d.magnitude;
                float gap = s.r - mag;
                if (Mathf.Abs(gap) < best)
                {
                    best = Mathf.Abs(gap);
                    dist = gap;
                    sph = s;
                    inward = mag > 0.001f ? -d / mag : Vector3.up;
                }
            }
            return sph != null;
        }

        public bool InPassage(Vector3 p)
        {
            foreach (var t in tubes)
            {
                if (!t || !t.gameObject.activeInHierarchy) continue;
                var lp = t.InverseTransformPoint(p);
                float rad = Mathf.Sqrt(lp.x * lp.x + lp.z * lp.z);
                var mf = t.GetComponent<MeshFilter>();
                float half = mf && mf.sharedMesh ? mf.sharedMesh.bounds.extents.y + 2.4f : 50f;
                if (rad < TubeRad + 1.8f && Mathf.Abs(lp.y) < half) return true;
            }
            foreach (var z in zones)
            {
                if (!z.root || z.root.name != "Chamber" || !z.root.gameObject.activeInHierarchy) continue;
                var lp = z.root.InverseTransformPoint(p);
                if (Mathf.Abs(lp.x) < 9f && Mathf.Abs(lp.y) < 9f && Mathf.Abs(lp.z) < 9f) return true;
            }
            return false;
        }

        public bool ThroughHole(Vector3 p)
        {
            foreach (var s in spheres)
            {
                if (s == null || s.holeDirs == null || s.holeDirs.Count == 0) continue;
                Vector3 d = p - s.c;
                float mag = d.magnitude;
                if (mag < 0.01f) continue;
                Vector3 n = d / mag;
                for (int i = 0; i < s.holeDirs.Count; i++)
                {
                    float sin = i < s.holeSin.Count ? s.holeSin[i] : 0.12f;
                    float ang = Mathf.Asin(Mathf.Clamp(sin, 0.02f, 0.95f));
                    float cos = Mathf.Cos(ang);
                    if (Vector3.Dot(n, s.holeDirs[i]) < cos * 0.9f) continue;
                    float band = Mathf.Max(3.2f, s.r * sin * 2.4f);
                    if (Mathf.Abs(mag - s.r) < band) return true;
                    if (mag > s.r - 0.4f && mag < s.r + 14f) return true;
                }
            }
            for (int i = 0; i < _holedTubes.Count; i++)
            {
                var t = _holedTubes[i];
                if (!t) continue;
                Vector3 lp = t.InverseTransformPoint(p);
                Vector3 h = i < _tubeHoleLocal.Count ? _tubeHoleLocal[i] : Vector3.zero;
                float dy = lp.y - h.y;
                float a0 = Mathf.Atan2(lp.z, lp.x);
                float a1 = Mathf.Atan2(h.z, h.x);
                float da = Mathf.Abs(Mathf.DeltaAngle(a0 * Mathf.Rad2Deg, a1 * Mathf.Rad2Deg)) * Mathf.Deg2Rad;
                float arc = da * TubeRad;
                if (arc < 2.8f && Mathf.Abs(dy) < 2.8f) return true;
            }
            return false;
        }

        public void Confine(Rigidbody rb, float skin = 0.7f)
        {
            if (!rb) return;
            Vector3 p = rb.position;
            if (InPassage(p) || ThroughHole(p)) return;
            if (!InsideAny(p, out var sph, out float gap, out _)) return;
            if (gap >= -0.12f) return;
            if (gap < -2.4f) return;
            Vector3 from = p - sph.c;
            float mag = from.magnitude;
            if (mag < 1e-4f) return;
            Vector3 n = from / mag;
            float target = Mathf.Max(0.6f, sph.r - skin);
            rb.position = sph.c + n * target;
            float outw = Vector3.Dot(rb.linearVelocity, n);
            if (outw > 0f) rb.linearVelocity -= n * (outw + 0.4f);
        }

        public Vector3 RandomOnOuter(float keepClearOfPlayer, Vector3 player)
        {
            for (int n = 0; n < 24; n++)
            {
                var s = spheres[Random.Range(0, spheres.Count)];
                var dir = Random.onUnitSphere;
                var p = s.c + dir * (s.r + Random.Range(4.5f, 14f));
                if (Vector3.Distance(p, player) > keepClearOfPlayer) return p;
            }
            var a = spheres[0];
            return a.c + Vector3.up * (a.r + 8f);
        }

        public void PlaceFragmentBelts()
        {
            foreach (var s in spheres)
            {
                if (s == null) continue;
                int belts = s.hub ? 2 : 1;
                int n = s.hub ? 36 : 22;
                for (int b = 0; b < belts; b++)
                {
                    Vector3 axis = Random.onUnitSphere;
                    if (axis.sqrMagnitude < 0.01f) axis = Vector3.up;
                    var rot = Quaternion.FromToRotation(Vector3.up, axis.normalized);
                    for (int i = 0; i < n; i++)
                    {
                        float ang = (i / (float)n) * Mathf.PI * 2f + Random.Range(-0.08f, 0.08f);
                        float rad = s.r * Random.Range(0.90f, 1.04f);
                        float thick = s.r * Random.Range(-0.07f, 0.07f);
                        Vector3 local = new Vector3(Mathf.Cos(ang) * rad, thick, Mathf.Sin(ang) * rad);
                        NkCrystal.Make(s.c + rot * local);
                    }
                }
            }
        }

        public void PlaceHealWells()
        {
            var pick = new List<NkSphere>();
            foreach (var s in spheres)
                if (s != null) pick.Add(s);
            int want = Mathf.Max(1, pick.Count / 2);
            for (int i = 0; i < pick.Count; i++)
            {
                int j = Random.Range(i, pick.Count);
                var tmp = pick[i]; pick[i] = pick[j]; pick[j] = tmp;
            }
            bool hub = false;
            int n = 0;
            for (int i = 0; i < pick.Count && n < want; i++)
            {
                var s = pick[i];
                if (s.hub) hub = true;
                Vector3 d = Random.onUnitSphere;
                if (d.sqrMagnitude < 0.01f) d = Vector3.forward;
                Vector3 pos = s.c + d.normalized * (s.r * 0.48f);
                NkHealWell.Make(pos, (s.hub ? 14.4f : 11.2f) * 0.75f);
                n++;
            }
            if (!hub)
            {
                foreach (var s in spheres)
                {
                    if (s == null || !s.hub) continue;
                    Vector3 d = Random.onUnitSphere;
                    Vector3 pos = s.c + d.normalized * (s.r * 0.48f);
                    NkHealWell.Make(pos, 14.4f * 0.75f);
                    break;
                }
            }
        }

        public Vector3 RandomOnInner(float keepClearOfPlayer, Vector3 player)
        {
            for (int n = 0; n < 24; n++)
            {
                var s = spheres[Random.Range(0, spheres.Count)];
                var dir = Random.onUnitSphere;
                var p = s.c + dir * (s.r * 0.72f);
                if (Vector3.Distance(p, player) > keepClearOfPlayer) return p;
            }
            var a = spheres[0];
            return a.c + Vector3.up * (a.r * 0.5f);
        }

        public Vector3 RandomOutside(Vector3 player)
        {
            for (int n = 0; n < 20; n++)
            {
                var s = spheres[Random.Range(0, spheres.Count)];
                Vector3 dir = Random.onUnitSphere;
                Vector3 p = s.c + dir * (s.r + Random.Range(18f, 42f));
                bool ok = Vector3.Distance(p, player) > 12f;
                if (!ok) continue;
                foreach (var o in spheres)
                    if (o != null && Vector3.Distance(p, o.c) < o.r + 8f) { ok = false; break; }
                if (ok) return p;
            }
            var h = spheres[0];
            return h.c + Vector3.up * (h.r + 28f);
        }

        public Vector3 RandomRiftPoint()
        {
            var s = spheres[Random.Range(0, spheres.Count)];
            var dir = Random.onUnitSphere;
            return s.c + dir * (s.r - 0.05f);
        }

        public Transform OpenRift(Vector3 wallPoint)
        {
            InsideAny(wallPoint, out var sph, out _, out var inward);
            var iris = NkIrisDoor.Make(wallPoint, inward);
            if (sph != null) sph.rifts.Add(iris.transform);
            if (sph != null && sph.t) iris.transform.SetParent(sph.t, true);
            return iris.transform;
        }

        void AddSphere(Transform root, Vector3 c, float r, bool hub = false)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            go.name = hub ? "Hub" : "Arena";
            go.transform.SetParent(root, false);
            go.transform.position = c;
            go.transform.localScale = Vector3.one * r * 2f;
            var sc = go.GetComponent<Collider>();
            if (sc) Object.DestroyImmediate(sc);
            var mf = go.GetComponent<MeshFilter>();
            var mesh = HollowSphereMesh(80, 48);
            mf.sharedMesh = mesh;
            int kind = hub ? 7 : (spheres.Count % 12);
            var tex = NkTex.WallVariant(kind);
            var tint = hub
                ? new Color(1f, 0.96f, 0.88f)
                : Color.HSVToRGB((spheres.Count * 0.17f) % 1f, 0.18f, 1f);
            var mat = NkGfx.Textured(tex, tint, true, false);
            mat.mainTextureScale = hub ? new Vector2(9, 6) : new Vector2(6, 4);
            if (mat.HasProperty("_BaseMap")) mat.SetTextureScale("_BaseMap", mat.mainTextureScale);
            var rend = go.GetComponent<Renderer>();
            rend.sharedMaterial = mat;
            rend.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            rend.enabled = true;
            var mc = go.AddComponent<MeshCollider>();
            mc.convex = false;
            mc.sharedMesh = mesh;
            var innerGo = new GameObject("InnerSkin");
            innerGo.transform.SetParent(go.transform, false);
            innerGo.transform.localPosition = Vector3.zero;
            innerGo.transform.localRotation = Quaternion.identity;
            innerGo.transform.localScale = Vector3.one * 0.992f;
            var imf = innerGo.AddComponent<MeshFilter>();
            var imr = innerGo.AddComponent<MeshRenderer>();
            imr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            var itex = NkTex.WallVariant(hub ? 0 : (kind + 5) % 12);
            var itint = hub
                ? new Color(1f, 0.98f, 0.92f)
                : Color.HSVToRGB((spheres.Count * 0.23f + 0.08f) % 1f, 0.2f, 1f);
            var imat = NkGfx.Textured(itex, itint, true, false);
            imat.mainTextureScale = hub ? new Vector2(11, 7) : new Vector2(7, 4);
            if (imat.HasProperty("_BaseMap")) imat.SetTextureScale("_BaseMap", imat.mainTextureScale);
            imr.sharedMaterial = imat;
            imr.enabled = true;
            var sph = new NkSphere
            {
                c = c, r = r, t = go.transform, mesh = mesh, mf = mf, col = mc, hub = hub,
                innerMf = imf, innerRend = imr
            };
            spheres.Add(sph);
            zones.Add(new NkZone { root = go.transform, c = c, keep = r + 520f, always = hub });
            SkinInner(sph);
            if (hub)
            {
                void HubLite(string n, Vector3 loc, Color col, float intensity)
                {
                    var lite = new GameObject(n).AddComponent<Light>();
                    lite.type = LightType.Point;
                    lite.color = col;
                    lite.range = r * 1.45f;
                    lite.intensity = intensity;
                    lite.shadows = LightShadows.None;
                    lite.transform.SetParent(go.transform, false);
                    lite.transform.localPosition = loc;
                }
                HubLite("HubFill", Vector3.zero, new Color(0.82f, 0.9f, 1f), 3.4f);
                HubLite("HubWarm", new Vector3(0f, 0.12f, 0f), new Color(1f, 0.82f, 0.62f), 1.6f);
            }
        }

        void PlaceHatches()
        {
            foreach (var s in spheres)
            {
                if (s.hub || Random.value >= 0.33f) continue;
                bool top = Random.value < 0.5f;
                Vector3 pole = top ? Vector3.up : Vector3.down;
                CutCone(s, pole, NkHatch.SizeOf(s) * 1.08f);
                NkHatch.Make(s, top);
            }
        }

        void CookColliders()
        {
            foreach (var s in spheres) CookOne(s);
        }

        void CookOne(NkSphere s)
        {
            if (s == null || !s.mesh || !s.col) return;
            s.mesh.RecalculateNormals();
            s.mesh.RecalculateBounds();
            if (s.mf) s.mf.sharedMesh = s.mesh;
            s.col.sharedMesh = null;
            s.col.convex = false;
            s.col.sharedMesh = s.mesh;
            SkinInner(s);
        }

        void SkinInner(NkSphere s)
        {
            if (s == null || !s.mesh || !s.innerMf) return;
            var old = s.innerMf.sharedMesh;
            var flipped = InvertWinding(s.mesh);
            s.innerMf.sharedMesh = flipped;
            if (old && old != s.mesh && old != flipped) Object.Destroy(old);
            if (s.innerRend) s.innerRend.enabled = true;
        }

        static Mesh InvertWinding(Mesh src)
        {
            var m = Object.Instantiate(src);
            m.name = (src ? src.name : "arena") + "_in";
            var tri = m.triangles;
            for (int i = 0; i < tri.Length; i += 3)
            {
                int tmp = tri[i];
                tri[i] = tri[i + 1];
                tri[i + 1] = tmp;
            }
            m.triangles = tri;
            var nrm = m.normals;
            if (nrm != null && nrm.Length == m.vertexCount)
            {
                for (int i = 0; i < nrm.Length; i++) nrm[i] = -nrm[i];
                m.normals = nrm;
            }
            else m.RecalculateNormals();
            m.RecalculateBounds();
            return m;
        }

        static Mesh HollowSphereMesh(int slices, int stacks)
        {
            var verts = new List<Vector3>();
            var uvs = new List<Vector2>();
            var tris = new List<int>();
            float rad = 0.5f;
            for (int y = 0; y <= stacks; y++)
            {
                float v = y / (float)stacks;
                float phi = v * Mathf.PI;
                float sy = Mathf.Cos(phi), sr = Mathf.Sin(phi);
                for (int x = 0; x <= slices; x++)
                {
                    float u = x / (float)slices;
                    float th = u * Mathf.PI * 2f;
                    verts.Add(new Vector3(sr * Mathf.Cos(th), sy, sr * Mathf.Sin(th)) * rad);
                    uvs.Add(new Vector2(u, 1f - v));
                }
            }
            int stride = slices + 1;
            for (int y = 0; y < stacks; y++)
            {
                for (int x = 0; x < slices; x++)
                {
                    int a = y * stride + x;
                    int b = (y + 1) * stride + x;
                    int c = a + 1;
                    int d = b + 1;
                    tris.Add(a); tris.Add(b); tris.Add(c);
                    tris.Add(b); tris.Add(d); tris.Add(c);
                }
            }
            var m = new Mesh { name = "arenaHollow" };
            m.SetVertices(verts);
            m.SetUVs(0, uvs);
            m.SetTriangles(tris, 0);
            m.RecalculateNormals();
            m.RecalculateBounds();
            return m;
        }

        static void CutCone(NkSphere s, Vector3 worldDir, float holeWorldR)
        {
            if (s == null || s.mesh == null) return;
            float sinT = Mathf.Clamp(holeWorldR / Mathf.Max(s.r, 0.01f), 0.02f, 0.9f);
            float theta = Mathf.Max(Mathf.Asin(sinT), 5.2f * Mathf.Deg2Rad);
            CutConeHole(s.mesh, worldDir.normalized, Mathf.Sin(theta));
            if (s.holeDirs != null)
            {
                s.holeDirs.Add(worldDir.normalized);
                s.holeSin.Add(Mathf.Sin(theta));
            }
        }

        static void CutConeHole(Mesh mesh, Vector3 localDir, float sinTheta)
        {
            localDir.Normalize();
            float theta = Mathf.Asin(Mathf.Clamp(sinTheta, 0.01f, 0.99f));
            float cosCap = Mathf.Cos(theta);
            float cosCore = Mathf.Cos(theta * 0.5f);
            var v = mesh.vertices;
            var tri = mesh.triangles;
            var keep = new List<int>(tri.Length);
            for (int i = 0; i < tri.Length; i += 3)
            {
                int nIn = 0, nCore = 0;
                Vector3 c = Vector3.zero;
                bool ok = true;
                for (int k = 0; k < 3; k++)
                {
                    Vector3 p = v[tri[i + k]];
                    if (p.sqrMagnitude < 1e-8f) { ok = false; break; }
                    p.Normalize();
                    c += p;
                    float d = Vector3.Dot(p, localDir);
                    if (d >= cosCap) nIn++;
                    if (d >= cosCore) nCore++;
                }
                if (!ok) { keep.Add(tri[i]); keep.Add(tri[i + 1]); keep.Add(tri[i + 2]); continue; }
                c.Normalize();
                bool hole = nCore >= 1 || nIn >= 2 || Vector3.Dot(c, localDir) >= cosCap;
                if (hole) continue;
                keep.Add(tri[i]);
                keep.Add(tri[i + 1]);
                keep.Add(tri[i + 2]);
            }
            mesh.triangles = keep.ToArray();
        }

        void BuildOutside(Transform root)
        {
            float groundY = 0f;
            foreach (var s in spheres)
                groundY = Mathf.Min(groundY, s.c.y - s.r - 28f);
            var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
            ground.name = "Lava";
            ground.transform.SetParent(root, false);
            ground.transform.position = new Vector3(0f, groundY, 0f);
            ground.transform.localScale = Vector3.one * 160f;
            var lavaTex = NkTex.Lava();
            var gmat = NkGfx.Textured(lavaTex, Color.white, true, false);
            gmat.mainTextureScale = new Vector2(18f, 18f);
            if (gmat.HasProperty("_BaseMap")) gmat.SetTextureScale("_BaseMap", new Vector2(18f, 18f));
            ground.GetComponent<Renderer>().sharedMaterial = gmat;
            ground.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            ground.AddComponent<NkScroll>();
            PlaceLavaIslands(root, groundY);
            PlaceOuterPads();

            var sky = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            Object.DestroyImmediate(sky.GetComponent<Collider>());
            sky.name = "BsodSky";
            sky.transform.SetParent(root, false);
            sky.transform.localScale = Vector3.one * 1800f;
            var smf = sky.GetComponent<MeshFilter>();
            var sm = Object.Instantiate(smf.sharedMesh);
            var stri = sm.triangles;
            for (int i = 0; i < stri.Length; i += 3) { int a = stri[i]; stri[i] = stri[i + 1]; stri[i + 1] = a; }
            sm.triangles = stri;
            sm.RecalculateNormals();
            smf.sharedMesh = sm;
            var lcd = NkTex.BsodLcd();
            var smat = NkGfx.Textured(lcd, Color.white, true, false);
            smat.mainTextureScale = new Vector2(2.5f, 1.75f);
            if (smat.HasProperty("_BaseMap")) smat.SetTextureScale("_BaseMap", new Vector2(2.5f, 1.75f));
            var skyR = sky.GetComponent<Renderer>();
            skyR.sharedMaterial = smat;
            skyR.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            skyR.allowOcclusionWhenDynamic = false;
        }

        void Connect(Transform root, int ia, int ib, bool store)
        {
            var a = spheres[ia]; var b = spheres[ib];
            Vector3 pa = a.c, pb = b.c;
            Vector3 dir = pb - pa;
            float len = dir.magnitude;
            Vector3 n = dir / len;
            CutCone(a, n, TubeRad * 1.08f);
            CutCone(b, -n, TubeRad * 1.08f);
            Vector3 sa = pa + n * (a.r * 0.998f);
            Vector3 sb = pb - n * (b.r * 0.998f);
            Vector3 mid = (sa + sb) * 0.5f;
            float tubeLen = Vector3.Distance(sa, sb);
            var go = BuildTube(root, mid, n, tubeLen, store);
            Collar(sa, n, a);
            Collar(sb, -n, b);
            tubes.Add(go.transform);
            zones.Add(new NkZone { root = go.transform, c = mid, keep = tubeLen * 0.5f + 55f, always = a.hub || b.hub });
            go.name = "Tube-" + ia + "-" + ib;
        }

        GameObject BuildTube(Transform root, Vector3 mid, Vector3 n, float tubeLen, bool store)
        {
            var go = new GameObject("Tube");
            go.transform.SetParent(root, false);
            go.transform.position = mid;
            go.transform.rotation = Quaternion.FromToRotation(Vector3.up, n);
            var mf = go.AddComponent<MeshFilter>();
            var tmesh = TubeMesh(TubeRad, tubeLen, 20, 10);
            if (store) CutTubeWindow(tmesh, TubeRad);
            mf.sharedMesh = tmesh;
            var mr = go.AddComponent<MeshRenderer>();
            var mat = NkGfx.Textured(banner, Color.white, true, true);
            mat.mainTextureScale = new Vector2(2, tubeLen * 0.125f);
            mr.sharedMaterial = mat;
            mr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            var mc = go.AddComponent<MeshCollider>();
            mc.convex = false;
            mc.sharedMesh = mf.sharedMesh;
            go.AddComponent<NkScroll>();
            if (store) { /* coin store retired — power fragments only */ }
            return go;
        }

        void Collar(Vector3 pos, Vector3 n, NkSphere s)
        {
            var go = new GameObject("Collar");
            if (s != null && s.t) go.transform.SetParent(s.t, true);
            go.transform.position = pos;
            go.transform.rotation = Quaternion.FromToRotation(Vector3.up, n);
            var mf = go.AddComponent<MeshFilter>();
            mf.sharedMesh = RingMesh(TubeRad * 0.98f, TubeRad * 1.38f, 0.22f, 20);
            var mr = go.AddComponent<MeshRenderer>();
            mr.sharedMaterial = NkGfx.Make(new Color(0.22f, 0.24f, 0.28f), 1, false, 0.4f, 0.75f);
            mr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        }

        static Mesh RingMesh(float inner, float outer, float h, int seg)
        {
            var verts = new List<Vector3>();
            var tris = new List<int>();
            float y = h * 0.5f;
            for (int i = 0; i <= seg; i++)
            {
                float a = i / (float)seg * Mathf.PI * 2f;
                float c = Mathf.Cos(a), s = Mathf.Sin(a);
                verts.Add(new Vector3(c * inner, -y, s * inner));
                verts.Add(new Vector3(c * outer, -y, s * outer));
                verts.Add(new Vector3(c * outer, y, s * outer));
                verts.Add(new Vector3(c * inner, y, s * inner));
            }
            for (int i = 0; i < seg; i++)
            {
                int i0 = i * 4, i1 = (i + 1) * 4;
                void Quad(int a, int b, int c, int d)
                {
                    tris.Add(a); tris.Add(b); tris.Add(c);
                    tris.Add(a); tris.Add(c); tris.Add(d);
                }
                Quad(i0 + 1, i1 + 1, i1 + 2, i0 + 2);
                Quad(i0 + 3, i1 + 3, i1 + 0, i0 + 0);
                Quad(i0 + 2, i1 + 2, i1 + 3, i0 + 3);
                Quad(i0 + 0, i1 + 0, i1 + 1, i0 + 1);
            }
            var m = new Mesh { name = "collarRing" };
            m.SetVertices(verts);
            m.SetTriangles(tris, 0);
            m.RecalculateNormals();
            m.RecalculateBounds();
            return m;
        }

        void BranchChamber(Transform root, int ia, int ib)
        {
            var a = spheres[ia]; var b = spheres[ib];
            Vector3 n = (b.c - a.c).normalized;
            Vector3 mid = (a.c + n * a.r + b.c - n * b.r) * 0.5f;
            Vector3 perp = Vector3.Cross(n, Vector3.up);
            if (perp.sqrMagnitude < 0.01f) perp = Vector3.Cross(n, Vector3.right);
            perp.Normalize();
            float box = 16f;
            Vector3 roomC = mid + perp * (TubeRad + 2f + box * 0.5f);
            var room = AddBox(root, roomC, box, perp);
            Vector3 face = roomC - perp * (box * 0.5f);
            Vector3 from = mid + perp * TubeRad;
            Vector3 tubeMid = (from + face) * 0.5f;
            Vector3 tn = (face - from).normalized;
            float tlen = Mathf.Max(1.2f, Vector3.Distance(from, face));
            Transform main = null;
            foreach (var t in tubes)
                if (t && t.name == "Tube-" + ia + "-" + ib) { main = t; break; }
            if (main)
            {
                var mf = main.GetComponent<MeshFilter>();
                if (mf && mf.sharedMesh)
                {
                    Vector3 local = main.InverseTransformDirection(perp);
                    CutTubeSideHole(mf.sharedMesh, TubeRad, local, 1.2f);
                    var mc = main.GetComponent<MeshCollider>();
                    if (mc) { mc.sharedMesh = null; mc.sharedMesh = mf.sharedMesh; }
                }
            }
            var go = BuildTube(root, tubeMid, tn, tlen, false);
            tubes.Add(go.transform);
            zones.Add(new NkZone { root = go.transform, c = tubeMid, keep = 50f, always = false });
            int loot = Random.Range(4, 10);
            for (int i = 0; i < loot; i++)
                NkBreakable.Make(roomC + room.transform.rotation * (Random.insideUnitSphere * (box * 0.28f)), i % 2 == 0);
        }

        static void CutTubeSideHole(Mesh mesh, float rad, Vector3 localDir, float halfY)
        {
            localDir.y = 0f;
            if (localDir.sqrMagnitude < 0.01f) return;
            localDir.Normalize();
            var v = mesh.vertices;
            var tri = mesh.triangles;
            var keep = new List<int>(tri.Length);
            for (int i = 0; i < tri.Length; i += 3)
            {
                Vector3 c = (v[tri[i]] + v[tri[i + 1]] + v[tri[i + 2]]) / 3f;
                Vector3 xz = new Vector3(c.x, 0f, c.z);
                if (Mathf.Abs(c.y) < halfY && xz.sqrMagnitude > 0.01f && Vector3.Dot(xz.normalized, localDir) > 0.72f)
                    continue;
                keep.Add(tri[i]); keep.Add(tri[i + 1]); keep.Add(tri[i + 2]);
            }
            mesh.triangles = keep.ToArray();
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
        }

        GameObject AddBox(Transform root, Vector3 c, float size, Vector3 openOut)
        {
            var go = new GameObject("Chamber");
            go.transform.SetParent(root, false);
            go.transform.position = c;
            go.transform.rotation = Quaternion.LookRotation(openOut);
            float h = size * 0.5f, t = 0.35f;
            var mat = NkGfx.Textured(wall, new Color(0.85f, 0.82f, 0.75f), false, false);
            mat.mainTextureScale = new Vector2(3, 2);
            Vector3[] pos =
            {
                new Vector3(0, h, 0), new Vector3(0, -h, 0),
                new Vector3(h, 0, 0), new Vector3(-h, 0, 0),
                new Vector3(0, 0, h)
            };
            Vector3[] sc =
            {
                new Vector3(size, t, size), new Vector3(size, t, size),
                new Vector3(t, size, size), new Vector3(t, size, size),
                new Vector3(size, size, t)
            };
            for (int i = 0; i < pos.Length; i++)
            {
                var w = GameObject.CreatePrimitive(PrimitiveType.Cube);
                w.transform.SetParent(go.transform, false);
                w.transform.localPosition = pos[i];
                w.transform.localScale = sc[i];
                w.GetComponent<Renderer>().sharedMaterial = mat;
            }
            float door = TubeRad * 1.15f;
            NkGfx.Part(PrimitiveType.Cube, go.transform, new Vector3(door + 1.2f, 0f, -h), new Vector3(size * 0.5f - door, size, t), mat, true, "doorR");
            NkGfx.Part(PrimitiveType.Cube, go.transform, new Vector3(-(door + 1.2f), 0f, -h), new Vector3(size * 0.5f - door, size, t), mat, true, "doorL");
            NkGfx.Part(PrimitiveType.Cube, go.transform, new Vector3(0f, door + 1.1f, -h), new Vector3(door * 2.2f, size * 0.5f - door, t), mat, true, "doorT");
            NkGfx.Part(PrimitiveType.Cube, go.transform, new Vector3(0f, -(door + 1.1f), -h), new Vector3(door * 2.2f, size * 0.5f - door, t), mat, true, "doorB");
            zones.Add(new NkZone { root = go.transform, c = c, keep = size + 50f, always = false });
            return go;
        }

        public void Stream(Vector3 p)
        {
            foreach (var z in zones)
            {
                if (!z.root) continue;
                NkSphere sph = null;
                for (int i = 0; i < spheres.Count; i++)
                    if (spheres[i] != null && spheres[i].t == z.root) { sph = spheres[i]; break; }
                bool hub = sph != null && sph.hub;
                float lim = z.keep;
                if (z.root.gameObject.activeSelf) lim += 35f;
                bool on = hub || z.always || (p - z.c).sqrMagnitude < lim * lim;
                if (hub || z.always) on = true;
                if (z.root.gameObject.activeSelf != on) z.root.gameObject.SetActive(on);
                if (!on) continue;
                var r = z.root.GetComponent<Renderer>();
                if (r) r.enabled = true;
                if (sph != null && sph.innerRend) sph.innerRend.enabled = true;
            }
        }

        void PlaceMarquees()
        {
            for (int i = 0; i < spheres.Count; i++)
            {
                var s = spheres[i];
                if (s == null || !s.t) continue;
                int n = s.hub ? 5 : 3;
                for (int k = 0; k < n; k++)
                {
                    float lat = Mathf.Lerp(-0.26f, 0.26f, (k + 0.5f) / n);
                    NkMarquee.Make(s, lat, (k % 2 == 0 ? 1f : -1f) * Random.Range(0.1f, 0.22f));
                }
            }
        }

        void PlaceHydras()
        {
            if (spheres.Count == 0) return;
            PlaceOneHydra(spheres[0], 18f);
            if (spheres.Count > 1) PlaceOneHydra(spheres[1], 40f);
            if (spheres.Count > 2) PlaceOneHydra(spheres[2], 72f);
        }

        void PlaceOneHydra(NkSphere s, float delay = 45f)
        {
            Vector3 dir = Vector3.forward;
            for (int n = 0; n < 16; n++)
            {
                dir = Random.onUnitSphere;
                if (Mathf.Abs(dir.y) > 0.7f) continue;
                bool tube = false;
                foreach (var o in spheres)
                {
                    if (o == s) continue;
                    Vector3 td = o.c - s.c;
                    if (td.sqrMagnitude < 0.01f) continue;
                    if (Vector3.Dot(dir, td.normalized) > 0.8f) { tube = true; break; }
                }
                if (!tube) break;
            }
            CutCone(s, dir, 1.45f);
            hydras.Add(NkHydraNest.Make(s, dir, delay));
        }

        void Decorate(Transform root, Texture2D crop)
        {
            foreach (var s in spheres)
                NkPad.Fill(s, s.hub ? 9 : 5);
        }

        void PlaceOuterPads()
        {
            foreach (var s in spheres)
            {
                if (s == null) continue;
                int n = s.hub ? 14 : 9;
                for (int i = 0; i < n; i++)
                {
                    Vector3 dir = Random.onUnitSphere;
                    Vector3 p = s.c + dir * (s.r + Random.Range(7f, 18f));
                    NkPad.Make(p, Quaternion.FromToRotation(Vector3.up, dir) * Quaternion.Euler(Random.Range(-12f, 12f), Random.Range(0f, 360f), 0f));
                }
            }
        }

        void PlaceLavaIslands(Transform root, float groundY)
        {
            var rock = NkGfx.Make(new Color(0.18f, 0.12f, 0.1f), 1, false, 0.2f, 0.05f);
            var crust = NkGfx.Make(new Color(0.35f, 0.22f, 0.12f), 1, false, 0.15f, 0.02f);
            for (int i = 0; i < 14; i++)
            {
                Vector2 xz = Random.insideUnitCircle * 95f;
                if (xz.sqrMagnitude < 80f) xz = xz.normalized * Random.Range(18f, 70f);
                Vector3 pos = new Vector3(xz.x, groundY + 0.55f, xz.y);
                var go = new GameObject("LavaIsle");
                go.transform.SetParent(root, false);
                go.transform.position = pos;
                float rad = Random.Range(2.4f, 4.6f);
                NkGfx.Part(PrimitiveType.Cylinder, go.transform, Vector3.zero, new Vector3(rad * 2f, 0.45f, rad * 2f), crust, true, "top");
                NkGfx.Part(PrimitiveType.Cylinder, go.transform, new Vector3(0f, -0.55f, 0f), new Vector3(rad * 1.6f, 0.7f, rad * 1.6f), rock, true, "stem");
                var col = go.AddComponent<BoxCollider>();
                col.size = new Vector3(rad * 2f, 1.2f, rad * 2f);
                col.center = new Vector3(0f, -0.1f, 0f);
                int loot = Random.Range(2, 5);
                for (int k = 0; k < loot; k++)
                {
                    Vector3 lp = pos + new Vector3(Random.Range(-rad * 0.45f, rad * 0.45f), 0.55f, Random.Range(-rad * 0.45f, rad * 0.45f));
                    if (k == 0) NkBreakable.Make(lp, k % 2 == 0);
                    else if (Random.value < 0.55f) NkCrystal.Make(lp);
                    else NkCrystal.Make(lp);
                }
            }
        }

        public void Bore(NkSphere s, Vector3 worldDir, float holeWorldR)
        {
            CutCone(s, worldDir, holeWorldR);
            if (s == null || !s.mesh || !s.col) return;
            s.mesh.RecalculateNormals();
            s.mesh.RecalculateBounds();
            if (s.mf) s.mf.sharedMesh = s.mesh;
            s.col.sharedMesh = null;
            s.col.convex = false;
            s.col.sharedMesh = s.mesh;
            SkinInner(s);
            SpawnHoleDebris(s, worldDir.normalized, holeWorldR);
        }

        void SpawnHoleDebris(NkSphere s, Vector3 dir, float holeR)
        {
            if (s == null) return;
            Vector3 at = s.c + dir * (s.r * 0.96f);
            var wallMat = s.t ? s.t.GetComponent<Renderer>() : null;
            var mat = wallMat && wallMat.sharedMaterial
                ? wallMat.sharedMaterial
                : NkGfx.Textured(wall, new Color(0.82f, 0.8f, 0.95f), true, true);
            int n = Random.Range(4, 8);
            for (int i = 0; i < n; i++)
            {
                Vector3 tan = Vector3.Cross(dir, Random.onUnitSphere);
                if (tan.sqrMagnitude < 0.01f) tan = Vector3.up;
                tan.Normalize();
                Vector3 pos = at + tan * Random.Range(0.4f, holeR * 0.9f) - dir * Random.Range(0.2f, 1.4f);
                var go = new GameObject("HullChunk");
                go.transform.position = pos;
                go.transform.rotation = Quaternion.LookRotation(dir) * Quaternion.Euler(Random.Range(-40f, 40f), Random.Range(0f, 360f), Random.Range(-25f, 25f));
                float w = Random.Range(1.1f, 2.6f);
                float h = Random.Range(0.08f, 0.22f);
                float l = Random.Range(1.4f, 3.1f);
                var deck = NkGfx.Part(PrimitiveType.Cube, go.transform, Vector3.zero, new Vector3(w, h, l), mat, true, "plate");
                deck.localRotation = Quaternion.Euler(Random.Range(-12f, 12f), Random.Range(-18f, 18f), Random.Range(-10f, 10f));
                NkGfx.Part(PrimitiveType.Cube, go.transform, new Vector3(Random.Range(-0.3f, 0.3f), h * 0.6f, Random.Range(-0.4f, 0.4f)),
                    new Vector3(w * Random.Range(0.35f, 0.7f), h * 0.7f, l * Random.Range(0.3f, 0.55f)), mat, true, "rib");
                var col = go.AddComponent<BoxCollider>();
                col.size = new Vector3(w, h * 2f, l);
                var rb = go.AddComponent<Rigidbody>();
                rb.useGravity = false;
                rb.mass = 10f + w * l;
                rb.linearDamping = 0.5f;
                rb.angularDamping = 0.9f;
                rb.interpolation = RigidbodyInterpolation.Interpolate;
                rb.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;
                rb.linearVelocity = (-dir * Random.Range(0.4f, 2.2f) + Random.onUnitSphere * 0.8f);
                rb.angularVelocity = Random.onUnitSphere * Random.Range(0.2f, 1.1f);
                var pad = go.AddComponent<NkPad>();
                pad.rad = Mathf.Max(w, l) * 0.45f;
                NkPad.All.Add(pad);
            }
        }

        public void ScorchWall(Vector3 p)
        {
            if (ScorchTube(p)) return;
            if (!InsideAny(p, out var sph, out float gap, out _)) return;
            if (sph == null || gap < -2.2f || gap > 7f) return;
            Vector3 dir = p - sph.c;
            if (dir.sqrMagnitude < 0.01f) return;
            dir.Normalize();
            NkScorch found = null;
            for (int i = 0; i < _scorches.Count; i++)
            {
                var sc = _scorches[i];
                if (sc.sph != sph) continue;
                if (Vector3.Dot(sc.dir, dir) > 0.935f) { found = sc; break; }
            }
            if (found == null)
            {
                found = new NkScorch { sph = sph, dir = dir, hits = 0 };
                _scorches.Add(found);
            }
            found.hits++;
            float r = sph.r * (0.985f - found.hits * 0.008f);
            Vector3 pos = sph.c + found.dir * r;
            if (!found.vis)
            {
                var go = GameObject.CreatePrimitive(PrimitiveType.Quad);
                Object.DestroyImmediate(go.GetComponent<Collider>());
                go.name = "Scorch";
                go.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(new Color(0.05f, 0.03f, 0.03f, 0.92f), 0.92f, true);
                go.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                found.vis = go.transform;
            }
            found.vis.SetParent(null, true);
            found.vis.position = pos;
            found.vis.rotation = Quaternion.LookRotation(dir);
            float mark = 1.1f + found.hits * 0.45f;
            found.vis.localScale = new Vector3(mark, mark, 1f);
            int need = Random.Range(3, 6);
            if (found.hits < need) return;
            Bore(sph, found.dir, 2.45f);
            if (found.vis) Object.Destroy(found.vis.gameObject);
            _scorches.Remove(found);
            var g = Object.FindAnyObjectByType<NetKnightGame>();
            if (g) g.Hint("Hull blown — a hole opens to the outside.");
        }

        bool ScorchTube(Vector3 p)
        {
            Transform best = null;
            float bestGap = 1.15f;
            Vector3 bestLocal = Vector3.zero;
            foreach (var t in tubes)
            {
                if (!t) continue;
                Vector3 lp = t.InverseTransformPoint(p);
                float rad = Mathf.Sqrt(lp.x * lp.x + lp.z * lp.z);
                var mf = t.GetComponent<MeshFilter>();
                float half = mf && mf.sharedMesh ? mf.sharedMesh.bounds.extents.y : 20f;
                if (Mathf.Abs(lp.y) > half) continue;
                float gap = Mathf.Abs(rad - TubeRad);
                if (gap < bestGap) { bestGap = gap; best = t; bestLocal = lp; }
            }
            if (!best) return false;
            NkTubeBurn found = null;
            for (int i = 0; i < _tubeBurns.Count; i++)
            {
                var b = _tubeBurns[i];
                if (b.tube != best) continue;
                if ((b.local - bestLocal).sqrMagnitude < 6.5f) { found = b; break; }
            }
            if (found == null)
            {
                found = new NkTubeBurn { tube = best, local = bestLocal, hits = 0 };
                _tubeBurns.Add(found);
            }
            found.hits++;
            Vector3 wp = best.TransformPoint(found.local);
            if (!found.vis)
            {
                var go = GameObject.CreatePrimitive(PrimitiveType.Quad);
                Object.DestroyImmediate(go.GetComponent<Collider>());
                go.name = "TubeScorch";
                go.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(new Color(0.05f, 0.03f, 0.03f, 0.92f), 0.92f, true);
                found.vis = go.transform;
            }
            found.vis.position = wp;
            Vector3 outward = best.TransformDirection(new Vector3(found.local.x, 0f, found.local.z).normalized);
            found.vis.rotation = Quaternion.LookRotation(outward);
            found.vis.localScale = new Vector3(1.1f + found.hits * 0.4f, 1.1f + found.hits * 0.4f, 1f);
            if (found.hits < Random.Range(3, 6) && found.hits < 5) return true;
            BoreTube(best, found.local);
            if (found.vis) Object.Destroy(found.vis.gameObject);
            _tubeBurns.Remove(found);
            var g = Object.FindAnyObjectByType<NetKnightGame>();
            if (g) g.Hint("Tube hull blown — a side hole opens.");
            return true;
        }

        void BoreTube(Transform tube, Vector3 local)
        {
            if (!tube) return;
            var mf = tube.GetComponent<MeshFilter>();
            var mc = tube.GetComponent<MeshCollider>();
            if (!mf || !mf.sharedMesh) return;
            CutTubeBlast(mf.sharedMesh, local, 2.2f);
            mf.sharedMesh = mf.sharedMesh;
            if (mc)
            {
                mc.sharedMesh = null;
                mc.convex = false;
                mc.sharedMesh = mf.sharedMesh;
            }
            _holedTubes.Add(tube);
            _tubeHoleLocal.Add(local);
            Vector3 wp = tube.TransformPoint(local);
            Vector3 n = tube.TransformDirection(new Vector3(local.x, 0f, local.z).normalized);
            var mat = tube.GetComponent<Renderer>() ? tube.GetComponent<Renderer>().sharedMaterial : null;
            for (int i = 0; i < 5; i++)
            {
                var go = new GameObject("TubeChunk");
                go.transform.position = wp + n * Random.Range(0.2f, 1.2f) + Random.insideUnitSphere * 0.4f;
                go.transform.rotation = Random.rotation;
                NkGfx.Part(PrimitiveType.Cube, go.transform, Vector3.zero, new Vector3(Random.Range(0.8f, 1.6f), 0.1f, Random.Range(0.9f, 1.8f)),
                    mat ? mat : NkGfx.Make(new Color(0.2f, 0.15f, 0.35f), 1, true), true, "plate");
                var rb = go.AddComponent<Rigidbody>();
                rb.useGravity = false;
                rb.mass = 8f;
                rb.linearDamping = 0.45f;
                rb.linearVelocity = n * Random.Range(0.5f, 2f) + Random.onUnitSphere * 0.6f;
                rb.angularVelocity = Random.onUnitSphere;
                var pad = go.AddComponent<NkPad>();
                pad.rad = 0.9f;
                NkPad.All.Add(pad);
            }
        }

        static void CutTubeBlast(Mesh mesh, Vector3 local, float holeR)
        {
            var v = mesh.vertices;
            var tri = mesh.triangles;
            var keep = new List<int>(tri.Length);
            float hy = local.y;
            float ha = Mathf.Atan2(local.z, local.x);
            for (int i = 0; i < tri.Length; i += 3)
            {
                Vector3 c = (v[tri[i]] + v[tri[i + 1]] + v[tri[i + 2]]) / 3f;
                float da = Mathf.Abs(Mathf.DeltaAngle(Mathf.Atan2(c.z, c.x) * Mathf.Rad2Deg, ha * Mathf.Rad2Deg)) * Mathf.Deg2Rad;
                float arc = da * TubeRad;
                float dy = c.y - hy;
                if (arc * arc + dy * dy < holeR * holeR) continue;
                keep.Add(tri[i]); keep.Add(tri[i + 1]); keep.Add(tri[i + 2]);
            }
            mesh.triangles = keep.ToArray();
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
        }

        static Mesh TubeMesh(float r, float len, int seg, int rings)
        {
            var verts = new List<Vector3>();
            var uvs = new List<Vector2>();
            var tris = new List<int>();
            float h = len * 0.5f;
            for (int y = 0; y <= rings; y++)
            {
                float v = y / (float)rings;
                float yy = Mathf.Lerp(-h, h, v);
                for (int i = 0; i <= seg; i++)
                {
                    float a = i / (float)seg * Mathf.PI * 2f;
                    verts.Add(new Vector3(Mathf.Cos(a) * r, yy, Mathf.Sin(a) * r));
                    uvs.Add(new Vector2(i / (float)seg, v));
                }
            }
            int stride = seg + 1;
            for (int y = 0; y < rings; y++)
            {
                for (int i = 0; i < seg; i++)
                {
                    int a = y * stride + i, b = (y + 1) * stride + i, c = a + 1, d = b + 1;
                    tris.Add(a); tris.Add(c); tris.Add(b);
                    tris.Add(b); tris.Add(c); tris.Add(d);
                }
            }
            var m = new Mesh { name = "tube" };
            m.SetVertices(verts);
            m.SetUVs(0, uvs);
            m.SetTriangles(tris, 0);
            m.RecalculateNormals();
            m.RecalculateBounds();
            return m;
        }

        static void CutTubeWindow(Mesh mesh, float rad)
        {
            var v = mesh.vertices;
            var tri = mesh.triangles;
            var keep = new List<int>(tri.Length);
            for (int i = 0; i < tri.Length; i += 3)
            {
                Vector3 c = (v[tri[i]] + v[tri[i + 1]] + v[tri[i + 2]]) / 3f;
                if (c.x > rad * 0.82f && Mathf.Abs(c.y) < 1.28f && Mathf.Abs(c.z) < 1.15f) continue;
                keep.Add(tri[i]); keep.Add(tri[i + 1]); keep.Add(tri[i + 2]);
            }
            mesh.triangles = keep.ToArray();
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
        }
    }

    public class NkIrisDoor : MonoBehaviour
    {
        Transform[] _petals;
        float _open, _want, _rad = 1.05f;
        float _hold = -1f;
        bool _manual;
        System.Action _onOpen;

        public static NkIrisDoor Make(Vector3 pos, Vector3 facePlayer, float rad = 1.05f)
        {
            var go = new GameObject("IrisHatch");
            go.transform.position = pos;
            go.transform.rotation = Quaternion.LookRotation(facePlayer);
            var steel = NkGfx.Textured(NkTex.Circuit(), new Color(0.62f, 0.64f, 0.68f), false, false);
            var dark = NkGfx.Make(new Color(0.18f, 0.19f, 0.22f), 1, false, 0.35f, 0.7f);
            var rim = NkGfx.Make(new Color(0.78f, 0.8f, 0.84f), 1, false, 0.55f, 0.85f);
            void Ring(float r, float thick, float z, Material mat)
            {
                var c = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                Object.DestroyImmediate(c.GetComponent<Collider>());
                c.transform.SetParent(go.transform, false);
                c.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
                c.transform.localPosition = new Vector3(0f, 0f, z);
                c.transform.localScale = new Vector3(r * 2f, thick, r * 2f);
                c.GetComponent<Renderer>().sharedMaterial = mat;
            }
            Ring(rad * 1.12f, 0.055f, 0f, steel);
            Ring(rad * 1.02f, 0.04f, 0.03f, rim);
            Ring(rad * 0.34f, 0.035f, 0.02f, dark);
            for (int b = 0; b < 12; b++)
            {
                float a = b / 12f * Mathf.PI * 2f;
                var bolt = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                Object.DestroyImmediate(bolt.GetComponent<Collider>());
                bolt.transform.SetParent(go.transform, false);
                bolt.transform.localPosition = new Vector3(Mathf.Cos(a) * rad * 1.08f, Mathf.Sin(a) * rad * 1.08f, 0.05f);
                bolt.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
                bolt.transform.localScale = new Vector3(0.07f, 0.03f, 0.07f);
                bolt.GetComponent<Renderer>().sharedMaterial = rim;
            }
            const int n = 12;
            var petals = new Transform[n];
            var blade = NkGfx.Make(new Color(0.42f, 0.44f, 0.48f), 1, false, 0.4f, 0.75f);
            for (int i = 0; i < n; i++)
            {
                var p = GameObject.CreatePrimitive(PrimitiveType.Cube);
                Object.DestroyImmediate(p.GetComponent<Collider>());
                p.name = "petal" + i;
                p.transform.SetParent(go.transform, false);
                p.GetComponent<Renderer>().sharedMaterial = blade;
                petals[i] = p.transform;
            }
            var d = go.AddComponent<NkIrisDoor>();
            d._petals = petals;
            d._want = 0f;
            d._rad = rad;
            d.ApplyPetals(rad);
            return d;
        }

        public void Release(System.Action spawn)
        {
            _onOpen = spawn;
            _hold = 0f;
            _manual = false;
        }

        public void Drive(float open01)
        {
            _manual = true;
            _want = Mathf.Clamp01(open01);
            _hold = 0f;
        }

        void Update()
        {
            if (!_manual)
            {
                if (_hold < 0f) return;
                _hold += Time.deltaTime;
                _want = (_hold < 0.5f) ? 1f : (_hold < 2.2f ? 1f : 0f);
                if (_hold >= 0.42f && _onOpen != null) { var a = _onOpen; _onOpen = null; a(); }
            }
            _open = Mathf.MoveTowards(_open, _want, Time.deltaTime * 2.6f);
            ApplyPetals(_rad);
        }

        void ApplyPetals(float rad)
        {
            if (_petals == null) return;
            int n = _petals.Length;
            for (int i = 0; i < n; i++)
            {
                if (!_petals[i]) continue;
                float yaw = i * (360f / n);
                float swing = Mathf.Lerp(8f, 58f, _open);
                float dist = Mathf.Lerp(rad * 0.38f, rad * 0.92f, _open);
                _petals[i].localRotation = Quaternion.Euler(0f, 0f, yaw + swing);
                _petals[i].localPosition = Quaternion.Euler(0f, 0f, yaw) * new Vector3(dist, 0f, 0.015f);
                _petals[i].localScale = new Vector3(rad * 0.55f, rad * 0.16f, 0.05f);
            }
        }
    }

    public class NkScoreboard : MonoBehaviour
    {
        TextMesh _tm, _tmOut;
        public static NkScoreboard Make(NkSphere hub)
        {
            if (hub == null || hub.t == null) return null;
            var go = new GameObject("Scoreboard");
            go.transform.SetParent(hub.t, true);
            Vector3 n = new Vector3(0f, 0.22f, 1f).normalized;
            go.transform.position = hub.c + n * (hub.r * 0.58f);
            Vector3 inward = hub.c - go.transform.position;
            if (inward.sqrMagnitude < 0.001f) inward = Vector3.back;
            go.transform.rotation = Quaternion.LookRotation(inward.normalized, Vector3.up);
            var board = GameObject.CreatePrimitive(PrimitiveType.Cube);
            Object.DestroyImmediate(board.GetComponent<Collider>());
            board.transform.SetParent(go.transform, false);
            board.transform.localScale = new Vector3(8.5f, 3.2f, 0.18f);
            board.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(new Color(0.04f, 0.05f, 0.07f), 1, true);
            TextMesh Face(string name, Vector3 pos, Quaternion rot, bool flip)
            {
                var tm = new GameObject(name).AddComponent<TextMesh>();
                tm.anchor = TextAnchor.MiddleCenter;
                tm.alignment = TextAlignment.Center;
                tm.characterSize = 0.12f;
                tm.fontSize = 64;
                tm.fontStyle = FontStyle.Bold;
                tm.color = new Color(1f, 0.85f, 0.2f);
                tm.transform.SetParent(go.transform, false);
                tm.transform.localPosition = pos;
                tm.transform.localRotation = rot;
                tm.text = "GLYPHS\n0\n00:00";
                if (flip) NkGfx.FlipText(tm);
                else NkGfx.Unmirror(tm);
                return tm;
            }
            var tmIn = Face("scoreIn", new Vector3(0f, 0f, 0.12f), Quaternion.identity, false);
            var tmOut = Face("scoreOut", new Vector3(0f, 0f, -0.12f), Quaternion.Euler(0f, 180f, 0f), true);
            void Glyph(Vector3 pos, Quaternion rot)
            {
                var icon = GameObject.CreatePrimitive(PrimitiveType.Quad);
                Object.DestroyImmediate(icon.GetComponent<Collider>());
                icon.transform.SetParent(go.transform, false);
                icon.transform.localPosition = pos;
                icon.transform.localRotation = rot;
                icon.transform.localScale = new Vector3(1.1f, 1.1f, 1f);
                var ct = NkCredit.Icon();
                icon.GetComponent<Renderer>().sharedMaterial = ct
                    ? NkGfx.Textured(ct, Color.white, true, true)
                    : NkGfx.Make(new Color(1f, 0.8f, 0.15f), 1, true);
            }
            Glyph(new Vector3(-3.2f, 0.85f, 0.12f), Quaternion.identity);
            Glyph(new Vector3(-3.2f, 0.85f, -0.12f), Quaternion.Euler(0f, 180f, 0f));
            var s = go.AddComponent<NkScoreboard>();
            s._tm = tmIn;
            s._tmOut = tmOut;
            return s;
        }

        public void Set(float score, float time = 0f)
        {
            string t = "GLYPHS\n" + NkCredit.Money(score) + "\n" + NkCredit.Clock(time);
            if (_tm) _tm.text = t;
            if (_tmOut) _tmOut.text = t;
        }
    }

    public class NkHpRing : MonoBehaviour
    {
        const int Segs = 32;
        Transform[] _seg;
        Material _mat;
        readonly Color _green = new Color(0.22f, 0.95f, 0.32f, 1f);
        readonly Color _red = new Color(1f, 0.12f, 0.08f, 1f);
        float _flash, _u = 1f;

        public static NkHpRing Make(Transform parent, float rad, float z)
        {
            var go = new GameObject("HpRing");
            go.transform.SetParent(parent, false);
            go.transform.localPosition = new Vector3(0f, 0f, z);
            go.transform.localRotation = Quaternion.identity;
            var ring = go.AddComponent<NkHpRing>();
            ring.Build(rad);
            return ring;
        }

        void Build(float rad)
        {
            var src = NkGfx.Make(_green, 1, true);
            _mat = new Material(src);
            _seg = new Transform[Segs];
            for (int i = 0; i < Segs; i++)
            {
                float a0 = i / (float)Segs * Mathf.PI * 2f;
                float a1 = (i + 1) / (float)Segs * Mathf.PI * 2f;
                Vector3 p0 = new Vector3(Mathf.Cos(a0) * rad, Mathf.Sin(a0) * rad, 0f);
                Vector3 p1 = new Vector3(Mathf.Cos(a1) * rad, Mathf.Sin(a1) * rad, 0f);
                Vector3 d = p1 - p0;
                var bar = GameObject.CreatePrimitive(PrimitiveType.Cube);
                Object.DestroyImmediate(bar.GetComponent<Collider>());
                bar.transform.SetParent(transform, false);
                bar.transform.localPosition = (p0 + p1) * 0.5f;
                bar.transform.localRotation = Quaternion.LookRotation(d.normalized, Vector3.forward);
                bar.transform.localScale = new Vector3(0.12f, 0.12f, Mathf.Max(0.04f, d.magnitude * 0.9f));
                var rend = bar.GetComponent<Renderer>();
                rend.sharedMaterial = _mat;
                rend.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                _seg[i] = bar.transform;
            }
        }

        public void Pulse() { _flash = 0.28f; }

        public void Set(float u) { _u = Mathf.Clamp01(u); }

        void LateUpdate()
        {
            if (_flash > 0f) _flash -= Time.deltaTime;
            var col = _flash > 0f
                ? Color.Lerp(_red, Color.white, Mathf.PingPong(Time.time * 22f, 1f) * 0.55f)
                : _green;
            if (_mat)
            {
                if (_mat.HasProperty("_BaseColor")) _mat.SetColor("_BaseColor", col);
                _mat.color = col;
            }
            int on = Mathf.Clamp(Mathf.RoundToInt(_u * Segs), 0, Segs);
            for (int i = 0; i < Segs; i++)
                if (_seg[i]) _seg[i].gameObject.SetActive(i < on);
        }
    }

public class NkHydraNest : MonoBehaviour
    {
        public NkSphere sphere;
        public Vector3 dir;
        public Color color;
        public int headsNext = 1;
        public bool disabled;
        public bool open;
        public bool hydraFallen;
        public NkHydraKennel kennel;
        Transform _door;
        NkIrisDoor _iris;
        NkHpRing _hp;
        float _waveMax = 20f;
        readonly List<NkHydraHead> _live = new List<NkHydraHead>();
        float _closedT = 45f, _openT;

        public bool KennelVulnerable
        {
            get
            {
                _live.RemoveAll(h => !h);
                return hydraFallen && _live.Count == 0;
            }
        }

        public static NkHydraNest Make(NkSphere s, Vector3 dir, float delay = 45f)
        {
            dir.Normalize();
            var col = Color.HSVToRGB(Random.value, 0.65f, 0.9f);
            var go = new GameObject("HydraDoor");
            Vector3 pos = s.c + dir * (s.r * 0.992f);
            go.transform.position = pos;
            go.transform.rotation = Quaternion.LookRotation(-dir);
            NkGfx.Part(PrimitiveType.Cylinder, go.transform, new Vector3(0f, 0f, 0.02f), new Vector3(2.55f, 0.1f, 2.55f),
                new Color(0.28f, 0.26f, 0.24f), false, 0.35f, 0.55f, false, "collar").localRotation = Quaternion.Euler(90f, 0f, 0f);
            var iris = NkIrisDoor.Make(pos + (-dir) * 0.04f, -dir, 1.15f);
            iris.transform.SetParent(go.transform, true);
            var poster = GameObject.CreatePrimitive(PrimitiveType.Quad);
            Object.DestroyImmediate(poster.GetComponent<Collider>());
            poster.transform.SetParent(go.transform, false);
            poster.transform.localPosition = new Vector3(1.55f, 0.85f, 0.08f);
            poster.transform.localScale = new Vector3(0.55f, 0.55f, 1f);
            poster.GetComponent<Renderer>().sharedMaterial = NkGfx.Textured(NkTex.HydraPoster(col), Color.white, true, true);
            var n = go.AddComponent<NkHydraNest>();
            n.sphere = s;
            n.dir = dir;
            n.color = col;
            n._iris = iris;
            n._door = iris.transform;
            n._closedT = delay;
            n.kennel = NkHydraKennel.Make(s, dir, col, n);
            if (n.kennel) n.kennel.transform.SetParent(go.transform, true);
            n._hp = NkHpRing.Make(go.transform, 1.42f, 0.14f);
            return n;
        }

        public void FlashHp() { if (_hp) _hp.Pulse(); }

        public void Tick(float dt, NkPlayer player, NetKnightGame game, NkWorld world)
        {
            if (disabled)
            {
                if (open) Close();
                foreach (var h in _live) if (h) h.Tick(dt, player, game, this);
                _live.RemoveAll(h => !h);
                TickHp();
                return;
            }
            foreach (var h in _live) if (h) h.Tick(dt, player, game, this);
            _live.RemoveAll(h => !h);
            TickHp();
            if (open)
            {
                _openT -= dt;
                if (player && sphere != null && (player.transform.position - sphere.c).magnitude < sphere.r - 0.5f)
                    _openT = Mathf.Max(_openT, 10f);
                if (_openT <= 0f) Close();
            }
            else
            {
                _closedT -= dt;
                if (_closedT <= 0f && _live.Count == 0) Open();
            }
        }

        void Open()
        {
            for (int i = 0; i < _live.Count; i++)
                if (_live[i]) Object.Destroy(_live[i].gameObject);
            _live.Clear();
            open = true;
            _openT = 55f;
            if (_iris) _iris.Drive(1f);
            else if (_door) _door.localRotation = Quaternion.Euler(0f, -95f, 0f);
            int n = Mathf.Max(1, headsNext);
            Vector3 axis = Vector3.Cross(dir, Vector3.up);
            if (axis.sqrMagnitude < 0.01f) axis = Vector3.Cross(dir, Vector3.right);
            axis.Normalize();
            for (int i = 0; i < n; i++)
            {
                float u = n == 1 ? 0f : (i / (float)(n - 1) - 0.5f);
                Vector3 launch = Quaternion.AngleAxis(u * 52f, axis) * dir;
                var h = NkHydraHead.Make(this, launch, color, i);
                _live.Add(h);
            }
            var g = Object.FindAnyObjectByType<NetKnightGame>();
            if (g) g.Hint(n == 1 ? "A hydra door opens." : n + " hydra heads spill from the door.");
            _waveMax = n * 20f;
            TickHp();
        }

        void TickHp()
        {
            if (!_hp) return;
            if (disabled) { _hp.gameObject.SetActive(false); return; }
            float cur = 0f, max = 0f;
            for (int i = 0; i < _live.Count; i++)
            {
                var h = _live[i];
                if (!h) continue;
                cur += Mathf.Max(0f, h.hp);
                max += Mathf.Max(0.01f, h.maxHp);
            }
            if (max > 0.01f)
            {
                _hp.gameObject.SetActive(true);
                _hp.Set(cur / max);
                return;
            }
            if (KennelVulnerable && kennel)
            {
                _hp.gameObject.SetActive(true);
                _hp.Set(Mathf.Clamp01(kennel.hp / Mathf.Max(0.01f, kennel.maxHp)));
                return;
            }
            _hp.gameObject.SetActive(open);
            if (open) _hp.Set(0f);
        }

        void Close()
        {
            open = false;
            _closedT = Random.Range(90f, 160f);
            if (_iris) _iris.Drive(0f);
            else if (_door) _door.localRotation = Quaternion.identity;
            foreach (var h in _live) if (h) h.Retreat();
        }

        public void DisableForever()
        {
            disabled = true;
            Close();
            if (_door) _door.gameObject.SetActive(false);
            if (_hp) _hp.gameObject.SetActive(false);
        }

        public void HeadDied()
        {
            headsNext = Mathf.Min(8, headsNext + 1);
            hydraFallen = true;
        }
    }

    public class NkFadeBits : MonoBehaviour
    {
        float _life = 2.4f, _max = 2.4f;
        Renderer[] _rends;
        Material[] _mats;
        Color[] _cols;

        public void Arm(float life)
        {
            _life = _max = Mathf.Max(0.4f, life);
            _rends = GetComponentsInChildren<Renderer>(true);
            _mats = new Material[_rends.Length];
            _cols = new Color[_rends.Length];
            for (int i = 0; i < _rends.Length; i++)
            {
                if (!_rends[i]) continue;
                var src = _rends[i].material;
                var m = new Material(src);
                if (m.HasProperty("_Surface")) m.SetFloat("_Surface", 1f);
                m.SetOverrideTag("RenderType", "Transparent");
                m.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
                m.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
                m.SetInt("_ZWrite", 0);
                m.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
                m.renderQueue = 3000;
                _rends[i].material = m;
                _mats[i] = m;
                _cols[i] = m.HasProperty("_BaseColor") ? m.GetColor("_BaseColor") : m.color;
            }
        }

        void Update()
        {
            _life -= Time.deltaTime;
            float a = Mathf.Clamp01(_life / _max);
            if (_mats != null)
            {
                for (int i = 0; i < _mats.Length; i++)
                {
                    if (!_mats[i]) continue;
                    var c = _cols[i];
                    c.a *= a;
                    if (_mats[i].HasProperty("_BaseColor")) _mats[i].SetColor("_BaseColor", c);
                    _mats[i].color = c;
                }
            }
            if (_life <= 0f) Destroy(gameObject);
        }
    }

    public class NkHydraKennel : MonoBehaviour
    {
        public const float WallSegmentHp = 48f;
        public float hp = WallSegmentHp * 5f;
        public float maxHp = WallSegmentHp * 5f;
        NkHydraNest _nest;
        float _hintCd;

        public static NkHydraKennel Make(NkSphere s, Vector3 dir, Color col, NkHydraNest nest)
        {
            var go = new GameObject("HydraKennel");
            go.transform.position = s.c + dir * (s.r + 0.2f);
            go.transform.rotation = Quaternion.LookRotation(dir);
            var wire = new Color(0.55f, 0.55f, 0.58f);
            NkGfx.Part(PrimitiveType.Cube, go.transform, Vector3.zero, new Vector3(4.8f, 4.4f, 5.2f),
                new Color(0.25f, 0.22f, 0.2f), false, 0.35f, 0.3f, false, "crate");
            for (int i = -4; i <= 4; i++)
            {
                NkGfx.Part(PrimitiveType.Cube, go.transform, new Vector3(i * 0.48f, 0f, 2.64f), new Vector3(0.1f, 4.1f, 0.1f), wire, false, 0.4f, 0.8f, false, "bar");
            }
            var poster = GameObject.CreatePrimitive(PrimitiveType.Quad);
            Object.DestroyImmediate(poster.GetComponent<Collider>());
            poster.transform.SetParent(go.transform, false);
            poster.transform.localPosition = new Vector3(0f, 0.55f, 2.68f);
            poster.transform.localScale = new Vector3(2.2f, 2.2f, 1f);
            poster.GetComponent<Renderer>().sharedMaterial = NkGfx.Textured(NkTex.HydraPoster(col), Color.white, true, true);
            var colider = go.AddComponent<BoxCollider>();
            colider.size = new Vector3(5.0f, 4.6f, 5.4f);
            var k = go.AddComponent<NkHydraKennel>();
            k._nest = nest;
            k.hp = k.maxHp = WallSegmentHp * 5f;
            return k;
        }

        public void Hit(float dmg, Vector3 at, Vector3 dir)
        {
            var g = Object.FindAnyObjectByType<NetKnightGame>();
            if (_nest && !_nest.KennelVulnerable)
            {
                if (g && Time.time >= _hintCd)
                {
                    _hintCd = Time.time + 2.4f;
                    g.Hint("Slay the hydra first — then the kennel can be wrecked.");
                }
                return;
            }
            hp -= dmg;
            if (_nest) _nest.FlashHp();
            transform.position += dir.normalized * 0.015f;
            if (hp > 0f) return;
            NkWeapons.Blast(transform.position, dir, 12f, 3.2f, true, g, transform, 0.5f);
            if (_nest) _nest.DisableForever();
            if (g) g.Hint("Hydra kennel wrecked — that hole is sealed.");
            Destroy(gameObject);
        }
    }

    public class NkHydraHead : MonoBehaviour
    {
        public static readonly List<NkHydraHead> All = new List<NkHydraHead>();
        public float hp = 20f, maxHp = 20f;
        NkHydraNest _nest;
        Transform _root;
        Transform[] _bone;
        Vector3[] _pos;
        Transform _jaw, _beam;
        float _biteCd, _beamT, _sweep, _coil, _burnCd, _atkCd, _reach = 18f, _stuck;
        int _segs = 18, _seed, _phase, _phaseWas = -1;
        bool _beaming, _retreating, _dead, _plasmaNext = true;
        Color _col;
        Vector3 _inward, _side, _up2;
        readonly List<NkBolt> _orbs = new List<NkBolt>();

        public static NkHydraHead Make(NkHydraNest nest, Vector3 dir, Color col, int seed = 0)
        {
            var go = new GameObject("HydraHead");
            Vector3 inward = (-dir).sqrMagnitude > 0.01f ? (-dir).normalized : Vector3.back;
            go.transform.position = nest.transform.position + inward * 2.9f;
            var h = go.AddComponent<NkHydraHead>();
            h._nest = nest;
            h._col = col;
            h._seed = seed * 7919 + 17;
            h._inward = inward;
            h._plasmaNext = (seed & 1) == 0;
            h._atkCd = 0.35f + seed * 0.22f;
            h.Build(dir, col);
            var sc = go.AddComponent<SphereCollider>();
            sc.radius = 0.42f;
            sc.center = new Vector3(0f, 0f, 0.12f);
            sc.isTrigger = true;
            All.Add(h);
            return h;
        }

        void Build(Vector3 dir, Color col)
        {
            _reach = 18f;
            if (_nest && _nest.sphere != null) _reach = Mathf.Clamp(_nest.sphere.r * 0.82f, 14f, 40f);
            _segs = 18;
            _bone = new Transform[_segs];
            _pos = new Vector3[_segs];
            _root = new GameObject("Neck").transform;
            _inward = (-dir).sqrMagnitude > 0.01f ? (-dir).normalized : Vector3.back;
            _side = Vector3.Cross(_inward, Vector3.up);
            if (_side.sqrMagnitude < 0.01f) _side = Vector3.Cross(_inward, Vector3.right);
            _side.Normalize();
            _up2 = Vector3.Cross(_side, _inward).normalized;
            Vector3 pin = Pin();
            var dark = col * 0.45f;
            for (int i = 0; i < _segs; i++)
            {
                _pos[i] = Helix(pin, 0.12f, i);
                var b = new GameObject("n" + i).transform;
                b.SetParent(_root, true);
                b.position = _pos[i];
                float u = i / (float)(_segs - 1);
                float r = Mathf.Lerp(0.44f, 0.16f, u);
                NkGfx.Part(PrimitiveType.Sphere, b, Vector3.zero, Vector3.one * (r * 2.1f), Color.Lerp(dark, col, u), false, 0.55f, 0.05f, false, "flesh");
                if (i % 2 == 0)
                    NkGfx.Part(PrimitiveType.Cube, b, new Vector3(0f, r * 0.7f, 0f), new Vector3(0.06f, r * 0.8f, 0.08f), dark, false, 0.4f, 0f, false, "ridge");
                _bone[i] = b;
            }
            transform.SetParent(null, true);
            transform.position = _pos[_segs - 1];
            NkGfx.Part(PrimitiveType.Sphere, transform, new Vector3(0f, 0.05f, 0.15f), new Vector3(0.55f, 0.4f, 0.7f), col, false, 0.5f, 0.05f, false, "skull");
            NkGfx.Part(PrimitiveType.Sphere, transform, new Vector3(-0.12f, 0.12f, 0.28f), Vector3.one * 0.1f, Color.yellow, true, 0.2f, 0f, false, "eyeL");
            NkGfx.Part(PrimitiveType.Sphere, transform, new Vector3(0.12f, 0.12f, 0.28f), Vector3.one * 0.1f, Color.yellow, true, 0.2f, 0f, false, "eyeR");
            _jaw = NkGfx.Part(PrimitiveType.Cube, transform, new Vector3(0f, -0.08f, 0.28f), new Vector3(0.32f, 0.1f, 0.4f), col * 0.7f, false, 0.4f, 0f, false, "jaw");
            for (int i = 0; i < 6; i++)
            {
                float x = -0.12f + i * 0.048f;
                NkGfx.Part(PrimitiveType.Cube, _jaw, new Vector3(x / 0.32f, 0.6f, 0.2f), new Vector3(0.04f, 0.12f, 0.04f), Color.white, false, 0.2f, 0f, false, "t");
            }
            _beam = GameObject.CreatePrimitive(PrimitiveType.Cube).transform;
            Object.DestroyImmediate(_beam.GetComponent<Collider>());
            _beam.SetParent(null, true);
            _beam.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(col.r, col.g * 0.4f, 1f, 0.85f));
            _beam.gameObject.SetActive(false);
            PoseBones();
        }

        Vector3 Pin()
        {
            if (!_nest) return transform.position;
            return _nest.transform.position + _inward * 2.85f;
        }

        Vector3 Helix(Vector3 pin, float coil, int i)
        {
            float u = i / (float)Mathf.Max(1, _segs - 1);
            float turns = Mathf.Lerp(5.4f, 1.15f, coil);
            float rad = Mathf.Lerp(2.35f, 0.28f, coil) * (1f - u * 0.42f);
            float along = Mathf.Lerp(0.22f, 0.9f, coil) * _reach * u;
            float ang = u * turns * Mathf.PI * 2f + _seed * 0.31f + Time.time * (1.15f + (_seed % 5) * 0.11f);
            Vector3 p = pin + _inward * along + _side * (Mathf.Sin(ang) * rad) + _up2 * (Mathf.Cos(ang) * rad);
            return ClampInside(p);
        }

        Vector3 ClampInside(Vector3 p)
        {
            var sph = _nest ? _nest.sphere : null;
            if (sph == null) return p;
            Vector3 d = p - sph.c;
            float mag = d.magnitude;
            float max = sph.r - 1.05f;
            if (mag > max && mag > 0.01f) p = sph.c + d / mag * max;
            if (float.IsNaN(p.x)) p = sph.c + _inward * (sph.r * 0.4f);
            return p;
        }

        void PoseBones()
        {
            for (int i = 0; i < _segs; i++)
            {
                if (!_bone[i]) continue;
                _bone[i].position = _pos[i];
                if (i < _segs - 1)
                {
                    Vector3 f = _pos[i + 1] - _pos[i];
                    if (f.sqrMagnitude > 1e-5f) _bone[i].rotation = Quaternion.LookRotation(f);
                }
                else if (i > 0)
                {
                    Vector3 f = _pos[i] - _pos[i - 1];
                    if (f.sqrMagnitude > 1e-5f) _bone[i].rotation = Quaternion.LookRotation(f);
                }
            }
            if (_bone[_segs - 1]) transform.position = _bone[_segs - 1].position;
        }

        void OnDestroy()
        {
            All.Remove(this);
            if (_root) Destroy(_root.gameObject);
            if (_beam) Destroy(_beam.gameObject);
            for (int i = 0; i < _orbs.Count; i++)
                if (_orbs[i].t) Destroy(_orbs[i].t.gameObject);
            _orbs.Clear();
        }

        public void Tick(float dt, NkPlayer player, NetKnightGame game, NkHydraNest nest)
        {
            if (_dead) return;
            if (_pos == null || _bone == null) return;
            dt = Mathf.Max(0f, dt);
            Vector3 pin = Pin();
            Vector3 you = player ? player.transform.position + Vector3.up * 0.9f : pin + _inward * 6f;
            if (_retreating)
            {
                _stuck += dt;
                _coil = Mathf.MoveTowards(_coil, 0f, dt * 2.4f);
                Vector3 hole = pin + _inward * 0.35f;
                Lay(pin, hole, 0.04f);
                float dPin = Vector3.Distance(_pos[_segs - 1], pin);
                if (_stuck > 1.8f || (_coil <= 0.04f && dPin < 1.4f))
                {
                    if (_root) { Destroy(_root.gameObject); _root = null; }
                    Destroy(gameObject);
                }
                TickOrbs(dt, game, player);
                return;
            }

            if (_phase != _phaseWas) { _phaseWas = _phase; _stuck = 0f; }
            _stuck += dt;
            if (_stuck > 4.5f)
            {
                _phase = 0;
                _coil = 0.22f;
                _atkCd = 0.15f;
                _beaming = false;
                if (_beam) _beam.gameObject.SetActive(false);
                _stuck = 0f;
            }

            Vector3 strike = StrikeAim(you);
            _atkCd -= dt;
            _burnCd -= dt;
            if (_phase == 0)
            {
                _coil = Mathf.MoveTowards(_coil, 0.16f + 0.08f * Mathf.Sin(Time.time * 1.4f + _seed), dt * 1.6f);
                if (_atkCd <= 0f)
                    _phase = 1;
            }
            else if (_phase == 1)
            {
                _coil = Mathf.MoveTowards(_coil, 1f, dt / 0.62f);
                if (_coil >= 0.86f)
                {
                    _phase = 2;
                    _beamT = _plasmaNext ? 0.05f : 1.65f;
                    if (_plasmaNext) FirePlasma(you);
                    else { _beaming = true; _sweep = _seed * 0.2f; }
                    _plasmaNext = !_plasmaNext;
                }
            }
            else if (_phase == 2)
            {
                _coil = Mathf.MoveTowards(_coil, 1f, dt * 2f);
                _beamT -= dt;
                if (_beaming) Hyper(dt, you, game);
                if (_beamT <= 0f)
                {
                    _beaming = false;
                    if (_beam) _beam.gameObject.SetActive(false);
                    _phase = 3;
                }
            }
            else
            {
                _coil = Mathf.MoveTowards(_coil, 0.12f, dt / 0.72f);
                if (_coil <= 0.14f)
                {
                    _phase = 0;
                    _atkCd = Random.Range(0.55f, 1.15f);
                }
            }

            Vector3 headWant = Vector3.Lerp(Helix(pin, Mathf.Clamp01(_coil * 0.35f), _segs - 1), strike, Mathf.SmoothStep(0f, 1f, _coil));
            Lay(pin, headWant, _coil);

            Vector3 look = you - transform.position;
            if (look.sqrMagnitude > 0.01f)
            {
                Vector3 f = look.normalized;
                Vector3 up = Vector3.up;
                if (Mathf.Abs(Vector3.Dot(f, up)) > 0.97f) up = _side;
                transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(f, up), dt * 6f);
            }
            if (_jaw)
            {
                float gape = _phase == 2 ? 28f : (_phase == 1 ? 16f : 8f);
                _jaw.localRotation = Quaternion.Euler(gape + Mathf.Sin(Time.time * 9f) * 6f, 0f, 0f);
            }

            NkBreakable food = null;
            float best = 2.2f;
            foreach (var b in NkBreakable.All)
            {
                if (!b) continue;
                if (!InsideNest(b.transform.position)) continue;
                float d = Vector3.Distance(b.transform.position, transform.position);
                if (d < best) { best = d; food = b; }
            }
            if (food && best < 1.6f) food.Chew(7f * dt);

            float pd = Vector3.Distance(transform.position, you);
            _biteCd -= dt;
            if (pd < 2.2f && _biteCd <= 0f)
            {
                _biteCd = 1.1f;
                if (game) { game.HurtPlayer(2, transform.forward); game.live.hitsTaken++; }
            }
            TickOrbs(dt, game, player);
        }

        void Lay(Vector3 pin, Vector3 head, float coil)
        {
            _pos[0] = pin;
            _pos[_segs - 1] = ClampInside(head);
            for (int i = 1; i < _segs - 1; i++)
            {
                float u = i / (float)(_segs - 1);
                Vector3 helix = Helix(pin, coil, i);
                Vector3 line = Vector3.Lerp(pin, _pos[_segs - 1], u);
                _pos[i] = ClampInside(Vector3.Lerp(helix, line, Mathf.Clamp01(coil)));
            }
            PoseBones();
        }

        Vector3 StrikeAim(Vector3 you)
        {
            Vector3 pin = Pin();
            Vector3 to = you - pin;
            float max = _reach * 0.92f;
            if (to.magnitude > max) to = to.normalized * max;
            Vector3 wobble = _side * (Mathf.Sin(Time.time * 2.1f + _seed) * 0.55f)
                + _up2 * (Mathf.Cos(Time.time * 1.6f + _seed) * 0.4f);
            return ClampInside(pin + to + wobble);
        }

        bool InsideNest(Vector3 p)
        {
            if (_nest == null || _nest.sphere == null) return true;
            return (p - _nest.sphere.c).magnitude < _nest.sphere.r - 0.8f;
        }

        void FirePlasma(Vector3 you)
        {
            Vector3 o = transform.position + transform.forward * 0.7f;
            Vector3 dir = you - o;
            if (dir.sqrMagnitude < 0.01f) dir = transform.forward;
            dir.Normalize();
            const float size = 0.6325f;
            var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            Object.Destroy(go.GetComponent<Collider>());
            go.transform.position = o;
            go.transform.localScale = Vector3.one * size;
            go.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(0.55f, 0.85f, 1f, 0.95f));
            _orbs.Add(new NkBolt
            {
                t = go.transform, p = o, dir = dir,
                spd = 14f, spd0 = 14f, spdMax = 16f,
                life = 3.8f, dmg = 48f, blast = 13.5f, size = size, charged = true
            });
            NkSfx.Plasma(o, true);
        }

        void Hyper(float dt, Vector3 you, NetKnightGame game)
        {
            if (!_beam) return;
            _beam.gameObject.SetActive(true);
            _sweep += dt * 0.55f;
            float yaw = Mathf.Sin(_sweep) * 10f;
            float pitch = Mathf.Cos(_sweep * 0.7f) * 5f;
            Vector3 o = transform.position + transform.forward * 0.55f;
            Vector3 baseDir = you - o;
            if (baseDir.sqrMagnitude < 0.01f) baseDir = transform.forward;
            Vector3 dir = Quaternion.LookRotation(baseDir.normalized) * Quaternion.Euler(pitch, yaw, 0f) * Vector3.forward;
            float max = _nest && _nest.sphere != null ? _nest.sphere.r * 0.95f + 10f : 42f;
            var hits = Physics.RaycastAll(o, dir, max);
            System.Array.Sort(hits, (a, b) => a.distance.CompareTo(b.distance));
            float end = max;
            foreach (var hit in hits)
            {
                if (!hit.collider) continue;
                if (hit.collider.transform.IsChildOf(transform) || hit.collider.GetComponentInParent<NkHydraHead>()) continue;
                if (hit.collider.GetComponentInParent<NkHydraKennel>()) continue;
                if (_root && hit.collider.transform.IsChildOf(_root)) continue;
                if (_nest && hit.collider.transform.IsChildOf(_nest.transform) && !hit.collider.GetComponentInParent<NkPlayer>()) continue;
                end = hit.distance;
                if (hit.collider.GetComponentInParent<NkPlayer>() && game && _burnCd <= 0f)
                {
                    _burnCd = 0.44f;
                    game.HurtPlayer(1, dir);
                    game.live.hitsTaken++;
                }
                break;
            }
            _beam.position = o + dir * (end * 0.5f);
            _beam.rotation = Quaternion.LookRotation(dir);
            float thick = 0.14f + Mathf.Sin(Time.time * 28f) * 0.03f;
            _beam.localScale = new Vector3(thick, thick, Mathf.Max(0.2f, end));
        }

        void TickOrbs(float dt, NetKnightGame game, NkPlayer player)
        {
            var weap = player ? player.weapons : null;
            for (int i = _orbs.Count - 1; i >= 0; i--)
            {
                var b = _orbs[i];
                b.life -= dt;
                Vector3 vel = b.dir * b.spd;
                NkWindow.Threat(b.p, vel);
                if (weap && NkCombat.NearSword(weap, b.p, b.size))
                {
                    b.dir = NkCombat.BounceOffSword(b.dir, weap, b.p);
                    NkWeapons.Sparks(b.p);
                    NkSfx.Shield(b.p);
                }
                else if (Physics.SphereCast(b.p, b.size * 0.4f, b.dir, out var hit, vel.magnitude * dt + 0.05f))
                {
                    var hyd = hit.collider.GetComponentInParent<NkHydraHead>();
                    var ken = hit.collider.GetComponentInParent<NkHydraKennel>();
                    if (hyd || ken || (_root && hit.collider.transform.IsChildOf(_root)))
                    {
                        b.p += vel * dt;
                        if (b.t) b.t.position = b.p;
                        _orbs[i] = b;
                        continue;
                    }
                    if (NkCombat.HitsSword(hit.collider, weap))
                    {
                        b.dir = NkCombat.BounceOffSword(b.dir, weap, hit.point);
                        NkWeapons.Sparks(hit.point);
                    }
                    else
                    {
                        if (hit.collider.GetComponentInParent<NkPlayer>() && game)
                        {
                            game.HurtPlayer(3, b.dir);
                            game.live.hitsTaken++;
                        }
                        NkWeapons.Blast(hit.point, hit.normal, b.dmg, b.blast, true, game, transform, b.size);
                        if (b.t) Object.Destroy(b.t.gameObject);
                        _orbs.RemoveAt(i);
                        continue;
                    }
                }
                if (b.life <= 0f)
                {
                    if (b.t) Object.Destroy(b.t.gameObject);
                    _orbs.RemoveAt(i);
                    continue;
                }
                b.p += vel * dt;
                if (b.t) b.t.position = b.p;
                _orbs[i] = b;
            }
        }

        public void Hurt(float dmg, Vector3 dir)
        {
            hp -= dmg;
            if (_nest) _nest.FlashHp();
            if (hp <= 0f) Die(false, dir);
        }

        public void Decapitate(Vector3 dir) => Die(true, dir);

        void Die(bool chop, Vector3 dir)
        {
            if (_dead) return;
            _dead = true;
            if (_nest) _nest.HeadDied();
            var g = Object.FindAnyObjectByType<NetKnightGame>();
            if (g) g.AddKillScore(70);
            Vector3 p = transform.position;
            NkSfx.Crowd(p);
            NkCombat.BurstLoot(p, Random.Range(18, 32), Random.Range(6, 12));
            if (_beam) { Destroy(_beam.gameObject); _beam = null; }
            for (int i = 0; i < _orbs.Count; i++)
                if (_orbs[i].t) Destroy(_orbs[i].t.gameObject);
            _orbs.Clear();
            var hit = GetComponent<Collider>();
            if (hit) hit.enabled = false;
            transform.SetParent(null, true);
            if (_root) _root.SetParent(null, true);
            if (_bone != null)
            {
                for (int i = 0; i < _bone.Length; i++)
                {
                    var b = _bone[i];
                    if (!b) continue;
                    b.SetParent(null, true);
                    KickLoose(b.gameObject, dir, chop);
                    _bone[i] = null;
                }
            }
            if (_root) { Destroy(_root.gameObject); _root = null; }
            int extra = chop ? 8 : 5;
            for (int i = 0; i < extra; i++)
            {
                var c = GameObject.CreatePrimitive(i % 2 == 0 ? PrimitiveType.Sphere : PrimitiveType.Cube);
                Object.DestroyImmediate(c.GetComponent<Collider>());
                c.transform.position = p + Random.insideUnitSphere * 0.35f;
                c.transform.localScale = Vector3.one * Random.Range(0.08f, 0.22f);
                c.transform.rotation = Random.rotation;
                c.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(_col, 1, false, 0.4f, 0f);
                KickLoose(c, dir, chop);
            }
            KickLoose(gameObject, dir, chop);
        }

        static void KickLoose(GameObject go, Vector3 dir, bool chop)
        {
            if (!go) return;
            foreach (var c in go.GetComponentsInChildren<Collider>())
                c.enabled = false;
            var rb = go.GetComponent<Rigidbody>();
            if (!rb) rb = go.AddComponent<Rigidbody>();
            rb.useGravity = false;
            rb.mass = 0.35f;
            rb.linearDamping = 0.45f;
            rb.angularDamping = 0.3f;
            rb.linearVelocity = dir.normalized * (chop ? 3.4f : 2.1f) + Random.onUnitSphere * (chop ? 4.6f : 3.2f);
            rb.angularVelocity = Random.onUnitSphere * Random.Range(2.5f, 7f);
            var fade = go.GetComponent<NkFadeBits>();
            if (!fade) fade = go.AddComponent<NkFadeBits>();
            fade.Arm(2.4f);
        }

        public void Retreat()
        {
            if (_dead) return;
            _retreating = true;
            if (_beam) _beam.gameObject.SetActive(false);
        }
    }
}
