import { useQuery } from "@tanstack/react-query";

export const audioDurationKey = (src: string) => ["audio-duration", src];

/** Read real media metadata; older saved outputs do not include a duration. */
export function useAudioDuration(src: string) {
  return useQuery({
    queryKey: audioDurationKey(src),
    enabled: Boolean(src),
    staleTime: Infinity,
    retry: false,
    queryFn: ({ signal }) => new Promise<number>((resolve, reject) => {
      const audio = new Audio();
      const cleanup = () => {
        clearTimeout(timeout);
        audio.onloadedmetadata = null; audio.ondurationchange = null; audio.onerror = null;
        signal.removeEventListener("abort", cancel);
        audio.removeAttribute("src"); audio.load();
      };
      const fail = () => { cleanup(); reject(new Error("Duration unavailable")); };
      const cancel = () => { cleanup(); reject(new DOMException("Aborted", "AbortError")); };
      const ready = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          const duration = audio.duration; cleanup(); resolve(duration);
        }
      };
      const timeout = setTimeout(fail, 12_000);
      audio.preload = "metadata";
      audio.onloadedmetadata = ready; audio.ondurationchange = ready; audio.onerror = fail;
      signal.addEventListener("abort", cancel, { once: true });
      if (signal.aborted) { cancel(); return; }
      audio.src = src;
    }),
  });
}
