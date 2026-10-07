import { useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { audioTime, loadWaveform } from "@/lib/audio-waveform";
import { useQueryClient } from "@tanstack/react-query";
import { audioDurationKey } from "@/lib/use-audio-duration";

interface AudioPlayerProps {
  src: string;
  label: string;
  autoPlay?: boolean;
  /** Incremented when a library row requests playback of this source. */
  playRequest?: number;
}

// Each source owns its media element and Web Audio graph.
export function AudioPlayer(props: AudioPlayerProps) {
  return <AudioPlayerSource key={props.src} {...props} />;
}

function AudioPlayerSource({ src, label, autoPlay = false, playRequest = 0 }: AudioPlayerProps) {
  const queryClient = useQueryClient();
  function recordDuration(value: number) {
    setDuration(Number.isFinite(value) ? value : 0);
    if (Number.isFinite(value) && value > 0) queryClient.setQueryData(audioDurationKey(src), value);
  }
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controls = useRef<{ play: () => Promise<void>; redraw: () => void } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [rate, setRate] = useState("1");
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const audio = audioRef.current!;
    const canvas = canvasRef.current!;
    const drawing = canvas.getContext("2d");
    const palette = getComputedStyle(canvas);
    const playedColor = palette.color;
    const unplayedColor = palette.getPropertyValue("--waveform-muted").trim();
    const abort = new AbortController();
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let frame = 0;
    let context: AudioContext | undefined;
    let analyser: AnalyserNode | undefined;
    let source: MediaElementAudioSourceNode | undefined;
    let graphAttempted = false;
    let peaks: Float32Array | undefined;
    const samples = new Float32Array(2048);
    let smoothed = 0;
    let width = 1;
    const height = 60;

    function draw() {
      if (!drawing || disposed) return;
      drawing.clearRect(0, 0, width, height);
      const live = !audio.paused && !audio.ended && !motion.matches && !document.hidden && analyser;
      let energy = 0;
      if (live) {
        analyser!.getFloatTimeDomainData(samples);
        for (const sample of samples) energy += sample * sample;
        energy = Math.sqrt(energy / samples.length);
      }
      smoothed = live ? smoothed * 0.72 + energy * 0.28 : 0;
      const bars = Math.max(12, Math.floor(width / 5));
      const progress = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.currentTime / audio.duration : 0;
      for (let index = 0; index < bars; index++) {
        const base = peaks?.[Math.min(peaks.length - 1, Math.floor(index / bars * peaks.length))] || 0;
        let local = 0;
        if (live) {
          const start = Math.floor(index / bars * samples.length);
          const end = Math.floor((index + 1) / bars * samples.length);
          for (let sample = start; sample < end; sample++) local += samples[sample] ** 2;
          local = Math.sqrt(local / Math.max(1, end - start));
        }
        const barHeight = Math.min(54, Math.max(3, base * 30 * (live ? 0.8 + smoothed : 1) + local * 45));
        drawing.fillStyle = index / bars < progress ? playedColor : unplayedColor;
        drawing.beginPath();
        drawing.roundRect(index * width / bars, (height - barHeight) / 2, 2.5, barHeight, 1.25);
        drawing.fill();
      }
    }

    function loop() {
      draw();
      if (!disposed && !audio.paused && !audio.ended && !motion.matches && !document.hidden) frame = requestAnimationFrame(loop);
    }

    function redraw() {
      cancelAnimationFrame(frame);
      loop();
    }

    function connect() {
      if (graphAttempted) return;
      graphAttempted = true;
      // Our /api/audio files are same-origin. Non-CORS remote media would be
      // silenced by a MediaElementSource, so leave its native playback intact.
      if (new URL(src, location.href).origin !== location.origin && !src.startsWith("blob:")) return;
      try {
        context = new AudioContext();
        analyser = context.createAnalyser();
        analyser.fftSize = samples.length;
        source = context.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(context.destination);
      } catch {
        analyser = undefined;
        if (source && context) source.connect(context.destination);
      }
    }

    async function play() {
      if (disposed) return;
      setError("");
      connect();
      if (audio.error) audio.load();
      if (audio.ended) audio.currentTime = 0;
      try {
        await Promise.all([context?.resume(), audio.play()]);
      } catch {
        if (!disposed) {
          audio.pause();
          setWaiting(false);
          setError(audio.error ? "This audio could not be loaded. Try again or refresh your outputs." : "Playback could not start. Press play to try again.");
        }
      }
    }

    function resize() {
      width = Math.max(1, canvas.getBoundingClientRect().width);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = height * ratio;
      drawing?.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw();
    }

    function pauseOthers(event: Event) {
      if ((event as CustomEvent<HTMLAudioElement>).detail !== audio) audio.pause();
    }

    controls.current = { play, redraw };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    document.addEventListener("vocally:audio-play", pauseOthers);
    document.addEventListener("visibilitychange", redraw);
    motion.addEventListener("change", redraw);
    void loadWaveform(src, abort.signal).then(result => {
      if (!disposed) { peaks = result; draw(); }
    }).catch(() => { /* Playback and the live analyser work without decoded peaks. */ });
    resize();

    return () => {
      disposed = true;
      controls.current = null;
      abort.abort();
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("vocally:audio-play", pauseOthers);
      document.removeEventListener("visibilitychange", redraw);
      motion.removeEventListener("change", redraw);
      audio.pause();
      source?.disconnect();
      analyser?.disconnect();
      if (context && context.state !== "closed") void context.close().catch(() => {});
    };
  }, [src]);

  useEffect(() => {
    let active = true;
    // Wait until after StrictMode's first cleanup before attaching a source.
    if (autoPlay || playRequest > 0) queueMicrotask(() => { if (active) void controls.current?.play(); });
    return () => { active = false; };
  }, [autoPlay, playRequest]);

  function seek(value: number) {
    if (!audioRef.current || !duration) return;
    const next = Math.min(duration, Math.max(0, value));
    audioRef.current.currentTime = next;
    setPosition(next);
    controls.current?.redraw();
  }

  return (
    <div className="audio-player" role="group" aria-label={label}>
      <audio ref={audioRef} src={src} preload="metadata" hidden
        onLoadedMetadata={event => recordDuration(event.currentTarget.duration)}
        onDurationChange={event => recordDuration(event.currentTarget.duration)}
        onTimeUpdate={event => { setPosition(event.currentTarget.currentTime); controls.current?.redraw(); }}
        onPlay={event => { setPlaying(true); document.dispatchEvent(new CustomEvent("vocally:audio-play", { detail: event.currentTarget })); controls.current?.redraw(); }}
        onPlaying={() => { setWaiting(false); controls.current?.redraw(); }}
        onWaiting={() => setWaiting(true)}
        onPause={() => { setPlaying(false); setWaiting(false); controls.current?.redraw(); }}
        onEnded={() => { setPlaying(false); setWaiting(false); controls.current?.redraw(); }}
        onSeeked={() => { setWaiting(false); controls.current?.redraw(); }}
        onError={() => { setPlaying(false); setWaiting(false); setError("This audio could not be loaded. Try again or refresh your outputs."); }} />
      <div className="audio-player-main">
        <Button type="button" className="audio-toggle" size="icon" aria-label={playing ? "Pause audio" : "Play audio"}
          onClick={() => { if (audioRef.current?.paused) void controls.current?.play(); else audioRef.current?.pause(); }}>
          {waiting ? <Loader2 className="animate-spin" /> : playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
        </Button>
        <div className="audio-waveform">
          <canvas ref={canvasRef} aria-hidden="true" />
          <input className="waveform-seek" type="range" min={0} max={duration || 0} step={0.01} value={Math.min(position, duration)} disabled={!duration}
            aria-label="Seek audio" aria-valuetext={`${audioTime(position)} of ${audioTime(duration)}`}
            onChange={event => seek(Number(event.target.value))}
            onKeyDown={event => {
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault(); seek(position + (event.key === "ArrowRight" ? 5 : -5));
              }
            }} />
        </div>
      </div>
      <div className="audio-player-toolbar">
        <span className="audio-time" aria-hidden="true">{audioTime(position)} <span>/ {audioTime(duration)}</span></span>
        <div className="audio-player-options">
          <Button type="button" variant="ghost" size="icon" aria-label="Rewind 15 seconds" disabled={!duration} onClick={() => seek(position - 15)}><RotateCcw /></Button>
          <Button type="button" variant="ghost" size="icon" aria-label={muted ? "Unmute audio" : "Mute audio"} onClick={() => {
            if (audioRef.current) { audioRef.current.muted = !muted; setMuted(!muted); }
          }}>{muted ? <VolumeX /> : <Volume2 />}</Button>
          <Select value={rate} onValueChange={value => { setRate(value); if (audioRef.current) audioRef.current.playbackRate = Number(value); }}>
            <SelectTrigger className="audio-speed" aria-label="Playback speed"><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup>{[0.75, 1, 1.25, 1.5, 2].map(value => <SelectItem key={value} value={String(value)}>{value}×</SelectItem>)}</SelectGroup></SelectContent>
          </Select>
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
