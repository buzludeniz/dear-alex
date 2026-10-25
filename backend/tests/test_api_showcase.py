"""End-to-end automated showcase test for the Dear Alex backend API."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
DEVICE_ID = "12345678-1234-5678-1234-567812345678"
HEADERS = {"X-Device-Id": DEVICE_ID}


def test_complete_showcase_workflow():
    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"ok": True}

    # 2. Cards list
    res = client.get("/api/cards")
    assert res.status_code == 200
    cards = res.json()
    assert len(cards) >= 9

    # 3. Story transformation & safety check
    story_payload = {
        "story": "I failed my chemistry exam and I feel completely lost.",
        "character_name": "Alex",
    }
    res = client.post("/api/story", json=story_payload)
    assert res.status_code == 200
    story_data = res.json()
    assert story_data["safe"] is True
    assert len(story_data["tokens"]) > 0

    # 4. Create session
    session_payload = {
        "story": "I failed my chemistry exam and I feel completely lost.",
        "inner_voice": "I am not smart enough.",
        "category": "Academic",
        "character_name": "Alex",
        "mood_before": 2,
    }
    res = client.post("/api/sessions", json=session_payload, headers=HEADERS)
    assert res.status_code == 200
    session_id = res.json()["id"]
    assert session_id is not None

    # 5. Submit advice for all 3 scenes
    moment_card = next(c for c in cards if c["scene"] == "moment")
    voice_card = next(c for c in cards if c["scene"] == "voice")
    tomorrow_card = next(c for c in cards if c["scene"] == "tomorrow")

    for card in [moment_card, voice_card, tomorrow_card]:
        res = client.post(
            f"/api/sessions/{session_id}/advice",
            json={
                "scene_key": card["scene"],
                "card_id": card["id"],
                "free_text": None,
                "style": card["style"],
            },
            headers=HEADERS,
        )
        assert res.status_code == 200
        assert res.json()["safe"] is True

    # 6. Finish session & generate Letter
    res = client.post(
        f"/api/sessions/{session_id}/finish",
        json={"mood_after": 4},
        headers=HEADERS,
    )
    assert res.status_code == 200
    finish_data = res.json()
    assert "letter" in finish_data
    assert "reveal" in finish_data
    letter = finish_data["letter"]
    assert letter["category"] == "Academic"
    assert len(letter["body"]["advice"]) == 3

    # 7. Check vault
    res = client.get("/api/vault", headers=HEADERS)
    assert res.status_code == 200
    vault_data = res.json()
    assert len(vault_data["letters"]) >= 1

    # 8. Surprise letter resurfacing
    res = client.get("/api/vault/surprise?category=Academic&mood=2", headers=HEADERS)
    assert res.status_code == 200
    assert res.json()["letter"] is not None

    # 9. Export vault
    res = client.get("/api/vault/export", headers=HEADERS)
    assert res.status_code == 200
    export_content = res.json()
    assert export_content["device_id"] == DEVICE_ID

    # 10. Privacy: clear vault
    res = client.delete("/api/vault", headers=HEADERS)
    assert res.status_code == 204

    # Verify vault is empty
    res = client.get("/api/vault", headers=HEADERS)
    assert res.status_code == 200
    assert len(res.json()["letters"]) == 0
