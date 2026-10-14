"""Coordinate output metadata and generated audio deletion for the demo."""

import asyncio
import hashlib
import re
from pathlib import Path

import db
from services import cloudinary_storage

# All output mutations share this lock in the single-worker demo deployment.
mutation_lock = asyncio.Lock()


class AudioCleanupFailed(Exception):
    """The record must be retained so cleanup can be retried."""


def _remove_local_audio(audio_url: str, output_dir: str) -> None:
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


async def remove_audio(audio_url: str, output_dir: str) -> None:
    """Delete the cloud copy and local backup for an audio URL."""
    if not audio_url:
        return
    match = re.fullmatch(r"/api/audio/([a-zA-Z0-9_-]+\.(?:mp3|wav))", audio_url)
    if not match:
        raise AudioCleanupFailed("Invalid stored audio path.")
    try:
        await cloudinary_storage.delete_audio_file(match.group(1))
        await asyncio.to_thread(_remove_local_audio, audio_url, output_dir)
    except (cloudinary_storage.CloudinaryStorageError, db.DatabaseUnavailable) as exc:
        raise AudioCleanupFailed("Cloud audio could not be removed.") from exc


async def sync_local_audio(output_dir: str) -> int:
    """Upload every local MP3/WAV into Cloudinary while retaining its local copy."""
    if not cloudinary_storage.is_configured():
        return 0
    existing = {item["filename"]: item for item in await db.list_audio_assets()}
    directory = Path(output_dir).resolve()
    synced = 0
    for path in sorted(directory.rglob("*")):
        if path.is_symlink() or not path.is_file() or path.suffix.lower() not in {".mp3", ".wav"}:
            continue
        digest = await asyncio.to_thread(lambda: hashlib.sha256(path.read_bytes()).hexdigest())
        asset = existing.get(path.name)
        if asset and asset.get("sha256") == digest:
            continue
        await cloudinary_storage.upload_audio_file(path)
        synced += 1
    return synced


async def delete_output(output_id: str, output_dir: str) -> bool:
    async with mutation_lock:
        output = await db.get_output(output_id)
        if output is None:
            return False
        audio_urls = {output.get("audioUrl", ""), output.get("summaryAudioUrl", "")}
        # Manually saved records can share either audio URL.
        for audio_url in filter(None, audio_urls):
            if not await db.audio_is_shared(output_id, audio_url):
                await remove_audio(audio_url, output_dir)
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
