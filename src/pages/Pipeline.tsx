import React, { useState, useMemo, useEffect } from "react";
import { Plus, Briefcase, DollarSign, PieChart, Layers, Check, X, Edit2, Trash2 } from "lucide-react";
import { cn } from "../lib/utils";
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useSearch } from "../context/SearchContext";
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

export function Pipeline({ isReportView = false }: { isReportView?: boolean }) {
  const { searchQuery } = useSearch();
  const [items, setItems] = useState<PipelineItem[]>([]);
  const [sectors, setSectors] = useState<MarketSector[]>([]);
  const [activeTab, setActiveTab] = useState<"RFP" | "VO">("RFP");
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

  // Calculations
  const metrics = useMemo(() => {
    // Filter out Achieved and Approved items from calculations
    const activeItems = items.filter(i => i.status !== "Achieved" && i.status !== "Approved");

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

  // Filter out Achieved/Approved items from the main pipeline view
  const rfpItems = useMemo(() => items.filter(i => 
    i.type === "RFP" &&
    i.status !== "Achieved" && 
    i.status !== "Approved" &&
    ((i.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
     (i.client && i.client.toLowerCase().includes(searchQuery.toLowerCase()))) &&
    (viewFilter === "All" || (Array.isArray(i.disciplines) && i.disciplines.some(d => {
      if (viewFilter === "Architecture") return d === "Architecture";
      if (viewFilter === "Interior") return d === "Interior";
      if (viewFilter === "CS") return d === "Construction Supervision";
      return false;
    }))) &&
    (selectedRegions.length === 0 || (i.region && selectedRegions.includes(i.region)))
  ), [items, searchQuery, viewFilter, selectedRegions]);

  const voItems = useMemo(() => items.filter(i => 
    i.type === "VO" &&
    i.status !== "Achieved" && 
    i.status !== "Approved" &&
    ((i.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
     (i.client && i.client.toLowerCase().includes(searchQuery.toLowerCase()))) &&
    (viewFilter === "All") &&
    (selectedRegions.length === 0 || (i.region && selectedRegions.includes(i.region)))
  ), [items, searchQuery, viewFilter, selectedRegions]);

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

  const rfpGrouped = useMemo(() => groupItems(rfpItems), [rfpItems, sortBy]);
  const voGrouped = useMemo(() => groupItems(voItems), [voItems, sortBy]);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    
    const { source, destination } = result;
    
    // Only allow reordering within the same sector (droppableId = sector name)
    if (source.droppableId !== destination.droppableId) return;
    if (source.index === destination.index) return;

    const sectorName = source.droppableId;
    const sectorItems: PipelineItem[] = (activeTab === "RFP" ? rfpGrouped : voGrouped)[sectorName] || [];
    
    const newSectorItems = [...sectorItems];
    const [removed] = newSectorItems.splice(source.index, 1);
    newSectorItems.splice(destination.index, 0, removed);

    // Update sortOrder for these items
    const updatedItems: PipelineItem[] = newSectorItems.map((item, index) => ({
      ...item,
      sortOrder: index
    }));

    // Update local state immediately
    setItems(prevItems => {
      const otherItems = prevItems.filter(i => i.sector !== sectorName || i.type !== activeTab || i.status === "Achieved" || i.status === "Approved");
      return [...otherItems, ...updatedItems];
    });

    // If not in manual sort mode, switch to manual
    if (sortBy !== "manual") {
      setSortBy("manual");
    }

    // Update backend
    try {
      await Promise.all(updatedItems.map(item => 
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

  const renderGroupedItems = (grouped: Record<string, PipelineItem[]>) => (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="space-y-8">
        {(Object.entries(grouped) as [string, PipelineItem[]][]).map(([sector, sectorItems]) => {
          const sectorColor = sectors.find(s => s.name === sector)?.color || 'var(--text-secondary)';
          return (
            <Droppable droppableId={sector} key={sector} isDropDisabled={sortBy !== "manual" && sortBy !== undefined}>
              {(provided) => (
                <div 
                  className="space-y-3"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  <h4 
                    className="text-xs font-mono uppercase tracking-wider flex items-center gap-2"
                    style={{ color: sectorColor }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sectorColor }} />
                    {sector}
                  </h4>
                  <div className="grid gap-2">
                    {sectorItems.map((item, index) => (
                      // @ts-ignore
                      <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={sortBy !== "manual"}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              "bg-[var(--card-bg-inner)] border border-[var(--border)] p-3 hover:border-[var(--border-hover)] transition-colors group relative pl-4 overflow-hidden",
                              snapshot.isDragging && "shadow-lg border-[var(--text-primary)] z-50"
                            )}
                          >
                            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: sectorColor }} />
                            {!isReportView && (
                              <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handleEdit(item)}
                                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  onClick={() => handleDelete(item.id)}
                                  className="text-[var(--text-secondary)] hover:text-red-400 p-1"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}

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
                                   {item.submissionDate && <span>Submitted: {item.submissionDate}</span>}
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
                                </div>
                              </div>
                              <div className="text-right flex flex-col items-end gap-1.5">
                                <div>
                                  <span className="text-sm font-mono text-[var(--text-primary)] block">{getFilteredValue(item).toLocaleString()} SAR</span>
                                  {viewFilter !== "All" && (
                                    <span className="text-[10px] text-[var(--text-secondary)]">of {getTotalValue(item).toLocaleString()} Total</span>
                                  )}
                                </div>
                                {!isReportView && (
                                  <button 
                                    onClick={() => {
                                      setAchievingItem({ item, status: item.type === "RFP" ? "Achieved" : "Approved" });
                                      setAchievementDate(new Date().toISOString().split('T')[0]);
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded text-[10px] font-bold uppercase tracking-wider transition-colors"
                                    title={item.type === "RFP" ? "Mark as Achieved" : "Mark as Approved"}
                                  >
                                    <Check size={12} />
                                    {item.type === "RFP" ? "Achieved" : "Approved"}
                                  </button>
                                )}
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
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          );
        })}
        
        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-12 text-[var(--text-secondary)]">
            No items found for this category.
          </div>
        )}
      </div>
    </DragDropContext>
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-light tracking-tight text-[var(--text-primary)] mb-2">PIPELINE</h1>
          <p className="text-[var(--text-secondary)] font-mono text-sm uppercase tracking-wider">Project Opportunities & Variations</p>
        </div>
        <div className="flex items-center gap-4">
          {!isReportView && (
            <div className="flex items-center gap-3">
              {availableRegions.length > 0 && (
                <div className="flex items-center gap-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 relative group">
                  <span className="text-xs font-mono uppercase text-[var(--text-secondary)]">Region:</span>
                  <div className="text-xs font-medium text-[var(--text-primary)] cursor-pointer flex items-center gap-1">
                    {selectedRegions.length === 0 ? "All" : `${selectedRegions.length} Selected`}
                  </div>
                  <div className="absolute top-full right-0 mt-2 w-48 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-2">
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      <label className="flex items-center gap-2 p-1.5 hover:bg-[var(--bg-tertiary)] rounded cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={selectedRegions.length === 0}
                          onChange={() => setSelectedRegions([])}
                          className="rounded border-[var(--border)] text-[var(--text-primary)] focus:ring-0"
                        />
                        <span className="text-xs text-[var(--text-primary)]">All Regions</span>
                      </label>
                      <div className="h-px bg-[var(--border)] my-1" />
                      {availableRegions.map(region => (
                        <label key={region} className="flex items-center gap-2 p-1.5 hover:bg-[var(--bg-tertiary)] rounded cursor-pointer">
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
                            className="rounded border-[var(--border)] text-[var(--text-primary)] focus:ring-0"
                          />
                          <span className="text-xs text-[var(--text-primary)]">{region}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-1.5">
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
                      "px-3 py-1.5 text-xs font-medium rounded transition-colors",
                      viewFilter === filter 
                        ? "bg-[var(--text-primary)] text-[var(--bg-primary)]" 
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    {filter === "CS" ? "Supervision" : filter}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!isReportView && (
            <button 
              onClick={() => {
                setEditingId(null);
                setNewItem({ type: "RFP", sector: sectors[0]?.name || "", disciplines: [], values: {}, status: "Pending" });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-bold uppercase tracking-wider hover:bg-[var(--text-secondary)] transition-colors"
            >
              <Plus size={16} />
              Add Entry
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-mono uppercase text-[var(--text-secondary)]">Total Pipeline Value ({viewFilter})</h3>
            <DollarSign size={20} className="text-emerald-400" />
          </div>
          <p className="text-3xl font-medium text-[var(--text-primary)]">
            {metrics.totalPipeline.toLocaleString()} <span className="text-sm text-[var(--text-secondary)]">SAR</span>
          </p>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-mono uppercase text-[var(--text-secondary)]">RFP Value ({viewFilter})</h3>
            <Briefcase size={20} className="text-blue-400" />
          </div>
          <p className="text-3xl font-medium text-[var(--text-primary)]">
            {metrics.totalRFP.toLocaleString()} <span className="text-sm text-[var(--text-secondary)]">SAR</span>
          </p>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-mono uppercase text-[var(--text-secondary)]">VO Value</h3>
            <Layers size={20} className="text-amber-400" />
          </div>
          <p className="text-3xl font-medium text-[var(--text-primary)]">
            {metrics.totalVO.toLocaleString()} <span className="text-sm text-[var(--text-secondary)]">SAR</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sector Breakdown Chart */}
        <div className="lg:col-span-1 bg-[var(--card-bg)] border border-[var(--border)] p-6">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <PieChart size={16} />
            Sector Distribution ({viewFilter})
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={metrics.sectorData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {metrics.sectorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number) => `${value.toLocaleString()} SAR`}
                />
                <Legend />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 space-y-3">
            {metrics.sectorData.map((sector, index) => (
              <div key={sector.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sector.color }} />
                  <span className="text-[var(--text-secondary)]">{sector.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[var(--text-primary)] font-mono">{sector.value.toLocaleString()} SAR</span>
                  <span className="text-[var(--text-tertiary)] w-8 text-right">
                    {((sector.value / metrics.totalPipeline) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Discipline Breakdown Chart */}
        <div className="lg:col-span-1 bg-[var(--card-bg)] border border-[var(--border)] p-6">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <PieChart size={16} />
            Revenue by Discipline
          </h3>
          <div className="space-y-6">
            {metrics.disciplineData.map((d) => {
              const percentage = metrics.absoluteTotalPipeline > 0 
                ? (d.value / metrics.absoluteTotalPipeline) * 100 
                : 0;
              
              return (
                <div key={d.name}>
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
                    {d.value.toLocaleString()} SAR
                  </div>
                </div>
              );
            })}
            
            <div className="pt-4 border-t border-[var(--border)] flex justify-between items-center">
              <span className="text-xs text-[var(--text-secondary)]">Total Revenue</span>
              <span className="text-xs font-mono text-[var(--text-primary)]">{metrics.absoluteTotalPipeline.toLocaleString()} SAR</span>
            </div>
          </div>
        </div>

        {/* Main List */}
        <div className="lg:col-span-2 space-y-6">
          {isReportView ? (
            <div className="space-y-12">
              <section>
                <div className="mb-4 border-b border-[var(--border)] pb-2">
                  <h3 className="text-lg font-light text-[var(--text-primary)]">Current RFPs</h3>
                </div>
                {renderGroupedItems(rfpGrouped)}
              </section>
              <section>
                <div className="mb-4 border-b border-[var(--border)] pb-2">
                  <h3 className="text-lg font-light text-[var(--text-primary)]">Potential VOs</h3>
                </div>
                {renderGroupedItems(voGrouped)}
              </section>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex border-b border-[var(--border)]">
                <button
                  onClick={() => setActiveTab("RFP")}
                  className={cn(
                    "px-6 py-3 text-sm font-medium transition-colors relative",
                    activeTab === "RFP" ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  Current RFPs
                  {activeTab === "RFP" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--text-primary)]" />}
                </button>
                <button
                  onClick={() => setActiveTab("VO")}
                  className={cn(
                    "px-6 py-3 text-sm font-medium transition-colors relative",
                    activeTab === "VO" ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  Potential VOs
                  {activeTab === "VO" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--text-primary)]" />}
                </button>
              </div>

              {/* List Content */}
              {renderGroupedItems(activeTab === "RFP" ? rfpGrouped : voGrouped)}
            </>
          )}
        </div>
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
                className="flex-1 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleStatusUpdate}
                className="flex-1 py-2 text-sm font-bold uppercase tracking-wider bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
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
              <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
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
                      <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Architecture Budget (SAR)</label>
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
                      <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Interior Budget (SAR)</label>
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
                      <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Supervision Budget (SAR)</label>
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
                  <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">VO Value (SAR)</label>
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
                  className="flex-1 bg-[var(--text-primary)] text-[var(--bg-primary)] py-2 text-sm font-bold uppercase tracking-wider hover:bg-[var(--text-secondary)] transition-colors"
                >
                  {editingId ? "Save Changes" : "Add Entry"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
