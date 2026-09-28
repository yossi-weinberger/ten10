// Style frames for the "geometry" language (brief §27 Stage B): stills to agree the look
// before animating. Everything is built from the logo's own geometry: the ring (the "0")
// and its gold tenth (a 36° slice). Clean, bright, precise; depth from soft layered
// shadows, not texture. Motion is implied with trails, so each still reads as a moment.
//
//   1 opening    chaos spirals into the ring; the tenth lifts out: 10%
//   2 import     the ring is a spool: real transactions wind onto it and become its stroke
//   3 recurring  the ring is the year: the tenth is stamped on every month by itself
//   4 analytics  the ring holds the house; each arc of the split feeds its room
//   5 end        everything settles into the logo; the chaos is now a perfect halo
(function () {
  const TEAL = "#11676a", TEAL_D = "#0c4a4c", GOLD = "#f0c000", GOLD_D = "#b58c00", INK = "#1f1c12", BG = "#fcfaf1";
  const TINTS = ["#11676a", "#5aa59c", "#f0c000", "#d9d1b6"];
  const TYPE_COL = { income: "#16a34a", donation: "#e0a800", expense: "#dc2626" };
  const lerp = (a, b, p) => a + (b - a) * p;
  const rng = (seed) => { let s = (seed * 2654435761) | 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; };
  const TAU = Math.PI * 2;
  // the tenth: centred on the upper right like the logo's wedge
  const TENTH_A0 = -Math.PI / 2 + 0.3, TENTH_A1 = TENTH_A0 + TAU / 10;

  function make(ctx, C, W, H) {
    const RTL = C.dir === "rtl", F = "Assistant";
    const money = window.makeUI(C).money;
    const font = (w, s) => `${w} ${s}px ${F}`;
    const shadow = (blur = 40, y = 16, a = 0.16) => { ctx.shadowColor = `rgba(14,52,48,${a})`; ctx.shadowBlur = blur; ctx.shadowOffsetY = y; ctx.shadowOffsetX = 0; };
    const noShadow = () => { ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; };

    function background() {
      ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
      const g = ctx.createRadialGradient(W * 0.42, H * 0.46, 0, W * 0.42, H * 0.46, W * 0.7);
      g.addColorStop(0, "rgba(255,255,255,0.95)"); g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.75);
      v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(120,104,60,0.10)");
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
      // faint measuring grid (precision), fading out from the centre
      ctx.save();
      for (let x = 36; x < W; x += 36) for (let y = 36; y < H; y += 36) {
        const d = Math.hypot((x - W / 2) / W, (y - H / 2) / H);
        const a = Math.max(0, 0.11 - d * 0.16);
        if (a <= 0.005) continue;
        ctx.fillStyle = `rgba(17,103,106,${a.toFixed(3)})`; ctx.fillRect(x - 1, y - 1, 2, 2);
      }
      ctx.restore();
    }
    function hud(n, chapter) {
      ctx.save();
      ctx.font = font(700, 21); ctx.fillStyle = "rgba(17,103,106,0.55)"; ctx.textBaseline = "middle";
      ctx.direction = RTL ? "rtl" : "ltr"; ctx.textAlign = RTL ? "right" : "left";
      ctx.fillText(`${String(n).padStart(2, "0")} · ${chapter}`, RTL ? W - 72 : 72, 64);
      // progress: a thin line with the tenth as its marker
      const x0 = W / 2 - 260, x1 = W / 2 + 260, y = H - 62, u = [0.06, 0.34, 0.4, 0.5, 0.97][n - 1];
      ctx.strokeStyle = "rgba(17,103,106,0.16)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      const xm = RTL ? lerp(x1, x0, u) : lerp(x0, x1, u);
      ctx.strokeStyle = TEAL; ctx.beginPath(); ctx.moveTo(RTL ? x1 : x0, y); ctx.lineTo(xm, y); ctx.stroke();
      ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(xm, y, 6, 0, TAU); ctx.fill();
      ctx.restore();
    }
    /** the narration as type: a small lead-in and the key words, gold full stop */
    function headline(small, big, x, top, opts = {}) {
      const sS = opts.small || 46, sB = opts.big || 100, maxW = opts.maxW || 720;
      ctx.save(); ctx.direction = RTL ? "rtl" : "ltr"; ctx.textAlign = RTL ? "right" : "left"; ctx.textBaseline = "alphabetic";
      let y = top + sS;
      if (small) { ctx.font = font(700, sS); ctx.fillStyle = "#3a3524"; ctx.fillText(small, x, y); y += sS * 0.5; }
      ctx.font = font(800, sB);
      const words = big.split(" "), lines = [];
      let cur = "";
      for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
      lines.push(cur);
      if (lines.length > 1 && !lines[lines.length - 1].includes(" ")) { const prev = lines[lines.length - 2].split(" "); if (prev.length > 1) { lines[lines.length - 1] = `${prev.pop()} ${lines[lines.length - 1]}`; lines[lines.length - 2] = prev.join(" "); } }
      lines.forEach((ln, i) => {
        y += sB * (i ? 1.02 : 1.0);
        const txt = i === lines.length - 1 ? ln.replace(/[.,]$/, "") : ln;
        ctx.fillStyle = opts.color || TEAL; ctx.fillText(txt, x, y);
        if (i === lines.length - 1) {
          const w = ctx.measureText(txt).width;
          ctx.fillStyle = GOLD; ctx.textAlign = RTL ? "right" : "left";
          ctx.fillText(".", RTL ? x - w : x + w, y);
          ctx.textAlign = RTL ? "right" : "left";
        }
      });
      ctx.restore();
    }
    /** the ring with its tenth; lift pulls the tenth outwards */
    function ring(cx, cy, r, sw, opts = {}) {
      const lift = opts.lift || 0, gap = 0.035;
      ctx.save();
      if (opts.shadow !== false) shadow(50, 22, 0.14);
      ctx.lineCap = "butt"; ctx.lineWidth = sw; ctx.strokeStyle = opts.color || TEAL;
      ctx.beginPath(); ctx.arc(cx, cy, r, TENTH_A1 + gap, TENTH_A0 - gap + TAU); ctx.stroke();
      const am = (TENTH_A0 + TENTH_A1) / 2, lx = Math.cos(am) * lift, ly = Math.sin(am) * lift;
      if (lift) shadow(40, 26, 0.22);
      ctx.strokeStyle = GOLD; ctx.beginPath(); ctx.arc(cx + lx, cy + ly, r, TENTH_A0, TENTH_A1); ctx.stroke();
      ctx.restore();
    }
    function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
    /** a transaction row, the app's own anatomy: type colour, description, category, amount */
    function txRow(rw, x, y, w, h, a = 1, rot = 0) {
      ctx.save(); ctx.globalAlpha = a; ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot); ctx.translate(-w / 2, -h / 2);
      shadow(26, 10, 0.12); ctx.fillStyle = "#fff"; rrect(0, 0, w, h, 16); ctx.fill(); noShadow();
      ctx.strokeStyle = "rgba(40,36,20,0.07)"; ctx.lineWidth = 1; ctx.stroke();
      const s = h / 64, pad = 22 * s, col = TYPE_COL[rw.type];
      ctx.fillStyle = col; rrect(RTL ? w - 7 * s : 0, 0, 7 * s, h, [RTL ? 0 : 16, RTL ? 16 : 0, RTL ? 16 : 0, RTL ? 0 : 16]); ctx.fill();
      ctx.direction = RTL ? "rtl" : "ltr"; ctx.textBaseline = "middle";
      ctx.textAlign = RTL ? "right" : "left"; ctx.fillStyle = INK; ctx.font = font(700, 25 * s);
      const xs = RTL ? w - pad - 8 * s : pad + 8 * s;
      ctx.fillText(rw.desc, xs, h / 2 - 1);
      const dw = ctx.measureText(rw.desc).width;
      // type chip
      const tl = C.ui.table.types[rw.type];
      ctx.font = font(700, 17 * s); const cw = ctx.measureText(tl).width + 22 * s;
      const cx = RTL ? xs - dw - 14 * s - cw : xs + dw + 14 * s;
      ctx.fillStyle = col + "22"; rrect(cx, h / 2 - 14 * s, cw, 28 * s, 14 * s); ctx.fill();
      ctx.fillStyle = col; ctx.textAlign = "center"; ctx.fillText(tl, cx + cw / 2, h / 2);
      // amount + date on the far side
      ctx.textAlign = RTL ? "left" : "right"; ctx.font = font(800, 26 * s); ctx.fillStyle = TEAL;
      ctx.fillText(money(rw.amt), RTL ? pad : w - pad, h / 2 - 9 * s);
      ctx.font = font(600, 16 * s); ctx.fillStyle = "rgba(31,28,18,0.45)";
      ctx.fillText(rw.d, RTL ? pad : w - pad, h / 2 + 15 * s);
      ctx.restore();
    }
    function chip(text, x, y, opts = {}) {
      ctx.save(); ctx.font = font(opts.w || 700, opts.size || 26); ctx.direction = opts.dir || (RTL ? "rtl" : "ltr");
      const w = ctx.measureText(text).width + (opts.pad || 26) * 2, h = (opts.size || 26) * 2.1;
      shadow(24, 10, 0.12); ctx.fillStyle = opts.bg || "#fff"; rrect(x - w / 2, y - h / 2, w, h, h / 2); ctx.fill(); noShadow();
      ctx.fillStyle = opts.color || INK; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, x, y + 1);
      ctx.restore();
      return w;
    }

    // ================================================================ 1. opening
    function f1() {
      background();
      const cx = W / 2, cy = 470, r = 230, sw = 56;
      // spiral arms: fragments of a household's money streaming into the ring
      const rr = rng(3), glyphs = ["₪", "$", "€", "%", "₪", "₪"];
      ctx.save();
      for (let i = 0; i < 900; i++) {
        const arm = i % 5, u = Math.pow(rr(), 0.7);
        const rad = r + 30 + u * 980, th = arm * (TAU / 5) + u * 2.6 + (rr() - 0.5) * 0.35;
        const x = cx + Math.cos(th) * rad * 1.15, y = cy + Math.sin(th) * rad * 0.72;
        if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
        const a = 0.12 + (1 - u) * 0.5, sz = 1.5 + u * 5;
        // trail along the direction of travel (inwards along the arm)
        const tx = -Math.sin(th) * 1.15 - Math.cos(th) * 0.5, ty = Math.cos(th) * 0.72 - Math.sin(th) * 0.3;
        const tl = 10 + u * 46;
        ctx.strokeStyle = `rgba(17,103,106,${(a * 0.5).toFixed(3)})`; ctx.lineWidth = Math.max(1, sz * 0.5);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - tx * tl, y - ty * tl); ctx.stroke();
        const k = rr();
        if (k < 0.12) { ctx.fillStyle = `rgba(240,192,0,${Math.min(1, a + 0.2).toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, sz * 1.1, 0, TAU); ctx.fill(); }
        else if (k < 0.2 && u > 0.35) { ctx.fillStyle = `rgba(17,103,106,${a.toFixed(3)})`; ctx.font = font(800, Math.round(10 + u * 16)); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(glyphs[i % glyphs.length], x, y); }
        else { ctx.fillStyle = `rgba(17,103,106,${a.toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, sz * 0.55, 0, TAU); ctx.fill(); }
      }
      ctx.restore();
      // larger fragments near the lens, out of focus
      const frags = [["משכורת", 10000, "income", 250, 190, 6], ["תרומה חודשית", 360, "donation", 1640, 250, 4], ["$250", null, null, 1500, 880, 5], ["€120", null, null, 330, 860, 3], ["חשמל", 389, "expense", 1690, 640, 7]];
      if (!RTL) { frags[0][0] = "Salary"; frags[1][0] = "Monthly donation"; frags[4][0] = "Electricity"; }
      for (const [lbl, amt, type, x, y, bl] of frags) {
        ctx.save(); ctx.filter = `blur(${bl}px)`; ctx.globalAlpha = 0.85;
        if (amt) chip(`${lbl}  ${money(amt)}`, x, y, { size: 30, color: type ? TYPE_COL[type] : INK });
        else chip(lbl, x, y, { size: 32, color: TEAL });
        ctx.restore();
      }
      // the ring, the tenth lifted out
      ring(cx, cy, r, sw, { lift: 26 });
      ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.direction = "ltr";
      ctx.font = font(800, 150); const w10 = ctx.measureText("10").width, wp = ctx.measureText("%").width;
      ctx.fillStyle = TEAL; ctx.fillText("10", cx - wp / 2, cy + 52);
      ctx.fillStyle = GOLD; ctx.fillText("%", cx + w10 / 2, cy + 52);
      ctx.restore();
      ctx.save(); ctx.textAlign = "center"; ctx.direction = RTL ? "rtl" : "ltr";
      ctx.font = font(700, 44); ctx.fillStyle = TEAL; ctx.fillText(C.copy.eyebrow, cx, cy - r - 70);
      ctx.font = font(700, 66); ctx.fillStyle = "#3a3524"; ctx.fillText(C.copy.sounds.join(" "), cx, cy + r + 138);
      ctx.restore();
      hud(1, RTL ? "מעשר" : "Maaser");
    }

    // ================================================================ 2. import: the spool
    function f2() {
      background();
      const cx = RTL ? 640 : W - 640, cy = 470, r = 210, sw = 58;
      const rows = C.rows.slice(0, 7);
      // the ring is wound from fine strands (the imported history)
      ctx.save(); shadow(50, 22, 0.14);
      ctx.strokeStyle = TEAL; ctx.lineWidth = sw; ctx.beginPath(); ctx.arc(cx, cy, r, TENTH_A1 + 0.035, TENTH_A0 - 0.035 + TAU); ctx.stroke();
      noShadow();
      for (let k = 0; k < 11; k++) {
        const rk = r - sw / 2 + 3 + k * ((sw - 6) / 10);
        ctx.strokeStyle = `rgba(255,255,255,${k % 2 ? 0.1 : 0.2})`; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(cx, cy, rk, TENTH_A1 + 0.035, TENTH_A0 - 0.035 + TAU); ctx.stroke();
      }
      ctx.restore();
      ring(cx, cy, r, sw, { shadow: false, color: "rgba(0,0,0,0)" });
      // the incoming strand: rows travel along a curve, calming from scattered to aligned,
      // then thin into a line that winds onto the ring
      const path = (u) => { // u 0 = far, 1 = onto the ring (tangent at the bottom)
        const p0 = [RTL ? 1620 : W - 1620, 1010], p1 = [RTL ? 1450 : W - 1450, 560], p2 = [RTL ? 1000 : W - 1000, 760], p3 = [cx, cy + r];
        const q = 1 - u;
        return [q ** 3 * p0[0] + 3 * q * q * u * p1[0] + 3 * q * u * u * p2[0] + u ** 3 * p3[0], q ** 3 * p0[1] + 3 * q * q * u * p1[1] + 3 * q * u * u * p2[1] + u ** 3 * p3[1]];
      };
      // strand line (the part that has already become thread)
      ctx.save(); ctx.lineCap = "round";
      for (let k = 0; k < 5; k++) {
        ctx.strokeStyle = `rgba(17,103,106,${0.18 + k * 0.1})`; ctx.lineWidth = 2 + k * 0.6;
        ctx.beginPath();
        for (let s = 0.58; s <= 1.0001; s += 0.01) { const [x, y] = path(s); const o = (k - 2) * 3 * (1 - s); if (s === 0.58) ctx.moveTo(x, y + o); else ctx.lineTo(x, y + o); }
        ctx.stroke();
      }
      ctx.restore();
      // rows along the strand, far → near: scattered, then settling into the stream
      const rr = rng(11);
      const stops = [0.05, 0.14, 0.23, 0.32, 0.41, 0.5, 0.57];
      stops.forEach((u, i) => {
        const [x, y] = path(u), [x2, y2] = path(u + 0.01);
        const ang = Math.atan2(y2 - y, x2 - x) * 0.25 + (1 - u * 1.8) * (rr() - 0.5) * 0.35;
        const sc = lerp(1.05, 0.62, u / 0.57), w = 540 * sc, h = 64 * sc;
        // motion ghosts
        for (let g = 3; g >= 1; g--) { const [gx, gy] = path(Math.max(0, u - g * 0.012)); txRow(rows[i], gx - w / 2, gy - h / 2, w, h, 0.08, ang); }
        txRow(rows[i], x - w / 2, y - h / 2, w, h, lerp(1, 0.9, u), ang);
      });
      // the source: a spreadsheet tab where the strand starts
      chip(C.copy.sym.file, RTL ? 1700 : W - 1700, 1030, { size: 22, color: "#16a34a", dir: "ltr" });
      // the running count inside the ring
      ctx.save(); ctx.textAlign = "center"; ctx.direction = "ltr"; ctx.textBaseline = "alphabetic";
      ctx.font = font(800, 104); ctx.fillStyle = TEAL; ctx.fillText("1,284", cx, cy + 22);
      ctx.direction = RTL ? "rtl" : "ltr"; ctx.font = font(700, 30); ctx.fillStyle = "rgba(31,28,18,0.6)"; ctx.fillText(C.copy.sym.imported, cx, cy + 72);
      ctx.restore();
      const ph = RTL ? ["אפשר לייבא", "תנועות קיימות."] : ["Import", "existing transactions."];
      headline(ph[0], ph[1], RTL ? W - 150 : 150, 200, { maxW: 760 });
      hud(3, C.copy.cine.chapters.import);
    }

    // ================================================================ 3. recurring: the year
    function f3() {
      background();
      const cx = RTL ? 700 : W - 700, cy = 520, r = 250, sw = 54;
      const DIR = RTL ? -1 : 1, done = 9; // months already stamped in this moment
      const months = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(C.locale, { month: "short" }).format(new Date(2025, 11 + i, 1)));
      // track
      ctx.save(); shadow(50, 22, 0.12);
      ctx.strokeStyle = "#e7efe9"; ctx.lineWidth = sw; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
      ctx.restore();
      // the sweep: the year being filled by itself (a trail that fades behind the head)
      const a0 = -Math.PI / 2, step = TAU / 12;
      for (let k = 0; k < 60; k++) {
        const s0 = a0 + DIR * step * (done * (k / 60)), s1 = a0 + DIR * step * (done * ((k + 1) / 60));
        ctx.strokeStyle = `rgba(17,103,106,${(0.25 + 0.75 * (k / 60)).toFixed(3)})`; ctx.lineWidth = sw;
        ctx.beginPath(); ctx.arc(cx, cy, r, Math.min(s0, s1), Math.max(s0, s1) + 0.004); ctx.stroke();
      }
      // a tenth on every month: stamped (gold) up to now, outlined ahead
      for (let m = 0; m < 12; m++) {
        const am = a0 + DIR * step * (m + 0.5), half = step * 0.28;
        if (m < done) {
          ctx.save(); if (m === done - 1) shadow(30, 14, 0.25);
          ctx.strokeStyle = GOLD; ctx.lineWidth = sw * 0.55; ctx.beginPath(); ctx.arc(cx, cy, r + (m === done - 1 ? 14 : 0), am - half, am + half); ctx.stroke(); ctx.restore();
          // the amount, tangent outside the ring
          ctx.save(); const tx = cx + Math.cos(am) * (r + 78), ty = cy + Math.sin(am) * (r + 78);
          ctx.font = font(800, 22); ctx.fillStyle = GOLD_D; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.direction = "ltr";
          ctx.fillText(String(C.ui.recurring.amount), tx, ty); ctx.restore();
        } else {
          ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = "rgba(181,140,0,0.55)"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(cx, cy, r + sw * 0.28, am - half, am + half); ctx.arc(cx, cy, r - sw * 0.28, am + half, am - half, true); ctx.closePath(); ctx.stroke(); ctx.restore();
        }
        // month label, upright, inside the ring
        const lx = cx + Math.cos(am) * (r - 70), ly = cy + Math.sin(am) * (r - 70);
        ctx.save(); ctx.font = font(700, 23); ctx.fillStyle = m < done ? TEAL : "rgba(17,103,106,0.45)"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.direction = RTL ? "rtl" : "ltr";
        ctx.fillText(months[m], lx, ly); ctx.restore();
        // tick
        const at = a0 + DIR * step * m;
        ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(at) * (r - sw / 2), cy + Math.sin(at) * (r - sw / 2)); ctx.lineTo(cx + Math.cos(at) * (r + sw / 2), cy + Math.sin(at) * (r + sw / 2)); ctx.stroke();
      }
      // the head of the sweep: a glowing gold point
      const ah = a0 + DIR * step * done;
      ctx.save(); shadow(26, 0, 0.35); ctx.shadowColor = "rgba(240,192,0,0.8)";
      ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(cx + Math.cos(ah) * r, cy + Math.sin(ah) * r, 17, 0, TAU); ctx.fill();
      noShadow(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 5; ctx.stroke(); ctx.restore();
      // the standing order itself (the app's recurring tag) hovering over its first month
      const rc = C.ui.recurring;
      chip(`${rc.label}  ·  ${money(rc.amount)}  ·  ${C.chaos.recurring.sub}`, cx, cy - r - 110, { size: 28 });
      ctx.save(); ctx.strokeStyle = "rgba(17,103,106,0.35)"; ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.moveTo(cx, cy - r - 80); ctx.lineTo(cx, cy - r - 30); ctx.stroke(); ctx.restore();
      // the year's total, computed: 12 × 360
      ctx.save(); ctx.textAlign = "center"; ctx.direction = "ltr"; ctx.textBaseline = "alphabetic";
      ctx.font = font(800, 92); ctx.fillStyle = TEAL; ctx.direction = RTL ? "rtl" : "ltr"; ctx.fillText(money(rc.amount * 12), cx, cy + 18);
      ctx.direction = RTL ? "rtl" : "ltr"; ctx.font = font(700, 28); ctx.fillStyle = "rgba(31,28,18,0.6)";
      ctx.fillText(RTL ? "תרומות השנה · נוצרות לבד" : "this year · automatically", cx, cy + 66);
      ctx.restore();
      const ph = RTL ? ["להגדיר הוראות קבע", "שנוצרות אוטומטית."] : ["Automate", "recurring entries."];
      headline(ph[0], ph[1], RTL ? W - 150 : 150, 250, { maxW: 700 });
      hud(4, C.copy.cine.chapters.recurring);
    }

    // ================================================================ 4. analytics: the house inside the ring
    function f4() {
      background();
      const cx = RTL ? 690 : W - 690, cy = 520, r = 375, sw = 40;
      const cats = C.ui.analytics.cats, total = cats.reduce((a, c) => a + c[1], 0);
      const shares = [...cats.slice(0, 3), [C.copy.sym.other, cats.slice(3).reduce((a, c) => a + c[1], 0)]];
      const pct = shares.map(([, v]) => Math.round((v / total) * 100)); pct[3] = 100 - pct[0] - pct[1] - pct[2];
      // the ring, opened into the split: arcs, each lifted a little outward
      let acc = -Math.PI / 2 + 0.2;
      const arcs = pct.map((p, i) => { const a0 = acc, a1 = acc + (TAU * p) / 100; acc = a1; return { a0, a1, i }; });
      arcs.forEach(({ a0, a1, i }) => {
        const am = (a0 + a1) / 2, off = 10 + i * 4;
        ctx.save(); shadow(34, 16, 0.14); ctx.lineCap = "butt"; ctx.strokeStyle = TINTS[i]; ctx.lineWidth = sw;
        ctx.beginPath(); ctx.arc(cx + Math.cos(am) * off, cy + Math.sin(am) * off, r, a0 + 0.02, a1 - 0.02); ctx.stroke(); ctx.restore();
      });
      // the house, inscribed: body + roof; rooms are the same split (treemap)
      const hw = 500, bodyH = 280, roofH = 160, hx = cx - hw / 2, by = cy - 95, ty = by - roofH;
      ctx.save(); shadow(46, 22, 0.16);
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(hx - 24, by + 4); ctx.lineTo(cx, ty); ctx.lineTo(hx + hw + 24, by + 4); ctx.lineTo(hx + hw, by + 4); ctx.lineTo(hx + hw, by + bodyH); ctx.lineTo(hx, by + bodyH); ctx.lineTo(hx, by + 4); ctx.closePath(); ctx.fill();
      ctx.restore();
      // roof = the largest share lives under it: split body into rooms
      const w0 = hw * (pct[0] / 100), rest = 100 - pct[0];
      const bigX = RTL ? hx + hw - w0 : hx, restX = RTL ? hx : hx + w0;
      const rooms = [{ x: bigX, y: by, w: w0, h: bodyH, i: 0 }];
      let yy = by;
      for (let i = 1; i < 4; i++) { const hh = (bodyH * pct[i]) / rest; rooms.push({ x: restX, y: yy, w: hw - w0, h: hh, i }); yy += hh; }
      rooms.forEach((rm) => {
        ctx.fillStyle = rm.i === 0 ? "rgba(17,103,106,0.12)" : rm.i === 2 ? "rgba(240,192,0,0.28)" : rm.i === 1 ? "rgba(90,165,156,0.2)" : "rgba(217,209,182,0.45)";
        ctx.fillRect(rm.x + 3, rm.y + 3, rm.w - 6, rm.h - 6);
        ctx.strokeStyle = "rgba(17,103,106,0.35)"; ctx.lineWidth = 2; ctx.strokeRect(rm.x + 3, rm.y + 3, rm.w - 6, rm.h - 6);
        ctx.save(); ctx.textAlign = "center"; ctx.direction = "ltr"; ctx.textBaseline = "alphabetic";
        const big = rm.i === 0 ? 74 : Math.max(26, Math.min(40, rm.h * 0.45));
        ctx.font = font(800, big); ctx.fillStyle = rm.i === 0 ? TEAL : INK;
        const mx = rm.x + rm.w / 2, my = rm.y + rm.h / 2;
        if (rm.i === 0) { ctx.fillText(`${pct[0]}%`, mx, my + 18); ctx.direction = RTL ? "rtl" : "ltr"; ctx.font = font(700, 28); ctx.fillStyle = "rgba(31,28,18,0.6)"; ctx.fillText(shares[0][0], mx, my + 58); }
        else if (rm.h > 70) {
          ctx.font = font(800, 38); ctx.fillText(`${pct[rm.i]}%`, mx, my + 4);
          ctx.direction = RTL ? "rtl" : "ltr"; ctx.font = font(700, 22); ctx.fillStyle = "rgba(31,28,18,0.65)"; ctx.fillText(shares[rm.i][0], mx, my + 32);
        } else {
          ctx.font = font(800, 24); ctx.direction = RTL ? "rtl" : "ltr";
          ctx.fillText(RTL ? `${shares[rm.i][0]} ${pct[rm.i]}%` : `${pct[rm.i]}% ${shares[rm.i][0]}`, mx, my + 9);
        }
        ctx.restore();
      });
      // roof lines + chimney + the roof gable holds the total
      ctx.save(); ctx.strokeStyle = TEAL; ctx.lineWidth = 6; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(hx - 24, by + 4); ctx.lineTo(cx, ty); ctx.lineTo(hx + hw + 24, by + 4); ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeRect(hx, by, hw, bodyH);
      ctx.textAlign = "center"; ctx.direction = RTL ? "rtl" : "ltr"; ctx.font = font(800, 40); ctx.fillStyle = TEAL; ctx.fillText(money(total), cx, by + bodyH + 58);
      ctx.font = font(700, 24); ctx.fillStyle = "rgba(31,28,18,0.55)"; ctx.fillText(C.copy.sym.household, cx, by + bodyH + 92);
      ctx.restore();
      // the flow: gold drops from the ring's tenth into the rooms (motion trails)
      const src = [cx, cy - r + 10];
      const rr = rng(8);
      for (let k = 0; k < 26; k++) {
        const rm = rooms[k % 4], tx = rm.x + rm.w * (0.2 + rr() * 0.6), tyy = rm.y + rm.h * (0.25 + rr() * 0.5), u = 0.35 + rr() * 0.55;
        const mx = lerp(src[0], tx, 0.5) + (rr() - 0.5) * 60, my = Math.min(src[1], tyy) - 60;
        const bz = (s) => [(1 - s) ** 2 * src[0] + 2 * (1 - s) * s * mx + s * s * tx, (1 - s) ** 2 * src[1] + 2 * (1 - s) * s * my + s * s * tyy];
        const [x, y] = bz(u), [x0, y0] = bz(Math.max(0, u - 0.18));
        const g = ctx.createLinearGradient(x0, y0, x, y); g.addColorStop(0, "rgba(240,192,0,0)"); g.addColorStop(1, "rgba(240,192,0,0.9)");
        ctx.strokeStyle = g; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x) / 2 + (mx - (src[0] + tx) / 2) * 0.3, (y0 + y) / 2 - 10, x, y); ctx.stroke();
        ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill();
      }
      const ph = RTL ? ["וניתוח הנתונים מראה בדיוק", "לאן הולך הכסף של הבית."] : ["Analytics show exactly", "where your household money goes."];
      headline(ph[0], ph[1], RTL ? W - 150 : 150, 300, { maxW: 700, big: 96 });
      hud(6, C.copy.cine.chapters.analytics);
    }

    // ================================================================ 5. end card
    function f5(logo, machon) {
      background();
      const cx = W / 2, cy = 360;
      // the opening's chaos, now a perfect halo of dots
      for (let ring_ = 0; ring_ < 5; ring_++) {
        const rr0 = 250 + ring_ * 46, n = 70 + ring_ * 24;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * TAU + ring_ * 0.1;
          const inTenth = a % TAU > (TENTH_A0 + TAU) % TAU && a % TAU < (TENTH_A1 + TAU) % TAU;
          ctx.fillStyle = inTenth ? `rgba(240,192,0,${0.6 - ring_ * 0.09})` : `rgba(17,103,106,${0.22 - ring_ * 0.035})`;
          ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr0, cy + Math.sin(a) * rr0, 3.2 - ring_ * 0.4, 0, TAU); ctx.fill();
        }
      }
      const lw = 300, lh = (lw * logo.height) / logo.width;
      ctx.save(); shadow(40, 18, 0.1); ctx.drawImage(logo, cx - lw / 2, cy - lh / 2, lw, lh); ctx.restore();
      ctx.save(); ctx.textAlign = "center"; ctx.direction = RTL ? "rtl" : "ltr";
      ctx.font = font(800, 60); ctx.fillStyle = INK;
      ctx.fillText(C.copy.tagline.join(" "), cx, 760);
      ctx.restore();
      const w1 = (() => { ctx.font = font(800, 30); return ctx.measureText(C.copy.free).width + 60; })();
      ctx.save(); ctx.font = font(600, 30); const w2 = ctx.measureText(C.copy.freeSub).width; ctx.restore();
      const tot = w1 + 24 + w2, sx = cx + (RTL ? tot / 2 : -tot / 2);
      chip(C.copy.free, sx + (RTL ? -w1 / 2 : w1 / 2), 850, { size: 30, bg: TEAL, color: "#fff", w: 800 });
      ctx.save(); ctx.font = font(600, 30); ctx.fillStyle = "rgba(31,28,18,0.7)"; ctx.textBaseline = "middle"; ctx.direction = RTL ? "rtl" : "ltr"; ctx.textAlign = RTL ? "right" : "left";
      ctx.fillText(C.copy.freeSub, sx + (RTL ? -w1 - 24 : w1 + 24), 852); ctx.restore();
      ctx.save(); ctx.textAlign = "center"; ctx.font = font(700, 30); ctx.fillStyle = TEAL; ctx.direction = "ltr"; ctx.fillText(C.copy.url, cx, 940);
      const mh = 58, mw = (mh * machon.width) / machon.height;
      ctx.direction = RTL ? "rtl" : "ltr"; ctx.font = font(600, 22); ctx.fillStyle = "rgba(31,28,18,0.6)";
      const ct = C.copy.trust.endCredit, cw = ctx.measureText(ct).width, gx = cx - (cw + mw + 16) / 2;
      ctx.drawImage(machon, RTL ? gx + cw + 16 : gx, 985, mw, mh);
      ctx.textAlign = RTL ? "right" : "left"; ctx.textBaseline = "middle"; ctx.fillText(ct, RTL ? gx + cw : gx + mw + 16, 985 + mh / 2);
      ctx.restore();
    }

    return { f1, f2, f3, f4, f5 };
  }

  window.FRAMES = { make };
})();
