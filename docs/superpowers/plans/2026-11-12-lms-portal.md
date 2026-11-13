# LMS Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 3C IT Solutions internal LMS: admin, manager, and learner portals with recurring weekly/monthly/annual assessments and certification tracking.

**Architecture:** One Next.js (App Router, TypeScript) app with route groups `/admin`, `/manager`, `/learn`. Pure business logic (periods, scoring, attempt and certification rules, scope, import parsing) lives in `src/lib` as plain functions tested without a database. Prisma talks to PostgreSQL. Server actions and route handlers enforce role and scope on every call.

**Tech Stack:** Next.js (App Router), TypeScript, PostgreSQL, Prisma, bcryptjs, Vitest, Playwright, Recharts, Docker Compose, `xlsx` for question import and CSV for user import.

**Spec:** `docs/superpowers/specs/2026-11-12-lms-portal-design.md`

## Global Constraints

- Node.js 20 LTS or newer; TypeScript `strict: true`.
- Passwords hashed with bcrypt, cost factor 12.
- Session cookie: `httpOnly`, `secure` in production, `sameSite: lax`, name `lms_session`, lifetime 12 hours.
- Certification validity default: 12 months (`certification_validity_months`).
- Attempts per period default: 3 (`max_attempts_per_period`).
- Period keys: weekly `YYYY-Www` (ISO week), monthly `YYYY-MM`, annual `YYYY`, one-time `ONCE`.
- Pass rule: a period is `PASSED` when one attempt has `score_percent >= pass_mark_percent`.
- Uploaded file types: PDF, MP4, PNG, JPG only. Size limits from env: `MAX_UPLOAD_MB_DOC=50`, `MAX_UPLOAD_MB_VIDEO=500`.
- Files stored under `FILE_STORAGE_DIR` (default `./storage`), never under `public/`.
- All dates are stored in UTC; display in `Asia/Kolkata`.
- Profile photos: JPG or PNG, up to 5 MB (`MAX_UPLOAD_MB_PHOTO=5`), cropped to a square in the browser before upload.
- Employees only: no tenant layer, no external accounts (spec, section 1).
- Field lists for every table are in the spec: section 3 (core), 6A (live sessions, instructors), 6B (notifications, certificates, audit, pools, resume), 6C (employee profile). The schema in Task 2 must include every field listed there.

## Review Focus

1. A certification whose `expires_at` equals `now` exactly is treated as expired. Test in Task 6.
2. A deactivated user with a live session is rejected on the next request. Test in Task 4.
3. An upload with a wrong MIME type or an oversize file is rejected and leaves no lesson row. Test in Task 8 and Task 11.
4. A multiple-choice question with no selection scores 0 and does not crash. Test in Task 5.
5. A reporting-line lookup on a manager cycle (A manages B, B manages A) terminates. Test in Task 4.

---

### Task 1: Project scaffold and tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, `.env.example`, `.gitignore`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/test/smoke.test.ts`
- Test: `src/test/smoke.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: npm scripts `dev`, `build`, `test` (Vitest), `test:e2e` (Playwright), `db:migrate`, `db:seed`

- [ ] **Step 1: Initialise the Next.js app in the repo root**

Run: `npx create-next-app@latest . --ts --app --src-dir --import-alias "@/*" --no-tailwind --no-eslint --use-npm`
Expected: `package.json` and `src/app/` created; the existing `README.md` and `docs/` are kept.

- [ ] **Step 2: Add test tooling**

Run: `npm install -D vitest @vitest/coverage-v8 @playwright/test`
Expected: installs without error.

- [ ] **Step 3: Write the failing smoke test**

```ts
// src/test/smoke.test.ts
import { describe, it, expect } from "vitest";
describe("test runner", () => {
  it("runs", () => { expect(1 + 1).toBe(2); });
});
```

- [ ] **Step 4: Run it**

Run: `npx vitest run`
Expected: PASS, 1 test.

- [ ] **Step 5: Add `.env.example`, `.gitignore` entries for `storage/` and `.env`, and `vitest.config.ts` with `environment: "node"` and `include: ["src/**/*.test.ts"]`. Add scripts to `package.json`: `"test": "vitest run"`, `"test:e2e": "playwright test"`.**

- [ ] **Step 6: Verify and commit**

Run: `npm test && npm run build`
Expected: test PASS; build succeeds.

```bash
git add -A && git commit -m "chore: scaffold Next.js app with Vitest and Playwright"
```

---

### Task 2: Database schema (Prisma) and Docker Compose

**Files:**
- Create: `prisma/schema.prisma`, `docker-compose.yml`, `src/lib/db/client.ts`
- Test: `src/lib/db/schema.test.ts`

**Interfaces:**
- Consumes: Task 1
- Produces: Prisma models `User`, `Subject`, `Course`, `Lesson`, `Assessment`, `Question`, `AssessmentAssignment`, `AssessmentPeriod`, `AssessmentAttempt`, `CourseProgress`, `LessonProgress`, `Certification`, `Instructor`, `LessonInstructor`, `LiveSession`, `LiveSessionRegistration`, `Notification`, `AuditEvent`, `ProfileSkill`, `ProfileEducation`, `ProfileExperience`, `ProfileExternalCertification`, `ProfileLanguage`, `Session`; enums `Role {ADMIN MANAGER EMPLOYEE}`, `Category {BUSINESS TECHNICAL}`, `Level {BASIC INTERMEDIATE ADVANCED}`, `CourseStatus {DRAFT PUBLISHED}`, `LessonType {TEXT PDF VIDEO LINK LIVE_SESSION LAB}`, `Cadence {ONE_TIME WEEKLY MONTHLY ANNUAL}`, `QuestionType {SINGLE MULTIPLE TRUE_FALSE}`, `TargetType {ALL DEPARTMENT USER}`, `PeriodStatus {OPEN PASSED OVERDUE}`, `LanguageLevel {BASIC WORKING FLUENT}`; `export const prisma: PrismaClient` from `client.ts`. Field lists come from the spec (see Global Constraints).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/db/schema.test.ts
import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
describe("schema", () => {
  it("defines the unique period key", () => {
    const keys = Object.keys(Prisma.AssessmentPeriodScalarFieldEnum);
    expect(keys).toContain("period_key");
  });
});
```

Run: `npx vitest run src/lib/db/schema.test.ts`
Expected: FAIL (`@prisma/client` not generated).

