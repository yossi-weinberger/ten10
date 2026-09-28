// "Cine" cut: the feature stretch as an engraved, lit, continuous world (canvas).
//
// Look: warm paper, teal ink engraving, gold leaf. The motif is the logo's gold slice (the
// tenth). The narration itself is the typography: words arrive as they are spoken and the
// key words slam in. Transitions are events in the world: a burst of light out of the
// ledger, the lights going out on the calendar machine, a letter flying into a spark that
// opens onto the house. A thin HUD (chapter, month, balance, timeline) holds it together.
//
//   import     statements fan out; thousands of rows stream into a ledger whose pages flip
//   recurring  a geared calendar: the standing order is sealed onto its month, then the
//              machine runs the whole year by itself
//   reminders  lights out; an engraved bell rings; the reminder letter folds into an
//              envelope, is sealed and flies off
//   analytics  a house draws itself; the roof lifts; the rooms are the real spending split
//              and gold pours into them; the camera cranes up until the plan reads as a chart
//
// Deterministic: every frame is a pure function of t (seeded randomness only). Same
// narration anchors, sound cues and render tools as the main film.
(function () {
  const { clamp, lerp, E, prog, makeAnchors, cue, sfx } = window.ENGINE;
  const KW = 0.14;
  const INK = "#143b3c", TEAL = "#11676a", GOLD = "#f0c000", GOLD_D = "#a87f00", PAPER = "#f6f0e0", DARK = "#0b1514";

  // ------------------------------------------------------------ helpers
  const rng = (seed) => {
    let s = (seed * 2654435761) | 0 || 1;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const rotY = (p, a) => [p[0] * Math.cos(a) + p[2] * Math.sin(a), p[1], -p[0] * Math.sin(a) + p[2] * Math.cos(a)];
  const rotX = (p, a) => [p[0], p[1] * Math.cos(a) - p[2] * Math.sin(a), p[1] * Math.sin(a) + p[2] * Math.cos(a)];
  const rotZ = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a), p[2]];
  /** perspective camera → projector p ↦ [sx, sy, depth] */
  function camera(eye, target, f, cx, cy) {
    const fw = norm(sub(target, eye)), rt = norm(cross(fw, [0, 1, 0])), up = cross(rt, fw);
    const pr = (p) => { const v = sub(p, eye); const z = Math.max(dot(v, fw), 0.05); return [cx + (dot(v, rt) / z) * f, cy - (dot(v, up) / z) * f, z]; };
    pr.eye = eye;
    return pr;
  }
  const lineTo2 = (ctx, pts) => { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); };
  /** faces: {p:[3d...], fill, stroke, lw, a} → painter's sort, optional back-face cull */
  function drawFaces(ctx, faces, pr, cull = false) {
    const list = [];
    for (const f of faces) {
      if (cull) {
        const n = cross(sub(f.p[1], f.p[0]), sub(f.p[2], f.p[0]));
        if (dot(n, sub(pr.eye, f.p[0])) <= 0) continue;
      }
      const q = f.p.map(pr);
      list.push({ f, q, z: q.reduce((a, b) => a + b[2], 0) / q.length });
    }
    list.sort((a, b) => b.z - a.z);
    for (const { f, q } of list) {
      ctx.globalAlpha = f.a ?? 1;
      ctx.beginPath(); lineTo2(ctx, q); ctx.closePath();
      if (f.fill) { ctx.fillStyle = f.fill; ctx.fill(); }
      if (f.stroke) { ctx.strokeStyle = f.stroke; ctx.lineWidth = f.lw || 1.4; ctx.stroke(); }
      if (f.after) f.after(q);
    }
    ctx.globalAlpha = 1;
  }
  /** partial polyline (stroke reveal) */
  function strokePart(ctx, pts, u) {
    if (u <= 0) return;
    let total = 0; const seg = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
    let left = total * clamp(u);
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length && left > 0; i++) {
      const k = Math.min(1, left / (seg[i - 1] || 1));
      ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k));
      left -= seg[i - 1];
    }
    ctx.stroke();
  }

  async function init(stage, lang, timing, opts = {}) {
    const C = window.CONTENT[lang];
    const RTL = C.dir === "rtl";
    const V = opts.format === "vertical";
    const W = V ? 1080 : 1920, H = V ? 1920 : 1080;
    const cp = C.copy, cc = cp.cine;
    const money = window.makeUI(C).money;
    const FONT = "Assistant";
    await Promise.all(["600", "700", "800"].map((w) => document.fonts.load(`${w} 60px ${FONT}`)));

    stage.className = (RTL ? "rtl" : "ltr-stage") + (V ? " vertical" : "") + " cine";
    stage.innerHTML = "";
    sfx.length = 0;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    cv.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px`;
    stage.append(cv);
    const ctx = cv.getContext("2d");

    // layout: the illustration sits opposite the reading-start side (vertical: under the text)
    const L = V
      ? { ox: 540, oy: 1170, k: 1.12, txX: RTL ? W - 84 : 84, txW: 912, txTop: 250, small: RTL ? 50 : 44, big: RTL ? 112 : 96, hud: 64 }
      : { ox: RTL ? 690 : 1230, oy: 560, k: 1, txX: RTL ? W - 128 : 128, txW: 700, txTop: 330, small: RTL ? 46 : 40, big: RTL ? 104 : 90, hud: 58 };
    const K = L.k;

    const A = makeAnchors(timing);
    const B = (k) => A.w(C.beats[k][0], C.beats[k][1]);
    const ph = (id) => timing.phrases.find((p) => p.id === id);
    const T = {
      a: A.s("import") - 0.5, b: A.s("reports") - 0.1,
      imp: A.s("import"), impW: B("importWord") - KW,
      rec: A.s("recurring"), recW: B("recurringWord") - KW, auto: B("autoWord") - KW,
      rem: A.s("reminders"), remW: B("remindWord") - KW,
      an: A.s("analytics"), anW: B("analyticsWord") - KW, money: B("moneyWord") - KW, house: B("householdWord") - KW,
    };
    const remWords = ph("reminders").words;
    T.letter = Math.min(remWords[remWords.length - 1].start - KW, T.an - 2.05);
    T.cut12 = T.rec - 0.2;          // light burst out of the ledger
    T.dark = T.rem - 0.35;          // lights go out
    T.cut34 = T.an - 0.3;           // the spark opens onto the house

    // ------------------------------------------------------------ paper, grain, vignette
    const paper = document.createElement("canvas"); paper.width = W; paper.height = H;
    {
      const g = paper.getContext("2d"), r = rng(7);
      g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 70; i++) {
        const x = r() * W, y = r() * H, rr = 80 + r() * 380, dark = r() < 0.55;
        const gr = g.createRadialGradient(x, y, 0, x, y, rr);
        gr.addColorStop(0, dark ? "rgba(150,120,60,0.016)" : "rgba(255,253,245,0.12)"); gr.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      }
      g.lineWidth = 0.7;
      for (let i = 0; i < 2600; i++) {
        const x = r() * W, y = r() * H, a = r() * Math.PI, l = 4 + r() * 16;
        g.strokeStyle = `rgba(110,86,40,${0.02 + r() * 0.035})`;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
      }
      const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.62);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(90,66,24,0.11)");
      g.fillStyle = vg; g.fillRect(0, 0, W, H);
    }
    const grains = [0, 1, 2].map((k) => {
      const c = document.createElement("canvas"); c.width = 256; c.height = 256;
      const g = c.getContext("2d"), id = g.createImageData(256, 256), r = rng(100 + k);
      for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 9; }
      g.putImageData(id, 0, 0);
      return ctx.createPattern(c, "repeat");
    });

    // ------------------------------------------------------------ typography (the narration)
    const blocks = [];
    function makeBlock(id, nSmall, tOut) {
      const p = ph(id);
      const toks = p.text.split(/\s+/).filter(Boolean);
      const words = toks.length === p.words.length ? toks : p.words.map((w) => w.w);
      const items = words.map((w, i) => ({ w: w.replace(/[,;:—]+$/, ""), t: p.words[i].start - 0.06, big: i >= nSmall }));
      items[items.length - 1].w = items[items.length - 1].w.replace(/[.!?]*$/, "") + ".";
      // lay out: small words on line(s), big words wrapped to the column
      const lines = [];
      const place = (big) => {
        ctx.font = `${big ? 800 : 700} ${big ? L.big : L.small}px ${FONT}`;
        const sp = ctx.measureText(" ").width;
        let line = [], w = 0;
        for (const it of items.filter((x) => x.big === big)) {
          it.width = ctx.measureText(it.w).width;
          if (line.length && w + sp + it.width > L.txW) { lines.push({ big, items: line, width: w }); line = []; w = 0; }
          w += (line.length ? sp : 0) + it.width; line.push(it);
        }
        if (line.length) lines.push({ big, items: line, width: w });
        // no orphan: pull a word down onto a lone last line when it fits
        const own = lines.filter((l) => l.big === big);
        if (own.length > 1) {
          const last = own[own.length - 1], prev = own[own.length - 2];
          while (last.items.length === 1 && prev.items.length > 2) {
            const mv = prev.items[prev.items.length - 1];
            if (last.width + sp + mv.width > L.txW) break;
            prev.items.pop(); prev.width -= sp + mv.width;
            last.items.unshift(mv); last.width += sp + mv.width;
          }
        }
        return sp;
      };
      const spS = place(false), spB = place(true);
      let y = L.txTop;
      for (const ln of lines) {
        const sz = ln.big ? L.big : L.small;
        y += ln.big ? sz * 0.98 : sz * 1.0;
        let x = L.txX;
        for (const it of ln.items) {
          it.x = RTL ? x : x; it.y = y; it.size = sz;
          x += (RTL ? -1 : 1) * (it.width + (ln.big ? spB : spS));
        }
        y += ln.big ? sz * 0.12 : sz * 0.42;
      }
      const b = { id, items, tIn: items[0].t, tOut, text: items.map((x) => x.w).join(" ") };
      blocks.push(b);
      return b;
    }
    makeBlock("import", cc.split.import, T.cut12 + 0.05);
    makeBlock("recurring", cc.split.recurring, T.dark + 0.1);
    makeBlock("reminders", cc.split.reminders, T.cut34 + 0.05);
    makeBlock("analytics", cc.split.analytics, T.b + 5);
    const dark = (t) => clamp(prog(t, T.dark, T.dark + 0.45, E.inOutQuad) - prog(t, T.cut34 + 0.05, T.cut34 + 0.4, E.inOutQuad));
    function drawText(t) {
      ctx.save();
      ctx.textBaseline = "alphabetic";
      ctx.direction = RTL ? "rtl" : "ltr";
      ctx.textAlign = RTL ? "right" : "left";
      const dk = dark(t);
      for (const b of blocks) {
        const out = prog(t, b.tOut, b.tOut + 0.4, E.inCubic);
        if (t < b.tIn - 0.05 || out >= 1) continue;
        for (const it of b.items) {
          const p = prog(t, it.t, it.t + (it.big ? 0.42 : 0.35), E.outQuint);
          if (p <= 0) continue;
          ctx.font = `${it.big ? 800 : 700} ${it.size}px ${FONT}`;
          const base = it.big ? TEAL : "#2a2616";
          const col = dk > 0.5 ? (it.big ? GOLD : "#efe6cf") : base;
          const y = it.y - out * 30 + (it.big ? 0 : (1 - p) * 22);
          if (it.big && p < 1) {
            // the slam: a smear trailing against the reading direction, then settle
            const sm = (1 - p) * 90;
            for (let k = 4; k >= 1; k--) {
              ctx.globalAlpha = (1 - p) * 0.16 * (1 - out);
              ctx.fillStyle = k % 2 ? GOLD : col;
              ctx.fillText(it.w, it.x + (RTL ? 1 : -1) * sm * (k / 4), y);
            }
            ctx.save();
            const sc = lerp(1.18, 1, p);
            ctx.translate(it.x, y); ctx.scale(sc, sc);
            ctx.globalAlpha = p * (1 - out); ctx.fillStyle = col;
            ctx.filter = p < 0.7 ? `blur(${((0.7 - p) * 8).toFixed(1)}px)` : "none";
            ctx.fillText(it.w, 0, 0);
            ctx.restore(); ctx.filter = "none";
          } else {
            ctx.globalAlpha = p * (1 - out); ctx.fillStyle = col;
            if (out > 0) ctx.filter = `blur(${(out * 6).toFixed(1)}px)`;
            ctx.fillText(it.w, it.x, y);
            ctx.filter = "none";
          }
          // gold full stop on the final word
          if (it === b.items[b.items.length - 1] && p > 0.6) {
            const wDot = ctx.measureText(".").width;
            ctx.globalAlpha = prog(p, 0.6, 1) * (1 - out); ctx.fillStyle = GOLD;
            ctx.fillText(".", RTL ? it.x - it.width + wDot : it.x + it.width - wDot, y);
          }
        }
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // ------------------------------------------------------------ HUD
    const monthName = (i) => new Intl.DateTimeFormat(C.locale, { month: "long", year: "numeric" }).format(new Date(2025, 11 + i, 1));
    const hudChapter = (t) => (t < T.cut12 + 0.2 ? ["03", cc.chapters.import] : t < T.dark + 0.2 ? ["04", cc.chapters.recurring] : t < T.cut34 + 0.2 ? ["05", cc.chapters.reminders] : ["06", cc.chapters.analytics]);
    function drawHud(t, monthIdx) {
      const m = L.hud, dk = dark(t);
      const ink = dk > 0.5 ? "rgba(240,228,200,0.62)" : "rgba(20,59,60,0.62)";
      const faint = dk > 0.5 ? "rgba(240,228,200,0.22)" : "rgba(20,59,60,0.22)";
      const a = prog(t, T.a, T.a + 0.5);
      ctx.save(); ctx.globalAlpha = a;
      ctx.font = `700 21px ${FONT}`; ctx.fillStyle = ink; ctx.textBaseline = "middle";
      // corner registration marks
      ctx.strokeStyle = faint; ctx.lineWidth = 1.5;
      for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
        ctx.beginPath(); ctx.moveTo(x, y + sy * 26); ctx.lineTo(x, y); ctx.lineTo(x + sx * 26, y); ctx.stroke();
      }
      const [num, name] = hudChapter(t);
      const startX = RTL ? W - m - 40 : m + 40, endX = RTL ? m + 40 : W - m - 40;
      ctx.direction = RTL ? "rtl" : "ltr";
      ctx.textAlign = RTL ? "right" : "left";
      ctx.fillText(`${num} · ${name}`, startX, m + 12);
      ctx.textAlign = RTL ? "left" : "right";
      ctx.fillText(cc.brand, endX, m + 12);
      // bottom: month (start side), balance (end side), a timeline between them
      ctx.textAlign = RTL ? "right" : "left";
      ctx.font = `800 26px ${FONT}`;
      ctx.fillText(monthName(monthIdx), startX, H - m - 14);
      ctx.textAlign = RTL ? "left" : "right";
      ctx.font = `700 21px ${FONT}`;
      const showSpend = t >= T.anW + 0.3;
      ctx.fillText(`${showSpend ? cp.sym.household : cc.balance}  ${money(showSpend ? spendTotal : 820)}`, endX, H - m - 14);
      const x0 = W / 2 - (V ? 180 : 320), x1 = W / 2 + (V ? 180 : 320), y0 = H - m - 14;
      ctx.strokeStyle = faint; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();
      for (let i = 0; i <= 20; i++) { const x = lerp(x0, x1, i / 20); ctx.beginPath(); ctx.moveTo(x, y0 - (i % 5 ? 4 : 9)); ctx.lineTo(x, y0); ctx.stroke(); }
      const filmT = timing.audioDuration + 3;
      const u = clamp(t / filmT), mxp = RTL ? lerp(x1, x0, u) : lerp(x0, x1, u);
      ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(mxp, y0, 6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // ------------------------------------------------------------ light events
    const rays = (() => { const r = rng(55); return Array.from({ length: 140 }, () => ({ a: r() * Math.PI * 2, w: 0.004 + r() * 0.012, l: 0.35 + r() * 0.65 })); })();
    function burst(t, t0, x, y, dur = 0.55) {
      const u = (t - t0) / dur;
      if (u <= 0 || u >= 1) return;
      const env = u < 0.22 ? E.outCubic(u / 0.22) : 1 - E.inOutQuad((u - 0.22) / 0.78);
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const Rm = Math.hypot(W, H);
      for (const r of rays) {
        ctx.fillStyle = `rgba(255,236,170,${(0.14 * env * r.l).toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.arc(x, y, Rm * (0.4 + 0.6 * u), r.a, r.a + r.w); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      const g = ctx.createRadialGradient(x, y, 0, x, y, Rm * 0.7);
      g.addColorStop(0, `rgba(255,251,236,${env})`); g.addColorStop(0.35, `rgba(255,246,220,${env * 0.85})`); g.addColorStop(1, `rgba(255,240,200,${env * 0.2})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }

    // =========================================================== scene 1: import
    const S1 = { f: 1500 * K, cx: L.ox, cy: L.oy };
    const cam1 = (t) => {
      const u = prog(t, T.a, T.cut12, E.inOutQuad);
      const eye = [lerp(0.4, -0.25, u) * (RTL ? 1 : -1), lerp(2.5, 2.25, u), lerp(5.9, 5.2, u)];
      return camera(eye, [0, 0.72, 0], S1.f, S1.cx, S1.cy);
    };
    const NS = 5, ROWS = 12;
    const sheetPose = (i, t) => {
      const fan = prog(t, T.imp - 0.35, T.imp + 0.5, E.outCubic);
      const drift = (t - T.imp) * 0.06;
      const ang = (i - (NS - 1) / 2) * 0.23 * fan;
      return { c: [Math.sin(ang) * 1.75 * fan, 1.3 + Math.cos(ang) * 0.3 * fan - 0.06 * i * (1 - fan), -0.7 - i * 0.04], ry: ang * 0.9 + drift * (i % 2 ? 1 : -1), rx: -0.32 + 0.1 * fan, rz: ang * 0.35 };
    };
    const sheetPt = (i, t, u, v) => { // u,v ∈ [-1,1] on the sheet
      const s = sheetPose(i, t);
      let p = [u * 0.44, v * 0.6, 0];
      p = rotZ(p, s.rz); p = rotX(p, s.rx); p = rotY(p, s.ry);
      return add(p, s.c);
    };
    const rowDetach = (i, r) => T.impW + 0.1 + r * 0.075 + i * 0.05;
    const rowColor = (i, r) => { const k = (i * 7 + r * 3) % 9; return k < 2 ? "#16a34a" : k < 4 ? GOLD : k < 7 ? "#dc2626" : "#9a8f6f"; };
    // the swarm: many fine strokes from the sheets into the ledger
    const swarm = (() => { const r = rng(21); return Array.from({ length: 1100 }, (_, n) => ({ j: r(), i: n % NS, u: r() * 1.7 - 0.85, v: r() * 1.7 - 0.85, ts: T.impW + 0.05 + Math.pow(r(), 0.8) * 1.55, d: 0.8 + r() * 0.3, sw: 0, col: r() < 0.08, ci: n })); })();
    const bookTarget = [0, 0.05, 0.1];
    const pageAt = (a, x, z) => { // right page point rotated about the spine (z axis) by a
      const curve = 0.07 * Math.sin(Math.PI * x);
      return [x * Math.cos(a) - curve * Math.sin(a), x * Math.sin(a) + curve * Math.cos(a) + 0.02, z];
    };
    const flipTimes = Array.from({ length: 11 }, (_, k) => T.impW + 0.55 + 1.9 * (1 - Math.pow(1 - k / 11, 1.7)));
    function drawBookPage(pr, a, shade, lines) {
      const N = 8, pts = [];
      for (let k = 0; k <= N; k++) pts.push(pageAt(a, 0.02 + (k / N) * 0.98, -0.72));
      for (let k = N; k >= 0; k--) pts.push(pageAt(a, 0.02 + (k / N) * 0.98, 0.72));
      const q = pts.map((p) => pr(add(p, bookTarget)));
      ctx.beginPath(); lineTo2(ctx, q); ctx.closePath();
      ctx.fillStyle = shade; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.stroke();
      if (lines) {
        ctx.strokeStyle = "rgba(20,59,60,0.28)"; ctx.lineWidth = 1;
        for (let r = 0; r < 11; r++) {
          const z = -0.6 + r * 0.12;
          const p0 = pr(add(pageAt(a, 0.12, z), bookTarget)), p1 = pr(add(pageAt(a, 0.9, z), bookTarget));
          ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
        }
      }
    }
    let importedShown = 0;
    function scene1(t) {
      if (t > T.cut12 + 0.35) return;
      const pr = cam1(t);
      const ain = prog(t, T.a, T.a + 0.5);
      ctx.save(); ctx.globalAlpha = ain;
      // ground shadow for the ledger
      const bs = pr(bookTarget);
      const sh = ctx.createRadialGradient(bs[0], bs[1] + 30 * K, 0, bs[0], bs[1] + 30 * K, 420 * K);
      sh.addColorStop(0, "rgba(60,44,14,0.22)"); sh.addColorStop(1, "rgba(60,44,14,0)");
      ctx.fillStyle = sh; ctx.fillRect(bs[0] - 500 * K, bs[1] - 300 * K, 1000 * K, 700 * K);
      // ledger: covers, left page stack, right page, flipping pages
      const cover = (sx) => [pageAt(sx < 0 ? Math.PI : 0, 1.08, -0.8), pageAt(sx < 0 ? Math.PI : 0, 1.08, 0.8), [0, -0.02, 0.8], [0, -0.02, -0.8]].map((p) => pr(add([p[0], p[1] - 0.05, p[2]], bookTarget)));
      for (const sx of [-1, 1]) { const q = cover(sx); ctx.beginPath(); lineTo2(ctx, q); ctx.closePath(); ctx.fillStyle = TEAL; ctx.fill(); ctx.strokeStyle = "#0b3b3c"; ctx.lineWidth = 1.5; ctx.stroke(); }
      drawBookPage(pr, Math.PI, "#f8f2e0", true);
      drawBookPage(pr, 0, "#fbf6e8", true);
      for (const ft of flipTimes) {
        const u = prog(t, ft, ft + 0.42, E.inOutQuad);
        if (u > 0 && u < 1) drawBookPage(pr, Math.PI * u, u < 0.5 ? "#fffaf0" : "#f1e9d2", false);
      }
      // gold ring emblem on the right page (the logo's 0 with its tenth)
      const em = pr(add(pageAt(Math.PI, 0.52, 0), bookTarget));
      ctx.lineWidth = 7 * K; ctx.strokeStyle = TEAL; ctx.beginPath(); ctx.ellipse(em[0], em[1], 46 * K, 24 * K, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = GOLD; ctx.beginPath(); ctx.ellipse(em[0], em[1], 46 * K, 24 * K, 0, -1.45, -0.85); ctx.stroke();

      // statement sheets
      for (let i = NS - 1; i >= 0; i--) {
        const fade = 1 - prog(t, rowDetach(i, ROWS - 1) + 0.1, rowDetach(i, ROWS - 1) + 0.6);
        if (fade <= 0) continue;
        const inP = prog(t, T.imp - 0.4 + i * 0.05, T.imp + 0.2 + i * 0.05, E.outCubic);
        ctx.globalAlpha = ain * inP * fade;
        const q = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => pr(sheetPt(i, t, u, v)));
        ctx.beginPath(); lineTo2(ctx, q); ctx.closePath();
        ctx.fillStyle = "#fffdf6"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.stroke();
        // header bar + rows
        const h0 = pr(sheetPt(i, t, -0.8, 0.82)), h1 = pr(sheetPt(i, t, 0.2, 0.82));
        ctx.strokeStyle = TEAL; ctx.lineWidth = 5 * K; ctx.beginPath(); ctx.moveTo(h0[0], h0[1]); ctx.lineTo(h1[0], h1[1]); ctx.stroke();
        for (let r = 0; r < ROWS; r++) {
          if (t >= rowDetach(i, r)) continue;
          const v = 0.62 - r * 0.125;
          const d = pr(sheetPt(i, t, -0.8, v)), a0 = pr(sheetPt(i, t, -0.66, v)), a1 = pr(sheetPt(i, t, 0.3 + ((r * 5 + i) % 4) * 0.1, v)), b0 = pr(sheetPt(i, t, 0.55, v)), b1 = pr(sheetPt(i, t, 0.82, v));
          ctx.fillStyle = rowColor(i, r); ctx.beginPath(); ctx.arc(d[0], d[1], 3.2 * K, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "rgba(20,59,60,0.45)"; ctx.lineWidth = 2 * K;
          ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.moveTo(b0[0], b0[1]); ctx.lineTo(b1[0], b1[1]); ctx.stroke();
        }
      }
      ctx.globalAlpha = ain;
      // detached rows fly as bright strokes; the swarm follows
      const tgt = pr(add(bookTarget, [0, 0.12, 0]));
      let arrived = 0;
      const flyer = (p0, u, sw, len, col, lw) => {
        const e = E.inOutCubic(u);
        const mx0 = (p0[0] + tgt[0]) / 2 + sw * 260 * K, my0 = Math.min(p0[1], tgt[1]) - 120 * K;
        const bz = (s) => [(1 - s) ** 2 * p0[0] + 2 * (1 - s) * s * mx0 + s * s * tgt[0], (1 - s) ** 2 * p0[1] + 2 * (1 - s) * s * my0 + s * s * tgt[1]];
        const a = bz(e), b = bz(Math.max(0, e - len));
        ctx.strokeStyle = col; ctx.lineWidth = lw * (1 - 0.6 * e);
        ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(a[0], a[1]); ctx.stroke();
      };
      ctx.lineCap = "round";
      for (const s of swarm) {
        const u = (t - s.ts) / s.d;
        if (u >= 1) { arrived++; continue; }
        if (u <= 0) continue;
        ctx.globalAlpha = ain * Math.min(1, u * 5) * (1 - prog(u, 0.85, 1));
        flyer(pr(sheetPt(s.i, s.ts, s.u, s.v)), u, (s.i - 2) * 0.3 + (s.j - 0.5) * 0.1, 0.05, s.col ? GOLD : "rgba(20,59,60,0.42)", 1.4 * K);
      }
      for (let i = 0; i < NS; i++) for (let r = 0; r < ROWS; r++) {
        const td = rowDetach(i, r), u = (t - td) / 0.9;
        if (u <= 0 || u >= 1) continue;
        const v = 0.62 - r * 0.125;
        ctx.globalAlpha = ain * (1 - prog(u, 0.8, 1));
        flyer(pr(sheetPt(i, td, -0.1, v)), u, ((i + r) % 5 - 2) * 0.35, 0.16, rowColor(i, r), 4 * K);
      }
      ctx.lineCap = "butt"; ctx.globalAlpha = 1;
      // the running count is printed on the ledger's right page (foreshortened with the page)
      importedShown = Math.round(1284 * E.outCubic(clamp(arrived / swarm.length)));
      const ca = prog(t, T.impW + 0.25, T.impW + 0.6);
      if (ca > 0) {
        const pc = pr(add(pageAt(0, 0.5, 0.05), bookTarget)), pt = pr(add(pageAt(0, 0.5, -0.45), bookTarget));
        const sy = clamp((pc[1] - pt[1]) / (170 * K), 0.3, 1);
        ctx.save(); ctx.globalAlpha = ca; ctx.translate(pc[0], pc[1]); ctx.scale(1, sy);
        ctx.textAlign = "center"; ctx.direction = "ltr"; ctx.textBaseline = "middle";
        ctx.font = `800 ${Math.round(84 * K)}px ${FONT}`; ctx.fillStyle = importedShown >= 1284 ? TEAL : INK;
        ctx.fillText(importedShown.toLocaleString("en-US"), 0, -18 * K);
        ctx.font = `700 ${Math.round(28 * K)}px ${FONT}`; ctx.direction = RTL ? "rtl" : "ltr"; ctx.fillStyle = "rgba(20,59,60,0.75)";
        ctx.fillText(cp.sym.imported, 0, 44 * K);
        ctx.restore();
      }
      ctx.restore();
    }

    // =========================================================== scene 2: the calendar machine
    const DIR = RTL ? -1 : 1; // next month sits on the reading-direction side
    const RING = 330 * K, G_A = { n: 30, r: 140 * K }, G_B = { n: 15, r: 70 * K }, G_C = { n: 12, r: 56 * K };
    const stepT = [T.recW + 0.35, ...Array.from({ length: 11 }, (_, k) => T.auto + 0.05 + k * 0.112)];
    // the stamp presses on month k at stepT[k]; the ring then advances to the next month
    const ringSteps = (t) => stepT.reduce((a, s, k) => a + prog(t, s + (k ? 0.045 : 0.3), s + (k ? 0.105 : 0.75), k ? E.outCubic : E.outBack), 0);
    const monthsShort = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(C.locale, { month: "short" }).format(new Date(2025, 11 + i, 1)));
    function gearPath(x, y, g, rot) {
      const n = g.n, ro = g.r + 7 * K, ri = g.r - 7 * K;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a0 = rot + (i / n) * Math.PI * 2, st = (Math.PI * 2) / n;
        const pts = [[ri, a0], [ro, a0 + st * 0.18], [ro, a0 + st * 0.5], [ri, a0 + st * 0.68]];
        pts.forEach(([rr, a], k) => { const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; if (i === 0 && k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
      }
      ctx.closePath();
    }
    function drawGear(x, y, g, rot, alpha) {
      ctx.globalAlpha = alpha;
      gearPath(x, y, g, rot);
      ctx.fillStyle = "#f7f0dc"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.lineWidth = 1.1; ctx.strokeStyle = "rgba(20,59,60,0.55)";
      ctx.beginPath(); ctx.arc(x, y, g.r * 0.74, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, g.r * 0.2, 0, Math.PI * 2); ctx.stroke();
      const spokes = g.n > 20 ? 6 : 4;
      for (let s = 0; s < spokes; s++) {
        const a = rot + (s / spokes) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * g.r * 0.2, y + Math.sin(a) * g.r * 0.2); ctx.lineTo(x + Math.cos(a) * g.r * 0.74, y + Math.sin(a) * g.r * 0.74); ctx.stroke();
      }
      // engraved shading on the lower-right of the rim
      ctx.strokeStyle = "rgba(20,59,60,0.22)";
      for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.arc(x, y, g.r * (0.76 + k * 0.025), 0.1, 1.5); ctx.stroke(); }
      ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(x, y, g.r * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    function seal(x, y, r, a) {
      ctx.save(); ctx.globalAlpha = a;
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
      g.addColorStop(0, "#fff2a8"); g.addColorStop(0.55, GOLD); g.addColorStop(1, "#c89600");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = GOLD_D; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#5a4300"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.direction = "ltr";
      ctx.font = `800 ${Math.round(r * 0.62)}px ${FONT}`;
      ctx.fillText(String(C.ui.recurring.amount), x, y + 1);
      ctx.restore();
    }
    function scene2(t) {
      if (t < T.cut12 + 0.05 || t > T.cut34) return;
      const cx = L.ox, cy = L.oy + 10 * K;
      const inP = prog(t, T.cut12 + 0.08, T.cut12 + 0.9, E.outCubic);
      const steps = ringSteps(t);
      const idle = (t - T.rec) * 0.12;
      const ringRot = (steps * Math.PI * 2) / 12;
      const zoom = lerp(0.92, 1.04, prog(t, T.cut12, T.rem, E.inOutQuad));
      ctx.save();
      ctx.translate(cx, cy); ctx.scale(zoom, zoom); ctx.rotate((RTL ? -1 : 1) * 0.03 * prog(t, T.cut12, T.rem)); ctx.translate(-cx, -cy);
      // astrolabe ring: scale, double circles, fine degree ticks, month cells
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
      strokeArc(cx, cy, RING + 70 * K, inP); strokeArc(cx, cy, RING + 62 * K, inP); strokeArc(cx, cy, RING - 38 * K, inP); strokeArc(cx, cy, RING - 44 * K, inP);
      ctx.lineWidth = 1;
      for (let d = 0; d < 360 * inP; d += 2) {
        const a = (d * Math.PI) / 180 - DIR * ringRot, l = d % 30 === 0 ? 16 : d % 10 === 0 ? 10 : 5;
        ctx.strokeStyle = d % 30 === 0 ? INK : "rgba(20,59,60,0.45)";
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (RING + 62 * K), cy + Math.sin(a) * (RING + 62 * K)); ctx.lineTo(cx + Math.cos(a) * (RING + (62 - l) * K), cy + Math.sin(a) * (RING + (62 - l) * K)); ctx.stroke();
      }
      // month labels ride the ring; the slot at the top is "now"
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.direction = RTL ? "rtl" : "ltr";
      ctx.font = `700 ${Math.round(24 * K)}px ${FONT}`;
      for (let m = 0; m < 12; m++) {
        const a = -Math.PI / 2 + DIR * ((m * Math.PI * 2) / 12 - ringRot);
        const lx = cx + Math.cos(a) * (RING + 22 * K), ly = cy + Math.sin(a) * (RING + 22 * K);
        ctx.globalAlpha = inP * prog(t, T.cut12 + 0.3 + m * 0.03, T.cut12 + 0.6 + m * 0.03);
        ctx.fillStyle = INK; ctx.fillText(monthsShort[m], lx, ly);
        // cell divider
        const ad = a + Math.PI / 12;
        ctx.strokeStyle = "rgba(20,59,60,0.4)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(ad) * (RING - 38 * K), cy + Math.sin(ad) * (RING - 38 * K)); ctx.lineTo(cx + Math.cos(ad) * (RING + 4 * K), cy + Math.sin(ad) * (RING + 4 * K)); ctx.stroke();
        // seal in this month once its step has happened
        const k = m, placed = prog(t, stepT[k] - 0.02, stepT[k] + 0.16, E.outBack);
        if (placed > 0) seal(cx + Math.cos(a) * (RING - 72 * K), cy + Math.sin(a) * (RING - 72 * K), 26 * K * placed, inP);
      }
      ctx.globalAlpha = 1;
      // rosette inside the ring (fine radial engraving)
      ctx.strokeStyle = "rgba(20,59,60,0.16)"; ctx.lineWidth = 1;
      for (let i = 0; i < 96 * inP; i++) { const a = (i / 96) * Math.PI * 2 - ringRot * 0.5; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 150 * K, cy + Math.sin(a) * 150 * K); ctx.lineTo(cx + Math.cos(a) * (RING - 104 * K), cy + Math.sin(a) * (RING - 104 * K)); ctx.stroke(); }
      // gears: A drives the ring; B and C mesh with correct phase
      const thA = ringRot * 2.2 + idle;
      const phiB = (RTL ? 2.4 : 0.74), phiC = (RTL ? 0.55 : 2.6);
      const pB = [cx + Math.cos(phiB) * (G_A.r + G_B.r), cy + Math.sin(phiB) * (G_A.r + G_B.r)];
      const thB = phiB + Math.PI - Math.PI / G_B.n - (G_A.n / G_B.n) * (thA - phiB);
      const pC = [cx + Math.cos(phiC) * (G_A.r + G_C.r), cy + Math.sin(phiC) * (G_A.r + G_C.r)];
      const thC = phiC + Math.PI - Math.PI / G_C.n - (G_A.n / G_C.n) * (thA - phiC);
      const blur = t > T.auto && t < T.auto + 1.35 ? 3 : 1;
      for (let k = blur - 1; k >= 0; k--) {
        const off = -k * 0.05, al = inP * (k ? 0.25 : 1);
        drawGear(pB[0], pB[1], G_B, thB - off * (G_A.n / G_B.n), al);
        drawGear(pC[0], pC[1], G_C, thC - off * (G_A.n / G_C.n), al);
        drawGear(cx, cy, G_A, thA + off, al);
      }
      // the stamp arm at the top slot presses on every step
      const press = stepT.reduce((a, s, k) => Math.max(a, 1 - Math.abs((t - s) / (k ? 0.06 : 0.2))), 0);
      const topY = cy - RING + 72 * K;
      const armY = topY - lerp(96, 40, clamp(press)) * K;
      ctx.globalAlpha = inP; ctx.strokeStyle = INK; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(cx, cy - RING - 120 * K); ctx.lineTo(cx, armY); ctx.stroke();
      ctx.fillStyle = "#f7f0dc"; ctx.fillRect(cx - 34 * K, armY - 14 * K, 68 * K, 22 * K); ctx.strokeRect(cx - 34 * K, armY - 14 * K, 68 * K, 22 * K);
      ctx.fillStyle = GOLD; ctx.fillRect(cx - 26 * K, armY + 8 * K, 52 * K, 5 * K);
      // the standing-order label over the machine
      const lp = prog(t, T.recW - 0.1, T.recW + 0.35, E.outCubic);
      if (lp > 0) {
        ctx.globalAlpha = inP * lp; ctx.textAlign = "center"; ctx.direction = RTL ? "rtl" : "ltr"; ctx.textBaseline = "alphabetic";
        ctx.font = `800 ${Math.round(30 * K)}px ${FONT}`; ctx.fillStyle = INK;
        ctx.fillText(`${C.ui.recurring.label} · ${money(C.ui.recurring.amount)}`, cx, cy - RING - 138 * K);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    function strokeArc(cx, cy, r, u) { ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(u)); ctx.stroke(); }

    // =========================================================== scene 3: the bell and the letter
    const bellProfile = [[0.02, 0], [0.16, 0.005], [0.26, 0.04], [0.31, 0.12], [0.33, 0.28], [0.35, 0.46], [0.4, 0.64], [0.49, 0.8], [0.6, 0.91], [0.68, 0.97], [0.71, 1.0], [0.69, 1.03], [0.62, 1.035]];
    const SEG = 30;
    const swing = (t) => { const s = t - T.remW; return s > 0 ? 0.32 * Math.sin(s * 9.5) * Math.exp(-s * 1.1) : 0; };
    const letterCv = document.createElement("canvas");
    const LW = 560, LH = 380;
    letterCv.width = LW; letterCv.height = LH;
    {
      const g = letterCv.getContext("2d"), em = C.ui.email;
      g.fillStyle = "#fffdf5"; g.fillRect(0, 0, LW, LH);
      g.strokeStyle = "rgba(20,59,60,0.25)"; g.lineWidth = 2; g.strokeRect(1, 1, LW - 2, LH - 2);
      g.direction = RTL ? "rtl" : "ltr"; g.textAlign = RTL ? "right" : "left"; g.textBaseline = "alphabetic";
      const X = RTL ? LW - 36 : 36;
      g.fillStyle = TEAL; g.font = `800 30px ${FONT}`; g.fillText(em.from, X, 58);
      g.fillStyle = "#1d1a10"; g.font = `800 31px ${FONT}`;
      const words = em.subject.split(" "); let line = "", y = 118;
      for (const w of words) { const tl = line ? `${line} ${w}` : w; if (g.measureText(tl).width > LW - 72) { g.fillText(line, X, y); line = w; y += 40; } else line = tl; }
      g.fillText(line, X, y);
      g.fillStyle = "rgba(29,26,16,0.55)"; g.font = `600 22px ${FONT}`; g.fillText(em.greeting, X, y + 54);
      g.fillStyle = "rgba(20,59,60,0.18)";
      for (let k = 0; k < 3; k++) g.fillRect(RTL ? 36 + k * 40 : 36, y + 80 + k * 26, LW - 72 - k * 80, 9);
      g.fillStyle = GOLD; const bw = 230, bx = RTL ? LW - 36 - bw : 36;
      g.beginPath(); g.roundRect(bx, LH - 76, bw, 46, 23); g.fill();
      g.fillStyle = "#3d2f00"; g.font = `800 22px ${FONT}`; g.textAlign = "center"; g.fillText(`${em.badge} ${money(em.amount)}`, bx + bw / 2, LH - 45);
    }
    function scene3(t) {
      const dk = dark(t);
      if (dk <= 0.001 && t < T.dark) return;
      if (t > T.cut34 + 0.45) return;
      const cx = L.ox, cy = L.oy - 120 * K;
      const bellIn = prog(t, T.dark + 0.42, T.dark + 0.95, E.outCubic);
      const moveAside = prog(t, T.letter - 0.2, T.letter + 0.5, E.inOutCubic);
      const bx = cx + (RTL ? -1 : 1) * (V ? 0 : 390 * K) * moveAside, by = cy - (V ? 300 * K : 0) * moveAside;
      const bscale = lerp(1, V ? 0.66 : 0.74, moveAside);
      const fadeAll = 1 - prog(t, T.cut34, T.cut34 + 0.3);
      // warm lamp glow behind the bell
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const glowR = 520 * K * bscale;
      const gl = ctx.createRadialGradient(bx, by + 120 * K * bscale, 0, bx, by + 120 * K * bscale, glowR);
      gl.addColorStop(0, `rgba(255,190,70,${0.36 * bellIn * fadeAll})`); gl.addColorStop(1, "rgba(255,160,40,0)");
      ctx.fillStyle = gl; ctx.fillRect(bx - glowR, by + 120 * K * bscale - glowR, glowR * 2, glowR * 2);
      ctx.restore();
      if (bellIn <= 0) return;
      // yoke
      const S = 330 * K * bscale;
      const pivot = [bx, by - 20 * K * bscale];
      ctx.save(); ctx.globalAlpha = bellIn * fadeAll;
      const bw = S * 0.9, bt = pivot[1] - S * 0.2;
      const beam = ctx.createLinearGradient(0, bt, 0, bt + S * 0.11);
      beam.addColorStop(0, "#5a4526"); beam.addColorStop(1, "#2a2014");
      ctx.fillStyle = beam; ctx.fillRect(pivot[0] - bw / 2, bt, bw, S * 0.11);
      ctx.strokeStyle = "rgba(255,220,150,0.35)"; ctx.lineWidth = 1;
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(pivot[0] - bw / 2, bt + k * S * 0.027); ctx.lineTo(pivot[0] + bw / 2, bt + k * S * 0.027); ctx.stroke(); }
      ctx.strokeStyle = "#c9a14a"; ctx.lineWidth = S * 0.03;
      ctx.beginPath(); ctx.arc(pivot[0], pivot[1] - S * 0.04, S * 0.07, Math.PI, 0); ctx.stroke();
      // lathe bell, swinging about the pivot, lit from the upper left
      const th = swing(t);
      const fB = S * 2.9;
      const pr = camera([0, -0.5, 3.1], [0, -0.5, 0], fB, pivot[0], pivot[1] + (0.5 / 3.1) * fB);
      const faces = [];
      const Lgt = norm([-0.5, 0.6, 0.8]);
      for (let i = 0; i < bellProfile.length - 1; i++) {
        for (let s = 0; s < SEG; s++) {
          const a0 = (s / SEG) * Math.PI * 2, a1 = ((s + 1) / SEG) * Math.PI * 2;
          const P = (pp, a) => rotZ([pp[0] * Math.cos(a), -pp[1], pp[0] * Math.sin(a)], th);
          const p = [P(bellProfile[i], a0), P(bellProfile[i], a1), P(bellProfile[i + 1], a1), P(bellProfile[i + 1], a0)];
          const n = norm(cross(sub(p[1], p[0]), sub(p[3], p[0])));
          const lam = Math.max(0, dot(n, Lgt)), spec = Math.pow(Math.max(0, dot(n, norm([-0.2, 0.3, 1]))), 18);
          const b = 0.12 + 0.78 * lam;
          const col = `rgb(${Math.round(Math.min(255, 50 + 200 * b + 120 * spec))},${Math.round(Math.min(255, 34 + 150 * b + 110 * spec))},${Math.round(Math.min(255, 10 + 46 * b + 90 * spec))})`;
          faces.push({ p, fill: col, stroke: s % 5 === 0 || i === bellProfile.length - 3 ? `rgba(255,228,160,${(0.1 + 0.25 * b).toFixed(2)})` : col, lw: s % 5 === 0 ? 1 : 0.7 });
        }
      }
      // mouth rim (inside, dark)
      const rim = [];
      for (let s = 0; s <= SEG; s++) { const a = (s / SEG) * Math.PI * 2; rim.push(pr(rotZ([0.66 * Math.cos(a), -1.03, 0.66 * Math.sin(a)], th))); }
      ctx.beginPath(); lineTo2(ctx, rim); ctx.closePath(); ctx.fillStyle = "#070c0b"; ctx.fill();
      // clapper lags the swing
      const cl = pr(rotZ([0, -1.02, 0], swing(t - 0.09) * 1.25));
      ctx.fillStyle = "#c79a2e"; ctx.beginPath(); ctx.arc(cl[0], cl[1], S * 0.07, 0, Math.PI * 2); ctx.fill();
      drawFaces(ctx, faces, pr, true);
      ctx.globalAlpha = 1;
      // sound rings from the mouth at every swing extreme
      const mouth = pr(rotZ([0, -0.95, 0], th));
      ctx.globalCompositeOperation = "lighter";
      for (let k = 0; k < 5; k++) {
        const t0 = T.remW + 0.08 + k * (Math.PI / 9.5), u = (t - t0) / 0.9;
        if (u <= 0 || u >= 1) continue;
        ctx.strokeStyle = `rgba(255,214,110,${((1 - u) * 0.32 * fadeAll).toFixed(3)})`; ctx.lineWidth = 2 * (1 - u) + 0.8;
        for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(mouth[0], mouth[1] - S * 0.35, S * (0.62 + u * 1.1), side < 0 ? Math.PI * 0.72 : -Math.PI * 0.28, side < 0 ? Math.PI * 1.28 : Math.PI * 0.28); ctx.stroke(); }
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.restore();

      // the letter: rises lit, folds in thirds, slips into the envelope, sealed, flies
      const lt = T.letter;
      const up = prog(t, lt, lt + 0.4, E.outCubic);
      if (up <= 0) return;
      const fold = prog(t, lt + 0.45, lt + 0.8, E.inOutCubic);
      const intoEnv = prog(t, lt + 0.8, lt + 1.05, E.inOutCubic);
      const flap = prog(t, lt + 1.05, lt + 1.3, E.inOutCubic);
      const sealP = prog(t, lt + 1.28, lt + 1.45, E.outBack);
      const fly = prog(t, lt + 1.5, T.cut34 + 0.02, E.inCubic);
      const lx = V ? cx : cx + (RTL ? 1 : -1) * 170 * K, ly = V ? cy + 330 * K : cy + 130 * K;
      const target = [RTL ? 140 : W - 140, V ? 480 : 200];
      const fx = lerp(lx, target[0], fly), fy = lerp(ly, target[1], fly) - Math.sin(fly * Math.PI) * 120, fs = lerp(0.86, 0.04, fly) * K;
      ctx.save();
      ctx.translate(fx, fy + (1 - up) * 60); ctx.scale(fs, fs); ctx.rotate((1 - up) * 0.06 + fly * (RTL ? 0.5 : -0.5));
      ctx.globalAlpha = up * fadeAll;
      const EW = LW + 40, EH = LH / 3 + 60;
      // envelope back
      if (fold > 0.9) { ctx.fillStyle = "#e9dcb8"; ctx.fillRect(-EW / 2, -EH / 2, EW, EH); }
      // folded letter: three panels; top and bottom fold over the middle
      const third = LH / 3;
      const drop = intoEnv * (EH / 2 - third / 2 - 10);
      ctx.save(); ctx.translate(0, drop - (1 - fold) * 0);
      const midY = -third / 2;
      ctx.drawImage(letterCv, 0, third, LW, third, -LW / 2, midY, LW, third);
      const c1 = Math.cos(fold * Math.PI);
      ctx.save(); ctx.translate(0, midY + third); ctx.scale(1, c1);
      if (c1 > 0) ctx.drawImage(letterCv, 0, third * 2, LW, third, -LW / 2, 0, LW, third);
      else { ctx.fillStyle = "#efe6cc"; ctx.fillRect(-LW / 2, 0, LW, third); }
      ctx.restore();
      const c2 = Math.cos(prog(t, lt + 0.55, lt + 0.9, E.inOutCubic) * Math.PI);
      ctx.save(); ctx.translate(0, midY); ctx.scale(1, c2);
      if (c2 > 0) ctx.drawImage(letterCv, 0, 0, LW, third, -LW / 2, -third, LW, third);
      else { ctx.fillStyle = "#f4ecd6"; ctx.fillRect(-LW / 2, -third, LW, third); }
      ctx.restore();
      ctx.restore();
      // envelope front pocket + flap
      if (fold > 0.9) {
        ctx.fillStyle = "#efe3c2"; ctx.strokeStyle = "rgba(20,59,60,0.35)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-EW / 2, -EH / 2 + 10); ctx.lineTo(0, EH * 0.12); ctx.lineTo(EW / 2, -EH / 2 + 10); ctx.lineTo(EW / 2, EH / 2); ctx.lineTo(-EW / 2, EH / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
        const fc = Math.cos(flap * Math.PI);
        ctx.save(); ctx.translate(0, -EH / 2); ctx.scale(1, -fc);
        ctx.fillStyle = fc > 0 ? "#e2d3ab" : "#f2e7c9";
        ctx.beginPath(); ctx.moveTo(-EW / 2, 0); ctx.lineTo(0, EH * 0.62); ctx.lineTo(EW / 2, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
        if (sealP > 0) {
          // wax seal: the logo's ring with its gold tenth
          const sy = -EH / 2 + EH * 0.6;
          ctx.fillStyle = TEAL; ctx.beginPath(); ctx.arc(0, sy, 40 * sealP, 0, Math.PI * 2); ctx.fill();
          ctx.lineWidth = 9 * sealP; ctx.strokeStyle = "#f3ecd8"; ctx.beginPath(); ctx.arc(0, sy, 22 * sealP, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = GOLD; ctx.beginPath(); ctx.arc(0, sy, 22 * sealP, -1.35, -0.72); ctx.stroke();
        }
      }
      ctx.restore();
      // the spark it becomes
      if (fly > 0.7) {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        const sp = prog(fly, 0.7, 1);
        const g2 = ctx.createRadialGradient(fx, fy, 0, fx, fy, 90 * sp + 10);
        g2.addColorStop(0, `rgba(255,236,160,${sp})`); g2.addColorStop(1, "rgba(255,200,80,0)");
        ctx.fillStyle = g2; ctx.fillRect(fx - 120, fy - 120, 240, 240);
        ctx.restore();
      }
    }

    // =========================================================== scene 4: the house
    const cats = C.ui.analytics.cats;
    const spendTotal = cats.reduce((a, c) => a + c[1], 0);
    const shares = [...cats.slice(0, 3).map(([n, v]) => [n, v]), [cp.sym.other, cats.slice(3).reduce((a, c) => a + c[1], 0)]];
    const pct = shares.map(([, v]) => Math.round((v / spendTotal) * 100));
    pct[3] = 100 - pct[0] - pct[1] - pct[2];
    const HX = 1.35, HZ = 0.95, WH = 1.0, RH = 1.75;
    // rooms: the largest share takes the reading-start side, the rest stack beside it
    const rooms = (() => {
      const w0 = 2 * HX * (pct[0] / 100), rest = 100 - pct[0];
      const xs = RTL ? [HX - w0, HX] : [-HX, -HX + w0];
      const xr = RTL ? [-HX, HX - w0] : [-HX + w0, HX];
      const out = [{ x: xs, z: [-HZ, HZ], i: 0 }];
      let z = -HZ;
      for (let i = 1; i < 4; i++) { const d = (2 * HZ * pct[i]) / rest; out.push({ x: xr, z: [z, z + d], i }); z += d; }
      return out;
    })();
    const coins = (() => { const r = rng(91); const cum = pct.map((p, i) => pct.slice(0, i + 1).reduce((a, b) => a + b, 0) / 100); return Array.from({ length: 170 }, () => { const u = r(); const ri = cum.findIndex((c) => u <= c); const rm = rooms[ri]; return { ri, x: lerp(rm.x[0] + 0.08, rm.x[1] - 0.08, r()), z: lerp(rm.z[0] + 0.06, rm.z[1] - 0.06, r()), ts: T.money + r() * 1.1, d: 0.5 + r() * 0.25, sx: (r() - 0.5) * 0.3 }; }); })();
    function cam4(t) {
      const u = prog(t, T.cut34, T.b, E.inOutQuad), crane = prog(t, T.house - 0.1, T.house + 1.1, E.inOutCubic);
      const yaw = (RTL ? 1 : -1) * lerp(0.62, 0.42, u) * (1 - crane * 0.85);
      const pitch = lerp(0.36, 1.18, crane), dist = lerp(6.4, 6.0, u) + crane * 0.4;
      const eye = [Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist + 0.2, Math.cos(yaw) * Math.cos(pitch) * dist];
      return camera(eye, [0, 0.45 - crane * 0.3, 0], 1120 * K, L.ox, L.oy + 40 * K);
    }
    function scene4(t) {
      if (t < T.cut34 - 0.02) return;
      const pr = cam4(t);
      const draw = (a, b) => prog(t, T.cut34 + a, T.cut34 + b, E.inOutQuad);
      const lift = prog(t, T.money - 1.05, T.money - 0.25, E.inOutCubic);      // roof off, walls cut away
      const wallsA = lerp(1, 0.16, prog(t, T.money - 0.9, T.money - 0.15));
      const floorIn = prog(t, T.money - 0.8, T.money - 0.05, E.outCubic);
      // ground shadow
      const g0 = pr([0, 0, 0]);
      const sh = ctx.createRadialGradient(g0[0], g0[1], 0, g0[0], g0[1], 520 * K);
      sh.addColorStop(0, "rgba(60,44,14,0.2)"); sh.addColorStop(1, "rgba(60,44,14,0)");
      ctx.fillStyle = sh; ctx.fillRect(g0[0] - 600 * K, g0[1] - 400 * K, 1200 * K, 800 * K);
      // floor plan (rooms with low walls, gold fill by share)
      const flo = [[-HX, 0, -HZ], [HX, 0, -HZ], [HX, 0, HZ], [-HX, 0, HZ]];
      ctx.globalAlpha = 1;
      ctx.beginPath(); lineTo2(ctx, flo.map(pr)); ctx.closePath(); ctx.fillStyle = "#faf4e3"; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();
      rooms.forEach((rm) => {
        const fillU = clamp((t - T.money - 0.15 - rm.i * 0.12) / 0.9);
        if (fillU > 0) {
          // gold hatch rising across the room
          ctx.save();
          const q = [[rm.x[0], 0.005, rm.z[0]], [rm.x[1], 0.005, rm.z[0]], [rm.x[1], 0.005, rm.z[1]], [rm.x[0], 0.005, rm.z[1]]].map(pr);
          ctx.beginPath(); lineTo2(ctx, q); ctx.closePath(); ctx.clip();
          ctx.globalAlpha = 0.28 * E.outCubic(fillU); ctx.fillStyle = rm.i === 0 ? TEAL : GOLD; ctx.fill();
          ctx.globalAlpha = 0.8; ctx.strokeStyle = rm.i === 0 ? "rgba(17,103,106,0.8)" : GOLD_D; ctx.lineWidth = 1.2;
          const n = 26;
          for (let k = 0; k < n * E.outCubic(fillU); k++) {
            const x = lerp(rm.x[0] - 0.8, rm.x[1], k / n);
            const a = pr([x, 0.006, rm.z[0]]), b = pr([x + 0.8, 0.006, rm.z[1]]);
            ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
          }
          ctx.restore();
        }
        const wh = 0.24 * floorIn;
        if (wh > 0.002) {
          const edges = [[[rm.x[0], rm.z[0]], [rm.x[1], rm.z[0]]], [[rm.x[1], rm.z[0]], [rm.x[1], rm.z[1]]], [[rm.x[1], rm.z[1]], [rm.x[0], rm.z[1]]], [[rm.x[0], rm.z[1]], [rm.x[0], rm.z[0]]]];
          drawFaces(ctx, edges.map(([a, b]) => ({ p: [[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], wh, b[1]], [a[0], wh, a[1]]], fill: "rgba(247,240,220,0.92)", stroke: INK, lw: 1.3 })), pr);
        }
      });
      // the house: walls (front/back as pentagons), roof, chimney; edges draw in, faces follow
      const faceA = draw(0.7, 1.4);
      const roofY = lift * 2.2;
      const walls = [
        { p: [[-HX, 0, HZ], [HX, 0, HZ], [HX, WH, HZ], [-HX, WH, HZ]] },
        { p: [[HX, 0, -HZ], [-HX, 0, -HZ], [-HX, WH, -HZ], [HX, WH, -HZ]] },
        { p: [[HX, 0, HZ], [HX, 0, -HZ], [HX, WH, -HZ], [HX, RH, 0], [HX, WH, HZ]] },
        { p: [[-HX, 0, -HZ], [-HX, 0, HZ], [-HX, WH, HZ], [-HX, RH, 0], [-HX, WH, -HZ]] },
      ];
      const roof = [
        { p: [[-HX - 0.12, WH - 0.06, HZ + 0.14], [HX + 0.12, WH - 0.06, HZ + 0.14], [HX + 0.12, RH + 0.02, 0], [-HX - 0.12, RH + 0.02, 0]] },
        { p: [[HX + 0.12, WH - 0.06, -HZ - 0.14], [-HX - 0.12, WH - 0.06, -HZ - 0.14], [-HX - 0.12, RH + 0.02, 0], [HX + 0.12, RH + 0.02, 0]] },
      ].map((f) => ({ p: f.p.map((q) => [q[0], q[1] + roofY, q[2]]) }));
      const chim = (() => { const x0 = RTL ? -0.8 : 0.55, x1 = x0 + 0.26, z0 = 0.25, z1 = 0.5, y0 = 1.25 + roofY, y1 = 1.95 + roofY; return [
        [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]]].map((p) => ({ p })); })();
      const wallFill = (a) => `rgba(250,244,228,${(0.95 * a).toFixed(3)})`;
      const roofFill = (a) => `rgba(232,221,192,${(0.97 * a).toFixed(3)})`;
      const roofA = faceA * (1 - prog(t, T.money - 0.9, T.money - 0.3));
      const all = [
        ...walls.map((w) => ({ ...w, fill: wallFill(faceA * wallsA), stroke: `rgba(20,59,60,${(0.95 * wallsA).toFixed(3)})`, lw: 1.6 })),
        ...roof.map((r) => ({ ...r, fill: roofFill(roofA), stroke: `rgba(20,59,60,${(0.95 * roofA).toFixed(3)})`, lw: 1.6 })),
        ...chim.map((c) => ({ ...c, fill: roofFill(roofA), stroke: `rgba(20,59,60,${(0.9 * roofA).toFixed(3)})`, lw: 1.3 })),
      ];
      if (faceA > 0) { drawFaces(ctx, all.slice(0, 6), pr, true); drawFaces(ctx, all.slice(6), pr, false); }
      // line-drawing pass (before faces settle): edges reveal in construction order
      const edges = [];
      const E3 = (a, b) => edges.push([a, b]);
      [[-HX, -HZ], [HX, -HZ], [HX, HZ], [-HX, HZ]].forEach(([x, z]) => E3([x, 0, z], [x, WH, z]));
      E3([-HX, 0, HZ], [HX, 0, HZ]); E3([HX, 0, HZ], [HX, 0, -HZ]); E3([HX, 0, -HZ], [-HX, 0, -HZ]); E3([-HX, 0, -HZ], [-HX, 0, HZ]);
      E3([-HX, WH, HZ], [HX, WH, HZ]); E3([-HX, WH, -HZ], [HX, WH, -HZ]);
      E3([HX, WH, HZ], [HX, RH, 0]); E3([HX, RH, 0], [HX, WH, -HZ]); E3([-HX, WH, HZ], [-HX, RH, 0]); E3([-HX, RH, 0], [-HX, WH, -HZ]); E3([-HX, RH, 0], [HX, RH, 0]);
      const lineA = 1 - faceA * 0.999;
      if (lineA > 0.01) {
        ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.globalAlpha = lineA;
        edges.forEach(([a, b], i) => { const u = draw(0.02 + i * 0.05, 0.3 + i * 0.05); strokePart(ctx, [pr(a), pr(b)], u); });
        ctx.globalAlpha = 1;
      }
      // front details: door, windows (engraved), roof tile courses
      const detA = faceA * wallsA;
      if (detA > 0.01) {
        ctx.globalAlpha = detA; ctx.strokeStyle = INK; ctx.lineWidth = 1.3;
        const zf = HZ + 0.001;
        const rect3 = (x0, y0, x1, y1, z) => [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]].map(pr);
        const dq = rect3(-0.22, 0, 0.22, 0.66, zf); ctx.beginPath(); lineTo2(ctx, dq); ctx.closePath(); ctx.fillStyle = "rgba(17,103,106,0.85)"; ctx.fill(); ctx.stroke();
        for (const wx of [-0.95, 0.55]) {
          const wq = rect3(wx, 0.42, wx + 0.4, 0.78, zf); ctx.beginPath(); lineTo2(ctx, wq); ctx.closePath(); ctx.fillStyle = "rgba(240,192,0,0.35)"; ctx.fill(); ctx.stroke();
          const m1 = pr([wx + 0.2, 0.42, zf]), m2 = pr([wx + 0.2, 0.78, zf]), m3 = pr([wx, 0.6, zf]), m4 = pr([wx + 0.4, 0.6, zf]);
          ctx.beginPath(); ctx.moveTo(m1[0], m1[1]); ctx.lineTo(m2[0], m2[1]); ctx.moveTo(m3[0], m3[1]); ctx.lineTo(m4[0], m4[1]); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      if (roofA > 0.01) {
        ctx.globalAlpha = roofA * 0.7; ctx.strokeStyle = "rgba(20,59,60,0.5)"; ctx.lineWidth = 1;
        for (let k = 1; k < 7; k++) { const f = k / 7; const a = pr([-HX - 0.12, lerp(WH - 0.06, RH, f) + roofY, lerp(HZ + 0.14, 0, f)]), b = pr([HX + 0.12, lerp(WH - 0.06, RH, f) + roofY, lerp(HZ + 0.14, 0, f)]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
      // gold pours in: coins fall from above into their room
      for (const c of coins) {
        const u = (t - c.ts) / c.d;
        if (u <= 0 || u >= 1.3) continue;
        const e = E.inQuad(clamp(u));
        const p = pr([lerp(c.sx, c.x, e), lerp(3.2, 0.03, e), lerp(0, c.z, e)]);
        ctx.globalAlpha = u > 1 ? 1 - (u - 1) / 0.3 : 1;
        ctx.fillStyle = GOLD; ctx.strokeStyle = GOLD_D; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(p[0], p[1], 9 * K, 9 * K * lerp(1, 0.45, e), 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // room labels (upright, over the plan)
      rooms.forEach((rm) => {
        const lp = prog(t, T.money + 0.3 + rm.i * 0.14, T.money + 0.7 + rm.i * 0.14, E.outBack);
        if (lp <= 0) return;
        const c = pr([(rm.x[0] + rm.x[1]) / 2, 0.02, (rm.z[0] + rm.z[1]) / 2]);
        ctx.save(); ctx.globalAlpha = clamp(lp); ctx.translate(c[0], c[1]); ctx.scale(lerp(0.7, 1, lp), lerp(0.7, 1, lp));
        ctx.textAlign = "center"; ctx.direction = "ltr"; ctx.textBaseline = "alphabetic";
        const big = rm.i === 0 ? 60 : pct[rm.i] < 8 ? 34 : 44;
        ctx.font = `800 ${Math.round(big * K)}px ${FONT}`; ctx.fillStyle = "#1d1a10";
        ctx.fillText(`${pct[rm.i]}%`, 0, 0);
        ctx.direction = RTL ? "rtl" : "ltr"; ctx.font = `700 ${Math.round((rm.i === 0 ? 28 : 22) * K)}px ${FONT}`; ctx.fillStyle = "rgba(20,59,60,0.8)";
        ctx.fillText(shares[rm.i][0], 0, (rm.i === 0 ? 34 : 26) * K);
        ctx.restore();
      });
    }

    // ------------------------------------------------------------ frame
    function seek(t) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.filter = "none";
      ctx.drawImage(paper, 0, 0);
      scene1(t);
      scene2(t);
      // lights out: the room darkens around the machine, the lamp comes up
      const dk = dark(t);
      if (dk > 0) { ctx.fillStyle = `rgba(11,21,20,${dk.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
      scene3(t);
      scene4(t);
      if (dk > 0 && t > T.cut34) { ctx.fillStyle = `rgba(11,21,20,${dk.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
      burst(t, T.cut12 - 0.08, L.ox, L.oy);
      burst(t, T.cut34 - 0.06, RTL ? 160 : W - 160, V ? 480 : 200, 0.6);
      drawText(t);
      const mi = t < T.auto ? (t >= stepT[0] + 0.2 ? 1 : 0) : Math.min(12, 1 + stepT.slice(1).filter((s) => t >= s + 0.05).length);
      drawHud(t, mi);
      // grain is static (a moving grain multiplies the bitrate of every frame)
      ctx.fillStyle = grains[0]; ctx.fillRect(0, 0, W, H);
    }

    // ------------------------------------------------------------ sound
    cue(T.imp - 0.35, "whoosh", 0.3);
    for (let k = 0; k < 14; k++) cue(T.impW + 0.2 + k * 0.1, "tick", 0.12 + 0.01 * (k % 3));
    flipTimes.forEach((f, k) => { if (k % 2 === 0) cue(f + 0.1, "arrive", 0.14); });
    cue(T.cut12 - 0.1, "sweep", 0.55);
    cue(stepT[0], "calendar", 0.5);
    cue(stepT[0] + 0.1, "pop", 0.3);
    cue(T.auto - 0.1, "whoosh", 0.25);
    stepT.slice(1).forEach((s) => cue(s, "tick", 0.2));
    cue(T.dark, "whoosh", 0.3);
    cue(T.remW, "notify", 0.55);
    cue(T.letter + 0.5, "tap", 0.22);
    cue(T.letter + 1.3, "pop", 0.34);
    cue(T.letter + 1.5, "whoosh", 0.3);
    cue(T.cut34 - 0.06, "sweep", 0.45);
    for (let k = 0; k < 10; k++) cue(T.money + k * 0.11, "tick", 0.13);
    cue(T.money + 0.35, "arrive", 0.26);
    cue(T.house + 0.1, "resolve", 0.3);

    function qa() {
      return blocks.map((b) => { const last = b.items[b.items.length - 1].t + 0.42; return { text: b.text, in: b.tIn, out: b.tOut, readable: b.tOut - last }; });
    }
    seek(T.a);
    return {
      duration: T.b, width: W, height: H, format: V ? "vertical" : "landscape", range: [T.a, T.b],
      seek, times: T, qa, cues: () => ({ duration: T.b, cues: [...sfx].sort((a, b) => a.t - b.t) }),
    };
  }

  window.CINE = { init };
})();
