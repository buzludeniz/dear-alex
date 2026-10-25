from __future__ import annotations

import re
from dataclasses import asdict, dataclass

TOKEN_RE = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?|[^A-Za-z]+")
PRONOUNS = {
    "i": "Alex",
    "me": "Alex",
    "my": "Alex's",
    "mine": "Alex's",
    "myself": "Alex",
    "i'm": "Alex is",
    "i've": "Alex has",
    "i'll": "Alex will",
    "i'd": "Alex would",
}
VERBS = {
    "am": "is",
    "have": "has",
    "do": "does",
    "feel": "feels",
    "think": "thinks",
    "want": "wants",
    "need": "needs",
    "wish": "wishes",
    "keep": "keeps",
    "try": "tries",
    "worry": "worries",
    "hope": "hopes",
}


@dataclass(frozen=True)
class StoryToken:
    orig: str
    alex: str
    changed: bool


def _preserve_case(source: str, replacement: str) -> str:
    return replacement.capitalize() if source[:1].isupper() else replacement


def transform(story: str, character_name: str = "Alex") -> dict:
    name = character_name.strip() or "Alex"
    mappings = {**PRONOUNS, **VERBS}
    tokens: list[StoryToken] = []
    changed_words = 0
    words = 0
    for part in TOKEN_RE.findall(story):
        lower = part.lower()
        replacement = mappings.get(lower)
        if lower in PRONOUNS:
            replacement = PRONOUNS[lower].replace("Alex", name)
        if replacement:
            replacement = _preserve_case(part, replacement)
            tokens.append(StoryToken(part, replacement, True))
            changed_words += 1
        else:
            tokens.append(StoryToken(part, part, False))
        if part.strip() and part[0].isalpha():
            words += 1
    confidence = min(1.0, changed_words / max(1, min(words, 4)) + (0.2 if changed_words else 0))
    if changed_words == 0:
        fallback = f"{name} is going through this: “{story.strip()}”"
        tokens = [StoryToken(story, fallback, True)]
    return {
        "tokens": [asdict(token) for token in tokens],
        "confidence": round(confidence, 2),
        "fallback": changed_words == 0,
    }
