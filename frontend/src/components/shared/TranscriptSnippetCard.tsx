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
      <h4 className="mb-3 text-[15px] font-semibold tracking-tight text-[#0F172A]">
        Transcript Snippet
      </h4>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[#E5EAF2] bg-[#F8FAFC] p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
            {originalLabel}
          </p>
          <p className="line-clamp-5 text-xs leading-relaxed text-[#64748B]">
            {original || "—"}
          </p>
        </div>

        <div className="rounded-xl border border-[#D8EBFF] bg-[#EEF7FF] p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#1D9BF0]/70">
            {translatedLabel}
          </p>
          <p className="line-clamp-5 text-xs leading-relaxed text-[#64748B]" dir="auto">
            {translated || "—"}
          </p>
        </div>
      </div>
    </section>
  )
}
