using System.Collections.Generic;
using UnityEngine;

namespace NetKnight
{
    public class NkLock
    {
        public GameObject root;
        public Transform frame, barFill, distT, heartT;
        public TextMesh dist, heart;
        public Transform follow;
        public bool darkKnight;
    }

    public class NkHud : MonoBehaviour
    {
        public bool assist;
        Camera _cam;
        AudioSource _beepSrc;
        AudioClip _beep;
        float _beepT;
        readonly List<NkLock> _locks = new List<NkLock>();
        Transform _overlay, _laserFill, _chargeFill, _help, _over, _holo, _blip, _hurtFx;
        Renderer _laserFillR, _hurtR;
        Material _laserMat, _chargeMat, _hurtMat;
        TextMesh _status, _hp, _power, _overText, _cdLabel, _warn, _clock, _purse, _misN;
        float _helpT;
        bool _hudOn = true;
        readonly Transform[] _lootRing = new Transform[14];
        readonly Transform[] _misIco = new Transform[8];

        public static NkHud Attach(Camera cam)
        {
            var hud = cam.gameObject.AddComponent<NkHud>();
            hud._cam = cam;
            hud.BuildVisor(cam.transform);
            hud._beep = MakeBeep();
            hud._beepSrc = cam.gameObject.AddComponent<AudioSource>();
            hud._beepSrc.playOnAwake = false;
            hud._beepSrc.spatialBlend = 0f;
            hud._beepSrc.volume = 0.28f;
            return hud;
        }

