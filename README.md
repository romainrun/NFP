# NFP — NaturallyForme Paiement

Premium offline-first Point of Sale for physical retail (Android tablets + iPhone).

Built with **Expo · React Native · TypeScript**.

## Phase 1 (this PR)

Roadmap steps 1–8 only:

1. Expo TypeScript project
2. Feature-first clean architecture + DI
3. React Navigation
4. Light / dark theme (tablet-first)
5. SQLite schema + transactional writes
6. Repository ports (SQLite auth/settings, mock dashboard)
7. PIN authentication + idle lock
8. Dashboard shell

**Await validation before cart, checkout, payments, inventory UI, reports, or sync.**

Architecture decisions: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Expo Go compatibility

This project targets **Expo SDK 54** so it runs in the store Expo Go app (same as the other VPS Metro projects).

If you see *Project is incompatible with this version of Expo Go*, the phone is on a different SDK than the Metro server — keep NFP on SDK 54 or update Expo Go.

## Development CI/CD (VPS Metro)

Every push to `main` deploys automatically to the remote VPS Expo Metro server (PM2 process `nfp-metro` on port **2000**).

Full guide (secrets, VPS bootstrap, PM2, logs, manual redeploy): [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

```text
git push origin main  →  GitHub Actions  →  SSH  →  deploy.sh  →  PM2 restart
```

Required Actions secrets: `HOST`, `PORT`, `USERNAME`, `SSH_KEY`.

Dev Metro URL (Expo Go):

```text
exp://tikilote.re:2000
```

## Run (local)

```bash
npm install
npx expo start
```

Then open on a tablet emulator / Expo Go (Android) or iOS Simulator.

## Demo PINs (seeded offline)

All demo employees use PIN **`0000`** during development. The login screen also has a **Passer** button that skips PIN entry (logs in as the selected employee, or Romain by default).

| Code   | Name     | Role    | PIN  |
|--------|----------|---------|------|
| MANU   | Manuella | admin   | 0000 |
| ROMAIN | Romain   | admin   | 0000 |
| MEDDY  | Meddy    | manager | 0000 |

Change these before any production deployment.

## Navigation

Authenticated screens live in a **drawer menu** (permanent on tablet):

- Tableau de bord
- Caisse
- Historique des ventes
- Articles / Catégories

## Caisse (POS)

From the drawer or dashboard, open **Caisse**:

- search products or tap quick/favorite tiles
- scan with camera (**Scanner**) or type barcode / SKU
- adjust cart quantities, then **Encaisser**
- pay in cash (with change) or card (offline simulation)
- sale writes an immutable ticket, payments, stock movements, and receipt hash chain

Seed barcodes for quick scan tests: `3000000000001`, `3000000000002`, `3000000000006`.

## Historique des ventes

Filter by **Aujourd’hui**, **Hier**, or a custom date range.
Default day hours are **00h → minuit**; refine with start/end hour chips.
View hourly bars, totals, and ticket details.

## Catalogue (articles)

Managers and admins can manage the offline catalog from the dashboard (**Articles**):

- create / edit / soft-deactivate products
- categories, prices, VAT, cost, favorites, quick products
- product photos (gallery or camera), stored offline on device
- search (name / SKU / barcode) and stock adjustments

## Scripts

| Command | Purpose |
|---------|---------|
| `npm start` | Expo dev server |
| `npm run android` / `ios` / `web` | Platform targets |
| `npm test` | Unit tests |
| `npm run typecheck` | Strict TypeScript |

## Structure

```
src/
  application/   # Composition root & providers
  core/          # DI, config, errors, security
  database/      # SQLite schema, migrations, seed
  features/      # Feature-first modules
  navigation/    # Auth + app navigators
  shared/        # UI, theme, storage, audit
```

## Security foundations (scaffolded)

- PIN hashed with per-user salt (SHA-256)
- Secure Store session token (JWT-ready)
- Append-only `audit_logs`
- Orders schema prepared for hash-chain + immutability (Article 286 path)
- Idle auto-logout (15 minutes)

## Next (after validation)

Cart → Checkout → `PaymentProvider` abstraction → Inventory → Customers → Sales history → Reports → Sync engine.
