"""
Vocally — Hackathon MVP Backend
FastAPI server for YouTube transcript fetching, translation, and TTS generation.
"""

import os
import sys
import uuid
import asyncio
from typing import Literal
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

# Avoid console encoding crashes when logging non-ASCII text (e.g. Urdu/Arabic).
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

import db
from limits import DemoLimits
from services.transcript import validate_youtube_url, fetch_transcript, fetch_video_title
from services.translate import translate_text, summarize_text
from services.tts import generate_speech, generate_preview_speech, voice_catalogue, validate_voice
from services.languages import LANGUAGE_NAMES, PREVIEW_TEXT
from services import outputs as output_service, cloudinary_storage

load_dotenv()

# ── App setup ──────────────────────────────────────────────────────────

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "./outputs")

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Connect to MongoDB on startup, close the client on shutdown."""
    try:
        await db.connect_to_mongo()
        print(f"[db] Connected to MongoDB -> {db.DATABASE_NAME}.{db.OUTPUTS_COLLECTION}")
        if cloudinary_storage.is_configured():
            try:
                synced = await output_service.sync_local_audio(OUTPUT_DIR)
                print(f"[Cloudinary] Startup sync complete: {synced} audio file(s) uploaded.")
            except (cloudinary_storage.CloudinaryStorageError, db.DatabaseUnavailable) as exc:
                print(f"[Cloudinary] Startup sync incomplete ({type(exc).__name__}); it will retry on next startup.")
        else:
            print("[Cloudinary] Startup sync skipped: Cloudinary credentials are incomplete.")
    except db.DatabaseUnavailable as exc:
        print(f"[db] WARNING — MongoDB unavailable: {exc}")
    yield
    await db.close_mongo_connection()


app = FastAPI(title="Vocally API", version="0.1.0", lifespan=lifespan)

app.add_middleware(DemoLimits, output_directory=lambda: OUTPUT_DIR)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
    expose_headers=["Retry-After"],
)


# ── Pydantic models ───────────────────────────────────────────────────

class FetchTranscriptRequest(BaseModel):
    youtube_url: str = Field(min_length=1, max_length=2048)
    preferred_language: str = Field(default="en", pattern=r"^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8}){0,2}$")


class GenerateRequest(BaseModel):
    video_id: str = Field(pattern=r"^[a-zA-Z0-9_-]{11}$")
    source_language: str = Field(pattern=r"^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8}){0,2}$")
    target_language: str = Field(min_length=2, max_length=16)
    voice: str = Field(max_length=100)
    transcript: str = Field(min_length=1, max_length=30000)
    title: str = Field(default="", max_length=500)
    narration_style: Literal["normal", "motivational", "calm"] = "normal"


class VoicePreviewRequest(BaseModel):
    target_language: str = Field(min_length=2, max_length=16)
    voice: str = Field(min_length=1, max_length=100)
    narration_style: Literal["normal", "motivational", "calm"] = "normal"


class OutputPayload(BaseModel):
    """Output metadata persisted in MongoDB."""

    id: str = Field(default="", max_length=128, pattern=r"^[a-zA-Z0-9_-]*$")
    video_id: str = Field(pattern=r"^[a-zA-Z0-9_-]{11}$")
    title: str = Field(default="", max_length=500)
    source_language: str = Field(min_length=2, max_length=35)
    target_language: str = Field(min_length=2, max_length=16)
    voice: str = Field(default="", max_length=100)
    original_transcript: str = Field(default="", max_length=30000)
    translated_text: str = Field(default="", max_length=120000)
    summary_text: str = Field(default="", max_length=10000)
    audio_url: str = Field(max_length=255, pattern=r"^/api/audio/[a-zA-Z0-9_-]+\.(?:mp3|wav)$")
    summary_audio_url: str = Field(default="", max_length=255, pattern=r"^(?:/api/audio/[a-zA-Z0-9_-]+\.(?:mp3|wav))?$")
    status: Literal["completed", "error"] = "completed"
    created_at: str | None = Field(default=None, max_length=40)


def _db_error(exc: db.DatabaseUnavailable) -> HTTPException:
    return HTTPException(status_code=503, detail={"code": "output_storage_unavailable", "message": "Output storage is unavailable. Please try again shortly."})


def _require_cloudinary() -> None:
    if not cloudinary_storage.is_configured():
        raise HTTPException(status_code=503, detail={"code": "audio_storage_not_configured", "message": "Cloud audio storage is not configured. Set CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_SECRET in backend/.env."})


async def _upload_generated_audio(filename: str) -> None:
    try:
        await cloudinary_storage.upload_audio_file(Path(OUTPUT_DIR) / filename)
    except cloudinary_storage.CloudinaryStorageError as exc:
        raise HTTPException(status_code=503, detail={"code": "audio_storage_unavailable", "message": "Audio was generated locally but could not be synchronized to cloud storage. Please retry shortly."}) from exc


# ── Routes ─────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    """Simple health check."""
    return {"status": "ok", "service": "vocally"}


@app.get("/api/voices")
async def get_voices():
    """Return available voices grouped by language."""
    return {
        "voices": await voice_catalogue(),
        "languages": LANGUAGE_NAMES,
        "preview_text": PREVIEW_TEXT,
    }


@app.post("/api/voice-preview")
async def api_voice_preview(req: VoicePreviewRequest):
    if not cloudinary_storage.is_configured():
        raise HTTPException(status_code=503, detail={"code": "voice_preview_unavailable", "message": "Voice preview is currently unavailable. Please try again later."})
    if not await validate_voice(req.target_language, req.voice):
        raise HTTPException(400, "Choose a voice available in the selected language.")
    result = await generate_preview_speech(
        PREVIEW_TEXT[req.target_language], req.voice, req.target_language, OUTPUT_DIR, req.narration_style
    )
    if "error" in result:
        raise HTTPException(503, detail={"code": "voice_preview_unavailable", "message": "Voice preview is currently unavailable. Please try again later."})
    try:
        await _upload_generated_audio(result["audio_filename"])
    except HTTPException as exc:
        raise HTTPException(status_code=503, detail={"code": "voice_preview_unavailable", "message": "Voice preview is currently unavailable. Please try again later."}) from exc
    return {"audio_url": f'/api/audio/{result["audio_filename"]}', "voice": result.get("voice", req.voice)}


@app.post("/api/fetch-transcript")
async def api_fetch_transcript(req: FetchTranscriptRequest):
    """
    Validate YouTube URL, fetch transcript, and return segments.
    """
    # Validate URL
    is_valid, video_id, error = validate_youtube_url(req.youtube_url)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    # Fetch video title
    title = await fetch_video_title(video_id)

    # Fetch transcript
    result = await asyncio.to_thread(fetch_transcript, video_id, req.preferred_language)

    if "error" in result:
        raise HTTPException(status_code=400, detail={"code": result.get("error_code", "transcript_failed"), "message": result["error"]})

    result["title"] = title
    return result


@app.post("/api/generate")
async def api_generate(req: GenerateRequest):
    """
    Translate transcript, generate TTS audio, and persist the output in MongoDB.
    Returns translated text, audio URL, and the saved output document.
    """
    _require_cloudinary()
    if req.target_language not in LANGUAGE_NAMES:
        raise HTTPException(400, "Choose a supported target language.")
    if not await validate_voice(req.target_language, req.voice):
        raise HTTPException(400, "Choose a voice available in the selected language.")

    # Step 1: Translate
    translation_result = await translate_text(
        text=req.transcript,
        source_language=req.source_language,
        target_language=req.target_language,
    )

    if "error" in translation_result:
        raise HTTPException(status_code=503, detail={"code": translation_result.get("error_code", "translation_failed"), "message": translation_result["error"]})

    translated_text = translation_result["translated_text"]

    # Summarize in the target language so the summary and generated voice match.
    summary_result = await summarize_text(translated_text, req.target_language)
    if "error" in summary_result:
        raise HTTPException(status_code=503, detail={"code": summary_result.get("error_code", "summary_failed"), "message": summary_result["error"]})
    summary_text = summary_result["summary_text"]

    # Generate the full and summary speech in the selected voice.
    tts_result = await generate_speech(
        text=translated_text,
        voice=req.voice,
        video_id=req.video_id,
        target_language=req.target_language,
        output_dir=OUTPUT_DIR,
        narration_style=req.narration_style,
    )
    summary_tts_result = await generate_speech(
        text=summary_text,
        voice=req.voice,
        video_id=req.video_id,
        target_language=req.target_language,
        output_dir=OUTPUT_DIR,
        narration_style=req.narration_style,
    ) if "error" not in tts_result else tts_result

    if "error" in tts_result:
        message = tts_result.get("error", "The speech service could not generate audio. Please try again.")
        raise HTTPException(status_code=502, detail={"code": tts_result.get("error_code", "audio_generation_failed"), "message": message})

    if "error" in summary_tts_result:
        try:
            Path(OUTPUT_DIR, tts_result["audio_filename"]).unlink(missing_ok=True)
        except OSError:
            pass
        raise HTTPException(status_code=502, detail={"code": "summary_audio_generation_failed", "message": "The summary was created, but its audio could not be generated. Please try again."})

    try:
        await _upload_generated_audio(tts_result["audio_filename"])
        await _upload_generated_audio(summary_tts_result["audio_filename"])
    except HTTPException:
        raise

    audio_filename = tts_result["audio_filename"]
    audio_url = f"/api/audio/{audio_filename}"
    summary_audio_filename = summary_tts_result["audio_filename"]
    summary_audio_url = f"/api/audio/{summary_audio_filename}"

    # Step 3: Resolve title (client usually sends it, otherwise fetch it)
    title = req.title.strip()
    if not title:
        title = await fetch_video_title(req.video_id)

    # Step 4: Persist the output in MongoDB
    document = {
        "id": str(uuid.uuid4()),
        "video_id": req.video_id,
        "title": title,
        "source_language": req.source_language,
        "target_language": req.target_language,
        "voice": tts_result.get("voice", req.voice),
        "narration_style": req.narration_style,
        "original_transcript": req.transcript,
        "translated_text": translated_text,
        "summary_text": summary_text,
        "summary_audio_url": summary_audio_url,
        "summary_audio_filename": summary_audio_filename,
        "audio_url": audio_url,
        "audio_filename": audio_filename,
        "status": "completed",
        "created_at": datetime.now(timezone.utc),
    }

    try:
        output = await output_service.save_output(document)
    except db.DatabaseUnavailable as exc:
        for generated_url in (audio_url, summary_audio_url):
            try:
                await output_service.remove_audio(generated_url, OUTPUT_DIR)
            except output_service.AudioCleanupFailed:
                pass
        raise _db_error(exc)

    return {
        "status": "completed",
        "translated_text": translated_text,
        "summary_text": summary_text,
        "audio_url": audio_url,
        "summary_audio_url": summary_audio_url,
        "job_id": tts_result["job_id"],
        "output": output,
    }


# ── Outputs (MongoDB) ─────────────────────────────────────────────────

@app.get("/api/outputs")
async def api_list_outputs(limit: int = 100):
    """List saved outputs, newest first."""
    try:
        outputs = await db.list_outputs(limit=min(max(limit, 1), 500))
    except db.DatabaseUnavailable as exc:
        raise _db_error(exc)
    return {"outputs": outputs}


@app.get("/api/outputs/{output_id}")
async def api_get_output(output_id: str):
    """Fetch a single saved output."""
    try:
        output = await db.get_output(output_id)
    except db.DatabaseUnavailable as exc:
        raise _db_error(exc)
    if output is None:
        raise HTTPException(status_code=404, detail="Output not found.")
    return output


@app.post("/api/outputs")
async def api_create_output(payload: OutputPayload):
    """Create or replace an output document (used by clients saving manually)."""
    output_id = payload.id or str(uuid.uuid4())
    created_at = None
    if payload.created_at:
        try:
            created_at = datetime.fromisoformat(payload.created_at.replace("Z", "+00:00"))
        except ValueError:
            created_at = None

    document = {
        "id": output_id,
        "video_id": payload.video_id,
        "title": payload.title,
        "source_language": payload.source_language,
        "target_language": payload.target_language,
        "voice": payload.voice,
        "original_transcript": payload.original_transcript,
        "translated_text": payload.translated_text,
        "summary_text": payload.summary_text,
        "summary_audio_url": payload.summary_audio_url,
        "audio_url": payload.audio_url,
        "status": payload.status,
        "created_at": created_at or datetime.now(timezone.utc),
    }

    try:
        output = await output_service.save_output(document)
    except db.DatabaseUnavailable as exc:
        raise _db_error(exc)
    return output


@app.delete("/api/outputs/{output_id}")
async def api_delete_output(output_id: str):
    """Delete output metadata and its generated audio."""
    try:
        deleted = await output_service.delete_output(output_id, OUTPUT_DIR)
    except db.DatabaseUnavailable as exc:
        raise _db_error(exc)
    except output_service.AudioCleanupFailed as exc:
        raise HTTPException(503, detail={"code": "audio_cleanup_failed", "message": "Could not remove the audio file. The output record was kept; please retry deletion."}) from exc
    if not deleted:
        raise HTTPException(status_code=404, detail="Output not found.")
    return {"status": "deleted", "id": output_id}


@app.delete("/api/outputs")
async def api_clear_outputs():
    """Delete every saved output."""
    try:
        count = await output_service.clear_outputs(OUTPUT_DIR)
    except db.DatabaseUnavailable as exc:
        raise _db_error(exc)
    except output_service.AudioCleanupFailed as exc:
        raise HTTPException(503, detail={"code": "audio_cleanup_failed", "message": "Some outputs could not be deleted. Please retry."}) from exc
    return {"status": "cleared", "deleted": count}


@app.get("/api/audio/{filename}")
async def serve_audio(filename: str):
    """Redirect to Cloudinary, retaining local delivery as a migration fallback."""
    try:
        asset = await cloudinary_storage.get_audio_asset(filename)
    except cloudinary_storage.CloudinaryStorageError as exc:
        raise HTTPException(status_code=503, detail={"code": "audio_storage_unavailable", "message": "Audio storage is temporarily unavailable."}) from exc
    if asset:
        return RedirectResponse(asset["secure_url"], status_code=307)
    directory = Path(OUTPUT_DIR).resolve()
    filepath = (directory / filename).resolve()
    if filepath.parent != directory or filepath.suffix not in {".mp3", ".wav"}:
        raise HTTPException(status_code=404, detail="Audio file not found.")

    if not filepath.is_file():
        raise HTTPException(status_code=404, detail="Audio file not found.")

    return FileResponse(
        path=str(filepath),
        media_type="audio/wav" if filepath.suffix == ".wav" else "audio/mpeg",
        filename=filename,
    )


# ── Main ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False)
