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

## Run

```bash
npm install
npx expo start
```

Then open on a tablet emulator / Expo Go (Android) or iOS Simulator.

## Demo PINs (seeded offline)

| Code   | Name            | Role     | PIN  |
|--------|-----------------|----------|------|
| ADMIN  | Admin NFP       | admin    | 1234 |
| MGR01  | Marie Manager   | manager  | 9012 |
| CASH1  | Paul Caissier   | cashier  | 5678 |

Change these before any production deployment.

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
  app/           # Composition root & providers
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