        void BuildVisor(Transform cam)
        {
            _overlay = new GameObject("MechVisor").transform;
            _overlay.position = cam ? cam.position : Vector3.zero;
            _overlay.rotation = cam ? cam.rotation : Quaternion.identity;
            var steel = new Color(0.35f, 0.72f, 0.85f, 0.22f);
            var dim = new Color(0.08f, 0.14f, 0.18f, 0.35f);
            void Bar(Vector3 pos, Vector3 sc, Color c)
            {
                var q = GameObject.CreatePrimitive(PrimitiveType.Quad);
                Object.Destroy(q.GetComponent<Collider>());
                q.transform.SetParent(_overlay, false);
                q.transform.localPosition = pos;
                q.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
                q.transform.localScale = sc;
                q.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(c, c.a, true);
                q.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            }
            float z = 0.38f;
            Bar(new Vector3(0f, 0.175f, z), new Vector3(0.378f, 0.006f, 1f), dim);
            Bar(new Vector3(0f, -0.175f, z), new Vector3(0.378f, 0.006f, 1f), dim);
            Bar(new Vector3(-0.297f, 0f, z), new Vector3(0.006f, 0.288f, 1f), dim);
            Bar(new Vector3(0.297f, 0f, z), new Vector3(0.006f, 0.288f, 1f), dim);
            void Corner(float sx, float sy)
            {
                Bar(new Vector3(sx * 0.27f, sy * 0.157f, z), new Vector3(0.063f, 0.004f, 1f), steel);
                Bar(new Vector3(sx * 0.243f, sy * 0.135f, z), new Vector3(0.004f, 0.05f, 1f), steel);
            }
            Corner(-1, 1); Corner(1, 1); Corner(-1, -1); Corner(1, -1);
            var clk = new GameObject("clock");
            clk.transform.SetParent(_overlay, false);
            clk.transform.localPosition = new Vector3(-0.20f, 0.093f, z);
            clk.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            _clock = clk.AddComponent<TextMesh>();
            _clock.anchor = TextAnchor.UpperLeft;
            _clock.characterSize = 0.0078f;
            _clock.fontSize = 42;
            _clock.fontStyle = FontStyle.Bold;
            _clock.color = new Color(1f, 0.92f, 0.35f);
            _clock.text = "00:00";
            var purse = new GameObject("purse");
            purse.transform.SetParent(_overlay, false);
            purse.transform.localPosition = new Vector3(-0.175f, 0.065f, z);
            purse.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            _purse = purse.AddComponent<TextMesh>();
            _purse.anchor = TextAnchor.UpperLeft;
            _purse.characterSize = 0.0063f;
            _purse.fontSize = 36;
            _purse.fontStyle = FontStyle.Bold;
            _purse.color = new Color(1f, 0.82f, 0.2f);
            var mark = GameObject.CreatePrimitive(PrimitiveType.Quad);
            Object.DestroyImmediate(mark.GetComponent<Collider>());
            mark.transform.SetParent(_overlay, false);
            mark.transform.localPosition = new Vector3(-0.205f, 0.055f, z);
            mark.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            mark.transform.localScale = new Vector3(0.022f, 0.022f, 1f);
            var creditTex = NkCredit.Icon();
            mark.GetComponent<Renderer>().sharedMaterial = creditTex
                ? NkGfx.Textured(creditTex, Color.white, true, true)
                : NkGfx.Make(new Color(1f, 0.8f, 0.2f), 1, true);
            mark.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            var st = new GameObject("status");
            st.transform.SetParent(_overlay, false);
            st.transform.localPosition = new Vector3(-0.20f, 0.033f, z);
            st.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            _status = st.AddComponent<TextMesh>();
            _status.anchor = TextAnchor.UpperLeft;
            _status.characterSize = 0.0053f;
            _status.fontSize = 32;
            _status.color = new Color(0.55f, 0.85f, 0.95f, 0.7f);
            _status.fontStyle = FontStyle.Bold;
            Bar(new Vector3(0f, -0.236f, z), new Vector3(0.27f, 0.014f, 1f), new Color(0.08f, 0.08f, 0.1f, 0.7f));
            var fill = GameObject.CreatePrimitive(PrimitiveType.Quad);
            Object.Destroy(fill.GetComponent<Collider>());
            fill.transform.SetParent(_overlay, false);
            fill.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            fill.transform.localPosition = new Vector3(-0.135f, -0.236f, z - 0.001f);
            fill.transform.localScale = new Vector3(0.27f, 0.01f, 1f);
            _laserMat = NkGfx.Make(new Color(1f, 0.18f, 0.12f, 0.95f), 0.95f, true);
            fill.GetComponent<Renderer>().sharedMaterial = _laserMat;
            fill.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            _laserFill = fill.transform;
            _laserFillR = fill.GetComponent<Renderer>();
            Bar(new Vector3(0f, -0.218f, z), new Vector3(0.27f, 0.01f, 1f), new Color(0.08f, 0.08f, 0.1f, 0.7f));
            var ch = GameObject.CreatePrimitive(PrimitiveType.Quad);
            Object.Destroy(ch.GetComponent<Collider>());
            ch.transform.SetParent(_overlay, false);
            ch.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            ch.transform.localPosition = new Vector3(-0.135f, -0.218f, z - 0.001f);
            ch.transform.localScale = new Vector3(0.02f, 0.008f, 1f);
            _chargeMat = NkGfx.Make(new Color(1f, 0.55f, 0.12f, 0.95f), 0.95f, true);
            ch.GetComponent<Renderer>().sharedMaterial = _chargeMat;
            ch.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            _chargeFill = ch.transform;
            var cd = new GameObject("cd");
            cd.transform.SetParent(_overlay, false);
            cd.transform.localPosition = new Vector3(0f, -0.252f, z);
            cd.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            _cdLabel = cd.AddComponent<TextMesh>();
            _cdLabel.anchor = TextAnchor.MiddleCenter;
            _cdLabel.alignment = TextAlignment.Center;
            _cdLabel.characterSize = 0.0053f;
            _cdLabel.fontSize = 32;
            _cdLabel.fontStyle = FontStyle.Bold;
            _cdLabel.color = new Color(0.3f, 0.9f, 1f);
            _cdLabel.gameObject.SetActive(false);
            var pwrGo = new GameObject("power");
            pwrGo.transform.SetParent(_overlay, false);
            pwrGo.transform.localPosition = new Vector3(0f, 0.123f, z);
            pwrGo.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            _power = pwrGo.AddComponent<TextMesh>();
            _power.anchor = TextAnchor.MiddleCenter;
            _power.alignment = TextAlignment.Center;
            _power.characterSize = 0.0084f;
            _power.fontSize = 42;
            _power.fontStyle = FontStyle.Bold;
            _power.color = new Color(0.45f, 1f, 0.75f);
            var hpGo = new GameObject("hp");
            hpGo.transform.SetParent(_overlay, false);
            hpGo.transform.localPosition = new Vector3(0.20f, -0.218f, z);
            hpGo.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            _hp = hpGo.AddComponent<TextMesh>();
            _hp.anchor = TextAnchor.UpperRight;
            _hp.alignment = TextAlignment.Right;
            _hp.characterSize = 0.00665f;
            _hp.fontSize = 36;
            _hp.fontStyle = FontStyle.Bold;
            _hp.color = new Color(1f, 0.28f, 0.32f);
            var wn = new GameObject("warn");
            wn.transform.SetParent(_overlay, false);
            wn.transform.localPosition = new Vector3(0f, 0.077f, z);
            wn.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            _warn = wn.AddComponent<TextMesh>();
            _warn.anchor = TextAnchor.MiddleCenter;
            _warn.alignment = TextAlignment.Center;
            _warn.characterSize = 0.007f;
            _warn.fontSize = 36;
            _warn.fontStyle = FontStyle.Bold;
            _warn.gameObject.SetActive(false);

            _help = new GameObject("Help").transform;
            _help.SetParent(_overlay, false);
            _help.localPosition = new Vector3(0f, -0.04f, z - 0.02f);
            var card = GameObject.CreatePrimitive(PrimitiveType.Quad);
            Object.DestroyImmediate(card.GetComponent<Collider>());
            card.transform.SetParent(_help, false);
            card.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            card.transform.localScale = new Vector3(0.42f, 0.24f, 1f);
            card.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(new Color(0.02f, 0.04f, 0.07f, 0.55f), 0.55f, true);
            var ht = new GameObject("ht").AddComponent<TextMesh>();
            ht.anchor = TextAnchor.MiddleCenter;
            ht.alignment = TextAlignment.Left;
            ht.characterSize = 0.0068f;
            ht.fontSize = 36;
            ht.color = new Color(0.65f, 0.95f, 1f);
            ht.fontStyle = FontStyle.Bold;
            ht.transform.SetParent(_help, false);
            ht.transform.localPosition = new Vector3(0f, 0f, -0.01f);
            ht.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            ht.text =
                "LT tap / hold   plasma cannon\n" +
                "Left grip / C   plasma draw (hold, release to set)\n" +
                "RT hold ~1.6s   sword laser  (orange = charge)\n" +
                "A  jet / wall-kick     B  force pulse\n" +
                "Y  toggle HUD\n" +
                "Right grip   hold: red lasso (yank foes, crates, pads)\n" +
                "Stick-click  seeking missiles (max 2)\n" +
                "Left menu   hull / power / save";
            _help.gameObject.SetActive(false);
            var rack = GameObject.CreatePrimitive(PrimitiveType.Quad);
            Object.DestroyImmediate(rack.GetComponent<Collider>());
            rack.transform.SetParent(_overlay, false);
            rack.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            rack.transform.localPosition = new Vector3(-0.155f, -0.103f, z + 0.002f);
            rack.transform.localScale = new Vector3(0.22f, 0.038f, 1f);
            rack.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(new Color(0.04f, 0.08f, 0.12f, 0.55f), 0.55f, true);
            rack.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            var icoTex = NkTex.MissileIcon();
            var icoMat = icoTex ? NkGfx.Textured(icoTex, Color.white, true, true) : NkGfx.Make(new Color(0.3f, 0.9f, 1f), 1, true);
            for (int i = 0; i < _misIco.Length; i++)
            {
                var q = GameObject.CreatePrimitive(PrimitiveType.Quad);
                Object.DestroyImmediate(q.GetComponent<Collider>());
                q.transform.SetParent(_overlay, false);
                q.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
                q.transform.localPosition = new Vector3(-0.248f + i * 0.026f, -0.103f, z);
                q.transform.localScale = new Vector3(0.028f, 0.028f, 1f);
                q.GetComponent<Renderer>().sharedMaterial = icoMat;
                q.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                q.SetActive(false);
                _misIco[i] = q.transform;
            }
            var mn = new GameObject("misN").AddComponent<TextMesh>();
            mn.transform.SetParent(_overlay, false);
            mn.transform.localPosition = new Vector3(-0.038f, -0.103f, z);
            mn.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            mn.anchor = TextAnchor.MiddleLeft;
            mn.alignment = TextAlignment.Left;
            mn.characterSize = 0.0068f;
            mn.fontSize = 42;
            mn.fontStyle = FontStyle.Bold;
            mn.color = new Color(0.45f, 0.95f, 1f);
            _misN = mn;
            foreach (var tm in _overlay.GetComponentsInChildren<TextMesh>(true))
                NkGfx.FlipText(tm);
            _hurtFx = GameObject.CreatePrimitive(PrimitiveType.Quad).transform;
            Object.DestroyImmediate(_hurtFx.GetComponent<Collider>());
            _hurtFx.name = "HullFlash";
            _hurtFx.localScale = new Vector3(1.6f, 0.95f, 1f);
            _hurtMat = NkGfx.Additive(new Color(1f, 0.08f, 0.05f, 0.0f));
            _hurtR = _hurtFx.GetComponent<Renderer>();
            _hurtR.sharedMaterial = _hurtMat;
            _hurtR.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            _hurtFx.gameObject.SetActive(false);
            var disc = NkTex.Disc(new Color(0.35f, 0.85f, 1f, 0.16f));
            var ringMat = NkGfx.Textured(disc, new Color(0.45f, 0.9f, 1f, 0.16f), true, true);
            for (int i = 0; i < _lootRing.Length; i++)
            {
                var q = GameObject.CreatePrimitive(PrimitiveType.Quad);
                Object.DestroyImmediate(q.GetComponent<Collider>());
                q.transform.SetParent(_overlay, false);
                q.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
                q.transform.localScale = new Vector3(0.022f, 0.022f, 1f);
                q.GetComponent<Renderer>().sharedMaterial = ringMat;
                q.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                q.SetActive(false);
                _lootRing[i] = q.transform;
            }
        }

