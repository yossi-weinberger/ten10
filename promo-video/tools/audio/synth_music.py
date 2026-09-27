#!/usr/bin/env python3
"""Procedural TEMPORARY music bed for the TEN10 promo (placeholder).

The client may replace this with a licensed track at any time: tools/audio/
mix.py accepts any music file via --music. This bed exists so the film has a
tasteful, correctly-shaped score during production.

Direction: modern, restrained, premium, warm; light ambient/electronic
product-film feel with a subtle pulse. No build, no drop.

Musical material
  * ~92 BPM (tempo is nudged by at most +-4% so a bar line lands exactly on
    the "brand" phrase when --timing is given), D major / B minor.
  * 4-bar cycle: Dmaj9 - Bm9 - Gmaj7(#11) - A6sus2; the two bars before the
    logo are always Gmaj7(#11) - A6sus2, and the logo resolves to Dmaj9 and rings out.
  * warm pad: 5 voices x 3 detuned sine+soft-harmonic oscillators per side,
    decorrelated L/R, gentle low-pass, slow attack/release, short Haas blend;
  * soft felt-piano-like pluck motif on 8ths/quarters (sine + decaying
    harmonics, soft attack, small velocity variation, gentle pan);
  * very soft sub on the chord roots;
  * extremely quiet filtered-noise "tick" shaker on 8ths;
  * clean convolution reverb with a synthesised decaying-noise IR (~1.7 s).

Arrangement (driven by phrase ids when --timing is given; proportional
defaults otherwise):
  start ........ "order"      pad + a few plucks (sparse)
  "order" ...... "reminders"  pluck motif + shaker + sub (fuller)
  "notjust" .... "rabbi"      pad + sparse plucks (calm halachic section)
  "together"                  gentle return (medium plucks, soft shaker, sub)
  "brand"/"tagline"           resolve to Dmaj9, soft swell, ring, fade ~2.5 s

Output: 48 kHz stereo 24-bit WAV, integrated loudness -20 LUFS (default),
sample peak <= -3 dBFS, DC-free, every event enveloped (no clicks).

Example:
  python3 tools/audio/synth_music.py --duration 58 --out audio/music_bed.wav \\
      --timing narration/timing.he.json
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np
from scipy import signal

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import _dsp  # noqa: E402
from _ffmpeg import resolve_path  # noqa: E402

SR = _dsp.SR


def mtof(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


# name: (pad voicing MIDI, sub root MIDI, pluck pool MIDI)
CHORDS = {
    "Dmaj9": ([50, 57, 61, 64, 66], 38, [69, 73, 76, 78, 81]),
    "Bm9":   ([47, 54, 57, 61, 62], 35, [66, 69, 73, 74, 78]),
    "Gmaj7#11": ([43, 50, 54, 59, 61], 31, [66, 71, 73, 74, 78]),
    "A6sus2": ([45, 52, 59, 61, 66], 33, [64, 69, 71, 73, 76]),
}
CYCLE = ["Dmaj9", "Bm9", "Gmaj7#11", "A6sus2"]

# 8th-note slots (0..7) per bar for each pluck density; pitches picked from the pool
# layer gains relative to a unit-RMS pad (before the final loudness normalisation)
LEVELS = {"pad": 0.55, "pluck": 0.8, "sub": 0.2, "shaker": 0.2, "reverb": 0.4}
PAD_WIDTH = 0.45        # side/mid scaling of the pad (1 = fully decorrelated)

PATTERNS = {
    "none": [],
    "sparse": [0],
    "sparse2": [0, 5],
    "medium": [0, 3, 5],
    "full": [0, 2, 3, 5, 6],
}


# ------------------------------------------------------------------ arrangement
def section_times(duration: float, timing: dict | None) -> dict:
    """Key times (s) for the arrangement, from phrase ids or proportions."""
    if timing:
        ph = {p["id"]: p for p in timing["phrases"]}
        g = lambda i, k, d: float(ph[i][k]) if i in ph else d  # noqa: E731
        brand = g("brand", "start", duration * 0.80)
        return {
            "order": g("order", "start", duration * 0.22),
            "rem_end": g("reminders", "end", duration * 0.49),
            "notjust": g("notjust", "start", duration * 0.50),
            "rabbi_end": g("rabbi", "end", duration * 0.68),
            "together": g("together", "start", duration * 0.69),
            "brand": brand,
            "tagline": g("tagline", "start", brand + 1.3),
        }
    return {k: duration * f for k, f in dict(order=0.22, rem_end=0.49, notjust=0.50, rabbi_end=0.68,
                                                together=0.69, brand=0.80, tagline=0.825).items()}


def smooth_curve(t: np.ndarray, keys: list[tuple[float, float]], smooth: float = 0.8) -> np.ndarray:
    """Piecewise-linear keyframes, then Hann-smoothed (no sudden level jumps)."""
    kt, kv = zip(*sorted(keys))
    y = np.interp(t, kt, kv)
    dt = t[1] - t[0]
    n = max(3, int(smooth / dt) | 1)
    w = np.hanning(n)
    w /= w.sum()
    return np.convolve(np.pad(y, n, mode="edge"), w, mode="same")[n:-n]


def build_arrangement(duration: float, times: dict, bpm_nominal: float, fit_tempo: bool):
    """Tempo, chord per bar, and automation curves (at 100 Hz control rate)."""
    bar = 4 * 60.0 / bpm_nominal
    resolve_t = times["brand"]
    if fit_tempo:
        nbars = max(4, round(resolve_t / bar))
        cand = resolve_t / nbars
        if abs(cand / bar - 1) <= 0.04:
            bar = cand
    bpm = 4 * 60.0 / bar
    resolve_bar = max(2, round(resolve_t / bar))
    n_bars = int(math.ceil(duration / bar)) + 1
    chords = []
    for b in range(n_bars):
        if b >= resolve_bar:
            chords.append("Dmaj9")
        elif b == resolve_bar - 1:
            chords.append("A6sus2")          # V before the logo ...
        elif b == resolve_bar - 2:
            chords.append("Gmaj7#11")        # ... preceded by IV
        else:
            chords.append(CYCLE[b % 4])
    T = times
    r = resolve_bar * bar
    ct = np.arange(0, duration + 1.0, 0.01)
    curves = {
        "pad": smooth_curve(ct, [(0, 0.85), (T["order"], 0.85), (T["order"] + 1.5, 0.95),
                                 (T["rem_end"], 0.95), (T["notjust"] + 0.5, 0.85), (T["rabbi_end"], 0.85),
                                 (T["together"] + 1.0, 0.95), (r - 1.2, 0.92), (r + 0.8, 1.22),
                                 (r + 3.5, 1.05), (duration, 1.0)], smooth=1.2),
        "pluck": smooth_curve(ct, [(0, 0.8), (T["order"] - 0.3, 0.8), (T["order"] + 0.5, 1.0),
                                   (T["rem_end"], 1.0), (T["notjust"], 0.85), (T["rabbi_end"], 0.85),
                                   (T["together"], 0.95), (duration, 0.95)], smooth=0.6),
        "shaker": smooth_curve(ct, [(0, 0.0), (max(T["order"] - 0.2, 2 * bar), 0.0),
                                    (max(T["order"], 2 * bar) + 2.0, 1.0), (T["rem_end"], 1.0),
                                    (T["rem_end"] + 1.2, 0.0), (T["together"] + 0.2, 0.0),
                                    (T["together"] + 2.0, 0.55), (r - 1.5, 0.55), (r - 0.2, 0.0),
                                    (duration, 0.0)], smooth=1.0),
        "sub": smooth_curve(ct, [(0, 0.0), (T["order"] - 0.3, 0.0), (T["order"] + 1.2, 1.0),
                                 (T["rem_end"], 1.0), (T["rem_end"] + 1.5, 0.0), (T["together"], 0.0),
                                 (T["together"] + 1.5, 0.75), (r - 0.4, 0.75), (r + 0.3, 0.9),
                                 (duration, 0.6)], smooth=1.0),
    }

    def density(t: float) -> str:
        if t >= r:
            return "none"                 # resolve handled separately
        if t < T["order"] - 0.1:
            return "sparse2" if t > bar * 2 else "sparse"
        if t < T["rem_end"] + 0.3:
            return "full"
        if t < T["together"] - 0.2:
            return "sparse2" if t < T["rabbi_end"] else "sparse"
        return "medium"

    return bpm, bar, chords, resolve_bar, ct, curves, density


# ------------------------------------------------------------------ instruments
def env_adsr(n: int, sr: int, attack: float, release: float, sustain_tilt: float = 0.9) -> np.ndarray:
    """Raised-cosine attack, gently sloping sustain, raised-cosine release."""
    a = min(n // 2, int(attack * sr))
    r = min(n - a, int(release * sr))
    s = n - a - r
    parts = [0.5 - 0.5 * np.cos(np.linspace(0, np.pi, a, endpoint=False)) if a else np.zeros(0),
             np.linspace(1.0, sustain_tilt, s) if s > 0 else np.zeros(0),
             sustain_tilt * (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, r))) if r else np.zeros(0)]
    return np.concatenate(parts)[:n]


def render_pad(out: np.ndarray, chords: list[str], bar: float, resolve_bar: int, duration: float,
               rng) -> None:
    """Add the pad into ``out`` (n, 2). Chord changes cross-fade via long envelopes."""
    n_total = len(out)
    att, rel = 0.9, 1.5
    b = 0
    while b < len(chords) and b * bar < duration:
        name = chords[b]
        # the resolve chord is one long held note to the end
        b_end = len(chords) if b >= resolve_bar else b + 1
        t0 = max(0.0, b * bar - 0.25)
        t1 = min(duration + rel, b_end * bar + rel)
        i0, i1 = int(t0 * SR), min(n_total, int(t1 * SR))
        n = i1 - i0
        if n <= 0:
            break
        t = np.arange(n) / SR
        env = env_adsr(n, SR, att if b else 1.6, rel, 0.88 if b_end - b == 1 else 0.8)
        voicing = CHORDS[name][0]
        for ch, detunes in enumerate(((-7.0, 0.0, 5.0), (-5.0, 0.0, 7.0))):
            acc = np.zeros(n)
            for vi, m in enumerate(voicing):
                f = mtof(m)
                vgain = 1.0 / (1 + 0.15 * vi)          # upper voices a little softer
                for dc in detunes:
                    ff = f * 2 ** (dc / 1200)
                    ph = 2 * np.pi * ff * t + rng.uniform(0, 2 * np.pi)
                    acc += vgain * (np.sin(ph) + 0.16 * np.sin(2 * ph) + 0.05 * np.sin(3 * ph))
            out[i0:i1, ch] += acc * env
        b = b_end


def pluck_note(f: float, vel: float, sr: int, rng, length: float = 2.2) -> np.ndarray:
    """Soft felt-piano-ish pluck: sine partials with faster-decaying highs."""
    n = int(length * sr)
    t = np.arange(n) / sr
    x = np.zeros(n)
    amps = [1.0, 0.42, 0.2, 0.1, 0.05, 0.025]
    bright = 0.6 + 0.4 * vel
    for k, a in enumerate(amps, start=1):
        fk = k * f * math.sqrt(1 + 0.00025 * k * k)      # slight inharmonicity
        if fk > sr / 2 * 0.8:
            break
        tau = 0.95 / k ** 0.75
        x += (a * bright ** (k - 1)) * np.exp(-t / tau) * np.sin(2 * np.pi * fk * t + rng.uniform(0, 6.28))
    # felt "thump": a few ms of low-passed noise
    m = int(0.012 * sr)
    thump = _dsp.butter(rng.standard_normal(m), "lowpass", 900, sr) * np.hanning(m) * 0.08
    x[:m] += thump
    a = int(0.006 * sr)
    x[:a] *= 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, a))          # soft attack
    r = int(0.3 * sr)
    x[-r:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, r))          # no truncation click
    return x * vel


def place(out: np.ndarray, x: np.ndarray, t: float, gain_l: float, gain_r: float) -> None:
    i0 = int(round(t * SR))
    if i0 >= len(out):
        return
    i1 = min(len(out), i0 + len(x))
    out[i0:i1, 0] += x[: i1 - i0] * gain_l
    out[i0:i1, 1] += x[: i1 - i0] * gain_r


def pan_gains(p: float) -> tuple[float, float]:
    """Constant-power pan, p in [-1, 1]."""
    a = (p + 1) * np.pi / 4
    return math.cos(a), math.sin(a)


def render_plucks(out, chords, bar, resolve_bar, density, curve_at, times, duration, rng) -> None:
    eighth = bar / 8
    motif = [0, 2, 1, 3, 2, 4, 1, 2]
    step = 0
    for b, name in enumerate(chords):
        if b >= resolve_bar:
            break
        pool = CHORDS[name][2]
        for slot in PATTERNS[density(b * bar + 0.01)]:
            t = b * bar + slot * eighth + rng.normal(0, 0.004)
            if t >= duration - 3:
                continue
            idx = motif[step % len(motif)]
            if rng.random() < 0.2:
                idx = int(rng.integers(0, len(pool)))
            step += 1
            vel = (0.78 if slot == 0 else 0.62) * rng.uniform(0.9, 1.05) * curve_at("pluck", t)
            gl, gr = pan_gains(rng.uniform(-0.3, 0.3))
            place(out, pluck_note(mtof(pool[idx]), vel, SR, rng), max(0.0, t), gl, gr)
    # Resolve: a slow, soft Dmaj9 arpeggio on the logo, one high note on the tagline.
    r = resolve_bar * bar
    for k, (dt, m, v) in enumerate([(0.0, 62, 0.7), (eighth * 1.1, 69, 0.55), (eighth * 2.2, 73, 0.5),
                                    (eighth * 3.3, 76, 0.45), (eighth * 5.0, 78, 0.35)]):
        if r + dt < duration - 1.0:
            gl, gr = pan_gains(-0.2 + 0.1 * k)
            place(out, pluck_note(mtof(m), v, SR, rng, 3.0), r + dt, gl, gr)
    tg = max(times["tagline"], r + 2 * eighth * 4)
    if tg < duration - 2.5:
        place(out, pluck_note(mtof(81), 0.3, SR, rng, 3.0), tg, *pan_gains(0.15))


def render_sub(out, chords, bar, duration, curve) -> None:
    n = len(out)
    x = np.zeros(n)
    b = 0
    while b < len(chords) and b * bar < duration:
        b_end = b + 1
        while b_end < len(chords) and chords[b_end] == chords[b]:
            b_end += 1
        t0, t1 = b * bar, min(duration + 0.6, b_end * bar + 0.6)
        i0, i1 = int(t0 * SR), min(n, int(t1 * SR))
        t = np.arange(i1 - i0) / SR
        f = mtof(CHORDS[chords[b]][1] + 12)   # D2 / B1 / G1 / A1 register
        tone = np.sin(2 * np.pi * f * t) + 0.12 * np.sin(4 * np.pi * f * t)
        # a slight swell on every bar keeps a subtle pulse without "pumping"
        pulse = 0.88 + 0.12 * np.cos(2 * np.pi * (t % bar) / bar)
        x[i0:i1] += tone * pulse * env_adsr(i1 - i0, SR, 0.25, 0.6, 0.95)
        b = b_end
    x *= curve
    out += x[:, None]


def render_shaker(out, bar, duration, curve_at, rng) -> None:
    sixteenth = bar / 16
    m = int(0.06 * SR)
    t = np.arange(m) / SR
    k = 0
    tt = 0.0
    while tt < duration:
        g = curve_at("shaker", tt)
        if g > 0.01:
            accent = 1.0 if k % 4 == 2 else (0.5 if k % 4 == 0 else (0.22 if rng.random() < 0.5 else 0.0))
            if accent:
                noise = _dsp.butter(rng.standard_normal(m), "bandpass", [5200, 11500], SR, order=2)
                e = (1 - np.exp(-t / 0.0015)) * np.exp(-t / (0.018 if accent < 1 else 0.026))
                hit = noise * e * accent * g * rng.uniform(0.85, 1.0)
                gl, gr = pan_gains(0.35 if k % 8 < 4 else 0.2)
                place(out, hit, tt + rng.normal(0, 0.003), gl, gr)
        k += 1
        tt = k * sixteenth


def reverb_ir(sr: int, rng, rt60: float = 1.7, length: float = 2.4) -> np.ndarray:
    """Stereo decaying-noise IR with darker tail and a few early reflections."""
    n = int(length * sr)
    t = np.arange(n) / sr
    ir = np.zeros((n, 2))
    pre = int(0.018 * sr)
    for ch in range(2):
        noise = rng.standard_normal(n)
        low = _dsp.butter(noise, "lowpass", 3800, sr) * np.exp(-6.91 * t / rt60)
        high = _dsp.butter(noise, "highpass", 3800, sr) * np.exp(-6.91 * t / (rt60 * 0.45))
        tail = (low + 0.5 * high) * (1 - np.exp(-t / 0.03))      # soft onset of the tail
        ir[pre:, ch] = tail[: n - pre]
        for d, a in ((0.011, 0.5), (0.019, 0.35), (0.029, 0.28), (0.041, 0.2)):
            j = int((d + 0.003 * ch) * sr)
            ir[j, ch] += a * (1 if (j + ch) % 2 else -1)
    ir /= np.sqrt(np.sum(ir ** 2, axis=0, keepdims=True))
    fade_n = int(0.2 * sr)
    ir[-fade_n:] *= np.linspace(1, 0, fade_n)[:, None]
    return ir


def convolve_stereo(x: np.ndarray, ir: np.ndarray) -> np.ndarray:
    return np.stack([signal.fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)


# ------------------------------------------------------------------ main render
def render(duration: float, timing: dict | None, seed: int = 10, bpm: float = 92.0,
           fit_tempo: bool = True, target_lufs: float = -20.0, verbose: bool = True,
           stems: dict | None = None) -> np.ndarray:
    """Render the bed. If ``stems`` is a dict it receives the pre-master layers."""
    rng = np.random.default_rng(seed)
    times = section_times(duration, timing)
    bpm, bar, chords, resolve_bar, ct, curves, density = build_arrangement(duration, times, bpm, fit_tempo)
    n = int(round(duration * SR))
    ta = np.arange(n) / SR

    def curve_at(name: str, t: float) -> float:
        return float(np.interp(t, ct, curves[name]))

    def curve_audio(name: str) -> np.ndarray:
        return np.interp(ta, ct, curves[name])

    if verbose:
        print(f"tempo {bpm:.2f} BPM (bar {bar:.3f}s); resolve to Dmaj9 at bar {resolve_bar} "
              f"= {resolve_bar * bar:.2f}s")
        print("sections: " + ", ".join(f"{k} {v:.2f}s" for k, v in times.items()))
        print("chords: " + " ".join(c.replace("maj", "M") for c in chords[: int(duration / bar) + 1]))

    # --- pad (stereo, decorrelated sides + short Haas blend for width)
    pad = np.zeros((n, 2))
    render_pad(pad, chords, bar, resolve_bar, duration, rng)
    pad = _dsp.butter(pad, "lowpass", 2000, SR, order=2)
    pad = _dsp.butter(pad, "highpass", 110, SR, order=2)
    haas = int(0.011 * SR)
    pad[haas:, 0] += 0.22 * pad[:-haas, 1]
    pad[haas:, 1] += 0.22 * pad[:-haas, 0]
    mid, side = pad.mean(axis=1), (pad[:, 0] - pad[:, 1]) / 2
    pad = np.stack([mid + PAD_WIDTH * side, mid - PAD_WIDTH * side], axis=1)   # subtle, mono-safe width
    lfo = 1 + 0.08 * np.sin(2 * np.pi * 0.071 * ta)              # slow breathing
    pad *= (lfo * curve_audio("pad"))[:, None]
    pad /= np.sqrt(np.mean(pad ** 2)) + 1e-12                    # unit RMS reference

    # --- pluck
    pl = np.zeros((n, 2))
    render_plucks(pl, chords, bar, resolve_bar, density, curve_at, times, duration, rng)
    pl = _dsp.butter(pl, "lowpass", 4200, SR, order=2)

    # --- sub
    sub = np.zeros((n, 2))
    render_sub(sub, chords, bar, duration, curve_audio("sub"))
    sub = _dsp.butter(sub, "lowpass", 180, SR, order=2)

    # --- shaker
    sh = np.zeros((n, 2))
    render_shaker(sh, bar, duration, curve_at, rng)

    # --- levels (relative to unit-RMS pad) and reverb sends
    pad *= LEVELS["pad"]
    pl *= LEVELS["pluck"]
    sub *= LEVELS["sub"]
    sh *= LEVELS["shaker"]
    ir = reverb_ir(SR, rng)
    wet = LEVELS["reverb"] * convolve_stereo(0.28 * pad + 0.42 * pl + 0.25 * sh, ir)
    mix = pad + pl + sub + sh + wet
    if stems is not None:
        stems.update(pad=pad, pluck=pl, sub=sub, shaker=sh, reverb=wet)

    mix = _dsp.butter(mix, "highpass", 22, SR, order=2)          # DC / rumble
    mix -= mix.mean(axis=0, keepdims=True)
    mix = _dsp.fade(mix, SR, fade_in=0.08, fade_out=2.5)
    # loudness target, then make sure the peak ceiling holds
    mix *= _dsp.db2lin(target_lufs - _dsp.lufs(mix, SR))
    pk = _dsp.peak_db(mix)
    if pk > -3.0:
        mix *= _dsp.db2lin(-3.0 - pk)
        if verbose:
            print(f"peak ceiling: reduced by {pk + 3.0:.2f} dB")
    return mix


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--duration", type=float, default=58.0, help="length in seconds (default 58)")
    ap.add_argument("--out", default="audio/music_bed.wav", help="output WAV (relative to promo-video/)")
    ap.add_argument("--timing", help="narration timing JSON; aligns sections to phrase ids")
    ap.add_argument("--bpm", type=float, default=92.0, help="nominal tempo (default 92)")
    ap.add_argument("--no-tempo-fit", action="store_true",
                    help="keep the exact --bpm instead of landing a bar line on 'brand'")
    ap.add_argument("--lufs", type=float, default=-20.0, help="integrated loudness target (default -20)")
    ap.add_argument("--seed", type=int, default=10, help="random seed (phases, humanisation)")
    args = ap.parse_args(argv)

    timing = None
    if args.timing:
        tp = resolve_path(args.timing, must_exist=True)
        timing = json.loads(Path(tp).read_text(encoding="utf-8"))
        print(f"timing: {tp} (source={timing.get('source')})")
    mix = render(args.duration, timing, args.seed, args.bpm, not args.no_tempo_fit, args.lufs)
    out = resolve_path(args.out)
    _dsp.write_wav(out, mix, SR, bits=24)
    print(f"wrote {out}: {len(mix) / SR:.2f}s 48 kHz stereo 24-bit; {_dsp.loudness_report(mix)}; "
          f"DC {np.abs(mix.mean(axis=0)).max():.1e}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
