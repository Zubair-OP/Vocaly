# Backend architecture and security review

Reviewed: 2026-10-06, using the better-backend skill.

Update 2026-10-07: single-worker request/attempt/concurrency limits and media
storage admission checks have since been added; see [demo safeguards](DEMO_SAFEGUARDS.md).
The original resource-consumption finding below is partially mitigated. Authentication,
ownership, durable quotas, and file retention remain open.

Subsequent update: user-requested per-output deletion now removes both the complete
record and its generated audio, with shared-file protection and retryable failures.
The original lifecycle finding is partially resolved; automatic expiry and cleanup
of previews remains open. See demo safeguards for details.

**Verdict: suitable as a local, trusted-user MVP; not ready for an untrusted public or multi-user deployment.** The fixes in this review improve correctness and input handling, but do not add authentication, ownership, or resource quotas.

## Open findings, in priority order

| Severity | Finding and evidence | Required remediation |
| --- | --- | --- |
| Critical for public deployment | No authentication or authorization. `app.py` exposes output list/read/create/delete/clear routes without identity dependencies. `db.py` queries by output ID alone and `clear_outputs()` uses `delete_many({})`. Any reachable caller can read transcripts, replace a known output ID, or erase all output metadata. Audio and reference IDs have no owner checks either. | Introduce authenticated identity and server-assigned ownership. Scope every read, update, delete, audio download, and reference use to that owner. Remove public bulk deletion or make it explicitly administrative. Test cross-user denial. A CORS policy is not an authorization boundary. |
| High | Unbounded aggregate resource consumption. Generation, preview, transcript retrieval, and reference upload are anonymous. There are no rate, spend, disk, or concurrent-job quotas. The reference inference lock serializes work but permits an unbounded waiting population. JSON requests are parsed before field validation; field limits do not cap the raw request body. | Enforce streamed body limits at ingress, authenticated per-user rate and spend limits, bounded job admission, storage quotas, and provider output limits. Use shared enforcement when running multiple workers. |
| High | No media lifecycle. Previews are stored indefinitely. Deleting output metadata does not delete audio; a previously known URL remains usable. Persistence failure after synthesis leaves orphaned audio, and retries repeat billable work. See `app.py` generation/delete routes. | Use an owned artifact catalogue, private media access, preview expiry, quota accounting, and a reconciliation/cleanup job. Introduce idempotency and explicit job states before retrying generation. |
| Medium | Partial availability is reported as healthy. Startup catches database/index setup failures and continues; `/api/health` always returns OK. The client may pay for translation and synthesis before the final database write fails. | Keep liveness separate from readiness, require database/index initialization for readiness, and check storage before admitting jobs. Ensure startup cleanup also runs if initialization fails. |
| Medium | Expensive generation runs inside HTTP requests. Transcript fetching runs in a thread without an application deadline. | Move durable generation to bounded workers with deadlines, cancellation semantics, retries, and idempotency. Keep request handlers focused on validation, admission, and job status. |
| Medium | Dependencies are not reproducibly locked. Core requirements have no version constraints. `google-generativeai` emits an end-of-support warning in the installed environment. No vulnerability database scan was performed in this review. | Migrate to the maintained Google Gen AI SDK with provider-contract tests. Establish a tested lockfile, automated advisory scanning, and an update process for core and optional speech dependencies. |

## Architecture assessment

The current FastAPI application separates transcript, translation, standard TTS, reference TTS, and MongoDB persistence. That is a reasonable starting point for this MVP; a framework rewrite is unnecessary. Database calls use typed scalar values rather than accepting client-supplied Mongo operators. Generated audio has a resolved-directory boundary, and uploaded reference audio has byte-size, duration, format, and completeness checks.

The main architectural weakness is that `app.py` combines HTTP schemas, generation orchestration, persistence decisions, and output routes. As authenticated jobs are introduced, extract the generation workflow into an application service and keep HTTP routes thin. Centralize validated settings, inject provider/storage dependencies, and add explicit result types. Retain the existing service boundaries. A queue and ownership model are more valuable than splitting every small function into a separate file.

MongoDB output listing is bounded but returns full transcript bodies and has no cursor pagination. After ownership exists, use a compound owner/date/ID index and a summary projection for list views; fetch transcript bodies only on detail requests. Local disk also needs a deliberate shared-storage strategy before multiple API instances are deployed.

## Fixes applied

- Fixed newest-first listing: MongoDB now sorts descending before applying the limit. Previously it selected the oldest records and only reversed that subset.
- Resolved the database name lazily so `.env` configuration is honored after module import; corrected the asynchronous database type annotation.
- Bounded request fields and limited manually saved audio URLs to local MP3/WAV API paths. These checks do not establish artifact ownership or existence.
- Replaced substring YouTube matching with exact hostname, scheme, path, and video-ID parsing. Spoofed domains, embedded URLs, credentials, and overlong IDs are rejected. The previous issue was URL validation, not demonstrated SSRF: provider calls already used a fixed YouTube endpoint.
- Restricted CORS to the configured frontend, required methods, and content header. Disabled unnecessary credential support.
- Changed `python app.py` to bind to loopback with reload disabled. This reduces accidental LAN exposure; alternate Uvicorn commands and proxies can still expose the unauthenticated app.
- Used full UUIDs for standard speech artifact names, excluded directories from audio serving, and removed raw provider/database connection details from affected error messages.
- Enforced translation chunk bounds for long unpunctuated text and handled model-initialization failures through the normal sanitized fallback/error path.

## Verification

From `backend/`:

```powershell
..\.venv\Scripts\python.exe -m unittest discover -s tests -p "test_*.py"
```

Result: **29 tests discovered, 28 passed, 1 skipped**. The skip is the optional native reference-audio decoder test because its optional dependencies are not installed. Eight new tests cover URL parsing, chunk bounds, provider initialization errors, output ordering, database configuration, metadata validation, audio path handling, and partial TTS cleanup.

`python -m pip check` passed in the workspace virtual environment. `git diff --check` passed. These establish local compatibility and regression coverage, not the absence of vulnerable dependencies.

No live database, paid translation, live TTS, deployment configuration, network perimeter, backup/restore, or load test was exercised. Existing staged frontend and README changes were left intact. No secrets were printed or modified.

## Reference documentation

- [FastAPI CORS](https://fastapi.tiangolo.com/tutorial/cors/): browser origin configuration.
- [PyMongo asynchronous cursor](https://pymongo.readthedocs.io/en/4.15.1/api/pymongo/asynchronous/cursor.html): sort and limit semantics.
- [Google Gemini API libraries](https://ai.google.dev/gemini-api/docs/libraries): maintained SDK and legacy library support status.
