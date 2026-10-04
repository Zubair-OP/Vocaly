/**
 * Shared formatting helpers used by every screen.
 * Keeps language labels, dates, and thumbnails consistent across the app.
 */

import type { VoiceOption } from "@/lib/api"

export interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "ur", name: "Urdu", flag: "🇵🇰" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
];

const LANG_NAMES: Record<string, string> = {
  en: "English",
  ur: "Urdu",
  hi: "Hindi",
  ar: "Arabic",
};

/** Voice catalogue per language — mirrors the backend `VOICE_MAP`. */
export const VOICES: Record<string, VoiceOption[]> = {
  en: [
    { id: "en-US-GuyNeural", name: "Guy (US Male)" },
    { id: "en-US-JennyNeural", name: "Jenny (US Female)" },
    { id: "en-GB-RyanNeural", name: "Ryan (UK Male)" },
  ],
  ur: [
    { id: "ur-PK-UzmaNeural", name: "Uzma (Female)" },
    { id: "ur-PK-AsadNeural", name: "Asad (Male)" },
  ],
  hi: [
    { id: "hi-IN-SwaraNeural", name: "Swara (Female)" },
    { id: "hi-IN-MadhurNeural", name: "Madhur (Male)" },
  ],
  ar: [
    { id: "ar-SA-ZariyahNeural", name: "Zariyah (Female)" },
    { id: "ar-SA-HamedNeural", name: "Hamed (Male)" },
  ],
};

/** Friendly voice label for a stored voice id. */
export function voiceName(id?: string | null): string {
  if (!id) return "Neural Voice"
  for (const list of Object.values(VOICES)) {
    const match = list.find((voice) => voice.id === id)
    if (match) return match.name
  }
  return id
}

/** Plain language name, e.g. `English`. */
export function langName(code: string): string {
  return LANG_NAMES[code] || code || "—";
}

/** Language name with flag, e.g. `🇺🇸 English`. */
export function langLabel(code: string): string {
  const lang = LANGUAGES.find((l) => l.code === code);
  return lang ? `${lang.flag} ${lang.name}` : langName(code);
}

export function languagePair(source: string, target: string): string {
  return `${langLabel(source)} → ${langLabel(target)}`;
}

/** YouTube thumbnail for a video id, or undefined when there is no video. */
export function thumbUrl(videoId?: string | null): string | undefined {
  return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : undefined;
}

/** `Oct 4, 10:24 AM` style timestamp. */
export function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** `2 hours ago` style relative timestamp. */
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString();
}
