"""
Messaging endpoints.
Messages are scoped to swap requests — you can only message someone
you have an active or completed swap with.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from app.dependencies import get_supabase_client, get_current_user
from app.models.message import MessageCreate

router = APIRouter()


@router.post("/", status_code=201)
async def send_message(
    msg: MessageCreate,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_supabase_client),
):
    """
    Send a message in a swap conversation.
    Validates that the user is part of the swap before allowing the message.
    """
    # Verify the swap exists and user is a participant
    swap = db.table("swap_requests") \
        .select("requester_id, responder_id, status") \
        .eq("id", msg.swap_id) \
        .single() \
        .execute()

    if not swap.data:
        raise HTTPException(status_code=404, detail="Swap not found")

    if user["id"] not in [swap.data["requester_id"], swap.data["responder_id"]]:
        raise HTTPException(status_code=403, detail="You are not part of this swap")

    # Only allow messages on active swaps (pending, accepted)
    if swap.data["status"] in ["declined", "cancelled"]:
        raise HTTPException(
            status_code=400,
            detail="Cannot send messages on a declined or cancelled swap",
        )

    result = db.table("messages").insert({
        "swap_id": msg.swap_id,
        "sender_id": user["id"],
        "content": msg.content,
    }).execute()

    return result.data[0]


@router.get("/swap/{swap_id}")
async def get_swap_messages(
    swap_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_supabase_client),
):
    """
    Get all messages for a swap conversation.
    Also marks unread messages as read for the current user.
    """
    # Verify user is part of this swap
    swap = db.table("swap_requests") \
        .select("requester_id, responder_id") \
        .eq("id", swap_id) \
        .single() \
        .execute()

    if not swap.data:
        raise HTTPException(status_code=404, detail="Swap not found")

    if user["id"] not in [swap.data["requester_id"], swap.data["responder_id"]]:
        raise HTTPException(status_code=403, detail="You are not part of this swap")

    # Fetch messages ordered by time
    result = db.table("messages") \
        .select("*, sender:profiles!sender_id(id, username, avatar_url)") \
        .eq("swap_id", swap_id) \
        .order("created_at") \
        .range(offset, offset + limit - 1) \
        .execute()

    # Mark unread messages from the OTHER user as read
    db.table("messages") \
        .update({"read": True}) \
        .eq("swap_id", swap_id) \
        .neq("sender_id", user["id"]) \
        .eq("read", False) \
        .execute()

    return result.data


@router.get("/conversations")
async def list_conversations(
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_supabase_client),
):
    """
    List all conversations (swaps that have messages).
    Returns the latest message and unread count for each conversation.
    This powers the inbox/chat list in the frontend.
    """
    # Get all swaps the user is part of
    swaps = db.table("swap_requests") \
        .select(
            "id, status, "
            "requester:profiles!requester_id(id, username, full_name, avatar_url), "
            "responder:profiles!responder_id(id, username, full_name, avatar_url)"
        ) \
        .or_(f"requester_id.eq.{user['id']},responder_id.eq.{user['id']}") \
        .in_("status", ["pending", "accepted", "completed"]) \
        .execute()

    conversations = []
    for swap in swaps.data:
        # Get the latest message for this swap
        latest_msg = db.table("messages") \
            .select("content, created_at, sender_id") \
            .eq("swap_id", swap["id"]) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()

        # Count unread messages
        unread = db.table("messages") \
            .select("id", count="exact") \
            .eq("swap_id", swap["id"]) \
            .neq("sender_id", user["id"]) \
            .eq("read", False) \
            .execute()

        # Figure out who the "other" person is
        if swap["requester"]["id"] == user["id"]:
            other_user = swap["responder"]
        else:
            other_user = swap["requester"]

        conversations.append({
            "swap_id": swap["id"],
            "swap_status": swap["status"],
            "other_user": other_user,
            "last_message": latest_msg.data[0]["content"] if latest_msg.data else None,
            "last_message_at": latest_msg.data[0]["created_at"] if latest_msg.data else None,
            "unread_count": unread.count if unread.count else 0,
        })

    # Sort by latest message time (conversations with messages first)
    conversations.sort(
        key=lambda c: c["last_message_at"] or "",
        reverse=True,
    )

    return conversations


@router.patch("/{message_id}/read")
async def mark_message_read(
    message_id: str,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_supabase_client),
):
    """Mark a single message as read."""
    result = db.table("messages") \
        .update({"read": True}) \
        .eq("id", message_id) \
        .neq("sender_id", user["id"]) \
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Message not found or already read")

    return result.data[0]
