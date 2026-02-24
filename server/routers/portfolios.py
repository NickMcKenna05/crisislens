from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from sqlalchemy.orm import joinedload, Session
from typing import List, Optional
from uuid import UUID
import uuid
from datetime import datetime
import yfinance as yf
import pandas as pd

# Import local dependencies and models
from dependencies import CurrentUser, DBSession
from models import Portfolio, Holding

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

# --- EXISTING ROUTES ---

@router.get("/", response_model=List[PortfolioResponse])
async def get_user_portfolios(user: CurrentUser, db: DBSession):
    return db.query(Portfolio).filter(
        Portfolio.user_id == user["user_id"]
    ).options(joinedload(Portfolio.holdings)).all()

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

@router.get("/{portfolio_id}", response_model=PortfolioResponse)
async def get_portfolio(portfolio_id: str, user: CurrentUser, db: DBSession):
    # 1. Fetch the portfolio and its basic holdings
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == portfolio_id,
        Portfolio.user_id == user["user_id"]
    ).options(joinedload(Portfolio.holdings)).first()

    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    tickers_list = [h.ticker for h in portfolio.holdings]
    
    # 2. FETCH THE TRUTH: Get metadata from GlobalTicker table
    from models import GlobalTicker
    metadata = db.query(GlobalTicker).filter(GlobalTicker.symbol.in_(tickers_list)).all()
    # Create a map like {"AAPL": <GlobalTicker Object>, "F": <GlobalTicker Object>}
    meta_map = {m.symbol.upper(): m for m in metadata}

    if tickers_list:
        try:
            # 3. Fetch current prices
            data = yf.download(tickers_list, period="1d", interval="1m", progress=False)
            
            for holding in portfolio.holdings:
                # 4. ATTACH THE CORRECT DATA
                ticker_upper = holding.ticker.upper()
                ticker_meta = meta_map.get(ticker_upper)
                
                # These fields are injected into the response on the fly
                holding.sector = ticker_meta.sector if ticker_meta else "Unknown"
                holding.industry = ticker_meta.industry if ticker_meta else "Unknown"
                
                try:
                    if len(tickers_list) == 1:
                        price = data['Close'].iloc[-1]
                    else:
                        price = data['Close'][ticker_upper].iloc[-1]
                    holding.current_price = float(price)
                except:
                    holding.current_price = holding.avg_price_paid
        except Exception as e:
            print(f"Sync Error: {e}")
            
    return portfolio

# --- NEW: ADVANCED HISTORY ROUTE ---

@router.get("/{portfolio_id}/history")
async def get_portfolio_history(
    portfolio_id: str, 
    user: CurrentUser,
    db: DBSession,
    period: str = "1y"
):
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == portfolio_id,
        Portfolio.user_id == user["user_id"]
    ).options(joinedload(Portfolio.holdings)).first()

    if not portfolio or not portfolio.holdings:
        return []

    # 1. Get tickers and current quantities
    holding_map = {h.ticker: h.shares for h in portfolio.holdings}
    tickers = list(holding_map.keys())
    
    try:
        # 2. Get history
        data = yf.download(tickers, period=period, interval="1d", progress=False)['Close']
        if len(tickers) == 1:
            data = data.to_frame(name=tickers[0])
        
        data = data.ffill().dropna()

        # 3. Calculate Portfolio Value per day
        # Total Value = (Ticker_A_Price * Ticker_A_Shares) + (Ticker_B_Price * Ticker_B_Shares)...
        history_series = pd.Series(0, index=data.index)
        for ticker, shares in holding_map.items():
            history_series += data[ticker] * shares
        
        # 4. Format for Recharts
        chart_data = [
            {
                "time": date.strftime('%Y-%m-%d'), 
                "value": round(float(val), 2)
            } 
            for date, val in history_series.items()
        ]
        
        return chart_data
    except Exception as e:
        print(f"History Error: {e}")
        raise HTTPException(status_code=500, detail="Market data unavailable")

# --- REMAINING UTILITIES ---

@router.delete("/{portfolio_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_portfolio(portfolio_id: str, user: CurrentUser, db: DBSession):
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id, Portfolio.user_id == user["user_id"]).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    db.delete(portfolio)
    db.commit()
    return None

@router.post("/{portfolio_id}/holdings", status_code=status.HTTP_201_CREATED)
async def add_holdings(portfolio_id: str, holdings_data: List[HoldingCreate], user: CurrentUser, db: DBSession):
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id, Portfolio.user_id == user["user_id"]).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    for h in holdings_data:
        db.add(Holding(id=uuid.uuid4(), portfolio_id=portfolio_id, ticker=h.ticker.upper(), shares=h.shares, avg_price_paid=h.avg_price_paid))
    db.commit()
    return {"message": "Success"}