from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.orm import Session
from typing import Annotated

from database import SessionLocal
from auth import verify_supabase_jwt, extract_user_from_token


# Security scheme for JWT Bearer tokens
security = HTTPBearer()


def get_db():
    """
    Database session dependency.
    Creates a new database session for each request and closes it after.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    FastAPI dependency to verify JWT and extract current user.
    
    This dependency:
    1. Extracts the JWT token from the Authorization header
    2. Verifies the token signature and claims
    3. Returns user information
    
    Usage in routes:
        @app.get("/protected")
        async def protected_route(user: dict = Depends(get_current_user)):
            user_id = user["user_id"]
            ...
    
    Raises:
        HTTPException: 401 if token is missing, invalid, or expired
    """
    token = credentials.credentials
    
    try:
        # Verify the JWT token
        payload = verify_supabase_jwt(token)
        
        # Extract user information
        user = extract_user_from_token(payload)
        
        if not user.get("user_id"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user
    
    except JWTError as e:
        print(f"JWT ERROR: {e}")  # <-- add this line
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        print(f"AUTH ERROR: {e}")  # <-- add this line
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# Type alias for cleaner route signatures
CurrentUser = Annotated[dict, Depends(get_current_user)]
DBSession = Annotated[Session, Depends(get_db)]