- [ ] **Step 2: Write `prisma/schema.prisma`** with the models and enums listed in Interfaces. Each model uses `id String @id @default(cuid())`. Add `@@unique([assessmentId, userId, periodKey])` on `AssessmentPeriod`, `@@unique([email])` on `User`, and `@@unique([userId, subjectId, level, issuedAt])` on `Certification`. Map columns to snake_case with `@map`. `Question.options` and `correctOptionIds` are `Json`. `AssessmentAttempt.answers` is `Json`.

- [ ] **Step 3: Install and generate**

Run: `npm install @prisma/client && npm install -D prisma && npx prisma generate`
Expected: client generated.

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/lib/db/schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Write `docker-compose.yml`** with two services: `db` (`postgres:16`, env `POSTGRES_DB=lms`, `POSTGRES_USER=lms`, `POSTGRES_PASSWORD` from env, volume `pgdata`) and `app` (build from `Dockerfile`, depends on `db`, env `DATABASE_URL=postgresql://lms:${POSTGRES_PASSWORD}@db:5432/lms`). Add `Dockerfile` (Node 20 alpine, `npm ci`, `npm run build`, `npm start`).

- [ ] **Step 6: Migrate against a local Postgres and commit**

Run: `DATABASE_URL=postgresql://lms:lms@localhost:5432/lms npx prisma migrate dev --name init`
Expected: migration created and applied.

```bash
git add -A && git commit -m "feat: add Prisma schema, migrations, and Docker Compose"
```

---

### Task 3: Password hashing and sessions

**Files:**
- Create: `src/lib/auth/password.ts`, `src/lib/auth/session.ts`
- Test: `src/lib/auth/password.test.ts`, `src/lib/auth/session.test.ts`

**Interfaces:**
- Consumes: Task 2 (`prisma`)
- Produces:
  - `hashPassword(plain: string): Promise<string>`
  - `verifyPassword(plain: string, hash: string): Promise<boolean>`
  - `createSession(userId: string, now?: Date): Promise<{ token: string; expiresAt: Date }>`
  - `readSession(token: string, now?: Date): Promise<SessionUser | null>` where `SessionUser = { id: string; role: Role; active: boolean; name: string; email: string; department: string | null }`; returns `null` for expired tokens or when the user is inactive.

Sessions are stored in a `sessions` table (`id` = sha256 of token, `user_id`, `expires_at`). Add this model to `prisma/schema.prisma` in this task and re-run `prisma migrate dev --name sessions`.

- [ ] **Step 1: Write failing tests**

```ts
// password.test.ts
import { it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";
it("verifies a correct password and rejects a wrong one", async () => {
  const h = await hashPassword("S3cret-pass");
  expect(h).not.toBe("S3cret-pass");
  expect(await verifyPassword("S3cret-pass", h)).toBe(true);
  expect(await verifyPassword("wrong", h)).toBe(false);
});
```

```ts
// session.test.ts (integration; needs DATABASE_URL pointing at test DB)
// Cases:
// - createSession then readSession with the token returns the user.
// - readSession after expiresAt returns null (call with now = expiresAt + 1 ms).
// - readSession for a user with active = false returns null (Review Focus 2).
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/auth`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement.** Use `bcryptjs` with cost 12. Token is 32 random bytes, base64url; store only its sha256. Session lifetime 12 hours.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/auth`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add password hashing and database-backed sessions"
```

---

### Task 4: Roles, reporting line, and access guards

**Files:**
- Create: `src/lib/auth/scope.ts`, `src/lib/auth/guards.ts`
- Test: `src/lib/auth/scope.test.ts`, `src/lib/auth/guards.test.ts`

**Interfaces:**
- Consumes: Task 3 (`SessionUser`), Task 2 (`Role`)
- Produces:
  - `reportingLineIds(managerId: string, users: { id: string; managerId: string | null }[]): Set<string>` — direct and indirect reports, excluding the manager; terminates on cycles.
  - `canViewUser(viewer: { id: string; role: Role }, targetId: string, users: { id: string; managerId: string | null }[]): boolean` — ADMIN: true; viewer.id === targetId: true; MANAGER: true when target is in `reportingLineIds`; EMPLOYEE: false otherwise.
  - `requireRole(user: SessionUser | null, allowed: Role[]): SessionUser` — throws `AuthError` (`status` 401 when null, 403 otherwise).
  - `requireSession(): Promise<SessionUser>` — reads the `lms_session` cookie via `readSession`; throws `AuthError(401)`.

- [ ] **Step 1: Write failing tests**

```ts
// scope.test.ts
import { it, expect } from "vitest";
import { reportingLineIds } from "./scope";
const users = [
  { id: "a", managerId: null },
  { id: "b", managerId: "a" },
  { id: "c", managerId: "b" },
  { id: "d", managerId: "a" },
];
it("returns direct and indirect reports", () => {
  expect([...reportingLineIds("a", users)].sort()).toEqual(["b", "c", "d"]);
});
it("does not include the manager and returns empty for a leaf", () => {
  expect(reportingLineIds("c", users).size).toBe(0);
});
it("terminates on a manager cycle", () => {
  const cyc = [{ id: "x", managerId: "y" }, { id: "y", managerId: "x" }];
  expect([...reportingLineIds("x", cyc)]).toEqual(["y"]);
});
```

```ts
// guards.test.ts
// Cases:
// - canViewUser(ADMIN, anyone) is true.
// - canViewUser(EMPLOYEE, otherUser) is false; EMPLOYEE viewing self is true.
// - canViewUser(MANAGER, indirect report) is true; MANAGER viewing a peer is false.
// - requireRole(null, ["ADMIN"]) throws AuthError with status 401.
// - requireRole(EMPLOYEE user, ["ADMIN"]) throws AuthError with status 403.
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/auth`
Expected: FAIL.

- [ ] **Step 3: Implement.** `reportingLineIds` does a breadth-first walk over a `Set` of visited ids. `requireSession` reads the cookie with `next/headers` `cookies()`.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/auth`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add reporting-line scope and role guards"
```

---

### Task 5: Assessment periods

**Files:**
- Create: `src/lib/assessments/periods.ts`
- Test: `src/lib/assessments/periods.test.ts`

**Interfaces:**
- Consumes: Task 2 (`Cadence`)
- Produces:
  - `periodKeyFor(cadence: Cadence, date: Date): string` — `WEEKLY` → ISO week `YYYY-Www` (zero-padded week); `MONTHLY` → `YYYY-MM`; `ANNUAL` → `YYYY`; `ONE_TIME` → `"ONCE"`. Uses UTC.
  - `periodBounds(cadence: Cadence, key: string): { opensAt: Date; dueAt: Date }` — `dueAt` is the last millisecond of the period (UTC). Opens at the start of the period. For `ONCE`, `opensAt` = epoch and `dueAt` = `9999-12-31T23:59:59.999Z`.
  - `nextPeriodKey(cadence: Cadence, key: string): string`

