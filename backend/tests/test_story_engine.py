import pytest

from app.story_engine import transform


@pytest.mark.parametrize(
    ("source", "expected"),
    [
        ("I am tired.", "Alex is tired."),
        ("I have tried.", "Alex has tried."),
        ("I do my best.", "Alex does Alex's best."),
        ("I feel nervous.", "Alex feels nervous."),
        ("I think I failed.", "Alex thinks Alex failed."),
        ("I want help.", "Alex wants help."),
        ("I need rest.", "Alex needs rest."),
        ("I wish I knew.", "Alex wishes Alex knew."),
        ("I keep worrying.", "Alex keeps worrying."),
        ("I try again.", "Alex tries again."),
        ("I worry too much.", "Alex worries too much."),
        ("I hope tomorrow helps.", "Alex hopes tomorrow helps."),
        ("This happened to me.", "This happened to Alex."),
        ("My test was hard.", "Alex's test was hard."),
        ("Mine was worse.", "Alex's was worse."),
        ("I blamed myself.", "Alex blamed Alex."),
        ("I'm overwhelmed.", "Alex is overwhelmed."),
        ("I've done enough.", "Alex has done enough."),
        ("I'll rest.", "Alex will rest."),
        ("I'd like help.", "Alex would like help."),
        ("Yesterday I cried.", "Yesterday Alex cried."),
        ("My friend saw me.", "Alex's friend saw Alex."),
        ("I was late.", "Alex was late."),
        ("I went home.", "Alex went home."),
        ("I made a mistake.", "Alex made a mistake."),
        ("I ran away.", "Alex ran away."),
        ("I ate lunch.", "Alex ate lunch."),
        ("I saw Jordan.", "Alex saw Jordan."),
        ("Jordan called me.", "Jordan called Alex."),
        ("I love my work.", "Alex love Alex's work."),
    ],
)
def test_transforms_common_first_person(source: str, expected: str) -> None:
    result = transform(source)
    assert "".join(token["alex"] for token in result["tokens"]) == expected
    assert not result["fallback"]


def test_keeps_original_tokens_for_reveal() -> None:
    result = transform("I feel nervous.", "Maya")
    assert result["tokens"][0] == {"orig": "I", "alex": "Maya", "changed": True}


def test_falls_back_when_no_safe_transform_exists() -> None:
    result = transform("The exam was difficult.")
    assert result["fallback"]
    assert "The exam was difficult." in result["tokens"][0]["alex"]
