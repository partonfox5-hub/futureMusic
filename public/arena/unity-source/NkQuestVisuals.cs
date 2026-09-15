using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.XR;

namespace NetKnight
{
    public static class NkQuestVisuals
    {
        public static bool QuestRuntime => Application.platform == RuntimePlatform.Android;

        public static void Apply(Camera cam)
        {
            Application.targetFrameRate = 72;
            QualitySettings.vSyncCount = 0;
            QualitySettings.antiAliasing = QuestRuntime ? 2 : 2;
            QualitySettings.anisotropicFiltering = AnisotropicFiltering.Enable;
            QualitySettings.shadows = UnityEngine.ShadowQuality.HardOnly;
            QualitySettings.shadowResolution = UnityEngine.ShadowResolution.Low;
            QualitySettings.shadowDistance = 18f;
            QualitySettings.pixelLightCount = 1;
            Texture.SetGlobalAnisotropicFilteringLimits(1, 4);
            if (cam)
            {
                cam.allowHDR = false;
                cam.allowMSAA = true;
                cam.useOcclusionCulling = true;
                cam.farClipPlane = 420f;
                cam.nearClipPlane = 0.05f;
            }
            var urp = GraphicsSettings.currentRenderPipeline as UniversalRenderPipelineAsset;
            if (urp && QuestRuntime)
            {
                try { urp.supportsHDR = false; } catch { }
                try { urp.msaaSampleCount = 2; } catch { }
                try { urp.renderScale = 0.78f; } catch { }
                try { urp.shadowDistance = 18f; } catch { }
                try { urp.mainLightShadowmapResolution = 512; } catch { }
            }
            try { XRSettings.eyeTextureResolutionScale = QuestRuntime ? 0.82f : 1f; }
            catch { }
            var displays = new List<XRDisplaySubsystem>();
            SubsystemManager.GetSubsystems(displays);
            for (int i = 0; i < displays.Count; i++)
            {
                var d = displays[i];
                if (d == null) continue;
                try { d.foveatedRenderingLevel = 1f; }
                catch { }
            }
            try
            {
                var inputs = new List<XRInputSubsystem>();
                SubsystemManager.GetSubsystems(inputs);
                for (int i = 0; i < inputs.Count; i++)
                {
                    var s = inputs[i];
                    if (s != null) s.TrySetTrackingOriginMode(TrackingOriginModeFlags.Floor);
                }
            }
            catch { }
            if (QuestRuntime && cam && !cam.GetComponent<NkFrameGuard>())
                cam.gameObject.AddComponent<NkFrameGuard>();
        }
    }

    public class NkFrameGuard : MonoBehaviour
    {
        float _acc;
        int _frames;
        float _cool;
        int _steps;

        void Update()
        {
            _acc += Time.unscaledDeltaTime;
            _frames++;
            if (_acc < 1.1f) return;
            float fps = _frames / Mathf.Max(0.001f, _acc);
            _acc = 0f;
            _frames = 0;
            if (fps >= 62f || Time.unscaledTime < _cool || _steps >= 3) return;
            _cool = Time.unscaledTime + 3.5f;
            _steps++;
            var urp = GraphicsSettings.currentRenderPipeline as UniversalRenderPipelineAsset;
            if (urp)
            {
                try
                {
                    if (urp.msaaSampleCount > 1) urp.msaaSampleCount = 1;
                    else if (urp.renderScale > 0.64f)
                        urp.renderScale = Mathf.Max(0.64f, urp.renderScale - 0.08f);
                }
                catch { }
            }
            try
            {
                XRSettings.eyeTextureResolutionScale = Mathf.Max(0.7f, XRSettings.eyeTextureResolutionScale - 0.06f);
            }
            catch { }
        }
    }
}
