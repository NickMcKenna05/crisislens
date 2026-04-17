from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import joinedload
from typing import List, Optional
from uuid import UUID
import uuid
from datetime import datetime

import yfinance as yf
import pandas as pd

from dependencies import CurrentUser, DBSession
from models import Portfolio, Holding, AnalysisRun, GlobalTicker, CustomScenario
from services.risk import (
    calculate_risk_metrics,
    calculate_sector_attribution,
    calculate_risk_score,
    fetch_and_prepare_portfolio_data
)

router = APIRouter(
    prefix="/portfolios",
    tags=["portfolios"]
)

# ==========================================
# GLOBAL CONSTANTS
# ==========================================

# Translate Yahoo Finance sector terms to your app's preferred terms
TERM_MAP = {
    "Financial Services": "Financials",
    "Consumer Cyclical": "Consumer Discretionary",
    "Consumer Defensive": "Consumer Staples",
    "Basic Materials": "Materials"
}

# CRISIS BETAS
# 1.0 = moved with market
# >1.0 = amplified loss
# <1.0 = defensive
CRISIS_BETAS = {
    "covid-19": {
        "Technology": 0.96, "Financials": 1.23, "Energy": 1.77, "Healthcare": 0.76,
        "Consumer Staples": 0.70, "Consumer Discretionary": 1.06, "Industrials": 1.24,
        "Utilities": 1.02, "Materials": 1.04, "Real Estate": 1.10, "Communication Services": 0.94,
        "Semiconductors": 1.05, "Software": 0.95, "Cybersecurity": 1.03, "Cloud Computing": 1.03,
        "Internet": 0.96, "Regional Banks": 1.44, "Banks": 1.42, "Insurance": 1.34,
        "Broker-Dealers": 1.14, "Biotechnology": 1.03, "Medical Devices": 0.90,
        "Pharmaceuticals": 1.02, "Healthcare Providers": 1.04, "Retail": 1.25,
        "Homebuilders": 1.50, "Leisure & Travel": 1.75, "Food & Beverage": 0.78,
        "Aerospace & Defense": 1.55, "Transportation": 1.19, "Metals & Mining": 1.43,
        "Gold Miners": 1.22, "Steel": 1.50, "Oil & Gas Exploration": 1.91,
        "Oil Services": 2.21, "Clean Energy": 1.26, "Default": 1.0
    },
    "great-recession": {
        "Technology": 1.01, "Financials": 1.51, "Energy": 1.05, "Healthcare": 0.71,
        "Consumer Staples": 0.58, "Consumer Discretionary": 1.08, "Industrials": 1.12,
        "Utilities": 0.81, "Materials": 1.10, "Real Estate": 1.0, "Communication Services": 1.0,
        "Semiconductors": 1.17, "Software": 0.94, "Cybersecurity": 1.0, "Cloud Computing": 1.0,
        "Internet": 1.16, "Regional Banks": 1.19, "Banks": 1.51, "Insurance": 1.33,
        "Broker-Dealers": 1.41, "Biotechnology": 0.67, "Medical Devices": 0.88,
        "Pharmaceuticals": 0.59, "Healthcare Providers": 1.11, "Retail": 1.19,
        "Homebuilders": 1.19, "Leisure & Travel": 1.25, "Food & Beverage": 0.71,
        "Aerospace & Defense": 1.03, "Transportation": 1.03, "Metals & Mining": 1.54,
        "Gold Miners": 1.34, "Steel": 1.55, "Oil & Gas Exploration": 1.28,
        "Oil Services": 1.33, "Clean Energy": 1.40, "Default": 1.0
    },
    "dot-com-bubble": {
        "Technology": 1.69, "Financials": 0.78, "Energy": 0.88, "Healthcare": 0.61,
        "Consumer Staples": 0.70, "Consumer Discretionary": 0.66, "Industrials": 0.89,
        "Utilities": 1.06, "Materials": 0.63, "Real Estate": 1.0, "Communication Services": 1.45,
        "Semiconductors": 1.71, "Software": 1.28, "Cybersecurity": 1.69, "Cloud Computing": 1.69,
        "Internet": 2.10, "Regional Banks": 0.75, "Banks": 0.80, "Insurance": 0.72,
        "Broker-Dealers": 1.15, "Biotechnology": 1.35, "Medical Devices": 0.85,
        "Pharmaceuticals": 0.60, "Healthcare Providers": 0.75, "Retail": 0.80,
        "Homebuilders": 0.55, "Leisure & Travel": 0.90, "Food & Beverage": 0.65,
        "Aerospace & Defense": 0.85, "Transportation": 0.75, "Metals & Mining": 0.60,
        "Gold Miners": 0.50, "Steel": 0.65, "Oil & Gas Exploration": 0.70,
        "Oil Services": 1.16, "Clean Energy": 0.88, "Default": 1.0
    },
    "black-monday": {
        "Technology": 1.15, "Financials": 1.05, "Energy": 0.90, "Healthcare": 0.85,
        "Consumer Staples": 0.70, "Consumer Discretionary": 1.10, "Industrials": 1.00,
        "Utilities": 0.65, "Materials": 1.05, "Real Estate": 1.00, "Communication Services": 0.90,
        "Semiconductors": 1.20, "Software": 1.15, "Regional Banks": 1.10, "Banks": 1.10, "Insurance": 0.95,
        "Broker-Dealers": 1.35, "Biotechnology": 0.90, "Pharmaceuticals": 0.80,
        "Retail": 1.10, "Homebuilders": 1.10, "Leisure & Travel": 1.15, "Food & Beverage": 0.75,
        "Aerospace & Defense": 1.00, "Transportation": 1.05, "Metals & Mining": 1.05,
        "Gold Miners": 0.70, "Steel": 1.05, "Oil & Gas Exploration": 0.90, "Oil Services": 0.95,
        "Default": 1.0
    },
    "rate-hike-2022": {
        "Technology": 1.32, "Financials": 1.06, "Energy": 1.49, "Healthcare": 0.63,
        "Consumer Staples": 0.69, "Consumer Discretionary": 1.42, "Industrials": 0.89,
        "Utilities": 0.84, "Materials": 1.01, "Real Estate": 1.35, "Communication Services": 1.54,
        "Semiconductors": 1.78, "Software": 1.51, "Cybersecurity": 1.24, "Cloud Computing": 1.77,
        "Internet": 1.82, "Regional Banks": 1.10, "Banks": 1.15, "Insurance": 0.65,
        "Broker-Dealers": 1.14, "Biotechnology": 1.79, "Medical Devices": 1.10,
        "Pharmaceuticals": 0.71, "Healthcare Providers": 0.75, "Retail": 1.51,
        "Homebuilders": 1.53, "Leisure & Travel": 1.25, "Food & Beverage": 0.57,
        "Aerospace & Defense": 0.76, "Transportation": 1.17, "Metals & Mining": 1.49,
        "Gold Miners": 1.83, "Steel": 1.32, "Oil & Gas Exploration": 1.60,
        "Oil Services": 1.45, "Clean Energy": 1.13, "Default": 1.0
    },
    "svb-crisis-2023": {
        "Technology": 1.86, "Financials": 2.91, "Energy": 2.46, "Healthcare": 0.81,
        "Consumer Staples": 0.84, "Consumer Discretionary": 1.15, "Industrials": 1.43,
        "Utilities": 1.20, "Materials": 2.23, "Real Estate": 2.21, "Communication Services": 1.69,
        "Semiconductors": 1.89, "Software": 1.75, "Cybersecurity": 1.21, "Cloud Computing": 1.61,
        "Internet": 1.79, "Regional Banks": 6.43, "Banks": 5.58, "Insurance": 2.77,
        "Broker-Dealers": 3.02, "Biotechnology": 2.60, "Medical Devices": 1.17,
        "Pharmaceuticals": 1.69, "Healthcare Providers": 1.25, "Retail": 2.19,
        "Homebuilders": 1.23, "Leisure & Travel": 1.63, "Food & Beverage": 0.79,
        "Aerospace & Defense": 1.28, "Transportation": 1.88, "Metals & Mining": 3.41,
        "Gold Miners": 3.73, "Steel": 3.33, "Oil & Gas Exploration": 3.55,
        "Oil Services": 4.59, "Clean Energy": 1.70, "Default": 1.0
    },
    "debt-ceiling-2011": {
        "Technology": 0.90, "Financials": 1.58, "Energy": 1.26, "Healthcare": 0.99,
        "Consumer Staples": 0.70, "Consumer Discretionary": 1.02, "Industrials": 1.38,
        "Utilities": 0.65, "Materials": 1.24, "Real Estate": 1.0, "Communication Services": 1.0,
        "Semiconductors": 1.43, "Software": 1.47, "Cybersecurity": 0.9, "Cloud Computing": 1.46,
        "Internet": 1.41, "Regional Banks": 1.59, "Banks": 1.89, "Insurance": 1.61,
        "Broker-Dealers": 1.82, "Biotechnology": 1.49, "Medical Devices": 1.18,
        "Pharmaceuticals": 0.98, "Healthcare Providers": 1.42, "Retail": 1.24,
        "Homebuilders": 1.72, "Leisure & Travel": 1.08, "Food & Beverage": 0.81,
        "Aerospace & Defense": 1.29, "Transportation": 1.39, "Metals & Mining": 1.82,
        "Gold Miners": 1.06, "Steel": 1.93, "Oil & Gas Exploration": 1.55,
        "Oil Services": 1.59, "Clean Energy": 2.09, "Default": 1.0
    },
    "russia-ukraine-2022": {
        "Technology": 1.17, "Financials": 1.05, "Energy": 1.31, "Healthcare": 0.77,
        "Consumer Staples": 0.70, "Consumer Discretionary": 1.43, "Industrials": 0.88,
        "Utilities": 0.75, "Materials": 0.90, "Real Estate": 1.11, "Communication Services": 1.22,
        "Semiconductors": 1.35, "Software": 1.32, "Cybersecurity": 1.39, "Cloud Computing": 1.63,
        "Internet": 1.80, "Regional Banks": 1.13, "Banks": 1.17, "Insurance": 0.75,
        "Broker-Dealers": 1.10, "Biotechnology": 1.66, "Medical Devices": 1.12,
        "Pharmaceuticals": 0.86, "Healthcare Providers": 0.92, "Retail": 1.31,
        "Homebuilders": 1.33, "Leisure & Travel": 1.37, "Food & Beverage": 0.69,
        "Aerospace & Defense": 0.82, "Transportation": 1.19, "Metals & Mining": 1.61,
        "Gold Miners": 1.46, "Steel": 1.41, "Oil & Gas Exploration": 1.68,
        "Oil Services": 1.40, "Clean Energy": 1.14, "Default": 1.0
    },
    "oil-embargo-1973": {
        "Technology": 1.20, "Financials": 1.15, "Energy": 0.30, "Healthcare": 0.80,
        "Consumer Staples": 0.60, "Consumer Discretionary": 1.35, "Industrials": 1.10,
        "Utilities": 1.25, "Materials": 0.90, "Real Estate": 1.40, "Communication Services": 0.90,
        "Semiconductors": 1.30, "Regional Banks": 1.20, "Banks": 1.20, "Insurance": 1.00,
        "Broker-Dealers": 1.20, "Pharmaceuticals": 0.75, "Retail": 1.40, "Homebuilders": 1.50,
        "Leisure & Travel": 1.60, "Food & Beverage": 0.65, "Aerospace & Defense": 1.00,
        "Transportation": 1.30, "Metals & Mining": 0.90, "Gold Miners": 0.40, "Steel": 1.00,
        "Oil & Gas Exploration": 0.20, "Oil Services": 0.25, "Default": 1.0
    },
    "volmageddon-2018": {
        "Technology": 1.04, "Financials": 0.98, "Energy": 1.44, "Healthcare": 1.14,
        "Consumer Staples": 0.86, "Consumer Discretionary": 0.80, "Industrials": 0.93,
        "Utilities": 0.87, "Materials": 1.02, "Real Estate": 1.01, "Communication Services": 1.00,
        "Semiconductors": 1.20, "Software": 1.00, "Cybersecurity": 1.00, "Cloud Computing": 0.93,
        "Internet": 1.06, "Regional Banks": 0.69, "Banks": 0.77, "Insurance": 0.83,
        "Broker-Dealers": 0.80, "Biotechnology": 1.19, "Medical Devices": 1.07,
        "Pharmaceuticals": 1.22, "Healthcare Providers": 0.87, "Retail": 0.98,
        "Homebuilders": 1.21, "Leisure & Travel": 0.60, "Food & Beverage": 0.81,
        "Aerospace & Defense": 0.81, "Transportation": 1.09, "Metals & Mining": 1.28,
        "Gold Miners": 1.24, "Steel": 1.21, "Oil & Gas Exploration": 1.85,
        "Oil Services": 1.88, "Clean Energy": 0.89, "Default": 1.0
    },
    "volcker-shock": {
        "Technology": 1.10, "Financials": 1.35, "Energy": 0.80, "Healthcare": 0.75,
        "Consumer Staples": 0.65, "Consumer Discretionary": 1.20, "Industrials": 1.15,
        "Utilities": 1.25, "Materials": 1.10, "Real Estate": 1.60, "Communication Services": 0.95,
        "Semiconductors": 1.20, "Regional Banks": 1.45, "Banks": 1.40, "Insurance": 1.10,
        "Broker-Dealers": 1.20, "Pharmaceuticals": 0.75, "Retail": 1.25, "Homebuilders": 1.70,
        "Leisure & Travel": 1.30, "Food & Beverage": 0.70, "Aerospace & Defense": 0.90,
        "Transportation": 1.15, "Metals & Mining": 1.10, "Gold Miners": 0.60, "Steel": 1.20,
        "Oil & Gas Exploration": 0.75, "Oil Services": 0.80, "Default": 1.0
    },
    "flash-crash": {
        "Technology": 1.45, "Financials": 1.20, "Energy": 0.95, "Healthcare": 0.85,
        "Consumer Staples": 0.65, "Consumer Discretionary": 1.30, "Industrials": 1.10,
        "Utilities": 0.55, "Materials": 1.15, "Real Estate": 0.90, "Communication Services": 1.25,
        "Semiconductors": 1.50, "Software": 1.40, "Internet": 1.55, "Regional Banks": 1.10,
        "Banks": 1.15, "Insurance": 0.90, "Default": 1.0
    },
    "gamestop-squeeze": {
        "Technology": 1.10, "Financials": 0.90, "Energy": 0.95, "Healthcare": 0.80,
        "Consumer Staples": 0.75, "Consumer Discretionary": 1.25, "Industrials": 0.90,
        "Utilities": 0.80, "Materials": 0.90, "Real Estate": 0.85, "Communication Services": 1.20,
        "Retail": 3.50, "Broker-Dealers": 1.60, "Default": 1.0
    },
    "september-11": {
        "Technology": 1.10, "Financials": 1.25, "Energy": 0.80, "Healthcare": 0.75,
        "Consumer Staples": 0.60, "Consumer Discretionary": 1.10, "Industrials": 1.20,
        "Utilities": 0.70, "Materials": 1.00, "Real Estate": 1.10, "Communication Services": 0.90,
        "Insurance": 1.80, "Leisure & Travel": 2.50, "Aerospace & Defense": 0.20, "Transportation": 1.90,
        "Default": 1.0
    },
    "great-depression": {
        "Technology": 1.50, "Financials": 2.50, "Energy": 1.20, "Healthcare": 0.80,
        "Consumer Staples": 0.60, "Consumer Discretionary": 1.60, "Industrials": 1.80,
        "Utilities": 0.70, "Materials": 1.50, "Real Estate": 2.20, "Communication Services": 0.90,
        "Banks": 2.80, "Retail": 1.70, "Default": 1.0
    },
    "oil-collapse": {
        "Technology": 0.95, "Financials": 1.15, "Energy": 2.50, "Healthcare": 0.85,
        "Consumer Staples": 0.75, "Consumer Discretionary": 0.90, "Industrials": 1.10,
        "Utilities": 0.80, "Materials": 1.30, "Real Estate": 0.90, "Communication Services": 0.90,
        "Transportation": 0.50, "Oil & Gas Exploration": 2.80, "Oil Services": 3.20, "Default": 1.0
    },
    "inflationary-bear": {
        "Technology": 1.40, "Financials": 1.05, "Energy": -0.50, "Healthcare": 0.75,
        "Consumer Staples": 0.60, "Consumer Discretionary": 1.30, "Industrials": 0.95,
        "Utilities": 0.90, "Materials": 0.80, "Real Estate": 1.40, "Communication Services": 1.35,
        "Software": 1.60, "Retail": 1.30, "Default": 1.0
    }
}

