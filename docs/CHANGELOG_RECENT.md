# Changelog — récents refactors NFP mobile

Document de synthèse des changements majeurs sur l’application NFP (Naturally Forme Paiement) avant développement backend.

---

## 1. Administration mobile complète

- Hub **Paramètres** avec écrans admin : magasin, POS, paiements, taxes, tickets, stock, promotions, employés, appareils, sync, mode développeur.
- Adaptation **petit magasin** : stock simplifié, promos produit, sync sans file manuelle.
- **Historique d’activité**, **import/export CSV catalogue**, carte sync dashboard.

---

## 2. Backend = source de vérité

- Suppression des **sauvegardes locales** (restore, dump JSON, SQLite).
- Écran **Serveur & sauvegardes** : lecture seule + `POST /backup` (admin).
- Import/export limité au **catalogue CSV** (pas une sauvegarde).

---

## 3. Architecture Local / Remote (finale)

Remplacement des `Cached*Repository` par :

```
Repository orchestrateur
    ├── LocalDataSource (cache SQLite)
    └── RemoteDataSource (API via ApiClient)
```

- `AdminSettingsRepositoryImpl`, `ActivityRepositoryImpl`, `ServerRepositoryImpl`
- `RemoteSyncDataSource` : push/pull versionné
- `SyncCoordinator` central (aucune sync dans les écrans)
- `ApiClient` partagé : Bearer, retry, timeout, refresh token (préparé)

### File sync générique

Opérations standard : `SALE_CREATE`, `SALE_CANCEL`, `SETTINGS_UPDATE`, `CASH_CLOSING_CREATE`, etc.

### Sync versionné

`settingsVersion`, `productsVersion`, `inventoryVersion`, `employeesVersion`, `promotionsVersion`, `activityVersion` — pull incrémental.

---

## 4. Préparation conformité POS française (compliance-ready)

Sans backend ni fausse logique serveur :

### Inaltérabilité
- Triggers SQLite : pas de DELETE sur orders/lines/payments ; pas de modification des montants ; clôtures immuables ; audit append-only.
- Void = changement de statut uniquement + `SALE_CANCEL` en queue.

### Chaîne de hash (Article 286)
- Payload déterministe complet (lignes, paiements, deviceId, employeeId, appVersion…).
- Utilitaires `verifyReceiptHash`, `verifyHashChain`.

### Audit étendu
- Structure `ComplianceAuditPayload` : eventId, oldValue/newValue, metadata, deviceId, appVersion.
- Actions : sync_started/finished/failed, cash_closing, etc.

### Snapshots locaux (pré-archivage)
- Table `compliance_snapshots` : ventes, clôtures, ajustements stock, résumé journalier.
- Table `daily_snapshots` : OPEN / CLOSED / SYNCED.

### Sync payloads enrichis
- Enveloppe : deviceId, employeeId, localVersion, payloadHash, timestamps.

### Outils développeur
- Section **Conformité** en mode développeur : hash chain, audit, snapshots, schéma DB (lecture seule).

### Migration v5
- `005_compliance.ts` : tables + triggers d’immutabilité.

---

## Fichiers clés

| Domaine | Chemins |
|---------|---------|
| Architecture | `docs/ARCHITECTURE.md` |
| Compliance | `src/core/compliance/`, `src/features/compliance/` |
| Sync | `src/features/sync/services/syncCoordinator.ts` |
| Settings | `src/features/settings/data/AdminSettingsRepositoryImpl.ts` |
| Orders | `src/features/checkout/data/SqliteOrderRepository.ts` |
| Audit | `src/shared/services/audit/AuditService.ts` |

---

## Branches / PR

- Administration + serveur source de vérité : `main` (PR #38)
- Architecture Local/Remote : `cursor/backend-source-of-truth-991e` (PR #39)
- Compliance-ready : en cours sur la même branche

---

## Vérification

```bash
npm run typecheck
npm test
```
