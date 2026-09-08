"""Chatterbox wrapper. Clone on the laptop; never run this on the Quest."""
from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VOICES = ROOT / "voices"
OUT = ROOT / "out" / "voice"
SR_OUT = 24000

_model = None
_model_kind = None
_device = None


def ffmpeg_bin() -> str:
    exe = shutil.which("ffmpeg")
    if not exe:
        raise RuntimeError("ffmpeg is not on PATH. Install ffmpeg and reopen the terminal.")
    return exe


def pick_device() -> str:
    try:
        import torch
        if torch.cuda.is_available():
            return "cuda"
        if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            return "mps"
    except ImportError:
        pass
    return "cpu"


def device_note(device: str) -> str:
    if device == "cpu":
        return (
            "Running on CPU. Usable for a smoke test, too slow for a full bake. "
            "An 8 GB NVIDIA GPU is the quality target."
        )
    try:
        import torch
        if device == "cuda":
            name = torch.cuda.get_device_name(0)
            gb = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
            return f"GPU: {name} ({gb:.1f} GB). Original Chatterbox wants ~4–6 GB VRAM."
    except Exception:
        pass
    return f"Device: {device}"


def load_model(kind: str | None = None):
    """kind: chatterbox (default, best clone) or turbo (lighter, 8 GB friendly)."""
    global _model, _model_kind, _device
    kind = (kind or os.environ.get("VOICE_STUDIO_MODEL") or "chatterbox").lower()
    if kind in ("original", "default", "english"):
        kind = "chatterbox"
    if _model is not None and _model_kind == kind:
        return _model
    _device = pick_device()
    try:
        if kind == "turbo":
            from chatterbox.tts_turbo import ChatterboxTurboTTS
            _model = ChatterboxTurboTTS.from_pretrained(device=_device)
        else:
            from chatterbox.tts import ChatterboxTTS
            _model = ChatterboxTTS.from_pretrained(device=_device)
            kind = "chatterbox"
    except ImportError as e:
        raise RuntimeError(
            "Chatterbox is not installed. From voice-studio: "
            "python -m pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu128 "
            "then python -m pip install -r requirements.txt"
        ) from e
    _model_kind = kind
    return _model


def voice_dir(voice_id: str) -> Path:
    return VOICES / voice_id


def load_voice_cfg(voice_id: str) -> dict:
    cfg_path = voice_dir(voice_id) / "config.json"
    if not cfg_path.exists():
        raise FileNotFoundError(
            f"No voice profile at voices/{voice_id}/. Drop samples in the UI and press Prepare voice."
        )
    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    ref = voice_dir(voice_id) / (cfg.get("ref") or "ref.wav")
    if not ref.exists():
        raise FileNotFoundError(f"Missing {ref}. Re-run Prepare voice.")
    cfg["ref_path"] = str(ref)
    return cfg


def word_count(text: str) -> int:
    return len([w for w in (text or "").replace("—", " ").split() if w])


def synthesize(
    text: str,
    voice_id: str,
    *,
    exaggeration: float | None = None,
    cfg_weight: float | None = None,
    temperature: float | None = None,
    model_kind: str | None = None,
):
    """Return (waveform 2D cpu tensor, sample_rate)."""
    import torch
    import torchaudio as ta

    text = (text or "").strip()
    if not text:
        raise ValueError("Empty line.")
    cfg = load_voice_cfg(voice_id)
    model = load_model(model_kind)
    ex = float(cfg.get("exaggeration", 0.5) if exaggeration is None else exaggeration)
    cw = float(cfg.get("cfg_weight", 0.5) if cfg_weight is None else cfg_weight)
    temp = float(cfg.get("temperature", 0.8) if temperature is None else temperature)
    kwargs = dict(
        audio_prompt_path=cfg["ref_path"],
        exaggeration=ex,
        temperature=temp,
    )
    # Turbo's generate() may not take cfg_weight; original Chatterbox does.
    if _model_kind != "turbo":
        kwargs["cfg_weight"] = cw
    wav = model.generate(text, **kwargs)
    if not torch.is_tensor(wav):
        wav = torch.as_tensor(wav)
    if wav.dim() == 1:
        wav = wav.unsqueeze(0)
    wav = wav.detach().cpu().float()
    sr = int(getattr(model, "sr", SR_OUT) or SR_OUT)
    if sr != SR_OUT:
        wav = ta.functional.resample(wav, sr, SR_OUT)
        sr = SR_OUT
    return wav, sr


def save_wav(wav, sr: int, path: Path) -> Path:
    import torchaudio as ta
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    ta.save(str(path), wav, sr)
    return path


def wav_to_ogg(wav_path: Path, ogg_path: Path | None = None) -> Path:
    wav_path = Path(wav_path)
    ogg_path = Path(ogg_path) if ogg_path else wav_path.with_suffix(".ogg")
    ogg_path.parent.mkdir(parents=True, exist_ok=True)
    r = subprocess.run(
        [
            ffmpeg_bin(), "-y", "-i", str(wav_path),
            "-c:a", "libopus", "-b:a", "48k", "-ar", str(SR_OUT),
            str(ogg_path),
        ],
        capture_output=True,
        text=True,
    )
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or "ffmpeg opus encode failed")
    return ogg_path


def bake_line(
    line_id: str,
    text: str,
    voice_id: str,
    folder: str,
    *,
    exaggeration: float | None = None,
    cfg_weight: float | None = None,
    temperature: float | None = None,
    model_kind: str | None = None,
) -> dict:
    dest_dir = OUT / folder
    wav_path = dest_dir / f"{line_id}.wav"
    ogg_path = dest_dir / f"{line_id}.ogg"
    wav, sr = synthesize(
        text,
        voice_id,
        exaggeration=exaggeration,
        cfg_weight=cfg_weight,
        temperature=temperature,
        model_kind=model_kind,
    )
    save_wav(wav, sr, wav_path)
    wav_to_ogg(wav_path, ogg_path)
    return {
        "id": line_id,
        "voice": voice_id,
        "folder": folder,
        "text": text,
        "wav": str(wav_path.relative_to(ROOT)).replace("\\", "/"),
        "ogg": str(ogg_path.relative_to(ROOT)).replace("\\", "/"),
        "words": word_count(text),
    }
