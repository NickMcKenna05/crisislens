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
} from "lucide-react";
import PerformanceChart from "@/components/ui/PerformanceChart";

const SCENARIOS = [
  {
    id: "covid-19",
    label: "COVID-19 Crash (2020)",
    startDate: "2020-02-01",
    endDate: "2020-03-23",
    description: "Pandemic-driven market crash during early 2020.",
  },
  {
    id: "great-recession",
    label: "2008 Financial Crisis",
    startDate: "2007-10-01",
    endDate: "2009-03-01",
    description: "Global financial crisis triggered by housing and credit collapse.",
  },
  {
    id: "dot-com-bubble",
    label: "Dot-Com Bubble (2000)",
    startDate: "2000-03-10",
    endDate: "2002-10-09",
    description: "Technology stock bubble burst after speculative overvaluation.",
  },
  {
    id: "black-monday",
    label: "Black Monday (1987)",
    startDate: "1987-10-14",
    endDate: "1987-10-19",
    description: "Historic one-day stock market crash in October 1987.",
  },
  {
    id: "debt-ceiling-crisis",
    label: "U.S. Debt Ceiling Crisis (2011)",
    startDate: "2011-04-01",
    endDate: "2011-08-31",
    description: "Political deadlock over U.S. debt ceiling triggered volatility.",
  },
  {
    id: "oil-embargo-recession",
    label: "1973 Oil Embargo & Stagflation Crisis",
    startDate: "1973-10-01",
    endDate: "1975-03-31",
    description: "Oil embargo, inflation surge, and recessionary market stress.",
  },
  {
    id: "rate-hike-bear-market",
    label: "Rate Hike Bear Market (2022)",
    startDate: "2022-01-01",
    endDate: "2022-10-31",
    description: "Aggressive Fed tightening caused broad equity selloff.",
  },
  {
    id: "russia-ukraine-war",
    label: "Russia–Ukraine War (2022)",
    startDate: "2022-02-24",
    endDate: "2022-06-30",
    description: "Geopolitical conflict drove market, energy, and commodity volatility.",
  },
  {
    id: "svb-banking-crisis",
    label: "SVB Banking Crisis (2023)",
    startDate: "2023-03-01",
    endDate: "2023-03-31",
    description: "Regional banking stress sparked by Silicon Valley Bank collapse.",
  },
  {
    id: "volcker-shock",
    label: "Volcker Shock (1979–1982)",
    startDate: "1979-08-01",
    endDate: "1982-12-31",
    description: "High interest rates to fight inflation created major market pressure.",
  },
  {
    id: "volmageddon",
    label: "Volmageddon (2018)",
    startDate: "2018-01-01",
    endDate: "2018-02-28",
    description: "Volatility spike caused inverse-volatility products to collapse.",
  },
];

