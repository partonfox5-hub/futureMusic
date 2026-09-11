using System.Collections.Generic;
using UnityEngine;

namespace NetKnight
{
    public class NkLaser
    {
        public Vector3 p, v;
        public float life;
        public Transform vis;
    }

    public enum NkDroneKind { Blue, Green, Red, Grey, Yellow, Purple, Missile }

    public class NkDrone : MonoBehaviour
    {
        public static readonly List<NkDrone> All = new List<NkDrone>();
        public float hp = 3f, maxHp = 3f;
        public Rigidbody body;
        public NkDroneKind kind;
        public int swarm;
        Transform _saucer, _shield;
        float _shot, _blink, _tackle, _misCd, _shieldHp, _spin;
        Vector3 _dash;
        int _slot;

        public static NkDrone Make(Vector3 pos, int swarm = 0, NkDroneKind kind = (NkDroneKind)(-1))
        {
            if ((int)kind < 0) kind = (NkDroneKind)Random.Range(0, 7);
            var go = new GameObject("Drone");
            go.transform.position = pos;
            float size = Random.Range(0.88f, 1.18f);
            if (kind == NkDroneKind.Missile) size *= 1.12f;
            Color col = Palette(kind);
            Color silver = Color.Lerp(new Color(0.72f, 0.75f, 0.8f), col, 0.28f);
            Color domeC = Color.Lerp(new Color(0.25f, 0.55f, 1f), col, 0.18f);
            var saucer = new GameObject("saucer").transform;
            saucer.SetParent(go.transform, false);
            var disc = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            Object.Destroy(disc.GetComponent<Collider>());
            disc.transform.SetParent(saucer, false);
            disc.transform.localScale = new Vector3(0.95f, 0.045f, 0.95f) * size;
            disc.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(silver, 1, false, 0.72f, 0.85f);
            NkGfx.HiBox(saucer, Vector3.zero, new Vector3(0.72f, 0.07f, 0.72f) * size, silver, "core");
            for (int s = 0; s < 4; s++)
            {
                var stripe = NkGfx.HiBox(saucer, new Vector3(0f, 0.048f * size, 0f), new Vector3(0.94f, 0.012f, 0.11f) * size, col, "stripe" + s);
                stripe.localRotation = Quaternion.Euler(0f, s * 45f, 0f);
            }
            for (int t = 0; t < 12; t++)
            {
                if ((t & 1) == 0) continue;
                float a = t / 12f * Mathf.PI * 2f;
                var tick = NkGfx.HiBox(saucer, new Vector3(Mathf.Cos(a) * 0.42f, 0.046f, Mathf.Sin(a) * 0.42f) * size,
                    new Vector3(0.09f, 0.018f, 0.16f) * size, col, "tick" + t);
                tick.localRotation = Quaternion.Euler(0f, -a * Mathf.Rad2Deg, 0f);
            }
            var dome = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            Object.Destroy(dome.GetComponent<Collider>());
            dome.transform.SetParent(saucer, false);
            dome.transform.localPosition = new Vector3(0f, 0.07f * size, 0f);
            dome.transform.localScale = Vector3.one * (0.42f * size);
            dome.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(domeC, 1, true, 0.85f, 0.2f);
            int fins = 6;
            for (int i = 0; i < fins; i++)
            {
                float a = i / (float)fins * Mathf.PI * 2f;
                var fin = NkGfx.HiBox(saucer, new Vector3(Mathf.Cos(a) * 0.38f, 0.01f, Mathf.Sin(a) * 0.38f) * size,
                    new Vector3(0.16f, 0.04f, 0.22f) * size, col, "fin" + i);
                fin.localRotation = Quaternion.Euler(0f, -a * Mathf.Rad2Deg, 0f);
                var lite = fin.gameObject.AddComponent<Light>();
                lite.type = LightType.Point;
                lite.color = col;
                lite.range = 1.8f;
                lite.intensity = 1.35f;
            }
            if (kind == NkDroneKind.Missile)
                NkGfx.HiBox(saucer, new Vector3(0f, 0.12f, -0.12f) * size, new Vector3(0.16f, 0.1f, 0.28f) * size, col, "rack");
            var hit = go.AddComponent<SphereCollider>();
            hit.radius = 0.32f * size;
            var rb = go.AddComponent<Rigidbody>();
            rb.useGravity = false;
            rb.mass = kind == NkDroneKind.Blue ? 2.4f : 1.6f;
            rb.linearDamping = 2.6f;
            rb.angularDamping = 4f;
            rb.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;
            var d = go.AddComponent<NkDrone>();
            d.body = rb;
            d._saucer = saucer;
            d.kind = kind;
            d.swarm = swarm;
            d._slot = All.Count;
            d._spin = Random.Range(48f, 72f) * (Random.value < 0.5f ? -1f : 1f);
            d.maxHp = (kind == NkDroneKind.Blue ? 6.5f : kind == NkDroneKind.Missile ? 8f : 3f) * 0.95f;
            d.hp = d.maxHp;
            if (kind == NkDroneKind.Yellow)
            {
                d._shieldHp = 2f;
                var sh = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                Object.Destroy(sh.GetComponent<Collider>());
                sh.transform.SetParent(go.transform, false);
                sh.transform.localScale = Vector3.one * 1.2f * size;
                sh.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(new Color(col.r, col.g, col.b, 0.25f), 0.25f, true);
                d._shield = sh.transform;
            }
            All.Add(d);
            return d;
        }

