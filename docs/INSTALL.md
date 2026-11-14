# Installation guide

This guide installs the LMS on one company server. After installation, the LMS needs no internet access.

## 1. Server requirements

| Item | Minimum | Notes |
| --- | --- | --- |
| CPU and memory | 8 vCPU, 16 GB RAM | Sized for 300 concurrent users. See section 6 of `ARCHITECTURE.md`. |
| Disk | 300 GB SSD | Content (videos), database, and 14 days of backups. Put backups on a second disk if you can. |
| Operating system | Ubuntu Server 24.04 LTS | Windows Server works with Docker Desktop or WSL2; the commands are the same inside WSL2. |
| Software | Docker Engine 24+ with the Compose plugin | |
| Network | A fixed LAN IP address and a DNS name, for example `lms.3cit.local` | Open TCP 80 and 443 to staff networks and the VPN. |
| Email | The company SMTP server | For reminders. The LMS works without it, but sends no email. |

## 1a. Windows Server or Windows 10/11

1. Install **Docker Desktop** (with the WSL 2 backend) and **Git for Windows**. Git for Windows also provides **Git Bash**, which has `openssl` for the certificate step.
2. Run every command below from inside the LMS folder (for example `C:\lms`), never from `C:\Windows\system32`. Otherwise Docker answers `no configuration file provided: not found`.
3. Copy files with `copy` instead of `cp` in PowerShell, and run `deploy/nginx/make-cert.sh` in **Git Bash**.

## 2. Get the software onto the server

**If the server has internet access during installation:**

```bash
git clone <repository-url> /opt/lms
```

```bash
cd /opt/lms
```

**If the server has no internet access at all:** on a machine that has internet and Docker, build and save the images, then copy the folder and the image file to the server.

```bash
docker compose build && docker pull postgres:16 && docker pull nginx:1.27-alpine && docker pull alpine:3.20
```

```bash
docker save lms-app lms-backup postgres:16 nginx:1.27-alpine alpine:3.20 -o lms-images.tar
```

On the server:

```bash
docker load -i lms-images.tar
```

## 3. Configure

```bash
cp .env.example .env
```

Edit `.env` and set at least these values:

| Variable | What to set |
| --- | --- |
| `POSTGRES_PASSWORD` | A long random password for the database. |
| `CRON_SECRET` | A long random value. The scheduler uses it to call the reminder endpoint. |
| `SMTP_URL` | The company SMTP server, for example `smtp://lms%40company.in:password@smtp.company.in:587`. Leave empty until you have the details: the LMS runs, but sends no email. |
| `MAIL_FROM` | The sender address for LMS emails. |
| `PUBLIC_BASE_URL` | The address staff type, for example `https://lms.3cit.local`. It is printed in certificate QR codes. |
| `BACKUP_PASSPHRASE` | A long passphrase that encrypts backups. **Store a copy offline.** Without it, no backup can be restored. |
| `BACKUP_HOST_DIR` | Where backups are written on the server. Use a second disk or a mounted NAS if possible. |
| `APP_REPLICAS` | Number of app processes. Keep 3 for an 8 vCPU server. |
| `RETENTION_DAYS` | Data older than this is deleted (company policy: 365). |
| `TZ` | Time zone for the backup schedule and server messages. Default `Asia/Kolkata`. |

To generate random values:

```bash
openssl rand -base64 32
```

## 4. Certificate for HTTPS

If the company has an internal certificate authority, ask it for a certificate for the LMS host name. Save the full chain as `deploy/nginx/certs/lms.crt` and the key as `deploy/nginx/certs/lms.key`.

Otherwise, create a self-signed certificate (replace the name and IP address):

```bash
deploy/nginx/make-cert.sh lms.3cit.local 10.0.0.25
```

Then install `deploy/nginx/certs/lms.crt` as a trusted root on staff computers (for example through Group Policy), or browsers will show a warning.

## 5. Start

```bash
docker compose up -d --build
```

Leave out `--build` if you loaded images with `docker load`. The app runs its database migrations each time it starts.

Check that everything is running:

```bash
docker compose ps
```

