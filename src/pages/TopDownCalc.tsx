import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Calculator, 
  Plus, 
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
  { id: "disc-1", name: "Architecture", percentage: 45.0, isXA: true },
  { id: "disc-2", name: "Project Management", percentage: 5.0, isXA: true },
  { id: "disc-3", name: "Interior Design", percentage: 9.0, isXA: true },
  { id: "disc-4", name: "AOR", percentage: 0.0, isXA: false },
  { id: "disc-5", name: "Landscape & Irrigation", percentage: 3.0, isXA: false },
  { id: "disc-6", name: "Cost Consultant", percentage: 0.0, isXA: false },
  { id: "disc-7", name: "CGIs/Renderings", percentage: 2.0, isXA: false },
  { id: "disc-8", name: "Structural/Civil", percentage: 11.0, isXA: false },
  { id: "disc-9", name: "MEPF", percentage: 8.0, isXA: false },
  { id: "disc-10", name: "Lighting", percentage: 1.0, isXA: false },
  { id: "disc-11", name: "Facades", percentage: 1.0, isXA: false },
  { id: "disc-12", name: "VT", percentage: 1.0, isXA: false },
  { id: "disc-13", name: "Acoustics", percentage: 1.0, isXA: false },
  { id: "disc-14", name: "Sustainability", percentage: 2.0, isXA: false },
  { id: "disc-15", name: "Waste Management", percentage: 1.0, isXA: false },
  { id: "disc-16", name: "AV/ICT/IT/Telecom", percentage: 3.0, isXA: false },
  { id: "disc-17", name: "Security Inc. CCTV", percentage: 1.0, isXA: false },
  { id: "disc-18", name: "Kitchens", percentage: 1.0, isXA: false },
  { id: "disc-19", name: "Traffic TIS", percentage: 1.0, isXA: false },
  { id: "disc-20", name: "Roads & Car parking", percentage: 1.0, isXA: false },
  { id: "disc-21", name: "FLS", percentage: 1.0, isXA: false },
  { id: "disc-22", name: "Signage", percentage: 1.0, isXA: false },
  { id: "disc-23", name: "BMS System", percentage: 1.0, isXA: false },
  { id: "disc-24", name: "Window cleaning system", percentage: 0.0, isXA: false },
  { id: "disc-25", name: "Exhibition", percentage: 0.0, isXA: false }
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

