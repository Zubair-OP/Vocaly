# Vocally — Hackathon MVP Product Requirements Document

**Product:** Vocally  
**Version:** Hackathon MVP  
**Core Flow:** YouTube Transcript → Translation → Audio  
**Target Build Time:** 3–5 hours  
**Primary Screens:** 2  
**Design System:** shadcn/ui  
**Budget:** Zero paid dependencies for the demo

---

## 1. Product Overview

Vocally is a small web tool for a hackathon.

A user pastes a YouTube video URL, the app fetches the available transcript, translates that transcript from a source language to a selected target language, converts the translated text into speech, and lets the user play and download the generated audio.

### Core Demo

```text
Paste a short YouTube URL
        ↓
Fetch transcript
        ↓
Select source and target language
        ↓
Translate transcript
        ↓
Generate speech
        ↓
Play audio
        ↓
Download MP3
```

---

## 2. Product Goal

The MVP should:

- Deliver a complete end-to-end demo in a 3–5 hour hackathon window.
- Be simple enough for a first-time user to understand instantly.
- Use free, open-source, or free-tier tools only.
- Prioritize a reliable working flow over advanced features.
- Avoid building a full SaaS product during the hackathon.

---

## 3. MVP Scope

### Included

- YouTube URL input
- Fetch YouTube transcript
- Source language selection
- Target language selection
- Transcript translation
- Text-to-speech generation
- Audio playback
- MP3 download
- Current-session output history
- Simple loading and error states

### Excluded

- Authentication
- Dashboard analytics
- Payments or subscriptions
- Database
- Voice cloning
- Lip-sync
- Video rendering
- Multi-speaker diarization
- Team collaboration
- Notifications
- Settings page
- Cloud storage
- Usage analytics
- Fake project statistics
- Fake storage limits

---

## 4. Supported Languages for Demo

Keep the first demo intentionally small.

Recommended:

- English
- Urdu
- Hindi
- Arabic

You can expand later after the core flow works.

---

## 5. User Experience and Screens

The hackathon MVP should contain only **two primary screens**.

Processing should appear as an inline state on Screen 1 instead of becoming a separate page.

---

# Screen 1 — Quick Dub

## Purpose

Allow the user to paste a YouTube link and generate translated audio with the minimum number of actions.

## UI Elements

- Vocally logo/name
- Outputs navigation link
- Main heading:
  - **Turn a YouTube video into translated audio**
- YouTube URL input
- Paste button
- Source language select
- Target language select
- Voice select
- Generate Audio button
- Short transcript preview
- Inline processing status
- Error message area

## Processing States

```text
Fetching transcript
        ↓
Translating
        ↓
Generating audio
```

Do not create a separate processing screen.

## Recommended Layout

```text
------------------------------------------------
Vocally                              Outputs
------------------------------------------------

Turn a YouTube video into translated audio

[ Paste YouTube URL                       ]

Source Language         Target Language
[ English ▼ ]           [ Urdu ▼ ]

Voice
[ Urdu Voice ▼ ]

[ Generate Audio ]

Transcript Preview
------------------------------------------
Hello everyone...
Today we are going to...
------------------------------------------

Status:
Fetching transcript...
------------------------------------------------
```

---

# Screen 2 — Outputs

## Purpose

Allow the user to play and download generated audio.

## UI Elements

Each generated output should contain:

- Video title
- Source language
- Target language
- Status
- Audio player
- Download MP3 button
- Optional original transcript preview
- Optional translated transcript preview
- Create Another Dub button

## Recommended Layout

```text
------------------------------------------------
Vocally                         New Dub
------------------------------------------------

Outputs

Build Better Habits
English → Urdu
Status: Ready

[ ▶ Audio Player --------------------- ]

[ Download MP3 ]

Original
Hello everyone...

Translated
سب کو خوش آمدید...

------------------------------------------------
```

---

## 6. Visual Design System

The UI should feel like a clean ChatGPT-style utility, not a SaaS dashboard.

### Component System

Use **shadcn/ui** as the primary component system.

Recommended components:

- Button
- Input
- Select
- Card
- Alert
- Skeleton
- Spinner
- Separator
- Dialog only if necessary

### Layout

- Centered layout
- Max width around `900px–1050px`
- Large whitespace
- No permanent sidebar
- No dashboard shell
- No excessive cards

### Colors

