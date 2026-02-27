import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CheckCircle2, Clock, CalendarDays, MoreHorizontal, TrendingUp } from "lucide-react";
import { cn } from "../lib/utils";

const metrics = [
  { label: "Total Actions", value: "24", change: "+12%", icon: CheckCircle2, color: "text-emerald-400" },
  { label: "Pending Regs", value: "08", change: "-2%", icon: Clock, color: "text-amber-400" },
  { label: "Meetings This Week", value: "12", change: "+4", icon: CalendarDays, color: "text-blue-400" },
];

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

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
  href?: string;
}

const Card: React.FC<CardProps> = ({ children, className, title, action, href }) => {
  const Content = (
    <div className={cn("bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-none relative group hover:border-[var(--border-hover)] transition-colors h-full", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-6">
          {title && <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--text-secondary)]">{title}</h3>}
          {action && <div className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors">{action}</div>}
        </div>
      )}
      {children}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[var(--border-hover)] opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[var(--border-hover)] opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[var(--border-hover)] opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[var(--border-hover)] opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );

  if (href) {
    return (
      <Link to={href} className={cn("block h-full", className)}>
        {/* Pass empty className to inner div because we applied it to the link */}
        {React.cloneElement(Content, { className: "" })}
      </Link>
    );
  }

  return Content;
};

