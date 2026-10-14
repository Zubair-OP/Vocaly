import { Download, Sparkles } from "lucide-react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Button } from "@/components/ui/button";
import type { OutputItem } from "@/lib/api";
import { langName } from "@/lib/format";

export function OutputSummary({ output }: { output: OutputItem }) {
  const audioUrl = output.summaryAudioUrl ?? "";
  const format = audioUrl.endsWith(".wav") ? "wav" : "mp3";

  const download = () => {
    if (!audioUrl) return;
    const link = document.createElement("a");
    link.href = audioUrl;
    link.download = `vocally_${output.videoId}_${output.targetLanguage}_summary.${format}`;
    link.click();
  };

  return (
    <section className="transcript-workspace" aria-label="Audio summary">
      <div className="transcript-toolbar">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold"><Sparkles className="size-4" /> One minute summary</h2>
          <p className="mt-1 text-xs text-muted-foreground">Key points from this video in {langName(output.targetLanguage)}.</p>
        </div>
        <Button variant="outline" onClick={download} disabled={!audioUrl}>
          <Download data-icon="inline-start" /> Download summary {format.toUpperCase()}
        </Button>
      </div>
      {audioUrl && <div className="mb-5"><AudioPlayer src={audioUrl} label={`Summary audio for ${output.title}`} /></div>}
      <section className="transcript-document" aria-label="Summary text">
        <h3 className="studio-eyebrow">Summary</h3>
        <div className="transcript-reading" tabIndex={0} role="region" aria-label="Summary text">
          <p dir="auto" lang={output.targetLanguage}>{output.summaryText || "No summary is available for this output."}</p>
        </div>
      </section>
    </section>
  );
}
