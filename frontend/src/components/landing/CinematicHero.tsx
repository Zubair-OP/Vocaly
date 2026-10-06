import { useState } from "react";
import { ArrowDown, AudioLines, Pause, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Reveal, StudioLink, Waveform } from "./LandingPrimitives";

const languages = [
  { code: "en", name: "English", line: "A good story deserves to be heard." },
  { code: "ur", name: "Urdu", line: "ایک اچھی کہانی سنی جانے کی مستحق ہے۔" },
  { code: "es", name: "Spanish", line: "Una buena historia merece ser escuchada." },
  { code: "fr", name: "French", line: "Une belle histoire mérite d’être entendue." },
  { code: "ja", name: "Japanese", line: "良い物語は、聞かれる価値がある。" },
];

export function CinematicHero() {
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const language = languages[selected];

  return (
    <section className="cinematic-hero" aria-labelledby="hero-title" data-paused={paused}>
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
            <a className="landing-text-link" href="#how-it-works">Watch the flow <ArrowDown strokeWidth={1.4} /></a>
          </div>
        </Reveal>
        <div className="cinematic-corner"><span className="recording-light" /> VOCALLY SESSIONS <span>01 / THE STORYTELLER</span></div>
        <div className="cinematic-caption" aria-live="polite" aria-atomic="true">
          <span><AudioLines strokeWidth={1.2} /> {language.name.toUpperCase()}</span>
          <p key={language.code} lang={language.code} dir={language.code === "ur" ? "rtl" : "ltr"}>{language.line}</p>
        </div>
        <div className="cinematic-console">
          <div className="cinematic-console-title"><span className="live-dot" /> CHANGE THE LANGUAGE.<br /><span>KEEP THE STORY.</span></div>
          <fieldset className="cinematic-languages">
            <legend className="sr-only">Preview a language</legend>
            {languages.map((item, index) => <label key={item.code} data-selected={selected === index}>
              <input type="radio" name="cinematic-language" value={item.code} checked={selected === index} onChange={() => setSelected(index)} />
              <span>{item.code.toUpperCase()}</span><span>{item.name}</span>
            </label>)}
          </fieldset>
          <Waveform variant={selected} />
          <button className="cinematic-pause" onClick={() => setPaused(!paused)} aria-label={paused ? "Resume cinematic animation" : "Pause cinematic animation"}>
            {paused ? <Play strokeWidth={1.4} /> : <Pause strokeWidth={1.4} />}
          </button>
        </div>
        <div className="cinematic-footnote"><span>INTERACTIVE VISUAL · NO AUDIO PLAYBACK</span><a href="#how-it-works">SCROLL TO EXPLORE <ArrowDown strokeWidth={1.3} /></a></div>
      </div>
    </section>
  );
}