        void LateUpdate()
        {
            if (_cam)
            {
                if (_overlay && _hudOn)
                {
                    _overlay.position = _cam.transform.position;
                    _overlay.rotation = _cam.transform.rotation;
                }
                if (_hurtFx && _hurtFx.gameObject.activeSelf)
                {
                    _hurtFx.position = _cam.transform.position + _cam.transform.forward * 0.55f;
                    _hurtFx.rotation = _cam.transform.rotation * Quaternion.Euler(0f, 180f, 0f);
                    float a = 0.10f + 0.10f * Mathf.Abs(Mathf.Sin(Time.time * 5.5f));
                    var c = new Color(1f, 0.08f, 0.05f, a);
                    if (_hurtMat)
                    {
                        if (_hurtMat.HasProperty("_BaseColor")) _hurtMat.SetColor("_BaseColor", c);
                        _hurtMat.color = c;
                    }
                }
            }
            TickLootRings();
        }

        void TickLootRings()
        {
            if (_lootRing[0] == null || !_cam) return;
            int n = 0;
            foreach (var c in NkCrystal.All)
            {
                if (!c || n >= _lootRing.Length) break;
                Vector3 vp = _cam.WorldToViewportPoint(c.transform.position);
                if (vp.z < 0.15f || vp.x < 0.04f || vp.x > 0.96f || vp.y < 0.04f || vp.y > 0.96f) continue;
                var r = _lootRing[n++];
                r.gameObject.SetActive(true);
                float x = (vp.x - 0.5f) * 0.62f;
                float y = (vp.y - 0.5f) * 0.36f;
                r.localPosition = new Vector3(x, y, 0.36f);
                float pulse = 0.016f + Mathf.Sin(Time.time * 9f + n) * 0.004f;
                r.localScale = new Vector3(pulse, pulse, 1f);
            }
            for (int i = n; i < _lootRing.Length; i++)
                if (_lootRing[i]) _lootRing[i].gameObject.SetActive(false);
        }