        static Color Palette(NkDroneKind k)
        {
            switch (k)
            {
                case NkDroneKind.Blue: return new Color(0.12f, 0.42f, 1f);
                case NkDroneKind.Green: return new Color(0.08f, 0.92f, 0.22f);
                case NkDroneKind.Red: return new Color(1f, 0.12f, 0.08f);
                case NkDroneKind.Grey: return new Color(0.78f, 0.8f, 0.84f);
                case NkDroneKind.Yellow: return new Color(1f, 0.88f, 0.06f);
                case NkDroneKind.Purple: return new Color(0.68f, 0.12f, 1f);
                default: return new Color(1f, 0.45f, 0.08f);
            }
        }

        void OnDestroy() { All.Remove(this); }

        public void Tick(float dt, Vector3 player, NkWeapons weap, List<NkLaser> lasers)
        {
            if (!body) return;
            if (NkLassoGrab.Held(this))
            {
                if (_saucer) _saucer.Rotate(0f, _spin * dt, 0f, Space.Self);
                return;
            }
            var to = player - transform.position;
            float dist = to.magnitude;
            Vector3 dir = dist > 0.01f ? to / dist : transform.forward;
            int mates = 0;
            Vector3 mid = Vector3.zero, sep = Vector3.zero;
            foreach (var o in All)
            {
                if (!o || o == this || o.swarm != swarm) continue;
                mates++;
                mid += o.transform.position;
                Vector3 d = transform.position - o.transform.position;
                float m = d.magnitude;
                if (m > 0.05f && m < 2.4f) sep += d.normalized * (2.4f - m);
            }
            Vector3 center = mates > 0 ? mid / mates : transform.position;
            float ring = 2.1f + (mates * 0.12f);
            float ang = _slot * 0.9f + Time.time * 0.35f;
            Vector3 slot = center + new Vector3(Mathf.Cos(ang), 0f, Mathf.Sin(ang)) * ring;
            float hold = kind == NkDroneKind.Green || kind == NkDroneKind.Missile ? 7.2f : 8.4f;
            Vector3 holdPos = player + Vector3.up * 0.4f - dir * hold;
            Vector3 target = Vector3.Lerp(slot, holdPos, dist > 14f ? 0.85f : 0.35f) + sep * 0.55f;
            Vector3 error = target - transform.position;
            float spd = kind == NkDroneKind.Green || kind == NkDroneKind.Missile ? 5.4f : 4.0f;
            Vector3 wantVel = Vector3.ClampMagnitude(error * 1.8f, spd);
            _tackle -= dt;
            if ((kind == NkDroneKind.Purple || kind == NkDroneKind.Missile) && dist < 8.5f && _tackle <= 0f)
            {
                _tackle = Random.Range(3.2f, 4.8f);
                _dash = dir * (14f * (kind == NkDroneKind.Missile ? 1.1f : 1f));
            }
            if (_dash.sqrMagnitude > 0.4f)
            {
                wantVel += _dash;
                _dash = Vector3.MoveTowards(_dash, Vector3.zero, dt * 9f);
            }
            body.linearVelocity = Vector3.MoveTowards(body.linearVelocity, wantVel, 16f * dt);
            Vector3 v = body.linearVelocity;
            if (v.sqrMagnitude > 0.04f)
            {
                var look = Quaternion.LookRotation(v.normalized, Vector3.up);
                transform.rotation = Quaternion.Slerp(transform.rotation, look, dt * 5f);
            }
            if (_saucer) _saucer.Rotate(0f, _spin * dt, 0f, Space.Self);

            if (kind == NkDroneKind.Grey)
            {
                _blink -= dt;
                if (_blink <= 0f)
                {
                    _blink = Random.Range(2.2f, 3.8f);
                    Blink();
                }
            }

            _shot -= dt;
            _misCd -= dt;
            float fireGap = kind == NkDroneKind.Red ? 0.82f : 1.4f;
            if (_shot <= 0 && dist > 1.5f && dist < 28f)
            {
                _shot = Random.Range(fireGap, fireGap + 1.1f);
                FireLaser(player, dist, weap, lasers);
            }
            if (kind == NkDroneKind.Missile && _misCd <= 0f && dist > 6f && dist < 32f)
            {
                _misCd = Random.Range(5.5f, 7.5f);
                NkSwarmRocket.Fire(transform.position + dir * 0.4f, dir, player);
            }
        }

        void Blink()
        {
            Vector3 dest = transform.position + Random.onUnitSphere * Random.Range(2.2f, 4.5f);
            for (int i = 0; i < 10; i++)
            {
                var p = GameObject.CreatePrimitive(PrimitiveType.Cube);
                Object.DestroyImmediate(p.GetComponent<Collider>());
                p.transform.position = transform.position + Random.insideUnitSphere * 0.25f;
                p.transform.localScale = Vector3.one * Random.Range(0.04f, 0.11f);
                p.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(new Color(0.7f, 0.9f, 1f), 1, true);
                Object.Destroy(p, 0.18f);
            }
            transform.position = dest;
            if (body) { body.position = dest; body.linearVelocity *= 0.2f; }
            for (int i = 0; i < 10; i++)
            {
                var p = GameObject.CreatePrimitive(PrimitiveType.Cube);
                Object.DestroyImmediate(p.GetComponent<Collider>());
                p.transform.position = dest + Random.insideUnitSphere * 0.25f;
                p.transform.localScale = Vector3.one * Random.Range(0.04f, 0.11f);
                p.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(new Color(0.7f, 0.9f, 1f), 1, true);
                Object.Destroy(p, 0.18f);
            }
        }

