using UnityEngine;

namespace NetKnight
{
    public static class NkSfx
    {
        public static bool Mute;
        static AudioClip _shard, _coin, _beep, _plasma, _laser, _laserPulse, _laserHumClip, _pulse, _shield, _slash,
            _boom, _hurt, _camel, _missile, _shop, _over, _boost, _swing, _plasmaHit, _plasmaHitBig, _plasmaHitHuge, _land, _type, _ui, _crowd;
        static AudioSource _laserHumSrc, _crowdSrc;

        public static void Shard(Vector3 p) => Play(ref _shard, p, Burst(2100f, 0.07f, 0.5f, 0.3f), 0.58f);
        public static void Coin(Vector3 p) => Play(ref _coin, p, Burst(920f, 0.11f, 0.55f, 0.22f), 0.55f);
        public static void Beep(Vector3 p) => Play(ref _beep, p, Burst(640f, 0.06f, 0.4f, 0.15f), 0.42f);
        public static void Plasma(Vector3 p, bool charged) =>
            PlayHeavy(ref _plasma, p, Res("plasma") ?? Noise(charged ? 0.28f : 0.12f, charged ? 160f : 380f, charged ? 0.85f : 0.55f), charged ? 1f : 0.72f, charged ? 12f : 7f);
        public static void Laser(Vector3 p)
        {
            if (!_laser) _laser = Res("laser") ?? LaserThumpClip();
            PlayThump(_laser, p, 1f, 18f, 0.90f);
        }
        public static void LaserPulse(Vector3 p)
        {
            if (!_laserPulse) _laserPulse = LaserPulseClip();
            PlayThump(_laserPulse, p, 0.42f, 12f, 0.86f);
        }
        public static void LaserHum(Vector3 p, bool on)
        {
            if (!on || Mute)
            {
                if (_laserHumSrc && _laserHumSrc.isPlaying) _laserHumSrc.Stop();
                return;
            }
            if (!_laserHumClip) _laserHumClip = LaserHumClip();
            if (!_laserHumSrc)
            {
                var go = new GameObject("nkLaserHum");
                Object.DontDestroyOnLoad(go);
                _laserHumSrc = go.AddComponent<AudioSource>();
                _laserHumSrc.playOnAwake = false;
                _laserHumSrc.loop = true;
                _laserHumSrc.spatialBlend = 1f;
                _laserHumSrc.minDistance = 8f;
                _laserHumSrc.maxDistance = 55f;
                _laserHumSrc.rolloffMode = AudioRolloffMode.Linear;
                _laserHumSrc.dopplerLevel = 0f;
                _laserHumSrc.clip = _laserHumClip;
            }
            _laserHumSrc.transform.position = p;
            _laserHumSrc.volume = 0.28f;
            _laserHumSrc.pitch = 0.82f;
            if (!_laserHumSrc.isPlaying) _laserHumSrc.Play();
        }
        public static void Type(Vector3 p)
        {
            if (!_type) _type = Burst(420f, 0.028f, 0.35f, 0.15f);
            Play(ref _type, p, _type, 0.22f);
        }
        public static void Ui(Vector3 p)
        {
            if (!_ui) _ui = Burst(180f, 0.09f, 0.5f, 0.2f);
            Play(ref _ui, p, _ui, 0.4f);
        }
        public static void Pulse(Vector3 p) => PlayHeavy(ref _pulse, p, Res("pulse") ?? Noise(0.32f, 62f, 0.9f), 0.92f, 10f);
        public static void Shield(Vector3 p) => Play(ref _shield, p, Res("shield") ?? Burst(380f, 0.18f, 0.45f, 0.5f), 0.62f);
        public static void Slash(Vector3 p)
        {
            if (!_slash) _slash = SlashClip();
            PlayExplosion(_slash, p, 1f, 9f);
        }
        public static void Swing(Vector3 p)
        {
            if (!_swing) _swing = SwingClip();
            PlayExplosion(_swing, p, 1f, 8f);
        }
        public static void Boom(Vector3 p) => PlayHeavy(ref _boom, p, Res("boom") ?? Noise(0.38f, 48f, 0.95f), 1f, 14f);
        public static void PlasmaImpact(Vector3 p, bool charged, float size = 0f)
        {
            bool huge = charged && size >= 0.42f;
            if (huge)
            {
                if (!_plasmaHitHuge)
                    _plasmaHitHuge = Res("plasma_impact_huge") ?? PlasmaHitClip(true, true);
                PlayExplosion(_plasmaHitHuge, p, 1f, 20f);
                Play(ref _boom, p, Res("boom") ?? Noise(0.42f, 38f, 0.95f), 0.7f);
            }
            else if (charged)
            {
                if (!_plasmaHitBig)
                    _plasmaHitBig = Res("plasma_impact_big") ?? PlasmaHitClip(true);
                PlayExplosion(_plasmaHitBig, p, 1f, 14f);
            }
            else
            {
                if (!_plasmaHit)
                    _plasmaHit = Res("plasma_impact") ?? PlasmaHitClip(false);
                PlayExplosion(_plasmaHit, p, 0.92f, 8f);
            }
        }
        public static void Land(Vector3 p)
        {
            if (Mute) return;
            if (!_land) _land = LandClip();
            AudioSource.PlayClipAtPoint(_land, p, 0.72f);
        }
        public static void Hurt(Vector3 p) => Play(ref _hurt, p, Res("hurt") ?? Noise(0.16f, 130f, 0.7f), 0.78f);
        public static void Camel(Vector3 p) => Play(ref _camel, p, Burst(160f, 0.16f, 0.5f, 0.4f), 0.55f);
        public static void MonkeyWail(Vector3 p)
        {
            PlayNear(SynthWail(0xA11E5u + (uint)(Time.frameCount * 13)), p, 0.7f, 1.4f, 16f, Random.Range(0.92f, 1.08f));
        }
        public static AudioClip BitCry(int seed)
        {
            return ChiptuneCry((uint)(seed == 0 ? 0xC0DE : seed));
        }
        public static void Honk(Vector3 p) => Play(ref _beep, p, Burst(140f, 0.18f, 0.55f, 0.35f), 0.62f);
        public static void Missile(Vector3 p) => PlayHeavy(ref _missile, p, Noise(0.22f, 95f, 0.7f), 0.85f, 8f);
        public static void Shop(Vector3 p) => Play(ref _shop, p, Burst(520f, 0.1f, 0.4f, 0.2f), 0.4f);
        public static void GameOver(Vector3 p) => Play(ref _over, p, Noise(0.55f, 40f, 0.85f), 0.85f);
        public static void Boost(Vector3 p) => Play(ref _boost, p, Burst(300f, 0.2f, 0.6f, 0.45f), 0.55f);
        public static void PowerLevel(int tenths, Vector3 p)
        {
            if (Mute) return;
            tenths = Mathf.Clamp(tenths, 11, 40);
            var clip = Res("power/p" + tenths);
            if (!clip) clip = SpeakPower(tenths);
            if (!clip) return;
            var go = new GameObject("nkPowerVoice");
            go.transform.position = p;
            var src = go.AddComponent<AudioSource>();
            src.clip = clip;
            src.volume = 0.9f;
            src.spatialBlend = 0f;
            src.bypassListenerEffects = true;
            src.Play();
            Object.Destroy(go, clip.length + 0.12f);
        }

