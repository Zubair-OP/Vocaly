import { useState } from "react";
import { ArrowUpRight, BookOpen, Globe2, Mic2, Video } from "lucide-react";
import { Reveal, SectionHeading, Waveform } from "./LandingPrimitives";

const audiences = [
  { icon: Video, title: "Creators", subtitle: "Same story. New audience.", word: "STORY", type: "creators" },
  { icon: BookOpen, title: "Educators", subtitle: "Make your lessons travel.", word: "IDEA", type: "educators" },
  { icon: Mic2, title: "Podcasters", subtitle: "A new voice for your clips.", word: "VOICE", type: "podcasters" },
  { icon: Globe2, title: "Teams", subtitle: "Your message, across markets.", word: "WORLD", type: "teams" },
];

export function AudienceVisuals() {
  const [selected, setSelected] = useState(0);
  const current = audiences[selected];
  return <section className="landing-section audience-cinema" id="use-cases" tabIndex={-1}>
    <div className="landing-container">
      <Reveal className="landing-heading-row"><SectionHeading number="04" label="MADE FOR YOUR WORLD" title={<>You create. <span>We translate.</span></>} /></Reveal>
      <Reveal className="audience-cinema-shell"><div className="audience-cinema-stage" data-audience={current.type}>
        <div className="audience-art" aria-hidden="true"><div className="audience-orbit orbit-one" /><div className="audience-orbit orbit-two" /><div className="audience-orbit orbit-three" /><div className="audience-art-word" key={current.word}>{current.word}<span>WITHOUT BORDERS</span></div><Waveform variant={selected} /><span className="audience-satellite satellite-one">EN</span><span className="audience-satellite satellite-two">اردو</span><span className="audience-satellite satellite-three">日本語</span><span className="audience-satellite satellite-four">ES</span></div>
        <div className="audience-cinema-caption" aria-live="polite"><p key={current.subtitle}>{current.subtitle}</p><ArrowUpRight strokeWidth={1.2} /></div>
        <fieldset className="audience-choices"><legend className="sr-only">Who is Vocally for?</legend>{audiences.map(({ icon: Icon, title }, index) => <label key={title} data-active={selected === index}><input type="radio" name="audience" checked={selected === index} onChange={() => setSelected(index)} /><Icon strokeWidth={1.2} /><span>{title}</span></label>)}</fieldset>
      </div></Reveal>
    </div>
  </section>;
}
