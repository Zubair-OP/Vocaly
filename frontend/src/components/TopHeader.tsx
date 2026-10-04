import { Bell } from "lucide-react"

export function TopHeader() {
  return (
    <header className="flex h-14 items-center justify-end gap-3 border-b border-[#E5EAF2] bg-white px-6">
      <button
        type="button"
        aria-label="Notifications"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5EAF2] bg-white text-[#64748B] transition-colors hover:bg-[#F8FAFC]"
      >
        <Bell className="h-4 w-4" />
      </button>
    </header>
  )
}
