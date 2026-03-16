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

  return (
    <div className="max-w-7xl mx-auto pb-20 print:pb-0">
      {/* Screen-only Controls */}
      <div className="flex items-center justify-between mb-8 print:hidden">
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

      {/* Cover Page for Print */}
      <div className="hidden print:flex flex-col items-center justify-center h-screen w-full break-after-page">
        <div className="mb-16">
          <Logo showText={false} className="scale-[4]" />
        </div>
        <h1 className="text-5xl font-light tracking-tight text-[var(--text-primary)] mb-4 uppercase text-center mt-12">
          KSA Business Development<br/>Weekly Action Sheet {new Date().getFullYear()}
        </h1>
        <p className="text-[var(--text-secondary)] font-medium text-2xl mt-8">{currentDate}</p>
        <div className="mt-auto pb-12 text-[var(--text-tertiary)] font-mono text-sm uppercase tracking-widest">
          Confidential Internal Report
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
                <div className="hidden print:block md:block">
                   <Logo showText={false} className="scale-125 print:scale-[2.5] print:origin-right" />
                </div>
              </div>
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="pb-8">
              {/* Yearly Target Section */}
              <section className="break-inside-avoid">
                <div className="mb-6 border-l-2 border-[var(--text-primary)] pl-4">
                  <h2 className="text-2xl font-light tracking-tight text-[var(--text-primary)]">YEARLY TARGET</h2>
                  <p className="text-[var(--text-secondary)] font-mono text-xs uppercase tracking-wider mt-1">Performance & Goals</p>
                </div>
                <AchievedTarget isReportView={true} />
              </section>
            </td>
          </tr>
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
          <tr>
            <td className="pb-8">
              {/* Meetings Section - Weekly View */}
              <section className="break-inside-avoid">
                <div className="mb-6 border-l-2 border-[var(--text-primary)] pl-4">
                  <h2 className="text-2xl font-light tracking-tight text-[var(--text-primary)]">MEETINGS SCHEDULE</h2>
                  <p className="text-[var(--text-secondary)] font-mono text-xs uppercase tracking-wider mt-1">Weekly Overview</p>
                </div>
                <Meetings isReportView={true} />
              </section>
            </td>
          </tr>
          <tr>
            <td className="pb-8">
              {/* Meetings Section - Charts */}
              <section className="break-inside-avoid">
                <div className="mb-6 border-l-2 border-[var(--text-primary)] pl-4">
                  <h2 className="text-2xl font-light tracking-tight text-[var(--text-primary)]">MEETINGS ANALYTICS</h2>
                  <p className="text-[var(--text-secondary)] font-mono text-xs uppercase tracking-wider mt-1">Distribution & Counts</p>
                </div>
                <MeetingsChartOnly />
              </section>
            </td>
          </tr>
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
          <tr>
            <td className="pb-8">
              {/* Recent Engagements Section */}
              <section className="break-inside-avoid">
                <div className="mb-6 border-l-2 border-[var(--text-primary)] pl-4">
                  <h2 className="text-2xl font-light tracking-tight text-[var(--text-primary)]">RECENT ENGAGEMENTS</h2>
                  <p className="text-[var(--text-secondary)] font-mono text-xs uppercase tracking-wider mt-1">Past 10 Days</p>
                </div>
                <RecentEngagements />
              </section>
            </td>
          </tr>
        </tbody>
        <tfoot className="print:table-footer-group hidden">
          <tr>
            <td>
              <div className="mt-12 pt-6 border-t border-[var(--border)] flex justify-between items-center text-[var(--text-secondary)] text-xs font-mono uppercase tracking-wider">
                <span>Confidential Internal Report</span>
                <span>{currentDate}</span>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
      
      {/* Screen-only Footer (since tfoot is hidden by default and only shown in print via print:table-footer-group if supported, or we can just show it always) */}
      {/* Actually, let's make tfoot visible on screen too but styled appropriately */}
      <div className="print:hidden mt-12 pt-6 border-t border-[var(--border)] flex justify-between items-center text-[var(--text-secondary)] text-xs font-mono uppercase tracking-wider">
        <span>Confidential Internal Report</span>
        <span>{currentDate}</span>
      </div>
    </div>
  );
}

function MeetingsChartOnly() {
    return <MeetingsWrapperForStats />;
}
