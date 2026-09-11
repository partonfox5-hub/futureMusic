using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.XR;

namespace NetKnight
{
    public class NkPlayer : MonoBehaviour
    {
        public Rigidbody body;
        public Transform rig, cam;
        public NkWeapons weapons;
        public bool grounded;
        public Vector3 groundN;
        public float jetFuel = 1f;
        Vector3 _moveDir = Vector3.forward;
        float _speed, _landLock, _pulseCd, _lurchP, _lurchR;
        bool _snapLatch;
        GameObject _pulseVis, _goldVis;
        Material _fieldMat, _pulseMat;
        bool _goldOn;
        Quaternion _headRot = Quaternion.identity;

        public static NkPlayer Spawn(Transform parent, Vector3 pos, NkInput input)
        {
            var go = new GameObject("Player");
            go.transform.SetParent(parent, false);
            go.transform.position = pos;
            var rb = go.AddComponent<Rigidbody>();
            rb.useGravity = false;
            rb.mass = 78f;
            rb.linearDamping = 0.12f;
            rb.angularDamping = 4f;
            rb.interpolation = RigidbodyInterpolation.Interpolate;
            rb.collisionDetectionMode = CollisionDetectionMode.Continuous;
            rb.constraints = RigidbodyConstraints.FreezeRotation;
            var col = go.AddComponent<CapsuleCollider>();
            col.height = 1.7f;
            col.radius = 0.22f;
            col.center = new Vector3(0, 0.85f, 0);
            var p = go.AddComponent<NkPlayer>();
            p.body = rb;
            p.rig = go.transform;
            p.cam = Camera.main.transform;
            p.weapons = NkWeapons.Attach(p);
            p.BuildFx();
            return p;
        }

        void BuildFx()
        {
            _pulseMat = NkGfx.Additive(new Color(0.4f, 0.92f, 1f, 0.85f));
            _pulseVis = new GameObject("PulseCage");
            _pulseVis.transform.SetParent(transform, false);
            NkGfx.WireCage(_pulseVis.transform, 1f, _pulseMat, 16, 0.055f);
            _pulseVis.SetActive(false);
            _fieldMat = NkGfx.Additive(new Color(1f, 0.82f, 0.2f, 0.7f));
            _goldVis = new GameObject("GoldCage");
            _goldVis.transform.SetParent(transform, false);
            _goldVis.transform.localPosition = new Vector3(0f, 1.05f, 0f);
            NkGfx.WireCage(_goldVis.transform, 1f, _fieldMat, 14, 0.045f);
            _goldVis.SetActive(false);
        }

        public Vector3 HPosPub(NkInput inp, NkHand h) => inp.xrActive ? transform.TransformPoint(h.pos) : h.pos;
        public Quaternion HRotPub(NkInput inp, NkHand h) => inp.xrActive ? transform.rotation * h.rot : h.rot;

