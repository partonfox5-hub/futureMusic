"""Local voice studio. Drop your MP3s, prepare a clone, bake Quest-ready ogg files."""
from __future__ import annotations

from pathlib import Path

import gradio as gr

from bake import folder_for, load_bank, select_lines
from engine import (
    OUT,
    ROOT,
    bake_line,
    device_note,
    load_model,
    load_voice_cfg,
    pick_device,
    save_wav,
    synthesize,
    wav_to_ogg,
    word_count,
)
from prep import ingest, slug

SAMPLES = ROOT / "samples"
VOICES = ROOT / "voices"


def _as_paths(files) -> list[Path]:
    if not files:
        return []
    if not isinstance(files, list):
        files = [files]
    out = []
    for f in files:
        if f is None:
            continue
        path = getattr(f, "name", f)
        out.append(Path(path))
    return out


def list_voice_ids() -> list[str]:
    ids = []
    if VOICES.exists():
        for p in sorted(VOICES.iterdir()):
            if (p / "ref.wav").exists():
                ids.append(p.name)
    bank = load_bank()
    for vid in bank.get("voices") or {}:
        if vid not in ids and (VOICES / vid / "ref.wav").exists():
            ids.append(vid)
    return ids or ["mira-default"]


def status_header() -> str:
    return (
        device_note(pick_device())
        + "\nUse only recordings you made or have a written license to clone."
        + "\nClone on this laptop. The Quest only plays the baked .ogg files."
    )


def prepare_voice(voice_id: str, files, mood: str, progress=gr.Progress()):
    voice_id = slug(voice_id or "mira-default")
    paths = _as_paths(files)
    extra = SAMPLES / voice_id
    if extra.exists():
        paths.extend(
            sorted(
                p
                for p in extra.iterdir()
                if p.suffix.lower() in {".mp3", ".wav", ".flac", ".m4a", ".ogg", ".aac"}
            )
        )
    # unique, keep order
    seen = set()
    uniq = []
    for p in paths:
        key = str(p.resolve()) if p.exists() else str(p)
        if key in seen:
            continue
        seen.add(key)
        uniq.append(p)
    if not uniq:
        raise gr.Error(
            "Drop MP3/WAV files, or put them in samples/<voice-id>/ then press Prepare voice."
        )
    progress(0.1, desc="Cleaning clips (24 kHz mono, peaks near -6 dB)")
    cfg = ingest(voice_id, uniq, mood=mood or "default")
    ref = VOICES / voice_id / "ref.wav"
    msg = (
        f"Voice `{voice_id}` ready.\n"
        f"Clips: {cfg['clips']}  ·  reference: {cfg['ref_seconds']} s\n"
        f"Picked a single clean take (not an average of several files).\n"
        f"Type the exact words of that take into voices/{voice_id}/ref.txt\n"
        f"Then generate the five test lines. If those do not sound like the sample, "
        f"replace ref.wav before baking the bank."
    )
    return msg, str(ref) if ref.exists() else None, gr.update(choices=list_voice_ids(), value=voice_id)


def generate_test(voice_id, text, exaggeration, cfg_weight, temperature, model_kind, progress=gr.Progress()):
    voice_id = slug(voice_id or "mira-default")
    text = (text or "").strip()
    if not text:
        raise gr.Error("Type a test sentence.")
    n = word_count(text)
    progress(0.05, desc="Loading Chatterbox (first run downloads weights)")
    load_model(model_kind)
    progress(0.4, desc="Generating")
    wav, sr = synthesize(
        text,
        voice_id,
        exaggeration=float(exaggeration),
        cfg_weight=float(cfg_weight),
        temperature=float(temperature),
        model_kind=model_kind,
    )
    dest = ROOT / "out" / "preview" / f"{voice_id}-preview.wav"
    save_wav(wav, sr, dest)
    note = f"{n} words. Clones smear past ~18 words." if n > 18 else f"{n} words."
    return str(dest), note


def bake_bank(voice_filter, only_ids, force, model_kind, copy_human5, progress=gr.Progress()):
    bank = load_bank()
    voices = bank.get("voices") or {}
    ids = (only_ids or "").strip() or None
    voice = (voice_filter or "").strip() or None
    if voice in ("(all prepared)", "all", "*"):
        voice = None
    rows = select_lines(bank, ids, voice)
    # If a filter voice was given but lines.json uses several mira-* ids, keep as-is.
    if not rows:
        raise gr.Error("No matching lines in lines.json")
    progress(0.02, desc="Loading Chatterbox")
    load_model(model_kind)
    results = []
    n = len(rows)
    for i, row in enumerate(rows):
        line_id = row["id"]
        voice_id = row["voice"]
        text = (row.get("text") or "").strip()
        folder = folder_for(voices, voice_id)
        ogg = OUT / folder / f"{line_id}.ogg"
        progress((i + 0.2) / n, desc=f"{folder}/{line_id}")
        if ogg.exists() and not force:
            results.append(f"skip {folder}/{line_id}")
            continue
        try:
            load_voice_cfg(voice_id)
        except FileNotFoundError:
            results.append(f"missing-ref {voice_id}  (prepare that voice first)  {line_id}")
            continue
        info = bake_line(line_id, text, voice_id, folder, model_kind=model_kind)
        flag = " LONG" if info["words"] > 18 else ""
        results.append(f"ok {info['ogg']}{flag}")
    copied = []
    if copy_human5:
        from copy_to_human5 import copy_bank
        copied = copy_bank()
        results.append(f"copied {len(copied)} ogg files -> public/human5/assets/voice/")
    log = "\n".join(results)
    audio_files = sorted(str(p) for p in OUT.rglob("*.ogg"))
    return log, audio_files[:40]


