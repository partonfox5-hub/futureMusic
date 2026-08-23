(function (root) {
  var mrz = root.LatticeMrz;
  var CHARSET = mrz.MRZ_CHARSET;
  var onlyMrz = mrz.onlyMrz;
  var parseTd3 = mrz.parseTd3;
  var SPECIMEN = mrz.SPECIMEN;

  function luma(data, i) {
    return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  function laplacianVariance(gray, w, h) {
    var sum = 0;
    var sumSq = 0;
    var n = 0;
    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var i = y * w + x;
        var v = -4 * gray[i] + gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w];
        sum += v;
        sumSq += v * v;
        n++;
      }
    }
    var mean = sum / n;
    return sumSq / n - mean * mean;
  }

  var TW = 18;
  var TH = 28;
  var TEMPLATES = null;

  function drawCharTemplate(ch, cw, chh) {
    var c = document.createElement("canvas");
    c.width = cw;
    c.height = chh;
    var ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, cw, chh);
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 " + Math.floor(chh * 0.86) + 'px "IBM Plex Mono", ui-monospace, monospace';
    ctx.fillText(ch, cw / 2, chh / 2 + 1);
    var img = ctx.getImageData(0, 0, cw, chh).data;
    var out = new Float32Array(cw * chh);
    for (var i = 0; i < cw * chh; i++) out[i] = luma(img, i * 4);
    return out;
  }

  function templates() {
    if (!TEMPLATES) {
      TEMPLATES = {};
      for (var i = 0; i < CHARSET.length; i++) {
        TEMPLATES[CHARSET[i]] = drawCharTemplate(CHARSET[i], TW, TH);
      }
    }
    return TEMPLATES;
  }

  function ncc(a, b) {
    var n = Math.min(a.length, b.length);
    var ma = 0;
    var mb = 0;
    var i;
    for (i = 0; i < n; i++) {
      ma += a[i];
      mb += b[i];
    }
    ma /= n;
    mb /= n;
    var num = 0;
    var da = 0;
    var db = 0;
    for (i = 0; i < n; i++) {
      var xa = a[i] - ma;
      var xb = b[i] - mb;
      num += xa * xb;
      da += xa * xa;
      db += xb * xb;
    }
    var den = Math.sqrt(da * db);
    return den === 0 ? 0 : num / den;
  }

  function recognizeCell(gray, w, x0, y0, cw, chh) {
    var cell = new Float32Array(TW * TH);
    for (var y = 0; y < TH; y++) {
      var sy = Math.min(chh - 1, Math.floor((y * chh) / TH));
      for (var x = 0; x < TW; x++) {
        var sx = Math.min(cw - 1, Math.floor((x * cw) / TW));
        cell[y * TW + x] = gray[(y0 + sy) * w + (x0 + sx)] || 255;
      }
    }
    var best = "<";
    var bestScore = -Infinity;
    var tm = templates();
    for (var ch in tm) {
      var s = ncc(cell, tm[ch]);
      if (s > bestScore) {
        bestScore = s;
        best = ch;
      }
    }
    return bestScore > 0.12 ? best : "<";
  }

  function findTextBands(rowEnergy, minGap) {
    var thresh = rowEnergy.reduce(function (a, b) { return a + b; }, 0) / rowEnergy.length * 0.85;
    var bands = [];
    var start = -1;
    for (var y = 0; y < rowEnergy.length; y++) {
      if (rowEnergy[y] > thresh) {
        if (start < 0) start = y;
      } else if (start >= 0) {
        if (y - start >= minGap) bands.push({ y0: start, y1: y });
        start = -1;
      }
    }
    if (start >= 0 && rowEnergy.length - start >= minGap) {
      bands.push({ y0: start, y1: rowEnergy.length });
    }
    return bands.sort(function (a, b) {
      return b.y1 - b.y0 - (a.y1 - a.y0);
    }).slice(0, 4);
  }

  function readLine(gray, w, y0, y1) {
    var h = y1 - y0;
    if (h < 8) return "";
    var col = new Float64Array(w);
    var x;
    for (x = 0; x < w; x++) {
      var s = 0;
      for (var y = y0; y < y1; y++) s += 255 - gray[y * w + x];
      col[x] = s / h;
    }
    var mean = 0;
    for (x = 0; x < w; x++) mean += col[x];
    mean /= w;
    var left = 0;
    var right = w - 1;
    while (left < w && col[left] < mean * 0.35) left++;
    while (right > left && col[right] < mean * 0.35) right--;
    var usable = Math.max(44, right - left);
    var cw = usable / 44;
    var out = "";
    for (var i = 0; i < 44; i++) {
      var x0 = Math.floor(left + i * cw);
      var cellW = Math.max(4, Math.floor(cw));
      out += recognizeCell(gray, w, x0, y0, cellW, h);
    }
    return onlyMrz(out);
  }

  async function scanIdImage(file) {
    var bmp = await createImageBitmap(file);
    var maxW = 900;
    var scale = Math.min(1, maxW / bmp.width);
    var w = Math.max(320, Math.round(bmp.width * scale));
    var h = Math.max(180, Math.round(bmp.height * scale));
    var canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(bmp, 0, 0, w, h);
    var img = ctx.getImageData(0, 0, w, h);
    var gray = new Float32Array(w * h);
    var glare = 0;
    var sum = 0;
    for (var i = 0, p = 0; i < gray.length; i++, p += 4) {
      var yv = luma(img.data, p);
      gray[i] = yv;
      sum += yv;
      if (yv > 248 && img.data[p + 1] > 245) glare++;
    }
    var mean = sum / gray.length;
    var contrast = 0;
    for (i = 0; i < gray.length; i++) contrast += Math.abs(gray[i] - mean);
    contrast /= gray.length * 128;
    var blur = laplacianVariance(gray, w, h);
    var fill = (bmp.width * bmp.height) / Math.max(1, (bmp.width + 40) * (bmp.height + 40));
    var zoneY0 = Math.floor(h * 0.55);
    var zoneH = h - zoneY0;
    var energy = [];
    for (var y = 0; y < zoneH; y++) {
      var e = 0;
      for (var x = 1; x < w; x++) {
        e += Math.abs(gray[(zoneY0 + y) * w + x] - gray[(zoneY0 + y) * w + x - 1]);
      }
      energy.push(e / w);
    }
    var bands = findTextBands(energy, Math.max(8, Math.floor(zoneH * 0.04)))
      .map(function (b) { return { y0: zoneY0 + b.y0, y1: zoneY0 + b.y1 }; })
      .sort(function (a, b) { return a.y0 - b.y0; });
    var lines = bands.slice(-2).map(function (b) { return readLine(gray, w, b.y0, b.y1); });
    var line1 = lines[0] || "";
    var line2 = lines[1] || "";
    return {
      quality: {
        blur: Math.round(blur),
        glare: glare / gray.length,
        fill: fill,
        contrast: contrast,
        linesFound: bands.length
      },
      line1: line1,
      line2: line2,
      parse: parseTd3(line1, line2),
      previewDataUrl: canvas.toDataURL("image/jpeg", 0.72)
    };
  }

  function drawSpecimenDocument() {
    var w = 860;
    var h = 540;
    var canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#d8d2c6";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#1a1c22";
    ctx.fillRect(0, 0, w, 64);
    ctx.fillStyle = "#ecece8";
    ctx.font = "600 22px Outfit, sans-serif";
    ctx.fillText("LATTICE  ·  SPECIMEN TRAVEL DOCUMENT", 28, 40);
    ctx.fillStyle = "#2a2c32";
    ctx.fillRect(28, 88, 168, 210);
    ctx.fillStyle = "#c9cdd4";
    ctx.fillRect(48, 118, 128, 150);
    ctx.fillStyle = "#1a1c22";
    ctx.beginPath();
    ctx.arc(112, 168, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(78, 200, 68, 56);
    ctx.font = "500 13px Outfit, sans-serif";
    var fields = [
      ["Type", "P"],
      ["Code", "LTX"],
      ["Document no.", SPECIMEN.documentNumber],
      ["Surname", SPECIMEN.lastName],
      ["Given names", SPECIMEN.givenNames],
      ["Nationality", "LATTICE"],
      ["Date of birth", "15 MAR 1992"],
      ["Sex", "X"],
      ["Date of expiry", "01 JAN 2032"]
    ];
    fields.forEach(function (f, i) {
      var x = 220 + (i % 2) * 300;
      var y = 100 + Math.floor(i / 2) * 42;
      ctx.fillStyle = "#6e6e6a";
      ctx.font = "500 13px Outfit, sans-serif";
      ctx.fillText(f[0].toUpperCase(), x, y);
      ctx.fillStyle = "#1a1c22";
      ctx.font = "600 18px Outfit, sans-serif";
      ctx.fillText(f[1], x, y + 20);
    });
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-0.4);
    ctx.fillStyle = "rgba(180,40,40,0.18)";
    ctx.font = "700 64px Fraunces, serif";
    ctx.textAlign = "center";
    ctx.fillText("SPECIMEN", 0, 0);
    ctx.restore();
    ctx.fillStyle = "#0b0b0c";
    ctx.fillRect(0, h - 96, w, 96);
    ctx.fillStyle = "#f2f1ee";
    ctx.font = '700 28px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textBaseline = "middle";
    ctx.fillText(SPECIMEN.line1, 18, h - 64);
    ctx.fillText(SPECIMEN.line2, 18, h - 28);
    return new Promise(function (resolve) {
      canvas.toBlob(function (b) { resolve(b || new Blob()); }, "image/jpeg", 0.92);
    });
  }

  function assessQuality(q) {
    var blurOk = q.blur > 18;
    var glareOk = q.glare < 0.08;
    var fillOk = q.fill > 0.4;
    var contrastOk = q.contrast > 0.12;
    return {
      ok: blurOk && glareOk && fillOk && contrastOk,
      notes: [
        blurOk ? "Sharp" : "Blurry — hold still",
        glareOk ? "No glare" : "Glare detected",
        fillOk ? "Filled frame" : "Move closer",
        contrastOk ? "Contrast OK" : "Low contrast"
      ]
    };
  }

  root.LatticeOcr = {
    scanIdImage: scanIdImage,
    drawSpecimenDocument: drawSpecimenDocument,
    assessQuality: assessQuality,
    SPECIMEN: SPECIMEN
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
