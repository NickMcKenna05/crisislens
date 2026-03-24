from sqlalchemy import Column, String, Float, ForeignKey, DateTime, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, UTC
import uuid

from database import Base


class Portfolio(Base):
    """
    Portfolio model representing a user's investment portfolio.
    """
    __tablename__ = "portfolios"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now(UTC), nullable=False)
    
    
    # Relationship to holdings
    holdings = relationship("Holding", back_populates="portfolio", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Portfolio(id={self.id}, name={self.name}, user_id={self.user_id})>"


class Holding(Base):
    """
    Holding model representing individual stock holdings within a portfolio.
    """
    __tablename__ = "holdings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    portfolio_id = Column(UUID(as_uuid=True), ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False)
    ticker = Column(String(20), nullable=False)
    shares = Column(Float, nullable=False)
    avg_price_paid = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationship back to portfolio
    portfolio = relationship("Portfolio", back_populates="holdings")
    
    def __repr__(self):
        return f"<Holding(id={self.id}, ticker={self.ticker}, shares={self.shares})>"

class GlobalTicker(Base):
    """
    GlobalTicker model for autocomplete and ticker validation. 
    Maps to teh globa;_tickers table in supabase.
    """
    __tablename__ = "global_tickers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    symbol = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(255))
    exchange = Column(String(50))
    sector = Column(String(100))
    industry = Column(String(255))
    created_at = Column(DateTime, default=datetime.now(UTC), nullable=False)

    def __repr__(self):
        return f"<GlobalTicker(symbol={self.symbol}, name={self.name})>"
    
class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    portfolio_id = Column(UUID(as_uuid=True), ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False)
    scenario_id = Column(String(100), nullable=False)
    scenario_name = Column(String(255), nullable=False)
    start_date = Column(String(20), nullable=True)
    end_date = Column(String(20), nullable=True)
    vulnerability_score = Column(Integer, nullable=True)
    timeline_view = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.now(UTC), nullable=False)
    notes = Column(Text, nullable=True)

class CustomScenario(Base):
    __tablename__ = "custom_scenarios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    start_date = Column(String(20), nullable=False)
    end_date = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.now(UTC), nullable=False)