        static readonly string[] NumWord =
        {
            "ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE"
        };

        static AudioClip SpeakPower(int tenths)
        {
            int whole = tenths / 10, frac = tenths % 10;
            return SpeakRobot("CROSSING ABOVE " + NumWord[whole] + " POINT " + NumWord[frac] + " POWER");
        }

        struct Ph
        {
            public float f1, f2, f3, voiced, noise, ms;
            public Ph(float a, float b, float c, float v, float n, float m) { f1 = a; f2 = b; f3 = c; voiced = v; noise = n; ms = m; }
        }

        static AudioClip SpeakRobot(string phrase)
        {
            const int sr = 22050;
            var seq = new System.Collections.Generic.List<Ph>();
            void Add(params Ph[] p) { for (int i = 0; i < p.Length; i++) seq.Add(p[i]); }
            void Gap() => seq.Add(new Ph(200, 800, 2400, 0f, 0f, 55f));
            void Word(string w)
            {
                switch (w)
                {
                    case "CROSSING":
                        Add(new Ph(400, 1800, 2600, 0.15f, 0.55f, 40f), new Ph(500, 1300, 1700, 0.9f, 0.05f, 70f),
                            new Ph(620, 920, 2500, 1f, 0.04f, 90f), new Ph(500, 1800, 3500, 0.2f, 0.7f, 80f),
                            new Ph(400, 2000, 2700, 0.95f, 0.08f, 70f), new Ph(300, 1400, 2200, 0.7f, 0.12f, 90f));
                        break;
                    case "ABOVE":
                        Add(new Ph(700, 1200, 2500, 1f, 0.05f, 80f), new Ph(200, 800, 2200, 0.4f, 0.15f, 45f),
                            new Ph(700, 1200, 2500, 1f, 0.05f, 80f), new Ph(400, 1000, 2200, 0.6f, 0.35f, 90f));
                        break;
                    case "ZERO":
                        Add(new Ph(400, 1800, 3500, 0.3f, 0.55f, 70f), new Ph(400, 2000, 2700, 1f, 0.06f, 70f),
                            new Ph(500, 1300, 1700, 1f, 0.05f, 70f), new Ph(450, 900, 2400, 1f, 0.04f, 90f));
                        break;
                    case "ONE":
                        Add(new Ph(300, 700, 2300, 0.9f, 0.05f, 60f), new Ph(700, 1200, 2500, 1f, 0.04f, 90f),
                            new Ph(300, 1400, 2200, 0.7f, 0.1f, 90f));
                        break;
                    case "TWO":
                        Add(new Ph(400, 1800, 2800, 0.1f, 0.45f, 40f), new Ph(300, 800, 2300, 1f, 0.04f, 140f));
                        break;
                    case "THREE":
                        Add(new Ph(400, 1800, 3400, 0.2f, 0.6f, 50f), new Ph(500, 1300, 1700, 1f, 0.05f, 70f),
                            new Ph(300, 2300, 3000, 1f, 0.04f, 120f));
                        break;
                    case "FOUR":
                        Add(new Ph(400, 1400, 2500, 0.3f, 0.45f, 50f), new Ph(620, 920, 2500, 1f, 0.04f, 100f),
                            new Ph(500, 1300, 1700, 1f, 0.05f, 90f));
                        break;
                    case "FIVE":
                        Add(new Ph(400, 1400, 2500, 0.3f, 0.45f, 45f), new Ph(700, 1500, 2500, 1f, 0.04f, 90f),
                            new Ph(400, 1000, 2200, 0.6f, 0.3f, 90f));
                        break;
                    case "SIX":
                        Add(new Ph(500, 1800, 3500, 0.15f, 0.7f, 70f), new Ph(400, 2000, 2700, 1f, 0.06f, 70f),
                            new Ph(400, 1800, 2600, 0.15f, 0.5f, 40f), new Ph(500, 1800, 3500, 0.15f, 0.7f, 80f));
                        break;
                    case "SEVEN":
                        Add(new Ph(500, 1800, 3500, 0.15f, 0.7f, 60f), new Ph(550, 1800, 2500, 1f, 0.05f, 70f),
                            new Ph(400, 1000, 2200, 0.6f, 0.25f, 50f), new Ph(400, 2000, 2700, 1f, 0.06f, 60f),
                            new Ph(300, 1400, 2200, 0.7f, 0.1f, 80f));
                        break;
                    case "EIGHT":
                        Add(new Ph(500, 1900, 2500, 1f, 0.04f, 90f), new Ph(400, 1800, 2800, 0.1f, 0.45f, 50f));
                        break;
                    case "NINE":
                        Add(new Ph(300, 1400, 2200, 0.7f, 0.1f, 70f), new Ph(700, 1500, 2500, 1f, 0.04f, 90f),
                            new Ph(300, 1400, 2200, 0.7f, 0.1f, 90f));
                        break;
                    case "POINT":
                        Add(new Ph(200, 900, 2400, 0.2f, 0.2f, 35f), new Ph(500, 900, 2300, 1f, 0.05f, 80f),
                            new Ph(300, 1400, 2200, 0.7f, 0.1f, 60f), new Ph(400, 1800, 2800, 0.1f, 0.45f, 45f));
                        break;
                    case "POWER":
                        Add(new Ph(200, 900, 2400, 0.2f, 0.2f, 35f), new Ph(700, 1100, 2400, 1f, 0.04f, 90f),
                            new Ph(500, 1400, 1800, 1f, 0.05f, 110f));
                        break;
                }
            }
            var parts = phrase.Split(' ');
            for (int i = 0; i < parts.Length; i++)
            {
                Word(parts[i]);
                Gap();
            }
            int total = 0;
            for (int i = 0; i < seq.Count; i++) total += Mathf.Max(8, (int)(sr * (seq[i].ms / 1000f)));
            var data = new float[total];
            uint seed = 0xC0FFEE;
            float Rnd() { seed = seed * 1664525u + 1013904223u; return (seed & 65535) / 32768f - 1f; }
            int o = 0;
            float ph = 0f, f1p = 500f, f2p = 1400f, f3p = 2400f, vp = 0f, np = 0f, buzz = 0f;
            for (int s = 0; s < seq.Count; s++)
            {
                var p = seq[s];
                int n = Mathf.Max(8, (int)(sr * (p.ms / 1000f)));
                for (int i = 0; i < n && o < data.Length; i++, o++)
                {
                    float u = n <= 1 ? 1f : i / (float)(n - 1);
                    float env = u < 0.12f ? u / 0.12f : u > 0.82f ? (1f - u) / 0.18f : 1f;
                    f1p = Mathf.Lerp(f1p, p.f1, 0.18f);
                    f2p = Mathf.Lerp(f2p, p.f2, 0.18f);
                    f3p = Mathf.Lerp(f3p, p.f3, 0.18f);
                    vp = Mathf.Lerp(vp, p.voiced, 0.2f);
                    np = Mathf.Lerp(np, p.noise, 0.2f);
                    float hz = 95f + Mathf.Sin((o / (float)sr) * 9f) * 6f;
                    ph += hz / sr;
                    if (ph > 1f) ph -= 1f;
                    float glot = ph < 0.18f ? 1f - ph / 0.18f : 0f;
                    glot = glot * glot * 1.6f - 0.3f;
                    buzz = buzz * 0.35f + glot * 0.65f;
                    float src = buzz * vp + Rnd() * np;
                    float r1 = 1f - f1p / (sr * 0.45f);
                    float r2 = 1f - f2p / (sr * 0.45f);
                    float r3 = 1f - f3p / (sr * 0.45f);
                    float q = src * (0.55f + 0.25f * Mathf.Sin(o * f1p * 2f * Mathf.PI / sr) * r1
                                     + 0.18f * Mathf.Sin(o * f2p * 2f * Mathf.PI / sr) * r2
                                     + 0.1f * Mathf.Sin(o * f3p * 2f * Mathf.PI / sr) * r3);
                    float robot = Mathf.Sign(q) * Mathf.Pow(Mathf.Min(1f, Mathf.Abs(q) * 1.6f), 0.7f);
                    robot += 0.08f * Mathf.Sign(Mathf.Sin(ph * 2f * Mathf.PI * 3f));
                    data[o] = Mathf.Clamp(robot * env * 0.42f, -1f, 1f);
                }
            }
            var c = AudioClip.Create("nkPowerTts", data.Length, 1, sr, false);
            c.SetData(data, 0);
            return c;
        }

