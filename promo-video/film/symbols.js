// "Symbols" cut: the feature scenes told without app screens.
//
// One element carries the whole stretch: the ring (the "0" of the TEN10 logo). Every
// feature is a single large symbol built on or around it, and the headline sits under
// it as one unit, so the eye never jumps between a caption and a busy screenshot.
//   import     rows leave a spreadsheet and flow into the ring
//   recurring  the ring becomes a year: a marker circles it and lights every month
//   reminders  the standing-order chip turns into the reminder email; the bell rings
//   analytics  the ring opens into the real category split; the house draws in
//
// Same engine and narration anchors as scenes.js (every beat is A.s / A.e / A.w), so it
// re-times itself to the recording. Prototype range: s(import) − 0.5 → s(reports) − 0.1.
(function () {
  const { clamp, lerp, E, prog, win, makeAnchors, cue, sfx, h, s, icon, put, setText, setStyle, setAttr } = window.ENGINE;
  const KW_LEAD = 0.14; // keyword visuals land just before the spoken word
  const TEAL = "#11676a", GOLD = "#f0c000";
  const SEG_COLORS = ["#11676a", "#4fa39b", "#f0c000", "#cfc8b0"];

  async function init(stage, lang, timing, opts = {}) {
    const C = window.CONTENT[lang];
    const R = C.dir === "rtl";
    const V = opts.format === "vertical";
    const W = V ? 1080 : 1920, H = V ? 1920 : 1080;
    const L = V
      ? { cx: 540, cy: 880, r: 268, sw: 40, hlTop: 1270, hlSize: R ? 92 : 74, sheet: [540, 290], chipY: 470, lblR: 352, lblW: 170 }
      : { cx: 960, cy: 445, r: 232, sw: 36, hlTop: 772, hlSize: R ? 86 : 72, sheet: [R ? 1560 : 360, 445], chipY: 100, lblR: 318, lblW: 240 };
    const { cx, cy, r } = L;
    const dir = R ? 1 : -1; // reading-start side (+x in RTL)

    stage.className = (R ? "rtl" : "ltr-stage") + (V ? " vertical" : "") + " sym";
    stage.innerHTML = "";
    sfx.length = 0;
    const A = makeAnchors(timing);
    const B = (k) => A.w(C.beats[k][0], C.beats[k][1]);
    const money = window.makeUI(C).money;
    const cp = C.copy;

    // ------------------------------------------------------------------ times
    const T = {
      a: A.s("import") - 0.5,
      imp: A.s("import"), impW: B("importWord") - KW_LEAD,
      rec: A.s("recurring"), recW: B("recurringWord") - KW_LEAD, auto: B("autoWord") - KW_LEAD,
      rem: A.s("reminders"), remW: B("remindWord") - KW_LEAD,
      an: A.s("analytics"), anW: B("analyticsWord") - KW_LEAD, money: B("moneyWord") - KW_LEAD, house: B("householdWord") - KW_LEAD,
      b: A.s("reports") - 0.1,
    };

    // ------------------------------------------------------------------ backdrop
    stage.append(h("div", { id: "bgWash" }), h("div", { id: "bgGrid" }));

    // ------------------------------------------------------------------ ring (SVG)
    const svg = s("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: "position:absolute;left:0;top:0;overflow:visible" });
    stage.append(svg);
    const arc = (attrs) => s("circle", { cx, cy, r, fill: "none", pathLength: 100, transform: `rotate(-90 ${cx} ${cy})`, "stroke-linecap": "butt", ...attrs });
    const ringG = s("g", {});
    const defs = s("defs", {}, s("filter", { id: "symShadow", x: "-30%", y: "-30%", width: "160%", height: "160%" },
      s("feDropShadow", { dx: 0, dy: 18, stdDeviation: 22, "flood-color": "#24281e", "flood-opacity": 0.16 })));
    svg.append(defs);
    const disc = s("circle", { cx, cy, r: r - L.sw / 2 - 2, fill: "#fff", filter: "url(#symShadow)" });
    ringG.append(disc);
    const track = arc({ stroke: "rgba(17,103,106,0.10)", "stroke-width": L.sw });
    const ringTeal = arc({ stroke: TEAL, "stroke-width": L.sw, "stroke-dasharray": "86 100", "stroke-dashoffset": -14 });
    const ringGold = arc({ stroke: GOLD, "stroke-width": L.sw, "stroke-dasharray": "10 100", "stroke-dashoffset": -2 });
    // recurring: the year drawn by the orbiting marker
    const yearArc = arc({ stroke: TEAL, "stroke-width": L.sw, "stroke-dasharray": "0 100" });
    ringG.append(track, ringTeal, ringGold, yearArc);
    svg.append(ringG);
    // arrival ripples (import)
    const ripples = [];
    // month dots on the ring (recurring)
    const angPt = (deg, rr) => [cx + Math.sin((deg * Math.PI) / 180) * rr, cy - Math.cos((deg * Math.PI) / 180) * rr];
    const months = [];
    const dotsG = s("g", {});
    for (let k = 0; k < 12; k++) {
      const [x, y] = angPt(k * 30, r);
      const d = s("circle", { cx: x, cy: y, r: 7, fill: "#fff" });
      dotsG.append(d);
      months.push({ d, x, y });
    }
    svg.append(dotsG);
    const marker = s("circle", { r: 17, fill: GOLD, stroke: "#fff", "stroke-width": 5 });
    svg.append(marker);
    // analytics: the real category split (C.ui.analytics.cats), top three + other
    const cats = C.ui.analytics.cats;
    const total = cats.reduce((a, c) => a + c[1], 0);
    const top = cats.slice(0, 3).map(([n, v]) => [n, v]);
    top.push([cp.sym.other, cats.slice(3).reduce((a, c) => a + c[1], 0)]);
    const pcts = top.map(([, v]) => Math.round((v / total) * 100));
    pcts[pcts.length - 1] = 100 - pcts.slice(0, -1).reduce((a, b) => a + b, 0);
    // rotate the split so no label lands at the bottom (where the headline sits)
    const mids0 = pcts.map((p, i) => pcts.slice(0, i).reduce((a, b) => a + b, 0) + p / 2);
    let off = 0, best = Infinity;
    for (let o = 0; o < 100; o++) {
      const pen = mids0.reduce((a, m) => { const d = Math.abs((((m + o) % 100) * 3.6) - 180); return a + Math.max(0, 55 - d) ** 2; }, 0) + o * 0.01;
      if (pen < best) { best = pen; off = o; }
    }
    let acc = off;
    const segs = top.map(([name], i) => {
      const len = pcts[i], start = acc;
      acc += len;
      const mid = ((start + len / 2) / 100) * 360;
      const c = arc({ stroke: SEG_COLORS[i], "stroke-width": L.sw + 6, "stroke-dasharray": "0 100", "stroke-dashoffset": -start });
      const [x0, y0] = angPt(mid, r + L.sw / 2 + 12), [x1, y1] = angPt(mid, r + L.sw / 2 + 52);
      const lead = s("line", { x1: x0, y1: y0, x2: x1, y2: y1, stroke: "rgba(40,36,20,0.35)", "stroke-width": 2, pathLength: 1, "stroke-dasharray": "0 1" });
      svg.append(c, lead);
      return { name, pct: pcts[i], start, len, mid, c, lead };
    });

    // ------------------------------------------------------------------ HTML layers
    const layer = h("div", { class: "layer" });
    stage.append(layer);
    const faceBox = (kids) => {
      const el = h("div", { class: "abs symface", style: { width: `${r * 2}px`, left: `${cx - r}px`, top: `${cy}px` } }, kids);
      layer.append(el);
      return el;
    };
    // face 0: the balance the maaser scene handed over
    const f0 = faceBox([h("div", { class: "cap" }, C.chaos.centerLabel), h("div", { class: "big num" }, money(820))]);
    // face 1: import counter
    const f1Num = h("div", { class: "big num" }, "0");
    const f1 = faceBox([h("div", { class: "glyph" }, icon("download", 80, 2.2)), f1Num, h("div", { class: "cap" }, cp.sym.imported)]);
    // face 2: every month
    const f2 = faceBox([h("div", { class: "glyph" }, icon("repeat", 104, 2.2)), h("div", { class: "mid" }, cp.sym.monthly)]);
    // face 3: the bell
    const bell = h("div", { class: "glyph bell" }, icon("bell", 168, 1.9), h("span", { class: "dot" }, "1"));
    const f3 = faceBox([bell]);
    // face 4: household spending, the house draws in
    const houseSvg = h("div", { class: "glyph", html: `<svg width="112" height="112" viewBox="0 0 24 24" fill="none" stroke="${TEAL}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${window.ICONS.house.replace(/<path /g, '<path pathLength="1" ')}</svg>` });
    const housePaths = [...houseSvg.querySelectorAll("path")];
    const f4Num = h("div", { class: "big num" }, money(total));
    const f4 = faceBox([houseSvg, f4Num, h("div", { class: "cap" }, cp.sym.household)]);
    const faces = [f0, f1, f2, f3, f4];

    // import: a spreadsheet at the reading-start side (vertical: above the ring)
    const rowsData = C.rows.slice(0, 7);
    const sheetRows = rowsData.map((rw) => h("div", { class: "shrow" }, h("i", { class: `d ${rw.type}` }), h("b", { style: { width: `${60 + (rw.desc.length % 4) * 14}px` } }), h("b", { class: "s" })));
    const sheet = h("div", { class: "abs symsheet" }, h("div", { class: "shhead" }, icon("file-spreadsheet", 36, 2), h("span", { class: "ltr" }, cp.sym.file)), sheetRows);
    layer.append(sheet);
    const SHW = 360, SHH = 452;
    const shX = L.sheet[0] - SHW / 2, shY = L.sheet[1] - SHH / 2;
    const rowY = (i) => shY + 96 + i * 48 + 16;
    // the pills that fly out of the rows (real rows from the app's table data)
    const pills = rowsData.map((rw, i) => {
      const el = h("div", { class: "abs sympill" }, h("i", { class: `d ${rw.type}` }), h("span", {}, rw.desc), h("b", { class: "num" }, money(rw.amt)));
      layer.append(el);
      const rp = s("circle", { cx, cy, r, fill: "none", stroke: rw.type === "income" ? "#16a34a" : rw.type === "donation" ? GOLD : TEAL, "stroke-width": 3 });
      svg.insertBefore(rp, ringG);
      ripples.push(rp);
      return { el, i, rw, t0: T.impW + 0.05 + i * 0.19 };
    });

    // recurring chip → reminder email toast (same slot above the ring)
    const rc = C.ui.recurring;
    const chip = h("div", { class: "abs symchip" }, icon("repeat", 34, 2.4), h("span", {}, rc.label), h("b", { class: "num" }, money(rc.amount)));
    const em = C.ui.email;
    const toast = h("div", { class: "abs symtoast" }, h("span", { class: "ti" }, icon("mail", 36, 2)), h("div", {}, h("b", {}, em.from), h("span", {}, em.subject)));
    layer.append(chip, toast);

    // analytics labels
    const labels = segs.map((sg) => {
      const [x, y] = angPt(sg.mid, L.lblR);
      const right = Math.sin((sg.mid * Math.PI) / 180) >= 0;
      const el = h("div", { class: "abs symlbl", style: { width: `${L.lblW}px`, textAlign: right ? "left" : "right", direction: R ? "rtl" : "ltr" } },
        h("div", { class: "p num ltr" }, `${sg.pct}%`), h("div", { class: "n" }, sg.name));
      if (!right) el.style.textAlign = "right";
      layer.append(el);
      return { el, x: right ? x + 6 : x - L.lblW - 6, y: y - 40 };
    });

    // ------------------------------------------------------------------ headlines
    const heads = [];
    const headline = (lines, t1, t2, tOut) => {
      // readability: the second line must stay fully legible for READ_MIN before the exit
      const READ_MIN = 1.1, n2 = lines[1].split(" ").length;
      t2 = Math.min(t2, tOut - READ_MIN - 0.35 - 0.07 * (n2 - 1));
      t1 = Math.min(t1, t2 - 0.3);
      const el = h("div", { class: "abs symhl", style: { width: `${W}px`, top: `${L.hlTop}px`, fontSize: `${L.hlSize}px` } });
      const words = [];
      lines.forEach((ln, li) => {
        const row = h("div", { class: li ? "l2" : "l1" });
        ln.split(" ").forEach((w, wi) => {
          const sp = h("span", { class: "wd" }, w);
          row.append(sp, " ");
          words.push({ sp, t: (li ? t2 : t1) + wi * 0.07 });
        });
        el.append(row);
      });
      layer.append(el);
      const g = { el, words, t1, t2, tOut, text: lines.join(" ") };
      heads.push(g);
      return g;
    };
    headline(cp.importLines, T.imp + 0.05, B("existingWord") - 0.3, T.rec - 0.05);
    headline(cp.recurringLines, T.recW, T.auto, T.rem - 0.05);
    headline(cp.remindLines, T.rem + 0.05, Math.max(T.remW + 0.6, A.e("reminders") - 0.7), T.an - 0.05);
    headline(cp.analyticsLines, T.anW, T.house, T.b + 5);
    function headScene(t) {
      for (const g of heads) {
        const out = prog(t, g.tOut, g.tOut + 0.35, E.inCubic);
        g.words.forEach((w) => {
          const p = prog(t, w.t, w.t + 0.5, E.outQuint);
          put(w.sp, { y: (1 - p) * 34 - out * 24, o: p * (1 - out), blur: (1 - p) * 8 + out * 6 });
        });
        put(g.el, { o: t >= g.t1 - 0.01 && out < 1 ? 1 : 0 });
      }
    }

    // ------------------------------------------------------------------ seek
    const faceOn = (el, a, b, t) => {
      const p = prog(t, a, a + 0.45, E.outCubic), q = prog(t, b, b + 0.3, E.inCubic);
      put(el, { y: -el.offsetHeight / 2 + (1 - p) * 18 - q * 10, s: lerp(0.88, 1, p) * lerp(1, 0.92, q), o: p * (1 - q), blur: (1 - p) * 6 + q * 6 });
    };
    const bez = (p0, p1, p2, u) => [(1 - u) ** 2 * p0[0] + 2 * (1 - u) * u * p1[0] + u * u * p2[0], (1 - u) ** 2 * p0[1] + 2 * (1 - u) * u * p1[1] + u * u * p2[1]];

    function seek(t) {
      // --- ring: in at the start, breathes with each scene
      const rin = prog(t, T.a, T.a + 0.4, E.outCubic);
      setAttr(ringG, "opacity", rin.toFixed(3));
      const dim = win(t, T.recW, T.rem + 0.3, 0.35, 0.4) ;
      const toDonut = prog(t, T.anW, T.anW + 0.9, E.inOutCubic);
      setAttr(ringTeal, "opacity", ((1 - 0.72 * dim) * (1 - toDonut)).toFixed(3));
      setAttr(ringGold, "opacity", ((1 - 0.72 * dim) * (1 - toDonut)).toFixed(3));
      setAttr(track, "opacity", (1 - toDonut * 0.6).toFixed(3));

      // --- faces
      faceOn(f0, T.a, T.impW - 0.2, t);
      faceOn(f1, T.impW - 0.05, T.rec - 0.15, t);
      faceOn(f2, T.recW - 0.1, T.rem - 0.05, t);
      faceOn(f3, T.remW - 0.35, T.an - 0.05, t);
      faceOn(f4, T.anW + 0.35, T.b + 5, t);

      // --- import: sheet in, rows fly into the ring
      const shIn = prog(t, T.imp - 0.25, T.imp + 0.4, E.outCubic), shOut = prog(t, T.rec - 0.3, T.rec + 0.15, E.inCubic);
      put(sheet, { x: shX + (V ? 0 : dir * (1 - shIn) * 60), y: shY + (V ? -(1 - shIn) * 50 : 0) + shOut * 20, s: lerp(1, 0.9, shOut), o: shIn * (1 - shOut), blur: shOut * 6 });
      let arrived = 0;
      pills.forEach((pl, i) => {
        const u = prog(t, pl.t0, pl.t0 + 0.8, E.inOutCubic);
        const lift = prog(t, pl.t0 - 0.05, pl.t0 + 0.2, E.outCubic);
        // start on the row, end on the ring edge facing the sheet
        const p0 = V ? [cx, rowY(i)] : [L.sheet[0] + (R ? -SHW / 2 + 40 : SHW / 2 - 40), rowY(i)];
        const face = V ? 0 : R ? 90 : 270;
        const spread = (i - 3) * (V ? 9 : 10);
        const p2 = angPt(face + spread * (V ? 1 : R ? -1 : 1), r * 0.55);
        const p1 = V ? [cx + (i - 3) * 60, (p0[1] + p2[1]) / 2] : [(p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2 + (i - 3) * 34];
        const [x, y] = bez(p0, p1, p2, u);
        const w = pl.el.offsetWidth || 260;
        const sc = lerp(0.7, 1, lift) * lerp(1, 0.35, prog(u, 0.55, 1, E.inQuad));
        put(pl.el, { x: x - w / 2, y: y - 30, s: sc, o: lift * (1 - prog(u, 0.78, 1)) });
        pl.el.style.transformOrigin = "50% 50%";
        if (u >= 1) arrived++;
        const rp = prog(t, pl.t0 + 0.8, pl.t0 + 1.4, E.outCubic);
        setAttr(ripples[i], "r", (r + L.sw / 2 + rp * 40).toFixed(1));
        setAttr(ripples[i], "opacity", (rp > 0 && rp < 1 ? (1 - rp) * 0.55 : 0).toFixed(3));
      });
      setText(f1Num, String(Math.round((128 * arrived) / pills.length)));

      // --- recurring: chip lands, the year gets drawn by the marker
      const chIn = prog(t, T.recW, T.recW + 0.5, E.outBack);
      const chOut = prog(t, T.remW - 0.2, T.remW + 0.1, E.inCubic);
      const chipW = chip.offsetWidth || 300;
      put(chip, { x: cx - chipW / 2, y: L.chipY - 30 + (1 - chIn) * 24, s: lerp(0.85, 1, chIn), o: prog(t, T.recW, T.recW + 0.25) * (1 - chOut) });
      chip.style.transformOrigin = "50% 50%";
      const orb = prog(t, T.auto, T.auto + 1.45, E.inOutCubic);
      const dotsIn = prog(t, T.recW + 0.2, T.recW + 0.8);
      const dotsOut = prog(t, T.rem + 0.1, T.rem + 0.5);
      setAttr(dotsG, "opacity", (dotsIn * (1 - dotsOut)).toFixed(3));
      setAttr(yearArc, "stroke-dasharray", `${(orb * 100).toFixed(2)} 100`);
      setAttr(yearArc, "opacity", (1 - prog(t, T.rem + 0.1, T.rem + 0.6)).toFixed(3));
      const first = prog(t, T.recW + 0.55, T.recW + 0.8, E.outBack);
      months.forEach((m, k) => {
        const lit = k === 0 ? first : prog(orb, k / 12 - 0.01, k / 12 + 0.03, E.linear);
        setAttr(m.d, "fill", lit > 0.5 ? GOLD : "#fff");
        setAttr(m.d, "r", (7 + 4 * Math.sin(clamp(lit) * Math.PI)).toFixed(2));
      });
      const [mx, my] = angPt(orb * 360, r);
      setAttr(marker, "cx", mx.toFixed(1)); setAttr(marker, "cy", my.toFixed(1));
      setAttr(marker, "opacity", (prog(t, T.auto - 0.2, T.auto) * (1 - prog(t, T.auto + 1.45, T.auto + 1.75))).toFixed(3));

      // --- reminders: chip becomes the reminder email, the bell rings
      const tIn = prog(t, T.remW - 0.1, T.remW + 0.4, E.outCubic), tOut = prog(t, T.an - 0.1, T.an + 0.25, E.inCubic);
      const tw = toast.offsetWidth || 600;
      put(toast, { x: cx - tw / 2, y: L.chipY - 46 + (1 - tIn) * -20, s: lerp(0.9, 1, tIn), o: tIn * (1 - tOut), blur: tOut * 6 });
      toast.style.transformOrigin = "50% 50%";
      const sw = t - (T.remW - 0.05);
      put(bell, { r: sw > 0 ? 16 * Math.sin(sw * 13) * Math.exp(-sw * 2.2) : 0 });
      bell.style.transformOrigin = "50% 8%";

      // --- analytics: ring opens into the category split, labels, house
      segs.forEach((sg, i) => {
        const vis = clamp(toDonut * 100 - (sg.start - off), 0, sg.len);
        const gap = vis > 1.2 ? 0.8 : 0, dl = Math.max(0, vis - gap);
        setAttr(sg.c, "stroke-dasharray", `${dl.toFixed(2)} ${(100 - dl).toFixed(2)}`);
        setAttr(sg.c, "stroke-dashoffset", (-(sg.start + gap / 2)).toFixed(2));
        const ex = prog(t, T.money + i * 0.08, T.money + 0.5 + i * 0.08, E.outBack);
        const [dx, dy] = [Math.sin((sg.mid * Math.PI) / 180) * 12 * ex, -Math.cos((sg.mid * Math.PI) / 180) * 12 * ex];
        setAttr(sg.c, "transform", `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) rotate(-90 ${cx} ${cy})`);
        const lt = Math.min(T.anW + 1.25, T.money - 0.6) + i * 0.16;
        const lp = prog(t, lt, lt + 0.45, E.outCubic);
        setAttr(sg.lead, "stroke-dasharray", `${lp.toFixed(3)} 1`);
        put(labels[i].el, { x: labels[i].x, y: labels[i].y + (1 - lp) * 12, o: lp });
      });
      const hp = prog(t, T.house, T.house + 0.8, E.inOutCubic);
      housePaths.forEach((p) => { p.setAttribute("stroke-dasharray", `${hp.toFixed(3)} 1`); });
      setStyle(houseSvg, "opacity", hp > 0.001 ? "1" : "0");

      headScene(t);
    }

    // ------------------------------------------------------------------ sound
    cue(T.imp - 0.25, "whoosh", 0.3);
    pills.forEach((pl, i) => cue(pl.t0 + 0.8, "arrive", i % 2 ? 0.2 : 0.26));
    cue(T.recW + 0.05, "pop", 0.4);
    cue(T.recW + 0.6, "tick", 0.3);
    cue(T.auto, "sweep", 0.4);
    for (let k = 1; k < 12; k++) {
      // marker passes month k when inOutCubic(u) = k/12
      const target = k / 12;
      let lo = 0, hi = 1;
      for (let it = 0; it < 30; it++) { const m = (lo + hi) / 2; if (E.inOutCubic(m) < target) lo = m; else hi = m; }
      cue(T.auto + lo * 1.45, "tick", 0.16);
    }
    cue(T.remW - 0.1, "notify", 0.5);
    cue(T.remW + 0.05, "tap", 0.3);
    cue(T.anW, "sweep", 0.5);
    segs.forEach((sg, i) => cue(Math.min(T.anW + 1.25, T.money - 0.6) + i * 0.16, "tick", 0.2));
    cue(T.money, "pop", 0.26);
    cue(T.house, "pop", 0.34);

    function qa() {
      return heads.map((g) => {
        const lastWord = g.words[g.words.length - 1].t + 0.35;
        return { text: g.text, in: g.t1, out: g.tOut, readable: g.tOut - lastWord };
      });
    }

    await document.fonts.ready;
    seek(T.a);
    return {
      duration: T.b, width: W, height: H, format: V ? "vertical" : "landscape", range: [T.a, T.b],
      seek, times: T, qa, cues: () => ({ duration: T.b, cues: [...sfx].sort((x, y) => x.t - y.t) }),
    };
  }

  window.SYMBOLS = { init };
})();
