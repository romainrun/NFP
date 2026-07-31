# NFP — Development CI/CD (VPS + Expo Metro + PM2)

This is a **development** deployment only.

It is **not** a Play Store / App Store / EAS production release.

Every push to `main` updates the permanent Expo Metro server on the VPS so you can open Expo Go or a Development Client from anywhere and load the latest JS bundle — without keeping a laptop online.

```
git push origin main
        ↓
GitHub Actions (.github/workflows/deploy.yml)
        ↓
SSH (secrets: HOST, PORT, USERNAME, SSH_KEY)
        ↓
/home/deploy/apps/nfp  →  scripts/deploy.sh
        ↓
git reset --hard origin/main
npm install
pm2 start|restart nfp-metro
        ↓
Health check → http://127.0.0.1:8086
        ↓
Expo Go / Dev Client loads the VPS Metro bundle
```

---

## 1. Required GitHub Secrets

Repository → **Settings → Secrets and variables → Actions**

| Secret     | Example              | Description                          |
|------------|----------------------|--------------------------------------|
| `HOST`     | `203.0.113.10`       | VPS public hostname or IP            |
| `PORT`     | `22`                 | SSH port                             |
| `USERNAME` | `deploy`             | Linux user that owns the app         |
| `SSH_KEY`  | `-----BEGIN … KEY---`| Private key for that user (full PEM) |

Never commit these values.

---

## 2. One-time VPS setup

Run as root (or with sudo), then switch to the deploy user.

### 2.1 System packages

```bash
sudo apt update
sudo apt install -y git curl build-essential

# Node.js 22.x (LTS-compatible with current Expo)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

node -v
npm -v
```

### 2.2 Deploy user + directories

```bash
sudo adduser --disabled-password --gecos "" deploy || true
sudo mkdir -p /home/deploy/apps /home/deploy/logs/nfp
sudo chown -R deploy:deploy /home/deploy
```

### 2.3 SSH key for GitHub Actions

On the VPS (as `deploy`):

```bash
sudo -u deploy -i
mkdir -p ~/.ssh
chmod 700 ~/.ssh
# Paste the matching public key:
nano ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Put the **private** key in the GitHub secret `SSH_KEY`.

### 2.4 PM2

```bash
sudo npm install -g pm2
sudo -u deploy -i
pm2 -v
```

### 2.5 PM2 startup (survive reboot)

Still as `deploy`, print the startup command, then run the suggested systemd line with sudo:

```bash
pm2 startup systemd -u deploy --hp /home/deploy
# Copy/paste the sudo env PATH=... pm2 startup command it prints, then:
pm2 save
```

### 2.6 Open Metro port (firewall)

Metro must be reachable from your phone (or use a VPN / SSH tunnel).

```bash
# UFW example — restrict to your IP in production-like setups
sudo ufw allow 8086/tcp
sudo ufw reload
```

### 2.7 First clone (optional)

GitHub Actions clones automatically on the first run. Manual bootstrap:

```bash
sudo -u deploy -i
git clone https://github.com/romainrun/NFP.git /home/deploy/apps/nfp
cd /home/deploy/apps/nfp
npm install
mkdir -p /home/deploy/logs/nfp
pm2 start ecosystem.config.js --only nfp-metro
pm2 save
```

---

## 3. How deployment works

| Step | Behavior |
|------|----------|
| Trigger | `push` to `main` (also manual `workflow_dispatch`) |
| Sync | `git fetch` + `git reset --hard origin/main` |
| Install | `npm install` only (keeps `node_modules`, no cache wipe) |
| Process | PM2 app `nfp-metro` created or restarted |
| Metro | `npx expo start --dev-client --host 0.0.0.0 --port 8086 --clear=false` |
| Safety | Failed `git` / `npm install` → **Metro not restarted** |
| Health | curl `http://127.0.0.1:8086` with retries; workflow fails if down |
| Reboot | `pm2 save` + `pm2 startup` restore Metro after reboot |

Key files:

- `.github/workflows/deploy.yml` — Actions entrypoint
- `scripts/deploy.sh` — remote deploy logic
- `ecosystem.config.js` — PM2 process definition

---

## 4. Connect Expo Go / Dev Client

1. Ensure the VPS firewall allows `8086` (or use Tailscale / SSH tunnel).
2. On your phone, open Expo Go or your Dev Client.
3. Enter the bundle URL:

```text
exp://YOUR_VPS_IP:8086
```

Or scan the QR code from Metro logs if you expose it.

Because Metro runs with `--dev-client`, prefer a **Development Client** build for full parity; Expo Go works for JS-only iteration when native modules allow it.

---

## 5. Useful PM2 commands

```bash
# Status
pm2 status
pm2 describe nfp-metro

# Restart / stop / start
pm2 restart nfp-metro
pm2 stop nfp-metro
pm2 start ecosystem.config.js --only nfp-metro

# Logs (also on disk)
pm2 logs nfp-metro
pm2 logs nfp-metro --lines 200

# Persist after changes
pm2 save
```

---

## 6. View logs on disk

```bash
tail -f /home/deploy/logs/nfp/metro-out.log
tail -f /home/deploy/logs/nfp/metro-error.log
```

---

## 7. Manual redeploy (SSH)

```bash
ssh deploy@YOUR_VPS_IP
cd /home/deploy/apps/nfp
bash scripts/deploy.sh
```

Or re-run the workflow: GitHub → Actions → **Deploy Dev Metro** → **Run workflow**.

---

## 8. Update Node.js on the VPS

```bash
# Example: move to Node 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v

# Reinstall deps + restart Metro
sudo -u deploy -i
cd /home/deploy/apps/nfp
rm -rf node_modules
npm install
pm2 restart nfp-metro
pm2 save
```

Do **not** clear `node_modules` on every normal deploy — only when changing Node major versions or recovering a broken tree.

---

## 9. Troubleshooting

| Symptom | Check |
|---------|--------|
| Actions SSH failure | Secrets `HOST` / `PORT` / `USERNAME` / `SSH_KEY`; `authorized_keys` |
| `npm install` fails | Disk space, Node version, registry connectivity — Metro kept alive |
| Health check fails | `pm2 logs nfp-metro`; port 8086 free; `curl -v localhost:8086` |
| Phone cannot connect | Firewall / security group; use VPN; confirm `--host 0.0.0.0` |
| After reboot Metro missing | Re-run `pm2 startup` + `pm2 save` |
| Dubious ownership | Deploy script sets `safe.directory` automatically |

---

## 10. Quality guarantees

- Idempotent (`deploy.sh` can run anytime)
- Fast (no `node_modules` wipe, no Metro cache clear)
- Safe (no PM2 restart if install fails)
- Observed (health check fails the workflow if Metro is down)
- Persistent (`pm2 save` + startup unit)

<!-- cicd-trigger: 2026-07-31T10:30:36Z -->
