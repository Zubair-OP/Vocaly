"""Manual provider smoke test without printing credentials or translated content."""
import asyncio
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from services.languages import LANGUAGE_NAMES, PREVIEW_TEXT
from services.translate import translate_text


async def main():
    results = []
    for language in LANGUAGE_NAMES:
        result = await translate_text(PREVIEW_TEXT["en"], "en", language)
        passed = bool(result.get("translated_text")) and "error" not in result
        results.append({"language": language, "passed": passed, "error_code": result.get("error_code")})
        print(language, "PASS" if passed else result.get("error_code", "FAIL"), flush=True)
    directory = Path("outputs") / "smoke-test"
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "translation-results.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
    if not all(result["passed"] for result in results):
        raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())
