using System.Collections.Generic;
using UnityEngine;

namespace NetKnight
{
    public class NkLemur : MonoBehaviour
    {
        public static readonly List<NkLemur> All = new List<NkLemur>();
        public float hp = 2.85f, maxHp = 2.85f;
        public NkSphere sphere;
        public Vector3 Aim => _head ? _head.position : transform.position;
        Transform _head, _jaw, _tail, _body;
        Transform[] _legs;
        float _shot, _spin, _unseen, _wail, _shieldHp = 2f;
        Transform _shield;
        bool _guard;
        Transform _tube;
        Vector3 _crawl;
        float _packPhase;
        int _pack;

        public static void SpawnPack(NkWorld world, Vector3 at, int n)
        {
            if (world == null) return;
            world.InsideAny(at, out var sph, out _, out _);
            if (sph == null && world.spheres.Count > 0) sph = world.spheres[0];
            if (sph == null) return;
            n = Mathf.Clamp(n, 1, 5);
            int pack = All.Count;
            for (int i = 0; i < n; i++)
            {
                Vector3 dir = (at - sph.c).sqrMagnitude > 0.01f ? (at - sph.c).normalized : Random.onUnitSphere;
                if (i > 0) dir = Quaternion.AngleAxis(i * (28f + Random.Range(-6f, 6f)), Vector3.up) * dir;
                Vector3 p = sph.c + dir.normalized * sph.r;
                Make(p, sph, pack);
            }
        }

        public static NkLemur Make(Vector3 pos, NkSphere sph, int pack)
        {
            var go = new GameObject("OwlLemur");
            go.transform.position = pos;
            var rb = go.AddComponent<Rigidbody>();
            rb.useGravity = false;
            rb.mass = 6.5f;
            rb.linearDamping = 3.2f;
            rb.angularDamping = 6f;
            rb.constraints = RigidbodyConstraints.FreezeRotation;
            rb.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;
            var col = go.AddComponent<CapsuleCollider>();
            col.radius = 0.22f;
            col.height = 0.7f;
            col.direction = 1;
            col.center = new Vector3(0f, 0.08f, 0f);
            var l = go.AddComponent<NkLemur>();
            l.sphere = sph;
            l._pack = pack;
            l._packPhase = pack * 0.37f + Random.value * 6f;
            l.Build();
            All.Add(l);
            return l;
        }

