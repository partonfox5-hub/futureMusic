using System;
using System.IO;
using UnityEngine;

namespace NetKnight
{
    [Serializable]
    public class NkSaveData
    {
        public int energy, maxEnergy, coins, missiles, hearts, maxHearts;
        public float score, goldT, t;
        public float px, py, pz, kx, ky, kz, kHp;
        public bool white, muteBgm, muteSfx;
        public float jetMul, pulseMul, moveMul;
    }

    public static class NkSave
    {
        static string FilePath => Path.Combine(Application.persistentDataPath, "netknight-save.json");
        public static bool Has => File.Exists(FilePath);

        public static void Write(NetKnightGame g)
        {
            if (g == null) return;
            var d = new NkSaveData
            {
                energy = g.energy, maxEnergy = g.maxEnergy, coins = g.coins, missiles = g.missiles,
                hearts = g.playerHearts, maxHearts = g.playerMaxHearts,
                score = g.score, goldT = g.goldT, t = Time.timeSinceLevelLoad,
                jetMul = g.jetMul, pulseMul = g.pulseMul, moveMul = g.moveMul,
                muteBgm = NkBgm.Mute, muteSfx = NkSfx.Mute
            };
            if (g.player)
            {
                var p = g.player.transform.position;
                d.px = p.x; d.py = p.y; d.pz = p.z;
            }
            if (g.knight)
            {
                var p = g.knight.transform.position;
                d.kx = p.x; d.ky = p.y; d.kz = p.z;
                d.kHp = g.knight.hearts;
                d.white = g.knight.white;
            }
            try { File.WriteAllText(FilePath, JsonUtility.ToJson(d, true)); }
            catch (Exception e) { Debug.LogWarning(e.Message); }
        }

        public static bool Read(NetKnightGame g)
        {
            if (g == null || !Has) return false;
            NkSaveData d;
            try { d = JsonUtility.FromJson<NkSaveData>(File.ReadAllText(FilePath)); }
            catch { return false; }
            if (d == null) return false;
            g.energy = d.energy; g.maxEnergy = Mathf.Max(1, d.maxEnergy);
            g.coins = d.coins; g.missiles = d.missiles;
            g.playerHearts = d.hearts; g.playerMaxHearts = Mathf.Max(1, d.maxHearts);
            g.score = d.score; g.goldT = d.goldT;
            g.jetMul = d.jetMul > 0.1f ? d.jetMul : 1f;
            g.pulseMul = d.pulseMul > 0.1f ? d.pulseMul : 1f;
            g.moveMul = d.moveMul > 0.1f ? d.moveMul : 1f;
            NkBgm.Mute = d.muteBgm;
            NkSfx.Mute = d.muteSfx;
            if (g.player)
            {
                var p = new Vector3(d.px, d.py, d.pz);
                if (p.sqrMagnitude > 0.01f)
                {
                    g.player.transform.position = p;
                    if (g.player.body) { g.player.body.position = p; g.player.body.linearVelocity = Vector3.zero; }
                }
            }
            if (g.knight)
            {
                var p = new Vector3(d.kx, d.ky, d.kz);
                if (p.sqrMagnitude > 0.01f)
                {
                    g.knight.transform.position = p;
                    var rb = g.knight.GetComponent<Rigidbody>();
                    if (rb) { rb.position = p; rb.linearVelocity = Vector3.zero; }
                }
                if (d.kHp > 0f) g.knight.hearts = d.kHp;
            }
            return true;
        }
    }
}
