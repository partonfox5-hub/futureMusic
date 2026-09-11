using UnityEngine;

namespace NetKnight
{
    public static class NkTex
    {
        public static Texture2D Banner()
        {
            const int w = 512, h = 64;
            var t = new Texture2D(w, h, TextureFormat.RGB24, true);
            t.wrapMode = TextureWrapMode.Repeat;
            t.filterMode = FilterMode.Trilinear;
            t.anisoLevel = 8;
            t.mipMapBias = -0.4f;
            var neon = new Color(0.15f, 0.95f, 1f);
            var mag = new Color(1f, 0.2f, 0.85f);
            var yel = new Color(1f, 0.85f, 0.15f);
            var bg = new Color(0.05f, 0.02f, 0.12f);
            for (int y = 0; y < h; y++)
                for (int x = 0; x < w; x++)
                {
                    Color c = bg;
                    if (y < 6 || y > h - 7) c = neon;
                    if (y > 10 && y < 18) c = mag;
                    int stripe = (x / 48) % 4;
                    if (y > 22 && y < 50)
                    {
                        c = stripe == 0 ? mag : stripe == 1 ? neon : stripe == 2 ? yel : new Color(0.2f, 1f, 0.4f);
                        int gx = (x % 48) / 6, gy = (y - 24) / 6;
                        if (((gx + gy) & 1) == 0) c *= 0.45f;
                    }
                    t.SetPixel(x, y, c);
                }
            Stamp(t, "WWW  MAIL  CHAT  DOWNLOAD  CONNECT", 12, 28, Color.black);
            t.Apply(true, false);
            return t;
        }

        public static Texture2D Crop()
        {
            const int s = 256;
            var t = new Texture2D(s, s, TextureFormat.RGBA32, false);
            t.filterMode = FilterMode.Bilinear;
            var clear = new Color(0, 0, 0, 0);
            var g = new Color(0.55f, 1f, 0.35f, 0.9f);
            for (int y = 0; y < s; y++)
                for (int x = 0; x < s; x++)
                {
                    float dx = x - 128, dy = y - 128;
                    float d = Mathf.Sqrt(dx * dx + dy * dy);
                    float a = Mathf.Atan2(dy, dx);
                    Color c = clear;
                    if (Mathf.Abs(d - 110) < 4 || Mathf.Abs(d - 70) < 3 || Mathf.Abs(d - 36) < 3) c = g;
                    if (d < 12) c = g;
                    for (int k = 0; k < 8; k++)
                    {
                        float ang = k / 8f * Mathf.PI * 2f;
                        float px = Mathf.Cos(ang) * 70, py = Mathf.Sin(ang) * 70;
                        if ((dx - px) * (dx - px) + (dy - py) * (dy - py) < 64) c = g;
                    }
                    if (Mathf.Abs(Mathf.Repeat(a, 1.047f) - 0.52f) < 0.04f && d > 36 && d < 110) c = g;
                    t.SetPixel(x, y, c);
                }
            t.Apply(false, false);
            return t;
        }

