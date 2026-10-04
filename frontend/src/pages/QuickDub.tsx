import { VideoThumbnail } from "@/components/shared/VideoThumbnail";
import { SpeechControls, type SpeechSettings } from "@/components/SpeechControls";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { PageTitleBlock } from "@/components/shared/PageTitleBlock";
import { ProjectSummaryPanel } from "@/components/shared/ProjectSummaryPanel";
import { YouTubeVideoPreviewCard } from "@/components/shared/YouTubeVideoPreviewCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StepProgress } from "@/components/shared/StepProgress";

import {
  fetchTranscript,
  fetchOutputs,
  generateAudio,
  generationErrorMessage,
  fetchVoices, uploadSpeakerReference, type VoiceOption,
  type OutputItem,
} from "@/lib/api";
import { LANGUAGES, VOICES, langName, narrationName, relativeTime } from "@/lib/format";
import {
  Link2,
  Upload,
  Globe,
  ArrowRight,
  Info,
  Youtube,
  Loader2,
  FileAudio,
  X,
} from "lucide-react";

// ── constants ──────────────────────────────────────────────────────────

type Step =
  | "idle"
  | "fetching"
  | "translating"
  | "generating"
  | "completed"
  | "error";

/** The real pipeline, mirrored by the animated stepper under the CTA. */
const PIPELINE_STEPS = [
  { id: "fetch", label: "Fetch Captions" },
  { id: "transcribe", label: "Translate" },
  { id: "generate", label: "Generate Audio" },
];

const STAGE_LABELS = ["Fetching captions…", "Translating…", "Generating audio…"];

// ── recent outputs (loaded from MongoDB) ───────────────────────────────

interface RecentItem {
  id: string;
  videoId: string | null;
  title: string;
  source: string;
  from: string;
  to: string;
  duration: string;
  status: OutputItem["status"];
  updatedAt: string;
}

function toRecent(output: OutputItem): RecentItem {
  return {
    id: output.id,
    videoId: output.videoId ?? null,
    title: output.title,
    source: "YouTube Video",
    from: langName(output.sourceLanguage),
    to: langName(output.targetLanguage),
    duration: "—",
    status: output.status,
    updatedAt: relativeTime(output.createdAt),
  };
}