## 6. Load the starting data

The seed creates the 17 subjects (plus two extra subjects used by sample content), the sample courses, and the demo accounts listed in the README. All sample content is marked as placeholder.

```bash
docker compose exec app env SEED_PASSWORD='choose-a-demo-password' npx tsx prisma/seed.ts
```

To also create draft course shells for every catalogue course that is not in the portal yet (see `CATALOGUE.md`):

```bash
docker compose exec app npx tsx prisma/seed-catalogue.ts
```

Open `https://lms.3cit.local` and sign in as `admin@3c.example` with the demo password to look around.

### Before go-live: real admin, then deactivate the demo accounts

1. Create a real admin account (the password, at least 12 characters, is read from `ADMIN_PASSWORD` so it does not appear in the command):

   ```bash
   docker compose exec -e ADMIN_PASSWORD='choose-a-strong-password' app npx tsx prisma/create-admin.ts "Full Name" name@company.in
   ```

2. Deactivate all six demo accounts and sign them out:

   ```bash
   docker compose exec app npx tsx prisma/deactivate-demo.ts
   ```

   The command refuses if no real admin is active, so nobody is locked out of the admin portal. Re-running the seed later does not reactivate the demo accounts. Their records stay in the database and can be reactivated from Admin portal → Users if ever needed.

## 7. Backups

The `backup` container makes an encrypted backup every day at `BACKUP_AT` (default 02:00) into `BACKUP_HOST_DIR`, and deletes backups older than `BACKUP_KEEP_DAYS` (default 14).

Run a backup now:

```bash
docker compose exec backup backup.sh
```

See the backups:

```bash
ls -lh backups/
```

Company decision: backups stay on the local server. If the server has a second disk, mount it and point `BACKUP_HOST_DIR` at it (for example `/mnt/backup/lms`): a backup on the system disk is lost if that disk fails. Keep a copy of `BACKUP_PASSPHRASE` somewhere other than the server.

### Restore

A restore replaces the current database and uploaded files.

1. Stop the app and scheduler:

   ```bash
   docker compose stop app scheduler
   ```

2. Restore the chosen backup (the file name is an example). The script checks the checksum and the passphrase before it changes anything:

   ```bash
   docker compose exec backup restore.sh /backups/lms-20261113-020000.tar.gpg
   ```

   Type `RESTORE` when asked.

3. Start the app again:

   ```bash
   docker compose start app scheduler
   ```

**Restore time.** In testing, a seeded database with sample files backed up in 2 seconds and restored in under 1 second. Time grows with content size, and video files dominate. Plan for about 10 minutes per 100 GB of uploaded files on SSD storage, and measure it during the Phase 4 restore test (see `TESTING.md`). Record the measured time in your operations notes.

## 8. Upgrades

```bash
git pull
```

```bash
docker compose up -d --build
```

Take a backup first. Migrations run automatically when the app starts.

## 9. Logs

Container logs rotate automatically (10 files of 20 MB per service).

```bash
docker compose logs --tail 200 app
```

```bash
docker compose logs --tail 200 nginx
```

## 10. Checking that the LMS works offline

Disconnect the server's internet (or block outbound traffic at the firewall) and sign in from a staff computer. Every page, video, PDF, and certificate is served from the server itself. The automated test `e2e/offline.spec.ts` checks this on every test run.

## 11. Troubleshooting

| Problem | Check |
| --- | --- |
| Browser warns about the certificate | Install `lms.crt` as trusted on the computer, or use a certificate from the company CA. |
| Sign-in shows "Invalid Server Actions request" in the app log | Nginx must pass the `Host` header with the port. Use the provided `deploy/nginx/lms.conf` unchanged. |
| "Too many failed sign-in attempts" | Wait 15 minutes, or have an admin reset the password. |
| No reminder emails | Check `SMTP_URL`, and `docker compose logs scheduler`. |
| Uploads fail for large videos | The limit is `MAX_UPLOAD_MB_VIDEO` (default 500 MB). Nginx allows up to 550 MB. |
| Backup container keeps restarting | `BACKUP_PASSPHRASE` is missing from `.env`. |
