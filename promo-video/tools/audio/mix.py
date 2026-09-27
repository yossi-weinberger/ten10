#!/usr/bin/env python3
"""Final mix (narration + ducked music + SFX) and optional mux with the film.

Timeline: t=0 is t=0 of the narration file. Narration is never stretched,
trimmed or sped up (only a static gain is applied); if it is longer than
--duration the timeline is extended to fit it.

Buses (levels before the master stage, referenced to narration at -16 LUFS)
  narration  static gain to --narration-lufs (default -16 LUFS integrated)
  music      static gain so the *unducked* bed sits at --music-lufs (default
             -15.5), i.e. about -24.5 LUFS while ducked by 9 dB under speech;
             fade-in 0.4 s, fade-out over the last 2.5 s
  sfx        each cue: <sfx-dir>/<type>.wav * gain * --sfx-db (default -20 dB),
             further ducked --sfx-duck-db (default 6 dB) while the voice speaks

Ducking (music under voice), attack 80 ms / release 450 ms / depth 9 dB,
60 ms look-ahead:
  * with --narration: a real sidechain - an envelope follower on the
    narration itself (10 ms RMS, soft knee above an auto threshold, 120 ms
    hold to bridge word gaps) drives the gain reduction;
  * without it (preview): the key comes from the phrase spans in the timing
    JSON, so the music already breathes where the voice will be. No audio is
    put in place of the voice.

Master: with narration, the whole mix is normalised to -16 LUFS integrated;
true peak is limited to <= -1.5 dBTP (look-ahead limiter, 4x oversampled).
Without narration (--normalize auto) the bus levels are kept as they would
be under a real voice (so the preview's music level is honest) and only the
true-peak ceiling is enforced; use --normalize always to force -16 LUFS.

Mux (--video + --final): H.264 video stream-copied, AAC 256 kb/s audio,
+faststart; nothing is cut to the shorter stream - audio is padded with
silence to the video length and, if the video is shorter than the audio, its
last frame is held (this one case re-encodes the video, with a warning).

sfx-cues.json (written by the film):
  { "duration": 56.4, "cues": [ {"t": 3.21, "type": "tick", "gain": 0.5}, ... ] }
  optional per cue: "pan" in [-1, 1].

Example:
  python3 tools/audio/mix.py --lang he --duration 56.4 --music audio/music_bed.wav \\
      --sfx-cues renders/he/sfx-cues.json --timing narration/timing.he.json \\
      --out renders/he/mix.wav --video renders/he/video.mp4 \\
      --final renders/he/TEN10_promo_he_1080p.mp4
"""

from __future__ import annotations

import argparse
import json
import math
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import _dsp  # noqa: E402
from _ffmpeg import (PROJECT_ROOT, find_ffmpeg, media_duration, resolve_path, run_ffmpeg,  # noqa: E402
                     video_fps)

SR = _dsp.SR
CTRL = 1000          # control rate for gain curves (Hz)


def warn(msg: str) -> None:
    print(f"WARNING: {msg}")


# ------------------------------------------------------------------ inputs
def fit_length(x: np.ndarray, n: int) -> np.ndarray:
    return x[:n] if len(x) >= n else np.pad(x, ((0, n - len(x)), (0, 0)))


