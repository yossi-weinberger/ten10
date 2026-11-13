"""Shared ffmpeg helpers for the TEN10 promo audio tools.

Lookup order for the ffmpeg binary:
  1. the FFMPEG environment variable (path to an executable),
  2. ``ffmpeg`` on PATH (shutil.which),
  3. the binary bundled with the ``imageio_ffmpeg`` Python package.

There is intentionally no ffprobe dependency: durations are derived from
decoded sample counts, or parsed from ``ffmpeg -i`` stderr for video.
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
from functools import lru_cache
from pathlib import Path

import numpy as np

# promo-video/ (this file lives in promo-video/tools/)
PROJECT_ROOT = Path(__file__).resolve().parent.parent


@lru_cache(maxsize=1)
def find_ffmpeg() -> str:
    """Return the path of a usable ffmpeg executable or raise RuntimeError."""
    env = os.environ.get("FFMPEG")
    if env:
        if Path(env).is_file() and os.access(env, os.X_OK):
            return env
        found = shutil.which(env)
        if found:
            return found
        raise RuntimeError(f"FFMPEG={env!r} is not an executable")
    found = shutil.which("ffmpeg")
    if found:
        return found
    try:
        import imageio_ffmpeg  # type: ignore

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception as exc:  # pragma: no cover - depends on the machine
        raise RuntimeError(
            "ffmpeg not found: set FFMPEG=/path/to/ffmpeg, put ffmpeg on PATH, "
            "or `pip install imageio-ffmpeg`"
        ) from exc


def run_ffmpeg(args: list[str], *, capture: bool = False, input_bytes: bytes | None = None
               ) -> subprocess.CompletedProcess:
    """Run ffmpeg with ``args`` (without the executable). Raises on failure."""
    cmd = [find_ffmpeg(), "-hide_banner", "-nostdin", *args]
    proc = subprocess.run(
        cmd,
        input=input_bytes,
        stdout=subprocess.PIPE if capture else subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    if proc.returncode != 0:
        tail = proc.stderr.decode("utf-8", "replace")[-2000:]
        raise RuntimeError(f"ffmpeg failed ({proc.returncode}): {' '.join(cmd)}\n{tail}")
    return proc


def decode_audio(path: str | os.PathLike, sr: int = 48000, channels: int = 2) -> np.ndarray:
    """Decode any audio file ffmpeg understands to float32 PCM.

    Returns an array of shape (n,) for mono or (n, channels) otherwise, at
    sample rate ``sr``. Audio is piped through stdout as raw ``f32le``.
    """
    proc = run_ffmpeg(
        ["-i", str(path), "-vn", "-map", "0:a:0", "-ac", str(channels), "-ar", str(sr),
         "-f", "f32le", "-acodec", "pcm_f32le", "pipe:1"],
        capture=True,
    )
    data = np.frombuffer(proc.stdout, dtype="<f4").astype(np.float32)
    if channels > 1:
        data = data[: len(data) // channels * channels].reshape(-1, channels)
    return data


def media_duration(path: str | os.PathLike) -> float | None:
    """Container duration in seconds parsed from ``ffmpeg -i`` (None if unknown)."""
    proc = subprocess.run([find_ffmpeg(), "-hide_banner", "-i", str(path)],
                          stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", proc.stderr.decode("utf-8", "replace"))
    if not m:
        return None
    h, mnt, s = m.groups()
    return int(h) * 3600 + int(mnt) * 60 + float(s)


def video_fps(path: str | os.PathLike) -> float | None:
    """Frame rate of the first video stream parsed from ``ffmpeg -i`` (None if unknown)."""
    proc = subprocess.run([find_ffmpeg(), "-hide_banner", "-i", str(path)],
                          stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    m = re.search(r"Video:.*?(\d+(?:\.\d+)?) fps", proc.stderr.decode("utf-8", "replace"))
    return float(m.group(1)) if m else None


def resolve_path(p: str | os.PathLike | None, *, must_exist: bool = False) -> Path | None:
    """Resolve a CLI path.

    Absolute paths are used as-is. Relative paths are resolved against the
    promo-video/ project root, so the tools behave the same from any cwd.
    For inputs (``must_exist``) a path relative to the current working
    directory is accepted as a fallback.
    """
    if p is None:
        return None
    p = Path(p).expanduser()
    if p.is_absolute():
        return p
    rooted = PROJECT_ROOT / p
    if must_exist and not rooted.exists() and (Path.cwd() / p).exists():
        return (Path.cwd() / p).resolve()
    return rooted


def rel_to_project(p: Path) -> str:
    """Path relative to promo-video/ (with ../ if outside), POSIX separators."""
    return Path(os.path.relpath(Path(p).resolve(), PROJECT_ROOT)).as_posix()
