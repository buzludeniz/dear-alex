"""
Pre-Persistence Safety Gate for Dear Alex.

HUMAN-CENTRIC ENGINEERING & ETHICS:
-----------------------------------
Safety is the highest non-negotiable constraint. When a user is in acute psychological distress,
gamified reflection must immediately step aside and route the user to professional crisis support.

HARD PRIVACY RULE:
- All free-text inputs pass through this gate BEFORE any database write or disk logging occurs.
- If crisis language is detected, the session halts immediately, returns helpline details (9-8-8),
  and DISCARDS the flagged text from memory. Zero flagged text is ever persisted to SQLite.

FALSE-POSITIVE GUARDS:
- Students often use colloquial English like "this exam is killing me" or "die my hair".
  False-positive guards prevent blocking non-crisis venting while keeping acute crisis patterns strict.
"""

from __future__ import annotations

import re

# Explicit crisis patterns indicating self-harm, suicide, or acute danger
PATTERNS = [
    r"\bkill myself\b",
    r"\bend my life\b",
    r"\bsuicid(?:e|al)\b",
    r"\bwant to die\b",
    r"\bhurt myself\b",
    r"\bself[- ]?harm\b",
    r"\bcut myself\b",
    r"\boverdose\b",
    r"\bno reason to live\b",
    r"\bbetter off dead\b",
    r"\bcan'?t go on\b",
    r"\bcannot go on\b",
    r"\bplanned my death\b",
    r"\bgoing to jump\b",
    r"\bhang myself\b",
    r"\bshoot myself\b",
]
COMPILED = [re.compile(pattern, re.IGNORECASE) for pattern in PATTERNS]

# False-positive guard expressions to allow common colloquial/idiomatic expressions
FALSE_POSITIVE_GUARDS = [
    re.compile(r"\bdie my hair\b", re.IGNORECASE),
    re.compile(r"\bjoke was suicidal\b", re.IGNORECASE),
    re.compile(r"\bcut myself a\b", re.IGNORECASE),
    re.compile(r"\boverdose of (information|work|homework)\b", re.IGNORECASE),
]


def is_flagged(text: str | None) -> bool:
    """
    Evaluates whether free-text input contains crisis language.
    First checks false-positive guards. If no guard triggers, checks crisis patterns.
    """
    if not text or any(guard.search(text) for guard in FALSE_POSITIVE_GUARDS):
        return False
    return any(pattern.search(text) for pattern in COMPILED)


def any_flagged(*values: str | None) -> bool:
    """Convenience helper to check multiple text fields at once (e.g., story + inner voice)."""
    return any(is_flagged(value) for value in values)
