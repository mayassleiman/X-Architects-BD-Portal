import React from "react";
import { Search, Bell, Calendar as CalendarIcon } from "lucide-react";
import { useSearch } from "../../context/SearchContext";
import { cn } from "../../lib/utils";

interface HeaderProps {
  isSidebarCollapsed: boolean;
}

export function Header({ isSidebarCollapsed }: HeaderProps) {
  const { searchQuery, setSearchQuery } = useSearch();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header 
      className={cn(
        "h-16 border-b border-[var(--border)] bg-[var(--bg-primary)]/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-40 transition-all duration-300 ease-in-out",
        isSidebarCollapsed ? "ml-20 w-[calc(100%-5rem)]" : "ml-64 w-[calc(100%-16rem)]"
      )}
    >
      <div className="flex items-center gap-4 text-[var(--text-secondary)]">
        <CalendarIcon size={16} />
        <span className="text-xs font-mono tracking-wider uppercase">{today}</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative group">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--text-primary)] transition-colors"
          />
          <input
            type="text"
            placeholder="SEARCH..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-10 pr-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-full text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-hover)] focus:bg-[var(--card-bg-inner)] w-64 transition-all font-mono uppercase tracking-wider"
          />
        </div>

        <button className="relative p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--text-primary)] rounded-full border-2 border-[var(--bg-primary)]"></span>
        </button>
      </div>
    </header>
  );
}
