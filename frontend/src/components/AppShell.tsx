import { type ReactNode } from "react"
import { AppSidebar } from "./AppSidebar"
import { TopHeader } from "./TopHeader"

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F8FAFC]">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopHeader />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
