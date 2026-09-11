using System.Collections.Generic;
using UnityEngine;

namespace NetKnight
{
    public static class NkCombat
    {
        public const float PlayerAtk = 1.15f;
        public static bool quitting;

        public static bool CanSpawn => Application.isPlaying && !quitting;

        public static void BeginTeardown()
        {
            quitting = true;
        }

        public static void WipeEntities()
        {
            quitting = true;
            Kill(NkHornet.All);
            Kill(NkDrone.All);
            Kill(NkSwarmRocket.All);
            Kill(NkCamel.All);
            Kill(NkTrilo.All);
            Kill(NkLemur.All);
            Kill(NkLemurRocket.All);
            Kill(NkMarqueeSeg.All);
            Kill(NkWindow.All);
            Kill(NkHealWell.All);
            Kill(NkPad.All);
            Kill(NkBreakable.All);
            Kill(NkCrystal.All);
            Kill(NkCoin.All);
            Kill(NkBlimp.All);
            Kill(NkMissilePickup.All);
            Kill(NkPlasmaStroke.All);
            Kill(NkMissile.All);
            Kill(NkPet.All);
            Kill(NkHydraHead.All);
            Kill(NkPetCage.All);
            NkPet.ResetOwned();
            NkStore.AnyOpen = false;
        }

        static void Kill<T>(List<T> list) where T : Component
        {
            if (list == null) return;
            for (int i = 0; i < list.Count; i++)
                if (list[i]) Object.Destroy(list[i].gameObject);
            list.Clear();
        }

        public static void BurstLoot(Vector3 p, int shards, int coins)
        {
            if (!CanSpawn) return;
            int n = Mathf.Max(1, shards * 2 + coins);
            for (int i = 0; i < n; i++)
            {
                Vector3 dir = Random.onUnitSphere;
                dir.y = Mathf.Abs(dir.y) + 0.4f;
                dir.Normalize();
                Vector3 at = p + dir * Random.Range(0.22f, 0.95f);
                Vector3 vel = dir * Random.Range(8f, 18f) + Vector3.up * Random.Range(3f, 8f);
                NkCrystal.Make(at, vel);
            }
        }

        public static bool HurtAny(Transform t, float dmg, Vector3 dir, Vector3 at, NetKnightGame game, bool laser = false)
        {
            if (!t) return false;
            var rocket = t.GetComponentInParent<NkSwarmRocket>();
            if (rocket) { rocket.Hurt(dmg); return true; }
            var cage = t.GetComponentInParent<NkPetCage>();
            if (cage) { cage.Hit(dmg, at, dir); return true; }
            var pet = t.GetComponentInParent<NkPet>();
            if (pet) return true;
            var pad = t.GetComponentInParent<NkPad>();
            if (pad) { pad.Hit(dmg, at, dir); return true; }
            var stroke = t.GetComponentInParent<NkPlasmaStroke>();
            if (stroke) { stroke.Hit(dmg, at, dir); return true; }
            var tv = t.GetComponentInParent<NkWindow>();
            if (tv) { tv.Hit(dmg, at, dir); return true; }
            var belt = t.GetComponentInParent<NkMarqueeSeg>();
            if (belt) { belt.Hit(dmg, at, dir); return true; }
            var lemur = t.GetComponentInParent<NkLemur>();
            if (lemur)
            {
                dmg *= PlayerAtk;
                lemur.Hurt(dmg);
                if (game) game.live.hitsLanded++;
                return true;
            }
            var lrok = t.GetComponentInParent<NkLemurRocket>();
            if (lrok) { lrok.Hurt(dmg); return true; }
            var hornet = t.GetComponentInParent<NkHornet>();
            if (hornet)
            {
                dmg *= PlayerAtk;
                hornet.Hurt(dmg, dir);
                if (game) game.live.hitsLanded++;
                return true;
            }
            var br = t.GetComponentInParent<NkBreakable>();
            if (br) { br.Hit(dmg, at, dir); return true; }
            var hatch = t.GetComponentInParent<NkHatch>();
            if (hatch && !hatch.blown) { hatch.Hit(dmg, at, dir); return true; }
            var kennel = t.GetComponentInParent<NkHydraKennel>();
            if (kennel) { kennel.Hit(dmg, at, dir); return true; }
            var head = t.GetComponentInParent<NkHydraHead>();
            if (head)
            {
                dmg *= PlayerAtk;
                if (laser && head.hp <= 6f) head.Decapitate(dir);
                else head.Hurt(dmg, dir);
                if (game) game.live.hitsLanded++;
                return true;
            }
            var dr = t.GetComponentInParent<NkDrone>();
            if (dr)
            {
                dmg *= PlayerAtk;
                if (laser)
                {
                    dr.SpillLoot();
                    NkSlice.Cut(dr.gameObject, at, dir, false);
                }
                else if (dr.Hurt(dmg) && game) game.live.hitsLanded++;
                else if (game) game.live.hitsLanded++;
                return true;
            }
            float hs = HeadMul(t, at);
            dmg *= PlayerAtk;
            var dk = t.GetComponentInParent<NkDarkKnight>();
            if (dk) { dk.Hurt(dmg * hs, dir); if (game) game.live.hitsLanded++; return true; }
            var camel = t.GetComponentInParent<NkCamel>();
            if (camel) { camel.Hurt(dmg * hs, dir); if (game) game.live.hitsLanded++; return true; }
            var tr = t.GetComponentInParent<NkTrilo>();
            if (tr) { tr.Hurt(dmg * hs, dir); if (game) game.live.hitsLanded++; return true; }
            return false;
        }

