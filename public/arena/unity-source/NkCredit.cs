using UnityEngine;

namespace NetKnight
{
    public static class NkCredit
    {
        public const string Name = "GLYPHS";
        static Texture2D _icon;

        public static Texture2D Icon()
        {
            if (!_icon) _icon = Resources.Load<Texture2D>("NkStory/credit");
            return _icon;
        }

        public static string Money(float score) => Mathf.FloorToInt(score).ToString("N0");

        public static string Clock(float t)
        {
            int s = Mathf.Max(0, Mathf.FloorToInt(t));
            return (s / 60).ToString("00") + ":" + (s % 60).ToString("00");
        }
    }
}
