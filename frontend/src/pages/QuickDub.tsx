import { SpeechControls, type SpeechSettings } from "@/components/SpeechControls";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { PageTitleBlock } from "@/components/shared/PageTitleBlock";
import { VideoThumbnail } from "@/components/shared/VideoThumbnail";
import { StepProgress } from "@/components/shared/StepProgress";

import {
  fetchTranscript,
  generateAudio,
  generationErrorMessage,
  fetchVoices, uploadSpeakerReference, type VoiceOption,
} from "@/lib/api";
import { LANGUAGES, VOICES } from "@/lib/format";
import {
  Link2,
  ArrowRight,
  Info,
  X,
} from "lucide-react";

// ── constants ──────────────────────────────────────────────────────────

type Step =
  | "idle"
  | "fetching"
  | "generating"
  | "completed"
  | "error";

// Translation and speech synthesis share one backend request.
const PIPELINE_STEPS = [
  { id: "fetch", label: "Fetch transcript" },
  { id: "generate", label: "Translate & create audio" },
];

function extractVideoId(value: string): string | null {
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
    const id =
      host === "youtu.be"
        ? url.pathname.slice(1)
        : host === "youtube.com"
          ? url.searchParams.get("v") ||
            url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1]
          : null;
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

// ── component ──────────────────────────────────────────────────────────

