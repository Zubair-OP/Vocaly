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
          "bg-[#EEF7FF] text-[#1D9BF0] border border-[#1D9BF0]/20": variant === "default",
          "bg-[#F1F5F9] text-[#64748B] border border-[#E5EAF2]": variant === "secondary",
          "bg-[#EAFBF0] text-[#16A34A] border border-[#16A34A]/20": variant === "success",
          "bg-[#EEF5FF] text-[#3B82F6] border border-[#3B82F6]/20": variant === "processing",
          "bg-red-50 text-red-600 border border-red-200": variant === "destructive",
          "border border-[#E5EAF2] text-[#64748B]": variant === "outline",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
