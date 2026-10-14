"""Cloudinary-backed storage for generated audio assets."""

import asyncio
import hashlib
import os
from pathlib import Path
from typing import Any

from pymongo.errors import PyMongoError

import db


class CloudinaryStorageError(Exception):
    """Cloudinary upload or deletion failed without exposing credentials."""


def _credentials() -> dict[str, str]:
    return {
        "cloud_name": os.getenv("CLOUDINARY_CLOUD_NAME", "").strip(),
        "api_key": os.getenv("CLOUDINARY_API_KEY", "").strip(),
        "api_secret": os.getenv("CLOUDINARY_API_SECRET", "").strip(),
    }


def is_configured() -> bool:
    values = _credentials()
    return all(values.values()) and not any(
        value.lower().startswith(("your_", "optional_", "<")) for value in values.values()
    )


def _configure_sdk():
    if not is_configured():
        raise CloudinaryStorageError(
            "Cloudinary requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
        )
    import cloudinary
    import cloudinary.uploader

    cloudinary.config(**_credentials(), secure=True)
    return cloudinary


def _safe_public_id(filename: str, folder: str) -> str:
    path = Path(filename)
    extension = path.suffix.lower().lstrip(".")
    if extension not in {"mp3", "wav"} or path.name != filename:
        raise CloudinaryStorageError("Unsupported audio filename.")
    return f"{folder.strip('/')}/{path.stem}_{extension}"


def _upload_sync(path: Path, folder: str) -> dict[str, Any]:
    cloudinary = _configure_sdk()
    public_id = _safe_public_id(path.name, folder)
    result = cloudinary.uploader.upload(
        str(path),
        resource_type="video",
        public_id=public_id,
        overwrite=True,
        unique_filename=False,
        use_filename=False,
        type="upload",
    )
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    return {
        "filename": path.name,
        "public_id": result["public_id"],
        "secure_url": result["secure_url"],
        "resource_type": result.get("resource_type", "video"),
        "format": result.get("format", path.suffix.lower().lstrip(".")),
        "bytes": result.get("bytes", path.stat().st_size),
        "sha256": digest,
        "content_type": "audio/wav" if path.suffix.lower() == ".wav" else "audio/mpeg",
    }


async def upload_audio_file(path: Path) -> dict[str, Any]:
    """Upload an audio file to Cloudinary and persist its Cloudinary mapping in MongoDB."""
    try:
        asset = await asyncio.to_thread(
            _upload_sync,
            path.resolve(),
            os.getenv("CLOUDINARY_AUDIO_FOLDER", "vocally/audio"),
        )
        await db.save_audio_asset(asset)
        return asset
    except CloudinaryStorageError:
        raise
    except (PyMongoError, db.DatabaseUnavailable) as exc:
        raise CloudinaryStorageError("Cloudinary asset metadata could not be saved in MongoDB.") from exc
    except Exception as exc:
        print(f"[Cloudinary] Audio upload failed ({type(exc).__name__})")
        raise CloudinaryStorageError("Audio could not be uploaded to Cloudinary.") from exc


async def get_audio_asset(filename: str) -> dict[str, Any] | None:
    """Return stored cloud metadata for an audio filename."""
    try:
        return await db.get_audio_asset(filename)
    except (PyMongoError, db.DatabaseUnavailable) as exc:
        raise CloudinaryStorageError("Audio metadata is unavailable.") from exc


def _destroy_sync(public_id: str) -> bool:
    cloudinary = _configure_sdk()
    result = cloudinary.uploader.destroy(
        public_id,
        resource_type="video",
        type="upload",
        invalidate=True,
    )
    return result.get("result") in {"ok", "not found"}


async def delete_audio_file(filename: str) -> None:
    """Remove a Cloudinary object and its MongoDB mapping, if one exists."""
    asset = await db.get_audio_asset(filename)
    if not asset:
        return
    try:
        deleted = await asyncio.to_thread(_destroy_sync, asset["public_id"])
        if not deleted:
            raise CloudinaryStorageError("Cloudinary did not confirm audio deletion.")
        await db.delete_audio_asset(filename)
    except CloudinaryStorageError:
        raise
    except (PyMongoError, db.DatabaseUnavailable) as exc:
        raise CloudinaryStorageError("Audio metadata could not be deleted from MongoDB.") from exc
    except Exception as exc:
        print(f"[Cloudinary] Audio deletion failed ({type(exc).__name__})")
        raise CloudinaryStorageError("Audio could not be deleted from Cloudinary.") from exc