        void Build()
        {
            var steel = new Color(0.62f, 0.58f, 0.52f);
            var dark = new Color(0.18f, 0.16f, 0.14f);
            var brass = new Color(0.72f, 0.48f, 0.16f);
            var visor = new Color(1f, 0.42f, 0.08f);
            var fur = new Color(0.42f, 0.28f, 0.16f);
            _body = NkGfx.Part(PrimitiveType.Sphere, transform, new Vector3(0f, 0.02f, 0f), new Vector3(0.42f, 0.38f, 0.5f), fur, false, 0.78f, 0.08f, false, "torso");
            NkGfx.Part(PrimitiveType.Sphere, _body, new Vector3(0f, 0.02f, 0.04f), new Vector3(0.7f, 0.55f, 0.62f), steel, false, 0.35f, 0.72f, false, "plating");
            _head = new GameObject("head").transform;
            _head.SetParent(transform, false);
            _head.localPosition = new Vector3(0f, 0.28f, 0.08f);
            NkGfx.Part(PrimitiveType.Sphere, _head, Vector3.zero, new Vector3(0.38f, 0.32f, 0.38f), fur, false, 0.75f, 0.06f, false, "skull");
            NkGfx.Part(PrimitiveType.Sphere, _head, new Vector3(0f, 0.02f, 0.02f), new Vector3(0.78f, 0.55f, 0.7f), steel, false, 0.4f, 0.8f, false, "helm");
            NkGfx.Part(PrimitiveType.Cube, _head, new Vector3(0f, 0.04f, 0.16f), new Vector3(0.28f, 0.08f, 0.08f), visor, true, 0.2f, 0f, false, "visor");
            var eL = NkGfx.Part(PrimitiveType.Sphere, _head, new Vector3(-0.08f, 0.05f, 0.14f), Vector3.one * 0.1f, visor, true, 0.2f, 0f, false, "eyeL");
            var eR = NkGfx.Part(PrimitiveType.Sphere, _head, new Vector3(0.08f, 0.05f, 0.14f), Vector3.one * 0.1f, visor, true, 0.2f, 0f, false, "eyeR");
            foreach (var e in new[] { eL, eR })
            {
                var lite = e.gameObject.AddComponent<Light>();
                lite.type = LightType.Point;
                lite.color = visor;
                lite.range = 2.4f;
                lite.intensity = 1.1f;
            }
            NkGfx.Part(PrimitiveType.Cube, _head, new Vector3(-0.16f, 0.14f, -0.02f), new Vector3(0.12f, 0.16f, 0.04f), dark, false, 0.4f, 0.2f, false, "tuftL");
            NkGfx.Part(PrimitiveType.Cube, _head, new Vector3(0.16f, 0.14f, -0.02f), new Vector3(0.12f, 0.16f, 0.04f), dark, false, 0.4f, 0.2f, false, "tuftR");
            NkGfx.Part(PrimitiveType.Sphere, _head, new Vector3(-0.2f, 0.02f, -0.02f), new Vector3(0.16f, 0.22f, 0.06f), fur, false, 0.7f, 0.05f, false, "earL");
            NkGfx.Part(PrimitiveType.Sphere, _head, new Vector3(0.2f, 0.02f, -0.02f), new Vector3(0.16f, 0.22f, 0.06f), fur, false, 0.7f, 0.05f, false, "earR");
            _jaw = NkGfx.Part(PrimitiveType.Cube, _head, new Vector3(0f, -0.08f, 0.1f), new Vector3(0.16f, 0.06f, 0.14f), brass, false, 0.4f, 0.55f, false, "beak");
            NkGfx.Part(PrimitiveType.Cube, _head, new Vector3(0f, 0.02f, -0.16f), new Vector3(0.22f, 0.08f, 0.18f), dark, false, 0.3f, 0.4f, false, "ruff");
            _legs = new Transform[4];
            for (int i = 0; i < 4; i++)
            {
                float s = i < 2 ? -1f : 1f;
                float z = (i % 2 == 0) ? 0.12f : -0.14f;
                var hip = new GameObject("hip" + i).transform;
                hip.SetParent(transform, false);
                hip.localPosition = new Vector3(s * 0.14f, -0.06f, z);
                NkGfx.Part(PrimitiveType.Sphere, hip, Vector3.zero, Vector3.one * 0.1f, steel, false, 0.4f, 0.75f, false, "joint");
                var shin = NkGfx.Part(PrimitiveType.Cylinder, hip, new Vector3(s * 0.04f, -0.1f, 0f), new Vector3(0.05f, 0.1f, 0.05f), dark, false, 0.35f, 0.5f, false, "shin");
                shin.localRotation = Quaternion.Euler(12f * (z > 0f ? -1f : 1f), 0f, s * 8f);
                NkGfx.Part(PrimitiveType.Sphere, hip, new Vector3(s * 0.05f, -0.2f, 0.02f), new Vector3(0.1f, 0.06f, 0.14f), brass, false, 0.4f, 0.6f, false, "paw");
                _legs[i] = hip;
            }
            _tail = new GameObject("tail").transform;
            _tail.SetParent(transform, false);
            _tail.localPosition = new Vector3(0f, 0.04f, -0.24f);
            Transform tparent = _tail;
            for (int i = 0; i < 5; i++)
            {
                var ring = NkGfx.Part(PrimitiveType.Sphere, tparent, i == 0 ? Vector3.zero : new Vector3(0f, 0.01f, -0.07f),
                    Vector3.one * (0.1f - i * 0.012f), i % 2 == 0 ? fur : steel, false, 0.7f, i % 2 == 0 ? 0.05f : 0.7f, false, "t" + i);
                tparent = ring;
            }
            var sh = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            Object.Destroy(sh.GetComponent<Collider>());
            sh.transform.SetParent(transform, false);
            sh.transform.localScale = Vector3.one * 0.95f;
            sh.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(new Color(1f, 0.88f, 0.12f, 0.22f), 0.22f, true);
            _shield = sh.transform;
        }

