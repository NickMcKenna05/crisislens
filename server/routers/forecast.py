from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db
import models
from ml.lstm_engine import run_lstm_monte_carlo

router = APIRouter(prefix="/forecast", tags=["LSTM Forecast"])

@router.get("/lstm/{portfolio_id}")
async def get_lstm_forecast(portfolio_id: str, timeframe: str = "6M", db: Session = Depends(get_db)):
    # 1. Fetch real holdings from the database for this specific portfolio
    portfolio = db.query(models.Portfolio).filter(models.Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    holdings = db.query(models.Holding).filter(models.Holding.portfolio_id == portfolio_id).all()
    if not holdings:
        raise HTTPException(status_code=400, detail="Portfolio has no holdings to simulate.")

    tickers = [h.ticker for h in holdings]
    shares = [h.shares for h in holdings]
    
    days_map = {"1M": 30, "6M": 180, "1Y": 365}
    projection_days = days_map.get(timeframe, 180)
    
    try:
        # 2. Run the engine with REAL data
        base, bull, bear, current_price = run_lstm_monte_carlo(tickers, shares, projection_days)
        
        chart_data = [{"month": "Now", "bear": float(current_price), "base": float(current_price), "bull": float(current_price)}]
        step = max(1, projection_days // 8) 
        
        for i in range(step - 1, projection_days, step):
            chart_data.append({
                "month": f"Day {i+1}",
                "bear": float(bear[i]),
                "base": float(base[i]),
                "bull": float(bull[i])
            })
            
        return chart_data
        
    except Exception as e:
        print(f"LSTM Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))