#!/usr/bin/env python3
"""Align a supplied narration recording to the TEN10 promo script.

The recording is the master timeline: it is never stretched or trimmed, and
t=0 of the film is t=0 of the file. This tool finds where every script phrase
(and, approximately, every word) sits in the file and writes
narration/timing.<lang>.json with ``source: "audio"`` in the same schema as
tools/estimate_timing.py.

Method
  1. ffmpeg decodes the file to mono 16 kHz float32 (piped, -f f32le).
  2. RMS envelope in dBFS: 30 ms window, 20 ms hop (80 Hz high-pass first).
  3. Speech/silence: frames above --threshold dBFS are speech. Without
     --threshold the noise floor is estimated as the 10th percentile of the
     envelope + 14 dB, clamped to [-50, -28]. Silences shorter than
     --min-silence are merged into speech (hangover), tiny blips are dropped.
     -> K speech segments separated by K-1 candidate gaps.
  4. If K < N (phrases run together) the longest segments are split at their
     deepest energy dip until K >= N (reported as "forced split").
  5. Dynamic programming picks N-1 of the K-1 gaps as phrase boundaries,
     maximising  sum(gap score)  +  sum(duration agreement), where
       gap score  = 1.6 * ln(1 + gap / 0.12 s)      (long pauses weigh a lot)
       agreement  = -(ln(actual / expected))^2 / (2 sigma^2)
     "expected" is the phrase's letter-count duration (same model as
     estimate_timing) scaled by the speaker's overall pace, which is
     re-estimated from the result and the DP re-run until it is stable.
  6. Phrase start = speech onset - 40 ms pre-roll, end = speech offset.
  7. Words: proportional to letters, but word boundaries snap to internal
     energy dips >= 60 ms found near their expected position.
  8. Overrides (optional, applied last), narration/timing.<lang>.overrides.json:
        {
          "phrases": { "rabbi":    {"start": 38.20},
                       "together": {"start": 41.05, "end": 46.90} },
          "words":   { "maaser:3": {"start": 20.10},
                       "rabbi:0":  {"start": 38.25, "end": 38.52} }
        }
     Phrase keys are phrase ids; word keys are "<phraseId>:<index>" with a
     0-based index into that phrase's "words" array. A phrase override
     re-distributes that phrase's words inside the new span first; word
     overrides are applied after that. Times are seconds in the audio file.

Examples
  python3 tools/sync_narration.py --lang he --audio audio/narration_he.wav --report
  python3 tools/sync_narration.py --lang en --audio ~/rec/en_take3.flac --threshold -42
  python3 tools/sync_narration.py --selftest
"""

from __future__ import annotations

import argparse
import json
import math
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from scipy import signal

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _ffmpeg import PROJECT_ROOT, decode_audio, rel_to_project, resolve_path  # noqa: E402
from estimate_timing import (  # noqa: E402
    LANGS, distribute, dump_timing, load_script, make_phrase_entry, phrase_model, print_table)

SR = 16000
HOP = 0.020            # envelope hop (s)
WIN = 0.030            # envelope window (s)
PREROLL = 0.040        # phrase start = onset - PREROLL
MIN_BLIP = 0.07        # speech runs shorter than this are dropped
MIN_DIP = 0.060        # minimum internal dip used for word snapping
GAP_W, GAP_G0 = 1.6, 0.12   # gap score = GAP_W * ln(1 + gap / GAP_G0)
FORCED_PENALTY = -3.0       # score for using a virtual split (+ up to 2 for a deep dip)


