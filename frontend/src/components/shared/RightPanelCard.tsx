import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface RightPanelCardProps {
  title?: string
  action?: ReactNode
  children: ReactNode
  /** Remove the default body padding (for flush media blocks). */
  flush?: boolean
  /** Soft `#F8FAFC` surface instead of white. */
  muted?: boolean
  className?: string
  bodyClassName?: string
}

/**
 * Shared card shell used inside the right-hand summary panels so every
 * panel section uses the same radius, border, header, and spacing.
 */
export function RightPanelCard({
  title,
  action,
  children,
  flush = false,
  muted = false,
  className,
  bodyClassName,
}: RightPanelCardProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-[#E5EAF2] shadow-sm transition-shadow duration-200 hover:shadow-[0_2px_10px_rgba(15,23,42,0.05)]",
        muted ? "bg-[#F8FAFC]" : "bg-white",
        className
      )}
    >
      {(title || action) && (
        <header
          className={cn(
            "flex items-center justify-between gap-3",
            flush ? "px-5 pt-4" : "border-b border-[#EDF2F7] px-5 py-4"
          )}
        >
          <h3 className="text-[15px] font-semibold tracking-tight text-[#0F172A]">{title}</h3>
          {action}
        </header>
      )}

      <div className={cn(flush ? "" : "p-5", bodyClassName)}>{children}</div>
    </section>
  )
}
