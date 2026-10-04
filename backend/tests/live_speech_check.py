"""Manual network smoke test: python tests/live_speech_check.py."""
import asyncio
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from services.languages import PREVIEW_TEXT
from services.tts import VOICE_MAP, generate_speech, voice_catalogue


async def main():
    catalogue = await voice_catalogue()
    directory = Path("outputs") / "smoke-test"
    results = []
    # Sequential calls keep this check gentle on the free service.
    for language, text in PREVIEW_TEXT.items():
        known = VOICE_MAP[language][0]["id"]
        voice = next((voice["id"] for voice in catalogue[language] if voice["id"] == known), catalogue[language][0]["id"])
        result = await generate_speech(text, voice, "smoketest", language, str(directory))
        results.append({"language": language, "passed": "error" not in result, "result": result})
        print(language, "PASS" if "error" not in result else "FAIL", flush=True)
    for style in ("motivational", "calm"):
        result = await generate_speech(PREVIEW_TEXT["en"], VOICE_MAP["en"][0]["id"], "smoketest", "en", str(directory), style)
        results.append({"style": style, "passed": "error" not in result, "result": result})
        print(style, "PASS" if "error" not in result else "FAIL", flush=True)
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "results.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
    if not all(item["passed"] for item in results):
        raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())
