import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CheckCircle2, Clock, CalendarDays, MoreHorizontal, TrendingUp, Building2, Home, Landmark, Hotel, GraduationCap, HeartPulse, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "../lib/utils";

const actions = [
  { id: 1, title: "Review RFP for City Center", due: "Today", status: "Urgent", responsible: "J. Smith" },
  { id: 2, title: "Update Portfolio - Healthcare", due: "Tomorrow", status: "Pending", responsible: "A. Doe" },
  { id: 3, title: "Client Follow-up: Tech Corp", due: "Feb 24", status: "In Progress", responsible: "M. Lee" },
  { id: 4, title: "Submit Competition Entry", due: "Feb 28", status: "Review", responsible: "S. Chen" },
];

const meetings = [
  { id: 1, title: "Kickoff: Urban Redevelopment", time: "10:00 AM", date: "Today", attendees: ["Client", "Principal"] },
  { id: 2, title: "Internal Review: Q1 Goals", time: "02:00 PM", date: "Today", attendees: ["BD Team"] },
  { id: 3, title: "Site Visit: North Campus", time: "09:00 AM", date: "Tomorrow", attendees: ["Project Lead"] },
];

const sectorGrid = [
  { name: "Master Planning", icon: Landmark, count: "14 Projects" },
  { name: "Cultural & Civic", icon: Building2, count: "09 Projects" },
  { name: "Hospitality", icon: Hotel, count: "18 Projects" },
  { name: "Residential", icon: Home, count: "26 Projects" },
  { name: "Healthcare", icon: HeartPulse, count: "07 Projects" },
  { name: "Educational", icon: GraduationCap, count: "11 Projects" },
  { name: "Commercial & Retail", icon: Building2, count: "21 Projects" },
  { name: "Heritage & Religious", icon: Landmark, count: "05 Projects" },
  { name: "Interior Architecture", icon: Sparkles, count: "19 Projects" },
  { name: "Infrastructure / VO", icon: CheckCircle2, count: "08 Projects" },
];

interface EditorialCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
  href?: string;
}

