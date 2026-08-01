# NFP — Conformité POS (préparation backend)

L’application mobile **n’est pas** la source de vérité légale. Elle prépare toutes les données et métadonnées dont le **backend français** aura besoin pour :

- **Inaltérabilité** des enregistrements
- **Sécurisation** (chaîne de hash des tickets)
- **Conservation** des données métier
- **Archivage** légal

Aucune logique serveur fictive n’est implémentée dans l’app (pas de JWT serveur, pas d’archive cloud, pas de signature distante).

---

## 1. Inaltérabilité

### Ventes terminées

- `orders`, `order_lines`, `payments` : **INSERT uniquement** en usage normal
- **Triggers SQLite** (migration v5) : interdiction de DELETE ; interdiction de modifier les montants, hash, numéro de ticket
- **Annulation** : `status` → `voided` + restitution stock + audit + `SALE_CANCEL` en file sync
- Jamais de modification des montants d’un ticket existant

### Clôtures de caisse

- INSERT uniquement ; triggers empêchent UPDATE/DELETE après validation
- Correction = nouvelle opération, pas édition d’une clôture existante

### Catalogue / employés

- Pas de suppression physique : `is_active = 0` (produits, catégories, employés)
- Promotions : actif / inactif

---

## 2. Chaîne de hash (Article 286)

Chaque ticket contient :

| Champ | Description |
|-------|-------------|
| `receiptNumber` | Numéro séquentiel |
| `previousHash` | Hash du ticket précédent (ou `null` + chaîne `GENESIS`) |
| `receiptHash` | Hash SHA-256 du payload |
| `createdAt` | Horodatage ISO |
| `deviceId` | Identifiant appareil |
| `userId` | Employé (caissier) |
| `appVersion` | Version application |

### Payload déterministe

Le payload JSON inclut : montants (sous-total, remise, TVA, total), lignes (prix, TVA, quantités), paiements, notes, client.

**Code** : `src/core/compliance/receiptHash.ts`

| Fonction | Usage |
|----------|--------|
| `buildReceiptHashPayload()` | Construit le JSON canonique |
| `computeReceiptHash()` | Calcule le hash chaîné |
| `verifyReceiptHash()` | Vérifie un ticket |
| `verifyHashChain()` | Vérifie la chaîne complète |

Validation **locale** uniquement — le backend fera la vérification officielle.

---

## 3. Audit append-only

Table `audit_logs` — **aucune UPDATE/DELETE** (triggers v5).

Chaque entrée stocke un `ComplianceAuditPayload` dans `payload_json` :

```json
{
  "eventId": "uuid",
  "timestamp": "ISO",
  "employeeId": "uuid | null",
  "deviceId": "ios-…",
  "appVersion": "0.1.0",
  "entityType": "sale | settings | sync | …",
  "entityId": "uuid",
  "action": "sale | void | sync_finished | …",
  "oldValue": { … },
  "newValue": { … },
  "metadata": { … }
}
```

### Actions journalisées (exemples)

| Action | Contexte |
|--------|----------|
| `login`, `logout`, `login_failed` | Authentification |
| `sale`, `void` | Ventes |
| `product_create`, `product_update`, `product_deactivate` | Catalogue |
| `inventory_change` | Stock |
| `user_change` | Employés |
| `config_change` | Paramètres admin |
| `cash_closing` | Clôture caisse |
| `sync_started`, `sync_finished`, `sync_failed` | Synchronisation |

**Code** : `src/shared/services/audit/AuditService.ts`

---

## 4. Traceabilité

Chaque opération critique enregistre :

- `employeeId` / `userId`
- `deviceId`
- `appVersion`
- `createdAt` (et `updatedAt` sur les enveloppes sync)

Les enveloppes de synchronisation (`buildSyncEnvelope`) ajoutent `payloadHash` et `localVersion` pour concurrence optimiste côté serveur.

**Code** : `src/core/compliance/syncPayload.ts`, `src/core/compliance/deviceContext.ts`

