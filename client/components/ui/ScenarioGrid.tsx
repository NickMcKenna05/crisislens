"use client";

import { useState } from "react";
import Link from "next/link";
import { MDXRemote, MDXRemoteSerializeResult } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Info, Calendar, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";

// --- CUSTOM MDX COMPONENTS ---
// This maps standard HTML/Markdown tags to your specific styling
const mdxComponents = {
  h3: (props: any) => <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3" {...props} />,
  p: (props: any) => <p className="text-slate-600 leading-relaxed text-sm mb-4" {...props} />,
  ul: (props: any) => <ul className="space-y-2 mb-4" {...props} />,
  li: (props: any) => <li className="text-sm text-slate-700 list-disc ml-4" {...props} />,

  WinnerBox: ({ children }: { children: React.ReactNode }) => (
    <div className="bg-green-50 border border-green-100 p-4 rounded-lg my-4">
      <h4 className="text-green-800 font-bold mb-2 flex items-center gap-2">🟢 Winners</h4>
      <div className="text-green-700 text-sm">{children}</div>
    </div>
  ),
  LoserBox: ({ children }: { children: React.ReactNode }) => (
    <div className="bg-red-50 border border-red-100 p-4 rounded-lg my-4">
      <h4 className="text-red-800 font-bold mb-2 flex items-center gap-2">🔴 Losers</h4>
      <div className="text-red-700 text-sm">{children}</div>
    </div>
  ),
};

export default function ScenarioGrid({ initialScenarios }: { initialScenarios: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mdxSource, setMdxSource] = useState<MDXRemoteSerializeResult | null>(null);
  const [activeMetadata, setActiveMetadata] = useState<any>(null);

  const handleOpenScenario = async (scenario: any) => {
    // 1. In a real app, you might fetch the content from an API route here
    // For now, we'll assume we pass the content in or fetch it
    const res = await fetch(`/api/scenarios/${scenario.id}`);
    const data = await res.json();
    
    // 2. Prepare the MDX string for rendering
    const mdx = await serialize(data.content);
    
    setMdxSource(mdx);
    setActiveMetadata(scenario);
    setIsOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {initialScenarios.map((scenario) => (
          <Card 
            key={scenario.id}
            className="cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all group h-full flex flex-col"
            onClick={() => handleOpenScenario(scenario)}
          >
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                  scenario.severity === "Critical" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                }`}>
                  {scenario.severity}
                </span>
                <Info size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors"/>
              </div>
              <CardTitle className="text-xl group-hover:text-blue-700 transition-colors">{scenario.title}</CardTitle>
              <CardDescription className="flex items-center gap-1 mt-1">
                <Calendar size={14}/> {scenario.dateRange}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-slate-600 text-sm line-clamp-3">{scenario.shortDescription}</p>
              <div className="mt-4 flex items-center justify-between text-sm font-medium pt-4 border-t border-slate-100">
                <span className="text-slate-500">Max Drawdown</span>
                <span className="text-red-600">{scenario.maxDrawdown}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-full sm:max-w-[900px] h-full flex flex-col p-0">
          <SheetHeader className="px-6 py-6 border-b bg-white shrink-0">
            <SheetTitle className="text-2xl font-bold text-slate-900">{activeMetadata?.title}</SheetTitle>
            <SheetDescription className="flex items-center gap-2 text-base">
                <Calendar size={16}/> {activeMetadata?.dateRange}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {mdxSource && <MDXRemote {...mdxSource} components={mdxComponents} />}
            <div className="h-10"></div>
          </div>

          <div className="p-6 border-t bg-slate-50 mt-auto shrink-0">
            <Link href={`/analysis?scenario=${activeMetadata?.id}`} className="w-full">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg">
                Simulate This Crisis <ArrowRight className="ml-2"/>
              </Button>
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}