        void OnDestroy() { All.Remove(this); }

        public void Tick(float dt, NkPlayer player, NetKnightGame game, NkWorld world)
        {
            Vector3 you = player && player.cam ? player.cam.position : (player ? player.transform.position + Vector3.up : transform.position);
            float pd = Vector3.Distance(transform.position, you);
            bool see = pd < 38f;
            if (see) _unseen = 0f;
            else _unseen += dt;

            bool yanked = NkLassoGrab.Held(this);
            if (!yanked && world != null && (_guard || _unseen > 22f))
                PickTube(world);

            if (!yanked)
            {
                if (_guard && _tube)
                    GuardTube(dt, you, pd);
                else
                    Crawl(dt, you, pd, world);
            }

            Animate(dt, you);
            Fire(dt, you, pd, game);

            _wail -= dt;
            if (_wail <= 0f && pd < 16f)
            {
                _wail = Random.Range(3.6f, 6.2f);
                NkSfx.MonkeyWail(transform.position);
            }
        }

        void Crawl(float dt, Vector3 you, float pd, NkWorld world)
        {
            if (sphere == null && world != null) world.InsideAny(transform.position, out sphere, out _, out _);
            if (sphere == null) return;
            Vector3 n = (transform.position - sphere.c);
            if (n.sqrMagnitude < 0.01f) n = Vector3.up;
            n.Normalize();
            Vector3 want = transform.position;
            if (pd < 42f)
            {
                Vector3 to = Vector3.ProjectOnPlane(you - transform.position, n);
                if (to.sqrMagnitude > 0.04f)
                {
                    float hold = pd < 8f ? -1.1f : 1.4f;
                    want += to.normalized * (hold * dt);
                }
                Vector3 flank = Vector3.Cross(n, to.sqrMagnitude > 0.01f ? to.normalized : transform.forward);
                want += flank.normalized * (Mathf.Sin(Time.time * 0.8f + _packPhase) * 1.6f * dt);
            }
            else
            {
                Vector3 wander = Quaternion.AngleAxis(_packPhase * 20f + Time.time * 18f, n) * Vector3.Cross(n, Vector3.up);
                if (wander.sqrMagnitude < 0.01f) wander = Vector3.Cross(n, Vector3.right);
                want += wander.normalized * (1.8f * dt);
            }
            n = (want - sphere.c).normalized;
            transform.position = sphere.c + n * sphere.r;
            Vector3 tan = Vector3.ProjectOnPlane(want - transform.position + n, n);
            if (tan.sqrMagnitude > 0.0001f)
            {
                var look = Quaternion.LookRotation(tan.normalized, n);
                transform.rotation = Quaternion.Slerp(transform.rotation, look, dt * 4f);
            }
            else
                transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.FromToRotation(Vector3.up, n), dt * 3f);
        }

        void PickTube(NkWorld world)
        {
            if (_tube && _tube.gameObject.activeInHierarchy) { _guard = true; return; }
            Transform best = null;
            float bestD = 999f;
            foreach (var t in world.tubes)
            {
                if (!t) continue;
                float d = Vector3.Distance(transform.position, t.position);
                if (d < bestD) { bestD = d; best = t; }
            }
            _tube = best;
            if (_tube && _unseen > 22f) _guard = true;
        }

