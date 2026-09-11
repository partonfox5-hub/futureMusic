using System.Collections.Generic;
using UnityEngine;

namespace NetKnight
{
    public class NkBreakable : MonoBehaviour
    {
        public static readonly List<NkBreakable> All = new List<NkBreakable>();
        public bool barrel;
        public float hp = 4.2f;
        Rigidbody _rb;

        public static NkBreakable Make(Vector3 pos, bool barrel)
        {
            var go = new GameObject(barrel ? "Barrel" : "Crate");
            go.transform.position = pos;
            go.transform.rotation = Random.rotation;
            if (barrel) BuildBarrel(go.transform);
            else BuildCrate(go.transform);
            var rb = go.AddComponent<Rigidbody>();
            rb.useGravity = false;
            rb.mass = barrel ? 3.1f : 2.6f;
            rb.linearDamping = 0.22f;
            rb.angularDamping = 0.28f;
            rb.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;
            rb.linearVelocity = Random.onUnitSphere * 0.22f;
            rb.angularVelocity = Random.onUnitSphere * 0.55f;
            var b = go.AddComponent<NkBreakable>();
            b.barrel = barrel;
            b._rb = rb;
            if (!barrel)
            {
                float mul = Random.Range(1f, 2f);
                go.transform.localScale = Vector3.one * mul;
                rb.mass *= mul;
                b.hp *= mul;
            }
            All.Add(b);
            return b;
        }

        static void BuildCrate(Transform root)
        {
            var wood = NkGfx.Textured(NkTex.Planks(), new Color(0.82f, 0.48f, 0.2f), false, false);
            var dark = NkGfx.Make(new Color(0.32f, 0.14f, 0.06f), 1, false, 0.25f, 0.05f);
            var iron = NkGfx.Make(new Color(0.42f, 0.36f, 0.32f), 1, false, 0.4f, 0.75f);
            float s = 0.72f;
            NkGfx.Part(PrimitiveType.Cube, root, Vector3.zero, Vector3.one * (s * 0.92f), wood, false, "box");
            float e = s * 0.5f, t = 0.045f;
            Vector3[] edges =
            {
                new Vector3(0, e, e), new Vector3(0, e, -e), new Vector3(0, -e, e), new Vector3(0, -e, -e),
                new Vector3(e, 0, e), new Vector3(e, 0, -e), new Vector3(-e, 0, e), new Vector3(-e, 0, -e),
                new Vector3(e, e, 0), new Vector3(e, -e, 0), new Vector3(-e, e, 0), new Vector3(-e, -e, 0)
            };
            Vector3[] esc =
            {
                new Vector3(s, t, t), new Vector3(s, t, t), new Vector3(s, t, t), new Vector3(s, t, t),
                new Vector3(t, s, t), new Vector3(t, s, t), new Vector3(t, s, t), new Vector3(t, s, t),
                new Vector3(t, t, s), new Vector3(t, t, s), new Vector3(t, t, s), new Vector3(t, t, s)
            };
            for (int i = 0; i < edges.Length; i++)
                NkGfx.Part(PrimitiveType.Cube, root, edges[i], esc[i], dark, false, "edge");
            float c = e + 0.01f;
            for (int x = -1; x <= 1; x += 2)
                for (int y = -1; y <= 1; y += 2)
                    for (int z = -1; z <= 1; z += 2)
                        NkGfx.Part(PrimitiveType.Cube, root, new Vector3(x * c, y * c, z * c), Vector3.one * 0.08f, iron, false, "corner");
            var col = root.gameObject.AddComponent<BoxCollider>();
            col.size = Vector3.one * s;
        }

