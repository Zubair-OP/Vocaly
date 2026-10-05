import { Check, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface ProgressStep {
  id: string;
  label: string;
}

interface StepProgressProps {
  steps: ProgressStep[];
  activeIndex: number;
  complete?: boolean;
  status?: string;
  className?: string;
}

/** Completed requests fill their segment; a running request stays indeterminate. */
export function StepProgress({ steps, activeIndex, complete = false, status, className }: StepProgressProps) {
  return (
    <div className={cn("generation-progress", className)}>
      <div className="generation-progress-heading" role="status" aria-live="polite" aria-atomic="true">
        {complete ? <Check className="size-4 text-primary" aria-hidden="true" /> : <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />}
        <span>{status || (complete ? "Your audio is ready" : "Creating your dub")}</span>
      </div>
      <ol className="generation-segments" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((step, index) => {
          const done = complete || index < activeIndex;
          const active = !complete && index === activeIndex;
          const state = done ? "Complete" : active ? "In progress" : "Waiting";
          return (
            <li key={step.id} data-active={active} data-complete={done} aria-current={active ? "step" : undefined}>
              <Progress value={done ? 100 : active ? null : 0} aria-label={step.label} aria-valuetext={state} />
              <div className="generation-segment-label">
                <span>{step.label}</span>
                <span className="generation-segment-state">{done ? <Check className="size-3.5" aria-label="Complete" /> : String(index + 1).padStart(2, "0")}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
