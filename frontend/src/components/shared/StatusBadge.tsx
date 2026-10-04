import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export type OutputStatus = "completed" | "processing" | "error"

const STATUS_STYLES: Record<
  OutputStatus,
  { variant: "success" | "processing" | "destructive"; label: string }
> = {
  completed: { variant: "success", label: "Ready" },
  processing: { variant: "processing", label: "Processing" },
  error: { variant: "destructive", label: "Failed" },
}

interface StatusBadgeProps {
  status: string
  /** Override the default wording (e.g. "Ready"). */
  label?: string
  className?: string
}

/** The one place status → colour/label mapping lives. */
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const style =
    STATUS_STYLES[status as OutputStatus] ?? STATUS_STYLES.processing

  return (
    <Badge variant={style.variant} className={cn("font-medium", className)}>
      {label ?? style.label}
    </Badge>
  )
}
