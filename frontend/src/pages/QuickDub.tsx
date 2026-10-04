import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { AppShell } from "@/components/AppShell"
import { Button } from "@/components/ui/button"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

import { PageTitleBlock } from "@/components/shared/PageTitleBlock"
import { ProjectSummaryPanel } from "@/components/shared/ProjectSummaryPanel"
import { YouTubeVideoPreviewCard } from "@/components/shared/YouTubeVideoPreviewCard"
import { StatusBadge } from "@/components/shared/StatusBadge"

import { fetchTranscript, fetchOutputs, generateAudio, type OutputItem } from "@/lib/api"
import { LANGUAGES, VOICES, langName, relativeTime, thumbUrl } from "@/lib/format"
import {
  Link2,
  Upload,
  Globe,
  ArrowRight,
  Info,
  Wand2,
  Youtube,
  Clock,
  Eye,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileAudio,
  X,
} from "lucide-react"

// ── constants ──────────────────────────────────────────────────────────

type Step = "idle" | "fetching" | "translating" | "generating" | "completed" | "error"

// ── recent outputs (loaded from MongoDB) ───────────────────────────────

interface RecentItem {
  id: string
  videoId: string | null
  title: string
  source: string
  from: string
  to: string
  duration: string
  status: OutputItem["status"]
  updatedAt: string
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
  }
}

// ── helpers ────────────────────────────────────────────────────────────

function extractVideoId(url: string): string | null {
  const m = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?&]+)/)
  return m ? m[1] : null
}

// ── component ──────────────────────────────────────────────────────────

