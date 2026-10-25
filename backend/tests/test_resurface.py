from dataclasses import dataclass
from datetime import datetime

from app.resurface import choose


@dataclass
class FakeLetter:
    category: str
    letter_type: str
    last_resurfaced_at: datetime | None = None


def test_empty_vault_has_no_surprise() -> None:
    assert choose([], "Academic", 1, seed=9) is None


def test_seeded_choice_is_deterministic() -> None:
    letters = [
        FakeLetter("Academic", "Compassion"),
        FakeLetter("Social", "Action"),
        FakeLetter("Academic", "Perspective"),
    ]
    assert choose(letters, "Academic", 1, seed=42) is choose(letters, "Academic", 1, seed=42)
