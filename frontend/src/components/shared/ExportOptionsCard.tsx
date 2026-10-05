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
      <h4 className="mb-3 text-[15px] font-semibold tracking-tight text-foreground">{title}</h4>

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
                  ? "border-primary bg-accent text-accent-foreground ring-2 ring-primary/15"
                  : "border-border bg-white text-muted-foreground hover:border-[#D7E3F2] hover:bg-background hover:text-foreground"
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
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
