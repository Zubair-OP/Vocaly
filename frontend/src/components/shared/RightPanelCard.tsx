import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface RightPanelCardProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  /** Remove the default body padding (for flush media blocks). */
  flush?: boolean;
  /** Soft `#F8FAFC` surface instead of white. */
  muted?: boolean;
  className?: string;
  bodyClassName?: string;
}

/**
 * Shared card shell used inside the right-hand summary panels so every
 * panel section uses the same radius, border, header, and spacing.
 */
export function RightPanelCard({
  title,
  action,
  children,
  flush = false,
  muted = false,
  className,
  bodyClassName,
}: RightPanelCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden rounded-2xl border border-border ",
        muted ? "bg-background" : "bg-white",
        className,
      )}
    >
      {(title || action) && (
        <CardHeader
          className={cn(
            "flex flex-row items-center justify-between gap-3 space-y-0",
            flush ? "px-5 pt-4" : "border-b border-[#EDF2F7] px-5 py-4",
          )}
        >
          <CardTitle className="text-[15px] font-semibold tracking-tight text-foreground">
            {title}
          </CardTitle>
          {action}
        </CardHeader>
      )}

      <CardContent className={cn(flush ? "p-0" : "p-5", bodyClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
