using UnityEngine;

namespace NetKnight
{
    public class NkStaff : MonoBehaviour
    {
        public Rigidbody body;
        public bool held;
        public Transform leftHold, rightHold;
        public float lastSwingSpeed;
        Vector3 _prev;
        Light[] _leds;
        Renderer _rend;
        float _blink;

        public static NkStaff Make(Vector3 pos, bool chrome = true)
        {
            var go = new GameObject("Staff");
            go.transform.position = pos;
            var core = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            Object.Destroy(core.GetComponent<Collider>());
            core.transform.SetParent(go.transform, false);
            core.transform.localScale = new Vector3(0.045f, 0.72f, 0.045f);
            var tex = NkTex.Circuit();
            core.GetComponent<Renderer>().sharedMaterial = chrome ? NkGfx.Chrome(tex) : NkGfx.Make(0x221018, 1, false, 0.6f, 0.4f);
            var capA = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            Object.Destroy(capA.GetComponent<Collider>());
            capA.transform.SetParent(go.transform, false);
            capA.transform.localPosition = new Vector3(0, 0.74f, 0);
            capA.transform.localScale = Vector3.one * 0.09f;
            capA.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(0x14e8ff, 1, true);
            var capB = Object.Instantiate(capA, go.transform);
            capB.transform.localPosition = new Vector3(0, -0.74f, 0);
            var col = go.AddComponent<CapsuleCollider>();
            col.direction = 1;
            col.height = 1.5f;
            col.radius = 0.04f;
            var rb = go.AddComponent<Rigidbody>();
            rb.mass = 1.15f;
            rb.useGravity = false;
            rb.linearDamping = 0.15f;
            rb.angularDamping = 0.4f;
            rb.interpolation = RigidbodyInterpolation.Interpolate;
            var st = go.AddComponent<NkStaff>();
            st.body = rb;
            st._rend = core.GetComponent<Renderer>();
            var leds = new Light[3];
            for (int i = 0; i < 3; i++)
            {
                var lgo = new GameObject("led");
                lgo.transform.SetParent(go.transform, false);
                lgo.transform.localPosition = new Vector3(0.03f, -0.4f + i * 0.4f, 0);
                var l = lgo.AddComponent<Light>();
                l.type = LightType.Point;
                l.range = 1.6f;
                l.intensity = 1.2f;
                l.color = i == 1 ? new Color(0.2f, 1f, 1f) : new Color(1f, 0.3f, 0.9f);
                leds[i] = l;
            }
            st._leds = leds;
            return st;
        }

        void Update()
        {
            float dt = Time.deltaTime;
            lastSwingSpeed = (transform.position - _prev).magnitude / Mathf.Max(dt, 0.008f);
            _prev = transform.position;
            _blink += dt;
            if (_leds != null)
                for (int i = 0; i < _leds.Length; i++)
                    if (_leds[i]) _leds[i].intensity = 0.5f + Mathf.Abs(Mathf.Sin(_blink * (8 + i * 3))) * 2.2f;
        }

        public void DriveHeld(Vector3 pos, Quaternion rot, Vector3 vel)
        {
            held = true;
            body.isKinematic = true;
            transform.position = pos;
            transform.rotation = rot;
            body.linearVelocity = vel;
        }

        public void DriveTwoHand(Vector3 a, Vector3 b, Vector3 vel)
        {
            held = true;
            body.isKinematic = true;
            var mid = (a + b) * 0.5f;
            var axis = b - a;
            if (axis.sqrMagnitude < 1e-6f) axis = transform.up;
            transform.position = mid;
            transform.rotation = Quaternion.FromToRotation(Vector3.up, axis.normalized);
            body.linearVelocity = vel;
        }

        public void Drop(Vector3 vel, Vector3 ang)
        {
            held = false;
            leftHold = rightHold = null;
            body.isKinematic = false;
            body.linearVelocity = vel;
            body.angularVelocity = ang;
        }

        public bool Near(Vector3 p, float r = 0.2f) =>
            Vector3.Distance(Closest(p), p) < r;

        public Vector3 Closest(Vector3 p)
        {
            var a = transform.TransformPoint(new Vector3(0, -0.72f, 0));
            var b = transform.TransformPoint(new Vector3(0, 0.72f, 0));
            var ab = b - a;
            float t = Vector3.Dot(p - a, ab) / Mathf.Max(ab.sqrMagnitude, 1e-6f);
            t = Mathf.Clamp01(t);
            return a + ab * t;
        }

        public bool Deflects(Vector3 origin, Vector3 dir, float maxDist, out Vector3 hit)
        {
            hit = origin;
            var a = transform.TransformPoint(new Vector3(0, -0.72f, 0));
            var b = transform.TransformPoint(new Vector3(0, 0.72f, 0));
            if (LineNear(origin, origin + dir.normalized * maxDist, a, b, 0.18f, out hit)) return true;
            return false;
        }

        static bool LineNear(Vector3 p0, Vector3 p1, Vector3 q0, Vector3 q1, float r, out Vector3 at)
        {
            Vector3 u = p1 - p0, v = q1 - q0, w = p0 - q0;
            float uu = Vector3.Dot(u, u), vv = Vector3.Dot(v, v), uv = Vector3.Dot(u, v);
            float uw = Vector3.Dot(u, w), vw = Vector3.Dot(v, w);
            float den = uu * vv - uv * uv;
            float s = 0, t = 0;
            if (den > 1e-8f)
            {
                s = Mathf.Clamp01((uv * vw - vv * uw) / den);
                t = Mathf.Clamp01((uu * vw - uv * uw) / den);
            }
            var a = p0 + u * s;
            var b = q0 + v * t;
            at = b;
            return (a - b).sqrMagnitude <= r * r;
        }
    }
}
