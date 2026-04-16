import React, { useState, useMemo, useEffect } from "react";
import { Plus, Briefcase, DollarSign, BarChart2, Layers, Check, X, Edit2, Trash2, ArrowRightLeft, Printer } from "lucide-react";
import { cn } from "../lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useSearch } from "../context/SearchContext";
import { useCurrency } from "../context/CurrencyContext";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

type Sector = string;
type Discipline = "Architecture" | "Interior" | "Construction Supervision";

interface PipelineItem {
  id: string;
  name: string;
  client?: string;
  sector: Sector;
  type: "RFP" | "VO";
  disciplines?: Discipline[]; // Only for RFPs
  values: {
    architecture?: number;
    interior?: number;
    cs?: number;
    vo?: number; // For VO type
  };
  status: "Pending" | "Submitted" | "Won" | "Lost" | "Achieved" | "Approved";
  submissionDate?: string;
  probability?: "High" | "Medium" | "Low";
  rfpNumber?: string;
  achievedDate?: string;
  sortOrder?: number;
  region?: string;
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

const DISCIPLINES: Discipline[] = ["Architecture", "Interior", "Construction Supervision"];

type TabType = "Submitted Proposals" | "Proposals to be Submitted" | "Potential VOs";

import { ReportLayout } from "../components/layout/ReportLayout";

export function Pipeline({ isReportView = false }: { isReportView?: boolean }) {
  const { searchQuery } = useSearch();
  const { currency } = useCurrency();
  const [items, setItems] = useState<PipelineItem[]>([]);
  const [sectors, setSectors] = useState<MarketSector[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("Submitted Proposals");
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<"All" | "Architecture" | "Interior" | "CS">("All");
  const [sortBy, setSortBy] = useState<"manual" | "probability" | "value" | "date">("manual");
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);

  const availableRegions = useMemo(() => {
    const regions = new Set<string>();
    items.forEach(i => {
      if (i.region) regions.add(i.region);
    });
    return Array.from(regions).sort();
  }, [items]);

  const getTotalValue = (item: PipelineItem) => {
    if (item.type === "VO") return item.values.vo || 0;
    return (item.values.architecture || 0) + (item.values.interior || 0) + (item.values.cs || 0);
  };

  const getFilteredValue = (item: PipelineItem) => {
    if (item.type === "VO") {
      return viewFilter === "All" ? (item.values.vo || 0) : 0;
    }
    if (viewFilter === "All") return getTotalValue(item);
    if (viewFilter === "Architecture") return item.values.architecture || 0;
    if (viewFilter === "Interior") return item.values.interior || 0;
    if (viewFilter === "CS") return item.values.cs || 0;
    return 0;
  };

  const sortItems = (itemsList: PipelineItem[]) => {
    return [...itemsList].sort((a, b) => {
      if (sortBy === "probability") {
        const probWeight = { "High": 3, "Medium": 2, "Low": 1, undefined: 0 };
        return (probWeight[b.probability as keyof typeof probWeight] || 0) - (probWeight[a.probability as keyof typeof probWeight] || 0);
      }
      if (sortBy === "value") {
        return getFilteredValue(b) - getFilteredValue(a);
      }
      if (sortBy === "date") {
        const dateA = a.submissionDate ? new Date(a.submissionDate).getTime() : 0;
        const dateB = b.submissionDate ? new Date(b.submissionDate).getTime() : 0;
        return dateB - dateA;
      }
      // manual
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });
  };

  // Fetch items and sectors on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pipelineRes, sectorsRes] = await Promise.all([
          fetch('/api/pipeline'),
          fetch('/api/market-sectors')
        ]);
        
        const pipelineData = await pipelineRes.json();
        const sectorsData = await sectorsRes.json();
        
        setItems(pipelineData);
        setSectors(sectorsData);
        
        // Update default sector if sectors are loaded
        if (sectorsData.length > 0) {
          setNewItem(prev => ({ ...prev, sector: sectorsData[0].name }));
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      }
    };
    
    fetchData();
  }, []);

  // Form State
  const [newItem, setNewItem] = useState<Partial<PipelineItem>>({
    type: "RFP",
    sector: "",
    disciplines: [],
    values: {},
    status: "Pending",
    region: ""
  });

  const handleSaveItem = async () => {
    if (!newItem.name) return;
    
    const itemData = {
      name: newItem.name,
      client: newItem.client || "",
      sector: newItem.sector as Sector,
      type: newItem.type as "RFP" | "VO",
      disciplines: newItem.type === "RFP" ? newItem.disciplines : undefined,
      values: newItem.values || {},
      status: newItem.status as any || "Pending",
      submissionDate: newItem.submissionDate,
      probability: newItem.probability,
      rfpNumber: newItem.rfpNumber,
      achievedDate: newItem.achievedDate,
      sortOrder: newItem.sortOrder || 0,
      region: newItem.region || ""
    };

    try {
      if (editingId) {
        await fetch(`/api/pipeline/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemData)
        });
        setItems(items.map(i => i.id === editingId ? { ...itemData, id: editingId } as PipelineItem : i));
      } else {
        const res = await fetch('/api/pipeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemData)
        });
        const { id } = await res.json();
        setItems([...items, { ...itemData, id } as PipelineItem]);
      }
      
      setIsModalOpen(false);
      setEditingId(null);
      setNewItem({ type: "RFP", sector: sectors[0]?.name || "", disciplines: [], values: {}, status: "Pending" });
    } catch (err) {
      console.error('Failed to save item:', err);
      alert('Failed to save item. Please try again.');
    }
  };

  const handleEdit = (item: PipelineItem) => {
    setEditingId(item.id);
    setNewItem({ ...item });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      try {
        await fetch(`/api/pipeline/${id}`, { method: 'DELETE' });
        setItems(items.filter(i => i.id !== id));
      } catch (err) {
        console.error('Failed to delete item:', err);
        alert('Failed to delete item. Please try again.');
      }
    }
  };

  const toggleDiscipline = (d: Discipline) => {
    const current = newItem.disciplines || [];
    if (current.includes(d)) {
      setNewItem({ 
        ...newItem, 
        disciplines: current.filter(x => x !== d),
        values: { ...newItem.values, [d === "Construction Supervision" ? "cs" : d.toLowerCase()]: undefined }
      });
    } else {
      setNewItem({ ...newItem, disciplines: [...current, d] });
    }
  };

  const updateValue = (key: "architecture" | "interior" | "cs" | "vo", val: number) => {
    setNewItem({
      ...newItem,
      values: { ...newItem.values, [key]: val }
    });
  };

  const getTabForItem = (item: PipelineItem): TabType | null => {
    if (item.type === "RFP" && item.status === "Submitted") return "Submitted Proposals";
    if (item.type === "RFP" && item.status === "Pending") return "Proposals to be Submitted";
    if (item.type === "VO" && (item.status === "Pending" || item.status === "Submitted")) return "Potential VOs";
    return null;
  };

  // Calculations
  const metrics = useMemo(() => {
    // Include items that belong to any of the 4 tabs
    const activeItems = items.filter(i => getTabForItem(i) !== null);

    const totalRFP = activeItems.filter(i => i.type === "RFP").reduce((acc, curr) => acc + getFilteredValue(curr), 0);
    const totalVO = activeItems.filter(i => i.type === "VO").reduce((acc, curr) => acc + getFilteredValue(curr), 0);
    const totalPipeline = totalRFP + totalVO;

    // Absolute totals for discipline breakdown (ignoring view filter)
    const absoluteTotalPipeline = activeItems.reduce((acc, curr) => {
      return acc + (curr.values.architecture || 0) + (curr.values.interior || 0) + (curr.values.cs || 0) + (curr.values.vo || 0);
    }, 0);

    const totalArch = activeItems.reduce((acc, curr) => acc + (curr.values.architecture || 0), 0);
    const totalInt = activeItems.reduce((acc, curr) => acc + (curr.values.interior || 0), 0);
    const totalSupervision = activeItems.reduce((acc, curr) => acc + (curr.values.cs || 0), 0);

    const disciplineData = [
      { name: "Architecture", value: totalArch, color: DISCIPLINE_COLORS["Architecture"] },
      { name: "Interior", value: totalInt, color: DISCIPLINE_COLORS["Interior"] },
      { name: "Supervision", value: totalSupervision, color: DISCIPLINE_COLORS["Construction Supervision"] },
    ];

    const sectorData = sectors.map(sector => {
      const sectorItems = activeItems.filter(i => i.sector === sector.name);
      const value = sectorItems.reduce((acc, curr) => acc + getFilteredValue(curr), 0);
      return { name: sector.name, value, color: sector.color };
    }).filter(d => d.value > 0);

    return { totalRFP, totalVO, totalPipeline, sectorData, disciplineData, absoluteTotalPipeline };
  }, [items, viewFilter]);

  const [achievingItem, setAchievingItem] = useState<{ item: PipelineItem, status: "Achieved" | "Approved" } | null>(null);
  const [achievementDate, setAchievementDate] = useState(new Date().toISOString().split('T')[0]);

  const handleStatusUpdate = async () => {
    if (!achievingItem) return;
    
    const { item, status } = achievingItem;
    
    try {
      const updatedItem = { 
        ...item, 
        status: status,
        achievedDate: achievementDate
      };
      
      await fetch(`/api/pipeline/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem)
      });
      
      setItems(items.filter(i => i.id !== item.id));
      setAchievingItem(null);
    } catch (err) {
      console.error('Failed to update item status:', err);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleQuickStatusToggle = async (item: PipelineItem, newStatus: PipelineItem["status"]) => {
    if (newStatus === "Achieved" || newStatus === "Approved") {
       setAchievingItem({ item, status: newStatus });
       setAchievementDate(new Date().toISOString().split('T')[0]);
       return;
    }

    try {
      const updatedItem = { ...item, status: newStatus };
      await fetch(`/api/pipeline/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem)
      });
      
      setItems(items.map(i => i.id === item.id ? updatedItem : i));
    } catch (err) {
      console.error('Failed to update item status:', err);
      alert('Failed to update status. Please try again.');
    }
  };

  const getGroupedItemsForTab = (tab: TabType) => {
    const tabItems = items.filter(i => 
      getTabForItem(i) === tab &&
      ((i.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
       (i.client && i.client.toLowerCase().includes(searchQuery.toLowerCase()))) &&
      (viewFilter === "All" || (Array.isArray(i.disciplines) && i.disciplines.some(d => {
        if (viewFilter === "Architecture") return d === "Architecture";
        if (viewFilter === "Interior") return d === "Interior";
        if (viewFilter === "CS") return d === "Construction Supervision";
        return false;
      }))) &&
      (selectedRegions.length === 0 || (i.region && selectedRegions.includes(i.region))) &&
      (selectedSectorFilter === null || i.sector === selectedSectorFilter)
    );
    return groupItems(tabItems);
  };

  const currentTabItems = useMemo(() => items.filter(i => 
    getTabForItem(i) === activeTab &&
    ((i.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
     (i.client && i.client.toLowerCase().includes(searchQuery.toLowerCase()))) &&
    (viewFilter === "All" || (Array.isArray(i.disciplines) && i.disciplines.some(d => {
      if (viewFilter === "Architecture") return d === "Architecture";
      if (viewFilter === "Interior") return d === "Interior";
      if (viewFilter === "CS") return d === "Construction Supervision";
      return false;
    }))) &&
    (selectedRegions.length === 0 || (i.region && selectedRegions.includes(i.region))) &&
    (selectedSectorFilter === null || i.sector === selectedSectorFilter)
  ), [items, activeTab, searchQuery, viewFilter, selectedRegions, selectedSectorFilter]);

  const groupItems = (list: PipelineItem[]) => {
    const sortedList = sortItems(list);
    const grouped: Record<string, PipelineItem[]> = {};
    sectors.forEach(sector => {
      const sectorItems = sortedList.filter(i => i.sector === sector.name);
      if (sectorItems.length > 0) {
        grouped[sector.name] = sectorItems;
      }
    });
    return grouped;
  };

  const groupedItems = useMemo(() => groupItems(currentTabItems), [currentTabItems, sortBy]);

  const [sectorOrder, setSectorOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('pipelineSectorOrder');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (sectors.length > 0) {
      const currentNames = sectors.map(s => s.name);
      const newOrder = [...sectorOrder];
      currentNames.forEach(name => {
        if (!newOrder.includes(name)) newOrder.push(name);
      });
      const finalOrder = newOrder.filter(name => currentNames.includes(name));
      if (JSON.stringify(finalOrder) !== JSON.stringify(sectorOrder)) {
        setSectorOrder(finalOrder);
        localStorage.setItem('pipelineSectorOrder', JSON.stringify(finalOrder));
      }
    }
  }, [sectors]);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    
    if (result.type === "sector") {
      const grouped = groupedItems;
      const orderedSectors = sectorOrder.filter(s => grouped[s]).length > 0 
        ? sectorOrder.filter(s => grouped[s])
        : Object.keys(grouped);
        
      const newOrderedSectors = Array.from(orderedSectors);
      const [removed] = newOrderedSectors.splice(result.source.index, 1);
      newOrderedSectors.splice(result.destination.index, 0, removed);
      
      const newSectorOrder = [...newOrderedSectors];
      sectorOrder.forEach(s => {
        if (!newSectorOrder.includes(s)) {
          newSectorOrder.push(s);
        }
      });
      
      setSectorOrder(newSectorOrder);
      localStorage.setItem('pipelineSectorOrder', JSON.stringify(newSectorOrder));
      return;
    }
    
    const { source, destination } = result;
    
    // Only allow reordering within the same sector (droppableId = sector name)
    if (source.droppableId !== destination.droppableId) return;
    if (source.index === destination.index) return;

    const sectorName = source.droppableId;
    
    // Get ALL items in this sector and tab, sorted by their current order
    const allSectorTabItems = sortItems(items.filter(i => i.sector === sectorName && getTabForItem(i) === activeTab));
    
    // The items currently visible and being dragged
    const visibleItems = groupedItems[sectorName] || [];
    
    // The new order of the visible items
    const newVisibleItems = [...visibleItems];
    const [removed] = newVisibleItems.splice(source.index, 1);
    newVisibleItems.splice(destination.index, 0, removed);
    
    // Merge newVisibleItems back into allSectorTabItems
    let visibleIndex = 0;
    const updatedAllSectorTabItems = allSectorTabItems.map(item => {
      if (visibleItems.find(v => v.id === item.id)) {
        return newVisibleItems[visibleIndex++];
      }
      return item;
    });
    
    // Assign sequential sortOrders to ALL items in this sector and tab
    const finalUpdatedItems: PipelineItem[] = updatedAllSectorTabItems.map((item, index) => ({
      ...item,
      sortOrder: index
    }));

    // Update local state immediately
    setItems(prevItems => {
      const updatedItemIds = new Set(finalUpdatedItems.map(i => i.id));
      const otherItems = prevItems.filter(i => !updatedItemIds.has(i.id));
      return [...otherItems, ...finalUpdatedItems];
    });

    // If not in manual sort mode, switch to manual
    if (sortBy !== "manual") {
      setSortBy("manual");
    }

    // Update backend
    try {
      await Promise.all(finalUpdatedItems.map(item => 
        fetch(`/api/pipeline/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        })
      ));
    } catch (err) {
      console.error("Failed to save new order", err);
    }
  };

  const renderCleanGroupedItems = (grouped: Record<string, PipelineItem[]>) => {
    const orderedSectors = sectorOrder.filter(s => grouped[s]).length > 0 
      ? sectorOrder.filter(s => grouped[s])
      : Object.keys(grouped);

    return (
      <div className="space-y-4">
        {orderedSectors.map((sector) => {
          const sectorItems = grouped[sector];
          if (!sectorItems) return null;
          const sectorColor = sectors.find(s => s.name === sector)?.color || 'var(--text-secondary)';
          return (
            <div key={`sector-${sector}`} className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] overflow-hidden print:break-inside-avoid">
              <div className="p-3 bg-[var(--bg-tertiary)] border-b border-[var(--border)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sectorColor }} />
                <h4 className="text-xs font-mono uppercase tracking-wider font-bold" style={{ color: sectorColor }}>
                  {sector}
                </h4>
              </div>
              <div className="p-3 space-y-2">
                {sectorItems.map((item) => (
                  <div key={item.id} className="bg-[var(--card-bg-inner)] border border-[var(--border)] p-3 relative pl-4 overflow-hidden print:break-inside-avoid">
                    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: sectorColor }} />
                    <div className="flex justify-between items-start pr-16">
                      <div>
                        <h5 className="text-sm font-medium" style={{ color: sectorColor }}>
                          {item.rfpNumber && <span className="font-mono text-xs opacity-70 mr-2">{item.rfpNumber}</span>}
                          {item.name}
                        </h5>
                        {item.client && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{item.client}</p>}
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[var(--text-secondary)] font-mono uppercase tracking-wider">
                           {item.submissionDate && <span>{activeTab === "Proposals to be Submitted" ? "Submission Date" : "Submitted"}: {item.submissionDate}</span>}
                           {item.region && <span>Region: {item.region}</span>}
                           {item.probability && (
                             <span className={cn(
                               "px-1.5 py-0.5 rounded font-bold border",
                               item.probability === "High" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
                               item.probability === "Medium" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                             )}>
                               Prob: {item.probability}
                             </span>
                           )}
                           <span className="px-1.5 py-0.5 rounded font-bold border bg-[var(--bg-tertiary)] text-[var(--text-primary)] border-[var(--border)]">
                             {item.status}
                           </span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1.5">
                        <div>
                          <span className="text-sm font-mono text-[var(--text-primary)] block">{getFilteredValue(item).toLocaleString()} {currency}</span>
                          {viewFilter !== "All" && (
                            <span className="text-[10px] text-[var(--text-secondary)]">of {getTotalValue(item).toLocaleString()} Total</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {item.type === "RFP" && Array.isArray(item.disciplines) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.disciplines.map((d) => {
                          const isSelected = viewFilter === "All" || 
                                            (viewFilter === "Architecture" && d === "Architecture") ||
                                            (viewFilter === "Interior" && d === "Interior") ||
                                            (viewFilter === "CS" && d === "Construction Supervision");
                          const color = DISCIPLINE_COLORS[d] || 'var(--text-secondary)';
                          return (
                            <span key={d} className={cn(
                              "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border",
                              !isSelected && "opacity-40 grayscale"
                            )}
                            style={{ borderColor: color, color: color, backgroundColor: `${color}1A` }}>
                              {d === "Construction Supervision" ? "CS" : d}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-12 text-[var(--text-secondary)]">
            No items found for this category.
          </div>
        )}
      </div>
    );
  };

  const renderGroupedItems = (grouped: Record<string, PipelineItem[]>) => {
    const orderedSectors = sectorOrder.filter(s => grouped[s]).length > 0 
      ? sectorOrder.filter(s => grouped[s])
      : Object.keys(grouped);

    return (
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="sectors-container" type="sector">
          {(provided) => (
            <div 
              className="space-y-4"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {orderedSectors.map((sector, index) => {
                const sectorItems = grouped[sector];
                if (!sectorItems) return null;
                const sectorColor = sectors.find(s => s.name === sector)?.color || 'var(--text-secondary)';
                return (
                  // @ts-ignore
                  <Draggable key={`sector-${sector}`} draggableId={`sector-${sector}`} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          "bg-[var(--card-bg)] rounded-xl border border-[var(--border)] overflow-hidden transition-all duration-300",
                          snapshot.isDragging && "shadow-xl border-[var(--text-primary)] z-50"
                        )}
                      >
                        <div 
                          {...provided.dragHandleProps}
                          className="p-3 bg-[var(--bg-tertiary)] border-b border-[var(--border)] flex items-center gap-2 cursor-grab active:cursor-grabbing"
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sectorColor }} />
                          <h4 
                            className="text-xs font-mono uppercase tracking-wider font-bold"
                            style={{ color: sectorColor }}
                          >
                            {sector}
                          </h4>
                        </div>
                        <Droppable droppableId={sector} type="item" isDropDisabled={sortBy !== "manual" && sortBy !== undefined}>
                          {(provided) => (
                            <div 
                              className="p-3 space-y-2"
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                            >
                              {sectorItems.map((item, itemIndex) => (
                                // @ts-ignore
                                <Draggable key={item.id} draggableId={item.id} index={itemIndex} isDragDisabled={sortBy !== "manual"}>
                                  {(provided, snapshot) => (
                                    <div 
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={cn(
                                        "bg-[var(--card-bg-inner)] border border-[var(--border)] p-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-[var(--text-secondary)] group relative pl-4 overflow-hidden print:break-inside-avoid",
                                        snapshot.isDragging && "shadow-lg border-[var(--text-primary)] z-50 scale-[1.02]"
                                      )}
                                    >
                                      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: sectorColor }} />
                                      
                                      <div className="flex justify-between items-start pr-16">
                                        <div>
                                          <h5 
                                            className="text-sm font-medium transition-colors"
                                            style={{ color: sectorColor }}
                                          >
                                            {item.rfpNumber && <span className="font-mono text-xs opacity-70 mr-2">{item.rfpNumber}</span>}
                                            {item.name}
                                          </h5>
                                          {item.client && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{item.client}</p>}
                                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[var(--text-secondary)] font-mono uppercase tracking-wider">
                                             {item.submissionDate && <span>{activeTab === "Proposals to be Submitted" ? "Submission Date" : "Submitted"}: {item.submissionDate}</span>}
                                             {item.region && <span>Region: {item.region}</span>}
                                             {item.probability && (
                                               <span className={cn(
                                                 "px-1.5 py-0.5 rounded font-bold border",
                                                 item.probability === "High" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
                                                 item.probability === "Medium" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                                               )}>
                                                 Prob: {item.probability}
                                               </span>
                                             )}
                                             <span
                                               className="px-1.5 py-0.5 rounded font-bold border bg-[var(--bg-tertiary)] text-[var(--text-primary)] border-[var(--border)]"
                                             >
                                               {item.status}
                                             </span>
                                          </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-1.5">
                                          <div>
                                            <span className="text-sm font-mono text-[var(--text-primary)] block">{getFilteredValue(item).toLocaleString()} {currency}</span>
                                            {viewFilter !== "All" && (
                                              <span className="text-[10px] text-[var(--text-secondary)]">of {getTotalValue(item).toLocaleString()} Total</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {item.type === "RFP" && Array.isArray(item.disciplines) && (
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                          {item.disciplines.map((d) => {
                                            const isSelected = viewFilter === "All" || 
                                                              (viewFilter === "Architecture" && d === "Architecture") ||
                                                              (viewFilter === "Interior" && d === "Interior") ||
                                                              (viewFilter === "CS" && d === "Construction Supervision");
                                            const color = DISCIPLINE_COLORS[d] || 'var(--text-secondary)';
                                            return (
                                              <span key={d} className={cn(
                                                "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border",
                                                !isSelected && "opacity-40 grayscale"
                                              )}
                                              style={{
                                                borderColor: color,
                                                color: color,
                                                backgroundColor: `${color}1A`
                                              }}>
                                                {d === "Construction Supervision" ? "CS" : d}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      )}

                                      {/* Action Buttons Container (Hidden by default, shown on hover at the end) */}
                                      {!isReportView && (
                                        <div className="absolute top-0 right-0 bottom-0 flex items-center gap-1 px-3 bg-gradient-to-l from-[var(--card-bg-inner)] via-[var(--card-bg-inner)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-x-4 group-hover:translate-x-0">
                                          {item.type === "RFP" && item.status === "Pending" && (
                                            <button 
                                              onClick={() => handleQuickStatusToggle(item, "Submitted")}
                                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors shadow-sm"
                                              title="Move to Submitted"
                                            >
                                              <ArrowRightLeft size={12} />
                                              To Submitted
                                            </button>
                                          )}
                                          {item.type === "VO" && (item.status === "Pending" || item.status === "Submitted") && (
                                            <button 
                                              onClick={() => handleQuickStatusToggle(item, "Approved")}
                                              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors shadow-sm"
                                              title="Approve"
                                            >
                                              <Check size={12} />
                                              Approve
                                            </button>
                                          )}
                                          {item.type === "RFP" && item.status === "Submitted" && (
                                            <button 
                                              onClick={() => handleQuickStatusToggle(item, "Achieved")}
                                              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors shadow-sm"
                                              title="Mark as Achieved"
                                            >
                                              <Check size={12} />
                                              Achieved
                                            </button>
                                          )}
                                          <button 
                                            onClick={() => handleEdit(item)}
                                            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-2 bg-[var(--bg-primary)] rounded-full shadow-sm border border-[var(--border)] hover:scale-110 transition-all duration-200"
                                            title="Edit"
                                          >
                                            <Edit2 size={14} />
                                          </button>
                                          <button 
                                            onClick={() => handleDelete(item.id)}
                                            className="text-[var(--text-secondary)] hover:text-red-400 p-2 bg-[var(--bg-primary)] rounded-full shadow-sm border border-[var(--border)] hover:scale-110 transition-all duration-200"
                                            title="Delete"
                                          >
                                            <Trash2 size={14} />
                                          </button>
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
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
        
        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-12 text-[var(--text-secondary)]">
            No items found for this category.
          </div>
        )}
      </DragDropContext>
    );
  };

  return (
    <ReportLayout title="Pipeline Report" subtitle="Project Opportunities & Variations" isReportView={isReportView}>
      <div className="space-y-8">
        <div className="flex justify-between items-end print:hidden">
          <div>
            <h1 className="text-4xl font-light tracking-tight text-[var(--text-primary)] mb-2">PIPELINE</h1>
            <p className="text-[var(--text-secondary)] font-mono text-sm uppercase tracking-wider">Project Opportunities & Variations</p>
          </div>
          <div className="flex items-center gap-4">
            {!isReportView && (
              <div className="flex items-center gap-3">
                {availableRegions.length > 0 && (
                  <div className="flex items-center gap-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 relative group transition-all duration-300 hover:border-[var(--text-secondary)] hover:shadow-sm cursor-pointer">
                    <span className="text-xs font-mono uppercase text-[var(--text-secondary)]">Region:</span>
                    <div className="text-xs font-medium text-[var(--text-primary)] flex items-center gap-1">
                      {selectedRegions.length === 0 ? "All" : `${selectedRegions.length} Selected`}
                    </div>
                    <div className="absolute top-full right-0 mt-2 w-48 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-50 p-2">
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        <label className="flex items-center gap-2 p-1.5 hover:bg-[var(--bg-tertiary)] rounded cursor-pointer transition-colors">
                          <input 
                            type="checkbox" 
                            checked={selectedRegions.length === 0}
                            onChange={() => setSelectedRegions([])}
                            className="rounded border-[var(--border)] text-[var(--text-primary)] focus:ring-0 transition-all"
                          />
                          <span className="text-xs text-[var(--text-primary)]">All Regions</span>
                        </label>
                        <div className="h-px bg-[var(--border)] my-1" />
                        {availableRegions.map(region => (
                          <label key={region} className="flex items-center gap-2 p-1.5 hover:bg-[var(--bg-tertiary)] rounded cursor-pointer transition-colors">
                            <input 
                              type="checkbox" 
                              checked={selectedRegions.includes(region)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRegions([...selectedRegions, region]);
                                } else {
                                  setSelectedRegions(selectedRegions.filter(r => r !== region));
                                }
                              }}
                              className="rounded border-[var(--border)] text-[var(--text-primary)] focus:ring-0 transition-all"
                            />
                            <span className="text-xs text-[var(--text-primary)]">{region}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 transition-all duration-300 hover:border-[var(--text-secondary)] hover:shadow-sm">
                  <span className="text-xs font-mono uppercase text-[var(--text-secondary)]">Sort:</span>
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent text-xs font-medium text-[var(--text-primary)] focus:outline-none cursor-pointer"
                  >
                    <option value="manual">Manual (Drag)</option>
                    <option value="probability">Probability</option>
                    <option value="value">Value</option>
                    <option value="date">Date</option>
                  </select>
                </div>
                <div className="flex bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-1">
                  {(["All", "Architecture", "Interior", "CS"] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setViewFilter(filter)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded transition-all duration-300 hover:scale-105 active:scale-95",
                        viewFilter === filter 
                          ? "bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-sm" 
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                      )}
                    >
                      {filter === "CS" ? "Supervision" : filter}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!isReportView && (
              <>
                <button 
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs font-bold uppercase tracking-wider hover:bg-[var(--border)] transition-colors border border-[var(--border)]"
                >
                  <Printer size={16} /> Print Report
                </button>
                <button 
                  onClick={() => {
                    setEditingId(null);
                    setNewItem({ type: "RFP", sector: sectors[0]?.name || "", disciplines: [], values: {}, status: "Pending" });
                    setIsModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-bold uppercase tracking-wider hover:bg-[var(--text-secondary)] transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
                >
                  <Plus size={16} />
                  Add Entry
                </button>
              </>
            )}
          </div>
        </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3">
        <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-[var(--text-secondary)] group cursor-default">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-mono uppercase text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">Total Pipeline Value ({viewFilter})</h3>
            <DollarSign size={20} className="text-emerald-400 group-hover:scale-110 transition-transform duration-300" />
          </div>
          <p className="text-3xl font-medium text-[var(--text-primary)]">
            {metrics.totalPipeline.toLocaleString()} <span className="text-sm text-[var(--text-secondary)]">{currency}</span>
          </p>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-[var(--text-secondary)] group cursor-default">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-mono uppercase text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">RFP Value ({viewFilter})</h3>
            <Briefcase size={20} className="text-blue-400 group-hover:scale-110 transition-transform duration-300" />
          </div>
          <p className="text-3xl font-medium text-[var(--text-primary)]">
            {metrics.totalRFP.toLocaleString()} <span className="text-sm text-[var(--text-secondary)]">{currency}</span>
          </p>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-[var(--text-secondary)] group cursor-default">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-mono uppercase text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">VO Value</h3>
            <Layers size={20} className="text-amber-400 group-hover:scale-110 transition-transform duration-300" />
          </div>
          <p className="text-3xl font-medium text-[var(--text-primary)]">
            {metrics.totalVO.toLocaleString()} <span className="text-sm text-[var(--text-secondary)]">{currency}</span>
          </p>
        </div>
      </div>

      {/* Dashboard Section */}
      <div className={cn(
        "grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8",
        isReportView ? "grid-cols-1 print:break-inside-avoid" : "print:grid-cols-2"
      )}>
        {/* Sector Breakdown Chart */}
        <div className={cn(
          "bg-[var(--card-bg)] border border-[var(--border)] p-6 transition-all duration-300 hover:border-[var(--text-secondary)] hover:shadow-lg group",
          isReportView && "col-span-1"
        )}>
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-6 flex items-center gap-2 group-hover:text-emerald-400 transition-colors">
            <BarChart2 size={16} className="group-hover:rotate-12 transition-transform" />
            Sector Distribution ({viewFilter})
          </h3>
          <div className="h-64 w-full min-h-[256px]">
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={metrics.sectorData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barSize={isReportView ? 30 : undefined}>
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
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                    return value;
                  }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number) => `${value.toLocaleString()} ${currency}`}
                  cursor={{ fill: '#333', opacity: 0.4 }}
                />
                {isReportView && (
                  <Legend 
                    layout="vertical" 
                    align="right" 
                    verticalAlign="middle" 
                    wrapperStyle={{ paddingLeft: '20px' }}
                  />
                )}
                <Bar 
                  dataKey="value" 
                  radius={[4, 4, 0, 0]}
                  onClick={(data) => {
                    if (selectedSectorFilter === data.name) {
                      setSelectedSectorFilter(null);
                    } else {
                      setSelectedSectorFilter(data.name);
                    }
                  }}
                >
                  {metrics.sectorData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      opacity={selectedSectorFilter && selectedSectorFilter !== entry.name ? 0.3 : 1}
                      className="hover:opacity-80 transition-opacity cursor-pointer outline-none" 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {!isReportView && (
            <div className="mt-6 space-y-3">
              {metrics.sectorData.map((sector, index) => (
                <div key={sector.name} className="flex items-center justify-between text-xs hover:bg-[var(--bg-tertiary)] p-1.5 -mx-1.5 rounded transition-colors cursor-default">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sector.color }} />
                    <span className="text-[var(--text-secondary)]">{sector.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[var(--text-primary)] font-mono">{sector.value.toLocaleString()} {currency}</span>
                    <span className="text-[var(--text-tertiary)] w-8 text-right">
                      {((sector.value / metrics.totalPipeline) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Discipline Breakdown Chart */}
        <div className={cn(
          "bg-[var(--card-bg)] border border-[var(--border)] p-6 transition-all duration-300 hover:border-[var(--text-secondary)] hover:shadow-lg group",
          isReportView && "col-span-1"
        )}>
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-6 flex items-center gap-2 group-hover:text-blue-400 transition-colors">
            <BarChart2 size={16} className="group-hover:rotate-12 transition-transform" />
            Revenue by Discipline
          </h3>
          {isReportView ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  layout="vertical" 
                  data={metrics.disciplineData} 
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  barSize={20}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                  <XAxis 
                    type="number" 
                    stroke="#888" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                      return value;
                    }}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    stroke="#888" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    width={80}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: number) => `${value.toLocaleString()} ${currency}`}
                    cursor={{ fill: '#333', opacity: 0.4 }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {metrics.disciplineData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="space-y-6">
              {metrics.disciplineData.map((d) => {
                const percentage = metrics.absoluteTotalPipeline > 0 
                  ? (d.value / metrics.absoluteTotalPipeline) * 100 
                  : 0;
                
                return (
                  <div key={d.name} className="hover:bg-[var(--bg-tertiary)] p-2 -mx-2 rounded transition-colors cursor-default">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-[var(--text-secondary)] font-medium">{d.name}</span>
                      <span className="text-[var(--text-primary)] font-mono">{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-[var(--bg-tertiary)] h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ width: `${percentage}%`, backgroundColor: d.color }} 
                      />
                    </div>
                    <div className="text-right text-[10px] text-[var(--text-tertiary)] mt-1 font-mono">
                      {d.value.toLocaleString()} {currency}
                    </div>
                  </div>
                );
              })}
              
              <div className="pt-4 border-t border-[var(--border)] flex justify-between items-center hover:bg-[var(--bg-tertiary)] p-2 -mx-2 rounded transition-colors cursor-default">
                <span className="text-xs text-[var(--text-secondary)]">Total Revenue</span>
                <span className="text-xs font-mono text-[var(--text-primary)]">{metrics.absoluteTotalPipeline.toLocaleString()} {currency}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main List */}
      <div className="space-y-6 print:break-before-page">
        {isReportView ? (
          <div className="space-y-12">
            {(["Submitted Proposals", "Proposals to be Submitted", "Potential VOs"] as TabType[]).map(tab => {
              const grouped = getGroupedItemsForTab(tab);
              if (Object.keys(grouped).length === 0) return null;
              return (
                <section key={tab}>
                  <div className="mb-4 border-b border-[var(--border)] pb-2">
                    <h3 className="text-lg font-light text-[var(--text-primary)]">{tab}</h3>
                  </div>
                  {renderCleanGroupedItems(grouped)}
                </section>
              );
            })}
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-[var(--border)] overflow-x-auto no-scrollbar print:hidden">
              {(["Submitted Proposals", "Proposals to be Submitted", "Potential VOs"] as TabType[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-6 py-3 text-sm font-medium transition-all duration-300 relative hover:bg-[var(--bg-tertiary)] whitespace-nowrap",
                    activeTab === tab ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {tab}
                  {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--text-primary)]" />}
                </button>
              ))}
            </div>

            {/* List Content */}
            <div className="print:hidden">
              {renderGroupedItems(groupedItems)}
            </div>
            
            {/* Print Content (All Tabs) */}
            <div className="hidden print:block space-y-12">
              {(["Submitted Proposals", "Proposals to be Submitted", "Potential VOs"] as TabType[]).map(tab => {
                const grouped = getGroupedItemsForTab(tab);
                if (Object.keys(grouped).length === 0) return null;
                return (
                  <section key={tab}>
                    <div className="mb-4 border-b border-[var(--border)] pb-2">
                      <h3 className="text-lg font-light text-[var(--text-primary)]">{tab}</h3>
                    </div>
                    {renderCleanGroupedItems(grouped)}
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Achievement Date Modal */}
      {achievingItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-light text-[var(--text-primary)] mb-4">
              Mark as {achievingItem.status}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Please confirm the date this was {achievingItem.status.toLowerCase()}. This will determine the quarter it is allocated to.
            </p>
            
            <div className="mb-6">
              <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Date</label>
              <input 
                type="date"
                value={achievementDate}
                onChange={(e) => setAchievementDate(e.target.value)}
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
              />
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setAchievingItem(null)}
                className="flex-1 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--text-primary)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                Cancel
              </button>
              <button 
                onClick={handleStatusUpdate}
                className="flex-1 py-2 text-sm font-bold uppercase tracking-wider bg-emerald-500 text-white hover:bg-emerald-600 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-light text-[var(--text-primary)]">{editingId ? "Edit Entry" : "Add New Entry"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-transform duration-300 hover:rotate-90">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Type</label>
                  <select 
                    value={newItem.type}
                    onChange={(e) => setNewItem({...newItem, type: e.target.value as "RFP" | "VO"})}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                  >
                    <option value="RFP">RFP</option>
                    <option value="VO">VO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Sector</label>
                  <select 
                    value={newItem.sector}
                    onChange={(e) => setNewItem({...newItem, sector: e.target.value as Sector})}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                  >
                    {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">RFP No. (e.g. P12345)</label>
                <input 
                  type="text"
                  value={newItem.rfpNumber || ""}
                  onChange={(e) => setNewItem({...newItem, rfpNumber: e.target.value})}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                  placeholder="P12345"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Project Name</label>
                <input 
                  type="text"
                  value={newItem.name || ""}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                  placeholder="e.g. City Center Mall"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Client (Optional)</label>
                <input 
                  type="text"
                  value={newItem.client || ""}
                  onChange={(e) => setNewItem({...newItem, client: e.target.value})}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                  placeholder="e.g. Emaar"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Region (Optional)</label>
                <input 
                  type="text"
                  value={newItem.region || ""}
                  onChange={(e) => setNewItem({...newItem, region: e.target.value})}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                  placeholder="e.g. Middle East, Europe, North America"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Submission Date</label>
                  <input 
                    type="date"
                    value={newItem.submissionDate || ""}
                    onChange={(e) => setNewItem({...newItem, submissionDate: e.target.value})}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Win Probability</label>
                  <select 
                    value={newItem.probability || ""}
                    onChange={(e) => setNewItem({...newItem, probability: e.target.value as "High" | "Medium" | "Low"})}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                  >
                    <option value="">Select...</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              {newItem.type === "RFP" ? (
                <>
                  <div>
                    <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-2">Disciplines</label>
                    <div className="flex flex-wrap gap-2">
                      {DISCIPLINES.map((d) => (
                        <button
                          key={d}
                          onClick={() => toggleDiscipline(d)}
                          className={cn(
                            "px-3 py-1.5 text-xs border transition-colors flex items-center gap-2",
                            newItem.disciplines?.includes(d)
                              ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]"
                              : "bg-transparent text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--text-primary)]"
                          )}
                        >
                          {newItem.disciplines?.includes(d) && <Check size={12} />}
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {newItem.disciplines?.includes("Architecture") && (
                    <div>
                      <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Architecture Budget ({currency})</label>
                      <input 
                        type="number"
                        value={newItem.values?.architecture || ""}
                        onChange={(e) => updateValue("architecture", Number(e.target.value))}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                        placeholder="0.00"
                      />
                    </div>
                  )}

                  {newItem.disciplines?.includes("Interior") && (
                    <div>
                      <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Interior Budget ({currency})</label>
                      <input 
                        type="number"
                        value={newItem.values?.interior || ""}
                        onChange={(e) => updateValue("interior", Number(e.target.value))}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                        placeholder="0.00"
                      />
                    </div>
                  )}

                  {newItem.disciplines?.includes("Construction Supervision") && (
                    <div>
                      <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Supervision Budget ({currency})</label>
                      <input 
                        type="number"
                        value={newItem.values?.cs || ""}
                        onChange={(e) => updateValue("cs", Number(e.target.value))}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">VO Value ({currency})</label>
                  <input 
                    type="number"
                    value={newItem.values?.vo || ""}
                    onChange={(e) => updateValue("vo", Number(e.target.value))}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                    placeholder="0.00"
                  />
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={handleSaveItem}
                  className="flex-1 bg-[var(--text-primary)] text-[var(--bg-primary)] py-2 text-sm font-bold uppercase tracking-wider hover:bg-[var(--text-secondary)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md"
                >
                  {editingId ? "Save Changes" : "Add Entry"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </ReportLayout>
  );
}
