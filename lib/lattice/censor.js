const BLOCKED = [
  /\b(dismember|behead|decapitat\w*|eviscerat\w*|disembowel)\b/gi,
  /\b(gore porn|torture porn|snuff)\b/gi,
  /\b(child porn|childporn|csam)\b/gi,
  /\b(rape|raping|rapist)\b/gi,
  /\b(bestiality|zoophilia)\b/gi,
  /\bnecrophilia\b/gi,
  /\b(murder you|kill yourself|kys)\b/gi,
  /\b(explicit sex act|graphic sex)\b/gi
];

function censorMessage(input) {
  let text = String(input || "");
  let hits = 0;
  for (const re of BLOCKED) {
    text = text.replace(re, () => {
      hits += 1;
      return "[removed]";
    });
  }
  return { text, censored: hits > 0, hits };
}

module.exports = { censorMessage };
