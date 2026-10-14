import { useEffect, useId, useRef, useState } from "react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { previewVoice, type NarrationStyle } from "@/lib/api";

export interface SpeechSettings {
  narration_style: NarrationStyle;
}

interface Props {
  language: string;
  voice: string;
  disabled: boolean;
  settings: SpeechSettings;
  onChange: (settings: SpeechSettings) => void;
}

export function SpeechControls({ language, voice, disabled, settings, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const optionsId = useId();
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const version = useRef(0);

  useEffect(() => {
    version.current += 1;
    setPreviewUrl("");
    setError("");
    setLoading(false);
    return () => { version.current += 1; };
  }, [language, voice, settings.narration_style]);

  async function preview() {
    const request = ++version.current;
    setLoading(true);
    setError("");
    setPreviewUrl("");
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
      {expanded ? "Hide voice settings" : "Voice settings"} · {settings.narration_style}
    </Button>
    <div className="speech-options" id={optionsId} data-expanded={expanded}>
      <Field className="gap-2">
        <FieldLabel htmlFor="narration-style">Narration style</FieldLabel>
        <Select value={settings.narration_style} disabled={disabled} onValueChange={(value) => onChange({ narration_style: value as NarrationStyle })}>
          <SelectTrigger id="narration-style"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="motivational">Motivational</SelectItem>
            <SelectItem value="calm">Calm</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Adjusts pace and pitch; does not copy the original speaker’s emotion.</p>
      </Field>
    </div>
    <Button type="button" variant="outline" disabled={disabled || loading || !voice} onClick={() => void preview()}>{loading ? "Creating preview..." : "Preview voice"}</Button>
    {previewUrl && <AudioPlayer key={previewUrl} autoPlay src={previewUrl} label="Voice preview" />}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </>;
}