# ==========================================
# SCHEMAS
# ==========================================

class HoldingCreate(BaseModel):
    ticker: str
    shares: float
    avg_price_paid: Optional[float] = None


class PortfolioCreate(BaseModel):
    name: str
    description: Optional[str] = None


class HoldingResponse(BaseModel):
    id: UUID
    ticker: str
    shares: float
    avg_price_paid: Optional[float]
    current_price: Optional[float] = None
    sector: Optional[str] = None
    industry: Optional[str] = None

    class Config:
        from_attributes = True


class PortfolioResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str]
    created_at: datetime
    holdings: List[HoldingResponse] = []

    class Config:
        from_attributes = True


class AnalysisRunCreate(BaseModel):
    portfolio_id: UUID
    scenario_id: str
    scenario_name: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    vulnerability_score: Optional[int] = None
    timeline_view: Optional[str] = None
    notes: Optional[str] = None


class AnalysisRunResponse(BaseModel):
    id: UUID
    user_id: UUID
    portfolio_id: UUID
    scenario_id: str
    scenario_name: str
    start_date: Optional[str]
    end_date: Optional[str]
    vulnerability_score: Optional[int]
    timeline_view: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class CustomScenarioCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_date: str
    end_date: str


class CustomScenarioResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    description: Optional[str]
    start_date: str
    end_date: str
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# HELPERS
# ==========================================

