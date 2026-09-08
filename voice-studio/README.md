# Local voice studio (laptop TTS → Quest files)

Clone a voice on this laptop from **your** MP3s, bake short in-game lines to Opus, copy the `.ogg` files onto the Quest. Do **not** run Chatterbox / PyTorch on the headset.

```
your.mp3  →  clean 24 kHz clips  →  voices/<id>/ref.wav
                                      ↓
                            laptop Chatterbox (batch)
                                      ↓
                      out/voice/<folder>/<line>.ogg
                                      ↓
                 Quest plays files (same idea as bark.mp3)
```

Use only recordings you made, or that you have a **written license** to clone.

## What this is

A tiny Gradio app plus CLI aimed at **Chatterbox** (Resemble, MIT). Zero-shot clone from ~5–10 s of clean speech. Optional GPT-SoVITS fine-tune is *not* wired in — only use it if zero-shot fails the “that’s her” test after a good reference.

| Job | Tool | Why |
|---|---|---|
| Daily driver | Chatterbox | 5–10 s ref, emotion knob, ~4–6 GB VRAM |
| 8 GB laptop fallback | Chatterbox Turbo | Lighter; still needs a reference clip |
| Locked character later | GPT-SoVITS (manual) | 20–60 min + transcripts, a few hours on a 3060-class GPU |
| Placeholder lines | Kokoro / Piper | Not a clone path |

Hardware: RTX 3060 12 GB is plenty. **8 GB works** (this machine is an RTX 5060 Laptop 8 GB). CPU-only is too slow for the quality target.

## Layout

```
voice-studio/
  samples/<voice-id>/     drop raw MP3/WAV here (gitignored)
  voices/<voice-id>/
    ref.wav               6–12 s, one speaker, in-character
    ref.txt               exact words in that wav
    config.json           exaggeration, cfg, sample rate
    clips/                4–12 s cleaned pieces
  lines.json              game-addressable line bank
  out/voice/mira/greet_01.ogg
  out/voice/dog/need_food.ogg
```

Game-side destination after copy:

```
public/human5/assets/voice/mira/greet_01.ogg
public/human5/assets/voice/dog/need_food.ogg
```

Play later the same way as `assets/dog/bark.mp3`:

```js
play(`assets/voice/${voiceId}/${lineId}.ogg`)
```

Do not hook live HTTP TTS into the shipped Quest build. Offline + 72 Hz matters more than a round-trip to the laptop.

## Install (Windows)

Needs **Python 3.11**, **ffmpeg** on PATH, and an NVIDIA GPU.

```bat
cd voice-studio
install.bat
run.bat
```

Manual:

```bat
py -3.11 -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu128
python -m pip install -r requirements.txt
python app.py
```

Open http://127.0.0.1:7860

First generate downloads Chatterbox weights from Hugging Face (a few GB).

## UI (three buttons)

1. **Prepare voice** — drop MP3s for one speaker (or put them in `samples/mira-default/`). Cleans to 24 kHz mono, peaks near −6 dB, cuts 4–12 s clips, picks **one** best 6–12 s take as `ref.wav`. Never averages several MP3s.
2. **Generate test line** — bake the five sentences you actually use (`Hey — you made it.`, `Come here.`, `I am fine.`, a longer idle). If it does not sound like the sample, fix the reference before baking the bank.
3. **Bake voice files** — reads `lines.json`, writes Opus 48 kbps / 24 kHz ogg. Optional copy into `public/human5/assets/voice/`.

Rebake a single id when writing changes. Do not regenerate the whole bank.

## CLI

```bat
:: clean samples
python prep.py --voice mira-default --mood default path\to\take1.mp3 path\to\take2.mp3

:: bake everything missing
python bake.py

:: rebake one line
python bake.py --id greet_01 --force

:: one voice profile only
python bake.py --voice mira-hurt --force

:: copy ogg onto the human5 asset tree (does not change gameplay code)
python copy_to_human5.py

:: optional live laptop server for desktop preview (not for Quest)
python serve.py
:: POST http://127.0.0.1:7861/speak   {"voice":"mira-default","text":"Hey — you made it."}
```

## Sample prep that actually matters

- One speaker per folder. No music, no other voices, no ads.
- 24 kHz mono WAV. 4–12 s pieces. Drop laugh-over-words and clipped starts.
- **30–90 s** of clean speech for a usable zero-shot clone. 10–20 min only if you later fine-tune.
- Loudness: peaks around −6 dB, no brickwall limiter.
- Soft close-mic reads (ASMR-style, recorded by you) → intimate Mira. Distance-mic podcast audio → hallway YouTuber.
- **One reference per mood**, not one ref for everything: `mira-calm`, `mira-hurt`, `mira-play`.
- Keep sentences under ~18 words. Long paragraphs are where local clones fall apart.
- Same text every time (`I'm` vs `I am` changes mouth shape). `lines.json` already uses “I am”.
- Pick the single cleanest take. Averaging raw audio smears the voice.

## Realistic expectation

Zero-shot Chatterbox from a good 10 s clip is already in the “casual listener might not clock it as TTS” zone on short lines. Fine-tune gets closer to a locked character. Neither beats a hired actor on a 3-minute monologue. You do not need that for Mira barks, greetings, and object lines.

## Quality knobs (Chatterbox)

- Default `exaggeration=0.5`, `cfg_weight=0.5` is the sane start.
- Fast talker in the ref → drop `cfg_weight` toward `0.3`.
- More emotion → `exaggeration` ~0.7 and slightly lower cfg.

## License

Studio scripts in this folder are for this project. Chatterbox is MIT (Resemble AI). You are responsible for the rights to every sample you drop in `samples/`.
