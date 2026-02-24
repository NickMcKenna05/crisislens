import { createClient } from "@supabase/supabase-js";

// Make sure these match your .env variable names exactly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const API_URL = "http://localhost:8000";

// Standard Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * HELPER: Get fresh Auth Headers
 */
async function getAuthHeaders() {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session?.access_token) {
    console.error("Supabase Session Error:", error);
    throw new Error("Session expired or not found. Please log in.");
  }

  return {
    "Authorization": `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

/**
 * PORTFOLIO ACTIONS
 */

export async function fetchPortfolios() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/portfolios/`, { headers });
  if (!res.ok) throw new Error("Failed to fetch portfolios");
  return res.json();
}

export async function fetchPortfolioById(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/portfolios/${id}`, { headers });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || "Unauthorized access to portfolio");
  }
  return res.json();
}

export async function createPortfolio(name: string, description: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/portfolios/`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name, description }),
  });
  if (!res.ok) throw new Error("Failed to create portfolio");
  return res.json();
}

export async function fetchPortfolioHistory(id: string, period: string) {
  const headers = await getAuthHeaders();
  // We map the UI labels (1Y) to yfinance periods (1y)
  const formattedPeriod = period.toLowerCase();
  const res = await fetch(`${API_URL}/portfolios/${id}/history?period=${formattedPeriod}`, { headers });
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}

// THIS WAS THE MISSING FUNCTION
export async function deletePortfolio(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/portfolios/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error("Failed to delete portfolio");
}

/**
 * HOLDINGS ACTIONS
 */

export async function addHoldings(
  portfolioId: string,
  holdings: { ticker: string; shares: number; avg_price_paid: number }[]
) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/portfolios/${portfolioId}/holdings`, {
    method: "POST",
    headers,
    body: JSON.stringify(holdings),
  });
  if (!res.ok) throw new Error("Failed to add holdings");
  return res.json();
}

/**
 * UTILITIES
 */

export async function searchTickers(query: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/tickers/search?q=${query}`, { headers });
  if (!res.ok) return [];
  return res.json();
}