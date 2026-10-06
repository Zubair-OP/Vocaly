import { VideoThumbnail } from "@/components/shared/VideoThumbnail";
import { type ReactNode } from "react";
import {
  Download,
  Trash2,
  ListMusic,
  Play,
  Plus,
  Youtube,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "./StatusBadge";
import { fmtDate, langName } from "@/lib/format";
import type { OutputItem } from "@/lib/api";

const COLS = {
  title: "w-[34%] pl-5",
  languages: "w-[22%]",
  duration: "w-[84px]",
  status: "w-[104px]",
  created: "w-[124px]",
  actions: "w-[140px] pr-5",
} as const;

interface OutputsTableProps {
  outputs: OutputItem[];
  selectedId: string | null;
  loading?: boolean;
  error?: string;
  onSelect: (output: OutputItem) => void;
  onPlay: (output: OutputItem) => void;
  onDownload: (output: OutputItem) => void;
  onDelete: (output: OutputItem) => void;
  deletingId?: string | null;
  onRetry?: () => void;
  /** Rendered inside the empty state (e.g. a "Create a Dub" link). */
  emptyAction?: ReactNode;
  className?: string;
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
  onDelete,
  deletingId,
  onRetry,
  emptyAction,
  className,
}: OutputsTableProps) {
  if (loading) {
    return (
      <>
        <div
          className="flex flex-col gap-4 p-5 lg:hidden"
          aria-label="Loading outputs"
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
        <div className="hidden lg:block">
          <Table
            aria-label="Loading outputs"
            className="table-fixed min-w-[680px]"
          >
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={COLS.title}>Title</TableHead>
                <TableHead className={COLS.languages}>Languages</TableHead>
                <TableHead className={COLS.duration}>Duration</TableHead>
                <TableHead className={COLS.status}>Status</TableHead>
                <TableHead className={COLS.created}>Created</TableHead>
                <TableHead className={cn(COLS.actions, "text-right")}>
                  Actions
                </TableHead>
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
        </div>
      </>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <AlertCircle className="h-5 w-5 text-red-500" />
        </div>
        <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
        {onRetry && (
          <Button
            variant="outline"
            className="rounded-xl border-border text-muted-foreground"
            onClick={onRetry}
          >
            Try again
          </Button>
        )}
      </div>
    );
  }

  if (outputs.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ListMusic />
          </EmptyMedia>
          <EmptyTitle>No outputs to show</EmptyTitle>
          <EmptyDescription>
            Create your first dub, or adjust your filters to find an existing
            output.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>{emptyAction}</EmptyContent>
      </Empty>
    );
  }

  return (
    <>
      <div className="flex flex-col divide-y divide-border lg:hidden">
        {outputs.map((output) => (
          <article
            key={output.id}
            className={cn(
              "flex flex-col gap-3 p-4",
              output.id === selectedId && "bg-accent",
            )}
          >
            <button
              className="text-left"
              onClick={() => onSelect(output)}
              aria-pressed={output.id === selectedId}
            >
              <span className="block text-sm font-medium">{output.title}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {langName(output.sourceLanguage)} &rarr;{" "}
                {langName(output.targetLanguage)}
              </span>
            </button>
            <div className="flex items-center justify-between gap-3">
              <StatusBadge status={output.status} />
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={"Play " + output.title}
                  disabled={!output.audioUrl || output.status !== "completed"}
                  onClick={() => onPlay(output)}
                >
                  <Play />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={"Download " + output.title}
                  disabled={!output.audioUrl || output.status !== "completed"}
                  onClick={() => onDownload(output)}
                >
                  <Download />
                </Button>
                <Button size="icon" variant="ghost" aria-label={"Delete " + output.title}
                  disabled={Boolean(deletingId)} onClick={() => onDelete(output)}>
                  <Trash2 />
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="hidden lg:block">
        <Table className={cn("table-fixed", className)}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={COLS.title}>Title</TableHead>
              <TableHead className={COLS.languages}>Languages</TableHead>
              <TableHead className={COLS.duration}>Duration</TableHead>
              <TableHead className={COLS.status}>Status</TableHead>
              <TableHead className={COLS.created}>Created</TableHead>
              <TableHead className={cn(COLS.actions, "text-right")}>
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {outputs.map((output) => {
              const isSelected = output.id === selectedId;

              return (
                <TableRow
                  key={output.id}
                  data-selected={isSelected}
                  onClick={() => onSelect(output)}
                  className={cn(
                    "cursor-pointer",
                    isSelected && "hover:bg-accent",
                  )}
                >
                  <TableCell
                    className={cn(
                      "relative rounded-l-lg",
                      isSelected &&
                        "before:absolute before:left-0 before:top-0 before:h-full before:w-[2px] before:bg-primary",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-9 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-accent">
                        <VideoThumbnail videoId={output.videoId} />
                      </div>
                      <div className="min-w-0">
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(output);
                          }}
                          className="block max-w-full truncate text-left text-sm font-medium leading-snug text-foreground hover:text-accent-foreground"
                        >
                          {output.title}
                        </button>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          YouTube Video
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground">
                    <span className="truncate">
                      {langName(output.sourceLanguage)}
                    </span>
                    <span className="mx-1.5 text-[#CBD5E1]">→</span>
                    <span className="truncate">
                      {langName(output.targetLanguage)}
                    </span>
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground">
                    —
                  </TableCell>

                  <TableCell>
                    <StatusBadge status={output.status} />
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground">
                    {fmtDate(output.createdAt)}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        aria-label={"Play " + output.title}
                        disabled={
                          !output.audioUrl || output.status !== "completed"
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlay(output);
                        }}
                        className="flex h-10 w-10 disabled:opacity-40 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={"Download " + output.title}
                        disabled={
                          !output.audioUrl || output.status !== "completed"
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload(output);
                        }}
                        className="flex h-10 w-10 disabled:opacity-40 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <Button size="icon" variant="ghost" aria-label={"Delete " + output.title}
                        disabled={Boolean(deletingId)} onClick={(e) => { e.stopPropagation(); onDelete(output); }}>
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

/** Small `+ New Dub` style action used above tables and in empty states. */
export function CreateDubButton({ children }: { children?: ReactNode }) {
  return (
    <Button className="h-10 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary-hover">
      <Plus className="mr-2 h-4 w-4" />
      {children ?? "New Dub"}
    </Button>
  );
}
