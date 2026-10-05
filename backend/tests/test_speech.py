import io
import importlib.util
import os
import tempfile
import unittest
import wave
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import httpx
import app
from services import tts, transcript, reference_voice
from services.languages import LANGUAGE_NAMES, NARRATION_PRESETS, PREVIEW_TEXT


def wav_sample(seconds=6):
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(8000)
        audio.writeframes(b"\0\0" * 8000 * seconds)
    return buffer.getvalue()


class SpeechTests(unittest.IsolatedAsyncioTestCase):
    def test_reference_availability_requires_terms_and_prepared_weights(self):
        with patch.dict(os.environ, {"ENABLE_XTTS": "true", "COQUI_TOS_AGREED": "1", "TTS_HOME": self.directory.name}, clear=True), patch.object(reference_voice.importlib.util, "find_spec", return_value=SimpleNamespace()):
            self.assertFalse(reference_voice.is_available())
            directory = reference_voice.model_directory()
            directory.mkdir(parents=True)
            for name in ("model.pth", "config.json", "vocab.json"):
                (directory / name).write_bytes(b"fixture")
            self.assertTrue(reference_voice.is_available())
            os.environ["COQUI_TOS_AGREED"] = "0"
            self.assertFalse(reference_voice.is_available())

    def test_reference_languages_exclude_missing_text_dependencies(self):
        with patch.object(reference_voice.importlib.util, "find_spec", return_value=None):
            self.assertNotIn("zh", reference_voice.supported_languages())
            self.assertNotIn("ja", reference_voice.supported_languages())
            self.assertIn("hi", reference_voice.supported_languages())

    @unittest.skipUnless(all(importlib.util.find_spec(name) for name in ("torch", "torchaudio", "soundfile")), "Optional speech dependencies are not installed")
    def test_reference_decodes_and_resamples_without_ffmpeg(self):
        reference_id = reference_voice.save_reference(wav_sample(), self.directory.name)
        audio = reference_voice.load_reference_audio(reference_voice.reference_path(reference_id, self.directory.name), "cpu")
        self.assertEqual(tuple(audio.shape), (1, 6 * 22050))

    def test_reference_chunks_fit_model_window_without_losing_words(self):
        text = "Believe in yourself. " + "Keep going and take another small step. " * 20
        chunks = reference_voice.speech_chunks(text, 180)
        self.assertTrue(all(0 < len(chunk) <= 180 for chunk in chunks))
        self.assertEqual(" ".join(chunks).split(), text.split())
        japanese = "自分を信じてください。" * 20
        self.assertEqual("".join(reference_voice.speech_chunks(japanese, 70)).replace(" ", ""), japanese)

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
        with patch.object(tts, "_catalogue", tts.VOICE_MAP), patch.object(tts, "_catalogue_time", float("inf")), patch.object(app, "translate_text", new=AsyncMock(return_value={"translated_text": "Bonjour"})), patch.object(app, "generate_speech", new=AsyncMock(return_value={"audio_filename": "result.mp3", "job_id": "test"})) as generate, patch.object(app.db, "save_output", new=AsyncMock(side_effect=lambda document: document)):
            response = await self.client.post("/api/generate", json={"video_id": "abcdefghijk", "source_language": "en", "target_language": "fr", "voice": "fr-FR-DeniseNeural", "transcript": "Hello", "title": "Test", "narration_style": "motivational"})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(generate.call_args.kwargs["narration_style"], "motivational")
            self.assertEqual(response.json()["output"]["narration_style"], "motivational")
            self.assertEqual(response.json()["audio_url"], "/api/audio/result.mp3")

    async def test_reference_upload_validates_wav(self):
        with patch.object(reference_voice, "is_available", return_value=True):
            bad = await self.client.post("/api/speaker-reference", content=b"invalid")
            self.assertEqual(bad.status_code, 400)
            good = await self.client.post("/api/speaker-reference", content=wav_sample())
            self.assertEqual(good.status_code, 200)
            self.assertTrue(reference_voice.reference_path(good.json()["reference_id"], self.directory.name).is_file())
        with self.assertRaises(ValueError):
            reference_voice.save_reference(wav_sample(1), self.directory.name)
        with self.assertRaises(ValueError):
            reference_voice.save_reference(wav_sample()[:100], self.directory.name)
        with self.assertRaises(ValueError):
            reference_voice.reference_path("../reference", self.directory.name)

    async def test_reference_unavailable_is_explicit(self):
        with patch.object(reference_voice, "is_available", return_value=False):
            response = await self.client.post("/api/speaker-reference", content=wav_sample())
            self.assertEqual(response.status_code, 503)
            self.assertEqual(response.json()["detail"]["code"], "reference_unavailable")

    async def test_reference_generate_route_and_wav_serving(self):
        reference_id = reference_voice.save_reference(wav_sample(), self.directory.name)
        Path(self.directory.name, "result.wav").write_bytes(wav_sample())
        with patch.object(reference_voice, "is_available", return_value=True), patch.object(app, "translate_text", new=AsyncMock(return_value={"translated_text": "Bonjour"})), patch.object(reference_voice, "generate_reference_speech", new=AsyncMock(return_value={"audio_filename": "result.wav", "job_id": "test"})) as generate, patch.object(app.db, "save_output", new=AsyncMock(side_effect=lambda document: document)):
            payload = {"video_id": "abcdefghijk", "source_language": "en", "target_language": "fr", "voice": "", "transcript": "Hello", "title": "Test", "speech_mode": "reference", "reference_id": reference_id, "speaker_consent": True}
            response = await self.client.post("/api/generate", json=payload)
            self.assertEqual(response.status_code, 200)
            generate.assert_awaited_once()
            self.assertEqual(response.json()["audio_url"], "/api/audio/result.wav")
            audio = await self.client.get(response.json()["audio_url"])
            self.assertEqual(audio.headers["content-type"], "audio/wav")
            payload["speaker_consent"] = False
            self.assertEqual((await self.client.post("/api/generate", json=payload)).status_code, 400)
            payload.update(speaker_consent=True, target_language="ur")
            self.assertEqual((await self.client.post("/api/generate", json=payload)).status_code, 400)

    def test_caption_language_is_preserved(self):
        class Captions(list):
            language_code = "fr"
        captions = Captions([SimpleNamespace(text="Bonjour", start=0, duration=2)])
        api = SimpleNamespace(fetch=lambda *args, **kwargs: captions)
        with patch.object(transcript, "YouTubeTranscriptApi", return_value=api):
            self.assertEqual(transcript.fetch_transcript("abcdefghijk")["source_language"], "fr")

    def test_five_minute_caption_limit(self):
        for end, allowed in [(120, True), (299, True), (300, True), (301, False)]:
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
