import React from "react";
import { createPortal } from "react-dom";
import { Logo } from "../ui/Logo";

interface ReportLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  isReportView?: boolean;
}

export function ReportLayout({ children, title, subtitle, isReportView }: ReportLayoutProps) {
  const [currentDate, setCurrentDate] = React.useState("");

  React.useEffect(() => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      day: '2-digit',
      month: 'long', 
      year: 'numeric'
    }).replace(',', '');
    setCurrentDate(formattedDate);
  }, []);

  if (isReportView) {
    return <>{children}</>;
  }

  return (
    <div className="w-full">
      {/* Cover Page for Print */}
      <div className="hidden print:flex flex-col items-center justify-center h-screen w-full break-after-page bg-white relative z-[10000]">
        <div className="mb-16">
          <Logo showText={false} className="[&>img]:!h-48 [&>img]:!max-w-[600px]" />
        </div>
        <h1 className="text-5xl font-light tracking-tight text-[var(--text-primary)] mb-4 uppercase text-center mt-12">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[var(--text-secondary)] font-medium text-2xl mt-8">{subtitle}</p>
        )}
        <p className="text-[var(--text-secondary)] font-medium text-2xl mt-8">{currentDate}</p>
        <div className="mt-auto pb-12 text-[var(--text-tertiary)] font-mono text-sm uppercase tracking-widest flex flex-col items-center gap-4">
          <span>Confidential Internal Report</span>
          <span className="text-[10px] opacity-70">Created by Mayas Sleiman - KSA Projects Director</span>
        </div>
      </div>

      <table className="w-full">
        <thead className="hidden print:table-header-group">
          <tr>
            <td>
              <div className="border-b border-[var(--border)] pb-8 mb-8 print:border-none print:pb-4 print:mb-4 flex justify-between items-start">
                <div>
                  <h1 className="hidden print:block text-2xl font-light tracking-tight text-[var(--text-primary)] mb-2 uppercase">
                    {title}
                  </h1>
                  <p className="text-[var(--text-primary)] font-medium text-lg">{currentDate}</p>
                </div>
                <div className="hidden print:flex md:flex justify-end">
                   <Logo showText={false} className="scale-125 print:scale-100 [&>img]:print:!h-20 [&>img]:print:!max-w-[300px]" />
                </div>
              </div>
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="pb-8">
              {children}
            </td>
          </tr>
        </tbody>
      </table>
      
      {/* Fixed Print Footer via Portal to ensure it repeats on all pages */}
      {createPortal(
        <div className="hidden print:flex fixed bottom-0 left-0 w-full bg-white pt-4 pb-4 border-t border-[var(--border)] flex-col gap-2 text-[var(--text-secondary)] text-xs font-mono uppercase tracking-wider z-[9999]">
          <div className="flex justify-between items-center px-8">
            <span>Confidential Internal Report</span>
            <span className="page-number"></span>
            <span>{currentDate}</span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
