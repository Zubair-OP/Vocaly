import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"

interface PageTitleBlockProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  backAction?: ReactNode
  className?: string
}

/**
 * Shared page heading — large confident title, soft gray subtitle,
 * optional back link on the left and action buttons on the right.
 */
export function PageTitleBlock({
  title,
  subtitle,
  actions,
  backAction,
  className,
}: PageTitleBlockProps) {
  return (
    <div className={cn("animate-fade-in", className)}>
      {backAction}
      <span className="studio-eyebrow mb-4 inline-flex">VOCALLY / AUDIO STUDIO</span>

      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0">
          <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.035em] text-foreground lg:text-[46px]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex flex-shrink-0 items-center gap-2 pt-1.5">{actions}</div>
        )}
      </div>
    </div>
  )
}

interface BackLinkProps {
  label?: string
  onClick: () => void
  className?: string
}

export function BackLink({ label = "Back", onClick, className }: BackLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mb-4 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-accent-foreground",
        className
      )}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  )
}
