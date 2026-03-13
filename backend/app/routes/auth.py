"""
Authentication endpoints.
Supabase handles the actual auth (hashing, tokens, sessions).
These endpoints are thin wrappers so the Angular frontend has
a single backend URL to talk to.
"""
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.dependencies import get_supabase_client, get_current_user
from app.models.user import AuthSignUp, AuthSignIn
from supabase_auth.errors import AuthApiError

router = APIRouter()


@router.post("/signup")
async def sign_up(
    data: AuthSignUp,
    db: Client = Depends(get_supabase_client),
):
    """
    Register a new user.
    Flow:
    1. Supabase creates the auth user (email + password)
    2. We create a profiles row with username/full_name
    3. Return the session (access_token + refresh_token)
    """
    try:
        # Create the auth user in Supabase
        auth_response = db.auth.sign_up({
            "email": data.email,
            "password": data.password,
        })
    except AuthApiError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not auth_response.user:
        raise HTTPException(status_code=400, detail="Signup failed")

    user_id = auth_response.user.id

    # Create a profile row for the new user
    try:
        db.table("profiles").upsert({
            "id": user_id,
            "username": data.username,
            "full_name": data.full_name,
        }).execute()
    except Exception:
        pass  # Profile might be auto-created by a DB trigger

    return {
        "user": {
            "id": user_id,
            "email": auth_response.user.email,
        },
        "session": {
            "access_token": auth_response.session.access_token if auth_response.session else None,
            "refresh_token": auth_response.session.refresh_token if auth_response.session else None,
        },
    }


@router.post("/login")
async def sign_in(
    data: AuthSignIn,
    db: Client = Depends(get_supabase_client),
):
    """
    Log in with email + password.
    Returns access_token and refresh_token for the frontend to store.
    """
    try:
        auth_response = db.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password,
        })
    except AuthApiError as e:
        raise HTTPException(status_code=401, detail=str(e))

    return {
        "user": {
            "id": auth_response.user.id,
            "email": auth_response.user.email,
        },
        "session": {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token,
        },
    }


@router.post("/refresh")
async def refresh_token(
    refresh_token: str,
    db: Client = Depends(get_supabase_client),
):
    """
    Exchange a refresh_token for a new access_token.
    The frontend calls this when the access_token expires.
    """
    try:
        auth_response = db.auth.refresh_session(refresh_token)
    except AuthApiError as e:
        raise HTTPException(status_code=401, detail=str(e))

    return {
        "session": {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token,
        },
    }


@router.get("/me")
async def get_me(
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_supabase_client),
):
    """
    Get the current authenticated user's profile.
    This is the first call the frontend makes after login to get full profile data.
    """
    result = db.table("profiles") \
        .select("*") \
        .eq("id", user["id"]) \
        .single() \
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    return {
        **result.data,
        "email": user["email"],
    }
