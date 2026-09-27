#!/usr/bin/env bash
# One-shot production of a language version.
#
#   tools/produce.sh he                          # provisional timing, no voice (preview mix)
#   tools/produce.sh he audio/narration_he.wav   # sync to the real recording, final mix
#   MUSIC=audio/licensed_track.wav tools/produce.sh en audio/narration_en.wav
#
# Steps: (1) timing  (2) frame render  (3) sfx + music bed  (4) mix + mux.
# Output: renders/<lang>/TEN10_promo_<lang>_1080p.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
LANG_ID="${1:?usage: tools/produce.sh he|en [narration.wav]}"
NARRATION="${2:-}"

if [[ -n "$NARRATION" ]]; then
  echo "== 1. aligning narration → narration/timing.$LANG_ID.json"
  python3 tools/sync_narration.py --lang "$LANG_ID" --audio "$NARRATION" --report
elif [[ ! -f "narration/timing.$LANG_ID.json" ]]; then
  echo "== 1. no recording: estimating provisional timing"
  python3 tools/estimate_timing.py --lang "$LANG_ID"
else
  echo "== 1. using existing narration/timing.$LANG_ID.json ($(python3 -c "import json;print(json.load(open('narration/timing.$LANG_ID.json'))['source'])"))"
fi

echo "== 2. rendering frames"
node tools/render.mjs --lang "$LANG_ID" --workers "${WORKERS:-3}"
DURATION="$(python3 -c "import json;print(json.load(open('renders/$LANG_ID/times.json'))['duration'])")"

echo "== 3. sound design"
[[ -f audio/sfx/tap.wav ]] || python3 tools/audio/synth_sfx.py --out audio/sfx/
MUSIC_FILE="${MUSIC:-audio/music_bed.$LANG_ID.wav}"
if [[ -z "${MUSIC:-}" ]]; then
  python3 tools/audio/synth_music.py --duration "$(python3 -c "print($DURATION + 0.5)")" \
    --timing "narration/timing.$LANG_ID.json" --out "$MUSIC_FILE"
fi

echo "== 4. mix + mux"
python3 tools/audio/mix.py --lang "$LANG_ID" --duration "$DURATION" --music "$MUSIC_FILE" \
  --sfx-cues "renders/$LANG_ID/sfx-cues.json" --timing "narration/timing.$LANG_ID.json" \
  ${NARRATION:+--narration "$NARRATION"} \
  --out "renders/$LANG_ID/mix.wav" --video "renders/$LANG_ID/video.mp4" \
  --final "renders/$LANG_ID/TEN10_promo_${LANG_ID}_1080p.mp4"
echo "== done: renders/$LANG_ID/TEN10_promo_${LANG_ID}_1080p.mp4"
