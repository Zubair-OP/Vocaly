import { useState, type ReactNode } from "react";
import { Youtube } from "lucide-react";
import { cn } from "@/lib/utils";
import { thumbUrl } from "@/lib/format";

interface YouTubeVideoPreviewCardProps {
  videoId?: string | null;
  title: string;
  subtitle?: ReactNode;
  meta?: ReactNode;
  /** Small overlay badge on the thumbnail (e.g. "Preview"). */
  thumbnailBadge?: ReactNode;
  /** Drop the card chrome for flush placement inside a panel. */
  bordered?: boolean;
  className?: string;
  bodyClassName?: string;
}

/** Shared YouTube thumbnail + title block used in the right panels. */
export function YouTubeVideoPreviewCard({
  videoId,
  title,
  subtitle,
  meta,
  thumbnailBadge,
  bordered = true,
  className,
  bodyClassName,
}: YouTubeVideoPreviewCardProps) {
  const src = thumbUrl(videoId);
  const [failedSource, setFailedSource] = useState<string | undefined>();

  return (
    <article
      className={cn(
        "overflow-hidden bg-white transition-shadow duration-200",
        bordered &&
          "rounded-2xl border border-border shadow-sm hover:shadow-[0_2px_10px_rgba(15,23,42,0.05)]",
        className,
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-accent">
        {src && failedSource !== src ? (
          <img
            src={src}
            alt={title || "Video thumbnail"}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
            loading="lazy"
            onError={() => setFailedSource(src)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Youtube className="h-8 w-8" />
            <p className="text-xs">
              {src
                ? "Video thumbnail unavailable"
                : "Paste a YouTube URL to preview"}
            </p>
          </div>
        )}

        {thumbnailBadge && (
          <div className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {thumbnailBadge}
          </div>
        )}
      </div>

      {(title || subtitle || meta) && (
        <div className={cn("p-4", bodyClassName)}>
          <p className="text-sm font-semibold leading-snug text-foreground">
            {title || "—"}
          </p>
          {subtitle && (
            <div className="mt-1.5 text-xs text-muted-foreground">
              {subtitle}
            </div>
          )}
          {meta && (
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              {meta}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
