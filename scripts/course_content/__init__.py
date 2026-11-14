"""Course content for the catalogue (lessons and completion checks), one module per subject group.

Each module defines COURSES: {catalogue course title: {"lessons": [one body per catalogue
module], "questions": [q(...), ...]}}. Lesson bodies use the LMS's safe Markdown subset:
paragraphs, "- " bullets, "1. " numbered lists, "## " sub-headings, "> " notes and **bold**.
Company-specific facts (prices, policies, OEM line cards) are left as [PLACEHOLDER] text.
"""


def q(type_, text, options=(), correct=(), points=1, explanation=None, scenario=None):
    """One question in the seed format. Correct answers are written as option text.
    FILL_BLANK: options are the accepted answers. MATCHING: options are "left=right" pairs.
    SHORT_ANSWER: no options. For those three, leave correct empty."""
    out = {"type": type_, "text": text, "options": list(options), "correct": list(correct), "points": points}
    if explanation:
        out["explanation"] = explanation
    if scenario:
        out["scenario"] = scenario
    return out


TF = ["True", "False"]
