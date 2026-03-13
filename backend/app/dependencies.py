"""
Instead of creating a Supabase client in every endpoint, you define it
once here and FastAPI passes it in automatically.
This is the Dependency Injection pattern — it makes your code testable
(you can swap in a mock client for tests) and DRY (Don't Repeat Yourself).
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from jose import jwt, JWTError
from app.config import get_settings, Settings

# HTTPBearer extracts the token from the "Authorization: Bearer <token>" header
security = HTTPBearer()


def get_supabase_client() -> Client:
    """
    Creates a Supabase client using the service role key.
    The service role key bypasses RLS — use this in your backend
    for operations that need full database access.
    """
    settings = get_settings()
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    settings: Settings = Depends(get_settings),
) -> dict:
    """
    Verifies the JWT token from the request header and returns the user info.
    How auth flow works:
    1. User logs in via Supabase Auth (frontend) → gets a JWT token
    2. Frontend sends token in Authorization header with every API request
    3. This dependency verifies the token is valid and extracts the user ID
    4. If invalid → 401 Unauthorized (automatic, before your route code runs)
    5. If valid → your route handler receives the user dict
    Any route that uses `user = Depends(get_current_user)` is automatically
    protected — no login, no access.
    """
    token = credentials.credentials
    try:
        # Decode and verify the JWT token
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        user_id = payload.get("sub")  # 'sub' is the standard JWT claim for user ID
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: no user ID",
            )
        return {"id": user_id, "email": payload.get("email")}
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )
