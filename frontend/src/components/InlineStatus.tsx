import { Spinner } from "@/components/ui/spinner"
import { CheckCircle2 } from "lucide-react"

export type ProcessingStep = 'idle' | 'fetching' | 'translating' | 'generating' | 'completed' | 'error'

interface InlineStatusProps {
  step: ProcessingStep
  errorMessage?: string
}

const STEP_LABELS: Record<ProcessingStep, string> = {
  idle: '',
  fetching: 'Fetching transcript…',
  translating: 'Translating…',
  generating: 'Generating audio…',
  completed: 'Done!',
  error: 'Something went wrong.',
}

const STEPS_ORDER: ProcessingStep[] = ['fetching', 'translating', 'generating']

export function InlineStatus({ step, errorMessage }: InlineStatusProps) {
  if (step === 'idle') return null

  return (
    <div className="animate-fade-in mt-6 space-y-3">
      {STEPS_ORDER.map((s) => {
        const isActive = s === step
        const isDone = STEPS_ORDER.indexOf(s) < STEPS_ORDER.indexOf(step) || step === 'completed'
        const isPending = STEPS_ORDER.indexOf(s) > STEPS_ORDER.indexOf(step) && step !== 'completed' && step !== 'error'

        return (
          <div
            key={s}
            className={`flex items-center gap-3 text-sm transition-opacity duration-300 ${
              isPending ? 'opacity-30' : 'opacity-100'
            }`}
          >
            {isDone ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            ) : isActive ? (
              <Spinner size={16} />
            ) : (
              <div className="h-4 w-4 rounded-full border border-border shrink-0" />
            )}
            <span className={isDone ? 'text-muted-foreground line-through' : isActive ? 'font-medium text-foreground' : 'text-muted-foreground'}>
              {STEP_LABELS[s]}
            </span>
          </div>
        )
      })}

      {step === 'error' && errorMessage && (
        <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}
    </div>
  )
}
