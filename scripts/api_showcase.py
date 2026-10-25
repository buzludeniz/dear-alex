#!/usr/bin/env python3
"""
Dear Alex — Terminal automated showcase runner.

Executes the full Dear Alex game loop against the running backend:
1. Health check & card deck inspection
2. Mood check-in & device registration
3. Story transform & safety gating
4. Session creation (Academic setback)
5. 3 Coaching scenes (Compassion / Perspective / Action) with real cards
6. Session finish & Letter generation
7. Vault storage, surprise letter resurfacing, and JSON export

Usage:
    python scripts/api_showcase.py [--url http://localhost:8000]
"""

from __future__ import annotations

import argparse
import json
import time
import urllib.error
import urllib.request
import uuid

BOLD = "\033[1m"
GREEN = "\033[32m"
CYAN = "\033[36m"
YELLOW = "\033[33m"
MAGENTA = "\033[35m"
RESET = "\033[0m"


def banner(text: str) -> None:
    print(f"\n{BOLD}{CYAN}══════════════════════════════════════════════════════════════{RESET}")
    print(f"{BOLD}{CYAN}  {text}{RESET}")
    print(f"{BOLD}{CYAN}══════════════════════════════════════════════════════════════{RESET}\n")


def subheader(text: str) -> None:
    print(f"\n{BOLD}{YELLOW}▶ {text}{RESET}")


def success(text: str) -> None:
    print(f"  {GREEN}✓{RESET} {text}")


def request(url: str, path: str, method: str = "GET", data: dict | None = None, headers: dict | None = None) -> dict:
    full_url = f"{url.rstrip('/')}/api{path}"
    headers = headers or {}
    req_body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(full_url, data=req_body, headers=headers, method=method)
    if data is not None:
        req.add_header("Content-Type", "application/json")

    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            if not content:
                return {}
            return json.loads(content)
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8")
        print(f"HTTP Error {e.code}: {err}")
        raise


