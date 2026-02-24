"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchPortfolioById } from "@/lib/api"; 
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, ShieldAlert, Building2, Briefcase, 
  PieChart as PieIcon, Bot, Loader2, Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

export default function PortfolioDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStock, setSelectedStock] = useState<any>(null);

  useEffect(() => {
    async function getDetails() {
      try {
        const data = await fetchPortfolioById(params.id as string);
        setPortfolio(data);
      } catch (error) {
        console.error("Failed to load portfolio:", error);
      } finally {
        setLoading(false);
      }
    }
    if (params.id) getDetails();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50/30">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (!portfolio) return <div className="p-10 text-center text-slate-500">Portfolio not found.</div>;

  const holdings = portfolio.holdings || [];
  const totalValue = holdings.reduce((sum: number, h: any) => {
    const price = h.current_price || h.avg_price_paid || 0;
    return sum + (h.shares * price);
  }, 0);

  const chartData = holdings.map((h: any) => ({
    name: h.ticker,
    value: (h.current_price || h.avg_price_paid) * h.shares
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 p-6 bg-slate-50/30 min-h-screen">
      
      {/* Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-8 gap-4">
        <div className="space-y-3">
          <Button variant="ghost" onClick={() => router.push("/portfolios")} className="p-0 h-auto hover:bg-transparent text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">
            <ArrowLeft size={14} className="mr-2" /> Back to Hub
          </Button>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight">{portfolio.name}</h1>
          <div className="flex items-center gap-3">
            <p className="text-3xl font-mono font-bold text-blue-600">
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <Badge variant="outline" className="bg-white border-slate-200 text-slate-400 font-bold px-3">LIVE ENGINE</Badge>
          </div>
        </div>
        <Button 
          onClick={() => router.push(`/analysis?portfolioId=${params.id}`)}
          className="bg-red-600 hover:bg-red-700 text-white font-black py-7 px-10 rounded-2xl gap-3 shadow-2xl shadow-red-200 transition-all hover:scale-[1.02] active:scale-95"
        >
          <ShieldAlert size={20} /> INITIATE STRESS TEST
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN (8 Cols) */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          
          {/* Chart Card */}
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-8 py-6">
              <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
                 <PieIcon size={16} /> Strategy Composition
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-12 pb-8 px-8">
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      innerRadius={90}
                      outerRadius={130}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity outline-none cursor-pointer" />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.2)', padding: '16px' }}
                      formatter={(value: any) => [`$${Number(value).toLocaleString()}`, "Asset Value"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mt-8">
                {chartData.map((entry: any, index: number) => (
                  <div key={entry.name} className="flex items-center gap-2 group cursor-default">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-[11px] font-black text-slate-700 uppercase">{entry.name}</span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {((entry.value / totalValue) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Positions Table */}
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-[0.1em]">Holdings Breakdown</h3>
              <Badge variant="outline" className="text-[9px] font-black text-slate-300 border-slate-200">INTERACTIVE DATA</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-100">
                    <th className="px-8 py-4 font-bold text-[10px] uppercase tracking-widest">Asset</th>
                    <th className="px-8 py-4 font-bold text-[10px] uppercase tracking-widest text-right">Shares</th>
                    <th className="px-8 py-4 font-bold text-[10px] uppercase tracking-widest text-right">Price</th>
                    <th className="px-8 py-4 font-bold text-[10px] uppercase tracking-widest text-right">Position Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {holdings.map((h: any, i: number) => {
                    const val = (h.current_price || h.avg_price_paid) * h.shares;
                    const isActive = selectedStock?.ticker === h.ticker;
                    return (
                      <tr 
                        key={h.ticker} 
                        onClick={() => setSelectedStock(h)}
                        className={`cursor-pointer transition-all duration-200 ${isActive ? 'bg-blue-50/80 shadow-inner' : 'hover:bg-slate-50/50'}`}
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-1 h-6 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="font-black text-xl text-slate-900 tracking-tighter">{h.ticker}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right font-bold text-slate-500">{h.shares}</td>
                        <td className="px-8 py-6 text-right font-bold text-slate-900">${(h.current_price || h.avg_price_paid).toLocaleString()}</td>
                        <td className="px-8 py-6 text-right">
                          <span className="font-black text-slate-900 text-lg">${val.toLocaleString()}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN (4 Cols) - THE SCROLL FIX IS HERE */}
        <div className="col-span-12 lg:col-span-4 h-full">
          <div className="sticky top-8 space-y-6"> {/* This container is now sticky */}
            
            {selectedStock ? (
              <Card className="border-blue-200 shadow-2xl bg-white animate-in slide-in-from-bottom-4 duration-500 rounded-[2rem] overflow-hidden border-2">
                <div className="h-2 w-full bg-blue-600" />
                <CardHeader className="p-8 pb-4">
                  <div className="flex justify-between items-center mb-4">
                    <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-50 border-none font-black uppercase text-[9px] tracking-widest px-3 py-1">Stock Intel</Badge>
                    <button onClick={() => setSelectedStock(null)} className="text-slate-300 hover:text-slate-900 transition-colors text-xl font-bold">✕</button>
                  </div>
                  <CardTitle className="text-5xl font-black text-slate-900 tracking-tighter">{selectedStock.ticker}</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="grid gap-4">
                    <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                      <Building2 className="text-blue-600" size={24} />
                      <div className="space-y-0.5">
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Sector</p>
                        <p className="font-bold text-slate-900 text-sm leading-tight">{selectedStock.sector || "Tech & Growth"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                      <Briefcase className="text-blue-600" size={24} />
                      <div className="space-y-0.5">
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Industry</p>
                        <p className="font-bold text-slate-900 text-sm leading-tight">{selectedStock.industry || "Market Leading"}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 bg-amber-50 rounded-3xl space-y-3 border border-amber-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                       <Zap size={40} className="text-amber-600" fill="currentColor" />
                    </div>
                    <h4 className="text-[10px] font-black flex items-center gap-2 text-amber-700 uppercase tracking-widest">
                       CRISIS VULNERABILITY
                    </h4>
                    <p className="text-xs text-amber-900/70 font-bold leading-relaxed relative z-10">
                      As part of the <strong>{selectedStock.industry}</strong> sector, this asset will be simulated against historical volatility spikes. Higher exposure in {selectedStock.sector} typically correlates with specific drawdown patterns.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed border-2 border-slate-200 bg-white/40 h-[450px] flex flex-col items-center justify-center text-center p-12 rounded-[2rem]">
                <div className="bg-white p-6 rounded-full shadow-sm mb-6">
                  <PieIcon className="text-blue-200" size={48} />
                </div>
                <h3 className="text-slate-400 font-black uppercase text-xs tracking-[0.2em]">Select Asset</h3>
                <p className="text-slate-400/60 text-[11px] mt-4 leading-relaxed font-bold max-w-[180px]">
                  Unlock sector-specific risk intelligence by selecting a holding.
                </p>
              </Card>
            )}

            {/* System Status - Now always sits nicely below the Intel card */}
            <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-[2rem] overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-[60px] -mr-16 -mt-16" />
              <CardContent className="p-8 relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <h3 className="font-black text-lg tracking-tight uppercase text-[11px]">System Status</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-bold italic">
                  "Portfolio mapping complete. Historical benchmarks for {holdings.length} industries are synced. Ready for drawdown projection."
                </p>
              </CardContent>
            </Card>

          </div>
        </div>

      </div>
    </div>
  );
}