        void FireLaser(Vector3 player, float dist, NkWeapons weap, List<NkLaser> lasers)
        {
            var dir = (player - transform.position).normalized;
            if (weap && weap.sword && Physics.Raycast(transform.position, dir, out var block, dist))
            {
                if (block.collider.transform.IsChildOf(weap.sword) || block.collider.transform == weap.sword)
                {
                    Spark(block.point);
                    return;
                }
            }
            var l = GameObject.CreatePrimitive(PrimitiveType.Cube);
            Object.Destroy(l.GetComponent<Collider>());
            l.transform.position = transform.position + dir * 0.4f;
            l.transform.localScale = new Vector3(0.04f, 0.04f, 0.7f);
            l.transform.rotation = Quaternion.LookRotation(dir);
            l.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(1f, 0.15f, 0.2f, 0.95f));
            lasers.Add(new NkLaser { p = l.transform.position, v = dir * 28f, life = 1.6f, vis = l.transform });
        }

        public bool Hurt(float dmg)
        {
            if (kind == NkDroneKind.Yellow && _shieldHp > 0f)
            {
                _shieldHp -= 1f;
                if (_shield && _shield.GetComponent<Renderer>())
                {
                    var r = _shield.GetComponent<Renderer>();
                    r.sharedMaterial = NkGfx.Make(new Color(1f, 0.55f, 0.18f, 0.32f), 0.32f, true);
                }
                if (_shieldHp <= 0f && _shield) { Object.Destroy(_shield.gameObject); _shield = null; }
                return false;
            }
            hp -= dmg;
            if (hp > 0) return false;
            Spark(transform.position);
            SpillLoot();
            var g = Object.FindAnyObjectByType<NetKnightGame>();
            if (g) g.AddKillScore(25);
            Destroy(gameObject);
            return true;
        }

        public void SpillLoot()
        {
            if (!NkCombat.CanSpawn) return;
            NkCombat.BurstLoot(transform.position, Random.Range(8, 16), Random.Range(4, 9));
        }

        static void Spark(Vector3 p)
        {
            var s = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            Object.Destroy(s.GetComponent<Collider>());
            s.transform.position = p;
            s.transform.localScale = Vector3.one * 0.2f;
            s.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(1f, 0.9f, 0.4f, 0.9f));
            Object.Destroy(s, 0.18f);
        }
    }

    public class NkSwarmRocket : MonoBehaviour
    {
        public static readonly List<NkSwarmRocket> All = new List<NkSwarmRocket>();
        public float hp = 2f;
        Vector3 _last;
        float _life = 4.2f;
        const float Spd = 8.2f;

        public static void Fire(Vector3 origin, Vector3 dir, Vector3 target)
        {
            var go = new GameObject("SwarmRocket");
            go.transform.position = origin;
            go.transform.rotation = Quaternion.LookRotation(dir);
            NkGfx.Part(PrimitiveType.Cylinder, go.transform, Vector3.zero, new Vector3(0.07f, 0.14f, 0.07f),
                new Color(0.75f, 0.15f, 0.12f), false, 0.4f, 0.5f, false, "body").localRotation = Quaternion.Euler(90, 0, 0);
            var flame = NkGfx.Part(PrimitiveType.Sphere, go.transform, new Vector3(0, 0, -0.16f), Vector3.one * 0.08f,
                new Color(1f, 0.4f, 0.1f), true, 0.2f, 0f, false, "jet");
            flame.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(1f, 0.35f, 0.08f, 0.9f));
            var col = go.AddComponent<SphereCollider>();
            col.radius = 0.12f;
            var r = go.AddComponent<NkSwarmRocket>();
            r._last = target;
            All.Add(r);
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
                transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(to), dt * 3.2f);
            Vector3 step = transform.forward * Spd * dt;
            NkWindow.Threat(transform.position, transform.forward * Spd);
            var g = Object.FindAnyObjectByType<NetKnightGame>();
            var weap = g && g.player ? g.player.weapons : null;
            if (weap && NkCombat.NearSword(weap, transform.position, 0.15f))
            {
                transform.rotation = Quaternion.LookRotation(NkCombat.BounceOffSword(transform.forward, weap, transform.position));
                NkWeapons.Sparks(transform.position);
                NkSfx.Shield(transform.position);
                step = transform.forward * Spd * dt;
            }
            else if (Physics.SphereCast(transform.position, 0.1f, transform.forward, out var hit, step.magnitude + 0.05f))
            {
                if (NkCombat.HitsSword(hit.collider, weap))
                {
                    transform.rotation = Quaternion.LookRotation(NkCombat.BounceOffSword(transform.forward, weap, hit.point));
                    NkWeapons.Sparks(hit.point);
                    NkSfx.Shield(hit.point);
                    step = transform.forward * Spd * dt;
                }
                else
                {
                    var victim = hit.collider.GetComponentInParent<NkPlayer>();
                    if (victim)
                    {
                        if (g) g.HurtPlayer(2, transform.forward, 0.95f);
                    }
                    else
                        NkCombat.HurtAny(hit.collider.transform, 6f, transform.forward, hit.point, g);
                    NkWeapons.Blast(transform.position, -transform.forward, 4f, 1.1f, false, g, transform, 0.15f);
                    Destroy(gameObject);
                    return;
                }
            }
            transform.position += step;
            if (_life <= 0f) Destroy(gameObject);
        }
    }

