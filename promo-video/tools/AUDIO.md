# TEN10 promo: audio and narration timing

The narration recording is the **master timeline**. t=0 of the film is t=0 of
the narration file. The film reads `narration/timing.<lang>.json` and schedules
everything from the phrase ids in it (`hook1` … `tagline`).

| Tool | Does |
|---|---|
| `tools/estimate_timing.py` | Estimated timing from the script, used until a recording exists (`source: "estimated"`) |
| `tools/sync_narration.py` | Aligns a real recording to the script (`source: "audio"`) |
| `tools/audio/synth_music.py` | Procedural product-film score that follows the phrase ids (§4) |
| `tools/audio/synth_sfx.py` | UI sound library → `audio/sfx/*.wav` |
| `tools/audio/mix.py` | Narration + ducked music + SFX → master WAV, plus an optional mux into the MP4 |

All tools use Python 3 with numpy and scipy, plus ffmpeg. ffmpeg is found through
`$FFMPEG`, then `PATH`, then `imageio_ffmpeg`. No ffprobe is needed. Relative
paths are resolved against `promo-video/`, so the tools work from any directory.
Every tool has a `--help`.

```bash
python3 tools/estimate_timing.py --lang all                 # provisional timing (he + en)
python3 tools/sync_narration.py --selftest                  # alignment self-test
python3 tools/audio/synth_music.py --timing narration/timing.he.json --out audio/music_bed.he.wav   # length = timing + 4 s
python3 tools/audio/synth_sfx.py --out audio/sfx/
python3 tools/audio/mix.py --lang he --duration 56.4 --music audio/music_bed.he.wav \
    --sfx-cues renders/he/sfx-cues.json --out renders/he/mix.wav \
    --video renders/he/video.mp4 --final renders/he/TEN10_promo_he_1080p.mp4
```

## 1. Syncing a real recording, step by step

1. **Get one continuous file per language** (WAV or FLAC, 44.1 or 48 kHz, any
   bit depth). The voice-over artist should read the phrases in script order with
   natural pauses. Ask for about 0.5–0.8 s of room tone before the first word and
   at least 2 s after the last one. Don't let anyone add heavy noise reduction or
   gating, and don't have the head trimmed to the first word: whatever silence is
   at the start of the file becomes the film's lead-in.
2. Put it in the project, for example `audio/narration_he.wav`.
3. Run:
   ```bash
   python3 tools/sync_narration.py --lang he --audio audio/narration_he.wav --report
   ```
   This writes `narration/timing.he.json` (`source: "audio"`, `audioFile`
   relative to `promo-video/`, `audioDuration` taken from the file).
4. **Read the report.**
   - `threshold`: the speech/silence level that was used. It is set automatically
     from the noise floor.
   - `seg NN`: the detected speech segments and the gaps between them.
     `<== boundary` marks the gaps that were chosen as phrase boundaries.
   - `boundaries`: the confidence of each boundary, based on the length of its
     gap. `high` means a gap of 0.35 s or more, `medium` 0.2 s or more, `low` less
     than that. `FORCED` means no real pause was found (see below).
   - `per-phrase duration vs expected`: 1.00x means the phrase is exactly as long
     as the letter model predicts at this speaker's pace. A phrase outside
     0.7–1.4x produces a warning.
   - `WARNING`: pauses of 0.45 s or more inside a phrase, forced splits and odd
     phrase lengths. Check each of these by ear.
5. If the report looks wrong, try adjusting detection first:
   - `--threshold -42` (a lower value hears quieter speech; raise it if there is
     noise, breaths or hum),
   - `--min-silence 0.25` (a larger value joins short pauses so they can't
     become boundaries).
6. Fix any remaining details with **overrides** (§3), then re-run the command
   above. Overrides are applied automatically.
