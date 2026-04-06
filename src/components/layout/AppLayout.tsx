import React from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "../../lib/utils";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans selection:bg-[var(--text-primary)] selection:text-[var(--bg-primary)] transition-colors">
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
      />
      <Header isSidebarCollapsed={isSidebarCollapsed} />
      <main 
        className={cn(
          "p-8 min-h-[calc(100vh-4rem)] transition-all duration-300 ease-in-out print:p-0 print:m-0",
          isSidebarCollapsed ? "ml-20" : "ml-64"
        )}
      >
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 print:animate-none print:transform-none">
          {children}
        </div>
      </main>
    </div>
  );
}
