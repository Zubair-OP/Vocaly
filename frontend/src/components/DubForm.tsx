import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { InlineStatus, type ProcessingStep } from "@/components/InlineStatus"
import { 
  fetchTranscript, 
  generateAudio, 
  type FetchTranscriptResponse,
  type OutputItem,
  type VoiceOption 
} from "@/lib/api"
import { ClipboardPaste, Wand2, ChevronDown, ChevronUp } from "lucide-react"

// Supported languages
const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "ur", name: "Urdu" },
  { code: "hi", name: "Hindi" },
  { code: "ar", name: "Arabic" },
]

// Voice options per language (mirrors backend)
const VOICES: Record<string, VoiceOption[]> = {
  en: [
    { id: "en-US-GuyNeural", name: "Guy (US Male)" },
    { id: "en-US-JennyNeural", name: "Jenny (US Female)" },
    { id: "en-GB-RyanNeural", name: "Ryan (UK Male)" },
  ],
  ur: [
    { id: "ur-PK-UzmaNeural", name: "Uzma (Female)" },
    { id: "ur-PK-AsadNeural", name: "Asad (Male)" },
  ],
  hi: [
    { id: "hi-IN-SwaraNeural", name: "Swara (Female)" },
    { id: "hi-IN-MadhurNeural", name: "Madhur (Male)" },
  ],
  ar: [
    { id: "ar-SA-ZariyahNeural", name: "Zariyah (Female)" },
    { id: "ar-SA-HamedNeural", name: "Hamed (Male)" },
  ],
}

interface DubFormProps {
  onComplete: (output: OutputItem) => void
}

export function DubForm({ onComplete }: DubFormProps) {
  const [url, setUrl] = useState("")
  const [sourceLanguage, setSourceLanguage] = useState("en")
  const [targetLanguage, setTargetLanguage] = useState("ur")
  const [voice, setVoice] = useState("ur-PK-UzmaNeural")
  const [step, setStep] = useState<ProcessingStep>("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [transcriptPreview, setTranscriptPreview] = useState("")
  const [showFullTranscript, setShowFullTranscript] = useState(false)
  const [transcriptData, setTranscriptData] = useState<FetchTranscriptResponse | null>(null)

  // Update voice when target language changes
  const handleTargetLanguageChange = (lang: string) => {
    setTargetLanguage(lang)
    const voices = VOICES[lang]
    if (voices && voices.length > 0) {
      setVoice(voices[0].id)
    }
  }

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      setUrl(text)
    } catch {
      // Clipboard access denied — user can type manually
    }
  }, [])

  const handleGenerate = async () => {
    if (!url.trim()) {
      setErrorMessage("Enter a valid YouTube video link.")
      setStep("error")
      return
    }

    setStep("fetching")
    setErrorMessage("")
    setTranscriptPreview("")
    setTranscriptData(null)

    try {
      // Step 1: Fetch transcript
      const transcript = await fetchTranscript(url)
      setTranscriptData(transcript)

      const fullText = transcript.segments.map((s) => s.text).join(" ")
      setTranscriptPreview(fullText)

      // Auto-detect source language from transcript
      if (transcript.source_language) {
        setSourceLanguage(transcript.source_language)
      }

      // Step 2: Translate
      setStep("translating")
      
      // Step 3: Generate audio (translation + TTS happens in one API call)
      setStep("generating")

      // The backend translates, synthesises audio, and saves the output to MongoDB.
      const result = await generateAudio({
        video_id: transcript.video_id,
        title: transcript.title,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        voice: voice,
        transcript: fullText,
      })

      const output = result.output

      setStep("completed")

      // Navigate to outputs after a brief delay
      setTimeout(() => {
        onComplete(output)
      }, 800)
    } catch (err: any) {
      setStep("error")
      setErrorMessage(err.message || "An unexpected error occurred.")
    }
  }

  const isProcessing = step !== "idle" && step !== "error" && step !== "completed"
  const availableVoices = VOICES[targetLanguage] || []

  return (
    <div className="space-y-6">
      {/* URL Input */}
      <div className="space-y-2">
        <label htmlFor="youtube-url" className="text-sm font-medium text-foreground">
          YouTube URL
        </label>
        <div className="flex gap-2">
          <Input
            id="youtube-url"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isProcessing}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handlePaste}
            disabled={isProcessing}
            title="Paste from clipboard"
          >
            <ClipboardPaste className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Language selectors */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Source Language</label>
          <Select
            value={sourceLanguage}
            onValueChange={setSourceLanguage}
            disabled={isProcessing}
          >
            <SelectTrigger id="source-language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Target Language</label>
          <Select
            value={targetLanguage}
            onValueChange={handleTargetLanguageChange}
            disabled={isProcessing}
          >
            <SelectTrigger id="target-language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Voice selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Voice</label>
        <Select value={voice} onValueChange={setVoice} disabled={isProcessing}>
          <SelectTrigger id="voice-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableVoices.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Generate button */}
      <Button
        id="generate-audio"
        onClick={handleGenerate}
        disabled={isProcessing}
        size="lg"
        className="w-full"
      >
        {isProcessing ? (
          <>Processing…</>
        ) : (
          <>
            <Wand2 className="mr-2 h-4 w-4" />
            Generate Audio
          </>
        )}
      </Button>

      {/* Transcript preview */}
      {transcriptPreview && (
        <div className="animate-fade-in space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Transcript Preview
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFullTranscript(!showFullTranscript)}
              className="text-xs text-muted-foreground"
            >
              {showFullTranscript ? (
                <>
                  <ChevronUp className="mr-1 h-3 w-3" /> Less
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 h-3 w-3" /> More
                </>
              )}
            </Button>
          </div>
          <div className="rounded-md border border-border bg-secondary/50 p-4 text-sm text-muted-foreground leading-relaxed">
            {showFullTranscript
              ? transcriptPreview
              : transcriptPreview.slice(0, 300) +
                (transcriptPreview.length > 300 ? "…" : "")}
          </div>
        </div>
      )}

      {/* Inline status */}
      <InlineStatus step={step} errorMessage={errorMessage} />
    </div>
  )
}