        static void BuildBarrel(Transform root)
        {
            var wood = NkGfx.Textured(NkTex.Planks(), new Color(0.7f, 0.34f, 0.12f), false, false);
            var hoop = NkGfx.Make(new Color(0.5f, 0.4f, 0.28f), 1, false, 0.45f, 0.7f);
            var lid = NkGfx.Make(new Color(0.48f, 0.24f, 0.1f), 1, false, 0.3f, 0.05f);
            int staves = 12;
            for (int i = 0; i < staves; i++)
            {
                float a = i / (float)staves * Mathf.PI * 2f;
                var p = NkGfx.Part(PrimitiveType.Cube, root, new Vector3(Mathf.Cos(a) * 0.28f, 0f, Mathf.Sin(a) * 0.28f),
                    new Vector3(0.09f, 1.05f, 0.115f), wood, false, "stave");
                p.localRotation = Quaternion.Euler(0f, -a * Mathf.Rad2Deg, 0f);
            }
            float[] hy = { -0.4f, -0.15f, 0.15f, 0.4f };
            foreach (var y in hy)
            {
                var h = NkGfx.Part(PrimitiveType.Cylinder, root, new Vector3(0, y, 0), new Vector3(0.64f, 0.03f, 0.64f), hoop, false, "hoop");
                h.localScale = new Vector3(0.64f, 0.03f, 0.64f);
            }
            NkGfx.Part(PrimitiveType.Cylinder, root, new Vector3(0, 0.52f, 0), new Vector3(0.54f, 0.025f, 0.54f), lid, false, "lid");
            NkGfx.Part(PrimitiveType.Cylinder, root, new Vector3(0, -0.52f, 0), new Vector3(0.54f, 0.025f, 0.54f), lid, false, "bot");
            var cap = root.gameObject.AddComponent<CapsuleCollider>();
            cap.height = 1.12f;
            cap.radius = 0.33f;
        }

        void OnDestroy() { All.Remove(this); }

        public bool Hit(float dmg, Vector3 at, Vector3 dir)
        {
            hp -= dmg;
            if (_rb) _rb.AddForceAtPosition(dir.normalized * 3.5f, at, ForceMode.Impulse);
            if (hp > 0) return false;
            Smash(true);
            return true;
        }

        public void Chew(float dmg)
        {
            hp -= dmg;
            if (hp <= 0f) Smash(false);
        }

        public void Smash(bool dropLoot)
        {
            var pos = transform.position;
            if (dropLoot)
            {
                NkCombat.BurstLoot(pos,
                    Mathf.Max(1, Mathf.RoundToInt(Random.Range(3, 7) * 1.15f)),
                    Mathf.Max(1, Mathf.RoundToInt(Random.Range(2, 5) * 1.15f)));
                if (Random.value < 0.12f) NkMissilePickup.Make(pos + Random.insideUnitSphere * 0.2f);
            }
            Destroy(gameObject);
        }
    }

    public class NkCrystal : MonoBehaviour
    {
        public const float Ttl = 120f;
        public static readonly List<NkCrystal> All = new List<NkCrystal>();
        Rigidbody _rb;
        float _age;
        Vector3 _baseScale = Vector3.one;

        public static NkCrystal Make(Vector3 pos) =>
            Make(pos, Random.onUnitSphere * Random.Range(0.7f, 2.1f));

        public static NkCrystal Make(Vector3 pos, Vector3 vel)
        {
            var go = new GameObject("Shard");
            go.transform.position = pos;
            var col = Color.HSVToRGB(Random.value, 0.75f, 1f);
            int bits = Random.Range(2, 5);
            for (int i = 0; i < bits; i++)
            {
                var p = GameObject.CreatePrimitive(i % 2 == 0 ? PrimitiveType.Cube : PrimitiveType.Sphere);
                Object.DestroyImmediate(p.GetComponent<Collider>());
                p.transform.SetParent(go.transform, false);
                p.transform.localPosition = Random.insideUnitSphere * 0.063f;
                p.transform.localScale = Vector3.one * Random.Range(0.052f, 0.127f);
                p.transform.localRotation = Random.rotation;
                p.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(col, 1, true);
            }
            var sc = go.AddComponent<SphereCollider>();
            sc.radius = 0.115f;
            sc.isTrigger = true;
            var rb = go.AddComponent<Rigidbody>();
            rb.useGravity = false;
            rb.mass = 0.18f;
            rb.linearDamping = 0.55f;
            rb.angularDamping = 0.35f;
            rb.linearVelocity = vel;
            rb.angularVelocity = Random.onUnitSphere * Random.Range(4f, 14f);
            var c = go.AddComponent<NkCrystal>();
            c._rb = rb;
            c._baseScale = go.transform.localScale;
            All.Add(c);
            return c;
        }