7. Re-render the film. It picks up the new timing. Then mix with the voice:
   ```bash
   python3 tools/audio/mix.py --lang he --duration <film s> --music audio/music_bed.he.wav \
       --narration audio/narration_he.wav --sfx-cues renders/he/sfx-cues.json \
       --out renders/he/mix.wav --video renders/he/video.mp4 --final renders/he/TEN10_promo_he_1080p.mp4
   ```
   `mix.py` warns if the timing JSON is still an estimate or was made from a
   different-length file.

The recording is never time-stretched, trimmed or sped up. The only change is a
static gain.

## 2. How the alignment works

1. ffmpeg decodes the file to mono 16 kHz float32, piped as raw `f32le`.
2. An RMS envelope in dBFS is computed with a 30 ms window and a 20 ms hop,
   after an 80 Hz high-pass.
3. Frames above the threshold count as speech. The default threshold is the
   10th percentile of the envelope + 14 dB, clamped to [-50, -28] dBFS. Silences
   shorter than `--min-silence` (default 0.18 s) are merged into the surrounding
   speech. Blips under 70 ms, and weak bursts under 250 ms (breaths, clicks),
   are dropped. The result is K speech segments with K-1 candidate gaps.
4. **Dynamic programming** splits the K segments into the N script phrases, in
   order, by choosing N-1 of the gaps. It maximises:

   `Σ chosen gaps 1.6·ln(1 + gap/0.12 s)` + `Σ phrases −ln(actual/expected)² / 2σ²`

   - The gap term strongly favours long pauses.
   - The duration term is the agreement between each phrase's audio span and
     its expected length. The expected length comes from the same letter-count
     model as `estimate_timing.py`, scaled by the speaker's overall pace.
   - σ is about 16 %, and larger for very short phrases.
   - The pace is estimated, the DP runs, the pace is re-estimated from the
     result, and this repeats until the answer stops changing.
   - A comma pause inside a long phrase is therefore not mistaken for a phrase
     boundary. It would make the neighbouring phrases the wrong length.
5. **If K < N** (the speaker ran phrases together), the deepest energy minima
   inside long segments are offered to the DP as zero-length "forced" gaps, at a
   penalty that is smaller for deeper dips. The DP decides which of them become
   boundaries. The ones it uses are reported as `FORCED (low)` and should be
   checked.
6. Phrase `start` is the speech onset minus a 40 ms pre-roll. Phrase `end` is
   the speech offset.
7. **Words** are placed in proportion to their letter counts, and then snapped
   to internal energy dips of 60 ms or more near their expected boundary. Words
   between two snapped boundaries are re-spread by letters. Word times are good
   for captions and emphasis, not for lip-sync precision.

`--selftest` builds synthetic narrations for both languages and checks that
every phrase edge is recovered within 0.12 s. The synthetic takes use
voiced-like harmonic bursts per word, ±15 % pace jitter per phrase, the script
pauses, comma and dash pauses, micro-pauses, a decoy pause longer than
`--min-silence` inside a phrase, and background noise at −64 dBFS. They go
through the real ffmpeg decode path. Use `--selftest-seeds N` for more random
takes and `--selftest-keep DIR` to keep the WAV and JSON files.

## 3. Overrides

Create `narration/timing.<lang>.overrides.json`. It is picked up automatically;
use `--overrides PATH` to point to another file or `--no-overrides` to ignore it.

```json
{
  "phrases": { "rabbi":    { "start": 38.20 },
               "together": { "start": 41.05, "end": 46.90 } },
  "words":   { "maaser:3": { "start": 20.10 },
               "rabbi:0":  { "start": 38.25, "end": 38.52 } }
}
```

- Times are in seconds of the audio file.
- Phrase keys are phrase ids. Word keys are `<phraseId>:<index>`, where the
  index is **0-based** into that phrase's `words` array in the timing JSON.
- Overrides are applied last:
  1. A phrase override re-spreads that phrase's words inside its new span.
  2. Word overrides are then applied exactly as given.
- The tool warns about unknown ids, and about overlaps or reversed spans that
  the overrides create.

## 4. Music

### The synthesised score (`synth_music.py`)

