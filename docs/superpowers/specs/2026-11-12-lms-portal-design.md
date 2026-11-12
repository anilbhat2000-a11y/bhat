# 3C IT Solutions LMS Portal: Design

Date: 2026-11-12
Status: Approved in conversation, pending user review of this document

## 1. Purpose and scope

An internal learning management system for 3C IT Solutions and Telecoms India Ltd employees. It provides training and recurring assessments across:

- **Business subjects:** Sales, Presales, Purchase, Accounts, Logistics, Compliance, Govt Sales, System Integration Sales
- **Technical subjects:** IT Infra, Audio Video, Power, Networking, Print, Cyber Security, Cloud, HPC/AI/ML, Server & Storage

Courses run from basic to advanced. Three portals serve three audiences:

- **Admin:** manages users, content, assessments, and dashboards
- **Manager:** reviews the learning and certifications of their reporting line
- **Employee (learner):** takes courses and assessments, and tracks their certifications

Learners are 3C IT Solutions employees only. External learners (clients, partners, resellers) are out of scope, so there is no multi-tenancy, no branded sub-portals, and no external accounts.

Out of scope for this version: free-text (essay) questions, multi-tenancy, external learners, SSO, mobile apps, and payments.

## 2. Architecture

- **Application:** one Next.js app (App Router, TypeScript). Route groups: `/admin`, `/manager`, `/learn`.
- **Database:** PostgreSQL, accessed through Prisma (schema, migrations, typed queries).
- **Authentication:** email and password. Passwords are hashed with bcrypt. Sessions use HTTP-only, secure cookies.
- **Authorization:** role and scope are checked on the server for every page and every server action. The UI hides options, but it is never the only check.
- **File storage:** an interface with a local-disk implementation. Files are stored outside the web root and served through authorized routes. An S3 implementation can be added later without changing callers.
- **Charts:** a lightweight charting library for dashboards.
- **Testing:** Vitest for unit and integration tests, Playwright for end-to-end flows.
- **Deployment:** a Docker Compose file runs the app and a PostgreSQL container. Development and testing use a Postgres instance in the development environment. The client supplies no database; a hosted Postgres (for example Neon or Supabase) can be substituted by changing one connection string.

### Code layout (guidance for the plan)

- `src/lib/db` — Prisma client
- `src/lib/auth` — session, password hashing, role and scope guards
- `src/lib/assessments` — period calculation, scoring, attempt rules, certification rules (pure functions where possible)
- `src/lib/storage` — file storage interface and local implementation
- `src/app/(admin)`, `src/app/(manager)`, `src/app/(learn)` — portal pages
- `src/app/actions` or route handlers — server actions, grouped by domain

## 3. Data model

- **users:** id, name, email (unique), password_hash, role (`ADMIN` | `MANAGER` | `EMPLOYEE`), department, manager_id (self-reference), photo_file_key (nullable), active, created_at
- **subjects:** id, name, slug, category (`BUSINESS` | `TECHNICAL`), certification_validity_months (default 12)
- **courses:** id, subject_id, title, description, level (`BASIC` | `INTERMEDIATE` | `ADVANCED`), status (`DRAFT` | `PUBLISHED`), pass_mark_percent, created_at, updated_at
- **lessons:** id, course_id, position, title, type (`TEXT` | `PDF` | `VIDEO` | `LINK` | `LIVE_SESSION` | `LAB`), body (for TEXT and LAB), file_key (for PDF, VIDEO, and images), url (for LINK)
- **instructors:** id, name, bio, location (country and city), expertise (list of subjects), photo_file_key (nullable), active
- **lesson_instructors:** lesson_id, instructor_id (a lesson can have one or more instructors)
- **live_sessions:** id, lesson_id (unique), starts_at, ends_at (UTC), meeting_url, capacity (nullable), recording_file_key (nullable, set after the session)
- **live_session_registrations:** id, live_session_id, user_id, registered_at, attended (boolean, set by admin or manager). Unique on (live_session_id, user_id).
- **assessments:** id, subject_id, course_id (nullable), title, cadence (`ONE_TIME` | `WEEKLY` | `MONTHLY` | `ANNUAL`), level, pass_mark_percent, time_limit_minutes (nullable), max_attempts_per_period (default 3), show_answers_after_submit (boolean), published (boolean)
- **questions:** id, assessment_id, position, type (`SINGLE` | `MULTIPLE` | `TRUE_FALSE`), text, options (JSON list), correct_option_ids (JSON list), points
- **assessment_assignments:** id, assessment_id, target_type (`ALL` | `DEPARTMENT` | `USER`), target_value (department name or user id)
- **assessment_periods:** id, assessment_id, user_id, period_key (for example `2026-W46`, `2026-11`, `2026`), opens_at, due_at, status (`OPEN` | `PASSED` | `OVERDUE`). Unique on (assessment_id, user_id, period_key).
- **assessment_attempts:** id, period_id, user_id, started_at, submitted_at, score_percent, passed, answers (JSON). Stored as soon as the attempt starts, and updated on submit.
- **course_progress:** id, user_id, course_id, completed_lesson_ids (JSON or join table), completed_at (nullable)
- **certifications:** id, user_id, subject_id, level, issued_at, expires_at, source_attempt_id. One row per passed assessment result; the most recent valid row per (user, subject, level) is the active one.

