import { Link, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  Plus,
  ListMusic,
  Settings,
  Mic2,
} from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
  { label: "New Dub", icon: Plus, to: "/" },
  { label: "Outputs", icon: ListMusic, to: "/outputs" },
  { label: "Settings", icon: Settings, to: "/settings" },
]

export function AppSidebar() {
  const { pathname } = useLocation()

  return (
    <aside className="flex h-screen w-[230px] flex-shrink-0 flex-col border-r border-[#E5EAF2] bg-white">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[#E5EAF2]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1D9BF0] shadow-sm">
          <Mic2 className="h-4 w-4 text-white" />
        </div>
        <span className="text-[17px] font-bold tracking-tight text-[#0F172A]">Vocally</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ label, icon: Icon, to }) => {
          const isActive =
            to === "/"
              ? pathname === "/" || pathname === "/new"
              : pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-[#EAF6FF] text-[#1D9BF0]"
                  : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 flex-shrink-0 transition-colors",
                  isActive ? "text-[#1D9BF0]" : "text-[#94A3B8] group-hover:text-[#64748B]"
                )}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-4 py-4 border-t border-[#E5EAF2]">
        <p className="text-xs text-[#94A3B8]">Vocally v1.0 · Hackathon MVP</p>
      </div>
    </aside>
  )
}
