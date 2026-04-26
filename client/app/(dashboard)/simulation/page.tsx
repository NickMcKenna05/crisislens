"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Send, Bot, AlertTriangle, Activity, Sparkles, User, Loader2, BarChart3, Play
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { fetchPortfolios, type Portfolio } from "@/lib/api";

type UIAction = {
  type: "none" | "options" | "portfolio_select";
  choices: { id: string; label: string }[];
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  uiAction?: UIAction;
};

export default function SimulationPage() {
  const [timeframe, setTimeframe] = useState("1M");
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("");
  const [chartData, setChartData] = useState<any[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  
  // NEW: State to hold the streaming checkpoints
  const [checkpoints, setCheckpoints] = useState<string[]>([]);

  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [customActionInput, setCustomActionInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "I am ready. What \"Black Swan\" event would you like to simulate today?" }
  ]);

  // Load Portfolios on mount
  useEffect(() => {
    async function loadData() {
      const data = await fetchPortfolios();
      if (data && data.length > 0) {
        setPortfolios(data);
        setSelectedPortfolioId(data[0].id);
      }
    }
    loadData();
  }, []);

  // MANUAL TRIGGER FUNCTION WITH STREAMING LISTENER
  const handleRunSimulation = async () => {
    if (!selectedPortfolioId) return;

    setIsChartLoading(true);
    setCheckpoints([]); // Clear old terminal logs
    setChartData([]);
    setAccuracy(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://crisislens.onrender.com"}/forecast/lstm/${selectedPortfolioId}?timeframe=${timeframe}`);
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(Boolean);

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.type === "progress") {
              setCheckpoints((prev) => [...prev, data.message]);
            } else if (data.type === "result") {
              setChartData(data.chart);
              setAccuracy(data.accuracy);
            } else if (data.type === "error") {
              throw new Error(data.message);
            }
          } catch (e) {
            console.error("Failed to parse chunk:", line);
          }
        }
      }
    } catch (error) {
      console.error("Simulation failed:", error);
      alert("Simulation failed. Check console for details.");
    } finally {
      setIsChartLoading(false);
    }
  };

  const handleSendMessage = async (overrideText?: string) => {
    const textToSend = overrideText || inputText;
    if (!textToSend.trim()) return;
    const userMsg: ChatMessage = { role: "user", content: textToSend };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText("");
    setCustomActionInput("");
    setIsTyping(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://crisislens.onrender.com"}/chaos/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, portfolios, current_dashboard: simulationResult }),
      });
      const data = await response.json();
      if (data.agentMessage) {
        setMessages(prev => [...prev, { role: "assistant", content: data.agentMessage, uiAction: data.uiAction }]);
      }
      if (data.dashboardData) setSimulationResult(data.dashboardData);
    } catch (error) {
      console.error("Chaos error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="space-y-8 h-full p-6 bg-slate-50/30">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Activity className="text-blue-600" /> Simulation Lab
          </h1>
          <p className="text-slate-500 mt-1">Project performance and simulate crisis scenarios.</p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-white/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 size={18} className="text-blue-500" /> AI Trajectory
              {accuracy !== null && (
                <span className={`ml-2 text-xs font-bold px-2 py-1 rounded-full ${accuracy >= 70 ? "bg-green-100 text-green-700" :
                  accuracy >= 55 ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                  {accuracy}% price accuracy
                </span>
              )}
            </CardTitle>

            <div className="flex items-center gap-3">
              <select
                value={selectedPortfolioId}
                onChange={(e) => setSelectedPortfolioId(e.target.value)}
                className="text-xs p-2 border rounded-md bg-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                {portfolios.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <Tabs value={timeframe} className="w-[180px]" onValueChange={setTimeframe}>
                <TabsList className="grid w-full grid-cols-3 h-9">
                  <TabsTrigger value="1W" className="text-[10px]">1W</TabsTrigger>
                  <TabsTrigger value="1M" className="text-[10px]">1M</TabsTrigger>
                  <TabsTrigger value="3M" className="text-[10px]">3M</TabsTrigger>
                </TabsList>
              </Tabs>

              <Button
                onClick={handleRunSimulation}
                disabled={isChartLoading || !selectedPortfolioId}
                className="bg-blue-600 hover:bg-blue-700 h-9 px-4 text-xs font-bold flex gap-2 shadow-lg transition-all"
              >
                {isChartLoading ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} fill="currentColor" />}
                RUN
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[350px] w-full relative pt-6">
          {/* NEW: TERMINAL STREAMING UI */}
          {isChartLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] p-6">
              <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
              <div className="w-full max-w-md bg-slate-900 rounded-lg p-4 font-mono text-[10px] text-green-400 h-40 overflow-y-auto flex flex-col justify-end shadow-2xl border border-slate-800">
                {checkpoints.map((cp, idx) => (
                  <div key={idx} className="animate-in fade-in slide-in-from-bottom-2 mb-1">
                    <span className="text-slate-500 mr-2">{'>'}</span> {cp}
                  </div>
                ))}
                {/* Blinking cursor effect */}
                <div className="animate-pulse text-green-400 mt-1">_</div>
              </div>
            </div>
          )}

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorBull" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
                  <linearGradient id="colorBear" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(val) => `$${(val / 1000).toFixed(1)}k`} domain={['auto', 'auto']} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <Tooltip />
                <Area type="monotone" dataKey="bull" stroke="#22c55e" fill="url(#colorBull)" name="Bull" />
                <Area type="monotone" dataKey="base" stroke="#3b82f6" strokeWidth={2.5} fill="none" name="Base" />
                <Area type="monotone" dataKey="bear" stroke="#ef4444" fill="url(#colorBear)" name="Bear" />
              </AreaChart>
            </ResponsiveContainer>
          ) : !isChartLoading && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <BarChart3 size={48} className="mb-4 opacity-10" />
              <p className="text-sm font-medium">Select a portfolio and click RUN to generate projections.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 2: THE CHAOS LAB (Chat Logic) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[550px]">
        <div className="col-span-12 md:col-span-5 flex flex-col h-full">
          <Card className="h-full flex flex-col bg-slate-900 border-slate-800 text-white shadow-xl">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="flex items-center gap-2 text-blue-400"><Sparkles size={20} /> Chaos Agent</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 bg-slate-950/40 mx-4 mt-4 mb-2 rounded-xl p-4 space-y-4 overflow-y-auto border border-slate-800/50">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-slate-700" : "bg-blue-600"}`}>
                    {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`flex flex-col gap-2 max-w-[85%]`}>
                    <div className={`p-3 rounded-2xl text-sm ${msg.role === "user" ? "bg-blue-600" : "bg-slate-800"}`}>{msg.content}</div>
                    {idx === messages.length - 1 && !isTyping && (msg.uiAction?.choices ?? []).map(choice => (
                      <Button key={choice.id} variant="outline" className="justify-start h-auto py-2 text-xs bg-slate-800/40 border-slate-700 text-slate-300" onClick={() => handleSendMessage(choice.label)}>
                        {choice.label}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
            <div className="p-4 border-t border-slate-800 flex gap-2">
              <Input placeholder="Describe a crisis..." className="bg-slate-800 border-slate-700 text-white" value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSendMessage()} />
              <Button onClick={() => handleSendMessage()} className="bg-blue-600 hover:bg-blue-700"><Send size={18} /></Button>
            </div>
          </Card>
        </div>

        <div className="col-span-12 md:col-span-7 h-full overflow-y-auto space-y-4">
          {simulationResult ? (
            <>
              <Card className="border-blue-200 bg-blue-50/20 shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <CardTitle className="text-2xl font-bold">{simulationResult.title}</CardTitle>
                  <div className="text-3xl font-black text-red-600">{simulationResult.projectedLoss}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border mb-4 italic text-sm text-slate-600">"{simulationResult.summary}"</div>
                <p className="text-xs font-bold uppercase text-slate-400 mb-3 tracking-widest">Sector Impact</p>
                <div className="space-y-2">
                  {simulationResult.impactedSectors.map((s: any, i: number) => (
                    <div key={i} className="flex justify-between p-3 bg-white rounded-lg border">
                      <span className="font-semibold text-sm">{s.name}</span>
                      <span className={`font-bold text-sm ${s.status === 'positive' ? 'text-green-600' : 'text-red-600'}`}>{s.change}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {simulationResult.recommendations && simulationResult.recommendations.length > 0 && (
                <Card className="border-amber-200 bg-amber-50/30 shadow-lg p-6">
                  <p className="text-xs font-bold uppercase text-amber-600 mb-4 tracking-widest flex items-center gap-2">
                    <AlertTriangle size={14} /> AI Recommendations
                  </p>
                  <div className="space-y-3">
                    {simulationResult.recommendations.map((r: any, i: number) => (
                      <div key={i} className="flex items-start gap-4 p-3 bg-white rounded-lg border border-amber-100">
                        <div className={`shrink-0 mt-0.5 px-2 py-1 rounded text-xs font-black uppercase ${r.action === 'reduce' ? 'bg-red-100 text-red-700' :
                          r.action === 'increase' ? 'bg-green-100 text-green-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                          {r.action}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900">{r.ticker}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{r.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-4 italic">AI-generated suggestions only. Not financial advice.</p>
                </Card>
              )}
            </>
          ) : (
            <Card className="h-full flex flex-col items-center justify-center text-center p-12 border-dashed border-2 border-slate-200 bg-slate-50/50">
              <AlertTriangle size={48} className="text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-700">Waiting for Directives</h3>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}