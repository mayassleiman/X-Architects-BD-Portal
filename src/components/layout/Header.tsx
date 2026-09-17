import React from "react";
import { Search, Bell, Calendar as CalendarIcon } from "lucide-react";
import { useSearch } from "../../context/SearchContext";
import { cn } from "../../lib/utils";
import { useLocation } from "react-router-dom";

interface HeaderProps {
  isSidebarCollapsed: boolean;
}

export function Header({ isSidebarCollapsed }: HeaderProps) {
  const { searchQuery, setSearchQuery } = useSearch();
  const location = useLocation();
  const isReportPage = location.pathname === '/report';

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (isReportPage) return null;

  return (
    <header 
      className={cn(
        "h-16 border-b border-[var(--color-ash)] bg-[var(--color-parchment)]/95 backdrop-blur-sm flex items-center justify-between px-6 md:px-10 sticky top-0 z-40 transition-all duration-300 ease-in-out print:hidden",
        isSidebarCollapsed ? "ml-20 w-[calc(100%-5rem)]" : "ml-64 w-[calc(100%-16rem)]"
      )}
    >
      <div className="flex items-center gap-3 text-[var(--color-ink)]">
        <CalendarIcon size={14} className="text-[var(--color-ink)] opacity-70" />
        <span className="text-[11px] tracking-[0.05em] uppercase font-mono font-medium">
          {today}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative group">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-ink)] opacity-60 group-focus-within:opacity-100 transition-opacity"
          />
          <input
            type="text"
            placeholder="SEARCH PORTAL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 pr-4 bg-[var(--color-paper)] border border-[var(--color-ash)] rounded-[10px] text-[11px] text-[var(--color-ink)] placeholder:text-[var(--color-ink)]/40 focus:outline-none focus:border-[var(--color-ink)] w-56 md:w-64 transition-all tracking-[0.05em] uppercase font-mono"
          />
        </div>

        <button 
          className="relative p-2 text-[var(--color-ink)] rounded-[10px] hover:bg-[var(--color-ink)]/5 transition-colors"
          title="Notifications"
        >
          <Bell size={16} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[var(--color-ink)] rounded-full"></span>
        </button>
      </div>
    </header>
  );
}
