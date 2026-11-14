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

**Admin portal → Courses** opens the **course catalogue**: every course in one table with its subject, level, number of lessons, learners (started / completed), the departments it is for, status and last update.

- **Find courses:** click **All**, **Published**, **Draft** or **Archived**; search by title or description; filter by subject, level or department; click a column heading to sort (click again to reverse). 25 courses per page.
- **Edit** opens the course editor: lessons, modules, files, captions, assignments and feedback.
- **Modify** opens a short form to change the title, subject, level, pass mark, description, departments and status (Draft, Published or Archived) in one go.
- **Delete** shows what would be affected (lessons, learners who started or completed it, completion-check attempts, assignments and learning paths) and asks you to tick a box to confirm. A course that learners have started or been tested on cannot be deleted, because that would erase their records; the page offers **Archive** instead, which removes it from the catalogue and keeps every record. Restore an archived course with Modify. Every deletion is recorded in the audit log.
- **New course** and **Upload a course** are at the top right.

### Supported file formats

Lesson files can be **PDF**, **PowerPoint** (.ppt, .pptx), **Word** (.doc, .docx), **Excel** (.xls, .xlsx) or **video** (.mp4, .mov, .mkv). Size limits: PDF 50 MB, PowerPoint, Word and Excel 100 MB, video 500 MB each (set in `.env` with `MAX_UPLOAD_MB_DOC`, `MAX_UPLOAD_MB_OFFICE` and `MAX_UPLOAD_MB_VIDEO`).

- PDF and MP4 are shown as they are.
- PowerPoint, Word and Excel files are **converted to PDF** in the background, so learners read them in the browser without Office. MOV and MKV videos are **converted to MP4** so they play in every browser. Learners can always download the original file.
- Conversion usually takes a few seconds to a few minutes. Until it finishes, the course editor shows "converting…" and learners can download the file. If a file cannot be converted, it stays a download-only lesson and the editor says so.
- Each file is checked when it is uploaded: a file renamed to look like another type (for example a web page saved as .pdf) is refused.

Questions can be imported from **Excel** (.xlsx, .xls), **CSV** or **Word** (.docx, .doc). Download the Excel template or the Word example from an assessment's page; both explain the layout. Every row is checked first, and nothing is imported if any row has a mistake.

### Bulk upload many courses

**Admin portal → Courses → Bulk upload.**

1. **Download the Excel template.** It has an Instructions sheet and four sheets to fill in:
   - **Courses:** one row per course: a short code (C1, C2 …), title, subject (drop-down), level, description, departments, pass mark, Publish (Yes/No), Mandatory (Yes/No) and due date.
   - **Modules** (optional): course code, module number, title, minutes.
   - **Lessons:** one row per lesson in order: course code, module number, title, Type (File, Text or Link), and the file name, text or web address. Videos can name a .vtt captions file.
   - **Questions** (optional): each course's completion check: course code, type, question, options, correct answer, points and explanation.
2. **Upload** the workbook with the lesson files: select them all, or put them in one ZIP (up to 500 files). File names must match the File name column exactly.
3. Everything is checked first. If anything is wrong (a missing file, an unknown subject, a question without enough options, a course title that already exists), **nothing is created** and the page lists every problem with its sheet and row. Fix them and upload again.
4. When all is well, the page lists the courses created with their modules, lessons, questions and status. Courses marked Publish are published (unless a video still needs captions); courses marked Mandatory are assigned to their departments.

### Upload a course for your departments

The quickest way to put your own training material in the portal. **Admin portal → Courses → Upload a course** (also on the admin home page under Quick actions).

1. Enter the course **title**, **subject**, **level** and a short **description**.
2. **Which departments is it for?** Tick one or more departments, or type others separated by commas. Leave every box empty to show the course to everyone.
3. **Publish now** makes it live straight away; otherwise it is saved as a draft for you to review. **Make it mandatory** assigns it to those departments (with an optional due date), so everyone in them sees it under Assigned courses and gets reminders.
4. Choose your **files**: PDF, PowerPoint, Word, Excel, MP4, MOV or MKV, up to 30 at a time. Optionally add a **questions file** (Excel, CSV or Word) to create the course's completion check at the same time. Each file becomes one lesson, and the file name becomes the lesson title, so name files in order, for example `01 Introduction.pdf`, `02 Process.pdf`.
5. Press **Upload and create course**. You then land on the course page, where you can rename and reorder lessons, add modules, text lessons and a completion check.

