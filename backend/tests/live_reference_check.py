"""Manual XTTS check using a synthetic reference, not an identifiable person."""
import asyncio
import json
import os
from pathlib import Path
import sys
import wave

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ["ENABLE_XTTS"] = "true"
os.environ.setdefault("TTS_HOME", str(Path("outputs/models").resolve()))
os.environ.setdefault("HF_HOME", str(Path("outputs/models/huggingface").resolve()))
from services.reference_voice import generate_reference_speech, save_reference


async def main():
    directory = Path("outputs/smoke-test")
    source = directory / "reference.wav"
    reference_id = save_reference(source.read_bytes(), str(directory))
    result = await generate_reference_speech("Believe in yourself. Every small step brings you closer to your goal.", "en", reference_id, str(directory))
    passed = "error" not in result
    if passed:
        with wave.open(str(directory / result["audio_filename"]), "rb") as audio:
            passed = audio.getnframes() > 0
            result["duration_seconds"] = round(audio.getnframes() / audio.getframerate(), 2)
    (directory / "reference-results.json").write_text(json.dumps({"passed": passed, "result": result}, indent=2), encoding="utf-8")
    print("Reference voice", "PASS" if passed else "FAIL", flush=True)
    if not passed:
        raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())
