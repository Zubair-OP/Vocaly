import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface TimelineStep {
  id: string
  label: string
  sub?: string
  status: "done" | "active" | "pending"
  time?: string
}

export interface LogEntry {
  time: string
  message: string
  type: "info" | "success" | "active"
}

interface ProcessingTimelineProps {
  steps: TimelineStep[]
  className?: string
}

/** Shared step list: green checks, blue active spinner, muted upcoming steps. */
export function ProcessingTimeline({ steps, className }: ProcessingTimelineProps) {
  return (
    <div className={cn("space-y-0", className)}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1
        return (
          <div key={step.id} className="relative flex items-start gap-3 pb-5 last:pb-0">
            {!isLast && (
              <span
                className="absolute left-[11px] top-6 h-full w-0.5 transition-colors duration-300"
                style={{
                  backgroundColor: step.status === "done" ? "#16A34A" : "#E5EAF2",
                }}
              />
            )}

            <span className="mt-0.5 flex flex-shrink-0 items-center">
              {step.status === "done" ? (
                <CheckCircle2 className="h-[22px] w-[22px] text-[#16A34A]" />
              ) : step.status === "active" ? (
                <Loader2 className="h-[22px] w-[22px] animate-spin text-[#1D9BF0]" />
              ) : (
                <Circle className="h-[22px] w-[22px] text-[#CBD5E1]" />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p
                  className={cn(
                    "text-sm font-medium transition-colors",
                    step.status === "pending" ? "text-[#94A3B8]" : "text-[#0F172A]"
                  )}
                >
                  {step.label}
                </p>
                {step.time && <span className="text-xs text-[#94A3B8]">{step.time}</span>}
              </div>
              {step.sub && (
                <p className="mt-0.5 text-xs text-[#94A3B8] transition-colors">
                  {step.sub}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface ProcessingLogProps {
  entries: LogEntry[]
  className?: string
  maxHeight?: string
}

/** Shared chronological log with a subtle timeline rail. */
export function ProcessingLog({ entries, className, maxHeight = "h-64" }: ProcessingLogProps) {
  const dotColor = (type: LogEntry["type"]) =>
    type === "success" ? "#16A34A" : type === "active" ? "#1D9BF0" : "#94A3B8"

  return (
    <ScrollArea className={cn(maxHeight, className)}>
      <div className="relative space-y-0">
        <span className="absolute bottom-2 left-[5px] top-2 w-0.5 bg-[#E5EAF2]" />
        {entries.map((entry, i) => (
          <div key={`${entry.time}-${i}`} className="relative flex gap-3 pb-4 pl-5 last:pb-0">
            <span
              className="absolute left-0 top-[7px] h-2.5 w-2.5 flex-shrink-0 rounded-full border-2 border-white transition-colors"
              style={{ backgroundColor: dotColor(entry.type) }}
            />
            <div>
              <p className="text-[13px] font-medium text-[#0F172A]">{entry.message}</p>
              <p className="mt-0.5 font-mono text-[10px] text-[#94A3B8]">{entry.time}</p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
