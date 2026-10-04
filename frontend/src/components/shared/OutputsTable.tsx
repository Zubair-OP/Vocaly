import { type ReactNode } from "react"
import { Download, ListMusic, MoreHorizontal, Play, Plus, Youtube, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "./StatusBadge"
import { fmtDate, langLabel, thumbUrl } from "@/lib/format"
import type { OutputItem } from "@/lib/api"

const COLS = {
  title: "w-[34%] pl-5",
  languages: "w-[22%]",
  duration: "w-[84px]",
  status: "w-[104px]",
  created: "w-[124px]",
  actions: "w-[92px] pr-5",
} as const

interface OutputsTableProps {
  outputs: OutputItem[]
  selectedId: string | null
  loading?: boolean
  error?: string
  onSelect: (output: OutputItem) => void
  onPlay: (output: OutputItem) => void
  onDownload: (output: OutputItem) => void
  onRetry?: () => void
  /** Rendered inside the empty state (e.g. a "Create a Dub" link). */
  emptyAction?: ReactNode
  className?: string
}

/**
 * Shared outputs list: header, loading skeleton, error, empty state, and rows.
 * Used by the Outputs screen so table markup lives in exactly one place.
 */
export function OutputsTable({
  outputs,
  selectedId,
  loading = false,
  error,
  onSelect,
  onPlay,
  onDownload,
  onRetry,
  emptyAction,
  className,
}: OutputsTableProps) {
  if (loading) {
    return (
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={COLS.title}>Title</TableHead>
            <TableHead className={COLS.languages}>Languages</TableHead>
            <TableHead className={COLS.duration}>Duration</TableHead>
            <TableHead className={COLS.status}>Status</TableHead>
            <TableHead className={COLS.created}>Created</TableHead>
            <TableHead className={cn(COLS.actions, "text-right")}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 4 }).map((_, i) => (
            <TableRow key={i} className="hover:bg-transparent">
              <TableCell className="rounded-l-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-14 flex-shrink-0 rounded-lg" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-28" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-10" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="ml-auto h-7 w-24 rounded-lg" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <AlertCircle className="h-5 w-5 text-red-500" />
        </div>
        <p className="max-w-sm text-sm text-[#64748B]">{error}</p>
        {onRetry && (
          <Button
            variant="outline"
            className="rounded-xl border-[#E5EAF2] text-[#64748B]"
            onClick={onRetry}
          >
            Try again
          </Button>
        )}
      </div>
    )
  }

  if (outputs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F5F9]">
          <ListMusic className="h-5 w-5 text-[#94A3B8]" />
        </div>
        <p className="text-sm text-[#94A3B8]">No outputs yet.</p>
        {emptyAction}
      </div>
    )
  }

  return (
    <Table className={cn("table-fixed", className)}>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={COLS.title}>Title</TableHead>
          <TableHead className={COLS.languages}>Languages</TableHead>
          <TableHead className={COLS.duration}>Duration</TableHead>
          <TableHead className={COLS.status}>Status</TableHead>
          <TableHead className={COLS.created}>Created</TableHead>
          <TableHead className={cn(COLS.actions, "text-right")}>Actions</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {outputs.map((output) => {
          const isSelected = output.id === selectedId
          const src = thumbUrl(output.videoId)

          return (
            <TableRow
              key={output.id}
              data-selected={isSelected}
              onClick={() => onSelect(output)}
              className={cn("cursor-pointer", isSelected && "hover:bg-[#EAF6FF]")}
            >
              <TableCell
                className={cn(
                  "relative rounded-l-lg",
                  isSelected &&
                    "before:absolute before:left-0 before:top-0 before:h-full before:w-[2px] before:bg-[#1D9BF0]"
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-9 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-[#EEF7FF]">
                    {src ? (
                      <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Youtube className="h-4 w-4 text-[#1D9BF0]" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium leading-snug text-[#0F172A]">
                      {output.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[#94A3B8]">YouTube Video</p>
                  </div>
                </div>
              </TableCell>

              <TableCell className="text-xs text-[#64748B]">
                <span className="truncate">{langLabel(output.sourceLanguage)}</span>
                <span className="mx-1.5 text-[#CBD5E1]">→</span>
                <span className="truncate">{langLabel(output.targetLanguage)}</span>
              </TableCell>

              <TableCell className="text-xs text-[#64748B]">—</TableCell>

              <TableCell>
                <StatusBadge status={output.status} />
              </TableCell>

              <TableCell className="text-xs text-[#94A3B8]">{fmtDate(output.createdAt)}</TableCell>

              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    aria-label="Play"
                    onClick={(e) => {
                      e.stopPropagation()
                      onPlay(output)
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[#64748B] transition-all duration-200 hover:bg-[#EEF7FF] hover:text-[#1D9BF0]"
                  >
                    <Play className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Download"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDownload(output)
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[#64748B] transition-all duration-200 hover:bg-[#EEF7FF] hover:text-[#1D9BF0]"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="More actions"
                    onClick={(e) => e.stopPropagation()}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[#94A3B8] transition-all duration-200 hover:bg-[#F1F5F9] hover:text-[#64748B]"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

/** Small `+ New Dub` style action used above tables and in empty states. */
export function CreateDubButton({ children }: { children?: ReactNode }) {
  return (
    <Button className="h-10 rounded-xl bg-[#1D9BF0] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#178BFF]">
      <Plus className="mr-2 h-4 w-4" />
      {children ?? "New Dub"}
    </Button>
  )
}
