// Film engine: deterministic time → frame. Nothing animates on its own (no CSS
// transitions / rAF-driven state); every visual is a pure function of `t`, so
// any frame can be rendered in any order and the render is frame-exact.
(function () {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const E = {
    linear: (p) => p,
    inQuad: (p) => p * p,
    outQuad: (p) => 1 - (1 - p) * (1 - p),
    inOutQuad: (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
    outCubic: (p) => 1 - Math.pow(1 - p, 3),
    inCubic: (p) => p * p * p,
    inOutCubic: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    outQuart: (p) => 1 - Math.pow(1 - p, 4),
    outQuint: (p) => 1 - Math.pow(1 - p, 5),
    inOutQuint: (p) => (p < 0.5 ? 16 * p ** 5 : 1 - Math.pow(-2 * p + 2, 5) / 2),
    outExpo: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
    inOutExpo: (p) =>
      p <= 0 ? 0 : p >= 1 ? 1 : p < 0.5 ? Math.pow(2, 20 * p - 10) / 2 : (2 - Math.pow(2, -20 * p + 10)) / 2,
    // Gentle overshoot for "snap into place" moments (kept subtle on purpose)
    outBack: (p, s = 1.2) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2),
    // Critically-damped-ish settle
    settle: (p) => 1 - Math.exp(-6 * p) * Math.cos(p * 4.2) * (1 - p),
  };

  /** Progress of t through [a, b], eased. */
  const prog = (t, a, b, ease = E.inOutCubic) => (b <= a ? (t >= b ? 1 : 0) : ease(clamp((t - a) / (b - a))));
  /** Fade in over [a, a+din], hold, fade out over [b-dout, b]. */
  const window_ = (t, a, b, din = 0.3, dout = 0.3, ease = E.inOutQuad) =>
    Math.min(prog(t, a, a + din, ease), 1 - prog(t, b - dout, b, ease));

  // ---------------------------------------------------------------- timing
  /**
   * Narration anchors. `timing` is narration/timing.<lang>.json — produced either by
   * tools/estimate_timing.py (provisional) or tools/sync_narration.py (the real
   * recording, which is the master timeline).
   */
  function makeAnchors(timing) {
    const byId = {};
    for (const p of timing.phrases) byId[p.id] = p;
    const need = (id) => {
      const p = byId[id];
      if (!p) throw new Error(`timing: missing phrase "${id}"`);
      return p;
    };
    const norm = (s) => s.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
    return {
      phrases: timing.phrases,
      /** true when the narration contains phrase `id` (shorter cuts may omit phrases) */
      has: (id) => !!byId[id],
      s: (id) => need(id).start,
      e: (id) => need(id).end,
      dur: (id) => need(id).end - need(id).start,
      /** Start of the first word in phrase `id` whose text contains `needle`. */
      w(id, needle, which = "start") {
        const p = need(id);
        const n = norm(needle);
        const words = p.words || [];
        const hit = words.find((x) => norm(x.w) === n) || words.find((x) => norm(x.w).includes(n));
        if (!hit) {
          console.warn(`timing: word "${needle}" not found in "${id}", using phrase start`);
          return p.start;
        }
        return hit[which];
      },
      duration: timing.audioDuration,
    };
  }

  /** Browser-side fallback estimate (mirrors tools/estimate_timing.py). */
  function estimateTiming(script) {
    const rate = script.lang === "he" ? 12.5 : 14.5;
    const letters = (s) => s.replace(/TEN10/g, "טנטנx").replace(/[^\p{L}\p{N}]/gu, "").length;
    let t = 0.6;
    const phrases = script.phrases.map((ph) => {
      const commas = (ph.text.match(/,/g) || []).length;
      const dashes = (ph.text.match(/—/g) || []).length;
      const d = letters(ph.text) / rate + commas * 0.12 + dashes * 0.2;
      const start = t;
      const end = t + d;
      const toks = ph.text.split(/\s+/).filter(Boolean);
      const total = toks.reduce((a, w) => a + Math.max(1, letters(w)), 0);
      let c = start;
      const words = toks.map((w) => {
        const wd = (Math.max(1, letters(w)) / total) * d;
        const o = { w: w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""), start: c, end: c + wd };
        c += wd;
        return o;
      });
      t = end + ph.pauseAfter;
      return { id: ph.id, text: ph.text, start, end, words };
    });
    return { lang: script.lang, source: "estimated-in-browser", audioFile: null, audioDuration: t, phrases };
  }

  // ---------------------------------------------------------------- sfx cues
  /**
   * Scenes register sound-design cues at absolute times while the timeline is built;
   * the renderer exports them (sfx-cues.json) for tools/audio/mix.py.
   */
  const sfx = [];
  const cue = (t, type, gain = 0.6) => {
    if (Number.isFinite(t)) sfx.push({ t: Math.max(0, +t.toFixed(3)), type, gain });
  };

  window.ENGINE = { clamp, lerp, E, prog, win: window_, makeAnchors, estimateTiming, cue, sfx };
})();
