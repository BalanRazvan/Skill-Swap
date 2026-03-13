"""
Profile endpoints.
- Public: view any user's profile
- Private: update your own profile
- Discovery: search/browse users by skills
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from supabase import Client
from app.dependencies import get_supabase_client, get_current_user
from app.models.user import ProfileUpdate, ProfileResponse

router = APIRouter()


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_supabase_client),
):
    """Get the current user's full profile."""
    result = db.table("profiles") \
        .select("*") \
        .eq("id", user["id"]) \
        .single() \
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    return result.data


@router.put("/me", response_model=ProfileResponse)
async def update_my_profile(
    profile_data: ProfileUpdate,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_supabase_client),
):
    """
    Update the current user's profile.
    Only sends fields that were actually provided (not None),
    so you can update just your bio without touching your username.
    """
    # Only include fields that were explicitly set
    update_fields = profile_data.model_dump(exclude_none=True)
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Check username uniqueness if changing username
    if "username" in update_fields:
        existing = db.table("profiles") \
            .select("id") \
            .eq("username", update_fields["username"]) \
            .neq("id", user["id"]) \
            .execute()
        if existing.data:
            raise HTTPException(status_code=409, detail="Username already taken")

    result = db.table("profiles") \
        .update(update_fields) \
        .eq("id", user["id"]) \
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    return result.data[0]


@router.get("/{user_id}", response_model=ProfileResponse)
async def get_profile(
    user_id: str,
    db: Client = Depends(get_supabase_client),
):
    """Get any user's public profile. No auth required."""
    result = db.table("profiles") \
        .select("*") \
        .eq("id", user_id) \
        .single() \
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")

    return result.data


@router.get("/", response_model=list[ProfileResponse])
async def discover_users(
    search: Optional[str] = Query(None, description="Search by username or name"),
    skill: Optional[str] = Query(None, description="Filter by skill name"),
    category: Optional[str] = Query(None, description="Filter by skill category"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Client = Depends(get_supabase_client),
):
    """
    Discover users — the browse/search page.
    Supports searching by name and filtering by skill/category.
    """
    if skill or category:
        # Find users who have matching skills via user_skills join
        skill_query = db.table("user_skills") \
            .select("user_id, skills!inner(name, category)")
        if skill:
            skill_query = skill_query.ilike("skills.name", f"%{skill}%")
        if category:
            skill_query = skill_query.eq("skills.category", category)
        skill_result = skill_query.execute()
        user_ids = list({row["user_id"] for row in skill_result.data})
        if not user_ids:
            return []
        query = db.table("profiles").select("*").in_("id", user_ids)
    else:
        query = db.table("profiles").select("*")

    if search:
        query = query.or_(
            f"username.ilike.%{search}%,full_name.ilike.%{search}%"
        )

    result = query.range(offset, offset + limit - 1) \
        .order("created_at", desc=True) \
        .execute()

    return result.data
