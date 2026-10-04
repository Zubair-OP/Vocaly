import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { AppShell } from "@/components/AppShell"
import { Button } from "@/components/ui/button"
import {
  Clock,
  Hash,
  FileAudio,
  Globe,
  Mic2,
  Timer,
} from "lucide-react"

import { PageTitleBlock, BackLink } from "@/components/shared/PageTitleBlock"
import { RightPanelCard } from "@/components/shared/RightPanelCard"
import { ProjectSummaryPanel } from "@/components/shared/ProjectSummaryPanel"
import { StatMiniCard } from "@/components/shared/StatMiniCard"
import { AudioWavePreview } from "@/components/shared/AudioWavePreview"
import { YouTubeVideoPreviewCard } from "@/components/shared/YouTubeVideoPreviewCard"
import {
  ProcessingTimeline,
  ProcessingLog,
  type TimelineStep,
  type LogEntry,
} from "@/components/shared/ProcessingTimeline"
import { CircularProgressCard } from "@/components/shared/CircularProgressCard"

// ── mock data (progress simulation) ────────────────────────────────────

const INITIAL_STEPS: TimelineStep[] = [
  { id: "link", label: "YouTube link analyzed", status: "done", time: "09:31:01" },
  { id: "transcript", label: "Transcript fetched", sub: "1,432 words", status: "done", time: "09:31:08" },
  { id: "translation", label: "Translation complete", sub: "Urdu · 1,428 words", status: "done", time: "09:31:22" },
  { id: "audio", label: "Audio generation", sub: "Generating…", status: "active" },
  { id: "export", label: "Final export", status: "pending" },
]

const LOG_ENTRIES: LogEntry[] = [
  { time: "09:31:01", message: "Analyzing YouTube link", type: "success" },
  { time: "09:31:03", message: "Fetching transcript", type: "success" },
  { time: "09:31:08", message: "Transcript fetched — 1,432 words", type: "success" },
  { time: "09:31:09", message: "Translating text to Urdu", type: "success" },
  { time: "09:31:22", message: "Translation complete — 1,428 words", type: "success" },
  { time: "09:31:23", message: "Starting audio generation", type: "active" },
]

// ── component ──────────────────────────────────────────────────────────

export function GeneratingAudio() {
  const navigate = useNavigate()
  const [progress, setProgress] = useState(62)
  const [steps, setSteps] = useState<TimelineStep[]>(INITIAL_STEPS)

  // Simulate progress ticking up
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval)
          return 100
        }
        return p + 1
      })
    }, 600)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setSteps((current) =>
      current.map((step) => {
        if (step.status === "pending" && progress >= 90)
          return { ...step, status: "active", sub: "Rendering…" }
        if (step.status === "active" && step.id === "audio" && progress >= 100)
          return { ...step, status: "done", sub: "Ready" }
        return step
      })
    )
  }, [progress])

  return (
    <AppShell>
      <div className="grid h-full grid-cols-[minmax(0,1fr)_340px]">
        {/* ── Left content ─────────────────────────────── */}
        <div className="space-y-6 overflow-y-auto px-8 py-8">
          <PageTitleBlock
            title="Generating Audio"
            subtitle="Fetching transcript, translating text, and creating the dubbed audio."
            backAction={<BackLink label="Back to Projects" onClick={() => navigate("/")} />}
            className="animate-fade-in-up"
          />

          {/* Main progress card */}
          <div
            className="animate-fade-in-up rounded-2xl border border-[#E5EAF2] bg-white shadow-sm p-6"
            style={{ animationDelay: "80ms" }}
          >
            <div className="flex items-start gap-8">
              <CircularProgressCard
                value={progress}
                label="Processing…"
                className="flex-shrink-0 border-0 bg-transparent p-0 shadow-none"
              />

              <ProcessingTimeline steps={steps} className="min-w-0 flex-1" />
            </div>
          </div>

          {/* Waveform card */}
          <div
            className="animate-fade-in-up rounded-2xl border border-[#E5EAF2] bg-white shadow-sm px-6 py-5"
            style={{ animationDelay: "140ms" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EEF7FF]">
                  <Mic2 className="h-3.5 w-3.5 text-[#1D9BF0]" />
                </div>
                <span className="text-sm font-semibold text-[#0F172A]">
                  Generating dubbed audio…
                </span>
              </div>
              <span className="font-mono text-xs text-[#94A3B8]">01:23 / 12:34</span>
            </div>

            <AudioWavePreview
              className="h-10"
              bars={46}
              animated
              progress={progress / 100}
            />
          </div>

          {/* Bottom stat cards */}
          <div className="grid grid-cols-3 gap-4">
            <StatMiniCard
              icon={Timer}
              label="Est. Time Left"
              value={progress >= 100 ? "Done" : "~ 2 minutes"}
              className="animate-fade-in-up"
              color="#EEF7FF"
              iconColor="#1D9BF0"
            />
            <StatMiniCard
              icon={Hash}
              label="Queue Position"
              value="1 of 3"
              className="animate-fade-in-up"
              color="#EEF5FF"
              iconColor="#3B82F6"
            />
            <StatMiniCard
              icon={FileAudio}
              label="Output Format"
              value="MP3"
              className="animate-fade-in-up"
              color="#EAFBF0"
              iconColor="#16A34A"
            />
          </div>
        </div>

        {/* ── Right panel ───────────────────────────────── */}
        <div className="space-y-5 overflow-y-auto border-l border-[#E5EAF2] bg-white px-5 py-8">
          {/* Project details */}
          <YouTubeVideoPreviewCard
            title="The Art of Deep Work — Cal Newport"
            subtitle="YouTube Video"
          />

          <ProjectSummaryPanel
            title="Project Details"
            items={[
              { icon: Globe, label: "Source", value: "🇺🇸 English" },
              { icon: Globe, label: "Target", value: "🇵🇰 Urdu" },
              { icon: Mic2, label: "Voice", value: "Uzma (Female)" },
              { icon: Clock, label: "Duration", value: "12:34" },
            ]}
          />

          {/* Processing log */}
          <RightPanelCard title="Processing Log">
            <ProcessingLog entries={LOG_ENTRIES} maxHeight="h-64" />
          </RightPanelCard>

          <Button
            variant="outline"
            className="w-full rounded-xl border-[#E5EAF2] text-[#64748B]"
            onClick={() => navigate("/")}
          >
            Cancel Processing
          </Button>
        </div>
      </div>
    </AppShell>
  )
}
