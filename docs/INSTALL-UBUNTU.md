# Install the LMS on a new Ubuntu server

A short, step-by-step guide for a fresh install on **Ubuntu Server 24.04 or 22.04 LTS**. For every option and for troubleshooting, see `INSTALL.md`. To move an existing LMS (with its users, courses and results) instead, see "Move the LMS to a new server" in `INSTALL.md`.

**Server:** 8 CPU cores, 16 GB RAM, 300 GB SSD, a fixed IP address on the office network. Internet access is needed during installation (to download Docker and the software).

Run each command on the server (directly or over SSH), one at a time.

## 1. Install Docker and Git

```bash
sudo apt-get update && sudo apt-get install -y git curl openssl
```

```bash
curl -fsSL https://get.docker.com | sudo sh
```

```bash
sudo usermod -aG docker $USER
```

Log out and log in again, then check:

```bash
docker compose version
```

## 2. Download the LMS

```bash
sudo git clone https://github.com/anilbhat2000-a11y/bhat.git /opt/lms && sudo chown -R $USER /opt/lms
```

The repository is private: Git asks for a GitHub user name and a personal access token (GitHub → Settings → Developer settings → Personal access tokens).

```bash
cd /opt/lms && git checkout claude/optimistic-mccarthy-dvkjzq
```

## 3. Create the settings and certificate

Find the server's IP address:

```bash
hostname -I
```

Run the setup script with that address (example `192.168.1.50`). If IT has given the server a name, use `deploy/setup-server.sh lms.yourcompany.local 192.168.1.50` instead.

```bash
deploy/setup-server.sh 192.168.1.50
```

It creates `.env` with strong random passwords and a security certificate. **Write down the backup passphrase it prints** and keep it off the server: without it, backups cannot be restored.

## 4. Start the LMS

```bash
docker compose up -d --build
```

The first build takes 10 to 60 minutes, depending on the internet speed. Then check every line says running or Up:

```bash
docker compose ps
```

If the server has less than 16 GB of memory, open `docker-compose.yml` and lower `shared_buffers=4GB` to a quarter of the memory (for example `2GB` for 8 GB), then run the start command again.

## 5. Load the courses and create your admin account

Load the subjects, the 66 ready-made courses and assessments (this also creates demo accounts):

```bash
docker compose exec app env SEED_PASSWORD='Demo-pass-2026' npx tsx prisma/seed.ts
```

Create your own admin account. Change the password, name and email **before** pressing Enter (password at least 12 characters):

```bash
docker compose exec -e ADMIN_PASSWORD='Your-Strong-Password-26' app npx tsx prisma/create-admin.ts "Your Name" you@yourcompany.com
```

Switch off the demo accounts:

```bash
docker compose exec app npx tsx prisma/deactivate-demo.ts
```

## 6. Open the portal

On any office computer, open `https://192.168.1.50` (your server's address). The browser warns about the certificate the first time: choose Advanced → Continue. To remove the warning, install `deploy/nginx/certs/lms.crt` as a trusted certificate on staff computers (IT can push it through Group Policy).

Sign in with the admin account from step 5.

## 7. After installing

- **Email:** Admin → Email settings. Enter the company mail server, send a test email, then switch it on.
- **Firewall:** if `ufw` is enabled, allow the portal: `sudo ufw allow 80,443/tcp`
- **Backups:** made every night at 02:00 into `/opt/lms/backups`. Run one now with `docker compose exec backup backup.sh`. Copy them to another disk or NAS regularly.
- **Updates:** `cd /opt/lms && git pull && docker compose up -d --build`
- **Restart:** the LMS starts by itself when the server reboots.
