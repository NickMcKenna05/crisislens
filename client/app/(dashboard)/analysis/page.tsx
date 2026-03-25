"use client";

import NewsPanel from "@/components/ui/NewsPanel";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  fetchPortfolios,
  fetchAnalysisRuns,
  saveAnalysisRun,
  deleteAnalysisRun,
  type AnalysisRun,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bot,
  Calendar,
  ShieldAlert,
  History,
  Trash2,
  Save,
  PlusCircle,
  Info,
  X
} from "lucide-react";
import PerformanceChart from "@/components/ui/PerformanceChart";
import { getDynamicScenarios } from "@/app/actions"; 

export default function AnalysisDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL Parameters
  const portfolioIdFromUrl = searchParams.get("portfolioId") || "";
  const scenarioFromUrl = searchParams.get("scenario") || "covid-19";
  const startFromUrl = searchParams.get("start") || "";
  const endFromUrl = searchParams.get("end") || "";
  const customNameFromUrl = searchParams.get("name") || "";
  const customDescriptionFromUrl = searchParams.get("description") || "";

  // Core Data State
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [runHistory, setRunHistory] = useState<AnalysisRun[]>([]);
  const [scenarios, setScenarios] = useState<any[]>([]); 
  
  // Active UI State
  const [selectedPortfolio, setSelectedPortfolio] = useState(portfolioIdFromUrl);
  const [selectedScenario, setSelectedScenario] = useState(scenarioFromUrl);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [activeSavedRun, setActiveSavedRun] = useState<AnalysisRun | null>(null);

  // Modals State
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSavingRun, setIsSavingRun] = useState(false);

  // Save Modal Form State
  const [runNameInput, setRunNameInput] = useState("");
  const [savePortfolioId, setSavePortfolioId] = useState("");
  const [saveScenarioId, setSaveScenarioId] = useState("");

  // Custom Scenario Builder State
  const [customScenarioName, setCustomScenarioName] = useState(customNameFromUrl);
  const [customScenarioDescription, setCustomScenarioDescription] = useState(customDescriptionFromUrl);
  const [customStartDate, setCustomStartDate] = useState(startFromUrl);
  const [customEndDate, setCustomEndDate] = useState(endFromUrl);

  const selectedPortfolioObj = useMemo(() => {
    return portfolios.find((p) => p.id === selectedPortfolio);
  }, [portfolios, selectedPortfolio]);

  const selectedScenarioData = useMemo(() => {
    if (selectedScenario === "custom") {
      return {
        id: "custom",
        label: customScenarioName || "Custom Scenario",
        startDate: customStartDate,
        endDate: customEndDate,
        description: customScenarioDescription || "User-defined custom crisis window.",
        markers: [] 
      };
    }
    const found = scenarios.find((s) => s.id === selectedScenario);
    if (found) return found;

    return {
      id: selectedScenario,
      label: "Loading...",
      startDate: "",
      endDate: "",
      description: "",
      markers: []
    };
  }, [selectedScenario, scenarios, customScenarioName, customStartDate, customEndDate, customScenarioDescription]);

  useEffect(() => {
    async function loadData() {
      try {
        const mdxScenarios = await getDynamicScenarios();
        setScenarios(mdxScenarios);

        const portfolioData = await fetchPortfolios();
        if (portfolioData && portfolioData.length > 0) {
          setPortfolios(portfolioData);
          if (!portfolioIdFromUrl) setSelectedPortfolio(portfolioData[0].id);
        }
        
        setIsLoadingRuns(true);
        const runs = await fetchAnalysisRuns();
        if (runs) setRunHistory(runs);
      } catch (error: any) {
        console.error("Error loading analysis data:", error.message);
      } finally {
        setIsLoadingRuns(false);
      }
    }
    loadData();
  }, [portfolioIdFromUrl]);

  useEffect(() => { if (portfolioIdFromUrl) setSelectedPortfolio(portfolioIdFromUrl); }, [portfolioIdFromUrl]);
  useEffect(() => { if (scenarioFromUrl) setSelectedScenario(scenarioFromUrl); }, [scenarioFromUrl]);

  function handleUpdateSimulation() {
    if (selectedScenario === "custom") {
      if (!customStartDate || !customEndDate) {
        alert("Please provide both a Start Date and End Date for your custom scenario.");
        return;
      }
    }
    
    // Clear active saved run since we are doing a fresh simulation
    setActiveSavedRun(null);

    const params = new URLSearchParams();
    if (selectedPortfolio) params.set("portfolioId", selectedPortfolio);
    params.set("scenario", selectedScenarioData.id);
    
    if (selectedScenarioData.startDate) params.set("start", selectedScenarioData.startDate);
    if (selectedScenarioData.endDate) params.set("end", selectedScenarioData.endDate);
    
    if (selectedScenario === "custom") {
      params.set("name", selectedScenarioData.label);
      params.set("description", selectedScenarioData.description);
    }

    router.push(`/analysis?${params.toString()}`);
  }

  // --- SAVE RUN MODAL LOGIC ---
  function openSaveModal() {
    if (!selectedPortfolio || !metrics) {
      alert("Please run a simulation first before saving.");
      return;
    }
    // Pre-fill the modal with current state
    setSavePortfolioId(selectedPortfolio);
    setSaveScenarioId(selectedScenario);
    setRunNameInput(`${selectedPortfolioObj?.name || 'Portfolio'} - ${selectedScenarioData.label} Test`);
    setIsSaveModalOpen(true);
  }

  async function confirmSaveRun() {
    if (!runNameInput) {
      alert("Please provide a name for this run.");
      return;
    }

    try {
      setIsSavingRun(true);
      
      // Determine the scenario name based on what they selected in the modal
      let finalScenarioName = selectedScenarioData.label;
      if (saveScenarioId !== selectedScenario) {
         const found = scenarios.find(s => s.id === saveScenarioId);
         if (found) finalScenarioName = found.label;
      }

      const savedRun = await saveAnalysisRun({
        portfolio_id: savePortfolioId,
        scenario_id: saveScenarioId,
        scenario_name: finalScenarioName,
        start_date: selectedScenarioData.startDate,
        end_date: selectedScenarioData.endDate,
        vulnerability_score: metrics.vulnerabilityScore,
        timeline_view: isZoomed ? "crash" : "full",
        notes: runNameInput, // We use 'notes' to store the custom Run Name
      });
      
      setRunHistory((prev) => [savedRun, ...prev]);
      setIsSaveModalOpen(false);
    } catch (error: any) {
      alert("Failed to save analysis run.");
    } finally {
      setIsSavingRun(false);
    }
  }

  async function handleDeleteRun(runId: string) {
    if (!confirm("Are you sure you want to delete this saved run?")) return;
    try {
      await deleteAnalysisRun(runId);
      setRunHistory((prev) => prev.filter((r) => r.id !== runId));
      if (activeSavedRun?.id === runId) setActiveSavedRun(null);
    } catch (error) {
      console.error("Failed to delete run", error);
    }
  }

  // --- LOAD SAVED RUN LOGIC ---
  function loadSavedRun(run: AnalysisRun) {
    setActiveSavedRun(run);
    setSelectedPortfolio(run.portfolio_id);
    setSelectedScenario(run.scenario_id);
    
    if (run.scenario_id === "custom") {
      setCustomStartDate(run.start_date || "");
      setCustomEndDate(run.end_date || "");
      setCustomScenarioName(run.scenario_name || "");
    }

    // Update URL to trigger the chart re-fetch
    const params = new URLSearchParams();
    params.set("portfolioId", run.portfolio_id);
    params.set("scenario", run.scenario_id);
    if (run.start_date) params.set("start", run.start_date);
    if (run.end_date) params.set("end", run.end_date);
    router.push(`/analysis?${params.toString()}`);
  }

  return (
    <div className="grid grid-cols-12 gap-6 h-full p-4 relative">
      <div className="col-span-12 md:col-span-3 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500 uppercase">Analysis Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-xs font-bold uppercase text-slate-400">Target Portfolio</label>
              <select value={selectedPortfolio} onChange={(e) => setSelectedPortfolio(e.target.value)} className="w-full mt-2 p-2 border rounded-md text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500">
                {portfolios.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-400">Crisis Scenario</label>
              <select value={selectedScenario} onChange={(e) => setSelectedScenario(e.target.value)} className="w-full mt-2 p-2 border rounded-md text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500">
                {scenarios.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                <option value="custom">⚙️ Custom Date Range</option>
              </select>
            </div>

            {selectedScenario === "custom" ? (
              <div className="space-y-3 rounded-lg border bg-blue-50/50 p-3">
                <p className="text-xs font-bold uppercase text-blue-500">Custom Parameters</p>
                <input
                  type="text"
                  placeholder="Scenario Name (e.g. 2024 Tech Dip)"
                  value={customScenarioName}
                  onChange={(e) => setCustomScenarioName(e.target.value)}
                  className="w-full p-2 border rounded-md text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 uppercase">Start Date</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full mt-1 p-2 border rounded-md text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 uppercase">End Date</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full mt-1 p-2 border rounded-md text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <textarea
                  placeholder="Notes or Description..."
                  value={customScenarioDescription}
                  onChange={(e) => setCustomScenarioDescription(e.target.value)}
                  rows={2}
                  className="w-full p-2 border rounded-md text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div className="rounded-lg border bg-slate-50 p-3 text-sm">
                <p className="font-semibold text-slate-800">Active Scenario Window</p>
                <p className="mt-1 text-slate-600">{selectedScenarioData.startDate || "N/A"} → {selectedScenarioData.endDate || "N/A"}</p>
                <p className="mt-2 text-xs text-slate-500">{selectedScenarioData.description}</p>
              </div>
            )}

            <Button className="w-full bg-blue-600 hover:bg-blue-700 shadow-lg" onClick={handleUpdateSimulation}>
              Update Simulation
            </Button>
            <Button className="w-full" variant="outline" onClick={openSaveModal} disabled={!selectedPortfolio || !metrics}>
              <Save className="mr-2 h-4 w-4" /> Save This Run
            </Button>
          </CardContent>
        </Card>

        {/* CLICKABLE VULNERABILITY SCORE CARD */}
        <Card 
          className="bg-slate-900 text-white border-slate-800 cursor-pointer hover:bg-slate-800 transition-colors group relative overflow-hidden"
          onClick={() => setIsScoreModalOpen(true)}
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 group-hover:bg-blue-400 transition-colors" />
          <CardHeader className="pb-2 text-center relative">
            <CardTitle className="text-slate-400 text-xs uppercase tracking-widest flex items-center justify-center gap-2 group-hover:text-white transition-colors">
              Vulnerability Score
              <Info size={14} className="text-slate-500 group-hover:text-blue-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pb-6">
            <div className={`text-6xl font-bold transition-all duration-700 ${metrics?.vulnerabilityScore > 50 ? 'text-red-500' : 'text-green-400'}`}>
              {metrics?.vulnerabilityScore ?? "--"}
            </div>
            <div className="text-[10px] text-slate-500 uppercase mt-2 font-bold tracking-tighter">
               {metrics?.vulnerabilityScore > 50 ? "Aggressive Risk" : metrics ? "Defensive Shield" : "Waiting for Data"}
            </div>
          </CardContent>
        </Card>

        {/* RUN HISTORY CARD */}
        {runHistory.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <History size={14} /> Saved Runs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[350px] overflow-y-auto">
              {runHistory.map((run) => {
                const isCustom = run.scenario_id === "custom";
                const crisisName = isCustom ? `${run.start_date} to ${run.end_date}` : run.scenario_name;
                const portName = portfolios.find(p => p.id === run.portfolio_id)?.name || "Unknown Portfolio";
                const isActive = activeSavedRun?.id === run.id;

                return (
                  <div 
                    key={run.id} 
                    onClick={() => loadSavedRun(run)}
                    className={`flex flex-col p-3 rounded-lg border transition-colors group cursor-pointer ${isActive ? 'bg-blue-50 border-blue-300 shadow-inner' : 'border-slate-100 bg-slate-50 hover:border-blue-200'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-bold text-slate-800 pr-2 leading-tight">
                        {run.notes || "Unnamed Run"}
                      </span>
                      <span className={`text-sm font-black ${run.vulnerability_score > 50 ? 'text-red-500' : 'text-green-500'}`}>
                        {run.vulnerability_score}
                      </span>
                    </div>
                    
                    <div className="text-[10px] text-slate-500 space-y-0.5 mb-2">
                      <p><span className="font-semibold text-slate-400">Portfolio:</span> {portName}</p>
                      <p><span className="font-semibold text-slate-400">Crisis:</span> {crisisName}</p>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400 pt-2 border-t border-slate-200/60 mt-auto">
                      <span>{new Date(run.created_at).toLocaleDateString()}</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRun(run.id);
                        }} 
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

      </div>

      <div className="col-span-12 md:col-span-9 flex flex-col gap-6">
        <Card className="flex-1 min-h-[450px]">
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <CardTitle className="capitalize flex items-center gap-2">
              <ShieldAlert size={20} className={metrics?.vulnerabilityScore > 50 ? "text-red-500" : "text-blue-500"} />
              {activeSavedRun ? `Saved Run: "${activeSavedRun.notes || activeSavedRun.scenario_name}"` : `${selectedScenarioData.label} Impact`}
            </CardTitle>
            <div className="flex gap-2">
               <Button variant={!isZoomed ? "secondary" : "ghost"} size="sm" onClick={() => setIsZoomed(false)}>Context</Button>
               <Button variant={isZoomed ? "secondary" : "ghost"} size="sm" onClick={() => setIsZoomed(true)}>Crash Zoom</Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <PerformanceChart
              scenarioId={selectedScenarioData.id}
              isZoomed={isZoomed}
              startDate={selectedScenarioData.startDate}
              endDate={selectedScenarioData.endDate}
              portfolioId={selectedPortfolio}
              portfolioName={selectedPortfolioObj?.name} 
              onMetricsUpdate={setMetrics} 
              markers={selectedScenarioData.markers} 
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-l-4 border-l-blue-500 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm text-slate-500 uppercase">Crisis Sensitivities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Top Strategic Hedge</span>
                  <span className="font-semibold text-blue-700">{metrics?.topHedge || "Calculating..."}</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Primary Risk Factor</span>
                  <span className="font-semibold text-red-700">{metrics?.topRisk || "Calculating..."}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-600 text-white shadow-lg shadow-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-100 text-sm flex items-center gap-2">
                <Bot size={18} /> Strategic Insight
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics ? (
                <p className="text-lg font-medium leading-tight">
                  "Your portfolio has a beta of <span className="text-blue-200 underline">{metrics.portfolioBeta}</span> relative to this crisis. 
                  Expect a peak drawdown of <span className="text-blue-200">{metrics.maxDrawdown}%</span> compared to the market's {metrics.marketDrawdown}%."
                </p>
              ) : (
                <p className="text-blue-200 animate-pulse italic">Run simulation to generate AI insights...</p>
              )}
            </CardContent>
          </Card>
        </div>
        <NewsPanel
          portfolioId={selectedPortfolio}
          scenarioId={selectedScenarioData.id}
        />
      </div>

      {/* --- SAVE RUN CONFIGURATION MODAL --- */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
            <button 
              onClick={() => setIsSaveModalOpen(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-xl font-bold text-slate-900 mb-1">Save Analysis Run</h2>
            <p className="text-sm text-slate-500 mb-6">Verify your selections and name this simulation so you can review it later.</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-500">Run Name</label>
                <input
                  type="text"
                  value={runNameInput}
                  onChange={(e) => setRunNameInput(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. My Tech Portfolio against COVID"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-500">Portfolio Selected</label>
                <select 
                  value={savePortfolioId} 
                  onChange={(e) => setSavePortfolioId(e.target.value)} 
                  className="w-full mt-1 p-2 border rounded-md text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {portfolios.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-500">Crisis Selected</label>
                <select 
                  value={saveScenarioId} 
                  onChange={(e) => setSaveScenarioId(e.target.value)} 
                  className="w-full mt-1 p-2 border rounded-md text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {scenarios.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  <option value="custom">⚙️ Custom Date Range</option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setIsSaveModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" 
                onClick={confirmSaveRun}
                disabled={isSavingRun || !runNameInput}
              >
                {isSavingRun ? "Saving..." : "Confirm Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- VULNERABILITY SCORE EXPLANATION MODAL --- */}
      {isScoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative">
            <button 
              onClick={() => setIsScoreModalOpen(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-xl font-bold text-slate-900 mb-2">Understanding Your Score</h2>
            <p className="text-sm text-slate-600 mb-8 leading-relaxed">
              The Vulnerability Score measures your portfolio's exact mathematical sensitivity (Beta) to the active crisis. A score of 50 means you move identically to the S&P 500.
            </p>
            
            {/* The Visual Gradient Gauge */}
            <div className="relative h-4 bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 rounded-full mb-2 mx-2 shadow-inner">
              
              {/* S&P 500 Anchor Line */}
              <div className="absolute top-[-10px] bottom-[-10px] w-1 bg-slate-800 left-[50%] z-10 rounded-full"></div>
              <div className="absolute top-[-28px] left-[50%] -translate-x-1/2 text-[10px] font-extrabold text-slate-800 whitespace-nowrap">
                S&P 500 (50)
              </div>
              
              {/* User's Dynamic Score Marker */}
              {metrics && (
                <div 
                  className="absolute top-[-14px] bottom-[-14px] w-3 bg-blue-600 border-2 border-white rounded-full z-20 shadow-md transition-all duration-700 ease-out"
                  style={{ left: `calc(${Math.min(Math.max(metrics.vulnerabilityScore, 0), 100)}% - 6px)` }}
                >
                  <div className="absolute top-[28px] left-[50%] -translate-x-1/2 text-[10px] font-bold text-blue-700 whitespace-nowrap">
                    You
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-between text-xs font-bold text-slate-400 mb-8 uppercase tracking-wider">
              <span>Defensive (0)</span>
              <span>Highly Volatile (100)</span>
            </div>

            {/* Explanatory Legend */}
            <div className="space-y-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex gap-3 items-start">
                <div className="w-3 h-3 rounded-full bg-green-400 mt-1 shrink-0 shadow-sm"></div>
                <p><strong className="text-slate-800">0 - 49 (Defensive):</strong> Your portfolio acts as a shock absorber. You are mathematically positioned to lose less capital than the broader market during a crash.</p>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-3 h-3 rounded-full bg-yellow-400 mt-1 shrink-0 shadow-sm"></div>
                <p><strong className="text-slate-800">50 (Market Neutral):</strong> Your portfolio carries standard market risk and will closely mirror the peaks and valleys of the S&P 500.</p>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-3 h-3 rounded-full bg-red-500 mt-1 shrink-0 shadow-sm"></div>
                <p><strong className="text-slate-800">51 - 100+ (Aggressive):</strong> High risk. Your portfolio is heavily concentrated in volatile sectors and is likely to crash harder than the market.</p>
              </div>
            </div>

            <Button className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white" onClick={() => setIsScoreModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}