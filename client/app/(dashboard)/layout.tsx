import Sidebar from "@/components/ui/Navbar";
import ProtectedRoute from "@/components/ui/ProtectedRoute";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <div className="w-full border-b bg-white">
          <Sidebar />
        </div>
        <main className="flex-1 container mx-auto p-8">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
