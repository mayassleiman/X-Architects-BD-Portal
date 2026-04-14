import React from "react";
import { Plus, X, Trash2, Pencil, Filter, Download } from "lucide-react";
import { cn } from "../lib/utils";
import { useSearch } from "../context/SearchContext";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Action {
  id: number;
  title: string;
  description: string;
  due_date: string;
  status: string;
  responsible: string;
}

import { ReportLayout } from "../components/layout/ReportLayout";

export function Actions({ isReportView = false }: { isReportView?: boolean }) {
  const { searchQuery } = useSearch();
  const [actions, setActions] = React.useState<Action[]>([]);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [formData, setFormData] = React.useState({
    title: "",
    description: "",
    due_date: "",
    responsible: "",
    status: "Pending"
  });

  // Filter state
  const [statusFilter, setStatusFilter] = React.useState<string[]>(() => {
    const saved = localStorage.getItem('actions_statusFilter');
    return saved ? JSON.parse(saved) : [];
  });
  const [startDateFilter, setStartDateFilter] = React.useState<string>(() => {
    return localStorage.getItem('actions_startDateFilter') || "";
  });
  const [endDateFilter, setEndDateFilter] = React.useState<string>(() => {
    return localStorage.getItem('actions_endDateFilter') || "";
  });

  React.useEffect(() => {
    localStorage.setItem('actions_statusFilter', JSON.stringify(statusFilter));
  }, [statusFilter]);

  React.useEffect(() => {
    localStorage.setItem('actions_startDateFilter', startDateFilter);
  }, [startDateFilter]);

  React.useEffect(() => {
    localStorage.setItem('actions_endDateFilter', endDateFilter);
  }, [endDateFilter]);

  const fetchActions = () => {
    fetch('/api/actions')
      .then(res => res.json())
      .then(data => setActions(data))
      .catch(err => console.error("Failed to fetch actions", err));
  };

  React.useEffect(() => {
    fetchActions();
  }, []);

  const filteredActions = actions.filter(action => {
    const matchesSearch = (action.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (action.responsible || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (action.description && action.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(action.status);
    const matchesStartDate = startDateFilter ? action.due_date >= startDateFilter : true;
    const matchesEndDate = endDateFilter ? action.due_date <= endDateFilter : true;

    return matchesSearch && matchesStatus && matchesStartDate && matchesEndDate;
  });

  const toggleStatus = (status: string) => {
    setStatusFilter(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleEdit = (action: Action) => {
    setEditingId(action.id);
    setFormData({
      title: action.title,
      description: action.description || "",
      due_date: action.due_date,
      responsible: action.responsible,
      status: action.status
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `/api/actions/${editingId}` : '/api/actions';
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ title: "", description: "", due_date: "", responsible: "", status: "Pending" });
        setEditingId(null);
        fetchActions();
      }
    } catch (error) {
      console.error("Error saving action", error);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this action?")) return;
    
    // Optimistic update
    const previousActions = [...actions];
    setActions(actions.filter(a => a.id !== id));

    try {
      await fetch(`/api/actions/${id}`, { method: 'DELETE' });
      // No need to fetchActions() if successful, as state is already updated
    } catch (error) {
      console.error("Error deleting action", error);
      // Revert on error
      setActions(previousActions);
      alert("Failed to delete action");
    }
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData({ title: "", description: "", due_date: "", responsible: "", status: "Pending" });
    setIsModalOpen(true);
  };

  return (
    <ReportLayout title="Action List Report" subtitle="Manage Tasks & Responsibilities" isReportView={isReportView}>
      <div className="space-y-6">
        {!isReportView && (
          <div className="flex items-center justify-between print:hidden">
            <div>
              <h1 className="text-4xl font-light tracking-tight text-[var(--text-primary)] mb-2">ACTION LIST</h1>
              <p className="text-[var(--text-secondary)] font-mono text-sm uppercase tracking-wider">Manage Tasks & Responsibilities</p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs font-bold uppercase tracking-wider hover:bg-[var(--border)] transition-colors border border-[var(--border)]"
              >
                <Download size={16} /> Print Report
              </button>
              <button 
                onClick={openNewModal}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-bold uppercase tracking-wider hover:bg-[var(--text-secondary)] transition-colors"
              >
                <Plus size={16} /> Add Action
              </button>
            </div>
          </div>
        )}

      {!isReportView && (
        <div className="flex flex-wrap gap-4 items-center pl-1">
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono uppercase text-[var(--text-secondary)]">Filter:</span>
            <div className="flex gap-2">
              {["Pending", "In Progress", "Completed"].map(status => (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  className={cn(
                    "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition-colors rounded-full",
                    statusFilter.includes(status) 
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
            <span className="text-xs font-mono uppercase text-[var(--text-secondary)]">Due Date:</span>
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

          {(statusFilter.length > 0 || startDateFilter || endDateFilter) && (
            <button
              onClick={() => {
                setStatusFilter([]);
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

      <div className="bg-[var(--card-bg)] border border-[var(--border)]">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-[var(--border)] text-xs font-mono uppercase text-[var(--text-secondary)]">
          <div className="col-span-5">Task</div>
          <div className="col-span-3">Responsible</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Due Date</div>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {filteredActions.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-secondary)] text-sm">No actions found.</div>
          ) : (
            filteredActions.map((action) => (
              <div key={action.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-[var(--border)] transition-colors group relative print:break-inside-avoid">
                <div className="col-span-5 flex flex-col gap-1">
                  <div className="font-medium text-[var(--text-primary)] group-hover:text-[var(--text-primary)] flex items-center gap-3">
                    {!isReportView && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(action)}
                          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1"
                          title="Edit Action"
                        >
                          <Pencil size={14} />
                        </button>
                        <button 
                          onClick={(e) => handleDelete(action.id, e)}
                          className="text-[var(--text-secondary)] hover:text-red-400 p-1"
                          title="Delete Action"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                    {action.title}
                  </div>
                  {action.description && (
                    <p className="text-xs text-[var(--text-secondary)] pl-7">{action.description}</p>
                  )}
                </div>
                <div className="col-span-3 text-sm text-[var(--text-secondary)]">{action.responsible}</div>
                <div className="col-span-2">
                  <span className={cn(
                    "text-[10px] uppercase tracking-wider px-2 py-1 rounded border",
                    action.status === "Pending" ? "border-amber-500/20 text-amber-400 bg-amber-500/5" :
                    action.status === "In Progress" ? "border-blue-500/20 text-blue-400 bg-blue-500/5" :
                    "border-emerald-500/20 text-emerald-400 bg-emerald-500/5"
                  )}>
                    {action.status}
                  </span>
                </div>
                <div className="col-span-2 text-right text-sm font-mono text-[var(--text-secondary)]">{action.due_date}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-light text-[var(--text-primary)] mb-6">{editingId ? 'EDIT ACTION' : 'NEW ACTION'}</h2>
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
              <div>
                <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Description</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] text-sm focus:border-[var(--text-primary)] focus:outline-none h-20"
                  placeholder="Brief description of the action..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Responsible</label>
                  <input 
                    type="text" 
                    required
                    value={formData.responsible}
                    onChange={e => setFormData({...formData, responsible: e.target.value})}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] text-sm focus:border-[var(--text-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Due Date</label>
                  <input 
                    type="date" 
                    required
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
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <button 
                type="submit"
                className="w-full bg-[var(--text-primary)] text-[var(--bg-primary)] py-3 text-xs font-bold uppercase tracking-wider hover:bg-[var(--text-secondary)] transition-colors mt-4"
              >
                {editingId ? 'Update Action' : 'Create Action'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
    </ReportLayout>
  );
}
