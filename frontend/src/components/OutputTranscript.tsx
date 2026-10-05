import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { langName } from "@/lib/format";
import type { OutputItem } from "@/lib/api";

function TranscriptText({ title, text, language }: {
  title: string;
  text: string;
  language: string;
}) {
  return (
    <section className="transcript-document" aria-label={title}>
      <h3 className="studio-eyebrow">{title}</h3>
      <div className="transcript-reading" tabIndex={0} role="region" aria-label={title + " text"}>
        <p dir="auto" lang={language}>{text || "No transcript is available for this output."}</p>
      </div>
    </section>
  );
}

export function OutputTranscript({ output }: { output: OutputItem }) {
  const original = <TranscriptText title={"Original · " + langName(output.sourceLanguage)} text={output.originalTranscript} language={output.sourceLanguage} />;
  const translation = <TranscriptText title={"Translation · " + langName(output.targetLanguage)} text={output.translatedText} language={output.targetLanguage} />;

  return (
    <Tabs defaultValue="translation" className="transcript-workspace">
      <div className="transcript-toolbar">
        <div>
          <h2 className="text-base font-semibold">Read along</h2>
          <p className="mt-1 text-xs text-muted-foreground">The full transcript, with your audio always close by.</p>
        </div>
        <TabsList aria-label="Transcript view">
          <TabsTrigger value="translation">Translation</TabsTrigger>
          <TabsTrigger value="original">Original</TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="translation">{translation}</TabsContent>
      <TabsContent value="original">{original}</TabsContent>
      <TabsContent value="compare"><div className="transcript-comparison">{original}{translation}</div></TabsContent>
    </Tabs>
  );
}
