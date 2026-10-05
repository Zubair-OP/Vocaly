"""
Transcript fetching service using youtube-transcript-api.
Handles YouTube URL validation, video ID extraction, and transcript retrieval.
"""

import re
# pyrefly: ignore [missing-import]
import httpx
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    NoTranscriptFound, TranscriptsDisabled, RequestBlocked, VideoUnavailable,
    VideoUnplayable, AgeRestricted,
)

MAX_VIDEO_SECONDS = 300


def transcript_error(error: Exception) -> dict:
    if isinstance(error, (TranscriptsDisabled, NoTranscriptFound)):
        return {"error_code": "captions_unavailable", "error": "This video has no accessible captions. Choose a video with captions enabled; videos without captions require audio transcription."}
    if isinstance(error, RequestBlocked):
        return {"error_code": "youtube_blocked", "error": "YouTube blocked the caption request from this connection. Try again later or use another connection."}
    if isinstance(error, (VideoUnavailable, VideoUnplayable, AgeRestricted)):
        return {"error_code": "video_unavailable", "error": "This video is unavailable or restricted. Choose a public, unrestricted video with captions."}
    return {"error_code": "transcript_service_unavailable", "error": "Could not connect to the YouTube caption service. Check the backend internet connection and try again."}


# Supported YouTube URL patterns
YOUTUBE_PATTERNS = [
    r"(?:https?://)?(?:www\.)?youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})",
    r"(?:https?://)?youtu\.be/([a-zA-Z0-9_-]{11})",
    r"(?:https?://)?(?:www\.)?youtube\.com/shorts/([a-zA-Z0-9_-]{11})",
    r"(?:https?://)?(?:www\.)?youtube\.com/embed/([a-zA-Z0-9_-]{11})",
]


def extract_video_id(url: str) -> str | None:
    """Extract YouTube video ID from various URL formats."""
    for pattern in YOUTUBE_PATTERNS:
        match = re.search(pattern, url.strip())
        if match:
            return match.group(1)
    return None


def validate_youtube_url(url: str) -> tuple[bool, str | None, str | None]:
    """
    Validate a YouTube URL and extract the video ID.
    Returns (is_valid, video_id, error_message).
    """
    if not url or not url.strip():
        return False, None, "Enter a valid YouTube video link."

    video_id = extract_video_id(url)
    if not video_id:
        return False, None, "Enter a valid YouTube video link."

    return True, video_id, None


async def fetch_video_title(video_id: str) -> str:
    """Fetch video title using YouTube's oembed endpoint (no API key needed)."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("title", f"Video {video_id}")
    except Exception:
        pass
    return f"Video {video_id}"


def fetch_transcript(video_id: str, preferred_lang: str = "en") -> dict:
    """
    Fetch transcript for a YouTube video.
    Returns dict with video_id, segments, and detected source_language.
    Uses the latest youtube-transcript-api API.
    """
    try:
        ytt_api = YouTubeTranscriptApi()

        # Try to fetch transcript — first try preferred language, then fallback
        transcript = None
        source_lang = preferred_lang

        try:
            # Try fetching with preferred language
            transcript = ytt_api.fetch(video_id, languages=[preferred_lang, "en"])
        except NoTranscriptFound:
            try:
                # Fallback: fetch any available transcript
                available = list(ytt_api.list(video_id))
                if not available:
                    return transcript_error(TranscriptsDisabled(video_id))
                transcript = available[0].fetch()
            except Exception as inner_e:
                return transcript_error(inner_e)

        if transcript is None:
            return {
                "error": "This video does not expose a transcript. Try another video."
            }

        source_lang = getattr(transcript, "language_code", preferred_lang)

        # Convert transcript to segments list
        formatted_segments = []
        total_duration = 0

        for snippet in transcript:
            start = getattr(snippet, 'start', snippet.get('start', 0) if isinstance(snippet, dict) else 0)
            duration = getattr(snippet, 'duration', snippet.get('duration', 0) if isinstance(snippet, dict) else 0)
            text = getattr(snippet, 'text', snippet.get('text', '') if isinstance(snippet, dict) else str(snippet))

            formatted_segments.append({
                "text": str(text),
                "start": round(float(start), 2),
                "duration": round(float(duration), 2),
            })
            total_duration = max(total_duration, float(start) + float(duration))

        if total_duration > MAX_VIDEO_SECONDS:
            return {
                "error_code": "video_too_long",
                "error": "Use a video up to 5 minutes long. This video's captions extend beyond the 5-minute limit."
            }

        return {
            "video_id": video_id,
            "source_language": source_lang,
            "segments": formatted_segments,
        }

    except Exception as e:
        return transcript_error(e)
