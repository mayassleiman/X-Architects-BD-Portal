import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Edit2, Save, PieChart, ChevronDown, ChevronRight, Check, X, Trash2, Layers, Download } from 'lucide-react';
import { cn } from '../lib/utils';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AchievedTargetData {
  year: number;
  target: number;
  items: any[];
}

const SECTOR_COLORS: Record<string, string> = {
  "Commercial": "#10b981",
  "Residential": "#3b82f6",
  "Cultural": "#f59e0b",
  "Religious": "#ef4444",
  "Hospitality": "#8b5cf6",
  "Mixed Use": "#ec4899",
  "Entertainment": "#6366f1",
  "Master Planning": "#14b8a6",
  "Retail": "#f97316",
};

const DISCIPLINE_COLORS: Record<string, string> = {
  "Architecture": "#8b5cf6",
  "Interior": "#ec4899",
  "Construction Supervision": "#f59e0b",
};

export function AchievedTarget({ isReportView = false }: { isReportView?: boolean }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<AchievedTargetData>({ year: new Date().getFullYear(), target: 0, items: [] });
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [newTarget, setNewTarget] = useState(0);
  const [expandedQuarters, setExpandedQuarters] = useState<number[]>([1, 2, 3, 4]);
  const [editingItemNumber, setEditingItemNumber] = useState<{ id: string, number: string } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);

  useEffect(() => {
    fetchData();
  }, [year]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/achieved-targets?year=${year}`);
      const json = await res.json();
      setData(json);
      setNewTarget(json.target);
    } catch (error) {
      console.error("Failed to fetch achieved targets", error);
    }
  };

  const handleSaveTarget = async () => {
    try {
      await fetch('/api/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, amount: newTarget })
      });
      setIsEditingTarget(false);
      fetchData();
    } catch (error) {
      console.error("Failed to save target", error);
    }
  };

  const toggleQuarter = (q: number) => {
    setExpandedQuarters(prev => 
      prev.includes(q) ? prev.filter(x => x !== q) : [...prev, q]
    );
  };

  const handleUpdateItemNumber = async () => {
    if (!editingItemNumber) return;
    try {
      // Find the item in local state
      const item = data.items.find(i => i.id === editingItemNumber.id);
      if (!item) return;

      // Optimistic update to prevent UI flicker
      const updatedItems = data.items.map(i => 
        i.id === item.id ? { ...i, rfpNumber: editingItemNumber.number } : i
      );
      setData({ ...data, items: updatedItems });

      const updatedItem = { ...item, rfpNumber: editingItemNumber.number };
      
      await fetch(`/api/pipeline/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem)
      });
      
      setEditingItemNumber(null);
    } catch (error) {
      console.error("Failed to update item number", error);
      fetchData();
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      const updatedItem = { ...itemToDelete, status: 'Pending', achievedDate: null };
      
      await fetch(`/api/pipeline/${itemToDelete.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem)
      });
      
      setItemToDelete(null);
      fetchData();
    } catch (error) {
      console.error("Failed to delete item", error);
    }
  };

  const metrics = useMemo(() => {
    const quarterlyTarget = data.target / 4;
    
    const quarters = [1, 2, 3, 4].map(q => {
      const quarterItems = data.items.filter(item => {
        const dateStr = item.achieved_date || item.submission_date;
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const month = date.getMonth();
        return Math.floor(month / 3) + 1 === q;
      });

      const achieved = quarterItems.reduce((acc, item) => {
        const vals = item.item_values || {};
        const total = (vals.architecture || 0) + (vals.interior || 0) + (vals.cs || 0) + (vals.vo || 0);
        return acc + total;
      }, 0);

      const deficiency = Math.max(0, quarterlyTarget - achieved);
      const achievedPercent = quarterlyTarget > 0 ? (achieved / quarterlyTarget) * 100 : 0;
      const deficiencyPercent = quarterlyTarget > 0 ? (deficiency / quarterlyTarget) * 100 : 0;

      return {
        quarter: `Q${q}`,
        quarterNum: q,
        items: quarterItems,
        target: quarterlyTarget,
        achieved,
        achievedPercent,
        deficiency,
        deficiencyPercent
      };
    });

    const totalAchieved = quarters.reduce((acc, q) => acc + q.achieved, 0);
    const totalDeficiency = Math.max(0, data.target - totalAchieved);
    const totalAchievedPercent = data.target > 0 ? (totalAchieved / data.target) * 100 : 0;
    const totalDeficiencyPercent = data.target > 0 ? (totalDeficiency / data.target) * 100 : 0;

    // Sector Breakdown
    const sectorMap: Record<string, number> = {};
    data.items.forEach(item => {
      const dateStr = item.achieved_date || item.submission_date;
      if (!dateStr) return; // Skip items without date to match quarterly logic

      const vals = item.item_values || {};
      const total = (vals.architecture || 0) + (vals.interior || 0) + (vals.cs || 0) + (vals.vo || 0);
      sectorMap[item.sector] = (sectorMap[item.sector] || 0) + total;
    });

    const sectorData = Object.entries(sectorMap).map(([name, value]) => ({
      name,
      value,
      percent: totalAchieved > 0 ? (value / totalAchieved) * 100 : 0,
      color: SECTOR_COLORS[name] || '#ccc'
    })).sort((a, b) => b.value - a.value);

    // Discipline Breakdown
    const disciplineMap: Record<string, number> = {
      "Architecture": 0,
      "Interior": 0,
      "Construction Supervision": 0
    };
    
    data.items.forEach(item => {
      const dateStr = item.achieved_date || item.submission_date;
      if (!dateStr) return; // Skip items without date to match quarterly logic

      const vals = item.item_values || {};
      disciplineMap["Architecture"] += (vals.architecture || 0);
      disciplineMap["Interior"] += (vals.interior || 0);
      disciplineMap["Construction Supervision"] += (vals.cs || 0);
    });

    const disciplineData = Object.entries(disciplineMap).map(([name, value]) => ({
      name,
      value,
      percent: totalAchieved > 0 ? (value / totalAchieved) * 100 : 0,
      color: DISCIPLINE_COLORS[name] || '#ccc'
    })).filter(d => d.value > 0);

    return { quarters, totalAchieved, totalDeficiency, totalAchievedPercent, totalDeficiencyPercent, sectorData, disciplineData };
  }, [data]);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();

    // Title
    doc.setFontSize(18);
    doc.text(`Yearly Target Report - ${year}`, 14, 22);
    
    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${timestamp}`, 14, 28);
    doc.text(`Total Target: ${data.target.toLocaleString()} SAR`, 14, 34);
    doc.text(`Total Achieved: ${metrics.totalAchieved.toLocaleString()} SAR (${metrics.totalAchievedPercent.toFixed(1)}%)`, 14, 40);

    // Summary Table
    const summaryBody = metrics.quarters.map(q => [
      q.quarter,
      q.target.toLocaleString(),
      q.achieved.toLocaleString(),
      `${q.achievedPercent.toFixed(1)}%`,
      q.deficiency.toLocaleString(),
      `${q.deficiencyPercent.toFixed(1)}%`
    ]);

    // Add Total Row
    summaryBody.push([
      'TOTAL',
      data.target.toLocaleString(),
      metrics.totalAchieved.toLocaleString(),
      `${metrics.totalAchievedPercent.toFixed(1)}%`,
      metrics.totalDeficiency.toLocaleString(),
      `${metrics.totalDeficiencyPercent.toFixed(1)}%`
    ]);

    autoTable(doc, {
      head: [['Quarter', 'Target', 'Achieved', '% Achieved', 'Deficiency', '% Deficiency']],
      body: summaryBody,
      startY: 50,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' }
    });

    // Detailed Items Table
    let currentY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Detailed Achievements", 14, currentY);
    
    const detailsBody: any[] = [];
    metrics.quarters.forEach(q => {
      if (q.items.length > 0) {
        // Section Header
        detailsBody.push([{ content: `${q.quarter} Summary`, colSpan: 4, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }]);
        
        q.items.forEach(item => {
          const vals = item.item_values || {};
          const totalValue = (vals.architecture || 0) + (vals.interior || 0) + (vals.cs || 0) + (vals.vo || 0);
          detailsBody.push([
            item.rfpNumber || "No #",
            item.name,
            item.type === "RFP" ? "Project" : item.type,
            totalValue.toLocaleString()
          ]);
        });
      }
    });

    autoTable(doc, {
      head: [['Ref #', 'Project Name', 'Type', 'Value (SAR)']],
      body: detailsBody,
      startY: currentY + 5,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
    });

    doc.save(`Yearly_Target_Report_${year}.pdf`);
  };

  return (
    <div className="space-y-8">
      {!isReportView && (
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-light tracking-tight text-[var(--text-primary)] mb-2">YEARLY TARGET</h1>
            <p className="text-[var(--text-secondary)] font-mono text-sm uppercase tracking-wider">Performance & Goals Analysis</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-[var(--card-bg)] border border-[var(--border)] rounded px-3 py-2">
               <span className="text-xs font-mono uppercase text-[var(--text-secondary)]">Year:</span>
               <select 
                 value={year} 
                 onChange={(e) => setYear(Number(e.target.value))}
                 className="bg-transparent text-sm font-bold text-[var(--text-primary)] focus:outline-none"
               >
                 {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                   <option key={y} value={y}>{y}</option>
                 ))}
               </select>
             </div>
             <button 
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-bold uppercase tracking-wider hover:bg-[var(--text-secondary)] transition-colors rounded"
              >
                <Download size={16} />
                Export Report
              </button>
          </div>
        </div>
      )}

      {/* Target Setting */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-lg">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-500">
              <TrendingUp size={24} />
            </div>
            <div>
              <h2 className="text-lg font-medium text-[var(--text-primary)]">Yearly Target</h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isEditingTarget ? (
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={newTarget}
                  onChange={(e) => setNewTarget(Number(e.target.value))}
                  className="bg-[var(--bg-tertiary)] border border-[var(--border)] px-3 py-2 rounded text-sm text-[var(--text-primary)] w-48 focus:outline-none focus:border-[var(--text-primary)]"
                />
                <button 
                  onClick={handleSaveTarget}
                  className="p-2 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded hover:opacity-90"
                >
                  <Save size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <span className="text-3xl font-light text-[var(--text-primary)]">
                  {data.target.toLocaleString()} <span className="text-sm text-[var(--text-secondary)]">SAR</span>
                </span>
                {!isReportView && (
                  <button 
                    onClick={() => setIsEditingTarget(true)}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quarterly Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[var(--text-secondary)] uppercase bg-[var(--bg-tertiary)] border-y border-[var(--border)]">
              <tr>
                <th className="px-4 py-3 font-mono w-1/3">Quarter / Project</th>
                <th className="px-4 py-3 font-mono text-right">Target (SAR)</th>
                <th className="px-4 py-3 font-mono text-right">Achieved (SAR)</th>
                <th className="px-4 py-3 font-mono text-right">% Achieved</th>
                <th className="px-4 py-3 font-mono text-right">Deficiency (SAR)</th>
                <th className="px-4 py-3 font-mono text-right">% Deficiency</th>
                <th className="px-4 py-3 font-mono text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {metrics.quarters.map((q) => (
                <React.Fragment key={q.quarter}>
                  {/* Quarter Header Row (Summary) */}
                  <tr className="bg-[var(--bg-tertiary)]/10 hover:bg-[var(--bg-tertiary)]/30 transition-colors">
                    <td className="px-4 py-3 font-bold text-[var(--text-primary)] flex items-center gap-2">
                       <button onClick={() => toggleQuarter(q.quarterNum)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                         {expandedQuarters.includes(q.quarterNum) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                       </button>
                       {q.quarter} Summary
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--text-secondary)]">{q.target.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-400 font-medium">{q.achieved.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-bold",
                        q.achievedPercent >= 100 ? "bg-emerald-500/10 text-emerald-500" : 
                        q.achievedPercent >= 75 ? "bg-blue-500/10 text-blue-500" :
                        "bg-rose-500/10 text-rose-500"
                      )}>
                        {q.achievedPercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-rose-400">{q.deficiency.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{q.deficiencyPercent.toFixed(1)}%</td>
                    <td></td>
                  </tr>
                  
                  {/* Items Rows */}
                  {expandedQuarters.includes(q.quarterNum) && q.items.map(item => {
                    const vals = item.item_values || {};
                    const totalValue = (vals.architecture || 0) + (vals.interior || 0) + (vals.cs || 0) + (vals.vo || 0);
                    
                    return (
                      <tr key={item.id} className="bg-[var(--card-bg)] hover:bg-[var(--bg-tertiary)]/20 transition-colors border-b border-[var(--border)] border-dashed">
                        <td className="px-4 py-2 pl-10">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-[var(--text-primary)]">{item.name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                                  {item.type === "RFP" ? "Project" : item.type}
                                </span>
                                {editingItemNumber?.id === item.id && !isReportView ? (
                                  <div className="flex items-center gap-1">
                                    <input 
                                      type="text" 
                                      value={editingItemNumber.number}
                                      onChange={(e) => setEditingItemNumber({ ...editingItemNumber, number: e.target.value })}
                                      className="bg-[var(--bg-primary)] border border-[var(--border)] px-1 py-0.5 rounded text-xs font-mono w-24 focus:outline-none focus:border-[var(--text-primary)]"
                                      autoFocus
                                    />
                                    <button onClick={handleUpdateItemNumber} className="text-emerald-500 hover:text-emerald-400"><Check size={12} /></button>
                                    <button onClick={() => setEditingItemNumber(null)} className="text-rose-500 hover:text-rose-400"><X size={12} /></button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => !isReportView && setEditingItemNumber({ id: item.id, number: item.rfpNumber || "" })}
                                    className={cn(
                                      "text-xs font-mono text-[var(--text-secondary)] flex items-center gap-1 group",
                                      !isReportView && "hover:text-[var(--text-primary)]"
                                    )}
                                    disabled={isReportView}
                                  >
                                    {item.rfpNumber || "No #"}
                                    {!isReportView && <Edit2 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                                  </button>
                                )}
                              </div>
                              {/* Discipline Breakdown */}
                              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[10px] font-mono text-[var(--text-secondary)]">
                                {(vals.architecture > 0) && (
                                  <span className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]"></span>
                                    Arch: {vals.architecture.toLocaleString()}
                                  </span>
                                )}
                                {(vals.interior > 0) && (
                                  <span className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#ec4899]"></span>
                                    Int: {vals.interior.toLocaleString()}
                                  </span>
                                )}
                                {(vals.cs > 0) && (
                                  <span className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></span>
                                    CS: {vals.cs.toLocaleString()}
                                  </span>
                                )}
                                {(vals.vo > 0) && (
                                  <span className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    VO: {vals.vo.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SECTOR_COLORS[item.sector] }} title={item.sector} />
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right text-[var(--text-tertiary)]">-</td>
                        <td className="px-4 py-2 text-right font-mono text-[var(--text-primary)]">{totalValue.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right text-[var(--text-tertiary)]">-</td>
                        <td className="px-4 py-2 text-right text-[var(--text-tertiary)]">-</td>
                        <td className="px-4 py-2 text-right text-[var(--text-tertiary)]">-</td>
                        <td className="px-4 py-2 text-center">
                          {!isReportView && (
                            <button 
                              onClick={() => setItemToDelete(item)}
                              className="text-[var(--text-secondary)] hover:text-rose-400 transition-colors p-1"
                              title="Remove from Achieved"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
              <tr className="bg-[var(--bg-tertiary)]/30 font-bold border-t-2 border-[var(--border)]">
                <td className="px-4 py-4 text-[var(--text-primary)]">TOTAL</td>
                <td className="px-4 py-4 text-right font-mono">{data.target.toLocaleString()}</td>
                <td className="px-4 py-4 text-right font-mono text-emerald-500">{metrics.totalAchieved.toLocaleString()}</td>
                <td className="px-4 py-4 text-right">{metrics.totalAchievedPercent.toFixed(1)}%</td>
                <td className="px-4 py-4 text-right font-mono text-rose-500">{metrics.totalDeficiency.toLocaleString()}</td>
                <td className="px-4 py-4 text-right">
                  {metrics.totalDeficiencyPercent.toFixed(1)}%
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sector Breakdown */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-lg">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <PieChart size={16} />
            Achieved by Market Sector
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={metrics.sectorData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
                >
                  {metrics.sectorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number, name: string, props: any) => {
                    const percent = props.payload.percent;
                    return [`${value.toLocaleString()} SAR (${percent.toFixed(1)}%)`, name];
                  }}
                />
                <Legend />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Discipline Breakdown */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-lg">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <Layers size={16} />
            Achieved by Discipline
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.disciplineData} layout="vertical" margin={{ top: 5, right: 50, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#333" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={150} 
                  tick={{ fill: '#888', fontSize: 12 }} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }}
                  formatter={(value: number, name: string, props: any) => {
                    const percent = props.payload.percent;
                    return [`${value.toLocaleString()} SAR (${percent.toFixed(1)}%)`, 'Value'];
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                  {metrics.disciplineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <LabelList 
                    dataKey="percent" 
                    position="right" 
                    formatter={(val: number) => `${val.toFixed(1)}%`}
                    style={{ fill: '#888', fontSize: 12 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-light text-[var(--text-primary)] mb-4">
              Remove from Achieved?
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              Are you sure you want to remove <strong>{itemToDelete.name}</strong> from the yearly target? 
              It will be moved back to the pipeline as 'Pending'.
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteItem}
                className="flex-1 py-2 text-sm font-bold uppercase tracking-wider bg-rose-500 text-white hover:bg-rose-600 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