        void GuardTube(float dt, Vector3 you, float pd)
        {
            if (!_tube) { _guard = false; return; }
            Vector3 lp = _tube.InverseTransformPoint(transform.position);
            float along = Mathf.Clamp(lp.y, -4f, 4f);
            float ang = _packPhase + Time.time * 0.15f;
            Vector3 local = new Vector3(Mathf.Cos(ang) * (NkWorld.TubeRad * 0.72f), along, Mathf.Sin(ang) * (NkWorld.TubeRad * 0.72f));
            Vector3 want = _tube.TransformPoint(local);
            transform.position = Vector3.Lerp(transform.position, want, dt * 1.8f);
            Vector3 up = (transform.position - _tube.TransformPoint(new Vector3(0f, local.y, 0f))).normalized;
            Vector3 fwd = Vector3.ProjectOnPlane(you - transform.position, up);
            if (fwd.sqrMagnitude < 0.01f) fwd = _tube.up;
            transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(fwd.normalized, up), dt * 4f);
            if (pd < 14f) _unseen = 0f;
        }

        void Animate(float dt, Vector3 you)
        {
            Vector3 to = you - (_head ? _head.position : transform.position);
            if (_head && to.sqrMagnitude > 0.01f)
            {
                Vector3 f = to.normalized;
                Vector3 up = transform.up;
                if (Mathf.Abs(Vector3.Dot(f, up)) > 0.97f) up = transform.right;
                _head.rotation = Quaternion.Slerp(_head.rotation, Quaternion.LookRotation(f, up), dt * 7f);
            }
            _spin += dt * 9f;
            if (_jaw) _jaw.localRotation = Quaternion.Euler(Mathf.Sin(_spin * 1.6f) * 8f, 0f, 0f);
            if (_tail) _tail.localRotation = Quaternion.Euler(Mathf.Sin(Time.time * 4f) * 12f, Mathf.Sin(Time.time * 3.2f) * 18f, 0f);
            if (_body) _body.localScale = new Vector3(0.42f * (1f + Mathf.Sin(Time.time * 5f) * 0.04f), 0.38f, 0.5f);
            if (_legs != null)
            {
                for (int i = 0; i < _legs.Length; i++)
                {
                    if (!_legs[i]) continue;
                    float g = Mathf.Sin(Time.time * 8f + i * 1.6f) * 16f;
                    _legs[i].localRotation = Quaternion.Euler(g, 0f, (i < 2 ? -1f : 1f) * 6f);
                }
            }
            if (_shield)
            {
                _shield.Rotate(0f, 40f * dt, 0f, Space.Self);
                float a = 0.12f + Mathf.PingPong(Time.time * 0.8f, 0.1f);
                var r = _shield.GetComponent<Renderer>();
                if (r && r.sharedMaterial)
                {
                    var c = new Color(1f, 0.88f, 0.12f, _shieldHp > 0f ? a : 0f);
                    if (r.sharedMaterial.HasProperty("_BaseColor")) r.sharedMaterial.SetColor("_BaseColor", c);
                    r.sharedMaterial.color = c;
                }
            }
        }

        void Fire(float dt, Vector3 you, float pd, NetKnightGame game)
        {
            _shot -= dt;
            if (_shot > 0f || pd < 2.5f || pd > 36f || !_head) return;
            _shot = Random.Range(2.55f, 3.15f);
            Vector3 dir = (you - _head.position).normalized;
            NkLemurRocket.Fire(_head.position + dir * 0.28f, dir, you);
        }

        public bool Hurt(float dmg)
        {
            if (_shieldHp > 0f)
            {
                _shieldHp -= 1f;
                if (_shield && _shield.GetComponent<Renderer>())
                    _shield.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(new Color(1f, 0.55f, 0.18f, 0.32f), 0.32f, true);
                if (_shieldHp <= 0f && _shield) { Object.Destroy(_shield.gameObject); _shield = null; }
                return false;
            }
            hp -= dmg;
            if (hp > 0f) return false;
            NkCombat.BurstLoot(transform.position, Random.Range(1, 3), Random.Range(1, 3));
            var g = Object.FindAnyObjectByType<NetKnightGame>();
            if (g) g.AddKillScore(18);
            NkSfx.Boom(transform.position);
            Destroy(gameObject);
            return true;
        }
    }

    public class NkLemurRocket : MonoBehaviour
    {
        public static readonly List<NkLemurRocket> All = new List<NkLemurRocket>();
        public float hp = 1.5f;
        Vector3 _last;
        float _life = 5.2f;
        const float Spd = 7.75f;

        public static void Fire(Vector3 origin, Vector3 dir, Vector3 target)
        {
            var go = new GameObject("LemurRocket");
            go.transform.position = origin;
            go.transform.rotation = Quaternion.LookRotation(dir);
            NkGfx.Part(PrimitiveType.Cylinder, go.transform, Vector3.zero, new Vector3(0.055f, 0.11f, 0.055f),
                new Color(0.55f, 0.42f, 0.12f), false, 0.4f, 0.55f, false, "body").localRotation = Quaternion.Euler(90, 0, 0);
            var flame = NkGfx.Part(PrimitiveType.Sphere, go.transform, new Vector3(0, 0, -0.12f), Vector3.one * 0.06f,
                new Color(1f, 0.45f, 0.1f), true, 0.2f, 0f, false, "jet");
            flame.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(1f, 0.4f, 0.08f, 0.9f));
            var col = go.AddComponent<SphereCollider>();
            col.radius = 0.09f;
            var r = go.AddComponent<NkLemurRocket>();
            r._last = target;
            All.Add(r);
            NkSfx.Missile(origin);
        }

        void OnDestroy() { All.Remove(this); }

        public bool Hurt(float dmg)
        {
            hp -= dmg;
            if (hp > 0f) return false;
            NkWeapons.Sparks(transform.position);
            Destroy(gameObject);
            return true;
        }

        void Update()
        {
            float dt = Time.deltaTime;
            _life -= dt;
            var pl = Object.FindAnyObjectByType<NkPlayer>();
            if (pl) _last = pl.transform.position + Vector3.up;
            Vector3 to = _last - transform.position;
            if (to.sqrMagnitude > 0.01f)
                transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(to), dt * 2.4f);
            Vector3 step = transform.forward * Spd * dt;
            NkWindow.Threat(transform.position, transform.forward * Spd);
            var g = Object.FindAnyObjectByType<NetKnightGame>();
            var weap = g && g.player ? g.player.weapons : null;
            if (weap && NkCombat.NearSword(weap, transform.position, 0.12f))
            {
                transform.rotation = Quaternion.LookRotation(NkCombat.BounceOffSword(transform.forward, weap, transform.position));
                NkWeapons.Sparks(transform.position);
                NkSfx.Shield(transform.position);
                step = transform.forward * Spd * dt;
            }
            else if (Physics.SphereCast(transform.position, 0.08f, transform.forward, out var hit, step.magnitude + 0.05f))
            {
                if (NkCombat.HitsSword(hit.collider, weap))
                {
                    transform.rotation = Quaternion.LookRotation(NkCombat.BounceOffSword(transform.forward, weap, hit.point));
                    NkWeapons.Sparks(hit.point);
                    step = transform.forward * Spd * dt;
                }
                else
                {
                    var victim = hit.collider.GetComponentInParent<NkPlayer>();
                    if (victim && g) g.HurtPlayer(1, transform.forward, 0.7f);
                    else NkCombat.HurtAny(hit.collider.transform, 4f, transform.forward, hit.point, g);
                    NkWeapons.Blast(transform.position, -transform.forward, 3f, 0.8f, false, g, transform, 0.12f);
                    Destroy(gameObject);
                    return;
                }
            }
            transform.position += step;
            if (_life <= 0f) Destroy(gameObject);
        }
    }
}
