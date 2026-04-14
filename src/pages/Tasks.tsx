import React from "react";
import { Plus, X, Trash2, Layers, Edit2, ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";
import { useSearch } from "../context/SearchContext";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface Task {
  id: number;
  title: string;
  level: number;
  status: string;
  description: string;
  sortOrder?: number;
}

const LEVELS = [
  { id: 1, label: "Level 1: Lead Identification", color: "border-neutral-500" },
  { id: 2, label: "Level 2: Prospect Qualification", color: "border-blue-500" },
  { id: 3, label: "Level 3: Proposal Development", color: "border-amber-500" },
  { id: 4, label: "Level 4: Negotiation & Closing", color: "border-emerald-500" },
];

const getTaskBg = (levelId: number, status: string) => {
  const levelColors: Record<number, { pending: string, ongoing: string, completed: string }> = {
    1: { pending: "bg-neutral-500/10", ongoing: "bg-neutral-500/40", completed: "bg-neutral-500/80 text-white" },
    2: { pending: "bg-blue-500/10", ongoing: "bg-blue-500/40", completed: "bg-blue-500/80 text-white" },
    3: { pending: "bg-amber-500/10", ongoing: "bg-amber-500/40", completed: "bg-amber-500/80 text-white" },
    4: { pending: "bg-emerald-500/10", ongoing: "bg-emerald-500/40", completed: "bg-emerald-500/80 text-white" },
  };
  const colors = levelColors[levelId] || levelColors[1];
  if (status === 'Completed') return colors.completed;
  if (status === 'On Going') return colors.ongoing;
  return colors.pending;
};

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

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const sourceLevel = parseInt(result.source.droppableId);
    const destLevel = parseInt(result.destination.droppableId);
    
    const sourceTasks = filteredTasks.filter(t => t.level === sourceLevel).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const destTasks = sourceLevel === destLevel ? sourceTasks : filteredTasks.filter(t => t.level === destLevel).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    const [movedTask] = sourceTasks.splice(result.source.index, 1);
    movedTask.level = destLevel;
    
    destTasks.splice(result.destination.index, 0, movedTask);

    // Update sort orders
    const updatedTasks = destTasks.map((t, index) => ({ ...t, sortOrder: index }));
    
    // Optimistic update
    setTasks(prev => {
      const newTasks = [...prev];
      updatedTasks.forEach(ut => {
        const idx = newTasks.findIndex(t => t.id === ut.id);
        if (idx !== -1) newTasks[idx] = ut;
      });
      return newTasks;
    });

    // Save to backend
    try {
      await Promise.all(updatedTasks.map(t => 
        fetch(`/api/tasks/${t.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(t)
        })
      ));
    } catch (error) {
      console.error("Error saving task order", error);
      fetchTasks(); // Revert on error
    }
  };

  const handleStatusChange = async (task: Task, newStatus: string) => {
    const updatedTask = { ...task, status: newStatus };
    
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));

    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask)
      });
    } catch (error) {
      console.error("Error updating status", error);
      fetchTasks(); // Revert on error
    }
  };

  return (
    <div className="space-y-6">
      {!isReportView && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-light tracking-tight text-[var(--text-primary)] mb-2">TASK MANAGEMENT</h1>
            <p className="text-[var(--text-secondary)] font-mono text-sm uppercase tracking-wider">Business Development Tasks</p>
          </div>
          <button 
            onClick={() => {
              setFormData({ title: "", level: 1, status: "Pending", description: "" });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-bold uppercase tracking-wider hover:bg-[var(--text-secondary)] transition-colors"
          >
            <Plus size={16} /> New Task
          </button>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className={cn(
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6",
          isReportView ? "h-auto" : "h-[calc(100vh-12rem)] overflow-hidden"
        )}>
          {LEVELS.map((level) => (
            <div key={level.id} className="flex flex-col h-full bg-[var(--card-bg)] border border-[var(--border)] break-inside-avoid">
              <div className={cn("p-4 border-b border-[var(--border)] border-t-2", level.color)}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">{level.label}</h3>
              </div>
              <Droppable droppableId={level.id.toString()} isDropDisabled={isReportView}>
                {(provided, snapshot) => (
                  <div 
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-1 p-4 space-y-3 transition-colors",
                      isReportView ? "overflow-visible" : "overflow-y-auto custom-scrollbar",
                      snapshot.isDraggingOver ? "bg-[var(--bg-tertiary)]" : ""
                    )}
                  >
                    {filteredTasks.filter(t => t.level === level.id).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id.toString()} index={index} isDragDisabled={isReportView}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              "p-3 border border-[var(--border)] group hover:border-[var(--border-hover)] transition-all relative break-inside-avoid",
                              getTaskBg(level.id, task.status),
                              snapshot.isDragging ? "shadow-lg scale-105 z-50" : ""
                            )}
                            title={task.description}
                          >
                            {!isReportView && (
                              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button 
                                  onClick={() => handleEdit(task)}
                                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--card-bg)] p-1 rounded"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  onClick={() => handleDelete(task.id)}
                                  className="text-[var(--text-secondary)] hover:text-red-400 bg-[var(--card-bg)] p-1 rounded"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                            <h4 className="text-sm font-medium pr-12 mb-2">{task.title}</h4>
                            
                            {!isReportView ? (
                              <div className="mt-3 flex items-center justify-between relative z-10">
                                <select
                                  value={task.status}
                                  onChange={(e) => handleStatusChange(task, e.target.value)}
                                  className="text-[10px] uppercase tracking-wider bg-transparent border border-[var(--border)] rounded px-1 py-0.5 focus:outline-none cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="On Going">On Going</option>
                                  <option value="Completed">Completed</option>
                                </select>
                              </div>
                            ) : (
                              <div className="mt-3 flex items-center justify-between">
                                <span className="text-[10px] uppercase tracking-wider">{task.status}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

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
