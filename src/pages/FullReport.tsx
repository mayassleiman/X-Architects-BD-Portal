import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ArrowLeft, Printer, Settings } from "lucide-react";
import { Meetings, MeetingsWrapperForStats } from "./Meetings";
import { AchievedTarget } from "./AchievedTarget";
import { RecentEngagements } from "./RecentEngagements";
import { Pipeline } from "./Pipeline";
import { Tasks } from "./Tasks";
import { Registrations } from "./Registrations";
import { Logo } from "../components/ui/Logo";

export function FullReport() {
  const [currentDate, setCurrentDate] = React.useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [reportMeetingDate, setReportMeetingDate] = useState<Date>(new Date());
  
  // Section visibility state
  const [sections, setSections] = useState({
    target: true,
    pipeline: true,
    meetingsSchedule: true,
    meetingsAnalytics: true,
    tasks: true,
    registrations: true,
    engagements: true
  });

  // Date range states
  const [registrationsDateRange, setRegistrationsDateRange] = useState({ startDate: "", endDate: "" });
  const [engagementsDateRange, setEngagementsDateRange] = useState({ startDate: "", endDate: "" });

  React.useEffect(() => {
    const now = new Date();
    // Format: "Monday 02 March 2026"
    const formattedDate = now.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      day: '2-digit',
      month: 'long', 
      year: 'numeric'
    }).replace(',', ''); // Remove comma if present
    setCurrentDate(formattedDate);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const toggleSection = (key: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 print:pb-0">
      {/* Screen-only Controls */}
      <div className="flex items-center justify-between mb-8 print:hidden">
        <Link to="/" className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft size={20} />
          <span className="text-sm font-mono uppercase tracking-wider">Back to Dashboard</span>
        </Link>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] text-[var(--text-primary)] text-xs font-bold uppercase tracking-wider hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <Settings size={16} /> Report Settings
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-bold uppercase tracking-wider hover:bg-[var(--text-secondary)] transition-colors"
          >
            <Printer size={16} /> Print Report
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-8 p-6 bg-[var(--card-bg)] border border-[var(--border)] print:hidden">
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4 uppercase">Report Configuration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-sm font-mono text-[var(--text-secondary)] mb-3 uppercase">Include Sections</h4>
              <div className="space-y-2">
                {Object.entries(sections).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={value} 
                      onChange={() => toggleSection(key as keyof typeof sections)}
                      className="rounded border-[var(--border)] text-[var(--text-primary)] focus:ring-[var(--text-primary)]"
                    />
                    <span className="text-sm text-[var(--text-primary)] capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-mono text-[var(--text-secondary)] mb-3 uppercase">Registrations Date Range</h4>
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    type="date" 
                    value={registrationsDateRange.startDate}
                    onChange={e => setRegistrationsDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] text-sm focus:border-[var(--text-primary)] focus:outline-none"
                  />
                  <input 
                    type="date" 
                    value={registrationsDateRange.endDate}
                    onChange={e => setRegistrationsDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] text-sm focus:border-[var(--text-primary)] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-mono text-[var(--text-secondary)] mb-3 uppercase">Engagements Date Range</h4>
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    type="date" 
                    value={engagementsDateRange.startDate}
                    onChange={e => setEngagementsDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] text-sm focus:border-[var(--text-primary)] focus:outline-none"
                  />
                  <input 
                    type="date" 
                    value={engagementsDateRange.endDate}
                    onChange={e => setEngagementsDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] text-sm focus:border-[var(--text-primary)] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cover Page for Print */}
      <div className="hidden print:flex flex-col items-center justify-center h-screen w-full break-after-page bg-white relative z-[10000]">
        <div className="mb-16">
          <Logo showText={false} className="[&>img]:!h-48 [&>img]:!max-w-[600px]" />
        </div>
        <h1 className="text-5xl font-light tracking-tight text-[var(--text-primary)] mb-4 uppercase text-center mt-12">
          KSA Business Development<br/>Weekly Action Sheet {new Date().getFullYear()}
        </h1>
        <p className="text-[var(--text-secondary)] font-medium text-2xl mt-8">{currentDate}</p>
        <div className="mt-auto pb-12 text-[var(--text-tertiary)] font-mono text-sm uppercase tracking-widest flex flex-col items-center gap-4">
          <span>Confidential Internal Report</span>
          <span className="text-[10px] opacity-70">Created by Mayas Sleiman - KSA Projects Director</span>
        </div>
      </div>

      <table className="w-full">
        <thead className="print:table-header-group">
          <tr>
            <td>
              <div className="border-b border-[var(--border)] pb-8 mb-8 print:border-none print:pb-4 print:mb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-4xl font-light tracking-tight text-[var(--text-primary)] mb-2 uppercase print:hidden">
                    KSA Business Development Weekly Action Sheet {new Date().getFullYear()}
                  </h1>
                  <h1 className="hidden print:block text-2xl font-light tracking-tight text-[var(--text-primary)] mb-2 uppercase">
                    Weekly Action Sheet
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
          {sections.target && (
            <tr>
              <td className="pb-8">
                {/* Yearly Target Section */}
                <section>
                  <div className="mb-6 border-l-2 border-[var(--text-primary)] pl-4">
                    <h2 className="text-2xl font-light tracking-tight text-[var(--text-primary)]">YEARLY TARGET</h2>
                    <p className="text-[var(--text-secondary)] font-mono text-xs uppercase tracking-wider mt-1">Performance & Goals</p>
                  </div>
                  <AchievedTarget isReportView={true} />
                </section>
              </td>
            </tr>
          )}
          {sections.pipeline && (
            <tr>
              <td className="pb-8">
                {/* Pipeline Section */}
                <section className="break-inside-avoid">
                  <div className="mb-6 border-l-2 border-[var(--text-primary)] pl-4">
                    <h2 className="text-2xl font-light tracking-tight text-[var(--text-primary)]">PIPELINE OVERVIEW</h2>
                    <p className="text-[var(--text-secondary)] font-mono text-xs uppercase tracking-wider mt-1">Active RFPs & VOs</p>
                  </div>
                  <Pipeline isReportView={true} />
                </section>
              </td>
            </tr>
          )}
          {sections.meetingsSchedule && (
            <tr>
              <td className="pb-8">
                {/* Meetings Section - Weekly View */}
                <section className="break-inside-avoid">
                  <div className="mb-6 border-l-2 border-[var(--text-primary)] pl-4">
                    <h2 className="text-2xl font-light tracking-tight text-[var(--text-primary)]">MEETINGS SCHEDULE</h2>
                    <p className="text-[var(--text-secondary)] font-mono text-xs uppercase tracking-wider mt-1">Weekly Overview</p>
                  </div>
                  <Meetings 
                    isReportView={true} 
                    controlledDate={reportMeetingDate}
                  />
                </section>
              </td>
            </tr>
          )}
          {sections.meetingsAnalytics && (
            <tr>
              <td className="pb-8">
                {/* Meetings Section - Charts */}
                <section className="break-inside-avoid">
                  <div className="mb-6 border-l-2 border-[var(--text-primary)] pl-4">
                    <h2 className="text-2xl font-light tracking-tight text-[var(--text-primary)]">MEETINGS ANALYTICS</h2>
                    <p className="text-[var(--text-secondary)] font-mono text-xs uppercase tracking-wider mt-1">Distribution & Counts</p>
                  </div>
                  <MeetingsChartOnly 
                    onWeekSelect={(date) => setReportMeetingDate(date)}
                    controlledDate={reportMeetingDate}
                  />
                </section>
              </td>
            </tr>
          )}
          {sections.tasks && (
            <tr>
              <td className="pb-8">
                {/* Tasks Section */}
                <section className="break-inside-avoid">
                  <div className="mb-6 border-l-2 border-[var(--text-primary)] pl-4">
                    <h2 className="text-2xl font-light tracking-tight text-[var(--text-primary)]">TASKS</h2>
                    <p className="text-[var(--text-secondary)] font-mono text-xs uppercase tracking-wider mt-1">Business Development Pipeline</p>
                  </div>
                  <Tasks isReportView={true} />
                </section>
              </td>
            </tr>
          )}
          {sections.registrations && (
            <tr>
              <td className="pb-8">
                {/* Registrations Section */}
                <section className="break-inside-avoid">
                  <div className="mb-6 border-l-2 border-[var(--text-primary)] pl-4">
                    <h2 className="text-2xl font-light tracking-tight text-[var(--text-primary)]">REGISTRATIONS</h2>
                    <p className="text-[var(--text-secondary)] font-mono text-xs uppercase tracking-wider mt-1">Companies Registered in Selected Period</p>
                  </div>
                  <Registrations isReportView={true} startDate={registrationsDateRange.startDate} endDate={registrationsDateRange.endDate} />
                </section>
              </td>
            </tr>
          )}
          {sections.engagements && (
            <tr>
              <td className="pb-8">
                {/* Recent Engagements Section */}
                <section className="break-inside-avoid">
                  <div className="mb-6 border-l-2 border-[var(--text-primary)] pl-4">
                    <h2 className="text-2xl font-light tracking-tight text-[var(--text-primary)]">RECENT ENGAGEMENTS</h2>
                    <p className="text-[var(--text-secondary)] font-mono text-xs uppercase tracking-wider mt-1">Engagements for Selected Period</p>
                  </div>
                  <RecentEngagements startDate={engagementsDateRange.startDate} endDate={engagementsDateRange.endDate} />
                </section>
              </td>
            </tr>
          )}
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
      
      {/* Screen-only Footer */}
      <div className="print:hidden mt-12 pt-6 border-t border-[var(--border)] flex flex-col gap-2 text-[var(--text-secondary)] text-xs font-mono uppercase tracking-wider">
        <div className="flex justify-between items-center">
          <span>Confidential Internal Report</span>
          <span>{currentDate}</span>
        </div>
        <div className="text-center mt-2 text-[10px] text-[var(--text-tertiary)] opacity-70">
          Created by Mayas Sleiman - KSA Projects Director
        </div>
      </div>
    </div>
  );
}

function MeetingsChartOnly({ 
  onWeekSelect, 
  controlledDate 
}: { 
  onWeekSelect?: (date: Date) => void,
  controlledDate?: Date
}) {
    return <MeetingsWrapperForStats 
      onWeekSelect={onWeekSelect}
      controlledDate={controlledDate}
    />;
}
