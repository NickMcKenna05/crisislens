"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, PieChart, BookOpen, Activity, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { signOut } from "@/lib/auth";

export default function Navbar() {
  const { user, loading } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <nav className="border-b bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold">CL</div>
        <span className="text-xl font-bold text-slate-900">CrisisLens</span>
      </div>
      <div className="flex items-center gap-6 text-sm font-medium text-slate-600">
        <Link href="/portfolios" className="flex items-center gap-2 hover:text-blue-600"><LayoutDashboard size={18}/> Portfolio Hub</Link>
        <Link href="/analysis" className="flex items-center gap-2 hover:text-blue-600"><PieChart size={18}/> Analysis</Link>
        <Link href="/scenarios" className="flex items-center gap-2 hover:text-blue-600"><BookOpen size={18}/> Scenarios</Link>
        <Link href="/simulation" className="flex items-center gap-2 hover:text-blue-600"><Activity size={18}/> Simulation</Link>
      </div>
      <div className="flex items-center gap-4">
        {loading ? (
          <span className="text-sm text-slate-400">Loading...</span>
        ) : user ? (
          <>
            <span className="text-sm text-slate-600">{user.email}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-red-600"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </>
        ) : (
          <Link href="/login" className="text-sm font-medium hover:underline">
            Log in
          </Link>
        )}
      </div>
    </nav>
  );
}