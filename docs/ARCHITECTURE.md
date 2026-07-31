# NFP — Architecture Decisions (Phase 1)

## Scope of this phase

Roadmap steps 1–8 only:

1. Initialize React Native (Expo + TypeScript)
2. Feature-first clean architecture
3. Navigation
4. Theme (light/dark, tablet-first)
5. SQLite schema + transactional writes
6. Repository pattern with mock data
7. PIN authentication flow
8. Dashboard shell

No cart, checkout, payments, inventory UI, reports, or sync engine yet — those land after validation.

## Why Expo

- Faster delivery for a greenfield POS while remaining cross-platform (Android tablets + iPhone).
- Access to Secure Store, SQLite, Notifications, Print, Sharing without forking native projects yet.
- Eject / continuous native modules only when a payment terminal or USB printer requires it.

## Layering

```
UI (screens/components)
  → Application services / Zustand stores / React Query
    → Repository interfaces (ports)
      → Mock / SQLite / future REST adapters (adapters)
        → SQLite (source of truth offline)
```

Rules:

- Screens never import Axios or know about HTTP.
- Features own their domain types, screens, and hooks.
- `core/` holds DI, config, errors, security primitives.
- `shared/` holds cross-feature UI and utilities only.

## Dependency Injection

Lightweight custom container (`core/di`) instead of decorator-heavy frameworks:

- No `emitDecoratorMetadata` / reflect-metadata tax.
- Explicit registration at bootstrap (`app/bootstrap.ts`).
- Easy swap: `UserRepository` mock → SQLite → REST without touching UI.

## State management

| Concern | Tool |
|---|---|
| Session / PIN lock / UI prefs | Zustand |
| Async reads (products, dashboard stats) | TanStack Query |
| Durable business data | SQLite via repositories |
| Secrets (PIN hash, tokens) | Expo Secure Store + Keychain abstraction |
| Hot ephemeral flags | MMKV (when native module available) / Secure Store fallback |

## Navigation

React Navigation (native stack + drawer for tablet shell):

- Auth stack: PIN unlock
- App shell: tablet-optimized drawer / rail + stack
- Deep feature stacks added later without rewriting the root

## Theme

React Native Paper + custom design tokens:

- Premium, minimal palette (slate + teal accent — not purple defaults)
- Large touch targets (≥ 48dp, POS targets often 56–64)
- Light / dark via Paper theme + system preference override in settings store
- Responsive breakpoints for phone vs tablet

## SQLite

`expo-sqlite` with:

- Schema versioning / migrations
- All writes inside transactions
- Tables prepared now for French fiscal compliance (orders immutable, audit logs, sync queue, hash chain columns) even if unused until later features

## Repositories

Phase 1 repositories return mock data behind interfaces:

- `IAuthRepository`
- `IUserRepository`
- `IDashboardRepository`
- `ISettingsRepository`

Local SQLite repositories are wired for users/settings/audit so offline-first path is real from day one; dashboard metrics stay mocked until sales exist.

## Authentication (Phase 1)

- Employee PIN login (4–6 digits)
- Roles + permissions model in domain (Cashier, Manager, Admin)
- Session in Zustand; PIN verification via repository
- Auto-logout timer (configurable, default 15 min idle)
- Secure storage for session token placeholder (JWT-ready)

## Security foundations (scaffolded)

- Audit log writer interface
- Receipt hash-chain helpers (SHA-256) ready for sales feature
- No hard deletes of accounting entities in schema (`deleted_at` forbidden on orders; soft flags only where legally allowed)

## Tablet / phone

- Primary layout: two-pane capable shell on `width >= 768`
- Phone: single column with bottom-friendly navigation later
- All Phase 1 screens usable on both

## Testing readiness

- `__tests__` colocated under features
- Jest + Testing Library configured
- Repository interfaces enable unit tests without SQLite/UI

## What comes after validation

Cart → Checkout → PaymentProvider abstraction → Inventory → Customers → Sales history → Reports → Sync engine.
