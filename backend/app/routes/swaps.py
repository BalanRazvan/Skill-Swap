"""
Swap request endpoints — the heart of SkillSwap.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from supabase import Client
from app.dependencies import get_supabase_client, get_current_user
from pydantic import BaseModel, Field
from enum import Enum

router = APIRouter()


class SwapStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"
    completed = "completed"
    cancelled = "cancelled"


class SwapCreate(BaseModel):
    responder_id: str
    requester_skill_id: str  # What you'll teach
    responder_skill_id: str  # What you want to learn
    message: str = Field(default="", max_length=1000)


class SwapStatusUpdate(BaseModel):
    status: SwapStatus


@router.post("/", status_code=201)
async def create_swap_request(
    swap_data: SwapCreate,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_supabase_client),
):
    """
    Send a swap request to another user.
    Business rules enforced here:
    1. Can't swap with yourself
    2. Both skill IDs must exist
    3. No duplicate pending requests
    """
    if swap_data.responder_id == user["id"]:
        raise HTTPException(status_code=400, detail="Can't swap with yourself")
    try:
        result = db.table("swap_requests").insert({
            "requester_id": user["id"],
            "responder_id": swap_data.responder_id,
            "requester_skill_id": swap_data.requester_skill_id,
            "responder_skill_id": swap_data.responder_skill_id,
            "message": swap_data.message,
        }).execute()
        return result.data[0]
    except Exception as e:
        if "duplicate" in str(e).lower():
            raise HTTPException(
                status_code=409,
                detail="A swap request already exists for these skills with this user",
            )
        raise


@router.get("/")
async def list_my_swaps(
    status: Optional[SwapStatus] = None,
    role: Optional[str] = Query(None, pattern="^(requester|responder)$"),
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_supabase_client),
):
    """
    List all your swap requests (sent and received).

    The select string with nested joins fetches everything in ONE query
    instead of making separate queries for each related table.
    This is called "eager loading" — it prevents the N+1 query problem
    where listing 20 swaps would otherwise need 20 more queries to get user details.
    """
    query = db.table("swap_requests").select(
        "*, "
        "requester:profiles!requester_id(id, username, full_name, avatar_url), "
        "responder:profiles!responder_id(id, username, full_name, avatar_url), "
        "requester_skill:skills!requester_skill_id(id, name, category), "
        "responder_skill:skills!responder_skill_id(id, name, category)"
    ).or_(f"requester_id.eq.{user['id']},responder_id.eq.{user['id']}")
    if status:
        query = query.eq("status", status.value)
    if role == "requester":
        query = query.eq("requester_id", user["id"])
    elif role == "responder":
        query = query.eq("responder_id", user["id"])
    result = query.order("created_at", desc=True).execute()
    return result.data


@router.patch("/{swap_id}/status")
async def update_swap_status(
    swap_id: str,
    status_update: SwapStatusUpdate,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_supabase_client),
):
    """
    Update a swap request's status.
    State machine rules:
    - pending → accepted, declined (responder only)
    - pending → cancelled (requester only)
    - accepted → completed (either party)
    This is a "state machine" pattern — defining valid transitions prevents
    impossible states like going from "declined" to "accepted."
    """
    # Fetch the current swap
    swap = db.table("swap_requests") \
        .select("*") \
        .eq("id", swap_id) \
        .single() \
        .execute()
    if not swap.data:
        raise HTTPException(status_code=404, detail="Swap not found")
    swap_data = swap.data
    new_status = status_update.status.value
    current_status = swap_data["status"]
    # Validate the state transition
    valid_transitions = {
        "pending": {
            "accepted": lambda: user["id"] == swap_data["responder_id"],
            "declined": lambda: user["id"] == swap_data["responder_id"],
            "cancelled": lambda: user["id"] == swap_data["requester_id"],
        },
        "accepted": {
            "completed": lambda: user["id"] in [
                swap_data["requester_id"], swap_data["responder_id"]
            ],
            "cancelled": lambda: user["id"] in [
                swap_data["requester_id"], swap_data["responder_id"]
            ],
        },
    }

    transitions = valid_transitions.get(current_status, {})
    validator = transitions.get(new_status)
    if not validator:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{current_status}' to '{new_status}'",
        )
    if not validator():
        raise HTTPException(
            status_code=403,
            detail="You don't have permission for this status change",
        )
    result = db.table("swap_requests") \
        .update({"status": new_status}) \
        .eq("id", swap_id) \
        .execute()

    return result.data[0]
