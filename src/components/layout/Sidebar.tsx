import React from "react";
import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  Calendar,
  Briefcase,
  Settings as SettingsIcon,
  LogOut,
  User,
  Cpu,
  BarChart3,
} from "lucide-react";
import { Logo } from "../ui/Logo";
import { cn } from "../../lib/utils";
import { useUser } from "../../context/UserContext";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: CheckSquare, label: "Action List", href: "/actions" },
  { icon: FileText, label: "Registrations", href: "/registrations" },
  { icon: Calendar, label: "Meetings", href: "/meetings" },
  { icon: BarChart3, label: "Pipeline", href: "/pipeline" },
  { icon: Briefcase, label: "Tasks", href: "/tasks" },
];

export function Sidebar() {
  const { profile } = useUser();
  const [active, setActive] = React.useState(window.location.pathname);

  const handleNavigation = (href: string) => {
    window.history.pushState({}, "", href);
    setActive(href);
    // Dispatch a popstate event so App.tsx detects it
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("userProfile");
      window.location.reload();
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[var(--bg-primary)] border-r border-[var(--border)] flex flex-col z-50 transition-colors">
      <div className="p-6 border-b border-[var(--border)]">
        <Logo />
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.href}
            onClick={() => handleNavigation(item.href)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-lg group",
              active === item.href
                ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]"
            )}
          >
            <item.icon
              size={18}
              className={cn(
                "transition-colors",
                active === item.href ? "text-[var(--bg-primary)]" : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
              )}
            />
            <span className="tracking-wide uppercase text-xs font-semibold">
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-[var(--border)] space-y-1">
        <button 
          onClick={() => handleNavigation("/settings")}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] rounded-lg transition-colors group"
        >
          <SettingsIcon size={18} className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />
          <span className="tracking-wide uppercase text-xs font-semibold">Settings</span>
        </button>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors group"
        >
          <LogOut size={18} className="text-[var(--text-secondary)] group-hover:text-red-400" />
          <span className="tracking-wide uppercase text-xs font-semibold">Logout</span>
        </button>
      </div>

      <div className="p-4 border-t border-[var(--border)]">
        <button 
          onClick={() => handleNavigation("/profile")}
          className="flex items-center gap-3 px-2 w-full hover:bg-[var(--border)] rounded-lg p-2 transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center border border-[var(--border)]">
            <User size={14} className="text-[var(--text-secondary)]" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-[var(--text-primary)]">{profile.name}</span>
            <span className="text-[10px] text-[var(--text-secondary)]">{profile.email}</span>
          </div>
        </button>
      </div>
    </aside>
  );
}
