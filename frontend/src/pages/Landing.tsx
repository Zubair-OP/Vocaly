import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, AudioLines, Globe2, Mic2, SlidersHorizontal } from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { Brand, Reveal, SectionHeading, StudioLink, Waveform } from "@/components/landing/LandingPrimitives";
import { CinematicHero } from "@/components/landing/CinematicHero";
import { ProcessFilm } from "@/components/landing/ProcessFilm";
import { AudienceVisuals } from "@/components/landing/AudienceVisuals";
import { VoiceDemo } from "@/components/landing/VoiceDemo";
import { StudioPreview } from "@/components/landing/StudioPreview";
import { LANGUAGES } from "@/lib/format";

export function Landing() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Vocally — One video. A world of voices.";
    document.documentElement.classList.add("vocally-landing");
    const motionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { (entry.target as HTMLElement).dataset.inView = String(entry.isIntersecting); });
    }, { rootMargin: "100px" });
    document.querySelectorAll(".landing-cinematic main > section").forEach((section) => motionObserver.observe(section));
    return () => {
      motionObserver.disconnect();
      document.title = previousTitle;
      document.documentElement.classList.remove("vocally-landing");
    };
  }, []);

  return <div className="landing landing-cinematic">
    <a href="#main-content" className="landing-skip">Skip to content</a>
    <LandingNav />
    <main id="main-content" tabIndex={-1}>
      <CinematicHero />
      <section className="landing-capabilities" id="features" tabIndex={-1} aria-label="Product capabilities">
        <div className="landing-container"><span className="capability-intro">ONE LINK.<br /><strong>MORE POSSIBILITIES.</strong></span><span><Globe2 />{LANGUAGES.length} languages</span><span><Mic2 />Neural voices</span><span><SlidersHorizontal />3 narration styles</span><span><AudioLines />MP3 downloads</span></div>
      </section>
      <ProcessFilm />
      <StudioPreview />
      <section className="landing-section landing-container landing-language-section" id="demo" tabIndex={-1}>
        <Reveal className="language-story">
          <SectionHeading number="03" label="TRY A DIFFERENT FREQUENCY" title={<>One story.<br /><span>Ten ways<br />to tell it.</span></>} />
          <div className="language-story-note"><span className="language-story-number">10</span><div>languages.<br /><span>Pick yours. Watch it change.</span></div></div>
          <div className="language-orbits" aria-hidden="true"><span>EN</span><span>ES</span><span>日本語</span><span>اردو</span><AudioLines strokeWidth={.7} /></div>
        </Reveal>
        <Reveal className="language-demo-shell" delay={100}><VoiceDemo expanded /></Reveal>
      </section>
      <AudienceVisuals />
      <section className="landing-final landing-section">
        <div className="final-frequency" aria-hidden="true"><Waveform variant={3} /></div>
        <Reveal className="landing-container"><p className="landing-eyebrow">YOUR NEXT AUDIENCE IS OUT THERE</p><h2>Let your story<br /><span>travel further.</span></h2><StudioLink>Start dubbing now</StudioLink></Reveal>
      </section>
    </main>
    <footer className="landing-footer landing-container">
      <div><Brand /><p>Your voice. A world of possibilities.</p></div>
      <nav aria-label="Footer navigation"><a href="#how-it-works">How it works</a><a href="#demo">Explore the demo</a><Link to="/new">Open Studio <ArrowUpRight strokeWidth={1.3} /></Link></nav>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} Vocally</span><span>BUILT TO MAKE IDEAS HEARD.</span><a href="#main-content">Back to top ↑</a></div>
    </footer>
  </div>;
}
