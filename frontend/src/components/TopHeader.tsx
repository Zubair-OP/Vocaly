import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AudioLines, Search, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
export function TopHeader() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  return (
    <header className="border-b border-border bg-card">
      <div className="flex h-[76px] items-center justify-between gap-4 px-4 sm:px-8">
        <AudioLines
          className="size-6 shrink-0 text-accent-foreground md:hidden"
          aria-label="Vocally"
        />
        <form
          role="search"
          className="relative w-full max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            navigate("/outputs?q=" + encodeURIComponent(search.trim()));
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            aria-label="Search your outputs"
            placeholder="Search your outputs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 border-transparent bg-background pl-9"
          />
        </form>
        <div className="flex shrink-0 items-center gap-3 border-l border-border pl-4 sm:pl-6">
          <span className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <UserRound className="size-4" />
          </span>
          <div className="hidden sm:block">
            <p className="text-sm font-medium">My workspace</p>
            <p className="text-xs text-muted-foreground">Personal workspace</p>
          </div>
        </div>
      </div>
      <nav
        aria-label="Mobile navigation"
        className="flex gap-2 px-4 pb-3 md:hidden"
      >
        {[
          { to: "/new", label: "New dub" },
          { to: "/outputs", label: "Outputs" },
        ].map(({ to, label }) => (
          <NavLink
            key={to}
            end
            to={to}
            className={({ isActive }) =>
              cn(
                "flex min-h-11 flex-1 items-center justify-center rounded-xl text-sm font-medium",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground",
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
