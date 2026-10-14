import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import httpx
import app
from services import tts, transcript
from services.languages import LANGUAGE_NAMES, NARRATION_PRESETS, PREVIEW_TEXT


class SpeechTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.output_patch = patch.object(app, "OUTPUT_DIR", self.directory.name)
        self.output_patch.start()
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app.app), base_url="http://test")

    async def asyncTearDown(self):
        await self.client.aclose()
        self.output_patch.stop()
        self.directory.cleanup()

    async def test_all_languages_and_presets_generate_audio(self):
        async def save(path):
            Path(path).write_bytes(b"test-audio")
        with patch.object(tts.edge_tts, "Communicate") as communicate:
            communicate.return_value.save = AsyncMock(side_effect=save)
            for language in LANGUAGE_NAMES:
                for style, options in NARRATION_PRESETS.items():
                    result = await tts.generate_speech(PREVIEW_TEXT[language], tts.VOICE_MAP[language][0]["id"], "abcdefghijk", language, self.directory.name, style)
                    self.assertIn("audio_filename", result)
                    self.assertEqual(communicate.call_args.kwargs, options)

    async def test_discovery_groups_languages_and_caches(self):
        voices = [{"Locale": "fr-FR", "ShortName": "fr-FR-Test", "FriendlyName": "Test", "Gender": "Female"}]
        with patch.object(tts, "_catalogue", None), patch.object(tts.edge_tts, "list_voices", new=AsyncMock(return_value=voices)) as discover:
            result = await tts.voice_catalogue()
            self.assertEqual(result["fr"][0]["id"], "fr-FR-Test")
            self.assertEqual(set(result), set(LANGUAGE_NAMES))
            await tts.voice_catalogue()
            discover.assert_awaited_once()

    async def test_preview_rejects_mismatched_voice(self):
        with patch.object(tts, "_catalogue", tts.VOICE_MAP), patch.object(tts, "_catalogue_time", float("inf")):
            response = await self.client.post("/api/voice-preview", json={"target_language": "ur", "voice": "en-US-GuyNeural"})
            self.assertEqual(response.status_code, 400)

    async def test_standard_generate_route_passes_style_and_saves_metadata(self):
        with patch.object(tts, "_catalogue", tts.VOICE_MAP), patch.object(tts, "_catalogue_time", float("inf")), patch.object(app, "translate_text", new=AsyncMock(return_value={"translated_text": "Bonjour"})), patch.object(app, "summarize_text", new=AsyncMock(return_value={"summary_text": "Résumé important."})), patch.object(app, "generate_speech", new=AsyncMock(return_value={"audio_filename": "result.mp3", "job_id": "test"})) as generate, patch.object(app.db, "save_output", new=AsyncMock(side_effect=lambda document: document)):
            response = await self.client.post("/api/generate", json={"video_id": "abcdefghijk", "source_language": "en", "target_language": "fr", "voice": "fr-FR-DeniseNeural", "transcript": "Hello", "title": "Test", "narration_style": "motivational"})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(generate.call_args.kwargs["narration_style"], "motivational")
            self.assertEqual(response.json()["output"]["narration_style"], "motivational")
            self.assertEqual(response.json()["audio_url"], "/api/audio/result.mp3")

    def test_caption_language_is_preserved(self):
        class Captions(list):
            language_code = "fr"
        captions = Captions([SimpleNamespace(text="Bonjour", start=0, duration=2)])
        api = SimpleNamespace(fetch=lambda *args, **kwargs: captions)
        with patch.object(transcript, "YouTubeTranscriptApi", return_value=api):
            self.assertEqual(transcript.fetch_transcript("abcdefghijk")["source_language"], "fr")

    def test_ten_minute_caption_limit(self):
        for end, allowed in [(120, True), (599, True), (600, True), (601, False)]:
            with self.subTest(end=end):
                api = SimpleNamespace(fetch=lambda *args, **kwargs: [SimpleNamespace(text="Hello", start=0, duration=end)])
                with patch.object(transcript, "YouTubeTranscriptApi", return_value=api):
                    result = transcript.fetch_transcript("abcdefghijk")
                self.assertEqual("segments" in result, allowed)
                if not allowed:
                    self.assertEqual(result["error_code"], "video_too_long")

    def test_missing_captions_and_network_errors_are_distinct(self):
        for error, code in [(transcript.TranscriptsDisabled("abcdefghijk"), "captions_unavailable"), (ConnectionError("private network detail"), "transcript_service_unavailable")]:
            api = SimpleNamespace(fetch=lambda *args, **kwargs: None)
            with patch.object(api, "fetch", side_effect=error), patch.object(transcript, "YouTubeTranscriptApi", return_value=api):
                result = transcript.fetch_transcript("abcdefghijk")
            self.assertEqual(result["error_code"], code)
            self.assertNotIn("private network detail", result["error"])

    def test_any_available_caption_language_is_fetched(self):
        class Captions(list):
            language_code = "ja"
        captions = Captions([SimpleNamespace(text="こんにちは", start=0, duration=2)])
        def unavailable(*args, **kwargs):
            raise transcript.NoTranscriptFound("abcdefghijk", ["en"], [])
        api = SimpleNamespace(fetch=unavailable, list=lambda _: [SimpleNamespace(fetch=lambda: captions)])
        with patch.object(transcript, "YouTubeTranscriptApi", return_value=api):
            self.assertEqual(transcript.fetch_transcript("abcdefghijk")["source_language"], "ja")


if __name__ == "__main__":
    unittest.main()