        void Update()
        {
            _age += Time.deltaTime;
            float left = Ttl - _age;
            if (left <= 0f) { Destroy(gameObject); return; }
            if (left < 2f)
                transform.localScale = _baseScale * Mathf.Max(0.08f, left / 2f);
        }

        void OnDestroy() { All.Remove(this); }

        public int Pull(Vector3 p, float mag, float grab)
        {
            float d = Vector3.Distance(transform.position, p);
            if (d <= grab) { Destroy(gameObject); return 1; }
            if (d < mag && _rb)
            {
                var dir = (p - transform.position).normalized;
                _rb.linearVelocity = Vector3.Lerp(_rb.linearVelocity, dir * 15f, 0.28f);
            }
            return 0;
        }

        public bool TryPickup(Vector3 p, float r) => Pull(p, 0f, r) > 0;
    }

    public class NkShard : NkCrystal { }

    public class NkCoin : MonoBehaviour
    {
        public const float Ttl = 120f;
        public static readonly List<NkCoin> All = new List<NkCoin>();
        Rigidbody _rb;
        float _age;
        Vector3 _baseScale = Vector3.one;

        public static NkCoin Make(Vector3 pos)
        {
            var go = new GameObject("Coin");
            go.transform.position = pos;
            var gold = NkGfx.Make(new Color(1f, 0.78f, 0.18f), 1, false, 0.7f, 0.85f);
            var disc = NkGfx.Part(PrimitiveType.Cylinder, go.transform, Vector3.zero, new Vector3(0.161f, 0.014f, 0.161f), gold, false, "disc");
            disc.localRotation = Quaternion.Euler(90, 0, 0);
            NkGfx.Part(PrimitiveType.Cylinder, go.transform, Vector3.zero, new Vector3(0.0575f, 0.018f, 0.0575f),
                NkGfx.Make(new Color(0.85f, 0.55f, 0.1f), 1, false, 0.6f, 0.7f), false, "stamp");
            var sc = go.AddComponent<SphereCollider>();
            sc.radius = 0.138f;
            sc.isTrigger = true;
            var rb = go.AddComponent<Rigidbody>();
            rb.useGravity = false;
            rb.mass = 0.15f;
            rb.linearDamping = 0.3f;
            rb.angularDamping = 0.1f;
            rb.linearVelocity = Random.onUnitSphere * Random.Range(0.8f, 2.4f);
            rb.angularVelocity = Random.onUnitSphere * 8f;
            var c = go.AddComponent<NkCoin>();
            c._rb = rb;
            c._baseScale = go.transform.localScale;
            All.Add(c);
            return c;
        }

        void Update()
        {
            _age += Time.deltaTime;
            float left = Ttl - _age;
            if (left <= 0f) { Destroy(gameObject); return; }
            if (left < 2f)
                transform.localScale = _baseScale * Mathf.Max(0.08f, left / 2f);
        }

        void OnDestroy() { All.Remove(this); }

        public bool Pull(Vector3 p, float mag, float grab)
        {
            float d = Vector3.Distance(transform.position, p);
            if (d <= grab) { Destroy(gameObject); return true; }
            if (d < mag && _rb)
            {
                var dir = (p - transform.position).normalized;
                _rb.linearVelocity = Vector3.Lerp(_rb.linearVelocity, dir * 15f, 0.28f);
            }
            return false;
        }
    }

