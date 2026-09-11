using System.Collections.Generic;
using UnityEngine;

namespace NetKnight
{
    public class NkHornet : MonoBehaviour
    {
        public static readonly List<NkHornet> All = new List<NkHornet>();
        public float hp = 110f, maxHp = 110f;
        public NkHornet lead;
        public Vector3 slot;
        readonly List<NkHornet> _pack = new List<NkHornet>();
        Rigidbody _rb;
        Transform _rotorA, _rotorB, _gunL, _gunR;
        float _burst, _cool = 2f, _shot, _lurch;
        bool _plasma = true;
        readonly List<NkBolt> _orbs = new List<NkBolt>();
        const float Stand = 48f;
        const float OrbSpd = 20.8f;

        public static void SpawnPack(Vector3 origin, int n)
        {
            n = Mathf.Clamp(n, 3, 5);
            var rot = Quaternion.LookRotation((Vector3.zero - origin).sqrMagnitude > 0.1f ? (Vector3.zero - origin).normalized : Vector3.forward);
            var lead = Make(origin, null, Vector3.zero);
            for (int i = 1; i < n; i++)
            {
                float side = (i % 2 == 1) ? 1f : -1f;
                int rank = (i + 1) / 2;
                var sl = new Vector3(side * rank * 8.2f, rank * 0.8f, -rank * 6.4f);
                Make(origin + rot * sl, lead, sl);
            }
        }

        static NkHornet Make(Vector3 pos, NkHornet leader, Vector3 sl)
        {
            var go = new GameObject("Hornet");
            go.transform.position = pos;
            go.transform.localScale = Vector3.one * 2f;
            var rb = go.AddComponent<Rigidbody>();
            rb.useGravity = false;
            rb.mass = 220f;
            rb.linearDamping = 1.15f;
            rb.angularDamping = 3.2f;
            rb.constraints = RigidbodyConstraints.FreezeRotation;
            rb.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;
            var box = go.AddComponent<BoxCollider>();
            box.center = new Vector3(0f, 0.15f, 0f);
            box.size = new Vector3(2.2f, 1.1f, 3.4f);
            var h = go.AddComponent<NkHornet>();
            h._rb = rb;
            h.lead = leader;
            h.slot = sl;
            h.Build();
            if (leader) leader._pack.Add(h);
            All.Add(h);
            return h;
        }

