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

    if (isReportView) {
      if (limit) {
        return matchesSearch && matchesStartDate && matchesEndDate && (reg.status === 'Pending' || reg.status === 'Ongoing');
      }
      if (currentDateOnly) {
        return matchesSearch && matchesStatus && matchesStartDate && matchesEndDate && matchesCurrentDate;
      }
      return matchesSearch && matchesStatus && matchesStartDate && matchesEndDate && (reg.last_week_follow_up && reg.last_week_follow_up.trim() !== "");
    }
    
    return matchesSearch && matchesStatus && matchesStartDate && matchesEndDate && matchesCurrentDate;
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
          
          {(selectedStatuses.length > 0 || startDateFilter || endDateFilter) && (
            <button 
              onClick={() => {
                setSelectedStatuses([]);
                setStartDateFilter("");
                setEndDateFilter("");
              }}
              className="ml-auto p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              title="Clear filters"
            >
              <X size={14} />
            </button>
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
            filteredRegistrations.map((reg) => (
              <div key={reg.id} className="bg-[var(--card-bg)] border border-[var(--border)] p-6 group hover:border-[var(--border-hover)] transition-colors relative print:break-inside-avoid">
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
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRegistrations.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-[var(--border)] rounded-lg">
              <p className="text-[var(--text-secondary)]">No registrations found.</p>
            </div>
          ) : (
            filteredRegistrations.map((reg) => (
              <div key={reg.id} className="bg-[var(--card-bg)] border border-[var(--border)] p-4 flex items-center justify-between group hover:border-[var(--border-hover)] transition-colors relative print:break-inside-avoid">
                <div className="flex items-center gap-6 flex-1">
                  <div className={cn(
                    "w-1 h-12 rounded-full",
                    reg.status === "Pending" ? "bg-amber-400" :
                    reg.status === "Ongoing" ? "bg-blue-400" :
                    "bg-emerald-400"
                  )} />
                  
                  <div className="min-w-[200px]">
                    <h3 className="text-sm font-medium text-[var(--text-primary)]">{reg.client}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn(
                        "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border",
                        reg.status === "Pending" ? "border-amber-500/20 text-amber-400 bg-amber-500/5" :
                        reg.status === "Ongoing" ? "border-blue-500/20 text-blue-400 bg-blue-500/5" :
                        "border-emerald-500/20 text-emerald-400 bg-emerald-500/5"
                      )}>
                        {reg.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-3 gap-4 text-sm text-[var(--text-secondary)]">
                    <div className="flex items-center gap-2">
                      <User size={14} />
                      <span className="truncate">{reg.contact_name || "-"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      <span>Reg: {reg.registration_date || "-"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wider">{isReportView ? "Follow Up:" : "Follow Up:"}</span>
                      <span className="font-mono text-[var(--text-primary)]">{reg.due_date || "-"}</span>
                    </div>
                    {(reg.username || reg.password) && (
                      <div className="col-span-3 flex gap-4 text-xs bg-[var(--bg-tertiary)] p-2 rounded mt-2">
                        {reg.username && (
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--text-secondary)]">User:</span>
                            <span className="text-[var(--text-primary)] font-mono">{reg.username}</span>
                          </div>
                        )}
                        {reg.password && (
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--text-secondary)]">Pass:</span>
                            <span className="text-[var(--text-primary)] font-mono">{reg.password}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {!isReportView && (
                  <div className="flex items-center gap-4 pl-4 border-l border-[var(--border)] ml-4">
                    {reg.portal_link && (
                      <a href={reg.portal_link} target="_blank" rel="noreferrer" className="text-[var(--text-secondary)] hover:text-blue-400 transition-colors" title="Portal Link">
                        <Building2 size={16} />
                      </a>
                    )}
                    <button 
                      onClick={() => handleEdit(reg)}
                      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(reg.id)}
                      className="text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))
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
