using System.Collections.Generic;
using UnityEngine;

namespace NetKnight
{
    public class NkDarkKnight : MonoBehaviour
    {
        public float hearts = 100, maxHearts = 100;
        public float learnAgro = 1f, learnStrikeGap = 0.8f, learnVertical = 0.6f, learnRespectPulse = 0.2f;
        public bool fleeing, white;
        public NkStaff staff;
        Rigidbody _rb;
        Transform _leftArm, _rightArm, _leftMuzzle, _rightMuzzle, _leftBlade, _rightBlade;
        Transform _leftBarrel, _rightBarrel, _hipL, _hipR, _shinL, _shinR;
        readonly List<Renderer> _cannonRends = new List<Renderer>();
        readonly List<Renderer> _bladeRends = new List<Renderer>();
        readonly List<Transform> _armRoots = new List<Transform>();
        readonly List<Transform> _muzzles = new List<Transform>();
        readonly List<Transform> _bladeTips = new List<Transform>();
        readonly List<Light> _glows = new List<Light>();
        readonly List<NkBolt> _bolts = new List<NkBolt>();
        Light _visorLite, _leftGlow, _rightGlow;
        float _stateT, _strikeCd, _fleeLock, _mercyUsed, _shotCd, _kickLock, _morph, _slash, _hurtBurst, _legPhase, _warpDmg, _warpLock;
        Vector3 _flank = Vector3.right;
        int _mode, _zig;
        bool _blades;
        Transform _spine, _chest, _neckXf, _headXf, _veil;
        readonly List<float> _armMorph = new List<float>();
        readonly List<float> _armWant = new List<float>();
        float _styleT, _pbCd;
        Renderer[] _bodyRends;

        public static NkDarkKnight Spawn(Vector3 pos, bool white = false)
        {
            var go = new GameObject(white ? "WhiteKnight" : "DarkKnight");
            go.transform.position = pos;
            var rb = go.AddComponent<Rigidbody>();
            rb.useGravity = false;
            rb.mass = white ? 520f : 240f;
            rb.linearDamping = white ? 0.28f : 0.35f;
            rb.angularDamping = 4f;
            rb.interpolation = RigidbodyInterpolation.Interpolate;
            rb.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;
            rb.constraints = RigidbodyConstraints.FreezeRotation;
            var cap = go.AddComponent<CapsuleCollider>();
            cap.height = 3.7f;
            cap.radius = 0.62f;
            cap.center = new Vector3(0f, 1.85f, 0f);
            var k = go.AddComponent<NkDarkKnight>();
            k._rb = rb;
            k.white = white;
            k.maxHearts = white ? 200f : 100f;
            k.hearts = k.maxHearts;
            if (white) k.learnAgro = 1.7f;
            if (white) k.BuildMech(go.transform);
            else k.BuildMechHi(go.transform);
            k._flank = Random.onUnitSphere;
            if (white) go.transform.localScale = Vector3.one * 1.85f;
            return k;
        }

        public bool IsHead(Vector3 at)
        {
            Vector3 local = transform.InverseTransformPoint(at);
            return local.y > 2.45f && new Vector2(local.x, local.z - 0.18f).magnitude < 0.72f;
        }

