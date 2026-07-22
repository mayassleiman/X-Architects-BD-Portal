import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  Archive, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Edit2, 
  Trash2, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  BarChart2, 
  TrendingUp, 
  PieChart, 
  MapPin, 
  Building2, 
  HelpCircle,
  Home,
  Hotel,
  HeartPulse,
  Milestone,
  Factory,
  GraduationCap,
  Library,
  Trophy,
  Building,
  LayoutGrid,
  X,
  Check,
  Calendar,
  Layers,
  AlertTriangle,
  DollarSign
} from "lucide-react";
import { cn } from "../lib/utils";
import { useSearch } from "../context/SearchContext";
import { useCurrency } from "../context/CurrencyContext";
import * as XLSX from "xlsx";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

interface PipelineItem {
  id: string;
  name: string;
  client?: string;
  sector: string;
  type: "RFP" | "VO";
  disciplines?: string[];
  values: {
    architecture?: number;
    interior?: number;
    cs?: number;
    vo?: number;
  };
  status: string;
  submissionDate?: string;
  probability?: "High" | "Medium" | "Low";
  rfpNumber?: string;
  achievedDate?: string;
  sortOrder?: number;
  region?: string;
  isArchived?: number;
  archiveReason?: string;
  archivedAt?: string;
  archiveYear?: number;
}

interface MarketSector {
  id: number;
  name: string;
  color: string;
}

const MosqueIcon = ({ size = 24, className, style, ...props }: any) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.75" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    style={style}
    {...props}
  >
    <path d="M2 21h20" />
    <path d="M4 21V10l1.5-2.5L7 10v11" />
    <path d="M17 21V10l1.5-2.5L20 10v11" />
    <path d="M7 21v-6a5 5 0 0 1 10 0v6" />
    <path d="M12 10V6" />
    <path d="M12 4a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4z" />
    <path d="M10 21v-3a2 2 0 0 1 4 0v3" />
  </svg>
);

const FerrisWheelIcon = ({ size = 24, className, style, ...props }: any) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.75" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    style={style}
    {...props}
  >
    <circle cx="12" cy="10" r="7.5" />
    <circle cx="12" cy="10" r="1.5" />
    <path d="M12 2.5v15" />
    <path d="M4.5 10h15" />
    <path d="M6.7 4.7l10.6 10.6" />
    <path d="M6.7 15.3l10.6-10.6" />
    <circle cx="12" cy="2.5" r="1" fill="currentColor" />
    <circle cx="19.5" cy="10" r="1" fill="currentColor" />
    <circle cx="12" cy="17.5" r="1" fill="currentColor" />
    <circle cx="4.5" cy="10" r="1" fill="currentColor" />
    <path d="M8 21.5l4-11.5 4 11.5" />
    <path d="M6 21.5h12" />
  </svg>
);

const getSectorIcon = (sectorName: string) => {
  const name = (sectorName || "").toLowerCase();
  if (name.includes("religious") || name.includes("mosque") || name.includes("worship") || name.includes("islamic")) return MosqueIcon;
  if (name.includes("master") || name.includes("plan") || name.includes("grid") || name.includes("urban")) return LayoutGrid;
  if (name.includes("entertainment") || name.includes("wheel") || name.includes("fun") || name.includes("amusement") || name.includes("leisure") || name.includes("park")) return FerrisWheelIcon;
  
  if (name.includes("residential") || name.includes("housing") || name.includes("villa") || name.includes("home")) return Home;
  if (name.includes("commercial") || name.includes("office") || name.includes("retail") || name.includes("corporate")) return Building2;
  if (name.includes("hospitality") || name.includes("hotel") || name.includes("resort") || name.includes("tourism")) return Hotel;
  if (name.includes("healthcare") || name.includes("hospital") || name.includes("medical") || name.includes("clinic")) return HeartPulse;
  if (name.includes("infrastructure") || name.includes("road") || name.includes("bridge") || name.includes("utilities") || name.includes("public realm")) return Milestone;
  if (name.includes("industrial") || name.includes("factory") || name.includes("warehouse")) return Factory;
  if (name.includes("educational") || name.includes("school") || name.includes("university") || name.includes("education")) return GraduationCap;
  if (name.includes("cultural") || name.includes("museum") || name.includes("art") || name.includes("library")) return Library;
  if (name.includes("sports") || name.includes("stadium") || name.includes("gym")) return Trophy;
  if (name.includes("mixed") || name.includes("complex")) return Building;
  return HelpCircle;
};

const COMMON_REASONS = [
  "Price too High / Commercial Uncompetitive",
  "Technical Score / Scope Mismatch",
  "Lost to Competitor",
  "Client Cancelled / On Hold",
  "No Response / RFP Expired",
  "Terms & Conditions / Contractual Issue",
  "Other"
];

