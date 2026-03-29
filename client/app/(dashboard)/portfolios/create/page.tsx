"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPortfolio, addHoldings } from "@/lib/api";
import { TickerSearch } from "@/components/ui/TickerSearch"; // Import the new component
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Upload, Save, Loader2 } from "lucide-react";

export default function CreatePortfolioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  
  const [manualHoldings, setManualHoldings] = useState([
    { ticker: "", shares: "", price: "" }
  ]);

  const addManualRow = () => {
    setManualHoldings([...manualHoldings, { ticker: "", shares: "", price: "" }]);
  };

  const removeManualRow = (index: number) => {
    setManualHoldings(manualHoldings.filter((_, i) => i !== index));
  };

  const updateManualRow = (index: number, field: string, value: string) => {
    const newHoldings = [...manualHoldings];
    // value = ticker symbol 
    newHoldings[index] = { ...newHoldings[index], [field]: value };
    setManualHoldings(newHoldings);
  };

  const handleCreatePortfolio = async () => {
    if (!name) return alert("Please give your portfolio a name.");
    setLoading(true);
    const invalidRows: number[] = [];

    try {
      await Promise.all(
        manualHoldings.map(async (h, index) => {
        if (!h.ticker) return null;

        try {
          const res = await fetch(`http://localhost:8000/tickers/search?q=${h.ticker}`);
          const data = await res.json();

          if (!Array.isArray(data) || data.length ===0)
          {
            invalidRows.push(index + 1);
          }
        } catch (err) {
          invalidRows.push(index + 1);
        }

      })
    );

    if (invalidRows.length > 0) {
      // Sort them so the message looks nice: "Rows 1, 3"
      const sortedRows = invalidRows.sort((a, b) => a - b);
      throw new Error(`Invalid or unknown tickers found on row(s): ${sortedRows.join(", ")}`);
    }

      const portfolio = await createPortfolio(name, description);
      
      const holdingsData = manualHoldings
        .filter(h => h.ticker && h.shares)
        .map(h => ({
          ticker: h.ticker,
          shares: parseFloat(h.shares),
          avg_price_paid: parseFloat(h.price || "0"),
        }));

      await addHoldings(portfolio.id, holdingsData);
      router.push("/portfolios");
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header and Basic Info Card remain the same as your original code */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Create Portfolio</h1>
          <p className="text-slate-500">Add a name and your assets to get started.</p>
        </div>
        <Button onClick={handleCreatePortfolio} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
          {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={18} />}
          Save Portfolio
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Portfolio Name</label>
            <Input placeholder="e.g. My Tech Stocks" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description (Optional)</label>
            <Input placeholder="e.g. Focus on AI and semiconductors" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="csv">Upload CSV</TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Holdings</CardTitle>
                <Button variant="outline" size="sm" onClick={addManualRow}>
                  <Plus size={16} className="mr-1" /> Add Row
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-4 text-xs font-bold text-slate-500 px-2">
                  <div>TICKER</div>
                  <div>SHARES</div>
                  <div>AVG PRICE</div>
                  <div></div>
                </div>
                {manualHoldings.map((row, index) => (
                  <div key={index} className="grid grid-cols-4 gap-4 items-center border-b pb-2 last:border-0">
                    {/* UPDATED: Replaced Input with TickerSearch */}
                    <TickerSearch 
                      value={row.ticker} 
                      onChange={(val) => updateManualRow(index, "ticker", val)} 
                    />
                    <Input 
                      type="number" 
                      placeholder="10" 
                      value={row.shares}
                      onChange={(e) => updateManualRow(index, "shares", e.target.value)}
                    />
                    <Input 
                      type="number" 
                      placeholder="150.00" 
                      value={row.price}
                      onChange={(e) => updateManualRow(index, "price", e.target.value)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeManualRow(index)}>
                      <Trash2 size={18} className="text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* CSV Tab content remains the same */}
      </Tabs>
    </div>
  );
}