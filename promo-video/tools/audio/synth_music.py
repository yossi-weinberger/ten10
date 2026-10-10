#!/usr/bin/env python3
"""Procedural product-film score for the TEN10 promo.

A warm, modern, restrained bed in D major at ~95 BPM that follows the
narration's phrase ids. Everything is synthesised with numpy/scipy and is
fully deterministic for a given --seed. tools/audio/mix.py still accepts any
music file, so a licensed track can replace this at any time.

Instruments
  keys    FM electric piano (Rhodes-style: 1:1 body pair + 1:14 "tine" pair,
          velocity-dependent index/brightness, hammer thump, key-release
          noise, pitch-dependent decay), stereo chorus, dotted-8th delay
  piano   felt piano for the motif (inharmonic partials, double-decay,
          detuned unison strings, felt-hammer noise, damper release)
  pad     band-limited (polyBLEP) detuned saws with a slow, automated
          low-pass sweep and wide but mono-safe stereo
  strings light string/choir ensemble for the resolve (7 detuned saws per
          note, delayed vibrato, formant + low-pass blend)
  bass    round finger-style electric bass on the roots with passing notes
  drums   soft kick (sine sweep + click), soft snare with room, rim,
          swung closed hats / shaker with ghost notes, soft cymbal and a
          reverse swell into the logo; a gentle kick-keyed pump on pad/bass

Mix
  per-part EQ (high-pass everything but bass/kick, a 1-4 kHz dip so the voice
  sits on top), drum-bus and mix-bus compression, FDN plate reverb (rendered
  to an IR, FFT-convolved), drum room, tempo-synced ping-pong delay on the
  keys, master true-peak limiting. Output: 48 kHz stereo 24-bit, -20 LUFS
  integrated (default), peak <= -3 dBFS, DC-free.

Arrangement (phrase ids from --timing; proportional fallbacks otherwise)
  hook1..hook2        intro: keys + pad, piano hints
  complex1..complex2  slight tension: denser keys pulses, pad opens, bass
                      pedal, soft heartbeat kick, harmony leans on A7sus4
  order (+0.6 s)      arrival: bar line on the logo reveal, soft cymbal,
                      groove + motif start
  order..analytics    product section: full groove
  notjust..rabbi      calm: pad, sparse keys/piano, shaker + soft kick only
  platforms           the groove returns lightly
  together            full groove again; strings enter for the last 2 bars
  brand               bar line + tonic resolve (Dmaj9), strings swell
  tagline..free       warm outro, rings out; fade over the last 2.5 s
The tempo is fitted (two segments, each within +-6 % of --bpm) so bar lines
land exactly on the logo reveal (order + 0.6 s) and on "brand".

Example
  python3 tools/audio/synth_music.py --timing narration/timing.he.json --out audio/music_bed.he.wav
  (duration defaults to the timing's audioDuration + 4 s; 58 s without timing)
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from scipy import linalg, signal

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import _dsp  # noqa: E402
from _ffmpeg import resolve_path  # noqa: E402

SR = _dsp.SR
CTRL = 1000   # control-rate (Hz) for gain curves


def mtof(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


# ============================================================== harmony
# bass (MIDI), keys voicing (EP), pad voicing
CHORDS = {
    "Dmaj9":   dict(bass=38, keys=[50, 57, 61, 64, 66], pad=[62, 66, 69, 73]),
    "A/C#":    dict(bass=37, keys=[49, 57, 59, 64, 66], pad=[61, 64, 69, 71]),
    "Bm7":     dict(bass=35, keys=[47, 54, 57, 61, 62], pad=[61, 62, 66, 69]),
    "Gmaj9":   dict(bass=31, keys=[55, 59, 62, 66, 69], pad=[59, 62, 66, 69]),
    "A7sus4":  dict(bass=33, keys=[52, 55, 57, 62, 64], pad=[62, 64, 67, 69]),
    "Em9":     dict(bass=40, keys=[52, 55, 59, 62, 66], pad=[59, 62, 66, 67]),
    "Gmaj7":   dict(bass=31, keys=[55, 59, 62, 66], pad=[59, 62, 66, 67]),
    "F#m7":    dict(bass=42, keys=[54, 57, 61, 64], pad=[57, 61, 64, 66]),
    "Em7":     dict(bass=40, keys=[52, 55, 59, 62], pad=[59, 62, 64, 67]),
    "D/F#":    dict(bass=42, keys=[54, 57, 62, 64, 66], pad=[62, 66, 69, 74]),
    "Gmaj9/D": dict(bass=38, keys=[55, 59, 62, 66, 69], pad=[59, 62, 66, 69]),
}
SCALE_PC = {2, 4, 6, 7, 9, 11, 1}              # D major
PROG = ["Dmaj9", "A/C#", "Bm7", "Gmaj9"]         # groove: I - V6 - vi - IV
INTRO = ["Dmaj9", "Gmaj9"]
TENSION_BACK = ["A7sus4", "Em9", "Gmaj7", "Bm7", "F#m7", "Gmaj7", "Em9", "Bm7"]   # read backwards
CALM_BACK = ["A7sus4", "Em7", "D/F#", "Gmaj7", "Em7", "Bm7", "D/F#", "Gmaj7"]   # read backwards
OUTRO = ["Dmaj9", "Dmaj9", "Gmaj9/D", "Dmaj9"]

# motif: per groove bar (4-bar phrase) -> [(16th slot, MIDI, length in 16ths, velocity)]
MOTIF = [
    [(0, 81, 5, 0.70), (6, 78, 2, 0.55), (8, 76, 7, 0.60)],
    [(0, 76, 5, 0.62), (6, 73, 2, 0.50), (8, 69, 7, 0.55)],
    [(0, 78, 5, 0.66), (6, 74, 2, 0.52), (8, 73, 7, 0.56)],
    [(0, 74, 6, 0.60), (8, 71, 3, 0.50), (12, 69, 4, 0.48)],
]
MOTIF_ANSWER = [(0, 76, 6, 0.55), (8, 78, 8, 0.58)]   # replaces bar 4 on repeats

# keys comping patterns: (16th slot, length in 16ths, velocity)
KEYS_PAT = {
    "intro":   [(0, 16, 0.50)],
    "groove":  [(0, 6, 0.72), (6, 2, 0.52), (10, 4, 0.62), (14, 2, 0.46)],
    "return":  [(0, 8, 0.62), (10, 6, 0.52)],
    "calm":    [(0, 16, 0.46)],
    "outro":   [(0, 16, 0.52)],
}

# levels of each bus (relative; the master is loudness-normalised afterwards)
LEVELS = {"keys": 0.50, "piano": 0.80, "pad": 0.16, "strings": 0.06, "bass": 0.55, "drums": 1.0,
          "plate": 0.30, "delay": 0.6}


# ============================================================== grid + plan
@dataclass
class Bar:
    start: float
    length: float
    section: str = ""
    chord: str = "Dmaj9"
    idx: int = 0          # bar index within its section
    n_in: int = 1         # bars in its section
    groove_i: int = 0     # index in the groove progression / motif phrase


def key_times(duration: float, timing: dict | None) -> dict:
    """Arrangement anchor times (s)."""
    frac = dict(complex1=0.065, order=0.205, analytics_end=0.53, notjust=0.545, platforms=0.71,
                together=0.80, brand=0.845, tagline=0.865, free=0.925)
    T = {k: duration * v for k, v in frac.items()}
    if timing:
        ph = {p["id"]: p for p in timing["phrases"]}
        for k, pid, fld in (("complex1", "complex1", "start"), ("order", "order", "start"),
                            ("analytics_end", "analytics", "end"), ("notjust", "notjust", "start"),
                            ("platforms", "platforms", "start"), ("together", "together", "start"),
                            ("brand", "brand", "start"), ("tagline", "tagline", "start"),
                            ("free", "free", "start")):
            if pid in ph:
                T[k] = float(ph[pid][fld])
        if "analytics" not in ph and "reminders" in ph:          # older scripts
            T["analytics_end"] = float(ph["reminders"]["end"])
    T["accent"] = T["order"] + 0.6          # logo reveal
    return T


def fit_bars(t0: float, t1: float, bar_nom: float, max_dev: float = 0.06) -> tuple[int, float] | None:
    n = max(1, round((t1 - t0) / bar_nom))
    best = None
    for k in (n - 1, n, n + 1):
        if k < 1:
            continue
        L = (t1 - t0) / k
        dev = abs(math.log(L / bar_nom))
        if dev <= max_dev and (best is None or dev < best[0]):
            best = (dev, k, L)
    return (best[1], best[2]) if best else None


def build_grid(duration: float, T: dict, bpm: float, fit: bool) -> tuple[list[Bar], int, int]:
    """Bars covering the duration; returns (bars, accent_bar, brand_bar)."""
    bar_nom = 240.0 / bpm
    segs: list[tuple[int, float]] = []
    a = fit_bars(0.0, T["accent"], bar_nom) if fit and T["accent"] > 2 * bar_nom else None
    b = fit_bars(T["accent"], T["brand"], bar_nom) if a else None
    if a and b:
        segs = [a, b]
    elif fit and (c := fit_bars(0.0, T["brand"], bar_nom)):
        segs = [c]
    else:
        segs = [(max(1, round(T["brand"] / bar_nom)), bar_nom)]
    bars: list[Bar] = []
    t = 0.0
    for n, L in segs:
        for _ in range(n):
            bars.append(Bar(t, L))
            t += L
    brand_bar = len(bars)
    L = segs[-1][1]
    while t < duration + L:
        bars.append(Bar(t, L))
        t += L
    accent_bar = segs[0][0] if len(segs) == 2 else min(
        range(brand_bar), key=lambda i: abs(bars[i].start - T["accent"]))
    return bars, accent_bar, brand_bar


def plan(bars: list[Bar], T: dict, accent_bar: int, brand_bar: int) -> None:
    """Assign section + chord to every bar."""
    calm_from = 0.5 * (T["analytics_end"] + T["notjust"])
    for i, b in enumerate(bars):
        tm = b.start + 0.35 * b.length
        if i >= brand_bar:
            b.section = "outro"
        elif i >= brand_bar - 2:
            b.section = "prebrand"
        elif i < accent_bar:
            b.section = "intro" if tm < T["complex1"] else "tension"
        elif tm < calm_from:
            b.section = "groove"
        elif tm < T["platforms"] - 0.3:
            b.section = "calm"
        elif tm < T["together"] - 0.3:
            b.section = "return"
        else:
            b.section = "together"
    # section-relative indices
    i = 0
    while i < len(bars):
        j = i
        while j < len(bars) and bars[j].section == bars[i].section:
            j += 1
        for k in range(i, j):
            bars[k].idx, bars[k].n_in = k - i, j - i
        i = j
    # chords
    g_run = 0
    for i, b in enumerate(bars):
        s = b.section
        if s == "intro":
            b.chord = INTRO[b.idx % 2]
        elif s == "tension":
            b.chord = TENSION_BACK[(b.n_in - 1 - b.idx) % len(TENSION_BACK)]
        elif s == "calm":
            b.chord = CALM_BACK[(b.n_in - 1 - b.idx) % len(CALM_BACK)]
        elif s == "outro":
            b.chord = OUTRO[b.idx] if b.idx < len(OUTRO) else "Dmaj9"
        elif s == "prebrand":
            b.chord = ["Gmaj9", "A7sus4"][b.idx if b.n_in == 2 else 1]
        if s in ("groove", "return") and b.idx == 0:
            g_run = 0
        if s in ("groove", "return", "together"):
            b.groove_i = g_run
            b.chord = PROG[g_run % 4]
            g_run += 1


# ============================================================== small DSP helpers
def env_attack(n: int, a: int) -> np.ndarray:
    e = np.ones(n)
    a = min(a, n)
    if a > 0:
        e[:a] = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, a, endpoint=False))
    return e


def release_after(t: np.ndarray, t_off: float, tau: float) -> np.ndarray:
    """1 before t_off, exponential release afterwards (continuous, so no click)."""
    return np.exp(-np.maximum(t - t_off, 0.0) / tau)


def pan_gains(p: float) -> tuple[float, float]:
    a = (np.clip(p, -1, 1) + 1) * math.pi / 4
    return math.cos(a) * math.sqrt(2), math.sin(a) * math.sqrt(2)


_TAIL = 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, int(0.008 * SR)))


def place(buf: np.ndarray, x: np.ndarray, t: float, pan: float = 0.0, gain: float = 1.0) -> None:
    """Mix a mono event into a stereo bus at time t (never before 0), with a
    short cosine tail fade so truncated decays can never click."""
    if len(x) > 2 * len(_TAIL):
        x = x.copy()
        x[-len(_TAIL):] *= _TAIL
    i0 = int(round(max(0.0, t) * SR))
    if i0 >= len(buf) or i0 + len(x) <= 0:
        return
    s0 = max(0, -i0)
    i0 = max(0, i0)
    m = min(len(x) - s0, len(buf) - i0)
    gl, gr = pan_gains(pan)
    buf[i0:i0 + m, 0] += x[s0:s0 + m] * gain * gl
    buf[i0:i0 + m, 1] += x[s0:s0 + m] * gain * gr


def rbj(kind: str, f0: float, q: float = 0.707, gain_db: float = 0.0, fs: int = SR):
    """RBJ-cookbook biquad as an SOS row."""
    A = 10 ** (gain_db / 40)
    w0 = 2 * math.pi * min(f0, fs * 0.45) / fs
    al = math.sin(w0) / (2 * q)
    c = math.cos(w0)
    if kind == "lp":
        b = [(1 - c) / 2, 1 - c, (1 - c) / 2]
        a = [1 + al, -2 * c, 1 - al]
    elif kind == "hp":
        b = [(1 + c) / 2, -(1 + c), (1 + c) / 2]
        a = [1 + al, -2 * c, 1 - al]
    elif kind == "peak":
        b = [1 + al * A, -2 * c, 1 - al * A]
        a = [1 + al / A, -2 * c, 1 - al / A]
    elif kind == "bp":
        b = [al, 0, -al]
        a = [1 + al, -2 * c, 1 - al]
    else:
        raise ValueError(kind)
    return np.array([[b[0] / a[0], b[1] / a[0], b[2] / a[0], 1.0, a[1] / a[0], a[2] / a[0]]])


def eq(x: np.ndarray, *stages) -> np.ndarray:
    """Apply a chain of (kind, f0, q, gain_db) RBJ stages along axis 0."""
    sos = np.vstack([rbj(*s) for s in stages])
    return signal.sosfilt(sos, x, axis=0)


def swept_lowpass(x: np.ndarray, cutoff: np.ndarray, q: float = 0.8, block: int = 256) -> np.ndarray:
    """Time-varying 2nd-order low-pass (coefficients updated per block, state carried)."""
    y = np.empty_like(x)
    zi = np.zeros((1, 2, x.shape[1]))
    for s in range(0, len(x), block):
        sos = rbj("lp", float(cutoff[min(s + block // 2, len(cutoff) - 1)]), q)
        y[s:s + block], zi = signal.sosfilt(sos, x[s:s + block], axis=0, zi=zi)
    return y


def blep_saw(freq: np.ndarray | float, n: int, phase0: float) -> np.ndarray:
    """Band-limited sawtooth (polyBLEP); ``freq`` may be an array (Hz per sample)."""
    dt = np.broadcast_to(np.asarray(freq, dtype=np.float64) / SR, (n,))
    ph = (phase0 + np.cumsum(dt) - dt[0]) % 1.0
    y = 2.0 * ph - 1.0
    m = ph < dt
    t = ph[m] / dt[m]
    y[m] -= t + t - t * t - 1.0
    m = ph > 1.0 - dt
    t = (ph[m] - 1.0) / dt[m]
    y[m] -= t * t + t + t + 1.0
    return y


def smooth_curve(t: np.ndarray, keys: list[tuple[float, float]], smooth: float = 0.8) -> np.ndarray:
    kt, kv = zip(*sorted(keys))
    y = np.interp(t, kt, kv)
    dt = t[1] - t[0]
    n = max(3, int(smooth / dt) | 1)
    w = np.hanning(n)
    w /= w.sum()
    return np.convolve(np.pad(y, n, mode="edge"), w, mode="same")[n:-n]


def fractional_delay(x: np.ndarray, delay_samples: np.ndarray) -> np.ndarray:
    idx = np.arange(len(x)) - delay_samples
    return np.interp(idx, np.arange(len(x)), x, left=0.0)


# ============================================================== instruments
def ep_note(f: float, vel: float, hold: float, rng) -> np.ndarray:
    """FM electric piano note (mono)."""
    tail = 0.9 + 2.2 * (220.0 / f) ** 0.6
    rel = 0.16
    n = int((min(hold, 3 * tail) + 5 * rel) * SR)
    t = np.arange(n) / SR
    pm = rng.uniform(0, 2 * np.pi)
    idx = (0.35 + 1.9 * vel ** 1.4) * np.exp(-t / 0.3) + 0.28        # body brightness
    body = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t + pm))
    tr = 14.0 if f * 15 < 17000 else 7.0
    tine_idx = (0.6 + 1.2 * vel) * np.exp(-t / 0.016)
    tine = np.sin(2 * np.pi * f * t + tine_idx * np.sin(2 * np.pi * tr * f * t))
    amp = 0.55 * np.exp(-t / 0.45) + 0.45 * np.exp(-t / tail)
    x = amp * (body + 0.32 * tine * np.exp(-t / 0.35))
    # hammer thump + key-release noise
    m = int(0.006 * SR)
    x[:m] += signal.lfilter([0.05], [1, -0.95], rng.standard_normal(m)) * np.hanning(m) * 0.25 * vel
    x *= env_attack(n, int(0.0015 * SR)) * release_after(t, hold, rel)
    k0 = int(hold * SR)
    if k0 < n - 1:
        m = min(int(0.025 * SR), n - k0)
        nz = eq(rng.standard_normal(m), ("bp", 900, 1.2, 0))
        x[k0:k0 + m] += nz * np.hanning(m) * 0.006 * (0.5 + vel)
    return x * vel


def piano_note(f: float, vel: float, hold: float, rng) -> np.ndarray:
    """Felt-piano note: inharmonic, double-decaying partials, unison beating."""
    T0 = 2.6 * (261.6 / f) ** 0.45
    rel = 0.22
    n = int((min(hold, 2.5 * T0) + 4 * rel) * SR)
    t = np.arange(n) / SR
    B = 0.00035 * (f / 261.6) ** 0.5
    bright = 0.28 + 0.42 * vel
    x = np.zeros(n)
    for k in range(1, 9):
        fk = k * f * math.sqrt(1 + B * k * k)
        if fk > 15000:
            break
        ak = bright ** (k - 1) / k ** 0.9
        tau = T0 / (1 + 0.7 * (k - 1))
        env = 0.62 * np.exp(-t / (0.22 * tau)) + 0.38 * np.exp(-t / tau)
        if k <= 3:
            d = 0.0006 * rng.uniform(0.6, 1.2)
            osc = 0.5 * (np.sin(2 * np.pi * fk * (1 + d) * t + rng.uniform(0, 6.3))
                         + np.sin(2 * np.pi * fk * (1 - d) * t + rng.uniform(0, 6.3)))
        else:
            osc = np.sin(2 * np.pi * fk * t + rng.uniform(0, 6.3))
        x += ak * env * osc
    m = int(0.012 * SR)
    ham = eq(rng.standard_normal(m), ("lp", 900 + 2200 * vel, 0.7, 0)) * np.hanning(m)
    x[:m] += ham * 0.12 * vel
    x *= env_attack(n, int(0.003 * SR)) * release_after(t, hold, rel)
    return x * vel


def bass_note(f: float, vel: float, hold: float, rng) -> np.ndarray:
    rel = 0.07
    n = int((hold + 6 * rel) * SR)
    t = np.arange(n) / SR
    ph = 2 * np.pi * f * t + rng.uniform(0, 6.3)
    x = np.sin(ph) + 0.28 * np.sin(2 * ph) + 0.09 * np.sin(3 * ph) + 0.14 * np.exp(-t / 0.035) * np.sin(4 * ph)
    x = np.tanh(1.3 * x) / np.tanh(1.3)
    amp = (0.72 + 0.28 * np.exp(-t / 0.12)) * np.exp(-t / 2.2)
    m = int(0.006 * SR)
    x[:m] += eq(rng.standard_normal(m), ("lp", 1200, 0.7, 0)) * np.hanning(m) * 0.15
    return x * amp * env_attack(n, int(0.004 * SR)) * release_after(t, hold, rel) * vel


def kick(vel: float, rng, soft: bool = False) -> np.ndarray:
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    f = 46 + 70 * np.exp(-t / 0.032)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.20 if not soft else 0.14))
    click = eq(rng.standard_normal(n), ("hp", 1800, 0.7, 0), ("lp", 7000, 0.7, 0)) * np.exp(-t / 0.0025)
    x = body + (0.10 if not soft else 0.03) * click + 0.05 * np.sin(2 * np.pi * 1600 * t) * np.exp(-t / 0.004)
    return x * env_attack(n, int(0.0008 * SR)) * vel


def snare(vel: float, rng) -> np.ndarray:
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 185 + 25 * np.exp(-t / 0.02)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.07)
    nz = eq(rng.standard_normal(n), ("bp", 3200, 0.6, 0), ("lp", 8000, 0.7, 0)) * np.exp(-t / 0.11)
    return (0.55 * body + 0.9 * nz) * env_attack(n, int(0.001 * SR)) * vel


def rim(vel: float, rng) -> np.ndarray:
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    x = 0.6 * np.sin(2 * np.pi * 1650 * t) * np.exp(-t / 0.010) + 0.5 * np.sin(2 * np.pi * 520 * t) * np.exp(-t / 0.025)
    x += 0.3 * eq(rng.standard_normal(n), ("bp", 2500, 1.0, 0)) * np.exp(-t / 0.008)
    return x * env_attack(n, int(0.0005 * SR)) * vel


def hat(vel: float, rng, open_: bool = False) -> np.ndarray:
    n = int((0.35 if open_ else 0.09) * SR)
    t = np.arange(n) / SR
    tau = 0.12 if open_ else 0.022
    nz = eq(rng.standard_normal(n), ("hp", 7500, 0.7, 0), ("peak", 10500, 1.0, 4.0), ("lp", 15000, 0.7, 0))
    metal = sum(np.sin(2 * np.pi * fr * t + rng.uniform(0, 6.3)) for fr in (3210, 4630, 6090, 8340, 9870)) / 5
    return (nz + 0.25 * metal) * np.exp(-t / tau) * env_attack(n, int(0.0008 * SR)) * vel


def shaker(vel: float, rng) -> np.ndarray:
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    nz = eq(rng.standard_normal(n), ("bp", 6500, 0.9, 0))
    e = (1 - np.exp(-t / 0.006)) * np.exp(-t / 0.03)
    return nz * e * vel


def cymbal(vel: float, rng) -> np.ndarray:
    n = int(2.6 * SR)
    t = np.arange(n) / SR
    nz = eq(rng.standard_normal(n), ("hp", 4200, 0.7, 0), ("lp", 12000, 0.7, 0))
    metal = sum(np.sin(2 * np.pi * fr * t + rng.uniform(0, 6.3)) for fr in (3920, 5310, 6770, 8120)) / 4
    x = (nz + 0.2 * metal) * np.exp(-t / 0.9)
    return x * env_attack(n, int(0.006 * SR)) * _dsp.fade(np.ones(n), SR, fade_out=0.5) * vel


def reverse_swell(length: float, rng) -> np.ndarray:
    n = int(length * SR)
    t = np.arange(n) / SR
    nz = eq(rng.standard_normal(n), ("hp", 2500, 0.7, 0), ("lp", 10000, 0.7, 0))
    e = (t / length) ** 2.5
    x = nz * e
    x[-int(0.004 * SR):] *= np.linspace(1, 0, int(0.004 * SR))
    return x


# ============================================================== effects
def fdn_ir(rt60: float, length: float, rng, damp_hz: float = 5500.0, scale: float = 1.0,
           predelay: float = 0.018) -> np.ndarray:
    """Stereo impulse response of an 8-line feedback delay network (plate-like).

    Diffused input (4 Schroeder allpasses) -> 8 delay lines mixed by a
    Hadamard matrix, per-line RT60 gains and one-pole damping in the loop.
    Rendered block-wise (block < shortest delay) so it is fast in numpy.
    """
    delays = [int(ms * scale * SR / 1000) for ms in (31.7, 37.3, 41.9, 47.3, 53.1, 59.3, 67.1, 73.9)]
    N, B = 8, 256
    n = int(length * SR)
    H = linalg.hadamard(N) / math.sqrt(N)
    g = np.array([10 ** (-3 * d / (rt60 * SR)) for d in delays])
    # diffused excitation
    x = np.zeros(n)
    x[0] = 1.0
    for d_ms, ga in ((4.7, 0.7), (3.6, 0.7), (12.7, 0.6), (9.3, 0.6)):
        d = int(d_ms * scale * SR / 1000)
        b = np.zeros(d + 1)
        a = np.zeros(d + 1)
        b[0], b[-1] = -ga, 1.0
        a[0], a[-1] = 1.0, -ga
        x = signal.lfilter(b, a, x)
    ins = np.stack([x * s for s in (1, -1, 1, 1, -1, 1, -1, -1)])
    maxd = max(delays)
    w = np.zeros((N, n + maxd))       # written signal, offset by maxd
    out = np.zeros((N, n))
    c = math.exp(-2 * math.pi * damp_hz / SR)
    zi = [np.zeros(1) for _ in range(N)]
    for s in range(0, n, B):
        e = min(n, s + B)
        o = np.stack([w[i, maxd + s - delays[i]: maxd + e - delays[i]] for i in range(N)])
        out[:, s:e] = o
        fb = H @ o
        for i in range(N):
            damped, zi[i] = signal.lfilter([1 - c], [1, -c], fb[i], zi=zi[i])
            w[i, maxd + s:maxd + e] = ins[i, s:e] + g[i] * damped
    sl = np.array([1, 1, -1, 1, -1, 1, 1, -1])
    sr_ = np.array([1, -1, 1, 1, 1, -1, 1, -1])
    ir = np.stack([sl @ out, sr_ @ out], axis=1)
    pre = int(predelay * SR)
    ir = np.concatenate([np.zeros((pre, 2)), ir])[:n]
    ir = eq(ir, ("hp", 180, 0.7, 0), ("lp", 9000, 0.7, 0))
    ir *= np.linspace(1, 0, n)[:, None] ** 0.3          # tidy tail end
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def convolve(x: np.ndarray, ir: np.ndarray) -> np.ndarray:
    return np.stack([signal.fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)


def chorus(x: np.ndarray, rate: float = 0.33, depth_ms: float = 1.6, base_ms: float = 7.0,
           mix: float = 0.38) -> np.ndarray:
    t = np.arange(len(x)) / SR
    y = np.empty_like(x)
    for c, ph in ((0, 0.0), (1, math.pi / 2)):
        d = (base_ms + depth_ms * np.sin(2 * math.pi * rate * t + ph)) * SR / 1000
        wet = fractional_delay(x[:, 1 - c], d)       # cross-fed for width
        y[:, c] = x[:, c] + mix * wet
    return y / (1 + mix * 0.5)


def pingpong(x: np.ndarray, delay: float, feedback: float = 0.38, taps: int = 6) -> np.ndarray:
    """Tempo-synced ping-pong delay (taps alternate L/R, each darker)."""
    send = eq(x.mean(axis=1), ("hp", 350, 0.7, 0), ("lp", 4200, 0.7, 0))
    out = np.zeros_like(x)
    d = int(delay * SR)
    y = send
    for k in range(1, taps + 1):
        y = eq(y, ("lp", 3800 - 350 * k, 0.7, 0))
        s = k * d
        if s >= len(x):
            break
        out[s:, (k + 1) % 2] += y[:-s] * feedback ** (k - 1)
    return out


def compressor(x: np.ndarray, ratio: float, attack: float, release: float, thr_pct: float = 85,
               knee: float = 6.0, thr_offset: float = 0.0) -> tuple[np.ndarray, float]:
    """Feed-forward RMS compressor; threshold = percentile of the active level."""
    mono2 = (x ** 2).mean(axis=1)
    hop = SR // CTRL
    n = len(mono2) // hop
    lv = 10 * np.log10(ndimage_uniform(mono2[: n * hop].reshape(n, hop).mean(axis=1), 10) + 1e-12)
    active = lv[lv > lv.max() - 45]
    thr = float(np.percentile(active, thr_pct)) + thr_offset if len(active) else 0.0
    over = lv - thr
    gr = np.where(over <= -knee / 2, 0.0,
                  np.where(over >= knee / 2, over * (1 / ratio - 1),
                           (1 / ratio - 1) * (over + knee / 2) ** 2 / (2 * knee)))
    g_db = _dsp.one_pole_ar(gr, CTRL, attack, release, start=0.0)
    g = np.interp(np.arange(len(x)), (np.arange(n) + 0.5) * hop, 10 ** (g_db / 20))
    return x * g[:, None], float(-g_db.min())


def ndimage_uniform(v: np.ndarray, size: int) -> np.ndarray:
    k = np.ones(size) / size
    return np.convolve(np.pad(v, (size // 2, size - 1 - size // 2), mode="edge"), k, mode="valid")


def pump_curve(kick_times: list[tuple[float, float]], n: int, depth_db: float) -> np.ndarray:
    """Kick-keyed gain dip (fast 6 ms dip, ~150 ms recovery), audio rate."""
    nc = n // (SR // CTRL) + 2
    imp = np.zeros(nc)
    for t, v in kick_times:
        i = int(t * CTRL)
        if 0 <= i < nc:
            imp[i] = max(imp[i], v)
    k_t = np.arange(int(0.5 * CTRL)) / CTRL
    kern = np.minimum(1.0, k_t / 0.006) * np.exp(-np.maximum(k_t - 0.006, 0) / 0.15)
    dip = np.minimum(1.0, np.convolve(imp, kern)[:nc])
    g = 10 ** (-depth_db * dip / 20)
    return np.interp(np.arange(n), np.arange(nc) * (SR // CTRL), g)


# ============================================================== sequencing
def bar_time(b: Bar, slot: float, swing: float = 0.5) -> float:
    """Time of a 16th slot inside a bar; odd 16ths are delayed by the swing."""
    six = b.length / 16
    t = b.start + slot * six
    if int(slot) % 2 == 1 and abs(slot - int(slot)) < 1e-9:
        t += (swing - 0.5) * 2 * six
    return t


def human(rng, sd: float, lim: float) -> float:
    return float(np.clip(rng.normal(0, sd), -lim, lim))


def next_root(bars: list[Bar], i: int) -> int:
    return CHORDS[bars[min(i + 1, len(bars) - 1)].chord]["bass"]


def passing_note(cur: int, nxt: int) -> int:
    for cand in (nxt - 2, nxt + 2, nxt - 1, nxt + 1):
        if cand % 12 in SCALE_PC and cand != cur:
            return cand
    return cur + 7


def sequence(bars: list[Bar], T: dict, accent_bar: int, brand_bar: int, duration: float, rng):
    keys, piano, bass, drums, fx = [], [], [], [], []
    swing = 0.55
    for i, b in enumerate(bars):
        if b.start >= duration:
            break
        s, ch = b.section, CHORDS[b.chord]
        six = b.length / 16
        prog = (b.idx + 0.5) / b.n_in
        # ---------------- keys
        if s == "tension":
            # density builds (quarters -> 8ths) but the level stays below the groove
            if prog < 0.5:
                pat = [(k, 4, 0.36 + 0.08 * prog) for k in (0, 4, 8, 12)]
            else:
                pat = [(k, 2, (0.36 if k % 4 == 0 else 0.27) + 0.06 * prog) for k in range(0, 16, 2)]
        elif s in ("groove", "together", "prebrand"):
            pat = KEYS_PAT["groove"]
        elif s == "outro":
            pat = KEYS_PAT["outro"] if b.idx < 4 else []
        else:
            pat = KEYS_PAT.get(s, KEYS_PAT["intro"])
        roll = 0.05 if s in ("intro", "calm", "outro") else 0.012
        for slot, ln, v in pat:
            t0 = bar_time(b, slot, swing) + human(rng, 0.005, 0.012)
            hold = ln * six * 0.92
            if s == "outro":
                hold = b.length * (1.6 if b.idx == len(OUTRO) - 1 else 1.0)
            for k, m in enumerate(ch["keys"]):
                keys.append((t0 + k * roll * rng.uniform(0.7, 1.2), hold, m, v * rng.uniform(0.9, 1.06)))
        # ---------------- piano (motif / hints)
        if s in ("groove", "together", "prebrand") or (s == "return" and b.groove_i >= 2):
            phrase = (b.groove_i // 4) % 3
            bar_m = b.groove_i % 4
            if s == "prebrand":
                notes = [(0, 74, 6, 0.5), (8, 76, 8, 0.55)] if b.idx == 0 else [(0, 73, 8, 0.5), (8, 76, 8, 0.45)]
            elif phrase == 1:           # second phrase: sparse answer under the busiest narration
                notes = [(0, MOTIF[bar_m][0][1], 12, 0.45)] if bar_m % 2 == 0 else []
            else:
                notes = MOTIF_ANSWER if (bar_m == 3 and phrase == 2) else MOTIF[bar_m]
            for slot, m, ln, v in notes:
                piano.append((bar_time(b, slot, swing) + human(rng, 0.004, 0.008), ln * six * 1.3, m,
                              v * rng.uniform(0.92, 1.05)))
        elif s == "intro":
            m = MOTIF[b.idx % 4][0][1]
            piano.append((bar_time(b, 0) + 0.02, b.length * 0.7, m, 0.38))
        elif s == "calm" and b.idx % 2 == 0:
            m = ch["pad"][-1] + 12
            piano.append((bar_time(b, 0) + human(rng, 0.006, 0.01), b.length * 0.9, m, 0.36))
            piano.append((bar_time(b, 10) + human(rng, 0.006, 0.01), b.length * 0.5, ch["pad"][-2] + 12, 0.30))
        elif s == "outro" and b.idx == 0:
            for slot, m, ln in ((0, 81, 4), (4, 78, 4), (8, 76, 4), (12, 74, 20)):
                piano.append((bar_time(b, slot) + human(rng, 0.004, 0.008), ln * six, m, 0.5))
        elif s == "outro" and b.idx == len(OUTRO) - 1:
            piano.append((bar_time(b, 0) + 0.01, b.length * 1.2, 86, 0.32))
            piano.append((bar_time(b, 0) + 0.12, b.length * 1.2, 81, 0.26))
        # ---------------- bass
        r = ch["bass"]
        nr = next_root(bars, i)
        if s in ("groove", "together", "prebrand"):
            pn = passing_note(r, nr) if nr != r else r + 12
            bpat = [(0, 6, r, 0.9), (7, 1, r + 12, 0.35), (10, 3, r, 0.7), (14, 2, pn, 0.6)]
        elif s == "return":
            bpat = [(0, 8, r, 0.78), (10, 5, r, 0.6)]
        elif s == "calm":
            bpat = [(0, 15, r, 0.55)]
        elif s == "tension":
            bpat = [(0, 15, r, 0.45)] if prog < 0.5 else [(k, 1.6, r, 0.34 + 0.2 * prog) for k in range(0, 16, 2)]
        elif s == "outro" and b.idx == 0:
            bpat = [(0, 30, 38, 0.8)]
        elif s == "outro" and b.idx == len(OUTRO) - 1:
            bpat = [(0, 24, 38, 0.5)]
        else:
            bpat = []
        for slot, ln, m, v in bpat:
            bass.append((bar_time(b, slot, swing) + human(rng, 0.004, 0.008), ln * six * 0.95, m, v))
        # ---------------- drums
        def hit(kind, slot, v, sd=0.004):
            drums.append((kind, bar_time(b, slot, swing) + human(rng, sd, 0.008), v * rng.uniform(0.9, 1.05)))

        if s in ("groove", "together", "prebrand"):
            hit("kick", 0, 1.0)
            hit("kick", 10, 0.72)
            if b.groove_i % 2 == 1:
                hit("kick", 7, 0.45)
            hit("snare", 4, 0.72)
            hit("snare", 12, 0.75)
            for k in range(0, 16, 2):
                hit("hat", k, 0.55 if k % 4 == 0 else 0.42, 0.006)
            for k in range(1, 16, 2):
                if rng.random() < 0.35:
                    hit("hat", k, 0.18, 0.006)
            for k in (7, 15):
                if rng.random() < 0.35:
                    hit("snare", k, 0.12)
            last_before_change = i + 1 < len(bars) and bars[i + 1].section != s and bars[i + 1].section != "prebrand"
            if last_before_change or (s == "prebrand" and b.idx == b.n_in - 1):
                for k, v in ((13, 0.2), (14, 0.28), (15, 0.36)):
                    hit("snare", k, v)
        elif s == "return":
            hit("kick", 0, 0.8)
            hit("kick", 10, 0.55)
            hit("rim", 12, 0.5)
            hit("rim", 4, 0.35)
            for k in range(16):
                hit("shaker", k, [0.45, 0.2, 0.32, 0.22][k % 4], 0.005)
        elif s == "calm":
            hit("kick", 0, 0.42)
            for k in range(0, 16, 2):
                hit("shaker", k, 0.30 if k % 4 == 2 else 0.2, 0.006)
        elif s == "tension" and b.idx >= b.n_in - 2:
            hit("kick", 0, 0.30)
            hit("kick", 8, 0.26)
            for k in range(16):
                hit("shaker", k, (0.12 + 0.1 * prog) * (1.3 if k % 4 == 2 else 1.0), 0.005)
        if s == "groove" and b.idx == 0 and i == accent_bar:
            drums.append(("cymbal", b.start, 0.5))
            fx.append(("swell", b.start, b.length))
        if s == "together" and b.idx == 0:
            drums.append(("cymbal", b.start, 0.3))
        if s == "outro" and b.idx == 0:
            drums.append(("kick", b.start, 0.85))
            drums.append(("cymbal", b.start, 0.45))
            fx.append(("swell", b.start, b.length * 0.5))
    return keys, piano, bass, drums, fx


# ============================================================== render
def render(duration: float, timing: dict | None, seed: int = 10, bpm: float = 95.0, fit_tempo: bool = True,
           target_lufs: float = -20.0, verbose: bool = True, stems: dict | None = None) -> np.ndarray:
    """Render the bed. If ``stems`` is a dict it receives the pre-master buses."""
    rng = np.random.default_rng(seed)
    T = key_times(duration, timing)
    bars, accent_bar, brand_bar = build_grid(duration, T, bpm, fit_tempo)
    plan(bars, T, accent_bar, brand_bar)
    n = int(round(duration * SR))
    ta = np.arange(n) / SR
    bpm_intro, bpm_main = 240 / bars[0].length, 240 / bars[brand_bar].length
    if verbose:
        print(f"tempo {bpm_intro:.2f} BPM until the logo reveal (bar {accent_bar} = {bars[accent_bar].start:.2f}s), "
              f"{bpm_main:.2f} BPM after; 'brand' on bar {brand_bar} = {bars[brand_bar].start:.2f}s")
        secs = []
        for b in bars:
            if b.start < duration and b.idx == 0:
                secs.append(f"{b.section}@{b.start:.1f}s")
        print("sections: " + ", ".join(secs))
        print("chords:   " + " ".join(b.chord for b in bars if b.start < duration))

    keys_ev, piano_ev, bass_ev, drum_ev, fx_ev = sequence(bars, T, accent_bar, brand_bar, duration, rng)
    six_main = bars[brand_bar].length / 16

    # ---------------- keys (EP) -> chorus
    keys = np.zeros((n, 2))
    for t, hold, m, v in keys_ev:
        place(keys, ep_note(mtof(m), v, hold, rng), t, pan=float(np.clip((m - 58) / 30, -0.3, 0.3)))
    keys = eq(keys, ("hp", 95, 0.7, 0), ("peak", 2600, 0.8, -2.5), ("peak", 300, 0.9, -1.5),
              ("lp", 10000, 0.54, 0), ("lp", 10000, 1.31, 0))       # 4th-order band-limit
    keys = chorus(keys)

    # ---------------- piano
    piano = np.zeros((n, 2))
    for t, hold, m, v in piano_ev:
        place(piano, piano_note(mtof(m), v, hold, rng), t, pan=float(np.clip((m - 70) / 25, -0.35, 0.35)))
    piano = eq(piano, ("hp", 160, 0.7, 0), ("peak", 2300, 0.9, -2.0), ("lp", 10000, 0.7, 0))

    # ---------------- bass
    bass = np.zeros((n, 2))
    for t, hold, m, v in bass_ev:
        place(bass, bass_note(mtof(m), v, hold, rng), t)
    bass = eq(bass, ("hp", 32, 0.7, 0), ("lp", 1100, 0.7, 0), ("peak", 700, 1.0, -2.0))

    # ---------------- arrangement curves (control rate)
    ct = np.arange(0, duration + 1.0, 0.01)

    def at(sec_start: str) -> list[float]:
        return [b.start for b in bars if b.section == sec_start and b.idx == 0 and b.start < duration]

    # pad cutoff and level keyframes per bar section
    cut_k, pad_k, str_k = [], [], [(0.0, 0.0)]
    for b in bars:
        if b.start >= duration:
            break
        s, p = b.section, (b.idx + 0.5) / b.n_in
        c = {"intro": 800, "tension": 800 + 1500 * p, "groove": 1500, "calm": 850, "return": 1200,
             "together": 1600, "prebrand": 1700, "outro": 1800 if b.idx == 0 else 1100}[s]
        g = {"intro": 0.85, "tension": 0.88 + 0.12 * p, "groove": 0.8, "calm": 1.0, "return": 0.85,
             "together": 0.85, "prebrand": 0.9, "outro": 1.05}[s]
        cut_k.append((b.start + 0.5 * b.length, c))
        pad_k.append((b.start + 0.5 * b.length, g))
    bb = bars[brand_bar].start
    str_k += [(bb - 2 * bars[brand_bar].length, 0.0), (bb - 0.3, 0.45), (bb + 1.2, 1.0), (bb + 4.0, 0.85),
              (duration, 0.7)]
    cutoff = smooth_curve(ct, cut_k, 2.0) * (1 + 0.18 * np.sin(2 * np.pi * 0.045 * ct))
    pad_gain = smooth_curve(ct, pad_k, 1.5)
    str_gain = smooth_curve(ct, str_k, 1.0)

    # ---------------- pad (polyBLEP saws, swept low-pass)
    pad = np.zeros((n, 2))
    i = 0
    while i < len(bars) and bars[i].start < duration:
        j = i + 1
        while j < len(bars) and bars[j].chord == bars[i].chord and bars[j].start < duration:
            j += 1
        t0 = max(0.0, bars[i].start - 0.12)
        t1 = min(duration + 0.1, bars[j - 1].start + bars[j - 1].length + 1.4)
        i0, i1 = int(t0 * SR), min(n, int(t1 * SR))
        m_ = i1 - i0
        e = _dsp.fade(np.ones(m_), SR, fade_in=0.9 if i else 1.8, fade_out=1.4)
        for m in CHORDS[bars[i].chord]["pad"]:
            f = mtof(m)
            for c, dets in ((0, (-9.0, 4.0)), (1, (-4.0, 9.0))):
                for dc in dets:
                    drift = 1 + 0.0007 * np.sin(2 * np.pi * rng.uniform(0.05, 0.12) * np.arange(m_) / SR + rng.uniform(0, 6))
                    pad[i0:i1, c] += blep_saw(f * 2 ** (dc / 1200) * drift, m_, rng.uniform()) * e
        i = j
    pad = swept_lowpass(pad, np.interp(ta, ct, cutoff), q=0.75)
    pad = eq(pad, ("hp", 170, 0.7, 0), ("peak", 2000, 0.7, -3.0))
    mid, side = pad.mean(axis=1), (pad[:, 0] - pad[:, 1]) / 2
    pad = np.stack([mid + 0.7 * side, mid - 0.7 * side], axis=1) * np.interp(ta, ct, pad_gain)[:, None]

    # ---------------- strings / choir for the resolve
    strings = np.zeros((n, 2))
    s0 = max(0.0, bb - 2 * bars[brand_bar].length - 0.5)
    sb = [b for b in bars if b.start + b.length > s0 and b.start < duration]
    i = 0
    while i < len(sb):
        j = i + 1
        while j < len(sb) and sb[j].chord == sb[i].chord:
            j += 1
        t0 = max(s0, sb[i].start - 0.1)
        t1 = min(duration + 0.1, sb[j - 1].start + sb[j - 1].length + 1.2)
        i0, i1 = int(t0 * SR), min(n, int(t1 * SR))
        m_ = i1 - i0
        tt = np.arange(m_) / SR
        e = _dsp.fade(np.ones(m_), SR, fade_in=1.2, fade_out=1.2)
        vib = 1 + 0.0035 * np.sin(2 * np.pi * 5.1 * tt + rng.uniform(0, 6)) * np.clip((tt - 0.6) / 1.0, 0, 1)
        for m in CHORDS[sb[i].chord]["pad"] + [CHORDS[sb[i].chord]["pad"][0] - 12]:
            f = mtof(m)
            for k, dc in enumerate(np.linspace(-14, 14, 7)):
                strings[i0:i1, k % 2] += blep_saw(f * 2 ** (dc / 1200) * vib, m_, rng.uniform()) * e
        i = j
    formant = eq(strings, ("bp", 720, 1.8, 0)) * 1.4 + eq(strings, ("bp", 1150, 2.2, 0)) * 0.8
    strings = eq(strings, ("lp", 2600, 0.7, 0)) + formant
    strings = eq(strings, ("hp", 220, 0.7, 0), ("peak", 2600, 0.8, -3.0), ("lp", 7000, 0.7, 0))
    strings *= np.interp(ta, ct, str_gain)[:, None]

    # ---------------- drums
    dk = np.zeros((n, 2))       # kick
    ds = np.zeros((n, 2))       # snare/rim
    dh = np.zeros((n, 2))       # hats/shaker/cymbal
    kick_times = []
    for kind, t, v in drum_ev:
        if t >= duration:
            continue
        if kind == "kick":
            place(dk, kick(v, rng, soft=v < 0.5), t)
            kick_times.append((t, v))
        elif kind == "snare":
            place(ds, snare(v, rng), t, pan=0.05)
        elif kind == "rim":
            place(ds, rim(v, rng), t, pan=0.12)
        elif kind == "hat":
            place(dh, hat(v, rng), t, pan=0.28)
        elif kind == "shaker":
            place(dh, shaker(v, rng), t, pan=-0.25)
        elif kind == "cymbal":
            place(dh, cymbal(v, rng), t, pan=-0.2)
    for kind, t, length in fx_ev:
        sw = reverse_swell(length, rng)
        place(dh, sw * 0.35, t - length, pan=0.0)
    dk = eq(dk, ("hp", 30, 0.7, 0), ("peak", 3500, 1.0, -2.0))
    ds = eq(ds, ("hp", 120, 0.7, 0), ("peak", 2500, 0.9, -2.0))
    dh = eq(dh, ("hp", 3000, 0.7, 0), ("lp", 14000, 0.7, 0))
    room = fdn_ir(0.45, 0.8, rng, damp_hz=4500, scale=0.35, predelay=0.006)
    ds = ds + 0.45 * convolve(ds, room)
    drums = 1.0 * dk + 0.55 * ds + 0.32 * dh
    drums, drum_gr = compressor(drums, ratio=3.0, attack=0.008, release=0.12, thr_pct=90)

    # ---------------- sidechain-style pump from the kick
    pump_pad = pump_curve(kick_times, n, 3.0)
    pump_bass = pump_curve(kick_times, n, 2.0)
    pump_keys = pump_curve(kick_times, n, 1.2)
    pad *= pump_pad[:, None]
    strings *= pump_pad[:, None] ** 0.5
    bass *= pump_bass[:, None]
    keys *= pump_keys[:, None]

    # ---------------- levels, sends, reverb/delay
    keys *= LEVELS["keys"]
    piano *= LEVELS["piano"]
    pad *= LEVELS["pad"]
    strings *= LEVELS["strings"]
    bass *= LEVELS["bass"]
    drums *= LEVELS["drums"]
    plate = fdn_ir(2.1, 3.2, rng, damp_hz=6000)
    wet = LEVELS["plate"] * convolve(0.25 * keys + 0.45 * piano + 0.25 * pad + 0.5 * strings + 0.1 * drums, plate)
    dly = LEVELS["delay"] * pingpong(keys * 0.6 + piano, 3 * six_main)   # dotted 8th
    buses = dict(keys=keys, piano=piano, pad=pad, strings=strings, bass=bass, drums=drums, reverb=wet, delay=dly)
    mix = sum(buses.values())

    # ---------------- mix bus + master
    mix, bus_gr = compressor(mix, ratio=1.8, attack=0.03, release=0.3, thr_pct=80, knee=8.0)
    mix = eq(mix, ("hp", 22, 0.7, 0))
    mix -= mix.mean(axis=0, keepdims=True)
    mix = _dsp.fade(mix, SR, fade_in=0.02, fade_out=2.5)
    gain = 0.0
    y = mix
    for _ in range(5):
        gain += target_lufs - _dsp.lufs(y, SR)
        y = _dsp.limit_true_peak(mix * _dsp.db2lin(gain), -3.2, SR, release=0.12)
        if abs(_dsp.lufs(y, SR) - target_lufs) < 0.05:
            break
    if verbose:
        print(f"compression: drum bus max {drum_gr:.1f} dB, mix bus max {bus_gr:.1f} dB; "
              f"notes: keys {len(keys_ev)}, piano {len(piano_ev)}, bass {len(bass_ev)}, drums {len(drum_ev)}")
    if stems is not None:
        g = _dsp.db2lin(gain)
        stems.update({k: v * g for k, v in buses.items()})
        stems["_bars"] = bars
    return y


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--duration", type=float,
                    help="length in seconds (default: timing audioDuration + 4, or 58 without timing)")
    ap.add_argument("--out", help="output WAV, relative to promo-video/ (default audio/music_bed.<lang>.wav "
                                  "with --timing, else audio/music_bed.wav)")
    ap.add_argument("--timing", help="narration timing JSON; aligns sections to phrase ids")
    ap.add_argument("--bpm", type=float, default=95.0, help="nominal tempo (default 95)")
    ap.add_argument("--no-tempo-fit", action="store_true",
                    help="keep the exact --bpm instead of landing bar lines on the logo reveal and 'brand'")
    ap.add_argument("--lufs", type=float, default=-20.0, help="integrated loudness target (default -20)")
    ap.add_argument("--seed", type=int, default=10, help="random seed (phases, humanisation)")
    ap.add_argument("--stems", metavar="DIR", help="also write the mix buses (keys, piano, pad, ...) as WAVs")
    args = ap.parse_args(argv)

    timing = None
    if args.timing:
        tp = resolve_path(args.timing, must_exist=True)
        timing = json.loads(Path(tp).read_text(encoding="utf-8"))
        print(f"timing: {tp} (source={timing.get('source')}, audioDuration={timing.get('audioDuration')})")
    duration = args.duration or ((float(timing["audioDuration"]) + 4.0) if timing else 58.0)
    stems: dict | None = {} if args.stems else None
    mix = render(duration, timing, args.seed, args.bpm, not args.no_tempo_fit, args.lufs, stems=stems)
    out = resolve_path(args.out or (f"audio/music_bed.{timing['lang']}.wav" if timing else "audio/music_bed.wav"))
    _dsp.write_wav(out, mix, SR, bits=24)
    print(f"wrote {out}: {len(mix) / SR:.2f}s 48 kHz stereo 24-bit; {_dsp.loudness_report(mix)}; "
          f"DC {np.abs(mix.mean(axis=0)).max():.1e}")
    if stems is not None:
        sd = resolve_path(args.stems)
        for k, v in stems.items():
            if not k.startswith("_"):
                _dsp.write_wav(sd / f"{k}.wav", v, SR, bits=24)
        print(f"stems -> {sd}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
