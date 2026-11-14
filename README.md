# bhat

My own creation on sales.

## 3C IT Solutions LMS

An on-premise learning management system for 3C IT Solutions and Telecoms India Ltd. It runs on the company's own server over the LAN or VPN, with no internet needed at runtime.

- **Admin** (`/admin`): users and CSV import; courses with modules and lessons (text, PDF, video with captions, links, labs, live sessions); course assignments with due dates; weekly, monthly and annual assessments with six question types, question pools, proctored mode and a grading queue; certificates with QR verification; dashboards with filters and CSV/PDF export; announcements; audit log.
- **Manager** (`/manager`): their reporting line only. Team heat map, each person's progress, attempts, weak topics and certificates; assign courses; comment on remedial plans.
- **Employee** (`/learn`): progress by subject, assigned courses and assessments with countdowns, course player with resume, assessments, certificates, recommendations, course Q&A and feedback, search.

## Documentation

| Document | For |
| --- | --- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Architecture, folder structure, data model, security, sizing, assumptions, open questions, and brief coverage |
| [`docs/INSTALL.md`](docs/INSTALL.md) | Installing on the server, HTTPS, backups and restore, upgrades, troubleshooting |
| [`docs/ADMIN_MANUAL.md`](docs/ADMIN_MANUAL.md) | L&D and HR administrators |
| [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) | Employees and managers |
| [`docs/CATALOGUE.md`](docs/CATALOGUE.md) | The 17-subject course catalogue, Basic to Advanced |
| [`docs/TESTING.md`](docs/TESTING.md) | Running the tests, acceptance criteria, load-test results, demo checklists per phase |

## Production (Docker)

See [`docs/INSTALL.md`](docs/INSTALL.md). In short:

```bash
cp .env.example .env
```

```bash
deploy/nginx/make-cert.sh lms.3cit.local 10.0.0.25
```

```bash
docker compose up -d --build
```

```bash
docker compose exec app env SEED_PASSWORD='choose-a-password' npx tsx prisma/seed.ts
```

Compose runs PostgreSQL, 3 app replicas, Nginx with HTTPS, an hourly scheduler (assessment periods and email reminders), and a daily encrypted backup.

## Development

Requirements: Node.js 22 and PostgreSQL 16.

```bash
cp .env.example .env
```

```bash
npm ci && npx prisma generate
```

```bash
npx prisma migrate deploy
```

```bash
SEED_PASSWORD='choose-a-password' npm run db:seed
```

```bash
npm run dev
```

Open http://localhost:3000. Set `COOKIE_SECURE=false` in `.env` for plain HTTP on a host other than localhost.

### Demo accounts

The seed creates 3 departments and 6 accounts, all using the `SEED_PASSWORD` you chose. **Before real use, create a real admin and deactivate them:**

```bash
ADMIN_PASSWORD='choose-a-strong-password' npm run db:create-admin -- "Full Name" name@company.in
```

```bash
npm run db:deactivate-demo
```

| Email | Role | Department | Reports to |
| --- | --- | --- | --- |
| `admin@3c.example` | Admin | Learning and Development | |
| `manager@3c.example` | Manager | Sales | admin |
| `manager2@3c.example` | Manager | Technical Services | admin |
| `employee@3c.example` | Employee | Sales | manager |
| `employee2@3c.example` | Employee | Sales | manager |
| `employee3@3c.example` | Employee | Technical Services | manager2 |

It also loads the subjects, 28 sample courses, and 20-question monthly assessments for Sales Basic and Networking Basic. All sample content is labelled as a placeholder. To create draft shells for the rest of the catalogue:

```bash
npm run db:seed-catalogue
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm test` | Unit and integration tests (needs the `lms_test` database) |
| `npm run test:e2e` | End-to-end tests (builds and starts the app) |
| `npm run db:seed` | Subjects, sample courses, question banks, demo accounts |
| `npm run db:seed-catalogue` | Draft course shells for the catalogue |
| `npm run db:create-admin` | Create a real admin account |
| `npm run db:deactivate-demo` | Deactivate the six demo accounts (needs a real admin first) |
| `npm run catalogue:docs` | Rebuilds `content/catalogue.json` and `docs/CATALOGUE.md` |
| `node scripts/load-test.mjs` | Load test (see `docs/TESTING.md`) |

### Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `FILE_STORAGE_DIR` | Where uploaded files are stored (not public) |
| `MAX_UPLOAD_MB_DOC`, `MAX_UPLOAD_MB_VIDEO`, `MAX_UPLOAD_MB_PHOTO` | Upload size limits |
| `SMTP_URL`, `MAIL_FROM` | Company mail server for reminders and announcements |
| `CRON_SECRET` | Secret for the scheduler endpoint (`POST /api/cron/reminders`) |
| `PUBLIC_BASE_URL` | Address staff use; printed in certificate QR codes |
| `SESSION_IDLE_MINUTES` | Idle timeout (default 30) |
| `COOKIE_SECURE` | `true` or `false`. Cookies are Secure in production; use `false` only for plain HTTP off localhost. |
| `APP_REPLICAS` | App processes behind Nginx (Docker, default 3) |
| `BACKUP_PASSPHRASE`, `BACKUP_AT`, `BACKUP_KEEP_DAYS`, `BACKUP_HOST_DIR`, `TZ` | Backups (Docker) |
