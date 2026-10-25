from __future__ import annotations

from pydantic import BaseModel, Field


class StoryRequest(BaseModel):
    story: str = Field(min_length=1, max_length=2000)
    character_name: str = Field(default="Alex", max_length=48)


class SessionCreate(BaseModel):
    story: str = Field(min_length=1, max_length=2000)
    inner_voice: str | None = Field(default=None, max_length=1200)
    category: str = Field(default="Other", max_length=32)
    character_name: str = Field(default="Alex", max_length=48)
    mood_before: int | None = Field(default=None, ge=1, le=5)


class AdviceCreate(BaseModel):
    scene_key: str = Field(pattern="^(moment|voice|tomorrow)$")
    card_id: str | None = Field(default=None, max_length=48)
    free_text: str | None = Field(default=None, max_length=1000)
    style: str = Field(pattern="^(Compassion|Perspective|Action)$")


class FinishRequest(BaseModel):
    mood_after: int | None = Field(default=None, ge=1, le=5)
