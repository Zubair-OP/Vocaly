import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AudioPlayer } from "@/components/AudioPlayer";
import { Button } from "@/components/ui/button"
import { type OutputItem } from "@/lib/api"
import { langName } from "@/lib/format"
import { Download, ChevronDown, ChevronUp, Play } from "lucide-react"

interface AudioResultCardProps {
  output: OutputItem
}

export function AudioResultCard({ output }: AudioResultCardProps) {
  const [showOriginal, setShowOriginal] = useState(false)
  const [showTranslated, setShowTranslated] = useState(false)

  const sourceName = langName(output.sourceLanguage)
  const targetName = langName(output.targetLanguage)
  const format = output.audioUrl.endsWith(".wav") ? "wav" : "mp3"

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = output.audioUrl
    link.download = `vocally_${output.videoId}_${output.targetLanguage}.${format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-base leading-snug">{output.title}</CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
          <span>{sourceName}</span>
          <span className="text-accent-foreground">→</span>
          <span>{targetName}</span>
          <span className="ml-auto text-xs">
            {output.status === "completed" ? (
              <span className="inline-flex items-center gap-1 text-green-600">
                <Play className="h-3 w-3" /> Ready
              </span>
            ) : (
              <span className="text-destructive">Error</span>
            )}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Audio Player */}
        {output.status === "completed" && (
          <AudioPlayer src={output.audioUrl} label={"Audio for " + output.title} />
        )}

        {/* Download Button */}
        <Button
          id={`download-${output.id}`}
          variant="outline"
          onClick={handleDownload}
          className="w-full"
          disabled={output.status !== "completed"}
        >
          <Download className="mr-2 h-4 w-4" />
          Download {format.toUpperCase()}
        </Button>

        {/* Original Transcript (collapsible) */}
        {output.originalTranscript && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOriginal(!showOriginal)}
              className="text-xs text-muted-foreground px-0 hover:bg-transparent"
            >
              {showOriginal ? (
                <ChevronUp className="mr-1 h-3 w-3" />
              ) : (
                <ChevronDown className="mr-1 h-3 w-3" />
              )}
              Original
            </Button>
            {showOriginal && (
              <div className="animate-fade-in mt-2 rounded-md border border-border bg-secondary/50 p-3 text-sm text-muted-foreground leading-relaxed max-h-40 overflow-y-auto">
                {output.originalTranscript}
              </div>
            )}
          </div>
        )}

        {/* Translated Transcript (collapsible) */}
        {output.translatedText && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTranslated(!showTranslated)}
              className="text-xs text-muted-foreground px-0 hover:bg-transparent"
            >
              {showTranslated ? (
                <ChevronUp className="mr-1 h-3 w-3" />
              ) : (
                <ChevronDown className="mr-1 h-3 w-3" />
              )}
              Translated
            </Button>
            {showTranslated && (
              <div className="animate-fade-in mt-2 rounded-md border border-border bg-secondary/50 p-3 text-sm text-muted-foreground leading-relaxed max-h-40 overflow-y-auto" dir="auto">
                {output.translatedText}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
