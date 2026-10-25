from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

from fastapi import Depends, FastAPI, Header, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import Advice, Device, Letter, SessionRecord
from .resurface import choose
from .safety import any_flagged
from .schemas import AdviceCreate, FinishRequest, SessionCreate, StoryRequest
from .story_engine import transform

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Dear Alex API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
CARDS = json.loads((Path(__file__).parent / "content" / "cards.json").read_text(encoding="utf-8"))


def device_id(x_device_id: str | None = Header(default=None)) -> str:
    if not x_device_id:
        raise HTTPException(400, "An anonymous device ID is required.")
    try:
        return str(UUID(x_device_id))
    except ValueError as error:
        raise HTTPException(400, "Invalid device ID.") from error


def crisis() -> dict:
    return {
        "safe": False,
        "message": "You deserve support right now. In Canada, call or text 9-8-8. UVic students can also contact Counselling Services. If you are in immediate danger, call 9-1-1.",
    }


def ensure_device(db: Session, identifier: str) -> None:
    if not db.get(Device, identifier):
        db.add(Device(id=identifier))
        db.commit()


@app.get("/")
@app.get("/health")
@app.get("/api/health")
def health() -> dict:
    return {"ok": True}


@app.get("/api/cards")
def cards() -> list[dict]:
    return CARDS


@app.post("/api/story")
def story(payload: StoryRequest) -> dict:
    if any_flagged(payload.story):
        return crisis()
    return {"safe": True, **transform(payload.story, payload.character_name)}


@app.post("/api/sessions")
def create_session(
    payload: SessionCreate, identifier: str = Depends(device_id), db: Session = Depends(get_db)
) -> dict:
    if any_flagged(payload.story, payload.inner_voice):
        return crisis()
    ensure_device(db, identifier)
    record = SessionRecord(device_id=identifier, **payload.model_dump())
    db.add(record)
    db.commit()
    return {"safe": True, "id": record.id}


@app.post("/api/sessions/{session_id}/advice")
def add_advice(
    session_id: str,
    payload: AdviceCreate,
    identifier: str = Depends(device_id),
    db: Session = Depends(get_db),
) -> dict:
    record = db.get(SessionRecord, session_id)
    if not record or record.device_id != identifier:
        raise HTTPException(404, "Session not found.")
    if any_flagged(payload.free_text):
        return crisis()
    db.add(Advice(session_id=session_id, **payload.model_dump()))
    db.commit()
    return {"safe": True}


@app.post("/api/sessions/{session_id}/finish")
def finish(
    session_id: str,
    payload: FinishRequest,
    identifier: str = Depends(device_id),
    db: Session = Depends(get_db),
) -> dict:
    record = db.get(SessionRecord, session_id)
    if not record or record.device_id != identifier:
        raise HTTPException(404, "Session not found.")
    items = list(db.scalars(select(Advice).where(Advice.session_id == session_id)))
    if len({item.scene_key for item in items}) < 3:
        raise HTTPException(400, "Complete each coaching scene first.")
    dominant = max(
        (style for style in ("Compassion", "Perspective", "Action")),
        key=lambda style: sum(item.style == style for item in items),
    )
    body = {
        "story": record.story,
        "inner_voice": record.inner_voice,
        "advice": [
            {
                "scene": item.scene_key,
                "text": item.free_text
                or next(
                    (card["text"] for card in CARDS if card["id"] == item.card_id), "A kind note."
                ),
                "style": item.style,
            }
            for item in items
        ],
        "character_name": record.character_name,
    }
    letter = Letter(
        session_id=session_id,
        device_id=identifier,
        category=record.category,
        letter_type=dominant,
        body_json=body,
    )
    record.completed_at = datetime.now(timezone.utc)
    record.mood_after = payload.mood_after
    db.add(letter)
    db.commit()
    return {
        "letter": serialize_letter(letter),
        "reveal": transform(record.story, record.character_name)["tokens"],
    }


def serialize_letter(letter: Letter) -> dict:
    return {
        "id": letter.id,
        "category": letter.category,
        "letter_type": letter.letter_type,
        "body": letter.body_json,
        "created_at": letter.created_at.isoformat(),
        "demo": bool(letter.is_demo),
    }


@app.get("/api/vault")
def vault(identifier: str = Depends(device_id), db: Session = Depends(get_db)) -> dict:
    letters = list(
        db.scalars(
            select(Letter).where(Letter.device_id == identifier).order_by(Letter.created_at.desc())
        )
    )
    slots = {
        style: sum(letter.letter_type == style for letter in letters)
        for style in ("Compassion", "Perspective", "Action")
    }
    return {"letters": [serialize_letter(letter) for letter in letters], "collection": slots}


@app.get("/api/vault/surprise")
def surprise(
    category: str = "Other",
    mood: int | None = None,
    identifier: str = Depends(device_id),
    db: Session = Depends(get_db),
) -> dict:
    letters = list(db.scalars(select(Letter).where(Letter.device_id == identifier)))
    letter = choose(letters, category, mood)
    if not letter:
        return {
            "letter": None,
            "message": "No past letters yet. When you're ready, your first one can wait here.",
        }
    letter.last_resurfaced_at = datetime.now(timezone.utc)
    letter.resurface_count += 1
    db.commit()
    return {"letter": serialize_letter(letter)}


@app.get("/api/vault/export")
def export(identifier: str = Depends(device_id), db: Session = Depends(get_db)) -> Response:
    letters = list(db.scalars(select(Letter).where(Letter.device_id == identifier)))
    payload = json.dumps(
        {"device_id": identifier, "letters": [serialize_letter(letter) for letter in letters]},
        indent=2,
    )
    return Response(
        payload,
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=dear-alex-export.json"},
    )


@app.delete("/api/vault", status_code=204)
def clear_vault(identifier: str = Depends(device_id), db: Session = Depends(get_db)) -> None:
    session_ids = list(
        db.scalars(select(SessionRecord.id).where(SessionRecord.device_id == identifier))
    )
    if session_ids:
        db.execute(delete(Advice).where(Advice.session_id.in_(session_ids)))
        db.execute(delete(Letter).where(Letter.session_id.in_(session_ids)))
        db.execute(delete(SessionRecord).where(SessionRecord.id.in_(session_ids)))
    db.execute(delete(Letter).where(Letter.device_id == identifier))
    db.execute(delete(Device).where(Device.id == identifier))
    db.commit()
