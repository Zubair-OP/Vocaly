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
preserves spoken wording and punctuation. Caption fetching reports the actual
caption language; a video still needs available captions.

## Validation

From `backend/`:

```powershell
venv/Scripts/python.exe -m unittest discover -s tests -p "test_*.py"
```

Frontend validation:

```powershell
npm run build
npm run test:e2e
```