def normalize_term(term: Optional[str]) -> str:
    if not term:
        return "Default"
    return TERM_MAP.get(term, term)


def build_price_frame(raw_close, tickers: List[str]) -> pd.DataFrame:
    """
    Normalize yfinance close output into a DataFrame with ticker columns.
    """
    if raw_close is None or len(tickers) == 0:
        return pd.DataFrame()

    if isinstance(raw_close, pd.Series):
        if len(tickers) == 1:
            return raw_close.to_frame(name=tickers[0])
        return raw_close.to_frame()

    if isinstance(raw_close, pd.DataFrame):
        if len(tickers) == 1 and tickers[0] not in raw_close.columns and raw_close.shape[1] == 1:
            raw_close.columns = [tickers[0]]
        return raw_close.copy()

    return pd.DataFrame()


def calculate_dynamic_sector_betas(start_date: str, end_date: str) -> dict:
    """
    Calculates dynamic sector betas for custom date ranges by comparing
    sector ETFs to the S&P 500 using covariance / variance.
    """
    etf_map = {
        "Technology": "XLK",
        "Financials": "XLF",
        "Energy": "XLE",
        "Healthcare": "XLV",
        "Consumer Staples": "XLP",
        "Consumer Discretionary": "XLY",
        "Industrials": "XLI",
        "Utilities": "XLU",
        "Materials": "XLB",
        "Real Estate": "VNQ",
        "Communication Services": "XLC"
    }

    tickers_to_fetch = list(etf_map.values()) + ["^GSPC"]

    try:
        downloaded = yf.download(
            tickers_to_fetch,
            start=start_date,
            end=end_date,
            interval="1d",
            progress=False
        )

        if "Close" not in downloaded:
            return {}

        data = downloaded["Close"]
        if data.empty or "^GSPC" not in data.columns:
            return {}

        market_returns = data["^GSPC"].pct_change().dropna()
        market_variance = market_returns.var()

        dynamic_betas = {}

        for sector, etf_ticker in etf_map.items():
            if etf_ticker in data.columns and market_variance > 0:
                etf_returns = data[etf_ticker].pct_change().dropna()
                aligned_etf, aligned_market = etf_returns.align(market_returns, join="inner")
                covariance = aligned_etf.cov(aligned_market)
                beta = covariance / market_variance
                dynamic_betas[sector] = round(float(beta), 2)
            else:
                dynamic_betas[sector] = 1.0

        return dynamic_betas

    except Exception as e:
        print(f"Failed to calculate dynamic betas: {e}")
        return {}


