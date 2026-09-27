"""Small DSP toolkit shared by the audio tools (numpy + scipy only).

* write_wav      - 16/24-bit PCM or float32 WAV via the stdlib ``wave`` module
* read_audio     - any format, via ffmpeg (see tools/_ffmpeg.py)
* lufs           - ITU-R BS.1770-4 integrated loudness (K-weighting + gating)
* true_peak_db   - 4x oversampled peak estimate (dBTP)
* limit_true_peak- transparent look-ahead gain limiter for the final master
* helpers: db/lin conversion, fades, butterworth filters, one-pole smoothing
"""

from __future__ import annotations

import sys
import wave
from pathlib import Path

import numpy as np
from scipy import ndimage, signal

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from _ffmpeg import decode_audio  # noqa: E402

SR = 48000


# ------------------------------------------------------------------ basics
def db2lin(db: float) -> float:
    return 10.0 ** (db / 20.0)


def lin2db(x: float) -> float:
    return 20.0 * np.log10(max(float(x), 1e-12))


def as_stereo(x: np.ndarray) -> np.ndarray:
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        return np.stack([x, x], axis=1)
    if x.shape[1] == 1:
        return np.repeat(x, 2, axis=1)
    return x[:, :2]


def peak_db(x: np.ndarray) -> float:
    return lin2db(np.max(np.abs(x)) if x.size else 0.0)


def fade(x: np.ndarray, sr: int, fade_in: float = 0.0, fade_out: float = 0.0) -> np.ndarray:
    """Raised-cosine fades (in place on a copy)."""
    x = np.array(x, dtype=np.float64, copy=True)
    n = len(x)
    for length, rising in ((fade_in, True), (fade_out, False)):
        m = min(n, int(round(length * sr)))
        if m <= 0:
            continue
        ramp = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, m))
        if not rising:
            ramp = ramp[::-1]
        sl = slice(0, m) if rising else slice(n - m, n)
        x[sl] = (x[sl].T * ramp).T
    return x


def butter(x: np.ndarray, kind: str, freq, sr: int = SR, order: int = 2) -> np.ndarray:
    """Causal Butterworth filter along axis 0."""
    sos = signal.butter(order, freq, kind, fs=sr, output="sos")
    return signal.sosfilt(sos, x, axis=0)


def one_pole_ar(target: np.ndarray, sr_ctrl: float, attack: float, release: float,
                start: float | None = None) -> np.ndarray:
    """Asymmetric one-pole smoother for gain curves (dB or linear, any sign).

    ``attack`` applies when the value moves *down* (more gain reduction),
    ``release`` when it moves back *up*. Time constants in seconds; the
    control signal runs at ``sr_ctrl`` Hz (keep it low, e.g. 1 kHz).
    """
    a_att = np.exp(-1.0 / (attack * sr_ctrl))
    a_rel = np.exp(-1.0 / (release * sr_ctrl))
    y = np.empty_like(target, dtype=np.float64)
    v = float(target[0] if start is None else start)
    for i, t in enumerate(target):
        a = a_att if t < v else a_rel
        v = a * v + (1.0 - a) * t
        y[i] = v
    return y


