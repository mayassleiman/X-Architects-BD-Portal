import React, { useEffect, useState } from 'react';
import { Bell, X, Check } from 'lucide-react';

interface FollowUp {
  id: number;
  contact_id: number;
  date: string;
  description: string;
  status: 'Pending' | 'Done';
  client_contact: string;
  client_organization: string;
}

export function FollowUpReminder() {
  const [dueFollowUps, setDueFollowUps] = useState<FollowUp[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  const fetchDueFollowUps = async () => {
    try {
      const res = await fetch('/api/follow-ups/due');
      if (res.ok) {
        const data = await res.json();
        setDueFollowUps(data);
        if (data.length > 0) setIsOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch due follow-ups", error);
    }
  };

  useEffect(() => {
    fetchDueFollowUps();
    const interval = setInterval(fetchDueFollowUps, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const markAsDone = async (id: number) => {
    try {
      await fetch(`/api/follow-ups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Done' })
      });
      setDueFollowUps(prev => prev.filter(fu => fu.id !== id));
    } catch (error) {
      console.error("Failed to mark follow-up as done", error);
    }
  };

  if (dueFollowUps.length === 0 || !isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-[var(--card-bg)] border border-[var(--border)] shadow-2xl rounded-lg z-[100] animate-in slide-in-from-bottom-5 duration-300">
      <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-rose-500/10">
        <h3 className="font-bold text-rose-500 flex items-center gap-2">
          <Bell size={16} /> Due Follow-ups ({dueFollowUps.length})
        </h3>
        <button onClick={() => setIsOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          <X size={16} />
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto p-2 space-y-2">
        {dueFollowUps.map(fu => (
          <div key={fu.id} className="p-3 bg-[var(--bg-tertiary)] rounded border border-[var(--border)]">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="text-sm font-medium text-[var(--text-primary)]">{fu.client_contact}</h4>
                <p className="text-xs text-[var(--text-secondary)]">{fu.client_organization}</p>
              </div>
              <span className="text-xs font-mono text-rose-400">{fu.date}</span>
            </div>
            <p className="text-sm text-[var(--text-primary)] mb-3">{fu.description}</p>
            <button 
              onClick={() => markAsDone(fu.id)}
              className="w-full py-1.5 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-bold uppercase rounded hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Check size={14} /> Mark as Done
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
