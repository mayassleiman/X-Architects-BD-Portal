import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TrendingUp, Edit2, Save, BarChart2, ChevronDown, ChevronRight, Check, X, Trash2, Layers, Download, LineChart as LineChartIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, ComposedChart, Area, Line, ReferenceLine } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { useCurrency } from '../context/CurrencyContext';

interface AchievedTargetData {
  year: number;
  target: number;
  items: any[];
}

interface MarketSector {
  id: number;
  name: string;
  color: string;
}

const DISCIPLINE_COLORS: Record<string, string> = {
  "Architecture": "#06b6d4", // Cyan
  "Interior": "#d946ef", // Fuchsia
  "Construction Supervision": "#84cc16", // Lime
  "VO": "#f43f5e", // Rose
};

const CustomTrendTooltip = ({ active, payload, currency }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const target = data.linearTarget || 0;
    const achieved = data.cumulative !== null ? data.cumulative : 0;
    const deficiency = Math.max(0, target - achieved);
    
    return (
      <div className="bg-[#111] border border-[#333] p-3 shadow-xl">
        <p className="text-[var(--text-secondary)] text-[10px] font-mono mb-2 uppercase tracking-wider">
          {data.fullDate}{data.name && data.name !== 'Start of Year' && data.name !== 'End of Year' && data.name !== 'Today' ? ` - ${data.name}` : ''}
        </p>
        <div className="space-y-1.5">
          <div className="flex justify-between gap-8">
            <span className="text-amber-400 text-[11px] uppercase font-bold">Target:</span>
            <span className="text-white text-[11px] font-mono">{target.toLocaleString()} {currency}</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-emerald-400 text-[11px] uppercase font-bold">Achieved:</span>
            <span className="text-white text-[11px] font-mono">{achieved.toLocaleString()} {currency}</span>
          </div>
          <div className="flex justify-between gap-8 pt-1.5 border-t border-[#333]">
            <span className="text-rose-400 text-[11px] uppercase font-bold">Deficiency:</span>
            <span className="text-rose-400 text-[11px] font-mono font-bold">{deficiency.toLocaleString()} {currency}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function AchievedTarget({ isReportView = false }: { isReportView?: boolean }) {
  const { currency } = useCurrency();
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<AchievedTargetData>({ year: new Date().getFullYear(), target: 0, items: [] });
  const [sectors, setSectors] = useState<MarketSector[]>([]);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [newTarget, setNewTarget] = useState(0);
  const [expandedQuarters, setExpandedQuarters] = useState<number[]>(
    isReportView ? [1, 2, 3, 4] : [Math.floor(new Date().getMonth() / 3) + 1]
  );
  const [editingItem, setEditingItem] = useState<{
    id: string;
    number: string;
    date: string;
    values: { architecture?: number; interior?: number; cs?: number; vo?: number };
  } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(() => {
    if (isReportView) {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime();
      const endOfYear = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59).getTime();
      return [startOfYear, endOfYear];
    }
    const saved = localStorage.getItem(`achievedTargetZoomDomain_${new Date().getFullYear()}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number, domainMin: number, domainMax: number } | null>(null);

  useEffect(() => {
    fetchData();
    fetchSectors();
  }, [year]);

  const fetchSectors = async () => {
    try {
      const res = await fetch('/api/market-sectors');
      const json = await res.json();
      setSectors(json);
    } catch (error) {
      console.error("Failed to fetch sectors", error);
    }
  };

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

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    try {
      // Find the item in local state
      const item = data.items.find(i => i.id === editingItem.id);
      if (!item) return;

      // Optimistic update to prevent UI flicker
      const updatedItem = { 
        ...item, 
        rfpNumber: editingItem.number,
        achievedDate: editingItem.date,
        values: editingItem.values
      };

      const updatedItems = data.items.map(i => 
        i.id === item.id ? updatedItem : i
      );
      setData({ ...data, items: updatedItems });

      await fetch(`/api/pipeline/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem)
      });
      
      setEditingItem(null);
    } catch (error) {
      console.error("Failed to update item", error);
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

  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split('T')[0];
  };

  const metrics = useMemo(() => {
    const quarterlyTarget = data.target / 4;
    
    const quarters = [1, 2, 3, 4].map(q => {
      const quarterItems = data.items.filter(item => {
        const dateStr = item.achievedDate || item.submissionDate;
        if (!dateStr) return false;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return false;
        const month = date.getMonth();
        return Math.floor(month / 3) + 1 === q;
      });

      const achieved = quarterItems.reduce((acc, item) => {
        const vals = item.values || {};
        const total = (Number(vals.architecture) || 0) + (Number(vals.interior) || 0) + (Number(vals.cs) || 0) + (Number(vals.vo) || 0);
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
      const dateStr = item.achievedDate || item.submissionDate;
      if (!dateStr) return; 

      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return;

      const vals = item.values || {};
      const total = (Number(vals.architecture) || 0) + (Number(vals.interior) || 0) + (Number(vals.cs) || 0) + (Number(vals.vo) || 0);
      sectorMap[item.sector] = (sectorMap[item.sector] || 0) + total;
    });

    const sectorData = Object.entries(sectorMap).map(([name, value]) => ({
      name,
      value,
      share: totalAchieved > 0 ? (value / totalAchieved) * 100 : 0,
      color: sectors.find(s => s.name === name)?.color || '#ccc'
    })).sort((a, b) => b.value - a.value);

    // Discipline Breakdown
    const disciplineMap: Record<string, number> = {
      "Architecture": 0,
      "Interior": 0,
      "Construction Supervision": 0,
      "VO": 0
    };
    
    data.items.forEach(item => {
      const dateStr = item.achievedDate || item.submissionDate;
      if (!dateStr) return;

      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return;

      const vals = item.values || {};
      disciplineMap["Architecture"] += (Number(vals.architecture) || 0);
      disciplineMap["Interior"] += (Number(vals.interior) || 0);
      disciplineMap["Construction Supervision"] += (Number(vals.cs) || 0);
      disciplineMap["VO"] += (Number(vals.vo) || 0);
    });

    const disciplineData = Object.entries(disciplineMap).map(([name, value]) => ({
      name,
      value,
      share: totalAchieved > 0 ? (value / totalAchieved) * 100 : 0,
      color: DISCIPLINE_COLORS[name] || '#ccc'
    })).filter(d => d.value > 0);

    // Cumulative Chart Data
    const startOfYear = new Date(data.year, 0, 1).getTime();
    const endOfYear = new Date(data.year, 11, 31, 23, 59, 59).getTime();
    const today = new Date().getTime();
    const msInYear = endOfYear - startOfYear;

    const sortedItems = [...data.items].filter(i => {
      const d = new Date(i.achievedDate || i.submissionDate);
      return !isNaN(d.getTime()) && d.getFullYear() === data.year;
    }).sort((a, b) => {
      const dateA = new Date(a.achievedDate || a.submissionDate).getTime();
      const dateB = new Date(b.achievedDate || b.submissionDate).getTime();
      return dateA - dateB;
    });

    let cumulativeValue = 0;
    const chartData: any[] = [];

    chartData.push({
      timestamp: startOfYear,
      date: '01 Jan',
      fullDate: `01/01/${data.year}`,
      cumulative: 0,
      name: 'Start of Year',
      linearTarget: 0
    });

    sortedItems.forEach(item => {
      const dateStr = item.achievedDate || item.submissionDate;
      const date = new Date(dateStr);
      const timestamp = date.getTime();

      const vals = item.values || {};
      const total = (Number(vals.architecture) || 0) + (Number(vals.interior) || 0) + (Number(vals.cs) || 0) + (Number(vals.vo) || 0);
      cumulativeValue += total;
      
      const linearTarget = ((timestamp - startOfYear) / msInYear) * data.target;

      chartData.push({
        timestamp,
        date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        fullDate: date.toLocaleDateString('en-GB'),
        value: total,
        cumulative: cumulativeValue,
        name: item.name,
        linearTarget
      });
    });

    // Add a point for today if we are in the current year
    if (today > startOfYear && today < endOfYear) {
      const linearTarget = ((today - startOfYear) / msInYear) * data.target;
      chartData.push({
        timestamp: today,
        date: 'Today',
        fullDate: new Date().toLocaleDateString('en-GB'),
        cumulative: cumulativeValue,
        name: 'Today',
        linearTarget
      });
    }

    chartData.push({
      timestamp: endOfYear,
      date: '31 Dec',
      fullDate: `31/12/${data.year}`,
      cumulative: today > endOfYear ? cumulativeValue : null,
      name: 'End of Year',
      linearTarget: data.target
    });

    chartData.sort((a, b) => a.timestamp - b.timestamp);

    return { quarters, totalAchieved, totalDeficiency, totalAchievedPercent, totalDeficiencyPercent, sectorData, disciplineData, chartData };
  }, [data]);

  // Load saved zoom domain when year changes
  useEffect(() => {
    if (isReportView) {
      const startOfYear = new Date(year, 0, 1).getTime();
      const endOfYear = new Date(year, 11, 31, 23, 59, 59).getTime();
      setZoomDomain([startOfYear, endOfYear]);
      return;
    }
    const saved = localStorage.getItem(`achievedTargetZoomDomain_${year}`);
    if (saved) {
      try {
        setZoomDomain(JSON.parse(saved));
        return;
      } catch (e) {
        console.error("Failed to parse saved zoom domain", e);
      }
    }
    setZoomDomain(null);
  }, [year, isReportView]);

  // Set default domain if null
  useEffect(() => {
    if (metrics.chartData.length > 0 && !zoomDomain && data.year === year) {
      const min = metrics.chartData[0].timestamp;
      const max = metrics.chartData[metrics.chartData.length - 1].timestamp;
      setZoomDomain([min, max]);
    }
  }, [metrics.chartData, zoomDomain, data.year, year]);

  // Save zoom domain when it changes
  useEffect(() => {
    if (zoomDomain) {
      localStorage.setItem(`achievedTargetZoomDomain_${year}`, JSON.stringify(zoomDomain));
    }
  }, [zoomDomain, year]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (metrics.chartData.length === 0) return;
      
      setZoomDomain(prevDomain => {
        const currentDomain = prevDomain || [
          metrics.chartData[0].timestamp,
          metrics.chartData[metrics.chartData.length - 1].timestamp
        ];
        
        const [min, max] = currentDomain;
        const range = max - min;
        
        const rect = container.getBoundingClientRect();
        const yAxisWidth = 40;
        const chartWidth = rect.width - yAxisWidth;
        let mouseX = e.clientX - rect.left - yAxisWidth;
        if (mouseX < 0) mouseX = 0;
        if (mouseX > chartWidth) mouseX = chartWidth;
        
        const mousePercent = mouseX / chartWidth;
        const zoomFactor = 0.15;
        const direction = e.deltaY > 0 ? 1 : -1;
        const zoomAmount = range * zoomFactor * direction;
        
        let newMin = min - (zoomAmount * mousePercent);
        let newMax = max + (zoomAmount * (1 - mousePercent));
        
        const dataMin = metrics.chartData[0].timestamp;
        const dataMax = metrics.chartData[metrics.chartData.length - 1].timestamp;
        
        if (newMin < dataMin) newMin = dataMin;
        if (newMax > dataMax) newMax = dataMax;
        
        if (newMax - newMin < 86400000 * 7) { // Min 1 week
          const center = (newMin + newMax) / 2;
          newMin = center - (86400000 * 7) / 2;
          newMax = center + (86400000 * 7) / 2;
        }
        
        return [newMin, newMax];
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [metrics.chartData]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const currentDomain = zoomDomain || [
      metrics.chartData[0]?.timestamp,
      metrics.chartData[metrics.chartData.length - 1]?.timestamp
    ];
    if (!currentDomain[0] || !currentDomain[1]) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, domainMin: currentDomain[0], domainMax: currentDomain[1] });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !panStart || !zoomDomain || !chartContainerRef.current) return;
    
    const dx = e.clientX - panStart.x;
    const chartWidth = chartContainerRef.current.clientWidth;
    
    const range = panStart.domainMax - panStart.domainMin;
    const timeShift = (dx / chartWidth) * range;
    
    let newMin = panStart.domainMin - timeShift;
    let newMax = panStart.domainMax - timeShift;
    
    const dataMin = metrics.chartData[0].timestamp;
    const dataMax = metrics.chartData[metrics.chartData.length - 1].timestamp;
    
    if (newMin < dataMin) {
      newMin = dataMin;
      newMax = dataMin + range;
    }
    if (newMax > dataMax) {
      newMax = dataMax;
      newMin = dataMax - range;
    }
    
    setZoomDomain([newMin, newMax]);
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setPanStart(null);
  };

  const xAxisTicks = useMemo(() => {
    const currentDomain = zoomDomain || [
      metrics.chartData[0]?.timestamp || 0,
      metrics.chartData[metrics.chartData.length - 1]?.timestamp || 0
    ];
    
    if (!currentDomain[0] || !currentDomain[1]) return undefined;
    
    const [min, max] = currentDomain;
    const range = max - min;
    const days = range / (1000 * 60 * 60 * 24);
    
    const ticks = [];
    
    if (days > 180) {
      // Ticks at the start of every month
      const startDate = new Date(min);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      
      let current = new Date(startDate);
      while (current.getTime() <= max) {
        if (current.getTime() >= min) {
          ticks.push(current.getTime());
        }
        current.setMonth(current.getMonth() + 1);
      }
    } else if (days > 60) {
      // Ticks 1st and 15th
      const startDate = new Date(min);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      
      let current = new Date(startDate);
      while (current.getTime() <= max) {
        if (current.getTime() >= min) ticks.push(current.getTime());
        
        const midMonth = new Date(current);
        midMonth.setDate(15);
        if (midMonth.getTime() >= min && midMonth.getTime() <= max) {
          ticks.push(midMonth.getTime());
        }
        
        current.setMonth(current.getMonth() + 1);
      }
    } else if (days > 14) {
      // Ticks every week (Monday)
      const startDate = new Date(min);
      startDate.setHours(0, 0, 0, 0);
      const day = startDate.getDay();
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
      startDate.setDate(diff);
      
      let current = new Date(startDate);
      while (current.getTime() <= max) {
        if (current.getTime() >= min) ticks.push(current.getTime());
        current.setDate(current.getDate() + 7);
      }
    } else {
      // Ticks every day
      const startDate = new Date(min);
      startDate.setHours(0, 0, 0, 0);
      
      let current = new Date(startDate);
      while (current.getTime() <= max) {
        if (current.getTime() >= min) ticks.push(current.getTime());
        current.setDate(current.getDate() + 1);
      }
    }
    
    return ticks;
  }, [zoomDomain, metrics.chartData]);

  const formatXAxisTick = (tick: number) => {
    const date = new Date(tick);
    const currentDomain = zoomDomain || [
      metrics.chartData[0]?.timestamp || 0,
      metrics.chartData[metrics.chartData.length - 1]?.timestamp || 0
    ];
    
    if (!currentDomain[0] || !currentDomain[1]) return '';
    
    const range = currentDomain[1] - currentDomain[0];
    const days = range / (1000 * 60 * 60 * 24);
    
    if (days > 180) {
      return date.toLocaleDateString('en-GB', { month: 'short' });
    } else if (days > 60) {
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } else if (days > 14) {
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } else {
      return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    }
  };

  const handleExportPDF = async () => {
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();

    // Add Logo
    try {
      const response = await fetch('/api/logo');
      if (response.ok) {
        const blob = await response.blob();
        const logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });

        const imgProps = doc.getImageProperties(logoBase64);
        const pdfWidth = doc.internal.pageSize.getWidth();
        const logoWidth = 40; 
        const logoHeight = (imgProps.height * logoWidth) / imgProps.width;
        doc.addImage(logoBase64, 'PNG', pdfWidth - logoWidth - 14, 10, logoWidth, logoHeight);
      }
    } catch (error) {
      console.error("Error adding logo to PDF", error);
    }

    // Title
    doc.setFontSize(18);
    doc.text(`Yearly Target Report - ${year}`, 14, 22);
    
    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${timestamp}`, 14, 28);
    doc.text(`Total Target: ${data.target.toLocaleString()} ${currency}`, 14, 34);
    doc.text(`Total Achieved: ${metrics.totalAchieved.toLocaleString()} ${currency} (${metrics.totalAchievedPercent.toFixed(1)}%)`, 14, 40);

    let currentY = 50;

    // Add Chart Image
    if (chartRef.current) {
      try {
        const canvas = await html2canvas(chartRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 180;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        doc.text("Cumulative Achievement Trend", 14, currentY);
        doc.addImage(imgData, 'PNG', 14, currentY + 5, imgWidth, imgHeight);
        currentY += imgHeight + 15;
      } catch (error) {
        console.error("Failed to capture chart", error);
      }
    }

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
      startY: currentY,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' }
    });

    // Detailed Items Table
    currentY = (doc as any).lastAutoTable.finalY + 15;
    
    // Check if we need a new page
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Detailed Achievements", 14, currentY);
    
    const detailsBody: any[] = [];
    metrics.quarters.forEach(q => {
      if (q.items.length > 0) {
        // Section Header
        detailsBody.push([{ content: `${q.quarter} Summary`, colSpan: 5, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }]);
        
        q.items.forEach(item => {
          const vals = item.values || {};
          const totalValue = (Number(vals.architecture) || 0) + (Number(vals.interior) || 0) + (Number(vals.cs) || 0) + (Number(vals.vo) || 0);
          detailsBody.push([
            item.rfpNumber || "No #",
            item.name,
            new Date(item.achievedDate || item.submissionDate).toLocaleDateString('en-GB'),
            item.type === "RFP" ? "Project" : item.type,
            totalValue.toLocaleString()
          ]);
        });
      }
    });

    autoTable(doc, {
      head: [['Ref #', 'Project Name', 'Date', 'Type', `Value (${currency})`]],
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
                  {data.target.toLocaleString()} <span className="text-sm text-[var(--text-secondary)]">{currency}</span>
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

        {/* Cumulative Achievement Chart */}
        <div className="mb-8 p-4 bg-[var(--bg-tertiary)]/10 rounded-lg border border-[var(--border)]" ref={chartRef}>
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <LineChartIcon size={16} />
            Cumulative Achievement Trend
          </h3>
          <div 
            className={cn("h-64 w-full select-none", isPanning ? "cursor-grabbing" : "cursor-grab")}
            ref={chartContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={metrics.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAchieved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                <XAxis 
                  dataKey="timestamp" 
                  type="number"
                  scale="time"
                  domain={zoomDomain || ['dataMin', 'dataMax']}
                  allowDataOverflow={true}
                  ticks={xAxisTicks}
                  tick={{ fill: '#888', fontSize: 12 }} 
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatXAxisTick}
                />
                <YAxis 
                  allowDataOverflow={true}
                  tick={{ fill: '#888', fontSize: 12 }} 
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                />
                <Tooltip 
                  content={<CustomTrendTooltip currency={currency} />}
                  cursor={{ stroke: '#333', strokeWidth: 1 }}
                />
                {new Date().getFullYear() === data.year && (
                  <ReferenceLine x={new Date().getTime()} stroke="#3b82f6" strokeDasharray="3 3" label={{ position: 'insideTopRight', value: 'Today', fill: '#3b82f6', fontSize: 12 }} />
                )}
                <Line 
                  type="linear" 
                  dataKey="linearTarget" 
                  stroke="#f59e0b" 
                  strokeDasharray="5 5" 
                  strokeWidth={2}
                  dot={false}
                  name="linearTarget"
                />
                <Area 
                  type="linear" 
                  dataKey="cumulative" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorAchieved)" 
                  strokeWidth={2}
                  name="cumulative"
                  connectNulls={false}
                  dot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quarterly Table */}
        <div className="overflow-auto max-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[var(--text-secondary)] uppercase bg-[var(--bg-tertiary)] border-y border-[var(--border)] sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 font-mono w-1/3">Quarter / Project</th>
                <th className="px-4 py-3 font-mono text-center">Date</th>
                <th className="px-4 py-3 font-mono text-right">Target ({currency})</th>
                <th className="px-4 py-3 font-mono text-right">Achieved ({currency})</th>
                <th className="px-4 py-3 font-mono text-right">% Achieved</th>
                <th className="px-4 py-3 font-mono text-right">Deficiency ({currency})</th>
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
                    <td className="px-4 py-3"></td>
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
                    const vals = item.values || {};
                    const totalValue = (Number(vals.architecture) || 0) + (Number(vals.interior) || 0) + (Number(vals.cs) || 0) + (Number(vals.vo) || 0);
                    
                    return (
                      <tr key={item.id} className="bg-[var(--card-bg)] hover:bg-[var(--bg-tertiary)]/20 transition-colors border-b border-[var(--border)] border-dashed">
                        <td className="px-4 py-2 pl-10">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium" style={{ color: sectors.find(s => s.name === item.sector)?.color || '#ccc' }} title={item.sector}>{item.name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                                  {item.type === "RFP" ? "Project" : item.type}
                                </span>
                                {editingItem?.id === item.id && !isReportView ? (
                                  <div className="flex items-center gap-1">
                                    <input 
                                      type="text" 
                                      value={editingItem.number}
                                      onChange={(e) => setEditingItem({ ...editingItem, number: e.target.value })}
                                      className="bg-[var(--bg-primary)] border border-[var(--border)] px-1 py-0.5 rounded text-xs font-mono w-24 focus:outline-none focus:border-[var(--text-primary)]"
                                      autoFocus
                                    />
                                  </div>
                                ) : (
                                  <span className="text-xs font-mono text-[var(--text-secondary)]">
                                    {item.rfpNumber || "No #"}
                                  </span>
                                )}
                              </div>
                              {/* Discipline Breakdown */}
                              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[10px] font-mono text-[var(--text-secondary)]">
                                {(vals.architecture > 0) && (
                                  <span className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: DISCIPLINE_COLORS["Architecture"] }}></span>
                                    Arch: {vals.architecture.toLocaleString()}
                                  </span>
                                )}
                                {(vals.interior > 0) && (
                                  <span className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: DISCIPLINE_COLORS["Interior"] }}></span>
                                    Int: {vals.interior.toLocaleString()}
                                  </span>
                                )}
                                {(vals.cs > 0) && (
                                  <span className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: DISCIPLINE_COLORS["Construction Supervision"] }}></span>
                                    CS: {vals.cs.toLocaleString()}
                                  </span>
                                )}
                                {(vals.vo > 0) && (
                                  <span className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: DISCIPLINE_COLORS["VO"] }}></span>
                                    VO: {vals.vo.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center font-mono text-xs text-[var(--text-secondary)]">
                          {editingItem?.id === item.id ? (
                            <input 
                              type="date"
                              value={editingItem.date}
                              onChange={(e) => setEditingItem({ ...editingItem, date: e.target.value })}
                              className="bg-[var(--bg-primary)] border border-[var(--border)] px-1 py-0.5 rounded text-xs font-mono w-28 focus:outline-none focus:border-[var(--text-primary)]"
                            />
                          ) : (
                            new Date(item.achievedDate || item.submissionDate).toLocaleDateString('en-GB')
                          )}
                        </td>
                        <td className="px-4 py-2 text-right text-[var(--text-tertiary)]">-</td>
                        <td className="px-4 py-2 text-right font-mono text-[var(--text-primary)]">
                          {editingItem?.id === item.id ? (
                            <div className="flex flex-col gap-1 items-end">
                              {item.type === "RFP" ? (
                                <>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-[var(--text-secondary)]">Arch:</span>
                                    <input type="number" value={editingItem.values.architecture || ""} onChange={e => setEditingItem({ ...editingItem, values: { ...editingItem.values, architecture: e.target.value ? Number(e.target.value) : undefined }})} className="w-20 bg-[var(--bg-primary)] border border-[var(--border)] px-1 py-0.5 rounded text-xs text-right" />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-[var(--text-secondary)]">Int:</span>
                                    <input type="number" value={editingItem.values.interior || ""} onChange={e => setEditingItem({ ...editingItem, values: { ...editingItem.values, interior: e.target.value ? Number(e.target.value) : undefined }})} className="w-20 bg-[var(--bg-primary)] border border-[var(--border)] px-1 py-0.5 rounded text-xs text-right" />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-[var(--text-secondary)]">CS:</span>
                                    <input type="number" value={editingItem.values.cs || ""} onChange={e => setEditingItem({ ...editingItem, values: { ...editingItem.values, cs: e.target.value ? Number(e.target.value) : undefined }})} className="w-20 bg-[var(--bg-primary)] border border-[var(--border)] px-1 py-0.5 rounded text-xs text-right" />
                                  </div>
                                </>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-[var(--text-secondary)]">VO:</span>
                                  <input type="number" value={editingItem.values.vo || ""} onChange={e => setEditingItem({ ...editingItem, values: { ...editingItem.values, vo: e.target.value ? Number(e.target.value) : undefined }})} className="w-20 bg-[var(--bg-primary)] border border-[var(--border)] px-1 py-0.5 rounded text-xs text-right" />
                                </div>
                              )}
                            </div>
                          ) : (
                            totalValue.toLocaleString()
                          )}
                        </td>
                        <td className="px-4 py-2 text-right text-[var(--text-tertiary)]">-</td>
                        <td className="px-4 py-2 text-right text-[var(--text-tertiary)]">-</td>
                        <td className="px-4 py-2 text-right text-[var(--text-tertiary)]">-</td>
                        <td className="px-4 py-2 text-center">
                          {!isReportView && (
                            <div className="flex items-center justify-center gap-1">
                              {editingItem?.id === item.id ? (
                                <>
                                  <button onClick={handleUpdateItem} className="text-emerald-500 hover:text-emerald-400 p-1"><Check size={14} /></button>
                                  <button onClick={() => setEditingItem(null)} className="text-rose-500 hover:text-rose-400 p-1"><X size={14} /></button>
                                </>
                              ) : (
                                <>
                                  <button 
                                    onClick={() => setEditingItem({ 
                                      id: item.id, 
                                      number: item.rfpNumber || "", 
                                      date: formatDateForInput(item.achievedDate || item.submissionDate),
                                      values: item.values || {}
                                    })}
                                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1"
                                    title="Edit Item"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button 
                                    onClick={() => setItemToDelete(item)}
                                    className="text-[var(--text-secondary)] hover:text-rose-400 transition-colors p-1"
                                    title="Remove from Achieved"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
              <tr className="bg-[var(--bg-tertiary)]/30 font-bold border-t-2 border-[var(--border)]">
                <td className="px-4 py-4 text-[var(--text-primary)]">TOTAL</td>
                <td className="px-4 py-4"></td>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:grid-cols-2 print:break-before-page">
        {/* Sector Breakdown */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-lg print:break-inside-avoid">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <BarChart2 size={16} />
            Achieved by Market Sector
          </h3>
          <div className="h-80 print:h-72 w-full min-w-0 min-h-0 print:overflow-visible">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.sectorData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barSize={30}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#888" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#888" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 'auto']}
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                    return value;
                  }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number, name: string, props: any) => {
                    const share = props.payload.share;
                    return [`${value.toLocaleString()} ${currency} (${share.toFixed(1)}%)`, name];
                  }}
                  cursor={{ fill: '#333', opacity: 0.4 }}
                />
                <Bar 
                  dataKey="value" 
                  radius={[4, 4, 0, 0]}
                  minPointSize={10}
                >
                  {metrics.sectorData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      className="hover:opacity-80 transition-opacity cursor-pointer outline-none" 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 space-y-3">
            {metrics.sectorData.map((sector, index) => (
              <div key={sector.name} className="flex items-center justify-between text-xs hover:bg-[var(--bg-tertiary)] p-1.5 -mx-1.5 rounded transition-colors cursor-default">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sector.color }} />
                  <span className="text-[var(--text-secondary)]">{sector.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[var(--text-primary)] font-mono font-bold">{sector.value.toLocaleString()} {currency}</span>
                  <span className="text-[var(--text-tertiary)] w-10 text-right font-mono">
                    {sector.share.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Discipline Breakdown */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-lg print:break-inside-avoid">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <Layers size={16} />
            Achieved by Discipline
          </h3>
          <div className="space-y-6">
            {metrics.disciplineData.map((d) => (
              <div key={d.name} className="hover:bg-[var(--bg-tertiary)] p-2 -mx-2 rounded transition-colors cursor-default">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-[var(--text-secondary)] font-medium">{d.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-[var(--text-primary)] font-mono">{d.value.toLocaleString()} {currency}</span>
                    <span className="text-[var(--text-tertiary)] w-8 text-right">{d.share.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ 
                      width: `${d.share}%`,
                      backgroundColor: d.color
                    }}
                  />
                </div>
              </div>
            ))}
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