        void Build()
        {
            var armor = new Color(0.18f, 0.2f, 0.16f);
            var plate = new Color(0.32f, 0.34f, 0.28f);
            var glow = new Color(0.15f, 0.95f, 0.45f);
            var gold = new Color(0.85f, 0.62f, 0.12f);
            NkGfx.Part(PrimitiveType.Cube, transform, new Vector3(0f, 0.12f, 0.15f), new Vector3(1.15f, 0.55f, 2.2f), armor, false, 0.35f, 0.7f, false, "thorax");
            NkGfx.Part(PrimitiveType.Sphere, transform, new Vector3(0f, 0.08f, -1.15f), new Vector3(0.95f, 0.7f, 1.5f), plate, false, 0.4f, 0.65f, false, "abdomen");
            NkGfx.Part(PrimitiveType.Cube, transform, new Vector3(0f, 0.28f, 1.05f), new Vector3(0.7f, 0.32f, 0.7f), armor, false, 0.4f, 0.7f, false, "head");
            NkGfx.Part(PrimitiveType.Cube, transform, new Vector3(0f, 0.38f, 1.22f), new Vector3(0.55f, 0.16f, 0.28f), glow, true, 0.2f, 0f, false, "visor");
            NkGfx.Part(PrimitiveType.Cube, transform, new Vector3(-1.15f, 0.2f, 0.1f), new Vector3(1.4f, 0.08f, 0.45f), plate, false, 0.35f, 0.6f, false, "wingL");
            NkGfx.Part(PrimitiveType.Cube, transform, new Vector3(1.15f, 0.2f, 0.1f), new Vector3(1.4f, 0.08f, 0.45f), plate, false, 0.35f, 0.6f, false, "wingR");
            _gunL = NkGfx.Part(PrimitiveType.Cylinder, transform, new Vector3(-1.55f, 0.05f, 0.35f), new Vector3(0.16f, 0.35f, 0.16f), gold, false, 0.4f, 0.8f, false, "gunL");
            _gunR = NkGfx.Part(PrimitiveType.Cylinder, transform, new Vector3(1.55f, 0.05f, 0.35f), new Vector3(0.16f, 0.35f, 0.16f), gold, false, 0.4f, 0.8f, false, "gunR");
            _gunL.localRotation = Quaternion.Euler(90f, 0f, 0f);
            _gunR.localRotation = Quaternion.Euler(90f, 0f, 0f);
            _rotorA = new GameObject("rotorA").transform;
            _rotorA.SetParent(transform, false);
            _rotorA.localPosition = new Vector3(0f, 0.55f, 0.35f);
            NkGfx.Part(PrimitiveType.Cylinder, _rotorA, Vector3.zero, new Vector3(2.4f, 0.02f, 2.4f), new Color(0.12f, 0.12f, 0.12f, 0.55f), true, 0.2f, 0f, false, "discA");
            _rotorB = new GameObject("rotorB").transform;
            _rotorB.SetParent(transform, false);
            _rotorB.localPosition = new Vector3(0f, 0.42f, -1.15f);
            NkGfx.Part(PrimitiveType.Cylinder, _rotorB, Vector3.zero, new Vector3(1.6f, 0.018f, 1.6f), new Color(0.12f, 0.12f, 0.12f, 0.55f), true, 0.2f, 0f, false, "discB");
            NkGfx.Part(PrimitiveType.Cube, transform, new Vector3(-0.35f, -0.42f, 0.4f), new Vector3(0.08f, 0.5f, 0.08f), armor, false, 0.3f, 0.5f, false, "skidL");
            NkGfx.Part(PrimitiveType.Cube, transform, new Vector3(0.35f, -0.42f, 0.4f), new Vector3(0.08f, 0.5f, 0.08f), armor, false, 0.3f, 0.5f, false, "skidR");
            NkGfx.Part(PrimitiveType.Cube, transform, new Vector3(0f, 0.15f, -2.05f), new Vector3(0.12f, 0.12f, 0.9f), plate, false, 0.3f, 0.5f, false, "stinger");
        }

        void OnDestroy()
        {
            All.Remove(this);
            if (!NkCombat.CanSpawn) return;
            NkCombat.BurstLoot(transform.position, Random.Range(4, 8), Random.Range(4, 8));
            var g = Object.FindAnyObjectByType<NetKnightGame>();
            if (g) g.AddKillScore(70);
        }

        public void Hurt(float dmg, Vector3 dir)
        {
            hp -= dmg;
            if (_rb) _rb.AddForce(dir.normalized * 1.6f, ForceMode.VelocityChange);
            if (hp <= 0f)
            {
                NkSfx.Boom(transform.position);
                NkSfx.Crowd(transform.position);
                Destroy(gameObject);
            }
        }