        void BuildMech(Transform root)
        {
            Color armor = white ? new Color(0.92f, 0.93f, 0.97f) : new Color(0.07f, 0.06f, 0.09f);
            Color plate = white ? new Color(0.8f, 0.82f, 0.88f) : new Color(0.12f, 0.1f, 0.14f);
            Color trim = white ? new Color(0.95f, 0.72f, 0.18f) : new Color(0.62f, 0.08f, 0.12f);
            Color joint = white ? new Color(0.55f, 0.56f, 0.6f) : new Color(0.2f, 0.18f, 0.22f);
            void Part(Transform parent, PrimitiveType t, Vector3 loc, Vector3 sc, Color c, string n = "p")
            {
                var p = GameObject.CreatePrimitive(t);
                Object.Destroy(p.GetComponent<Collider>());
                p.name = n;
                p.transform.SetParent(parent, false);
                p.transform.localPosition = loc;
                p.transform.localScale = sc;
                p.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(c, 1, false, 0.42f, 0.72f);
            }
            Part(root, PrimitiveType.Cube, new Vector3(0f, 1.15f, 0f), new Vector3(0.85f, 0.4f, 0.55f), plate, "pelvis");
            Part(root, PrimitiveType.Cube, new Vector3(0f, 2.15f, 0.08f), new Vector3(1.35f, 1.15f, 0.78f), armor, "torso");
            Part(root, PrimitiveType.Cube, new Vector3(0f, 2.2f, 0.42f), new Vector3(1.05f, 0.7f, 0.22f), plate, "plastron");
            Part(root, PrimitiveType.Cube, new Vector3(0f, 2.72f, 0.12f), new Vector3(0.72f, 0.55f, 0.62f), armor, "cockpit");
            var visor = GameObject.CreatePrimitive(PrimitiveType.Cube);
            Object.Destroy(visor.GetComponent<Collider>());
            visor.transform.SetParent(root, false);
            visor.transform.localPosition = new Vector3(0f, 2.74f, 0.42f);
            visor.transform.localScale = new Vector3(0.55f, 0.16f, 0.08f);
            visor.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(trim, 1, true);
            visor.name = "visor";
            var head = new GameObject("head");
            head.transform.SetParent(root, false);
            head.transform.localPosition = new Vector3(0f, 2.74f, 0.18f);
            var hs = head.AddComponent<SphereCollider>();
            hs.radius = 0.46f;
            var vg = visor.AddComponent<Light>();
            vg.type = LightType.Point;
            vg.color = trim;
            vg.range = 4.5f;
            vg.intensity = 2.4f;
            _visorLite = vg;
            _hipL = MakeLeg(root, -1f, armor, plate, joint);
            _hipR = MakeLeg(root, 1f, armor, plate, joint);
            _shinL = _hipL.Find("shin");
            _shinR = _hipR.Find("shin");
            Part(root, PrimitiveType.Cube, new Vector3(-0.95f, 2.55f, 0.05f), new Vector3(0.55f, 0.38f, 0.5f), plate, "pauldronL");
            Part(root, PrimitiveType.Cube, new Vector3(0.95f, 2.55f, 0.05f), new Vector3(0.55f, 0.38f, 0.5f), plate, "pauldronR");
            MakeArm(root, new Vector3(-0.92f, 2.42f, 0.02f), -1f, armor, plate, joint, trim);
            MakeArm(root, new Vector3(0.92f, 2.42f, 0.02f), 1f, armor, plate, joint, trim);
            if (white)
            {
                MakeArm(root, new Vector3(-1.08f, 1.7f, 0.28f), -1f, armor, plate, joint, trim);
                MakeArm(root, new Vector3(1.08f, 1.7f, 0.28f), 1f, armor, plate, joint, trim);
                MakeArm(root, new Vector3(-0.78f, 2.62f, -0.48f), -1f, armor, plate, joint, trim);
                MakeArm(root, new Vector3(0.78f, 2.62f, -0.48f), 1f, armor, plate, joint, trim);
            }
            var bodyCol = root.GetComponent<Collider>();
            foreach (var a in _armRoots) Ignore(bodyCol, a);
        }

        Transform MakeLeg(Transform parent, float side, Color armorCol, Color plateCol, Color jointCol)
        {
            var hip = new GameObject(side < 0 ? "HipL" : "HipR").transform;
            hip.SetParent(parent, false);
            hip.localPosition = new Vector3(side * 0.28f, 1.12f, 0.02f);
            NkGfx.HiBox(hip, new Vector3(0f, -0.38f, 0.02f), new Vector3(0.26f, 0.72f, 0.28f), armorCol, "thigh");
            var shin = new GameObject("shin").transform;
            shin.SetParent(hip, false);
            shin.localPosition = new Vector3(0f, -0.72f, 0.02f);
            NkGfx.HiBox(shin, new Vector3(0f, -0.32f, 0.04f), new Vector3(0.22f, 0.62f, 0.24f), plateCol, "calf");
            NkGfx.HiBox(shin, Vector3.zero, Vector3.one * 0.2f, jointCol, "knee");
            NkGfx.HiBox(shin, new Vector3(0f, -0.62f, 0.12f), new Vector3(0.3f, 0.14f, 0.5f), plateCol, "foot");
            return hip;
        }

