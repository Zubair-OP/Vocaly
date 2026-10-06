import { NavLink } from "react-router-dom";
import { AudioLines, Plus, ListMusic, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
export function AppSidebar() {
  return <aside className="studio-sidebar flex shrink-0 flex-col md:w-[232px]">
    <NavLink to="/" className="studio-brand" aria-label="Vocally home"><span className="brand-mark"><AudioLines strokeWidth={1.4} /></span><span>vocally<span className="text-primary">.</span></span></NavLink>
    <div className="sidebar-label hidden md:block">YOUR WORKSPACE</div>
    <nav aria-label="Main navigation" className="flex gap-2 md:flex-col">{[{to:"/new",label:"Create a dub",icon:Plus},{to:"/outputs",label:"Outputs",icon:ListMusic}].map(({to,label,icon:Icon})=><NavLink key={to} to={to} end className={({isActive})=>cn("studio-nav-link",isActive&&"is-active")}><Icon className="size-[18px]" strokeWidth={1.4}/>{label}<ArrowUpRight className="nav-arrow ml-auto size-4" strokeWidth={1.4}/></NavLink>)}</nav>
    <div className="sidebar-note mt-auto hidden md:block"><div className="sidebar-wave" aria-hidden="true">{[12,24,17,36,26,44,31,20,34,16,26,12].map((height,i)=><span key={i} style={{height}} />)}</div><p>Your voice.<br/>A world of possibilities.</p><span>Create something worth hearing.</span></div>
    <div className="sidebar-footer hidden md:flex"><span className="size-1.5 rounded-full bg-primary"/> VOCALLY STUDIO <span className="ml-auto">V.01</span></div>
  </aside>;
}
