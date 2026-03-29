from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from jose import JWTError

from database import Base, engine
import models
from config import settings
from routers import portfolios, auth_email, tickers, news


app = FastAPI(
    title="CrisisLens API",
    description="Portfolio stress-testing platform protected with Supabase authentication",
    version="1.0.0",
)

# Create database tables
Base.metadata.create_all(bind=engine)

# CORS middleware - allows frontend to make requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS if hasattr(settings, "BACKEND_CORS_ORIGINS") else ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(portfolios.router)
app.include_router(auth_email.router)
app.include_router(tickers.router)
app.include_router(news.router)

# Global exception handler for JWT errors
@app.exception_handler(JWTError)
async def jwt_exception_handler(request: Request, exc: JWTError):
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={
            "detail": "Invalid authentication token",
            "error": str(exc),
        },
    )

@app.get("/")
def read_root():
    return {
        "message": "CrisisLens Backend is running!",
        "docs": "/docs",
        "authentication": "Supabase JWT",
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}