        void BuildMechHi(Transform root)
        {
            Color armor = new Color(0.055f, 0.045f, 0.07f);
            Color plate = new Color(0.13f, 0.1f, 0.15f);
            Color trim = new Color(0.72f, 0.07f, 0.12f);
            Color joint = new Color(0.24f, 0.2f, 0.22f);
            var pelvis = new GameObject("pelvis").transform;
            pelvis.SetParent(root, false);
            pelvis.localPosition = new Vector3(0f, 1.1f, 0.02f);
            NkGfx.HiBox(pelvis, Vector3.zero, new Vector3(0.95f, 0.4f, 0.58f), plate, "pelvisBox");
            _spine = new GameObject("spine").transform;
            _spine.SetParent(pelvis, false);
            _spine.localPosition = new Vector3(0f, 0.26f, 0.02f);
            NkGfx.HiBox(_spine, new Vector3(0f, 0.16f, 0f), new Vector3(0.52f, 0.4f, 0.4f), armor, "spineBox");
            _chest = new GameObject("chest").transform;
            _chest.SetParent(_spine, false);
            _chest.localPosition = new Vector3(0f, 0.5f, 0.04f);
            NkGfx.HiBox(_chest, Vector3.zero, new Vector3(1.4f, 0.98f, 0.8f), armor, "torso");
            NkGfx.HiBox(_chest, new Vector3(0f, 0.04f, 0.4f), new Vector3(1.08f, 0.64f, 0.22f), plate, "plastron");
            NkGfx.HiBox(_chest, new Vector3(-0.78f, 0.4f, 0.04f), new Vector3(0.52f, 0.34f, 0.5f), plate, "pauldronL");
            NkGfx.HiBox(_chest, new Vector3(0.78f, 0.4f, 0.04f), new Vector3(0.52f, 0.34f, 0.5f), plate, "pauldronR");
            NkGfx.HiBox(_chest, new Vector3(0f, -0.12f, -0.32f), new Vector3(0.85f, 0.55f, 0.28f), armor, "reactor");
            _neckXf = new GameObject("neck").transform;
            _neckXf.SetParent(_chest, false);
            _neckXf.localPosition = new Vector3(0f, 0.55f, 0.08f);
            NkGfx.HiBox(_neckXf, Vector3.zero, new Vector3(0.26f, 0.26f, 0.26f), joint, "neckBox");
            _headXf = new GameObject("head").transform;
            _headXf.SetParent(_neckXf, false);
            _headXf.localPosition = new Vector3(0f, 0.3f, 0.08f);
            NkGfx.HiBox(_headXf, Vector3.zero, new Vector3(0.64f, 0.5f, 0.58f), armor, "helm");
            NkGfx.HiBox(_headXf, new Vector3(0f, 0.18f, 0.02f), new Vector3(0.42f, 0.16f, 0.5f), plate, "crown");
            var visor = NkGfx.HiBox(_headXf, new Vector3(0f, 0.02f, 0.3f), new Vector3(0.52f, 0.13f, 0.08f), trim, "visor");
            var hs = _headXf.gameObject.AddComponent<SphereCollider>();
            hs.radius = 0.44f;
            var vg = visor.gameObject.AddComponent<Light>();
            vg.type = LightType.Point;
            vg.color = trim;
            vg.range = 5f;
            vg.intensity = 2.6f;
            _visorLite = vg;
            _hipL = MakeLeg(root, -1f, armor, plate, joint);
            _hipR = MakeLeg(root, 1f, armor, plate, joint);
            _shinL = _hipL.Find("shin");
            _shinR = _hipR.Find("shin");
            MakeArm(_chest, new Vector3(-0.88f, 0.22f, 0.02f), -1f, armor, plate, joint, trim);
            MakeArm(_chest, new Vector3(0.88f, 0.22f, 0.02f), 1f, armor, plate, joint, trim);
            var bodyCol = root.GetComponent<Collider>();
            foreach (var a in _armRoots) Ignore(bodyCol, a);
        }

