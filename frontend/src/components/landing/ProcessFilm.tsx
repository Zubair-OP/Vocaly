import { useEffect, useRef, useState } from "react";
import { ArrowRight, AudioLines, Check, Link2, Pause, Play } from "lucide-react";
import { Reveal, SectionHeading, Waveform } from "./LandingPrimitives";

const steps = [
  { title: "Paste a link", hint: "Captioned YouTube videos. Up to 5 minutes.", label: "THE SOURCE" },
  { title: "Choose a voice", hint: "10 languages. Your choice of voice and tone.", label: "THE TRANSFORMATION" },
  { title: "Take it further", hint: "Generate, listen, and download your MP3.", label: "THE NEW POSSIBILITY" },
];

export function ProcessFilm() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .2 });
    if (ref.current) observer.observe(ref.current);
    return () => { media.removeEventListener("change", update); observer.disconnect(); };
  }, []);

  useEffect(() => {
    if (!playing || !visible || reducedMotion) return;
    const interval = window.setInterval(() => setStep((current) => (current + 1) % steps.length), 4400);
    return () => window.clearInterval(interval);
  }, [playing, visible, reducedMotion]);

  return <section className="landing-section landing-container process-section" id="how-it-works" tabIndex={-1}>
    <Reveal className="landing-heading-row"><SectionHeading number="01" label="THE FLOW" title={<>Link. Language. <span>Let it play.</span></>} /><p className="process-section-note">Three steps. A whole new audience.</p></Reveal>
    <Reveal>
      <div ref={ref} className="process-film-shell" data-playing={playing && visible && !reducedMotion}>
        <div className="process-film">
          <div className="process-film-top"><span><span className="live-dot" /> THE DUBBING SEQUENCE</span><span>0{step + 1} / 03</span></div>
          <div className="process-stage" data-step={step} aria-label={`${steps[step].title}. ${steps[step].hint}`}>
            <div className="process-source-film"><img src="/images/vocally-studio-cinematic.jpg" alt="A storyteller recording at a microphone" loading="lazy" width="1672" height="940" /><div className="process-source-title"><span>YOUR ORIGINAL</span><AudioLines strokeWidth={1.2} /></div><div className="process-url"><Link2 strokeWidth={1.3} /><span>youtube.com / your-story</span><Check strokeWidth={1.3} /></div></div>
            <div className="process-transfer" aria-hidden="true"><span /><div><AudioLines strokeWidth={1.2} /></div><span /></div>
            <div className="process-output-film"><div className="process-language-cloud" aria-hidden="true"><span>こんにちは</span><span>Hola</span><span>Bonjour</span><span lang="ur">سلام</span></div><div className="process-output-heading"><span>{step === 0 ? "READY FOR A NEW VOICE" : step === 1 ? "FINDING YOUR FREQUENCY" : "YOUR STORY, IN SPANISH"}</span><span className="process-check"><Check strokeWidth={1.4} /></span></div><Waveform variant={step} /><div className="process-output-file"><AudioLines strokeWidth={1.4} /><span>your-story_es.mp3</span><span>MP3</span></div></div>
          </div>
          <div className="process-film-bottom"><span>AN ANIMATED WORKFLOW PREVIEW</span><button onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause workflow animation" : "Play workflow animation"}>{playing ? <Pause strokeWidth={1.3} /> : <Play strokeWidth={1.3} />}</button></div>
        </div>
      </div>
      <fieldset className="process-chapters"><legend className="sr-only">Explore dubbing steps</legend>{steps.map((item, index) => <label key={item.title} data-active={step === index}>
        <input type="radio" name="process-chapter" checked={step === index} onChange={() => { setStep(index); setPlaying(false); }} />
        <span className="process-chapter-index">0{index + 1}</span><div><span className="landing-eyebrow">{item.label}</span><h3>{item.title}</h3><p>{item.hint}</p></div><ArrowRight strokeWidth={1.3} />
      </label>)}</fieldset>
    </Reveal>
  </section>;
}
