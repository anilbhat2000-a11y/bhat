# Course content

This folder holds the sample content loaded by the seed:

- `courses/`: one course per file (format below).
- `question-banks/`: recurring assessments with their question banks (the 20-question Sales Basic and Networking Basic monthly assessments). Same question format as below, plus `cadence`, `timeLimitMinutes`, `questionsPerAttempt` and `assignDepartment`. Question types include `FILL_BLANK` (options are the accepted answers), `MATCHING` (options written `left=right`) and `SHORT_ANSWER`, each with an empty `correct`, and any question can have `scenario` and `explanation`.
- `catalogue.json`: the 17-subject catalogue outline (see `docs/CATALOGUE.md`).

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