export function QuickDub() {
  const navigate = useNavigate()

  const [url, setUrl] = useState("")
  const [sourceLanguage, setSourceLanguage] = useState("en")
  const [targetLanguage, setTargetLanguage] = useState("ur")
  const [voice, setVoice] = useState("ur-PK-UzmaNeural")
  const [step, setStep] = useState<Step>("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [videoTitle, setVideoTitle] = useState("")
  const [recent, setRecent] = useState<RecentItem[]>([])

  useEffect(() => {
    let active = true
    fetchOutputs(3)
      .then((outputs) => {
        if (active) setRecent(outputs.map(toRecent))
      })
      .catch(() => {
        if (active) setRecent([])
      })
    return () => {
      active = false
    }
  }, [])

  const videoId = extractVideoId(url)
  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    : null

  const handleTargetLanguageChange = (lang: string) => {
    setTargetLanguage(lang)
    const voices = VOICES[lang]
    if (voices?.length) setVoice(voices[0].id)
  }

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      setUrl(text)
    } catch {
      // silent
    }
  }, [])

  const handleGenerate = async () => {
    if (!url.trim()) {
      setErrorMessage("Please enter a valid YouTube video URL.")
      setStep("error")
      return
    }

    setStep("fetching")
    setErrorMessage("")

    try {
      const transcript = await fetchTranscript(url)
      setVideoTitle(transcript.title)

      if (transcript.source_language) setSourceLanguage(transcript.source_language)

      setStep("translating")
      setStep("generating")

      // The backend translates, synthesises audio, and saves the output to MongoDB.
      await generateAudio({
        video_id: transcript.video_id,
        title: transcript.title,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        voice,
        transcript: transcript.segments.map((s) => s.text).join(" "),
      })

      setStep("completed")
      setTimeout(() => navigate("/outputs"), 900)
    } catch (err: any) {
      setStep("error")
      setErrorMessage(err.message || "An unexpected error occurred.")
    }
  }

  const isProcessing = step === "fetching" || step === "translating" || step === "generating"
  const availableVoices = VOICES[targetLanguage] || []

  const sourceLang = LANGUAGES.find((l) => l.code === sourceLanguage)
  const targetLang = LANGUAGES.find((l) => l.code === targetLanguage)

  return (
    <AppShell>
      <div className="grid grid-cols-[minmax(0,1fr)_340px] h-full">
        {/* ── Left main content ─────────────────────────── */}
        <div className="overflow-y-auto px-8 py-8 space-y-8">
          {/* Page title */}
          <PageTitleBlock
            title="Quick Dub"
            subtitle="Paste a YouTube link or upload a file, then generate translated audio."
            className="animate-fade-in-up"
          />

          {/* Input card */}
          <div
            className="animate-fade-in-up rounded-2xl border border-[#E5EAF2] bg-white shadow-sm overflow-hidden"
            style={{ animationDelay: "80ms" }}
          >
            {/* Tabs */}
            <div className="px-6 pt-5 pb-0">
              <Tabs defaultValue="youtube" className="w-full">
                <TabsList className="w-fit">
                  <TabsTrigger value="youtube" className="flex items-center gap-2">
                    <Youtube className="h-3.5 w-3.5" />
                    YouTube Link
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="flex items-center gap-2">
                    <Upload className="h-3.5 w-3.5" />
                    Upload File
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="youtube" className="pt-6 pb-6">
                  <div className="space-y-5">
                    {/* URL input */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-[#0F172A]">YouTube URL</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                          <input
                            id="youtube-url"
                            type="url"
                            placeholder="https://www.youtube.com/watch?v=..."
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            disabled={isProcessing}
                            className="w-full h-11 rounded-xl border border-[#E5EAF2] bg-[#F8FAFC] pl-10 pr-10 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:border-[#1D9BF0] focus:ring-2 focus:ring-[#1D9BF0]/10 disabled:opacity-50 transition-all"
                          />
                          {url && (
                            <button
                              onClick={() => setUrl("")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          onClick={handlePaste}
                          disabled={isProcessing}
                          className="h-11 rounded-xl border-[#E5EAF2] text-[#64748B] hover:bg-[#F8FAFC]"
                        >
                          Paste
                        </Button>
                      </div>
                    </div>

                    {/* Language row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[#0F172A]">
                          From (Source)
                        </label>
                        <Select
                          value={sourceLanguage}
                          onValueChange={setSourceLanguage}
                          disabled={isProcessing}
                        >
                          <SelectTrigger
                            id="source-language"
                            className="h-11 rounded-xl border-[#E5EAF2] bg-[#F8FAFC]"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LANGUAGES.map((lang) => (
                              <SelectItem key={lang.code} value={lang.code}>
                                {lang.flag} {lang.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[#0F172A]">
                          To (Target)
                        </label>
                        <Select
                          value={targetLanguage}
                          onValueChange={handleTargetLanguageChange}
                          disabled={isProcessing}
                        >
                          <SelectTrigger
                            id="target-language"
                            className="h-11 rounded-xl border-[#E5EAF2] bg-[#F8FAFC]"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LANGUAGES.map((lang) => (
                              <SelectItem key={lang.code} value={lang.code}>
                                {lang.flag} {lang.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Voice selector */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-[#0F172A]">Voice</label>
                      <Select value={voice} onValueChange={setVoice} disabled={isProcessing}>
                        <SelectTrigger
                          id="voice-select"
                          className="h-11 rounded-xl border-[#E5EAF2] bg-[#F8FAFC]"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableVoices.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* CTA */}
                    <div className="space-y-2 pt-1">
                      <Button
                        id="generate-audio"
                        onClick={handleGenerate}
                        disabled={isProcessing}
                        className="w-full h-12 rounded-xl bg-[#1D9BF0] hover:bg-[#178BFF] text-white font-semibold text-[15px] shadow-sm transition-all"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {step === "fetching"
                              ? "Fetching transcript…"
                              : step === "translating"
                              ? "Translating…"
                              : "Generating audio…"}
                          </>
                        ) : (
                          <>
                            <Wand2 className="mr-2 h-4 w-4" />
                            Fetch Transcript &amp; Generate Audio
                          </>
                        )}
                      </Button>

                      {/* Status messages */}
                      {step === "error" && (
                        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          {errorMessage}
                        </div>
                      )}
                      {step === "completed" && (
                        <div className="flex items-center gap-2 rounded-xl border border-[#16A34A]/20 bg-[#EAFBF0] px-4 py-3 text-sm text-[#16A34A]">
                          <CheckCircle2 className="h-4 w-4" />
                          Done! Redirecting to outputs…
                        </div>
                      )}

                      <p className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
                        <Info className="h-3 w-3" />
                        Best for short videos in hackathon mode.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="upload" className="py-8">
                  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#E5EAF2] py-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF7FF]">
                      <Upload className="h-5 w-5 text-[#1D9BF0]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">Upload a file</p>
                      <p className="text-xs text-[#94A3B8] mt-0.5">MP3, MP4, WAV up to 100 MB</p>
                    </div>
                    <Button variant="outline" className="rounded-xl border-[#E5EAF2]">
                      Choose File
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* How it works */}
          <div
            className="animate-fade-in-up rounded-2xl border border-[#E5EAF2] bg-white shadow-sm p-6"
            style={{ animationDelay: "140ms" }}
          >
            <h2 className="text-[16px] font-semibold text-[#0F172A] mb-5">How It Works</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  num: "01",
                  title: "Fetch Transcript",
                  desc: "We pull the YouTube transcript automatically.",
                  color: "#EEF7FF",
                  textColor: "#1D9BF0",
                },
                {
                  num: "02",
                  title: "Translate Text",
                  desc: "The transcript is translated into your chosen language.",
                  color: "#EEF5FF",
                  textColor: "#3B82F6",
                },
                {
                  num: "03",
                  title: "Generate Audio",
                  desc: "Text-to-speech creates a natural-sounding dubbed audio.",
                  color: "#EAFBF0",
                  textColor: "#16A34A",
                },
              ].map((item, i) => (
                <div key={i} className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold"
                      style={{ backgroundColor: item.color, color: item.textColor }}
                    >
                      {item.num}
                    </div>
                    {i < 2 && (
                      <ArrowRight className="h-4 w-4 text-[#CBD5E1] flex-shrink-0" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{item.title}</p>
                    <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent outputs */}
          <div
            className="animate-fade-in-up rounded-2xl border border-[#E5EAF2] bg-white shadow-sm overflow-hidden"
            style={{ animationDelay: "200ms" }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5EAF2]">
              <h2 className="text-[15px] font-semibold text-[#0F172A]">Recent Outputs</h2>
              <button
                onClick={() => navigate("/outputs")}
                className="text-xs text-[#1D9BF0] hover:underline font-medium"
              >
                View all
              </button>
            </div>
            <div className="divide-y divide-[#EDF2F7]">
              {recent.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-[#94A3B8]">
                  No outputs yet — generate your first dub above.
                </div>
              ) : (
                recent.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigate("/outputs")}
                    className="flex items-center gap-4 px-6 py-3.5 hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                  >
                    {/* Thumbnail */}
                    <div className="h-10 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-[#EEF7FF]">
                      {thumbUrl(item.videoId) ? (
                        <img
                          src={thumbUrl(item.videoId)}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Youtube className="h-4 w-4 text-[#1D9BF0]" />
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#0F172A] truncate">{item.title}</p>
                      <p className="text-xs text-[#94A3B8] mt-0.5">
                        {item.source} · {item.from} → {item.to}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-[#94A3B8] flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {item.duration}
                      </span>
                      <StatusBadge status={item.status} />
                      <span className="text-xs text-[#94A3B8]">{item.updatedAt}</span>
                      <button
                        type="button"
                        aria-label="More actions"
                        className="text-[#94A3B8] hover:text-[#64748B]"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Right panel ───────────────────────────────── */}
        <div className="overflow-y-auto border-l border-[#E5EAF2] bg-white px-6 py-8 space-y-5">
          {/* Current Setup card */}
          <ProjectSummaryPanel
            title="Current Setup"
            className="animate-fade-in-up bg-[#F8FAFC]"
            items={[
              { icon: Youtube, label: "Source", value: "YouTube" },
              {
                icon: Globe,
                label: "From",
                value: sourceLang ? `${sourceLang.flag} ${sourceLang.name}` : "English",
              },
              {
                icon: Globe,
                label: "To",
                value: targetLang ? `${targetLang.flag} ${targetLang.name}` : "Urdu",
              },
              { icon: FileAudio, label: "Output", value: "Audio only" },
            ]}
          />

          {/* Video Preview */}
          <YouTubeVideoPreviewCard
            className="animate-fade-in-up"
            videoId={videoId}
            title={videoTitle || (videoId ? "Loading title…" : "No video selected")}
            thumbnailBadge={thumbnailUrl ? "Preview" : undefined}
            meta={
              videoId ? (
                <>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    —
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    —
                  </span>
                </>
              ) : undefined
            }
          />

          {/* Tips */}
          <div className="rounded-xl border border-[#E5EAF2] bg-[#EEF7FF] p-4">
            <p className="text-xs font-semibold text-[#1D9BF0] mb-1.5">💡 Tips</p>
            <ul className="space-y-1.5 text-xs text-[#64748B]">
              <li>• Use videos shorter than 10 minutes for best results</li>
              <li>• Make sure the video has subtitles/captions enabled</li>
              <li>• Clear speech produces better TTS output</li>
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
