import { useEffect, useId, useRef, useState } from "react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { previewVoice, type NarrationStyle } from "@/lib/api";

export interface SpeechSettings {
  narration_style: NarrationStyle;
  speech_mode: "standard" | "reference";
  speaker_consent: boolean;
  referenceFile: File | null;
}

interface Props {
  language: string;
  voice: string;
  disabled: boolean;
  referenceAvailable: boolean;
  referenceLanguages: string[];
  settings: SpeechSettings;
  onChange: (settings: SpeechSettings) => void;
}

export function SpeechControls({ language, voice, disabled, referenceAvailable, referenceLanguages, settings, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const optionsId = useId();
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const version = useRef(0);
  useEffect(() => {
    version.current += 1;
    setPreviewUrl(""); setError(""); setLoading(false);
    return () => { version.current += 1; };
  }, [language, voice, settings.narration_style, settings.speech_mode]);

  async function preview() {
    const request = ++version.current;
    setLoading(true); setError(""); setPreviewUrl("");
    try {
      const result = await previewVoice(language, voice, settings.narration_style);
      if (request === version.current) setPreviewUrl(result.audio_url);
    } catch (failure) {
      if (request === version.current) setError(failure instanceof Error ? failure.message : "Preview failed. Try again.");
    } finally {
      if (request === version.current) setLoading(false);
    }
  }

  return <>
    <Button type="button" variant="outline" className="speech-options-toggle" aria-expanded={expanded} aria-controls={optionsId} onClick={() => setExpanded(!expanded)}>
      {expanded ? "Hide voice settings" : "Voice settings"} · {settings.speech_mode === "reference" ? "Reference" : settings.narration_style}
    </Button>
    <div className="speech-options" id={optionsId} data-expanded={expanded}>
    <Field className="gap-2">
      <FieldLabel htmlFor="speech-mode">Speech mode</FieldLabel>
      <Select value={settings.speech_mode} disabled={disabled} onValueChange={(value) => onChange({ ...settings, speech_mode: value as SpeechSettings["speech_mode"] })}>
        <SelectTrigger id="speech-mode"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="standard">Standard voice</SelectItem>
          <SelectItem value="reference" disabled={!referenceAvailable}>Reference voice (experimental)</SelectItem>
        </SelectContent>
      </Select>
      {!referenceAvailable && <p className="text-xs text-muted-foreground">Reference voice mode is unavailable on this server.</p>}
    </Field>
    {settings.speech_mode === "standard" ? <>
      <Field className="gap-2">
        <FieldLabel htmlFor="narration-style">Narration style</FieldLabel>
        <Select value={settings.narration_style} disabled={disabled} onValueChange={(value) => onChange({ ...settings, narration_style: value as NarrationStyle })}>
          <SelectTrigger id="narration-style"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="motivational">Motivational</SelectItem>
            <SelectItem value="calm">Calm</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Adjusts pace and pitch; does not copy the original speaker’s emotion.</p>
      </Field>
    </> : <Field className="gap-2">
      <FieldLabel htmlFor="speaker-reference">Speaker reference WAV</FieldLabel>
      <Input id="speaker-reference" type="file" accept=".wav,audio/wav" disabled={disabled} onChange={(event) => onChange({ ...settings, referenceFile: event.target.files?.[0] || null })} />
      <p className="text-xs text-muted-foreground">Use 6–30 seconds of clean speech, in a 16-bit PCM WAV under 5 MB. Voice and style similarity vary; exact accent matching is not guaranteed. Urdu is unavailable in this mode.</p>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={settings.speaker_consent} disabled={disabled} onChange={(event) => onChange({ ...settings, speaker_consent: event.target.checked })} />I have the speaker’s permission to use this voice.</label>
      {!referenceLanguages.includes(language) && <p role="alert" className="text-sm text-destructive">Choose another target language for reference voice mode.</p>}
    </Field>}
    </div>
    {settings.speech_mode === "standard" && <>
      <Button type="button" variant="outline" disabled={disabled || loading || !voice} onClick={() => void preview()}>{loading ? "Creating preview..." : "Preview voice"}</Button>
      {previewUrl && <AudioPlayer key={previewUrl} autoPlay src={previewUrl} label="Voice preview" />}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </>}
  </>;
}
