# Vocally — Hackathon MVP

Turn YouTube videos into translated audio. Paste a link, choose a language, download the dubbed MP3.

Supports 10 target languages, voice previews, and Normal / Motivational / Calm
narration presets. See [speech setup and validation](backend/SPEECH.md) for details.

## Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- A **Gemini API key** (free tier) — [Get one here](https://aistudio.google.com/apikey)

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
# Edit .env and add your GEMINI_API_KEY

# Run
python app.py
```

The backend runs on **http://localhost:8000**.

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

The frontend runs on **http://localhost:5173** and proxies API calls to the backend.

The public landing page is at `/`. **Open Studio** takes you to the existing
creation workspace at `/new`; generated audio remains at `/outputs`.
The landing page loads voice sample text from the backend and generates playable
voice previews on request. Actual video dubbing happens in the studio.

For the single-worker hackathon limits and remaining access-control decisions,
see [demo safeguards](backend/DEMO_SAFEGUARDS.md).

## Tech Stack

| Layer        | Tool                    |
|-------------|-------------------------|
| Frontend    | React + TypeScript + Vite |
| Styling     | Tailwind CSS + shadcn/ui |
| Backend     | Python + FastAPI         |
| Transcript  | youtube-transcript-api   |
| Translation | Gemini API (free tier)   |
| TTS         | edge-tts                 |

## API Endpoints

| Method | Path                    | Purpose               |
|--------|------------------------|-----------------------|
| GET    | `/api/health`          | Health check          |
| GET    | `/api/voices`          | Available TTS voices  |
| POST   | `/api/fetch-transcript`| Fetch YouTube transcript |
| POST   | `/api/generate`        | Translate + generate audio |
| GET    | `/api/audio/{filename}`| Serve generated MP3   |

## Demo Videos (Tested)

Use public videos with accessible captions, up to 5 minutes long:

- Any YouTube video with available captions
- Educational content with clear speech works best

## Project Structure

```
vocally/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/          # shadcn/ui components
│   │   │   ├── DubForm.tsx
│   │   │   ├── InlineStatus.tsx
│   │   │   └── AudioResultCard.tsx
│   │   ├── pages/
│   │   │   ├── QuickDub.tsx
│   │   │   └── Outputs.tsx
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   └── utils.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
│
└── backend/
    ├── app.py
    ├── services/
    │   ├── transcript.py
    │   ├── translate.py
    │   └── tts.py
    ├── outputs/
    ├── requirements.txt
    └── .env
```
