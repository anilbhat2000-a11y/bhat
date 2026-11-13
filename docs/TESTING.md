# Testing, acceptance and demo checklists

## 1. Running the tests

The tests need PostgreSQL. They use the `lms_test` database (`TEST_DATABASE_URL`, default `postgresql://lms:lms@localhost:5432/lms_test`).

```bash
DATABASE_URL=postgresql://lms:lms@localhost:5432/lms_test npx prisma migrate deploy
```

**Unit and integration tests** (Vitest, about 290 tests against a real database):

```bash
npm test
```

**End-to-end tests** (Playwright; builds the app and starts it on port 3000):

```bash
COOKIE_SECURE=false npm run test:e2e
```

If Playwright's own browser is not installed, point `PW_CHROMIUM_PATH` at a Chromium binary. Stop any other server on port 3000 first, or Playwright will test that one instead.

**Load test** (see section 4):

```bash
LT_PASSWORD=... LT_RATE=60 LT_CONNECTIONS=300 node scripts/load-test.mjs
```

## 2. Acceptance criteria (brief section 12)

| Criterion | How it is shown |
| --- | --- |
| An admin uploads a video, creates a course with three modules, adds a monthly assessment, assigns it to a department, and sees completion in the dashboard, without developer help | `e2e/modules.spec.ts` (three modules), `e2e/video-range.spec.ts` and `e2e/streaming-upload.spec.ts` (video upload and streaming), `e2e/take-assessment.spec.ts` and `e2e/admin-assessments.spec.ts` (monthly assessment, assignment), `e2e/dashboards.spec.ts` (dashboard sections), `e2e/full-flow.spec.ts` (the whole loop). Demo: section 5, Phase 3. |
| An employee completes a course, takes the assessment, passes, and downloads a certificate | `e2e/full-flow.spec.ts`, `e2e/screen-coverage.spec.ts` (certificate download and public verification), `src/lib/certificates/qr.test.ts` (the QR code decodes to the verification address). |
| A manager sees only their own team's data and cannot access other teams | `e2e/manager.spec.ts` and `e2e/authorization.spec.ts` (403 outside the team), `src/lib/auth/scope.test.ts`, `src/lib/learning/assignments.test.ts` and `src/lib/assessments/remedial.test.ts` (managers cannot act outside their line). |
| The admin dashboard's subject-wise certification counts match the database | `src/lib/reports/analytics.test.ts`, "dashboard counts against the database": the view is compared with a direct SQL count. |
| The system works with the internet disconnected | `e2e/offline.spec.ts` blocks every request outside the LMS and loads 15 pages across the three portals; none is attempted. No CDN, web font or external API is used. Phase 4: repeat on the real server with the uplink unplugged. |
| Backup and restore complete within the documented time | `deploy/backup/backup.sh` and `restore.sh`, tested by a round trip (seeded database plus files: backup 2 s, restore under 1 s), a wrong passphrase and a damaged archive (both stop before changing anything). Phase 4: time it on the real data; see `INSTALL.md` section 7. |

## 3. Security checks in the test suite

- Role and scope checks on the server: `src/lib/auth/*.test.ts`, `e2e/authorization.spec.ts`.
- Sign-in rate limit and idle session timeout: `src/lib/auth/rate-limit.test.ts`, `src/lib/auth/session.test.ts`.
- Answer keys never reach the browser before submit (including fill-in answers and matching pairs): `src/lib/assessments/grading.test.ts`.
- A double submit or double grading cannot issue two certificates: `src/lib/assessments/take.test.ts`, `grading.test.ts`.
- Search treats `%` and `_` literally: `src/lib/community/community.test.ts`.
- Uploads: type and size checks while streaming: `e2e/streaming-upload.spec.ts`, `src/lib/storage/*.test.ts`.
- CSRF: Next.js checks the Origin of every form submit; tested behind Nginx with the real proxy configuration (sign-in over HTTPS through `deploy/nginx/lms.conf`).
- Accessibility: `e2e/accessibility.spec.ts` runs axe (WCAG 2.1 A and AA rules) on the admin, manager and learner pages.