The score is a warm, restrained product-film bed in D major at about 95 BPM.
Render one per language, because it follows that language's phrase timing:

```bash
python3 tools/audio/synth_music.py --timing narration/timing.he.json --out audio/music_bed.he.wav
python3 tools/audio/synth_music.py --timing narration/timing.en.json --out audio/music_bed.en.wav
#   --duration S   (default: timing audioDuration + 4 s)   --seed N   --bpm 95
#   --no-tempo-fit   --lufs -20   --stems DIR (writes every bus as a WAV)
```

Re-run it whenever the timing changes, including after `sync_narration.py`. The
output is deterministic: the same timing and seed give an identical file.

**Tempo.** The tempo is fitted in two segments, each within ±6 % of `--bpm`,
so that a bar line lands exactly on the logo reveal (`order` start + 0.6 s)
and another exactly on `brand`. The intro can therefore be a few BPM away
from the main groove, which is inaudible because the intro has no drums. The
tool prints both tempi.

**Arrangement** (from the phrase ids):

| Phrases | Music |
|---|---|
| `hook1`–`hook2` | Intro: electric-piano chords and pad (Dmaj9, Gmaj9), a few felt-piano hints of the motif |
| `complex1`–`complex2` | Mild tension: the keys go from quarters to 8ths at a restrained level, the pad filter opens, a bass pedal enters, a soft heartbeat kick and shaker come in over the last 2 bars. Bm7 – Gmaj7 – Em9 – A7sus4 leans towards the arrival |
| `order` + 0.6 s | Arrival on the bar line: soft cymbal with a reverse swell, the groove and the motif start on Dmaj9 |
| `order`–`analytics` | Groove on I – V6 – vi – IV (Dmaj9, A/C#, Bm7, Gmaj9). The motif plays in the 1st and 3rd 4-bar phrases; the 2nd phrase plays a sparse answer so the busiest narration has room |
| `notjust`–`rabbi` | Calm: Gmaj7 – D/F# – Em7 – A7sus4, pad-led, sparse keys and piano, only shaker and a soft kick |
| `platforms` | The groove returns lightly: rim, shaker, lighter keys and bass |
| `together` | Full groove; strings/choir fade in over the last 2 bars (Gmaj9 → A7sus4) |
| `brand` | Bar line and tonic: Dmaj9 resolve, soft kick and cymbal, strings swell, the motif's first phrase played slowly |
| `tagline`–`free` | Warm outro: Dmaj9 – Gmaj9/D – Dmaj9, a final high D, then it rings out; fade over the last 2.5 s |

**Instruments.** Every part is band-limited, and every note and hit has an
envelope with an 8 ms tail fade.

| Part | How it is made |
|---|---|
| Electric piano | FM (1:1 body pair plus 1:14 "tine" pair). Velocity sets the index/brightness. Hammer thump, key-release noise, pitch-dependent decay. Chord strum and ±12 ms timing humanisation |
| Felt piano (motif) | Inharmonic partials, double decay, detuned unison strings on the lower partials, felt-hammer noise, damper release |
| Pad | Detuned polyBLEP saws through a slowly automated low-pass sweep; mid/side width is kept mono-safe |
| Strings/choir | 7 detuned saws per note, delayed vibrato, a formant blend ("ah") and a low-pass. Used only for the resolve |
| Bass | Round finger-style electric bass on the chord roots, with an octave ghost and scale-step passing notes into the next root |
| Drums | Sine-sweep kick with a click; soft snare in an FDN room; rim; closed hats and shaker at 55 % swing with ghost notes; soft cymbal; reverse swell |

**Mix.**
- **EQ:** every part except bass and kick is high-passed, and the keys, piano,
  pad, strings and snare each get a 2–3 dB dip between 2 and 2.6 kHz so the
  voice sits on top.
- **Kick pump:** the kick gently ducks the pad by 3 dB, the bass by 2 dB and the
  keys by 1.2 dB.
- **Compression:** 3:1 on the drum bus and 1.8:1 glue on the mix bus.
- **Reverb and delay:** an 8-line FDN plate (RT60 2.1 s, damped, rendered to an
  IR and FFT-convolved) and a dotted-8th ping-pong delay on the keys and piano.
- **Master:** true-peak limiting, then −20 LUFS integrated with peaks around
  −7 dBFS (the ceiling is −3 dBFS).

Balance lives in `LEVELS` at the top of the file.

### Replacing it with a licensed track

`mix.py` accepts **any file ffmpeg can read** via `--music`:

```bash
python3 tools/audio/mix.py ... --music audio/licensed/track.wav
```

- Don't pre-level the track. The mixer measures its integrated loudness over the
  film length and sets it to `--music-lufs`. If the track sounds too loud or
  quiet under the voice, change `--music-lufs` in 1 dB steps.
- It should be at least as long as the film. A shorter track is padded with
  silence and produces a warning.
- The mixer applies a 0.4 s fade-in and fades out over the last 2.5 s
  (`--music-fade-in` / `--music-fade-out`). If the track has a real ending, edit
  it in a DAW so the ending lands near the `brand` phrase time, which is shown
  in the timing JSON.
- Choose calm, steady material. Builds, drops and busy melodies in the
  200 Hz–4 kHz voice range fight the narration.

## 5. Ducking

| | |
|---|---|
| Depth | 9 dB (`--duck-db`) |
| Attack | 80 ms (`--attack`) |
| Release | 450 ms (`--release`) |
| Look-ahead | 60 ms (`--lookahead`), so the dip starts just before the voice |

- **With `--narration`** the ducking is a real sidechain. An envelope follower
  on the narration (10 ms RMS; soft 6 dB knee above an auto threshold, which is
  `max(noise floor + 12, narration LUFS − 24)`; 120 ms hold across word gaps)
  drives an asymmetric one-pole gain smoother.
- **Without narration** (preview), the key is the phrase spans from the timing
  JSON, run through the same smoother, so the preview already breathes. The
  voice track stays silent.
- The music comes up about 4–5 dB in short 0.35 s pauses and almost fully in
  0.8–0.9 s pauses. It comes all the way up after the last phrase, and then the
  2.5 s fade-out takes over.

## 6. Levels and loudness targets

| Stage | Target |
|---|---|
| Music bed as rendered (`synth_music.py`) | −20 LUFS integrated, sample peak ≤ −3 dBFS |
| SFX files (`synth_sfx.py`) | sample peak −6 dBFS each |
| Narration bus in the mix | −16 LUFS (static gain) |
| Music bus, unducked | −15.5 LUFS (`--music-lufs`), which is about −24.5 LUFS under speech |
| SFX bus | cue `gain` × −20 dB (`--sfx-db`) on the −6 dBFS files, so SFX peaks sit at about −26 dBFS or lower |
| SFX under speech | a further −6 dB (`--sfx-duck-db`, 30 ms / 200 ms) keyed like the music duck |
| **Master (with narration)** | **−16 LUFS integrated, true peak ≤ −1.5 dBTP**, 48 kHz stereo 24-bit WAV |
| Master (preview, no narration) | levels as they would sit under a real voice; only the true-peak ceiling is applied (`--normalize always` forces −16 LUFS) |
| Final MP4 | H.264 video copied as is, AAC-LC 256 kb/s 48 kHz, `+faststart`, audio padded to the full film length (never `-shortest`) |

About the master:

- Loudness is BS.1770-4, implemented in numpy. It is cross-checked against
  ffmpeg `ebur128`, and `mix.py` prints both.
- Normalisation is a static gain followed by a transparent 4x-oversampled
  look-ahead limiter. The two are iterated until the result is within 0.05 LU of
  the target.

SFX files are peak-normalised, so the long sounds (whoosh, sweep, notify,
resolve) carry much more energy than the short ticks. Keep their cue `gain`
around 0.3–0.6, and 0.4–0.8 for the short sounds.
