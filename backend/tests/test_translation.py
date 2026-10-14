import os
import unittest
import httpx
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from services import translate


class TranslationTests(unittest.IsolatedAsyncioTestCase):
    def test_default_model_and_override(self):
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test"}, clear=True), patch.object(translate.genai, "configure"), patch.object(translate.genai, "GenerativeModel") as model:
            translate._get_gemini_model()
            model.assert_called_with("gemini-2.5-flash")
            os.environ["GEMINI_MODEL"] = "custom-model"
            translate._get_gemini_model()
            model.assert_called_with("custom-model")

    async def test_success_uses_async_generation(self):
        model = SimpleNamespace(generate_content_async=AsyncMock(return_value=SimpleNamespace(text="Translated text")))
        with patch.object(translate, "_get_gemini_model", return_value=model):
            self.assertEqual(await translate.translate_text("Hello", "en", "ur"), {"translated_text": "Translated text"})
            model.generate_content_async.assert_awaited_once()

    async def test_quota_failure_uses_fallback(self):
        model = SimpleNamespace(generate_content_async=AsyncMock(side_effect=RuntimeError("429 quota exceeded")))
        with patch.object(translate, "_get_gemini_model", return_value=model), patch.dict(os.environ, {"GROQ_API_KEY": "test"}), patch.object(translate, "_translate_with_groq", new=AsyncMock(return_value="Fallback translation")) as fallback:
            result = await translate.translate_text("Hello", "en", "ur")
            self.assertEqual(result, {"translated_text": "Fallback translation"})
            fallback.assert_awaited_once()

    async def test_quota_failure_is_actionable(self):
        model = SimpleNamespace(generate_content_async=AsyncMock(side_effect=RuntimeError("429 quota exceeded")))
        with patch.object(translate, "_get_gemini_model", return_value=model), patch.dict(os.environ, {}, clear=True):
            result = await translate.translate_text("Hello", "en", "ur")
            self.assertEqual(result["error_code"], "translation_rate_limited")

    async def test_missing_configuration_never_generates_placeholder_audio(self):
        with patch.object(translate, "_get_gemini_model", return_value=None), patch.dict(os.environ, {}, clear=True):
            result = await translate.translate_text("Hello", "en", "ur")
            self.assertEqual(result["error_code"], "translation_not_configured")
            self.assertNotIn("translated_text", result)

    async def test_groq_only_configuration(self):
        with patch.object(translate, "_get_gemini_model", return_value=None), patch.dict(os.environ, {"GROQ_API_KEY": "test"}, clear=True), patch.object(translate, "_translate_with_groq", new=AsyncMock(return_value="Translation")):
            self.assertEqual(await translate.translate_text("Hello", "en", "ur"), {"translated_text": "Translation"})

    async def test_summary_uses_groq(self):
        with patch.dict(os.environ, {"GROQ_API_KEY": "test"}), patch.object(translate, "_summarize_with_groq", new=AsyncMock(return_value="Groq summary")) as summarize:
            result = await translate.summarize_text("A long video transcript", "ur")
            self.assertEqual(result, {"summary_text": "Groq summary"})
            summarize.assert_awaited_once_with("A long video transcript", "Urdu", "test")

    async def test_summary_quota_failure_is_actionable(self):
        response = httpx.Response(429, request=httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions"))
        failure = httpx.HTTPStatusError("rate limited", request=response.request, response=response)
        with patch.dict(os.environ, {"GROQ_API_KEY": "test"}, clear=True), patch.object(translate, "_summarize_with_groq", new=AsyncMock(side_effect=failure)):
            result = await translate.summarize_text("A long video transcript", "en")
            self.assertEqual(result["error_code"], "summary_rate_limited")
            self.assertIn("Groq", result["error"])

    async def test_missing_groq_key_is_actionable(self):
        with patch.dict(os.environ, {}, clear=True):
            result = await translate.summarize_text("A long video transcript", "en")
            self.assertEqual(result["error_code"], "summary_not_configured")
            self.assertIn("GROQ_API_KEY", result["error"])


if __name__ == "__main__":
    unittest.main()
