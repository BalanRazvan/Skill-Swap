"""
Pydantic models for skill-related data.
These models serve three purposes:
1. REQUEST VALIDATION: When a client sends data, Pydantic checks it matches
   the model. Wrong type? Missing field? You get a clear 422 error automatically.
2. RESPONSE SHAPING: You control exactly what fields are sent back to the client.
   The database might have internal fields you don't want to expose.
3. DOCUMENTATION: FastAPI uses these models to generate the interactive API docs.
Naming convention:
- XxxCreate: for POST requests (creating new things)
- XxxUpdate: for PUT/PATCH requests (modifying things)
- XxxResponse: for responses (what the client sees)
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class SkillDirection(str, Enum):
    """Matches the skill_direction ENUM in the database."""
    teaching = "teaching"
    learning = "learning"


class SkillResponse(BaseModel):
    """Represents a skill from the catalog."""
    id: str
    name: str
    category: str


class UserSkillCreate(BaseModel):
    """
    What the client sends when adding a skill to their profile.
    Field() lets you add validation and documentation.
    ge=1, le=5 means "greater than or equal to 1, less than or equal to 5"
    """
    skill_id: str
    direction: SkillDirection
    proficiency_level: int = Field(default=1, ge=1, le=5)
    description: str = Field(default="", max_length=500)


class UserSkillResponse(BaseModel):
    """What the client receives — includes the full skill info, not just the ID."""
    id: str
    skill: SkillResponse  # Nested object — the full skill details
    direction: SkillDirection
    proficiency_level: int
    description: str
    created_at: datetime
