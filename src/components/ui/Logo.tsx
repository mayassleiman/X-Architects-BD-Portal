import React from "react";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center w-10 h-10 bg-[var(--bg-tertiary)] border border-[var(--border)]">
        <span className="text-[var(--text-primary)] font-bold text-xl leading-none">X</span>
      </div>
      <div className="flex flex-col justify-center">
        <span className="text-[var(--text-primary)] font-bold tracking-[0.2em] text-xs leading-none whitespace-nowrap">
          ARCHITECTS
        </span>
        <span className="text-[var(--text-secondary)] tracking-[0.1em] text-[10px] leading-none whitespace-nowrap mt-1">
          BD PORTAL
        </span>
      </div>
    </div>
  );
}