---

## 5. Snapshots locaux (pré-archivage)

Ce n’est **pas** l’archive légale officielle — préparation pour upload backend.

### Table `compliance_snapshots`

| Champ | Description |
|-------|-------------|
| `snapshot_type` | `sale`, `cash_closing`, `inventory_adjustment`, `daily_summary` |
| `entity_id` | ID métier |
| `payload_json` | Snapshot immuable |
| `payload_hash` | SHA-256 du payload |
| `synced` | 0 = en attente d’upload serveur |

Créés automatiquement à la vente et à la clôture de caisse.

### Table `daily_snapshots`

Résumé journalier immuable :

| Statut | Meaning |
|--------|---------|
| `OPEN` | Journée ouverte |
| `CLOSED` | Journée clôturée localement |
| `SYNCED` | Acknowledgé par le serveur (futur) |

Contenu : date métier, caisse ouverture/fermeture, nombre de tickets, ventes, TVA, breakdown paiements, employés, hash du snapshot.

**Code** : `src/features/compliance/data/SqliteComplianceRepository.ts`

---

## 6. Synchronisation (métadonnées compliance)

File générique `sync_queue` — opérations standard :

| Opération | Description |
|-----------|-------------|
| `SALE_CREATE` | Vente complète (enveloppe riche) |
| `SALE_CANCEL` | Annulation ticket |
| `CASH_CLOSING_CREATE` | Clôture caisse |
| `SETTINGS_UPDATE` | Paramètre admin |
| `PRODUCT_UPDATE`, `EMPLOYEE_UPDATE`, … | Futur catalogue |

Enveloppe type :

```json
{
  "deviceId": "…",
  "employeeId": "…",
  "appVersion": "0.1.0",
  "createdAt": "…",
  "updatedAt": "…",
  "localVersion": 1,
  "payloadHash": "sha256…",
  "data": { … }
}
```

Le backend pourra valider l’intégrité sans demander d’informations supplémentaires.

---

## 7. Outils développeur (diagnostic local)

**Paramètres → Mode développeur → section Conformité** (lecture seule) :

- Statut chaîne de hash
- Nombre d’entrées audit / invalides
- Snapshots en attente / archives locales
- Journées ouvertes
- Version schéma SQLite
- Tickets en double / numéros manquants (si détectés)

Aucun bouton de réparation — information uniquement.

**Code** : `src/features/compliance/services/ComplianceValidationService.ts`

---

## 8. Schéma SQLite v5

Migration : `src/database/migrations/005_compliance.ts`

- Tables `compliance_snapshots`, `daily_snapshots`
- Triggers d’immutabilité sur `orders`, `order_lines`, `payments`, `cash_closings`, `audit_logs`, `compliance_snapshots`

---

## 9. Ce que le backend doit implémenter (hors app)

| Responsabilité | Côté serveur |
|----------------|--------------|
| Source de vérité légale | Backend |
| Vérification officielle hash chain | Backend |
| Archive légale longue durée | Backend |
| JWT / refresh tokens | Backend |
| Sauvegardes / rétention | Backend |
| Signatures / horodatage qualifié | Backend (si requis) |

L’app envoie des payloads complets via `POST /sync/push` — voir [NFP_APP_AND_SERVER_SPEC.md](NFP_APP_AND_SERVER_SPEC.md).

---

## 10. Fichiers de référence

```
src/core/compliance/
  deviceContext.ts      # deviceId, appVersion, traceability
  receiptHash.ts        # hash chain build + verify
  syncPayload.ts        # enveloppes sync

src/features/compliance/
  domain/snapshots.ts   # types DailySnapshot, ComplianceSnapshot
  data/SqliteComplianceRepository.ts
  services/ComplianceValidationService.ts

src/features/checkout/data/SqliteOrderRepository.ts   # vente + void + sync
src/features/checkout/data/SqliteCashClosingRepository.ts
src/shared/services/audit/AuditService.ts
```