def load_cues(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        data = {"cues": data}
    return data


def render_sfx(cues: list[dict], n: int, sfx_dir: Path, bus_db: float) -> tuple[np.ndarray, int]:
    out = np.zeros((n, 2))
    cache: dict[str, np.ndarray | None] = {}
    placed = 0
    for c in cues:
        typ, t = str(c.get("type", "")), float(c.get("t", -1))
        if typ not in cache:
            f = sfx_dir / f"{typ}.wav"
            cache[typ] = _dsp.read_audio(f) if f.exists() else None
            if cache[typ] is None:
                warn(f"no sfx file for type '{typ}' ({f}); cues of this type skipped")
        x = cache[typ]
        if x is None:
            continue
        i0 = int(round(t * SR))
        if t < 0 or i0 >= n:
            warn(f"cue {typ} at {t:.2f}s is outside the timeline; skipped")
            continue
        g = float(c.get("gain", 1.0)) * _dsp.db2lin(bus_db)
        pan = float(np.clip(c.get("pan", 0.0), -1, 1))
        a = (pan + 1) * math.pi / 4
        gl, gr = math.cos(a) * math.sqrt(2), math.sin(a) * math.sqrt(2)
        m = min(len(x), n - i0)
        seg = x[:m].copy()
        if m < len(x):                                  # cut by the end: short fade
            seg = _dsp.fade(seg, SR, fade_out=min(0.02, m / SR))
        out[i0:i0 + m, 0] += seg[:, 0] * g * gl
        out[i0:i0 + m, 1] += seg[:, 1] * g * gr
        placed += 1
    return out, placed


# ------------------------------------------------------------------ ducking
def key_from_narration(narr: np.ndarray, narr_lufs: float) -> tuple[np.ndarray, float]:
    """Sidechain key (0..1 at CTRL Hz) from the narration's own envelope."""
    mono = narr.mean(axis=1)
    hop = SR // CTRL
    win = int(0.010 * SR)
    n = len(mono) // hop
    c = np.concatenate([[0.0], np.cumsum(np.pad(mono, (win // 2, win)) ** 2)])
    idx = np.arange(n) * hop
    env_db = 10 * np.log10((c[idx + win] - c[idx]) / win + 1e-12)
    floor = float(np.percentile(env_db, 10))
    thr = max(floor + 12.0, narr_lufs - 24.0)            # speech is well above this
    key = np.clip((env_db - thr) / 6.0, 0.0, 1.0)         # 6 dB soft knee
    key = ndimage.maximum_filter1d(key, size=int(0.12 * CTRL) * 2 + 1)   # 120 ms hold
    return key, thr


def key_from_timing(timing: dict, n: int) -> np.ndarray:
    key = np.zeros(n)
    for p in timing["phrases"]:
        a, b = int(p["start"] * CTRL), int(math.ceil(p["end"] * CTRL))
        key[max(0, a):max(0, min(n, b))] = 1.0
    return key


def duck_gain(key: np.ndarray, depth_db: float, attack: float, release: float, lookahead: float,
              n_audio: int) -> tuple[np.ndarray, np.ndarray]:
    """Key -> smoothed gain (dB at CTRL rate) -> linear gain at audio rate."""
    la = int(lookahead * CTRL)
    k = np.concatenate([key[la:], np.zeros(la)]) if la else key
    target = -depth_db * k
    g_db = _dsp.one_pole_ar(target, CTRL, attack, release, start=0.0)
    t_ctrl = np.arange(len(g_db)) / CTRL
    g = np.interp(np.arange(n_audio) / SR, t_ctrl, 10 ** (g_db / 20))
    return g, g_db


# ------------------------------------------------------------------ master
def master(mix: np.ndarray, target_lufs: float | None, tp_ceiling: float) -> tuple[np.ndarray, float]:
    """Optional loudness normalisation + true-peak limiting (iterated twice)."""
    gain_db = 0.0
    y = mix
    for _ in range(6):
        if target_lufs is not None:
            g = target_lufs - _dsp.lufs(y, SR)
            gain_db += g
            y = mix * _dsp.db2lin(gain_db)
        y = _dsp.limit_true_peak(y, tp_ceiling - 0.1, SR)     # 0.1 dB safety for inter-sample
        if target_lufs is None or abs(_dsp.lufs(y, SR) - target_lufs) < 0.05:
            break
    if _dsp.true_peak_db(y) > tp_ceiling:                   # belt and braces
        y = y * _dsp.db2lin(tp_ceiling - 0.05 - _dsp.true_peak_db(y))
    return y, gain_db


def ffmpeg_ebur128(path: Path) -> str:
    proc = subprocess.run([find_ffmpeg(), "-hide_banner", "-nostats", "-i", str(path), "-af",
                           "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True)
    i = re.findall(r"I:\s+(-?[\d.]+) LUFS", proc.stderr)
    tp = re.findall(r"Peak:\s+(-?[\d.inf]+) dBFS", proc.stderr)
    return f"ffmpeg ebur128: I {i[-1] if i else '?'} LUFS, true peak {tp[-1] if tp else '?'} dBFS"


def mux(video: Path, audio: Path, final: Path, audio_dur: float) -> None:
    vdur = media_duration(video)
    fps = video_fps(video) or 30.0
    if vdur is None:
        raise RuntimeError(f"cannot read duration of {video}")
    target = max(audio_dur, vdur)
    args = ["-y", "-i", str(video), "-i", str(audio), "-map", "0:v:0", "-map", "1:a:0"]
    if vdur < audio_dur - 0.5 / fps:
        warn(f"video ({vdur:.3f}s) is shorter than the audio ({audio_dur:.3f}s): holding its last frame "
             f"(video is re-encoded for this; better: render the film to the full duration)")
        args += ["-vf", f"tpad=stop_mode=clone:stop_duration={audio_dur - vdur + 1.0 / fps:.3f}",
                 "-c:v", "libx264", "-preset", "slow", "-crf", "15", "-pix_fmt", "yuv420p"]
    else:
        args += ["-c:v", "copy"]
    args += ["-af", f"apad=whole_dur={target:.3f}", "-c:a", "aac", "-b:a", "256k", "-ar", str(SR),
             "-t", f"{target:.3f}", "-movflags", "+faststart", str(final)]
    final.parent.mkdir(parents=True, exist_ok=True)
    run_ffmpeg(args)
    print(f"muxed {final} ({media_duration(final):.3f}s; video {vdur:.3f}s, audio {audio_dur:.3f}s)")


# ------------------------------------------------------------------ main
def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lang", required=True, choices=["he", "en"])
    ap.add_argument("--duration", type=float, help="film duration (s); default: sfx-cues 'duration'")
    ap.add_argument("--music", required=True, help="music bed (any format ffmpeg reads)")
    ap.add_argument("--sfx-cues", help="sfx-cues.json from the film (optional)")
    ap.add_argument("--sfx-dir", default="audio/sfx", help="folder with <type>.wav (default audio/sfx)")
    ap.add_argument("--narration", help="narration recording; omit for a music+sfx preview")
    ap.add_argument("--timing", help="timing JSON (default narration/timing.<lang>.json)")
    ap.add_argument("--out", required=True, help="output mix WAV (48 kHz stereo 24-bit)")
    ap.add_argument("--video", help="rendered film (video only or with audio; its audio is ignored)")
    ap.add_argument("--final", help="muxed output .mp4 (needs --video)")
    g = ap.add_argument_group("levels")
    g.add_argument("--narration-lufs", type=float, default=-16.0, help="narration bus level (LUFS)")
    g.add_argument("--music-lufs", type=float, default=-15.5,
                   help="unducked music level (LUFS); ducked = this - duck depth")
    g.add_argument("--duck-db", type=float, default=9.0, help="duck depth under speech (dB)")
    g.add_argument("--attack", type=float, default=0.08, help="duck attack (s)")
    g.add_argument("--release", type=float, default=0.45, help="duck release (s)")
    g.add_argument("--lookahead", type=float, default=0.06, help="duck look-ahead (s)")
    g.add_argument("--sfx-db", type=float, default=-20.0, help="SFX bus gain (dB) on the -6 dBFS files")
    g.add_argument("--sfx-duck-db", type=float, default=6.0,
                   help="extra SFX attenuation while the voice speaks (dB; same key as the music duck, "
                        "faster 30 ms / 200 ms envelope) so no effect competes with a consonant")
    g.add_argument("--music-fade-in", type=float, default=0.4)
    g.add_argument("--music-fade-out", type=float, default=2.5)
    g.add_argument("--target-lufs", type=float, default=-16.0, help="master loudness (LUFS)")
    g.add_argument("--true-peak", type=float, default=-1.5, help="master true-peak ceiling (dBTP)")
    g.add_argument("--normalize", choices=["auto", "always", "never"], default="auto",
                   help="loudness-normalise the master (auto = only when narration is present)")
    args = ap.parse_args(argv)
    if bool(args.video) != bool(args.final):
        ap.error("--video and --final go together")

    # ---- timeline length
    cues_doc = {}
    if args.sfx_cues:
        cues_doc = load_cues(resolve_path(args.sfx_cues, must_exist=True))
    duration = args.duration or cues_doc.get("duration")
    timing_path = resolve_path(args.timing, must_exist=True) if args.timing else \
        PROJECT_ROOT / "narration" / f"timing.{args.lang}.json"
    timing = json.loads(timing_path.read_text(encoding="utf-8")) if timing_path.exists() else None
    if args.timing and timing is None:
        ap.error(f"timing not found: {timing_path}")

    narr = None
    if args.narration:
        npath = resolve_path(args.narration, must_exist=True)
        narr = _dsp.read_audio(npath)
        ndur = len(narr) / SR
        if timing and timing.get("source") == "audio" and abs(timing.get("audioDuration", ndur) - ndur) > 0.05:
            warn(f"timing audioDuration {timing['audioDuration']:.3f}s != narration {ndur:.3f}s - "
                 "re-run tools/sync_narration.py for this recording")
        if timing and timing.get("source") != "audio":
            warn("timing JSON is an estimate; run tools/sync_narration.py on this recording")
        if duration is None:
            duration = ndur + 3.0
        if ndur > duration:
            warn(f"narration ({ndur:.2f}s) is longer than --duration; extending the timeline")
            duration = ndur
    if duration is None:
        duration = (timing["audioDuration"] + 4.0) if timing else None
    if duration is None:
        ap.error("cannot infer the duration; pass --duration")
    n = int(round(duration * SR))
    print(f"timeline {duration:.3f}s ({n} samples @ {SR} Hz)")

    # ---- narration bus
    narr_bus = np.zeros((n, 2))
    if narr is not None:
        nl = _dsp.lufs(narr, SR)
        narr_bus = fit_length(narr * _dsp.db2lin(args.narration_lufs - nl), n)
        print(f"narration: {len(narr) / SR:.3f}s, {nl:.2f} LUFS -> {args.narration_lufs:.1f} LUFS "
              f"({args.narration_lufs - nl:+.2f} dB static gain)")
    else:
        print("narration: none (preview) - voice track left silent")

    # ---- music bus
    mpath = resolve_path(args.music, must_exist=True)
    music = _dsp.read_audio(mpath)
    if len(music) < n:
        warn(f"music ({len(music) / SR:.2f}s) is shorter than the timeline; padded with silence")
    music = fit_length(music, n)
    ml = _dsp.lufs(music, SR)
    music *= _dsp.db2lin(args.music_lufs - ml)
    music = _dsp.fade(music, SR, args.music_fade_in, args.music_fade_out)

    # ---- ducking
    n_ctrl = int(math.ceil(duration * CTRL)) + 1
    if narr is not None:
        key, thr = key_from_narration(narr_bus, args.narration_lufs)
        key = np.pad(key, (0, max(0, n_ctrl - len(key))))[:n_ctrl]
        src = f"sidechain on narration (key threshold {thr:.1f} dBFS)"
    elif timing:
        key = key_from_timing(timing, n_ctrl)
        src = f"timing spans from {timing_path.name} (source={timing.get('source')})"
    else:
        key = np.zeros(n_ctrl)
        src = "none (no narration and no timing)"
        warn("no narration and no timing: music is not ducked")
    gain, g_db = duck_gain(key, args.duck_db, args.attack, args.release, args.lookahead, n)
    music *= gain[:, None]
    in_speech = key[: len(g_db)] > 0.5
    print(f"music: {mpath.name} {ml:.2f} LUFS -> {args.music_lufs:.1f} LUFS unducked; ducking: {src}")
    if in_speech.any():
        print(f"  duck: mean gain {g_db[in_speech].mean():.1f} dB under speech, "
              f"{g_db[~in_speech].mean():.1f} dB elsewhere; music bus now {_dsp.lufs(music, SR):.1f} LUFS")

    # ---- sfx bus (ducked under the voice too, brief §25)
    sfx_bus = np.zeros((n, 2))
    cues = cues_doc.get("cues", [])
    if cues:
        sfx_bus, placed = render_sfx(cues, n, resolve_path(args.sfx_dir, must_exist=True), args.sfx_db)
        if args.sfx_duck_db > 0 and key.any():
            sgain, _ = duck_gain(key, args.sfx_duck_db, 0.03, 0.20, args.lookahead, n)
            sfx_bus *= sgain[:, None]
        print(f"sfx: {placed}/{len(cues)} cues placed at {args.sfx_db:.0f} dB bus gain, "
              f"-{args.sfx_duck_db:.0f} dB under speech; bus peak {_dsp.peak_db(sfx_bus):.1f} dBFS")

    # ---- master
    mix = narr_bus + music + sfx_bus
    normalize = args.normalize == "always" or (args.normalize == "auto" and narr is not None)
    print(f"pre-master: {_dsp.loudness_report(mix)}")
    out_mix, gdb = master(mix, args.target_lufs if normalize else None, args.true_peak)
    if not normalize:
        print("master: no loudness normalisation (preview without narration keeps voice-referenced "
              "levels; use --normalize always to force)")
    else:
        print(f"master: {gdb:+.2f} dB to {args.target_lufs:.1f} LUFS")
    out = resolve_path(args.out)
    _dsp.write_wav(out, out_mix, SR, bits=24)
    print(f"wrote {out}: {_dsp.loudness_report(out_mix)}")
    print("  " + ffmpeg_ebur128(out))

    if args.video:
        mux(resolve_path(args.video, must_exist=True), out, resolve_path(args.final), duration)
    return 0


if __name__ == "__main__":
    sys.exit(main())
