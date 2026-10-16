#!/usr/bin/env python3
"""Restrained UI sound-design library for the TEN10 promo.

Writes 48 kHz stereo 24-bit WAVs, each normalised to a -6 dBFS sample peak,
DC-free and fully enveloped (no clicks). The film references them by name in
its sfx-cues.json ("type": "tick" -> audio/sfx/tick.wav).

  tap       ~40 ms   soft UI tap (damped sine drop + tiny felt click)
  tick      ~15 ms   very subtle number tick
  arrive   ~120 ms   transaction row arriving: soft short blip
  whoosh   ~600 ms   smooth soft air whoosh (band-passed noise sweep)
  sweep    ~1.1 s    the "order" moment: long airy rise-and-fall sweep
  calendar ~150 ms   soft page flip / tick
  notify   ~700 ms   quiet two-note chime (A5 -> D6, warm bell)
  resolve  ~2.5 s    logo resolve: soft warm Dmaj9 bloom
  pop       ~80 ms   soft card snap
  type      ~25 ms   single very soft keyboard key tick

Example:
  python3 tools/audio/synth_sfx.py --out audio/sfx/
"""

from __future__ import annotations

import argparse
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


# ------------------------------------------------------------------ building blocks
def t_axis(dur: float) -> np.ndarray:
    return np.arange(int(dur * SR)) / SR


def exp_env(t: np.ndarray, attack: float, tau: float) -> np.ndarray:
    """Smooth attack (raised cosine) into exponential decay."""
    a = np.where(t < attack, 0.5 - 0.5 * np.cos(np.pi * np.clip(t / attack, 0, 1)), 1.0)
    return a * np.exp(-np.maximum(t - attack, 0) / tau)


def glide_sine(t: np.ndarray, f0: float, f1: float, glide: float, phase: float = 0.0) -> np.ndarray:
    """Sine whose frequency moves exponentially from f0 to f1 over ``glide`` s."""
    k = np.clip(t / glide, 0, 1)
    f = f0 * (f1 / f0) ** k
    return np.sin(2 * np.pi * np.cumsum(f) / SR + phase)


def bell(t: np.ndarray, f: float, tau: float, rng) -> np.ndarray:
    """Warm bell: fundamental + a couple of soft inharmonic partials."""
    x = np.zeros_like(t)
    for ratio, amp, tk in ((1.0, 1.0, 1.0), (2.0, 0.18, 0.6), (2.76, 0.07, 0.35), (5.4, 0.02, 0.2)):
        if ratio * f < SR * 0.4:
            x += amp * np.exp(-t / (tau * tk)) * np.sin(2 * np.pi * ratio * f * t + rng.uniform(0, 6.28))
    return x


def noise_sweep(dur: float, centers: list[float], widths_oct: list[float], env_pts: list[float],
                rng, seed_offset: int = 0) -> np.ndarray:
    """Band-passed noise whose centre frequency follows ``centers`` (Hz) over time.

    Built in the STFT domain: a smooth Gaussian (in octaves) band mask moving
    along the given breakpoints, random phase, overlap-add. Mono.
    """
    n = int(dur * SR)
    nper = 1024
    f = np.fft.rfftfreq(nper, 1 / SR)
    hop = nper // 4
    frames = int(math.ceil(n / hop)) + 4
    pos = np.linspace(0, 1, frames)
    bp = np.linspace(0, 1, len(centers))
    fc = np.exp(np.interp(pos, bp, np.log(centers)))
    wd = np.interp(pos, bp, widths_oct)
    env = np.interp(pos, np.linspace(0, 1, len(env_pts)), env_pts)
    lf = np.log2(np.maximum(f, 20.0))
    mag = np.exp(-0.5 * ((lf[None, :] - np.log2(fc)[:, None]) / wd[:, None]) ** 2) * env[:, None]
    mag[:, f < 60] = 0
    ph = rng.uniform(0, 2 * np.pi, mag.shape)
    _, x = signal.istft((mag * np.exp(1j * ph)).T, fs=SR, nperseg=nper, noverlap=nper - hop)
    return x[:n] if len(x) >= n else np.pad(x, (0, n - len(x)))


def stereo(x: np.ndarray, pan: float = 0.0) -> np.ndarray:
    a = (pan + 1) * np.pi / 4
    return np.stack([x * math.cos(a), x * math.sin(a)], axis=1) * math.sqrt(2)