        Transform MakeArm(Transform root, Vector3 loc, float side, Color armor, Color plate, Color joint, Color trim)
        {
            var arm = new GameObject((side < 0 ? "ArmL" : "ArmR") + _armRoots.Count).transform;
            arm.SetParent(root, false);
            arm.localPosition = loc;
            void Box(Transform p, Vector3 loc, Vector3 sc, Color c, string n, List<Renderer> bag = null)
            {
                var g = GameObject.CreatePrimitive(PrimitiveType.Cube);
                Object.Destroy(g.GetComponent<Collider>());
                g.name = n;
                g.transform.SetParent(p, false);
                g.transform.localPosition = loc;
                g.transform.localScale = sc;
                g.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(c, 1, false, 0.45f, 0.75f);
                if (bag != null) bag.Add(g.GetComponent<Renderer>());
            }
            Box(arm, new Vector3(side * 0.08f, -0.35f, 0.04f), new Vector3(0.28f, 0.85f, 0.28f), armor, "upper");
            Box(arm, new Vector3(side * 0.06f, -0.95f, 0.08f), new Vector3(0.32f, 0.55f, 0.32f), plate, "fore");
            Box(arm, new Vector3(side * 0.05f, -0.62f, 0.04f), new Vector3(0.22f, 0.18f, 0.22f), joint, "elbow");
            var barrel = GameObject.CreatePrimitive(PrimitiveType.Cube);
            Object.Destroy(barrel.GetComponent<Collider>());
            barrel.name = "barrel";
            barrel.transform.SetParent(arm, false);
            barrel.transform.localPosition = new Vector3(side * 0.04f, -1.28f, 0.38f);
            barrel.transform.localScale = new Vector3(0.22f, 0.22f, 0.72f);
            barrel.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(new Color(0.16f, 0.18f, 0.22f), 1, false, 0.5f, 0.8f);
            _cannonRends.Add(barrel.GetComponent<Renderer>());
            var sleeve = GameObject.CreatePrimitive(PrimitiveType.Cube);
            Object.Destroy(sleeve.GetComponent<Collider>());
            sleeve.transform.SetParent(arm, false);
            sleeve.transform.localPosition = new Vector3(side * 0.04f, -1.18f, 0.12f);
            sleeve.transform.localScale = new Vector3(0.3f, 0.26f, 0.28f);
            sleeve.GetComponent<Renderer>().sharedMaterial = NkGfx.Chrome();
            _cannonRends.Add(sleeve.GetComponent<Renderer>());
            var mz = new GameObject("muzzle").transform;
            mz.SetParent(arm, false);
            mz.localPosition = new Vector3(side * 0.04f, -1.28f, 0.78f);
            var ring = GameObject.CreatePrimitive(PrimitiveType.Cube);
            Object.Destroy(ring.GetComponent<Collider>());
            ring.transform.SetParent(mz, false);
            ring.transform.localScale = new Vector3(0.18f, 0.18f, 0.06f);
            ring.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(new Color(0.55f, 0.85f, 1f), 1, true);
            _cannonRends.Add(ring.GetComponent<Renderer>());
            var glow = mz.gameObject.AddComponent<Light>();
            glow.type = LightType.Point;
            glow.color = Color.white;
            glow.range = 2.8f;
            glow.intensity = 0.4f;
            var blade = GameObject.CreatePrimitive(PrimitiveType.Cube);
            Object.Destroy(blade.GetComponent<Collider>());
            blade.name = "blade";
            blade.transform.SetParent(arm, false);
            blade.transform.localPosition = new Vector3(side * 0.04f, -1.32f, 0.72f);
            blade.transform.localScale = new Vector3(0.06f, 0.14f, 1.15f);
            blade.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(new Color(0.05f, 0.04f, 0.07f), 1, false, 0.9f, 0.85f);
            _bladeRends.Add(blade.GetComponent<Renderer>());
            var edge = GameObject.CreatePrimitive(PrimitiveType.Cube);
            Object.Destroy(edge.GetComponent<Collider>());
            edge.transform.SetParent(arm, false);
            edge.transform.localPosition = new Vector3(side * 0.04f, -1.32f, 0.72f);
            edge.transform.localScale = new Vector3(0.02f, 0.16f, 1.12f);
            edge.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(1f, 0.15f, 0.12f, 0.35f));
            _bladeRends.Add(edge.GetComponent<Renderer>());
            var bcol = arm.gameObject.AddComponent<BoxCollider>();
            bcol.center = new Vector3(side * 0.04f, -1.2f, 0.45f);
            bcol.size = new Vector3(0.28f, 0.35f, 1.1f);
            bcol.isTrigger = true;
            _armRoots.Add(arm);
            _muzzles.Add(mz);
            _bladeTips.Add(blade.transform);
            _glows.Add(glow);
            if (side < 0 && !_leftArm) { _leftArm = arm; _leftMuzzle = mz; _leftBlade = blade.transform; _leftBarrel = barrel.transform; _leftGlow = glow; }
            else if (side > 0 && !_rightArm) { _rightArm = arm; _rightMuzzle = mz; _rightBlade = blade.transform; _rightBarrel = barrel.transform; _rightGlow = glow; }
            SetArmShape(arm, 0f);
            return arm;
        }

        static void Ignore(Collider a, Transform root)
        {
            if (!a || !root) return;
            foreach (var c in root.GetComponentsInChildren<Collider>())
                Physics.IgnoreCollision(a, c);
        }

        public void Tick(float dt, NkPlayer player, NetKnightGame game, NkWorld world)
        {
            if (!player || !_rb) return;
            TickWarp(dt);
            Vector3 me = transform.position + Vector3.up * 1.8f;
            Vector3 you = player.transform.position + Vector3.up;
            Vector3 to = you - me;
            float dist = to.magnitude;
            Vector3 dir = dist > 0.01f ? to / dist : transform.forward;
            _stateT -= dt;
            _strikeCd -= dt;
            _fleeLock -= dt;
            _shotCd -= dt;
            _kickLock -= dt;
            _slash += dt;

            TickLoadout(dt, dist);
            ApplyMorph();
            AnimateLegs(dt);
            AnimateTorso(dt, dir, dist);
            TickVeil(dt, player);

            _hurtBurst = Mathf.MoveTowards(_hurtBurst, 0f, dt * 1.6f);
            if (fleeing)
            {
                var away = (me - you).normalized + Vector3.up * 0.55f + _flank * 0.35f;
                _rb.AddForce(away * 22f * learnAgro, ForceMode.Acceleration);
                if (lookDir(dir).sqrMagnitude > 0.05f)
                    transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(lookDir(dir)), dt * 6f);
                AimArms(dir, dt, _blades ? 1f : 0.3f);
                if (_fleeLock <= 0) fleeing = false;
                TickBolts(dt, game);
                return;
            }