export function TopDownCalc() {
  const { currency } = useCurrency();

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
    let totalPercentage = 0;

    const breakdown = disciplines.map((d) => {
      const allocatedFee = totalDesignFee * (d.percentage / 100);
      if (d.isXA) {
        totalXaFee += allocatedFee;
      }
      totalPercentage += d.percentage;
      return {
        ...d,
        allocatedFee
      };
    });

    return {
      breakdown,
      totalXaFee,
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
    
    // Split for XA vs EXT
    const totalXaFee = disciplineMetrics.totalXaFee;
    const totalExtFee = Math.max(0, totalDesignFee - totalXaFee);
    const xaPercentageOfFee = totalDesignFee > 0 ? (totalXaFee / totalDesignFee) * 100 : 0;
    const extPercentageOfFee = totalDesignFee > 0 ? (totalExtFee / totalDesignFee) * 100 : 0;

    return {
      totalGfa,
      avgConstructionRate,
      avgDesignFeePerSqM,
      effectiveFeePercentage,
      totalXaFee,
      totalExtFee,
      xaPercentageOfFee,
      extPercentageOfFee
    };
  }, [assets, calculatedMetrics, disciplineMetrics]);

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
      isXA: false
    };
    const updated = [...disciplines, newDisc];
    const xas = updated.filter((d) => d.isXA);
    const nonXas = updated.filter((d) => !d.isXA);
    setDisciplines([...xas, ...nonXas]);
    setNewDisciplineName("");
    showNotification("New discipline added successfully.", "success");
  };

  const removeDiscipline = (id: string) => {
    const updated = disciplines.filter((d) => d.id !== id);
    const xas = updated.filter((d) => d.isXA);
    const nonXas = updated.filter((d) => !d.isXA);
    setDisciplines([...xas, ...nonXas]);
    showNotification("Discipline removed from list.", "success");
  };

  const updateDiscipline = (id: string, updates: Partial<Discipline>) => {
    setDisciplines((prev) => {
      const updated = prev.map((d) => (d.id === id ? { ...d, ...updates } : d));
      const xas = updated.filter((d) => d.isXA);
      const nonXas = updated.filter((d) => !d.isXA);
      return [...xas, ...nonXas];
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
      ["5. DISCIPLINE ALLOCATION & IN-HOUSE VS. EXTERNAL SPLIT"],
      ["Group Classification", "Discipline Name", "Allocation Percentage (%)", "Allocated Fee Portion", "Currency"],
      ...disciplines.map(d => {
        const allocatedFee = calculatedMetrics.totalDesignFee * (d.percentage / 100);
        return [
          d.isXA ? "XA (In-house)" : "External / Consult",
          d.name,
          d.percentage / 100,
          allocatedFee,
          currency
        ];
      }),
      [],
      ["XA TOTAL FEES (IN-HOUSE)", disciplineMetrics.totalXaFee, currency, "Sum of XA-toggled disciplines"],
      ["EXTERNAL TOTAL FEES", calculatedMetrics.totalDesignFee - disciplineMetrics.totalXaFee, currency, "Sum of non-XA disciplines"],
      ["COMBINED TOTAL DESIGN FEE", calculatedMetrics.totalDesignFee, currency, "Matches calculated design fee output"],
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
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("TOP DOWN PRICING ESTIMATION", 14, 24);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // slate-500
    const generationDate = new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
    doc.text(`Generated on ${generationDate} | Estimator Suite Pro`, 14, 29);

    // Dynamic Parameter table grid
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("PROJECT INFORMATION & BASELINE DETAILS", 14, 42);

    let metaY = 48;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // slate-600

    // Left Columns
    doc.text(`Proposal Name:   ${proposalName}`, 14, metaY);
    doc.text(`Client Name:         ${clientName || 'N/A'}`, 14, metaY + 5.5);
    doc.text(`Proposal No.:        ${proposalNumber || 'N/A'}`, 14, metaY + 11);

    const totalGfa = assets.reduce((sum, a) => sum + (a.quantity * a.gfa), 0);
    const avgPerGfa = totalGfa > 0 ? (calculatedMetrics.totalDesignFee / totalGfa) : 0;

    // Right Columns
    const col2X = 112;
    doc.text(`Submission Date:    ${submissionDate || 'N/A'}`, col2X, metaY);
    doc.text(`Design Fee Factor:  ${globalDesignFeePercentage.toFixed(2)}%`, col2X, metaY + 5.5);
    doc.text(`Total ${areaMode} Sum:      ${totalGfa.toLocaleString()} SqM`, col2X, metaY + 11);

    // Financial Overview summary cards block
    const summaryBoxY = metaY + 16;
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(14, summaryBoxY, doc.internal.pageSize.getWidth() - 28, 20, "DF");

    // Headings
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("TOTAL ESTIMATED CONSTRUCTION COST", 18, summaryBoxY + 7);
    doc.text("ESTIMATED ARCHITECTURAL DESIGN FEE", doc.internal.pageSize.getWidth() / 2 + 10, summaryBoxY + 7);

    // Calculations Display Values
    doc.setFontSize(12.5);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(`${calculatedMetrics.totalConstructionCost.toLocaleString()} ${currency}`, 18, summaryBoxY + 14);
    
    // Fee highlighted in emerald green
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.text(`${calculatedMetrics.totalDesignFee.toLocaleString()} ${currency}`, doc.internal.pageSize.getWidth() / 2 + 10, summaryBoxY + 14);

    tableStartY = summaryBoxY + 28;

    // Table 2.1: Assets
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("SPECIFIED BUILDING ASSETS & COST RANGE", 14, tableStartY);

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
      styles: { fontSize: 8.5, cellPadding: 3.5, font: "Helvetica", textColor: [30, 41, 59] },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 12, halign: 'center' },
        2: { cellWidth: 26, halign: 'right' },
        3: { cellWidth: 26, halign: 'right' },
        4: { cellWidth: 32, halign: 'right' },
        5: { cellWidth: 'auto', fontSize: 7.5 }
      }
    });

    // Table 2.2: Stage Pricing Allocations
    const nextStartY = (doc as any).lastAutoTable.finalY + 10;
    
    // Check if we need a page-break for Phase table to look clean
    let phaseTableStartY = nextStartY;
    if (phaseTableStartY > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      phaseTableStartY = 20;
    }

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("DESIGN PHASE PRICING ALLOCATION", 14, phaseTableStartY);

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
      styles: { fontSize: 8.5, cellPadding: 3.5, font: "Helvetica", textColor: [30, 41, 59] },
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 35, halign: 'center' },
        2: { cellWidth: 'auto', halign: 'right' }
      }
    });

    // Table 2.3: Discipline Allocations
    const nextDiscStartY = (doc as any).lastAutoTable.finalY + 10;
    let discTableStartY = nextDiscStartY;
    if (discTableStartY > doc.internal.pageSize.getHeight() - 65) {
      doc.addPage();
      discTableStartY = 20;
    }

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("DISCIPLINE ALLOCATION & SCOPE SPLIT", 14, discTableStartY);

    const discHead = [['Scope Classification', 'Discipline Name', 'Allocation (%)', 'Allocated Design Fee Amount']];
    const discBody = disciplineMetrics.breakdown.map((b) => [
      b.isXA ? "XA (In-house)" : "External / Consult",
      b.name,
      `${b.percentage.toFixed(1)}%`,
      `${b.allocatedFee.toLocaleString()} ${currency}`
    ]);

    autoTable(doc, {
      head: discHead,
      body: discBody,
      startY: discTableStartY + 3,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 3, font: "Helvetica", textColor: [30, 41, 59] },
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 40, halign: 'center' },
        1: { cellWidth: 70 },
        2: { cellWidth: 35, halign: 'center' },
        3: { cellWidth: 'auto', halign: 'right' }
      }
    });

    // Summary Metric Footnotes
    const sumMetricsY = (doc as any).lastAutoTable.finalY + 8;
    let finalBoxY = sumMetricsY;
    if (finalBoxY > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      finalBoxY = 20;
    }

    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(14, finalBoxY, doc.internal.pageSize.getWidth() - 28, 16, "DF");

    // Display XA total and External totals side-by-side
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("XA TOTAL IN-HOUSE FEES", 18, finalBoxY + 6);
    doc.text("EXTERNAL CONSULTANTS TOTAL FEES", doc.internal.pageSize.getWidth() / 2 + 10, finalBoxY + 6);

    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(`${disciplineMetrics.totalXaFee.toLocaleString()} ${currency}`, 18, finalBoxY + 12);
    doc.text(`${(calculatedMetrics.totalDesignFee - disciplineMetrics.totalXaFee).toLocaleString()} ${currency}`, doc.internal.pageSize.getWidth() / 2 + 10, finalBoxY + 12);

    // Footer signature / confidentiality stamp
    const finalY = finalBoxY + 23;
    if (finalY < doc.internal.pageSize.getHeight() - 15) {
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text("Classification: Commercial in Confidence. Calculations compiled top-down automatically via user metric coefficients.", 14, finalY);
    }

    const sanitizedFilename = proposalName.replace(/[/\\?%*:|"<>]/g, "_") || "Top_Down";
    doc.save(`${sanitizedFilename}_pdf_estimate_report.pdf`);
    showNotification("Professional estimation PDF generated successfully!", "success");
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
    const xas = rawDisc.filter((d) => d.isXA);
    const nonXas = rawDisc.filter((d) => !d.isXA);
    setDisciplines([...xas, ...nonXas]);
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

              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 border-b border-[var(--border)] pb-5">
                <div>
                  <h2 className="text-base font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
                    <span className="p-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl shrink-0">
                      <Database size={18} />
                    </span>
                    Project Selection & Details
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
                    <div className="flex bg-[var(--bg-tertiary)] border border-[var(--border)] p-0.5 rounded-lg text-xs font-medium">
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
                      className="w-full lg:w-auto bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer min-w-[180px]"
                    >
                      <option value="manual">-- Manual/Custom Entry --</option>
                      {pipelineProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.rfpNumber || "RFP"}] {p.name} ({p.client})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Form Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                      className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                      className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                      className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                      className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                          className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                          className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                          className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                      <div className="h-full min-h-[72px] flex items-center justify-center border border-dashed border-[var(--border)] rounded-xl px-4 py-3 bg-[var(--bg-tertiary)]/30 text-center">
                        <p className="text-[10px] text-[var(--text-secondary)] font-mono">
                          Enter Plot Area above to activate real-time volume & shapely floor count deduction.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 1: Global Parameters & Scope Setup */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-2xl space-y-6">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--border)] pb-4">
                <div>
                  <h2 className="text-base font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
                    <span className="p-2 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-xl shrink-0">
                      <CheckSquare size={18} />
                    </span>
                    Baseline Design Phases & Custom Weights
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    List standard phases, edit weights inline, or add custom phases matching bid specifications
                  </p>
                </div>

                {/* Scope inputs design percentage info box */}
                <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] border border-[var(--border)] px-4 py-2 rounded-xl text-xs text-[var(--text-secondary)] shadow-sm">
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
              </div>

              {/* Editing Table of Phases */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Custom Phase List Table */}
                <div className="lg:col-span-2 border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--bg-primary)]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border)] font-mono text-[10px] uppercase text-[var(--text-secondary)] text-center">
                      <tr>
                        <th className="px-4 py-3 text-left">Design Phase Name</th>
                        <th className="px-4 py-3 w-32">Weight (%)</th>
                        <th className="px-4 py-3 w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {phases.map((phase, index) => (
                        <tr 
                          key={phase.id} 
                          draggable 
                          onDragStart={(e) => handlePhaseDragStart(e, index)}
                          onDragOver={handlePhaseDragOver}
                          onDrop={(e) => handlePhaseDrop(e, index)}
                          className={cn(
                            "hover:bg-[var(--bg-tertiary)] group transition-colors",
                            draggedPhaseIndex === index && "opacity-40 bg-[var(--bg-tertiary)]"
                          )}
                        >
                          <td className="px-4 py-2.5 flex items-center gap-2">
                            <span 
                              className="text-neutral-500 hover:text-emerald-500 cursor-grab active:cursor-grabbing p-1 shrink-0"
                              title="Drag to rearrange"
                            >
                              <GripVertical size={14} />
                            </span>
                            <input
                              type="text"
                              value={phase.name}
                              onChange={(e) => updatePhaseName(phase.id, e.target.value)}
                              className="w-full bg-transparent border-none text-[var(--text-primary)] font-medium focus:ring-0 focus:outline-none text-xs"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="inline-flex items-center gap-1">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="100"
                                value={phase.weight}
                                onChange={(e) => updatePhaseWeight(phase.id, e.target.value)}
                                className="w-16 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-1.5 py-1 text-center font-bold text-xs focus:outline-none"
                              />
                              <span className="text-neutral-500 text-[10px] font-mono">%</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              onClick={() => removePhase(phase.id)}
                              className="text-neutral-500 hover:text-red-500 p-1 rounded-md transition-colors"
                              title="Delete Design Phase"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Phase Utilities Panel */}
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded-xl space-y-4 flex flex-col justify-between">
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
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border)] hover:border-emerald-500 text-xs font-bold uppercase tracking-wider p-2 rounded-lg transition-all text-center flex items-center justify-center gap-1"
                      >
                        <RefreshCw size={12} />
                        Normalize
                      </button>
                      <button
                        onClick={resetPhasesToDefault}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border)] hover:border-emerald-500 text-xs font-bold uppercase tracking-wider p-2 rounded-lg transition-all text-center"
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
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2 text-xs">
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
              
            </div>

            {/* Detailed Executive Dashboard / Presentation Board */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-2xl space-y-6 relative overflow-hidden shadow-sm transition-all duration-300 hover:border-emerald-500/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
                <div>
                  <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <span className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg shrink-0">
                      <Calculator size={18} />
                    </span>
                    Executive Pricing & Scope Dashboard
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Real-time financial synthesis, target breakdowns, and scope mapping metrics
                  </p>
                </div>
                
                {/* Global Badge indicating Active currency */}
                <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold self-start sm:self-center">
                  Currency: {currency}
                </span>
              </div>

              {/* Row 1: Key Metrics Bento Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Combined Area */}
                <div className="bg-[var(--bg-tertiary)] p-4 rounded-xl border border-[var(--border)] flex flex-col justify-between">
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
                <div className="bg-[var(--bg-tertiary)] p-4 rounded-xl border border-[var(--border)] flex flex-col justify-between">
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
                <div className="bg-[var(--bg-tertiary)] p-4 rounded-xl border border-[var(--border)] flex flex-col justify-between">
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
                <div className="bg-[var(--bg-tertiary)] p-4 rounded-xl border border-[var(--border)] flex flex-col justify-between">
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
                <div className="lg:col-span-7 bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--text-primary)]">
                      In-House Scope (XA) vs External Consult Split
                    </h4>
                    <span className="text-[10px] font-mono text-[var(--text-secondary)]">Discipline Allocation</span>
                  </div>

                  <div className="relative pt-1">
                    {/* Continuous double progress bar */}
                    <div className="overflow-hidden h-4 text-xs flex rounded-full bg-[var(--bg-primary)] border border-[var(--border)]">
                      <div
                        style={{ width: `${dashboardStats.xaPercentageOfFee}%` }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                        title={`XA: ${dashboardStats.xaPercentageOfFee.toFixed(1)}%`}
                      />
                      <div
                        style={{ width: `${dashboardStats.extPercentageOfFee}%` }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-zinc-400 dark:bg-zinc-600 transition-all duration-500"
                        title={`External: ${dashboardStats.extPercentageOfFee.toFixed(1)}%`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                    <div className="flex items-start gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                      <div>
                        <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase block font-bold">
                          XA In-House Fee ({dashboardStats.xaPercentageOfFee.toFixed(1)}%)
                        </span>
                        <span className="font-mono font-bold text-emerald-500 text-sm">
                          {dashboardStats.totalXaFee.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-[10px]">{currency}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 border-t sm:border-t-0 sm:border-l border-[var(--border)] pt-2.5 sm:pt-0 sm:pl-4">
                      <div className="w-2.5 h-2.5 rounded-full bg-zinc-400 dark:bg-zinc-600 mt-1 shrink-0" />
                      <div>
                        <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase block font-bold">
                          External Portion ({dashboardStats.extPercentageOfFee.toFixed(1)}%)
                        </span>
                        <span className="font-mono font-semibold text-[var(--text-primary)] text-sm">
                          {dashboardStats.totalExtFee.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-[10px]">{currency}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Asset Cost Contribution visual list (5 cols) */}
                <div className="lg:col-span-5 bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded-xl space-y-3 flex flex-col justify-between">
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
                              <div className="w-full bg-[var(--bg-primary)] rounded-full h-1">
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

            {/* Section 2: Building Assets Mapping */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-2xl space-y-6">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--border)] pb-4">
                <div>
                  <h2 className="text-base font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
                    <span className="p-2 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-xl shrink-0">
                      <Building size={18} />
                    </span>
                    Asset Specification & Scope Mapping
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Map individual buildings or areas to their respective active scope phases (click phase codes to toggle)
                  </p>
                </div>
              </div>

              {/* Table of active buildings */}
              <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--bg-primary)] overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[900px]">
                  <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border)] font-mono text-[10px] uppercase text-[var(--text-secondary)]">
                    <tr>
                      <th className="px-4 py-3 text-left">Asset/Building Name</th>
                      <th className="px-4 py-3 text-center w-16">Qty</th>
                      <th className="px-4 py-3 text-right w-24">{areaMode}/Unit (SqM)</th>
                      <th className="px-4 py-3 text-right w-24">Unit Rate ({currency})</th>
                      <th className="px-4 py-3 text-right w-28">Total Cost ({currency})</th>
                      <th className="px-4 py-3 text-center w-[220px]">Scope Mapping (Phases Included)</th>
                      <th className="px-4 py-3 text-right w-32">Design Fee ({currency})</th>
                      <th className="px-4 py-3 text-center w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {assets.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-xs text-[var(--text-secondary)] font-mono">
                          No specified building assets. Add a unit block below to compute design fees.
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
                        <tr key={asset.id} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={asset.name}
                              onChange={(e) => updateAssetField(asset.id, "name", e.target.value)}
                              className="w-full bg-transparent border-b border-transparent hover:border-[var(--border)] focus:border-emerald-500 focus:outline-none text-xs font-semibold py-0.5 text-[var(--text-primary)]"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={asset.quantity}
                              onChange={(e) => updateAssetField(asset.id, "quantity", Number(e.target.value) || 1)}
                              className="w-10 bg-transparent text-center border-b border-transparent hover:border-[var(--border)] focus:border-emerald-500 focus:outline-none text-xs font-mono font-medium text-[var(--text-primary)]"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="500"
                              value={asset.gfa}
                              onChange={(e) => updateAssetField(asset.id, "gfa", Number(e.target.value) || 0)}
                              className="w-20 bg-transparent text-right border-b border-transparent hover:border-[var(--border)] focus:border-emerald-500 focus:outline-none text-xs font-mono font-medium text-[var(--text-primary)]"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="250"
                              value={asset.constructionRate}
                              onChange={(e) => updateAssetField(asset.id, "constructionRate", Number(e.target.value) || 0)}
                              className="w-20 bg-transparent text-right border-b border-transparent hover:border-[var(--border)] focus:border-emerald-500 focus:outline-none text-xs font-mono font-bold text-emerald-500/80"
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-[var(--text-primary)]">
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
                                      "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider transition-colors border",
                                      isActive 
                                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20" 
                                        : "bg-neutral-500/5 text-neutral-500 border-neutral-700/10 hover:bg-neutral-500/10"
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
                              className="text-neutral-500 hover:text-red-500 p-1 rounded-md transition-colors cursor-pointer"
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

              {/* Form to add another Asset Row */}
              <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-5 rounded-xl">
                <h4 className="text-[10px] font-mono uppercase font-bold text-[var(--text-secondary)] mb-3 inline-flex items-center gap-1.5">
                  <Plus size={12} className="text-emerald-500" />
                  Add New Asset / Building Row
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                  <div className="col-span-12 lg:col-span-4">
                    <label className="block text-[9px] font-mono uppercase text-[var(--text-secondary)] mb-1">
                      Asset/Building Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Residential Tower A, Retail Block"
                      value={newAssetName}
                      onChange={(e) => setNewAssetName(e.target.value)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-4 lg:col-span-2">
                    <label className="block text-[9px] font-mono uppercase text-[var(--text-secondary)] mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newAssetQty}
                      onChange={(e) => setNewAssetQty(Number(e.target.value) || 1)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2 text-xs text-center text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-4 lg:col-span-2">
                    <label className="block text-[9px] font-mono uppercase text-[var(--text-secondary)] mb-1">
                      {areaMode} per unit (SqM)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={newAssetGfa}
                      onChange={(e) => setNewAssetGfa(Number(e.target.value) || 0)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2 text-xs text-right text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-4 lg:col-span-2">
                    <label className="block text-[9px] font-mono uppercase text-[var(--text-secondary)] mb-1">
                      Cost per SqM ({currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="250"
                      value={newAssetRate}
                      onChange={(e) => setNewAssetRate(Number(e.target.value) || 0)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2 text-xs text-right text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <div className="col-span-12 lg:col-span-2">
                    <button
                      onClick={addAssetRow}
                      className="w-full bg-[var(--text-primary)] text-[var(--bg-primary)] h-9 px-4 rounded-lg text-xs font-bold uppercase transition-transform hover:scale-102 active:scale-98 flex items-center justify-center gap-1 shrink-0 cursor-pointer shadow-sm hover:shadow-md"
                    >
                      <Plus size={14} /> Add Asset
                    </button>
                  </div>
                </div>
              </div>

            </div>

             {/* Section 3: Disciplines */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-2xl space-y-6 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
                <div>
                  <h3 className="text-base font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
                    <span className="p-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl shrink-0">
                      <Briefcase size={18} />
                    </span>
                    Discipline Fee Allocation & XA Weights
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

                  {/* Total XA Fee Box */}
                  <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl text-right">
                    <span className="text-[10px] font-mono uppercase text-emerald-500 block font-bold leading-none mb-1">
                      Total Fees for XA (In-House)
                    </span>
                    <span className="font-mono text-base font-bold text-emerald-500">
                      {disciplineMetrics.totalXaFee.toLocaleString()} <span className="text-[10px]">{currency}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Warnings and summary totals */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-[var(--bg-tertiary)] p-3 rounded-xl border border-[var(--border)] flex flex-col justify-center">
                  <span className="text-[9px] font-mono text-[var(--text-secondary)] uppercase">
                    Total Allocation Percentage
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className={cn(
                      "font-mono text-lg font-bold",
                      Math.abs(disciplineMetrics.totalPercentage - 100) < 0.01 ? "text-emerald-500" : "text-amber-500 font-extrabold"
                    )}>
                      {disciplineMetrics.totalPercentage.toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)]">of 100%</span>
                  </div>
                </div>

                <div className="bg-[var(--bg-tertiary)] p-3 rounded-xl border border-[var(--border)] flex flex-col justify-center">
                  <span className="text-[9px] font-mono text-[var(--text-secondary)] uppercase">
                    XA (In-House) Portion
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-mono text-lg font-bold text-emerald-500">
                      {calculatedMetrics.totalDesignFee > 0 ? ((disciplineMetrics.totalXaFee / calculatedMetrics.totalDesignFee) * 100).toFixed(1) : "0.0"}%
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)]">of total fee</span>
                  </div>
                </div>

                <div className="bg-[var(--bg-tertiary)] p-3 rounded-xl border border-[var(--border)] flex flex-col justify-center">
                  <span className="text-[9px] font-mono text-[var(--text-secondary)] uppercase">
                    External / Consultants
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-mono text-lg font-bold text-[var(--text-primary)]">
                      {(calculatedMetrics.totalDesignFee - disciplineMetrics.totalXaFee).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)]">{currency}</span>
                  </div>
                </div>
              </div>

              {Math.abs(disciplineMetrics.totalPercentage - 100) > 0.01 && (
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-[11px] text-amber-500">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>The combined discipline percentages currently sum up to <strong>{disciplineMetrics.totalPercentage.toFixed(1)}%</strong>. For a full allocation, the sum should equal 100.0%.</span>
                </div>
              )}

              {/* Disciplines Grid list */}
              <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--bg-tertiary)]">
                <div className="grid grid-cols-12 gap-2 bg-[var(--bg-secondary)] border-b border-[var(--border)] p-3 text-[10px] font-mono text-[var(--text-secondary)] uppercase select-none font-bold">
                  <div className="col-span-2 text-center">Scope</div>
                  <div className="col-span-5">Discipline Name</div>
                  <div className="col-span-2 text-center">Percentage (%)</div>
                  <div className="col-span-2 text-right font-mono">Allocated Fee</div>
                  <div className="col-span-1 text-center">Action</div>
                </div>

                <div className="divide-y divide-[var(--border)] max-h-[420px] overflow-y-auto">
                  {disciplineMetrics.breakdown.length === 0 ? (
                    <div className="p-10 text-center flex flex-col items-center justify-center gap-4 bg-[var(--bg-tertiary)]">
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
                    disciplineMetrics.breakdown.map((disc, index) => (
                      <div
                        key={disc.id}
                        draggable
                        onDragStart={(e) => handleDisciplineDragStart(e, index)}
                        onDragOver={handleDisciplineDragOver}
                        onDrop={(e) => handleDisciplineDrop(e, index)}
                        className={cn(
                          "grid grid-cols-12 gap-2 p-3 items-center text-xs transition-colors hover:bg-[var(--bg-primary)]/40",
                          disc.isXA ? "bg-emerald-500/[0.015]" : "",
                          draggedDisciplineIndex === index && "opacity-40 bg-[var(--bg-tertiary)]"
                        )}
                      >
                        {/* Scope select Column */}
                        <div className="col-span-2 flex justify-center items-center gap-1.5">
                          <span 
                            className="text-neutral-500 cursor-grab active:cursor-grabbing p-1 shrink-0 hover:text-emerald-500"
                            title="Drag to rearrange"
                          >
                            <GripVertical size={13} />
                          </span>
                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={disc.isXA}
                              onChange={(e) => updateDiscipline(disc.id, { isXA: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                            <span className="absolute left-1/2 -translate-x-1/2 text-[8px] font-mono font-bold leading-none pointer-events-none uppercase text-white">
                              {disc.isXA ? "XA" : "EXT"}
                            </span>
                          </label>
                        </div>

                        {/* Discipline Name column */}
                        <div className="col-span-5">
                          <input
                            type="text"
                            value={disc.name}
                            onChange={(e) => updateDiscipline(disc.id, { name: e.target.value })}
                            className="bg-transparent border border-transparent hover:border-[var(--border)] focus:border-emerald-500 focus:bg-[var(--bg-primary)] focus:outline-none rounded-lg text-xs font-semibold text-[var(--text-primary)] w-full py-1.5 px-2 transition-all"
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
                        <div className="col-span-2 text-right font-mono text-xs pr-1">
                          <span className={cn(
                            "font-bold",
                            disc.isXA ? "text-emerald-500" : "text-[var(--text-primary)]"
                          )}>
                            {disc.allocatedFee.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                          <span className="text-[9px] text-[var(--text-secondary)] ml-1">{currency}</span>
                        </div>

                        {/* Actions delete row column */}
                        <div className="col-span-1 flex justify-center">
                          <button
                            onClick={() => removeDiscipline(disc.id)}
                            className="text-[var(--text-secondary)] hover:text-red-500 p-1.5 rounded-lg transition-colors hover:bg-red-500/10 cursor-pointer"
                            title="Delete Discipline"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
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
                <div className="flex flex-col gap-2 bg-[var(--bg-primary)] border border-emerald-500/20 p-3.5 rounded-xl my-2 shadow-inner">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)] font-medium">Design Fee Factor:</span>
                    <span className="font-mono font-bold text-emerald-500 select-all">{globalDesignFeePercentage.toFixed(2)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="25"
                      step="0.01"
                      value={globalDesignFeePercentage}
                      onChange={(e) => setGlobalDesignFeePercentage(Number(e.target.value) || 0)}
                      className="flex-1 accent-emerald-500 cursor-pointer h-1 bg-[var(--bg-tertiary)] rounded-lg appearance-none"
                    />
                    <div className="flex items-center bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg px-2 py-1 shrink-0 gap-1.5 shadow-sm">
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="100"
                        value={parseFloat(globalDesignFeePercentage.toFixed(2)) || 0}
                        onChange={(e) => setGlobalDesignFeePercentage(Number(e.target.value) || 0)}
                        className="w-14 bg-transparent text-left font-mono font-bold text-xs text-emerald-500 focus:outline-none p-0 border-0 h-5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-emerald-500/80 text-[10px] font-bold font-mono mr-1">%</span>
                      <div className="flex flex-col border-l border-[var(--border)] pl-1.5 gap-0.5">
                        <button
                          type="button"
                          onClick={() => setGlobalDesignFeePercentage(prev => Math.min(100, Number((prev + 0.05).toFixed(2))))}
                          className="text-emerald-500 hover:text-emerald-400 p-0 hover:bg-emerald-500/10 rounded transition-colors"
                          title="Increase by 0.05%"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setGlobalDesignFeePercentage(prev => Math.max(0, Number((prev - 0.05).toFixed(2))))}
                          className="text-emerald-500 hover:text-emerald-400 p-0 hover:bg-emerald-500/10 rounded transition-colors"
                          title="Decrease by 0.05%"
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>
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

                  <div className="space-y-2">
                    {calculatedMetrics.phaseBreakdown.map((breakdown) => (
                      <div
                        key={breakdown.phaseId}
                        className="bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] p-2.5 border border-[var(--border)] rounded-xl flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <p className="font-medium text-[var(--text-primary)] truncate" title={breakdown.phaseName}>
                            {breakdown.phaseName}
                          </p>
                          <span className="text-[9px] font-mono text-[var(--text-secondary)]">
                            Weight Factor: {breakdown.phaseWeight}%
                          </span>
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
                    ))}
                  </div>
                </div>

              </div>
              
              {/* Export Utilities Panel */}
              <div className="border-t border-[var(--border)] pt-5 mt-6 space-y-2">
                <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--text-secondary)] mb-2">
                  Export Pricing Reports
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={exportToPDF}
                    className="flex items-center justify-center gap-1.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)] hover:border-emerald-500/50 text-xs font-bold uppercase tracking-wider py-2.5 px-3 rounded-xl transition-all cursor-pointer shadow-sm"
                    title="Generate professional PDF summary report"
                  >
                    <FileText size={14} className="text-red-500 shrink-0" />
                    <span>PDF Doc</span>
                  </button>
                  <button
                    onClick={exportToExcel}
                    className="flex items-center justify-center gap-1.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)] hover:border-emerald-500/50 text-xs font-bold uppercase tracking-wider py-2.5 px-3 rounded-xl transition-all cursor-pointer shadow-sm"
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
