"""
Text-to-Speech service using edge-tts.
Converts translated text to MP3 audio files.
"""

import os
import uuid
import edge_tts
from dotenv import load_dotenv

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
}

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
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(filepath)

        # Verify file was created and has content
        if not os.path.exists(filepath) or os.path.getsize(filepath) == 0:
            return {"error": "Audio generation failed. Retry with another voice."}

        return {
            "audio_filename": filename,
            "job_id": job_id,
        }

    except Exception as e:
        error_str = str(e).lower()
        if "voice" in error_str:
            return {"error": f"Audio generation failed. The voice '{voice}' may not be available. Retry with another voice."}
        return {"error": f"Audio generation failed. Retry with another voice. ({str(e)})"}
