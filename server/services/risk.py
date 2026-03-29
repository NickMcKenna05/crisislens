from __future__ import annotations

import math
from typing import Dict, List, Union

import pandas as pd


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
    Higher = riskier.
    """

    volatility = _safe_float(metrics.get("volatility"))
    max_drawdown = _safe_float(metrics.get("max_drawdown"))
    annualized_return = _safe_float(metrics.get("annualized_return"))
    sharpe_ratio = _safe_float(metrics.get("sharpe_ratio"))

    top_sector_weight = 0.0
    if sector_attribution:
        top_sector_weight = max(_safe_float(item.get("weight")) for item in sector_attribution)

    volatility_component = min((volatility / 60.0) * 35.0, 35.0)
    drawdown_component = min((max_drawdown / 60.0) * 35.0, 35.0)
    concentration_component = min((top_sector_weight / 100.0) * 20.0, 20.0)

    reward_adjustment = 0.0
    if sharpe_ratio > 0:
        reward_adjustment += min(sharpe_ratio * 4.0, 8.0)
    if annualized_return > 0:
        reward_adjustment += min(annualized_return / 10.0, 10.0)

    raw_score = volatility_component + drawdown_component + concentration_component - reward_adjustment
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