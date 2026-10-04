"""
Transcript fetching service using youtube-transcript-api.
Handles YouTube URL validation, video ID extraction, and transcript retrieval.
"""

import re
# pyrefly: ignore [missing-import]
import httpx
from youtube_transcript_api import YouTubeTranscriptApi


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
        except Exception:
            try:
                # Fallback: fetch any available transcript
                transcript = ytt_api.fetch(video_id)
            except Exception as inner_e:
                return {
                    "error": f"This video does not expose a transcript. Try another video. ({str(inner_e)})"
                }

        if transcript is None:
            return {
                "error": "This video does not expose a transcript. Try another video."
            }

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
            total_duration = float(start) + float(duration)

        # Check total duration — limit to ~3 minutes for hackathon
        if total_duration > 240:  # 4 min buffer
            return {
                "error": "For the hackathon demo, use a short video under 3 minutes."
            }

        return {
            "video_id": video_id,
            "source_language": source_lang,
            "segments": formatted_segments,
        }

    except Exception as e:
        error_msg = str(e)
        if "disabled" in error_msg.lower() or "no transcript" in error_msg.lower():
            return {
                "error": "This video does not expose a transcript. Try another video."
            }
        return {
            "error": f"Transcript service is temporarily unavailable. Try another demo video. ({error_msg})"
        }