# ------------------------------------------------------------------ I/O
def write_wav(path: str | Path, x: np.ndarray, sr: int = SR, bits: int = 24) -> None:
    """Write PCM WAV (bits = 16 or 24). Values are clipped to [-1, 1)."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = x[:, None]
    ch = x.shape[1]
    if bits == 16:
        pcm = np.clip(np.round(x * 32767), -32768, 32767).astype("<i2").tobytes()
    elif bits == 24:
        q = np.clip(np.round(x * 8388607), -8388608, 8388607).astype("<i4")
        pcm = np.ascontiguousarray(q).view(np.uint8).reshape(-1, 4)[:, :3].tobytes()
    else:
        raise ValueError("bits must be 16 or 24")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(ch)
        w.setsampwidth(bits // 8)
        w.setframerate(sr)
        w.writeframes(pcm)


def read_audio(path: str | Path, sr: int = SR, channels: int = 2) -> np.ndarray:
    """Decode any audio file to float64 at ``sr`` (shape (n, channels) or (n,))."""
    return decode_audio(path, sr, channels).astype(np.float64)


# ------------------------------------------------------------------ loudness
def _biquad_shelf(fs: float):
    # BS.1770 stage 1 (high shelf ~+4 dB), any fs; same derivation as libebur128
    f0, G, Q = 1681.974450955533, 3.999843853973347, 0.7071752369554196
    K = np.tan(np.pi * f0 / fs)
    Vh = 10 ** (G / 20.0)
    Vb = Vh ** 0.4996667741545416
    a0 = 1.0 + K / Q + K * K
    b = [(Vh + Vb * K / Q + K * K) / a0, 2.0 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0]
    a = [1.0, 2.0 * (K * K - 1.0) / a0, (1.0 - K / Q + K * K) / a0]
    return np.array(b), np.array(a)


def _biquad_hp(fs: float):
    # BS.1770 stage 2 (RLB high-pass), any fs; same derivation as libebur128
    f0, Q = 38.13547087602444, 0.5003270373238773
    K = np.tan(np.pi * f0 / fs)
    a0 = 1.0 + K / Q + K * K
    return np.array([1.0, -2.0, 1.0]), np.array([1.0, 2.0 * (K * K - 1.0) / a0, (1.0 - K / Q + K * K) / a0])


def lufs(x: np.ndarray, sr: int = SR) -> float:
    """Integrated loudness (LUFS) per ITU-R BS.1770-4 (mono or stereo)."""
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = x[:, None]
    b1, a1 = _biquad_shelf(sr)
    b2, a2 = _biquad_hp(sr)
    y = signal.lfilter(b2, a2, signal.lfilter(b1, a1, x, axis=0), axis=0)
    block, step = int(0.4 * sr), int(0.1 * sr)
    if len(y) < block:
        return -70.0
    c = np.concatenate([np.zeros((1, y.shape[1])), np.cumsum(y * y, axis=0)])
    starts = np.arange(0, len(y) - block + 1, step)
    z = (c[starts + block] - c[starts]) / block        # (blocks, channels) mean square
    zs = z.sum(axis=1)                                 # channel weights 1.0 (L, R)
    lk = -0.691 + 10 * np.log10(zs + 1e-20)
    zs = zs[lk > -70.0]
    if not len(zs):
        return -70.0
    rel = -0.691 + 10 * np.log10(zs.mean()) - 10.0
    zs2 = zs[(-0.691 + 10 * np.log10(zs + 1e-20)) > rel]
    return float(-0.691 + 10 * np.log10(zs2.mean())) if len(zs2) else -70.0


def true_peak_db(x: np.ndarray, oversample: int = 4) -> float:
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = x[:, None]
    up = signal.resample_poly(x, oversample, 1, axis=0)
    return lin2db(np.max(np.abs(up)))


def limit_true_peak(x: np.ndarray, ceiling_db: float, sr: int = SR, lookahead: float = 0.005,
                    release: float = 0.08) -> np.ndarray:
    """Look-ahead gain limiter keeping 4x-oversampled peaks under ``ceiling_db``.

    Gain is computed on 1 ms blocks: required gain -> sliding minimum over
    +-lookahead (so the gain is already down when the peak arrives) ->
    exponential release -> short box smoothing -> linear interpolation to
    audio rate. Each step keeps gain <= required gain at every sample.
    Linked stereo.
    """
    x = np.asarray(x, dtype=np.float64)
    st = x if x.ndim == 2 else x[:, None]
    n = len(st)
    up = np.abs(signal.resample_poly(st, 4, 1, axis=0)).max(axis=1)
    up = up[: n * 4] if len(up) >= n * 4 else np.pad(up, (0, n * 4 - len(up)))
    pk = up.reshape(n, 4).max(axis=1)                          # per-sample true-peak estimate
    need = np.minimum(1.0, db2lin(ceiling_db) / np.maximum(pk, 1e-12))
    if need.min() >= 1.0:
        return x
    blk = max(1, sr // 1000)
    nb = int(np.ceil(n / blk))
    need_b = np.pad(need, (0, nb * blk - n), constant_values=1.0).reshape(nb, blk).min(axis=1)
    la = max(1, int(round(lookahead * 1000)))
    m = ndimage.minimum_filter1d(need_b, size=2 * la + 1, mode="nearest")
    a = np.exp(-1.0 / (release * 1000))
    g_db = 20 * np.log10(m)
    out = np.empty_like(g_db)
    v = 0.0
    for i, t in enumerate(g_db):                               # instant down, exponential up
        v = t if t < v else a * v + (1 - a) * t
        out[i] = v
    sm = max(1, la // 2)
    g_b = ndimage.uniform_filter1d(10 ** (out / 20), size=2 * sm + 1, mode="nearest")
    centres = (np.arange(nb) + 0.5) * blk
    g = np.minimum(np.interp(np.arange(n), centres, g_b), need)   # numerical safety
    return (st.T * g).T if x.ndim == 2 else x * g


def loudness_report(x: np.ndarray, sr: int = SR) -> str:
    return f"{lufs(x, sr):6.2f} LUFS, sample peak {peak_db(x):6.2f} dBFS, true peak {true_peak_db(x):6.2f} dBTP"
