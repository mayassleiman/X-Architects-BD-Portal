import React, { useEffect, useState } from 'react';
import { MessageSquare, Calendar } from 'lucide-react';

interface Engagement {
  id: number;
  date: string;
  discussion: string;
  client_contact: string;
  client_organization: string;
}

export function RecentEngagements() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);

  useEffect(() => {
    const fetchEngagements = async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 10);

      const startStr = startDate.toISOString().split('T')[0];
      
      try {
        const res = await fetch(`/api/engagements/search?startDate=${startStr}`);
        if (res.ok) {
          const data = await res.json();
          setEngagements(data);
        }
      } catch (error) {
        console.error("Failed to fetch recent engagements", error);
      }
    };

    fetchEngagements();
  }, []);

  if (engagements.length === 0) {
    return (
      <div className="p-6 border border-dashed border-[var(--border)] rounded-lg text-center text-[var(--text-secondary)]">
        No engagements in the past 10 days.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {engagements.map((eng) => (
          <div key={eng.id} className="bg-[var(--card-bg)] border border-[var(--border)] p-4 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-medium text-[var(--text-primary)]">{eng.client_organization}</h4>
                <p className="text-xs text-[var(--text-secondary)]">{eng.client_contact}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                <Calendar size={12} />
                <span>{eng.date}</span>
              </div>
            </div>
            <div className="flex gap-3 mt-3">
              <div className="mt-1 text-[var(--text-secondary)]">
                <MessageSquare size={16} />
              </div>
              <p className="text-sm text-[var(--text-secondary)] italic">"{eng.discussion}"</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
