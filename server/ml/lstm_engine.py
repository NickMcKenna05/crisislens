import numpy as np
import pandas as pd
import os
import yfinance as yf
from sklearn.preprocessing import MinMaxScaler
import tensorflow as tf
from tensorflow.keras.models import load_model
import datetime

# Import exactly what was used for training
from .train_model import AttentionLayer, apply_technical_indicators, FEATURES

MODEL_PATH = os.path.join(os.path.dirname(__file__), "portfolio_lstm.keras")

def fetch_and_process_portfolio(tickers, shares, lookback_days=400):
    print(f"\n--- 🚩 CHECKPOINT 1: BEGIN DATA FETCH ---")
    print(f"Target Tickers: {tickers}")
    
    end = datetime.date.today()
    start = end - datetime.timedelta(days=lookback_days)
    
    price_map = {}
    for t, q in zip(tickers, shares):
        try:
            df = yf.download(t, start=start, end=end, progress=False, auto_adjust=True)
            if not df.empty:
                price_map[t] = df['Close'] * float(q)
        except Exception as e:
            print(f"❌ Error fetching {t}: {e}")
            
    if not price_map: return None
    
    print(f"✅ Portfolio data aggregated. Fetching Macro VIX Context...")
    vix_df = yf.download("^VIX", start=start, end=end, progress=False, auto_adjust=True)
    
    portfolio_df = pd.concat(price_map.values(), axis=1).ffill().bfill()
    total_val = portfolio_df.sum(axis=1).to_frame(name='Close')
    
    print(f"--- 🚩 CHECKPOINT 2: APPLYING PRO INDICATORS ---")
    total_val = apply_technical_indicators(total_val, vix_df)
    
    # Ensure no infinite numbers from log returns of flat lines
    total_val.replace([np.inf, -np.inf], 0, inplace=True)
    
    return total_val[FEATURES]

def run_lstm_monte_carlo(tickers, shares, projection_days=180):
    print(f"\n--- 🚩 CHECKPOINT 3: TRANSFER LEARNING & INFERENCE ---")
    if not os.path.exists(MODEL_PATH):
        raise Exception("Model file missing. Run train_model.py first.")
        
    # Load model with custom Attention layer
    model = load_model(MODEL_PATH, custom_objects={'AttentionLayer': AttentionLayer})
    
    df_features = fetch_and_process_portfolio(tickers, shares)
    if df_features is None or len(df_features) < 100:
        raise Exception("Not enough historical data for this portfolio.")

    current_price = df_features['Close'].iloc[-1]
    
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(df_features.values)
    
    sequence_length = 60
    
    # --- TRANSFER LEARNING (FINE TUNING) ---
    print(f"⚡ Fine-Tuning the brain specifically for this portfolio...")
    X_tune, y_tune = [], []
    for i in range(sequence_length, len(scaled_data)):
        X_tune.append(scaled_data[i-sequence_length:i])
        y_tune.append(scaled_data[i, 1]) # Index 1 is Log_Return
    
    X_tune, y_tune = np.array(X_tune), np.array(y_tune)
    
    # Train for 3 quick epochs on user's specific data
    model.fit(X_tune, y_tune, epochs=3, batch_size=16, verbose=0)
    print(f"✅ Fine-Tuning Complete.")
    
    # --- MONTE CARLO SIMULATION (VECTORIZED HYPER-SPEED) ---
    simulations = 15
    future_paths = np.zeros((simulations, projection_days))
    last_window = scaled_data[-sequence_length:]

    print(f"Starting {simulations} vectorized Monte Carlo simulations at price: ${current_price:,.2f}")

    current_seqs = np.array([last_window.copy() for _ in range(simulations)])

    for day in range(projection_days):
        if day % 30 == 0: 
            print(f"  -> Simulating Day {day}/{projection_days} for all paths...")
            
        input_tensor = current_seqs[:, -sequence_length:, :]
        preds = model(input_tensor, training=True).numpy() 
        
        future_paths[:, day] = preds[:, 0]
        
        next_rows = current_seqs[:, -1, :].copy()
        next_rows[:, 1] = preds[:, 0] 
        next_rows = next_rows.reshape(simulations, 1, len(FEATURES))
        
        current_seqs = np.concatenate((current_seqs, next_rows), axis=1)

    print(f"--- 🚩 CHECKPOINT 4: EXPONENTIAL RECONSTRUCTION ---")
    final_paths_dollars = []
    
    # Reverse scaling just for the Log_Return column (Index 1)
    r_min, r_max = scaler.data_min_[1], scaler.data_max_[1]

    for sim in range(simulations):
        unscaled_log_returns = future_paths[sim] * (r_max - r_min) + r_min
        
        price_trail = [current_price]
        for r in unscaled_log_returns:
            # P_new = P_old * e^(r)
            next_price = price_trail[-1] * np.exp(r)
            price_trail.append(next_price)
            
        final_paths_dollars.append(price_trail[1:])

    final_paths_dollars = np.array(final_paths_dollars)
    print(f"✅ SIMULATION COMPLETE. Sending data to frontend.")
    
    return (
        np.mean(final_paths_dollars, axis=0),
        np.percentile(final_paths_dollars, 95, axis=0),
        np.percentile(final_paths_dollars, 5, axis=0),
        current_price
    )