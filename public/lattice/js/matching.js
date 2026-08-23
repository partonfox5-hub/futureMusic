(function (root, factory) {
  var dims = (typeof module === "object" && module.exports)
    ? require("./dimensions.js")
    : root.LatticeDimensions;
  var exported = factory(dims);
  if (typeof module === "object" && module.exports) module.exports = exported;
  root.LatticeMatching = exported;
})(typeof globalThis !== "undefined" ? globalThis : this, function (dims) {
  var DIMENSIONS = dims.DIMENSIONS;
  var GROUPS = dims.GROUPS;

  function preferenceDistance(prefs, traits, group) {
    var sum = 0;
    var wsum = 0;
    for (var i = 0; i < DIMENSIONS.length; i++) {
      var d = DIMENSIONS[i];
      if (group && d.group !== group) continue;
      var p = prefs[d.id];
      var t = traits[d.id];
      if (!p || t == null || !isFinite(t) || p.weight <= 0) continue;
      var range = d.max - d.min || 1;
      var diff = (p.ideal - t) / range;
      sum += p.weight * diff * diff;
      wsum += p.weight;
    }
    if (wsum <= 0) return 1;
    return Math.sqrt(sum / wsum);
  }

  function directedScore(prefs, traits, group) {
    return Math.round(100 * Math.exp(-3.2 * preferenceDistance(prefs, traits, group)));
  }

  function reciprocalScore(aPrefs, aTraits, bPrefs, bTraits) {
    var sAB = Math.exp(-3.2 * preferenceDistance(aPrefs, bTraits));
    var sBA = Math.exp(-3.2 * preferenceDistance(bPrefs, aTraits));
    return Math.round(100 * Math.sqrt(Math.max(0, sAB * sBA)));
  }

  function groupDirectedScores(prefs, traits) {
    return GROUPS.map(function (g) {
      return { id: g.id, label: g.label, score: directedScore(prefs, traits, g.id) };
    });
  }

  function dimGaps(prefs, traits) {
    var gaps = [];
    for (var i = 0; i < DIMENSIONS.length; i++) {
      var d = DIMENSIONS[i];
      var p = prefs[d.id];
      var t = traits[d.id];
      if (!p || t == null) continue;
      var range = d.max - d.min || 1;
      gaps.push({
        id: d.id,
        label: d.label,
        group: d.group,
        youWant: p.ideal,
        theyAre: t,
        gap: Math.abs(p.ideal - t) / range,
        weight: p.weight
      });
    }
    return gaps;
  }

  function topGaps(prefs, traits, n) {
    return dimGaps(prefs, traits).sort(function (a, b) {
      return b.weight * b.gap - a.weight * a.gap;
    }).slice(0, n || 6);
  }

  function topFits(prefs, traits, n) {
    return dimGaps(prefs, traits)
      .filter(function (g) { return g.weight >= 1; })
      .sort(function (a, b) { return a.gap - b.gap; })
      .slice(0, n || 4);
  }

  function traitTags(traits, polesOnly) {
    var tags = [];
    for (var i = 0; i < DIMENSIONS.length; i++) {
      var d = DIMENSIONS[i];
      var v = traits[d.id];
      if (v == null) continue;
      var range = d.max - d.min || 1;
      var t = (v - d.min) / range;
      if (t >= 0.68) tags.push(d.high, d.label);
      else if (t <= 0.32) tags.push(d.low, d.label);
      else if (!polesOnly) tags.push(d.label);
    }
    return tags;
  }

  function profileSearchText(p) {
    return [
      p.displayName, p.city, p.country, p.bio, p.occupation, p.religion,
      p.education, p.intent, p.gender, (p.languages || []).join(" ")
    ].concat(traitTags(p.traits)).join(" ").toLowerCase();
  }

  return {
    preferenceDistance: preferenceDistance,
    directedScore: directedScore,
    reciprocalScore: reciprocalScore,
    groupDirectedScores: groupDirectedScores,
    topGaps: topGaps,
    topFits: topFits,
    traitTags: traitTags,
    profileSearchText: profileSearchText
  };
});
