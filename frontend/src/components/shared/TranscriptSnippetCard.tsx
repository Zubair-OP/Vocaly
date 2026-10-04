import { cn } from "@/lib/utils"

interface TranscriptSnippetCardProps {
  original: string
  translated: string
  originalLabel: string
  translatedLabel: string
  className?: string
}

/** Shared side-by-side original / translated snippet block. */
export function TranscriptSnippetCard({
  original,
  translated,
  originalLabel,
  translatedLabel,
  className,
}: TranscriptSnippetCardProps) {
  return (
    <section className={className}>
      <h4 className="mb-3 text-[15px] font-semibold tracking-tight text-foreground">
        Transcript Snippet
      </h4>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            {originalLabel}
          </p>
          <p className="line-clamp-5 text-sm leading-relaxed text-muted-foreground">
            {original || "—"}
          </p>
        </div>

        <div className="rounded-xl border border-[#D8EBFF] bg-accent p-3">
          <p className="mb-2 text-xs font-medium text-accent-foreground/70">
            {translatedLabel}
          </p>
          <p className="line-clamp-5 text-sm leading-relaxed text-muted-foreground" dir="auto">
            {translated || "—"}
          </p>
        </div>
      </div>
    </section>
  )
}
