"use client";

import React, { useState, useEffect } from "react";
import { 
  ArrowRight, ShieldAlert, BarChart3, Zap, TrendingDown, Newspaper, 
  ChevronRight, Activity, History, LineChart, X, Brain, Filter, Target, 
  Cpu, Droplets, Landmark
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// --- DATA ---
const TICKERS = [
  { symbol: "SPY", name: "S&P 500 ETF", price: 502.44, change: "+0.32%", trend: "up" },
  { symbol: "BTC", name: "Bitcoin", price: 48210.50, change: "-1.24%", trend: "down" },
  { symbol: "VIX", name: "Volatility Index", price: 14.22, change: "+4.12%", trend: "up" },
];

const SCENARIOS = [
  "Black Monday (1987)", "Dotcom Bubble (2000)", "9/11 Market Shock",
  "Great Recession (2008)", "Flash Crash (2010)", "Oil Collapse (2014)",
  "Inflationary Bear (2022)", "GameStop Squeeze", "Great Depression",
];

// --- CARD 1: MARKET RADAR ---
const LiveTicker = () => {
  const [index, setIndex] = useState(0);
  const [displayPrice, setDisplayPrice] = useState(TICKERS[0].price);

  useEffect(() => {
    const timer = setInterval(() => {
      const nextIndex = (index + 1) % TICKERS.length;
      setIndex(nextIndex);
      setDisplayPrice(TICKERS[nextIndex].price);
    }, 8000);
    return () => clearInterval(timer);
  }, [index]);

  const current = TICKERS[index];

  return (
    <div className="mt-auto bg-slate-950 rounded-2xl p-4 border border-slate-800 relative overflow-hidden">
      <div className={`absolute -right-4 -top-4 w-20 h-20 blur-3xl opacity-20 ${current.trend === 'up' ? 'bg-green-500' : 'bg-red-500'}`} />
      <AnimatePresence mode="wait">
        <motion.div key={current.symbol} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-blue-400 tracking-widest">{current.symbol}</span>
            <div className={`h-1.5 w-1.5 rounded-full ${current.trend === 'up' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
          </div>
          <h2 className="text-2xl font-black text-white leading-none">${displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
          <p className="text-slate-500 text-[10px] mt-1 truncate">{current.name}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// --- CARD 3: INTELLIGENCE ---
const SignalNoise = () => {
  const sectors = [
    { name: "Tech", icon: <Cpu size={12}/>, sentiment: 78 },
    { name: "Energy", icon: <Droplets size={12}/>, sentiment: 34 },
    { name: "Finance", icon: <Landmark size={12}/>, sentiment: 52 }
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col h-full hover:border-blue-300 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-blue-600" />
          <h4 className="font-bold text-lg text-slate-900">Intelligence</h4>
        </div>
        <div className="bg-red-50 px-2 py-0.5 rounded-full text-[9px] font-bold text-red-600 uppercase">Alerts Active</div>
      </div>
      <div className="grid grid-cols-2 gap-4 flex-1">
        <div className="space-y-2">
           <span className="text-[10px] font-bold text-slate-400 uppercase">Signals</span>
           <div className="text-[10px] font-bold text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">Yield Inversion</div>
           <div className="text-[10px] font-bold text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">VIX Spike</div>
        </div>
        <div className="space-y-3">
           <span className="text-[10px] font-bold text-slate-400 uppercase">Sectors</span>
           {sectors.map((s) => (
             <div key={s.name} className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-600">
                   <span>{s.name}</span>
                   <span>{s.sentiment}%</span>
                </div>
                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                   <div className={`h-full ${s.sentiment > 50 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${s.sentiment}%` }} />
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

// --- CARD 2: LIBRARY ---
const CrisisLibrary = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div onClick={() => !isOpen && setIsOpen(true)} className={`relative overflow-hidden transition-all duration-500 rounded-3xl p-6 shadow-xl cursor-pointer h-full flex flex-col items-center justify-center ${isOpen ? "bg-slate-900 ring-2 ring-blue-500" : "bg-blue-600"}`}>
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.div key="f" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 text-white text-center">
            <ShieldAlert size={32} />
            <h4 className="font-bold text-xl tracking-tight">Crisis Library</h4>
            <p className="text-blue-100 text-[11px] opacity-80">Explore 15+ Crashes</p>
          </motion.div>
        ) : (
          <motion.div key="b" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full flex flex-col h-full text-white">
            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
              <span className="font-bold text-sm text-blue-400">Scenarios</span>
              <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 text-center scrollbar-hide">
              {SCENARIOS.map((name, i) => (
                <div key={i} className="py-2 text-[12px] text-slate-400 hover:text-white transition-colors">{name}</div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- CARD 4: MONTE CARLO ---
const MonteCarlo = () => {
  return (
    <div className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative h-full">
       <div className="z-10 max-w-sm">
          <div className="flex items-center gap-2 mb-2">
            <LineChart size={16} className="text-blue-400" />
            <span className="text-blue-400 font-bold text-[10px] uppercase tracking-widest">Projection Engine</span>
          </div>
          <h3 className="text-3xl font-black mb-3 tracking-tighter leading-none">Monte Carlo</h3>
          <p className="text-slate-400 text-[11px] leading-relaxed mb-4">
            10,000+ path-dependent simulations using Brownian motion to project your "Cone of Uncertainty."
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
               <div className="text-[9px] font-bold text-slate-500 uppercase mb-1">Tail Risk</div>
               <div className="text-lg font-mono text-red-400">-$12.4k</div>
            </div>
            <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
               <div className="text-[9px] font-bold text-slate-500 uppercase mb-1">Recovery</div>
               <div className="text-lg font-mono text-green-400">14 Mo.</div>
            </div>
          </div>
       </div>
       <div className="relative flex-1 w-full h-32 md:h-full flex items-center justify-center px-4">
          <svg viewBox="0 0 200 100" className="w-full h-full opacity-40">
            <path d="M 0 50 L 200 10 L 200 90 Z" fill="rgba(59, 130, 246, 0.1)" stroke="rgba(59, 130, 246, 0.3)" />
            <path d="M 0 50 L 200 45" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 2" />
          </svg>
          <div className="absolute top-0 right-4 text-[8px] text-blue-400 font-mono">+95% Upper</div>
          <div className="absolute bottom-0 right-4 text-[8px] text-red-400 font-mono">-95% Risk</div>
       </div>
    </div>
  );
};

export default function LandingPage() {
  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <section className="container mx-auto px-6 pt-20 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[11px] font-bold mb-6">
          <Zap size={14} /> 2026 Analytics Operational
        </div>
        <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-slate-900 mb-6 leading-[0.9]">
          Study the <span className="text-blue-600">Past.</span><br/>Survive the <span className="text-blue-600">Future.</span>
        </h1>
        <div className="mt-8 flex justify-center">
          <Link href="/signup">
            <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200">
              Launch Simulator <ArrowRight className="ml-2" size={18} />
            </Button>
          </Link>
        </div>
      </section>

      <section className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 auto-rows-[250px]">
          {/* Card 1: Radar */}
          <div className="md:col-span-4 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-all">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <BarChart3 size={20} className="text-blue-600" />
                </div>
                <div>
                   <h3 className="text-lg font-bold text-slate-900">Market Radar</h3>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Live Feed</p>
                </div>
             </div>
             <LiveTicker />
          </div>

          {/* Card 3: Intelligence */}
          <div className="md:col-span-5">
            <SignalNoise />
          </div>

          {/* Card 2: Library */}
          <div className="md:col-span-3 md:row-span-2">
            <CrisisLibrary />
          </div>

          {/* Card 4: Monte Carlo */}
          <div className="md:col-span-9">
            <MonteCarlo />
          </div>
        </div>
      </section>
    </div>
  );
}