            if (!white && _mercyUsed == 0 && hearts > 30 && game.playerHearts <= game.playerMaxHearts * 0.28f)
            {
                _mercyUsed = 1;
                if (Random.value < 0.5f)
                {
                    bool one = Random.value < 0.5f;
                    game.playerHearts = one ? 1 : Mathf.Max(1, game.playerMaxHearts / 2);
                    fleeing = true;
                    _fleeLock = 9f;
                    game.Hint(one ? "The Dark Knight leaves you with one heart and vanishes." : "The Dark Knight shows mercy — half your hearts — then flees.");
                    TickBolts(dt, game);
                    return;
                }
            }

            NkSphere sph = null;
            Vector3 inward = Vector3.up;
            float gap = 99f;
            if (world != null) world.InsideAny(me, out sph, out gap, out inward);

            if (_stateT <= 0f)
            {
                _zig = 1 - _zig;
                _flank = Vector3.Cross(dir, inward.sqrMagnitude > 0.1f ? inward : Vector3.up).normalized;
                if (_flank.sqrMagnitude < 0.1f) _flank = transform.right;
                if (_zig == 0) _flank = -_flank;
                if (_blades || dist < 6.8f) _mode = 3;
                else if (sph != null && gap < 2.4f && _kickLock <= 0f) _mode = 1;
                else _mode = 0;
                _stateT = Random.Range(0.28f, 0.7f);
            }

            Vector3 want;
            if (_mode == 1 && sph != null)
            {
                Vector3 wallDir = ((me - sph.c).normalized + _flank * 0.85f).normalized;
                want = sph.c + wallDir * (sph.r - 0.7f);
            }
            else if (_mode == 3)
                want = you + _flank * 1.1f + Vector3.up * 0.4f;
            else
                want = you + _flank * (4.2f + learnRespectPulse) + inward * (1.2f * learnVertical) - dir * 1.6f;

            Vector3 steer = want - me;
            float speed = (_mode == 1 ? 22f : 14f) * learnAgro * (white ? 1.55f : 1f);
            _rb.AddForce(steer.normalized * speed - _rb.linearVelocity * 0.28f, ForceMode.Acceleration);

            if (sph != null && gap < 1.15f && _kickLock <= 0f && Vector3.Dot(_rb.linearVelocity, -inward) > 0.4f)
                Kick(inward, dir);

