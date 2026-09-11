using System.Collections.Generic;
using UnityEngine;

namespace NetKnight
{
    public class NkPlasmaStroke : MonoBehaviour
    {
        public static readonly List<NkPlasmaStroke> All = new List<NkPlasmaStroke>();
        public float hp = 42f;
        public float life = 10f;
        readonly List<Vector3> _pts = new List<Vector3>();
        readonly List<Renderer> _rends = new List<Renderer>();
        Rigidbody _rb;
        Material _mat;
        Color _col = new Color(0.4f, 0.9f, 1f, 0.92f);
        bool _solid;

        public static NkPlasmaStroke Begin(Vector3 p, Color c)
        {
            var go = new GameObject("PlasmaDraw");
            go.transform.position = p;
            var rb = go.AddComponent<Rigidbody>();
            rb.useGravity = false;
            rb.isKinematic = true;
            rb.mass = 14f;
            rb.linearDamping = 0.55f;
            rb.angularDamping = 1.1f;
            rb.interpolation = RigidbodyInterpolation.Interpolate;
            rb.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;
            var s = go.AddComponent<NkPlasmaStroke>();
            s._rb = rb;
            s._col = c;
            s._mat = NkGfx.Additive(c);
            s._pts.Add(p);
            All.Add(s);
            return s;
        }

        void OnDestroy() { All.Remove(this); }

        public void SetColor(Color c)
        {
            _col = c;
            if (_mat)
            {
                if (_mat.HasProperty("_BaseColor")) _mat.SetColor("_BaseColor", c);
                _mat.color = c;
            }
        }

        public void StrokeTo(Vector3 p)
        {
            if (_solid) return;
            if (_pts.Count > 0 && (p - _pts[_pts.Count - 1]).sqrMagnitude < 0.007f) return;
            Vector3 prev = _pts[_pts.Count - 1];
            _pts.Add(p);
            float len = Vector3.Distance(prev, p);
            if (len < 0.02f) return;
            var bar = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            bar.transform.SetParent(transform, true);
            bar.transform.position = (prev + p) * 0.5f;
            bar.transform.rotation = Quaternion.FromToRotation(Vector3.up, (p - prev) / len);
            bar.transform.localScale = new Vector3(0.14f, len * 0.5f, 0.14f);
            var col = bar.GetComponent<Collider>();
            if (col) col.isTrigger = false;
            var r = bar.GetComponent<Renderer>();
            r.sharedMaterial = _mat;
            r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            _rends.Add(r);
        }

        public void Solidify(float seconds)
        {
            _solid = true;
            life = Mathf.Max(1.2f, seconds);
            for (int i = 0; i < _pts.Count; i++)
                _pts[i] = transform.InverseTransformPoint(_pts[i]);
            if (_rb)
            {
                _rb.isKinematic = false;
                _rb.useGravity = false;
                _rb.linearVelocity = Vector3.zero;
                _rb.angularVelocity = Vector3.zero;
            }
        }

        void Update()
        {
            if (!_solid) return;
            life -= Time.deltaTime;
            if (life <= 0f) Shatter();
        }

        void OnCollisionStay(Collision c)
        {
            if (!_rb || _rb.isKinematic) return;
            var pl = c.collider.GetComponentInParent<NkPlayer>();
            if (pl && pl.body)
                _rb.AddForce(pl.body.linearVelocity * 0.42f, ForceMode.Acceleration);
        }

        public void Hit(float dmg, Vector3 at, Vector3 dir)
        {
            if (dmg < 12f)
            {
                if (_rb && !_rb.isKinematic)
                    _rb.AddForceAtPosition(dir.normalized * (dmg * 1.6f + 2.5f), at, ForceMode.Impulse);
                return;
            }
            hp -= dmg;
            if (_rb && !_rb.isKinematic)
                _rb.AddForceAtPosition(dir.normalized * dmg * 0.35f, at, ForceMode.Impulse);
            if (hp <= 0f) Shatter();
        }

        void Shatter()
        {
            Vector3 p = transform.position;
            for (int i = 0; i < 10; i++)
            {
                var c = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                Object.DestroyImmediate(c.GetComponent<Collider>());
                c.transform.position = p + Random.insideUnitSphere * 0.35f;
                c.transform.localScale = Vector3.one * Random.Range(0.08f, 0.2f);
                c.GetComponent<Renderer>().sharedMaterial = _mat ? _mat : NkGfx.Additive(_col);
                var rb = c.AddComponent<Rigidbody>();
                rb.useGravity = false;
                rb.linearVelocity = Random.onUnitSphere * Random.Range(2f, 7f);
                Object.Destroy(c, Random.Range(0.6f, 1.3f));
            }
            NkSfx.Boom(p);
            Destroy(gameObject);
        }

        public bool Near(Vector3 p, out Vector3 n)
        {
            n = Vector3.up;
            float best = 0.38f;
            bool ok = false;
            for (int i = 0; i < transform.childCount; i++)
            {
                var col = transform.GetChild(i).GetComponent<Collider>();
                if (!col) continue;
                Vector3 q = col.ClosestPoint(p);
                float d = Vector3.Distance(p, q);
                if (d < best)
                {
                    best = d;
                    n = (p - q).sqrMagnitude > 0.01f ? (p - q).normalized : transform.GetChild(i).up;
                    ok = true;
                }
            }
            return ok;
        }
    }
}
