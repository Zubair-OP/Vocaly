import os
import unittest
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


if __name__ == "__main__":
    unittest.main()
