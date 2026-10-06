import { useEffect, useState } from "react";
import { ArrowDown, AudioLines, Check, Globe2 } from "lucide-react";
import { LANGUAGES } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fetchVoices, previewVoice, type VoicesResponse } from "@/lib/api";


export function VoiceDemo({ expanded = false }: { expanded?: boolean }) {
  const [language, setLanguage] = useState("es");
  const [catalogue, setCatalogue] = useState<VoicesResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [audio, setAudio] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    fetchVoices().then(data => { if (active) setCatalogue(data); })
      .catch(() => { if (active) setError("Could not load voices. Please retry."); });
    return () => { active = false; };
  }, [retry]);
  async function generate() {
    const voice = catalogue?.voices[language]?.[0];
    if (!voice || busy) return;
    setBusy(true); setError(""); setAudio("");
    try {
      const result = await previewVoice(language, voice.id, "normal");
      setAudio(result.audio_url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Preview unavailable.");
    } finally { setBusy(false); }
  }
  const selected = LANGUAGES.find((item) => item.code === language)!;
  const choices = expanded ? LANGUAGES : LANGUAGES.filter((item) => ["es", "ur", "fr", "ja"].includes(item.code));
  return <div className={cn("voice-demo", expanded && "voice-demo-expanded")} data-animated={false}>
    <div className="voice-demo-orbit" aria-hidden="true" />
    <div className="voice-demo-topline"><span><span className="live-dot" /> ONE SOURCE. NEW POSSIBILITIES.</span><AudioLines strokeWidth={1.2} aria-hidden="true" /></div>
    <div className="voice-source"><span className="language-code">EN</span><div><span className="voice-label">ENGLISH SAMPLE</span><p>{catalogue?.preview_text?.en ?? "Loading sample…"}</p></div></div>
    <div className="voice-connection" aria-hidden="true"><span /><div><AudioLines strokeWidth={1.2} /> VOCALLY AI</div><span /><ArrowDown strokeWidth={1.2} /></div>
    <div className="voice-output-shell"><div className="voice-output"><div className="voice-output-label"><span><Globe2 strokeWidth={1.2} aria-hidden="true" />{selected.name} <span> / VOICE SAMPLE</span></span><Check strokeWidth={1.4} aria-hidden="true" /></div><div className="voice-translation" aria-live="polite" aria-atomic="true"><p key={language} lang={language} dir={["ur", "ar"].includes(language) ? "rtl" : "ltr"}>{catalogue?.preview_text?.[language] ?? "Sample unavailable."}</p></div>{audio && <audio className="w-full" controls src={audio} aria-label={selected.name + " voice preview"} />}<div className="voice-track-footer"><span>NEURAL VOICE</span><span>AUDIO PREVIEW</span></div></div></div>
    <fieldset className="language-options" disabled={busy}><legend className="sr-only">{expanded ? "Explore all languages" : "Preview a language"}</legend>{choices.map((item) => <label key={item.code} className={cn("language-option", language === item.code && "is-selected")}><input type="radio" name={expanded ? "all-demo-language" : "hero-demo-language"} value={item.code} checked={language === item.code} onChange={() => { setLanguage(item.code); setAudio(""); }} /><span>{item.code.toUpperCase()}</span>{item.name}</label>)}</fieldset>
    {error && <p role="alert">{error}</p>}
    <div className="voice-demo-note"><span>Generated on request. Press play when ready.</span>{!catalogue && error ? <button onClick={() => setRetry(n => n + 1)}>Retry connection</button> : <button disabled={busy || !catalogue?.voices[language]?.length} onClick={() => void generate()}>{busy ? "Generating…" : "Generate voice preview"}</button>}</div>
  </div>;
}
