"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Table, Loader2 } from "lucide-react";
import { fetchScenarioAnalysis } from "@/lib/api";

type ChartPoint = {
  date: string;
  portfolio: number;
  market: number;
};

interface PerformanceChartProps {
  scenarioId: string;
  isZoomed: boolean;
  startDate?: string;
  endDate?: string;
  portfolioId?: string;
  portfolioName?: string;
  onMetricsUpdate?: (metrics: any) => void;
  markers?: { date: string; label: string }[];

  // NEW OPTIONAL PROPS
  // If provided, component will use these instead of fetching internally
  data?: ChartPoint[];
  isLoading?: boolean;
  error?: string | null;
}

export default function PerformanceChart({
  scenarioId,
  isZoomed,
  startDate,
  endDate,
  portfolioId,
  portfolioName,
  onMetricsUpdate,
  markers = [],

  data: externalData,
  isLoading: externalLoading,
  error: externalError,
}: PerformanceChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const [internalData, setInternalData] = useState<ChartPoint[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState("");

  const hasExternalControl = externalData !== undefined || externalLoading !== undefined || externalError !== undefined;

  useEffect(() => {
    async function loadAnalysis() {
      // If parent is controlling the chart, skip old fetch logic
      if (hasExternalControl) return;
      if (!portfolioId || !startDate || !endDate || !scenarioId) return;

      try {
        setInternalLoading(true);
        setInternalError("");

        const result = await fetchScenarioAnalysis(portfolioId, startDate, endDate, scenarioId);

        if (result && Array.isArray(result.data)) {
          setInternalData(result.data);
        } else {
          setInternalData(Array.isArray(result) ? result : []);
        }

        if (onMetricsUpdate && result.metrics) {
          onMetricsUpdate(result.metrics);
        }
      } catch (err) {
        console.error("Chart fetch error:", err);
        setInternalError("Failed to load historical data for this scenario.");
      } finally {
        setInternalLoading(false);
      }
    }

    loadAnalysis();
  }, [
    portfolioId,
    startDate,
    endDate,
    scenarioId,
    onMetricsUpdate,
    hasExternalControl,
  ]);

  const resolvedData = useMemo<ChartPoint[]>(() => {
    if (externalData !== undefined) return externalData;
    return internalData;
  }, [externalData, internalData]);

  const resolvedLoading = externalLoading !== undefined ? externalLoading : internalLoading;
  const resolvedError = externalError !== undefined ? externalError ?? "" : internalError;

  const displayData = useMemo<ChartPoint[]>(() => {
    if (!Array.isArray(resolvedData) || resolvedData.length === 0) return [];

    if (!isZoomed) return resolvedData;

    const quarterLength = Math.floor(resolvedData.length / 4);
    return resolvedData.slice(quarterLength, resolvedData.length - quarterLength);
  }, [resolvedData, isZoomed]);

  function exportCSV() {
    if (!Array.isArray(displayData) || displayData.length === 0) return;

    const headers = ["Date", "Portfolio", "Market"];
    const rows = displayData.map((point) => [point.date, point.portfolio, point.market]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    const dateSuffix = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `${scenarioId || "analysis"}-${dateSuffix}-data.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  async function exportPNG() {
    if (!chartRef.current) return;

    try {
      const dataUrl = await toPng(chartRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });

      const link = document.createElement("a");
      const dateSuffix = new Date().toISOString().slice(0, 10);
      link.download = `${scenarioId || "analysis"}-${dateSuffix}-chart.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Failed to export chart as PNG:", error);
    }
  }

  if (resolvedLoading) {
    return (
      <div className="w-full h-[450px] flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
        <Loader2 className="h-8 w-8 animate-spin mb-4 text-blue-500" />
        <p>Crunching historical data...</p>
      </div>
    );
  }

  if (resolvedError) {
    return (
      <div className="w-full h-[450px] flex items-center justify-center text-red-500 bg-red-50 rounded-xl border border-red-100 px-6 text-center">
        <p>{resolvedError}</p>
      </div>
    );
  }

  if (!Array.isArray(displayData) || displayData.length === 0) {
    return (
      <div className="w-full h-[450px] flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-slate-100 text-center px-6">
        <p>No historical data available for this timeline.</p>
        <p className="text-xs mt-2">
          Note: Some stocks in this portfolio may not have existed during this crisis.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Table className="mr-2 h-4 w-4" />
          Export CSV
        </Button>

        <Button variant="outline" size="sm" onClick={exportPNG}>
          <ImageIcon className="mr-2 h-4 w-4" />
          Export PNG
        </Button>
      </div>

      <div className="rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <div>
          <span className="font-medium text-slate-800">Scenario:</span>{" "}
          {scenarioId || "N/A"}
        </div>
        <div>
          <span className="font-medium text-slate-800">Portfolio:</span>{" "}
          {portfolioName || "Not selected"}
        </div>
        <div>
          <span className="font-medium text-slate-800">Window:</span>{" "}
          {startDate || "N/A"} → {endDate || "N/A"}
        </div>
      </div>

      <div ref={chartRef} className="w-full rounded-xl bg-white pt-2 pb-6">
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={displayData} margin={{ top: 30, right: 15, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPort" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              padding={{ left: 10, right: 10 }}
            />

            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={["auto", "auto"]}
              tickFormatter={(value) => `${value}`}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
              }}
              itemStyle={{ color: "#fff" }}
              formatter={(value: any, name: any) => [Number(value || 0).toFixed(2), name]}
            />

            <Area
              type="monotone"
              dataKey="market"
              stroke="#cbd5e1"
              fill="transparent"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="S&P 500 (SPY)"
            />

            <Area
              type="monotone"
              dataKey="portfolio"
              stroke="#2563eb"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorPort)"
              name="Your Portfolio"
              animationDuration={1500}
            />

            {markers.map((marker, index) => {
              const staggerLevel = index % 3;
              const verticalPush = staggerLevel * 20;

              const isLastMarker = index === markers.length - 1;
              const textPosition = isLastMarker ? "insideTopRight" : "insideTopLeft";
              const horizontalPush = isLastMarker ? -5 : 5;

              return (
                <ReferenceLine
                  key={`marker-${index}`}
                  x={marker.date}
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  label={{
                    position: textPosition,
                    value: marker.label,
                    fill: "#ef4444",
                    fontSize: 11,
                    fontWeight: 600,
                    dy: verticalPush,
                    dx: horizontalPush,
                  }}
                />
              );
            })}

            {isZoomed && (
              <ReferenceLine
                x="Bottom"
                stroke="#ef4444"
                label={{
                  position: "insideTopLeft",
                  value: "Max Drawdown",
                  fill: "#ef4444",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="max-h-[250px] overflow-y-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Portfolio Index</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">S&P 500 Index</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(displayData) &&
              displayData.map((point) => (
                <tr key={point.date} className="border-t">
                  <td className="px-4 py-2">{point.date}</td>
                  <td className="px-4 py-2 font-medium">{point.portfolio.toFixed(2)}</td>
                  <td className="px-4 py-2 text-slate-500">{point.market.toFixed(2)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}