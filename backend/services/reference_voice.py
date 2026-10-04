"""Optional local XTTS generation from a user-supplied speaker reference."""

import asyncio
import importlib.util
import io
import os
import re
from pathlib import Path
import uuid
import wave

XTTS_LANGUAGES = {"en", "hi", "ar", "es", "fr", "de", "pt", "zh", "ja"}
_model = None
_model_lock = asyncio.Lock()


def model_directory() -> Path:
    cache = Path(os.getenv("TTS_HOME", str(Path(os.getenv("OUTPUT_DIR", "./outputs")) / "models")))
    return cache.resolve() / "tts" / "tts_models--multilingual--multi-dataset--xtts_v2"


def is_available() -> bool:
    # Avoid an interactive model-license prompt inside an HTTP request.
    if os.getenv("ENABLE_XTTS", "false").lower() != "true" or os.getenv("COQUI_TOS_AGREED") != "1" or importlib.util.find_spec("TTS") is None:
        return False
    directory = model_directory()
    return all(path.is_file() and path.stat().st_size > 0 for path in (directory / name for name in ("model.pth", "config.json", "vocab.json")))


def supported_languages() -> set[str]:
    languages = XTTS_LANGUAGES.copy()
    if importlib.util.find_spec("pypinyin") is None:
        languages.discard("zh")
    if not all(importlib.util.find_spec(name) for name in ("cutlet", "fugashi", "unidic_lite")):
        languages.discard("ja")
    return languages


def save_reference(data: bytes, output_dir: str) -> str:
    if not data or len(data) > 5 * 1024 * 1024:
        raise ValueError("Upload a WAV file smaller than 5 MB.")
    try:
        with wave.open(io.BytesIO(data), "rb") as audio:
            duration = audio.getnframes() / audio.getframerate()
            if audio.getnchannels() not in (1, 2) or audio.getsampwidth() != 2 or not 6 <= duration <= 30 or not 8000 <= audio.getframerate() <= 48000:
                raise ValueError("Use a 6–30 second, 16-bit PCM WAV sample with one or two channels.")
            expected = audio.getnframes() * audio.getnchannels() * audio.getsampwidth()
            if len(audio.readframes(audio.getnframes())) != expected:
                raise ValueError("The WAV file is truncated. Upload a complete recording.")
    except (wave.Error, EOFError, ZeroDivisionError) as exc:
        raise ValueError("Use a valid 16-bit PCM WAV file.") from exc
    directory = Path(output_dir) / "references"
    directory.mkdir(parents=True, exist_ok=True)
    reference_id = uuid.uuid4().hex
    (directory / f"{reference_id}.wav").write_bytes(data)
    return reference_id


def reference_path(reference_id: str, output_dir: str) -> Path:
    if len(reference_id) != 32 or any(character not in "0123456789abcdef" for character in reference_id):
        raise ValueError("Upload a valid speaker reference first.")
    path = Path(output_dir) / "references" / f"{reference_id}.wav"
    if not path.is_file():
        raise ValueError("Speaker reference was not found. Upload it again.")
    return path


def speech_chunks(text: str, limit: int) -> list[str]:
    """Keep short sentences intact without exceeding the model's text window."""
    chunks = []
    current = ""
    for sentence in re.split(r"(?<=[.!?。！？؟।])\s*", text):
        sentence = sentence.strip()
        while len(sentence) > limit:
            split_at = sentence.rfind(" ", 0, limit + 1)
            split_at = split_at if split_at > 0 else limit
            if current:
                chunks.append(current)
                current = ""
            chunks.append(sentence[:split_at].strip())
            sentence = sentence[split_at:].strip()
        if not sentence:
            continue
        combined = f"{current} {sentence}".strip()
        if len(combined) > limit:
            chunks.append(current)
            current = sentence
        else:
            current = combined
    if current:
        chunks.append(current)
    return chunks


def load_reference_audio(reference: Path, device):
    """Decode the validated PCM WAV and resample it without FFmpeg."""
    import soundfile as sf
    import torch
    from torchaudio.functional import resample
    samples, sample_rate = sf.read(reference, dtype="float32", always_2d=True)
    audio = torch.from_numpy(samples.mean(axis=1)).unsqueeze(0)
    return resample(audio, sample_rate, 22050).to(device)


def _synthesize(text: str, language: str, reference: Path, destination: Path):
    global _model
    import numpy as np
    import soundfile as sf
    import torch
    from TTS.tts.configs.xtts_config import XttsConfig
    from TTS.tts.models.xtts import Xtts
    if _model is None:
        config = XttsConfig()
        config.load_json(str(model_directory() / "config.json"))
        model = Xtts.init_from_config(config)
        model.load_checkpoint(config, checkpoint_dir=str(model_directory()), eval=True)
        if torch.cuda.is_available():
            model.to("cuda")
        else:
            torch.set_num_threads(min(4, torch.get_num_threads()))
        _model = model
    model = _model
    # Input is validated PCM WAV; native WAV decoding avoids a separate FFmpeg
    # installation on Windows while retaining XTTS speaker and style conditioning.
    audio = load_reference_audio(reference, model.device)
    conditioning = model.get_gpt_cond_latents(audio, 22050, length=model.config.gpt_cond_len, chunk_length=model.config.gpt_cond_chunk_len)
    speaker = model.get_speaker_embedding(audio, 22050)
    output_rate = model.config.audio.output_sample_rate
    segments = []
    for chunk in speech_chunks(text, 70 if language in {"zh", "ja"} else 180):
        result = model.inference(chunk, "zh-cn" if language == "zh" else language, conditioning, speaker, enable_text_splitting=False)
        if segments:
            segments.append(np.zeros(int(output_rate * 0.15), dtype=np.float32))
        segments.append(result["wav"])
    sf.write(destination, np.concatenate(segments), output_rate, subtype="PCM_16")


async def generate_reference_speech(text: str, language: str, reference_id: str, output_dir: str) -> dict:
    reference = reference_path(reference_id, output_dir)
    job_id = uuid.uuid4().hex
    destination = Path(output_dir) / f"vocally_reference_{language}_{job_id}.wav"
    try:
        # Serialize local inference to avoid loading multiple large models concurrently.
        async with _model_lock:
            await asyncio.to_thread(_synthesize, text, language, reference, destination)
        if not destination.is_file() or destination.stat().st_size <= 44:
            raise RuntimeError("Empty audio")
        return {"audio_filename": destination.name, "job_id": job_id}
    except Exception as exc:
        print(f"[XTTS] Generation failed: {type(exc).__name__}")
        destination.unlink(missing_ok=True)
        return {"error": "Reference voice generation failed. Check the local XTTS setup or use a standard voice.", "error_code": "reference_generation_failed"}
