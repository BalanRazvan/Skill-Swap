"""
Pydantic models for swap requests.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class SwapStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"
    completed = "completed"
    cancelled = "cancelled"


class SwapCreate(BaseModel):
    responder_id: str
    requester_skill_id: str
    responder_skill_id: str
    message: str = Field(default="", max_length=1000)


class SwapStatusUpdate(BaseModel):
    status: SwapStatus


class SwapResponse(BaseModel):
    id: str
    requester_id: str
    responder_id: str
    requester_skill_id: str
    responder_skill_id: str
    status: SwapStatus
    message: str
    created_at: datetime
    updated_at: Optional[datetime] = None
