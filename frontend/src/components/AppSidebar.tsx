import { NavLink } from "react-router-dom";
import { AudioLines, Plus, ListMusic } from "lucide-react";
import { cn } from "@/lib/utils";
export function AppSidebar() {
  return (
    <aside className="hidden w-[220px] shrink-0 flex-col border-r border-border bg-card md:flex">
      <NavLink
        to="/"
        className="flex h-[76px] items-center gap-2.5 px-6"
        aria-label="Vocally home"
      >
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-white">
          <AudioLines className="size-5" />
        </span>
        <span className="text-xl font-semibold tracking-tight">
          Vocally<span className="text-primary">.</span>
        </span>
      </NavLink>
      <div className="px-6 pb-3 pt-7 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        Workspace
      </div>
      <nav aria-label="Main navigation" className="flex flex-col gap-1 px-3">
        {[
          { to: "/", label: "New dub", icon: Plus },
          { to: "/outputs", label: "Outputs", icon: ListMusic },
        ].map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            <Icon className="size-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto p-6">
        <p className="text-sm font-medium">Your content. More languages.</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          A focused space for every dub.
        </p>
      </div>
    </aside>
  );
}
