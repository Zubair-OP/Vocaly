import { type ReactNode } from "react"
import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { RightPanelCard } from "./RightPanelCard"

export interface SummaryItem {
  icon: LucideIcon
  label: string
  value: ReactNode
}

interface SummaryRowProps {
  icon: LucideIcon
  label: string
  value: ReactNode
  className?: string
}

/** Icon chip + fixed-width label + value — the shared summary row. */
export function SummaryRow({ icon: Icon, label, value, className }: SummaryRowProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-background">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </span>
      <span className="w-[74px] flex-shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 break-words text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

interface ProjectSummaryPanelProps {
  title: string
  items: SummaryItem[]
  className?: string
  bodyClassName?: string
}

/** Shared summary card used by the right panels of every screen. */
export function ProjectSummaryPanel({
  title,
  items,
  className,
  bodyClassName,
}: ProjectSummaryPanelProps) {
  return (
    <RightPanelCard title={title} className={className} bodyClassName={bodyClassName}>
      <div className="flex flex-col gap-3.5">
        {items.map((item) => (
          <SummaryRow key={item.label} icon={item.icon} label={item.label} value={item.value} />
        ))}
      </div>
    </RightPanelCard>
  )
}
