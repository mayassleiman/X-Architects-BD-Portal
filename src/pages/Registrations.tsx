import React from "react";
import { Plus, X, FileText, Trash2, Building2, User, Calendar, List, Grid, Edit2, Download } from "lucide-react";
import { cn } from "../lib/utils";
import { useSearch } from "../context/SearchContext";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Registration {
  id: number;
  client: string;
  contact_name: string;
  registration_date: string;
  portal_link: string;
  status: string;
  due_date: string;
  follow_up_log: string;
  last_week_follow_up: string;
  username?: string;
  password?: string;
}

import { ReportLayout } from "../components/layout/ReportLayout";

export function Registrations({ isReportView = false, currentDateOnly = false, limit, startDate, endDate }: { isReportView?: boolean, currentDateOnly?: boolean, limit?: number, startDate?: string, endDate?: string }) {
  const { searchQuery } = useSearch();
  const [registrations, setRegistrations] = React.useState<Registration[]>([]);
  const [selectedMonth, setSelectedMonth] = React.useState<string>("");
  const [swipedItemId, setSwipedItemId] = React.useState<number | null>(null);
  const [isSwipingActive, setIsSwipingActive] = React.useState(false);
  const swipeStart = React.useRef<{ x: number; y: number } | null>(null);

  const availableMonths = React.useMemo(() => {
    const monthsSet = new Set<string>();
    registrations.forEach(reg => {
      if (reg.registration_date) {
        const parts = reg.registration_date.split('-');
        if (parts.length >= 2) {
          monthsSet.add(`${parts[0]}-${parts[1]}`); // "YYYY-MM"
        }
      }
    });
    return Array.from(monthsSet).sort().reverse(); // Latest first
  }, [registrations]);

  const handleSwipeStart = (e: React.MouseEvent | React.TouchEvent, itemId: number) => {
    if (isReportView) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    swipeStart.current = { x: clientX, y: clientY };
    setIsSwipingActive(true);
  };

  const handleSwipeMove = (e: React.MouseEvent | React.TouchEvent, itemId: number, maxOffset: number) => {
    if (!swipeStart.current || !isSwipingActive) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    
    const dx = clientX - swipeStart.current.x;
    const dy = clientY - swipeStart.current.y;
    
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      swipeStart.current = null;
      setIsSwipingActive(false);
      return;
    }
    
    if (Math.abs(dx) > 10) {
      if (e.cancelable) {
        e.preventDefault();
      }
      const isCurrentlyOpen = swipedItemId === itemId;
      const baseOffset = isCurrentlyOpen ? -maxOffset : 0;
      let newOffset = baseOffset + dx;
      
      newOffset = Math.max(-maxOffset - 30, Math.min(15, newOffset));
      
      const el = document.getElementById(`reg-content-${itemId}`);
      if (el) {
        el.style.transform = `translateX(${newOffset}px)`;
        el.style.transition = "none";
      }
    }
  };

  const handleSwipeEnd = (itemId: number, maxOffset: number) => {
    if (!swipeStart.current) return;
    setIsSwipingActive(false);
    swipeStart.current = null;
    
    const el = document.getElementById(`reg-content-${itemId}`);
    if (el) {
      el.style.transition = "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
      
      const style = window.getComputedStyle(el);
      let currentTranslateX = 0;
      if (style.transform && style.transform !== "none") {
        const parts = style.transform.split(/[()]/)[1]?.split(",");
        if (parts) {
          currentTranslateX = parseFloat(parts[4] || parts[12] || "0");
        }
      }
      
      const isCurrentlyOpen = swipedItemId === itemId;
      const targetOffset = isCurrentlyOpen ? -maxOffset : 0;
      
      // If the user tapped on an open item without dragging, close it
      if (isCurrentlyOpen && Math.abs(currentTranslateX - targetOffset) < 5) {
        el.style.transform = "translateX(0px)";
        setSwipedItemId(null);
        return;
      }
      
      if (currentTranslateX < -40) {
        el.style.transform = `translateX(-${maxOffset}px)`;
        setSwipedItemId(itemId);
      } else {
        el.style.transform = "translateX(0px)";
        if (swipedItemId === itemId) {
          setSwipedItemId(null);
        }
      }
    }
  };

  React.useEffect(() => {
    registrations.forEach(item => {
      if (item.id !== swipedItemId) {
        const el = document.getElementById(`reg-content-${item.id}`);
        if (el) {
          el.style.transition = "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
          el.style.transform = "translateX(0px)";
        }
      } else {
        const el = document.getElementById(`reg-content-${item.id}`);
        if (el) {
          el.style.transition = "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
          el.style.transform = `translateX(-150px)`;
        }
      }
    });
  }, [swipedItemId, registrations]);
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('list');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [formData, setFormData] = React.useState({
    client: "",
    contact_name: "",
    registration_date: new Date().toISOString().split('T')[0],
    portal_link: "",
    status: "Pending",
    due_date: "",
    follow_up_log: "",
    last_week_follow_up: "",
    username: "",
    password: ""
  });

  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>(() => {
    const saved = localStorage.getItem('registrations_selectedStatuses');
    return saved ? JSON.parse(saved) : [];
  });
  const [startDateFilter, setStartDateFilter] = React.useState<string>(() => {
    return localStorage.getItem('registrations_startDateFilter') || "";
  });
  const [endDateFilter, setEndDateFilter] = React.useState<string>(() => {
    return localStorage.getItem('registrations_endDateFilter') || "";
  });

  React.useEffect(() => {
    localStorage.setItem('registrations_selectedStatuses', JSON.stringify(selectedStatuses));
  }, [selectedStatuses]);

  React.useEffect(() => {
    localStorage.setItem('registrations_startDateFilter', startDateFilter);
  }, [startDateFilter]);

  React.useEffect(() => {
    localStorage.setItem('registrations_endDateFilter', endDateFilter);
  }, [endDateFilter]);

  const fetchRegistrations = () => {
    fetch('/api/registrations')
      .then(res => res.json())
      .then(data => setRegistrations(data))
      .catch(err => console.error("Failed to fetch registrations", err));
  };

  React.useEffect(() => {
    fetchRegistrations();
  }, []);

  let filteredRegistrations = registrations.filter(reg => {
    const matchesSearch = (reg.client || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (reg.contact_name && reg.contact_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(reg.status);
    const effectiveStartDate = startDate || startDateFilter;
    const effectiveEndDate = endDate || endDateFilter;

    const matchesStartDate = effectiveStartDate ? reg.registration_date >= effectiveStartDate : true;
    const matchesEndDate = effectiveEndDate ? reg.registration_date <= effectiveEndDate : true;
    
    const today = new Date().toISOString().split('T')[0];
    const matchesCurrentDate = currentDateOnly ? reg.registration_date === today : true;
    const matchesMonth = selectedMonth && reg.registration_date ? reg.registration_date.startsWith(selectedMonth) : true;

    if (isReportView) {
      if (limit) {
        return matchesSearch && matchesStartDate && matchesEndDate && matchesMonth && (reg.status === 'Pending' || reg.status === 'Ongoing');
      }
      if (currentDateOnly) {
        return matchesSearch && matchesStatus && matchesStartDate && matchesEndDate && matchesCurrentDate && matchesMonth;
      }
      return matchesSearch && matchesStatus && matchesStartDate && matchesEndDate && matchesMonth;
    }
    
    return matchesSearch && matchesStatus && matchesStartDate && matchesEndDate && matchesCurrentDate && matchesMonth;
  }).sort((a, b) => new Date(b.registration_date).getTime() - new Date(a.registration_date).getTime());

  if (limit) {
    filteredRegistrations = filteredRegistrations.slice(0, limit);
  }

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleEdit = (reg: Registration) => {
    setEditingId(reg.id);
    setFormData({
      client: reg.client,
      contact_name: reg.contact_name || "",
      registration_date: reg.registration_date || new Date().toISOString().split('T')[0],
      portal_link: reg.portal_link || "",
      status: reg.status || "Pending",
      due_date: reg.due_date || "",
      follow_up_log: reg.follow_up_log || "",
      last_week_follow_up: reg.last_week_follow_up || "",
      username: reg.username || "",
      password: reg.password || ""
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `/api/registrations/${editingId}` : '/api/registrations';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ 
          client: "", 
          contact_name: "",
          registration_date: new Date().toISOString().split('T')[0],
          portal_link: "",
          status: "Pending", 
          due_date: "", 
          follow_up_log: "",
          last_week_follow_up: "",
          username: "",
          password: ""
        });
        fetchRegistrations();
      }
    } catch (error) {
      console.error("Error saving registration", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this registration?")) return;
    
    // Optimistic update
    const previousRegistrations = [...registrations];
    setRegistrations(registrations.filter(r => r.id !== id));

    try {
      await fetch(`/api/registrations/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error("Error deleting registration", error);
      setRegistrations(previousRegistrations);
      alert("Failed to delete registration");
    }
  };

  return (
    <ReportLayout title="Registrations Report" subtitle="Reg Status & Follow-Ups" isReportView={isReportView}>
      <div className="space-y-6">
        {!isReportView && (
          <div className="flex items-center justify-between print:hidden">
            <div>
              <h1 className="text-4xl font-light tracking-tight text-[var(--text-primary)] mb-2">REGISTRATIONS</h1>
              <p className="text-[var(--text-secondary)] font-mono text-sm uppercase tracking-wider">Reg Status & Follow-Ups</p>
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
                  onClick={() => setViewMode('grid')}
                  className={cn("p-2 rounded transition-colors", viewMode === 'grid' ? "bg-[var(--text-primary)] text-[var(--bg-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")}
                >
                  <Grid size={16} />
                </button>
              </div>
              <button 
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs font-bold uppercase tracking-wider hover:bg-[var(--border)] transition-colors border border-[var(--border)]"
              >
                <Download size={16} /> Print Report
              </button>
              <button 
                onClick={() => {
                  setEditingId(null);
                  setFormData({ 
                    client: "", 
                    contact_name: "",
                    registration_date: new Date().toISOString().split('T')[0],
                    portal_link: "",
                    status: "Pending", 
                    due_date: "", 
                    follow_up_log: "",
                    last_week_follow_up: ""
                  });
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-bold uppercase tracking-wider hover:bg-[var(--text-secondary)] transition-colors"
              >
                <Plus size={16} /> New Registration
              </button>
            </div>
          </div>
        )}

      {!isReportView && (
        <div className="flex flex-wrap gap-4 items-center pl-1">
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono uppercase text-[var(--text-secondary)]">Filter:</span>
            <div className="flex gap-2">
              {["Pending", "Ongoing", "Completed"].map(status => (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  className={cn(
                    "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition-colors rounded-full",
                    selectedStatuses.includes(status)
                      ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]"
                      : "bg-transparent text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase text-[var(--text-secondary)]">Reg Date:</span>
            <input 
              type="date" 
              className="bg-[var(--bg-tertiary)] border border-[var(--border)] px-2 py-1 text-xs rounded focus:outline-none focus:border-[var(--text-primary)] text-[var(--text-primary)]"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
            />
            <span className="text-[var(--text-secondary)]">-</span>
            <input 
              type="date" 
              className="bg-[var(--bg-tertiary)] border border-[var(--border)] px-2 py-1 text-xs rounded focus:outline-none focus:border-[var(--text-primary)] text-[var(--text-primary)]"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
            />
          </div>
          
          {(selectedStatuses.length > 0 || startDateFilter || endDateFilter || selectedMonth) && (
            <button 
              onClick={() => {
                setSelectedStatuses([]);
                setStartDateFilter("");
                setEndDateFilter("");
                setSelectedMonth("");
              }}
              className="ml-auto p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              title="Clear filters"
            >
              <X size={14} />
            </button>
          )}

          {/* Quick Filter by Month */}
          {availableMonths.length > 0 && (
            <div className="w-full flex items-center gap-2 overflow-x-auto py-2 border-t border-[var(--border)]/20 mt-2 scrollbar-thin">
              <span className="text-xs font-mono uppercase text-[var(--text-secondary)] shrink-0">By Month:</span>
              <button
                type="button"
                onClick={() => setSelectedMonth("")}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border rounded-full shrink-0 transition-all cursor-pointer",
                  selectedMonth === "" 
                    ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]" 
                    : "bg-transparent text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]"
                )}
              >
                All Months
              </button>
              {availableMonths.map(m => {
                const [yr, mo] = m.split('-');
                const date = new Date(Number(yr), Number(mo) - 1, 1);
                const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMonth(m)}
                    className={cn(
                      "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border rounded-full shrink-0 transition-all cursor-pointer",
                      selectedMonth === m 
                        ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]" 
                        : "bg-transparent text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRegistrations.length === 0 ? (
            <div className="col-span-full p-12 text-center border border-dashed border-[var(--border)] rounded-lg">
              <p className="text-[var(--text-secondary)]">No registrations found.</p>
            </div>
          ) : (
            filteredRegistrations.map((reg) => {
              const borderLeftColor = 
                reg.status === "Pending" ? "#f59e0b" : // amber
                reg.status === "Ongoing" ? "#3b82f6" : // blue
                "#10b981"; // emerald
              return (
                <div key={reg.id} className="bg-[var(--card-bg)] border border-[var(--border)]/40 p-6 group hover:border-[var(--border-hover)] transition-colors relative overflow-hidden pl-8 print:break-inside-avoid">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: borderLeftColor }} />
                  {!isReportView && (
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEdit(reg)}
                      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(reg.id)}
                      className="text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-4 pr-8">
                  <div className="p-2 bg-[var(--bg-tertiary)] rounded text-[var(--text-primary)]">
                    <FileText size={20} />
                  </div>
                  <span className={cn(
                    "text-[10px] uppercase tracking-wider px-2 py-1 rounded border",
                    reg.status === "Pending" ? "border-amber-500/20 text-amber-400 bg-amber-500/5" :
                    reg.status === "Ongoing" ? "border-blue-500/20 text-blue-400 bg-blue-500/5" :
                    "border-emerald-500/20 text-emerald-400 bg-emerald-500/5"
                  )}>
                    {reg.status}
                  </span>
                </div>
                
                <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">{reg.client}</h3>
                
                <div className="space-y-2 mb-4">
                  {reg.contact_name && (
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <User size={14} />
                      <span>{reg.contact_name}</span>
                    </div>
                  )}
                  {reg.registration_date && (
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Calendar size={14} />
                      <span>Reg: {reg.registration_date}</span>
                    </div>
                  )}
                  {reg.portal_link && (
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Building2 size={14} />
                      <a href={reg.portal_link} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate max-w-[200px]">
                        Portal Link
                      </a>
                    </div>
                  )}
                  {(reg.username || reg.password) && (
                    <div className="bg-[var(--bg-tertiary)] p-2 rounded text-xs space-y-1">
                      {reg.username && (
                        <div className="flex justify-between">
                          <span className="text-[var(--text-secondary)]">Username:</span>
                          <span className="text-[var(--text-primary)] font-mono">{reg.username}</span>
                        </div>
                      )}
                      {reg.password && (
                        <div className="flex justify-between">
                          <span className="text-[var(--text-secondary)]">Password:</span>
                          <span className="text-[var(--text-primary)] font-mono">{reg.password}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="space-y-3 pt-4 border-t border-[var(--border)]">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)] uppercase">{isReportView ? "Follow Up" : "Follow Up Date"}</span>
                    <span className="text-[var(--text-primary)] font-mono">{reg.due_date || "N/A"}</span>
                  </div>
                  {reg.last_week_follow_up && (
                    <div className="bg-[var(--bg-tertiary)] p-2 rounded text-xs text-[var(--text-secondary)]">
                      <span className="block text-[10px] uppercase text-[var(--text-tertiary)] mb-1">Last Week Follow-up</span>
                      {reg.last_week_follow_up}
                    </div>
                  )}
                  {reg.follow_up_log && (
                    <div className="text-xs text-[var(--text-secondary)] italic">
                      "{reg.follow_up_log}"
                    </div>
                  )}
                </div>
              </div>
            );
          })
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredRegistrations.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-[var(--border)] rounded-lg">
              <p className="text-[var(--text-secondary)]">No registrations found.</p>
            </div>
          ) : (
            filteredRegistrations.map((reg) => {
              const borderLeftColor = 
                reg.status === "Pending" ? "#f59e0b" : // amber
                reg.status === "Ongoing" ? "#3b82f6" : // blue
                "#10b981"; // emerald

              return (
                <div key={reg.id} className="relative overflow-hidden bg-[var(--card-bg)] border border-[var(--border)]/40 rounded-lg shadow-sm">
                  {/* Sliding buttons behind */}
                  {!isReportView && (
                    <div className={cn(
                      "absolute right-0 top-0 bottom-0 flex items-center z-0 transition-opacity duration-200",
                      swipedItemId === reg.id ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
                    )}>
                      <button 
                        onClick={() => {
                          handleEdit(reg);
                          setSwipedItemId(null);
                        }}
                        className="w-[75px] h-full bg-neutral-800 hover:bg-neutral-700 text-slate-300 flex flex-col items-center justify-center gap-1 transition-colors border-l border-neutral-700/50 outline-none cursor-pointer"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Edit</span>
                      </button>
                      <button 
                        onClick={() => {
                          handleDelete(reg.id);
                          setSwipedItemId(null);
                        }}
                        className="w-[75px] h-full bg-rose-600 hover:bg-rose-700 text-white flex flex-col items-center justify-center gap-1 transition-colors border-l border-neutral-700/50 outline-none cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Delete</span>
                      </button>
                    </div>
                  )}

                  {/* Foreground content: Slim and beautiful layout */}
                  <div
                    id={`reg-content-${reg.id}`}
                    onMouseDown={(e) => handleSwipeStart(e, reg.id)}
                    onMouseMove={(e) => handleSwipeMove(e, reg.id, 150)}
                    onMouseUp={() => handleSwipeEnd(reg.id, 150)}
                    onMouseLeave={() => handleSwipeEnd(reg.id, 150)}
                    onTouchStart={(e) => handleSwipeStart(e, reg.id)}
                    onTouchMove={(e) => handleSwipeMove(e, reg.id, 150)}
                    onTouchEnd={() => handleSwipeEnd(reg.id, 150)}
                    style={{ 
                      transform: swipedItemId === reg.id ? 'translateX(-150px)' : 'translateX(0px)', 
                      transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' 
                    }}
                    className="p-2 px-4 flex flex-wrap md:flex-nowrap items-center justify-between gap-4 bg-[var(--card-bg)] hover:bg-[var(--bg-tertiary)] transition-colors relative z-10 w-full select-none"
                  >
                    {/* Left slim highlight bar */}
                    <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: borderLeftColor }} />

                    {/* Strong right-edge highlighting gradient */}
                    <div 
                      className={cn(
                        "absolute right-0 top-0 bottom-0 w-1/3 pointer-events-none bg-gradient-to-l to-transparent z-0 opacity-100",
                        reg.status === "Pending" && "from-amber-500/15 via-amber-500/3",
                        reg.status === "Ongoing" && "from-blue-500/15 via-blue-500/3",
                        reg.status !== "Pending" && reg.status !== "Ongoing" && "from-emerald-500/15 via-emerald-500/3"
                      )}
                    />

                    <div className="flex items-center gap-4 flex-1 min-w-0 pl-1 relative z-10">
                      <div className="min-w-[140px] md:min-w-[180px] truncate">
                        <h3 className="text-xs font-semibold text-[var(--text-primary)] truncate">{reg.client}</h3>
                        {reg.contact_name && (
                          <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] mt-0.5">
                            <User size={10} className="shrink-0" />
                            <span className="truncate">{reg.contact_name}</span>
                          </div>
                        )}
                      </div>

                      {/* Status Badge */}
                      <div className="shrink-0">
                        <span className={cn(
                          "text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border font-bold",
                          reg.status === "Pending" ? "border-amber-500/40 text-amber-500 bg-amber-500/10" :
                          reg.status === "Ongoing" ? "border-blue-500/40 text-blue-500 bg-blue-500/10" :
                          "border-emerald-500/40 text-emerald-500 bg-emerald-500/10"
                        )}>
                          {reg.status}
                        </span>
                      </div>

                      {/* Redesigned Shaded space for Username & Password */}
                      {(reg.username || reg.password) && (
                        <div className="flex items-center gap-3 bg-neutral-100 dark:bg-neutral-800/40 border border-neutral-200/50 dark:border-neutral-700/30 px-2.5 py-1 rounded text-[10px] font-mono shrink-0 font-sans">
                          {reg.username && (
                            <div className="flex items-center gap-1 font-sans">
                              <span className="text-[var(--text-secondary)]">U:</span>
                              <span className="text-[var(--text-primary)] font-semibold">{reg.username}</span>
                            </div>
                          )}
                          {reg.username && reg.password && <span className="text-neutral-300 dark:text-neutral-700">|</span>}
                          {reg.password && (
                            <div className="flex items-center gap-1 font-sans">
                              <span className="text-[var(--text-secondary)]">P:</span>
                              <span className="text-[var(--text-primary)] font-semibold">{reg.password}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Follow-up info & portal link */}
                    <div className="flex items-center gap-4 text-[11px] text-[var(--text-secondary)] shrink-0 font-mono relative z-10">
                      <div className="flex items-center gap-1">
                        <Calendar size={11} />
                        <span>Reg: {reg.registration_date || "-"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 border-l border-[var(--border)]/40 pl-3">
                        <span className="text-[9px] uppercase tracking-wider text-[var(--text-tertiary)]">Follow up:</span>
                        <span className="text-[var(--text-primary)] font-semibold">{reg.due_date || "-"}</span>
                      </div>

                      {reg.portal_link && (
                        <a 
                          href={reg.portal_link} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[var(--text-secondary)] hover:text-blue-500 transition-colors border-l border-[var(--border)]/40 pl-3" 
                          title="Portal Link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Building2 size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-light text-[var(--text-primary)] mb-6">{editingId ? "EDIT REGISTRATION" : "NEW REGISTRATION"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Company Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.client}
                  onChange={e => setFormData({...formData, client: e.target.value})}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] text-sm focus:border-[var(--text-primary)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Contact Name</label>
                <input 
                  type="text" 
                  value={formData.contact_name}
                  onChange={e => setFormData({...formData, contact_name: e.target.value})}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] text-sm focus:border-[var(--text-primary)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Portal Link (Optional)</label>
                <input 
                  type="url" 
                  value={formData.portal_link}
                  onChange={e => setFormData({...formData, portal_link: e.target.value})}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] text-sm focus:border-[var(--text-primary)] focus:outline-none"
                  placeholder="https://..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Username</label>
                  <input 
                    type="text" 
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] text-sm focus:border-[var(--text-primary)] focus:outline-none"
                    placeholder="Username"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Password</label>
                  <input 
                    type="text" 
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] text-sm focus:border-[var(--text-primary)] focus:outline-none"
                    placeholder="Password"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Reg. Date</label>
                  <input 
                    type="date" 
                    value={formData.registration_date}
                    onChange={e => setFormData({...formData, registration_date: e.target.value})}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] text-sm focus:border-[var(--text-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Follow up date</label>
                  <input 
                    type="date" 
                    value={formData.due_date}
                    onChange={e => setFormData({...formData, due_date: e.target.value})}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] text-sm focus:border-[var(--text-primary)] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Status</label>
                <select 
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] text-sm focus:border-[var(--text-primary)] focus:outline-none"
                >
                  <option value="Pending">Pending</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Last Week Follow-up</label>
                <textarea 
                  value={formData.last_week_follow_up}
                  onChange={e => setFormData({...formData, last_week_follow_up: e.target.value})}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] text-sm focus:border-[var(--text-primary)] focus:outline-none h-16"
                  placeholder="What happened last week?"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">General Notes / Log</label>
                <textarea 
                  value={formData.follow_up_log}
                  onChange={e => setFormData({...formData, follow_up_log: e.target.value})}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] text-sm focus:border-[var(--text-primary)] focus:outline-none h-20"
                  placeholder="Enter initial notes..."
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-[var(--text-primary)] text-[var(--bg-primary)] py-3 text-xs font-bold uppercase tracking-wider hover:bg-[var(--text-secondary)] transition-colors mt-4"
              >
                {editingId ? "Update Registration" : "Create Registration"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
    </ReportLayout>
  );
}
