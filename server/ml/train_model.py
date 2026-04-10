import numpy as np
import pandas as pd
import os
import yfinance as yf
from sklearn.preprocessing import MinMaxScaler
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, Bidirectional, Layer, Input
from tensorflow.keras.saving import register_keras_serializable

# 1. Define the Custom Attention Layer (Registers it so it can be saved/loaded)
@register_keras_serializable()
class AttentionLayer(Layer):
    def __init__(self, **kwargs):
        super(AttentionLayer, self).__init__(**kwargs)

    def build(self, input_shape):
        self.W = self.add_weight(name="att_weight", shape=(input_shape[-1], 1), initializer="normal")
        self.b = self.add_weight(name="att_bias", shape=(input_shape[1], 1), initializer="zeros")
        super(AttentionLayer, self).build(input_shape)

    def call(self, x):
        e = tf.nn.tanh(tf.matmul(x, self.W) + self.b)
        a = tf.nn.softmax(e, axis=1)
        output = x * a
        return tf.reduce_sum(output, axis=1)

    def get_config(self):
        return super(AttentionLayer, self).get_config()

def apply_technical_indicators(df, vix_df):
    """Calculates Pro-level features including Log-Returns and Macro Volatility."""
    # Ensure we are working with flat 1D lists to avoid pandas MultiIndex errors
    close_series = df['Close'].squeeze()
    
    # Log-Returns (Mathematically superior to percentage change)
    df['Log_Return'] = np.log(close_series / close_series.shift(1))
    
    # Moving Averages
    df['SMA_20'] = close_series.rolling(window=20).mean()
    df['SMA_50'] = close_series.rolling(window=50).mean()
    
    # RSI
    delta = close_series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df['RSI'] = 100 - (100 / (1 + rs))
    
    # Portfolio Volatility (20-day rolling standard deviation)
    df['Volatility'] = df['Log_Return'].rolling(window=20).std()
    
    # Merge Macro Context (VIX - The Fear Gauge) safely
    df['VIX_Close'] = vix_df['Close'].squeeze()
    
    # Clean up NaNs
    return df.bfill().ffill()

FEATURES = ['Close', 'Log_Return', 'SMA_20', 'SMA_50', 'RSI', 'Volatility', 'VIX_Close']

def pretrain_base_model():
    print("--- 🧠 BUILDING PRO-GRADE BASE MODEL ---")
    print("Fetching 10 years of SPY and VIX data...")
    
    spy_df = yf.download("SPY", period="10y", progress=False, auto_adjust=True)
    vix_df = yf.download("^VIX", period="10y", progress=False, auto_adjust=True)
    
    df = apply_technical_indicators(spy_df, vix_df)
    features_data = df[FEATURES].values
    
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(features_data)

    sequence_length = 60
    X, y = [], []
    
    # Index 1 is 'Log_Return', which is what we want to predict
    target_index = 1 
    
    for i in range(sequence_length, len(scaled_data)):
        X.append(scaled_data[i-sequence_length:i])
        y.append(scaled_data[i, target_index])
    
    X, y = np.array(X), np.array(y)

    print(f"Constructing Bidirectional LSTM + Attention Network...")
    model = Sequential([
        Input(shape=(X.shape[1], X.shape[2])), # <--- Explicit Input layer (Fixes the warning)
        Bidirectional(LSTM(128, return_sequences=True)), # <--- Removed input_shape here
        Dropout(0.3),
        LSTM(64, return_sequences=True),
        AttentionLayer(),
        Dense(64, activation='relu'),
        Dropout(0.2),
        Dense(1) # Predicting the Log-Return
    ])

    # <--- Changed 'huber_loss' to 'huber' (Fixes the crash)
    model.compile(optimizer='adam', loss='huber') 
    
    print("Training Base Model (This prepares the AI's general market knowledge)...")
    model.fit(X, y, batch_size=64, epochs=15, verbose=1)

    model_path = os.path.join(os.path.dirname(__file__), "portfolio_lstm.keras")
    model.save(model_path)
    print(f"✅ Success! Pro model saved at {model_path}")

if __name__ == "__main__":
    pretrain_base_model()