
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
import jwt as pyjwt
from jwt import PyJWKClient
from app.config import get_settings, Settings

# HTTPBearer extracts the token from the "Authorization: Bearer <token>" header
security = HTTPBearer()

# Cache the JWKS client so we don't fetch keys on every request
_jwks_client = None


def _get_jwks_client(supabase_url: str) -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url)
    return _jwks_client


def get_supabase_client() -> Client:

    settings = get_settings()
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    settings: Settings = Depends(get_settings),
) -> dict:

    token = credentials.credentials
    try:
        # Get the signing key from Supabase JWKS endpoint
        jwks_client = _get_jwks_client(settings.SUPABASE_URL)
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        # Decode and verify the JWT token
        # iat validation disabled — it's informational, not a security check.
        # exp still enforced. Avoids clock-skew failures with Supabase.
        payload = pyjwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
            options={"verify_iat": False},
            leeway=30,
        )
        user_id = payload.get("sub")  # 'sub' is the standard JWT claim for user ID
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: no user ID",
            )
        return {"id": user_id, "email": payload.get("email")}
    except pyjwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )
