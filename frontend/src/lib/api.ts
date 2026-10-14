/**
 * API client for Vocally backend.
 */

const API_BASE = '/api';

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface FetchTranscriptResponse {
  video_id: string;
  title: string;
  source_language: string;
  segments: TranscriptSegment[];
}

export interface GenerateResponse {
  status: string;
  translated_text: string;
  summary_text: string;
  audio_url: string;
  summary_audio_url: string;
  job_id: string;
  output: OutputItem;
}

export interface VoiceOption {
  id: string;
  name: string;
}

export interface VoicesResponse {
  voices: Record<string, VoiceOption[]>;
  preview_text?: Record<string, string>;
}

export type NarrationStyle = 'normal' | 'motivational' | 'calm';

export async function previewVoice(target_language: string, voice: string, narration_style: NarrationStyle): Promise<{ audio_url: string }> {
  return handleResponse(await fetch(`${API_BASE}/voice-preview`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_language, voice, narration_style }),
  }));
}

// Output persisted by the backend in MongoDB
export interface OutputItem {
  id: string;
  videoId: string;
  title: string;
  sourceLanguage: string;
  targetLanguage: string;
  voice?: string;
  narrationStyle?: NarrationStyle;
  originalTranscript: string;
  translatedText: string;
  summaryText?: string;
  audioUrl: string;
  summaryAudioUrl?: string;
  createdAt: string;
  status: 'completed' | 'error';
}

export class ApiError extends Error {
  status: number;
  code?: string;
  
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({ detail: 'An unexpected error occurred.' }));
    const detail = data.detail;
    throw new ApiError(
      typeof detail === 'string' ? detail : detail?.message || 'An unexpected error occurred.',
      response.status,
      typeof detail?.code === 'string' ? detail.code : undefined,
    );
  }
  return response.json();
}

const GENERATION_ERRORS: Record<string, string> = {
  translation_rate_limited: 'The translation service has reached its usage limit. Try again later or check the provider quota.',
  translation_not_configured: 'Translation is not configured. Add a working translation API key to the backend.',
  translation_failed: 'The transcript was fetched, but translation failed. Please try again.',
  audio_generation_failed: 'Translation finished, but the speech service could not generate audio. Try again or choose another voice.',
  output_storage_unavailable: 'Your audio was generated, but it could not be saved. Check the database connection and try again.',
  audio_storage_not_configured: 'Cloud audio storage is not configured. Add CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_SECRET to backend/.env, then restart the backend.',
  audio_storage_unavailable: 'The audio was generated, but Cloudinary could not store it. Check the Cloudinary configuration and connection, then try again.',
  speech_provider_unavailable: 'Microsoft Edge TTS is unavailable and no fallback provider is configured. Configure a Gemini API key and try again.',
  speech_quota_exceeded: 'Gemini TTS has reached its API quota. Check your Gemini API quota and try again.',
  speech_generation_failed: 'Both speech providers failed to create the audio. Check your Gemini API connection and quota, then try again.',
  summary_audio_generation_failed: 'The summary was created, but its audio could not be generated. Please try again.',
  summary_rate_limited: 'The Groq summary quota is exhausted. Check your Groq API quota and try again.',
  summary_failed: 'The video summary could not be generated. Please try again.',
  summary_provider_auth_failed: 'Groq rejected the API key. Check that GROQ_API_KEY is active and restart the backend.',
};

export function generationErrorMessage(error: unknown, phase: 'transcript' | 'generation'): string {
  if (error instanceof ApiError && [429, 413, 408, 507].includes(error.status)) return error.message;
  if (phase === 'transcript' && error instanceof ApiError && error.status < 500) return error.message;
  if (error instanceof ApiError && error.code && GENERATION_ERRORS[error.code]) {
    return GENERATION_ERRORS[error.code];
  }
  if (error instanceof TypeError || (error instanceof ApiError && error.status >= 502)) {
    return 'The generation service is unavailable. Check that the backend is running and try again.';
  }
  return phase === 'transcript'
    ? 'We could not fetch this transcript. Use a public video with captions that is up to 5 minutes long.'
    : 'We could not create the audio from this transcript. Please try again or choose another voice.';
}

export async function fetchTranscript(youtubeUrl: string, preferredLanguage = 'en'): Promise<FetchTranscriptResponse> {
  const response = await fetch(`${API_BASE}/fetch-transcript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ youtube_url: youtubeUrl, preferred_language: preferredLanguage }),
  });
  return handleResponse<FetchTranscriptResponse>(response);
}

export async function generateAudio(params: {
  video_id: string;
  source_language: string;
  target_language: string;
  voice: string;
  transcript: string;
  title?: string;
  narration_style?: NarrationStyle;
}): Promise<GenerateResponse> {
  const response = await fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return handleResponse<GenerateResponse>(response);
}

export async function fetchVoices(): Promise<VoicesResponse> {
  const response = await fetch(`${API_BASE}/voices`);
  return handleResponse<VoicesResponse>(response);
}

export async function checkHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE}/health`);
  return handleResponse<{ status: string }>(response);
}

// ── persisted outputs (MongoDB via backend API) ───────────────────────

export async function fetchOutputs(limit = 100): Promise<OutputItem[]> {
  const response = await fetch(`${API_BASE}/outputs?limit=${limit}`);
  const data = await handleResponse<{ outputs: OutputItem[] }>(response);
  return data.outputs;
}

export async function fetchOutput(id: string): Promise<OutputItem> {
  const response = await fetch(`${API_BASE}/outputs/${encodeURIComponent(id)}`);
  return handleResponse<OutputItem>(response);
}

export async function saveOutput(output: OutputItem): Promise<OutputItem> {
  const response = await fetch(`${API_BASE}/outputs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: output.id,
      video_id: output.videoId,
      title: output.title,
      source_language: output.sourceLanguage,
      target_language: output.targetLanguage,
      voice: output.voice ?? '',
      original_transcript: output.originalTranscript,
      translated_text: output.translatedText,
      summary_text: output.summaryText ?? '',
      summary_audio_url: output.summaryAudioUrl ?? '',
      audio_url: output.audioUrl,
      status: output.status,
      created_at: output.createdAt,
    }),
  });
  return handleResponse<OutputItem>(response);
}

export async function deleteOutput(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/outputs/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  await handleResponse<{ status: string }>(response);
}

export async function clearOutputs(): Promise<void> {
  const response = await fetch(`${API_BASE}/outputs`, { method: 'DELETE' });
  await handleResponse<{ status: string; deleted: number }>(response);
}
