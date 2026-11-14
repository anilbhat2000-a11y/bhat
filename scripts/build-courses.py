"""Builds content/courses/<slug>.json for every catalogue course that has content in
scripts/course_content/. Titles, descriptions, objectives and modules come from
content/catalogue.json, so the course always matches the catalogue.

Run: python3 scripts/build-courses.py   (then: python3 scripts/build-catalogue.py)
"""
import importlib
import json
import os
import pkgutil
import re
import sys

ROOT = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, os.path.dirname(__file__))
import course_content  # noqa: E402

def lower_first(text):
    """'Explain X' -> 'explain X', but leave acronyms such as 'SD-WAN' or 'GeM' alone."""
    return text[0].lower() + text[1:] if len(text) > 1 and text[1].islower() and text[0].isupper() and not text.startswith("GeM") else text


CONTENT = {}
for mod in pkgutil.iter_modules(course_content.__path__):
    m = importlib.import_module(f"course_content.{mod.name}")
    for title, body in getattr(m, "COURSES", {}).items():
        assert title not in CONTENT, f"duplicate content for {title}"
        CONTENT[title] = body

cat = json.load(open(os.path.join(ROOT, "content", "catalogue.json")))
written = 0
for s in cat["subjects"]:
    for level in ("BASIC", "INTERMEDIATE", "ADVANCED"):
        c = s["levels"][level]
        if c["title"] not in CONTENT:
            continue
        data = CONTENT.pop(c["title"])
        lessons, questions = data["lessons"], data["questions"]
        assert len(lessons) == len(c["modules"]), f'{c["title"]}: {len(lessons)} lessons for {len(c["modules"])} modules'
        assert len(questions) >= 6, f'{c["title"]}: at least 6 questions'
        slug = re.sub(r"[^a-z0-9]+", "-", c["title"].lower()).strip("-")
        clean = lambda t: t.replace("[PLACEHOLDER] ", "")
        course = {
            "slug": slug,
            "title": c["title"],
            "subject": s["subject"],
            "category": s["category"],
            "level": level,
            "passMarkPercent": 70,
            "description": c["description"] + " You will be able to: " + "; ".join(lower_first(o) for o in c["objectives"]) + ".",
            "modules": [{"title": clean(m["title"]), "minutes": m["minutes"]} for m in c["modules"]],
            "lessons": [
                {"position": i + 1, "title": clean(m["title"]), "type": "TEXT", "body": lessons[i].strip(), "module": i + 1}
                for i, m in enumerate(c["modules"])
            ],
            "assessment": {"title": f'{c["title"].split(":")[0]}: completion check', "level": level, "passMarkPercent": 70, "questions": questions},
        }
        with open(os.path.join(ROOT, "content", "courses", f"{slug}.json"), "w") as f:
            json.dump(course, f, indent=2, ensure_ascii=False)
            f.write("\n")
        written += 1

assert not CONTENT, f"content for titles not in the catalogue: {list(CONTENT)}"
print(f"wrote {written} course files")
