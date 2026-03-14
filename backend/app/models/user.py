from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ProfileUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=30)
    full_name: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=1000)
    location: Optional[str] = Field(None, max_length=100)


class ProfileResponse(BaseModel):
    """Public profile info returned by the API."""
    id: str
    username: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    created_at: Optional[datetime] = None


class AuthSignUp(BaseModel):
    """Registration request body."""
    email: str
    password: str = Field(min_length=6)
    username: str = Field(min_length=3, max_length=30)
    full_name: str = Field(default="", max_length=100)


class AuthSignIn(BaseModel):
    """Login request body."""
    email: str
    password: str
