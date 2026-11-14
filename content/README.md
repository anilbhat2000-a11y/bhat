# Course content

This folder holds the sample content loaded by the seed:

- `courses/`: one course per file (format below).
- `question-banks/`: recurring assessments with their question banks (the 20-question Sales Basic and Networking Basic monthly assessments). Same question format as below, plus `cadence`, `timeLimitMinutes`, `questionsPerAttempt` and `assignDepartment`. Question types include `FILL_BLANK` (options are the accepted answers), `MATCHING` (options written `left=right`) and `SHORT_ANSWER`, each with an empty `correct`, and any question can have `scenario` and `explanation`.
- `catalogue.json`: the 17-subject catalogue outline (see `docs/CATALOGUE.md`).

All course files are generated: the lessons, questions and sources live in `scripts/course_content/` (one Python module per subject, plus `extra_*.py` for the courses outside the catalogue) and `python3 scripts/build-courses.py` writes them here, taking titles, modules and minutes from `catalogue.json`. Courses written before the catalogue keep their original title and file name, so existing databases recognise them. Run `npm run catalogue:docs` afterwards to refresh the catalogue document.

Every lesson follows the same shape: an introduction, two or three headed sections, **Key terms**, **Real-world example** (an Indian IT situation with fictional names), **Common mistakes** and **Key takeaways**. Every question has an explanation, and every course lists its sources (official rules, standards bodies and vendor documentation), shown to learners under "Sources and further reading". Facts that come from a rule or standard name it (for example GFR 2017 Rule 171, CGST Rule 46, ISO/IEC 27001:2022), so a reader can check the current version. The structure follows the pattern of leading learning portals for IT (short modules, worked examples, a check at the end); no text is copied from them.

Lesson text supports a safe Markdown subset: paragraphs, `- ` bullets, `1. ` lists, `## ` sub-headings, `> ` notes, `**bold**` and https links. Course files may also list `modules` (title and minutes), with each lesson naming its `module` number, and `sources` (title and https url).

## Updating content in an installation that already has it

Re-running the seed (`npx tsx prisma/seed.ts`) updates courses whose file has changed: the description, sources, modules, lesson text and completion-check questions are replaced in place, matched by position, so learners keep their progress and past attempts. It prints how many courses it updated. A course an administrator has changed in the portal (lessons or modules added, edited, reordered or removed) is no longer managed by the seed and is left exactly as it is.

Each file in `courses/` is one course. The seed step (`prisma/seed.ts`, Task 19 of the plan) loads these files into the database.

## File format

```json
{
  "slug": "fundamentals-enterprise-sales",
  "title": "Fundamentals of Enterprise Sales",
  "subject": "Sales",
  "category": "BUSINESS",
  "level": "BASIC",
  "passMarkPercent": 70,
  "description": "One or two sentences shown in the catalogue.",
  "lessons": [
    { "position": 1, "title": "Lesson title", "type": "TEXT", "body": "Markdown text." }
  ],
  "sources": [{ "title": "CBIC GST: Acts and rules", "url": "https://cbic-gst.gov.in/" }],
  "assessment": {
    "title": "Completion check",
    "cadence": "ONE_TIME",
    "level": "BASIC",
    "passMarkPercent": 70,
    "questions": [
      { "position": 1, "type": "SINGLE", "text": "Question?", "options": ["A", "B", "C", "D"], "correct": ["B"], "points": 1 }
    ]
  }
}
```

- `subject` must match a seeded subject name.
- `category` is `BUSINESS` or `TECHNICAL`.
- `level` is `BASIC`, `INTERMEDIATE`, or `ADVANCED`.
- `correct` holds the exact text of the correct option. A `MULTIPLE` question lists every correct option. A `TRUE_FALSE` question has options `True` and `False`.
- Assessments here are course completion checks (`ONE_TIME`). Weekly, monthly, and annual assessments are authored separately in the admin portal.

## Sources for portfolio content

Course content for the technical subjects is based on the product categories in the company's public listings:
- [IndiaMART seller page for 3C IT Solutions](https://m.indiamart.com/threecit-solutions/about-us.html), with product pages such as [Fortinet firewall](https://m.indiamart.com/threecit-solutions/fortinet-firewall.html) and [networking devices](https://m.indiamart.com/threecit-solutions/networking-device.html)
- [Company profile on Screener](https://www.screener.in/company/id/1284802/)

Partner names and client claims in the seller listings are not verified, so the courses don't name them. Cloud and HPC/AI/ML courses are included because they were requested, and they are not confirmed as part of the company's current portfolio.
