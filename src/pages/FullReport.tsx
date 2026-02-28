import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { Meetings, MeetingsWrapperForStats } from "./Meetings";
import { AchievedTarget } from "./AchievedTarget";
import { RecentEngagements } from "./RecentEngagements";
import { Pipeline } from "./Pipeline";
import { Tasks } from "./Tasks";
import { Logo } from "../components/ui/Logo";

export function FullReport() {
  const [currentDate, setCurrentDate] = React.useState("");

  React.useEffect(() => {
    const now = new Date();
    setCurrentDate(now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }));
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20 print:space-y-8 print:pb-0">
      {/* Report Header */}
      <div className="flex items-center justify-between print:hidden">
        <Link to="/" className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft size={20} />
          <span className="text-sm font-mono uppercase tracking-wider">Back to Dashboard</span>
        </Link>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-bold uppercase tracking-wider hover:bg-[var(--text-secondary)] transition-colors"
        >
          <Printer size={16} /> Print Report
        </button>
      </div>

      <div className="border-b border-[var(--border)] pb-8 print:border-none print:pb-4 relative">
        <div className="absolute top-0 right-0 hidden print:block md:block">
           <Logo className="scale-90 origin-top-right" />
        </div>
        <div className="flex justify-between items-end pt-12">
          <div>
            <h1 className="text-5xl font-light tracking-tight text-[var(--text-primary)] mb-2">FULL REPORT</h1>
            <p className="text-[var(--text-secondary)] font-mono text-sm uppercase tracking-wider">Comprehensive Status Overview</p>
          </div>
          <div className="text-right">
            <p className="text-[var(--text-secondary)] font-mono text-xs uppercase tracking-wider mb-1">Generated On</p>
            <p className="text-[var(--text-primary)] font-medium">{currentDate}</p>
          </div>
        </div>
      </div>

      {/* Yearly Target Section */}
      <section className="break-inside-avoid page-break-after-always">
        <div className="mb-6 border-l-2 border-[var(--text-primary)] pl-4">
          <h2 className="text-2xl font-light tracking-tight text-[var(--text-primary)]">YEARLY TARGET</h2>
          <p className="text-[var(--text-secondary)] font-mono text-xs uppercase tracking-wider mt-1">Performance & Goals</p>
        </div>
        <AchievedTarget isReportView={true} />
      </section>

      {/* Pipeline Section */}
      <section className="break-inside-avoid page-break-after-always">
        <div className="mb-6 border-l-2 border-[var(--text-primary)] pl-4">
          <h2 className="text-2xl font-light tracking-tight text-[var(--text-primary)]">PIPELINE OVERVIEW</h2>
          <p className="text-[var(--text-secondary)] font-mono text-xs uppercase tracking-wider mt-1">Active RFPs & VOs</p>
        </div>
        <Pipeline isReportView={true} />
      </section>

      {/* Meetings Section - Weekly View */}
      <section className="break-inside-avoid page-break-after-always">
        <div className="mb-6 border-l-2 border-[var(--text-primary)] pl-4">
          <h2 className="text-2xl font-light tracking-tight text-[var(--text-primary)]">MEETINGS SCHEDULE</h2>
          <p className="text-[var(--text-secondary)] font-mono text-xs uppercase tracking-wider mt-1">Weekly Overview</p>
        </div>
        <Meetings isReportView={true} />
      </section>

      {/* Meetings Section - Charts */}
      <section className="break-inside-avoid page-break-after-always">
        <div className="mb-6 border-l-2 border-[var(--text-primary)] pl-4">
          <h2 className="text-2xl font-light tracking-tight text-[var(--text-primary)]">MEETINGS ANALYTICS</h2>
          <p className="text-[var(--text-secondary)] font-mono text-xs uppercase tracking-wider mt-1">Distribution & Counts</p>
        </div>
        <MeetingsChartOnly />
      </section>

      {/* Tasks Section */}
      <section className="break-inside-avoid page-break-after-always">
        <div className="mb-6 border-l-2 border-[var(--text-primary)] pl-4">
          <h2 className="text-2xl font-light tracking-tight text-[var(--text-primary)]">TASKS</h2>
          <p className="text-[var(--text-secondary)] font-mono text-xs uppercase tracking-wider mt-1">Business Development Pipeline</p>
        </div>
        <Tasks isReportView={true} />
      </section>

      {/* Recent Engagements Section */}
      <section className="break-inside-avoid">
        <div className="mb-6 border-l-2 border-[var(--text-primary)] pl-4">
          <h2 className="text-2xl font-light tracking-tight text-[var(--text-primary)]">RECENT ENGAGEMENTS</h2>
          <p className="text-[var(--text-secondary)] font-mono text-xs uppercase tracking-wider mt-1">Past 10 Days</p>
        </div>
        <RecentEngagements />
      </section>

      {/* Footer Stamp */}
      <div className="mt-12 pt-6 border-t border-[var(--border)] flex justify-between items-center text-[var(--text-secondary)] text-xs font-mono uppercase tracking-wider print:flex hidden">
        <span>Confidential Internal Report</span>
        <span>{currentDate}</span>
      </div>
    </div>
  );
}

function MeetingsChartOnly() {
    return <MeetingsWrapperForStats />;
}
