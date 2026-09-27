// The TEN10 film timeline.
//
// Every scene boundary and every emphasis beat is derived from narration anchors
// (A.s / A.e / A.w on narration/timing.<lang>.json). Nothing is hard-timed in
// seconds from zero, so re-syncing to the final recording re-times the whole film.
//
// Geometry is authored in the Hebrew (RTL) frame and mirrored for English with
// `mx`, then rebalanced where string widths differ (headlines auto-wrap per language).
(function () {
  const { clamp, lerp, E, prog, win, makeAnchors, cue, sfx, h, s, icon, put, setText, setStyle, setAttr, rnd } = window.ENGINE;

  const W = 1920, H = 1080, CX = 960, CY = 540;
  const WIN_S = 0.82, WIN_VW = 1440, WIN_VH = 860;

  async function inlineSvg(url) {
    const txt = await (await fetch(url)).text();
    const d = new DOMParser().parseFromString(txt, "image/svg+xml");
    return document.importNode(d.documentElement, true);
  }

  async function init(stage, lang, timing) {
    const C = window.CONTENT[lang];
    const R = C.dir === "rtl";
    const A = makeAnchors(timing);
    const UI = window.makeUI(C);
    const money = UI.money;
    const B = (k) => A.w(C.beats[k][0], C.beats[k][1]);
    stage.className = R ? "rtl" : "ltr-stage";
    stage.innerHTML = "";
    sfx.length = 0;

    /** mirror an x coordinate (or a box's left edge when w is given) for LTR */
    const mx = (x, w = 0) => (R ? x : W - x - w);
    // keyword-synced visuals and their sounds land this much before the spoken word (brief §7, §25)
    const KW_LEAD = 0.14;
    const HL_EDGE = 84, HL_W = 500;

    // =========================================================== named times
    const T = {};
    T.heroIn = 0.25;
    T.s2 = A.s("complex1") - 0.3;
    T.income = B("income");
    T.donations = B("donations");
    T.months = B("months");
    T.obligations = B("obligations");
    T.recurring = B("recurring");
    T.harder = A.s("complex2");
    T.freeze = A.s("order") - 0.45;
    T.sw0 = A.s("order") - 0.2;
    T.sw1 = T.sw0 + 0.75;
    T.col0 = T.sw1 + 0.02;
    T.m0 = T.col0 + 0.34;
    T.m1 = T.m0 + 0.72;
    T.tag = T.m1 + 0.05;
    T.s4 = Math.max(A.s("maaser") - 0.35, T.tag + 1.25);
    T.maaser = B("maaser");
    T.chomesh = B("chomesh");
    // import visuals start on the phrase itself so the Maaser/Chomesh beat keeps its last line readable
    T.s5 = A.s("import") - 0.12;
    T.s6 = A.s("recurring") - 0.3;
    T.recWord = B("recurringWord");
    T.autoWord = B("autoWord");
    T.flip1 = Math.max(T.recWord + 0.75, T.autoWord - 0.55);
    T.flip2 = Math.max(T.flip1 + 0.6, T.autoWord + 0.1);
    T.s7 = Math.max(A.s("reminders") - 0.25, T.flip2 + 0.55);
    T.remindWord = B("remindWord");
    T.s8 = A.s("notjust") - 0.25;
    T.numbers = B("numbers");
    T.hal = A.s("halacha") - 0.45;
    T.halWord = B("halachaWord");
    T.tab1 = A.s("halacha") + 0.95;
    T.tab2 = Math.min(A.s("halacha") + 1.95, A.s("rabbi") - 0.35);
    T.q = B("questionWord") - 0.15;
    T.rabbiWord = B("rabbiWord");
    T.fabPress = T.q + 0.55;
    T.dlg = T.q + 0.72;
    T.subj0 = T.dlg + 0.3;
    T.subj1 = T.subj0 + 0.75;
    T.body0 = T.subj1 + 0.12;
    T.body1 = Math.max(T.body0 + 0.6, Math.min(T.body0 + 1.15, A.s("together") - 0.95));
    T.send = Math.max(T.body1 + 0.12, A.e("rabbi") - 0.05);
    T.s9 = Math.max(A.s("together") - 0.4, T.send + 0.5);
    // highlights need the pulled-out dashboard on screen (in English "income" is the phrase's first word)
    const glowReady = T.s9 + 0.95;
    T.tInc = Math.max(B("tIncome"), glowReady);
    T.tDon = Math.max(B("tDonations"), T.tInc + 0.6);
    T.tObl = Math.max(B("tObligations"), T.tDon + 0.6);
    T.brand = A.s("brand");
    // the return to "10%" needs ~1.3 s before "TEN10." is spoken; start right after the last highlight
    T.s10 = Math.max(T.tObl + 0.55, T.brand - 1.3);
    T.tagline = A.s("tagline");
    T.url = A.e("tagline") + 0.3;
    T.end = Math.max(A.duration, A.e("tagline") + 3.4);

    // =========================================================== backdrop
    stage.append(h("div", { id: "bgWash" }), h("div", { id: "bgGrid" }));

    // =========================================================== ring (SVG)
    const ringSvg = s("svg", { id: "ringSvg", width: W, height: H, viewBox: `0 0 ${W} ${H}` });
    const connG = s("g");
    const tealArc = s("path", { fill: "none", stroke: "#11676a", "stroke-linecap": "butt" });
    const chomArc = s("path", { fill: "none", stroke: "#f7d766", "stroke-linecap": "butt" });
    const goldArc = s("path", { fill: "none", stroke: "#f0c000", "stroke-linecap": "butt" });
    const trackC = s("circle", { fill: "none", stroke: "rgba(17,103,106,0.10)" });
    ringSvg.append(connG, trackC, tealArc, chomArc, goldArc);
    // the organising line of scene 3: a soft teal beam with a trailing wash
    const sweep = h("div", { class: "abs", style: { width: "3px", height: `${H}px`, background: "linear-gradient(180deg, rgba(17,103,106,0), #11676a 22%, #11676a 78%, rgba(17,103,106,0))" } });
    const sweepGlow = h("div", { class: "abs", style: { width: "160px", height: `${H}px`, background: `linear-gradient(${R ? 90 : 270}deg, rgba(17,103,106,0.10), rgba(17,103,106,0))`, WebkitMaskImage: "linear-gradient(180deg, transparent, #000 25%, #000 75%, transparent)" } });
    const ringLayer = h("div", { class: "layer" }, ringSvg, sweepGlow, sweep);

    // arc path; angles in degrees, 0 = 12 o'clock, clockwise
    const pt = (cx, cy, r, a) => [cx + r * Math.sin((a * Math.PI) / 180), cy - r * Math.cos((a * Math.PI) / 180)];
    const arc = (cx, cy, r, a0, a1) => {
      if (a1 - a0 <= 0.01) return "M0,0";
      if (a1 - a0 >= 359.99) a1 = a0 + 359.99;
      const [x0, y0] = pt(cx, cy, r, a0), [x1, y1] = pt(cx, cy, r, a1);
      return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
    };

    // ring center label
    const ringCap = h("div", { style: { fontSize: "22px", fontWeight: "600", color: "var(--mfg)", textAlign: "center", whiteSpace: "nowrap" } }, C.chaos.centerLabel);
    const ringVal = h("div", { class: "num", style: { fontSize: "66px", fontWeight: "800", color: "var(--teal)", textAlign: "center", whiteSpace: "nowrap", lineHeight: "1.1" } });
    const ringLabel = h("div", { class: "abs", style: { width: "600px", left: `${CX - 300}px`, top: `${CY - 58}px`, transformOrigin: "50% 58px" } }, ringCap, ringVal);

    // =========================================================== chaos fragments
    const chaosLayer = h("div", { class: "layer" });
    const K = C.chaos;
    const frags = [];
    const typeWord = C.ui.table.types;
    const addFrag = (el, x, y, t0, opt = {}) => {
      chaosLayer.append(el);
      const conn = s("path", { fill: "none", stroke: "rgba(17,103,106,0.28)", "stroke-width": 1.6, pathLength: 1, "stroke-dasharray": "0 1" });
      connG.append(conn);
      frags.push({ el, x: R ? x : W - x, y, t0, conn, month: !!opt.month, i: frags.length });
    };
    const txFrag = (f) => h("div", { class: "frag" },
      h("span", { style: { color: f.type === "income" ? "#16a34a" : "#ca8a04" } }, icon(f.type === "income" ? "wallet" : "hand-coins", 22, 2)),
      h("span", { class: "lbl" }, f.label),
      h("span", { class: `badge ${f.type}` }, typeWord[f.type]),
      h("span", { class: "amt num", style: { color: f.type === "income" ? "#15803d" : "#a16207" } }, money(f.amount)));
    addFrag(txFrag(K.income[0]), 1450, 330, T.income - 0.12);
    addFrag(txFrag(K.income[1]), 1520, 560, T.income + 0.14);
    addFrag(txFrag(K.donations[0]), 430, 360, T.donations - 0.1);
    addFrag(txFrag(K.donations[1]), 390, 610, T.donations + 0.14);
    K.months.forEach((m, i) => {
      const n = K.months.length;
      const a = (-34 + (68 * i) / (n - 1)) * (R ? -1 : 1);
      const [x, y] = pt(CX, CY + 60, 430, a);
      addFrag(h("div", { class: "frag pill month" }, m), R ? x : W - x, y - 18, T.months - 0.12 + i * 0.07, { month: true });
    });
    addFrag(h("div", { class: "frag pill" }, h("span", { style: { color: "var(--teal)" } }, icon("calendar", 18, 2)), K.prevMonth.label,
      h("span", { class: "amt num", style: { color: "var(--teal)" } }, money(K.prevMonth.amount))), 1390, 800, T.months + 0.3);
    addFrag(h("div", { class: "frag pill", style: { borderColor: "#11676a55" } }, h("b", { style: { color: "var(--teal)" } }, K.obligations[0].label), h("span", { class: "num ltr", style: { color: "var(--teal)" } }, K.obligations[0].pct)), 600, 820, T.obligations - 0.1);
    addFrag(h("div", { class: "frag pill", style: { borderColor: "#f0c00088" } }, h("b", { style: { color: "#a16207" } }, K.obligations[1].label), h("span", { class: "num ltr", style: { color: "#a16207" } }, K.obligations[1].pct)), 820, 930, T.obligations + 0.12);
    addFrag(h("div", { class: "frag" }, h("span", { style: { color: "var(--teal)" } }, icon("repeat", 20, 2)), h("span", { class: "lbl" }, K.recurring.label),
      h("span", { style: { color: "var(--mfg)" } }, K.recurring.sub), h("span", { class: "badge rec num" }, K.recurring.badge)), 1150, 930, T.recurring - 0.05);
    const nxPos = [[250, 190], [1680, 200], [1690, 900], [260, 880], [1740, 450], [200, 470]];
    const txSpan = Math.max(0.9, A.e("complex2") - T.harder - 0.2);
    nxPos.forEach(([x, y], i) => addFrag(h("div", { class: "frag pill", style: { fontSize: "17px", padding: "7px 14px" } },
      h("span", { style: { color: "var(--teal)" } }, icon("circle-plus", 17, 2)), K.newTx), x, y, T.harder + 0.1 + (i * txSpan) / nxPos.length));

    // aligned "order" slots (scene 3)
    const nonMonth = frags.filter((f) => !f.month);
    nonMonth.forEach((f, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      f.sx = (col === 0 ? 1500 : 420);
      f.sx = R ? f.sx : W - f.sx;
      f.sy = 330 + row * 66;
    });
    frags.filter((f) => f.month).forEach((f, i) => { f.sx = R ? 1200 - i * 120 : 720 + i * 120; f.sy = 196; });

    // =========================================================== hero "10%"
    const heroLayer = h("div", { class: "layer", style: { width: `${W}px`, height: `${H}px`, display: "flex", alignItems: "center", justifyContent: "center", transformOrigin: "50% 50%" } });
    const hero = h("div", { class: "hero10", style: { fontSize: "400px", transform: "translateY(-0.04em)" } }, "10", h("span", { class: "pct" }, "%"));
    heroLayer.append(hero);
    const soundsWrap = h("div", { class: "abs", style: { width: `${W}px`, top: "812px", textAlign: "center", fontSize: R ? "66px" : "62px", fontWeight: "600", color: "hsl(47 20% 26%)", letterSpacing: "-0.01em" } });
    const soundsW = C.copy.sounds.map((wd) => {
      const inner = h("span", { class: "wd" }, wd);
      soundsWrap.append(h("span", { class: "mask" }, inner), " ");
      return inner;
    });

    // =========================================================== logos
    const logoLayer = h("div", { class: "layer" });
    const wideSvg = await inlineSvg("../../public/logo/logo-wide.svg");
    const stackSvg = await inlineSvg("../../public/logo/logo.svg");
    const WIDE_W = 980;
    const wideVB = wideSvg.viewBox.baseVal;
    const wideScale = WIDE_W / wideVB.width;
    const WIDE_H = wideVB.height * wideScale;
    const WIDE_X = CX - WIDE_W / 2, WIDE_Y = 430 - WIDE_H / 2;
    const STACK_H = 330;
    const stackVB = stackSvg.viewBox.baseVal;
    const stackScale = STACK_H / stackVB.height;
    const STACK_W = stackVB.width * stackScale;
    const STACK_X = CX - STACK_W / 2, STACK_Y = 392 - STACK_H / 2;

    // split each logo into "letters" and "ring + wedge" layers so the donut can become the 0
    function splitLogo(svg, w, hgt) {
      svg.setAttribute("width", w); svg.setAttribute("height", hgt);
      const paths = [...svg.querySelectorAll("path")].filter((p) => (p.getAttribute("d") || "").length > 40);
      const wedge = paths.find((p) => (p.getAttribute("fill") || "").toLowerCase() === "#f0c000");
      const ring = paths[paths.indexOf(wedge) - 1];
      const letters = svg.cloneNode(true);
      const ringOnly = svg.cloneNode(true);
      const lp = [...letters.querySelectorAll("path")].filter((p) => (p.getAttribute("d") || "").length > 40);
      lp[paths.indexOf(wedge)].remove(); lp[paths.indexOf(ring)].remove();
      [...ringOnly.querySelectorAll("path")].filter((p) => (p.getAttribute("d") || "").length > 40)
        .forEach((p, i) => { if (i !== paths.indexOf(wedge) && i !== paths.indexOf(ring)) p.remove(); });
      return { letters, ringOnly, ring, wedge };
    }
    const wide = splitLogo(wideSvg, WIDE_W, WIDE_H);
    const stack = splitLogo(stackSvg, STACK_W, STACK_H);
    const wideLettersBox = h("div", { class: "abs", style: { left: `${WIDE_X}px`, top: `${WIDE_Y}px` } }, wide.letters);
    const wideRingBox = h("div", { class: "abs", style: { left: `${WIDE_X}px`, top: `${WIDE_Y}px` } }, wide.ringOnly);
    const stackLettersBox = h("div", { class: "abs", style: { left: `${STACK_X}px`, top: `${STACK_Y}px` } }, stack.letters);
    const stackRingBox = h("div", { class: "abs", style: { left: `${STACK_X}px`, top: `${STACK_Y}px` } }, stack.ringOnly);
    logoLayer.append(wideLettersBox, wideRingBox, stackLettersBox, stackRingBox);

    // measure ring geometry in stage px (needs the SVG in the DOM)
    const measureHost = h("div", { style: { position: "absolute", visibility: "hidden" } });
    document.body.append(measureHost);
    function ringGeom(svg, ringPath, wedgePath, x0, y0, scale, vb) {
      const host = svg.cloneNode(true);
      measureHost.append(host);
      const idx = [...svg.querySelectorAll("path")].indexOf(ringPath);
      const widx = [...svg.querySelectorAll("path")].indexOf(wedgePath);
      const rp = host.querySelectorAll("path")[idx], wp = host.querySelectorAll("path")[widx];
      const bb = rp.getBBox();
      // outer radius from left/bottom extents (the ring is cut only at the upper right)
      const cxv = bb.x + bb.height / 2, cyv = bb.y + bb.height / 2;
      const rOut = bb.height / 2;
      // inner radius: sample the path and take the minimum distance to the centre
      const L = rp.getTotalLength();
      let rIn = rOut;
      for (let i = 0; i < 400; i++) {
        const p = rp.getPointAtLength((i / 400) * L);
        rIn = Math.min(rIn, Math.hypot(p.x - cxv, p.y - cyv));
      }
      // wedge angular span + radial offset
      const WL = wp.getTotalLength();
      let aMin = 999, aMax = -999, dMin = 1e9, dMax = 0;
      for (let i = 0; i < 300; i++) {
        const p = wp.getPointAtLength((i / 300) * WL);
        const a = (Math.atan2(p.x - cxv, -(p.y - cyv)) * 180) / Math.PI;
        const d = Math.hypot(p.x - cxv, p.y - cyv);
        aMin = Math.min(aMin, a); aMax = Math.max(aMax, a); dMin = Math.min(dMin, d); dMax = Math.max(dMax, d);
      }
      host.remove();
      const toX = (v) => x0 + (v - vb.x) * scale, toY = (v) => y0 + (v - vb.y) * scale;
      return {
        cx: toX(cxv), cy: toY(cyv), r: ((rOut + rIn) / 2) * scale, th: (rOut - rIn) * scale,
        a0: aMin, a1: aMax, wedgeR: ((dMin + dMax) / 2) * scale, wedgeTh: (dMax - dMin) * scale,
      };
    }
    const wideRing = ringGeom(wideSvg, wide.ring, wide.wedge, WIDE_X, WIDE_Y, wideScale, wideVB);
    const stackRing = ringGeom(stackSvg, stack.ring, stack.wedge, STACK_X, STACK_Y, stackScale, stackVB);

    const orderTag = h("div", { class: "abs", style: { width: `${W}px`, top: "600px", textAlign: "center", fontSize: R ? "62px" : "56px", fontWeight: "700", color: "hsl(47 25% 18%)" } });
    const orderTagW = (R ? ["ניהול מעשרות.", "פשוט וברור."] : ["Maaser management.", "Clear and simple."]).map((g) => {
      const inner = h("span", { class: "wd" }, g);
      orderTag.append(h("span", { class: "mask" }, inner), " ");
      return inner;
    });

    // =========================================================== app window
    const winEl = h("div", { class: "win" });
    const cam = h("div", { class: "cam", style: { width: `${WIN_VW}px`, height: `${WIN_VH}px` } });
    winEl.append(cam);
    const side = UI.sidebar();
    const dash = UI.dashboard();
    const table = UI.tablePage(C.rows);
    const hal = UI.halachaPage();
    const con = UI.contact();
    cam.append(dash.el, table.el, hal.el, side.el);
    // contact FAB (bottom corner opposite the sidebar, like the app)
    const fabX = R ? 26 : WIN_VW - 26 - 58, fabY = WIN_VH - 26 - 58;
    con.fab.style.left = `${fabX}px`; con.fab.style.top = `${fabY}px`;
    const fabRipple = h("div", { class: "abs", style: { left: `${fabX}px`, top: `${fabY}px`, width: "58px", height: "58px", borderRadius: "50%", border: "3px solid #11676a", transformOrigin: "50% 50%" } });
    cam.append(fabRipple, con.fab);
    const veil = h("div", { class: "abs", style: { width: `${WIN_VW}px`, height: `${WIN_VH}px`, background: "hsl(48 79% 98%)" } });
    const dim = h("div", { class: "dim" });
    cam.append(veil, dim);
    const dlgX = (WIN_VW - 560) / 2, dlgY = 118;
    con.el.style.left = `${dlgX}px`; con.el.style.top = `${dlgY}px`;
    con.el.style.transformOrigin = "50% 40%";
    cam.append(con.el);
    con.toast.style.top = `${WIN_VH - 96}px`;
    cam.append(con.toast);
    const winLayer = h("div", { class: "layer" }, winEl);

    // offset of an element inside the window (virtual px, before camera)
    const vpos = (el) => {
      let x = 0, y = 0, n = el;
      while (n && n !== cam) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      return { x, y, w: el.offsetWidth, h: el.offsetHeight };
    };

    // =========================================================== overlays
    const ovl = h("div", { class: "layer" });
    const tx = UI.txForm();
    const file = UI.fileChip();
    const step = UI.stepper();
    const cal = UI.calendar();
    const recRows = [1, 2].map((m) => UI.recRow(recDate(m), m + 1));
    const dateFly = h("div", { class: "abs num", style: { fontSize: "18px", fontWeight: "700", color: "#fff", background: "var(--teal)", borderRadius: "8px", padding: "4px 10px", whiteSpace: "nowrap" } }, C.rows[7].d);
    const mail = UI.email();
    const inbox = UI.inbox();
    const floatAmt = h("div", { class: "abs num", style: { fontSize: "38px", fontWeight: "700", color: "#11676a", whiteSpace: "nowrap", transformOrigin: "50% 50%" } }, money(C.ui.email.amount));
    const floatTitle = h("div", { class: "abs", style: { fontSize: "26px", fontWeight: "700", whiteSpace: "nowrap", transformOrigin: "50% 50%" }, html: C.ui.halacha.title });
    const D0 = C.data;
    const constVals = [D0.incomeBase + D0.chomeshIncome, D0.chomeshIncome, D0.donations, C.ui.recurring.amount, D0.expenses,
      (D0.incomeBase + D0.chomeshIncome) * 0.1, D0.chomeshIncome * 0.2, C.rows[1].amt];
    const constPos = [[-420, -210], [380, -250], [-560, 60], [520, 40], [-300, 250], [300, 260], [-60, -330], [80, 330]];
    const constel = constVals.map((v, i) => {
      const el = h("div", { class: "abs num", style: { fontSize: `${[40, 30, 34, 28, 36, 30, 26, 28][i]}px`, fontWeight: "700", color: i % 3 === 0 ? "rgba(17,103,106,0.55)" : "hsl(47 12% 52% / 0.7)", whiteSpace: "nowrap", transformOrigin: "50% 50%" } }, money(v));
      return { el, dx: constPos[i][0], dy: constPos[i][1], i };
    });
    ovl.append(tx.el, step.el, file.el, cal.el, ...recRows.map((r) => r.el), dateFly, inbox.el, mail.el, ...constel.map((c) => c.el), floatAmt, floatTitle);
    function recDate(m) {
      const d = String(C.ui.recurring.day).padStart(2, "0");
      return R ? `${d}.${String(m).padStart(2, "0")}.2026` : `${["Jan", "Feb", "Mar"][m - 1]} ${d}, 2026`;
    }

    // together tiles (scene 9): snapshots of the real components
    const tilesLayer = h("div", { class: "layer" });
    const tileConn = s("svg", { width: W, height: H, style: "position:absolute;left:0;top:0;overflow:visible" });
    tilesLayer.append(tileConn);

    // =========================================================== headlines
    const hlLayer = h("div", { class: "layer" });
    const measureCtx = document.createElement("canvas").getContext("2d");
    function wrap(text, size, weight, maxW) {
      measureCtx.font = `${weight} ${size}px Assistant`;
      const words = text.split(" ");
      const lines = [];
      let cur = "";
      for (const w of words) {
        const tryL = cur ? `${cur} ${w}` : w;
        if (measureCtx.measureText(tryL).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tryL;
      }
      if (cur) lines.push(cur);
      return lines;
    }
    /** groups: [{text, t, cls}] → stacked lines revealed group by group */
    function headline(groups, { size = R ? 84 : 72, weight = 800, maxW = HL_W, align = "side", top = null } = {}) {
      const el = h("div", { class: "headline", style: { fontSize: `${size}px`, fontWeight: weight } });
      const lines = [];
      groups.forEach((g, gi) => {
        const gs = g.size || size;
        for (const ln of wrap(g.text, gs, g.weight || weight, maxW)) {
          const inner = h("span", { class: "wd" }, ln);
          const lineEl = h("span", { class: `ln ${g.cls || ""}`, style: g.size ? { fontSize: `${g.size}px`, fontWeight: g.weight || weight, marginBottom: "10px" } : {} }, h("span", { class: "mask" }, inner));
          el.append(lineEl);
          lines.push({ inner, g: gi, t: g.t, size: gs });
        }
      });
      const totalH = lines.reduce((a, l) => a + l.size * 1.1, 0);
      if (align === "side") {
        el.style[R ? "right" : "left"] = `${HL_EDGE}px`;
        el.style.textAlign = R ? "right" : "left";
        el.style.top = `${(top ?? CY) - totalH / 2}px`;
      } else {
        el.style.left = "0"; el.style.width = `${W}px`; el.style.textAlign = "center"; el.style.top = `${top}px`;
      }
      hlLayer.append(el);
      return { el, lines };
    }
    const cp = C.copy;
    // Side-column headline blocks for scenes 4–8. `key` groups land on their spoken keyword;
    // the others follow. scheduleHeadlines() then guarantees readability (brief §22): each group
    // gets ≥ 0.45 s after the previous one, and a block holds ≥ READ_MIN after its last line
    // before the next block may enter (pushing the next block later if the narration is fast).
    const READ_MIN = 1.1, REVEAL_READ = 0.35;
    const HLDEF = [
      { groups: [{ text: cp.maaserLines[0], t: T.maaser - 0.08, cls: "teal", key: true }, { text: cp.maaserLines[1], t: T.chomesh - 0.08, cls: "teal", key: true }, { text: cp.maaserLines[2], t: T.chomesh + 0.4 }], hardOut: T.s6 },
      { groups: [{ text: cp.importLines[0], t: B("importWord") - 0.1, key: true }, { text: cp.importLines[1], t: B("importWord") + 0.55, cls: "soft" }], hardOut: T.s7 },
      { groups: [{ text: cp.recurringLines[0], t: T.recWord - 0.1, key: true }, { text: cp.recurringLines[1], t: T.autoWord - 0.05, cls: "teal", key: true }], hardOut: T.s8 },
      { groups: [{ text: cp.remindLines[0], t: T.remindWord - 0.15, key: true }, { text: cp.remindLines[1], t: T.remindWord + 0.4, cls: "teal" }], hardOut: T.s8 + 0.55 },
      { groups: [{ text: cp.halachaLine, t: T.halWord - 0.1, cls: "teal", key: true }], hardOut: T.q - 0.25 },
      { groups: [{ text: cp.questionLine, t: T.q, cls: "soft", size: R ? 50 : 44, weight: 700, key: true }, { text: cp.rabbiLine, t: T.rabbiWord - 0.06, cls: "teal", key: true }], hardOut: T.s9 },
    ];
    (function scheduleHeadlines() {
      let floor = -1e9;
      for (let b = 0; b < HLDEF.length; b++) {
        const gs = HLDEF[b].groups;
        const shift = Math.max(0, floor - gs[0].t);            // whole block waits for the previous one
        let prev = -1e9;
        for (const g of gs) { g.t = Math.max(g.t + (g.key ? 0 : shift), g.key ? g.t : 0, prev + 0.45, floor); prev = g.t; }
        floor = prev + REVEAL_READ + READ_MIN + 0.25;
      }
      for (let b = 0; b < HLDEF.length; b++) {
        const next = HLDEF[b + 1];
        const last = HLDEF[b].groups[HLDEF[b].groups.length - 1].t;
        const minOut = last + REVEAL_READ + READ_MIN;
        HLDEF[b].out = Math.max(minOut, Math.min(HLDEF[b].hardOut, next ? next.groups[0].t - 0.25 : 1e9));
        if (next && HLDEF[b].out > next.groups[0].t - 0.25) HLDEF[b].out = next.groups[0].t - 0.25;
      }
    })();
    const [hlMaaser, hlImport, hlRec, hlRemind, hlHal, hlRabbi] = HLDEF.map((d) => headline(d.groups));
    const hlTogether = headline([{ text: cp.togetherLine, t: T.s9 + 0.55 }], { size: R ? 58 : 52, weight: 800, maxW: 1600, align: "center", top: 92 });
    const tagline = headline(cp.tagline.map((g, i) => ({ text: g, t: taglineWordTime(i) })), { size: R ? 64 : 58, weight: 700, maxW: 1800, align: "center", top: 624 });
    // tagline groups sit on one line: flatten them inline
    tagline.el.querySelectorAll(".ln").forEach((l) => { l.style.display = "inline-block"; l.style.margin = "0 0.14em"; });
    const urlEl = h("div", { class: "abs url", style: { width: `${W}px`, top: "760px", textAlign: "center" } }, cp.url);
    const urlRule = h("div", { class: "abs", style: { left: `${CX - 36}px`, top: "735px", width: "72px", height: "3px", borderRadius: "2px", background: "#f0c000", transformOrigin: "50% 50%" } });
    hlLayer.append(urlRule, urlEl);
    function taglineWordTime(i) {
      const ph = A.phrases.find((p) => p.id === "tagline");
      const words = ph.words || [];
      const groups = cp.tagline.map((g) => g.split(" ").length);
      let idx = 0;
      for (let k = 0; k < i; k++) idx += groups[k];
      // map tagline copy groups onto narration words proportionally
      const wi = Math.min(words.length - 1, Math.round((idx / cp.tagline.join(" ").split(" ").length) * words.length));
      return (words[wi] ? words[wi].start : ph.start) - 0.08;
    }

    // =========================================================== assemble (z-order)
    stage.append(chaosLayer, ringLayer, heroLayer, soundsWrap, ringLabel, winLayer, ovl, tilesLayer, logoLayer, orderTag, hlLayer);

    await document.fonts.ready;

    // layout-dependent measurements
    for (const f of frags) { f.w = f.el.offsetWidth; f.h = f.el.offsetHeight; }
    const tblPos = vpos(table.tbl);
    const importPos = vpos(table.importBtn);
    const rowPos = (i) => ({ x: tblPos.x, y: tblPos.y + 48 + i * 52 });
    const cardPos = { overall: vpos(dash.overall.el), income: vpos(dash.income.el), expenses: vpos(dash.expenses.el), donations: vpos(dash.donations.el) };
    const halTitlePos = vpos(hal.title);
    const mailAmtPos = { x: mail.amt.offsetLeft, y: mail.amt.offsetTop };

    // =========================================================== window geometry helpers
    const WIN_X = mx(84, WIN_VW * WIN_S), WIN_Y = 187;
    const winState = { x: WIN_X, y: WIN_Y, s: WIN_S };
    const camState = { x: 0, y: 0, k: 1 };
    /** virtual → stage */
    const v2s = (vx, vy) => ({ x: winState.x + winState.s * (camState.x + camState.k * vx), y: winState.y + winState.s * (camState.y + camState.k * vy) });
    const camFocus = (k, px, py, qx = WIN_VW / 2, qy = WIN_VH / 2) => ({
      k, x: clamp(qx - k * px, WIN_VW - k * WIN_VW, 0), y: clamp(qy - k * py, WIN_VH - k * WIN_VH, 0),
    });

    // tiles (built after layout so clones carry real dimensions)
    const tiles = buildTiles();

    // =========================================================== sound design cues
    planCues();

    // =========================================================== seek
    function seek(t) {
      heroScene(t);
      chaosScene(t);
      ringScene(t);
      logoScene(t);
      appScene(t);
      overlays(t);
      headlines(t);
      tilesScene(t);
      finalScene(t);
    }

    // ----------------------------------------------------------- scene 1: hook
    function heroScene(t) {
      const pin = prog(t, T.heroIn, T.heroIn + 1.1, E.outQuint);
      const pulse = Math.sin(clamp((t - A.s("hook2") + 0.05) / 0.7) * Math.PI) * 0.035;
      const shrink = prog(t, T.s2 - 0.1, T.s2 + 0.75, E.inOutCubic);
      const k = lerp(0.94 + 0.06 * pin + pulse, 0.3, shrink);
      const toCenter = shrink;
      const fadeToVal = prog(t, T.income - 0.15, T.income + 0.2, E.inOutQuad);
      put(heroLayer, { y: lerp(28 * (1 - pin), -6, toCenter), s: k, o: pin * (1 - fadeToVal), blur: (1 - pin) * 8 });
      // "sounds simple" words
      const wt = [A.s("hook1") + 0.1, A.w("hook1", R ? "נשמע" : "sounds"), A.w("hook1", R ? "פשוט" : "simple")];
      const out = prog(t, T.s2 - 0.2, T.s2 + 0.25, E.inCubic);
      soundsW.forEach((el, i) => {
        const p = prog(t, wt[Math.min(i + (soundsW.length === 2 ? 1 : 0), 2)] - 0.08, wt[Math.min(i + (soundsW.length === 2 ? 1 : 0), 2)] + 0.5, E.outQuint);
        put(el, { y: lerp(70, 0, p) - out * 40, o: p * (1 - out) });
      });
    }

    // ----------------------------------------------------------- scene 2/3: chaos → order
    function orbitAngle(t) {
      const u = clamp((t - T.s2) / (T.freeze - T.s2));
      return (R ? -1 : 1) * 16 * (u * u * (3 - 2 * u));
    }
    function sweepX(t) {
      const p = prog(t, T.sw0, T.sw1, E.inOutQuad);
      return R ? lerp(W + 60, -60, p) : lerp(-60, W + 60, p);
    }
    function chaosScene(t) {
      const th = (orbitAngle(t) * Math.PI) / 180;
      const harder = prog(t, T.harder, A.e("complex2"), E.linear);
      for (const f of frags) {
        const pin = prog(t, f.t0, f.t0 + 0.5, E.outCubic);
        // orbit + drift
        const dx0 = f.x - CX, dy0 = f.y - CY;
        let x = CX + dx0 * Math.cos(th) - dy0 * Math.sin(th);
        let y = CY + dx0 * Math.sin(th) + dy0 * Math.cos(th);
        const still = 1 - prog(t, T.freeze - 0.15, T.freeze + 0.2);
        y += Math.sin(t * 1.3 + f.i * 1.7) * (4 + 5 * harder) * still;
        x += Math.cos(t * 1.1 + f.i * 2.3) * (3 + 4 * harder) * still;
        let sc = lerp(0.86, 1, pin), o = pin, rot = (rnd(f.i) - 0.5) * 4 * harder * still;
        // scene 3: the sweep aligns everything it passes, then it all collapses into the ring
        const passT = T.sw0 + ((R ? W + 60 - f.x : f.x + 60) / (W + 120)) * (T.sw1 - T.sw0);
        const al = prog(t, passT - 0.05, passT + 0.38, E.outCubic);
        x = lerp(x, f.sx, al); y = lerp(y, f.sy, al); rot = lerp(rot, 0, al);
        const ct = T.col0 + (f.month ? 0.06 : 0) + (f.i % 7) * 0.028;
        const col = prog(t, ct, ct + 0.36, E.inCubic);
        x = lerp(x, CX, col); y = lerp(y, CY, col); sc *= lerp(1, 0.18, col); o *= 1 - prog(t, ct + 0.18, ct + 0.36, E.linear);
        put(f.el, { x: x - f.w / 2, y: y - f.h / 2, s: sc, r: rot, o });
        // connector: fragment → ring edge
        const cp = prog(t, f.t0 + 0.15, f.t0 + 0.75, E.outCubic) * (1 - al);
        if (cp > 0.001) {
          const ang = Math.atan2(y - CY, x - CX);
          const ex = CX + Math.cos(ang) * 212, ey = CY + Math.sin(ang) * 212;
          const mxp = (x + ex) / 2 + Math.sin(ang) * 40, myp = (y + ey) / 2 - Math.cos(ang) * 40;
          setAttr(f.conn, "d", `M${ex.toFixed(1)},${ey.toFixed(1)} Q${mxp.toFixed(1)},${myp.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`);
        }
        setAttr(f.conn, "stroke-dasharray", `${cp.toFixed(3)} 1`);
      }
      // the sweep line
      const sw = t >= T.sw0 - 0.05 && t <= T.sw1 + 0.05;
      const sx = sweepX(t);
      const so = sw ? win(t, T.sw0 - 0.05, T.sw1 + 0.05, 0.1, 0.15) : 0;
      put(sweep, { x: sx - 1.5, o: so });
      put(sweepGlow, { x: R ? sx : sx - 160, o: so });
    }

    // ----------------------------------------------------------- ring (donut → logo ring)
    let ringVisible = false;
    function ringScene(t) {
      // appearance (scene 2) and the final return (scene 10)
      const draw = prog(t, T.s2 - 0.05, T.s2 + 0.9, E.inOutCubic);
      const fDraw = prog(t, T.s10 + 0.3, T.s10 + 0.95, E.inOutCubic);
      const inFinal = t >= T.s10;
      const base = inFinal
        ? { cx: CX, cy: 520, r: 150, th: 26 }
        : { cx: CX, cy: CY, r: 190, th: 30 };
      const drawP = inFinal ? fDraw : draw;
      // obligation share: 10% maaser (+ chomesh segment appears on the obligations beat)
      const chom = inFinal ? 0 : prog(t, T.obligations, T.obligations + 0.5) * (1 - prog(t, T.col0, T.col0 + 0.3));
      const explode = (inFinal ? 1 : prog(t, T.s2 + 0.6, T.s2 + 1.3, E.outBack)) * 12;
      let g = { ...base, a0: 27, a1: 63, off: explode, gth: base.th };
      // morph targets
      const target = inFinal ? stackRing : wideRing;
      const mp = inFinal ? prog(t, T.brand - 0.05, T.brand + 0.6, E.inOutCubic) : prog(t, T.m0, T.m1, E.inOutCubic);
      if (mp > 0) {
        g = {
          cx: lerp(g.cx, target.cx, mp), cy: lerp(g.cy, target.cy, mp), r: lerp(g.r, target.r, mp), th: lerp(g.th, target.th, mp),
          a0: lerp(g.a0, target.a0, mp), a1: lerp(g.a1, target.a1, mp),
          off: lerp(g.off, target.wedgeR - target.r, mp), gth: lerp(g.gth, target.wedgeTh * 0.92, mp),
        };
      }
      // collapse pulse
      const pulse = Math.sin(clamp((t - (T.col0 + 0.3)) / 0.35) * Math.PI) * 0.035;
      g.r *= 1 + pulse;
      const vis = inFinal ? fDraw > 0 : draw > 0;
      // fade out once the real logo takes over
      const handoff = inFinal ? prog(t, T.brand + 0.45, T.brand + 0.62) : prog(t, T.m1 - 0.12, T.m1 + 0.02);
      const o = (vis ? 1 : 0) * (1 - handoff) * (inFinal ? 1 : 1 - prog(t, T.s4 - 0.1, T.s4, E.linear));
      ringVisible = o > 0.001;
      setAttr(ringSvg, "opacity", o.toFixed(3));
      const gap = 3.2;
      const sweepDeg = 360 * drawP;
      // teal arc runs from the end of the gold segment around to its start
      const t0 = g.a1 + gap + (chom * 36), t1 = g.a0 - gap + 360;
      setAttr(tealArc, "d", arc(g.cx, g.cy, g.r, t0, Math.min(t1, t0 + sweepDeg)));
      setAttr(tealArc, "stroke-width", g.th.toFixed(2));
      setAttr(trackC, "cx", g.cx); setAttr(trackC, "cy", g.cy); setAttr(trackC, "r", (g.r).toFixed(2));
      setAttr(trackC, "stroke-width", (g.th).toFixed(2));
      setAttr(trackC, "opacity", (inFinal ? 0 : 0.6 * (1 - mp)).toFixed(3));
      const mid = ((g.a0 + g.a1) / 2) * Math.PI / 180;
      const ox = Math.sin(mid) * g.off, oy = -Math.cos(mid) * g.off;
      const gp = prog(drawP, 0.55, 1);
      setAttr(goldArc, "d", arc(g.cx + ox, g.cy + oy, g.r, g.a0, lerp(g.a0, g.a1, gp)));
      setAttr(goldArc, "stroke-width", g.gth.toFixed(2));
      setAttr(chomArc, "d", arc(g.cx + ox * 0.6, g.cy + oy * 0.6, g.r, g.a1 + 1.5, g.a1 + 1.5 + 34 * chom));
      setAttr(chomArc, "stroke-width", (g.th * 0.9).toFixed(2));
      setAttr(chomArc, "opacity", chom.toFixed(3));

      // centre label: number that the fragments keep changing
      const vals = K.values;
      const beats = [T.income, T.donations, T.months + 0.3, T.obligations + 0.12, T.recurring];
      let v = 0;
      let prev = 0;
      for (let i = 0; i < beats.length; i++) {
        const p = prog(t, beats[i], beats[i] + 0.45, E.outCubic);
        if (p > 0) { v = lerp(prev, vals[i], p); }
        prev = vals[i];
      }
      // "harder to keep track": the number keeps rolling, never settling
      const roll = prog(t, T.harder + 0.15, T.harder + 0.4) * (1 - prog(t, T.freeze - 0.25, T.freeze + 0.05));
      if (roll > 0) {
        const k = Math.floor((t - T.harder) / 0.16);
        const a = vals[Math.abs(k * 7) % vals.length], b = vals[Math.abs((k + 1) * 7 + 3) % vals.length];
        const f = ((t - T.harder) / 0.16) % 1;
        v = lerp(v, lerp(a, b, E.inOutQuad(f)), roll);
      }
      setText(ringVal, money(v));
      const lo = prog(t, T.income - 0.1, T.income + 0.3) * (1 - prog(t, T.col0 - 0.05, T.col0 + 0.2));
      put(ringLabel, { o: lo, s: lerp(0.94, 1, prog(t, T.income - 0.1, T.income + 0.4, E.outCubic)), blur: roll * 0.6 });
    }

    // ----------------------------------------------------------- logo reveal (scene 3) + final (scene 10)
    function logoScene(t) {
      // scene 3: letters reveal outward from the ring (clip from the ring's side)
      const lr = prog(t, T.m0 + 0.3, T.m1 + 0.2, E.inOutCubic);
      const ringCxLocal = wideRing.cx - WIDE_X;
      const leftEdge = lerp(ringCxLocal, 0, lr);
      setStyle(wideLettersBox, "clipPath", `inset(-40px -40px -40px ${leftEdge.toFixed(1)}px)`);
      const ringOn = prog(t, T.m1 - 0.14, T.m1 + 0.02);
      // scene 4: the wide logo flies into the app sidebar
      const fly = prog(t, T.s4, T.s4 + 0.75, E.inOutCubic);
      const slot = { x: WIN_X + WIN_S * (R ? WIN_VW - 66 + 13 : 13), y: WIN_Y + WIN_S * 14, w: 40 * WIN_S };
      const k = lerp(1, slot.w / WIDE_W * 1.9, fly);
      const lx = lerp(WIDE_X, slot.x - (WIDE_W * k - slot.w) / 2, fly);
      const ly = lerp(WIDE_Y, slot.y, fly);
      const lo = (1 - prog(t, T.s4 + 0.35, T.s4 + 0.7, E.linear)) * (t < T.s10 ? 1 : 0);
      put(wideLettersBox, { x: lx - WIDE_X, y: ly - WIDE_Y, s: k, o: lr > 0 ? lo : 0 });
      put(wideRingBox, { x: lx - WIDE_X, y: ly - WIDE_Y, s: k, o: ringOn * lo });
      wideLettersBox.style.transformOrigin = "0 0"; wideRingBox.style.transformOrigin = "0 0";
      // order tagline
      const tagOut = prog(t, T.s4 - 0.2, T.s4 + 0.12, E.inCubic);
      orderTagW.forEach((el, i) => {
        const p = prog(t, T.tag + i * 0.32, T.tag + i * 0.32 + 0.55, E.outQuint);
        put(el, { y: lerp(70, 0, p) - tagOut * 30, o: p * (1 - tagOut) });
      });
      // scene 10: stacked logo resolves from the ring
      const sp = prog(t, T.brand + 0.05, T.brand + 0.75, E.inOutCubic);
      const ringCx = stackRing.cx - STACK_X, ringCy = stackRing.cy - STACK_Y;
      setStyle(stackLettersBox, "clipPath", `circle(${(sp * 460).toFixed(1)}px at ${ringCx.toFixed(1)}px ${ringCy.toFixed(1)}px)`);
      put(stackLettersBox, { o: prog(sp, 0, 0.45, E.linear) });
      put(stackRingBox, { o: prog(t, T.brand + 0.45, T.brand + 0.62) });
    }

    // ----------------------------------------------------------- app window scenes 4–9
    let page = null;
    function appScene(t) {
      // window visibility / placement
      const wIn = prog(t, T.s4 + 0.2, T.s4 + 0.8, E.outCubic);
      const wOut8 = prog(t, T.s8, T.s8 + 0.4, E.inOutQuad);
      const wIn8 = prog(t, T.hal - 0.1, T.hal + 0.5, E.outCubic);
      let o = t < T.s8 ? wIn : lerp(1 - wOut8, 1, wIn8 > 0 ? wIn8 : 0);
      if (t >= T.s8 && t < T.hal - 0.1) o = 1 - wOut8;
      if (t >= T.hal - 0.1) o = wIn8;
      // scene 9: pull out to the centre; scene 10: converge
      const pull = prog(t, T.s9, T.s9 + 0.95, E.inOutCubic);
      const conv = prog(t, T.s10, T.s10 + 0.45, E.inCubic);
      const s9 = 0.5;
      const cxT = CX - (WIN_VW * s9) / 2, cyT = 600 - (WIN_VH * s9) / 2;
      let sc = lerp(WIN_S * lerp(0.965, 1, wIn), s9, pull);
      let wx = lerp(WIN_X + (WIN_VW * WIN_S * (1 - lerp(0.965, 1, wIn))) / 2, cxT, pull);
      let wy = lerp(WIN_Y + (WIN_VH * WIN_S * (1 - lerp(0.965, 1, wIn))) / 2, cyT, pull);
      if (conv > 0) {
        const s2 = lerp(s9, 0.04, conv);
        wx = lerp(wx, CX - (WIN_VW * s2) / 2, conv); wy = lerp(wy, 520 - (WIN_VH * s2) / 2, conv); sc = s2;
        o *= 1 - prog(t, T.s10 + 0.18, T.s10 + 0.42);
      }
      winState.x = wx; winState.y = wy; winState.s = sc;
      put(winEl, { x: wx, y: wy, s: sc, o });

      // which page
      const pages = [
        [dash.el, t < T.s5 + 0.35 || t >= T.s9 + 0.05],
        [table.el, t >= T.s5 && t < T.s8],
        [hal.el, t >= T.s8 && t < T.s9 + 0.4],
      ];
      const pageFade = (el, a, b) => (t < a ? 0 : t < a + 0.35 ? prog(t, a, a + 0.35) : t < b ? 1 : 1 - prog(t, b, b + 0.35));
      put(dash.el, { o: t < T.s9 ? 1 - prog(t, T.s5, T.s5 + 0.35) : prog(t, T.s9 + 0.05, T.s9 + 0.4) });
      put(table.el, { o: pageFade(table.el, T.s5, T.s8 + 0.2), x: (1 - prog(t, T.s5, T.s5 + 0.45, E.outCubic)) * (R ? -30 : 30) });
      put(hal.el, { o: t >= T.s9 ? 1 - prog(t, T.s9 + 0.05, T.s9 + 0.4) : (t >= T.hal - 0.1 ? 1 : 0) });
      void pages; void page;

      // sidebar highlight
      const navFrom = t < T.s5 ? 0 : t < T.hal ? 0 : t < T.s9 ? 2 : 4;
      const navTo = t < T.s5 ? 0 : t < T.hal ? 2 : t < T.s9 ? 4 : 0;
      const navP = t < T.s5 ? 1 : t < T.hal ? prog(t, T.s5 + 0.05, T.s5 + 0.45) : t < T.s9 ? 1 : prog(t, T.s9, T.s9 + 0.4);
      const ny = lerp(side.slotY(navFrom), side.slotY(navTo), navP);
      put(side.hl, { x: 8, y: ny - (navTo === 0 && navFrom === 0 ? 0 : 0) });
      side.hl.style.top = "0px"; side.hl.style.left = "0px";
      put(side.bar, { x: R ? 62 : 1, y: ny + 9 });
      side.bar.style.top = "0px"; side.bar.style.left = "0px";

      // ---------- dashboard values (scene 4) ----------
      const D = C.data;
      const cnt = prog(t, T.s4 + 0.3, T.s4 + 1.1, E.outCubic);
      const cP = prog(t, T.chomesh + 0.18, T.chomesh + 0.9, E.outCubic);
      const inc = D.incomeBase * cnt + D.chomeshIncome * cP;
      const maaser = (D.incomeBase * 0.1 - D.donations) * cnt;
      const chom = D.chomeshIncome * 0.2 * cP;
      dash.set({ inc, chom: D.chomeshIncome * cP, exp: D.expenses * cnt, don: D.donations * cnt, maaser, chomesh: chom, showChomesh: cP > 0 });
      // card entrance
      [dash.overall, dash.income, dash.expenses, dash.donations].forEach((c, i) => {
        const p = prog(t, T.s4 + 0.2 + i * 0.07, T.s4 + 0.75 + i * 0.07, E.outCubic);
        put(c.el, { y: (1 - p) * 26, o: p });
      });
      // maaser / chomesh chip emphasis
      const mHi = win(t, T.maaser - 0.05, T.chomesh - 0.1, 0.2, 0.3);
      const cHi = win(t, T.chomesh + 0.25, A.e("maaser") + 0.7, 0.25, 0.4);
      put(dash.chipM, { s: 1 + 0.12 * mHi });
      setStyle(dash.chipM, "boxShadow", mHi > 0.01 ? `0 0 0 ${3 * mHi}px rgba(37,99,235,${0.35 * mHi})` : "none");
      const chipPop = prog(t, T.chomesh + 0.18, T.chomesh + 0.6, E.outBack);
      put(dash.chipC, { s: (0.6 + 0.4 * chipPop) * (1 + 0.12 * cHi), o: chipPop });
      setStyle(dash.chipC, "boxShadow", cHi > 0.01 ? `0 0 0 ${3 * cHi}px rgba(202,138,4,${0.45 * cHi})` : "none");
      put(dash.incFoot, { o: cP });
      // together highlights (scene 9)
      const glow = (c, tt, col) => {
        const g = win(t, tt - 0.1, tt + 0.9, 0.2, 0.45);
        setStyle(c.el, "outline", g > 0.01 ? `${(4 * g).toFixed(1)}px solid ${col}` : "none");
        setStyle(c.el, "outlineOffset", "3px");
        if (t >= T.s9) put(c.el, { s: 1 + 0.05 * g, o: 1 });
      };
      glow(dash.income, T.tInc, "rgba(22,163,74,0.75)");
      glow(dash.donations, T.tDon, "rgba(202,138,4,0.8)");
      glow(dash.overall, T.tObl, "rgba(37,99,235,0.75)");

      // ---------- camera ----------
      const zIn = prog(t, T.s4 + 0.75, T.s4 + 1.6, E.inOutCubic) * (1 - prog(t, T.s5, T.s5 + 0.5, E.inOutCubic));
      const zc = { k: 1.2, x: R ? WIN_VW - 1.2 * WIN_VW : 0, y: 0 };
      let ck = lerp(1, zc.k, zIn), cx = lerp(0, zc.x, zIn), cy = lerp(0, zc.y, zIn);
      // halacha: slow, calm push-in
      const hp = prog(t, T.hal, T.q + 0.3, E.inOutQuad) * (1 - prog(t, T.q + 0.3, T.q + 0.9));
      if (hp > 0) { const z = camFocus(1 + 0.06 * hp, WIN_VW / 2, 380); ck = z.k; cx = z.x; cy = z.y; }
      camState.k = ck; camState.x = cx; camState.y = cy;
      put(cam, { x: cx, y: cy, s: ck });

      // ---------- table: import + recurring (scenes 5–6) ----------
      const r0 = T.s5 + 1.2;
      table.rows.forEach((r, i) => {
        const manual = i === 5;
        const ti = r0 + (i < 5 ? i : i - 1) * 0.055;
        const p = manual ? 1 : prog(t, ti, ti + 0.42, E.outCubic);
        const reslot = prog(t, r0 - 0.05, r0 + 0.45, E.inOutCubic);
        const slotY = manual ? lerp(0, 5 * 52, reslot) : i * 52;
        put(r.el, { y: slotY - i * 52 - (1 - p) * 34, o: p });
      });
      const hlRow = win(t, T.s6, T.s7 + 0.3, 0.25, 0.35);
      setStyle(table.rows[7].el, "boxShadow", hlRow > 0.01 ? `inset 0 0 0 2px rgba(17,103,106,${(0.55 * hlRow).toFixed(3)})` : "none");
      setStyle(table.rows[7].el, "background", hlRow > 0.01 ? `rgba(17,103,106,${(0.06 * hlRow).toFixed(3)})` : "#fff");
      put(table.importBtn, { s: 1 + 0.08 * Math.sin(clamp((t - (T.s5 + 0.72)) / 0.35) * Math.PI) });

      // veil dims the app while overlays (calendar, email) take focus
      const veilO = win(t, T.recWord - 0.1, T.s8 + 0.1, 0.4, 0.3) * 0.86;
      put(veil, { o: veilO });

      // ---------- halacha (scene 8) ----------
      const tabs = [0, 4, 6];
      const tp1 = prog(t, T.tab1, T.tab1 + 0.5, E.inOutCubic), tp2 = prog(t, T.tab2, T.tab2 + 0.5, E.inOutCubic);
      const pillIdx = lerp(lerp(tabs[0], tabs[1], tp1), tabs[2], tp2);
      put(hal.pill, { y: 10 + pillIdx * 54 - 0 });
      hal.pill.style.top = "0px";
      hal.items.forEach((it, i) => setStyle(it, "color", Math.abs(pillIdx - i) < 0.5 ? "hsl(41 51% 13%)" : "hsl(47 15% 30%)"));
      hal.items.forEach((it, i) => setStyle(it, "fontWeight", Math.abs(pillIdx - i) < 0.5 ? "600" : "400"));
      const artO = [1 - tp1, tp1 * (1 - tp2), tp2];
      hal.arts.forEach((a, i) => put(a, { o: artO[i], y: (1 - artO[i]) * 10 }));
      put(hal.title, { o: prog(t, T.hal + 0.42, T.hal + 0.5) });

      // ---------- ask the rabbi ----------
      const ripple = clamp((t - (T.fabPress - 0.35)) / 0.7);
      put(fabRipple, { s: 1 + ripple * 0.7, o: ripple > 0 && ripple < 1 ? 0.6 * (1 - ripple) : 0 });
      const press = Math.sin(clamp((t - T.fabPress) / 0.22) * Math.PI);
      const fabVis = t >= T.hal ? prog(t, T.hal + 0.2, T.hal + 0.6) * (1 - prog(t, T.s9, T.s9 + 0.3)) : 0;
      put(con.fab, { s: 1 - 0.1 * press, o: fabVis });
      con.fab.style.transformOrigin = "50% 50%";
      const dlgIn = prog(t, T.dlg, T.dlg + 0.35, E.outCubic);
      const dlgOut = prog(t, T.send + 0.3, T.send + 0.6, E.inCubic);
      const dlgO = dlgIn * (1 - dlgOut);
      put(dim, { o: dlgO * 0.9 });
      put(con.el, { s: lerp(0.96, 1, dlgIn), o: dlgO, y: dlgOut * 12 });
      typeInto(con.subj, con.subjCaret, C.ui.contact.subject, t, T.subj0, T.subj1);
      typeInto(con.body, con.bodyCaret, C.ui.contact.body, t, T.body0, T.body1);
      put(con.subjCaret, { o: t >= T.subj0 && t < T.subj1 + 0.1 ? 1 : 0 });
      put(con.bodyCaret, { o: t >= T.body0 && t < T.send ? (Math.floor(t * 3) % 2 ? 1 : 0.2) : 0 });
      setStyle(con.bodyPh, "display", t < T.body0 ? "" : "none");
      const tabHi = win(t, T.rabbiWord - 0.1, T.rabbiWord + 0.9, 0.15, 0.4);
      setStyle(con.tabRabbi, "boxShadow", tabHi > 0.01 ? `0 0 0 ${(2.5 * tabHi).toFixed(1)}px rgba(17,103,106,0.55), 0 2px 8px -2px rgba(0,0,0,0.1)` : "0 2px 8px -2px rgba(0,0,0,0.1)");
      setStyle(con.tabRabbi, "color", tabHi > 0.3 ? "#11676a" : "");
      put(con.send, { s: 1 - 0.04 * Math.sin(clamp((t - T.send) / 0.2) * Math.PI) });
      const toastO = win(t, T.send + 0.25, T.s9 + 0.25, 0.25, 0.3);
      const toastW = con.toast.offsetWidth;
      put(con.toast, { x: (WIN_VW - toastW) / 2, y: (1 - prog(t, T.send + 0.25, T.send + 0.6, E.outCubic)) * 20, o: toastO });
    }
    function typeInto(el, caret, text, t, a, b) {
      const chars = [...text];
      const n = Math.round(chars.length * clamp((t - a) / (b - a)));
      setText(el, chars.slice(0, n).join(""));
    }

    // ----------------------------------------------------------- overlays (scenes 4–8)
    function overlays(t) {
      // chomesh transaction form (scene 4)
      const txIn = prog(t, T.chomesh - 0.6, T.chomesh - 0.2, E.outCubic);
      const txOut = prog(t, A.e("maaser") + 0.15, A.e("maaser") + 0.5, E.inCubic);
      put(tx.el, { x: mx(170, 520), y: 560 + (1 - txIn) * 40 + txOut * 30, o: txIn * (1 - txOut) });
      const on = t >= T.chomesh - KW_LEAD;
      tx.toggle.classList.toggle("on", on);
      put(tx.toggle, { s: 1 + 0.06 * Math.sin(clamp((t - T.chomesh + KW_LEAD) / 0.25) * Math.PI) });

      // import (scene 5)
      const fIn = prog(t, T.s5 + 0.12, T.s5 + 0.72, E.inOutCubic);
      const btn = v2s(importPos.x + importPos.w / 2, importPos.y + importPos.h / 2);
      const fw = file.el.offsetWidth, fh = file.el.offsetHeight;
      const start = { x: R ? 1560 : W - 1560 - fw, y: 880 };
      const fx = lerp(start.x, btn.x - fw / 2, fIn);
      const fy = lerp(start.y, btn.y - fh / 2, fIn) - Math.sin(fIn * Math.PI) * 90;
      const fOut = prog(t, T.s5 + 0.62, T.s5 + 0.86, E.inCubic);
      put(file.el, { x: fx, y: fy, s: lerp(1, 0.35, fOut), o: prog(t, T.s5 + 0.1, T.s5 + 0.3) * (1 - fOut) });
      file.el.style.transformOrigin = "50% 50%";
      // stepper: prepare → upload → map columns → review
      const stIn = win(t, T.s5 + 0.74, T.s5 + 1.5, 0.2, 0.3);
      const stP = prog(t, T.s5 + 0.8, T.s5 + 1.2, E.inOutQuad);
      const sw = step.el.offsetWidth;
      const tb = v2s(tblPos.x + tblPos.w / 2, tblPos.y + 48 + 52 + 120);
      put(step.el, { x: tb.x - sw / 2, y: tb.y + (1 - stIn) * 16, o: stIn });
      step.barI.style.width = `${(stP * 100).toFixed(1)}%`;
      step.sts.forEach((st, i) => {
        const onI = stP >= i / (step.sts.length - 1) - 0.001;
        st.dot.classList.toggle("on", onI);
        st.e.classList.toggle("on", onI);
      });

      // recurring (scene 6): the row's date lifts out and becomes a calendar
      const r7 = rowPos(7);
      const dateS = v2s(r7.x + (R ? tblPos.w - 70 : 70), r7.y + 26);
      const CAL = { x: mx(700, 470), y: 214 };
      const calIn = prog(t, T.recWord - 0.05, T.recWord + 0.5, E.outCubic);
      const calOut = prog(t, T.remindWord + 0.05, T.remindWord + 0.4, E.inCubic);
      put(cal.el, { x: lerp(dateS.x - 235, CAL.x, calIn), y: lerp(dateS.y - 60, CAL.y, calIn), s: lerp(0.3, 1, calIn), o: calIn * (1 - calOut) });
      cal.el.style.transformOrigin = "50% 0";
      const flips = [T.flip1, T.flip2, T.s7];
      let mi = 0;
      flips.forEach((ft) => { if (t >= ft) mi++; });
      cal.names.forEach((n, i) => {
        const pin = i === 0 ? 1 : prog(t, flips[i - 1], flips[i - 1] + 0.35, E.outCubic);
        const pout = i < flips.length ? prog(t, flips[i], flips[i] + 0.3, E.inCubic) : 0;
        put(n, { y: (1 - pin) * 30 - pout * 30, o: pin * (1 - pout) });
      });
      cal.grids.forEach((g, i) => {
        const pin = i === 0 ? 1 : prog(t, flips[i - 1], flips[i - 1] + 0.35);
        const pout = i < flips.length ? prog(t, flips[i], flips[i] + 0.25) : 0;
        put(g.g, { o: pin * (1 - pout) });
      });
      // mark on the 10th of each month
      const markMonth = Math.min(mi, 2);
      const mp = cal.cellPos(markMonth, C.ui.recurring.day);
      const markPop = mi === 0 ? prog(t, T.recWord + 0.35, T.recWord + 0.65, E.outBack) : prog(t, flips[mi - 1] + 0.12, flips[mi - 1] + 0.42, E.outBack);
      put(cal.mark, { x: mp.x - 28, y: mp.y - 23, s: markPop, o: mi <= 2 ? markPop : 0 });
      cal.mark.style.transformOrigin = "50% 50%";
      // the date chip flying from the table into the calendar
      const dfp = prog(t, T.recWord - 0.05, T.recWord + 0.45, E.inOutCubic);
      const markStage = { x: CAL.x + 24 + mp.x, y: CAL.y + 22 + 36 + 12 + mp.y };
      put(dateFly, { x: lerp(dateS.x - 50, markStage.x - 50, dfp), y: lerp(dateS.y - 16, markStage.y - 16, dfp), o: dfp > 0 && dfp < 1 ? 1 : 0 });
      // generated transactions stack up
      recRows.forEach((rr, i) => {
        const ft = flips[i] + 0.15;
        const p = prog(t, ft, ft + 0.5, E.outCubic);
        const out = prog(t, T.s7, T.s7 + 0.35, E.inCubic);
        const target = { x: mx(150, 520), y: 300 + i * 78 };
        const w = 520;
        put(rr.el, { x: lerp(markStage.x - w / 2, target.x, p), y: lerp(markStage.y - 30, target.y, p) - out * 20, s: lerp(0.4, 1, p), o: p * (1 - out) });
        rr.el.style.width = `${w}px`;
        rr.el.style.transformOrigin = "50% 50%";
      });

      // reminders (scene 7): reminder day on the calendar → notification → email
      const bp = cal.cellPos(2, C.ui.email.reminderDay);
      const bellP = prog(t, T.s7 + 0.25, T.s7 + 0.55, E.outBack);
      put(cal.bell, { x: bp.x - 28, y: bp.y - 23, s: bellP, o: bellP });
      cal.bell.style.transformOrigin = "50% 50%";
      const bellStage = { x: CAL.x + 24 + bp.x, y: CAL.y + 22 + 36 + 12 + bp.y };
      const ib = prog(t, T.remindWord - 0.1, T.remindWord + 0.35, E.outCubic);
      const ibOut = prog(t, T.remindWord + 0.5, T.remindWord + 0.72);
      const IB = { x: mx(394, 560), y: 470 };
      put(inbox.el, { x: lerp(bellStage.x - 280, IB.x, ib), y: lerp(bellStage.y - 37, IB.y, ib), s: lerp(0.2, 1, ib), o: ib * (1 - ibOut) });
      inbox.el.style.transformOrigin = "50% 50%";
      const me = prog(t, T.remindWord + 0.48, T.remindWord + 0.98, E.outCubic);
      const mOut = prog(t, T.s8 + 0.05, T.s8 + 0.45, E.inOutQuad);
      const MAIL = { x: mx(394, 560), y: 205 };
      put(mail.el, { x: MAIL.x, y: lerp(IB.y - 140, MAIL.y, me), s: lerp(0.94, 1, me), o: me * (1 - mOut) });
      mail.el.style.transformOrigin = "50% 50%";
      put(mail.amt, { o: t >= T.s8 + 0.02 ? 0 : 1 });

      // scene 8: the amount floats free, then becomes words
      const amtStage = { x: MAIL.x + 32 + mailAmtPos.x, y: MAIL.y + mailAmtPos.y };
      const fa = prog(t, T.s8 + 0.05, T.s8 + 1.0, E.inOutCubic);
      const faOut = prog(t, T.numbers - 0.05, T.numbers + 0.55, E.inOutQuad);
      const faW = floatAmt.offsetWidth;
      const amtTarget = { x: CX - faW / 2, y: CY - 30 };
      put(floatAmt, { x: lerp(amtStage.x + (mail.amt.offsetWidth - faW) / 2, amtTarget.x, fa), y: lerp(amtStage.y, amtTarget.y, fa), s: lerp(1, 2.6, fa), o: (t >= T.s8 ? 1 : 0) * (1 - faOut), blur: faOut * 10 });
      constel.forEach((c) => {
        const w = c.el.offsetWidth;
        const p = prog(t, T.s8 + 0.35 + c.i * 0.07, T.s8 + 1.05 + c.i * 0.07, E.outCubic);
        const dissolve = prog(t, T.numbers - 0.1 + (c.i % 4) * 0.05, T.numbers + 0.45 + (c.i % 4) * 0.05, E.inOutQuad);
        const drift = (t - T.s8) * 9;
        put(c.el, { x: CX + c.dx * lerp(0.85, 1, p) - w / 2, y: CY + c.dy * lerp(0.85, 1, p) - 20 - drift * (c.dy < 0 ? 1 : -0.6), o: p * (1 - dissolve), blur: dissolve * 8 + (1 - p) * 4 });
      });
      const ftIn = prog(t, T.numbers + 0.1, T.numbers + 0.7, E.outCubic);
      const ftFly = prog(t, T.hal, T.hal + 0.5, E.inOutCubic);
      const ftW = floatTitle.offsetWidth;
      const titleStage = v2s(halTitlePos.x, halTitlePos.y);
      const tk = lerp(2.4, winState.s * camState.k, ftFly);
      put(floatTitle, {
        x: lerp(CX - ftW / 2, titleStage.x + (ftW * winState.s * camState.k - ftW) / 2, ftFly),
        y: lerp(CY - 22, titleStage.y + (36 * winState.s - 36) / 2, ftFly),
        s: tk, o: ftIn * (1 - prog(t, T.hal + 0.42, T.hal + 0.52)), blur: (1 - ftIn) * 10,
      });
    }

    // ----------------------------------------------------------- headlines
    function showHL(hl, t, tOut) {
      const out = prog(t, tOut, tOut + 0.4, E.inCubic);
      hl.lines.forEach((l, i) => {
        const p = prog(t, l.t, l.t + 0.6, E.outQuint);
        put(l.inner, { y: lerp(l.size * 1.1, 0, p) - out * l.size * 0.5, o: p * (1 - prog(t, tOut + i * 0.03, tOut + 0.3 + i * 0.03, E.linear)) });
      });
    }
    // headline → exit time (also used by the readability QA report)
    const HL_OUT = [
      ...[hlMaaser, hlImport, hlRec, hlRemind, hlHal, hlRabbi].map((hl, i) => [hl, HLDEF[i].out]),
      [hlTogether, T.s10], [tagline, T.end],
    ];
    function headlines(t) {
      for (const [hl, tOut] of HL_OUT) showHL(hl, t, tOut);
      const u = prog(t, T.url, T.url + 0.7, E.outCubic);
      put(urlEl, { y: (1 - u) * 16, o: u });
      put(urlRule, { sx: prog(t, T.url - 0.2, T.url + 0.5, E.inOutCubic), o: prog(t, T.url - 0.2, T.url) });
    }

    // ----------------------------------------------------------- scene 9 tiles
    function buildTiles() {
      const snap = (el, w, hgt, k, ox = 0, oy = 0) => {
        const c = el.cloneNode(true);
        c.style.position = "absolute";
        c.style.left = `${ox}px`; c.style.top = `${oy}px`; c.style.right = "auto";
        c.style.transform = `scale(${k})`; c.style.transformOrigin = R ? "100% 0" : "0 0";
        c.style.opacity = "1"; c.style.visibility = "visible";
        if (R) { c.style.left = "auto"; c.style.right = `${ox}px`; }
        const box = h("div", { class: "abs", style: { width: `${w}px`, height: `${hgt}px`, borderRadius: "16px", overflow: "hidden", background: "#fff", border: "1px solid hsl(48 13% 86%)", boxShadow: "0 24px 50px -22px rgba(20,40,30,0.35)" } }, c);
        return box;
      };
      // freeze clones in their final visual state
      const tableSnip = h("div", { style: { width: "1286px", position: "relative" } });
      const tbClone = table.tbl.cloneNode(true);
      tbClone.style.position = "relative"; tbClone.style.top = "0"; tbClone.style.left = "0"; tbClone.style.right = "0";
      tbClone.querySelectorAll(".tr").forEach((r) => { r.style.transform = "none"; r.style.opacity = "1"; r.style.visibility = "visible"; });
      tableSnip.append(tbClone);
      cal.grids.forEach((g, i) => { g.g.style.opacity = i === 1 ? "1" : "0"; });
      cal.names.forEach((n, i) => { n.style.opacity = i === 1 ? "1" : "0"; n.style.transform = "none"; n.style.visibility = i === 1 ? "visible" : "hidden"; });
      const calClone = cal.el.cloneNode(true);
      const mk = calClone.querySelector(".mark"); const mpos = cal.cellPos(1, C.ui.recurring.day);
      mk.style.transform = `translate(${mpos.x - 28}px, ${mpos.y - 23}px)`; mk.style.opacity = "1"; mk.style.visibility = "visible";
      calClone.querySelector(".bell").style.visibility = "hidden";
      calClone.style.boxShadow = "none"; calClone.style.border = "0";
      step.barI.style.width = "100%";
      step.sts.forEach((st) => { st.dot.classList.add("on"); st.e.classList.add("on"); });
      const stepClone = step.el.cloneNode(true);
      step.barI.style.width = "0%";
      step.sts.forEach((st) => { st.dot.classList.remove("on"); st.e.classList.remove("on"); });
      const mailClone = mail.el.cloneNode(true); mailClone.style.boxShadow = "none"; mailClone.style.border = "0";
      const halClone = hal.el.cloneNode(true);
      halClone.querySelectorAll(".hart").forEach((a, i) => { a.style.opacity = i === 2 ? "1" : "0"; a.style.visibility = i === 2 ? "visible" : "hidden"; a.style.transform = "none"; });
      const pl = halClone.querySelector(".pill"); pl.style.transform = `translateY(${10 + 6 * 54}px)`;
      const dlgClone = con.el.cloneNode(true); dlgClone.style.boxShadow = "none"; dlgClone.style.border = "0"; dlgClone.style.transform = "none";
      dlgClone.querySelectorAll("span").forEach((sp) => { if (sp.className === "ph") sp.remove(); });
      const spans = dlgClone.querySelectorAll(".finput > span");
      if (spans[0]) spans[0].textContent = C.ui.contact.subject;
      if (spans[1]) spans[1].textContent = C.ui.contact.body;
      dlgClone.querySelectorAll(".caret").forEach((c) => c.remove());
      const TW = 360, TH = 214;
      const defsT = [
        { el: snap(tableSnip, TW, TH, 0.36, 12, 12) },
        { el: snap(stepClone, TW, TH, 0.66, 16, 40) },
        { el: snap(calClone, TW, TH, 0.52, 18, 4) },
        { el: snap(mailClone, TW, TH, 0.62, 6, 0) },
        { el: snap(halClone, TW, TH, 0.25, 4, 2) },
        { el: snap(dlgClone, TW, TH, 0.6, 12, -4) },
      ];
      // reading-order columns: first three on the reading-start side
      const colA = R ? 1440 : 120, colB = R ? 120 : 1440;
      const ys = [262, 492, 722];
      defsT.forEach((d, i) => {
        d.x = i < 3 ? colA : colB;
        d.y = ys[i % 3];
        d.w = TW; d.h = TH;
        tilesLayer.append(d.el);
        d.conn = s("path", { fill: "none", stroke: "rgba(17,103,106,0.35)", "stroke-width": 2, pathLength: 1, "stroke-dasharray": "0 1" });
        d.dotA = s("circle", { r: 5, fill: "#11676a" });
        d.dotB = s("circle", { r: 5, fill: "#f0c000" });
        tileConn.append(d.conn, d.dotA, d.dotB);
      });
      return defsT;
    }
    function tilesScene(t) {
      const conv = prog(t, T.s10 - 0.05, T.s10 + 0.15, E.linear);
      const winBox = { x: CX - (WIN_VW * 0.5) / 2, y: 600 - (WIN_VH * 0.5) / 2, w: WIN_VW * 0.5, h: WIN_VH * 0.5 };
      tiles.forEach((d, i) => {
        const t0 = T.s9 + 0.45 + i * 0.1;
        const p = prog(t, t0, t0 + 0.6, E.outCubic);
        const cx0 = CX - d.w / 2, cy0 = 600 - d.h / 2;
        let x = lerp(cx0, d.x, p), y = lerp(cy0, d.y, p), sc = lerp(0.6, 1, p);
        const ci = prog(t, T.s10 + i * 0.025, T.s10 + 0.4 + i * 0.025, E.inCubic);
        x = lerp(x, CX - d.w / 2, ci); y = lerp(y, 520 - d.h / 2, ci); sc *= lerp(1, 0.1, ci);
        put(d.el, { x, y, s: sc, o: p * (1 - prog(t, T.s10 + 0.15 + i * 0.025, T.s10 + 0.4 + i * 0.025)) });
        d.el.style.transformOrigin = "50% 50%";
        // connector from tile edge to the app window
        const cp = prog(t, t0 + 0.35, t0 + 0.9, E.inOutCubic) * (1 - conv);
        const leftSide = d.x < CX;
        const ax = leftSide ? d.x + d.w : d.x, ay = d.y + d.h / 2;
        const bx = leftSide ? winBox.x : winBox.x + winBox.w, by = lerp(winBox.y + 60, winBox.y + winBox.h - 60, (i % 3) / 2);
        const mxp = (ax + bx) / 2;
        setAttr(d.conn, "d", `M${ax},${ay} C${mxp},${ay} ${mxp},${by} ${bx},${by}`);
        setAttr(d.conn, "stroke-dasharray", `${cp.toFixed(3)} 1`);
        setAttr(d.dotA, "cx", ax); setAttr(d.dotA, "cy", ay); setAttr(d.dotA, "opacity", (cp > 0.02 ? 1 : 0) * (1 - conv));
        setAttr(d.dotB, "cx", bx); setAttr(d.dotB, "cy", by); setAttr(d.dotB, "opacity", (cp > 0.98 ? 1 : 0) * (1 - conv));
      });
    }

    // ----------------------------------------------------------- scene 10 extras
    const finalPct = h("div", { class: "abs hero10 num", style: { width: `${W}px`, top: `${520 - 52}px`, textAlign: "center", fontSize: "104px", transformOrigin: "50% 50%" } }, "10", h("span", { class: "pct" }, "%"));
    stage.insertBefore(finalPct, logoLayer);
    function finalScene(t) {
      const p = prog(t, T.s10 + 0.55, T.s10 + 1.0, E.outCubic);
      const out = prog(t, T.brand - 0.05, T.brand + 0.3, E.inCubic);
      put(finalPct, { s: lerp(0.9, 1, p) * lerp(1, 0.7, out), o: p * (1 - out), blur: out * 6 });
    }

    // ----------------------------------------------------------- cue plan
    function planCues() {
      frags.forEach((f) => cue(f.t0 + 0.05, f.month ? "tick" : "arrive", f.month ? 0.22 : f.t0 > T.harder ? 0.22 : 0.34));
      [T.income, T.donations, T.months + 0.3, T.obligations + 0.12, T.recurring].forEach((b) => cue(b + 0.05, "tick", 0.3));
      cue(T.sw0 + 0.05, "sweep", 0.7);
      cue(T.col0 + 0.34, "pop", 0.45);
      cue(T.s4 + 0.05, "whoosh", 0.32);
      cue(T.chomesh - KW_LEAD, "tap", 0.6);
      cue(T.chomesh + 0.2, "pop", 0.35);
      cue(T.s5 + 0.15, "whoosh", 0.38);
      cue(T.s5 + 0.72, "pop", 0.4);
      [0, 1, 2, 3].forEach((i) => cue(T.s5 + 0.8 + i * 0.13, "tick", 0.26));
      for (let i = 0; i < 11; i += 3) cue(T.s5 + 1.2 + i * 0.055, "arrive", 0.22);
      cue(T.recWord - 0.02, "pop", 0.32);
      cue(T.flip1, "calendar", 0.5); cue(T.flip2, "calendar", 0.5); cue(T.s7, "calendar", 0.42);
      cue(T.flip1 + 0.2, "arrive", 0.34); cue(T.flip2 + 0.2, "arrive", 0.34);
      cue(T.s7 + 0.32, "notify", 0.5);
      cue(T.remindWord + 0.5, "whoosh", 0.26);
      cue(T.hal, "whoosh", 0.22);
      cue(T.tab1, "tap", 0.28); cue(T.tab2, "tap", 0.28);
      cue(T.fabPress, "tap", 0.5);
      cue(T.dlg, "pop", 0.3);
      for (let x = T.subj0; x < T.subj1; x += 0.16) cue(x, "type", 0.14);
      for (let x = T.body0; x < T.body1; x += 0.18) cue(x, "type", 0.12);
      cue(T.send, "tap", 0.5);
      cue(T.send + 0.27, "notify", 0.3);
      tiles.forEach((_, i) => cue(T.s9 + 0.5 + i * 0.1, "pop", 0.2));
      [T.tInc, T.tDon, T.tObl].forEach((x) => cue(x, "tick", 0.24));
      cue(T.s10 + 0.05, "whoosh", 0.4);
      cue(T.brand, "resolve", 0.8);
      keywordSafeCues();
    }

    /**
     * Brief §25: no effect may sit on a spoken keyword's onset. Any cue that would land in
     * [onset − 60 ms, onset + 220 ms] of a keyword is moved to KW_LEAD before the word (the
     * visual it belongs to already starts there); a moved cue that now doubles another cue
     * within 50 ms is dropped. The long "resolve" bloom under "TEN10." is exempt: it is the
     * logo sting, mixed well below the voice and ducked by mix.py.
     */
    function keywordSafeCues() {
      const onsets = Object.keys(C.beats).map((k) => B(k)).sort((a, b) => a - b);
      for (const c of sfx) {
        if (c.type === "resolve") continue;
        const k = onsets.find((o) => c.t > o - 0.06 && c.t < o + 0.22);
        if (k !== undefined) { c.t = +(k - KW_LEAD).toFixed(3); c.moved = true; }
      }
      sfx.sort((a, b) => a.t - b.t || b.gain - a.gain);
      for (let i = sfx.length - 1; i > 0; i--) {
        const prev = sfx.slice(0, i).reverse().find((x) => !x.dropped);
        if (sfx[i].moved && prev && sfx[i].t - prev.t < 0.05) sfx[i].dropped = true;
      }
      for (let i = sfx.length - 1; i >= 0; i--) if (sfx[i].dropped) sfx.splice(i, 1);
    }

    /** Brief §22/§28: how long each piece of on-screen copy is fully readable. */
    function qa() {
      const rows = [];
      for (const [hl, tOut] of HL_OUT) {
        const seen = new Set();
        for (const l of hl.lines) {
          if (seen.has(l.g)) continue;
          seen.add(l.g);
          const text = hl.lines.filter((x) => x.g === l.g).map((x) => x.inner.textContent).join(" ");
          rows.push({ text, in: +(l.t + REVEAL_READ).toFixed(2), out: +tOut.toFixed(2), readable: +(tOut - l.t - REVEAL_READ).toFixed(2) });
        }
      }
      return rows;
    }

    measureHost.remove();
    return { duration: T.end, seek, times: T, qa, cues: () => ({ duration: T.end, cues: [...sfx].sort((a, b) => a.t - b.t) }) };
  }

  window.FILM = { init };
})();
