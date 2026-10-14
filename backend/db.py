"""
MongoDB persistence layer for Vocally.

Stores generated output metadata (transcripts, translations, audio refs)
in MongoDB Atlas instead of the browser's localStorage.
"""

import os
from datetime import datetime, timezone
from typing import Any

from pymongo import ASCENDING, DESCENDING, AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import PyMongoError

DATABASE_NAME = os.getenv("MONGO_DATABASE", "vocally")
OUTPUTS_COLLECTION = "outputs"
AUDIO_ASSETS_COLLECTION = "audio_assets"

_client: AsyncMongoClient | None = None


class DatabaseUnavailable(Exception):
    """Raised when MongoDB cannot be reached or an operation fails."""


def get_client() -> AsyncMongoClient:
    global _client
    if _client is None:
        # Read lazily so the value is available even when this module is
        # imported before load_dotenv() runs.
        uri = os.getenv("MONGO_URI", "").strip()
        if not uri:
            raise DatabaseUnavailable("MONGO_URI is not set in the environment.")
        _client = AsyncMongoClient(
            uri,
            serverSelectionTimeoutMS=8000,
            connectTimeoutMS=8000,
        )
    return _client


def get_db() -> AsyncDatabase:
    # Resolve after dotenv is loaded, just like the connection URI.
    return get_client()[os.getenv("MONGO_DATABASE", DATABASE_NAME)]


def outputs_collection():
    return get_db()[OUTPUTS_COLLECTION]


def audio_assets_collection():
    return get_db()[AUDIO_ASSETS_COLLECTION]


async def connect_to_mongo() -> None:
    """Ping MongoDB and make sure the output indexes exist."""
    try:
        client = get_client()
        await client.admin.command("ping")
        await outputs_collection().create_index([("created_at", ASCENDING)])
        await outputs_collection().create_index([("id", ASCENDING)], unique=True)
        await audio_assets_collection().create_index([("filename", ASCENDING)], unique=True)
    except PyMongoError as exc:
        raise DatabaseUnavailable("Could not connect to MongoDB.") from exc


async def save_audio_asset(asset: dict[str, Any]) -> None:
    document = {**asset, "synced_at": datetime.now(timezone.utc)}
    try:
        await audio_assets_collection().update_one(
            {"filename": document["filename"]},
            {"$set": document, "$setOnInsert": {"created_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
    except PyMongoError as exc:
        raise DatabaseUnavailable("Could not save Cloudinary audio metadata.") from exc


async def get_audio_asset(filename: str) -> dict[str, Any] | None:
    try:
        return await audio_assets_collection().find_one({"filename": filename})
    except PyMongoError as exc:
        raise DatabaseUnavailable("Could not load Cloudinary audio metadata.") from exc


async def delete_audio_asset(filename: str) -> None:
    try:
        await audio_assets_collection().delete_one({"filename": filename})
    except PyMongoError as exc:
        raise DatabaseUnavailable("Could not delete Cloudinary audio metadata.") from exc


async def list_audio_assets() -> list[dict[str, Any]]:
    try:
        return await audio_assets_collection().find({}).to_list(length=None)
    except PyMongoError as exc:
        raise DatabaseUnavailable("Could not list Cloudinary audio metadata.") from exc


async def close_mongo_connection() -> None:
    global _client
    if _client is not None:
        await _client.close()
        _client = None


def serialize_output(doc: dict[str, Any]) -> dict[str, Any]:
    """Convert a Mongo document into the camelCase shape the UI expects."""
    created_at = doc.get("created_at")
    if isinstance(created_at, datetime):
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        created_iso = created_at.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    else:
        created_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    return {
        "id": doc.get("id"),
        "videoId": doc.get("video_id", ""),
        "title": doc.get("title", ""),
        "sourceLanguage": doc.get("source_language", ""),
        "targetLanguage": doc.get("target_language", ""),
        "voice": doc.get("voice", ""),
        "narrationStyle": doc.get("narration_style", "normal"),
        "originalTranscript": doc.get("original_transcript", ""),
        "translatedText": doc.get("translated_text", ""),
        "summaryText": doc.get("summary_text", ""),
        "audioUrl": doc.get("audio_url", ""),
        "summaryAudioUrl": doc.get("summary_audio_url", ""),
        "createdAt": created_iso,
        "status": doc.get("status", "completed"),
    }


async def save_output(document: dict[str, Any]) -> dict[str, Any]:
    """
    Insert (or replace) an output document keyed by its `id`.
    Returns the serialized document.
    """
    document = {**document}
    document.setdefault("created_at", datetime.now(timezone.utc))
    document.setdefault("status", "completed")

    try:
        await outputs_collection().replace_one(
            {"id": document["id"]},
            document,
            upsert=True,
        )
    except PyMongoError as exc:
        raise DatabaseUnavailable(f"Could not save output: {exc}") from exc

    return serialize_output(document)


async def list_outputs(limit: int = 100) -> list[dict[str, Any]]:
    """Return outputs, newest first."""
    try:
        cursor = (
            outputs_collection()
            .find({})
            .sort("created_at", DESCENDING)
            .limit(limit)
        )
        docs = await cursor.to_list(length=limit)
    except PyMongoError as exc:
        raise DatabaseUnavailable(f"Could not load outputs: {exc}") from exc

    return [serialize_output(doc) for doc in docs]


async def get_output(output_id: str) -> dict[str, Any] | None:
    try:
        doc = await outputs_collection().find_one({"id": output_id})
    except PyMongoError as exc:
        raise DatabaseUnavailable(f"Could not load output: {exc}") from exc
    return serialize_output(doc) if doc else None


async def delete_output(output_id: str) -> bool:
    try:
        result = await outputs_collection().delete_one({"id": output_id})
    except PyMongoError as exc:
        raise DatabaseUnavailable(f"Could not delete output: {exc}") from exc
    return result.deleted_count > 0


async def audio_is_shared(output_id: str, audio_url: str) -> bool:
    try:
        doc = await outputs_collection().find_one(
            {"id": {"$ne": output_id}, "$or": [{"audio_url": audio_url}, {"summary_audio_url": audio_url}]}, {"_id": 1}
        )
    except PyMongoError as exc:
        raise DatabaseUnavailable("Could not check audio references.") from exc
    return doc is not None


async def clear_outputs() -> int:
    try:
        result = await outputs_collection().delete_many({})
    except PyMongoError as exc:
        raise DatabaseUnavailable(f"Could not clear outputs: {exc}") from exc
    return result.deleted_count