# ==========================================
# STATIC ROUTES
# ==========================================

@router.get("/debug/categories")
async def get_database_categories(db: DBSession):
    sectors = db.query(GlobalTicker.sector).filter(GlobalTicker.sector != None).distinct().all()
    industries = db.query(GlobalTicker.industry).filter(GlobalTicker.industry != None).distinct().all()

    return {
        "database_sectors": sorted([s[0] for s in sectors]),
        "database_industries": sorted([i[0] for i in industries])
    }


@router.get("/", response_model=List[PortfolioResponse])
async def get_user_portfolios(user: CurrentUser, db: DBSession):
    return (
        db.query(Portfolio)
        .filter(Portfolio.user_id == user["user_id"])
        .options(joinedload(Portfolio.holdings))
        .all()
    )


@router.post("/", response_model=PortfolioResponse, status_code=status.HTTP_201_CREATED)
async def create_portfolio(portfolio_data: PortfolioCreate, user: CurrentUser, db: DBSession):
    new_portfolio = Portfolio(
        id=uuid.uuid4(),
        user_id=user["user_id"],
        name=portfolio_data.name,
        description=portfolio_data.description
    )
    db.add(new_portfolio)
    db.commit()
    db.refresh(new_portfolio)
    return new_portfolio


# ==========================================
# ANALYSIS RUN HISTORY ROUTES
# ==========================================

