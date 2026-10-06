import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx

import app
import db
from services import outputs


class OutputDeletionTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.path = Path(self.directory.name, "generated.mp3")
        self.path.write_bytes(b"audio")
        self.document = {"id": "test", "audioUrl": "/api/audio/generated.mp3", "originalTranscript": "private", "translatedText": "translated", "voice": "voice"}

    async def asyncTearDown(self):
        self.directory.cleanup()

    async def test_route_removes_file_and_entire_record(self):
        records = {"test": self.document.copy()}
        async def delete(output_id):
            return records.pop(output_id, None) is not None
        with patch.object(app, "OUTPUT_DIR", self.directory.name), patch.object(db, "get_output", new=AsyncMock(side_effect=records.get)), patch.object(db, "audio_is_shared", new=AsyncMock(return_value=False)), patch.object(db, "delete_output", new=AsyncMock(side_effect=delete)):
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app.app), base_url="http://test") as client:
                self.assertEqual((await client.delete("/api/outputs/test")).status_code, 200)
                self.assertEqual(records, {})
                self.assertFalse(self.path.exists())
                self.assertEqual((await client.get("/api/audio/generated.mp3")).status_code, 404)
                self.assertEqual((await client.get("/api/outputs/test")).status_code, 404)
                self.assertEqual((await client.delete("/api/outputs/test")).status_code, 404)

    async def test_file_failure_keeps_record_for_retry(self):
        with patch.object(db, "get_output", new=AsyncMock(return_value=self.document)), patch.object(db, "audio_is_shared", new=AsyncMock(return_value=False)), patch.object(db, "delete_output", new=AsyncMock()) as delete, patch.object(Path, "unlink", side_effect=PermissionError("file busy")):
            with self.assertRaises(outputs.AudioCleanupFailed):
                await outputs.delete_output("test", self.directory.name)
            delete.assert_not_awaited()
        self.assertTrue(self.path.exists())

    async def test_db_failure_can_retry_after_file_has_gone(self):
        with patch.object(db, "get_output", new=AsyncMock(return_value=self.document)), patch.object(db, "audio_is_shared", new=AsyncMock(return_value=False)), patch.object(db, "delete_output", new=AsyncMock(side_effect=[db.DatabaseUnavailable("offline"), True])):
            with self.assertRaises(db.DatabaseUnavailable):
                await outputs.delete_output("test", self.directory.name)
            self.assertFalse(self.path.exists())
            self.assertTrue(await outputs.delete_output("test", self.directory.name))

    async def test_shared_audio_survives_deletion_of_one_record(self):
        with patch.object(db, "get_output", new=AsyncMock(return_value=self.document)), patch.object(db, "audio_is_shared", new=AsyncMock(return_value=True)), patch.object(db, "delete_output", new=AsyncMock(return_value=True)):
            self.assertTrue(await outputs.delete_output("test", self.directory.name))
        self.assertTrue(self.path.exists())

    async def test_invalid_path_never_deletes_file_or_record(self):
        for url in ("/api/audio/../generated.mp3", "/api/audio/references/sample.wav", "https://example.com/generated.mp3", "/api/audio/..\\generated.mp3"):
            with self.subTest(url=url), patch.object(db, "get_output", new=AsyncMock(return_value={**self.document, "audioUrl": url})), patch.object(db, "audio_is_shared", new=AsyncMock(return_value=False)), patch.object(db, "delete_output", new=AsyncMock()) as delete:
                with self.assertRaises(outputs.AudioCleanupFailed):
                    await outputs.delete_output("test", self.directory.name)
                delete.assert_not_awaited()
        self.assertTrue(self.path.exists())

    async def test_clear_uses_file_cleanup_for_every_record(self):
        with patch.object(db, "list_outputs", new=AsyncMock(side_effect=[[self.document], []])), patch.object(db, "get_output", new=AsyncMock(return_value=self.document)), patch.object(db, "audio_is_shared", new=AsyncMock(return_value=False)), patch.object(db, "delete_output", new=AsyncMock(return_value=True)):
            self.assertEqual(await outputs.clear_outputs(self.directory.name), 1)
        self.assertFalse(self.path.exists())
