using System.Collections.Generic;
using UnityEngine;

namespace NetKnight
{
    public class NkMarquee : MonoBehaviour
    {
        public static NkMarquee Make(NkSphere s, float localY, float speed)
        {
            if (s == null || !s.t) return null;
            var go = new GameObject("Marquee");
            go.transform.SetParent(s.t, false);
            go.transform.localPosition = new Vector3(0f, localY, 0f);
            go.transform.localRotation = Quaternion.identity;
            go.transform.localScale = Vector3.one;
            float r = Mathf.Sqrt(Mathf.Max(0.02f, 0.5f * 0.5f - localY * localY)) * 0.94f;
            float worldR = r * s.r * 2f;
            float diam = worldR * 2f;
            int pieces = diam >= 80f ? 8 : diam >= 55f ? 6 : diam >= 32f ? 4 : 2;
            var tex = NkTex.TickerStrip(s.GetHashCode() ^ (int)(localY * 1000f) ^ Random.Range(0, 99999));
            var mat = NkGfx.Textured(tex, Color.white, true, true);
            mat.mainTextureScale = Vector2.one;
            if (mat.HasProperty("_BaseMap")) mat.SetTextureScale("_BaseMap", Vector2.one);
            var m = go.AddComponent<NkMarquee>();
            int ringSegs = Mathf.Max(24, pieces * 8);
            for (int p = 0; p < pieces; p++)
            {
                float a0 = p / (float)pieces * Mathf.PI * 2f;
                float a1 = (p + 1) / (float)pieces * Mathf.PI * 2f;
                NkMarqueeSeg.Make(go.transform, r, a0, a1, ringSegs / pieces, mat, tex, speed, p, s.c, s.r);
            }
            return m;
        }
    }

    public static class NkOutsidePass
    {
        static int _frame = -1;
        static Vector3 _p;

        public static Vector3 Probe()
        {
            if (Time.frameCount == _frame) return _p;
            _frame = Time.frameCount;
            var pl = Object.FindAnyObjectByType<NkPlayer>();
            if (pl) _p = pl.transform.position + Vector3.up * 0.85f;
            else if (Camera.main) _p = Camera.main.transform.position;
            return _p;
        }

        public static bool SolidFromInside(Vector3 hullC, float hullR, ref bool fromOut)
        {
            if (hullR < 0.5f) return true;
            float mag = (Probe() - hullC).magnitude;
            if (fromOut)
            {
                if (mag < hullR - 2.55f) fromOut = false;
                return false;
            }
            if (mag > hullR - 0.28f) fromOut = true;
            return !fromOut;
        }
    }

    public class NkMarqueeSeg : MonoBehaviour
    {
        public static readonly List<NkMarqueeSeg> All = new List<NkMarqueeSeg>();
        public float hp = 42f;
        Material _mat, _staticMat;
        Texture2D _tex, _staticTex;
        Color[] _pix;
        Vector2 _uv;
        float _spd, _tick;
        bool _cracked, _dead;
        Vector3 _hullC;
        float _hullR;
        bool _fromOut;
        Collider _col;

        public static NkMarqueeSeg Make(Transform parent, float r, float a0, float a1, int segs, Material live, Texture2D tex, float speed, int idx, Vector3 hullC, float hullR)
        {
            segs = Mathf.Max(3, segs);
            var go = new GameObject("MarqueeSeg" + idx);
            go.transform.SetParent(parent, false);
            float thick = 0.055f, h = thick * 0.5f, uTile = 8f;
            var verts = new Vector3[(segs + 1) * 2];
            var uvs = new Vector2[verts.Length];
            var tris = new int[segs * 6];
            float span = a1 - a0;
            for (int i = 0; i <= segs; i++)
            {
                float t = i / (float)segs;
                float a = a0 + span * t;
                float x = Mathf.Cos(a) * r, z = Mathf.Sin(a) * r;
                verts[i * 2] = new Vector3(x, -h, z);
                verts[i * 2 + 1] = new Vector3(x, h, z);
                float u = (a0 / (Mathf.PI * 2f) + t * (span / (Mathf.PI * 2f))) * uTile;
                uvs[i * 2] = new Vector2(u, 0f);
                uvs[i * 2 + 1] = new Vector2(u, 1f);
            }
            for (int i = 0; i < segs; i++)
            {
                int aA = i * 2, b0 = aA + 1, aB = aA + 2, b1 = aA + 3;
                int o = i * 6;
                tris[o] = aA; tris[o + 1] = b0; tris[o + 2] = aB;
                tris[o + 3] = b0; tris[o + 4] = b1; tris[o + 5] = aB;
            }
            var mesh = new Mesh { name = "tickerSeg" };
            mesh.vertices = verts;
            mesh.uv = uvs;
            mesh.triangles = tris;
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            var mf = go.AddComponent<MeshFilter>();
            mf.sharedMesh = mesh;
            var mr = go.AddComponent<MeshRenderer>();
            mr.sharedMaterial = live;
            mr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            var mc = go.AddComponent<MeshCollider>();
            mc.sharedMesh = mesh;
            mc.convex = false;
            var s = go.AddComponent<NkMarqueeSeg>();
            s._mat = live;
            s._tex = tex;
            s._spd = speed;
            s._hullC = hullC;
            s._hullR = hullR;
            s._col = mc;
            All.Add(s);
            return s;
        }