@router.post("/analysis-runs", response_model=AnalysisRunResponse, status_code=status.HTTP_201_CREATED)
async def save_analysis_run(run_data: AnalysisRunCreate, user: CurrentUser, db: DBSession):
    portfolio = (
        db.query(Portfolio)
        .filter(
            Portfolio.id == run_data.portfolio_id,
            Portfolio.user_id == user["user_id"]
        )
        .first()
    )

    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    new_run = AnalysisRun(
        id=uuid.uuid4(),
        user_id=user["user_id"],
        portfolio_id=run_data.portfolio_id,
        scenario_id=run_data.scenario_id,
        scenario_name=run_data.scenario_name,
        start_date=run_data.start_date,
        end_date=run_data.end_date,
        vulnerability_score=run_data.vulnerability_score,
        timeline_view=run_data.timeline_view,
        notes=run_data.notes,
    )

    db.add(new_run)
    db.commit()
    db.refresh(new_run)
    return new_run


@router.get("/analysis-runs", response_model=List[AnalysisRunResponse])
async def get_analysis_runs(user: CurrentUser, db: DBSession):
    runs = (
        db.query(AnalysisRun)
        .filter(AnalysisRun.user_id == user["user_id"])
        .order_by(AnalysisRun.created_at.desc())
        .all()
    )
    return runs


