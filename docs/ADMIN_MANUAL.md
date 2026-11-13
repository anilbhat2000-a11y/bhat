# Admin manual

For L&D and HR administrators. Sign in and open the **Admin portal** (`/admin`). Every change you make is recorded in the audit log.

## 1. Users and organisation

**Admin portal → Users**

- **Add a user:** name, email, role (Admin, Manager or Employee), department, job title, manager, and a starting password (at least 8 characters). The user should change it under **My profile → Change password**.
- **Import from CSV:** paste rows with the header `name,email,role,department,managerEmail,password`. Every row is checked first. If any row has a problem, nothing is imported and the message names the row. Excel users: save the sheet as CSV (UTF-8) and paste its contents.
- **Edit a user** (click the name): department, job title, manager, location, phone, role, photo (JPG or PNG, up to 5 MB).
- **Deactivate:** a deactivated user is signed out on their next click and cannot sign in. Their records are kept.
- **Reset password:** on the user's page. Tell the user the new password in person or by phone.

**Departments and locations** are set on each user. Type the same spelling each time, because assessments are assigned by department name. **Reporting lines** come from each user's manager. A manager sees everyone below them, directly or indirectly.

## 2. Subjects

**Admin portal → Subjects** lists the 17 subjects (business and technical). For each subject you can set **certificate validity** in months (default 12). When a certificate expires, the learner must pass again to renew it.

## 3. Courses

**Admin portal → Courses**

1. **Create a course:** subject, title, description, level (Basic, Intermediate, Advanced) and pass mark. New courses are drafts and are hidden from learners.
2. **Add modules:** in the course, under **Modules**, add each module with a title and estimated minutes. Learners see the modules in order, with their times and the course total.
3. **Add lessons:**
   - **Text, link, lab or live session:** fill in **Add a text, link, lab, or live session lesson** and choose the module. For a lab, write the instructions with one `- [ ] step` line per checklist item.
   - **PDF or video:** use **Upload a file lesson**, choose the module, then the file. Videos must be MP4 (up to 500 MB). PDFs up to 50 MB.
   - **Captions:** every video needs a WebVTT (`.vtt`) caption file before the course can be published, so deaf and hard-of-hearing staff can follow it.
4. **Order:** drag lessons to reorder them. **Lesson modules** lets you move several lessons between modules at once; lessons are then grouped by module automatically. Learners complete lessons in order.
5. **Publish** when the course has at least one lesson, every video has captions, and every live session is scheduled.
6. **Unpublish** hides a course for editing. **Archive (retire)** removes it from the catalogue for good while keeping everyone's records; learners who started it can still review it. **Restore to draft** brings an archived course back.

**Changing content safely:** learners' progress is stored per lesson. Adding lessons at the end, fixing text, or replacing captions does not disturb anyone. To make large changes, create a new version of the course, publish it, and archive the old one. Learners who started the old course keep access to it.

**Live sessions:** after adding a live-session lesson, schedule it with a date, time, meeting link, capacity and instructors. After the session, tick who attended; attendance completes the lesson for them. **Instructors** are managed under **Admin portal → Instructors**.

**Catalogue shells:** `docs/CATALOGUE.md` lists all 51 planned courses with modules and the content to supply. If the catalogue seed was run, these exist as draft courses with their modules, ready for lessons.

## 4. Assessments

**Admin portal → Assessments**

1. **Create:** subject, title, cadence (one-time, weekly, monthly, annual), level, and pass mark. Link it to a course if it checks that course; the link drives the remedial path.
2. **Add questions** one at a time, or **import CSV** with columns `type,text,options,correct,points,scenario,explanation`:

   | Type | Options | Correct |
   | --- | --- | --- |
   | `SINGLE` | `A|B|C|D` | one option number, for example `2` |
   | `MULTIPLE` | `A|B|C|D` | two or more numbers, for example `1|3` |
   | `TRUE_FALSE` | `True|False` | `1` or `2` |
   | `FILL_BLANK` | every accepted answer, for example `router|a router` | leave empty |
   | `MATCHING` | pairs `left=right`, for example `Switch=Layer 2|Router=Layer 3` | leave empty |
   | `SHORT_ANSWER` | leave empty | leave empty; put a model answer in `explanation` |

   Any question can have a **scenario** (a case study shown above it) and an **explanation** (shown after submit when answers are shown). Fill-in answers are matched ignoring capitals and extra spaces.
