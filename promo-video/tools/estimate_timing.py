#!/usr/bin/env python3
"""Provisional narration timing for the TEN10 promo, before a recording exists.

Reads narration/script.<lang>.json and writes narration/timing.<lang>.json in
the schema the film reads (``source: "estimated"``). Once the client's real
recording arrives, run tools/sync_narration.py instead; it writes the same
schema with ``source: "audio"``.

Duration model (calm, warm, non-salesy read):
  * speech time of a phrase = letters / rate
      - letters = alphanumeric characters only (niqqud and punctuation are
        ignored). Latin tokens inside Hebrew count by their characters, so
        "TEN10" = 5 letters (~"טן-טן").
      - rate: he 8.9 letters/s (unvoweled Hebrew), en 12.9 letters/s. These are
        tuned so each language totals ~50-51 s including pauses and lead-in.
  * + 0.12 s for every comma inside the phrase, + 0.20 s for every em-dash
    inside the phrase (trailing punctuation belongs to the pause after it),
  * phrases never shorter than 0.70 s (e.g. the one-word "TEN10."),
  * the gap after a phrase is its ``pauseAfter`` from the script,
  * 0.6 s of silence before the first phrase.

Words: phrase text split on whitespace, surrounding punctuation stripped from
"w" (hyphen-joined tokens such as "ו-TEN10" stay one word). Word times are
proportional to letter count inside [start, end], with the comma/dash time
left as a small gap after the word that carries it.

Example:
  python3 tools/estimate_timing.py --lang he
  python3 tools/estimate_timing.py --lang all
"""

from __future__ import annotations

import argparse
import json
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _ffmpeg import PROJECT_ROOT, resolve_path  # noqa: E402

LANGS = ("he", "en")
RATE = {"he": 8.9, "en": 12.9}      # letters per second of speech
LEAD_IN = 0.6                        # silence before the first phrase (s)
COMMA_EXTRA = 0.12                   # per comma inside a phrase (s)
DASH_EXTRA = 0.20                    # per em/en dash inside a phrase (s)
MIN_PHRASE = 0.70                    # floor for very short phrases (s)
DASHES = "—–"              # em dash, en dash


# ---------------------------------------------------------------- text model
def _is_letter(c: str) -> bool:
    """Letters/digits count; combining marks (niqqud) and punctuation do not."""
    return c.isalnum() and not unicodedata.category(c).startswith("M")


def count_letters(text: str) -> int:
    return sum(1 for c in text if _is_letter(c))


def _strip_token(tok: str) -> str:
    """Strip surrounding punctuation, keep inner characters ("ו-TEN10")."""
    keep = lambda c: _is_letter(c) or unicodedata.category(c).startswith("M")  # noqa: E731
    i, j = 0, len(tok)
    while i < j and not keep(tok[i]):
        i += 1
    while j > i and not keep(tok[j - 1]):
        j -= 1
    return tok[i:j]


def tokenize(text: str) -> list[dict]:
    """Split a phrase into words with their letter counts and internal gaps.

    Returns [{"w", "letters", "gap"}] where ``gap`` is the extra pause (s)
    after the word caused by a comma or dash that is *inside* the phrase.
    """
    words: list[dict] = []
    for tok in text.split():
        w = _strip_token(tok)
        trailing = tok[tok.rfind(w) + len(w):] if w else tok
        if not w:
            # A free-standing punctuation token such as "—" adds to the previous word.
            if words:
                words[-1]["gap"] += DASH_EXTRA * sum(tok.count(d) for d in DASHES)
                words[-1]["gap"] += COMMA_EXTRA * tok.count(",")
            continue
        gap = COMMA_EXTRA * trailing.count(",") + DASH_EXTRA * sum(trailing.count(d) for d in DASHES)
        words.append({"w": w, "letters": max(1, count_letters(w)), "gap": gap})
    if words:
        words[-1]["gap"] = 0.0          # trailing punctuation -> pauseAfter, not speech
    return words


def phrase_model(text: str, lang: str, rate: float | None = None) -> tuple[list[dict], float]:
    """Nominal per-word durations ("dur") + gaps and the phrase speech duration."""
    rate = rate or RATE[lang]
    words = tokenize(text)
    for w in words:
        w["dur"] = w["letters"] / rate
    total = sum(w["dur"] + w["gap"] for w in words)
    if words and total < MIN_PHRASE:
        k = (MIN_PHRASE - sum(w["gap"] for w in words)) / sum(w["dur"] for w in words)
        for w in words:
            w["dur"] *= k
        total = MIN_PHRASE
    return words, total


def distribute(words: list[dict], t0: float, t1: float) -> list[tuple[float, float]]:
    """Spread words (nominal "dur" + "gap") proportionally over [t0, t1]."""
    if not words:
        return []
    last_gap = words[-1]["gap"]  # a gap after the final word would leave dead air
    nominal = sum(w["dur"] + w["gap"] for w in words) - last_gap
    k = (t1 - t0) / nominal if nominal > 0 else 0.0
    out, t = [], t0
    for i, w in enumerate(words):
        s, e = t, t + w["dur"] * k
        out.append((s, e))
        t = e + (w["gap"] * k if i < len(words) - 1 else 0.0)
    out[-1] = (out[-1][0], t1)  # absorb rounding
    return out