def run_showcase(base_url: str) -> None:
    device_id = str(uuid.uuid4())
    headers = {"X-Device-Id": device_id}

    banner("DEAR ALEX — AUTOMATED END-TO-END SHOWCASE")
    print(f"Target Backend API: {base_url}/api")
    print(f"Simulated Device UUID: {device_id}\n")

    # Step 1: Health check
    subheader("Step 1: System Health Check")
    health = request(base_url, "/health")
    assert health.get("ok") is True, f"Health check failed: {health}"
    success("Backend is running and database connection is healthy.")

    # Step 2: Fetch Cards
    subheader("Step 2: Fetching Coaching Card Deck")
    cards = request(base_url, "/cards")
    success(f"Retrieved {len(cards)} coaching cards across scenes (Moment, Voice, Tomorrow).")
    for style in ("Compassion", "Perspective", "Action"):
        count = sum(1 for c in cards if c["style"] == style)
        print(f"    • {style} cards: {count}")

    # Step 3: Story Intake & Transformation
    subheader("Step 3: Story Intake & Self-Distancing Transformation")
    user_story = "I got my midterm back and it was much worse than I hoped. I studied hard for weeks and still failed."
    user_critic = "I am just not cut out for computer science."
    print(f"  {BOLD}User Input (First-Person):{RESET}\n    \"{user_story}\"")
    print(f"  {BOLD}Inner Critic:{RESET}\n    \"{user_critic}\"")

    story_res = request(base_url, "/story", method="POST", data={"story": user_story, "character_name": "Alex"})
    assert story_res.get("safe") is True, "Story flagged incorrectly"
    alex_reconstructed = "".join(t["alex"] for t in story_res["tokens"])
    print(f"\n  {BOLD}Self-Distanced Story (Alex's World):{RESET}\n    \"{alex_reconstructed}\"")
    success(f"Confidence score: {story_res.get('confidence')} | Changed tokens: {sum(1 for t in story_res['tokens'] if t['changed'])}")

    # Step 4: Create Session
    subheader("Step 4: Starting Guided Coaching Session")
    session_data = {
        "story": user_story,
        "inner_voice": user_critic,
        "category": "Academic",
        "character_name": "Alex",
        "mood_before": 2,
    }
    session_res = request(base_url, "/sessions", method="POST", data=session_data, headers=headers)
    session_id = session_res["id"]
    success(f"Session established with ID: {session_id}")

    # Step 5: Three Coaching Scenes
    subheader("Step 5: Coaching Alex Through Three Scenes")
    scenes = [
        ("moment", "The Moment: Arrive & soothe immediate distress", "Compassion"),
        ("voice", "The Voice: Reframe the inner critic", "Perspective"),
        ("tomorrow", "Tomorrow: Identify one gentle next step", "Action"),
    ]

    for scene_key, description, target_style in scenes:
        time.sleep(0.4)
        scene_cards = [c for c in cards if c["scene"] == scene_key and c["style"] == target_style]
        chosen = scene_cards[0]
        print(f"\n  {BOLD}Scene [{scene_key.upper()}]{RESET}: {description}")
        print(f"    Chosen card ({chosen['style']}): \"{chosen['text']}\"")
        advice_res = request(
            base_url,
            f"/sessions/{session_id}/advice",
            method="POST",
            data={
                "scene_key": scene_key,
                "card_id": chosen["id"],
                "free_text": None,
                "style": chosen["style"],
            },
            headers=headers,
        )
        assert advice_res.get("safe") is True
        print(f"    Alex's Reaction: \"{chosen['reaction']}\"")
        success(f"Advice recorded for scene '{scene_key}'.")

    # Step 6: Complete Session & Generate Letter
    subheader("Step 6: Completing Session & Triggering The Reveal")
    finish_res = request(
        base_url,
        f"/sessions/{session_id}/finish",
        method="POST",
        data={"mood_after": 4},
        headers=headers,
    )
    letter = finish_res["letter"]
    reveal_tokens = finish_res.get("reveal", [])
    success(f"Generated Letter to You (Dominant style: {letter['letter_type']})")
    print(f"\n  {MAGENTA}{BOLD}─── THE REVEAL ───{RESET}")
    print(f"  {MAGENTA}That advice was for you all along.{RESET}")
    print(f"  Tokens morphed back: {len(reveal_tokens)} tokens")

    print(f"\n  {BOLD}─── GENERATED LETTER ───{RESET}")
    print(f"  Category: {letter['category']} | Created: {letter['created_at']}")
    print(f"  \"You went through this: '{letter['body']['story']}'\"")
    for adv in letter["body"]["advice"]:
        print(f"    • [{adv['style']}] {adv['text']}")
    print("  \"You deserve the same care you give away.\"\n")

    # Step 7: Vault inspection & Resurfacing
    subheader("Step 7: Letter Vault & Scored Surprise Resurfacing")
    vault = request(base_url, "/vault", headers=headers)
    success(f"Vault contains {len(vault['letters'])} stored letters.")
    print(f"  Collection badges: {vault['collection']}")

    surprise = request(base_url, "/vault/surprise?category=Academic&mood=2", headers=headers)
    surfaced = surprise.get("letter")
    if surfaced:
        success(f"Successfully resurfaced past letter: {surfaced['id']} ({surfaced['letter_type']})")

    # Step 8: Export
    subheader("Step 8: Privacy & Data Portability")
    export_data = request(base_url, "/vault/export", headers=headers)
    success(f"Exported data verified: {len(export_data.get('letters', []))} letters formatted as JSON.")

    banner("SHOWCASE COMPLETED SUCCESSFULLY WITH ZERO ERRORS")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Dear Alex Terminal Automated Showcase")
    parser.add_argument("--url", default="http://localhost:8000", help="Backend base URL")
    args = parser.parse_args()

    try:
        run_showcase(args.url)
    except Exception as e:
        print(f"\n❌ Error during showcase: {e}")
        print("Note: ensure the backend is running via: uvicorn app.main:app --reload")
