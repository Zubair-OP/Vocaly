"""
Translation service using Gemini API (free tier).
Handles transcript chunking and sequential translation.
"""

import os
import google.generativeai as genai
from dotenv import load_dotenv
from services.languages import LANGUAGE_NAMES

load_dotenv()

# Language display names for prompt engineering

# Chunk size for splitting long transcripts (in characters)
MAX_CHUNK_SIZE = 3000


def _get_gemini_model():
    """Initialize and return the Gemini model."""
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key or api_key == "your_gemini_api_key_here":
        return None

    genai.configure(api_key=api_key)
    return genai.GenerativeModel(os.getenv("GEMINI_MODEL", "gemini-2.5-flash"))



def _chunk_text(text: str, max_size: int = MAX_CHUNK_SIZE) -> list[str]:
    """
    Split text into chunks for translation.
    Tries to split at sentence boundaries.
    """
    if len(text) <= max_size:
        return [text]

    chunks = []
    current_chunk = ""

    sentences = text.replace(". ", ".\n").split("\n")

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue

        if len(current_chunk) + len(sentence) + 1 > max_size:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence
        else:
            current_chunk += " " + sentence if current_chunk else sentence

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks if chunks else [text]


def _build_translation_prompt(text: str, source_lang: str, target_lang: str) -> str:
    """Build the translation prompt for the LLM."""
    source_name = LANGUAGE_NAMES.get(source_lang, source_lang)
    target_name = LANGUAGE_NAMES.get(target_lang, target_lang)

    return f"""Translate the following text from {source_name} to {target_name}.

Rules:
- Use natural, spoken-style {target_name} wording suitable for text-to-speech
- Preserve technical terms, proper nouns, and names as-is
- Preserve URLs as-is
- Do not add explanations or notes
- Do not use overly formal or literary phrasing
- Return ONLY the translated text, nothing else

Text to translate:
{text}"""


async def translate_text(
    text: str, source_language: str, target_language: str
) -> dict:
    """
    Translate text from source to target language using Gemini.
    Handles chunking for long transcripts.
    Returns dict with translated_text or error.
    """
    if source_language == target_language:
        return {"translated_text": text}

    model = _get_gemini_model()

    chunks = _chunk_text(text)
    translated_chunks = []

    try:
        if model is None:
            raise ValueError("Translation provider is not configured")
        for chunk in chunks:
            prompt = _build_translation_prompt(chunk, source_language, target_language)
            response = await model.generate_content_async(prompt, request_options={"timeout": 45})

            if response and response.text:
                translated_chunks.append(response.text.strip())
            else:
                raise Exception("Gemini returned an empty response")

        translated_text = " ".join(translated_chunks)
        return {"translated_text": translated_text}

    except Exception as e:
        error_str = str(e)
        print(f"[Translation] Gemini failed: {type(e).__name__}")

        # Try Groq fallback if GROQ_API_KEY is available in .env
        groq_key = os.getenv("GROQ_API_KEY", "")
        if groq_key and groq_key not in {"your_groq_api_key_here", "optional_fallback_key"}:
            print("[Translation] Attempting fallback using Groq API...")
            try:
                groq_translated = await _translate_with_groq(text, source_language, target_language, groq_key)
                if groq_translated:
                    print("[Translation] Groq fallback successful!")
                    return {"translated_text": groq_translated}
            except Exception as ge:
                print(f"[Translation] Groq fallback also failed: {type(ge).__name__}")

        if model is None:
            return {"error": "Translation is not configured. Add a working translation API key to the backend.", "error_code": "translation_not_configured"}
        err_lower = error_str.lower()
        if "quota" in err_lower or "rate" in err_lower or "limit" in err_lower or "429" in err_lower:
            return {"error": "The translation service has reached its usage limit. Try again later or check the provider quota.", "error_code": "translation_rate_limited"}
        return {"error": "Translation could not be completed. Please try again.", "error_code": "translation_failed"}


async def _translate_with_groq(text: str, source_lang: str, target_lang: str, api_key: str) -> str:
    """Fallback translation using Groq Cloud API."""
    import httpx

    source_name = LANGUAGE_NAMES.get(source_lang, source_lang)
    target_name = LANGUAGE_NAMES.get(target_lang, target_lang)

    system_prompt = (
        f"You are an expert translator. Translate the text from {source_name} to {target_name}. "
        f"Use natural, spoken-style wording suitable for text-to-speech. "
        f"Preserve technical terms, proper nouns, and URLs as-is. "
        f"Return ONLY the translated text without explanations."
    )

    chunks = _chunk_text(text)
    translated_chunks = []

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Determine available Groq model
        chosen_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
        try:
            m_res = await client.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {api_key}"},
            )
            if m_res.status_code == 200:
                available_ids = [m.get("id") for m in m_res.json().get("data", [])]
                for candidate in [
                    chosen_model,
                    "openai/gpt-oss-120b",
                    "openai/gpt-oss-20b",
                    "llama-3.3-70b-versatile",
                    "llama-3.1-8b-instant",
                ]:
                    if candidate in available_ids:
                        chosen_model = candidate
                        break
        except Exception:
            pass

        print(f"[Translation] Using Groq model: {chosen_model}")

        for chunk in chunks:
            payload = {
                "model": chosen_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": chunk},
                ],
                "temperature": 0.3,
            }
            res = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            if res.status_code != 200:
                print(f"[Translation] Groq error response: {res.status_code}")
            res.raise_for_status()
            data = res.json()
            content = data["choices"][0]["message"]["content"].strip()
            if not content:
                raise ValueError("Groq returned an empty translation")
            translated_chunks.append(content)

    return " ".join(translated_chunks)