export function Archived() {
  const { searchQuery } = useSearch();
  const { currency } = useCurrency();

  const [allItems, setAllItems] = useState<PipelineItem[]>([]);
  const [sectors, setSectors] = useState<MarketSector[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string[]>([]);
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string[]>([]);
  const [selectedReasonFilter, setSelectedReasonFilter] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<"date" | "value" | "name" | "reason">("date");

  // Swipe gesture state
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const [isSwipingActive, setIsSwipingActive] = useState(false);

  // Edit / Archive Modal state
  const [editingItem, setEditingItem] = useState<PipelineItem | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editClient, setEditClient] = useState<string>("");
  const [editSector, setEditSector] = useState<string>("");
  const [editRegion, setEditRegion] = useState<string>("");
  const [editValArch, setEditValArch] = useState<string>("");
  const [editValInt, setEditValInt] = useState<string>("");
  const [editValCs, setEditValCs] = useState<string>("");
  const [editValVo, setEditValVo] = useState<string>("");
  const [editReason, setEditReason] = useState<string>("");
  const [editCustomReason, setEditCustomReason] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [pipeRes, sectRes] = await Promise.all([
        fetch(`/api/pipeline?_t=${Date.now()}`),
        fetch(`/api/market-sectors?_t=${Date.now()}`)
      ]);
      const pipeData = await pipeRes.json();
      const sectData = await sectRes.json();
      setAllItems(pipeData);
      setSectors(sectData);
    } catch (err) {
      console.error("Failed to load archive data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper for item total value
  const getItemValue = (item: PipelineItem) => {
    if (item.type === "VO") return item.values.vo || 0;
    return (item.values.architecture || 0) + (item.values.interior || 0) + (item.values.cs || 0);
  };

  // Helper for item year
  const getItemYear = (item: PipelineItem): number => {
    if (item.archiveYear) return Number(item.archiveYear);
    if (item.archivedAt) {
      const d = new Date(item.archivedAt);
      if (!isNaN(d.getFullYear())) return d.getFullYear();
    }
    if (item.submissionDate) {
      const d = new Date(item.submissionDate);
      if (!isNaN(d.getFullYear())) return d.getFullYear();
    }
    return new Date().getFullYear();
  };

  // Available Years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(new Date().getFullYear());
    allItems.forEach(i => {
      yearsSet.add(getItemYear(i));
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [allItems]);

  // Filtered items based on year
  const itemsForYear = useMemo(() => {
    if (selectedYear === "ALL") return allItems;
    const yr = Number(selectedYear);
    return allItems.filter(i => getItemYear(i) === yr);
  }, [allItems, selectedYear]);

  // Active RFPs vs Achieved RFPs vs Archived RFPs for selected year
  const yearStats = useMemo(() => {
    const archived = itemsForYear.filter(i => i.isArchived === 1 || i.status === "Archived" || i.status === "Lost");
    const achieved = itemsForYear.filter(i => i.isArchived !== 1 && (i.status === "Achieved" || i.status === "Won"));
    const active = itemsForYear.filter(i => i.isArchived !== 1 && i.status !== "Achieved" && i.status !== "Won" && i.status !== "Archived" && i.status !== "Lost");

    // Total RFPs received in this period (active + achieved + archived)
    const totalReceivedCount = itemsForYear.length;
    const totalReceivedValue = itemsForYear.reduce((sum, i) => sum + getItemValue(i), 0);

    const archivedCount = archived.length;
    const archivedValue = archived.reduce((sum, i) => sum + getItemValue(i), 0);

    const achievedCount = achieved.length;
    const achievedValue = achieved.reduce((sum, i) => sum + getItemValue(i), 0);

    const activeCount = active.length;
    const activeValue = active.reduce((sum, i) => sum + getItemValue(i), 0);

    // Win Rate = Achieved / (Achieved + Archived)
    const decidedCount = achievedCount + archivedCount;
    const winRate = decidedCount > 0 ? (achievedCount / decidedCount) * 100 : 0;
    const winRateByValue = (achievedValue + archivedValue) > 0 ? (achievedValue / (achievedValue + archivedValue)) * 100 : 0;

    return {
      totalReceivedCount,
      totalReceivedValue,
      archivedCount,
      archivedValue,
      achievedCount,
      achievedValue,
      activeCount,
      activeValue,
      winRate,
      winRateByValue,
      archivedList: archived
    };
  }, [itemsForYear]);

  // Available Sector & Region & Reason Filter Options for the archived list
  const availableRegions = useMemo(() => {
    const setR = new Set<string>();
    yearStats.archivedList.forEach(i => {
      if (i.region) setR.add(i.region);
    });
    return Array.from(setR).sort();
  }, [yearStats.archivedList]);

  const availableReasons = useMemo(() => {
    const setRes = new Set<string>();
    yearStats.archivedList.forEach(i => {
      if (i.archiveReason) setRes.add(i.archiveReason);
      else setRes.add("Not Specified");
    });
    return Array.from(setRes).sort();
  }, [yearStats.archivedList]);

  // Final Filtered & Sorted Archived List
  const filteredArchivedList = useMemo(() => {
    return yearStats.archivedList.filter(i => {
      const q = (searchFilter || searchQuery).toLowerCase();
      const matchesSearch = !q || 
        i.name.toLowerCase().includes(q) ||
        (i.rfpNumber && i.rfpNumber.toLowerCase().includes(q)) ||
        (i.client && i.client.toLowerCase().includes(q)) ||
        (i.archiveReason && i.archiveReason.toLowerCase().includes(q));

      const matchesSector = selectedSectorFilter.length === 0 || selectedSectorFilter.includes(i.sector);
      const matchesRegion = selectedRegionFilter.length === 0 || (i.region && selectedRegionFilter.includes(i.region));
      const reasonVal = i.archiveReason || "Not Specified";
      const matchesReason = selectedReasonFilter.length === 0 || selectedReasonFilter.includes(reasonVal);

      return matchesSearch && matchesSector && matchesRegion && matchesReason;
    }).sort((a, b) => {
      if (sortBy === "value") return getItemValue(b) - getItemValue(a);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "reason") return (a.archiveReason || "").localeCompare(b.archiveReason || "");
      // Date
      const dateA = a.archivedAt || a.submissionDate || "1970-01-01";
      const dateB = b.archivedAt || b.submissionDate || "1970-01-01";
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [yearStats.archivedList, searchFilter, searchQuery, selectedSectorFilter, selectedRegionFilter, selectedReasonFilter, sortBy]);

  // Analytics Breakdowns
  const sectorBreakdown = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    yearStats.archivedList.forEach(i => {
      const sec = i.sector || "Other";
      if (!map[sec]) map[sec] = { count: 0, value: 0 };
      map[sec].count += 1;
      map[sec].value += getItemValue(i);
    });

    const totalVal = yearStats.archivedValue || 1;
    return Object.entries(map).map(([name, data]) => {
      const secObj = sectors.find(s => s.name === name);
      return {
        name,
        count: data.count,
        value: data.value,
        color: secObj ? secObj.color : "#94a3b8",
        percentage: (data.value / totalVal) * 100
      };
    }).sort((a, b) => b.value - a.value);
  }, [yearStats, sectors]);

  const reasonBreakdown = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    yearStats.archivedList.forEach(i => {
      const r = i.archiveReason || "Not Specified";
      if (!map[r]) map[r] = { count: 0, value: 0 };
      map[r].count += 1;
      map[r].value += getItemValue(i);
    });

    const totalVal = yearStats.archivedValue || 1;
    return Object.entries(map).map(([reason, data]) => ({
      reason,
      count: data.count,
      value: data.value,
      percentage: (data.value / totalVal) * 100
    })).sort((a, b) => b.count - a.count);
  }, [yearStats]);

  const regionBreakdown = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    yearStats.archivedList.forEach(i => {
      const reg = i.region || "Unspecified Region";
      if (!map[reg]) map[reg] = { count: 0, value: 0 };
      map[reg].count += 1;
      map[reg].value += getItemValue(i);
    });

    return Object.entries(map).map(([region, data]) => ({
      region,
      count: data.count,
      value: data.value
    })).sort((a, b) => b.value - a.value);
  }, [yearStats]);

  // Swipe Action Handler (iPhone Style)
  const buttonsWidth = 225; // 3 buttons x 75px

  const handleSwipeStart = (e: React.MouseEvent | React.TouchEvent, itemId: string) => {
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    swipeStart.current = { x: clientX, y: clientY };
    setIsSwipingActive(true);
  };

  const handleSwipeMove = (e: React.MouseEvent | React.TouchEvent, itemId: string) => {
    if (!swipeStart.current || !isSwipingActive) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    
    const dx = clientX - swipeStart.current.x;
    const dy = clientY - swipeStart.current.y;

    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      swipeStart.current = null;
      setIsSwipingActive(false);
      return;
    }

    if (Math.abs(dx) > 10) {
      if (e.cancelable) e.preventDefault();
      const isCurrentlyOpen = swipedItemId === itemId;
      const baseOffset = isCurrentlyOpen ? -buttonsWidth : 0;
      let newOffset = baseOffset + dx;
      newOffset = Math.max(-buttonsWidth - 20, Math.min(10, newOffset));

      const el = document.getElementById(`archive-card-${itemId}`);
      if (el) {
        el.style.transform = `translateX(${newOffset}px)`;
        el.style.transition = "none";
      }
    }
  };

  const handleSwipeEnd = (itemId: string) => {
    if (!swipeStart.current) return;
    setIsSwipingActive(false);
    swipeStart.current = null;

    const el = document.getElementById(`archive-card-${itemId}`);
    if (el) {
      el.style.transition = "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
      const style = window.getComputedStyle(el);
      let currentTranslateX = 0;
      if (style.transform && style.transform !== "none") {
        const parts = style.transform.split(/[()]/)[1]?.split(",");
        if (parts) currentTranslateX = parseFloat(parts[4] || parts[12] || "0");
      }

      if (currentTranslateX < -40) {
        el.style.transform = `translateX(-${buttonsWidth}px)`;
        setSwipedItemId(itemId);
      } else {
        el.style.transform = "translateX(0px)";
        if (swipedItemId === itemId) setSwipedItemId(null);
      }
    }
  };

  // Restore RFP back to Active Submitted Proposals
  const handleRestoreItem = async (item: PipelineItem) => {
    if (confirm(`Restore "${item.name}" back to Active Submitted Proposals?`)) {
      try {
        const updated = {
          ...item,
          isArchived: 0,
          status: "Submitted"
        };
        await fetch(`/api/pipeline/${item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated)
        });
        setAllItems(allItems.map(i => i.id === item.id ? updated : i));
        setSwipedItemId(null);
      } catch (err) {
        alert("Failed to restore item.");
      }
    }
  };

  // Delete RFP completely
  const handleDeleteItem = async (id: string) => {
    if (confirm("Are you sure you want to PERMANENTLY delete this archived proposal? This action cannot be undone.")) {
      try {
        await fetch(`/api/pipeline/${id}`, { method: "DELETE" });
        setAllItems(allItems.filter(i => i.id !== id));
        setSwipedItemId(null);
      } catch (err) {
        alert("Failed to delete item.");
      }
    }
  };

  // Open edit modal for archive item details & reason
  const handleOpenEditModal = (item: PipelineItem) => {
    setEditingItem(item);
    setEditName(item.name || "");
    setEditClient(item.client || "");
    setEditSector(item.sector || "");
    setEditRegion(item.region || "");
    setEditValArch(item.values?.architecture !== undefined ? item.values.architecture.toString() : "");
    setEditValInt(item.values?.interior !== undefined ? item.values.interior.toString() : "");
    setEditValCs(item.values?.cs !== undefined ? item.values.cs.toString() : "");
    setEditValVo(item.values?.vo !== undefined ? item.values.vo.toString() : "");

    const existingReason = item.archiveReason || "";
    if (COMMON_REASONS.includes(existingReason)) {
      setEditReason(existingReason);
      setEditCustomReason("");
    } else if (existingReason) {
      setEditReason("Other");
      setEditCustomReason(existingReason);
    } else {
      setEditReason(COMMON_REASONS[0]);
      setEditCustomReason("");
    }
    setSwipedItemId(null);
  };

  // Save edit modal
  const handleSaveEditReason = async () => {
    if (!editingItem) return;
    const finalReason = editReason === "Other" ? (editCustomReason || "Other") : editReason;

    try {
      const updatedItem: PipelineItem = {
        ...editingItem,
        name: editName,
        client: editClient,
        sector: editSector,
        region: editRegion,
        values: {
          ...editingItem.values,
          architecture: editValArch !== "" ? Number(editValArch) : undefined,
          interior: editValInt !== "" ? Number(editValInt) : undefined,
          cs: editValCs !== "" ? Number(editValCs) : undefined,
          vo: editValVo !== "" ? Number(editValVo) : undefined,
        },
        archiveReason: finalReason
      };

      await fetch(`/api/pipeline/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedItem)
      });
      setAllItems(allItems.map(i => i.id === editingItem.id ? updatedItem : i));
      setEditingItem(null);
    } catch (err) {
      alert("Failed to update proposal details.");
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const dataToExport = filteredArchivedList.map(item => ({
      "RFP Number": item.rfpNumber || "-",
      "Proposal Name": item.name,
      "Client": item.client || "-",
      "Sector": item.sector,
      "Region": item.region || "-",
      "Type": item.type,
      "Total Value": getItemValue(item),
      "Currency": currency,
      "Submission Date": item.submissionDate || "-",
      "Archived Date": item.archivedAt || "-",
      "Year": getItemYear(item),
      "Reason for Loss / Archive": item.archiveReason || "Not Specified"
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Archived_RFPs_${selectedYear}`);
    XLSX.writeFile(workbook, `Archived_RFPs_Report_${selectedYear}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Archive size={22} />
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Archived RFPs
          </h1>
        </div>

        {/* Year Filter Pill Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-[var(--bg-tertiary)] p-1 rounded-xl border-2 border-amber-500/40 shadow-sm">
            <span className="text-xs font-mono text-[var(--text-secondary)] px-2 flex items-center gap-1 font-semibold">
              <Calendar size={13} /> Year:
            </span>
            <button
              onClick={() => setSelectedYear("ALL")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-mono transition-all",
                selectedYear === "ALL" 
                  ? "bg-amber-500 text-black font-bold shadow-md" 
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              All
            </button>
            {availableYears.map(yr => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr.toString())}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-mono transition-all",
                  selectedYear === yr.toString()
                    ? "bg-amber-500 text-black font-bold shadow-md"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {yr}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border-2 border-emerald-500/40 rounded-xl text-xs font-mono font-bold tracking-wider transition-all shadow-sm"
          >
            <Download size={13} /> Export Excel
          </button>
          
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-tertiary)] hover:bg-[var(--border)] text-[var(--text-primary)] border-2 border-[var(--border)] rounded-xl text-xs font-mono font-bold tracking-wider transition-all"
          >
            <Printer size={13} /> Print
          </button>
        </div>
      </div>

      {/* Compressed KPI Dashboard Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total RFPs */}
        <div className="bg-[var(--card-bg-inner)] border border-blue-500/30 rounded-xl p-3 relative overflow-hidden">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400 font-bold">
              Total RFPs
            </span>
            <Layers size={15} className="text-blue-400" />
          </div>
          <div className="text-xl font-bold font-mono text-[var(--text-primary)]">
            {yearStats.totalReceivedCount} <span className="text-xs font-normal text-[var(--text-secondary)]">RFPs</span>
          </div>
          <div className="text-[11px] font-mono text-blue-400 font-semibold mt-0.5">
            {yearStats.totalReceivedValue.toLocaleString()} {currency}
          </div>
        </div>

        {/* Lost */}
        <div className="bg-[var(--card-bg-inner)] border border-amber-500/40 rounded-xl p-3 relative overflow-hidden">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold">
              Lost
            </span>
            <Archive size={15} className="text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {yearStats.archivedCount} <span className="text-xs font-normal text-amber-400/70">RFPs</span>
          </div>
          <div className="text-[11px] font-mono text-amber-300 font-semibold mt-0.5">
            {yearStats.archivedValue.toLocaleString()} {currency}
          </div>
        </div>

        {/* Win Rate */}
        <div className="bg-[var(--card-bg-inner)] border border-emerald-500/40 rounded-xl p-3 relative overflow-hidden">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
              Win Rate
            </span>
            <TrendingUp size={15} className="text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {yearStats.winRate.toFixed(1)}%
          </div>
          <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-1 mt-1 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full" 
              style={{ width: `${Math.min(100, yearStats.winRate)}%` }}
            />
          </div>
        </div>

        {/* Active */}
        <div className="bg-[var(--card-bg-inner)] border border-cyan-500/30 rounded-xl p-3 relative overflow-hidden">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
              Active
            </span>
            <BarChart2 size={15} className="text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-[var(--text-primary)]">
            {yearStats.activeCount} <span className="text-xs font-normal text-[var(--text-secondary)]">RFPs</span>
          </div>
          <div className="text-[11px] font-mono text-cyan-400 font-semibold mt-0.5">
            {yearStats.activeValue.toLocaleString()} {currency}
          </div>
        </div>
      </div>

      {/* Compressed Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sectors with Pie Chart */}
        <div className="bg-[var(--card-bg-inner)] border border-[var(--border)] rounded-xl p-3.5 flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border)] mb-2">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5 font-bold">
              <PieChart size={14} className="text-amber-400" /> Sectors
            </h3>
            <span className="text-[10px] font-mono text-[var(--text-secondary)]">
              {sectorBreakdown.length} Sectors
            </span>
          </div>

          {sectorBreakdown.length > 0 && (
            <div className="h-36 w-full mb-2">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={sectorBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={50}
                    innerRadius={22}
                    paddingAngle={3}
                  >
                    {sectorBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#171717" strokeWidth={1.5} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(val: any) => [`${Number(val).toLocaleString()} ${currency}`, 'Value']}
                    contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#262626', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
            {sectorBreakdown.length === 0 ? (
              <div className="text-center py-6 text-xs font-mono text-[var(--text-secondary)]">
                No sector data
              </div>
            ) : (
              sectorBreakdown.map(sec => {
                const IconComp = getSectorIcon(sec.name);
                return (
                  <div key={sec.name} className="space-y-0.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="flex items-center gap-1.5 font-medium truncate max-w-[170px]" style={{ color: sec.color }}>
                        <IconComp size={13} className="shrink-0" />
                        <span className="truncate">{sec.name} ({sec.count})</span>
                      </span>
                      <span className="font-mono text-[var(--text-primary)] font-bold">
                        {sec.value.toLocaleString()} {currency}
                      </span>
                    </div>
                    <div className="w-full bg-[var(--bg-tertiary)] h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.max(4, sec.percentage)}%`, backgroundColor: sec.color }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Reasons */}
        <div className="bg-[var(--card-bg-inner)] border border-[var(--border)] rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)] mb-2">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5 font-bold">
                <AlertTriangle size={14} className="text-rose-400" /> Reasons
              </h3>
              <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                {reasonBreakdown.length} Reasons
              </span>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {reasonBreakdown.length === 0 ? (
                <div className="text-center py-8 text-xs font-mono text-[var(--text-secondary)]">
                  No reasons recorded
                </div>
              ) : (
                reasonBreakdown.map(rb => (
                  <div key={rb.reason} className="p-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
                    <div className="flex justify-between items-center text-[11px] mb-0.5">
                      <span className="font-medium text-amber-300 truncate max-w-[180px]" title={rb.reason}>
                        {rb.reason}
                      </span>
                      <span className="font-mono font-bold text-[var(--text-primary)]">
                        {rb.count} RFP{rb.count > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono text-[var(--text-secondary)]">
                      <span>Value: {rb.value.toLocaleString()} {currency}</span>
                      <span>{rb.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Location Brkdwn */}
        <div className="bg-[var(--card-bg-inner)] border border-[var(--border)] rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)] mb-2">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5 font-bold">
                <MapPin size={14} className="text-cyan-400" /> Location Brkdwn
              </h3>
              <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                {regionBreakdown.length} Regions
              </span>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {regionBreakdown.length === 0 ? (
                <div className="text-center py-8 text-xs font-mono text-[var(--text-secondary)]">
                  No region data
                </div>
              ) : (
                regionBreakdown.map(reg => (
                  <div key={reg.region} className="flex justify-between items-center p-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MapPin size={12} className="text-cyan-400 shrink-0" />
                      <span className="text-[11px] font-medium text-[var(--text-primary)] truncate">{reg.region}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-mono font-bold text-[var(--text-primary)] block">
                        {reg.value.toLocaleString()} {currency}
                      </span>
                      <span className="text-[9px] font-mono text-[var(--text-secondary)]">
                        {reg.count} Proposal{reg.count > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Highlighted Filter Toolbar */}
      <div className="bg-[var(--card-bg-inner)] border-2 border-amber-500/30 rounded-2xl p-3.5 space-y-3 shadow-md">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" />
            <input 
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search RFP number, name, client, reason..."
              className="w-full bg-[var(--bg-tertiary)] border-2 border-amber-500/40 rounded-xl pl-9 pr-8 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-amber-400 font-mono transition-colors shadow-inner"
            />
            {searchFilter && (
              <button 
                onClick={() => setSearchFilter("")} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Highlighted Sort Selector */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
            <span className="text-xs font-mono text-[var(--text-secondary)] font-bold whitespace-nowrap">Sort By:</span>
            {[
              { id: "date", label: "Date" },
              { id: "value", label: "Value" },
              { id: "name", label: "Name" },
              { id: "reason", label: "Reason" }
            ].map(s => (
              <button
                key={s.id}
                onClick={() => setSortBy(s.id as any)}
                className={cn(
                  "px-3 py-1 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all border-2",
                  sortBy === s.id
                    ? "bg-amber-500 text-black border-amber-400 shadow-md"
                    : "bg-[var(--bg-tertiary)] text-[var(--text-primary)] border-[var(--border)] hover:border-amber-500/50"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Highlighted Sector & Region Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--border)]">
          <span className="text-xs font-mono text-amber-400 font-bold flex items-center gap-1">
            <Filter size={12} /> Filters:
          </span>

          {/* Sector Pill Toggles */}
          {sectors.map(sec => {
            const isSelected = selectedSectorFilter.includes(sec.name);
            return (
              <button
                key={sec.name}
                onClick={() => {
                  setSelectedSectorFilter(prev => 
                    prev.includes(sec.name) ? prev.filter(x => x !== sec.name) : [...prev, sec.name]
                  );
                }}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all border-2 flex items-center gap-1.5",
                  isSelected
                    ? "bg-neutral-900 font-bold shadow-md ring-1 ring-amber-500/50"
                    : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)]"
                )}
                style={{
                  borderColor: isSelected ? sec.color : undefined,
                  color: isSelected ? sec.color : undefined
                }}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sec.color }} />
                {sec.name}
              </button>
            );
          })}

          {/* Region Pill Toggles */}
          {availableRegions.map(reg => {
            const isSelected = selectedRegionFilter.includes(reg);
            return (
              <button
                key={reg}
                onClick={() => {
                  setSelectedRegionFilter(prev => 
                    prev.includes(reg) ? prev.filter(x => x !== reg) : [...prev, reg]
                  );
                }}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all border-2 flex items-center gap-1",
                  isSelected
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold shadow-md"
                    : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)]"
                )}
              >
                <MapPin size={10} />
                {reg}
              </button>
            );
          })}

          {(selectedSectorFilter.length > 0 || selectedRegionFilter.length > 0 || selectedReasonFilter.length > 0) && (
            <button
              onClick={() => {
                setSelectedSectorFilter([]);
                setSelectedRegionFilter([]);
                setSelectedReasonFilter([]);
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-rose-400 hover:bg-rose-500/10 font-bold transition-colors underline"
            >
              Clear All Filters
            </button>
          )}
        </div>
      </div>

      {/* Item List */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)] px-1">
          <span className="font-bold text-[var(--text-primary)]">Archived RFPs ({filteredArchivedList.length})</span>
        </div>

        {filteredArchivedList.length === 0 ? (
          <div className="text-center py-12 bg-[var(--card-bg-inner)] border border-[var(--border)] rounded-xl p-6 space-y-2">
            <Archive size={36} className="mx-auto text-amber-500/40" />
            <h4 className="text-sm font-medium text-[var(--text-primary)]">No Archived RFPs Found</h4>
            <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
              There are no archived proposals matching your filter selection for year {selectedYear}. Un-won RFPs moved from the Pipeline page will appear here.
            </p>
          </div>
        ) : (
          filteredArchivedList.map((item) => {
            const secObj = sectors.find(s => s.name === item.sector);
            const sectorColor = secObj ? secObj.color : "#94a3b8";
            const IconComp = getSectorIcon(item.sector);
            const totalVal = getItemValue(item);

            return (
              <div 
                key={item.id}
                className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-bg-inner)] transition-all shadow-sm group"
              >
                {/* Background Swipe Action Buttons (iPhone Slide Effect - Only Visible When Swiped) */}
                <div 
                  className={cn(
                    "absolute right-0 top-0 bottom-0 flex h-full z-0 overflow-hidden transition-opacity duration-150",
                    swipedItemId === item.id ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                  )}
                  style={{ width: `${buttonsWidth}px` }}
                >
                  {/* Restore Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRestoreItem(item);
                    }}
                    className="w-[75px] h-full bg-blue-600 hover:bg-blue-700 text-white flex flex-col items-center justify-center gap-1 transition-colors outline-none cursor-pointer"
                    title="Restore to Active Pipeline"
                  >
                    <RotateCcw size={15} />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-center px-1">Restore</span>
                  </button>

                  {/* Edit RFP & Reason Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditModal(item);
                    }}
                    className="w-[75px] h-full bg-amber-600 hover:bg-amber-700 text-white flex flex-col items-center justify-center gap-1 transition-colors border-l border-neutral-800/40 outline-none cursor-pointer"
                    title="Edit Details & Value"
                  >
                    <Edit2 size={15} />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-center px-1">Edit</span>
                  </button>

                  {/* Delete Permanently Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(item.id);
                    }}
                    className="w-[75px] h-full bg-rose-600 hover:bg-rose-700 text-white flex flex-col items-center justify-center gap-1 transition-colors border-l border-neutral-800/40 outline-none cursor-pointer"
                    title="Delete Permanently"
                  >
                    <Trash2 size={15} />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-center px-1">Delete</span>
                  </button>
                </div>

                {/* Foreground Slim Card Content (Matching Pipeline Card Slimness) */}
                <div
                  id={`archive-card-${item.id}`}
                  onMouseDown={(e) => handleSwipeStart(e, item.id)}
                  onMouseMove={(e) => handleSwipeMove(e, item.id)}
                  onMouseUp={() => handleSwipeEnd(item.id)}
                  onMouseLeave={() => handleSwipeEnd(item.id)}
                  onTouchStart={(e) => handleSwipeStart(e, item.id)}
                  onTouchMove={(e) => handleSwipeMove(e, item.id)}
                  onTouchEnd={() => handleSwipeEnd(item.id)}
                  style={{ 
                    transform: swipedItemId === item.id ? `translateX(-${buttonsWidth}px)` : 'translateX(0px)', 
                    transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' 
                  }}
                  className="bg-[var(--card-bg-inner)] py-2.5 px-3.5 pl-4 relative z-10 w-full select-none cursor-grab active:cursor-grabbing border-b border-[var(--border)]/50 hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  {/* Left Sector Color Bar */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: sectorColor }} />

                  <div className="flex justify-between items-center gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Sector Icon Box */}
                      <div className="p-1.5 bg-[var(--bg-tertiary)] rounded-lg shrink-0 border border-[var(--border)] flex items-center justify-center shadow-sm" style={{ color: sectorColor }}>
                        <IconComp size={18} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 truncate">
                          {item.rfpNumber && (
                            <span className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] font-mono text-[10px] text-[var(--text-secondary)] font-bold shrink-0">
                              {item.rfpNumber}
                            </span>
                          )}
                          <h4 className="text-sm font-medium text-[var(--text-primary)] truncate" title={item.name}>
                            {item.name}
                          </h4>
                          {item.client && (
                            <span className="text-xs text-[var(--text-secondary)] truncate hidden md:inline">
                              — {item.client}
                            </span>
                          )}
                        </div>

                        {/* Compact Metadata row */}
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-[var(--text-secondary)] font-mono">
                          <span style={{ color: sectorColor }} className="font-bold">
                            {item.sector}
                          </span>
                          {item.region && <span>| {item.region}</span>}
                          {item.submissionDate && <span className="hidden sm:inline">| Sub: {item.submissionDate}</span>}
                          {item.archivedAt && (
                            <span className="text-amber-400/90 font-bold">
                              | Archived: {item.archivedAt}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-amber-400 font-sans">
                            <AlertTriangle size={11} className="shrink-0 text-amber-400" />
                            <strong className="font-medium">{item.archiveReason || "Not Specified"}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Value - Slim & Bold */}
                    <div className="text-right shrink-0">
                      <span className="text-sm font-mono font-bold text-[var(--text-primary)] block">
                        {totalVal.toLocaleString()} {currency}
                      </span>
                      <span className="text-[9px] font-mono text-[var(--text-secondary)] uppercase block">
                        {item.type}
                      </span>
                      {item.archivedAt && (
                        <span className="text-[9px] font-mono text-amber-400/80 block font-semibold">
                          {item.archivedAt}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Comprehensive Edit Modal (Allows Modifying Value, Name, Client, Sector, Region & Reason) */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg-inner)] border-2 border-amber-500/40 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setEditingItem(null)}
              className="absolute right-4 top-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-lg"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 border-b border-[var(--border)] pb-3">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                <Edit2 size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Edit Archived RFP Details
                </h3>
                <p className="text-xs text-[var(--text-secondary)] font-mono">
                  Modify values, proposal name, client, or archive reason
                </p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Proposal Name & Client */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] mb-1 font-bold">
                    Proposal Name:
                  </label>
                  <input 
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-xl p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] mb-1 font-bold">
                    Client Name:
                  </label>
                  <input 
                    type="text"
                    value={editClient}
                    onChange={(e) => setEditClient(e.target.value)}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-xl p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Sector & Region */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] mb-1 font-bold">
                    Market Sector:
                  </label>
                  <select
                    value={editSector}
                    onChange={(e) => setEditSector(e.target.value)}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-xl p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
                  >
                    {sectors.map(s => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] mb-1 font-bold">
                    Region:
                  </label>
                  <input 
                    type="text"
                    value={editRegion}
                    onChange={(e) => setEditRegion(e.target.value)}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-xl p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Modify Values Box */}
              <div className="p-3 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border)] space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1">
                    <DollarSign size={12} /> Financial Values ({currency})
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    Total: {(
                      (Number(editValArch) || 0) + 
                      (Number(editValInt) || 0) + 
                      (Number(editValCs) || 0) + 
                      (Number(editValVo) || 0)
                    ).toLocaleString()} {currency}
                  </span>
                </div>

                {editingItem.type === "VO" ? (
                  <div>
                    <label className="block text-[10px] font-mono text-[var(--text-secondary)] mb-1">
                      VO Value:
                    </label>
                    <input 
                      type="number"
                      value={editValVo}
                      onChange={(e) => setEditValVo(e.target.value)}
                      className="w-full bg-[var(--card-bg-inner)] border border-[var(--border)] rounded-lg p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-mono text-[var(--text-secondary)] mb-1">
                        Architecture:
                      </label>
                      <input 
                        type="number"
                        value={editValArch}
                        onChange={(e) => setEditValArch(e.target.value)}
                        className="w-full bg-[var(--card-bg-inner)] border border-[var(--border)] rounded-lg p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-[var(--text-secondary)] mb-1">
                        Interior:
                      </label>
                      <input 
                        type="number"
                        value={editValInt}
                        onChange={(e) => setEditValInt(e.target.value)}
                        className="w-full bg-[var(--card-bg-inner)] border border-[var(--border)] rounded-lg p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-[var(--text-secondary)] mb-1">
                        CS / Lead:
                      </label>
                      <input 
                        type="number"
                        value={editValCs}
                        onChange={(e) => setEditValCs(e.target.value)}
                        className="w-full bg-[var(--card-bg-inner)] border border-[var(--border)] rounded-lg p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Reason for Archiving */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] mb-1.5 font-bold">
                  Reason for Archiving / Loss:
                </label>
                <select
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-xl p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
                >
                  {COMMON_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                  <option value="Other">Other Reason...</option>
                </select>

                {editReason === "Other" && (
                  <textarea 
                    value={editCustomReason}
                    onChange={(e) => setEditCustomReason(e.target.value)}
                    placeholder="Enter details on why this proposal was archived..."
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500 min-h-[60px] mt-2"
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditReason}
                className="px-5 py-2 rounded-xl text-xs font-mono font-bold bg-amber-500 hover:bg-amber-600 text-black shadow-md transition-colors flex items-center gap-1.5"
              >
                <Check size={14} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