export default function AnalysisDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const portfolioIdFromUrl = searchParams.get("portfolioId") || "";
  const scenarioFromUrl = searchParams.get("scenario") || "covid-19";
  const startFromUrl = searchParams.get("start") || "";
  const endFromUrl = searchParams.get("end") || "";
  const customNameFromUrl = searchParams.get("name") || "";
  const customDescriptionFromUrl = searchParams.get("description") || "";

  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [runHistory, setRunHistory] = useState<AnalysisRun[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState(portfolioIdFromUrl);
  const [selectedScenario, setSelectedScenario] = useState(scenarioFromUrl);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isSavingRun, setIsSavingRun] = useState(false);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);

  const [customScenarioName, setCustomScenarioName] = useState(customNameFromUrl);
  const [customScenarioDescription, setCustomScenarioDescription] = useState(
    customDescriptionFromUrl
  );
  const [customStartDate, setCustomStartDate] = useState(startFromUrl);
  const [customEndDate, setCustomEndDate] = useState(endFromUrl);

  const selectedScenarioData = useMemo(() => {
    const found = SCENARIOS.find((s) => s.id === selectedScenario);
    if (found) return found;

    return {
      id: selectedScenario,
      label: customNameFromUrl || selectedScenario.replace(/-/g, " "),
      startDate: startFromUrl,
      endDate: endFromUrl,
      description: customDescriptionFromUrl || "Custom user-defined scenario.",
    };
  }, [
    selectedScenario,
    startFromUrl,
    endFromUrl,
    customNameFromUrl,
    customDescriptionFromUrl,
  ]);

  useEffect(() => {
    async function loadData() {
      try {
        const portfolioData = await fetchPortfolios();
        if (portfolioData) setPortfolios(portfolioData);

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
  }, []);

  useEffect(() => {
    if (portfolioIdFromUrl) {
      setSelectedPortfolio(portfolioIdFromUrl);
    }
  }, [portfolioIdFromUrl]);

  useEffect(() => {
    if (scenarioFromUrl) {
      setSelectedScenario(scenarioFromUrl);
    }
  }, [scenarioFromUrl]);

  useEffect(() => {
    if (scenarioFromUrl === "custom") {
      setCustomScenarioName(customNameFromUrl);
      setCustomScenarioDescription(customDescriptionFromUrl);
      setCustomStartDate(startFromUrl);
      setCustomEndDate(endFromUrl);
    }
  }, [
    scenarioFromUrl,
    customNameFromUrl,
    customDescriptionFromUrl,
    startFromUrl,
    endFromUrl,
  ]);

  function handleUpdateSimulation() {
    const params = new URLSearchParams();

    if (selectedPortfolio) {
      params.set("portfolioId", selectedPortfolio);
    }

    params.set("scenario", selectedScenarioData.id);

    if (selectedScenarioData.startDate) {
      params.set("start", selectedScenarioData.startDate);
    }

    if (selectedScenarioData.endDate) {
      params.set("end", selectedScenarioData.endDate);
    }

    if (selectedScenarioData.id === "custom") {
      params.set("name", customScenarioName || "Custom Scenario");
      params.set("description", customScenarioDescription || "");
    }

    router.push(`/analysis?${params.toString()}`);
  }

  function handleApplyCustomScenario() {
    if (!customScenarioName.trim() || !customStartDate || !customEndDate) {
      alert("Please enter a custom scenario name, start date, and end date.");
      return;
    }

    if (customEndDate < customStartDate) {
      alert("End date must be after the start date.");
      return;
    }

    const params = new URLSearchParams();

    if (selectedPortfolio) {
      params.set("portfolioId", selectedPortfolio);
    }

    params.set("scenario", "custom");
    params.set("name", customScenarioName.trim());
    params.set("description", customScenarioDescription.trim());
    params.set("start", customStartDate);
    params.set("end", customEndDate);

    setSelectedScenario("custom");
    router.push(`/analysis?${params.toString()}`);
  }

  async function handleSaveRun() {
    if (!selectedPortfolio) {
      alert("Please select a portfolio before saving a run.");
      return;
    }

    try {
      setIsSavingRun(true);

      const savedRun = await saveAnalysisRun({
        portfolio_id: selectedPortfolio,
        scenario_id: selectedScenarioData.id,
        scenario_name: selectedScenarioData.label,
        start_date: selectedScenarioData.startDate,
        end_date: selectedScenarioData.endDate,
        vulnerability_score: 85,
        timeline_view: isZoomed ? "crash" : "full",
        notes:
          selectedScenarioData.id === "custom"
            ? `Saved custom analysis: ${selectedScenarioData.label} — ${customScenarioDescription || "No description"}`
            : `Saved analysis for ${selectedScenarioData.label}`,
      });

      setRunHistory((prev) => [savedRun, ...prev]);
    } catch (error: any) {
      console.error("Error saving run:", error.message);
      alert(error.message || "Failed to save analysis run.");
    } finally {
      setIsSavingRun(false);
    }
  }

  function handleReopenRun(run: AnalysisRun) {
    const params = new URLSearchParams();

    params.set("portfolioId", run.portfolio_id);
    params.set("scenario", run.scenario_id);

    if (run.start_date) {
      params.set("start", run.start_date);
    }

    if (run.end_date) {
      params.set("end", run.end_date);
    }

    if (run.scenario_id === "custom") {
      params.set("name", run.scenario_name);
      if (run.notes) {
        params.set("description", run.notes);
      }
    }

    router.push(`/analysis?${params.toString()}`);
  }

  async function handleDeleteRun(runId: string) {
    try {
      await deleteAnalysisRun(runId);
      setRunHistory((prev) => prev.filter((run) => run.id !== runId));
    } catch (error: any) {
      console.error("Error deleting run:", error.message);
      alert(error.message || "Failed to delete saved run.");
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6 h-full p-4">
      <div className="col-span-12 md:col-span-3 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">
              Analysis Settings
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div>
              <label className="text-xs font-bold uppercase text-slate-400">
                Target Portfolio
              </label>
              <select
                value={selectedPortfolio}
                onChange={(e) => setSelectedPortfolio(e.target.value)}
                className="w-full mt-2 p-2 border rounded-md text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a portfolio...</option>
                {portfolios.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-400">
                Crisis Scenario
              </label>
              <select
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value)}
                className="w-full mt-2 p-2 border rounded-md text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SCENARIOS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
                <option value="custom">Custom Scenario</option>
              </select>
            </div>

            <div className="rounded-lg border bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-800">
                Active Scenario Window
              </p>
              <p className="mt-1 text-slate-600">
                {selectedScenarioData.startDate || "N/A"} →{" "}
                {selectedScenarioData.endDate || "N/A"}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {selectedScenarioData.description || "No description available."}
              </p>
            </div>

            <div className="space-y-3 rounded-lg border bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase text-slate-400">
                Custom Scenario Creation
              </p>

              <input
                type="text"
                placeholder="Scenario name"
                value={customScenarioName}
                onChange={(e) => setCustomScenarioName(e.target.value)}
                className="w-full p-2 border rounded-md text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
              />

              <textarea
                placeholder="Description"
                value={customScenarioDescription}
                onChange={(e) => setCustomScenarioDescription(e.target.value)}
                rows={3}
                className="w-full p-2 border rounded-md text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div>
                <label className="text-xs font-medium text-slate-500">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500">
                  End Date
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <Button
                className="w-full"
                variant="outline"
                onClick={handleApplyCustomScenario}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Apply Custom Scenario
              </Button>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-400 mb-2 block">
                Timeline View
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={!isZoomed ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsZoomed(false)}
                >
                  Full
                </Button>
                <Button
                  variant={isZoomed ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsZoomed(true)}
                >
                  Crash
                </Button>
              </div>
            </div>

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 shadow-lg"
              onClick={handleUpdateSimulation}
            >
              Update Simulation
            </Button>

            <Button
              className="w-full"
              variant="outline"
              onClick={handleSaveRun}
              disabled={!selectedPortfolio || isSavingRun}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSavingRun ? "Saving..." : "Save This Run"}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 text-white border-slate-800">
          <CardHeader className="pb-2 text-center">
            <CardTitle className="text-slate-400 text-sm">
              Vulnerability Score
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pb-6">
            <div className="text-6xl font-bold text-red-500">85</div>
            <div className="text-xs text-slate-400 uppercase mt-2">
              Critical Exposure
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History size={18} />
              Run History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingRuns ? (
              <p className="text-sm text-slate-500">Loading saved runs...</p>
            ) : runHistory.length === 0 ? (
              <p className="text-sm text-slate-500">No saved runs yet.</p>
            ) : (
              runHistory.map((run) => (
                <div
                  key={run.id}
                  className="rounded-lg border p-3 space-y-2"
                >
                  <div>
                    <p className="font-medium text-sm text-slate-900">
                      {run.scenario_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {run.start_date || "N/A"} → {run.end_date || "N/A"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(run.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReopenRun(run)}
                    >
                      Reopen
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteRun(run.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="col-span-12 md:col-span-9 flex flex-col gap-6">
        <Card className="flex-1 min-h-[450px]">
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <CardTitle className="capitalize flex items-center gap-2">
              <ShieldAlert size={20} className="text-red-500" />
              {selectedScenarioData.label} Impact
            </CardTitle>

            <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full flex gap-2">
              <Calendar size={14} />
              {isZoomed ? "Crisis Window" : "Full Context"}
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <PerformanceChart
              scenarioId={selectedScenarioData.id}
              isZoomed={isZoomed}
              startDate={selectedScenarioData.startDate}
              endDate={selectedScenarioData.endDate}
              portfolioId={selectedPortfolio}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sector Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-green-50 rounded text-green-700 text-sm">
                <span>Utilities (Hedge)</span>
                <span>+2.1%</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-red-50 rounded text-red-700 text-sm">
                <span>Technology (Aggressive)</span>
                <span>-18.4%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-100">
            <CardHeader>
              <CardTitle className="text-blue-900 text-base flex items-center gap-2">
                <Bot size={18} />
                Analysis Insight
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-800/80 italic">
                "Warning: This portfolio is 80% concentrated in Tech. During{" "}
                {selectedScenarioData.label}, similar portfolios saw a 40%
                drawdown."
              </p>
            </CardContent>
          </Card>
        </div>
        <NewsPanel
          portfolioId={selectedPortfolio}
          scenarioId={selectedScenarioData.id}
        />
      </div>
    </div>
  );
}