Use a restrained neutral palette:

- Background: white / slate
- Text: dark slate
- Border: soft gray
- Primary accent: cyan or blue
- Success: green only when required
- Error: red only when required

### Typography

Recommended:

- Inter
- Geist

Suggested sizes:

- Page title: 28–36px
- Section heading: 18–24px
- Body: 14–16px
- Helper text: 12–14px

### Borders

- 1px neutral border
- Border radius: 10–12px

### Shadows

- Very light shadows
- Prefer borders over heavy shadows

### Motion

Only functional motion:

- Button state transition
- Fade-in results
- Loading state
- Collapse/expand transcript

Do not add decorative animation.

---

## 7. Strict Visual Restrictions

Do **not** add:

- Gradients
- Glassmorphism
- Sparkles
- AI-style blobs
- Decorative wave backgrounds
- Fake charts
- Storage meters
- Upgrade cards
- Subscription badges
- Fake analytics
- Sidebars
- Dashboard statistics
- Fake notifications
- Non-functional navigation
- Excessive icons

Every visible element must have a real MVP purpose.

---

## 8. Functional Requirements

### FR-1: YouTube URL Validation

The app should support common YouTube URL formats:

```text
https://www.youtube.com/watch?v=VIDEO_ID
https://youtu.be/VIDEO_ID
https://www.youtube.com/shorts/VIDEO_ID
```

Requirements:

- Validate before API call
- Extract video ID
- Show clean error for invalid link

---

### FR-2: Transcript Fetching

The backend should:

- Fetch the available transcript
- Preserve timestamps if available
- Prefer manually created captions
- Fall back to auto-generated captions
- Return clear errors if transcript is unavailable

Do not download the video in the primary MVP flow.

Recommended library:

```text
youtube-transcript-api
```

---

### FR-3: Translation

The app should:

- Translate transcript into selected target language
- Preserve meaning
- Use natural spoken wording
- Preserve technical terms
- Preserve names
- Preserve URLs
- Avoid unnecessary literal translation

For longer transcript text:

- Split into chunks
- Translate sequentially
- Join into one clean final script

Recommended translation provider:

```text
Gemini API free tier
```

Optional fallback:

```text
Groq free-plan LLM
```

---

### FR-4: Text-to-Speech

The app should:

- Convert translated text to speech
- Generate MP3 output
- Use a target-language supported voice
- Avoid claiming that the original speaker has been cloned
- Offer only 1–3 voices per language

Recommended tool:

```text
edge-tts
```

---

### FR-5: Output

The app should:

- Play generated MP3
- Let user download MP3
- Use a meaningful file name

Example:

```text
vocally_VIDEO_ID_ur.mp3
```

For the MVP:

- Store metadata in browser `localStorage`
- Do not add a database

---

## 9. Recommended Technical Stack

### Frontend

```text
React
TypeScript
Vite
Tailwind CSS
shadcn/ui
TanStack Query
```

### Backend

```text
Python
FastAPI
```

### Transcript

```text
youtube-transcript-api
```

### Translation

Primary:

```text
Gemini API free tier
```

Optional fallback:

```text
Groq
```

### Text-to-Speech

```text
edge-tts
```

### Storage

```text
Temporary local output directory
Browser localStorage
```

### Database

```text
None for MVP
```

---

## 10. Why This Stack

### React + Vite

- Fast setup
- Small bundle
- Easy shadcn integration
- Good hackathon speed

### FastAPI

- Very fast backend setup
- Excellent Python AI ecosystem
- Easy REST API
- Good async support

### youtube-transcript-api

- No YouTube API key required
- Simple transcript extraction
- Good for a hackathon prototype

### Gemini

- Strong multilingual translation
- Free-tier availability
- Easy API integration

### edge-tts

- No API key required
- Multilingual neural voices
- Easy Python integration
- Good zero-budget choice for demo

---

## 11. System Architecture

```text
React + TypeScript + shadcn/ui
              ↓
          FastAPI
              ↓
    youtube-transcript-api
              ↓
      Gemini / Groq
              ↓
          edge-tts
              ↓
             MP3
              ↓
 Browser audio player + download
```

---

## 12. API Contract

### POST `/api/fetch-transcript`

Purpose:

- Validate YouTube URL
- Fetch transcript
- Return transcript data

#### Request

