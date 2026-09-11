using UnityEngine;
using UnityEngine.InputSystem;

namespace NetKnight
{
    public class NkMenu : MonoBehaviour
    {
        Transform _root;
        TextMesh _body;
        int _sel;
        bool _open;
        float _stickLatch;
        readonly string[] _rows = { "RESUME", "SNAP TURN", "MUTE MUSIC", "MUTE SFX", "SAVE GAME", "LOAD GAME" };

        public bool IsOpen => _open;
        public static bool SnapTurn;

        public static NkMenu Attach(GameObject host)
        {
            var m = host.GetComponent<NkMenu>();
            if (!m) m = host.AddComponent<NkMenu>();
            SnapTurn = PlayerPrefs.GetInt("nk.snap", 0) == 1;
            return m;
        }

        public void Tick(NkInput inp, NetKnightGame g, NkPlayer player)
        {
            if (!_open) return;
            Follow(player);
            _stickLatch -= Time.unscaledDeltaTime;
            float sy = inp != null && inp.left.valid ? inp.left.stick.y : 0f;
            if (inp != null && inp.right.valid && Mathf.Abs(inp.right.stick.y) > Mathf.Abs(sy))
                sy = inp.right.stick.y;
            var k = Keyboard.current;
            if (k != null)
            {
                if (k.upArrowKey.wasPressedThisFrame) sy = 1f;
                if (k.downArrowKey.wasPressedThisFrame) sy = -1f;
            }
            if (_stickLatch <= 0f && Mathf.Abs(sy) > 0.55f)
            {
                _sel = (_sel + (sy > 0f ? -1 : 1) + _rows.Length) % _rows.Length;
                _stickLatch = 0.22f;
            }
            bool click = inp != null && (inp.left.triggerDown || inp.right.triggerDown || inp.left.primaryDown || inp.right.primaryDown);
            if (k != null && (k.enterKey.wasPressedThisFrame || k.spaceKey.wasPressedThisFrame)) click = true;
            if (click) Activate(g, player);
            Paint(g);
        }

        public void Toggle(NkPlayer player)
        {
            SetOpen(!_open, player);
        }

        public void SetOpen(bool on, NkPlayer player)
        {
            if (_open == on) return;
            _open = on;
            if (_open && !_root) Build();
            if (_root) _root.gameObject.SetActive(_open);
            Time.timeScale = _open ? 0f : 1f;
            AudioListener.pause = _open;
            if (_open)
            {
                _sel = 0;
                Follow(player);
                if (player && player.body)
                {
                    player.body.linearVelocity = Vector3.zero;
                    player.body.angularVelocity = Vector3.zero;
                }
            }
        }

        void Follow(NkPlayer player)
        {
            if (!_root) return;
            Transform cam = player && player.cam ? player.cam : Camera.main ? Camera.main.transform : null;
            if (!cam) return;
            _root.position = cam.position + cam.forward * 0.72f + cam.up * 0.02f;
            _root.rotation = cam.rotation;
        }

        void Build()
        {
            _root = new GameObject("PauseMenu").transform;
            var card = GameObject.CreatePrimitive(PrimitiveType.Quad);
            Object.DestroyImmediate(card.GetComponent<Collider>());
            card.transform.SetParent(_root, false);
            card.transform.localPosition = new Vector3(0f, 0f, 0.02f);
            card.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            card.transform.localScale = new Vector3(0.58f, 0.42f, 1f);
            card.GetComponent<Renderer>().sharedMaterial = NkGfx.Make(new Color(0.02f, 0.04f, 0.08f, 0.92f), 0.92f, true);
            var tm = new GameObject("body").AddComponent<TextMesh>();
            tm.transform.SetParent(_root, false);
            tm.transform.localPosition = new Vector3(0f, 0.02f, 0f);
            tm.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            tm.anchor = TextAnchor.MiddleCenter;
            tm.alignment = TextAlignment.Left;
            tm.characterSize = 0.0082f;
            tm.fontSize = 42;
            tm.fontStyle = FontStyle.Bold;
            tm.color = new Color(0.7f, 0.95f, 1f);
            NkGfx.FlipText(tm);
            _body = tm;
        }

        void Paint(NetKnightGame g)
        {
            if (!_body || g == null) return;
            string hp = "PAUSED";
            string pw = "HULL  " + g.playerHearts + " / " + g.playerMaxHearts
                        + "   POWER  " + g.energy;
            string s = hp + "\n" + pw + "\nMENU either hand  ·  trigger select\n----------------\n";
            for (int i = 0; i < _rows.Length; i++)
            {
                string mark = i == _sel ? "> " : "  ";
                string extra = "";
                if (i == 1) extra = SnapTurn ? "  [ON]" : "  [OFF]";
                if (i == 2) extra = NkBgm.Mute ? "  [OFF]" : "  [ON]";
                if (i == 3) extra = NkSfx.Mute ? "  [OFF]" : "  [ON]";
                if (i == 5 && !NkSave.Has) extra = "  (none)";
                s += mark + _rows[i] + extra + "\n";
            }
            _body.text = s;
        }

        void Activate(NetKnightGame g, NkPlayer player)
        {
            if (g == null) return;
            switch (_sel)
            {
                case 0:
                    SetOpen(false, player);
                    break;
                case 1:
                    SnapTurn = !SnapTurn;
                    PlayerPrefs.SetInt("nk.snap", SnapTurn ? 1 : 0);
                    PlayerPrefs.Save();
                    g.Hint(SnapTurn ? "Snap turn on — 45° clicks." : "Smooth turn on.");
                    break;
                case 2:
                    NkBgm.Mute = !NkBgm.Mute;
                    g.Hint(NkBgm.Mute ? "Music muted." : "Music on.");
                    break;
                case 3:
                    NkSfx.Mute = !NkSfx.Mute;
                    g.Hint(NkSfx.Mute ? "SFX muted." : "SFX on.");
                    break;
                case 4:
                    NkSave.Write(g);
                    g.Hint("Game saved.");
                    break;
                case 5:
                    if (NkSave.Read(g)) g.Hint("Game loaded.");
                    else g.Hint("No save file.");
                    break;
            }
        }
    }
}