    public class NkPad : MonoBehaviour
    {
        public static readonly List<NkPad> All = new List<NkPad>();
        public float hp = 42f, rad = 1.6f;
        Rigidbody _rb;

        public static void Fill(NkSphere s, int n)
        {
            if (s == null) return;
            for (int i = 0; i < n; i++)
            {
                Vector3 d = Random.onUnitSphere;
                Vector3 p = s.c + d * (s.r * Random.Range(0.22f, 0.58f));
                Make(p, Quaternion.FromToRotation(Vector3.up, d) * Quaternion.Euler(Random.Range(-18f, 18f), Random.Range(0f, 360f), 0f));
            }
        }

        public static NkPad Make(Vector3 pos, Quaternion rot)
        {
            var go = new GameObject("Pad");
            go.transform.position = pos;
            go.transform.rotation = rot;
            float rad = Random.Range(1.35f, 2.4f);
            var steel = NkGfx.Make(new Color(0.42f, 0.45f, 0.5f), 1, false, 0.35f, 0.75f);
            var rim = NkGfx.Make(new Color(0.18f, 0.2f, 0.24f), 1, false, 0.4f, 0.6f);
            NkGfx.Part(PrimitiveType.Cylinder, go.transform, Vector3.zero, new Vector3(rad * 2f, 0.07f, rad * 2f), steel, false, "deck");
            NkGfx.Part(PrimitiveType.Cylinder, go.transform, new Vector3(0f, 0.06f, 0f), new Vector3(rad * 2.12f, 0.03f, rad * 2.12f), rim, false, "lip");
            var col = go.AddComponent<BoxCollider>();
            col.size = new Vector3(rad * 2f, 0.16f, rad * 2f);
            var rb = go.AddComponent<Rigidbody>();
            rb.useGravity = false;
            rb.mass = 14f;
            rb.linearDamping = 0.55f;
            rb.angularDamping = 1.1f;
            rb.interpolation = RigidbodyInterpolation.Interpolate;
            rb.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;
            var p = go.AddComponent<NkPad>();
            p._rb = rb;
            p.rad = rad;
            All.Add(p);
            return p;
        }

        void Awake()
        {
            if (!_rb) _rb = GetComponent<Rigidbody>();
        }

        void OnDestroy() { All.Remove(this); }

        void OnCollisionStay(Collision c)
        {
            if (!_rb) return;
            var pl = c.collider.GetComponentInParent<NkPlayer>();
            if (pl && pl.body)
                _rb.AddForce(pl.body.linearVelocity * 0.42f, ForceMode.Acceleration);
        }

        public void Hit(float dmg, Vector3 at, Vector3 dir)
        {
            if (dmg < 12f)
            {
                if (_rb) _rb.AddForceAtPosition(dir.normalized * (dmg * 1.6f + 2.5f), at, ForceMode.Impulse);
                return;
            }
            hp -= dmg;
            if (_rb) _rb.AddForceAtPosition(dir.normalized * dmg * 0.35f, at, ForceMode.Impulse);
            if (hp > 0f) return;
            Shatter();
        }

        void Shatter()
        {
            Vector3 p = transform.position;
            for (int i = 0; i < 14; i++)
            {
                var c = GameObject.CreatePrimitive(PrimitiveType.Cube);
                Object.DestroyImmediate(c.GetComponent<Collider>());
                c.transform.position = p + Random.insideUnitSphere * 0.4f;
                c.transform.rotation = Random.rotation;
                c.transform.localScale = Vector3.one * Random.Range(0.12f, 0.38f);
                c.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(new Color(0.35f, 0.38f, 0.42f), 1, false, 0.3f, 0.7f);
                var rb = c.AddComponent<Rigidbody>();
                rb.useGravity = false;
                rb.linearVelocity = Random.onUnitSphere * Random.Range(3f, 9f);
                rb.angularVelocity = Random.onUnitSphere * 6f;
                Object.Destroy(c, Random.Range(1.4f, 2.6f));
            }
            NkSfx.Boom(p);
            Destroy(gameObject);
        }

