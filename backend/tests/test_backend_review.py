import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
from pymongo import DESCENDING

import app
import db
from services import transcript, translate, tts


class BackendReviewTests(unittest.IsolatedAsyncioTestCase):
    def test_youtube_links_require_an_exact_trusted_host_and_video_id(self):
        for url in (
            "https://youtube.com/watch?feature=share&v=abcdefghijk",
            "youtu.be/abcdefghijk?t=12",
            "https://m.youtube.com/shorts/abcdefghijk",
            "https://www.youtube.com/embed/abcdefghijk",
        ):
            self.assertEqual(transcript.extract_video_id(url), "abcdefghijk")
        for url in (
            "https://evilyoutube.com/watch?v=abcdefghijk",
            "https://evil.test/youtube.com/watch?v=abcdefghijk",
            "https://youtube.com.evil.test/watch?v=abcdefghijk",
            "https://youtube.com@evil.test/watch?v=abcdefghijk",
            "https://user@youtube.com/watch?v=abcdefghijk",
            "file://youtube.com/watch?v=abcdefghijk",
            "https://youtu.be/abcdefghijkextra",
            "https://youtube.com/watch?v=abcdefghijk&v=12345678901",
            "https://[broken/watch?v=abcdefghijk",
        ):
            with self.subTest(url=url):
                self.assertIsNone(transcript.extract_video_id(url))

    def test_translation_chunks_bound_unpunctuated_text(self):
        for text in ("a" * 10001, "word " * 2000, "Hello. " + "b" * 7000):
            chunks = translate._chunk_text(text)
            self.assertTrue(all(0 < len(chunk) <= 3000 for chunk in chunks))
            self.assertEqual("".join(chunks).replace(" ", ""), text.replace(" ", ""))

    async def test_model_initialization_errors_are_sanitized(self):
        with patch.object(translate, "_get_gemini_model", side_effect=RuntimeError("private credential")), patch.dict(os.environ, {}, clear=True):
            result = await translate.translate_text("Hello", "en", "fr")
        self.assertIn("error", result)
        self.assertNotIn("private credential", str(result))

    async def test_latest_outputs_are_sorted_before_limit(self):
        records = [{"id": "latest"}, {"id": "previous"}]
        collection = MagicMock()
        cursor = collection.find.return_value
        cursor.sort.return_value = cursor
        cursor.limit.return_value = cursor
        cursor.to_list = AsyncMock(return_value=records)
        with patch.object(db, "outputs_collection", return_value=collection):
            result = await db.list_outputs(2)
        cursor.sort.assert_called_once_with("created_at", DESCENDING)
        cursor.limit.assert_called_once_with(2)
        self.assertEqual([item["id"] for item in result], ["latest", "previous"])

    def test_database_name_is_read_after_environment_configuration(self):
        client = MagicMock()
        with patch.object(db, "get_client", return_value=client), patch.dict(os.environ, {"MONGO_DATABASE": "configured_database"}):
            db.get_db()
        client.__getitem__.assert_called_once_with("configured_database")

    async def test_metadata_rejects_external_audio_and_oversized_content(self):
        payload = {"video_id": "abcdefghijk", "source_language": "en", "target_language": "fr", "audio_url": "/api/audio/result.mp3"}
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app.app), base_url="http://test") as client:
            with patch.object(db, "save_output", new=AsyncMock()) as save:
                for override in ({"audio_url": "https://evil.test/track.mp3"}, {"audio_url": "/api/audio/../references/private.wav"}, {"title": "a" * 501}, {"original_transcript": "a" * 30001}):
                    response = await client.post("/api/outputs", json={**payload, **override})
                    self.assertEqual(response.status_code, 422)
                save.assert_not_awaited()

    async def test_audio_rejects_directories_and_traversal(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(app, "OUTPUT_DIR", directory):
            Path(directory, "directory.mp3").mkdir()
            Path(directory, "valid.mp3").write_bytes(b"audio")
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app.app), base_url="http://test") as client:
                self.assertEqual((await client.get("/api/audio/directory.mp3")).status_code, 404)
                self.assertEqual((await client.get("/api/audio/..%5Coutside.mp3")).status_code, 404)
                self.assertEqual((await client.get("/api/audio/valid.mp3")).status_code, 200)

    async def test_tts_failure_removes_partial_audio_and_hides_provider_details(self):
        with tempfile.TemporaryDirectory() as directory:
            async def fail(path):
                Path(path).write_bytes(b"partial")
                raise RuntimeError("private upstream information")
            with patch.object(tts.edge_tts, "Communicate") as communicate, patch.object(tts, "_generate_gemini_speech", new=AsyncMock(return_value={"error": "Speech unavailable", "error_code": "speech_generation_failed"})):
                communicate.return_value.save = AsyncMock(side_effect=fail)
                result = await tts.generate_speech("Hello", "en-US-GuyNeural", "abcdefghijk", "en", directory)
            self.assertNotIn("private upstream information", str(result))
            self.assertEqual(list(Path(directory).iterdir()), [])


if __name__ == "__main__":
    unittest.main()
