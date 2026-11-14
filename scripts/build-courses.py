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
EXTRA = {}  # courses outside the catalogue: {existing course title: {lessons, questions, sources}}
for mod in pkgutil.iter_modules(course_content.__path__):
    m = importlib.import_module(f"course_content.{mod.name}")
    for title, body in getattr(m, "COURSES", {}).items():
        assert title not in CONTENT, f"duplicate content for {title}"
        CONTENT[title] = body
    for title, body in getattr(m, "EXTRA", {}).items():
        assert title not in EXTRA, f"duplicate extra content for {title}"
        EXTRA[title] = body


def check(title, data):
    assert len(data["questions"]) >= 6, f"{title}: at least 6 questions"
    for qn in data["questions"]:
        assert qn.get("explanation"), f"{title}: every question needs an explanation ({qn['text'][:40]})"
        assert not any("|" in o for o in qn["options"]), f"{title}: options cannot contain |"
    sources = [{"title": t, "url": u} for t, u in data.get("sources", [])]
    assert sources, f"{title}: list at least one source"
    for src in sources:
        assert src["url"].startswith("https://"), f"{title}: source links must be https ({src['url']})"
    return sources

cat = json.load(open(os.path.join(ROOT, "content", "catalogue.json")))
COURSE_DIR = os.path.join(ROOT, "content", "courses")
# Courses that were written before the catalogue keep their title and file name, so the seed
# recognises them in databases that already hold them.
EXISTING = {}
for name in os.listdir(COURSE_DIR):
    if name.endswith(".json"):
        EXISTING[json.load(open(os.path.join(COURSE_DIR, name)))["title"]] = name[:-5]

written = 0
for s in cat["subjects"]:
    for level in ("BASIC", "INTERMEDIATE", "ADVANCED"):
        c = s["levels"][level]
        if c["title"] not in CONTENT:
            continue
        data = CONTENT.pop(c["title"])
        lessons, questions = data["lessons"], data["questions"]
        assert len(lessons) == len(c["modules"]), f'{c["title"]}: {len(lessons)} lessons for {len(c["modules"])} modules'
        sources = check(c["title"], data)
        title = c.get("existingCourse") or c["title"]
        slug = EXISTING.get(title) or re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
        clean = lambda t: t.replace("[PLACEHOLDER] ", "")
        course = {
            "slug": slug,
            "title": title,
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
            "sources": sources,
            "assessment": {"title": f'{c["title"].split(":")[0]}: completion check', "level": level, "passMarkPercent": 70, "questions": questions},
        }
        with open(os.path.join(COURSE_DIR, f"{slug}.json"), "w") as f:
            json.dump(course, f, indent=2, ensure_ascii=False)
            f.write("\n")
        written += 1

# Courses outside the catalogue keep their file's title, slug, level and lesson titles; only
# the lesson text, the completion-check questions and the sources are replaced.
for title, data in EXTRA.items():
    slug = EXISTING.get(title)
    assert slug, f"extra content for a course file that does not exist: {title}"
    path = os.path.join(COURSE_DIR, f"{slug}.json")
    course = json.load(open(path))
    assert len(data["lessons"]) == len(course["lessons"]), f'{title}: {len(data["lessons"])} lessons for {len(course["lessons"])}'
    course["sources"] = check(title, data)
    for lesson, body in zip(course["lessons"], data["lessons"]):
        lesson["body"] = body.strip()
    course["assessment"]["questions"] = data["questions"]
    with open(path, "w") as f:
        json.dump(course, f, indent=2, ensure_ascii=False)
        f.write("\n")
    written += 1

assert not CONTENT, f"content for titles not in the catalogue: {list(CONTENT)}"
print(f"wrote {written} course files")
