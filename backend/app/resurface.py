from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone
from typing import Protocol


class LetterLike(Protocol):
    category: str
    letter_type: str
    last_resurfaced_at: datetime | None


def score(letter: LetterLike, category: str, mood: int | None, now: datetime) -> float:
    value = 3 if letter.category == category else 0
    value += 2 if mood is not None and mood <= 2 and letter.letter_type == "Compassion" else 0
    if letter.last_resurfaced_at and letter.last_resurfaced_at >= now - timedelta(days=7):
        value -= 5
    return value


def choose(
    letters: list[LetterLike], category: str, mood: int | None, seed: int | None = None
) -> LetterLike | None:
    if not letters:
        return None
    now = datetime.now(timezone.utc)
    rng = random.Random(seed)
    ranked = sorted(
        ((score(letter, category, mood, now) + rng.random() * 0.15, letter) for letter in letters),
        reverse=True,
        key=lambda item: item[0],
    )[:3]
    weights = [max(0.2, value + 6) for value, _ in ranked]
    return rng.choices([letter for _, letter in ranked], weights=weights, k=1)[0]