export function QuickDub() {
  const navigate = useNavigate();

  const [url, setUrl] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("en");
  const [targetLanguage, setTargetLanguage] = useState("ur");
  const [voice, setVoice] = useState("ur-PK-UzmaNeural");
  const [voiceCatalogue, setVoiceCatalogue] = useState<Record<string, VoiceOption[]>>(VOICES);
  const [referenceAvailable, setReferenceAvailable] = useState(false);
  const [referenceLanguages, setReferenceLanguages] = useState<string[]>([]);
  const [speechSettings, setSpeechSettings] = useState<SpeechSettings>({ narration_style: "normal", speech_mode: "standard", speaker_consent: false, referenceFile: null });
  const [step, setStep] = useState<Step>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      timers.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetchVoices().then((data) => {
      if (!active) return;
      setVoiceCatalogue(data.voices);
      setReferenceAvailable(data.reference_voice?.available ?? false);
      setReferenceLanguages(data.reference_voice?.languages ?? []);
    }).catch(() => { /* Retain known voices if discovery is unavailable. */ });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const voices = voiceCatalogue[targetLanguage] || [];
    if (!voices.some((item) => item.id === voice)) setVoice(voices[0]?.id || "");
  }, [voiceCatalogue, targetLanguage, voice]);

  const videoId = extractVideoId(url);

  const handleTargetLanguageChange = (lang: string) => {
    setTargetLanguage(lang);
    const voices = voiceCatalogue[lang];
    if (voices?.length) setVoice(voices[0].id);
  };

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      setVideoTitle("");
    } catch {
      document.getElementById("youtube-url")?.focus();
    }
  }, []);

  const handleGenerate = async () => {
    if (speechSettings.speech_mode === "reference" && (!referenceAvailable || !referenceLanguages.includes(targetLanguage) || !speechSettings.referenceFile || !speechSettings.speaker_consent)) {
      setErrorMessage("Choose a supported language, upload a reference WAV and confirm speaker permission.");
      setStep("error");
      return;
    }
    if (!extractVideoId(url.trim())) {
      setErrorMessage("Please enter a valid YouTube video URL.");
      setStep("error");
      return;
    }

    setStep("fetching");
    setErrorMessage("");

    let phase: 'transcript' | 'generation' = 'transcript';
    try {
      const transcript = await fetchTranscript(url, sourceLanguage);
      if (!mounted.current) return;
      setVideoTitle(transcript.title);

      if (transcript.source_language)
        setSourceLanguage(transcript.source_language);

      setStep("generating");
      phase = 'generation';

      // The backend translates, synthesises audio, and saves the output to MongoDB.
      const reference = speechSettings.speech_mode === "reference" && speechSettings.referenceFile ? await uploadSpeakerReference(speechSettings.referenceFile) : undefined;
      const result = await generateAudio({
        video_id: transcript.video_id,
        title: transcript.title,
        source_language: transcript.source_language || sourceLanguage,
        target_language: targetLanguage,
        voice,
        narration_style: speechSettings.narration_style,
        speech_mode: speechSettings.speech_mode,
        speaker_consent: speechSettings.speaker_consent,
        reference_id: reference?.reference_id,
        transcript: transcript.segments.map((s) => s.text).join(" "),
      });

      if (!mounted.current) return;
      setStep("completed");
      const destination = result.output?.id
        ? "/outputs?id=" + encodeURIComponent(result.output.id)
        : "/outputs";
      timers.current.push(setTimeout(() => navigate(destination), 900));
    } catch (error) {
      if (!mounted.current) return;
      setStep("error");
      setErrorMessage(generationErrorMessage(error, phase));
    }
  };

  const isProcessing =
    step === "fetching" || step === "generating";
  const showProgress = isProcessing || step === "completed";
  const activeStage = step === "fetching" ? 0 : step === "generating" ? 1 : -1;
  const availableVoices = voiceCatalogue[targetLanguage] || [];


  return (
    <AppShell>
      <div className="studio-page create-page">
        <div className="workspace-main flex flex-col gap-7">
          <PageTitleBlock
            title="Give your video a new voice."
            subtitle="A familiar voice, in a new language. Start with a video and make it yours."
          />
          <section className="creation-shell" aria-label="Create a dub">
            <form noValidate onSubmit={(event) => {
              event.preventDefault();
              if (!isProcessing && step !== "completed") void handleGenerate();
            }}>
              <section className="creation-section" aria-labelledby="source-heading">
                <div className="creation-section-label">
                  <span className="creation-section-number">01 / SOURCE</span>
                  <h2 id="source-heading">The starting point</h2>
                  <p>A YouTube video with something worth sharing.</p>
                </div>
                <FieldGroup className="gap-4">
                    <Field
                      className="gap-2"
                      data-invalid={step === "error"}
                      data-disabled={isProcessing}
                    >
                      <FieldLabel htmlFor="youtube-url">YouTube URL</FieldLabel>
                      <div className="flex gap-2">
                        <div className="relative min-w-0 flex-1">
                          <Link2 className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" />
                          <Input
                            id="youtube-url"
                            type="url"
                            placeholder="https://www.youtube.com/watch?v=..."
                            value={url}
                            disabled={isProcessing}
                            aria-invalid={step === "error"}
                            aria-describedby={
                              step === "error" ? "dub-error" : "url-help"
                            }
                            onChange={(e) => {
                              setUrl(e.target.value);
                              setVideoTitle("");
                              if (step === "error") {
                                setStep("idle");
                                setErrorMessage("");
                              }
                            }}
                            className="h-11 pl-10 pr-10"
                          />
                          {url && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="Clear YouTube URL"
                              disabled={isProcessing}
                              onClick={() => {
                                setUrl("");
                                setVideoTitle("");
                              }}
                              className="absolute right-0.5 top-0.5"
                            >
                              <X />
                            </Button>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handlePaste}
                          disabled={isProcessing}
                          className="h-11"
                        >
                          Paste
                        </Button>
                      </div>
                    </Field>
                    {videoId && (
                      <article className="source-preview" aria-label="Source video preview">
                        <div className="source-preview-image"><VideoThumbnail videoId={videoId} /></div>
                        <div className="min-w-0">
                          <span className="studio-eyebrow">YOUR SOURCE VIDEO</span>
                          <p className="mt-1 truncate text-sm font-medium" title={videoTitle || "YouTube video selected"}>{videoTitle || "YouTube video selected"}</p>
                          <p className="mt-1 text-xs text-muted-foreground">Source video selected. Your settings are below.</p>
                        </div>
                      </article>
                    )}
                </FieldGroup>
              </section>
              <section className="creation-section" aria-labelledby="language-heading">
                <div className="creation-section-label">
                  <span className="creation-section-number">02 / LANGUAGE</span>
                  <h2 id="language-heading">Reach someone new</h2>
                  <p>Keep the meaning. Change the language.</p>
                </div>
                <FieldGroup>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field className="gap-2">
                        <FieldLabel htmlFor="source-language">
                          From (source)
                        </FieldLabel>
                        <Select
                          value={sourceLanguage}
                          onValueChange={setSourceLanguage}
                          disabled={isProcessing}
                        >
                          <SelectTrigger id="source-language" className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {LANGUAGES.map((lang) => (
                                <SelectItem key={lang.code} value={lang.code}>
                                  {lang.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field className="gap-2">
                        <FieldLabel htmlFor="target-language">
                          To (target)
                        </FieldLabel>
                        <Select
                          value={targetLanguage}
                          onValueChange={handleTargetLanguageChange}
                          disabled={isProcessing}
                        >
                          <SelectTrigger id="target-language" className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {LANGUAGES.map((lang) => (
                                <SelectItem key={lang.code} value={lang.code}>
                                  {lang.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                </FieldGroup>
              </section>
              <section className="creation-section" aria-labelledby="voice-heading">
                <div className="creation-section-label">
                  <span className="creation-section-number">03 / VOICE</span>
                  <h2 id="voice-heading">Set the tone</h2>
                  <p>Choose a voice and listen before you create.</p>
                </div>
                <FieldGroup>
                    <div className="voice-settings-grid">
                    <Field className="gap-2">
                      <FieldLabel htmlFor="voice-select">Voice</FieldLabel>
                      <Select
                        key={targetLanguage}
                        value={voice}
                        onValueChange={(value) => {
                          if (value) setVoice(value);
                        }}
                        disabled={isProcessing}
                      >
                        <SelectTrigger id="voice-select" className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {availableVoices.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    <SpeechControls language={targetLanguage} voice={voice} disabled={isProcessing} referenceAvailable={referenceAvailable} referenceLanguages={referenceLanguages} settings={speechSettings} onChange={setSpeechSettings} />
                    </div>
                </FieldGroup>
              </section>
              <div className="creation-footer">
                <div className="generation-dock">
                  <div className="generation-actions" data-visible={!showProgress} aria-hidden={showProgress}>
                    <div className="generation-note">
                      <span className="text-sm font-medium">Ready when you are.</span>
                      <p id="url-help"><Info className="size-3.5 shrink-0" aria-hidden="true" /> Use a public video with captions. Short videos work best.</p>
                    </div>
                    <Button type="submit" id="generate-audio" disabled={showProgress} tabIndex={showProgress ? -1 : undefined}>
                      Generate audio <ArrowRight data-icon="inline-end" />
                    </Button>
                  </div>
                  <div className="generation-feedback" data-visible={showProgress} aria-hidden={!showProgress}>
                    <StepProgress steps={PIPELINE_STEPS} activeIndex={activeStage} complete={step === "completed"}
                      status={step === "completed" ? "Your audio is ready. Opening outputs..." : step === "fetching" ? "Fetching your transcript..." : "Translating and creating your audio..."} />
                  </div>
                </div>
                {step === "error" && <Alert id="dub-error" variant="destructive"><AlertDescription>{errorMessage}</AlertDescription></Alert>}
              </div>
            </form>
          </section>
          <p className="creation-footnote">Your finished audio will be waiting in Outputs.</p>
        </div>
      </div>
    </AppShell>
  );
}
