(function (root, factory) {
  var exported = factory();
  if (typeof module === "object" && module.exports) module.exports = exported;
  root.LatticeDimensions = exported;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var DIMENSIONS = [
    { id: "age", label: "Age", group: "physical", min: 18, max: 75, unit: "yrs", low: "younger", high: "older" },
    { id: "height", label: "Height", group: "physical", min: 145, max: 205, unit: "cm", low: "shorter", high: "taller" },
    { id: "fitness", label: "Fitness", group: "physical", min: 0, max: 100, low: "sedentary", high: "athletic" },
    { id: "style", label: "Style", group: "physical", min: 0, max: 100, low: "casual", high: "polished" },
    { id: "presentation", label: "Presentation", group: "physical", min: 0, max: 100, low: "softer", high: "sharper" },
    { id: "openness", label: "Openness", group: "personality", min: 0, max: 100, low: "conventional", high: "curious" },
    { id: "conscientiousness", label: "Conscientiousness", group: "personality", min: 0, max: 100, low: "flexible", high: "structured" },
    { id: "extraversion", label: "Extraversion", group: "personality", min: 0, max: 100, low: "reserved", high: "outgoing" },
    { id: "agreeableness", label: "Agreeableness", group: "personality", min: 0, max: 100, low: "direct", high: "warm" },
    { id: "stability", label: "Emotional stability", group: "personality", min: 0, max: 100, low: "sensitive", high: "steady" },
    { id: "intellect", label: "Intellect", group: "personality", min: 0, max: 100, low: "practical", high: "abstract" },
    { id: "humor", label: "Humor", group: "personality", min: 0, max: 100, low: "dry", high: "playful" },
    { id: "assertiveness", label: "Assertiveness", group: "personality", min: 0, max: 100, low: "yielding", high: "decisive" },
    { id: "orderliness", label: "Orderliness", group: "personality", min: 0, max: 100, low: "loose", high: "tidy" },
    { id: "warmth", label: "Warmth", group: "personality", min: 0, max: 100, low: "cool", high: "affectionate" },
    { id: "attachAnxiety", label: "Attachment anxiety", group: "attachment", min: 0, max: 100, low: "self-soothing", high: "reassurance-seeking" },
    { id: "attachAvoidance", label: "Attachment avoidance", group: "attachment", min: 0, max: 100, low: "close", high: "independent" },
    { id: "selfDirection", label: "Self-direction", group: "values", min: 0, max: 100, low: "guided", high: "autonomous" },
    { id: "stimulation", label: "Stimulation", group: "values", min: 0, max: 100, low: "calm", high: "novelty" },
    { id: "hedonism", label: "Pleasure", group: "values", min: 0, max: 100, low: "austere", high: "sensual" },
    { id: "achievement", label: "Achievement", group: "values", min: 0, max: 100, low: "content", high: "driven" },
    { id: "power", label: "Influence", group: "values", min: 0, max: 100, low: "egalitarian", high: "status" },
    { id: "security", label: "Security", group: "values", min: 0, max: 100, low: "risk-tolerant", high: "safety-first" },
    { id: "tradition", label: "Tradition", group: "values", min: 0, max: 100, low: "progressive", high: "traditional" },
    { id: "benevolence", label: "Benevolence", group: "values", min: 0, max: 100, low: "self-focus", high: "caretaking" },
    { id: "universalism", label: "Universalism", group: "values", min: 0, max: 100, low: "in-group", high: "world-minded" },
    { id: "ambition", label: "Ambition", group: "lifestyle", min: 0, max: 100, low: "easygoing", high: "climbing" },
    { id: "careerFocus", label: "Career focus", group: "lifestyle", min: 0, max: 100, low: "life-first", high: "work-first" },
    { id: "spirituality", label: "Spirituality", group: "lifestyle", min: 0, max: 100, low: "secular", high: "devout" },
    { id: "politics", label: "Politics", group: "lifestyle", min: 0, max: 100, low: "left", high: "right" },
    { id: "familyOrientation", label: "Family orientation", group: "lifestyle", min: 0, max: 100, low: "solo", high: "clan" },
    { id: "kidsDesire", label: "Desire for children", group: "lifestyle", min: 0, max: 100, low: "none", high: "yes" },
    { id: "urbanRural", label: "Setting", group: "lifestyle", min: 0, max: 100, low: "rural", high: "urban" },
    { id: "nightOwl", label: "Chronotype", group: "lifestyle", min: 0, max: 100, low: "early", high: "night" },
    { id: "travel", label: "Travel", group: "lifestyle", min: 0, max: 100, low: "homebody", high: "nomad" },
    { id: "outdoors", label: "Outdoors", group: "lifestyle", min: 0, max: 100, low: "indoor", high: "wilderness" },
    { id: "arts", label: "Arts", group: "lifestyle", min: 0, max: 100, low: "uninterested", high: "immersed" },
    { id: "science", label: "Science / tech", group: "lifestyle", min: 0, max: 100, low: "uninterested", high: "immersed" },
    { id: "alcohol", label: "Drinking", group: "lifestyle", min: 0, max: 100, low: "none", high: "frequent" },
    { id: "smoking", label: "Smoking", group: "lifestyle", min: 0, max: 100, low: "never", high: "regular" },
    { id: "pets", label: "Pets", group: "lifestyle", min: 0, max: 100, low: "none", high: "many" },
    { id: "fitnessShare", label: "Shared activity", group: "lifestyle", min: 0, max: 100, low: "separate", high: "together" },
    { id: "routine", label: "Routine", group: "lifestyle", min: 0, max: 100, low: "spontaneous", high: "scheduled" },
    { id: "affection", label: "Affection", group: "bond", min: 0, max: 100, low: "reserved", high: "expressive" },
    { id: "communication", label: "Communication", group: "bond", min: 0, max: 100, low: "sparse", high: "constant" },
    { id: "conflictDirect", label: "Conflict style", group: "bond", min: 0, max: 100, low: "avoidant", high: "direct" },
    { id: "relationshipPace", label: "Pace", group: "bond", min: 0, max: 100, low: "slow", high: "fast" },
    { id: "independence", label: "Independence", group: "bond", min: 0, max: 100, low: "fused", high: "autonomous" }
  ];

  var DIM_BY_ID = {};
  DIMENSIONS.forEach(function (d) { DIM_BY_ID[d.id] = d; });

  var GROUPS = [
    { id: "physical", label: "Physical" },
    { id: "personality", label: "Personality" },
    { id: "attachment", label: "Attachment" },
    { id: "values", label: "Values" },
    { id: "lifestyle", label: "Lifestyle" },
    { id: "bond", label: "How you bond" }
  ];

  var GENDERS = ["woman", "man", "nonbinary"];
  var INTENTS = ["dating", "long-term", "marriage", "friends"];
  var EDUCATIONS = ["high school", "some college", "bachelor", "master", "doctorate"];

  function defaultTraits(age) {
    if (age == null) age = 29;
    var t = {};
    DIMENSIONS.forEach(function (d) { t[d.id] = d.id === "age" ? age : 50; });
    return t;
  }

  function defaultPrefs(traits) {
    var p = {};
    DIMENSIONS.forEach(function (d) {
      p[d.id] = {
        ideal: traits[d.id] != null ? traits[d.id] : 50,
        weight: d.id === "age" || d.id === "kidsDesire" || d.id === "politics" ? 2 : 1
      };
    });
    return p;
  }

  function clampDim(id, value) {
    var d = DIM_BY_ID[id];
    if (!d) return value;
    return Math.min(d.max, Math.max(d.min, value));
  }

  return {
    DIMENSIONS: DIMENSIONS,
    DIM_BY_ID: DIM_BY_ID,
    GROUPS: GROUPS,
    GENDERS: GENDERS,
    INTENTS: INTENTS,
    EDUCATIONS: EDUCATIONS,
    defaultTraits: defaultTraits,
    defaultPrefs: defaultPrefs,
    clampDim: clampDim
  };
});
