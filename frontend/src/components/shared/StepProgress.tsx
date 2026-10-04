import { Check, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export interface ProgressStep {
  id: string
  label: string
}

interface StepProgressProps {
  steps: ProgressStep[]
  /** Index of the step currently running; every lower index counts as done. */
  activeIndex: number
  /** All steps finished — everything renders green. */
  complete?: boolean
  className?: string
}

/**
 * Horizontal pipeline stepper: a blue progress bar on top, then one node per
 * step (numbered → spinner → green check) with a connector rail between them.
 * Built on the shadcn `Progress` primitive.
 */
export function StepProgress({
  steps,
  activeIndex,
  complete = false,
  className,
}: StepProgressProps) {
  const total = steps.length
  const finished = (index: number) => complete || index < activeIndex
  const isActive = (index: number) => !complete && index === activeIndex

  const percent = complete
    ? 100
    : activeIndex < 0
      ? 0
      : Math.min(96, Math.round(((activeIndex + 0.55) / total) * 100))

  return (
    <div className={cn("animate-fade-in-up", className)}>
      <Progress value={percent} className="h-1.5 bg-[#E5EAF2]" />

      <div
        className="mt-4 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
      >
        {steps.map((step, i) => {
          const done = finished(i)
          const active = isActive(i)

          return (
            <div key={step.id} className="relative flex flex-col items-center gap-2 text-center">
              {/* Connector rail (skipped on the last step) */}
              {i < total - 1 && (
                <span
                  className="absolute left-1/2 top-[15px] h-0.5 w-full transition-colors duration-500"
                  style={{ backgroundColor: finished(i) ? "#16A34A" : "#E5EAF2" }}
                />
              )}

              <span
                className={cn(
                  "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-all duration-300",
                  done
                    ? "border-[#16A34A] bg-[#16A34A] text-white"
                    : active
                      ? "border-[#1D9BF0] bg-accent text-accent-foreground shadow-[0_0_0_4px_rgba(29,155,240,0.12)]"
                      : "border-border bg-white text-muted-foreground"
                )}
                aria-current={active ? "step" : undefined}
              >
                {done ? (
                  <Check className="h-4 w-4" />
                ) : active ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  i + 1
                )}
              </span>

              <span
                className={cn(
                  "text-xs font-medium transition-colors duration-300",
                  done ? "text-foreground" : active ? "text-accent-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