def load_line_table() -> str:
    bank = load_bank()
    lines = []
    for row in bank.get("lines") or []:
        lines.append(f"{row['id']:16}  {row['voice']:16}  {row['text']}")
    return "\n".join(lines)


CSS = """
.gradio-container {max-width: 880px !important;}
footer {display:none !important;}
"""


def build() -> gr.Blocks:
    voice_choices = list_voice_ids()
    with gr.Blocks(title="Voice studio", css=CSS, theme=gr.themes.Soft()) as demo:
        gr.Markdown(
            "# Local voice studio\n"
            "Drop **your** MP3s → prepare a clone → bake `.ogg` files for the Quest. "
            "Chatterbox stays on the laptop. Headset only plays files."
        )
        gr.Markdown(status_header())
        with gr.Tab("1 · Prepare voice"):
            voice_in = gr.Textbox(label="Voice id", value="mira-default",
                                  info="One speaker per id. Use mira-calm / mira-hurt / mira-play for moods.")
            mood = gr.Dropdown(
                ["default", "calm", "hurt", "play"],
                value="default",
                label="Mood (for your notes)",
            )
            files = gr.File(
                label="Vocal samples (mp3 / wav). One speaker. No music, no other voices.",
                file_count="multiple",
                file_types=[".mp3", ".wav", ".flac", ".m4a", ".ogg"],
            )
            gr.Markdown(
                "You can also drop files into `voice-studio/samples/<voice-id>/` "
                "and leave the uploader empty."
            )
            prep_btn = gr.Button("Prepare voice", variant="primary")
            prep_log = gr.Textbox(label="Result", lines=8)
            ref_audio = gr.Audio(label="Chosen reference (single best 6–12 s take)", type="filepath")
        with gr.Tab("2 · Test clone"):
            voice_sel = gr.Dropdown(choices=voice_choices, value=voice_choices[0], label="Voice")
            test_text = gr.Textbox(
                label="Test sentence (keep under ~18 words)",
                value="Hey — you made it.",
            )
            with gr.Row():
                exaggeration = gr.Slider(0.25, 1.2, value=0.5, step=0.05, label="Exaggeration (emotion)")
                cfg_weight = gr.Slider(0.0, 1.0, value=0.5, step=0.05, label="CFG weight (pacing)")
                temperature = gr.Slider(0.4, 1.2, value=0.8, step=0.05, label="Temperature")
            model_kind = gr.Radio(
                ["chatterbox", "turbo"],
                value="chatterbox",
                label="Model (chatterbox = best clone; turbo = lighter on 8 GB)",
            )
            test_btn = gr.Button("Generate test line", variant="primary")
            test_audio = gr.Audio(label="Preview", type="filepath")
            test_note = gr.Textbox(label="Notes", lines=2)
            gr.Markdown(
                "If this does not sound like the sample, replace `voices/<id>/ref.wav` "
                "before you bake 20–200 lines. Do not mix three MP3s into one ref."
            )
        with gr.Tab("3 · Bake Quest files"):
            gr.Markdown("Reads `lines.json`. Writes `out/voice/<folder>/<id>.ogg` (Opus 48 kbps, 24 kHz).")
            line_table = gr.Textbox(label="lines.json", value=load_line_table(), lines=16, interactive=False)
            bake_voice = gr.Textbox(label="Only this voice (blank = all prepared)", placeholder="mira-default")
            bake_ids = gr.Textbox(label="Only these ids (comma, blank = all)", placeholder="greet_01,idle_02")
            with gr.Row():
                force = gr.Checkbox(label="Overwrite existing files", value=False)
                copy_h5 = gr.Checkbox(label="Copy ogg into public/human5/assets/voice/", value=False)
            bake_model = gr.Radio(["chatterbox", "turbo"], value="chatterbox", label="Model")
            bake_btn = gr.Button("Bake voice files", variant="primary")
            bake_log = gr.Textbox(label="Bake log", lines=14)
            bake_files = gr.File(label="Baked files (first 40)", file_count="multiple")

        prep_btn.click(
            prepare_voice,
            [voice_in, files, mood],
            [prep_log, ref_audio, voice_sel],
        )
        test_btn.click(
            generate_test,
            [voice_sel, test_text, exaggeration, cfg_weight, temperature, model_kind],
            [test_audio, test_note],
        )
        bake_btn.click(
            bake_bank,
            [bake_voice, bake_ids, force, bake_model, copy_h5],
            [bake_log, bake_files],
        )
        demo.load(lambda: load_line_table(), outputs=line_table)
    return demo


if __name__ == "__main__":
    print(status_header())
    build().launch(server_name="127.0.0.1", server_port=7860, inbrowser=True, show_error=True)
