"use client";

import { useState } from "react";
import { fetchPortfolioNews, type PortfolioNewsResponse, type NewsArticle } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Newspaper, ExternalLink, AlertTriangle } from "lucide-react";

interface NewsPanelProps {
  portfolioId: string;
  scenarioId: string;
}

function SentimentBadge({ sentiment, confidence }: { sentiment: string; confidence: number }) {
  const config = {
    positive: { label: "Positive", className: "bg-green-100 text-green-800 border-green-200" },
    negative: { label: "Negative", className: "bg-red-100 text-red-800 border-red-200" },
    neutral:  { label: "Neutral",  className: "bg-slate-100 text-slate-600 border-slate-200" },
  }[sentiment] ?? { label: "Neutral", className: "bg-slate-100 text-slate-600 border-slate-200" };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.className}`}>
      {config.label} · {confidence}%
    </span>
  );
}

function ArticleCard({ article }: { article: NewsArticle }) {
  const date = article.published_at
    ? new Date(article.published_at * 1000).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      })
    : "Unknown date";

  return (
    <div className="rounded-lg border bg-white p-3 space-y-2">
      <div className="flex flex-wrap items-start gap-2">
        <SentimentBadge sentiment={article.sentiment} confidence={article.confidence} />
        {article.scenario_relevant && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
            Scenario Relevant
          </span>
        )}
      </div>

      <p className="text-sm font-medium text-slate-900 leading-snug">{article.title}</p>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{article.publisher} · {date}</span>
        {article.link && (
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
          >
            Read More <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

export default function NewsPanel({ portfolioId, scenarioId }: NewsPanelProps) {
  const [data, setData] = useState<PortfolioNewsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFetch() {
    if (!portfolioId) return;
    setLoading(true);
    setError(null);

    try {
      const result = await fetchPortfolioNews(portfolioId, scenarioId);
      setData(result);
    } catch (err: any) {
      if (err.message === "MODEL_LOADING") {
        setError("The AI model is warming up. Please try again in 30 seconds.");
      } else {
        setError("Failed to fetch news. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  const { aggregate } = data ?? {};
  const scoreLabel =
    !aggregate        ? null
    : aggregate.score > 20  ? "Bullish"
    : aggregate.score < -20 ? "Bearish"
    : "Mixed";

  const scoreColor =
    scoreLabel === "Bullish" ? "text-green-600"
    : scoreLabel === "Bearish" ? "text-red-600"
    : "text-slate-500";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Newspaper size={18} />
          News Sentiment
        </CardTitle>
        <Button
          size="sm"
          onClick={handleFetch}
          disabled={loading || !portfolioId}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? "Analyzing..." : "Fetch News"}
        </Button>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {!portfolioId && (
          <p className="text-sm text-slate-500">Select a portfolio to fetch news.</p>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {!loading && !data && !error && portfolioId && (
          <p className="text-sm text-slate-500">
            Click Fetch News to analyze sentiment across your holdings.
          </p>
        )}

        {loading && (
          <p className="text-sm text-slate-500 animate-pulse">
            Fetching articles and running sentiment analysis...
          </p>
        )}

        {data && aggregate && (
          <>
            <div className="rounded-lg border bg-slate-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-700">Portfolio Sentiment</p>
                <span className={`text-sm font-bold ${scoreColor}`}>{scoreLabel}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-md bg-green-50 border border-green-100 p-2">
                  <p className="text-lg font-bold text-green-700">{aggregate.positive}</p>
                  <p className="text-xs text-green-600">Positive</p>
                </div>
                <div className="rounded-md bg-slate-100 border border-slate-200 p-2">
                  <p className="text-lg font-bold text-slate-600">{aggregate.neutral}</p>
                  <p className="text-xs text-slate-500">Neutral</p>
                </div>
                <div className="rounded-md bg-red-50 border border-red-100 p-2">
                  <p className="text-lg font-bold text-red-700">{aggregate.negative}</p>
                  <p className="text-xs text-red-600">Negative</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2 text-center">
                Based on {aggregate.total} articles across {data.tickers_analyzed.length} holdings
              </p>
            </div>

            {Object.entries(data.by_ticker).map(([ticker, tickerData]) => (
              <div key={ticker} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase text-slate-500">{ticker}</p>
                  <div className="flex gap-2 text-xs">
                    <span className="text-green-600">{tickerData.counts.positive}↑</span>
                    <span className="text-slate-400">{tickerData.counts.neutral}–</span>
                    <span className="text-red-600">{tickerData.counts.negative}↓</span>
                  </div>
                </div>

                {tickerData.articles.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No recent articles found.</p>
                ) : (
                  <div className="space-y-2">
                    {tickerData.articles.map((article, i) => (
                      <ArticleCard key={i} article={article} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
