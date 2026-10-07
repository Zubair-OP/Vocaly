import { audioTime } from "@/lib/audio-waveform";
import { useAudioDuration } from "@/lib/use-audio-duration";

export function AudioDuration({ src }: { src: string }) {
  const { data, isPending } = useAudioDuration(src);
  return <span className="tabular-nums" aria-label="Audio duration">{data ? audioTime(data) : src && isPending ? "Loading…" : "Unavailable"}</span>;
}
