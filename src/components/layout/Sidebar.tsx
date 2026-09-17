import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
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
  Mail,
  TrendingUp,
  Calculator,
  Archive,
} from "lucide-react";
import { Logo } from "../ui/Logo";
import { cn } from "../../lib/utils";
import { useUser } from "../../context/UserContext";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: TrendingUp, label: "Yearly Target", href: "/achieved-target" },
  { icon: CheckSquare, label: "Action List", href: "/actions" },
  { icon: Users, label: "Directory", href: "/directory" },
  { icon: FileText, label: "Registrations", href: "/registrations" },
  { icon: Calendar, label: "Meetings", href: "/meetings" },
  { icon: BarChart3, label: "Pipeline", href: "/pipeline" },
  { icon: Archive, label: "Archived RFPs", href: "/archived" },
  { icon: Calculator, label: "Top Down Calc", href: "/top-down-calc" },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const { profile, logout } = useUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      logout();
      navigate("/login");
    }
  };

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 h-screen bg-[var(--color-parchment)] border-r border-[var(--color-ash)] flex flex-col z-50 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className={cn(
        "flex items-center border-b border-[var(--color-ash)] h-20 transition-all",
        isCollapsed ? "justify-center px-0" : "justify-between px-6"
      )}>
        <Logo collapsed={isCollapsed} />
        <button 
          onClick={onToggle}
          className={cn(
            "p-1.5 rounded-[10px] text-[var(--color-ink)]/70 hover:text-[var(--color-ink)] hover:bg-[var(--color-ink)]/5 transition-colors",
            !isCollapsed && "ml-auto"
          )}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) => cn(
              "w-full flex items-center gap-3 px-3 py-2.5 text-[11px] tracking-[0.05em] uppercase font-medium transition-all rounded-[10px] group relative",
              isActive
                ? "bg-[var(--color-ink)] text-[var(--color-parchment)] shadow-none"
                : "text-[var(--color-ink)] hover:bg-[var(--color-ink)]/5",
              isCollapsed && "justify-center px-2"
            )}
            title={isCollapsed ? item.label : undefined}
          >
            {({ isActive }) => (
              <>
                <item.icon
                  size={18}
                  className={cn(
                    "transition-colors shrink-0",
                    isActive ? "text-[var(--color-parchment)]" : "text-[var(--color-ink)] opacity-75 group-hover:opacity-100"
                  )}
                />
                {!isCollapsed && (
                  <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                    {item.label}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-[var(--color-ash)] space-y-1">
        <NavLink 
          to="/settings"
          className={({ isActive }) => cn(
            "w-full flex items-center gap-3 px-3 py-2.5 text-[11px] tracking-[0.05em] uppercase font-medium transition-colors rounded-[10px] group relative",
            isActive
              ? "bg-[var(--color-ink)] text-[var(--color-parchment)]"
              : "text-[var(--color-ink)] hover:bg-[var(--color-ink)]/5",
            isCollapsed && "justify-center px-2"
          )}
          title={isCollapsed ? "Settings" : undefined}
        >
          {({ isActive }) => (
            <>
              <SettingsIcon size={18} className={cn(
                "transition-colors shrink-0",
                isActive ? "text-[var(--color-parchment)]" : "text-[var(--color-ink)] opacity-75 group-hover:opacity-100"
              )} />
              {!isCollapsed && <span className="whitespace-nowrap">Settings</span>}
            </>
          )}
        </NavLink>
        <button 
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 text-[11px] tracking-[0.05em] uppercase font-medium text-[var(--color-ink)]/80 hover:text-red-700 hover:bg-red-500/10 rounded-[10px] transition-colors group",
            isCollapsed && "justify-center px-2"
          )}
          title={isCollapsed ? "Logout" : undefined}
        >
          <LogOut size={18} className="opacity-75 group-hover:opacity-100 shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap">Logout</span>}
        </button>
      </div>

      <div className="p-3.5 border-t border-[var(--color-ash)]">
        <NavLink 
          to="/profile"
          className={cn(
            "flex items-center gap-3 w-full hover:bg-[var(--color-ink)]/5 rounded-[10px] p-2 transition-colors",
            isCollapsed ? "justify-center" : "text-left"
          )}
          title={isCollapsed ? profile?.name : undefined}
        >
          <div className="w-8 h-8 rounded-full bg-[var(--color-paper)] flex items-center justify-center border border-[var(--color-ash)] shrink-0 overflow-hidden">
            {profile?.image ? (
              <img src={profile.image} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <User size={14} className="text-[var(--color-ink)]" />
            )}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-[12px] font-medium text-[var(--color-ink)] truncate">{profile?.name}</span>
              <span className="text-[10px] text-[var(--color-ink)]/60 font-mono truncate">{profile?.email}</span>
            </div>
          )}
        </NavLink>
      </div>
    </aside>
  );
}
