"""Course content for the catalogue (lessons and completion checks), one module per subject.

Each module defines COURSES: {catalogue course title: {"lessons": [one body per catalogue
module], "questions": [q(...), ...], "sources": [(title, https url), ...]}}.

Every lesson follows the same shape, so learners always know where to look:
  an introduction, two or three "## " sections that teach the topic, "## Key terms",
  "## Real-world example" (an Indian IT or system-integration situation; customer names are
  fictional), "## Common mistakes" and "## Key takeaways".

Lesson bodies use the LMS's safe Markdown subset: paragraphs, "- " bullets, "1. " numbered
lists, "## " sub-headings, "> " notes, **bold** and https links. Company-specific facts
(prices, policies, approval levels, OEM line cards) are marked [PLACEHOLDER] for the LMS
administrator to replace. Facts that come from a rule or standard name it, and the course's
sources list the official page, so a reader can check the latest version.
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

# Learning portals used as references for course structure (not content).
MS_LEARN = ("Microsoft Learn: free role-based training paths", "https://learn.microsoft.com/en-us/training/")
AWS_SKILL_BUILDER = ("AWS Skill Builder: cloud training", "https://skillbuilder.aws/")
CISCO_NETACAD = ("Cisco Networking Academy: networking and security courses", "https://www.netacad.com/")
TRAILHEAD = ("Salesforce Trailhead: sales and CRM learning trails", "https://trailhead.salesforce.com/")
HUBSPOT_ACADEMY = ("HubSpot Academy: sales and inbound courses", "https://academy.hubspot.com/")
