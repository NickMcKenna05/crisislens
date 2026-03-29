from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime
import asyncio
import httpx
import yfinance as yf

from config import settings
from dependencies import CurrentUser, DBSession

router = APIRouter(prefix="/news", tags=["news"])

SCENARIO_KEYWORDS = {
    "covid-19": ["pandemic", "covid", "lockdown", "supply chain", "healthcare", "vaccine"],
    "great-recession": ["bank failure", "credit crisis", "recession", "mortgage", "lehman", "bailout"],
    "dot-com-bubble": ["tech bubble", "dotcom", "overvaluation", "nasdaq", "internet stocks"],
    "black-monday": ["market crash", "circuit breaker", "panic selling", "dow jones"],
    "debt-ceiling-crisis": ["debt ceiling", "default", "treasury", "credit downgrade", "fiscal"],
    "oil-embargo-recession": ["oil embargo", "stagflation", "opec", "energy crisis", "inflation"],
    "rate-hike-bear-market": ["federal reserve", "interest rate", "rate hike", "tightening", "fed"],
    "russia-ukraine-war": ["ukraine", "russia", "sanctions", "geopolitical", "commodity", "energy"],
    "svb-banking-crisis": ["silicon valley bank", "svb", "bank run", "regional bank", "fdic"],
    "volcker-shock": ["volcker", "interest rate", "inflation", "tightening", "federal reserve"],
    "volmageddon": ["volatility", "vix", "short vol", "options", "market spike"],
}

HF_API_URL = "https://router.huggingface.co/hf-inference/models/ProsusAI/finbert"


def parse_articles(raw_news: list, limit: int = 10) -> list:
    articles = []
    for item in raw_news:
        content = item.get("content", {})
        if not content:
            continue

        title = content.get("title", "").strip()
        if not title:
            continue

        publisher = (content.get("provider") or {}).get("displayName", "")
        link = (
            (content.get("clickThroughUrl") or {}).get("url")
            or (content.get("canonicalUrl") or {}).get("url")
            or ""
        )

        summary = content.get("summary", "").strip()

        pub_date_str = content.get("pubDate") or content.get("displayTime", "")
        published_at = 0
        if pub_date_str:
            try:
                dt = datetime.fromisoformat(pub_date_str.replace("Z", "+00:00"))
                published_at = int(dt.timestamp())
            except Exception:
                published_at = 0

        sentiment_text = f"{title}. {summary}" if summary else title

        articles.append({
            "title": title,
            "publisher": publisher,
            "link": link,
            "published_at": published_at,
            "sentiment_text": sentiment_text,
        })

        if len(articles) >= limit:
            break

    return articles


async def analyze_sentiment_single(text: str) -> list:
    headers = {"Authorization": f"Bearer {settings.HUGGINGFACE_API_KEY}"}

    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post(
            HF_API_URL,
            headers=headers,
            json={"inputs": text}
        )

    if response.status_code == 503:
        raise HTTPException(status_code=503, detail="Sentiment model is loading, please try again in 30 seconds")

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Sentiment analysis service unavailable")

    result = response.json()
    # Single text returns [[{label, score}, ...]] — unwrap the outer list
    if result and isinstance(result[0], list):
        return result[0]
    return result


def is_scenario_relevant(text: str, scenario_id: Optional[str]) -> bool:
    if not scenario_id or scenario_id not in SCENARIO_KEYWORDS:
        return False
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in SCENARIO_KEYWORDS[scenario_id])