const EditorialCard: React.FC<EditorialCardProps> = ({ children, className, title, action, href }) => {
  const content = (
    <div className={cn("bg-[var(--color-paper)] border border-[var(--color-ash)] p-6 md:p-8 rounded-none transition-colors hover:border-[var(--color-ink)] h-full relative", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--color-ash)]/60">
          {title && (
            <h3 className="text-[11px] font-mono uppercase tracking-[0.05em] text-[var(--color-ink)] font-semibold">
              {title}
            </h3>
          )}
          {action && (
            <div className="text-[var(--color-ink)]/70 hover:text-[var(--color-ink)] transition-colors">
              {action}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );

  if (href) {
    return (
      <Link to={href} className={cn("block h-full group", className)}>
        {React.cloneElement(content, { className: "" })}
      </Link>
    );
  }

  return content;
};

export function Dashboard() {
  const [apiActions, setApiActions] = React.useState<any[]>([]);
  const [apiRegistrations, setApiRegistrations] = React.useState<any[]>([]);
  const [apiMeetings, setApiMeetings] = React.useState<any[]>([]);
  const [targetData, setTargetData] = React.useState<{ target: number, achieved: number }>({ target: 0, achieved: 0 });

  React.useEffect(() => {
    const timestamp = Date.now();
    fetch(`/api/actions?_t=${timestamp}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setApiActions(data))
      .catch(() => {});

    fetch(`/api/registrations?_t=${timestamp}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setApiRegistrations(data))
      .catch(() => {});

    fetch(`/api/meetings?_t=${timestamp}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setApiMeetings(data))
      .catch(() => {});

    const currentYear = new Date().getFullYear();
    fetch(`/api/achieved-targets?year=${currentYear}&_t=${timestamp}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          const achieved = data.items.reduce((acc: number, item: any) => {
            const dateStr = item.achievedDate || item.submissionDate;
            if (!dateStr) return acc;
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return acc;

            const vals = item.values || {};
            const total = (Number(vals.architecture) || 0) + (Number(vals.interior) || 0) + (Number(vals.cs) || 0) + (Number(vals.vo) || 0);
            return acc + total;
          }, 0);
          setTargetData({ target: data.target, achieved });
        }
      })
      .catch(() => {});
  }, []);

  const now = new Date();

  const pendingActions = (apiActions.length > 0 ? apiActions : actions).filter((a: any) => 
    ['Pending', 'In Progress'].includes(a.status)
  );
  const displayActions = pendingActions.slice(0, 5);

  const futureMeetings = (apiMeetings.length > 0 ? apiMeetings : meetings).filter((m: any) => {
    if (m.date === 'Today' || m.date === 'Tomorrow') return true;
    const meetingDate = new Date(`${m.date}T${m.time || '00:00'}`);
    return meetingDate >= now;
  });

  const displayMeetings = futureMeetings
    .sort((a: any, b: any) => {
      const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
      const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 5);
  
  const pendingActionsCount = pendingActions.length;
  const pendingRegsCount = apiRegistrations.filter((r: any) => r.status === 'Pending').length;
  const upcomingMeetingsCount = futureMeetings.length;
  const targetPercentage = targetData.target > 0 ? (targetData.achieved / targetData.target) * 100 : 0;

  const editorialMetrics = [
    { 
      label: "Pending Actions", 
      value: pendingActionsCount.toString(), 
      detail: "Live Workflow Queue", 
      href: "/actions" 
    },
    { 
      label: "Pending Registrations", 
      value: pendingRegsCount.toString(), 
      detail: "Awaiting Pre-Qualification", 
      href: "/registrations" 
    },
    { 
      label: "Upcoming Meetings", 
      value: upcomingMeetingsCount.toString(), 
      detail: "Scheduled Client Sessions", 
      href: "/meetings" 
    },
    { 
      label: "Yearly Target Progress", 
      value: `${targetPercentage.toFixed(1)}%`, 
      detail: `${(targetData.achieved / 1000000).toFixed(2)}M / ${(targetData.target / 1000000).toFixed(2)}M AED`, 
      href: "/achieved-target",
      isTarget: true
    },
  ];

  return (
    <div className="space-y-10">
      {/* Editorial Hero Spread with Signature Iridescent Sphere & Concentric Ornaments */}
      <div className="relative overflow-hidden bg-[var(--color-paper)] border border-[var(--color-ash)] p-8 sm:p-12 lg:p-16">
        {/* Concentric Circle Ornaments */}
        <div className="absolute -right-20 -top-20 w-[480px] h-[480px] lg:w-[620px] lg:h-[620px] rounded-full border border-[var(--color-ash)]/70 pointer-events-none" />
        <div className="absolute -right-10 -top-10 w-[360px] h-[360px] lg:w-[480px] lg:h-[480px] rounded-full border border-[var(--color-ash)]/50 pointer-events-none" />
        <div className="absolute right-8 top-8 w-[240px] h-[240px] lg:w-[320px] lg:h-[320px] rounded-full border border-[var(--color-ash)]/40 pointer-events-none" />

        {/* The Iridescent Gradient Sphere — The Singular Chromatic Beacon */}
        <div 
          className="absolute right-6 sm:right-16 top-1/2 -translate-y-1/2 w-48 h-48 sm:w-72 sm:h-72 lg:w-96 lg:h-96 rounded-full pointer-events-none opacity-90 transition-transform duration-700 hover:scale-105"
          style={{
            background: 'linear-gradient(255deg, rgb(250, 203, 14), rgb(240, 107, 168) 30%, rgb(120, 186, 230) 65%, rgb(255, 255, 255))'
          }}
        />

        {/* Hero Content */}
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-2 h-2 rounded-full bg-[var(--color-ink)]" />
            <p className="text-[11px] font-mono uppercase tracking-[0.05em] text-[var(--color-ink)] font-semibold">
              ARCHITECTURAL BUSINESS DEVELOPMENT & OPERATIONS PORTAL
            </p>
          </div>

          {/* Monumental Headline stacked with 0.82 line-height */}
          <h1 className="text-5xl sm:text-7xl lg:text-[88px] font-normal uppercase leading-[0.82] tracking-tight text-[var(--color-ink)] mb-8">
            INTELLIGENCE<br />
            & OPERATIONS
          </h1>

          <p className="text-[15px] sm:text-[18px] text-[var(--color-ink)]/75 max-w-xl leading-relaxed mb-8">
            A comprehensive strategic dashboard governing tender proposals, client registrations, fee calculations, and yearly commercial targets.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link 
              to="/report" 
              className="ghost-link border border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-parchment)]"
            >
              Generate Full BD Report
              <span className="font-mono">→</span>
            </Link>
            <Link 
              to="/top-down-calc" 
              className="ghost-link text-[var(--color-ink)]/75 hover:text-[var(--color-ink)]"
            >
              Top-Down Fee Calculator
              <span className="font-mono">→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row — Flat Editorial Paper Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-mono uppercase tracking-[0.05em] text-[var(--color-ink)] font-semibold">
            KEY PERFORMANCE METRICS
          </span>
          <span className="text-[11px] font-mono text-[var(--color-ink)]/60 uppercase">
            LIVE SYNCHRONIZATION
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {editorialMetrics.map((metric, i) => (
            <EditorialCard key={i} href={metric.href}>
              <div className="flex flex-col justify-between h-full space-y-4">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-[0.05em] text-[var(--color-ink)]/70 mb-2">
                    {metric.label}
                  </p>
                  <h2 className="text-4xl sm:text-5xl font-light text-[var(--color-ink)] tracking-tight">
                    {metric.value}
                  </h2>
                </div>

                <div className="pt-3 border-t border-[var(--color-ash)]/60 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[var(--color-ink)]/60 truncate">
                    {metric.detail}
                  </span>
                  <span className="text-[12px] text-[var(--color-ink)] font-mono transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </div>
            </EditorialCard>
          ))}
        </div>
      </div>

      {/* Two-Column Editorial Spread: Action Queue & Upcoming Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Action List Section */}
        <div className="lg:col-span-7">
          <EditorialCard 
            title="ACTIVE ACTIONS & PROPOSALS" 
            action={
              <Link to="/actions" className="text-[11px] font-mono uppercase tracking-[0.05em] flex items-center gap-1 hover:underline">
                View All <ArrowRight size={12} />
              </Link>
            }
          >
            <div className="divide-y divide-[var(--color-ash)]/60">
              {displayActions.map((action) => (
                <div key={action.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between group">
                  <div className="space-y-1">
                    <h4 className="text-[15px] font-medium text-[var(--color-ink)] group-hover:text-black transition-colors">
                      {action.title}
                    </h4>
                    <p className="text-[11px] font-mono uppercase tracking-[0.05em] text-[var(--color-ink)]/60">
                      RESPONSIBLE: {action.responsible || "UNASSIGNED"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className={cn(
                      "text-[10px] uppercase font-mono tracking-[0.05em] px-2.5 py-1 rounded-[10px] border",
                      action.status === "Urgent" 
                        ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-parchment)]" 
                        : "border-[var(--color-ash)] text-[var(--color-ink)]"
                    )}>
                      {action.status || "Pending"}
                    </span>
                    <span className="text-[11px] font-mono text-[var(--color-ink)]/70 w-16 text-right">
                      {action.due || action.due_date || "TBD"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </EditorialCard>
        </div>

        {/* Meeting Diary Section */}
        <div className="lg:col-span-5">
          <EditorialCard 
            title="UPCOMING CLIENT SESSIONS" 
            action={
              <Link to="/meetings" className="text-[11px] font-mono uppercase tracking-[0.05em] flex items-center gap-1 hover:underline">
                Calendar <ArrowRight size={12} />
              </Link>
            }
          >
            <div className="space-y-4">
              {displayMeetings.length === 0 ? (
                <p className="text-[13px] font-mono text-[var(--color-ink)]/60 py-6 text-center">
                  No upcoming meetings scheduled
                </p>
              ) : (
                displayMeetings.map((meeting: any) => {
                  let dateDisplay = meeting.date;
                  if (meeting.date && !['Today', 'Tomorrow'].includes(meeting.date)) {
                    try {
                      dateDisplay = new Date(meeting.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    } catch (e) {}
                  }

                  return (
                    <div key={meeting.id} className="p-3.5 border border-[var(--color-ash)]/60 bg-[var(--color-paper)] hover:border-[var(--color-ink)] transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono uppercase tracking-[0.05em] text-[var(--color-ink)]/70">
                          {dateDisplay} • {meeting.time || "TBD"}
                        </span>
                        <span className="text-[10px] font-mono uppercase text-[var(--color-ink)]/50">
                          DIARY
                        </span>
                      </div>
                      <h4 className="text-[14px] font-medium text-[var(--color-ink)]">
                        {meeting.title}
                      </h4>
                    </div>
                  );
                })
              )}
            </div>
          </EditorialCard>
        </div>
      </div>

      {/* 2×5 Architectural Sector & Client Matrix */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-mono uppercase tracking-[0.05em] text-[var(--color-ink)] font-semibold">
            PORTFOLIO SECTOR MATRIX / 2×5 GRID
          </span>
          <span className="text-[11px] font-mono text-[var(--color-ink)]/60 uppercase">
            PRACTICE SPECIALIZATIONS
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 border-t border-l border-[var(--color-ash)] bg-[var(--color-paper)]">
          {sectorGrid.map((sector, index) => (
            <div 
              key={index} 
              className="p-5 border-r border-b border-[var(--color-ash)] flex flex-col justify-between hover:bg-[var(--color-stone)]/20 transition-colors group"
            >
              <div className="flex items-center justify-between mb-4">
                <sector.icon size={18} className="text-[var(--color-ink)] opacity-70 group-hover:opacity-100" />
                <span className="text-[9px] font-mono text-[var(--color-ink)]/50 uppercase">
                  {(index + 1).toString().padStart(2, '0')}
                </span>
              </div>
              <div>
                <h4 className="text-[13px] font-medium text-[var(--color-ink)] tracking-tight">
                  {sector.name}
                </h4>
                <p className="text-[10px] font-mono text-[var(--color-ink)]/60 uppercase mt-0.5">
                  {sector.count}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
