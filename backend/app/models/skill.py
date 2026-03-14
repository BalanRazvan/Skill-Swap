from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class SkillDirection(str, Enum):
    teaching = "teaching"
    learning = "learning"


class SkillResponse(BaseModel):
    id: str
    name: str
    category: str


class UserSkillCreate(BaseModel):
    skill_id: str
    direction: SkillDirection
    proficiency_level: int = Field(default=1, ge=1, le=5)
    description: str = Field(default="", max_length=500)


class UserSkillResponse(BaseModel):
    id: str
    skill: SkillResponse  # Nested object — the full skill details
    direction: SkillDirection
    proficiency_level: int
    description: str
    created_at: datetime