        public static bool TryStand(Vector3 p, out Vector3 n)
        {
            n = Vector3.up;
            float best = 0.62f;
            bool ok = false;
            foreach (var a in All)
            {
                if (!a) continue;
                Vector3 lp = a.transform.InverseTransformPoint(p);
                float rr = new Vector2(lp.x, lp.z).magnitude;
                if (rr > a.rad + 0.4f) continue;
                float dy = Mathf.Abs(lp.y);
                if (dy > best) continue;
                best = dy;
                n = a.transform.up * (lp.y >= 0f ? 1f : -1f);
                ok = true;
            }
            return ok;
        }

        public static bool TryStandAny(Vector3 p, out Vector3 n)
        {
            if (TryStand(p, out n)) return true;
            n = Vector3.up;
            foreach (var s in NkPlasmaStroke.All)
                if (s && s.Near(p, out n)) return true;
            return false;
        }
    }

    public class NkBlimp : MonoBehaviour
    {
        public static readonly List<NkBlimp> All = new List<NkBlimp>();
        Rigidbody _rb;
        float _lock = 8f;

        public static NkBlimp Make(Vector3 pos)
        {
            var go = new GameObject("GoldBlimp");
            go.transform.position = pos;
            var gold = NkGfx.Make(new Color(1f, 0.82f, 0.22f), 1, false, 0.65f, 0.85f);
            NkGfx.Part(PrimitiveType.Capsule, go.transform, Vector3.zero, new Vector3(0.55f, 0.85f, 0.55f), gold, false, "hull");
            NkGfx.Part(PrimitiveType.Cube, go.transform, new Vector3(0f, -0.35f, 0f), new Vector3(0.22f, 0.12f, 0.35f), gold, false, "gondola");
            NkGfx.Part(PrimitiveType.Cube, go.transform, new Vector3(0f, 0.05f, -0.42f), new Vector3(0.08f, 0.28f, 0.22f), gold, false, "fin");
            var bubble = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            Object.DestroyImmediate(bubble.GetComponent<Collider>());
            bubble.transform.SetParent(go.transform, false);
            bubble.transform.localScale = Vector3.one * 2.4f;
            bubble.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(1f, 0.85f, 0.25f, 0.18f));
            var sc = go.AddComponent<SphereCollider>();
            sc.radius = 0.7f;
            sc.isTrigger = true;
            var rb = go.AddComponent<Rigidbody>();
            rb.useGravity = false;
            rb.mass = 0.4f;
            rb.linearDamping = 0.4f;
            rb.linearVelocity = Random.onUnitSphere * 0.6f;
            var b = go.AddComponent<NkBlimp>();
            b._rb = rb;
            All.Add(b);
            return b;
        }

        void Update()
        {
            _lock -= Time.deltaTime;
            transform.Rotate(0f, 28f * Time.deltaTime, 0f, Space.Self);
            if (_rb) _rb.AddForce(Vector3.up * (Mathf.Sin(Time.time * 1.4f) * 0.6f), ForceMode.Acceleration);
        }

        void OnDestroy() { All.Remove(this); }