- [ ] **Step 1: Write failing tests** with these exact cases:

```ts
import { it, expect } from "vitest";
import { periodKeyFor, periodBounds, nextPeriodKey } from "./periods";

it("weekly uses ISO week, including year boundary", () => {
  expect(periodKeyFor("WEEKLY", new Date("2026-11-12T00:00:00Z"))).toBe("2026-W46");
  expect(periodKeyFor("WEEKLY", new Date("2027-01-01T12:00:00Z"))).toBe("2026-W53");
});
it("ISO week 53 exists in 2026 and rolls to 2026-W53 for Dec 31", () => {
  expect(periodKeyFor("WEEKLY", new Date("2026-12-31T12:00:00Z"))).toBe("2026-W53");
});
it("monthly and annual keys", () => {
  expect(periodKeyFor("MONTHLY", new Date("2026-11-30T23:59:59Z"))).toBe("2026-11");
  expect(periodKeyFor("ANNUAL", new Date("2026-06-01T00:00:00Z"))).toBe("2026");
});
it("due time is the last millisecond of the period", () => {
  expect(periodBounds("MONTHLY", "2026-02").dueAt.toISOString()).toBe("2026-02-28T23:59:59.999Z");
});
it("next key rolls over year and week 53 to next year", () => {
  expect(nextPeriodKey("MONTHLY", "2026-12")).toBe("2027-01");
  expect(nextPeriodKey("WEEKLY", "2026-W53")).toBe("2027-W01");
});
```

- [ ] **Step 2: Run to verify failure.** Run: `npx vitest run src/lib/assessments/periods.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement** using UTC arithmetic. ISO week: find the Thursday of the date's week; the year is the Thursday's year; week = `1 + floor((dayOfYear(thursday) - 1) / 7)`. `periodBounds` for WEEKLY runs Monday 00:00 UTC to next Monday minus 1 ms.

- [ ] **Step 4: Run to verify pass.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add assessment period calculation"
```

---

### Task 6: Certification expiry and renewal rules

**Files:**
- Create: `src/lib/assessments/certifications.ts`
- Test: `src/lib/assessments/certifications.test.ts`

**Interfaces:**
- Consumes: Task 2 (`Level`)
- Produces:
  - `expiresAt(issuedAt: Date, validityMonths: number): Date` — same day-of-month, `validityMonths` later, UTC.
  - `isActive(cert: { expiresAt: Date }, now: Date): boolean` — `expiresAt > now` (strictly; equal means expired).
  - `highestActiveLevelPerSubject(certs: { subjectId: string; level: Level; expiresAt: Date }[], now: Date): Map<string, Level>` — ADVANCED > INTERMEDIATE > BASIC.

- [ ] **Step 1: Write failing tests**

```ts
import { it, expect } from "vitest";
import { expiresAt, isActive, highestActiveLevelPerSubject } from "./certifications";

it("adds validity months in UTC", () => {
  expect(expiresAt(new Date("2026-01-31T00:00:00Z"), 1).toISOString()).toBe("2026-03-03T00:00:00.000Z");
});
it("treats expiry at exactly now as expired", () => {
  const t = new Date("2027-01-01T00:00:00Z");
  expect(isActive({ expiresAt: t }, t)).toBe(false);
});
it("returns highest active level per subject, ignoring expired", () => {
  const now = new Date("2026-06-01T00:00:00Z");
  const m = highestActiveLevelPerSubject([
    { subjectId: "s1", level: "BASIC", expiresAt: new Date("2027-01-01Z") },
    { subjectId: "s1", level: "ADVANCED", expiresAt: new Date("2027-01-01Z") },
    { subjectId: "s2", level: "ADVANCED", expiresAt: new Date("2026-01-01Z") },
  ], now);
  expect(m.get("s1")).toBe("ADVANCED");
  expect(m.has("s2")).toBe(false);
});
```

- [ ] **Step 2: Run to verify failure.** Expected: FAIL.

- [ ] **Step 3: Implement.** Month arithmetic: `new Date(Date.UTC(y, m + n, d, ...))`. Note the 2026-01-31 + 1 month case rolls to Mar 3 (Feb has 28 days); the test pins this behavior and the spec does not require clamping.

- [ ] **Step 4: Run to verify pass.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add certification expiry and level rules"
```

---

### Task 7: Scoring and attempt rules

**Files:**
- Create: `src/lib/assessments/scoring.ts`, `src/lib/assessments/attempts.ts`
- Test: `src/lib/assessments/scoring.test.ts`, `src/lib/assessments/attempts.test.ts`

**Interfaces:**
- Consumes: Task 2 (`QuestionType`)
- Produces:
  - `type ScoringQuestion = { id: string; type: QuestionType; correctOptionIds: string[]; points: number }`
  - `scoreAttempt(questions: ScoringQuestion[], answers: Record<string, string[]>, passMarkPercent: number): { scorePercent: number; passed: boolean; perQuestion: Record<string, boolean> }`. `answers` maps question id to selected option ids. Missing or empty answer scores 0 for that question. `scorePercent` is rounded to 2 decimals. Zero total points gives `scorePercent` 0.
  - `isCorrect(q: ScoringQuestion, selected: string[]): boolean` — SINGLE and TRUE_FALSE: exactly one selected and it equals the single correct id. MULTIPLE: sets are equal (order-insensitive, no duplicates).
  - `shuffleOptions<T>(options: T[], rng?: () => number): T[]` — returns a new array (Fisher–Yates); does not mutate input.
  - `canStartAttempt(attemptsInPeriod: number, maxAttempts: number, periodStatus: PeriodStatus): boolean` — false if status is `PASSED` or `OVERDUE`, or if attempts ≥ max.
  - `isWithinTimeLimit(startedAt: Date, submittedAt: Date, limitMinutes: number | null): boolean` — null limit always true; otherwise `submittedAt <= startedAt + limitMinutes * 60000`.

- [ ] **Step 1: Write failing tests**

```ts
// scoring.test.ts
import { it, expect } from "vitest";
import { scoreAttempt, isCorrect, shuffleOptions } from "./scoring";
const qs = [
  { id: "q1", type: "SINGLE" as const, correctOptionIds: ["o2"], points: 1 },
  { id: "q2", type: "MULTIPLE" as const, correctOptionIds: ["o1", "o3"], points: 2 },
];
it("scores by points and passes at the mark", () => {
  const r = scoreAttempt(qs, { q1: ["o2"], q2: ["o1", "o3"] }, 100);
  expect(r.scorePercent).toBe(100);
  expect(r.passed).toBe(true);
});
it("multiple choice needs an exact set", () => {
  expect(isCorrect(qs[1], ["o1"])).toBe(false);
  expect(isCorrect(qs[1], ["o3", "o1"])).toBe(true);
  expect(isCorrect(qs[1], ["o1", "o1", "o3"])).toBe(false);
});
it("empty multiple-choice selection scores 0 without error", () => {
  const r = scoreAttempt([qs[1]], {}, 50);
  expect(r.scorePercent).toBe(0);
  expect(r.passed).toBe(false);
});
it("shuffle returns a permutation and does not mutate input", () => {
  const input = ["a", "b", "c", "d"];
  const out = shuffleOptions(input, () => 0.5);
  expect([...out].sort()).toEqual(["a", "b", "c", "d"]);
  expect(input).toEqual(["a", "b", "c", "d"]);
});
```

```ts
// attempts.test.ts
// - canStartAttempt(0, 3, "OPEN") true; canStartAttempt(3, 3, "OPEN") false; canStartAttempt(0, 3, "PASSED") false.
// - isWithinTimeLimit at exactly the limit is true; one ms after is false; null limit always true.
```

- [ ] **Step 2: Run to verify failure.** Run: `npx vitest run src/lib/assessments`. Expected: FAIL.

- [ ] **Step 3: Implement.** Score each question as `points` if correct else 0; `scorePercent = round(earned / total * 100, 2)`. Score by option id, not by position. Use the default `Math.random` for `rng`.

- [ ] **Step 4: Run to verify pass.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add scoring and attempt rules"
```

---

### Task 8: File storage

**Files:**
- Create: `src/lib/storage/types.ts`, `src/lib/storage/local.ts`, `src/lib/storage/validate.ts`
- Test: `src/lib/storage/validate.test.ts`, `src/lib/storage/local.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `interface FileStorage { put(key: string, data: Buffer): Promise<void>; get(key: string): Promise<Buffer>; delete(key: string): Promise<void>; }`
  - `createLocalStorage(rootDir: string): FileStorage`
  - `validateUpload(input: { filename: string; mime: string; sizeBytes: number }, kind: "DOCUMENT" | "VIDEO" | "IMAGE"): { ok: true; key: string } | { ok: false; reason: string }` — allowed: DOCUMENT → `application/pdf`; VIDEO → `video/mp4`; IMAGE → `image/png`, `image/jpeg`. Size limits from `MAX_UPLOAD_MB_DOC` (default 50) and `MAX_UPLOAD_MB_VIDEO` (default 500). `key` is a generated UUID plus the safe extension.

- [ ] **Step 1: Write failing tests**

```ts
// validate.test.ts
// - application/pdf, 1 MB, DOCUMENT → ok.
// - text/html for DOCUMENT → ok:false, reason mentions "type".   (Review Focus 3)
// - 51 MB PDF → ok:false, reason mentions "size".              (Review Focus 3)
// - ok result key matches /^[0-9a-f-]{36}\.pdf$/ and never contains the original filename.
```

```ts
// local.test.ts (uses a temp dir from os.tmpdir())
// - put then get returns the same bytes.
// - get("../etc/passwd") throws "invalid key".
// - delete then get throws.
```

- [ ] **Step 2: Run to verify failure.** Run: `npx vitest run src/lib/storage`. Expected: FAIL.

- [ ] **Step 3: Implement.** Keys are validated against `/^[0-9a-f-]{36}\.(pdf|mp4|png|jpg)$/`; anything else throws `invalid key`. Resolve paths under `rootDir` and confirm the resolved path starts with `rootDir`.

- [ ] **Step 4: Run to verify pass.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add file storage with upload validation"
```

---

### Task 9: Question and user import parsers

**Files:**
- Create: `src/lib/import/questions.ts`, `src/lib/import/users.ts`
- Test: `src/lib/import/questions.test.ts`, `src/lib/import/users.test.ts`

**Interfaces:**
- Consumes: Task 2 (`QuestionType`, `Role`)
- Produces:
  - `type QuestionRow = { type: string; text: string; options: string; correct: string; points: string }` — `options` is a `|`-separated list; `correct` is the 1-based index or `|`-separated indexes (for MULTIPLE).
  - `parseQuestionRows(rows: QuestionRow[]): { ok: true; questions: ParsedQuestion[] } | { ok: false; errors: { row: number; reason: string }[] }` — row numbers are 1-based data rows. Any error means `ok: false` and no questions returned. Rules: `type` in `SINGLE|MULTIPLE|TRUE_FALSE`; `text` non-empty; TRUE_FALSE must have options `True|False`; SINGLE/MULTIPLE need 2–6 options; `correct` indexes in range; SINGLE exactly one correct index; MULTIPLE at least two; `points` a positive integer.
  - `type ParsedQuestion = { type: QuestionType; text: string; options: { id: string; label: string }[]; correctOptionIds: string[]; points: number }` — option ids are `o1`, `o2`, ….
  - `parseUserRows(rows: UserRow[]): { ok: true; users: ParsedUser[] } | { ok: false; errors: {row: number; reason: string}[] }` where `UserRow = { name; email; role; department; managerEmail }` (strings). Rules: valid email; role in `ADMIN|MANAGER|EMPLOYEE`; duplicate emails in the file rejected; `managerEmail` must be empty or refer to a user in the same file or an existing user (existence check is passed in as `knownEmails: Set<string>`, so the signature is `parseUserRows(rows, knownEmails: Set<string>)`).

- [ ] **Step 1: Write failing tests** covering: a valid single-choice row; a MULTIPLE row with `correct = "1|3"`; a row with `correct = "5"` on a 3-option question (error at that row number); a file with one bad row returns `ok:false` with zero questions (Review Focus 3 analogue for imports); a user row with duplicate email returns an error.

- [ ] **Step 2: Run to verify failure.** Run: `npx vitest run src/lib/import`. Expected: FAIL.

- [ ] **Step 3: Implement** as pure functions. Collect all errors across rows before returning.

- [ ] **Step 4: Run to verify pass.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add question and user import parsers"
```

---

### Task 10: Login, logout, and route protection

**Files:**
- Create: `src/app/login/page.tsx`, `src/app/actions/auth.ts`, `src/middleware.ts`, `src/app/(admin)/layout.tsx`, `src/app/(manager)/layout.tsx`, `src/app/(learn)/layout.tsx`
- Test: `e2e/auth.spec.ts`

**Interfaces:**
- Consumes: Tasks 3, 4
- Produces: `login(formData: FormData): Promise<{ error?: string }>` and `logout(): Promise<void>` server actions. Layout guards: `(admin)` requires `ADMIN`; `(manager)` requires `MANAGER` or `ADMIN`; `(learn)` requires any signed-in user. Middleware redirects unauthenticated requests to `/login`.

- [ ] **Step 1: Write failing Playwright test**

```ts
// e2e/auth.spec.ts
import { test, expect } from "@playwright/test";
test("employee cannot open the admin portal", async ({ page }) => {
  await page.goto("/login");
  await page.fill("input[name=email]", "employee@example.test");
  await page.fill("input[name=password]", "Test-pass-1");
  await page.click("button[type=submit]");
  await page.goto("/admin");
  await expect(page).not.toHaveURL(/\/admin$/);
});
test("deactivated user is signed out on next request", async ({ page }) => {
  // seed deactivates the user via prisma in beforeAll; expect redirect to /login
});
```

- [ ] **Step 2: Run to verify failure.** Run: `npx playwright test e2e/auth.spec.ts --trace off`. Expected: FAIL.

- [ ] **Step 3: Implement** the login form, server actions using `hashPassword`/`verifyPassword` and `createSession`, the cookie set, and the layout guards from Task 4.

- [ ] **Step 4: Run to verify pass.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add login, logout, and role-based layouts"
```

---

### Task 11: Admin users and subjects

**Files:**
- Create: `src/app/(admin)/users/page.tsx`, `src/app/(admin)/users/[id]/page.tsx`, `src/app/(admin)/subjects/page.tsx`, `src/app/actions/users.ts`, `src/app/actions/subjects.ts`
- Test: `e2e/admin-users.spec.ts`

**Interfaces:**
- Consumes: Tasks 9 (`parseUserRows`), 10 (layouts), 2 (`prisma`)
- Produces: `createUser`, `updateUser`, `setActive(id, active)`, `importUsers(csvText)`, `createSubject`, `updateSubject`. Each returns `{ ok: true } | { ok: false; error: string }`. `setActive(false)` must also delete the user's sessions.

- [ ] **Step 1: Write failing tests:** an integration test that `setActive(id, false)` deletes sessions; a Playwright test that an admin creates a user and sees the row, and that importing a CSV with a bad row shows the row number and creates no users.

- [ ] **Step 2: Run to verify failure.** Expected: FAIL.

- [ ] **Step 3: Implement** the pages and actions. Actions call `requireRole(user, ["ADMIN"])` first.

- [ ] **Step 4: Run to verify pass.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add admin user and subject management"
```

---

### Task 12: Admin courses, lessons, and uploads

**Files:**
- Create: `src/app/(admin)/courses/page.tsx`, `src/app/(admin)/courses/[id]/page.tsx`, `src/app/api/files/[id]/route.ts`, `src/app/actions/courses.ts`, `src/app/actions/lessons.ts`
- Test: `src/app/actions/courses.test.ts`, `e2e/admin-courses.spec.ts`

**Interfaces:**
- Consumes: Tasks 8 (`createLocalStorage`, `validateUpload`), 10, 11
- Produces:
  - `createCourse`, `updateCourse`, `setCoursePublished(id, published)` — publishing requires at least one lesson and a subject; otherwise returns `{ ok: false, error }`.
  - `addLesson(courseId, input)` and `uploadLessonFile(courseId, formData)` — rejected files leave no lesson row (Review Focus 3).
  - `reorderLessons(courseId, orderedIds: string[])`.
  - `GET /api/files/[id]` — requires session; returns the file only if the user can access the course (published course for learners; admin always); 404 otherwise.

- [ ] **Step 1: Write failing tests:** publish with zero lessons is refused; a `text/html` upload creates no row and no file; an employee calling `GET /api/files/[id]` for an unpublished course gets 404.

- [ ] **Step 2: Run to verify failure.** Expected: FAIL.

- [ ] **Step 3: Implement** the actions and route. Write the file to storage only after validation passes; if the DB insert fails, delete the stored file.

- [ ] **Step 4: Run to verify pass.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add admin course, lesson, and file upload management"
```

---

### Task 13: Admin assessments, questions, assignments, and period opening

**Files:**
- Create: `src/app/(admin)/assessments/page.tsx`, `src/app/(admin)/assessments/[id]/page.tsx`, `src/app/actions/assessments.ts`, `src/lib/assessments/open-periods.ts`
- Test: `src/lib/assessments/open-periods.test.ts`, `e2e/admin-assessments.spec.ts`

**Interfaces:**
- Consumes: Tasks 5 (`periodKeyFor`, `periodBounds`), 9 (`parseQuestionRows`), 2 (`prisma`)
- Produces:
  - `createAssessment`, `updateAssessment`, `setAssessmentPublished(id, published)`, `addQuestion`, `importQuestions(assessmentId, rows)`, `setAssignments(assessmentId, targets)`.
  - `openPeriodsFor(assessmentId: string, now: Date): Promise<{ created: number }>` — for each assigned user, creates the current period row if missing (`periodKeyFor` + `periodBounds`). Never creates periods for past keys. Idempotent by the unique key. Marks periods past `dueAt` with no `PASSED` attempt as `OVERDUE`.

- [ ] **Step 1: Write failing integration tests:** calling `openPeriodsFor` twice creates one row; a user assigned on 2026-11-20 gets only `2026-11`, not earlier weeks; a period past `dueAt` with no pass becomes `OVERDUE`; a period with a passing attempt stays `PASSED`.

- [ ] **Step 2: Run to verify failure.** Expected: FAIL.

- [ ] **Step 3: Implement** `openPeriodsFor` in one transaction per assessment. Admin actions require `ADMIN`.

