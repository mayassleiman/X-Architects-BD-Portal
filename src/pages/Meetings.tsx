import React from "react";
import { Plus, X, Trash2, Calendar as CalendarIcon, Clock, User, List, Grid, Edit2 } from "lucide-react";
import { cn } from "../lib/utils";
import { useSearch } from "../context/SearchContext";

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

export function Meetings() {
  const { searchQuery } = useSearch();
  const [meetings, setMeetings] = React.useState<Meeting[]>([]);
  const [viewMode, setViewMode] = React.useState<'list' | 'calendar'>('list');
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

  const filteredMeetings = meetings.filter(meeting => 
    meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    meeting.attendees.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
    const attendeesList = formData.attendees.split(',').map(s => s.trim()).filter(Boolean);
    
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
    try {
      await fetch(`/api/meetings/${id}`, { method: 'DELETE' });
      fetchMeetings();
    } catch (error) {
      console.error("Error deleting meeting", error);
    }
  };

  // Group meetings by date for calendar view
  const meetingsByDate = filteredMeetings.reduce((acc, meeting) => {
    const date = meeting.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(meeting);
    return acc;
  }, {} as Record<string, Meeting[]>);

  // Get current week dates
  const getWeekDates = () => {
    const dates = [];
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(today.setDate(diff));

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const weekDates = getWeekDates();
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const handleDragStart = (e: React.DragEvent, meetingId: number) => {
    e.dataTransfer.setData("meetingId", meetingId.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, date: string) => {
    e.preventDefault();
    const meetingId = parseInt(e.dataTransfer.getData("meetingId"));
    if (!meetingId) return;

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
          <p className="text-[var(--text-secondary)] font-mono text-sm uppercase tracking-wider">Schedule & Coordination</p>
        </div>
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
      </div>

      {viewMode === 'list' ? (
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
                className="min-h-[200px] border-r border-[var(--border)] last:border-r-0 p-2 space-y-2 transition-colors hover:bg-[var(--bg-tertiary)]"
                onDragOver={handleDragOver}
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