        public void ShowControls(float seconds)
        {
            _helpT = seconds;
            if (_help) _help.gameObject.SetActive(true);
        }

        public void SetLaser(float t01, bool cooling, float charge01 = 0f)
        {
            t01 = Mathf.Clamp01(t01);
            if (_laserFill)
            {
                float w = 0.27f * Mathf.Max(0.02f, t01);
                _laserFill.localScale = new Vector3(w, 0.012f, 1f);
                _laserFill.localPosition = new Vector3(-0.135f + w * 0.5f, -0.236f, 0.379f);
            }
            if (_laserMat)
            {
                var c = cooling ? new Color(0.25f, 0.85f, 1f, 0.95f) : new Color(1f, 0.16f, 0.1f, 0.95f);
                if (_laserMat.HasProperty("_BaseColor")) _laserMat.SetColor("_BaseColor", c);
                _laserMat.color = c;
            }
            if (_chargeFill)
            {
                float w = 0.27f * Mathf.Max(0.02f, Mathf.Clamp01(charge01));
                _chargeFill.localScale = new Vector3(w, 0.01f, 1f);
                _chargeFill.localPosition = new Vector3(-0.135f + w * 0.5f, -0.218f, 0.379f);
            }
            if (_cdLabel)
            {
                _cdLabel.gameObject.SetActive(cooling);
                if (cooling) _cdLabel.text = "LASER COOLDOWN  " + Mathf.RoundToInt(t01 * 100f) + "%";
            }
        }