        public static void Crowd(Vector3 p)
        {
            if (!_crowd) _crowd = CrowdClip();
            PlayThump(_crowd, p, 0.55f, 18f, Random.Range(0.92f, 1.06f));
        }
        public static void CrowdLoop(bool on, Vector3 p)
        {
            if (!on || Mute)
            {
                if (_crowdSrc && _crowdSrc.isPlaying) _crowdSrc.Stop();
                return;
            }
            if (!_crowd) _crowd = CrowdClip();
            if (!_crowdSrc)
            {
                var go = new GameObject("nkCrowd");
                Object.DontDestroyOnLoad(go);
                _crowdSrc = go.AddComponent<AudioSource>();
                _crowdSrc.playOnAwake = false;
                _crowdSrc.loop = true;
                _crowdSrc.spatialBlend = 0f;
                _crowdSrc.clip = _crowd;
            }
            _crowdSrc.transform.position = p;
            _crowdSrc.volume = Mute ? 0f : 0.048f;
            if (!_crowdSrc.isPlaying) _crowdSrc.Play();
        }

        static void Play(ref AudioClip clip, Vector3 p, AudioClip made, float vol)
        {
            if (Mute) return;
            if (!clip) clip = made;
            AudioSource.PlayClipAtPoint(clip, p, vol);
        }