        void OnDestroy() { All.Remove(this); }

        public bool Hit(float dmg, Vector3 at, Vector3 dir)
        {
            if (_dead) return true;
            hp -= dmg;
            if (!_cracked && hp <= 0f)
            {
                Crack();
                hp = 24f;
                return true;
            }
            if (_cracked && hp <= 0f)
            {
                Smash(at, dir);
                return true;
            }
            return false;
        }

        void Crack()
        {
            _cracked = true;
            _staticTex = new Texture2D(48, 16, TextureFormat.RGBA32, false);
            _staticTex.filterMode = FilterMode.Point;
            _staticTex.wrapMode = TextureWrapMode.Repeat;
            _pix = new Color[48 * 16];
            _staticMat = NkGfx.Textured(_staticTex, Color.white, true, true);
            var r = GetComponent<Renderer>();
            if (r) r.sharedMaterial = _staticMat;
            DrawStatic();
        }

        void Smash(Vector3 at, Vector3 dir)
        {
            _dead = true;
            var col = GetComponent<Collider>();
            if (col) col.enabled = false;
            NkSfx.Boom(at);
            var r = GetComponent<Renderer>();
            if (r) r.enabled = false;
            Destroy(gameObject, 0.05f);
        }

        void LateUpdate()
        {
            if (_dead) return;
            if (!_col) _col = GetComponent<Collider>();
            if (_col) _col.enabled = NkOutsidePass.SolidFromInside(_hullC, _hullR, ref _fromOut);
        }

        void Update()
        {
            if (_dead) return;
            if (_cracked)
            {
                _tick += Time.deltaTime;
                if (_tick >= 0.08f) { _tick = 0f; DrawStatic(); }
                return;
            }
            if (!_mat) return;
            _uv.x = _spd * Time.time;
            _mat.mainTextureOffset = _uv;
            if (_mat.HasProperty("_BaseMap")) _mat.SetTextureOffset("_BaseMap", _uv);
        }

        void DrawStatic()
        {
            if (_pix == null || !_staticTex) return;
            for (int i = 0; i < _pix.Length; i++)
            {
                float n = Random.value;
                _pix[i] = n > 0.92f ? Color.white : new Color(n * 0.18f, n * 0.18f, n * 0.2f);
            }
            _staticTex.SetPixels(_pix);
            _staticTex.Apply(false, false);
        }
    }

    public class NkPetCage : MonoBehaviour
    {
        public static readonly List<NkPetCage> All = new List<NkPetCage>();
        public float hp = 22f;
        int _kind;
        NkPet _pet;
        AudioClip _cry;
        AudioSource _src;
        float _cryT, _shake;
        Vector3 _baseScale = Vector3.one;

        public static void Scatter(NkWorld world, Vector3 player)
        {
            if (world == null) return;
            if (Random.value > 0.42f) return;
            int n = Random.value < 0.12f ? 3 : (Random.value < 0.38f ? 2 : 1);
            for (int i = 0; i < n; i++)
            {
                int kind = FreeKind();
                if (kind < 0) return;
                Vector3 p = world.RandomOnInner(10f, player);
                Make(p, kind);
            }
        }

        static int FreeKind()
        {
            var open = new List<int>();
            for (int i = 0; i < 8; i++)
                if (!NkPet.Has(i)) open.Add(i);
            if (open.Count == 0) return -1;
            return open[Random.Range(0, open.Count)];
        }

