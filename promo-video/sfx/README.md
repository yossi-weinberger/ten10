# Sound effects

The film places one sound per on-screen action (`cue(t, type, gain)` in `film/geo.js`); `tools/audio/mix.py` plays
`sfx/<type>.wav` at each cue. Every file starts on its onset, is trimmed short, faded at the end and peak-normalised to −6 dBFS
(48 kHz stereo).

Most are ElevenLabs Sound Effects v2 generations (through fal.ai, `fal-ai/elevenlabs/sound-effects/v2`, `prompt_influence`
0.6), so they are kept here rather than regenerated: the same prompt gives a different take. The two transitions are the
film's original procedural sounds, 10 dB down, because the generated swooshes stood out.

| File | Length | Source |
|---|---|---|
| `arrive` | 0.30 s | ElevenLabs SFX v2: "soft muted thud of a UI card landing in place, light, gentle, clean" (0.5 s, trimmed to 0.3 s) |
| `bell` | 1.40 s | ElevenLabs SFX v2: "a small reception desk bell ringing once, gentle, clear ding" (1.5 s, trimmed to 1.4 s) |
| `book_open` | 0.60 s | ElevenLabs SFX v2: "a hardcover book being opened, soft pages, short, close" (0.8 s, trimmed to 0.6 s) |
| `coins` | 0.60 s | ElevenLabs SFX v2: "a few coins dropping into a jar, soft, short, close" (0.8 s, trimmed to 0.6 s) |
| `file_drop` | 0.35 s | ElevenLabs SFX v2: "a single document file dropping onto a desk, soft paper thump, close, no reverb" (0.6 s, trimmed to 0.35 s) |
| `flutter` | 0.70 s | ElevenLabs SFX v2: "a few light paper notes fluttering away, soft quick flutter, short" (0.8 s, trimmed to 0.7 s) |
| `insight` | 0.70 s | ElevenLabs SFX v2: "a soft sparkling ding, an idea lightbulb turning on, gentle, magical, short" (0.8 s, trimmed to 0.7 s) |
| `mail` | 0.45 s | ElevenLabs SFX v2: "an email message sliding in, soft quick swish with a light paper sound, short" (0.6 s, trimmed to 0.45 s) |
| `notify` | 1.00 s | ElevenLabs SFX v2: "pleasant soft two-note notification chime of a modern phone app, gentle, clean" (1.0 s, trimmed to 1.0 s) |
| `pop` | 0.18 s | ElevenLabs SFX v2: "small soft bubble pop of a UI element appearing, light, clean" (0.5 s, trimmed to 0.18 s) |
| `printer` | 1.60 s | ElevenLabs SFX v2: "a small office printer printing one page, mechanical feed, short" (2.0 s, trimmed to 1.6 s) |
| `rise` | 0.30 s | ElevenLabs SFX v2: "a soft rising pluck bloop, a bar chart column growing, playful, short" (0.5 s, trimmed to 0.3 s) |
| `row` | 0.18 s | ElevenLabs SFX v2: "one very short soft card sliding into a stack, subtle paper slide, close, quiet" (0.5 s, trimmed to 0.18 s) |
| `send` | 0.45 s | ElevenLabs SFX v2: "a chat message being sent, soft quick upward swoosh with a light pop, modern app, short" (0.6 s, trimmed to 0.45 s) |
| `snap` | 0.20 s | ElevenLabs SFX v2: "a satisfying soft click of a piece snapping into place, clean, close, no reverb" (0.5 s, trimmed to 0.2 s) |
| `stamp` | 0.30 s | ElevenLabs SFX v2: "a rubber stamp pressed firmly onto paper, single crisp stamp, close, no reverb" (0.6 s, trimmed to 0.3 s) |
| `sweep` | 1.10 s | procedural (the film's original synth transition), −10 dB |
| `tap` | 0.15 s | ElevenLabs SFX v2: "single soft click of a modern app button being tapped, clean, close, no reverb" (0.5 s, trimmed to 0.15 s) |
| `tick` | 0.07 s | ElevenLabs SFX v2: "one very short subtle soft tick, like a counter digit changing, quiet, clean, no reverb" (0.5 s, trimmed to 0.07 s) |
| `toggle` | 0.15 s | ElevenLabs SFX v2: "a soft UI toggle switch flipping on, single click, clean" (0.5 s, trimmed to 0.15 s) |
| `type` | 0.12 s | ElevenLabs SFX v2: "one single soft laptop keyboard key press, close, clean, no reverb" (0.5 s, trimmed to 0.12 s) |
| `whoosh` | 0.60 s | procedural (the film's original synth transition), −10 dB |
| `window` | 0.35 s | ElevenLabs SFX v2: "a soft UI window opening, light airy pop with a gentle rise, modern app, short" (0.5 s, trimmed to 0.35 s) |