        static void PlayHeavy(ref AudioClip clip, Vector3 p, AudioClip made, float vol, float minDist)
        {
            if (!clip) clip = made;
            PlayExplosion(clip, p, vol, minDist);
        }

        static void PlayExplosion(AudioClip clip, Vector3 p, float vol, float minDist)
        {
            PlayThump(clip, p, vol, minDist, Random.Range(0.96f, 1.05f));
        }

        static void PlayThump(AudioClip clip, Vector3 p, float vol, float minDist, float pitch)
        {
            if (Mute || !clip) return;
            var go = new GameObject("nkPlasmaBoom");
            go.transform.position = p;
            var src = go.AddComponent<AudioSource>();
            src.clip = clip;
            src.volume = vol;
            src.pitch = pitch;
            src.spatialBlend = 1f;
            src.minDistance = minDist;
            src.maxDistance = 95f;
            src.rolloffMode = AudioRolloffMode.Linear;
            src.dopplerLevel = 0f;
            src.Play();
            Object.Destroy(go, clip.length / Mathf.Max(0.5f, src.pitch) + 0.08f);
        }

        static void PlayNear(AudioClip clip, Vector3 p, float vol, float minDist, float maxDist, float pitch)
        {
            if (Mute || !clip) return;
            var go = new GameObject("nkNear");
            go.transform.position = p;
            var src = go.AddComponent<AudioSource>();
            src.clip = clip;
            src.volume = vol;
            src.pitch = pitch;
            src.spatialBlend = 1f;
            src.minDistance = minDist;
            src.maxDistance = maxDist;
            src.rolloffMode = AudioRolloffMode.Linear;
            src.dopplerLevel = 0f;
            src.Play();
            Object.Destroy(go, clip.length / Mathf.Max(0.5f, src.pitch) + 0.08f);
        }

        static AudioClip Res(string name)
        {
            return Resources.Load<AudioClip>("NkSfx/" + name);
        }

        static float Tanh(float x) => (float)System.Math.Tanh(x);

