from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def now() -> datetime:
    return datetime.now(timezone.utc)


class Device(Base):
    __tablename__ = "devices"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class SessionRecord(Base):
    __tablename__ = "sessions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    device_id: Mapped[str] = mapped_column(ForeignKey("devices.id"), index=True)
    category: Mapped[str] = mapped_column(String(32), default="Other")
    character_name: Mapped[str] = mapped_column(String(48), default="Alex")
    story: Mapped[str] = mapped_column(Text)
    inner_voice: Mapped[str | None] = mapped_column(Text, nullable=True)
    mood_before: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Advice(Base):
    __tablename__ = "advice"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), index=True)
    scene_key: Mapped[str] = mapped_column(String(24))
    card_id: Mapped[str | None] = mapped_column(String(48), nullable=True)
    free_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    style: Mapped[str] = mapped_column(String(24))


class Letter(Base):
    __tablename__ = "letters"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"))
    device_id: Mapped[str] = mapped_column(ForeignKey("devices.id"), index=True)
    category: Mapped[str] = mapped_column(String(32))
    letter_type: Mapped[str] = mapped_column(String(24))
    body_json: Mapped[dict] = mapped_column(JSON)
    is_demo: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    last_resurfaced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    resurface_count: Mapped[int] = mapped_column(Integer, default=0)
