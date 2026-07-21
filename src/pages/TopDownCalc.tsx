import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Calculator, 
  Plus, 
  Minus,
  Trash2, 
  Edit2, 
  Save, 
  RefreshCw, 
  Building, 
  Calendar, 
  User, 
  Search, 
  Hash, 
  AlertTriangle, 
  Check, 
  FolderOpen, 
  FileText, 
  ChevronRight, 
  ChevronUp,
  ChevronDown,
  CheckSquare, 
  Database,
  Briefcase,
  FileSpreadsheet,
  Download,
  GripVertical,
  Compass,
  Layers,
  Maximize2
} from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";
import { cn } from "../lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// TypeScript Interfaces
interface Phase {
  id: string;
  name: string;
  weight: number; // percentage (e.g. 15 for 15%)
}

interface Asset {
  id: string;
  name: string;
  quantity: number;
  gfa: number; // SqM per unit
  constructionRate: number; // rate per SqM
  activePhaseIds: string[]; // which phases apply to this building
}

interface Discipline {
  id: string;
  name: string;
  percentage: number;
  isXA: boolean;
  responsibility?: 'XA' | 'Subconsult' | 'Client';
}

interface TopDownCalculation {
  id?: number;
  projectId: string | null;
  clientName: string;
  proposalName: string;
  proposalNumber: string;
  submissionDate: string;
  phases: Phase[];
  globalDesignFeePercentage: number;
  assets: Asset[];
  totalConstructionCost: number;
  totalDesignFee: number;
  createdAt?: string;
  disciplines?: Discipline[];
  areaMode?: "BUA" | "GFA";
  plotArea?: number;
  far?: number;
  maxPlotCoverage?: number;
}

interface PipelineProject {
  id: string;
  name: string;
  client: string;
  submissionDate: string;
  rfpNumber: string;
  status: string;
}

// Default Disciplines Distribution
const DEFAULT_DISCIPLINES: Discipline[] = [
  { id: "disc-1", name: "Architecture", percentage: 45.0, isXA: true, responsibility: "XA" },
  { id: "disc-2", name: "Project Management", percentage: 5.0, isXA: true, responsibility: "XA" },
  { id: "disc-3", name: "Interior Design", percentage: 9.0, isXA: true, responsibility: "XA" },
  { id: "disc-4", name: "AOR", percentage: 0.0, isXA: false, responsibility: "Subconsult" },
  { id: "disc-5", name: "Landscape & Irrigation", percentage: 3.0, isXA: false, responsibility: "Subconsult" },
  { id: "disc-6", name: "Cost Consultant", percentage: 0.0, isXA: false, responsibility: "Subconsult" },
  { id: "disc-7", name: "CGIs/Renderings", percentage: 2.0, isXA: false, responsibility: "Subconsult" },
  { id: "disc-8", name: "Structural/Civil", percentage: 11.0, isXA: false, responsibility: "Subconsult" },
  { id: "disc-9", name: "MEPF", percentage: 8.0, isXA: false, responsibility: "Subconsult" },
  { id: "disc-10", name: "Lighting", percentage: 1.0, isXA: false, responsibility: "Subconsult" },
  { id: "disc-11", name: "Facades", percentage: 1.0, isXA: false, responsibility: "Subconsult" },
  { id: "disc-12", name: "VT", percentage: 1.0, isXA: false, responsibility: "Subconsult" },
  { id: "disc-13", name: "Acoustics", percentage: 1.0, isXA: false, responsibility: "Subconsult" },
  { id: "disc-14", name: "Sustainability", percentage: 2.0, isXA: false, responsibility: "Subconsult" },
  { id: "disc-15", name: "Waste Management", percentage: 1.0, isXA: false, responsibility: "Subconsult" },
  { id: "disc-16", name: "AV/ICT/IT/Telecom", percentage: 3.0, isXA: false, responsibility: "Subconsult" },
  { id: "disc-17", name: "Security Inc. CCTV", percentage: 1.0, isXA: false, responsibility: "Subconsult" },
  { id: "disc-18", name: "Kitchens", percentage: 1.0, isXA: false, responsibility: "Subconsult" },
  { id: "disc-19", name: "Traffic TIS", percentage: 1.0, isXA: false, responsibility: "Subconsult" },
  { id: "disc-20", name: "Roads & Car parking", percentage: 1.0, isXA: false, responsibility: "Subconsult" },
  { id: "disc-21", name: "FLS", percentage: 1.0, isXA: false, responsibility: "Subconsult" },
  { id: "disc-22", name: "Signage", percentage: 1.0, isXA: false, responsibility: "Subconsult" },
  { id: "disc-23", name: "BMS System", percentage: 1.0, isXA: false, responsibility: "Subconsult" },
  { id: "disc-24", name: "Window cleaning system", percentage: 0.0, isXA: false, responsibility: "Subconsult" },
  { id: "disc-25", name: "Exhibition", percentage: 0.0, isXA: false, responsibility: "Subconsult" }
];

// Default Phases
const DEFAULT_PHASES: Phase[] = [
  { id: "sa", name: "Site Analysis & Data Collection", weight: 5 },
  { id: "pc", name: "Pre-Concept Design", weight: 10 },
  { id: "cd", name: "Concept Design", weight: 15 },
  { id: "sd", name: "Schematic Design", weight: 30 },
  { id: "dd", name: "Detailed Design", weight: 30 },
  { id: "td", name: "Tender Design", weight: 5 },
  { id: "ifc", name: "IFCs", weight: 5 }
];

