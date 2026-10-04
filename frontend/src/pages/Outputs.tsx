import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import { AppShell } from "@/components/AppShell"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { PageTitleBlock } from "@/components/shared/PageTitleBlock"
import { RightPanelCard } from "@/components/shared/RightPanelCard"
import { ProjectSummaryPanel } from "@/components/shared/ProjectSummaryPanel"
import { OutputsTable, CreateDubButton } from "@/components/shared/OutputsTable"
import { ExportOptionsCard } from "@/components/shared/ExportOptionsCard"
import { TranscriptSnippetCard } from "@/components/shared/TranscriptSnippetCard"
import { AudioWavePreview } from "@/components/shared/AudioWavePreview"
import { YouTubeVideoPreviewCard } from "@/components/shared/YouTubeVideoPreviewCard"

import { fetchOutputs, type OutputItem } from "@/lib/api"
import { fmtDate, langLabel, langName, voiceName } from "@/lib/format"

import {
  Search,
  Play,
  Pause,
  ChevronDown,
  ListMusic,
  Globe,
  Mic2,
  RefreshCw,
} from "lucide-react"

const EXPORT_FORMATS = ["mp3", "wav", "srt"] as const

// ── component ──────────────────────────────────────────────────────────

export function Outputs() {
  const [allOutputs, setAllOutputs] = useState<OutputItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [tab, setTab] = useState("all")
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [exportFormat, setExportFormat] = useState<string>("mp3")

  const loadOutputs = useCallback(async () => {
    setIsLoading(true)
    setLoadError("")
    try {
      const outputs = await fetchOutputs()
      setAllOutputs(outputs)
      setSelectedId((current) =>
        current && outputs.some((o) => o.id === current)
          ? current
          : outputs[0]?.id ?? null
      )
    } catch (err: any) {
      setLoadError(err.message || "Could not load outputs.")
      setAllOutputs([])
      setSelectedId(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOutputs()
  }, [loadOutputs])

  const filtered = allOutputs.filter((o) => {
    const matchTab =
      tab === "all" ||
      (tab === "ready" && o.status === "completed") ||
      (tab === "processing" && o.status !== "completed")
    const matchSearch =
      !search ||
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      o.sourceLanguage.includes(search) ||
      o.targetLanguage.includes(search)
    return matchTab && matchSearch
  })

  const selected = allOutputs.find((o) => o.id === selectedId) || null

  const handleDownload = (output: OutputItem) => {
    if (!output.audioUrl) return
    const a = document.createElement("a")
    a.href = output.audioUrl
    a.download = `vocally_${output.videoId}_${output.targetLanguage}.${exportFormat}`
    a.click()
  }

  const handlePlay = (output: OutputItem) => {
    setSelectedId(output.id)
    setIsPlaying(true)
  }

  return (
    <AppShell>
      <div className="grid h-full grid-cols-[minmax(0,1fr)_360px]">
        {/* ── Left main content ─────────────────────────── */}
        <div className="space-y-6 overflow-y-auto px-8 py-8">
          <PageTitleBlock
            title="Outputs"
            subtitle="Play, compare, and download your generated dubbed audio."
            actions={
              <>
                <Button
                  variant="outline"
                  onClick={loadOutputs}
                  disabled={isLoading}
                  className="h-10 rounded-xl border-[#E5EAF2] px-4 text-sm font-medium text-[#64748B] transition-all hover:bg-[#F8FAFC]"
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
                <Link to="/">
                  <CreateDubButton />
                </Link>
              </>
            }
          />

          {/* Tabs + search + list */}
          <div
            className="animate-fade-in-up overflow-hidden rounded-2xl border border-[#E5EAF2] bg-white shadow-sm"
            style={{ animationDelay: "60ms" }}
          >
            <div className="flex items-center justify-between gap-4 border-b border-[#E5EAF2] px-5 py-4">
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="h-9">
                  <TabsTrigger value="all" className="px-3 text-xs">
                    All
                    <span className="ml-1.5 rounded-full bg-[#E5EAF2] px-1.5 py-0.5 text-[10px] font-semibold text-[#64748B]">
                      {allOutputs.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="ready" className="px-3 text-xs">
                    Ready
                  </TabsTrigger>
                  <TabsTrigger value="processing" className="px-3 text-xs">
                    Processing
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Search outputs…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-52 rounded-lg border border-[#E5EAF2] bg-[#F8FAFC] pl-8 pr-3 text-sm text-[#0F172A] outline-none transition-all placeholder:text-[#94A3B8] focus:border-[#1D9BF0] focus:ring-2 focus:ring-[#1D9BF0]/10"
                />
              </div>
            </div>

            <OutputsTable
              outputs={filtered}
              selectedId={selectedId}
              loading={isLoading}
              error={loadError}
              onSelect={(output) => setSelectedId(output.id)}
              onPlay={handlePlay}
              onDownload={handleDownload}
              onRetry={loadOutputs}
              emptyAction={
                <Link to="/">
                  <Button className="h-9 rounded-xl bg-[#1D9BF0] text-sm font-medium text-white shadow-sm transition-all hover:bg-[#178BFF]">
                    Create a Dub
                  </Button>
                </Link>
              }
            />
          </div>
        </div>

        {/* ── Right panel ───────────────────────────────── */}
        <div className="overflow-y-auto border-l border-[#E5EAF2] bg-white">
          {selected ? (
            <div className="animate-fade-in space-y-5 p-5">
              {/* Preview */}
              <YouTubeVideoPreviewCard
                videoId={selected.videoId}
                title={selected.title}
                subtitle={
                  <span className="flex items-center gap-2">
                    <span>YouTube Video</span>
                    <span className="text-[#E5EAF2]">·</span>
                    <span>{fmtDate(selected.createdAt)}</span>
                  </span>
                }
              />

              {/* Summary */}
              <ProjectSummaryPanel
                title="Details"
                items={[
                  { icon: Globe, label: "Source", value: langLabel(selected.sourceLanguage) },
                  { icon: Globe, label: "Dubbed", value: langLabel(selected.targetLanguage) },
                  { icon: Mic2, label: "Voice", value: voiceName(selected.voice) },
                ]}
              />

              {/* Audio player */}
              <RightPanelCard title="Audio Preview">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label={isPlaying ? "Pause" : "Play"}
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#1D9BF0] text-white shadow-sm transition-all duration-200 hover:bg-[#178BFF]"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="ml-0.5 h-4 w-4" />
                    )}
                  </button>

                  <AudioWavePreview className="min-w-0 flex-1" bars={44} progress={0.42} />

                  <span className="flex-shrink-0 font-mono text-xs text-[#94A3B8]">
                    0:00 / —
                  </span>
                </div>

                {selected.audioUrl && (
                  <audio
                    src={selected.audioUrl}
                    controls
                    className="mt-3 w-full rounded-lg"
                    style={{ height: "32px" }}
                  />
                )}

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-[#94A3B8]">Playback speed</span>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs font-medium text-[#64748B] transition-colors hover:text-[#0F172A]"
                  >
                    1.0×
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              </RightPanelCard>

              {/* Export */}
              <ExportOptionsCard
                formats={EXPORT_FORMATS}
                value={exportFormat}
                onChange={setExportFormat}
                onDownload={() => handleDownload(selected)}
                disabled={selected.status !== "completed" || !selected.audioUrl}
              />

              {/* Transcript */}
              <TranscriptSnippetCard
                original={selected.originalTranscript?.slice(0, 220) || ""}
                translated={selected.translatedText?.slice(0, 220) || ""}
                originalLabel={`Original (${langName(selected.sourceLanguage)})`}
                translatedLabel={`Translated (${langName(selected.targetLanguage)})`}
              />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F5F9]">
                <ListMusic className="h-5 w-5 text-[#94A3B8]" />
              </div>
              <p className="text-sm text-[#94A3B8]">Select an output to preview details</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
