import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

interface ExportOptionsCardProps {
  title?: string
  formats: readonly string[]
  value: string
  onChange: (format: string) => void
  onDownload: () => void
  disabled?: boolean
  children?: ReactNode
  className?: string
}

/** Shared export format selector + primary download CTA. */
export function ExportOptionsCard({
  title = "Export Options",
  formats,
  value,
  onChange,
  onDownload,
  disabled = false,
  children,
  className,
}: ExportOptionsCardProps) {
  return (
    <section className={className}>
      <h4 className="mb-3 text-[15px] font-semibold tracking-tight text-[#0F172A]">{title}</h4>

      <div className="mb-4 flex gap-2">
        {formats.map((format) => {
          const isActive = format.toLowerCase() === value.toLowerCase()
          return (
            <button
              key={format}
              type="button"
              onClick={() => onChange(format)}
              aria-pressed={isActive}
              className={cn(
                "flex-1 rounded-xl border py-2 text-xs font-semibold uppercase tracking-wide transition-all duration-200",
                isActive
                  ? "border-[#1D9BF0] bg-[#EEF7FF] text-[#1D9BF0] shadow-[0_0_0_3px_rgba(29,155,240,0.10)]"
                  : "border-[#E5EAF2] bg-white text-[#64748B] hover:border-[#D7E3F2] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
              )}
            >
              {format}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onDownload}
        disabled={disabled}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1D9BF0] text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#178BFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9BF0]/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Download {value.toUpperCase()}
      </button>

      {children && (
        <>
          <Separator className="my-5" />
          {children}
        </>
      )}
    </section>
  )
}
