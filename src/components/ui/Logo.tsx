import React, { useState, useEffect } from "react";

export function Logo({ className }: { className?: string }) {
  const [hasCustomLogo, setHasCustomLogo] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/logo', { method: 'HEAD' })
      .then(res => {
        if (res.ok) setHasCustomLogo(true);
      })
      .catch(() => setHasCustomLogo(false));
  }, []);

  if (hasCustomLogo) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <img 
          src={`/api/logo?t=${new Date().getTime()}`} 
          alt="Company Logo" 
          className="h-10 w-auto object-contain max-w-[180px]" 
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center w-8 h-8 bg-[var(--bg-tertiary)] border border-[var(--border)]">
        <span className="text-[var(--text-primary)] font-bold text-xl leading-none">X</span>
      </div>
      <div className="flex flex-col justify-center">
        <span className="text-[var(--text-primary)] font-bold tracking-[0.2em] text-xs leading-none whitespace-nowrap">
          ARCHITECTS
        </span>
        <span className="text-[var(--text-secondary)] tracking-[0.1em] text-[10px] leading-none whitespace-nowrap mt-0.5">
          BD PORTAL
        </span>
      </div>
    </div>
  );
}
