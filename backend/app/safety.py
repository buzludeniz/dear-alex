from __future__ import annotations

import re

# This conservative triage is intentionally not diagnostic. It routes clear crisis language out of the game.
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
    r"\bplanned my death\b",
    r"\bgoing to jump\b",
    r"\bhang myself\b",
    r"\bshoot myself\b",
]
COMPILED = [re.compile(pattern, re.IGNORECASE) for pattern in PATTERNS]
FALSE_POSITIVE_GUARDS = [
    re.compile(r"\bdie my hair\b", re.IGNORECASE),
    re.compile(r"\bjoke was suicidal\b", re.IGNORECASE),
    re.compile(r"\bcut myself a\b", re.IGNORECASE),
    re.compile(r"\boverdose of (information|work|homework)\b", re.IGNORECASE),
]


def is_flagged(text: str | None) -> bool:
    if not text or any(guard.search(text) for guard in FALSE_POSITIVE_GUARDS):
        return False
    return any(pattern.search(text) for pattern in COMPILED)


def any_flagged(*values: str | None) -> bool:
    return any(is_flagged(value) for value in values)
