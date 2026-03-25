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
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    console.error("Supabase Session Error:", error);
    throw new Error("Session expired or not found. Please log in.");
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

/**
 * TYPES
 */

export type AnalysisRunPayload = {
  portfolio_id: string;
  scenario_id: string;
  scenario_name: string;
  start_date?: string;
  end_date?: string;
  vulnerability_score?: number;
  timeline_view?: string;
  notes?: string;
};

export type AnalysisRun = {
  id: string;
  user_id: string;
  portfolio_id: string;
  scenario_id: string;
  scenario_name: string;
  start_date?: string;
  end_date?: string;
  vulnerability_score?: number;
  timeline_view?: string;
  notes?: string;
  created_at: string;
};

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

export async function fetchPortfolioHistory(
  id: string,
  period?: string,
  start?: string,
  end?: string
) {
  const headers = await getAuthHeaders();

  const params = new URLSearchParams();

  if (start && end) {
    params.set("start", start);
    params.set("end", end);
  } else if (period) {
    params.set("period", period.toLowerCase());
  } else {
    params.set("period", "1y");
  }

  const res = await fetch(
    `${API_URL}/portfolios/${id}/history?${params.toString()}`,
    { headers }
  );

  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}

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
 * ANALYSIS RUN HISTORY ACTIONS (FR-13)
 */

export async function saveAnalysisRun(payload: AnalysisRunPayload) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/portfolios/analysis-runs`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail || "Failed to save analysis run");
  }

  return res.json();
}

export async function fetchAnalysisRuns(): Promise<AnalysisRun[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/portfolios/analysis-runs`, {
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail || "Failed to fetch analysis runs");
  }

  return res.json();
}

export async function fetchAnalysisRunById(runId: string): Promise<AnalysisRun> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/portfolios/analysis-runs/${runId}`, {
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail || "Failed to fetch analysis run");
  }

  return res.json();
}

export async function deleteAnalysisRun(runId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/portfolios/analysis-runs/${runId}`, {
    method: "DELETE",
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail || "Failed to delete analysis run");
  }
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

export async function createCustomScenario(payload: {
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/portfolios/custom-scenarios`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Failed to create custom scenario");
  return res.json();
}

export async function fetchCustomScenarios() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/portfolios/custom-scenarios`, { headers });

  if (!res.ok) throw new Error("Failed to fetch custom scenarios");
  return res.json();
}

export type NewsArticle = {
  title: string;
  publisher: string;
  link: string;
  published_at: number;
  sentiment: "positive" | "negative" | "neutral";
  confidence: number;
  scenario_relevant: boolean;
}

export type PortfolioNewsResponse = {
  portfolio_id: string;
  tickers_analyzed: string[];
  aggregate: {
    positive: number;
    negative: number;
    neutral: number;
    total: number;
    score: number;
  };
  by_ticker: Record<string, {
    articles: NewsArticle[];
    counts: { positive: number; negative: number; neutral: number };
  }>;
};

export async function fetchPortfolioNews(
  portfolioId: string,
  scenarioId?: string
): Promise<PortfolioNewsResponse> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams();
  if (scenarioId) params.set("scenario_id", scenarioId);

  const res = await fetch(
    `${API_URL}/news/portfolio/${portfolioId}?${params.toString()}`,
    { headers }
  );

  if (res.status === 503) {
    throw new Error("MODEL_LOADING");
  }

  if (!res.ok) throw new Error("Failed to fetch news");
  return res.json();
}

export async function fetchScenarioAnalysis(
  portfolioId: string,
  start: string,
  end: string,
  scenario: string
) {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({ start, end, scenario });

  const res = await fetch(
    `${API_URL}/portfolios/${portfolioId}/analyze?${params.toString()}`,
    { headers }
  );

  if (!res.ok) throw new Error("Failed to fetch scenario analysis");
  return res.json();
}