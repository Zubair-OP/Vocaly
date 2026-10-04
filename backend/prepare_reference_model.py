"""Download XTTS weights with resumable Hugging Face transfers before serving."""
import os
from pathlib import Path


def main():
    from dotenv import load_dotenv
    load_dotenv()
    if os.getenv("COQUI_TOS_AGREED") != "1":
        raise SystemExit("Review https://tts-hub.github.io/cpml/ and set COQUI_TOS_AGREED=1 only if you accept its non-commercial terms.")
    directory = Path(os.getenv("TTS_HOME", str(Path(os.getenv("OUTPUT_DIR", "./outputs")) / "models"))).resolve()
    os.environ.setdefault("HF_HOME", str(directory / "huggingface"))
    # The native Xet transport stalled on this Windows setup; HTTP transfers
    # keep resumable downloads and explicit network timeouts.
    if os.name == "nt":
        os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
    os.environ.setdefault("HF_HUB_DOWNLOAD_TIMEOUT", "60")
    from huggingface_hub import snapshot_download
    destination = directory / "tts" / "tts_models--multilingual--multi-dataset--xtts_v2"
    snapshot_download(
        repo_id="coqui/XTTS-v2", local_dir=str(destination),
        allow_patterns=["model.pth", "config.json", "vocab.json", "hash.md5", "speakers_xtts.pth"],
        max_workers=2,
    )
    print("XTTS model files downloaded:", destination, flush=True)


if __name__ == "__main__":
    main()
