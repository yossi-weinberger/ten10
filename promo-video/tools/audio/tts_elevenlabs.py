#!/usr/bin/env python3
"""Generate the TEN10 narration with ElevenLabs, one request per phrase.

Each phrase of narration/script.<lang>.json is synthesised on its own, its
leading/trailing silence trimmed, and the phrases are laid end to end with the
same gaps the film is timed to: 0.6 s lead-in, then ``pauseAfter + hold`` after
every phrase. The result is a plain WAV that tools/produce.sh aligns with
tools/sync_narration.py like any studio take:

  python3 tools/audio/tts_elevenlabs.py --lang he --voice <voice_id>
  tools/produce.sh he audio/narration_he.wav

The API key is read from the ELEVENLABS_API_KEY environment variable (never
pass it on the command line). The voice can also come from
ELEVENLABS_VOICE_ID_HE / ELEVENLABS_VOICE_ID_EN. ``--list-voices`` prints the
voices on the account. Per-phrase takes are cached in audio/tts/<lang>/ by a
hash of (text, voice, model, settings), so re-running only pays for changes.

Pronunciation: the written script stays as displayed on screen; SPOKEN below
rewrites it for the voice (TEN10 → "טֶן טֶן", pointed חוֹמֶשׁ, ...), matching the
"recording" version in narration/VO_SCRIPT.md.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import ssl
import sys
import urllib.request
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from _ffmpeg import PROJECT_ROOT, decode_audio  # noqa: E402
from _dsp import write_wav  # noqa: E402

API = "https://api.elevenlabs.io/v1"
SR = 48000
LEAD_IN = 0.6
SPOKEN = {
    "he": [("ו-TEN10", "וטֶן טֶן"), ("TEN10", "טֶן טֶן"), ("ול-PDF", "ולפי-די-אף"), ("חומש", "חוֹמֶשׁ")],
    "en": [("TEN10", "Ten Ten")],
}


def spoken(text: str, lang: str) -> str:
    for a, b in SPOKEN.get(lang, []):
        text = text.replace(a, b)
    return text


def _ctx() -> ssl.SSLContext:
    ca = os.environ.get("SSL_CERT_FILE") or os.environ.get("REQUESTS_CA_BUNDLE")
    return ssl.create_default_context(cafile=ca) if ca else ssl.create_default_context()


def _request(path: str, key: str, body: dict | None = None) -> bytes:
    req = urllib.request.Request(API + path, method="POST" if body is not None else "GET",
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"xi-api-key": key, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, context=_ctx(), timeout=120) as r:
        return r.read()


def trim(x: np.ndarray, thr_db: float = -45.0, pad: float = 0.04) -> np.ndarray:
    """Cut leading/trailing silence, keeping a short pad so consonants are not clipped."""
    env = np.abs(x).max(axis=1)
    thr = 10 ** (thr_db / 20) * max(env.max(), 1e-9)
    idx = np.flatnonzero(env > thr)
    if idx.size == 0:
        return x
    p = int(pad * SR)
    return x[max(0, idx[0] - p): idx[-1] + p]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lang", choices=("he", "en"), default="he")
    ap.add_argument("--voice", help="ElevenLabs voice id (default: $ELEVENLABS_VOICE_ID_<LANG>)")
    ap.add_argument("--model", default="eleven_v3", help="model id (eleven_v3 reads Hebrew)")
    ap.add_argument("--stability", type=float, default=0.5)
    ap.add_argument("--similarity", type=float, default=0.75)
    ap.add_argument("--style", type=float, default=0.0)
    ap.add_argument("--speed", type=float, default=1.0)
    ap.add_argument("--out", help="output wav (default audio/narration_<lang>.wav)")
    ap.add_argument("--list-voices", action="store_true")
    args = ap.parse_args()

    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        print("ELEVENLABS_API_KEY is not set in this environment", file=sys.stderr)
        return 2
    if args.list_voices:
        for v in json.loads(_request("/voices", key))["voices"]:
            labels = ", ".join(f"{k}={val}" for k, val in (v.get("labels") or {}).items())
            print(f"{v['voice_id']}  {v['name']}  [{labels}]")
        return 0
    voice = args.voice or os.environ.get(f"ELEVENLABS_VOICE_ID_{args.lang.upper()}")
    if not voice:
        print("no voice: pass --voice or set ELEVENLABS_VOICE_ID_" + args.lang.upper(), file=sys.stderr)
        return 2

    script = json.loads((PROJECT_ROOT / "narration" / f"script.{args.lang}.json").read_text(encoding="utf-8"))
    cache = PROJECT_ROOT / "audio" / "tts" / args.lang
    cache.mkdir(parents=True, exist_ok=True)
    settings = {"stability": args.stability, "similarity_boost": args.similarity, "style": args.style, "speed": args.speed}
    parts = [np.zeros((int(LEAD_IN * SR), 2), np.float32)]
    for ph in script["phrases"]:
        text = spoken(ph["text"], args.lang)
        h = hashlib.sha1(json.dumps([text, voice, args.model, settings], ensure_ascii=False).encode()).hexdigest()[:12]
        f = cache / f"{ph['id']}_{h}.mp3"
        if not f.exists():
            print(f"  tts {ph['id']}: {text}")
            body = {"text": text, "model_id": args.model, "voice_settings": settings}
            if args.model != "eleven_v3":
                body["language_code"] = args.lang
            f.write_bytes(_request(f"/text-to-speech/{voice}?output_format=mp3_44100_192", key, body))
        x = trim(decode_audio(f, sr=SR, channels=2).astype(np.float32))
        gap = float(ph.get("pauseAfter", 0.0)) + float(ph.get("hold", 0.0))
        parts += [x, np.zeros((int(gap * SR), 2), np.float32)]
    y = np.concatenate(parts)
    y *= 10 ** (-1.0 / 20) / max(np.abs(y).max(), 1e-9)       # peak -1 dBFS; mix.py sets loudness
    out = Path(args.out) if args.out else PROJECT_ROOT / "audio" / f"narration_{args.lang}.wav"
    write_wav(out, y, SR)
    print(f"wrote {out} ({len(y) / SR:.2f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
