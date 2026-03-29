"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Show nothing while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-slate-400 text-sm">Loading...</span>
      </div>
    );
  }

  // Not authenticated - will redirect via useEffect
  if (!user) {
    return null;
  }

  // Authenticated - render the page
  return <>{children}</>;
}
