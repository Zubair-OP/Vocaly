import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AudioLines, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTitleBlock } from "@/components/shared/PageTitleBlock";
import { StepProgress } from "@/components/shared/StepProgress";
import { fetchOutput, type OutputItem } from "@/lib/api";
import { langName, voiceName } from "@/lib/format";

export function GeneratingAudio() {
  const { id } = useParams();
  const [output, setOutput] = useState<OutputItem | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    fetchOutput(id)
      .then((data) => {
        if (active) setOutput(data);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, retry]);
  return (
    <AppShell>
      <div className="studio-page create-page">
        <div className="workspace-main flex flex-col gap-7">
          <PageTitleBlock
            title={
              output?.status === "completed"
                ? "Your audio is ready"
                : "Dub status"
            }
            subtitle="Follow your dub from source video to translated audio."
            backAction={
              <Button variant="link" asChild className="mb-4 px-0">
                <Link to="/new">Back to new dub</Link>
              </Button>
            }
          />
          <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            {loading ? (
              <div
                className="flex flex-col gap-5"
                aria-label="Loading dub status"
              >
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-start gap-4" role="alert">
                <h2 className="text-lg font-semibold">
                  We could not find this dub
                </h2>
                <p className="text-sm text-muted-foreground">
                  The output may be unavailable, or the connection was
                  interrupted.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setRetry((n) => n + 1)}
                >
                  Try again
                </Button>
              </div>
            ) : output ? (
              <div className="flex flex-col gap-6">
                <h2 className="text-lg font-semibold">{output.title}</h2>
                <p className="text-sm text-muted-foreground">{langName(output.sourceLanguage)} ? {langName(output.targetLanguage)} ? {voiceName(output.voice)}</p>
                {output.status === "completed" ? (
                  <>
                    <StepProgress
                      steps={[
                        { id: "transcript", label: "Transcript fetched" },
                        { id: "translation", label: "Text translated" },
                        { id: "audio", label: "Audio generated" },
                      ]}
                      activeIndex={2}
                      complete
                    />
                    <Button asChild className="self-start">
                      <Link to={"/outputs?id=" + output.id}>
                        Listen to your dub
                        <ArrowRight />
                      </Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      This dub could not be completed. Create a new dub to try
                      again.
                    </p>
                    <Button asChild className="self-start">
                      <Link to="/new">Create a new dub</Link>
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-start gap-4">
                <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <AudioLines />
                </span>
                <h2 className="text-lg font-semibold">Start with a video</h2>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                  Add a YouTube link and choose a language. Generation progress
                  appears directly in your new dub while the audio is created.
                </p>
                <Button asChild>
                  <Link to="/new">
                    Create a dub
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            )}
          </section>
        </div>

      </div>
    </AppShell>
  );
}