        static float HeadMul(Transform t, Vector3 at)
        {
            for (var n = t; n; n = n.parent)
                if (n.name == "head" || n.name == "cockpit" || n.name == "visor") return 2f;
            var camel = t.GetComponentInParent<NkCamel>();
            if (camel && camel.IsHead(at)) return 2f;
            var tr = t.GetComponentInParent<NkTrilo>();
            if (tr && tr.IsHead(at)) return 2f;
            var dk = t.GetComponentInParent<NkDarkKnight>();
            if (dk && dk.IsHead(at)) return 2f;
            return 1f;
        }

        public static Transform BestEnemy(Camera cam, Vector3 from, float maxRange, bool needSight, bool cages = true)
        {
            Transform best = null;
            float bestScore = 9999f;
            void Consider(Transform t, Vector3 aim)
            {
                if (!t) return;
                Vector3 d = aim - from;
                float dist = d.magnitude;
                if (dist > maxRange || dist < 0.4f) return;
                if (needSight && cam)
                {
                    var vp = cam.WorldToViewportPoint(aim);
                    if (vp.z < 0.2f || vp.x < 0.02f || vp.x > 0.98f || vp.y < 0.02f || vp.y > 0.98f) return;
                }
                if (dist < bestScore) { bestScore = dist; best = t; }
            }
            var g = Object.FindAnyObjectByType<NetKnightGame>();
            if (g && g.knight) Consider(g.knight.transform, g.knight.transform.position + Vector3.up * 2f);
            foreach (var d in NkDrone.All) if (d) Consider(d.transform, d.transform.position);
            foreach (var c in NkCamel.All) if (c) Consider(c.transform, c.Aim);
            foreach (var t in NkTrilo.All) if (t) Consider(t.transform, t.Aim);
            foreach (var h in NkHydraHead.All)
                if (h) Consider(h.transform, h.transform.position);
            foreach (var ho in NkHornet.All)
                if (ho) Consider(ho.transform, ho.transform.position);
            foreach (var l in NkLemur.All)
                if (l) Consider(l.transform, l.Aim);
            if (cages)
                foreach (var cg in NkPetCage.All)
                    if (cg) Consider(cg.transform, cg.transform.position);
            return best;
        }

        public static bool NearSword(NkWeapons weap, Vector3 p, float extra = 0f)
        {
            if (!weap || !weap.sword) return false;
            Vector3 a = weap.sword.TransformPoint(new Vector3(0f, 0.01f, 0.18f));
            Vector3 b = weap.bladeTip ? weap.bladeTip.position : weap.sword.TransformPoint(new Vector3(0f, 0.01f, 1.63f));
            return DistPointSeg(p, a, b) <= 0.64f + extra;
        }

        public static bool HitsSword(Collider c, NkWeapons weap)
        {
            if (!c || !weap || !weap.sword) return false;
            return c.transform == weap.sword || c.transform.IsChildOf(weap.sword);
        }

        public static Vector3 BounceOffSword(Vector3 dir, NkWeapons weap, Vector3 p)
        {
            Vector3 n = Vector3.up;
            if (weap && weap.sword) n = (p - weap.sword.position).normalized;
            if (n.sqrMagnitude < 0.01f) n = -dir;
            Vector3 bounce = Vector3.Reflect(dir, n.normalized);
            if (bounce.sqrMagnitude < 0.01f) bounce = -dir;
            return bounce.normalized;
        }

        static float DistPointSeg(Vector3 p, Vector3 a, Vector3 b)
        {
            Vector3 ab = b - a;
            float t = ab.sqrMagnitude < 1e-6f ? 0f : Mathf.Clamp01(Vector3.Dot(p - a, ab) / ab.sqrMagnitude);
            return Vector3.Distance(p, a + ab * t);
        }

        public static void TickLoot(float dt, Vector3 head, NetKnightGame game)
        {
            const float mag = 7.8f, grab = 0.7f;
            foreach (var s in NkCrystal.All.ToArray())
            {
                if (!s) continue;
                int r = s.Pull(head, mag, grab);
                if (r > 0) { game.AddEnergy(r); NkSfx.Shard(head); }
            }
            foreach (var c in NkCoin.All.ToArray())
            {
                if (!c) continue;
                if (c.Pull(head, mag, grab))
                {
                    game.AddEnergy(1);
                    NkSfx.Shard(head);
                }
            }
            foreach (var b in NkBlimp.All.ToArray())
                if (b) b.Pull(head, mag, grab);
            foreach (var m in NkMissilePickup.All.ToArray())
                if (m) m.Pull(head, mag, grab);
        }
    }
}