# ====================================================================== envelope
def envelope_db(x: np.ndarray, sr: int = SR) -> np.ndarray:
    """Short-time RMS in dBFS; frame i is centred at t = i * HOP."""
    sos = signal.butter(2, 80, "highpass", fs=sr, output="sos")
    x = signal.sosfilt(sos, x.astype(np.float64))
    hop, win = int(round(HOP * sr)), int(round(WIN * sr))
    n = int(math.ceil(len(x) / hop))
    pad = np.concatenate([np.zeros(win // 2), x, np.zeros(win)])
    c = np.concatenate([[0.0], np.cumsum(pad * pad)])
    idx = np.arange(n) * hop
    ms = (c[idx + win] - c[idx]) / win
    return 10 * np.log10(ms + 1e-12)


def auto_threshold(db: np.ndarray) -> tuple[float, float]:
    floor = float(np.percentile(db, 10))
    return float(np.clip(floor + 14.0, -50.0, -28.0)), floor


@dataclass
class Seg:
    on: float
    off: float
    forced_left: bool = False   # the gap before this segment is a virtual (forced) split
    split_depth: float = 0.0    # dip depth (dB) of that virtual split

    @property
    def dur(self) -> float:
        return self.off - self.on


def detect_segments(db: np.ndarray, thr: float, min_silence: float) -> tuple[list[Seg], list[Seg]]:
    """Return (speech segments, ignored blips) from an envelope."""
    speech = db > thr
    # Runs of speech frames -> [start frame, end frame) pairs.
    d = np.diff(np.concatenate([[0], speech.astype(np.int8), [0]]))
    starts, ends = np.flatnonzero(d == 1), np.flatnonzero(d == -1)
    segs = [Seg(s * HOP - HOP / 2, e * HOP - HOP / 2) for s, e in zip(starts, ends)]
    segs = [Seg(max(0.0, s.on), s.off) for s in segs]
    # Hangover: close silences shorter than min_silence.
    merged: list[Seg] = []
    for s in segs:
        if merged and s.on - merged[-1].off < min_silence:
            merged[-1].off = s.off
        else:
            merged.append(s)
    # Drop tiny blips and short weak bursts (breaths, clicks, lip noise).
    kept, ignored = [], []
    for s in merged:
        i0, i1 = int(round(s.on / HOP)), int(round(s.off / HOP)) + 1
        peak = float(db[i0:i1].max()) if i1 > i0 else -120.0
        if s.dur < MIN_BLIP or (s.dur < 0.25 and peak < thr + 6):
            ignored.append(s)
        else:
            kept.append(s)
    return kept, ignored


def add_split_candidates(segs: list[Seg], db: np.ndarray, n_needed: int) -> list[Seg]:
    """Offer virtual split points when there are fewer segments than phrases.

    Every long segment gets its deepest local energy minima (smoothed, away
    from the edges) as zero-length "forced" gaps. The DP may pick them as
    boundaries at a penalty (deeper dip = smaller penalty); unpicked ones are
    merged back afterwards. Chosen ones are reported as low-confidence.
    """
    smooth = np.convolve(db, np.ones(5) / 5, mode="same")
    out: list[Seg] = []
    n_cand = 0
    for s in segs:
        pts: list[tuple[float, float]] = []   # (time, depth dB below segment median)
        a, b = int((s.on + 0.2) / HOP), int((s.off - 0.2) / HOP)
        if s.dur >= 0.6 and b > a + 2:
            seg = smooth[a:b]
            med = float(np.median(db[int(s.on / HOP):int(s.off / HOP) + 1]))
            minima = [i for i in range(1, len(seg) - 1) if seg[i] <= seg[i - 1] and seg[i] <= seg[i + 1]]
            for i in sorted(minima, key=lambda i: seg[i]):
                t = (a + i) * HOP
                if all(abs(t - u) >= 0.3 for u, _ in pts):
                    pts.append((t, med - float(seg[i])))
                if len(pts) >= max(3, int(math.ceil(s.dur))):
                    break
        pts.sort()
        n_cand += len(pts)
        bounds = [s.on] + [t for t, _ in pts] + [s.off]
        for k in range(len(bounds) - 1):
            if k == 0:
                out.append(Seg(bounds[0], bounds[1], s.forced_left, s.split_depth))
            else:
                out.append(Seg(bounds[k], bounds[k + 1], True, pts[k - 1][1]))
    if len(segs) + n_cand < n_needed:
        raise RuntimeError("not enough speech segments or split points for the script; "
                           "is this the right recording / language?")
    return out


def collapse_unused(segs: list[Seg], groups: list[tuple[int, int]]) -> tuple[list[Seg], list[tuple[int, int]],
                                                                             list[str]]:
    """Merge forced pieces that did not become boundaries; report the ones that did."""
    new: list[Seg] = []
    new_groups, notes = [], []
    for a, b in groups:
        first = len(new)
        for j in range(a, b + 1):
            s = segs[j]
            if j > a and s.forced_left:          # unused virtual split -> merge
                new[-1] = Seg(new[-1].on, s.off, new[-1].forced_left, new[-1].split_depth)
            else:
                new.append(Seg(s.on, s.off, s.forced_left, s.split_depth))
        if new[first].forced_left:
            notes.append(f"forced split at {new[first].on:.2f}s (dip {new[first].split_depth:.1f} dB, "
                         "no real pause found - low confidence, consider an override)")
        new_groups.append((first, len(new) - 1))
    return new, new_groups, notes


# ====================================================================== alignment
def gap_score(g: float) -> float:
    return GAP_W * math.log1p(max(g, 0.0) / GAP_G0)


def sigma_for(expected: float) -> float:
    """Relative-duration tolerance: short phrases are less predictable."""
    return math.sqrt(0.16 ** 2 + (0.12 / max(expected, 0.2)) ** 2)


def dp_align(segs: list[Seg], expected: list[float], scale: float) -> tuple[list[int], float]:
    """Choose phrase end-segment indices (len N) maximising the total score."""
    K, N = len(segs), len(expected)
    on = np.array([s.on for s in segs])
    off = np.array([s.off for s in segs])
    gaps = [gap_score(on[j + 1] - off[j]) if not segs[j + 1].forced_left
            else FORCED_PENALTY + min(0.15 * segs[j + 1].split_depth, 2.0) for j in range(K - 1)]
    NEG = -1e18
    best = np.full((N, K), NEG)
    back = np.zeros((N, K), dtype=int)
    for p in range(N):
        e = expected[p] * scale
        inv2s2 = 1.0 / (2 * sigma_for(expected[p]) ** 2)
        for j in range(p, K - (N - 1 - p)):
            for i in range(p, j + 1):          # phrase p covers segments i..j
                d = off[j] - on[i]
                dur = -(math.log(max(d, 1e-3) / e) ** 2) * inv2s2
                if p == 0:
                    if i != 0:
                        continue
                    val = dur
                else:
                    prev = best[p - 1, i - 1]
                    if prev <= NEG / 2:
                        continue
                    val = prev + gaps[i - 1] + dur
                if val > best[p, j]:
                    best[p, j], back[p, j] = val, i
    if best[N - 1, K - 1] <= NEG / 2:
        raise RuntimeError("alignment failed")
    ends, j = [0] * N, K - 1
    for p in range(N - 1, -1, -1):
        ends[p] = j
        j = back[p, j] - 1
    return ends, float(best[N - 1, K - 1])


def align(segs: list[Seg], expected: list[float]) -> tuple[list[tuple[int, int]], float]:
    """Iterate DP <-> pace estimate. Returns [(first_seg, last_seg)] and the pace scale."""
    K, N = len(segs), len(expected)
    gaps = sorted((segs[j + 1].on - segs[j].off for j in range(K - 1)), reverse=True)  # forced ones are 0
    span = segs[-1].off - segs[0].on - sum(gaps[: N - 1])
    scale = max(span, 0.1) / sum(expected)
    ends: list[int] = []
    for _ in range(6):
        new_ends, _score = dp_align(segs, expected, scale)
        firsts = [0] + [e + 1 for e in new_ends[:-1]]
        actual = sum(segs[b].off - segs[a].on for a, b in zip(firsts, new_ends))
        scale = actual / sum(expected)
        if new_ends == ends:
            break
        ends = new_ends
    firsts = [0] + [e + 1 for e in ends[:-1]]
    return list(zip(firsts, ends)), scale


# ====================================================================== words
def find_dips(db: np.ndarray, t0: float, t1: float, thr: float) -> list[tuple[float, float]]:
    """Internal energy dips (>= MIN_DIP) strictly inside [t0, t1]."""
    i0, i1 = int(math.ceil(t0 / HOP)), int(math.floor(t1 / HOP))
    if i1 - i0 < 4:
        return []
    seg = db[i0:i1 + 1]
    loud = seg[seg > thr]
    dip_thr = max(thr, (float(np.median(loud)) if len(loud) else thr) - 18.0)
    low = np.concatenate([[0], (seg < dip_thr).astype(np.int8), [0]])
    d = np.diff(low)
    out = []
    for s, e in zip(np.flatnonzero(d == 1), np.flatnonzero(d == -1)):
        if s == 0 or e >= len(seg):      # touching the phrase edges -> not internal
            continue
        ts, te = (i0 + s) * HOP - HOP / 2, (i0 + e) * HOP - HOP / 2
        if te - ts >= MIN_DIP - 1e-9:
            out.append((ts, te))
    return out


def align_words(words: list[dict], t0: float, t1: float, dips: list[tuple[float, float]]
                ) -> tuple[list[tuple[float, float]], int]:
    """Letter-proportional word spans, snapped to nearby dips. Returns (spans, n_snapped)."""
    spans = distribute(words, t0, t1)
    W = len(words)
    if W < 2 or not dips:
        return spans, 0
    # Candidate (boundary k, dip d) pairs within tolerance, closest first.
    cands = []
    for k in range(W - 1):
        centre = (spans[k][1] + spans[k + 1][0]) / 2
        tol = max(0.12, 0.45 * min(spans[k][1] - spans[k][0], spans[k + 1][1] - spans[k + 1][0]))
        for di, (ds, de) in enumerate(dips):
            dist = abs((ds + de) / 2 - centre)
            if dist <= tol:
                cands.append((dist, k, di))
    cands.sort()
    chosen: dict[int, int] = {}
    for _dist, k, di in cands:
        if k in chosen or di in chosen.values():
            continue
        if all((k < k2) == (di < d2) for k2, d2 in chosen.items()):
            chosen[k] = di
    # Re-distribute words between anchors.
    out: list[tuple[float, float]] = []
    start_w, start_t = 0, t0
    for k in sorted(chosen) + [W - 1]:
        end_t = dips[chosen[k]][0] if k in chosen else t1
        out.extend(distribute(words[start_w:k + 1], start_t, end_t))
        if k in chosen:
            start_w, start_t = k + 1, dips[chosen[k]][1]
    return out, len(chosen)


# ====================================================================== pipeline
@dataclass
class Result:
    timing: dict
    segs: list[Seg]
    ignored: list[Seg]
    groups: list[tuple[int, int]]
    thr: float
    floor: float | None
    scale: float
    notes: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    expected: list[float] = field(default_factory=list)


def sync(script: dict, x: np.ndarray, *, audio_rel: str | None, threshold: float | None,
         min_silence: float, overrides: dict | None = None) -> Result:
    lang = script["lang"]
    duration = len(x) / SR
    db = envelope_db(x)
    floor = None
    if threshold is None:
        thr, floor = auto_threshold(db)
    else:
        thr = float(threshold)
    segs, ignored = detect_segments(db, thr, min_silence)
    phrases = script["phrases"]
    N = len(phrases)
    models = [phrase_model(p["text"], lang) for p in phrases]
    expected = [m[1] for m in models]
    warnings: list[str] = []
    notes: list[str] = []
    if not segs:
        raise RuntimeError(f"no speech found above {thr:.1f} dBFS; try --threshold")
    if len(segs) < N:
        segs = add_split_candidates(segs, db, N)
    groups, scale = align(segs, expected)
    segs, groups, forced_notes = collapse_unused(segs, groups)
    warnings += forced_notes

    out_phrases = []
    prev_end = 0.0
    for p, (ph, (a, b), (words, _)) in enumerate(zip(phrases, groups, models)):
        start = max(prev_end, segs[a].on - PREROLL, 0.0)
        end = segs[b].off
        dips = find_dips(db, segs[a].on, end, thr)
        spans, _n = align_words(words, start, end, dips)
        out_phrases.append(make_phrase_entry(ph["id"], ph["text"], start, end, spans, words))
        prev_end = end
        ratio = (end - segs[a].on) / (expected[p] * scale)
        if not 0.7 <= ratio <= 1.4:
            warnings.append(f"phrase '{ph['id']}' is {ratio:.2f}x its expected length - check boundaries")
    # Long unchosen pauses inside a phrase are worth a look.
    for (a, b), ph in zip(groups, phrases):
        for j in range(a, b):
            g = segs[j + 1].on - segs[j].off
            if g >= 0.45:
                warnings.append(f"{g:.2f}s pause inside phrase '{ph['id']}' at {segs[j].off:.2f}s")

    timing = {"lang": lang, "source": "audio", "audioFile": audio_rel,
              "audioDuration": round(duration, 3), "phrases": out_phrases}
    if overrides:
        notes += apply_overrides(timing, overrides, models, db, thr, warnings)
    return Result(timing, segs, ignored, groups, thr, floor, scale, notes, warnings, expected)


def apply_overrides(timing: dict, ov: dict, models, db, thr, warnings: list[str]) -> list[str]:
    notes = []
    by_id = {p["id"]: i for i, p in enumerate(timing["phrases"])}
    for pid, o in (ov.get("phrases") or {}).items():
        if pid not in by_id:
            warnings.append(f"override for unknown phrase '{pid}' ignored")
            continue
        i = by_id[pid]
        ph = timing["phrases"][i]
        start, end = float(o.get("start", ph["start"])), float(o.get("end", ph["end"]))
        if end <= start:
            warnings.append(f"override for '{pid}' has end <= start; ignored")
            continue
        words = models[i][0]
        spans, _ = align_words(words, start, end, find_dips(db, start, end, thr))
        timing["phrases"][i] = make_phrase_entry(pid, ph["text"], start, end, spans, words)
        notes.append(f"override phrase {pid}: {start:.3f}-{end:.3f}")
    for key, o in (ov.get("words") or {}).items():
        pid, _, idx = key.rpartition(":")
        if pid not in by_id or not idx.isdigit():
            warnings.append(f"bad word override key '{key}' (want '<phraseId>:<0-based index>')")
            continue
        words = timing["phrases"][by_id[pid]]["words"]
        k = int(idx)
        if k >= len(words):
            warnings.append(f"word override '{key}': phrase has only {len(words)} words")
            continue
        for fld in ("start", "end"):
            if fld in o:
                words[k][fld] = round(float(o[fld]), 3)
        notes.append(f"override word {key} ({words[k]['w']}): {words[k]['start']:.3f}-{words[k]['end']:.3f}")
    # Sanity: monotonic phrases and words.
    last = -1.0
    for ph in timing["phrases"]:
        if ph["start"] < last:
            warnings.append(f"after overrides phrase '{ph['id']}' starts before the previous one ends")
        last = ph["end"]
        for w in ph["words"]:
            if w["end"] < w["start"]:
                warnings.append(f"after overrides word '{w['w']}' in '{ph['id']}' has end < start")
    return notes


def print_report(res: Result, script: dict) -> None:
    print(f"\nthreshold {res.thr:.1f} dBFS" + (f" (auto: floor {res.floor:.1f} + 14)" if res.floor is not None else ""))
    print(f"detected {len(res.segs)} speech segments (+{len(res.ignored)} ignored blips); "
          f"pace scale {res.scale:.3f} (1.0 = estimate_timing's pace)")
    boundary_after = {b for (_a, b) in res.groups[:-1]}
    for j, s in enumerate(res.segs):
        mark = ""
        if j < len(res.segs) - 1:
            g = res.segs[j + 1].on - s.off
            mark = f"  gap {g:5.2f}s" + ("  <== boundary" if j in boundary_after else "")
            if res.segs[j + 1].forced_left:
                mark += " (forced)"
        print(f"  seg {j:2d} {s.on:7.2f} - {s.off:7.2f}  ({s.dur:5.2f}s){mark}")
    for s in res.ignored:
        print(f"  ignored blip {s.on:.2f}-{s.off:.2f}")
    print("\nboundaries:")
    for p, (a, b) in enumerate(res.groups[:-1]):
        nxt = res.segs[b + 1]
        g = nxt.on - res.segs[b].off
        conf = "FORCED (low)" if nxt.forced_left else ("high" if g >= 0.35 else "medium" if g >= 0.2 else "low")
        print(f"  {script['phrases'][p]['id']:>10} | {script['phrases'][p + 1]['id']:<10} "
              f"gap {g:5.2f}s at {res.segs[b].off:6.2f}s  confidence {conf}")
    print_table(res.timing)
    print("\nper-phrase duration vs expected (pace-scaled):")
    for p, (a, b) in enumerate(res.groups):
        d = res.segs[b].off - res.segs[a].on
        print(f"  {script['phrases'][p]['id']:<10} {d:5.2f}s / {res.expected[p] * res.scale:5.2f}s"
              f" = {d / (res.expected[p] * res.scale):4.2f}x  ({b - a + 1} segment(s))")
    for n in res.notes:
        print("note:", n)
    for w in res.warnings:
        print("WARNING:", w)
    if not res.warnings:
        print("no warnings")


# ====================================================================== selftest
def synth_narration(script: dict, seed: int, sr: int = SR, decoys: int = 3, long_decoys: int = 1
                    ) -> tuple[np.ndarray, list[tuple[float, float]], list[list[float]]]:
    """Fake narration: voiced-like bursts per word with the estimated durations.

    Returns (signal, true phrase spans, true word starts per phrase).
    """
    rng = np.random.default_rng(seed)
    lang = script["lang"]
    events = []   # (t0, t1, amp) voiced bursts
    phrase_spans, word_starts = [], []
    t = 0.6 + rng.uniform(-0.1, 0.25)
    all_bounds = []
    for ph in script["phrases"]:
        words, dur = phrase_model(ph["text"], lang)
        jit = rng.uniform(0.85, 1.15)
        p0 = t
        ws = []
        for i, w in enumerate(words):
            wd = w["dur"] * jit * rng.uniform(0.85, 1.15)
            ws.append(t)
            events.append([t, t + wd, rng.uniform(0.7, 1.0)])
            t += wd
            if i < len(words) - 1:
                gap = w["gap"] * jit * rng.uniform(0.8, 1.3)
                if gap == 0 and rng.random() < 0.25:
                    gap = rng.uniform(0.06, 0.1)          # micro-pause between words
                t += gap
                all_bounds.append(len(events) - 1)
        phrase_spans.append((p0, t))
        word_starts.append(ws)
        t += float(ph["pauseAfter"]) * rng.uniform(0.9, 1.15)
    # A couple of extra intra-phrase dips carved out at word joins, one of them
    # longer than --min-silence so the DP has a decoy gap to reject.
    for n, k in enumerate(rng.choice(all_bounds, size=decoys, replace=False)):
        e = events[k]
        dip = rng.uniform(0.19, 0.24) if n < long_decoys else rng.uniform(0.07, 0.14)
        e[1] = max(e[0] + 0.05, e[1] - dip)
    total = t + 0.8
    n = int(total * sr)
    x = np.zeros(n)
    tt = np.arange(n) / sr
    f0 = 120 + 40 * np.sin(2 * np.pi * 0.13 * tt) + 8 * np.sin(2 * np.pi * 5.1 * tt)
    phase = 2 * np.pi * np.cumsum(f0) / sr
    voiced = sum((1.0 / k) * np.sin(k * phase) for k in range(1, 24) if k * 160 < sr / 2 - 500)
    noise = signal.sosfilt(signal.butter(2, [1800, 5500], "bandpass", fs=sr, output="sos"),
                           rng.standard_normal(n))
    env = np.zeros(n)
    for t0, t1, amp in events:
        i0, i1 = int(t0 * sr), int(t1 * sr)
        L = i1 - i0
        if L <= 0:
            continue
        seg_t = np.arange(L) / sr
        syl = 0.6 + 0.4 * np.cos(2 * np.pi * rng.uniform(3.5, 5.5) * seg_t + rng.uniform(0, 6.28)) ** 2
        a = np.minimum(1.0, np.minimum(seg_t / 0.015, (L / sr - seg_t) / 0.03))
        env[i0:i1] = np.maximum(env[i0:i1], amp * syl * np.clip(a, 0, 1))
    x = env * (0.9 * voiced / np.abs(voiced).max() + 0.25 * noise / np.abs(noise).max())
    x *= 10 ** (-12 / 20) / (np.sqrt(np.mean(x[env > 0.3] ** 2)) + 1e-12) * 0.35
    x += 10 ** (-64 / 20) * rng.standard_normal(n)   # low background noise
    return x.astype(np.float32), phrase_spans, word_starts


def selftest(seeds: int = 3, keep_dir: str | None = None) -> int:
    from scipy.io import wavfile

    ok = True
    for lang in LANGS:
        script = load_script(lang)
        for seed in range(1, seeds + 1):
            x, truth, true_words = synth_narration(script, seed * 101 + (7 if lang == "en" else 0))
            with tempfile.TemporaryDirectory() as td:
                wav = Path(keep_dir or td) / f"selftest_{lang}_{seed}.wav"
                wav.parent.mkdir(parents=True, exist_ok=True)
                wavfile.write(wav, SR, x)
                y = decode_audio(wav, SR, 1)       # exercise the real ffmpeg path
                res = sync(script, y, audio_rel=wav.name, threshold=None, min_silence=0.18)
                if keep_dir:
                    dump_timing(res.timing, wav.with_suffix(".timing.json"))
            errs = []
            for ph, (ts, te) in zip(res.timing["phrases"], truth):
                errs.append(max(abs(ph["start"] - ts), abs(ph["end"] - te)))
            werr = [abs(w["start"] - tw) for ph, tws in zip(res.timing["phrases"], true_words)
                    for w, tw in zip(ph["words"], tws)]
            worst = int(np.argmax(errs))
            passed = max(errs) <= 0.12
            ok &= passed
            print(f"selftest {lang} seed {seed}: {len(res.segs)} segments, worst phrase edge error "
                  f"{max(errs) * 1000:.0f} ms ({res.timing['phrases'][worst]['id']}), word start error "
                  f"median {np.median(werr) * 1000:.0f} ms / p90 {np.percentile(werr, 90) * 1000:.0f} ms "
                  f"-> {'PASS' if passed else 'FAIL'}")
            if not passed:
                print_report(res, script)
    print("SELFTEST", "PASSED" if ok else "FAILED")
    return 0 if ok else 1


# ====================================================================== CLI
def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lang", choices=LANGS, help="script language")
    ap.add_argument("--audio", help="narration recording (any format ffmpeg reads)")
    ap.add_argument("--script", help="script JSON (default narration/script.<lang>.json)")
    ap.add_argument("--out", help="output JSON (default narration/timing.<lang>.json)")
    ap.add_argument("--overrides", help="overrides JSON (default narration/timing.<lang>.overrides.json if present)")
    ap.add_argument("--no-overrides", action="store_true", help="ignore the overrides file")
    ap.add_argument("--min-silence", type=float, default=0.18,
                    help="shortest silence that can separate segments (s, default 0.18)")
    ap.add_argument("--threshold", type=float, help="speech threshold in dBFS (default: auto)")
    ap.add_argument("--report", action="store_true", help="print the detailed alignment report")
    ap.add_argument("--selftest", action="store_true", help="run the synthetic alignment test and exit")
    ap.add_argument("--selftest-seeds", type=int, default=3, help="random takes per language (default 3)")
    ap.add_argument("--selftest-keep", metavar="DIR", help="keep selftest WAV + timing files in DIR")
    args = ap.parse_args(argv)

    if args.selftest:
        return selftest(args.selftest_seeds, args.selftest_keep)
    if not args.lang or not args.audio:
        ap.error("--lang and --audio are required (or use --selftest)")

    audio = resolve_path(args.audio, must_exist=True)
    if not audio.exists():
        ap.error(f"audio file not found: {audio}")
    script = load_script(args.lang, args.script)
    ov_path = resolve_path(args.overrides, must_exist=True) if args.overrides else \
        PROJECT_ROOT / "narration" / f"timing.{args.lang}.overrides.json"
    overrides = None
    if not args.no_overrides and ov_path.exists():
        overrides = json.loads(ov_path.read_text(encoding="utf-8"))
        print(f"using overrides {ov_path}")
    x = decode_audio(audio, SR, 1)
    res = sync(script, x, audio_rel=rel_to_project(audio), threshold=args.threshold,
               min_silence=args.min_silence, overrides=overrides)
    out = resolve_path(args.out) if args.out else PROJECT_ROOT / "narration" / f"timing.{args.lang}.json"
    dump_timing(res.timing, out)
    if args.report:
        print_report(res, script)
    else:
        print_table(res.timing)
        for w in res.warnings:
            print("WARNING:", w)
    print(f"wrote {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
