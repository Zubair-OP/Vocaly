"""
Text-to-Speech service using edge-tts.
Converts translated text to MP3 audio files.
"""

import os
import uuid
import asyncio
import time
import edge_tts
from dotenv import load_dotenv
from services.languages import LANGUAGE_NAMES, NARRATION_PRESETS

load_dotenv()

# Voice mapping: language code → edge-tts voice name
VOICE_MAP = {
    "en": [
        {"id": "en-US-GuyNeural", "name": "Guy (US Male)"},
        {"id": "en-US-JennyNeural", "name": "Jenny (US Female)"},
        {"id": "en-GB-RyanNeural", "name": "Ryan (UK Male)"},
    ],
    "ur": [
        {"id": "ur-PK-UzmaNeural", "name": "Uzma (Female)"},
        {"id": "ur-PK-AsadNeural", "name": "Asad (Male)"},
    ],
    "hi": [
        {"id": "hi-IN-SwaraNeural", "name": "Swara (Female)"},
        {"id": "hi-IN-MadhurNeural", "name": "Madhur (Male)"},
    ],
    "ar": [
        {"id": "ar-SA-ZariyahNeural", "name": "Zariyah (Female)"},
        {"id": "ar-SA-HamedNeural", "name": "Hamed (Male)"},
    ],
    "es": [{"id": "es-ES-ElviraNeural", "name": "Elvira (Spain Female)"}],
    "fr": [{"id": "fr-FR-DeniseNeural", "name": "Denise (France Female)"}],
    "de": [{"id": "de-DE-KatjaNeural", "name": "Katja (Germany Female)"}],
    "pt": [{"id": "pt-BR-FranciscaNeural", "name": "Francisca (Brazil Female)"}],
    "zh": [{"id": "zh-CN-XiaoxiaoNeural", "name": "Xiaoxiao (Mandarin Female)"}],
    "ja": [{"id": "ja-JP-NanamiNeural", "name": "Nanami (Japan Female)"}],
}

_catalogue = None
_catalogue_time = 0.0
_catalogue_lock = asyncio.Lock()


async def voice_catalogue() -> dict:
    """Cache provider voices for an hour; keep a known catalogue during outages."""
    global _catalogue, _catalogue_time
    async with _catalogue_lock:
        if _catalogue is not None and time.monotonic() - _catalogue_time < 3600:
            return _catalogue
        try:
            voices = await asyncio.wait_for(edge_tts.list_voices(), timeout=15)
            grouped = {language: [] for language in LANGUAGE_NAMES}
            for item in voices:
                language = item["Locale"].split("-")[0]
                if language in grouped:
                    name = item["ShortName"].rsplit("-", 1)[-1].removesuffix("Neural")
                    grouped[language].append({
                        "id": item["ShortName"],
                        "name": f'{name} ({item["Locale"]} {item["Gender"]})',
                    })
            _catalogue = {language: grouped[language] or VOICE_MAP[language] for language in grouped}
        except Exception:
            _catalogue = _catalogue or VOICE_MAP
        _catalogue_time = time.monotonic()
        return _catalogue


async def validate_voice(language: str, voice: str) -> bool:
    catalogue = await voice_catalogue()
    return any(item["id"] == voice for item in catalogue.get(language, []))

# Default voice per language (first voice in the list)
DEFAULT_VOICES = {lang: voices[0]["id"] for lang, voices in VOICE_MAP.items()}


def get_voices_for_language(language: str) -> list[dict]:
    """Get available voices for a given language code."""
    return VOICE_MAP.get(language, [])


def get_default_voice(language: str) -> str:
    """Get the default voice ID for a language."""
    return DEFAULT_VOICES.get(language, "en-US-GuyNeural")


async def generate_speech(
    text: str,
    voice: str,
    video_id: str,
    target_language: str,
    output_dir: str = None,
    narration_style: str = "normal",
) -> dict:
    """
    Generate MP3 audio from text using edge-tts.
    Returns dict with audio_filename or error.
    """
    if output_dir is None:
        output_dir = os.getenv("OUTPUT_DIR", "./outputs")

    os.makedirs(output_dir, exist_ok=True)

    # Generate a unique filename
    job_id = str(uuid.uuid4())[:8]
    filename = f"vocally_{video_id}_{target_language}_{job_id}.mp3"
    filepath = os.path.join(output_dir, filename)

    try:
        communicate = edge_tts.Communicate(text, voice, **NARRATION_PRESETS[narration_style])
        await asyncio.wait_for(communicate.save(filepath), timeout=120)

        # Verify file was created and has content
        if not os.path.exists(filepath) or os.path.getsize(filepath) == 0:
            return {"error": "Audio generation failed. Retry with another voice."}

        return {
            "audio_filename": filename,
            "job_id": job_id,
        }

    except Exception as e:
        if os.path.exists(filepath):
            os.remove(filepath)
        error_str = str(e).lower()
        if "voice" in error_str:
            return {"error": f"Audio generation failed. The voice '{voice}' may not be available. Retry with another voice."}
        return {"error": f"Audio generation failed. Retry with another voice. ({str(e)})"}