        public static Texture2D Emoji(int seed)
        {
            const int s = 64;
            var t = new Texture2D(s, s, TextureFormat.RGBA32, false);
            t.filterMode = FilterMode.Point;
            var clear = new Color(0, 0, 0, 0);
            var face = seed % 3 == 0 ? new Color(1f, 0.85f, 0.15f) : seed % 3 == 1 ? new Color(1f, 0.45f, 0.7f) : new Color(0.4f, 0.9f, 1f);
            var ink = Color.black;
            for (int y = 0; y < s; y++)
                for (int x = 0; x < s; x++)
                {
                    float dx = x - 32, dy = y - 32;
                    float d = Mathf.Sqrt(dx * dx + dy * dy);
                    Color c = d < 28 ? face : clear;
                    t.SetPixel(x, y, c);
                }
            void Dot(int cx, int cy, int r, Color c)
            {
                for (int y = cy - r; y <= cy + r; y++)
                    for (int x = cx - r; x <= cx + r; x++)
                        if (x >= 0 && y >= 0 && x < s && y < s && (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r)
                            t.SetPixel(x, y, c);
            }
            Dot(22, 38, 4, ink);
            if (seed % 2 == 0) Dot(42, 38, 4, ink);
            else for (int x = 36; x < 48; x++) t.SetPixel(x, 38, ink);
            for (int a = 20; a <= 160; a += 6)
            {
                float r = a * Mathf.Deg2Rad;
                int x = 32 + Mathf.RoundToInt(Mathf.Cos(r) * 10);
                int y = 22 - Mathf.RoundToInt(Mathf.Sin(r) * 7);
                Dot(x, y, 2, ink);
            }
            t.Apply(false, false);
            return t;
        }

        public static Texture2D Circuit()
        {
            const int s = 256;
            var t = new Texture2D(s, s, TextureFormat.RGB24, true);
            t.wrapMode = TextureWrapMode.Repeat;
            t.filterMode = FilterMode.Trilinear;
            t.anisoLevel = 8;
            var baseC = new Color(0.55f, 0.62f, 0.7f);
            var line = new Color(0.15f, 0.95f, 1f);
            var pad = new Color(0.95f, 0.75f, 0.2f);
            for (int y = 0; y < s; y++)
                for (int x = 0; x < s; x++)
                {
                    Color c = baseC;
                    if (x % 32 < 2 || y % 32 < 2) c = line * 0.55f;
                    if (x % 32 < 2 && y % 16 < 8) c = line;
                    if (y % 32 < 2 && x % 16 < 8) c = line;
                    int cx = x % 32 - 16, cy = y % 32 - 16;
                    if (cx * cx + cy * cy < 18) c = pad;
                    t.SetPixel(x, y, c);
                }
            t.Apply(true, false);
            return t;
        }

        public static Texture2D Wall() => WallVariant(0);

        public static Texture2D WallVariant(int kind)
        {
            const int s = 256;
            var t = new Texture2D(s, s, TextureFormat.RGB24, true);
            t.wrapMode = TextureWrapMode.Repeat;
            t.anisoLevel = 8;
            t.filterMode = FilterMode.Trilinear;
            t.mipMapBias = -0.55f;
            kind = Mathf.Abs(kind) % 12;
            for (int y = 0; y < s; y++)
                for (int x = 0; x < s; x++)
                {
                    Color c;
                    if (kind == 0)
                    {
                        var a = new Color(0.07f, 0.06f, 0.14f);
                        var b = new Color(0.12f, 0.09f, 0.2f);
                        c = ((x / 32 + y / 32) & 1) == 0 ? a : b;
                        if (x % 32 == 0 || y % 32 == 0) c = Color.Lerp(c, new Color(0.35f, 0.95f, 1f), 0.22f);
                    }
                    else if (kind == 1)
                    {
                        float n = Mathf.PerlinNoise(x * 0.04f, y * 0.04f);
                        c = Color.Lerp(new Color(0.16f, 0.12f, 0.1f), new Color(0.38f, 0.22f, 0.14f), n);
                        if (x % 48 < 3 || y % 24 < 2) c = new Color(0.45f, 0.28f, 0.16f);
                    }
                    else if (kind == 2)
                    {
                        c = new Color(0.08f, 0.14f, 0.12f);
                        if (x % 16 < 2 || y % 16 < 2) c = new Color(0.15f, 0.85f, 0.55f) * 0.55f;
                        if ((x + y) % 32 < 2) c = new Color(0.2f, 1f, 0.7f);
                    }
                    else if (kind == 3)
                    {
                        float n = Mathf.PerlinNoise(x * 0.02f + 3f, y * 0.02f);
                        c = Color.Lerp(new Color(0.04f, 0.05f, 0.12f), new Color(0.12f, 0.18f, 0.38f), n);
                        if (((x / 8) * 13 + (y / 8) * 7) % 11 == 0) c = new Color(0.95f, 0.92f, 0.7f);
                    }
                    else if (kind == 4)
                    {
                        c = new Color(0.22f, 0.24f, 0.26f);
                        if (x % 64 < 4 || y % 64 < 4) c = new Color(0.08f, 0.08f, 0.09f);
                        if ((x % 64 - 32) * (x % 64 - 32) + (y % 64 - 32) * (y % 64 - 32) < 40)
                            c = new Color(0.9f, 0.55f, 0.12f);
                    }
                    else if (kind == 5)
                    {
                        c = ((x / 16) & 1) == ((y / 16) & 1)
                            ? new Color(0.12f, 0.04f, 0.16f)
                            : new Color(0.28f, 0.08f, 0.32f);
                        if (y % 8 == 0) c *= 0.7f;
                    }
                    else if (kind == 6)
                    {
                        float hx = x / 18f, hy = y / 16f;
                        int row = Mathf.FloorToInt(hy);
                        float ox = (row & 1) * 0.5f;
                        int col = Mathf.FloorToInt(hx + ox);
                        float lx = (hx + ox) - col, ly = hy - row;
                        bool hex = ly > 0.12f && ly < 0.88f && lx > 0.12f && lx < 0.88f;
                        c = hex ? new Color(0.1f, 0.16f, 0.2f) : new Color(0.04f, 0.7f, 0.85f);
                        if ((col + row) % 5 == 0 && hex) c = new Color(0.18f, 0.28f, 0.22f);
                    }
                    else if (kind == 7)
                    {
                        float n = Mathf.PerlinNoise(x * 0.03f, y * 0.01f);
                        c = Color.Lerp(new Color(0.05f, 0.07f, 0.1f), new Color(0.12f, 0.22f, 0.2f), n);
                        if (y % 4 == 0) c *= 0.55f;
                        if (x % 40 < 2) c = new Color(0.2f, 1f, 0.45f) * 0.55f;
                        if ((x + y * 3) % 90 < 3) c = new Color(1f, 0.35f, 0.7f) * 0.5f;
                    }
                    else if (kind == 8)
                    {
                        int band = ((x + y) / 18) & 1;
                        c = band == 0 ? new Color(0.85f, 0.62f, 0.08f) : new Color(0.08f, 0.08f, 0.08f);
                        if (x % 64 < 5 || y % 64 < 5) c = new Color(0.18f, 0.18f, 0.2f);
                    }
                    else if (kind == 9)
                    {
                        float n = Mathf.PerlinNoise(x * 0.08f, y * 0.08f);
                        c = Color.Lerp(new Color(0.08f, 0.08f, 0.09f), new Color(0.2f, 0.2f, 0.22f), n);
                        if ((x + y) % 6 == 0) c *= 0.7f;
                        if (x % 8 == 0) c = Color.Lerp(c, new Color(0.35f, 0.35f, 0.38f), 0.4f);
                    }
                    else if (kind == 10)
                    {
                        float n = Mathf.PerlinNoise(x * 0.05f + 9f, y * 0.05f);
                        c = Color.Lerp(new Color(0.06f, 0.14f, 0.22f), new Color(0.45f, 0.85f, 1f), n);
                        if (n > 0.72f) c = new Color(0.9f, 0.98f, 1f);
                        if (x % 32 == 0 || y % 32 == 0) c = Color.Lerp(c, new Color(0.2f, 0.55f, 0.9f), 0.35f);
                    }
                    else
                    {
                        float n = Mathf.PerlinNoise(x * 0.06f, y * 0.06f);
                        c = Color.Lerp(new Color(0.12f, 0.1f, 0.08f), new Color(0.28f, 0.18f, 0.12f), n);
                        int h = (x * 17 + y * 29) & 255;
                        if (h < 10) c = new Color(1f, 0.2f, 0.55f);
                        else if (h < 16) c = new Color(0.2f, 1f, 0.4f);
                        else if (h < 20) c = new Color(0.2f, 0.7f, 1f);
                        if (y % 14 == 0) c *= 0.65f;
                    }
                    t.SetPixel(x, y, c);
                }
            t.Apply(true, false);
            return t;
        }

        public static Texture2D TickerStrip(int seed = 0)
        {
            const int w = 1024, h = 64;
            var t = new Texture2D(w, h, TextureFormat.RGBA32, false);
            t.wrapMode = TextureWrapMode.Repeat;
            t.filterMode = FilterMode.Point;
            var bg = new Color(0.015f, 0.02f, 0.05f, 1f);
            var neon = new Color(0.25f, 1f, 0.55f, 1f);
            var mag = new Color(1f, 0.35f, 0.85f, 1f);
            var yel = new Color(1f, 0.92f, 0.25f, 1f);
            var ice = new Color(0.45f, 0.9f, 1f, 1f);
            string[] words =
            {
                "NULL", "GLITCH", "HTTP", "SPAM", "LOL", "ROOT", "PING", "PACK", "WORM", "BYTE",
                "MEGA", "VOID", "AUTO", "SYNC", "LOAD", "BOOT", "HACK", "NODE", "CORE", "DISK",
                "MAIL", "CHAT", "WIFI", "BOMB", "WAVE", "ECHO", "GRID", "FLUX", "NOVA", "BYTE"
            };
            for (int y = 0; y < h; y++)
            {
                Color row = y < 3 || y > h - 4 ? neon * 0.55f : bg;
                if (y == 1 || y == h - 2) row = mag;
                for (int x = 0; x < w; x++)
                    t.SetPixel(x, y, row);
            }
            int x0 = 6;
            int n = 0;
            int rng = seed * 1103515245 + 12345;
            int Next() { rng = rng * 1664525 + 1013904223; return rng; }
            while (x0 < w - 28 && n < 80)
            {
                n++;
                int pick = Mathf.Abs(Next()) % 6;
                if (pick == 0)
                {
                    int bits = 10 + Mathf.Abs(Next()) % 14;
                    var col = (n & 1) == 0 ? neon : ice;
                    for (int i = 0; i < bits && x0 < w - 12; i++)
                    {
                        bool one = (Next() & 1) == 1;
                        Glyph(t, one ? '1' : '0', x0, 18, col, 2);
                        x0 += 12;
                    }
                    x0 += 10;
                }
                else if (pick == 1 || pick == 4)
                {
                    string wds = words[Mathf.Abs(Next()) % words.Length];
                    if ((Next() & 3) == 0) wds = Gibber(Next());
                    GlyphStr(t, wds, x0, 16, pick == 1 ? mag : yel, 2);
                    x0 += wds.Length * 12 + 16;
                }
                else if (pick == 2)
                {
                    BlitEmoji(t, x0, 12, n + seed);
                    x0 += 42;
                }
                else
                {
                    string mix = words[Mathf.Abs(Next()) % words.Length] + ((Next() & 1) == 0 ? " 101" : " 010");
                    GlyphStr(t, mix, x0, 16, ice, 2);
                    x0 += mix.Length * 12 + 14;
                }
            }
            t.Apply(false, false);
            return t;
        }

        static string Gibber(int seed)
        {
            const string a = "BCDFGHKLMNPRSTVWZ";
            const string e = "AEIOU";
            int n = 3 + Mathf.Abs(seed) % 3;
            var cs = new char[n];
            int s = seed;
            for (int i = 0; i < n; i++)
            {
                s = s * 1103515245 + 12345;
                cs[i] = (i & 1) == 0 ? a[Mathf.Abs(s) % a.Length] : e[Mathf.Abs(s) % e.Length];
            }
            return new string(cs);
        }

        static void BlitEmoji(Texture2D t, int x0, int y0, int seed)
        {
            int kind = Mathf.Abs(seed) % 5;
            if (kind == 0)
            {
                var e = Emoji(seed);
                for (int yy = 0; yy < 32 && y0 + yy < t.height; yy++)
                    for (int xx = 0; xx < 32 && x0 + xx < t.width; xx++)
                    {
                        var c = e.GetPixel(xx * 2, yy * 2);
                        if (c.a > 0.4f) t.SetPixel(x0 + xx, y0 + yy, c);
                    }
                return;
            }
            var fill = kind == 1 ? new Color(1f, 0.2f, 0.35f) : kind == 2 ? new Color(1f, 0.85f, 0.15f)
                : kind == 3 ? new Color(0.85f, 0.9f, 1f) : new Color(0.4f, 1f, 0.45f);
            int cx = x0 + 16, cy = y0 + 16;
            for (int y = -14; y <= 14; y++)
                for (int x = -14; x <= 14; x++)
                {
                    int px = cx + x, py = cy + y;
                    if ((uint)px >= (uint)t.width || (uint)py >= (uint)t.height) continue;
                    if (kind == 1)
                    {
                        float a = (x * x + (y - 4) * (y - 4) * 0.7f);
                        float b = ((x - 6) * (x - 6) + (y + 6) * (y + 6));
                        float c = ((x + 6) * (x + 6) + (y + 6) * (y + 6));
                        if (a < 80 || b < 36 || c < 36) t.SetPixel(px, py, fill);
                    }
                    else if (kind == 2)
                    {
                        int ax = Mathf.Abs(x), ay = Mathf.Abs(y);
                        if (ax + ay < 14 && ax * ay < 40) t.SetPixel(px, py, fill);
                    }
                    else if (kind == 3)
                    {
                        float d = Mathf.Sqrt(x * x + y * y);
                        if (d < 13 && d > 8) t.SetPixel(px, py, fill);
                        if (d < 4) t.SetPixel(px, py, fill);
                    }
                    else
                    {
                        if (x * x + y * y < 160) t.SetPixel(px, py, fill);
                        if (x * x + (y + 4) * (y + 4) < 18) t.SetPixel(px, py, Color.black);
                    }
                }
        }

        static ulong GlyphBits(char ch)
        {
            ch = char.ToUpperInvariant(ch);
            switch (ch)
            {
                case '0': return Pack(14, 17, 19, 21, 25, 17, 14);
                case '1': return Pack(4, 12, 4, 4, 4, 4, 14);
                case '2': return Pack(14, 17, 1, 2, 4, 8, 31);
                case '3': return Pack(14, 17, 1, 6, 1, 17, 14);
                case '4': return Pack(2, 6, 10, 18, 31, 2, 2);
                case '5': return Pack(31, 16, 30, 1, 1, 17, 14);
                case '6': return Pack(14, 16, 16, 30, 17, 17, 14);
                case '7': return Pack(31, 1, 2, 4, 8, 8, 8);
                case '8': return Pack(14, 17, 17, 14, 17, 17, 14);
                case '9': return Pack(14, 17, 17, 15, 1, 1, 14);
                case 'A': return Pack(14, 17, 17, 31, 17, 17, 17);
                case 'B': return Pack(30, 17, 17, 30, 17, 17, 30);
                case 'C': return Pack(14, 17, 16, 16, 16, 17, 14);
                case 'D': return Pack(30, 17, 17, 17, 17, 17, 30);
                case 'E': return Pack(31, 16, 16, 30, 16, 16, 31);
                case 'F': return Pack(31, 16, 16, 30, 16, 16, 16);
                case 'G': return Pack(14, 17, 16, 19, 17, 17, 14);
                case 'H': return Pack(17, 17, 17, 31, 17, 17, 17);
                case 'I': return Pack(14, 4, 4, 4, 4, 4, 14);
                case 'J': return Pack(1, 1, 1, 1, 17, 17, 14);
                case 'K': return Pack(17, 18, 20, 24, 20, 18, 17);
                case 'L': return Pack(16, 16, 16, 16, 16, 16, 31);
                case 'M': return Pack(17, 27, 21, 21, 17, 17, 17);
                case 'N': return Pack(17, 25, 21, 19, 17, 17, 17);
                case 'O': return Pack(14, 17, 17, 17, 17, 17, 14);
                case 'P': return Pack(30, 17, 17, 30, 16, 16, 16);
                case 'Q': return Pack(14, 17, 17, 17, 21, 18, 13);
                case 'R': return Pack(30, 17, 17, 30, 20, 18, 17);
                case 'S': return Pack(14, 17, 16, 14, 1, 17, 14);
                case 'T': return Pack(31, 4, 4, 4, 4, 4, 4);
                case 'U': return Pack(17, 17, 17, 17, 17, 17, 14);
                case 'V': return Pack(17, 17, 17, 17, 17, 10, 4);
                case 'W': return Pack(17, 17, 17, 21, 21, 21, 10);
                case 'X': return Pack(17, 17, 10, 4, 10, 17, 17);
                case 'Y': return Pack(17, 17, 10, 4, 4, 4, 4);
                case 'Z': return Pack(31, 1, 2, 4, 8, 16, 31);
                default: return 0;
            }
        }

        static ulong Pack(byte a, byte b, byte c, byte d, byte e, byte f, byte g)
        {
            return a | ((ulong)b << 5) | ((ulong)c << 10) | ((ulong)d << 15) | ((ulong)e << 20) | ((ulong)f << 25) | ((ulong)g << 30);
        }

        static void Glyph(Texture2D t, char ch, int x, int y, Color col, int scale)
        {
            ulong bits = GlyphBits(ch);
            if (bits == 0) return;
            for (int row = 0; row < 7; row++)
            {
                int line = (int)((bits >> (row * 5)) & 31);
                for (int cx = 0; cx < 5; cx++)
                {
                    if ((line & (16 >> cx)) == 0) continue;
                    for (int sy = 0; sy < scale; sy++)
                        for (int sx = 0; sx < scale; sx++)
                        {
                            int px = x + cx * scale + sx, py = y + row * scale + sy;
                            if ((uint)px < (uint)t.width && (uint)py < (uint)t.height)
                                t.SetPixel(px, py, col);
                        }
                }
            }
        }

        static void GlyphStr(Texture2D t, string s, int x, int y, Color col, int scale)
        {
            if (string.IsNullOrEmpty(s)) return;
            for (int i = 0; i < s.Length; i++)
            {
                if (s[i] != ' ') Glyph(t, s[i], x, y, col, scale);
                x += 6 * scale;
            }
        }

        public static Texture2D BsodLcd()
        {
            const int s = 256;
            var t = new Texture2D(s, s, TextureFormat.RGB24, false);
            t.wrapMode = TextureWrapMode.Repeat;
            t.filterMode = FilterMode.Point;
            var blue = new Color(0.0f, 0.09f, 0.62f);
            var blue2 = new Color(0.0f, 0.22f, 0.72f);
            var white = new Color(0.92f, 0.95f, 1f);
            var grey = new Color(0.18f, 0.22f, 0.28f);
            for (int y = 0; y < s; y++)
                for (int x = 0; x < s; x++)
                {
                    int cx = x / 8, cy = y / 8;
                    Color c = ((cx + cy) & 1) == 0 ? blue : blue2;
                    if (y % 8 == 0) c *= 0.55f;
                    if (x % 8 == 7) c = Color.Lerp(c, grey, 0.35f);
                    int h = (x * 13 + y * 29 + cx * 7) & 255;
                    if (h < 6) c = Color.black;
                    else if (h < 9) c = new Color(0.85f, 0.05f, 0.05f);
                    else if (h < 12) c = new Color(0.05f, 0.9f, 0.08f);
                    else if (h < 14) c = new Color(0.15f, 0.25f, 1f);
                    if (cy == 8 && cx >= 4 && cx <= 27) c = white;
                    if (cy == 10 && cx >= 6 && cx <= 22) c = white * 0.85f;
                    if (cy == 14 && cx >= 5 && cx <= 18) c = white * 0.7f;
                    t.SetPixel(x, y, c);
                }
            Stamp(t, "FATAL  STOP  0xDEADPIXEL", 18, 70, Color.black);
            Stamp(t, "LCD  DUMP  OUTSIDE  WORLD", 18, 50, Color.black);
            t.Apply(false, false);
            return t;
        }

        public static Texture2D Planks()
        {
            const int s = 128;
            var t = new Texture2D(s, s, TextureFormat.RGB24, false);
            t.wrapMode = TextureWrapMode.Repeat;
            t.filterMode = FilterMode.Bilinear;
            for (int y = 0; y < s; y++)
                for (int x = 0; x < s; x++)
                {
                    int plank = y / 16;
                    float n = ((x * 13 + y * 7 + plank * 31) & 255) / 255f;
                    Color c = Color.Lerp(new Color(0.42f, 0.24f, 0.1f), new Color(0.7f, 0.48f, 0.22f), n);
                    if (y % 16 == 0 || y % 16 == 15) c *= 0.45f;
                    if (x % 42 < 2) c *= 0.55f;
                    t.SetPixel(x, y, c);
                }
            t.Apply(false, false);
            return t;
        }

        public static Texture2D HydraPoster(Color body)
        {
            const int s = 128;
            var t = new Texture2D(s, s, TextureFormat.RGB24, false);
            t.filterMode = FilterMode.Bilinear;
            var bg = new Color(0.12f, 0.1f, 0.08f);
            var ink = Color.black;
            for (int y = 0; y < s; y++)
                for (int x = 0; x < s; x++)
                {
                    float dx = (x - 64) / 64f, dy = (y - 58) / 64f;
                    Color c = bg;
                    float head = dx * dx * 1.4f + (dy - 0.05f) * (dy - 0.05f);
                    if (head < 0.28f) c = body;
                    float sn = (dx) * (dx) * 2.2f + (dy + 0.22f) * (dy + 0.22f) * 1.1f;
                    if (sn < 0.12f) c = Color.Lerp(body, Color.white, 0.15f);
                    if (dy > 0.22f && Mathf.Abs(dx) < 0.18f && dy < 0.48f) c = body;
                    float e1 = (dx + 0.14f) * (dx + 0.14f) + (dy - 0.08f) * (dy - 0.08f);
                    float e2 = (dx - 0.14f) * (dx - 0.14f) + (dy - 0.08f) * (dy - 0.08f);
                    if (e1 < 0.012f || e2 < 0.012f) c = Color.yellow;
                    if (e1 < 0.004f || e2 < 0.004f) c = ink;
                    t.SetPixel(x, y, c);
                }
            t.Apply(false, false);
            return t;
        }

        public static Texture2D Disc(Color tint)
        {
            const int s = 64;
            var t = new Texture2D(s, s, TextureFormat.RGBA32, false);
            t.filterMode = FilterMode.Bilinear;
            t.wrapMode = TextureWrapMode.Clamp;
            float c = (s - 1) * 0.5f;
            for (int y = 0; y < s; y++)
                for (int x = 0; x < s; x++)
                {
                    float dx = x - c, dy = y - c;
                    float d = Mathf.Sqrt(dx * dx + dy * dy) / (c * 0.92f);
                    float a = Mathf.Clamp01(1f - (d - 0.82f) / 0.18f);
                    if (d > 1f) a = 0f;
                    else if (d < 0.72f) a *= 0.35f;
                    var col = tint;
                    col.a = tint.a * a;
                    t.SetPixel(x, y, col);
                }
            t.Apply(false, false);
            return t;
        }

        public static Texture2D MissileIcon()
        {
            const int s = 128;
            var t = new Texture2D(s, s, TextureFormat.RGBA32, false);
            t.filterMode = FilterMode.Bilinear;
            t.wrapMode = TextureWrapMode.Clamp;
            var clear = new Color(0, 0, 0, 0);
            var outline = new Color(0.05f, 0.12f, 0.18f, 1f);
            var body = new Color(0.28f, 0.92f, 1f, 1f);
            var shade = new Color(0.12f, 0.45f, 0.62f, 1f);
            var fin = new Color(1f, 0.42f, 0.12f, 1f);
            var core = new Color(1f, 0.98f, 0.85f, 1f);
            var flame = new Color(1f, 0.55f, 0.1f, 0.95f);
            for (int y = 0; y < s; y++)
                for (int x = 0; x < s; x++)
                    t.SetPixel(x, y, clear);
            void Dot(int x, int y, Color c)
            {
                if ((uint)x < s && (uint)y < s) t.SetPixel(x, y, c);
            }
            for (int y = 0; y < s; y++)
            {
                float u = y / (float)(s - 1);
                int half;
                Color fill;
                if (u > 0.86f)
                {
                    half = Mathf.RoundToInt(4f + (1f - u) * 18f);
                    fill = Color.Lerp(flame, core, (u - 0.86f) / 0.14f);
                }
                else if (u > 0.72f)
                {
                    half = 5;
                    fill = fin;
                }
                else if (u < 0.18f)
                {
                    half = Mathf.Max(1, Mathf.RoundToInt(u / 0.18f * 9f));
                    fill = Color.Lerp(core, body, u / 0.18f);
                }
                else
                {
                    half = 9;
                    fill = body;
                }
                int cx = 64;
                for (int x = cx - half - 2; x <= cx + half + 2; x++)
                {
                    int dx = Mathf.Abs(x - cx);
                    if (dx > half + 2) continue;
                    if (dx > half) Dot(x, s - 1 - y, outline);
                    else
                    {
                        float h = half <= 0 ? 1f : 1f - dx / (float)half;
                        var c = Color.Lerp(shade, fill, 0.35f + 0.65f * h);
                        if (dx <= 2 && u > 0.2f && u < 0.7f) c = Color.Lerp(c, core, 0.45f);
                        Dot(x, s - 1 - y, c);
                    }
                }
                if (u > 0.22f && u < 0.42f)
                {
                    int fw = Mathf.RoundToInt(8f + (0.42f - u) * 40f);
                    for (int k = half + 1; k <= half + fw; k++)
                    {
                        Dot(cx - k, s - 1 - y, k == half + fw ? outline : fin);
                        Dot(cx + k, s - 1 - y, k == half + fw ? outline : fin);
                    }
                }
            }
            t.Apply(false, false);
            return t;
        }

        public static Texture2D Lava()
        {
            const int s = 256;
            var t = new Texture2D(s, s, TextureFormat.RGB24, false);
            t.wrapMode = TextureWrapMode.Repeat;
            t.filterMode = FilterMode.Bilinear;
            var black = new Color(0.08f, 0.02f, 0.01f);
            var red = new Color(0.95f, 0.18f, 0.04f);
            var orange = new Color(1f, 0.45f, 0.05f);
            var yel = new Color(1f, 0.85f, 0.2f);
            for (int y = 0; y < s; y++)
                for (int x = 0; x < s; x++)
                {
                    float n = Mathf.PerlinNoise(x * 0.035f, y * 0.035f);
                    float n2 = Mathf.PerlinNoise(x * 0.09f + 20f, y * 0.09f);
                    float crack = Mathf.Abs(Mathf.Sin((x + y * 0.4f) * 0.11f + n2 * 4f));
                    Color c = Color.Lerp(black, red, n);
                    if (n2 > 0.62f) c = Color.Lerp(c, orange, (n2 - 0.62f) / 0.38f);
                    if (crack > 0.92f) c = yel;
                    t.SetPixel(x, y, c);
                }
            t.Apply(false, false);
            return t;
        }

        public static Texture2D Grid()
        {
            const int s = 64;
            var t = new Texture2D(s, s, TextureFormat.RGBA32, false);
            t.wrapMode = TextureWrapMode.Repeat;
            t.filterMode = FilterMode.Point;
            var line = new Color(1f, 1f, 1f, 1f);
            var clear = new Color(1f, 1f, 1f, 0.04f);
            for (int y = 0; y < s; y++)
                for (int x = 0; x < s; x++)
                {
                    bool g = x == 0 || y == 0 || x == s - 1 || y == s - 1 || (x % 8 == 0) || (y % 8 == 0);
                    t.SetPixel(x, y, g ? line : clear);
                }
            t.Apply(false, false);
            return t;
        }

        static void Stamp(Texture2D tex, string s, int x, int y, Color col)
        {
            // tiny 3x5 dashes so banners have "text-ish" blocks
            for (int i = 0; i < s.Length && x + i * 7 < tex.width; i++)
            {
                if (s[i] == ' ') continue;
                for (int yy = 0; yy < 8; yy++)
                    for (int xx = 0; xx < 5; xx++)
                        if (x + i * 7 + xx < tex.width && y + yy < tex.height)
                            tex.SetPixel(x + i * 7 + xx, y + yy, col);
            }
        }
    }
}
