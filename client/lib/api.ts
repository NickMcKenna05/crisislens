import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const API_URL = "http://localhost:8000";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * HELPER: Get fresh auth headers
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

export type Holding = {
  id: string;
  ticker: string;
  shares: number;
  avg_price_paid?: number | null;
  current_price?: number | null;
  sector?: string | null;
  industry?: string | null;
};

export type Portfolio = {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  created_at: string;
  holdings: Holding[];
};

export type PortfolioHistoryPoint = {
  time: string;
  value: number;
};

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

export type CustomScenario = {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  created_at: string;
};

export type RiskMetrics = {
  volatility: number;
  max_drawdown: number;
  sharpe_ratio: number;
  annualized_return: number;
};

export type SectorAttributionItem = {
  sector: string;
  weight: number;
  returnContribution: number;
  riskContribution: number;
};

export type RiskGauge = {
  score: number;
  label: "Low" | "Moderate" | "High" | string;
};

export type ScenarioChartPoint = {
  date: string;
  portfolio: number;
  market: number;
};

export type ScenarioSummaryMetrics = {
  vulnerabilityScore: number;
  portfolioBeta: number;
  maxDrawdown: number;
  marketDrawdown: number;
  topHedge: string;
  topRisk: string;
};

export type ScenarioAnalysisResponse = {
  data: ScenarioChartPoint[];
  metrics: ScenarioSummaryMetrics;
  riskMetrics: RiskMetrics;
  sectorAttribution: SectorAttributionItem[];
  riskGauge: RiskGauge;
};

export type NewsArticle = {
  title: string;
  publisher: string;
  link: string;
  published_at: number;
  sentiment: "positive" | "negative" | "neutral";
  confidence: number;
  scenario_relevant: boolean;
};

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
  by_ticker: Record<
    string,
    {
      articles: NewsArticle[];
      counts: { positive: number; negative: number; neutral: number };
    }
  >;
};

/**
 * PORTFOLIO ACTIONS
 */

export async function fetchPortfolios(): Promise<Portfolio[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/portfolios/`, { headers });

  if (!res.ok) throw new Error("Failed to fetch portfolios");
  return res.json();
}

export async function fetchPortfolioById(id: string): Promise<Portfolio> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/portfolios/${id}`, { headers });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail || "Unauthorized access to portfolio");
  }

  return res.json();
}

export async function createPortfolio(
  name: string,
  description: string
): Promise<Portfolio> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/portfolios/`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name, description }),
  });

  if (!res.ok) throw new Error("Failed to create portfolio");
  return res.json();
}

export async function deletePortfolio(id: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/portfolios/${id}`, {
    method: "DELETE",
    headers,
  });

  if (!res.ok) throw new Error("Failed to delete portfolio");
}

export async function fetchPortfolioHistory(
  id: string,
  period?: string,
  start?: string,
  end?: string
): Promise<PortfolioHistoryPoint[]> {
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
 * ANALYSIS RUN HISTORY ACTIONS
 */

export async function saveAnalysisRun(
  payload: AnalysisRunPayload
): Promise<AnalysisRun> {
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

export async function fetchAnalysisRunById(
  runId: string
): Promise<AnalysisRun> {
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

export async function deleteAnalysisRun(runId: string): Promise<void> {
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
 * CUSTOM SCENARIOS
 */

export async function createCustomScenario(payload: {
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
}): Promise<CustomScenario> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/portfolios/custom-scenarios`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail || "Failed to create custom scenario");
  }

  return res.json();
}

export async function fetchCustomScenarios(): Promise<CustomScenario[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/portfolios/custom-scenarios`, { headers });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail || "Failed to fetch custom scenarios");
  }

  return res.json();
}

/**
 * TICKER SEARCH
 */

export async function searchTickers(query: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${API_URL}/tickers/search?q=${encodeURIComponent(query)}`,
    { headers }
  );

  if (!res.ok) return [];
  return res.json();
}

/**
 * NEWS
 */

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

/**
 * SCENARIO ANALYSIS
 */

export async function fetchScenarioAnalysis(
  portfolioId: string,
  start: string,
  end: string,
  scenario: string
): Promise<ScenarioAnalysisResponse> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({ start, end, scenario });

  const res = await fetch(
    `${API_URL}/portfolios/${portfolioId}/analyze?${params.toString()}`,
    { headers }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail || "Failed to fetch scenario analysis");
  }

  const data = await res.json();

  return {
    data: data.data ?? [],
    metrics: data.metrics ?? {
      vulnerabilityScore: 0,
      portfolioBeta: 0,
      maxDrawdown: 0,
      marketDrawdown: 0,
      topHedge: "Diversified",
      topRisk: "Diversified",
    },
    riskMetrics: data.riskMetrics ?? {
      volatility: 0,
      max_drawdown: 0,
      sharpe_ratio: 0,
      annualized_return: 0,
    },
    sectorAttribution: data.sectorAttribution ?? [],
    riskGauge: data.riskGauge ?? {
      score: 0,
      label: "Low",
    },
  };
}