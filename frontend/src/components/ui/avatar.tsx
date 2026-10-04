import * as React from "react"
import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "relative flex h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-[#EEF7FF]",
        className
      )}
      {...props}
    />
  )
)
Avatar.displayName = "Avatar"

const AvatarFallback = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-[#EEF7FF] text-[11px] font-semibold text-[#1D9BF0]",
        className
      )}
      {...props}
    />
  )
)
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarFallback }
