import yfinance as yf
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models import GlobalTicker

router = APIRouter(prefix="/tickers", tags=["tickers"])

@router.get("/search")
def search_tickers(q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    # 1. Search local DB first
    results = db.query(GlobalTicker).filter(
        GlobalTicker.symbol.ilike(f"{q}%")
    ).limit(10).all()
    
    # 2. If no results and search is a full ticker (e.g. 3-4 chars), try YFinance
    if not results and len(q) >= 1:
        try:
            ticker_data = yf.Ticker(q)
            info = ticker_data.info

            if info and 'symbol' in info:
                # check to see if it exists to prevent race conditions
                existing = db.query(GlobalTicker).filter(GlobalTicker.symbol == info['symbol'].upper()).first()
                if existing:
                    return [existing]
                
                new_ticker = GlobalTicker(
                    symbol=info['symbol'],
                    name=info.get('longName') or info.get('shortName') or info.get('symbol'),
                    sector=info.get('sector', 'Unknown'),
                    industry=info.get('industry', 'Unknown'),
                    exchange=info.get('exchange')
                )
                db.add(new_ticker)
                db.commit()
                db.refresh(new_ticker)
                return [new_ticker]
        except Exception as e:
            print(f"yFinance lookup failed for {q}: {e}")
            return []
            
    return results