## 4. Load test results

`scripts/load-test.mjs` signs in through the real login page and requests the learner home, catalogue and assessments pages. It was run on a 4 vCPU, 16 GB test machine that also ran the load generator, PostgreSQL and Nginx.

| Set-up | Load | Errors | Median | 90th percentile | 99th percentile |
| --- | --- | --- | --- | --- | --- |
| 1 app process | 300 connections, 60 requests/s for 60 s | 0 | 343 ms | 663 ms | 1.3 s |
| Nginx (HTTPS) + 3 app processes | 300 connections, 90 requests/s for 60 s | 0 | 203 ms | 400 ms | 870 ms |
| 1 app process, no rate limit | 20 connections, flat out | 0 | 68 ms | 706 ms | 963 ms (72 requests/s) |

300 users who each open a page every 10 seconds make about 30 requests per second, so the second row is three times that load. A flat-out test with 300 simultaneous connections on one process overloads it (requests queue for seconds), which is why production runs 3 replicas. Repeat the test on the production server in Phase 4.

## 5. Demo checklists by phase

Use the seeded demo accounts (`admin@3c.example`, `manager@3c.example`, `employee@3c.example`, and the others in the README).

### Phase 1: foundation

- [ ] Sign in as each role; each lands on its own portal. An employee opening `/admin` is sent home.
- [ ] Admin creates a user, imports two users from CSV, and deactivates one; the deactivated user cannot sign in.
- [ ] Admin creates a course with three modules, adds a text lesson, uploads a PDF and an MP4 with captions, reorders lessons by dragging, and publishes.
- [ ] Employee opens the course, completes lessons in order, leaves a video halfway, signs out and in again, and resumes from the same point.
- [ ] Admin archives the course; it leaves the catalogue.

### Phase 2: assessments

- [ ] Admin creates a monthly assessment with single, multiple, true/false, fill-in, matching, short-answer and scenario questions (form and CSV import), sets 10 questions per attempt and a time limit, publishes, and assigns it to the Sales department.
- [ ] Employee takes it: options are shuffled, the timer counts down, and the attempt waits for grading.
- [ ] Admin grades the short answer in the grading queue with a note; the employee sees the score, explanations and note.
- [ ] On a pass, the certificate PDF downloads; scanning its QR code opens the verification page.
- [ ] Employee fails an attempt: the remedial plan appears, the course must be redone, and the retake opens after the delay.
- [ ] Annual assessment in proctored mode: leaving full screen is counted, and the attempt submits at the limit.

### Phase 3: dashboards

- [ ] Admin dashboard: apply level, department, location and period filters; every section changes; download a section as CSV and open it in Excel; print to PDF.
- [ ] Manager: team summary heat map, a member's weak topics and attempts, assign a course with a due date, comment on a remedial plan.
- [ ] Employee home: progress bars, countdowns, certificates with links, recommendations, announcements.
- [ ] Admin posts an announcement with email; it arrives through the company SMTP server.
- [ ] Reminder emails: an assessment and an assigned course due in 3 days produce one email each.

### Phase 4: hardening (on the production server)

- [ ] Security review against section 3, plus a scan of the server (open ports: 80, 443 only).
- [ ] Load test (section 4) on the production server; record the results.
- [ ] Backup, copy off the server, restore on a spare machine; record the time.
- [ ] Unplug the internet uplink and repeat the Phase 1 demo.
- [ ] Accessibility: keyboard-only walkthrough of the learner journey; screen reader spot check.
- [ ] User acceptance testing with 5–10 employees and 2 managers.
- [ ] Training for admins (`ADMIN_MANUAL.md`) and managers (`USER_GUIDE.md`).