- [ ] **Step 4: Run to verify pass.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add admin assessment authoring and period opening"
```

---

### Task 14: Learner catalogue, course progress

**Files:**
- Create: `src/app/(learn)/page.tsx`, `src/app/(learn)/catalogue/page.tsx`, `src/app/(learn)/courses/[id]/page.tsx`, `src/app/actions/progress.ts`, `src/lib/learning/progress.ts`
- Test: `src/lib/learning/progress.test.ts`, `e2e/learn-course.spec.ts`

**Interfaces:**
- Consumes: Tasks 2, 10, 12
- Produces:
  - `courseProgressPercent(totalLessons: number, completedLessonIds: string[], lessonIds: string[]): number` — rounded integer; ignores ids not in `lessonIds`; 0 when no lessons.
  - `completeLesson(lessonId: string): Promise<{ ok: boolean; error?: string }>` — only for lessons in published courses; the lesson must be the next incomplete one in order (no skipping).
  - `listCatalogue(user): Promise<SubjectWithCourses[]>` — published courses only, grouped by category.
  - Resume (spec 6B): `saveLessonPosition(lessonId: string, seconds: number): Promise<void>` stores `lesson_progress.position_seconds` and sets `course_progress.last_lesson_id`; `lastLessonFor(userId: string, courseId: string): Promise<string | null>`. Rejects negative seconds. A VIDEO lesson returns its saved position on reload.

- [ ] **Step 1: Write failing tests:** `courseProgressPercent(4, ["a","x"], ["a","b","c","d"])` is 25; `completeLesson` on lesson 3 before lesson 2 is refused; unpublished course lessons are refused.

- [ ] **Step 2: Run to verify failure.** Expected: FAIL.

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Run to verify pass.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add learner catalogue and lesson progress"
```

---

### Task 15: Taking assessments

**Files:**
- Create: `src/app/(learn)/assessments/[periodId]/page.tsx`, `src/app/actions/attempts.ts`, `src/lib/assessments/take.ts`
- Test: `src/lib/assessments/take.test.ts`, `e2e/take-assessment.spec.ts`

**Interfaces:**
- Consumes: Tasks 5, 6, 7, 4 (`canViewUser` not needed here; attempts are own-only)
- Produces:
  - `startAttempt(periodId: string): Promise<{ attemptId: string; questions: PublicQuestion[]; expiresAt: Date | null }>` — refuses when `canStartAttempt` is false; writes the attempt row first (save on start). `PublicQuestion` has no `correctOptionIds`, and options are shuffled per attempt with `shuffleOptions`.
  - `submitAttempt(attemptId: string, answers: Record<string, string[]>): Promise<{ ok: true; scorePercent: number; passed: boolean; answers?: ... } | { ok: false; error: string }>` — refuses if `isWithinTimeLimit` is false (the attempt is marked `expired`); scores with `scoreAttempt`; on pass, sets period `PASSED`, and creates a `Certification` with `expiresAt(now, subject.certification_validity_months)` for the assessment's subject and level. Returns the correct option ids only when `show_answers_after_submit` is true.
  - A repeat submit on an already-submitted attempt returns `{ ok: false, error: "already submitted" }`.
  - Question pools (spec 6B): when `assessments.questions_per_attempt` is set, `startAttempt` draws that many distinct questions at random using an injectable `rng`. Scoring uses only the drawn questions. Test: pool of 5, per-attempt 3 gives 3 distinct questions; with an injected rng the draw is deterministic.

- [ ] **Step 1: Write failing tests:** submit after the time limit is refused (use an injected `now`); a passing submit creates one certification; a repeat submit is refused; a fourth start in the same period is refused.

- [ ] **Step 2: Run to verify failure.** Expected: FAIL.

- [ ] **Step 3: Implement.** Give `startAttempt` and `submitAttempt` an optional `now` parameter for tests, defaulting to `new Date()`.

- [ ] **Step 4: Run to verify pass.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add assessment attempts with time limits and certification"
```

---

### Task 16: Learner home and certifications

**Files:**
- Create: `src/app/(learn)/certifications/page.tsx`, `src/lib/learning/home.ts`
- Test: `src/lib/learning/home.test.ts`, `e2e/learn-home.spec.ts`

**Interfaces:**
- Consumes: Tasks 5, 6, 13, 15
- Produces:
  - `dueSummary(periods: { cadence: Cadence; status: PeriodStatus; dueAt: Date }[], now: Date): { thisWeek: number; thisMonth: number; thisYear: number; overdue: number }`
  - `myCertifications(userId: string, now: Date): Promise<{ subject: string; level: Level; expiresAt: Date; active: boolean }[]>` — own records only.

- [ ] **Step 1: Write failing tests** for `dueSummary`: a WEEKLY open period due this week counts in `thisWeek`; an OVERDUE period counts in `overdue` only.

- [ ] **Step 2: Run to verify failure.** Expected: FAIL.

- [ ] **Step 3: Implement** the pure function and the query.

- [ ] **Step 4: Run to verify pass.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add learner home and certifications page"
```

---

### Task 17: Manager portal

**Files:**
- Create: `src/app/(manager)/team/page.tsx`, `src/app/(manager)/team/[userId]/page.tsx`, `src/lib/manager/team.ts`
- Test: `src/lib/manager/team.test.ts`, `e2e/manager.spec.ts`

**Interfaces:**
- Consumes: Tasks 4 (`reportingLineIds`, `canViewUser`), 6, 14, 16
- Produces:
  - `teamMembers(manager: SessionUser): Promise<TeamRow[]>` — reporting line only.
  - `memberDetail(viewer: SessionUser, userId: string): Promise<MemberDetail>` — throws `AuthError(403)` when `canViewUser` is false.
  - Manager pages are read-only: no mutating actions exist in this task.

- [ ] **Step 1: Write failing tests:** `memberDetail` for a peer throws 403; for an indirect report returns data; a manager's `teamMembers` excludes admins outside the line.

- [ ] **Step 2: Run to verify failure.** Expected: FAIL.

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Run to verify pass.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add manager team views"
```

---

### Task 18: Dashboards and CSV export

**Files:**
- Create: `src/app/(admin)/dashboard/page.tsx`, `src/app/(manager)/team/summary/page.tsx`, `src/app/api/export/[report]/route.ts`, `src/lib/reports/aggregate.ts`, `src/components/SubjectBarChart.tsx`
- Test: `src/lib/reports/aggregate.test.ts`, `e2e/dashboard.spec.ts`

**Interfaces:**
- Consumes: Tasks 6, 13, 15, 17
- Produces:
  - `certsBySubject(certs: { subject: string; level: Level; expiresAt: Date }[], now: Date): { subject: string; byLevel: Record<Level, number>; active: number; expired: number }[]`
  - `passRateByDepartment(periods: { department: string; passed: boolean }[]): { department: string; rate: number }[]` — rate 0–100, rounded to 1 decimal.
  - `toCsv(rows: Record<string, unknown>[]): string` — quotes fields containing commas, quotes, or newlines.
  - `GET /api/export/[report]` — `ADMIN` for company reports; `MANAGER` allowed only for `team` report, scoped to reporting line.

- [ ] **Step 1: Write failing tests:** `certsBySubject` counts an expired certification in `expired` and not `active`; `toCsv` escapes a comma and a quote; `passRateByDepartment` over 1 pass and 2 fails gives 33.3.

- [ ] **Step 2: Run to verify failure.** Expected: FAIL.

- [ ] **Step 3: Implement** the pure functions, then the pages and chart component using the data.

- [ ] **Step 4: Run to verify pass.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add admin and manager dashboards with CSV export"
```