            Vector3 look = new Vector3(dir.x, 0f, dir.z);
            if (look.sqrMagnitude > 0.05f)
                transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(look), dt * 5f);

            AimArms(dir, dt, _blades ? 1f : 0f);

            _pbCd -= dt;
            bool anyCannon = false;
            for (int i = 0; i < _armMorph.Count; i++) if (_armMorph[i] < 0.4f) anyCannon = true;
            if (anyCannon && dist > 2.2f && dist < 42f && _shotCd <= 0f)
            {
                for (int i = 0; i < _muzzles.Count; i++)
                    if (i >= _armMorph.Count || _armMorph[i] < 0.45f)
                        FireMuzzle(_muzzles[i], you + _flank * ((i % 3) - 1) * 0.42f);
                _shotCd = Mathf.Clamp((white ? 1.15f : 0.95f) / Mathf.Max(0.7f, learnAgro), 0.5f, 1.25f);
                game.live.Attack();
            }
            else if (!white && _blades && dist < 2.7f && _pbCd <= 0f && _muzzles.Count > 0 && Random.value < 0.45f)
            {
                _pbCd = Random.Range(1.1f, 1.8f);
                FireMuzzle(_muzzles[Random.Range(0, _muzzles.Count)], you);
                game.live.Attack();
            }

            if (_blades && _strikeCd <= 0f && dist < (white ? 4.6f : 3.6f))
            {
                _strikeCd = learnStrikeGap * 0.65f;
                game.live.Attack();
                TrySlash(player, game, dir);
            }

            TickBolts(dt, game);
        }

        static Vector3 lookDir(Vector3 dir)
        {
            var look = new Vector3(dir.x, 0f, dir.z);
            return look;
        }

        void AnimateLegs(float dt)
        {
            if (!_hipL || !_hipR) return;
            Vector3 v = _rb ? _rb.linearVelocity : Vector3.zero;
            float spd = v.magnitude;
            _legPhase += dt * Mathf.Clamp(spd * 0.55f, 1.4f, 7.5f);
            float twist = Mathf.Clamp(Vector3.Dot(transform.right, v) * 0.08f, -18f, 18f);
            float lift = Mathf.Clamp(v.y * 4f, -16f, 22f);
            void Leg(Transform hip, Transform shin, float sign)
            {
                float swing = Mathf.Sin(_legPhase) * sign * Mathf.Lerp(8f, 38f, Mathf.Clamp01(spd / 12f));
                hip.localRotation = Quaternion.Euler(swing + lift * 0.25f, twist * sign, -twist * 0.35f);
                if (shin) shin.localRotation = Quaternion.Euler(-Mathf.Abs(swing) * 0.85f - 8f, 0f, 0f);
            }
            Leg(_hipL, _shinL, 1f);
            Leg(_hipR, _shinR, -1f);
        }

        void Kick(Vector3 inward, Vector3 toPlayer)
        {
            _kickLock = 0.55f;
            _mode = 0;
            _stateT = 0.45f;
            Vector3 kick = inward * (16f + 4f * learnVertical) + toPlayer * 11f * learnAgro + _flank * 9f;
            _rb.AddForce(kick, ForceMode.VelocityChange);
            _zig = 1 - _zig;
            _flank = -_flank;
        }

        void AimArms(Vector3 dir, float dt, float blade)
        {
            if (dir.sqrMagnitude < 0.01f) return;
            float slash = Mathf.Sin(_slash * (blade > 0.5f ? 9f : 3.2f));
            Vector3 local = transform.InverseTransformDirection(dir);
            if (local.sqrMagnitude < 0.01f) local = Vector3.forward;
            Quaternion aim = Quaternion.LookRotation(local, Vector3.up);
            for (int i = 0; i < _armRoots.Count; i++)
            {
                var arm = _armRoots[i];
                if (!arm) continue;
                float side = arm.localPosition.x >= 0f ? 1f : -1f;
                float amp = blade > 0.5f ? ((i % 2 == 0) ? slash : -slash) * 50f : 8f;
                var want = aim * Quaternion.Euler(amp, side * 10f, side * 12f);
                arm.localRotation = Quaternion.Slerp(arm.localRotation, want, dt * 8f);
            }
        }

        void ApplyMorph()
        {
            for (int i = 0; i < _armRoots.Count; i++)
                SetArmShape(_armRoots[i], i < _armMorph.Count ? _armMorph[i] : _morph);
            Color white = Color.white;
            Color steel = new Color(0.16f, 0.18f, 0.22f);
            Color blade = new Color(0.05f, 0.04f, 0.07f);
            float glow = _morph < 0.5f ? _morph * 2f : (1f - _morph) * 2f;
            glow = Mathf.Clamp01(glow);
            foreach (var r in _cannonRends)
            {
                if (!r) continue;
                var c = Color.Lerp(steel, white, Mathf.Clamp01(_morph * 1.6f));
                Tint(r, c);
                r.enabled = _morph < 0.72f;
            }
            foreach (var r in _bladeRends)
            {
                if (!r) continue;
                var c = Color.Lerp(white, blade, Mathf.InverseLerp(0.4f, 1f, _morph));
                Tint(r, c);
                r.enabled = _morph > 0.28f;
            }
            foreach (var g in _glows) if (g) g.intensity = 0.35f + glow * 5.5f;
            if (_visorLite) _visorLite.intensity = 2.2f + glow * 1.5f;
        }

        void SetArmShape(Transform arm, float t)
        {
            if (!arm) return;
            var barrel = arm.Find("barrel");
            var blade = arm.Find("blade");
            if (barrel) barrel.localScale = new Vector3(0.22f, 0.22f, Mathf.Lerp(0.72f, 0.12f, t));
            if (blade) blade.localScale = new Vector3(0.06f, 0.14f, Mathf.Lerp(0.08f, 1.15f, t));
        }

        static void Tint(Renderer r, Color c)
        {
            if (!r || !r.material) return;
            if (r.material.HasProperty("_BaseColor")) r.material.SetColor("_BaseColor", c);
            r.material.color = c;
        }

        void FireMuzzle(Transform mz, Vector3 target)
        {
            if (!mz) return;
            Vector3 dir = (target - mz.position).normalized;
            dir = (dir + Random.insideUnitSphere * 0.045f).normalized;
            var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            Object.Destroy(go.GetComponent<Collider>());
            go.transform.position = mz.position;
            go.transform.localScale = Vector3.one * 0.16f;
            go.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(white
                ? new Color(1f, 0.92f, 0.55f, 0.95f)
                : new Color(0.75f, 0.2f, 0.28f, 0.95f));
            if (mz) NkSfx.Plasma(mz.position, false);
            _bolts.Add(new NkBolt
            {
                t = go.transform, p = mz.position, dir = dir,
                spd = 22f, spd0 = 22f, spdMax = 28.6f,
                life = 2.6f, dmg = 5.5f, blast = 1.6f, size = 0.16f, charged = false
            });
        }

        void TickBolts(float dt, NetKnightGame game)
        {
            for (int i = _bolts.Count - 1; i >= 0; i--)
            {
                var b = _bolts[i];
                b.life -= dt;
                b.spd = Mathf.MoveTowards(b.spd, b.spdMax, (b.spdMax - b.spd0) * dt / 0.8f);
                Vector3 vel = b.dir * b.spd;
                Vector3 np = b.p + vel * dt;
                NkWindow.Threat(b.p, vel);
                var weap = game && game.player ? game.player.weapons : null;
                if (weap && NkCombat.NearSword(weap, b.p, b.size))
                {
                    b.dir = NkCombat.BounceOffSword(b.dir, weap, b.p);
                    NkWeapons.Sparks(b.p);
                    NkSfx.Shield(b.p);
                    np = b.p + b.dir * b.spd * dt;
                }
                else if (Physics.SphereCast(b.p, b.size * 0.45f, b.dir, out var hit, vel.magnitude * dt + 0.05f))
                {
                    if (NkCombat.HitsSword(hit.collider, weap))
                    {
                        b.dir = NkCombat.BounceOffSword(b.dir, weap, hit.point);
                        NkWeapons.Sparks(hit.point);
                        NkSfx.Shield(hit.point);
                    }
                    else if (!(hit.collider.transform == transform || hit.collider.transform.IsChildOf(transform)))
                    {
                        if (hit.collider.GetComponentInParent<NkPlayer>() && game)
                        {
                            game.HurtPlayer(2, b.dir);
                            game.live.hitsTaken++;
                        }
                        NkWeapons.Blast(hit.point, hit.normal, b.dmg, b.blast, false, game, transform, b.size);
                        if (b.t) Object.Destroy(b.t.gameObject);
                        _bolts.RemoveAt(i);
                        continue;
                    }
                    else
                    {
                        if (b.t) Object.Destroy(b.t.gameObject);
                        _bolts.RemoveAt(i);
                        continue;
                    }
                }
                if (b.life <= 0f)
                {
                    if (b.t) Object.Destroy(b.t.gameObject);
                    _bolts.RemoveAt(i);
                    continue;
                }
                b.p = np;
                if (b.t) b.t.position = np;
                _bolts[i] = b;
            }
        }

        void TrySlash(NkPlayer player, NetKnightGame game, Vector3 dir)
        {
            Vector3 you = player.transform.position + Vector3.up;
            float reach = white ? 2.1f : 1.45f;
            for (int i = 0; i < _bladeTips.Count; i++)
            {
                var tip = _bladeTips[i] ? _bladeTips[i].position : transform.position;
                if (Vector3.Distance(tip, you) < reach)
                {
                    game.HurtPlayer(white ? 5 : 4, dir);
                    game.live.hitsTaken++;
                    NkWeapons.Sparks(you);
                    return;
                }
            }
        }

        public void Hurt(float dmg, Vector3 dir)
        {
            hearts -= dmg;
            if (hearts < 0) hearts = 0;
            if (_rb) _rb.AddForce(dir.normalized * 2.2f, ForceMode.VelocityChange);
            _hurtBurst += dmg;
            _warpDmg += dmg;
            if (_hurtBurst >= 8f && _fleeLock <= 0f)
            {
                fleeing = true;
                _fleeLock = 3.4f;
                _hurtBurst = 0f;
            }
            var g = Object.FindAnyObjectByType<NetKnightGame>();
            if (g) g.AddKnightScore(dmg);
            if (_warpDmg >= 4f && _warpLock <= 0f && hearts > 0f && g && g.world != null)
                Warp(g.world, g.player ? g.player.transform.position : transform.position);
        }

        public void SurviveWipe(NkWorld world)
        {
            NkSfx.Crowd(transform.position);
            hearts = Mathf.Max(40f, maxHearts * 0.55f);
            if (world != null) Warp(world, transform.position);
        }

        public void Warp(NkWorld world, Vector3 avoid)
        {
            if (world == null || world.spheres.Count == 0 || _warpLock > 0f) return;
            _warpDmg = 0f;
            _warpLock = 1.4f;
            fleeing = true;
            _fleeLock = 2.2f;
            world.InsideAny(transform.position, out var here, out _, out _);
            NkSphere dest = here;
            for (int n = 0; n < 12; n++)
            {
                var s = world.spheres[Random.Range(0, world.spheres.Count)];
                if (s != here) { dest = s; break; }
            }
            if (dest == null) dest = world.spheres[0];
            Vector3 p = dest.c + Random.onUnitSphere * (dest.r * Random.Range(0.22f, 0.42f));
            if (Vector3.Distance(p, avoid) < 12f)
                p = dest.c - (avoid - dest.c).normalized * (dest.r * 0.35f);
            NkWeapons.Sparks(transform.position);
            NkSfx.Boom(transform.position);
            BlinkFx(transform.position);
            if (_rb)
            {
                _rb.position = p;
                _rb.linearVelocity = Vector3.zero;
                _rb.angularVelocity = Vector3.zero;
            }
            transform.position = p;
            Physics.SyncTransforms();
            BlinkFx(p);
            NkSfx.Boost(p);
            var g = Object.FindAnyObjectByType<NetKnightGame>();
            if (g) g.Hint((white ? "White" : "Dark") + " Knight blinks to another sphere.");
        }

        public void TickWarp(float dt) { _warpLock -= dt; }

        void TickLoadout(float dt, float dist)
        {
            while (_armWant.Count < _armRoots.Count) _armWant.Add(0f);
            while (_armMorph.Count < _armRoots.Count) _armMorph.Add(0f);
            _styleT -= dt;
            if (!white)
            {
                if (dist < 6.5f)
                {
                    for (int i = 0; i < _armWant.Count; i++) _armWant[i] = 1f;
                    if (_styleT <= 0f && Random.value < 0.42f)
                    {
                        _armWant[Random.Range(0, _armWant.Count)] = 0f;
                        _styleT = Random.Range(15f, 30f);
                    }
                }
                else if (dist > 11.5f)
                {
                    for (int i = 0; i < _armWant.Count; i++) _armWant[i] = 0f;
                    if (_styleT <= 0f && Random.value < 0.45f)
                    {
                        _armWant[Random.Range(0, _armWant.Count)] = 1f;
                        _styleT = Random.Range(15f, 30f);
                    }
                }
                else if (_styleT <= 0f)
                {
                    float roll = Random.value;
                    for (int i = 0; i < _armWant.Count; i++)
                    {
                        if (roll < 0.34f) _armWant[i] = 0f;
                        else if (roll < 0.68f) _armWant[i] = 1f;
                        else _armWant[i] = (i % 2 == 0) ? 1f : 0f;
                    }
                    _styleT = Random.Range(15f, 30f);
                }
            }
            else
            {
                float w = dist < 7.2f ? 1f : 0f;
                for (int i = 0; i < _armWant.Count; i++) _armWant[i] = w;
            }
            float avg = 0f;
            for (int i = 0; i < _armMorph.Count; i++)
            {
                _armMorph[i] = Mathf.MoveTowards(_armMorph[i], _armWant[i], dt * 3.6f);
                avg += _armMorph[i];
            }
            _morph = _armMorph.Count > 0 ? avg / _armMorph.Count : 0f;
            _blades = _morph > 0.4f;
        }

        void AnimateTorso(float dt, Vector3 dir, float dist)
        {
            if (_spine)
            {
                float lean = Mathf.Clamp(-dir.y * 22f + (dist < 6f ? 8f : 0f), -18f, 14f);
                float twist = Mathf.Clamp(Vector3.Dot(transform.right, dir) * 26f, -24f, 24f);
                _spine.localRotation = Quaternion.Slerp(_spine.localRotation, Quaternion.Euler(lean, twist, -twist * 0.25f), dt * 4.2f);
            }
            if (_chest)
                _chest.localRotation = Quaternion.Slerp(_chest.localRotation, Quaternion.Euler(Mathf.Sin(Time.time * 1.4f) * 3f, 0f, 0f), dt * 3f);
            if (_neckXf)
            {
                Vector3 local = (_chest ? _chest : transform).InverseTransformDirection(dir);
                if (local.sqrMagnitude < 0.01f) local = Vector3.forward;
                local.x = Mathf.Clamp(local.x, -0.65f, 0.65f);
                local.y = Mathf.Clamp(local.y, -0.45f, 0.55f);
                var look = Quaternion.LookRotation(local.normalized, Vector3.up);
                _neckXf.localRotation = Quaternion.Slerp(_neckXf.localRotation, look, dt * 6f);
            }
        }

        void TickVeil(float dt, NkPlayer player)
        {
            if (white)
            {
                if (_veil) _veil.gameObject.SetActive(false);
                return;
            }
            if (!_veil)
            {
                var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                Object.DestroyImmediate(go.GetComponent<Collider>());
                go.name = "DarkVeil";
                go.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(new Color(0.01f, 0.01f, 0.015f), 1, true);
                go.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                _veil = go.transform;
                _veil.position = transform.position;
                var list = new List<Renderer>();
                foreach (var r in GetComponentsInChildren<Renderer>(true))
                    if (r && r.transform != _veil) list.Add(r);
                _bodyRends = list.ToArray();
            }
            const float rad = 22f;
            Vector3 c = transform.position + Vector3.up * 1.7f;
            _veil.position = Vector3.Lerp(_veil.position, c, dt * 2.6f);
            _veil.localScale = Vector3.one * (rad * 2f);
            var cam = player && player.cam ? player.cam : (Camera.main ? Camera.main.transform : null);
            bool inside = cam && (cam.position - _veil.position).sqrMagnitude < rad * rad;
            var vr = _veil.GetComponent<Renderer>();
            if (vr) vr.enabled = !inside;
            if (_bodyRends != null)
                foreach (var r in _bodyRends) if (r) r.enabled = inside;
        }

        static void BlinkFx(Vector3 p)
        {
            for (int i = 0; i < 16; i++)
            {
                var s = GameObject.CreatePrimitive(PrimitiveType.Cube);
                Object.DestroyImmediate(s.GetComponent<Collider>());
                s.transform.position = p + Vector3.up * 1.4f + Random.insideUnitSphere * 0.8f;
                s.transform.localScale = Vector3.one * Random.Range(0.08f, 0.22f);
                s.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(0.7f, 0.1f, 0.15f, 0.95f));
                Object.Destroy(s, 0.28f);
            }
        }
    }
}