        public static NkPetCage Make(Vector3 pos, int kind)
        {
            var go = new GameObject("PetCage");
            go.transform.position = pos;
            go.transform.rotation = Random.rotation;
            var steel = NkGfx.Make(new Color(0.55f, 0.58f, 0.62f), 1, false, 0.45f, 0.8f);
            NkGfx.WireCage(go.transform, 0.85f, steel, 12, 0.05f);
            for (int i = 0; i < 6; i++)
            {
                float a = i / 6f * Mathf.PI * 2f;
                NkGfx.Part(PrimitiveType.Cylinder, go.transform,
                    new Vector3(Mathf.Cos(a) * 0.82f, 0f, Mathf.Sin(a) * 0.82f),
                    new Vector3(0.06f, 0.85f, 0.06f), steel, false, "bar");
            }
            var lockCol = NkGfx.Make(new Color(1f, 0.82f, 0.15f), 1, true);
            NkGfx.Part(PrimitiveType.Cube, go.transform, new Vector3(0f, 0.92f, 0f), new Vector3(0.22f, 0.1f, 0.16f), lockCol, false, "lock");
            NkGfx.Part(PrimitiveType.Sphere, go.transform, new Vector3(0f, 1.05f, 0f), Vector3.one * 0.12f, lockCol, false, "shackle");
            var col = go.AddComponent<SphereCollider>();
            col.radius = 0.9f;
            var rb = go.AddComponent<Rigidbody>();
            rb.useGravity = false;
            rb.mass = 8f;
            rb.linearDamping = 0.4f;
            rb.angularDamping = 0.5f;
            rb.linearVelocity = Random.onUnitSphere * 0.15f;
            var c = go.AddComponent<NkPetCage>();
            c._kind = kind;
            c._pet = NkPet.Spawn(null, kind, true);
            if (c._pet)
            {
                c._pet.transform.SetParent(go.transform, false);
                c._pet.transform.localPosition = Vector3.zero;
                c._pet.transform.localScale = Vector3.one * 0.225f;
            }
            c._cry = NkSfx.BitCry(kind * 7919 + Random.Range(0, 80000));
            c._src = go.AddComponent<AudioSource>();
            c._src.playOnAwake = false;
            c._src.spatialBlend = 1f;
            c._src.minDistance = 1.1f;
            c._src.maxDistance = 12f;
            c._src.rolloffMode = AudioRolloffMode.Linear;
            c._src.dopplerLevel = 0f;
            c._src.volume = 0.72f;
            c._cryT = Random.Range(0.6f, 3.2f);
            c._baseScale = go.transform.localScale;
            All.Add(c);
            return c;
        }

        void Update()
        {
            float dt = Time.deltaTime;
            _cryT -= dt;
            if (_cryT <= 0f)
            {
                _cryT = Random.Range(3.5f, 4.8f);
                _shake = 0.38f;
                if (_src && _cry)
                {
                    _src.clip = _cry;
                    _src.pitch = Random.Range(0.94f, 1.08f);
                    _src.Play();
                }
                var rb = GetComponent<Rigidbody>();
                if (rb)
                {
                    rb.AddTorque(Random.onUnitSphere * 4.5f, ForceMode.Impulse);
                    rb.AddForce(Random.onUnitSphere * 1.6f, ForceMode.Impulse);
                }
                var g = Object.FindAnyObjectByType<NetKnightGame>();
                if (g && g.player)
                {
                    float d = Vector3.Distance(transform.position, g.player.transform.position);
                    if (d < 7f)
                    {
                        NkInput.Rumble(UnityEngine.XR.XRNode.LeftHand, 0.28f, 0.12f);
                        NkInput.Rumble(UnityEngine.XR.XRNode.RightHand, 0.28f, 0.12f);
                    }
                }
            }
            if (_shake > 0f)
            {
                _shake -= dt;
                float u = Mathf.Clamp01(_shake / 0.38f);
                transform.localScale = _baseScale * (1f + Mathf.Sin(Time.time * 48f) * 0.045f * u);
                transform.Rotate(Random.insideUnitSphere * (28f * u * dt), Space.Self);
                if (_shake <= 0f) transform.localScale = _baseScale;
            }
        }

        void OnDestroy() { All.Remove(this); }

        public void Hit(float dmg, Vector3 at, Vector3 dir)
        {
            hp -= dmg;
            var rb = GetComponent<Rigidbody>();
            if (rb) rb.AddForceAtPosition(dir.normalized * (dmg * 0.8f), at, ForceMode.Impulse);
            if (hp > 0f) return;
            Free();
        }

        void Free()
        {
            var g = Object.FindAnyObjectByType<NetKnightGame>();
            var player = g ? g.player : null;
            if (_pet)
            {
                _pet.transform.SetParent(null, true);
                _pet.Release(player);
            }
            else if (player) NkPet.Spawn(player, _kind, false);
            Vector3 p = transform.position;
            NkSfx.Boom(p);
            if (g) g.Hint("Cage broken — " + NkPet.NameOf(_kind) + " joins as orbital strike!");
            Destroy(gameObject);
        }
    }
}
