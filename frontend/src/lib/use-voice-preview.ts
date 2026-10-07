import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchVoices, previewVoice } from "./api";

export function useVoicePreview(language: string) {
  const client = useQueryClient();
  const catalogue = useQuery({ queryKey: ["voice-catalogue"], queryFn: fetchVoices, staleTime: 60_000 });
  const [audio, setAudio] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const version = useRef(0);
  useEffect(() => {
    version.current++;
    setAudio(""); setError(""); setBusy(false);
    return () => { version.current++; };
  }, [language]);
  const voice = catalogue.data?.voices[language]?.[0];
  async function generate() {
    if (!voice || busy) return;
    const request = ++version.current;
    setBusy(true); setError("");
    try {
      const result = await client.fetchQuery({
        queryKey: ["voice-preview", language, voice.id],
        queryFn: () => previewVoice(language, voice.id, "normal"),
        staleTime: 5 * 60_000,
      });
      if (version.current === request) setAudio(result.audio_url);
    } catch (cause) {
      if (version.current === request) setError(cause instanceof Error ? cause.message : "Preview unavailable. Please retry.");
    } finally { if (version.current === request) setBusy(false); }
  }
  return { catalogue: catalogue.data, loading: catalogue.isPending, catalogueError: catalogue.isError,
    retry: () => void catalogue.refetch(), available: Boolean(voice), audio, busy,
    error: error || (catalogue.isError ? "Could not load voices. Please retry." : ""), generate };
}
