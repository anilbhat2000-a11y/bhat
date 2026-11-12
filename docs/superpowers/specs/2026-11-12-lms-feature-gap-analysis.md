# LMS Feature Gap Analysis

Date: 2026-11-12
Compares the approved design (`2026-11-12-lms-portal-design.md`) against features and practices from ten corporate LMS products: Docebo, TalentLMS, Absorb LMS, LearnUpon, Cornerstone OnDemand, Blend-ed, 360Learning, SAP Litmos, LearnWorlds, and Thinkific.

Status key: **Covered** (in the approved design), **Partial** (some of it is in the design), **Missing** (not in the design).

The approved design is for one company's employees, so client-facing features are marked "scope decision" until the audience question is answered.

## 1. Feature comparison

| # | Capability (vendors that list it) | Status | Where it stands | Scope |
|---|---|---|---|---|
| 1 | Multi-branch or multi-tenant portals with separate branding (Absorb, LearnUpon, Blend-ed, Cornerstone, TalentLMS) | Missing | Design is one company, with no tenants. | Scope decision |
| 2 | External learners: clients, partners, resellers (Docebo, LearnUpon, Blend-ed) | Missing | Users are company employees only. | Scope decision |
| 3 | Personalised learning paths (Docebo) | Missing | Courses are browsed; no sequenced paths. | Recommended |
| 4 | Course recommendations based on role and history (Docebo) | Missing | Catalogue only. | Recommended (simple rules first) |
| 5 | AI-assisted tagging of content (Docebo, Absorb) | Missing | Subjects and levels are set by hand. | Later |
| 6 | Ready-made content library or marketplace (TalentLMS, SAP Litmos) | Missing | We author all content. | Scope decision (buy or build) |
| 7 | SCORM and xAPI import and tracking (TalentLMS) | Missing | Only PDF, MP4, and links are accepted. | Required if we buy third-party content |
| 8 | Built-in content authoring (SAP Litmos) | Partial | Rich-text lessons and file uploads. | Covered enough for now |
| 9 | Interactive video (LearnWorlds) | Missing | Video plays without checkpoints. | Later |
| 10 | Subject-matter experts build content collaboratively (360Learning) | Missing | Only admins author content. | Recommended: add a CONTRIBUTOR role |
| 11 | Skill mapping and competency framework (Cornerstone) | Partial | Subjects and levels exist; no skills tied to roles. | Recommended |
| 12 | HR and succession integration (Cornerstone) | Missing | Not in the design. | Out of scope for now |
| 13 | Gamification: points and badges (Absorb) | Missing | Not in the design. | Optional |
| 14 | Enterprise analytics and technical readiness (Cornerstone, Absorb) | Partial | Certification and pass-rate dashboards. No readiness against role requirements, no billable-readiness view. | Recommended, after item 11 |
| 15 | Robust reporting, scheduled reports (Absorb) | Partial | Dashboards with CSV export. No scheduled delivery. | Recommended |
| 16 | Selling courses, e-commerce, bulk seats (LearnWorlds, Thinkific) | Missing | Not relevant to internal training. | Out of scope |
| 17 | Custom domain branding (Thinkific) | Missing | Single brand. | Low priority |
| 18 | Single sign-on and third-party integrations (SAP Litmos, Docebo) | Missing | Email and password only. | Recommended later |
| 19 | Fast setup and a clean interface (TalentLMS, Litmos) | Covered | Docker Compose; simple portal pages. | Covered |
| 20 | Shared academy modules across clients (LearnWorlds) | Missing | Tied to item 1. | Scope decision |
| 21 | Compliance training with due dates and recurrence (Litmos, Absorb) | Covered | Weekly, monthly, and annual cadence with due dates. | Covered |
| 22 | Virtual classrooms, live sessions, global instructors (Docebo) | Missing | Pending the delivery-format decision. | Pending your answer |
| 23 | Reminders for due and overdue assessments | Missing | **Not in the design. Gap in our own design.** | Required |
| 24 | Certificate documents on completion | Missing | Certification records exist; no printable certificate. | Required |
| 25 | Audit log of changes to content, users, and scores | Missing | Not in the design. | Required |
| 26 | Accessibility (WCAG 2.1 AA) | Missing | Not in the design. | Required |
| 27 | Question pools with random selection per attempt | Missing | Fixed questions, shuffled options only. | Recommended |
| 28 | Resume where the learner left off | Partial | Lesson completion is tracked; no saved position in videos. | Recommended |
| 29 | Multiple languages | Missing | English only. | Ask your team |
| 30 | Manager review of team progress | Covered | Manager portal. | Covered |
| 31 | Assessment history and retakes | Covered | Attempts per period, limit of 3. | Covered |
| 32 | 24/7 vendor support (Absorb) | Not applicable | An operations decision, not a product feature. | Operations |

## 2. Gaps in our own design

Items 23, 24, 25, and 26 are best practice for any LMS and are missing from the approved design, so they should be added even if nothing else changes:

- **Reminders:** email before a due date and when a period is overdue.
- **Certificates:** a PDF certificate for each certification, with a verification code.
- **Audit log:** a record of who changed content, users, assessments, and scores, and when.
- **Accessibility:** WCAG 2.1 AA for all portal pages, with keyboard navigation and captions on video.

## 3. Recommended changes to the design

**Required (add to the design now):**
1. Reminders, certificates, audit log, and accessibility (items 23 to 26).
2. A CONTRIBUTOR role, so subject-matter experts can draft courses that an admin approves (item 10).
3. A question pool per assessment, with a set number of random questions per attempt (item 27).
4. Resume-where-I-left-off for lessons (item 28).

**Recommended (add in a second phase):**
5. Skill matrix tied to roles, plus readiness reports (items 11 and 14).
6. Learning paths and simple rule-based recommendations (items 3 and 4).
7. Scheduled reports and single sign-on (items 15 and 18).

**Scope decisions (need your answer before designing):**
8. Are the learners internal employees only, or also clients and partners? If external users are included, items 1, 2, and 20 become required, and the data model needs a tenant layer.
9. Do you want to buy third-party content? If so, item 7 (SCORM and xAPI) is required.
10. Do you need languages other than English (item 29)?

**Later:** AI tagging, interactive video, gamification, and HR integration.
