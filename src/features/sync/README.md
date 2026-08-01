# Sync

Synchronisation offline-first entre l’app et le backend NFP (à déployer).

## Architecture

```
SyncCoordinator (runSyncNow)
    ├── LocalSyncQueueDataSource   → sync_queue SQLite
    ├── RemoteSyncDataSource       → POST /sync/push, GET /sync/pull
    ├── AdminSettingsRepository    → versions + meta sync
    └── DeviceRepository           → deviceId, logs sync
```

L’UI ne duplique pas la logique de sync : les écrans appellent `runSyncNow()` ou affichent l’état (compteur pending, carte dashboard).

## Opérations (`SyncOperation`)

| Opération | Entité | Quand |
|-----------|--------|-------|
| `SALE_CREATE` | `sale` | Vente complétée |
| `SALE_CANCEL` | `sale` | Annulation ticket |
| `CASH_CLOSING_CREATE` | `cash_closing` | Clôture caisse |
| `SETTINGS_UPDATE` | `settings` | Changement paramètres admin |
| `PRODUCT_CREATE` / `UPDATE` / `DELETE` | `product` | Catalogue (partiel) |
| `INVENTORY_UPDATE` | `inventory` | Ajustement stock |
| `EMPLOYEE_UPDATE` | `employee` | Employé |
| `PROMOTION_UPDATE` | `promotion` | Promos |
| `PAYMENT_CREATE` | `payment` | Paiement |

## Versions pull (`SyncVersions`)

`settingsVersion`, `productsVersion`, `inventoryVersion`, `employeesVersion`, `promotionsVersion`, `activityVersion` — le pull ne recharge que ce qui a changé côté serveur.

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `services/syncCoordinator.ts` | Worker central push/pull |
| `data/local/LocalSyncQueueDataSource.ts` | File locale |
| `data/remote/RemoteSyncDataSource.ts` | API sync |
| `data/SqliteSyncRepository.ts` | Adapter queue (legacy port) |
| `src/core/http/ApiClient.ts` | HTTP partagé (retry, Bearer) |
| `src/core/sync/SyncOperation.ts` | Constantes opérations |
| `src/core/sync/SyncVersions.ts` | Map versions |

## Mode hors-ligne simulé

Paramètre admin `sync.simulateOffline` : skip health check et push/pull (tests UI sans backend).

Doc : [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md) · [docs/NFP_APP_AND_SERVER_SPEC.md](../../../docs/NFP_APP_AND_SERVER_SPEC.md) §11
