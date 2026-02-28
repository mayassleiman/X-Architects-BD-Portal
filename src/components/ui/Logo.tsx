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
        <div className="relative flex items-center justify-center w-8 h-8 bg-[var(--bg-tertiary)] border border-[var(--border)] shrink-0">
          <span className="text-[var(--text-primary)] font-bold text-xl leading-none">X</span>
        </div>
      )}

      {!collapsed && showText && (
        <div className="flex flex-col justify-center">
          <span className="text-[var(--text-primary)] font-bold tracking-[0.2em] text-xs leading-none whitespace-nowrap">
            ARCHITECTS
          </span>
          <span className="text-gray-500 tracking-[0.1em] text-[10px] leading-none whitespace-nowrap mt-0.5">
            BD Portal
          </span>
        </div>
      )}
    </div>
  );
}
