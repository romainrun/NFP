# NFP — Architecture (definitive mobile foundation)

Single-store professional POS. **Not SaaS.** Backend is always the single source of truth.

## Principles

| Backend | Mobile app |
|---------|------------|
| Source of truth | Client UI |
| Business rules | Offline cache |
| Admin settings | Sync queue |
| Audit history | Temporary local events |
| Backups | Local validation |

SQLite stores **cached business data**, **pending operations**, and **temporary offline information** — never authoritative configuration or audit trails.

## Repository pattern

Each domain uses a **Repository orchestrator** with **Local** and **Remote** data sources:

```
Repository (orchestrator)
    ├── LocalDataSource   → SQLite cache / sync queue
    └── RemoteDataSource  → Backend API via shared ApiClient
```

The UI resolves repository interfaces via DI. It never knows whether data came from SQLite or the network.

### Implemented orchestrators

| Repository | Local | Remote |
|------------|-------|--------|
| `AdminSettingsRepositoryImpl` | `LocalAdminSettingsDataSource` | `RemoteAdminSettingsDataSource` + `RemoteSyncDataSource` |
| `ActivityRepositoryImpl` | `LocalActivityDataSource` | `RemoteActivityDataSource` |
| `ServerRepositoryImpl` | settings cache (pending count) | `RemoteServerDataSource` |
| `LocalSyncQueueDataSource` | `sync_queue` table | pushed via `RemoteSyncDataSource` |

Product, order, cart, and employee SQLite repositories remain local-first until backend endpoints are wired; they enqueue standardized sync operations.

## ApiClient

Single shared HTTP client (`src/core/http/ApiClient.ts`):

- Bearer authentication
- Token refresh hook (prepared)
- Retry policy + timeout
- Request/response logging (dev)
- Error mapping to `AppError`

All `RemoteDataSource` classes use this client.

## Generic offline sync queue

One table: `sync_queue`

| Field | Role |
|-------|------|
| `entityType` | Domain (`sale`, `product`, `settings`, …) |
| `entityId` | Entity identifier |
| `operation` | Standardized op (see below) |
| `payload_json` | Operation payload |
| `status` | `pending` / `synced` / `failed` |
| `attempts` | Retry count |

### Standard operations (`SyncOperation`)

`SALE_CREATE`, `SALE_CANCEL`, `PRODUCT_UPDATE`, `PRODUCT_CREATE`, `PRODUCT_DELETE`, `INVENTORY_UPDATE`, `EMPLOYEE_UPDATE`, `SETTINGS_UPDATE`, `PAYMENT_CREATE`, `PROMOTION_UPDATE`

New entities enqueue with these operations — **no new sync infrastructure**.

## SyncCoordinator

Central worker (`syncCoordinator.ts`). Screens never duplicate sync logic.

1. Health check
2. **Push** — `POST /sync/push` with pending queue items
3. **Pull** — `POST /sync/pull` with version map (incremental)
4. Refresh settings + activity caches
5. Update sync metadata + device registry
6. Automatic retry on connectivity restore

## Version-based synchronization

Local versions (`sync.versions` in settings cache):

- `settingsVersion`, `productsVersion`, `inventoryVersion`, `employeesVersion`, `promotionsVersion`, `activityVersion`

Pull request sends all versions; backend returns **only changed data**. Avoids full catalogue download every sync.

## Cache strategy

**Startup**

1. Load SQLite cache → show UI immediately
2. If online → pull + push via SyncCoordinator
3. Replace local cache (server wins)
4. UI refreshes via React Query

**Offline**

- Use cache
- Queue changes
- Auto-sync when connectivity returns

## Conflict strategy

`ConflictResolver` — default **server wins**. Custom strategies can be registered per entity type.

## Activity history

- Backend owns audit trail
- Offline: temporary local events (`source: local`)
- After sync: server snapshot replaces authoritative history
- Never permanent client-only audit database

## Server & backups

Read-only server info + `POST /backup` for administrators. No local backup/restore.

## Import / export

Catalogue CSV only (`ProductImportExportRepository`). Not a backup system.

## Backend endpoints (ready to connect)

| Endpoint | Use |
|----------|-----|
| `GET /health` | Connectivity |
| `POST /sync/push` | Outbound queue |
| `POST /sync/pull` | Version-based incremental pull |
| `GET /audit/logs` | Activity history |
| `POST /backup` | Server backup request |
| `GET /products`, `POST /sales`, … | Future entity sync |

## Dependency injection

`bootstrap.ts` registers orchestrators and data sources. Tokens in `core/di/tokens.ts`.

## Testing

Repository interfaces enable unit tests without SQLite or HTTP.
