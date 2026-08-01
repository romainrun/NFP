# Changelog — refactors NFP mobile (août 2026)

Synthèse des changements majeurs avant développement du backend.

**Branche active :** `cursor/backend-source-of-truth-991e` · **PR :** [#39](https://github.com/romainrun/NFP/pull/39)

---

## 1. Administration mobile

- Hub **Paramètres** : magasin, POS, paiements, taxes, tickets, stock, promotions, employés, appareils, sync, développeur
- Adaptation **petit magasin** (stock simplifié, promos produit)
- **Historique d’activité**, **import/export CSV catalogue**, carte sync dashboard
- Déployé sur `main` (PR #38)

---

## 2. Backend = source de vérité

- Suppression sauvegardes locales (restore, dump JSON, SQLite)
- Écran **Serveur & sauvegardes** : lecture seule + `POST /backup`
- Import/export = **catalogue CSV** uniquement

---

## 3. Architecture Local / Remote

```
Repository orchestrateur
    ├── LocalDataSource (cache SQLite)
    └── RemoteDataSource (API via ApiClient)
```

- `AdminSettingsRepositoryImpl`, `ActivityRepositoryImpl`, `ServerRepositoryImpl`
- `RemoteSyncDataSource` : push/pull versionné
- `SyncCoordinator` central
- `ApiClient` : Bearer, retry, timeout, refresh token (préparé)
- Suppression des `Cached*Repository`

### File sync

Opérations : `SALE_CREATE`, `SALE_CANCEL`, `SETTINGS_UPDATE`, `CASH_CLOSING_CREATE`, …

### Versions sync

`settingsVersion`, `productsVersion`, `inventoryVersion`, `employeesVersion`, `promotionsVersion`, `activityVersion`

---

## 4. Compliance-ready (POS français)

Sans backend ni logique serveur simulée.

| Domaine | Implémentation |
|---------|----------------|
| Inaltérabilité | Triggers SQLite v5 |
| Hash chain | `receiptHash.ts` — payload déterministe + validation |
| Audit | `ComplianceAuditPayload` append-only |
| Snapshots | `compliance_snapshots`, `daily_snapshots` |
| Sync | Enveloppes `deviceId`, `payloadHash`, `localVersion` |
| Dev tools | Section Conformité (lecture seule) |

Doc détaillée : [COMPLIANCE.md](COMPLIANCE.md)

---

## Fichiers clés

| Domaine | Chemins |
|---------|---------|
| Architecture | `docs/ARCHITECTURE.md` |
| Conformité | `docs/COMPLIANCE.md` |
| Compliance code | `src/core/compliance/`, `src/features/compliance/` |
| Sync | `src/features/sync/services/syncCoordinator.ts` |
| Settings | `src/features/settings/data/AdminSettingsRepositoryImpl.ts` |
| Ventes | `src/features/checkout/data/SqliteOrderRepository.ts` |
| Audit | `src/shared/services/audit/AuditService.ts` |
| Migration v5 | `src/database/migrations/005_compliance.ts` |

---

## Vérification

```bash
npm run typecheck   # ✅
npm test            # ✅ (5 suites)
```
