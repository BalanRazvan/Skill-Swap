"""
Skill-related API endpoints.
Route organization pattern:
- GET /api/skills/ → List all skills in the catalog
- GET /api/skills/user/{id} → Get a specific user's skills
- POST /api/skills/ → Add a skill to your profile
- DELETE /api/skills/{id} → Remove a skill from your profile
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from supabase import Client
from app.dependencies import get_supabase_client, get_current_user
from app.models.skill import (
    SkillResponse,
    UserSkillCreate,
    UserSkillResponse,
    SkillDirection,
)

router = APIRouter()


@router.get("/", response_model=list[SkillResponse])
async def list_skills(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search skill names"),
    db: Client = Depends(get_supabase_client),
):
    """
    List all skills in the catalog, with optional filtering.
    This endpoint is PUBLIC — no authentication required.
    Notice there's no `user = Depends(get_current_user)` parameter.
    Query parameters (after the ?) let clients filter without separate endpoints:
    GET /api/skills/?category=Programming
    GET /api/skills/?search=python
    GET /api/skills/?category=Music&search=guitar
    """
    query = db.table("skills").select("*")
    if category:
        query = query.eq("category", category)
    if search:
        # ilike is case-insensitive LIKE. The % wildcards match any characters.
        # So %python% matches "Python", "python programming", etc.
        query = query.ilike("name", f"%{search}%")
    result = query.order("name").execute()
    return result.data


@router.post("/", response_model=UserSkillResponse, status_code=201)
async def add_user_skill(
    skill_data: UserSkillCreate,
    user: dict = Depends(get_current_user),  # This makes the endpoint protected
    db: Client = Depends(get_supabase_client),
):
    """
    Add a skill to your profile.
    The flow:
    1. get_current_user dependency verifies the JWT → we know who's calling
    2. We verify the skill_id actually exists in the catalog
    3. We insert the user_skill row
    4. We return the full user_skill with the joined skill data
    status_code=201 means "Created" — the standard response for successful POST.
    """
    # Verify the skill exists
    skill = db.table("skills").select("*").eq("id", skill_data.skill_id).single().execute()
    if not skill.data:
        raise HTTPException(status_code=404, detail="Skill not found")
    # Insert the user-skill association
    try:
        result = db.table("user_skills").insert({
            "user_id": user["id"],
            "skill_id": skill_data.skill_id,
            "direction": skill_data.direction.value,
            "proficiency_level": skill_data.proficiency_level,
            "description": skill_data.description,
        }).execute()
    except Exception as e:
        # The UNIQUE constraint will raise an error if this skill is already added
        if "duplicate" in str(e).lower() or "unique" in str(e).lower():
            raise HTTPException(
                status_code=409,  # 409 Conflict
                detail="You already have this skill listed in this direction",
            )
        raise
    # Return the full data with the skill info joined
    user_skill = result.data[0]
    return {
        **user_skill,
        "skill": skill.data,
    }


@router.get("/user/{user_id}", response_model=list[UserSkillResponse])
async def get_user_skills(
    user_id: str,
    direction: Optional[SkillDirection] = None,
    db: Client = Depends(get_supabase_client),
):
    """
    Get all skills for a specific user.
    The select("*, skills(*)") syntax is Supabase's way of doing JOINs.
    It means "get all columns from user_skills AND all columns from the
    related skills table." This works because we defined the foreign key
    relationship in our schema.
    """
    query = db.table("user_skills") \
        .select("*, skills(*)") \
        .eq("user_id", user_id)
    if direction:
        query = query.eq("direction", direction.value)
    result = query.execute()
    # Transform the Supabase join format into our response model
    return [
        {
            **item,
            "skill": item["skills"],  # Supabase names the join after the table
        }
        for item in result.data
    ]


@router.delete("/{skill_id}", status_code=204)
async def remove_user_skill(
    skill_id: str,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_supabase_client),
):
    """
    Remove a skill from your profile.
    status_code=204 means "No Content" — successful delete, nothing to return.
    Note: we filter by BOTH id and user_id. This ensures users can only
    delete their own skills. Even though RLS provides this protection at
    the database level, defense in depth is a best practice.
    """
    result = db.table("user_skills") \
        .delete() \
        .eq("id", skill_id) \
        .eq("user_id", user["id"]) \
        .execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Skill not found or not yours")
