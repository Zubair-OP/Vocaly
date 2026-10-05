import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(
  ({ className, value = 0, max = 100, ...props }, ref) => (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn("progress-track relative h-1 w-full overflow-hidden rounded-full bg-secondary", className)}
      value={value}
      max={max}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="progress-fill h-full w-full origin-left rounded-full bg-primary"
        style={{ transform: `scaleX(${value == null ? 0 : Math.min(1, Math.max(0, value / max))})` }}
      />
      <span className="progress-activity absolute inset-0 bg-primary" aria-hidden="true" />
    </ProgressPrimitive.Root>
  )
)
Progress.displayName = "Progress"

export { Progress }
