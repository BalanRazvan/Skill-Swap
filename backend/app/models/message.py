"""
Pydantic models for messaging.
Messages are tied to swap requests — you can only chat with someone
you have an active swap with.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class MessageCreate(BaseModel):
    """Send a message within a swap conversation."""
    swap_id: str
    content: str = Field(min_length=1, max_length=2000)


class MessageResponse(BaseModel):
    """A single message."""
    id: str
    swap_id: str
    sender_id: str
    content: str
    is_read: bool = False
    created_at: datetime


class ConversationSummary(BaseModel):
    """Summary of a conversation for the inbox view."""
    swap_id: str
    other_user: Optional[dict] = None
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0
