# Hackathon safeguards

Added 2026-10-07. Run exactly one backend worker with these in-memory limits.

| Setting | Default | Behavior |
| --- | --- | --- |
| `API_REQUESTS_PER_MINUTE` | 120 | Shared rolling one-minute limit across API requests, including reads and writes. Health and CORS preflight are excluded. |
| `GENERATIONS_PER_HOUR` | 60 | Shared rolling one-hour limit on admitted generation and voice-preview attempts. Failed or invalid attempts count too. |
| `MAX_CONCURRENT_JOBS` | 2 | Reject excess simultaneous transcript, audio, preview, and reference-upload requests immediately. |
| `MEDIA_STORAGE_MB` | 1024 | Stop admitting audio generation and uploads when the existing media plus reserved headroom exceeds this budget. |
| `MEDIA_RESERVE_MB` | 64 | Reserve this much headroom per active expensive request when checking media storage and disk free space. |

Limits return structured errors; rate/quota/busy responses use HTTP 429 with
`Retry-After`. Storage admission failures use HTTP 507. JSON request bodies have
a 1 MiB limit, reference uploads have a 5 MiB limit, and body receipt has a
30-second deadline. Streamed bodies are checked even without Content-Length.
Generation errors preserve these messages in the frontend.

These are process-wide demo safeguards, not per-user billing quotas. Counters
reset on restart, and multiple workers would each have their own allowance.
All visitors share the quota; a visitor can consume it and deny capacity to others.
Do not treat these controls as authentication. For multiple instances or durable
spend limits, use a shared store and authenticated user quotas.

Storage is an **admission budget, not a hard filesystem quota**: existing files
are counted before new work, with headroom for active work. An unusually large
in-progress output or an external writer can exceed the budget. Configure a
filesystem/container disk quota if a strict byte ceiling is required. Root
output files and files directly inside `references/` count; model-cache and
other nested directories are excluded. Actual free disk space is also checked.
No existing file is automatically deleted by these controls.

## Output deletion

Each output now has a delete action on desktop and mobile. It deletes the entire
MongoDB output document (original transcript, translation, voice settings, title,
and other metadata) and the generated MP3/WAV. The player and transcript disappear
after success. A missing output is also removed from the current browser list.

File cleanup happens first. A file error retains the database record and returns
a retryable error. If the subsequent database deletion fails, retrying safely
tolerates an already-missing audio file. These operations are not a cross-system
transaction. Audio shared by another saved output is retained until its last
record is deleted. Output mutations are serialized within the single-worker demo.
The bulk-clear endpoint uses the same cleanup rather than bypassing file deletion.

Shared voice catalogues and model weights are not output data and are retained.
Uploaded speaker-reference samples are separate reusable inputs; existing output
records do not store their reference IDs, so this action cannot safely infer and
delete those uploads. Automatic reference/preview expiry remains unimplemented.

Verified with temporary audio files and mocked database operations: successful
deletion, missing output/file, unsafe paths, shared audio, cleanup failure,
database failure followed by retry, and bulk cleanup. Browser checks cover mobile
and desktop deletion and retry after failure. No live user output was deleted
during testing.

## Access and retention decisions awaiting approval

The API still does not authenticate callers or isolate owners. For a controlled
hackathon demonstration, protect the entire frontend and API behind one
password-protected gateway. Keep the backend reachable only through that gateway.
A shared password protects the demo from outsiders, but permitted visitors still
share a workspace. Never embed the password or an admin key in frontend code.

For a public multi-user product, introduce login, attach server-derived owner IDs
to outputs and reference samples, and enforce ownership on database operations,
audio access, and reference use. Make any delete-all operation owner-scoped.

Suggested lifecycle, subject to approval:

- Expire unused preview audio and speaker samples after 24 hours. Avoid deleting
  samples or audio in use by running jobs.
- Retain saved output audio until its owner deletes it or an agreed retention
  period ends. Reconcile orphaned files after failed database saves.

Authentication and automatic retention changes are not implemented.

## Real data in the frontend

Studio generation, saved-output listing, and output detail already use backend
API responses. They do not fall back to dummy output records. The landing-page
language sample text now also comes from `/api/voices`, and its voice demo calls
`/api/voice-preview` and plays the returned audio URL. It displays errors if the
backend is unavailable. Samples are predefined preview phrases, not fabricated
user outputs or live translations of a submitted video.

The landing page still contains explicitly illustrative product artwork and a
decorative hero waveform; these are marketing visuals, not generation results.
