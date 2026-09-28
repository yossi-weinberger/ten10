// "Geo" cut: the feature stretch in the geometry language agreed in the style frames.
//
// One continuous shot. The logo's ring (the "0") never leaves; it moves, resizes and changes
// role, and its gold tenth (a 36° slice) is the accent everywhere:
//   import     the ring is a spool: real transaction rows leave the spreadsheet, calm into a
//              stream and wind onto it; the count climbs
//   recurring  the ring drains and becomes the year: the standing order lands, its first month
//              is stamped, then the head runs the whole year by itself (12 × 360 = 4,320)
//   reminders  the room goes deep teal; the ring rings (gold waves, the tenth swings) and the
//              reminder email slides out of it
//   analytics  back to light; the ring counts the month's spending and pours it into columns
//              at the real shares (one hue, direct labels)
// Clean, bright, precise: soft layered shadows, no texture. Words arrive as they are spoken.
// Deterministic (pure function of t), same anchors, cues and render tools as the main film.
(function () {
  const { clamp, lerp, E, prog, win, makeAnchors, cue, sfx } = window.ENGINE;
  const KW = 0.14, TAU = Math.PI * 2;
  const TEAL = "#11676a", TEAL_D = "#0c4a4c", GOLD = "#f0c000", GOLD_D = "#b58c00", INK = "#1f1c12", BG = "#fcfaf1";
  const TYPE_COL = { income: "#16a34a", donation: "#e0a800", expense: "#dc2626" };
  const TENTH_A0 = -Math.PI / 2 + 0.3, TENTH_A1 = TENTH_A0 + TAU / 10;
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
      a: A.s("import") - 0.5, b: A.s("reports") - 0.1,
      imp: A.s("import"), impW: B("importWord") - KW,
      rec: A.s("recurring"), recW: B("recurringWord") - KW, auto: B("autoWord") - KW,
      rem: A.s("reminders"), remW: B("remindWord") - KW, remEnd: lastWord("reminders") - KW,
      an: A.s("analytics"), anW: B("analyticsWord") - KW, money: B("moneyWord") - KW, house: B("householdWord") - KW,
    };
    T.auto = Math.max(T.auto, T.recW + 0.7);
    T.card = Math.min(T.remEnd, T.an - 1.1);

    // ------------------------------------------------------------ layout (ring states per scene)
    const S = V
      ? {
        imp: { x: 540, y: 860, r: 200, sw: 56 }, rec: { x: 540, y: 1000, r: 262, sw: 54 },
        rem: { x: 540, y: 880, r: 215, sw: 52 }, an: { x: 540, y: 700, r: 122, sw: 38 },
        tx: { x: RTL ? W - 84 : 84, top: 190, w: 912, small: RTL ? 50 : 44, big: RTL ? 104 : 90 },
        src: [RTL ? 820 : 260, 1760], path: [[RTL ? 820 : 260, 1720], [RTL ? 1000 : 80, 1330], [RTL ? 150 : 930, 1380], [540, 1060]],
        card: [540, 1300], cols: { base: 1540, colW: 150, gap: 48, maxH: 520 },
      }
      : {
        imp: { x: mx(640), y: 480, r: 210, sw: 58 }, rec: { x: mx(700), y: 530, r: 250, sw: 54 },
        rem: { x: mx(690), y: 470, r: 205, sw: 52 }, an: { x: mx(660), y: 205, r: 118, sw: 38 },
        tx: { x: RTL ? W - 150 : 150, top: 250, w: 720, small: RTL ? 46 : 40, big: RTL ? 100 : 88 },
        src: [mx(1700), 1000], path: [[mx(1640), 900], [mx(1480), 560], [mx(1000), 790], [mx(640), 690]],
        card: [mx(690), 820], cols: { base: 800, colW: 128, gap: 64, maxH: 470 },
      };
    const ringAt = (t) => {
      const seq = [[T.a, S.imp], [T.rec, S.rec], [T.rem, S.rem], [T.an, S.an]];
      let st = seq[0][1];
      for (let i = 1; i < seq.length; i++) {
        const [tb, nx] = seq[i];
        const u = prog(t, tb - 0.35, tb + 0.35, E.inOutCubic);
        if (u <= 0) break;
        st = { x: lerp(st.x, nx.x, u), y: lerp(st.y, nx.y, u), r: lerp(st.r, nx.r, u), sw: lerp(st.sw, nx.sw, u) };
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
      if (o.tenth !== false) {
        if (lift) shadow(40, 24, 0.25);
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
    function makeBlock(id, nSmall, tOut) {
      const p = ph(id), L = S.tx;
      const toks = p.text.split(/\s+/).filter(Boolean);
      const words = toks.length === p.words.length ? toks : p.words.map((w) => w.w);
      const items = words.map((w, i) => ({ w: w.replace(/[,;:—]+$/, ""), t: p.words[i].start - 0.06, big: i >= nSmall }));
      items[items.length - 1].w = items[items.length - 1].w.replace(/[.!?]*$/, "");
      const lines = [];
      const place = (big) => {
        ctx.font = font(big ? 800 : 700, big ? L.big : L.small);
        const sp = ctx.measureText(" ").width;
        let line = [], w = 0;
        for (const it of items.filter((x) => x.big === big)) {
          it.width = ctx.measureText(it.w).width;
          if (line.length && w + sp + it.width > L.w) { lines.push({ big, items: line, width: w }); line = []; w = 0; }
          w += (line.length ? sp : 0) + it.width; line.push(it);
        }
        if (line.length) lines.push({ big, items: line, width: w });
        const own = lines.filter((l) => l.big === big);
        if (own.length > 1) {
          const last = own[own.length - 1], prev = own[own.length - 2];
          while (last.items.length === 1 && prev.items.length > 2) {
            const mv = prev.items[prev.items.length - 1];
            if (last.width + sp + mv.width > L.w) break;
            prev.items.pop(); prev.width -= sp + mv.width; last.items.unshift(mv); last.width += sp + mv.width;
          }
        }
        return sp;
      };
      const spS = place(false), spB = place(true);
      let y = L.top;
      for (const ln of lines) {
        const sz = ln.big ? L.big : L.small;
        y += sz;
        let x = L.x;
        for (const it of ln.items) { it.x = x; it.y = y; it.size = sz; x += (RTL ? -1 : 1) * (it.width + (ln.big ? spB : spS)); }
        y += ln.big ? sz * 0.1 : sz * 0.45;
      }
      const b = { id, items, tIn: items[0].t, tOut, text: items.map((x) => x.w).join(" ") };
      blocks.push(b);
    }
    makeBlock("import", cc.split.import, T.rec - 0.25);
    makeBlock("recurring", cc.split.recurring, T.rem - 0.25);
    makeBlock("reminders", cc.split.reminders, T.an - 0.25);
    makeBlock("analytics", cc.split.analytics, T.b + 5);
    function drawText(t) {
      const dk = darkness(t);
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
          const y = it.y + (1 - p) * (it.big ? 34 : 22) - out * 26;
          ctx.fillStyle = col; ctx.fillText(it.w, it.x, y);
          if (it === last) {
            const pd = prog(t, it.t + 0.25, it.t + 0.5, E.outBack);
            ctx.fillStyle = GOLD; ctx.globalAlpha = pd * (1 - out);
            ctx.fillText(".", RTL ? it.x - it.width : it.x + it.width, y);
          }
          ctx.filter = "none";
        }
      }
      ctx.restore();
    }

    // ------------------------------------------------------------ HUD
    const chapters = [[T.a, "03", cc.chapters.import], [T.rec, "04", cc.chapters.recurring], [T.rem, "05", cc.chapters.reminders], [T.an, "06", cc.chapters.analytics]];
    function drawHud(t) {
      const dk = darkness(t), a = prog(t, T.a, T.a + 0.5);
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
      const x0 = W / 2 - (V ? 200 : 260), x1 = W / 2 + (V ? 200 : 260), y = H - 62, u = clamp(t / (timing.audioDuration + 3));
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
      const vis = 1 - prog(t, T.rec - 0.3, T.rec + 0.1);
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
      const ba = prog(t, T.a, T.a + 0.4) * (1 - prog(t, T.impW - 0.1, T.impW + 0.2));
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
      const vis = prog(t, T.an - 0.2, T.an + 0.3);
      if (vis <= 0) return;
      const { base, colW, gap, maxH } = S.cols, x0 = cols.reduce((a, c) => Math.min(a, c.x), 1e9), x1 = x0 + 4 * colW + 3 * gap;
      // baseline, ticks and quiet gridlines draw in from the centre
      const bl = prog(t, T.anW + 0.5, T.anW + 1.1, E.inOutCubic), mid = (x0 + x1) / 2, half = ((x1 - x0) / 2 + 60) * bl;
      ctx.save(); ctx.globalAlpha = vis;
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
        const up = prog(t, c.rs + 0.42, c.rs + 1.0, E.outBack), hh = Math.max(0, c.h * up);
        if (hh > 0.5) {
          ctx.save(); ctx.globalAlpha = vis; shadow(28, 12, 0.14);
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
      centerText(st, money(spendTotal * cnt), C.copy.sym.household, { alpha: vis * prog(t, T.anW + 0.1, T.anW + 0.4), bigSize: 88 });
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
      const st = ringAt(t);
      const ringIn = prog(t, T.a, T.a + 0.45, E.outCubic);
      // the solid logo ring (import, analytics); the year replaces it in scene 2, the dark ring in scene 3
      const yearVis = prog(t, T.rec - 0.25, T.rec + 0.25) * (1 - prog(t, T.rem - 0.3, T.rem + 0.05));
      const anFill = t < T.an - 0.2 ? 1 : prog(t, T.anW + 0.2, T.anW + 1.4, E.outCubic);
      const ringDark = isDark(st.x, st.y, t) ? 1 : 0, dkR = lerp(ringDark, dk, 0.35);
      const solidA = ringIn * (1 - yearVis) * (1 - dkR);
      if (t >= T.an - 0.3) {
        // analytics: the ring refills as the spending is counted
        if (anFill < 1) { ctx.save(); ctx.globalAlpha = solidA; ctx.strokeStyle = "#e7efe9"; ctx.lineWidth = st.sw; ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, TAU); ctx.stroke(); ctx.restore(); }
        drawRing(st, { alpha: solidA, body: Math.max(0.001, anFill), tenth: anFill > 0.97, shadow: anFill > 0.97 });
      } else drawRing(st, { alpha: solidA });
      sceneImport(t, st);
      sceneYear(t, st);
      sceneRemind(t, st, dkR);
      scenePour(t, st);
      drawText(t);
      drawHud(t);
    }

    // ------------------------------------------------------------ sound
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

    function qa() { return blocks.map((b) => { const l = b.items[b.items.length - 1].t + 0.45; return { text: b.text, in: b.tIn, out: b.tOut, readable: b.tOut - l }; }); }
    seek(T.a);
    return { duration: T.b, width: W, height: H, format: V ? "vertical" : "landscape", range: [T.a, T.b], seek, times: T, qa, cues: () => ({ duration: T.b, cues: [...sfx].sort((a, b) => a.t - b.t) }) };
  }

  window.GEO = { init };
})();
