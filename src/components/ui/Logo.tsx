import React from "react";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-12 ${className}`}>
      <div className="relative flex items-center justify-center w-40 h-40 bg-[var(--bg-tertiary)] border border-[var(--border)]">
        <span className="text-[var(--text-primary)] font-bold text-7xl leading-none">X</span>
      </div>
      <div className="flex flex-col justify-center">
        <span className="text-[var(--text-primary)] font-bold tracking-[0.2em] text-4xl leading-none whitespace-nowrap">
          ARCHITECTS
        </span>
        <span className="text-[var(--text-secondary)] tracking-[0.1em] text-[40px] leading-none whitespace-nowrap mt-4">
          BD PORTAL
        </span>
      </div>
    </div>
  );
}
