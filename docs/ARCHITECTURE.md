# NFP — Architecture (foundation mobile)

Application caisse **single-store** pour Naturally Forme. **Pas un SaaS.**  
Le **backend** est la source de vérité ; l’app mobile est un **client offline-first**.

Voir aussi : [COMPLIANCE.md](COMPLIANCE.md) · [CHANGELOG_RECENT.md](CHANGELOG_RECENT.md) · [NFP_APP_AND_SERVER_SPEC.md](NFP_APP_AND_SERVER_SPEC.md)

**Version app :** `0.1.0` · **Schéma SQLite :** v5

---

## Principes

| Backend (futur) | Application mobile |
|-----------------|-------------------|
| Source de vérité métier | UI + validation locale |
| Règles métier officielles | Cache SQLite |
| Paramètres admin | File de synchronisation |
| Audit / archive légale | Événements temporaires + snapshots |
| Sauvegardes | Diagnostic compliance |

SQLite stocke **cache**, **opérations en attente** et **informations temporaires offline** — jamais la configuration ni l’audit définitifs.

---

## Couches

```
Écrans / composants (React Native)
    ↓ hooks, React Query, Zustand
Repositories (orchestrateurs — ports DI)
    ↓
LocalDataSource (SQLite)  +  RemoteDataSource (API)
    ↓
ApiClient partagé  →  Backend NFP (à développer)
```

Règles :

- Les écrans ne appellent pas HTTP directement
- `bootstrap.ts` enregistre tous les adapters (`core/di/tokens.ts`)
- Features = domain + data + presentation

---

## Repository pattern (Local + Remote)

```
Repository orchestrateur
    ├── LocalDataSource   → cache / queue SQLite
    └── RemoteDataSource  → API backend
```

L’UI ne sait pas si la donnée vient du cache ou du réseau.

### Orchestrateurs implémentés

| Repository | Local | Remote |
|------------|-------|--------|
| `AdminSettingsRepositoryImpl` | `LocalAdminSettingsDataSource` | `RemoteAdminSettingsDataSource` |
| `ActivityRepositoryImpl` | `LocalActivityDataSource` | `RemoteActivityDataSource` |
| `ServerRepositoryImpl` | métadonnées locales | `RemoteServerDataSource` |
| File sync | `LocalSyncQueueDataSource` | `RemoteSyncDataSource` |

### Repositories locaux (cache métier + enqueue)

| Repository | Rôle |
|------------|------|
| `SqliteOrderRepository` | Ventes immuables, hash chain, snapshots, `SALE_CREATE` / `SALE_CANCEL` |
| `SqliteCashClosingRepository` | Clôtures immuables, `CASH_CLOSING_CREATE` |
| `SqliteProductRepository` | Catalogue cache, désactivation sans DELETE |
| `SqliteUserRepository` | Employés, `is_active` |
| `SqliteCartRepository` | Panier éphémère |

---

## ApiClient

Fichier : `src/core/http/ApiClient.ts`

- Bearer token (Secure Store, JWT-ready)
- Hook refresh token (préparé)
- Retry + timeout 15s
- Logging en `__DEV__`
- Erreurs → `AppError`

Tous les `RemoteDataSource` passent par ce client.

---

## File de synchronisation

Table `sync_queue` (schéma v1+, inchangée structurellement) :

| Colonne | Rôle |
|---------|------|
| `entity_type` | Domaine (`sale`, `settings`, `cash_closing`, …) |
| `entity_id` | Identifiant entité |
| `operation` | Opération standardisée |
| `payload_json` | Enveloppe sync (voir compliance) |
| `status` | `pending` / `synced` / `failed` |
| `attempts` | Retries |

### Opérations (`SyncOperation`)

`SALE_CREATE`, `SALE_CANCEL`, `PRODUCT_UPDATE`, `PRODUCT_CREATE`, `PRODUCT_DELETE`, `INVENTORY_UPDATE`, `EMPLOYEE_UPDATE`, `SETTINGS_UPDATE`, `PAYMENT_CREATE`, `PROMOTION_UPDATE`, `CASH_CLOSING_CREATE`

Nouvelle entité = nouvelle opération dans cette liste, **pas** nouvelle infrastructure sync.