        public void SetHealth(int hp, int max)
        {
            if (!_hp) return;
            _hp.text = "HULL  " + hp + " / " + max;
            _hp.color = hp <= 0 ? new Color(1f, 0.45f, 0.15f) : new Color(1f, 0.32f, 0.34f);
        }

        public void SetPower(int energy, int max, float mul)
        {
            if (!_power) return;
            _power.text = "POWER  " + energy + "/" + max + "   x" + mul.ToString("0.00");
            _power.color = energy < 200 ? new Color(1f, 0.45f, 0.2f) : new Color(0.4f, 1f, 0.7f);
        }

        public void SetClock(float t)
        {
            if (_clock) _clock.text = NkCredit.Clock(t);
        }

        public void SetPurse(float score)
        {
            if (_purse) _purse.text = "  " + NkCredit.Money(score);
        }

        public void SetKnightWarn(bool on, NkDarkKnight knight)
        {
            if (!_warn) return;
            _warn.gameObject.SetActive(on && knight);
            if (!on || !knight) return;
            _warn.text = (knight.white ? "WHITE KNIGHT" : "DARK KNIGHT") + "  ♥ " + Mathf.CeilToInt(knight.hearts);
            float u = Mathf.PingPong(Time.time * 6f, 1f);
            _warn.color = Color.Lerp(new Color(1f, 0.08f, 0.05f), new Color(1f, 0.85f, 0.15f), u);
        }

        public void ShowGameOver(float score, string highs, float time = 0f)
        {
            if (_over) { _over.gameObject.SetActive(true); if (_overText) _overText.text = FormatOver(score, highs, time); return; }
            _over = new GameObject("GameOver").transform;
            _over.SetParent(_overlay, false);
            _over.localPosition = new Vector3(0f, 0.02f, 0.34f);
            var card = GameObject.CreatePrimitive(PrimitiveType.Quad);
            Object.DestroyImmediate(card.GetComponent<Collider>());
            card.transform.SetParent(_over, false);
            card.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            card.transform.localScale = new Vector3(0.58f, 0.42f, 1f);
            card.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(new Color(0.02f, 0.01f, 0.04f, 0.9f), 0.9f, true);
            var tm = new GameObject("ot").AddComponent<TextMesh>();
            tm.anchor = TextAnchor.MiddleCenter;
            tm.alignment = TextAlignment.Center;
            tm.characterSize = 0.007f;
            tm.fontSize = 36;
            tm.fontStyle = FontStyle.Bold;
            tm.color = new Color(1f, 0.35f, 0.3f);
            tm.transform.SetParent(_over, false);
            tm.transform.localPosition = new Vector3(0f, 0f, -0.01f);
            tm.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            tm.text = FormatOver(score, highs, time);
            NkGfx.FlipText(tm);
            _overText = tm;
        }

