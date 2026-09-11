using System.Collections.Generic;
using System.IO;
using System.Text;
using UnityEngine;

namespace NetKnight
{
    public static class NkPlayLog
    {
        static readonly List<string> Lines = new List<string>(64);
        static bool _hooked;
        static int _snaps;
        static float _next;
        static bool _goldFlagged;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Boot()
        {
            if (_hooked) return;
            _hooked = true;
            _snaps = 0;
            _next = 0.35f;
            _goldFlagged = false;
            Lines.Clear();
            Application.logMessageReceived += OnLog;
            Add("boot " + Time.realtimeSinceStartup.ToString("0.00") + "s  scene=" + UnityEngine.SceneManagement.SceneManager.GetActiveScene().name);
            Flush();
        }

        static void OnLog(string cond, string stack, LogType type)
        {
            if (type == LogType.Log) return;
            Add(type + ": " + cond);
            if (!string.IsNullOrEmpty(stack) && (type == LogType.Exception || type == LogType.Assert || type == LogType.Error))
                Add(stack);
            Flush();
        }

        public static void Tick(NetKnightGame g)
        {
            if (g == null) return;
            if (g.Gold && Time.timeSinceLevelLoad < 5f && !_goldFlagged)
            {
                _goldFlagged = true;
                Add("ERROR: gold active at t=" + Time.timeSinceLevelLoad.ToString("0.00") + " (should be 0 at boot)");
                Flush();
            }
            if (_snaps >= 2 || Time.timeSinceLevelLoad < _next) return;
            _next = _snaps == 0 ? 1.6f : 99f;
            _snaps++;
            Snap(g);
        }

        static void Snap(NetKnightGame g)
        {
            var sb = new StringBuilder();
            sb.Append("snap t=").Append(Time.timeSinceLevelLoad.ToString("0.00"));
            sb.Append(" goldT=").Append(g.goldT.ToString("0.00"));
            sb.Append(" energy=").Append(g.energy);
            var inp = g.GetComponent<NkInput>();
            if (inp)
            {
                sb.Append(" xr=").Append(inp.xrActive);
                sb.Append(" head=").Append(inp.headValid);
                sb.Append(" L=").Append(inp.left.valid ? inp.left.pos.ToString("F2") : "off");
                sb.Append(" R=").Append(inp.right.valid ? inp.right.pos.ToString("F2") : "off");
            }
            if (g.player && g.player.cam)
                sb.Append(" cam=").Append(g.player.cam.position.ToString("F2"));
            Add(sb.ToString());
            FlushBoot();
            Flush();
        }

        static void Add(string line)
        {
            Lines.Add("[" + Time.timeSinceLevelLoad.ToString("0.00") + "] " + line);
            if (Lines.Count > 400) Lines.RemoveRange(0, Lines.Count - 400);
        }

        static string Root()
        {
            try { return Directory.GetParent(Application.dataPath).FullName; }
            catch { return Application.dataPath; }
        }

        static void Flush()
        {
            try
            {
                string dir = Path.Combine(Root(), "Logs");
                Directory.CreateDirectory(dir);
                File.WriteAllLines(Path.Combine(dir, "nk-play-console.txt"), Lines);
            }
            catch { }
        }

        static void FlushBoot()
        {
            try
            {
                string dir = Path.Combine(Root(), "Logs");
                Directory.CreateDirectory(dir);
                File.WriteAllLines(Path.Combine(dir, "nk-boot.txt"), Lines);
            }
            catch { }
        }
    }
}
