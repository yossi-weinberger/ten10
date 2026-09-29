#!/usr/bin/env bash
# One-shot production of a language version.
#
#   tools/produce.sh he                          # provisional timing, no voice (preview mix)
#   tools/produce.sh he audio/narration_he.wav   # sync to the real recording, final mix
#   MUSIC=audio/licensed_track.wav tools/produce.sh en audio/narration_en.wav
#   FORMAT=vertical tools/produce.sh he           # 1080×1920 composition (not a rotation)
#   CUT=symbols tools/produce.sh he               # the feature scenes without app screens (prototype range only)
#
# Steps: (1) timing  (2) frame render  (3) sfx + music bed  (4) mix + mux.
# Output: renders/<lang>/TEN10_promo_<lang>_1080p.mp4
#         renders/<lang>-vertical/TEN10_promo_<lang>_vertical_1080x1920.mp4 (FORMAT=vertical)
set -euo pipefail
cd "$(dirname "$0")/.."
LANG_ID="${1:?usage: tools/produce.sh he|en [narration.wav]}"
NARRATION="${2:-}"
FORMAT="${FORMAT:-landscape}"
if [[ "$FORMAT" == "vertical" ]]; then OUT="renders/$LANG_ID-vertical"; NAME="TEN10_promo_${LANG_ID}_vertical_1080x1920.mp4"
else OUT="renders/$LANG_ID"; NAME="TEN10_promo_${LANG_ID}_1080p.mp4"; fi
CUT="${CUT:-film}"
if [[ "$CUT" == "geo" ]]; then OUT="$OUT-geo"   # the full film in the geometry language keeps the film's file names
elif [[ "$CUT" != "film" ]]; then OUT="$OUT-$CUT"; NAME="TEN10_${CUT}_prototype_${LANG_ID}${FORMAT/landscape/}.mp4"; NAME="${NAME/vertical/_vertical}"; fi

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
node tools/render.mjs --lang "$LANG_ID" --format "$FORMAT" --cut "$CUT" --workers "${WORKERS:-3}"
DURATION="$(python3 -c "import json;print(json.load(open('$OUT/times.json'))['duration'])")"

echo "== 3. sound design"
[[ -f audio/sfx/tap.wav ]] || python3 tools/audio/synth_sfx.py --out audio/sfx/
MUSIC_FILE="${MUSIC:-audio/music_bed.$LANG_ID.wav}"
if [[ -z "${MUSIC:-}" && ( "$CUT" == "film" || ! -f "$MUSIC_FILE" ) ]]; then   # a cut reuses the full film bed
  # MUSIC_GEN=synth_music.py for the calm bed; synth_drive.py (default) is the energetic score
  python3 "tools/audio/${MUSIC_GEN:-synth_drive.py}" --duration "$(python3 -c "print($DURATION + 0.5)")" \
    --timing "narration/timing.$LANG_ID.json" --out "$MUSIC_FILE"
fi

echo "== 4. mix + mux"
if [[ "$CUT" == "film" ]]; then
python3 tools/audio/mix.py --lang "$LANG_ID" --duration "$DURATION" --music "$MUSIC_FILE" \
  --sfx-cues "$OUT/sfx-cues.json" --timing "narration/timing.$LANG_ID.json" \
  ${NARRATION:+--narration "$NARRATION"} \
  --out "$OUT/mix.wav" --video "$OUT/video.mp4" \
  --final "$OUT/$NAME"
else
  # a cut covers only part of the timeline: mix on the film's clock, then take its range
  read -r A B < <(python3 -c "import json;r=json.load(open('$OUT/times.json'))['range'];print(r[0],r[1])")
  python3 tools/audio/mix.py --lang "$LANG_ID" --duration "$DURATION" --music "$MUSIC_FILE" \
    --sfx-cues "$OUT/sfx-cues.json" --timing "narration/timing.$LANG_ID.json" \
    ${NARRATION:+--narration "$NARRATION"} --music-fade-out 0.8 --out "$OUT/mix.wav"
  FF="${FFMPEG:-$(command -v ffmpeg || python3 -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())')}"
  LEN="$(python3 -c "print($B - $A)")"
  "$FF" -y -loglevel error -i "$OUT/video.mp4" -ss "$A" -t "$LEN" -i "$OUT/mix.wav" \
    -af "afade=t=in:d=0.25,afade=t=out:st=$(python3 -c "print($LEN - 0.8)"):d=0.8" \
    -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -movflags +faststart -shortest "$OUT/$NAME"
fi
echo "== done: $OUT/$NAME"