// Highlighted modern styling colors for Design Phases (to differentiate them)
const PHASE_STYLES = [
  { border: "border-l-rose-500", text: "text-rose-600", bg: "bg-rose-500/[0.04]", badge: "bg-rose-500/10 text-rose-600 border-rose-500/20", dot: "bg-rose-500" },
  { border: "border-l-amber-500", text: "text-amber-600", bg: "bg-amber-500/[0.04]", badge: "bg-amber-500/10 text-amber-600 border-amber-500/20", dot: "bg-amber-500" },
  { border: "border-l-emerald-500", text: "text-emerald-600", bg: "bg-emerald-500/[0.04]", badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", dot: "bg-emerald-500" },
  { border: "border-l-blue-500", text: "text-blue-600", bg: "bg-blue-500/[0.04]", badge: "bg-blue-500/10 text-blue-600 border-blue-500/20", dot: "bg-blue-500" },
  { border: "border-l-violet-500", text: "text-violet-600", bg: "bg-violet-500/[0.04]", badge: "bg-violet-500/10 text-violet-600 border-violet-500/20", dot: "bg-violet-500" },
  { border: "border-l-pink-500", text: "text-pink-600", bg: "bg-pink-500/[0.04]", badge: "bg-pink-500/10 text-pink-600 border-pink-500/20", dot: "bg-pink-500" },
  { border: "border-l-teal-500", text: "text-teal-600", bg: "bg-teal-500/[0.04]", badge: "bg-teal-500/10 text-teal-600 border-teal-500/20", dot: "bg-teal-500" },
  { border: "border-l-indigo-500", text: "text-indigo-600", bg: "bg-indigo-500/[0.04]", badge: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20", dot: "bg-indigo-500" },
];

const getPhaseStyle = (index: number) => {
  return PHASE_STYLES[index % PHASE_STYLES.length];
};

// Custom helper component for discipline percentage inputs to satisfy:
// 1. Not seeing the zero to the left of the number if changing manually.
// 2. Increase or decrease the number by 0.5% in each click.
// 3. Keep the possibility to enter any decimal number manually.
const DisciplinePercentageInput = ({
  value,
  onChange,
  step = 0.5
}: {
  value: number;
  onChange: (val: number) => void;
  step?: number;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const [localVal, setLocalVal] = useState<string>(value === 0 ? "" : String(value));

  useEffect(() => {
    // Only update local value from parent prop if the user is not actively typing in it
    if (document.activeElement !== ref.current) {
      setLocalVal(value === 0 ? "" : String(value));
    }
  }, [value]);

  const handleChange = (valStr: string) => {
    setLocalVal(valStr);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed)) {
      onChange(parsed);
    } else {
      onChange(0);
    }
  };

  const handleBlur = () => {
    if (localVal === "" || isNaN(parseFloat(localVal))) {
      setLocalVal("");
      onChange(0);
    } else {
      setLocalVal(String(parseFloat(localVal)));
    }
  };

  return (
    <input
      ref={ref}
      type="number"
      step={step}
      min="0"
      max="100"
      value={localVal}
      placeholder="0.0"
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      className="w-14 bg-transparent border-0 text-center py-1.5 text-xs font-mono font-bold text-[var(--text-primary)] focus:outline-none focus:ring-0"
    />
  );
};

// Custom helper component for collapsible section wrapper
const SectionContent = ({ isCollapsed, children }: { isCollapsed: boolean; children: React.ReactNode }) => {
  return (
    <div className={cn(
      "transition-all duration-300 ease-in-out",
      isCollapsed 
        ? "max-h-0 opacity-0 overflow-hidden pointer-events-none print:max-h-none print:opacity-100 print:overflow-visible print:pointer-events-auto" 
        : "max-h-[9999px] opacity-100"
    )}>
      <div>
        {children}
      </div>
    </div>
  );
};

export function TopDownCalc() {
  const { currency } = useCurrency();

  // Section collapse states
  const [collapsedSections, setCollapsedSections] = useState({
    analytics: false,
    projectSelection: false,
    phases: false,
    assets: false,
    disciplines: false,
  });

  // Active view: "calculator" or "history"
  const [activeTab, setActiveTab] = useState<"calculator" | "history">("calculator");

  // Database states
  const [pipelineProjects, setPipelineProjects] = useState<PipelineProject[]>([]);
  const [historicalCalcs, setHistoricalCalcs] = useState<TopDownCalculation[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Loaded Calculation ID (if editing an existing record)
  const [currentCalcId, setCurrentCalcId] = useState<number | null>(null);

  // Section 1 State: Project details & Global parameters
  const [selectedProjectId, setSelectedProjectId] = useState<string>("manual");
  const [clientName, setClientName] = useState<string>("");
  const [proposalName, setProposalName] = useState<string>("");
  const [proposalNumber, setProposalNumber] = useState<string>("");
  const [submissionDate, setSubmissionDate] = useState<string>("");
  const [globalDesignFeePercentage, setGlobalDesignFeePercentage] = useState<number>(2.35);
  const [areaMode, setAreaMode] = useState<"BUA" | "GFA">("BUA");
  const [plotArea, setPlotArea] = useState<string>("");
  const [far, setFar] = useState<string>("");
  const [maxPlotCoverage, setMaxPlotCoverage] = useState<string>("");

  // Custom and active phases
  const [phases, setPhases] = useState<Phase[]>(DEFAULT_PHASES);
  const [newPhaseName, setNewPhaseName] = useState<string>("");
  const [newPhaseWeight, setNewPhaseWeight] = useState<number>(5);
  const [draggedPhaseIndex, setDraggedPhaseIndex] = useState<number | null>(null);
  const [draggedDisciplineIndex, setDraggedDisciplineIndex] = useState<number | null>(null);

  // Section 2 State: Assets
  const [assets, setAssets] = useState<Asset[]>([]);

  // Asset Row Form Add
  const [newAssetName, setNewAssetName] = useState<string>("");
  const [newAssetQty, setNewAssetQty] = useState<number>(1);
  const [newAssetGfa, setNewAssetGfa] = useState<number>(5000);
  const [newAssetRate, setNewAssetRate] = useState<number>(3500);

  // Section 3 State: Disciplines
  const [disciplines, setDisciplines] = useState<Discipline[]>(DEFAULT_DISCIPLINES);
  const [newDisciplineName, setNewDisciplineName] = useState<string>("");

  // Search filter for History tab
  const [historySearch, setHistorySearch] = useState<string>("");

  // Notification Banner State
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | null }>({
    message: "",
    type: null
  });

  // Fetch projects and calculation history
  const loadData = async () => {
    setIsLoadingProjects(true);
    setIsLoadingHistory(true);
    try {
      // 1. Fetch from Pipeline with cache-buster to prevent stale/cached responses
      const projRes = await fetch(`/api/pipeline?_t=${Date.now()}`);
      if (projRes.ok) {
        const data = await projRes.json();
        // Include any RFP items (Pending, Submitted, Won, etc.) so they don't disappear when status changes
        const toSubmit = data.filter(
          (p: any) => p.type === "RFP"
        );
        setPipelineProjects(toSubmit);
      }

      // 2. Fetch from Top-Down Archive with cache-buster
      const historyRes = await fetch(`/api/top-down-calc?_t=${Date.now()}`);
      if (historyRes.ok) {
        const data = await historyRes.json();
        setHistoricalCalcs(data);
      }
    } catch (err) {
      console.error("Error loading top-down data: ", err);
      showNotification("Failed to fetch data from database.", "error");
    } finally {
      setIsLoadingProjects(false);
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification({ message: "", type: null });
    }, 4500);
  };

  // Auto-fill form on electing a project
  const handleProjectSelectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    if (projectId === "manual") {
      setClientName("");
      setProposalName("");
      setProposalNumber("");
      setSubmissionDate("");
      return;
    }

    const proj = pipelineProjects.find((p) => p.id === projectId);
    if (proj) {
      setClientName(proj.client || "");
      setProposalName(proj.name || "");
      setProposalNumber(proj.rfpNumber || "");
      setSubmissionDate(proj.submissionDate || "");
      showNotification(`Auto-filled details for RFP: ${proj.name}`, "success");
    }
  };

  // Phase Handlers (Section 1)
  const handlePhaseDragStart = (e: React.DragEvent, index: number) => {
    setDraggedPhaseIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handlePhaseDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handlePhaseDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedPhaseIndex === null || draggedPhaseIndex === targetIndex) return;

    const updated = [...phases];
    const item = updated[draggedPhaseIndex];
    updated.splice(draggedPhaseIndex, 1);
    updated.splice(targetIndex, 0, item);

    setDraggedPhaseIndex(null);
    setPhases(updated);
    showNotification("Design phases rearranged successfully", "success");
  };

  // Discipline Drag and Drop Handlers (Section 3)
  const handleDisciplineDragStart = (e: React.DragEvent, index: number) => {
    setDraggedDisciplineIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDisciplineDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDisciplineDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedDisciplineIndex === null || draggedDisciplineIndex === targetIndex) return;

    const list = [...disciplines];
    const draggedItem = list[draggedDisciplineIndex];
    list.splice(draggedDisciplineIndex, 1);
    list.splice(targetIndex, 0, draggedItem);

    // Group XAs automatically at the beginning
    const xas = list.filter((d) => d.isXA);
    const nonXas = list.filter((d) => !d.isXA);

    setDisciplines([...xas, ...nonXas]);
    setDraggedDisciplineIndex(null);
    showNotification("Disciplines rearranged successfully.", "success");
  };

  const addCustomPhase = () => {
    if (!newPhaseName.trim()) {
      showNotification("Phase name cannot be empty.", "error");
      return;
    }
    const id = "custom-" + Date.now();
    const newPhase: Phase = {
      id,
      name: newPhaseName.trim(),
      weight: Number(newPhaseWeight) || 0
    };

    const updatedPhases = [...phases, newPhase];
    setPhases(updatedPhases);

    // Automatically make this phase active for all existing assets
    setAssets(
      assets.map((asset) => ({
        ...asset,
        activePhaseIds: [...asset.activePhaseIds, id]
      }))
    );

    setNewPhaseName("");
    setNewPhaseWeight(5);
    showNotification(`Added custom phase: ${newPhase.name}`, "success");
  };

  const removePhase = (id: string) => {
    setPhases(phases.filter((p) => p.id !== id));
    // Clean up active ids in assets
    setAssets(
      assets.map((asset) => ({
        ...asset,
        activePhaseIds: asset.activePhaseIds.filter((pId) => pId !== id)
      }))
    );
    showNotification("Phase removed.", "success");
  };

  const updatePhaseWeight = (id: string, weight: number) => {
    setPhases(
      phases.map((p) => (p.id === id ? { ...p, weight: Number(weight) || 0 } : p))
    );
  };

  const updatePhaseName = (id: string, name: string) => {
    setPhases(
      phases.map((p) => (p.id === id ? { ...p, name } : p))
    );
  };

  // Normalize Phase percentages to fit exactly 100%
  const normalizePhasesTo100 = () => {
    const totalWeight = phases.reduce((sum, p) => sum + p.weight, 0);
    if (totalWeight === 0) {
      showNotification("Cannot normalize when total weight is 0%", "error");
      return;
    }
    const normalized = phases.map((p) => ({
      ...p,
      weight: parseFloat(((p.weight / totalWeight) * 100).toFixed(2))
    }));
    setPhases(normalized);
    showNotification("Phases normalized to sum to 100% proportionally", "success");
  };

  const resetPhasesToDefault = () => {
    setPhases(DEFAULT_PHASES);
    // Sync assets with default phases
    setAssets(
      assets.map((asset) => ({
        ...asset,
        activePhaseIds: DEFAULT_PHASES.map((p) => p.id)
      }))
    );
    showNotification("Reset phases to default baseline data", "success");
  };

  // Phase Sum Validation
  const totalPhaseWeightSum = useMemo(() => {
    return parseFloat(phases.reduce((sum, p) => sum + p.weight, 0).toFixed(2));
  }, [phases]);

  // Asset Handlers (Section 2)
  const addAssetRow = () => {
    if (!newAssetName.trim()) {
      showNotification("Asset name cannot be empty.", "error");
      return;
    }
    const newAsset: Asset = {
      id: "asset-" + Date.now(),
      name: newAssetName.trim(),
      quantity: Number(newAssetQty) || 1,
      gfa: Number(newAssetGfa) || 0,
      constructionRate: Number(newAssetRate) || 0,
      activePhaseIds: phases.map((p) => p.id) // all active by default
    };

    setAssets([...assets, newAsset]);
    setNewAssetName("");
    setNewAssetQty(1);
    setNewAssetGfa(5000);
    setNewAssetRate(3500);
    showNotification(`Added asset: ${newAsset.name}`, "success");
  };

  const addEmptyAsset = () => {
    const id = "asset-" + Date.now();
    const newAsset: Asset = {
      id,
      name: `Building ${assets.length + 1}`,
      quantity: 1,
      gfa: 5000,
      constructionRate: 3500,
      activePhaseIds: phases.map((p) => p.id) // all active by default
    };

    setAssets([...assets, newAsset]);
    showNotification("Added a new editable building row directly inside the table!", "success");
  };

  const handleAutoComposeAsset = () => {
    const parsedPlotArea = Number(plotArea) || 0;
    const parsedFar = Number(far) || 0;
    const parsedCoverage = Number(maxPlotCoverage) || 0;

    if (parsedPlotArea <= 0 || parsedFar <= 0) {
      showNotification("Please specify valid Plot Area and FAR to calculate allowable GFA.", "error");
      return;
    }

    const calculatedGfa = parsedPlotArea * parsedFar;
    const maxFootprint = parsedCoverage > 0 ? (parsedPlotArea * (parsedCoverage / 100)) : 0;
    
    let floorCount = 1;
    if (maxFootprint > 0) {
      floorCount = Math.ceil(calculatedGfa / maxFootprint);
    } else {
      // Default guess if coverage is not provided
      floorCount = Math.ceil(parsedFar / 0.4); // assume 40% coverage
    }

    const isTower = floorCount >= 5;
    const deducedShapeName = isTower 
      ? `Tower (Vertical Shape - ${floorCount} Floors)` 
      : `Horizontal Layout (Low-Rise - ${floorCount} Floors)`;

    const newAsset: Asset = {
      id: "asset-" + Date.now(),
      name: deducedShapeName,
      quantity: 1,
      gfa: Math.round(calculatedGfa),
      constructionRate: 4500, // standard default rate
      activePhaseIds: phases.map((p) => p.id)
    };

    setAssets([...assets, newAsset]);
    showNotification("Successfully composed the allowable building asset block and added it to the assets list!", "success");
  };

  const removeAsset = (id: string) => {
    setAssets(assets.filter((a) => a.id !== id));
    showNotification("Asset removed.", "success");
  };

  const updateAssetField = (id: string, field: keyof Asset, val: any) => {
    setAssets(
      assets.map((asset) => (asset.id === id ? { ...asset, [field]: val } : asset))
    );
  };

  const toggleAssetPhaseScope = (assetId: string, phaseId: string) => {
    setAssets(
      assets.map((asset) => {
        if (asset.id !== assetId) return asset;
        const exists = asset.activePhaseIds.includes(phaseId);
        return {
          ...asset,
          activePhaseIds: exists
            ? asset.activePhaseIds.filter((id) => id !== phaseId)
            : [...asset.activePhaseIds, phaseId]
        };
      })
    );
  };

  // Perform All Core Top Down Fee Calculations
  const calculatedMetrics = useMemo(() => {
    let totalConstructionCost = 0;
    let totalDesignFee = 0;

    // Calculate details per asset
    const assetDetails = assets.map((asset) => {
      const assetCost = asset.quantity * asset.gfa * asset.constructionRate;
      totalConstructionCost += assetCost;

      // Sum weights of active phases for this asset
      const activePhasesSumWeight = phases
        .filter((p) => asset.activePhaseIds.includes(p.id))
        .reduce((sum, p) => sum + p.weight, 0);

      // Design fee contribution: Cost * Global % * (Sum of relative phase weights out of 100)
      const designFee =
        assetCost * (globalDesignFeePercentage / 100) * (activePhasesSumWeight / 100);
      totalDesignFee += designFee;

      return {
        ...asset,
        cost: assetCost,
        activePhasesWeight: activePhasesSumWeight,
        designFee
      };
    });

    // Calculate Phase-by-Phase Fee Breakdown
    const phaseBreakdown = phases.map((phase) => {
      let phaseTotalFee = 0;

      // Add contribution to this phase from each asset where this phase is active
      assets.forEach((asset) => {
        if (asset.activePhaseIds.includes(phase.id)) {
          const assetCost = asset.quantity * asset.gfa * asset.constructionRate;
          // Asset's contribution to this phase = Asset Cost * Global Design Feed % * Phase Weight
          const contribution =
            assetCost * (globalDesignFeePercentage / 100) * (phase.weight / 100);
          phaseTotalFee += contribution;
        }
      });

      return {
        phaseId: phase.id,
        phaseName: phase.name,
        phaseWeight: phase.weight,
        allocatedFee: phaseTotalFee
      };
    });

    return {
      totalConstructionCost,
      totalDesignFee,
      assetDetails,
      phaseBreakdown
    };
  }, [assets, phases, globalDesignFeePercentage]);

  // Average fee per area calculation
  const avgFeePerAreaElement = useMemo(() => {
    const totalArea = assets.reduce((sum, a) => sum + (a.quantity * a.gfa), 0);
    if (totalArea === 0) return null;
    const avgPerArea = calculatedMetrics.totalDesignFee / totalArea;
    return (
      <div className="border-t border-emerald-500/10 pt-2.5 mt-3 flex justify-between text-[10px] font-mono text-emerald-500/80">
        <span>Avg Fee per {areaMode} SqM:</span>
        <span>{avgPerArea.toFixed(2)} {currency} / SqM</span>
      </div>
    );
  }, [assets, calculatedMetrics.totalDesignFee, currency, areaMode]);

  // Section 3: Calculated disciplines metrics
  const disciplineMetrics = useMemo(() => {
    const totalDesignFee = calculatedMetrics.totalDesignFee;
    let totalXaFee = 0;
    let totalSubFee = 0;
    let totalClientFee = 0;
    let totalPercentage = 0;

    const breakdown = disciplines.map((d) => {
      const allocatedFee = totalDesignFee * (d.percentage / 100);
      const resp = d.responsibility || (d.isXA ? 'XA' : 'Subconsult');
      
      if (resp === 'XA') {
        totalXaFee += allocatedFee;
      } else if (resp === 'Subconsult') {
        totalSubFee += allocatedFee;
      } else {
        totalClientFee += allocatedFee;
      }
      totalPercentage += d.percentage;

      return {
        ...d,
        responsibility: resp,
        allocatedFee
      };
    });

    const totalProposedContractFee = totalXaFee + totalSubFee;

    return {
      breakdown,
      totalXaFee,
      totalSubFee,
      totalClientFee,
      totalProposedContractFee,
      totalPercentage
    };
  }, [disciplines, calculatedMetrics.totalDesignFee]);

  // Rich details for the detailed Dashboard
  const dashboardStats = useMemo(() => {
    const totalGfa = assets.reduce((sum, a) => sum + (a.quantity * a.gfa), 0);
    const totalConstructionCost = calculatedMetrics.totalConstructionCost;
    const totalDesignFee = calculatedMetrics.totalDesignFee;
    
    const avgConstructionRate = totalGfa > 0 ? totalConstructionCost / totalGfa : 0;
    const avgDesignFeePerSqM = totalGfa > 0 ? totalDesignFee / totalGfa : 0;
    const effectiveFeePercentage = totalConstructionCost > 0 ? (totalDesignFee / totalConstructionCost) * 100 : 0;
    
    // Split for XA vs SUB vs CLIENT
    const totalXaFee = disciplineMetrics.totalXaFee;
    const totalSubFee = disciplineMetrics.totalSubFee;
    const totalClientFee = disciplineMetrics.totalClientFee;
    const totalProposedContractFee = disciplineMetrics.totalProposedContractFee;

    const xaPercentageOfFee = totalDesignFee > 0 ? (totalXaFee / totalDesignFee) * 100 : 0;
    const subPercentageOfFee = totalDesignFee > 0 ? (totalSubFee / totalDesignFee) * 100 : 0;
    const clientPercentageOfFee = totalDesignFee > 0 ? (totalClientFee / totalDesignFee) * 100 : 0;
    const proposedContractPercentageOfFee = totalDesignFee > 0 ? (totalProposedContractFee / totalDesignFee) * 100 : 0;

    return {
      totalGfa,
      avgConstructionRate,
      avgDesignFeePerSqM,
      effectiveFeePercentage,
      totalXaFee,
      totalSubFee,
      totalClientFee,
      totalProposedContractFee,
      xaPercentageOfFee,
      subPercentageOfFee,
      clientPercentageOfFee,
      proposedContractPercentageOfFee
    };
  }, [assets, calculatedMetrics, disciplineMetrics]);

  // Sort disciplines so XA is first, then Subconsult, then Client
  const sortDisciplines = (list: Discipline[]) => {
    const order = { XA: 1, Subconsult: 2, Client: 3 };
    return [...list].sort((a, b) => {
      const valA = order[a.responsibility || (a.isXA ? "XA" : "Subconsult")] || 2;
      const valB = order[b.responsibility || (b.isXA ? "XA" : "Subconsult")] || 2;
      return valA - valB;
    });
  };

  // Discipline modifications handlers
  const addDiscipline = () => {
    if (!newDisciplineName.trim()) {
      showNotification("Please enter a discipline name.", "error");
      return;
    }
    const id = `disc-${Date.now()}`;
    const newDisc: Discipline = {
      id,
      name: newDisciplineName.trim(),
      percentage: 0,
      isXA: false,
      responsibility: "Subconsult"
    };
    setDisciplines((prev) => {
      const updated = [...prev, newDisc];
      return sortDisciplines(updated);
    });
    setNewDisciplineName("");
    showNotification("New discipline added successfully.", "success");
  };

  const removeDiscipline = (id: string) => {
    setDisciplines((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      return sortDisciplines(updated);
    });
    showNotification("Discipline removed from list.", "success");
  };

  const updateDiscipline = (id: string, updates: Partial<Discipline>) => {
    setDisciplines((prev) => {
      const updated = prev.map((d) => {
        if (d.id !== id) return d;
        const next = { ...d, ...updates };
        // Sync isXA with responsibility
        if (updates.responsibility) {
          next.isXA = updates.responsibility === "XA";
        } else if (updates.isXA !== undefined) {
          next.responsibility = updates.isXA ? "XA" : "Subconsult";
        }
        return next;
      });
      return sortDisciplines(updated);
    });
  };

  // Export Top-Down calculation to Excel Sheet
  const exportToExcel = () => {
    if (!proposalName.trim()) {
      showNotification("Proposal Name is required to export to Excel.", "error");
      return;
    }

    const totalGfa = assets.reduce((sum, a) => sum + (a.quantity * a.gfa), 0);

    // Formulate a beautiful sheet using Array of Arrays (AOA)
    const rows = [
      ["TOP-DOWN ARCHITECTURAL PRICING ANALYSIS REPORT"],
      [`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} (UTC)`],
      [`Estimator Suite Pro Module`],
      [],
      ["1. GENERAL PROJECT DETAILS"],
      ["Attribute/Metric Description", "Defined Value", "Category Remarks / Notes"],
      ["Proposal Name", proposalName, "Main bidding title"],
      ["Client Name", clientName || "N/A", "Registered RFP lead contact"],
      ["Proposal / RFP Number", proposalNumber || "N/A", "Unique identifier code"],
      ["Date of Submission", submissionDate || "N/A", "Target bid submission deadline"],
      ["Global Design Fee Percentage Factor", `${globalDesignFeePercentage.toFixed(2)}%`, "Applied multiplier over core construction rates"],
      ["Computed Average Fee / SqM", totalGfa > 0 ? (calculatedMetrics.totalDesignFee / totalGfa).toFixed(2) : "0.00", `${currency} per ${areaMode} SqM`],
      [],
      ["2. SUMMARY FINANCIAL ESTIMATES"],
      ["Financial KPI Description", "Amount", "Currency"],
      ["Total Estimated Construction Cost", calculatedMetrics.totalConstructionCost, currency],
      ["Total Calculated Design Fee (Weight Mapped)", calculatedMetrics.totalDesignFee, currency],
      [],
      ["3. ESTIMATED DESIGN PHASES & STAGES WEIGHING BREAKDOWN"],
      ["Design Stage ID", "Design Phase Title", "Baseline Stage Weight (%)", "Allocated Stage Design Fee Amount"],
      ...phases.map(p => {
        const breakdown = calculatedMetrics.phaseBreakdown.find(b => b.phaseId === p.id);
        return [
          p.id.toUpperCase(),
          p.name,
          p.weight / 100, // Excel can format as percentage or standard decimal
          breakdown ? breakdown.allocatedFee : 0
        ];
      }),
      [],
      ["4. SPECIFIED BUILDING ASSETS & ACTIVE PHASE SCOPE MAPPING"],
      ["Asset Block Name", "Unit Quantity", `${areaMode} per Unit (SqM)`, "Est. Construction Rate / SqM", "Calculated Total Construction Cost", "Applicable Design Phases Mapped (Included Scope)"],
      ...assets.map(a => {
        const activePhs = phases
          .filter(p => a.activePhaseIds.includes(p.id))
          .map(p => p.name)
          .join(", ");
        return [
          a.name,
          a.quantity,
          a.gfa,
          a.constructionRate,
          a.quantity * a.gfa * a.constructionRate,
          activePhs || "None"
        ];
      }),
      [],
      ["5. DISCIPLINE ALLOCATION & SCOPE SPLIT (XA VS. SUBCONULT VS. CLIENT)"],
      ["Group Classification", "Discipline Name", "Allocation Percentage (%)", "Allocated Fee Portion", "Contract Status"],
      ...disciplines.map(d => {
        const allocatedFee = calculatedMetrics.totalDesignFee * (d.percentage / 100);
        const resp = d.responsibility || (d.isXA ? 'XA' : 'Subconsult');
        let classification = "XA (In-house)";
        let status = "Included";
        if (resp === 'Subconsult') {
          classification = "Subconsulted";
        } else if (resp === 'Client') {
          classification = "By Client";
          status = "EXCLUDED";
        }
        return [
          classification,
          d.name,
          d.percentage / 100,
          allocatedFee,
          status
        ];
      }),
      [],
      ["XA TOTAL FEES (IN-HOUSE CORE)", disciplineMetrics.totalXaFee, currency, "Sum of XA-toggled core disciplines"],
      ["SUBCONSULTED TOTAL FEES", disciplineMetrics.totalSubFee, currency, "Sum of subconsulted specialist disciplines"],
      ["CLIENT TRADE FEES (EXCLUDED)", disciplineMetrics.totalClientFee, currency, "Sum of trades left to Client (EXCLUDED from contract)"],
      ["TOTAL PROPOSED CONTRACT FEE (XA + SUB)", disciplineMetrics.totalProposedContractFee, currency, "Total value of proposal submitted by XA"],
      ["COMBINED TOTAL DESIGN FEE BASELINE", calculatedMetrics.totalDesignFee, currency, "Theoretical standard total baseline"],
      [],
      ["Report Disclaimer: Classification is Commercial in Confidence. Projections are computed mathematically based on local user definitions."]
    ];

    // Convert AOA to sheet
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Set nice scannable column widths
    const colWidths = [
      { wch: 38 }, // Col A (Attribute name, Assets)
      { wch: 15 }, // Col B (Value, Qty)
      { wch: 22 }, // Col C (GFA, Currency)
      { wch: 26 }, // Col D (Unit rates)
      { wch: 28 }, // Col E (Total Costs)
      { wch: 55 }  // Col F (Scope)
    ];
    ws["!cols"] = colWidths;

    // Apply number format to specific cell ranges for polished look
    // e.g. Excel standard formatting
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Top Down Pricing Summary");

    const sanitizedFilename = proposalName.replace(/[/\\?%*:|"<>]/g, "_") || "Top_Down";
    XLSX.writeFile(wb, `${sanitizedFilename}_financial_report.xlsx`);
    showNotification("Financial model exported to Excel successfully!", "success");
  };

  // Export Top-Down calculation to PDF
  const exportToPDF = async () => {
    if (!proposalName.trim()) {
      showNotification("Proposal Name is required to export to PDF.", "error");
      return;
    }

    const doc = new jsPDF("p", "mm", "a4");
    let tableStartY = 50;

    // Try to load header logo
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
        
        let logoWidth = 25; 
        let logoHeight = (imgProps.height * logoWidth) / imgProps.width;
        if (logoHeight > 15) {
          logoHeight = 15;
          logoWidth = (imgProps.width * logoHeight) / imgProps.height;
        }
        doc.addImage(logoBase64, 'PNG', pdfWidth - logoWidth - 14, 10, logoWidth, logoHeight);
        tableStartY = Math.max(tableStartY, 10 + logoHeight + 15);
      }
    } catch (error) {
      console.error("Error adding logo to PDF:", error);
    }

    // Top border line divider
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(14, 32, doc.internal.pageSize.getWidth() - 14, 32);

    // Title Block
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("EXECUTIVE PRICING & SCOPE REPORT", 14, 24);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    const generationDate = new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
    doc.text(`Generated on ${generationDate} | Estimator Suite Pro | Client-Ready Deliverable`, 14, 29);

    // Dynamic Parameter table grid
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("1. PROJECT INFORMATION & BASELINE PARAMETERS", 14, 40);

    let metaY = 46;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105); // slate-600

    // Left Columns
    doc.text(`Proposal Name:    ${proposalName}`, 14, metaY);
    doc.text(`Client Name:          ${clientName || 'N/A'}`, 14, metaY + 5);
    doc.text(`Proposal No.:         ${proposalNumber || 'N/A'}`, 14, metaY + 10);

    const totalGfa = assets.reduce((sum, a) => sum + (a.quantity * a.gfa), 0);

    // Right Columns
    const col2X = 112;
    doc.text(`Submission Date:     ${submissionDate || 'N/A'}`, col2X, metaY);
    doc.text(`Global Fee Factor:    ${globalDesignFeePercentage.toFixed(2)}%`, col2X, metaY + 5);
    doc.text(`Total Portfolio ${areaMode}: ${totalGfa.toLocaleString()} SqM`, col2X, metaY + 10);

    // Dynamic Volume parameters if present
    if (plotArea || far || maxPlotCoverage) {
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400
      let volText = `Plot Specs: Plot Area = ${plotArea ? parseFloat(plotArea).toLocaleString() + ' SqM' : '--'} | FAR = ${far || '--'} | Max Coverage = ${maxPlotCoverage ? maxPlotCoverage + '%' : '--'}`;
      doc.text(volText, 14, metaY + 14);
    }

    // --- IMPRESSIVE TRI-STATE COMMERCIAL DASHBOARD ---
    const summaryBoxY = metaY + (plotArea || far || maxPlotCoverage ? 18 : 13);
    
    // Draw Section Header
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("2. PROPOSED CONTRACT FEE & SCOPE SPLIT SUMMARY", 14, summaryBoxY);

    const cardsY = summaryBoxY + 3;
    const pageWidth = doc.internal.pageSize.getWidth();
    const cardWidth = (pageWidth - 28 - 6) / 3; // split into 3 cards with 3mm gap
    const cardHeight = 30;

    // CARD 1: XA In-House Core Services (Green tint)
    doc.setFillColor(240, 253, 244); // bg-green-50
    doc.setDrawColor(187, 247, 208); // border-green-200
    doc.roundedRect(14, cardsY, cardWidth, cardHeight, 2, 2, "DF");
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(22, 101, 52); // text-green-800
    doc.text("XA IN-HOUSE FEE PORTION", 18, cardsY + 6);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Core Services (${dashboardStats.xaPercentageOfFee.toFixed(1)}%)`, 18, cardsY + 10);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(22, 101, 52);
    doc.text(`${disciplineMetrics.totalXaFee.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${currency}`, 18, cardsY + 18);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(120, 130, 140);
    doc.text("Arch, PM, Interior, etc.", 18, cardsY + 25);

    // CARD 2: Subconsulted Scope (Blue/Cyan tint)
    const card2X = 14 + cardWidth + 3;
    doc.setFillColor(239, 246, 255); // bg-blue-50
    doc.setDrawColor(191, 219, 254); // border-blue-200
    doc.roundedRect(card2X, cardsY, cardWidth, cardHeight, 2, 2, "DF");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 64, 175); // text-blue-800
    doc.text("SUBCONSULTED FEE PORTION", card2X + 4, cardsY + 6);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Specialist Scope (${dashboardStats.subPercentageOfFee.toFixed(1)}%)`, card2X + 4, cardsY + 10);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 64, 175);
    doc.text(`${disciplineMetrics.totalSubFee.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${currency}`, card2X + 4, cardsY + 18);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(120, 130, 140);
    doc.text("AOR, Specialist consultants", card2X + 4, cardsY + 25);

    // CARD 3: Direct Procured Client Scope (Rose / Slate tint - Excluded)
    const card3X = card2X + cardWidth + 3;
    doc.setFillColor(254, 242, 242); // bg-rose-50
    doc.setDrawColor(254, 205, 205); // border-rose-200
    doc.roundedRect(card3X, cardsY, cardWidth, cardHeight, 2, 2, "DF");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(153, 27, 27); // text-rose-800
    doc.text("CLIENT TRADE SCOPE (EXCL.)", card3X + 4, cardsY + 6);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Procured by Client (${dashboardStats.clientPercentageOfFee.toFixed(1)}%)`, card3X + 4, cardsY + 10);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(153, 27, 27);
    doc.text(`${disciplineMetrics.totalClientFee.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${currency}`, card3X + 4, cardsY + 18);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(153, 27, 27);
    doc.text("MEPF, Structural (EXCLUDED)", card3X + 4, cardsY + 25);


    // COMBINED CONTRACT VALUE ACCENT CARD BELOW THE TRI-STATE GRID
    const proposedBannerY = cardsY + cardHeight + 4;
    doc.setFillColor(15, 23, 42); // slate-900 (XA corporate dark background)
    doc.roundedRect(14, proposedBannerY, pageWidth - 28, 15, 2, 2, "F");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(16, 185, 129); // emerald-400
    doc.text("TOTAL PROPOSED AGREEMENT CONTRACT FEE (XA Core + Subconsulted Scope)", 18, proposedBannerY + 6);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`${disciplineMetrics.totalProposedContractFee.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${currency}`, 18, proposedBannerY + 11.5);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    const bannerPercentText = `Proposed scope represents ${dashboardStats.proposedContractPercentageOfFee.toFixed(1)}% of standard baseline, excluding ${dashboardStats.clientPercentageOfFee.toFixed(1)}% (${disciplineMetrics.totalClientFee.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${currency}) for Client Trades.`;
    doc.text(bannerPercentText, pageWidth - 14 - 4, proposedBannerY + 9.5, { align: "right" });

    tableStartY = proposedBannerY + 22;

    // Table 2.1: Assets
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("3. SPECIFIED BUILDING ASSETS & ESTIMATED COSTS", 14, tableStartY);

    const assetHead = [['Asset Block / Building Name', 'Qty', `${areaMode} per Unit`, 'Rate / SqM', 'Construction Cost', 'Active Phase Scope']];
    const assetBody = calculatedMetrics.assetDetails.map(asset => {
      const activePhInitials = phases
        .filter(p => asset.activePhaseIds.includes(p.id))
        .map(p => shortName(p.name))
        .join(", ");

      return [
        asset.name,
        asset.quantity.toString(),
        `${asset.gfa.toLocaleString()} SqM`,
        `${asset.constructionRate.toLocaleString()} ${currency}`,
        `${asset.cost.toLocaleString()} ${currency}`,
        activePhInitials || 'None'
      ];
    });

    autoTable(doc, {
      head: assetHead,
      body: assetBody,
      startY: tableStartY + 3,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.5, font: "Helvetica", textColor: [30, 41, 59] },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 12, halign: 'center' },
        2: { cellWidth: 26, halign: 'right' },
        3: { cellWidth: 26, halign: 'right' },
        4: { cellWidth: 32, halign: 'right' },
        5: { cellWidth: 'auto', fontSize: 7 }
      }
    });

    // Table 2.2: Stage Pricing Allocations
    let nextStartY = (doc as any).lastAutoTable.finalY + 8;
    
    // Check if we need a page-break for Phase table to look clean
    let phaseTableStartY = nextStartY;
    if (phaseTableStartY > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      phaseTableStartY = 20;
    }

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("4. DESIGN PHASE PRICING ALLOCATION", 14, phaseTableStartY);

    const phaseHead = [['Design Stage / Specific Phase Name', 'Assigned Weight (%)', 'Calculated Allocation Stage Fee']];
    const phaseBody = calculatedMetrics.phaseBreakdown.map(b => [
      b.phaseName,
      `${b.phaseWeight}%`,
      `${b.allocatedFee.toLocaleString()} ${currency}`
    ]);

    autoTable(doc, {
      head: phaseHead,
      body: phaseBody,
      startY: phaseTableStartY + 3,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.5, font: "Helvetica", textColor: [30, 41, 59] },
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 110 },
        1: { cellWidth: 35, halign: 'center' },
        2: { cellWidth: 'auto', halign: 'right' }
      }
    });

    // Table 2.3: Discipline Allocations
    const nextDiscStartY = (doc as any).lastAutoTable.finalY + 8;
    let discTableStartY = nextDiscStartY;
    if (discTableStartY > doc.internal.pageSize.getHeight() - 65) {
      doc.addPage();
      discTableStartY = 20;
    }

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("5. DETAILED DISCIPLINE SCOPE ALLOCATION", 14, discTableStartY);

    const discHead = [['Scope Classification', 'Discipline Name', 'Allocation (%)', 'Allocated Design Fee Amount', 'Contract Status']];
    const discBody = disciplineMetrics.breakdown.map((b) => {
      let classification = "XA (In-house)";
      let statusRemark = "Included";
      if (b.responsibility === 'Subconsult') {
        classification = "Subconsulted";
        statusRemark = "Included";
      } else if (b.responsibility === 'Client') {
        classification = "By Client";
        statusRemark = "EXCLUDED";
      }

      return [
        classification,
        b.name,
        `${b.percentage.toFixed(1)}%`,
        `${b.allocatedFee.toLocaleString()} ${currency}`,
        statusRemark
      ];
    });

    autoTable(doc, {
      head: discHead,
      body: discBody,
      startY: discTableStartY + 3,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.5, font: "Helvetica", textColor: [30, 41, 59] },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 35, halign: 'center' },
        1: { cellWidth: 70 },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 'auto', halign: 'center' }
      },
      didParseCell: function (data) {
        // Apply pretty custom row styles depending on classification
        if (data.row.section === 'body') {
          const textVal = data.row.cells[0].text;
          const classification = Array.isArray(textVal) ? textVal.join(' ') : String(textVal || '');
          if (classification.includes('XA')) {
            data.cell.styles.fillColor = [240, 253, 244]; // Soft green
          } else if (classification.includes('Subconsulted')) {
            data.cell.styles.fillColor = [239, 246, 255]; // Soft blue
          } else if (classification.includes('Client')) {
            data.cell.styles.fillColor = [254, 242, 242]; // Soft rose
            data.cell.styles.textColor = [153, 27, 27];   // Deep red text
          }
        }
      }
    });

    // Summary Metric Footnotes / Signature Block
    const sumMetricsY = (doc as any).lastAutoTable.finalY + 8;
    let finalBoxY = sumMetricsY;
    if (finalBoxY > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      finalBoxY = 20;
    }

    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(14, finalBoxY, doc.internal.pageSize.getWidth() - 28, 18, 1, 1, "DF");

    // Display XA total and External totals side-by-side
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("XA NET IN-HOUSE CONTRACT VALUE", 18, finalBoxY + 6);
    doc.text("TOTAL PROPOSED CONTRACT VALUE (XA + SUBCONSULT)", doc.internal.pageSize.getWidth() / 2 + 10, finalBoxY + 6);

    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(`${disciplineMetrics.totalXaFee.toLocaleString()} ${currency} (${dashboardStats.xaPercentageOfFee.toFixed(1)}%)`, 18, finalBoxY + 12);
    
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.text(`${dashboardStats.totalProposedContractFee.toLocaleString()} ${currency} (${dashboardStats.proposedContractPercentageOfFee.toFixed(1)}%)`, doc.internal.pageSize.getWidth() / 2 + 10, finalBoxY + 12);

    // Footer signature / confidentiality stamp
    const finalY = finalBoxY + 24;
    if (finalY < doc.internal.pageSize.getHeight() - 15) {
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text("Classification: Commercial in Confidence. Calculations compiled top-down automatically via Estimator Suite Pro based on client specifications.", 14, finalY);
    }

    const sanitizedFilename = proposalName.replace(/[/\\?%*:|"<>]/g, "_") || "Top_Down";
    doc.save(`${sanitizedFilename}_pdf_estimate_report.pdf`);
    showNotification("Professional scope split estimation PDF generated successfully!", "success");
  };

  // Save or Archive Estimate to Backend Database
  const archiveEstimate = async () => {
    if (!proposalName.trim() || !clientName.trim()) {
      showNotification("Proposal Name and Client Name are required to archive an estimate.", "error");
      return;
    }

    const payload: TopDownCalculation = {
      projectId: selectedProjectId === "manual" ? null : selectedProjectId,
      clientName: clientName.trim(),
      proposalName: proposalName.trim(),
      proposalNumber: proposalNumber.trim(),
      submissionDate,
      phases,
      globalDesignFeePercentage,
      assets,
      disciplines,
      totalConstructionCost: calculatedMetrics.totalConstructionCost,
      totalDesignFee: calculatedMetrics.totalDesignFee,
      areaMode,
      plotArea: plotArea ? Number(plotArea) : undefined,
      far: far ? Number(far) : undefined,
      maxPlotCoverage: maxPlotCoverage ? Number(maxPlotCoverage) : undefined
    };

    try {
      let response;
      if (currentCalcId) {
        // Update existing calculation
        response = await fetch(`/api/top-down-calc/${currentCalcId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        // Create new calculation
        response = await fetch("/api/top-down-calc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (response.ok) {
        const result = await response.json();
        showNotification(
          currentCalcId ? "Estimation updated successfully!" : "Estimation archived successfully!",
          "success"
        );
        if (!currentCalcId && result.id) {
          setCurrentCalcId(Number(result.id));
        }
        // Refresh calculation list in background
        loadData();
      } else {
        showNotification("Failed to save calculation.", "error");
      }
    } catch (err) {
      console.error("Save error: ", err);
      showNotification("Failed to communicate with DB backend.", "error");
    }
  };

  // Load a Saved Calculation into Workspace
  const loadSavedCalculation = (calc: TopDownCalculation) => {
    setCurrentCalcId(calc.id || null);
    setSelectedProjectId(calc.projectId || "manual");
    setClientName(calc.clientName);
    setProposalName(calc.proposalName);
    setProposalNumber(calc.proposalNumber || "");
    setSubmissionDate(calc.submissionDate || "");
    setPhases(calc.phases);
    setGlobalDesignFeePercentage(calc.globalDesignFeePercentage);
    setAssets(calc.assets);
    const rawDisc = calc.disciplines && calc.disciplines.length > 0 ? calc.disciplines : DEFAULT_DISCIPLINES;
    const mappedDisc: Discipline[] = rawDisc.map((d: any) => {
      const resp: 'XA' | 'Subconsult' | 'Client' = (d.responsibility === "XA" || d.responsibility === "Subconsult" || d.responsibility === "Client")
        ? d.responsibility
        : (d.isXA ? "XA" : "Subconsult");
      return {
        ...d,
        responsibility: resp
      };
    });
    setDisciplines(sortDisciplines(mappedDisc));
    setAreaMode(calc.areaMode || "BUA");
    setPlotArea(calc.plotArea !== undefined && calc.plotArea !== null ? String(calc.plotArea) : "");
    setFar(calc.far !== undefined && calc.far !== null ? String(calc.far) : "");
    setMaxPlotCoverage(calc.maxPlotCoverage !== undefined && calc.maxPlotCoverage !== null ? String(calc.maxPlotCoverage) : "");
    setActiveTab("calculator");
    showNotification(`Loaded estimation: ${calc.proposalName}`, "success");
  };

  // Clear Form / Create New
  const startNewCalculation = () => {
    setCurrentCalcId(null);
    setSelectedProjectId("manual");
    setClientName("");
    setProposalName("");
    setProposalNumber("");
    setSubmissionDate("");
    setPhases(DEFAULT_PHASES);
    setGlobalDesignFeePercentage(2.35);
    setAreaMode("BUA");
    setAssets([]);
    setDisciplines(DEFAULT_DISCIPLINES);
    setPlotArea("");
    setFar("");
    setMaxPlotCoverage("");
    showNotification("Workspace cleared. Ready for new top-down calculation.", "success");
  };

  // Delete Estimation
  const deleteCalculation = async (calcId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Stop parent click load
    if (!confirm("Are you sure you want to permanently delete this archived pricing calculation?")) {
      return;
    }

    try {
      const response = await fetch(`/api/top-down-calc/${calcId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        setHistoricalCalcs(historicalCalcs.filter((c) => c.id !== calcId));
        if (currentCalcId === calcId) {
          startNewCalculation();
        }
        showNotification("Calculation deleted from historical archive.", "success");
      } else {
        showNotification("Failed to delete calculation from database.", "error");
      }
    } catch (err) {
      console.error("Delete error: ", err);
      showNotification("Error communicating with DB server.", "error");
    }
  };

  // Filtering calculations on Search keyword
  const filteredHistoricalCalcs = useMemo(() => {
    return historicalCalcs.filter((c) => {
      const query = historySearch.toLowerCase();
      return (
        c.proposalName.toLowerCase().includes(query) ||
        c.clientName.toLowerCase().includes(query) ||
        c.proposalNumber.toLowerCase().includes(query)
      );
    });
  }, [historicalCalcs, historySearch]);

  const shortName = (name: string) => {
    // Produce nice 2-3 char initials or short names for phases
    const words = name.split(" ");
    if (words.length === 1) return name.substring(0, 3).toUpperCase();
    return words.map((w) => w[0]).join("").substring(0, 3).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Top Title Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[var(--border)] pb-5 gap-4">
        <div>
          <h1 className="text-4xl font-light tracking-tight text-[var(--text-primary)] mb-2 flex items-center gap-3">
            <Calculator className="text-emerald-500 shrink-0" size={32} />
            TOP DOWN FEE CALCULATOR
          </h1>
          <p className="text-[var(--text-secondary)] font-mono text-xs uppercase tracking-wider">
            Architectural Design Estimation based on Project {areaMode} & Phase Weights
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-[var(--bg-tertiary)] p-1 rounded-xl border border-[var(--border)] w-full md:w-auto">
          <button
            onClick={() => setActiveTab("calculator")}
            className={cn(
              "flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all duration-300",
              activeTab === "calculator"
                ? "bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-md"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Calculator size={14} />
            Calculator Workspace
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all duration-300 relative",
              activeTab === "history"
                ? "bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-md"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Database size={14} />
            Calcs History
            {historicalCalcs.length > 0 && (
              <span className="ml-1 bg-emerald-500 text-white text-[10px] h-5 w-5 rounded-full flex items-center justify-center">
                {historicalCalcs.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Notifications bar */}
      {notification.type && (
        <div
          className={cn(
            "p-4 border text-sm rounded-lg flex items-center gap-3 animate-in fade-in duration-300",
            notification.type === "success"
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
              : "bg-red-500/10 text-red-500 border-red-500/20"
          )}
        >
          <div className="h-2 w-2 rounded-full bg-current animate-pulse shrink-0" />
          <span className="font-medium text-xs font-mono uppercase tracking-wide">
            {notification.message}
          </span>
        </div>
      )}

      {/* WORKSPACE TAB */}
      {activeTab === "calculator" && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          
          {/* Work Area Left (3 Cols) */}
          <div className="xl:col-span-3 space-y-6">
            
            {/* Project Selection & Auto-Fill Header Card */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-emerald-500/30">
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-5 pointer-events-none">
                <Briefcase size={120} />
              </div>

              <div className={cn(
                "flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4",
                !collapsedSections.projectSelection ? "mb-6 border-b border-[var(--border)] pb-5" : "pb-1"
              )}>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
                    <span className="p-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl shrink-0">
                      <Database size={18} />
                    </span>
                    Project Details
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Select an active RFP to auto-populate estimates or type custom parameters below
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                  {/* Premium Area Mode Selector Toggle */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono uppercase text-[var(--text-secondary)] font-bold">
                      Area Metric:
                    </span>
                    <div className="flex bg-slate-50 border border-slate-200/80 p-0.5 rounded-lg text-xs font-medium shadow-sm">
                      <button
                        type="button"
                        onClick={() => setAreaMode("BUA")}
                        className={cn(
                          "px-2.5 py-1 rounded-md transition-all text-[10px] font-bold uppercase cursor-pointer",
                          areaMode === "BUA"
                            ? "bg-amber-500 text-white shadow-sm"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        )}
                        title="Use Built-up Area"
                      >
                        BUA
                      </button>
                      <button
                        type="button"
                        onClick={() => setAreaMode("GFA")}
                        className={cn(
                          "px-2.5 py-1 rounded-md transition-all text-[10px] font-bold uppercase cursor-pointer",
                          areaMode === "GFA"
                            ? "bg-amber-500 text-white shadow-sm"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        )}
                        title="Use Gross Floor Area"
                      >
                        GFA
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-1 lg:flex-none">
                    <span className="text-[10px] font-mono uppercase text-[var(--text-secondary)] font-bold whitespace-nowrap">
                      RFP:
                    </span>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => handleProjectSelectChange(e.target.value)}
                      className="w-full lg:w-auto bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500 cursor-pointer min-w-[180px] shadow-sm transition-all"
                    >
                      <option value="manual">-- Manual/Custom Entry --</option>
                      {pipelineProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.rfpNumber || "RFP"}] {p.name} ({p.client})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Expand/Collapse Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setCollapsedSections(prev => ({ ...prev, projectSelection: !prev.projectSelection }))}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center cursor-pointer shrink-0"
                    title={collapsedSections.projectSelection ? "Expand" : "Collapse"}
                  >
                    {collapsedSections.projectSelection ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </button>
                </div>
              </div>

              <SectionContent isCollapsed={collapsedSections.projectSelection}>
                {/* Form Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[var(--text-secondary)] mb-1">
                      Proposal Number (RFP No.)
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-2.5 text-[var(--text-secondary)]" size={14} />
                      <input
                        type="text"
                        value={proposalNumber}
                        onChange={(e) => setProposalNumber(e.target.value)}
                        placeholder="e.g. P12048"
                        className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500 shadow-sm transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[var(--text-secondary)] mb-1">
                      Proposal Name
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-2.5 text-[var(--text-secondary)]" size={14} />
                      <input
                        type="text"
                        value={proposalName}
                        onChange={(e) => setProposalName(e.target.value)}
                        placeholder="e.g. RSG Resort Phase A"
                        className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500 shadow-sm transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[var(--text-secondary)] mb-1">
                      Client Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 text-[var(--text-secondary)]" size={14} />
                      <input
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="e.g. Emaar, Red Sea Global"
                        className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500 shadow-sm transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[var(--text-secondary)] mb-1">
                      Date of Submission
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 text-[var(--text-secondary)]" size={14} />
                      <input
                        type="date"
                        value={submissionDate}
                        onChange={(e) => setSubmissionDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500 shadow-sm transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Plot Parameters & Smart Shape Deduction */}
                <div className="border-t border-[var(--border)]/70 pt-5 mt-5">
                  <h3 className="text-xs font-mono uppercase text-[var(--text-secondary)] tracking-wider font-bold mb-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Plot Limits & Smart Shape Deduction Model
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Inputs side */}
                    <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-[var(--text-secondary)] mb-1">
                          Plot Area (SqM) <span className="text-[9px] text-[var(--text-secondary)] lowercase font-normal">(optional)</span>
                        </label>
                        <div className="relative">
                          <Compass className="absolute left-3 top-2.5 text-[var(--text-secondary)]" size={14} />
                          <input
                            type="number"
                            value={plotArea}
                            onChange={(e) => setPlotArea(e.target.value)}
                            placeholder="e.g. 12500"
                            min="0"
                            step="any"
                            className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500 shadow-sm transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-[var(--text-secondary)] mb-1">
                          FAR (Floor Area Ratio) <span className="text-[9px] text-[var(--text-secondary)] lowercase font-normal">(optional)</span>
                        </label>
                        <div className="relative">
                          <Layers className="absolute left-3 top-2.5 text-[var(--text-secondary)]" size={14} />
                          <input
                            type="number"
                            value={far}
                            onChange={(e) => setFar(e.target.value)}
                            placeholder="e.g. 3.5"
                            min="0"
                            step="0.05"
                            className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500 shadow-sm transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-[var(--text-secondary)] mb-1">
                          Max Plot Coverage % <span className="text-[9px] text-[var(--text-secondary)] lowercase font-normal">(optional)</span>
                        </label>
                        <div className="relative">
                          <Maximize2 className="absolute left-3 top-2.5 text-[var(--text-secondary)]" size={14} />
                          <input
                            type="number"
                            value={maxPlotCoverage}
                            onChange={(e) => setMaxPlotCoverage(e.target.value)}
                            placeholder="e.g. 40"
                            min="0"
                            max="100"
                            step="0.5"
                            className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500 shadow-sm transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Deduction Output Side */}
                    <div className="lg:col-span-6">
                      {plotArea && Number(plotArea) > 0 ? (
                        (() => {
                          const pArea = Number(plotArea) || 0;
                          const pFar = Number(far) || 0;
                          const pCov = Number(maxPlotCoverage) || 0;
                          const calcGfa = pArea * pFar;
                          const maxFootprint = pCov > 0 ? (pArea * (pCov / 100)) : 0;
                          
                          let deducedFloors = 1;
                          if (maxFootprint > 0 && calcGfa > 0) {
                            deducedFloors = Math.ceil(calcGfa / maxFootprint);
                          } else if (pFar > 0) {
                            // Assume 40% coverage standard if missing
                            deducedFloors = Math.ceil(pFar / 0.4);
                          }

                          const isTower = deducedFloors >= 5;

                          return (
                            <div className="bg-emerald-500/[0.02] border border-emerald-500/20 rounded-xl p-3.5 flex flex-col sm:flex-row gap-4 items-center justify-between">
                              <div className="flex items-center gap-3">
                                {/* Conceptual Volume Diagram wireframe */}
                                <div className="relative w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20 shrink-0">
                                  {isTower ? (
                                    <div className="flex flex-col gap-0.5 items-center justify-center w-6 h-10 border border-emerald-500/40 bg-emerald-500/5">
                                      <span className="w-4 h-0.5 bg-emerald-500/30" />
                                      <span className="w-4 h-0.5 bg-emerald-500/30" />
                                      <span className="w-4 h-0.5 bg-emerald-500/30" />
                                      <span className="w-4 h-0.5 bg-emerald-500/30" />
                                    </div>
                                  ) : (
                                    <div className="flex flex-col gap-0.5 items-center justify-center w-10 h-6 border border-emerald-500/40 bg-emerald-500/5">
                                      <span className="w-8 h-0.5 bg-emerald-500/30" />
                                      <span className="w-8 h-0.5 bg-emerald-500/30" />
                                    </div>
                                  )}
                                  <span className="absolute bottom-0 right-0 px-1 py-0.5 bg-emerald-600 text-[white] text-[7px] font-mono leading-none rounded-tl font-bold uppercase">
                                    {isTower ? "Tower" : "Horiz"}
                                  </span>
                                </div>

                                <div className="space-y-0.5">
                                  <span className="text-[9px] font-mono uppercase text-emerald-500 font-bold block leading-none">
                                    Deducted Building Volume Shape:
                                  </span>
                                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                                    {isTower ? (
                                      <span>Vertical Tower Building Shape</span>
                                    ) : (
                                      <span>Horizontal / Low-Rise Shape</span>
                                    )}
                                  </h4>
                                  <div className="text-[10px] text-[var(--text-secondary)] font-mono space-y-0.5">
                                    {pFar > 0 && (
                                      <div>Max Allowable GFA: <b className="text-[var(--text-primary)]">{calcGfa.toLocaleString()} SqM</b></div>
                                    )}
                                    {maxFootprint > 0 && (
                                      <div>Max Footprint Area: <b className="text-[var(--text-primary)]">{maxFootprint.toLocaleString()} SqM</b></div>
                                    )}
                                    <div>Deducted Floor Count: <b className="text-emerald-500">{deducedFloors} Stories</b></div>
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={handleAutoComposeAsset}
                                className="w-full sm:w-auto px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md shrink-0"
                              >
                                <Plus size={11} /> Compose Asset
                              </button>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="h-full min-h-[72px] flex items-center justify-center border border-dashed border-slate-200/80 rounded-xl px-4 py-3 bg-slate-50/50 text-center">
                          <p className="text-[10px] text-slate-400 font-mono">
                            Enter Plot Area above to activate real-time volume & shapely floor count deduction.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </SectionContent>
            </div>

            {/* Section 1: Global Parameters & Scope Setup */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-2xl">
              
              <div className={cn(
                "flex flex-col md:flex-row justify-between items-start md:items-center gap-4",
                !collapsedSections.phases ? "border-b border-[var(--border)] pb-4 mb-6" : ""
              )}>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
                    <span className="p-2 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-xl shrink-0">
                      <CheckSquare size={18} />
                    </span>
                    Design Phases
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    List standard phases, edit weights inline, or add custom phases matching bid specifications
                  </p>
                </div>

                {/* Scope inputs design percentage info box & Collapse Button */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                  <div className="flex items-center gap-2 bg-transparent border border-[var(--border)] px-4 py-2 rounded-xl text-xs text-[var(--text-secondary)] shadow-sm">
                    <span className="font-mono uppercase text-[10px] font-bold">
                      Global Design Fee %:
                    </span>
                    <span className="font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                      {globalDesignFeePercentage.toFixed(2)}%
                    </span>
                    <span className="text-[10px] italic">
                      (Adjustable in Sidebar)
                    </span>
                  </div>

                  {/* Expand/Collapse Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setCollapsedSections(prev => ({ ...prev, phases: !prev.phases }))}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center cursor-pointer shrink-0"
                    title={collapsedSections.phases ? "Expand" : "Collapse"}
                  >
                    {collapsedSections.phases ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </button>
                </div>
              </div>

              <SectionContent isCollapsed={collapsedSections.phases}>
                {/* Editing Table of Phases */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                  
                  {/* Custom Phase List Table replaced with high-quality list on clean white background */}
                  <div className="lg:col-span-2 space-y-2 bg-transparent">
                    {phases.map((phase, index) => {
                      const style = getPhaseStyle(index);
                      return (
                        <div 
                          key={phase.id} 
                          draggable 
                          onDragStart={(e) => handlePhaseDragStart(e, index)}
                          onDragOver={handlePhaseDragOver}
                          onDrop={(e) => handlePhaseDrop(e, index)}
                          className={cn(
                            "relative overflow-hidden group bg-white border border-[var(--border)]/60 rounded-xl p-3 pr-14 flex items-center justify-between gap-3 shadow-sm border-l-4 select-none hover:border-emerald-500/20 transition-all duration-200",
                            style.border,
                            draggedPhaseIndex === index && "opacity-40"
                          )}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span 
                              className="text-neutral-400 hover:text-emerald-500 cursor-grab active:cursor-grabbing p-1 shrink-0 transition-colors"
                              title="Drag to rearrange"
                            >
                              <GripVertical size={14} />
                            </span>
                            
                            <span className={cn("px-2.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 border font-mono", style.badge)}>
                              {phase.id.toUpperCase()}
                            </span>

                            <input
                              type="text"
                              value={phase.name}
                              onChange={(e) => updatePhaseName(phase.id, e.target.value)}
                              className="w-full bg-transparent border-none text-[var(--text-primary)] font-semibold focus:ring-0 focus:outline-none text-xs p-1"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase font-medium">Weight:</span>
                            <div className="flex items-center rounded-lg border border-[var(--border)] bg-slate-50 overflow-hidden pr-2">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="100"
                                value={phase.weight}
                                onChange={(e) => updatePhaseWeight(phase.id, e.target.value)}
                                className="w-14 bg-transparent border-0 text-center py-1.5 text-xs font-mono font-bold text-[var(--text-primary)] focus:outline-none focus:ring-0"
                              />
                              <span className="text-neutral-500 text-[10px] font-mono">%</span>
                            </div>
                          </div>

                          {/* Sliding Delete button behind */}
                          <button
                            type="button"
                            onClick={() => removePhase(phase.id)}
                            className="absolute right-0 top-0 bottom-0 w-12 bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-transform duration-300 ease-out translate-x-full group-hover:translate-x-0 cursor-pointer shadow-lg z-20"
                            title="Delete Design Phase"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Phase Utilities Panel */}
                  <div className="bg-transparent border border-[var(--border)] p-4 rounded-xl space-y-4 flex flex-col justify-between">
                    <div className="space-y-4">
                      <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--text-secondary)]">
                        Phase Utilities
                      </h4>

                      {/* Weight Sum warning indicator */}
                      <div className={cn(
                        "p-3 border rounded-lg space-y-1 text-xs",
                        totalPhaseWeightSum === 100
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      )}>
                        <div className="flex items-center justify-between font-mono font-bold">
                          <span>Total Weight:</span>
                          <span>{totalPhaseWeightSum}%</span>
                        </div>
                        {totalPhaseWeightSum !== 100 ? (
                          <p className="text-[10px] text-amber-500 mt-1 leading-normal">
                            <AlertTriangle className="inline mr-1" size={10} />
                            Ideal sum is exactly 100%. Normalize weights to automatically scale them proportionally.
                          </p>
                        ) : (
                          <p className="text-[10px] text-emerald-500 mt-1 leading-normal">
                            <Check className="inline mr-1" size={10} />
                            Active baseline weights sum matches 100% perfectly.
                          </p>
                        )}
                      </div>

                      {/* Proportional normalize trigger button */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={normalizePhasesTo100}
                          className="w-full bg-white hover:bg-slate-50 border border-[var(--border)] hover:border-emerald-500 text-xs font-bold uppercase tracking-wider p-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <RefreshCw size={12} />
                          Normalize
                        </button>
                        <button
                          onClick={resetPhasesToDefault}
                          className="w-full bg-white hover:bg-slate-50 border border-[var(--border)] hover:border-emerald-500 text-xs font-bold uppercase tracking-wider p-2 rounded-lg transition-all text-center cursor-pointer"
                        >
                          Reset Defaults
                        </button>
                      </div>
                    </div>

                    {/* Add Phase form */}
                    <div className="border-t border-[var(--border)] pt-4 space-y-3">
                      <h5 className="text-[10px] font-mono uppercase font-bold text-[var(--text-secondary)]">
                        Add Custom Design Phase
                      </h5>
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Phase Name (e.g. Site Supervision)"
                          value={newPhaseName}
                          onChange={(e) => setNewPhaseName(e.target.value)}
                          className="w-full bg-white border border-[var(--border)] rounded-lg p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center gap-2 bg-white border border-[var(--border)] rounded-lg p-2 text-xs">
                            <span className="text-[var(--text-secondary)] font-mono mr-1">Weight:</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={newPhaseWeight}
                              onChange={(e) => setNewPhaseWeight(Number(e.target.value) || 0)}
                              className="w-12 bg-transparent text-center font-bold focus:outline-none"
                            />
                            <span className="text-neutral-500">%</span>
                          </div>
                          <button
                            onClick={addCustomPhase}
                            className="bg-[var(--text-primary)] text-[var(--bg-primary)] h-9 px-4 rounded-lg text-xs font-bold uppercase transition-transform hover:scale-105 active:scale-95 shrink-0"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              </SectionContent>
            </div>

            {/* Detailed Executive Dashboard / Presentation Board */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-2xl relative overflow-hidden shadow-sm transition-all duration-300 hover:border-emerald-500/10">
              <div className={cn(
                "flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                !collapsedSections.analytics ? "border-b border-[var(--border)] pb-4 mb-6" : ""
              )}>
                <div>
                  <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <span className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg shrink-0">
                      <Calculator size={18} />
                    </span>
                    Executive Dashboard
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Real-time financial synthesis, target breakdowns, and scope mapping metrics
                  </p>
                </div>
                
                <div className="flex items-center gap-3 self-start sm:self-center">
                  {/* Global Badge indicating Active currency */}
                  <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold">
                    Currency: {currency}
                  </span>

                  {/* Expand/Collapse Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setCollapsedSections(prev => ({ ...prev, analytics: !prev.analytics }))}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center cursor-pointer shrink-0"
                    title={collapsedSections.analytics ? "Expand" : "Collapse"}
                  >
                    {collapsedSections.analytics ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </button>
                </div>
              </div>

              <SectionContent isCollapsed={collapsedSections.analytics}>
                <div className="space-y-6 pt-4">

              {/* Row 1: Key Metrics Bento Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Combined Area */}
                <div className="bg-transparent p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider block">
                    Total Portfolio {areaMode}
                  </span>
                  <div className="mt-2">
                    <span className="font-mono text-xl font-extrabold text-[var(--text-primary)]">
                      {dashboardStats.totalGfa.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium ml-1">SqM</span>
                  </div>
                  <span className="text-[9px] text-[var(--text-secondary)] mt-1.5 block">
                    Across {assets.length} active asset{assets.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Card 2: Avg Const. Rate */}
                <div className="bg-transparent p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider block">
                    Avg. Const. Cost Rate
                  </span>
                  <div className="mt-2 text-ellipsis overflow-hidden">
                    <span className="font-mono text-xl font-bold text-[var(--text-primary)]">
                      {dashboardStats.avgConstructionRate.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium ml-0.5">{currency}/SqM</span>
                  </div>
                  <span className="text-[9px] text-[var(--text-secondary)] mt-1.5 block">
                    Overall portfolio baseline
                  </span>
                </div>

                {/* Card 3: Design Fee per GFA */}
                <div className="bg-transparent p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider block">
                    Yield Rate (Fee/SqM)
                  </span>
                  <div className="mt-2">
                    <span className="font-mono text-xl font-bold text-emerald-500">
                      {dashboardStats.avgDesignFeePerSqM.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    </span>
                    <span className="text-[10px] text-emerald-500 font-medium ml-1">{currency}/SqM</span>
                  </div>
                  <span className="text-[9px] text-[var(--text-secondary)] mt-1.5 block">
                    Effective fee density
                  </span>
                </div>

                {/* Card 4: Effective Fee % */}
                <div className="bg-transparent p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider block">
                    Blended Design Fee Rate
                  </span>
                  <div className="mt-2">
                    <span className="font-mono text-xl font-bold text-emerald-500">
                      {dashboardStats.effectiveFeePercentage.toFixed(2)}%
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium ml-1">of Const. Cost</span>
                  </div>
                  <span className="text-[9px] text-[var(--text-secondary)] mt-1.5 block">
                    Target factor: {globalDesignFeePercentage.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Row 2: Graphical splits & asset contributions */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                {/* In-House XA vs External Consultant Split (7 cols) */}
                <div className="lg:col-span-7 bg-transparent p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--text-primary)]">
                      Scope Split (XA vs Subconsult vs Client Excl.)
                    </h4>
                    <span className="text-[10px] font-mono text-[var(--text-secondary)]">Discipline Allocation</span>
                  </div>

                  <div className="relative pt-1">
                    {/* Continuous triple progress bar */}
                    <div className="overflow-hidden h-4 text-xs flex rounded-full bg-slate-100 border border-[var(--border)]/60">
                      <div
                        style={{ width: `${dashboardStats.xaPercentageOfFee}%` }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                        title={`XA In-House: ${dashboardStats.xaPercentageOfFee.toFixed(1)}%`}
                      />
                      <div
                        style={{ width: `${dashboardStats.subPercentageOfFee}%` }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                        title={`Subconsulted: ${dashboardStats.subPercentageOfFee.toFixed(1)}%`}
                      />
                      <div
                        style={{ width: `${dashboardStats.clientPercentageOfFee}%` }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-rose-400 to-rose-500 transition-all duration-500 opacity-80"
                        title={`Direct by Client (Excluded): ${dashboardStats.clientPercentageOfFee.toFixed(1)}%`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
                    <div className="flex items-start gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                      <div>
                        <span className="text-[9px] font-mono text-[var(--text-secondary)] uppercase block font-bold">
                          XA In-House ({dashboardStats.xaPercentageOfFee.toFixed(1)}%)
                        </span>
                        <span className="font-mono font-bold text-emerald-500 text-sm">
                          {dashboardStats.totalXaFee.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-[10px]">{currency}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 border-t sm:border-t-0 sm:border-l border-[var(--border)] pt-2.5 sm:pt-0 sm:pl-4">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1 shrink-0" />
                      <div>
                        <span className="text-[9px] font-mono text-[var(--text-secondary)] uppercase block font-bold">
                          Subconsulted ({dashboardStats.subPercentageOfFee.toFixed(1)}%)
                        </span>
                        <span className="font-mono font-bold text-blue-500 text-sm">
                          {dashboardStats.totalSubFee.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-[10px]">{currency}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 border-t sm:border-t-0 sm:border-l border-[var(--border)] pt-2.5 sm:pt-0 sm:pl-4">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-400 mt-1 shrink-0" />
                      <div>
                        <span className="text-[9px] font-mono text-[var(--text-secondary)] uppercase block font-bold">
                          By Client (Excluded) ({dashboardStats.clientPercentageOfFee.toFixed(1)}%)
                        </span>
                        <span className="font-mono font-bold text-rose-500 dark:text-rose-400 text-sm">
                          {dashboardStats.totalClientFee.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-[10px]">{currency}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Asset Cost Contribution visual list (5 cols) */}
                <div className="lg:col-span-5 bg-transparent p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--text-primary)] mb-2">
                      Fee Contribution by Asset/Building
                    </h4>
                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                      {calculatedMetrics.assetDetails.length === 0 ? (
                        <div className="text-center text-xs text-[var(--text-secondary)] py-4">No assets defined.</div>
                      ) : (
                        calculatedMetrics.assetDetails.map((assetDetail) => {
                          const assetTotalFee = assetDetail.designFee;
                          const percentageOfTotal = calculatedMetrics.totalDesignFee > 0 
                            ? (assetTotalFee / calculatedMetrics.totalDesignFee) * 100 
                            : 0;
                          return (
                            <div key={assetDetail.id} className="space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-medium text-[var(--text-primary)] truncate max-w-[150px]">{assetDetail.name}</span>
                                <span className="font-mono text-[var(--text-secondary)] font-bold">
                                  {assetTotalFee.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency} ({percentageOfTotal.toFixed(0)}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1">
                                <div
                                  style={{ width: `${percentageOfTotal}%` }}
                                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SectionContent>
        </div>

            {/* Section 2: Building Assets Mapping */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-2xl">
              
              <div className={cn(
                "flex flex-col md:flex-row justify-between items-start md:items-center gap-4",
                !collapsedSections.assets ? "border-b border-[var(--border)] pb-4 mb-6" : ""
              )}>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
                    <span className="p-2 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-xl shrink-0">
                      <Building size={18} />
                    </span>
                    Assest
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Map individual buildings or areas to their respective active scope phases (click phase codes to toggle)
                  </p>
                </div>

                {/* Expand/Collapse Toggle Button */}
                <button
                  type="button"
                  onClick={() => setCollapsedSections(prev => ({ ...prev, assets: !prev.assets }))}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center cursor-pointer shrink-0 self-end md:self-center"
                  title={collapsedSections.assets ? "Expand" : "Collapse"}
                >
                  {collapsedSections.assets ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </button>
              </div>

              <SectionContent isCollapsed={collapsedSections.assets}>
                <div className="space-y-6 pt-4">
                  {/* Table of active buildings */}
                  <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs min-w-[900px]">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 font-mono text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Building Name</th>
                      <th className="px-4 py-3 text-center w-16">Qty</th>
                      <th className="px-4 py-3 text-right w-24">Unit Area ({areaMode})</th>
                      <th className="px-4 py-3 text-right w-24">Rate / SqM ({currency})</th>
                      <th className="px-4 py-3 text-right w-28">Construction Cost ({currency})</th>
                      <th className="px-4 py-3 text-center w-[220px]">Scope Phases</th>
                      <th className="px-4 py-3 text-right w-32">Design Fee ({currency})</th>
                      <th className="px-4 py-3 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {assets.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-xs text-slate-400 font-mono">
                          No specified building assets. Click "+ Add New Building Asset Row" below to begin.
                        </td>
                      </tr>
                    ) : (
                      assets.map((asset) => {
                        const cost = asset.quantity * asset.gfa * asset.constructionRate;
                      
                      // Calculate individual asset design fee contribution
                      const activePhasesSumWeight = phases
                        .filter((p) => asset.activePhaseIds.includes(p.id))
                        .reduce((sum, p) => sum + p.weight, 0);
                      const assetDesignFee = cost * (globalDesignFeePercentage / 100) * (activePhasesSumWeight / 100);

                      return (
                        <tr key={asset.id} className="hover:bg-slate-50/60 transition-all">
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={asset.name}
                              onChange={(e) => updateAssetField(asset.id, "name", e.target.value)}
                              className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-emerald-500 focus:bg-slate-50/30 rounded px-1 py-0.5 focus:outline-none text-xs font-semibold text-slate-800 transition-all"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={asset.quantity}
                              onChange={(e) => updateAssetField(asset.id, "quantity", Number(e.target.value) || 1)}
                              className="w-12 bg-transparent text-center border-b border-transparent hover:border-slate-200 focus:border-emerald-500 focus:bg-slate-50/30 rounded py-0.5 focus:outline-none text-xs font-mono font-medium text-slate-800 transition-all"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="500"
                              value={asset.gfa}
                              onChange={(e) => updateAssetField(asset.id, "gfa", Number(e.target.value) || 0)}
                              className="w-24 bg-transparent text-right border-b border-transparent hover:border-slate-200 focus:border-emerald-500 focus:bg-slate-50/30 rounded px-1 py-0.5 focus:outline-none text-xs font-mono font-medium text-slate-800 transition-all"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="250"
                              value={asset.constructionRate}
                              onChange={(e) => updateAssetField(asset.id, "constructionRate", Number(e.target.value) || 0)}
                              className="w-24 bg-transparent text-right border-b border-transparent hover:border-slate-200 focus:border-emerald-500 focus:bg-slate-50/30 rounded px-1 py-0.5 focus:outline-none text-xs font-mono font-bold text-emerald-600 transition-all"
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">
                            {cost.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            {/* Clickable toggle badges of phases */}
                            <div className="flex flex-wrap gap-1 justify-center max-w-[210px] mx-auto">
                              {phases.map((phase) => {
                                const isActive = asset.activePhaseIds.includes(phase.id);
                                return (
                                  <button
                                    key={phase.id}
                                    onClick={() => toggleAssetPhaseScope(asset.id, phase.id)}
                                    className={cn(
                                      "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider transition-colors border cursor-pointer",
                                      isActive 
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100/60" 
                                        : "bg-slate-50 text-slate-400 border-slate-200/60 hover:bg-slate-100/60"
                                    )}
                                    title={`Toggle phase: ${phase.name} (${phase.weight}%)`}
                                  >
                                    {shortName(phase.name)}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-extrabold text-emerald-500">
                            {assetDesignFee.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => removeAsset(asset.id)}
                              className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors cursor-pointer"
                              title="Remove Asset"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </div>

              {/* Clean, lightweight modern trigger to add data directly inside the table */}
              <button
                type="button"
                onClick={addEmptyAsset}
                className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-slate-200 hover:border-emerald-500/50 hover:bg-emerald-50/[0.03] text-slate-500 hover:text-emerald-600 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md mt-4"
              >
                <Plus size={14} className="text-emerald-500" /> Add New Building Asset Row
              </button>
            </div>
          </SectionContent>
        </div>

             {/* Section 3: Disciplines */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-2xl shadow-sm">
              <div className={cn(
                "flex flex-col lg:flex-row lg:items-center justify-between gap-4",
                !collapsedSections.disciplines ? "border-b border-[var(--border)] pb-4 mb-6" : ""
              )}>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
                    <span className="p-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl shrink-0">
                      <Briefcase size={18} />
                    </span>
                    Fee Allocation
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Distribute the total design fee ({calculatedMetrics.totalDesignFee.toLocaleString()} {currency}) across disciplines.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setDisciplines(DEFAULT_DISCIPLINES);
                      showNotification("All 25 default disciplines loaded with standard weights (100% total).", "success");
                    }}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-500 hover:text-amber-600 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                    title="Include all 25 standard disciplines automatically with default percentages summing to 100%"
                  >
                    <RefreshCw size={13} className="animate-spin-slow" />
                    Include All Default Disciplines
                  </button>

                  {/* Proposed Contract Fee Header Box */}
                  <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl text-right">
                    <span className="text-[10px] font-mono uppercase text-emerald-500 block font-bold leading-none mb-1">
                      Proposed Agreement Value (XA + SUB)
                    </span>
                    <span className="font-mono text-base font-bold text-emerald-500">
                      {disciplineMetrics.totalProposedContractFee.toLocaleString()} <span className="text-[10px]">{currency}</span>
                    </span>
                  </div>

                  {/* Expand/Collapse Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setCollapsedSections(prev => ({ ...prev, disciplines: !prev.disciplines }))}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center cursor-pointer shrink-0 self-end lg:self-center"
                    title={collapsedSections.disciplines ? "Expand" : "Collapse"}
                  >
                    {collapsedSections.disciplines ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </button>
                </div>
              </div>

              <SectionContent isCollapsed={collapsedSections.disciplines}>
                <div className="space-y-6 pt-4">

              {/* Warnings and summary totals - Sleek Bento Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-transparent p-4 flex flex-col justify-between">
                  <span className="text-[9px] font-mono text-[var(--text-secondary)] uppercase font-bold tracking-wider">
                    Total Allocation Percentage
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className={cn(
                      "font-mono text-xl font-black",
                      Math.abs(disciplineMetrics.totalPercentage - 100) < 0.01 ? "text-emerald-500" : "text-amber-500"
                    )}>
                      {disciplineMetrics.totalPercentage.toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)]">of 100%</span>
                  </div>
                  <span className="text-[9px] text-[var(--text-secondary)] mt-1 block">Must total exactly 100%</span>
                </div>

                <div className="bg-green-500/[0.03] p-4 rounded-xl border border-green-500/10 flex flex-col justify-between">
                  <span className="text-[9px] font-mono text-green-500 dark:text-green-400 uppercase font-bold tracking-wider">
                    XA In-House Portion (Core)
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="font-mono text-xl font-black text-green-500 dark:text-green-400">
                      {disciplineMetrics.totalXaFee.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-green-500/80">{currency}</span>
                  </div>
                  <span className="text-[9px] text-[var(--text-secondary)] mt-1 block">
                    {calculatedMetrics.totalDesignFee > 0 ? ((disciplineMetrics.totalXaFee / calculatedMetrics.totalDesignFee) * 100).toFixed(1) : "0.0"}% of baseline
                  </span>
                </div>

                <div className="bg-blue-500/[0.03] p-4 rounded-xl border border-blue-500/10 flex flex-col justify-between">
                  <span className="text-[9px] font-mono text-blue-500 dark:text-blue-400 uppercase font-bold tracking-wider">
                    Subconsulted Portion
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="font-mono text-xl font-black text-blue-500 dark:text-blue-400">
                      {disciplineMetrics.totalSubFee.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-blue-500/80">{currency}</span>
                  </div>
                  <span className="text-[9px] text-[var(--text-secondary)] mt-1 block">
                    {calculatedMetrics.totalDesignFee > 0 ? ((disciplineMetrics.totalSubFee / calculatedMetrics.totalDesignFee) * 100).toFixed(1) : "0.0"}% of baseline
                  </span>
                </div>

                <div className="bg-rose-500/[0.03] p-4 rounded-xl border border-rose-500/10 flex flex-col justify-between">
                  <span className="text-[9px] font-mono text-rose-500 dark:text-rose-400 uppercase font-bold tracking-wider">
                    By Client (Excluded)
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="font-mono text-xl font-black text-rose-500 dark:text-rose-400">
                      {disciplineMetrics.totalClientFee.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-rose-500/80">{currency}</span>
                  </div>
                  <span className="text-[9px] text-rose-500 dark:text-rose-400 mt-1 block">
                    {calculatedMetrics.totalDesignFee > 0 ? ((disciplineMetrics.totalClientFee / calculatedMetrics.totalDesignFee) * 100).toFixed(1) : "0.0"}% of baseline
                  </span>
                </div>
              </div>

              {Math.abs(disciplineMetrics.totalPercentage - 100) > 0.01 && (
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-[11px] text-amber-500">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>The combined discipline percentages currently sum up to <strong>{disciplineMetrics.totalPercentage.toFixed(1)}%</strong>. For a full allocation, the sum should equal 100.0%.</span>
                </div>
              )}

              {/* Disciplines Grid list */}
              <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-transparent">
                <div className="grid grid-cols-12 gap-2 bg-[var(--bg-secondary)] border-b border-[var(--border)] p-3 text-[10px] font-mono text-[var(--text-secondary)] uppercase select-none font-bold pr-14">
                  <div className="col-span-4 text-center">Responsibility Split (Slide)</div>
                  <div className="col-span-4">Discipline Name</div>
                  <div className="col-span-2 text-center">Percentage (%)</div>
                  <div className="col-span-2 text-right font-mono pr-4">Allocated Fee</div>
                </div>

                <div className="divide-y divide-[var(--border)] max-h-[420px] overflow-y-auto">
                  {disciplineMetrics.breakdown.length === 0 ? (
                    <div className="p-10 text-center flex flex-col items-center justify-center gap-4 bg-transparent">
                      <div className="text-xs text-[var(--text-secondary)] font-medium max-w-sm">
                        No disciplines declared. You can add them one-by-one below, or initialize with all 25 default disciplines to make precisely 100%.
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDisciplines(DEFAULT_DISCIPLINES);
                          showNotification("Loaded all standard disciplines (100% split).", "success");
                        }}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm hover:shadow-md flex items-center gap-2"
                      >
                        <RefreshCw size={14} />
                        Load All Default Disciplines (100% Split)
                      </button>
                    </div>
                  ) : (
                    disciplineMetrics.breakdown.map((disc, index) => {
                      const activeResp = disc.responsibility || (disc.isXA ? "XA" : "Subconsult");
                      return (
                        <div
                          key={disc.id}
                          draggable
                          onDragStart={(e) => handleDisciplineDragStart(e, index)}
                          onDragOver={handleDisciplineDragOver}
                          onDrop={(e) => handleDisciplineDrop(e, index)}
                          className={cn(
                            "grid grid-cols-12 gap-2 p-3 items-center text-xs transition-all duration-200 group relative overflow-hidden pr-14 select-none hover:bg-[var(--bg-primary)]/40",
                            activeResp === "XA" && "bg-emerald-500/[0.08] border-l-4 border-emerald-500",
                            activeResp === "Subconsult" && "bg-blue-500/[0.08] border-l-4 border-blue-500",
                            activeResp === "Client" && "bg-rose-500/[0.04] border-l-4 border-rose-400 dark:border-rose-900 opacity-75",
                            draggedDisciplineIndex === index && "opacity-40 bg-[var(--bg-tertiary)]"
                          )}
                        >
                          {/* Scope sliding select Column */}
                          <div className="col-span-4 flex items-center gap-2">
                            <span 
                              className="text-neutral-400 cursor-grab active:cursor-grabbing p-1 shrink-0 hover:text-emerald-500 transition-colors"
                              title="Drag to rearrange"
                            >
                              <GripVertical size={13} />
                            </span>
                            
                            {/* Sliding iOS Style Pill Segments */}
                            <div className="relative flex items-center bg-slate-200 dark:bg-slate-800 p-0.5 rounded-full border border-slate-300 dark:border-slate-700 h-7 w-[114px] text-[8.5px] font-black uppercase select-none shrink-0 shadow-inner">
                              <button
                                type="button"
                                onClick={() => updateDiscipline(disc.id, { responsibility: "XA" })}
                                className={cn(
                                  "z-10 flex-1 text-center h-full flex items-center justify-center rounded-full transition-colors duration-200 cursor-pointer",
                                  activeResp === "XA" ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                                )}
                                title="XA In-House core service"
                              >
                                XA
                              </button>
                              <button
                                type="button"
                                onClick={() => updateDiscipline(disc.id, { responsibility: "Subconsult" })}
                                className={cn(
                                  "z-10 flex-1 text-center h-full flex items-center justify-center rounded-full transition-colors duration-200 cursor-pointer",
                                  activeResp === "Subconsult" ? "text-blue-600 dark:text-blue-400 font-extrabold" : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                                )}
                                title="Subconsulted specialist trade"
                              >
                                SUB
                              </button>
                              <button
                                type="button"
                                onClick={() => updateDiscipline(disc.id, { responsibility: "Client" })}
                                className={cn(
                                  "z-10 flex-1 text-center h-full flex items-center justify-center rounded-full transition-colors duration-200 cursor-pointer",
                                  activeResp === "Client" ? "text-rose-600 dark:text-rose-400 font-extrabold" : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                                )}
                                title="By Client (Excluded from Contract)"
                              >
                                CLT
                              </button>

                              {/* Sliding pill container background indicator */}
                              <div 
                                className={cn(
                                  "absolute top-[1.5px] bottom-[1.5px] left-[1.5px] rounded-full transition-all duration-200 ease-out shadow bg-white dark:bg-slate-900 border",
                                  activeResp === "XA" && "w-[36px] translate-x-0 border-emerald-500/20",
                                  activeResp === "Subconsult" && "w-[36px] translate-x-[36px] border-blue-500/20",
                                  activeResp === "Client" && "w-[36px] translate-x-[72px] border-rose-500/20"
                                )}
                              />
                            </div>
                          </div>

                          {/* Discipline Name column */}
                          <div className="col-span-4">
                            <input
                              type="text"
                              value={disc.name}
                              onChange={(e) => updateDiscipline(disc.id, { name: e.target.value })}
                              className={cn(
                                "bg-transparent border border-transparent hover:border-[var(--border)] focus:border-emerald-500 focus:bg-[var(--bg-primary)] focus:outline-none rounded-lg text-xs font-semibold w-full py-1.5 px-2 transition-all",
                                activeResp === "Client" ? "line-through text-neutral-400 font-normal italic" : "text-[var(--text-primary)]"
                              )}
                            />
                          </div>

                          {/* Percentage edit column */}
                          <div className="col-span-2 flex justify-center">
                            <div className="relative rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--bg-primary)] flex items-center pr-2">
                              <DisciplinePercentageInput
                                step={0.5}
                                value={disc.percentage}
                                onChange={(val) => updateDiscipline(disc.id, { percentage: val })}
                              />
                              <span className="text-[10px] text-[var(--text-secondary)] font-bold">%</span>
                            </div>
                          </div>

                          {/* Allocated Fee Readout Column */}
                          <div className="col-span-2 text-right font-mono text-xs pr-4">
                            <span className={cn(
                              "font-bold",
                              activeResp === "XA" && "text-green-500",
                              activeResp === "Subconsult" && "text-blue-500",
                              activeResp === "Client" && "text-rose-500 dark:text-rose-400 line-through opacity-70"
                            )}>
                              {disc.allocatedFee.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                          </div>

                          {/* iOS Slide-in Action delete button behind or right-aligned on hover */}
                          <button
                            type="button"
                            onClick={() => removeDiscipline(disc.id)}
                            className="absolute right-0 top-0 bottom-0 w-12 bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-transform duration-300 ease-out translate-x-full group-hover:translate-x-0 cursor-pointer shadow-lg z-20"
                            title="Delete Discipline"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Form Add New Discipline */}
              <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-4 rounded-xl space-y-3">
                <h4 className="text-[10px] font-mono uppercase text-[var(--text-secondary)] tracking-wider font-bold">
                  Add Custom Discipline
                </h4>
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-[9px] font-mono uppercase text-[var(--text-secondary)] mb-1">
                      Discipline Title / Team Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Acoustic Consultant, Lighting Expert, Signage Designer"
                      value={newDisciplineName}
                      onChange={(e) => setNewDisciplineName(e.target.value)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={addDiscipline}
                    className="w-full sm:w-auto bg-[var(--text-primary)] text-[var(--bg-primary)] h-9 px-5 rounded-lg text-xs font-bold uppercase transition-transform hover:scale-105 active:scale-[0.97] flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shrink-0"
                  >
                    <Plus size={14} /> Add Discipline
                  </button>
                </div>
              </div>
            </div>
          </SectionContent>
        </div>

          </div>

          {/* Right Work Area: Section 3: Summary Dashboard & Phase Fees (1 Col) */}
          <div className="xl:col-span-1 space-y-6">
            
            {/* Design Fees Calculation Dashboard Card */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between select-none">
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-5 pointer-events-none">
                <Calculator size={100} />
              </div>

              <div className="border-b border-[var(--border)] pb-4 mb-6">
                <h3 className="text-sm font-mono uppercase tracking-wider font-bold text-[var(--text-secondary)]">
                  Total Design Fee Summary
                </h3>
              </div>

              <div className="space-y-6">
                
                {/* Construction cost sum */}
                <div>
                  <span className="text-[10px] font-mono uppercase text-[var(--text-secondary)]">
                    Est. Total Construction Cost
                  </span>
                  <p className="text-2xl font-semibold text-[var(--text-primary)] mt-1 tracking-tight">
                    {calculatedMetrics.totalConstructionCost.toLocaleString()}{" "}
                    <span className="text-xs text-[var(--text-secondary)]">{currency}</span>
                  </p>
                </div>

                {/* Applied Global design percentage badge - Interactive in Sidebar */}
                <div className="flex flex-col gap-2 bg-white border border-emerald-500/20 p-3.5 rounded-xl my-2 shadow-sm">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)] font-medium">Design Fee Factor:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="25"
                      step="0.01"
                      value={globalDesignFeePercentage}
                      onChange={(e) => setGlobalDesignFeePercentage(Number(e.target.value) || 0)}
                      className="flex-1 accent-emerald-500 cursor-pointer h-1 bg-slate-100 rounded-lg appearance-none"
                    />
                    <div className="flex items-center bg-white border border-[var(--border)] rounded-xl p-1 shrink-0 gap-1 shadow-sm select-none">
                      <button
                        type="button"
                        onClick={() => setGlobalDesignFeePercentage(prev => Math.max(0, Number((prev - 0.05).toFixed(2))))}
                        className="text-emerald-500 hover:text-white bg-emerald-500/10 hover:bg-emerald-500 w-6 h-6 flex items-center justify-center rounded-lg transition-all font-bold cursor-pointer text-sm"
                        title="Decrease by 0.05%"
                      >
                        -
                      </button>
                      
                      <div className="flex items-center px-1">
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          max="100"
                          value={parseFloat(globalDesignFeePercentage.toFixed(2)) || 0}
                          onChange={(e) => setGlobalDesignFeePercentage(Number(e.target.value) || 0)}
                          className="w-12 bg-transparent text-center font-mono font-bold text-xs text-emerald-500 focus:outline-none p-0 border-0 h-5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-emerald-500/80 text-[10px] font-bold font-mono">%</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setGlobalDesignFeePercentage(prev => Math.min(100, Number((prev + 0.05).toFixed(2))))}
                        className="text-emerald-500 hover:text-white bg-emerald-500/10 hover:bg-emerald-500 w-6 h-6 flex items-center justify-center rounded-lg transition-all font-bold cursor-pointer text-sm"
                        title="Increase by 0.05%"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Summed Design Fee */}
                <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-2xl">
                  <span className="text-[10px] font-mono uppercase text-emerald-500 font-bold block mb-1">
                    Calculated Architectural Design Fee
                  </span>
                  <p className="text-4xl font-light text-emerald-500 tracking-tight font-sans">
                    {calculatedMetrics.totalDesignFee.toLocaleString()}{" "}
                    <span className="text-xs font-medium uppercase font-mono">{currency}</span>
                  </p>
                  
                  {/* Avg rate per area */}
                  {avgFeePerAreaElement}
                </div>

                {/* Phase breakdown lists */}
                <div className="border-t border-[var(--border)] pt-4 space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--text-secondary)]">
                    Phase-By-Phase Allocation
                  </h4>

                  <div className="space-y-0.5 bg-white border border-[var(--border)]/50 rounded-2xl p-4 shadow-sm">
                    {calculatedMetrics.phaseBreakdown.map((breakdown, idx) => {
                      const style = getPhaseStyle(idx);
                      return (
                        <div
                          key={breakdown.phaseId}
                          className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0 text-xs bg-white"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {/* Same highlighted color dot / badge used in the main phases view */}
                            <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 border font-mono", style.badge)}>
                              {breakdown.phaseId.toUpperCase()}
                            </span>
                            <div className="space-y-0.5 min-w-0 flex-1">
                              <p className="font-semibold text-[var(--text-primary)] truncate text-xs" title={breakdown.phaseName}>
                                {breakdown.phaseName}
                              </p>
                              <span className="text-[9px] font-mono text-[var(--text-secondary)]">
                                Weight: {breakdown.phaseWeight}%
                              </span>
                            </div>
                          </div>
                          <div className="text-right ml-4 shrink-0 font-mono">
                            <span className="font-bold text-[var(--text-primary)]">
                              {breakdown.allocatedFee.toLocaleString()}
                            </span>
                            <span className="text-[9px] text-[var(--text-secondary)] ml-1">
                              {currency}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
              
              {/* Export Utilities Panel */}
              <div className="border-t border-[var(--border)] pt-5 mt-6 space-y-2">
                <h4 className="text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--text-secondary)] mb-2">
                  Export Pricing Reports
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={exportToPDF}
                    className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-[var(--text-primary)] border border-[var(--border)] hover:border-emerald-500/50 text-xs font-bold uppercase tracking-wider py-2.5 px-3 rounded-xl transition-all cursor-pointer shadow-sm"
                    title="Generate professional PDF summary report"
                  >
                    <FileText size={14} className="text-red-500 shrink-0" />
                    <span>PDF Doc</span>
                  </button>
                  <button
                    onClick={exportToExcel}
                    className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-[var(--text-primary)] border border-[var(--border)] hover:border-emerald-500/50 text-xs font-bold uppercase tracking-wider py-2.5 px-3 rounded-xl transition-all cursor-pointer shadow-sm"
                    title="Export financial analysis spreadsheet model"
                  >
                    <FileSpreadsheet size={14} className="text-emerald-500 shrink-0" />
                    <span>Excel Model</span>
                  </button>
                </div>
              </div>

              {/* Archive and Clear triggers */}
              <div className="border-t border-[var(--border)] pt-5 mt-6 space-y-3">
                <button
                  onClick={archiveEstimate}
                  className="w-full bg-emerald-500 text-white font-bold uppercase tracking-wider py-3 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-lg flex items-center justify-center gap-2 hover:bg-emerald-600"
                >
                  <Save size={16} />
                  {currentCalcId ? "Update Saved Estimate" : "Archive Pricing Calculation"}
                </button>

                {currentCalcId && (
                  <button
                    onClick={startNewCalculation}
                    className="w-full bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-bold uppercase py-2 text-center transition-colors border border-dashed border-[var(--border)] hover:border-[var(--text-secondary)] rounded-xl"
                  >
                    Clear & Start New Estimate
                  </button>
                )}
              </div>

            </div>

          </div>

        </div>
      )}

      {/* HISTORICAL ARCHIVE TAB */}
      {activeTab === "history" && (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-2xl space-y-6">
          
          {/* Top panel with Search keyword input */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-lg font-light text-[var(--text-primary)] flex items-center gap-2">
                <FolderOpen size={18} className="text-emerald-500" />
                Archived Estimations List
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Browse, view, modify, or delete previously archived project top-down calculations
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 text-[var(--text-secondary)]" size={14} />
              <input
                type="text"
                placeholder="Search by RFP Name, Client..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Historical List table view */}
          {isLoadingHistory ? (
            <div className="text-center py-12 text-[var(--text-secondary)] text-xs font-mono">
              <RefreshCw className="animate-spin inline mr-2" size={16} />
              FETCHING ARCHIVED PRICE CALCULATIONS...
            </div>
          ) : filteredHistoricalCalcs.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-[var(--border)] rounded-xl bg-[var(--bg-primary)] p-6">
              <FileText className="mx-auto text-neutral-600 mb-4" size={40} />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">No Calculations Found</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-md mx-auto">
                No estimation history matches your query or no records have been saved yet. Use the workspace tab to create your first top-down calculations.
              </p>
              <button
                onClick={() => setActiveTab("calculator")}
                className="mt-4 inline-flex items-center gap-2 bg-[var(--text-primary)] text-[var(--bg-primary)] px-4 py-2 rounded-lg text-xs font-bold uppercase transition-transform hover:scale-105 active:scale-95"
              >
                Go to Workspace
              </button>
            </div>
          ) : (
            <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--bg-primary)]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border)] font-mono text-[10px] uppercase text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-5 py-3 w-16 text-center">ID</th>
                    <th className="px-5 py-3">Proposal Name</th>
                    <th className="px-5 py-3">Client</th>
                    <th className="px-5 py-3">RFP No.</th>
                    <th className="px-5 py-3 text-right">Fee %</th>
                    <th className="px-5 py-3 text-right">Total Construct Cost ({currency})</th>
                    <th className="px-5 py-3 text-right">Calculated Design Fee ({currency})</th>
                    <th className="px-5 py-3 text-center">Submission Date</th>
                    <th className="px-5 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredHistoricalCalcs.map((calc) => (
                    <tr
                      key={calc.id}
                      onClick={() => loadSavedCalculation(calc)}
                      className="hover:bg-[var(--bg-tertiary)] group cursor-pointer transition-colors"
                      title="Click to load this estimation into the workspace"
                    >
                      <td className="px-5 py-4 text-center font-mono text-[10px] text-[var(--text-secondary)]">
                        #{calc.id}
                      </td>
                      <td className="px-5 py-4 font-semibold text-[var(--text-primary)] text-xs flex items-center gap-2">
                        <span>{calc.proposalName}</span>
                        {calc.projectId && (
                          <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[8px] font-bold uppercase tracking-wider px-1 rounded">
                            Linked RFP
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-[var(--text-secondary)]">{calc.clientName}</td>
                      <td className="px-5 py-4 font-mono font-medium text-[var(--text-secondary)]">
                        {calc.proposalNumber || "--"}
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-medium text-[var(--text-secondary)]">
                        {calc.globalDesignFeePercentage.toFixed(2)}%
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-[var(--text-primary)]">
                        {calc.totalConstructionCost.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-emerald-500">
                        {calc.totalDesignFee.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-center font-mono text-[var(--text-secondary)] text-[10px]">
                        {calc.submissionDate || "--"}
                      </td>
                      <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => loadSavedCalculation(calc)}
                            className="bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg text-[var(--text-primary)] transition-all flex items-center gap-1"
                          >
                            <Edit2 size={10} /> Load workspace
                          </button>
                          <button
                            onClick={(e) => deleteCalculation(calc.id!, e)}
                            className="text-neutral-500 hover:text-red-500 p-1.5 rounded-lg border border-transparent hover:border-red-500/10 hover:bg-red-500/5 transition-colors"
                            title="Delete archived calculation"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
