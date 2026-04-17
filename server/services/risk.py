from __future__ import annotations

import math
from typing import Dict, List, Union

import pandas as pd
import statsmodels.api as sm

import yfinance as yf
import pandas_datareader.data as web
from datetime import datetime, timedelta


TRADING_DAYS_PER_YEAR = 252
RISK_FREE_RATE = 0.02  # 2% annual risk-free rate


def _safe_float(value: Union[float, int, None], default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        if pd.isna(value):
            return default
        return float(value)
    except Exception:
        return default


def _daily_returns(series: pd.Series) -> pd.Series:
    if series is None or series.empty:
        return pd.Series(dtype=float)

    cleaned = pd.to_numeric(series, errors="coerce").dropna()
    if cleaned.empty or len(cleaned) < 2:
        return pd.Series(dtype=float)

    returns = cleaned.pct_change().replace([float("inf"), float("-inf")], pd.NA).dropna()
    return returns.astype(float)


def _annualized_return_from_series(series: pd.Series) -> float:
    cleaned = pd.to_numeric(series, errors="coerce").dropna()
    if cleaned.empty or len(cleaned) < 2:
        return 0.0

    start_value = float(cleaned.iloc[0])
    end_value = float(cleaned.iloc[-1])

    if start_value <= 0 or end_value <= 0:
        return 0.0

    total_return = end_value / start_value
    periods = len(cleaned) - 1
    years = periods / TRADING_DAYS_PER_YEAR

    if years <= 0:
        return 0.0

    return (total_return ** (1 / years) - 1) * 100.0


def _max_drawdown(series: pd.Series) -> float:
    cleaned = pd.to_numeric(series, errors="coerce").dropna()
    if cleaned.empty:
        return 0.0

    running_peak = cleaned.cummax()
    drawdown = ((cleaned / running_peak) - 1.0) * 100.0

    if drawdown.empty:
        return 0.0

    return abs(float(drawdown.min()))


def calculate_risk_metrics(portfolio_series: pd.Series) -> Dict[str, float]:
    """
    Calculate portfolio-level risk metrics from a time series of portfolio values.
    Returns values in percentage terms where applicable.
    """
    returns = _daily_returns(portfolio_series)

    if returns.empty:
        return {
            "volatility": 0.0,
            "max_drawdown": 0.0,
            "sharpe_ratio": 0.0,
            "annualized_return": 0.0,
        }

    daily_volatility = _safe_float(returns.std())
    annualized_volatility = daily_volatility * math.sqrt(TRADING_DAYS_PER_YEAR) * 100.0

    annualized_return = _annualized_return_from_series(portfolio_series)

    vol_decimal = annualized_volatility / 100.0
    excess_return = (annualized_return / 100.0) - RISK_FREE_RATE
    sharpe_ratio = excess_return / vol_decimal if vol_decimal > 0 else 0.0

    return {
        "volatility": round(annualized_volatility, 2),
        "max_drawdown": round(_max_drawdown(portfolio_series), 2),
        "sharpe_ratio": round(sharpe_ratio, 2),
        "annualized_return": round(annualized_return, 2),
    }


def calculate_sector_attribution(
    stock_prices: pd.DataFrame,
    holdings: Dict[str, float],
    ticker_to_sector: Dict[str, str],
) -> List[Dict[str, Union[str, float]]]:
    """
    Build per-sector attribution using:
    - portfolio weights based on latest values
    - return contribution based on each stock total return
    - risk contribution based on each stock annualized volatility
    """

    if stock_prices is None or stock_prices.empty:
        return []

    latest_prices = stock_prices.ffill().dropna(how="all")
    if latest_prices.empty:
        return []

    latest_row = latest_prices.iloc[-1]

    total_market_value = 0.0
    market_values: Dict[str, float] = {}

    for ticker, shares in holdings.items():
        symbol = str(ticker).upper()
        if symbol in latest_row.index:
            market_value = _safe_float(latest_row[symbol]) * _safe_float(shares)
            if market_value > 0:
                market_values[symbol] = market_value
                total_market_value += market_value

    if total_market_value <= 0:
        return []

    sector_buckets: Dict[str, Dict[str, float]] = {}

    for ticker, market_value in market_values.items():
        sector = ticker_to_sector.get(ticker, "Unknown") or "Unknown"

        if ticker in stock_prices.columns:
            series = pd.to_numeric(stock_prices[ticker], errors="coerce").dropna()
        else:
            series = pd.Series(dtype=float)

        returns = _daily_returns(series)

        total_return_pct = 0.0
        annualized_risk_pct = 0.0

        if not series.empty and len(series) >= 2:
            start_value = _safe_float(series.iloc[0])
            end_value = _safe_float(series.iloc[-1])
            if start_value > 0:
                total_return_pct = ((end_value / start_value) - 1.0) * 100.0

        if not returns.empty:
            annualized_risk_pct = _safe_float(returns.std()) * math.sqrt(TRADING_DAYS_PER_YEAR) * 100.0

        weight_pct = (market_value / total_market_value) * 100.0
        return_contribution = (weight_pct / 100.0) * total_return_pct
        risk_contribution = (weight_pct / 100.0) * annualized_risk_pct

        if sector not in sector_buckets:
            sector_buckets[sector] = {
                "weight": 0.0,
                "returnContribution": 0.0,
                "riskContribution": 0.0,
            }

        sector_buckets[sector]["weight"] += weight_pct
        sector_buckets[sector]["returnContribution"] += return_contribution
        sector_buckets[sector]["riskContribution"] += risk_contribution

    result = [
        {
            "sector": sector,
            "weight": round(values["weight"], 2),
            "returnContribution": round(values["returnContribution"], 2),
            "riskContribution": round(values["riskContribution"], 2),
        }
        for sector, values in sector_buckets.items()
    ]

    result.sort(key=lambda item: float(item["weight"]), reverse=True)
    return result


def calculate_risk_score(
    metrics: Dict[str, float],
    sector_attribution: List[Dict[str, Union[str, float]]],
) -> Dict[str, Union[int, str]]:
    """
    Convert portfolio metrics into a simple 0-100 composite risk score.
    Higher = riskier. Purely based on risk factors, not rewarding returns.
    """

    volatility = _safe_float(metrics.get("volatility"))
    max_drawdown = _safe_float(metrics.get("max_drawdown"))

    top_sector_weight = 0.0
    if sector_attribution:
        top_sector_weight = max(_safe_float(item.get("weight")) for item in sector_attribution)

    volatility_component = min((volatility / 60.0) * 40.0, 40.0)
    drawdown_component = min((max_drawdown / 60.0) * 40.0, 40.0)
    concentration_component = min((top_sector_weight / 100.0) * 20.0, 20.0)

    raw_score = volatility_component + drawdown_component + concentration_component
    score = int(round(max(0.0, min(100.0, raw_score))))

    if score < 34:
        label = "Low"
    elif score < 67:
        label = "Moderate"
    else:
        label = "High"

    return {
        "score": score,
        "label": label,
    }

# ==============================================================================
# FAMA-FRENCH FACTOR SIMULATION (PRE-PROCESSING)
# ==============================================================================

def _calculate_factor_loadings(modern_asset_returns: pd.Series, modern_factor_returns: pd.DataFrame) -> dict:
    """
    Calculates the sensitivity (Betas) of a modern asset to core market factors.
    modern_factor_returns should contain columns like ['Mkt-RF', 'SMB', 'HML'].
    """
    aligned = pd.concat([modern_asset_returns.rename("asset"), modern_factor_returns], axis=1).dropna()
    
    if len(aligned) < 60:  # Require at least ~3 months of modern data to get reliable betas
        return {}

    y = aligned["asset"]
    X = sm.add_constant(aligned.drop(columns=["asset"]))
    
    model = sm.OLS(y, X).fit()
    return model.params.to_dict()


def _generate_synthetic_returns(loadings: dict, historical_factors: pd.DataFrame) -> pd.Series:
    """
    Reconstructs the past using the modern betas and historical factor data.
    """
    synth_returns = pd.Series(0.0, index=historical_factors.index)
    
    for factor, beta in loadings.items():
        if factor == "const":
            synth_returns += beta
        elif factor in historical_factors.columns:
            synth_returns += beta * historical_factors[factor]
            
    return synth_returns


def backfill_price_history(
    stock_prices: pd.DataFrame, 
    historical_factors: pd.DataFrame, 
    modern_factors: pd.DataFrame
) -> pd.DataFrame:
    """
    Checks for missing data in the user's date range, calculates betas, 
    synthesizes past returns, and stitches them to real returns.
    """
    filled_prices = stock_prices.copy()
    
    for ticker in filled_prices.columns:
        series = filled_prices[ticker].dropna()
        
        # If the stock has a full history for the requested window, skip it
        if not series.empty and len(series) >= len(historical_factors):
            continue
            
        # 1. Get the modern returns for this ticker
        modern_returns = _daily_returns(series)
        
        # 2. Find its factor DNA
        loadings = _calculate_factor_loadings(modern_returns, modern_factors)
        if not loadings:
            continue
            
        # 3. Generate synthetic historical daily returns
        synthetic_returns = _generate_synthetic_returns(loadings, historical_factors)
        
        # 4. Convert synthetic returns back into a normalized price index (start at 100)
        synthetic_prices = (1 + synthetic_returns).cumprod() * 100
        
        # 5. Stitch synthetic prices to real prices
        # (This combines the newly generated past with the existing present)
        filled_prices[ticker] = filled_prices[ticker].combine_first(synthetic_prices)

    return filled_prices


def get_fama_french_factors(start_date: str, end_date: str) -> pd.DataFrame:
    """Fetches Fama-French daily factors from Dartmouth's library."""
    try:
        # F-F data is typically accessed by month/year strings
        ff_dict = web.DataReader('F-F_Research_Data_Factors_daily', 'famafrench', start=start_date, end=end_date)
        # The [0] index gets the actual dataframe. F-F provides data in percentages, so we divide by 100.
        ff_df = ff_dict[0] / 100.0
        return ff_df
    except Exception as e:
        print(f"Error fetching Fama-French data: {e}")
        return pd.DataFrame()

def fetch_and_prepare_portfolio_data(
    tickers: List[str], 
    start_date: str, 
    end_date: str
) -> pd.DataFrame:
    """
    The Master Data Fetcher. 
    1. Tries to get historical data for the crisis.
    2. Identifies missing (unborn) stocks.
    3. Fetches modern data for those stocks + modern F-F factors to get Betas.
    4. Synthesizes the crisis data using historical F-F factors.
    """
    
    print(f"Fetching real historical data for {start_date} to {end_date}...")
    
    # 1. Safely fetch historical data using "Close"
    downloaded = yf.download(tickers, start=start_date, end=end_date)
    if "Close" in downloaded:
        raw_data = downloaded["Close"].copy()
    elif "Adj Close" in downloaded:
        raw_data = downloaded["Adj Close"].copy()
    else:
        raw_data = pd.DataFrame(columns=tickers)
    
    # If there's only one ticker, yfinance returns a Series. Convert to DataFrame.
    if isinstance(raw_data, pd.Series):
        raw_data = raw_data.to_frame(name=tickers[0])
        
    missing_tickers = []
    for ticker in tickers:
        # If the column is missing entirely or is completely full of NaNs
        if ticker not in raw_data.columns or raw_data[ticker].dropna().empty:
            missing_tickers.append(ticker)
            # Ensure the column exists in the dataframe so we can backfill it
            if ticker not in raw_data.columns:
                raw_data[ticker] = pd.NA

    if not missing_tickers:
        print("All stocks existed during this period. No synthesis needed.")
        return raw_data.ffill().dropna(how="all")

    print(f"Missing history for: {missing_tickers}. Initiating Fama-French Synthesis...")

    # 2. Setup date ranges for modern Beta calculation (Last 3 years)
    modern_end = datetime.now()
    modern_start = modern_end - timedelta(days=3*365)
    modern_start_str = modern_start.strftime('%Y-%m-%d')
    modern_end_str = modern_end.strftime('%Y-%m-%d')

    # 3. Safely fetch Modern Prices & Modern Factors
    mod_downloaded = yf.download(missing_tickers, start=modern_start_str, end=modern_end_str)
    if "Close" in mod_downloaded:
        modern_prices = mod_downloaded["Close"].copy()
    else:
        modern_prices = pd.DataFrame(columns=missing_tickers)
        
    if isinstance(modern_prices, pd.Series):
        modern_prices = modern_prices.to_frame(name=missing_tickers[0])
        
    modern_factors = get_fama_french_factors(modern_start_str, modern_end_str)
    
    # 4. Fetch Historical Factors for the crisis period
    historical_factors = get_fama_french_factors(start_date, end_date)

    if modern_factors.empty or historical_factors.empty:
        print("Failed to load factor data. Falling back to incomplete portfolio.")
        return raw_data.ffill().dropna(how="all")

    # 5. Route through the backfill logic
    for ticker in missing_tickers:
        if ticker not in modern_prices.columns:
            continue
            
        series = modern_prices[ticker].dropna()
        if len(series) < 60:
            print(f"Not enough modern data to calculate Beta for {ticker}. Skipping.")
            continue
            
        modern_returns = _daily_returns(series)
        loadings = _calculate_factor_loadings(modern_returns, modern_factors)
        
        if loadings:
            synthetic_returns = _generate_synthetic_returns(loadings, historical_factors)
            
            # Start the synthetic price index at 100
            synthetic_prices = (1 + synthetic_returns).cumprod() * 100
            
            # Align the synthetic index to match the raw_data index
            aligned_synthetic = pd.Series(index=raw_data.index, dtype=float)
            aligned_synthetic.update(synthetic_prices)
            
            raw_data[ticker] = aligned_synthetic
            print(f"Successfully synthesized history for {ticker}")

    return raw_data.ffill().dropna(how="all")