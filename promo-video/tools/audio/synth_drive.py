#!/usr/bin/env python3
"""Energetic product-film score for the TEN10 promo ("drive").

Upbeat modern pop/electronic at ~122 BPM in D major that follows the narration's
phrase ids, built on the same grid, harmony and sections as synth_music.py (bar
lines land on the logo reveal and on "brand"). Deterministic for a given --seed.

Parts
  kick     punchy four-on-the-floor (sine sweep + click, soft saturation)
  clap     layered noise bursts on 2 and 4, plate send
  hats     16ths with 8th accents, open hat on the off-beats in full sections
  bass     8th-note synth bass (saw + sub, enveloped low-pass), octave pops
  pluck    16th-note chord arpeggio, ping-pong delay
  pad      supersaw chords, heavily side-chained to the kick (the "pump")
  lead     the hook motif on a bright lead, only in "together" and the outro
  fx       risers into the logo reveal and "brand", impacts with sub boom
Sections (from synth_music.plan): intro builds with arp and hats; tension adds
kick, bass and a snare roll into the logo reveal (drop); groove is full; calm
drops the clap and halves the kick but keeps moving; return builds; together is
the biggest; prebrand rolls and rises into "brand" (impact + big chord); outro rings.

Example
  python3 tools/audio/synth_drive.py --timing narration/timing.he.json --out audio/music_bed.he.wav
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import _dsp  # noqa: E402
import synth_music as sm  # noqa: E402
from _ffmpeg import resolve_path  # noqa: E402

SR = _dsp.SR
eq, place, mtof = sm.eq, sm.place, sm.mtof

# arpeggio shapes over the chord's key voicing (indices), per 16th
ARP = [0, 2, 3, 4, 1, 3, 2, 4, 0, 3, 4, 2, 1, 4, 3, 2]
FULL = {"groove", "together", "return"}


# ============================================================== voices
def kick(vel: float, rng) -> np.ndarray:
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    f = 48 + 110 * np.exp(-t / 0.028)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22)
    body = np.tanh(1.8 * body) / np.tanh(1.8)
    click = eq(rng.standard_normal(n), ("hp", 2500, 0.7, 0), ("lp", 9000, 0.7, 0)) * np.exp(-t / 0.003)
    return (body + 0.18 * click) * sm.env_attack(n, int(0.0006 * SR)) * vel


def clap(vel: float, rng) -> np.ndarray:
    n = int(0.4 * SR)
    t = np.arange(n) / SR
    nz = eq(rng.standard_normal(n), ("bp", 1300, 0.8, 0), ("hp", 700, 0.7, 0))
    e = np.zeros(n)
    for k, d in enumerate((0.0, 0.009, 0.018, 0.027)):
        i = int(d * SR)
        e[i:] += np.exp(-(t[i:] - d) / (0.006 if k < 3 else 0.13)) * (0.8 if k < 3 else 1.0)
    return nz * e * vel * 0.8


def bass_note(f: float, vel: float, hold: float, rng) -> np.ndarray:
    n = int((hold + 0.06) * SR)
    t = np.arange(n) / SR
    ph = rng.uniform()
    saw = sm.blep_saw(f, n, ph) * 0.6 + sm.blep_saw(f * 1.004, n, rng.uniform()) * 0.4
    sub = np.sin(2 * np.pi * f * t + 6.28 * ph)
    bright = eq(saw, ("lp", 1600, 0.9, 0)) * np.exp(-t / 0.06)
    x = 0.85 * sub + 0.45 * eq(saw, ("lp", 520, 0.8, 0)) + 0.35 * bright
    x = np.tanh(1.4 * x) / np.tanh(1.4)
    return x * sm.env_attack(n, int(0.003 * SR)) * sm.release_after(t, hold, 0.02) * vel


def pluck(f: float, vel: float, rng) -> np.ndarray:
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    s = sm.blep_saw(f, n, rng.uniform()) + 0.7 * sm.blep_saw(f * 1.006, n, rng.uniform())
    x = s * np.exp(-t / 0.035) * 0.55 + eq(s, ("lp", 2200, 0.8, 0)) * np.exp(-t / 0.16)
    return x * sm.env_attack(n, int(0.002 * SR)) * vel * 0.35


def lead_note(f: float, vel: float, hold: float, rng) -> np.ndarray:
    n = int((hold + 0.25) * SR)
    t = np.arange(n) / SR
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.4 * t) * np.clip((t - 0.15) / 0.3, 0, 1)
    s = sm.blep_saw(f * vib, n, rng.uniform()) + 0.6 * sm.blep_saw(f * 2.003 * vib, n, rng.uniform())
    x = eq(s, ("lp", 3400, 0.7, 0))
    return x * sm.env_attack(n, int(0.01 * SR)) * sm.release_after(t, hold, 0.12) * vel * 0.3


def riser(length: float, rng) -> np.ndarray:
    n = int(length * SR)
    t = np.arange(n) / SR
    u = t / length
    nz = eq(rng.standard_normal(n), ("hp", 300, 0.7, 0))
    x = sm.swept_lowpass(np.stack([nz, nz], axis=1), 400 + 9000 * u ** 2, q=2.5)[:, 0]
    tone = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (2 * u)) / SR) * 0.25
    x = (x + tone) * u ** 2.2
    x[-int(0.01 * SR):] *= np.linspace(1, 0, int(0.01 * SR))
    return x


def impact(rng) -> np.ndarray:
    n = int(2.2 * SR)
    t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(34 + 60 * np.exp(-t / 0.08)) / SR) * np.exp(-t / 0.7)
    return np.tanh(1.5 * boom) * 0.9


# ============================================================== sequencing
def sequence(bars, T, accent_bar, brand_bar, duration, rng):
    ev = dict(kick=[], clap=[], hat=[], ohat=[], bass=[], pluck=[], lead=[], cym=[], riser=[], impact=[], snare=[])
    for i, b in enumerate(bars):
        if b.start >= duration:
            break
        s, L, six = b.section, b.length, b.length / 16
        ch = sm.CHORDS[b.chord]
        last_before_accent = i == accent_bar - 1
        full = s in FULL or (s == "outro" and b.idx < 2)
        # kick
        if s in FULL or s in ("tension", "prebrand") or (s == "outro" and b.idx < 2):
            for q in range(4):
                v = 0.55 + 0.35 * (b.idx + q / 4) / max(1, b.n_in) if s == "tension" else 1.0
                ev["kick"].append((b.start + q * 4 * six, v))
        elif s == "calm":
            for q in (0, 2):
                ev["kick"].append((b.start + q * 4 * six, 0.8))
        elif s == "intro":
            for q in ((0, 2) if b.idx == 0 else (0, 1, 2, 3)):
                ev["kick"].append((b.start + q * 4 * six, 0.75))
        # clap / snare
        if full or s == "prebrand":
            for q in (1, 3):
                ev["clap"].append((b.start + q * 4 * six, 0.9))
        if s == "calm":
            ev["snare"].append((b.start + 12 * six, 0.35))
        if last_before_accent or s == "prebrand":
            k0 = 8 if not (s == "prebrand" and b.idx == 0) else 0
            for k in range(k0, 16):
                ev["snare"].append((b.start + k * six, 0.25 + 0.6 * (k - k0) / (16 - k0)))
        # hats
        if s != "outro" or b.idx < 3:
            step = 1 if (full or s in ("tension", "prebrand")) else 2
            for k in range(0, 16, step):
                v = 0.55 if k % 4 == 2 else 0.32 if k % 2 == 0 else 0.22
                if s == "intro":
                    v *= 0.55 + 0.45 * (b.idx + k / 16) / max(1, b.n_in)
                ev["hat"].append((b.start + k * six + sm.human(rng, 0.002, 0.004), v))
            if full:
                for q in range(4):
                    ev["ohat"].append((b.start + (q * 4 + 2) * six, 0.35))
        # bass: 8ths on the root, octave pop on the last off-beat
        if s in FULL or s in ("tension", "prebrand") or (s == "outro" and b.idx < 2):
            for k in range(8):
                m = ch["bass"] + (12 if k == 7 else 0) + 12
                ev["bass"].append((b.start + k * 2 * six, 1.7 * six, m, 0.9 if k % 2 == 0 else 0.75))
        elif s == "calm":
            ev["bass"].append((b.start, L * 0.95, ch["bass"] + 12, 0.8))
        # pluck arpeggio
        keys = ch["keys"]
        dens = 1 if s != "intro" or b.idx >= 1 else 2
        for k in range(0, 16, dens):
            m = keys[ARP[k] % len(keys)] + 12
            v = (0.8 if k % 4 == 0 else 0.6) * (0.75 if s == "calm" else 1.0)
            ev["pluck"].append((b.start + k * six, m, v))
        # lead hook in "together" and the start of the outro
        if s == "together" or (s == "outro" and b.idx < 2):
            for slot, m, ln, v in sm.MOTIF[b.groove_i % 4 if s == "together" else 0]:
                ev["lead"].append((b.start + slot * six, ln * six, m, v))
        # arrivals
        if i == accent_bar or i == brand_bar:
            ev["cym"].append((b.start, 1.0))
            ev["impact"].append(b.start)
        if (s in ("groove", "together", "return")) and b.idx % 4 == 0 and b.idx > 0:
            ev["cym"].append((b.start, 0.5))
    for tb, L in ((bars[accent_bar].start, 2 * bars[accent_bar - 1].length), (bars[brand_bar].start, 2 * bars[brand_bar - 1].length)):
        ev["riser"].append((tb, L))
    return ev


def render(duration, timing, seed=10, bpm=122.0, target_lufs=-20.0, verbose=True):
    rng = np.random.default_rng(seed)
    T = sm.key_times(duration, timing)
    bars, accent_bar, brand_bar = sm.build_grid(duration, T, bpm, True)
    sm.plan(bars, T, accent_bar, brand_bar)
    n = int(round(duration * SR))
    ta = np.arange(n) / SR
    if verbose:
        print(f"tempo {240 / bars[0].length:.1f} / {240 / bars[brand_bar].length:.1f} BPM; logo reveal on bar {accent_bar} "
              f"({bars[accent_bar].start:.2f}s), 'brand' on bar {brand_bar} ({bars[brand_bar].start:.2f}s)")
        print("sections: " + ", ".join(f"{b.section}@{b.start:.1f}s" for b in bars if b.start < duration and b.idx == 0))
    ev = sequence(bars, T, accent_bar, brand_bar, duration, rng)
    six = bars[brand_bar].length / 16

    Z = lambda: np.zeros((n, 2))  # noqa: E731
    dk, dc, dh, bs, pl, ld, fx = Z(), Z(), Z(), Z(), Z(), Z(), Z()
    kt = []
    for t, v in ev["kick"]:
        place(dk, kick(v, rng), t); kt.append((t, v))
    for t, v in ev["clap"]:
        place(dc, clap(v, rng), t, pan=0.04)
    for t, v in ev["snare"]:
        place(dc, sm.snare(v, rng), t, pan=-0.06)
    for t, v in ev["hat"]:
        place(dh, sm.hat(v, rng), t, pan=0.3)
    for t, v in ev["ohat"]:
        place(dh, sm.hat(v, rng, open_=True), t, pan=-0.3)
    for t, v in ev["cym"]:
        place(dh, sm.cymbal(v, rng), t, pan=-0.15)
    for t, hold, m, v in ev["bass"]:
        place(bs, bass_note(mtof(m), v, hold, rng), t)
    for k, (t, m, v) in enumerate(ev["pluck"]):
        place(pl, pluck(mtof(m), v, rng), t, pan=0.35 * math.sin(k * 0.7))
    for t, hold, m, v in ev["lead"]:
        place(ld, lead_note(mtof(m), v, hold, rng), t, pan=0.1)
    for tb, L in ev["riser"]:
        place(fx, riser(L, rng) * 0.45, tb - L)
        place(fx, sm.reverse_swell(0.9, rng) * 0.5, tb - 0.9)
    for tb in ev["impact"]:
        place(fx, impact(rng) * 0.7, tb)

    # supersaw pad on each chord run, filter opening with the energy
    ct = np.arange(0, duration + 1.0, 0.01)
    cut_k, g_k = [], []
    for b in bars:
        if b.start >= duration:
            break
        p = (b.idx + 0.5) / b.n_in
        c = {"intro": 1400 + 1200 * p, "tension": 1800 + 2200 * p, "groove": 3600, "calm": 1500, "return": 2200 + 1400 * p,
             "together": 4200, "prebrand": 2400 + 3000 * p, "outro": 3800 if b.idx < 2 else 1800}[b.section]
        g = {"intro": 0.8, "tension": 0.8, "groove": 1.0, "calm": 0.75, "return": 0.9, "together": 1.1, "prebrand": 0.9,
             "outro": 1.0}[b.section]
        cut_k.append((b.start + 0.5 * b.length, c)); g_k.append((b.start + 0.5 * b.length, g))
    pad = Z()
    i = 0
    while i < len(bars) and bars[i].start < duration:
        j = i + 1
        while j < len(bars) and bars[j].chord == bars[i].chord and bars[j].start < duration:
            j += 1
        t0, t1 = max(0.0, bars[i].start - 0.02), min(duration + 0.1, bars[j - 1].start + bars[j - 1].length + 0.3)
        i0, i1 = int(t0 * SR), min(n, int(t1 * SR)); m_ = i1 - i0
        e = _dsp.fade(np.ones(m_), SR, fade_in=0.03, fade_out=0.25)
        for m in sm.CHORDS[bars[i].chord]["pad"]:
            for k, dcent in enumerate((-18, -8, 0, 8, 18)):
                pad[i0:i1, k % 2] += sm.blep_saw(mtof(m) * 2 ** (dcent / 1200), m_, rng.uniform()) * e * 0.5
        i = j
    pad = sm.swept_lowpass(pad, np.interp(ta, ct, sm.smooth_curve(ct, cut_k, 1.0)), q=0.8)
    pad *= np.interp(ta, ct, sm.smooth_curve(ct, g_k, 0.8))[:, None]

    # bus processing
    dk = eq(dk, ("hp", 28, 0.7, 0), ("peak", 60, 1.0, 2.0))
    plate = sm.fdn_ir(1.4, 2.2, rng, damp_hz=6500)
    dc = eq(dc, ("hp", 180, 0.7, 0)); dc = dc + 0.35 * sm.convolve(dc, plate)
    dh = eq(dh, ("hp", 4000, 0.7, 0), ("lp", 15000, 0.7, 0))
    drums = dk + 0.5 * dc + 0.28 * dh
    drums, dgr = sm.compressor(drums, ratio=3.5, attack=0.006, release=0.1, thr_pct=88)
    bs = eq(bs, ("hp", 35, 0.7, 0), ("lp", 2200, 0.7, 0))
    pl = eq(pl, ("hp", 300, 0.7, 0), ("peak", 2800, 0.9, -3.0))
    pl = pl + 0.5 * sm.pingpong(pl, 3 * six, feedback=0.35, taps=4)
    pad = eq(pad, ("hp", 220, 0.7, 0), ("peak", 2400, 0.8, -4.0))
    ld = eq(ld, ("hp", 400, 0.7, 0), ("peak", 2600, 0.9, -2.0)); ld = ld + 0.4 * sm.pingpong(ld, 3 * six, 0.3, 3)
    fx = eq(fx, ("hp", 25, 0.7, 0))
    # the pump
    pump_pad, pump_bass, pump_pl = sm.pump_curve(kt, n, 9.0), sm.pump_curve(kt, n, 6.0), sm.pump_curve(kt, n, 3.0)
    pad *= pump_pad[:, None]; bs *= pump_bass[:, None]; pl *= pump_pl[:, None]
    wet = 0.22 * sm.convolve(0.3 * pl + 0.35 * pad + 0.4 * ld, plate)
    mix = 1.0 * drums + 0.62 * bs + 0.55 * pl + 0.2 * pad + 0.5 * ld + 0.55 * fx + wet
    mix, bgr = sm.compressor(mix, ratio=2.2, attack=0.02, release=0.2, thr_pct=80, knee=8.0)
    mix = eq(mix, ("hp", 24, 0.7, 0))
    mix -= mix.mean(axis=0, keepdims=True)
    mix = _dsp.fade(mix, SR, fade_in=0.01, fade_out=2.5)
    gain, y = 0.0, mix
    for _ in range(5):
        gain += target_lufs - _dsp.lufs(y, SR)
        y = _dsp.limit_true_peak(mix * _dsp.db2lin(gain), -3.0, SR, release=0.08)
        if abs(_dsp.lufs(y, SR) - target_lufs) < 0.05:
            break
    if verbose:
        print(f"compression: drums {dgr:.1f} dB, bus {bgr:.1f} dB; events: " + ", ".join(f"{k} {len(v)}" for k, v in ev.items()))
    return y


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--duration", type=float)
    ap.add_argument("--out")
    ap.add_argument("--timing")
    ap.add_argument("--bpm", type=float, default=122.0)
    ap.add_argument("--lufs", type=float, default=-20.0)
    ap.add_argument("--seed", type=int, default=10)
    a = ap.parse_args(argv)
    timing = json.loads(Path(resolve_path(a.timing, must_exist=True)).read_text(encoding="utf-8")) if a.timing else None
    duration = a.duration or ((float(timing["audioDuration"]) + 4.0) if timing else 58.0)
    y = render(duration, timing, a.seed, a.bpm, a.lufs)
    out = resolve_path(a.out or (f"audio/music_bed.{timing['lang']}.wav" if timing else "audio/music_bed.wav"))
    _dsp.write_wav(out, y, SR, bits=24)
    print(f"wrote {out}: {len(y) / SR:.2f}s; {_dsp.loudness_report(y)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