        public void Tick(float dt, NkInput inp, NkWorld world, NetKnightGame game)
        {
            if (inp.xrActive && inp.headValid)
            {
                cam.localPosition = inp.headPos;
                _headRot = inp.headRot;
            }
            else _headRot = cam.localRotation;

            Vector3 head = cam.position;
            Vector3 fwd = cam.forward; fwd.y = 0;
            if (fwd.sqrMagnitude < 1e-6f) fwd = transform.forward;
            fwd.Normalize();
            Vector3 right = Vector3.Cross(Vector3.up, fwd);

            world.InsideAny(transform.position + Vector3.up, out var sph, out float gap, out var inward);
            grounded = sph != null && gap > -0.55f && gap < 0.45f && Vector3.Dot(body.linearVelocity, -inward) > -1.2f;
            groundN = inward;
            if (NkPad.TryStandAny(transform.position + Vector3.up * 0.15f, out var pn))
            {
                grounded = true;
                groundN = pn;
                inward = pn;
            }
            if (Time.timeSinceLevelLoad > 1.2f && grounded && _landLock <= 0 && Vector3.Dot(body.linearVelocity, -inward) > 0.35f)
            {
                _landLock = 0.45f;
                NkSfx.Land(transform.position);
                NkInput.Rumble(XRNode.LeftHand, 0.28f, 0.07f);
                NkInput.Rumble(XRNode.RightHand, 0.28f, 0.07f);
                body.linearVelocity = Vector3.ProjectOnPlane(body.linearVelocity, -inward) * 0.35f;
            }
            _landLock -= dt;

            float jet = game.jetMul;
            Vector2 ls = inp.left.valid ? inp.left.stick : Vector2.zero;
            Vector2 rs = inp.right.valid ? inp.right.stick : Vector2.zero;
            if (!inp.xrActive)
            {
                var k = Keyboard.current;
                if (k != null)
                {
                    if (k.wKey.isPressed) ls.y += 1;
                    if (k.sKey.isPressed) ls.y -= 1;
                    if (k.aKey.isPressed) ls.x -= 1;
                    if (k.dKey.isPressed) ls.x += 1;
                    if (k.spaceKey.isPressed) rs.y += 1;
                    if (k.leftShiftKey.isPressed) rs.y -= 1;
                }
            }

            Vector3 wish = fwd * ls.y + right * ls.x + cam.up * rs.y;
            float stickMag = Mathf.Clamp01(Mathf.Max(ls.magnitude, Mathf.Abs(rs.y)));
            float baseSpd = 12.37005f * jet * game.moveMul * game.EnergySpeed;
            float maxSpd = Mathf.Lerp(baseSpd, baseSpd * 1.05f, Mathf.InverseLerp(0.55f, 1f, stickMag));
            if (wish.sqrMagnitude > 0.04f)
            {
                _speed = Mathf.MoveTowards(_speed, maxSpd, maxSpd * dt / 2.5f);
                _moveDir = Vector3.Slerp(_moveDir, wish.normalized, dt * 6f).normalized;
            }
            else
                _speed = Mathf.MoveTowards(_speed, 0f, maxSpd * dt / 1.5f);

            Vector3 cruise = _moveDir * _speed;
            Vector3 vel = body.linearVelocity;
            Vector3 delta = cruise - vel;
            delta = Vector3.ClampMagnitude(delta, maxSpd * 3f);
            body.AddForce(delta * 4.2f, ForceMode.Acceleration);

            if (inp.xrActive)
                ApplyStickYaw(rs.x, dt);

            bool a = inp.right.primary || (!inp.xrActive && Keyboard.current != null && Keyboard.current.eKey.isPressed);
            if (a)
            {
                if (grounded && inp.right.primaryDown)
                {
                    Vector3 kick = inward * (10.13f * jet);
                    if (_speed > 0.4f) kick += _moveDir * (3.2f * jet);
                    body.AddForce(kick, ForceMode.VelocityChange);
                    NkInput.Rumble(XRNode.LeftHand, 0.48f, 0.09f);
                    NkInput.Rumble(XRNode.RightHand, 0.55f, 0.1f);
                    NkSfx.Boost(transform.position);
                    grounded = false;
                    _speed = Mathf.Max(_speed, 6.2f * jet);
                    _moveDir = inward.normalized;
                }
                else
                    body.AddForce(cam.forward * 14f * jet, ForceMode.Acceleration);
            }

            float side = Vector3.Dot(body.linearVelocity, cam.right);
            float along = Vector3.Dot(body.linearVelocity, cam.forward);
            float wantRoll = Mathf.Clamp(-side * 0.35f, -4.2f, 4.2f);
            float wantPitch = Mathf.Clamp(along * 0.12f, -2.4f, 2.4f);
            _lurchR = Mathf.Lerp(_lurchR, wantRoll, dt * 3.2f);
            _lurchP = Mathf.Lerp(_lurchP, wantPitch, dt * 3.2f);
            if (!inp.xrActive)
                cam.localRotation = _headRot * Quaternion.Euler(_lurchP, 0f, _lurchR);

            _goldOn = game && game.Gold;
            if (_goldOn) GoldField(game);
            else if (_goldVis) _goldVis.SetActive(false);

            if (weapons) weapons.Tick(dt, inp, this, game);

            _pulseCd -= dt;
            if (inp.right.secondaryDown || (!inp.xrActive && Keyboard.current != null && Keyboard.current.qKey.wasPressedThisFrame))
                Pulse(game);

            NkCombat.TickLoot(dt, head, game);

            bool lMis = inp.left.stickClickDown || (!inp.xrActive && Keyboard.current != null && Keyboard.current.fKey.wasPressedThisFrame);
            bool rMis = inp.right.stickClickDown || (!inp.xrActive && Keyboard.current != null && Keyboard.current.hKey.wasPressedThisFrame);
            if (lMis) game.FireMissile(-1);
            if (rMis) game.FireMissile(1);

            foreach (var pet in NkPet.All.ToArray())
                if (pet) pet.Tick(dt, this, game);
        }