---

### Task 19: Seed data

**Files:**
- Create: `prisma/seed.ts`
- Test: `src/lib/db/seed.test.ts`

**Interfaces:**
- Consumes: Task 2
- Produces: `npm run db:seed` creates the 17 subjects with their categories (8 business, 9 technical), one admin (`admin@example.test`), one manager, and two employees. Seed passwords are read from `SEED_PASSWORD` and never hard-coded.

- [ ] **Step 1: Write failing test:** after seed, `subject.count()` is 17 and business count is 8.

- [ ] **Step 2: Run to verify failure.** Expected: FAIL.

- [ ] **Step 3: Implement** with upserts keyed on `slug`, so re-running is safe.

- [ ] **Step 4: Run to verify pass.** Run: `npm run db:seed && npx vitest run src/lib/db/seed.test.ts`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add idempotent seed for subjects and demo users"
```

---

### Task 20: End-to-end flows and authorization checks

**Files:**
- Create: `e2e/full-flow.spec.ts`, `e2e/authorization.spec.ts`, `e2e/fixtures.ts`

**Interfaces:**
- Consumes: all prior tasks
- Produces: Playwright suites run with `npm run test:e2e -- --trace off`.

- [ ] **Step 1: Write the full-flow test:** admin creates a published course with one lesson and an assessment assigned to the employee; employee completes the lesson, passes the assessment; manager sees the result on the team page; admin dashboard shows one active certification for that subject.

- [ ] **Step 2: Write the authorization tests:** employee gets 403 or redirect on `/admin` and `/manager`; employee gets 404 for another user's `/manager/team/[id]`; manager gets 403 for a user outside their line; employee gets 404 for `/api/files/[id]` of an unpublished course (Review Focus 3).

- [ ] **Step 3: Run to verify failure first if the flows are not yet wired.** Run: `npm run test:e2e -- --trace off`. Expected: any failure is reported with output.

- [ ] **Step 4: Fix any failures in the owning task's code** (not by weakening the test).

- [ ] **Step 5: Run and commit**

Run: `npm run test:e2e -- --trace off`
Expected: all PASS.

```bash
git add -A && git commit -m "test: add end-to-end and authorization flows"
```

---

### Task 21: Live sessions, registration, and attendance (spec 6A)

**Files:**
- Create: `src/lib/learning/live-sessions.ts`, `src/app/actions/live-sessions.ts`, `src/app/(admin)/courses/[id]/sessions/page.tsx`, `src/app/(learn)/sessions/[id]/page.tsx`
- Test: `src/lib/learning/live-sessions.test.ts`

**Interfaces:**
- Consumes: Task 2 (`LiveSession`, `LiveSessionRegistration`), Task 4 (`canViewUser`), Task 14 (`completeLesson`)
- Produces:
  - `scheduleSession(lessonId: string, input: { startsAt: Date; endsAt: Date; meetingUrl: string; capacity: number | null; instructorIds: string[] }): Promise<{ ok: boolean; error?: string }>` — refuses when `endsAt <= startsAt` or the lesson is not `LIVE_SESSION`.
  - `registerForSession(sessionId: string, userId: string, now?: Date): Promise<{ ok: boolean; error?: string }>` — refuses duplicates and sessions that have ended; refuses when registrations already equal `capacity` (capacity null means unlimited).
  - `markAttendance(sessionId: string, attendeeIds: string[], actor: SessionUser): Promise<void>` — actor must be ADMIN, or a MANAGER for each attendee (`canViewUser`). A user marked attended completes the lesson.
- Tests: exactly-full session refuses the next registration; registering twice refuses; a session that already ended refuses registration; `markAttendance` by a manager for a non-team member throws 403; attended learner has the lesson completed.

### Task 22: Hands-on lab lessons (spec 6A)

**Files:**
- Create: `src/lib/learning/labs.ts`
- Test: `src/lib/learning/labs.test.ts`

**Interfaces:**
- Consumes: Task 2 (`LessonType`), Task 14 (`completeLesson`)
- Produces:
  - `parseLabChecklist(body: string): { id: string; text: string }[]` — each `- [ ] text` line in the body is an item; `id` is `item-<index>` (1-based).
  - `labComplete(items: { id: string }[], checkedIds: string[]): boolean` — true only when every item id is checked; unknown ids are ignored; zero items is not complete.
  - `saveLabProgress(lessonId: string, userId: string, checkedIds: string[]): Promise<{ complete: boolean }>` — when complete, calls `completeLesson`.
- Tests: body with 3 items and 2 checked is not complete; 3 checked is complete; an unknown id does not count toward completion; a body with no items is not complete.

### Task 23: Reminders (spec 6B)

**Files:**
- Create: `src/lib/notifications/reminders.ts`, `src/lib/notifications/mailer.ts`, `src/app/api/cron/reminders/route.ts`
- Test: `src/lib/notifications/reminders.test.ts`

**Interfaces:**
- Consumes: Task 5 (period status), Task 2 (`Notification`)
- Produces:
  - `type ReminderType = "DUE_SOON" | "DUE_TODAY" | "OVERDUE"`
  - `remindersDue(periods: { id: string; userId: string; dueAt: Date; status: PeriodStatus }[], now: Date, alreadySent: Set<string>): { key: string; periodId: string; userId: string; type: ReminderType }[]` — key is `${periodId}:${type}`. `DUE_SOON` when `dueAt` is 3 days or less away and more than 1 day away; `DUE_TODAY` when due within the next 24 hours; `OVERDUE` when `dueAt < now` and status is OPEN or OVERDUE. Passed periods never produce reminders. Keys in `alreadySent` are skipped.
  - `interface Mailer { send(to: string, subject: string, body: string): Promise<void> }`; the SMTP implementation reads `SMTP_URL` from config.
  - Route `POST /api/cron/reminders` requires header `Authorization: Bearer ${CRON_SECRET}`.
- Tests: a period due in 2 days gives `DUE_SOON`; due in 5 days gives nothing; past due and OPEN gives `OVERDUE`; a PASSED period gives nothing; a key already in `alreadySent` is skipped. The weekly manager digest lists overdue team members only.

### Task 24: Audit log (spec 6B)

**Files:**
- Create: `src/lib/audit/record.ts`, `src/app/(admin)/audit/page.tsx`
- Test: `src/lib/audit/record.test.ts`

**Interfaces:**
- Consumes: Task 2 (`AuditEvent`), Task 3 (`SessionUser`)
- Produces:
  - `recordAudit(tx: PrismaTransaction, event: { actorId: string; action: string; entityType: string; entityId: string; before?: object; after?: object }): Promise<void>`
  - `changedFields(before: Record<string, unknown>, after: Record<string, unknown>): string[]` — keys whose values differ (JSON comparison), sorted.
  - The module exports no update or delete function for `AuditEvent`.
- Tests: `changedFields` lists only changed keys; `setActive` (Task 11) writes one audit row with `action: "user.deactivate"`; the module exports no function named update or delete.

### Task 25: Certificates and verification (spec 6B)

**Files:**
- Create: `src/lib/certificates/code.ts`, `src/lib/certificates/render.ts`, `src/app/verify/[code]/page.tsx`, `src/app/api/certificates/[id]/route.ts`
- Test: `src/lib/certificates/code.test.ts`, `src/lib/certificates/verify.test.ts`

**Interfaces:**
- Consumes: Task 6 (`isActive`), Task 2 (`Certification`)
- Produces:
  - `makeVerificationCode(rng?: () => number): string` — 12 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0, O, 1, or I).
  - `renderCertificatePdf(data: { holderName: string; subject: string; level: Level; issuedAt: Date; expiresAt: Date; code: string }): Promise<Buffer>` — uses `pdf-lib`.
  - `verificationView(cert: { holderName: string; subject: string; level: Level; issuedAt: Date; expiresAt: Date }, now: Date): { valid: boolean; holderName: string; subject: string; level: Level; issuedAt: Date; expiresAt: Date }` — contains no score or attempt fields.
- Tests: code is 12 characters and uses only the allowed charset; `verificationView` returns `valid: false` when `expiresAt == now` (matches Review Focus 1); the returned object has no `score` key.

### Task 26: Employee profile and profile pictures (spec 6C, and profile photos from the admin section)

**Files:**
- Create: `src/lib/profile/validate.ts`, `src/lib/profile/initials.ts`, `src/app/(learn)/profile/page.tsx`, `src/app/actions/profile.ts`
- Modify: `src/app/actions/users.ts` (photo upload on create and edit, using `validateUpload` kind `IMAGE` with the 5 MB photo limit)
- Test: `src/lib/profile/validate.test.ts`, `src/lib/profile/initials.test.ts`

**Interfaces:**
- Consumes: Task 8 (`validateUpload`), Task 4 (`requireRole`), Task 24 (`recordAudit`)
- Produces:
  - `validateProfileEdit(actor: SessionUser, input: Partial<EmployeeProfile>): { ok: true } | { ok: false; errors: Record<string, string> }` — an employee may edit only personal details, skills, education, experience, external certifications, and languages. Employment fields (department, role title, manager, joined date) are admin-only, and an employee submitting them is refused. Limits: bio 500 characters, experience description 1000 characters, `selfRating` 1 to 5, language level one of `BASIC | WORKING | FLUENT`.
  - `initialsFor(name: string): string` — first letter of the first two words, uppercased; a single word gives its first two letters.
  - `saveProfile(actor: SessionUser, userId: string, input: Partial<EmployeeProfile>): Promise<{ ok: boolean; errors?: Record<string, string> }>`
- Tests: an employee setting `department` is refused; a 501-character bio is refused; `selfRating` 0 is refused; a 6 MB photo is refused; `initialsFor("Anil Bhat")` is `AB` and `initialsFor("Ravi")` is `RA`; a manager cannot call `saveProfile` for a team member (spec: managers view only).

### Task 27: Accessibility checks and caption requirement (spec 6B)

**Files:**
- Create: `src/lib/learning/publish.ts`, `e2e/accessibility.spec.ts`
- Modify: `prisma/schema.prisma` (add `caption_file_key` to `lessons`), `src/app/actions/lessons.ts`
- Test: `src/lib/learning/publish.test.ts`, `e2e/accessibility.spec.ts`

**Interfaces:**
- Consumes: Task 12 (lesson actions), Task 14 (catalogue)
- Produces:
  - `canPublishLesson(lesson: { type: LessonType; captionFileKey: string | null }): { ok: boolean; reason?: string }` — a VIDEO lesson without a caption file is refused with reason `"Captions (.vtt) are required for video lessons"`.
- Tests: a VIDEO lesson with no caption is refused; with a caption it passes; a TEXT lesson needs no caption. Playwright with `@axe-core/playwright` on the login, admin dashboard, and learner catalogue pages reports zero serious or critical violations.

### Task 28: Final verification

**Files:**
- Modify: `README.md` (setup and run instructions)

**Interfaces:**
- Consumes: all tasks
- Produces: a documented, runnable app.

- [ ] **Step 1: Run the full suite**

Run: `npm test && npm run build && npm run test:e2e -- --trace off`
Expected: all PASS, build succeeds.

- [ ] **Step 2: Update `README.md`** with: prerequisites (Docker or Node 20 plus Postgres), `.env` setup from `.env.example`, `npx prisma migrate deploy`, `npm run db:seed`, `docker compose up`, and the default demo logins.

- [ ] **Step 3: Verify Docker Compose boots**

Run: `docker compose up -d --build && curl -sf http://localhost:3000/login -o /dev/null && echo OK`
Expected: `OK`. If Docker is not available in this environment, report that and skip this step.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "docs: add setup and run instructions"
```

---

## Self-Review Notes

- Spec coverage: sections 2 (architecture) → Tasks 1–3; section 3 (data model) → Task 2 and Task 3 (sessions); section 4 (roles and portals) → Tasks 4, 10–17; section 5 (cycles and certification) → Tasks 5–7, 13, 15, 16; section 6 (content, files, imports) → Tasks 8, 9, 12; section 7 (dashboards) → Task 18; section 8 (error handling) → covered within Tasks 11, 12, 15 and Task 3 (deactivated users); section 9 (testing) → every task plus Task 20; section 10 (defaults) → Global Constraints.
- Dashboard "highest level per subject" is covered by Task 6 `highestActiveLevelPerSubject`.
- Types: `Level`, `Cadence`, `Role`, `PeriodStatus`, `QuestionType` are generated Prisma enums defined in Task 2 and used unchanged in later tasks.
- Gap found and fixed while writing: the spec does not say what happens to periods when an assessment is unassigned. Not in scope for this version; existing periods stay in history.