def widen(x: np.ndarray, delay_ms: float = 7.0, amount: float = 0.25) -> np.ndarray:
    """Tiny mono-safe width: add a delayed copy in opposite polarity to the sides."""
    d = int(delay_ms * SR / 1000)
    dl = np.concatenate([np.zeros(d), x[:-d]])
    return np.stack([x + amount * dl, x - amount * dl], axis=1)


def finish(x: np.ndarray, dur: float, lp: float | None = None) -> np.ndarray:
    """High-pass (DC), optional low-pass, pad/trim, short fade-out, -6 dBFS peak."""
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = stereo(x) / math.sqrt(2)
    x = _dsp.butter(x, "highpass", 40, SR, order=2)
    if lp:
        x = _dsp.butter(x, "lowpass", lp, SR, order=2)
    n = int(dur * SR)
    x = x[:n] if len(x) >= n else np.pad(x, ((0, n - len(x)), (0, 0)))
    x = _dsp.fade(x, SR, fade_in=0.0008, fade_out=min(0.3 * dur, 0.25))
    return x * (_dsp.db2lin(-6.0) / (np.abs(x).max() + 1e-12))


# ------------------------------------------------------------------ the sounds
def sfx_tap(rng):
    t = t_axis(0.04)
    body = glide_sine(t, 1150, 620, 0.012) * exp_env(t, 0.0012, 0.0075)
    click = _dsp.butter(rng.standard_normal(len(t)), "bandpass", [1500, 5000], SR) * exp_env(t, 0.0004, 0.0015)
    return finish(body + 0.18 * click, 0.04, lp=6000)


def sfx_tick(rng):
    t = t_axis(0.015)
    tone = np.sin(2 * np.pi * 2350 * t) * exp_env(t, 0.0008, 0.0028)
    air = _dsp.butter(rng.standard_normal(len(t)), "bandpass", [3000, 7000], SR) * exp_env(t, 0.0004, 0.0012)
    return finish(tone + 0.12 * air, 0.015, lp=8000)


def sfx_arrive(rng):
    t = t_axis(0.12)
    f = 659.26                                       # E5 (sits in D major)
    x = glide_sine(t, f * 0.97, f, 0.012) * exp_env(t, 0.003, 0.034)
    x += 0.22 * np.sin(2 * np.pi * 2 * f * t) * exp_env(t, 0.003, 0.018)
    x += 0.10 * np.sin(2 * np.pi * 1.5 * f * t) * exp_env(t, 0.004, 0.028)
    return finish(x, 0.12, lp=5000)


def sfx_whoosh(rng):
    dur = 0.6
    x = noise_sweep(dur, [380, 1000, 2000, 1200, 750], [0.9, 0.8, 0.7, 0.8, 0.9],
                    [0.0, 0.25, 0.75, 1.0, 0.55, 0.15, 0.0], rng)
    t = t_axis(dur)
    x *= np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.6       # extra-smooth ends
    pan = np.linspace(-0.35, 0.35, len(x))                    # gentle L -> R travel
    a = (pan + 1) * np.pi / 4
    y = np.stack([x * np.cos(a), x * np.sin(a)], axis=1) * math.sqrt(2)
    return finish(y, dur, lp=7000)


def sfx_sweep(rng):
    dur = 1.1
    t = t_axis(dur)
    x = noise_sweep(dur, [260, 600, 1400, 2700, 2100, 1200, 850], [1.1, 1.0, 0.9, 0.8, 0.9, 1.0, 1.1],
                    [0.0, 0.12, 0.35, 0.7, 1.0, 0.8, 0.45, 0.18, 0.0], rng)
    x2 = noise_sweep(dur, [300, 680, 1550, 2550, 1950, 1100, 800], [1.1, 1.0, 0.9, 0.8, 0.9, 1.0, 1.1],
                     [0.0, 0.12, 0.35, 0.7, 1.0, 0.8, 0.45, 0.18, 0.0], rng)
    # a faint pitched "air" layer on D (octave glide D5 -> D6 -> A5), very low
    k = np.clip(t / dur, 0, 1)
    f = np.interp(k, [0, 0.55, 1], [587.33, 1174.66, 880.0])
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * k) ** 2 * 0.05
    y = np.stack([x + tone, x2 + tone], axis=1)
    y *= (np.sin(np.pi * k) ** 0.5)[:, None]
    return finish(y, dur, lp=8000)