        static string FormatOver(float score, string highs, float time) =>
            "GAME OVER\n" + NkCredit.Money(score) + " GLYPHS\n" + NkCredit.Clock(time) + "\n\n" +
            "High scores\n" + (highs ?? "") + "\nClick any button to retry";

        public void Status(string s)
        {
            if (_status) _status.text = s ?? "";
        }

        static AudioClip MakeBeep()
        {
            const int sr = 22050;
            int n = (int)(sr * 0.08f);
            var data = new float[n];
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)sr;
                data[i] = Mathf.Sin(2f * Mathf.PI * 920f * t) * (1f - t / 0.08f) * 0.55f;
            }
            var clip = AudioClip.Create("assistBeep", n, 1, sr, false);
            clip.SetData(data, 0);
            return clip;
        }

        public void Toggle()
        {
            assist = !assist;
            if (!assist)
            {
                foreach (var l in _locks) if (l.root) Object.Destroy(l.root);
                _locks.Clear();
            }
        }

        public bool ToggleHud()
        {
            _hudOn = !_hudOn;
            if (_overlay) _overlay.gameObject.SetActive(_hudOn);
            return _hudOn;
        }

        public void Dispose()
        {
            if (_overlay) Object.Destroy(_overlay.gameObject);
            if (_hurtFx) Object.Destroy(_hurtFx.gameObject);
            _overlay = null;
            _hurtFx = null;
            Object.Destroy(this);
        }

        public void SetMissiles(int n)
        {
            n = Mathf.Max(0, n);
            int show = Mathf.Min(n, _misIco.Length);
            for (int i = 0; i < _misIco.Length; i++)
                if (_misIco[i]) _misIco[i].gameObject.SetActive(i < show);
            if (_misN) _misN.text = "x" + n;
        }

        public void SetHullGone(bool on)
        {
            if (_hurtFx) _hurtFx.gameObject.SetActive(on);
        }

        public void TickHolo(NkWorld world, Vector3 playerPos)
        {
            if (world == null) return;
            if (!_holo) BuildHolo(world);
            if (_blip) _blip.localPosition = playerPos * 0.00055f + Vector3.up * 0.005f;
        }

        void BuildHolo(NkWorld world)
        {
            const float s = 0.00055f;
            _holo = new GameObject("HoloMap").transform;
            _holo.SetParent(_overlay, false);
            // Left visor, above the laser meters and missile rack (was -0.236, on top of the fuel bar).
            _holo.localPosition = new Vector3(-0.232f, -0.012f, 0.355f);
            _holo.localRotation = Quaternion.Euler(22f, 38f, 0f);
            _holo.localScale = Vector3.one * 0.78f;
            var gold = NkGfx.Make(new Color(1f, 0.78f, 0.18f, 0.42f), 0.42f, true);
            foreach (var sph in world.spheres)
            {
                if (sph == null) continue;
                var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                Object.Destroy(go.GetComponent<Collider>());
                go.transform.SetParent(_holo, false);
                go.transform.localPosition = sph.c * s;
                go.transform.localScale = Vector3.one * (sph.r * 2f * s);
                go.GetComponent<Renderer>().sharedMaterial = gold;
                go.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            }
            foreach (var t in world.tubes)
            {
                if (!t) continue;
                var go = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                Object.Destroy(go.GetComponent<Collider>());
                go.transform.SetParent(_holo, false);
                go.transform.localPosition = t.position * s;
                go.transform.localRotation = t.rotation;
                var mf = t.GetComponent<MeshFilter>();
                float len = mf && mf.sharedMesh ? mf.sharedMesh.bounds.size.y : 20f;
                go.transform.localScale = new Vector3(3.4f * 2f * s, len * 0.5f * s, 3.4f * 2f * s);
                go.GetComponent<Renderer>().sharedMaterial = gold;
                go.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            }
            var b = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            Object.Destroy(b.GetComponent<Collider>());
            b.transform.SetParent(_holo, false);
            b.transform.localScale = Vector3.one * 0.01f;
            b.GetComponent<Renderer>().sharedMaterial = NkGfx.Additive(new Color(0.2f, 1f, 0.35f, 0.95f));
            _blip = b.transform;
        }

        public void Tick(NkDarkKnight knight, Camera cam)
        {
            if (_helpT > 0f)
            {
                _helpT -= Time.deltaTime;
                if (_helpT <= 0f && _help) _help.gameObject.SetActive(false);
            }
            if (!assist)
            {
                foreach (var l in _locks) if (l.root) l.root.SetActive(false);
                return;
            }
            var want = new List<Transform>();
            foreach (var d in NkDrone.All)
                if (d) want.Add(d.transform);
            if (knight) want.Add(knight.transform);
            foreach (var c in NkCamel.All) if (c) want.Add(c.transform);
            foreach (var t in NkTrilo.All) if (t) want.Add(t.transform);
            foreach (var h in NkHydraHead.All) if (h) want.Add(h.transform);
            foreach (var l in NkLemur.All) if (l) want.Add(l.transform);

            while (_locks.Count < want.Count) _locks.Add(MakeLock());
            for (int i = 0; i < _locks.Count; i++)
            {
                if (i >= want.Count) { if (_locks[i].root) _locks[i].root.SetActive(false); continue; }
                var t = want[i];
                var lk = _locks[i];
                lk.root.SetActive(true);
                lk.follow = t;
                lk.darkKnight = knight && t == knight.transform;
                UpdateLock(lk, t, knight, cam);
            }

            _beepT -= Time.deltaTime;
            bool threat = false;
            Vector3 eye = cam.transform.position;
            Vector3 fwd = cam.transform.forward;
            foreach (var d in NkDrone.All)
            {
                if (!d) continue;
                var to = d.transform.position - eye;
                float dist = to.magnitude;
                if (dist > 2.7f) continue;
                float facing = Vector3.Dot(fwd, to.normalized);
                if (facing < 0.35f) threat = true;
            }
            if (threat && _beepT <= 0f)
            {
                _beepT = 0.42f;
                if (_beepSrc && _beep) _beepSrc.PlayOneShot(_beep, 0.55f);
            }
        }

        NkLock MakeLock()
        {
            var go = new GameObject("Lock");
            var steel = new Color(0.95f, 0.18f, 0.14f, 0.9f);
            void Edge(string n, Vector3 p, Vector3 s)
            {
                var q = GameObject.CreatePrimitive(PrimitiveType.Cube);
                Object.Destroy(q.GetComponent<Collider>());
                q.name = n;
                q.transform.SetParent(go.transform, false);
                q.transform.localPosition = p;
                q.transform.localScale = s;
                q.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(steel, 1, true);
            }
            Edge("t", new Vector3(0, 0.5f, 0), new Vector3(1.02f, 0.03f, 0.01f));
            Edge("b", new Vector3(0, -0.5f, 0), new Vector3(1.02f, 0.03f, 0.01f));
            Edge("l", new Vector3(-0.5f, 0, 0), new Vector3(0.03f, 1.02f, 0.01f));
            Edge("r", new Vector3(0.5f, 0, 0), new Vector3(0.03f, 1.02f, 0.01f));
            var well = GameObject.CreatePrimitive(PrimitiveType.Cube);
            Object.Destroy(well.GetComponent<Collider>());
            well.transform.SetParent(go.transform, false);
            well.transform.localPosition = new Vector3(0f, -0.58f, 0f);
            well.transform.localScale = new Vector3(1.02f, 0.06f, 0.01f);
            well.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(new Color(0.12f, 0.04f, 0.04f), 1, true);
            var fill = GameObject.CreatePrimitive(PrimitiveType.Cube);
            Object.Destroy(fill.GetComponent<Collider>());
            fill.name = "hp";
            fill.transform.SetParent(go.transform, false);
            fill.transform.localPosition = new Vector3(0f, -0.58f, -0.005f);
            fill.transform.localScale = new Vector3(1f, 0.045f, 0.012f);
            fill.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(new Color(0.9f, 0.15f, 0.12f), 1, true);
            var distGo = new GameObject("dist");
            distGo.transform.SetParent(go.transform, false);
            distGo.transform.localPosition = new Vector3(0f, 0.62f, 0f);
            var dtm = distGo.AddComponent<TextMesh>();
            dtm.anchor = TextAnchor.MiddleCenter;
            dtm.alignment = TextAlignment.Center;
            dtm.characterSize = 0.04f;
            dtm.fontSize = 48;
            dtm.color = new Color(1f, 0.45f, 0.4f);
            dtm.fontStyle = FontStyle.Bold;
            var heartGo = new GameObject("heart");
            heartGo.transform.SetParent(go.transform, false);
            heartGo.transform.localPosition = new Vector3(0f, -0.78f, 0f);
            var htm = heartGo.AddComponent<TextMesh>();
            htm.anchor = TextAnchor.MiddleCenter;
            htm.alignment = TextAlignment.Center;
            htm.characterSize = 0.045f;
            htm.fontSize = 48;
            htm.color = new Color(1f, 0.35f, 0.38f);
            htm.fontStyle = FontStyle.Bold;
            NkGfx.FlipText(dtm);
            NkGfx.FlipText(htm);
            heartGo.SetActive(false);
            return new NkLock
            {
                root = go, frame = go.transform, barFill = fill.transform,
                distT = distGo.transform, heartT = heartGo.transform, dist = dtm, heart = htm
            };
        }

        void UpdateLock(NkLock lk, Transform t, NkDarkKnight knight, Camera cam)
        {
            var rend = t.GetComponentInChildren<Renderer>();
            Bounds b = rend ? rend.bounds : new Bounds(t.position + Vector3.up, Vector3.one);
            if (!rend) b = new Bounds(t.position + Vector3.up * 0.9f, new Vector3(0.7f, 1.8f, 0.7f));
            Vector3 c = b.center;
            lk.root.transform.position = c;
            var look = cam.transform.position - c;
            if (look.sqrMagnitude > 0.001f)
                lk.root.transform.rotation = Quaternion.LookRotation(look);
            float s = Mathf.Clamp(Mathf.Max(b.size.x, b.size.y) * 1.35f, 0.45f, 2.4f);
            lk.root.transform.localScale = Vector3.one * s;
            float dist = Vector3.Distance(cam.transform.position, c);
            if (lk.dist) lk.dist.text = dist.ToString("0.0") + " m";
            float hp = 1f, max = 1f;
            var dr = t.GetComponent<NkDrone>();
            if (dr) { hp = dr.hp; max = dr.maxHp; }
            var camel = t.GetComponent<NkCamel>();
            if (camel) { hp = camel.hp; max = camel.maxHp; }
            var tr = t.GetComponent<NkTrilo>();
            if (tr) { hp = tr.hp; max = tr.maxHp; }
            var hh = t.GetComponent<NkHydraHead>();
            if (hh) { hp = hh.hp; max = 20f; }
            var lm = t.GetComponent<NkLemur>();
            if (lm) { hp = lm.hp; max = lm.maxHp; }
            bool dk = knight && t == knight.transform;
            if (dk) { hp = knight.hearts; max = knight.maxHearts; }
            float u = max > 0.01f ? Mathf.Clamp01(hp / max) : 0f;
            if (lk.barFill)
            {
                lk.barFill.localScale = new Vector3(Mathf.Max(0.02f, u), 0.045f, 0.012f);
                lk.barFill.localPosition = new Vector3((-1f + u) * 0.5f, -0.58f, -0.005f);
            }
            if (lk.heartT)
            {
                lk.heartT.gameObject.SetActive(dk);
                if (dk && lk.heart) lk.heart.text = "♥  " + Mathf.CeilToInt(knight.hearts);
            }
        }
    }
}
