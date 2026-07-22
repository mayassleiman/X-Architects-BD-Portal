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
  AlertTriangle
} from "lucide-react";
import { cn } from "../lib/utils";
import { useSearch } from "../context/SearchContext";
import { useCurrency } from "../context/CurrencyContext";
import * as XLSX from "xlsx";

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

  // Open edit modal for archive reason
  const handleOpenEditModal = (item: PipelineItem) => {
    setEditingItem(item);
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
      const updated = {
        ...editingItem,
        archiveReason: finalReason
      };
      await fetch(`/api/pipeline/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      setAllItems(allItems.map(i => i.id === editingItem.id ? updated : i));
      setEditingItem(null);
    } catch (err) {
      alert("Failed to update reason.");
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
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
              <Archive size={26} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-light tracking-tight text-[var(--text-primary)]">
                ARCHIVED PROPOSALS & ANALYTICS
              </h1>
              <p className="text-xs text-[var(--text-secondary)] font-mono uppercase tracking-wider mt-0.5">
                Archived RFPs Dashboard, Historical Win Rates & Loss Analysis
              </p>
            </div>
          </div>
        </div>

        {/* Year Filter Pill Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-[var(--bg-tertiary)] p-1 rounded-xl border border-[var(--border)]">
            <span className="text-xs font-mono text-[var(--text-secondary)] px-2.5 flex items-center gap-1.5">
              <Calendar size={13} /> Year:
            </span>
            <button
              onClick={() => setSelectedYear("ALL")}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-mono transition-all",
                selectedYear === "ALL" 
                  ? "bg-[var(--text-primary)] text-[var(--bg-primary)] font-bold shadow-sm" 
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
                  "px-3 py-1 rounded-lg text-xs font-mono transition-all",
                  selectedYear === yr.toString()
                    ? "bg-amber-500 text-black font-bold shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {yr}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-mono tracking-wider transition-all"
          >
            <Download size={14} /> Export Excel
          </button>
          
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-tertiary)] hover:bg-[var(--border)] text-[var(--text-primary)] border border-[var(--border)] rounded-xl text-xs font-mono tracking-wider transition-all"
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* KPI Dashboard Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total RFPs Received */}
        <div className="bg-[var(--card-bg-inner)] border border-[var(--border)] rounded-2xl p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-mono uppercase tracking-widest text-[var(--text-secondary)]">
              Total Received ({selectedYear})
            </span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Layers size={18} />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-bold font-mono text-[var(--text-primary)] mb-1">
            {yearStats.totalReceivedCount} <span className="text-xs font-normal text-[var(--text-secondary)]">RFPs</span>
          </div>
          <div className="text-xs font-mono text-blue-400">
            {yearStats.totalReceivedValue.toLocaleString()} {currency}
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] mt-2">
            Includes active pipeline + won + archived
          </p>
        </div>

        {/* Total Archived / Lost RFPs */}
        <div className="bg-[var(--card-bg-inner)] border border-amber-500/30 rounded-2xl p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-400">
              Archived / Lost ({selectedYear})
            </span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Archive size={18} />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-bold font-mono text-amber-400 mb-1">
            {yearStats.archivedCount} <span className="text-xs font-normal text-amber-400/70">RFPs</span>
          </div>
          <div className="text-xs font-mono text-amber-300">
            {yearStats.archivedValue.toLocaleString()} {currency}
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] mt-2">
            Archived and un-won RFPs
          </p>
        </div>

        {/* Win Rate */}
        <div className="bg-[var(--card-bg-inner)] border border-emerald-500/30 rounded-2xl p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">
              Proposal Win Rate
            </span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-bold font-mono text-emerald-400 mb-1">
            {yearStats.winRate.toFixed(1)}%
          </div>
          <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-1.5 mt-2 overflow-hidden border border-[var(--border)]">
            <div 
              className="bg-emerald-500 h-full transition-all duration-500" 
              style={{ width: `${Math.min(100, yearStats.winRate)}%` }}
            />
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] mt-2 flex justify-between">
            <span>Won: {yearStats.achievedCount}</span>
            <span>Lost/Archived: {yearStats.archivedCount}</span>
          </p>
        </div>

        {/* Active RFPs in Pipeline */}
        <div className="bg-[var(--card-bg-inner)] border border-[var(--border)] rounded-2xl p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-mono uppercase tracking-widest text-[var(--text-secondary)]">
              Active in Pipeline
            </span>
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
              <BarChart2 size={18} />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-bold font-mono text-[var(--text-primary)] mb-1">
            {yearStats.activeCount} <span className="text-xs font-normal text-[var(--text-secondary)]">RFPs</span>
          </div>
          <div className="text-xs font-mono text-cyan-400">
            {yearStats.activeValue.toLocaleString()} {currency}
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] mt-2">
            Currently active proposals & VOs
          </p>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sector Distribution */}
        <div className="bg-[var(--card-bg-inner)] border border-[var(--border)] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-4">
              <h3 className="text-sm font-mono uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                <PieChart size={16} className="text-amber-400" /> Sector Distribution
              </h3>
              <span className="text-xs font-mono text-[var(--text-secondary)]">
                {sectorBreakdown.length} Sectors
              </span>
            </div>

            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
              {sectorBreakdown.length === 0 ? (
                <div className="text-center py-8 text-xs font-mono text-[var(--text-secondary)]">
                  No sector data for this period
                </div>
              ) : (
                sectorBreakdown.map(sec => {
                  const IconComp = getSectorIcon(sec.name);
                  return (
                    <div key={sec.name} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="flex items-center gap-2 font-medium" style={{ color: sec.color }}>
                          <IconComp size={16} />
                          {sec.name} ({sec.count})
                        </span>
                        <span className="font-mono text-[var(--text-primary)] font-bold">
                          {sec.value.toLocaleString()} {currency}
                        </span>
                      </div>
                      <div className="w-full bg-[var(--bg-tertiary)] h-2 rounded-full overflow-hidden border border-[var(--border)]/50">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.max(3, sec.percentage)}%`, backgroundColor: sec.color }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Reason for Loss / Archive Breakdown */}
        <div className="bg-[var(--card-bg-inner)] border border-[var(--border)] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-4">
              <h3 className="text-sm font-mono uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-400" /> Reasons for Loss / Archiving
              </h3>
              <span className="text-xs font-mono text-[var(--text-secondary)]">
                {reasonBreakdown.length} Reasons
              </span>
            </div>

            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
              {reasonBreakdown.length === 0 ? (
                <div className="text-center py-8 text-xs font-mono text-[var(--text-secondary)]">
                  No archive reasons recorded
                </div>
              ) : (
                reasonBreakdown.map(rb => (
                  <div key={rb.reason} className="p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)]/70">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-medium text-amber-300 truncate max-w-[200px]" title={rb.reason}>
                        {rb.reason}
                      </span>
                      <span className="font-mono font-bold text-[var(--text-primary)]">
                        {rb.count} RFP{rb.count > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono text-[var(--text-secondary)] mt-1">
                      <span>Value: {rb.value.toLocaleString()} {currency}</span>
                      <span>{rb.percentage.toFixed(1)}% of total lost value</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="bg-[var(--card-bg-inner)] border border-[var(--border)] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-4">
              <h3 className="text-sm font-mono uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                <MapPin size={16} className="text-cyan-400" /> Geographic Breakdown
              </h3>
              <span className="text-xs font-mono text-[var(--text-secondary)]">
                {regionBreakdown.length} Regions
              </span>
            </div>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {regionBreakdown.length === 0 ? (
                <div className="text-center py-8 text-xs font-mono text-[var(--text-secondary)]">
                  No region data for this period
                </div>
              ) : (
                regionBreakdown.map(reg => (
                  <div key={reg.region} className="flex justify-between items-center p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)]/70">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-cyan-400 shrink-0" />
                      <span className="text-xs font-medium text-[var(--text-primary)]">{reg.region}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-[var(--text-primary)] block">
                        {reg.value.toLocaleString()} {currency}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--text-secondary)]">
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

      {/* Advanced Filter Toolbar */}
      <div className="bg-[var(--card-bg-inner)] border border-[var(--border)] rounded-2xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input 
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search RFP number, name, client, reason..."
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-amber-500 transition-colors"
            />
            {searchFilter && (
              <button 
                onClick={() => setSearchFilter("")} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            <span className="text-xs font-mono text-[var(--text-secondary)] whitespace-nowrap">Sort By:</span>
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
                  "px-3 py-1.5 rounded-xl text-xs font-mono whitespace-nowrap transition-all border",
                  sortBy === s.id
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold"
                    : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)]"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sector & Region Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border)]/50">
          <span className="text-xs font-mono text-[var(--text-secondary)] flex items-center gap-1">
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
                  "px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all border flex items-center gap-1.5",
                  isSelected
                    ? "bg-[var(--bg-tertiary)] font-bold shadow-sm"
                    : "bg-[var(--bg-tertiary)]/50 text-[var(--text-secondary)] border-[var(--border)]/60 opacity-70 hover:opacity-100"
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
                  "px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all border flex items-center gap-1",
                  isSelected
                    ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40 font-bold"
                    : "bg-[var(--bg-tertiary)]/50 text-[var(--text-secondary)] border-[var(--border)]/60 opacity-70 hover:opacity-100"
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
              className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-rose-400 hover:bg-rose-500/10 transition-colors underline"
            >
              Clear All Filters
            </button>
          )}
        </div>
      </div>

      {/* List Header & Item Cards with iPhone Slide Effect */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)] px-1">
          <span>Archived RFPs ({filteredArchivedList.length})</span>
          <span className="hidden sm:inline">Swipe card left to Restore, Edit Reason, or Delete</span>
        </div>

        {filteredArchivedList.length === 0 ? (
          <div className="text-center py-16 bg-[var(--card-bg-inner)] border border-[var(--border)] rounded-2xl p-8 space-y-3">
            <Archive size={40} className="mx-auto text-amber-500/40" />
            <h4 className="text-base font-medium text-[var(--text-primary)]">No Archived RFPs Found</h4>
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
                className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg-inner)] transition-all shadow-sm group"
              >
                {/* Background Swipe Action Buttons (iPhone Slide Effect) */}
                <div 
                  className="absolute right-0 top-0 bottom-0 flex h-full z-0 overflow-hidden"
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
                    <RotateCcw size={16} />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-center px-1">Restore</span>
                  </button>

                  {/* Edit Reason Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditModal(item);
                    }}
                    className="w-[75px] h-full bg-amber-600 hover:bg-amber-700 text-white flex flex-col items-center justify-center gap-1 transition-colors border-l border-neutral-800/40 outline-none cursor-pointer"
                    title="Edit Archive Reason"
                  >
                    <Edit2 size={16} />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-center px-1">Reason</span>
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
                    <Trash2 size={16} />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-center px-1">Delete</span>
                  </button>
                </div>

                {/* Foreground Card Content */}
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
                  className="bg-[var(--card-bg-inner)] p-4 pl-5 relative z-10 w-full h-full select-none cursor-grab active:cursor-grabbing"
                >
                  {/* Left Sector Color Bar */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: sectorColor }} />

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      {/* Sector Icon Box */}
                      <div className="p-2.5 bg-[var(--bg-tertiary)] rounded-xl shrink-0 border border-[var(--border)] flex items-center justify-center shadow-sm" style={{ color: sectorColor }}>
                        <IconComp size={28} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.rfpNumber && (
                            <span className="px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border)] font-mono text-[11px] text-[var(--text-secondary)] font-bold">
                              {item.rfpNumber}
                            </span>
                          )}
                          <h4 className="text-base font-medium text-[var(--text-primary)] truncate" title={item.name}>
                            {item.name}
                          </h4>
                        </div>

                        {item.client && (
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
                            Client: <span className="text-[var(--text-primary)]">{item.client}</span>
                          </p>
                        )}

                        {/* Metadata row */}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-[var(--text-secondary)] font-mono uppercase tracking-wider">
                          <span style={{ color: sectorColor }} className="font-bold">
                            {item.sector}
                          </span>
                          {item.region && <span>Region: {item.region}</span>}
                          {item.submissionDate && <span>Submitted: {item.submissionDate}</span>}
                          {item.archivedAt && <span>Archived: {item.archivedAt}</span>}
                        </div>

                        {/* Reason Pill Highlight */}
                        <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-mono">
                          <AlertTriangle size={13} className="shrink-0 text-amber-400" />
                          <span>Reason: <strong className="font-sans font-medium">{item.archiveReason || "Not Specified"}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Right Value & Actions */}
                    <div className="text-right flex flex-col items-end gap-2 shrink-0 self-end sm:self-center">
                      <div>
                        <span className="text-lg font-mono font-bold text-[var(--text-primary)] block">
                          {totalVal.toLocaleString()} {currency}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">
                          Archived Proposal
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRestoreItem(item)}
                          className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/30 text-[10px] font-mono transition-colors flex items-center gap-1"
                          title="Restore to Active Pipeline"
                        >
                          <RotateCcw size={12} /> Restore
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="px-2.5 py-1 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--border)] border border-[var(--border)] text-[10px] font-mono transition-colors flex items-center gap-1"
                        >
                          <Edit2 size={12} /> Edit Reason
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Reason Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg-inner)] border border-[var(--border)] rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative">
            <button 
              onClick={() => setEditingItem(null)}
              className="absolute right-4 top-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-lg"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
              <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-[var(--text-primary)]">
                  Reason for Archiving / Loss
                </h3>
                <p className="text-xs text-[var(--text-secondary)] font-mono truncate max-w-xs">
                  {editingItem.name}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Select Reason:
                </label>
                <div className="space-y-2">
                  {COMMON_REASONS.map((r) => (
                    <label 
                      key={r}
                      className={cn(
                        "flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer text-xs transition-all",
                        editReason === r
                          ? "bg-amber-500/15 border-amber-500/50 text-amber-300 font-medium"
                          : "bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)] hover:border-amber-500/30"
                      )}
                    >
                      <input 
                        type="radio" 
                        name="archive_reason_radio" 
                        checked={editReason === r} 
                        onChange={() => setEditReason(r)}
                        className="accent-amber-500"
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              {editReason === "Other" && (
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                    Custom Reason / Specific Details:
                  </label>
                  <textarea 
                    value={editCustomReason}
                    onChange={(e) => setEditCustomReason(e.target.value)}
                    placeholder="Enter details on why this proposal was archived or not won..."
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-xl p-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500 min-h-[80px]"
                  />
                </div>
              )}
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
                <Check size={14} /> Save Reason
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
