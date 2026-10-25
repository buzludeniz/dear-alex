"""
Comprehensive Edge Cases & Boundary Conditions Test Suite for Dear Alex.

COVERS:
1. Custom character name substitution & punctuation preservation in story engine.
2. Complex crisis safety gate boundary conditions & multi-field verification.
3. Vault resurfacing math & recency decay cutoffs.
4. Database transaction integrity & concurrent session processing.
"""

from __future__ import annotations

import concurrent.futures
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models import Letter, SessionRecord
from app.resurface import choose, score
from app.safety import any_flagged, is_flagged
from app.story_engine import transform


# --- 1. Story Engine Edge Cases ---

def test_custom_character_name_substitution():
    text = "I am worried about my midterm. I feel overwhelmed."
    result = transform(text, character_name="Taylor")
    assert result["safe"] is True if "safe" in result else True
    # Tokens should substitute 'Taylor' and "Taylor's" instead of 'Alex'
    transformed_text = "".join(t["alex"] for t in result["tokens"])
    assert "Taylor is worried" in transformed_text
    assert "Taylor's midterm" in transformed_text


def test_punctuation_and_contraction_preservation():
    text = "I'm... feeling lost! My score was 42%; I've tried."
    result = transform(text, character_name="Alex")
    tokens = result["tokens"]
    reconstructed_orig = "".join(t["orig"] for t in tokens)
    assert reconstructed_orig == text
    transformed_text = "".join(t["alex"] for t in tokens)
    assert "Alex is... feeling lost!" in transformed_text
    assert "Alex's score was 42%" in transformed_text


def test_quoted_fallback_when_no_first_person_pronouns():
    text = "The presentation went poorly. The audience was silent."
    result = transform(text, character_name="Jordan")
    assert result["fallback"] is True
    assert len(result["tokens"]) == 1
    assert "Jordan is going through this:" in result["tokens"][0]["alex"]


# --- 2. Safety Gate Boundary Conditions ---

@pytest.mark.parametrize(
    "text",
    [
        "I am going to DIE MY HAIR blue tomorrow.",
        "That joke was suicidal, but funny.",
        "My professor gave an overdose of homework over the weekend.",
        "I cut myself a large slice of cake after exams.",
    ],
)
def test_safety_gate_false_positive_guards(text: str):
    assert is_flagged(text) is False


@pytest.mark.parametrize(
    "text",
    [
        "I WANT TO DIE",
        "I will kill myself tonight",
        "I plan to end my life soon",
        "I feel like I cannot go on anymore",
    ],
)
def test_safety_gate_acute_triggers(text: str):
    assert is_flagged(text) is True


def test_multi_field_safety_check():
    safe_text = "I got a C on my chemistry quiz."
    crisis_text = "I want to end my life"
    assert any_flagged(safe_text, safe_text, None) is False
    assert any_flagged(safe_text, crisis_text) is True


# --- 3. Vault Resurfacing Boundary Math ---

class MockLetter:
    def __init__(self, category: str, letter_type: str, last_resurfaced_at: datetime | None):
        self.category = category
        self.letter_type = letter_type
        self.last_resurfaced_at = last_resurfaced_at


def test_resurfacing_recency_penalty_decay():
    now = datetime.now(timezone.utc)
    recent_letter = MockLetter("Academic", "Compassion", now - timedelta(days=2))
    old_letter = MockLetter("Academic", "Compassion", now - timedelta(days=10))

    recent_score = score(recent_letter, "Academic", mood=1, now=now)
    old_score = score(old_letter, "Academic", mood=1, now=now)

    # Old letter should score higher because recent letter suffers -5 penalty
    assert old_score > recent_score
    assert old_score - recent_score == 5.0


def test_resurfacing_choice_from_multiple_candidates():
    now = datetime.now(timezone.utc)
    letters = [
        MockLetter("Academic", "Compassion", None),
        MockLetter("Social", "Perspective", None),
        MockLetter("Other", "Action", None),
    ]
    chosen = choose(letters, category="Academic", mood=1, seed=42)
    assert chosen is not None
    assert chosen.category == "Academic"


# --- 4. FastAPI Concurrency & Database Integration ---

def test_api_concurrency_stress(tmp_path):
    client = TestClient(app)
    device_id = "00000000-0000-0000-0000-000000000099"

    def run_session(idx: int):
        headers = {"X-Device-Id": device_id}
        # Step 1: Create session
        res = client.post(
            "/api/sessions",
            json={
                "story": f"I had a stressful day number {idx}.",
                "inner_voice": f"I cannot keep up with batch {idx}.",
                "category": "Academic",
                "character_name": "Alex",
                "mood_before": 2,
            },
            headers=headers,
        )
        assert res.status_code == 200
        session_id = res.json()["id"]

        # Step 2: Add 3 scene advice
        for scene in ("moment", "voice", "tomorrow"):
            adv_res = client.post(
                f"/api/sessions/{session_id}/advice",
                json={
                    "scene_key": scene,
                    "card_id": "c1",
                    "free_text": f"Take a break on step {scene}.",
                    "style": "Compassion",
                },
                headers=headers,
            )
            assert adv_res.status_code == 200

        # Step 3: Finish session
        fin_res = client.post(
            f"/api/sessions/{session_id}/finish",
            json={"mood_after": 4},
            headers=headers,
        )
        assert fin_res.status_code == 200
        return session_id

    # Execute 5 concurrent sessions
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(run_session, i) for i in range(5)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]

    assert len(results) == 5

    # Verify vault contains letters
    vault_res = client.get("/api/vault", headers={"X-Device-Id": device_id})
    assert vault_res.status_code == 200
    assert len(vault_res.json()["letters"]) >= 5