```json
{
  "youtube_url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

#### Response

```json
{
  "video_id": "VIDEO_ID",
  "title": "Video title",
  "source_language": "en",
  "segments": [
    {
      "text": "Hello everyone",
      "start": 0.0,
      "duration": 2.4
    }
  ]
}
```

---

### POST `/api/generate`

Purpose:

- Translate transcript
- Generate audio

#### Request

```json
{
  "video_id": "VIDEO_ID",
  "source_language": "en",
  "target_language": "ur",
  "voice": "ur-PK-UzmaNeural",
  "transcript": "..."
}
```

#### Response

```json
{
  "status": "completed",
  "translated_text": "...",
  "audio_url": "/api/audio/job_123.mp3"
}
```

---

### GET `/api/audio/{id}`

Purpose:

Serve generated MP3.

---

### GET `/api/health`

Purpose:

Simple backend health check.

---

## 13. Backend Logic

1. Receive YouTube URL
2. Validate URL
3. Extract video ID
4. Fetch transcript
5. Normalize transcript text
6. Detect or confirm source language
7. Split transcript into chunks
8. Translate chunks
9. Join translated chunks
10. Map target language to supported TTS voice
11. Generate MP3
12. Store MP3 temporarily
13. Return audio URL
14. Save output metadata in frontend `localStorage`

---

## 14. Suggested Language-to-Voice Mapping

Example:

```python
VOICE_MAP = {
    "en": "en-US-GuyNeural",
    "ur": "ur-PK-UzmaNeural",
    "hi": "hi-IN-SwaraNeural",
    "ar": "ar-SA-ZariyahNeural"
}
```

Use only voices verified to work during testing.

---

## 15. Error Handling

### Invalid URL

```text
Enter a valid YouTube video link.
```

### Transcript unavailable

```text
This video does not expose a transcript. Try another video.
```

### Transcript request blocked

```text
Transcript service is temporarily unavailable. Try another demo video.
```

### Translation limit

```text
Translation limit reached. Please wait and retry.
```

### Audio generation failure

```text
Audio generation failed. Retry with another voice.
```

### Video too long

```text
For the hackathon demo, use a short video under 3 minutes.
```

---

## 16. Hackathon Constraints

For the demo:

- Use videos between **30 seconds and 3 minutes**
- Avoid long transcripts
- Avoid large files
- Avoid voice cloning
- Avoid video rendering
- Avoid background job queues
- Avoid database setup
- Avoid authentication
- Avoid cloud storage

Prepare:

- 2–3 tested YouTube demo URLs
- API keys before the event
- `.env` file
- Working target-language voices

---

## 17. Environment Variables

Example:

```env
GEMINI_API_KEY=your_key_here
GROQ_API_KEY=optional_fallback_key
FRONTEND_ORIGIN=http://localhost:5173
OUTPUT_DIR=./outputs
```

---

## 18. Suggested Project Structure

```text
vocally/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── DubForm.tsx
│   │   │   ├── InlineStatus.tsx
│   │   │   └── AudioResultCard.tsx
│   │   │
│   │   ├── pages/
│   │   │   ├── QuickDub.tsx
│   │   │   └── Outputs.tsx
│   │   │
│   │   ├── lib/
│   │   │   └── api.ts
│   │   │
│   │   └── App.tsx
│   │
│   └── package.json
│
└── backend/
    ├── app.py
    │
    ├── services/
    │   ├── transcript.py
    │   ├── translate.py
    │   └── tts.py
    │
    ├── outputs/
    ├── requirements.txt
    └── .env
