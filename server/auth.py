from jose import JWTError
import json
import urllib.request
import urllib.error
from config import settings


def verify_supabase_jwt(token: str) -> dict:
    # Ensure the URL doesn't have a double slash
    base_url = settings.SUPABASE_URL.rstrip('/')
    url = f"{base_url}/auth/v1/user"
    
    req = urllib.request.Request(url)
    
    # Supabase expects 'apikey' AND 'Authorization'
    req.add_header("apikey", settings.SUPABASE_ANON_KEY)
    req.add_header("Authorization", f"Bearer {token}")

    try:
        # We add a timeout to prevent the server from hanging
        with urllib.request.urlopen(req, timeout=5) as response:
            user_data = json.loads(response.read())
            return {
                "sub": user_data["id"],
                "email": user_data.get("email"),
                "role": user_data.get("role", "authenticated"),
            }
    except urllib.error.HTTPError as e:
        # Log the actual response body from Supabase for debugging
        error_body = e.read().decode()
        print(f"Supabase Auth Error: {e.code} - {error_body}")
        
        if e.code == 401:
            raise JWTError("Session expired or invalid token")
        if e.code == 403:
            raise JWTError("Supabase rejected the request (check your API Key/URL)")
        raise JWTError(f"Token verification failed: {e.code}")


def extract_user_from_token(payload: dict) -> dict:
    """
    Extract user information from decoded JWT payload.
    
    Args:
        payload: Decoded JWT payload
        
    Returns:
        dict: User information (user_id, email, role)
    """
    return {
        "user_id": payload.get("sub"),  # Subject = user ID
        "email": payload.get("email"),
        "role": payload.get("role", "authenticated"),
        "payload": payload  # Full payload for debugging
    }