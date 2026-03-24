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
from models import Portfolio, Holding, AnalysisRun, CustomScenario

router = APIRouter(
    prefix="/portfolios",
    tags=["portfolios"]
)

# --- SCHEMAS ---

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


# --- PORTFOLIO ROUTES ---

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


# --- ANALYSIS RUN HISTORY ROUTES (FR-13) ---
# These must be defined BEFORE /{portfolio_id} to avoid being matched as a portfolio ID

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


# --- CUSTOM SCENARIO ROUTES (FR-21) ---
# These must also be defined BEFORE /{portfolio_id}

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


# --- WILDCARD PORTFOLIO ROUTES ---
# These must come LAST so static paths above are not swallowed

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

    tickers_list = [h.ticker for h in portfolio.holdings]

    from models import GlobalTicker
    metadata = db.query(GlobalTicker).filter(GlobalTicker.symbol.in_(tickers_list)).all()
    meta_map = {m.symbol.upper(): m for m in metadata}

    if tickers_list:
        try:
            data = yf.download(tickers_list, period="1d", interval="1m", progress=False)

            for holding in portfolio.holdings:
                ticker_upper = holding.ticker.upper()
                ticker_meta = meta_map.get(ticker_upper)

                holding.sector = ticker_meta.sector if ticker_meta else "Unknown"
                holding.industry = ticker_meta.industry if ticker_meta else "Unknown"

                try:
                    if len(tickers_list) == 1:
                        price = data["Close"].iloc[-1]
                    else:
                        price = data["Close"][ticker_upper].iloc[-1]
                    holding.current_price = float(price)
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
            data = yf.download(
                tickers,
                start=start,
                end=end,
                interval="1d",
                progress=False
            )["Close"]
        else:
            data = yf.download(
                tickers,
                period=period,
                interval="1d",
                progress=False
            )["Close"]

        if len(tickers) == 1:
            data = data.to_frame(name=tickers[0])

        data = data.ffill().dropna()

        history_series = pd.Series(0.0, index=data.index)
        for ticker, shares in holding_map.items():
            history_series += data[ticker] * shares

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