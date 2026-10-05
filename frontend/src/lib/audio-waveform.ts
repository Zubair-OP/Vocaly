const PEAK_COUNT = 160;
const cache = new Map<string, Float32Array>();

/** Cache compact peaks, never decoded audio buffers. */
export async function loadWaveform(src: string, signal: AbortSignal) {
  const cached = cache.get(src);
  if (cached) return cached;
  const response = await fetch(src, { signal });
  if (!response.ok) throw new Error("Waveform unavailable");
  if (Number(response.headers.get("content-length")) > 25 * 1024 * 1024) {
    await response.body?.cancel();
    throw new Error("Use live waveform for large audio");
  }
  const bytes = await response.arrayBuffer();
  signal.throwIfAborted();
  const decoder = new OfflineAudioContext(1, 1, 22050);
  const audio = await decoder.decodeAudioData(bytes);
  signal.throwIfAborted();
  const peaks = new Float32Array(PEAK_COUNT);
  const block = Math.max(1, Math.floor(audio.length / PEAK_COUNT));
  for (let channel = 0; channel < audio.numberOfChannels; channel++) {
    const samples = audio.getChannelData(channel);
    for (let bar = 0; bar < PEAK_COUNT; bar++) {
      const end = Math.min(samples.length, (bar + 1) * block);
      const stride = Math.max(1, Math.floor(block / 512));
      let energy = 0;
      let count = 0;
      for (let index = bar * block; index < end; index += stride) {
        energy += samples[index] ** 2;
        count++;
      }
      peaks[bar] = Math.max(peaks[bar], Math.sqrt(energy / Math.max(1, count)));
    }
  }
  const maximum = Math.max(...peaks, 0.01);
  for (let index = 0; index < peaks.length; index++) peaks[index] /= maximum;
  cache.set(src, peaks);
  if (cache.size > 12) cache.delete(cache.keys().next().value!);
  return peaks;
}

export function audioTime(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainder = String(safe % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${remainder}` : `${minutes}:${remainder}`;
}
