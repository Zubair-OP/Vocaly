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
  audio_url: string;
  job_id: string;
  output: OutputItem;
}

export interface VoiceOption {
  id: string;
  name: string;
}

export interface VoicesResponse {
  voices: Record<string, VoiceOption[]>;
}

// Output persisted by the backend in MongoDB
export interface OutputItem {
  id: string;
  videoId: string;
  title: string;
  sourceLanguage: string;
  targetLanguage: string;
  voice?: string;
  originalTranscript: string;
  translatedText: string;
  audioUrl: string;
  createdAt: string;
  status: 'completed' | 'error';
}

class ApiError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({ detail: 'An unexpected error occurred.' }));
    throw new ApiError(data.detail || 'An unexpected error occurred.', response.status);
  }
  return response.json();
}

export async function fetchTranscript(youtubeUrl: string): Promise<FetchTranscriptResponse> {
  const response = await fetch(`${API_BASE}/fetch-transcript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ youtube_url: youtubeUrl }),
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
