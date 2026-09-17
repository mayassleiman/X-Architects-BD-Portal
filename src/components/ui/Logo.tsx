import React, { useState, useEffect } from "react";

interface LogoProps {
  className?: string;
  collapsed?: boolean;
  showText?: boolean;
}

export function Logo({ className, collapsed = false, showText = true }: LogoProps) {
  const [hasCustomLogo, setHasCustomLogo] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/logo', { method: 'HEAD' })
      .then(res => {
        if (res.ok) setHasCustomLogo(true);
      })
      .catch(() => setHasCustomLogo(false));
  }, []);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {hasCustomLogo ? (
        <img 
          src={`/api/logo?t=${new Date().getTime()}`} 
          alt="Company Logo" 
          className="h-10 w-auto object-contain max-w-[180px]" 
        />
      ) : (
        <div className="relative flex items-center justify-center w-8 h-8 bg-[var(--color-ink)] text-[var(--color-parchment)] border border-[var(--color-ink)] shrink-0">
          <span className="font-bold text-base leading-none tracking-tighter">X</span>
        </div>
      )}

      {!collapsed && showText && (
        <div className="flex flex-col justify-center">
          <span className="text-[var(--color-ink)] font-bold tracking-[0.22em] text-[11px] leading-none whitespace-nowrap">
            ARCHITECTS
          </span>
          <span className="text-[var(--color-ink)]/60 tracking-[0.14em] text-[9px] uppercase font-mono leading-none whitespace-nowrap mt-1">
            BD Portal
          </span>
        </div>
      )}
    </div>
  );
}
