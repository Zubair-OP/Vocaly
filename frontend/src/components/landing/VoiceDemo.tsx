import { useState } from "react";
import { ArrowDown, AudioLines, Check, Globe2, Pause, Play } from "lucide-react";
import { LANGUAGES } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Waveform } from "./LandingPrimitives";

const examples: Record<string, { text: string; greeting: string }> = {
  en: { text: "A good story deserves to be heard.", greeting: "Hello, world." },
  ur: { text: "ایک اچھی کہانی سنی جانے کی مستحق ہے۔", greeting: "دنیا، سلام۔" },
  hi: { text: "एक अच्छी कहानी सुनी जानी चाहिए।", greeting: "नमस्ते, दुनिया।" },
  ar: { text: "القصة الجيدة تستحق أن تُسمع.", greeting: "مرحباً بالعالم." },
  es: { text: "Una buena historia merece ser escuchada.", greeting: "Hola, mundo." },
  fr: { text: "Une belle histoire mérite d’être entendue.", greeting: "Bonjour, le monde." },
  de: { text: "Eine gute Geschichte verdient es, gehört zu werden.", greeting: "Hallo, Welt." },
  pt: { text: "Uma boa história merece ser ouvida.", greeting: "Olá, mundo." },
  zh: { text: "一个好故事值得被听见。", greeting: "你好，世界。" },
  ja: { text: "良い物語は、聞かれる価値がある。", greeting: "こんにちは、世界。" },
};

export function VoiceDemo({ expanded = false }: { expanded?: boolean }) {
  const [language, setLanguage] = useState("es");
  const [animated, setAnimated] = useState(true);
  const selected = LANGUAGES.find((item) => item.code === language)!;
  const choices = expanded ? LANGUAGES : LANGUAGES.filter((item) => ["es", "ur", "fr", "ja"].includes(item.code));
  return <div className={cn("voice-demo", expanded && "voice-demo-expanded")} data-animated={animated}>
    <div className="voice-demo-orbit" aria-hidden="true" />
    <div className="voice-demo-topline"><span><span className="live-dot" /> ONE SOURCE. NEW POSSIBILITIES.</span><AudioLines strokeWidth={1.2} aria-hidden="true" /></div>
    <div className="voice-source"><span className="language-code">EN</span><div><span className="voice-label">ORIGINAL · ENGLISH</span><p>A good story deserves to be heard.</p></div></div>
    <div className="voice-connection" aria-hidden="true"><span /><div><AudioLines strokeWidth={1.2} /> VOCALLY AI</div><span /><ArrowDown strokeWidth={1.2} /></div>
    <div className="voice-output-shell"><div className="voice-output"><div className="voice-output-label"><span><Globe2 strokeWidth={1.2} aria-hidden="true" />{selected.name} <span> / TRANSLATED</span></span><Check strokeWidth={1.4} aria-hidden="true" /></div><div className="voice-translation" aria-live="polite" aria-atomic="true"><p key={language} lang={language} dir={["ur", "ar"].includes(language) ? "rtl" : "ltr"}>{examples[language].text}</p></div><Waveform variant={LANGUAGES.indexOf(selected)} /><div className="voice-track-footer"><span>NEURAL VOICE</span><span>VISUAL PREVIEW</span></div></div></div>
    <fieldset className="language-options"><legend className="sr-only">{expanded ? "Explore all languages" : "Preview a language"}</legend>{choices.map((item) => <label key={item.code} className={cn("language-option", language === item.code && "is-selected")}><input type="radio" name={expanded ? "all-demo-language" : "hero-demo-language"} value={item.code} checked={language === item.code} onChange={() => setLanguage(item.code)} /><span>{item.code.toUpperCase()}</span>{item.name}</label>)}</fieldset>
    <div className="voice-demo-note"><span>Interactive concept · no audio playback</span><button onClick={() => setAnimated(!animated)} aria-label={animated ? "Pause waveform animation" : "Resume waveform animation"}>{animated ? <Pause strokeWidth={1.4} /> : <Play strokeWidth={1.4} />}</button></div>
  </div>;
}