        static AudioClip Burst(float hz, float dur, float vol, float noise)
        {
            const int sr = 22050;
            int n = Mathf.Max(64, (int)(sr * dur));
            var data = new float[n];
            float phase = 0f;
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)sr;
                float env = Mathf.Pow(1f - t / dur, 1.4f);
                phase += (hz + Mathf.Sin(t * 40f) * hz * 0.08f) / sr;
                float s = Mathf.Sin(phase * 2f * Mathf.PI) * (1f - noise)
                          + (Random.value * 2f - 1f) * noise;
                data[i] = s * env * vol;
            }
            var c = AudioClip.Create("nkB" + (int)hz, n, 1, sr, false);
            c.SetData(data, 0);
            return c;
        }

        static AudioClip LaserThumpClip()
        {
            const int sr = 44100;
            float dur = 0.52f;
            int n = (int)(sr * dur);
            var data = new float[n];
            uint seed = 0x7A5E12u;
            float ph = 0f, ph2 = 0f, lp = 0f, lp2 = 0f, mixLp = 0f, mixLp2 = 0f;
            float Rnd()
            {
                seed = seed * 1664525u + 1013904223u;
                return (seed >> 8) * (1f / 16777216f);
            }
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)sr;
                float env = Mathf.Exp(-t * 5.6f);
                if (t < 0.006f) env *= t / 0.006f;
                float clickEnv = Mathf.Exp(-t * 62f);
                if (t < 0.002f) clickEnv *= t / 0.002f;
                float hz = 56f + 102f * Mathf.Exp(-t * 20f);
                ph += hz / sr;
                ph2 += hz * 1.97f / sr;
                float fund = Mathf.Sin(ph * 2f * Mathf.PI);
                float harm = Mathf.Sin(ph2 * 2f * Mathf.PI);
                float body = Tanh(fund * 2.7f + harm * 0.42f);
                float chest = Mathf.Sin(2f * Mathf.PI * 92f * t) * Mathf.Exp(-t * 7.5f);
                float sub = Mathf.Sin(2f * Mathf.PI * 58f * t) * Mathf.Exp(-t * 4.0f);
                float raw = Rnd() * 2f - 1f;
                lp += 0.038f * (raw - lp);
                lp2 += 0.07f * (lp - lp2);
                float mix = body * env * 0.90f + chest * env * 0.55f + sub * env * 0.70f + lp2 * clickEnv * 0.48f;
                mixLp += 0.048f * (mix - mixLp);
                mixLp2 += 0.048f * (mixLp - mixLp2);
                data[i] = mixLp2;
            }
            float peak = 0.0001f;
            for (int i = 0; i < n; i++)
            {
                float a = Mathf.Abs(data[i]);
                if (a > peak) peak = a;
            }
            float g = 0.96f / peak;
            for (int i = 0; i < n; i++) data[i] = Mathf.Clamp(data[i] * g, -1f, 1f);
            var c = AudioClip.Create("nkLaserThump", n, 1, sr, false);
            c.SetData(data, 0);
            return c;
        }

        static AudioClip LaserPulseClip()
        {
            const int sr = 44100;
            float dur = 0.22f;
            int n = (int)(sr * dur);
            var data = new float[n];
            float ph = 0f, mixLp = 0f;
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)sr;
                float env = Mathf.Exp(-t * 9.5f);
                if (t < 0.004f) env *= t / 0.004f;
                float hz = 52f + 68f * Mathf.Exp(-t * 24f);
                ph += hz / sr;
                float s = Tanh(Mathf.Sin(ph * 2f * Mathf.PI) * 2.1f);
                mixLp += 0.06f * (s * env - mixLp);
                data[i] = mixLp * 0.85f;
            }
            var c = AudioClip.Create("nkLaserPulse", n, 1, sr, false);
            c.SetData(data, 0);
            return c;
        }

        static AudioClip CrowdClip()
        {
            const int sr = 22050;
            float dur = 2.6f;
            int n = (int)(sr * dur);
            var data = new float[n];
            uint seed = 0xC10ADu;
            float lp = 0f;
            float Rnd()
            {
                seed = seed * 1664525u + 1013904223u;
                return (seed >> 8) * (1f / 16777216f);
            }
            for (int clap = 0; clap < 28; clap++)
            {
                int start = (int)(Rnd() * (n - 1200));
                float pitch = 900f + Rnd() * 1400f;
                int len = 400 + (int)(Rnd() * 900);
                for (int i = 0; i < len && start + i < n; i++)
                {
                    float t = i / (float)sr;
                    float env = Mathf.Exp(-t * (18f + Rnd() * 22f));
                    float raw = Rnd() * 2f - 1f;
                    lp += 0.22f * (raw - lp);
                    data[start + i] += (lp + Mathf.Sin(2f * Mathf.PI * pitch * t) * 0.12f) * env * 0.22f;
                }
            }
            float roarLp = 0f;
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)sr;
                float fade = 1f;
                if (t < 0.08f) fade = t / 0.08f;
                else if (t > dur - 0.12f) fade = (dur - t) / 0.12f;
                float raw = Rnd() * 2f - 1f;
                roarLp += 0.04f * (raw - roarLp);
                data[i] = Mathf.Clamp(data[i] + roarLp * 0.22f * fade, -1f, 1f);
            }
            var c = AudioClip.Create("nkCrowd", n, 1, sr, false);
            c.SetData(data, 0);
            return c;
        }

        static AudioClip LaserHumClip()
        {
            const int sr = 22050;
            float dur = 0.85f;
            int n = (int)(sr * dur);
            var data = new float[n];
            uint seed = 0xBA5501u;
            float lp = 0f, lp2 = 0f, lp3 = 0f;
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)sr;
                seed = seed * 1664525u + 1013904223u;
                float raw = ((seed >> 8) * (1f / 16777216f)) * 2f - 1f;
                lp += 0.028f * (raw - lp);
                lp2 += 0.028f * (lp - lp2);
                lp3 += 0.04f * (lp2 - lp3);
                float fade = 1f;
                float edge = 0.08f;
                if (t < edge) fade = t / edge;
                else if (t > dur - edge) fade = (dur - t) / edge;
                data[i] = Mathf.Clamp(lp3 * fade * 1.35f, -1f, 1f);
            }
            var c = AudioClip.Create("nkLaserHum", n, 1, sr, false);
            c.SetData(data, 0);
            return c;
        }

        static AudioClip SlashClip()
        {
            const int sr = 44100;
            float dur = 0.18f;
            int n = (int)(sr * dur);
            var data = new float[n];
            float lp = 0f, ph = 0f;
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)sr;
                float env = Mathf.Pow(1f - t / dur, 1.15f);
                float raw = Random.value * 2f - 1f;
                lp = Mathf.Lerp(lp, raw, 0.28f);
                ph += Mathf.Lerp(2400f, 180f, t / dur) / sr;
                float metal = Mathf.Sin(ph * 2f * Mathf.PI) + 0.4f * Mathf.Sin(ph * 4.1f * Mathf.PI);
                float crack = (raw - lp) * Mathf.Exp(-t * 40f);
                data[i] = Mathf.Clamp((metal * 0.45f + crack * 1.1f + lp * 0.35f) * env * 1.15f, -1f, 1f);
            }
            var c = AudioClip.Create("nkSlashHot", n, 1, sr, false);
            c.SetData(data, 0);
            return c;
        }

        static AudioClip SwingClip()
        {
            const int sr = 44100;
            float dur = 0.32f;
            int n = (int)(sr * dur);
            var data = new float[n];
            float ph = 0f, lp = 0f;
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)sr;
                float u = t / dur;
                float env = Mathf.Sin(Mathf.PI * Mathf.Clamp01(u / 0.18f)) * Mathf.Pow(1f - u, 0.85f);
                float hz = Mathf.Lerp(520f, 55f, Mathf.Pow(u, 0.55f));
                ph += hz / sr;
                lp = Mathf.Lerp(lp, Random.value * 2f - 1f, 0.14f);
                float whoosh = lp * 0.85f + Mathf.Sin(ph * 2f * Mathf.PI) * 0.28f;
                float ring = Mathf.Sin(2f * Mathf.PI * 1620f * t) * Mathf.Exp(-t * 14f) * 0.42f;
                float blade = Mathf.Sin(2f * Mathf.PI * 280f * t) * env * 0.35f;
                data[i] = Mathf.Clamp((whoosh * env + ring + blade) * 1.15f, -1f, 1f);
            }
            var c = AudioClip.Create("nkSwing", n, 1, sr, false);
            c.SetData(data, 0);
            return c;
        }

        static AudioClip PlasmaHitClip(bool charged, bool huge = false)
        {
            const int sr = 44100;
            float dur = huge ? 1.18f : charged ? 0.92f : 0.50f;
            int n = (int)(sr * dur);
            var data = new float[n];
            uint seed = huge ? 0xDECA11u : charged ? 0xA11E5u : 0x51A5Eu;
            float lp = 0f, bp = 0f, phSub = 0f, phHarm = 0f, phChirp = 0f, phFm = 0f, phRing = 0f;
            float shock2 = huge ? 0.048f : charged ? 0.062f : -1f;
            float shock3 = huge ? 0.118f : -1f;
            float fCrack = huge ? 1980f : charged ? 2480f : 3380f;
            float fCrack2 = huge ? 3120f : charged ? 3910f : 5210f;
            float chirp0 = huge ? 1280f : charged ? 1620f : 2480f;
            float chirp1 = huge ? 72f : charged ? 108f : 168f;
            float Rnd()
            {
                seed = seed * 1664525u + 1013904223u;
                return (seed >> 8) * (1f / 16777216f);
            }
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)sr;
                float u = t / dur;
                float eMid = Mathf.Exp(-t * (charged ? 2.25f : 3.55f));
                float eSlow = Mathf.Pow(1f - u, 1.12f);
                float raw = Rnd() * 2f - 1f;
                lp = Mathf.Lerp(lp, raw, charged ? 0.10f : 0.145f);
                float hp = raw - lp;
                bp = bp * 0.70f + hp * 0.30f;

                float crack = hp * Mathf.Exp(-t * 46f) * 1.55f;
                float ping = Mathf.Sin(2f * Mathf.PI * fCrack * t) * Mathf.Exp(-t * 40f) * 0.62f
                           + Mathf.Sin(2f * Mathf.PI * fCrack2 * t) * Mathf.Exp(-t * 60f) * 0.30f
                           + Mathf.Sin(2f * Mathf.PI * fCrack * 0.52f * t) * Mathf.Exp(-t * 26f) * 0.20f;
                if (shock2 > 0f && t >= shock2)
                {
                    float t2 = t - shock2;
                    crack += hp * Mathf.Exp(-t2 * 36f) * 0.90f;
                    ping += Mathf.Sin(2f * Mathf.PI * 1760f * t2) * Mathf.Exp(-t2 * 34f) * 0.42f;
                }
                if (shock3 > 0f && t >= shock3)
                {
                    float t3 = t - shock3;
                    crack += hp * Mathf.Exp(-t3 * 28f) * 1.05f;
                    ping += Mathf.Sin(2f * Mathf.PI * 980f * t3) * Mathf.Exp(-t3 * 22f) * 0.55f;
                }

                float chirpU = Mathf.Clamp01(t / (charged ? 0.24f : 0.16f));
                phChirp += Mathf.Lerp(chirp0, chirp1, Mathf.Pow(chirpU, 0.42f)) / sr;
                phFm += Mathf.Lerp(1860f, 88f, chirpU) / sr;
                float chirp = Mathf.Sin(phChirp * 2f * Mathf.PI + 2.15f * Mathf.Sin(phFm * 2f * Mathf.PI));
                chirp *= Mathf.Exp(-t * (charged ? 5.2f : 7.8f));
                if (t > 0.20f) chirp *= 0.38f;

                float subSpan = huge ? 0.72f : charged ? 0.52f : 0.28f;
                float subHz = Mathf.Lerp(huge ? 48f : charged ? 58f : 84f, huge ? 16f : 21f, Mathf.Pow(Mathf.Clamp01(t / subSpan), 0.55f));
                phSub += subHz / sr;
                phHarm += subHz * 2.02f / sr;
                float sub = Tanh((Mathf.Sin(phSub * 2f * Mathf.PI) + 0.40f * Mathf.Sin(phHarm * 2f * Mathf.PI)) * 1.55f);
                sub *= Mathf.Exp(-t * (charged ? 1.95f : 3.25f));

                phRing += Mathf.Lerp(charged ? 610f : 980f, 86f, Mathf.Pow(u, 0.38f)) / sr;
                float ring = Mathf.Sin(phRing * 2f * Mathf.PI) * Mathf.Pow(1f - u, 2.05f)
                           + 0.18f * Mathf.Sin(phRing * 2f * Mathf.PI * 1.034f) * Mathf.Pow(1f - u, 2.5f);
                float spark = Rnd() > (charged ? 0.855f : 0.925f) ? (Rnd() * 2f - 1f) * eSlow * eSlow : 0f;
                float hiss = hp * eSlow * (charged ? 0.13f : 0.075f);
                if (t < 0.018f) hiss *= t / 0.018f;

                float mix = sub * (huge ? 1.12f : charged ? 0.95f : 0.70f)
                          + bp * eMid * (huge ? 0.7f : charged ? 0.58f : 0.44f)
                          + crack * (huge ? 0.95f : charged ? 0.82f : 0.70f)
                          + ping * (huge ? 0.7f : 0.56f)
                          + chirp * (huge ? 0.72f : charged ? 0.64f : 0.55f)
                          + ring * (huge ? 0.42f : charged ? 0.36f : 0.30f)
                          + spark * 0.38f
                          + hiss;
                data[i] = Mathf.Clamp(Tanh(mix * (huge ? 1.18f : charged ? 1.08f : 1.02f)), -1f, 1f);
            }
            var c = AudioClip.Create(huge ? "nkPlasmaHitHuge" : charged ? "nkPlasmaHitBig" : "nkPlasmaHit", n, 1, sr, false);
            c.SetData(data, 0);
            return c;
        }

        static AudioClip LandClip()
        {
            const int sr = 22050;
            float dur = 0.22f;
            int n = (int)(sr * dur);
            var data = new float[n];
            float lp = 0f, ph = 0f;
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)sr;
                float env = Mathf.Pow(1f - t / dur, 1.7f);
                ph += Mathf.Lerp(72f, 28f, t / dur) / sr;
                float thud = Mathf.Sin(ph * 2f * Mathf.PI);
                lp = Mathf.Lerp(lp, Random.value * 2f - 1f, 0.12f);
                data[i] = Mathf.Clamp((thud * 0.7f + lp * 0.45f) * env * 0.85f, -1f, 1f);
            }
            var c = AudioClip.Create("nkLand", n, 1, sr, false);
            c.SetData(data, 0);
            return c;
        }

        static AudioClip ChiptuneCry(uint seed)
        {
            const int sr = 22050;
            float dur = 0.42f;
            int n = (int)(sr * dur);
            var data = new float[n];
            uint s = seed * 1664525u + 1013904223u;
            float Rnd() { s = s * 1664525u + 1013904223u; return (s >> 8) * (1f / 16777216f); }
            int notes = 4 + (int)(Rnd() * 3f);
            float[] scale = { 220f, 247f, 262f, 294f, 330f, 349f, 392f, 440f, 494f, 523f };
            float duty = 0.18f + Rnd() * 0.32f;
            for (int k = 0; k < notes; k++)
            {
                float hz = scale[(int)(Rnd() * scale.Length)] * (Rnd() < 0.35f ? 0.5f : 1f);
                float start = k / (float)notes * dur;
                float len = dur / notes * (0.55f + Rnd() * 0.5f);
                int a = (int)(start * sr);
                int b = Mathf.Min(n, a + (int)(len * sr));
                float ph = 0f;
                for (int i = a; i < b; i++)
                {
                    float t = (i - a) / (float)sr;
                    float env = Mathf.Pow(1f - t / Mathf.Max(0.02f, len), 1.15f);
                    if (t < 0.01f) env *= t / 0.01f;
                    ph += hz / sr;
                    if (ph > 1f) ph -= 1f;
                    float sq = ph < duty ? 1f : -1f;
                    float tri = ph < 0.5f ? ph * 4f - 1f : 3f - ph * 4f;
                    data[i] = Mathf.Clamp(data[i] + (sq * 0.72f + tri * 0.18f) * env * 0.55f, -1f, 1f);
                }
            }
            var c = AudioClip.Create("nkBitCry" + seed, n, 1, sr, false);
            c.SetData(data, 0);
            return c;
        }

        static AudioClip SynthWail(uint seed)
        {
            const int sr = 22050;
            float dur = 0.55f;
            int n = (int)(sr * dur);
            var data = new float[n];
            uint s = seed;
            float Rnd() { s = s * 1664525u + 1013904223u; return (s >> 8) * (1f / 16777216f); }
            float ph = 0f, ph2 = 0f, lp = 0f;
            float f0 = 620f + Rnd() * 280f;
            float f1 = 140f + Rnd() * 80f;
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)sr;
                float u = t / dur;
                float env = Mathf.Sin(Mathf.PI * Mathf.Clamp01(u / 0.12f)) * Mathf.Pow(1f - u, 0.55f);
                float hz = Mathf.Lerp(f0, f1, Mathf.Pow(u, 0.62f));
                ph += hz / sr;
                ph2 += hz * 1.51f / sr;
                float raw = Rnd() * 2f - 1f;
                lp = Mathf.Lerp(lp, raw, 0.08f);
                float vox = Mathf.Sin(ph * 2f * Mathf.PI) + 0.35f * Mathf.Sin(ph2 * 2f * Mathf.PI);
                float grit = Mathf.Sign(vox) * Mathf.Pow(Mathf.Min(1f, Mathf.Abs(vox) * 1.4f), 0.65f);
                data[i] = Mathf.Clamp((grit * 0.7f + lp * 0.35f) * env * 0.8f, -1f, 1f);
            }
            var c = AudioClip.Create("nkMonkeyWail", n, 1, sr, false);
            c.SetData(data, 0);
            return c;
        }

        static AudioClip Noise(float dur, float low, float vol)
        {
            const int sr = 22050;
            int n = Mathf.Max(64, (int)(sr * dur));
            var data = new float[n];
            float lp = 0f;
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)sr;
                float env = Mathf.Sin(Mathf.PI * Mathf.Clamp01(t / dur));
                float raw = Random.value * 2f - 1f;
                lp = Mathf.Lerp(lp, raw, Mathf.Clamp01(low / 800f));
                float buzz = Mathf.Sin(2f * Mathf.PI * low * t) * 0.25f;
                data[i] = (lp + buzz) * env * vol;
            }
            var c = AudioClip.Create("nkN" + (int)low, n, 1, sr, false);
            c.SetData(data, 0);
            return c;
        }
    }
}
