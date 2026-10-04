import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Globe,
  Mic2,
  RefreshCw,
  Search,
  ListMusic,
  Download,
  Plus,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTitleBlock } from "@/components/shared/PageTitleBlock";
import { RightPanelCard } from "@/components/shared/RightPanelCard";
import { ProjectSummaryPanel } from "@/components/shared/ProjectSummaryPanel";
import { OutputsTable } from "@/components/shared/OutputsTable";
import { TranscriptSnippetCard } from "@/components/shared/TranscriptSnippetCard";
import { YouTubeVideoPreviewCard } from "@/components/shared/YouTubeVideoPreviewCard";
import { fetchOutputs, type OutputItem } from "@/lib/api";
import { fmtDate, langName, voiceName } from "@/lib/format";

export function Outputs() {
  const [params, setParams] = useSearchParams();
  const [outputs, setOutputs] = useState<OutputItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(params.get("id"));
  const [page, setPage] = useState(1);
  const [playRequest, setPlayRequest] = useState(0);
  const [audioError, setAudioError] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingPlayId = useRef<string | null>(null);
  const detailRef = useRef<HTMLElement>(null);
  const search = params.get("q") || "";
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchOutputs();
      setOutputs(data);
      setSelectedId((current) =>
        data.some((o) => o.id === current) ? current : (data[0]?.id ?? null),
      );
    } catch {
      setError(
        "We could not load your outputs. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    setPage(1);
  }, [search, tab]);
  const selected = outputs.find((o) => o.id === selectedId);
  const filtered = outputs.filter(
    (o) =>
      (tab === "all" ||
        (tab === "ready" ? o.status === "completed" : o.status === "error")) &&
      [o.title, langName(o.sourceLanguage), langName(o.targetLanguage)]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  const currentPage = Math.min(page, pages);
  useEffect(() => {
    setAudioError("");
  }, [selectedId]);
  useEffect(() => {
    if (
      playRequest &&
      pendingPlayId.current === selectedId &&
      audioRef.current
    ) {
      pendingPlayId.current = null;
      void audioRef.current
        .play()
        .catch(() =>
          setAudioError(
            "Playback could not start. Use the player to try again.",
          ),
        );
    }
  }, [playRequest, selectedId]);
  const select = (output: OutputItem) => {
    setSelectedId(output.id);
    if (window.innerWidth < 1280)
      requestAnimationFrame(() =>
        detailRef.current?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
          block: "start",
        }),
      );
  };
  const download = (output: OutputItem) => {
    if (!output.audioUrl) return;
    const a = document.createElement("a");
    a.href = output.audioUrl;
    a.download =
      "vocally_" + output.videoId + "_" + output.targetLanguage + ".mp3";
    a.click();
  };
  const list = (
    <>
      <OutputsTable
        outputs={filtered.slice((currentPage - 1) * 8, currentPage * 8)}
        selectedId={selectedId}
        loading={loading}
        error={error}
        onSelect={select}
        onPlay={(output) => {
          select(output);
          pendingPlayId.current = output.id;
          setPlayRequest((n) => n + 1);
        }}
        onDownload={download}
        onRetry={load}
        emptyAction={
          search || tab !== "all" ? (
            <Button
              variant="outline"
              onClick={() => {
                setParams({});
                setTab("all");
              }}
            >
              Clear filters
            </Button>
          ) : (
            <Button asChild>
              <Link to="/">Create your first dub</Link>
            </Button>
          )
        }
      />
      {!loading && !error && filtered.length > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
          <span className="text-xs text-muted-foreground">
            {filtered.length} output{filtered.length === 1 ? "" : "s"} | Page{" "}
            {currentPage} of {pages}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === pages}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
  return (
    <AppShell>
      <div className="workspace-grid">
        <div className="workspace-main flex flex-col gap-7">
          <PageTitleBlock
            title="Outputs"
            subtitle="Your translated audio, ready to listen and share."
            actions={
              <>
                <Button
                  variant="outline"
                  onClick={load}
                  disabled={loading}
                  aria-label="Refresh outputs"
                >
                  <RefreshCw data-icon="inline-start" />
                  Refresh
                </Button>
                <Button asChild>
                  <Link to="/">
                    <Plus data-icon="inline-start" />
                    New dub
                  </Link>
                </Button>
              </>
            }
          />
          <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
            <Tabs value={tab} onValueChange={setTab}>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-4">
                <TabsList aria-label="Filter outputs">
                  <TabsTrigger value="all">All outputs</TabsTrigger>
                  <TabsTrigger value="ready">Ready</TabsTrigger>
                  <TabsTrigger value="error">Failed</TabsTrigger>
                </TabsList>
                <div className="relative w-full sm:w-52">
                  <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    aria-label="Filter outputs by title or language"
                    placeholder="Filter outputs..."
                    value={search}
                    onChange={(e) =>
                      setParams(e.target.value ? { q: e.target.value } : {}, {
                        replace: true,
                      })
                    }
                    className="pl-9"
                  />
                </div>
              </div>
              {["all", "ready", "error"].map((value) => (
                <TabsContent key={value} value={value}>
                  {list}
                </TabsContent>
              ))}
            </Tabs>
          </section>
        </div>
        <aside
          ref={detailRef}
          aria-label="Output details"
          className="workspace-detail flex flex-col gap-6 scroll-mt-5"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Output details
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Preview, listen, and export.
            </p>
          </div>
          {loading ? (
            <div
              aria-label="Loading output details"
              className="flex flex-col gap-5"
            >
              <Skeleton className="aspect-video w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : error ? (
            <p className="text-sm text-muted-foreground">
              Your output details will appear when the library is available.
            </p>
          ) : selected ? (
            <>
              <YouTubeVideoPreviewCard
                videoId={selected.videoId}
                title={selected.title}
                subtitle={"YouTube | " + fmtDate(selected.createdAt)}
              />
              <ProjectSummaryPanel
                title="Language & voice"
                items={[
                  {
                    icon: Globe,
                    label: "Original",
                    value: langName(selected.sourceLanguage),
                  },
                  {
                    icon: Globe,
                    label: "Translated",
                    value: langName(selected.targetLanguage),
                  },
                  {
                    icon: Mic2,
                    label: "Voice",
                    value: voiceName(selected.voice),
                  },
                ]}
              />
              <RightPanelCard title="Audio preview">
                {selected.audioUrl && selected.status === "completed" ? (
                  <>
                    <audio
                      key={selected.id}
                      ref={audioRef}
                      src={selected.audioUrl}
                      controls
                      preload="metadata"
                      aria-label={"Audio for " + selected.title}
                      onError={() =>
                        setAudioError(
                          "This audio could not be loaded. Refresh your outputs and try again.",
                        )
                      }
                    />
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <label
                        htmlFor="playback-speed"
                        className="text-xs text-muted-foreground"
                      >
                        Playback speed
                      </label>
                      <select
                        id="playback-speed"
                        defaultValue="1"
                        key={selected.id}
                        className="rounded-lg border border-border bg-card px-2 py-1 text-sm"
                        onChange={(e) => {
                          if (audioRef.current)
                            audioRef.current.playbackRate = Number(
                              e.target.value,
                            );
                        }}
                      >
                        {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                          <option key={rate} value={rate}>
                            {rate}x
                          </option>
                        ))}
                      </select>
                    </div>
                    {audioError && (
                      <p role="alert" className="mt-3 text-sm text-destructive">
                        {audioError}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Audio is not available for this output. Create a new dub to
                    try again.
                  </p>
                )}
              </RightPanelCard>
              <section className="border-t border-border pt-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Export audio</h2>
                  <span className="text-xs text-muted-foreground">
                    MP3 format
                  </span>
                </div>
                <Button
                  className="w-full"
                  onClick={() => download(selected)}
                  disabled={
                    selected.status !== "completed" || !selected.audioUrl
                  }
                >
                  <Download data-icon="inline-start" />
                  Download MP3
                </Button>
              </section>
              <TranscriptSnippetCard
                original={selected.originalTranscript || ""}
                translated={selected.translatedText || ""}
                originalLabel={
                  "Original (" + langName(selected.sourceLanguage) + ")"
                }
                translatedLabel={
                  "Translated (" + langName(selected.targetLanguage) + ")"
                }
              />
            </>
          ) : (
            <div className="flex min-h-60 flex-col items-center justify-center gap-3 text-center">
              <ListMusic className="size-7 text-muted-foreground" />
              <h2 className="text-sm font-medium">A home for your audio</h2>
              <p className="max-w-60 text-sm text-muted-foreground">
                Create a dub, then select it here to listen and download.
              </p>
            </div>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