        public bool Pull(Vector3 p, float mag, float grab)
        {
            if (_lock > 0f) return false;
            float d = Vector3.Distance(transform.position, p);
            if (d <= grab)
            {
                var g = Object.FindAnyObjectByType<NetKnightGame>();
                if (g) g.GrantGold();
                NkSfx.Boost(p);
                Destroy(gameObject);
                return true;
            }
            if (d < mag && _rb)
                _rb.linearVelocity = Vector3.Lerp(_rb.linearVelocity, (p - transform.position).normalized * 15f, 0.28f);
            return false;
        }
    }

    public class NkMissilePickup : MonoBehaviour
    {
        public static readonly List<NkMissilePickup> All = new List<NkMissilePickup>();
        Rigidbody _rb;
        float _lock = 1.2f;

        public static NkMissilePickup Make(Vector3 pos)
        {
            var go = new GameObject("MissilePickup");
            go.transform.position = pos;
            var chrome = NkGfx.Make(new Color(0.55f, 0.78f, 0.92f), 1, false, 0.92f, 0.95f);
            var dark = NkGfx.Make(new Color(0.08f, 0.1f, 0.14f), 1, false, 0.4f, 0.7f);
            var cyan = new Color(0.2f, 0.95f, 1f);
            var body = NkGfx.Part(PrimitiveType.Cylinder, go.transform, Vector3.zero, new Vector3(0.11f, 0.28f, 0.11f), chrome, false, "body");
            body.localRotation = Quaternion.Euler(90, 0, 0);
            NkGfx.Part(PrimitiveType.Sphere, go.transform, new Vector3(0f, 0f, 0.26f), new Vector3(0.1f, 0.1f, 0.16f), chrome, false, "nose");
            NkGfx.Part(PrimitiveType.Cylinder, go.transform, new Vector3(0f, 0f, 0.08f), new Vector3(0.14f, 0.03f, 0.14f), dark, false, "collar").localRotation = Quaternion.Euler(90, 0, 0);
            for (int i = 0; i < 4; i++)
            {
                float a = i * 90f;
                var fin = NkGfx.Part(PrimitiveType.Cube, go.transform, new Vector3(0f, 0f, -0.2f), new Vector3(0.04f, 0.22f, 0.12f), dark, false, "fin" + i);
                fin.localRotation = Quaternion.Euler(0f, 0f, a);
                fin.localPosition = Quaternion.Euler(0f, 0f, a) * new Vector3(0f, 0.12f, -0.2f);
            }
            var jet = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            Object.DestroyImmediate(jet.GetComponent<Collider>());
            jet.transform.SetParent(go.transform, false);
            jet.transform.localPosition = new Vector3(0f, 0f, -0.32f);
            jet.transform.localScale = Vector3.one * 0.12f;
            jet.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(0.2f, 0.85f, 1f, 0.9f));
            var lite = go.AddComponent<Light>();
            lite.type = LightType.Point;
            lite.color = cyan;
            lite.range = 2.2f;
            lite.intensity = 1.1f;
            var orb = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            Object.DestroyImmediate(orb.GetComponent<Collider>());
            orb.transform.SetParent(go.transform, false);
            orb.transform.localScale = Vector3.one * 1.15f;
            orb.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(0.25f, 0.85f, 1f, 0.16f));
            orb.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            var sc = go.AddComponent<SphereCollider>();
            sc.radius = 0.42f;
            sc.isTrigger = true;
            var rb = go.AddComponent<Rigidbody>();
            rb.useGravity = false;
            rb.mass = 0.25f;
            rb.linearDamping = 0.35f;
            rb.linearVelocity = Random.onUnitSphere * 0.5f;
            rb.angularVelocity = Random.onUnitSphere * 0.8f;
            var p = go.AddComponent<NkMissilePickup>();
            p._rb = rb;
            All.Add(p);
            return p;
        }

        void Update()
        {
            _lock -= Time.deltaTime;
            transform.Rotate(0f, 70f * Time.deltaTime, 0f, Space.Self);
        }

        void OnDestroy() { All.Remove(this); }

        public bool Pull(Vector3 p, float mag, float grab)
        {
            if (_lock > 0f) return false;
            float d = Vector3.Distance(transform.position, p);
            if (d <= grab)
            {
                var g = Object.FindAnyObjectByType<NetKnightGame>();
                if (g)
                {
                    if (g.missiles >= 100) g.Hint("Missile racks full.");
                    else
                    {
                        g.missiles++;
                        g.Hint("Seeking missile +1  (" + g.missiles + ")");
                    }
                }
                NkSfx.Missile(p);
                Destroy(gameObject);
                return true;
            }
            if (d < mag && _rb)
                _rb.linearVelocity = Vector3.Lerp(_rb.linearVelocity, (p - transform.position).normalized * 15f, 0.28f);
            return false;
        }
    }

    public class NkHealWell : MonoBehaviour
    {
        public static readonly List<NkHealWell> All = new List<NkHealWell>();
        public float rad = 6.4f;
        readonly List<Material> _mats = new List<Material>();
        float _powAcc, _hpAcc;

        public static NkHealWell Make(Vector3 pos, float rad)
        {
            var go = new GameObject("HealWell");
            go.transform.position = pos;
            var sc = go.AddComponent<SphereCollider>();
            sc.isTrigger = true;
            sc.radius = rad;
            var w = go.AddComponent<NkHealWell>();
            w.rad = rad;
            var tint = new Color(0.35f, 0.85f, 1f, 0.15f);
            var mat = NkGfx.Additive(tint);
            w._mats.Add(mat);
            void Ring(Vector3 euler)
            {
                const int segs = 20;
                for (int i = 0; i < segs; i++)
                {
                    float a0 = i / (float)segs * Mathf.PI * 2f;
                    float a1 = (i + 1) / (float)segs * Mathf.PI * 2f;
                    Vector3 p0 = Quaternion.Euler(euler) * new Vector3(Mathf.Cos(a0), 0f, Mathf.Sin(a0)) * rad;
                    Vector3 p1 = Quaternion.Euler(euler) * new Vector3(Mathf.Cos(a1), 0f, Mathf.Sin(a1)) * rad;
                    Vector3 mid = (p0 + p1) * 0.5f;
                    float len = Vector3.Distance(p0, p1);
                    var bar = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    Object.DestroyImmediate(bar.GetComponent<Collider>());
                    bar.transform.SetParent(go.transform, false);
                    bar.transform.localPosition = mid;
                    bar.transform.localRotation = Quaternion.LookRotation((p1 - p0).normalized, Quaternion.Euler(euler) * Vector3.up);
                    bar.transform.localScale = new Vector3(0.045f, 0.045f, len);
                    bar.GetComponent<Renderer>().sharedMaterial = mat;
                    bar.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                }
            }
            Ring(Vector3.zero);
            Ring(new Vector3(90f, 0f, 0f));
            Ring(new Vector3(0f, 0f, 90f));
            All.Add(w);
            return w;
        }

        void OnDestroy() { All.Remove(this); }

        public void Tick(float dt, Vector3 player, NetKnightGame game)
        {
            float u = 0.5f + 0.5f * Mathf.Sin(Time.time * 0.55f);
            var c = Color.Lerp(new Color(0.32f, 0.85f, 1f, 0.15f), new Color(1f, 0.42f, 0.78f, 0.15f), u);
            for (int i = 0; i < _mats.Count; i++)
            {
                var m = _mats[i];
                if (!m) continue;
                if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", c);
                m.color = c;
            }
            if (game == null || (player - transform.position).sqrMagnitude > rad * rad) return;
            if (game.energy < game.maxEnergy)
            {
                _powAcc += 30f * dt;
                while (_powAcc >= 1f && game.energy < game.maxEnergy)
                {
                    game.energy++;
                    _powAcc -= 1f;
                }
            }
            if (game.playerHearts < game.playerMaxHearts)
            {
                _hpAcc += game.playerMaxHearts * 0.04f * dt;
                while (_hpAcc >= 1f && game.playerHearts < game.playerMaxHearts)
                {
                    game.playerHearts++;
                    _hpAcc -= 1f;
                }
            }
        }
    }
}
