# bhat

My own creation on sales.

## 3C IT Solutions LMS

A learning and assessment portal for 3C IT Solutions and Telecoms India Ltd employees.

- **Admin** (`/admin`): users, courses and lessons, assessments and questions, assignments, dashboards, CSV exports, audit log.
- **Manager** (`/manager`): the learning record of everyone in their reporting line.
- **Employee** (`/learn`): courses, labs, live sessions, weekly, monthly and annual assessments, certifications, profile.

Design: `docs/superpowers/specs/2026-11-12-lms-portal-design.md`. Plan: `docs/superpowers/plans/2026-11-12-lms-portal.md`.

### Requirements

- Node.js 22 (or 20+)
- PostgreSQL 16, or Docker with Docker Compose

### Setup

```bash
cp .env.example .env          # then set POSTGRES_PASSWORD, CRON_SECRET, SMTP_URL
npm ci
npx prisma migrate deploy     # creates the tables
SEED_PASSWORD='choose-a-password' npm run db:seed   # subjects, 28 course files, demo accounts
npm run dev                   # http://localhost:3000
```

Demo accounts created by the seed (password is the value of `SEED_PASSWORD`):

- `admin@3c.example` (admin)
- `manager@3c.example` (manager of the demo employee)
- `employee@3c.example` (employee)

Change or remove these accounts before real use.

### Docker

```bash
POSTGRES_PASSWORD=... CRON_SECRET=... docker compose up -d --build
```

The app container runs `prisma migrate deploy` on start. Run the seed once with `docker compose exec app env SEED_PASSWORD=... npx tsx prisma/seed.ts`.

### Reminders

Schedule a POST to `/api/cron/reminders` every hour with the header `Authorization: Bearer $CRON_SECRET`. Each reminder is sent once.

### Tests

```bash
npm test                      # unit and integration tests (needs the lms_test database)
npm run test:e2e              # end-to-end tests (set PW_CHROMIUM_PATH if Playwright's browser is not installed)
```

Tests use `TEST_DATABASE_URL`, which defaults to `postgresql://lms:lms@localhost:5432/lms_test`.

### Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `FILE_STORAGE_DIR` | where uploaded files are stored (not public) |
| `MAX_UPLOAD_MB_DOC`, `MAX_UPLOAD_MB_VIDEO`, `MAX_UPLOAD_MB_PHOTO` | upload size limits |
| `SMTP_URL`, `MAIL_FROM` | email for reminders |
| `CRON_SECRET` | secret for the reminder endpoint |
