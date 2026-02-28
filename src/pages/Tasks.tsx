import React from "react";
import { Plus, X, Trash2, Layers, Edit2 } from "lucide-react";
import { cn } from "../lib/utils";
import { useSearch } from "../context/SearchContext";

interface Task {
  id: number;
  title: string;
  level: number;
  status: string;
  description: string;
}

const LEVELS = [
  { id: 1, label: "Level 1: Lead Identification", color: "border-neutral-700" },
  { id: 2, label: "Level 2: Prospect Qualification", color: "border-blue-500/50" },
  { id: 3, label: "Level 3: Proposal Development", color: "border-amber-500/50" },
  { id: 4, label: "Level 4: Negotiation & Closing", color: "border-emerald-500/50" },
];

export function Tasks({ isReportView = false }: { isReportView?: boolean }) {
  const { searchQuery } = useSearch();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState<{id?: number, title: string, level: number, status: string, description: string}>({
    title: "",
    level: 1,
    status: "Pending",
    description: ""
  });

  const fetchTasks = () => {
    fetch('/api/tasks')
      .then(res => res.json())
      .then(data => setTasks(data))
      .catch(err => console.error("Failed to fetch tasks", err));
  };

  React.useEffect(() => {
    fetchTasks();
  }, []);

  const filteredTasks = tasks.filter(t => 
    (t.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = formData.id ? `/api/tasks/${formData.id}` : '/api/tasks';
      const method = formData.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ title: "", level: 1, status: "Pending", description: "" });
        fetchTasks();
      }
    } catch (error) {
      console.error("Error saving task", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    
    // Optimistic update
    const previousTasks = [...tasks];
    setTasks(tasks.filter(t => t.id !== id));

    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error("Error deleting task", error);
      setTasks(previousTasks);
      alert("Failed to delete task");
    }
  };

  const handleEdit = (task: Task) => {
    setFormData(task);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-light tracking-tight text-[var(--text-primary)] mb-2">TASK MANAGEMENT</h1>
          <p className="text-[var(--text-secondary)] font-mono text-sm uppercase tracking-wider">Business Development Pipeline</p>
        </div>
        {!isReportView && (
          <button 
            onClick={() => {
              setFormData({ title: "", level: 1, status: "Pending", description: "" });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-bold uppercase tracking-wider hover:bg-[var(--text-secondary)] transition-colors"
          >
            <Plus size={16} /> New Task
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-[calc(100vh-12rem)] overflow-hidden">
        {LEVELS.map((level) => (
          <div key={level.id} className="flex flex-col h-full bg-[var(--card-bg)] border border-[var(--border)]">
            <div className={cn("p-4 border-b border-[var(--border)] border-t-2", level.color)}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">{level.label}</h3>
            </div>
            <div className="flex-1 p-4 space-y-3 overflow-y-auto custom-scrollbar">
              {filteredTasks.filter(t => t.level === level.id).map(task => (
                <div key={task.id} className="bg-[var(--bg-tertiary)] p-3 border border-[var(--border)] group hover:border-[var(--border-hover)] transition-colors relative">
                  {!isReportView && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEdit(task)}
                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(task.id)}
                        className="text-[var(--text-secondary)] hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                  <h4 className="text-sm font-medium text-[var(--text-primary)] pr-12">{task.title}</h4>
                  {task.description && (
                    <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2">{task.description}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">{task.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
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
            <h2 className="text-xl font-light text-[var(--text-primary)] mb-6">{formData.id ? "EDIT TASK" : "NEW TASK"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Task Title</label>
                <input 
                  type="text" 
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] text-sm focus:border-[var(--text-primary)] focus:outline-none"
                />
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
                <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Description</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] text-sm focus:border-[var(--text-primary)] focus:outline-none h-24"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-[var(--text-primary)] text-[var(--bg-primary)] py-3 text-xs font-bold uppercase tracking-wider hover:bg-[var(--text-secondary)] transition-colors mt-4"
              >
                {formData.id ? "Save Changes" : "Create Task"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
