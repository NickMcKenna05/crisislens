import Link from "next/link";
import { Button } from "@/components/ui/button";
import Footer from "./Footer"; 

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <nav className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link href="/" className="text-2xl font-black text-blue-600 tracking-tighter">
            CrisisLens
          </Link>
          
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="font-medium text-slate-600">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {children}
      </main>

      <Footer />
    </div>
  );
}