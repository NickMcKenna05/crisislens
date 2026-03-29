"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchPortfolios, deletePortfolio } from "@/lib/api";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowRight, Wallet, Trash2, Loader2 } from "lucide-react";

export default function PortfoliosHubPage() {
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch Portfolios from FastAPI backend
  useEffect(() => {
    async function loadPortfolios() {
      setLoading(true);
      try {
        const data = await fetchPortfolios();
        setPortfolios(data || []);
      } catch (error: any) {
        console.error("Error fetching portfolios:", error.message);
      }
      setLoading(false);
    }
    loadPortfolios();
  }, []);

  // 2. Handle Deleting a Portfolio
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this portfolio? All holdings will be lost.")) return;

    try {
      await deletePortfolio(id);
      setPortfolios(portfolios.filter(p => p.id !== id));
    } catch (error: any) {
      alert("Error deleting: " + error.message);
    }
  };

  return (
    <div className="space-y-8 h-full p-4 max-w-7xl mx-auto">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Portfolio Hub</h1>
          <p className="text-slate-500 mt-1">
            Manage your holdings and select a portfolio to stress-test against historical crises.
          </p>
        </div>
        <Link href="/portfolios/create">
          <Button className="bg-blue-600 hover:bg-blue-700 gap-2 shadow-sm">
            <PlusCircle size={18} />
            Create New Portfolio
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
          <Loader2 className="animate-spin mb-4" size={48} />
          <p>Loading your portfolios...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Real Portfolio Cards */}
          {portfolios.map((portfolio) => (
            <Card key={portfolio.id} className="flex flex-col hover:shadow-lg transition-all border-slate-200 overflow-hidden relative group">
              
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600 mb-3 w-fit">
                    <Wallet size={24} />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={(e) => handleDelete(e, portfolio.id)}
                    className="text-slate-300 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
                <Link href={`/portfolios/${portfolio.id}`} className="hover:text-blue-600 transition-colors">
                  <CardTitle className="text-xl truncate">{portfolio.name}</CardTitle>
                </Link>
                <CardDescription className="line-clamp-2 min-h-[40px]">
                  {portfolio.description || "No description provided."}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 pb-4">
                <div className="flex justify-between items-end border-t pt-4">
                  <div>
                      <p className="text-xs text-slate-500 uppercase font-semibold">Status</p>
                      <p className="text-lg font-bold text-slate-900">Active</p>
                  </div>
                  <div className="text-right">
                      <p className="text-xs text-slate-500 uppercase font-semibold">Holdings</p>
                      <p className="text-sm font-medium text-slate-900">
                        {portfolio.holdings?.length || 0} Assets
                      </p>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-0">
                <Link href={`/portfolios/${portfolio.id}`} className="w-full">
                  <Button variant="outline" className="w-full gap-2 border-slate-300 hover:bg-slate-50 hover:text-blue-700">
                    View Portfolio <ArrowRight size={16} />
                  </Button>
                </Link>
              </CardFooter>
              
            </Card>
          ))}

          {/* Add Portfolio Dashed Card */}
          <Link href="/portfolios/create" className="h-full">
            <button className="group border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center p-8 hover:border-blue-400 hover:bg-blue-50/50 transition-all h-full min-h-[300px] w-full">
              <div className="p-4 bg-slate-100 rounded-full group-hover:bg-blue-100 transition-colors mb-4">
                <PlusCircle size={32} className="text-slate-400 group-hover:text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-600 group-hover:text-blue-700">Add Portfolio</h3>
              <p className="text-sm text-slate-400 text-center mt-2 max-w-[200px]">
                Import from CSV or enter tickers manually
              </p>
            </button>
          </Link>

        </div>
      )}

      {/* Empty State */}
      {!loading && portfolios.length === 0 && (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-500">You don't have any portfolios yet. Create one to get started!</p>
        </div>
      )}
    </div>
  );
}