public class NkCamel : MonoBehaviour
    {
        public static readonly List<NkCamel> All = new List<NkCamel>();
        public float hp = 28f, maxHp = 28f;
        public Vector3 Aim => _head ? _head.position : transform.position;
        Rigidbody _rb;
        Transform _head, _neck, _visor, _beam;
        Transform[] _hose;
        Vector3[] _nPos, _nPrev;
        float _shot, _bob, _beamT, _beamCd, _burnCd;
        bool _beaming;
        Light _eye;
        const int Hose = 10;
        const float HoseLink = 0.16f;

        public static NkCamel Spawn(Vector3 pos)
        {
            var go = new GameObject("HoverCamel");
            go.transform.position = pos;
            var rb = go.AddComponent<Rigidbody>();
            rb.useGravity = false;
            rb.mass = 48f;
            rb.linearDamping = 0.7f;
            rb.angularDamping = 4f;
            rb.constraints = RigidbodyConstraints.FreezeRotation;
            rb.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;
            var cap = go.AddComponent<CapsuleCollider>();
            cap.direction = 2;
            cap.height = 2.4f;
            cap.radius = 0.45f;
            cap.center = new Vector3(0f, 0.35f, 0.1f);
            var c = go.AddComponent<NkCamel>();
            c._rb = rb;
            c.Build();
            All.Add(c);
            return c;
        }

        void Build()
        {
            var black = new Color(0.04f, 0.04f, 0.045f);
            var dark = new Color(0.08f, 0.07f, 0.08f);
            var visor = new Color(1f, 0.08f, 0.06f);
            NkGfx.Part(PrimitiveType.Sphere, transform, new Vector3(0f, 0.25f, -0.1f), new Vector3(0.9f, 0.7f, 1.6f), black, false, 0.45f, 0.85f, false, "body");
            NkGfx.Part(PrimitiveType.Sphere, transform, new Vector3(0f, 0.62f, -0.15f), new Vector3(0.7f, 0.55f, 0.7f), dark, false, 0.4f, 0.8f, false, "hump");
            NkGfx.Part(PrimitiveType.Cylinder, transform, new Vector3(0f, -0.15f, 0f), new Vector3(1.1f, 0.04f, 1.1f), visor, true, 0.2f, 0f, false, "hover");
            _neck = new GameObject("neck").transform;
            _neck.SetParent(transform, false);
            _neck.localPosition = new Vector3(0f, 0.38f, 0.72f);
            _hose = new Transform[Hose];
            _nPos = new Vector3[Hose];
            _nPrev = new Vector3[Hose];
            Vector3 pin = _neck.position;
            Vector3 outDir = transform.forward + transform.up * 0.35f;
            outDir.Normalize();
            var rib = new Color(0.22f, 0.2f, 0.18f);
            var hose = new Color(0.08f, 0.08f, 0.09f);
            for (int i = 0; i < Hose; i++)
            {
                _nPos[i] = pin + outDir * (i * HoseLink);
                _nPrev[i] = _nPos[i];
                var b = new GameObject("hose" + i).transform;
                b.SetParent(_neck, true);
                b.position = _nPos[i];
                float rad = Mathf.Lerp(0.22f, 0.12f, i / (float)(Hose - 1));
                NkGfx.Part(PrimitiveType.Sphere, b, Vector3.zero, Vector3.one * (rad * 2f), hose, false, 0.82f, 0.12f, false, "tube");
                if ((i & 1) == 0)
                    NkGfx.Part(PrimitiveType.Cylinder, b, Vector3.zero, new Vector3(rad * 2.35f, 0.025f, rad * 2.35f), rib, false, 0.4f, 0.55f, false, "rib");
                _hose[i] = b;
            }
            _head = new GameObject("head").transform;
            _head.SetParent(_hose[Hose - 1], false);
            _head.localPosition = Vector3.zero;
            NkGfx.Part(PrimitiveType.Sphere, _head, Vector3.zero, new Vector3(0.34f, 0.24f, 0.44f), black, false, 0.4f, 0.85f, false, "skull");
            _visor = NkGfx.Part(PrimitiveType.Cube, _head, new Vector3(0f, 0.05f, 0.18f), new Vector3(0.3f, 0.07f, 0.06f), visor, true, 0.2f, 0f, false, "visor");
            NkGfx.Part(PrimitiveType.Cube, _head, new Vector3(0f, -0.02f, 0.26f), new Vector3(0.1f, 0.07f, 0.18f), visor, true, 0.2f, 0f, false, "muzzle");
            var eye = NkGfx.Part(PrimitiveType.Sphere, _head, new Vector3(0f, 0.05f, 0.16f), new Vector3(0.22f, 0.06f, 0.06f), visor, true, 0.2f, 0f, false, "slit");
            var hc = _head.gameObject.AddComponent<SphereCollider>();
            hc.radius = 0.3f;
            hc.center = Vector3.zero;
            _eye = eye.gameObject.AddComponent<Light>();
            _eye.type = LightType.Point;
            _eye.color = Color.red;
            _eye.range = 5.5f;
            _eye.intensity = 2.4f;
            _beam = GameObject.CreatePrimitive(PrimitiveType.Cube).transform;
            Object.DestroyImmediate(_beam.GetComponent<Collider>());
            _beam.SetParent(null, true);
            _beam.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(1f, 0.08f, 0.05f, 0.95f));
            _beam.gameObject.SetActive(false);
        }

        void OnDestroy()
        {
            All.Remove(this);
            if (_beam) Object.Destroy(_beam.gameObject);
            if (!NkCombat.CanSpawn) return;
            NkCombat.BurstLoot(transform.position, Random.Range(2, 5), Random.Range(3, 6));
            var g = Object.FindAnyObjectByType<NetKnightGame>();
            if (g) g.AddKillScore(40);
        }

        public void Tick(float dt, NkPlayer player, NetKnightGame game, List<NkLaser> lasers)
        {
            if (!player || !_rb) return;
            Vector3 you = player.transform.position + Vector3.up;
            Vector3 to = you - transform.position;
            float dist = to.magnitude;
            Vector3 side = Vector3.Cross(to.normalized, Vector3.up);
            if (side.sqrMagnitude < 0.01f) side = transform.right;
            Vector3 want = to.normalized * (dist > 10f ? 4.2f : dist < 6f ? -1.8f : 0.4f) + side.normalized * Mathf.Sin(Time.time * 0.7f + _bob) * 2.4f;
            want.y += Mathf.Sin(Time.time * 1.4f) * 1.1f;
            _rb.AddForce(want - _rb.linearVelocity * 0.4f, ForceMode.Acceleration);
            if (to.sqrMagnitude > 0.01f)
            {
                var look = Quaternion.LookRotation(to.normalized);
                transform.rotation = Quaternion.Slerp(transform.rotation, look, dt * 2.4f);
            }
            BendNeck(dt, you);
            if (_eye) _eye.intensity = 2.2f + Mathf.PingPong(Time.time * 5f, 2.4f);
            _beamCd -= dt;
            _burnCd -= dt;
            if (!_beaming && _beamCd <= 0f && dist > 2f && dist < 38f)
            {
                _beaming = true;
                _beamT = 0.85f;
                _beamCd = Random.Range(9.6f, 13.6f);
                if (_head) NkSfx.Camel(_head.position);
            }
            if (_beaming)
            {
                _beamT -= dt;
                Cyclops(you, game);
                if (_beamT <= 0f)
                {
                    _beaming = false;
                    if (_beam) _beam.gameObject.SetActive(false);
                }
            }
            else if (_beam) _beam.gameObject.SetActive(false);
        }

        void BendNeck(float dt, Vector3 you)
        {
            if (_hose == null || _nPos == null) return;
            Vector3 pin = _neck ? _neck.position : transform.position + transform.forward * 0.7f;
            _nPos[0] = pin;
            _nPrev[0] = pin;
            Vector3 aim = you;
            if (_head) _nPos[Hose - 1] = Vector3.Lerp(_nPos[Hose - 1], _nPos[Hose - 1] + (aim - _nPos[Hose - 1]).normalized * 2.4f * dt, 1f);
            for (int i = 1; i < Hose; i++)
            {
                Vector3 v = _nPos[i] - _nPrev[i];
                _nPrev[i] = _nPos[i];
                _nPos[i] += v * 0.82f;
                _nPos[i] += Vector3.up * (Mathf.Sin(Time.time * 3f + i) * 0.015f);
            }
            for (int k = 0; k < 8; k++)
            {
                _nPos[0] = pin;
                for (int i = 1; i < Hose; i++)
                {
                    Vector3 d = _nPos[i] - _nPos[i - 1];
                    float m = d.magnitude;
                    if (m < 1e-4f) continue;
                    Vector3 n = d / m;
                    float err = m - HoseLink;
                    _nPos[i] -= n * err * 0.5f;
                    if (i > 1) _nPos[i - 1] += n * err * 0.5f;
                }
            }
            for (int i = 0; i < Hose; i++)
            {
                if (!_hose[i]) continue;
                _hose[i].position = _nPos[i];
                if (i < Hose - 1)
                {
                    Vector3 f = _nPos[i + 1] - _nPos[i];
                    if (f.sqrMagnitude > 1e-5f) _hose[i].rotation = Quaternion.LookRotation(f);
                }
            }
            if (_head && _hose[Hose - 1])
            {
                _head.position = _hose[Hose - 1].position;
                Vector3 look = you - _head.position;
                if (look.sqrMagnitude > 0.01f)
                    _head.rotation = Quaternion.Slerp(_head.rotation, Quaternion.LookRotation(look.normalized), dt * 6f);
            }
        }

        void Cyclops(Vector3 you, NetKnightGame game)
        {
            if (!_beam || !_visor) return;
            Vector3 o = _visor.position + _visor.forward * 0.08f;
            Vector3 dir = (you - o);
            if (dir.sqrMagnitude < 0.01f) dir = _visor.forward;
            dir.Normalize();
            float max = 46f;
            var hits = Physics.SphereCastAll(o, 0.12f, dir, max);
            System.Array.Sort(hits, (a, b) => a.distance.CompareTo(b.distance));
            float end = max;
            foreach (var hit in hits)
            {
                if (hit.collider.transform.IsChildOf(transform) || hit.collider.GetComponentInParent<NkCamel>()) continue;
                end = hit.distance;
                if (hit.collider.GetComponentInParent<NkPlayer>() && game)
                {
                    if (_burnCd <= 0f)
                    {
                        _burnCd = 0.28f;
                        game.HurtPlayer(1, dir);
                        game.live.hitsTaken++;
                    }
                }
                else
                    NkCombat.HurtAny(hit.collider.transform, 9f * Time.deltaTime, dir, hit.point, game);
                NkWeapons.Sparks(hit.point);
                break;
            }
            _beam.gameObject.SetActive(true);
            float thick = 0.22f + Mathf.Sin(Time.time * 40f) * 0.04f;
            _beam.position = o + dir * (end * 0.5f);
            _beam.rotation = Quaternion.LookRotation(dir);
            _beam.localScale = new Vector3(thick, thick * 0.45f, end);
            if (_eye) _eye.intensity = 8f;
        }

        public bool IsHead(Vector3 at) => _head && Vector3.Distance(at, _head.position) < 0.55f;

        public void Hurt(float dmg, Vector3 dir)
        {
            hp -= dmg;
            if (_rb) _rb.AddForce(dir.normalized * 2f, ForceMode.VelocityChange);
            if (hp <= 0f)
            {
                NkSfx.Crowd(transform.position);
                Destroy(gameObject);
            }
        }
    }

    public class NkTrilo : MonoBehaviour
    {
        public static readonly List<NkTrilo> All = new List<NkTrilo>();
        public float hp = 55f, maxHp = 55f;
        public Vector3 Aim => _head ? _head.position : transform.position + Vector3.up;
        Rigidbody _rb;
        Transform _head, _neck, _scL, _scR, _jetL, _jetR;
        Light _eyeL, _eyeR;
        float _flash, _stateT, _lockT;
        int _mode; // 0 swagger 1 flank 2 dart 3 combo 4 retreat
        int _zig = 1;
        bool _hitLanded;

        public static NkTrilo Spawn(Vector3 pos)
        {
            var go = new GameObject("Trilobite");
            go.transform.position = pos;
            var rb = go.AddComponent<Rigidbody>();
            rb.useGravity = false;
            rb.mass = 180f;
            rb.linearDamping = 0.55f;
            rb.angularDamping = 5f;
            rb.constraints = RigidbodyConstraints.FreezeRotation;
            rb.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;
            var box = go.AddComponent<BoxCollider>();
            box.center = new Vector3(0f, 0.55f, 0.1f);
            box.size = new Vector3(1.6f, 1.15f, 2.1f);
            var t = go.AddComponent<NkTrilo>();
            t._rb = rb;
            t.Build();
            go.transform.localScale = Vector3.one * 2f;
            All.Add(t);
            return t;
        }

        Transform[] _spine;
        Transform[] _hips;

        void Build()
        {
            var armor = new Color(0.32f, 0.22f, 0.12f);
            var plate = new Color(0.5f, 0.38f, 0.18f);
            var metal = new Color(0.55f, 0.58f, 0.6f);
            var glow = new Color(1f, 0.08f, 0.05f);
            _spine = new Transform[4];
            Transform parent = transform;
            for (int i = 0; i < 4; i++)
            {
                var seg = new GameObject("spine" + i).transform;
                seg.SetParent(parent, false);
                seg.localPosition = i == 0 ? new Vector3(0f, 0.5f, -0.35f) : new Vector3(0f, 0.02f, 0.32f);
                NkGfx.Part(PrimitiveType.Cube, seg, Vector3.zero, new Vector3(1.45f - i * 0.08f, 0.28f, 0.34f), i == 0 ? armor : plate, false, 0.35f, 0.5f, false, "plate");
                _spine[i] = seg;
                parent = seg;
            }
            NkGfx.Part(PrimitiveType.Sphere, _spine[0], new Vector3(0f, -0.05f, -0.15f), new Vector3(1.5f, 0.45f, 0.7f), armor, false, 0.4f, 0.55f, false, "pygidium");
            _hips = new Transform[6];
            int hi = 0;
            for (int s = -1; s <= 1; s += 2)
                for (int i = 0; i < 3; i++)
                {
                    var hip = new GameObject("leg").transform;
                    hip.SetParent(_spine[Mathf.Clamp(i, 0, 3)], false);
                    hip.localPosition = new Vector3(s * 0.55f, -0.12f, 0.05f);
                    NkGfx.Part(PrimitiveType.Cube, hip, new Vector3(s * 0.08f, -0.16f, 0f), new Vector3(0.14f, 0.38f, 0.12f), metal, false, 0.4f, 0.7f, false, "upper");
                    var knee = new GameObject("knee").transform;
                    knee.SetParent(hip, false);
                    knee.localPosition = new Vector3(s * 0.1f, -0.34f, 0.02f);
                    NkGfx.Part(PrimitiveType.Cube, knee, new Vector3(s * 0.08f, -0.18f, 0.04f), new Vector3(0.11f, 0.34f, 0.1f), metal, false, 0.4f, 0.7f, false, "lower");
                    _hips[hi++] = hip;
                }
            _neck = new GameObject("neck").transform;
            _neck.SetParent(_spine[3], false);
            _neck.localPosition = new Vector3(0f, 0.18f, 0.28f);
            NkGfx.Part(PrimitiveType.Cylinder, _neck, new Vector3(0f, 0.08f, 0.05f), new Vector3(0.22f, 0.12f, 0.22f), metal, false, 0.4f, 0.8f, false, "ring");
            _head = new GameObject("head").transform;
            _head.SetParent(_neck, false);
            _head.localPosition = new Vector3(0f, 0.16f, 0.12f);
            NkGfx.Part(PrimitiveType.Sphere, _head, Vector3.zero, new Vector3(0.55f, 0.32f, 0.4f), plate, false, 0.4f, 0.5f, false, "helm");
            var hc = _head.gameObject.AddComponent<SphereCollider>();
            hc.radius = 0.38f;
            var eL = NkGfx.Part(PrimitiveType.Sphere, _head, new Vector3(-0.16f, 0.06f, 0.16f), Vector3.one * 0.12f, glow, true, 0.2f, 0f, false, "eyeL");
            var eR = NkGfx.Part(PrimitiveType.Sphere, _head, new Vector3(0.16f, 0.06f, 0.16f), Vector3.one * 0.12f, glow, true, 0.2f, 0f, false, "eyeR");
            _eyeL = eL.gameObject.AddComponent<Light>();
            _eyeR = eR.gameObject.AddComponent<Light>();
            foreach (var L in new[] { _eyeL, _eyeR })
            {
                L.type = LightType.Point;
                L.color = glow;
                L.range = 3.5f;
                L.intensity = 1.1f;
            }
            _scL = Arm(-1, metal, glow);
            _scR = Arm(1, metal, glow);
            if (_scL) { _scL.SetParent(_spine[3], false); _scL.localPosition = new Vector3(-0.62f, 0.12f, 0.05f); }
            if (_scR) { _scR.SetParent(_spine[3], false); _scR.localPosition = new Vector3(0.62f, 0.12f, 0.05f); }
            _jetL = Jet(-1);
            _jetR = Jet(1);
        }

        Transform Arm(int side, Color metal, Color glow)
        {
            var sh = new GameObject(side < 0 ? "armL" : "armR").transform;
            sh.SetParent(transform, false);
            sh.localPosition = new Vector3(side * 0.7f, 0.7f, 0.55f);
            NkGfx.Part(PrimitiveType.Cube, sh, new Vector3(side * 0.15f, -0.05f, 0.1f), new Vector3(0.18f, 0.18f, 0.55f), metal, false, 0.4f, 0.75f, false, "upper");
            var el = new GameObject("elbow").transform;
            el.SetParent(sh, false);
            el.localPosition = new Vector3(side * 0.18f, -0.08f, 0.42f);
            NkGfx.Part(PrimitiveType.Cube, el, new Vector3(side * 0.05f, 0f, 0.28f), new Vector3(0.14f, 0.12f, 0.5f), metal, false, 0.4f, 0.75f, false, "fore");
            var blade = NkGfx.Part(PrimitiveType.Cube, el, new Vector3(side * 0.02f, -0.02f, 0.72f), new Vector3(0.04f, 0.22f, 0.7f), new Color(0.15f, 0.16f, 0.18f), false, 0.7f, 0.9f, false, "scythe");
            NkGfx.Part(PrimitiveType.Cube, blade, new Vector3(0f, 0f, 0.1f), new Vector3(0.015f, 0.26f, 0.65f), glow, true, 0.2f, 0f, false, "edge");
            return sh;
        }

        Transform Jet(int side)
        {
            var j = new GameObject(side < 0 ? "jetL" : "jetR").transform;
            j.SetParent(transform, false);
            j.localPosition = new Vector3(side * 0.42f, 0.55f, -0.85f);
            j.localRotation = Quaternion.Euler(70f, 0f, 0f);
            NkGfx.Part(PrimitiveType.Cylinder, j, Vector3.zero, new Vector3(0.28f, 0.45f, 0.28f), new Color(0.25f, 0.26f, 0.3f), false, 0.4f, 0.8f, false, "can");
            var fire = NkGfx.Part(PrimitiveType.Sphere, j, new Vector3(0f, -0.5f, 0f), new Vector3(0.32f, 0.7f, 0.32f), Color.white, true, 0.2f, 0f, false, "plume");
            fire.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(1f, 0.45f, 0.08f, 0.9f));
            return fire;
        }

        void OnDestroy()
        {
            All.Remove(this);
            if (!NkCombat.CanSpawn) return;
            NkCombat.BurstLoot(transform.position, Random.Range(4, 8), Random.Range(4, 8));
            var g = Object.FindAnyObjectByType<NetKnightGame>();
            if (g) g.AddKillScore(55);
        }

        public void Tick(float dt, NkPlayer player, NetKnightGame game)
        {
            if (!player || !_rb) return;
            Vector3 you = player.transform.position + Vector3.up * 0.9f;
            Vector3 to = you - transform.position;
            float dist = to.magnitude;
            Vector3 fwd = to.sqrMagnitude > 0.01f ? to.normalized : transform.forward;
            Vector3 right = Vector3.Cross(Vector3.up, fwd).normalized;
            _stateT -= dt;
            _lockT -= dt;
            if (_lockT <= 0f && Vector3.Dot(transform.forward, fwd) > 0.65f)
            {
                _lockT = 0.45f;
                _flash = 0.35f;
            }
            _flash -= dt;
            float glow = _flash > 0f ? 4.5f + Mathf.Sin(Time.time * 40f) * 1.5f : 1.2f + Mathf.PingPong(Time.time * 2f, 0.8f);
            if (_eyeL) _eyeL.intensity = glow;
            if (_eyeR) _eyeR.intensity = glow;
            if (_neck)
            {
                var local = transform.InverseTransformDirection(fwd);
                var want = Quaternion.LookRotation(local == Vector3.zero ? Vector3.forward : local);
                _neck.localRotation = Quaternion.Slerp(_neck.localRotation, want, dt * 5.5f);
            }
            if (_spine != null)
            {
                for (int i = 1; i < _spine.Length; i++)
                {
                    if (!_spine[i]) continue;
                    float w = Mathf.Sin(Time.time * 2.4f + i) * 16f;
                    float y = Mathf.Sin(Time.time * 1.8f + i * 0.7f) * 12f;
                    _spine[i].localRotation = Quaternion.Euler(w, y, Mathf.Sin(Time.time * 1.3f + i) * 8f);
                }
            }
            if (_hips != null)
            {
                for (int i = 0; i < _hips.Length; i++)
                {
                    if (!_hips[i]) continue;
                    float sw = Mathf.Sin(Time.time * 5.5f + i) * (_mode == 2 || _mode == 3 ? 48f : 24f);
                    _hips[i].localRotation = Quaternion.Euler(sw, Mathf.Sin(Time.time * 2.2f + i) * 10f, i % 2 == 0 ? 14f : -14f);
                    var knee = _hips[i].Find("knee");
                    if (knee) knee.localRotation = Quaternion.Euler(-Mathf.Abs(sw) * 0.95f - 10f, 0f, 0f);
                }
            }
            if (_scL) _scL.localRotation = Quaternion.Euler(Mathf.Sin(Time.time * 8f) * (_mode == 2 || _mode == 3 ? 58f : 18f), 12f, -22f);
            if (_scR) _scR.localRotation = Quaternion.Euler(Mathf.Sin(Time.time * 8f + 1f) * (_mode == 2 || _mode == 3 ? 58f : 18f), -12f, 22f);
            if (_jetL) _jetL.localScale = new Vector3(0.32f, 0.5f + Mathf.PingPong(Time.time * 14f, 0.5f), 0.32f);
            if (_jetR) _jetR.localScale = new Vector3(0.32f, 0.5f + Mathf.PingPong(Time.time * 14f + 0.4f, 0.5f), 0.32f);

            if (_stateT <= 0f)
            {
                if (_mode == 2 && _hitLanded) { _mode = 3; _stateT = 1.1f; }
                else if (_mode == 4) { _mode = 0; _stateT = 1.6f; }
                else if (_mode == 0) { _mode = 1; _zig = Random.value < 0.5f ? -1 : 1; _stateT = 1.3f; }
                else if (_mode == 1) { _mode = 2; _hitLanded = false; _stateT = 0.55f; }
                else { _mode = 0; _stateT = 1.4f; }
            }

            Vector3 wish = Vector3.zero;
            if (_mode == 0)
            {
                wish = fwd * 2.2f + right * Mathf.Sin(Time.time * 1.6f) * 2.8f;
                wish += Vector3.up * Mathf.Sin(Time.time * 3.4f) * 2.6f;
            }
            else if (_mode == 1)
            {
                wish = right * (_zig * 5.5f) + fwd * 1.2f;
                wish += Vector3.up * Mathf.Sin(Time.time * 5f) * 3.2f;
            }
            else if (_mode == 2 || _mode == 3)
            {
                wish = fwd * 11f + Vector3.up * Mathf.Sin(Time.time * 8f) * 1.5f;
                if (dist < 3.4f)
                {
                    game.HurtPlayer(_mode == 3 ? 3 : 2, fwd);
                    game.live.hitsTaken++;
                    _hitLanded = true;
                    NkWeapons.Sparks(you);
                }
            }
            else
            {
                wish = -fwd * 7.5f + right * _zig * 2f + Vector3.up * 2.5f;
            }
            _rb.AddForce(wish - _rb.linearVelocity * 0.45f, ForceMode.Acceleration);
            if (fwd.sqrMagnitude > 0.01f)
                transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(fwd), dt * 5f);
        }

        public bool IsHead(Vector3 at) => _head && Vector3.Distance(at, _head.position) < 0.95f;

        public void Hurt(float dmg, Vector3 dir)
        {
            hp -= dmg;
            if (_rb) _rb.AddForce(dir.normalized * 2.4f, ForceMode.VelocityChange);
            _mode = 4;
            _stateT = 0.85f;
            _hitLanded = false;
            if (hp <= 0f)
            {
                NkSfx.Crowd(transform.position);
                Destroy(gameObject);
            }
        }
    }
}
