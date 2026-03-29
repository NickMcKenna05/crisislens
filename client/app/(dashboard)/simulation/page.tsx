"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge"; // If you deleted this earlier, use <span> or install it again
import { Send, Bot, AlertTriangle, TrendingDown, TrendingUp, Activity, Sparkles } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// --- MOCK DATA FOR FORECAST (Fan Chart) ---
const forecastData = [
  { month: "Now", bear: 100000, base: 100000, bull: 100000 },
  { month: "1M", bear: 92000, base: 101500, bull: 108000 },
  { month: "2M", bear: 88000, base: 103000, bull: 115000 },
  { month: "3M", bear: 85000, base: 104500, bull: 121000 },
  { month: "4M", bear: 82000, base: 106000, bull: 128000 },
  { month: "5M", bear: 79000, base: 107500, bull: 135000 },
  { month: "6M", bear: 76000, base: 109000, bull: 142000 },
];

export default function SimulationPage() {
  const [timeframe, setTimeframe] = useState("6M");
  const [prompt, setPrompt] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  // Fake AI Handler
  const handleSimulate = () => {
    if (!prompt) return;
    setIsTyping(true);
    
    // Simulate API delay
    setTimeout(() => {
      setIsTyping(false);
      setSimulationResult({
        title: "Impact Analysis: " + prompt,
        projectedLoss: "-12.4%",
        recoveryTime: "8 Months",
        impactedSectors: [
            { name: "Insurance", change: "-15%", status: "critical" },
            { name: "Real Estate", change: "-8.2%", status: "negative" },
            { name: "Construction", change: "+4.1%", status: "positive" }, // Reconstruction boom
        ],
        summary: "This scenario creates a dual-shock: immediate claims payouts hit the insurance sector, while regional instability drops real estate values. However, construction sees a mid-term boost due to rebuilding efforts."
      });
    }, 1500);
  };

  return (
    <div className="space-y-8 h-full">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <Activity className="text-blue-600"/> Simulation Lab
            </h1>
            <p className="text-slate-500 mt-1">
                Project future performance or use AI to generate custom "Black Swan" crisis scenarios.
            </p>
        </div>
      </div>

      {/* SECTION 1: STANDARD FORECAST (Monte Carlo) */}
      <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Portfolio Trajectory (Monte Carlo)</CardTitle>
                    <CardDescription>
                        Projected range of returns based on current volatility (95% Confidence Interval).
                    </CardDescription>
                </div>
                <Tabs defaultValue="6M" className="w-[300px]" onValueChange={setTimeframe}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="1M">1 Month</TabsTrigger>
                        <TabsTrigger value="6M">6 Months</TabsTrigger>
                        <TabsTrigger value="1Y">1 Year</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
        </CardHeader>
        <CardContent className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorBull" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorBear" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" tickFormatter={(val) => `$${val/1000}k`} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <Tooltip />
                    
                    {/* The "Cone of Uncertainty" */}
                    <Area type="monotone" dataKey="bull" stroke="#22c55e" fillOpacity={1} fill="url(#colorBull)" name="Best Case" />
                    <Area type="monotone" dataKey="base" stroke="#3b82f6" fill="none" strokeWidth={3} name="Likely Path" />
                    <Area type="monotone" dataKey="bear" stroke="#ef4444" fillOpacity={1} fill="url(#colorBear)" name="Worst Case" />
                </AreaChart>
            </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* SECTION 2: THE CHAOS LAB (AI Agent) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[500px]">
         
         {/* LEFT: Chat Interface */}
         <div className="col-span-12 md:col-span-5 flex flex-col h-full">
            <Card className="h-full flex flex-col bg-slate-900 border-slate-800 text-white">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-400">
                        <Sparkles size={20}/> Chaos Agent
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                        Describe a specific event (e.g. "President dies", "Earthquake in CA"). 
                        The AI will calculate the market shock.
                    </CardDescription>
                </CardHeader>
                
                {/* Chat History Area */}
                <CardContent className="flex-1 bg-slate-950/50 mx-6 mb-4 rounded-lg p-4 space-y-4 overflow-y-auto">
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                            <Bot size={16} />
                        </div>
                        <div className="bg-slate-800 p-3 rounded-lg text-sm text-slate-200">
                            I am ready. What "Black Swan" event would you like to simulate today?
                        </div>
                    </div>
                    {/* User Message (Visual only for now) */}
                    {simulationResult && (
                         <div className="flex gap-3 flex-row-reverse">
                            <div className="bg-blue-600 p-3 rounded-lg text-sm text-white">
                                {simulationResult.title.replace("Impact Analysis: ", "")}
                            </div>
                        </div>
                    )}
                     {/* AI Response */}
                    {simulationResult && (
                        <div className="flex gap-3">
                             <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                                <Bot size={16} />
                            </div>
                            <div className="bg-slate-800 p-3 rounded-lg text-sm text-slate-200">
                                Analysis complete. I have projected the impact on the dashboard to the right.
                            </div>
                        </div>
                    )}
                    {isTyping && (
                        <div className="flex gap-2 text-slate-500 text-xs items-center ml-12">
                            <span className="animate-pulse">Thinking...</span>
                        </div>
                    )}
                </CardContent>

                {/* Input Area */}
                <div className="p-4 border-t border-slate-800 flex gap-2">
                    <Input 
                        placeholder="E.g. Earthquake in California..." 
                        className="bg-slate-800 border-slate-700 text-white"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSimulate()}
                    />
                    <Button onClick={handleSimulate} className="bg-blue-600 hover:bg-blue-700">
                        <Send size={18}/>
                    </Button>
                </div>
            </Card>
         </div>

         {/* RIGHT: Results Dashboard */}
         <div className="col-span-12 md:col-span-7 h-full">
            {simulationResult ? (
                <Card className="h-full flex flex-col border-blue-200 bg-blue-50/30">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                             <div>
                                <CardTitle className="text-xl text-slate-900">Projected Impact</CardTitle>
                                <CardDescription>Based on: <span className="font-semibold text-slate-700">"{simulationResult.title}"</span></CardDescription>
                             </div>
                             <div className="text-right">
                                <div className="text-3xl font-bold text-red-600">{simulationResult.projectedLoss}</div>
                                <div className="text-xs text-slate-500 uppercase font-bold">Portfolio Value</div>
                             </div>
                        </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-6 pt-4">
                        {/* Summary Box */}
                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                            <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                                <Bot size={16} className="text-blue-600"/> Agent Summary
                            </h4>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                {simulationResult.summary}
                            </p>
                        </div>

                        {/* Sector Heatmap List */}
                        <div>
                            <h4 className="font-bold text-slate-900 mb-3 text-sm uppercase tracking-wide">Sector Impact</h4>
                            <div className="space-y-3">
                                {simulationResult.impactedSectors.map((sector: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-md border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            {sector.status === "critical" ? <TrendingDown className="text-red-500" size={20}/> : 
                                             sector.status === "negative" ? <TrendingDown className="text-orange-500" size={20}/> :
                                             <TrendingUp className="text-green-500" size={20}/>
                                            }
                                            <span className="font-medium text-slate-800">{sector.name}</span>
                                        </div>
                                        <span className={`font-bold ${
                                            sector.status === "critical" ? "text-red-600" : 
                                            sector.status === "negative" ? "text-orange-600" : "text-green-600"
                                        }`}>
                                            {sector.change}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recovery Estimate */}
                        <div className="flex items-center gap-2 text-sm text-slate-500 pt-2">
                            <Activity size={16}/> Estimated Recovery Time: <span className="font-bold text-slate-900">{simulationResult.recoveryTime}</span>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                /* EMPTY STATE (Before running simulation) */
                <Card className="h-full flex flex-col items-center justify-center text-center p-8 border-dashed border-2 border-slate-200 bg-slate-50/50">
                    <div className="bg-slate-100 p-4 rounded-full mb-4">
                        <AlertTriangle size={32} className="text-slate-400"/>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-600">No Scenario Running</h3>
                    <p className="text-slate-400 max-w-sm mt-2">
                        Use the chat panel on the left to describe a hypothetical crisis. The AI will analyze the impact on your specific holdings.
                    </p>
                </Card>
            )}
         </div>

      </div>

    </div>
  );
}