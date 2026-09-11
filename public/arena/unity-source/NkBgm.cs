using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace NetKnight
{
    public class NkBgm : MonoBehaviour
    {
        public static bool Mute;
        public const float FullVol = 0.10824f;
        static NkBgm _inst;
        AudioSource _src;
        readonly List<AudioClip> _clips = new List<AudioClip>();
        int _i;
        float _vol;

        public static void Attach(GameObject host)
        {
            if (!host.GetComponent<NkBgm>()) host.AddComponent<NkBgm>();
        }

        public static void FadeIn(float seconds)
        {
            if (_inst) _inst.StartCoroutine(_inst.Fade(Mathf.Max(0.05f, seconds)));
        }

        void Awake()
        {
            _inst = this;
            _src = gameObject.AddComponent<AudioSource>();
            _src.playOnAwake = false;
            _src.loop = false;
            _src.spatialBlend = 0f;
            _src.volume = 0f;
            _src.priority = 0;
            _src.ignoreListenerPause = false;
            _src.bypassListenerEffects = true;
            _vol = 0f;
            var seen = new HashSet<string>();
            void Take(AudioClip c)
            {
                if (!c) return;
                string key = c.name.Replace(" (1)", "").Trim();
                if (!seen.Add(key)) return;
                _clips.Add(c);
                if (c.loadState == AudioDataLoadState.Unloaded) c.LoadAudioData();
            }
            foreach (var c in Resources.LoadAll<AudioClip>("NkBgm")) Take(c);
            if (_clips.Count == 0)
                foreach (var c in Resources.LoadAll<AudioClip>("NkSfx")) Take(c);
            if (_clips.Count > 0) StartCoroutine(PlayLoop());
        }

        void OnDestroy()
        {
            if (_inst == this) _inst = null;
        }

        void Update()
        {
            if (!_src) return;
            _src.mute = Mute;
            _src.volume = Mute ? 0f : _vol;
        }

        IEnumerator Fade(float seconds)
        {
            float t = 0f;
            float from = _vol;
            while (t < seconds)
            {
                t += Time.unscaledDeltaTime;
                _vol = Mathf.Lerp(from, FullVol, Mathf.Clamp01(t / seconds));
                yield return null;
            }
            _vol = FullVol;
        }

        IEnumerator PlayLoop()
        {
            while (enabled && _clips.Count > 0)
            {
                var clip = _clips[_i % _clips.Count];
                _i++;
                if (!clip) { yield return null; continue; }
                if (clip.loadState == AudioDataLoadState.Unloaded) clip.LoadAudioData();
                float wait = 2.5f;
                while (clip.loadState == AudioDataLoadState.Loading && wait > 0f)
                {
                    wait -= Time.unscaledDeltaTime;
                    yield return null;
                }
                if (clip.loadState == AudioDataLoadState.Failed) { yield return null; continue; }
                if (!_src) yield break;
                _src.clip = clip;
                _src.Play();
                float arm = 0.6f;
                while (_src && !_src.isPlaying && arm > 0f)
                {
                    arm -= Time.unscaledDeltaTime;
                    yield return null;
                }
                if (!_src) yield break;
                if (!_src.isPlaying)
                {
                    _src.Play();
                    yield return null;
                    if (!_src || !_src.isPlaying) { yield return null; continue; }
                }
                while (_src && (_src.isPlaying || (_src.clip == clip && _src.time > 0f && _src.time < clip.length - 0.05f)))
                    yield return null;
            }
        }
    }
}
