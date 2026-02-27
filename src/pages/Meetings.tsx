import React, { useMemo } from "react";
import { Plus, X, Trash2, Calendar as CalendarIcon, Clock, User, List, Grid, Edit2, BarChart2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";
import { useSearch } from "../context/SearchContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Meeting {
  id: number;
  title: string;
  date: string;
  time: string;
  attendees: string[];
  level: number;
}

const LEVELS = [
  { id: 1, label: "Lead", color: "text-neutral-400 border-neutral-700 bg-neutral-800/50" },
  { id: 2, label: "Prospect", color: "text-blue-400 border-blue-500/50 bg-blue-900/20" },
  { id: 3, label: "Proposal", color: "text-amber-400 border-amber-500/50 bg-amber-900/20" },
  { id: 4, label: "Negotiation", color: "text-emerald-400 border-emerald-500/50 bg-emerald-900/20" },
];

export function Meetings({ isReportView = false, defaultViewMode = 'list' }: { isReportView?: boolean, defaultViewMode?: 'list' | 'calendar' | 'stats' }) {
  const { searchQuery } = useSearch();
  const [meetings, setMeetings] = React.useState<Meeting[]>([]);
  const [viewMode, setViewMode] = React.useState<'list' | 'calendar' | 'stats'>(defaultViewMode);
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [formData, setFormData] = React.useState({
    title: "",
    date: new Date().toISOString().split('T')[0],
    time: "10:00",
    attendees: "",
    level: 1
  });

  const fetchMeetings = () => {
    fetch('/api/meetings')
      .then(res => res.json())
      .then(data => setMeetings(data))
      .catch(err => console.error("Failed to fetch meetings", err));
  };

  React.useEffect(() => {
    fetchMeetings();
  }, []);

  React.useEffect(() => {
    if (isReportView && defaultViewMode === 'list') {
      setViewMode('calendar'); // Default report view is calendar (weekly)
    } else if (defaultViewMode) {
      setViewMode(defaultViewMode);
    }
  }, [isReportView, defaultViewMode]);

  const filteredMeetings = meetings.filter(meeting => 
    (meeting.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (meeting.attendees || []).some(a => (a || "").toLowerCase().includes(searchQuery.toLowerCase())) ||
    (meeting.date || "").includes(searchQuery) // Allow searching by date
  );

  // Statistics Calculations
  const stats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();

    // Helper to get week number
    const getWeek = (date: Date) => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };

    // Weekly Stats (Last 8 weeks)
    const weeklyData = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - (i * 7));
      const weekNum = getWeek(d);
      const year = d.getFullYear();
      
      const count = meetings.filter(m => {
        const mDate = new Date(m.date);
        return getWeek(mDate) === weekNum && mDate.getFullYear() === year;
      }).length;

      weeklyData.push({ name: `Week ${weekNum}`, count });
    }

    // Monthly Stats (Last 12 months)
    const monthlyData = [];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthIndex = d.getMonth();
      const year = d.getFullYear();

      const count = meetings.filter(m => {
        const mDate = new Date(m.date);
        return mDate.getMonth() === monthIndex && mDate.getFullYear() === year;
      }).length;

      monthlyData.push({ name: `${months[monthIndex]}`, count });
    }

    // Quarterly Stats (Current Year)
    const quarterlyData = [
      { name: "Q1", count: 0 },
      { name: "Q2", count: 0 },
      { name: "Q3", count: 0 },
      { name: "Q4", count: 0 },
    ];

    meetings.forEach(m => {
      const mDate = new Date(m.date);
      if (mDate.getFullYear() === currentYear) {
        const month = mDate.getMonth();
        const quarter = Math.floor(month / 3);
        quarterlyData[quarter].count++;
      }
    });

    return { weeklyData, monthlyData, quarterlyData };
  }, [meetings]);

  const handleEdit = (meeting: Meeting) => {
    setEditingId(meeting.id);
    setFormData({
      title: meeting.title,
      date: meeting.date,
      time: meeting.time,
      attendees: meeting.attendees.join(", "),
      level: meeting.level
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const attendeesList = (formData.attendees || "").split(',').map(s => s.trim()).filter(Boolean);
    
    try {
      const url = editingId ? `/api/meetings/${editingId}` : '/api/meetings';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          attendees: attendeesList
        })
      });
      if (res.ok) {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ title: "", date: new Date().toISOString().split('T')[0], time: "10:00", attendees: "", level: 1 });
        fetchMeetings();
      } else {
        console.error("Failed to save meeting");
      }
    } catch (error) {
      console.error("Error saving meeting", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this meeting?")) return;
    
    // Optimistic update
    const previousMeetings = [...meetings];
    setMeetings(meetings.filter(m => m.id !== id));

    try {
      await fetch(`/api/meetings/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error("Error deleting meeting", error);
      setMeetings(previousMeetings);
      alert("Failed to delete meeting");
    }
  };

  // Group meetings by date for calendar view
  const meetingsByDate = filteredMeetings.reduce((acc, meeting) => {
    const date = meeting.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(meeting);
    return acc;
  }, {} as Record<string, Meeting[]>);

  // Get current week dates based on currentDate state
  const getWeekDates = () => {
    const dates = [];
    const baseDate = new Date(currentDate);
    const currentDay = baseDate.getDay(); // 0 is Sunday
    const diff = baseDate.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(baseDate.setDate(diff));

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const weekDates = getWeekDates();
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const handlePrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const [dragOverDate, setDragOverDate] = React.useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, meetingId: number) => {
    e.dataTransfer.setData("meetingId", meetingId.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, date: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDate(date);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = async (e: React.DragEvent, date: string) => {
    e.preventDefault();
    setDragOverDate(null);
    const meetingId = parseInt(e.dataTransfer.getData("meetingId"));
    if (!meetingId && meetingId !== 0) return;

    const meeting = meetings.find(m => m.id === meetingId);
    if (!meeting) return;

    if (meeting.date === date) return; // No change

    // Optimistic update
    const updatedMeeting = { ...meeting, date };
    setMeetings(meetings.map(m => m.id === meetingId ? updatedMeeting : m));

    try {
      await fetch(`/api/meetings/${meetingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedMeeting)
      });
      fetchMeetings(); // Refresh to ensure sync
    } catch (error) {
      console.error("Error moving meeting", error);
      fetchMeetings(); // Revert on error
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-4xl font-light tracking-tight text-[var(--text-primary)] mb-2">MEETINGS</h1>
          <div className="flex items-center gap-4">
            <p className="text-[var(--text-secondary)] font-mono text-sm uppercase tracking-wider">Schedule & Coordination</p>
            {viewMode === 'calendar' && (
              <div className="flex items-center gap-2 ml-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-1">
                <button onClick={handlePrevWeek} className="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors">
                  <ChevronLeft size={14} className="text-[var(--text-secondary)]" />
                </button>
                <span className="text-xs font-mono text-[var(--text-primary)] px-2 min-w-[140px] text-center">
                  {new Date(weekDates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(weekDates[6]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <button onClick={handleNextWeek} className="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors">
                  <ChevronRight size={14} className="text-[var(--text-secondary)]" />
                </button>
                <button onClick={handleToday} className="text-[10px] font-bold uppercase px-2 py-1 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] ml-1">
                  Today
                </button>
              </div>
            )}
          </div>
        </div>
        {!isReportView && (
          <div className="flex items-center gap-4">
            <div className="flex bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-1">
              <button 
                onClick={() => setViewMode('list')}
                className={cn("p-2 rounded transition-colors", viewMode === 'list' ? "bg-[var(--text-primary)] text-[var(--bg-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")}
              >
                <List size={16} />
              </button>
              <button 
                onClick={() => setViewMode('calendar')}
                className={cn("p-2 rounded transition-colors", viewMode === 'calendar' ? "bg-[var(--text-primary)] text-[var(--bg-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")}
              >
                <Grid size={16} />
              </button>
              <button 
                onClick={() => setViewMode('stats')}
                className={cn("p-2 rounded transition-colors", viewMode === 'stats' ? "bg-[var(--text-primary)] text-[var(--bg-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")}
              >
                <BarChart2 size={16} />
              </button>
            </div>
            <button 
              onClick={() => {
                setEditingId(null);
                setFormData({ title: "", date: new Date().toISOString().split('T')[0], time: "10:00", attendees: "", level: 1 });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-bold uppercase tracking-wider hover:bg-[var(--text-secondary)] transition-colors"
            >
              <Plus size={16} /> Schedule
            </button>
          </div>
        )}
      </div>

      {viewMode === 'stats' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Stats */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-6">Weekly Meetings (Last 8 Weeks)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{ fill: 'var(--bg-tertiary)' }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Stats */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-6">Monthly Meetings (Last 12 Months)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{ fill: 'var(--bg-tertiary)' }}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quarterly Stats */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 lg:col-span-2">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-6">Quarterly Meetings (Current Year)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.quarterlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{ fill: 'var(--bg-tertiary)' }}
                  />
                  <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMeetings.length === 0 ? (
            <div className="col-span-full p-12 text-center border border-dashed border-[var(--border)] rounded-lg">
              <p className="text-[var(--text-secondary)]">No meetings found.</p>
            </div>
          ) : (
            filteredMeetings.map((meeting) => {
              const levelInfo = LEVELS.find(l => l.id === meeting.level) || LEVELS[0];
              return (
                <div key={meeting.id} className="bg-[var(--card-bg)] border border-[var(--border)] p-6 group hover:border-[var(--border-hover)] transition-colors relative flex flex-col break-inside-avoid">
                  {!isReportView && (
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                      <button 
                        onClick={() => handleEdit(meeting)}
                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(meeting.id)}
                        className="text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 mb-4">
                    <span className={cn("text-[10px] uppercase tracking-wider px-2 py-1 rounded border", levelInfo.color)}>
                      {levelInfo.label}
                    </span>
                  </div>

                  <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">{meeting.title}</h3>
                  
                  <div className="space-y-3 mt-auto">
                    <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                      <CalendarIcon size={14} />
                      <span>{meeting.date}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                      <Clock size={14} />
                      <span>{meeting.time}</span>
                    </div>
                    {meeting.attendees && meeting.attendees.length > 0 && (
                      <div className="flex items-start gap-3 text-sm text-[var(--text-secondary)] pt-2 border-t border-[var(--border)]">
                        <User size={14} className="mt-0.5" />
                        <div className="flex flex-wrap gap-1">
                          {meeting.attendees.map((att, i) => (
                            <span key={i} className="bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-xs">{att}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 overflow-x-auto">
          <div className="grid grid-cols-7 gap-4 min-w-[800px]">
            {days.map((day, i) => (
              <div key={day} className="text-center border-b border-[var(--border)] pb-2 mb-2">
                <span className="text-xs font-mono uppercase text-[var(--text-secondary)] block">{day}</span>
                <span className="text-sm font-bold text-[var(--text-primary)]">{weekDates[i].split('-')[2]}</span>
              </div>
            ))}
            {weekDates.map((date) => (
              <div 
                key={date} 
                className={cn(
                  "min-h-[200px] border-r border-[var(--border)] last:border-r-0 p-2 space-y-2 transition-colors",
                  dragOverDate === date ? "bg-[var(--bg-tertiary)]" : "hover:bg-[var(--bg-tertiary)]"
                )}
                onDragOver={(e) => handleDragOver(e, date)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, date)}
              >
                {meetingsByDate[date]?.map((meeting) => {
                  const levelInfo = LEVELS.find(l => l.id === meeting.level) || LEVELS[0];
                  return (
                    <div 
                      key={meeting.id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, meeting.id)}
                      onClick={() => handleEdit(meeting)}
                      className={cn("p-2 rounded border text-xs mb-2 cursor-pointer hover:opacity-80 shadow-sm", levelInfo.color)}
                    >
                      <div className="font-bold truncate">{meeting.time}</div>
                      <div className="truncate font-medium">{meeting.title}</div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-light text-[var(--text-primary)] mb-6">
              {editingId ? "EDIT MEETING" : "SCHEDULE MEETING"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Title</label>
                <input 
                  type="text" 
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] text-sm focus:border-[var(--text-primary)] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Date</label>
                  <input 
                    type="date" 
                    required
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] text-sm focus:border-[var(--text-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Time</label>
                  <input 
                    type="time" 
                    required
                    value={formData.time}
                    onChange={e => setFormData({...formData, time: e.target.value})}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] text-sm focus:border-[var(--text-primary)] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Pipeline Level</label>
                <select 
                  value={formData.level}
                  onChange={e => setFormData({...formData, level: Number(e.target.value)})}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] text-sm focus:border-[var(--text-primary)] focus:outline-none"
                >
                  {LEVELS.map(l => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Attendees (comma separated)</label>
                <input 
                  type="text" 
                  value={formData.attendees}
                  onChange={e => setFormData({...formData, attendees: e.target.value})}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] text-sm focus:border-[var(--text-primary)] focus:outline-none"
                  placeholder="Client, John Doe, Jane Smith"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-[var(--text-primary)] text-[var(--bg-primary)] py-3 text-xs font-bold uppercase tracking-wider hover:bg-[var(--text-secondary)] transition-colors mt-4"
              >
                {editingId ? "Save Changes" : "Schedule Meeting"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function MeetingsWrapperForStats() {
  return <Meetings isReportView={true} defaultViewMode="stats" />;
}