Videos need a caption file before a course can be published, so a course with videos is saved as a draft; add the captions on the course page, then publish.

**Department-specific courses:** a course that lists departments is shown only to people in those departments, in the catalogue and in search. Someone outside them still sees it if it is assigned to them (directly or in a learning path), or if they had already started it. Change the departments at any time on the course page under **Who is this course for?** The course list can be filtered by department.

1. **Create a course:** subject, title, description, level (Basic, Intermediate, Advanced) and pass mark. New courses are drafts and are hidden from learners.
2. **Add modules:** in the course, under **Modules**, add each module with a title and estimated minutes. Learners see the modules in order, with their times and the course total.
3. **Add lessons:**
   - **Text, link, lab or live session:** fill in **Add a text, link, lab, or live session lesson** and choose the module. For a lab, write the instructions with one `- [ ] step` line per checklist item.
   - **A file (PDF, PowerPoint, Word, Excel or video):** use **Upload a file lesson**, choose the module, then the file. The lesson type follows the file; leave the title empty to use the file name. See *Supported file formats* above.
   - **Captions:** every video needs a WebVTT (`.vtt`) caption file before the course can be published, so deaf and hard-of-hearing staff can follow it.
4. **Order:** drag lessons to reorder them. **Lesson modules** lets you move several lessons between modules at once; lessons are then grouped by module automatically. Learners complete lessons in order.
5. **Completion rules** (in the course settings):
   - **Videos: minimum watched (%)**, for example 90. A video lesson can be marked complete only after that share of it has actually been played. Skipping ahead does not count.
   - **The course is complete only after its assessment is passed.** Lessons alone are not enough; the course completes when the linked assessment is passed (in either order).
6. **Publish** when the course has at least one lesson, every video has captions, and every live session is scheduled.
7. **Unpublish** hides a course for editing. **Archive (retire)** removes it from the catalogue for good while keeping everyone's records; learners who started it can still review it. **Restore to draft** brings an archived course back.

**Changing content safely:** learners' progress is stored per lesson. Adding lessons at the end, fixing text, or replacing captions does not disturb anyone. To make large changes, create a new version of the course, publish it, and archive the old one. Learners who started the old course keep access to it.

**Assigning a course:** once a course is published, use **Assignments** on the course page to make it mandatory for:

- a **department** (everyone in it, including people who join later),
- a **job title**, for mandatory-by-role training (everyone with that job title, including later joiners), or
- one **person**.

Add an optional due date. Learners see assigned courses with a countdown on their home page and get emails 3 days before, on the due date, and when overdue. If someone is covered by more than one assignment for the same course, the earliest due date applies. Managers can also assign published courses to people in their team. Learners can also start any published course themselves from the catalogue (self-enrolment): opening it and completing a lesson records their progress.

**Feedback and Q&A:** learners who finish a course answer a short survey (usefulness from 1 to 5, and a comment); the course page shows the average and recent comments. Each course has a Q&A thread. Answer questions from the course's learner page (**Open the course Q&A**); your answers are labelled "(L&D)". **Hide** removes a post from learners' view and records it in the audit log; **Show** restores it.

**Live sessions:** after adding a live-session lesson, schedule it with a date, time, meeting link, capacity and instructors. After the session, tick who attended; attendance completes the lesson for them. **Instructors** are managed under **Admin portal → Instructors**.

**Course content and completion checks:** all 51 catalogue courses, and the 14 other sample courses, have full content. Each lesson has headed sections, key terms, a real-world example, common mistakes and key takeaways. Each completion check has an explanation for every question, and each course lists its sources under "Sources and further reading" on the course page. The content was written for this LMS. Company-specific facts, such as approval limits and policies, are marked `[PLACEHOLDER]`: review and replace these before go-live. Rules and rates change, so review the regulatory courses (GST, government procurement, data protection) once a year.

**Content updates and your own changes:** when a new version of the portal brings updated course text, re-running the seed updates those courses in place and learners keep their progress. Once you change a course's lessons or modules in the portal, that course is yours: later seed runs leave it untouched. A one-time assessment linked to a course is that course's **completion check**: learners open it from the course page once every lesson is done, with no assignment needed. Assign it only if you want a due date.

**Catalogue shells:** `docs/CATALOGUE.md` lists all 51 planned courses with modules and the content to supply. If the catalogue seed was run, these exist as draft courses with their modules, ready for lessons.

### AI assistant