@router.get("/analysis-runs/{run_id}", response_model=AnalysisRunResponse)
async def get_analysis_run(run_id: UUID, user: CurrentUser, db: DBSession):
    run = (
        db.query(AnalysisRun)
        .filter(
            AnalysisRun.id == run_id,
            AnalysisRun.user_id == user["user_id"]
        )
        .first()
    )

    if not run:
        raise HTTPException(status_code=404, detail="Analysis run not found")

    return run


@router.delete("/analysis-runs/{run_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_analysis_run(run_id: UUID, user: CurrentUser, db: DBSession):
    run = (
        db.query(AnalysisRun)
        .filter(
            AnalysisRun.id == run_id,
            AnalysisRun.user_id == user["user_id"]
        )
        .first()
    )

    if not run:
        raise HTTPException(status_code=404, detail="Analysis run not found")

    db.delete(run)
    db.commit()
    return None


# ==========================================
# CUSTOM SCENARIO ROUTES
# ==========================================

@router.post("/custom-scenarios", response_model=CustomScenarioResponse)
async def create_custom_scenario(data: CustomScenarioCreate, user: CurrentUser, db: DBSession):
    new_scenario = CustomScenario(
        id=uuid.uuid4(),
        user_id=user["user_id"],
        title=data.title,
        description=data.description,
        start_date=data.start_date,
        end_date=data.end_date,
    )
    db.add(new_scenario)
    db.commit()
    db.refresh(new_scenario)
    return new_scenario


@router.get("/custom-scenarios", response_model=List[CustomScenarioResponse])
async def get_custom_scenarios(user: CurrentUser, db: DBSession):
    return (
        db.query(CustomScenario)
        .filter(CustomScenario.user_id == user["user_id"])
        .order_by(CustomScenario.created_at.desc())
        .all()
    )


# ==========================================
# WILDCARD PORTFOLIO ROUTES
# ==========================================

@router.get("/{portfolio_id}", response_model=PortfolioResponse)
async def get_portfolio(portfolio_id: str, user: CurrentUser, db: DBSession):
    portfolio = (
        db.query(Portfolio)
        .filter(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == user["user_id"]
        )
        .options(joinedload(Portfolio.holdings))
        .first()
    )

    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    tickers_list = [h.ticker.upper() for h in portfolio.holdings]
    metadata = db.query(GlobalTicker).filter(GlobalTicker.symbol.in_(tickers_list)).all()
    meta_map = {m.symbol.upper(): m for m in metadata}

    if tickers_list:
        try:
            downloaded = yf.download(tickers_list, period="1d", interval="1m", progress=False)

            if "Close" in downloaded:
                close_data = build_price_frame(downloaded["Close"], tickers_list)

                for holding in portfolio.holdings:
                    ticker_upper = holding.ticker.upper()
                    ticker_meta = meta_map.get(ticker_upper)

                    holding.sector = ticker_meta.sector if ticker_meta else "Unknown"
                    holding.industry = ticker_meta.industry if ticker_meta else "Unknown"

                    try:
                        if ticker_upper in close_data.columns and not close_data[ticker_upper].dropna().empty:
                            price = close_data[ticker_upper].dropna().iloc[-1]
                            holding.current_price = float(price)
                        else:
                            holding.current_price = holding.avg_price_paid
                    except Exception:
                        holding.current_price = holding.avg_price_paid

        except Exception as e:
            print(f"Sync Error: {e}")

    return portfolio


@router.get("/{portfolio_id}/history")
async def get_portfolio_history(
    portfolio_id: str,
    user: CurrentUser,
    db: DBSession,
    period: str = "1y",
    start: Optional[str] = None,
    end: Optional[str] = None,
):
    portfolio = (
        db.query(Portfolio)
        .filter(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == user["user_id"]
        )
        .options(joinedload(Portfolio.holdings))
        .first()
    )

    if not portfolio or not portfolio.holdings:
        return []

    holding_map = {h.ticker.upper(): h.shares for h in portfolio.holdings}
    tickers = list(holding_map.keys())

    try:
        if start and end:
            data = fetch_and_prepare_portfolio_data(tickers=tickers, start_date=start, end_date=end)
        else:
            # For standard period lookbacks (like "1y"), just use yfinance directly
            # since we know the stocks exist in recent history
            downloaded = yf.download(tickers, period=period, interval="1d", progress=False)
            if "Close" not in downloaded:
                return []
            data = build_price_frame(downloaded["Close"], tickers).ffill().dropna(how="all")
            
        if data.empty:
            return []

        history_series = pd.Series(0.0, index=data.index)
        for ticker, shares in holding_map.items():
            if ticker in data.columns:
                history_series += data[ticker].fillna(method="ffill") * shares

        chart_data = [
            {
                "time": date.strftime("%Y-%m-%d"),
                "value": round(float(val), 2)
            }
            for date, val in history_series.items()
        ]

        return chart_data

    except Exception as e:
        print(f"History Error: {e}")
        raise HTTPException(status_code=500, detail="Market data unavailable")

def calculate_dynamic_sector_betas(start_date: str, end_date: str) -> dict:
    """
    Calculates real-time sector betas for custom date ranges by comparing
    Sector ETFs to the S&P 500 using historical covariance.
    """
    etf_map = {
        "Technology": "XLK",
        "Financials": "XLF",
        "Energy": "XLE",
        "Healthcare": "XLV",
        "Consumer Staples": "XLP",
        "Consumer Discretionary": "XLY",
        "Industrials": "XLI",
        "Utilities": "XLU",
        "Materials": "XLB",
        "Real Estate": "VNQ",
        "Communication Services": "XLC"
    }

    tickers_to_fetch = list(etf_map.values()) + ["^GSPC"]

    try:
        data = yf.download(tickers_to_fetch, start=start_date, end=end_date, interval="1d", progress=False)["Close"]
        if data.empty or "^GSPC" not in data.columns:
            return {}

        market_returns = data["^GSPC"].pct_change().dropna()
        dynamic_betas = {}
        market_variance = market_returns.var()

        for sector, etf_ticker in etf_map.items():
            if etf_ticker in data.columns and market_variance > 0:
                etf_returns = data[etf_ticker].pct_change().dropna()
                aligned_etf, aligned_market = etf_returns.align(market_returns, join='inner')
                covariance = aligned_etf.cov(aligned_market)
                beta = covariance / market_variance
                dynamic_betas[sector] = round(beta, 2)
            else:
                dynamic_betas[sector] = 1.0

        return dynamic_betas

    except Exception as e:
        print(f"Failed to calculate dynamic betas: {e}")
        return {}

@router.get("/{portfolio_id}/analyze")
async def analyze_portfolio_crisis(
    portfolio_id: str,
    user: CurrentUser,
    db: DBSession,
    start: str,
    end: str,
    scenario: str = "custom"
):
    portfolio = (
        db.query(Portfolio)
        .filter(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == user["user_id"]
        )
        .options(joinedload(Portfolio.holdings))
        .first()
    )

    if not portfolio or not portfolio.holdings:
        return {
            "data": [],
            "metrics": {},
            "riskMetrics": {
                "volatility": 0.0,
                "max_drawdown": 0.0,
                "sharpe_ratio": 0.0,
                "annualized_return": 0.0,
            },
            "sectorAttribution": [],
            "riskGauge": {
                "score": 0,
                "label": "Low",
            },
        }

    tickers_list = [h.ticker.upper() for h in portfolio.holdings]
    holding_map = {h.ticker.upper(): h.shares for h in portfolio.holdings}

    current_prices = {}
    try:
        if tickers_list:
            current_download = yf.download(tickers_list, period="1d", progress=False)
            if "Close" in current_download:
                close_data = build_price_frame(current_download["Close"], tickers_list)
                for ticker in tickers_list:
                    if ticker in close_data.columns and not close_data[ticker].dropna().empty:
                        current_prices[ticker] = float(close_data[ticker].dropna().iloc[-1])
    except Exception as e:
        print(f"YFinance fetching error in /analyze current prices: {e}")

    metadata = db.query(GlobalTicker).filter(GlobalTicker.symbol.in_(tickers_list)).all()
    meta_map = {
        m.symbol.upper(): {
            "sector": m.sector,
            "industry": m.industry
        }
        for m in metadata
    }

    if scenario == "custom":
        scenario_betas = calculate_dynamic_sector_betas(start, end)
    else:
        scenario_betas = CRISIS_BETAS.get(scenario, {})

    total_portfolio_value = 0.0
    stock_values = {}

    for holding in portfolio.holdings:
        ticker = holding.ticker.upper()
        shares = holding.shares

        price = current_prices.get(ticker)
        if price is None:
            price = holding.avg_price_paid if holding.avg_price_paid is not None else 100.0

        value = shares * price
        stock_values[ticker] = value
        total_portfolio_value += value

    portfolio_beta = 0.0
    user_sector_exposures = {}

    if total_portfolio_value > 0:
        for ticker, value in stock_values.items():
            weight = value / total_portfolio_value

            meta = meta_map.get(ticker, {"sector": "Default", "industry": "Default"})
            raw_sector = meta["sector"] or "Default"
            raw_industry = meta["industry"] or "Default"

            sector = normalize_term(raw_sector)
            industry = normalize_term(raw_industry)

            stock_beta = scenario_betas.get(industry, scenario_betas.get(sector, 1.0))
            portfolio_beta += (weight * stock_beta)

            if sector != "Default":
                if sector not in user_sector_exposures:
                    user_sector_exposures[sector] = {"weight": 0.0, "beta": stock_beta}
                user_sector_exposures[sector]["weight"] += weight

    portfolio_beta = max(0.1, min(portfolio_beta, 3.5))

    sorted_user_sectors = sorted(
        user_sector_exposures.keys(),
        key=lambda s: user_sector_exposures[s]["beta"]
    )
    top_hedge = sorted_user_sectors[0] if sorted_user_sectors else "Diversified"
    top_risk = sorted_user_sectors[-1] if sorted_user_sectors else "Diversified"

    try:
        market_download = yf.download("^GSPC", start=start, end=end, interval="1d", progress=False)
        if "Close" not in market_download:
            raise HTTPException(status_code=500, detail="Market benchmark data unavailable")

        market_close = market_download["Close"].ffill().dropna()

        if market_close.empty:
            raise HTTPException(status_code=500, detail="Market benchmark data unavailable")

        if isinstance(market_close, pd.DataFrame):
            market_close = market_close.iloc[:, 0]

        market_returns = market_close.pct_change().fillna(0)
        simulated_port_returns = market_returns * portfolio_beta

        indexed_market = (1 + market_returns).cumprod() * 100
        indexed_portfolio = (1 + simulated_port_returns).cumprod() * 100

        vulnerability_score = int(min(max((portfolio_beta * 50), 10), 100))
        market_max_drop = float(indexed_market.min() - 100)
        port_max_drop = float(indexed_portfolio.min() - 100)

        chart_data = [
            {
                "date": date.strftime("%Y-%m-%d"),
                "portfolio": round(float(port_val), 2),
                "market": round(float(market_val), 2)
            }
            for date, port_val, market_val in zip(market_close.index, indexed_portfolio, indexed_market)
        ]

        
        
        stock_prices = fetch_and_prepare_portfolio_data(
            tickers=tickers_list,
            start_date=start,
            end_date=end
        )

        portfolio_series = pd.Series(dtype=float)
        if not stock_prices.empty:
            portfolio_series = pd.Series(0.0, index=stock_prices.index)
            for ticker, shares in holding_map.items():
                if ticker in stock_prices.columns:
                    portfolio_series += stock_prices[ticker].ffill() * shares
            portfolio_series = portfolio_series.dropna()

        risk_metrics = calculate_risk_metrics(portfolio_series)

        ticker_to_sector = {}
        for ticker in tickers_list:
            meta = meta_map.get(ticker, {})
            sector = normalize_term(meta.get("sector"))
            ticker_to_sector[ticker] = sector if sector else "Unknown"

        sector_attribution = calculate_sector_attribution(
            stock_prices=stock_prices,
            holdings=holding_map,
            ticker_to_sector=ticker_to_sector,
        )

        risk_gauge = calculate_risk_score(
            metrics=risk_metrics,
            sector_attribution=sector_attribution,
        )

        return {
            "data": chart_data,
            "metrics": {
                "vulnerabilityScore": vulnerability_score,
                "portfolioBeta": round(portfolio_beta, 2),
                "maxDrawdown": round(port_max_drop, 1),
                "marketDrawdown": round(market_max_drop, 1),
                "topHedge": top_hedge,
                "topRisk": top_risk
            },
            "riskMetrics": risk_metrics,
            "sectorAttribution": sector_attribution,
            "riskGauge": risk_gauge,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Analysis Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to calculate scenario analysis.")


@router.delete("/{portfolio_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_portfolio(portfolio_id: str, user: CurrentUser, db: DBSession):
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

    db.delete(portfolio)
    db.commit()
    return None


@router.post("/{portfolio_id}/holdings", status_code=status.HTTP_201_CREATED)
async def add_holdings(portfolio_id: str, holdings_data: List[HoldingCreate], user: CurrentUser, db: DBSession):
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

    for h in holdings_data:
        db.add(
            Holding(
                id=uuid.uuid4(),
                portfolio_id=portfolio_id,
                ticker=h.ticker.upper(),
                shares=h.shares,
                avg_price_paid=h.avg_price_paid
            )
        )

    db.commit()
    return {"message": "Success"}