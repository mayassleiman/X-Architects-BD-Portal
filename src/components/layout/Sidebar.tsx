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
  Users,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Logo } from "../ui/Logo";
import { cn } from "../../lib/utils";
import { useUser } from "../../context/UserContext";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: CheckSquare, label: "Action List", href: "/actions" },
  { icon: Users, label: "Master Directory", href: "/directory" },
  { icon: FileText, label: "Registrations", href: "/registrations" },
  { icon: Calendar, label: "Meetings", href: "/meetings" },
  { icon: BarChart3, label: "Pipeline", href: "/pipeline" },
  { icon: Briefcase, label: "Tasks", href: "/tasks" },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const { profile } = useUser();
  const [active, setActive] = React.useState(window.location.pathname);

  const handleNavigation = (href: string) => {
    window.history.pushState({}, "", href);
    setActive(href);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("userProfile");
      window.location.reload();
    }
  };

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 h-screen bg-[var(--bg-primary)] border-r border-[var(--border)] flex flex-col z-50 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className={cn(
        "flex items-center border-b border-[var(--border)] h-20 transition-all",
        isCollapsed ? "justify-center px-0" : "justify-between px-6"
      )}>
        {!isCollapsed && <Logo />}
        {isCollapsed && (
             <div className="font-bold text-xl text-[var(--text-primary)]">X</div>
        )}
        <button 
          onClick={onToggle}
          className={cn(
            "text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors",
            !isCollapsed && "ml-auto"
          )}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => (
          <button
            key={item.href}
            onClick={() => handleNavigation(item.href)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 text-sm font-medium transition-colors rounded-lg group relative",
              active === item.href
                ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]",
              isCollapsed && "justify-center px-2"
            )}
            title={isCollapsed ? item.label : undefined}
          >
            <item.icon
              size={20}
              className={cn(
                "transition-colors shrink-0",
                active === item.href ? "text-[var(--bg-primary)]" : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
              )}
            />
            {!isCollapsed && (
              <span className="tracking-wide uppercase text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                {item.label}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-[var(--border)] space-y-1">
        <button 
          onClick={() => handleNavigation("/settings")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-3 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] rounded-lg transition-colors group",
            isCollapsed && "justify-center px-2"
          )}
          title={isCollapsed ? "Settings" : undefined}
        >
          <SettingsIcon size={20} className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] shrink-0" />
          {!isCollapsed && <span className="tracking-wide uppercase text-xs font-semibold whitespace-nowrap">Settings</span>}
        </button>
        <button 
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-3 text-sm font-medium text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors group",
            isCollapsed && "justify-center px-2"
          )}
          title={isCollapsed ? "Logout" : undefined}
        >
          <LogOut size={20} className="text-[var(--text-secondary)] group-hover:text-red-400 shrink-0" />
          {!isCollapsed && <span className="tracking-wide uppercase text-xs font-semibold whitespace-nowrap">Logout</span>}
        </button>
      </div>

      <div className="p-4 border-t border-[var(--border)]">
        <button 
          onClick={() => handleNavigation("/profile")}
          className={cn(
            "flex items-center gap-3 w-full hover:bg-[var(--border)] rounded-lg p-2 transition-colors",
            isCollapsed ? "justify-center" : "text-left"
          )}
          title={isCollapsed ? profile.name : undefined}
        >
          <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center border border-[var(--border)] shrink-0">
            <User size={14} className="text-[var(--text-secondary)]" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-medium text-[var(--text-primary)] truncate">{profile.name}</span>
              <span className="text-[10px] text-[var(--text-secondary)] truncate">{profile.email}</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
