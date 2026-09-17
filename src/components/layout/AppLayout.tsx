import React from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "../../lib/utils";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-parchment)] text-[var(--color-ink)] font-sans selection:bg-[var(--color-ink)] selection:text-[var(--color-parchment)] transition-colors">
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
      />
      <Header isSidebarCollapsed={isSidebarCollapsed} />
      <main 
        className={cn(
          "px-6 py-8 md:px-10 md:py-10 min-h-[calc(100vh-4rem)] transition-all duration-300 ease-in-out print:p-0 print:m-0",
          isSidebarCollapsed ? "ml-20" : "ml-64"
        )}
      >
        <div className="max-w-[1400px] mx-auto space-y-10 print:space-y-4">
          {children}
        </div>
      </main>
    </div>
  );
}
