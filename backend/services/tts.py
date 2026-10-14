"""
Text-to-Speech service using edge-tts.
Converts translated text to MP3 audio files.
"""

import base64
import os
import uuid
import asyncio
import time
import httpx
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
    Generate speech using Edge TTS, falling back to Gemini TTS when needed.
    Returns dict with audio_filename or error.
    """
    if output_dir is None:
        output_dir = os.getenv("OUTPUT_DIR", "./outputs")

    os.makedirs(output_dir, exist_ok=True)

    # Generate a unique filename
    job_id = uuid.uuid4().hex
    filename = f"vocally_{video_id}_{target_language}_{job_id}.mp3"
    filepath = os.path.join(output_dir, filename)

    try:
        communicate = edge_tts.Communicate(text, voice, **NARRATION_PRESETS[narration_style])
        await asyncio.wait_for(communicate.save(filepath), timeout=120)

        # Verify file was created and has content
        if not os.path.exists(filepath) or os.path.getsize(filepath) == 0:
            raise RuntimeError("Edge TTS returned an empty audio file")

        return {
            "audio_filename": filename,
            "job_id": job_id,
            "provider": "edge",
            "voice": voice,
        }

    except Exception as exc:
        if os.path.exists(filepath):
            os.remove(filepath)
        status = getattr(exc, "status", None)
        print(f"[TTS] Edge provider failed ({type(exc).__name__}, HTTP {status or 'n/a'}); trying Gemini TTS fallback")
        return await _generate_gemini_speech(
            text=text,
            voice=voice,
            job_id=job_id,
            target_language=target_language,
            output_dir=output_dir,
            narration_style=narration_style,
        )


def _gemini_voice_for_edge_voice(voice: str, language: str) -> str:
    """Choose a Gemini voice with a similar gender to the selected Edge voice."""
    male_markers = ("guy", "ryan", "asad", "madhur", "hamed")
    is_male = any(marker in voice.lower() for marker in male_markers)

    # Dynamically discovered voices include their gender in the display name.
    if not is_male:
        for option in get_voices_for_language(language):
            if option["id"] == voice and "male" in option["name"].lower():
                is_male = True
                break
    if not is_male:
        catalogue = _catalogue or {}
        for option in catalogue.get(language, []):
            if option["id"] == voice and "male" in option["name"].lower():
                is_male = True
                break

    return "Charon" if is_male else "Kore"


async def _generate_gemini_speech(
    text: str,
    voice: str,
    job_id: str,
    target_language: str,
    output_dir: str,
    narration_style: str,
) -> dict:
    """Use the configured Gemini API when Microsoft's Edge TTS endpoint fails."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or api_key == "your_gemini_api_key_here":
        return {
            "error": "Microsoft Edge TTS is unavailable and Gemini TTS is not configured.",
            "error_code": "speech_provider_unavailable",
        }

    gemini_voice = _gemini_voice_for_edge_voice(voice, target_language)
    delivery = {
        "normal": "Speak clearly at a natural pace.",
        "motivational": "Speak with confident, uplifting energy at a slightly brisk pace.",
        "calm": "Speak gently and calmly at a relaxed pace.",
    }.get(narration_style, "Speak clearly at a natural pace.")
    payload = {
        "model": os.getenv("GEMINI_TTS_MODEL", "gemini-3.8-flash-tts"),
        "input": [{
            "type": "user_input",
            "content": [{
                "type": "text",
                "text": text,
                "annotations": [{"type": "speech_metadata", "style": delivery}],
            }],
        }],
        "response_format": {"type": "audio"},
        "generation_config": {"speech_config": [{"voice": gemini_voice}]},
    }
    filename = f"vocally_{target_language}_{job_id}.wav"
    filepath = os.path.join(output_dir, filename)

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                "https://generativelanguage.googleapis.com/v1beta/interactions",
                headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
                json=payload,
            )
        if response.status_code == 429:
            return {"error": "Gemini TTS has reached its API quota. Check the Gemini API quota and try again.", "error_code": "speech_quota_exceeded"}
        response.raise_for_status()
        result = response.json()
        audio_data = result.get("output_audio", {}).get("data")
        if not audio_data:
            for step in result.get("steps", []):
                for part in step.get("content", []):
                    if part.get("type") == "audio" or str(part.get("mime_type", "")).startswith("audio/"):
                        audio_data = part.get("data")
                        if audio_data:
                            break
                if audio_data:
                    break
        if not audio_data:
            raise ValueError("Gemini returned no audio data")

        audio_bytes = base64.b64decode(audio_data, validate=True)
        if len(audio_bytes) <= 44 or audio_bytes[:4] != b"RIFF":
            raise ValueError("Gemini returned an invalid WAV file")
        with open(filepath, "wb") as audio_file:
            audio_file.write(audio_bytes)
        return {
            "audio_filename": filename,
            "job_id": job_id,
            "provider": "gemini",
            "voice": f"Gemini TTS ({gemini_voice})",
        }
    except Exception as exc:
        if os.path.exists(filepath):
            os.remove(filepath)
        status = getattr(exc, "status_code", None) or getattr(getattr(exc, "response", None), "status_code", None)
        print(f"[TTS] Gemini fallback failed ({type(exc).__name__}, HTTP {status or 'n/a'})")
        return {
            "error": "Speech could not be generated. Check the Gemini API connection and quota, then try again.",
            "error_code": "speech_generation_failed",
        }
