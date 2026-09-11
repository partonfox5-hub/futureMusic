using System.Collections.Generic;
using UnityEngine;
using UnityEngine.XR;
using Gamepad = UnityEngine.InputSystem.Gamepad;
using Keyboard = UnityEngine.InputSystem.Keyboard;
using Mouse = UnityEngine.InputSystem.Mouse;

namespace NetKnight
{
    [System.Serializable]
    public class NkHand
    {
        public bool valid;
        public Vector3 pos;
        public Quaternion rot = Quaternion.identity;
        public bool trigger, grip, primary, secondary, menu, stickClick;
        public bool triggerDown, gripDown, primaryDown, secondaryDown, menuDown, stickClickDown;
        public Vector2 stick;
        public Vector3 dir => rot * Vector3.forward;
        public Vector3 tip => pos + dir * 0.08f;
    }

    public class NkInput : MonoBehaviour
    {
        public NkHand left = new NkHand();
        public NkHand right = new NkHand();
        public bool xrActive, headValid;
        public Vector3 headPos;
        public Quaternion headRot = Quaternion.identity;

        readonly NkHand _pl = new NkHand(), _pr = new NkHand();
        static readonly InputFeatureUsage<Vector3> PointerPos = new InputFeatureUsage<Vector3>("PointerPosition");
        static readonly InputFeatureUsage<Quaternion> PointerRot = new InputFeatureUsage<Quaternion>("PointerRotation");
        static readonly Quaternion GripToAim = Quaternion.Euler(-55f, 0f, 0f);

        public void Poll()
        {
            CopyBtns(_pl, left); CopyBtns(_pr, right);
            bool xrOn = XRSettings.isDeviceActive;
            if (xrOn)
            {
                Read(XRNode.LeftHand, left);
                Read(XRNode.RightHand, right);
                var hmd = UnityEngine.XR.InputDevices.GetDeviceAtXRNode(XRNode.CenterEye);
                if (!hmd.isValid) hmd = UnityEngine.XR.InputDevices.GetDeviceAtXRNode(XRNode.Head);
                headValid = Tracked(hmd)
                            && hmd.TryGetFeatureValue(CommonUsages.devicePosition, out headPos)
                            && hmd.TryGetFeatureValue(CommonUsages.deviceRotation, out headRot);
            }
            else { left.valid = right.valid = headValid = false; }
            xrActive = xrOn && (headValid || left.valid || right.valid);
            Edge(left, _pl); Edge(right, _pr);
        }

        public void DesktopFallback(Transform cam)
        {
            if (xrActive || !cam) return;
            right.valid = left.valid = true;
            right.pos = cam.position + cam.forward * 0.5f + cam.right * 0.14f;
            left.pos = cam.position + cam.forward * 0.5f + cam.right * -0.14f;
            right.rot = left.rot = cam.rotation;
        }

        public static void Rumble(XRNode node, float amp, float dur)
        {
            var d = UnityEngine.XR.InputDevices.GetDeviceAtXRNode(node);
            if (d.isValid) d.SendHapticImpulse(0, Mathf.Clamp01(amp), dur);
        }

        static void CopyBtns(NkHand d, NkHand s)
        {
            d.trigger = s.trigger; d.grip = s.grip; d.primary = s.primary;
            d.secondary = s.secondary; d.menu = s.menu; d.stickClick = s.stickClick;
        }
        static void Edge(NkHand n, NkHand p)
        {
            n.triggerDown = n.trigger && !p.trigger;
            n.gripDown = n.grip && !p.grip;
            n.primaryDown = n.primary && !p.primary;
            n.secondaryDown = n.secondary && !p.secondary;
            n.menuDown = n.menu && !p.menu;
            n.stickClickDown = n.stickClick && !p.stickClick;
        }
        static bool Tracked(UnityEngine.XR.InputDevice dev)
        {
            if (!dev.isValid) return false;
            if (dev.TryGetFeatureValue(CommonUsages.isTracked, out bool tracked)) return tracked;
            if (dev.TryGetFeatureValue(CommonUsages.trackingState, out InputTrackingState st))
                return (st & InputTrackingState.Position) != 0;
            return true;
        }