// ── helpers ────────────────────────────────────────────────────────────

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
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [stage, setStage] = useState(0);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState(false);
  const [reload, setReload] = useState(0);
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
    setRecentLoading(true);
    setRecentError(false);
    fetchOutputs(3)
      .then((outputs) => {
        if (active) setRecent(outputs.slice(0, 3).map(toRecent));
      })
      .catch(() => {
        if (active) setRecentError(true);
      })
      .finally(() => {
        if (active) setRecentLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload]);

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
  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    : null;

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
    setStage(0);
    setErrorMessage("");

    let promote: ReturnType<typeof setTimeout> | undefined;
    let phase: 'transcript' | 'generation' = 'transcript';
    try {
      const transcript = await fetchTranscript(url, sourceLanguage);
      if (!mounted.current) return;
      setVideoTitle(transcript.title);

      if (transcript.source_language)
        setSourceLanguage(transcript.source_language);

      setStep("translating");
      phase = 'generation';
      setStage(1);

      // The backend translates and synthesises audio in one call,
      // so the stepper advances to the last stage while that call is running.
      promote = setTimeout(() => {
        setStep("generating");
        setStage(2);
      }, 1500);

      timers.current.push(promote);
      // The backend translates, synthesises audio, and saves the output to MongoDB.
      const reference = speechSettings.speech_mode === "reference" && speechSettings.referenceFile ? await uploadSpeakerReference(speechSettings.referenceFile) : undefined;
      await generateAudio({
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

      clearTimeout(promote);
      if (!mounted.current) return;
      setStep("completed");
      timers.current.push(setTimeout(() => navigate("/outputs"), 900));
    } catch (error) {
      if (!mounted.current) return;
      setStep("error");
      setErrorMessage(generationErrorMessage(error, phase));
    } finally {
      if (promote) clearTimeout(promote);
    }
  };

  const isProcessing =
    step === "fetching" || step === "translating" || step === "generating";
  const availableVoices = voiceCatalogue[targetLanguage] || [];

  const sourceLang = LANGUAGES.find((l) => l.code === sourceLanguage);
  const targetLang = LANGUAGES.find((l) => l.code === targetLanguage);

  return (
    <AppShell>
      <div className="workspace-grid">
        <div className="workspace-main flex flex-col gap-7">
          <PageTitleBlock
            title="Quick Dub"
            subtitle="Turn a YouTube video into audio in another language."
          />
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <Tabs defaultValue="youtube" className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <TabsList aria-label="Video source">
                  <TabsTrigger value="youtube">
                    <Youtube className="size-4" />
                    YouTube link
                  </TabsTrigger>
                  <TabsTrigger value="upload" disabled>
                    <Upload className="size-4" />
                    Upload file
                  </TabsTrigger>
                </TabsList>
                <span className="text-xs text-muted-foreground">
                  File uploads coming soon
                </span>
              </div>
              <TabsContent value="youtube" className="pt-6">
                <form
                  noValidate
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!isProcessing) void handleGenerate();
                  }}
                  aria-busy={isProcessing}
                >
                  <FieldGroup className="gap-5">
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
                    <div className="flex flex-col gap-3 pt-1">
                      <Button
                        type="submit"
                        id="generate-audio"
                        disabled={isProcessing || step === "completed"}
                        className="h-auto min-h-12 w-full whitespace-normal py-3"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2
                              data-icon="inline-start"
                              className="animate-spin"
                            />
                            {
                              STAGE_LABELS[
                                Math.min(stage, STAGE_LABELS.length - 1)
                              ]
                            }
                          </>
                        ) : (
                          <>
                            Fetch Transcript &amp; Generate Audio
                            <ArrowRight data-icon="inline-end" />
                          </>
                        )}
                      </Button>
                      <p
                        id="url-help"
                        className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
                      >
                        <Info className="mt-0.5 size-3.5 shrink-0" />
                        Use a public video with captions. Short videos work
                        best.
                      </p>
                      {(isProcessing || step === "completed") && (
                        <div
                          aria-live="polite"
                          className="rounded-xl bg-background p-4"
                        >
                          <StepProgress
                            steps={PIPELINE_STEPS}
                            activeIndex={stage}
                            complete={step === "completed"}
                          />
                        </div>
                      )}
                      {step === "error" && (
                        <Alert id="dub-error" variant="destructive">
                          <AlertDescription>{errorMessage}</AlertDescription>
                        </Alert>
                      )}
                      {step === "completed" && (
                        <Alert variant="success">
                          <AlertDescription>
                            Your audio is ready. Opening outputs...
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </FieldGroup>
                </form>
              </TabsContent>
            </Tabs>
          </section>
          <section aria-labelledby="how-it-works">
            <h2 id="how-it-works" className="mb-4 text-base font-semibold">
              From video to voice
            </h2>
            <ol className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {[
                {
                  title: "Fetch transcript",
                  desc: "Find the captions from your YouTube video.",
                },
                {
                  title: "Translate text",
                  desc: "Bring the original meaning into your chosen language.",
                },
                {
                  title: "Generate audio",
                  desc: "Create a voice track, ready to listen and download.",
                },
              ].map((item, index) => (
                <li key={item.title} className="flex gap-3">
                  <span className="pt-0.5 text-xs font-semibold tabular-nums text-accent-foreground">
                    0{index + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-medium">{item.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {item.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <section
            className="overflow-hidden rounded-2xl border border-border bg-card"
            aria-labelledby="recent-outputs"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 id="recent-outputs" className="text-base font-semibold">
                Recent outputs
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/outputs")}
              >
                View all
                <ArrowRight />
              </Button>
            </div>
            {recentLoading ? (
              <div
                aria-label="Loading recent outputs"
                className="flex flex-col gap-4 p-5"
              >
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentError ? (
              <div className="flex flex-col items-center gap-3 p-6">
                <p className="text-sm text-muted-foreground">
                  Recent outputs could not be loaded.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setReload((n) => n + 1)}
                >
                  Try again
                </Button>
              </div>
            ) : recent.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileAudio />
                  </EmptyMedia>
                  <EmptyTitle>Your first dub starts here</EmptyTitle>
                  <EmptyDescription>
                    Add a video above. Your translated audio will be saved here.
                  </EmptyDescription>
                </EmptyHeader>
                <Button
                  variant="outline"
                  onClick={() =>
                    document.getElementById("youtube-url")?.focus()
                  }
                >
                  Add a video
                </Button>
              </Empty>
            ) : (
              <div className="divide-y divide-border">
                {recent.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate("/outputs?id=" + item.id)}
                    className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-background"
                  >
                    <div className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-accent">
                      <VideoThumbnail videoId={item.videoId} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.from} &rarr; {item.to}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusBadge status={item.status} />
                      <span className="hidden text-xs text-muted-foreground sm:block">
                        {item.updatedAt}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
        <aside
          className="workspace-detail flex flex-col gap-6"
          aria-label="Current dub setup"
        >
          <div>
            <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Your dub
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A quick look at your setup.
            </p>
          </div>
          <ProjectSummaryPanel
            title="Current setup"
            items={[
              { icon: Youtube, label: "Source", value: "YouTube" },
              {
                icon: Globe,
                label: "From",
                value: sourceLang?.name || langName(sourceLanguage),
              },
              {
                icon: Globe,
                label: "To",
                value: targetLang?.name || langName(targetLanguage),
              },
              { icon: FileAudio, label: "Output", value: speechSettings.speech_mode === "reference" ? "WAV audio" : "MP3 audio" },
              { icon: FileAudio, label: "Delivery", value: speechSettings.speech_mode === "reference" ? "Reference sample" : narrationName(speechSettings.narration_style) },
            ]}
          />
          <YouTubeVideoPreviewCard
            videoId={videoId}
            title={
              videoTitle || (videoId ? "Video preview" : "No video selected")
            }
            subtitle={
              videoId
                ? "The title will appear when the transcript is fetched."
                : "Your source video will appear here."
            }
            thumbnailBadge={thumbnailUrl ? "Preview" : undefined}
          />
          <section className="border-t border-border pt-5">
            <h3 className="text-sm font-medium">
              A better dub starts with clear speech
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Choose a short video with accurate captions. We detect the source
              language when the transcript is fetched.
            </p>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