# ---------------------------------------------------------------- I/O helpers
def load_script(lang: str, path: str | None = None) -> dict:
    p = resolve_path(path, must_exist=True) if path else PROJECT_ROOT / "narration" / f"script.{lang}.json"
    with open(p, encoding="utf-8") as fh:
        return json.load(fh)


def _r(x: float) -> float:
    return round(float(x), 3)


def make_phrase_entry(pid: str, text: str, start: float, end: float,
                      word_spans: list[tuple[float, float]], words: list[dict]) -> dict:
    return {
        "id": pid, "text": text, "start": _r(start), "end": _r(end),
        "words": [{"w": w["w"], "start": _r(s), "end": _r(e)} for w, (s, e) in zip(words, word_spans)],
    }


def dump_timing(timing: dict, path: Path) -> None:
    """Write timing JSON: readable, one word per line, UTF-8 (no \\u escapes)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    head = {k: v for k, v in timing.items() if k != "phrases"}
    lines = ["{"]
    for k, v in head.items():
        lines.append(f"  {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)},")
    lines.append('  "phrases": [')
    for pi, ph in enumerate(timing["phrases"]):
        meta = {k: v for k, v in ph.items() if k != "words"}
        body = json.dumps(meta, ensure_ascii=False)[:-1]
        lines.append(f"    {body}, \"words\": [")
        for wi, w in enumerate(ph["words"]):
            comma = "," if wi < len(ph["words"]) - 1 else ""
            lines.append(f"      {json.dumps(w, ensure_ascii=False)}{comma}")
        lines.append("    ]}" + ("," if pi < len(timing["phrases"]) - 1 else ""))
    lines.append("  ]")
    lines.append("}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def print_table(timing: dict, file=sys.stdout) -> None:
    """Readable per-phrase table with totals."""
    print(f"\n[{timing['lang']}] source={timing['source']} audioDuration={timing['audioDuration']:.2f}s",
          file=file)
    print(f"{'id':<10} {'start':>7} {'end':>7} {'dur':>6} {'gap':>6}  text", file=file)
    phs = timing["phrases"]
    speech = 0.0
    for i, p in enumerate(phs):
        dur = p["end"] - p["start"]
        speech += dur
        gap = (phs[i + 1]["start"] - p["end"]) if i + 1 < len(phs) else 0.0
        text = p["text"] if len(p["text"]) <= 48 else p["text"][:47] + "…"
        print(f"{p['id']:<10} {p['start']:7.2f} {p['end']:7.2f} {dur:6.2f} {gap:6.2f}  {text}", file=file)
    end = phs[-1]["end"] if phs else 0.0
    lead = phs[0]["start"] if phs else 0.0
    print(f"{'-' * 44}\nspeech {speech:.2f}s + pauses {end - lead - speech:.2f}s + lead-in {lead:.2f}s"
          f" = {end:.2f}s total", file=file)


# ---------------------------------------------------------------- main logic
def estimate(script: dict, rate: float | None = None, lead_in: float = LEAD_IN) -> dict:
    lang = script["lang"]
    t = lead_in
    phrases = []
    for ph in script["phrases"]:
        words, dur = phrase_model(ph["text"], lang, rate)
        spans = distribute(words, t, t + dur)
        phrases.append(make_phrase_entry(ph["id"], ph["text"], t, t + dur, spans, words))
        t += dur + float(ph.get("pauseAfter", 0.0))
    return {
        "lang": lang,
        "source": "estimated",
        "audioFile": None,
        "audioDuration": phrases[-1]["end"] + 0.0 if phrases else 0.0,
        "phrases": phrases,
    }


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lang", required=True, choices=[*LANGS, "all"], help="script language (or 'all')")
    ap.add_argument("--script", help="script JSON (default narration/script.<lang>.json)")
    ap.add_argument("--out", help="output JSON (default narration/timing.<lang>.json); "
                                  "relative paths resolve against promo-video/")
    ap.add_argument("--rate", type=float, help="override letters/second")
    ap.add_argument("--lead-in", type=float, default=LEAD_IN, help="silence before phrase 1 (s, default 0.6)")
    ap.add_argument("--quiet", action="store_true", help="do not print the table")
    args = ap.parse_args(argv)

    langs = LANGS if args.lang == "all" else (args.lang,)
    if len(langs) > 1 and (args.out or args.script):
        ap.error("--out/--script need a single --lang")
    for lang in langs:
        script = load_script(lang, args.script)
        timing = estimate(script, args.rate, args.lead_in)
        out = resolve_path(args.out) if args.out else PROJECT_ROOT / "narration" / f"timing.{lang}.json"
        dump_timing(timing, out)
        if not args.quiet:
            print_table(timing)
        print(f"wrote {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
