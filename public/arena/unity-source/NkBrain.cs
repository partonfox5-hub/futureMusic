using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace NetKnight
{
    [Serializable]
    public class NkSession
    {
        public float duration;
        public float avgSpeed;
        public float avgAltitude;
        public float attackInterval;
        public int pulses;
        public int psyShots;
        public int hitsLanded;
        public int hitsTaken;
        public int crystals;
        public float verticalRatio;
        public bool survived;
        public string ended;
    }

    [Serializable]
    public class NkHi
    {
        public float score;
        public float time;
        public string at;
    }

    [Serializable]
    public class NkMemory
    {
        public List<NkSession> sessions = new List<NkSession>();
        public List<NkHi> highs = new List<NkHi>();
    }

    [Serializable]
    public class NkLive
    {
        public float speedAcc, altAcc, vertAcc, atkGapAcc;
        public int samples, atkN, pulses, psy, hitsLanded, hitsTaken, crystals;
        public float lastAtk;
        public void Sample(Vector3 vel, float altFromCenter)
        {
            samples++;
            speedAcc += vel.magnitude;
            altAcc += altFromCenter;
            vertAcc += Mathf.Abs(vel.y);
        }
        public void Attack()
        {
            if (lastAtk > 0) { atkGapAcc += Time.time - lastAtk; atkN++; }
            lastAtk = Time.time;
        }
        public NkSession Seal(float duration, bool survived, string ended)
        {
            int n = Mathf.Max(1, samples);
            return new NkSession
            {
                duration = duration,
                avgSpeed = speedAcc / n,
                avgAltitude = altAcc / n,
                attackInterval = atkN > 0 ? atkGapAcc / atkN : 1.2f,
                pulses = pulses,
                psyShots = psy,
                hitsLanded = hitsLanded,
                hitsTaken = hitsTaken,
                crystals = crystals,
                verticalRatio = speedAcc > 0.01f ? vertAcc / speedAcc : 0.3f,
                survived = survived,
                ended = ended
            };
        }
    }

    public static class NkBrain
    {
        const string FileName = "netknight-memory.json";
        public static NkMemory Memory = new NkMemory();

        static string Path => System.IO.Path.Combine(Application.persistentDataPath, FileName);

        public static void Load()
        {
            try
            {
                if (File.Exists(Path))
                    Memory = JsonUtility.FromJson<NkMemory>(File.ReadAllText(Path)) ?? new NkMemory();
            }
            catch { Memory = new NkMemory(); }
            if (Memory.sessions == null) Memory.sessions = new List<NkSession>();
            if (Memory.highs == null) Memory.highs = new List<NkHi>();
        }

        public static void SubmitScore(float score, float time)
        {
            Load();
            Memory.highs.Add(new NkHi { score = score, time = time, at = DateTime.Now.ToString("MM/dd") });
            Memory.highs.Sort((a, b) => b.score.CompareTo(a.score));
            if (Memory.highs.Count > 10) Memory.highs.RemoveRange(10, Memory.highs.Count - 10);
            try { File.WriteAllText(Path, JsonUtility.ToJson(Memory, true)); }
            catch { }
        }

        public static string HighScoreText()
        {
            Load();
            if (Memory.highs == null || Memory.highs.Count == 0) return "(none yet)";
            var sb = "";
            int n = Mathf.Min(10, Memory.highs.Count);
            for (int i = 0; i < n; i++)
            {
                var h = Memory.highs[i];
                sb += (i + 1) + ".  " + NkCredit.Money(h.score) + "   " + NkCredit.Clock(h.time) + "\n";
            }
            return sb.TrimEnd();
        }

        public static void SaveSession(NkSession s)
        {
            if (s == null) return;
            Load();
            Memory.sessions.Add(s);
            if (Memory.sessions.Count > 80) Memory.sessions.RemoveRange(0, Memory.sessions.Count - 80);
            try { File.WriteAllText(Path, JsonUtility.ToJson(Memory, true)); }
            catch (Exception e) { Debug.LogWarning("NetKnight memory save failed: " + e.Message); }
        }

        public static float Avg(Func<NkSession, float> pick, float fallback)
        {
            if (Memory?.sessions == null || Memory.sessions.Count == 0) return fallback;
            float a = 0; int n = 0;
            foreach (var s in Memory.sessions) { a += pick(s); n++; }
            return n > 0 ? a / n : fallback;
        }

        public static void ApplyToKnight(NkDarkKnight k)
        {
            if (k == null) return;
            float speed = Avg(s => s.avgSpeed, 4f);
            float atk = Avg(s => s.attackInterval, 1.1f);
            float vert = Avg(s => s.verticalRatio, 0.35f);
            float pulses = Avg(s => s.pulses, 2f);
            k.learnAgro = Mathf.Clamp(speed / 5f, 0.7f, 1.6f);
            k.learnStrikeGap = Mathf.Clamp(atk * 0.85f, 0.35f, 1.8f);
            k.learnVertical = Mathf.Clamp(vert * 1.4f, 0.2f, 1.4f);
            k.learnRespectPulse = Mathf.Clamp01(pulses / 8f);
        }
    }
}