```

---

## 19. 4-Hour Build Plan

### 0:00–0:30

Setup:

- React
- TypeScript
- Vite
- Tailwind
- shadcn/ui
- FastAPI

Done when:

```text
Frontend and backend both run.
```

### 0:30–1:15

Build:

```text
YouTube URL → transcript
```

Done when:

```text
Known demo URL returns transcript.
```

### 1:15–2:00

Build translation:

```text
Transcript → Gemini → Urdu
```

Done when:

```text
Translated Urdu text appears.
```

### 2:00–2:40

Build TTS:

```text
Translated text → edge-tts → MP3
```

Done when:

```text
MP3 plays locally.
```

### 2:40–3:20

Connect Screen 1:

```text
URL → transcript → translate → speech
```

Done when:

```text
One button can run the full flow.
```

### 3:20–3:45

Build Outputs screen:

- Audio player
- Download button
- localStorage history

### 3:45–4:00

Final:

- Test
- Fix errors
- Prepare demo URL
- Rehearse pitch

---

## 20. Acceptance Criteria

The MVP is complete when:

- [ ] User can paste a YouTube URL
- [ ] Transcript is fetched
- [ ] User can select source language
- [ ] User can select target language
- [ ] Transcript is translated
- [ ] Audio is generated
- [ ] Audio plays in browser
- [ ] MP3 can be downloaded
- [ ] Output appears on Outputs screen
- [ ] Core UI uses shadcn/ui
- [ ] No paid dependency is required
- [ ] No fake SaaS components exist
- [ ] Only necessary controls are visible

---

## 21. Stretch Goals

Only work on these after the MVP is fully functional.

### Optional

- Audio file upload
- Editable transcript
- SRT download
- Additional languages
- Additional voices
- Multiple output languages

### Future Full Product

- Authentication
- Database
- Project history
- Cloud storage
- Voice cloning
- Video dubbing
- Audio/video synchronization
- Team collaboration
- Billing
- API access

---

## 22. Major Risk Decisions

### YouTube Transcript

`youtube-transcript-api` uses YouTube's unofficial transcript interface.

This is acceptable for a hackathon prototype but should not be treated as guaranteed production infrastructure.

Prepare multiple working videos before the event.

### Translation

Free-tier LLM limits may apply.

Keep videos short.

### TTS

`edge-tts` is excellent for a zero-budget prototype, but it still depends on an online speech service.

Always test the target voices before the hackathon.

### Voice Cloning

Do not include voice cloning in the timed MVP.

The core value proposition can be demonstrated without it.

---

# Appendix A — Copy-Paste Build Prompt

```text
Build a hackathon MVP called “Vocally”.

GOAL
Create a minimal web tool that converts a YouTube video transcript into translated speech.

The complete user flow is:

YouTube URL
→ fetch transcript
→ choose source language
→ choose target language
→ translate
→ generate TTS audio
→ play/download MP3

STRICT SCOPE
Build only 2 primary screens:

1. Quick Dub
2. Outputs

Do NOT create:
- dashboard
- settings page
- billing
- authentication
- analytics
- fake statistics
- storage cards
- voice management
- notifications
- subscription UI

Do NOT add:
- gradients
- glassmorphism
- sparkles
- AI decorative visuals
- excessive animations
- non-functional controls

Do NOT implement voice cloning or dubbed-video rendering in the hackathon MVP.

FRONTEND
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- TanStack Query

Use shadcn/ui as the primary component system.

The design should feel similar to a clean ChatGPT-style utility:
- neutral background
- clear typography
- thin borders
- restrained cyan/blue accent
- generous whitespace
- no sidebar

Use:
- Button
- Input
- Select
- Card
- Alert
- Skeleton
- Spinner

SCREEN 1: QUICK DUB
- Header: Vocally + Outputs link
- Heading: “Turn a YouTube video into translated audio.”
- YouTube URL input
- Source language select
- Target language select
- Voice select
- Generate Audio button
- Short transcript preview after transcript fetch
- Inline processing states:
  Fetching transcript
  Translating
  Generating audio
- Do not create a separate processing screen
- On completion navigate to Outputs

SCREEN 2: OUTPUTS
- Show generated outputs from the current browser session
- Each output should include:
  video title
  source → target language
  status
  HTML audio player
  Download MP3 button
- Optional original and translated transcript preview
- Create Another Dub button
- Persist metadata in localStorage only

BACKEND
Use Python FastAPI.

Use:
- youtube-transcript-api for YouTube transcripts
- Gemini free-tier model for translation
- Groq as optional fallback
- edge-tts for multilingual speech synthesis

Save generated MP3 files in a temporary local outputs directory.

Do not add a database.

API
POST /api/fetch-transcript
POST /api/generate
GET /api/audio/{id}
GET /api/health

IMPLEMENTATION RULES
- Validate YouTube URLs
- Keep demo videos under 3 minutes
- Chunk long transcript text before LLM translation
- Return clean errors for missing transcript, rate limits, and TTS failures
- No placeholder controls
- Every visible button must work
- Keep backend modular:
  transcript.py
  translate.py
  tts.py
- Prioritize reliable end-to-end functionality over extra features
```