**Admin portal → AI assistant.** Claude, an AI model by Anthropic, drafts content in the portal's house style (introduction, teaching sections, key terms, real-world example, common mistakes, key takeaways). It is switched off until the server administrator adds `ANTHROPIC_API_KEY` to `.env` (see INSTALL.md). It can:

1. **Create a new course.** Type the topic, choose the subject and level, say who it is for and how many modules, lessons and questions you want. A 3 × 3 course takes two to five minutes; the draft page refreshes itself.
2. **Improve a lesson.** On a course page, click **Improve with AI** next to a text lesson (or choose a course under *Update existing content*). Say what should change, for example "update for the latest e-invoicing rules" or "simplify for new joiners".
3. **Write completion-check questions** for a course from its text lessons.

For any of these you can attach a **reference file**: a company policy, process note, datasheet or old slide deck (PDF, Word, PowerPoint, Excel or text, up to 25 MB). The AI then takes company-specific facts from your file. Without one, it writes `[PLACEHOLDER: …]` wherever a company detail (price, approval level, policy) is needed.

**Every result is a draft.** Nothing changes until you review it:
- Read the **Check these before you apply** box and replace every `[PLACEHOLDER`.
- Edit any lesson text, untick lessons, questions or links you do not want, and open each source link.
- Click **Create the course (unpublished)**, **Save over the lesson** or **Add ticked questions**. New courses are saved as drafts: check them on the course page, then publish.

The AI can be wrong. You are responsible for what you publish. Do not attach files containing personal data about employees or customers: requests and files are sent to Anthropic over the internet. Every request, apply and discard is in the audit log, and a lesson's previous text is kept in the log when it is replaced.

**Edit text by hand:** on a course page, **Edit text** next to a text lesson opens an editor with a preview.

### Learning paths

**Admin portal → Learning paths.** A learning path is a set of courses in a planned order, assigned as one unit, such as a new joiner's first month or an engineer's track.

1. **Create a learning path.** First choose **what type of training** you want to create (sales enablement, soft skills, customer solutions, process and workflow, compliance, onboarding, technical skills, leadership), then how to start:
   - **Start from a ready-made path** (recommended): 14 paths built from this portal's courses, matched to the training types you chose. **Use this path** makes your own copy, which you can change. Ready-made paths themselves cannot be edited or assigned.
   - **Build a custom path:** name it and tick any courses, including the ones you uploaded.
2. On the path's page, change the **order** (↑ ↓), **add** or **remove** courses, and edit the name, description and training type.
3. **Assign** the path to a person, a department or a job title, with an optional due date. Each course in the path then appears on the learner's home page with that due date, and the usual reminders are sent (3 days before, on the day, and when overdue). Department and job-title assignments include people who join later.
4. **Progress** shows everyone on the path: courses done, a progress bar, due date and status (not started, in progress, overdue, completed). A person completes a path when they finish every published course in it.

Managers can assign paths to people in their own team from the manager portal.

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

Company policy: annual exams are proctored, and the 5th violation ends the attempt. New annual assessments start in proctored mode with 5 allowed violations; you can change either per assessment.

The questions stay hidden until the learner enters full screen. Leaving full screen or switching to another tab or window counts as a violation, and the count is stored on the attempt. When the allowed number is reached, the attempt is submitted as it stands. Managers see the number of proctoring flags on each attempt. Proctored mode deters casual cheating; it cannot detect a second device. On phones without full-screen support, only tab switches are counted.

### Grading short answers

Attempts with short-answer questions wait in **Admin portal → Grading queue** (the count is shown on the admin home page). Open an attempt to see each answer, the automatic marks for objective questions, and the model answer. Give each short answer a whole-number mark and an optional note to the learner, plus an optional overall note, and **Save grades**. The score is then final. A pass issues the certificate, even if the period went overdue while the attempt waited. You cannot grade your own attempt.

### Remedial path

When a learner fails an attempt, the system:

1. clears their completion of the course linked to the assessment, so they work through its lessons again (video positions and lab ticks are kept);
2. opens the retake after the **retake delay** (default 24 hours, never later than the period's due date).

The retake unlocks once both are done. The learner sees the plan on their home page; their manager can approve or comment on it. **Reset attempts** on a learner's period voids failed attempts and closes the plan (use it for genuine problems, such as a power cut).

## 5. Certificates

**Admin portal → Certificates** shows the number of courses assigned, the people with assigned courses, valid certificates and those expiring in the next 90 days, then every issued certificate. Filter by **period**, search by subject, person or department, and **Download PDF** for any certificate. Certificates are free: this is an in-house portal, so there is nothing to buy or allocate.

A certificate is issued automatically when a learner passes. It shows the name, subject, level, issue and expiry dates, a 12-character verification code, and a QR code. Anyone can check a certificate at `/verify/<code>` or by scanning the QR code; the page shows only the name, subject, level and dates, never scores. Validity is set per subject. Set `PUBLIC_BASE_URL` in `.env` so QR codes carry the right address.

## 6. Dashboards and reports

**Admin home: Your LMS dashboard.** Choose a **period** and press **Show**. Four cards: **Team members** (people on the portal and those active in the period), **Learning paths** (paths created and paths completed), **Course completions** (courses in progress and completed) and **Certificates** (issued in the period and valid today), each with a link to the detail. Below, **Due soon** (assigned learning due in the next 14 days), **Overdue** and **Completed** list each person and course; **Recent activity** shows course completions, certificates and passed assessments. Managers see the same dashboard for their own team on their home page.

**Admin portal → Dashboard.** Filter by **level**, **department**, **location** and **period** (last 7 days, 30 days, 12 months, or all time), then **Apply filters**. The period applies to the date of each event (certificate issued, course completed, attempt submitted). Overdue work and the expiry forecast are always as of today. Only active users are counted.

| Section | What it shows |
| --- | --- |
| Certifications by subject | People certified per subject and level (renewals count once), active and expired, with a chart. |
| Course completion by subject / by course | People who started, finished, and the completion rate. |
| Course completions per month | Six-month trend, with a chart. |
| Assessment results by subject and type | Attempts, pass rate, average score, and how many periods took 1, 2, or 3+ attempts, per subject and cadence (weekly, monthly, annual). |
| Overdue and not-started work by department | Overdue and not-yet-attempted assessments, and overdue and not-started assigned courses. |
| Top performers | Highest average scores (at least 2 attempts). |
| Learners who need support | Anyone with overdue work, 2 or more failed attempts, or an average below 50%. |
| Certificates expiring soon | Active certificates expiring within 30, 60 and 90 days, for re-certification planning. |
| Company health | Attempts, passes and overdue periods per department. |

**Exports:** every section has **Download CSV (Excel)**, using the same filters. The files open directly in Excel. **Print or save as PDF** prints the whole dashboard; choose "Save as PDF" in the print dialog.

**Announcements:** **Admin portal → Announcements** posts a message to everyone or one department. It appears on their home page. Tick **Also send by email** to email it through the company SMTP server as well.

**Search:** **Search courses, lessons and questions** finds courses (including drafts), lesson text, and question-bank questions.

## 7. Audit log

**Admin portal → Audit log** lists every change to users, courses, lessons, modules, assessments, questions, assignments (assessment and course), attempts, grades, certificates, remedial plans, announcements and hidden Q&A posts, with who made it and when. Filter by type (User, Course, Assessment and so on). The log cannot be edited or deleted from the portal. Entries older than the retention period (1 year) are removed by the retention purge, which logs what it removed.

## 8. Reminders

The scheduler runs every hour. Learners get an email 3 days before an assessment period or an assigned course is due, on the due date, and when it becomes overdue. Managers get a weekly list of overdue team members. Each reminder is sent once.

## 9. Data retention

Company policy is to keep data for 1 year. Every hour the scheduler deletes data older than 365 days: assessment periods and attempts, certificates that expired more than a year ago, audit events, announcements, Q&A posts, feedback, closed remedial plans and old reminder records. User accounts, courses, course completions, and current certificates are kept. Each purge appears in the audit log as "retention.purge" with counts. Export any report you must keep longer (Dashboard → Download CSV) before it ages out. The period is set by `RETENTION_DAYS` in `.env`.

## 10. Before go-live checklist

- [ ] Real admin accounts created; demo accounts deactivated (`INSTALL.md` §6: `create-admin`, then `deactivate-demo`).
- [ ] Users imported, with departments and managers.
- [ ] Placeholder content replaced with company-approved material (search for `[PLACEHOLDER]`).
- [ ] SMTP tested: a reminder arrives.
- [ ] Backup made, copied off the server, and a restore tested (see `INSTALL.md`).
- [ ] SMTP details entered in `.env` (`SMTP_URL`, `MAIL_FROM`) once the company shares them.