## 4. Roles and portals

### Admin (`/admin`)
- **Users:** create, edit, and deactivate users. Set role, department, and manager. CSV import of users.
  - **Profile picture:** when creating or editing a user, an admin can upload a picture (JPG or PNG, up to 5 MB) and crop it to a square. The picture can be replaced or removed at any time.
  - The picture appears in the user list, on the user's profile, and in the manager's team view. A user with no picture shows their initials.
  - Pictures are stored through the file storage interface, and are served only to signed-in users.
- **Content:** create subjects. Create courses with level and pass mark. Add lessons (rich text, PDF, video, link). Upload files. Reorder lessons by drag and drop. Publish or unpublish courses. A course needs at least one lesson and a subject before it can be published.
- **Assessments:** create assessments by subject and cadence. Add questions one at a time or import from a spreadsheet template. Assign to everyone, a department, or specific users.
- **Dashboards:** certifications by subject, level, and department; completion and pass rates; overdue assessments. CSV export for every report.

### Manager (`/manager`)
- **My team:** everyone in the manager's reporting line, direct and indirect.
- **Per person:** course progress, attempts and scores by period, certifications (active and expiring), overdue assessments.
- **Team summary:** certifications by subject and completion rate.
- Read-only for results. No edits to content, users, or assessments.

### Employee (`/learn`)
- **Home:** assigned assessments due this week, this month, and this year, with due dates.
- **Catalogue:** subjects grouped by business and technical, with courses at each level.
- **Learning:** open a course, complete lessons in order, track progress.
- **Assessments:** take assigned assessments; see the score (and answers, if enabled) after submit; retake within the attempt limit.
- **My certifications:** held certifications with level and expiry date.

Managers and admins can also use `/learn`.

### Access rules
- Employees see only their own attempts and certifications.
- Managers see a user only if that user is in their reporting line.
- Admins see everything.
- Unpublished courses and assessments are hidden from employees.
- Deactivated users cannot sign in.

## 5. Assessment cycles and certification rules

- **Periods:** weekly uses ISO week keys (`2026-W46`), monthly uses `2026-11`, annual uses `2026`. ONE_TIME assessments have a single period with no expiry.
- **Opening periods:** a period for each assigned user is created when the period opens. Periods are never back-filled for past dates, so a newly assigned user starts at the current period.
- **Overdue:** if no attempt in a period has passed by `due_at`, the period is marked `OVERDUE`. Overdue periods stay in history.
- **Attempts:** up to `max_attempts_per_period` (default 3). The period is `PASSED` as soon as one attempt meets the pass mark.
- **Scoring:** single choice, multiple choice, and true/false are auto-marked. Score is the percentage of earned points. Multiple-choice questions score fully only when the selected set matches exactly. Option order is shuffled per attempt; scoring uses option ids, not positions.
- **Time limit:** the server records `started_at`. Submissions after `started_at + time_limit` are rejected.
- **Save on start:** an attempt row is written when the attempt starts, so a dropped connection does not lose answers. A submit that fails can be retried.
- **Certification:** passing an assessment for a subject and level creates a certification with `expires_at = issued_at + subject.certification_validity_months`.
- **Renewal:** an expired certification is renewed by passing the assessment again. Passing a higher level does not remove lower-level certifications; dashboards show the highest current level per subject.

## 6. Content, files, and imports

- **Accepted files:** PDF, MP4, PNG, JPG. Size limits are set in configuration.
- **Serving:** files are served only through an authorized route that checks the user can access the course. Direct file paths are not public.
- **Question import:** a spreadsheet template. Every row is validated before saving. Invalid rows are reported by row number with the reason. A file with any invalid row saves nothing.
- **Uploads:** a failed upload leaves no partial record.