@router.get("/portfolio/{portfolio_id}")
async def get_portfolio_news(
    portfolio_id: str,
    user: CurrentUser,
    db: DBSession,
    scenario_id: Optional[str] = None,
):
    from models import Portfolio
    portfolio = (
        db.query(Portfolio)
        .filter(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == user["user_id"]
        )
        .first()
    )

    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    tickers = [h.ticker.upper() for h in portfolio.holdings]

    if not tickers:
        return {
            "portfolio_id": portfolio_id,
            "tickers_analyzed": [],
            "aggregate": {"positive": 0, "negative": 0, "neutral": 0, "total": 0, "score": 0},
            "by_ticker": {}
        }

    by_ticker = {}
    total_counts = {"positive": 0, "negative": 0, "neutral": 0}

    # Step 1: fetch all articles for all tickers (fast, no HuggingFace yet)
    ticker_articles = {}
    for ticker in tickers:
        try:
            yf_ticker = yf.Ticker(ticker)
            raw_news = yf_ticker.news or []
            ticker_articles[ticker] = parse_articles(raw_news, limit=8)
        except Exception as e:
            print(f"News fetch error for {ticker}: {e}")
            ticker_articles[ticker] = []

    # Step 2: build flat list of all articles across all tickers
    all_pairs = [
        (ticker, article)
        for ticker in tickers
        for article in ticker_articles.get(ticker, [])
    ]

    # Step 3: fire ALL sentiment calls at once (one gather instead of per-ticker loops)
    if all_pairs:
        sentiment_results = await asyncio.gather(
            *[analyze_sentiment_single(article["sentiment_text"]) for _, article in all_pairs],
            return_exceptions=True
        )
    else:
        sentiment_results = []

    # Step 4: map results back to tickers
    result_index = 0
    for ticker in tickers:
        articles = ticker_articles.get(ticker, [])
        if not articles:
            by_ticker[ticker] = {"articles": [], "counts": {"positive": 0, "negative": 0, "neutral": 0}}
            continue

        ticker_counts = {"positive": 0, "negative": 0, "neutral": 0}
        enriched = []

        for article in articles:
            raw_sentiment = sentiment_results[result_index]
            result_index += 1

            if isinstance(raw_sentiment, Exception):
                top = {"label": "neutral", "score": 0.0}
            else:
                top = max(raw_sentiment, key=lambda x: x["score"]) if raw_sentiment else {"label": "neutral", "score": 0.0}

            label = top["label"].lower()
            enriched.append({
                **article,
                "sentiment": label,
                "confidence": round(top["score"] * 100, 1),
                "scenario_relevant": is_scenario_relevant(article["title"], scenario_id),
            })

            if label in ticker_counts:
                ticker_counts[label] += 1

        by_ticker[ticker] = {"articles": enriched, "counts": ticker_counts}
        for key in total_counts:
            total_counts[key] += ticker_counts[key]
            
    total = sum(total_counts.values())
    score = round((total_counts["positive"] - total_counts["negative"]) / total * 100) if total > 0 else 0
            
    return {
        "portfolio_id": portfolio_id,
        "tickers_analyzed": tickers,
        "aggregate": {**total_counts, "total": total, "score": score},
        "by_ticker": by_ticker,
    }


@router.get("/{ticker}")
async def get_ticker_news(
    ticker: str,
    user: CurrentUser,
    scenario_id: Optional[str] = None,
):
    ticker_upper = ticker.upper()

    try:
        yf_ticker = yf.Ticker(ticker_upper)
        raw_news = yf_ticker.news or []
    except Exception:
        raise HTTPException(status_code=404, detail=f"Could not fetch news for {ticker_upper}")

    articles = parse_articles(raw_news, limit=10)

    if not articles:
        return {"ticker": ticker_upper, "articles": []}

    sentiment_results = await asyncio.gather(
        *[analyze_sentiment_single(a["sentiment_text"]) for a in articles],
        return_exceptions=True
    )

    enriched = []
    for i, article in enumerate(articles):
        raw_sentiment = sentiment_results[i]

        if isinstance(raw_sentiment, Exception):
            top = {"label": "neutral", "score": 0.0}
        else:
            top = max(raw_sentiment, key=lambda x: x["score"]) if raw_sentiment else {"label": "neutral", "score": 0.0}

        enriched.append({
            **article,
            "sentiment": top["label"].lower(),
            "confidence": round(top["score"] * 100, 1),
            "scenario_relevant": is_scenario_relevant(article["title"], scenario_id),
        })

    return {"ticker": ticker_upper, "articles": enriched}