3. **Settings:**
   - **Pass mark**, **attempts per period** (1 to 10), **time limit** in minutes.
   - **Questions per attempt:** draw this many questions at random from the bank on each attempt. Options are also shuffled for every attempt.
   - **Show correct answers after submit:** learners see their answer, the correct answer, and explanations.
   - **Retake delay after a fail:** hours before a retake opens (see Remedial path).
   - **Proctored mode** and **violations allowed:** see below.
4. **Publish**, then **assign** to everyone, a department (type the department name exactly), or one user. Periods open for each assigned person: one per ISO week (opening Monday), month, or year. Unpassed periods become overdue after their due date.

**Suggested set-up from the brief:**

| Cadence | Questions | Time limit | Notes |
| --- | --- | --- | --- |
| Weekly | Bank of 30+, 10–15 per attempt | 10 minutes | Covers the previous week's content. |
| Monthly | Bank of 60+, 30–40 per attempt | 30–45 minutes | Pass mark set by L&D. |
| Annual | Bank of 150+, 100+ per attempt, with scenario and short-answer questions | 120 minutes | Turn on proctored mode. |

### Proctored mode

The questions stay hidden until the learner enters full screen. Leaving full screen or switching to another tab or window counts as a violation, and the count is stored on the attempt. When the allowed number is reached, the attempt is submitted as it stands. Managers see the number of proctoring flags on each attempt. Proctored mode deters casual cheating; it cannot detect a second device. On phones without full-screen support, only tab switches are counted.

### Grading short answers

Attempts with short-answer questions wait in **Admin portal → Grading queue** (the count is shown on the admin home page). Open an attempt to see each answer, the automatic marks for objective questions, and the model answer. Give each short answer a whole-number mark and an optional note to the learner, plus an optional overall note, and **Save grades**. The score is then final. A pass issues the certificate, even if the period went overdue while the attempt waited. You cannot grade your own attempt.

### Remedial path

When a learner fails an attempt, the system:

1. clears their completion of the course linked to the assessment, so they work through its lessons again (video positions and lab ticks are kept);
2. opens the retake after the **retake delay** (default 24 hours, never later than the period's due date).

The retake unlocks once both are done. The learner sees the plan on their home page; their manager can approve or comment on it. **Reset attempts** on a learner's period voids failed attempts and closes the plan (use it for genuine problems, such as a power cut).

## 5. Certificates

A certificate is issued automatically when a learner passes. It shows the name, subject, level, issue and expiry dates, a 12-character verification code, and a QR code. Anyone can check a certificate at `/verify/<code>` or by scanning the QR code; the page shows only the name, subject, level and dates, never scores. Validity is set per subject. Set `PUBLIC_BASE_URL` in `.env` so QR codes carry the right address.

## 6. Dashboards and reports

**Admin portal → Dashboard** shows certifications by subject and level, course completion, company health by department (attempts, pass rate, overdue), and the overdue list. Download any view as CSV from the links on the page; CSV files open in Excel.

## 7. Audit log

**Admin portal → Audit log** lists every change to users, courses, lessons, modules, assessments, questions, assignments, attempts, grades, certificates and remedial plans, with who made it and when. Filter by type (User, Course, Assessment and so on). The log cannot be edited or deleted.

## 8. Reminders

The scheduler runs every hour. Learners get an email 3 days before an assessment period is due, on the due date, and when it becomes overdue. Managers get a weekly list of overdue team members. Each reminder is sent once.

## 9. Before go-live checklist

- [ ] Real admin accounts created; demo accounts deactivated.
- [ ] Users imported, with departments and managers.
- [ ] Placeholder content replaced with company-approved material (search for `[PLACEHOLDER]`).
- [ ] SMTP tested: a reminder arrives.
- [ ] Backup made, copied off the server, and a restore tested (see `INSTALL.md`).
- [ ] Certificate issuer name confirmed (open question 2 in `ARCHITECTURE.md`).
