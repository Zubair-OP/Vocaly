import { cn } from "@/lib/utils"

interface CircularProgressCardProps {
  /** 0 → 100 */
  value: number
  label?: string
  sub?: string
  size?: number
  className?: string
}

/**
 * Shared centrepiece card for the processing screen: a large blue progress
 * ring with the percentage and status text centred inside it.
 */
export function CircularProgressCard({
  value,
  label = "Processing...",
  sub,
  size = 180,
  className,
}: CircularProgressCardProps) {
  const radius = size / 2 - 14
  const thickness = 12
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(100, Math.max(0, value))
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-2xl border border-border bg-white p-6 shadow-sm",
        className
      )}
    >
      <div className="relative flex h-[180px] w-[180px] items-center justify-center">
        <svg
          width={size}
          height={size}
          className="-rotate-90"
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`${Math.round(clamped)} percent ${label}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#EEF5FF"
            strokeWidth={thickness}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1D9BF0"
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tracking-tight text-foreground">
            {Math.round(clamped)}%
          </span>
          <span className="mt-0.5 text-xs text-muted-foreground">{label}</span>
          {sub && <span className="mt-1 text-[10px] text-[#CBD5E1]">{sub}</span>}
        </div>
      </div>
    </div>
  )
}
