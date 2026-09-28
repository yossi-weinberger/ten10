// The TEN10 film in the geometry language (agreed in the style frames, film/frames.js).
//
// One continuous shot. The logo's ring (the "0") never leaves the screen: it moves, resizes and
// changes role, and its gold tenth (a 36° slice, centred like the logo's wedge) is the accent:
//   hook       the ring draws itself; the tenth drops into its slot: 10%
//   chaos      a household's money (income, donations, currencies, months, obligations, standing
//              orders) arrives on the spoken words and orbits the ring faster and faster
//   order      everything spirals into the ring, which becomes the "0" of the TEN10 wordmark
//   maaser     the ring is the income; its tenth is the maaser, an inner ring's 20% the chomesh
//   import     the ring is a spool: real rows wind onto it
//   recurring  the ring becomes the year and fills itself (12 × 360)
//   reminders  the dark spreads out of the ring; it rings; the reminder email slides out
//   analytics  the light returns; the ring pours the month's spending into columns
//   reports    the baseline becomes a printer slot; the report rises; the ring is its logo
//   not just   the report's numbers lift off
//   halacha    an open book; topics rise out of it; the ring becomes a lens and finds chomesh
//   rabbi      the lens becomes a speech bubble: "?", then Ask the Rabbi
//   trust      the ring frames the institute's emblem
//   platforms  web and desktop, drawn in the same geometry; the ring becomes a globe
//   together   every motif of the film orbits back into the ring: income, donations, obligations
//   end        the ring becomes the "0" of the stacked logo; tagline; free
// Words arrive as they are spoken (narration anchors on narration/timing.<lang>.json), so the whole
// film re-times itself to the recording. Deterministic: every frame is a pure function of t.
(function () {
  const { clamp, lerp, E, prog, win, makeAnchors, cue, sfx } = window.ENGINE;
  const KW = 0.14, TAU = Math.PI * 2;
  const TEAL = "#11676a", TEAL_D = "#0c4a4c", GOLD = "#f0c000", GOLD_D = "#b58c00", INK = "#1f1c12", BG = "#fcfaf1";
  const TYPE_COL = { income: "#16a34a", donation: "#e0a800", expense: "#dc2626" };
  // centred on the logo's own wedge (measured from public/logo: -0.776 rad), 36° wide
  const TENTH_A0 = -0.776 - TAU / 20, TENTH_A1 = -0.776 + TAU / 20;
  // the logo files' ring geometry, in a 2000 px wide raster (measured once from public/logo/*.svg)
  const LOGO = { wide: { w: 2000, h: 407, cx: 1792.5, cy: 207, R: 196.5, r: 108.5 }, stack: { w: 2000, h: 1754, cx: 1441.5, cy: 1211.5, R: 530.5, r: 293.5 } };
  const rng = (seed) => { let s = (seed * 2654435761) | 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; };
  const invEase = (f, y) => { let lo = 0, hi = 1; for (let i = 0; i < 32; i++) { const m = (lo + hi) / 2; if (f(m) < y) lo = m; else hi = m; } return lo; };

  async function init(stage, lang, timing, opts = {}) {
    const C = window.CONTENT[lang];
    const RTL = C.dir === "rtl", V = opts.format === "vertical";
    const W = V ? 1080 : 1920, H = V ? 1920 : 1080;
    const cp = C.copy, cc = cp.cine, F = "Assistant";
    const money = window.makeUI(C).money;
    const font = (w, s) => `${w} ${Math.round(s)}px ${F}`;
    await Promise.all(["600", "700", "800"].map((w) => document.fonts.load(`${w} 60px ${F}`)));
    stage.className = (RTL ? "rtl" : "ltr-stage") + (V ? " vertical" : "") + " geo";
    const img = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const [logoWide, logoStack, machon] = await Promise.all([img("../../public/logo/logo-wide.svg"), img("../../public/logo/logo.svg"), img("assets/machon-semel@3x.png")]);
    stage.innerHTML = ""; sfx.length = 0;
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    cv.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px`;
    stage.append(cv);
    const ctx = cv.getContext("2d");
    const mx = (x) => (RTL ? x : W - x); // authored in the RTL frame, mirrored for LTR

    // ------------------------------------------------------------ time
    const A = makeAnchors(timing);
    const B = (k) => A.w(C.beats[k][0], C.beats[k][1]);
    const ph = (id) => timing.phrases.find((p) => p.id === id);
    const lastWord = (id) => { const w = ph(id).words; return w[w.length - 1].start; };
    const T = {
      a: 0,
      h1: A.s("hook1"), h2w: A.s("hook2") - KW,
      c1: A.s("complex1"), c2: A.s("complex2"), harder: B("harder") - KW,
      ord: A.s("order"), mas: A.s("maaser"), masW: B("maaser") - KW, chW: B("chomesh") - KW, cur: B("anyCurrency") - KW,
      imp: A.s("import"), impW: B("importWord") - KW,
      rec: A.s("recurring"), recW: B("recurringWord") - KW, auto: B("autoWord") - KW,
      rem: A.s("reminders"), remW: B("remindWord") - KW, remEnd: lastWord("reminders") - KW,
      an: A.s("analytics"), anW: B("analyticsWord") - KW, money: B("moneyWord") - KW, house: B("householdWord") - KW,
      rep: A.s("reports"), print: B("printWord") - KW, excel: B("excelWord") - KW,
      nj: A.s("notjust"), nums: B("numbers") - KW,
      hal: A.s("halacha"), halW: B("halachaWord") - KW,
      rab: A.s("rabbi"), qW: B("questionWord") - KW, askW: B("rabbiWord") - KW,
      tr: A.s("trust"), trW: B("trustWord") - KW, rabbis: B("rabbisWord") - KW,
      pl: A.s("platforms"), web: B("webWord") - KW, desk: B("desktopWord") - KW, off: B("offlineWord") - KW,
      tog: A.s("together"), tInc: B("tIncome") - KW, tDon: B("tDonations") - KW, tObl: B("tObligations") - KW,
      brand: A.s("brand"), tag: A.s("tagline"), free: A.s("free"), freeW: B("freeWord") - KW,
    };
    T.end = A.e("free") + 3.2;
    T.b = T.end;
    T.impIn = T.imp - 0.5;
    T.auto = Math.max(T.auto, T.recW + 0.7);
    T.card = Math.min(T.remEnd, T.an - 1.1);
    T.kw = ["income", "donations", "currencies", "months", "obligations", "recurring"].map((k) => B(k) - KW);

    // ------------------------------------------------------------ layout (ring states per scene)
    const S = V
      ? {
        hook: { x: 540, y: 760, r: 230, sw: 58 }, chaos: { x: 540, y: 900, r: 180, sw: 48 }, orbit: [1.02, 1.5],
        mas: { x: 540, y: 1060, r: 262, sw: 50 },
        imp: { x: 540, y: 860, r: 200, sw: 56 }, rec: { x: 540, y: 1000, r: 262, sw: 54 },
        rem: { x: 540, y: 880, r: 215, sw: 52 }, an: { x: 540, y: 700, r: 122, sw: 38 },
        nj: { x: 540, y: 1000, r: 200, sw: 48 }, rab: { x: 540, y: 930, r: 210, sw: 44 }, tr: { x: 540, y: 780, r: 220, sw: 36 },
        tog: { x: 540, y: 1060, r: 205, sw: 50 },
        tx: { x: RTL ? W - 84 : 84, top: 190, w: 912, small: RTL ? 50 : 44, big: RTL ? 104 : 90 },
        center: { hook: 1090, lead: 120, c2: 1420, tag: 1060, w: 960, small: RTL ? 52 : 46, big: RTL ? 92 : 80 },
        wide: { w: 900, cy: 880 }, stack: { w: 430, cy: 700 },
        src: [RTL ? 820 : 260, 1760], path: [[RTL ? 820 : 260, 1720], [RTL ? 1000 : 80, 1330], [RTL ? 150 : 930, 1380], [540, 1060]],
        card: [540, 1300], cols: { base: 1540, colW: 150, gap: 48, maxH: 520 },
        sheet: { cx: 540, w: 640, h: 880 }, xch: { x: 540, y: 1660, dx: 230, dy: 0 },
        book: { x: 540, y: 1420, w: 700, h: 300 }, list: { x: 540, y0: 700, dy: 78 },
        pill: [540, 1250], msg: [540, 1420],
        trustL: [1130, 1250, 1360], dev: { web: [540, 740], desk: [540, 1320], w: 620, h: 380, cap: 250 }, globe: { x: 850, y: 540, r: 64, sw: 16 },
        medal: [400, 430], endFree: [1330, 1420, 1530],
      }
      : {
        hook: { x: 960, y: 395, r: 215, sw: 56 }, chaos: { x: 960, y: 480, r: 170, sw: 48 }, orbit: [1.3, 0.8],
        mas: { x: mx(690), y: 520, r: 250, sw: 50 },
        imp: { x: mx(640), y: 480, r: 210, sw: 58 }, rec: { x: mx(700), y: 530, r: 250, sw: 54 },
        rem: { x: mx(690), y: 470, r: 205, sw: 52 }, an: { x: mx(660), y: 205, r: 118, sw: 38 },
        nj: { x: mx(680), y: 500, r: 190, sw: 48 }, rab: { x: mx(660), y: 440, r: 185, sw: 42 }, tr: { x: 960, y: 320, r: 188, sw: 34 },
        tog: { x: mx(690), y: 520, r: 195, sw: 50 },
        tx: { x: RTL ? W - 150 : 150, top: 250, w: 720, small: RTL ? 46 : 40, big: RTL ? 100 : 88 },
        center: { hook: 700, lead: 60, c2: 860, tag: 560, w: 1500, small: RTL ? 48 : 42, big: RTL ? 88 : 76 },
        wide: { w: 1100, cy: 430 }, stack: { w: 330, cy: 330 },
        src: [mx(1700), 1000], path: [[mx(1640), 900], [mx(1480), 560], [mx(1000), 790], [mx(640), 690]],
        card: [mx(690), 820], cols: { base: 800, colW: 128, gap: 64, maxH: 470 },
        sheet: { cx: mx(640), w: 540, h: 650 }, xch: { x: mx(640) - (RTL ? 1 : -1) * 420, y: 330, dx: 0, dy: 110 },
        book: { x: mx(640), y: 790, w: 660, h: 250 }, list: { x: mx(640), y0: 170, dy: 74 },
        pill: [mx(660), 720], msg: [mx(660), 860],
        trustL: [640, 722, 812], dev: { web: [mx(810), 430], desk: [mx(340), 430], w: 450, h: 292, cap: 190 }, globe: { x: mx(1030), y: 270, r: 58, sw: 15 },
        medal: [350, 290], endFree: [790, 872, 962],
      };
    // the ring as the "0" of a logo file (wide or stacked), placed by its width and centre height
    const logoPlace = (kind) => {
      const G = LOGO[kind], P = S[kind], f = P.w / G.w, lh = G.h * f;
      const lx = W / 2 - P.w / 2, ly = P.cy - lh / 2;
      return { lx, ly, lw: P.w, lh, ring: { x: lx + G.cx * f, y: ly + G.cy * f, r: ((G.R + G.r) / 2) * f, sw: (G.R - G.r) * f } };
    };
    const WIDE = logoPlace("wide"), STACK = logoPlace("stack");
    // ring keyframes: [time, state or state(t), half-width of the blend]
    const keys = () => [
      [0, S.hook, 0.3], [T.c1 - 0.1, S.chaos, 0.45], [T.ord + 0.85, WIDE.ring, 0.4], [T.mas + 0.25, S.mas, 0.4],
      [T.imp - 0.25, S.imp, 0.35], [T.rec, S.rec, 0.35], [T.rem, S.rem, 0.35], [T.an, S.an, 0.35],
      [T.print + 0.75, (t) => sheetLogo(t).ring, 0.45], [T.nj + 0.15, S.nj, 0.4], [T.hal + 0.35, (t) => lensAt(t), 0.4],
      [T.rab + 0.05, S.rab, 0.4], [T.tr, S.tr, 0.4], [T.pl + 0.1, S.globe, 0.4], [T.tog + 0.05, S.tog, 0.4], [T.brand + 0.1, STACK.ring, 0.4],
    ];
    let KEYS = null;
    const stAt = (k, t) => (typeof k === "function" ? k(t) : k);
    const ringAt = (t) => {
      KEYS = KEYS || keys();
      let st = stAt(KEYS[0][1], t);
      for (let i = 1; i < KEYS.length; i++) {
        const [tb, nx, hw] = KEYS[i];
        const u = prog(t, tb - hw, tb + hw, E.inOutCubic);
        if (u <= 0) break;
        const n = stAt(nx, t);
        st = { x: lerp(st.x, n.x, u), y: lerp(st.y, n.y, u), r: lerp(st.r, n.r, u), sw: lerp(st.sw, n.sw, u) };
      }
      return st;
    };

    // ------------------------------------------------------------ backgrounds (pre-rendered)
    const mkBg = (dark) => {
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const g = c.getContext("2d");
      g.fillStyle = dark ? "#0b3a3c" : BG; g.fillRect(0, 0, W, H);
      const rg = g.createRadialGradient(W * 0.42, H * 0.46, 0, W * 0.42, H * 0.46, Math.max(W, H) * 0.7);
      rg.addColorStop(0, dark ? "rgba(26,110,108,0.55)" : "rgba(255,255,255,0.95)"); rg.addColorStop(1, dark ? "rgba(26,110,108,0)" : "rgba(255,255,255,0)");
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
      const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.75);
      vg.addColorStop(0, dark ? "rgba(0,12,12,0)" : "rgba(120,104,60,0)"); vg.addColorStop(1, dark ? "rgba(0,12,12,0.45)" : "rgba(120,104,60,0.10)");
      g.fillStyle = vg; g.fillRect(0, 0, W, H);
      for (let x = 36; x < W; x += 36) for (let y = 36; y < H; y += 36) {
        const d = Math.hypot((x - W / 2) / W, (y - H / 2) / H), a = Math.max(0, 0.11 - d * 0.16);
        if (a <= 0.005) continue;
        g.fillStyle = dark ? `rgba(160,220,210,${(a * 0.7).toFixed(3)})` : `rgba(17,103,106,${a.toFixed(3)})`; g.fillRect(x - 1, y - 1, 2, 2);
      }
      return c;
    };
    const bgLight = mkBg(false), bgDark = mkBg(true);
    // the room goes dark as a circle spreading from the ring, and the light returns the same way
    const RMAX = Math.hypot(W, H);
    const dIn = (t) => prog(t, T.rem - 0.45, T.rem + 0.2, E.inOutCubic), dOut = (t) => prog(t, T.an - 0.4, T.an + 0.15, E.inOutCubic);
    const isDark = (x, y, t) => {
      const a = dIn(t), b = dOut(t);
      if (a <= 0 || b >= 1) return false;
      return Math.hypot(x - S.rec.x, y - S.rec.y) < a * RMAX && !(Math.hypot(x - S.rem.x, y - S.rem.y) < b * RMAX);
    };
    const darkness = (t) => dIn(t) * (1 - dOut(t));

    // ------------------------------------------------------------ drawing helpers
    const shadow = (blur = 40, y = 16, a = 0.16) => { ctx.shadowColor = `rgba(14,52,48,${a})`; ctx.shadowBlur = blur; ctx.shadowOffsetY = y; };
    const noShadow = () => { ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; };
    const rrect = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
    const bez3 = (p, u) => { const q = 1 - u; return [q ** 3 * p[0][0] + 3 * q * q * u * p[1][0] + 3 * q * u * u * p[2][0] + u ** 3 * p[3][0], q ** 3 * p[0][1] + 3 * q * q * u * p[1][1] + 3 * q * u * u * p[2][1] + u ** 3 * p[3][1]]; };
    /** the logo ring: teal body + gold tenth (tenthRot swings it along the ring, lift pulls it out) */
    function drawRing(st, o = {}) {
      const { x, y, r, sw } = st, gap = 0.035, a = o.alpha ?? 1;
      if (a <= 0.001) return;
      ctx.save(); ctx.globalAlpha = a; ctx.lineCap = "butt";
      if (o.shadow !== false) shadow(50, 22, o.dark ? 0.3 : 0.14);
      const body = o.body ?? 1;
      ctx.strokeStyle = o.color || TEAL; ctx.lineWidth = sw;
      if (body > 0) { ctx.beginPath(); ctx.arc(x, y, r, TENTH_A1 + gap, TENTH_A1 + gap + (TAU - TAU / 10 - 2 * gap) * body); ctx.stroke(); }
      const rot = o.tenthRot || 0, lift = o.lift || 0, am = (TENTH_A0 + TENTH_A1) / 2 + rot;
      if (o.tenth !== false && (o.tenthAlpha ?? 1) > 0.001) {
        if (lift) shadow(40, 24, 0.25);
        ctx.globalAlpha = a * (o.tenthAlpha ?? 1);
        ctx.strokeStyle = GOLD; ctx.beginPath(); ctx.arc(x + Math.cos(am) * lift, y + Math.sin(am) * lift, r, TENTH_A0 + rot, TENTH_A1 + rot); ctx.stroke();
      }
      ctx.restore();
    }
    function txRow(rw, x, y, w, h, a = 1, rot = 0) {
      if (a <= 0.002) return;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot); ctx.translate(-w / 2, -h / 2);
      shadow(26, 10, 0.12); ctx.fillStyle = "#fff"; rrect(0, 0, w, h, 16 * (h / 64)); ctx.fill(); noShadow();
      const s = h / 64, pad = 22 * s, col = TYPE_COL[rw.type];
      ctx.fillStyle = col; rrect(RTL ? w - 7 * s : 0, 0, 7 * s, h, RTL ? [0, 16 * s, 16 * s, 0] : [16 * s, 0, 0, 16 * s]); ctx.fill();
      ctx.direction = RTL ? "rtl" : "ltr"; ctx.textBaseline = "middle"; ctx.textAlign = RTL ? "right" : "left";
      ctx.fillStyle = INK; ctx.font = font(700, 25 * s);
      const xs = RTL ? w - pad - 8 * s : pad + 8 * s;
      ctx.fillText(rw.desc, xs, h / 2 - 1);
      const dw = ctx.measureText(rw.desc).width, tl = C.ui.table.types[rw.type];
      ctx.font = font(700, 17 * s); const cw = ctx.measureText(tl).width + 22 * s;
      const chx = RTL ? xs - dw - 14 * s - cw : xs + dw + 14 * s;
      ctx.fillStyle = col + "22"; rrect(chx, h / 2 - 14 * s, cw, 28 * s, 14 * s); ctx.fill();
      ctx.fillStyle = col; ctx.textAlign = "center"; ctx.fillText(tl, chx + cw / 2, h / 2);
      ctx.textAlign = RTL ? "left" : "right"; ctx.font = font(800, 26 * s); ctx.fillStyle = TEAL;
      ctx.fillText(money(rw.amt), RTL ? pad : w - pad, h / 2 - 9 * s);
      ctx.font = font(600, 16 * s); ctx.fillStyle = "rgba(31,28,18,0.45)"; ctx.fillText(rw.d, RTL ? pad : w - pad, h / 2 + 15 * s);
      ctx.restore();
    }
    function pill(text, x, y, o = {}) {
      const a = o.alpha ?? 1; if (a <= 0.002) return;
      ctx.save(); ctx.globalAlpha = a; ctx.font = font(o.w || 700, o.size || 26); ctx.direction = o.dir || (RTL ? "rtl" : "ltr");
      const w = ctx.measureText(text).width + (o.pad || 26) * 2, h = (o.size || 26) * 2.1;
      ctx.translate(x, y); ctx.scale(o.s || 1, o.s || 1);
      shadow(24, 10, 0.14); ctx.fillStyle = o.bg || "#fff"; rrect(-w / 2, -h / 2, w, h, h / 2); ctx.fill(); noShadow();
      ctx.fillStyle = o.color || INK; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, 0, 1);
      ctx.restore();
    }
    const centerText = (st, big, small, o = {}) => {
      const a = o.alpha ?? 1; if (a <= 0.002) return;
      ctx.save(); ctx.globalAlpha = a; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.direction = RTL ? "rtl" : "ltr";
      const k = st.r / 210, bs = (o.bigSize || 100) * k;
      ctx.translate(st.x, st.y + (o.dy || 0)); ctx.scale(o.s || 1, o.s || 1);
      ctx.font = font(800, bs); ctx.fillStyle = o.color || TEAL; ctx.fillText(big, 0, bs * 0.22);
      if (small) { ctx.font = font(700, Math.min(28, Math.max(18, 27 * k))); ctx.fillStyle = o.smallColor || "rgba(31,28,18,0.6)"; ctx.fillText(small, 0, bs * 0.22 + 44 * k + 6); }
      ctx.restore();
    };

    // ------------------------------------------------------------ typography: the narration
    const blocks = [];
    /** narration words as type. o: { id, words:[i0,i1), big:[b0,b1), mode:"col"|"center", top, tOut, halo, dot } */
    function makeBlock(o) {
      const p = ph(o.id), toks = p.text.split(/\s+/).filter(Boolean);
      const words = toks.length === p.words.length ? toks : p.words.map((w) => w.w);
      const [i0, i1] = o.words || [0, words.length], [b0, b1] = o.big || [0, 0];
      const center = o.mode === "center", Lc = S.center, Lt = S.tx;
      const small = center ? Lc.small : Lt.small, bigS = center ? Lc.big : Lt.big, maxW = center ? Lc.w : Lt.w;
      let items = [];
      for (let i = i0; i < i1; i++) items.push({ w: words[i].replace(/^["“]+|[,;:—"”]+$/g, ""), t: p.words[i].start - 0.06, big: i >= b0 && i < b1 });
      items = items.filter((it) => it.w.length);
      const last = items[items.length - 1];
      last.w = last.w.replace(/[.!?…]*$/, "");
      // consecutive runs of the same weight wrap into their own lines
      const runs = [];
      for (const it of items) { if (!runs.length || runs[runs.length - 1].big !== it.big) runs.push({ big: it.big, items: [] }); runs[runs.length - 1].items.push(it); }
      const lines = [];
      for (const run of runs) {
        ctx.font = font(run.big ? 800 : 700, run.big ? bigS : small);
        const sp = ctx.measureText(" ").width, own = [];
        let line = [], w = 0;
        for (const it of run.items) {
          it.width = ctx.measureText(it.w).width;
          if (line.length && w + sp + it.width > maxW) { own.push({ big: run.big, items: line, width: w, sp }); line = []; w = 0; }
          w += (line.length ? sp : 0) + it.width; line.push(it);
        }
        if (line.length) own.push({ big: run.big, items: line, width: w, sp });
        if (own.length > 1) {
          const lst = own[own.length - 1], prev = own[own.length - 2];
          while (lst.items.length === 1 && prev.items.length > 2) {
            const mv = prev.items[prev.items.length - 1];
            if (lst.width + sp + mv.width > maxW) break;
            prev.items.pop(); prev.width -= sp + mv.width; lst.items.unshift(mv); lst.width += sp + mv.width;
          }
        }
        lines.push(...own);
      }
      let y = o.top ?? Lt.top;
      lines.forEach((ln, k) => {
        const sz = ln.big ? bigS : small;
        y += sz * (k ? 1 : 0.95);
        let x = center ? W / 2 + (RTL ? ln.width / 2 : -ln.width / 2) : Lt.x;
        for (const it of ln.items) { it.x = x; it.y = y; it.size = sz; x += (RTL ? -1 : 1) * (it.width + ln.sp); }
        y += ln.big ? sz * 0.1 : sz * 0.42;
      });
      const b = { id: o.id, items, tIn: items[0].t, tOut: o.tOut, halo: !!o.halo, dot: o.dot !== false, text: items.map((x) => x.w).join(" ") };
      blocks.push(b);
      return b;
    }
    const bigFrom = (n) => [n, 99];
    makeBlock({ id: "hook1", big: cc.big.hook1, mode: "center", top: S.center.hook, tOut: T.c1 - 0.1 });
    makeBlock({ id: "complex1", words: [0, cc.lead.split(" ").length], mode: "center", top: S.center.lead, tOut: T.c2 - 0.4, halo: true, dot: false });
    makeBlock({ id: "complex2", big: cc.big.complex2, mode: "center", top: S.center.c2, tOut: T.ord - 0.1, halo: true });
    makeBlock({ id: "maaser", big: cc.big.maaser, tOut: T.imp - 0.1 });
    makeBlock({ id: "import", big: bigFrom(cc.split.import), tOut: T.rec - 0.1 });
    makeBlock({ id: "recurring", big: bigFrom(cc.split.recurring), tOut: T.rem - 0.1 });
    makeBlock({ id: "reminders", big: bigFrom(cc.split.reminders), tOut: T.an - 0.1 });
    makeBlock({ id: "analytics", big: bigFrom(cc.split.analytics), tOut: T.rep - 0.1 });
    makeBlock({ id: "reports", big: cc.big.reports, tOut: T.nj - 0.1 });
    makeBlock({ id: "notjust", big: cc.big.notjust, tOut: T.hal - 0.1 });
    makeBlock({ id: "halacha", big: cc.big.halacha, tOut: T.rab - 0.1 });
    makeBlock({ id: "rabbi", big: cc.big.rabbi, tOut: T.tr - 0.15 });
    makeBlock({ id: "together", big: cc.big.together, tOut: T.brand - 0.15 });
    makeBlock({ id: "tagline", big: cc.big.tagline, mode: "center", top: S.center.tag, tOut: T.end + 5 });
    function drawText(t) {
      ctx.save(); ctx.textBaseline = "alphabetic"; ctx.direction = RTL ? "rtl" : "ltr"; ctx.textAlign = RTL ? "right" : "left";
      for (const b of blocks) {
        const out = prog(t, b.tOut, b.tOut + 0.4, E.inCubic);
        if (t < b.tIn - 0.05 || out >= 1) continue;
        const last = b.items[b.items.length - 1];
        for (const it of b.items) {
          const p = prog(t, it.t, it.t + 0.45, E.outQuint);
          if (p <= 0) continue;
          ctx.font = font(it.big ? 800 : 700, it.size);
          const dkw = isDark(it.x - (RTL ? it.width / 2 : -it.width / 2), it.y - it.size * 0.35, t);
          const col = it.big ? (dkw ? "#9fe0d6" : TEAL) : dkw ? "rgba(236,246,242,0.85)" : "#3a3524";
          ctx.globalAlpha = p * (1 - out);
          ctx.filter = p < 0.8 || out > 0 ? `blur(${((1 - p) * 7 + out * 6).toFixed(1)}px)` : "none";
          if (b.halo) { ctx.shadowColor = "rgba(252,250,241,0.95)"; ctx.shadowBlur = 26; }
          const y = it.y + (1 - p) * (it.big ? 34 : 22) - out * 26;
          ctx.fillStyle = col; ctx.fillText(it.w, it.x, y);
          if (it === last && b.dot) {
            const pd = prog(t, it.t + 0.25, it.t + 0.5, E.outBack);
            ctx.fillStyle = GOLD; ctx.globalAlpha = pd * (1 - out);
            ctx.fillText(".", RTL ? it.x - it.width : it.x + it.width, y);
          }
          ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
          ctx.filter = "none";
        }
      }
      ctx.restore();
    }

    // ------------------------------------------------------------ HUD
    const sc = cc.scenes;
    const chapters = [[T.h1, sc.hook], [T.c1, sc.chaos], [T.ord, sc.order], [T.mas, sc.maaser], [T.imp, cc.chapters.import], [T.rec, cc.chapters.recurring],
      [T.rem, cc.chapters.reminders], [T.an, cc.chapters.analytics], [T.rep, sc.reports], [T.nj, sc.halacha], [T.rab, sc.rabbi], [T.tr, sc.trust],
      [T.pl, sc.platforms], [T.tog, sc.together]].map(([t0, name], i) => [t0, String(i + 1).padStart(2, "0"), name]);
    function drawHud(t) {
      const dk = darkness(t), a = prog(t, 0.8, 1.4) * (1 - prog(t, T.brand - 0.3, T.brand + 0.2));
      if (a <= 0) return;
      ctx.save(); ctx.globalAlpha = a;
      ctx.font = font(700, 21); ctx.textBaseline = "middle"; ctx.direction = RTL ? "rtl" : "ltr"; ctx.textAlign = RTL ? "right" : "left";
      chapters.forEach(([t0, n, name], i) => {
        const t1 = chapters[i + 1] ? chapters[i + 1][0] : 1e9;
        const al = prog(t, t0 - 0.2, t0 + 0.2) * (1 - prog(t, t1 - 0.2, t1 + 0.1));
        if (al <= 0) return;
        ctx.globalAlpha = a * al; ctx.fillStyle = dk > 0.5 ? "rgba(200,236,228,0.7)" : "rgba(17,103,106,0.55)";
        ctx.fillText(`${n} · ${name}`, RTL ? W - 72 : 72, 64);
      });
      ctx.globalAlpha = a;
      const x0 = W / 2 - (V ? 200 : 260), x1 = W / 2 + (V ? 200 : 260), y = H - 62, u = clamp(t / T.end);
      ctx.strokeStyle = dk > 0.5 ? "rgba(200,236,228,0.2)" : "rgba(17,103,106,0.16)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      const xm = RTL ? lerp(x1, x0, u) : lerp(x0, x1, u);
      ctx.strokeStyle = dk > 0.5 ? "#9fe0d6" : TEAL; ctx.beginPath(); ctx.moveTo(RTL ? x1 : x0, y); ctx.lineTo(xm, y); ctx.stroke();
      ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(xm, y, 6, 0, TAU); ctx.fill();
      ctx.restore();
    }

    // =========================================================== scene 1: the spool
    const rows = C.rows.slice(0, 7);
    const rr1 = rng(11);
    const rowT = rows.map((_, i) => ({ t0: T.impW + 0.05 + i * 0.2, rot: (rr1() - 0.5) * 0.5, dur: 1.15 }));
    const arriveT = rowT.map((r) => r.t0 + r.dur * invEase(E.inOutCubic, 0.95));
    function sceneImport(t, st) {
      const vis = (1 - prog(t, T.rec - 0.3, T.rec + 0.1)) * (t > T.impIn - 0.2 ? 1 : 0);
      if (vis <= 0) return;
      // fine strands inside the ring stroke (the wound history)
      const inA = prog(t, T.imp - 0.2, T.imp + 0.4) * vis;
      ctx.save(); ctx.globalAlpha = inA;
      for (let k = 0; k < 11; k++) {
        const rk = st.r - st.sw / 2 + 3 + k * ((st.sw - 6) / 10);
        ctx.strokeStyle = `rgba(255,255,255,${k % 2 ? 0.1 : 0.2})`; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(st.x, st.y, rk, TENTH_A1 + 0.04, TENTH_A0 - 0.04 + TAU); ctx.stroke();
      }
      ctx.restore();
      // the flowing thread (dashes travel toward the ring)
      const flowA = prog(t, T.impW, T.impW + 0.5) * (1 - prog(t, arriveT[arriveT.length - 1], arriveT[arriveT.length - 1] + 0.4)) * vis;
      if (flowA > 0) {
        ctx.save(); ctx.lineCap = "round";
        for (let k = 0; k < 5; k++) {
          ctx.globalAlpha = flowA; ctx.strokeStyle = `rgba(17,103,106,${0.2 + k * 0.1})`; ctx.lineWidth = 2 + k * 0.6;
          ctx.setLineDash([22, 16]); ctx.lineDashOffset = -((t * 260 + k * 11) % 38);
          ctx.beginPath();
          for (let s = 0.55; s <= 1.0001; s += 0.01) { const [x, y] = bez3(S.path, s); const o = (k - 2) * 3 * (1 - s); if (s === 0.55) ctx.moveTo(x, y + o); else ctx.lineTo(x, y + o); }
          ctx.stroke();
        }
        ctx.restore();
      }
      // rows travel: scattered and large near the source, aligned and small as they join
      const sc0 = V ? 0.85 : 0.9;
      for (let i = rows.length - 1; i >= 0; i--) {
        const { t0, rot, dur } = rowT[i];
        const u = E.inOutCubic(clamp((t - t0) / dur));
        if (t < t0 || u >= 0.97) continue;
        const [x, y] = bez3(S.path, u * 0.98), [x2, y2] = bez3(S.path, Math.min(1, u * 0.98 + 0.01));
        const ang = Math.atan2(y2 - y, x2 - x) * 0.18 * (1 - u) + rot * Math.pow(1 - u, 2);
        const sc = lerp(sc0, 0.42, u), w = 540 * sc, h = 64 * sc;
        const al = prog(t, t0, t0 + 0.2) * (1 - prog(u, 0.72, 0.95)) * vis;
        for (let g = 3; g >= 1; g--) { const [gx, gy] = bez3(S.path, Math.max(0, u * 0.98 - g * 0.014)); txRow(rows[i], gx - w / 2, gy - h / 2, w, h, al * 0.07, ang); }
        txRow(rows[i], x - w / 2, y - h / 2, w, h, al, ang);
      }
      // each arrival winds on: a bright arc travels along the ring from the bottom
      arriveT.forEach((ta) => {
        const u = prog(t, ta - 0.05, ta + 0.7, E.outCubic);
        if (u <= 0 || u >= 1) return;
        const start = Math.PI / 2, dir = RTL ? 1 : -1;
        ctx.save(); ctx.globalAlpha = (1 - u) * 0.8 * vis; ctx.strokeStyle = "#8fe0d4"; ctx.lineWidth = st.sw * 0.3; ctx.lineCap = "round";
        const a0 = start + dir * u * 2.2, a1 = a0 - dir * 0.5;
        ctx.beginPath(); ctx.arc(st.x, st.y, st.r, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke(); ctx.restore();
      });
      // the spreadsheet source
      const sp = prog(t, T.imp - 0.15, T.imp + 0.3, E.outBack) * vis;
      pill(C.copy.sym.file, S.src[0], S.src[1], { size: 22, color: "#16a34a", dir: "ltr", alpha: clamp(sp), s: lerp(0.8, 1, clamp(sp)) });
      // the count
      const cnt = Math.round(1284 * E.outCubic(prog(t, arriveT[0] - 0.1, arriveT[arriveT.length - 1], E.linear)));
      const ca = prog(t, T.impW + 0.1, T.impW + 0.5) * vis;
      centerText(st, cnt.toLocaleString("en-US"), C.copy.sym.imported, { alpha: ca, bigSize: 104 });
      // the balance handed over from the previous scene
      const ba = prog(t, T.impIn, T.impIn + 0.4) * (1 - prog(t, T.impW - 0.1, T.impW + 0.2));
      centerText(st, money(820), C.chaos.centerLabel, { alpha: ba, bigSize: 92 });
    }

    // =========================================================== scene 2: the year
    const DIR = RTL ? -1 : 1, STEP = TAU / 12, A0 = -Math.PI / 2;
    const months = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(C.locale, { month: "short" }).format(new Date(2025, 11 + i, 1)));
    const firstStamp = T.recW + 0.35, sweepDur = Math.min(1.5, T.rem - 0.5 - T.auto);
    const head = (t) => (t < firstStamp ? 0 : t < T.auto ? prog(t, firstStamp - 0.2, firstStamp + 0.15, E.outCubic) / 12 : 1 / 12 + (11 / 12) * E.inOutCubic(clamp((t - T.auto) / sweepDur)));
    const stampT = months.map((_, m) => (m === 0 ? firstStamp : T.auto + sweepDur * invEase(E.inOutCubic, ((m + 0.5) / 12 - 1 / 12) / (11 / 12))));
    function sceneYear(t, st) {
      const vis = prog(t, T.rec - 0.25, T.rec + 0.25) * (1 - prog(t, T.rem - 0.3, T.rem + 0.05));
      if (vis <= 0) return 0;
      const { x, y, r, sw } = st;
      ctx.save(); ctx.globalAlpha = vis;
      // track
      shadow(50, 22, 0.12); ctx.strokeStyle = "#e7efe9"; ctx.lineWidth = sw; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); noShadow();
      // sweep with a trail that brightens toward the head
      const h = head(t);
      const N = 60;
      for (let k = 0; k < N; k++) {
        const s0 = A0 + DIR * TAU * h * (k / N), s1 = A0 + DIR * TAU * h * ((k + 1) / N);
        if (Math.abs(s1 - s0) < 1e-4) continue;
        ctx.strokeStyle = `rgba(17,103,106,${(0.3 + 0.7 * (k / N)).toFixed(3)})`; ctx.lineWidth = sw;
        ctx.beginPath(); ctx.arc(x, y, r, Math.min(s0, s1), Math.max(s0, s1) + 0.004); ctx.stroke();
      }
      // month cells: ticks, labels, stamps
      let stamped = 0;
      for (let m = 0; m < 12; m++) {
        const am = A0 + DIR * STEP * (m + 0.5), half = STEP * 0.28;
        const labA = prog(t, T.rec + 0.05 + m * 0.035, T.rec + 0.4 + m * 0.035);
        const at = A0 + DIR * STEP * m;
        ctx.globalAlpha = vis * labA; ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x + Math.cos(at) * (r - sw / 2), y + Math.sin(at) * (r - sw / 2)); ctx.lineTo(x + Math.cos(at) * (r + sw / 2), y + Math.sin(at) * (r + sw / 2)); ctx.stroke();
        const sp = prog(t, stampT[m], stampT[m] + 0.28, E.outBack);
        if (sp > 0) {
          stamped++;
          ctx.globalAlpha = vis * clamp(sp * 1.5);
          ctx.strokeStyle = GOLD; ctx.lineWidth = sw * 0.55 * sp;
          ctx.beginPath(); ctx.arc(x, y, r, am - half * sp, am + half * sp); ctx.stroke();
          ctx.font = font(800, 22 * (r / 250)); ctx.fillStyle = GOLD_D; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.direction = "ltr";
          ctx.globalAlpha = vis * prog(t, stampT[m] + 0.05, stampT[m] + 0.3);
          ctx.fillText(String(C.ui.recurring.amount), x + Math.cos(am) * (r + 76 * (r / 250)), y + Math.sin(am) * (r + 76 * (r / 250)));
        } else if (labA > 0) {
          ctx.globalAlpha = vis * labA * 0.9; ctx.setLineDash([6, 6]); ctx.strokeStyle = "rgba(181,140,0,0.5)"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x, y, r + sw * 0.28, am - half, am + half); ctx.arc(x, y, r - sw * 0.28, am + half, am - half, true); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
        }
        ctx.globalAlpha = vis * labA; ctx.font = font(700, 23 * (r / 250)); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.direction = RTL ? "rtl" : "ltr";
        ctx.fillStyle = sp > 0.5 ? TEAL : "rgba(17,103,106,0.45)";
        ctx.fillText(months[m], x + Math.cos(am) * (r - 70 * (r / 250)), y + Math.sin(am) * (r - 70 * (r / 250)));
      }
      // the head
      const moving = t > T.auto - 0.1 && t < T.auto + sweepDur + 0.25;
      if (moving) {
        const ah = A0 + DIR * TAU * h, ha = prog(t, T.auto - 0.1, T.auto + 0.1) * (1 - prog(t, T.auto + sweepDur, T.auto + sweepDur + 0.25));
        ctx.globalAlpha = vis * ha; ctx.shadowColor = "rgba(240,192,0,0.85)"; ctx.shadowBlur = 26;
        ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(x + Math.cos(ah) * r, y + Math.sin(ah) * r, 17, 0, TAU); ctx.fill(); noShadow();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 5; ctx.stroke();
      }
      ctx.restore();
      // the standing order lands over its first month
      const rc = C.ui.recurring;
      const cp2 = prog(t, T.recW - 0.1, T.recW + 0.4, E.outBack);
      pill(`${rc.label}  ·  ${money(rc.amount)}  ·  ${C.chaos.recurring.sub}`, x, y - r - 110 * (r / 250) - (1 - clamp(cp2)) * 40, { size: 28, alpha: vis * clamp(cp2 * 1.4) });
      if (cp2 > 0.3) {
        ctx.save(); ctx.globalAlpha = vis * prog(t, T.recW + 0.1, T.recW + 0.4); ctx.strokeStyle = "rgba(17,103,106,0.35)"; ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.moveTo(x, y - r - 80 * (r / 250)); ctx.lineTo(x, y - r - sw / 2 - 4); ctx.stroke(); ctx.restore();
      }
      // the year's donations, computed as the months are stamped
      const ta = vis * prog(t, firstStamp, firstStamp + 0.3);
      centerText(st, money(rc.amount * stamped), RTL ? "תרומות השנה · נוצרות לבד" : "this year · automatically", { alpha: ta, bigSize: 74 });
      return vis;
    }

    // =========================================================== scene 3: the reminder
    function sceneRemind(t, st, dk) {
      if (dk <= 0.001) return;
      const s = t - T.remW;
      const swing = s > 0 ? 0.5 * Math.sin(s * 8.5) * Math.exp(-s * 1.6) : 0;
      // gold waves ringing out of the ring
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      for (let k = 0; k < 4; k++) {
        const u = prog(t, T.remW + k * 0.42, T.remW + k * 0.42 + 1.3, E.outCubic);
        if (u <= 0 || u >= 1) continue;
        ctx.globalAlpha = (1 - u) * 0.5 * dk; ctx.strokeStyle = GOLD; ctx.lineWidth = 3 + (1 - u) * 3;
        ctx.beginPath(); ctx.arc(st.x, st.y, st.r + st.sw / 2 + u * (V ? 330 : 300), 0, TAU); ctx.stroke();
      }
      ctx.restore();
      drawRing(st, { alpha: dk, color: "#2f9591", tenthRot: swing, lift: 14 * Math.min(1, Math.abs(swing) * 4), dark: true });
      // centre: what is still owed
      const em = C.ui.email;
      const ca = dk * prog(t, T.remW - 0.1, T.remW + 0.3) * (1 - prog(t, T.an - 0.35, T.an - 0.05));
      centerText(st, money(em.amount), em.badge, { alpha: ca, bigSize: 96, color: GOLD, smallColor: "rgba(220,240,236,0.75)" });
      // the reminder email slides out of the ring
      const cpc = prog(t, T.card, T.card + 0.5, E.outCubic), back = prog(t, T.an - 0.4, T.an - 0.05, E.inCubic);
      if (cpc > 0 && back < 1) {
        const [cx0, cy0] = S.card;
        const x = lerp(st.x, cx0, cpc * (1 - back)), y = lerp(st.y, cy0, cpc * (1 - back)), sc = lerp(0.5, 1, cpc) * lerp(1, 0.3, back);
        ctx.save(); ctx.globalAlpha = dk * clamp(cpc * 1.6) * (1 - back); ctx.translate(x, y); ctx.scale(sc, sc);
        ctx.font = font(800, 30); ctx.direction = RTL ? "rtl" : "ltr";
        const tw = Math.max(ctx.measureText(em.subject).width, 200), w = tw + 150, hh = 112;
        shadow(40, 18, 0.35); ctx.fillStyle = "#fff"; rrect(-w / 2, -hh / 2, w, hh, 24); ctx.fill(); noShadow();
        const ix = RTL ? w / 2 - 30 - 64 : -w / 2 + 30;
        ctx.fillStyle = GOLD; rrect(ix, -32, 64, 64, 16); ctx.fill();
        // envelope glyph drawn in the language's geometry
        ctx.strokeStyle = "#3d2f00"; ctx.lineWidth = 3.2; ctx.lineJoin = "round";
        rrect(ix + 14, -16, 36, 28, 4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(ix + 15, -14); ctx.lineTo(ix + 32, 0); ctx.lineTo(ix + 49, -14); ctx.stroke();
        ctx.textAlign = RTL ? "right" : "left"; ctx.textBaseline = "alphabetic";
        const tx = RTL ? ix - 22 : ix + 64 + 22;
        ctx.font = font(800, 24); ctx.fillStyle = TEAL; ctx.fillText(em.from, tx, -10);
        ctx.font = font(800, 30); ctx.fillStyle = INK; ctx.fillText(em.subject, tx, 28);
        ctx.restore();
      }
    }

    // =========================================================== scene 4: the pour
    const cats = C.ui.analytics.cats, spendTotal = cats.reduce((a, c) => a + c[1], 0);
    const shares = [...cats.slice(0, 3), [C.copy.sym.other, cats.slice(3).reduce((a, c) => a + c[1], 0)]];
    const pct = shares.map(([, v]) => Math.round((v / spendTotal) * 100)); pct[3] = 100 - pct[0] - pct[1] - pct[2];
    const pourT = T.money - 0.35;
    const cols = (() => {
      const { base, colW, gap, maxH } = S.cols, cx = S.an.x, x0 = cx - (4 * colW + 3 * gap) / 2;
      return shares.map(([name, v], i) => {
        const k = RTL ? 3 - i : i, x = x0 + k * (colW + gap), hh = Math.max(10, (maxH * pct[i]) / 100);
        return { name, v, p: pct[i], x, h: hh, top: base - hh, cxc: x + colW / 2, i, rs: pourT + i * 0.16 };
      });
    })();
    function scenePour(t, st) {
      const vis = prog(t, T.an - 0.2, T.an + 0.3) * (1 - prog(t, T.rep - 0.1, T.rep + 0.35)), keepBase = prog(t, T.an - 0.2, T.an + 0.3) * (t < T.nj ? 1 : 0);
      const collapse = prog(t, T.rep - 0.45, T.rep + 0.1, E.inCubic);
      if (keepBase <= 0) return;
      const { base, colW, gap, maxH } = S.cols, x0 = cols.reduce((a, c) => Math.min(a, c.x), 1e9), x1 = x0 + 4 * colW + 3 * gap;
      // baseline, ticks and quiet gridlines draw in from the centre
      const bl = prog(t, T.anW + 0.5, T.anW + 1.1, E.inOutCubic), mid = (x0 + x1) / 2, half = ((x1 - x0) / 2 + 60) * bl;
      ctx.save(); ctx.globalAlpha = keepBase * (1 - prog(t, T.print - 0.2, T.print + 0.1));
      ctx.strokeStyle = "rgba(17,103,106,0.35)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mid - half, base + 1); ctx.lineTo(mid + half, base + 1); ctx.stroke();
      ctx.strokeStyle = "rgba(17,103,106,0.18)"; ctx.lineWidth = 1;
      for (let x = x0 - 60; x <= x1 + 60; x += 12) { if (Math.abs(x - mid) > half) continue; ctx.beginPath(); ctx.moveTo(x, base + 1); ctx.lineTo(x, base + ((x - x0 + 60) % 60 === 0 ? 12 : 6)); ctx.stroke(); }
      ctx.globalAlpha = vis * prog(t, T.anW + 0.9, T.anW + 1.4); ctx.setLineDash([3, 7]);
      for (const g of [25, 50]) { const yy = base - (maxH * g) / 100; ctx.beginPath(); ctx.moveTo(x0 - 40, yy); ctx.lineTo(x1 + 40, yy); ctx.stroke(); }
      ctx.restore();
      // measuring: dashed outlines of where each column will stand
      const ga = prog(t, T.anW + 1.2, T.anW + 1.7) * (1 - prog(t, pourT + 0.6, pourT + 1.4));
      if (ga > 0) {
        ctx.save(); ctx.globalAlpha = vis * ga; ctx.setLineDash([6, 6]); ctx.strokeStyle = "rgba(17,103,106,0.45)"; ctx.lineWidth = 2;
        cols.forEach((c, k) => {
          const g = prog(t, T.anW + 1.2 + k * 0.12, T.anW + 1.8 + k * 0.12, E.outCubic);
          ctx.beginPath(); ctx.rect(c.x + 1, base - c.h * g, colW - 2, c.h * g); ctx.stroke();
          ctx.setLineDash([]); ctx.fillStyle = "rgba(17,103,106,0.05)"; ctx.fill(); ctx.setLineDash([6, 6]);
        });
        ctx.restore();
      }
      // ribbons: width by share at the ring, the column's width at its top
      const outW = 104 * (st.r / 118);
      let accW = -outW / 2;
      const order = RTL ? [...cols].reverse() : cols;
      order.forEach((c) => {
        const w0 = (outW * c.p) / 100, sx0 = st.x + accW, sx1 = sx0 + w0; accW += w0;
        const p = prog(t, c.rs, c.rs + 0.55, E.inOutCubic);
        if (p <= 0) return;
        const sy = st.y + st.r + st.sw / 2 - 6, ey = c.top - 4, ex0 = c.x + 6, ex1 = c.x + colW - 6, my = lerp(sy, ey, 0.55);
        const settle = 1 - 0.45 * prog(t, c.rs + 1.1, c.rs + 1.8);
        const g = ctx.createLinearGradient(0, sy, 0, ey);
        g.addColorStop(0, `rgba(17,103,106,${(0.55 * settle).toFixed(3)})`); g.addColorStop(1, `rgba(17,103,106,${(0.16 * settle).toFixed(3)})`);
        ctx.save(); ctx.globalAlpha = vis;
        ctx.beginPath(); ctx.rect(0, sy - 2, W, (ey - sy + 8) * p); ctx.clip();
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(sx0, sy); ctx.bezierCurveTo(sx0, my, ex0, my, ex0, ey); ctx.lineTo(ex1, ey); ctx.bezierCurveTo(ex1, my, sx1, my, sx1, sy); ctx.closePath(); ctx.fill();
        ctx.restore();
      });
      // columns rise as their ribbon arrives; labels in text ink under the baseline
      cols.forEach((c) => {
        const up = prog(t, c.rs + 0.42, c.rs + 1.0, E.outBack) * (1 - collapse), hh = Math.max(0, c.h * up);
        if (hh > 0.5) {
          ctx.save(); ctx.globalAlpha = keepBase; shadow(28, 12, 0.14);
          const gr = ctx.createLinearGradient(0, base - hh, 0, base); gr.addColorStop(0, "#13777a"); gr.addColorStop(1, TEAL_D);
          ctx.fillStyle = gr; rrect(c.x, base - hh, colW, hh, [6, 6, 0, 0]); ctx.fill(); noShadow();
          if (c.i === 0) { const gp = prog(t, T.house, T.house + 0.35, E.outBack); if (gp > 0) { ctx.fillStyle = GOLD; rrect(c.x, base - hh, colW, 7 * clamp(gp), [6, 6, 0, 0]); ctx.fill(); } }
          ctx.restore();
        }
        const la = prog(t, c.rs + 0.6, c.rs + 1.0, E.outCubic);
        if (la <= 0) return;
        ctx.save(); ctx.globalAlpha = vis * la; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
        const ly = base + (c.i === 0 ? 70 : 62) + (1 - la) * 14;
        ctx.direction = "ltr"; ctx.font = font(800, c.i === 0 ? 58 : 44); ctx.fillStyle = INK;
        ctx.fillText(`${Math.round(c.p * E.outCubic(la))}%`, c.cxc, ly);
        ctx.direction = RTL ? "rtl" : "ltr"; ctx.font = font(700, 26); ctx.fillStyle = "rgba(31,28,18,0.72)"; ctx.fillText(c.name, c.cxc, ly + 36);
        ctx.font = font(600, 21); ctx.fillStyle = "rgba(31,28,18,0.5)"; ctx.fillText(money(c.v), c.cxc, ly + 64);
        ctx.restore();
      });
      // the ring counts the month's spending
      const cnt = prog(t, T.anW + 0.2, T.anW + 1.4, E.outCubic);
      centerText(st, money(spendTotal * cnt), C.copy.sym.household, { alpha: vis * prog(t, T.anW + 0.1, T.anW + 0.4) * (1 - prog(t, T.rep - 0.3, T.rep)), bigSize: 88 });
    }

    // =========================================================== shared pieces for the new scenes
    const D = C.data, strip = (x) => x.replace(/<[^>]+>/g, "");
    const overall = D.incomeBase * 0.1 + D.chomeshIncome * 0.2 - D.donations;
    const num = (n) => Math.round(n).toLocaleString("en-US");
    function drawLogo(kind, pl, alpha, clipFn) {
      if (alpha <= 0.002) return;
      ctx.save(); ctx.globalAlpha = alpha;
      if (clipFn) { ctx.beginPath(); clipFn(); ctx.clip(); }
      ctx.drawImage(kind === "wide" ? logoWide : logoStack, pl.lx, pl.ly, pl.lw, pl.lh);
      ctx.restore();
    }
    const txt = (s0, x, y, o = {}) => {
      const a = o.alpha ?? 1; if (a <= 0.002) return;
      ctx.save(); ctx.globalAlpha = a; ctx.font = font(o.w || 700, o.size || 28); ctx.fillStyle = o.color || INK;
      ctx.textAlign = o.align || "center"; ctx.textBaseline = o.base || "alphabetic"; ctx.direction = o.dir || (RTL ? "rtl" : "ltr");
      if (o.halo) { ctx.shadowColor = "rgba(252,250,241,0.95)"; ctx.shadowBlur = 20; }
      ctx.fillText(s0, x, y); ctx.restore();
    };
    const pulse = (st, t0, t, col = GOLD, dist = 90) => {
      const u = prog(t, t0, t0 + 0.9, E.outCubic); if (u <= 0 || u >= 1) return;
      ctx.save(); ctx.globalAlpha = (1 - u) * 0.55; ctx.strokeStyle = col; ctx.lineWidth = 4 * (1 - u) + 1;
      ctx.beginPath(); ctx.arc(st.x, st.y, st.r + st.sw / 2 + u * dist, 0, TAU); ctx.stroke(); ctx.restore();
    };
    const checkGlyph = (x, y, s0, col = "#fff", lw = 5) => { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(x - s0 * 0.45, y); ctx.lineTo(x - s0 * 0.1, y + s0 * 0.35); ctx.lineTo(x + s0 * 0.5, y - s0 * 0.35); ctx.stroke(); ctx.restore(); };

    // =========================================================== hook: the ring and its tenth
    function sceneHook(t, st) {
      if (t > T.c1 + 0.6) return;
      const out = prog(t, T.c1 - 0.3, T.c1 + 0.2);
      const ea = prog(t, T.h1 - 0.1, T.h1 + 0.4) * (1 - out);
      txt(cp.eyebrow, st.x, st.y - st.r - st.sw / 2 - (V ? 70 : 52) + (1 - ea) * 12, { alpha: ea, size: V ? 52 : 44, color: TEAL });
      const pa = prog(t, T.h2w, T.h2w + 0.45, E.outBack), pout = prog(t, T.kw[0] - 0.4, T.kw[0]);
      if (pa > 0 && pout < 1) {
        ctx.save(); ctx.globalAlpha = clamp(pa) * (1 - pout); ctx.translate(st.x, st.y); const k = lerp(0.85, 1, clamp(pa)) * (st.r / 215); ctx.scale(k, k);
        ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.direction = "ltr"; ctx.font = font(800, 150);
        const w10 = ctx.measureText("10").width, wp = ctx.measureText("%").width, x0 = -(w10 + wp) / 2;
        ctx.fillStyle = TEAL; ctx.fillText("10", x0, 52); ctx.fillStyle = GOLD; ctx.fillText("%", x0 + w10, 52); ctx.restore();
      }
      pulse(st, T.h2w + 0.15, t);
    }

    // =========================================================== chaos: the household's money
    const cw = ph("complex1").words;
    const kwLabel = (key, i) => {
      const tt = T.kw[i] + KW, wi = cw.findIndex((w) => Math.abs(w.start - tt) < 1e-6);
      if (wi < 0) return key;
      return cw[wi].w + (RTL && key === "recurring" && cw[wi + 1] ? " " + cw[wi + 1].w : "");
    };
    const SYM = { USD: "$", EUR: "€", GBP: "£", ILS: "₪" };
    const groups = (() => {
      const k = C.chaos;
      return [
        { key: "income", col: TYPE_COL.income, items: k.income.map((i) => `${i.label}  ${money(i.amount)}`) },
        { key: "donations", col: TYPE_COL.donation, items: k.donations.map((i) => `${i.label}  ${money(i.amount)}`) },
        { key: "currencies", col: TEAL, items: k.currencies.map((c) => `${SYM[c.cur]}${c.amt}`), ltr: true },
        { key: "months", col: TEAL, items: [...k.months, `${k.prevMonth.label}  ${money(k.prevMonth.amount)}`] },
        { key: "obligations", col: TYPE_COL.expense, items: k.obligations.map((o) => `${o.label}  ${o.pct}`) },
        { key: "recurring", col: TEAL, items: [`${k.recurring.label} · ${k.recurring.sub}`, k.recurring.badge, C.chaos.newTx] },
      ].map((g, j) => ({ ...g, j, t0: T.kw[j], label: kwLabel(g.key, j), th: -Math.PI / 2 + 0.55 + j * (TAU / 6) }));
    })();
    const frags = [];
    groups.forEach((g) => g.items.forEach((text, i) => frags.push({ g, text, i, ti: g.t0 + 0.12 + i * 0.1, rho: 250 + ((g.j * 3 + i) % 6) * 50, ph0: g.th + (i - (g.items.length - 1) / 2) * 0.32, om: (0.2 + 0.05 * ((g.j + i) % 4)) * ((g.j + i) % 5 === 3 ? -1 : 1), depth: (g.j + i) % 3 === 2 })));
    const dust = (() => { const r = rng(5); return Array.from({ length: 520 }, () => ({ rho: 220 + Math.pow(r(), 0.7) * 700, ph0: r() * TAU, om: 0.12 + r() * 0.38, sz: 1.2 + r() * 2.8, gold: r() < 0.14, t0: T.c1 + r() * (T.c2 - T.c1) })); })();
    const spd = (t) => 1 + 1.7 * prog(t, T.c2, T.ord, E.inQuad);
    function sceneChaos(t, st) {
      if (t < T.c1 - 0.2 || t > T.ord + 1.0) return;
      const [ox, oy] = S.orbit, cv = prog(t, T.ord - 0.15, T.ord + 0.75, E.inCubic);
      const lvl = prog(t, T.c1, T.kw[5] + 0.5);
      // dust on spiral orbits
      ctx.save();
      for (const d of dust) {
        if (t < d.t0) continue;
        const a0 = prog(t, d.t0, d.t0 + 0.8);
        const ph = d.ph0 + d.om * (t - d.t0) * spd(t) + cv * 3.2, rho = lerp(d.rho, st.r, cv);
        const x = st.x + Math.cos(ph) * rho * ox, y = st.y + Math.sin(ph) * rho * oy;
        const al = a0 * (0.16 + 0.42 * lvl) * (1 - prog(cv, 0.7, 1));
        if (al <= 0.01) continue;
        const ph2 = ph - 0.05 * spd(t) - cv * 0.3;
        ctx.globalAlpha = al; ctx.strokeStyle = d.gold ? GOLD : TEAL; ctx.lineWidth = d.sz * 0.7;
        ctx.beginPath(); ctx.moveTo(st.x + Math.cos(ph2) * rho * ox, st.y + Math.sin(ph2) * rho * oy); ctx.lineTo(x, y); ctx.stroke();
      }
      ctx.restore();
      // the fragments
      for (const f of frags) {
        if (t < f.ti) continue;
        const P = [st.x + Math.cos(f.g.th) * 440 * ox, st.y + Math.sin(f.g.th) * 440 * oy];
        const e = prog(t, f.ti, f.ti + 0.75, E.outCubic);
        const ph = f.ph0 + f.om * Math.max(0, t - f.ti) * spd(t) + cv * 2.8, rho = lerp(f.rho, st.r * 0.9, cv);
        const O = [st.x + Math.cos(ph) * rho * ox, st.y + Math.sin(ph) * rho * oy];
        const x = lerp(P[0], O[0], e), y = lerp(P[1], O[1], e);
        const al = prog(t, f.ti, f.ti + 0.2) * (1 - prog(cv, 0.7, 1)) * (f.depth ? 0.8 : 1);
        if (al <= 0.01) continue;
        ctx.save(); if (f.depth) ctx.filter = "blur(2px)";
        pill(f.text, x, y, { size: f.depth ? 26 : 23, color: f.g.col, alpha: al, s: lerp(1, 0.35, cv) * (f.depth ? 1.12 : 1), dir: f.g.ltr ? "ltr" : undefined, w: 800 });
        ctx.restore();
      }
      // the spoken keyword lands where its money arrives
      for (const g of groups) {
        const a = prog(t, g.t0 - 0.05, g.t0 + 0.35, E.outCubic) * (1 - prog(t, g.t0 + 0.95, g.t0 + 1.4));
        if (a <= 0) continue;
        const P = [st.x + Math.cos(g.th) * 440 * ox, st.y + Math.sin(g.th) * 440 * oy];
        txt(g.label, P[0], P[1] + (1 - a) * 18, { alpha: a, size: V ? 64 : 58, w: 800, color: INK, halo: true, base: "middle" });
        ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = g.col; ctx.beginPath(); ctx.arc(P[0], P[1] + (V ? 50 : 44), 7, 0, TAU); ctx.fill(); ctx.restore();
      }
      // everything lands: a gold pulse off the ring
      pulse(st, T.ord + 0.65, t, GOLD, 120);
    }

    // =========================================================== order: the ring becomes the wordmark's "0"
    const revealW = (t) => prog(t, T.ord + 1.3, T.ord + 1.9, E.inOutCubic) * (1 - prog(t, T.mas - 0.2, T.mas + 0.15, E.inOutCubic));
    function sceneOrder(t) {
      if (t < T.ord + 1.28 || t > T.mas + 0.14) return;
      const a = revealW(t), G = LOGO.wide, f = WIDE.lw / G.w, ringLeft = WIDE.ring.x - G.R * f - 2;
      const x0 = lerp(ringLeft, WIDE.lx - 4, a);
      drawLogo("wide", WIDE, 1, () => ctx.rect(x0, WIDE.ly - 20, WIDE.lx + WIDE.lw + 20 - x0, WIDE.lh + 40));
      const ta = prog(t, T.ord + 1.8, T.ord + 2.3) * (1 - prog(t, T.mas - 0.3, T.mas));
      txt(cp.orderTag.join(" "), W / 2, WIDE.ly + WIDE.lh + (V ? 110 : 96) + (1 - ta) * 14, { alpha: ta, size: V ? 48 : 44, color: "#3a3524" });
    }

    // =========================================================== maaser & chomesh on the ring
    function sceneMaaser(t, st) {
      if (t < T.mas || t > T.imp) return;
      const out = prog(t, T.imp - 0.65, T.imp - 0.3);
      const ia = prog(t, T.mas + 0.55, T.mas + 1.0) * (1 - out);
      pill(`${cc.income} · ${money(D.incomeBase)}`, st.x, st.y - st.r - st.sw / 2 - 52, { size: 26, alpha: ia, color: TYPE_COL.income, w: 800 });
      // maaser: the tenth, labelled
      const am = (TENTH_A0 + TENTH_A1) / 2, ma = prog(t, T.masW, T.masW + 0.45, E.outCubic) * (1 - out);
      if (ma > 0) {
        const p0 = [st.x + Math.cos(am) * (st.r + st.sw / 2 + 30), st.y + Math.sin(am) * (st.r + st.sw / 2 + 30)], p1 = [st.x + Math.cos(am) * (st.r + 125), st.y + Math.sin(am) * (st.r + 125)];
        ctx.save(); ctx.globalAlpha = ma; ctx.strokeStyle = GOLD_D; ctx.lineWidth = 2; ctx.setLineDash([4, 5]);
        ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(lerp(p0[0], p1[0], ma), lerp(p0[1], p1[1], ma)); ctx.stroke(); ctx.restore();
        pill(`${C.chaos.obligations[0].label} 10% · ${money(D.incomeBase * 0.1)}`, p1[0] + (RTL ? 40 : 40), p1[1] - 22, { size: 26, alpha: ma, bg: GOLD, color: "#3d2f00", w: 800 });
      }
      // chomesh: an inner ring (the chomesh income) with its double tenth
      const ca = prog(t, T.chW - 0.05, T.chW + 0.6, E.inOutCubic) * (1 - out);
      if (ca > 0) {
        const ri = st.r * 0.6, swi = st.sw * 0.62, a0 = 2.35 - TAU / 10, a1 = 2.35 + TAU / 10;
        ctx.save(); ctx.globalAlpha = 1 - out; ctx.lineCap = "butt"; shadow(30, 12, 0.12);
        ctx.strokeStyle = "#5aa59c"; ctx.lineWidth = swi; ctx.beginPath(); ctx.arc(st.x, st.y, ri, a1 + 0.04, a1 + 0.04 + (TAU - TAU / 5 - 0.08) * ca); ctx.stroke();
        ctx.strokeStyle = GOLD; ctx.beginPath(); ctx.arc(st.x, st.y, ri, a0, a0 + (a1 - a0) * prog(ca, 0.5, 1)); ctx.stroke(); ctx.restore();
        const lp = prog(t, T.chW + 0.3, T.chW + 0.7, E.outCubic) * (1 - out), ang = 2.35;
        pill(`${C.chaos.obligations[1].label} 20% · ${money(D.chomeshIncome * 0.2)}`, st.x + Math.cos(ang) * (st.r + 150), st.y + Math.sin(ang) * (st.r + 90), { size: 26, alpha: lp, bg: GOLD, color: "#3d2f00", w: 800 });
      }
      // what is owed, computed
      const oa = prog(t, T.chW + 0.75, T.chW + 1.2) * (1 - out);
      if (oa > 0) {
        centerText(st, money(overall), cc.balance, { alpha: oa, bigSize: 72 });
        txt(`${num(D.incomeBase * 0.1)} + ${num(D.chomeshIncome * 0.2)} − ${num(D.donations)}`, st.x, st.y - (V ? 70 : 62), { alpha: oa * 0.8, size: 21, color: "rgba(31,28,18,0.55)", dir: "ltr" });
      }
      // any currency: foreign amounts fly in and turn into the local one on the way
      C.chaos.currencies.forEach((c, i) => {
        const t0 = T.cur - 0.35 + i * 0.16, u = prog(t, t0, t0 + 1.0, E.inOutCubic);
        if (u <= 0 || u >= 1) return;
        const sx = st.x + (i - 1) * (V ? 300 : 360), sy = H + 60, ex = st.x, ey = st.y;
        const x = lerp(sx, ex, u) + Math.sin(u * Math.PI) * (i - 1) * 60, y = lerp(sy, ey, u);
        const flip = Math.abs(Math.cos(prog(u, 0.35, 0.65) * Math.PI)), shown = u < 0.5 ? `${SYM[c.cur]}${c.amt}` : money(c.conv);
        ctx.save(); ctx.translate(x, y); ctx.scale(1, Math.max(0.05, flip)); pill(shown, 0, 0, { size: 26, color: TEAL, alpha: 1 - prog(u, 0.8, 1), dir: u < 0.5 ? "ltr" : undefined, w: 800, s: lerp(1, 0.5, prog(u, 0.6, 1)) }); ctx.restore();
      });
    }

    // =========================================================== reports: the baseline becomes a printer slot
    const SH = S.sheet, rowsR = C.rows.slice(0, 9);
    const sheetTop = (t) => S.cols.base - SH.h * prog(t, T.print - 0.05, T.print + 1.15, E.outCubic);
    const sheetLogo = (t) => {
      const x0 = SH.cx - SH.w / 2, lw = V ? 170 : 150, G = LOGO.wide, f = lw / G.w;
      const lx = RTL ? x0 + 30 : x0 + SH.w - 30 - lw, ly = sheetTop(t) + 34;
      return { lx, ly, lw, lh: G.h * f, ring: { x: lx + G.cx * f, y: ly + G.cy * f, r: ((G.R + G.r) / 2) * f, sw: (G.R - G.r) * f } };
    };
    const sheetLogoA = (t) => prog(t, T.print + 1.1, T.print + 1.3) * (1 - prog(t, T.nj - 0.4, T.nj - 0.2));
    function sheetRowsLayout(top) {
      const x0 = SH.cx - SH.w / 2, pad = 30, cols = C.ui.report.cols.slice(0, 4);
      const colX = RTL ? [x0 + SH.w - pad, x0 + SH.w - pad - 130, x0 + SH.w - pad - 230, x0 + SH.w - pad - 360] : [x0 + pad, x0 + pad + 130, x0 + pad + 230, x0 + pad + 360];
      return { x0, pad, cols, colX, head: top + 128, row0: top + 170, dy: V ? 58 : 46 };
    }
    function sceneReports(t) {
      if (t < T.rep - 0.3 || t > T.hal) return;
      const base = S.cols.base, out = prog(t, T.nj + 0.25, T.nj + 0.8);
      // the slot
      const sa = prog(t, T.rep - 0.15, T.rep + 0.35, E.outCubic) * (1 - out);
      const sw0 = (SH.w + 80) * sa;
      ctx.save(); ctx.globalAlpha = sa; ctx.fillStyle = TEAL_D; rrect(SH.cx - sw0 / 2, base - 4, sw0, 12, 6); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(SH.cx - sw0 / 2 + 8, base - 2, sw0 - 16, 2); ctx.restore();
      const top = sheetTop(t);
      if (top < base - 1) {
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, base - 2); ctx.clip();
        const L2 = sheetRowsLayout(top), x0 = L2.x0;
        ctx.globalAlpha = 1 - out;
        shadow(40, 16, 0.14); ctx.fillStyle = "#fff"; rrect(x0, top, SH.w, SH.h, 14); ctx.fill(); noShadow();
        ctx.strokeStyle = "rgba(40,36,20,0.08)"; ctx.lineWidth = 1; ctx.stroke();
        const rep = C.ui.report;
        ctx.globalAlpha = (1 - out) * (1 - prog(t, T.nj - 0.1, T.nj + 0.3));
        txt(rep.title, RTL ? x0 + SH.w - 30 : x0 + 30, top + 62, { align: RTL ? "right" : "left", size: V ? 34 : 30, w: 800 });
        txt(rep.meta, RTL ? x0 + SH.w - 30 : x0 + 30, top + 92, { align: RTL ? "right" : "left", size: V ? 18 : 16, w: 600, color: "rgba(31,28,18,0.5)" });
        ctx.fillStyle = TEAL; ctx.fillRect(x0 + 30, L2.head - 26, SH.w - 60, 36);
        L2.cols.forEach((c, k) => txt(c, L2.colX[k], L2.head - 2, { align: RTL ? "right" : "left", size: 17, w: 700, color: "#fff" }));
        rowsR.forEach((rw, k) => {
          const y = L2.row0 + k * L2.dy;
          if (k % 2) { ctx.fillStyle = "rgba(17,103,106,0.05)"; ctx.fillRect(x0 + 30, y - L2.dy * 0.62, SH.w - 60, L2.dy); }
          if (t < T.nj - 0.05) {
            txt(rw.d, L2.colX[0], y, { align: RTL ? "right" : "left", size: 17, w: 600, color: "rgba(31,28,18,0.7)", dir: "ltr" });
            txt(C.ui.table.types[rw.type], L2.colX[1], y, { align: RTL ? "right" : "left", size: 17, w: 700, color: TYPE_COL[rw.type] });
            txt(money(rw.amt), L2.colX[2], y, { align: RTL ? "right" : "left", size: 17, w: 800, color: TEAL });
          }
          txt(rw.desc, L2.colX[3], y, { align: RTL ? "right" : "left", size: 17, w: 600 });
        });
        txt(rep.showing, SH.cx, top + SH.h - 26, { size: 15, w: 600, color: "rgba(31,28,18,0.45)" });
        ctx.restore();
      }
      // the ring arrives as the report's logo; the wordmark completes around it
      const la = sheetLogoA(t);
      if (la > 0) drawLogo("wide", sheetLogo(t), la * (1 - out));
      // export formats
      ["Excel", "PDF", "CSV"].forEach((name, i) => {
        const col = ["#16a34a", "#dc2626", TEAL][i], e = prog(t, T.excel - 0.1 + i * 0.16, T.excel + 0.45 + i * 0.16, E.outBack), a = clamp(e) * (1 - prog(t, T.nj - 0.3, T.nj + 0.1));
        if (a <= 0) return;
        const tx0 = S.xch.x + (V ? (i - 1) * 230 : 0), ty0 = S.xch.y + i * S.xch.dy;
        const x = lerp(SH.cx, tx0, e), y = lerp(V ? S.cols.base - 200 : 400, ty0, e);
        ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
        shadow(24, 10, 0.14); ctx.fillStyle = "#fff"; rrect(-95, -34, 190, 68, 16); ctx.fill(); noShadow();
        const gx = RTL ? 50 : -78;
        ctx.fillStyle = col; rrect(gx, -20, 30, 40, 5); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.moveTo(gx + 20, -20); ctx.lineTo(gx + 30, -10); ctx.lineTo(gx + 20, -10); ctx.closePath(); ctx.fill();
        ctx.restore();
        txt(name, x + (RTL ? -16 : 16), y + 9, { alpha: a, size: 26, w: 800, color: INK, dir: "ltr" });
      });
    }

    // =========================================================== not just numbers
    const numbersFly = (() => { const r = rng(17); const out = []; rowsR.forEach((rw, k) => { out.push({ s: money(rw.amt), k, col: 2, vx: (r() - 0.5) * 160, vy: -140 - r() * 220, rot: (r() - 0.5) * 0.6, d: r() * 0.35 }); out.push({ s: rw.d, k, col: 0, vx: (r() - 0.5) * 160, vy: -120 - r() * 200, rot: (r() - 0.5) * 0.6, d: r() * 0.35 }); }); ["10%", "20%", "12 × 360", num(D.incomeBase), num(D.expenses)].forEach((s0, i) => out.push({ s: s0, k: i * 2, col: 1, vx: (r() - 0.5) * 220, vy: -160 - r() * 200, rot: (r() - 0.5) * 0.6, d: 0.2 + r() * 0.3 })); return out; })();
    function sceneNotJust(t, st) {
      if (t < T.nj - 0.1 || t > T.hal + 0.3) return;
      const L2 = sheetRowsLayout(S.cols.base - SH.h);
      for (const n of numbersFly) {
        const s0 = t - (T.nj - 0.05 + n.d);
        if (s0 <= 0) continue;
        const burst = prog(t, T.nums, T.nums + 0.9, E.outCubic);
        const bx = L2.colX[n.col] + (RTL ? -30 : 30), by = L2.row0 + n.k * L2.dy;
        const dx = bx - st.x, dy = by - st.y, dl = Math.hypot(dx, dy) || 1;
        const x = bx + n.vx * s0 * 0.6 + (dx / dl) * 420 * burst, y = by + n.vy * s0 * 0.6 + (dy / dl) * 300 * burst;
        const a = prog(s0, 0, 0.2) * (1 - prog(t, T.nums + 0.2, T.nums + 1.0));
        if (a <= 0) continue;
        ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(n.rot * s0);
        ctx.font = font(800, 22 + burst * 10); ctx.fillStyle = n.col === 2 ? TEAL : "rgba(31,28,18,0.7)"; ctx.textAlign = "center"; ctx.direction = RTL ? "rtl" : "ltr";
        ctx.fillText(n.s, 0, 0); ctx.restore();
      }
    }

    // =========================================================== halacha: book, topics, lens
    const topics = [1, 2, 3, 4, 6].map((i) => strip(C.ui.halacha.tabs[i]));
    const topicY = (i) => S.list.y0 + i * S.list.dy;
    const lensWay = [[T.halW + 0.9, 0], [T.halW + 1.55, 2], [T.halW + 2.2, 4]];
    function lensAt(t) {
      const rr0 = V ? 56 : 50, sw0 = V ? 14 : 12;
      let p = [S.book.x, S.book.y - S.book.h * 0.15];
      for (let k = 0; k < lensWay.length; k++) {
        const [tk, i] = lensWay[k], to = [S.list.x + (RTL ? 1 : -1) * 150, topicY(i)];
        const u = prog(t, tk - 0.45, tk, E.inOutCubic);
        p = [lerp(p[0], to[0], u), lerp(p[1], to[1], u)];
      }
      return { x: p[0], y: p[1], r: rr0, sw: sw0 };
    }
    function drawBook(bx, by, bw, bh, p, a) {
      if (a <= 0.002) return;
      ctx.save(); ctx.globalAlpha = a;
      const top = by - bh / 2, bot = by + bh / 2;
      const page = (side) => {
        const ox = bx + side * bw / 2;
        ctx.beginPath(); ctx.moveTo(bx, top + 14); ctx.quadraticCurveTo(bx + side * bw / 4, top - 22, ox, top); ctx.lineTo(ox, bot);
        ctx.quadraticCurveTo(bx + side * bw / 4, bot - 16, bx, bot + 10); ctx.closePath();
      };
      // cover under the pages
      ctx.fillStyle = TEAL; shadow(40, 18, 0.16);
      ctx.beginPath(); ctx.moveTo(bx - bw / 2 - 16, top + 10); ctx.lineTo(bx - bw / 2 - 16, bot + 18); ctx.quadraticCurveTo(bx - bw / 4, bot + 6, bx, bot + 26); ctx.quadraticCurveTo(bx + bw / 4, bot + 6, bx + bw / 2 + 16, bot + 18); ctx.lineTo(bx + bw / 2 + 16, top + 10); ctx.closePath(); ctx.fill(); noShadow();
      for (const side of [-1, 1]) {
        page(side); ctx.fillStyle = "#fffdf6"; ctx.fill(); ctx.strokeStyle = "rgba(17,103,106,0.4)"; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = "rgba(17,103,106,0.22)"; ctx.lineWidth = 3;
        for (let k = 0; k < 5; k++) {
          const yy = top + 40 + k * (bh - 70) / 4, u = clamp(p * 1.4 - k * 0.12);
          if (u <= 0) continue;
          ctx.beginPath(); ctx.moveTo(bx + side * 30, yy + 8); ctx.quadraticCurveTo(bx + side * bw / 4, yy - 12, bx + side * (30 + (bw / 2 - 70) * u), yy - 2); ctx.stroke();
        }
      }
      ctx.fillStyle = GOLD; ctx.fillRect(bx - 3, top + 16, 6, bh - 8);
      ctx.restore();
    }
    function sceneHalacha(t, st) {
      if (t < T.hal - 0.4 || t > T.tr) return;
      const inA = prog(t, T.hal - 0.3, T.hal + 0.4, E.outCubic), out = prog(t, T.rab - 0.3, T.rab + 0.2);
      drawBook(S.book.x, S.book.y + (1 - inA) * 30, S.book.w, S.book.h, prog(t, T.hal, T.hal + 1.0), inA * (1 - out));
      // topics rise out of the book into a list
      topics.forEach((name, i) => {
        const t0 = T.halW + i * 0.12, e = prog(t, t0, t0 + 0.6, E.outCubic);
        if (e <= 0) return;
        const x = lerp(S.book.x, S.list.x, e), y = lerp(S.book.y - S.book.h / 2, topicY(i), e);
        const hit = lensWay.reduce((acc, [tk, k]) => acc || (k === i && t > tk - 0.1 && (k === 4 || t < tk + 0.55)), false);
        pill(name, x, y, { size: V ? 28 : 26, alpha: e * (1 - out), bg: hit ? GOLD : "#fff", color: hit ? "#3d2f00" : INK, s: lerp(0.6, 1, e) * (hit ? 1.06 : 1), w: hit ? 800 : 700 });
      });
      // the found article
      const fa = prog(t, T.halW + 2.45, T.halW + 2.9, E.outCubic) * (1 - out);
      if (fa > 0) {
        const art = C.ui.halacha.articles[2];
        const y = topicY(4) + S.list.dy * 1.3;
        txt(strip(art.title), S.list.x, y + (1 - fa) * 12, { alpha: fa, size: V ? 32 : 28, w: 800, color: TEAL, halo: true });
      }
      // the lens handle (the ring itself is the glass)
      const la = prog(t, T.hal + 0.1, T.hal + 0.6) * (1 - prog(t, T.rab - 0.25, T.rab + 0.1));
      if (la > 0 && t < T.rab + 0.2) {
        const ang = RTL ? 0.25 * Math.PI : 0.75 * Math.PI, r0 = st.r + st.sw / 2;
        ctx.save(); ctx.globalAlpha = la; ctx.strokeStyle = TEAL; ctx.lineWidth = st.sw * 1.15; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(st.x + Math.cos(ang) * r0, st.y + Math.sin(ang) * r0); ctx.lineTo(st.x + Math.cos(ang) * (r0 + 60 * la), st.y + Math.sin(ang) * (r0 + 60 * la)); ctx.stroke(); ctx.restore();
      }
    }
    // lens glass tint (under the ring)
    function lensGlass(t, st) {
      const la = prog(t, T.hal + 0.1, T.hal + 0.6) * (1 - prog(t, T.rab - 0.25, T.rab + 0.1));
      if (la <= 0) return;
      ctx.save(); ctx.globalAlpha = la * 0.35; ctx.fillStyle = "#dff1ee"; ctx.beginPath(); ctx.arc(st.x, st.y, st.r - st.sw / 2, 0, TAU); ctx.fill(); ctx.restore();
    }

    // =========================================================== rabbi: the lens becomes a speech bubble
    function bubbleUnder(t, st) {
      const a = prog(t, T.rab - 0.1, T.rab + 0.5) * (1 - prog(t, T.tr - 0.4, T.tr - 0.05));
      if (a <= 0) return;
      ctx.save(); ctx.globalAlpha = a; shadow(46, 20, 0.14);
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, TAU); ctx.fill(); noShadow();
      // the tail grows out of the lens handle's place
      const ang = RTL ? 0.3 * Math.PI : 0.7 * Math.PI, k = prog(t, T.rab, T.rab + 0.5, E.outBack);
      const r0 = st.r + st.sw / 2 - 4, tip = [st.x + Math.cos(ang) * (r0 + 70 * k), st.y + Math.sin(ang) * (r0 + 70 * k)];
      ctx.fillStyle = TEAL; ctx.beginPath(); ctx.moveTo(st.x + Math.cos(ang - 0.28) * r0, st.y + Math.sin(ang - 0.28) * r0); ctx.lineTo(tip[0], tip[1]); ctx.lineTo(st.x + Math.cos(ang + 0.28) * r0, st.y + Math.sin(ang + 0.28) * r0); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    function sceneRabbi(t, st) {
      if (t < T.rab - 0.2 || t > T.tr + 0.2) return;
      const out = prog(t, T.tr - 0.4, T.tr - 0.05);
      const q = prog(t, T.qW, T.qW + 0.45, E.outBack), qOut = prog(t, T.askW + 1.0, T.askW + 1.3);
      if (q > 0 && qOut < 1) {
        ctx.save(); ctx.globalAlpha = clamp(q) * (1 - qOut) * (1 - out); ctx.translate(st.x, st.y); ctx.scale(clamp(q), clamp(q));
        ctx.font = font(800, st.r * 1.15); ctx.fillStyle = TEAL; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.direction = "ltr"; ctx.fillText("?", 0, st.r * 0.06); ctx.restore();
      }
      const ck = prog(t, T.askW + 1.1, T.askW + 1.5, E.outBack) * (1 - out);
      if (ck > 0) { ctx.save(); ctx.globalAlpha = clamp(ck); ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(st.x, st.y, st.r * 0.42 * clamp(ck), 0, TAU); ctx.fill(); ctx.restore(); checkGlyph(st.x, st.y, st.r * 0.36 * clamp(ck), "#3d2f00", 9); }
      // Ask the Rabbi: the button, then the message
      const ba = prog(t, T.askW, T.askW + 0.4, E.outBack) * (1 - out);
      if (ba > 0) pill(cp.rabbiLine, S.pill[0], S.pill[1], { size: 30, bg: TEAL, color: "#fff", w: 800, alpha: clamp(ba), s: lerp(0.7, 1, clamp(ba)) });
      const ma = prog(t, T.askW + 0.45, T.askW + 0.9, E.outCubic) * (1 - out);
      if (ma > 0) {
        const ct = C.ui.contact, [mx0, my0] = S.msg, w = V ? 820 : 640, hh = 120;
        ctx.save(); ctx.globalAlpha = ma; ctx.translate(mx0, my0 + (1 - ma) * 20);
        shadow(34, 14, 0.14); ctx.fillStyle = "#fff"; rrect(-w / 2, -hh / 2, w, hh, 20); ctx.fill(); noShadow(); ctx.restore();
        const sx = RTL ? mx0 + w / 2 - 28 : mx0 - w / 2 + 28, al = RTL ? "right" : "left";
        txt(ct.subject, sx, my0 - 12 + (1 - ma) * 20, { alpha: ma, size: 27, w: 800, align: al });
        const body = ct.body.length > (V ? 52 : 44) ? ct.body.slice(0, V ? 50 : 42).replace(/\s+\S*$/, "") + "…" : ct.body;
        txt(body, sx, my0 + 26 + (1 - ma) * 20, { alpha: ma, size: 21, w: 600, align: al, color: "rgba(31,28,18,0.6)" });
        const toastA = prog(t, T.askW + 1.15, T.askW + 1.5) * (1 - out);
        txt(ct.toast, mx0, my0 + hh / 2 + 44, { alpha: toastA, size: 22, w: 700, color: TEAL });
      }
    }

    // =========================================================== trust: the ring frames the institute
    function trustUnder(t, st) {
      const a = prog(t, T.tr + 0.1, T.tr + 0.6) * (1 - prog(t, T.pl - 0.35, T.pl));
      if (a <= 0) return;
      ctx.save(); ctx.globalAlpha = a; shadow(50, 22, 0.14); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, TAU); ctx.fill(); noShadow();
      const iw = (st.r - st.sw / 2) * 1.45, ih = (iw * machon.height) / machon.width;
      ctx.drawImage(machon, st.x - iw / 2, st.y - ih / 2, iw, ih); ctx.restore();
    }
    function sceneTrust(t) {
      if (t < T.tr - 0.2 || t > T.pl + 0.2) return;
      const out = prog(t, T.pl - 0.35, T.pl), tr = cp.trust;
      const a1 = prog(t, T.trW - 0.1, T.trW + 0.4, E.outCubic) * (1 - out), a2 = prog(t, T.rabbis - 0.1, T.rabbis + 0.4, E.outCubic) * (1 - out);
      const l1 = V ? tr.line1V : [tr.line1];
      l1.forEach((ln, k) => txt(ln, W / 2, S.trustL[0] + k * 70 + (1 - a1) * 18, { alpha: a1, size: V ? 60 : 58, w: 800 }));
      const y2 = S.trustL[1] + (V ? 70 : 0);
      txt(tr.line2, W / 2, y2 + (1 - a2) * 18, { alpha: a2, size: V ? 60 : 58, w: 800, color: TEAL });
      const ba = prog(t, T.rabbis + 0.45, T.rabbis + 0.85, E.outBack) * (1 - out);
      if (ba > 0) {
        pill(`${tr.verified}`, W / 2, S.trustL[2] + (V ? 70 : 0), { size: 26, bg: "#e3f1ee", color: TEAL, w: 800, alpha: clamp(ba), s: lerp(0.8, 1, clamp(ba)), pad: 44 });
      }
    }

    // =========================================================== platforms: web & desktop in the same geometry
    function globeUnder(t, st) {
      const a = prog(t, T.web - 0.1, T.web + 0.4) * (1 - prog(t, T.tog - 0.4, T.tog));
      if (a <= 0) return;
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = "#fff"; shadow(24, 10, 0.12); ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, TAU); ctx.fill(); noShadow();
      ctx.strokeStyle = "rgba(17,103,106,0.45)"; ctx.lineWidth = 1.6; const ri = st.r - st.sw / 2 - 2;
      for (let k = 0; k < 3; k++) { const rx = Math.abs(Math.cos(t * 0.8 + k * 1.05)) * ri; ctx.beginPath(); ctx.ellipse(st.x, st.y, Math.max(0.5, rx), ri, 0, 0, TAU); ctx.stroke(); }
      for (const f of [-0.5, 0, 0.5]) { const yy = st.y + f * ri, hw = Math.sqrt(Math.max(0, ri * ri - (f * ri) ** 2)); ctx.beginPath(); ctx.moveTo(st.x - hw, yy); ctx.lineTo(st.x + hw, yy); ctx.stroke(); }
      ctx.restore();
    }
    function miniDash(x, y, w, h, a) {
      // a dashboard drawn in the film's own language: ring + columns + lines
      const rr0 = h * 0.2;
      drawRing({ x: x + (RTL ? w * 0.28 : -w * 0.28), y: y - h * 0.05, r: rr0, sw: rr0 * 0.34 }, { alpha: a, shadow: false });
      const bx = x + (RTL ? -w * 0.36 : w * 0.02), vals = [0.9, 0.35, 0.18, 0.3];
      vals.forEach((v, i) => { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = i ? "#5aa59c" : TEAL; const bw = w * 0.07, bh = h * 0.42 * v; rrect(bx + i * bw * 1.6, y + h * 0.2 - bh, bw, bh, [3, 3, 0, 0]); ctx.fill(); ctx.restore(); });
      ctx.save(); ctx.globalAlpha = a * 0.6; ctx.fillStyle = "rgba(17,103,106,0.25)";
      for (let k = 0; k < 2; k++) ctx.fillRect(x - w * 0.4, y + h * 0.28 + k * 14, w * (0.8 - k * 0.3), 6);
      ctx.restore();
    }
    function device(kind, cx0, cy0, w, h, p, a) {
      if (a <= 0.002) return;
      const x0 = cx0 - w / 2, y0 = cy0 - h / 2;
      ctx.save(); ctx.globalAlpha = a;
      if (p < 1) { ctx.strokeStyle = TEAL; ctx.lineWidth = 3; ctx.setLineDash([(w + h) * 2 * p, 9999]); rrect(x0, y0, w, h, 16); ctx.stroke(); ctx.setLineDash([]); }
      const fa = prog(p, 0.55, 1);
      ctx.globalAlpha = a * fa; shadow(40, 18, 0.16); ctx.fillStyle = "#fff"; rrect(x0, y0, w, h, 16); ctx.fill(); noShadow();
      ctx.fillStyle = "#f1efe6"; rrect(x0, y0, w, 36, [16, 16, 0, 0]); ctx.fill();
      if (kind === "web") {
        ["#e0775f", "#e8c14a", "#63b36a"].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x0 + 22 + i * 18, y0 + 18, 5.5, 0, TAU); ctx.fill(); });
        ctx.fillStyle = "#fff"; rrect(cx0 - w * 0.28, y0 + 8, w * 0.56, 20, 10); ctx.fill();
        ctx.restore(); txt(C.ui.platforms.web.url, cx0, y0 + 24, { alpha: a * fa, size: 14, w: 700, color: "rgba(31,28,18,0.6)", dir: "ltr" }); ctx.save(); ctx.globalAlpha = a * fa;
      } else {
        ctx.strokeStyle = "rgba(31,28,18,0.55)"; ctx.lineWidth = 2;
        const rx = x0 + w - 22; ctx.beginPath(); ctx.moveTo(rx - 5, y0 + 13); ctx.lineTo(rx + 5, y0 + 23); ctx.moveTo(rx + 5, y0 + 13); ctx.lineTo(rx - 5, y0 + 23); ctx.stroke();
        ctx.strokeRect(rx - 36, y0 + 13, 10, 10); ctx.beginPath(); ctx.moveTo(rx - 64, y0 + 18); ctx.lineTo(rx - 54, y0 + 18); ctx.stroke();
        ctx.restore(); txt("TEN10", x0 + 22, y0 + 24, { alpha: a * fa, size: 15, w: 800, color: TEAL, dir: "ltr", align: "left" }); ctx.save(); ctx.globalAlpha = a * fa;
      }
      ctx.restore();
      miniDash(cx0, cy0 + 18, w, h - 36, a * fa);
    }
    function scenePlatforms(t) {
      if (t < T.pl - 0.3 || t > T.tog + 0.2) return;
      const out = prog(t, T.tog - 0.35, T.tog), P = C.ui.platforms, dv = S.dev;
      const ta = prog(t, T.pl + 0.05, T.pl + 0.5, E.outCubic) * (1 - out);
      if (ta > 0) {
        ctx.save(); ctx.font = font(800, S.tx.big * 0.86); const words = cp.platformsTitle.split(" "), lines = []; let cur = "";
        for (const w of words) { const tt = cur ? `${cur} ${w}` : w; if (ctx.measureText(tt).width > S.tx.w && cur) { lines.push(cur); cur = w; } else cur = tt; }
        lines.push(cur); ctx.restore();
        lines.forEach((ln, k) => txt(ln, S.tx.x, S.tx.top + S.tx.big * (0.9 + k * 0.98) + (1 - ta) * 24, { alpha: ta, size: S.tx.big * 0.86, w: 800, color: TEAL, align: RTL ? "right" : "left" }));
      }
      [["web", T.web, P.web], ["desk", T.desk, P.desktop]].forEach(([k, tk, info]) => {
        const p = prog(t, tk - 0.2, tk + 0.55, E.inOutCubic), a = prog(t, tk - 0.2, tk) * (1 - out);
        const [x, y] = dv[k];
        device(k, x, y, dv.w, dv.h, p, a);
        const capY = y + dv.h / 2 + 46, ca = prog(t, tk + 0.3, tk + 0.7) * (1 - out);
        txt(info.title, x, capY, { alpha: ca, size: 28, w: 800 });
        info.feats.forEach(([, f], i) => { const fa = prog(t, tk + 0.45 + i * 0.16, tk + 0.8 + i * 0.16) * (1 - out); txt(`·  ${f}`, x, capY + 36 + i * 30, { alpha: fa, size: 20, w: 600, color: "rgba(31,28,18,0.65)" }); });
      });
      // offline: the connection is cut, and it keeps working
      const oa = prog(t, T.off - 0.1, T.off + 0.4, E.outBack) * (1 - out);
      if (oa > 0) {
        const [x, y] = dv.desk, gx = x, gy = y - dv.h / 2 - 50;
        ctx.save(); ctx.globalAlpha = clamp(oa); ctx.strokeStyle = TEAL; ctx.lineWidth = 5; ctx.lineCap = "round";
        for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.arc(gx - 110, gy + 16, k * 11, -Math.PI * 0.75, -Math.PI * 0.25); ctx.stroke(); }
        ctx.fillStyle = TEAL; ctx.beginPath(); ctx.arc(gx - 110, gy + 16, 4, 0, TAU); ctx.fill();
        ctx.strokeStyle = "#dc2626"; ctx.beginPath(); ctx.moveTo(gx - 136, gy - 18); ctx.lineTo(gx - 84, gy + 22); ctx.stroke(); ctx.restore();
        pill(P.desktop.feats[0][1], gx + 40, gy, { size: 24, bg: GOLD, color: "#3d2f00", w: 800, alpha: clamp(oa), s: lerp(0.8, 1, clamp(oa)) });
      }
    }

    // =========================================================== together: every motif returns to the ring
    const MOTIFS = 8;
    function motif(k, x, y, r, a) {
      ctx.save(); ctx.globalAlpha = a; ctx.lineCap = "butt";
      const s0 = r;
      if (k === 0) { drawRing({ x, y, r: s0 * 0.5, sw: s0 * 0.2 }, { alpha: a, shadow: false }); ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x, y, s0 * (0.44 + i * 0.05), 0, TAU); ctx.stroke(); } }
      else if (k === 1) { ctx.strokeStyle = "#e7efe9"; ctx.lineWidth = s0 * 0.2; ctx.beginPath(); ctx.arc(x, y, s0 * 0.5, 0, TAU); ctx.stroke(); ctx.strokeStyle = TEAL; ctx.beginPath(); ctx.arc(x, y, s0 * 0.5, -Math.PI / 2, Math.PI); ctx.stroke(); ctx.strokeStyle = GOLD; ctx.lineWidth = s0 * 0.11; for (let i = 0; i < 9; i++) { const aa = -Math.PI / 2 + (i + 0.5) * (TAU / 12); ctx.beginPath(); ctx.arc(x, y, s0 * 0.5, aa - 0.12, aa + 0.12); ctx.stroke(); } }
      else if (k === 2) { drawRing({ x, y, r: s0 * 0.34, sw: s0 * 0.16 }, { alpha: a, shadow: false }); ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5; for (let i = 1; i <= 2; i++) { ctx.globalAlpha = a * (1 - i * 0.3); ctx.beginPath(); ctx.arc(x, y, s0 * (0.42 + i * 0.16), 0, TAU); ctx.stroke(); } }
      else if (k === 3) { [0.67, 0.15, 0.06, 0.12].forEach((v, i) => { ctx.fillStyle = i ? "#5aa59c" : TEAL; const bw = s0 * 0.22, bh = Math.max(3, s0 * 1.0 * v / 0.67 * 0.9); ctx.fillRect(x - s0 * 0.5 + i * bw * 1.25, y + s0 * 0.42 - bh, bw, bh); }); }
      else if (k === 4) { ctx.fillStyle = "#fff"; ctx.strokeStyle = "rgba(17,103,106,0.5)"; ctx.lineWidth = 2; rrect(x - s0 * 0.4, y - s0 * 0.52, s0 * 0.8, s0 * 1.04, 5); ctx.fill(); ctx.stroke(); ctx.fillStyle = TEAL; ctx.fillRect(x - s0 * 0.32, y - s0 * 0.4, s0 * 0.64, s0 * 0.12); ctx.fillStyle = "rgba(17,103,106,0.3)"; for (let i = 0; i < 4; i++) ctx.fillRect(x - s0 * 0.32, y - s0 * 0.16 + i * s0 * 0.16, s0 * (0.64 - (i % 2) * 0.2), s0 * 0.06); }
      else if (k === 5) { ctx.strokeStyle = TEAL; ctx.lineWidth = 3; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x, y - s0 * 0.2); ctx.quadraticCurveTo(x + sd * s0 * 0.25, y - s0 * 0.38, x + sd * s0 * 0.55, y - s0 * 0.3); ctx.lineTo(x + sd * s0 * 0.55, y + s0 * 0.3); ctx.quadraticCurveTo(x + sd * s0 * 0.25, y + s0 * 0.22, x, y + s0 * 0.36); ctx.stroke(); } ctx.fillStyle = GOLD; ctx.fillRect(x - 2, y - s0 * 0.2, 4, s0 * 0.56); }
      else if (k === 6) { ctx.fillStyle = TEAL; ctx.beginPath(); ctx.arc(x, y - s0 * 0.06, s0 * 0.44, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - s0 * 0.2, y + s0 * 0.3); ctx.lineTo(x - s0 * 0.34, y + s0 * 0.56); ctx.lineTo(x + s0 * 0.02, y + s0 * 0.36); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = font(800, s0 * 0.6); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("?", x, y - s0 * 0.04); }
      else { ctx.strokeStyle = TEAL; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, s0 * 0.48, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.ellipse(x, y, s0 * 0.22, s0 * 0.48, 0, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - s0 * 0.48, y); ctx.lineTo(x + s0 * 0.48, y); ctx.stroke(); }
      ctx.restore();
    }
    const togVals = () => [[cc.income, D.incomeBase + D.chomeshIncome, TYPE_COL.income, T.tInc], [cc.donations, D.donations, TYPE_COL.donation, T.tDon], [cc.expenses, D.expenses, TYPE_COL.expense, T.tObl]];
    function sceneTogether(t, st) {
      if (t < T.tog - 0.3 || t > T.brand + 0.3) return;
      const conv = prog(t, T.brand - 0.75, T.brand - 0.15, E.inCubic), [rx, ry] = S.medal, rm = V ? 56 : 50;
      for (let k = 0; k < MOTIFS; k++) {
        const e = prog(t, T.tog + k * 0.08, T.tog + 0.6 + k * 0.08, E.outCubic);
        if (e <= 0) continue;
        const ang = -Math.PI / 2 + (k + 0.5) * (TAU / MOTIFS) * (RTL ? -1 : 1);
        const R0 = lerp(1.9, 1, e) * (1 - conv);
        const x = st.x + Math.cos(ang) * rx * R0, y = st.y + Math.sin(ang) * ry * R0, a = clamp(e * 1.4) * (1 - prog(conv, 0.6, 1));
        const la = prog(t, T.tog + 0.45 + k * 0.05, T.tog + 0.9 + k * 0.05) * (1 - conv);
        if (la > 0) {
          const ex = st.x + Math.cos(ang) * (st.r + st.sw / 2 + 10), ey = st.y + Math.sin(ang) * (st.r + st.sw / 2 + 10);
          ctx.save(); ctx.globalAlpha = la * 0.6; ctx.strokeStyle = TEAL; ctx.lineWidth = 2; ctx.setLineDash([3, 6]);
          ctx.beginPath(); ctx.moveTo(lerp(x, ex, 0), lerp(y, ey, 0)); ctx.lineTo(lerp(x, ex, la), lerp(y, ey, la)); ctx.stroke(); ctx.restore();
        }
        ctx.save(); ctx.globalAlpha = a; shadow(26, 10, 0.13); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, rm * lerp(1, 0.3, conv), 0, TAU); ctx.fill(); noShadow(); ctx.restore();
        motif(k, x, y, rm * 0.9 * lerp(1, 0.3, conv), a);
      }
      // one clear picture: income, donations, obligations as the ring's three arcs, named inside it
      const arcsA = prog(t, T.tInc - 0.15, T.tInc + 0.1) * (1 - prog(t, T.brand - 0.45, T.brand - 0.3));
      if (arcsA > 0) {
        const vals = togVals();
        ctx.save(); ctx.lineCap = "butt"; shadow(40, 18, 0.14);
        vals.forEach(([, , col, tw], i) => {
          const a0 = -Math.PI / 2 + i * (TAU / 3) + 0.05, a1 = a0 + TAU / 3 - 0.1, cp2 = prog(t, tw, tw + 0.35);
          ctx.globalAlpha = arcsA; ctx.strokeStyle = TEAL; ctx.lineWidth = st.sw; ctx.beginPath(); ctx.arc(st.x, st.y, st.r, a0, a1); ctx.stroke();
          if (cp2 > 0) { ctx.globalAlpha = arcsA * cp2; ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(st.x, st.y, st.r, a0, a1); ctx.stroke(); }
        });
        ctx.restore();
        vals.forEach(([name, v, col, tw], i) => {
          const la = prog(t, tw, tw + 0.4, E.outCubic) * arcsA, y = st.y - st.r * 0.36 + i * st.r * 0.36;
          if (la <= 0) return;
          ctx.save(); ctx.globalAlpha = la; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(st.x + (RTL ? 1 : -1) * st.r * 0.58, y - 8, 7, 0, TAU); ctx.fill(); ctx.restore();
          txt(name, st.x + (RTL ? 1 : -1) * st.r * 0.48, y, { alpha: la, size: V ? 26 : 23, w: 700, color: "rgba(31,28,18,0.65)", align: RTL ? "right" : "left" });
          txt(money(v), st.x + (RTL ? -1 : 1) * st.r * 0.52, y, { alpha: la, size: V ? 30 : 27, w: 800, color: INK, align: RTL ? "left" : "right" });
        });
      }
    }

    // =========================================================== end card
    function sceneEnd(t, st) {
      if (t < T.brand - 0.4) return;
      // the opening's chaos, now a perfect halo of dots around the logo
      const ha = prog(t, T.brand + 0.2, T.brand + 1.2, E.outCubic), lcx = STACK.lx + STACK.lw / 2, lcy = STACK.ly + STACK.lh / 2;
      if (ha > 0) {
        for (let k = 0; k < 5; k++) {
          const rr0 = lerp(STACK.lw * 0.3, STACK.lw * (0.74 + k * 0.14), ha), n = 70 + k * 24;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * TAU + k * 0.1, am = ((a % TAU) + TAU) % TAU, t0 = ((TENTH_A0 % TAU) + TAU) % TAU, t1 = ((TENTH_A1 % TAU) + TAU) % TAU;
            const inT = am > t0 && am < t1;
            ctx.fillStyle = inT ? `rgba(240,192,0,${((0.6 - k * 0.09) * ha).toFixed(3)})` : `rgba(17,103,106,${((0.22 - k * 0.035) * ha).toFixed(3)})`;
            ctx.beginPath(); ctx.arc(lcx + Math.cos(a) * rr0, lcy + Math.sin(a) * rr0, 3.2 - k * 0.4, 0, TAU); ctx.fill();
          }
        }
      }
      // the stacked logo grows out of the ring
      const lv = prog(t, T.brand + 0.5, T.brand + 1.1, E.inOutCubic);
      if (t > T.brand + 0.48) {
        const G = LOGO.stack, f = STACK.lw / G.w, r0 = G.R * f + 2, rMax = Math.hypot(STACK.lw, STACK.lh) * 1.1;
        drawLogo("stack", STACK, 1, () => ctx.arc(STACK.ring.x, STACK.ring.y, lerp(r0, rMax, lv), 0, TAU));
      }
      // free, where, and with whom
      const fa = prog(t, T.freeW - 0.05, T.freeW + 0.4, E.outBack), [yF, yU, yC] = S.endFree;
      if (fa > 0) {
        ctx.save(); ctx.font = font(800, 30); const w1 = ctx.measureText(cp.free).width + 60; ctx.font = font(600, 30); const w2 = ctx.measureText(cp.freeSub).width; ctx.restore();
        const tot = w1 + 24 + w2, sx = W / 2 + (RTL ? tot / 2 : -tot / 2);
        pill(cp.free, sx + (RTL ? -w1 / 2 : w1 / 2), yF, { size: 30, bg: TEAL, color: "#fff", w: 800, alpha: clamp(fa), s: lerp(0.8, 1, clamp(fa)) });
        txt(cp.freeSub, sx + (RTL ? -w1 - 24 : w1 + 24), yF + 10, { alpha: clamp(fa), size: 30, w: 600, color: "rgba(31,28,18,0.7)", align: RTL ? "right" : "left" });
      }
      txt(cp.url, W / 2, yU, { alpha: prog(t, T.freeW + 0.7, T.freeW + 1.1), size: 32, w: 700, color: TEAL, dir: "ltr" });
      const ca = prog(t, T.freeW + 1.1, T.freeW + 1.5);
      if (ca > 0) {
        ctx.save(); ctx.font = font(600, 22); const ct = cp.trust.endCredit, cw2 = ctx.measureText(ct).width; ctx.restore();
        const mh = 58, mw = (mh * machon.width) / machon.height, gx = W / 2 - (cw2 + mw + 16) / 2;
        ctx.save(); ctx.globalAlpha = ca; ctx.drawImage(machon, RTL ? gx + cw2 + 16 : gx, yC - mh / 2, mw, mh); ctx.restore();
        txt(ct, RTL ? gx + cw2 : gx + mw + 16, yC + 8, { alpha: ca, size: 22, w: 600, color: "rgba(31,28,18,0.6)", align: RTL ? "right" : "left" });
      }
    }

    // =========================================================== the ring's own look over time
    function ringStyle(t) {
      const o = { alpha: 1, body: 1, tenthAlpha: 1, lift: 0, rot: 0, dx: 0, dy: 0 };
      if (t < T.c1) {
        o.body = prog(t, 0.2, 1.25, E.inOutCubic); if (o.body <= 0.001) o.alpha = 0;
        o.tenthAlpha = prog(t, T.h2w - 0.05, T.h2w + 0.15);
        o.lift = 30 * E.outBack(prog(t, T.h2w, T.h2w + 0.5)) * (1 - prog(t, T.h2w + 1.0, T.h2w + 1.6, E.inOutCubic));
      }
      const lvl = prog(t, T.kw[0], T.c2 + 1.0) * (1 - prog(t, T.ord, T.ord + 0.6)), shake = prog(t, T.harder, T.harder + 0.2) * (1 - prog(t, T.harder + 0.6, T.harder + 1.2));
      o.dx = Math.sin(t * 6.3) * 5 * lvl + Math.sin(t * 31) * 5 * shake; o.dy = Math.cos(t * 5.1) * 4 * lvl + Math.cos(t * 27) * 3 * shake; o.rot = Math.sin(t * 4.2) * 0.12 * lvl;
      if (t > T.ord + 1.28 && t < T.mas + 0.14) o.alpha = 0;
      if (t > T.masW - 0.1 && t < T.imp) o.lift = 24 * E.outBack(prog(t, T.masW, T.masW + 0.45)) * (1 - prog(t, T.imp - 0.7, T.imp - 0.3));
      if (sheetLogoA(t) >= 0.999) o.alpha = 0;
      if (t > T.tInc - 0.15 && t < T.brand - 0.35) o.alpha = 0;
      if (t > T.brand + 0.5) o.alpha = 0;
      return o;
    }

    // ------------------------------------------------------------ frame
    function seek(t) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.filter = "none";
      const dk = darkness(t);
      ctx.drawImage(bgLight, 0, 0);
      if (dk > 0) {
        ctx.save(); ctx.beginPath();
        ctx.arc(S.rec.x, S.rec.y, dIn(t) * RMAX, 0, TAU);
        if (dOut(t) > 0) ctx.arc(S.rem.x, S.rem.y, dOut(t) * RMAX, 0, TAU, true);
        ctx.clip("evenodd"); ctx.drawImage(bgDark, 0, 0); ctx.restore();
      }
      const st0 = ringAt(t), rs = ringStyle(t);
      const st = { ...st0, x: st0.x + rs.dx, y: st0.y + rs.dy };
      // under the ring
      sceneChaos(t, st);
      lensGlass(t, st);
      bubbleUnder(t, st);
      trustUnder(t, st);
      globeUnder(t, st);
      // the ring (the year replaces it in "recurring", the dark ring in "reminders")
      const yearVis = prog(t, T.rec - 0.25, T.rec + 0.25) * (1 - prog(t, T.rem - 0.3, T.rem + 0.05));
      const anFill = t < T.an - 0.2 ? 1 : prog(t, T.anW + 0.2, T.anW + 1.4, E.outCubic);
      const ringDark = isDark(st.x, st.y, t) ? 1 : 0, dkR = lerp(ringDark, dk, 0.35);
      const solidA = rs.alpha * (1 - yearVis) * (1 - dkR);
      if (anFill < 1 && solidA > 0) { ctx.save(); ctx.globalAlpha = solidA; ctx.strokeStyle = "#e7efe9"; ctx.lineWidth = st.sw; ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, TAU); ctx.stroke(); ctx.restore(); }
      drawRing(st, { alpha: solidA, body: Math.max(0.001, Math.min(rs.body, anFill)), tenth: anFill > 0.97, tenthAlpha: rs.tenthAlpha, shadow: anFill > 0.97, lift: rs.lift, tenthRot: rs.rot });
      // over the ring
      sceneHook(t, st);
      sceneOrder(t);
      sceneMaaser(t, st);
      sceneImport(t, st);
      sceneYear(t, st);
      sceneRemind(t, st, dkR);
      scenePour(t, st);
      sceneReports(t);
      sceneNotJust(t, st);
      sceneHalacha(t, st);
      sceneRabbi(t, st);
      sceneTrust(t);
      scenePlatforms(t);
      sceneTogether(t, st);
      sceneEnd(t, st);
      drawText(t);
      drawHud(t);
    }

    // ------------------------------------------------------------ sound
    cue(0.25, "sweep", 0.3);
    cue(T.h2w, "pop", 0.5);
    groups.forEach((g) => { cue(g.t0, "arrive", 0.3); g.items.forEach((_, i) => cue(g.t0 + 0.12 + i * 0.1, "tick", 0.14)); });
    cue(T.harder, "whoosh", 0.28);
    cue(T.ord - 0.15, "sweep", 0.5);
    cue(T.ord + 0.65, "resolve", 0.45);
    cue(T.ord + 1.3, "whoosh", 0.25);
    cue(T.mas + 0.55, "tick", 0.2);
    cue(T.masW, "pop", 0.4);
    cue(T.chW, "pop", 0.4);
    cue(T.chW + 0.75, "arrive", 0.26);
    C.chaos.currencies.forEach((_, i) => cue(T.cur - 0.35 + i * 0.16 + 0.5, "tap", 0.18));
    cue(T.imp - 0.15, "pop", 0.3);
    cue(T.impW, "whoosh", 0.26);
    arriveT.forEach((ta, i) => cue(ta, "tick", 0.16 + (i % 2) * 0.04));
    cue(arriveT[arriveT.length - 1] + 0.05, "arrive", 0.3);
    cue(T.rec - 0.2, "sweep", 0.34);
    cue(T.recW + 0.05, "pop", 0.38);
    cue(firstStamp, "calendar", 0.45);
    cue(T.auto - 0.05, "whoosh", 0.22);
    stampT.slice(1).forEach((s) => cue(s, "tick", 0.2));
    cue(T.rem - 0.35, "whoosh", 0.3);
    cue(T.remW, "notify", 0.55);
    cue(T.card, "pop", 0.34);
    cue(T.an - 0.35, "sweep", 0.34);
    cue(T.anW + 0.2, "whoosh", 0.2);
    cols.forEach((c) => cue(c.rs + 0.45, "arrive", 0.22));
    cue(T.house, "pop", 0.3);
    cue(T.rep - 0.3, "sweep", 0.3);
    cue(T.print, "whoosh", 0.34);
    for (let k = 0; k < 8; k++) cue(T.print + 0.1 + k * 0.12, "tick", 0.12);
    ["Excel", "PDF", "CSV"].forEach((_, i) => cue(T.excel + i * 0.16, "pop", 0.26));
    cue(T.nj, "whoosh", 0.24);
    cue(T.nums, "sweep", 0.34);
    cue(T.hal, "whoosh", 0.22);
    topics.forEach((_, i) => cue(T.halW + i * 0.12 + 0.3, "tick", 0.15));
    lensWay.forEach(([tk]) => cue(tk, "tap", 0.24));
    cue(T.qW, "pop", 0.34);
    cue(T.askW, "tap", 0.4);
    cue(T.askW + 0.5, "whoosh", 0.22);
    cue(T.askW + 1.15, "notify", 0.4);
    cue(T.tr + 0.1, "sweep", 0.28);
    cue(T.trW, "arrive", 0.24);
    cue(T.rabbis + 0.45, "pop", 0.3);
    cue(T.web - 0.2, "whoosh", 0.26);
    cue(T.desk - 0.2, "whoosh", 0.26);
    cue(T.off - 0.1, "pop", 0.3);
    for (let k = 0; k < MOTIFS; k++) cue(T.tog + k * 0.08 + 0.3, "tick", 0.13);
    [T.tInc, T.tDon, T.tObl].forEach((tt) => cue(tt, "pop", 0.26));
    cue(T.brand - 0.6, "sweep", 0.4);
    cue(T.brand + 0.5, "resolve", 0.5);
    cue(T.freeW, "pop", 0.34);

    function qa() { return blocks.map((b) => { const l = b.items[b.items.length - 1].t + 0.45; return { text: b.text, in: b.tIn, out: b.tOut, readable: b.tOut - l }; }); }
    seek(0);
    return { duration: T.end, width: W, height: H, format: V ? "vertical" : "landscape", range: [0, T.end], seek, times: T, qa, cues: () => ({ duration: T.end, cues: [...sfx].sort((a, b) => a.t - b.t) }) };
  }

  window.GEO = { init };
})();
