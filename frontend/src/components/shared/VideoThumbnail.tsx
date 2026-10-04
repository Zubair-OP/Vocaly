import { useState } from "react";
import { Youtube } from "lucide-react";
import { thumbUrl } from "@/lib/format";
/** Decorative list thumbnail; the adjacent title provides its accessible name. */
export function VideoThumbnail({ videoId }: { videoId?: string | null }) {
  const src = thumbUrl(videoId);
  const [failed, setFailed] = useState<string>();
  return src && failed !== src ? (
    <img
      src={src}
      alt=""
      className="size-full object-cover"
      loading="lazy"
      onError={() => setFailed(src)}
    />
  ) : (
    <span className="flex size-full items-center justify-center">
      <Youtube className="size-4 text-accent-foreground" aria-hidden="true" />
    </span>
  );
}