        public void Tick(float dt, NkPlayer player, NetKnightGame game, List<NkLaser> lasers)
        {
            if (!player || !_rb) return;
            Vector3 you = player.cam ? player.cam.position : player.transform.position + Vector3.up;
            Vector3 to = you - transform.position;
            float dist = to.magnitude;
            bool close = dist < 16f;
            Vector3 want;
            if (lead && !close && dist > 14f)
            {
                Vector3 slotW = lead.transform.TransformPoint(slot);
                want = (slotW - transform.position) * 1.8f;
            }
            else
            {
                Vector3 away = dist > 0.2f ? -to.normalized : transform.forward;
                if (game && game.world != null && game.world.InsideAny(transform.position, out var sph, out _, out var inward))
                    away = -inward;
                Vector3 stand = you + away * Stand;
                _lurch += dt;
                stand += transform.right * Mathf.Sin(_lurch * 0.7f) * 3.2f + Vector3.up * Mathf.Sin(_lurch * 1.3f) * 1.6f;
                want = (stand - transform.position);
            }
            Vector3 acc = Vector3.ClampMagnitude(want, 9.5f) - _rb.linearVelocity * 0.55f;
            acc += transform.up * (Mathf.Sin(Time.time * 2.1f + slot.x + slot.z) * 1.4f);
            _rb.AddForce(acc, ForceMode.Acceleration);
            if (to.sqrMagnitude > 0.2f)
            {
                var look = Quaternion.LookRotation(to.normalized, Vector3.up);
                transform.rotation = Quaternion.Slerp(transform.rotation, look, dt * 1.7f);
            }
            if (_rotorA) _rotorA.Rotate(0f, 720f * dt, 0f, Space.Self);
            if (_rotorB) _rotorB.Rotate(0f, -640f * dt, 0f, Space.Self);
            TickGuns(dt, you, dist, game, lasers);
            TickOrbs(dt, game, player);
        }

        void TickGuns(float dt, Vector3 you, float dist, NetKnightGame game, List<NkLaser> lasers)
        {
            _cool -= dt;
            _burst -= dt;
            _shot -= dt;
            if (_cool <= 0f && _burst <= 0f)
            {
                _plasma = true;
                _burst = 3f;
                _cool = 10f;
            }
            bool inBurst = _burst > 0f;
            if (inBurst && _plasma)
            {
                if (_shot <= 0f)
                {
                    _shot = 0.48f;
                    FireOrb(you, game);
                }
            }
            else if (!inBurst)
            {
                if (_shot <= 0f)
                {
                    _shot = Random.Range(0.7f, 1.15f);
                    FireDual(you, lasers);
                }
            }
        }

        void FireOrb(Vector3 you, NetKnightGame game)
        {
            Vector3 origin = transform.position + transform.forward * 1.6f;
            Vector3 dir = (you - origin).normalized;
            var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            Object.Destroy(go.GetComponent<Collider>());
            go.transform.position = origin;
            go.transform.localScale = Vector3.one * 0.48f;
            go.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(1f, 0.78f, 0.12f, 0.95f));
            _orbs.Add(new NkBolt
            {
                t = go.transform, p = origin, dir = dir,
                spd = OrbSpd, spd0 = OrbSpd, spdMax = OrbSpd,
                life = 4.2f, dmg = 6.5f, blast = 2.2f, size = 0.48f, charged = true
            });
            NkSfx.Plasma(origin, true);
        }

        void FireDual(Vector3 you, List<NkLaser> lasers)
        {
            if (lasers == null) return;
            Vector3[] muzz = {
                _gunL ? _gunL.position : transform.position - transform.right * 1.5f,
                _gunR ? _gunR.position : transform.position + transform.right * 1.5f
            };
            foreach (var m in muzz)
            {
                Vector3 dir = (you - m).normalized;
                var l = GameObject.CreatePrimitive(PrimitiveType.Cube);
                Object.Destroy(l.GetComponent<Collider>());
                l.transform.position = m + dir * 0.3f;
                l.transform.localScale = new Vector3(0.05f, 0.05f, 0.85f);
                l.transform.rotation = Quaternion.LookRotation(dir);
                l.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(1f, 0.18f, 0.12f, 0.95f));
                lasers.Add(new NkLaser { p = l.transform.position, v = dir * 28f, life = 1.6f, vis = l.transform });
            }
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
                    if (NkCombat.HitsSword(hit.collider, weap))
                    {
                        b.dir = NkCombat.BounceOffSword(b.dir, weap, hit.point);
                        NkWeapons.Sparks(hit.point);
                    }
                    else
                    {
                        if (hit.collider.GetComponentInParent<NkPlayer>() && game)
                        {
                            game.HurtPlayer(2, b.dir);
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
    }
}