        // Rigidbody FreezeRotation used to eat transform.Rotate, so stick yaw barely moved.
        // Write rotation onto the body so physics cannot snap it back.
        void ApplyStickYaw(float stickX, float dt)
        {
            const float dead = 0.08f;
            const float degPerSec = 240f;
            float ax = stickX;
            float dyaw = 0f;
            if (NkMenu.SnapTurn)
            {
                if (Mathf.Abs(ax) < 0.28f) _snapLatch = false;
                else if (!_snapLatch && Mathf.Abs(ax) > 0.62f)
                {
                    dyaw = Mathf.Sign(ax) * 45f;
                    _snapLatch = true;
                }
                if (dyaw == 0f) return;
            }
            else
            {
                if (Mathf.Abs(ax) < dead) return;
                float mag = Mathf.InverseLerp(dead, 1f, Mathf.Abs(ax));
                dyaw = Mathf.Sign(ax) * mag * degPerSec * dt;
            }
            Quaternion next = Quaternion.AngleAxis(dyaw, Vector3.up) * transform.rotation;
            transform.rotation = next;
            if (body)
            {
                body.angularVelocity = Vector3.zero;
                body.rotation = next;
                body.MoveRotation(next);
            }
        }

        void GoldField(NetKnightGame game)
        {
            if (!_goldVis) return;
            _goldVis.SetActive(true);
            _goldVis.transform.SetParent(transform, false);
            _goldVis.transform.localPosition = new Vector3(0f, 1.05f, 0f);
            _goldVis.transform.localScale = Vector3.one * (3.6f + Mathf.Sin(Time.time * 5f) * 0.12f);
            Vector3 origin = cam ? cam.position : transform.position;
            float r = 4.9f * game.pulseMul * game.Power;
            var cols = Physics.OverlapSphere(origin, r);
            foreach (var c in cols)
            {
                if (c.transform.IsChildOf(transform)) continue;
                if (weapons && (c.transform.IsChildOf(weapons.cannon) || c.transform.IsChildOf(weapons.sword))) continue;
                var rb = c.attachedRigidbody;
                if (!rb) continue;
                var d = rb.worldCenterOfMass - origin;
                float m = d.magnitude;
                if (m < 0.01f) continue;
                rb.AddForce(d.normalized * (14f * game.pulseMul * (1f - m / r)), ForceMode.Force);
            }
        }

        void Pulse(NetKnightGame game)
        {
            if (_pulseCd > 0) return;
            _pulseCd = 3.2f;
            game.live.pulses++;
            NkSfx.Pulse(cam.position);
            float pwr = game.Power;
            float r = 9.05f * game.pulseMul * pwr;
            if (_pulseVis)
            {
                _pulseVis.SetActive(true);
                _pulseVis.transform.SetParent(null, true);
                _pulseVis.transform.position = cam.position;
                _pulseVis.transform.localScale = Vector3.one * 0.35f;
            }
            NkInput.Rumble(XRNode.LeftHand, 1f, 0.18f);
            NkInput.Rumble(XRNode.RightHand, 1f, 0.18f);
            var cols = Physics.OverlapSphere(cam.position, r);
            foreach (var c in cols)
            {
                if (c.transform.IsChildOf(transform)) continue;
                if (weapons && (c.transform.IsChildOf(weapons.cannon) || c.transform.IsChildOf(weapons.sword))) continue;
                var rb = c.attachedRigidbody;
                if (!rb) continue;
                var d = rb.worldCenterOfMass - cam.position;
                float m = d.magnitude;
                if (m < 0.01f) continue;
                rb.AddForce(d.normalized * (23.4f * game.pulseMul * pwr * (1f - m / r)), ForceMode.Impulse);
                var tr = c.GetComponentInParent<NkTrilo>();
                if (tr) tr.Hurt(0.4f * pwr * NkCombat.PlayerAtk, d);
            }
        }

        void LateUpdate()
        {
            if (_pulseVis && _pulseVis.activeSelf)
            {
                float t = 1f - Mathf.Clamp01(_pulseCd / 3.2f);
                _pulseVis.transform.position = cam ? cam.position : transform.position;
                float u = Mathf.Clamp01(t / 0.52f);
                _pulseVis.transform.localScale = Vector3.one * Mathf.Lerp(0.35f, 16.8f, u);
                if (_pulseMat)
                {
                    var c = new Color(0.4f, 0.92f, 1f, Mathf.Lerp(0.9f, 0.08f, u));
                    if (_pulseMat.HasProperty("_BaseColor")) _pulseMat.SetColor("_BaseColor", c);
                    _pulseMat.color = c;
                }
                if (t > 0.52f) _pulseVis.SetActive(false);
            }
        }
    }
}