def sfx_calendar(rng):
    dur = 0.15
    t = t_axis(dur)
    x = np.zeros(len(t))
    paper = _dsp.butter(rng.standard_normal(len(t)), "bandpass", [1200, 6500], SR)
    for dt, a in ((0.0, 1.0), (0.018, 0.55), (0.041, 0.3), (0.07, 0.14)):   # flutter
        tt = t - dt
        x += a * paper * np.where(tt >= 0, exp_env(np.maximum(tt, 0), 0.0015, 0.009), 0.0)
    thump = np.sin(2 * np.pi * 190 * t) * exp_env(t, 0.002, 0.018)
    return finish(0.55 * x + 0.5 * thump, dur, lp=6500)


def sfx_notify(rng):
    dur = 0.7
    t = t_axis(dur)
    x = 0.8 * bell(t, 880.0, 0.22, rng) * exp_env(t, 0.003, 10)            # A5
    t2 = np.maximum(t - 0.11, 0)
    x += np.where(t >= 0.11, bell(t2, 1174.66, 0.26, rng) * exp_env(t2, 0.003, 10), 0.0)  # D6
    return finish(widen(x, 6.0, 0.2), dur, lp=7000)


def sfx_resolve(rng):
    dur = 2.5
    t = t_axis(dur)
    notes = [293.66, 440.0, 554.37, 659.26, 739.99]       # D4 A4 C#5 E5 F#5 (Dmaj9)
    L, R = np.zeros(len(t)), np.zeros(len(t))
    for i, f in enumerate(notes):
        start = 0.035 * i                                   # soft strum
        tt = np.maximum(t - start, 0)
        env = np.where(t >= start, (1 - np.exp(-tt / 0.12)) * np.exp(-tt / 1.1), 0.0)
        g = 1.0 / (1 + 0.25 * i)
        for side, dc in ((0, -4.0), (1, 4.0)):
            ff = f * 2 ** (dc / 1200)
            v = np.sin(2 * np.pi * ff * tt + rng.uniform(0, 6.28))
            v += 0.12 * np.sin(4 * np.pi * ff * tt)
            (L if side == 0 else R)[:] += g * env * v
    air = noise_sweep(dur, [900, 2600, 1800], [0.8, 0.7, 0.9], [0.0, 1.0, 0.5, 0.15, 0.0], rng)
    y = np.stack([L, R], axis=1) + 0.25 * np.stack([air, np.roll(air, 240)], axis=1)
    y *= (1 - np.clip((t - (dur - 0.9)) / 0.9, 0, 1))[:, None] ** 2      # settle to silence
    return finish(y, dur, lp=6000)


def sfx_pop(rng):
    dur = 0.08
    t = t_axis(dur)
    x = glide_sine(t, 560, 300, 0.02) * exp_env(t, 0.001, 0.016)
    click = _dsp.butter(rng.standard_normal(len(t)), "lowpass", 3000, SR) * exp_env(t, 0.0005, 0.002)
    return finish(x + 0.2 * click, dur, lp=5000)


def sfx_type(rng):
    dur = 0.025
    t = t_axis(dur)
    n = _dsp.butter(rng.standard_normal(len(t)), "bandpass", [1500, 4200], SR)
    x = n * exp_env(t, 0.0005, 0.0025)
    t2 = np.maximum(t - 0.009, 0)
    x += 0.4 * n[::-1] * np.where(t >= 0.009, exp_env(t2, 0.0005, 0.002), 0.0)   # key release
    x += 0.35 * np.sin(2 * np.pi * 320 * t) * exp_env(t, 0.001, 0.004)
    return finish(x, dur, lp=6000)


SOUNDS = {
    "tap": sfx_tap, "tick": sfx_tick, "arrive": sfx_arrive, "whoosh": sfx_whoosh, "sweep": sfx_sweep,
    "calendar": sfx_calendar, "notify": sfx_notify, "resolve": sfx_resolve, "pop": sfx_pop, "type": sfx_type,
}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default="audio/sfx/", help="output directory (relative to promo-video/)")
    ap.add_argument("--only", nargs="*", choices=sorted(SOUNDS), help="render only these sounds")
    ap.add_argument("--seed", type=int, default=7, help="random seed")
    args = ap.parse_args(argv)
    out = resolve_path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    for name in args.only or SOUNDS:
        rng = np.random.default_rng([args.seed, sorted(SOUNDS).index(name)])
        x = SOUNDS[name](rng)
        _dsp.write_wav(out / f"{name}.wav", x, SR, bits=24)
        print(f"{name + '.wav':<13} {len(x) / SR * 1000:6.0f} ms  peak {_dsp.peak_db(x):6.2f} dBFS  "
              f"true peak {_dsp.true_peak_db(x):6.2f} dBTP")
    print(f"wrote {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
