"""
Vocally — Hackathon MVP Backend
FastAPI server for YouTube transcript fetching, translation, and TTS generation.
"""

import os
import sys
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

# Avoid console encoding crashes when logging non-ASCII text (e.g. Urdu/Arabic).
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv

import db
from services.transcript import validate_youtube_url, fetch_transcript, fetch_video_title
from services.translate import translate_text
from services.tts import generate_speech, get_voices_for_language, VOICE_MAP

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
    except db.DatabaseUnavailable as exc:
        print(f"[db] WARNING — MongoDB unavailable: {exc}")
    yield
    await db.close_mongo_connection()


app = FastAPI(title="Vocally API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic models ───────────────────────────────────────────────────

class FetchTranscriptRequest(BaseModel):
    youtube_url: str


class GenerateRequest(BaseModel):
    video_id: str
    source_language: str
    target_language: str
    voice: str
    transcript: str
    title: str = ""


class OutputPayload(BaseModel):
    """Output metadata persisted in MongoDB."""

    id: str = ""
    video_id: str
    title: str = ""
    source_language: str
    target_language: str
    voice: str = ""
    original_transcript: str = ""
    translated_text: str = ""
    audio_url: str
    status: str = "completed"
    created_at: str | None = None


def _db_error(exc: db.DatabaseUnavailable) -> HTTPException:
    return HTTPException(status_code=503, detail=str(exc))


# ── Routes ─────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    """Simple health check."""
    return {"status": "ok", "service": "vocally"}


@app.get("/api/voices")
async def get_voices():
    """Return available voices grouped by language."""
    return {
        "voices": {
            lang: voices for lang, voices in VOICE_MAP.items()
        }
    }


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
    result = fetch_transcript(video_id)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    result["title"] = title
    return result


@app.post("/api/generate")
async def api_generate(req: GenerateRequest):
    """
    Translate transcript, generate TTS audio, and persist the output in MongoDB.
    Returns translated text, audio URL, and the saved output document.
    """
    # Step 1: Translate
    translation_result = await translate_text(
        text=req.transcript,
        source_language=req.source_language,
        target_language=req.target_language,
    )

    if "error" in translation_result:
        raise HTTPException(status_code=400, detail=translation_result["error"])

    translated_text = translation_result["translated_text"]

    # Step 2: Generate speech
    tts_result = await generate_speech(
        text=translated_text,
        voice=req.voice,
        video_id=req.video_id,
        target_language=req.target_language,
        output_dir=OUTPUT_DIR,
    )

    if "error" in tts_result:
        raise HTTPException(status_code=400, detail=tts_result["error"])

    audio_filename = tts_result["audio_filename"]
    audio_url = f"/api/audio/{audio_filename}"

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
        "voice": req.voice,
        "original_transcript": req.transcript,
        "translated_text": translated_text,
        "audio_url": audio_url,
        "audio_filename": audio_filename,
        "status": "completed",
        "created_at": datetime.now(timezone.utc),
    }

    try:
        output = await db.save_output(document)
    except db.DatabaseUnavailable as exc:
        raise _db_error(exc)

    return {
        "status": "completed",
        "translated_text": translated_text,
        "audio_url": audio_url,
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
        "audio_url": payload.audio_url,
        "status": payload.status,
        "created_at": created_at or datetime.now(timezone.utc),
    }

    try:
        output = await db.save_output(document)
    except db.DatabaseUnavailable as exc:
        raise _db_error(exc)
    return output


@app.delete("/api/outputs/{output_id}")
async def api_delete_output(output_id: str):
    """Delete a single output."""
    try:
        deleted = await db.delete_output(output_id)
    except db.DatabaseUnavailable as exc:
        raise _db_error(exc)
    if not deleted:
        raise HTTPException(status_code=404, detail="Output not found.")
    return {"status": "deleted", "id": output_id}


@app.delete("/api/outputs")
async def api_clear_outputs():
    """Delete every saved output."""
    try:
        count = await db.clear_outputs()
    except db.DatabaseUnavailable as exc:
        raise _db_error(exc)
    return {"status": "cleared", "deleted": count}


@app.get("/api/audio/{filename}")
async def serve_audio(filename: str):
    """Serve generated MP3 file."""
    filepath = Path(OUTPUT_DIR) / filename

    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Audio file not found.")

    return FileResponse(
        path=str(filepath),
        media_type="audio/mpeg",
        filename=filename,
    )


# ── Main ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
