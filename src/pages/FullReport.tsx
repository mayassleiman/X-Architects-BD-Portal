import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { Actions } from "./Actions";
import { Registrations } from "./Registrations";
import { Meetings, MeetingsWrapperForStats } from "./Meetings";
import { AchievedTarget } from "./AchievedTarget";
import { RecentEngagements } from "./RecentEngagements";

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

      <div className="border-b border-[var(--border)] pb-8 print:border-none print:pb-4">
        <div className="flex justify-between items-end">
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

      {/* Recent Engagements Section */}
      <section className="break-inside-avoid">
        <div className="mb-6 border-l-2 border-[var(--text-primary)] pl-4">
          <h2 className="text-2xl font-light tracking-tight text-[var(--text-primary)]">RECENT ENGAGEMENTS</h2>
          <p className="text-[var(--text-secondary)] font-mono text-xs uppercase tracking-wider mt-1">Past 10 Days</p>
        </div>
        <RecentEngagements />
      </section>

      {/* Yearly Target Section */}
      <section className="break-inside-avoid page-break-after-always">
        <div className="mb-6 border-l-2 border-[var(--text-primary)] pl-4">
          <h2 className="text-2xl font-light tracking-tight text-[var(--text-primary)]">YEARLY TARGET</h2>
          <p className="text-[var(--text-secondary)] font-mono text-xs uppercase tracking-wider mt-1">Performance & Goals</p>
        </div>
        <AchievedTarget isReportView={true} />
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
        {/* We reuse Meetings component but force stats view by passing a prop or we extract stats. 
            Since Meetings component manages its own view state, we might need to adjust it to support forcing a view via props 
            or just render it and let it be. 
            However, the user asked for "another slide has to present the meetings chart".
            The current Meetings component has a 'stats' view. 
            I'll modify Meetings.tsx to accept a 'forceViewMode' prop if I can, or just duplicate the chart logic here.
            Actually, let's just render Meetings again but we need to tell it to show stats.
            I'll update Meetings.tsx to accept `initialViewMode` or similar.
        */}
        <MeetingsChartOnly />
      </section>

      {/* Registrations Section */}
      <section className="break-inside-avoid page-break-after-always">
        <div className="mb-6 border-l-2 border-[var(--text-primary)] pl-4">
          <h2 className="text-2xl font-light tracking-tight text-[var(--text-primary)]">REGISTRATIONS</h2>
          <p className="text-[var(--text-secondary)] font-mono text-xs uppercase tracking-wider mt-1">Recent Follow-ups</p>
        </div>
        <Registrations isReportView={true} />
      </section>

      {/* Actions Section */}
      <section className="break-inside-avoid">
        <div className="mb-6 border-l-2 border-[var(--text-primary)] pl-4">
          <h2 className="text-2xl font-light tracking-tight text-[var(--text-primary)]">ACTION ITEMS</h2>
          <p className="text-[var(--text-secondary)] font-mono text-xs uppercase tracking-wider mt-1">Pending Tasks</p>
        </div>
        <Actions isReportView={true} />
      </section>

      {/* Footer Stamp */}
      <div className="mt-12 pt-6 border-t border-[var(--border)] flex justify-between items-center text-[var(--text-secondary)] text-xs font-mono uppercase tracking-wider print:flex hidden">
        <span>Confidential Internal Report</span>
        <span>{currentDate}</span>
      </div>
    </div>
  );
}

// Helper component to show only charts from Meetings
// Since we can't easily force state in the functional component without changing its API significantly,
// and I already modified Meetings to use isReportView to force 'calendar', 
// I should probably modify Meetings to accept a specific view mode override.
// But for now, I'll just duplicate the chart rendering logic or import it if it was a separate component.
// It's inside Meetings.tsx. 
// Let's modify Meetings.tsx to export the Stats view or accept a prop.
// I'll update Meetings.tsx one more time to accept `defaultViewMode`.

function MeetingsChartOnly() {
    return <MeetingsWrapperForStats />;
} 
