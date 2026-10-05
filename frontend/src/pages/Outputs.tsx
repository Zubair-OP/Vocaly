import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  RefreshCw,
  Search,
  AudioLines,
  FileText,
  ArrowRight,
  Download,
  Plus,
} from "lucide-react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { OutputTranscript } from "@/components/OutputTranscript";
import { VideoThumbnail } from "@/components/shared/VideoThumbnail";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTitleBlock } from "@/components/shared/PageTitleBlock";
import { OutputsTable } from "@/components/shared/OutputsTable";
import { fetchOutputs, type OutputItem } from "@/lib/api";
import { fmtDate, langName, narrationName, voiceName } from "@/lib/format";

export function Outputs() {
  const [params, setParams] = useSearchParams();
  const [outputs, setOutputs] = useState<OutputItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("library");
  const [tab, setTab] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(params.get("id"));
  const [page, setPage] = useState(1);
  const [playRequest, setPlayRequest] = useState(0);
  const [playTarget, setPlayTarget] = useState<string | null>(null);
  const detailRef = useRef<HTMLElement>(null);
  const search = params.get("q") || "";
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchOutputs();
      setOutputs(data);
      if (!data.length) setView("library");
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
  const select = (output: OutputItem) => {
    setPlayTarget(null);
    setSelectedId(output.id);
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("id", output.id);
      return next;
    }, { replace: true });
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
      "vocally_" + output.videoId + "_" + output.targetLanguage + (output.audioUrl.endsWith(".wav") ? ".wav" : ".mp3");
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
          setPlayTarget(output.id);
          setPlayRequest((n) => n + 1);
        }}
        onDownload={download}
        onRetry={load}
        emptyAction={
          search || tab !== "all" ? (
            <Button
              variant="outline"
              onClick={() => {
                setParams((current) => { const next = new URLSearchParams(current); next.delete("q"); return next; });
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
      <div className="studio-page outputs-page">
        <div className="workspace-main flex flex-col gap-6">
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

          {loading && !selected ? (
            <div className="listening-shell" aria-label="Loading audio player"><div className="listening-card flex flex-col gap-4"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-12 w-full" /></div></div>
          ) : selected ? (
            <section ref={detailRef} className="listening-shell" aria-label="Selected audio">
              <div className="listening-card">
                <div className="listening-heading">
                  <div className="listening-art"><VideoThumbnail videoId={selected.videoId} /></div>
                  <div className="min-w-0 flex-1">
                    <span className="studio-eyebrow">{selected.status === "completed" ? "READY TO LISTEN" : "GENERATION FAILED"}</span>
                    <h2 className="listening-title">{selected.title}</h2>
                    <div className="listening-meta">
                      <span>{langName(selected.sourceLanguage)} <ArrowRight aria-hidden="true" className="size-3" /> {langName(selected.targetLanguage)}</span>
                      <span>{voiceName(selected.voice)}</span>
                      <span>{selected.speechMode === "reference" ? "Reference voice" : narrationName(selected.narrationStyle)}</span>
                      <span>{fmtDate(selected.createdAt)}</span>
                    </div>
                  </div>
                  <Button onClick={() => download(selected)} disabled={selected.status !== "completed" || !selected.audioUrl} className="player-download">
                    <Download data-icon="inline-start" /> Download {selected.audioUrl.endsWith(".wav") ? "WAV" : "MP3"}
                  </Button>
                </div>
                {selected.audioUrl && selected.status === "completed" ? (
                  <div className="mt-5">
                    <AudioPlayer key={selected.id} src={selected.audioUrl} label={"Audio for " + selected.title}
                      playRequest={playTarget === selected.id ? playRequest : 0} />
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">Audio is not available for this output. <Link className="font-medium text-primary underline underline-offset-4" to="/">Create a new dub</Link> to try again.</p>
                )}
              </div>
            </section>
          ) : null}

          <Tabs value={view} onValueChange={setView} className="output-workspace">
            <div className="output-workspace-heading">
              <TabsList aria-label="Output workspace">
                <TabsTrigger value="library"><AudioLines className="size-4" /> Audio library</TabsTrigger>
                <TabsTrigger value="transcript" disabled={!selected}><FileText className="size-4" /> Transcript</TabsTrigger>
              </TabsList>
              <span className="hidden text-xs text-muted-foreground sm:block">{view === "library" ? "Select a dub to listen, read, or download." : "Read in your original or translated language."}</span>
            </div>
            <TabsContent value="library">
          <section className="min-w-0 overflow-hidden" aria-label="Audio library">
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
                      setParams((current) => {
                        const next = new URLSearchParams(current);
                        if (e.target.value) next.set("q", e.target.value);
                        else next.delete("q");
                        return next;
                      }, { replace: true })
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
            </TabsContent>
            <TabsContent value="transcript">
              {selected && <OutputTranscript key={selected.id} output={selected} />}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  );
}
