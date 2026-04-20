import React, { useEffect, useState } from 'react';
import { MessageSquare, Calendar } from 'lucide-react';

interface Engagement {
  id: number;
  date: string;
  discussion: string;
  client_contact: string;
  client_organization: string;
}

export function RecentEngagements({ startDate, endDate }: { startDate?: string, endDate?: string }) {
  const [engagements, setEngagements] = useState<Engagement[]>([]);

  useEffect(() => {
    const fetchEngagements = async () => {
      let startStr = startDate;
      let endStr = endDate;

      if (!startStr) {
        const d = new Date();
        d.setDate(d.getDate() - 10);
        startStr = d.toISOString().split('T')[0];
      }
      
      try {
        let url = `/api/engagements/search?startDate=${startStr}`;
        if (endStr) url += `&endDate=${endStr}`;
        
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setEngagements(data);
        }
      } catch (error) {
        console.error("Failed to fetch recent engagements", error);
      }
    };

    fetchEngagements();
  }, [startDate, endDate]);

  if (engagements.length === 0) {
    return (
      <div className="p-6 border border-dashed border-[var(--border)] rounded-lg text-center text-[var(--text-secondary)]">
        {startDate || endDate ? 'No engagements found for the selected period.' : 'No engagements in the past 10 days.'}
      </div>
    );
  }

  // Group engagements by client_organization to keep them together
  const groupedEngagements = engagements.reduce((acc, eng) => {
    if (!acc[eng.client_organization]) {
      acc[eng.client_organization] = [];
    }
    acc[eng.client_organization].push(eng);
    return acc;
  }, {} as Record<string, Engagement[]>);

  return (
    <div className="space-y-8">
      {Object.entries(groupedEngagements).map(([org, orgEngs]) => (
        <div key={org} className="print:break-inside-avoid">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 uppercase tracking-wider border-b border-[var(--border)] pb-1">{org}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-4">
            {(orgEngs as Engagement[]).map((eng) => (
              <div key={eng.id} className="bg-[var(--card-bg)] border border-[var(--border)] p-4 rounded-lg print:break-inside-avoid print:shadow-none">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-[var(--text-primary)] text-sm">{eng.client_contact}</h4>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                    <Calendar size={10} />
                    <span>{eng.date}</span>
                  </div>
                </div>
                <div className="flex gap-3 mt-3">
                  <div className="mt-1 text-[var(--text-secondary)]">
                    <MessageSquare size={14} />
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] italic">"{eng.discussion}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
