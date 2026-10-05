import * as React from "react"
import { cn } from "@/lib/utils"

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "processing" | "destructive" | "outline"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        {
          "bg-accent text-accent-foreground border border-primary/25": variant === "default" || variant === "processing",
          "bg-[#F1F5F9] text-muted-foreground border border-border": variant === "secondary",
          "bg-[#EAFBF0] text-[#15803D] border border-[#16A34A]/20": variant === "success",
          "bg-red-50 text-red-600 border border-red-200": variant === "destructive",
          "border border-border text-muted-foreground": variant === "outline",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