export function Dashboard() {
  const [apiActions, setApiActions] = React.useState<any[]>([]);
  const [apiRegistrations, setApiRegistrations] = React.useState<any[]>([]);
  const [apiMeetings, setApiMeetings] = React.useState<any[]>([]);
  const [targetData, setTargetData] = React.useState<{ target: number, achieved: number }>({ target: 0, achieved: 0 });

  React.useEffect(() => {
    // Fetch Actions
    fetch('/api/actions')
      .then(res => res.ok ? res.json() : [])
      .then(data => setApiActions(data))
      .catch(err => console.log("Failed to fetch actions"));

    // Fetch Registrations
    fetch('/api/registrations')
      .then(res => res.ok ? res.json() : [])
      .then(data => setApiRegistrations(data))
      .catch(err => console.log("Failed to fetch registrations"));

    // Fetch Meetings
    fetch('/api/meetings')
      .then(res => res.ok ? res.json() : [])
      .then(data => setApiMeetings(data))
      .catch(err => console.log("Failed to fetch meetings"));

    // Fetch Target Data
    const currentYear = new Date().getFullYear();
    fetch(`/api/achieved-targets?year=${currentYear}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          const achieved = data.items.reduce((acc: number, item: any) => {
            const vals = item.item_values || {};
            const total = (vals.architecture || 0) + (vals.interior || 0) + (vals.cs || 0) + (vals.vo || 0);
            return acc + total;
          }, 0);
          setTargetData({ target: data.target, achieved });
        }
      })
      .catch(err => console.log("Failed to fetch target data"));
  }, []);

  const now = new Date();

  // Filter Actions (Pending or In Progress)
  const pendingActions = (apiActions.length > 0 ? apiActions : actions).filter((a: any) => 
    ['Pending', 'In Progress'].includes(a.status)
  );
  
  const displayActions = pendingActions.slice(0, 5);

  // Filter Meetings (Future only)
  const futureMeetings = (apiMeetings.length > 0 ? apiMeetings : meetings).filter((m: any) => {
    // Handle "Today" / "Tomorrow" for mock data if needed, though we prioritize API data
    if (m.date === 'Today') return true;
    if (m.date === 'Tomorrow') return true;
    
    const meetingDate = new Date(`${m.date}T${m.time || '00:00'}`);
    return meetingDate >= now;
  });

  // Sort and limit meetings
  const displayMeetings = futureMeetings
    .sort((a: any, b: any) => {
      const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
      const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 5);
  
  // Calculate metrics
  const pendingActionsCount = pendingActions.length;
  const pendingRegsCount = apiRegistrations.filter((r: any) => r.status === 'Pending').length;
  const upcomingMeetingsCount = futureMeetings.length;

  const targetPercentage = targetData.target > 0 ? (targetData.achieved / targetData.target) * 100 : 0;

  const realMetrics = [
    { label: "Pending Actions", value: pendingActionsCount.toString(), change: "Live", icon: CheckCircle2, color: "text-emerald-400", href: "/actions" },
    { label: "Pending Regs", value: pendingRegsCount.toString(), change: "Live", icon: Clock, color: "text-amber-400", href: "/registrations" },
    { label: "Upcoming Meetings", value: upcomingMeetingsCount.toString(), change: "Live", icon: CalendarDays, color: "text-blue-400", href: "/meetings" },
    { 
      label: "Yearly Target", 
      value: `${targetPercentage.toFixed(1)}%`, 
      subValue: `${(targetData.achieved / 1000000).toFixed(1)}M / ${(targetData.target / 1000000).toFixed(1)}M`,
      change: "YTD", 
      icon: TrendingUp, 
      color: "text-purple-400", 
      href: "/achieved-target",
      isProgress: true
    },
  ];

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Header Section */}
      <div className="col-span-12 mb-4 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-light tracking-tight text-[var(--text-primary)] mb-2">DASHBOARD</h1>
          <p className="text-[var(--text-secondary)] font-mono text-sm uppercase tracking-wider">Overview & Status Report</p>
        </div>
        <Link 
          to="/report"
          className="hidden md:flex items-center gap-2 px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-bold uppercase tracking-wider hover:bg-[var(--text-secondary)] transition-colors print:hidden"
        >
          View Full Report
        </Link>
      </div>

      {/* Metrics */}
      {realMetrics.map((metric, i) => (
        <div key={i} className="col-span-12 sm:col-span-6 lg:col-span-3">
          <Card href={metric.href}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">{metric.label}</p>
                <h2 className="text-3xl font-medium text-[var(--text-primary)]">{metric.value}</h2>
                {metric.subValue && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1 font-mono">{metric.subValue}</p>
                )}
              </div>
              <div className={cn("p-2 rounded-full bg-[var(--border)]", metric.color)}>
                <metric.icon size={20} />
              </div>
            </div>
            
            {metric.isProgress ? (
              <div className="mt-4">
                <div className="w-full bg-[var(--bg-tertiary)] h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-500", metric.color.replace('text-', 'bg-'))} 
                    style={{ width: `${Math.min(parseFloat(metric.value), 100)}%` }} 
                  />
                </div>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2 text-xs font-mono">
                <span className={metric.change.startsWith("+") ? "text-emerald-400" : "text-rose-400"}>
                  {metric.change}
                </span>
                <span className="text-[var(--text-tertiary)]">vs last week</span>
              </div>
            )}
          </Card>
        </div>
      ))}

      {/* Action List */}
      <div className="col-span-12 lg:col-span-8">
        <Card title="Action List" action={<ArrowUpRight size={16} />} href="/actions">
          <div className="space-y-4">
            {displayActions.map((action) => (
              <div key={action.id} className="flex items-center justify-between p-3 bg-[var(--card-bg-inner)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-neutral-700 group-hover:bg-[var(--text-primary)] transition-colors" />
                  <div>
                    <h4 className="text-sm font-medium text-[var(--text-primary)] transition-colors">{action.title}</h4>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mt-1">Resp: {action.responsible || "Unassigned"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className={cn(
                    "text-[10px] uppercase tracking-wider px-2 py-1 rounded border",
                    action.status === "Urgent" ? "border-rose-500/20 text-rose-400 bg-rose-500/5" :
                    action.status === "Pending" ? "border-amber-500/20 text-amber-400 bg-amber-500/5" :
                    "border-[var(--border)] text-[var(--text-tertiary)]"
                  )}>
                    {action.status || "Pending"}
                  </span>
                  <span className="text-xs font-mono text-[var(--text-secondary)] w-16 text-right">{action.due || action.due_date || "TBD"}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Meeting Tracker */}
      <div className="col-span-12 lg:col-span-4">
        <Card title="Upcoming Meetings" action={<MoreHorizontal size={16} />} href="/meetings">
          <div className="space-y-6 relative">
            <div className="absolute left-1.5 top-2 bottom-2 w-px bg-[var(--border)]" />
            {displayMeetings.map((meeting: any) => {
              // Format date if it's a standard date string
              let dateDisplay = meeting.date;
              if (meeting.date && !['Today', 'Tomorrow'].includes(meeting.date)) {
                try {
                  dateDisplay = new Date(meeting.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                } catch (e) {}
              }
              
              return (
                <div key={meeting.id} className="relative pl-6 group">
                  <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-[var(--card-bg)] border border-[var(--border)] group-hover:border-[var(--text-primary)] group-hover:bg-[var(--text-primary)] transition-colors z-10" />
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider">{dateDisplay} • {meeting.time}</span>
                    <h4 className="text-sm font-medium text-[var(--text-primary)] transition-colors">{meeting.title}</h4>
                    <div className="flex -space-x-2 mt-2">
                      {meeting.attendees && meeting.attendees.map((attendee: string, i: number) => (
                        <div key={i} className="w-6 h-6 rounded-full bg-neutral-800 border border-[var(--card-bg)] flex items-center justify-center text-[8px] text-neutral-400 font-mono uppercase" title={attendee}>
                          {attendee.charAt(0)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
