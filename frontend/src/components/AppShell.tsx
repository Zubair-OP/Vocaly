import { type ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="studio-shell flex min-h-dvh w-full flex-col bg-background md:flex-row">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-card focus:p-3"
      >
        Skip to content
      </a>
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1600px] flex-1"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
