(function (root, factory) {
  var exported = factory();
  if (typeof module === "object" && module.exports) module.exports = exported;
  root.LatticeMrz = exported;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<";
  var WEIGHTS = [7, 3, 1];

  function mrzValue(ch) {
    if (ch === "<") return 0;
    if (ch >= "0" && ch <= "9") return ch.charCodeAt(0) - 48;
    if (ch >= "A" && ch <= "Z") return ch.charCodeAt(0) - 55;
    return 0;
  }

  function checkDigit(data) {
    var sum = 0;
    for (var i = 0; i < data.length; i++) {
      sum += mrzValue(data[i] || "<") * WEIGHTS[i % 3];
    }
    return String(sum % 10);
  }

  function onlyMrz(s) {
    return String(s || "").toUpperCase().replace(/[^A-Z0-9<]/g, "").slice(0, 44);
  }

  function yymmdd(s) {
    if (!/^\d{6}$/.test(s)) return s;
    var yy = Number(s.slice(0, 2));
    var year = yy > 30 ? 1900 + yy : 2000 + yy;
    return year + "-" + s.slice(2, 4) + "-" + s.slice(4, 6);
  }

  function parseTd3(line1, line2) {
    var l1 = onlyMrz(line1).padEnd(44, "<").slice(0, 44);
    var l2 = onlyMrz(line2).padEnd(44, "<").slice(0, 44);
    if (l1.length !== 44 || l2.length !== 44) {
      return { ok: false, error: "MRZ must be two 44-character lines.", raw1: l1, raw2: l2 };
    }
    var docNum = l2.slice(0, 9);
    var docCheck = l2[9];
    var birth = l2.slice(13, 19);
    var birthCheck = l2[19];
    var expiry = l2.slice(21, 27);
    var expiryCheck = l2[27];
    var optional = l2.slice(28, 42);
    var optionalCheck = l2[42];
    var composite = docNum + docCheck + birth + birthCheck + expiry + expiryCheck + optional + optionalCheck;
    var overall = l2[43];
    var checks = [
      checkDigit(docNum) === docCheck,
      checkDigit(birth) === birthCheck,
      checkDigit(expiry) === expiryCheck,
      checkDigit(composite) === overall
    ];
    if (checks.filter(Boolean).length < 3) {
      return { ok: false, error: "Check digits did not validate.", raw1: l1, raw2: l2 };
    }
    var nameField = l1.slice(5);
    var parts = nameField.split("<<");
    var last = parts[0] || "";
    var rest = parts[1] || "";
    return {
      ok: true,
      documentType: l1.slice(0, 2).replace(/</g, ""),
      issuer: l1.slice(2, 5).replace(/</g, ""),
      lastName: last.replace(/</g, " ").trim(),
      givenNames: rest.replace(/</g, " ").replace(/\s+/g, " ").trim(),
      documentNumber: docNum.replace(/</g, ""),
      nationality: l2.slice(10, 13).replace(/</g, ""),
      birthDate: yymmdd(birth),
      sex: l2[20] === "F" ? "F" : l2[20] === "M" ? "M" : "X",
      expiry: yymmdd(expiry),
      raw1: l1,
      raw2: l2
    };
  }

  var SPECIMEN = {
    line1: "P<LTXSPECIMEN<<ALEX<QUILL<<<<<<<<<<<<<<<<<<<",
    line2: "",
    lastName: "SPECIMEN",
    givenNames: "ALEX QUILL",
    documentNumber: "LATTICE01",
    nationality: "LTX",
    birth: "920315",
    sex: "X",
    expiry: "320101"
  };

  function buildSpecimenLine2() {
    var doc = "LATTICE01";
    var docCheck = checkDigit(doc);
    var birth = "920315";
    var birthCheck = checkDigit(birth);
    var expiry = "320101";
    var expiryCheck = checkDigit(expiry);
    var optional = "DEMOOCR<<<<<<";
    var optionalCheck = checkDigit(optional);
    var body = doc + docCheck + "LTX" + birth + birthCheck + "X" + expiry + expiryCheck + optional + optionalCheck;
    return (body + checkDigit(body)).padEnd(44, "<").slice(0, 44);
  }
  SPECIMEN.line2 = buildSpecimenLine2();

  return {
    MRZ_CHARSET: CHARSET,
    mrzValue: mrzValue,
    checkDigit: checkDigit,
    onlyMrz: onlyMrz,
    parseTd3: parseTd3,
    SPECIMEN: SPECIMEN
  };
});
