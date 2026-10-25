import pytest

from app.safety import any_flagged, is_flagged


@pytest.mark.parametrize(
    "text",
    [
        "I want to die",
        "I will kill myself",
        "I feel suicidal",
        "I might hurt myself",
        "self harm",
        "I will overdose",
        "no reason to live",
        "better off dead",
        "I can't go on",
        "I planned my death",
        "I am going to jump",
        "hang myself",
        "shoot myself",
        "I want to end my life",
        "cut myself",
    ],
)
def test_flags_crisis_language(text: str) -> None:
    assert is_flagged(text)


@pytest.mark.parametrize(
    "text",
    [
        "This project is killing me",
        "I want to die my hair",
        "That joke was suicidal",
        "I am dying of laughter",
        "The battery is dead",
        "I cut myself a slice of cake",
        "The jump was difficult",
        "The game has shooting stars",
        "I will hang the picture",
        "My exam was an overdose of information",
    ],
)
def test_avoids_common_false_positives(text: str) -> None:
    assert not is_flagged(text)


def test_checks_all_inputs() -> None:
    assert any_flagged("A normal day", "I want to die")