---

## SyncCoordinator

Fichier : `src/features/sync/services/syncCoordinator.ts`

Responsabilités centralisées (aucune sync dans les écrans) :

1. `sync_started` audit
2. Health check (`GET /health`)
3. **Push** — `POST /sync/push`
4. **Pull** — `POST /sync/pull` avec versions locales
5. Refresh settings + activité
6. Mise à jour métadonnées sync + `device_registry`
7. Audit `sync_finished` / `sync_failed`

Au démarrage : `refreshOnStartup()` après chargement du cache.

---

## Synchronisation versionnée

Versions locales (`sync.versions` dans settings cache) :

- `settingsVersion`, `productsVersion`, `inventoryVersion`, `employeesVersion`, `promotionsVersion`, `activityVersion`

Le pull envoie toutes les versions ; le serveur ne retourne que les **deltas**.

---

## Stratégie cache

### Démarrage

1. Charger SQLite → UI immédiate
2. Si réseau : `SyncCoordinator` (push + pull)
3. Remplacer cache (serveur gagne)
4. React Query rafraîchit l’UI

### Offline

- Lire le cache
- Enqueue les modifications
- Sync automatique au retour réseau

---

## Conflits

`ConflictResolver` (`src/core/sync/ConflictResolver.ts`) — règle par défaut : **server wins**.

---

## Historique d’activité

- Online : snapshot serveur (`/audit/logs` ou pull)
- Offline : événements locaux marqués `source: local`
- Après sync : historique serveur prioritaire

---

## Administration

Hub **Paramètres** (permission `settings.manage`) :

| Écran | Contenu |
|-------|---------|
| Magasin, POS, Paiements, Taxes, Tickets | Paramètres sync vers serveur |
| Stock, Promotions, Employés | Cache + enqueue si applicable |
| Serveur & sauvegardes | Lecture seule + `POST /backup` |
| Import catalogue | CSV produits uniquement |
| Historique | Activité |
| Sync, Appareils | Statut + forcer sync |
| Mode développeur | Diagnostics + conformité |

---

## Import / export

`ProductImportExportRepository` — export/import **catalogue CSV** seulement.  
Pas de dump SQLite, JSON, ventes, clients, ou archive complète.

---

## Conformité (résumé)

- Triggers immuabilité (orders, payments, clôtures, audit)
- Chaîne de hash tickets (payload déterministe)
- Audit `ComplianceAuditPayload` append-only
- Snapshots `compliance_snapshots` + `daily_snapshots`
- Enveloppes sync avec `payloadHash`, `localVersion`

Détails : [COMPLIANCE.md](COMPLIANCE.md)

---

## Endpoints backend (à connecter)

| Endpoint | Usage |
|----------|--------|
| `GET /health` | Connectivité |
| `POST /sync/push` | File sortante |
| `POST /sync/pull` | Pull versionné |
| `GET /audit/logs` | Historique |
| `POST /backup` | Sauvegarde serveur (admin) |
| `GET/POST /products`, `/sales`, `/employees`, `/settings` | Entités métier |

Spécification complète : [NFP_APP_AND_SERVER_SPEC.md](NFP_APP_AND_SERVER_SPEC.md)

---

## Injection de dépendances

`src/application/bootstrap.ts` enregistre :

`Database`, `AuthRepository`, `AdminSettingsRepository`, `ActivityHistoryRepository`, `SyncRepository`, `RemoteSyncDataSource`, `ServerInfoRepository`, `ComplianceRepository`, `ComplianceValidationService`, `OrderRepository`, …

---

## Migrations SQLite

| Version | Fichier | Contenu |
|---------|---------|---------|
| v1 | `001_initial.ts` | Schéma de base |
| v2 | `002_cash_closings.ts` | Clôtures caisse |
| v3 | `003_employee_notes.ts` | Notes employés |
| v4 | `004_admin_fields.ts` | Admin, device_registry, sync_logs |
| v5 | `005_compliance.ts` | Snapshots compliance + triggers immuabilité |

---

## Tests

```bash
npm run typecheck
npm test
```

Interfaces repository → tests sans SQLite ni HTTP.
