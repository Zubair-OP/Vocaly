import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatMiniCardProps {
  icon: LucideIcon
  label: string
  value: string
  color?: string
  iconColor?: string
  className?: string
}

/** Compact icon + label + value card used for quick at-a-glance stats. */
export function StatMiniCard({
  icon: Icon,
  label,
  value,
  color = "rgb(var(--brand-soft))",
  iconColor = "rgb(var(--brand-text))",
  className,
}: StatMiniCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-border bg-white px-5 py-4 shadow-sm transition-shadow duration-200 hover:shadow-[0_2px_10px_rgba(15,23,42,0.05)]",
        className
      )}
    >
      <span
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: color }}
      >
        <Icon className="h-4 w-4" style={{ color: iconColor }} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-sm font-bold text-foreground">{value}</p>
      </div>
    </div>
  )
}
