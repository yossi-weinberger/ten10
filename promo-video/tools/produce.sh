#!/usr/bin/env bash
# One-shot production of a language version.
#
#   tools/produce.sh he                          # provisional timing, no voice (preview mix)
#   tools/produce.sh he audio/narration_he.wav   # sync to the real recording, final mix
#   MUSIC=audio/licensed_track.wav tools/produce.sh en audio/narration_en.wav
#   FORMAT=vertical tools/produce.sh he           # 1080×1920 composition (not a rotation)
#
# Steps: (1) timing  (2) frame render  (3) sfx + music bed  (4) mix + mux.
# Output: renders/<lang>/TEN10_promo_<lang>_1080p.mp4
#         renders/<lang>-vertical/TEN10_promo_<lang>_vertical_1080x1920.mp4 (FORMAT=vertical)
set -euo pipefail
cd "$(dirname "$0")/.."
LANG_ID="${1:?usage: tools/produce.sh he|en [narration.wav]}"
NARRATION="${2:-}"
FORMAT="${FORMAT:-landscape}"
MUSIC_GEN="${MUSIC_GEN:-synth_drive.py}"   # synth_music.py for the calm bed
[[ "$LANG_ID" =~ ^(he|en)$ ]] || { echo "language must be he or en" >&2; exit 2; }
[[ "$FORMAT" =~ ^(landscape|vertical)$ ]] || { echo "FORMAT must be landscape or vertical" >&2; exit 2; }
[[ "$MUSIC_GEN" =~ ^synth_(drive|music)\.py$ ]] || { echo "MUSIC_GEN must be synth_drive.py or synth_music.py" >&2; exit 2; }
if [[ "$FORMAT" == "vertical" ]]; then OUT="renders/$LANG_ID-vertical"; NAME="TEN10_promo_${LANG_ID}_vertical_1080x1920.mp4"
else OUT="renders/$LANG_ID"; NAME="TEN10_promo_${LANG_ID}_1080p.mp4"; fi

if [[ -n "$NARRATION" ]]; then
  echo "== 1. aligning narration → narration/timing.$LANG_ID.json"
  SPANS="${NARRATION%.*}.spans.json"   # exact phrase edges written by tts_elevenlabs.py
  if [[ -f "$SPANS" ]]; then
    python3 tools/sync_narration.py --lang "$LANG_ID" --audio "$NARRATION" --report --overrides "$SPANS"
  else
    python3 tools/sync_narration.py --lang "$LANG_ID" --audio "$NARRATION" --report
  fi
elif [[ ! -f "narration/timing.$LANG_ID.json" ]]; then
  echo "== 1. no recording: estimating provisional timing"
  python3 tools/estimate_timing.py --lang "$LANG_ID"
else
  echo "== 1. using existing narration/timing.$LANG_ID.json ($(python3 -c 'import json, sys; print(json.load(open(sys.argv[1]))["source"])' "narration/timing.$LANG_ID.json"))"
fi

echo "== 2. rendering frames"
node tools/render.mjs --lang "$LANG_ID" --format "$FORMAT" --workers "${WORKERS:-3}"
DURATION="$(python3 -c 'import json, sys; print(json.load(open(sys.argv[1]))["duration"])' "$OUT/times.json")"

echo "== 3. sound design"
MUSIC_FILE="${MUSIC:-audio/music_bed.$LANG_ID.wav}"
if [[ -z "${MUSIC:-}" ]]; then
  python3 "tools/audio/$MUSIC_GEN" --duration "$(python3 -c 'import sys; print(float(sys.argv[1]) + 0.5)' "$DURATION")" \
    --timing "narration/timing.$LANG_ID.json" --out "$MUSIC_FILE"
fi

echo "== 4. mix + mux"
python3 tools/audio/mix.py --lang "$LANG_ID" --duration "$DURATION" --music "$MUSIC_FILE" \
  --sfx-cues "$OUT/sfx-cues.json" --timing "narration/timing.$LANG_ID.json" \
  ${NARRATION:+--narration "$NARRATION"} \
  --out "$OUT/mix.wav" --video "$OUT/video.mp4" \
  --final "$OUT/$NAME"
echo "== done: $OUT/$NAME"
