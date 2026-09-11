using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.XR;

namespace NetKnight
{
    public static class NkQuestVisuals
    {
        public static void Apply(Camera cam)
        {
            Application.targetFrameRate = 72;
            QualitySettings.vSyncCount = 0;
            QualitySettings.anisotropicFiltering = AnisotropicFiltering.ForceEnable;
            QualitySettings.antiAliasing = 4;
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
            Texture.SetGlobalAnisotropicFilteringLimits(8, 16);
            if (cam)
            {
                cam.allowHDR = false;
                cam.allowMSAA = true;
            }
            var urp = GraphicsSettings.currentRenderPipeline as UniversalRenderPipelineAsset;
            if (urp)
            {
                urp.supportsHDR = false;
                urp.msaaSampleCount = 4;
                urp.renderScale = 1f;
            }
            try { XRSettings.eyeTextureResolutionScale = 1f; }
            catch { }
            var displays = new List<XRDisplaySubsystem>();
            SubsystemManager.GetSubsystems(displays);
            for (int i = 0; i < displays.Count; i++)
            {
                var d = displays[i];
                if (d == null) continue;
                try { d.foveatedRenderingLevel = 0f; }
                catch { }
            }
        }
    }
}
