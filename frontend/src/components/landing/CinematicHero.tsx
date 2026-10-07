import { useState } from "react";
import { ArrowDown, AudioLines, Loader2, Play } from "lucide-react";
import { useVoicePreview } from "@/lib/use-voice-preview";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reveal, StudioLink } from "./LandingPrimitives";

const languages = [
  { code: "en", name: "English" },
  { code: "ur", name: "Urdu" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "ja", name: "Japanese" },
];

export function CinematicHero() {
  const [selected, setSelected] = useState(0);
  const language = languages[selected];
  const preview = useVoicePreview(language.code);

  return (
    <section className="cinematic-hero" aria-labelledby="hero-title">
      <div className="cinematic-image-wrap" aria-hidden="true">
        <img className="cinematic-image" src="/images/vocally-studio-cinematic.jpg" alt="" width="1672" height="940" fetchPriority="high" />
      </div>
      <div className="cinematic-shade" aria-hidden="true" />
      <div className="landing-container cinematic-content">
        <Reveal className="hero-copy">
          <Badge variant="outline"><span className="live-dot" /> YOUR STORY. NO BORDERS.</Badge>
          <h1 id="hero-title">One video.<br />A world<br />of <span>voices.</span></h1>
          <p>YouTube to translated audio.<br />Ten languages. All your possibilities.</p>
          <div className="hero-actions">
            <StudioLink>Start dubbing</StudioLink>
            <a className="landing-text-link" href="#demo">Hear the difference <ArrowDown strokeWidth={1.4} /></a>
          </div>
        </Reveal>
        <div className="cinematic-corner"><span className="recording-light" /> VOCALLY SESSIONS <span>01 / THE STORYTELLER</span></div>
        <div className="cinematic-caption" aria-live="polite" aria-atomic="true">
          <span><AudioLines strokeWidth={1.2} /> {language.name.toUpperCase()}</span>
          <p key={language.code} lang={language.code} dir={language.code === "ur" ? "rtl" : "ltr"}>{preview.catalogue?.preview_text?.[language.code] ?? (preview.loading ? "Loading voice sample…" : "Choose a language and hear its voice.")}</p>
        </div>
        <div className="cinematic-console">
          <div className="cinematic-console-title">HEAR YOUR STORY<br /><span>IN ANOTHER LANGUAGE.</span></div>
          <fieldset className="cinematic-languages">
            <legend className="sr-only">Preview a language</legend>
            {languages.map((item, index) => <label key={item.code} data-selected={selected === index}>
              <input type="radio" name="cinematic-language" value={item.code} checked={selected === index} onChange={() => setSelected(index)} />
              <span>{item.code.toUpperCase()}</span><span>{item.name}</span>
            </label>)}
          </fieldset>
          <div className="hero-sample-player" aria-busy={preview.busy}>
            {preview.audio ? <AudioPlayer src={preview.audio} label={language.name + " hero voice preview"} autoPlay /> :
              <Button type="button" disabled={preview.busy || (!preview.available && !preview.catalogueError)} onClick={() => preview.catalogueError ? preview.retry() : void preview.generate()}>
                {preview.busy ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Play data-icon="inline-start" />}
                {preview.catalogueError ? "Retry connection" : preview.busy ? "Creating sample…" : "Hear " + language.name}
              </Button>}
            {preview.error && <p role="alert">{preview.error}</p>}
            {!preview.loading && !preview.catalogueError && !preview.available && <p role="status">This voice is currently unavailable. Try another language.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
