# Speech features

The standard speech mode supports English, Urdu, Hindi, Arabic, Spanish, French,
German, Portuguese, Chinese (Mandarin), and Japanese. `/api/voices` discovers
Microsoft Edge voices and caches them for an hour, with a known voice catalogue
as an outage fallback. Generation still needs access to Microsoft's online service.

On Quick Dub, select a target language and voice, choose Normal, Motivational or
Calm, then click **Preview voice**. A short sample is generated in the selected
language and played in an audio player. Previews use the same narration settings
as full generation. Changing the voice or style clears the previous sample.

The presets change speech rate, pitch and volume. They approximate delivery styles;
they do not recover emotion from a source video or clone its speaker. Translation
preserves spoken wording and punctuation. Caption fetching now reports the actual
caption language; a video still needs available captions.

## Experimental reference voice

The optional provider uses XTTS-v2 through the maintained `coqui-tts` package.
It generates WAV files from translated text and a clean speaker reference. Of the
ten standard languages, all except Urdu can be supported in reference mode.
Chinese and Japanese additionally need the language dependencies below; the API
only advertises reference languages whose text-processing dependencies are installed.

Install the optional dependencies in the backend virtual environment:

```powershell
venv/Scripts/python.exe -m pip install -r requirements-reference.txt
```

Configure the backend environment and restart it:

```dotenv
ENABLE_XTTS=true
TTS_HOME=./outputs/models
COQUI_TOS_AGREED=1
```

XTTS-v2 weights must be prepared before enabling reference mode. The model's
[Coqui Public Model License](https://tts-hub.github.io/cpml/) permits only
non-commercial use of the model and its outputs. The preparation script requires
license acceptance before downloading. Set `COQUI_TOS_AGREED=1` only after reviewing and
accepting those terms. Reference mode remains disabled without this setting,
so the server cannot block on an interactive license prompt.
Download weights before starting the server, using the resumable downloader:

```powershell
$env:COQUI_TOS_AGREED = '1'
venv/Scripts/python.exe prepare_reference_model.py
```

The adapter uses a CUDA GPU when available, otherwise CPU inference. Install
Chinese and Japanese text-processing dependencies separately:

```powershell
venv/Scripts/python.exe -m pip install -r requirements-reference-languages.txt
```

Reference WAVs are
decoded directly, so this adapter does not need FFmpeg or TorchCodec. Long text is
split into bounded chunks, with brief pauses between generated chunks.

In Quick Dub choose **Reference voice (experimental)**, select a supported language,
upload a 6–30 second, 16-bit PCM WAV (under 5 MB), and confirm speaker permission.
Use a sample without music or overlapping speakers. The uploaded sample supplies
speaker characteristics and style; exact accent, emotional timing and video
synchronization are not guaranteed. This mode does not automatically extract a
speaker reference from YouTube. Pacing presets apply only to standard voices.

Reference WAVs are stored under `OUTPUT_DIR/references`; keep this directory private.
Generated output files are served only from the output directory itself.

## Validation

```powershell
venv/Scripts/python.exe -m unittest discover -s tests -v
venv/Scripts/python.exe tests/live_translation_check.py
venv/Scripts/python.exe tests/live_speech_check.py
```

The live checks use network access; the translation check uses configured provider
keys. Results and sample audio are saved under `outputs/smoke-test`.
`tests/live_reference_check.py` additionally requires installed XTTS dependencies,
accepted model terms and a synthetic test reference at `outputs/smoke-test/reference.wav`.

Frontend validation: `npm run build` and `npm run test:e2e` in `frontend`.

## Current verification

Real translation checks passed for all ten target languages (English uses the
same-language passthrough). Chinese and Japanese translation successfully used
the configured Groq fallback after Gemini reached its quota. Real standard TTS
produced non-empty MP3 files for all ten languages and both additional presets.
The frontend build and browser workflow checks passed.

Reference-mode validation, upload/generation routing, WAV serving, native reference
decoding and text splitting are covered by automated tests. Real XTTS inference
has not been verified: the 1.87 GB checkpoint download stalled across multiple
download attempts, and the Japanese dictionary download was repeatedly interrupted.
Reference mode stays disabled until the weights are prepared and the enable/license
settings are configured. The partial Hugging Face cache is retained for resuming.
