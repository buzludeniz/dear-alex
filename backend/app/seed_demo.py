from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from .database import Base, SessionLocal, engine
from .models import Device, Letter, SessionRecord


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    device_id = "00000000-0000-0000-0000-000000000001"
    if not db.get(Device, device_id):
        db.add(Device(id=device_id))
    if db.query(Letter).filter_by(device_id=device_id, is_demo=1).count() == 0:
        for index, (category, style) in enumerate(
            (("Academic", "Perspective"), ("Social", "Compassion"), ("Performance", "Action"))
        ):
            session = SessionRecord(
                id=str(uuid4()),
                device_id=device_id,
                category=category,
                character_name="Alex",
                story="I had a difficult day.",
            )
            db.add(session)
            db.flush()
            db.add(
                Letter(
                    session_id=session.id,
                    device_id=device_id,
                    category=category,
                    letter_type=style,
                    is_demo=1,
                    created_at=datetime.now(timezone.utc) - timedelta(days=10 + index),
                    body_json={
                        "story": "I had a difficult day.",
                        "character_name": "Alex",
                        "advice": [
                            {
                                "scene": "tomorrow",
                                "text": "Take one small, kind step.",
                                "style": style,
                            }
                        ],
                    },
                )
            )
    db.commit()
    db.close()
    print(f"Seeded demo letters for device ID: {device_id}")


if __name__ == "__main__":
    main()
