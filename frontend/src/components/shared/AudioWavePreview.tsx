import { cn } from "@/lib/utils"

interface AudioWavePreviewProps {
  /** Number of bars in the waveform. */
  bars?: number
  /** 0 → 1 fraction of bars highlighted in blue. */
  progress?: number
  /** Subtle looping motion — used while audio is generating. */
  animated?: boolean
  className?: string
}

function barHeight(index: number): number {
  return 10 + Math.abs(Math.sin(index * 0.55) * 12) + Math.abs(Math.cos(index * 0.31) * 5)
}

/**
 * Shared waveform visual used by the processing screen and the audio player.
 * Bar heights are deterministic so re-renders never flicker.
 */
export function AudioWavePreview({
  bars = 50,
  progress = 0.4,
  animated = false,
  className,
}: AudioWavePreviewProps) {
  const active = Math.round(bars * Math.min(1, Math.max(0, progress)))

  return (
    <div
      className={cn("flex h-8 w-full items-center gap-[2px] overflow-hidden", className)}
      aria-hidden="true"
    >
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] flex-shrink-0 rounded-full transition-colors duration-300",
            i < active ? "bg-primary" : "bg-[#E5EAF2]",
            animated && "animate-wave origin-center"
          )}
          style={{
            height: `${barHeight(i)}px`,
            animationDelay: animated ? `${(i % 12) * 90}ms` : undefined,
          }}
        />
      ))}
    </div>
  )
}