        public bool PressedMenu()
        {
            if (left.menuDown || right.menuDown) return true;
            var k = Keyboard.current;
            if (k != null && (k.escapeKey.wasPressedThisFrame || k.pKey.wasPressedThisFrame)) return true;
            var pad = Gamepad.current;
            if (pad != null && (pad.startButton.wasPressedThisFrame || pad.selectButton.wasPressedThisFrame)) return true;
            return false;
        }

        public bool PressedB()
        {
            if (right.secondaryDown || left.secondaryDown) return true;
            var k = Keyboard.current;
            if (k != null && (k.bKey.wasPressedThisFrame || k.escapeKey.wasPressedThisFrame)) return true;
            var pad = Gamepad.current;
            if (pad != null && pad.buttonEast.wasPressedThisFrame) return true;
            return false;
        }

        public bool PressedAdvance()
        {
            if (PressedB()) return false;
            if (left.triggerDown || right.triggerDown || left.primaryDown || right.primaryDown
                || left.gripDown || right.gripDown || left.menuDown || right.menuDown
                || left.stickClickDown || right.stickClickDown) return true;
            var k = Keyboard.current;
            if (k != null && k.anyKey.wasPressedThisFrame) return true;
            var m = Mouse.current;
            if (m != null && (m.leftButton.wasPressedThisFrame || m.rightButton.wasPressedThisFrame)) return true;
            var pad = Gamepad.current;
            if (pad != null && (pad.buttonSouth.wasPressedThisFrame || pad.buttonNorth.wasPressedThisFrame
                || pad.buttonWest.wasPressedThisFrame || pad.rightTrigger.wasPressedThisFrame
                || pad.leftTrigger.wasPressedThisFrame || pad.startButton.wasPressedThisFrame)) return true;
            return false;
        }

        public bool PressedAny()
        {
            return PressedB() || PressedAdvance();
        }

        static void Read(XRNode node, NkHand h)
        {
            var dev = UnityEngine.XR.InputDevices.GetDeviceAtXRNode(node);
            h.valid = false;
            if (!dev.isValid) return;
            dev.TryGetFeatureValue(CommonUsages.triggerButton, out h.trigger);
            if (!h.trigger) { float t = 0; if (dev.TryGetFeatureValue(CommonUsages.trigger, out t)) h.trigger = t > 0.45f; }
            dev.TryGetFeatureValue(CommonUsages.gripButton, out h.grip);
            if (!h.grip) { float g = 0; if (dev.TryGetFeatureValue(CommonUsages.grip, out g)) h.grip = g > 0.32f; }
            dev.TryGetFeatureValue(CommonUsages.primaryButton, out h.primary);
            dev.TryGetFeatureValue(CommonUsages.secondaryButton, out h.secondary);
            dev.TryGetFeatureValue(CommonUsages.menuButton, out h.menu);
            dev.TryGetFeatureValue(CommonUsages.primary2DAxis, out h.stick);
            dev.TryGetFeatureValue(CommonUsages.primary2DAxisClick, out h.stickClick);
            if (!Tracked(dev)) return;
            dev.TryGetFeatureValue(CommonUsages.devicePosition, out var gripPos);
            dev.TryGetFeatureValue(CommonUsages.deviceRotation, out var gripRot);
            bool gotAimRot = dev.TryGetFeatureValue(PointerRot, out var aimRot)
                             && aimRot.w * aimRot.w + aimRot.x * aimRot.x + aimRot.y * aimRot.y + aimRot.z * aimRot.z > 0.25f
                             && !(Mathf.Abs(aimRot.w) > 0.999f && Mathf.Abs(aimRot.x) < 0.02f);
            bool gotAimPos = dev.TryGetFeatureValue(PointerPos, out var aimPos) && aimPos.sqrMagnitude > 0.0025f;
            if (gotAimRot && Quaternion.Angle(aimRot, gripRot) > 12f) h.rot = aimRot;
            else h.rot = gripRot * GripToAim;
            Vector3 pos = gotAimPos ? aimPos : gripPos;
            if (pos.sqrMagnitude < 0.0025f) return;
            h.pos = pos;
            h.valid = true;
        }
    }
}
