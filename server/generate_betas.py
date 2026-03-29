import yfinance as yf
import pandas as pd
import time

# 1. The 11 Standard Sectors
SECTOR_ETFS = {
    "Technology": "XLK", "Financials": "XLF", "Energy": "XLE",
    "Healthcare": "XLV", "Consumer Staples": "XLP", "Consumer Discretionary": "XLY",
    "Industrials": "XLI", "Utilities": "XLU", "Materials": "XLB",
    "Real Estate": "XLRE", "Communication Services": "XLC" 
}

# 2. Expanded Industry Proxies (The "Most Possible Data" List)
INDUSTRY_ETFS = {
    # Tech & Communications
    "Semiconductors": "SMH",
    "Software": "IGV",
    "Cybersecurity": "CIBR",
    "Cloud Computing": "SKYY",
    "Internet": "FDN",
    
    # Financials
    "Regional Banks": "KRE",
    "Banks": "KBE",
    "Insurance": "KIE",
    "Broker-Dealers": "IAI",
    
    # Healthcare
    "Biotechnology": "XBI",
    "Medical Devices": "IHI",
    "Pharmaceuticals": "XPH",
    "Healthcare Providers": "IHF",
    
    # Consumer
    "Retail": "XRT",
    "Homebuilders": "XHB",
    "Leisure & Travel": "PEJ",
    "Food & Beverage": "PBJ",
    
    # Industrials & Materials
    "Aerospace & Defense": "ITA",
    "Transportation": "IYT",
    "Metals & Mining": "XME",
    "Gold Miners": "GDX",
    "Steel": "SLX",
    
    # Energy
    "Oil & Gas Exploration": "XOP",
    "Oil Services": "OIH",
    "Clean Energy": "ICLN"
}

ALL_PROXIES = {**SECTOR_ETFS, **INDUSTRY_ETFS}

# The FULL list of your 11 scenarios
SCENARIOS = [
    {"id": "covid-19", "start": "2020-02-01", "end": "2020-03-23"},
    {"id": "great-recession", "start": "2007-10-01", "end": "2009-03-01"},
    {"id": "dot-com-bubble", "start": "2000-03-10", "end": "2002-10-09"},
    {"id": "black-monday", "start": "1987-10-14", "end": "1987-10-19"},
    {"id": "debt-ceiling-crisis", "start": "2011-04-01", "end": "2011-08-31"},
    {"id": "oil-embargo-recession", "start": "1973-10-01", "end": "1975-03-31"},
    {"id": "rate-hike-bear-market", "start": "2022-01-01", "end": "2022-10-31"},
    {"id": "russia-ukraine-war", "start": "2022-02-24", "end": "2022-06-30"},
    {"id": "svb-banking-crisis", "start": "2023-03-01", "end": "2023-03-31"},
    {"id": "volcker-shock", "start": "1979-08-01", "end": "1982-12-31"},
    {"id": "volmageddon", "start": "2018-01-01", "end": "2018-02-28"},
]

def calculate_crisis_betas(start_date, end_date):
    tickers = list(ALL_PROXIES.values()) + ["^GSPC"]
    data = yf.download(tickers, start=start_date, end=end_date, interval="1d", auto_adjust=False, progress=False)["Close"]
    
    betas = {}
    
    market_data = data["^GSPC"].dropna()
    if market_data.empty:
        return {name: 1.0 for name in ALL_PROXIES.keys()}
        
    market_peak = market_data.max()
    market_trough = market_data.min()
    
    if market_peak == 0 or market_peak == market_trough:
        return {name: 1.0 for name in ALL_PROXIES.keys()}
        
    market_drop = (market_peak - market_trough) / market_peak
    
    for name, ticker in ALL_PROXIES.items():
        if ticker not in data.columns:
            betas[name] = 1.0
            continue
            
        proxy_data = data[ticker].dropna()
        if proxy_data.empty or proxy_data.max() == 0:
            betas[name] = 1.0 
            continue
            
        proxy_peak = proxy_data.max()
        proxy_trough = proxy_data.min()
        proxy_drop = (proxy_peak - proxy_trough) / proxy_peak
        
        beta = proxy_drop / market_drop
        betas[name] = round(beta, 2)
        
    return betas

print("CRISIS_BETAS = {")
for scenario in SCENARIOS:
    print(f"  # Crunching {scenario['id']}...", end="\r")
    betas = calculate_crisis_betas(scenario["start"], scenario["end"])
    
    print(f'    "{scenario["id"]}": {{')
    for name, beta in betas.items():
        print(f'        "{name}": {beta},')
    print('        "Default": 1.0')
    print('    },')
    time.sleep(1)
print("}")
print("\n✅ Done! Copy the dictionary above into your server/routers/portfolios.py file.")