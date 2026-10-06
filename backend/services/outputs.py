"""Coordinate output metadata and generated audio deletion for the demo."""

import asyncio
import re
from pathlib import Path

import db

# All output mutations share this lock in the single-worker demo deployment.
mutation_lock = asyncio.Lock()


class AudioCleanupFailed(Exception):
    """The record must be retained so cleanup can be retried."""


def remove_audio(audio_url: str, output_dir: str) -> None:
    if not audio_url:
        return
    match = re.fullmatch(r"/api/audio/([a-zA-Z0-9_-]+\.(?:mp3|wav))", audio_url)
    if not match:
        raise AudioCleanupFailed("Invalid stored audio path.")
    directory = Path(output_dir).resolve()
    path = directory / match.group(1)
    # Never follow a link or remove anything outside generated audio storage.
    if path.is_symlink() or path.resolve().parent != directory:
        raise AudioCleanupFailed("Invalid stored audio path.")
    try:
        path.unlink(missing_ok=True)
    except OSError as exc:
        raise AudioCleanupFailed("Audio file could not be removed.") from exc


async def delete_output(output_id: str, output_dir: str) -> bool:
    async with mutation_lock:
        output = await db.get_output(output_id)
        if output is None:
            return False
        audio_url = output.get("audioUrl", "")
        # Manually saved legacy records can share an audio URL.
        if audio_url and not await db.audio_is_shared(output_id, audio_url):
            await asyncio.to_thread(remove_audio, audio_url, output_dir)
        # File first: on file failure the full record remains available for retry.
        # If the DB write fails, retry tolerates the now-missing audio file.
        return await db.delete_output(output_id)


async def save_output(document: dict) -> dict:
    async with mutation_lock:
        return await db.save_output(document)


async def clear_outputs(output_dir: str) -> int:
    count = 0
    while batch := await db.list_outputs(limit=100):
        for output in batch:
            count += int(await delete_output(output["id"], output_dir))
    return count