## 6A. Delivery formats

Courses can mix four lesson formats, so one course can combine self-paced reading, a live instructor session, and a hands-on lab.

- **Self-paced (TEXT, PDF, VIDEO, LINK):** available anytime. Meets the "anytime access" requirement.
- **Live session (LIVE_SESSION):**
  - An admin schedules the session with a date, time, meeting link, and one or more instructors.
  - Employees register for the session from the course page. A session with a capacity limit stops accepting registrations when full.
  - The session is shown in the learner's home page and in the calendar of the manager's team.
  - After the session, an admin or manager marks attendance. A learner who attended completes the lesson.
  - A recording can be uploaded after the session as a VIDEO file.
- **Hands-on lab (LAB):** a step-by-step exercise with setup instructions, the steps to complete, and a checklist the learner ticks off. Completing all checklist items completes the lesson. Labs run on tools the learner can access, and are guided exercises, not live sandboxes. Live sandbox environments need a separate infrastructure decision.
- **Instructors:** each course shows its instructors, with their name, location, and expertise. Instructors may be located anywhere; the portal does not limit where they teach from.

## 6B. Required additions

These six items were approved after comparing the design with leading corporate LMS products.

- **Reminders:**
  - Notifications are sent by email, using the company SMTP settings from configuration.
  - A learner gets a reminder 3 days before an assessment period is due, on the due date, and when the period becomes overdue.
  - The manager gets a weekly list of team members who are overdue.
  - Each notification is stored in a `notifications` table (id, user_id, type, sent_at), so reminders are not sent twice.
- **Certificates:**
  - When a certification is issued, a PDF certificate is generated with the learner's name, subject, level, issue date, and expiry date.
  - Each certificate has a unique verification code (12 characters).
  - The public route `/verify/[code]` shows whether a certificate is valid, with the name, subject, level, and dates only. It never shows scores.
  - A learner can download their certificates from "My certifications".
- **Audit log:**
  - An append-only `audit_events` table (id, actor_id, action, entity_type, entity_id, before (JSON), after (JSON), at).
  - Records changes to users, roles, courses, lessons, assessments, questions, assignments, and attempt scores.
  - Admins can view and filter the log. No one can edit or delete it.
- **Accessibility:**
  - All portal pages meet WCAG 2.1 AA: keyboard navigation, visible focus, sufficient colour contrast, labelled form fields, and alt text on images.
  - An uploaded VIDEO lesson needs a caption file (WebVTT, `.vtt`) before it can be published.
- **Question pools:**
  - An assessment can set `questions_per_attempt`. If it is empty, all questions are used.
  - When it is set, each attempt draws that many questions at random from the pool, so attempts differ.
  - The score is calculated against the questions the attempt actually received.
- **Resume:**
  - `course_progress` stores `last_lesson_id`, so the learner returns to the lesson where they stopped.
  - A `lesson_progress` table (user_id, lesson_id, position_seconds) stores where a VIDEO lesson was left, so playback resumes from the same point.

## 7. Dashboards and reporting

- **Admin, certifications by subject:** per subject, counts by level, active certifications, and expired certifications. Table and bar chart.
- **Admin, company health:** completion and pass rates by department, plus the overdue list.
- **Manager, team:** the same certification and overdue views, scoped to the reporting line.
- Every dashboard exports to CSV.

## 8. Error handling

- Validation errors appear beside the field they relate to.
- Server errors are logged with request context. Users see a plain message with no stack trace.
- Attempts are saved on start, so a dropped submit loses no answers.
- Deactivated users are signed out on their next request.

## 9. Testing

- **Unit:** scoring (including multiple-choice exact match and shuffled options), period calculation (week and year boundaries, ISO week 53), certification expiry and renewal, manager scope.
- **Integration:** database queries behind dashboards, reporting-line queries, import validation.
- **End-to-end:** admin creates course and assessment, employee completes both, manager sees the result, certification appears on the admin dashboard.
- **Authorization:** employees cannot reach admin or manager pages, or another user's records. Managers cannot reach users outside their reporting line.

## 10. Defaults chosen (to confirm)

1. 3 attempts per period.
2. Certifications valid for 12 months, configurable per subject.
3. Correct answers shown after submission, configurable per assessment.
4. Managers see their whole reporting line (direct and indirect reports).
5. Managers and admins can also use the learner portal.

## 11. Next step

After user review of this document, the implementation plan is written with the writing-plans skill.
