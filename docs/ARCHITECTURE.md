# NFP — Architecture Decisions

## Source of truth

The **backend server** is the single source of truth for:

- Business data (orders, catalog, employees when synced)
- Administration settings
- Audit / activity history
- Backups and retention

The **mobile application** is a client with offline capabilities:

- UI and local validation
- Offline cache (SQLite)
- Synchronization queue
- Temporary offline changes until the server acknowledges them

SQLite is **never** authoritative storage for business configuration or audit trails.

## Layering

```
UI (screens/components)
  → Application services / Zustand / React Query
    → Repository interfaces (ports)
      → Cached facades (server-first, cache fallback)
        → Remote API adapters + SQLite cache adapters
          → Backend API / SQLite cache tables
```

Rules:

- Screens never import HTTP clients directly.
- Features own domain types, screens, and hooks.
- `core/http/ApiClient` is the shared HTTP adapter.
- `core/di` registers adapters at bootstrap.

## Repository responsibilities

| Repository | Role |
|---|---|
| `CachedAdminSettingsRepository` | Server-owned admin settings; SQLite cache + sync queue |
| `SqliteAdminSettingsCacheRepository` | Offline cache only |
| `CachedActivityHistoryRepository` | Server audit trail + temporary local events |
| `SqliteActivityCacheRepository` | Local audit cache / server snapshot |
| `RemoteActivityHistoryRepository` | Fetch audit from backend |
| `SyncApiRepository` | `POST /sync/push`, `GET /sync/pull` |
| `ISyncRepository` | Local outbound sync queue |
| `RemoteServerInfoRepository` | Backend status + backup request |
| `ProductImportExportRepository` | Catalogue CSV only (not backups) |

## Administration settings flow

1. **Startup** — load cached settings immediately; `refreshOnStartup()` pulls from backend when online.
2. **Edit** — write to local cache, enqueue `admin_settings` sync event, push when network available.
3. **Offline** — use cache; queue modifications; auto-sync when connectivity returns.
4. **Conflict** — server wins on pull (settings replaced from `/sync/pull`).

Client-only keys (not pushed): `sync` metadata, `developer` flags.

## Activity history

- **Online** — authoritative list from server (`/audit/logs` or pull payload); local pending events shown as `source: local`.
- **Offline** — temporary local audit events only.
- **After sync** — server snapshot replaces cached server history.

## Synchronization

`syncCoordinator.runSyncNow()`:

1. Health check
2. Push pending queue via `SyncApiRepository`
3. Pull settings + refresh admin cache
4. Refresh activity from server
5. Update sync metadata

No per-screen sync duplication — screens call `runSyncNow()` or rely on startup/background retry.

## CSV import / export

Catalogue CSV only. Not a backup system. No SQLite/JSON dumps, sales DB, or full app export.

## SQLite usage

- Offline cache for settings, catalog, orders, cart
- Sync queue (`sync_queue`)
- Temporary local audit until server acknowledges
- Immutable local orders for offline POS

## Security

- Session token in Secure Store (JWT-ready)
- `ApiClient` attaches Bearer token when present
- Admin backup request gated on `settings.manage`

## Testing

Repository interfaces enable unit tests without SQLite or HTTP. Jest + Testing Library configured.
